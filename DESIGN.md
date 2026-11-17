# Dodge — Documento de Design

> Prompt original do projeto, salvo na íntegra. Decisões que mudarem ficam registradas na seção "Decisões" no fim.

Quero criar com você, do zero, o Dodge: um jogo arcade 2D de navegador, simples de entender e insanamente viciante. Não existe código antigo: começamos de uma pasta vazia. Leia tudo antes de começar.

## A ideia
Você é uma alma presa numa caixa e precisa sobreviver a ataques que caem no ritmo da música. Inspirações: Geometry Dash (fases com dificuldade própria, barra de %, restart instantâneo, editor), Just Shapes & Beats (desviar no ritmo), a caixa de batalha do Undertale e a customização do Sackboy (LittleBigPlanet). Só inspiração: arte, ícones e nomes têm que ser originais.

## Regras
- Um toque = morte. Fases de 60 a 120 segundos.
- Sem seletor de dificuldade. Cada fase tem a sua: Easy, Normal, Hard, Harder, Insane e Demon (Easy, Medium, Hard, Insane e Extreme Demon), cada uma com ícone próprio.
- Vencer dá estrelas: Easy 1★, Normal 2★, Hard 3★, Harder 4★, Insane 5★, Demon 10★. Fases Demon destravam com estrelas.
- Fases 100% determinísticas: mesma fase = mesmos ataques, sempre.
- 3 moedas secretas por fase, em lugares perigosos.
- Modo treino com checkpoints. Não conta como vitória.
- Modo infinito procedural com recorde, usando os mesmos padrões de ataque.

## O que faz viciar (prioridade máxima)
- Ataques na batida, sempre com aviso visual antes. A morte tem que parecer culpa do jogador.
- Barra de % no topo. Na morte, "87%" bem grande, e "NOVO RECORDE!" com som.
- Restart em menos de meio segundo, sem menu, com a música voltando junto. Contador "Tentativa 143".
- Os primeiros segundos de cada fase são tranquilos, pra o restart ter ritmo.
- Hitbox bem menor que o sprite. Passar raspando mostra "RASPOU!", com som e moedas extras.
- Juice: tremida de tela, partículas, flash na morte, caixa pulsando no ritmo.
- A lista de fases mostra dificuldade, estrelas, moedas secretas e uma barra com o melhor %.
- Ao vencer, botão "Próxima →" em destaque.

## Primeira experiência
- O jogo abre numa tela "toque pra começar" (que também libera o áudio) e, no primeiro toque, já está jogando a primeira fase. Sem tutorial em texto.
- A primeira fase ensina tudo jogando, e qualquer pessoa vence em até 3 tentativas. Quem nunca jogou tem que sentir que é bom nisso.

## Design de fases
- Cada fase apresenta no máximo um padrão novo: primeiro sozinho e devagar, depois misturado com os conhecidos.
- Alterna tensão e respiro (2 a 4 batidas mais calmas) e guarda o trecho mais difícil pra entre 70% e 95%.
- A intensidade segue a música: refrão = mais ataques, parte calma = menos.
- Até Insane, todo ataque tem aviso de pelo menos 1 batida (nunca menos de ~300 ms). Demons podem exigir memorização, mas nunca ser impossíveis.

## Crie sua própria fase
- Linha do tempo em batidas, com a música tocando. Ataques colocados nas batidas, com posição, direção, velocidade e quantidade ajustáveis.
- Modificadores da caixa como eventos: encolher, girar, escurecer, inverter controles, duas almas espelhadas.
- Testar a partir de qualquer ponto.
- Pra publicar, o criador precisa vencer a própria fase.
- O criador sugere a dificuldade. Com o online, quem venceu vota.
- Compartilhar por código curto.

## Personalização infinita (estilo Sackboy)
- A alma é montada em camadas: forma do corpo, olhos, boca, cabelo/chapéu, acessório, padrão (listras, bolinhas, xadrez), adesivos posicionáveis, rastro, aura e explosão de morte.
- Cor livre em cada camada (seletor completo + paletas salvas). Peças pequenas e combináveis em pixel art, pra ter centenas sem desenhar tudo à mão.
- Vários visuais salvos pra trocar rápido.
- No jogo, a alma fica pequena e legível, e a hitbox é igual pra todo mundo. O visual completo aparece grande no menu, no perfil e na tela de vitória.
- Efeitos de nickname: cor, degradê, brilho, arco-íris animado, onda, faíscas.
- Molduras de perfil por conquista (ex.: moldura de fogo pra quem venceu um Extreme Demon).
- Tudo se libera jogando: moedas comuns (raspões, % alcançado e vitórias) compram peças básicas; moedas secretas, Demons e conquistas liberam as raras. Nada dá vantagem e nada custa dinheiro real.
- Tela de coleção com silhuetas do que falta.

