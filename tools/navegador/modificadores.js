// Modificadores da caixa no navegador: fotos de cada um no Laboratório, teclado e arrasto
// com a caixa girada/invertida, e nenhum erro no console.
// Uso: node tools/navegador/modificadores.js   (servidor ligado; DODGE_URL muda o endereço)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/?debug=1');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  await page.mouse.click(480, 270); await page.waitForTimeout(600);
  await page.evaluate(() => { Debug.invencivel = true; Game.jogar(Levels.LABORATORIO); });
  await page.waitForTimeout(300);
  const irPara = async (batida, espera) => {
    await page.evaluate((b) => Game.pular(b / Levels.LABORATORIO.duracaoBatidas), batida);
    await page.waitForTimeout(espera || 250);
  };
  const foto = async (nome) => {
    const arq = path.join(os.tmpdir(), `dodge-mod-${nome}.png`);
    await page.screenshot({ path: arq });
    return arq;
  };
  const estado = () => page.evaluate(() => {
    const e = Game.J.corrida.est, a = Game.J.corrida.alma;
    const c = Math.cos(e.rad), s = Math.sin(e.rad);
    return { batida: +Game.J.batida.toFixed(2), largura: +e.largura.toFixed(3), altura: +e.altura.toFixed(3), angulo: +e.angulo.toFixed(2),
      escuro: +e.escuro.toFixed(2), invX: e.invX, espelho: e.espelho, x: a.x, y: a.y, telaX: a.x * c - a.y * s, telaY: a.x * s + a.y * c };
  });
  const fotos = [];
  await irPara(107); fotos.push(await foto('1-encolhida')); console.log('encolhida:', JSON.stringify(await estado()));
  await irPara(114.6); fotos.push(await foto('2-girada-aviso-inverter')); console.log('girada:', JSON.stringify(await estado()));
  await irPara(119.4); fotos.push(await foto('3-invertida')); console.log('invertida:', JSON.stringify(await estado()));
  await irPara(128.6, 500); fotos.push(await foto('4-escuro')); console.log('escuro:', JSON.stringify(await estado()));
  await irPara(136.5); fotos.push(await foto('5-espelho')); console.log('espelho:', JSON.stringify(await estado()));

  // teclado: com x invertido, a seta pra direita leva a alma pra ESQUERDA na tela
  await irPara(117.2, 100);
  let a0 = await estado();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
  let a1 = await estado();
  console.log(`teclado invertido: tela x ${a0.telaX.toFixed(1)} → ${a1.telaX.toFixed(1)} (tem que diminuir)`);
  const tecladoOk = a1.telaX < a0.telaX - 10;

  // arrasto com a caixa girada (20°) e sem inversão: o mouse anda 60 px pra direita
  // na tela (×2 no navegador = 30 px lógicos) → a alma anda 30 px pra direita NA TELA
  await irPara(122.5, 150);
  a0 = await estado();
  const cx = 480, cy = 300;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(cx + i * 6, cy); await page.waitForTimeout(16); }
  await page.waitForTimeout(120);
  a1 = await estado();
  await page.mouse.up();
  const dX = a1.telaX - a0.telaX, dY = a1.telaY - a0.telaY;
  console.log(`arrasto girado (${a1.angulo}°): tela andou (${dX.toFixed(2)}, ${dY.toFixed(2)}) — esperado (30, 0)`);
  const arrastoOk = Math.abs(dX - 30) < 0.6 && Math.abs(dY) < 0.6;

  console.log('fotos:', fotos.join(' '));
  console.log('erros no console:', erros.length ? erros : 'nenhum');
  console.log(tecladoOk && arrastoOk && !erros.length ? 'OK' : 'FALHOU');
  await browser.close();
  process.exit(tecladoOk && arrastoOk && !erros.length ? 0 : 1);
})();
