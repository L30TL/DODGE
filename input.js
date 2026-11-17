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
  const arrasto = { id: null, x: 0, y: 0, dx: 0, dy: 0 };  // dx/dy acumulados em px lógicos
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
    window.addEventListener('blur', () => { for (const c in seguradas) seguradas[c] = false; arrasto.id = null; });

    // ponteiros na janela inteira: dá pra arrastar fora do canvas (bordas pretas)
    const alvo = document;
    alvo.addEventListener('pointerdown', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('.debug-painel')) return;
      if (ev.pointerType === 'touch') usouToque = true;
      if (arrasto.id === null) { arrasto.id = ev.pointerId; arrasto.x = ev.clientX; arrasto.y = ev.clientY; }
      const p = logico(ev);
      emitir({ t: 'down', x: p.x, y: p.y, id: ev.pointerId, tipo: ev.pointerType });
      if (ev.pointerType !== 'mouse') ev.preventDefault();
    }, { passive: false });
    alvo.addEventListener('pointermove', (ev) => {
      if (ev.pointerId === arrasto.id) {
        const esc = escalaCss();
        arrasto.dx += (ev.clientX - arrasto.x) / esc;
        arrasto.dy += (ev.clientY - arrasto.y) / esc;
        arrasto.x = ev.clientX; arrasto.y = ev.clientY;
      }
      const p = logico(ev);
      emitir({ t: 'move', x: p.x, y: p.y, id: ev.pointerId, tipo: ev.pointerType, arrastando: ev.pointerId === arrasto.id });
    }, { passive: true });
    const fim = (tipo) => (ev) => {
      if (ev.pointerId === arrasto.id) arrasto.id = null;
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

    // Movimento acumulado do dedo desde a última chamada (px lógicos).
    consumirArrasto() {
      const d = { dx: arrasto.dx, dy: arrasto.dy };
      arrasto.dx = 0; arrasto.dy = 0;
      return d;
    },
    descartarArrasto() { arrasto.dx = 0; arrasto.dy = 0; },
    arrastando() { return arrasto.id !== null; },
    segurada(code) { return !!seguradas[code]; },
  };
})();
