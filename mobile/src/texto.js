/**
 * Divide um texto longo em partes de no máximo `limite` caracteres,
 * cortando de preferência no fim de frases ou de linhas.
 *
 * Necessário porque a voz do celular tem um tamanho máximo por fala
 * (Speech.maxSpeechInputLength, ~4000 caracteres no Android), e uma bula
 * inteira passa disso com facilidade.
 */
export function dividirTexto(texto, limite = 3000) {
  const limpo = (texto || '').trim();
  if (!limpo) return [];

  // Frases e linhas, mantendo a pontuação no fim de cada pedaço
  const pedacos = limpo.split(/(?<=[.!?;:])\s+|\n+/).filter(Boolean);

  const partes = [];
  let atual = '';

  for (const pedaco of pedacos) {
    for (const trecho of cortarPalavras(pedaco, limite)) {
      const junto = atual ? `${atual} ${trecho}` : trecho;
      if (junto.length <= limite) {
        atual = junto;
      } else {
        partes.push(atual);
        atual = trecho;
      }
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

/** Corta um pedaço sem pontuação que sozinho já passa do limite, entre palavras. */
function cortarPalavras(pedaco, limite) {
  if (pedaco.length <= limite) return [pedaco];

  const trechos = [];
  let atual = '';
  for (const palavra of pedaco.split(/\s+/)) {
    // Palavra gigante (ex.: sequência sem espaços): corta no meio mesmo
    if (palavra.length > limite) {
      if (atual) trechos.push(atual);
      atual = '';
      for (let i = 0; i < palavra.length; i += limite) trechos.push(palavra.slice(i, i + limite));
      continue;
    }
    const junto = atual ? `${atual} ${palavra}` : palavra;
    if (junto.length <= limite) atual = junto;
    else {
      trechos.push(atual);
      atual = palavra;
    }
  }
  if (atual) trechos.push(atual);
  return trechos;
}
