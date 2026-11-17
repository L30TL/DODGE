# BUGS.md — Dodge

Cada bug: como reproduzir, causa, correção e o teste que impede ele de voltar.
Status: **aberto** · **corrigido** (com versão/commit).

Encontrados na auditoria da Etapa 0 (17/11/2026). "Sonda" = teste de navegador que reproduziu o bug.

---

## B01 — Morrer depois do fim da fase conta como 99% · corrigido (0.2.0)
- **Reproduzir:** fase com um perigo que liga exatamente na última batida (ou logo depois). A alma morre em 99% em vez de vencer. (sonda P1)
- **Causa:** `game.js › atualizarJogo` testa colisão em sub-passos até o tempo do frame, mesmo depois de `duracao`; a vitória só é checada depois da colisão.
- **Correção:** limitar os sub-passos a `duracao`; se o frame passou do fim sem morrer antes, vence.
- **Teste:** simulação pura com perigo ligando em t = duração → resultado "vitória".
- **Feito:** `sim.js` só testa colisão antes do instante final; o frame que passa do fim vira vitória.
- **Teste que impede a volta:** `tests/sim.test.js` › morrer no instante em que a fase acaba conta como vitória · `tools/navegador/regressao.js` P1

## B02 — Áudio suspenso/interrompido congela o jogo sem aviso · corrigido (0.2.0)
- **Reproduzir:** iPhone com ligação/Siri no meio da fase, ou áudio bloqueado pelo navegador; em teste, `AudioContext.suspend()`. O tempo para, os ataques congelam e nada aparece na tela. (sonda P2)
- **Causa:** o relógio do jogo é o áudio; com o `AudioContext` parado o tempo não anda e ninguém percebe.
- **Correção:** detectar áudio parado por mais de 0,3 s → pausar e mostrar "toque para continuar"; o toque retoma o áudio.
- **Teste:** navegador com contexto suspenso → aparece o aviso e o jogo retoma no toque.
- **Feito:** `game.js` detecta áudio parado por mais de `CONFIG.audio.paradoMax` e pausa com o aviso "O SOM PAROU. TOQUE EM CONTINUAR"; o toque retoma o áudio.
- **Teste que impede a volta:** `tools/navegador/regressao.js` P2

## B03 — Save corrompido é substituído sem backup · corrigido (0.2.0)
- **Reproduzir:** `localStorage['dodge.save.v1']` com JSON cortado → o jogo começa do zero e grava um save novo por cima (o antigo, com recordes, some). (sonda P3)
- **Causa:** `save.js › carregar` cai no `catch`, cria save novo e marca "indisponível"; o próximo `gravar()` apaga o original.
- **Correção:** guardar o texto corrompido numa chave à parte, manter backup do último save bom e tentar recuperar dele; migrações versionadas.
- **Teste:** `node --test` com save cortado / campos inválidos / versão antiga → recupera do backup e nunca apaga o original.
- **Feito:** save v2: cópia do texto estragado em `dodge.save.corrompido.*`, recuperação pelo backup (`dodge.save.backup`) ou pelo save antigo (`dodge.save.v1`), migrações versionadas.
- **Teste que impede a volta:** `tests/save.test.js` (corrompido, sem backup, campos inválidos) · regressão P3

## B04 — Recorde perdido ao fechar o jogo logo depois de morrer · corrigido (0.2.0)
- **Reproduzir:** bater recorde e fechar/recarregar a página em menos de 0,8 s. O recorde não fica salvo. (sonda P4)
- **Causa:** a morte grava com `gravarDepois()` (espera 800 ms) e não há gravação ao esconder/fechar a página.
- **Correção:** gravar na hora quando há recorde, moeda ou vitória; gravar também em `pagehide`/`visibilitychange`.
- **Teste:** navegador recarrega 50 ms depois de um recorde → o recorde está no save.
- **Feito:** recorde e vitória gravam na hora; `pagehide`/`visibilitychange` gravam o que estiver pendente.
- **Teste que impede a volta:** regressão P4

## B05 — Fase nova começa pausada · corrigido (0.2.0)
- **Reproduzir:** morrer, trocar de aba durante a tela de morte, voltar, apertar Esc (vai pra lista) e abrir outra fase: ela já começa pausada. (sonda P5)
- **Causa:** a flag `pausarAoVoltar` não é zerada ao sair da fase.
- **Correção:** zerar ao preparar/sair de uma fase.
- **Teste:** sequência acima automatizada → estado inicial "jogando".
- **Feito:** a flag foi removida: perder o foco na tela de morte abre a pausa direto ("continuar" começa a próxima tentativa).
- **Teste que impede a volta:** regressão P5

## B06 — Projéteis somem em silêncio acima de 768 · corrigido (0.2.0)
- **Reproduzir:** fase com mais de 768 projéteis vivos ao mesmo tempo: o excesso não aparece. (sonda P6)
- **Causa:** pool fixo (`CONFIG.ataques.poolTamanho`); quando acaba, `nascer()` descarta.
- **Correção:** calcular na compilação o máximo de projéteis simultâneos e dimensionar o pool; o editor avisa o limite.
- **Teste:** fase com 2000 projéteis → todos aparecem.
- **Feito:** `Patterns.compilar` calcula o pico de projéteis simultâneos (`maxVivos`) e o pool tem esse tamanho; o que acabou é liberado antes do novo nascer.
- **Teste que impede a volta:** `tests/padroes.test.js` › o pool nunca descarta (2000) · regressão P6

