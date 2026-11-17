'use strict';
// =============================================================================
// DODGE — infinito.js
// PURO: gerador do MODO INFINITO. A música toca em loop; cada volta dela é um
// "segmento" gerado na hora, um pouco mais difícil que o anterior. Nada cruza a
// virada da música (o segmento seguinte começa limpo), então trocar de segmento
// é só recompilar e continuar de onde a alma está.
// Mesma semente + mesmo segmento = mesmos ataques (dá pra testar no solver).
// =============================================================================

const Infinito = (() => {
  const I = () => CONFIG.infinito;

  function sorteador(semente) {
    let s = (semente >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // nível de 0 a 1 no segmento k (0, 1, 2, ...)
  const nivelDe = (k) => Math.min(1, I().nivelInicial + k * I().nivelPorVolta);

  // Um evento de cada tipo, sempre com saída (posições espaçadas, corredor largo, aviso de 2 batidas).
  function evento(tipo, b, r, nv) {
    const entre = (a, z) => a + (z - a) * r();
    const lado = () => ['cima', 'baixo', 'esquerda', 'direita'][Math.floor(r() * 4)];
    const vel = Math.round(90 + 70 * nv);
    const arr = (v) => Math.round(v * 100) / 100;
    switch (tipo) {
      case 'chuva': {
        const n = 2 + Math.floor(r() * (1 + 2 * nv)), pos = [];
        const ini = entre(-0.8, Math.max(-0.8, 0.8 - 0.4 * (n - 1)));
        for (let i = 0; i < n; i++) pos.push(arr(Math.max(-0.9, Math.min(0.9, ini + i * 0.4))));
        return { batida: b, tipo, pos, de: lado(), vel, intervalo: r() < 0.5 ? 0.5 : 1, aviso: 2 };
      }
      case 'laser':
        return { batida: b, tipo, pos: arr(entre(-0.7, 0.7)), orient: r() < 0.5 ? 'v' : 'h', dur: 1, aviso: 2 };
      case 'paredes':
        return { batida: b, tipo, eixo: r() < 0.5 ? 'h' : 'v', centro: arr(entre(-0.5, 0.5)), espaco: Math.round(64 - 18 * nv),
          fechar: 1, segurar: 1 + Math.round(r()), abrir: 1, aviso: 2 };
      case 'fogo':
        return { batida: b, tipo, pos: [arr(entre(-0.7, -0.2)), arr(entre(0.2, 0.7))], eixo: r() < 0.5 ? 'h' : 'v', vel, intervalo: 1, aviso: 2 };
      case 'espiral':
        return { batida: b, tipo, x: arr(entre(-0.5, 0.5)), y: arr(entre(-0.5, 0.5)), bracos: 3, giro: Math.round(entre(15, 35)), dur: 3,
          cadencia: 1.5, vel: Math.round(80 + 30 * nv), aviso: 2 };
      case 'teleguiada':
        return { batida: b, tipo, de: lado(), pos: arr(entre(-0.6, 0.6)), quantidade: 2 + Math.floor(r() * 2), intervalo: 1.5, vel: 110, aviso: 2 };
      case 'anel':
        return { batida: b, tipo, x: arr(entre(-0.5, 0.5)), y: arr(entre(-0.5, 0.5)), quantidade: 10 + Math.floor(r() * 4), vel: Math.round(85 + 25 * nv), aviso: 2 };
    }
    return null;
  }

  // Quanto o evento ocupa (batidas) antes de o próximo poder começar.
  function ocupa(ev) {
    switch (ev.tipo) {
      case 'paredes': return ev.fechar + ev.segurar + ev.abrir;
      case 'espiral': return ev.dur + 1;
      case 'teleguiada': return (ev.quantidade - 1) * ev.intervalo + 1;
      case 'chuva': return (ev.pos.length - 1) * ev.intervalo + 1;
      default: return 1;
    }
  }

  // Segmento k da partida com essa semente. info = { bpm, batidas } da música.
  function segmento(semente, k, info) {
    const r = sorteador(Math.imul(semente + 1, 2654435761) ^ Math.imul(k + 1, 40503));
    const nv = nivelDe(k);
    const eventos = [];
    const fim = info.batidas - I().folgaFim;                     // nada cruza a virada da música
    let b = k === 0 ? I().calmaInicio : 2;
    while (Math.ceil(b) < fim) {
      b = Math.ceil(b);                                          // ataque sempre numa batida cheia (no ritmo)
      const pool = ['chuva', 'laser'];
      if (nv >= 0.3) pool.push('paredes', 'fogo');
      if (nv >= 0.5) pool.push('espiral', 'teleguiada', 'anel');
      const ev = evento(pool[Math.floor(r() * pool.length)], b, r, nv);
      eventos.push(ev);
      b += ocupa(ev) + Math.max(I().respiroMin, Math.round((I().respiroMax - (I().respiroMax - I().respiroMin) * nv) * 2) / 2);
    }
    return { id: 'infinito', nome: '', autor: '', dificuldade: 'normal', musica: I().musica, bpm: info.bpm,
      duracaoBatidas: info.batidas, eventos, infinito: true, segmento: k };
  }

  return { segmento, nivelDe, sorteador };
})();
