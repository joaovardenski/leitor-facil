// Testes do corretor de palavras (src/corretor.js), com as listas reais de server/dados.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { carregarCorretor, corrigirPalavra, corrigirTexto } = require('../src/corretor');

assert.ok(carregarCorretor(), 'as listas de palavras deveriam carregar');
const contexto = new Map([['comprimidos', 2], ['comprimido', 1]]);
const corrigir = (palavra, confianca = 50) => corrigirPalavra(palavra, confianca, contexto);

test('corrige acentos perdidos, mesmo com confiança alta', () => {
  assert.equal(corrigir('nao', 93), 'não');
  assert.equal(corrigir('Atencao', 84), 'Atenção');
  assert.equal(corrigir('PEDIATRICO', 92), 'PEDIÁTRICO');
  assert.equal(corrigir('farmacéutico', 89), 'farmacêutico');
  assert.equal(corrigir('medico'), 'médico');
});

test('corrige trocas típicas do OCR', () => {
  assert.equal(corrigir('c0mprimido'), 'comprimido');
  assert.equal(corrigir('rnedicamento'), 'medicamento');
  assert.equal(corrigir('vencirnento'), 'vencimento');
  assert.equal(corrigir('posologla'), 'posologia');
  assert.equal(corrigir('hor4s'), 'horas');
});

test('letra a mais ou a menos só é corrigida com confiança baixa', () => {
  assert.equal(corrigir('ultrapase', 50), 'ultrapasse');
  assert.equal(corrigir('ultrapase', 95), null);
  assert.equal(corrigir('comprimdo', 50), 'comprimido');
});

test('NUNCA mexe em números, doses, valores e datas', () => {
  for (const token of ['750', '7S0', '5OO', '750mg', '03/2028', '4471B', 'R$', '0', '187,43']) {
    assert.equal(corrigir(token, 10), null, token);
  }
});

test('não mexe em palavras que existem nem em nomes fora do dicionário', () => {
  // "esta" e "duvida" também são palavras (esta casa, ele duvida)
  for (const palavra of ['temperatura', 'esta', 'duvida', 'pais', 'fato', 'Losartana', 'Atorvastatina', 'COPEL']) {
    assert.equal(corrigir(palavra, 50), null, palavra);
  }
  // palavras curtas são ambíguas demais
  assert.equal(corrigir('ao', 10), null);
});

test('texto certo continua igual', () => {
  const texto =
    'Losartana potássica 50 mg. Este medicamento é indicado para hipertensão arterial. ' +
    'Vencimento: 15/10/2026. Total a pagar: R$ 187,43. Consumo do mês: 213 kWh. ' +
    'Em caso de dúvidas, entre em contato pelos nossos canais de atendimento.';
  const palavras = texto.split(/\s+/).map((text) => ({ text, confidence: 50 }));
  const resultado = corrigirTexto(texto, palavras);
  assert.deepEqual(resultado.correcoes, []);
  assert.equal(resultado.texto, texto);
});

test('corrige dentro do texto mantendo pontuação e quebras de linha', () => {
  const texto = 'Atencao: nao use este medicamento.\nEm caso de duvida, procure o farmacéutico.';
  const palavras = texto.split(/\s+/).map((text) => ({ text, confidence: 85 }));
  const resultado = corrigirTexto(texto, palavras);
  assert.equal(resultado.texto, 'Atenção: não use este medicamento.\nEm caso de duvida, procure o farmacêutico.');
  assert.deepEqual(
    resultado.correcoes.map((c) => c.para),
    ['Atenção', 'não', 'farmacêutico']
  );
});

test('nomes de remédio e latim de bula nunca são trocados', () => {
  const nomes = ['Ginkgo', 'biloba', 'Passiflora', 'incarnata', 'Senna', 'alexandrina', 'Lactobacillus', 'boulardii',
    'dipirona', 'amoxicilina', 'Losartana', 'croscarmelose', 'monoidratada'];
  for (const nome of nomes) {
    assert.equal(corrigir(nome, 95), null, nome);
    assert.equal(corrigir(nome, 40), null, nome);
  }
});

test('termos protegidos servem para consertar leitura errada do nome', () => {
  assert.equal(corrigir('Glnkgo', 60), 'Ginkgo');
  assert.equal(corrigir('arnoxicilina', 60), 'amoxicilina');
});
