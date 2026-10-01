// Métricas de acerto do OCR, comparando o texto lido com o texto correto.
//
// - acertoPalavras: 1 - WER (taxa de erro de palavras). 100% = todas as palavras certas.
// - acertoCaracteres: 1 - CER (taxa de erro de caracteres). Mostra erros pequenos,
//   como "750" virar "7S0", que contam como palavra inteira errada no WER.
//
// A comparação ignora maiúsculas/minúsculas, pontuação e espaços/quebras de linha
// extras, mas NÃO ignora acentos: "não" lido como "nao" conta como erro.

/** Normaliza o texto para comparar: minúsculas, sem pontuação, espaços simples. */
function normalizar(texto) {
  return (texto || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Distância de edição (inserções, remoções e trocas) entre duas sequências. */
function distanciaEdicao(a, b) {
  let anterior = new Uint32Array(b.length + 1);
  let atual = new Uint32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) anterior[j] = j;
  for (let i = 1; i <= a.length; i++) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const troca = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + troca);
    }
    [anterior, atual] = [atual, anterior];
  }
  return anterior[b.length];
}

function taxaAcerto(erros, total) {
  if (total === 0) return erros === 0 ? 1 : 0;
  return Math.max(0, 1 - erros / total);
}

/** Compara o texto lido com o correto e devolve as taxas de acerto (0 a 1). */
function compararTextos(lido, correto) {
  const palavrasLidas = normalizar(lido);
  const palavrasCorretas = normalizar(correto);
  const caracteresLidos = [...palavrasLidas.join(' ')];
  const caracteresCorretos = [...palavrasCorretas.join(' ')];
  return {
    acertoPalavras: taxaAcerto(distanciaEdicao(palavrasLidas, palavrasCorretas), palavrasCorretas.length),
    acertoCaracteres: taxaAcerto(distanciaEdicao(caracteresLidos, caracteresCorretos), caracteresCorretos.length),
    palavras: palavrasCorretas.length,
  };
}

module.exports = { normalizar, distanciaEdicao, compararTextos };
