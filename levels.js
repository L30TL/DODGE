'use strict';
// =============================================================================
// DODGE — levels.js
// As fases são DADOS, no mesmo formato que o editor (Fase 2) vai gerar:
//   { id, nome, autor, dificuldade, musica, bpm, duracaoBatidas, eventos: [{ batida, tipo, ...parametros }] }
//
// `batida` é quando o ataque fica PERIGOSO (bate com a música). O aviso aparece
// `aviso` batidas antes. Posições vão de -1 (esquerda/topo) a 1 (direita/baixo).
// Parâmetros de cada tipo: veja o topo de patterns.js.
// A vitória acontece em `duracaoBatidas` (o acorde final da música).
// =============================================================================

const Levels = (() => {
  const ESTRELAS = { facil: 1, normal: 2, dificil: 3, dificilimo: 4, insano: 5, demonio: 10 };

  // ------------------------------------------------------------------------
  // FASE 1 — DESPERTAR (Fácil). Ensina a se mover e apresenta a CHUVA.
  // Música: Despertar, 112 BPM. intro 0–16 · verso 16–48 · refrão 48–80 ·
  // ponte 80–88 · final 88–112 · fim 112
  // ------------------------------------------------------------------------
  const DESPERTAR = {
    id: 'despertar',
    nome: 'Despertar',
    autor: 'Dodge',
    dificuldade: 'facil',
    musica: 'despertar',
    bpm: 112,
    duracaoBatidas: 113,
    eventos: [
      // INTRO — 8 batidas sem nada: a alma flutua e a caixa pulsa na batida.
      // Primeira gota bem em cima da alma, devagar e com aviso longo: ensina a se mexer.
      { batida: 8, tipo: 'chuva', pos: 0, vel: 90, aviso: 2.5 },
      { batida: 11, tipo: 'chuva', pos: -0.15, vel: 90, aviso: 2 },
      { batida: 12, tipo: 'chuva', pos: 0.15, vel: 90, aviso: 2 },
      { batida: 14, tipo: 'chuva', pos: [-0.5, 0.5], vel: 90, aviso: 2 },
      // VERSO — sequências e várias gotas ao mesmo tempo
      { batida: 16, tipo: 'chuva', pos: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75], intervalo: 0.5, vel: 100, aviso: 2 },
      { batida: 20, tipo: 'chuva', pos: [0.75, 0.45, 0.15, -0.15, -0.45, -0.75], intervalo: 0.5, vel: 100, aviso: 2 },
      { batida: 24, tipo: 'chuva', pos: [-0.6, 0, 0.6], vel: 100, aviso: 2 },
      { batida: 26, tipo: 'chuva', pos: [-0.3, 0.3], vel: 100, aviso: 2 },
      { batida: 26, tipo: 'moeda', x: -0.88, y: -0.72, dur: 8, id: 0 },      // moeda 1: no canto, onde a chuva cai
      { batida: 28, tipo: 'chuva', pos: [-1, -0.75, -0.5], vel: 100, aviso: 2 },
      { batida: 30, tipo: 'chuva', pos: [0.5, 0.75, 1], vel: 100, aviso: 2 },
      // cortinas: o vão muda de lugar (dá pra se posicionar antes, lendo o aviso)
      { batida: 32, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 100, aviso: 2 },
      { batida: 34, tipo: 'chuva', pos: [-0.25, 0, 0.25, 0.5, 0.75, 1], vel: 100, aviso: 2 },
      { batida: 36, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 100, aviso: 2 },
      { batida: 38, tipo: 'chuva', pos: [-0.5, 0.5], vel: 100, aviso: 2 },
      { batida: 39, tipo: 'chuva', pos: 0, vel: 100, aviso: 2 },
      // respiro antes do refrão
      { batida: 41, tipo: 'chuva', pos: -0.7, vel: 90, aviso: 2 },
      { batida: 43, tipo: 'chuva', pos: 0.7, vel: 90, aviso: 2 },
      { batida: 44, tipo: 'chuva', pos: [-0.25, 0.25], vel: 100, aviso: 2 },
      { batida: 46, tipo: 'chuva', pos: [-0.9, -0.6, 0.6, 0.9], vel: 100, aviso: 2 },
      { batida: 47, tipo: 'chuva', pos: [-0.3, 0.3], vel: 100, aviso: 2 },
      // REFRÃO — mais rápido, vãos que andam
      { batida: 48, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 115, aviso: 1.5 },
      { batida: 50, tipo: 'chuva', pos: [-0.2, 0.2], vel: 115, aviso: 1.5 },   // passa entre as duas: RASPOU!
      { batida: 51, tipo: 'chuva', pos: [-0.7, 0.7], vel: 115, aviso: 1.5 },
      { batida: 52, tipo: 'chuva', pos: [-0.8, -0.4, 0, 0.4, 0.8], intervalo: 0.5, vel: 115, aviso: 1.5 },
      { batida: 55, tipo: 'chuva', pos: [-0.6, 0.6], vel: 115, aviso: 1.5 },
      { batida: 56, tipo: 'chuva', pos: [-0.25, 0, 0.25, 0.5, 0.75, 1], vel: 115, aviso: 1.5 },
      { batida: 58, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.25, 0.5, 0.75, 1], vel: 115, aviso: 1.5 },
      { batida: 60, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0.5, 0.75, 1], vel: 115, aviso: 1.5 },
      { batida: 62, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 115, aviso: 1.5 },
      { batida: 64, tipo: 'chuva', pos: [0.8, 0.4, 0, -0.4, -0.8], intervalo: 0.5, vel: 120, aviso: 1.5 },
      { batida: 67, tipo: 'chuva', pos: [-0.5, 0.5], vel: 120, aviso: 1.5 },
      { batida: 68, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 120, aviso: 1.5 },
      { batida: 69, tipo: 'chuva', pos: [-0.15, 0.15], vel: 120, aviso: 1.5 },
      { batida: 70, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 120, aviso: 1.5 },
      { batida: 71, tipo: 'moeda', x: 0.45, y: 0.78, dur: 6, id: 1 },        // moeda 2: embaixo, numa coluna de chuva
      { batida: 72, tipo: 'chuva', pos: [-0.9, -0.45, 0, 0.45, 0.9], vel: 120, aviso: 1.5 },
      { batida: 74, tipo: 'chuva', pos: [-0.675, -0.225, 0.225, 0.675], vel: 120, aviso: 1.5 },
      { batida: 76, tipo: 'chuva', pos: [-0.9, -0.45, 0, 0.45, 0.9], vel: 120, aviso: 1.5 },
      { batida: 78, tipo: 'chuva', pos: [-0.6, -0.3, 0, 0.3, 0.6], intervalo: 0.25, vel: 120, aviso: 1.5 },
      // PONTE — respiro
      { batida: 80, tipo: 'chuva', pos: -0.5, vel: 80, aviso: 2 },
      { batida: 82, tipo: 'chuva', pos: 0.5, vel: 80, aviso: 2 },
      { batida: 84, tipo: 'chuva', pos: [-0.2, 0.2], vel: 80, aviso: 2 },
      // FINAL — o trecho mais difícil (78% a 95%)
      { batida: 88, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 120, aviso: 1.5 },
      { batida: 89, tipo: 'chuva', pos: 0, vel: 120, aviso: 1.5 },
      { batida: 90, tipo: 'chuva', pos: [-0.25, 0, 0.25, 0.5, 0.75, 1], vel: 120, aviso: 1.5 },
      { batida: 92, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0.5, 0.75, 1], vel: 120, aviso: 1.5 },
      { batida: 94, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 120, aviso: 1.5 },
      { batida: 95, tipo: 'chuva', pos: 0.75, vel: 120, aviso: 1.5 },
      { batida: 95, tipo: 'moeda', x: 0.9, y: 0.75, dur: 5, id: 2 },         // moeda 3: canto de baixo, na varredura
      { batida: 96, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 125, aviso: 1.5 },
      { batida: 98, tipo: 'chuva', pos: [0.9, 0.6, 0.3, 0, -0.3, -0.6, -0.9], intervalo: 0.25, vel: 125, aviso: 1.5 },
      { batida: 100, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 125, aviso: 1.5 },
      { batida: 101, tipo: 'chuva', pos: [-0.15, 0.15], vel: 125, aviso: 1.5 },
      { batida: 102, tipo: 'chuva', pos: [-0.25, 0, 0.25, 0.5, 0.75, 1], vel: 125, aviso: 1.5 },
      { batida: 103, tipo: 'chuva', pos: -0.75, vel: 125, aviso: 1.5 },
      { batida: 104, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 125, aviso: 1.5 },
      { batida: 105, tipo: 'chuva', pos: 0.75, vel: 125, aviso: 1.5 },
      { batida: 106, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 125, aviso: 1.5 },
      // FIM — respira e vence no acorde final
      { batida: 108, tipo: 'chuva', pos: [-0.3, 0.3], vel: 100, aviso: 2 },
      { batida: 110, tipo: 'chuva', pos: 0, vel: 100, aviso: 2 },
    ],
  };

  // ------------------------------------------------------------------------
  // FASE 2 — CORRENTEZA (Normal). Apresenta o LASER.
  // Música: Correnteza, 128 BPM. intro 0–16 · verso 16–48 · pré 48–64 ·
  // refrão 64–96 · ponte 96–112 · final 112–152 · fim 152
  // ------------------------------------------------------------------------
  const CORRENTEZA = {
    id: 'correnteza',
    nome: 'Correnteza',
    autor: 'Dodge',
    dificuldade: 'normal',
    musica: 'correnteza',
    bpm: 128,
    duracaoBatidas: 153,
    eventos: [
      // INTRO — o LASER chega devagar: primeiro um só, bem em cima da alma.
      { batida: 8, tipo: 'laser', pos: 0, orient: 'v', aviso: 3 },
      { batida: 11, tipo: 'laser', pos: -0.4, orient: 'v', aviso: 2 },
      { batida: 12, tipo: 'laser', pos: 0.4, orient: 'v', aviso: 2 },
      { batida: 14, tipo: 'laser', pos: 0, orient: 'h', aviso: 2 },
      // VERSO — lasers no ritmo
      { batida: 16, tipo: 'laser', pos: -0.6, orient: 'v', aviso: 2 },
      { batida: 17, tipo: 'laser', pos: -0.2, orient: 'v', aviso: 2 },
      { batida: 18, tipo: 'laser', pos: 0.2, orient: 'v', aviso: 2 },
      { batida: 19, tipo: 'laser', pos: 0.6, orient: 'v', aviso: 2 },
      { batida: 20, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 2 },
      { batida: 22, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 2 },
      { batida: 24, tipo: 'laser', pos: 0, orient: 'v', aviso: 2, dur: 2 },
      { batida: 24, tipo: 'laser', pos: 0, orient: 'h', aviso: 2 },        // cruz: escolha um canto
      { batida: 26, tipo: 'laser', pos: [-0.66, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 28, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 2 },
      { batida: 30, tipo: 'laser', pos: [-0.5, 0, 0.5], orient: 'h', aviso: 2 },
      // ...misturado com a chuva, que você já conhece
      { batida: 32, tipo: 'chuva', pos: [-0.75, -0.25, 0.25, 0.75], vel: 120, aviso: 1.5 },
      { batida: 33, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5 },
      { batida: 34, tipo: 'chuva', pos: [-1, -0.5, 0, 0.5, 1], vel: 120, aviso: 1.5 },
      { batida: 35, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 36, tipo: 'laser', pos: -1, ate: -0.15, orient: 'v', aviso: 2, dur: 3 },   // varre a metade esquerda
      { batida: 40, tipo: 'laser', pos: 1, ate: 0.15, orient: 'v', aviso: 2, dur: 3 },     // varre a metade direita
      { batida: 44, tipo: 'chuva', pos: [-0.6, -0.2, 0.2, 0.6], intervalo: 0.5, vel: 120, aviso: 1.5 },
      { batida: 46, tipo: 'laser', pos: [-0.33, 0.33], orient: 'v', aviso: 1.5 },
      { batida: 47, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },
      // PRÉ-REFRÃO — a tensão sobe
      { batida: 48, tipo: 'laser', pos: -0.75, orient: 'v', aviso: 1.5 },
      { batida: 49, tipo: 'laser', pos: 0.75, orient: 'v', aviso: 1.5 },
      { batida: 50, tipo: 'laser', pos: -0.6, orient: 'h', aviso: 1.5 },
      { batida: 51, tipo: 'laser', pos: 0.6, orient: 'h', aviso: 1.5 },
      { batida: 52, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 125, aviso: 1.5 },
      { batida: 53, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },
      { batida: 54, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 125, aviso: 1.5 },
      { batida: 55, tipo: 'laser', pos: 0.7, orient: 'v', aviso: 1.5 },
      { batida: 56, tipo: 'laser', pos: [-0.8, -0.4, 0, 0.4, 0.8], orient: 'v', aviso: 2 },
      { batida: 58, tipo: 'laser', pos: [-0.66, 0, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 60, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 130, aviso: 1.5 },
      { batida: 62, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 1.5 },
      { batida: 62, tipo: 'moeda', x: -0.08, y: -0.75, dur: 5, id: 0 },      // moeda 1: colada na cruz que vem aí
      { batida: 63, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1 },
      // REFRÃO
      { batida: 64, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5, dur: 2 },
      { batida: 64, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5, dur: 2 },
      { batida: 66, tipo: 'chuva', pos: [-0.75, -0.25, 0.25, 0.75], vel: 130, aviso: 1.5 },
      { batida: 67, tipo: 'chuva', pos: [-1, -0.5, 0, 0.5, 1], vel: 130, aviso: 1.5 },
      { batida: 68, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 69, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 70, tipo: 'laser', pos: -1, ate: 0, orient: 'h', aviso: 1.5, dur: 2 },     // varre de cima até o meio
      { batida: 72, tipo: 'laser', pos: 1, ate: 0, orient: 'h', aviso: 1.5, dur: 2 },      // e de baixo até o meio
      { batida: 74, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 130, aviso: 1.5 },
      { batida: 75, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5 },
      { batida: 76, tipo: 'laser', pos: [-0.66, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 77, tipo: 'laser', pos: [-0.66, 0.66], orient: 'v', aviso: 1.5 },
      { batida: 78, tipo: 'chuva', pos: [-0.8, -0.4, 0, 0.4, 0.8], intervalo: 0.5, vel: 130, aviso: 1.5 },
      { batida: 80, tipo: 'laser', pos: [-0.8, -0.4, 0, 0.4, 0.8], orient: 'v', aviso: 1.5 },
      { batida: 81, tipo: 'laser', pos: [-0.6, 0, 0.6], orient: 'h', aviso: 1.5 },
      { batida: 82, tipo: 'chuva', pos: [-0.25, 0, 0.25, 0.5, 0.75, 1], vel: 135, aviso: 1.5 },
      { batida: 84, tipo: 'chuva', pos: [-1, -0.75, -0.5, -0.25, 0, 0.25], vel: 135, aviso: 1.5 },
      { batida: 85, tipo: 'laser', pos: 0.7, orient: 'v', aviso: 1.5 },
      { batida: 86, tipo: 'laser', pos: -0.2, ate: -1, orient: 'v', aviso: 1.5, dur: 2 },
      { batida: 88, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5, dur: 2 },
      { batida: 88, tipo: 'chuva', pos: [-0.75, -0.25, 0.25, 0.75], intervalo: 0.5, vel: 120, aviso: 1.5 },
      { batida: 91, tipo: 'laser', pos: [-0.75, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 92, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5 },
      { batida: 92, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },
      { batida: 94, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 130, aviso: 1.5 },
      // PONTE — varreduras lentas, respiro
      { batida: 96, tipo: 'laser', pos: -1, ate: -0.3, orient: 'v', aviso: 2, dur: 4 },
      { batida: 100, tipo: 'laser', pos: 1, ate: 0.3, orient: 'v', aviso: 2, dur: 4 },
      { batida: 100, tipo: 'moeda', x: 0, y: -0.9, dur: 4.5, id: 1 },         // moeda 2: lá em cima, antes da varredura
      { batida: 104, tipo: 'laser', pos: -1, ate: -0.2, orient: 'h', aviso: 2, dur: 3 },
      { batida: 108, tipo: 'laser', pos: 1, ate: 0.2, orient: 'h', aviso: 2, dur: 3 },
      // FINAL — o trecho mais difícil (73% a 95%)
      { batida: 112, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 113, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 114, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 140, aviso: 1.5 },
      { batida: 115, tipo: 'laser', pos: 0, orient: 'v', aviso: 1 },
      { batida: 116, tipo: 'laser', pos: [-0.66, 0, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 117, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 1.5 },
      { batida: 118, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 140, aviso: 1.5 },
      { batida: 120, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5, dur: 4 },     // muro de laser no meio
      { batida: 120, tipo: 'chuva', pos: [-0.8, -0.45], vel: 130, aviso: 1.5 },
      { batida: 121, tipo: 'chuva', pos: [0.45, 0.8], vel: 130, aviso: 1.5 },
      { batida: 122, tipo: 'chuva', pos: [-0.6, -0.25], vel: 130, aviso: 1.5 },
      { batida: 123, tipo: 'chuva', pos: [0.25, 0.6], vel: 130, aviso: 1.5 },
      { batida: 124, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5, dur: 2 },
      { batida: 124, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 1.5, dur: 2 },   // jogo da velha
      { batida: 126, tipo: 'chuva', pos: [-0.75, -0.25, 0.25, 0.75], vel: 140, aviso: 1.5 },
      { batida: 127, tipo: 'chuva', pos: [-1, -0.5, 0, 0.5, 1], vel: 140, aviso: 1.5 },
      { batida: 128, tipo: 'laser', pos: -1, ate: 0.25, orient: 'v', aviso: 1.5, dur: 4 },
      { batida: 128, tipo: 'chuva', pos: [0.4, 0.7, 1], vel: 130, aviso: 1.5 },
      { batida: 130, tipo: 'chuva', pos: [0.5, 0.85], vel: 130, aviso: 1.5 },
      { batida: 132, tipo: 'laser', pos: 1, ate: -0.25, orient: 'v', aviso: 1.5, dur: 4 },
      { batida: 133, tipo: 'chuva', pos: [-1, -0.7], vel: 130, aviso: 1.5 },
      { batida: 135, tipo: 'chuva', pos: [-0.85, -0.5], vel: 130, aviso: 1.5 },
      { batida: 136, tipo: 'laser', pos: [-0.8, -0.4, 0, 0.4, 0.8], orient: 'v', aviso: 1.5 },
      { batida: 137, tipo: 'laser', pos: [-0.6, 0, 0.6], orient: 'h', aviso: 1.5 },
      { batida: 138, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 145, aviso: 1.5 },
      { batida: 139, tipo: 'chuva', pos: [-0.15, 0.15], vel: 145, aviso: 1 },
      { batida: 140, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5, dur: 2 },
      { batida: 140, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 140, aviso: 1.5 },
      { batida: 140, tipo: 'moeda', x: 0.9, y: 0.85, dur: 5, id: 2 },         // moeda 3: canto, no meio do clímax
      { batida: 142, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 143, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 144, tipo: 'laser', pos: 0, orient: 'v', aviso: 1.5 },
      { batida: 144, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },
      { batida: 145, tipo: 'laser', pos: [-0.66, 0.66], orient: 'v', aviso: 1 },
      { batida: 145, tipo: 'laser', pos: [-0.66, 0.66], orient: 'h', aviso: 1 },
      // FIM — respiro
      { batida: 148, tipo: 'chuva', pos: [-0.5, 0.5], vel: 110, aviso: 2 },
      { batida: 150, tipo: 'laser', pos: 0, orient: 'v', aviso: 2 },
    ],
  };

  // ------------------------------------------------------------------------
  // FASE 3 — PRENSA (Difícil). Apresenta as PAREDES.
  // Música: Prensa, 140 BPM. intro 0–16 · verso 16–48 · refrão 48–80 ·
  // quebra 80–96 · verso2 96–128 · sobe 128–140 · final 140–188 · fim 188
  // ------------------------------------------------------------------------
  const PRENSA = {
    id: 'prensa',
    nome: 'Prensa',
    autor: 'Dodge',
    dificuldade: 'dificil',
    musica: 'prensa',
    bpm: 140,
    duracaoBatidas: 189,
    eventos: [
      // INTRO — as PAREDES chegam: a primeira deixa um corredor largo bem onde a alma está.
      { batida: 8, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 70, aviso: 3, fechar: 1.5, segurar: 2, abrir: 1 },
      { batida: 13, tipo: 'paredes', eixo: 'v', centro: 0, espaco: 60, aviso: 2, fechar: 1, segurar: 1, abrir: 1 },
      // VERSO — corredores que mudam de lugar e muros com vão
      { batida: 16, tipo: 'paredes', eixo: 'h', centro: -0.5, espaco: 60, aviso: 2, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 20, tipo: 'paredes', eixo: 'h', centro: 0.5, espaco: 60, aviso: 2, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 24, tipo: 'paredes', modo: 'buraco', de: 'esquerda', centro: 0, espaco: 50, vel: 110, aviso: 2 },
      { batida: 26, tipo: 'paredes', modo: 'buraco', de: 'direita', centro: 0.5, espaco: 50, vel: 110, aviso: 2 },
      { batida: 33, tipo: 'paredes', eixo: 'v', centro: -0.4, espaco: 56, aviso: 2, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 37, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 56, aviso: 2, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 38, tipo: 'chuva', pos: -0.1, vel: 120, aviso: 1.5 },        // gotas dentro do corredor
      { batida: 39, tipo: 'chuva', pos: 0.1, vel: 120, aviso: 1.5 },
      { batida: 42, tipo: 'paredes', eixo: 'h', centro: 0.6, espaco: 52, aviso: 2, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 44, tipo: 'chuva', pos: [-0.8, -0.4, 0, 0.4, 0.8], intervalo: 0.5, vel: 130, aviso: 1.5 },
      { batida: 46, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },
      // REFRÃO 1
      { batida: 48, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 50, aviso: 2, fechar: 1, segurar: 3, abrir: 1 },
      { batida: 49, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5 },        // laser cortando o corredor
      { batida: 50, tipo: 'chuva', pos: [-0.08, 0.08], intervalo: 1, vel: 140, aviso: 1.5 },
      { batida: 53, tipo: 'paredes', modo: 'buraco', de: 'cima', centro: -0.5, espaco: 50, vel: 120, aviso: 1.5 },
      { batida: 56, tipo: 'paredes', modo: 'buraco', de: 'cima', centro: 0.5, espaco: 50, vel: 120, aviso: 1.5 },
      { batida: 60, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 60, tipo: 'paredes', eixo: 'v', centro: 0.4, espaco: 52, aviso: 1.5, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 61.75, tipo: 'chuva', pos: 0.4, de: 'esquerda', vel: 160, aviso: 1.5 },
      { batida: 62, tipo: 'moeda', x: -0.65, y: -0.85, dur: 4, id: 0 },      // moeda 1: no primeiro degrau da escada
      { batida: 62.75, tipo: 'chuva', pos: 0.4, de: 'direita', vel: 160, aviso: 1.5 },
      // escada: o corredor anda pra direita a cada 2 batidas
      { batida: 64, tipo: 'paredes', eixo: 'h', centro: -0.5, espaco: 56, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 66, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 56, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 68, tipo: 'paredes', eixo: 'h', centro: 0.5, espaco: 56, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 70, tipo: 'laser', pos: [-0.66, 0, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 71, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 1.5 },
      { batida: 72, tipo: 'paredes', modo: 'buraco', de: 'esquerda', centro: [0.45, -0.45, 0.45], espaco: 52, vel: 150, intervalo: 2, aviso: 1.5 },
      { batida: 78, tipo: 'chuva', pos: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], intervalo: 0.25, vel: 150, aviso: 1.5 },
      // QUEBRA — respiro
      { batida: 80, tipo: 'paredes', modo: 'buraco', de: 'direita', centro: 0, espaco: 60, vel: 80, aviso: 2 },
      { batida: 83, tipo: 'moeda', x: 0.85, y: -0.85, dur: 4, id: 1 },        // moeda 2: no canto que a prensa vai fechar
      { batida: 86, tipo: 'paredes', eixo: 'v', centro: 0, espaco: 70, aviso: 2, fechar: 2, segurar: 2, abrir: 2 },
      { batida: 92, tipo: 'laser', pos: -1, ate: -0.3, orient: 'v', aviso: 2, dur: 3 },
      // VERSO 2
      { batida: 96, tipo: 'paredes', eixo: 'h', centro: 0.5, espaco: 54, aviso: 1.5, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 97, tipo: 'chuva', pos: 0.5, vel: 140, aviso: 1.5 },
      { batida: 100, tipo: 'paredes', eixo: 'h', centro: -0.5, espaco: 54, aviso: 1.5, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 101, tipo: 'chuva', pos: -0.5, vel: 140, aviso: 1.5 },
      { batida: 104, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 105, tipo: 'laser', pos: [-0.5, 0, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 106, tipo: 'paredes', modo: 'buraco', de: 'baixo', centro: [-0.6, 0, 0.6], espaco: 48, vel: 140, intervalo: 1.5, aviso: 1.5 },
      { batida: 112, tipo: 'paredes', eixo: 'v', centro: -0.5, espaco: 50, aviso: 1.5, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 113, tipo: 'laser', pos: [-0.6, 0, 0.6], orient: 'v', aviso: 1.5 },
      { batida: 116, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 50, aviso: 1.5, fechar: 1, segurar: 3, abrir: 1 },
      { batida: 117, tipo: 'chuva', pos: -0.05, vel: 150, aviso: 1.5 },
      { batida: 118, tipo: 'laser', pos: [-0.4, 0.4], orient: 'h', aviso: 1.5 },
      { batida: 119, tipo: 'chuva', pos: 0.05, vel: 150, aviso: 1.5 },
      { batida: 121, tipo: 'paredes', modo: 'buraco', de: 'esquerda', centro: [-0.5, 0.5], espaco: 50, vel: 150, intervalo: 2, aviso: 1.5 },
      { batida: 124, tipo: 'chuva', pos: [-0.8, -0.4, 0, 0.4, 0.8], intervalo: 0.5, vel: 150, aviso: 1.5 },
      // SOBE — lasers rápidos
      { batida: 128, tipo: 'laser', pos: -0.75, orient: 'v', aviso: 1 },
      { batida: 129, tipo: 'laser', pos: 0.75, orient: 'v', aviso: 1 },
      { batida: 130, tipo: 'laser', pos: -0.25, orient: 'v', aviso: 1 },
      { batida: 131, tipo: 'laser', pos: 0.25, orient: 'v', aviso: 1 },
      { batida: 132, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1 },
      { batida: 133, tipo: 'laser', pos: 0, orient: 'h', aviso: 1 },
      { batida: 134, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 60, aviso: 1.5, fechar: 2, segurar: 2, abrir: 1 },
      { batida: 136, tipo: 'chuva', pos: [-0.1, 0.1], intervalo: 0.5, vel: 160, aviso: 1 },
      { batida: 137.5, tipo: 'chuva', pos: [-0.1, 0.1], intervalo: 0.5, vel: 160, aviso: 1 },
      // FINAL — o trecho mais difícil (74% a 95%)
      { batida: 140, tipo: 'paredes', eixo: 'h', centro: -0.5, espaco: 52, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 140, tipo: 'laser', pos: 0, orient: 'h', aviso: 1.5, dur: 2 },
      { batida: 142, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 52, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 144, tipo: 'paredes', eixo: 'h', centro: 0.5, espaco: 52, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 144, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      { batida: 146, tipo: 'paredes', modo: 'buraco', de: 'cima', centro: [0.6, -0.2, 0.4, -0.4], espaco: 46, vel: 160, intervalo: 1.5, aviso: 1.5 },
      { batida: 153, tipo: 'laser', pos: [-0.8, -0.4, 0, 0.4, 0.8], orient: 'v', aviso: 1.5 },
      { batida: 154, tipo: 'laser', pos: [-0.66, 0, 0.66], orient: 'h', aviso: 1.5 },
      { batida: 155, tipo: 'chuva', pos: [-1, -0.75, -0.5, 0.5, 0.75, 1], vel: 160, aviso: 1.5 },
      { batida: 156, tipo: 'paredes', eixo: 'v', centro: 0, espaco: 50, aviso: 1.5, fechar: 1, segurar: 3, abrir: 1 },
      { batida: 158, tipo: 'chuva', pos: 0, de: 'esquerda', vel: 170, aviso: 1.5 },
      { batida: 159, tipo: 'chuva', pos: 0, de: 'direita', vel: 170, aviso: 1.5 },
      { batida: 160, tipo: 'laser', pos: [-0.5, 0.5], orient: 'v', aviso: 1.5 },
      { batida: 162, tipo: 'paredes', eixo: 'h', centro: 0.6, espaco: 50, aviso: 1.5, fechar: 1, segurar: 2, abrir: 1 },
      { batida: 163, tipo: 'chuva', pos: 0.6, vel: 160, aviso: 1.5 },
      { batida: 167, tipo: 'paredes', eixo: 'h', centro: -0.6, espaco: 50, aviso: 1.5, fechar: 1, segurar: 1, abrir: 1 },
      { batida: 168, tipo: 'chuva', pos: -0.6, vel: 160, aviso: 1 },
      { batida: 168, tipo: 'moeda', x: 0.45, y: 0.6, dur: 3.5, id: 2 },       // moeda 3: onde os lasers vão se fechar
      { batida: 170, tipo: 'laser', pos: -1, ate: 0, orient: 'v', aviso: 1.5, dur: 2 },
      { batida: 170, tipo: 'laser', pos: 1, ate: 0.35, orient: 'v', aviso: 1.5, dur: 2 },  // sobra um vão estreito
      { batida: 172, tipo: 'chuva', pos: [0.1, 0.25], intervalo: 0.5, vel: 160, aviso: 1 },
      { batida: 174, tipo: 'paredes', modo: 'buraco', de: 'esquerda', centro: [0.5, -0.5, 0.5, -0.5], espaco: 48, vel: 170, intervalo: 1.5, aviso: 1.5 },
      { batida: 180, tipo: 'laser', pos: [-0.75, -0.25, 0.25, 0.75], orient: 'v', aviso: 1.5 },
      { batida: 181, tipo: 'laser', pos: [-0.5, 0.5], orient: 'h', aviso: 1.5 },
      // FIM — respiro
      { batida: 184, tipo: 'paredes', eixo: 'h', centro: 0, espaco: 80, aviso: 2, fechar: 1, segurar: 2, abrir: 1 },
    ],
  };

  // ------------------------------------------------------------------------
  // LABORATÓRIO (só no debug): todos os 7 padrões em sequência, pra testar.
  // ------------------------------------------------------------------------
  const LABORATORIO = {
    id: 'laboratorio',
    nome: 'Laboratório',
    autor: 'Dodge',
    dificuldade: 'normal',
    musica: 'correnteza',
    bpm: 128,
    duracaoBatidas: 153,
    debug: true,
    eventos: [
      { batida: 8, tipo: 'chuva', pos: [-0.6, -0.2, 0.2, 0.6], intervalo: 1, aviso: 2 },
      { batida: 14, tipo: 'chuva', pos: [-0.5, 0.5], de: 'esquerda', aviso: 2 },
      { batida: 20, tipo: 'laser', pos: 0, orient: 'v', aviso: 2, dur: 1 },
      { batida: 24, tipo: 'laser', pos: -0.5, orient: 'h', aviso: 2, dur: 1 },
      { batida: 28, tipo: 'laser', pos: -0.8, ate: 0.8, orient: 'v', aviso: 2, dur: 4 },
      { batida: 28, tipo: 'laser', pos: 0, orient: 30, aviso: 2, dur: 1 },
      { batida: 36, tipo: 'paredes', eixo: 'h', centro: 0.3, espaco: 50, aviso: 2 },
      { batida: 42, tipo: 'paredes', eixo: 'v', centro: -0.2, espaco: 50, aviso: 2 },
      { batida: 48, tipo: 'paredes', modo: 'buraco', de: 'esquerda', centro: [0.4, -0.4], espaco: 46, vel: 110, intervalo: 2, aviso: 2 },
      { batida: 56, tipo: 'espiral', x: 0, y: -0.3, bracos: 3, giro: 25, dur: 6, cadencia: 2, vel: 90, aviso: 2 },
      { batida: 66, tipo: 'fogo', pos: [-0.6, -0.2, 0.2, 0.6], eixo: 'h', intervalo: 0.5, vel: 140, aviso: 2 },
      { batida: 72, tipo: 'teleguiada', de: 'cima', pos: [-0.5, 0, 0.5], quantidade: 3, intervalo: 1, vel: 150, aviso: 1.5 },
      { batida: 78, tipo: 'teleguiada', de: 'direita', quantidade: 2, intervalo: 2, vel: 110, guia: 60, aviso: 1.5 },
      { batida: 86, tipo: 'anel', x: 0, y: 0, quantidade: 12, vel: 100, aviso: 2 },
      { batida: 92, tipo: 'anel', x: -0.5, y: -0.4, quantidade: 10, vel: 110, giro: 18, aviso: 2 },
      { batida: 92, tipo: 'anel', x: 0.5, y: 0.4, quantidade: 10, vel: 110, aviso: 2 },
      { batida: 100, tipo: 'moeda', x: 0.8, y: -0.7, dur: 6, id: 0 },
      // modificadores da caixa
      { batida: 104, tipo: 'caixa', largura: 0.6, altura: 0.7, dur: 2, aviso: 2 },
      { batida: 108, tipo: 'chuva', pos: [-0.3, 0, 0.3], intervalo: 1, aviso: 2 },
      { batida: 112, tipo: 'girar', angulo: 20, dur: 4, aviso: 2 },
      { batida: 116, tipo: 'inverter', x: true, aviso: 2 },
      { batida: 118, tipo: 'fogo', pos: [-0.3, 0.3], eixo: 'h', intervalo: 1, vel: 120, aviso: 2 },
      { batida: 122, tipo: 'inverter', x: false, aviso: 1 },
      { batida: 124, tipo: 'escuro', nivel: 0.92, dur: 2, aviso: 2 },
      { batida: 127, tipo: 'chuva', pos: [-0.4, 0, 0.4], de: 'cima', intervalo: 1, aviso: 2 },
      { batida: 132, tipo: 'escuro', nivel: 0, dur: 2 },
      { batida: 134, tipo: 'espelho', eixo: 'x', aviso: 2 },
      { batida: 138, tipo: 'laser', pos: 0.5, orient: 'v', larg: 16, aviso: 2, dur: 1 },
      { batida: 142, tipo: 'espelho', ativo: false, aviso: 1 },
      { batida: 144, tipo: 'girar', angulo: 0, dur: 2, aviso: 1 },
      { batida: 144, tipo: 'caixa', largura: 1, altura: 1, dur: 2, aviso: 1 },
    ],
  };

  const FASES = [DESPERTAR, CORRENTEZA, PRENSA];

  return {
    FASES,
    LABORATORIO,
    estrelasDe(dif) { return ESTRELAS[dif] || 0; },
    porId(id) { return FASES.find(f => f.id === id) || (id === LABORATORIO.id ? LABORATORIO : null); },
    proxima(id) { const i = FASES.findIndex(f => f.id === id); return i >= 0 && i + 1 < FASES.length ? FASES[i + 1] : null; },
    indice(id) { return FASES.findIndex(f => f.id === id); },
  };
})();
