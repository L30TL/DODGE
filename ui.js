'use strict';
// =============================================================================
// DODGE — ui.js
// Textos (todos num objeto só), paleta, fonte em pixel art, sprites/ícones,
// controles (botões, sliders) e as telas de menu.
// =============================================================================

// ------------------------------------------------------------------ TEXTOS ---
// Todos os textos do jogo. Use {n}, {x} etc. para valores: t('tentativa', {n: 3}).
const TEXTOS = {
  pt: {
    titulo: 'DODGE',
    toquePraComecar: 'TOQUE PRA COMEÇAR',
    cliquePraComecar: 'CLIQUE OU APERTE ESPAÇO',
    tentativa: 'TENTATIVA {n}',
    novoRecorde: 'NOVO RECORDE!',
    raspou: 'RASPOU!',
    raspouCombo: 'RASPOU! ×{n}',
    faseCompleta: 'FASE COMPLETA!',
    proxima: 'PRÓXIMA →',
    repetir: 'REPETIR',
    fases: 'FASES',
    pausado: 'PAUSADO',
    continuar: 'CONTINUAR',
    reiniciar: 'REINICIAR',
    sair: 'SAIR',
    configuracoes: 'CONFIGURAÇÕES',
    musica: 'MÚSICA',
    efeitos: 'EFEITOS',
    atrasoAudio: 'ATRASO DO ÁUDIO',
    atrasoValor: '{n} MS',
    atrasoAuto: 'AUTO ({n} MS)',
    calibrar: 'CALIBRAR',
    auto: 'AUTO',
    reduzirEfeitos: 'REDUZIR FLASHES E TREMIDA',
    pausaAuto: 'PAUSA AUTOMÁTICA',
    sensibilidade: 'SENSIBILIDADE DO TOQUE',
    ligado: 'LIGADO',
    desligado: 'DESLIGADO',
    voltar: 'VOLTAR',
    apagarProgresso: 'APAGAR PROGRESSO',
    apagar: 'APAGAR',
    confirmarApagar: 'CONFIRMAR?',
    progressoApagado: 'PROGRESSO APAGADO',
    melhor: 'MELHOR {n}%',
    tentativas: 'TENTATIVAS: {n}',
    raspoes: 'RASPÕES: {n}',
    completa: 'COMPLETA!',
    ganhouEstrelas: '+{n}',
    maisFasesEmBreve: 'MAIS FASES EM BREVE!',
    girarCelular: 'GIRE O CELULAR',
    jogar: 'JOGAR',
    versao: 'V{n}',
    rotuloDebug: 'DEBUG',
    saveIndisponivel: 'SAVE INDISPONÍVEL NESTE NAVEGADOR',
    saveRecuperado: 'SEU SAVE TINHA UM PROBLEMA E FOI RECUPERADO DO BACKUP',
    savePerdido: 'O SAVE ESTAVA ESTRAGADO; UMA CÓPIA FOI GUARDADA',
    audioInterrompido: 'O SOM PAROU. TOQUE EM CONTINUAR',
    erroAviso: 'ERRO REGISTRADO · VEJA EM CONFIGURAÇÕES',
    registroErros: 'REGISTRO DE ERROS ({n})',
    copiar: 'COPIAR',
    copiado: 'COPIADO!',
    limpar: 'LIMPAR',
    salvar: 'SALVAR',
    calibracaoTitulo: 'CALIBRAR ÁUDIO',
    calibracaoInstrucao: 'TOQUE OU APERTE ESPAÇO JUNTO COM A BATIDA',
    calibracaoDica: 'O CÍRCULO PISCA COM O ATRASO ATUAL',
    calibracaoProgresso: 'TOQUES: {n}/{max}',
    calibracaoResultado: 'ATRASO MEDIDO: {n} MS',
    calibracaoAtual: 'ATRASO ATUAL: {n} MS',
    calibracaoRecomecar: 'RECOMEÇAR',
    vitoriaTentativas: 'TENTATIVAS',
    vitoriaRaspoes: 'RASPÕES',
    vitoriaMoedas: 'MOEDAS',
    // ------------------------------------------------------- progressão
    visual: 'VISUAL',
    missoes: 'MISSÕES',
    conquistasTitulo: 'CONQUISTAS {n}/{total}',
    hoje: 'HOJE',
    estaSemana: 'ESTA SEMANA',
    trocaEm: 'TROCA EM {t}',
    horasMin: '{h}H {m}MIN',
    dias: '{n} DIAS',
    pegar: 'PEGAR +{n}',
    pego: 'PEGO',
    pecasColecao: 'PEÇAS {n}/{total}',
    comprar: 'COMPRAR',
    usando: 'USANDO',
    usar: 'USAR',
    liberaCom: 'LIBERA COM A CONQUISTA',
    faltamMoedas: 'FALTAM {n} MOEDAS',
    comprou: 'COMPROU!',
    corProibida: 'ROSA É A COR DO PERIGO: NÃO PODE NO CORPO',
    conquistaNova: 'CONQUISTA: {nome}',
    missaoFeita: 'MISSÃO COMPLETA! PEGUE EM MISSÕES',
    moedasGanhas: '+{n} MOEDAS',
    recompensa: '+{n}',
    categorias: { corpo: 'CORPO', padrao: 'PADRÃO', olhos: 'OLHOS', boca: 'BOCA', cabeca: 'CABEÇA', acessorio: 'EXTRA', rastro: 'RASTRO' },
    pecas: {
      corpo: { redondo: 'REDONDO', quadrado: 'QUADRADO', gota: 'GOTA', fantasma: 'FANTASMINHA' },
      padrao: { liso: 'LISO', listras: 'LISTRAS', bolinhas: 'BOLINHAS', xadrez: 'XADREZ' },
      olhos: { ponto: 'PONTINHOS', grandes: 'GRANDES', sono: 'SONO', bravos: 'BRAVOS' },
      boca: { nenhuma: 'SEM BOCA', sorriso: 'SORRISO', o: 'OH!', dentes: 'DENTES', lingua: 'LÍNGUA' },
      cabeca: { nenhuma: 'NADA', topete: 'TOPETE', bone: 'BONÉ', laco: 'LAÇO', coroa: 'COROA', antena: 'ANTENA', chifres: 'CHIFRES' },
      acessorio: { nenhum: 'NADA', cachecol: 'CACHECOL', oculos: 'ÓCULOS', gravata: 'GRAVATA', estrela: 'ESTRELA' },
      rastro: { padrao: 'NORMAL', bolhas: 'BOLHAS', faiscas: 'FAÍSCAS', arcoiris: 'ARCO-ÍRIS' },
    },
    missoesTxt: { raspoes: 'RASPE {n} VEZES', tentativas: 'FAÇA {n} TENTATIVAS', pct: 'CHEGUE A {n}% EM UMA FASE',
      vitoria: 'VENÇA UMA FASE', vitorias: 'VENÇA {n} FASES', secreta: 'PEGUE UMA MOEDA SECRETA', minutos: 'JOGUE {n} MINUTOS',
      combo: 'FAÇA UM COMBO DE RASPÃO ×{n}', pctDificil: 'CHEGUE A {n}% NUMA FASE DIFÍCIL OU MAIS' },
    conquistas: {
      primeiraVitoria: { nome: 'PRIMEIRA VITÓRIA', desc: 'VENÇA UMA FASE' },
      correnteza: { nome: 'CONTRA A CORRENTE', desc: 'VENÇA CORRENTEZA' },
      prensa: { nome: 'PRENSADO', desc: 'VENÇA PRENSA' },
      raspoes100: { nome: 'NA TRAVE', desc: 'RASPE 100 VEZES' },
      raspoes1000: { nome: 'MESTRE DO RASPÃO', desc: 'RASPE 1000 VEZES' },
      combo5: { nome: 'COMBO!', desc: 'FAÇA UM COMBO DE RASPÃO ×5' },
      quase: { nome: 'QUASE...', desc: 'MORRA EM 99%' },
      persistente: { nome: 'TEIMOSO', desc: '50 TENTATIVAS NUMA FASE' },
      moedaSecreta: { nome: 'ACHADO', desc: 'PEGUE UMA MOEDA SECRETA' },
      tresMoedas: { nome: 'TESOURO COMPLETO', desc: 'AS 3 MOEDAS SECRETAS DE UMA FASE' },
      criador: { nome: 'CRIADOR', desc: 'CRIE UMA FASE NO EDITOR' },
      verificador: { nome: 'APROVADA', desc: 'VERIFIQUE UMA FASE SUA' },
      estilo: { nome: 'ESTILOSO', desc: 'COMPRE UMA PEÇA' },
      colecionador: { nome: 'COLECIONADOR', desc: 'COMPRE 8 PEÇAS' },
      maratona: { nome: 'MARATONA', desc: 'JOGUE 30 MINUTOS' },
      missoes10: { nome: 'DEDICADO', desc: 'COMPLETE 10 MISSÕES' },
    },

    // ------------------------------------------------------------ editor
    criar: 'CRIAR',
    editor: {
      minhasFases: 'MINHAS FASES',
      nova: 'NOVA FASE',
      nomePadrao: 'MINHA FASE {n}',
      nenhuma: 'NENHUMA FASE AINDA. TOQUE EM NOVA FASE!',
      editar: 'EDITAR',
      duplicar: 'DUPLICAR',
      copiaDe: '{nome} (CÓPIA)',
      apagar: 'APAGAR',
      apagada: 'FASE APAGADA',
      desfazerApagar: 'TRAZER DE VOLTA',
      eventos: '{n} EVENTOS',
      editadaHa: 'EDITADA {quando}',
      agora: 'AGORA',
      minutos: 'HÁ {n} MIN',
      horas: 'HÁ {n} H',
      dias: 'HÁ {n} DIAS',
      nome: 'NOME',
      nomeDaFase: 'NOME DA FASE',
      ok: 'OK',
      cancelar: 'CANCELAR',
      musica: 'MÚSICA',
      dificuldade: 'DIFICULDADE',
      propriedades: 'PROPRIEDADES',
      fechar: 'FECHAR',
      apagarFase: 'APAGAR FASE',
      confirmar: 'CONFIRMAR?',
      testar: 'TESTAR',
      adicionarEm: 'ADICIONAR NA BATIDA {n}',
      batida: 'BATIDA',
      batidaDe: 'BATIDA {n} / {total}',
      fim: 'FIM',
      depoisDoFim: 'DEPOIS DO FIM DA MÚSICA',
      toquePosicao: 'TOQUE NA CAIXA PRA POSICIONAR',
      limite: 'LIMITE DE EVENTOS DA FASE',
      salvo: 'SALVO',
      salvando: 'SALVANDO...',
      semArmazenamento: 'NÃO DÁ PRA SALVAR NESTE NAVEGADOR',
      desfeito: 'DESFEITO',
      refeito: 'REFEITO',
      copiado: 'EVENTO COPIADO',
      colado: 'EVENTO COLADO',
      testeTitulo: 'TESTE',
      editorVoltar: 'EDITOR',
      venceuTeste: 'VOCÊ VENCEU SUA FASE!',
      importar: 'IMPORTAR',
      colarCodigo: 'COLE O CÓDIGO DA FASE',
      codigoDaFase: 'CÓDIGO DA FASE: COPIE E MANDE PRA QUEM QUISER',
      copiarCodigo: 'COPIAR',
      codigoCopiado: 'CÓDIGO COPIADO!',
      compartilhar: 'COMPARTILHAR',
      importada: 'FASE IMPORTADA!',
      nomeImportado: 'FASE IMPORTADA',
      nomeProibido: 'ESSE NOME NÃO PODE. ESCOLHA OUTRO',
      deCodigo: 'CÓDIGO',
      verificada: 'VERIFICADA',
      naoVerificada: 'NÃO VERIFICADA',
      vencaDoComeco: 'VENÇA DO COMEÇO PRA VERIFICAR',
      precisaVerificar: 'ABRA NO EDITOR E VENÇA DO COMEÇO PRA COMPARTILHAR',
      conferindo: 'CONFERINDO SE A FASE É POSSÍVEL... {n}%',
      verificadaOk: 'FASE VERIFICADA! JÁ DÁ PRA COMPARTILHAR',
      impossivelTeclado: 'NO TECLADO NÃO DÁ PRA PASSAR PERTO DA BATIDA {n}',
      gerandoCodigo: 'GERANDO O CÓDIGO...',
      errosCodigo: { formato: 'ISSO NÃO É UM CÓDIGO DE FASE', incompleto: 'CÓDIGO INCOMPLETO (COPIOU TUDO?)',
        versao: 'CÓDIGO DE UMA VERSÃO MAIS NOVA DO JOGO', grande: 'CÓDIGO GRANDE DEMAIS',
        invalido: 'CÓDIGO ESTRAGADO', navegador: 'ESTE NAVEGADOR NÃO ABRE ESSE CÓDIGO' },
      ima: 'ÍMÃ: {modo}',
      imas: { q: '1/4', m: '1/2', b: 'BATIDA', bumbo: 'BUMBO', caixa: 'CAIXA', melodia: 'MELODIA', livre: 'LIVRE' },
      musicas: { despertar: 'DESPERTAR', correnteza: 'CORRENTEZA', prensa: 'PRENSA' },
      secoes: { intro: 'INTRO', verso: 'VERSO', verso2: 'VERSO', pre: 'PRÉ', refrao: 'REFRÃO', ponte: 'PONTE',
        final: 'FINAL', fim: 'FIM', quebra: 'QUEBRA', sobe: 'SUBIDA', menu: 'MENU' },
      tipos: { chuva: 'CHUVA', fogo: 'FOGO CRUZADO', laser: 'LASER', paredes: 'PAREDES', espiral: 'ESPIRAL',
        teleguiada: 'TELEGUIADA', anel: 'ANEL', moeda: 'MOEDA', caixa: 'TAMANHO', girar: 'GIRAR', escuro: 'ESCURO',
        inverter: 'INVERTER', espelho: 'ESPELHO' },
      curtos: { chuva: 'CHUVA', fogo: 'FOGO', laser: 'LASER', paredes: 'PAREDE', espiral: 'ESPIRAL',
        teleguiada: 'MIRA', anel: 'ANEL', moeda: 'MOEDA', caixa: 'TAMANHO', girar: 'GIRAR', escuro: 'ESCURO',
        inverter: 'INVERTE', espelho: 'ESPELHO' },
      campos: { pos: 'POSIÇÕES', de: 'VEM DE', vel: 'VELOCIDADE', tam: 'TAMANHO', intervalo: 'INTERVALO (BAT)',
        aviso: 'AVISO (BAT)', eixo: 'EIXO', alternar: 'ALTERNAR LADOS', orient: 'DIREÇÃO', larg: 'LARGURA',
        dur: 'DURAÇÃO (BAT)', ate: 'VARRE ATÉ', modo: 'MODO', centro: 'CENTRO', espaco: 'ESPAÇO', fechar: 'FECHAR (BAT)',
        segurar: 'SEGURAR (BAT)', abrir: 'ABRIR (BAT)', x: 'X', y: 'Y', bracos: 'BRAÇOS', giro: 'GIRO', ang: 'ÂNGULO',
        cadencia: 'TIROS/BATIDA', quantidade: 'QUANTIDADE', guia: 'CURVA', guiaDur: 'CURVA DURA (BAT)', raio: 'RAIO',
        id: 'QUAL MOEDA', largura: 'LARGURA', altura: 'ALTURA', angulo: 'ÂNGULO', nivel: 'ESCURIDÃO', ativo: 'LIGADO',
        invX: 'INVERTE ←→', invY: 'INVERTE ↑↓', raioLuz: 'LUZ (RAIO)' },
      opcoes: { cima: 'CIMA', baixo: 'BAIXO', esquerda: 'ESQUERDA', direita: 'DIREITA', h: 'HORIZONTAL', v: 'VERTICAL',
        fechar: 'FECHAR', buraco: 'BURACO', x: '←→', y: '↑↓', xy: 'OS DOIS', sim: 'SIM', nao: 'NÃO', nada: '-' },
    },
    dificuldades: {
      facil: 'FÁCIL',
      normal: 'NORMAL',
      dificil: 'DIFÍCIL',
      dificilimo: 'DIFICÍLIMO',
      insano: 'INSANO',
      demonio: 'DEMÔNIO',
    },
  },
};

