# CHANGELOG — Dodge

O que mudou em cada versão. Bugs com número (B01…) estão detalhados em `BUGS.md`.

## 0.8.0-dev — Overhaul, Sessão 7: modos da alma (17/11/2026)

### Modos da alma (trocados por portais no meio da fase)
- **Gravidade**: a alma cai e pula (↑, W, Espaço ou um toque na tela; segurando, pula de novo ao cair). O dedo arrastando anda pros lados. Pode cair pra cima. **Plataformas** surgem na caixa (dá pra subir atravessando por baixo e ficar em cima).
- **Trilhos**: presa em 3 a 5 linhas; ↑/↓ ou arrastar o dedo na vertical troca de linha, deslizando.
- **Escudo**: a alma fica no centro e um escudo bloqueia o que vem do lado escolhido (setas, ou tocar no lado de onde vem o ataque).
- **Gelo**: desliza com inércia e quica nas paredes.
- **Mini**: a alma encolhe (hitbox menor) e fica mais rápida.
- Antes de trocar de modo, o ícone do modo novo pisca no alto da caixa.
- No editor: eventos **PORTAL** e **PLATAFORMA**.

### Solver
- **Busca com a física de verdade** pra provar fases com gravidade, gelo, trilhos ou escudo: vários candidatos andando juntos no tempo, os mais seguros ficam, e a sequência de comandos achada é rejogada no jogo de verdade. O editor usa ela na verificação; no debug, S assiste.

### Correções
- Um toque ou uma tecla rápidos (começando e terminando entre dois frames) se perdiam; com os modos novos isso fazia o pulo ou a troca de trilho não acontecer (B27).

## 0.7.0-dev — Overhaul, Sessão 6: fim da Etapa 1 (17/11/2026)

### Solver novo
- Passo de 1/60 s numa grade centrada; a alma precisa estar a salvo durante o passo **inteiro** (antes dava pra "escapar no último instante" entre dois passos, o que no jogo de verdade mata); cada perigo é conferido também no último instante em que está ativo.
- **Prova construtiva**: o solver refaz um caminho que sobrevive e joga a fase seguindo ele na simulação de verdade. As 3 fases oficiais estão **PROVADAS** (teste automático e `verificar-fases`).
- Debug: **S** assiste o solver jogando a fase.

### Estresse e fuzzing
- 500 restarts seguidos: +0,5 MB de memória, música×jogo ~3 ms, nenhuma nota atrasada.
- Modo infinito por 30 minutos de jogo (24 voltas, entradas malucas): nenhum erro, nenhum NaN (`tools/estresse-infinito.js`).
- Fuzzing do editor (4.500 operações aleatórias) e um "macaco" apertando tudo em todas as telas (2.000+ ações): nenhum erro.
- Sondas novas: sem internet (zero pedidos de rede depois de carregar) e armazenamento cheio (o jogo segue e avisa).

### Painel F3
- **F3** abre o painel de debug em qualquer tela (sem `?debug=1`): fps, pior frame, %, projéteis/pool, partículas, **áudio × jogo**, latência; botões e teclas de pular %, hitbox, câmera lenta, invencível, bot e solver. Fechar desliga as trapaças.

### Correções
- Paredes matavam 1 px antes de encostar no desenho (B25).
- Editor: setinha do centro das paredes virava NaN depois de trocar de modo (B26).

## 0.6.0-dev — Overhaul, Sessão 5: treino, infinito, inglês, perfil (17/11/2026)

### Modos
- **TREINO** (botão ao lado do JOGAR): C ou a bandeira marca um checkpoint (o tempo e onde a alma está); cada morte recomeça dele; V tira o último. Nada conta (recorde, tentativas, moedas, missões, mapa de mortes).
- **INFINITO**: a música (Correnteza) toca em loop e cada volta gera um trecho novo, um pouco mais difícil (nível sobe por 6 voltas). Nada cruza a virada, a alma continua de onde está. O recorde é o tempo aguentado. Os trechos são gerados por semente e o solver prova que são possíveis.
- **Demônios** só abrem com estrelas (20★); o cartão mostra o cadeado e quantas faltam.

### Perfil (só visual)
- Em VISUAL › PERFIL: **nick** (com filtro de palavrão), **efeito do nick** (cor, degradê, onda, brilho, arco-íris, faíscas), **emblema** (cada conquista vira um) e **moldura** (bronze, prata, ouro, arco-íris, fogo, liberadas por marcos).

