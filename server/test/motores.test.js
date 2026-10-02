// Testes dos motores de leitura na nuvem (Gemini e Google Vision).
// Não chamam a internet: a resposta da API é simulada.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { lerComGemini, interpretarRespostaGemini, modeloGemini, modelosGemini } = require('../src/gemini');
const { interpretarRespostaVision } = require('../src/vision');

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
  delete process.env.GEMINI_MODELO;
  delete process.env.GEMINI_TEMPO_LIMITE;
});

const respostaGemini = (dados) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(dados) }] } }] });

test('Gemini: envia a foto e a chave do jeito que a API espera', async () => {
  let pedido;
  global.fetch = async (url, opcoes) => {
    pedido = { url, opcoes };
    return new Response(JSON.stringify(respostaGemini({ texto: 'PARACETAMOL 750 mg', legibilidade: 'boa' })));
  };

  const resultado = await lerComGemini(Buffer.from('foto'), 'chave-teste');

  assert.deepEqual(resultado, { textoBruto: 'PARACETAMOL 750 mg', confianca: 95, modelo: 'gemini-3.1-flash-lite' });
  assert.match(pedido.url, /\/models\/gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(pedido.opcoes.headers['x-goog-api-key'], 'chave-teste');
  const corpo = JSON.parse(pedido.opcoes.body);
  assert.equal(corpo.contents[0].parts[0].inline_data.data, Buffer.from('foto').toString('base64'));
  assert.equal(corpo.generationConfig.responseMimeType, 'application/json');
});

test('Gemini: o modelo pode ser trocado pelo .env', () => {
  process.env.GEMINI_MODELO = 'gemini-3.8-flash';
  assert.equal(modeloGemini(), 'gemini-3.8-flash');
  process.env.GEMINI_MODELO = 'modelo-a, modelo-b';
  assert.deepEqual(modelosGemini(), ['modelo-a', 'modelo-b']);
});

test('Gemini: modelo sobrecarregado (503) passa para o próximo da lista', async () => {
  process.env.GEMINI_MODELO = 'modelo-a,modelo-b';
  const tentados = [];
  global.fetch = async (url) => {
    tentados.push(url.match(/models\/(.+):generateContent/)[1]);
    if (tentados.length === 1) {
      return new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 });
    }
    return new Response(JSON.stringify(respostaGemini({ texto: 'ok ok', legibilidade: 'boa' })));
  };
  const resultado = await lerComGemini(Buffer.from('x'), 'c');
  assert.deepEqual(tentados, ['modelo-a', 'modelo-b']);
  assert.equal(resultado.modelo, 'modelo-b');
});

test('Gemini: chave inválida (400) não tenta outros modelos', async () => {
  process.env.GEMINI_MODELO = 'modelo-a,modelo-b';
  let tentativas = 0;
  global.fetch = async () => {
    tentativas++;
    return new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
  };
  await assert.rejects(lerComGemini(Buffer.from('x'), 'c'), /400: API key not valid/);
  assert.equal(tentativas, 1);
});

test('Gemini: respeita o prazo total e desiste', async () => {
  process.env.GEMINI_MODELO = 'modelo-a,modelo-b';
  process.env.GEMINI_TEMPO_LIMITE = '0.3';
  global.fetch = (url, opcoes) =>
    new Promise((resolve, reject) => {
      opcoes.signal.addEventListener('abort', () => reject(Object.assign(new Error('abortado'), { name: 'AbortError' })));
    });
  const inicio = Date.now();
  await assert.rejects(lerComGemini(Buffer.from('x'), 'c'));
  assert.ok(Date.now() - inicio < 2000, 'deveria desistir rápido');
});

test('Gemini: legibilidade vira confiança, e [ilegível] força o aviso', () => {
  assert.equal(interpretarRespostaGemini(respostaGemini({ texto: 'a b', legibilidade: 'parcial' })).confianca, 60);
  assert.equal(interpretarRespostaGemini(respostaGemini({ texto: 'a b', legibilidade: 'ruim' })).confianca, 25);
  // Mesmo dizendo "boa", se marcou trecho ilegível a confiança fica abaixo do mínimo (45)
  const comIlegivel = respostaGemini({ texto: 'Tomar [ilegível] comprimidos', legibilidade: 'boa' });
  assert.equal(interpretarRespostaGemini(comIlegivel).confianca, 40);
});

test('Gemini: foto sem texto devolve texto vazio', () => {
  assert.deepEqual(interpretarRespostaGemini(respostaGemini({ texto: '', legibilidade: 'ruim' })), {
    textoBruto: '',
    confianca: 0,
  });
});

test('Gemini: resposta fora do formato JSON ainda aproveita o texto', () => {
  const resposta = { candidates: [{ content: { parts: [{ text: 'Conta de luz' }] } }] };
  assert.deepEqual(interpretarRespostaGemini(resposta), { textoBruto: 'Conta de luz', confianca: 60 });
});

test('Gemini: erros da API viram exceção (para o servidor cair no Tesseract)', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 });
  await assert.rejects(lerComGemini(Buffer.from('x'), 'c'), /429: Quota exceeded/);

  global.fetch = async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  };
  await assert.rejects(lerComGemini(Buffer.from('x'), 'c'), /Sem conexão com o Gemini/);

  assert.throws(() => interpretarRespostaGemini({ promptFeedback: { blockReason: 'SAFETY' } }), /bloqueou/);
});

test('Google Vision: confiança por palavra, com peso pelo tamanho', () => {
  const palavra = (texto, confidence) => ({ confidence, symbols: [...texto].map((text) => ({ text })) });
  const resposta = {
    fullTextAnnotation: {
      text: 'Dipirona 500',
      pages: [{ blocks: [{ paragraphs: [{ words: [palavra('Dipirona', 0.98), palavra('500', 0.9), palavra('|', 0.1)] }] }] }],
    },
  };
  // (98*8 + 90*3) / 11 = 96; o "|" é ignorado
  assert.deepEqual(interpretarRespostaVision(resposta), { textoBruto: 'Dipirona 500', confianca: 96 });
  assert.deepEqual(interpretarRespostaVision({}), { textoBruto: '', confianca: 0 });
});
