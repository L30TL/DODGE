// Modos da alma (portais): gravidade, trilhos, escudo, gelo, mini. Física pura e determinística.
const test = require('node:test');
const assert = require('node:assert');
const { carregar } = require('./carregar');

const { Patterns, Sim, CONFIG } = carregar();
const fase = (eventos, batidas) => ({ id: 'm', bpm: 120, duracaoBatidas: batidas || 40, eventos });   // 1 batida = 0,5 s
const corrida = (f) => new Sim.Corrida(Patterns.compilar(f, CONFIG.caixa));
const rodar = (r, t0, t1, ent) => { for (let t = t0; t <= t1 + 1e-9 && r.estado === 'jogando'; t += 1 / 60) r.passo(t, typeof ent === 'function' ? ent(t) : ent); };
const nada = {};

test('gravidade: cai até o chão, pula ~pulo²/2g e cai de novo; gravidade pra cima cai pro teto', () => {
  const G = CONFIG.modos.gravidade;
  const r = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'gravidade', aviso: 0 }]));
  rodar(r, 0, 1.2, nada);
  assert.ok(r.alma.chao && Math.abs(r.alma.y - r.lim.y) < 1e-9, `no chão (y = ${r.alma.y})`);
  let alto = r.alma.y;
  rodar(r, 1.2, 2.2, (t) => ({ pulo: t < 1.22 }));
  // a altura do pulo (discreto a 60 fps) fica perto do teórico
  const r2 = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'gravidade', aviso: 0 }]));
  rodar(r2, 0, 1.2, nada);
  let min = Infinity;
  rodar(r2, 1.2, 2.2, (t) => { min = Math.min(min, r2.alma.y); return { pulo: t < 1.22 }; });
  const altura = r2.lim.y - min, teorico = G.pulo * G.pulo / (2 * G.g);
  assert.ok(Math.abs(altura - teorico) < 6, `pulou ${altura.toFixed(1)} px (teórico ${teorico.toFixed(1)})`);
  assert.ok(r2.alma.chao, 'voltou pro chão');
  const cima = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'gravidade', lado: 'cima', aviso: 0 }]));
  rodar(cima, 0, 1.2, nada);
  assert.ok(cima.alma.chao && Math.abs(cima.alma.y + cima.lim.y) < 1e-9, 'gravidade pra cima: "chão" é o teto');
});

test('gravidade: plataforma segura quem cai em cima, deixa passar por baixo, e some no fim', () => {
  // plataforma larga no meio, de 2 s a 6 s
  const f = fase([{ batida: 0, tipo: 'modo', modo: 'gravidade', aviso: 0 }, { batida: 4, tipo: 'plataforma', x: 0, y: 0, larg: 120, dur: 8, aviso: 1 }]);
  const r = corrida(f);
  r.reiniciar(2.2, 0, -60);                        // começa acima da plataforma
  rodar(r, 2.2, 3.2, nada);
  assert.ok(r.alma.chao && Math.abs(r.alma.y - (0 - CONFIG.alma.margemParede)) < 1e-6, `em cima da plataforma (y = ${r.alma.y})`);
  rodar(r, 3.2, 7, nada);                          // a plataforma some em 6 s: cai pro chão
  assert.ok(Math.abs(r.alma.y - r.lim.y) < 1e-9, 'caiu quando a plataforma sumiu');
  // plataforma baixa (64 px abaixo do centro): do chão, pula através dela e cai em cima
  const f2 = fase([{ batida: 0, tipo: 'modo', modo: 'gravidade', aviso: 0 }, { batida: 4, tipo: 'plataforma', x: 0, y: 0.7, larg: 120, dur: 8, aviso: 1 }]);
  const b = corrida(f2);
  b.reiniciar(2.2, 0, b.lim.y);
  rodar(b, 2.2, 2.3, nada);
  assert.ok(b.alma.chao, 'no chão');
  let min = Infinity;
  rodar(b, 2.3, 3.3, (t) => { min = Math.min(min, b.alma.y); return { pulo: t < 2.35 }; });
  const topo = 0.7 * 92 - CONFIG.alma.margemParede;
  assert.ok(min < topo - 10, `subiu através dela (chegou em y = ${min.toFixed(1)})`);
  assert.ok(b.alma.chao && Math.abs(b.alma.y - topo) < 1e-6, `e caiu em cima (y = ${b.alma.y.toFixed(1)})`);
});

