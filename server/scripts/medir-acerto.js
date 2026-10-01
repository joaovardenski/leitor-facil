// Mede a taxa de acerto real do OCR nas suas fotos.
//
// Como usar:
//   1. Coloque as fotos em server/amostras/ (jpg ou png).
//   2. Para cada foto, crie um .txt com o MESMO nome contendo o texto correto,
//      digitado à mão. Ex.: bula-dipirona.jpg + bula-dipirona.txt
//   3. Na pasta server, rode:  npm run medir
//
// Ele lê cada foto com todos os motores disponíveis (Tesseract sem e com o
// corretor de palavras; Gemini e Google Vision se a chave estiver no .env),
// compara com o texto correto e
// mostra uma tabela. A tabela também é salva em amostras/resultado.md, pronta
// para colar no relatório. O texto que cada motor leu fica em amostras/lidos/.

const fs = require('fs');
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (erro) {
  if (erro.code !== 'ENOENT') console.warn('Não consegui ler o arquivo .env:', erro.message);
}

const { iniciarOcr, encerrarOcr, lerImagem, motoresDisponiveis } = require('../src/ocr');
const { compararTextos } = require('./metricas');

const PASTA = path.resolve(process.argv[2] || path.join(__dirname, '..', 'amostras'));
const EXTENSOES = ['.jpg', '.jpeg', '.png', '.webp'];
// O plano grátis do Gemini tem limite de pedidos por minuto: espera entre as fotos
const PAUSA_NUVEM_MS = 7000;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pct = (valor) => `${(valor * 100).toFixed(1).replace('.', ',')}%`;
const segundos = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

function encontrarAmostras() {
  if (!fs.existsSync(PASTA)) return [];
  return fs
    .readdirSync(PASTA)
    .filter((nome) => EXTENSOES.includes(path.extname(nome).toLowerCase()))
    .sort()
    .map((nome) => {
      const base = path.join(PASTA, path.basename(nome, path.extname(nome)));
      return { nome, foto: path.join(PASTA, nome), gabarito: `${base}.txt` };
    })
    .filter((amostra) => {
      if (fs.existsSync(amostra.gabarito)) return true;
      console.warn(`Pulando ${amostra.nome}: falta o arquivo ${path.basename(amostra.gabarito)} com o texto correto.`);
      return false;
    });
}

// Nome na tabela → opções de leitura
function opcoesDoMotor(motor) {
  if (motor === 'tesseract-sem-dicionario') return { motor: 'tesseract', dicionario: false };
  if (motor === 'tesseract') return { motor: 'tesseract', dicionario: true };
  return { motor };
}

async function lerComMotor(buffer, motor) {
  const inicio = Date.now();
  try {
    const resultado = await lerImagem(buffer, opcoesDoMotor(motor));
    return { ...resultado, tempoMs: Date.now() - inicio };
  } catch (erro) {
    // 429 = limite por minuto do plano grátis: espera e tenta mais uma vez
    if (/\b429\b/.test(erro.message)) {
      console.warn(`  ${motor}: limite de pedidos atingido, esperando 60 s...`);
      await esperar(60000);
      const resultado = await lerImagem(buffer, opcoesDoMotor(motor));
      return { ...resultado, tempoMs: Date.now() - inicio };
    }
    throw erro;
  }
}

async function main() {
  const amostras = encontrarAmostras();
  if (amostras.length === 0) {
    console.log(`Nenhuma amostra em ${PASTA}.`);
    console.log('Coloque fotos (.jpg/.png) com um .txt de mesmo nome contendo o texto correto.');
    return;
  }

  const motores = ['tesseract-sem-dicionario', ...motoresDisponiveis()];
  console.log(`${amostras.length} amostra(s). Motores: ${motores.join(', ')}.\n`);

  await iniciarOcr();
  const pastaLidos = path.join(PASTA, 'lidos');
  fs.mkdirSync(pastaLidos, { recursive: true });

  const linhas = [];
  const somas = Object.fromEntries(motores.map((m) => [m, { palavras: 0, caracteres: 0, tempo: 0, n: 0, falhas: 0 }]));

  try {
    for (const amostra of amostras) {
      const buffer = fs.readFileSync(amostra.foto);
      const correto = fs.readFileSync(amostra.gabarito, 'utf8');
      console.log(amostra.nome);

      for (const motor of motores) {
        const naNuvem = !motor.startsWith('tesseract');
        if (naNuvem && somas[motor].n + somas[motor].falhas > 0) await esperar(PAUSA_NUVEM_MS);
        try {
          const lido = await lerComMotor(buffer, motor);
          const acerto = compararTextos(lido.texto, correto);
          fs.writeFileSync(path.join(pastaLidos, `${path.parse(amostra.nome).name}.${motor}.txt`), lido.texto);

          const soma = somas[motor];
          soma.palavras += acerto.acertoPalavras;
          soma.caracteres += acerto.acertoCaracteres;
          soma.tempo += lido.tempoMs;
          soma.n += 1;
          linhas.push([amostra.nome, motor, pct(acerto.acertoPalavras), pct(acerto.acertoCaracteres), `${lido.confianca}%`, segundos(lido.tempoMs)]);
          console.log(`  ${motor.padEnd(25)} palavras ${pct(acerto.acertoPalavras).padStart(6)} · caracteres ${pct(acerto.acertoCaracteres).padStart(6)} · ${segundos(lido.tempoMs)}`);
        } catch (erro) {
          somas[motor].falhas += 1;
          linhas.push([amostra.nome, motor, 'falhou', '-', '-', '-']);
          console.log(`  ${motor.padEnd(25)} FALHOU: ${erro.message}`);
        }
      }
    }
  } finally {
    await encerrarOcr();
  }

  const tabela = [
    '| Foto | Motor | Acerto de palavras | Acerto de caracteres | Confiança informada | Tempo |',
    '|---|---|---|---|---|---|',
    ...linhas.map((l) => `| ${l.join(' | ')} |`),
  ];
  const resumo = [
    '| Motor | Fotos | Acerto médio de palavras | Acerto médio de caracteres | Tempo médio |',
    '|---|---|---|---|---|',
    ...motores.map((m) => {
      const s = somas[m];
      if (s.n === 0) return `| ${m} | 0 | - | - | - |`;
      return `| ${m} | ${s.n}${s.falhas ? ` (+${s.falhas} falha)` : ''} | ${pct(s.palavras / s.n)} | ${pct(s.caracteres / s.n)} | ${segundos(s.tempo / s.n)} |`;
    }),
  ];

  const relatorio = [
    `# Taxa de acerto do OCR`,
    '',
    `Medido em ${new Date().toLocaleString('pt-BR')} com ${amostras.length} foto(s).`,
    'Comparação sem diferenciar maiúsculas e sem pontuação; acentos contam.',
    '',
    '## Resumo',
    '',
    ...resumo,
    '',
    '## Por foto',
    '',
    ...tabela,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(PASTA, 'resultado.md'), relatorio);
  console.log(`\n${resumo.join('\n')}\n`);
  console.log(`Tabela completa salva em ${path.join(PASTA, 'resultado.md')}`);
  console.log(`Texto lido por cada motor em ${pastaLidos}`);
}

main().catch((erro) => {
  console.error('Erro ao medir:', erro);
  process.exit(1);
});
