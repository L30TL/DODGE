# DODGE

Você é uma alma presa numa caixa. Os ataques caem **no ritmo da música**. Um toque e já era — mas o restart é instantâneo.

▶ **Jogar:** https://l30tl.github.io/DODGE/ (funciona no PC e no celular)

## Como jogar
- **PC:** setas ou WASD. `Esc`/`P` pausa, `R` reinicia.
- **Celular:** arraste o dedo em qualquer lugar da tela — a alma copia o movimento. Jogue com o celular deitado.
- Todo ataque avisa antes de acontecer. Passar raspando conta como **RASPOU!**
- Cada fase tem 3 moedas secretas em lugares perigosos (só valem se você vencer).

## Fases (Fase 1 do projeto)
| Fase | Dificuldade | Novidade |
|---|---|---|
| Despertar | Fácil ★ | chuva |
| Correnteza | Normal ★★ | laser |
| Prensa | Difícil ★★★ | paredes |

## Rodar localmente
```bash
python3 -m http.server 8000
```
Abra http://localhost:8000 — ou http://localhost:8000/?debug=1 para o modo debug.

Feito em HTML5 Canvas + JavaScript puro, com músicas chiptune geradas pela Web Audio API. Detalhes do projeto em [DESIGN.md](DESIGN.md) e [CLAUDE.md](CLAUDE.md).
