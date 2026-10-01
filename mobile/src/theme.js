// Todas as combinações passam com folga do nível AAA da WCAG (contraste mínimo 7:1).
// Amarelo no preto
//   texto #FFFF00 / fundo #000000: 19,6:1 · textoSuave #FFFFFF / fundo: 21:1
//   sobre a superficie #1F1F1F: texto 15,3:1 · textoSuave 16,5:1
// Preto no branco
//   texto #000000 / fundo #FFFFFF: 21:1 · textoSuave #333333 / fundo: 12,6:1
//   sobre a superficie #F0F0F0: texto 18,4:1 · textoSuave 11,1:1
//
// Não usamos nenhuma cor de destaque além dessas: para quem tem baixa visão,
// o contraste é o que importa, e ele é a identidade visual do app.
export const TEMAS = {
  amareloNoPreto: {
    nome: 'Amarelo no preto',
    fundo: '#000000',
    superficie: '#1F1F1F',
    texto: '#FFFF00',
    textoSuave: '#FFFFFF',
    botaoFundo: '#FFFF00',
    botaoTexto: '#000000',
    borda: '#FFFF00',
    barraStatus: 'light',
  },
  pretoNoBranco: {
    nome: 'Preto no branco',
    fundo: '#FFFFFF',
    superficie: '#F0F0F0',
    texto: '#000000',
    textoSuave: '#333333',
    botaoFundo: '#000000',
    botaoTexto: '#FFFFFF',
    borda: '#000000',
    barraStatus: 'dark',
  },
};

export const TAMANHOS = {
  // 88 dp: o dobro da recomendação geral (48 dp), pensando em baixa visão e tremor nas mãos
  alturaBotao: 88,
  // Opções em lista e botões de ajuste: ainda bem acima dos 48 dp
  alturaLinha: 76,
  fonteBotao: 26,
  fonteTitulo: 34,
  fonteMin: 20,
  fonteMax: 64,
  espaco: 16,
  borda: 3,
  raio: 18,
};
