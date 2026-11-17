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
    trapaca: false,          // usou debug (pulo/invencível): não conta recorde
    tMorte: 0, pctMorte: 0, recorde: false,
    textoMorte: null,        // { pct, recorde, ini }
    textoTentativa: 0,       // tempo em que a tentativa começou
    tVitoria: 0, ganhouEstrelas: 0,
    pausaPos: 0, contagemIni: 0, contagemTicks: 0,
    dica: { ativa: false, movido: 0 },
    corrida: null,           // Sim.Corrida da fase atual (a lógica pura)
    teste: null,             // testando uma fase do editor: { reg, vitoria } — nada vai pro save
    moedasGanhas: 0,         // moedas comuns ganhas nesta tentativa
    raspoesPendentes: 0, comboPendente: 0,   // raspões ainda não somados na progressão
    tempoJogado: 0,          // s jogados ainda não somados na progressão
    inicio: 0,               // de onde cada tentativa começa (s): 0, ou o ponto escolhido no editor
    audioParado: 0, avisoAudio: false, recomecarAoContinuar: false,
    controles: new Controles(),
  };
  const entrada = { dx: 0, dy: 0, temAlvo: false, alvoX: 0, alvoY: 0 };
  // Arrasto ancorado: no começo do toque/clique, guarda onde a alma estava; a alma vai pra
  // âncora + o quanto o dedo/mouse andou. Mouse é sempre 1:1; dedo usa a sensibilidade.
  const pega = { sessao: -1, ultX: 0, ultY: 0, alvoX: 0, alvoY: 0, reancorar: false };
  const almaEspelho = { x: 0, y: 0 };
  const dirArrasto = { x: 0, y: 0 };

  // Estado VISUAL da alma (posição copiada da simulação a cada frame).
  const alma = {
    x: 0, y: 0, vx: 0, vy: 0, olharX: 0, olharY: 0, susto: 0,
    rastro: [], rastroI: 0,
  };
  for (let i = 0; i < CONFIG.alma.rastro; i++) alma.rastro.push({ x: 0, y: 0 });

  const cacheComp = {};

  function preparar(fase) {
    J.fase = fase;
    if (!cacheComp[fase.id] || cacheComp[fase.id].fase !== fase) {
      const comp = Patterns.compilar(fase, CONFIG.caixa);
      cacheComp[fase.id] = { fase, comp, corrida: new Sim.Corrida(comp) };
    }
    J.comp = cacheComp[fase.id].comp;
    J.corrida = cacheComp[fase.id].corrida;
    J.ataques = J.corrida.at;
    J.recomecarAoContinuar = false; J.avisoAudio = false; J.audioParado = 0;
    J.musica = Sound.info(fase.musica);
    J.voltar = fase.criada ? 'criadas' : 'fases';       // fase do editor volta pra Minhas Fases
    J.cor = COR_DIFICULDADE[fase.dificuldade] || PAL.alma;
    J.temMoedas = J.comp.specs.some(s => s.k === Patterns.TIPOS.MOEDA);
    J.trapaca = false;
    J.textoMorte = null;
    if (!J.teste && !fase.infinito) Save.dados.ultimaFase = fase.id;
    J.treinoCps = [];
    const reg = regAtual();
    J.dica.ativa = !semSave() && Save.dados.primeiraVez && Levels.indice(fase.id) === 0 && reg.tentativas < 3;
    J.dica.movido = 0;
  }

  // Ponto da caixa → tela (a caixa pode estar girada). Devolve sempre o mesmo objeto.
  const pTela = { x: 0, y: 0 };
  function naTela(x, y) {
    const r = J.corrida ? J.corrida.est.rad : 0;
    if (!r) { pTela.x = CX + x; pTela.y = CY + y; return pTela; }
    const co = Math.cos(r), si = Math.sin(r);
    pTela.x = CX + x * co - y * si; pTela.y = CY + x * si + y * co;
    return pTela;
  }

  // =========================================================== AVISOS ======
  // Fila de avisos no topo da tela (conquista, missão completa). Aparecem em qualquer tela.
  const notas = [];
  function notificar(txt, cor, icone) {
    notas.push({ txt, cor: cor || PAL.ouro, icone: icone || null, ini: -1 });
    if (notas.length > 6) notas.shift();
  }
  function desenharNotas(c) {
    const n = notas[0];
    if (!n) return;
    if (n.ini < 0) { n.ini = tempo; Sound.sfx('recorde'); }
    const u = tempo - n.ini, dur = CONFIG.progressao.avisoS;
    if (u > dur) { notas.shift(); return; }
    const entra = Math.min(1, u * 6, (dur - u) * 6);
    const w = UI.largura(n.txt) + (n.icone ? 24 : 14), y = Math.round(-18 + 24 * entra);
    c.fillStyle = PAL.preto; c.fillRect(Math.round(CX - w / 2) + 2, y + 2, w, 16);
    UI.painel(c, Math.round(CX - w / 2), y, w, 16, { fundo: PAL.fundo2, borda: n.cor });
    if (n.icone) c.drawImage(n.icone, Math.round(CX - w / 2) + 6, y + 4);
    UI.texto(c, n.txt, Math.round(CX - w / 2) + (n.icone ? 18 : 7), y + 5, { cor: n.cor });
  }

  // Um acontecimento pra progressão (missões, conquistas). Avisa o que completou.
  function progresso(ev) {
    const r = Progresso.registrar(Save.dados, ev, Date.now());
    for (const cq of r.conquistas) notificar(t('conquistaNova', { nome: t('conquistas.' + cq.id + '.nome') }), PAL.ouro, Sprites.desenho('trofeu', PAL.ouro));
    for (const m of r.missoes) notificar(t('missaoFeita'), PAL.verde, Sprites.desenho('check', PAL.verde));
    if (r.conquistas.length || r.missoes.length) Save.gravarDepois();
    return r;
  }
  // Moedas e missões só nas fases oficiais, sem debug e fora do teste do editor.
  const contaProgresso = () => !semSave() && J.fase && !J.fase.criada && !J.fase.debug && !J.trapaca;
  function ganharMoedas(n) {
    if (!contaProgresso() || !(n > 0)) return;
    J.moedasGanhas += Progresso.ganhar(Save.dados, n);
  }

  // Registro da fase no save. No teste do editor é um de mentira: nada é salvo.
  // Teste do editor e treino não mexem no save: usam um registro de mentira.
  const semSave = () => !!(J.teste || J.treino);
  function regAtual() { return J.teste ? J.teste.reg : J.treino ? J.treino.reg : J.infinito ? J.infinito.reg : Save.fase(J.fase.id); }
  const regFalso = () => ({ melhor: 0, tentativas: 0, vitorias: 0, moedas: [false, false, false] });

  // Treino: marca um checkpoint (tempo + onde a alma está); cada morte recomeça do último.
  function checkpoint(tirar) {
    if (!J.treino || J.estado !== 'jogando') return;
    const L = J.treino.cps;
    if (tirar) L.pop(); else L.push({ t: J.t, x: alma.x, y: alma.y });
    const u = L[L.length - 1];
    J.inicio = u ? u.t : 0; J.inicioX = u ? u.x : 0; J.inicioY = u ? u.y : 0;
    Sound.sfx(tirar ? 'voltar' : 'moeda');
    Flutuantes.add(t(tirar ? 'checkpointTirado' : 'checkpoint'), CX, CY - HH - 10, tirar ? PAL.cinzaClaro : PAL.verde, 0.8, 1);
  }

  function aoEventoAtaque(o) {
    const s = o.s;
    if (s.som) Sound.sfx(s.som);
    if (s.tremida) tremer(s.tremida);
    if (s.flash) flash(s.flash, PAL.perigoClaro);
    if (s.k === Patterns.TIPOS.ORBE) {
      const p = naTela(s.x, s.y);
      Particulas.explosao(p.x, p.y, 14, PAL.perigoClaro, 90, 0.35);
    }
  }

  // A música da fase (no infinito, em loop: cada volta é um segmento novo).
  function tocarMusica(desde) { Sound.tocar(J.fase.musica, { desde, vel: Debug.vel, loop: !!J.infinito }); }

  // ------------------------------------------------------- modo infinito --
  function segmentoInfinito(k) {
    const inf = J.infinito, tm = J.textoMorte, tr = J.trapaca;
    inf.k = k;
    preparar(Infinito.segmento(inf.semente, k, inf.info));
    J.textoMorte = tm;                     // o tempo da morte continua visível no começo da próxima
    if (k > 0) J.trapaca = tr;             // trocar de volta não "limpa" o uso de debug
  }
  function novaPartidaInfinito() {
    J.infinito.semente = Math.floor(Math.random() * 1e9);
    J.infinito.total = 0;
    segmentoInfinito(0);
  }
  // A música deu a volta: o próximo segmento começa limpo, com a alma onde está.
  function proximoSegmento() {
    const inf = J.infinito;
    inf.total += J.comp.duracao;
    const x = alma.x, y = alma.y;
    segmentoInfinito(inf.k + 1);
    J.corrida.reiniciar(0, x, y);
    J.t = 0; J.batida = 0; J.prog = 0;
    Flutuantes.add(t('volta', { n: inf.k + 1 }), CX, CY - HH - 10, PAL.ouro, 1.2, 1);
    Sound.sfx('passouMelhor');
  }
  const tempoTxt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // Começa (ou recomeça) uma tentativa. Rápido: nada é alocado aqui.
  function comecarTentativa(desdeT) {
    if (J.infinito) novaPartidaInfinito();
    const reg = regAtual();
    reg.tentativas++;
    if (!semSave()) { Save.dados.stats.tentativas++; Save.gravarDepois(); }
    J.tentativa = reg.tentativas;
    J.melhorAntes = reg.melhor;
    J.passouMelhor = false;
    J.raspoes = 0; J.combo = 0; J.ultimoRaspao = -9;
    J.moedasGanhas = 0;
    if (contaProgresso()) progresso({ tipo: 'tentativa' });
    J.recorde = false;
    J.textoTentativa = tempo;
    alma.x = 0; alma.y = 0; alma.vx = 0; alma.vy = 0; alma.susto = 0;
    for (const r of alma.rastro) { r.x = 0; r.y = 0; }
    pega.reancorar = true;
    if (desdeT !== undefined) J.corrida.reiniciar(desdeT);
    else J.corrida.reiniciar(J.inicio, J.inicioX, J.inicioY);
    alma.x = J.corrida.alma.x; alma.y = J.corrida.alma.y;
    for (const r of alma.rastro) { r.x = alma.x; r.y = alma.y; }
    J.t = J.corrida.t;
    J.prog = J.corrida.prog;
    tocarMusica(J.t);
    J.batida = J.t / J.comp.B;
    J.estado = 'jogando';
    J.audioParado = 0;
    Flutuantes.limpar();
  }

  // Onde o dedo/mouse está "segurando" a alma agora (px da caixa).
  function calcularAlvo() {
    const ar = Input.arrasto();
    entrada.temAlvo = false;
    if (!ar.ativo || Debug.bot) { pega.sessao = -1; pega.reancorar = false; return; }
    const sens = ar.tipo === 'mouse' ? CONFIG.toque.sensibilidadeMouse
      : (Save.config.sensibilidadeToque || CONFIG.toque.sensibilidadePadrao);
    if (ar.sessao !== pega.sessao) {
      // começou a arrastar: o alvo parte de onde a alma estava no clique (o que o cursor já andou conta)
      pega.sessao = ar.sessao; pega.alvoX = alma.x; pega.alvoY = alma.y; pega.ultX = 0; pega.ultY = 0;
    } else if (pega.reancorar) {
      // a alma voltou pro centro com o dedo ainda na tela (nova tentativa): recomeça daqui
      pega.alvoX = alma.x; pega.alvoY = alma.y; pega.ultX = ar.totalX; pega.ultY = ar.totalY;
    }
    pega.reancorar = false;
    // quanto o dedo/mouse andou desde o último frame (tela) → caixa (inversão e giro)
    const d = Sim.telaParaCaixa(J.corrida.est, (ar.totalX - pega.ultX) * sens, (ar.totalY - pega.ultY) * sens, dirArrasto);
    pega.ultX = ar.totalX; pega.ultY = ar.totalY;
    // passou da parede: o alvo para na borda, então voltar o dedo move a alma na hora
    const L = J.corrida.lim;
    pega.alvoX = Math.max(-L.x, Math.min(L.x, pega.alvoX + d.x));
    pega.alvoY = Math.max(-L.y, Math.min(L.y, pega.alvoY + d.y));
    entrada.temAlvo = true; entrada.alvoX = pega.alvoX; entrada.alvoY = pega.alvoY;
  }

  function atualizarJogo(dt) {
    if (J.estado === 'jogando') {
      // áudio parado (iPhone interrompeu, navegador bloqueou): pausa e pede um toque (B02)
      if (Sound.pronto() && !Sound.rodando()) {
        J.audioParado += dt;
        if (J.audioParado > CONFIG.audio.paradoMax) { J.avisoAudio = true; pausar(); return; }
      } else J.audioParado = 0;
      let t = Sound.posicao();
      if (!Sound.pronto()) t = J.t + dt;          // sem áudio nenhum: relógio de reserva
      if (J.infinito && t < J.t - 1) { proximoSegmento(); t = Math.max(0, t); }   // a música deu a volta
      if (t < J.t) t = J.t;                       // nunca volta no tempo
      const d = Debug.bot ? Debug.direcaoBot(J.corrida) : Input.direcao();
      entrada.dx = d.x; entrada.dy = d.y; entrada.local = !!Debug.bot;
      calcularAlvo();
      J.corrida.invencivel = Debug.invencivel;
      const ox = alma.x, oy = alma.y;
      const evs = J.corrida.passo(t, entrada);
      const ca = J.corrida.alma;
      alma.x = ca.x; alma.y = ca.y; alma.vx = ca.vx; alma.vy = ca.vy;
      J.dica.movido += Math.hypot(alma.x - ox, alma.y - oy);
      alma.olharX = alma.vx > 25 ? 1 : alma.vx < -25 ? -1 : 0;   // olhos seguem o movimento
      alma.olharY = alma.vy > 25 ? 1 : alma.vy < -25 ? -1 : 0;
      J.t = J.corrida.t;
      J.batida = J.t / J.comp.B;
      J.prog = J.corrida.prog;
      const r = alma.rastro[alma.rastroI]; r.x = alma.x; r.y = alma.y;
      alma.rastroI = (alma.rastroI + 1) % alma.rastro.length;
      if (alma.susto > 0) alma.susto -= dt;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        if (e.tipo === 'ativou') aoEventoAtaque(e.o);
        else if (e.tipo === 'moeda') pegarMoeda(e.s);
        else if (e.tipo === 'raspao') raspar(e.o);
        else if (e.tipo === 'morte') { morrer(e); return; }
        else if (e.tipo === 'vitoria') { if (J.infinito) proximoSegmento(); else vencer(); return; }
      }
      // passou o recorde nesta tentativa
      const pct = Math.floor(J.prog * 100);
      if (!J.passouMelhor && J.melhorAntes > 0 && pct > J.melhorAntes && !J.trapaca) {
        J.passouMelhor = true;
        Sound.sfx('passouMelhor');
      }
      if (J.dica.ativa && J.dica.movido > 30) J.dica.ativa = false;
      J.tempoJogado += dt;
      somarTempo(false);
    } else if (J.estado === 'morto') {
      pega.reancorar = true;
      const espera = J.recorde ? CONFIG.morte.atrasoReinicioRecorde : CONFIG.morte.atrasoReinicio;
      if (tempo - J.tMorte >= espera) comecarTentativa();
    } else if (J.estado === 'contagem') {
      pega.reancorar = true;
      const passo = 0.32;
      const n = Math.floor((tempo - J.contagemIni) / passo);
      if (n > J.contagemTicks) { J.contagemTicks = n; if (n < 3) Sound.sfx('contagem'); }
      if (tempo - J.contagemIni >= passo * 3) {
        Sound.sfx('contagemFim');
        tocarMusica(J.pausaPos);
        J.estado = 'jogando';
      }
    } else if (J.estado === 'vitoria') {
      pega.reancorar = true;
      if (tempo - J.tVitoria > 1.1 && !J.controles.itens.length) montarPainelVitoria();
      // confete
      if (tempo - J.tVitoria < 1.5 && frame % 3 === 0) {
        const cores = [PAL.ouro, PAL.alma, J.cor, PAL.branco, PAL.perigoClaro];
        Particulas.emitir(CX + (Math.random() - 0.5) * HW * 2, CY - HH - 4, (Math.random() - 0.5) * 30, 20 + Math.random() * 40,
          2.2, cores[(Math.random() * cores.length) | 0], Math.random() < 0.5 ? 2 : 1, 30);
      }
    } else {
      pega.reancorar = true;
    }
  }

  // Tempo jogado entra na progressão de tempos em tempos (e ao morrer/vencer).
  function somarTempo(agora) {
    if (!contaProgresso()) { J.tempoJogado = 0; J.raspoesPendentes = 0; J.comboPendente = 0; return; }
    if (J.raspoesPendentes && (agora || frame % 30 === 0)) { progresso({ tipo: 'raspao', n: J.raspoesPendentes }); J.raspoesPendentes = 0; }
    if (J.comboPendente > 1 && (agora || frame % 30 === 0)) { progresso({ tipo: 'combo', n: J.comboPendente }); J.comboPendente = 0; }
    if (J.tempoJogado >= CONFIG.economia.tempoLote || (agora && J.tempoJogado >= 1)) {
      const n = Math.floor(J.tempoJogado);
      J.tempoJogado -= n;
      progresso({ tipo: 'tempo', n });
    }
  }

  function raspar(o) {
    J.raspoes++;
    if (!semSave()) Save.dados.stats.raspoes++;
    J.combo = tempo - J.ultimoRaspao < CONFIG.raspao.janelaCombo ? J.combo + 1 : 1;
    if (contaProgresso()) {
      ganharMoedas(CONFIG.economia.raspao);
      J.raspoesPendentes++;                       // entram na progressão em lote (somarTempo)
      if (J.combo > J.comboPendente) J.comboPendente = J.combo;
    }
    J.ultimoRaspao = tempo;
    alma.susto = 0.25;
    Sound.sfx('raspao', 0, J.combo - 1);
    const txt = J.combo > 1 ? t('raspouCombo', { n: J.combo }) : t('raspou');
    const p = naTela(alma.x, alma.y), px = p.x, py = p.y;
    Flutuantes.add(txt, px, py - 16, J.combo > 2 ? PAL.ouro : PAL.almaClara, CONFIG.raspao.textoDuracao, 1);
    // faíscas saindo do lado do ataque
    const ang = Math.atan2(alma.y - (o.y || 0), alma.x - (o.x || 0)) + J.corrida.est.rad;
    for (let k = 0; k < 5; k++) {
      const a = ang + (Math.random() - 0.5) * 1.6, v = 50 + Math.random() * 80;
      Particulas.emitir(px, py, Math.cos(a) * v, Math.sin(a) * v, 0.25, PAL.almaClara, 1, 0, 3);
    }
  }

  function pegarMoeda(s) {
    if (contaProgresso()) progresso({ tipo: 'secreta' });
    Sound.sfx('moeda');
    const p = naTela(s.x, s.y);
    Particulas.explosao(p.x, p.y, 16, PAL.ouro, 70, 0.5);
    Flutuantes.add('+', p.x, p.y - 8, PAL.ouro, 0.6, 2);
  }

  function morrer(e) {
    J.estado = 'morto';
    Flutuantes.limpar();
    J.tMorte = tempo;
    J.t = e.t;
    J.prog = J.corrida.prog;
    Sound.parar();
    Sound.sfx('morte');
    const pct = e.pct;
    J.pctMorte = pct;
    const reg = regAtual();
    if (J.infinito) {
      // recorde do infinito é o tempo aguentado (somando as voltas)
      const total = J.infinito.total + e.t, inf = Save.dados.infinito;
      J.recorde = !J.trapaca && total > inf.melhor;
      if (!J.trapaca) { inf.partidas++; if (J.recorde) inf.melhor = total; }
      if (contaProgresso()) somarTempo(true);
      Save.gravar();
      J.textoMorte = { pct, txt: tempoTxt(total), recorde: J.recorde, ini: tempo };
    } else if (semSave()) {
      J.recorde = false;
      reg.melhor = Math.max(reg.melhor, pct);
    } else {
      const rm = Save.registrarMorte(reg, pct, J.trapaca);
      J.recorde = rm.recorde;
      if (J.recorde) ganharMoedas(Progresso.doRecorde(rm.antes, pct));
      if (contaProgresso()) { progresso({ tipo: 'morte', pct, dificuldade: J.fase.dificuldade }); somarTempo(true); }
      if (J.recorde) {
        setTimeout(() => Sound.sfx('recorde'), 140);
        Save.gravar();                   // recorde não pode se perder se o app fechar agora (B04)
      } else Save.gravarDepois();
    }
    if (!J.infinito) J.textoMorte = { pct, recorde: J.recorde, ini: tempo };
    tremer(CONFIG.juice.tremidaMorte);
    flash(CONFIG.juice.flashMorte, '#ffffff');
    // a alma (ou o reflexo dela, se foi o reflexo que bateu) se desfaz em pixels
    const cor = Avatar.corPrincipal();
    const mult = CONFIG.morte.particulas * (reduzido() ? 0.5 : 1);
    const m = naTela(e.x !== undefined ? e.x : alma.x, e.y !== undefined ? e.y : alma.y), mx = m.x, my = m.y;
    for (const p of Avatar.pixels(Avatar.atual())) {
      if (Math.random() > mult) continue;
      const a = Math.atan2(p.y + 0.01, p.x + 0.01), v = 40 + Math.random() * 120;
      Particulas.emitir(mx + p.x, my + p.y, Math.cos(a) * v + (Math.random() - 0.5) * 40,
        Math.sin(a) * v + (Math.random() - 0.5) * 40, 0.5 + Math.random() * 0.5, p.cor, 1, 120, 1.2);
    }
    Particulas.explosao(mx, my, 10, cor, 160, 0.4);
    if (Debug.ativo && !semSave()) Debug.aoMorrer(pct);
  }

  function vencer() {
    J.estado = 'vitoria';
    J.tVitoria = tempo;
    J.prog = 1;
    if (J.teste) {
      // vitória no teste do editor: "do começo e sem debug" é o que conta pra verificar (Sessão 3)
      J.ganhouEstrelas = 0;
      J.teste.reg.vitorias++;
      J.teste.vitoria = { doInicio: J.inicio === 0 && !J.trapaca, tentativas: J.teste.reg.tentativas, moedas: Array.from(J.corrida.moedas) };
    } else if (J.treino) {
      J.ganhouEstrelas = 0;
    } else {
      const reg = Save.fase(J.fase.id);
      // fase criada não dá estrela (estrela é das oficiais)
      const rv = Save.registrarVitoria(reg, J.corrida.moedas, J.trapaca, J.fase.criada ? null : J.fase.dificuldade);
      J.ganhouEstrelas = rv.estrelas;
      if (contaProgresso()) {
        ganharMoedas(Progresso.doRecorde(rv.antes, 100) + Progresso.daVitoria(rv.primeira, J.fase.dificuldade));
        progresso({ tipo: 'vitoria', dificuldade: J.fase.dificuldade });
        somarTempo(true);
      }
      if (!J.trapaca && Levels.indice(J.fase.id) === 0) Save.dados.primeiraVez = false;
      Save.gravar();
    }
    Sound.sfx('vitoria');
    flash(0.5, '#ffffff');
    tremer(3);
    const p = naTela(alma.x, alma.y);
    Particulas.explosao(p.x, p.y, 30, PAL.ouro, 140, 0.8);
    // tudo que sobrou vira fumaça
    J.ataques.reiniciar(J.comp.duracao + 999, J.corrida.alma);
    J.controles.limpar();
  }

  function montarPainelVitoria() {
    const C = J.controles;
    C.limpar();
    const pW = 300, pX = (W - pW) / 2;
    if (J.teste) {
      const pri = C.botao({ x: pX + 70, y: 198, w: 160, h: 20, texto: t('editor.editorVoltar'), icone: Sprites.desenho('lapis', PAL.preto),
        primario: true, cor: PAL.ouro, acao: () => irPara('editor') });
      C.botao({ x: pX + 90, y: 226, w: 120, h: 16, texto: t('repetir'), icone: Sprites.desenho('repetir', PAL.branco),
        acao: () => { J.textoMorte = null; J.controles.limpar(); comecarTentativa(); } });
      C.focar(pri);
      return;
    }
    const prox = Levels.proxima(J.fase.id);
    const pri = C.botao({ x: pX + 70, y: 198, w: 160, h: 20, texto: prox ? t('proxima') : t('fases'), primario: true, cor: PAL.ouro,
      acao: () => { if (prox) jogar(prox); else irPara(J.voltar); } });
    C.botao({ x: pX + 24, y: 226, w: 120, h: 16, texto: t('repetir'), icone: Sprites.desenho('repetir', PAL.branco),
      acao: () => { J.textoMorte = null; J.controles.limpar(); comecarTentativa(); } });
    C.botao({ x: pX + 156, y: 226, w: 120, h: 16, texto: t('fases'), icone: Sprites.desenho('lista', PAL.branco),
      acao: () => irPara(J.voltar) });
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
    if (J.teste) C.botao({ x, y: 172, w: 150, h: 16, texto: t('editor.editorVoltar'), icone: Sprites.desenho('lapis', PAL.branco), acao: () => irPara('editor') });
    else C.botao({ x, y: 172, w: 150, h: 16, texto: t('sair'), acao: () => irPara(J.voltar) });
    C.focar(pri);
  }

  // Pausar durante a tela de morte: "continuar" começa a próxima tentativa.
  function pausarNaMorte() {
    if (J.estado !== 'morto') return;
    J.estado = 'pausa';
    J.recomecarAoContinuar = true;
    Sound.sfx('menu');
    montarPausa();
  }

  function continuar() {
    J.controles.limpar();
    J.avisoAudio = false;
    if (J.recomecarAoContinuar) { J.recomecarAoContinuar = false; comecarTentativa(); return; }
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
      J.teste = args.teste ? { reg: regFalso(), vitoria: null } : null;
      J.treino = args.treino ? { reg: regFalso(), cps: [] } : null;
      J.infinito = args.infinito ? { reg: regFalso(), semente: 0, k: 0, total: 0, info: Sound.info(CONFIG.infinito.musica) } : null;
      if (J.infinito) { J.infinito.info = { bpm: J.infinito.info.bpm, batidas: J.infinito.info.batidas }; novaPartidaInfinito(); args.fase = J.fase; }
      J.inicio = args.teste ? Math.max(0, args.desde || 0) : 0;
      J.inicioX = 0; J.inicioY = 0;
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
          else if (e.code === 'KeyC') checkpoint(false);
          else if (e.code === 'KeyV') checkpoint(true);
        } else if (e.t === 'down' && e.x > W - 34 && e.y < 26) pausar();
        else if (e.t === 'down' && J.treino && e.x > W - 36 && e.y > H - 36) checkpoint(false);
        return;
      }
      if (J.estado === 'morto') {
        if (e.t === 'tecla' && !e.repetida && (e.k === 'voltar' || e.k === 'pausa')) { pausarNaMorte(); return; }
        if (e.t === 'down' && e.x > W - 34 && e.y < 26) { pausarNaMorte(); return; }
        if (tempo - J.tMorte < CONFIG.morte.toquePulaApos) return;
        if (e.t === 'tecla' && !e.repetida) {
          if (e.k) comecarTentativa();
        } else if (e.t === 'down') comecarTentativa();
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
    const est = J.corrida.est;
    const bw = HW * est.largura, bh = HH * est.altura;      // meia-largura/altura atuais da caixa
    c.save();
    c.translate(CX, CY);
    if (est.rad) c.rotate(est.rad);
    c.fillStyle = PAL.preto;
    c.fillRect(-bw, -bh, bw * 2, bh * 2);

    // conteúdo da caixa (com recorte)
    c.save();
    c.beginPath(); c.rect(-bw, -bh, bw * 2, bh * 2); c.clip();
    const op = { hitbox: Debug.hitbox, reduzido: reduzido(), alma, frame,
      piscaMorte: J.estado === 'morto' && Math.floor((tempo - J.tMorte) * 12) % 2 === 0 };
    Render.ataques(c, J.ataques, J.t, batida, op);
    const espelhoVivo = est.espelho && J.estado !== 'morto';
    if (espelhoVivo) Patterns.espelhar(est.espelho, alma.x, alma.y, almaEspelho);
    if (J.estado !== 'morto') {
      desenharAlma(c);
      if (espelhoVivo) {
        c.globalAlpha = 0.8;
        Avatar.desenhar(c, Avatar.atual(), Math.round(almaEspelho.x), Math.round(almaEspelho.y), 1,
          { olharX: est.espelho === 'y' ? alma.olharX : -alma.olharX, olharY: est.espelho === 'x' ? alma.olharY : -alma.olharY });
        c.globalAlpha = 1;
      }
    }
    if (est.escuro > 0.01) {
      Render.escuridao(c, est, espelhoVivo ? [alma, almaEspelho] : [alma], bw, bh, Avatar.corPrincipal());
      c.globalAlpha = 0.7; Render.avisos(c, J.ataques, J.t, batida, op); c.globalAlpha = 1;   // aviso sempre visível
    }
    if (Debug.hitbox) {
      c.strokeStyle = '#ffff00'; c.beginPath(); c.arc(alma.x, alma.y, CONFIG.alma.raioRaspao, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#00ff66'; c.beginPath(); c.arc(alma.x, alma.y, CONFIG.alma.raioHitbox, 0, Math.PI * 2); c.stroke();
    }
    if (J.dica.ativa && J.estado === 'jogando') desenharDica(c);
    c.restore();

    // borda da caixa (pulsa na batida; roxa com os controles invertidos)
    const b = CONFIG.caixa.borda;
    const corBorda = J.estado === 'morto' ? PAL.perigo : (est.invX || est.invY) ? PAL.roxo : PAL.branco;
    c.fillStyle = corBorda;
    const x0 = -bw - b - pulso, y0 = -bh - b - pulso, w0 = bw * 2 + (b + pulso) * 2, h0 = bh * 2 + (b + pulso) * 2;
    c.fillRect(x0, y0, w0, b); c.fillRect(x0, y0 + h0 - b, w0, b);
    c.fillRect(x0, y0, b, h0); c.fillRect(x0 + w0 - b, y0, b, h0);
    if (pulso > 0) {
      c.globalAlpha = 0.35;
      c.fillStyle = J.cor;
      c.fillRect(x0 - 1, y0 - 1, w0 + 2, 1); c.fillRect(x0 - 1, y0 + h0, w0 + 2, 1);
      c.fillRect(x0 - 1, y0, 1, h0); c.fillRect(x0 + w0, y0, 1, h0);
      c.globalAlpha = 1;
    }
    if (J.estado === 'jogando') Render.avisosMods(c, J.comp, J.t, est, batida, bw, bh, alma);
    c.restore();

    Particulas.desenhar(c);
    Flutuantes.desenhar(c);
    c.restore();

    desenharHUD(c);
    if (J.estado === 'pausa') desenharPausa(c);
    if (J.estado === 'contagem') desenharContagem(c);
    if (J.estado === 'vitoria') desenharVitoria(c);
  }

  const ARCOIRIS = ['#ff4d4d', '#ff9f43', '#ffd23f', '#3ddc84', '#4df3ff', '#4d7cff', '#c04dff'];
  function desenharAlma(c) {
    // rastro
    if (!reduzido()) {
      const ra = Avatar.rastro();
      c.fillStyle = ra.cor;
      const n = alma.rastro.length;
      for (let i = 0; i < n; i++) {
        const r = alma.rastro[(alma.rastroI + i) % n];
        const k = i / n;
        if (Math.abs(r.x - alma.x) + Math.abs(r.y - alma.y) < 2) continue;
        c.globalAlpha = 0.08 + 0.25 * k;
        const s = 3 + Math.round(k * 4), x = Math.round(r.x), y = Math.round(r.y);
        if (ra.estilo === 'arcoiris') { c.fillStyle = ARCOIRIS[(i + (frame >> 2)) % ARCOIRIS.length]; c.globalAlpha = 0.15 + 0.4 * k; }
        if (ra.estilo === 'faiscas') { c.globalAlpha = (i + frame) % 3 ? 0.15 + 0.5 * k : 0; c.fillRect(x - 2, y, 5, 1); c.fillRect(x, y - 2, 1, 5); }
        else if (ra.estilo === 'bolhas') {
          const h = s >> 1;
          c.fillRect(x - h, y - h - 1, s, 1); c.fillRect(x - h, y + h, s, 1); c.fillRect(x - h - 1, y - h, 1, s); c.fillRect(x + h, y - h, 1, s);
        } else c.fillRect(Math.round(r.x - s / 2), Math.round(r.y - s / 2), s, s);
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
    const melhor = regAtual().melhor;
    if (melhor > 0 && melhor < 100) {
      const mx = bx + Math.round(bw * melhor / 100);
      c.fillStyle = J.passouMelhor && Math.floor(tempo * 8) % 2 ? PAL.branco : PAL.ouro;
      c.fillRect(mx, by - 2, 1, 8);
    }
    const pct = Math.floor(J.prog * 100);
    if (J.infinito) {
      UI.texto(c, tempoTxt(J.infinito.total + J.t), bx + bw + 6, by - 1, { cor: PAL.branco, sombra: PAL.preto });
      UI.texto(c, t('volta', { n: J.infinito.k + 1 }), bx - 6, by - 1, { alinhar: 'direita', cor: PAL.ouro, sombra: PAL.preto });
      if (Save.dados.infinito.melhor > 0) UI.texto(c, t('melhorTempo', { t: tempoTxt(Save.dados.infinito.melhor) }), CX, by + 8, { alinhar: 'centro', cor: PAL.cinzaClaro, sombra: PAL.preto });
    } else UI.texto(c, pct + '%', bx + bw + 6, by - 1, { cor: PAL.branco, sombra: PAL.preto });
    // moedas da fase
    const reg = regAtual();
    if (J.temMoedas) {
      for (let i = 0; i < 3; i++) {
        const x = 8 + i * 10, y = 5;
        if (J.corrida.moedas[i]) c.drawImage(Sprites.moeda(true), x, y);
        else if (reg.moedas[i]) { c.globalAlpha = 0.35; c.drawImage(Sprites.moeda(true), x, y); c.globalAlpha = 1; }
        else c.drawImage(Sprites.moeda(false), x, y);
      }
    }
    if (J.teste) UI.texto(c, t('editor.testeTitulo'), 8, H - 11, { cor: PAL.alma, sombra: PAL.preto });
    if (J.treino) {
      UI.texto(c, t('treinoDica'), 8, H - 11, { cor: PAL.verde, sombra: PAL.preto });
      for (const cp of J.treino.cps) { c.fillStyle = PAL.verde; c.fillRect(bx + Math.round(bw * cp.t / J.comp.duracao), by - 3, 1, 10); }
      if (J.estado === 'jogando') { UI.painel(c, W - 34, H - 34, 28, 26, { fundo: PAL.fundo2, borda: PAL.verde }); c.drawImage(Sprites.desenho('bandeira', PAL.verde), W - 25, H - 26); }
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
        UI.texto(c, tm.txt || tm.pct + '%', CX, yPct, { escala: Math.round(6 * pop), alinhar: 'centro', cor: tm.recorde ? PAL.ouro : PAL.branco, sombra: PAL.preto });
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
    const nomePausa = J.infinito ? t('infinito') + ' · ' + tempoTxt(J.infinito.total + J.t) : J.fase.nome + ' · ' + Math.floor(J.prog * 100) + '%';
    UI.texto(c, nomePausa, CX, 84, { alinhar: 'centro', cor: J.cor });
    if (J.avisoAudio) UI.texto(c, t('audioInterrompido'), CX, 206, { alinhar: 'centro', cor: PAL.ouro, sombra: PAL.preto });
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
    const nEst = semSave() || J.fase.criada ? 0 : Levels.estrelasDe(J.fase.dificuldade);
    const sx = pX + 140;
    for (let i = 0; i < nEst; i++) UI.sprite(c, Sprites.estrela(true), sx + i * 16, 78, 2);
    if (J.teste) UI.texto(c, t('editor.venceuTeste'), sx - 6, 81, { cor: PAL.ouro });
    if (J.ganhouEstrelas > 0) {
      const a = Math.min(1, (u - 1.3) * 3);
      if (a > 0) { c.globalAlpha = a; UI.texto(c, t('ganhouEstrelas', { n: J.ganhouEstrelas }) + '★', sx + nEst * 16 + 4, 81, { cor: PAL.ouro }); c.globalAlpha = 1; }
    }
    // moedas
    const moedas = semSave() ? J.corrida.moedas : Save.fase(J.fase.id).moedas;
    UI.texto(c, t('vitoriaMoedas'), sx, 106, { cor: PAL.cinzaClaro });
    for (let i = 0; i < 3; i++) UI.sprite(c, Sprites.moeda(moedas[i]), sx + 60 + i * 18, 102, 2);
    UI.texto(c, t('vitoriaTentativas'), sx, 128, { cor: PAL.cinzaClaro });
    UI.texto(c, String(J.tentativa), pX + pW - 14, 128, { alinhar: 'direita', cor: PAL.branco });
    UI.texto(c, t('vitoriaRaspoes'), sx, 144, { cor: PAL.cinzaClaro });
    UI.texto(c, String(J.raspoes), pX + pW - 14, 144, { alinhar: 'direita', cor: PAL.branco });
    if (J.moedasGanhas > 0) UI.texto(c, t('moedasGanhas', { n: J.moedasGanhas }), CX, 162, { alinhar: 'centro', cor: PAL.ouro });
    if (!semSave() && !J.fase.criada && !Levels.proxima(J.fase.id)) UI.texto(c, t('maisFasesEmBreve'), CX, 176, { alinhar: 'centro', cor: PAL.almaClara });
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
  // Teste do editor: começa (e recomeça a cada morte) em `desde` segundos; nada vai pro save.
  function testar(fase, desde) { irPara('jogo', { fase, desde, teste: true }); }
  // Treino: checkpoints à vontade, nada conta (recorde, moedas, missões, mapa de mortes).
  function treinar(fase) { irPara('jogo', { fase, treino: true }); }
  // Modo infinito: segmentos gerados a cada volta da música, recorde de tempo.
  function infinito() { irPara('jogo', { infinito: true }); }

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
      Erros.registrar(err, 'loop/' + nomeTela);
      if (Debug.ativo) Debug.erro(err);
      // um erro no meio do desenho deixa save()/clip()/translate() abertos e todos os frames
      // seguintes sairiam tortos (B19): limpa o estado do canvas
      for (let i = 0; i < 16; i++) ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    try { desenharAvisos(ctx); desenharNotas(ctx); } catch (e) { /* o aviso nunca derruba o jogo */ }
    if (Debug.ativo) Debug.frame(dt, ms);
  }

  // Avisos discretos no rodapé: erro registrado, save recuperado.
  function desenharAvisos(c) {
    let txt = null, cor = PAL.ouro;
    if (Erros.recente(4)) { txt = t('erroAviso'); cor = PAL.perigoClaro; }
    else if (Save.recuperado && tempo < 8) txt = Save.recuperado === 'backup' ? t('saveRecuperado') : t('savePerdido');
    if (!txt) return;
    const w = UI.largura(txt) + 10;
    c.globalAlpha = 0.85; c.fillStyle = PAL.preto; c.fillRect(Math.round(CX - w / 2), H - 13, w, 11); c.globalAlpha = 1;
    UI.texto(c, txt, CX, H - 11, { alinhar: 'centro', cor });
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
    else if (J.estado === 'morto') pausarNaMorte();
  }

  function init() {
    canvas = document.getElementById('tela');
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    Save.carregar();
    Save.instalar();
    Idioma.escolher(Save.config.idioma);
    Criadas.carregar();
    Criadas.instalar();
    // missões de hoje e conquistas do que já foi feito antes (save antigo); grava só se mudou
    const diaAntes = Save.dados.missoes.dia + Save.dados.missoes.semana;
    Progresso.atualizarMissoes(Save.dados, Date.now());
    const novas = Progresso.conferirConquistas(Save.dados, Date.now());
    for (const cq of novas) notificar(t('conquistaNova', { nome: t('conquistas.' + cq.id + '.nome') }), PAL.ouro);
    if (novas.length || diaAntes !== Save.dados.missoes.dia + Save.dados.missoes.semana) Save.gravarDepois();
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
    init, irPara, jogar, testar, treinar, infinito, tremer, flash, desenharFundo, Particulas, notificar, progresso,
    get tempo() { return tempo; },
    get frame() { return frame; },
    get nomeTela() { return nomeTela; },
    get canvas() { return canvas; },
    J, alma,
    pausar, comecarTentativa,
    // debug/testes: mata a alma agora (como se encostasse num ataque)
    matar() {
      if (nomeTela !== 'jogo' || J.estado !== 'jogando') return;
      J.corrida.morrer({ s: { k: 0 } }, J.t);
      morrer(J.corrida.morte);
    },
    // debug: pula para um % da fase atual
    pular(pct) {
      if (nomeTela !== 'jogo' || !J.fase) return;
      J.trapaca = true;
      const t0 = Math.max(0, Math.min(0.999, pct)) * J.comp.duracao;
      J.corrida.reiniciar(t0);
      tocarMusica(t0);
      J.t = t0; J.batida = t0 / J.comp.B; J.prog = J.corrida.prog; J.estado = 'jogando'; J.controles.limpar();
    },
    W, H, CX, CY, HW, HH,
  };
})();

window.addEventListener('load', () => Game.init());
