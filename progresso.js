'use strict';
// =============================================================================
// DODGE — progresso.js
// PURO: economia (moedas comuns), loja de visual, conquistas e missões
// diárias/semanais. Trabalha em cima de Save.dados (passado como parâmetro),
// sem DOM: roda no Node.
//
// REGRA DE OURO: moedas só compram VISUAL. Nada aqui muda a jogabilidade
// (a hitbox é igual pra todo mundo) e nada custa dinheiro de verdade.
// Moedas, missões e conquistas de jogo só contam nas fases oficiais, sem debug
// (fase criada não vira fazenda de moedas).
// =============================================================================

const Progresso = (() => {
  const E = () => CONFIG.economia;
  const fasesDe = (d) => d.fases || {};
  const venceu = (d, id) => !!(fasesDe(d)[id] && fasesDe(d)[id].vitorias > 0);
  const maxTentativas = (d) => Math.max(0, ...Object.values(fasesDe(d)).map(f => f.tentativas || 0));
  const secretas = (d) => Object.values(fasesDe(d)).reduce((a, f) => a + (f.moedas || []).filter(Boolean).length, 0);
  const comTres = (d) => Object.values(fasesDe(d)).some(f => (f.moedas || []).filter(Boolean).length === 3);

  // ------------------------------------------------------- conquistas ----
  // teste(d) olha o save; moedas = recompensa; peca = peça de visual liberada.
  const CONQUISTAS = [
    { id: 'primeiraVitoria', moedas: 50, teste: (d) => d.stats.vitorias >= 1 },
    { id: 'correnteza', moedas: 80, teste: (d) => venceu(d, 'correnteza') },
    { id: 'prensa', moedas: 150, peca: 'cabeca.coroa', teste: (d) => venceu(d, 'prensa') },
    { id: 'raspoes100', moedas: 40, teste: (d) => d.stats.raspoes >= 100 },
    { id: 'raspoes1000', moedas: 150, peca: 'rastro.faiscas', teste: (d) => d.stats.raspoes >= 1000 },
    { id: 'combo5', moedas: 60, teste: (d) => d.stats.comboMax >= 5 },
    { id: 'quase', moedas: 30, teste: (d) => d.stats.mortes99 >= 1 },
    { id: 'persistente', moedas: 60, teste: (d) => maxTentativas(d) >= 50 },
    { id: 'moedaSecreta', moedas: 40, teste: (d) => secretas(d) >= 1 },
    { id: 'tresMoedas', moedas: 120, peca: 'acessorio.estrela', teste: (d) => comTres(d) },
    { id: 'criador', moedas: 30, teste: (d) => d.stats.fasesCriadas >= 1 },
    { id: 'verificador', moedas: 80, peca: 'cabeca.antena', teste: (d) => d.stats.fasesVerificadas >= 1 },
    { id: 'estilo', moedas: 40, teste: (d) => d.stats.pecasCompradas >= 1 },
    { id: 'colecionador', moedas: 120, peca: 'padrao.xadrez', teste: (d) => d.stats.pecasCompradas >= 8 },
    { id: 'maratona', moedas: 100, teste: (d) => d.stats.segundosJogados >= 1800 },
    { id: 'missoes10', moedas: 100, peca: 'rastro.arcoiris', teste: (d) => d.stats.missoesFeitas >= 10 },
  ];

  // ---------------------------------------------------------- missões ----
  // Cada missão: conta um tipo de evento (ev) até o alvo. As do dia são sorteadas pela data
  // (todo mundo tem as mesmas no mesmo dia, e recarregar não muda).
  const DIARIAS = [
    { id: 'raspoes', ev: 'raspao', alvos: [20, 40, 60], moedas: [30, 45, 60] },
    { id: 'tentativas', ev: 'tentativa', alvos: [15, 30], moedas: [25, 40] },
    { id: 'pct', ev: 'pct', alvos: [50, 70, 90], moedas: [30, 45, 70] },
    { id: 'vitoria', ev: 'vitoria', alvos: [1], moedas: [50] },
    { id: 'secreta', ev: 'secreta', alvos: [1], moedas: [50] },
    { id: 'minutos', ev: 'tempo', alvos: [5, 10], moedas: [30, 50] },
    { id: 'combo', ev: 'combo', alvos: [3, 4], moedas: [35, 55] },
  ];
  const SEMANAIS = [
    { id: 'raspoes', ev: 'raspao', alvos: [300], moedas: [250] },
    { id: 'tentativas', ev: 'tentativa', alvos: [150], moedas: [200] },
    { id: 'vitorias', ev: 'vitoria', alvos: [5], moedas: [300] },
    { id: 'minutos', ev: 'tempo', alvos: [60], moedas: [250] },
    { id: 'pctDificil', ev: 'pctDificil', alvos: [80], moedas: [300] },
  ];
  // missões em que o alvo é "chegar a X" (não somar)
  const MAXIMO = { pct: 1, pctDificil: 1, combo: 1 };

  const pad = (n) => String(n).padStart(2, '0');
  function diaDe(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  // semana começa na segunda (o id é a data da segunda)
  function semanaDe(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return diaDe(d.getTime()); }
  function fimDoDia(ms) { const d = new Date(ms); d.setHours(24, 0, 0, 0); return d.getTime(); }
  function fimDaSemana(ms) { const d = new Date(ms); d.setHours(24, 0, 0, 0); d.setDate(d.getDate() + (7 - ((d.getDay() + 6) % 7)) % 7); return d.getTime(); }

  // números "aleatórios" a partir de um texto (sempre os mesmos pro mesmo texto)
  function sorteador(txt) {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  }
  function sortear(pool, n, semente) {
    const r = sorteador(semente), l = pool.slice(), out = [];
    while (out.length < n && l.length) {
      const m = l.splice(Math.floor(r() * l.length), 1)[0];
      const k = Math.floor(r() * m.alvos.length);
      out.push({ id: m.id, alvo: m.alvos[k], moedas: m.moedas[k], prog: 0, pega: false });
    }
    return out;
  }

  // Garante que as missões são as de hoje/desta semana (troca sozinho na virada).
  function atualizarMissoes(d, agora) {
    const m = d.missoes;
    const dia = diaDe(agora), sem = semanaDe(agora);
    if (m.dia !== dia) { m.dia = dia; m.diarias = sortear(DIARIAS, E().missoesPorDia, 'd' + dia); }
    if (m.semana !== sem) { m.semana = sem; m.semanais = sortear(SEMANAIS, E().missoesPorSemana, 's' + sem); }
    return m;
  }
  const defDe = (lista, id) => lista.find(x => x.id === id);

  function ganhar(d, n) {
    n = Math.max(0, Math.round(n || 0));
    d.moedas += n; d.moedasTotal += n;
    return n;
  }

  // Confere conquistas novas: paga a recompensa e libera a peça. Devolve as novas.
  function conferirConquistas(d, agora) {
    const novas = [];
    for (const c of CONQUISTAS) {
      if (d.conquistas[c.id] || !c.teste(d)) continue;
      d.conquistas[c.id] = agora;
      ganhar(d, c.moedas);
      if (c.peca) d.pecas[c.peca] = true;
      novas.push(c);
    }
    return novas;
  }

  // Um acontecimento do jogo. ev = { tipo, n, pct, dificuldade }.
  // Atualiza estatísticas novas e missões; devolve { missoes: [completadas agora], conquistas: [novas] }.
  function registrar(d, ev, agora) {
    const m = atualizarMissoes(d, agora);
    const st = d.stats;
    const valores = {};                                  // quanto cada tipo de missão andou
    switch (ev.tipo) {
      case 'raspao': valores.raspao = ev.n || 1; break;
      case 'combo': st.comboMax = Math.max(st.comboMax, ev.n || 0); valores.combo = ev.n || 0; break;
      case 'tentativa': valores.tentativa = 1; break;
      case 'tempo': st.segundosJogados += ev.n || 0; valores.tempo = (ev.n || 0) / 60; break;
      case 'morte':
        if (ev.pct >= 99) st.mortes99++;
        valores.pct = ev.pct;
        if (['dificil', 'dificilimo', 'insano', 'demonio'].includes(ev.dificuldade)) valores.pctDificil = ev.pct;
        break;
      case 'vitoria':
        valores.vitoria = 1; valores.pct = 100;
        if (['dificil', 'dificilimo', 'insano', 'demonio'].includes(ev.dificuldade)) valores.pctDificil = 100;
        break;
      case 'secreta': valores.secreta = 1; break;
      case 'criou': st.fasesCriadas++; break;
      case 'verificou': st.fasesVerificadas++; break;
      case 'comprou': st.pecasCompradas++; break;
    }
    const feitas = [];
    for (const [lista, pool] of [[m.diarias, DIARIAS], [m.semanais, SEMANAIS]]) {
      for (const x of lista) {
        const def = defDe(pool, x.id);
        if (!def || x.prog >= x.alvo) continue;
        const v = valores[def.ev];
        if (v === undefined) continue;
        x.prog = Math.min(x.alvo, MAXIMO[def.ev] ? Math.max(x.prog, v) : x.prog + v);
        if (x.prog >= x.alvo) feitas.push(x);
      }
    }
    return { missoes: feitas, conquistas: conferirConquistas(d, agora) };
  }

  // Pega a recompensa de uma missão completa. tipo: 'diarias' | 'semanais'.
  function resgatar(d, tipo, i, agora) {
    const x = d.missoes[tipo] && d.missoes[tipo][i];
    if (!x || x.pega || x.prog < x.alvo) return 0;
    x.pega = true;
    d.stats.missoesFeitas++;
    const n = ganhar(d, x.moedas);
    conferirConquistas(d, agora);
    return n;
  }

  // ------------------------------------------------------------ moedas ---
  // Recompensas de uma tentativa (só fase oficial, sem debug).
  const doRecorde = (pctAntes, pct) => Math.max(0, pct - pctAntes) * E().porPct;
  const daVitoria = (primeira, dificuldade) => (primeira ? (E().vitoria[dificuldade] || 0) : E().vitoriaRepetida);

  // ------------------------------------------------------------- loja ----
  // peca = { preco, trava } (Avatar.PECAS). Devolve 'ok' | 'tem' | 'travada' | 'sem-moedas'.
  function comprar(d, id, peca) {
    if (d.pecas[id]) return 'tem';
    if (!peca || !peca.preco) return 'travada';
    if (d.moedas < peca.preco) return 'sem-moedas';
    d.moedas -= peca.preco;
    d.pecas[id] = true;
    return 'ok';
  }

  return { CONQUISTAS, DIARIAS, SEMANAIS, atualizarMissoes, registrar, resgatar, conferirConquistas, ganhar,
    doRecorde, daVitoria, comprar, diaDe, semanaDe, fimDoDia, fimDaSemana, secretas };
})();
