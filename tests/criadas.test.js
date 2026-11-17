// Fases criadas no editor: guardar, recuperar, mesclar abas, lixeira. Nada pode se perder.
const test = require('node:test');
const assert = require('node:assert');
const { carregar, armazenamentoFalso, json } = require('./carregar');

const ARQ = ['config.js', 'patterns.js', 'criadas.js'];
function mundo(inicial, op) {
  const m = carregar(ARQ);
  const C = m.pegar('Criadas');
  C.armazenamento = armazenamentoFalso(inicial, op);
  let relogio = 1000000;
  C.agora = () => (relogio += 10);
  C.carregar();
  return C;
}
const evs = [{ batida: 8, tipo: 'chuva', pos: [0.2, -0.4], aviso: 2 }, { batida: 12, tipo: 'girar', angulo: 45, dur: 2 }];
const op = { nome: 'Teste', musica: 'correnteza', bpm: 128, duracaoBatidas: 153, eventos: evs };

test('criar, editar e recarregar: tudo volta igual', () => {
  const C = mundo();
  const f = C.nova(op);
  assert.match(f.id, /^u-[a-z0-9-]+$/);
  f.nome = 'Outro nome';
  f.eventos.push({ batida: 20, tipo: 'laser', pos: 0, orient: 'v' });
  C.salvar(f, true);
  const st = C.armazenamento;
  const D = mundo(Object.fromEntries(st.mapa));
  const g = D.pegar(f.id);
  assert.strictEqual(g.nome, 'Outro nome');
  assert.strictEqual(g.eventos.length, 3);
  assert.strictEqual(g.musica, 'correnteza');
  assert.strictEqual(D.lista().length, 1);
});

test('evento depois do fim não se perde (trocar de música não apaga nada)', () => {
  const C = mundo();
  const f = C.nova(op);
  f.eventos.push({ batida: 190, tipo: 'chuva', pos: 0 });
  f.musica = 'despertar'; f.bpm = 112; f.duracaoBatidas = 113;
  C.salvar(f, true);
  const D = mundo(Object.fromEntries(C.armazenamento.mapa));
  assert.ok(D.pegar(f.id).eventos.some(e => e.batida === 190));
  // e a versão jogável ignora o que passou do fim sem quebrar
  const j = D.jogavel(D.pegar(f.id));
  assert.strictEqual(j.duracaoBatidas, 113);
});

test('save das criadas corrompido: guarda a cópia e volta do backup', () => {
  const C = mundo();
  const f = C.nova(op);
  C.carregar();                                  // gera o backup
  const st = Object.fromEntries(C.armazenamento.mapa);
  st['dodge.criadas'] = '{"fases": [estragado';
  const D = mundo(st);
  assert.strictEqual(D.recuperado, 'backup');
  assert.ok(D.pegar(f.id));
  const chaves = Array.from(D.armazenamento.mapa.keys());
  assert.ok(chaves.some(k => k.startsWith('dodge.criadas.corrompido.')));
});

test('lixo no armazenamento: ids inválidos e campos ruins são limpos sem erro', () => {
  const lixo = { versao: 1, fases: [
    { id: 'u-ok', nome: 'A', musica: 'nao-existe', bpm: 'x', eventos: [{ batida: 'b' }, { batida: 4, tipo: 'chuva', pos: 9 }] },
    { id: '../../hack', nome: 'B' }, null, 7, { id: 'u-ok', nome: 'duplicada' },
  ], lixeira: 'x' };
  const D = mundo({ 'dodge.criadas': JSON.stringify(lixo) });
  assert.strictEqual(D.lista().length, 1);
  const f = D.pegar('u-ok');
  assert.strictEqual(f.musica, 'despertar');
  assert.deepStrictEqual(json(f.eventos), json([{ batida: 4, tipo: 'chuva', pos: 1 }]));
});

test('armazenamento bloqueado ou cheio: o editor continua funcionando na memória', () => {
  for (const o of [{ bloqueado: true }, { cheio: true }]) {
    const C = mundo({}, o);
    const f = C.nova(op);
    assert.ok(C.pegar(f.id));
    assert.strictEqual(C.disponivel, false);
  }
});

test('duas abas: fica a versão editada por último e o que foi apagado continua apagado', () => {
  const C = mundo();
  const a = C.nova(op), b = C.nova(Object.assign({}, op, { nome: 'B' }));
  const base = JSON.parse(JSON.stringify(C.dados));
  // aba 1 edita A; aba 2 apaga B e cria C
  const aba1 = JSON.parse(JSON.stringify(base));
  aba1.fases.find(f => f.id === a.id).nome = 'A editada';
  aba1.fases.find(f => f.id === a.id).editada += 500;
  C.apagar(b.id);
  const c = C.nova(Object.assign({}, op, { nome: 'C' }));
  const m = C.mesclar(aba1, C.dados);
  const nomes = m.fases.map(f => f.nome).sort();
  assert.deepStrictEqual(nomes, ['A editada', 'C']);
  assert.ok(m.lixeira.some(x => x.fase.id === b.id));
  assert.ok(m.fases.some(f => f.id === c.id));
});

test('lixeira: apagar e trazer de volta; duplicar cria uma fase nova e não verificada', () => {
  const C = mundo();
  const f = C.nova(op);
  C.apagar(f.id);
  assert.strictEqual(C.lista().length, 0);
  const r = C.restaurar(f.id);
  assert.strictEqual(r.nome, 'Teste');
  assert.strictEqual(C.lista().length, 1);
  const g = C.pegar(f.id); g.verificada = { hash: 'abc', data: 1 };
  C.salvar(g, true);
  const d = C.duplicar(f.id, 'Cópia');
  assert.notStrictEqual(d.id, f.id);
  assert.strictEqual(d.verificada, null);                 // a "verificação" da original era falsa
  assert.strictEqual(d.eventos.length, 2);
  g.verificada = { hash: C.hashJogo(g), data: 1 };
  C.salvar(g, true);
  assert.ok(C.verificada(C.duplicar(f.id, 'Cópia 2')));   // verificada de verdade: a cópia também é
  // a lixeira tem limite
  for (let i = 0; i < 15; i++) C.apagar(C.nova(op).id);
  assert.ok(C.dados.lixeira.length <= 10);
});
