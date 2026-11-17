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
  versao: '0.7.0-dev',     // versão do jogo (aparece na tela inicial e no registro de erros)

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
    raioLuz: 48,            // px — raio da luz em volta da alma quando a caixa escurece (evento "escuro")
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
    sensibilidadePadrao: 1.25, // DEDO: 1 = a alma anda a mesma distância que o dedo na tela
    sensibilidadeMouse: 1,  // MOUSE: sempre 1:1 — a bolinha anda exatamente o que o cursor anda
    velocidadeMax: 1400,    // px/s — limite da alma seguindo o dedo/mouse (a colisão em sub-passos
                            //        garante que nada atravessa nada mesmo nessa velocidade)
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
    poolMinimo: 64,         // o pool de projéteis se ajusta ao pico de cada fase; este é o mínimo
    passoGuia: 1 / 240,     // s — passo fixo da curva das teleguiadas (não depende do fps)
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
    atrasoReinicioRecorde: 0.45, // s — quase igual quando bate recorde (o texto continua visível na próxima)
    toquePulaApos: 0.12,         // s — depois disso, tocar/apertar reinicia na hora
    congelar: 0.05,              // s — "hit-stop": o jogo congela um instante na morte
    particulas: 1,               // multiplicador de partículas da explosão
    textoDuracao: 1.6,           // s — o "87%" continua visível (sumindo) no começo da tentativa seguinte
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
    paradoMax: 0.3,         // s — se o áudio ficar parado (iPhone interrompeu) mais que isso, o jogo pausa e pede um toque
  },

  // ------------------------------------------------------------ progresso ----
  progresso: {
    larguraBarra: 200,      // px — barra de % no topo
  },

  // --------------------------------------------------------------- save ------
  save: {
    gravarDepoisMs: 800,    // ms — mortes comuns gravam juntas depois desse tempo (recorde/vitória gravam na hora)
    backupS: 120,           // s — de quanto em quanto tempo o backup do save é atualizado
  },

  // ------------------------------------------------------------- desenho -----
  render: {
    balasEmCamada: 120,     // com mais balas que isso na tela, elas são desenhadas numa camada de pixels
  },

  // ----------------------------------------------------------- simulação -----
  sim: {
    passoMax: 0.1,          // s — se um frame travar mais que isso, a simulação avança no máximo isso
    subpassosMax: 24,       // colisão testada em até tantos pedaços por frame (nada atravessa nada)
    distSubpasso: 2.5,      // px — um sub-passo a cada tanto de movimento (alma ou projétil mais rápido)
    dtSubpasso: 1 / 240,    // s — e pelo menos um a cada tanto de tempo (a morte cai no instante certo)
  },

  // ----------------------------------------------------------- progressão ----
  progressao: {
    avisoS: 2.6,            // s — quanto tempo o aviso de conquista/missão fica no topo
    estrelasDemon: 20,      // estrelas pra abrir as fases Demônio
  },

  // ------------------------------------------------------------ infinito -----
  infinito: {
    musica: 'correnteza',   // toca em loop; cada volta da música é um trecho novo
    nivelInicial: 0.2,      // dificuldade da 1ª volta (0 a 1)
    nivelPorVolta: 0.16,    // quanto sobe a cada volta (chega no máximo na 6ª)
    calmaInicio: 6,         // batidas sem nada no começo da partida
    folgaFim: 10,           // batidas livres antes da virada da música (nada cruza a volta)
    respiroMin: 2,          // batidas entre um ataque e o próximo, no nível máximo
    respiroMax: 5,          // ...e no começo
  },

  // ------------------------------------------------------------ economia -----
  // Moedas comuns só compram VISUAL (nada dá vantagem; nada custa dinheiro de verdade).
  // Só contam nas fases oficiais e sem debug.
  economia: {
    porPct: 1,              // moedas por % novo de recorde (de 40% pra 55% = 15 moedas)
    raspao: 1,              // moedas por raspão
    vitoria: { facil: 40, normal: 60, dificil: 90, dificilimo: 130, insano: 180, demonio: 300 }, // 1ª vitória
    vitoriaRepetida: 10,    // vencer de novo
    missoesPorDia: 3,
    missoesPorSemana: 2,
    tempoLote: 15,          // s — o tempo jogado entra nas missões de 15 em 15 s
    pecasIniciais: ['corpo.redondo', 'olhos.ponto', 'boca.nenhuma', 'cabeca.nenhuma', 'acessorio.nenhum', 'padrao.liso', 'rastro.padrao'],
  },

  // -------------------------------------------------------------- editor -----
  editor: {
    gravarDepoisMs: 600,    // ms — o editor grava sozinho esse tempo depois da última mudança
    lixeira: 10,            // fases apagadas que ficam guardadas (dá pra trazer de volta)
    historicoMax: 200,      // passos de desfazer
    zoomPadrao: 8,          // px por batida na linha do tempo
    zoomMin: 2, zoomMax: 48,
    escalaPrevia: 0.72,     // tamanho da caixa na prévia (1 = tamanho do jogo)
    passoPos: 0.05,         // quanto uma posição anda em cada toque nas setinhas
    imaDistPx: 6,           // px — distância em que o ímã puxa pra nota da música
    solverMsPorFrame: 10,   // ms — quanto o solver trabalha por frame ao verificar (a tela não trava)
  },

  // ------------------------------------------------------------- código -----
  codigo: {
    maxTexto: 200000,       // caracteres — código maior que isso nem é lido
    maxBytes: 1000000,      // bytes depois de descompactar (proteção contra código "bomba")
  },

  // -------------------------------------------------------------- solver -----
  solver: {
    passo: 1 / 60,          // s — passo de tempo do solver (em cada passo a alma anda 1 célula da grade)
    margem: 0.5,            // px — o solver considera a hitbox da alma esse tanto maior (conservador)
    passadas: 3,            // provar: até quantas vezes refaz o caminho com as teleguiadas mirando nele
  },

  // ------------------------------------------------------------- limites -----
  // Proteção contra fases quebradas ou maliciosas (editor e códigos compartilhados).
  limites: {
    maxEventos: 4000,       // eventos numa fase
    maxPorEvento: 2000,     // projéteis gerados por um único evento
    maxSpecs: 20000,        // projéteis numa fase inteira
    maxPosicoes: 64,        // itens numa lista de posições
    maxTexto: 40,           // caracteres em nome/autor
    bpmMin: 40, bpmMax: 300,
    batidasMin: 4, batidasMax: 2000,
  },

  // --------------------------------------------------------------- textos ----
  idioma: 'pt',             // 'pt' por enquanto. Inglês entra na Fase 3.

  // --------------------------------------------------------------- debug -----
  debug: {
    // O modo debug só liga com ?debug=1 na URL.
    velocidades: [1, 0.5, 0.25], // opções de câmera lenta
  },
};
