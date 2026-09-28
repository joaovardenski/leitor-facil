import * as SQLite from 'expo-sqlite';

// Banco local: nada sai do celular.
const db = SQLite.openDatabaseSync('leitor-facil.db');

const LIMITE_HISTORICO = 30;

export const PREFERENCIAS_PADRAO = {
  tamanhoFonte: 32,
  velocidade: 0.9,
  tema: 'amareloNoPreto',
};

export function iniciarBanco() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS preferencias (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);
}

// ---------- Histórico ----------

export function salvarLeitura(texto) {
  db.runSync('INSERT INTO leituras (texto, criado_em) VALUES (?, ?)', [
    texto,
    new Date().toISOString(),
  ]);
  // Mantém só as últimas leituras
  db.runSync(
    `DELETE FROM leituras WHERE id NOT IN (
       SELECT id FROM leituras ORDER BY id DESC LIMIT ?
     )`,
    [LIMITE_HISTORICO]
  );
}

export function listarLeituras() {
  return db.getAllSync('SELECT * FROM leituras ORDER BY id DESC');
}

export function apagarLeitura(id) {
  db.runSync('DELETE FROM leituras WHERE id = ?', [id]);
}

// ---------- Preferências ----------

export function carregarPreferencias() {
  const linhas = db.getAllSync('SELECT chave, valor FROM preferencias');
  const prefs = { ...PREFERENCIAS_PADRAO };
  for (const { chave, valor } of linhas) {
    prefs[chave] = JSON.parse(valor);
  }
  return prefs;
}

export function salvarPreferencia(chave, valor) {
  db.runSync(
    'INSERT OR REPLACE INTO preferencias (chave, valor) VALUES (?, ?)',
    [chave, JSON.stringify(valor)]
  );
}
