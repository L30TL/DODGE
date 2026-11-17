// Código de compartilhar: ida e volta, código cortado, código malicioso. E o filtro de palavrão.
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const { carregar, json } = require('./carregar');

const extras = { CompressionStream, DecompressionStream, TextEncoder, TextDecoder, btoa, atob };
const M = carregar(['config.js', 'patterns.js', 'criadas.js', 'filtro.js', 'codigo.js'], extras);
const Codigo = M.pegar('Codigo'), Criadas = M.pegar('Criadas'), Filtro = M.pegar('Filtro');
const fase = { id: 'u-teste', nome: 'Minha Fase', dificuldade: 'dificil', musica: 'correnteza', bpm: 128, duracaoBatidas: 153,
  eventos: [{ batida: 8, tipo: 'chuva', pos: [-0.5, 0, 0.5], aviso: 2 }, { batida: 16, tipo: 'girar', angulo: 45, dur: 2 },
    { batida: 200, tipo: 'laser', pos: 0 }] };
const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const montar = (tipo, bytes) => { const d = b64(bytes); return `DG1${tipo}.${d}.${Criadas.hash(d)}`; };

test('código: ida e volta (compactado), com a marca de verificada', async () => {
  const c = await Codigo.gerar(fase, true);
  assert.match(c, /^DG1Z\.[A-Za-z0-9_-]+\.[a-z0-9]+$/);
  const r = await Codigo.ler('  ' + c.slice(0, 20) + '\n' + c.slice(20) + ' ');     // espaços e quebras do WhatsApp
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.verificada, true);
  assert.strictEqual(r.fase.nome, 'Minha Fase');
  assert.strictEqual(r.fase.musica, 'correnteza');
  assert.strictEqual(r.fase.eventos.length, 2);                   // o que passa do fim não vai no código
  assert.strictEqual(json(r.fase.eventos[1]), json(fase.eventos[1]));
});

test('código sem compactar (navegador antigo) também é lido', async () => {
  const c = montar('J', Buffer.from(JSON.stringify({ n: 'X', d: 'facil', m: 'prensa', e: [{ batida: 4, tipo: 'anel' }] })));
  const r = await Codigo.ler(c);
  assert.ok(r.ok);
  assert.strictEqual(r.verificada, false);
  assert.strictEqual(r.fase.musica, 'prensa');
});

test('código cortado, alterado, de outra versão ou que não é código: erro claro, nada quebra', async () => {
  const c = await Codigo.gerar(fase, false);
  const erro = async (txt) => (await Codigo.ler(txt)).erro;
  assert.strictEqual(await erro(c.slice(0, c.length - 12)), 'incompleto');
  const meio = c.indexOf('.') + 5;
  assert.strictEqual(await erro(c.slice(0, meio) + (c[meio] === 'A' ? 'B' : 'A') + c.slice(meio + 1)), 'incompleto');
  assert.strictEqual(await erro('DG9Z.abc.1'), 'versao');
  assert.strictEqual(await erro('oi tudo bem'), 'formato');
  assert.strictEqual(await erro(''), 'formato');
  assert.strictEqual(await erro(null), 'formato');
  assert.strictEqual(await erro('DG1Z.' + 'A'.repeat(300000) + '.1'), 'grande');
});

test('código malicioso: bomba de compactação, JSON quebrado, música inventada', async () => {
  const bomba = montar('Z', zlib.deflateRawSync(Buffer.alloc(5e6, 32)));          // 5 MB de espaços
  assert.strictEqual((await Codigo.ler(bomba)).erro, 'invalido');
  assert.strictEqual((await Codigo.ler(montar('Z', zlib.deflateRawSync(Buffer.from('{"n":'))))).erro, 'invalido');
  assert.strictEqual((await Codigo.ler(montar('J', Buffer.from('{"m":"hack","e":[]}')))).erro, 'invalido');
  assert.strictEqual((await Codigo.ler(montar('Z', Buffer.from([1, 2, 3, 4])))).erro, 'invalido');
  // eventos absurdos passam pelo validador ao virar fase (nada de NaN, limites respeitados)
  const lixo = { n: 'L', d: 'xx', m: 'despertar', e: [{ batida: 1e9, tipo: 'chuva' }, { batida: 4, tipo: 'laser', larg: 1e9, pos: 'a' },
    { batida: 5, tipo: '__proto__' }, null, { batida: 6, tipo: 'anel', quantidade: 1e9 }] };
  const r = await Codigo.ler(montar('J', Buffer.from(JSON.stringify(lixo))));
  assert.ok(r.ok);
  const v = M.Patterns.validar(Object.assign({ bpm: 112, duracaoBatidas: 113 }, r.fase)).fase;
  assert.strictEqual(v.dificuldade, 'normal');
  assert.strictEqual(v.eventos.length, 2);
  assert.strictEqual(v.eventos[0].larg, 120);
  assert.ok(v.eventos[1].quantidade <= 128);
});

test('verificada só vale pro conteúdo vencido: mexeu no jogo, perde; mudou o nome, continua', () => {
  const f = JSON.parse(JSON.stringify(fase));
  f.verificada = { hash: Criadas.hashJogo(f), data: 1 };
  assert.ok(Criadas.verificada(f));
  f.nome = 'Outro nome';
  assert.ok(Criadas.verificada(f));
  f.eventos[0].aviso = 1.5;
  assert.ok(!Criadas.verificada(f));
});

test('filtro de palavrão: pega os disfarces, deixa as palavras normais', () => {
  const sim = ['PORRA', 'p0rr4', 'P.U.T.A', 'Porrrrrra', 'caralho', 'vai se f0der', 'fdp', 'filha da puta', 'BUCETINHA',
    'fuck you', 'MEEERDA', 'P U T A', 'vaisefoder', 'CUZÃO', 'C4R4LH0'];
  const nao = ['COMPUTADOR', 'CUIDADO', 'TEMPORADA', 'BOSTON', 'SAPATARIA', 'CORNETA', 'PICADA', 'ESCURO', 'CUCA', 'DEPUTADO',
    'DISPUTA', 'PORTA', 'PORQUE', 'MACACO', 'KKKK', 'MINHA FASE 1', 'COCKPIT', 'NIGER', 'MERCADO', 'CARAÍBAS', 'DESPERTAR'];
  assert.deepStrictEqual(sim.filter(s => !Filtro.temPalavrao(s)), []);
  assert.deepStrictEqual(nao.filter(s => Filtro.temPalavrao(s)), []);
});