function t(chave, valores) {
  const tabela = TEXTOS[CONFIG.idioma] || TEXTOS.pt;
  let s = chave.split('.').reduce((o, k) => (o ? o[k] : undefined), tabela);
  if (s === undefined) s = chave;
  if (valores) for (const k in valores) s = s.split('{' + k + '}').join(String(valores[k]));
  return s;
}

// ----------------------------------------------------------------- PALETA ----
// Paleta limitada e de alto contraste. Rosa = perigo, sempre.
const PAL = {
  preto: '#07070f',
  fundo: '#0e0e1c',
  fundo2: '#17172e',
  fundo3: '#24244a',
  cinza: '#55557e',
  cinzaClaro: '#9c9cc4',
  branco: '#f4f4ff',
  perigo: '#ff2e63',
  perigoClaro: '#ff9ab5',
  perigoEscuro: '#8f0c33',
  alma: '#4df3ff',
  almaEscura: '#1694b8',
  almaClara: '#d2fdff',
  ouro: '#ffd23f',
  ouroEscuro: '#b8740f',
  verde: '#45e07a',
  verdeEscuro: '#1b7a42',
  azul: '#4d8bff',
  azulEscuro: '#1e3f9e',
  laranja: '#ff9a2e',
  laranjaEscuro: '#a24d0b',
  vermelho: '#ff4040',
  vermelhoEscuro: '#8a1414',
  roxo: '#c04dff',
  roxoEscuro: '#5a1a8c',
  demonio: '#d0103a',
  demonioEscuro: '#3d0414',
};

// Cor de destaque de cada dificuldade (ícone, barra, fundo da fase).
const COR_DIFICULDADE = {
  facil: PAL.verde, normal: PAL.azul, dificil: PAL.laranja,
  dificilimo: PAL.vermelho, insano: PAL.roxo, demonio: PAL.demonio,
};

