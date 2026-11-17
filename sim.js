'use strict';
// =============================================================================
// DODGE — sim.js
// Simulação PURA de uma tentativa: alma, movimento, colisão em sub-passos,
// raspão, moedas, morte e vitória. Sem canvas, sem áudio, sem DOM: roda igual
// no navegador e no Node (testes, solver, bots).
//
// O tempo vem de fora: no jogo é a posição da música (relógio do áudio); nos
// testes e no solver é um número qualquer. Mesmo tempo + mesma entrada =
// mesmo resultado, sempre.
// =============================================================================

const Sim = (() => {
  const finito = Number.isFinite;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Direção ou deslocamento na TELA → na CAIXA: controles invertidos (na tela) e caixa
  // girada (gira ao contrário). Usado pelo teclado (aqui) e pelo arrasto (game.js).
  function telaParaCaixa(est, dx, dy, out) {
    if (est.invX) dx = -dx;
    if (est.invY) dy = -dy;
    if (est.rad) {
      const c = Math.cos(est.rad), sn = Math.sin(est.rad);
      const lx = dx * c + dy * sn;
      dy = -dx * sn + dy * c; dx = lx;
    }
    out.x = dx; out.y = dy;
    return out;
  }

  class Corrida {
    // comp = Patterns.compilar(fase, CONFIG.caixa)
    constructor(comp) {
      this.c = comp;
      this.at = new Patterns.Ataques(comp);
      this.alma = { x: 0, y: 0, vx: 0, vy: 0 };
      this.lim = { x: comp.hw - CONFIG.alma.margemParede, y: comp.hh - CONFIG.alma.margemParede };
      this.est = {};                     // estado da caixa (tamanho, giro, escuro, inversão, espelho)
      this._espelho = { x: 0, y: 0 };
      this._dir = { x: 0, y: 0 };
      this.eventos = [];                 // saída de cada passo (reaproveitada)
      this._raspoes = [];
      this._moedas = [];
      this.invencivel = false;
      this.at.aoEvento = (tipo, o) => this.eventos.push({ tipo: 'ativou', o });
      this.reiniciar(0);
    }

    // Começa (ou recomeça) no tempo t0 com a alma no centro (ou em x, y: checkpoint do treino).
    reiniciar(t0, x, y) {
      t0 = finito(t0) ? clamp(t0, 0, this.c.duracao) : 0;
      this.t = t0;
      this.estado = 'jogando';           // jogando | morto | vitoria
      this.morte = null;                 // { t, pct, o, x, y }
      this.moedas = [false, false, false];
      this.raspoes = 0;
      const a = this.alma;
      a.vx = 0; a.vy = 0;
      this.eventos.length = 0;
      this.modo = null;
      this.atualizarCaixa(t0);
      a.x = finito(x) ? clamp(x, -this.lim.x, this.lim.x) : 0;
      a.y = finito(y) ? clamp(y, -this.lim.y, this.lim.y) : 0;
      this.at.reiniciar(t0, a);
    }

    // Lê os modificadores no tempo t: a caixa encolhida aperta os limites da alma.
    atualizarCaixa(t) {
      const e = Patterns.estadoCaixa(this.c, t, this.est);
      const m = CONFIG.alma.margemParede;
      this.lim.x = Math.max(2, this.c.hw * e.largura - m);
      this.lim.y = Math.max(2, this.c.hh * e.altura - m);
      if (e.modo !== this.modo) this.entrarModo(e.modo);
      return e;
    }

    // ------------------------------------------------------------ modos ---
    // Passou por um portal: prepara o modo novo a partir de onde a alma está.
    entrarModo(m) {
      const a = this.alma;
      this.modo = m;
      a.chao = false; a.tChao = 9; a.bufferPulo = 0;
      if (m === 'trilhos') { a.trilho = this.trilhoMaisPerto(a.y); a.trilhoAlvo = a.trilho; }
      if (m === 'gravidade') a.vy = 0;
      if (m === 'escudo' && !(a.escudo >= 0)) a.escudo = 0;
    }
    // altura de cada trilho (px da caixa), de cima pra baixo
    trilhosY() {
      const n = this.est.linhas || CONFIG.modos.trilhos.linhas, Y = this.lim.y * CONFIG.modos.trilhos.alcance;
      if (!this._trilhos || this._trilhos.length !== n) this._trilhos = new Array(n).fill(0);
      for (let i = 0; i < n; i++) this._trilhos[i] = -Y + i * 2 * Y / (n - 1);
      return this._trilhos;
    }
    trilhoMaisPerto(y) {
      const ys = this.trilhosY();
      let m = 0;
      for (let i = 1; i < ys.length; i++) if (Math.abs(ys[i] - y) < Math.abs(ys[m] - y)) m = i;
      return m;
    }
    // raio da hitbox agora (no modo mini a alma encolhe)
    raioHit() { return CONFIG.alma.raioHitbox * (this.modo === 'mini' ? CONFIG.modos.mini.escala : 1); }
    raioRaspao() { return CONFIG.alma.raioRaspao * (this.modo === 'mini' ? CONFIG.modos.mini.escala : 1); }

    get prog() { return clamp(this.t / this.c.duracao, 0, 1); }

    // % mostrado ao morrer no tempo t (0–99; 100 só vencendo).
    pctDe(t) { return clamp(Math.floor(t / this.c.duracao * 100), 0, 99); }

    // Move a alma por dt segundos.
    // entrada = { dx, dy: direção do teclado (-1..1) na TELA (local: true = já na caixa, ex. bot),
    //             temAlvo, alvoX, alvoY: ponto que o dedo/mouse está segurando (px da caixa),
    //             pulo: apertou pular (gravidade), trilho: -1/+1 troca de trilho (trilhos),
    //             escudo: 0 cima, 1 direita, 2 baixo, 3 esquerda (escudo; já na caixa) }
    // O alvo é seguido na hora, até CONFIG.toque.velocidadeMax (sem buffer: nada se perde).
    mover(dt, e) {
      const a = this.alma;
      if (!(dt > 0)) {
        // frame sem tempo (o relógio do áudio não andou): no gelo e na gravidade a velocidade é estado, não zera
        if (this.modo !== 'gelo' && this.modo !== 'gravidade') { a.vx = 0; a.vy = 0; }
        return;
      }
      let dx = e && finito(e.dx) ? clamp(e.dx, -1, 1) : 0;
      let dy = e && finito(e.dy) ? clamp(e.dy, -1, 1) : 0;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      if (!(e && e.local)) {
        const d = telaParaCaixa(this.est, dx, dy, this._dir);
        dx = d.x; dy = d.y;
      }
      const alvo = e && e.temAlvo && finito(e.alvoX) && finito(e.alvoY);
      switch (this.modo) {
        case 'gravidade': this.moverGravidade(dt, e, dx, alvo); break;
        case 'trilhos': this.moverTrilhos(dt, e, dx, alvo); break;
        case 'escudo': this.moverEscudo(dt, e, dx, dy); break;
        case 'gelo': this.moverGelo(dt, e, dx, dy, alvo); break;
        default: this.moverLivre(dt, e, dx, dy, alvo, this.modo === 'mini' ? CONFIG.modos.mini.vel : 1);
      }
      if (!finito(a.x) || !finito(a.y)) { a.x = 0; a.y = 0; a.vx = 0; a.vy = 0; }   // nunca NaN (B15)
    }

    // Livre (e mini): teclado + o ponto que o dedo segura.
    moverLivre(dt, e, dx, dy, alvo, fator) {
      const a = this.alma, v = CONFIG.alma.velocidade * fator;
      let mx = dx * v * dt, my = dy * v * dt;
      if (alvo) {
        const ax = e.alvoX - a.x, ay = e.alvoY - a.y;
        const d = Math.hypot(ax, ay);
        if (d > 0) {
          const k = Math.min(1, CONFIG.toque.velocidadeMax * dt / d);
          mx += ax * k; my += ay * k;
        }
      }
      const L = this.lim;
      let nx = clamp(a.x + mx, -L.x, L.x), ny = clamp(a.y + my, -L.y, L.y);
      if (!finito(nx) || !finito(ny)) { nx = a.x; ny = a.y; }
      a.vx = (nx - a.x) / dt; a.vy = (ny - a.y) / dt;
      a.x = nx; a.y = ny;
    }

    // x de quem segue o dedo (gravidade e trilhos: o dedo só manda nos lados)
    seguirX(dt, e, dx, alvo, v) {
      const a = this.alma;
      let nx = a.x + dx * v * dt;
      if (alvo) {
        const tx = e.alvoX - a.x, d = Math.abs(tx);
        if (d > 0) nx += tx * Math.min(1, CONFIG.toque.velocidadeMax * dt / d);
      }
      return clamp(nx, -this.lim.x, this.lim.x);
    }

    // Gelo: a entrada acelera; a alma desliza, perde velocidade devagar e quica nas paredes.
    moverGelo(dt, e, dx, dy, alvo) {
      const G = CONFIG.modos.gelo, a = this.alma, L = this.lim;
      let ax = dx * G.acel, ay = dy * G.acel;
      if (alvo) {
        const tx = e.alvoX - a.x, ty = e.alvoY - a.y, d = Math.hypot(tx, ty);
        if (d > G.zonaAlvo) { ax += tx / d * G.acel; ay += ty / d * G.acel; }
      }
      a.vx = (finito(a.vx) ? a.vx : 0) + ax * dt; a.vy = (finito(a.vy) ? a.vy : 0) + ay * dt;
      const f = Math.exp(-G.atrito * dt);
      a.vx *= f; a.vy *= f;
      const sp = Math.hypot(a.vx, a.vy);
      if (sp > G.velMax) { a.vx *= G.velMax / sp; a.vy *= G.velMax / sp; }
      let nx = a.x + a.vx * dt, ny = a.y + a.vy * dt;
      if (nx > L.x) { nx = L.x; a.vx = -Math.abs(a.vx) * G.quique; } else if (nx < -L.x) { nx = -L.x; a.vx = Math.abs(a.vx) * G.quique; }
      if (ny > L.y) { ny = L.y; a.vy = -Math.abs(a.vy) * G.quique; } else if (ny < -L.y) { ny = -L.y; a.vy = Math.abs(a.vy) * G.quique; }
      a.x = nx; a.y = ny;
    }

    // Gravidade: cai (pra baixo ou pra cima), pula do chão ou de uma plataforma, anda pros lados.
    moverGravidade(dt, e, dx, alvo) {
      const G = CONFIG.modos.gravidade, a = this.alma, L = this.lim, g = this.est.grav || 1;
      const nx = this.seguirX(dt, e, dx, alvo, G.velX);
      if (e && e.pulo) a.bufferPulo = G.buffer;
      a.tChao += dt; a.bufferPulo -= dt;
      if (a.bufferPulo > 0 && (a.chao || a.tChao < G.coiote)) { a.vy = -G.pulo * g; a.chao = false; a.tChao = 9; a.bufferPulo = 0; }
      if (!finito(a.vy)) a.vy = 0;
      a.vy += G.g * g * dt;
      if (a.vy * g > G.velMaxQueda) a.vy = G.velMaxQueda * g;
      let ny = a.y + a.vy * dt;
      const chaoY = g > 0 ? L.y : -L.y;
      a.chao = false;
      if ((ny - chaoY) * g >= 0) { ny = chaoY; a.vy = 0; a.chao = true; }
      else if ((-chaoY - ny) * g > 0) { ny = -chaoY; if (a.vy * g < 0) a.vy = 0; }
      // plataformas: só seguram quem cai em cima delas (atravessa por baixo)
      if (a.vy * g >= 0 && !a.chao) {
        const m = CONFIG.alma.margemParede, esp = CONFIG.modos.plataforma.espessura, at = this.at;
        for (let i = 0; i < at.n; i++) {
          const s = at.vivos[i].s;
          if (s.k !== Patterns.TIPOS.PLATAFORMA || this._tMover < s.t0 || this._tMover >= s.tF) continue;
          if (Math.abs(nx - s.x) > s.larg / 2) continue;
          const pouso = g > 0 ? s.y - m : s.y + esp + m;     // onde o centro da alma fica em cima dela
          if ((a.y - pouso) * g <= 1e-6 && (ny - pouso) * g >= 0) { ny = pouso; a.vy = 0; a.chao = true; break; }
        }
      }
      if (a.chao) a.tChao = 0;
      a.vx = (nx - a.x) / dt;
      a.x = nx; a.y = ny;
    }

    // Trilhos: presa em 3 a 5 linhas; desliza pra de cima ou de baixo; anda pros lados.
    moverTrilhos(dt, e, dx, alvo) {
      const a = this.alma, ys = this.trilhosY();
      if (e && e.trilho) a.trilhoAlvo = clamp((a.trilhoAlvo | 0) + Math.sign(e.trilho), 0, ys.length - 1);
      a.trilhoAlvo = clamp(a.trilhoAlvo | 0, 0, ys.length - 1);
      const nx = this.seguirX(dt, e, dx, alvo, CONFIG.alma.velocidade);
      const yAlvo = ys[a.trilhoAlvo], p = CONFIG.modos.trilhos.velTroca * dt;
      const ny = Math.abs(yAlvo - a.y) <= p ? yAlvo : a.y + Math.sign(yAlvo - a.y) * p;
      if (ny === yAlvo) a.trilho = a.trilhoAlvo;
      a.vx = (nx - a.x) / dt; a.vy = (ny - a.y) / dt;
      a.x = nx; a.y = ny;
    }

    // Escudo: a alma vai pro centro e fica; o escudo vira pro lado escolhido.
    moverEscudo(dt, e, dx, dy) {
      const a = this.alma, S = CONFIG.modos.escudo;
      const d = Math.hypot(a.x, a.y), p = S.velCentro * dt;
      const nx = d <= p ? 0 : a.x - a.x / d * p, ny = d <= p ? 0 : a.y - a.y / d * p;
      if (e && finito(e.escudo) && e.escudo >= 0) a.escudo = e.escudo & 3;
      else if (dx || dy) a.escudo = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      a.vx = (nx - a.x) / dt; a.vy = (ny - a.y) / dt;
      a.x = nx; a.y = ny;
    }

    // Escudo: projétil que chega no raio do escudo, do lado em que ele está, some (bloqueado).
    bloquear(t, px, py) {
      const S = CONFIG.modos.escudo, at = this.at, a = this.alma;
      const dirX = [0, 1, 0, -1][a.escudo | 0], dirY = [-1, 0, 1, 0][a.escudo | 0];
      const cosMin = Math.cos(S.abertura / 2 * Math.PI / 180);
      for (let i = 0; i < at.n; i++) {
        const o = at.vivos[i], s = o.s;
        if (s.k !== Patterns.TIPOS.BALA || o.morto || t < s.t0) continue;
        const bx = at.xBala(o, t) - px, by = at.yBala(o, t) - py, d = Math.hypot(bx, by);
        if (d - s.hr > S.raio || d < 1e-6) continue;
        if ((bx * dirX + by * dirY) / d >= cosMin) { o.morto = true; this.eventos.push({ tipo: 'bloqueio', o }); }
      }
    }

    // Avança até o tempo t com a entrada dada. Devolve os eventos do passo:
    // { tipo: 'ativou' | 'raspao' | 'moeda' | 'morte' | 'vitoria', ... }
    passo(t, entrada) {
      const ev = this.eventos;
      ev.length = 0;
      if (this.estado !== 'jogando') return ev;
      const dur = this.c.duracao;
      if (!finito(t) || t < this.t) t = this.t;
      const alvo = Math.min(t, dur);                 // nada é testado depois do fim (B01)
      let dts = alvo - this.t;
      if (dts > CONFIG.sim.passoMax) dts = CONFIG.sim.passoMax;
      const tIni = alvo - dts;
      const a = this.alma;
      const ox = a.x, oy = a.y;
      const est = this.atualizarCaixa(alvo);
      this._tMover = alvo;
      this.mover(dts, entrada);
      this.at.atualizar(alvo, dts, a);
      // colisão em sub-passos: nada atravessa nada, mesmo com frame lento
      const dist = Math.hypot(a.x - ox, a.y - oy);
      const porEspaco = Math.ceil(Math.max(dist, this.c.velMax * dts) / CONFIG.sim.distSubpasso);
      const porTempo = Math.ceil(dts / CONFIG.sim.dtSubpasso);   // morte no instante certo (B09)
      const passos = clamp(Math.max(porEspaco, porTempo), 1, CONFIG.sim.subpassosMax);
      const ultimo = dur - 1e-6;                                  // o instante final já é vitória (B01)
      const R = this._raspoes, M = this._moedas;
      R.length = 0; M.length = 0;
      let matou = null, mx = a.x, my = a.y, mt = alvo;
      for (let k = 1; k <= passos; k++) {
        const f = k / passos;
        const ts = Math.min(tIni + dts * f, ultimo);
        const px = ox + (a.x - ox) * f, py = oy + (a.y - oy) * f;
        if (this.modo === 'escudo') this.bloquear(ts, px, py);
        let m = this.at.testar(ts, px, py, this.raioHit(), this.raioRaspao(), R, M);
        let espelhada = false;
        if (!m && est.espelho) {
          // alma espelhada: as duas precisam sobreviver
          const q = Patterns.espelhar(est.espelho, px, py, this._espelho);
          m = this.at.testar(ts, q.x, q.y, this.raioHit(), this.raioRaspao(), R, M);
          espelhada = !!m;
        }
        if (m && !this.invencivel) {
          matou = m; mt = ts; mx = px; my = py;
          this._morteEspelho = espelhada;
          break;
        }
      }
      if (matou) {
        a.x = mx; a.y = my;
        this.morrer(matou, mt);
        return ev;
      }
      for (let i = 0; i < M.length; i++) {
        const s = M[i];
        if (s.id >= 0 && s.id < 3) this.moedas[s.id] = true;
        ev.push({ tipo: 'moeda', s });
      }
      for (let i = 0; i < R.length; i++) { this.raspoes++; ev.push({ tipo: 'raspao', o: R[i] }); }
      this.t = alvo;
      if (t >= dur) {
        this.estado = 'vitoria';
        ev.push({ tipo: 'vitoria' });
      }
      return ev;
    }

    // Morte no tempo exato da colisão: o % sai daqui (B09).
    morrer(o, t) {
      this.t = finito(t) ? t : this.t;
      this.estado = 'morto';
      this.at.destaque = o;
      let x = this.alma.x, y = this.alma.y;
      if (this._morteEspelho) { const q = Patterns.espelhar(this.est.espelho, x, y, this._espelho); x = q.x; y = q.y; }
      this._morteEspelho = false;
      this.morte = { t: this.t, pct: this.pctDe(this.t), o, x, y };
      this.eventos.push(Object.assign({ tipo: 'morte' }, this.morte));
    }
  }

  return { Corrida, telaParaCaixa };
})();
