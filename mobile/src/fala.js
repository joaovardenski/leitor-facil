import * as Speech from 'expo-speech';
import { dividirTexto } from './texto';

export const VELOCIDADE_MIN = 0.5;
export const VELOCIDADE_MAX = 1.5;

// Margem abaixo do limite do aparelho para cada parte da fala
const LIMITE_POR_FALA = Math.min(Speech.maxSpeechInputLength || 4000, 3000);

// Cada chamada de falar() ganha um número. Assim, avisos de uma fala antiga
// (que foi interrompida) não bagunçam o estado da fala nova.
let geracao = 0;

/**
 * Lê o texto em voz alta, em português, interrompendo qualquer fala anterior.
 * Textos longos são divididos em partes e falados em sequência.
 * `aoTerminar` é chamado quando a última parte acaba (ou se der erro).
 */
export function falar(texto, velocidade = 0.9, { aoTerminar } = {}) {
  const minha = ++geracao;
  Speech.stop();

  const partes = dividirTexto(texto, LIMITE_POR_FALA);
  if (partes.length === 0) {
    aoTerminar?.();
    return;
  }

  const seAtual = (fn) => () => {
    if (minha === geracao) fn?.();
  };

  partes.forEach((parte, i) => {
    const ultima = i === partes.length - 1;
    Speech.speak(parte, {
      language: 'pt-BR',
      rate: velocidade,
      onDone: ultima ? seAtual(aoTerminar) : undefined,
      onError: seAtual(aoTerminar),
    });
  });
}

export function pararFala() {
  geracao++;
  Speech.stop();
}