### Inglês
- O jogo inteiro em inglês. Escolhe sozinho pelo idioma do navegador (português → PT, o resto → EN) e troca nas configurações (botão no canto).

### Técnico
- Save v4 (perfil, recorde do infinito, idioma) com migração da v3.
- `infinito.js` (gerador puro), `textos-en.js`; teste confere o inglês chave por chave e os {marcadores}.

### Correções
- Música em loop: antes da 1ª nota a posição "dava a volta" pro fim (B23).
- Rótulo "EFEITOS" das configurações tinha virado um grupo de textos (B24).

## 0.5.0-dev — Overhaul, Sessão 4: progressão (17/11/2026)

### Moedas e loja (só visual!)
- **Moedas comuns**: 1 por raspão, 1 por % novo de recorde, e pela vitória (1ª vez: 40 no Fácil até 300 no Demônio; de novo: 10). Só nas fases oficiais e sem debug (fase criada não vira fazenda de moedas).
- Quem já jogava ganha na hora as moedas do que já tinha feito (recordes, vitórias, raspões).
- **VISUAL** (guarda-roupa + loja + coleção): a alma montada em camadas — 4 corpos, 4 padrões, 4 olhos, 5 bocas, 7 coisas na cabeça, 5 extras e 4 rastros — e cor livre em cada camada (16 cores; rosa não pode no corpo porque rosa é perigo). Prova antes de comprar; o que falta aparece como silhueta com cadeado.
- A alma nova aparece no jogo, com o rastro escolhido (normal, bolhas, faíscas, arco-íris). A hitbox é a mesma pra todo mundo.

### Missões e conquistas
- **MISSÕES**: 3 do dia e 2 da semana (iguais pra todo mundo no mesmo dia, trocam sozinhas na virada), com recompensa em moedas.
- **16 conquistas** com moedas e peças raras (coroa, antena, xadrez, estrela, faíscas, arco-íris). Aviso no topo da tela quando libera; quem já tinha feito ganha na hora.

### Técnico
- Save v3 com migração da v2 (testada: nada se perde).
- `progresso.js` (economia, missões, conquistas, loja: puro, com testes) e `profile.js` (telas VISUAL e MISSÕES).

## 0.4.0-dev — Overhaul, Sessão 3: verificar, compartilhar, filtro (17/11/2026)

### Fases criadas
- **Verificar vencendo:** pra compartilhar, o criador vence a própria fase **do começo** no teste (o selo ✓/? ao lado do nome testa do começo). Depois da vitória, o **solver** confere sozinho se dá pra passar no teclado; se não der, mostra a batida do problema.
- Mexeu em algo que muda o jogo (eventos, música, dificuldade), a verificação cai e precisa vencer de novo. Mudar o nome não tira.
- **Código curto pra compartilhar** (`DG1Z.…`): a fase inteira compactada, com soma de verificação. Botão COPIAR. Uma fase pequena dá ~150 caracteres.
- **Importar código** em Minhas Fases: código cortado, de versão mais nova, estragado ou malicioso (bomba de compactação, campos absurdos) dá um aviso claro e não importa nada.
- **Filtro de palavrão** nos nomes de fase (pega P0RR4, P.U.T.A, MEEERDA...; não pega COMPUTADOR, TEMPORADA, PORTA...). Nome de código importado com palavrão vira "FASE IMPORTADA".
- **Jogar** as fases criadas direto de Minhas Fases (recorde e tentativas contam; estrela é só das oficiais). Sair ou vencer volta pra Minhas Fases.

### Técnico
- `solver.js`: o analisador saiu do `debug.js` e roda aos poucos (o editor confere sem travar a tela). Paredes andando 9× mais rápido (Prensa: 29 s → 3 s, mesmo resultado).
- `codigo.js` (código de compartilhar) e `filtro.js` (palavrão), com testes.

### Correções
- Evento com tipo "__proto__", "constructor" ou "toString" passava pelo validador (B22).

## 0.3.0-dev — Overhaul, Sessão 2: editor (17/11/2026)

### Mecânicas novas (eventos de fase)
- **Caixa que encolhe/estica** (`caixa`), **gira** (`girar`), **escurece** com luz só em volta da alma (`escuro`), **controles invertidos** (`inverter`) e **alma espelhada** (`espelho`). Cada um com aviso antes de acontecer.
- Com a caixa girada ou os controles invertidos, teclado e arrasto continuam fazendo sentido na tela.
- O analisador de fases e os bots entendem os modificadores (toda fase continua provadamente possível).
- Laboratório (`?debug=1`) ganhou um trecho com todos os modificadores; teste de navegador em `tools/navegador/modificadores.js`.