## B07 — 2000 projéteis passam do orçamento de frame em celular fraco · corrigido (0.2.0)
- **Medido:** CPU 4× mais lenta, 2000 balas na tela: JS por frame médio 11,1 ms, p95 14,9 ms (meta: p95 ≤ 8 ms pra sobrar folga). (sonda P11)
- **Causa:** um `drawImage` por bala sem lote; colisão testa todos os projéteis em todos os sub-passos.
- **Correção:** desenho em lote com sprites pré-prontos, descartar o que está fora da caixa, colisão com grade espacial e sub-passos só quando há algo perto.
- **Teste:** estresse automatizado de 2000 projéteis com CPU 4× lenta.
- **Feito:** com mais de `CONFIG.render.balasEmCamada` balas, os pixels vão direto numa camada desenhada uma vez; colisão descarta balas longe sem raiz quadrada. 2000 projéteis com CPU 4× lenta: de 32 fps para 60 fps (JS p95 ≈ 9 ms).
- **Teste que impede a volta:** `tools/navegador/estresse-2000.js` · regressão P11 (estresse formal na Sessão 6)

## B08 — Fase/código malformado trava ou quebra em silêncio · corrigido (0.2.0)
- **Reproduzir:** um evento `espiral` com `dur: 2000` gera 1.000.000 de projéteis (1,3 s só pra compilar; com 20000 trava). Dados inválidos (`pos: "abc"`, `batida: NaN`) viram tempos NaN sem erro.
- **Causa:** `patterns.js` não valida nem limita parâmetros.
- **Correção:** validador por tipo de evento (faixas, tipos, NaN), teto de projéteis por fase; o editor mostra o erro em vez de travar.
- **Teste:** fuzzing de eventos e de códigos de compartilhar → nunca trava, nunca gera NaN.
- **Feito:** `Patterns.validar`: tipos, faixas, NaN, até 64 posições por lista, 2000 projéteis por evento e 20000 por fase (`CONFIG.limites`).
- **Teste que impede a volta:** `tests/padroes.test.js` › fuzzing (400 fases malucas) e evento gigante

## B09 — % da morte calculado no fim do frame · corrigido (0.2.0)
- **Reproduzir:** morrer perto de um número redondo (ex.: 49,9%) pode marcar 50%.
- **Causa:** `J.prog` usa o tempo do fim do frame, não o do sub-passo da morte.
- **Correção:** calcular o % com o tempo exato da colisão.
- **Teste:** simulação com morte em t conhecido → % exato.
- **Feito:** sub-passos também por tempo (`CONFIG.sim.dtSubpasso` = 1/240 s); o % vem do instante exato da colisão.
- **Teste que impede a volta:** `tests/sim.test.js` › o % da morte é o do instante da colisão

## B10 — Textos fora do objeto TEXTOS · corrigido (0.2.0)
- **Onde:** `ui.js`: `'JOGAR'`, `'SAVE INDISPONÍVEL NESTE NAVEGADOR'`, `'V0.1'`, `'DEBUG'`.
- **Efeito:** não vão traduzir pro inglês.
- **Correção:** mover pra `TEXTOS`.
- **Teste:** varredura automática procurando strings visíveis fora de `TEXTOS`.
- **Feito:** textos movidos pro `TEXTOS`.
- **Teste que impede a volta:** `tests/textos.test.js` (varre o código procurando texto solto e chaves inexistentes)

## B11 — Ícone de pausa na tela de morte sai pro menu · corrigido (0.2.0)
- **Reproduzir:** morrer e tocar no ícone de pausa (canto): vai pra lista de fases em vez de pausar.
- **Correção:** comportamento consistente (pausa).
- **Feito:** Esc, P ou o ícone na tela de morte abrem a pausa; "continuar" começa a próxima tentativa.
- **Teste que impede a volta:** manual

## B12 — Trocar de dedo para de mover a alma · corrigido (0.2.0)
- **Reproduzir:** arrastando com um dedo, encostar outro e soltar o primeiro: a alma para até tocar de novo.
- **Causa:** `input.js` só acompanha o primeiro ponteiro e não passa o arrasto pro dedo que ficou.
- **Correção:** transferir o arrasto pro ponteiro ainda ativo.
- **Feito:** `input.js` passa o arrasto pro dedo que continua na tela.
- **Teste que impede a volta:** manual (Playwright não simula dois dedos de forma confiável)

## B13 — Teleguiada com curva depende do fps · corrigido (0.2.0)
- **Causa:** a curva é integrada por frame, então o caminho muda conforme o fps do aparelho; o solver não consegue prever.
- **Correção:** integrar em passo fixo (1/240 s) dentro da simulação.
- **Feito:** curva integrada em passo fixo (`CONFIG.ataques.passoGuia` = 1/240 s).
- **Teste que impede a volta:** `tests/padroes.test.js` › teleguiada faz o mesmo caminho em 30, 60 e 144 fps

