// Leitura de texto com o Gemini (IA do Google que entende imagens).
//
// Usa a API REST com uma chave de API, só com o fetch do próprio Node:
// não precisa instalar nenhum pacote. A chave fica no arquivo server/.env
// (GEMINI_API_KEY), que não vai para o GitHub.
//
// Cuidado: o Gemini é uma IA generativa e completa o que não conseguiu ler.
// Regra do projeto (igual à do corretor do Tesseract): ele PODE completar
// palavras pelo contexto, mas NUNCA números, doses, unidades, valores, datas
// ou nomes de remédio; esses viram [ilegível]. Ele também diz o quanto a foto
// estava legível, o que vira a "confiança" usada no aviso do app.

// Modelos tentados em ordem. No plano grátis, um modelo às vezes fica
// sobrecarregado (erro 503) ou atinge o limite (429); aí tentamos o próximo.
// Dá para trocar no .env: GEMINI_MODELO=modelo1,modelo2
const MODELOS_PADRAO = ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Erros em que vale tentar outro modelo: não encontrado, limite, sobrecarga
const STATUS_TENTAR_OUTRO = new Set([404, 429, 500, 503]);
// Se sobrar menos que isso do prazo, não adianta tentar outro modelo
const TEMPO_MINIMO_TENTATIVA_MS = 4000;

// Prazo TOTAL para o Gemini (somando as tentativas), ajustável no .env com
// GEMINI_TEMPO_LIMITE (segundos). Passou disso, o servidor usa o Tesseract:
// quem está esperando o texto não pode ficar quase um minuto olhando a tela.
function tempoLimiteMs() {
  const segundos = Number(process.env.GEMINI_TEMPO_LIMITE);
  return (segundos > 0 ? segundos : 25) * 1000;
}

const PROMPT = `Você é um transcritor de documentos para pessoas com baixa visão.
Transcreva TODO o texto visível na imagem, exatamente como está escrito, em português.

Regras:
- Copie fielmente. Não resuma, não traduza, não explique e não acrescente nada que não esteja na imagem.
- Se uma PALAVRA comum estiver parcialmente legível (borrada, cortada, sem acento), você pode completá-la pelo contexto da frase, desde que tenha segurança.
- NUNCA complete nem adivinhe números, doses, unidades (mg, ml, g), valores (R$), datas, horários ou nomes de medicamentos e substâncias. Eles devem sair exatamente como aparecem; se não estiverem legíveis, escreva [ilegível].
- Se uma palavra não der para ler nem pelo contexto, escreva [ilegível].
- Mantenha a ordem de leitura e as quebras de linha principais. Ignore texto de páginas cortadas na borda da foto.
- Se não houver texto, devolva texto vazio.

Em "legibilidade", diga como estava a foto para leitura:
"boa" se leu tudo com segurança, "parcial" se algum trecho ficou duvidoso, "ruim" se boa parte não deu para ler.`;

const ESQUEMA_RESPOSTA = {
  type: 'OBJECT',
  properties: {
    texto: { type: 'STRING' },
    legibilidade: { type: 'STRING', enum: ['boa', 'parcial', 'ruim'] },
  },
  required: ['texto', 'legibilidade'],
};

// O Gemini não dá confiança por palavra como o Tesseract e o Vision.
// Convertemos a avaliação dele numa nota de 0 a 100 para o aviso funcionar igual.
const CONFIANCA_POR_LEGIBILIDADE = { boa: 95, parcial: 60, ruim: 25 };

function chaveGemini() {
  const chave = process.env.GEMINI_API_KEY;
  return chave && chave.trim() ? chave.trim() : null;
}

/** true se a chave do Gemini foi configurada no .env */
function geminiConfigurado() {
  return chaveGemini() !== null;
}

/** Lista de modelos a tentar, em ordem. */
function modelosGemini() {
  const doEnv = (process.env.GEMINI_MODELO || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return doEnv.length ? doEnv : MODELOS_PADRAO;
}

/** Primeiro modelo da lista (para mostrar no terminal). */
function modeloGemini() {
  return modelosGemini()[0];
}

/**
 * Envia a imagem (Buffer JPEG) para o Gemini e devolve { textoBruto, confianca, modelo }.
 * Se um modelo estiver sobrecarregado, tenta o próximo, dentro do prazo total.
 * Lança erro se nenhum der certo, para o servidor poder cair no Tesseract.
 */
async function lerComGemini(imagem, chave = chaveGemini()) {
  if (!chave) throw new Error('GEMINI_API_KEY não configurada.');

  const corpo = JSON.stringify(montarPedido(imagem));
  const prazo = Date.now() + tempoLimiteMs();
  const falhas = [];

  for (const modelo of modelosGemini()) {
    const restante = prazo - Date.now();
    if (restante < TEMPO_MINIMO_TENTATIVA_MS) break;
    try {
      const json = await pedirAoModelo(modelo, corpo, chave, restante);
      return { ...interpretarRespostaGemini(json), modelo };
    } catch (erro) {
      falhas.push(`${modelo}: ${erro.message}`);
      if (!erro.tentarOutro) break;
    }
  }
  throw new Error(falhas.length ? falhas.join(' | ') : 'Gemini: sem tempo para tentar.');
}

function montarPedido(imagem) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: 'image/jpeg', data: imagem.toString('base64') } }, { text: PROMPT }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA_RESPOSTA,
    },
  };
}

/** Um pedido a um modelo. Erros que valem outra tentativa vêm com tentarOutro = true. */
async function pedirAoModelo(modelo, corpo, chave, limiteMs) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limiteMs);
  try {
    const resposta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      body: corpo,
      signal: controle.signal,
    });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      // 503 = modelo sobrecarregado; 429 = limite do plano grátis (por minuto ou por dia)
      const erro = new Error(`Gemini respondeu ${resposta.status}: ${json.error?.message || 'erro desconhecido'}`);
      erro.tentarOutro = STATUS_TENTAR_OUTRO.has(resposta.status);
      throw erro;
    }
    return json;
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Error('Gemini demorou demais para responder.');
    if (erro.tentarOutro !== undefined) throw erro;
    throw new Error(`Sem conexão com o Gemini (${erro.message}).`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Transforma a resposta do Gemini em { textoBruto, confianca (0 a 100) }.
 */
function interpretarRespostaGemini(json) {
  if (json?.promptFeedback?.blockReason) {
    throw new Error(`Gemini bloqueou a imagem (${json.promptFeedback.blockReason}).`);
  }
  const candidato = json?.candidates?.[0];
  const conteudo = (candidato?.content?.parts || [])
    .map((parte) => parte.text || '')
    .join('')
    .trim();
  if (!conteudo) {
    throw new Error(`Gemini não devolveu texto (${candidato?.finishReason || 'sem resposta'}).`);
  }

  let dados;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    // Veio texto solto em vez de JSON: aproveita o texto, mas com confiança média
    dados = { texto: conteudo, legibilidade: 'parcial' };
  }

  const textoBruto = typeof dados.texto === 'string' ? dados.texto : '';
  if (!textoBruto.trim()) return { textoBruto: '', confianca: 0 };

  let confianca = CONFIANCA_POR_LEGIBILIDADE[dados.legibilidade] ?? 60;
  // Se ele mesmo marcou trechos ilegíveis, o app precisa avisar
  if (/\[ileg[ií]vel\]/i.test(textoBruto)) confianca = Math.min(confianca, 40);

  return { textoBruto, confianca };
}

module.exports = { lerComGemini, geminiConfigurado, modeloGemini, modelosGemini, interpretarRespostaGemini };
