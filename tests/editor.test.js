// Editor: a parte pura (campos, ímã, compilação pra linha do tempo, desfazer).
const test = require('node:test');
const assert = require('node:assert');
const { carregar, json } = require('./carregar');

const extras = { setInterval: () => 0, window: { addEventListener() {} }, document: { addEventListener() {} } };
const M = carregar(['config.js', 'patterns.js', 'sim.js', 'audio.js', 'editor.js'], extras);
const Ed = M.pegar('Editor'), P = M.Patterns, Sound = M.pegar('Sound');
// JSON com as chaves em ordem (o validador monta o objeto numa ordem própria)
const chaves = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.keys(v).sort().reduce((a, x) => { a[x] = v[x]; return a; }, {}) : v));

test('todo tipo da paleta cria um evento válido, e todo campo do inspetor é aceito pelo validador', () => {
  for (const tipo of Ed.TIPOS) {
    const ev = Ed.novoEvento(tipo, 4);
    const v = P.validar({ id: 't', bpm: 120, duracaoBatidas: 32, eventos: [ev] });
    assert.strictEqual(v.avisos.length, 0, `${tipo}: ${v.avisos}`);
    const regras = Object.assign({}, P.COMUNS, P.ESQUEMA[tipo]);
    for (const c of Ed.camposDe(ev).concat(tipo === 'paredes' ? Ed.camposDe({ tipo, modo: 'buraco' }) : [])) {
      assert.ok(regras[c.k], `${tipo}.${c.k} não existe no validador`);
      // mexer pra cima e pra baixo várias vezes nunca gera algo inválido
      const e2 = JSON.parse(JSON.stringify(ev));
      for (let i = 0; i < 60; i++) Ed.ajustar(e2, c, i < 30 ? 1 : -1, 0);
      const v2 = P.validar({ id: 't', bpm: 120, duracaoBatidas: 32, eventos: [e2] });
      assert.strictEqual(v2.avisos.length, 0, `${tipo}.${c.k}: ${v2.avisos}`);
      assert.strictEqual(chaves(v2.fase.eventos[0]), chaves(e2), `${tipo}.${c.k}: o validador mudou o valor`);
    }
  }
});

test('todo texto do editor existe (tipos, campos, opções)', () => {
  const ctx = carregar(['config.js', 'ui.js'], { document: {}, Input: {}, Sound: {}, Levels: {}, Save: {}, Game: {}, Avatar: {} });
  const T = ctx.pegar('TEXTOS').pt.editor;
  for (const tipo of Ed.TIPOS) {
    assert.ok(T.tipos[tipo] && T.curtos[tipo], tipo);
    for (const c of Ed.camposDe({ tipo }).concat(Ed.camposDe({ tipo, modo: 'buraco' }))) {
      assert.ok(T.campos[c.rot || c.k], `campo ${c.rot || c.k}`);
      for (const o of c.opcoes || []) assert.ok(T.opcoes[o === undefined ? 'fechar' : o], `opção ${o}`);
    }
  }
  for (const m of ['despertar', 'correnteza', 'prensa']) {
    assert.ok(T.musicas[m]);
    for (const s of Sound.info(m).secoes) assert.ok(T.secoes[s.nome], `seção ${s.nome}`);
  }
  for (const i of Ed.IMAS) assert.ok(T.imas[i]);
});

test('ajustar: passo, limites, opções em ciclo e lista de posições', () => {
  const c = (tipo, k) => Ed.camposDe({ tipo }).find(x => x.k === k);
  const ev = { batida: 0, tipo: 'chuva', pos: [0.9, 0] };
  Ed.ajustar(ev, c('chuva', 'pos'), 1, 0); Ed.ajustar(ev, c('chuva', 'pos'), 1, 0); Ed.ajustar(ev, c('chuva', 'pos'), 1, 0);
  assert.deepStrictEqual(json(ev.pos), json([1, 0]));                    // para no limite
  Ed.ajustar(ev, c('chuva', 'de'), 1);
  assert.strictEqual(ev.de, 'baixo');                                      // padrão 'cima' → próximo
  Ed.ajustar(ev, c('chuva', 'vel'), -1);
  assert.strictEqual(ev.vel, CONFIG_vel() - 10);
  const l = { batida: 0, tipo: 'laser', pos: 0.3 };
  Ed.ajustar(l, c('laser', 'ate'), 1);
  assert.strictEqual(l.ate, 0.35);                                         // opcional vazio começa da posição
  Ed.ajustar(l, c('laser', 'orient'), -1);
  assert.strictEqual(l.orient, 165);                                       // 'v' ← volta pro fim da lista
  const p = { batida: 0, tipo: 'paredes' };
  Ed.ajustar(p, c('paredes', 'modo'), 1);
  assert.strictEqual(p.modo, 'buraco');
  Ed.ajustar(p, Ed.camposDe(p)[0], 1);
  assert.strictEqual(p.modo, undefined);                                   // volta pro modo normal (sem o campo)
  const e = { batida: 0, tipo: 'chuva', pos: 0.5 };
  assert.strictEqual(Ed.posAdicionar(e, 'pos', 0), 1);
  assert.deepStrictEqual(json(e.pos), json([0.5, 0.7]));
  assert.strictEqual(Ed.posRemover(e, 'pos', 0), 0);
  assert.strictEqual(e.pos, 0.7);                                          // uma posição volta a ser número
  assert.strictEqual(Ed.posRemover(e, 'pos', 0), 0);
  assert.strictEqual(e.pos, 0.7);                                          // nunca fica vazia
  function CONFIG_vel() { return M.CONFIG.ataques.velocidadeBala; }
});