// =============================================================================
// FONTE EM PIXEL ART (original). Maiúsculas 5×7 com acentos.
// Cada glifo: linhas de '#' (pixel aceso) e '.' (vazio). y=0 é o topo da letra.
// =============================================================================
const Fonte = (() => {
  const G = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '..', '..', '.#', '.#', '#.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    ':': ['.', '.', '#', '.', '.', '#', '.'],
    ';': ['..', '..', '.#', '..', '..', '.#', '.#', '#.'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '+': ['...', '...', '.#.', '###', '.#.', '...', '...'],
    '=': ['....', '....', '####', '....', '####', '....', '....'],
    '/': ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..'],
    '%': ['##...', '##..#', '...#.', '..#..', '.#...', '#..##', '...##'],
    '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    '·': ['.', '.', '.', '#', '.', '.', '.'],
    '→': ['.......', '....#..', '.....#.', '#######', '.....#.', '....#..', '.......'],
    '←': ['.......', '..#....', '.#.....', '#######', '.#.....', '..#....', '.......'],
    '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],
    '↓': ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
    '★': ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
  };
  // Acentos (desenhados acima da letra, linhas -2 e -1) e cedilha (abaixo).
  const ACENTO = {
    agudo: ['..#', '.#.'],
    grave: ['#..', '.#.'],
    circ: ['.#.', '#.#'],
    til: ['.#.#', '#.#.'],
    trema: ['#.#', '...'],
  };
  const COMPOSTOS = {
    'Á': ['A', 'agudo'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'til'],
    'É': ['E', 'agudo'], 'Ê': ['E', 'circ'], 'È': ['E', 'grave'],
    'Í': ['I', 'agudo'], 'Ó': ['O', 'agudo'], 'Ô': ['O', 'circ'], 'Õ': ['O', 'til'],
    'Ú': ['U', 'agudo'], 'Ü': ['U', 'trema'], 'Ñ': ['N', 'til'],
  };

  const CEL_W = 8, CEL_H = 13, BASE = 2;   // célula do atlas: 2 linhas de acento em cima
  const mapa = {};                           // char -> {sx, sy, w}
  let atlas = null;
  const tingidos = new Map();                // cor -> atlas colorido

  function construir() {
    const chars = Object.keys(G).concat(Object.keys(COMPOSTOS), ['Ç']);
    const porLinha = 16;
    atlas = document.createElement('canvas');
    atlas.width = porLinha * CEL_W;
    atlas.height = Math.ceil(chars.length / porLinha) * CEL_H;
    const c = atlas.getContext('2d');
    c.fillStyle = '#fff';
    chars.forEach((ch, i) => {
      const sx = (i % porLinha) * CEL_W, sy = Math.floor(i / porLinha) * CEL_H;
      let base = G[ch], acento = null, cedilha = false;
      if (COMPOSTOS[ch]) { base = G[COMPOSTOS[ch][0]]; acento = ACENTO[COMPOSTOS[ch][1]]; }
      if (ch === 'Ç') { base = G['C']; cedilha = true; }
      const w = base[0].length;
      base.forEach((linha, y) => {
        for (let x = 0; x < linha.length; x++) if (linha[x] === '#') c.fillRect(sx + x, sy + BASE + y, 1, 1);
      });
      if (acento) {
        const ox = Math.floor((w - acento[0].length) / 2);
        acento.forEach((linha, y) => {
          for (let x = 0; x < linha.length; x++) if (linha[x] === '#') c.fillRect(sx + ox + x, sy + y, 1, 1);
        });
      }
      if (cedilha) { c.fillRect(sx + 2, sy + BASE + 7, 1, 1); c.fillRect(sx + 1, sy + BASE + 8, 2, 1); }
      mapa[ch] = { sx, sy, w };
    });
  }

  function atlasCor(cor) {
    let a = tingidos.get(cor);
    if (a) return a;
    a = document.createElement('canvas');
    a.width = atlas.width; a.height = atlas.height;
    const c = a.getContext('2d');
    c.drawImage(atlas, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = cor;
    c.fillRect(0, 0, a.width, a.height);
    tingidos.set(cor, a);
    return a;
  }

  function glifo(ch) { return mapa[ch] || mapa['?']; }
  // a fonte tem esse caractere? (nomes digitados pelo jogador)
  function suporta(ch) { if (!atlas) construir(); return !!mapa[String(ch).toUpperCase()]; }

  function largura(str, escala = 1) {
    str = String(str).toUpperCase();
    let w = 0;
    for (let i = 0; i < str.length; i++) w += glifo(str[i]).w + 1;
    return Math.max(0, w - 1) * escala;
  }

  // Desenha texto. (x, y) = canto superior esquerdo da letra (sem contar acento).
  function desenhar(ctx, str, x, y, op) {
    if (!atlas) construir();
    op = op || {};
    const escala = op.escala || 1;
    str = String(str).toUpperCase();
    const w = largura(str, escala);
    if (op.alinhar === 'centro') x -= Math.floor(w / 2);
    else if (op.alinhar === 'direita') x -= w;
    x = Math.round(x); y = Math.round(y);
    if (op.sombra) desenharCru(ctx, str, x + escala, y + escala, escala, op.sombra, op.onda);
    desenharCru(ctx, str, x, y, escala, op.cor || PAL.branco, op.onda);
    return w;
  }

  function desenharCru(ctx, str, x, y, escala, cor, onda) {
    const a = atlasCor(cor);
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const g = glifo(str[i]);
      const dy = onda ? Math.round(Math.sin(onda.fase + i * 0.6) * onda.amp) * escala : 0;
      ctx.drawImage(a, g.sx, g.sy, CEL_W, CEL_H, cx, y - BASE * escala + dy, CEL_W * escala, CEL_H * escala);
      cx += (g.w + 1) * escala;
    }
  }

  return { desenhar, largura, suporta, ALTURA: 7 };
})();

