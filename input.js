'use strict';
// =============================================================================
// DODGE — input.js
// PC: setas ou WASD. Celular: arrastar o dedo em QUALQUER lugar da tela —
// a alma copia o movimento relativo do dedo (não precisa encostar nela).
// Também converte toques/cliques em coordenadas da tela lógica (480×270).
// =============================================================================

const Input = (() => {
  const W = CONFIG.tela.largura, H = CONFIG.tela.altura;
  const seguradas = {};                 // código da tecla -> true
  let canvas = null;
  let destino = null;                   // função(evento) da tela atual
  // arrasto atual: total andado desde que o dedo/mouse encostou (px lógicos)
  const arrasto = { id: null, x: 0, y: 0, totalX: 0, totalY: 0, sessao: 0, tipo: 'touch' };
  const dedos = new Map();              // ponteiros encostados: id -> {x, y} (pra trocar de dedo)
  let usouToque = false;

  const MAPA = {
    ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo',
    ArrowLeft: 'esquerda', KeyA: 'esquerda', ArrowRight: 'direita', KeyD: 'direita',
    Enter: 'confirmar', Space: 'confirmar', NumpadEnter: 'confirmar',
    Escape: 'voltar', KeyP: 'pausa', KeyR: 'reiniciar', Backspace: 'voltar',
  };

  // px CSS -> px lógicos
  function escalaCss() {
    const r = canvas.getBoundingClientRect();
    return r.width / W;
  }

  function logico(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
  }

  function emitir(e) { if (destino) destino(e); }

  function init(cv) {
    canvas = cv;
    window.addEventListener('keydown', (ev) => {
      const k = MAPA[ev.code];
      if (k || ev.code === 'Tab') ev.preventDefault();
      seguradas[ev.code] = true;
      emitir({ t: 'tecla', k: k || null, code: ev.code, repetida: ev.repeat });
    });
    window.addEventListener('keyup', (ev) => { seguradas[ev.code] = false; });
    window.addEventListener('blur', () => { for (const c in seguradas) seguradas[c] = false; arrasto.id = null; dedos.clear(); });

    // ponteiros na janela inteira: dá pra arrastar fora do canvas (bordas pretas)
    const alvo = document;
    alvo.addEventListener('pointerdown', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('.debug-painel')) return;
      if (ev.pointerType === 'touch') usouToque = true;
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (arrasto.id === null) {
        arrasto.id = ev.pointerId; arrasto.x = ev.clientX; arrasto.y = ev.clientY;
        arrasto.totalX = 0; arrasto.totalY = 0; arrasto.sessao++; arrasto.tipo = ev.pointerType || 'touch';
        // continua recebendo o movimento mesmo se o cursor sair da janela
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
      }
      const p = logico(ev);
      emitir({ t: 'down', x: p.x, y: p.y, id: ev.pointerId, tipo: ev.pointerType });
      if (ev.pointerType !== 'mouse') ev.preventDefault();
    }, { passive: false });
    alvo.addEventListener('pointermove', (ev) => {
      if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (ev.pointerId === arrasto.id) {
        const esc = escalaCss();
        if (esc > 0) {                      // canvas sem tamanho (rotação): ignora, nunca vira NaN
          arrasto.totalX += (ev.clientX - arrasto.x) / esc;
          arrasto.totalY += (ev.clientY - arrasto.y) / esc;
        }
        arrasto.x = ev.clientX; arrasto.y = ev.clientY;
      }
      const p = logico(ev);
      emitir({ t: 'move', x: p.x, y: p.y, id: ev.pointerId, tipo: ev.pointerType, arrastando: ev.pointerId === arrasto.id });
    }, { passive: true });
    const fim = (tipo) => (ev) => {
      dedos.delete(ev.pointerId);
      if (ev.pointerId === arrasto.id) {
        arrasto.id = null;
        // outro dedo ainda na tela? ele continua o arrasto (B12)
        for (const [id, p] of dedos) { arrasto.id = id; arrasto.x = p.x; arrasto.y = p.y; break; }
      }
      const p = logico(ev);
      emitir({ t: tipo, x: p.x, y: p.y, id: ev.pointerId, tipo: ev.pointerType });
    };
    alvo.addEventListener('pointerup', fim('up'));
    alvo.addEventListener('pointercancel', fim('cancel'));
    // evita zoom/rolagem/menu de contexto no celular
    document.addEventListener('touchmove', (ev) => { if (!(ev.target.closest && ev.target.closest('.debug-painel'))) ev.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', (ev) => ev.preventDefault());
    document.addEventListener('gesturestart', (ev) => ev.preventDefault());
  }

  return {
    init,
    set destino(f) { destino = f; },
    get usouToque() { return usouToque; },
    temToque() { return usouToque || ('ontouchstart' in window) || navigator.maxTouchPoints > 0; },

    // Direção do teclado (-1..1 em cada eixo, normalizada na diagonal).
    direcao() {
      let x = 0, y = 0;
      if (seguradas.ArrowLeft || seguradas.KeyA) x -= 1;
      if (seguradas.ArrowRight || seguradas.KeyD) x += 1;
      if (seguradas.ArrowUp || seguradas.KeyW) y -= 1;
      if (seguradas.ArrowDown || seguradas.KeyS) y += 1;
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },

    // Arrasto atual: { ativo, tipo ('mouse' | 'touch' | 'pen'), totalX, totalY (px lógicos desde
    // que encostou), sessao (muda a cada novo toque) }. O jogo ancora a alma no começo do arrasto.
    arrasto() { return { ativo: arrasto.id !== null, tipo: arrasto.tipo, totalX: arrasto.totalX, totalY: arrasto.totalY, sessao: arrasto.sessao }; },
    arrastando() { return arrasto.id !== null; },
    segurada(code) { return !!seguradas[code]; },
  };
})();
