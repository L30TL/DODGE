const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  await page.mouse.click(480, 270); await page.waitForTimeout(800);
  // erro dentro do loop (desenho), erro solto e promessa rejeitada
  await page.evaluate(() => {
    const T = UI.telas.titulo; let vezes = 0;
    const orig = Render.ataques;
    Render.ataques = function (...a) { if (vezes++ < 3) throw new Error('erro de teste no desenho'); return orig.apply(this, a); };
    setTimeout(() => { throw new Error('erro de teste solto'); }, 10);
    Promise.reject(new Error('promessa de teste'));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'dodge-erros-aviso.png') });
  const r = await page.evaluate(() => ({ n: Erros.lista.length, msgs: Erros.lista.map(e => `${e.msg} (${e.vezes}×, ${e.onde})`), jogo: Game.J.estado, t: Game.J.t }));
  console.log('registro:', JSON.stringify(r));
  // copiar pelo botão das configurações
  await page.evaluate(() => Game.irPara('config', { voltar: 'fases' }));
  await page.waitForTimeout(200);
  const btn = await page.evaluate(() => { const C = null; return true; });
  await page.mouse.click((50 + 170 + 30) * 2, (204 + 5) * 2);   // botão COPIAR
  await page.waitForTimeout(300);
  const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(e => 'falhou: ' + e.message);
  console.log('copiado (início):', JSON.stringify(copiado.slice(0, 160)));
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'dodge-erros-config.png') });
  await browser.close();
})();
