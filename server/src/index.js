const path = require('path');

// Carrega o server/.env (onde fica a chave do Gemini), se existir.
// process.loadEnvFile vem no próprio Node (20.12+), sem pacote extra.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (erro) {
  if (erro.code !== 'ENOENT') console.warn('Não consegui ler o arquivo .env:', erro.message);
}

const { criarApp } = require('./app');
const { iniciarOcr, encerrarOcr, descreverMotor } = require('./ocr');

const PORTA = Number(process.env.PORT) || 3000;

async function iniciar() {
  await iniciarOcr();
  // 0.0.0.0 para o celular conseguir acessar pela rede Wi-Fi
  const servidor = criarApp().listen(PORTA, '0.0.0.0', () => {
    console.log(`Servidor no ar na porta ${PORTA}.`);
    console.log(descreverMotor());
  });

  const encerrar = async () => {
    servidor.close();
    await encerrarOcr();
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

iniciar().catch((erro) => {
  console.error('Não foi possível iniciar o servidor:', erro);
  process.exit(1);
});
