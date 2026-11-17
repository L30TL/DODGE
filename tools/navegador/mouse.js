// Mouse: a bolinha tem que andar exatamente o que o cursor anda (1:1), sem atraso acumulado.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });   // 2 px de tela = 1 px lógico
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/?debug=1');
  await page.mouse.click(480, 270); await page.waitForTimeout(300);
  await page.evaluate(() => { Debug.invencivel = true; Game.jogar(Levels.FASES[0]); });
  await page.waitForTimeout(400);
  const pos = () => page.evaluate(() => ({ x: Game.alma.x, y: Game.alma.y }));
  const teste = async (nome, passos, dx, dy, intervalo) => {
    const p0 = await pos();
    await page.mouse.move(400, 300); await page.mouse.down();
    for (let i = 1; i <= passos; i++) { await page.mouse.move(400 + dx * i / passos, 300 + dy * i / passos); if (intervalo) await page.waitForTimeout(intervalo); }
    await page.waitForTimeout(120);
    const p1 = await pos();
    await page.mouse.up(); await page.waitForTimeout(60);
    console.log(`${nome}: cursor andou (${dx / 2}, ${dy / 2}) px do jogo → bolinha andou (${(p1.x - p0.x).toFixed(1)}, ${(p1.y - p0.y).toFixed(1)})`);
  };
  await teste('arrasto lento', 20, 120, 60, 16);
  await teste('puxão rápido ', 1, -200, -40, 0);
  await teste('volta        ', 10, 80, 40, 16);
  // contra a parede: empurra 200 px além da borda e volta 40: a bolinha tem que voltar 40 na hora
  await page.evaluate(() => { Game.J.corrida.alma.x = 100; });
  await page.waitForTimeout(50);
  const a0 = await pos();
  await page.mouse.move(420, 300); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(420 + 40 * i, 300); await page.waitForTimeout(16); }
  await page.waitForTimeout(100);
  const naParede = await pos();
  for (let i = 1; i <= 5; i++) { await page.mouse.move(820 - 16 * i, 300); await page.waitForTimeout(16); }
  await page.waitForTimeout(100);
  const voltou = await pos();
  await page.mouse.up();
  console.log(`parede: bolinha em x=${a0.x.toFixed(0)} → encostou em ${naParede.x.toFixed(1)}; cursor voltou 40 px do jogo → bolinha em ${voltou.x.toFixed(1)} (voltou ${(naParede.x - voltou.x).toFixed(1)})`);
  console.log('erros:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
