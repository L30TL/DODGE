# BUGS.md — Dodge

Cada bug: como reproduzir, causa, correção e o teste que impede ele de voltar.
Status: **aberto** · **corrigido** (com versão/commit).

Encontrados na auditoria da Etapa 0 (17/11/2026). "Sonda" = teste de navegador que reproduziu o bug.

---

## B01 — Morrer depois do fim da fase conta como 99% · aberto
- **Reproduzir:** fase com um perigo que liga exatamente na última batida (ou logo depois). A alma morre em 99% em vez de vencer. (sonda P1)
- **Causa:** `game.js › atualizarJogo` testa colisão em sub-passos até o tempo do frame, mesmo depois de `duracao`; a vitória só é checada depois da colisão.
- **Correção:** limitar os sub-passos a `duracao`; se o frame passou do fim sem morrer antes, vence.
- **Teste:** simulação pura com perigo ligando em t = duração → resultado "vitória".

## B02 — Áudio suspenso/interrompido congela o jogo sem aviso · aberto
- **Reproduzir:** iPhone com ligação/Siri no meio da fase, ou áudio bloqueado pelo navegador; em teste, `AudioContext.suspend()`. O tempo para, os ataques congelam e nada aparece na tela. (sonda P2)
- **Causa:** o relógio do jogo é o áudio; com o `AudioContext` parado o tempo não anda e ninguém percebe.
- **Correção:** detectar áudio parado por mais de 0,3 s → pausar e mostrar "toque para continuar"; o toque retoma o áudio.
- **Teste:** navegador com contexto suspenso → aparece o aviso e o jogo retoma no toque.

## B03 — Save corrompido é substituído sem backup · aberto
- **Reproduzir:** `localStorage['dodge.save.v1']` com JSON cortado → o jogo começa do zero e grava um save novo por cima (o antigo, com recordes, some). (sonda P3)
- **Causa:** `save.js › carregar` cai no `catch`, cria save novo e marca "indisponível"; o próximo `gravar()` apaga o original.
- **Correção:** guardar o texto corrompido numa chave à parte, manter backup do último save bom e tentar recuperar dele; migrações versionadas.
- **Teste:** `node --test` com save cortado / campos inválidos / versão antiga → recupera do backup e nunca apaga o original.

## B04 — Recorde perdido ao fechar o jogo logo depois de morrer · aberto
- **Reproduzir:** bater recorde e fechar/recarregar a página em menos de 0,8 s. O recorde não fica salvo. (sonda P4)
- **Causa:** a morte grava com `gravarDepois()` (espera 800 ms) e não há gravação ao esconder/fechar a página.
- **Correção:** gravar na hora quando há recorde, moeda ou vitória; gravar também em `pagehide`/`visibilitychange`.
- **Teste:** navegador recarrega 50 ms depois de um recorde → o recorde está no save.

## B05 — Fase nova começa pausada · aberto
- **Reproduzir:** morrer, trocar de aba durante a tela de morte, voltar, apertar Esc (vai pra lista) e abrir outra fase: ela já começa pausada. (sonda P5)
- **Causa:** a flag `pausarAoVoltar` não é zerada ao sair da fase.
- **Correção:** zerar ao preparar/sair de uma fase.
- **Teste:** sequência acima automatizada → estado inicial "jogando".

## B06 — Projéteis somem em silêncio acima de 768 · aberto
- **Reproduzir:** fase com mais de 768 projéteis vivos ao mesmo tempo: o excesso não aparece. (sonda P6)
- **Causa:** pool fixo (`CONFIG.ataques.poolTamanho`); quando acaba, `nascer()` descarta.
- **Correção:** calcular na compilação o máximo de projéteis simultâneos e dimensionar o pool; o editor avisa o limite.
- **Teste:** fase com 2000 projéteis → todos aparecem.

