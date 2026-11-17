// Regressão dos bugs da auditoria (B01–B07) no navegador. Cada sonda reproduz o bug e diz se ele voltou.
// Uso: suba o servidor (python3 -m http.server 8000) e rode: node tools/navegador/regressao.js
// Precisa do Playwright (já vem instalado no ambiente do Claude).
const { chromium } = require('playwright');
const URL = (process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/?debug=1';
const res = [];
const ok = (nome, bug, detalhe) => { res.push({ nome, bug, detalhe }); console.log((bug ? 'BUG  ' : 'ok   ') + nome + ' — ' + detalhe); };

async function novaPagina(browser, init) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  page.__erros = [];
  page.on('pageerror', e => page.__erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.__erros.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForTimeout(300);
  await page.mouse.click(480, 270);          // gesto: libera o áudio (e começa a fase 1)
  await page.waitForTimeout(200);
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // P1: morrer no mesmo frame em que a fase acaba (laser ligando exatamente no fim)
  {
    const { ctx, page } = await novaPagina(browser);
    const r = await page.evaluate(() => new Promise((fim) => {
      const f = { id: 'sonda1', nome: 'Sonda', autor: 'x', dificuldade: 'facil', musica: 'despertar', bpm: 112, duracaoBatidas: 20,
        eventos: [{ batida: 20, tipo: 'laser', pos: 0, orient: 'v', aviso: 2, dur: 4 }] };
      Game.jogar(f); Game.pular(0.9); Game.J.trapaca = false;
      const espera = () => {
        if (Game.J.estado === 'vitoria' || Game.J.estado === 'morto') fim({ estado: Game.J.estado, pct: Game.J.pctMorte });
        else requestAnimationFrame(espera);
      };
      espera();
    }));
    ok('P1 morrer depois do fim da fase', r.estado === 'morto', `estado final: ${r.estado}${r.estado === 'morto' ? ' em ' + r.pct + '% (devia vencer: o perigo só liga no instante final)' : ''}`);
    await ctx.close();
  }

  // P2: áudio suspenso/interrompido (iPhone): o jogo congela sem avisar
  {
    const { ctx, page } = await novaPagina(browser, () => {
      const AC = window.AudioContext;
      window.__ctxs = [];
      window.AudioContext = function (...a) { const c = new AC(...a); window.__ctxs.push(c); return c; };
    });
    await page.waitForTimeout(1500);
    const antes = await page.evaluate(() => Game.J.t);
    await page.evaluate(() => { const c = window.__ctxs[0]; c.resume = () => Promise.resolve(); return c.suspend(); });
    await page.waitForTimeout(2000);
    const depois = await page.evaluate(() => ({ t: Game.J.t, estado: Game.J.estado, ctx: window.__ctxs[0].state }));
    const aviso = await page.evaluate(() => Game.J.avisoAudio);
    ok('P2 áudio interrompido congela o jogo sem aviso', depois.estado === 'jogando',
      `estado "${depois.estado}", aviso na tela = ${aviso}, áudio "${depois.ctx}"`);
    await ctx.close();
  }

  // P3: save corrompido é sobrescrito sem backup
  {
    const ctx = await browser.newContext({ locale: 'pt-BR' });
    const page = await ctx.newPage();
    // o save já está estragado no disco quando o jogo abre (antes dos scripts do jogo rodarem)
    await page.addInitScript(() => {
      if (sessionStorage.getItem('p3')) return;
      sessionStorage.setItem('p3', '1');
      localStorage.setItem('dodge.save', '{"fases":{"despertar":{"melhor":87,"tentativas":143');   // JSON cortado
    });
    await page.goto(URL); await page.waitForTimeout(300);
    await page.mouse.click(480, 270); await page.waitForTimeout(1200);
    await page.evaluate(() => Save.gravar());
    const r = await page.evaluate(() => ({ copias: Object.keys(localStorage).filter(k => k.startsWith('dodge.save.corrompido.')).map(k => localStorage.getItem(k)), rec: Save.recuperado, disponivel: Save.disponivel }));
    ok('P3 save corrompido some sem backup', !r.copias.some(c => c.includes('"melhor":87')),
      `save quebrado (melhor 87%, 143 tentativas): cópia guardada = ${r.copias.length > 0}, recuperado = ${r.rec}, save disponível = ${r.disponivel}`);
    await ctx.close();
  }

  // P4: recorde perdido se fechar o jogo logo depois de morrer
  {
    const ctx = await browser.newContext({ locale: 'pt-BR' });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForTimeout(300);
    await page.mouse.click(480, 270);                         // começa a Despertar (primeira vez)
    await page.waitForFunction(() => Game.J.estado === 'jogando');
    await page.evaluate(() => { Game.pular(0.5); Game.J.trapaca = false; });
    await page.waitForTimeout(400);
    const pct = await page.evaluate(() => { Game.matar(); return Game.J.pctMorte; });
    await page.waitForTimeout(150);
    await page.reload(); await page.waitForTimeout(300);       // "fechou o app" 150 ms depois de morrer
    const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('dodge.save') || 'null'));
    const melhor = salvo && salvo.fases.despertar ? salvo.fases.despertar.melhor : 0;
    ok('P4 recorde perdido ao fechar logo após morrer', melhor < pct, `morreu em ${pct}% (recorde), fechou 150 ms depois: save tem melhor = ${melhor}%`);
    await ctx.close();
  }

  // P5: trocar de aba logo depois de morrer e sair pro menu: a próxima fase começa pausada
  {
    const { ctx, page } = await novaPagina(browser);
    await page.waitForTimeout(600);
    await page.evaluate(() => { Game.matar(); window.dispatchEvent(new Event('blur')); });
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');                      // morto → Esc = vai pra lista de fases
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => { Game.jogar(Levels.FASES[1]); return { tela: Game.nomeTela, estado: Game.J.estado }; });
    ok('P5 fase nova começa pausada depois de trocar de aba', r.estado === 'pausa', `abriu Correnteza e o estado inicial foi "${r.estado}"`);
    await ctx.close();
  }

  // P6: pool de 768 projéteis: ataques somem em silêncio quando estoura
  {
    const { ctx, page } = await novaPagina(browser);
    const r = await page.evaluate(() => {
      const eventos = [];
      for (let k = 0; k < 20; k++) {
        const pos = []; for (let i = 0; i < 50; i++) pos.push(-1 + 2 * (k * 50 + i) / 999);
        eventos.push({ batida: 4, tipo: 'chuva', pos, vel: 40, aviso: 1 });
      }
      const f = { id: 'sonda6', nome: 'Sonda', autor: 'x', dificuldade: 'facil', musica: 'despertar', bpm: 112, duracaoBatidas: 40, eventos };
      Debug.invencivel = true; Game.jogar(f); Game.pular(0.12);
      return { vivos: Game.J.ataques.n, estouros: Game.J.ataques.estourou };
    });
    ok('P6 projéteis descartados em silêncio acima de 768', r.estouros > 0, `fase pediu 1000 gotas: ${r.vivos} apareceram, ${r.estouros} sumiram sem aviso`);
    await ctx.close();
  }

  // P7: dois toques no mesmo frame durante a morte = só 1 tentativa
  {
    const { ctx, page } = await novaPagina(browser);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => new Promise((fim) => {
      Game.matar();
      setTimeout(() => {
        const t0 = Game.J.tentativa;
        for (let i = 0; i < 2; i++) document.dispatchEvent(new PointerEvent('pointerdown', { clientX: 400 + i, clientY: 300, pointerId: 10 + i, pointerType: 'touch', bubbles: true }));
        fim({ antes: t0, depois: Game.J.tentativa, estado: Game.J.estado });
      }, 200);
    }));
    ok('P7 dois toques no mesmo frame', r.depois - r.antes !== 1, `tentativas ${r.antes} → ${r.depois}, estado ${r.estado}`);
    await ctx.close();
  }

  // P8: localStorage bloqueado: o jogo funciona? avisa?
  {
    const { ctx, page } = await novaPagina(browser, () => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
    });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ tela: Game.nomeTela, estado: Game.J.estado, disp: Save.disponivel, t: Game.J.t }));
    ok('P8 localStorage bloqueado', page.__erros.length > 0 || r.tela !== 'jogo', `tela ${r.tela}, estado ${r.estado}, jogo andando (${r.t.toFixed(1)} s), save disponível = ${r.disp}, erros: ${page.__erros.length}`);
    await ctx.close();
  }

  // P9: redimensionar e girar no meio da fase
  {
    const { ctx, page } = await novaPagina(browser);
    for (const [w, h] of [[400, 800], [1280, 600], [640, 360], [960, 540]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150); }
    const r = await page.evaluate(() => ({ w: Game.canvas.style.width, h: Game.canvas.style.height }));
    ok('P9 redimensionar/girar no meio da fase', page.__erros.length > 0, `canvas ${r.w}×${r.h}, erros no console: ${page.__erros.length}`);
    await ctx.close();
  }

  // P10: 500 mortes+restarts: memória, sincronia, nós de áudio (Etapa 1: 500 seguidos)
  {
    const { ctx, page } = await novaPagina(browser);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    await page.evaluate(() => Game.jogar(Levels.FASES[1]));
    await page.waitForTimeout(1000);
    await cdp.send('HeapProfiler.collectGarbage');
    const h0 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    for (let i = 0; i < 500; i++) {
      await page.evaluate(() => new Promise((fim) => {
        const n = Game.J.tentativa; Game.matar();
        const esp = () => (Game.J.estado === 'jogando' && Game.J.tentativa === n + 1) ? fim() : requestAnimationFrame(esp);
        esp();
      }));
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(1500);
    await cdp.send('HeapProfiler.collectGarbage');
    const h1 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    const r = await page.evaluate(() => ({ dif: (Sound.posicao() - Game.J.t) * 1000, atrasadas: Sound.stats.atrasadas, sfx: Sound.stats.sfxAtivos }));
    ok('P10 500 restarts seguidos', (h1 - h0) > 2e6 || r.atrasadas > 0 || r.sfx > 5,
      `heap ${(h0 / 1e6).toFixed(1)} → ${(h1 / 1e6).toFixed(1)} MB, música×jogo ${r.dif.toFixed(1)} ms, notas atrasadas ${r.atrasadas}, sons vivos ${r.sfx}`);
    await ctx.close();
  }

  // P12: sem internet: depois de carregar, o jogo não faz nenhum pedido de rede e roda normal
  {
    const { ctx, page } = await novaPagina(browser);
    const pedidos = [];
    page.on('request', (r) => pedidos.push(r.url()));
    await ctx.setOffline(true);
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.evaluate(() => { Game.jogar(Levels.FASES[0]); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { Game.matar(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => Game.irPara('editor', { fase: Criadas.nova({ nome: 'X', musica: 'despertar', bpm: 112, duracaoBatidas: 113 }) }));
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ tela: Game.nomeTela, estado: Game.J.estado }));
    ok('P12 sem internet', pedidos.length > 0 || erros.length > 0 || st.tela !== 'editor',
      `offline: ${pedidos.length} pedidos de rede depois de carregar, ${erros.length} erros, foi pro editor = ${st.tela === 'editor'}`);
    await ctx.close();
  }

  // P13: armazenamento cheio (cota estourada): o jogo continua e avisa que não salva
  {
    const { ctx, page } = await novaPagina(browser, () => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('dodge.') && window.__cheio) throw new DOMException('cheio', 'QuotaExceededError'); return orig.call(this, k, v); };
    });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.evaluate(() => { window.__cheio = true; Game.jogar(Levels.FASES[0]); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { Game.matar(); Save.gravar(); });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ estado: Game.J.estado, disponivel: Save.disponivel, tentativas: Save.fase('despertar').tentativas }));
    ok('P13 armazenamento cheio', erros.length > 0 || r.estado !== 'jogando' || r.disponivel !== false || r.tentativas < 2,
      `cota estourada: jogo ${r.estado}, save disponível = ${r.disponivel} (aviso nas configurações), tentativas na memória ${r.tentativas}, erros ${erros.length}`);
    await ctx.close();
  }

  // P11: 2000 projéteis com CPU 4× mais lenta (pool aumentado só pra medir)
  {
    const { ctx, page } = await novaPagina(browser, () => {
      const orig = window.requestAnimationFrame.bind(window);
      window.__js = [];
      window.requestAnimationFrame = (cb) => orig((ts) => { const t0 = performance.now(); cb(ts); window.__js.push(performance.now() - t0); });
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      const eventos = [];
      for (let k = 0; k < 40; k++) {
        const pos = []; for (let i = 0; i < 50; i++) pos.push(-1 + 2 * ((k * 50 + i) % 400) / 399);
        eventos.push({ batida: 2 + k * 0.05, tipo: 'chuva', pos, vel: 22, aviso: 1 });
      }
      const f = { id: 'sonda11', nome: 'Sonda', autor: 'x', dificuldade: 'facil', musica: 'despertar', bpm: 112, duracaoBatidas: 60, eventos };
      Debug.invencivel = true; Game.jogar(f); Game.pular(0.1); window.__js.length = 0;
    });
    await page.waitForTimeout(5000);
    const r = await page.evaluate(() => { const l = window.__js.slice(10).sort((a, b) => a - b); return { n: Game.J.ataques.n, media: l.reduce((a, b) => a + b, 0) / l.length, p95: l[Math.floor(l.length * 0.95)] }; });
    ok('P11 2000 projéteis, CPU 4× lenta', r.p95 > 12, `${r.n} projéteis na tela, JS por frame: média ${r.media.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms (orçamento p/ 60 fps ≈ 12 ms)`);
    await ctx.close();
  }

  console.log('\nresumo:', res.filter(x => x.bug).length, 'bugs de', res.length, 'sondas');
  await browser.close();
})();