// =============================================================================
// SPRITES — pixel art definida como texto. Cada letra é uma cor da paleta.
// =============================================================================
const Sprites = (() => {
  const cache = new Map();

  // Cria um canvas a partir de linhas de texto e um mapa letra -> cor.
  function criar(linhas, cores) {
    const h = linhas.length, w = Math.max(...linhas.map(l => l.length));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      const linha = linhas[y];
      for (let x = 0; x < linha.length; x++) {
        const cor = cores[linha[x]];
        if (cor) { c.fillStyle = cor; c.fillRect(x, y, 1, 1); }
      }
    }
    return cv;
  }

  function memo(chave, fabrica) {
    let s = cache.get(chave);
    if (!s) { s = fabrica(); cache.set(chave, s); }
    return s;
  }

  // Corpo base dos ícones de dificuldade: uma "alma" redondinha 13×13.
  const CORPO = [
    '...#######...',
    '.##fffffff##.',
    '.#fhffffffs#.',
    '#fhffffffffs#',
    '#ffffffffffs#',
    '#ffffffffffs#',
    '#ffffffffffs#',
    '#ffffffffffs#',
    '#ffffffffffs#',
    '#fffffffffss#',
    '.#ffffffffss#',
    '.##ssssssss#.',
    '...#######...',
  ];

  // Rostos de cada dificuldade: [x, y, letra] desenhados por cima do corpo.
  // e = olho/boca (escuro), w = branco, y = brilho amarelo, k = chifre
  const ROSTOS = {
    facil: [[3, 6, 'e'], [4, 5, 'e'], [5, 6, 'e'], [7, 6, 'e'], [8, 5, 'e'], [9, 6, 'e'],
      [5, 8, 'e'], [6, 9, 'e'], [7, 8, 'e']],
    normal: [[4, 5, 'e'], [4, 6, 'e'], [8, 5, 'e'], [8, 6, 'e'],
      [4, 8, 'e'], [5, 9, 'e'], [6, 9, 'e'], [7, 9, 'e'], [8, 8, 'e']],
    dificil: [[3, 4, 'e'], [4, 4, 'e'], [5, 5, 'e'], [9, 4, 'e'], [8, 4, 'e'], [7, 5, 'e'],
      [4, 6, 'e'], [4, 7, 'e'], [8, 6, 'e'], [8, 7, 'e'], [5, 9, 'e'], [6, 9, 'e'], [7, 9, 'e']],
    dificilimo: [[2, 3, 'e'], [3, 4, 'e'], [4, 5, 'e'], [10, 3, 'e'], [9, 4, 'e'], [8, 5, 'e'],
      [4, 6, 'e'], [8, 6, 'e'], [4, 7, 'e'], [8, 7, 'e'],
      [3, 9, 'e'], [4, 9, 'e'], [5, 9, 'e'], [6, 9, 'e'], [7, 9, 'e'], [8, 9, 'e'], [9, 9, 'e'],
      [3, 10, 'e'], [4, 10, 'w'], [5, 10, 'e'], [6, 10, 'w'], [7, 10, 'e'], [8, 10, 'w'], [9, 10, 'e']],
    insano: [[2, 4, 'e'], [3, 4, 'e'], [4, 4, 'e'], [2, 5, 'e'], [3, 5, 'w'], [4, 5, 'e'], [2, 6, 'e'], [3, 6, 'e'], [4, 6, 'e'],
      [8, 5, 'e'], [9, 5, 'e'], [8, 6, 'e'], [9, 6, 'w'],
      [2, 9, 'e'], [3, 8, 'e'], [4, 9, 'e'], [5, 8, 'e'], [6, 9, 'e'], [7, 8, 'e'], [8, 9, 'e'], [9, 8, 'e'], [10, 9, 'e']],
    demonio: [[3, 5, 'y'], [4, 6, 'y'], [5, 6, 'y'], [9, 5, 'y'], [8, 6, 'y'], [7, 6, 'y'],
      [3, 9, 'e'], [4, 9, 'e'], [5, 9, 'e'], [6, 9, 'e'], [7, 9, 'e'], [8, 9, 'e'], [9, 9, 'e'],
      [4, 10, 'w'], [8, 10, 'w']],
  };

  function iconeDificuldade(dif) {
    return memo('dif:' + dif, () => {
      const cor = COR_DIFICULDADE[dif] || PAL.cinza;
      const escuro = { facil: PAL.verdeEscuro, normal: PAL.azulEscuro, dificil: PAL.laranjaEscuro,
        dificilimo: PAL.vermelhoEscuro, insano: PAL.roxoEscuro, demonio: PAL.demonioEscuro }[dif] || PAL.fundo3;
      // grade 15×15 com margem para chifres
      const grade = [];
      for (let y = 0; y < 15; y++) grade.push(new Array(15).fill('.'));
      CORPO.forEach((l, y) => { for (let x = 0; x < l.length; x++) if (l[x] !== '.') grade[y + 2][x + 1] = l[x]; });
      for (const [x, y, ch] of (ROSTOS[dif] || [])) grade[y + 2][x + 1] = ch;
      if (dif === 'demonio') {
        for (const [x, y] of [[1, 0], [1, 1], [2, 1], [2, 2], [13, 0], [13, 1], [12, 1], [12, 2]]) grade[y][x] = 'k';
      }
      if (dif === 'dificilimo') {   // gota de suor
        grade[3][13] = 'w'; grade[4][13] = 'w'; grade[4][14] = 'w';
      }
      return criar(grade.map(l => l.join('')), {
        '#': PAL.preto, f: cor, h: '#ffffff', s: escuro, e: PAL.preto, w: '#ffffff',
        y: PAL.ouro, k: PAL.cinzaClaro,
      });
    });
  }

  const DESENHOS = {
    estrela: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    moeda: ['..###..', '.#ooo#.', '#oo#oo#', '#o###o#', '#oo#oo#', '.#ooo#.', '..###..'],
    moedaVazia: ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
    pausa: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
    engrenagem: ['..#.#..', '.#####.', '###.###', '##...##', '###.###', '.#####.', '..#.#..'],
    repetir: ['..####.', '.#....#', '#......', '#....##', '#.....#', '.#...#.', '..###..'],
    lista: ['#.#####', '.......', '#.#####', '.......', '#.#####', '.......', '#.#####'],
    setaDir: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
    setaEsq: ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],
    cadeado: ['.###.', '#...#', '#...#', '#####', '##.##', '##.##', '#####'],
    check: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....', '.......'],
    // editor
    lapis: ['.....##', '....#.#', '...#.#.', '..#.#..', '.#.#...', '###....', '##.....'],
    desfazer: ['..#....', '.##....', '#######', '.##...#', '..#...#', '......#', '..####.'],
    refazer: ['....#..', '....##.', '#######', '#...##.', '#...#..', '#......', '.####..'],
    tocar: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
    mais: ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    menos: ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    lixo: ['.###.', '#####', '.....', '#.#.#', '#.#.#', '#.#.#', '.###.'],
    copia: ['####.', '#..#.', '#.####', '#.#..#', '###..#', '..#..#', '..####'],
    ima: ['##.##', '##.##', '#...#', '#...#', '#...#', '.###.', '.....'],
    compartilhar: ['...#...', '..###..', '.#.#.#.', '...#...', '#..#..#', '#.....#', '#######'],
    trofeu: ['#######', '#.###.#', '.#####.', '..###..', '...#...', '..###..', '.#####.'],
    moedinha: ['..###..', '.#www#.', '#ww#ww#', '#w#w#w#', '#ww#ww#', '.#www#.', '..###..'],
    cabide: ['...#...', '..#.#..', '....#..', '...#...', '.#####.', '#.....#', '#######'],
    interrogacao: ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    // tipos de evento (paleta e linha do tempo)
    ev_chuva: ['#..#..#', '#..#..#', '.......', '.#..#..', '.#..#..', '.......', '#..#..#'],
    ev_fogo: ['##.....', '.......', '....##.', '.......', '##.....', '.......', '....##.'],
    ev_laser: ['..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..'],
    ev_paredes: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##'],
    ev_espiral: ['..#....', '.....#.', '.#.....', '...#...', '.....#.', '.#.....', '....#..'],
    ev_teleguiada: ['...#...', '..###..', '.#.#.#.', '...#...', '...#...', '.......', '...#...'],
    ev_anel: ['..#.#..', '.......', '#.....#', '...#...', '#.....#', '.......', '..#.#..'],
    ev_moeda: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
    ev_caixa: ['##...##', '#.....#', '.......', '...#...', '.......', '#.....#', '##...##'],
    ev_girar: ['..###..', '.#...#.', '#.....#', '#.....#', '#...###', '.#...#.', '.....#.'],
    ev_escuro: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
    ev_inverter: ['..#....', '.#.....', '#######', '.......', '#######', '.....#.', '....#..'],
    ev_espelho: ['##...##', '##...##', '...#...', '...#...', '...#...', '##...##', '##...##'],
    // dedo arrastando (dica de toque)
    dedo: [
      '....##......',
      '...#ww#.....',
      '...#ww#.....',
      '...#ww####..',
      '...#ww#ww##.',
      '.###ww#ww#w#',
      '#ww#wwwwwww#',
      '#wwwwwwwwww#',
      '.#wwwwwwwww#',
      '..#wwwwwww#.',
      '...#wwwww#..',
      '...#######..',
    ],
    // tecla com seta (dica de teclado)
    tecla: [
      '.#########.',
      '#wwwwwwwww#',
      '#wwwwkwwww#',
      '#wwwkkkwww#',
      '#wwkkkkkww#',
      '#wkkkkkkkw#',
      '#wwwwwwwww#',
      '#sssssssss#',
      '.#########.',
    ],
  };

  function desenho(nome, cor) {
    return memo('d:' + nome + ':' + cor, () => criar(DESENHOS[nome], {
      '#': cor, o: PAL.ouro, w: PAL.branco, k: PAL.fundo, s: PAL.cinzaClaro,
    }));
  }

  // Moeda secreta (cheia, dourada) — usada no HUD e na lista.
  function moeda(cheia) {
    return cheia
      ? memo('moeda', () => criar(DESENHOS.moeda, { '#': PAL.ouroEscuro, o: PAL.ouro }))
      : memo('moedaVazia', () => criar(DESENHOS.moedaVazia, { '#': PAL.cinza }));
  }

  function estrela(acesa) {
    return desenho('estrela', acesa ? PAL.ouro : PAL.cinza);
  }

  // Bala: orbe em pixel art com contorno, corpo e brilho. Gerado por raio.
  function bala(diametro, cor, corClara, corEscura) {
    return memo('bala:' + diametro + cor, () => {
      const d = Math.max(3, Math.round(diametro));
      const cv = document.createElement('canvas');
      cv.width = d; cv.height = d;
      const c = cv.getContext('2d');
      const r = d / 2;
      for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
        const dx = x + 0.5 - r, dy = y + 0.5 - r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;
        let cc = cor;
        if (dist > r - 1.2) cc = corEscura;
        else if (dist < r * 0.45 && dx < 0.6 && dy < 0.6) cc = corClara;
        c.fillStyle = cc; c.fillRect(x, y, 1, 1);
      }
      return cv;
    });
  }

  return { criar, memo, iconeDificuldade, desenho, moeda, estrela, bala };
})();

// =============================================================================
// UI — helpers de desenho e controles (botões, sliders) com toque, mouse e teclado
// =============================================================================
const UI = {
  usandoTeclado: false,
  telas: {},

  texto(ctx, str, x, y, op) { return Fonte.desenhar(ctx, str, x, y, op); },
  largura(str, escala) { return Fonte.largura(str, escala); },

  // Painel retangular com borda em pixel.
  painel(ctx, x, y, w, h, op) {
    op = op || {};
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = op.fundo || PAL.fundo2;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = op.borda || PAL.branco;
    const b = op.espessura || 1;
    ctx.fillRect(x, y, w, b); ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y, b, h); ctx.fillRect(x + w - b, y, b, h);
  },

  // Barra de progresso simples.
  barra(ctx, x, y, w, h, frac, cor, fundo) {
    ctx.fillStyle = fundo || PAL.fundo3;
    ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (fw > 0) { ctx.fillStyle = cor; ctx.fillRect(x, y, fw, h); }
  },

  sprite(ctx, img, x, y, escala, centro) {
    escala = escala || 1;
    const w = img.width * escala, h = img.height * escala;
    if (centro) { x -= w / 2; y -= h / 2; }
    ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
  },
};