test('trilhos: entra no trilho mais perto, troca deslizando e não passa das pontas', () => {
  const r = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'trilhos', linhas: 3, aviso: 0 }]));
  r.reiniciar(0, 0, 20);
  rodar(r, 0, 0.5, nada);
  const ys = r.trilhosY();
  assert.strictEqual(r.alma.y, ys[1]);
  rodar(r, 0.5, 1, (t) => ({ trilho: t < 0.51 ? 1 : 0 }));
  assert.strictEqual(r.alma.y, ys[2]);
  rodar(r, 1, 1.5, (t) => ({ trilho: t < 1.01 ? 1 : 0 }));
  assert.strictEqual(r.alma.y, ys[2], 'já estava na última');
  rodar(r, 1.5, 2, { dx: 1 });
  assert.ok(r.alma.x > 50 && r.alma.y === ys[2], 'anda pros lados no trilho');
});

test('escudo: a alma vai pro centro; bloqueia o que vem do lado do escudo, e morre do outro lado', () => {
  const tiro = { batida: 4, tipo: 'chuva', pos: 0, de: 'direita', vel: 150, aviso: 2 };
  const jogar = (lado) => {
    const r = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'escudo', aviso: 0 }, tiro]));
    r.reiniciar(0, 40, 30);
    let bloqueios = 0;
    for (let t = 0; t <= 4 && r.estado === 'jogando'; t += 1 / 60) bloqueios += r.passo(t, { escudo: lado }).filter(e => e.tipo === 'bloqueio').length;
    return { r, bloqueios };
  };
  const certo = jogar(1);
  assert.strictEqual(certo.r.estado, 'jogando');
  assert.strictEqual(certo.bloqueios, 1);
  assert.ok(Math.hypot(certo.r.alma.x, certo.r.alma.y) < 1e-6, 'no centro');
  assert.strictEqual(jogar(3).r.estado, 'morto', 'escudo virado pro outro lado');
});

test('gelo: acelera aos poucos, desliza depois de soltar (até com frame sem tempo) e quica mais devagar', () => {
  const r = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'gelo', aviso: 0 }]));
  r.passo(0, nada);
  r.passo(1 / 60, { dx: 1 });
  assert.ok(r.alma.vx > 0 && r.alma.vx < CONFIG.alma.velocidade / 2, 'começa devagar');
  rodar(r, 2 / 60, 0.6, { dx: 1 });
  const solto = r.alma.x;
  rodar(r, 0.6, 0.7, nada);
  assert.ok(r.alma.x > solto + 5, 'continua deslizando sem apertar nada');
  rodar(r, 0.7, 3, { dx: 1 });
  assert.ok(r.alma.x <= r.lim.x + 1e-9, 'não sai da caixa');
  const r2 = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'gelo', aviso: 0 }]));
  r2.reiniciar(0, r2.lim.x - 2, 0);
  r2.alma.vx = 200;
  r2.passo(0, nada); r2.passo(1 / 60, nada); r2.passo(2 / 60, nada);
  assert.ok(r2.alma.vx < 0 && Math.abs(r2.alma.vx) < 200 * CONFIG.modos.gelo.quique + 1, `quicou (vx = ${r2.alma.vx.toFixed(1)})`);
});

