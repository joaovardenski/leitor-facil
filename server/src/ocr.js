const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

// Abaixo desse valor (0 a 100), avisamos o usuário que a leitura pode estar errada.
const CONFIANCA_MINIMA = 45;

let worker = null;

/**
 * Carrega o Tesseract com o modelo de português.
 * O modelo vem do pacote npm @tesseract.js-data/por (instalado junto com o
 * npm install), então o servidor não precisa baixar nada ao iniciar.
 */
async function iniciarOcr() {
  const langPath = path.join(
    path.dirname(require.resolve('@tesseract.js-data/por/package.json')),
    '4.0.0_best_int'
  );
  worker = await createWorker('por', 1, { langPath, cacheMethod: 'none' });
  console.log('OCR pronto.');
}

/**
 * Melhora a foto antes do OCR:
 * - corrige a rotação usando os dados EXIF da câmera
 * - reduz fotos muito grandes (acelera o OCR sem perder legibilidade)
 * - tira a cor e aumenta o contraste
 */
async function tratarImagem(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

/**
 * Recebe a imagem (Buffer) e devolve { texto, confianca, aviso }.
 * A imagem só existe em memória; nada é gravado em disco.
 */
async function lerImagem(buffer) {
  if (!worker) throw new Error('OCR ainda não foi iniciado.');

  const imagem = await tratarImagem(buffer);
  const { data } = await worker.recognize(imagem);

  const texto = limparTexto(data.text);
  const confianca = Math.round(data.confidence);

  let aviso = null;
  if (!texto) {
    aviso = 'Não encontrei texto na foto. Tente fotografar mais de perto, com boa luz.';
  } else if (confianca < CONFIANCA_MINIMA) {
    aviso = 'A foto não ficou nítida e a leitura pode ter erros. Se puder, tire outra foto.';
  }

  return { texto, confianca, aviso };
}

/** Remove espaços sobrando e linhas vazias repetidas. */
function limparTexto(texto) {
  return (texto || '')
    .split('\n')
    .map((linha) => linha.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function encerrarOcr() {
  if (worker) await worker.terminate();
}

module.exports = { iniciarOcr, lerImagem, encerrarOcr };
