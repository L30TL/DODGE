# Dodge

Jogo arcade 2D de navegador: uma alma presa numa caixa desvia de ataques que caem no ritmo de músicas chiptune procedurais. Um toque = morte, barra de %, restart instantâneo. Design completo em `DESIGN.md` (fonte da verdade; decisões registradas no fim dele).

## Fase atual
- **Fase 1** (núcleo): completa e no ar em https://l30tl.github.io/DODGE/ (GitHub Pages, branch `main`).
- **OVERHAUL** (veja `DESIGN.md › OVERHAUL`): Etapa 0 (auditoria) concluída e aprovada. **Sessão 1 (fundação) concluída em 17/11/2026** (versão 0.2.0-dev): simulação pura, render separado, save v2, captura de erros, validador, 24 testes, bugs B01–B17, B19, B20 corrigidos (B18 fica pra Etapa 5). **Sessão 2 (editor) concluída em 17/11/2026** (0.3.0-dev): modificadores da caixa (encolher, girar, escurecer, inverter, espelho) no motor, editor completo (linha do tempo com a música, ímã, paleta, inspetor, prévia, tocar, testar daqui, desfazer, salvamento automático), Minhas Fases, B21. **Sessão 3 concluída** (0.4.0-dev): verificar vencendo do começo + solver, código curto de compartilhar e importar, filtro de palavrão, jogar fases criadas, B22. **Próxima: Sessão 4** (Fase 3, parte 1: moedas comuns + loja de visual, conquistas, missões diárias/semanais, avatar em camadas...). Histórico em `CHANGELOG.md`, bugs em `BUGS.md`.

## Plano do overhaul por sessão
Ordem combinada: o que falta do roadmap original entra antes das etapas novas; a fundação da Etapa 1 vem primeiro porque o editor, o solver e os testes dependem dela.

| Sessão | Conteúdo | Para pra testar? |
|---|---|---|
| S1 | Fundação: simulação pura (`sim.js`, sem canvas, roda no Node), `node --test`, save v2 (migração, backup, recuperação), captura global de erros, correção dos bugs B01–B18 possíveis já, `CHANGELOG.md` | — |
| S2–S3 | Fase 2 que falta: editor (linha do tempo em batidas com música, modificadores da caixa, testar de qualquer ponto, verificar vencendo, solver antes de publicar, código curto validado, filtro de palavrão, desfazer/refazer, salvamento automático) | — |
| S4–S5 | Fase 3 que falta: moedas comuns + loja de visual, conquistas, missões diárias/semanais, avatar em camadas, efeitos de nick, emblemas, molduras, coleção, modo treino, modo infinito, inglês, Demons destravados por estrelas | — |
| S6 | Resto da Etapa 1: solver novo (grade, 1/60 s, curva de aperto, assistir o bot), estresse (500 restarts, 2000 projéteis, infinito 30 min), fuzzing, casos de borda, painel F3, navegadores | **sim** |
| S7–S8 | Etapa 2: modos da alma (livre, gravidade, trilhos, escudo, gelo, mini) + perigos novos + chefes + "mapa musical" (ataques nas notas reais da música) + áudio com mais qualidade no mesmo estilo | — |
| S9–S14 | Etapa 3: um mundo por sessão (5 fases + chefe, músicas próprias, solver) | **a cada mundo** |
| S15 | 4 Demons extras, terminando no Extreme Demon | sim |
| S16 | Etapa 4 (mais viciante) | — |
| S17–S18 | Etapa 5 (polimento, checklist completa) | — |
| S19 | Etapa 6 (QA final + relatório) | fim |
| — | Fase 4 (online/Firebase): depende do usuário criar o projeto no Firebase | — |

Distribuição planejada de dificuldades (~40 fases, todas passam no solver):
Mundo 1 Caixa: Fácil, Fácil, Normal, Fácil (respiro), Normal, chefe Normal · Mundo 2 Gravidade: Fácil, Normal, Normal, Fácil (respiro), Difícil, chefe Difícil · Mundo 3 Trilhos: Normal, Difícil, Difícil, Normal (respiro), Dificílimo, chefe Dificílimo · Mundo 4 Escudo: Difícil, Dificílimo, Dificílimo, Difícil (respiro), Insano, chefe Insano · Mundo 5 Gelo: Dificílimo, Insano, Insano, Dificílimo (respiro), Demon Fácil, chefe Demon Fácil · Mundo 6 Caos: Insano, Demon Fácil, Demon Médio, Insano (respiro), Demon Difícil, chefe Demon Difícil · Extras: Demon Médio, Demon Difícil, Demon Insano, Extreme Demon.
As 3 fases atuais (Despertar, Correnteza, Prensa) entram no Mundo 1, refeitas, mantendo os mesmos ids (o save delas não se perde).

## Estrutura
HTML5 Canvas + JavaScript puro, sem frameworks e sem build. Scripts clássicos carregados em ordem pelo `index.html`; cada arquivo expõe um objeto global.

