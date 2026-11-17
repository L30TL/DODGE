'use strict';
// =============================================================================
// DODGE — config.js
// Todos os números de ajuste do jogo ficam aqui. Mexa à vontade: cada valor
// está comentado. Unidades:
//   px  = pixel lógico (a tela tem 480×270 pixels lógicos, ampliados no navegador)
//   s   = segundos      ms = milissegundos
//   batida = uma batida da música (depende do BPM de cada fase)
// =============================================================================

const CONFIG = {
  // ---------------------------------------------------------------- tela -----
  tela: {
    largura: 480,           // px — resolução lógica (16:9). A arte é feita nessa grade.
    altura: 270,            // px
    escalaInteiraMin: 3,    // se couber pelo menos 3× na tela, usa escala inteira (pixels perfeitos)
  },

  // --------------------------------------------------------------- caixa -----
  caixa: {
    largura: 288,           // px — área onde a alma se move
    altura: 184,            // px
    centroY: 150,           // px — centro vertical da caixa na tela (o centro X é o meio da tela)
    borda: 2,               // px — espessura da borda branca
    pulsoBatida: 2,         // px — quanto a borda "cresce" em cada batida
    pulsoCompasso: 4,       // px — pulso mais forte no primeiro tempo de cada compasso
    pulsoDecaimento: 10,    // quão rápido o pulso volta ao normal (maior = mais rápido)
  },

  // ---------------------------------------------------------------- alma -----
  alma: {
    velocidade: 165,        // px/s — velocidade no teclado
    raioHitbox: 2.5,        // px — raio da área que morre. Bem menor que o desenho (11 px)!
    raioRaspao: 9,          // px — passar a menos disso de um ataque conta como "RASPOU!"
    tamanhoSprite: 11,      // px — tamanho do desenho da alma no jogo
    margemParede: 5,        // px — distância mínima entre o centro da alma e a borda da caixa
    rastro: 6,              // quantas "sombras" o rastro da alma deixa
  },

  // ------------------------------------------------------- toque (celular) ---
  toque: {
    sensibilidadePadrao: 1.25, // 1 = a alma anda a mesma distância que o dedo na tela
    velocidadeMax: 560,     // px/s — limite pra alma não "teleportar" com um puxão rápido
    bufferMax: 24,          // px — movimento acumulado máximo (evita sensação de atraso)
  },

  // ------------------------------------------------------------ ataques ------
  ataques: {
    avisoMinimoS: 0.3,      // s — nenhum aviso (até Insane) é menor que isso, mesmo se a fase pedir
    avisoMinimoBatidas: 1,  // batidas — e também nunca menos que 1 batida (Demons podem ignorar)
    avisoPadraoBatidas: 1.5,// batidas de aviso quando a fase não especifica
    piscadasPorBatida: 2,   // o aviso pisca nesse ritmo (2 = a cada meia batida)
    folgaHitbox: 1,         // px — a hitbox dos ataques é esse tanto menor que o desenho
    tamanhoBala: 8,         // px — diâmetro padrão das balas
    velocidadeBala: 120,    // px/s — velocidade padrão das balas
    larguraLaser: 12,       // px — espessura padrão do laser
    duracaoLaser: 1,        // batidas que o laser fica ligado, se a fase não disser
    sumicoLaser: 0.12,      // s — animação do laser apagando (já não mata)
    poolTamanho: 768,       // quantos projéteis podem existir ao mesmo tempo
  },

  // ------------------------------------------------------------- raspão ------
  raspao: {
    janelaCombo: 0.6,       // s — raspões dentro dessa janela somam combo (o som sobe de tom)
    textoDuracao: 0.6,      // s — quanto tempo o "RASPOU!" fica na tela
  },

  // -------------------------------------------------------------- moedas -----
  moedas: {
    raioColeta: 9,          // px — distância pra pegar uma moeda secreta
  },

  // --------------------------------------------------------------- morte -----
  morte: {
    atrasoReinicio: 0.4,         // s — depois de morrer, a próxima tentativa começa sozinha nesse tempo
    atrasoReinicioRecorde: 0.85, // s — um pouco mais quando bate recorde, pra curtir
    toquePulaApos: 0.12,         // s — depois disso, tocar/apertar reinicia na hora
    congelar: 0.05,              // s — "hit-stop": o jogo congela um instante na morte
    particulas: 1,               // multiplicador de partículas da explosão
    textoDuracao: 1.3,           // s — o "87%" continua visível (sumindo) no começo da tentativa seguinte
  },

  // --------------------------------------------------------------- juice -----
  juice: {
    tremidaMorte: 7,        // px — força da tremida de tela ao morrer
    tremidaLaser: 1.5,      // px — quando um laser liga
    tremidaParede: 2.5,     // px — quando paredes batem
    tremidaExplosao: 2,     // px — quando um anel explode
    tremidaDecaimento: 5,   // quão rápido a tremida acaba (maior = mais rápido)
    flashMorte: 0.7,        // 0–1 — opacidade do flash branco na morte
    flashLaser: 0.06,       // 0–1 — flash leve quando um laser liga
    reduzido: 0.15,         // com "reduzir flashes e tremida" ligado, tudo é multiplicado por isso
    maxParticulas: 600,     // limite de partículas na tela (pool)
  },

  // --------------------------------------------------------------- áudio -----
  audio: {
    antecedencia: 0.3,      // s — o sequenciador agenda notas com essa antecedência
    atrasoInicio: 0.06,     // s — margem entre apertar "jogar" e a primeira nota (precisa ser > 0)
    volumeMusicaPadrao: 0.7,
    volumeEfeitosPadrao: 0.8,
    latenciaAutoMax: 0.25,  // s — limite da latência detectada automaticamente
    calibracaoBpm: 100,     // BPM do teste de calibração
    calibracaoToques: 8,    // toques válidos pra fechar a calibração
    calibracaoCompensacaoMs: 15, // ms — atraso típico do toque/tecla, descontado da calibração
  },

  // ------------------------------------------------------------ progresso ----
  progresso: {
    larguraBarra: 200,      // px — barra de % no topo
  },

  // --------------------------------------------------------------- textos ----
  idioma: 'pt',             // 'pt' por enquanto. Inglês entra na Fase 3.

  // --------------------------------------------------------------- debug -----
  debug: {
    // O modo debug só liga com ?debug=1 na URL.
    velocidades: [1, 0.5, 0.25], // opções de câmera lenta
  },
};
