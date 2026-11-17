'use strict';
// =============================================================================
// DODGE — game.js
// Loop principal, telas, e a tela de JOGO: alma, caixa, colisão, raspão,
// morte, restart instantâneo, vitória, pausa e todo o "juice".
//
// O TEMPO DO JOGO VEM DO ÁUDIO (Sound.posicao()), nunca da contagem de frames.
// =============================================================================

const Game = (() => {
  const W = CONFIG.tela.largura, H = CONFIG.tela.altura;
  const CX = W / 2, CY = CONFIG.caixa.centroY;
  const HW = CONFIG.caixa.largura / 2, HH = CONFIG.caixa.altura / 2;

  let canvas = null, ctx = null;
  let tela = null, nomeTela = '';
  let tempo = 0;            // relógio da interface (s), não usado pra jogabilidade
  let frame = 0;
  let ultimoMs = 0;
  const fx = { tremida: 0, flash: 0, flashCor: '#ffffff', ox: 0, oy: 0 };

  const reduzido = () => Save.config.reduzirEfeitos;
  const fxMult = () => (reduzido() ? CONFIG.juice.reduzido : 1);
  function tremer(px) { fx.tremida = Math.max(fx.tremida, px * fxMult()); }
  function flash(a, cor) { fx.flash = Math.max(fx.flash, a * fxMult()); fx.flashCor = cor || '#ffffff'; }

  // ============================================================ PARTÍCULAS ==
  const Particulas = (() => {
    const N = CONFIG.juice.maxParticulas;
    const P = [];
    for (let i = 0; i < N; i++) P.push({ vida: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, g: 0, cor: '#fff', tam: 1, atrito: 0 });
    let i0 = 0;
    const api = {
      emitir(x, y, vx, vy, vida, cor, tam, g, atrito) {
        const p = P[i0]; i0 = (i0 + 1) % N;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.vida = vida; p.max = vida;
        p.cor = cor; p.tam = tam || 1; p.g = g || 0; p.atrito = atrito || 0;
      },
      explosao(x, y, n, cor, vel, vida, g) {
        if (reduzido()) n = Math.ceil(n * 0.4);
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2, v = vel * (0.3 + Math.random() * 0.7);
          api.emitir(x, y, Math.cos(a) * v, Math.sin(a) * v, vida * (0.6 + Math.random() * 0.6), cor, Math.random() < 0.3 ? 2 : 1, g || 0, 1.5);
        }
      },
      atualizar(dt) {
        for (let i = 0; i < N; i++) {
          const p = P[i];
          if (p.vida <= 0) continue;
          p.vida -= dt;
          if (p.atrito) { const f = Math.max(0, 1 - p.atrito * dt); p.vx *= f; p.vy *= f; }
          p.vy += p.g * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
        }
      },
      desenhar(c) {
        for (let i = 0; i < N; i++) {
          const p = P[i];
          if (p.vida <= 0) continue;
          c.globalAlpha = Math.min(1, (p.vida / p.max) * 1.6);
          c.fillStyle = p.cor;
          c.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
        }
        c.globalAlpha = 1;
      },
      limpar() { for (const p of P) p.vida = 0; },
      ativas() { let n = 0; for (const p of P) if (p.vida > 0) n++; return n; },
    };
    return api;
  })();

  // ======================================================= TEXTOS FLUTUANTES =
  const Flutuantes = (() => {
    const T = [];
    for (let i = 0; i < 10; i++) T.push({ vivo: false, txt: '', x: 0, y: 0, cor: '#fff', ini: 0, dur: 1, esc: 1 });
    let i0 = 0;
    return {
      add(txt, x, y, cor, dur, esc) {
        const f = T[i0]; i0 = (i0 + 1) % T.length;
        f.vivo = true; f.txt = txt; f.x = x; f.y = y; f.cor = cor; f.ini = tempo; f.dur = dur; f.esc = esc || 1;
      },
      desenhar(c) {
        for (const f of T) {
          if (!f.vivo) continue;
          const u = (tempo - f.ini) / f.dur;
          if (u >= 1) { f.vivo = false; continue; }
          c.globalAlpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
          UI.texto(c, f.txt, f.x, f.y - u * 12, { cor: f.cor, escala: f.esc, alinhar: 'centro', sombra: PAL.preto });
        }
        c.globalAlpha = 1;
      },
      limpar() { for (const f of T) f.vivo = false; },
    };
  })();

  // ================================================================= FUNDO ==
  // Fundo animado: grade que rola, poeira e "equalizador" nas laterais da caixa.
  const poeira = [];
  for (let i = 0; i < 36; i++) poeira.push({ x: Math.random() * W, y: Math.random() * H, v: 4 + Math.random() * 10, f: Math.random() });

  function desenharFundo(c, batida, energia, cor, emJogo) {
    c.fillStyle = PAL.fundo;
    c.fillRect(0, 0, W, H);
    const pulso = batida >= 0 ? Math.exp(-(batida % 1) * 5) : 0;
    // grade
    const passo = 24;
    const off = Math.floor((tempo * (6 + energia * 18)) % passo);
    c.fillStyle = PAL.fundo2;
    for (let x = -passo + (off % passo); x < W; x += passo) c.fillRect(x, 0, 1, H);
    for (let y = -passo + off; y < H; y += passo) c.fillRect(0, y, W, 1);
    // poeira subindo
    c.fillStyle = cor;
    for (const p of poeira) {
      const y = ((p.y - tempo * p.v * (0.5 + energia)) % H + H) % H;
      c.globalAlpha = 0.15 + 0.35 * p.f * (0.4 + energia * 0.6);
      c.fillRect(Math.round(p.x), Math.round(y), 1, 1);
    }
    c.globalAlpha = 1;
    if (!emJogo) return;
    // equalizador dos dois lados da caixa
    const n = 6;
    for (let i = 0; i < n; i++) {
      const h = Math.round(6 + (12 + energia * 46) * (0.35 + 0.65 * Math.exp(-((batida + i * 0.25) % 1) * 3)) * (0.6 + 0.4 * Math.sin(i * 1.7 + batida * 0.5)));
      c.globalAlpha = 0.18 + 0.25 * energia + 0.2 * pulso;
      c.fillStyle = cor;
      const xL = CX - HW - 18 - i * 10, xR = CX + HW + 13 + i * 10;
      c.fillRect(xL, CY - (h >> 1), 5, h);
      c.fillRect(xR, CY - (h >> 1), 5, h);
    }
    c.globalAlpha = 1;
  }

  // ============================================================ TELA: JOGO ==
  const J = {
    fase: null, comp: null, ataques: null, musica: null, cor: PAL.verde,
    estado: 'parado',        // jogando | morto | vitoria | pausa | contagem
    t: 0, batida: -1, prog: 0,
    tentativa: 0,
    melhorAntes: 0, passouMelhor: false,
    raspoes: 0, combo: 0, ultimoRaspao: -9,
    moedas: [false, false, false],
    trapaca: false,          // usou debug (pulo/invencível): não conta recorde
    tMorte: 0, pctMorte: 0, recorde: false,
    textoMorte: null,        // { pct, recorde, ini }
    textoTentativa: 0,       // tempo em que a tentativa começou
    tVitoria: 0, ganhouEstrelas: 0,
    pausaPos: 0, contagemIni: 0, contagemTicks: 0,
    dica: { ativa: false, movido: 0 },
    controles: new Controles(),
  };

  const alma = {
    x: 0, y: 0, vx: 0, vy: 0, olharX: 0, olharY: 0, susto: 0,
    pend: { x: 0, y: 0 },
    rastro: [], rastroI: 0,
  };
  for (let i = 0; i < CONFIG.alma.rastro; i++) alma.rastro.push({ x: 0, y: 0 });

  const raspoesFrame = [], moedasFrame = [];
  const cacheComp = {};

  function preparar(fase) {
    J.fase = fase;
    if (!cacheComp[fase.id]) {
      const comp = Patterns.compilar(fase, CONFIG.caixa);
      cacheComp[fase.id] = { comp, ataques: new Patterns.Ataques(comp) };
    }
    J.comp = cacheComp[fase.id].comp;
    J.ataques = cacheComp[fase.id].ataques;
    J.ataques.aoEvento = aoEventoAtaque;
    J.musica = Sound.info(fase.musica);
    J.cor = COR_DIFICULDADE[fase.dificuldade] || PAL.alma;
    J.temMoedas = J.comp.specs.some(s => s.k === Patterns.TIPOS.MOEDA);
    J.trapaca = false;
    J.textoMorte = null;
    Save.dados.ultimaFase = fase.id;
    const reg = Save.fase(fase.id);
    J.dica.ativa = Save.dados.primeiraVez && Levels.indice(fase.id) === 0 && reg.tentativas < 3;
    J.dica.movido = 0;
  }

  function aoEventoAtaque(tipo, o) {
    if (J.estado !== 'jogando') return;
    const s = o.s;
    if (s.som) Sound.sfx(s.som);
    if (s.tremida) tremer(s.tremida);
    if (s.flash) flash(s.flash, PAL.perigoClaro);
    if (s.k === Patterns.TIPOS.ORBE) {
      Particulas.explosao(CX + s.x, CY + s.y, 14, PAL.perigoClaro, 90, 0.35);
    }
  }

  // Começa (ou recomeça) uma tentativa. Rápido: nada é alocado aqui.
  function comecarTentativa(desdeT) {
    const reg = Save.fase(J.fase.id);
    reg.tentativas++;
    Save.dados.stats.tentativas++;
    Save.gravarDepois();
    J.tentativa = reg.tentativas;
    J.melhorAntes = reg.melhor;
    J.passouMelhor = false;
    J.raspoes = 0; J.combo = 0; J.ultimoRaspao = -9;
    J.moedas[0] = J.moedas[1] = J.moedas[2] = false;
    J.recorde = false;
    J.textoTentativa = tempo;
    alma.x = 0; alma.y = 0; alma.vx = 0; alma.vy = 0; alma.pend.x = 0; alma.pend.y = 0; alma.susto = 0;
    for (const r of alma.rastro) { r.x = 0; r.y = 0; }
    Input.descartarArrasto();
    const t0 = desdeT || 0;
    J.ataques.reiniciar(t0, alma);
    Sound.tocar(J.fase.musica, { desde: t0, vel: Debug.vel });
    J.t = t0;
    J.batida = t0 / J.comp.B;
    J.estado = 'jogando';
    Flutuantes.limpar();
    if (J.pausarAoVoltar) { J.pausarAoVoltar = false; pausar(); }
  }

  function moverAlma(dt) {
    const d = Debug.bot ? Debug.direcaoBot(alma, J) : Input.direcao();
    const v = CONFIG.alma.velocidade;
    let mx = d.x * v * dt, my = d.y * v * dt;
    // toque: movimento relativo do dedo
    const a = Input.consumirArrasto();
    const sens = Save.config.sensibilidadeToque || CONFIG.toque.sensibilidadePadrao;
    alma.pend.x += a.dx * sens; alma.pend.y += a.dy * sens;
    const pl = Math.hypot(alma.pend.x, alma.pend.y);
    if (pl > CONFIG.toque.bufferMax) { alma.pend.x *= CONFIG.toque.bufferMax / pl; alma.pend.y *= CONFIG.toque.bufferMax / pl; }
    const maxPasso = CONFIG.toque.velocidadeMax * dt;
    const pl2 = Math.hypot(alma.pend.x, alma.pend.y);
    if (pl2 > 0) {
      const k = Math.min(1, maxPasso / pl2);
      mx += alma.pend.x * k; my += alma.pend.y * k;
      alma.pend.x -= alma.pend.x * k; alma.pend.y -= alma.pend.y * k;
    }
    const limX = HW - CONFIG.alma.margemParede, limY = HH - CONFIG.alma.margemParede;
    let nx = alma.x + mx, ny = alma.y + my;
    if (nx < -limX) { nx = -limX; alma.pend.x = Math.max(0, alma.pend.x); }
    if (nx > limX) { nx = limX; alma.pend.x = Math.min(0, alma.pend.x); }
    if (ny < -limY) { ny = -limY; alma.pend.y = Math.max(0, alma.pend.y); }
    if (ny > limY) { ny = limY; alma.pend.y = Math.min(0, alma.pend.y); }
    if (dt > 0) { alma.vx = (nx - alma.x) / dt; alma.vy = (ny - alma.y) / dt; }
    const movido = Math.hypot(nx - alma.x, ny - alma.y);
    J.dica.movido += movido;
    const ox = alma.x, oy = alma.y;
    alma.x = nx; alma.y = ny;
    // olhos seguem o movimento
    alma.olharX = alma.vx > 25 ? 1 : alma.vx < -25 ? -1 : 0;
    alma.olharY = alma.vy > 25 ? 1 : alma.vy < -25 ? -1 : 0;
    return { ox, oy };
  }

  function atualizarJogo(dt) {
    if (J.estado === 'jogando') {
      let t = Sound.posicao();
      if (!Sound.pronto()) t = J.t + dt;          // sem áudio: relógio de reserva
      if (t < J.t) t = J.t;                       // nunca volta no tempo
      let dts = t - J.t;
      if (dts > 0.1) dts = 0.1;
      const tIni = t - dts;
      const { ox, oy } = moverAlma(dts);
      J.ataques.atualizar(t, dts, alma);
      // colisão em sub-passos (nada atravessa nada, mesmo com frame lento)
      const dist = Math.hypot(alma.x - ox, alma.y - oy);
      const passos = Math.max(1, Math.min(12, Math.ceil(Math.max(dist, J.comp.velMax * dts) / 2.5)));
      raspoesFrame.length = 0; moedasFrame.length = 0;
      let matou = null, mx = alma.x, my = alma.y, mt = t;
      for (let k = 1; k <= passos && !matou; k++) {
        const f = k / passos;
        const ts = tIni + dts * f;
        const px = ox + (alma.x - ox) * f, py = oy + (alma.y - oy) * f;
        const m = J.ataques.testar(ts, px, py, CONFIG.alma.raioHitbox, CONFIG.alma.raioRaspao, raspoesFrame, moedasFrame);
        if (m && !Debug.invencivel) { matou = m; mx = px; my = py; mt = ts; }
      }
      for (const s of moedasFrame) pegarMoeda(s);
      if (!matou) for (let i = 0; i < raspoesFrame.length; i++) raspar(raspoesFrame[i]);
      J.t = t;
      J.batida = t / J.comp.B;
      J.prog = Math.max(0, Math.min(1, t / J.comp.duracao));
      // rastro
      const r = alma.rastro[alma.rastroI]; r.x = alma.x; r.y = alma.y;
      alma.rastroI = (alma.rastroI + 1) % alma.rastro.length;
      if (alma.susto > 0) alma.susto -= dt;
      if (matou) { alma.x = mx; alma.y = my; J.t = mt; morrer(matou); return; }
      // passou o recorde nesta tentativa
      const pct = Math.floor(J.prog * 100);
      if (!J.passouMelhor && J.melhorAntes > 0 && pct > J.melhorAntes && !J.trapaca) {
        J.passouMelhor = true;
        Sound.sfx('passouMelhor');
      }
      if (J.dica.ativa && J.dica.movido > 30) J.dica.ativa = false;
      if (t >= J.comp.duracao) vencer();
    } else if (J.estado === 'morto') {
      Input.descartarArrasto();
      const espera = J.recorde ? CONFIG.morte.atrasoReinicioRecorde : CONFIG.morte.atrasoReinicio;
      if (tempo - J.tMorte >= espera) comecarTentativa();
    } else if (J.estado === 'contagem') {
      Input.descartarArrasto();
      const passo = 0.32;
      const n = Math.floor((tempo - J.contagemIni) / passo);
      if (n > J.contagemTicks) { J.contagemTicks = n; if (n < 3) Sound.sfx('contagem'); }
      if (tempo - J.contagemIni >= passo * 3) {
        Sound.sfx('contagemFim');
        Sound.tocar(J.fase.musica, { desde: J.pausaPos, vel: Debug.vel });
        J.estado = 'jogando';
      }
    } else if (J.estado === 'vitoria') {
      Input.descartarArrasto();
      if (tempo - J.tVitoria > 1.1 && !J.controles.itens.length) montarPainelVitoria();
      // confete
      if (tempo - J.tVitoria < 1.5 && frame % 3 === 0) {
        const cores = [PAL.ouro, PAL.alma, J.cor, PAL.branco, PAL.perigoClaro];
        Particulas.emitir(CX + (Math.random() - 0.5) * HW * 2, CY - HH - 4, (Math.random() - 0.5) * 30, 20 + Math.random() * 40,
          2.2, cores[(Math.random() * cores.length) | 0], Math.random() < 0.5 ? 2 : 1, 30);
      }
    } else {
      Input.descartarArrasto();
    }
  }

  function raspar(o) {
    J.raspoes++;
    Save.dados.stats.raspoes++;
    J.combo = tempo - J.ultimoRaspao < CONFIG.raspao.janelaCombo ? J.combo + 1 : 1;
    J.ultimoRaspao = tempo;
    alma.susto = 0.25;
    Sound.sfx('raspao', 0, J.combo - 1);
    const txt = J.combo > 1 ? t('raspouCombo', { n: J.combo }) : t('raspou');
    Flutuantes.add(txt, CX + alma.x, CY + alma.y - 16, J.combo > 2 ? PAL.ouro : PAL.almaClara, CONFIG.raspao.textoDuracao, 1);
    // faíscas saindo do lado do ataque
    const ang = Math.atan2(alma.y - (o.y || 0), alma.x - (o.x || 0));
    for (let k = 0; k < 5; k++) {
      const a = ang + (Math.random() - 0.5) * 1.6, v = 50 + Math.random() * 80;
      Particulas.emitir(CX + alma.x, CY + alma.y, Math.cos(a) * v, Math.sin(a) * v, 0.25, PAL.almaClara, 1, 0, 3);
    }
  }

  function pegarMoeda(s) {
    J.moedas[s.id] = true;
    Sound.sfx('moeda');
    Particulas.explosao(CX + s.x, CY + s.y, 16, PAL.ouro, 70, 0.5);
    Flutuantes.add('+', CX + s.x, CY + s.y - 8, PAL.ouro, 0.6, 2);
  }

  function morrer(o) {
    J.estado = 'morto';
    Flutuantes.limpar();
    J.tMorte = tempo;
    J.ataques.destaque = o;
    Sound.parar();
    Sound.sfx('morte');
    const pct = Math.min(99, Math.floor(J.prog * 100));
    J.pctMorte = pct;
    const reg = Save.fase(J.fase.id);
    reg.mortes[pct]++;
    Save.dados.stats.mortes++;
    J.recorde = !J.trapaca && pct > reg.melhor;
    if (J.recorde) {
      reg.melhor = pct;
      setTimeout(() => Sound.sfx('recorde'), 140);
    }
    Save.gravarDepois();
    J.textoMorte = { pct, recorde: J.recorde, ini: tempo };
    tremer(CONFIG.juice.tremidaMorte);
    flash(CONFIG.juice.flashMorte, '#ffffff');
    // a alma se desfaz em pixels
    const cor = Avatar.corPrincipal();
    const mult = CONFIG.morte.particulas * (reduzido() ? 0.5 : 1);
    for (const p of Avatar.pixels(Avatar.atual())) {
      if (Math.random() > mult) continue;
      const a = Math.atan2(p.y + 0.01, p.x + 0.01), v = 40 + Math.random() * 120;
      Particulas.emitir(CX + alma.x + p.x, CY + alma.y + p.y, Math.cos(a) * v + (Math.random() - 0.5) * 40,
        Math.sin(a) * v + (Math.random() - 0.5) * 40, 0.5 + Math.random() * 0.5, p.cor, 1, 120, 1.2);
    }
    Particulas.explosao(CX + alma.x, CY + alma.y, 10, cor, 160, 0.4);
    if (Debug.ativo) Debug.aoMorrer(pct);
  }

  function vencer() {
    J.estado = 'vitoria';
    J.tVitoria = tempo;
    J.prog = 1;
    const reg = Save.fase(J.fase.id);
    const primeira = reg.vitorias === 0;
    if (!J.trapaca) {
      reg.vitorias++;
      reg.melhor = 100;
      for (let i = 0; i < 3; i++) if (J.moedas[i]) reg.moedas[i] = true;
      Save.dados.stats.vitorias++;
      if (Levels.indice(J.fase.id) === 0) Save.dados.primeiraVez = false;
    }
    J.ganhouEstrelas = primeira && !J.trapaca ? Levels.estrelasDe(J.fase.dificuldade) : 0;
    Save.gravar();
    Sound.sfx('vitoria');
    flash(0.5, '#ffffff');
    tremer(3);
    Particulas.explosao(CX + alma.x, CY + alma.y, 30, PAL.ouro, 140, 0.8);
    // tudo que sobrou vira fumaça
    J.ataques.reiniciar(J.comp.duracao + 999, alma);
    J.controles.limpar();
  }

  function montarPainelVitoria() {
    const C = J.controles;
    C.limpar();
    const prox = Levels.proxima(J.fase.id);
    const pW = 300, pX = (W - pW) / 2;
    const pri = C.botao({ x: pX + 70, y: 198, w: 160, h: 20, texto: prox ? t('proxima') : t('fases'), primario: true, cor: PAL.ouro,
      acao: () => { if (prox) jogar(prox); else irPara('fases'); } });
    C.botao({ x: pX + 24, y: 226, w: 120, h: 16, texto: t('repetir'), icone: Sprites.desenho('repetir', PAL.branco),
      acao: () => { J.textoMorte = null; J.controles.limpar(); comecarTentativa(); } });
    C.botao({ x: pX + 156, y: 226, w: 120, h: 16, texto: t('fases'), icone: Sprites.desenho('lista', PAL.branco),
      acao: () => irPara('fases') });
    C.focar(pri);
  }

  function pausar() {
    if (J.estado !== 'jogando') return;
    J.estado = 'pausa';
    J.pausaPos = J.t;
    Sound.parar();
    Sound.sfx('menu');
    montarPausa();
  }

  function montarPausa() {
    const C = J.controles;
    C.limpar();
    const x = (W - 150) / 2;
    const pri = C.botao({ x, y: 104, w: 150, h: 18, texto: t('continuar'), primario: true, cor: PAL.alma, acao: continuar });
    C.botao({ x, y: 128, w: 150, h: 16, texto: t('reiniciar'), acao: () => { C.limpar(); comecarTentativa(); } });
    C.botao({ x, y: 150, w: 150, h: 16, texto: t('configuracoes'), acao: () => irPara('config', { voltar: 'jogo' }) });
    C.botao({ x, y: 172, w: 150, h: 16, texto: t('sair'), acao: () => irPara('fases') });
    C.focar(pri);
  }

  function continuar() {
    J.controles.limpar();
    J.estado = 'contagem';
    J.contagemIni = tempo;
    J.contagemTicks = -1;
  }

  const TelaJogo = {
    entrar(args) {
      if (args && args.retomar) {
        if (J.estado === 'pausa') montarPausa();
        return;
      }
      preparar(args.fase);
      J.controles.limpar();
      if (args.desde) J.trapaca = true;
      comecarTentativa(args.desde || 0);
    },
    sair() { J.controles.limpar(); },
    atualizar(dt) { atualizarJogo(dt); },
    evento(e) {
      if (J.estado === 'jogando') {
        if (e.t === 'tecla' && !e.repetida) {
          if (e.k === 'voltar' || e.k === 'pausa') pausar();
          else if (e.k === 'reiniciar') { Sound.parar(); comecarTentativa(); }
        } else if (e.t === 'down' && e.x > W - 34 && e.y < 26) pausar();
        return;
      }
      if (J.estado === 'morto') {
        if (tempo - J.tMorte < CONFIG.morte.toquePulaApos) return;
        if (e.t === 'tecla' && !e.repetida) {
          if (e.k === 'voltar') { irPara('fases'); return; }
          if (e.k && e.k !== 'pausa') comecarTentativa();
        } else if (e.t === 'down') {
          if (e.x > W - 34 && e.y < 26) { irPara('fases'); return; }
          comecarTentativa();
        }
        return;
      }
      if (J.estado === 'pausa' || J.estado === 'vitoria') {
        if (e.t === 'tecla') {
          if (e.repetida && e.k === 'confirmar') return;
          if ((e.k === 'voltar' || e.k === 'pausa') && J.estado === 'pausa') { continuar(); return; }
          if (e.k === 'reiniciar' && !e.repetida) { J.controles.limpar(); comecarTentativa(); return; }
          if (e.k) J.controles.tecla(e.k);
        } else if (e.t === 'down' || e.t === 'move' || e.t === 'up' || e.t === 'cancel') {
          J.controles.ponteiro(e.t, e.x, e.y);
        }
      }
    },
    desenhar(c) { desenharJogo(c); },
  };

  // --------------------------------------------------------------- desenho --
  function desenharJogo(c) {
    const tocando = J.estado === 'jogando';
    const batida = J.batida;
    const compasso = Math.floor(Math.max(0, batida) / 4);
    const energia = J.musica.energias[Math.min(J.musica.energias.length - 1, compasso)] || 0;
    desenharFundo(c, tocando ? batida : -1, energia, J.cor, true);

    // tremida
    fx.ox = 0; fx.oy = 0;
    if (fx.tremida > 0.3) {
      fx.ox = Math.round((Math.random() * 2 - 1) * fx.tremida);
      fx.oy = Math.round((Math.random() * 2 - 1) * fx.tremida);
    }
    c.save();
    c.translate(fx.ox, fx.oy);

    // caixa
    const fr = batida - Math.floor(batida);
    let pulso = 0;
    if (tocando && batida >= 0) {
      const amp = Math.floor(batida) % 4 === 0 ? CONFIG.caixa.pulsoCompasso : CONFIG.caixa.pulsoBatida;
      pulso = Math.round(amp * Math.exp(-fr * CONFIG.caixa.pulsoDecaimento) * (reduzido() ? 0.5 : 1));
    }
    c.fillStyle = PAL.preto;
    c.fillRect(CX - HW, CY - HH, HW * 2, HH * 2);

    // conteúdo da caixa (com recorte)
    c.save();
    c.translate(CX, CY);
    c.beginPath(); c.rect(-HW, -HH, HW * 2, HH * 2); c.clip();
    const op = { hitbox: Debug.hitbox, reduzido: reduzido(), alma, frame,
      piscaMorte: J.estado === 'morto' && Math.floor((tempo - J.tMorte) * 12) % 2 === 0 };
    J.ataques.desenhar(c, J.t, batida, op);
    if (J.estado !== 'morto') desenharAlma(c);
    if (Debug.hitbox) {
      c.strokeStyle = '#ffff00'; c.beginPath(); c.arc(alma.x, alma.y, CONFIG.alma.raioRaspao, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#00ff66'; c.beginPath(); c.arc(alma.x, alma.y, CONFIG.alma.raioHitbox, 0, Math.PI * 2); c.stroke();
    }
    if (J.dica.ativa && J.estado === 'jogando') desenharDica(c);
    c.restore();

    // borda da caixa (pulsa na batida)
    const b = CONFIG.caixa.borda;
    const corBorda = J.estado === 'morto' ? PAL.perigo : PAL.branco;
    c.fillStyle = corBorda;
    const x0 = CX - HW - b - pulso, y0 = CY - HH - b - pulso, w0 = HW * 2 + (b + pulso) * 2, h0 = HH * 2 + (b + pulso) * 2;
    c.fillRect(x0, y0, w0, b); c.fillRect(x0, y0 + h0 - b, w0, b);
    c.fillRect(x0, y0, b, h0); c.fillRect(x0 + w0 - b, y0, b, h0);
    if (pulso > 0) {
      c.globalAlpha = 0.35;
      c.fillStyle = J.cor;
      c.fillRect(x0 - 1, y0 - 1, w0 + 2, 1); c.fillRect(x0 - 1, y0 + h0, w0 + 2, 1);
      c.fillRect(x0 - 1, y0, 1, h0); c.fillRect(x0 + w0, y0, 1, h0);
      c.globalAlpha = 1;
    }

    Particulas.desenhar(c);
    Flutuantes.desenhar(c);
    c.restore();

    desenharHUD(c);
    if (J.estado === 'pausa') desenharPausa(c);
    if (J.estado === 'contagem') desenharContagem(c);
    if (J.estado === 'vitoria') desenharVitoria(c);
  }

  function desenharAlma(c) {
    // rastro
    if (!reduzido()) {
      const cor = Avatar.corPrincipal();
      c.fillStyle = cor;
      const n = alma.rastro.length;
      for (let i = 0; i < n; i++) {
        const r = alma.rastro[(alma.rastroI + i) % n];
        const k = i / n;
        if (Math.abs(r.x - alma.x) + Math.abs(r.y - alma.y) < 2) continue;
        c.globalAlpha = 0.08 + 0.25 * k;
        const s = 3 + Math.round(k * 4);
        c.fillRect(Math.round(r.x - s / 2), Math.round(r.y - s / 2), s, s);
      }
      c.globalAlpha = 1;
    }
    let exp = 'normal';
    if (J.estado === 'vitoria') exp = 'feliz';
    else if (alma.susto > 0) exp = 'susto';
    Avatar.desenhar(c, Avatar.atual(), Math.round(alma.x), Math.round(alma.y), 1, { olharX: alma.olharX, olharY: alma.olharY, expressao: exp });
  }

  // Dica sem texto na primeira vez: teclas (PC) ou dedo arrastando (celular).
  function desenharDica(c) {
    const a = Math.max(0, Math.min(1, (J.t - 0.6) * 2));
    if (a <= 0) return;
    c.globalAlpha = a * (0.75 + 0.25 * Math.sin(tempo * 6));
    const x = Math.round(alma.x), y = Math.round(alma.y) + 18;
    if (Input.temToque()) {
      const dx = Math.round(Math.sin(tempo * 3) * 16);
      const dedo = Sprites.desenho('dedo', PAL.preto);
      c.drawImage(dedo, x - 6 + dx, y);
      c.fillStyle = PAL.branco;
      c.fillRect(x - 18, y + 14, 36, 1);
      c.fillRect(x - 18, y + 13, 1, 3); c.fillRect(x + 17, y + 13, 1, 3);
    } else {
      const tecla = Sprites.desenho('tecla', PAL.preto);
      // 4 teclas de seta (a de cima, e as de baixo giradas em 90°)
      const k = (dx, dy, quartos) => {
        c.save(); c.translate(x + dx, y + dy); c.rotate(quartos * Math.PI / 2);
        c.drawImage(tecla, -5, -4); c.restore();
      };
      k(0, 0, 0); k(-12, 10, -1); k(0, 10, 2); k(12, 10, 1);
    }
    c.globalAlpha = 1;
  }

  function desenharHUD(c) {
    // barra de %
    const bw = CONFIG.progresso.larguraBarra, bx = Math.round(CX - bw / 2), by = 7;
    c.fillStyle = PAL.preto; c.fillRect(bx - 1, by - 1, bw + 2, 6);
    c.fillStyle = PAL.fundo3; c.fillRect(bx, by, bw, 4);
    const fw = Math.round(bw * J.prog);
    c.fillStyle = J.estado === 'morto' ? PAL.perigo : J.cor;
    c.fillRect(bx, by, fw, 4);
    c.fillStyle = PAL.branco; c.fillRect(bx, by, fw, 1);
    // marcador do recorde
    const melhor = Save.fase(J.fase.id).melhor;
    if (melhor > 0 && melhor < 100) {
      const mx = bx + Math.round(bw * melhor / 100);
      c.fillStyle = J.passouMelhor && Math.floor(tempo * 8) % 2 ? PAL.branco : PAL.ouro;
      c.fillRect(mx, by - 2, 1, 8);
    }
    const pct = Math.floor(J.prog * 100);
    UI.texto(c, pct + '%', bx + bw + 6, by - 1, { cor: PAL.branco, sombra: PAL.preto });
    // moedas da fase
    const reg = Save.fase(J.fase.id);
    if (J.temMoedas) {
      for (let i = 0; i < 3; i++) {
        const x = 8 + i * 10, y = 5;
        if (J.moedas[i]) c.drawImage(Sprites.moeda(true), x, y);
        else if (reg.moedas[i]) { c.globalAlpha = 0.35; c.drawImage(Sprites.moeda(true), x, y); c.globalAlpha = 1; }
        else c.drawImage(Sprites.moeda(false), x, y);
      }
    }
    // botão de pausa
    if (J.estado === 'jogando' || J.estado === 'morto') {
      const ic = Sprites.desenho('pausa', PAL.cinzaClaro);
      c.drawImage(ic, W - 16, 5);
    }
    // texto da tentativa
    const dt = tempo - J.textoTentativa;
    if (dt < 1.6 && J.estado !== 'vitoria') {
      c.globalAlpha = dt < 1.1 ? 1 : 1 - (dt - 1.1) / 0.5;
      UI.texto(c, t('tentativa', { n: J.tentativa }), CX, CY + 34 - Math.round(dt * 4), { escala: 2, alinhar: 'centro', cor: PAL.branco, sombra: PAL.preto });
      c.globalAlpha = 1;
    }
    // % da morte (continua visível sumindo no começo da próxima tentativa)
    if (J.textoMorte) {
      const tm = J.textoMorte;
      const u = tempo - tm.ini;
      const vida = (tm.recorde ? CONFIG.morte.atrasoReinicioRecorde : CONFIG.morte.atrasoReinicio) + CONFIG.morte.textoDuracao;
      if (u > vida) J.textoMorte = null;
      else {
        const fade = u < vida - 0.5 ? 1 : (vida - u) / 0.5;
        const pop = u < 0.08 ? 1 + (0.08 - u) * 6 : 1;
        c.globalAlpha = fade;
        const yPct = CY - HH + (tm.recorde ? 30 : 16);
        UI.texto(c, tm.pct + '%', CX, yPct, { escala: Math.round(6 * pop), alinhar: 'centro', cor: tm.recorde ? PAL.ouro : PAL.branco, sombra: PAL.preto });
        if (tm.recorde) {
          if (Math.floor(u * 6) % 2 === 0 || u > 0.6) {
            UI.texto(c, t('novoRecorde'), CX, CY - HH + 10, { escala: 2, alinhar: 'centro', cor: PAL.ouro, sombra: PAL.preto });
          }
        }
        c.globalAlpha = 1;
      }
    }
    // flash
    if (fx.flash > 0.01) {
      c.globalAlpha = Math.min(1, fx.flash);
      c.fillStyle = fx.flashCor;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }
  }

  function desenharPausa(c) {
    c.globalAlpha = 0.72; c.fillStyle = PAL.preto; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    UI.painel(c, (W - 190) / 2, 52, 190, 146, { fundo: PAL.fundo2, borda: PAL.branco });
    UI.texto(c, t('pausado'), CX, 62, { escala: 2, alinhar: 'centro', cor: PAL.branco });
    UI.texto(c, J.fase.nome + ' · ' + Math.floor(J.prog * 100) + '%', CX, 84, { alinhar: 'centro', cor: J.cor });
    J.controles.desenhar(c, tempo);
  }

  function desenharContagem(c) {
    const n = 3 - Math.floor((tempo - J.contagemIni) / 0.32);
    if (n >= 1) UI.texto(c, String(n), CX, CY - HH + 16, { escala: 6, alinhar: 'centro', cor: PAL.branco, sombra: PAL.preto });
  }

  function desenharVitoria(c) {
    const u = tempo - J.tVitoria;
    if (u < 1.1) {
      const esc = u < 0.15 ? 4 : 3;
      UI.texto(c, t('faseCompleta'), CX, CY - 12, { escala: esc, alinhar: 'centro', cor: PAL.ouro, sombra: PAL.preto, onda: { fase: tempo * 7, amp: 1 } });
      return;
    }
    // painel
    const sobe = Math.min(1, (u - 1.1) / 0.25);
    const ease = 1 - Math.pow(1 - sobe, 3);
    c.globalAlpha = 0.65 * ease; c.fillStyle = PAL.preto; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    const pW = 300, pH = 236, pX = (W - pW) / 2, pY = Math.round(17 + (1 - ease) * 120);
    c.save();
    c.translate(0, pY - 17);
    UI.painel(c, pX, 17, pW, pH, { fundo: PAL.fundo2, borda: PAL.ouro });
    UI.texto(c, t('faseCompleta'), CX, 26, { escala: 2, alinhar: 'centro', cor: PAL.ouro, sombra: PAL.preto });
    const ic = Sprites.iconeDificuldade(J.fase.dificuldade);
    const nomeW = UI.largura(J.fase.nome, 1) + 18;
    c.drawImage(ic, Math.round(CX - nomeW / 2), 44);
    UI.texto(c, J.fase.nome, Math.round(CX - nomeW / 2) + 18, 48, { cor: J.cor });
    // alma grande e feliz
    const pulo = Math.abs(Math.sin(tempo * 4)) * 8;
    Avatar.desenhar(c, Avatar.atual(), pX + 70, 122 - pulo, 5, { expressao: 'feliz' });
    c.fillStyle = PAL.preto; c.globalAlpha = 0.4;
    c.fillRect(pX + 70 - 18 + Math.round(pulo / 2), 156, 36 - pulo, 3); c.globalAlpha = 1;
    // estrelas
    const nEst = Levels.estrelasDe(J.fase.dificuldade);
    const sx = pX + 140;
    for (let i = 0; i < nEst; i++) UI.sprite(c, Sprites.estrela(true), sx + i * 16, 78, 2);
    if (J.ganhouEstrelas > 0) {
      const a = Math.min(1, (u - 1.3) * 3);
      if (a > 0) { c.globalAlpha = a; UI.texto(c, t('ganhouEstrelas', { n: J.ganhouEstrelas }) + '★', sx + nEst * 16 + 4, 81, { cor: PAL.ouro }); c.globalAlpha = 1; }
    }
    // moedas
    const reg = Save.fase(J.fase.id);
    UI.texto(c, t('vitoriaMoedas'), sx, 106, { cor: PAL.cinzaClaro });
    for (let i = 0; i < 3; i++) UI.sprite(c, Sprites.moeda(reg.moedas[i]), sx + 60 + i * 18, 102, 2);
    UI.texto(c, t('vitoriaTentativas'), sx, 128, { cor: PAL.cinzaClaro });
    UI.texto(c, String(J.tentativa), pX + pW - 14, 128, { alinhar: 'direita', cor: PAL.branco });
    UI.texto(c, t('vitoriaRaspoes'), sx, 144, { cor: PAL.cinzaClaro });
    UI.texto(c, String(J.raspoes), pX + pW - 14, 144, { alinhar: 'direita', cor: PAL.branco });
    if (!Levels.proxima(J.fase.id)) UI.texto(c, t('maisFasesEmBreve'), CX, 176, { alinhar: 'centro', cor: PAL.almaClara });
    c.restore();
    if (ease >= 1) J.controles.desenhar(c, tempo);
  }

  // ========================================================= NAVEGAÇÃO ======
  const telas = { jogo: TelaJogo };

  function irPara(nome, args) {
    if (tela && tela.sair) tela.sair(nome);
    const anterior = nomeTela;
    nomeTela = nome;
    tela = telas[nome] || UI.telas[nome];
    if (!tela) throw new Error('tela não existe: ' + nome);
    if (tela.entrar) tela.entrar(Object.assign({ de: anterior }, args || {}));
  }

  function jogar(fase, desde) { irPara('jogo', { fase, desde }); }

  // ========================================================== LOOP ==========
  function loop(ms) {
    requestAnimationFrame(loop);
    let dt = (ms - ultimoMs) / 1000;
    ultimoMs = ms;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    tempo += dt;
    frame++;
    Sound.tick();
    const dtFx = J.estado === 'morto' && tempo - J.tMorte < CONFIG.morte.congelar ? 0 : dt;
    try {
      tela.atualizar(dt);
      Particulas.atualizar(dtFx * (nomeTela === 'jogo' ? Debug.vel : 1));
      fx.tremida *= Math.exp(-CONFIG.juice.tremidaDecaimento * dt);
      if (fx.tremida < 0.3) fx.tremida = 0;
      fx.flash *= Math.exp(-9 * dt);
      ctx.imageSmoothingEnabled = false;
      tela.desenhar(ctx);
    } catch (err) {
      console.error(err);
      if (Debug.ativo) Debug.erro(err);
    }
    if (Debug.ativo) Debug.frame(dt, ms);
  }

  function redimensionar() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    let esc = Math.min(vw / W, vh / H);
    const escDev = esc * dpr;
    if (escDev >= CONFIG.tela.escalaInteiraMin) esc = Math.floor(escDev) / dpr;
    canvas.style.width = Math.round(W * esc) + 'px';
    canvas.style.height = Math.round(H * esc) + 'px';
  }

  function aoPerderFoco() {
    if (nomeTela !== 'jogo' || !Save.config.pausaAuto) return;
    if (J.estado === 'jogando') pausar();
    else if (J.estado === 'contagem') { J.estado = 'pausa'; montarPausa(); }
    else if (J.estado === 'morto') J.pausarAoVoltar = true;
  }

  function init() {
    canvas = document.getElementById('tela');
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    Save.carregar();
    Input.init(canvas);
    Input.destino = (e) => {
      if (e.t === 'down' || e.t === 'up' || e.t === 'tecla') Sound.iniciar();   // iOS só libera áudio em alguns eventos
      if (Debug.ativo && e.t === 'tecla' && Debug.tecla(e)) return;
      if (tela && tela.evento) tela.evento(e);
    };
    window.addEventListener('resize', redimensionar);
    window.addEventListener('orientationchange', () => setTimeout(redimensionar, 100));
    document.addEventListener('visibilitychange', () => { if (document.hidden) aoPerderFoco(); });
    window.addEventListener('blur', aoPerderFoco);
    window.matchMedia && window.matchMedia('(orientation: portrait)').addEventListener?.('change', (m) => {
      if (m.matches && Input.temToque()) aoPerderFoco();
    });
    redimensionar();
    const girar = document.getElementById('girar');
    if (girar) girar.lastChild.textContent = t('girarCelular');
    Debug.init();
    irPara('titulo');
    requestAnimationFrame((ms) => { ultimoMs = ms; loop(ms); });
  }

  return {
    init, irPara, jogar, tremer, flash, desenharFundo, Particulas,
    get tempo() { return tempo; },
    get frame() { return frame; },
    get nomeTela() { return nomeTela; },
    get canvas() { return canvas; },
    J, alma,
    pausar, comecarTentativa,
    // debug/testes: mata a alma agora (como se encostasse num ataque)
    matar() { if (nomeTela === 'jogo' && J.estado === 'jogando') morrer({ s: { k: 0 } }); },
    // debug: pula para um % da fase atual
    pular(pct) {
      if (nomeTela !== 'jogo' || !J.fase) return;
      J.trapaca = true;
      const t0 = Math.max(0, Math.min(0.999, pct)) * J.comp.duracao;
      J.ataques.reiniciar(t0, alma);
      Sound.tocar(J.fase.musica, { desde: t0, vel: Debug.vel });
      J.t = t0; J.batida = t0 / J.comp.B; J.estado = 'jogando'; J.controles.limpar();
    },
    W, H, CX, CY, HW, HH,
  };
})();

window.addEventListener('load', () => Game.init());
