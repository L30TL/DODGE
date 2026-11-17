// Padrões de ataque: determinismo, validação e limites.
const test = require('node:test');
const assert = require('node:assert');
const { carregar, aleatorio, json } = require('./carregar');

const J = carregar();
const { Patterns, Levels, CONFIG } = J;
const todas = Levels.FASES.concat([Levels.LABORATORIO]);

test('compilar a mesma fase duas vezes dá exatamente os mesmos projéteis', () => {
  for (const f of todas) {
    const a = Patterns.compilar(f, CONFIG.caixa), b = Patterns.compilar(f, CONFIG.caixa);
    assert.strictEqual(json(a.specs), json(b.specs), f.id);
    assert.strictEqual(a.avisos.length, 0, `${f.id} tem avisos: ${a.avisos.join('; ')}`);
  }
});

test('a posição dos ataques depende só do tempo (avançar frame a frame = pular direto)', () => {
  const rnd = aleatorio(7);
  for (const f of todas) {
    const comp = Patterns.compilar(f, CONFIG.caixa);
    for (const alvo of [0.3, 0.55, 0.81].map(p => p * comp.duracao)) {
      const seq = new Patterns.Ataques(comp), pulo = new Patterns.Ataques(comp);
      const alma = { x: 0, y: 0 };
      seq.reiniciar(0, alma);
      for (let t = 0; t < alvo;) { t = Math.min(alvo, t + 0.008 + rnd() * 0.03); seq.atualizar(t, 0.016, alma); }
      pulo.reiniciar(alvo, alma);
      pulo.atualizar(alvo, 0, alma);
      const geo = (at) => Array.from({ length: at.n }, (_, i) => at.vivos[i])
        .filter(o => !o.s.mira)
        .map(o => [o.s.ordem, +o.x.toFixed(6), +o.y.toFixed(6), +(o.p || 0).toFixed(6), +(o.e || 0).toFixed(6), +(o.m || 0).toFixed(6)])
        .sort((p, q) => p[0] - q[0]);
      assert.deepStrictEqual(geo(seq), geo(pulo), `${f.id} em ${alvo.toFixed(2)} s`);
    }
  }
});

test('fases malucas nunca travam nem geram NaN (fuzzing do validador)', () => {
  const rnd = aleatorio(42);
  const lixo = () => {
    const op = [NaN, Infinity, -Infinity, -1e9, 1e9, 'abc', null, undefined, {}, [], [NaN, 2, 'x'], true, rnd() * 4 - 2, Math.round(rnd() * 20)];
    return op[Math.floor(rnd() * op.length)];
  };
  const tipos = Object.keys(Patterns.ESQUEMA).concat(['naoExiste', '', null]);
  for (let k = 0; k < 400; k++) {
    const evs = [];
    const n = Math.floor(rnd() * 30);
    for (let i = 0; i < n; i++) {
      const ev = { batida: rnd() < 0.85 ? rnd() * 70 : lixo(), tipo: tipos[Math.floor(rnd() * tipos.length)] };
      for (const campo of ['pos', 'de', 'vel', 'tam', 'aviso', 'intervalo', 'dur', 'ate', 'orient', 'larg', 'eixo', 'centro', 'espaco',
        'fechar', 'segurar', 'abrir', 'modo', 'x', 'y', 'bracos', 'giro', 'cadencia', 'quantidade', 'guia', 'raio', 'id']) {
        if (rnd() < 0.3) ev[campo] = lixo();
      }
      evs.push(rnd() < 0.05 ? lixo() : ev);
    }
    const fase = { id: 'fuzz' + k, bpm: rnd() < 0.9 ? 60 + rnd() * 140 : lixo(), duracaoBatidas: rnd() < 0.9 ? 64 : lixo(),
      dificuldade: rnd() < 0.5 ? 'facil' : lixo(), eventos: rnd() < 0.95 ? evs : lixo() };
    const t0 = Date.now();
    const comp = Patterns.compilar(fase, CONFIG.caixa);
    assert.ok(Date.now() - t0 < 500, 'compilou devagar demais');
    for (const s of comp.specs) {
      for (const [k2, v] of Object.entries(s)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `fase ${k}: spec.${k2} = ${v}`);
    }
    // e roda: atualizar/testar em vários tempos sem NaN
    const at = new Patterns.Ataques(comp);
    const alma = { x: 0, y: 0 };
    for (let t = 0; t < comp.duracao; t += comp.duracao / 37) {
      at.atualizar(t, 0.016, alma);
      at.testar(t, rnd() * 200 - 100, rnd() * 160 - 80, 2.5, 9, [], []);
      assert.strictEqual(at.estourou, 0);
    }
  }
});

test('evento gigante é limitado (nada de 1 milhão de projéteis)', () => {
  const fase = { id: 'gigante', bpm: 120, duracaoBatidas: 64, dificuldade: 'facil',
    eventos: [{ batida: 1, tipo: 'espiral', dur: 1e9, cadencia: 16, bracos: 16 }, { batida: 2, tipo: 'chuva', pos: new Array(5000).fill(0) }] };
  const comp = Patterns.compilar(fase, CONFIG.caixa);
  assert.ok(comp.specs.length <= CONFIG.limites.maxPorEvento * 2, `${comp.specs.length} projéteis`);
  assert.ok(comp.avisos.length > 0);
});

test('o pool nunca descarta projétil (2000 na tela ao mesmo tempo)', () => {
  const pos = []; for (let i = 0; i < 2000; i++) pos.push(-1 + 2 * (i % 400) / 399);
  const fase = { id: 'pool', bpm: 120, duracaoBatidas: 60, dificuldade: 'facil', eventos: [] };
  for (let i = 0; i < 2000; i += 50) fase.eventos.push({ batida: 2, tipo: 'chuva', pos: pos.slice(i, i + 50), vel: 20, aviso: 1 });
  const comp = Patterns.compilar(fase, CONFIG.caixa);
  const at = new Patterns.Ataques(comp);
  at.reiniciar(1.5, { x: 0, y: 0 });
  at.atualizar(1.6, 0.016, { x: 0, y: 0 });
  assert.strictEqual(at.n, 2000);
  assert.strictEqual(at.estourou, 0);
});

test('teleguiada com curva faz o mesmo caminho em qualquer fps (B13)', () => {
  const fase = { id: 'guia', bpm: 120, duracaoBatidas: 20, dificuldade: 'facil',
    eventos: [{ batida: 2, tipo: 'teleguiada', de: 'cima', pos: -0.8, quantidade: 1, vel: 90, guia: 120, guiaDur: 3, aviso: 1 }] };
  const comp = Patterns.compilar(fase, CONFIG.caixa);
  const rodar = (fps) => {
    const at = new Patterns.Ataques(comp), alma = { x: 50, y: 20 };
    at.reiniciar(0, alma);
    for (let t = 0; t <= 2.6; t += 1 / fps) at.atualizar(t, 1 / fps, alma);
    at.atualizar(2.6, 0, alma);
    const o = at.vivos[0];
    return [o.x, o.y];
  };
  const [a, b, c] = [rodar(30), rodar(60), rodar(144)];
  for (const p of [b, c]) {
    assert.ok(Math.abs(p[0] - a[0]) < 1e-6 && Math.abs(p[1] - a[1]) < 1e-6, `${a} × ${p}`);
  }
});
