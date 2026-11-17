// Editor no navegador: cria uma fase, adiciona eventos, posiciona, desfaz/refaz, toca,
// testa daqui e volta; confere que tudo fica salvo e que o save do jogo não é tocado.
// Uso: node tools/navegador/editor.js [pasta das fotos]   (servidor ligado; DODGE_URL muda o endereço)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const PASTA = process.argv[2] || os.tmpdir();
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  const url = process.env.DODGE_URL || 'http://127.0.0.1:8000';
  await page.goto(url + '/');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  const clicar = async (x, y, espera) => { await page.mouse.click(x * 2, y * 2); await page.waitForTimeout(espera || 120); };
  const foto = async (nome) => { const f = path.join(PASTA, `editor-${nome}.png`); await page.screenshot({ path: f }); return f; };
  const falhas = [];
  const conferir = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHOU ') + msg); if (!ok) falhas.push(msg); };

  await clicar(240, 135, 500);                                   // libera o áudio (vai pra primeira fase)
  await page.evaluate(() => Game.irPara('fases'));
  await page.waitForTimeout(200);
  await clicar(362, 14, 300);                                    // CRIAR
  conferir(await page.evaluate(() => Game.nomeTela) === 'criadas', 'botão CRIAR abre Minhas Fases');
  await foto('1-lista-vazia');
  await clicar(416, 14, 400);                                    // NOVA FASE
  conferir(await page.evaluate(() => Game.nomeTela) === 'editor', 'NOVA FASE abre o editor');
  await foto('2-editor-vazio');

  // adiciona uma chuva na batida 0 e um laser na batida 8
  await clicar(256, 50);                                         // paleta: CHUVA
  let n = await page.evaluate(() => Criadas.lista()[0].eventos.length);
  await page.waitForTimeout(800);                                // salvamento automático
  n = await page.evaluate(() => JSON.parse(localStorage.getItem('dodge.criadas')).fases[0].eventos.length);
  conferir(n === 1, `chuva adicionada e salva sozinha (${n} evento)`);
  await foto('3-chuva-selecionada');
  await clicar(4 + 8 * 8, 260);                                   // toque vazio na pista: cursor na batida 8, solta a seleção
  await clicar(380, 50);                                         // paleta: LASER
  const laser = await page.evaluate(() => { const f = Criadas.lista()[0]; return f.eventos[1]; });
  conferir(laser && laser.tipo === 'laser' && laser.batida === 8, `laser na batida 8 (${JSON.stringify(laser)})`);
  // toca na prévia, à direita do centro: o laser vai pra lá
  await clicar(111 + 52, 93);
  const pos = await page.evaluate(() => Criadas.lista()[0].eventos[1].pos);
  conferir(Math.abs(pos - 0.5) < 0.03, `toque na prévia posiciona o laser (pos = ${pos})`);
  await page.waitForTimeout(150);
  await foto('4-laser-posicionado');
  // setinha da velocidade/largura no inspetor: LARGURA é o 3º campo do laser
  const larg0 = await page.evaluate(() => Criadas.lista()[0].eventos[1].larg);
  await clicar(222 + 254 - 21 + 8, 23 + 4 + 17 + 13 + 13 + 15 + 13 + 5);   // ▶ da LARGURA (cabeçalho, batida, posições + fichas, direção)
  const larg1 = await page.evaluate(() => Criadas.lista()[0].eventos[1].larg);
  conferir(larg0 === undefined && larg1 === 14, `setinha muda a largura (${larg0} → ${larg1})`);
  // desfazer / refazer pelo teclado
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
  const d1 = await page.evaluate(() => Criadas.lista()[0].eventos[1].larg);
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100);
  const d2 = await page.evaluate(() => Criadas.lista()[0].eventos[1].pos);
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(100);
  await page.keyboard.press('Control+y'); await page.waitForTimeout(100);
  const d3 = await page.evaluate(() => Criadas.lista()[0].eventos[1]);
  conferir(d1 === undefined && d2 === 0 && d3.larg === 14 && Math.abs(d3.pos - 0.5) < 0.03, `desfazer/refazer (${d1}, ${d2}, ${JSON.stringify(d3)})`);
  // arrasta o laser na linha do tempo de 8 pra 12
  const xa = 4 + 8 * 8 + 1;
  const pista = await page.evaluate(() => 0);
  await page.mouse.move(xa * 2, (211 + 7) * 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move((xa + i * 4) * 2, (211 + 7) * 2); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(100);
  const b = await page.evaluate(() => Criadas.lista()[0].eventos.map(e => e.batida));
  conferir(b[1] === 12, `arrastar o laser na linha do tempo (${JSON.stringify(b)})`);
  // modificador: gira a caixa na batida 20
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  await page.evaluate(() => 0);
  await clicar(4 + 20 * 8, 188);                                  // régua: cursor na batida 20
  await clicar(318, 50 + 40);                                     // paleta: GIRAR (3ª linha, 2ª coluna)
  const g = await page.evaluate(() => Criadas.lista()[0].eventos[2]);
  conferir(g && g.tipo === 'girar' && g.batida === 20, `girar na batida 20 (${JSON.stringify(g)})`);
  await clicar(4 + 22.5 * 8, 188, 200);                           // no meio do giro
  await foto('5-girando');
  // tocar com a música
  await page.keyboard.press('Home');
  await page.keyboard.press('Space'); await page.waitForTimeout(1200);
  const tocando = await page.evaluate(() => ({ cursor: Game.nomeTela === 'editor' && Sound.tocando(), pos: Sound.posicao() }));
  await foto('6-tocando');
  await page.keyboard.press('Space'); await page.waitForTimeout(100);
  conferir(tocando.cursor && tocando.pos > 0.8, `tocar com a música (posição ${tocando.pos.toFixed(2)} s)`);
  // testar daqui (batida 10)
  const saveAntes = await page.evaluate(() => localStorage.getItem('dodge.save'));
  await clicar(4 + 10 * 8, 188);
  await page.keyboard.press('KeyT'); await page.waitForTimeout(700);
  const jogo = await page.evaluate(() => ({ tela: Game.nomeTela, teste: !!Game.J.teste, t: Game.J.t, inicio: Game.J.inicio }));
  conferir(jogo.tela === 'jogo' && jogo.teste && Math.abs(jogo.inicio - 10 * 60 / 112) < 0.01, `testar daqui começa na batida 10 (${JSON.stringify(jogo)})`);
  await foto('7-testando');
  await page.evaluate(() => Game.matar()); await page.waitForTimeout(600);
  const re = await page.evaluate(() => ({ t: Game.J.t, tent: Game.J.tentativa }));
  conferir(re.tent === 2 && re.t >= 10 * 60 / 112 - 0.01, `morrer no teste recomeça do mesmo ponto (${JSON.stringify(re)})`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await foto('8-pausa-teste');
  await clicar(240, 180, 300);                                    // botão EDITOR na pausa
  conferir(await page.evaluate(() => Game.nomeTela) === 'editor', 'pausa do teste volta pro editor');
  const saveDepois = await page.evaluate(() => { Save.gravar(); return JSON.parse(localStorage.getItem('dodge.save')); });
  conferir(!Object.keys(saveDepois.fases).some(k => k.startsWith('u-')), 'o teste não escreveu nada da fase criada no save do jogo');
  // propriedades: troca a música e o nome
  await clicar(465, 11, 200);
  await foto('9-propriedades');
  await clicar(120 + 240 - 26 + 8, 56 + 48 + 7);                  // música →
  const mus = await page.evaluate(() => Criadas.lista()[0].musica);
  conferir(mus === 'correnteza', `trocar a música (${mus})`);
  await clicar(120 + 240 - 90 + 40, 56 + 112 + 8);                // FECHAR
  // recarrega: tudo continua lá
  await page.waitForTimeout(800);
  await page.reload(); await page.waitForTimeout(400);
  const depois = await page.evaluate(() => { const f = Criadas.lista()[0]; return { n: f.eventos.length, musica: f.musica, bpm: f.bpm }; });
  conferir(depois.n === 3 && depois.musica === 'correnteza' && depois.bpm === 128, `depois de recarregar a fase continua igual (${JSON.stringify(depois)})`);
  await page.evaluate(() => Game.irPara('criadas')); await page.waitForTimeout(200);
  await foto('10-lista');
  conferir(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nOK');
  console.log('fotos em', PASTA);
  await browser.close();
  process.exit(falhas.length ? 1 : 0);
})();
