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

test('todas as fases oficiais são PROVADAS: o caminho do solver vence a simulação de verdade', { timeout: 180000 }, () => {
  const D = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'solver.js', 'debug.js']);
  for (const f of D.Levels.FASES) {
    assert.strictEqual(D.Patterns.validar(f).avisos.length, 0, `${f.id} tem avisos do validador`);
    const p = D.pegar('Solver').provar(f);
    assert.ok(p.ok, `${f.id} não provada (${p.morte ? 'morre na batida ' + p.morte.t / (60 / f.bpm) : 'sem caminho'})`);
  }
});

// ------------------------------------------------- modificadores da caixa --
const fase40 = (id, eventos) => ({ id, bpm: 120, duracaoBatidas: 40, dificuldade: 'facil', eventos });   // 1 batida = 0,5 s
const andar = (r, t0, t1, e) => { for (let t = t0; t <= t1 + 1e-9 && r.estado === 'jogando'; t += 1 / 60) r.passo(t, e); };

test('caixa encolhendo empurra a alma pra dentro', () => {
  const r = corridaDe(fase40('enc', [{ batida: 4, tipo: 'caixa', largura: 0.5, altura: 0.5, dur: 2 }]));
  andar(r, 0, 1.6, { dx: 1, dy: 1 });                         // vai pro canto
  assert.ok(Math.abs(r.alma.x - r.lim.x) < 1e-9 && Math.abs(r.alma.y - r.lim.y) < 1e-9);
  andar(r, 1.6, 4, parado);                                    // encolhe de 2 s a 3 s
  const m = CONFIG.alma.margemParede;
  assert.ok(Math.abs(r.alma.x - (CONFIG.caixa.largura / 4 - m)) < 1e-9, `x = ${r.alma.x}`);
  assert.ok(Math.abs(r.alma.y - (CONFIG.caixa.altura / 4 - m)) < 1e-9, `y = ${r.alma.y}`);
  // no meio da transição a caixa está entre os dois tamanhos
  r.reiniciar(2.5);
  assert.ok(r.est.largura > 0.5 && r.est.largura < 1);
});

test('controles invertidos: direita vira esquerda (só no eixo pedido)', () => {
  const r = corridaDe(fase40('inv', [{ batida: 2, tipo: 'inverter', x: true }]));
  andar(r, 0, 0.5, { dx: 1, dy: 1 });
  assert.ok(r.alma.x > 0 && r.alma.y > 0);
  r.reiniciar(1.5);
  andar(r, 1.5, 2, { dx: 1, dy: 1 });
  assert.ok(r.alma.x < 0, 'x invertido');
  assert.ok(r.alma.y > 0, 'y normal');
  // o arrasto passa pela mesma conversão
  const d = Sim.telaParaCaixa(r.est, 10, 4, {});
  assert.deepStrictEqual([d.x, d.y], [-10, 4]);
});

test('caixa girada: a seta continua indo pra direita NA TELA', () => {
  const r = corridaDe(fase40('gir', [{ batida: 2, tipo: 'girar', angulo: 90, dur: 0 }]));
  r.reiniciar(1.5);
  andar(r, 1.5, 2, { dx: 1, dy: 0 });
  // com a caixa girada 90°, a direita da tela é o "pra cima" da caixa
  const c = Math.cos(r.est.rad), s = Math.sin(r.est.rad);
  const telaX = r.alma.x * c - r.alma.y * s, telaY = r.alma.x * s + r.alma.y * c;
  assert.ok(telaX > 50, `tela x = ${telaX}`);
  assert.ok(Math.abs(telaY) < 1e-6, `tela y = ${telaY}`);
  // o bot manda direção já na caixa (local) e não é convertido
  r.reiniciar(1.5);
  andar(r, 1.5, 2, { dx: 1, dy: 0, local: true });
  assert.ok(r.alma.x > 50 && Math.abs(r.alma.y) < 1e-9);
});

