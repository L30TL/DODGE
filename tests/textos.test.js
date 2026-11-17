// Todo texto visível tem que estar em TEXTOS (senão não traduz pro inglês) (B10).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./carregar');

test('nenhum texto visível escrito direto no código (tudo em TEXTOS)', () => {
  const letra = /[A-Za-zÀ-ÿ]/;
  const achados = [];
  for (const arq of fs.readdirSync(RAIZ).filter(f => f.endsWith('.js') && f !== 'ui.js' && f !== 'debug.js')) {
    verificar(arq, fs.readFileSync(path.join(RAIZ, arq), 'utf8'));
  }
  // no ui.js, o objeto TEXTOS é a fonte: verifica só o que vem depois dele
  const ui = fs.readFileSync(path.join(RAIZ, 'ui.js'), 'utf8');
  verificar('ui.js', ui.slice(ui.indexOf('function t(chave')));
  function verificar(arq, src) {
    const padroes = [/UI\.texto\(\s*\w+\s*,\s*'([^']*)'/g, /\btexto:\s*'([^']*)'/g];
    for (const re of padroes) {
      let m;
      while ((m = re.exec(src))) if (letra.test(m[1])) achados.push(`${arq}: '${m[1]}'`);
    }
  }
  assert.deepStrictEqual(achados, []);
});

test('toda chave usada em t(...) existe em TEXTOS', () => {
  const { carregar } = require('./carregar');
  const ctx = carregar(['config.js', 'ui.js'], { document: {}, Input: {}, Sound: {}, Levels: {}, Save: {}, Game: {}, Avatar: {} });
  const T = ctx.pegar('TEXTOS').pt;
  const faltando = [];
  for (const arq of fs.readdirSync(RAIZ).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
    const re = /\bt\('([a-zA-Z.]+)'/g;
    let m;
    while ((m = re.exec(src))) {
      const chave = m[1].endsWith('.') ? m[1].slice(0, -1) : m[1];      // t('grupo.' + x): confere o grupo
      const v = chave.split('.').reduce((o, k) => (o ? o[k] : undefined), T);
      if (v === undefined) faltando.push(`${arq}: ${m[1]}`);
      // chave completa (sem o ponto do fim) tem que ser texto, não um grupo (B24)
      else if (!m[1].endsWith('.') && typeof v !== 'string') faltando.push(`${arq}: ${m[1]} é um grupo, não um texto`);
    }
  }
  assert.deepStrictEqual(faltando, []);
});

test('inglês: as mesmas chaves do português, com os mesmos {marcadores}', () => {
  const { carregar } = require('./carregar');
  const ctx = carregar(['config.js', 'ui.js', 'textos-en.js'], { document: {}, Input: {}, Sound: {}, Levels: {}, Save: {}, Game: {}, Avatar: {} });
  const T = ctx.pegar('TEXTOS');
  const plano = (o, p = '', out = {}) => { for (const k in o) { if (typeof o[k] === 'object') plano(o[k], p + k + '.', out); else out[p + k] = o[k]; } return out; };
  const pt = plano(T.pt), en = plano(T.en);
  const problemas = [];
  for (const k in pt) {
    if (!(k in en)) { problemas.push('falta em inglês: ' + k); continue; }
    const marcas = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    if (marcas(pt[k]) !== marcas(en[k])) problemas.push('marcadores diferentes: ' + k);
  }
  for (const k in en) if (!(k in pt)) problemas.push('sobrando em inglês: ' + k);
  assert.deepStrictEqual(problemas, []);
});
