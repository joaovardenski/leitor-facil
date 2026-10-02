// Diagnóstico da conexão com o Gemini, passo a passo.
// Na pasta server:  npm run testar-gemini
//
// 1. A chave está no .env?
// 2. A chave funciona e o modelo existe? (lista os modelos disponíveis)
// 3. Quanto tempo leva um pedido só de texto?
// 4. Quanto tempo leva ler a foto de exemplo?

const fs = require('fs');
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (erro) {
  if (erro.code !== 'ENOENT') console.warn('Não consegui ler o arquivo .env:', erro.message);
}

// No diagnóstico esperamos mais, para medir quanto tempo ele realmente leva
process.env.GEMINI_TEMPO_LIMITE = process.env.GEMINI_TEMPO_LIMITE_DIAGNOSTICO || '90';

const { geminiConfigurado, modeloGemini, lerComGemini } = require('../src/gemini');

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const chave = (process.env.GEMINI_API_KEY || '').trim();

async function cronometrar(rotulo, fn) {
  const inicio = Date.now();
  try {
    const resultado = await fn();
    console.log(`  ✔ ${rotulo} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    return resultado;
  } catch (erro) {
    console.log(`  ✘ ${rotulo} (${((Date.now() - inicio) / 1000).toFixed(1)} s): ${erro.message}`);
    return null;
  }
}

async function pedir(url, opcoes = {}, limiteMs = 60000) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limiteMs);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controle.signal });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${json.error?.message || 'sem detalhes'}`);
    return json;
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Error(`sem resposta em ${limiteMs / 1000} s`);
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('1. Chave no .env');
  if (!geminiConfigurado()) {
    console.log('  ✘ GEMINI_API_KEY não encontrada em server/.env');
    return;
  }
  console.log(`  ✔ chave encontrada (termina em ...${chave.slice(-4)}), modelo configurado: ${modeloGemini()}`);

  console.log('\n2. Chave e modelo');
  const lista = await cronometrar('listar modelos', () =>
    pedir(`${URL_BASE}/models?pageSize=1000`, { headers: { 'x-goog-api-key': chave } }, 20000)
  );
  if (lista) {
    const nomes = (lista.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace('models/', ''));
    const existe = nomes.includes(modeloGemini());
    console.log(`  ${existe ? '✔' : '✘'} o modelo ${modeloGemini()} ${existe ? 'existe' : 'NÃO apareceu na lista'}`);
    const flash = nomes.filter((n) => n.includes('flash')).slice(0, 12);
    if (flash.length) console.log(`  Modelos "flash" disponíveis: ${flash.join(', ')}`);
  }

  console.log('\n3. Pedido só de texto');
  await cronometrar('resposta de texto', async () => {
    const json = await pedir(`${URL_BASE}/models/${modeloGemini()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responda só: ok' }] }] }),
    });
    const texto = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '(vazio)';
    console.log(`    resposta: ${texto.trim().slice(0, 60)}`);
  });

  console.log('\n4. Leitura da foto de exemplo (como o servidor faz)');
  const foto = fs.readFileSync(path.join(__dirname, '..', 'amostras', 'exemplo-bula.jpg'));
  const resultado = await cronometrar('leitura da foto', () => lerComGemini(foto));
  if (resultado) {
    console.log(`    confiança: ${resultado.confianca}%`);
    console.log(`    texto lido:\n${resultado.textoBruto.split('\n').map((l) => `      ${l}`).join('\n')}`);
  }
}

main().catch((erro) => {
  console.error('Erro no diagnóstico:', erro);
  process.exit(1);
});
