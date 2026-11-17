// Modo infinito: os trechos gerados são válidos, caem na batida, não cruzam a virada da música
// e são POSSÍVEIS (o solver confere), ficando mais apertados a cada volta.
const test = require('node:test');
const assert = require('node:assert');
const { carregar } = require('./carregar');

const m = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'solver.js', 'infinito.js']);
const I = m.pegar('Infinito'), S = m.pegar('Solver'), C = m.CONFIG;
const info = { bpm: 128, batidas: 160 };

test('infinito: mesma semente = mesmo trecho; tudo válido, na batida e antes da virada', () => {
  assert.strictEqual(JSON.stringify(I.segmento(7, 3, info)), JSON.stringify(I.segmento(7, 3, info)));
  assert.notStrictEqual(JSON.stringify(I.segmento(7, 3, info)), JSON.stringify(I.segmento(8, 3, info)));
  for (let sem = 1; sem <= 5; sem++) for (let k = 0; k < 10; k++) {
    const f = I.segmento(sem, k, info);
    assert.strictEqual(m.Patterns.validar(f).avisos.length, 0, `semente ${sem} volta ${k}`);
    for (const ev of f.eventos) {
      assert.ok(Number.isInteger(ev.batida), `batida ${ev.batida}`);
      assert.ok(ev.batida < info.batidas - C.infinito.folgaFim + 1e-9, `batida ${ev.batida} perto da virada`);
    }
  }
});

test('infinito: os trechos são possíveis, e cada volta é mais apertada', { timeout: 120000 }, () => {
  for (const sem of [11, 12]) {
    let antes = 2;
    for (const k of [0, 2, 5]) {
      const a = S.analisar(I.segmento(sem, k, info));
      assert.ok(a.ok, `semente ${sem} volta ${k} impossível na batida ${a.morreuEm / (60 / 128)}`);
      assert.ok(a.minFrac <= antes + 0.05, `volta ${k} não ficou mais difícil (${a.minFrac} > ${antes})`);
      antes = a.minFrac;
    }
  }
});
