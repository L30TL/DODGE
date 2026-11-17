// Modos da alma no navegador: uma fase de teste com portais pra cada modo; controla com teclado
// e com o "dedo" (mouse), tira fotos e confere que cada modo responde. Sem erros no console.
// Uso: node tools/navegador/modos.js [pasta das fotos]   (servidor ligado)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const PASTA = process.argv[2] || os.tmpdir();
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/'); await page.waitForTimeout(300);
  await page.mouse.click(480, 270); await page.waitForTimeout(400);
  const falhas = [];
  const conferir = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHOU ') + msg); if (!ok) falhas.push(msg); };
  const foto = (n) => page.screenshot({ path: path.join(PASTA, `modo-${n}.png`) });
  // fase sem ataques: cada modo por 8 batidas (112 BPM)
  const jogarModo = async (modo, extra) => {
    await page.evaluate(([m, ex]) => {
      const ev = [Object.assign({ batida: 0.5, tipo: 'modo', modo: m, aviso: 0 }, ex || {})];
      if (m === 'gravidade') ev.push({ batida: 2, tipo: 'plataforma', x: 0.4, y: 0.3, larg: 70, dur: 30, aviso: 1 });
      Debug.invencivel = true;
      Game.jogar({ id: 'modos-' + m, nome: 'Modos', autor: '', dificuldade: 'facil', musica: 'despertar', bpm: 112, duracaoBatidas: 60, eventos: ev });
    }, [modo, extra]);
    await page.waitForTimeout(900);
  };
  const est = () => page.evaluate(() => { const r = Game.J.corrida; return { modo: r.modo, x: r.alma.x, y: r.alma.y, chao: r.alma.chao, trilho: r.alma.trilhoAlvo, escudo: r.alma.escudo, lim: r.lim.y }; });

  await jogarModo('gravidade');
  let e = await est();
  conferir(e.modo === 'gravidade' && e.chao && Math.abs(e.y - e.lim) < 0.01, `gravidade: caiu no chão (${JSON.stringify(e)})`);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.up('ArrowUp');
  e = await est();
  conferir(e.y < e.lim - 15, `gravidade: ↑ pula (y = ${e.y.toFixed(1)})`);
  await page.waitForTimeout(800);
  await page.mouse.click(480, 300); await page.waitForTimeout(150);            // toque = pulo
  e = await est();
  conferir(e.y < e.lim - 15, `gravidade: tocar na tela pula (y = ${e.y.toFixed(1)})`);
  await foto('gravidade');

  await jogarModo('trilhos', { linhas: 4 });
  e = await est();
  const t0 = e.trilho;
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
  e = await est();
  conferir(e.modo === 'trilhos' && e.trilho === t0 + 1, `trilhos: ↓ desce um trilho (${t0} → ${e.trilho})`);
  await page.mouse.move(480, 300); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(480, 300 - i * 8); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(300);
  e = await est();
  conferir(e.trilho < t0 + 1, `trilhos: arrastar pra cima sobe (${e.trilho})`);
  await foto('trilhos');

  await jogarModo('escudo');
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100); await page.keyboard.up('ArrowLeft');
  e = await est();
  conferir(e.modo === 'escudo' && e.escudo === 3 && Math.hypot(e.x, e.y) < 0.5, `escudo: ← vira pra esquerda e a alma fica no centro (${JSON.stringify(e)})`);
  await page.mouse.move(480, 140); await page.mouse.down(); await page.waitForTimeout(100);  // toque em cima da caixa
  e = await est();
  await page.mouse.up();
  conferir(e.escudo === 0, `escudo: tocar em cima vira pra cima (${e.escudo})`);
  await foto('escudo');

  await jogarModo('gelo');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
  const x1 = (await est()).x; await page.waitForTimeout(200);
  const x2 = (await est()).x;
  conferir(x2 > x1 + 5, `gelo: continua deslizando depois de soltar (${x1.toFixed(1)} → ${x2.toFixed(1)})`);
  await foto('gelo');

  await jogarModo('mini');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  e = await est();
  conferir(e.modo === 'mini' && e.x > 50, `mini: anda (x = ${e.x.toFixed(1)})`);
  await foto('mini');
  conferir(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nOK');
  await browser.close();
  process.exit(falhas.length ? 1 : 0);
})();
