'use strict';
// =============================================================================
// DODGE — criadas.js
// As fases que o jogador cria no editor. Ficam numa chave separada do save
// ('dodge.criadas'), com as mesmas proteções dele:
//   - VERSIONADO: cada mudança de formato tem uma migração (MIGRACOES).
//   - BACKUP numa chave separada; texto CORROMPIDO guardado à parte.
//   - O editor grava sozinho logo depois de cada mudança e ao fechar a página.
//   - DUAS ABAS: junta as duas (de cada fase, vale a versão editada por último).
//   - LIXEIRA: fase apagada fica guardada (as últimas CONFIG.editor.lixeira) e volta.
// Sem DOM: roda no Node (o armazenamento é trocável nos testes).
// =============================================================================

const Criadas = (() => {
  const CHAVE = 'dodge.criadas';
  const CHAVE_BACKUP = 'dodge.criadas.backup';
  const PREFIXO_CORROMPIDO = 'dodge.criadas.corrompido.';
  const VERSAO = 1;
  const MUSICAS = ['despertar', 'correnteza', 'prensa'];   // músicas que uma fase criada pode usar
  // MIGRACOES[n] recebe os dados na versão n e devolve na versão n+1.
  const MIGRACOES = {};
  let pendente = null, ultimoBackup = 0;
  const finito = Number.isFinite;
  const num = (v) => (finito(v) ? v : 0);

  function novo() { return { versao: VERSAO, rev: 0, seq: 0, fases: [], lixeira: [] }; }

  // Uma fase guardada = o formato de fase de sempre + dados do editor.
  // Nada de evento é jogado fora por estar depois do fim (trocar de música não apaga nada).
  function limparFase(f) {
    if (!f || typeof f !== 'object') return null;
    if (typeof f.id !== 'string' || !/^u-[a-z0-9-]{1,40}$/.test(f.id)) return null;
    const dur = finito(f.duracaoBatidas) ? f.duracaoBatidas : 0;
    const v = Patterns.validar(Object.assign({}, f, { debug: false, duracaoBatidas: CONFIG.limites.batidasMax })).fase;
    const ver = f.verificada;
    return {
      id: f.id,
      nome: v.nome,
      autor: v.autor === '?' ? '' : v.autor,
      dificuldade: v.dificuldade,
      musica: MUSICAS.includes(f.musica) ? f.musica : MUSICAS[0],
      bpm: v.bpm,
      duracaoBatidas: Math.max(CONFIG.limites.batidasMin, Math.min(CONFIG.limites.batidasMax, dur || 64)),
      eventos: v.eventos,
      criada: num(f.criada),
      editada: num(f.editada),
      origem: f.origem === 'codigo' ? 'codigo' : 'editor',     // 'codigo' = importada por código (Sessão 3)
      // vencida pelo criador (Sessão 3): hash do conteúdo na hora da vitória
      verificada: ver && typeof ver === 'object' && typeof ver.hash === 'string'
        ? { hash: ver.hash.slice(0, 64), data: num(ver.data) } : null,
    };
  }

  function completar(d) {
    const out = novo();
    if (!d || typeof d !== 'object') return out;
    out.rev = finito(d.rev) ? d.rev : 0;
    out.seq = finito(d.seq) ? Math.max(0, Math.round(d.seq)) : 0;
    const vistos = new Set();
    for (const f of Array.isArray(d.fases) ? d.fases : []) {
      const l = limparFase(f);
      if (l && !vistos.has(l.id)) { vistos.add(l.id); out.fases.push(l); }
    }
    for (const x of Array.isArray(d.lixeira) ? d.lixeira : []) {
      const l = x && limparFase(x.fase);
      if (l) out.lixeira.push({ fase: l, apagada: num(x.apagada) });
    }
    return out;
  }

  function migrar(d) {
    if (!d) return null;
    let v = finito(d.versao) ? d.versao : 1;
    while (v < VERSAO && MIGRACOES[v]) { d = MIGRACOES[v](d); v++; }
    d.versao = VERSAO;
    return d;
  }

  // Junta o que duas abas gravaram: de cada fase fica a versão editada por último;
  // uma fase apagada (na lixeira) depois da última edição continua apagada.
  function mesclar(a, b) {
    a = completar(a); b = completar(b);
    const out = novo();
    out.rev = Math.max(a.rev, b.rev);
    out.seq = Math.max(a.seq, b.seq);
    const lix = new Map();
    for (const x of a.lixeira.concat(b.lixeira)) {
      const k = x.fase.id;
      if (!lix.has(k) || lix.get(k).apagada < x.apagada) lix.set(k, x);
    }
    const fases = new Map();
    for (const f of a.fases.concat(b.fases)) {
      if (!fases.has(f.id) || fases.get(f.id).editada < f.editada) fases.set(f.id, f);
    }
    for (const [id, f] of fases) {
      const l = lix.get(id);
      if (l && l.apagada >= f.editada) fases.delete(id);
      else if (l) lix.delete(id);
    }
    out.fases = Array.from(fases.values());
    out.lixeira = Array.from(lix.values()).sort((x, y) => y.apagada - x.apagada).slice(0, CONFIG.editor.lixeira);
    return out;
  }

  // ---------------------------------------------------------- armazenamento --
  function armazenamento() {
    try { return C.armazenamento || globalThis.localStorage || null; } catch (e) { return null; }
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
  function guardarCorrompido(txt) {
    try {
      const st = armazenamento();
      if (!st) return;
      const chaves = [];
      for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith(PREFIXO_CORROMPIDO)) chaves.push(k); }
      chaves.sort();
      while (chaves.length >= 3) st.removeItem(chaves.shift());
      st.setItem(PREFIXO_CORROMPIDO + Date.now(), txt);
    } catch (e) { /* sem espaço: o original continua na chave principal até a próxima gravação */ }
  }

  const copia = (f) => JSON.parse(JSON.stringify(f));
  function novoId() {
    let r = '';
    for (let i = 0; i < 4; i++) r += Math.floor(Math.random() * 36).toString(36);
    return 'u-' + C.agora().toString(36) + '-' + r;
  }

  const C = {
    dados: novo(),
    disponivel: true,
    recuperado: null,             // null | 'backup' | 'perdido'
    armazenamento: null,          // testes podem trocar por um falso
    agora: () => Date.now(),      // testes podem trocar o relógio
    VERSAO, CHAVE, CHAVE_BACKUP, PREFIXO_CORROMPIDO, MUSICAS,
    novo, completar, migrar, mesclar, limparFase,

    carregar() {
      C.recuperado = null;
      if (pendente) { clearTimeout(pendente); pendente = null; }
      const txt = ler(CHAVE);
      let dados = interpretar(txt);
      if (txt !== null && !dados) {
        guardarCorrompido(txt);
        dados = interpretar(ler(CHAVE_BACKUP));
        C.recuperado = dados ? 'backup' : 'perdido';
      }
      C.dados = completar(migrar(dados));
      if (dados) { escrever(CHAVE_BACKUP, JSON.stringify(C.dados)); ultimoBackup = C.agora(); }
      if (C.recuperado) C.gravar();
      return C.dados;
    },

    gravar() {
      if (pendente) { clearTimeout(pendente); pendente = null; }
      C.dados.rev++;
      const txt = JSON.stringify(C.dados);
      C.disponivel = escrever(CHAVE, txt);
      if (C.disponivel && C.agora() - ultimoBackup > CONFIG.save.backupS * 1000) {
        escrever(CHAVE_BACKUP, txt);
        ultimoBackup = C.agora();
      }
      return C.disponivel;
    },
    gravarDepois() {
      if (pendente) return;
      pendente = setTimeout(() => { pendente = null; C.gravar(); }, CONFIG.editor.gravarDepoisMs);
    },
    gravarSePendente() { if (pendente) C.gravar(); },
    pendente() { return !!pendente; },

    instalar() {
      if (typeof window === 'undefined') return;
      window.addEventListener('pagehide', () => C.gravarSePendente());
      document.addEventListener('visibilitychange', () => { if (document.hidden) C.gravarSePendente(); });
      window.addEventListener('storage', (e) => {
        if (e.key !== CHAVE || !e.newValue) return;
        const outro = interpretar(e.newValue);
        if (outro) C.dados = mesclar(C.dados, migrar(outro));
      });
    },

    // ------------------------------------------------------------- fases ---
    lista() { return C.dados.fases.slice().sort((a, b) => b.editada - a.editada); },
    pegar(id) { return C.dados.fases.find(f => f.id === id) || null; },
    // número pro nome padrão ("MINHA FASE 3")
    proximoNumero() { return C.dados.seq + 1; },

    // op = { nome, musica, bpm, duracaoBatidas, dificuldade }
    nova(op) {
      op = op || {};
      C.dados.seq++;
      const agora = C.agora();
      const f = limparFase({ id: novoId(), nome: op.nome, autor: '', dificuldade: op.dificuldade || 'facil',
        musica: op.musica, bpm: op.bpm, duracaoBatidas: op.duracaoBatidas, eventos: op.eventos || [],
        criada: agora, editada: agora, origem: op.origem });
      C.dados.fases.push(f);
      C.gravar();
      return copia(f);
    },

    // Guarda a fase (cópia limpa). Grava daqui a pouco, juntando mudanças seguidas.
    salvar(fase, naHora) {
      const f = limparFase(Object.assign({}, fase, { editada: Math.max(C.agora(), num(fase.editada) + 1) }));
      if (!f) return null;
      const i = C.dados.fases.findIndex(x => x.id === f.id);
      if (i >= 0) C.dados.fases[i] = f; else C.dados.fases.push(f);
      if (naHora) C.gravar(); else C.gravarDepois();
      return f;
    },

    apagar(id) {
      const i = C.dados.fases.findIndex(x => x.id === id);
      if (i < 0) return false;
      const [f] = C.dados.fases.splice(i, 1);
      C.dados.lixeira.unshift({ fase: f, apagada: Math.max(C.agora(), f.editada + 1) });
      C.dados.lixeira.length = Math.min(C.dados.lixeira.length, CONFIG.editor.lixeira);
      C.gravar();
      return true;
    },

    restaurar(id) {
      const i = C.dados.lixeira.findIndex(x => x.fase.id === id);
      if (i < 0) return null;
      const [x] = C.dados.lixeira.splice(i, 1);
      x.fase.editada = Math.max(C.agora(), x.apagada + 1);
      C.dados.fases.push(x.fase);
      C.gravar();
      return copia(x.fase);
    },

    duplicar(id, nome) {
      const f = C.pegar(id);
      if (!f) return null;
      return C.nova(Object.assign(copia(f), { nome, origem: 'editor' }));
    },

    // A fase pronta pra jogar (validada, como as oficiais).
    jogavel(f) {
      const v = Patterns.validar(f).fase;
      v.id = f.id;
      v.criada = true;
      return v;
    },
  };
  return C;
})();
