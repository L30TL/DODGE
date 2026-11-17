# CHANGELOG — Dodge

O que mudou em cada versão. Bugs com número (B01…) estão detalhados em `BUGS.md`.

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
