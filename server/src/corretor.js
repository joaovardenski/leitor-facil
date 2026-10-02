// Corretor de palavras para o texto lido pelo Tesseract.
//
// Ideia (a do corretor de Peter Norvig, adaptada para OCR): quando o Tesseract
// lê uma palavra com pouca confiança e ela não existe em português, procuramos
// palavras reais a uma ou duas pequenas trocas de distância e escolhemos a mais
// provável, considerando:
//   - trocas típicas de OCR (0→o, 1→l, rn→m...) e acentos perdidos (nao→não)
//   - frequência de uso da palavra em português
//   - contexto: palavras que aparecem em outras partes do mesmo texto e
//     palavras comuns em bula e conta
//
// Regras de segurança:
//   - números, doses, unidades e datas NUNCA são alterados
//   - só mexe em palavras que não existem em português
//   - trocas típicas de OCR/acento valem sempre (o Tesseract costuma errar
//     acento com confiança alta: "Nao" com 93%); edições quaisquer só em
//     palavras que ele leu com confiança baixa
//   - na dúvida (dois candidatos parecidos), deixa como está
//
// Dados em server/dados (ver LEIAME.md lá): lista de frequência do português
// do Brasil, lista de palavras do dicionário Hunspell (LibreOffice) e
// termos-protegidos.txt (nomes de remédio, latim de bula), que nunca são trocados.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PASTA_DADOS = path.join(__dirname, '..', 'dados');

// Edições quaisquer (letra a mais/a menos) só em palavras lidas com confiança abaixo disso
const CONFIANCA_PARA_EDICAO_QUALQUER = 80;
// Diferença mínima de pontuação entre o melhor e o segundo candidato
const MARGEM_MINIMA = 1.5;

// Palavras de bula, receita e conta que contam como "comuns" mesmo que sejam
// raras no português do dia a dia. Ajudam na escolha (contexto do app).
const PALAVRAS_DO_DOMINIO = `
posologia dipirona monoidratada paracetamol ibuprofeno amoxicilina losartana omeprazol
comprimido comprimidos cápsula cápsulas drágea drágeas gotas xarope suspensão solução
pomada creme ampola frasco sachê injetável oral tópico sublingual uso adulto pediátrico
medicamento medicamentos farmacêutico farmacêutica farmácia médico médica prescrição receita
dose doses dosagem posológica superdosagem indicação indicações contraindicação contraindicações
advertências precauções reações adversas interações medicamentosas composição excipientes
conservar temperatura ambiente umidade validade lote fabricação embalagem bula jejum refeições
diariamente horas vezes ultrapasse ultrapassar alergia gestantes lactantes crianças
fatura boleto vencimento pagamento pagável consumo tarifa bandeira leitura medidor instalação
unidade consumidora energia elétrica água esgoto valor total multa juros código barras
beneficiário pagador emissão referência débito crédito cpf cnpj endereço cep
`
  .split(/\s+/)
  .filter(Boolean);

// Trocas comuns do OCR, em ordem: o que foi lido → o que provavelmente era
const TROCAS_OCR = [
  ['0', 'o'],
  ['1', 'l'],
  ['1', 'i'],
  ['5', 's'],
  ['8', 'b'],
  ['rn', 'm'],
  ['m', 'rn'],
  ['cl', 'd'],
  ['li', 'h'],
  ['vv', 'w'],
  ['l', 'i'],
  ['i', 'l'],
  ['c', 'e'],
  ['e', 'c'],
];

// Acentos que o OCR costuma perder ou trocar
const ACENTOS = {
  a: ['á', 'à', 'â', 'ã'],
  e: ['é', 'ê'],
  i: ['í'],
  o: ['ó', 'ô', 'õ'],
  u: ['ú', 'ü'],
  c: ['ç'],
  á: ['a', 'à', 'â', 'ã'],
  à: ['a', 'á'],
  â: ['a', 'á', 'ã'],
  ã: ['a', 'â', 'á'],
  é: ['e', 'ê'],
  ê: ['e', 'é'],
  í: ['i'],
  ó: ['o', 'ô', 'õ'],
  ô: ['o', 'ó', 'õ'],
  õ: ['o', 'ô'],
  ú: ['u'],
  ç: ['c'],
};

const LETRAS = 'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúç';

let frequencia = null; // Map: palavra → nº de ocorrências
let validas = null; // Set: palavras que existem no dicionário (inclusive raras)

function lerListaCompactada(arquivo) {
  return zlib.gunzipSync(fs.readFileSync(path.join(PASTA_DADOS, arquivo))).toString('utf8');
}

function lerTermosProtegidos() {
  const arquivo = path.join(PASTA_DADOS, 'termos-protegidos.txt');
  if (!fs.existsSync(arquivo)) return [];
  return fs
    .readFileSync(arquivo, 'utf8')
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('#'))
    .flatMap((linha) => linha.trim().toLowerCase().split(/\s+/))
    .filter(Boolean);
}

