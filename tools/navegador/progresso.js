// Sessão 4 no navegador: moedas jogando (recorde, vitória), conquista com aviso, missões,
// guarda-roupa (comprar, usar, cor), e o save v2 antigo migrando sem perder nada.
// Uso: node tools/navegador/progresso.js [pasta das fotos]   (servidor ligado)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const PASTA = process.argv[2] || os.tmpdir();
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  const url = (process.env.DODGE_URL || 'http://127.0.0.1:8000') + '/';
  // save antigo (v2) de quem já jogava, posto antes de o jogo carregar
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pronto')) return;
    sessionStorage.setItem('pronto', '1');
    localStorage.clear();
    localStorage.setItem('dodge.save', JSON.stringify({ versao: 2, rev: 3, primeiraVez: false,
      fases: { despertar: { melhor: 60, tentativas: 9, vitorias: 0 } }, stats: { tentativas: 9, raspoes: 15 } }));
  });
  await page.goto(url); await page.waitForTimeout(400);
  const clicar = async (x, y, espera) => { await page.mouse.click(x * 2, y * 2); await page.waitForTimeout(espera || 150); };
  const foto = async (nome) => page.screenshot({ path: path.join(PASTA, `s4-${nome}.png`) });
  const falhas = [];
  const conferir = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHOU ') + msg); if (!ok) falhas.push(msg); };

  const mig = await page.evaluate(() => ({ v: Save.dados.versao, moedas: Save.dados.moedas, melhor: Save.dados.fases.despertar.melhor }));
  conferir(mig.v === 3 && mig.moedas === 75 && mig.melhor === 60, `save v2 migrou com as moedas do que já tinha (${JSON.stringify(mig)})`);
  await clicar(240, 135, 400);
  await page.evaluate(() => Game.irPara('fases')); await page.waitForTimeout(200);
  await foto('1-fases');
  // joga Despertar do começo, morre ~5 s depois (sem recorde: 60% é o melhor)
  await page.evaluate(() => Game.jogar(Levels.FASES[0])); await page.waitForTimeout(1500);
  const m0 = await page.evaluate(() => Save.dados.moedas);
  await page.evaluate(() => Game.matar()); await page.waitForTimeout(700);
  conferir(await page.evaluate(() => Save.dados.moedas) === m0, 'morrer abaixo do recorde não dá moeda');
  // vence (pula pro fim sem debug: conta como vitória de verdade)
  await page.evaluate(() => { const d = Game.J.comp.duracao; Game.J.corrida.t = d - 0.25; Sound.tocar(Game.J.fase.musica, { desde: d - 0.25 }); });
  await page.waitForTimeout(1600);
  const v = await page.evaluate(() => ({ estado: Game.J.estado, ganhas: Game.J.moedasGanhas, moedas: Save.dados.moedas, cq: Object.keys(Save.dados.conquistas) }));
  conferir(v.estado === 'vitoria' && v.ganhas === 40 + 40 && v.cq.includes('primeiraVitoria'),
    `vitória: 40 da 1ª vez + 40 do recorde 60→100, e a conquista (${JSON.stringify(v)})`);
  await page.waitForTimeout(900);
  await foto('2-vitoria-moedas');
  // missões
  await page.evaluate(() => Game.irPara('missoes')); await page.waitForTimeout(200);
  await foto('3-missoes');
  const pegou = await page.evaluate(() => {
    const m = Save.dados.missoes; m.diarias[0].prog = m.diarias[0].alvo;   // completa a primeira
    UI.telas.missoes.entrar({}); return { antes: Save.dados.moedas, premio: m.diarias[0].moedas };
  });
  await clicar(186 + 28, 44 + 10, 300);
  const depois = await page.evaluate(() => ({ moedas: Save.dados.moedas, pega: Save.dados.missoes.diarias[0].pega }));
  conferir(depois.pega && depois.moedas === pegou.antes + pegou.premio, `pegar a recompensa da missão (${JSON.stringify(depois)})`);
  // guarda-roupa: compra um boné e muda a cor
  await page.evaluate(() => { Save.dados.moedas = 300; Game.irPara('visual'); }); await page.waitForTimeout(200);
  await clicar(178 + 4 * 42 + 20, 35);                            // aba CABEÇA
  await clicar(178 + 2 * 58 + 27, 48 + 29);                       // 3ª peça: boné
  await foto('4-visual-prova');
  await clicar(88, 245, 300);                                     // COMPRAR
  const r = await page.evaluate(() => ({ tem: !!Save.dados.pecas['cabeca.bone'], moedas: Save.dados.moedas,
    usando: Avatar.camada(Save.dados.avatar, 'cabeca').peca, st: Save.dados.stats.pecasCompradas }));
  conferir(r.tem && r.moedas === 300 - 80 + 40 && r.usando === 'cabeca.bone' && r.st === 1, `comprou (80) e já está usando o boné; a 1ª compra dá a conquista ESTILOSO (+40) (${JSON.stringify(r)})`);
  await clicar(178 + 5 * 24 + 10, 178 + 9);                       // cor laranja pro boné
  const cor = await page.evaluate(() => Avatar.camada(Save.dados.avatar, 'cabeca').cor);
  conferir(cor === '#ff9f43', `cor do boné (${cor})`);
  await clicar(178 + 20, 35);                                     // aba CORPO
  await clicar(178 + 7 * 24 + 10, 200 + 9);                       // vermelho no corpo: proibido
  const corpo = await page.evaluate(() => Avatar.camada(Save.dados.avatar, 'corpo').cor);
  conferir(corpo === '#4df3ff', `rosa/vermelho não pode no corpo (${corpo})`);
  await page.waitForTimeout(400);
  await foto('5-visual-comprado');
  // a alma nova aparece no jogo
  await page.evaluate(() => Game.jogar(Levels.FASES[1])); await page.waitForTimeout(900);
  await foto('6-jogo-bone');
  conferir(erros.length === 0, 'nenhum erro no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nOK');
  await browser.close();
  process.exit(falhas.length ? 1 : 0);
})();
