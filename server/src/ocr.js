const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { lerComGemini, geminiConfigurado, modeloGemini } = require('./gemini');
const { lerComVision, visionConfigurado } = require('./vision');
const { carregarCorretor, corrigirTexto } = require('./corretor');

// Motores de leitura na nuvem. O Tesseract (local) é sempre a reserva.
const MOTORES_NUVEM = {
  gemini: { ler: lerComGemini, configurado: geminiConfigurado },
  'google-vision': { ler: lerComVision, configurado: visionConfigurado },
};

/**
 * Qual motor usar por padrão:
 * - OCR_MOTOR no .env, se definido ('gemini', 'google-vision' ou 'tesseract')
 * - senão, o primeiro que tiver chave: Gemini, depois Google Vision
 * - sem nenhuma chave, Tesseract
 */
function motorPadrao() {
  const escolhido = (process.env.OCR_MOTOR || '').trim();
  if (escolhido) return escolhido;
  for (const [nome, motor] of Object.entries(MOTORES_NUVEM)) {
    if (motor.configurado()) return nome;
  }
  return 'tesseract';
}

/** Texto para o terminal dizendo como o servidor vai ler as fotos. */
function descreverMotor() {
  const motor = motorPadrao();
  if (motor === 'gemini') return `Leitura: Gemini (${modeloGemini()}), com Tesseract de reserva.`;
  if (motor === 'google-vision') return 'Leitura: Google Vision, com Tesseract de reserva.';
  return 'Leitura: Tesseract. Para usar o Gemini, coloque GEMINI_API_KEY no server/.env.';
}

/** Motores que dá para usar agora (o script de medição compara todos). */
function motoresDisponiveis() {
  return ['tesseract', ...Object.keys(MOTORES_NUVEM).filter((nome) => MOTORES_NUVEM[nome].configurado())];
}

// Abaixo desse valor (0 a 100), avisamos o usuário que a leitura pode estar errada.
const CONFIANCA_MINIMA = 45;

let worker = null;

/** Erro de quando o arquivo recebido não é uma imagem que dê para abrir. */
class ImagemInvalidaError extends Error {
  constructor() {
    super('Não consegui abrir essa imagem. Tente tirar outra foto.');
    this.name = 'ImagemInvalidaError';
  }
}

/**
 * Carrega o Tesseract com o modelo de português.
 * O modelo vem do pacote npm @tesseract.js-data/por (instalado junto com o
 * npm install), então o servidor não precisa baixar nada ao iniciar.
 */
async function iniciarOcr() {
  const langPath = path.join(
    path.dirname(require.resolve('@tesseract.js-data/por/package.json')),
    '4.0.0_best_int'
  );
  worker = await createWorker('por', 1, { langPath, cacheMethod: 'none' });
  if (carregarCorretor()) console.log('Corretor de palavras pronto.');
  console.log('OCR pronto.');
}

/**
 * Melhora a foto antes do OCR:
 * - corrige a rotação usando os dados EXIF da câmera
 * - reduz fotos muito grandes (acelera o OCR sem perder legibilidade)
 * - tira a cor e aumenta o contraste
 */
async function tratarImagem(buffer) {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
  } catch {
    throw new ImagemInvalidaError();
  }
}

/**
 * Prepara a foto para os motores na nuvem: só corrige a rotação e limita o tamanho.
 * Eles leem melhor a foto colorida original do que a versão tratada para o Tesseract.
 */
async function prepararParaNuvem(buffer) {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ImagemInvalidaError();
  }
}

/**
 * Calcula a confiança da leitura (0 a 100) a partir das palavras reconhecidas.
 *
 * A média simples do Tesseract (data.confidence) conta igual qualquer "palavra",
 * inclusive os pedacinhos sem sentido que surgem da borda da página, da mesa ou
 * da página vizinha do livro ("ia", "|", "ae"). Numa foto de livro isso derruba
 * a média e o app avisava "foto não nítida" mesmo com o texto lido certo.
 *
 * Aqui cada palavra pesa pelo número de letras/números: palavras de verdade
 * (longas) mandam no resultado, e símbolos soltos são ignorados.
 */
function calcularConfianca(data) {
  let soma = 0;
  let peso = 0;
  for (const bloco of data.blocks || []) {
    for (const paragrafo of bloco.paragraphs || []) {
      for (const linha of paragrafo.lines || []) {
        for (const palavra of linha.words || []) {
          const caracteres = (palavra.text.match(/[\p{L}\p{N}]/gu) || []).length;
          if (caracteres < 2) continue;
          soma += palavra.confidence * caracteres;
          peso += caracteres;
        }
      }
    }
  }
  // Sem detalhes por palavra: usa a média do próprio Tesseract
  if (peso === 0) return Math.round(data.confidence || 0);
  return Math.round(soma / peso);
}