// ------------------------------------------------------------ EntradaTexto --
// Caixa de texto de verdade (HTML) por cima do jogo: no celular abre o teclado.
// Só aceita caracteres que a fonte do jogo sabe desenhar.
const EntradaTexto = (() => {
  let caixa = null, campo = null, titulo = null, ok = null, cancelar = null, atual = null;
  function limpar(txt, max, cru) {
    if (cru) return String(txt).replace(/\s+/g, '').slice(0, max);
    let out = '';
    for (const ch of String(txt).toUpperCase()) if (Fonte.suporta(ch)) out += ch;
    return out.replace(/\s+/g, ' ').slice(0, max);
  }
  function fechar(confirmou) {
    if (!atual) return;
    const a = atual; atual = null;
    caixa.style.display = 'none';
    campo.blur();
    if (confirmou) a.aoConfirmar && a.aoConfirmar(limpar(campo.value, a.max, a.cru).trim());
    else a.aoCancelar && a.aoCancelar();
  }
  function criar() {
    caixa = document.createElement('div');
    caixa.className = 'entrada-texto';
    caixa.innerHTML = '<div class="et-painel"><div class="et-titulo"></div>' +
      '<input class="et-campo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done">' +
      '<div class="et-botoes"><button class="et-cancelar"></button><button class="et-ok"></button></div></div>';
    document.body.appendChild(caixa);
    titulo = caixa.querySelector('.et-titulo');
    campo = caixa.querySelector('.et-campo');
    ok = caixa.querySelector('.et-ok');
    cancelar = caixa.querySelector('.et-cancelar');
    ok.addEventListener('click', () => fechar(true));
    cancelar.addEventListener('click', () => fechar(false));
    caixa.addEventListener('pointerdown', (e) => { if (e.target === caixa) fechar(false); });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); fechar(true); }
      else if (e.key === 'Escape') { e.preventDefault(); fechar(false); }
    });
    campo.addEventListener('input', () => {
      if (!atual || atual.cru) return;
      const l = limpar(campo.value, atual.max);
      if (l !== campo.value) campo.value = l;
    });
    campo.addEventListener('focus', () => { if (atual && atual.somenteLeitura) campo.select(); });
  }
  return {
    // op = { titulo, valor, max, aoConfirmar(texto), aoCancelar(),
    //        cru (código: sem maiúsculas nem filtro de letras), somenteLeitura, textoOk, textoCancelar }
    pedir(op) {
      if (!caixa) criar();
      atual = Object.assign({ max: CONFIG.limites.maxTexto }, op);
      titulo.textContent = op.titulo || '';
      ok.textContent = op.textoOk || t('editor.ok');
      cancelar.textContent = op.textoCancelar || t('editor.cancelar');
      campo.maxLength = atual.max;
      campo.readOnly = !!op.somenteLeitura;
      campo.style.textTransform = op.cru ? 'none' : 'uppercase';
      campo.style.fontSize = op.cru ? '13px' : '18px';
      campo.value = limpar(op.valor || '', atual.max, op.cru);
      caixa.style.display = 'flex';
      setTimeout(() => { campo.focus(); campo.select(); }, 30);
    },
    aberta() { return !!atual; },
    fechar() { fechar(false); },
    // copia o texto da caixa (botão COPIAR do código); devolve uma promessa de true/false
    copiar() {
      const txt = campo ? campo.value : '';
      const reserva = () => { try { campo.select(); return document.execCommand('copy'); } catch (e) { return false; } };
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(() => true, reserva);
      return Promise.resolve(reserva());
    },
    limpar,
  };
})();

// ---------------------------------------------------------------- Controles --
// Um conjunto de controles de uma tela: cuida de foco (teclado), toque e mouse.
class Controles {
  constructor() { this.itens = []; this.foco = -1; this.apertado = null; this.arrastando = null; }

  limpar() { this.itens.length = 0; this.foco = -1; this.apertado = null; this.arrastando = null; }

  // Botão: { x, y, w, h, texto, icone, primario, escala, acao, cor }
  botao(op) { const b = Object.assign({ tipo: 'botao', escala: 1 }, op); this.itens.push(b); return b; }

  // Slider: { x, y, w, h, get(), set(v), min, max, passo, formato(v) }
  slider(op) { const s = Object.assign({ tipo: 'slider', h: 13, passo: 0.05, min: 0, max: 1 }, op); this.itens.push(s); return s; }

  focar(item) { this.foco = this.itens.indexOf(item); }

  dentro(it, x, y) { return x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h; }

  achar(x, y) {
    for (let i = this.itens.length - 1; i >= 0; i--) {
      const it = this.itens[i];
      if (!it.oculto && this.dentro(it, x, y)) return it;
    }
    return null;
  }

  ponteiro(tipo, x, y) {
    if (tipo === 'down') {
      const it = this.achar(x, y);
      if (!it || it.desabilitado) return false;
      UI.usandoTeclado = false;
      this.apertado = it;
      if (it.tipo === 'slider') { this.arrastando = it; this.ajustarSlider(it, x); }
      return true;
    }
    if (tipo === 'move') {
      if (this.arrastando) this.ajustarSlider(this.arrastando, x);
      return !!this.arrastando;
    }
    if (tipo === 'up') {
      const it = this.apertado;
      this.apertado = null;
      if (this.arrastando) { this.arrastando = null; Sound.sfx('menu'); return true; }
      if (it && this.dentro(it, x, y) && !it.desabilitado) { this.ativar(it); return true; }
      return false;
    }
    if (tipo === 'cancel') { this.apertado = null; this.arrastando = null; }
    return false;
  }

  ajustarSlider(s, x) {
    const trilho = this.trilho(s);
    let f = (x - trilho.x) / trilho.w;
    f = Math.max(0, Math.min(1, f));
    let v = s.min + f * (s.max - s.min);
    v = Math.round(v / s.passo) * s.passo;
    s.set(Math.max(s.min, Math.min(s.max, v)));
  }

  trilho(s) {
    const xT = s.x + (s.rotuloW || 0);
    return { x: xT + 4, w: s.w - (s.rotuloW || 0) - 8 - 34 };
  }

  ativar(it) {
    if (it.tipo === 'botao' && it.acao) {
      Sound.sfx(it.primario ? 'confirmar' : 'menu');
      it.acao(it);
    }
  }

  // Teclas: 'cima' 'baixo' 'esquerda' 'direita' 'confirmar'
  tecla(k) {
    UI.usandoTeclado = true;
    const visiveis = this.itens.filter(it => !it.oculto && !it.desabilitado);
    if (!visiveis.length) return false;
    let atual = this.itens[this.foco];
    if (!atual || atual.oculto || atual.desabilitado) {
      atual = visiveis.find(i => i.primario) || visiveis[0];
      this.foco = this.itens.indexOf(atual);
      if (k !== 'confirmar') { Sound.sfx('menu'); return true; }
    }
    if (k === 'confirmar') { this.ativar(atual); return true; }
    if (atual.tipo === 'slider' && (k === 'esquerda' || k === 'direita')) {
      const v = atual.get() + (k === 'direita' ? atual.passo : -atual.passo);
      atual.set(Math.max(atual.min, Math.min(atual.max, Math.round(v / atual.passo) * atual.passo)));
      Sound.sfx('menu');
      return true;
    }
    // vizinho mais próximo na direção pedida
    const dir = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] }[k];
    if (!dir) return false;
    const cx = atual.x + atual.w / 2, cy = atual.y + atual.h / 2;
    let melhor = null, melhorD = Infinity;
    for (const it of visiveis) {
      if (it === atual) continue;
      const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 2) continue;
      const lateral = Math.abs(dx * dir[1] - dy * dir[0]);
      const d = along + lateral * 2.5;
      if (d < melhorD) { melhorD = d; melhor = it; }
    }
    if (melhor) { this.foco = this.itens.indexOf(melhor); Sound.sfx('menu'); return true; }
    return false;
  }

  desenhar(ctx, tempo) {
    this.itens.forEach((it, i) => {
      if (it.oculto) return;
      const focado = UI.usandoTeclado && i === this.foco;
      if (it.tipo === 'botao') this.desenharBotao(ctx, it, focado, tempo);
      else if (it.tipo === 'slider') this.desenharSlider(ctx, it, focado);
    });
  }

  desenharBotao(ctx, b, focado, tempo) {
    const apertado = this.apertado === b;
    const dy = apertado ? 1 : 0;
    const cor = b.cor || PAL.branco;
    let fundo = b.primario ? cor : PAL.fundo2;
    let borda = b.primario ? PAL.branco : (focado ? PAL.ouro : PAL.cinza);
    let corTexto = b.primario ? PAL.preto : PAL.branco;
    if (b.desabilitado) { fundo = PAL.fundo; borda = PAL.fundo3; corTexto = PAL.cinza; }
    if (b.primario && !b.desabilitado) {
      // botão principal "respira" pra chamar atenção
      const p = (Math.sin(tempo * 5) + 1) / 2;
      if (p > 0.5) borda = PAL.ouro;
      if (focado) borda = PAL.ouro;
    }
    // sombra
    ctx.fillStyle = PAL.preto;
    ctx.fillRect(b.x + 1, b.y + 2, b.w, b.h);
    UI.painel(ctx, b.x, b.y + dy, b.w, b.h, { fundo, borda });
    if (focado && !b.primario) {
      ctx.fillStyle = PAL.ouro;
      ctx.fillRect(b.x - 3, b.y + dy + Math.floor(b.h / 2) - 1, 2, 3);
    }
    const esc = b.escala || 1;
    const texto = typeof b.texto === 'function' ? b.texto() : b.texto;
    let conteudoW = texto ? Fonte.largura(texto, esc) : 0;
    const ic = b.icone ? b.icone : null;
    if (ic) conteudoW += ic.width * esc + (texto ? 4 : 0);
    let x = b.x + Math.round((b.w - conteudoW) / 2);
    const yMeio = b.y + dy + Math.round(b.h / 2);
    if (ic) {
      UI.sprite(ctx, ic, x, yMeio - Math.round(ic.height * esc / 2), esc);
      x += ic.width * esc + 4;
    }
    if (texto) UI.texto(ctx, texto, x, yMeio - Math.round(7 * esc / 2), { cor: b.corTexto || corTexto, escala: esc });
  }

  desenharSlider(ctx, s, focado) {
    const corRot = focado ? PAL.ouro : PAL.branco;
    if (s.rotulo) UI.texto(ctx, s.rotulo, s.x, s.y + 3, { cor: corRot });
    const tr = this.trilho(s);
    const f = (s.get() - s.min) / (s.max - s.min);
    const yT = s.y + 5;
    ctx.fillStyle = PAL.fundo3; ctx.fillRect(tr.x, yT, tr.w, 3);
    ctx.fillStyle = focado ? PAL.ouro : PAL.alma; ctx.fillRect(tr.x, yT, Math.round(tr.w * f), 3);
    const kx = Math.round(tr.x + tr.w * f);
    ctx.fillStyle = PAL.preto; ctx.fillRect(kx - 3, yT - 4, 7, 11);
    ctx.fillStyle = focado ? PAL.ouro : PAL.branco; ctx.fillRect(kx - 2, yT - 3, 5, 9);
    const txt = s.formato ? s.formato(s.get()) : Math.round(s.get() * 100) + '%';
    UI.texto(ctx, txt, s.x + s.w, s.y + 3, { cor: corRot, alinhar: 'direita' });
  }
}

