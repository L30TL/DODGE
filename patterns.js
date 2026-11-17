'use strict';
// =============================================================================
// DODGE — patterns.js
// Padrões de ataque reutilizáveis. Cada evento da fase vira uma lista de
// "specs" (projéteis com hora pra aparecer, ativar e sumir). A posição de cada
// projétil é uma FUNÇÃO DO TEMPO DA MÚSICA — por isso a fase é 100%
// determinística e dá pra pular pra qualquer % na hora.
//
// Coordenadas: relativas ao CENTRO da caixa, em px. x pra direita, y pra baixo.
// Nas fases, posições são normalizadas de -1 (esquerda/topo) a 1 (direita/baixo).
//
// Padrões (tipo do evento):
//   chuva       balas atravessando a caixa em faixas (de cima, baixo, esquerda ou direita)
//   laser       feixe que atravessa a caixa, com aviso antes de ligar
//   paredes     duas paredes fecham deixando um corredor  (modo 'buraco': muro com vão que varre a caixa)
//   espiral     emissor gira atirando em braços
//   fogo        fogo cruzado: balas dos dois lados, intercaladas
//   teleguiada  onda de tiros mirando a alma (com curva opcional)
//   anel        orbe que explode num anel de balas
//   moeda       moeda secreta
// =============================================================================

