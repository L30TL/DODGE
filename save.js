'use strict';
// =============================================================================
// DODGE — save.js
// Save local no localStorage. Tudo em try/catch: se o navegador bloquear
// (aba anônima, cota cheia), o jogo continua funcionando só na memória.
// =============================================================================

const Save = (() => {
  const CHAVE = 'dodge.save.v1';
  const VERSAO = 1;
  let gravarPendente = null;

  function novo() {
    return {
      versao: VERSAO,
      primeiraVez: true,      // ainda não passou pela primeira experiência
      config: {
        volumeMusica: CONFIG.audio.volumeMusicaPadrao,
        volumeEfeitos: CONFIG.audio.volumeEfeitosPadrao,
        atrasoAudioMs: null,  // null = automático
        reduzirEfeitos: false,
        pausaAuto: true,
        sensibilidadeToque: CONFIG.toque.sensibilidadePadrao,
      },
      fases: {},              // por id de fase: veja Save.fase()
      stats: { tentativas: 0, raspoes: 0, mortes: 0, vitorias: 0, segundosJogados: 0 },
      ultimaFase: null,
    };
  }

  function novaFase() {
    return {
      melhor: 0,              // melhor % (0–100)
      tentativas: 0,
      vitorias: 0,
      moedas: [false, false, false],
      mortes: new Array(100).fill(0), // mapa de mortes: quantas mortes em cada %
    };
  }

  // Garante que um save antigo/incompleto tenha todos os campos.
  function completar(dados) {
    const base = novo();
    if (!dados || typeof dados !== 'object') return base;
    const out = Object.assign(base, dados);
    out.config = Object.assign(novo().config, dados.config || {});
    out.stats = Object.assign(novo().stats, dados.stats || {});
    out.fases = {};
    for (const id in (dados.fases || {})) {
      const f = Object.assign(novaFase(), dados.fases[id]);
      if (!Array.isArray(f.mortes) || f.mortes.length !== 100) f.mortes = novaFase().mortes;
      if (!Array.isArray(f.moedas) || f.moedas.length !== 3) f.moedas = [false, false, false];
      out.fases[id] = f;
    }
    out.versao = VERSAO;
    return out;
  }

  const S = {
    dados: novo(),
    disponivel: true,

    carregar() {
      try {
        const txt = localStorage.getItem(CHAVE);
        S.dados = completar(txt ? JSON.parse(txt) : null);
      } catch (e) {
        S.disponivel = false;
        S.dados = novo();
      }
      return S.dados;
    },

    // Grava já (use em momentos importantes: vitória, configurações).
    gravar() {
      if (gravarPendente) { clearTimeout(gravarPendente); gravarPendente = null; }
      try {
        localStorage.setItem(CHAVE, JSON.stringify(S.dados));
        S.disponivel = true;
      } catch (e) {
        S.disponivel = false;
      }
    },

    // Grava daqui a pouco, juntando várias mudanças (use em mortes/tentativas).
    gravarDepois() {
      if (gravarPendente) return;
      gravarPendente = setTimeout(() => { gravarPendente = null; S.gravar(); }, 800);
    },

    fase(id) {
      if (!S.dados.fases[id]) S.dados.fases[id] = novaFase();
      return S.dados.fases[id];
    },

    get config() { return S.dados.config; },

    apagarTudo() {
      S.dados = novo();
      S.gravar();
    },

    // Total de estrelas ganhas (cada fase vencida dá as estrelas da sua dificuldade).
    estrelas(fases) {
      let total = 0;
      for (const f of fases) {
        const reg = S.dados.fases[f.id];
        if (reg && reg.vitorias > 0) total += Levels.estrelasDe(f.dificuldade);
      }
      return total;
    },
  };
  return S;
})();
