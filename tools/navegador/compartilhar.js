// Sessão 3 no navegador: verificar vencendo do começo (+ solver), gerar o código, importar,
// filtro de palavrão no nome, jogar uma fase criada pela lista.
// Uso: node tools/navegador/compartilhar.js [pasta das fotos]   (servidor ligado)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const PASTA = process.argv[2] || os.tmpdir();
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, locale: 'pt-BR', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  const clicar = async (x, y, espera) => { await page.mouse.click(x * 2, y * 2); await page.waitForTimeout(espera || 150); };
  const foto = async (nome) => page.screenshot({ path: path.join(PASTA, `s3-${nome}.png`) });
  const falhas = [];
  const conferir = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHOU ') + msg); if (!ok) falhas.push(msg); };

  await clicar(240, 135, 400);
  await page.evaluate(() => Game.irPara('criadas')); await page.waitForTimeout(200);
  await clicar(416, 14, 400);                                             // NOVA FASE
  await clicar(256 + 62 * 3, 50 + 20);                                    // paleta: MOEDA (2ª linha, 4ª coluna)
  conferir(await page.evaluate(() => Criadas.lista()[0].eventos[0].tipo === 'moeda'), 'moeda adicionada');
  // nome com palavrão é recusado
  await clicar(100, 11, 300);
  await page.fill('.et-campo', 'p0rr4 de fase'); await page.click('.et-ok'); await page.waitForTimeout(150);
  const nome1 = await page.evaluate(() => Criadas.lista()[0].nome);
  conferir(nome1 === 'MINHA FASE 1', `nome com palavrão recusado (ficou "${nome1}")`);
  await clicar(100, 11, 300);
  await page.fill('.et-campo', 'Fase do Teste'); await page.click('.et-ok'); await page.waitForTimeout(150);
  conferir(await page.evaluate(() => Criadas.lista()[0].nome) === 'FASE DO TESTE', 'nome normal aceito');
  // compartilhar antes de verificar: não deixa
  await clicar(465, 11, 200);
  await clicar(240, 56 + 88 + 8, 300);                                    // COMPARTILHAR
  conferir(!(await page.evaluate(() => EntradaTexto.aberta())), 'sem verificar, não gera código');
  await clicar(120 + 240 - 50, 56 + 112 + 8, 200);                        // FECHAR
  // selo "?" → testa do começo; pula pro fim (sem debug) e vence
  await clicar(206, 11, 500);
  const j = await page.evaluate(() => ({ tela: Game.nomeTela, inicio: Game.J.inicio, trapaca: Game.J.trapaca }));
  conferir(j.tela === 'jogo' && j.inicio === 0 && !j.trapaca, `selo de verificar testa do começo (${JSON.stringify(j)})`);
  await page.evaluate(() => { const d = Game.J.comp.duracao; Game.J.corrida.t = d - 0.25; Sound.tocar(Game.J.fase.musica, { desde: d - 0.25 }); });
  await page.waitForTimeout(1800);
  const v = await page.evaluate(() => ({ estado: Game.J.estado, vit: Game.J.teste && Game.J.teste.vitoria }));
  conferir(v.estado === 'vitoria' && v.vit && v.vit.doInicio, `venceu o teste do começo (${JSON.stringify(v)})`);
  await foto('1-vitoria-teste');
  await clicar(240, 208, 300);                                            // botão EDITOR
  await foto('2-conferindo');
  await page.waitForFunction(() => !UI.telas.editor.estado().verificando, null, { timeout: 30000 });
  await page.waitForTimeout(200);
  conferir(await page.evaluate(() => Criadas.verificada(Criadas.lista()[0])), 'solver conferiu e a fase ficou verificada');
  await foto('3-verificada');
  // agora compartilha
  await clicar(465, 11, 200);
  await clicar(240, 56 + 88 + 8, 600);
  const codigo = await page.evaluate(() => document.querySelector('.et-campo').value);
  conferir(/^DG1Z\.[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(codigo), `código gerado (${codigo.length} caracteres)`);
  await foto('4-codigo');
  await page.click('.et-ok'); await page.waitForTimeout(300);              // COPIAR
  const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  conferir(copiado === codigo, 'botão COPIAR copia o código');
  // mudar a fase tira a verificação
  await clicar(120 + 240 - 50, 56 + 112 + 8, 200);
  await page.keyboard.press('Escape'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  await clicar(256, 50);                                                  // + chuva
  conferir(!(await page.evaluate(() => Criadas.verificada(Criadas.lista().find(f => f.nome === 'FASE DO TESTE')))), 'mexeu na fase: precisa verificar de novo');
  // importa o código na lista
  await page.evaluate(() => Game.irPara('criadas')); await page.waitForTimeout(200);
  await clicar(268 + 41, 14, 300);                                        // IMPORTAR
  await page.fill('.et-campo', codigo.slice(0, 30) + '\n ' + codigo.slice(30)); await page.click('.et-ok');
  await page.waitForTimeout(500);
  const imp = await page.evaluate(() => Criadas.lista().map(f => ({ nome: f.nome, origem: f.origem, ver: Criadas.verificada(f), n: f.eventos.length })));
  conferir(imp.length === 2 && imp[0].origem === 'codigo' && imp[0].ver && imp[0].nome === 'FASE DO TESTE' && imp[0].n === 1,
    `código importado vira fase verificada (${JSON.stringify(imp)})`);
  await foto('5-lista-importada');
  // código errado
  await clicar(268 + 41, 14, 300);
  await page.fill('.et-campo', codigo.slice(0, codigo.length - 10)); await page.click('.et-ok'); await page.waitForTimeout(400);
  conferir(await page.evaluate(() => Criadas.lista().length) === 2, 'código cortado não importa nada');
  await foto('6-codigo-cortado');
  // jogar pela lista e sair volta pra lista; não dá estrela
  await clicar(20 + 440 - 160 + 27, 30 + 18, 600);                        // JOGAR do primeiro cartão
  const jg = await page.evaluate(() => ({ tela: Game.nomeTela, teste: Game.J.teste, voltar: Game.J.voltar }));
  conferir(jg.tela === 'jogo' && !jg.teste && jg.voltar === 'criadas', `JOGAR abre a fase criada (${JSON.stringify(jg)})`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await clicar(240, 180, 300);                                            // SAIR
  conferir(await page.evaluate(() => Game.nomeTela) === 'criadas', 'sair da fase criada volta pra Minhas Fases');
  conferir(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nOK');
  await browser.close();
  process.exit(falhas.length ? 1 : 0);
})();
