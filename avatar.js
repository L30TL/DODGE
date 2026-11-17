'use strict';
// =============================================================================
// DODGE — avatar.js
// A alma é DADO: uma lista de camadas { peca, cor } (uma por categoria).
// Isso permite salvar, trocar e desenhar o mesmo visual em qualquer tela e em
// qualquer tamanho. Peças em pixel art pequenas e combináveis.
// A HITBOX É IGUAL PRA TODO MUNDO (CONFIG.alma.raioHitbox), qualquer que seja o visual.
// Preço em moedas comuns (preco) ou liberada por conquista (trava: 'conquista').
// =============================================================================

const Avatar = (() => {
  // Categorias, na ordem em que são desenhadas.
  const CATEGORIAS = ['corpo', 'padrao', 'olhos', 'boca', 'cabeca', 'acessorio', 'rastro'];

  // Corpo 11×11: o = contorno, f = cor, h = brilho, s = sombra
  // Cabeça/acessório: linhas com '#' (cor da camada) e 'w' (branco), a partir de (dx, dy) da caixa 11×11.
  const PECAS = {
    'corpo.redondo': { tipo: 'corpo', preco: 0, linhas: ['...ooooo...', '.oofffffoo.', '.ofhffffso.', 'ofhffffffso', 'offffffffso',
      'offffffffso', 'offffffffso', 'offffffffso', '.offfffsso.', '.oosssssoo.', '...ooooo...'] },
    'corpo.quadrado': { tipo: 'corpo', preco: 60, linhas: ['.ooooooooo.', 'ofhhfffffso', 'ofhffffffso', 'offffffffso', 'offffffffso',
      'offffffffso', 'offffffffso', 'offffffffso', 'offffffffso', 'ofsssssssso', '.ooooooooo.'] },
    'corpo.gota': { tipo: 'corpo', preco: 80, linhas: ['.....o.....', '....ofo....', '...ofhfo...', '..ofhfffo..', '.ofhffffso.',
      'ofhffffffso', 'offffffffso', 'offffffffso', '.offffffso.', '.oosssssoo.', '...ooooo...'] },
    'corpo.fantasma': { tipo: 'corpo', preco: 120, linhas: ['...ooooo...', '.oofffffoo.', '.ofhffffso.', 'ofhffffffso', 'offffffffso',
      'offffffffso', 'offffffffso', 'offffffffso', 'offffffffso', 'offoffoffso', 'oo.oo.oo.oo'] },

    'padrao.liso': { tipo: 'padrao', preco: 0 },
    'padrao.listras': { tipo: 'padrao', preco: 50, teste: (x, y) => y % 3 === 2 },
    'padrao.bolinhas': { tipo: 'padrao', preco: 50, teste: (x, y) => x % 3 === 1 && y % 3 === 1 },
    'padrao.xadrez': { tipo: 'padrao', trava: 'conquista', teste: (x, y) => ((x >> 1) + (y >> 1)) % 2 === 0 },

    'olhos.ponto': { tipo: 'olhos', preco: 0 },
    'olhos.grandes': { tipo: 'olhos', preco: 40 },
    'olhos.sono': { tipo: 'olhos', preco: 40 },
    'olhos.bravos': { tipo: 'olhos', preco: 60 },

    'boca.nenhuma': { tipo: 'boca', preco: 0 },
    'boca.sorriso': { tipo: 'boca', preco: 30, dx: 3, dy: 7, linhas: ['#...#', '.###.'] },
    'boca.o': { tipo: 'boca', preco: 30, dx: 5, dy: 7, linhas: ['#', '#'] },
    'boca.dentes': { tipo: 'boca', preco: 50, dx: 3, dy: 7, linhas: ['#####', '.www.'] },
    'boca.lingua': { tipo: 'boca', preco: 50, dx: 3, dy: 7, linhas: ['#...#', '.#r#.'] },

    'cabeca.nenhuma': { tipo: 'cabeca', preco: 0 },
    'cabeca.topete': { tipo: 'cabeca', preco: 40, dx: 3, dy: -2, linhas: ['..#..', '.#.#.', '##...'] },
    'cabeca.bone': { tipo: 'cabeca', preco: 80, dx: 1, dy: -1, linhas: ['..#####...', '.#######..', '##########w'] },
    'cabeca.laco': { tipo: 'cabeca', preco: 60, dx: 6, dy: -1, linhas: ['#.#..', '.#...', '#.#..'] },
    'cabeca.coroa': { tipo: 'cabeca', trava: 'conquista', corPadrao: '#ffd23f', dx: 2, dy: -3, linhas: ['#.#.#.#', '#######', '#w###w#'] },
    'cabeca.antena': { tipo: 'cabeca', trava: 'conquista', dx: 4, dy: -4, linhas: ['.#.', '#w#', '.#.', '.#.'] },
    'cabeca.chifres': { tipo: 'cabeca', trava: 'conquista', corPadrao: '#ff4d4d', dx: 1, dy: -2, linhas: ['#.......#', '##.....##'] },

    'acessorio.nenhum': { tipo: 'acessorio', preco: 0 },
    'acessorio.cachecol': { tipo: 'acessorio', preco: 70, dx: 1, dy: 8, linhas: ['#########', '......##.', '......##.'] },
    'acessorio.oculos': { tipo: 'acessorio', preco: 90, dx: 1, dy: 3, linhas: ['#########', '.###.###.', '..#...#..'] },
    'acessorio.gravata': { tipo: 'acessorio', preco: 60, dx: 4, dy: 8, linhas: ['###', '.#.', '###', '.#.'] },
    'acessorio.estrela': { tipo: 'acessorio', trava: 'conquista', corPadrao: '#ffd23f', dx: 6, dy: 5, linhas: ['.#.', '###', '.#.'] },

    'rastro.padrao': { tipo: 'rastro', preco: 0 },
    'rastro.bolhas': { tipo: 'rastro', preco: 80 },
    'rastro.faiscas': { tipo: 'rastro', trava: 'conquista' },
    'rastro.arcoiris': { tipo: 'rastro', trava: 'conquista' },
  };

  // Cores do seletor (sem rosa/vermelho-vivo no corpo: rosa é a cor do PERIGO no jogo).
  const CORES = ['#4df3ff', '#2ec4b6', '#3ddc84', '#a6ff4d', '#ffd23f', '#ff9f43', '#f4f4ff', '#c8d0e0',
    '#8888aa', '#4d7cff', '#7a5cff', '#c04dff', '#a0643c', '#07070f', '#1a5560', '#ff4d4d'];
  const PROIBIDAS_NO_CORPO = ['#ff4d4d'];

  const PADRAO = [
    { peca: 'corpo.redondo', cor: '#4df3ff' },
    { peca: 'olhos.ponto', cor: '#07070f' },
  ];

  // Escurece/clareia uma cor hex (f < 1 escurece, f > 1 clareia).
  function ajustar(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r *= f; g *= f; b *= f; }
    else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  // Uma camada por categoria, na ordem de desenho; o que faltar vira o padrão.
  function normalizar(avatar) {
    const out = [];
    for (const cat of CATEGORIAS) {
      const c = (avatar || []).find(x => x && PECAS[x.peca] && PECAS[x.peca].tipo === cat);
      if (c) out.push({ peca: c.peca, cor: c.cor });
      else {
        const p = PADRAO.find(x => PECAS[x.peca].tipo === cat);
        const id = p ? p.peca : CONFIG.economia.pecasIniciais.find(i => PECAS[i] && PECAS[i].tipo === cat);
        if (id) out.push({ peca: id, cor: p ? p.cor : '#f4f4ff' });
      }
    }
    return out;
  }
  const camada = (avatar, cat) => normalizar(avatar).find(c => PECAS[c.peca].tipo === cat);

  function spriteCorpo(corpo, padrao) {
    const pp = padrao && PECAS[padrao.peca];
    const chave = 'corpo:' + corpo.peca + corpo.cor + (pp && pp.teste ? padrao.peca + padrao.cor : '');
    return Sprites.memo(chave, () => {
      const linhas = PECAS[corpo.peca].linhas.map((l, y) => {
        if (!pp || !pp.teste) return l;
        let s = '';
        for (let x = 0; x < l.length; x++) s += l[x] === 'f' && pp.teste(x, y) ? 'p' : l[x];
        return s;
      });
      return Sprites.criar(linhas, { o: ajustar(corpo.cor, 0.35), f: corpo.cor, h: ajustar(corpo.cor, 1.75), s: ajustar(corpo.cor, 0.7),
        p: padrao ? padrao.cor : corpo.cor });
    });
  }

  function desenharLinhas(ctx, p, cor, ox, oy, e) {
    const cores = { '#': cor, w: '#f4f4ff', r: '#ff6a8a' };
    p.linhas.forEach((l, y) => {
      for (let x = 0; x < l.length; x++) {
        const c = cores[l[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + (p.dx + x) * e, oy + (p.dy + y) * e, e, e);
      }
    });
  }

  // Desenha a alma centrada em (x, y). escala: 1 no jogo, 3–6 nos menus.
  // estado: { olharX, olharY (-1..1), expressao: 'normal'|'susto'|'feliz'|'piscando' }
  function desenhar(ctx, avatar, x, y, escala, estado) {
    const cs = normalizar(avatar || PADRAO);
    escala = escala || 1;
    estado = estado || {};
    const ox = Math.round(x - 5.5 * escala), oy = Math.round(y - 5.5 * escala);
    const corpo = cs.find(c => PECAS[c.peca].tipo === 'corpo');
    const padrao = cs.find(c => PECAS[c.peca].tipo === 'padrao');
    for (const c of cs) {
      const p = PECAS[c.peca];
      if (p.tipo === 'corpo') ctx.drawImage(spriteCorpo(c, padrao), ox, oy, 11 * escala, 11 * escala);
      else if (p.tipo === 'olhos') desenharOlhos(ctx, c, ox, oy, escala, estado);
      else if (p.linhas && (p.tipo !== 'boca' || estado.expressao !== 'susto')) desenharLinhas(ctx, p, c.cor, ox, oy, escala);
    }
    return corpo;
  }

  function desenharOlhos(ctx, c, ox, oy, e, estado) {
    const dx = Math.round(estado.olharX || 0), dy = Math.round(estado.olharY || 0);
    ctx.fillStyle = c.cor;
    const px = (x, y, w, h) => ctx.fillRect(ox + x * e, oy + y * e, (w || 1) * e, (h || 1) * e);
    switch (estado.expressao) {
      case 'susto': px(2 + dx, 3 + dy, 2, 3); px(7 + dx, 3 + dy, 2, 3); return;
      case 'feliz': px(2, 5); px(3, 4); px(4, 5); px(6, 5); px(7, 4); px(8, 5); return;
      case 'piscando': px(2 + dx, 5 + dy, 2, 1); px(7 + dx, 5 + dy, 2, 1); return;
    }
    switch (c.peca) {
      case 'olhos.grandes':
        px(2 + dx, 4 + dy, 2, 2); px(6 + dx, 4 + dy, 2, 2);
        ctx.fillStyle = '#f4f4ff'; px(2 + dx, 4 + dy); px(6 + dx, 4 + dy);
        break;
      case 'olhos.sono': px(2, 4, 3, 1); px(6, 4, 3, 1); px(3 + dx, 5, 1, 1); px(7 + dx, 5, 1, 1); break;
      case 'olhos.bravos': px(2, 3); px(3, 4); px(8, 3); px(7, 4); px(3 + dx, 5 + dy); px(7 + dx, 5 + dy); break;
      default: px(3 + dx, 4 + dy, 1, 2); px(7 + dx, 4 + dy, 1, 2);
    }
  }

  // Pixels do corpo (para a explosão de morte: cada pixel vira uma partícula).
  function pixels(avatar) {
    const corpo = camada(avatar || atual(), 'corpo');
    if (!corpo) return [];
    const p = PECAS[corpo.peca];
    const cores = { o: ajustar(corpo.cor, 0.35), f: corpo.cor, h: ajustar(corpo.cor, 1.75), s: ajustar(corpo.cor, 0.7) };
    const out = [];
    p.linhas.forEach((l, y) => { for (let x = 0; x < l.length; x++) if (cores[l[x]]) out.push({ x: x - 5, y: y - 5, cor: cores[l[x]] }); });
    return out;
  }

  // O visual salvo (normalizado; guardado em cache enquanto o save não troca de visual).
  let cacheDe = null, cache = null;
  function atual() {
    const v = (Save.dados && Save.dados.avatar) || PADRAO;
    if (v !== cacheDe) { cacheDe = v; cache = normalizar(v); }
    return cache;
  }

  function corPrincipal(avatar) {
    const corpo = camada(avatar || atual(), 'corpo');
    return corpo ? corpo.cor : PAL.alma;
  }

  // Estilo do rastro: { estilo: 'padrao' | 'bolhas' | 'faiscas' | 'arcoiris', cor }
  function rastro(avatar) {
    const r = camada(avatar || atual(), 'rastro');
    return { estilo: r ? r.peca.split('.')[1] : 'padrao', cor: r && r.peca !== 'rastro.padrao' ? r.cor : corPrincipal(avatar) };
  }

  return { PECAS, PADRAO, CATEGORIAS, CORES, PROIBIDAS_NO_CORPO, desenhar, pixels, atual, corPrincipal, ajustar,
    normalizar, camada, rastro };
})();
