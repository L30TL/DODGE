'use strict';
// =============================================================================
// DODGE — erros.js
// Captura global de erros. Qualquer erro (no carregamento, no loop, em promessas)
// vira um aviso discreto no jogo e entra num registro que dá pra COPIAR em
// Configurações › Registro de erros. Carregado antes de todos os outros arquivos.
// =============================================================================

const Erros = (() => {
  const CHAVE = 'dodge.erros';
  const MAX = 40;
  const lista = [];            // { quando, msg, onde, pilha, vezes }
  let ultimoNovo = -1;         // performance.now() do último erro novo

  function lerSalvos() {
    try {
      const txt = localStorage.getItem(CHAVE);
      const l = txt ? JSON.parse(txt) : [];
      if (Array.isArray(l)) for (const e of l.slice(-MAX)) if (e && typeof e.msg === 'string') lista.push(e);
    } catch (e) { /* sem armazenamento: fica só na memória */ }
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista.slice(-MAX))); } catch (e) { /* ok */ }
  }

  function registrar(err, onde) {
    const msg = String((err && err.message) || err || 'erro desconhecido').slice(0, 300);
    const pilha = String((err && err.stack) || '').split('\n').slice(0, 6).join('\n').slice(0, 900);
    const agora = new Date().toISOString();
    const ult = lista[lista.length - 1];
    // o mesmo erro repetindo (ex.: todo frame) vira uma linha só, com contador
    if (ult && ult.msg === msg && ult.onde === (onde || '')) { ult.vezes = (ult.vezes || 1) + 1; ult.quando = agora; }
    else {
      lista.push({ quando: agora, msg, onde: onde || '', pilha, vezes: 1 });
      while (lista.length > MAX) lista.shift();
      ultimoNovo = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    gravar();
    if (typeof console !== 'undefined') console.error('[Dodge]', msg, onde || '');
  }

  return {
    lista,
    registrar,
    instalar() {
      lerSalvos();
      window.addEventListener('error', (e) => registrar(e.error || e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '?')));
      window.addEventListener('unhandledrejection', (e) => registrar(e.reason, 'promessa'));
    },
    // Teve erro novo nos últimos `seg` segundos? (pro aviso discreto)
    recente(seg) {
      if (ultimoNovo < 0) return false;
      const agora = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return agora - ultimoNovo < seg * 1000;
    },
    // Texto pra copiar e mandar: navegador, versão e os erros.
    texto() {
      const cab = [
        'Dodge — registro de erros',
        'versão: ' + (typeof CONFIG !== 'undefined' ? CONFIG.versao : '?'),
        'navegador: ' + (typeof navigator !== 'undefined' ? navigator.userAgent : '?'),
        'tela: ' + (typeof window !== 'undefined' ? window.innerWidth + '×' + window.innerHeight + ' @' + (window.devicePixelRatio || 1) : '?'),
        '',
      ];
      const linhas = lista.map((e, i) => `#${i + 1} ${e.quando} (${e.vezes}×) ${e.onde}\n${e.msg}\n${e.pilha}`);
      return cab.concat(linhas.length ? linhas : ['(nenhum erro)']).join('\n');
    },
    limpar() { lista.length = 0; ultimoNovo = -1; gravar(); },
  };
})();

if (typeof window !== 'undefined') Erros.instalar();
