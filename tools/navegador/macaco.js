// "Macaco": toques, arrastos, teclas e roda aleatórios em todas as telas por N segundos.
// Nada pode dar erro no console, e o estado do jogo nunca vira NaN.
// Uso: node tools/navegador/macaco.js [segundos] [semente]   (servidor ligado)
const { chromium } = require('playwright');
(async () => {
  const segundos = +process.argv[2] || 45, semente = +process.argv[3] || 3;
  let s = semente;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, locale: 'pt-BR', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('dialog', d => d.dismiss());
  await page.addInitScript(() => { if (!sessionStorage.getItem('ok')) { sessionStorage.setItem('ok', '1'); localStorage.clear(); } });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/'); await page.waitForTimeout(300);
  const teclas = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Escape', 'KeyP', 'KeyR', 'KeyC', 'KeyV', 'KeyT', 'KeyM',
    'Delete', 'Home', 'End', 'Equal', 'Minus', 'KeyZ', 'F3', 'KeyH', 'KeyI', 'KeyS', 'Digit5'];
  const telas = [['fases', {}], ['criadas', {}], ['visual', {}], ['missoes', {}], ['config', { voltar: 'fases' }]];
  const fim = Date.now() + segundos * 1000;
  let acoes = 0, nans = 0;
  while (Date.now() < fim) {
    const x = rnd();
    try {
      if (await page.evaluate(() => EntradaTexto.aberta())) { await page.keyboard.press(rnd() < 0.5 ? 'Escape' : 'Enter'); continue; }
      if (x < 0.4) await page.mouse.click(rnd() * 960, rnd() * 540);
      else if (x < 0.55) {
        const x0 = rnd() * 960, y0 = rnd() * 540;
        await page.mouse.move(x0, y0); await page.mouse.down();
        for (let i = 0; i < 5; i++) await page.mouse.move(x0 + (rnd() - 0.5) * 300, y0 + (rnd() - 0.5) * 200);
        await page.mouse.up();
      } else if (x < 0.8) {
        const k = teclas[Math.floor(rnd() * teclas.length)];
        await page.keyboard.press(rnd() < 0.1 ? 'Control+' + (rnd() < 0.5 ? 'z' : 'y') : k);
      } else if (x < 0.9) await page.mouse.wheel((rnd() - 0.5) * 400, (rnd() - 0.5) * 400);
      else if (x < 0.95) { const [t, a] = telas[Math.floor(rnd() * telas.length)]; await page.evaluate(([t, a]) => Game.irPara(t, a), [t, a]); }
      else await page.evaluate(() => { if (Criadas.lista().length) Game.irPara('editor', { fase: Criadas.lista()[0] }); });
      acoes++;
      if (acoes % 20 === 0) {
        const ok = await page.evaluate(() => [Game.J.t, Game.J.prog, Game.alma.x, Game.alma.y].every(v => Number.isFinite(v)));
        if (!ok) nans++;
      }
    } catch (e) { erros.push('playwright: ' + e.message.split('\n')[0]); }
  }
  console.log(`macaco: ${acoes} ações em ${segundos} s, estados com NaN: ${nans}, erros: ${erros.length}`);
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  await browser.close();
  process.exit(erros.length || nans ? 1 : 0);
})();