test('mini: hitbox menor (passa onde a normal morre) e mais rápida', () => {
  // bala de 8 px passando a 5 px do centro
  const tiro = { batida: 4, tipo: 'chuva', pos: 5 / 144, de: 'cima', vel: 150, aviso: 2 };
  const normal = corrida(fase([tiro])), mini = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'mini', aviso: 0 }, tiro]));
  rodar(normal, 0, 4, nada); rodar(mini, 0, 4, nada);
  assert.strictEqual(normal.estado, 'morto');
  assert.strictEqual(mini.estado, 'jogando');
  const a = corrida(fase([])), b = corrida(fase([{ batida: 0, tipo: 'modo', modo: 'mini', aviso: 0 }]));
  rodar(a, 0, 0.3, { dx: 1 }); rodar(b, 0, 0.3, { dx: 1 });
  assert.ok(Math.abs(b.alma.x / a.alma.x - CONFIG.modos.mini.vel) < 0.02);
});

test('portal: troca de modo na batida certa e volta pro livre; determinístico', () => {
  const f = fase([{ batida: 4, tipo: 'modo', modo: 'gravidade', aviso: 1 }, { batida: 8, tipo: 'modo', modo: 'livre', aviso: 1 }]);
  const r = corrida(f);
  rodar(r, 0, 1.9, nada);
  assert.strictEqual(r.modo, 'livre');
  rodar(r, 1.9, 2.1, nada);
  assert.strictEqual(r.modo, 'gravidade');
  rodar(r, 2.1, 4.1, nada);
  assert.strictEqual(r.modo, 'livre');
  const jogar = () => { const x = corrida(f); rodar(x, 0, 6, (t) => ({ dx: Math.sin(t * 3), pulo: (t * 10 | 0) % 7 === 0 })); return [x.alma.x, x.alma.y].join(); };
  assert.strictEqual(jogar(), jogar());
  assert.strictEqual(Patterns.validar(f).avisos.length, 0);
});

test('solver: a busca com a física de verdade prova uma fase de cada modo e recusa a impossível', { timeout: 120000 }, () => {
  const S = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'solver.js']).pegar('Solver');
  const portal = (modo, extra) => Object.assign({ batida: 0.5, tipo: 'modo', modo, aviso: 0 }, extra || {});
  const casos = {
    gravidade: [portal('gravidade'), { batida: 8, tipo: 'laser', pos: 0.85, orient: 'h', larg: 16, aviso: 3, dur: 0.5 }, { batida: 14, tipo: 'chuva', pos: [-0.2, 0.2], de: 'cima', aviso: 2 }],
    gelo: [portal('gelo'), { batida: 8, tipo: 'laser', pos: 0, orient: 'v', larg: 60, aviso: 3, dur: 2 }],
    trilhos: [portal('trilhos'), { batida: 8, tipo: 'laser', pos: 0, orient: 'h', larg: 20, aviso: 2, dur: 2 }],
    escudo: [portal('escudo'), { batida: 8, tipo: 'chuva', pos: 0, de: 'direita', aviso: 2 }, { batida: 12, tipo: 'chuva', pos: 0, de: 'cima', aviso: 2 }],
  };
  for (const [nome, ev] of Object.entries(casos)) {
    const f = { id: nome, bpm: 120, duracaoBatidas: 24, eventos: ev };
    assert.ok(S.precisaBusca(f), nome);
    const p = S.provar(f);
    assert.ok(p.ok && p.busca, `${nome}: não provada (batida ${p.analise.morreuEm / 0.5})`);
  }
  const impossivel = { id: 'x', bpm: 120, duracaoBatidas: 24, eventos: [portal('escudo'),
    { batida: 8, tipo: 'chuva', pos: 0, de: 'direita', aviso: 2 }, { batida: 8, tipo: 'chuva', pos: 0, de: 'esquerda', aviso: 2 }] };
  assert.ok(!S.provar(impossivel).ok, 'tiros dos dois lados ao mesmo tempo: o escudo não segura');
});