## B07 — 2000 projéteis passam do orçamento de frame em celular fraco · aberto
- **Medido:** CPU 4× mais lenta, 2000 balas na tela: JS por frame médio 11,1 ms, p95 14,9 ms (meta: p95 ≤ 8 ms pra sobrar folga). (sonda P11)
- **Causa:** um `drawImage` por bala sem lote; colisão testa todos os projéteis em todos os sub-passos.
- **Correção:** desenho em lote com sprites pré-prontos, descartar o que está fora da caixa, colisão com grade espacial e sub-passos só quando há algo perto.
- **Teste:** estresse automatizado de 2000 projéteis com CPU 4× lenta.

## B08 — Fase/código malformado trava ou quebra em silêncio · aberto
- **Reproduzir:** um evento `espiral` com `dur: 2000` gera 1.000.000 de projéteis (1,3 s só pra compilar; com 20000 trava). Dados inválidos (`pos: "abc"`, `batida: NaN`) viram tempos NaN sem erro.
- **Causa:** `patterns.js` não valida nem limita parâmetros.
- **Correção:** validador por tipo de evento (faixas, tipos, NaN), teto de projéteis por fase; o editor mostra o erro em vez de travar.
- **Teste:** fuzzing de eventos e de códigos de compartilhar → nunca trava, nunca gera NaN.

## B09 — % da morte calculado no fim do frame · aberto
- **Reproduzir:** morrer perto de um número redondo (ex.: 49,9%) pode marcar 50%.
- **Causa:** `J.prog` usa o tempo do fim do frame, não o do sub-passo da morte.
- **Correção:** calcular o % com o tempo exato da colisão.
- **Teste:** simulação com morte em t conhecido → % exato.

## B10 — Textos fora do objeto TEXTOS · aberto
- **Onde:** `ui.js`: `'JOGAR'`, `'SAVE INDISPONÍVEL NESTE NAVEGADOR'`, `'V0.1'`, `'DEBUG'`.
- **Efeito:** não vão traduzir pro inglês.
- **Correção:** mover pra `TEXTOS`.
- **Teste:** varredura automática procurando strings visíveis fora de `TEXTOS`.

## B11 — Ícone de pausa na tela de morte sai pro menu · aberto
- **Reproduzir:** morrer e tocar no ícone de pausa (canto): vai pra lista de fases em vez de pausar.
- **Correção:** comportamento consistente (pausa).

## B12 — Trocar de dedo para de mover a alma · aberto
- **Reproduzir:** arrastando com um dedo, encostar outro e soltar o primeiro: a alma para até tocar de novo.
- **Causa:** `input.js` só acompanha o primeiro ponteiro e não passa o arrasto pro dedo que ficou.
- **Correção:** transferir o arrasto pro ponteiro ainda ativo.

## B13 — Teleguiada com curva depende do fps · aberto
- **Causa:** a curva é integrada por frame, então o caminho muda conforme o fps do aparelho; o solver não consegue prever.
- **Correção:** integrar em passo fixo (1/240 s) dentro da simulação.

## B14 — Calibração salva valores fora da faixa · aberto
- **Causa:** o resultado da calibração não é limitado (os botões −/+ limitam a −100…600 ms).
- **Correção:** limitar igual.

## B15 — Sem proteção contra NaN no movimento · aberto
- **Causa:** se a medida do canvas der 0 (rotação em alguns navegadores), o arrasto divide por zero e a alma vira NaN: some e fica "invencível".
- **Correção:** guardas contra divisão por zero/NaN na entrada e na simulação.
- **Teste:** fuzzing de entrada com valores extremos → posição sempre finita.

## B16 — Duas abas abertas sobrescrevem o save uma da outra · aberto
- **Correção:** ouvir o evento `storage` e mesclar/recarregar; gravar com contador de revisão.

## B17 — Cada fase aberta guarda um pool próprio de 768 objetos · aberto
- **Efeito:** com 40 fases ≈ 30 mil objetos presos na memória.
- **Correção:** um pool único, compartilhado.

## B18 — Botões e textos pequenos no celular · aberto
- **Medido:** botões de 14–22 px lógicos (≈ 19–29 px num celular de 640 px de largura) e fonte de 7 px (≈ 9 px). O recomendado pra toque é ≈ 44 px.
- **Correção:** layout com escala de interface para telas pequenas + opção de tamanho de texto (Etapa 5).
