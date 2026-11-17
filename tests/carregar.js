// Carrega os arquivos do jogo (scripts clássicos do navegador) num contexto do Node,
// só com a parte PURA (sem canvas, sem áudio). Usado por todos os testes.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PADRAO = ['config.js', 'patterns.js', 'sim.js', 'levels.js', 'save.js'];

// localStorage de mentira (com opção de quebrar pra testar bloqueio/cota cheia)
function armazenamentoFalso(inicial, op) {
  op = op || {};
  const m = new Map(Object.entries(inicial || {}));
  return {
    getItem(k) { if (op.bloqueado) throw new Error('bloqueado'); return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (op.bloqueado || op.cheio) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    get length() { return m.size; },
    mapa: m,
  };
}

function carregar(arquivos, extras) {
  const ctx = vm.createContext(Object.assign({
    console, Math, JSON, Date, Map, Set, Array, Object, Number, String, Boolean, Error, Infinity, NaN,
    setTimeout, clearTimeout, Float32Array, Uint8Array,
  }, extras || {}));
  for (const f of (arquivos || PADRAO)) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
  }
  const pegar = (nome) => vm.runInContext(nome, ctx);
  const obj = { ctx, pegar };
  for (const nome of ['CONFIG', 'Patterns', 'Sim', 'Levels', 'Save', 'Debug']) {
    Object.defineProperty(obj, nome, { get: () => pegar(nome), enumerable: true });
  }
  return obj;
}

// Números aleatórios com semente (os testes também são determinísticos)
function aleatorio(semente) {
  let s = semente >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Compara objetos de "mundos" diferentes (vm) pelo conteúdo
const json = (x) => JSON.stringify(x);

module.exports = { carregar, armazenamentoFalso, aleatorio, json, RAIZ };
