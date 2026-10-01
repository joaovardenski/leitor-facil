// Leitura de texto com o Gemini (IA do Google que entende imagens).
//
// Usa a API REST com uma chave de API, só com o fetch do próprio Node:
// não precisa instalar nenhum pacote. A chave fica no arquivo server/.env
// (GEMINI_API_KEY), que não vai para o GitHub.
//
// Cuidado: o Gemini é uma IA generativa. Numa foto ruim ele pode "completar"
// uma palavra que não conseguiu ler. Por isso o pedido (PROMPT) é de
// transcrição fiel, sem corrigir nem completar, e ele também diz o quanto
// a foto estava legível, que vira a "confiança" usada no aviso do app.

const MODELO_PADRAO = 'gemini-3.5-flash-lite';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TEMPO_LIMITE_MS = 30000;

const PROMPT = `Você é um transcritor de documentos para pessoas com baixa visão.
Transcreva TODO o texto visível na imagem, exatamente como está escrito, em português.

Regras:
- Copie fielmente. Não corrija erros, não complete palavras, não resuma, não traduza, não explique.
- Números, doses, valores, datas e unidades (mg, ml, R$) devem sair exatamente como aparecem.
- Se uma palavra ou número não estiver legível, escreva [ilegível] no lugar. Nunca adivinhe.
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

function modeloGemini() {
  return (process.env.GEMINI_MODELO || '').trim() || MODELO_PADRAO;
}

/**
 * Envia a imagem (Buffer JPEG) para o Gemini e devolve { textoBruto, confianca }.
 * Lança erro se a API falhar, para o servidor poder cair no Tesseract.
 */
async function lerComGemini(imagem, chave = chaveGemini()) {
  if (!chave) throw new Error('GEMINI_API_KEY não configurada.');

  const corpo = {
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

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(`${URL_BASE}/${modeloGemini()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch (erro) {
    throw new Error(
      erro.name === 'AbortError' ? 'Gemini demorou demais para responder.' : `Sem conexão com o Gemini (${erro.message}).`
    );
  } finally {
    clearTimeout(timer);
  }

  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    // 429 = limite do plano grátis atingido (por minuto ou por dia)
    throw new Error(`Gemini respondeu ${resposta.status}: ${json.error?.message || 'erro desconhecido'}`);
  }
  return interpretarRespostaGemini(json);
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

module.exports = { lerComGemini, geminiConfigurado, modeloGemini, interpretarRespostaGemini };
