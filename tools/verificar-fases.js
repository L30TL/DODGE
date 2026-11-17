// =============================================================================
// DODGE — tools/verificar-fases.js
// Prova que cada fase é vencível e mostra os trechos mais apertados.
// Uso:  node tools/verificar-fases.js            (todas as fases)
//       node tools/verificar-fases.js despertar  (só uma)
// Simula todas as posições que a alma consegue alcançar (teclado, grade de 2 px).
// Se em algum momento não sobra nenhuma posição segura, a fase é impossível.
// =============================================================================
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Uint8Array, Float32Array, Array, Object, JSON, Infinity, performance: { now: () => Date.now() } });
for (const f of ['config.js', 'patterns.js', 'sim.js', 'levels.js', 'solver.js', 'debug.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
}
const ids = process.argv.slice(2);
const fases = vm.runInContext('Levels.FASES.concat([Levels.LABORATORIO])', ctx).filter(f => ids.length ? ids.includes(f.id) : !f.debug);
let falhou = false;
for (const fase of fases) {
  const t0 = Date.now();
  const a = vm.runInContext('Debug.analisar', ctx)(fase);
  const barra = a.porBatida.map(f => (f === undefined ? ' ' : f < 0.05 ? '█' : f < 0.12 ? '▓' : f < 0.25 ? '▒' : f < 0.45 ? '░' : '·')).join('');
  console.log(`\n${fase.nome} (${fase.dificuldade}) — ${a.specs} projéteis, ${a.duracao.toFixed(1)} s, ${Date.now() - t0} ms`);
  console.log(a.ok ? '  VENCÍVEL ✓' : `  IMPOSSÍVEL ✗ em ${a.morreuEm.toFixed(2)} s (batida ${(a.morreuEm / (60 / fase.bpm)).toFixed(1)})`);
  console.log(`  área segura mínima: ${(a.minFrac * 100).toFixed(1)}% da caixa, na batida ${a.batidaMin.toFixed(1)} (${a.pctMin.toFixed(0)}%)`);
  if (a.avisosCurtos.length) console.log('  avisos curtos:', a.avisosCurtos.slice(0, 8).map(x => `b${x.batida}:${x.aviso.toFixed(2)}s`).join(' '));
  console.log('  aperto por batida (· folgado  ░ ▒ ▓ █ apertado):');
  for (let i = 0; i < barra.length; i += 64) console.log('  ' + String(i).padStart(4) + ' ' + barra.slice(i, i + 64));
  const bots = [0.15, 0.25, 0.35].map(r => ({ r, res: vm.runInContext('Debug.simularBot', ctx)(fase, r) }));
  console.log('  bot (tempo de reação): ' + bots.map(({ r, res }) => `${Math.round(r * 1000)} ms → ${res.venceu ? 'venceu' : 'morreu em ' + res.pct + '% (batida ' + res.batida.toFixed(1) + ')'}`).join(' · '));
  if (process.env.DETALHE) for (const { r, res } of bots) if (!res.venceu) console.log(`    ${Math.round(r * 1000)} ms: alma em (${res.x.toFixed(0)}, ${res.y.toFixed(0)}) atingida por`, JSON.stringify(res.ev));
  if (!a.ok) falhou = true;
}
process.exit(falhou ? 1 : 0);
