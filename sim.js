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

    // Começa (ou recomeça) no tempo t0 com a alma no centro.
    reiniciar(t0) {
      t0 = finito(t0) ? clamp(t0, 0, this.c.duracao) : 0;
      this.t = t0;
      this.estado = 'jogando';           // jogando | morto | vitoria
      this.morte = null;                 // { t, pct, o, x, y }
      this.moedas = [false, false, false];
      this.raspoes = 0;
      const a = this.alma;
      a.x = 0; a.y = 0; a.vx = 0; a.vy = 0;
      this.eventos.length = 0;
      this.atualizarCaixa(t0);
      this.at.reiniciar(t0, a);
    }

    // Lê os modificadores no tempo t: a caixa encolhida aperta os limites da alma.
    atualizarCaixa(t) {
      const e = Patterns.estadoCaixa(this.c, t, this.est);
      const m = CONFIG.alma.margemParede;
      this.lim.x = Math.max(2, this.c.hw * e.largura - m);
      this.lim.y = Math.max(2, this.c.hh * e.altura - m);
      return e;
    }

    get prog() { return clamp(this.t / this.c.duracao, 0, 1); }

    // % mostrado ao morrer no tempo t (0–99; 100 só vencendo).
    pctDe(t) { return clamp(Math.floor(t / this.c.duracao * 100), 0, 99); }

    // Move a alma por dt segundos.
    // entrada = { dx, dy: direção do teclado (-1..1) na TELA (local: true = já na caixa, ex. bot),
    //             temAlvo, alvoX, alvoY: ponto que o dedo/mouse está segurando (px da caixa) }
    // O alvo é seguido na hora, até CONFIG.toque.velocidadeMax (sem buffer: nada se perde).
    mover(dt, e) {
      const a = this.alma;
      if (!(dt > 0)) { a.vx = 0; a.vy = 0; return; }
      let dx = e && finito(e.dx) ? clamp(e.dx, -1, 1) : 0;
      let dy = e && finito(e.dy) ? clamp(e.dy, -1, 1) : 0;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      if (!(e && e.local)) {
        const d = telaParaCaixa(this.est, dx, dy, this._dir);
        dx = d.x; dy = d.y;
      }
      const v = CONFIG.alma.velocidade;
      let mx = dx * v * dt, my = dy * v * dt;
      if (e && e.temAlvo && finito(e.alvoX) && finito(e.alvoY)) {
        const ax = e.alvoX - a.x, ay = e.alvoY - a.y;
        const d = Math.hypot(ax, ay);
        if (d > 0) {
          const k = Math.min(1, CONFIG.toque.velocidadeMax * dt / d);
          mx += ax * k; my += ay * k;
        }
      }
      const L = this.lim;
      let nx = clamp(a.x + mx, -L.x, L.x), ny = clamp(a.y + my, -L.y, L.y);
      if (!finito(nx) || !finito(ny)) { nx = a.x; ny = a.y; }   // nunca NaN (B15)
      a.vx = (nx - a.x) / dt; a.vy = (ny - a.y) / dt;
      a.x = nx; a.y = ny;
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
        let m = this.at.testar(ts, px, py, CONFIG.alma.raioHitbox, CONFIG.alma.raioRaspao, R, M);
        let espelhada = false;
        if (!m && est.espelho) {
          // alma espelhada: as duas precisam sobreviver
          const q = Patterns.espelhar(est.espelho, px, py, this._espelho);
          m = this.at.testar(ts, q.x, q.y, CONFIG.alma.raioHitbox, CONFIG.alma.raioRaspao, R, M);
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
