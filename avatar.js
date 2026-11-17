'use strict';
// =============================================================================
// DODGE — avatar.js
// A alma é DADO: uma lista de camadas { peca, cor, posicao }. Isso permite
// salvar, trocar e desenhar o mesmo visual em qualquer tela e em qualquer
// tamanho. Na Fase 3 entram dezenas de peças (olhos, bocas, chapéus, padrões,
// adesivos, rastro, aura, explosão). Por enquanto: corpo + olhos.
// A HITBOX É IGUAL PRA TODO MUNDO (CONFIG.alma.raioHitbox), qualquer que seja o visual.
// =============================================================================

const Avatar = (() => {
  // Corpo 11×11: o = contorno, f = cor, h = brilho, s = sombra
  const PECAS = {
    'corpo.redondo': {
      tipo: 'corpo',
      linhas: [
        '...ooooo...',
        '.oofffffoo.',
        '.ofhffffso.',
        'ofhffffffso',
        'offffffffso',
        'offffffffso',
        'offffffffso',
        'offffffffso',
        '.offfffsso.',
        '.oosssssoo.',
        '...ooooo...',
      ],
    },
    'olhos.ponto': { tipo: 'olhos' },
  };

  const PADRAO = [
    { peca: 'corpo.redondo', cor: '#4df3ff', posicao: [0, 0] },
    { peca: 'olhos.ponto', cor: '#07070f', posicao: [0, 0] },
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

  function spriteCorpo(peca, cor) {
    return Sprites.memo('corpo:' + peca + cor, () => Sprites.criar(PECAS[peca].linhas, {
      o: ajustar(cor, 0.35), f: cor, h: ajustar(cor, 1.75), s: ajustar(cor, 0.7),
    }));
  }

  // Desenha a alma centrada em (x, y). escala: 1 no jogo, 3–6 nos menus.
  // estado: { olharX, olharY (-1..1), expressao: 'normal'|'susto'|'feliz'|'piscando' }
  function desenhar(ctx, avatar, x, y, escala, estado) {
    avatar = avatar || PADRAO;
    escala = escala || 1;
    estado = estado || {};
    const ox = Math.round(x - 5.5 * escala), oy = Math.round(y - 5.5 * escala);
    for (const camada of avatar) {
      const p = PECAS[camada.peca];
      if (!p) continue;
      if (p.tipo === 'corpo') {
        const spr = spriteCorpo(camada.peca, camada.cor);
        ctx.drawImage(spr, ox, oy, 11 * escala, 11 * escala);
      } else if (p.tipo === 'olhos') {
        desenharOlhos(ctx, camada.cor, ox, oy, escala, estado);
      }
    }
  }

  function desenharOlhos(ctx, cor, ox, oy, e, estado) {
    const dx = Math.round(estado.olharX || 0), dy = Math.round(estado.olharY || 0);
    ctx.fillStyle = cor;
    const px = (x, y, w, h) => ctx.fillRect(ox + x * e, oy + y * e, (w || 1) * e, (h || 1) * e);
    switch (estado.expressao) {
      case 'susto':
        px(2 + dx, 3 + dy, 2, 3); px(7 + dx, 3 + dy, 2, 3);
        break;
      case 'feliz':
        px(2, 5); px(3, 4); px(4, 5); px(6, 5); px(7, 4); px(8, 5);
        break;
      case 'piscando':
        px(2 + dx, 5 + dy, 2, 1); px(7 + dx, 5 + dy, 2, 1);
        break;
      default:
        px(3 + dx, 4 + dy, 1, 2); px(7 + dx, 4 + dy, 1, 2);
    }
  }

  // Pixels do corpo (para a explosão de morte: cada pixel vira uma partícula).
  function pixels(avatar) {
    avatar = avatar || PADRAO;
    const corpo = avatar.find(c => PECAS[c.peca] && PECAS[c.peca].tipo === 'corpo');
    if (!corpo) return [];
    const p = PECAS[corpo.peca];
    const cores = { o: ajustar(corpo.cor, 0.35), f: corpo.cor, h: ajustar(corpo.cor, 1.75), s: ajustar(corpo.cor, 0.7) };
    const out = [];
    p.linhas.forEach((l, y) => { for (let x = 0; x < l.length; x++) if (cores[l[x]]) out.push({ x: x - 5, y: y - 5, cor: cores[l[x]] }); });
    return out;
  }

  function atual() {
    return (Save.dados && Save.dados.avatar) || PADRAO;
  }

  function corPrincipal(avatar) {
    const corpo = (avatar || atual()).find(c => PECAS[c.peca] && PECAS[c.peca].tipo === 'corpo');
    return corpo ? corpo.cor : PAL.alma;
  }

  return { PECAS, PADRAO, desenhar, pixels, atual, corPrincipal, ajustar };
})();
