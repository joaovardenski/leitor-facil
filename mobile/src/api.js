import { API_URL } from './config';

const TEMPO_LIMITE = 60000; // 60 s: o OCR pode demorar em computadores mais fracos

/**
 * Envia a foto para o servidor e devolve { texto, confianca, aviso }.
 * Lança um erro com mensagem amigável se algo der errado.
 */
export async function lerFoto(uri) {
  const form = new FormData();
  form.append('foto', { uri, name: 'foto.jpg', type: 'image/jpeg' });

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE);

  let resposta;
  try {
    resposta = await fetch(`${API_URL}/ler`, {
      method: 'POST',
      body: form,
      signal: controle.signal,
    });
  } catch {
    throw new Error('Não consegui falar com o servidor. Verifique a internet.');
  } finally {
    clearTimeout(timer);
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível ler a imagem.');
  }
  return dados;
}
