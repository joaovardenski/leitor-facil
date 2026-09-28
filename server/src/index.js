const { criarApp } = require('./app');
const { iniciarOcr, encerrarOcr } = require('./ocr');

const PORTA = Number(process.env.PORT) || 3000;

async function iniciar() {
  await iniciarOcr();
  // 0.0.0.0 para o celular conseguir acessar pela rede Wi-Fi
  const servidor = criarApp().listen(PORTA, '0.0.0.0', () => {
    console.log(`Servidor no ar na porta ${PORTA}.`);
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