// =============================================================================
// TELAS DE MENU
// =============================================================================

// Tenta tela cheia + paisagem no celular (só funciona dentro de um toque).
function tentarTelaCheia() {
  if (!Input.temToque()) return;
  try {
    const el = document.documentElement;
    const p = (el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' })) ||
      (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
    if (p && p.then) {
      p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ok */ } }).catch(() => {});
    }
  } catch (e) { /* navegador não deixa: tudo bem */ }
}

// Alma grande do logo/menus, quicando no ritmo.
function desenharAlmaGrande(c, x, y, escala, tempo, exp) {
  const bob = Math.round(Math.sin(tempo * 2.4) * 3);
  const piscar = (tempo % 3.7) < 0.12;
  c.globalAlpha = 0.35; c.fillStyle = PAL.preto;
  c.fillRect(Math.round(x - 4 * escala + bob / 2), Math.round(y + 6.5 * escala), Math.round(8 * escala - bob), escala);
  c.globalAlpha = 1;
  Avatar.desenhar(c, Avatar.atual(), x, y + bob, escala, { expressao: piscar ? 'piscando' : (exp || 'normal') });
}

// ------------------------------------------------------------- TÍTULO ------
UI.telas.titulo = (() => {
  let t0 = 0;
  const orbes = [];
  for (let i = 0; i < 10; i++) orbes.push({ x: Math.random() * 480, y: Math.random() * 270, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 25, d: 6 + ((Math.random() * 3) | 0) * 2 });

  function comecar() {
    Sound.iniciar();
    tentarTelaCheia();
    Sound.sfx('confirmar');
    const primeira = Levels.FASES[0];
    if (Save.dados.primeiraVez && Save.fase(primeira.id).vitorias === 0) Game.jogar(primeira);
    else Game.irPara('fases');
  }

  return {
    entrar() { t0 = Game.tempo; },
    atualizar(dt) {
      for (const o of orbes) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.y > 280) { o.y = -10; o.x = Math.random() * 480; }
        if (o.x < -10) o.x = 490; if (o.x > 490) o.x = -10;
      }
    },
    evento(e) {
      if (Game.tempo - t0 < 0.25) return;
      if (e.t === 'down' || (e.t === 'tecla' && !e.repetida)) comecar();
    },
    desenhar(c) {
      const tm = Game.tempo;
      const batida = tm * 100 / 60;
      Game.desenharFundo(c, batida, 0.3, PAL.alma, false);
      for (const o of orbes) {
        c.globalAlpha = 0.35;
        c.drawImage(Sprites.bala(o.d, PAL.perigo, PAL.perigoClaro, PAL.perigoEscuro), Math.round(o.x), Math.round(o.y));
      }
      c.globalAlpha = 1;
      // logo: D [alma] D G E
      const esc = 7;
      const cy = 74;
      const letras = ['D', null, 'D', 'G', 'E'];
      const larg = 5 * esc, gap = 2 * esc;
      const total = letras.length * larg + (letras.length - 1) * gap;
      let x = Math.round(240 - total / 2);
      letras.forEach((L, i) => {
        const dy = Math.round(Math.sin(tm * 3 + i * 0.7) * 2);
        if (L) {
          UI.texto(c, L, x + 3, cy + dy + 3, { escala: esc, cor: PAL.almaEscura });
          UI.texto(c, L, x, cy + dy, { escala: esc, cor: PAL.branco });
        } else {
          desenharAlmaGrande(c, x + larg / 2, cy + 3.5 * esc, 5, tm, 'normal');
        }
        x += larg + gap;
      });
      const pisca = Math.floor(tm * 2) % 2 === 0;
      if (pisca) {
        const txt = Input.temToque() ? t('toquePraComecar') : t('cliquePraComecar');
        UI.texto(c, txt, 240, 196, { escala: 2, alinhar: 'centro', cor: PAL.branco, sombra: PAL.preto });
      }
      UI.texto(c, t('versao', { n: CONFIG.versao.toUpperCase() }), 474, 260, { alinhar: 'direita', cor: PAL.cinza });
    },
  };
})();

