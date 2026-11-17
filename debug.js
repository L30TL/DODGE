'use strict';
// =============================================================================
// DODGE — debug.js
// Só liga com ?debug=1 na URL. Ferramentas:
//   - pular pra qualquer % (teclas 0–9 = 0%–90%, [ e ] = ±5%)
//   - H: hitboxes · I: invencível · L: câmera lenta · B: bot (piloto automático) · K: morrer
//   - mapa de mortes da fase (histograma por %)
//   - "Analisar": prova que a fase é vencível (alcançabilidade) e mostra os
//     trechos mais apertados. Também roda no Node: tools/verificar-fases.js
// =============================================================================

const Debug = (() => {
  const ativo = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search);
  let painel = null, el = {};
  let fpsAcum = 0, fpsN = 0, fpsMax = 0, ultimoPainel = 0;
  let ultimoErro = null;
  let analise = null;

  const D = {
    ativo,
    invencivel: false,
    hitbox: false,
    vel: 1,
    bot: false,

    init() {
      if (!ativo) return;
      criarPainel();
    },

    frame(dt, ms) {
      fpsAcum += dt; fpsN++; fpsMax = Math.max(fpsMax, dt);
      if (ms - ultimoPainel < 250 || !painel) return;
      ultimoPainel = ms;
      const fps = fpsN / Math.max(1e-6, fpsAcum);
      const J = Game.J;
      const linhas = [
        `fps ${fps.toFixed(0)} · pior frame ${(fpsMax * 1000).toFixed(0)} ms`,
      ];
      if (Game.nomeTela === 'jogo' && J.fase) {
        linhas.push(`t ${J.t.toFixed(2)}s · batida ${J.batida.toFixed(1)} · ${(J.prog * 100).toFixed(1)}%`);
        linhas.push(`projéteis ${J.ataques.n}/${CONFIG.ataques.poolTamanho} (estouros ${J.ataques.estourou}) · partículas ${Game.Particulas.ativas()}`);
      }
      linhas.push(`áudio: atrasadas ${Sound.stats.atrasadas} · sfx ${Sound.stats.sfxAtivos} · latência ${(Sound.latencia() * 1000).toFixed(0)} ms`);
      if (ultimoErro) linhas.push('ERRO: ' + ultimoErro);
      el.stats.textContent = linhas.join('\n');
      el.hit.classList.toggle('on', D.hitbox);
      el.inv.classList.toggle('on', D.invencivel);
      el.bot.classList.toggle('on', D.bot);
      el.vel.textContent = 'vel ' + D.vel + '×';
      desenharMapa();
      fpsAcum = 0; fpsN = 0; fpsMax = 0;
    },

    tecla(e) {
      if (e.repetida) return false;
      const c = e.code;
      if (c === 'KeyH') { D.hitbox = !D.hitbox; return true; }
      if (c === 'KeyI') { D.invencivel = !D.invencivel; marcarTrapaca(); return true; }
      if (c === 'KeyL') { trocarVel(); return true; }
      if (c === 'KeyB') { D.bot = !D.bot; marcarTrapaca(); return true; }
      if (c === 'KeyK') { Game.matar(); return true; }
      if (Game.nomeTela === 'jogo') {
        const m = /^Digit(\d)$/.exec(c);
        if (m) { Game.pular(+m[1] / 10); return true; }
        if (c === 'BracketLeft') { Game.pular(Game.J.prog - 0.05); return true; }
        if (c === 'BracketRight') { Game.pular(Game.J.prog + 0.05); return true; }
      }
      return false;
    },

    aoMorrer() { /* o mapa é redesenhado no painel */ },
    erro(err) { ultimoErro = String(err && err.message || err); },

    // ------------------------------------------------------------ BOT ------
    // Piloto automático: testa 9 direções olhando ~0,6 s pra frente e escolhe a
    // mais segura. Só enxerga o que já está na tela (avisos), como um jogador.
    direcaoBot(alma, J) {
      const lim = { x: Game.HW - CONFIG.alma.margemParede, y: Game.HH - CONFIG.alma.margemParede };
      return bot(alma, J.ataques, J.t, lim, 0);
    },

    // Joga a fase sem tela, com um "tempo de reação" (s): o bot só enxerga avisos
    // que apareceram há pelo menos `atraso` segundos. Bom termômetro de dificuldade.
    simularBot(fase, atraso) {
      const comp = Patterns.compilar(fase, CONFIG.caixa);
      const at = new Patterns.Ataques(comp);
      const lim = { x: comp.hw - CONFIG.alma.margemParede, y: comp.hh - CONFIG.alma.margemParede };
      const alma = { x: 0, y: 0 };
      const dt = 1 / 60, v = CONFIG.alma.velocidade;
      const lixo = [], moedas = [];
      let raspoes = 0;
      for (let tt = 0; tt < comp.duracao; tt += dt) {
        const d = bot(alma, at, tt, lim, atraso);
        const ox = alma.x, oy = alma.y;
        alma.x = Math.max(-lim.x, Math.min(lim.x, alma.x + d.x * v * dt));
        alma.y = Math.max(-lim.y, Math.min(lim.y, alma.y + d.y * v * dt));
        at.atualizar(tt + dt, dt, alma);
        for (let k = 1; k <= 3; k++) {
          const f = k / 3;
          lixo.length = 0;
          const m = at.testar(tt + dt * f, ox + (alma.x - ox) * f, oy + (alma.y - oy) * f,
            CONFIG.alma.raioHitbox, CONFIG.alma.raioRaspao, lixo, moedas);
          raspoes += lixo.length;
          if (m) return { venceu: false, t: tt, pct: Math.floor(tt / comp.duracao * 100), batida: tt / comp.B, raspoes, ev: fase.eventos[m.s.ev], x: alma.x, y: alma.y };
        }
      }
      return { venceu: true, pct: 100, raspoes, moedas: moedas.length };
    },

    // ------------------------------------------------------- ANALISADOR ----
    // Prova que a fase é vencível: simula TODAS as posições alcançáveis pela alma
    // (grade de 2 px, velocidade do teclado, movimento só em eixo = conservador).
    // Se o conjunto alcançável nunca fica vazio, existe um caminho até o fim.
    analisar(fase, op) {
      op = op || {};
      const comp = Patterns.compilar(fase, CONFIG.caixa);
      const at = new Patterns.Ataques(comp);
      const g = op.grade || 2;
      const v = CONFIG.alma.velocidade;
      const dt = g / v;
      const limX = comp.hw - CONFIG.alma.margemParede, limY = comp.hh - CONFIG.alma.margemParede;
      const nx = Math.floor(2 * limX / g) + 1, ny = Math.floor(2 * limY / g) + 1;
      const N = nx * ny;
      let R = new Uint8Array(N), R2 = new Uint8Array(N);
      const perigo = new Uint8Array(N);
      const cx = (i) => -limX + i * g, cy = (j) => -limY + j * g;
      R[Math.floor(ny / 2) * nx + Math.floor(nx / 2)] = 1;
      const rH = CONFIG.alma.raioHitbox + 0.5;   // margem extra = conservador
      const T = Patterns.TIPOS;
      const passos = Math.ceil(comp.duracao / dt);
      const porBatida = [];            // menor área alcançável (fração) em cada batida
      let minFrac = 1, tMin = 0, morreuEm = null;
      const alma = { x: 0, y: 0 };
      for (let k = 0; k <= passos; k++) {
        const tt = Math.min(comp.duracao, k * dt);
        at.atualizar(tt, dt, alma);
        perigo.fill(0);
        for (let q = 0; q < at.n; q++) {
          const o = at.vivos[q], s = o.s;
          if (s.k === T.BALA) {
            if (tt < s.t0) continue;
            const r = s.hr + rH;
            const i0 = Math.max(0, Math.floor((o.x - r + limX) / g)), i1 = Math.min(nx - 1, Math.ceil((o.x + r + limX) / g));
            const j0 = Math.max(0, Math.floor((o.y - r + limY) / g)), j1 = Math.min(ny - 1, Math.ceil((o.y + r + limY) / g));
            for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
              const dx = cx(i) - o.x, dy = cy(j) - o.y;
              if (dx * dx + dy * dy < r * r) perigo[j * nx + i] = 1;
            }
          } else if (s.k === T.PAREDE) {
            if (tt < s.t0 || tt >= s.tF) continue;
            // meio-plano: tudo além da borda (mais a folga) é perigo
            const e = Patterns.bordaParede(s, tt);
            const lim = s.lado < 0 ? e - CONFIG.ataques.folgaHitbox + rH : e + CONFIG.ataques.folgaHitbox - rH;
            if (s.eixo === 'h') {
              for (let i = 0; i < nx; i++) {
                const x = cx(i);
                if (s.lado < 0 ? x < lim : x > lim) for (let j = 0; j < ny; j++) perigo[j * nx + i] = 1;
              }
            } else {
              for (let j = 0; j < ny; j++) {
                const y = cy(j);
                if (s.lado < 0 ? y < lim : y > lim) for (let i = 0; i < nx; i++) perigo[j * nx + i] = 1;
              }
            }
          } else if (s.k === T.LASER && s.eixoAlinhado) {
            if (tt < s.t0 || tt >= s.t1) continue;
            const p = s.p0 + (s.p1 - s.p0) * (tt - s.t0) / (s.t1 - s.t0);
            const r = s.hr + rH;
            if (s.ang === -90) {
              for (let i = 0; i < nx; i++) if (Math.abs(cx(i) - p) < r) for (let j = 0; j < ny; j++) perigo[j * nx + i] = 1;
            } else {
              for (let j = 0; j < ny; j++) if (Math.abs(cy(j) - p) < r) for (let i = 0; i < nx; i++) perigo[j * nx + i] = 1;
            }
          } else if (s.k === T.LASER || s.k === T.MURO) {
            if (at.distancia(o, tt, 0, 0) === Infinity) continue;
            for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
              if (perigo[j * nx + i]) continue;
              if (at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[j * nx + i] = 1;
            }
          }
        }
        // R2 = dilata(R) ∩ seguro
        let area = 0;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const id = j * nx + i;
          let r = R[id] || (i > 0 && R[id - 1]) || (i < nx - 1 && R[id + 1]) || (j > 0 && R[id - nx]) || (j < ny - 1 && R[id + nx]);
          r = r && !perigo[id] ? 1 : 0;
          R2[id] = r; area += r;
        }
        const tmp = R; R = R2; R2 = tmp;
        const frac = area / N;
        const b = Math.floor(tt / comp.B);
        if (tt > 1.5 && (porBatida[b] === undefined || frac < porBatida[b])) porBatida[b] = frac;
        if (tt > 2 && frac < minFrac) { minFrac = frac; tMin = tt; }
        if (area === 0) { morreuEm = tt; break; }
      }
      // avisos curtos demais
      const avisosCurtos = [];
      for (const s of comp.specs) {
        if (s.k === T.BALA && s.av === null) continue;          // balas de espiral/anel: o emissor avisa
        if (s.k === T.MOEDA || s.k === T.ORBE || s.k === T.EMISSOR) continue;
        const a = s.t0 - s.tA;
        if (fase.dificuldade !== 'demonio' && a < Math.max(CONFIG.ataques.avisoMinimoS, comp.B) - 1e-6) avisosCurtos.push({ batida: s.batida, aviso: a });
      }
      analise = { fase: fase.id, ok: morreuEm === null, morreuEm, minFrac, tMin, batidaMin: tMin / comp.B,
        pctMin: tMin / comp.duracao * 100, porBatida, avisosCurtos, specs: comp.specs.length, duracao: comp.duracao };
      return analise;
    },
  };

  // Política do bot: planos do tipo "espera w segundos, anda na direção d por m segundos
  // e para", olhando ~0,7 s pra frente. Escolhe o plano com mais folga e executa o 1º passo.
  const HORIZ = [0.017, 0.035, 0.06, 0.13, 0.22, 0.32, 0.44, 0.58, 0.72, 0.9, 1.1, 1.4, 1.8];
  const DURS = [0.05, 0.15, 0.3, 0.45, 0.6, 0.8, 1.0];
  const ESPERAS = [0, 0.2, 0.4];
  function bot(alma, at, tt, lim, atraso) {
    const v = CONFIG.alma.velocidade;
    let melhor = { x: 0, y: 0 }, melhorNota = -Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const n = dx && dy ? Math.SQRT1_2 : 1;
      const parado = !dx && !dy;
      for (const w of (parado ? [0] : ESPERAS)) for (const m of (parado ? [0] : DURS)) {
        let folga = 60;
        for (const h of HORIZ) {
          const k = Math.max(0, Math.min(h - w, m));
          const px = Math.max(-lim.x, Math.min(lim.x, alma.x + dx * n * v * k));
          const py = Math.max(-lim.y, Math.min(lim.y, alma.y + dy * n * v * k));
          // perto no tempo = precisa de folga de verdade; longe = só uma tendência
          const exige = h <= 0.25 ? 3 : h * 3;
          for (let i = 0; i < at.n; i++) {
            const o = at.vivos[i];
            if (o.s.k === Patterns.TIPOS.MOEDA || o.s.tA > tt - atraso) continue;
            let d = at.distancia(o, tt + h, px, py) - CONFIG.alma.raioHitbox - exige;
            if (h <= 0.25 && d < 0) d *= 4;
            if (d < folga) folga = d;
          }
          if (folga < -50) break;
        }
        const fx = alma.x + dx * n * v * m, fy = alma.y + dy * n * v * m;
        const nota = Math.min(folga, 18) - 0.02 * Math.hypot(fx, fy) - m * 2 + (w > 0 ? 0.05 : 0);
        if (nota > melhorNota) {
          melhorNota = nota;
          // esperar = ficar parado agora
          melhor = w > 0 ? { x: 0, y: 0 } : { x: dx * n, y: dy * n };
        }
      }
    }
    return melhor;
  }

  D._bot = (alma, at, tt, lim, atraso) => bot(alma, at, tt, lim, atraso);

  function marcarTrapaca() { if (Game.J) Game.J.trapaca = true; }

  function trocarVel() {
    const vs = CONFIG.debug.velocidades;
    D.vel = vs[(vs.indexOf(D.vel) + 1) % vs.length];
    Sound.velocidade(D.vel);
    marcarTrapaca();
  }

  // --------------------------------------------------------------- painel --
  function criarPainel() {
    const css = document.createElement('style');
    css.textContent = `
      .debug-painel { position: fixed; top: 4px; left: 4px; z-index: 10; width: 300px; font: 11px/1.35 monospace;
        color: #e8e8ff; background: rgba(10,10,25,0.86); border: 1px solid #55557e; padding: 6px; border-radius: 4px; }
      .debug-painel pre { margin: 0 0 6px; white-space: pre-wrap; }
      .debug-painel button, .debug-painel select { font: 11px monospace; background: #24244a; color: #fff; border: 1px solid #55557e;
        margin: 1px; padding: 2px 5px; cursor: pointer; }
      .debug-painel button.on { background: #1b7a42; }
      .debug-painel canvas { display: block; margin-top: 4px; background: #07070f; image-rendering: pixelated; }
      .debug-painel .min { cursor: pointer; float: right; }
      .debug-painel.fechado > :not(.min) { display: none; }
      .debug-painel input[type=range] { width: 170px; vertical-align: middle; }`;
    document.head.appendChild(css);
    painel = document.createElement('div');
    painel.className = 'debug-painel';
    painel.innerHTML = `
      <span class="min" title="minimizar">[–]</span><b>DEBUG</b>
      <pre id="dbg-stats"></pre>
      <div>
        <button id="dbg-hit">hitbox (H)</button><button id="dbg-inv">invencível (I)</button>
        <button id="dbg-vel">vel 1×</button><button id="dbg-bot">bot (B)</button>
      </div>
      <div>% <input id="dbg-pct" type="range" min="0" max="99" value="0"><button id="dbg-ir">ir</button></div>
      <div><select id="dbg-fase"></select><button id="dbg-jogar">jogar</button></div>
      <div>mapa de mortes <button id="dbg-zerar">zerar</button></div>
      <canvas id="dbg-mapa" width="290" height="50"></canvas>
      <div><button id="dbg-analisar">analisar fase</button> <span id="dbg-res"></span></div>
      <canvas id="dbg-graf" width="290" height="50"></canvas>`;
    document.body.appendChild(painel);
    const $ = (id) => painel.querySelector('#' + id);
    el = { stats: $('dbg-stats'), hit: $('dbg-hit'), inv: $('dbg-inv'), vel: $('dbg-vel'), bot: $('dbg-bot'),
      pct: $('dbg-pct'), mapa: $('dbg-mapa'), graf: $('dbg-graf'), res: $('dbg-res'), fase: $('dbg-fase') };
    painel.querySelector('.min').onclick = () => painel.classList.toggle('fechado');
    el.hit.onclick = () => { D.hitbox = !D.hitbox; };
    el.inv.onclick = () => { D.invencivel = !D.invencivel; marcarTrapaca(); };
    el.vel.onclick = trocarVel;
    el.bot.onclick = () => { D.bot = !D.bot; marcarTrapaca(); };
    $('dbg-ir').onclick = () => { if (Game.nomeTela === 'jogo') Game.pular(+el.pct.value / 100); };
    for (const f of Levels.FASES.concat([Levels.LABORATORIO])) {
      const o = document.createElement('option'); o.value = f.id; o.textContent = f.nome; el.fase.appendChild(o);
    }
    $('dbg-jogar').onclick = () => { Sound.iniciar(); Game.jogar(Levels.porId(el.fase.value)); };
    $('dbg-zerar').onclick = () => {
      const f = Game.J.fase || Levels.porId(el.fase.value);
      if (f) { Save.fase(f.id).mortes.fill(0); Save.gravar(); }
    };
    $('dbg-analisar').onclick = () => {
      const f = (Game.nomeTela === 'jogo' && Game.J.fase) || Levels.porId(el.fase.value);
      el.res.textContent = 'analisando...';
      setTimeout(() => {
        const t0 = performance.now();
        const a = D.analisar(f);
        el.res.textContent = (a.ok ? 'VENCÍVEL' : 'IMPOSSÍVEL em ' + a.morreuEm.toFixed(2) + 's') +
          ` · aperto máx ${(100 - a.minFrac * 100).toFixed(0)}% em ${a.pctMin.toFixed(0)}% · ${(performance.now() - t0).toFixed(0)} ms`;
        desenharGrafico(a);
      }, 30);
    };
  }

  function desenharMapa() {
    const c = el.mapa.getContext('2d');
    c.fillStyle = '#07070f'; c.fillRect(0, 0, 290, 50);
    const f = Game.J.fase;
    if (!f) return;
    const m = Save.fase(f.id).mortes;
    const max = Math.max(1, ...m);
    c.fillStyle = '#ff2e63';
    for (let i = 0; i < 100; i++) {
      const h = Math.round(m[i] / max * 46);
      c.fillRect(Math.round(i * 2.9), 50 - h, 2, h);
    }
    c.fillStyle = '#9c9cc4';
    c.font = '10px monospace';
    const total = m.reduce((a, b) => a + b, 0);
    c.fillText(f.nome + ' · ' + total + ' mortes' + (total ? ' · pico em ' + m.indexOf(max) + '%' : ''), 4, 10);
  }

  function desenharGrafico(a) {
    const c = el.graf.getContext('2d');
    c.fillStyle = '#07070f'; c.fillRect(0, 0, 290, 50);
    const n = a.porBatida.length;
    for (let i = 0; i < n; i++) {
      const fr = a.porBatida[i] || 0;
      const h = Math.round(fr * 48);
      c.fillStyle = fr < 0.08 ? '#ff2e63' : fr < 0.2 ? '#ff9a2e' : '#45e07a';
      c.fillRect(Math.floor(i / n * 290), 50 - h, Math.max(1, Math.ceil(290 / n)), h);
    }
  }

  return D;
})();
