// Simulação pura: morte, vitória, %, determinismo e entradas malucas.
const test = require('node:test');
const assert = require('node:assert');
const { carregar, aleatorio } = require('./carregar');

const { Patterns, Sim, Levels, CONFIG } = carregar();
const corridaDe = (fase) => new Sim.Corrida(Patterns.compilar(fase, CONFIG.caixa));
const parado = { dx: 0, dy: 0 };

test('morrer no instante em que a fase acaba conta como vitória (B01)', () => {
  // laser no meio da caixa ligando EXATAMENTE na última batida
  const fase = { id: 'b01', bpm: 120, duracaoBatidas: 20, dificuldade: 'facil', eventos: [{ batida: 20, tipo: 'laser', pos: 0, orient: 'v', aviso: 2, dur: 4 }] };
  const r = corridaDe(fase);
  r.reiniciar(9.9);
  r.passo(10.05, parado);              // frame que passa do fim
  assert.strictEqual(r.estado, 'vitoria');
});

test('o % da morte é o do instante da colisão, não o do fim do frame (B09)', () => {
  // laser no centro liga na batida 10 (t = 5 s) de uma fase de 20 batidas (10 s) → 50%
  const fase = { id: 'b09', bpm: 120, duracaoBatidas: 20, dificuldade: 'facil', eventos: [{ batida: 10, tipo: 'laser', pos: 0, orient: 'v', aviso: 2, dur: 1 }] };
  const r = corridaDe(fase);
  r.reiniciar(4.9);
  r.passo(5.05, parado);
  assert.strictEqual(r.estado, 'morto');
  assert.ok(Math.abs(r.morte.t - 5) < 0.02, `morreu em ${r.morte.t}`);
  assert.strictEqual(r.morte.pct, 50);
  // e nunca mostra 100% numa morte
  assert.strictEqual(r.pctDe(10), 99);
});

test('mesma fase + mesma entrada = mesmo resultado (determinismo)', () => {
  const fase = Levels.FASES[1];
  const jogar = () => {
    const r = corridaDe(fase), rnd = aleatorio(99);
    let dir = { dx: 0, dy: 0 };
    for (let t = 0; t < 70 && r.estado === 'jogando'; t += 1 / 60) {
      if (rnd() < 0.05) dir = { dx: Math.round(rnd() * 2 - 1), dy: Math.round(rnd() * 2 - 1) };
      r.passo(t, dir);
    }
    return [r.estado, r.t, r.alma.x, r.alma.y, r.raspoes].join('|');
  };
  assert.strictEqual(jogar(), jogar());
});

test('entradas malucas nunca deixam a alma em NaN nem fora da caixa (B15)', () => {
  const r = corridaDe(Levels.FASES[0]);
  r.invencivel = true;
  const rnd = aleatorio(3);
  const lixo = [NaN, Infinity, -Infinity, 1e300, -1e300, 0, 1, -1, undefined, null, 'x'];
  for (let i = 0; i < 3000; i++) {
    const e = { dx: lixo[i % lixo.length], dy: lixo[(i * 7) % lixo.length], temAlvo: rnd() < 0.5,
      alvoX: lixo[(i * 3) % lixo.length], alvoY: lixo[(i * 5) % lixo.length] };
    const t = rnd() < 0.05 ? lixo[i % lixo.length] : i / 60;
    r.passo(t, e);
    assert.ok(Number.isFinite(r.alma.x) && Number.isFinite(r.alma.y), `passo ${i}`);
    assert.ok(Math.abs(r.alma.x) <= r.lim.x + 1e-9 && Math.abs(r.alma.y) <= r.lim.y + 1e-9);
    assert.ok(Number.isFinite(r.t));
  }
});

test('o dedo/mouse leva a alma exatamente até o alvo (sem perder movimento)', () => {
  const fase = { id: 'livre', bpm: 120, duracaoBatidas: 40, dificuldade: 'facil', eventos: [] };
  const r = corridaDe(fase);
  r.passo(0.5, { temAlvo: true, alvoX: 60, alvoY: -30 });
  assert.ok(Math.abs(r.alma.x - 60) < 1e-9 && Math.abs(r.alma.y + 30) < 1e-9);
  // longe demais pra um frame: anda no máximo a velocidade máxima, depois chega
  r.passo(0.5 + 1 / 60, { temAlvo: true, alvoX: -100, alvoY: -30 });
  assert.ok(r.alma.x > -100 && r.alma.x < 60);
  for (let t = 0.55; t < 0.8; t += 1 / 60) r.passo(t, { temAlvo: true, alvoX: -100, alvoY: -30 });
  assert.ok(Math.abs(r.alma.x + 100) < 1e-9, `x = ${r.alma.x}`);
});

test('raspão e moeda contam uma vez só', () => {
  const fase = { id: 'rm', bpm: 120, duracaoBatidas: 40, dificuldade: 'facil', eventos: [
    { batida: 4, tipo: 'chuva', pos: 0.05, vel: 100, aviso: 1 },          // passa raspando na alma (x≈7 px)
    { batida: 1, tipo: 'moeda', x: 0, y: 0, dur: 4, id: 1 },               // moeda em cima da alma
  ] };
  const r = corridaDe(fase);
  for (let t = 0; t < 6; t += 1 / 60) r.passo(t, parado);
  assert.strictEqual(r.estado, 'jogando');
  assert.strictEqual(r.raspoes, 1);
  assert.deepStrictEqual(Array.from(r.moedas), [false, true, false]);
});

test('todas as fases oficiais compilam sem avisos e são vencíveis pelo analisador', { timeout: 120000 }, () => {
  const D = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'debug.js']);
  for (const f of D.Levels.FASES) {
    const a = D.pegar('Debug').analisar(f);
    assert.ok(a.ok, `${f.id} impossível em ${a.morreuEm}`);
  }
});
