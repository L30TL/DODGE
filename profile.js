'use strict';
// =============================================================================
// DODGE — profile.js
// Telas da progressão (Fase 3):
//   VISUAL   — guarda-roupa + loja + coleção: monta a alma em camadas, compra peças
//              com moedas comuns (só visual!), escolhe a cor de cada camada.
//   MISSÕES  — missões do dia e da semana (pegar a recompensa) e as conquistas.
// As regras ficam no progresso.js (puro); aqui é só tela.
// Na Fase 4 entram o Dodge ID e o cartão de perfil público.
// =============================================================================

const Profile = { disponivel: true };

// Moedas comuns no canto de cima (todas as telas da progressão usam).
function desenharCarteira(c, xDireita, y) {
  const txt = String(Save.dados.moedas);
  UI.texto(c, txt, xDireita - 10, y + 1, { alinhar: 'direita', cor: PAL.branco, sombra: PAL.preto });
  c.drawImage(Sprites.desenho('moedinha', PAL.cinza), xDireita - 7, y);
}

// ---------------------------------------------------------------- VISUAL ----
UI.telas.visual = (() => {
  const C = new Controles();
  let cat = 'corpo', sel = null, prova = null, aviso = null, avisoT = -9, voltar = 'fases';
  const nomePeca = (id) => t('pecas.' + id);
  const tem = (id) => !!Save.dados.pecas[id];
  const pecasDe = (k) => Object.keys(Avatar.PECAS).filter(id => Avatar.PECAS[id].tipo === k);
  const conquistaDa = (id) => Progresso.CONQUISTAS.find(cq => cq.peca === id);
  const mostrar = (txt) => { aviso = txt; avisoT = Game.tempo; };

  // O visual de prova vira o salvo (só com peças que a pessoa tem).
  function salvarVisual() {
    const v = prova.map(cm => (tem(cm.peca) ? cm : Avatar.camada(Save.dados.avatar, Avatar.PECAS[cm.peca].tipo)));
    Save.dados.avatar = JSON.parse(JSON.stringify(Avatar.normalizar(v)));
    Save.gravarDepois();
  }
  function camadaSel() { return prova.find(cm => Avatar.PECAS[cm.peca].tipo === cat); }

  function escolher(id) {
    sel = id;
    const cm = camadaSel();
    const p = Avatar.PECAS[id];
    cm.peca = id;
    if (p.corPadrao && !tem(id)) cm.cor = p.corPadrao;
    if (tem(id)) salvarVisual();
    Sound.sfx('menu');
    montar();
  }

  function comprar() {
    const p = Avatar.PECAS[sel];
    const r = Progresso.comprar(Save.dados, sel, p);
    if (r === 'ok') {
      Sound.sfx('moeda');
      mostrar(t('comprou'));
      Game.progresso({ tipo: 'comprou' });
      salvarVisual();
      Save.gravar();
    } else if (r === 'sem-moedas') {
      Sound.sfx('voltar');
      mostrar(t('faltamMoedas', { n: p.preco - Save.dados.moedas }));
    }
    montar();
  }

  function corEscolhida(cor) {
    if (cat === 'corpo' && Avatar.PROIBIDAS_NO_CORPO.includes(cor)) { mostrar(t('corProibida')); Sound.sfx('voltar'); return; }
    camadaSel().cor = cor;
    if (tem(camadaSel().peca)) salvarVisual();
    Sound.sfx('menu');
  }

  function montar() {
    C.limpar();
    const ic = (n, cor) => Sprites.desenho(n, cor || PAL.branco);
    C.botao({ x: 4, y: 6, w: 20, h: 16, icone: ic('setaEsq'), acao: () => { Sound.sfx('voltar'); Game.irPara(voltar); } });
    // categorias
    Avatar.CATEGORIAS.forEach((k, i) => {
      C.botao({ x: 178 + i * 42, y: 28, w: 40, h: 14, texto: t('categorias.' + k).slice(0, 6), primario: k === cat, cor: PAL.alma,
        acao: () => { cat = k; sel = camadaSel().peca; montar(); } });
    });
    // peças da categoria (grade 5 × 2)
    pecasDe(cat).forEach((id, i) => {
      C.botao({ x: 178 + (i % 5) * 58, y: 48 + Math.floor(i / 5) * 62, w: 54, h: 58, texto: '', primario: id === sel, cor: PAL.ouro,
        acao: () => escolher(id), _peca: id });
    });
    // cores
    Avatar.CORES.forEach((cor, i) => {
      C.botao({ x: 178 + (i % 8) * 24, y: 178 + Math.floor(i / 8) * 22, w: 20, h: 18, texto: '', cor, _cor: cor,
        acao: () => corEscolhida(cor) });
    });
    // ação da peça escolhida
    const p = Avatar.PECAS[sel];
    if (p && !tem(sel) && p.preco) {
      C.botao({ x: 20, y: 236, w: 136, h: 18, texto: t('comprar') + ' ' + p.preco, icone: ic('moedinha', PAL.preto), primario: true,
        cor: Save.dados.moedas >= p.preco ? PAL.ouro : PAL.cinza, acao: comprar });
    }
  }

  return {
    entrar(args) {
      voltar = (args && args.voltar) || 'fases';
      prova = JSON.parse(JSON.stringify(Avatar.atual()));
      sel = camadaSel().peca;
      montar();
    },
    sair() { prova = null; },
    atualizar() {},
    evento(e) {
      if (e.t === 'tecla') {
        if (e.repetida && e.k === 'confirmar') return;
        if (e.k === 'voltar') { Sound.sfx('voltar'); Game.irPara(voltar); return; }
        if (e.k) C.tecla(e.k);
        return;
      }
      if (e.t === 'down' || e.t === 'move' || e.t === 'up' || e.t === 'cancel') C.ponteiro(e.t, e.x, e.y);
    },
    desenhar(c) {
      const tm = Game.tempo;
      Game.desenharFundo(c, tm * 92 / 60, 0.2, Avatar.corPrincipal(prova), false);
      UI.texto(c, t('visual'), 30, 10, { escala: 2, cor: PAL.branco, sombra: PAL.preto });
      desenharCarteira(c, 476, 10);
      const donas = Object.keys(Avatar.PECAS).filter(tem).length;
      UI.texto(c, t('pecasColecao', { n: donas, total: Object.keys(Avatar.PECAS).length }), 380, 11, { alinhar: 'direita', cor: PAL.cinzaClaro, sombra: PAL.preto });
      // a alma grande (com a peça de prova)
      UI.painel(c, 10, 28, 156, 204, { fundo: PAL.fundo2, borda: PAL.fundo3 });
      const pulo = Math.round(Math.abs(Math.sin(tm * 2.4)) * 4);
      c.fillStyle = PAL.preto; c.globalAlpha = 0.35; c.fillRect(58, 150, 60, 4); c.globalAlpha = 1;
      Avatar.desenhar(c, prova, 88, 104 - pulo, 7, { expressao: (tm % 3.7) < 0.12 ? 'piscando' : 'normal' });
      const p = Avatar.PECAS[sel];
      if (p) {
        UI.texto(c, nomePeca(sel), 88, 172, { alinhar: 'centro', cor: PAL.branco });
        let st = null, cor = PAL.cinzaClaro;
        if (tem(sel)) { st = t('usando'); cor = PAL.verde; }
        else if (p.trava) { st = t('liberaCom'); const cq = conquistaDa(sel); if (cq) UI.texto(c, t('conquistas.' + cq.id + '.nome'), 88, 200, { alinhar: 'centro', cor: PAL.ouro }); }
        if (st) UI.texto(c, st, 88, 186, { alinhar: 'centro', cor });
      }
      C.desenhar(c, tm);
      // miniaturas das peças por cima dos botões
      for (const b of C.itens) {
        if (b._peca) {
          const id = b._peca, dono = tem(id), pp = Avatar.PECAS[id];
          const v = prova.map(cm => (Avatar.PECAS[cm.peca].tipo === cat ? { peca: id, cor: dono || !pp.corPadrao ? cm.cor : pp.corPadrao } : cm));
          if (!dono && pp.trava) {
            // silhueta do que falta
            c.globalAlpha = 0.5; Avatar.desenhar(c, v, b.x + 27, b.y + 24, 3, {}); c.globalAlpha = 1;
            c.drawImage(Sprites.desenho('cadeado', PAL.cinzaClaro), b.x + 4, b.y + 4);
          } else Avatar.desenhar(c, v, b.x + 27, b.y + 24, 3, {});
          if (!dono && pp.preco) {
            c.drawImage(Sprites.desenho('moedinha', PAL.cinza), b.x + 6, b.y + 46);
            UI.texto(c, String(pp.preco), b.x + 15, b.y + 46, { cor: Save.dados.moedas >= pp.preco ? PAL.ouro : PAL.cinza });
          }
        } else if (b._cor) {
          c.fillStyle = b._cor; c.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
          if (camadaSel().cor === b._cor) { c.fillStyle = PAL.branco; c.fillRect(b.x + 7, b.y + b.h - 2, b.w - 14, 2); }
        }
      }
      if (aviso && tm - avisoT < 2.2) UI.texto(c, aviso, 324, 226, { alinhar: 'centro', cor: PAL.ouro, sombra: PAL.preto });
    },
  };
})();