## B14 — Calibração salva valores fora da faixa · corrigido (0.2.0)
- **Causa:** o resultado da calibração não é limitado (os botões −/+ limitam a −100…600 ms).
- **Correção:** limitar igual.
- **Feito:** resultado limitado a −100…600 ms.
- **Teste que impede a volta:** —

## B15 — Sem proteção contra NaN no movimento · corrigido (0.2.0)
- **Causa:** se a medida do canvas der 0 (rotação em alguns navegadores), o arrasto divide por zero e a alma vira NaN: some e fica "invencível".
- **Correção:** guardas contra divisão por zero/NaN na entrada e na simulação.
- **Teste:** fuzzing de entrada com valores extremos → posição sempre finita.
- **Feito:** `sim.js` nunca aceita NaN/Infinity (entrada, tempo, alvo); `input.js` ignora medida zero do canvas.
- **Teste que impede a volta:** `tests/sim.test.js` › entradas malucas

## B16 — Duas abas abertas sobrescrevem o save uma da outra · corrigido (0.2.0)
- **Correção:** ouvir o evento `storage` e mesclar/recarregar; gravar com contador de revisão.
- **Feito:** evento `storage`: o save da outra aba é mesclado (`Save.mesclar`: vale o melhor de cada um).
- **Teste que impede a volta:** `tests/save.test.js` › duas abas

## B17 — Cada fase aberta guarda um pool próprio de 768 objetos · corrigido (0.2.0)
- **Efeito:** com 40 fases ≈ 30 mil objetos presos na memória.
- **Correção:** um pool único, compartilhado.
- **Feito:** o pool de cada fase tem o tamanho do pico dela (dezenas de objetos, não 768).
- **Teste que impede a volta:** `tests/padroes.test.js` › o pool nunca descarta

## B18 — Botões e textos pequenos no celular · aberto (planejado pra Etapa 5)
- **Medido:** botões de 14–22 px lógicos (≈ 19–29 px num celular de 640 px de largura) e fonte de 7 px (≈ 9 px). O recomendado pra toque é ≈ 44 px.
- **Correção:** layout com escala de interface para telas pequenas + opção de tamanho de texto (Etapa 5).

## B19 — Um erro no meio do desenho deixava a tela torta pra sempre · corrigido (0.2.0)
- **Encontrado:** na Sessão 1, testando a captura de erros.
- **Reproduzir:** qualquer exceção durante o desenho da fase (ex.: forçada no `Render.ataques`). A partir daí todos os frames saíam cortados e deslocados, inclusive o aviso de erro.
- **Causa:** o erro interrompia o desenho depois de `save()`/`translate()`/`clip()` e antes do `restore()`; o estado do canvas ficava aberto.
- **Correção:** depois de capturar um erro, o loop fecha os estados abertos e zera transformação, transparência e modo de composição.
- **Teste:** `tools/navegador/erros.js` (força 3 erros no desenho e confere que a tela volta ao normal e o aviso aparece).

## B20 — Arrastar com o mouse: a bolinha andava mais que o cursor e saía de sincronia · corrigido (0.2.0)
- **Reportado por:** você, jogando.
- **Reproduzir:** segurar e arrastar a bolinha com o mouse: ela andava 25% a mais que o cursor e, em movimentos rápidos, atrasava e perdia parte do movimento.
- **Causa:** o mouse usava a sensibilidade do dedo (1,25); a alma seguia o arrasto com limite de 560 px/s e um buffer de 24 px que jogava o excesso fora; o primeiro movimento antes do frame seguinte se perdia; fora da janela o mouse parava de responder.
- **Correção:** mouse sempre 1:1 (`CONFIG.toque.sensibilidadeMouse`); arrasto ancorado no clique (a alma vai pra onde o cursor levou, sem acumular erro); sem buffer; limite de 1400 px/s (a colisão em sub-passos garante que nada atravessa nada); captura do ponteiro (funciona fora da janela); encostou na parede e voltou, a alma volta na hora.
- **Teste:** `tests/sim.test.js` › o dedo/mouse leva a alma exatamente até o alvo · `tools/navegador/mouse.js` (lento, puxão rápido, volta, parede: tudo 1:1).

## B21 — Paredes com "centro" em lista ficavam invisíveis e sem colisão · corrigido (0.3.0)
- **Encontrado:** na Sessão 2, montando o inspetor do editor (o validador aceita lista no `centro`, e o editor deixa criar).
- **Reproduzir:** evento `{ tipo: 'paredes', centro: [0.3, 0.5] }` (modo normal, de fechar). As duas paredes viravam `NaN`: não apareciam e não matavam.
- **Causa:** o modo normal fazia `(ev.centro || 0) * largura`; com uma lista de 2+ valores isso dá `NaN` (o modo "buraco" já tratava lista).
- **Correção:** o modo normal usa o primeiro valor da lista.
- **Teste:** `tests/padroes.test.js` › paredes com centro em lista têm posição de verdade.
