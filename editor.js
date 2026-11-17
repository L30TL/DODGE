'use strict';
// =============================================================================
// DODGE — editor.js
// Editor de fases (Fase 2 do roadmap):
//   - linha do tempo em batidas, com a faixa da música (seções, bumbo, caixa, melodia)
//   - paleta com os ataques e os modificadores da caixa
//   - inspetor com os campos de cada evento (setinhas, opções; posição tocando na prévia)
//   - prévia da caixa no ponto do cursor (o mesmo motor e o mesmo desenho do jogo)
//   - tocar com a música, testar daqui, desfazer/refazer, salvamento automático
// A parte de cima (Editor) não usa DOM nem canvas: roda nos testes do Node.
// As telas (UI.telas.editor e UI.telas.criadas) ficam embaixo.
// =============================================================================

const Editor = (() => {
  const TIPOS = ['chuva', 'fogo', 'laser', 'paredes', 'espiral', 'teleguiada', 'anel', 'moeda',
    'caixa', 'girar', 'escuro', 'inverter', 'espelho'];
  const ehMod = (tipo) => !!Patterns.MODIFICADORES[tipo];
  const arred = (v) => Math.round(v * 1000) / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------ campos ----
  // Cada campo: k (nome no evento), t (pos | num | int | enum | bool | orient), passo,
  // padrao (o que o motor usa se o campo não existir), rot (rótulo, se não for o k),
  // opcoes (enum), opcional (pode ficar vazio), posicao (o toque na prévia mexe nele).
  const campo = (k, t, passo, padrao, extra) => Object.assign({ k, t, passo, padrao }, extra || {});
  const AV = () => campo('aviso', 'num', 0.25, CONFIG.ataques.avisoPadraoBatidas);
  const VEL = (p) => campo('vel', 'num', 10, p || CONFIG.ataques.velocidadeBala);
  const TAM = () => campo('tam', 'num', 1, CONFIG.ataques.tamanhoBala);
  const INTER = (p) => campo('intervalo', 'num', 0.25, p || 0);
  const LADO = (p) => campo('de', 'enum', 0, p, { opcoes: ['cima', 'baixo', 'esquerda', 'direita'] });
  const POS = (k) => campo(k || 'pos', 'pos', CONFIG.editor.passoPos, 0, { posicao: true });
  const XY = () => [campo('x', 'num', CONFIG.editor.passoPos, 0, { posicao: true }), campo('y', 'num', CONFIG.editor.passoPos, 0, { posicao: true })];
  const ORIENTS = ['v', 'h', 15, 30, 45, 60, 75, 105, 120, 135, 150, 165];

  const CAMPOS = {
    chuva: () => [POS(), LADO('cima'), VEL(), TAM(), INTER(), AV()],
    fogo: () => [POS(), campo('eixo', 'enum', 0, 'h', { opcoes: ['h', 'v'] }), campo('alternar', 'bool', 0, true), VEL(), TAM(), INTER(), AV()],
    laser: () => [POS(), campo('orient', 'orient', 0, 'v'), campo('larg', 'num', 2, CONFIG.ataques.larguraLaser),
      campo('dur', 'num', 0.25, CONFIG.ataques.duracaoLaser), campo('ate', 'num', CONFIG.editor.passoPos, undefined, { opcional: true }), INTER(), AV()],
    paredes: (ev) => (ev.modo === 'buraco'
      ? [campo('modo', 'enum', 0, undefined, { opcoes: [undefined, 'buraco'] }), LADO('esquerda'), POS('centro'),
        campo('espaco', 'num', 4, 40), VEL(90), campo('larg', 'num', 2, 10), INTER(), AV()]
      : [campo('modo', 'enum', 0, undefined, { opcoes: [undefined, 'buraco'] }), campo('eixo', 'enum', 0, 'h', { opcoes: ['h', 'v'] }),
        campo('centro', 'num', CONFIG.editor.passoPos, 0, { posicao: true }), campo('espaco', 'num', 4, 48),
        campo('fechar', 'num', 0.25, 1), campo('segurar', 'num', 0.25, 2), campo('abrir', 'num', 0.25, 1), AV()]),
    espiral: () => [...XY(), campo('bracos', 'int', 1, 3), campo('giro', 'num', 5, 30), campo('ang', 'num', 15, 90),
      campo('dur', 'num', 0.25, 4), campo('cadencia', 'num', 0.25, 2), VEL(), TAM(), AV()],
    teleguiada: () => [LADO('cima'), POS(), campo('quantidade', 'int', 1, 3), INTER(1), VEL(), campo('guia', 'num', 15, 0),
      campo('guiaDur', 'num', 0.25, 1.5), TAM(), AV()],
    anel: () => [...XY(), campo('quantidade', 'int', 1, 12), VEL(), campo('giro', 'num', 5, 0), campo('raio', 'num', 2, 18), TAM(), AV()],
    moeda: () => [...XY(), campo('id', 'int', 1, 0), campo('dur', 'num', 0.25, 4)],
    caixa: () => [campo('largura', 'num', 0.05, 1), campo('altura', 'num', 0.05, 1), campo('dur', 'num', 0.25, 0), AV()],
    girar: () => [campo('angulo', 'num', 15, 0), campo('dur', 'num', 0.25, 0), AV()],
    escuro: () => [campo('nivel', 'num', 0.05, 0.9), campo('raio', 'num', 4, CONFIG.caixa.raioLuz, { rot: 'raioLuz' }),
      campo('dur', 'num', 0.25, 0), AV()],
    inverter: () => [campo('x', 'bool', 0, false, { rot: 'invX' }), campo('y', 'bool', 0, false, { rot: 'invY' }), AV()],
    espelho: () => [campo('ativo', 'bool', 0, true), campo('eixo', 'enum', 0, 'x', { opcoes: ['x', 'y', 'xy'] }), AV()],
  };
  const camposDe = (ev) => (CAMPOS[ev.tipo] ? CAMPOS[ev.tipo](ev) : []);

  // Faixa de valores aceita pelo validador (Patterns.ESQUEMA).
  function limites(tipo, k) {
    const r = (Patterns.ESQUEMA[tipo] || {})[k] || Patterns.COMUNS[k];
    if (r && (r.t === 'num' || r.t === 'int')) return { min: r.min, max: r.max };
    return { min: -1, max: 1 };
  }

  const valor = (ev, c) => (ev[c.k] !== undefined ? ev[c.k] : c.padrao);
  const lista = (v) => (Array.isArray(v) ? v.slice() : [v === undefined ? 0 : v]);

  // Mexe num campo (dir = -1 ou +1). iPos = qual posição da lista. Devolve true se mudou.
  function ajustar(ev, c, dir, iPos) {
    const antes = JSON.stringify(ev[c.k]);
    const lim = limites(ev.tipo, c.k);
    if (c.t === 'num' || c.t === 'int') {
      let v = valor(ev, c);
      if (v === undefined) v = c.k === 'ate' ? lista(ev.pos)[0] : 0;     // opcional vazio: começa de um valor razoável
      v = c.t === 'int' ? Math.round(v + dir) : arred(Math.round((v + dir * c.passo) / c.passo) * c.passo);
      ev[c.k] = clamp(v, lim.min, lim.max);
    } else if (c.t === 'bool') {
      ev[c.k] = !valor(ev, c);
    } else if (c.t === 'enum' || c.t === 'orient') {
      const op = c.t === 'orient' ? ORIENTS : c.opcoes;
      const i = op.indexOf(valor(ev, c));
      const n = op[((i < 0 ? 0 : i) + dir + op.length) % op.length];
      if (n === undefined) delete ev[c.k]; else ev[c.k] = n;
    } else if (c.t === 'pos') {
      const l = lista(valor(ev, c));
      const i = clamp(iPos || 0, 0, l.length - 1);
      l[i] = clamp(arred(Math.round((l[i] + dir * c.passo) / c.passo) * c.passo), -1, 1);
      ev[c.k] = l.length === 1 ? l[0] : l;
    }
    return JSON.stringify(ev[c.k]) !== antes;
  }

  // Lista de posições: acrescenta depois da i-ésima (devolve o índice novo) ou remove.
  function posAdicionar(ev, k, i) {
    const l = lista(ev[k]);
    if (l.length >= CONFIG.limites.maxPosicoes) return i;
    i = clamp(i || 0, 0, l.length - 1);
    const v = l[i] + 0.2 <= 1 ? l[i] + 0.2 : l[i] - 0.2;
    l.splice(i + 1, 0, arred(clamp(v, -1, 1)));
    ev[k] = l;
    return i + 1;
  }
  function posRemover(ev, k, i) {
    const l = lista(ev[k]);
    if (l.length <= 1) return 0;
    i = clamp(i || 0, 0, l.length - 1);
    l.splice(i, 1);
    ev[k] = l.length === 1 ? l[0] : l;
    return Math.min(i, l.length - 1);
  }

  // Evento novo com valores que já ficam bonitos de cara.
  const NOVOS = {
    chuva: { pos: [-0.5, 0, 0.5] }, fogo: { pos: [-0.5, 0.5], eixo: 'h' }, laser: { pos: 0, orient: 'v' },
    paredes: { eixo: 'h', centro: 0 }, espiral: { x: 0, y: 0, dur: 4 }, teleguiada: { de: 'cima', quantidade: 3 },
    anel: { x: 0, y: 0, quantidade: 12 }, moeda: { x: 0.6, y: -0.6, id: 0 },
    caixa: { largura: 0.6, altura: 0.6, dur: 2 }, girar: { angulo: 45, dur: 2 }, escuro: { nivel: 0.9, dur: 1 },
    inverter: { x: true }, espelho: { eixo: 'x' },
  };
  function novoEvento(tipo, batida, fase) {
    const ev = Object.assign({ batida: arred(batida), tipo }, JSON.parse(JSON.stringify(NOVOS[tipo] || {})));
    if (tipo === 'moeda' && fase) {
      const usadas = new Set(fase.eventos.filter(e => e.tipo === 'moeda').map(e => e.id || 0));
      ev.id = [0, 1, 2].find(i => !usadas.has(i)) || 0;
    }
    return ev;
  }

  // ------------------------------------------------------- desfazer -------
  class Historico {
    constructor(max) { this.max = max || CONFIG.editor.historicoMax; this.antes = []; this.depois = []; }
    registrar(estado) {
      this.antes.push(estado);
      if (this.antes.length > this.max) this.antes.shift();
      this.depois.length = 0;
    }
    desfazer(atual) { if (!this.antes.length) return null; this.depois.push(atual); return this.antes.pop(); }
    refazer(atual) { if (!this.depois.length) return null; this.antes.push(atual); return this.depois.pop(); }
    get podeDesfazer() { return this.antes.length > 0; }
    get podeRefazer() { return this.depois.length > 0; }
    limpar() { this.antes.length = 0; this.depois.length = 0; }
  }

  // --------------------------------------------------------- música -------
  // bpm e duração de uma fase com essa música: a vitória é no acorde final (início da seção "fim").
  function dadosMusica(info) {
    const fim = info.secoes.find(s => s.nome === 'fim');
    return { bpm: info.bpm, duracaoBatidas: fim ? fim.inicioBatida + 1 : info.batidas };
  }

  // As notas da música em batidas: bumbo, caixa (bateria) e a melodia, pra desenhar e pro ímã.
  function mapaMusical(info) {
    const B = 60 / info.bpm;
    const m = { bumbo: [], caixa: [], melodia: [], secoes: info.secoes, notaMin: 127, notaMax: 0 };
    for (const e of info.eventos) {
      if (e.voz === 'bumbo') m.bumbo.push(e.t / B);
      else if (e.voz === 'caixa') m.caixa.push(e.t / B);
      else if (e.voz === 'lider') {
        const nota = Math.round(69 + 12 * Math.log2(e.f / 440));
        m.melodia.push({ b: e.t / B, dur: e.dur / B, nota });
        m.notaMin = Math.min(m.notaMin, nota); m.notaMax = Math.max(m.notaMax, nota);
      }
    }
    m.notasMelodia = m.melodia.map(n => n.b);
    return m;
  }

  // Índice do primeiro elemento >= v numa lista ordenada.
  function busca(l, v) {
    let a = 0, b = l.length;
    while (a < b) { const m = (a + b) >> 1; if (l[m] < v) a = m + 1; else b = m; }
    return a;
  }

  const IMAS = ['q', 'm', 'b', 'bumbo', 'caixa', 'melodia', 'livre'];
  const GRADE = { q: 0.25, m: 0.5, b: 1 };
  // Prende a batida na grade ou na nota mais perto (tol = distância máxima, em batidas).
  function imantar(b, modo, mapa, tol) {
    if (GRADE[modo]) return arred(Math.round(b / GRADE[modo]) * GRADE[modo]);
    if (modo === 'livre') return arred(Math.round(b * 100) / 100);
    const l = mapa && (modo === 'melodia' ? mapa.notasMelodia : mapa[modo]);
    if (l && l.length) {
      const i = busca(l, b);
      let melhor = null;
      for (const j of [i - 1, i]) if (j >= 0 && j < l.length && (melhor === null || Math.abs(l[j] - b) < Math.abs(melhor - b))) melhor = l[j];
      if (melhor !== null && Math.abs(melhor - b) <= tol) return arred(melhor);
    }
    return arred(Math.round(b / 0.25) * 0.25);
  }
  const passoDoIma = (modo) => GRADE[modo] || 0.25;

  // ------------------------------------------------------- compilação -----
  // Compila só o que cabe na música (o que passou do fim fica guardado, mas não acontece).
  // Devolve também, pra cada evento do editor: quando o aviso começa, quando fica perigoso
  // e quando acaba (em batidas), e em qual pista da linha do tempo ele vai.
  function compilar(fase, pistas) {
    const dentro = [], idx = [];
    fase.eventos.forEach((ev, i) => { if (ev.batida <= fase.duracaoBatidas) { dentro.push(ev); idx.push(i); } });
    const comp = Patterns.compilar(Object.assign({}, fase, { eventos: dentro }), CONFIG.caixa);
    const B = comp.B;
    const ok = comp.fase.eventos.length === dentro.length;       // o validador não descartou nada
    const faixas = fase.eventos.map(ev => ({ ini: ev.batida, ativo: ev.batida, fim: ev.batida, fora: ev.batida > fase.duracaoBatidas, pista: 0 }));
    const daComp = (j) => (ok ? idx[j] : -1);
    const vistos = new Set();
    for (const s of comp.specs) {
      const i = daComp(s.ev);
      if (i < 0) continue;
      const f = faixas[i];
      if (!vistos.has(i)) { vistos.add(i); f.ini = s.tA / B; f.ativo = s.t0 / B; f.fim = s.tF / B; continue; }
      f.ini = Math.min(f.ini, s.tA / B); f.ativo = Math.min(f.ativo, s.t0 / B); f.fim = Math.max(f.fim, s.tF / B);
    }
    for (const a of comp.trilhas.avisosMod) {
      const i = daComp(a.ev);
      if (i < 0) continue;
      faixas[i].ini = a.tA / B; faixas[i].ativo = a.t0 / B; faixas[i].fim = Math.max(a.t0, a.t1) / B;
    }
    // pistas: o primeiro lugar livre (os que não cabem dividem a pista que libera antes)
    const n = pistas || 4, livre = new Array(n).fill(-Infinity);
    const ordem = faixas.map((f, i) => i).sort((a, b) => faixas[a].ini - faixas[b].ini || a - b);
    for (const i of ordem) {
      const f = faixas[i];
      let p = livre.findIndex(x => x <= f.ini - 0.01);
      if (p < 0) p = livre.indexOf(Math.min(...livre));
      f.pista = p;
      livre[p] = Math.max(f.fim, f.ativo + 0.5);
    }
    return { comp, faixas };
  }

  // Toque na prévia (px da caixa, a partir do centro) → valor do campo de posição.
  function posicaoDoToque(ev, k, bx, by, hw, hh) {
    const r = (v) => clamp(Math.round(v * 100) / 100, -1, 1);
    const tipo = ev.tipo;
    if (k === 'x' || k === 'y') return { x: r(bx / hw), y: r(by / hh) };
    let horiz;                                   // true = o valor anda na horizontal (x)
    if (tipo === 'chuva' || tipo === 'teleguiada') horiz = (ev.de || 'cima') === 'cima' || ev.de === 'baixo';
    else if (tipo === 'fogo') horiz = (ev.eixo || 'h') === 'v';
    else if (tipo === 'laser') {
      const o = ev.orient === undefined ? 'v' : ev.orient;
      if (o === 'v') horiz = true;
      else if (o === 'h') horiz = false;
      else { const a = o * Math.PI / 180; return r((bx * -Math.sin(a) + by * Math.cos(a)) / hh); }
    } else if (tipo === 'paredes') {
      horiz = ev.modo === 'buraco' ? (ev.de === 'cima' || ev.de === 'baixo') : (ev.eixo || 'h') === 'h';
    } else return null;
    return horiz ? r(bx / hw) : r(by / hh);
  }

  return { TIPOS, ehMod, CAMPOS, camposDe, limites, valor, lista, ajustar, posAdicionar, posRemover, novoEvento,
    Historico, dadosMusica, mapaMusical, busca, IMAS, imantar, passoDoIma, compilar, posicaoDoToque, ORIENTS };
})();