// --------------------------------------------------------------- MISSÕES ----
UI.telas.missoes = (() => {
  const C = new Controles();
  let rolagem = 0, voltar = 'fases';
  const VIS = 7;

  function tempoAte(ms) {
    const s = Math.max(0, (ms - Date.now()) / 1000);
    if (s >= 86400 * 2) return t('dias', { n: Math.floor(s / 86400) });
    return t('horasMin', { h: Math.floor(s / 3600), m: Math.floor(s % 3600 / 60) });
  }
  const txtMissao = (x) => t('missoesTxt.' + x.id, { n: x.alvo });

  function montar() {
    C.limpar();
    const ic = (n, cor) => Sprites.desenho(n, cor || PAL.branco);
    C.botao({ x: 4, y: 6, w: 20, h: 16, icone: ic('setaEsq'), acao: () => { Sound.sfx('voltar'); Game.irPara(voltar); } });
    const m = Progresso.atualizarMissoes(Save.dados, Date.now());
    const linha = (tipo, x, i, y) => {
      if (x.prog >= x.alvo && !x.pega) {
        C.botao({ x: 186, y: y + 2, w: 56, h: 16, texto: t('pegar', { n: x.moedas }), primario: true, cor: PAL.ouro,
          acao: () => { const n = Progresso.resgatar(Save.dados, tipo, i, Date.now()); if (n) { Sound.sfx('moeda'); Save.gravar(); } montar(); } });
      }
    };
    m.diarias.forEach((x, i) => linha('diarias', x, i, 44 + i * 30));
    m.semanais.forEach((x, i) => linha('semanais', x, i, 158 + i * 30));
    const n = Progresso.CONQUISTAS.length;
    if (n > VIS) {
      C.botao({ x: 440, y: 6, w: 16, h: 16, icone: ic('setaEsq'), acao: () => { rolagem = Math.max(0, rolagem - VIS); montar(); } });
      C.botao({ x: 458, y: 6, w: 16, h: 16, icone: ic('setaDir'), acao: () => { rolagem = Math.min(n - VIS, rolagem + VIS); montar(); } });
    }
  }

  function desenharMissao(c, x, y) {
    const feita = x.prog >= x.alvo;
    UI.painel(c, 10, y, 236, 26, { fundo: PAL.fundo2, borda: x.pega ? PAL.fundo3 : feita ? PAL.ouro : PAL.cinza });
    UI.texto(c, txtMissao(x), 16, y + 5, { cor: x.pega ? PAL.cinza : PAL.branco });
    UI.barra(c, 16, y + 16, 160, 4, x.prog / x.alvo, feita ? PAL.ouro : PAL.alma, PAL.fundo3);
    if (x.pega) UI.texto(c, t('pego'), 238, y + 9, { alinhar: 'direita', cor: PAL.verde });
    else if (!feita) {
      c.drawImage(Sprites.desenho('moedinha', PAL.cinza), 214, y + 9);
      UI.texto(c, String(x.moedas), 212, y + 10, { alinhar: 'direita', cor: PAL.cinzaClaro });
    }
  }

  return {
    entrar(args) { voltar = (args && args.voltar) || 'fases'; rolagem = 0; montar(); },
    atualizar() {},
    evento(e) {
      if (e.t === 'tecla') {
        if (e.repetida && e.k === 'confirmar') return;
        if (e.k === 'voltar') { Sound.sfx('voltar'); Game.irPara(voltar); return; }
        if (e.k) C.tecla(e.k);
        return;
      }
      if (e.t === 'roda') { rolagem = Math.max(0, Math.min(Progresso.CONQUISTAS.length - VIS, rolagem + (e.dy > 0 ? 1 : -1))); return; }
      if (e.t === 'down' || e.t === 'move' || e.t === 'up' || e.t === 'cancel') C.ponteiro(e.t, e.x, e.y);
    },
    desenhar(c) {
      const tm = Game.tempo;
      Game.desenharFundo(c, tm * 92 / 60, 0.2, PAL.ouro, false);
      UI.texto(c, t('missoes'), 30, 10, { escala: 2, cor: PAL.branco, sombra: PAL.preto });
      desenharCarteira(c, 236, 10);
      const m = Save.dados.missoes;
      UI.texto(c, t('hoje'), 12, 32, { cor: PAL.alma, sombra: PAL.preto });
      UI.texto(c, t('trocaEm', { t: tempoAte(Progresso.fimDoDia(Date.now())) }), 246, 32, { alinhar: 'direita', cor: PAL.cinza });
      m.diarias.forEach((x, i) => desenharMissao(c, x, 44 + i * 30));
      UI.texto(c, t('estaSemana'), 12, 146, { cor: PAL.alma, sombra: PAL.preto });
      UI.texto(c, t('trocaEm', { t: tempoAte(Progresso.fimDaSemana(Date.now())) }), 246, 146, { alinhar: 'direita', cor: PAL.cinza });
      m.semanais.forEach((x, i) => desenharMissao(c, x, 158 + i * 30));
      // conquistas
      const L = Progresso.CONQUISTAS, feitas = L.filter(cq => Save.dados.conquistas[cq.id]).length;
      UI.texto(c, t('conquistasTitulo', { n: feitas, total: L.length }), 256, 32, { cor: PAL.ouro, sombra: PAL.preto });
      L.slice(rolagem, rolagem + VIS).forEach((cq, k) => {
        const y = 44 + k * 30, ok = !!Save.dados.conquistas[cq.id];
        UI.painel(c, 254, y, 218, 26, { fundo: PAL.fundo2, borda: ok ? PAL.ouro : PAL.fundo3 });
        c.drawImage(Sprites.desenho('trofeu', ok ? PAL.ouro : PAL.fundo3), 260, y + 9);
        UI.texto(c, t('conquistas.' + cq.id + '.nome'), 272, y + 5, { cor: ok ? PAL.branco : PAL.cinzaClaro });
        UI.texto(c, t('conquistas.' + cq.id + '.desc'), 272, y + 15, { cor: PAL.cinza });
        UI.texto(c, t('recompensa', { n: cq.moedas }), 466, y + 5, { alinhar: 'direita', cor: ok ? PAL.cinza : PAL.ouroEscuro });
        if (cq.peca) c.drawImage(Sprites.desenho('cabide', ok ? PAL.cinza : PAL.alma), 459, y + 15);
      });
      C.desenhar(c, tm);
    },
  };
})();