const Patterns = (() => {
  // tipos de spec (números são mais rápidos que strings no loop)
  const BALA = 1, LASER = 2, PAREDE = 3, MURO = 4, ORBE = 5, EMISSOR = 6, MOEDA = 7;
  const FORA = 24; // px — o quanto as paredes passam da borda da caixa

  // ======================================================== COMPILAÇÃO =====
  // fase -> { specs[], duracao, B (s por batida), velMax }
  function compilar(fase, caixa) {
    const B = 60 / fase.bpm;
    const hw = caixa.largura / 2, hh = caixa.altura / 2;
    const demonio = fase.dificuldade === 'demonio';
    const specs = [];
    let ordem = 0;
    const C = {
      B, hw, hh,
      t: (b) => b * B,
      // aviso em segundos, respeitando o mínimo (até Insane)
      aviso(ev) {
        const bat = ev.aviso !== undefined ? ev.aviso : CONFIG.ataques.avisoPadraoBatidas;
        let s = bat * B;
        if (!demonio) s = Math.max(s, CONFIG.ataques.avisoMinimoS, (CONFIG.ataques.avisoMinimoBatidas || 0) * B);
        return s;
      },
      add(spec, ev, idx) {
        spec.ordem = ordem++;
        spec.ev = idx;
        spec.batida = ev.batida;
        specs.push(spec);
        return spec;
      },
    };
    fase.eventos.forEach((ev, idx) => {
      const g = GERADORES[ev.tipo];
      if (!g) { if (typeof console !== 'undefined') console.warn('[Dodge] tipo de evento desconhecido:', ev.tipo); return; }
      g(ev, C, idx);
    });
    specs.sort((a, b) => a.tA - b.tA || a.ordem - b.ordem);
    let velMax = 0;
    for (const s of specs) if (s.k === BALA) velMax = Math.max(velMax, Math.hypot(s.vx, s.vy), s.vel || 0);
    for (const s of specs) if (s.k === MURO) velMax = Math.max(velMax, s.vel);
    return { specs, duracao: fase.duracaoBatidas * B, B, hw, hh, velMax, fase };
  }

  // ---------------------------------------------------------- helpers ------
  const arr = (v, def) => (v === undefined ? [def] : Array.isArray(v) ? v : [v]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Tempo até uma bala linear sair da caixa (+ margem).
  function tempoSaida(x, y, vx, vy, r, hw, hh) {
    let tt = Infinity;
    const m = r + 3;
    if (vx > 1e-6) tt = Math.min(tt, (hw + m - x) / vx);
    else if (vx < -1e-6) tt = Math.min(tt, (-hw - m - x) / vx);
    if (vy > 1e-6) tt = Math.min(tt, (hh + m - y) / vy);
    else if (vy < -1e-6) tt = Math.min(tt, (-hh - m - y) / vy);
    return tt === Infinity ? 30 : Math.max(0, tt);
  }

  // Bala que entra por uma borda e atravessa a caixa.
  function balaDaBorda(C, ev, idx, de, pos, t0, vel, tam, avisoS, extra) {
    const r = tam / 2;
    let x, y, vx = 0, vy = 0;
    if (de === 'cima' || de === 'baixo') {
      x = clamp(pos * C.hw, -C.hw + r, C.hw - r);
      y = de === 'cima' ? -C.hh - r : C.hh + r;
      vy = de === 'cima' ? vel : -vel;
    } else {
      y = clamp(pos * C.hh, -C.hh + r, C.hh - r);
      x = de === 'esquerda' ? -C.hw - r : C.hw + r;
      vx = de === 'esquerda' ? vel : -vel;
    }
    const spec = { k: BALA, tA: t0 - avisoS, t0, tF: t0 + tempoSaida(x, y, vx, vy, r, C.hw, C.hh),
      x, y, vx, vy, r, hr: Math.max(1, r - CONFIG.ataques.folgaHitbox), av: 'faixa', de };
    return C.add(Object.assign(spec, extra || {}), ev, idx);
  }

  // ======================================================== GERADORES ======
  const GERADORES = {
    // { batida, tipo:'chuva', pos: -1..1 ou [..], de:'cima', vel, tam, intervalo, aviso }
    chuva(ev, C, idx) {
      const posicoes = arr(ev.pos, 0);
      const de = ev.de || 'cima';
      const vel = ev.vel || CONFIG.ataques.velocidadeBala;
      const tam = ev.tam || CONFIG.ataques.tamanhoBala;
      const av = C.aviso(ev);
      posicoes.forEach((p, i) => {
        balaDaBorda(C, ev, idx, de, p, C.t(ev.batida + i * (ev.intervalo || 0)), vel, tam, av);
      });
    },

    // { batida, tipo:'fogo', pos:[..], eixo:'h'|'v', vel, tam, intervalo, alternar:true, aviso }
    fogo(ev, C, idx) {
      const posicoes = arr(ev.pos, 0);
      const eixo = ev.eixo || 'h';
      const vel = ev.vel || CONFIG.ataques.velocidadeBala;
      const tam = ev.tam || CONFIG.ataques.tamanhoBala;
      const av = C.aviso(ev);
      const alternar = ev.alternar !== false;
      posicoes.forEach((p, i) => {
        const t0 = C.t(ev.batida + i * (ev.intervalo || 0));
        const lados = eixo === 'h' ? ['esquerda', 'direita'] : ['cima', 'baixo'];
        if (alternar) balaDaBorda(C, ev, idx, lados[i % 2], p, t0, vel, tam, av);
        else for (const l of lados) balaDaBorda(C, ev, idx, l, p, t0, vel, tam, av);
      });
    },

    // { batida, tipo:'laser', pos, orient:'v'|'h'|graus, larg, dur, ate, intervalo, aviso }
    laser(ev, C, idx) {
      const posicoes = arr(ev.pos, 0);
      const larg = ev.larg || CONFIG.ataques.larguraLaser;
      const dur = (ev.dur !== undefined ? ev.dur : CONFIG.ataques.duracaoLaser) * C.B;
      const av = C.aviso(ev);
      let ang, escala;
      if (ev.orient === 'h') { ang = 0; escala = C.hh; }
      else if (ev.orient === undefined || ev.orient === 'v') { ang = -90; escala = C.hw; }
      else { ang = +ev.orient; escala = C.hh; }
      const rad = ang * Math.PI / 180;
      const nx = -Math.sin(rad), ny = Math.cos(rad);
      posicoes.forEach((p, i) => {
        const t0 = C.t(ev.batida + i * (ev.intervalo || 0));
        const p0 = p * escala;
        const p1 = ev.ate !== undefined ? (Array.isArray(ev.ate) ? ev.ate[i] : ev.ate) * escala : p0;
        C.add({ k: LASER, tA: t0 - av, t0, t1: t0 + dur, tF: t0 + dur + CONFIG.ataques.sumicoLaser,
          ang, nx, ny, p0, p1, w: larg, hr: Math.max(1, larg / 2 - CONFIG.ataques.folgaHitbox),
          eixoAlinhado: ev.orient === undefined || ev.orient === 'v' || ev.orient === 'h',
          som: 'laser', tSom: t0, tremida: CONFIG.juice.tremidaLaser, flash: CONFIG.juice.flashLaser }, ev, idx);
      });
    },

    // { batida, tipo:'paredes', eixo:'h'|'v', centro, espaco, fechar, segurar, abrir, aviso }
    // { batida, tipo:'paredes', modo:'buraco', de, centro (ou [..]), espaco, vel, larg, intervalo, aviso }
    paredes(ev, C, idx) {
      const av = C.aviso(ev);
      if (ev.modo === 'buraco') {
        const centros = arr(ev.centro, 0);
        const de = ev.de || 'esquerda';
        const vel = ev.vel || 90;
        const larg = ev.larg || 10;
        const esp = ev.espaco || 40;
        centros.forEach((c, i) => {
          const t0 = C.t(ev.batida + i * (ev.intervalo || 0));
          const horiz = de === 'esquerda' || de === 'direita';      // muro vertical andando na horizontal
          const ext = horiz ? C.hw : C.hh;                              // meia-distância percorrida
          const extGap = horiz ? C.hh : C.hw;
          const g = clamp(c * extGap, -extGap + esp / 2, extGap - esp / 2);
          const dir = (de === 'esquerda' || de === 'cima') ? 1 : -1;
          const m0 = -dir * (ext + larg / 2 + 1);
          const percurso = 2 * ext + larg + 2;
          C.add({ k: MURO, tA: t0 - av, t0, tF: t0 + percurso / vel, horiz, dir, m0, vel, larg, g, esp,
            hrFolga: CONFIG.ataques.folgaHitbox }, ev, idx);
        });
        return;
      }
      const eixo = ev.eixo || 'h';
      const ext = eixo === 'h' ? C.hw : C.hh;
      const esp = ev.espaco || 48;
      const c = clamp((ev.centro || 0) * ext, -ext + esp / 2, ext - esp / 2);
      const t0 = C.t(ev.batida);
      const tC = t0 + (ev.fechar !== undefined ? ev.fechar : 1) * C.B;
      const tO = tC + (ev.segurar !== undefined ? ev.segurar : 2) * C.B;
      const tF = tO + (ev.abrir !== undefined ? ev.abrir : 1) * C.B;
      for (const lado of [-1, 1]) {
        const recolhida = lado * (ext + 2);           // borda interna quando escondida
        const fechada = c + lado * esp / 2;           // borda interna quando fechada
        C.add({ k: PAREDE, tA: t0 - av, t0, tC, tO, tF, eixo, lado, recolhida, fechada,
          som: 'parede', tSom: tC, tremida: CONFIG.juice.tremidaParede }, ev, idx);
      }
    },

    // { batida, tipo:'espiral', x, y, bracos, giro (graus/batida), dur, cadencia, vel, tam, ang, aviso }
    espiral(ev, C, idx) {
      const ex = (ev.x || 0) * C.hw, ey = (ev.y || 0) * C.hh;
      const bracos = ev.bracos || 3;
      const giro = ev.giro !== undefined ? ev.giro : 30;
      const dur = ev.dur !== undefined ? ev.dur : 4;
      const cad = ev.cadencia || 2;
      const vel = ev.vel || CONFIG.ataques.velocidadeBala;
      const tam = ev.tam || CONFIG.ataques.tamanhoBala;
      const ang0 = ev.ang !== undefined ? ev.ang : 90;
      const av = C.aviso(ev);
      const t0 = C.t(ev.batida), t1 = t0 + dur * C.B;
      C.add({ k: EMISSOR, tA: t0 - av, t0, t1, tF: t1 + 0.25, x: ex, y: ey, bracos, giro, ang0, B: C.B }, ev, idx);
      const tiros = Math.max(1, Math.round(dur * cad));
      const r = tam / 2;
      for (let k = 0; k < tiros; k++) {
        const tk = t0 + (k / cad) * C.B;
        for (let a = 0; a < bracos; a++) {
          const ang = (ang0 + a * 360 / bracos + giro * k / cad) * Math.PI / 180;
          const vx = Math.cos(ang) * vel, vy = Math.sin(ang) * vel;
          C.add({ k: BALA, tA: tk, t0: tk, tF: tk + tempoSaida(ex, ey, vx, vy, r, C.hw, C.hh),
            x: ex, y: ey, vx, vy, r, hr: Math.max(1, r - CONFIG.ataques.folgaHitbox), av: null }, ev, idx);
        }
      }
    },

    // { batida, tipo:'teleguiada', de, pos, quantidade, intervalo, vel, tam, guia (graus/s), aviso }
    teleguiada(ev, C, idx) {
      const n = ev.quantidade || 3;
      const de = ev.de || 'cima';
      const posicoes = arr(ev.pos, 0);
      const vel = ev.vel || CONFIG.ataques.velocidadeBala;
      const tam = ev.tam || CONFIG.ataques.tamanhoBala;
      const av = C.aviso(ev);
      const r = tam / 2;
      for (let i = 0; i < n; i++) {
        const p = posicoes[i % posicoes.length];
        let x, y;
        if (de === 'cima' || de === 'baixo') { x = clamp(p * C.hw, -C.hw + r, C.hw - r); y = de === 'cima' ? -C.hh - r : C.hh + r; }
        else { y = clamp(p * C.hh, -C.hh + r, C.hh - r); x = de === 'esquerda' ? -C.hw - r : C.hw + r; }
        const t0 = C.t(ev.batida + i * (ev.intervalo !== undefined ? ev.intervalo : 1));
        const vida = (2 * Math.hypot(C.hw, C.hh) + 20) / vel;
        C.add({ k: BALA, tA: t0 - av, t0, tF: t0 + vida, x, y, vx: 0, vy: 0, vel, r,
          hr: Math.max(1, r - CONFIG.ataques.folgaHitbox), av: 'mira', mira: true, guia: ev.guia || 0,
          guiaDur: (ev.guiaDur !== undefined ? ev.guiaDur : 1.5) * C.B }, ev, idx);
      }
    },

    // { batida, tipo:'anel', x, y, quantidade, vel, tam, giro (graus), raio, aviso }
    anel(ev, C, idx) {
      const ex = (ev.x || 0) * C.hw, ey = (ev.y || 0) * C.hh;
      const n = ev.quantidade || 12;
      const vel = ev.vel || CONFIG.ataques.velocidadeBala;
      const tam = ev.tam || CONFIG.ataques.tamanhoBala;
      const giro = (ev.giro || 0) * Math.PI / 180;
      const av = C.aviso(ev);
      const t0 = C.t(ev.batida);
      C.add({ k: ORBE, tA: t0 - av, t0, tF: t0 + 0.02, x: ex, y: ey, n, giro, raio: ev.raio || 18,
        som: 'explosao', tSom: t0, tremida: CONFIG.juice.tremidaExplosao }, ev, idx);
      const r = tam / 2;
      for (let i = 0; i < n; i++) {
        const a = giro + i * Math.PI * 2 / n;
        const vx = Math.cos(a) * vel, vy = Math.sin(a) * vel;
        C.add({ k: BALA, tA: t0, t0, tF: t0 + tempoSaida(ex, ey, vx, vy, r, C.hw, C.hh),
          x: ex, y: ey, vx, vy, r, hr: Math.max(1, r - CONFIG.ataques.folgaHitbox), av: null }, ev, idx);
      }
    },

    // { batida, tipo:'moeda', x, y, dur, id: 0|1|2 }
    moeda(ev, C, idx) {
      const t0 = C.t(ev.batida);
      C.add({ k: MOEDA, tA: t0, t0, tF: t0 + (ev.dur || 4) * C.B, x: (ev.x || 0) * C.hw, y: (ev.y || 0) * C.hh,
        id: ev.id || 0 }, ev, idx);
    },
  };

  // ============================================================ MOTOR ======
  // Um "vivo" é um projétil em jogo (vem do pool, não aloca durante a fase).
  function novoVivo() {
    return { s: null, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, p: 0, e: 0, m: 0,
      ativo: false, raspou: false, somFeito: false, morto: false, pego: false };
  }

  class Ataques {
    constructor(comp) {
      this.c = comp;
      const n = CONFIG.ataques.poolTamanho;
      this.pool = new Array(n);
      this.livres = new Array(n);
      for (let i = 0; i < n; i++) { this.pool[i] = novoVivo(); this.livres[i] = this.pool[i]; }
      this.nLivres = n;
      this.vivos = new Array(n);
      this.n = 0;
      this.prox = 0;
      this.destaque = null;   // o que matou a alma (pisca na morte)
      this.aoEvento = null;   // callback(tipo, vivo) para sons/tremida
      this.estourou = 0;      // quantas vezes o pool acabou (debug)
    }

    // Limpa e avança até o tempo t (restart = t 0; debug pode pular pra qualquer t).
    reiniciar(t, alma) {
      for (let i = 0; i < this.n; i++) this.liberar(this.vivos[i]);
      this.n = 0; this.prox = 0; this.destaque = null;
      const specs = this.c.specs;
      while (this.prox < specs.length && specs[this.prox].tA <= t) {
        const s = specs[this.prox++];
        if (t < s.tF) this.nascer(s, t, alma, true);
      }
    }

    liberar(o) { o.s = null; this.livres[this.nLivres++] = o; }

    nascer(s, t, alma, pulando) {
      if (this.nLivres === 0) { this.estourou++; return null; }
      const o = this.livres[--this.nLivres];
      o.s = s; o.ativo = false; o.raspou = false; o.morto = false; o.pego = false;
      o.somFeito = pulando && s.tSom !== undefined && t > s.tSom + 0.05;
      o.x = s.x || 0; o.y = s.y || 0; o.vx = s.vx || 0; o.vy = s.vy || 0; o.ax = o.x; o.ay = o.y;
      this.vivos[this.n++] = o;
      if (t >= s.t0) this.ativar(o, t, alma);
      return o;
    }

    ativar(o, t, alma) {
      o.ativo = true;
      const s = o.s;
      if (s.k === BALA && s.mira) {
        const dx = (alma ? alma.x : 0) - s.x, dy = (alma ? alma.y : 0) - s.y;
        const d = Math.hypot(dx, dy) || 1;
        o.vx = dx / d * s.vel; o.vy = dy / d * s.vel;
        o.ax = s.x; o.ay = s.y;
      }
    }

    // Avança tudo pro tempo t. dt = passo desde o último frame (para curvas teleguiadas).
    atualizar(t, dt, alma) {
      const specs = this.c.specs;
      while (this.prox < specs.length && specs[this.prox].tA <= t) {
        const s = specs[this.prox++];
        if (t < s.tF) this.nascer(s, t, alma, false);
      }
      const hw = this.c.hw, hh = this.c.hh;
      for (let i = this.n - 1; i >= 0; i--) {
        const o = this.vivos[i];
        const s = o.s;
        if (t >= s.tF || o.morto || o.pego) {
          this.liberar(o);
          this.vivos[i] = this.vivos[--this.n];
          continue;
        }
        if (!o.ativo && t >= s.t0) this.ativar(o, t, alma);
        if (!o.somFeito && s.tSom !== undefined && t >= s.tSom) {
          o.somFeito = true;
          if (this.aoEvento) this.aoEvento('ativou', o);
        }
        this.posicionar(o, t, dt, alma);
        if (s.k === BALA && s.mira && o.ativo) {
          const m = s.r + 4;
          if (o.x < -hw - m || o.x > hw + m || o.y < -hh - m || o.y > hh + m) {
            // saiu da caixa (só depois de ter entrado: confere se está se afastando)
            if (o.x * o.vx + o.y * o.vy > 0) o.morto = true;
          }
        }
      }
    }

    // Calcula a geometria do vivo no tempo t (guarda em o.x/o.y/o.p/o.e/o.m).
    posicionar(o, t, dt, alma) {
      const s = o.s;
      switch (s.k) {
        case BALA:
          if (!o.ativo) { o.x = s.x; o.y = s.y; break; }
          if (s.mira) {
            if (s.guia > 0 && t - s.t0 < s.guiaDur && alma && dt > 0) {
              // curva em direção à alma, limitada a `guia` graus/s
              const alvo = Math.atan2(alma.y - o.y, alma.x - o.x);
              let a = Math.atan2(o.vy, o.vx);
              let d = alvo - a;
              while (d > Math.PI) d -= Math.PI * 2;
              while (d < -Math.PI) d += Math.PI * 2;
              const max = s.guia * Math.PI / 180 * dt;
              a += clamp(d, -max, max);
              o.vx = Math.cos(a) * s.vel; o.vy = Math.sin(a) * s.vel;
              o.x += o.vx * dt; o.y += o.vy * dt;
              o.ax = o.x - o.vx * (t - s.t0); o.ay = o.y - o.vy * (t - s.t0);
            } else {
              o.x = o.ax + o.vx * (t - s.t0); o.y = o.ay + o.vy * (t - s.t0);
            }
          } else {
            o.x = s.x + s.vx * (t - s.t0); o.y = s.y + s.vy * (t - s.t0);
          }
          break;
        case LASER: {
          if (t <= s.t0) o.p = s.p0;
          else if (t >= s.t1) o.p = s.p1;
          else o.p = s.p0 + (s.p1 - s.p0) * (t - s.t0) / (s.t1 - s.t0);
          break;
        }
        case PAREDE: o.e = bordaParede(s, t); break;
        case MURO: o.m = s.m0 + s.dir * s.vel * Math.max(0, t - s.t0); break;
        default: break;
      }
    }

    // Testa colisão da alma (px, py) no tempo t. Raspões e moedas vão pras listas.
    // Retorna o vivo que matou, ou null.
    testar(t, px, py, rHit, rRaspao, raspoes, moedas) {
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        const s = o.s;
        if (s.k === MOEDA) {
          if (!o.pego && t >= s.t0 && Math.hypot(px - s.x, py - s.y) < CONFIG.moedas.raioColeta) { o.pego = true; moedas.push(s); }
          continue;
        }
        const d = this.distancia(o, t, px, py);
        if (d === Infinity) continue;
        if (d < rHit) return o;
        if (d < rRaspao && !o.raspou) { o.raspou = true; raspoes.push(o); }
      }
      return null;
    }

    // Distância (com sinal) da alma até a parte letal do vivo no tempo t. Infinity = inofensivo agora.
    distancia(o, t, px, py) {
      const s = o.s;
      switch (s.k) {
        case BALA: {
          if (t < s.t0) return Infinity;
          let x, y;
          if (s.mira) { x = o.ax + o.vx * (t - s.t0); y = o.ay + o.vy * (t - s.t0); if (s.guia > 0) { x = o.x; y = o.y; } }
          else { x = s.x + s.vx * (t - s.t0); y = s.y + s.vy * (t - s.t0); }
          return Math.hypot(px - x, py - y) - s.hr;
        }
        case LASER: {
          if (t < s.t0 || t >= s.t1) return Infinity;
          const p = s.p0 + (s.p1 - s.p0) * (t - s.t0) / (s.t1 - s.t0);
          return Math.abs(px * s.nx + py * s.ny - p) - s.hr;
        }
        case PAREDE: {
          if (t < s.t0 || t >= s.tF) return Infinity;
          const e = bordaParede(s, t);
          const coord = s.eixo === 'h' ? px : py;
          // lado -1: parede ocupa (-inf, e]; lado +1: [e, inf)
          return (s.lado < 0 ? coord - e : e - coord) - CONFIG.ataques.folgaHitbox;
        }
        case MURO: {
          if (t < s.t0) return Infinity;
          const m = s.m0 + s.dir * s.vel * (t - s.t0);
          const a = s.horiz ? px : py;          // eixo de movimento
          const b = s.horiz ? py : px;          // eixo do vão
          const dA = Math.abs(a - m) - s.larg / 2;
          // o muro são dois retângulos: antes do vão e depois do vão
          const d1 = distRet(dA, b - (s.g - s.esp / 2));
          const d2 = distRet(dA, (s.g + s.esp / 2) - b);
          return Math.min(d1, d2) - s.hrFolga;
        }
        default: return Infinity;
      }
    }

    // ------------------------------------------------------------ DESENHO --
    // ctx já está transladado pro centro da caixa e com clip na caixa.
    desenhar(ctx, t, batida, op) {
      const hw = this.c.hw, hh = this.c.hh, B = this.c.B;
      const pisca = ((batida * CONFIG.ataques.piscadasPorBatida) % 1) < 0.5;
      // 1) avisos
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        if (t < o.s.t0 || o.s.k === EMISSOR || o.s.k === ORBE) desenharAviso(ctx, o, t, hw, hh, B, pisca, op);
      }
      // 2) paredes e muros
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i], k = o.s.k;
        if ((k === PAREDE || k === MURO) && t >= o.s.t0) desenharParede(ctx, o, t, hw, hh, this.destaque === o, op);
      }
      // 3) lasers
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        if (o.s.k === LASER && t >= o.s.t0) desenharLaser(ctx, o, t, hw, hh, this.destaque === o, op);
      }
      // 4) balas
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        if (o.s.k !== BALA || t < o.s.t0) continue;
        const d = o.s.r * 2;
        const destaque = this.destaque === o;
        const spr = destaque && op.piscaMorte
          ? Sprites.bala(d, PAL.branco, PAL.branco, PAL.perigoClaro)
          : Sprites.bala(d, PAL.perigo, PAL.perigoClaro, PAL.perigoEscuro);
        ctx.drawImage(spr, Math.round(o.x - o.s.r), Math.round(o.y - o.s.r));
      }
      // 5) moedas
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        if (o.s.k !== MOEDA || o.pego) continue;
        desenharMoeda(ctx, o, t, batida);
      }
      if (op.hitbox) this.desenharHitboxes(ctx, t, hw, hh);
    }

    desenharHitboxes(ctx, t, hw, hh) {
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 1;
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i], s = o.s;
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
  }

  // Distância com sinal a um retângulo, dadas as distâncias por eixo (negativo = dentro).
  function distRet(dx, dy) {
    if (dx <= 0 && dy <= 0) return Math.max(dx, dy);
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  }

  // Borda interna da parede no tempo t (com easing: fecha acelerando, abre desacelerando).
  function bordaParede(s, t) {
    if (t <= s.t0) return s.recolhida;
    if (t < s.tC) { const u = (t - s.t0) / (s.tC - s.t0); return s.recolhida + (s.fechada - s.recolhida) * u * u; }
    if (t < s.tO) return s.fechada;
    if (t < s.tF) { const u = (t - s.tO) / (s.tF - s.tO); return s.fechada + (s.recolhida - s.fechada) * (1 - (1 - u) * (1 - u)); }
    return s.recolhida;
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
          ctx.globalAlpha = (forte ? 0.22 : 0.1) * (0.6 + 0.4 * prog);
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
        draw(s.p0, (forte ? 0.2 : 0.1) * (0.5 + 0.5 * prog));
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

  return { compilar, Ataques, GERADORES, TIPOS: { BALA, LASER, PAREDE, MURO, ORBE, EMISSOR, MOEDA }, bordaParede };
})();
