// Os dois temas passam com folga do nível AAA da WCAG (contraste mínimo 7:1).
// Amarelo #FFFF00 sobre preto: 19,6:1 · Preto sobre branco: 21:1
export const TEMAS = {
  amareloNoPreto: {
    nome: 'Amarelo no preto',
    fundo: '#000000',
    texto: '#FFFF00',
    botaoFundo: '#FFFF00',
    botaoTexto: '#000000',
    borda: '#FFFF00',
  },
  pretoNoBranco: {
    nome: 'Preto no branco',
    fundo: '#FFFFFF',
    texto: '#000000',
    botaoFundo: '#000000',
    botaoTexto: '#FFFFFF',
    borda: '#000000',
  },
};

export const TAMANHOS = {
  // 88 dp: o dobro da recomendação geral (48 dp), pensando em baixa visão e tremor nas mãos
  alturaBotao: 88,
  fonteBotao: 26,
  fonteTitulo: 34,
  fonteMin: 20,
  fonteMax: 64,
  espaco: 16,
};
