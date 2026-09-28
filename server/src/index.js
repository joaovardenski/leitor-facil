const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { iniciarOcr, lerImagem, encerrarOcr } = require('./ocr');

const PORTA = process.env.PORT || 3000;
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const app = express();
app.use(cors());

// memoryStorage: a foto fica só na memória e é descartada depois (privacidade/LGPD).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('O arquivo enviado não é uma imagem.'));
  },
});

app.get('/saude', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/ler', upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Envie a imagem no campo "foto".' });
  }

  try {
    const resultado = await lerImagem(req.file.buffer);
    res.json(resultado);
  } catch (erro) {
    console.error('Falha no OCR:', erro);
    res.status(500).json({ erro: 'Não foi possível ler a imagem. Tente novamente.' });
  }
});

// Erros de upload (arquivo grande demais, tipo inválido etc.)
app.use((erro, req, res, next) => {
  if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ erro: 'A imagem é maior que 10 MB.' });
  }
  res.status(400).json({ erro: erro.message });
});

async function iniciar() {
  await iniciarOcr();
  // 0.0.0.0 para o celular conseguir acessar pela rede Wi-Fi
  app.listen(PORTA, '0.0.0.0', () => {
    console.log(`Servidor no ar na porta ${PORTA}.`);
  });
}

process.on('SIGINT', async () => {
  await encerrarOcr();
  process.exit(0);
});

iniciar();
