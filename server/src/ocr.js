const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

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

async function reconhecer(imagem) {
  const { data } = await worker.recognize(imagem, {}, { text: true, blocks: true });
  return { texto: limparTexto(data.text), confianca: calcularConfianca(data) };
}

/**
 * Recebe a imagem (Buffer) e devolve { texto, confianca, aviso }.
 * A imagem só existe em memória; nada é gravado em disco.
 */
async function lerImagem(buffer) {
  if (!worker) throw new Error('OCR ainda não foi iniciado.');

  const imagem = await tratarImagem(buffer);
  let resultado = await reconhecer(imagem);

  // Leitura ruim pode ser só a foto de cabeça para baixo (papel virado na mesa,
  // celular girado). O Tesseract não desvira sozinho, então tentamos girar 180°.
  if (resultado.confianca < CONFIANCA_MINIMA) {
    const girada = await sharp(imagem).rotate(180).toBuffer();
    const tentativa = await reconhecer(girada);
    if (tentativa.confianca > resultado.confianca) resultado = tentativa;
  }

  const { texto, confianca } = resultado;
  let aviso = null;
  if (!texto) {
    aviso = 'Não encontrei texto na foto. Aproxime o celular do papel e use mais luz.';
  } else if (confianca < CONFIANCA_MINIMA) {
    aviso = 'Parte do texto pode estar errada. Tente outra foto, mais de perto e com mais luz.';
  }

  return { texto, confianca, aviso };
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

module.exports = { iniciarOcr, lerImagem, encerrarOcr, limparTexto, calcularConfianca, ImagemInvalidaError };