test('espelho: o reflexo também morre (e a morte é no lugar do reflexo)', () => {
  const laser = { batida: 8, tipo: 'laser', pos: 0.5, orient: 'v', larg: 20, aviso: 2, dur: 1 };   // x = +72
  const jogar = (espelho) => {
    const ev = [laser];
    if (espelho) ev.push({ batida: 1, tipo: 'espelho', eixo: 'x' });
    const r = corridaDe(fase40('esp', ev));
    andar(r, 0, 5, { temAlvo: true, alvoX: -72, alvoY: 0 });  // a alma fica do lado ESQUERDO
    return r;
  };
  const sem = jogar(false);
  assert.strictEqual(sem.estado, 'jogando');
  const com = jogar(true);
  assert.strictEqual(com.estado, 'morto');
  assert.ok(Math.abs(com.morte.x - 72) < 1e-6, `morreu em x = ${com.morte.x}`);
  assert.ok(Math.abs(com.morte.t - 4) < 0.02);
  // desligar o espelho volta ao normal
  const r = corridaDe(fase40('esp2', [laser, { batida: 1, tipo: 'espelho', eixo: 'x' }, { batida: 6, tipo: 'espelho', ativo: false }]));
  andar(r, 0, 5, { temAlvo: true, alvoX: -72, alvoY: 0 });
  assert.strictEqual(r.estado, 'jogando');
});

test('o analisador entende a caixa encolhida, o empurrão da parede e o espelho', { timeout: 120000 }, () => {
  const D = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'solver.js', 'debug.js']).pegar('Debug');
  const meio = { batida: 8, tipo: 'laser', pos: 0, orient: 'v', larg: 60, aviso: 2, dur: 1 };   // |x| < ~31
  assert.ok(D.analisar(fase40('a1', [meio])).ok, 'caixa normal: dá pra fugir pro lado');
  const a2 = D.analisar(fase40('a2', [{ batida: 2, tipo: 'caixa', largura: 0.2, dur: 0 }, meio]));
  assert.ok(!a2.ok, 'caixa estreita: o laser cobre tudo');
  // o centro é proibido e logo depois a caixa fecha de uma vez: a parede empurra a alma, não mata
  const empurra = fase40('a3', [
    { batida: 4, tipo: 'laser', pos: 0, orient: 'v', larg: 120, aviso: 2, dur: 4 },
    { batida: 8.1, tipo: 'caixa', largura: 0.3, dur: 0 },                  // fecha logo depois que o laser apaga
  ]);
  assert.ok(D.analisar(empurra).ok, 'empurrão da parede');
  const r = corridaDe(empurra);
  andar(r, 0, 6, { dx: 1, dy: 0 });
  assert.strictEqual(r.estado, 'jogando');
  // com espelho, o lado direito (o único seguro) tem o reflexo no lado esquerdo (todo coberto)
  const lasers = [
    { batida: 8, tipo: 'laser', pos: -0.5, orient: 'v', larg: 120, aviso: 2, dur: 1 },
    { batida: 8, tipo: 'laser', pos: 0, orient: 'v', larg: 20, aviso: 2, dur: 1 },
    { batida: 8, tipo: 'laser', pos: -0.95, orient: 'v', larg: 20, aviso: 2, dur: 1 },
  ];
  assert.ok(D.analisar(fase40('a4', lasers)).ok, 'sem espelho: vai pra direita');
  assert.ok(!D.analisar(fase40('a5', lasers.concat([{ batida: 1, tipo: 'espelho', eixo: 'x' }]))).ok, 'com espelho: impossível');
  // caixa girada não muda o que é possível (só anda um pouco mais devagar no teclado)
  assert.ok(D.analisar(fase40('a6', [{ batida: 1, tipo: 'girar', angulo: 30, dur: 2 }, meio])).ok);
});

test('parede: a hitbox é menor que o desenho (folga), como nas balas (B25)', () => {
  // paredes fecham deixando um corredor de 70 px no meio (bordas em x = ±35)
  const f = { id: 'b25', bpm: 120, duracaoBatidas: 20, eventos: [{ batida: 2, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 70, fechar: 1, segurar: 2, abrir: 1, aviso: 2 }] };
  const borda = 35 - CONFIG.alma.raioHitbox + CONFIG.ataques.folgaHitbox;   // até onde a alma pode chegar
  const jogar = (x) => {
    const r = corridaDe(f);
    r.reiniciar(0, x, 0);
    for (let t = 0; t < 4; t += 1 / 60) r.passo(t, parado);
    return r.estado;
  };
  assert.strictEqual(jogar(-(borda - 0.3)), 'jogando', '0,3 px antes da hitbox: vive');
  assert.strictEqual(jogar(-(borda + 0.3)), 'morto', '0,3 px além da hitbox: morre');
});
