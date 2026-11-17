// =============================================================================
// DODGE — tools/estresse-infinito.js
// Modo infinito rodando 30 minutos de jogo (24 voltas da música) com entradas
// aleatórias e malucas, na simulação de verdade: nenhum erro, nenhum NaN, nada
// sai da caixa, pool sem estourar. Uso: node tools/estresse-infinito.js [minutos] [semente]
// =============================================================================
const { carregar, aleatorio } = require('../tests/carregar');
const m = carregar(['config.js', 'patterns.js', 'sim.js', 'levels.js', 'infinito.js']);
const minutos = +process.argv[2] || 30, semente = +process.argv[3] || 7;
const I = m.pegar('Infinito'), info = { bpm: 128, batidas: 160 };
const rnd = aleatorio(semente);
const lixo = [NaN, Infinity, -Infinity, 1e300, undefined, null, 'x'];
let k = 0, total = 0, quadros = 0, piorPool = 0, eventos = 0;
const t0 = Date.now();
let seg = I.segmento(semente, 0, info);
let r = new m.Sim.Corrida(m.Patterns.compilar(seg, m.CONFIG.caixa));
r.invencivel = true;
let dir = { dx: 0, dy: 0 };
const falhas = [];
while (total < minutos * 60) {
  for (let t = 0; r.estado === 'jogando'; t += 1 / 60) {
    quadros++;
    if (rnd() < 0.05) dir = { dx: Math.round(rnd() * 2 - 1), dy: Math.round(rnd() * 2 - 1) };
    const e = rnd() < 0.002 ? { dx: lixo[quadros % lixo.length], dy: lixo[(quadros * 3) % lixo.length], temAlvo: true, alvoX: lixo[(quadros * 5) % lixo.length], alvoY: 3 }
      : rnd() < 0.3 ? { temAlvo: true, alvoX: rnd() * 400 - 200, alvoY: rnd() * 300 - 150 } : dir;
    const tt = rnd() < 0.001 ? t + rnd() * 0.5 : t;            // engasgo de frame de vez em quando
    eventos += r.passo(tt, e).length;
    const a = r.alma;
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || Math.abs(a.x) > r.lim.x + 1e-6 || Math.abs(a.y) > r.lim.y + 1e-6) {
      falhas.push(`volta ${k + 1}, t ${t.toFixed(2)}: alma em (${a.x}, ${a.y})`); break;
    }
    piorPool = Math.max(piorPool, r.at.n);
    if (t > r.c.duracao + 5) { falhas.push(`volta ${k + 1} não terminou`); break; }
  }
  if (falhas.length) break;
  total += r.c.duracao;
  // a música deu a volta: trecho novo, a alma continua de onde está
  k++;
  const x = r.alma.x, y = r.alma.y;
  seg = I.segmento(semente, k, info);
  r = new m.Sim.Corrida(m.Patterns.compilar(seg, m.CONFIG.caixa));
  r.invencivel = true;
  r.reiniciar(0, x, y);
}
const ms = Date.now() - t0;
console.log(`infinito: ${(total / 60).toFixed(1)} min de jogo em ${k} voltas, ${quadros} quadros, ${eventos} eventos, pool no máximo ${piorPool} vivos, ${(ms / 1000).toFixed(1)} s de CPU`);
console.log(falhas.length ? 'FALHOU: ' + falhas.join(' | ') : 'OK: nenhum erro, nenhum NaN, nada fora da caixa');
process.exit(falhas.length ? 1 : 0);
