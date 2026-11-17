// Save: salvar, carregar, migrar, recuperar de corrompido, bloqueio, cota cheia, duas abas.
const test = require('node:test');
const assert = require('node:assert');
const { carregar, armazenamentoFalso } = require('./carregar');

function novoSave(inicial, op) {
  const J = carregar();
  J.Save.armazenamento = armazenamentoFalso(inicial, op);
  return J;
}
// save v1 como a Fase 1 gravava
const V1 = JSON.stringify({ versao: 1, primeiraVez: false, config: { volumeMusica: 0.4, volumeEfeitos: 0.9, atrasoAudioMs: 120 },
  fases: { despertar: { melhor: 87, tentativas: 143, vitorias: 0, moedas: [true, false, false], mortes: new Array(100).fill(1) } },
  stats: { tentativas: 143, raspoes: 50, mortes: 140, vitorias: 0, segundosJogados: 0 }, ultimaFase: 'despertar' });

test('salvar e carregar: ida e volta sem perder nada', () => {
  const { Save } = novoSave();
  Save.carregar();
  const reg = Save.fase('prensa');
  reg.melhor = 42; reg.tentativas = 7; reg.moedas[2] = true;
  Save.config.volumeMusica = 0.33;
  assert.ok(Save.gravar());
  const txt = Save.armazenamento.getItem(Save.CHAVE);
  const { Save: S2 } = novoSave({ [Save.CHAVE]: txt });
  S2.carregar();
  assert.strictEqual(S2.fase('prensa').melhor, 42);
  assert.strictEqual(S2.fase('prensa').tentativas, 7);
  assert.strictEqual(S2.fase('prensa').moedas[2], true);
  assert.strictEqual(S2.config.volumeMusica, 0.33);
});

test('migra o save da Fase 1 (v1) sem perder nada e mantém o original como backup', () => {
  const { Save } = novoSave({ 'dodge.save.v1': V1 });
  Save.carregar();
  assert.strictEqual(Save.dados.versao, Save.VERSAO);
  assert.strictEqual(Save.fase('despertar').melhor, 87);
  assert.strictEqual(Save.fase('despertar').tentativas, 143);
  assert.strictEqual(Save.fase('despertar').moedas[0], true);
  assert.strictEqual(Save.config.atrasoAudioMs, 120);
  assert.strictEqual(Save.dados.primeiraVez, false);
  assert.ok(Save.armazenamento.getItem(Save.CHAVE), 'gravou no formato novo');
  assert.strictEqual(Save.armazenamento.getItem('dodge.save.v1'), V1, 'o v1 continua intacto');
});

test('save corrompido: guarda uma cópia e recupera do backup (B03)', () => {
  const bom = (() => { const { Save } = novoSave({ 'dodge.save.v1': V1 }); Save.carregar(); return JSON.stringify(Save.dados); })();
  const { Save } = novoSave({ [ 'dodge.save' ]: '{"fases":{"despertar":{"melhor":9', 'dodge.save.backup': bom });
  Save.carregar();
  assert.strictEqual(Save.recuperado, 'backup');
  assert.strictEqual(Save.fase('despertar').melhor, 87);
  const copias = Array.from(Save.armazenamento.mapa.keys()).filter(k => k.startsWith(Save.PREFIXO_CORROMPIDO));
  assert.strictEqual(copias.length, 1);
  assert.strictEqual(Save.armazenamento.getItem(copias[0]), '{"fases":{"despertar":{"melhor":9');
});

test('save corrompido sem backup: recupera do v1 se existir; senão começa do zero sem apagar a cópia', () => {
  const { Save } = novoSave({ 'dodge.save': 'lixo', 'dodge.save.v1': V1 });
  Save.carregar();
  assert.strictEqual(Save.recuperado, 'backup');
  assert.strictEqual(Save.fase('despertar').melhor, 87);
  const { Save: S2 } = novoSave({ 'dodge.save': '[1,2,3]' });
  S2.carregar();
  assert.strictEqual(S2.recuperado, 'perdido');
  assert.strictEqual(S2.fase('despertar').melhor, 0);
  assert.ok(Array.from(S2.armazenamento.mapa.keys()).some(k => k.startsWith(S2.PREFIXO_CORROMPIDO)));
});

