import * as Speech from 'expo-speech';

export const VELOCIDADE_MIN = 0.5;
export const VELOCIDADE_MAX = 1.5;

/** Lê o texto em voz alta, em português, interrompendo qualquer fala anterior. */
export function falar(texto, velocidade = 0.9, aoTerminar) {
  Speech.stop();
  Speech.speak(texto, {
    language: 'pt-BR',
    rate: velocidade,
    onDone: aoTerminar,
    onStopped: aoTerminar,
  });
}

export function pararFala() {
  Speech.stop();
}

export function estaFalando() {
  return Speech.isSpeakingAsync();
}
