const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { lerImagem, ImagemInvalidaError } = require('./ocr');

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

/**
 * Monta a aplicação Express sem colocar no ar.
 * Separado do index.js para os testes conseguirem subir o servidor numa porta livre.
 */
function criarApp() {
  const app = express();
  app.use(cors());

  // memoryStorage: a foto fica só na memória e é descartada depois (privacidade/LGPD).
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('O arquivo enviado não é uma imagem.'));
    },
  });

  // Página raiz: confirma que o servidor está no ar para quem abrir no navegador
  app.get('/', (req, res) => {
    res.json({ status: 'ok', mensagem: 'Servidor do Leitor Fácil no ar.', rotas: ['GET /saude', 'POST /ler'] });
  });

  app.get('/saude', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/ler', upload.single('foto'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ erro: 'Envie a imagem no campo "foto".' });
    }

    const inicio = Date.now();
    try {
      const resultado = await lerImagem(req.file.buffer);
      console.log(`/ler: ${resultado.texto.length} caracteres, confiança ${resultado.confianca}%, ${Date.now() - inicio} ms`);
      res.json(resultado);
    } catch (erro) {
      if (erro instanceof ImagemInvalidaError) {
        return res.status(400).json({ erro: erro.message });
      }
      console.error('Falha no OCR:', erro);
      res.status(500).json({ erro: 'Não foi possível ler a imagem. Tente novamente.' });
    }
  });

  // Rotas que não existem
  app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  // Erros de upload (arquivo grande demais, tipo inválido etc.)
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ erro: 'A imagem é maior que 10 MB.' });
    }
    res.status(400).json({ erro: erro.message });
  });

  return app;
}

module.exports = { criarApp };
