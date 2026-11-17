// 2000 projéteis de verdade (vários eventos de 50), CPU 4× mais lenta: custo de JS por frame.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  await page.addInitScript(() => {
    const orig = window.requestAnimationFrame.bind(window);
    window.__js = []; window.__ts = [];
    window.requestAnimationFrame = (cb) => orig((ts) => { const t0 = performance.now(); cb(ts); window.__js.push(performance.now() - t0); window.__ts.push(ts); });
  });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/?debug=1');
  await page.evaluate(() => document.querySelector('.debug-painel').classList.add('fechado'));
  await page.mouse.click(480, 270); await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r0 = await page.evaluate(() => {
    const ev = [];
    for (let k = 0; k < 40; k++) {
      const pos = []; for (let i = 0; i < 50; i++) pos.push(-1 + 2 * ((k * 50 + i) % 400) / 399);
      ev.push({ batida: 2 + k * 0.05, tipo: 'chuva', pos, vel: 22, aviso: 1 });
    }
    const f = { id: 'estresse2000', nome: 'Estresse', autor: 'x', dificuldade: 'facil', musica: 'despertar', bpm: 112, duracaoBatidas: 60, eventos: ev };
    Debug.invencivel = true; Game.jogar(f); Game.pular(0.1); window.__js.length = 0; window.__ts.length = 0;
    return { pool: Game.J.ataques.pool.length, avisos: Game.J.comp.avisos.length };
  });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => {
    const js = window.__js.slice(10).sort((a, b) => a - b), ts = window.__ts.slice(10);
    const dts = []; for (let i = 1; i < ts.length; i++) dts.push(ts[i] - ts[i - 1]);
    const media = (l) => l.reduce((a, b) => a + b, 0) / l.length;
    return { n: Game.J.ataques.n, estouros: Game.J.ataques.estourou, fps: 1000 / media(dts), media: media(js), p95: js[Math.floor(js.length * 0.95)], max: js[js.length - 1], lentos: dts.filter(d => d > 20).length, total: dts.length };
  });
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'dodge-estresse2000.png') });
  console.log(`pool ${r0.pool}, avisos ${r0.avisos} · ${r.n} projéteis na tela, estouros ${r.estouros} · ${r.fps.toFixed(1)} fps · JS/frame média ${r.media.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms, máx ${r.max.toFixed(1)} ms · frames > 20 ms: ${r.lentos}/${r.total}`);
  console.log('erros:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
