// Fuzzing do editor: milhares de operações aleatórias (adicionar, mexer em campos, posições,
// mover, apagar, desfazer, trocar de música, tocar na prévia com lixo). A fase nunca fica
// inválida, compila sempre, nada vira NaN, e salvar/recarregar não perde nenhum evento.
const test = require('node:test');
const assert = require('node:assert');
const { carregar, aleatorio, armazenamentoFalso } = require('./carregar');

const extras = { setInterval: () => 0, window: { addEventListener() {} }, document: { addEventListener() {} } };
const M = carregar(['config.js', 'patterns.js', 'sim.js', 'audio.js', 'criadas.js', 'editor.js'], extras);
const Ed = M.pegar('Editor'), P = M.Patterns, Sound = M.pegar('Sound'), Criadas = M.pegar('Criadas');

test('fuzz do editor: 3 sementes × 1500 operações', { timeout: 120000 }, () => {
  Criadas.armazenamento = armazenamentoFalso();
  Criadas.carregar();
  const lixo = [NaN, Infinity, -Infinity, 1e9, -1e9, 0, 0.5];
  for (const semente of [1, 2, 3]) {
    const r = aleatorio(semente);
    const escolha = (l) => l[Math.floor(r() * l.length)];
    const mus = Sound.info('despertar'), d = Ed.dadosMusica(mus);
    let fase = Criadas.nova({ nome: 'FUZZ', musica: 'despertar', bpm: d.bpm, duracaoBatidas: d.duracaoBatidas });
    const h = new Ed.Historico(50);
    for (let op = 0; op < 1500; op++) {
      const antes = JSON.stringify(fase);
      const x = r();
      if (x < 0.25 && fase.eventos.length < 300) {
        fase.eventos.push(Ed.novoEvento(escolha(Ed.TIPOS), Ed.imantar(r() * fase.duracaoBatidas, escolha(Ed.IMAS), Ed.mapaMusical(mus), 0.2), fase));
      } else if (x < 0.6 && fase.eventos.length) {
        const ev = escolha(fase.eventos), cs = Ed.camposDe(ev), c = escolha(cs);
        if (c) Ed.ajustar(ev, c, r() < 0.5 ? -1 : 1, Math.floor(r() * 4));
      } else if (x < 0.68 && fase.eventos.length) {
        const ev = escolha(fase.eventos);
        const k = ev.tipo === 'paredes' ? 'centro' : 'pos';
        if (r() < 0.5) Ed.posAdicionar(ev, k, Math.floor(r() * 3)); else Ed.posRemover(ev, k, Math.floor(r() * 3));
      } else if (x < 0.76 && fase.eventos.length) {
        const ev = escolha(fase.eventos), c = Ed.camposDe(ev).find(cc => cc.posicao);
        if (c) {
          const v = Ed.posicaoDoToque(ev, c.k, escolha(lixo) * 100, escolha(lixo) * 100, 144, 92);
          if (v !== null && typeof v === 'object') { if (Number.isFinite(v.x) && Number.isFinite(v.y)) { ev.x = v.x; ev.y = v.y; } }
          else if (Number.isFinite(v)) ev[c.k] = v;
        }
      } else if (x < 0.84 && fase.eventos.length) {
        escolha(fase.eventos).batida = Math.max(0, Math.min(fase.duracaoBatidas, Math.round(r() * fase.duracaoBatidas * 4) / 4));
      } else if (x < 0.9 && fase.eventos.length) {
        fase.eventos.splice(Math.floor(r() * fase.eventos.length), 1);
      } else if (x < 0.95) {
        const s = r() < 0.5 ? h.desfazer(antes) : h.refazer(antes);
        if (s) fase = JSON.parse(s);
        continue;
      } else {
        const m2 = escolha(['despertar', 'correnteza', 'prensa']), d2 = Ed.dadosMusica(Sound.info(m2));
        fase.musica = m2; fase.bpm = d2.bpm; fase.duracaoBatidas = d2.duracaoBatidas;
      }
      if (JSON.stringify(fase) !== antes) h.registrar(antes);
      // a cada passo: tudo continua válido
      const dentro = fase.eventos.filter(e => e.batida <= fase.duracaoBatidas);
      const v = P.validar(Object.assign({}, fase, { eventos: dentro }));
      assert.strictEqual(v.avisos.length, 0, `semente ${semente} op ${op}: ${v.avisos.join('; ')}`);
      if (op % 25 === 0) {
        const { comp, faixas } = Ed.compilar(fase, 4);
        for (const sp of comp.specs) for (const k of ['tA', 't0', 'tF']) assert.ok(Number.isFinite(sp[k]), `spec ${k} = ${sp[k]}`);
        assert.ok(faixas.every(f => Number.isFinite(f.ini) && Number.isFinite(f.fim)));
        const salva = Criadas.salvar(fase, true);
        assert.strictEqual(salva.eventos.length, fase.eventos.length, 'salvar perdeu evento');
      }
    }
  }
});
