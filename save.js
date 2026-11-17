'use strict';
// =============================================================================
// DODGE — save.js
// Save local (localStorage), à prova de perda:
//   - VERSIONADO: cada mudança de formato tem uma migração (MIGRACOES).
//   - BACKUP: o último save bom fica numa chave separada.
//   - CORROMPIDO: o texto estragado é guardado à parte e o jogo recupera do backup.
//   - GRAVAÇÃO NA HORA em recorde/vitória e ao fechar a página.
//   - DUAS ABAS: o progresso das duas é mesclado (o melhor de cada uma vale).
// Tudo em try/catch: se o navegador bloquear o armazenamento, o jogo continua
// funcionando só na memória.
// =============================================================================

const Save = (() => {
  const CHAVE = 'dodge.save';                 // formato atual (v2+)
  const CHAVE_V1 = 'dodge.save.v1';           // formato da Fase 1 (não é apagado: vira backup)
  const CHAVE_BACKUP = 'dodge.save.backup';
  const PREFIXO_CORROMPIDO = 'dodge.save.corrompido.';
  const VERSAO = 2;
  let gravarPendente = null;
  let ultimoBackup = 0;
  const finito = Number.isFinite;
  const inteiro = (v, min, max, def) => (finito(v) ? Math.max(min, Math.min(max, Math.round(v))) : def);

  function novo() {
    return {
      versao: VERSAO,
      rev: 0,                 // aumenta a cada gravação (pra mesclar abas)
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

  // ------------------------------------------------------------ migrações ---
  // MIGRACOES[n] recebe um save na versão n e devolve na versão n+1.
  const MIGRACOES = {
    1: (d) => { d.rev = 0; d.versao = 2; return d; },   // v1 (Fase 1) → v2: contador de revisão
  };

  function migrar(d) {
    if (!d) return null;
    let v = finito(d.versao) ? d.versao : 1;
    while (v < VERSAO && MIGRACOES[v]) { d = MIGRACOES[v](d); v = d.versao; }
    return d;
  }

  // Garante que o save tenha todos os campos, com tipos e faixas válidos.
  function completar(dados) {
    const out = novo();
    if (!dados || typeof dados !== 'object') return out;
    out.rev = inteiro(dados.rev, 0, 1e12, 0);
    out.primeiraVez = dados.primeiraVez !== false;
    out.ultimaFase = typeof dados.ultimaFase === 'string' ? dados.ultimaFase : null;
    if (Array.isArray(dados.avatar)) out.avatar = dados.avatar;
    const c = dados.config || {};
    const vol = (v, def) => (finito(v) ? Math.max(0, Math.min(1, v)) : def);
    out.config.volumeMusica = vol(c.volumeMusica, out.config.volumeMusica);
    out.config.volumeEfeitos = vol(c.volumeEfeitos, out.config.volumeEfeitos);
    out.config.atrasoAudioMs = finito(c.atrasoAudioMs) ? Math.max(-100, Math.min(600, Math.round(c.atrasoAudioMs))) : null;
    out.config.reduzirEfeitos = c.reduzirEfeitos === true;
    out.config.pausaAuto = c.pausaAuto !== false;
    out.config.sensibilidadeToque = finito(c.sensibilidadeToque) ? Math.max(0.5, Math.min(2.5, c.sensibilidadeToque)) : out.config.sensibilidadeToque;
    const st = dados.stats || {};
    for (const k in out.stats) out.stats[k] = inteiro(st[k], 0, 1e12, 0);
    for (const id in (dados.fases || {})) {
      const f = dados.fases[id] || {};
      const reg = novaFase();
      reg.melhor = inteiro(f.melhor, 0, 100, 0);
      reg.tentativas = inteiro(f.tentativas, 0, 1e9, 0);
      reg.vitorias = inteiro(f.vitorias, 0, 1e9, 0);
      if (Array.isArray(f.moedas)) for (let i = 0; i < 3; i++) reg.moedas[i] = f.moedas[i] === true;
      if (Array.isArray(f.mortes)) for (let i = 0; i < 100; i++) reg.mortes[i] = inteiro(f.mortes[i], 0, 1e9, 0);
      out.fases[id] = reg;
    }
    return out;
  }

  // Junta dois saves (ex.: duas abas): vale o melhor de cada um. Nada se perde.
  function mesclar(a, b) {
    if (!b) return a;
    if (!a) return b;
    const recente = (b.rev || 0) > (a.rev || 0) ? b : a;
    const out = completar(JSON.parse(JSON.stringify(recente)));
    out.rev = Math.max(a.rev || 0, b.rev || 0) + 1;
    out.primeiraVez = a.primeiraVez && b.primeiraVez;
    for (const k in out.stats) out.stats[k] = Math.max(a.stats[k] || 0, b.stats[k] || 0);
    const ids = new Set(Object.keys(a.fases).concat(Object.keys(b.fases)));
    for (const id of ids) {
      const fa = a.fases[id] || novaFase(), fb = b.fases[id] || novaFase();
      const f = novaFase();
      f.melhor = Math.max(fa.melhor, fb.melhor);
      f.tentativas = Math.max(fa.tentativas, fb.tentativas);
      f.vitorias = Math.max(fa.vitorias, fb.vitorias);
      for (let i = 0; i < 3; i++) f.moedas[i] = fa.moedas[i] || fb.moedas[i];
      for (let i = 0; i < 100; i++) f.mortes[i] = Math.max(fa.mortes[i] || 0, fb.mortes[i] || 0);
      out.fases[id] = f;
    }
    return out;
  }

  // ---------------------------------------------------------- armazenamento --
  function armazenamento() {
    try { return S.armazenamento || globalThis.localStorage || null; } catch (e) { return null; }
  }
  function ler(chave) {
    try { const st = armazenamento(); return st ? st.getItem(chave) : null; } catch (e) { return null; }
  }
  function escrever(chave, txt) {
    try { const st = armazenamento(); if (!st) return false; st.setItem(chave, txt); return true; } catch (e) { return false; }
  }
  function interpretar(txt) {
    if (typeof txt !== 'string') return null;
    try {
      const d = JSON.parse(txt);
      return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
    } catch (e) { return null; }
  }
  // Guarda o texto estragado (até 3 cópias) pra ninguém perder nada sem querer.
  function guardarCorrompido(txt) {
    try {
      const st = armazenamento();
      if (!st) return;
      const chaves = [];
      for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith(PREFIXO_CORROMPIDO)) chaves.push(k); }
      chaves.sort();
      while (chaves.length >= 3) st.removeItem(chaves.shift());
      st.setItem(PREFIXO_CORROMPIDO + Date.now(), txt);
    } catch (e) { /* sem espaço: paciência, o original continua na chave principal até a próxima gravação */ }
  }

  const S = {
    dados: novo(),
    disponivel: true,
    recuperado: null,         // null | 'backup' | 'perdido' — avisa o jogador
    armazenamento: null,      // testes podem trocar por um falso
    VERSAO, CHAVE, CHAVE_V1, CHAVE_BACKUP, PREFIXO_CORROMPIDO,
    novo, novaFase, completar, migrar, mesclar,

    carregar() {
      S.recuperado = null;
      const st = armazenamento();
      if (!st) { S.disponivel = false; S.dados = novo(); return S.dados; }
      try { st.getItem(CHAVE); S.disponivel = true; } catch (e) { S.disponivel = false; S.dados = novo(); return S.dados; }
      let txt = ler(CHAVE), deV1 = false;
      if (txt === null) { txt = ler(CHAVE_V1); deV1 = txt !== null; }
      let dados = interpretar(txt);
      if (txt !== null && !dados) {
        guardarCorrompido(txt);
        dados = interpretar(ler(CHAVE_BACKUP)) || (deV1 ? null : interpretar(ler(CHAVE_V1)));
        S.recuperado = dados ? 'backup' : 'perdido';
      }
      S.dados = completar(migrar(dados));
      if (dados) {
        escrever(CHAVE_BACKUP, JSON.stringify(S.dados));
        ultimoBackup = Date.now();
      }
      if (deV1 || S.recuperado) S.gravar();
      return S.dados;
    },

    // Grava já (recorde, vitória, configurações).
    gravar() {
      if (gravarPendente) { clearTimeout(gravarPendente); gravarPendente = null; }
      S.dados.rev = (S.dados.rev || 0) + 1;
      const txt = JSON.stringify(S.dados);
      S.disponivel = escrever(CHAVE, txt);
      if (S.disponivel && Date.now() - ultimoBackup > CONFIG.save.backupS * 1000) {
        escrever(CHAVE_BACKUP, txt);
        ultimoBackup = Date.now();
      }
      return S.disponivel;
    },

    // Grava daqui a pouco, juntando várias mudanças (mortes/tentativas comuns).
    gravarDepois() {
      if (gravarPendente) return;
      gravarPendente = setTimeout(() => { gravarPendente = null; S.gravar(); }, CONFIG.save.gravarDepoisMs);
    },
    pendente() { return !!gravarPendente; },
    gravarSePendente() { if (gravarPendente) S.gravar(); },

    // Liga os eventos do navegador: grava ao fechar/esconder e mescla outras abas.
    instalar() {
      if (typeof window === 'undefined') return;
      window.addEventListener('pagehide', () => S.gravarSePendente());
      document.addEventListener('visibilitychange', () => { if (document.hidden) S.gravarSePendente(); });
      window.addEventListener('storage', (e) => {
        if (e.key !== CHAVE || !e.newValue) return;
        const outro = interpretar(e.newValue);
        if (outro) S.dados = mesclar(S.dados, completar(migrar(outro)));
      });
    },

    fase(id) {
      if (!S.dados.fases[id]) S.dados.fases[id] = novaFase();
      return S.dados.fases[id];
    },

    get config() { return S.dados.config; },

    apagarTudo() {
      escrever(CHAVE_BACKUP, JSON.stringify(S.dados));   // o "apagar" também tem volta
      S.dados = novo();
      S.gravar();
    },

    // ---------------------------------------------- regras de progresso ----
    // Morte em pct%: conta no mapa de mortes e vê se é recorde. Debug não conta.
    registrarMorte(reg, pct, trapaca) {
      pct = inteiro(pct, 0, 99, 0);
      if (trapaca) return { recorde: false };
      reg.mortes[pct]++;
      S.dados.stats.mortes++;
      const recorde = pct > reg.melhor;
      if (recorde) reg.melhor = pct;
      return { recorde };
    },

    // Vitória: 100%, moedas pegas nesta tentativa ficam salvas, estrelas na 1ª vez.
    registrarVitoria(reg, moedas, trapaca, dificuldade) {
      if (trapaca) return { primeira: false, estrelas: 0, moedasNovas: 0 };
      const primeira = reg.vitorias === 0;
      reg.vitorias++;
      reg.melhor = 100;
      S.dados.stats.vitorias++;
      let moedasNovas = 0;
      for (let i = 0; i < 3; i++) if (moedas && moedas[i] && !reg.moedas[i]) { reg.moedas[i] = true; moedasNovas++; }
      return { primeira, estrelas: primeira ? Levels.estrelasDe(dificuldade) : 0, moedasNovas };
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
