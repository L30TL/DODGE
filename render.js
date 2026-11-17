'use strict';
// =============================================================================
// DODGE — render.js
// Desenho dos ataques (avisos, balas, lasers, paredes, moedas, hitboxes).
// Só desenha: toda a lógica fica em patterns.js e sim.js (que rodam sem tela).
// =============================================================================

const Render = (() => {
  const { BALA, LASER, PAREDE, MURO, ORBE, EMISSOR, MOEDA } = Patterns.TIPOS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bordaParede = Patterns.bordaParede;

  // Desenha todos os ataques vivos. ctx já está transladado pro centro da caixa e com clip.
  function ataques(ctx, at, t, batida, op) {
    const hw = at.c.hw, hh = at.c.hh, B = at.c.B;
    const pisca = ((batida * CONFIG.ataques.piscadasPorBatida) % 1) < 0.5;
    const vivos = at.vivos, n = at.n;
    // 1) avisos
    for (let i = 0; i < n; i++) {
      const o = vivos[i];
      if (t < o.s.t0 || o.s.k === EMISSOR || o.s.k === ORBE) desenharAviso(ctx, o, t, hw, hh, B, pisca, op);
    }
    // 2) paredes e muros
    for (let i = 0; i < n; i++) {
      const o = vivos[i], k = o.s.k;
      if ((k === PAREDE || k === MURO) && t >= o.s.t0) desenharParede(ctx, o, t, hw, hh, at.destaque === o, op);
    }
    // 3) lasers
    for (let i = 0; i < n; i++) {
      const o = vivos[i];
      if (o.s.k === LASER && t >= o.s.t0) desenharLaser(ctx, o, t, hw, hh, at.destaque === o, op);
    }
    // 4) balas. Poucas: um drawImage cada (sprite guardado na spec). Muitas: os pixels vão
    //    direto numa camada e ela é desenhada uma vez só (milhares de balas a 60 fps).
    let nBalas = 0;
    for (let i = 0; i < n; i++) if (vivos[i].s.k === BALA) nBalas++;
    if (nBalas > CONFIG.render.balasEmCamada) balasEmCamada(ctx, at, t, hw, hh, op);
    else {
      const limX = hw + 12, limY = hh + 12;
      for (let i = 0; i < n; i++) {
        const o = vivos[i], s = o.s;
        if (s.k !== BALA || t < s.t0) continue;
        if (o.x < -limX || o.x > limX || o.y < -limY || o.y > limY) continue;
        ctx.drawImage(spriteBala(s, at.destaque === o && op.piscaMorte), (o.x - s.r + 0.5) | 0, (o.y - s.r + 0.5) | 0);
      }
    }
    // 5) moedas
    for (let i = 0; i < n; i++) {
      const o = vivos[i];
      if (o.s.k !== MOEDA || o.pego) continue;
      desenharMoeda(ctx, o, t, batida);
    }
    if (op.hitbox) hitboxes(ctx, at, t, hw, hh);
  }

  function spriteBala(s, branco) {
    if (branco) return s.sprB || (s.sprB = Sprites.bala(s.r * 2, PAL.branco, PAL.branco, PAL.perigoClaro));
    return s.spr || (s.spr = Sprites.bala(s.r * 2, PAL.perigo, PAL.perigoClaro, PAL.perigoEscuro));
  }

  // ----------------------------------------------------- camada de balas --
  // Os pixels de cada bala são copiados num buffer do tamanho da caixa, que vira
  // uma imagem só. Mesmo resultado visual, uma fração do custo.
  const camada = { cv: null, c: null, img: null, buf: null, w: 0, h: 0 };
  const pixelsBala = new Map();          // diâmetro -> { w, h, px: Uint32Array }

  function spritePx(s) {
    if (s.spx) return s.spx;
    const d = Math.max(3, Math.round(s.r * 2));
    let sp = pixelsBala.get(d);
    if (!sp) {
      const cv = spriteBala(s, false);
      const dados = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      sp = { w: cv.width, h: cv.height, px: new Uint32Array(dados.buffer.slice(0)) };
      pixelsBala.set(d, sp);
    }
    return (s.spx = sp);
  }

  function balasEmCamada(ctx, at, t, hw, hh, op) {
    const w = hw * 2, h = hh * 2;
    if (!camada.cv || camada.w !== w || camada.h !== h) {
      camada.cv = document.createElement('canvas');
      camada.cv.width = w; camada.cv.height = h;
      camada.c = camada.cv.getContext('2d');
      camada.img = camada.c.createImageData(w, h);
      camada.buf = new Uint32Array(camada.img.data.buffer);
      camada.w = w; camada.h = h;
    }
    const buf = camada.buf;
    buf.fill(0);
    let destaque = null;
    for (let i = 0; i < at.n; i++) {
      const o = at.vivos[i], s = o.s;
      if (s.k !== BALA || t < s.t0) continue;
      if (at.destaque === o && op.piscaMorte) { destaque = o; continue; }
      const sp = spritePx(s);
      const x0 = ((o.x - s.r + 0.5) | 0) + hw, y0 = ((o.y - s.r + 0.5) | 0) + hh;
      if (x0 >= w || y0 >= h || x0 + sp.w <= 0 || y0 + sp.h <= 0) continue;
      const xi = x0 < 0 ? -x0 : 0, xf = x0 + sp.w > w ? w - x0 : sp.w;
      const yi = y0 < 0 ? -y0 : 0, yf = y0 + sp.h > h ? h - y0 : sp.h;
      for (let yy = yi; yy < yf; yy++) {
        const lin = (y0 + yy) * w + x0, lsp = yy * sp.w;
        for (let xx = xi; xx < xf; xx++) {
          const p = sp.px[lsp + xx];
          if (p !== 0) buf[lin + xx] = p;
        }
      }
    }
    camada.c.putImageData(camada.img, 0, 0);
    ctx.drawImage(camada.cv, -hw, -hh);
    if (destaque) ctx.drawImage(spriteBala(destaque.s, true), (destaque.x - destaque.s.r + 0.5) | 0, (destaque.y - destaque.s.r + 0.5) | 0);
  }

  function hitboxes(ctx, at, t, hw, hh) {
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    for (let i = 0; i < at.n; i++) {
      const o = at.vivos[i], s = o.s;
      if (s.k === BALA && t >= s.t0) {
        ctx.beginPath(); ctx.arc(o.x, o.y, s.hr, 0, Math.PI * 2); ctx.stroke();
      } else if (s.k === LASER && t >= s.t0 && t < s.t1) {
        if (s.eixoAlinhado && s.ang === -90) ctx.strokeRect(o.p - s.hr, -hh, s.hr * 2, hh * 2);
        else if (s.eixoAlinhado) ctx.strokeRect(-hw, o.p - s.hr, hw * 2, s.hr * 2);
        else { ctx.save(); ctx.rotate(s.ang * Math.PI / 180); ctx.strokeRect(-400, o.p - s.hr, 800, s.hr * 2); ctx.restore(); }
      } else if (s.k === PAREDE && t >= s.t0) {
        const e = o.e + (s.lado < 0 ? -1 : 1) * CONFIG.ataques.folgaHitbox;
        if (s.eixo === 'h') ctx.strokeRect(s.lado < 0 ? -hw : e, -hh, s.lado < 0 ? e + hw : hw - e, hh * 2);
        else ctx.strokeRect(-hw, s.lado < 0 ? -hh : e, hw * 2, s.lado < 0 ? e + hh : hh - e);
      }
    }
  }

  // ------------------------------------------------------------ avisos -----
  function desenharAviso(ctx, o, t, hw, hh, B, pisca, op) {
    const s = o.s;
    const prog = clamp((t - s.tA) / Math.max(0.001, s.t0 - s.tA), 0, 1);  // 0 → 1 até ativar
    const final = prog > 0.75;
    const forte = final || pisca;
    const red = op.reduzido;
    switch (s.k) {
      case BALA: {
        if (s.av === 'faixa') {
          const d = s.r * 2;
          ctx.globalAlpha = (forte ? 0.32 : 0.16) * (0.6 + 0.4 * prog);
          ctx.fillStyle = PAL.perigo;
          if (s.vy !== 0) ctx.fillRect(Math.round(s.x - s.r), -hh, d, hh * 2);
          else ctx.fillRect(-hw, Math.round(s.y - s.r), hw * 2, d);
          ctx.globalAlpha = 1;
          // seta na borda de entrada
          if (forte) desenharSeta(ctx, s, hw, hh, final ? PAL.branco : PAL.perigo);
        } else if (s.av === 'mira' && op.alma) {
          // linha de mira até a alma
          ctx.globalAlpha = forte ? 0.55 : 0.25;
          ctx.fillStyle = final ? PAL.branco : PAL.perigo;
          const dx = op.alma.x - s.x, dy = op.alma.y - s.y;
          const len = Math.hypot(dx, dy) || 1;
          for (let k = 0; k < len; k += 4) ctx.fillRect(Math.round(s.x + dx * k / len), Math.round(s.y + dy * k / len), 1, 1);
          ctx.globalAlpha = 1;
          const spr = Sprites.bala(s.r * 2, PAL.perigoEscuro, PAL.perigo, PAL.perigoEscuro);
          const sx = clamp(s.x, -hw + s.r, hw - s.r), sy = clamp(s.y, -hh + s.r, hh - s.r);
          if (forte) ctx.drawImage(spr, Math.round(sx - s.r), Math.round(sy - s.r));
        }
        break;
      }
      case LASER: {
        // faixa fraca com a largura real + linha central piscando
        ctx.save();
        if (!s.eixoAlinhado) ctx.rotate((s.ang) * Math.PI / 180);
        const vertical = s.eixoAlinhado && s.ang === -90;
        const w = s.w;
        const draw = (p, a) => {
          ctx.globalAlpha = a;
          if (!s.eixoAlinhado) ctx.fillRect(-400, Math.round(p - w / 2), 800, w);
          else if (vertical) ctx.fillRect(Math.round(p - w / 2), -hh, w, hh * 2);
          else ctx.fillRect(-hw, Math.round(p - w / 2), hw * 2, w);
        };
        ctx.fillStyle = PAL.perigo;
        if (s.p1 !== s.p0) {
          // laser que varre: mostra a área toda que ele vai percorrer
          const a = Math.min(s.p0, s.p1) - w / 2, b = Math.max(s.p0, s.p1) + w / 2;
          ctx.globalAlpha = 0.07;
          if (!s.eixoAlinhado) ctx.fillRect(-400, Math.round(a), 800, Math.round(b - a));
          else if (vertical) ctx.fillRect(Math.round(a), -hh, Math.round(b - a), hh * 2);
          else ctx.fillRect(-hw, Math.round(a), hw * 2, Math.round(b - a));
        }
        draw(s.p0, (forte ? 0.3 : 0.15) * (0.5 + 0.5 * prog));
        ctx.globalAlpha = 1;
        ctx.fillStyle = final ? PAL.branco : (pisca ? PAL.perigoClaro : PAL.perigo);
        if (forte || prog > 0.5) {
          if (!s.eixoAlinhado) ctx.fillRect(-400, Math.round(s.p0), 800, 1);
          else if (vertical) ctx.fillRect(Math.round(s.p0), -hh, 1, hh * 2);
          else ctx.fillRect(-hw, Math.round(s.p0), hw * 2, 1);
        }
        if (s.p1 !== s.p0 && forte && s.eixoAlinhado) {
          // setas indicando a direção da varredura
          const dir = Math.sign(s.p1 - s.p0);
          ctx.fillStyle = PAL.branco;
          for (const ao of [-0.5, 0, 0.5]) {
            const c = Math.round(ao * (vertical ? hh : hw));
            for (let k = 0; k < 3; k++) {
              const h = 1 + 2 * (2 - k);
              const q = Math.round(s.p0 + dir * (s.w / 2 + 2 + k));
              if (vertical) ctx.fillRect(q, c - (2 - k), 1, h);
              else ctx.fillRect(c - (2 - k), q, h, 1);
            }
          }
        }
        ctx.restore();
        break;
      }
      case PAREDE: {
        // área que vai ser ocupada + linha onde a parede para
        const e = s.fechada;
        ctx.globalAlpha = (forte ? 0.16 : 0.08);
        ctx.fillStyle = PAL.perigo;
        if (s.eixo === 'h') {
          if (s.lado < 0) ctx.fillRect(-hw, -hh, Math.round(e + hw), hh * 2);
          else ctx.fillRect(Math.round(e), -hh, Math.round(hw - e), hh * 2);
        } else {
          if (s.lado < 0) ctx.fillRect(-hw, -hh, hw * 2, Math.round(e + hh));
          else ctx.fillRect(-hw, Math.round(e), hw * 2, Math.round(hh - e));
        }
        ctx.globalAlpha = 1;
        if (forte) {
          ctx.fillStyle = final ? PAL.branco : PAL.perigo;
          const x = Math.round(e) - (s.lado > 0 ? 0 : 1);
          if (s.eixo === 'h') for (let y = -hh; y < hh; y += 4) ctx.fillRect(x, y, 1, 2);
          else for (let xx = -hw; xx < hw; xx += 4) ctx.fillRect(xx, x, 2, 1);
        }
        break;
      }
      case MURO: {
        // muro "fantasma" na borda de entrada, com o vão marcado
        ctx.globalAlpha = forte ? 0.3 : 0.14;
        ctx.fillStyle = PAL.perigo;
        const L = s.larg;
        const borda = -s.dir * (s.horiz ? hw : hh);
        const a0 = s.dir > 0 ? borda : borda - L;
        const g0 = s.g - s.esp / 2, g1 = s.g + s.esp / 2;
        if (s.horiz) {
          ctx.fillRect(Math.round(a0), -hh, L, Math.round(g0 + hh));
          ctx.fillRect(Math.round(a0), Math.round(g1), L, Math.round(hh - g1));
        } else {
          ctx.fillRect(-hw, Math.round(a0), Math.round(g0 + hw), L);
          ctx.fillRect(Math.round(g1), Math.round(a0), Math.round(hw - g1), L);
        }
        ctx.globalAlpha = 1;
        if (forte) {
          // colchetes brancos marcando o vão
          ctx.fillStyle = final ? PAL.branco : PAL.perigoClaro;
          if (s.horiz) { ctx.fillRect(Math.round(a0), Math.round(g0) - 1, L, 1); ctx.fillRect(Math.round(a0), Math.round(g1), L, 1); }
          else { ctx.fillRect(Math.round(g0) - 1, Math.round(a0), 1, L); ctx.fillRect(Math.round(g1), Math.round(a0), 1, L); }
        }
        break;
      }
      case ORBE: {
        if (t >= s.t0) break;
        const r = Math.max(2, s.raio * (1 - prog * 0.85));
        ctx.fillStyle = forte ? PAL.perigoClaro : PAL.perigo;
        anelPixel(ctx, s.x, s.y, r);
        // raios mostrando para onde as balas vão
        ctx.globalAlpha = forte ? 0.4 : 0.18;
        ctx.fillStyle = PAL.perigo;
        for (let i = 0; i < s.n; i++) {
          const a = s.giro + i * Math.PI * 2 / s.n;
          for (let k = r + 3; k < r + 22; k += 3) ctx.fillRect(Math.round(s.x + Math.cos(a) * k), Math.round(s.y + Math.sin(a) * k), 1, 1);
        }
        ctx.globalAlpha = 1;
        const nucleo = final ? 4 : 3;
        ctx.fillStyle = final ? PAL.branco : PAL.perigo;
        ctx.fillRect(Math.round(s.x - nucleo / 2), Math.round(s.y - nucleo / 2), nucleo, nucleo);
        break;
      }
      case EMISSOR: {
        const girando = t >= s.t0;
        const giro = girando ? s.giro * (Math.min(t, s.t1) - s.t0) / s.B : 0;
        ctx.fillStyle = girando ? PAL.perigoClaro : (forte ? PAL.perigoClaro : PAL.perigo);
        for (let a = 0; a < s.bracos; a++) {
          const ang = (s.ang0 + a * 360 / s.bracos + giro) * Math.PI / 180;
          const len = girando ? 8 : 5 + prog * 10;
          for (let k = 3; k < len; k += 2) ctx.fillRect(Math.round(s.x + Math.cos(ang) * k), Math.round(s.y + Math.sin(ang) * k), 1, 1);
        }
        ctx.fillStyle = forte || girando ? PAL.branco : PAL.perigo;
        ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4);
        if (!red && girando) { ctx.fillStyle = PAL.perigo; anelPixel(ctx, s.x, s.y, 5 + (pisca ? 1 : 0)); }
        break;
      }
    }
  }

  function desenharSeta(ctx, s, hw, hh, cor) {
    ctx.fillStyle = cor;
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.de === 'cima') { const yy = -hh + 1; ctx.fillRect(x - 3, yy, 7, 1); ctx.fillRect(x - 2, yy + 1, 5, 1); ctx.fillRect(x - 1, yy + 2, 3, 1); ctx.fillRect(x, yy + 3, 1, 1); }
    else if (s.de === 'baixo') { const yy = hh - 2; ctx.fillRect(x - 3, yy, 7, 1); ctx.fillRect(x - 2, yy - 1, 5, 1); ctx.fillRect(x - 1, yy - 2, 3, 1); ctx.fillRect(x, yy - 3, 1, 1); }
    else if (s.de === 'esquerda') { const xx = -hw + 1; ctx.fillRect(xx, y - 3, 1, 7); ctx.fillRect(xx + 1, y - 2, 1, 5); ctx.fillRect(xx + 2, y - 1, 1, 3); ctx.fillRect(xx + 3, y, 1, 1); }
    else if (s.de === 'direita') { const xx = hw - 2; ctx.fillRect(xx, y - 3, 1, 7); ctx.fillRect(xx - 1, y - 2, 1, 5); ctx.fillRect(xx - 2, y - 1, 1, 3); ctx.fillRect(xx - 3, y, 1, 1); }
  }

  function anelPixel(ctx, cx, cy, r) {
    const n = Math.max(12, Math.round(r * 5));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }

  // ------------------------------------------------------- lasers/paredes --
  function desenharLaser(ctx, o, t, hw, hh, destaque, op) {
    const s = o.s;
    let w = s.w;
    let alpha = 1;
    if (t >= s.t1) { const u = (t - s.t1) / CONFIG.ataques.sumicoLaser; w = s.w * (1 - u); alpha = 1 - u; }
    else if (t - s.t0 < 0.05) w = s.w + 4;            // estalo ao ligar
    if (w < 1) return;
    const vertical = s.eixoAlinhado && s.ang === -90;
    const flick = op.frame % 2 === 0;
    ctx.save();
    if (!s.eixoAlinhado) ctx.rotate(s.ang * Math.PI / 180);
    ctx.globalAlpha = alpha;
    const faixa = (p, larg, cor) => {
      ctx.fillStyle = cor;
      const a = Math.round(p - larg / 2), l = Math.max(1, Math.round(larg));
      if (!s.eixoAlinhado) ctx.fillRect(-400, a, 800, l);
      else if (vertical) ctx.fillRect(a, -hh, l, hh * 2);
      else ctx.fillRect(-hw, a, hw * 2, l);
    };
    const p = o.p;
    if (destaque && op.piscaMorte) faixa(p, w, PAL.branco);
    else {
      faixa(p, w, PAL.perigoEscuro);
      faixa(p, w - 2, PAL.perigo);
      faixa(p, Math.max(1, w * 0.4), flick ? PAL.perigoClaro : PAL.branco);
    }
    ctx.restore();
  }

  function desenharParede(ctx, o, t, hw, hh, destaque, op) {
    const s = o.s;
    const pad = padraoListras(ctx);
    ctx.fillStyle = destaque && op.piscaMorte ? PAL.branco : pad;
    if (s.k === PAREDE) {
      const e = Math.round(o.e);
      let x, y, w, h;
      if (s.eixo === 'h') {
        if (s.lado < 0) { x = -hw - 2; w = e - x; } else { x = e; w = hw + 2 - e; }
        y = -hh - 2; h = hh * 2 + 4;
      } else {
        if (s.lado < 0) { y = -hh - 2; h = e - y; } else { y = e; h = hh + 2 - e; }
        x = -hw - 2; w = hw * 2 + 4;
      }
      if (w <= 0 || h <= 0) return;
      ctx.fillRect(x, y, w, h);
      // borda interna brilhante
      ctx.fillStyle = destaque && op.piscaMorte ? PAL.branco : PAL.perigoClaro;
      if (s.eixo === 'h') ctx.fillRect(s.lado < 0 ? e - 2 : e, y, 2, h);
      else ctx.fillRect(x, s.lado < 0 ? e - 2 : e, w, 2);
    } else {
      const m = o.m, L = s.larg;
      const g0 = Math.round(s.g - s.esp / 2), g1 = Math.round(s.g + s.esp / 2);
      const a = Math.round(m - L / 2);
      if (s.horiz) {
        ctx.fillRect(a, -hh - 2, L, g0 + hh + 2);
        ctx.fillRect(a, g1, L, hh + 2 - g1);
        ctx.fillStyle = PAL.perigoClaro;
        ctx.fillRect(a, g0 - 1, L, 1); ctx.fillRect(a, g1, L, 1);
      } else {
        ctx.fillRect(-hw - 2, a, g0 + hw + 2, L);
        ctx.fillRect(g1, a, hw + 2 - g1, L);
        ctx.fillStyle = PAL.perigoClaro;
        ctx.fillRect(g0 - 1, a, 1, L); ctx.fillRect(g1, a, 1, L);
      }
    }
  }

  let padrao = null;
  function padraoListras(ctx) {
    if (padrao) return padrao;
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 8;
    const c = cv.getContext('2d');
    c.fillStyle = PAL.perigoEscuro; c.fillRect(0, 0, 8, 8);
    c.fillStyle = PAL.perigo;
    for (let i = 0; i < 8; i++) { c.fillRect(i, (i + 0) % 8, 1, 1); c.fillRect(i, (i + 1) % 8, 1, 1); c.fillRect(i, (i + 2) % 8, 1, 1); }
    padrao = ctx.createPattern(cv, 'repeat');
    return padrao;
  }

  function desenharMoeda(ctx, o, t, batida) {
    const s = o.s;
    const bob = Math.round(Math.sin(batida * Math.PI) * 1.5);
    const spr = Sprites.moeda(true);
    // brilho em volta
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 8);
    ctx.fillStyle = PAL.ouro;
    ctx.fillRect(Math.round(s.x) - 5, Math.round(s.y) - 5 + bob, 11, 11);
    ctx.globalAlpha = 1;
    ctx.drawImage(spr, Math.round(s.x) - 3, Math.round(s.y) - 3 + bob);
    // faísca
    const f = Math.floor(t * 6) % 4;
    ctx.fillStyle = PAL.branco;
    const sx = Math.round(s.x) + [4, -5, 3, -4][f], sy = Math.round(s.y) + [-5, -3, 4, 3][f] + bob;
    ctx.fillRect(sx, sy, 1, 1);
  }

  return { ataques, hitboxes };
})();
