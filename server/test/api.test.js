// Testes da API. Rode com: npm test
// Sobem o servidor numa porta livre, com o OCR de verdade (sem simulação).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const { criarApp } = require('../src/app');
const { iniciarOcr, encerrarOcr, limparTexto } = require('../src/ocr');

let servidor;
let url;

/** Gera uma foto de teste com as linhas de texto informadas. */
async function gerarImagem(linhas) {
  const textos = linhas
    .map((l, i) => `<text x="30" y="${80 + i * 80}" font-size="44" font-family="Arial, Helvetica, DejaVu Sans, sans-serif">${l}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${120 + linhas.length * 80}">
    <rect width="100%" height="100%" fill="white"/>${textos}</svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function enviar(buffer, tipo = 'image/jpeg', nome = 'foto.jpg', campo = 'foto') {
  const form = new FormData();
  form.append(campo, new Blob([buffer], { type: tipo }), nome);
  const resposta = await fetch(`${url}/ler`, { method: 'POST', body: form });
  return { status: resposta.status, corpo: await resposta.json() };
}

before(async () => {
  await iniciarOcr();
  await new Promise((resolve) => {
    servidor = criarApp().listen(0, '127.0.0.1', resolve);
  });
  url = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  servidor.close();
  await encerrarOcr();
});

test('GET /saude responde ok', async () => {
  const resposta = await fetch(`${url}/saude`);
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), { status: 'ok' });
});

test('GET / confirma que o servidor está no ar', async () => {
  const resposta = await fetch(`${url}/`);
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).status, 'ok');
});

test('POST /ler reconhece o texto de uma bula', async () => {
  const foto = await gerarImagem(['PARACETAMOL 750 mg', 'Tomar 1 comprimido a cada 8 horas']);
  const { status, corpo } = await enviar(foto);

  assert.equal(status, 200);
  assert.match(corpo.texto, /PARACETAMOL/);
  assert.match(corpo.texto, /750/);
  assert.match(corpo.texto, /comprimido/);
  assert.ok(corpo.confianca >= 45, `confiança baixa: ${corpo.confianca}`);
  assert.equal(corpo.aviso, null);
});

test('POST /ler aceita a foto em JSON base64 (formato do app)', async () => {
  const foto = await gerarImagem(['PARACETAMOL 750 mg', 'Tomar 1 comprimido a cada 8 horas']);
  const resposta = await fetch(`${url}/ler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagem: foto.toString('base64'), tipo: 'image/jpeg' }),
  });
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.match(corpo.texto, /PARACETAMOL/);
});

test('POST /ler com JSON sem imagem devolve 400', async () => {
  const resposta = await fetch(`${url}/ler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outra: 'coisa' }),
  });
  assert.equal(resposta.status, 400);
});

test('POST /ler com JSON grande demais devolve 413', async () => {
  const resposta = await fetch(`${url}/ler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagem: 'A'.repeat(16 * 1024 * 1024) }),
  });
  assert.equal(resposta.status, 413);
});

test('POST /ler reconhece acentos do português', async () => {
  const foto = await gerarImagem(['Atenção: não ultrapasse a dose', 'Conta de luz - vencimento']);
  const { status, corpo } = await enviar(foto);

  assert.equal(status, 200);
  assert.match(corpo.texto, /Atenção/);
  assert.match(corpo.texto, /vencimento/);
});

test('POST /ler corrige foto tirada com o celular deitado (EXIF)', async () => {
  // Gira os pixels e marca no EXIF que a foto precisa ser girada de volta,
  // como a câmera do celular faz quando está na horizontal.
  const reta = await gerarImagem(['PARACETAMOL 750 mg', 'Tomar 1 comprimido a cada 8 horas']);
  const deitada = await sharp(reta).rotate(270).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const { status, corpo } = await enviar(deitada);

  assert.equal(status, 200);
  assert.match(corpo.texto, /PARACETAMOL/);
});

test('POST /ler lê foto escura e com pouco contraste', async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="260">
    <rect width="100%" height="100%" fill="#5a5a5a"/>
    <text x="30" y="90" font-size="44" font-family="Arial, Helvetica, DejaVu Sans, sans-serif" fill="#262626">Dipirona 500 mg</text>
    <text x="30" y="170" font-size="44" font-family="Arial, Helvetica, DejaVu Sans, sans-serif" fill="#262626">Uso adulto e pediatrico</text>
  </svg>`;
  const escura = await sharp(Buffer.from(svg)).blur(0.8).jpeg({ quality: 70 }).toBuffer();
  const { status, corpo } = await enviar(escura);

  assert.equal(status, 200);
  assert.match(corpo.texto, /Dipirona/);
});

test('POST /ler avisa quando não há texto na foto', async () => {
  const foto = await sharp({ create: { width: 800, height: 600, channels: 3, background: 'white' } }).jpeg().toBuffer();
  const { status, corpo } = await enviar(foto);

  assert.equal(status, 200);
  assert.equal(corpo.texto, '');
  assert.ok(corpo.aviso, 'deveria vir um aviso');
});

test('POST /ler sem foto devolve 400', async () => {
  const resposta = await fetch(`${url}/ler`, { method: 'POST' });
  assert.equal(resposta.status, 400);
  assert.ok((await resposta.json()).erro);
});

test('POST /ler com arquivo que não é imagem devolve 400', async () => {
  const { status, corpo } = await enviar(Buffer.from('não sou uma imagem'), 'text/plain', 'nota.txt');
  assert.equal(status, 400);
  assert.match(corpo.erro, /não é uma imagem/);
});

test('POST /ler com imagem corrompida devolve 400', async () => {
  const { status, corpo } = await enviar(Buffer.from('dados quebrados'), 'image/jpeg');
  assert.equal(status, 400);
  assert.match(corpo.erro, /Não consegui abrir/);
});

test('rota inexistente devolve 404', async () => {
  const resposta = await fetch(`${url}/nada`);
  assert.equal(resposta.status, 404);
});

test('limparTexto remove espaços e linhas só com símbolos', () => {
  const sujo = '  PARACETAMOL   750 mg \n | ~ . \n\n\n\nTomar  1 comprimido\n—';
  assert.equal(limparTexto(sujo), 'PARACETAMOL 750 mg\n\nTomar 1 comprimido');
});