/** Carrega as listas de palavras (uma vez, ao iniciar o servidor). */
function carregarCorretor() {
  if (frequencia) return true;
  try {
    const freq = new Map();
    for (const linha of lerListaCompactada('frequencia.txt.gz').split('\n')) {
      const [palavra, contagem] = linha.trim().split(' ');
      if (palavra) freq.set(palavra.toLowerCase(), Number(contagem) || 1);
    }
    for (const palavra of PALAVRAS_DO_DOMINIO) {
      freq.set(palavra, Math.max(freq.get(palavra) || 0, 5000));
    }
    const dicionario = new Set();
    for (const linha of lerListaCompactada('dicionario.txt.gz').split('\n')) {
      const palavra = linha.trim().toLowerCase();
      if (palavra) dicionario.add(palavra);
    }
    // Termos protegidos contam como palavras que existem: nunca são trocados
    // e podem servir de correção ("Glnkgo" → "Ginkgo")
    for (const palavra of lerTermosProtegidos()) {
      dicionario.add(palavra);
      // Frequência média, para poderem ser escolhidos como correção
      if (!freq.has(palavra)) freq.set(palavra, 1000);
    }
    frequencia = freq;
    validas = dicionario;
    return true;
  } catch (erro) {
    console.warn(`Corretor de palavras desligado (não achei os dados em ${PASTA_DADOS}): ${erro.message}`);
    return false;
  }
}

// A lista de frequência vem de legendas e tem palavras escritas sem acento
// ("nao", "voce", "medico"). Uma palavra sem acento só conta como existente se
// não houver uma versão acentuada MUITO mais usada. Assim "nao" é corrigida,
// mas "esta" (de "esta casa") e "duvida" (de "ele duvida") continuam valendo.
const PROPORCAO_ACENTO_SUSPEITO = 50;
const cacheSuspeitas = new Map();

function semAcentoSuspeita(palavra) {
  if (cacheSuspeitas.has(palavra)) return cacheSuspeitas.get(palavra);
  const freq = frequencia.get(palavra) || 0;
  let suspeita = false;
  for (let i = 0; i < palavra.length && !suspeita; i++) {
    if (!'aeiouc'.includes(palavra[i])) continue;
    for (const variacao of ACENTOS[palavra[i]]) {
      const comAcento = palavra.slice(0, i) + variacao + palavra.slice(i + 1);
      if ((frequencia.get(comAcento) || 0) >= PROPORCAO_ACENTO_SUSPEITO * freq) {
        suspeita = true;
        break;
      }
    }
  }
  cacheSuspeitas.set(palavra, suspeita);
  return suspeita;
}

/** A palavra existe em português? (dicionário, ou lista de frequência sem suspeita) */
function existe(palavra) {
  if (validas.has(palavra)) return true;
  return frequencia.has(palavra) && !semAcentoSuspeita(palavra);
}

/** Todas as variações com UMA troca típica de OCR ou de acento (custo baixo). */
function trocasBaratas(palavra) {
  const resultado = new Set();
  for (const [lido, certo] of TROCAS_OCR) {
    let i = palavra.indexOf(lido);
    while (i !== -1) {
      resultado.add(palavra.slice(0, i) + certo + palavra.slice(i + lido.length));
      i = palavra.indexOf(lido, i + 1);
    }
  }
  for (let i = 0; i < palavra.length; i++) {
    for (const variacao of ACENTOS[palavra[i]] || []) {
      resultado.add(palavra.slice(0, i) + variacao + palavra.slice(i + 1));
    }
  }
  resultado.delete(palavra);
  return resultado;
}

/** Variações com UMA edição qualquer: tirar, pôr, trocar ou inverter letras. */
function edicoesSimples(palavra) {
  const resultado = new Set();
  for (let i = 0; i <= palavra.length; i++) {
    const antes = palavra.slice(0, i);
    const depois = palavra.slice(i);
    if (depois) resultado.add(antes + depois.slice(1)); // tirar
    if (depois.length > 1) resultado.add(antes + depois[1] + depois[0] + depois.slice(2)); // inverter
    for (const letra of LETRAS) {
      if (depois) resultado.add(antes + letra + depois.slice(1)); // trocar
      resultado.add(antes + letra + depois); // pôr
    }
  }
  resultado.delete(palavra);
  return resultado;
}

/**
 * Candidatos reais para uma palavra desconhecida: Map palavra → { custo, tipica }.
 * custo 0,5 por troca típica (OCR/acento), 1 para uma edição qualquer.
 * Permite até duas trocas típicas ("atencao" → "atenção") ou uma edição qualquer.
 * tipica = true quando só envolve trocas típicas.
 */