// ------------------------------------------------------------- FASES -------
UI.telas.fases = (() => {
  const C = new Controles();
  let idx = 0, anim = 0, aviso = null;
  const swipe = { ativo: false, x0: 0, y0: 0, dx: 0, sobreCartao: false };
  const CART = { x: 90, y: 40, w: 300, h: 168 };

  function lista() { return Debug.ativo ? Levels.FASES.concat([Levels.LABORATORIO]) : Levels.FASES; }

  function mudar(d) {
    const L = lista();
    const n = Math.max(0, Math.min(L.length - 1, idx + d));
    if (n === idx) return;
    idx = n; anim = d * 120;
    Sound.sfx('menu');
  }

  function jogar() {
    const f = lista()[idx];
    Sound.sfx('confirmar');
    Game.jogar(f);
  }

  function montar() {
    C.limpar();
    C.botao({ x: 456, y: 6, w: 18, h: 16, icone: Sprites.desenho('engrenagem', PAL.branco), acao: () => Game.irPara('config', { voltar: 'fases' }) });
    C.botao({ x: 52, y: CART.y + CART.h / 2 - 20, w: 26, h: 40, icone: Sprites.desenho('setaEsq', PAL.branco), acao: () => mudar(-1) });
    C.botao({ x: 402, y: CART.y + CART.h / 2 - 20, w: 26, h: 40, icone: Sprites.desenho('setaDir', PAL.branco), acao: () => mudar(1) });
    const pri = C.botao({ x: 180, y: 216, w: 120, h: 22, texto: t('jogar'), escala: 2, primario: true, cor: PAL.alma, acao: jogar });
    C.botao({ x: 330, y: 6, w: 64, h: 16, texto: t('criar'), icone: Sprites.desenho('lapis', PAL.branco), acao: () => { Sound.sfx('confirmar'); Game.irPara('criadas'); } });
    C.botao({ x: 14, y: 218, w: 80, h: 20, texto: t('visual'), icone: Sprites.desenho('cabide', PAL.branco), acao: () => { Sound.sfx('confirmar'); Game.irPara('visual'); } });
    C.botao({ x: 386, y: 218, w: 80, h: 20, texto: t('missoes'), icone: Sprites.desenho('trofeu', PAL.ouro), acao: () => { Sound.sfx('confirmar'); Game.irPara('missoes'); } });
    C.focar(pri);
  }

  function desenharCartao(c, f, x, y, alpha) {
    const reg = Save.fase(f.id);
    const cor = COR_DIFICULDADE[f.dificuldade];
    c.globalAlpha = alpha;
    c.fillStyle = PAL.preto; c.fillRect(x + 3, y + 4, CART.w, CART.h);
    UI.painel(c, x, y, CART.w, CART.h, { fundo: PAL.fundo2, borda: reg.vitorias > 0 ? PAL.ouro : PAL.branco });
    c.fillStyle = cor; c.fillRect(x + 1, y + 1, CART.w - 2, 3);
    UI.sprite(c, Sprites.iconeDificuldade(f.dificuldade), x + 14, y + 16, 3);
    UI.texto(c, f.nome, x + 68, y + 20, { escala: 2, cor: PAL.branco });
    UI.texto(c, t('dificuldades.' + f.dificuldade), x + 68, y + 42, { cor });
    // estrelas que a fase dá
    const est = Levels.estrelasDe(f.dificuldade);
    const ganhou = reg.vitorias > 0;
    UI.texto(c, String(est), x + CART.w - 32, y + 20, { escala: 2, alinhar: 'direita', cor: ganhou ? PAL.ouro : PAL.cinzaClaro });
    UI.sprite(c, Sprites.estrela(ganhou), x + CART.w - 28, y + 18, 2);
    // melhor %
    const bx = x + 16, bw = CART.w - 32, by = y + 92;
    UI.texto(c, t('melhor', { n: reg.melhor }), bx, by - 14, { cor: PAL.cinzaClaro });
    if (reg.vitorias > 0) {
      UI.sprite(c, Sprites.desenho('check', PAL.ouro), x + CART.w - 70, by - 15, 1);
      UI.texto(c, t('completa'), x + CART.w - 16, by - 14, { alinhar: 'direita', cor: PAL.ouro });
    }
    c.fillStyle = PAL.preto; c.fillRect(bx - 1, by - 1, bw + 2, 10);
    UI.barra(c, bx, by, bw, 8, reg.melhor / 100, reg.vitorias > 0 ? PAL.ouro : cor, PAL.fundo3);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx, by, Math.round(bw * reg.melhor / 100), 1);
    // moedas secretas
    for (let i = 0; i < 3; i++) UI.sprite(c, Sprites.moeda(reg.moedas[i]), bx + i * 18, y + 122, 2);
    UI.texto(c, t('tentativas', { n: reg.tentativas }), x + CART.w - 16, y + 126, { alinhar: 'direita', cor: PAL.cinzaClaro });
    if (f.debug) UI.texto(c, t('rotuloDebug'), x + CART.w - 16, y + 146, { alinhar: 'direita', cor: PAL.perigo });
    c.globalAlpha = 1;
  }

  return {
    entrar(args) {
      const L = lista();
      const ultima = Save.dados.ultimaFase;
      const i = L.findIndex(f => f.id === ultima);
      idx = i >= 0 ? i : 0;
      // se acabou de vencer, já mostra a próxima
      if (args && args.de === 'jogo' && i >= 0 && Save.fase(L[i].id).vitorias > 0 && i + 1 < L.length && !L[i + 1].debug) idx = i + 1;
      anim = 0; aviso = null;
      montar();
      if (Sound.musicaAtual() !== 'menu' || !Sound.tocando()) Sound.tocar('menu', { loop: true });
    },
    atualizar(dt) {
      anim *= Math.exp(-14 * dt);
      if (Math.abs(anim) < 0.5) anim = 0;
    },
    evento(e) {
      if (e.t === 'tecla') {
        if (e.repetida && e.k === 'confirmar') return;
        if (e.k === 'esquerda') { mudar(-1); return; }
        if (e.k === 'direita') { mudar(1); return; }
        if (e.k === 'voltar') { Sound.sfx('voltar'); Game.irPara('titulo'); return; }
        if (e.k) C.tecla(e.k);
        return;
      }
      if (e.t === 'down') {
        if (C.ponteiro('down', e.x, e.y)) return;
        const dentro = e.x >= CART.x && e.x < CART.x + CART.w && e.y >= CART.y && e.y < CART.y + CART.h;
        swipe.ativo = true; swipe.x0 = e.x; swipe.y0 = e.y; swipe.dx = 0; swipe.sobreCartao = dentro;
        return;
      }
      if (e.t === 'move') {
        C.ponteiro('move', e.x, e.y);
        if (swipe.ativo) swipe.dx = e.x - swipe.x0;
        return;
      }
      if (e.t === 'up' || e.t === 'cancel') {
        if (C.ponteiro(e.t, e.x, e.y)) { swipe.ativo = false; return; }
        if (!swipe.ativo) return;
        swipe.ativo = false;
        if (e.t === 'cancel') return;
        if (Math.abs(swipe.dx) > 30) mudar(swipe.dx < 0 ? 1 : -1);
        else if (swipe.sobreCartao && Math.abs(e.y - swipe.y0) < 12) jogar();
      }
    },
    desenhar(c) {
      const tm = Game.tempo;
      const L = lista();
      const f = L[idx];
      const cor = COR_DIFICULDADE[f.dificuldade];
      Game.desenharFundo(c, tm * 92 / 60, 0.25, cor, false);
      UI.texto(c, t('fases'), 14, 10, { escala: 2, cor: PAL.branco, sombra: PAL.preto });
      const est = Save.estrelas(Levels.FASES);
      const max = Levels.FASES.reduce((a, x) => a + Levels.estrelasDe(x.dificuldade), 0);
      UI.texto(c, est + '/' + max, 440, 11, { alinhar: 'direita', cor: PAL.ouro, sombra: PAL.preto });
      UI.sprite(c, Sprites.estrela(true), 444, 10, 1);
      const arrasto = swipe.ativo && swipe.sobreCartao ? swipe.dx * 0.5 : 0;
      desenharCartao(c, f, Math.round(CART.x + anim + arrasto), CART.y, 1 - Math.min(0.6, Math.abs(anim) / 200));
      // pontinhos
      const n = L.length;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i === idx ? PAL.branco : PAL.cinza;
        c.fillRect(240 - n * 5 + i * 10 + 2, 246, i === idx ? 6 : 4, i === idx ? 6 : 4);
      }
      C.itens[1].oculto = idx === 0;
      C.itens[2].oculto = idx === n - 1;
      C.desenhar(c, tm);
      desenharCarteira(c, 324, 10);
      // bolinha no MISSÕES: tem recompensa esperando
      const m = Save.dados.missoes;
      if (m.diarias.concat(m.semanais).some(x => x.prog >= x.alvo && !x.pega) && Math.floor(tm * 3) % 2 === 0) {
        c.fillStyle = PAL.perigo; c.fillRect(461, 215, 6, 6); c.fillStyle = PAL.branco; c.fillRect(463, 216, 2, 3); c.fillRect(463, 220, 2, 1);
      }
      if (aviso) UI.texto(c, aviso, 240, 258, { alinhar: 'centro', cor: PAL.almaClara });
    },
  };
})();

