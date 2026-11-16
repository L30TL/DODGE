# Dodge

Jogo arcade 2D de navegador: uma alma presa numa caixa desvia de ataques que caem no ritmo de músicas chiptune procedurais. Um toque = morte, barra de %, restart instantâneo. Design completo em `DESIGN.md` (fonte da verdade; decisões registradas no fim dele).

## Fase atual do roadmap
**Fase 1 — projeto e núcleo** (planejamento; aguardando ok do plano).

## Estrutura
HTML5 Canvas + JavaScript puro, sem frameworks e sem build. Scripts clássicos carregados em ordem pelo `index.html`, todos pendurados num namespace global.

| Arquivo | Papel |
|---|---|
| `index.html` | Canvas e carregamento dos scripts |
| `config.js` | Todos os números de ajuste, comentados |
| `game.js` | Loop, estados, motor de fases, caixa, alma, colisão, juice |
| `input.js` | Teclado (setas/WASD) e arrasto relativo no toque |
| `audio.js` | Sequenciador chiptune (quadrada, triangular, ruído), 3 músicas, efeitos sonoros |
| `patterns.js` | Padrões de ataque reutilizáveis + pool de projéteis |
| `levels.js` | Fases como dados `{ nome, autor, dificuldade, musica, bpm, duracaoBatidas, eventos }` |
| `ui.js` | Telas, HUD, textos (objeto único `TEXTOS`) |
| `save.js` | Save no localStorage com try/catch |
| `debug.js` | Modo debug (só em dev) |
| `editor.js`, `avatar.js`, `profile.js` | Fases 2–4 (stubs na Fase 1) |

## Como rodar
```bash
python3 -m http.server 8000
```
Abrir http://localhost:8000. Debug: http://localhost:8000/?debug=1

## Regras de trabalho
- Edições pontuais; não reescrever arquivos inteiros sem necessidade.
- Testar num servidor local sem erros no console antes de dizer que terminou.
- Commit a cada parte que funciona; push no fim de cada sessão.
- Atualizar `DESIGN.md` (seção Decisões) e este arquivo quando algo mudar.
- O tempo do jogo vem de `AudioContext.currentTime`, nunca de frames.
- Nenhum número mágico fora do `config.js`.
