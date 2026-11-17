// Sessão 5 no navegador: treino com checkpoints (nada vai pro save) e o perfil (nick, efeito, emblema, moldura).
// Uso: node tools/navegador/sessao5.js [pasta das fotos]   (servidor ligado)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const PASTA = process.argv[2] || os.tmpdir();
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.addInitScript(() => { if (!sessionStorage.getItem('ok')) { sessionStorage.setItem('ok', '1'); localStorage.clear(); } });
  await page.goto((process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/'); await page.waitForTimeout(400);
  const clicar = async (x, y, espera) => { await page.mouse.click(x * 2, y * 2); await page.waitForTimeout(espera || 150); };
  const foto = async (nome) => page.screenshot({ path: path.join(PASTA, `s5-${nome}.png`) });
  const falhas = [];
  const conferir = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHOU ') + msg); if (!ok) falhas.push(msg); };

  await clicar(240, 135, 400);
  await page.evaluate(() => { Save.dados.primeiraVez = false; Game.irPara('fases'); }); await page.waitForTimeout(200);
  await clicar(306 + 33, 218 + 10, 500);                                   // TREINO
  const j = await page.evaluate(() => ({ tela: Game.nomeTela, treino: !!Game.J.treino, tent: (Save.dados.fases.despertar || {}).tentativas || 0 }));
  conferir(j.tela === 'jogo' && j.treino, `TREINO abre a fase em treino (${JSON.stringify(j)})`);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(100);
  const cp = await page.evaluate(() => ({ n: Game.J.treino.cps.length, t: Game.J.inicio, x: Game.J.inicioX }));
  await foto('1-treino-checkpoint');
  await page.evaluate(() => Game.matar()); await page.waitForTimeout(700);
  const re = await page.evaluate(() => ({ t: Game.J.corrida.t, x: Game.J.corrida.alma.x, estado: Game.J.estado }));
  conferir(cp.n === 1 && cp.x > 30 && Math.abs(re.t - cp.t) < 0.3 && Math.abs(re.x - cp.x) < 1 && re.estado === 'jogando',
    `morrer volta pro checkpoint, com a alma onde estava (cp ${JSON.stringify(cp)} → ${JSON.stringify(re)})`);
  await page.keyboard.press('KeyV'); await page.waitForTimeout(100);
  conferir(await page.evaluate(() => Game.J.treino.cps.length === 0 && Game.J.inicio === 0), 'V tira o checkpoint');
  const depois = await page.evaluate(() => ({ tent: (Save.dados.fases.despertar || {}).tentativas || 0, melhor: (Save.dados.fases.despertar || {}).melhor || 0, moedas: Save.dados.moedas }));
  conferir(depois.tent === j.tent && depois.melhor === 0 && depois.moedas === 0, `treino não conta tentativa, recorde nem moeda (${JSON.stringify(depois)})`);
  // perfil
  await page.evaluate(() => { Save.dados.moedas = 200; Game.irPara('visual'); }); await page.waitForTimeout(200);
  await clicar(156 + 26, 14);                                              // PERFIL
  await clicar(404 + 34, 38, 300);                                         // EDITAR nick
  await page.fill('.et-campo', 'merda'); await page.click('.et-ok'); await page.waitForTimeout(150);
  conferir(await page.evaluate(() => Save.dados.perfil.nick) === '', 'nick com palavrão recusado');
  await clicar(404 + 34, 38, 300);
  await page.fill('.et-campo', 'Leo123'); await page.click('.et-ok'); await page.waitForTimeout(150);
  conferir(await page.evaluate(() => Save.dados.perfil.nick) === 'LEO123', 'nick salvo');
  await clicar(178 + 74 + 35, 64 + 10, 200);                                // efeito COR (40)
  const ef = await page.evaluate(() => ({ e: Save.dados.perfil.efeito, m: Save.dados.moedas, tem: !!Save.dados.pecas['nick.cor'] }));
  conferir(ef.e === 'cor' && ef.tem && ef.m === 200 - 40 + 40, `comprou o efeito COR (a 1ª compra dá ESTILOSO) (${JSON.stringify(ef)})`);
  await clicar(178 + 32 + 15, 130 + 10, 200);                                // 1º emblema (ESTILOSO)
  conferir(await page.evaluate(() => Save.dados.perfil.emblema) === 'estilo', 'emblema escolhido');
  const bronze = await page.evaluate(() => Progresso.molduraLiberada(Save.dados, 'bronze'));
  conferir(!bronze, 'moldura bronze ainda travada (nenhuma vitória)');
  await page.waitForTimeout(300);
  await foto('2-perfil');
  // modo infinito: dá a volta na música (segmento novo, a alma continua), morre e grava o tempo
  await page.evaluate(() => Game.irPara('fases')); await page.waitForTimeout(200);
  await clicar(100 + 38, 14, 600);                                         // INFINITO
  const inf0 = await page.evaluate(() => ({ tela: Game.nomeTela, k: Game.J.infinito && Game.J.infinito.k, loop: Sound._estado ? true : true }));
  conferir(inf0.tela === 'jogo' && inf0.k === 0, `INFINITO começa na volta 1 (${JSON.stringify(inf0)})`);
  await page.evaluate(() => { const d = Game.J.comp.duracao; Game.J.corrida.t = d - 0.4; Game.J.corrida.alma.x = 50;
    Sound.tocar(Game.J.fase.musica, { desde: d - 0.4, loop: true }); });
  await page.waitForTimeout(1500);
  const inf1 = await page.evaluate(() => ({ k: Game.J.infinito.k, estado: Game.J.estado, t: Game.J.t, total: Game.J.infinito.total, x: Game.J.corrida.alma.x }));
  conferir(inf1.k === 1 && inf1.estado === 'jogando' && inf1.t < 3 && inf1.total > 70, `a música deu a volta: trecho novo e o jogo segue (${JSON.stringify(inf1)})`);
  await foto('3-infinito-volta2');
  await page.evaluate(() => Game.matar()); await page.waitForTimeout(500);
  const rec = await page.evaluate(() => ({ melhor: Save.dados.infinito.melhor, partidas: Save.dados.infinito.partidas, txt: Game.J.textoMorte && Game.J.textoMorte.txt }));
  conferir(rec.melhor > 70 && rec.partidas === 1 && /^1:\d\d$/.test(rec.txt), `morreu: recorde de tempo gravado (${JSON.stringify(rec)})`);
  await foto('4-infinito-morte');
  await page.waitForTimeout(700);
  const re2 = await page.evaluate(() => ({ k: Game.J.infinito.k, total: Game.J.infinito.total, estado: Game.J.estado }));
  conferir(re2.k === 0 && re2.total === 0 && re2.estado === 'jogando', `nova partida começa da volta 1 (${JSON.stringify(re2)})`);
  conferir(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nOK');
  await browser.close();
  process.exit(falhas.length ? 1 : 0);
})();