/** Lista das palavras lidas, na ordem: [{ text, confidence }]. */
function palavrasLidas(data) {
  const palavras = [];
  for (const bloco of data.blocks || []) {
    for (const paragrafo of bloco.paragraphs || []) {
      for (const linha of paragrafo.lines || []) {
        for (const palavra of linha.words || []) palavras.push({ text: palavra.text, confidence: palavra.confidence });
      }
    }
  }
  return palavras;
}

async function reconhecer(imagem) {
  const { data } = await worker.recognize(imagem, {}, { text: true, blocks: true });
  return { textoBruto: data.text || '', palavras: palavrasLidas(data), confianca: calcularConfianca(data) };
}

/**
 * Leitura com o Tesseract, que roda aqui no próprio servidor (sem internet).
 * Depois passa o corretor de palavras (ver corretor.js), a não ser que
 * dicionario = false (usado só para comparar no script de medição).
 */
async function lerComTesseract(buffer, { dicionario = true } = {}) {
  const imagem = await tratarImagem(buffer);
  let resultado = await reconhecer(imagem);

  // Leitura ruim pode ser só a foto de cabeça para baixo (papel virado na mesa,
  // celular girado). O Tesseract não desvira sozinho, então tentamos girar 180°.
  if (resultado.confianca < CONFIANCA_MINIMA) {
    const girada = await sharp(imagem).rotate(180).toBuffer();
    const tentativa = await reconhecer(girada);
    if (tentativa.confianca > resultado.confianca) resultado = tentativa;
  }

  let texto = resultado.textoBruto;
  let correcoes = 0;
  if (dicionario) {
    const corrigido = corrigirTexto(texto, resultado.palavras);
    texto = corrigido.texto;
    correcoes = corrigido.correcoes.length;
  }
  return { texto: limparTexto(texto), confianca: resultado.confianca, correcoes };
}

/**
 * Recebe a imagem (Buffer) e devolve { texto, confianca, aviso, motor }.
 * A imagem só existe em memória; nada é gravado em disco (aqui no servidor).
 *
 * Usa o motor padrão (ver motorPadrao). Se o motor na nuvem falhar (sem
 * internet, limite do plano grátis, chave errada), cai no Tesseract.
 * opcoes.motor ('tesseract' | 'gemini' | 'google-vision') força um motor,
 * sem reserva; é usado pelo script que compara a taxa de acerto.
 * opcoes.dicionario = false desliga o corretor de palavras do Tesseract.
 */
async function lerImagem(buffer, opcoes = {}) {
  if (!worker) throw new Error('OCR ainda não foi iniciado.');

  const nomeMotor = opcoes.motor || motorPadrao();
  let resultado = null;
  let motor = 'tesseract';

  if (nomeMotor !== 'tesseract') {
    const motorNuvem = MOTORES_NUVEM[nomeMotor];
    if (!motorNuvem) throw new Error(`Motor de leitura desconhecido: "${nomeMotor}".`);
    // Imagem corrompida dá ImagemInvalidaError aqui, antes de chamar a API
    const imagem = await prepararParaNuvem(buffer);
    try {
      const { textoBruto, confianca } = await motorNuvem.ler(imagem);
      resultado = { texto: limparTexto(textoBruto), confianca, correcoes: 0 };
      motor = nomeMotor;
    } catch (erro) {
      if (opcoes.motor) throw erro;
      console.warn(`${nomeMotor} falhou, usando o Tesseract. Motivo: ${erro.message}`);
    }
  }

  if (!resultado) resultado = await lerComTesseract(buffer, { dicionario: opcoes.dicionario !== false });

  const { texto, confianca, correcoes } = resultado;
  let aviso = null;
  if (!texto) {
    aviso = 'Não encontrei texto na foto. Aproxime o celular do papel e use mais luz.';
  } else if (confianca < CONFIANCA_MINIMA) {
    aviso = 'Parte do texto pode estar errada. Tente outra foto, mais de perto e com mais luz.';
  }

  return { texto, confianca, aviso, motor, correcoes };
}

/**
 * Limpa o texto do OCR:
 * - remove espaços sobrando
 * - descarta linhas só com símbolos soltos (ex.: "| ~ ."), comuns em bordas e sombras da foto
 * - junta linhas vazias repetidas
 */
function limparTexto(texto) {
  return (texto || '')
    .split('\n')
    .map((linha) => linha.replace(/\s+/g, ' ').trim())
    .filter((linha) => linha === '' || /[\p{L}\p{N}]/u.test(linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function encerrarOcr() {
  if (worker) await worker.terminate();
}

module.exports = {
  iniciarOcr,
  lerImagem,
  encerrarOcr,
  limparTexto,
  calcularConfianca,
  descreverMotor,
  motoresDisponiveis,
  ImagemInvalidaError,
};
