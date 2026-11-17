'use strict';
// =============================================================================
// DODGE — audio.js
// Sequenciador chiptune próprio (Web Audio API) + efeitos sonoros procedurais.
//
// O RELÓGIO DO JOGO É O RELÓGIO DO ÁUDIO: a posição da música vem de
// AudioContext.currentTime. Música e ataques partem do mesmo instante (âncora),
// então não têm como dessincronizar, nem depois de 1000 tentativas.
//
// Canais (como num console 8-bit):
//   lider    — onda quadrada (pulso 25%) com vibrato e eco: a melodia
//   harmonia — onda quadrada fina (pulso 12,5%): arpejos e acordes
//   baixo    — onda triangular
//   bateria  — ruído (caixa, chimbal, prato) + bumbo (seno com queda de tom)
// =============================================================================

const Sound = (() => {
  let ctx = null;
  let mestre, compressor, volMusica, volEfeitos, portao;
  let vozes = null, vibrato = null, eco = null;
  const paramsMusica = [];   // todos os parâmetros automatizados pela música (pra cancelar no restart)
  const envsMusica = [];     // envelopes de volume da música
  const ondas = {};          // cache de ondas de pulso por duty
  let bufRuido = null;

  const relogio = { a: -1, p: 0, ultimo: 0 };
  const toc = { musica: null, ancoraCtx: 0, ancoraPos: 0, vel: 1, idx: 0, ciclo: 0, tocando: false, loop: false };
  const stats = { atrasadas: 0, sfxAtivos: 0, notasAgendadas: 0 };
  const ultimoSfx = {};
  const metro = { ativo: false, bpm: 100, prox: 0, n: 0, tempos: [] };
  const compiladas = {};

  // ------------------------------------------------------------- notas ------
  const NOTAS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const QUALIDADES = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], '5': [0, 7] };

  function midiDe(nome) {
    const m = /^([A-G](?:#|b)?)(\d)$/.exec(nome);
    if (!m) throw new Error('nota inválida: ' + nome);
    return 12 * (+m[2] + 1) + NOTAS[m[1]];
  }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function acorde(sim) {
    const m = /^([A-G](?:#|b)?)(.*)$/.exec(sim);
    if (!m || !(m[2] in QUALIDADES)) throw new Error('acorde inválido: ' + sim);
    return { raiz: NOTAS[m[1]], intervalos: QUALIDADES[m[2]] };
  }

  // =========================================================== MÚSICAS =====
  // Cada música: BPM fixo, compassos 4/4 de 16 passos (semicolcheias).
  // Melodias: 16 tokens por compasso. Nota (C5, F#4...), "." segura, "-" silêncio.
  // "~E5" = desliza da nota anterior até E5.
  // Bateria: k bumbo, s caixa, h chimbal, o chimbal aberto, c prato, x bumbo+prato.
  // Seções: listas por compasso. "nome*3" repete; "-" = nada naquele compasso.
  const MUSICAS = {
    // ---------------------------------------------------------------------
    despertar: {
      nome: 'Despertar', bpm: 112,
      timbre: { lider: { duty: 0.25, vol: 0.2, vibrato: 14, eco: 0.28 }, harmonia: { duty: 0.125, vol: 0.12 },
        baixo: { vol: 0.24 }, bateria: { vol: 0.8 } },
      secoes: [
        { nome: 'intro', compassos: 4, energia: 0.15, harmVol: 2.4, acordes: 'C Am F G', harmonia: 'arp8',
          baixo: 'raiz', bateria: '- - leve leve' },
        { nome: 'verso', compassos: 8, energia: 0.45, acordes: 'C Am F G C Am F G', harmonia: 'arp16',
          baixo: 'oitava', bateria: 'base*7 virada', lider: 'v1 v2 v3 v4 v5 v6 v7 v8' },
        { nome: 'refrao', compassos: 8, energia: 0.85, acordes: 'F G Em Am F G C C', harmonia: 'stab',
          baixo: 'oitava', bateria: 'refraoA refrao*6 virada', lider: 'r1 r2 r3 r4 r5 r6 r7 r8' },
        { nome: 'ponte', compassos: 2, energia: 0.2, acordes: 'Am G', harmonia: 'arp8',
          baixo: 'raiz', bateria: 'leve virada', lider: 'p1 p2' },
        { nome: 'final', compassos: 6, energia: 1, acordes: 'F G Em Am F G', harmonia: 'arp16',
          baixo: 'oitava', bateria: 'refraoA refrao*4 virada', lider: 'r1 r2 r3 r4 r5 r6b' },
        { nome: 'fim', compassos: 2, energia: 0.05, harmVol: 1.6, acordes: 'C C', harmonia: 'pad -',
          baixo: 'fim -', bateria: 'fim -', lider: 'f1 -' },
      ],
      melodias: {
        v1: 'C5 . E5 . G5 . . . E5 . G5 . A5 . G5 .',
        v2: 'E5 . . . . . . . - . C5 . D5 . E5 .',
        v3: 'F5 . . . A5 . . . G5 . F5 . E5 . D5 .',
        v4: 'D5 . . . . . . . - . . . - . . .',
        v5: 'C5 . E5 . G5 . . . E5 . G5 . C6 . . .',
        v6: 'B5 . A5 . . . E5 . . . - . E5 . G5 .',
        v7: 'A5 . . . G5 . F5 . E5 . . . F5 . G5 .',
        v8: 'G5 . . . . . . . D5 . . . B4 . . .',
        r1: 'A5 . . . A5 . C6 . . . A5 . G5 . F5 .',
        r2: 'G5 . . . D5 . . . G5 . A5 . B5 . . .',
        r3: 'B5 . . . G5 . . . E5 . . . G5 . B5 .',
        r4: 'C6 . . . . . B5 . A5 . . . E5 . . .',
        r5: 'A5 . . . A5 . C6 . . . A5 . G5 . F5 .',
        r6: 'G5 . . . D5 . . . G5 . A5 . B5 . D6 .',
        r7: 'C6 . . . . . . . . . . . G5 . E5 .',
        r8: 'C5 . . . . . . . - . . . - . . .',
        r6b: 'G5 . . . D5 . . . G5 . A5 . B5 . . .',
        p1: 'E5 . . . . . . . C5 . . . . . . .',
        p2: 'D5 . . . . . . . B4 . . . . . . .',
        f1: 'C6 . . . . . . . . . . . . . . -',
      },
      baterias: {
        leve: 'h . . . h . . . h . . . h . . .',
        base: 'k . h . s . h . k . h k s . h .',
        virada: 'k . h . s . h . k . s . s s s s',
        refraoA: 'x . h . s . h . k . h k s . h o',
        refrao: 'k . h . s . h k k . h k s . h o',
        fim: 'x . . . . . . . . . . . . . . .',
      },
    },

    // ---------------------------------------------------------------------
    correnteza: {
      nome: 'Correnteza', bpm: 128,
      timbre: { lider: { duty: 0.25, vol: 0.19, vibrato: 16, eco: 0.3 }, harmonia: { duty: 0.125, vol: 0.11 },
        baixo: { vol: 0.24 }, bateria: { vol: 0.8 } },
      secoes: [
        { nome: 'intro', compassos: 4, energia: 0.2, harmVol: 2.4, acordes: 'Am F C G', harmonia: 'arp16',
          baixo: 'raiz', bateria: '- - leve leve' },
        { nome: 'verso', compassos: 8, energia: 0.5, acordes: 'Am F C G Am F C E', harmonia: 'arp16',
          baixo: 'galope', bateria: 'base*7 virada', lider: 'v1 v2 v3 v4 v5 v6 v7 v8' },
        { nome: 'pre', compassos: 4, energia: 0.65, acordes: 'Dm Am Dm E', harmonia: 'stab',
          baixo: 'oitava', bateria: 'pre pre pre rufo', lider: 'q1 q2 q3 q4' },
        { nome: 'refrao', compassos: 8, energia: 0.9, acordes: 'Am F C G Am F C G', harmonia: 'arp16',
          baixo: 'oitava', bateria: 'refraoA refrao*6 virada', lider: 'c1 c2 c3 c4 c5 c6 c7 c8' },
        { nome: 'ponte', compassos: 4, energia: 0.25, acordes: 'F G Am Am', harmonia: 'pad',
          baixo: 'raiz', bateria: 'meia meia meia rufo', lider: 'b1 b2 b3 b4' },
        { nome: 'final', compassos: 10, energia: 1, acordes: 'Am F C G Am F C G F E', harmonia: 'arp16',
          baixo: 'oitava*8 oitava16 oitava16', bateria: 'refraoA refrao*6 virada refrao rufo',
          lider: 'c1 c2 c3 c4 c5 c6 c7 c8 f9 f10' },
        { nome: 'fim', compassos: 2, energia: 0.05, harmVol: 1.6, acordes: 'Am Am', harmonia: 'pad -',
          baixo: 'fim -', bateria: 'fim -', lider: 'f1 -' },
      ],
      melodias: {
        v1: 'A4 . . . C5 . E5 . . . D5 . C5 . B4 .',
        v2: 'C5 . . . . . A4 . . . . . F4 . A4 .',
        v3: 'G4 . . . C5 . E5 . . . G5 . E5 . C5 .',
        v4: 'D5 . . . . . . . B4 . . . G4 . . .',
        v5: 'A4 . . . C5 . E5 . . . A5 . G5 . E5 .',
        v6: 'F5 . . . E5 . C5 . . . A4 . C5 . F5 .',
        v7: 'E5 . . . D5 . C5 . . . E5 . G5 . . .',
        v8: 'G#5 . . . . . . . E5 . . . B4 . . .',
        q1: 'D5 . . . F5 . . . A5 . . . F5 . . .',
        q2: 'E5 . . . . . . . C5 . . . A4 . . .',
        q3: 'D5 . F5 . A5 . D6 . . . C6 . A5 . F5 .',
        q4: 'E5 . . . G#5 . . . B5 . . . D6 . . .',
        c1: 'A5 . . . C6 . . . E6 . . . D6 . C6 .',
        c2: 'C6 . . . A5 . . . . . . . F5 . A5 .',
        c3: 'G5 . . . C6 . . . E6 . . . D6 . C6 .',
        c4: 'D6 . . . . . . . B5 . . . G5 . . .',
        c5: 'A5 . . . C6 . . . E6 . . . G6 . E6 .',
        c6: 'F6 . . . E6 . C6 . . . A5 . C6 . . .',
        c7: 'E6 . . . D6 . C6 . . . G5 . C6 . D6 .',
        c8: 'B5 . . . . . . . G5 . . . D5 . . .',
        b1: 'A5 . . . . . . . C6 . . . . . . .',
        b2: 'B5 . . . . . . . D6 . . . . . . .',
        b3: 'C6 . . . . . . . . . . . . . . .',
        b4: '- . . . . . . . E5 . A5 . C6 . E6 .',
        f9: 'F6 . . . E6 . . . C6 . . . A5 . . .',
        f10: 'G#5 . . . B5 . . . E6 . . . G#6 . . .',
        f1: 'A5 . . . . . . . . . . . . . . -',
      },
      baterias: {
        leve: 'h . h . h . h . h . h . h . h .',
        base: 'k . h . s . h k . k h . s . h .',
        virada: 'k . h . s . h . s s . s s . s s',
        pre: 'k . h . s . h . k . h . s . h .',
        rufo: 's . s . s . s . s s s s s s s s',
        refraoA: 'x . h k s . h . k . h k s . h o',
        refrao: 'k . h k s . h . k . h k s . h o',
        meia: 'k . . . h . . . s . . . h . . .',
        fim: 'x . . . . . . . . . . . . . . .',
      },
    },

    // ---------------------------------------------------------------------
    prensa: {
      nome: 'Prensa', bpm: 140,
      timbre: { lider: { duty: 0.25, vol: 0.19, vibrato: 18, eco: 0.25 }, harmonia: { duty: 0.125, vol: 0.11 },
        baixo: { vol: 0.26 }, bateria: { vol: 0.85 } },
      secoes: [
        { nome: 'intro', compassos: 4, energia: 0.3, harmVol: 2.4, acordes: 'Em Em C D', harmonia: 'arp16',
          baixo: 'raiz raiz pulso pulso', bateria: '- - leve leve' },
        { nome: 'verso', compassos: 8, energia: 0.55, acordes: 'Em Em C D Em Em C D', harmonia: 'arp16',
          baixo: 'galope', bateria: 'base*7 virada', lider: 'v1 v2 v3 v4 v5 v6 v7 v8' },
        { nome: 'refrao', compassos: 8, energia: 0.9, acordes: 'Em C G D Em C D B', harmonia: 'stab',
          baixo: 'oitava', bateria: 'refraoA refrao*6 virada', lider: 'c1 c2 c3 c4 c5 c6 c7 c8' },
        { nome: 'quebra', compassos: 4, energia: 0.3, acordes: 'C D Em Em', harmonia: 'pad',
          baixo: 'raiz', bateria: 'meia meia meia rufo', lider: 'b1 b2 b3 b4' },
        { nome: 'verso2', compassos: 8, energia: 0.65, acordes: 'Em Em C D Em Em C D', harmonia: 'stab',
          baixo: 'galope', bateria: 'base2*7 virada', lider: 'v1 v2 v3 v4 v5 v6 v7 v8' },
        { nome: 'sobe', compassos: 3, energia: 0.8, acordes: 'C D B', harmonia: 'arp16',
          baixo: 'oitava16', bateria: 'rufo rufo rufo2', lider: 'u1 u2 u3' },
        { nome: 'final', compassos: 12, energia: 1, acordes: 'Em C G D Em C D B Em C D B', harmonia: 'arp16',
          baixo: 'oitava', bateria: 'refraoA refrao*6 virada refraoA refrao refrao virada',
          lider: 'c1 c2 c3 c4 c5 c6 c7 c8 c5 c6 c7 c8' },
        { nome: 'fim', compassos: 3, energia: 0.05, harmVol: 1.6, acordes: 'Em Em Em', harmonia: 'pad - -',
          baixo: 'fim - -', bateria: 'fim - -', lider: 'f1 - -' },
      ],
      melodias: {
        v1: 'E5 . E5 . G5 . E5 . A5 . G5 . E5 . D5 .',
        v2: 'E5 . . . B4 . . . D5 . E5 . - . . .',
        v3: 'C5 . C5 . E5 . C5 . G5 . E5 . C5 . B4 .',
        v4: 'D5 . . . A4 . . . F#5 . . . D5 . . .',
        v5: 'E5 . E5 . G5 . E5 . B5 . A5 . G5 . F#5 .',
        v6: 'E5 . . . . . . . - . . . E5 . F#5 .',
        v7: 'G5 . . . E5 . . . C5 . E5 . G5 . C6 .',
        v8: 'B5 . . . A5 . . . F#5 . . . D5 . . .',
        c1: 'B5 . . . . . G5 . E5 . . . G5 . B5 .',
        c2: 'C6 . . . B5 . . . G5 . . . E5 . . .',
        c3: 'D6 . . . . . B5 . G5 . . . B5 . D6 .',
        c4: 'F#6 . . . E6 . . . D6 . . . A5 . . .',
        c5: 'B5 . . . . . G5 . E5 . . . G5 . B5 .',
        c6: 'C6 . . . B5 . . . G5 . . . C6 . E6 .',
        c7: 'D6 . . . C6 . B5 . A5 . . . F#5 . . .',
        c8: 'D#6 . . . . . . . B5 . . . F#5 . . .',
        b1: 'E5 . . . . . . . G5 . . . . . . .',
        b2: 'F#5 . . . . . . . A5 . . . . . . .',
        b3: 'B5 . . . . . . . . . . . . . . .',
        b4: '- . . . . . . . . . . . . . . .',
        u1: 'C5 . E5 . G5 . C6 . E5 . G5 . C6 . E6 .',
        u2: 'D5 . F#5 . A5 . D6 . F#5 . A5 . D6 . F#6 .',
        u3: 'B5 . . . D#6 . . . F#6 . . . B6 . . .',
        f1: 'E6 . . . . . . . . . . . . . . -',
      },
      baterias: {
        leve: 'h . h . h . h . h . h . h . h .',
        base: 'k . h k s . h . k k h . s . h k',
        base2: 'k h h k s h h . k k h h s h h k',
        virada: 'k . s . s . s s k . s s s s s s',
        refraoA: 'x . h k s . h k k . h k s . h o',
        refrao: 'k . h k s . h k k . h k s . h o',
        meia: 'k . . . h . . . s . . . h . h .',
        rufo: 's . s . s . s . s . s . s . s .',
        rufo2: 's s s s s s s s s s s s s s s s',
        fim: 'x . . . . . . . . . . . . . . .',
      },
    },

    // --------------------------------------------------------------------- menu
    menu: {
      nome: 'Menu', bpm: 92, loop: true,
      timbre: { lider: { duty: 0.5, vol: 0.1, vibrato: 10, eco: 0.35 }, harmonia: { duty: 0.125, vol: 0.1 },
        baixo: { vol: 0.2 }, bateria: { vol: 0.45 } },
      secoes: [
        { nome: 'menu', compassos: 8, energia: 0.2, acordes: 'Fmaj7 Em7 Dm7 Cmaj7 Fmaj7 Em7 Dm7 G', harmonia: 'arp8',
          baixo: 'raiz', bateria: 'menu*7 menuB', lider: 'n1 - n2 - n3 - n4 -' },
      ],
      melodias: {
        n1: 'A5 . . . . . . . C6 . . . E6 . . .',
        n2: 'F5 . . . . . . . A5 . . . C6 . . .',
        n3: 'C6 . . . . . . . A5 . . . G5 . . .',
        n4: 'F5 . . . E5 . . . D5 . . . . . . .',
      },
      baterias: {
        menu: 'h . . . h . . . h . . . h . h .',
        menuB: 'h . . . h . . . h . h . h h h h',
      },
    },
  };

  // ======================================================== COMPILAÇÃO =====
  function lista(str, n) {
    const toks = [];
    for (const p of String(str || '').split(/\s+/).filter(Boolean)) {
      const [nome, rep] = p.split('*');
      for (let i = 0; i < (+rep || 1); i++) toks.push(nome);
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = toks.length ? toks[i % toks.length] : null;
      out.push(x === '-' ? null : x);
    }
    return out;
  }

  function compilar(id) {
    if (compiladas[id]) return compiladas[id];
    const M = MUSICAS[id];
    if (!M) throw new Error('música não existe: ' + id);
    const passo = 60 / M.bpm / 4;
    const eventos = [];
    const secoes = [];
    const energias = [];
    const tokensLider = [];
    let compasso = 0;

    for (const S of M.secoes) {
      const n = S.compassos;
      const acordes = lista(S.acordes, n);
      const harm = lista(S.harmonia, n);
      const baixo = lista(S.baixo, n);
      const bat = lista(S.bateria, n);
      const lid = lista(S.lider, n);
      secoes.push({ nome: S.nome, inicioBatida: compasso * 4, fimBatida: (compasso + n) * 4, energia: S.energia });
      for (let i = 0; i < n; i++, compasso++) {
        const t0 = compasso * 16 * passo;
        const ac = acordes[i] ? acorde(acordes[i]) : null;
        energias.push(S.energia);
        const antes = eventos.length;
        if (ac && harm[i]) gerarHarmonia(harm[i], ac, t0, passo, eventos);
        if (ac && baixo[i]) gerarBaixo(baixo[i], ac, t0, passo, eventos, M);
        if (bat[i]) gerarBateria(M.baterias[bat[i]], t0, passo, eventos, bat[i]);
        // partes calmas tocam mais suave; refrão mais forte
        const ganho = 0.7 + 0.3 * S.energia;
        for (let k = antes; k < eventos.length; k++) {
          eventos[k].vel *= ganho;
          if (eventos[k].voz === 'harmonia' && S.harmVol) eventos[k].vel *= S.harmVol;
        }
        const mel = lid[i] ? M.melodias[lid[i]] : null;
        if (lid[i] && !mel) throw new Error('melodia não existe: ' + lid[i]);
        const toks = mel ? mel.split(/\s+/) : new Array(16).fill('-');
        if (toks.length !== 16) throw new Error(`melodia ${lid[i]} tem ${toks.length} passos (precisa 16)`);
        tokensLider.push(...toks);
      }
    }
    // melodia: junta todos os compassos e transforma em notas com duração
    for (let i = 0; i < tokensLider.length; i++) {
      const tk = tokensLider[i];
      if (tk === '.' || tk === '-') continue;
      let fim = i + 1;
      while (fim < tokensLider.length && tokensLider[fim] === '.') fim++;
      const desl = tk[0] === '~';
      const nome = desl ? tk.slice(1) : tk;
      const durPassos = fim - i;
      eventos.push({ t: i * passo, voz: 'lider', f: freq(midiDe(nome)), dur: durPassos * passo * (durPassos > 1 ? 0.96 : 0.85),
        vel: 1, deslize: desl });
    }
    // duração das batidas de bateria: até a próxima do mesmo tipo
    // (chimbal fechado e aberto usam o mesmo envelope, então contam como um grupo só)
    const DUR_BAT = { bumbo: 0.2, caixa: 0.16, chimbal: 0.045, chimbalAberto: 0.2, prato: 1.4 };
    const porTipo = {};
    for (const e of eventos) {
      if (!DUR_BAT[e.voz]) continue;
      const g = e.voz === 'chimbalAberto' ? 'chimbal' : e.voz;
      (porTipo[g] = porTipo[g] || []).push(e);
    }
    for (const tipo in porTipo) {
      const l = porTipo[tipo].sort((a, b) => a.t - b.t);
      for (let i = 0; i < l.length; i++) {
        const prox = i + 1 < l.length ? l[i + 1].t - l[i].t : 99;
        l[i].dur = Math.min(DUR_BAT[l[i].voz], prox - 0.004);
      }
    }
    eventos.forEach((e, i) => { e.ord = i; });
    eventos.sort((a, b) => a.t - b.t || a.ord - b.ord);
    const m = { id, nome: M.nome, bpm: M.bpm, loop: !!M.loop, timbre: M.timbre, passo, eventos, secoes, energias,
      compassos: compasso, batidas: compasso * 4, duracao: compasso * 16 * passo };
    compiladas[id] = m;
    return m;
  }

  function gerarHarmonia(estilo, ac, t0, passo, ev) {
    const base = 60 + ac.raiz;                          // oitava 4
    const tons = ac.intervalos.map(i => base + i);
    const seq = tons.concat([tons[0] + 12]);
    const fs = tons.map(freq);
    if (estilo === 'arp16' || estilo === 'arp8') {
      const n = estilo === 'arp16' ? 16 : 8, len = 16 / n;
      const ida = seq.concat(seq.slice(1, -1).reverse());   // sobe e desce
      for (let i = 0; i < n; i++) {
        ev.push({ t: t0 + i * len * passo, voz: 'harmonia', f: freq(ida[i % ida.length] + (estilo === 'arp8' ? 12 : 0)),
          dur: len * passo * 0.7, vel: i % 4 === 0 ? 1 : 0.75 });
      }
    } else if (estilo === 'stab') {
      for (let i = 1; i < 8; i += 2) ev.push({ t: t0 + i * 2 * passo, voz: 'harmonia', f: fs[0], dur: passo * 1.6, vel: 1, arp: fs });
    } else if (estilo === 'acorde') {
      for (let i = 0; i < 4; i++) ev.push({ t: t0 + i * 4 * passo, voz: 'harmonia', f: fs[0], dur: passo * 3.5, vel: 1, arp: fs });
    } else if (estilo === 'pad') {
      ev.push({ t: t0, voz: 'harmonia', f: fs[0], dur: passo * 15.6, vel: 0.8, arp: fs, pad: true });
    } else throw new Error('harmonia desconhecida: ' + estilo);
  }

  function gerarBaixo(estilo, ac, t0, passo, ev, M) {
    if (M.melodias[estilo]) throw new Error('baixo explícito não suportado ainda');
    const r2 = 36 + ac.raiz, r3 = r2 + 12;           // oitavas 2 e 3
    const nota = (passoI, midi, durP, vel) =>
      ev.push({ t: t0 + passoI * passo, voz: 'baixo', f: freq(midi), dur: durP * passo, vel: vel || 1 });
    if (estilo === 'raiz') { nota(0, r2, 7.6); nota(8, r2, 7.6); }
    else if (estilo === 'pulso') { for (let i = 0; i < 4; i++) nota(i * 4, r2, 3); }
    else if (estilo === 'oitava') { for (let i = 0; i < 8; i++) nota(i * 2, i % 2 ? r3 : r2, 1.6); }
    else if (estilo === 'oitava16') { for (let i = 0; i < 16; i++) nota(i, i % 2 ? r3 : r2, 0.8); }
    else if (estilo === 'galope') {
      const ritmo = 'x.xxx.xxx.xxx.xx';
      for (let i = 0; i < 16; i++) {
        if (ritmo[i] !== 'x') continue;
        let j = i + 1; while (j < 16 && ritmo[j] !== 'x') j++;
        nota(i, i % 4 === 0 ? r2 : r2, (j - i) * 0.8, i % 4 === 0 ? 1 : 0.8);
      }
    } else if (estilo === 'fim') { nota(0, r2, 14); }
    else throw new Error('baixo desconhecido: ' + estilo);
  }

  function gerarBateria(padrao, t0, passo, ev, nome) {
    if (!padrao) throw new Error('bateria não existe: ' + nome);
    const toks = padrao.split(/\s+/);
    if (toks.length !== 16) throw new Error(`bateria ${nome} tem ${toks.length} passos`);
    const MAPA = { k: ['bumbo'], s: ['caixa'], h: ['chimbal'], o: ['chimbalAberto'], c: ['prato'], x: ['bumbo', 'prato'] };
    toks.forEach((tk, i) => {
      for (const ch of tk) {
        for (const voz of (MAPA[ch] || [])) ev.push({ t: t0 + i * passo, voz, vel: i % 4 === 0 ? 1 : 0.8 });
      }
    });
  }

  // ============================================================ GRAFO ======
  function ondaPulso(duty) {
    const k = duty.toFixed(3);
    if (ondas[k]) return ondas[k];
    const N = 40, real = new Float32Array(N + 1), imag = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return (ondas[k] = ctx.createPeriodicWave(real, imag));
  }

  function criarGrafo() {
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -8; compressor.knee.value = 8; compressor.ratio.value = 4;
    compressor.attack.value = 0.003; compressor.release.value = 0.15;
    mestre = ctx.createGain(); mestre.gain.value = 0.9;
    compressor.connect(mestre); mestre.connect(ctx.destination);
    volMusica = ctx.createGain(); volMusica.connect(compressor);
    volEfeitos = ctx.createGain(); volEfeitos.connect(compressor);
    portao = ctx.createGain(); portao.gain.value = 0; portao.connect(volMusica);

    bufRuido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = bufRuido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ruido = ctx.createBufferSource(); ruido.buffer = bufRuido; ruido.loop = true; ruido.start();

    const voz = (fonte, extras) => {
      const env = ctx.createGain(); env.gain.value = 0;
      const vol = ctx.createGain(); vol.gain.value = 0.2;
      fonte.connect(env); env.connect(vol); vol.connect(portao);
      paramsMusica.push(env.gain); envsMusica.push(env.gain);
      return Object.assign({ env, vol }, extras || {});
    };
    const osc = (tipo) => {
      const o = ctx.createOscillator();
      if (tipo === 'pulso') o.setPeriodicWave(ondaPulso(0.25)); else o.type = tipo;
      o.start(); paramsMusica.push(o.frequency);
      return o;
    };
    const filtro = (tipo, f, q) => { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q || 0.7; return b; };

    const oLider = osc('pulso'), oHarm = osc('pulso'), oBaixo = osc('triangle'), oBumbo = osc('sine'), oCaixaTom = osc('triangle');
    vozes = {
      lider: voz(oLider, { o: oLider, ultimaFreq: 0, adsr: [0.004, 0.12, 0.65, 0.03] }),
      harmonia: voz(oHarm, { o: oHarm, ultimaFreq: 0, adsr: [0.002, 0.06, 0.4, 0.02] }),
      baixo: voz(oBaixo, { o: oBaixo, ultimaFreq: 0, adsr: [0.004, 0.05, 0.85, 0.02] }),
      bumbo: voz(oBumbo, { o: oBumbo }),
    };
    // caixa: ruído em banda + um tom curto
    const fCaixa = filtro('bandpass', 1800, 0.8); ruido.connect(fCaixa);
    vozes.caixa = voz(fCaixa);
    const envTom = ctx.createGain(); envTom.gain.value = 0;
    oCaixaTom.connect(envTom); envTom.connect(vozes.caixa.vol);
    paramsMusica.push(envTom.gain); envsMusica.push(envTom.gain);
    vozes.caixa.tom = oCaixaTom; vozes.caixa.envTom = envTom;
    const fHat = filtro('highpass', 7000); ruido.connect(fHat);
    vozes.chimbal = voz(fHat);
    const fPrato = filtro('highpass', 3500); ruido.connect(fPrato);
    vozes.prato = voz(fPrato);

    // vibrato na melodia
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; lfo.start();
    const prof = ctx.createGain(); prof.gain.value = 0;
    lfo.connect(prof); prof.connect(oLider.detune);
    paramsMusica.push(prof.gain);
    vibrato = prof;

    // eco (delay com realimentação) na melodia
    const envio = ctx.createGain(); envio.gain.value = 0.25;
    const atraso = ctx.createDelay(1.5); atraso.delayTime.value = 0.4;
    const fEco = filtro('lowpass', 2600);
    const realim = ctx.createGain(); realim.gain.value = 0.32;
    vozes.lider.vol.connect(envio); envio.connect(atraso); atraso.connect(fEco); fEco.connect(realim);
    realim.connect(atraso); fEco.connect(portao);
    eco = { envio, atraso };
  }

  // ============================================================ AGENDA =====
  function envelope(p, t, dur, pico, a, d, sus, r) {
    const tA = t + a, tFim = t + dur;
    const tR = Math.max(tA, tFim - r);
    const vs = pico * sus;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(pico, tA);
    if (tR >= tA + d) { p.linearRampToValueAtTime(vs, tA + d); p.setValueAtTime(vs, tR); }
    else { const k = d > 0 ? (tR - tA) / d : 1; p.linearRampToValueAtTime(pico + (vs - pico) * k, tR); }
    p.linearRampToValueAtTime(0, Math.max(tR + 0.002, tFim));
  }

  function percussao(p, t, dur, pico) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(pico, t + 0.002);
    p.exponentialRampToValueAtTime(pico * 0.02, t + Math.max(0.01, dur));
    p.setValueAtTime(0, t + Math.max(0.01, dur) + 0.001);
  }

  function agendar(ev, t, vel) {
    const dur = (ev.dur || 0.05) / vel;
    stats.notasAgendadas++;
    const v = vozes[ev.voz];
    switch (ev.voz) {
      case 'lider': case 'harmonia': case 'baixo': {
        const f = v.o.frequency;
        if (ev.deslize && v.ultimaFreq) {
          f.setValueAtTime(v.ultimaFreq, t);
          f.exponentialRampToValueAtTime(ev.f, t + Math.min(0.07, dur * 0.5));
        } else f.setValueAtTime(ev.f, t);
        if (ev.arp) {
          const passoArp = 1 / 40;
          for (let k = 1; k * passoArp < dur - 0.01; k++) f.setValueAtTime(ev.arp[k % ev.arp.length], t + k * passoArp);
        }
        v.ultimaFreq = ev.f;
        const [a, d, s, r] = v.adsr;
        if (ev.pad) envelope(v.env.gain, t, dur, ev.vel, 0.02, 0.3, 0.6, 0.15);
        else envelope(v.env.gain, t, dur, ev.vel, a, d, s, r);
        if (ev.voz === 'lider' && toc.musica.timbre.lider.vibrato) {
          const g = vibrato.gain;
          g.setValueAtTime(0, t);
          if (dur > 0.25) {
            g.setValueAtTime(0, t + 0.16);
            g.linearRampToValueAtTime(toc.musica.timbre.lider.vibrato, Math.min(t + 0.4, t + dur));
          }
        }
        break;
      }
      case 'bumbo': {
        v.o.frequency.setValueAtTime(165, t);
        v.o.frequency.exponentialRampToValueAtTime(42, t + Math.min(0.12, dur));
        percussao(v.env.gain, t, dur, 1.0 * ev.vel);
        break;
      }
      case 'caixa': {
        percussao(v.env.gain, t, dur, 0.9 * ev.vel);
        v.tom.frequency.setValueAtTime(210, t);
        v.tom.frequency.exponentialRampToValueAtTime(120, t + 0.06);
        percussao(v.envTom.gain, t, Math.min(dur, 0.07), 0.5 * ev.vel);
        break;
      }
      case 'chimbal': percussao(v.env.gain, t, dur, 0.35 * ev.vel); break;
      case 'chimbalAberto': percussao(vozes.chimbal.env.gain, t, dur, 0.3 * ev.vel); break;
      case 'prato': percussao(v.env.gain, t, dur, 0.4 * ev.vel); break;
    }
  }

  function aplicarTimbre(m, t) {
    const tb = m.timbre;
    vozes.lider.o.setPeriodicWave(ondaPulso(tb.lider.duty));
    vozes.harmonia.o.setPeriodicWave(ondaPulso(tb.harmonia.duty));
    vozes.lider.vol.gain.setValueAtTime(tb.lider.vol, t);
    vozes.harmonia.vol.gain.setValueAtTime(tb.harmonia.vol, t);
    vozes.baixo.vol.gain.setValueAtTime(tb.baixo.vol, t);
    const vb = tb.bateria.vol;
    vozes.bumbo.vol.gain.setValueAtTime(0.5 * vb, t);
    vozes.caixa.vol.gain.setValueAtTime(0.32 * vb, t);
    vozes.chimbal.vol.gain.setValueAtTime(0.16 * vb, t);
    vozes.prato.vol.gain.setValueAtTime(0.12 * vb, t);
    eco.envio.gain.setValueAtTime(tb.lider.eco || 0, t);
    eco.atraso.delayTime.setValueAtTime(Math.min(1.4, 0.75 * 60 / m.bpm), t);
  }

  // Primeiro evento com tempo >= pos
  function indiceEm(evs, pos) {
    let lo = 0, hi = evs.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (evs[mid].t < pos - 1e-6) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // =========================================================== PÚBLICO =====
  const API = {
    stats,
    MUSICAS,

    // Chame dentro de um toque/clique: cria/libera o AudioContext (iOS/Chrome exigem gesto).
    iniciar() {
      if (ctx) {
        if (ctx.state !== 'running') { destravar(); ctx.resume().catch(() => {}); }
        return true;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ok */ }
      try {
        ctx = new AC({ latencyHint: 'interactive' });
      } catch (e) {
        try { ctx = new AC(); } catch (e2) { ctx = null; return false; }
      }
      criarGrafo();
      API.volumes();
      destravar();
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return true;
    },

    pronto() { return !!ctx; },
    rodando() { return !!ctx && ctx.state === 'running'; },

    // Relógio suave baseado no áudio (s). Extrapola entre as atualizações do currentTime.
    agora() {
      if (!ctx) return performance.now() / 1000;
      const a = ctx.currentTime, p = performance.now() / 1000;
      if (a !== relogio.a) { relogio.a = a; relogio.p = p; }
      let tt = a;
      if (ctx.state === 'running') tt += Math.min(p - relogio.p, 0.1);
      if (tt < relogio.ultimo) tt = relogio.ultimo;
      relogio.ultimo = tt;
      return tt;
    },

    latenciaAuto() {
      if (!ctx) return 0;
      const l = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
      return Math.max(0, Math.min(CONFIG.audio.latenciaAutoMax, l));
    },
    latencia() {
      const ms = Save.config.atrasoAudioMs;
      if (typeof ms === 'number') return ms / 1000;
      return API.latenciaAuto();
    },

    volumes() {
      if (!ctx) return;
      const c = Save.config, t = ctx.currentTime;
      volMusica.gain.setTargetAtTime(c.volumeMusica * c.volumeMusica, t, 0.02);
      volEfeitos.gain.setTargetAtTime(c.volumeEfeitos * c.volumeEfeitos, t, 0.02);
    },

    info(id) { return compilar(id); },

    // Toca uma música a partir de `desde` segundos. Retorna a âncora (tempo do ctx do início).
    tocar(id, op) {
      op = op || {};
      if (!ctx) return 0;
      API.parar();
      const m = compilar(id);
      const agora = ctx.currentTime;
      const inicio = agora + Math.max(0.03, CONFIG.audio.atrasoInicio);
      aplicarTimbre(m, inicio);
      portao.gain.setValueAtTime(1, inicio);
      toc.musica = m; toc.vel = op.vel || 1; toc.ancoraCtx = inicio;
      toc.ancoraPos = Math.max(0, op.desde || 0); toc.loop = op.loop !== undefined ? op.loop : m.loop;
      toc.ciclo = 0; toc.idx = indiceEm(m.eventos, toc.ancoraPos); toc.tocando = true;
      vozes.lider.ultimaFreq = 0;
      API.tick();
      return inicio;
    },

    parar() {
      if (!ctx) return;
      toc.tocando = false;
      const agora = ctx.currentTime;
      const g = portao.gain;
      g.cancelScheduledValues(agora);
      g.setTargetAtTime(0, agora, 0.006);
      const tc = agora + Math.min(0.03, Math.max(0.03, CONFIG.audio.atrasoInicio) * 0.5);
      for (const p of paramsMusica) p.cancelScheduledValues(tc);
      for (const p of envsMusica) p.setValueAtTime(0, tc);
    },

    tocando() { return toc.tocando; },
    // pra testes: âncora atual da música e o relógio cru
    _estado() { return { ancoraCtx: toc.ancoraCtx, ancoraPos: toc.ancoraPos, vel: toc.vel, idx: toc.idx, ctxT: ctx ? ctx.currentTime : 0, agora: API.agora() }; },
    musicaAtual() { return toc.musica ? toc.musica.id : null; },

    // Posição da música (s) como está sendo OUVIDA agora (desconta a latência).
    posicao() {
      if (!ctx || !toc.musica) return 0;
      const p = toc.ancoraPos + (API.agora() - API.latencia() - toc.ancoraCtx) * toc.vel;
      // em loop, só dá a volta depois que a música começou (antes da 1ª nota a posição é negativa:
      // se desse a volta viraria "quase no fim" e o jogo pularia a volta inteira)
      return toc.loop && p > 0 ? p % toc.musica.duracao : p;
    },

    // Muda a velocidade (câmera lenta do debug) mantendo a posição.
    velocidade(v) {
      if (!ctx || !toc.musica || !toc.tocando) { toc.vel = v; return; }
      const pos = toc.ancoraPos + (ctx.currentTime - toc.ancoraCtx) * toc.vel;
      API.tocar(toc.musica.id, { desde: Math.max(0, pos), vel: v, loop: toc.loop });
    },
    get vel() { return toc.vel; },

    // Agenda as notas que caem dentro da janela de antecedência. Chamado todo frame e por timer.
    tick() {
      if (!ctx) return;
      const agora = ctx.currentTime;
      const limite = agora + CONFIG.audio.antecedencia;
      if (toc.tocando && toc.musica) {
        const evs = toc.musica.eventos;
        for (let guarda = 0; guarda < 4000; guarda++) {
          if (toc.idx >= evs.length) {
            if (!toc.loop) break;
            toc.idx = 0; toc.ciclo++;
          }
          const ev = evs[toc.idx];
          const tEv = ev.t + toc.ciclo * toc.musica.duracao;
          const tc = toc.ancoraCtx + (tEv - toc.ancoraPos) / toc.vel;
          if (tc > limite) break;
          if (tc >= agora - 0.005) agendar(ev, Math.max(tc, agora), toc.vel);
          else stats.atrasadas++;
          toc.idx++;
        }
      }
      if (metro.ativo) {
        while (metro.prox < limite) {
          API.sfx(metro.n % 4 === 0 ? 'clique1' : 'clique', metro.prox);
          metro.tempos.push(metro.prox);
          if (metro.tempos.length > 64) metro.tempos.shift();
          metro.prox += 60 / metro.bpm; metro.n++;
        }
      }
    },

    // Metrônomo da calibração (no relógio do áudio).
    metronomo(ligar, bpm) {
      metro.ativo = !!ligar && !!ctx;
      if (metro.ativo) {
        metro.bpm = bpm; metro.n = 0; metro.tempos.length = 0;
        metro.prox = ctx.currentTime + 0.5;
      }
      return metro;
    },

    // ======================================================== EFEITOS =====
    sfx(nome, quando, param) {
      if (!ctx) return;
      const agora = ctx.currentTime;
      const t = quando || agora;
      if (!quando) {
        const min = { raspao: 0.045, menu: 0.02, laser: 0.06, parede: 0.08, explosao: 0.06, moeda: 0.05 }[nome] || 0.02;
        if (agora - (ultimoSfx[nome] || -1) < min) return;
        ultimoSfx[nome] = agora;
      }
      const N = (midi) => freq(midi);
      switch (nome) {
        case 'menu': bip(t, 0.125, 880, 880, 0.035, 0.16); break;
        case 'confirmar': bip(t, 0.25, 660, 660, 0.04, 0.18); bip(t + 0.045, 0.25, 990, 990, 0.07, 0.18); break;
        case 'voltar': bip(t, 0.25, 660, 440, 0.07, 0.16); break;
        case 'morte':
          chiado(t, 0.5, 0.55, 'lowpass', 4000, 120);
          bip(t, 0.5, 560, 50, 0.42, 0.3);
          bip(t + 0.01, 0.125, 280, 35, 0.32, 0.22);
          break;
        case 'raspao': {
          const c = Math.min(param || 0, 14);
          const f = 1250 * Math.pow(2, c / 12);
          bip(t, 0.125, f, f * 1.12, 0.05, 0.1);
          chiado(t, 0.03, 0.08, 'highpass', 6000, 6000);
          break;
        }
        case 'recorde':
          [72, 76, 79, 84, 88].forEach((m, i) => bip(t + i * 0.06, 0.25, N(m + 12), N(m + 12), i === 4 ? 0.35 : 0.06, 0.16));
          bip(t + 0.3, 0.5, N(96), N(96), 0.3, 0.06, 'triangle');
          break;
        case 'moeda':
          bip(t, 0.5, N(81), N(81), 0.05, 0.14);
          bip(t + 0.05, 0.5, N(88), N(88), 0.05, 0.14);
          bip(t + 0.1, 0.25, N(93), N(93), 0.28, 0.14);
          break;
        case 'vitoria': {
          const mel = [[72, 0, 0.1], [76, 0.1, 0.1], [79, 0.2, 0.1], [84, 0.3, 0.22], [79, 0.55, 0.1], [84, 0.65, 0.7]];
          mel.forEach(([m, dt, d]) => bip(t + dt, 0.25, N(m), N(m), d, 0.17));
          bip(t + 0.65, 0.125, N(76), N(76), 0.7, 0.07, null, [N(76), N(79), N(84)]);
          bip(t, 0, N(48), N(48), 0.3, 0.35, 'triangle');
          bip(t + 0.65, 0, N(48), N(48), 0.7, 0.35, 'triangle');
          break;
        }
        case 'laser': bip(t, 0.5, 1700, 260, 0.12, 0.06); chiado(t, 0.08, 0.1, 'highpass', 3000, 1500); break;
        case 'parede': bip(t, 0, 130, 45, 0.16, 0.4, 'triangle'); chiado(t, 0.14, 0.25, 'lowpass', 900, 200); break;
        case 'explosao': chiado(t, 0.3, 0.3, 'lowpass', 5000, 300); bip(t, 0.5, 240, 60, 0.18, 0.12); break;
        case 'clique': bip(t, 0.5, 1000, 1000, 0.03, 0.3); break;
        case 'clique1': bip(t, 0.5, 1500, 1500, 0.035, 0.36); break;
        case 'contagem': bip(t, 0.25, 660, 660, 0.08, 0.18); break;
        case 'contagemFim': bip(t, 0.25, 990, 990, 0.14, 0.18); break;
        case 'passouMelhor': bip(t, 0.125, N(96), N(103), 0.1, 0.07); break;
      }
    },
  };

  // Destrava o áudio no iOS tocando um buffer mudo (precisa ser dentro de um toque).
  function destravar() {
    try {
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { /* ok */ }
  }

  // Bip com onda de pulso (duty>0), triangular ou outra. Desliza de f0 a f1.
  function bip(t, duty, f0, f1, dur, vol, tipo, arp) {
    const o = ctx.createOscillator();
    if (tipo) o.type = tipo; else o.setPeriodicWave(ondaPulso(duty || 0.5));
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (arp) for (let k = 1; k * 0.025 < dur; k++) o.frequency.setValueAtTime(arp[k % arp.length], t + k * 0.025);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(volEfeitos);
    o.start(t); o.stop(t + dur + 0.02);
    stats.sfxAtivos++;
    o.onended = () => { stats.sfxAtivos--; o.disconnect(); g.disconnect(); };
  }

  // Ruído filtrado com varredura de frequência.
  function chiado(t, dur, vol, tipoFiltro, f0, f1) {
    const s = ctx.createBufferSource(); s.buffer = bufRuido;
    const f = ctx.createBiquadFilter(); f.type = tipoFiltro; f.Q.value = 0.8;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.01, t + dur);
    s.connect(f); f.connect(g); g.connect(volEfeitos);
    s.start(t, Math.random() * 1.3); s.stop(t + dur + 0.02);
    stats.sfxAtivos++;
    s.onended = () => { stats.sfxAtivos--; s.disconnect(); f.disconnect(); g.disconnect(); };
  }

  // Timer de reserva: agenda notas mesmo se um frame atrasar.
  setInterval(() => API.tick(), 40);

  return API;
})();
