// Progressão: moedas, missões, conquistas, loja e o save v3 (com migração: ninguém perde nada).
const test = require('node:test');
const assert = require('node:assert');
const { carregar, armazenamentoFalso, json } = require('./carregar');

const ARQ = ['config.js', 'patterns.js', 'sim.js', 'levels.js', 'save.js', 'progresso.js'];
function mundo(inicial) {
  const m = carregar(ARQ);
  const S = m.Save;
  S.armazenamento = armazenamentoFalso(inicial);
  S.carregar();
  return { S, P: m.pegar('Progresso'), CONFIG: m.CONFIG };
}
const DIA = new Date(2026, 10, 17, 15, 0).getTime();          // terça, 17/11/2026

test('save v2 → v3: quem já jogava ganha as moedas do que já fez, e nada se perde', () => {
  const v2 = { versao: 2, rev: 7, primeiraVez: false, config: { volumeMusica: 0.4 },
    fases: { despertar: { melhor: 100, tentativas: 12, vitorias: 1, moedas: [true, false, false] },
      correnteza: { melhor: 45, tentativas: 30, vitorias: 0 }, 'u-x': { melhor: 80, vitorias: 3 } },
    stats: { tentativas: 42, raspoes: 200, mortes: 40, vitorias: 1 } };
  const { S } = mundo({ 'dodge.save': JSON.stringify(v2) });
  const d = S.dados;
  assert.strictEqual(d.versao, 3);
  assert.strictEqual(d.moedas, 100 + 40 + 45 + 200);              // fase criada (u-x) não conta
  assert.strictEqual(d.fases.despertar.tentativas, 12);
  assert.strictEqual(d.fases.despertar.moedas[0], true);
  assert.strictEqual(d.config.volumeMusica, 0.4);
  assert.strictEqual(d.stats.raspoes, 200);
  assert.ok(d.pecas['corpo.redondo'] && d.pecas['olhos.ponto']);
  // e gravado de volta já na v3 (relendo, continua igual)
  S.gravar();
  const de = mundo(Object.fromEntries(S.armazenamento.mapa)).S.dados;
  assert.strictEqual(de.moedas, d.moedas);
});

test('missões do dia: as mesmas o dia todo, trocam na virada, uma semana começa na segunda', () => {
  const { S, P } = mundo();
  const d = S.dados;
  const a = json(P.atualizarMissoes(d, DIA).diarias);
  assert.strictEqual(d.missoes.diarias.length, 3);
  assert.strictEqual(d.missoes.semanais.length, 2);
  assert.strictEqual(json(P.atualizarMissoes(d, DIA + 3600e3).diarias), a);     // mesmo dia
  P.atualizarMissoes(d, DIA + 86400e3);
  assert.strictEqual(d.missoes.dia, '2026-11-18');
  assert.strictEqual(P.semanaDe(DIA), '2026-11-16');                             // segunda
  assert.strictEqual(P.semanaDe(new Date(2026, 10, 22, 23, 0).getTime()), '2026-11-16'); // domingo
  assert.strictEqual(P.semanaDe(new Date(2026, 10, 23, 1, 0).getTime()), '2026-11-23');
});

test('missões: contam, completam uma vez, a recompensa só sai uma vez', () => {
  const { S, P } = mundo();
  const d = S.dados;
  P.atualizarMissoes(d, DIA);
  d.missoes.diarias = [{ id: 'raspoes', alvo: 3, moedas: 30, prog: 0, pega: false },
    { id: 'pct', alvo: 70, moedas: 45, prog: 0, pega: false }, { id: 'combo', alvo: 3, moedas: 35, prog: 0, pega: false }];
  assert.strictEqual(P.resgatar(d, 'diarias', 0, DIA), 0);                        // ainda não completou
  let feitas = [];
  for (let i = 0; i < 5; i++) feitas = feitas.concat(P.registrar(d, { tipo: 'raspao' }, DIA).missoes);
  assert.strictEqual(feitas.length, 1);
  P.registrar(d, { tipo: 'morte', pct: 55 }, DIA);
  P.registrar(d, { tipo: 'morte', pct: 30 }, DIA);
  assert.strictEqual(d.missoes.diarias[1].prog, 55);                              // "chegar a": guarda o máximo
  P.registrar(d, { tipo: 'morte', pct: 72 }, DIA);
  assert.strictEqual(d.missoes.diarias[1].prog, 70);
  P.registrar(d, { tipo: 'combo', n: 4 }, DIA);
  assert.strictEqual(d.stats.comboMax, 4);
  const antes = d.moedas;
  assert.strictEqual(P.resgatar(d, 'diarias', 0, DIA), 30);
  assert.strictEqual(P.resgatar(d, 'diarias', 0, DIA), 0);
  assert.strictEqual(d.moedas, antes + 30);
  assert.strictEqual(d.stats.missoesFeitas, 1);
});

test('conquistas: liberam uma vez, pagam a recompensa e dão a peça (também pro que já tinha feito)', () => {
  const { S, P } = mundo();
  const d = S.dados;
  d.fases.prensa = S.novaFase(); d.fases.prensa.vitorias = 1;
  d.stats.vitorias = 1;
  const novas = P.conferirConquistas(d, DIA).map(c => c.id);
  assert.ok(novas.includes('prensa') && novas.includes('primeiraVitoria'));
  assert.ok(d.pecas['cabeca.coroa']);
  const moedas = d.moedas;
  assert.strictEqual(P.conferirConquistas(d, DIA).length, 0);
  assert.strictEqual(d.moedas, moedas);
});

test('loja: compra com moedas; sem moedas, travada ou repetida não compra', () => {
  const { S, P } = mundo();
  const d = S.dados;
  d.moedas = 100;
  assert.strictEqual(P.comprar(d, 'cabeca.bone', { preco: 60 }), 'ok');
  assert.strictEqual(d.moedas, 40);
  assert.strictEqual(P.comprar(d, 'cabeca.bone', { preco: 60 }), 'tem');
  assert.strictEqual(P.comprar(d, 'cabeca.topete', { preco: 60 }), 'sem-moedas');
  assert.strictEqual(P.comprar(d, 'cabeca.coroa', { trava: 'conquista' }), 'travada');
  assert.strictEqual(d.moedas, 40);
});

test('save v3 com lixo nos campos novos: limpa sem perder o resto', () => {
  const lixo = { versao: 3, moedas: -50, moedasTotal: 'x', pecas: { 'corpo.quadrado': true, 'x': 'sim' }, conquistas: { a: 'b', prensa: 5 },
    missoes: { dia: 99, diarias: [null, { id: 'raspoes', alvo: -3, prog: NaN }] }, avatar: [{ peca: 'corpo.redondo', cor: 'red' }, { peca: 'olhos.ponto', cor: '#00FF00' }],
    fases: { despertar: { melhor: 50 } } };
  const { S } = mundo({ 'dodge.save': JSON.stringify(lixo) });
  const d = S.dados;
  assert.strictEqual(d.moedas, 0);
  assert.ok(d.pecas['corpo.quadrado'] && !d.pecas.x);
  assert.strictEqual(json(Object.keys(d.conquistas)), json(['prensa']));
  assert.strictEqual(d.missoes.dia, '');
  assert.strictEqual(d.missoes.diarias.length, 1);
  assert.strictEqual(d.missoes.diarias[0].alvo, 1);
  assert.strictEqual(json(d.avatar), json([{ peca: 'olhos.ponto', cor: '#00ff00' }]));
  assert.strictEqual(d.fases.despertar.melhor, 50);
});