// --------------------------------------------------------- CONFIGURAÇÕES ---
UI.telas.config = (() => {
  const C = new Controles();
  let voltarPara = 'fases';
  let confirmando = false, msg = null, msgT = 0, copiadoT = -9;

  // Copia o registro de erros (pra colar numa mensagem). Funciona mesmo sem a API nova.
  function copiarErros() {
    const txt = Erros.texto();
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      } catch (e) { /* ok */ }
    };
    try { navigator.clipboard.writeText(txt).catch(fallback); } catch (e) { fallback(); }
    copiadoT = Game.tempo;
  }
  const cfg = () => Save.config;
  const salvar = () => { Sound.volumes(); Save.gravarDepois(); };

  function atrasoTexto() {
    const c = cfg();
    if (typeof c.atrasoAudioMs === 'number') return t('atrasoValor', { n: c.atrasoAudioMs });
    return t('atrasoAuto', { n: Math.round(Sound.latenciaAuto() * 1000) });
  }
  function ajustarAtraso(d) {
    const c = cfg();
    const atual = typeof c.atrasoAudioMs === 'number' ? c.atrasoAudioMs : Math.round(Sound.latenciaAuto() * 1000);
    c.atrasoAudioMs = Math.max(-100, Math.min(600, atual + d));
    salvar();
  }

  function montar() {
    C.limpar();
    const x = 50, w = 380, rot = 170;
    let y = 40;
    C.slider({ x, y, w, rotulo: t('musica'), rotuloW: rot, get: () => cfg().volumeMusica, set: (v) => { cfg().volumeMusica = v; salvar(); } }); y += 22;
    C.slider({ x, y, w, rotulo: t('efeitos'), rotuloW: rot, get: () => cfg().volumeEfeitos, set: (v) => { cfg().volumeEfeitos = v; salvar(); Sound.sfx('raspao'); } }); y += 22;
    C.slider({ x, y, w, rotulo: t('sensibilidade'), rotuloW: rot, min: 0.5, max: 2.5, passo: 0.05,
      get: () => cfg().sensibilidadeToque, set: (v) => { cfg().sensibilidadeToque = v; salvar(); } }); y += 26;
    // atraso do áudio
    C.botao({ x: x + rot, y: y - 2, w: 16, h: 14, texto: '-', acao: () => ajustarAtraso(-10) });
    C.botao({ x: x + rot + 98, y: y - 2, w: 16, h: 14, texto: '+', acao: () => ajustarAtraso(10) });
    C.botao({ x: x + rot + 120, y: y - 2, w: 60, h: 14, texto: t('calibrar'), cor: PAL.alma, acao: () => Game.irPara('calibrar', { voltar: voltarPara }) });
    C.botao({ x: x + rot + 184, y: y - 2, w: 34, h: 14, texto: t('auto'), acao: () => { cfg().atrasoAudioMs = null; salvar(); } });
    y += 26;
    const toggle = (rotulo, chave) => {
      C.botao({ x: x + rot, y: y - 2, w: 90, h: 14, texto: () => (cfg()[chave] ? t('ligado') : t('desligado')),
        acao: () => { cfg()[chave] = !cfg()[chave]; salvar(); } });
      y += 22;
    };
    toggle(t('reduzirEfeitos'), 'reduzirEfeitos');
    toggle(t('pausaAuto'), 'pausaAuto');
    C.botao({ x: x + rot, y: y - 2, w: 90, h: 14, texto: () => (confirmando ? t('confirmarApagar') : t('apagar')), cor: PAL.perigo,
      corTexto: PAL.perigoClaro,
      acao: () => {
        if (!confirmando) { confirmando = true; return; }
        confirmando = false;
        Save.apagarTudo();
        Sound.volumes();
        msg = t('progressoApagado'); msgT = Game.tempo;
      } });
    y += 22;
    C.botao({ x: x + rot, y: y - 2, w: 60, h: 14, texto: () => (copiadoT > Game.tempo - 1.5 ? t('copiado') : t('copiar')), acao: copiarErros });
    C.botao({ x: x + rot + 66, y: y - 2, w: 50, h: 14, texto: t('limpar'), acao: () => Erros.limpar() });
    const voltar = C.botao({ x: 180, y: 238, w: 120, h: 18, texto: '← ' + t('voltar'), primario: true, cor: PAL.alma, acao: sair });
    C.focar(voltar);
    C.focar(C.itens[0]);
  }

  function sair() {
    Save.gravar();
    if (voltarPara === 'jogo') Game.irPara('jogo', { retomar: true });
    else Game.irPara(voltarPara);
  }

  return {
    entrar(args) {
      if (args && args.voltar) voltarPara = args.voltar;
      confirmando = false; msg = null;
      montar();
    },
    atualizar() {},
    evento(e) {
      if (e.t === 'tecla') {
        if (e.k === 'voltar') { Sound.sfx('voltar'); sair(); return; }
        if (e.k && !(e.repetida && e.k === 'confirmar')) C.tecla(e.k);
        return;
      }
      if (e.t === 'down' || e.t === 'move' || e.t === 'up' || e.t === 'cancel') C.ponteiro(e.t, e.x, e.y);
    },
    desenhar(c) {
      const tm = Game.tempo;
      Game.desenharFundo(c, -1, 0.1, PAL.alma, false);
      UI.texto(c, t('configuracoes'), 240, 12, { escala: 2, alinhar: 'centro', cor: PAL.branco, sombra: PAL.preto });
      const x = 50;
      let y = 40 + 22 * 2 + 26;
      UI.texto(c, t('atrasoAudio'), x, y + 1, { cor: PAL.branco });
      UI.texto(c, atrasoTexto(), x + 170 + 57, y + 1, { alinhar: 'centro', cor: PAL.almaClara });
      y += 26;
      UI.texto(c, t('reduzirEfeitos'), x, y + 1, { cor: PAL.branco }); y += 22;
      UI.texto(c, t('pausaAuto'), x, y + 1, { cor: PAL.branco }); y += 22;
      UI.texto(c, t('apagarProgresso'), x, y + 1, { cor: PAL.perigoClaro }); y += 22;
      UI.texto(c, t('registroErros', { n: Erros.lista.length }), x, y + 1, { cor: Erros.lista.length ? PAL.ouro : PAL.cinzaClaro });
      C.desenhar(c, tm);
      if (msg && tm - msgT < 2) UI.texto(c, msg, 240, 226, { alinhar: 'centro', cor: PAL.ouro });
      if (!Save.disponivel) UI.texto(c, t('saveIndisponivel'), 240, 260, { alinhar: 'centro', cor: PAL.perigo });
    },
  };
})();

// ------------------------------------------------------------ CALIBRAÇÃO ---
// Toque junto com o clique. A média do atraso entre o clique agendado no relógio
// do áudio e o seu toque = quanto o som demora pra chegar no seu ouvido.
UI.telas.calibrar = (() => {
  const C = new Controles();
  let voltarPara = 'fases';
  const toques = [];
  let resultado = null;
  let metro = null;

  function mediana(l) { const a = l.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; }

  function recomecar() {
    toques.length = 0; resultado = null;
    metro = Sound.metronomo(true, CONFIG.audio.calibracaoBpm);
    montar();
  }

  function tocar() {
    if (!metro || resultado !== null) return;
    const agora = Sound.agora();
    const beat = 60 / metro.bpm;
    // último clique agendado antes do toque (com tolerância pra quem toca adiantado)
    let ref = null;
    for (const tt of metro.tempos) if (tt <= agora + 0.1) ref = tt;
    if (ref === null) return;
    const off = agora - ref;
    if (off < -0.1 || off > beat - 0.1) return;
    toques.push(off);
    if (toques.length >= CONFIG.audio.calibracaoToques + 2) {
      const validos = toques.slice(2);                // os 2 primeiros são aquecimento
      resultado = Math.max(-100, Math.min(600, Math.round(mediana(validos) * 1000 - CONFIG.audio.calibracaoCompensacaoMs)));
      montar();
    }
  }

  function montar() {
    C.limpar();
    if (resultado !== null) {
      const s = C.botao({ x: 110, y: 214, w: 80, h: 18, texto: t('salvar'), primario: true, cor: PAL.alma,
        acao: () => { Save.config.atrasoAudioMs = resultado; Save.gravar(); sair(); } });
      C.botao({ x: 200, y: 214, w: 90, h: 18, texto: t('calibracaoRecomecar'), acao: recomecar });
      C.botao({ x: 300, y: 214, w: 70, h: 18, texto: t('voltar'), acao: sair });
      C.focar(s);
    } else {
      C.botao({ x: 200, y: 236, w: 80, h: 16, texto: t('voltar'), acao: sair });
    }
  }

  function sair() {
    Sound.metronomo(false);
    Game.irPara('config', { voltar: voltarPara });
  }

  return {
    entrar(args) {
      if (args && args.voltar) voltarPara = args.voltar;
      Sound.parar();
      recomecar();
    },
    sair() { Sound.metronomo(false); },
    atualizar() {},
    evento(e) {
      if (e.t === 'tecla') {
        if (e.repetida) return;
        if (e.k === 'voltar') { sair(); return; }
        if (resultado === null && (e.k === 'confirmar' || e.code === 'Space')) { tocar(); return; }
        if (e.k) C.tecla(e.k);
        return;
      }
      if (e.t === 'down') {
        if (C.ponteiro('down', e.x, e.y)) return;
        tocar();
        return;
      }
      C.ponteiro(e.t, e.x, e.y);
    },
    desenhar(c) {
      const tm = Game.tempo;
      Game.desenharFundo(c, -1, 0.1, PAL.alma, false);
      UI.texto(c, t('calibracaoTitulo'), 240, 12, { escala: 2, alinhar: 'centro', cor: PAL.branco, sombra: PAL.preto });
      UI.texto(c, t('calibracaoInstrucao'), 240, 34, { alinhar: 'centro', cor: PAL.almaClara });
      // círculo que pisca na batida, usando o atraso atual (ou o medido)
      const lat = resultado !== null ? resultado / 1000 : Sound.latencia();
      let fase = 1;
      if (metro && metro.tempos.length) {
        const beat = 60 / metro.bpm;
        const agora = Sound.agora() - lat;
        let ref = null;
        for (const tt of metro.tempos) if (tt <= agora) ref = tt;
        if (ref !== null) fase = (agora - ref) / beat;
      }
      const br = Math.max(0, 1 - fase * 4);
      const r = 18 + Math.round(br * 6);
      c.fillStyle = br > 0.05 ? PAL.alma : PAL.fundo3;
      for (let y = -r; y <= r; y++) {
        const w = Math.round(Math.sqrt(r * r - y * y));
        c.fillRect(240 - w, 96 + y, w * 2, 1);
      }
      UI.texto(c, t('calibracaoDica'), 240, 128, { alinhar: 'centro', cor: PAL.cinzaClaro });
      // régua de toques: -100 ms a +500 ms
      const rx = 90, rw = 300, ry = 156;
      c.fillStyle = PAL.fundo3; c.fillRect(rx, ry, rw, 2);
      const px = (ms) => rx + Math.round((ms + 100) / 600 * rw);
      c.fillStyle = PAL.cinza; c.fillRect(px(0), ry - 4, 1, 10);
      UI.texto(c, '0', px(0), ry + 8, { alinhar: 'centro', cor: PAL.cinza });
      UI.texto(c, '500', px(500) - 1, ry + 8, { alinhar: 'centro', cor: PAL.cinza });
      toques.forEach((o, i) => {
        c.fillStyle = i < 2 ? PAL.cinza : PAL.ouro;
        c.fillRect(px(o * 1000), ry - 3, 1, 8);
      });
      UI.texto(c, t('calibracaoProgresso', { n: Math.min(toques.length, CONFIG.audio.calibracaoToques + 2), max: CONFIG.audio.calibracaoToques + 2 }), 240, 178, { alinhar: 'centro', cor: PAL.branco });
      if (resultado !== null) {
        c.fillStyle = PAL.alma; c.fillRect(px(resultado), ry - 6, 2, 14);
        UI.texto(c, t('calibracaoResultado', { n: resultado }), 240, 194, { alinhar: 'centro', cor: PAL.alma, escala: 1 });
      } else {
        UI.texto(c, t('calibracaoAtual', { n: Math.round(Sound.latencia() * 1000) }), 240, 194, { alinhar: 'centro', cor: PAL.cinzaClaro });
      }
      C.desenhar(c, tm);
    },
  };
})();
