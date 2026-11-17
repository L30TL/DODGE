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