test('moeda nova escolhe a moeda que falta', () => {
  const fase = { eventos: [{ tipo: 'moeda', id: 0 }, { tipo: 'moeda', id: 2 }] };
  assert.strictEqual(Ed.novoEvento('moeda', 3, fase).id, 1);
});

test('ímã: grade, notas da música (com distância máxima) e livre', () => {
  const mapa = Ed.mapaMusical(Sound.info('correnteza'));
  assert.ok(mapa.bumbo.length > 50 && mapa.caixa.length > 50 && mapa.melodia.length > 50);
  assert.strictEqual(Ed.imantar(3.13, 'q', mapa, 0), 3.25);
  assert.strictEqual(Ed.imantar(3.13, 'b', mapa, 0), 3);
  assert.strictEqual(Ed.imantar(3.137, 'livre', mapa, 0), 3.14);
  const k = mapa.bumbo[20];
  assert.strictEqual(Ed.imantar(k + 0.2, 'bumbo', mapa, 0.5), k);
  assert.strictEqual(Ed.imantar(k + 0.2, 'bumbo', mapa, 0.1), Math.round((k + 0.2) * 4) / 4);   // longe demais: grade
  const d = Ed.dadosMusica(Sound.info('despertar'));
  assert.deepStrictEqual(json(d), json({ bpm: 112, duracaoBatidas: 113 }));   // igual à fase oficial
});

test('compilar pro editor: faixas de cada evento, pistas sem sobrepor e o que passou do fim', () => {
  const fase = { id: 'u-x', bpm: 120, duracaoBatidas: 40, eventos: [
    { batida: 4, tipo: 'laser', pos: 0, aviso: 2, dur: 2 },
    { batida: 4.5, tipo: 'chuva', pos: [0, 0.5], intervalo: 1, aviso: 2 },
    { batida: 5, tipo: 'girar', angulo: 30, dur: 4, aviso: 1 },
    { batida: 50, tipo: 'chuva', pos: 0 },                 // depois do fim
    { batida: 10, tipo: 'anel', x: 0, y: 0 },
  ] };
  const { comp, faixas } = Ed.compilar(fase, 4);
  assert.strictEqual(comp.fase.eventos.length, 4);
  const [laser, chuva, girar, fora, anel] = faixas;
  assert.strictEqual(json([laser.ini, laser.ativo]), json([2, 4]));
  assert.ok(Math.abs(laser.fim - (6 + M.CONFIG.ataques.sumicoLaser / 0.5)) < 1e-6);
  assert.strictEqual(chuva.ativo, 4.5);
  assert.ok(chuva.fim > 5.5);
  assert.strictEqual(json([girar.ini, girar.ativo, girar.fim]), json([4, 5, 9]));
  assert.strictEqual(fora.fora, true);
  assert.ok(anel.ativo === 10 && anel.fim > 10);
  // eventos que se cruzam no tempo ficam em pistas diferentes
  const pistas = new Set([laser.pista, chuva.pista, girar.pista]);
  assert.strictEqual(pistas.size, 3);
});

test('toque na prévia vira a posição certa de cada tipo', () => {
  const T = (ev, k, x, y) => Ed.posicaoDoToque(ev, k, x, y, 144, 92);
  assert.strictEqual(T({ tipo: 'chuva' }, 'pos', 72, 10), 0.5);
  assert.strictEqual(T({ tipo: 'chuva', de: 'esquerda' }, 'pos', 72, 46), 0.5);
  assert.strictEqual(T({ tipo: 'fogo' }, 'pos', 10, -46), -0.5);
  assert.strictEqual(T({ tipo: 'laser', orient: 'h' }, 'pos', 0, 92), 1);
  assert.strictEqual(T({ tipo: 'laser', orient: 30 }, 'pos', 0, 0), 0);
  assert.strictEqual(T({ tipo: 'paredes' }, 'centro', -36, 0), -0.25);
  assert.strictEqual(T({ tipo: 'paredes', modo: 'buraco', de: 'esquerda' }, 'centro', 0, 46), 0.5);
  assert.deepStrictEqual(json(T({ tipo: 'anel' }, 'x', 144, -184)), json({ x: 1, y: -1 }));
});

test('desfazer e refazer', () => {
  const h = new Ed.Historico(3);
  h.registrar('a'); h.registrar('b');
  assert.strictEqual(h.desfazer('c'), 'b');
  assert.strictEqual(h.desfazer('b'), 'a');
  assert.strictEqual(h.desfazer('a'), null);
  assert.strictEqual(h.refazer('a'), 'b');
  h.registrar('x');                        // mudança nova apaga o "refazer"
  assert.strictEqual(h.podeRefazer, false);
  for (const s of ['1', '2', '3', '4']) h.registrar(s);
  assert.strictEqual(h.antes.length, 3);   // limite
});