test('campos inválidos são corrigidos, não derrubam o jogo', () => {
  const ruim = JSON.stringify({ versao: 2, config: { volumeMusica: 'alto', sensibilidadeToque: NaN, atrasoAudioMs: 99999 },
    fases: { x: { melhor: 500, tentativas: -3, moedas: 'sim', mortes: [1, 2] }, y: null }, stats: { mortes: 'muitas' } });
  const { Save } = novoSave({ 'dodge.save': ruim });
  Save.carregar();
  const x = Save.fase('x');
  assert.strictEqual(x.melhor, 100);
  assert.strictEqual(x.tentativas, 0);
  assert.strictEqual(x.mortes.length, 100);
  assert.strictEqual(x.moedas.length, 3);
  assert.strictEqual(Save.config.atrasoAudioMs, 600);
  assert.ok(Number.isFinite(Save.config.sensibilidadeToque));
  assert.strictEqual(Save.dados.stats.mortes, 0);
});

test('armazenamento bloqueado ou cheio: o jogo segue na memória sem erro', () => {
  const { Save } = novoSave({}, { bloqueado: true });
  assert.doesNotThrow(() => Save.carregar());
  assert.strictEqual(Save.disponivel, false);
  Save.fase('despertar').melhor = 10;
  assert.doesNotThrow(() => Save.gravar());
  const { Save: S2 } = novoSave({}, { cheio: true });
  S2.carregar();
  assert.strictEqual(S2.gravar(), false);
  assert.strictEqual(S2.disponivel, false);
});

test('duas abas: o progresso das duas é mesclado (B16)', () => {
  const { Save } = novoSave();
  Save.carregar();
  const a = Save.completar({ rev: 5, fases: { despertar: { melhor: 60, tentativas: 10, moedas: [true, false, false] } }, stats: { mortes: 9 } });
  const b = Save.completar({ rev: 7, fases: { despertar: { melhor: 40, tentativas: 12, vitorias: 1, moedas: [false, false, true] }, prensa: { melhor: 5 } }, stats: { mortes: 3 } });
  const m = Save.mesclar(a, b);
  assert.strictEqual(m.fases.despertar.melhor, 60);
  assert.strictEqual(m.fases.despertar.tentativas, 12);
  assert.strictEqual(m.fases.despertar.vitorias, 1);
  assert.deepStrictEqual(Array.from(m.fases.despertar.moedas), [true, false, true]);
  assert.strictEqual(m.fases.prensa.melhor, 5);
  assert.strictEqual(m.stats.mortes, 9);
  assert.ok(m.rev > 7);
});

test('regras: recorde, trapaça, estrelas e moedas', () => {
  const { Save, Levels } = novoSave();
  Save.carregar();
  const reg = Save.fase('despertar');
  assert.strictEqual(Save.registrarMorte(reg, 30, false).recorde, true);
  assert.strictEqual(Save.registrarMorte(reg, 20, false).recorde, false);
  assert.strictEqual(Save.registrarMorte(reg, 90, true).recorde, false, 'debug não conta recorde');
  assert.strictEqual(reg.melhor, 30);
  assert.strictEqual(reg.mortes[30] + reg.mortes[20] + reg.mortes[90], 2, 'debug não entra no mapa de mortes');
  // moedas pegas numa tentativa que morreu não contam; na vitória contam
  const v = Save.registrarVitoria(reg, [true, false, true], false, 'facil');
  assert.strictEqual(v.primeira, true);
  assert.strictEqual(v.estrelas, Levels.estrelasDe('facil'));
  assert.strictEqual(v.moedasNovas, 2);
  assert.strictEqual(reg.melhor, 100);
  const v2 = Save.registrarVitoria(reg, [true, true, true], false, 'facil');
  assert.strictEqual(v2.estrelas, 0, 'estrelas só na primeira vitória');
  assert.strictEqual(v2.moedasNovas, 1);
  assert.strictEqual(Save.registrarVitoria(reg, [true, true, true], true, 'facil').estrelas, 0);
});

test('estrelas: cada dificuldade dá o que o DESIGN.md diz e o total soma certo', () => {
  const { Save, Levels } = novoSave();
  Save.carregar();
  assert.deepStrictEqual(['facil', 'normal', 'dificil', 'dificilimo', 'insano', 'demonio'].map(d => Levels.estrelasDe(d)), [1, 2, 3, 4, 5, 10]);
  Save.fase('despertar').vitorias = 1;
  Save.fase('prensa').vitorias = 2;
  assert.strictEqual(Save.estrelas(Levels.FASES), 1 + 3);
});
