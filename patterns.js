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
  const BALA = 1, LASER = 2, PAREDE = 3, MURO = 4, ORBE = 5, EMISSOR = 6, MOEDA = 7, PLATAFORMA = 8;
  const MODOS = ['livre', 'gravidade', 'trilhos', 'escudo', 'gelo', 'mini'];

  // ======================================================== VALIDAÇÃO ======
  // Toda fase passa por aqui antes de compilar (oficial, do editor ou de código
  // compartilhado). Nunca lança erro: corrige o que dá, descarta o resto e
  // devolve avisos. Garante que nada vira NaN e que nenhuma fase trava o jogo.
  const NUM = (min, max) => ({ t: 'num', min, max });
  const INT = (min, max) => ({ t: 'int', min, max });
  const POS = { t: 'pos' };
  const LADOS = ['cima', 'baixo', 'esquerda', 'direita'];
  const COMUNS = { aviso: NUM(0, 16), intervalo: NUM(0, 16), vel: NUM(10, 600), tam: NUM(2, 40) };
  const ESQUEMA = {
    chuva: { pos: POS, de: LADOS },
    fogo: { pos: POS, eixo: ['h', 'v'], alternar: 'bool' },
    laser: { pos: POS, orient: 'orient', larg: NUM(2, 120), dur: NUM(0.05, 64), ate: POS },
    paredes: { modo: ['buraco'], eixo: ['h', 'v'], de: LADOS, centro: POS, espaco: NUM(8, 400), fechar: NUM(0.05, 16),
      segurar: NUM(0, 64), abrir: NUM(0.05, 16), larg: NUM(2, 80) },
    espiral: { x: NUM(-1, 1), y: NUM(-1, 1), bracos: INT(1, 16), giro: NUM(-1440, 1440), dur: NUM(0.25, 64),
      cadencia: NUM(0.25, 16), ang: NUM(-3600, 3600) },
    teleguiada: { de: LADOS, pos: POS, quantidade: INT(1, 64), guia: NUM(0, 1440), guiaDur: NUM(0, 16) },
    anel: { x: NUM(-1, 1), y: NUM(-1, 1), quantidade: INT(1, 128), giro: NUM(-3600, 3600), raio: NUM(2, 120) },
    moeda: { x: NUM(-1, 1), y: NUM(-1, 1), dur: NUM(0.25, 64), id: INT(0, 2) },
    // modificadores da caixa (não geram projéteis: viram "trilhas" de estado ao longo do tempo)
    caixa: { largura: NUM(0.2, 1), altura: NUM(0.2, 1), dur: NUM(0, 32) },
    girar: { angulo: NUM(-1440, 1440), dur: NUM(0, 32) },
    escuro: { nivel: NUM(0, 1), raio: NUM(12, 200), dur: NUM(0, 32) },
    inverter: { x: 'bool', y: 'bool' },
    // portal: troca o modo da alma (livre, gravidade, trilhos, escudo, gelo, mini)
    modo: { modo: MODOS, lado: ['baixo', 'cima'], linhas: INT(3, 5) },
    // plataforma (só tem efeito no modo gravidade: dá pra ficar em cima dela)
    plataforma: { x: NUM(-1, 1), y: NUM(-1, 1), larg: NUM(8, 288), dur: NUM(0.25, 64) },
    espelho: { ativo: 'bool', eixo: ['x', 'y', 'xy'] },
  };
  const DIFICULDADES = ['facil', 'normal', 'dificil', 'dificilimo', 'insano', 'demonio'];
  // "tem a chave" sem olhar o protótipo: tipo '__proto__', 'constructor' ou 'toString' não é evento (B22)
  const tem = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);
  const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

  function limparParam(regra, v) {
    if (Array.isArray(regra)) return regra.includes(v) ? v : undefined;
    if (regra === 'bool') return typeof v === 'boolean' ? v : undefined;
    if (regra === 'orient') return v === 'v' || v === 'h' ? v : ehNum(v) ? clamp(v, -360, 360) : undefined;
    if (regra.t === 'num') return ehNum(v) ? clamp(v, regra.min, regra.max) : undefined;
    if (regra.t === 'int') return ehNum(v) ? clamp(Math.round(v), regra.min, regra.max) : undefined;
    if (regra.t === 'pos') {
      if (ehNum(v)) return clamp(v, -1, 1);
      if (!Array.isArray(v)) return undefined;
      const l = v.filter(ehNum).slice(0, CONFIG.limites.maxPosicoes).map(x => clamp(x, -1, 1));
      return l.length ? l : undefined;
    }
    return undefined;
  }

  // Quantos projéteis um evento (já limpo) vai gerar.
  function contarSpecs(ev) {
    const n = (v) => (Array.isArray(v) ? v.length : 1);
    switch (ev.tipo) {
      case 'chuva': case 'laser': return n(ev.pos);
      case 'fogo': return n(ev.pos) * (ev.alternar === false ? 2 : 1);
      case 'paredes': return ev.modo === 'buraco' ? n(ev.centro) : 2;
      case 'espiral': return 1 + Math.max(1, Math.round((ev.dur !== undefined ? ev.dur : 4) * (ev.cadencia || 2))) * (ev.bracos || 3);
      case 'teleguiada': return ev.quantidade || 3;
      case 'anel': return 1 + (ev.quantidade || 12);
      case 'caixa': case 'girar': case 'escuro': case 'inverter': case 'espelho': case 'modo': return 0;
      default: return 1;
    }
  }

  function validar(fase) {
    const avisos = [];
    const L = CONFIG.limites;
    if (!fase || typeof fase !== 'object') { fase = {}; avisos.push('fase inválida'); }
    const txt = (v, def) => (typeof v === 'string' ? v.slice(0, L.maxTexto) : def);
    const out = {
      id: txt(fase.id, 'sem-id'),
      nome: txt(fase.nome, 'Sem nome'),
      autor: txt(fase.autor, '?'),
      dificuldade: DIFICULDADES.includes(fase.dificuldade) ? fase.dificuldade : 'normal',
      musica: txt(fase.musica, ''),
      bpm: ehNum(fase.bpm) ? clamp(fase.bpm, L.bpmMin, L.bpmMax) : 120,
      duracaoBatidas: ehNum(fase.duracaoBatidas) ? clamp(fase.duracaoBatidas, L.batidasMin, L.batidasMax) : 64,
      eventos: [],
    };
    if (fase.debug === true) out.debug = true;
    if (out.bpm !== fase.bpm) avisos.push('bpm corrigido para ' + out.bpm);
    if (out.duracaoBatidas !== fase.duracaoBatidas) avisos.push('duração corrigida para ' + out.duracaoBatidas);
    const evs = Array.isArray(fase.eventos) ? fase.eventos : [];
    if (evs.length > L.maxEventos) avisos.push(`eventos demais (${evs.length}); ficam os ${L.maxEventos} primeiros`);
    let total = 0;
    for (let i = 0; i < evs.length && i < L.maxEventos; i++) {
      const ev = evs[i];
      if (!ev || typeof ev !== 'object' || !tem(ESQUEMA, ev.tipo)) { avisos.push(`evento ${i}: tipo desconhecido`); continue; }
      if (!ehNum(ev.batida) || ev.batida < 0 || ev.batida > out.duracaoBatidas + 64) { avisos.push(`evento ${i}: batida inválida`); continue; }
      const limpo = { batida: ev.batida, tipo: ev.tipo };
      const regras = Object.assign({}, COMUNS, ESQUEMA[ev.tipo]);
      for (const k in regras) {
        if (ev[k] === undefined) continue;
        const v = limparParam(regras[k], ev[k]);
        if (v === undefined) avisos.push(`evento ${i}: "${k}" inválido, usando o padrão`);
        else limpo[k] = v;
      }
      // espiral muito longa: encurta pra caber no limite por evento
      if (limpo.tipo === 'espiral') {
        const porTiro = limpo.bracos || 3, cad = limpo.cadencia || 2;
        const maxDur = Math.floor((L.maxPorEvento - 1) / porTiro) / cad;
        if ((limpo.dur !== undefined ? limpo.dur : 4) > maxDur) { limpo.dur = maxDur; avisos.push(`evento ${i}: espiral encurtada`); }
      }
      const n = contarSpecs(limpo);
      if (n > L.maxPorEvento) { avisos.push(`evento ${i}: projéteis demais (${n})`); continue; }
      if (total + n > L.maxSpecs) { avisos.push(`fase passou de ${L.maxSpecs} projéteis; o resto foi ignorado`); break; }
      total += n;
      out.eventos.push(limpo);
    }
    return { fase: out, avisos };
  }

  // ======================================================== COMPILAÇÃO =====
  // fase -> { specs[], duracao, B (s por batida), velMax, maxVivos, fase (validada), avisos }
  function compilar(faseBruta, caixa) {
    const { fase, avisos } = validar(faseBruta);
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
      if (tem(MODIFICADORES, ev.tipo)) return;     // viram trilhas (abaixo)
      const g = tem(GERADORES, ev.tipo) ? GERADORES[ev.tipo] : null;
      if (!g) { if (typeof console !== 'undefined') console.warn('[Dodge] tipo de evento desconhecido:', ev.tipo); return; }
      g(ev, C, idx);
    });
    specs.sort((a, b) => a.tA - b.tA || a.ordem - b.ordem);
    let velMax = 0;
    for (const s of specs) if (s.k === BALA) velMax = Math.max(velMax, Math.hypot(s.vx, s.vy), s.vel || 0);
    for (const s of specs) if (s.k === MURO) velMax = Math.max(velMax, s.vel);
    const trilhas = montarTrilhas(fase.eventos, C);
    return { specs, duracao: fase.duracaoBatidas * B, B, hw, hh, velMax, maxVivos: maxSimultaneos(specs), fase, avisos, trilhas };
  }

  // ===================================================== MODIFICADORES =====
  // Cada modificador muda uma "trilha" de estado: tamanho, ângulo, escuridão da caixa,
  // inversão dos controles, alma espelhada. O estado também é função do tempo.
  const MODIFICADORES = { caixa: 1, girar: 1, escuro: 1, inverter: 1, espelho: 1, modo: 1 };

  function montarTrilhas(eventos, C) {
    const tr = { largura: [], altura: [], angulo: [], escuro: [], raio: [], invX: [], invY: [], espelho: [], modo: [], grav: [], linhas: [] };
    const avisosMod = [];
    const lista = eventos.map((ev, idx) => ({ ev, idx })).filter(x => tem(MODIFICADORES, x.ev.tipo))
      .sort((a, b) => a.ev.batida - b.ev.batida || a.idx - b.idx);
    const raioPadrao = CONFIG.caixa.raioLuz;
    const tween = (trilha, padrao, t0, dur, para) => {
      const de = valorTrilha(trilha, t0, padrao);
      trilha.push({ t0, t1: t0 + dur, de, para });
    };
    const degrau = (trilha, t0, valor) => trilha.push({ t0, t1: t0, de: valor, para: valor });
    for (const { ev, idx } of lista) {
      const t0 = C.t(ev.batida), dur = (ev.dur || 0) * C.B, av = C.aviso(ev);
      const aviso = { tipo: ev.tipo, tA: t0 - av, t0, t1: t0 + dur, ev: idx };
      switch (ev.tipo) {
        case 'caixa': {
          const nada = ev.largura === undefined && ev.altura === undefined;
          const l = nada ? 1 : ev.largura, a = nada ? 1 : ev.altura;
          aviso.largura = l !== undefined ? l : valorTrilha(tr.largura, t0, 1);
          aviso.altura = a !== undefined ? a : valorTrilha(tr.altura, t0, 1);
          if (l !== undefined) tween(tr.largura, 1, t0, dur, l);
          if (a !== undefined) tween(tr.altura, 1, t0, dur, a);
          break;
        }
        case 'girar':
          aviso.angulo = ev.angulo || 0;
          tween(tr.angulo, 0, t0, dur, ev.angulo || 0);
          break;
        case 'escuro':
          aviso.nivel = ev.nivel !== undefined ? ev.nivel : 0.9;
          tween(tr.escuro, 0, t0, dur, aviso.nivel);
          if (ev.raio !== undefined) tween(tr.raio, raioPadrao, t0, dur, ev.raio);
          break;
        case 'inverter':
          aviso.x = ev.x === true; aviso.y = ev.y === true;
          degrau(tr.invX, t0, aviso.x); degrau(tr.invY, t0, aviso.y);
          break;
        case 'espelho':
          aviso.eixo = ev.ativo === false ? '' : (ev.eixo || 'x');
          degrau(tr.espelho, t0, aviso.eixo);
          break;
        case 'modo':
          aviso.modo = ev.modo || 'livre';
          degrau(tr.modo, t0, aviso.modo);
          degrau(tr.grav, t0, ev.lado === 'cima' ? -1 : 1);
          degrau(tr.linhas, t0, ev.linhas || CONFIG.modos.trilhos.linhas);
          break;
      }
      avisosMod.push(aviso);
    }
    return { tr, avisosMod };
  }

  // Valor de uma trilha no tempo t (transição suave entre o valor anterior e o novo).
  function valorTrilha(trilha, t, padrao) {
    let seg = null;
    for (let i = trilha.length - 1; i >= 0; i--) if (trilha[i].t0 <= t) { seg = trilha[i]; break; }
    if (!seg) return padrao;
    if (t >= seg.t1) return seg.para;
    const u = (t - seg.t0) / (seg.t1 - seg.t0), e = u * u * (3 - 2 * u);
    return typeof seg.de === 'number' ? seg.de + (seg.para - seg.de) * e : seg.para;
  }

  // Estado da caixa no tempo t (out é reaproveitado: nada é alocado por frame).
  function estadoCaixa(comp, t, out) {
    out = out || {};
    const tr = comp.trilhas.tr;
    out.largura = valorTrilha(tr.largura, t, 1);
    out.altura = valorTrilha(tr.altura, t, 1);
    out.angulo = valorTrilha(tr.angulo, t, 0);
    out.rad = out.angulo * Math.PI / 180;
    out.escuro = valorTrilha(tr.escuro, t, 0);
    out.raio = valorTrilha(tr.raio, t, CONFIG.caixa.raioLuz);
    out.invX = valorTrilha(tr.invX, t, false);
    out.invY = valorTrilha(tr.invY, t, false);
    out.espelho = valorTrilha(tr.espelho, t, '');
    out.modo = valorTrilha(tr.modo, t, 'livre');
    out.grav = valorTrilha(tr.grav, t, 1);
    out.linhas = valorTrilha(tr.linhas, t, CONFIG.modos.trilhos.linhas);
    return out;
  }

  // Onde fica a alma espelhada (eixo 'x' espelha esquerda↔direita).
  function espelhar(eixo, x, y, out) {
    out.x = eixo === 'y' ? x : -x;
    out.y = eixo === 'x' ? y : -y;
    return out;
  }

  // Maior número de specs vivas ao mesmo tempo (dimensiona o pool: nada é descartado).
  function maxSimultaneos(specs) {
    const marcas = [];
    for (const s of specs) { marcas.push([s.tA, 1]); marcas.push([Math.max(s.tA, s.tF), -1]); }
    marcas.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let n = 0, max = 0;
    for (const m of marcas) { n += m[1]; if (n > max) max = n; }
    return max;
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
      const c = clamp(arr(ev.centro, 0)[0] * ext, -ext + esp / 2, ext - esp / 2);   // lista: usa a 1ª
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

    // { batida, tipo:'plataforma', x, y, larg, dur, aviso } — chão extra no modo gravidade (y = em cima dela)
    plataforma(ev, C, idx) {
      const t0 = C.t(ev.batida);
      C.add({ k: PLATAFORMA, tA: t0 - C.aviso(ev), t0, tF: t0 + (ev.dur !== undefined ? ev.dur : 8) * C.B,
        x: (ev.x || 0) * C.hw, y: (ev.y || 0) * C.hh, larg: ev.larg || 60 }, ev, idx);
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
    return { s: null, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, ix: 0, iy: 0, ti: 0, p: 0, e: 0, m: 0,
      ativo: false, raspou: false, somFeito: false, morto: false, pego: false };
  }

  class Ataques {
    constructor(comp) {
      this.c = comp;
      // o pool tem o tamanho exato do pico da fase (+ folga): nenhum ataque é descartado
      const n = Math.max(CONFIG.ataques.poolMinimo, (comp.maxVivos || 0) + 8);
      this.pool = new Array(n);
      this.livres = new Array(n);
      for (let i = 0; i < n; i++) { this.pool[i] = novoVivo(); this.livres[i] = this.pool[i]; }
      this.nLivres = n;
      this.vivos = new Array(n);
      this.n = 0;
      this.prox = 0;
      this.destaque = null;   // o que matou a alma (pisca na morte)
      this.aoEvento = null;   // callback(tipo, vivo) para sons/tremida
      this.estourou = 0;      // quantas vezes o pool acabou (não deve acontecer)
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
      o.ix = o.x; o.iy = o.y; o.ti = s.t0;
      o.p = 0; o.e = 0; o.m = 0;          // nada do projétil anterior que usou este objeto
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
        o.ix = s.x; o.iy = s.y; o.ti = s.t0;
      }
    }

    // Avança tudo pro tempo t. dt = passo desde o último frame.
    atualizar(t, dt, alma) {
      if (!Number.isFinite(t)) return;
      // 1) libera o que já acabou (antes de nascer o novo: o pool tem o tamanho exato do pico)
      for (let i = this.n - 1; i >= 0; i--) {
        const o = this.vivos[i];
        if (t >= o.s.tF || o.morto || o.pego) { this.liberar(o); this.vivos[i] = this.vivos[--this.n]; }
      }
      // 2) nasce o que começa agora
      const specs = this.c.specs;
      while (this.prox < specs.length && specs[this.prox].tA <= t) {
        const s = specs[this.prox++];
        if (t < s.tF) this.nascer(s, t, alma, false);
      }
      // 3) ativa, toca o som e posiciona
      const hw = this.c.hw, hh = this.c.hh;
      for (let i = this.n - 1; i >= 0; i--) {
        const o = this.vivos[i];
        const s = o.s;
        if (!o.ativo && t >= s.t0) this.ativar(o, t, alma);
        if (!o.somFeito && s.tSom !== undefined && t >= s.tSom) {
          o.somFeito = true;
          if (this.aoEvento) this.aoEvento('ativou', o);
        }
        this.posicionar(o, t, alma);
        if (s.k === BALA && s.mira && o.ativo) {
          const m = s.r + 4;
          if (o.x < -hw - m || o.x > hw + m || o.y < -hh - m || o.y > hh + m) {
            // saiu da caixa (só depois de ter entrado: confere se está se afastando)
            if (o.x * o.vx + o.y * o.vy > 0) o.morto = true;
          }
        }
      }
    }

    // Curva teleguiada em PASSO FIXO (independe do fps): integra de o.ti até t.
    guiar(o, t, alma) {
      const s = o.s, h = CONFIG.ataques.passoGuia;
      let guarda = 0;
      while (o.ti + h <= t && guarda++ < 4800) {
        if (o.ti - s.t0 < s.guiaDur && alma) {
          const alvo = Math.atan2(alma.y - o.iy, alma.x - o.ix);
          let a = Math.atan2(o.vy, o.vx);
          let d = alvo - a;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const max = s.guia * Math.PI / 180 * h;
          a += clamp(d, -max, max);
          o.vx = Math.cos(a) * s.vel; o.vy = Math.sin(a) * s.vel;
        }
        o.ix += o.vx * h; o.iy += o.vy * h; o.ti += h;
      }
    }

    // Calcula a geometria do vivo no tempo t (guarda em o.x/o.y/o.p/o.e/o.m).
    posicionar(o, t, alma) {
      const s = o.s;
      switch (s.k) {
        case BALA:
          if (!o.ativo) { o.x = s.x; o.y = s.y; break; }
          if (s.mira) {
            if (s.guia > 0) {
              this.guiar(o, t, alma);
              o.x = o.ix + o.vx * (t - o.ti); o.y = o.iy + o.vy * (t - o.ti);
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
      const raioMoeda = CONFIG.moedas.raioColeta;
      for (let i = 0; i < this.n; i++) {
        const o = this.vivos[i];
        const s = o.s;
        if (o.morto || s.k === PLATAFORMA) continue;            // bloqueado pelo escudo / plataforma não mata
        if (s.k === MOEDA) {
          if (!o.pego && t >= s.t0) {
            const dx = px - s.x, dy = py - s.y;
            if (dx * dx + dy * dy < raioMoeda * raioMoeda) { o.pego = true; moedas.push(s); }
          }
          continue;
        }
        let d;
        if (s.k === BALA) {
          // caminho rápido: descarta balas longe sem raiz quadrada (milhares por frame)
          if (t < s.t0) continue;
          const lim = s.hr + rRaspao;
          const dx = px - this.xBala(o, t);
          if (dx > lim || dx < -lim) continue;
          const dy = py - this.yBala(o, t);
          if (dy > lim || dy < -lim) continue;
          d = Math.sqrt(dx * dx + dy * dy) - s.hr;
        } else {
          d = this.distancia(o, t, px, py);
          if (d === Infinity) continue;
        }
        if (d < rHit) return o;
        if (d < rRaspao && !o.raspou) { o.raspou = true; raspoes.push(o); }
      }
      return null;
    }

    // Posição de uma bala no tempo t (analítica; a teleguiada extrapola do último passo fixo).
    xBala(o, t) {
      const s = o.s;
      if (!s.mira) return s.x + s.vx * (t - s.t0);
      return s.guia > 0 ? o.ix + o.vx * (t - o.ti) : o.ax + o.vx * (t - s.t0);
    }
    yBala(o, t) {
      const s = o.s;
      if (!s.mira) return s.y + s.vy * (t - s.t0);
      return s.guia > 0 ? o.iy + o.vy * (t - o.ti) : o.ay + o.vy * (t - s.t0);
    }

    // Distância (com sinal) da alma até a parte letal do vivo no tempo t. Infinity = inofensivo agora.
    distancia(o, t, px, py) {
      const s = o.s;
      switch (s.k) {
        case BALA: {
          if (t < s.t0) return Infinity;
          return Math.hypot(px - this.xBala(o, t), py - this.yBala(o, t)) - s.hr;
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
          // lado -1: parede ocupa (-inf, e]; lado +1: [e, inf). A hitbox é a folga MENOR que o desenho (B25)
          return (s.lado < 0 ? coord - e : e - coord) + CONFIG.ataques.folgaHitbox;
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
          return Math.min(d1, d2) + s.hrFolga;                // hitbox menor que o desenho, como as balas (B25)
        }
        default: return Infinity;
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

  return { compilar, validar, Ataques, GERADORES, ESQUEMA, COMUNS, DIFICULDADES, MODIFICADORES, MODOS, TIPOS: { BALA, LASER, PAREDE, MURO, ORBE, EMISSOR, MOEDA, PLATAFORMA },
    bordaParede, estadoCaixa, espelhar };
})();
