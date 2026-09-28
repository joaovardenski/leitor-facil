import { API_URL } from './config';

const TEMPO_LIMITE_LEITURA = 60000; // 60 s: o OCR pode demorar em computadores mais fracos
const TEMPO_LIMITE_SAUDE = 5000;

/** fetch com tempo máximo de espera. */
async function buscarComLimite(url, opcoes, limite) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limite);
  try {
    return await fetch(url, { ...opcoes, signal: controle.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Devolve true se o servidor responde. Usado ao abrir o app. */
export async function verificarServidor() {
  try {
    const resposta = await buscarComLimite(`${API_URL}/saude`, {}, TEMPO_LIMITE_SAUDE);
    return resposta.ok;
  } catch {
    return false;
  }
}

/**
 * Envia a foto (asset do expo-image-picker, tirado com base64: true) para o
 * servidor e devolve { texto, confianca, aviso }.
 * Lança um erro com mensagem amigável se algo der errado.
 *
 * A foto vai em JSON, como texto base64. Enviar como arquivo (multipart com
 * { uri, name, type }) não funciona no fetch das versões novas do Expo.
 */
export async function lerFoto(foto) {
  if (!foto.base64) {
    throw new Error('Não consegui preparar a foto. Tente de novo.');
  }

  let resposta;
  try {
    resposta = await buscarComLimite(
      `${API_URL}/ler`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem: foto.base64, tipo: foto.mimeType || 'image/jpeg' }),
      },
      TEMPO_LIMITE_LEITURA
    );
  } catch (erro) {
    // Aparece no terminal do "npx expo start", ajuda a descobrir a causa
    console.warn(`Falha ao enviar a foto para ${API_URL}/ler:`, erro?.message || erro);
    if (erro.name === 'AbortError') {
      throw new Error('A leitura demorou demais. Tente de novo.');
    }
    throw new Error('Não consegui falar com o serviço de leitura. Verifique a internet.');
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível ler a imagem.');
  }
  return dados;
}
