/**
 * Converte a moldura desenhada na tela da câmera em um recorte da foto.
 *
 * A pré-visualização da câmera preenche a área da tela ("cover"): se a foto
 * tem outra proporção que a tela, uma parte dela fica escondida nas bordas.
 * Por isso não basta dividir a posição da moldura pelo tamanho da tela; é
 * preciso descontar a parte da foto que não aparece.
 *
 * - larguraFoto, alturaFoto: tamanho da foto tirada (pixels)
 * - area: { width, height } da área onde a câmera aparece na tela
 * - quadro: { x, y, largura, altura } da moldura, dentro dessa área
 * - margem: folga extra em volta (fração da foto), para não cortar texto
 *   na beirada se a pessoa não centralizou certinho
 *
 * Devolve { x, y, largura, altura } em frações da foto (0 a 1), ou null.
 */
export function calcularRecorte(larguraFoto, alturaFoto, area, quadro, margem = 0.05) {
  if (!larguraFoto || !alturaFoto || !area?.width || !area?.height || !quadro) return null;

  // O app fica sempre em pé: a foto também está em pé (largura < altura)
  const W = Math.min(larguraFoto, alturaFoto);
  const H = Math.max(larguraFoto, alturaFoto);

  // Escala da foto na tela e quanto dela ficou escondido de cada lado
  const escala = Math.max(area.width / W, area.height / H);
  const escondidoX = (W * escala - area.width) / 2;
  const escondidoY = (H * escala - area.height) / 2;

  let x = (quadro.x + escondidoX) / (W * escala) - margem;
  let y = (quadro.y + escondidoY) / (H * escala) - margem;
  let largura = quadro.largura / (W * escala) + 2 * margem;
  let altura = quadro.altura / (H * escala) + 2 * margem;

  // Mantém dentro da foto
  x = Math.max(0, x);
  y = Math.max(0, y);
  largura = Math.min(1 - x, largura);
  altura = Math.min(1 - y, altura);
  if (largura <= 0 || altura <= 0) return null;

  const arredondar = (v) => Math.round(v * 10000) / 10000;
  return { x: arredondar(x), y: arredondar(y), largura: arredondar(largura), altura: arredondar(altura) };
}

// Espaço no topo da área da câmera para a caixa de instrução, que não pode cobrir a moldura
const ESPACO_INSTRUCAO = 92;

/** Tamanho e posição da moldura dentro da área da câmera (mesma regra para desenhar e recortar). */
export function calcularQuadro(area) {
  if (!area?.width || !area?.height) return null;
  const largura = Math.round(area.width * 0.86);
  const alturaDisponivel = area.height - ESPACO_INSTRUCAO - 16;
  if (alturaDisponivel <= 0) return null;
  const altura = Math.round(Math.min(alturaDisponivel, largura * 1.4));
  return {
    x: Math.round((area.width - largura) / 2),
    y: Math.round(ESPACO_INSTRUCAO + (alturaDisponivel - altura) / 2),
    largura,
    altura,
  };
}
