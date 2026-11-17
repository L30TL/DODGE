'use strict';
// =============================================================================
// DODGE — filtro.js
// Filtro de palavrão pra nomes (de fase agora; de jogador na Fase 3/4).
// Normaliza antes de comparar: maiúsculas, sem acento, leetspeak (P0RR4),
// letras repetidas (PORRRRA), letras separadas (P.U.T.A / P U T A).
// Compara palavra inteira ou começo de palavra (com exceções), pra não pegar
// palavras normais (COMPUTADOR, CUIDADO, TEMPORADA, SAPATARIA...).
// Sem DOM: roda no Node.
// =============================================================================

const Filtro = (() => {
  // palavra inteira
  const EXATAS = ['CU', 'CUS', 'PQP', 'FDP', 'VSF', 'VTNC', 'TNC', 'TMNC', 'KCT', 'KRL', 'CRL', 'PIKA', 'PICA', 'PUTA',
    'PUTO', 'PUTAS', 'PUTOS', 'VIADO', 'VIADOS', 'VEADO', 'BICHA', 'BICHAS', 'CORNO', 'CORNOS', 'CORNA', 'CORNUDO',
    'SAPATAO', 'SAPATONA', 'XOTA', 'BCT', 'FUCK', 'SHIT', 'DICK', 'COCK', 'CUNT', 'FAG', 'FAGS', 'NAZI', 'PORN', 'PORNO'];
  // começo de palavra
  const RAIZES = ['PORR', 'CARALH', 'CARAI', 'FOD', 'MERD', 'BOST', 'BUCET', 'BOCET', 'XOXOT', 'XEREC', 'PIROC', 'PUNHET',
    'BRONH', 'ARROMBAD', 'CUZ', 'VAGABUND', 'VADIA', 'PUTAR', 'PUTINH', 'PUTONA', 'VIADINH', 'BOIOL', 'TRAVEC',
    'RETARDAD', 'MONGOLOID', 'CRIOUL', 'NIGG', 'FAGGOT', 'WHOR', 'SLUT', 'BITCH', 'ASSHOL', 'FUCK', 'PEDOFIL',
    'ESTUPR', 'HITLER', 'NAZIST', 'CACET', 'PORNOGRAF'];
  // palavras normais que começam com uma raiz
  const EXCECOES = ['BOSTON', 'CUZCO', 'CARAIBA', 'CARAIBAS', 'FODDER', 'PORRETA'];
  // aparecem mesmo grudadas em outras (FILHADAPUTA, VAISEFODER)
  const FORTES = ['CARALHO', 'BUCETA', 'PUNHETA', 'FUCK', 'NIGGER', 'FILHADAPUTA', 'PUTAQUEPARIU', 'VAISEFODER',
    'VAITOMARNOCU', 'TOMARNOCU', 'ARROMBADO', 'ARROMBADA', 'FODASE', 'PORRA'];

  const LEET = { 0: 'O', 1: 'I', 3: 'E', 4: 'A', 5: 'S', 7: 'T', 8: 'B', '@': 'A', $: 'S', '!': 'I', '|': 'I' };
  // Letras repetidas: "PORRRRA" vira "PORRA" (3 ou mais → 2) e "MEEERDA" vira "MERDA" (2 ou mais → 1).
  // A segunda forma só é comparada com palavras da lista que não têm letra dobrada
  // (senão "PORRA" viraria "PORA" e pegaria PORTA, TEMPORADA...).
  const tres = (p) => p.replace(/(.)\1{2,}/g, '$1$1');
  const um = (p) => p.replace(/(.)\1+/g, '$1');
  const semDobro = (l) => l.filter(x => um(x) === x);
  const sEX = new Set(EXATAS), sEXum = new Set(semDobro(EXATAS)), sEXC = new Set(EXCECOES);
  const RAIZESum = semDobro(RAIZES), FORTESum = semDobro(FORTES);

  function normalizar(txt) {
    let s = String(txt == null ? '' : txt).toUpperCase();
    s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
    s = s.replace(/[0-9@$!|]/g, (c) => LEET[c] || ' ');
    s = s.replace(/[^A-Z]+/g, ' ').trim();
    return s.split(' ').filter(Boolean);
  }

  function ruim(p) {
    if (!p) return false;
    const a = tres(p), b = um(p);
    if (sEXC.has(a)) return false;
    if (sEX.has(a) || sEXum.has(b)) return true;
    return RAIZES.some(r => a.startsWith(r)) || RAIZESum.some(r => b.startsWith(r));
  }

  // true se o texto tem palavrão (em qualquer disfarce que o filtro conhece)
  function temPalavrao(txt) {
    const ps = normalizar(txt);
    if (ps.some(ruim)) return true;
    const junto = ps.join('');
    if (FORTES.some(f => tres(junto).includes(f)) || FORTESum.some(f => um(junto).includes(f))) return true;
    // letras soltas em sequência: "P U T A", "P.U.T.A"
    let seq = '';
    for (const p of ps.concat([''])) {
      if (p.length === 1) { seq += p; continue; }
      if (seq.length > 1 && ruim(seq)) return true;
      seq = '';
    }
    return false;
  }

  return { temPalavrao, normalizar };
})();
