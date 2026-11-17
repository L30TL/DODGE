# Dodge

Jogo arcade 2D de navegador: uma alma presa numa caixa desvia de ataques que caem no ritmo de músicas chiptune procedurais. Um toque = morte, barra de %, restart instantâneo. Design completo em `DESIGN.md` (fonte da verdade; decisões registradas no fim dele).

## Fase atual do roadmap
**Fase 1 — projeto e núcleo**: implementada (motor, 3 fases, 3 músicas + menu, telas, configurações, debug). Falta: publicar no GitHub Pages (merge no `main` + ativar Pages). Próxima: Fase 2 (editor).

## Estrutura
HTML5 Canvas + JavaScript puro, sem frameworks e sem build. Scripts clássicos carregados em ordem pelo `index.html`; cada arquivo expõe um objeto global.

| Arquivo | Global | Papel |
|---|---|---|
| `config.js` | `CONFIG` | Todos os números de ajuste, comentados |
| `save.js` | `Save` | Save no localStorage com try/catch (`dodge.save.v1`) |
| `ui.js` | `TEXTOS`, `t()`, `PAL`, `Fonte`, `Sprites`, `UI`, `Controles` | Textos, paleta, fonte pixel própria, ícones, botões/sliders e telas de menu (título, fases, config, calibração) |
| `audio.js` | `Sound` | Sequenciador chiptune (pulso 25%/12,5%, triangular, ruído, bumbo), músicas, efeitos, relógio do jogo |
| `avatar.js` | `Avatar` | A alma como dado (camadas `{ peca, cor, posicao }`) |
| `input.js` | `Input` | Teclado (setas/WASD) e arrasto relativo em qualquer lugar da tela |
| `patterns.js` | `Patterns` | Os 7 padrões de ataque → specs analíticas; pool, colisão (SDF), desenho |
| `levels.js` | `Levels` | Fases como dados `{ id, nome, autor, dificuldade, musica, bpm, duracaoBatidas, eventos }` |
| `game.js` | `Game` | Loop, navegação entre telas, tela de jogo (alma, raspão, morte, restart, vitória, pausa, juice) |
| `debug.js` | `Debug` | Painel `?debug=1`, bot, analisador de alcançabilidade, mapa de mortes |
| `editor.js`, `profile.js` | — | Stubs (Fases 2–4) |
| `tools/verificar-fases.js` | — | CLI Node: prova que as fases são vencíveis + bots |

## Como rodar
```bash
python3 -m http.server 8000
```
Abrir http://localhost:8000. Debug: http://localhost:8000/?debug=1
(teclas no debug: H hitbox, I invencível, L câmera lenta, B bot, K morrer, 0–9 pula pra 0–90%, [ ] ±5%)

Verificar fases (precisa de Node):
```bash
node tools/verificar-fases.js            # todas
DETALHE=1 node tools/verificar-fases.js prensa
```

## Regras de trabalho
- Edições pontuais; não reescrever arquivos inteiros sem necessidade.
- Testar num servidor local sem erros no console antes de dizer que terminou.
- Rodar `tools/verificar-fases.js` depois de mexer em fases ou padrões.
- Commit a cada parte que funciona; push no fim de cada sessão.
- Atualizar `DESIGN.md` (seção Decisões) e este arquivo quando algo mudar.
- O tempo do jogo vem de `Sound.posicao()` (relógio do áudio), nunca de frames.
- Nenhum número mágico de jogabilidade fora do `config.js`. Todo texto visível em `TEXTOS`.
