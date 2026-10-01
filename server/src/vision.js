// Leitura de texto com o Google Cloud Vision (OCR na nuvem).
//
// Usa a API REST com uma chave de API, só com o fetch do próprio Node:
// não precisa instalar nenhum pacote. A chave fica no arquivo server/.env
// (GOOGLE_VISION_API_KEY), que não vai para o GitHub.

const URL_VISION = 'https://vision.googleapis.com/v1/images:annotate';
const TEMPO_LIMITE_MS = 20000;

function chaveVision() {
  const chave = process.env.GOOGLE_VISION_API_KEY;
  return chave && chave.trim() ? chave.trim() : null;
}

/** true se a chave do Google Vision foi configurada no .env */
function visionConfigurado() {
  return chaveVision() !== null;
}

/**
 * Envia a imagem (Buffer JPEG/PNG) para o Google Vision e devolve
 * { textoBruto, confianca }. Lança erro se a API falhar, para o servidor
 * poder cair no Tesseract.
 */
async function lerComVision(imagem, chave = chaveVision()) {
  if (!chave) throw new Error('GOOGLE_VISION_API_KEY não configurada.');

  const corpo = {
    requests: [
      {
        image: { content: imagem.toString('base64') },
        // DOCUMENT_TEXT_DETECTION é o modo para texto corrido (bula, livro, conta)
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['pt'] },
      },
    ],
  };

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(`${URL_VISION}?key=${encodeURIComponent(chave)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch (erro) {
    throw new Error(
      erro.name === 'AbortError' ? 'Google Vision demorou demais para responder.' : `Sem conexão com o Google Vision (${erro.message}).`
    );
  } finally {
    clearTimeout(timer);
  }

  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(`Google Vision respondeu ${resposta.status}: ${json.error?.message || 'erro desconhecido'}`);
  }
  const resultado = json.responses?.[0] || {};
  if (resultado.error) {
    throw new Error(`Google Vision: ${resultado.error.message}`);
  }
  return interpretarRespostaVision(resultado);
}

/**
 * Transforma a resposta do Vision em { textoBruto, confianca (0 a 100) }.
 *
 * A confiança segue a mesma regra do Tesseract (ver calcularConfianca em
 * ocr.js): média por palavra, com peso pelo número de letras/números, e
 * ignorando símbolos soltos. Assim o aviso de "foto ruim" funciona igual
 * nos dois motores.
 */
function interpretarRespostaVision(resultado) {
  const anotacao = resultado?.fullTextAnnotation;
  if (!anotacao) return { textoBruto: '', confianca: 0 };

  let soma = 0;
  let peso = 0;
  for (const pagina of anotacao.pages || []) {
    for (const bloco of pagina.blocks || []) {
      for (const paragrafo of bloco.paragraphs || []) {
        for (const palavra of paragrafo.words || []) {
          const texto = (palavra.symbols || []).map((s) => s.text || '').join('');
          const caracteres = (texto.match(/[\p{L}\p{N}]/gu) || []).length;
          if (caracteres < 2) continue;
          // O Vision dá a confiança de 0 a 1
          soma += (palavra.confidence ?? 0) * 100 * caracteres;
          peso += caracteres;
        }
      }
    }
  }

  return {
    textoBruto: anotacao.text || '',
    confianca: peso === 0 ? 0 : Math.round(soma / peso),
  };
}

module.exports = { lerComVision, visionConfigurado, interpretarRespostaVision };