### Editor de fases
- Botão **CRIAR** na lista de fases → **Minhas fases** (nova, editar, duplicar, apagar com "trazer de volta").
- **Linha do tempo em batidas** com a faixa da música: seções (intro, verso, refrão…), bumbo, caixa e melodia desenhados, pra encaixar os ataques nas notas.
- **Ímã**: prende na grade (1/4, 1/2, batida), nas notas da música (bumbo, caixa, melodia) ou solto.
- **Paleta** com os 8 ataques e os 5 modificadores; **inspetor** com todos os campos (setinhas, opções, listas de posições); tocar na **prévia** posiciona o ataque.
- **Prévia da caixa** no ponto exato do cursor, com o mesmo motor e o mesmo desenho do jogo (avisos, giro, escuro, espelho).
- **Tocar** com a música (os sons dos ataques junto), **testar daqui** (cada morte recomeça do mesmo ponto; não mexe no save do jogo) e voltar pro editor.
- **Desfazer/refazer** (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y), copiar/colar/duplicar (Ctrl+C, Ctrl+V, Ctrl+D), atalhos de teclado.
- **Salva sozinho** a cada mudança, numa chave própria (`dodge.criadas`) com versão, backup, cópia de segurança se estragar, mescla entre abas e lixeira.
- Propriedades: nome (caixa de texto que abre o teclado no celular), música e dificuldade sugerida.

### Correções
- Paredes com "centro" em lista ficavam invisíveis e sem colisão (B21).

## 0.2.0-dev — Overhaul, Sessão 1: fundação (17/11/2026)

### Jogando
- **Mouse:** arrastar a bolinha agora é 1:1 com o cursor e não sai mais de sincronia, mesmo em puxões rápidos ou saindo da janela (B20).
- Morrer no instante final da fase agora conta como vitória (B01).
- O % da morte é o do instante exato da colisão (B09).
- Se o som parar (ligação no iPhone, navegador bloqueando), o jogo pausa e pede um toque em vez de congelar (B02).
- Pausar na tela de morte (Esc, P ou o ícone) abre a pausa; "continuar" começa a próxima tentativa (B11).
- Fase nova não começa mais pausada depois de trocar de aba (B05).
- Trocar de dedo no meio do arrasto continua movendo a alma (B12).
- 2000 projéteis na tela a 60 fps num celular lento (antes: 32 fps) (B07).
- Nenhum ataque some em silêncio, qualquer que seja a quantidade (B06).
- Teleguiadas fazem o mesmo caminho em qualquer fps (B13).

### Save
- Save novo (v2) com migração automática do anterior: nada se perde e o save antigo fica guardado como cópia.
- Backup automático; um save corrompido é guardado à parte e o jogo recupera do backup (B03).
- Recorde e vitória gravam na hora; fechar a página grava o que estiver pendente (B04).
- Duas abas abertas: o progresso das duas é mesclado (B16).

### Erros
- Captura global de erros: qualquer erro mostra um aviso discreto e entra num registro copiável em Configurações › Registro de erros.
- Um erro no meio do desenho não deixa mais a tela torta (B19).

### Técnico
- `sim.js`: a simulação pura de uma tentativa (sem canvas), usada pelo jogo, pelos bots e pelos testes.
- `render.js`: o desenho dos ataques saiu do `patterns.js`, que ficou só com lógica.
- `erros.js`: captura global de erros.
- Validador de fases com limites (`CONFIG.limites`): fase ou código malicioso não trava o jogo (B08).
- Testes automáticos com `node --test` (24 testes) e testes de navegador em `tools/navegador/`.

## 0.1.0 — Fase 1 (16/11/2026)
- Núcleo jogável: caixa, alma, 7 padrões de ataque, raspão, moedas secretas, morte com %, restart em 0,4 s, vitória.
- 3 fases (Despertar, Correnteza, Prensa) com 3 músicas chiptune + música de menu.
- Telas: título, lista de fases, pausa, vitória, configurações, calibração do áudio.
- Modo debug (`?debug=1`), mapa de mortes, verificador de fases.
- Publicado no GitHub Pages.
