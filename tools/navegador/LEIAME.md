# Testes no navegador

Scripts que abrem o jogo de verdade num Chrome sem janela (Playwright) e conferem coisas que só dá pra ver rodando:

| Script | O que confere |
|---|---|
| `regressao.js` | Os bugs da auditoria (B01–B07) não voltaram: morte no fim, áudio interrompido, save corrompido, recorde ao fechar, pausa presa, pool, 2000 projéteis |
| `mouse.js` | Arrastar com o mouse é 1:1 com o cursor, sem perder movimento, e volta na hora depois de encostar na parede |
| `estresse-2000.js` | 2000 projéteis na tela com a CPU 4× mais lenta: fps e custo por frame |
| `erros.js` | Um erro no meio do jogo vira aviso discreto e registro copiável, e a tela não quebra |

Como rodar (precisa de Node e do Playwright, que já vem no ambiente do Claude; no seu computador seria `npm i -D playwright`):

```bash
python3 -m http.server 8000
node tools/navegador/regressao.js
```

Pra testar outro endereço: `DODGE_URL=https://l30tl.github.io/DODGE node tools/navegador/mouse.js`.
Os testes rápidos, sem navegador, ficam em `tests/` e rodam com `node --test`.