## Motivos pra voltar
- Missões diárias que pagam moedas (ex.: "raspe 50 vezes", "chegue a 80% numa fase Hard").
- Fase do dia e Demon da semana, com ranking (com o online).

## Perfil e Dodge ID
- Dá pra jogar como convidado, com save local. Ao criar o Dodge ID, todo o progresso vai junto.
- Dodge ID: nick + tag de 4 dígitos (ex.: Leo#4821). Login com Google ou e-mail e senha (Firebase Auth).
- Coletar o mínimo de dados: login e nick. Nada de nome real, endereço ou telefone.
- Filtro de palavrão em nicks e nomes de fase.
- Foto de perfil: emblema do jogo (dezenas, liberados jogando), o próprio avatar da alma ou upload de imagem. O upload passa por uma fila de aprovação num painel de admin antes de aparecer pros outros.
- Cartão de perfil público: foto ou emblema, moldura, nick com efeito, estrelas, Demons vencidos, fases criadas e vitrine com 3 fases.

## Configurações
- Calibração do atraso de áudio (fone bluetooth atrasa o som), com um teste rápido de batida.
- Opção de reduzir flashes e tremida de tela.
- Volume de música e de efeitos separados.
- Pausa automática quando a aba perde o foco.

## Visual e som
- Pixel art em grade de 4px, escala 4×, paleta limitada e alto contraste. Ataques sempre fáceis de ler.
- Músicas chiptune procedurais com Web Audio API: um sequenciador próprio com canais de onda quadrada, triangular e ruído, e cada música com BPM fixo. Comece com 3 músicas.
- Efeitos sonoros procedurais: morte, raspão, recorde, moeda, vitória, menu.
- Canvas 16:9 que se adapta a PC e celular, a 60 fps mesmo em celular fraco.
- Interface em português, com todos os textos num objeto só. Inglês entra na Fase 3.

## Controles
- PC: setas ou WASD.
- Celular: arrastar o dedo em qualquer lugar da tela, e a alma copia o movimento relativo.

## Técnica
- HTML5 Canvas + JavaScript puro, sem frameworks, separado em arquivos: index.html, config.js, game.js, input.js, audio.js, patterns.js, levels.js, editor.js, avatar.js, profile.js, ui.js, save.js, debug.js.
- O tempo do jogo segue o relógio do áudio (AudioContext.currentTime), não os frames.
- Todos os números de ajuste (velocidade da alma, tamanho da hitbox, tempo de aviso, força da tremida etc.) ficam no config.js, comentados, pra eu mesmo ajustar.
- Fases são dados, no formato do editor:
  { nome, autor, dificuldade, musica, bpm, duracaoBatidas, eventos: [{ batida, tipo, ...parametros }] }
- O avatar também é dado: uma lista de camadas { peca, cor, posicao }, pra salvar e desenhar em qualquer tela.
- Padrões de ataque reutilizáveis: chuva, espiral, fogo cruzado, onda teleguiada, laser com aviso, paredes que fecham, anel que explode.
- Pool de objetos para os projéteis, pra não engasgar no celular.
- Modo debug (só em desenvolvimento): pular pra qualquer % da fase, mostrar hitboxes, câmera lenta, invencibilidade.
- Mapa de mortes: registrar em que % cada morte acontece, por fase, pra achar trechos injustos.
- Save no localStorage com try/catch. Na Fase 4, sincroniza com o Firestore, com regras de segurança em que cada jogador só escreve nos próprios dados e validações no ranking contra pontuação falsa.
- Publicado no GitHub Pages, pra eu testar no celular e mandar pros amigos.

## Roadmap (construa SÓ a Fase 1 agora)
Fase 1, projeto e núcleo: estrutura de pastas, Git, repositório no GitHub e GitHub Pages; config.js e modo debug; motor de fases, caixa, movimento, 3 fases (Easy, Normal, Hard) com 3 músicas, barra de %, restart instantâneo, tentativas, raspão, juice, lista de fases com melhor %, primeira experiência e configurações.
Fase 2, editor: criar, testar, verificar e compartilhar por código. As fases oficiais vão ser feitas nele.
Fase 3, progressão e personalização: estrelas, moedas, conquistas, missões diárias, avatar em camadas, efeitos de nick, emblemas, molduras, coleção, modo treino, modo infinito, inglês e 10 fases oficiais, do Easy até o primeiro Demon.
Fase 4, Dodge ID e online: contas, perfis públicos, upload com aprovação, publicar e votar fases, ranking, fase do dia e Demon da semana.

## A Fase 1 está pronta quando
- As 3 fases dão pra vencer, e alguém novo vence a Easy em até 3 tentativas.
- O restart leva menos de meio segundo e a música nunca dessincroniza, nem depois de 50 tentativas seguidas.
- Roda a 60 fps no celular, sem erro no console.
- Está no GitHub Pages e funciona no celular com o dedo.

## Como trabalhar comigo
- Primeiro passo: salve este prompt inteiro como DESIGN.md na raiz do projeto e crie um CLAUDE.md curto (o que é o jogo, estrutura dos arquivos, como rodar, fase atual do roadmap). Atualize os dois sempre que uma decisão mudar. Assim, se eu perder esta conversa, nada se perde.
- Inicie o Git e me ajude a criar o repositório no GitHub (se o gh não estiver instalado, me passe o passo a passo). Faça commit com mensagem clara a cada parte que funcionar e dê push no fim de cada sessão.
- Antes de programar, me mostre um plano curto da Fase 1 e espere meu ok.
- Faça edições pontuais. Não reescreva arquivos inteiros sem necessidade.
- Antes de dizer que terminou algo, rode o jogo num servidor local e confira que não há erro no console.
- No fim de cada fase, me diga o que testar e o que eu devo sentir jogando.

---

# OVERHAUL (ampliação, pedido em 17/11/2026)
> Prompt do overhaul salvo na íntegra. Tudo acima continua valendo; isto amplia.
> Pedidos extras do usuário junto com este prompt: **muito mais fases**, com **mais fases de cada dificuldade** (Fácil, Normal, Difícil, Demon etc.), e **todas têm que ser possíveis** (nunca impossíveis de passar). Os ataques (lasers, tiros etc.) têm que ficar **sincronizados com as músicas**, que ele gostou; as músicas podem ganhar **mais qualidade sem mudar o estilo**.

Vamos fazer um overhaul completo do Dodge. Antes de qualquer coisa, leia o DESIGN.md, o CLAUDE.md e todo o código. Tudo o que está no DESIGN.md continua valendo; este prompt amplia.

Objetivo: o Dodge tem que ficar muito mais viciante, cheio de fases com mecânicas diferentes, sem nenhum bug conhecido e polido em todas as áreas.

## Regras que não mudam
- Um toque = morte. Fases determinísticas. Sem seletor de dificuldade: cada fase tem a sua, de Easy a Extreme Demon.
- Restart em menos de meio segundo. Música e jogo sempre sincronizados.
- Moedas só compram visual. Nada dá vantagem, nada custa dinheiro real.
- Nenhum save existente pode ser perdido: toda mudança no formato do save tem migração.

## Etapa 0: auditoria (pare aqui e espere meu ok)
Rode o jogo, leia tudo e me entregue um relatório curto:
- O que do roadmap do DESIGN.md já existe e o que falta. Se faltar algo, inclua no plano antes das etapas novas.
- Bugs encontrados, com como reproduzir.
- Problemas de desempenho, código bagunçado e partes difíceis de testar.
- Seu plano para as etapas abaixo, dividido por sessão.

## Etapa 1: debugging insano (antes de qualquer conteúdo novo)
1. Separe a lógica da renderização: uma simulação pura, sem canvas, que roda no navegador e no Node. Os testes e o solver dependem disso.
2. Testes automáticos com o test runner nativo do Node (node --test), sem bibliotecas:
   - Padrões de ataque dão sempre o mesmo resultado para o mesmo tempo.
   - Código de compartilhar fase: ida e volta sem perder nada; código quebrado ou malicioso nunca trava o jogo.
   - Save: salvar, carregar, migrar de versões antigas e recuperar de save corrompido (com backup).
   - Cálculo de %, estrelas, moedas, missões e conquistas.
3. Solver de fases: um bot que, usando a velocidade máxima da alma do config.js, procura numa grade da caixa (passo de 1/60 s) um caminho que sobrevive até o fim. Para cada fase ele informa:
   - se ela é possível;
   - o momento mais apertado (menor área segura e em que %);
   - uma curva de "aperto" ao longo da fase, pra achar picos injustos e ajudar a classificar a dificuldade.
   Toda fase oficial tem que passar no solver, e o editor roda o solver antes de deixar publicar. No modo debug, dá pra assistir o bot jogando.
4. Testes de estresse:
   - 500 restarts seguidos sem vazamento de memória e sem a música dessincronizar.
   - 2000 projéteis na tela mantendo 60 fps, com a CPU limitada em 4× no DevTools do Chrome.
   - Modo infinito rodando 30 minutos sem erro nem NaN.
   - Fuzzing: entradas e eventos aleatórios no jogo e no editor.
5. Casos de borda: morrer exatamente em 100%, dois toques no mesmo frame, trocar de aba, girar o celular, redimensionar a janela, áudio bloqueado ou interrompido (iPhone), sem internet, localStorage cheio ou desativado.
6. Navegadores: Chrome, Firefox, Edge e Safari do iPhone. Liste o que você não conseguir testar daí, pra eu testar.
7. Painel de debug (tecla F3): fps, ms por frame, número de objetos, uso do pool, tempo do áudio comparado ao tempo do jogo e % atual, com botões pra pular pra qualquer %, ver hitboxes, câmera lenta e invencibilidade.
8. Captura global de erros: qualquer erro vira um aviso discreto no jogo e um registro que eu possa copiar.
9. Mantenha um BUGS.md: cada bug com como reproduzir, a causa, a correção e o teste que impede ele de voltar.

## Etapa 2: novas mecânicas
Expanda o motor com modos da alma e novos perigos. Cada modo tem que funcionar com um dedo no celular e com teclado no PC.

Modos da alma (trocados por portais no meio da fase, como no GD):
- Livre: o modo atual.
- Gravidade: a alma cai e pula com toque ou ↑, e o dedo arrastando move pros lados. Plataformas surgem na caixa.
- Trilhos: a alma fica presa em 3 a 5 linhas e troca de linha deslizando pra cima ou pra baixo.
- Escudo: a alma fica parada no centro e gira um escudo pra bloquear ataques de 4 direções (no celular, tocando no lado de onde vem o ataque).
- Gelo: a alma desliza com inércia e quica nas paredes.
- Mini: a alma encolhe, mas fica mais rápida e mais difícil de controlar.

Novos perigos e eventos:
- Lasers que giram, serras que quicam e blocos que caem e viram chão.
- Zona "pare" (machuca se você se mexer) e zona "mova" (machuca se você parar), com forma e cor bem diferentes.
- Portais de teleporte.
- Escuridão com luz só em volta da alma.
- Labirinto vivo dentro da caixa, com paredes que se mexem no ritmo.
- Caixa que anda pela tela, gira e muda de formato (círculo, triângulo).
- Câmera: zoom, tremida forte e inversão de cores no "drop" da música, respeitando a opção de reduzir efeitos.
- Chefes: uma criatura fora da caixa que ataca em fases, com barra de vida que esvazia conforme a música avança.

Tudo isso também vira evento no editor.

## Etapa 3: muito mais fases
- 6 mundos temáticos, cada um com visual, paleta e trilha próprios e uma mecânica principal: 1. Caixa (livre), 2. Gravidade, 3. Trilhos, 4. Escudo, 5. Gelo, 6. Caos (portais alternando todos os modos).
- Cada mundo tem 5 fases + 1 chefe. Depois deles, 4 fases Demon extras, terminando num Extreme Demon final. Total: cerca de 40 fases oficiais.
- Cada mundo apresenta a mecânica primeiro sozinha e devagar, e depois mistura com as anteriores.
- A dificuldade sobe ao longo dos mundos, mas cada mundo tem uma fase mais tranquila no meio, pra respirar.
- Cada fase tem nome, música própria e 3 moedas secretas, e passa no solver.
- Classifique a dificuldade com o solver e o mapa de mortes, não no olho.
- Faça um mundo por vez e pare pra eu jogar e aprovar antes do próximo.

## Etapa 4: mais viciante
- Marcador do recorde na barra de %, pra eu ver o momento exato em que estou passando do meu melhor.
- Sons de marco em 50%, 75% e 90%. Morrer acima de 90% mostra "QUASE!".
- Botão "Continuar" na tela inicial que leva direto pra última fase não vencida.
- Ritmo de recompensas: na primeira hora, algo novo desbloqueia a cada poucos minutos (peça, emblema, fase ou conquista).
- Missões diárias e semanais visíveis no menu, mostrando quanto falta.
- Compartilhar resultado: depois de morrer ou vencer, um botão copia um texto tipo "Dodge • Fase X • 94% em 143 tentativas", com uma barrinha de emojis e o link do jogo.
- Mais conquistas, emblemas, molduras e peças de personalização, incluindo itens exclusivos de cada mundo e de cada chefe.
- Ranking por fase, se o online já existir.

## Etapa 5: polimento em todas as áreas
Passe por cada área com esta checklist e corrija tudo que não estiver no nível de um jogo comercial:
- Game feel: controle responsivo, aceleração da alma bem ajustada, hitbox justa, feedback em cada ação.
- Visual: paleta consistente, animação em tudo, fundo reagindo à música, transições rápidas (menos de 200 ms), perigos legíveis por forma e cor, nunca só por cor.
- Áudio: mixagem equilibrada, música abaixando um pouco nos efeitos importantes, nenhum som estourado.
- Menus: qualquer lugar a no máximo 2 toques, botões grandes no celular, animação ao tocar.
- Celular: tela cheia, sem zoom nem scroll acidental, funcionando em pé e deitado (ou travando a orientação com aviso).
- Desempenho: carrega em menos de 3 s, download inicial abaixo de 8 MB, 60 fps em celular fraco.
- Acessibilidade: modo daltônico pros perigos, opção de reduzir flashes e tremida, tamanho de texto ajustável.
- Textos: português e inglês completos, nenhum texto cortado.
- Editor: desfazer/refazer, atalhos, salvamento automático e prévia rápida.

## Etapa 6: QA final
- Todos os testes passando, todas as fases passando no solver, zero erro no console.
- O bot completa o jogo inteiro, do começo ao Extreme Demon, sem travar.
- Relatório final: o que mudou, bugs corrigidos, métricas (fps, tamanho, tempo de carregamento) e uma lista do que eu devo testar jogando.

## Como trabalhar (overhaul)
- Siga as etapas na ordem. Pare no fim da Etapa 0, no fim da Etapa 1 e a cada mundo da Etapa 3 pra eu testar e aprovar.
- Atualize o CLAUDE.md com o progresso a cada parte concluída, pra outra sessão continuar exatamente de onde parou se o meu limite acabar.
- Atualize o DESIGN.md com as novas mecânicas e mantenha um CHANGELOG.md.
- Faça commit com mensagem clara a cada parte que funcionar e dê push no fim de cada sessão.
- Faça edições pontuais. Não reescreva arquivos inteiros sem necessidade.
- Se precisar instalar alguma ferramenta (ex.: Playwright pra testar no navegador), me pergunte antes.
- No fim de cada etapa, me diga o que testar e o que eu devo sentir jogando.
- **Fale sempre em português.**

---

## Decisões
_(registro de decisões tomadas durante o desenvolvimento; a mais recente embaixo)_

- 2026-11-16 — Repositório: `github.com/L30TL/DODGE` (já existia). Desenvolvimento no branch `claude/funny-ptolemy-kgztmw`; o GitHub Pages vai publicar a partir do `main`.
- 2026-11-17 — **Resolução lógica 480×270** (grade de pixel). O canvas é ampliado pelo navegador com `image-rendering: pixelated`; quando cabe 3× ou mais, a escala é inteira (pixels perfeitos).
- 2026-11-17 — **Nomes das dificuldades** (no objeto `TEXTOS`): Fácil, Normal, Difícil, Dificílimo, Insano, Demônio. Os ids nos dados são `facil`, `normal`, `dificil`, `dificilimo`, `insano`, `demonio`. Interpretação: "Easy, Medium, Hard, Insane e Extreme Demon" são os 5 níveis *dentro* de Demônio (Fase 3).
- 2026-11-17 — **Ícones de dificuldade**: a própria alma (bolinha) com expressões diferentes por dificuldade (calma → determinada → brava → olhos doidos → chifres). Arte original.
- 2026-11-17 — **Restart automático** 0,4 s depois da morte (0,45 s quando bate recorde). Tocar/apertar qualquer tecla reinicia na hora. O "87%" continua visível, sumindo, no começo da tentativa seguinte. `R` reinicia a qualquer momento.
- 2026-11-17 — **Contador de tentativas** é o total da fase (salvo), não só da sessão.
- 2026-11-17 — **Formato dos eventos**: `batida` é quando o ataque fica PERIGOSO (bate com a música); o aviso aparece `aviso` batidas antes. Posições normalizadas de -1 a 1 dentro da caixa. A vitória acontece em `duracaoBatidas`, no acorde final da música.
- 2026-11-17 — **Avisos**: até Insane, o motor força aviso mínimo de max(1 batida, 0,3 s), mesmo se a fase pedir menos.
- 2026-11-17 — **Determinismo**: a posição de cada projétil é função do tempo da música (não de frames). Isso permite pular pra qualquer % na hora (debug, e no futuro treino/editor).
- 2026-11-17 — **Moedas secretas** só ficam salvas se você vencer a fase naquela tentativa. Estrelas e moedas já aparecem na Fase 1 (a loja/progressão é da Fase 3).
- 2026-11-17 — **Pausa** para a música; ao continuar há contagem 3-2-1 e a música volta exatamente da posição pausada.
- 2026-11-17 — Além das 3 músicas das fases, há uma **música de menu** curta em loop.
- 2026-11-17 — **Verificação de fases** (`node tools/verificar-fases.js`): prova por alcançabilidade que a fase é vencível e roda bots com tempo de reação de 150/250/350 ms como termômetro de dificuldade. Modo debug usa `?debug=1`; usar debug (pular, invencível, bot) não conta recorde nem vitória.
- 2026-11-17 — **Overhaul aprovado** (prompt salvo acima). Ordem: fundação da Etapa 1 → o que falta das Fases 2 e 3 → resto da Etapa 1 → Etapas 2 a 6. Plano por sessão no `CLAUDE.md`.
- 2026-11-17 — **Save v2** na chave `dodge.save` (o `dodge.save.v1` da Fase 1 não é apagado: vira backup). Backup em `dodge.save.backup`; save corrompido é guardado em `dodge.save.corrompido.*`. Toda mudança de formato tem migração versionada.
- 2026-11-17 — **Mouse 1:1**: arrastar com o mouse move a alma exatamente o que o cursor anda (o dedo continua com a sensibilidade das configurações, padrão 1,25). O arrasto é ancorado no toque/clique; a alma segue o ponto a até 1400 px/s.
- 2026-11-17 — **Limites de fase** (`CONFIG.limites`): até 4000 eventos, 64 posições por lista, 2000 projéteis por evento e 20000 por fase. Toda fase passa pelo validador (oficial, editor ou código compartilhado).
- 2026-11-17 — Debug (pular %, invencível, bot) não conta recorde, vitória **nem entra no mapa de mortes**.
- 2026-11-17 — **Falar sempre em português** com o usuário.
- 2026-11-17 — **Modificadores da caixa** (adiantados da Etapa 2, porque o editor já nasce com eles), todos como eventos: `caixa` (largura/altura de 0,2 a 1, transição em `dur` batidas), `girar` (ângulo em graus), `escuro` (nível 0–1 e raio da luz em volta da alma), `inverter` (eixos x/y) e `espelho` (eixo x, y ou xy: uma segunda alma espelhada que também morre). Viram "trilhas" de estado em função do tempo da música, como os ataques: pular pra qualquer ponto continua instantâneo. As posições dos ataques continuam relativas à caixa cheia; a parede da caixa encolhendo **empurra** a alma, não mata. Teclado e arrasto são convertidos da tela pra caixa (girada/invertida), então "direita" é sempre direita na tela. Toda mudança tem aviso: contorno tracejado do tamanho/ângulo novo, setas de inversão (e a borda fica roxa enquanto os controles estão invertidos), alma fantasma onde o espelho vai aparecer, bordas escurecendo. O analisador de fases entende tudo isso (empurrão da parede, espelho, e no teclado a alma anda um pouco menos ao longo dos eixos de uma caixa girada). Ficam pra Etapa 2: caixa que anda pela tela e muda de formato.
- 2026-11-17 — **Editor (Sessão 2).** As fases criadas ficam em `dodge.criadas`, separadas do save (versão 1 com migrações, backup, cópia do que estragar, mescla entre abas e lixeira das últimas 10 apagadas). Uma fase criada usa uma das 3 músicas; o BPM e a duração vêm da música (a vitória é no acorde final). Trocar de música não apaga nada: o que passar do fim fica guardado e só não acontece. **Testar daqui** recomeça do ponto escolhido a cada morte e não mexe no save do jogo (nem tentativas, nem recorde, nem mapa de mortes). Layout: prévia da caixa à esquerda, inspetor à direita (paleta quando nada está selecionado), linha do tempo embaixo com régua, faixa da música (seções, bumbo, caixa, melodia) e 4 pistas de eventos (a parte escura de cada bloco é o aviso). **Atalhos:** Espaço toca/para; ←/→ move o cursor (Shift = um compasso); ↑/↓ seleciona o evento anterior/seguinte; Delete apaga; Ctrl+Z desfaz; Ctrl+Shift+Z ou Ctrl+Y refaz; Ctrl+C/Ctrl+V copia/cola no cursor; Ctrl+D duplica; T testa daqui; M troca o ímã; +/− zoom; Home/End início/fim; Esc solta a seleção (de novo: sai).
- 2026-11-17 — **Verificar e compartilhar (Sessão 3).** Uma fase criada fica *verificada* quando o criador vence **do começo** no teste (sem debug) e o solver confirma que dá pra passar no teclado. A verificação guarda um hash do que importa pro jogo (música, BPM, duração, dificuldade, eventos): mexeu nisso, perde; mudou o nome, não. Só fase verificada gera código. **Código:** `DG<versão><Z|J>.<dados>.<soma>` — Z = JSON compactado (deflate-raw) em base64url, J = sem compactar (navegador sem CompressionStream); soma FNV-1a pra pegar código cortado. Ler um código nunca confia nele: tamanho máximo antes (200 mil caracteres) e depois de descompactar (1 MB), JSON, música conhecida, validador de fases, filtro no nome. Código de fase verificada importa como verificada (sem servidor, confia no criador; na Fase 4 o servidor confere). **Filtro de palavrão:** palavra inteira ou começo de palavra, com exceções, depois de normalizar acento, leetspeak, letra repetida e letra separada; nome digitado com palavrão é recusado; nome importado vira "FASE IMPORTADA". Fase criada jogada pela lista conta recorde/tentativas no save (pelo id `u-…`), mas não dá estrela.
- 2026-11-17 — **Progressão (Sessão 4).** Moeda comum: 1 por raspão, 1 por % novo de recorde, vitória (1ª vez por dificuldade: 40/60/90/130/180/300; repetida: 10). Só fase oficial, sem debug e fora do teste do editor (fase criada não paga, pra não virar fazenda). Save v3: `moedas`, `moedasTotal`, `pecas` (as que a pessoa tem), `conquistas` (id → quando), `missoes`; a migração da v2 dá as moedas do que já foi feito. Missões: 3 diárias + 2 semanais, sorteadas pela data (todo mundo tem as mesmas no mesmo dia; a semana começa na segunda); "chegue a X%" guarda o máximo, as outras somam. Conquistas pagam moedas e algumas liberam peças raras (as peças raras não se compram). Avatar em 7 categorias (corpo, padrão, olhos, boca, cabeça, extra, rastro), uma camada de cada, cor livre (16 cores; a cor vermelha não pode no corpo porque rosa/vermelho é perigo). A hitbox não muda com o visual. Telas: VISUAL (guarda-roupa, loja e coleção numa só, com prova antes de comprar) e MISSÕES (missões + conquistas), com botões no hub da lista de fases.