| Arquivo | Global | Papel |
|---|---|---|
| `erros.js` | `Erros` | Captura global de erros (carrega primeiro): aviso discreto + registro copiável |
| `config.js` | `CONFIG` | Todos os números de ajuste, comentados (inclui `limites`, `sim`, `render`, `save`) |
| `criadas.js` | `Criadas` | Fases criadas no editor (`dodge.criadas`): versão/migrações, backup, corrompido, mescla entre abas, lixeira |
| `filtro.js` | `Filtro` | PURO: filtro de palavrão (nomes) |
| `codigo.js` | `Codigo` | PURO: código curto de compartilhar fase (`DG1Z.…`), gerar e ler com todas as proteções |
| `save.js` | `Save` | Save v2 (`dodge.save`): migrações, backup, recuperação de corrompido, mescla entre abas, regras de progresso (`registrarMorte`, `registrarVitoria`) |
| `ui.js` | `TEXTOS`, `t()`, `PAL`, `Fonte`, `Sprites`, `UI`, `Controles` | Textos, paleta, fonte pixel própria, ícones, botões/sliders e telas de menu (título, fases, config, calibração) |
| `audio.js` | `Sound` | Sequenciador chiptune (pulso 25%/12,5%, triangular, ruído, bumbo), músicas, efeitos, relógio do jogo |
| `avatar.js` | `Avatar` | A alma como dado (camadas `{ peca, cor, posicao }`) |
| `input.js` | `Input` | Teclado (setas/WASD) e arrasto em qualquer lugar da tela (mouse 1:1, dedo com sensibilidade, ancorado no toque) |
| `patterns.js` | `Patterns` | PURO: validador de fases, os 7 padrões → specs analíticas, pool do tamanho do pico, colisão (SDF) |
| `sim.js` | `Sim` | PURO: `Sim.Corrida` = uma tentativa (movimento, sub-passos, raspão, moedas, morte, vitória). Jogo, bots e testes usam a mesma |
| `render.js` | `Render` | Desenho dos ataques (avisos, balas — em camada de pixels quando são muitas —, lasers, paredes, moedas, hitboxes) |
| `levels.js` | `Levels` | Fases como dados `{ id, nome, autor, dificuldade, musica, bpm, duracaoBatidas, eventos }` |
| `game.js` | `Game` | Loop, navegação, tela de jogo: lê o tempo do áudio, passa a entrada pra `Sim.Corrida` e transforma os eventos em som/partículas/save |
| `solver.js` | `Solver` | PURO: prova que a fase é vencível (alcançabilidade), inteira ou aos poucos (`Solver.Analise(f).avancar(ms)`) |
| `debug.js` | `Debug` | Painel `?debug=1`, bot, mapa de mortes (o analisador mora no `solver.js`) |
| `editor.js` | `Editor`, telas `editor` e `criadas` | Núcleo puro (campos do inspetor, ímã, compilação pra linha do tempo, desfazer) + telas do editor e de Minhas Fases |
| `profile.js` | — | Stub (Fases 3–4) |
| `tools/verificar-fases.js` | — | CLI Node: prova que as fases são vencíveis + bots |
| `tests/*.test.js` | — | Testes `node --test` (padrões, simulação, modificadores, save, criadas, editor, textos); `tests/carregar.js` carrega os scripts no Node |
| `tools/navegador/*.js` | — | Testes no navegador (Playwright): regressão dos bugs, mouse, estresse, erros |

## Como rodar
```bash
python3 -m http.server 8000
```
Abrir http://localhost:8000. Debug: http://localhost:8000/?debug=1
(teclas no debug: H hitbox, I invencível, L câmera lenta, B bot, K morrer, 0–9 pula pra 0–90%, [ ] ±5%)

Testes (precisa de Node; nenhuma biblioteca):
```bash
node --test                              # 51 testes, ~45 s
node tools/verificar-fases.js            # prova que as fases são vencíveis + bots
DETALHE=1 node tools/verificar-fases.js prensa
node tools/navegador/regressao.js        # com o servidor ligado; precisa do Playwright
node tools/navegador/editor.js           # o editor de ponta a ponta (criar, editar, desfazer, tocar, testar)
node tools/navegador/modificadores.js    # caixa girada/encolhida/escura/invertida/espelhada
node tools/navegador/compartilhar.js     # verificar vencendo, código, importar, filtro, jogar fase criada
```

## Regras de trabalho
- **Falar sempre em português** com o usuário.
- Seguir as etapas do overhaul na ordem e parar nos pontos combinados (fim da Etapa 1 e a cada mundo).
- Perguntar antes de instalar qualquer ferramenta.
- Registrar bugs em `BUGS.md` (reproduzir, causa, correção, teste) e mudanças em `CHANGELOG.md`.
- Edições pontuais; não reescrever arquivos inteiros sem necessidade.
- Testar num servidor local sem erros no console antes de dizer que terminou.
- Rodar `tools/verificar-fases.js` depois de mexer em fases ou padrões.
- Commit a cada parte que funciona; push no fim de cada sessão.
- Atualizar `DESIGN.md` (seção Decisões) e este arquivo quando algo mudar.
- O tempo do jogo vem de `Sound.posicao()` (relógio do áudio), nunca de frames.
- Lógica de jogo nova vai pro lado PURO (`patterns.js`/`sim.js`/`save.js`) com teste; desenho vai pro `render.js`/`game.js`.
- Mudou o formato do save? Suba `Save.VERSAO` e escreva a migração em `MIGRACOES` (com teste).
- Nenhum número mágico de jogabilidade fora do `config.js`. Todo texto visível em `TEXTOS`.
