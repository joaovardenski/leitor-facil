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
 * Envia a foto (asset do expo-image-picker) para o servidor e devolve
 * { texto, confianca, aviso }. Lança um erro com mensagem amigável se algo der errado.
 */
export async function lerFoto(foto) {
  const tipo = foto.mimeType || 'image/jpeg';
  const extensao = tipo.split('/')[1] || 'jpg';

  const form = new FormData();
  form.append('foto', { uri: foto.uri, name: foto.fileName || `foto.${extensao}`, type: tipo });

  let resposta;
  try {
    resposta = await buscarComLimite(`${API_URL}/ler`, { method: 'POST', body: form }, TEMPO_LIMITE_LEITURA);
  } catch (erro) {
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