// =============================================================================
// TELAS (só no navegador)
// =============================================================================
if (typeof UI !== 'undefined') {

  // Formata número pro inspetor: 1.5, -0.4, 120.
  const fmt = (v) => (typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v));
  const corDoTipo = (tipo) => (tipo === 'moeda' ? PAL.ouro : Editor.ehMod(tipo) ? PAL.roxo : PAL.perigo);
  const corEscuraDoTipo = (tipo) => (tipo === 'moeda' ? PAL.ouroEscuro : Editor.ehMod(tipo) ? PAL.roxoEscuro : PAL.perigoEscuro);
  const nomeMusica = (id) => t('editor.musicas.' + id);

  // Dados novos pra uma fase com essa música.
  function faseNova(musica) {
    const d = Editor.dadosMusica(Sound.info(musica));
    return Criadas.nova({ nome: t('editor.nomePadrao', { n: Criadas.proximoNumero() }), musica, bpm: d.bpm, duracaoBatidas: d.duracaoBatidas });
  }

  // ---------------------------------------------------------- EDITOR ------
  UI.telas.editor = (() => {
    const W = CONFIG.tela.largura;
    const HW = CONFIG.caixa.largura / 2, HH = CONFIG.caixa.altura / 2;
    const L = {
      prev: { x: 4, y: 23, w: 214, h: 140 },
      insp: { x: 222, y: 23, w: 254, h: 140 },
      ferr: { y: 166, h: 14 },
      regua: { y: 182, h: 9 },
      musica: { y: 191, h: 18 },
      pistas: { y: 211, h: 14, n: 4 },
      tl: { x: 4, w: 472 },
    };
    const E = CONFIG.editor.escalaPrevia;
    const PCX = L.prev.x + L.prev.w / 2, PCY = L.prev.y + L.prev.h / 2;
    const PW = 360, PH = 240;                      // prévia desenhada em tamanho real e reduzida
    const pv = { cv: null, c: null };
    const alma0 = { x: 0, y: 0 };
    const estPrev = {};
    const C = new Controles(), CI = new Controles();
    const ed = {
      fase: null, info: null, mapa: null, B: 0.5, dur: 64,
      comp: null, at: null, faixas: [], sujo: false,
      cursor: 0, zoom: CONFIG.editor.zoomPadrao, scroll: 0,
      sel: -1, selPos: 0, ima: 'q',
      tocando: false, hist: new Editor.Historico(),
      arrasto: null, alvo: null, modal: null, confirmar: false,
      msg: null, msgT: -9, inspScroll: 0, inspAltura: 0, copiado: null,
    };

    // ------------------------------------------------------------ estado --
    function abrir(fase) {
      ed.fase = JSON.parse(JSON.stringify(fase));
      ed.hist.limpar();
      ed.cursor = 0; ed.scroll = 0; ed.zoom = CONFIG.editor.zoomPadrao;
      ed.sel = -1; ed.selPos = 0; ed.inspScroll = 0; ed.modal = null; ed.tocando = false;
      carregarMusica();
      recompilar();
    }

    function carregarMusica() {
      ed.info = Sound.info(ed.fase.musica);
      ed.mapa = Editor.mapaMusical(ed.info);
      ed.B = 60 / ed.fase.bpm;
      ed.dur = ed.fase.duracaoBatidas;
    }

    function recompilar() {
      const r = Editor.compilar(ed.fase, L.pistas.n);
      ed.comp = r.comp; ed.faixas = r.faixas;
      ed.at = new Patterns.Ataques(ed.comp);
      ed.at.aoEvento = (tipo, o) => { if (ed.tocando && o.s.som) Sound.sfx(o.s.som); };
      posicionar();
      ed.sujo = false;
    }
    // Põe os ataques no instante do cursor (reiniciar escolhe quem existe; atualizar calcula onde estão).
    function posicionar() {
      const tt = ed.cursor * ed.B;
      ed.at.reiniciar(tt, alma0);
      ed.at.atualizar(tt, 0, alma0);
    }

    // Toda mudança passa por aqui: guarda o "antes" pro desfazer.
    function registrar() { ed.hist.registrar(JSON.stringify(ed.fase)); }
    function mudou(opcoes) {
      ed.sujo = true;
      Criadas.salvar(ed.fase);
      if (!opcoes || opcoes.montar !== false) montar();
    }
    function salvarAgora() { Criadas.salvar(ed.fase, true); }

    function aviso(txt) { ed.msg = txt; ed.msgT = Game.tempo; }

    function desfazer(re) {
      const atual = JSON.stringify(ed.fase);
      const s = re ? ed.hist.refazer(atual) : ed.hist.desfazer(atual);
      if (!s) return;
      const musicaAntes = ed.fase.musica;
      ed.fase = JSON.parse(s);
      if (ed.fase.musica !== musicaAntes) carregarMusica();
      if (ed.sel >= ed.fase.eventos.length) ed.sel = -1;
      ed.selPos = 0;
      aviso(t(re ? 'editor.refeito' : 'editor.desfeito'));
      Sound.sfx('menu');
      mudou();
    }

    function selecionar(i) {
      if (i !== ed.sel) { ed.selPos = 0; ed.inspScroll = 0; }
      ed.sel = i;
      montar();
    }

    function adicionar(tipo) {
      if (ed.fase.eventos.length >= CONFIG.limites.maxEventos) { aviso(t('editor.limite')); return; }
      registrar();
      const b = Math.min(ed.dur, Editor.imantar(ed.cursor, ed.ima === 'livre' ? 'livre' : 'q', ed.mapa, 0));
      ed.fase.eventos.push(Editor.novoEvento(tipo, b, ed.fase));
      Sound.sfx('confirmar');
      selecionar(ed.fase.eventos.length - 1);
      mudou();
    }

    function apagarSel() {
      if (ed.sel < 0) return;
      registrar();
      ed.fase.eventos.splice(ed.sel, 1);
      ed.sel = -1;
      Sound.sfx('voltar');
      mudou();
    }

    function colarEvento(ev, b) {
      if (ed.fase.eventos.length >= CONFIG.limites.maxEventos) { aviso(t('editor.limite')); return; }
      registrar();
      const novo = JSON.parse(JSON.stringify(ev));
      novo.batida = Math.max(0, Math.min(ed.dur, b));
      ed.fase.eventos.push(novo);
      selecionar(ed.fase.eventos.length - 1);
      mudou();
    }
    function duplicarSel() {
      if (ed.sel < 0) return;
      const ev = ed.fase.eventos[ed.sel];
      colarEvento(ev, ev.batida + 1);
    }
    function copiar() {
      if (ed.sel < 0) return;
      ed.copiado = JSON.parse(JSON.stringify(ed.fase.eventos[ed.sel]));
      aviso(t('editor.copiado'));
    }
    function colar() {
      if (!ed.copiado) return;
      colarEvento(ed.copiado, Editor.imantar(ed.cursor, ed.ima, ed.mapa, 0));
      aviso(t('editor.colado'));
    }

    // ---------------------------------------------------- cursor e tempo --
    const X = (b) => L.tl.x + (b - ed.scroll) * ed.zoom;
    const Bx = (x) => ed.scroll + (x - L.tl.x) / ed.zoom;
    const tolIma = () => CONFIG.editor.imaDistPx / ed.zoom;
    const fimRolagem = () => {
      let max = ed.dur;
      for (const ev of ed.fase.eventos) max = Math.max(max, ev.batida);
      return Math.max(0, max + 8 - L.tl.w / ed.zoom);
    };
    function rolar(s) { ed.scroll = Math.max(0, Math.min(fimRolagem(), s)); }
    function verCursor() {
      const x = X(ed.cursor);
      if (x < L.tl.x + 20) rolar(ed.cursor - 20 / ed.zoom);
      else if (x > L.tl.x + L.tl.w - 30) rolar(ed.cursor - (L.tl.w - 60) / ed.zoom);
    }
    function moverCursor(b, semVer) {
      ed.cursor = Math.max(0, Math.min(ed.dur, b));
      if (ed.tocando) parar();
      posicionar();
      if (!semVer) verCursor();
    }
    function zoom(f, xAncora) {
      const xa = xAncora === undefined ? X(ed.cursor) : xAncora;
      const b = Bx(xa);
      ed.zoom = Math.max(CONFIG.editor.zoomMin, Math.min(CONFIG.editor.zoomMax, ed.zoom * f));
      rolar(b - (xa - L.tl.x) / ed.zoom);
    }

    function tocar() {
      if (ed.tocando) return;
      if (ed.cursor >= ed.dur - 0.01) ed.cursor = 0;
      Sound.iniciar();
      Sound.tocar(ed.fase.musica, { desde: ed.cursor * ed.B });
      ed.tocando = true;
      posicionar();
      montar();
    }
    function parar() {
      if (!ed.tocando) return;
      ed.tocando = false;
      Sound.parar();
      posicionar();
      montar();
    }
    const alternarTocar = () => (ed.tocando ? parar() : tocar());

    function testar() {
      parar();
      salvarAgora();
      const desde = ed.cursor >= ed.dur - 1 ? 0 : ed.cursor * ed.B;
      Game.testar(Criadas.jogavel(ed.fase), desde);
    }

    function sair() {
      parar();
      salvarAgora();
      Sound.sfx('voltar');
      Game.irPara('criadas', { id: ed.fase.id });
    }

    function renomear() {
      EntradaTexto.pedir({ titulo: t('editor.nomeDaFase'), valor: ed.fase.nome, max: CONFIG.limites.maxTexto,
        aoConfirmar: (txt) => { if (!txt || txt === ed.fase.nome) return; registrar(); ed.fase.nome = txt; mudou(); } });
    }

    function trocarMusica(dir) {
      const l = Criadas.MUSICAS;
      const m = l[(l.indexOf(ed.fase.musica) + dir + l.length) % l.length];
      registrar();
      const d = Editor.dadosMusica(Sound.info(m));
      ed.fase.musica = m; ed.fase.bpm = d.bpm; ed.fase.duracaoBatidas = d.duracaoBatidas;
      carregarMusica();
      ed.cursor = Math.min(ed.cursor, ed.dur);
      rolar(ed.scroll);
      mudou();
    }
    function trocarDificuldade(dir) {
      const l = Patterns.DIFICULDADES;
      registrar();
      ed.fase.dificuldade = l[(l.indexOf(ed.fase.dificuldade) + dir + l.length) % l.length];
      mudou();
    }

    // ---------------------------------------------------------- botões ----
    function montar() {
      C.limpar(); CI.limpar();
      const ic = (n, cor) => Sprites.desenho(n, cor || PAL.branco);
      if (ed.modal === 'props') { montarProps(ic); return; }
      // barra de cima
      C.botao({ x: 4, y: 3, w: 20, h: 16, icone: ic('setaEsq'), acao: sair });
      C.botao({ x: 28, y: 3, w: 186, h: 16, texto: () => ed.fase.nome, icone: ic('lapis', PAL.cinzaClaro), acao: renomear });
      C.botao({ x: 254, y: 3, w: 20, h: 16, icone: ic('desfazer'), desabilitado: !ed.hist.podeDesfazer, acao: () => desfazer(false) });
      C.botao({ x: 276, y: 3, w: 20, h: 16, icone: ic('refazer'), desabilitado: !ed.hist.podeRefazer, acao: () => desfazer(true) });
      C.botao({ x: 302, y: 3, w: 24, h: 16, icone: ed.tocando ? ic('pausa') : ic('tocar'), acao: alternarTocar });
      C.botao({ x: 330, y: 3, w: 120, h: 16, texto: t('editor.testar'), icone: ic('tocar', PAL.preto), primario: true, cor: PAL.alma, acao: testar });
      C.botao({ x: 454, y: 3, w: 22, h: 16, icone: ic('engrenagem'), acao: () => { parar(); ed.modal = 'props'; ed.confirmar = false; montar(); } });
      // ferramentas da linha do tempo
      const fy = L.ferr.y;
      C.botao({ x: 4, y: fy, w: 96, h: 13, texto: () => t('editor.ima', { modo: t('editor.imas.' + ed.ima) }), icone: ic('ima', PAL.cinzaClaro),
        acao: () => { ed.ima = Editor.IMAS[(Editor.IMAS.indexOf(ed.ima) + 1) % Editor.IMAS.length]; } });
      C.botao({ x: 104, y: fy, w: 16, h: 13, icone: ic('menos'), acao: () => zoom(1 / 1.5) });
      C.botao({ x: 122, y: fy, w: 16, h: 13, icone: ic('mais'), acao: () => zoom(1.5) });
      montarInspetor(ic);
    }

    function montarProps(ic) {
      const x = 120, y = 56, w = 240;
      C.botao({ x: x + w - 66, y: y + 26, w: 56, h: 14, texto: t('editor.editar'), icone: ic('lapis'), acao: renomear });
      C.botao({ x: x + 100, y: y + 48, w: 16, h: 14, icone: ic('setaEsq'), acao: () => trocarMusica(-1) });
      C.botao({ x: x + w - 26, y: y + 48, w: 16, h: 14, icone: ic('setaDir'), acao: () => trocarMusica(1) });
      C.botao({ x: x + 100, y: y + 68, w: 16, h: 14, icone: ic('setaEsq'), acao: () => trocarDificuldade(-1) });
      C.botao({ x: x + w - 26, y: y + 68, w: 16, h: 14, icone: ic('setaDir'), acao: () => trocarDificuldade(1) });
      C.botao({ x: x + 10, y: y + 112, w: 100, h: 16, texto: () => (ed.confirmar ? t('editor.confirmar') : t('editor.apagarFase')),
        icone: ic('lixo', PAL.perigoClaro), cor: PAL.perigo, corTexto: PAL.perigoClaro, acao: () => {
          if (!ed.confirmar) { ed.confirmar = true; return; }
          const id = ed.fase.id;
          ed.modal = null;
          Criadas.apagar(id);
          Game.irPara('criadas', { apagada: id });
        } });
      const f = C.botao({ x: x + w - 90, y: y + 112, w: 80, h: 16, texto: t('editor.fechar'), primario: true, cor: PAL.alma,
        acao: () => { ed.modal = null; montar(); } });
      C.focar(f);
    }

    // Inspetor: paleta (nada selecionado) ou os campos do evento selecionado.
    // ed.linhas guarda o que desenhar em cada linha (o texto é desenhado à parte).
    function montarInspetor(ic) {
      const I = L.insp;
      const linhas = ed.linhas = [];
      let y = I.y + 4 - ed.inspScroll;
      const vis = (yy, h) => yy >= I.y + 1 && yy + h <= I.y + I.h - 1;
      const bt = (op) => { const b = CI.botao(op); b.oculto = !vis(op.y, op.h); return b; };
      if (ed.sel < 0 || !ed.fase.eventos[ed.sel]) {
        linhas.push({ tipo: 'paleta', y });
        y += 14;
        const cols = 4, bw = 60, bh = 18;
        Editor.TIPOS.forEach((tipo, i) => {
          const cx = I.x + 4 + (i % cols) * (bw + 2), cy = y + Math.floor(i / cols) * (bh + 2);
          bt({ x: cx, y: cy, w: bw, h: bh, texto: t('editor.curtos.' + tipo), icone: ic('ev_' + tipo, corDoTipo(tipo)), acao: () => adicionar(tipo) });
        });
        y += Math.ceil(Editor.TIPOS.length / cols) * (bh + 2);
        ed.inspAltura = y + ed.inspScroll - I.y;
        return;
      }
      const ev = ed.fase.eventos[ed.sel];
      linhas.push({ tipo: 'cab', y, ev });
      bt({ x: I.x + I.w - 42, y, w: 18, h: 13, icone: ic('copia'), acao: duplicarSel });
      bt({ x: I.x + I.w - 22, y, w: 18, h: 13, icone: ic('lixo', PAL.perigoClaro), acao: apagarSel });
      y += 17;
      const setas = (yy, menos, mais) => {
        bt({ x: I.x + I.w - 40, y: yy, w: 17, h: 11, icone: ic('setaEsq'), acao: menos });
        bt({ x: I.x + I.w - 21, y: yy, w: 17, h: 11, icone: ic('setaDir'), acao: mais });
      };
      linhas.push({ tipo: 'batida', y, ev });
      const passo = Editor.passoDoIma(ed.ima);
      const moverEv = (d) => {
        registrar();
        ev.batida = Math.max(0, Math.min(ed.dur, Math.round((ev.batida + d * passo) / passo) * passo));
        moverCursor(ev.batida); mudou();
      };
      setas(y, () => moverEv(-1), () => moverEv(1));
      y += 13;
      for (const c of Editor.camposDe(ev)) {
        const muda = (dir) => { const antes = JSON.stringify(ed.fase); if (Editor.ajustar(ev, c, dir, ed.selPos)) { ed.hist.registrar(antes); mudou(); } };
        if (c.t === 'pos') {
          const l = Editor.lista(Editor.valor(ev, c));
          ed.selPos = Math.min(ed.selPos, l.length - 1);
          linhas.push({ tipo: 'campo', y, ev, c });
          bt({ x: I.x + I.w - 78, y, w: 17, h: 11, icone: ic('menos'), desabilitado: l.length <= 1,
            acao: () => { registrar(); ed.selPos = Editor.posRemover(ev, c.k, ed.selPos); mudou(); } });
          bt({ x: I.x + I.w - 59, y, w: 17, h: 11, icone: ic('mais'), desabilitado: l.length >= CONFIG.limites.maxPosicoes,
            acao: () => { registrar(); ed.selPos = Editor.posAdicionar(ev, c.k, ed.selPos); mudou(); } });
          setas(y, () => muda(-1), () => muda(1));
          y += 13;
          // fichas com cada posição (toque escolhe qual as setas e a prévia mexem)
          const porLinha = 6, fw = 38;
          l.forEach((v, i) => {
            const fx = I.x + 6 + (i % porLinha) * (fw + 2), fy = y + Math.floor(i / porLinha) * 13;
            bt({ x: fx, y: fy, w: fw, h: 11, texto: fmt(v), primario: i === ed.selPos, cor: PAL.ouro, acao: () => { ed.selPos = i; montar(); } });
          });
          y += Math.ceil(l.length / porLinha) * 13 + 2;
          continue;
        }
        linhas.push({ tipo: 'campo', y, ev, c });
        if (c.opcional && ev[c.k] !== undefined) {
          bt({ x: I.x + I.w - 59, y, w: 17, h: 11, icone: ic('menos'), acao: () => { registrar(); delete ev[c.k]; mudou(); } });
        }
        setas(y, () => muda(-1), () => muda(1));
        y += 13;
      }
      linhas.push({ tipo: 'dica', y, ev });
      y += 12;
      ed.inspAltura = y + ed.inspScroll - I.y;
    }

    // ------------------------------------------------------------ prévia --
    function prevCtx() {
      if (!pv.cv) { pv.cv = document.createElement('canvas'); pv.cv.width = PW; pv.cv.height = PH; pv.c = pv.cv.getContext('2d'); }
      return pv.c;
    }
    const tempoAtual = () => ed.cursor * ed.B;

    function linhaTracejada(c, x0, y0, x1, y1) {
      const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 3));
      for (let i = 0; i < n; i += 2) {
        const u = i / n;
        c.fillRect(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u), 1, 1);
      }
    }

    // Onde o evento selecionado acontece (linhas/miras douradas na caixa).
    function marcasSelecao(c) {
      const ev = ed.sel >= 0 ? ed.fase.eventos[ed.sel] : null;
      if (!ev || ed.tocando) return;
      const k = ev.tipo === 'paredes' ? 'centro' : 'pos';
      const l = Editor.lista(ev[k] !== undefined ? ev[k] : 0);
      const cor = (i) => (i === ed.selPos ? PAL.ouro : PAL.ouroEscuro);
      const vert = (x, i) => { c.fillStyle = cor(i); linhaTracejada(c, x, -HH, x, HH); };
      const hori = (y, i) => { c.fillStyle = cor(i); linhaTracejada(c, -HW, y, HW, y); };
      const mira = (x, y) => {
        c.fillStyle = PAL.ouro;
        c.fillRect(Math.round(x) - 6, Math.round(y), 4, 1); c.fillRect(Math.round(x) + 3, Math.round(y), 4, 1);
        c.fillRect(Math.round(x), Math.round(y) - 6, 1, 4); c.fillRect(Math.round(x), Math.round(y) + 3, 1, 4);
      };
      switch (ev.tipo) {
        case 'chuva': case 'teleguiada': {
          const v = (ev.de || 'cima') === 'cima' || ev.de === 'baixo';
          l.forEach((p, i) => (v ? vert(p * HW, i) : hori(p * HH, i)));
          break;
        }
        case 'fogo': l.forEach((p, i) => ((ev.eixo || 'h') === 'v' ? vert(p * HW, i) : hori(p * HH, i))); break;
        case 'laser': {
          const o = ev.orient === undefined ? 'v' : ev.orient;
          l.forEach((p, i) => {
            if (o === 'v') vert(p * HW, i);
            else if (o === 'h') hori(p * HH, i);
            else {
              const a = o * Math.PI / 180, nx = -Math.sin(a), ny = Math.cos(a), dx = Math.cos(a) * 400, dy = Math.sin(a) * 400;
              c.fillStyle = cor(i); linhaTracejada(c, nx * p * HH - dx, ny * p * HH - dy, nx * p * HH + dx, ny * p * HH + dy);
            }
          });
          break;
        }
        case 'paredes': {
          const esp = ev.espaco || (ev.modo === 'buraco' ? 40 : 48);
          if (ev.modo === 'buraco') {
            const vertical = ev.de === 'cima' || ev.de === 'baixo';
            l.forEach((p, i) => (vertical ? (vert(p * HW - esp / 2, i), vert(p * HW + esp / 2, i)) : (hori(p * HH - esp / 2, i), hori(p * HH + esp / 2, i))));
          } else if ((ev.eixo || 'h') === 'h') { vert(l[0] * HW - esp / 2, 0); vert(l[0] * HW + esp / 2, 0); }
          else { hori(l[0] * HH - esp / 2, 0); hori(l[0] * HH + esp / 2, 0); }
          break;
        }
        case 'espiral': case 'anel': case 'moeda': mira((ev.x || 0) * HW, (ev.y || 0) * HH); break;
      }
    }

    function desenharPrevia(c) {
      const A = L.prev;
      UI.painel(c, A.x, A.y, A.w, A.h, { fundo: PAL.fundo, borda: PAL.fundo3 });
      const pc = prevCtx();
      pc.setTransform(1, 0, 0, 1, 0, 0);
      pc.globalAlpha = 1;
      pc.fillStyle = PAL.fundo; pc.fillRect(0, 0, PW, PH);
      const t0 = tempoAtual(), batida = ed.cursor;
      const est = Patterns.estadoCaixa(ed.comp, t0, estPrev);
      const bw = HW * est.largura, bh = HH * est.altura;
      pc.save();
      pc.translate(PW / 2, PH / 2);
      if (est.rad) pc.rotate(est.rad);
      pc.fillStyle = PAL.preto; pc.fillRect(-bw, -bh, bw * 2, bh * 2);
      pc.save();
      pc.beginPath(); pc.rect(-bw, -bh, bw * 2, bh * 2); pc.clip();
      const op = { hitbox: false, reduzido: false, alma: alma0, frame: Game.frame, piscaMorte: false };
      Render.ataques(pc, ed.at, t0, batida, op);
      pc.globalAlpha = 0.45;
      Avatar.desenhar(pc, Avatar.atual(), 0, 0, 1, {});
      pc.globalAlpha = 1;
      if (est.escuro > 0.01) {
        Render.escuridao(pc, est, [alma0], bw, bh, Avatar.corPrincipal());
        pc.globalAlpha = 0.7; Render.avisos(pc, ed.at, t0, batida, op); pc.globalAlpha = 1;
      }
      marcasSelecao(pc);
      pc.restore();
      const b = CONFIG.caixa.borda;
      pc.fillStyle = (est.invX || est.invY) ? PAL.roxo : PAL.branco;
      pc.fillRect(-bw - b, -bh - b, bw * 2 + b * 2, b); pc.fillRect(-bw - b, bh, bw * 2 + b * 2, b);
      pc.fillRect(-bw - b, -bh, b, bh * 2); pc.fillRect(bw, -bh, b, bh * 2);
      Render.avisosMods(pc, ed.comp, t0, est, batida, bw, bh, alma0);
      pc.restore();
      c.save();
      c.beginPath(); c.rect(A.x + 1, A.y + 1, A.w - 2, A.h - 2); c.clip();
      c.imageSmoothingEnabled = true;
      c.drawImage(pv.cv, Math.round(PCX - PW * E / 2), Math.round(PCY - PH * E / 2), Math.round(PW * E), Math.round(PH * E));
      c.imageSmoothingEnabled = false;
      c.restore();
      if (ed.cursor > ed.dur - 1e-6) UI.texto(c, t('editor.fim'), A.x + 6, A.y + 5, { cor: PAL.ouro, sombra: PAL.preto });
    }

    // Toque na prévia: posiciona o evento selecionado.
    function tocarPrevia(x, y) {
      const ev = ed.sel >= 0 ? ed.fase.eventos[ed.sel] : null;
      if (!ev) return false;
      const c0 = Editor.camposDe(ev).find(c => c.posicao);
      if (!c0) return false;
      const est = Patterns.estadoCaixa(ed.comp, tempoAtual(), estPrev);
      const dx = (x - PCX) / E, dy = (y - PCY) / E;
      const co = Math.cos(est.rad || 0), si = Math.sin(est.rad || 0);
      const bx = dx * co + dy * si, by = -dx * si + dy * co;
      const v = Editor.posicaoDoToque(ev, c0.k, bx, by, HW, HH);
      if (v === null) return false;
      const antes = JSON.stringify(ed.fase);
      if (c0.k === 'x' || c0.k === 'y') { ev.x = v.x; ev.y = v.y; }
      else if (c0.t === 'pos') {
        const l = Editor.lista(Editor.valor(ev, c0));
        l[Math.min(ed.selPos, l.length - 1)] = v;
        ev[c0.k] = l.length === 1 ? l[0] : l;
      } else ev[c0.k] = v;
      if (JSON.stringify(ed.fase) !== antes) {
        if (!ed.arrasto || !ed.arrasto.registrado) { ed.hist.registrar(antes); if (ed.arrasto) ed.arrasto.registrado = true; }
        mudou();
      }
      return true;
    }

    // ------------------------------------------------------ inspetor ------
    function valorTexto(ev, c) {
      const v = Editor.valor(ev, c);
      if (c.t === 'bool') return t('editor.opcoes.' + (v ? 'sim' : 'nao'));
      if (c.t === 'enum') return t('editor.opcoes.' + (v === undefined ? 'fechar' : v));
      if (c.t === 'orient') return v === 'v' || v === 'h' ? t('editor.opcoes.' + v) : fmt(v);
      if (v === undefined) return t('editor.opcoes.nada');
      return fmt(v);
    }

    function desenharInspetor(c) {
      const I = L.insp;
      UI.painel(c, I.x, I.y, I.w, I.h, { fundo: PAL.fundo2, borda: PAL.fundo3 });
      c.save();
      c.beginPath(); c.rect(I.x + 1, I.y + 1, I.w - 2, I.h - 2); c.clip();
      for (const ln of ed.linhas || []) {
        const y = ln.y;
        if (y < I.y - 14 || y > I.y + I.h) continue;
        if (ln.tipo === 'paleta') {
          UI.texto(c, t('editor.adicionarEm', { n: fmt(Editor.imantar(ed.cursor, 'q', null, 0)) }), I.x + 6, y + 2, { cor: PAL.cinzaClaro });
        } else if (ln.tipo === 'cab') {
          const ev = ln.ev;
          c.drawImage(Sprites.desenho('ev_' + ev.tipo, corDoTipo(ev.tipo)), I.x + 6, y + 3);
          UI.texto(c, t('editor.tipos.' + ev.tipo), I.x + 18, y + 3, { cor: corDoTipo(ev.tipo) });
          if (ed.faixas[ed.sel] && ed.faixas[ed.sel].fora) UI.texto(c, t('editor.depoisDoFim'), I.x + 6, y + 12, { cor: PAL.perigoClaro });
        } else if (ln.tipo === 'batida') {
          UI.texto(c, t('editor.batida'), I.x + 6, y + 2, { cor: PAL.cinzaClaro });
          UI.texto(c, fmt(ln.ev.batida), I.x + 112, y + 2, { cor: PAL.branco });
        } else if (ln.tipo === 'campo') {
          const def = ln.ev[ln.c.k] === undefined;
          UI.texto(c, t('editor.campos.' + (ln.c.rot || ln.c.k)), I.x + 6, y + 2, { cor: PAL.cinzaClaro });
          if (ln.c.t !== 'pos') UI.texto(c, valorTexto(ln.ev, ln.c), I.x + 112, y + 2, { cor: def ? PAL.cinza : PAL.branco });
        } else if (ln.tipo === 'dica') {
          if (Editor.camposDe(ln.ev).some(cc => cc.posicao)) UI.texto(c, t('editor.toquePosicao'), I.x + 6, y + 2, { cor: PAL.cinza });
        }
      }
      CI.desenhar(c, Game.tempo);
      c.restore();
      // barrinha de rolagem
      if (ed.inspAltura > I.h) {
        const h = Math.max(10, Math.round(I.h * I.h / ed.inspAltura));
        const y = I.y + Math.round((I.h - h) * ed.inspScroll / (ed.inspAltura - I.h));
        c.fillStyle = PAL.cinza; c.fillRect(I.x + I.w - 3, y, 2, h);
      }
    }
    function rolarInspetor(d) {
      const max = Math.max(0, ed.inspAltura - L.insp.h + 4);
      const n = Math.max(0, Math.min(max, ed.inspScroll + d));
      if (n !== ed.inspScroll) { ed.inspScroll = n; montar(); }
    }

    // ------------------------------------------------- linha do tempo -----
    function desenharLinhaDoTempo(c) {
      const T = L.tl, yR = L.regua.y, yM = L.musica.y, yP = L.pistas.y, hP = L.pistas.h * L.pistas.n;
      const b0 = ed.scroll, b1 = Bx(T.x + T.w);
      c.fillStyle = PAL.fundo2; c.fillRect(T.x, yR, T.w, yP + hP - yR);
      c.save();
      c.beginPath(); c.rect(T.x, yR, T.w, yP + hP - yR); c.clip();
      // seções da música
      ed.mapa.secoes.forEach((s, i) => {
        const x0 = X(s.inicioBatida), x1 = X(s.fimBatida);
        if (x1 < T.x || x0 > T.x + T.w) return;
        c.fillStyle = i % 2 ? PAL.fundo3 : PAL.fundo;
        c.fillRect(Math.round(x0), yM, Math.round(x1 - x0), L.musica.h);
        c.fillStyle = PAL.azul; c.globalAlpha = 0.25 + 0.6 * (s.energia || 0);
        c.fillRect(Math.round(x0), yM, Math.round(x1 - x0), 1);
        c.globalAlpha = 1;
        const nome = t('editor.secoes.' + s.nome);
        if (x1 - x0 > UI.largura(nome) + 6) UI.texto(c, nome, Math.max(T.x + 2, Math.round(x0) + 2), yM + 2, { cor: PAL.cinza });
      });
      // bumbo, caixa e melodia
      const marcas = (l, y, cor) => {
        c.fillStyle = cor;
        for (let i = Editor.busca(l, b0 - 1); i < l.length && l[i] <= b1; i++) c.fillRect(Math.round(X(l[i])), y, Math.max(1, Math.min(2, Math.round(ed.zoom / 4))), 3);
      };
      marcas(ed.mapa.bumbo, yM + L.musica.h - 3, PAL.laranja);
      marcas(ed.mapa.caixa, yM + L.musica.h - 7, PAL.alma);
      const mel = ed.mapa.melodia, faixaNota = Math.max(1, ed.mapa.notaMax - ed.mapa.notaMin);
      c.fillStyle = PAL.verde;
      for (let i = Editor.busca(ed.mapa.notasMelodia, b0 - 4); i < mel.length && mel[i].b <= b1; i++) {
        const n = mel[i];
        const y = yM + 10 - Math.round((n.nota - ed.mapa.notaMin) / faixaNota * 7);
        c.fillRect(Math.round(X(n.b)), y, Math.max(1, Math.round(n.dur * ed.zoom) - 1), 1);
      }
      // régua: números a cada N batidas, risquinho em cada batida
      let passo = 1;
      while (passo * ed.zoom < 24) passo *= 2;
      c.fillStyle = PAL.cinza;
      for (let b = Math.max(0, Math.floor(b0)); b <= b1; b++) {
        const x = Math.round(X(b));
        if (b % passo === 0) {
          c.fillRect(x, yR, 1, L.regua.h);
          UI.texto(c, String(b), x + 2, yR + 1, { cor: b % 4 === 0 ? PAL.cinzaClaro : PAL.cinza });
        } else if (ed.zoom >= 4) c.fillRect(x, yR + L.regua.h - 2, 1, 2);
      }
      // linhas dos compassos nas pistas
      for (let b = Math.ceil(b0 / 4) * 4; b <= b1; b += 4) {
        c.fillStyle = PAL.fundo3; c.fillRect(Math.round(X(b)), yP, 1, hP);
      }
      // eventos
      ed.fase.eventos.forEach((ev, i) => {
        const f = ed.faixas[i];
        if (!f) return;
        const x0 = X(f.ini), xa = X(f.ativo), x1 = Math.max(X(f.fim), xa + 3);
        if (x1 < T.x - 10 || x0 > T.x + T.w + 10) return;
        const y = yP + f.pista * L.pistas.h + 1, h = L.pistas.h - 2;
        const sel = i === ed.sel;
        c.globalAlpha = f.fora ? 0.35 : 1;
        c.fillStyle = corEscuraDoTipo(ev.tipo);
        if (xa > x0) c.fillRect(Math.round(x0), y + 2, Math.max(1, Math.round(xa - x0)), h - 4);
        c.fillStyle = sel ? PAL.branco : corDoTipo(ev.tipo);
        c.fillRect(Math.round(xa), y, Math.max(3, Math.round(x1 - xa)), h);
        const ic = Sprites.desenho('ev_' + ev.tipo, sel ? corDoTipo(ev.tipo) : PAL.preto);
        if (x1 - xa >= 10) {
          c.drawImage(ic, Math.round(xa) + 2, y + 2);
          const nome = t('editor.curtos.' + ev.tipo);
          if (x1 - xa >= UI.largura(nome) + 14) UI.texto(c, nome, Math.round(xa) + 11, y + 3, { cor: sel ? corDoTipo(ev.tipo) : PAL.preto });
        }
        if (sel) { c.fillStyle = PAL.ouro; c.fillRect(Math.round(x0), y + h, Math.round(x1 - x0), 1); }
        c.globalAlpha = 1;
      });
      // depois do fim da música
      const xf = X(ed.dur);
      if (xf < T.x + T.w) {
        c.globalAlpha = 0.55; c.fillStyle = PAL.preto; c.fillRect(Math.round(xf), yR, T.x + T.w - Math.round(xf), yP + hP - yR); c.globalAlpha = 1;
        c.fillStyle = PAL.ouro; c.fillRect(Math.round(xf), yR, 1, yP + hP - yR);
        UI.texto(c, t('editor.fim'), Math.round(xf) + 3, yR + 1, { cor: PAL.ouro });
      }
      // cursor
      const xc = Math.round(X(ed.cursor));
      c.fillStyle = ed.tocando ? PAL.verde : PAL.branco;
      c.fillRect(xc, yR, 1, yP + hP - yR);
      c.fillRect(xc - 2, yR, 5, 1); c.fillRect(xc - 1, yR + 1, 3, 1);
      c.restore();
      // tempo
      UI.texto(c, t('editor.batidaDe', { n: fmt(Math.round(ed.cursor * 100) / 100), total: ed.dur }), 476, L.ferr.y + 3, { alinhar: 'direita', cor: PAL.cinzaClaro });
    }

    // Evento da linha do tempo embaixo do ponto (ou -1).
    function eventoEm(x, y) {
      const p = Math.floor((y - L.pistas.y) / L.pistas.h);
      if (p < 0 || p >= L.pistas.n) return -1;
      let melhor = -1, dMelhor = Infinity;
      ed.fase.eventos.forEach((ev, i) => {
        const f = ed.faixas[i];
        if (!f || f.pista !== p) return;
        const x0 = X(f.ini) - 2, xa = X(f.ativo), x1 = Math.max(X(f.fim), xa + 6) + 2;
        if (x < x0 || x > x1) return;
        const d = Math.abs(x - xa);
        if (d < dMelhor) { dMelhor = d; melhor = i; }
      });
      return melhor;
    }

    // ------------------------------------------------------------ modal ---
    function desenharProps(c) {
      c.globalAlpha = 0.7; c.fillStyle = PAL.preto; c.fillRect(0, 0, W, CONFIG.tela.altura); c.globalAlpha = 1;
      const x = 120, y = 56, w = 240, h = 140;
      c.fillStyle = PAL.preto; c.fillRect(x + 3, y + 4, w, h);
      UI.painel(c, x, y, w, h, { fundo: PAL.fundo2, borda: PAL.branco });
      UI.texto(c, t('editor.propriedades'), x + w / 2, y + 8, { alinhar: 'centro', cor: PAL.branco });
      UI.texto(c, t('editor.nome'), x + 10, y + 30, { cor: PAL.cinzaClaro });
      UI.texto(c, ed.fase.nome, x + 54, y + 30, { cor: PAL.branco });
      UI.texto(c, t('editor.musica'), x + 10, y + 52, { cor: PAL.cinzaClaro });
      UI.texto(c, nomeMusica(ed.fase.musica), x + 172, y + 52, { alinhar: 'centro', cor: PAL.alma });
      UI.texto(c, t('editor.dificuldade'), x + 10, y + 72, { cor: PAL.cinzaClaro });
      UI.texto(c, t('dificuldades.' + ed.fase.dificuldade), x + 172, y + 72, { alinhar: 'centro', cor: COR_DIFICULDADE[ed.fase.dificuldade] });
      C.desenhar(c, Game.tempo);
    }

    // ------------------------------------------------------------ tela ----
    return {
      entrar(args) {
        args = args || {};
        Input.atalhos = true;
        if (args.fase) abrir(args.fase);
        else if (!ed.fase) { Game.irPara('criadas'); return; }
        Sound.parar();
        ed.tocando = false;
        ed.arrasto = null; ed.alvo = null;
        if (ed.sujo || args.de === 'jogo') recompilar();
        montar();
      },
      sair() { Input.atalhos = false; parar(); EntradaTexto.fechar(); salvarAgora(); },
      estado: () => ed,          // pros testes de navegador

      atualizar(dt) {
        if (ed.sujo) recompilar();
        if (ed.tocando) {
          let tt = Sound.posicao();
          if (!Sound.pronto()) tt = ed.cursor * ed.B + dt;
          const b = tt / ed.B;
          if (b >= ed.dur) { ed.cursor = ed.dur; parar(); verCursor(); return; }
          if (b > ed.cursor) {
            ed.cursor = b;
            ed.at.atualizar(tt, dt, alma0);
          }
          const x = X(ed.cursor);
          if (x > L.tl.x + L.tl.w * 0.8) rolar(ed.cursor - L.tl.w * 0.2 / ed.zoom);
        }
      },

      evento(e) {
        if (EntradaTexto.aberta()) return;
        if (e.t === 'tecla') { tecla(e); return; }
        if (e.t === 'roda') { roda(e); return; }
        if (e.t === 'down') { apertar(e); return; }
        if (e.t === 'move') { mover(e); return; }
        if (e.t === 'up' || e.t === 'cancel') { soltar(e); }
      },

      desenhar(c) {
        c.fillStyle = PAL.fundo; c.fillRect(0, 0, W, CONFIG.tela.altura);
        if (ed.sujo) recompilar();
        desenharPrevia(c);
        desenharInspetor(c);
        desenharLinhaDoTempo(c);
        // estado do salvamento
        const st = !Criadas.disponivel ? t('editor.semArmazenamento') : Criadas.pendente() ? t('editor.salvando') : t('editor.salvo');
        UI.texto(c, st, 146, L.ferr.y + 3, { cor: Criadas.disponivel ? PAL.cinza : PAL.perigoClaro });
        if (ed.modal === 'props') desenharProps(c);
        else C.desenhar(c, Game.tempo);
        const u = Game.tempo - ed.msgT;
        if (ed.msg && u < 1.6) {
          c.globalAlpha = u < 1.2 ? 1 : (1.6 - u) / 0.4;
          const w = UI.largura(ed.msg) + 12;
          c.fillStyle = PAL.preto; c.fillRect(Math.round(W / 2 - w / 2), L.ferr.y - 1, w, 13);
          UI.texto(c, ed.msg, W / 2, L.ferr.y + 2, { alinhar: 'centro', cor: PAL.ouro });
          c.globalAlpha = 1;
        }
      },
    };

    // ---------------------------------------------------------- entrada ---
    function dentro(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }

    function apertar(e) {
      ed.alvo = null; ed.arrasto = null;
      if (ed.modal) { if (C.ponteiro('down', e.x, e.y)) ed.alvo = C; return; }
      if (C.ponteiro('down', e.x, e.y)) { ed.alvo = C; return; }
      if (dentro(L.insp, e.x, e.y)) {
        if (CI.ponteiro('down', e.x, e.y)) ed.alvo = CI;
        ed.arrasto = { tipo: 'insp', y0: e.y, s0: ed.inspScroll, movido: false };
        return;
      }
      if (dentro(L.prev, e.x, e.y)) {
        ed.arrasto = { tipo: 'prev', registrado: false };
        tocarPrevia(e.x, e.y);
        return;
      }
      if (e.y >= L.regua.y && e.y < L.pistas.y) {
        ed.arrasto = { tipo: 'regua' };
        moverCursor(Editor.imantar(Bx(e.x), ed.ima, ed.mapa, tolIma()), true);
        return;
      }
      if (e.y >= L.pistas.y && e.y < L.pistas.y + L.pistas.h * L.pistas.n) {
        const i = eventoEm(e.x, e.y);
        if (i >= 0) {
          if (i !== ed.sel) selecionar(i);
          ed.arrasto = { tipo: 'evento', i, b0: ed.fase.eventos[i].batida, x0: e.x, registrado: false };
          parar();
        } else ed.arrasto = { tipo: 'pan', x0: e.x, s0: ed.scroll, movido: false };
      }
    }

    function mover(e) {
      if (ed.alvo) ed.alvo.ponteiro('move', e.x, e.y);
      const a = ed.arrasto;
      if (!a) return;
      if (a.tipo === 'insp') {
        if (Math.abs(e.y - a.y0) > 4) { a.movido = true; if (ed.alvo) { ed.alvo.ponteiro('cancel'); ed.alvo = null; } }
        if (a.movido) rolarInspetor(a.s0 - (e.y - a.y0) - ed.inspScroll);
      } else if (a.tipo === 'prev') {
        tocarPrevia(e.x, e.y);
      } else if (a.tipo === 'regua') {
        moverCursor(Editor.imantar(Bx(e.x), ed.ima, ed.mapa, tolIma()), true);
      } else if (a.tipo === 'evento') {
        const ev = ed.fase.eventos[a.i];
        if (!ev) return;
        const nb = Math.max(0, Math.min(ed.dur, Editor.imantar(a.b0 + (e.x - a.x0) / ed.zoom, ed.ima, ed.mapa, tolIma())));
        if (nb !== ev.batida) {
          if (!a.registrado) { registrar(); a.registrado = true; }
          ev.batida = nb;
          ed.sujo = true;
          Criadas.salvar(ed.fase);
        }
      } else if (a.tipo === 'pan') {
        if (Math.abs(e.x - a.x0) > 4) a.movido = true;
        if (a.movido) rolar(a.s0 - (e.x - a.x0) / ed.zoom);
      }
    }

    function soltar(e) {
      const a = ed.arrasto;
      ed.arrasto = null;
      if (ed.alvo) { ed.alvo.ponteiro(e.t, e.x, e.y); ed.alvo = null; }
      if (!a || e.t === 'cancel') return;
      if (a.tipo === 'pan' && !a.movido) {
        // toque num lugar vazio: cursor vai pra lá e nada fica selecionado
        if (ed.sel >= 0) selecionar(-1);
        moverCursor(Editor.imantar(Bx(e.x), ed.ima, ed.mapa, tolIma()), true);
      } else if (a.tipo === 'evento' && a.registrado) {
        montar();
      }
    }

    function roda(e) {
      if (ed.modal) return;
      if (dentro(L.insp, e.x, e.y)) { rolarInspetor(e.dy * 0.5); return; }
      if (e.y >= L.regua.y) {
        if (e.ctrl) zoom(e.dy < 0 ? 1.15 : 1 / 1.15, e.x);
        else rolar(ed.scroll + (Math.abs(e.dx) > Math.abs(e.dy) ? e.dx : e.dy) / ed.zoom * 0.6);
      }
    }

    function tecla(e) {
      if (e.repetida && (e.code === 'Space' || e.code === 'KeyT' || e.code === 'Escape')) return;
      if (ed.modal) {
        if (e.code === 'Escape') { ed.modal = null; montar(); return; }
        if (e.k) C.tecla(e.k);
        return;
      }
      if (e.ctrl) {
        if (e.code === 'KeyZ') desfazer(e.shift);
        else if (e.code === 'KeyY') desfazer(true);
        else if (e.code === 'KeyD') duplicarSel();
        else if (e.code === 'KeyC') copiar();
        else if (e.code === 'KeyV') colar();
        else if (e.code === 'KeyS') { salvarAgora(); aviso(t('editor.salvo')); }
        return;
      }
      const passo = e.shift ? 4 : Editor.passoDoIma(ed.ima);
      switch (e.code) {
        case 'Space': alternarTocar(); break;
        case 'ArrowLeft': moverCursor(Editor.imantar(ed.cursor - passo, e.shift ? 'b' : 'q', null, 0)); break;
        case 'ArrowRight': moverCursor(Editor.imantar(ed.cursor + passo, e.shift ? 'b' : 'q', null, 0)); break;
        case 'ArrowUp': case 'ArrowDown': {
          // escolhe o evento anterior/seguinte (pela batida)
          const ordem = ed.fase.eventos.map((ev, i) => i).sort((a, b) => ed.fase.eventos[a].batida - ed.fase.eventos[b].batida || a - b);
          if (!ordem.length) break;
          const p = ordem.indexOf(ed.sel);
          const n = p < 0 ? (e.code === 'ArrowDown' ? 0 : ordem.length - 1) : Math.max(0, Math.min(ordem.length - 1, p + (e.code === 'ArrowDown' ? 1 : -1)));
          selecionar(ordem[n]);
          moverCursor(ed.fase.eventos[ordem[n]].batida);
          break;
        }
        case 'Delete': case 'Backspace': apagarSel(); break;
        case 'Home': moverCursor(0); break;
        case 'End': moverCursor(ed.dur); break;
        case 'KeyT': testar(); break;
        case 'KeyM': ed.ima = Editor.IMAS[(Editor.IMAS.indexOf(ed.ima) + 1) % Editor.IMAS.length]; aviso(t('editor.ima', { modo: t('editor.imas.' + ed.ima) })); break;
        case 'Equal': case 'NumpadAdd': zoom(1.5); break;
        case 'Minus': case 'NumpadSubtract': zoom(1 / 1.5); break;
        case 'Escape':
          if (ed.sel >= 0) selecionar(-1);
          else sair();
          break;
      }
    }
  })();

  // ------------------------------------------------------ MINHAS FASES ----
  UI.telas.criadas = (() => {
    const C = new Controles();
    const CART = { x: 20, y: 30, w: 440, h: 36, gap: 4 };
    const VIS = 5;
    let rolagem = 0, apagada = null, apagadaT = -9;

    function quando(ms) {
      const s = (Date.now() - ms) / 1000;
      if (s < 60) return t('editor.agora');
      if (s < 3600) return t('editor.minutos', { n: Math.floor(s / 60) });
      if (s < 86400) return t('editor.horas', { n: Math.floor(s / 3600) });
      return t('editor.dias', { n: Math.floor(s / 86400) });
    }

    function editar(f) { Sound.sfx('confirmar'); Game.irPara('editor', { fase: f }); }

    function montar() {
      C.limpar();
      const ic = (n, cor) => Sprites.desenho(n, cor || PAL.branco);
      C.botao({ x: 4, y: 6, w: 20, h: 16, icone: ic('setaEsq'), acao: () => { Sound.sfx('voltar'); Game.irPara('fases'); } });
      const pri = C.botao({ x: 356, y: 6, w: 120, h: 16, texto: t('editor.nova'), icone: ic('mais', PAL.preto), primario: true, cor: PAL.alma,
        acao: () => editar(faseNova(Criadas.MUSICAS[0])) });
      const l = Criadas.lista();
      rolagem = Math.max(0, Math.min(Math.max(0, l.length - VIS), rolagem));
      l.slice(rolagem, rolagem + VIS).forEach((f, k) => {
        const y = CART.y + k * (CART.h + CART.gap);
        C.botao({ x: CART.x + CART.w - 118, y: y + 10, w: 60, h: 16, texto: t('editor.editar'), icone: ic('lapis'), cor: PAL.alma, acao: () => editar(f) });
        C.botao({ x: CART.x + CART.w - 54, y: y + 10, w: 22, h: 16, icone: ic('copia'),
          acao: () => { Criadas.duplicar(f.id, EntradaTexto.limpar(t('editor.copiaDe', { nome: f.nome }), CONFIG.limites.maxTexto)); Sound.sfx('confirmar'); rolagem = 0; montar(); } });
        C.botao({ x: CART.x + CART.w - 28, y: y + 10, w: 22, h: 16, icone: ic('lixo', PAL.perigoClaro),
          acao: () => { Criadas.apagar(f.id); apagada = f.id; apagadaT = Game.tempo; Sound.sfx('voltar'); montar(); } });
      });
      if (l.length > VIS) {
        C.botao({ x: 230, y: 236, w: 20, h: 14, icone: ic('setaEsq'), acao: () => { rolagem = Math.max(0, rolagem - VIS); montar(); } });
        C.botao({ x: 254, y: 236, w: 20, h: 14, icone: ic('setaDir'), acao: () => { rolagem += VIS; montar(); } });
      }
      if (apagada && Game.tempo - apagadaT < 6) {
        C.botao({ x: 290, y: 252, w: 110, h: 14, texto: t('editor.desfazerApagar'), cor: PAL.ouro,
          acao: () => { Criadas.restaurar(apagada); apagada = null; Sound.sfx('confirmar'); montar(); } });
      }
      C.focar(pri);
    }

    return {
      entrar(args) {
        args = args || {};
        Input.atalhos = false;
        if (args.apagada) { apagada = args.apagada; apagadaT = Game.tempo; }
        if (Sound.musicaAtual() !== 'menu' || !Sound.tocando()) Sound.tocar('menu', { loop: true });
        montar();
      },
      atualizar() {
        if (apagada && Game.tempo - apagadaT >= 6) { apagada = null; montar(); }
      },
      evento(e) {
        if (EntradaTexto.aberta()) return;
        if (e.t === 'tecla') {
          if (e.repetida && e.k === 'confirmar') return;
          if (e.k === 'voltar') { Sound.sfx('voltar'); Game.irPara('fases'); return; }
          if (e.k) C.tecla(e.k);
          return;
        }
        if (e.t === 'roda') { rolagem += e.dy > 0 ? 1 : -1; montar(); return; }
        if (e.t === 'down' || e.t === 'move' || e.t === 'up' || e.t === 'cancel') C.ponteiro(e.t, e.x, e.y);
      },
      desenhar(c) {
        const tm = Game.tempo;
        Game.desenharFundo(c, tm * 92 / 60, 0.2, PAL.alma, false);
        UI.texto(c, t('editor.minhasFases'), 30, 10, { escala: 2, cor: PAL.branco, sombra: PAL.preto });
        const l = Criadas.lista();
        if (!l.length) UI.texto(c, t('editor.nenhuma'), 240, 120, { alinhar: 'centro', cor: PAL.cinzaClaro, sombra: PAL.preto });
        l.slice(rolagem, rolagem + VIS).forEach((f, k) => {
          const y = CART.y + k * (CART.h + CART.gap);
          c.fillStyle = PAL.preto; c.fillRect(CART.x + 2, y + 3, CART.w, CART.h);
          UI.painel(c, CART.x, y, CART.w, CART.h, { fundo: PAL.fundo2, borda: PAL.cinza });
          c.fillStyle = COR_DIFICULDADE[f.dificuldade]; c.fillRect(CART.x + 1, y + 1, 3, CART.h - 2);
          UI.sprite(c, Sprites.iconeDificuldade(f.dificuldade), CART.x + 10, y + 7, 2);
          UI.texto(c, f.nome, CART.x + 40, y + 8, { cor: PAL.branco });
          const sub = [nomeMusica(f.musica), t('dificuldades.' + f.dificuldade), t('editor.eventos', { n: f.eventos.length }),
            t('editor.editadaHa', { quando: quando(f.editada) })].join(' · ');
          UI.texto(c, sub, CART.x + 40, y + 21, { cor: PAL.cinzaClaro });
        });
        if (l.length > VIS) UI.texto(c, (rolagem + 1) + '-' + Math.min(l.length, rolagem + VIS) + ' / ' + l.length, 284, 239, { cor: PAL.cinza });
        if (apagada && tm - apagadaT < 6) UI.texto(c, t('editor.apagada'), 284, 255, { alinhar: 'direita', cor: PAL.cinzaClaro, sombra: PAL.preto });
        C.desenhar(c, tm);
      },
    };
  })();
}