function candidatos(palavra, permitirEdicaoQualquer) {
  const resultado = new Map();
  const registrar = (cand, custo, tipica) => {
    if (cand === palavra || !existe(cand)) return;
    const atual = resultado.get(cand);
    if (!atual || atual.custo > custo || (atual.custo === custo && tipica && !atual.tipica)) {
      resultado.set(cand, { custo, tipica });
    }
  };
  const baratas = trocasBaratas(palavra);
  for (const c of baratas) registrar(c, 0.5, true);
  for (const c of baratas) for (const c2 of trocasBaratas(c)) registrar(c2, 1, true);
  // Edições quaisquer só em palavras mais longas (em palavra curta, quase tudo vira outra palavra)
  if (permitirEdicaoQualquer && palavra.length >= 5) {
    for (const c of edicoesSimples(palavra)) registrar(c, 1, false);
  }
  return resultado;
}

/** Mantém o formato original: MAIÚSCULAS, Primeira maiúscula ou minúsculas. */
function aplicarFormato(original, correcao) {
  if (original === original.toUpperCase() && original !== original.toLowerCase()) return correcao.toUpperCase();
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return correcao[0].toUpperCase() + correcao.slice(1);
  }
  return correcao;
}

/**
 * Decide a correção de UMA palavra. Devolve a palavra corrigida ou null.
 * contexto: Map com as palavras conhecidas do mesmo texto (palavra → vezes).
 */
function corrigirPalavra(nucleo, confianca, contexto) {
  const letras = (nucleo.match(/\p{L}/gu) || []).length;
  const digitos = (nucleo.match(/\p{N}/gu) || []).length;

  // Números, doses, datas, valores: nunca mexer
  if (letras === 0) return null;
  // Palavra com dígito só se for claramente uma palavra (ex.: "c0mprimido").
  // "7S0", "5OO" e "750mg" ficam como estão.
  if (digitos > 0 && (nucleo.length < 4 || letras / nucleo.length < 0.6)) return null;
  if (nucleo.length < 3) return null;

  const minuscula = nucleo.toLowerCase();
  if (digitos === 0 && existe(minuscula)) return null;

  const permitirEdicaoQualquer = confianca < CONFIANCA_PARA_EDICAO_QUALQUER;
  const opcoes = [...candidatos(minuscula, permitirEdicaoQualquer)].map(([palavra, { custo }]) => ({
    palavra,
    pontos:
      Math.log10((frequencia.get(palavra) || 1) + 1) -
      2.5 * custo +
      // Contexto: a palavra aparece em outro lugar do mesmo texto
      (contexto.has(palavra) ? 3 + Math.min(contexto.get(palavra), 3) : 0),
  }));
  if (opcoes.length === 0) return null;
  opcoes.sort((a, b) => b.pontos - a.pontos);

  // Na dúvida, não mexe
  if (opcoes.length > 1 && opcoes[0].pontos - opcoes[1].pontos < MARGEM_MINIMA) return null;
  // Palavra rara a uma edição qualquer e sem apoio do contexto: arriscado demais
  if (opcoes[0].pontos < 0) return null;

  return aplicarFormato(nucleo, opcoes[0].palavra);
}

/** Separa pontuação do começo/fim: "(c0mprimido)," → ["(", "c0mprimido", "),"] */
function separarPontuacao(token) {
  const m = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  return m ? [m[1], m[2], m[3]] : ['', token, ''];
}

/**
 * Corrige o texto do Tesseract.
 * palavras: [{ text, confidence }] na ordem de leitura (vêm do Tesseract).
 * Devolve { texto, correcoes: [{ de, para }] }.
 */
function corrigirTexto(texto, palavras) {
  if (!carregarCorretor() || !texto || !palavras?.length) return { texto, correcoes: [] };

  // Contexto: palavras do próprio texto que já existem em português
  const contexto = new Map();
  for (const { text } of palavras) {
    const nucleo = separarPontuacao(text)[1].toLowerCase();
    if (nucleo.length >= 3 && existe(nucleo)) contexto.set(nucleo, (contexto.get(nucleo) || 0) + 1);
  }

  const correcoes = [];
  let resultado = '';
  let cursor = 0;
  for (const { text, confidence } of palavras) {
    const posicao = texto.indexOf(text, cursor);
    if (posicao === -1) continue;
    const [antes, nucleo, depois] = separarPontuacao(text);
    const correcao = nucleo ? corrigirPalavra(nucleo, confidence, contexto) : null;
    resultado += texto.slice(cursor, posicao);
    if (correcao && correcao !== nucleo) {
      correcoes.push({ de: nucleo, para: correcao });
      resultado += antes + correcao + depois;
    } else {
      resultado += text;
    }
    cursor = posicao + text.length;
  }
  resultado += texto.slice(cursor);
  return { texto: resultado, correcoes };
}

module.exports = { carregarCorretor, corrigirTexto, corrigirPalavra };
