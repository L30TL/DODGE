'use strict';
// =============================================================================
// DODGE — solver.js
// PROVA que uma fase é vencível (análise de alcançabilidade): simula TODAS as
// posições que a alma consegue alcançar (grade de 2 px, velocidade do teclado,
// movimento só em eixo = conservador). Se o conjunto alcançável nunca fica
// vazio, existe um caminho até o fim.
// Usado pelo editor (antes de compartilhar), pelo debug, pelos testes e por
// tools/verificar-fases.js. Roda aos poucos (avancar(ms)) pra não travar a tela.
// Sem DOM: roda no Node.
// =============================================================================

const Solver = (() => {
  const agora = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  // Uma análise em andamento. avancar(ms) trabalha até ms milissegundos e devolve true quando acabou;
  // aí o resultado fica em .resultado. progresso vai de 0 a 1.
  function Analise(fase, op) {
    op = op || {};
    const comp = Patterns.compilar(fase, CONFIG.caixa);
    const at = new Patterns.Ataques(comp);
    const g = op.grade || 2;
    const v = CONFIG.alma.velocidade;
    const dt = g / v;
    const limX = comp.hw - CONFIG.alma.margemParede, limY = comp.hh - CONFIG.alma.margemParede;
    const nx = Math.floor(2 * limX / g) + 1, ny = Math.floor(2 * limY / g) + 1;
    const N = nx * ny;
    let R = new Uint8Array(N), R2 = new Uint8Array(N);   // alcançável agora / no próximo passo
    const perigo = new Uint8Array(N);
    const cx = (i) => -limX + i * g, cy = (j) => -limY + j * g;
    R[Math.floor(ny / 2) * nx + Math.floor(nx / 2)] = 1;
    const rH = CONFIG.alma.raioHitbox + 0.5;   // margem extra = conservador
    const T = Patterns.TIPOS;
    const passos = Math.ceil(comp.duracao / dt);
    const porBatida = [];            // menor área alcançável (fração) em cada batida
    let minFrac = 1, tMin = 0, morreuEm = null;
    const alma = { x: 0, y: 0 };
    const est = {};
    const margem = CONFIG.alma.margemParede;
    const meio = (lim, l, n) => {                // células [a, b] que cabem na caixa encolhida
      let a = Math.ceil((lim - l) / g - 1e-9), b = Math.floor((lim + l) / g + 1e-9);
      if (a > b) a = b = Math.floor(n / 2);
      return [a, b];
    };
    let credito = 0;
    let k = 0;
    const self = {
      resultado: null,
      get progresso() { return Math.min(1, k / (passos + 1)); },
      avancar(limiteMs) {
        if (self.resultado) return true;
        const fim = limiteMs === undefined ? Infinity : agora() + limiteMs;
        for (; k <= passos; k++) {
          const tt = Math.min(comp.duracao, k * dt);
          at.atualizar(tt, dt, alma);
          perigo.fill(0);
          Patterns.estadoCaixa(comp, tt, est);
          // caixa encolhida: a parede empurra a alma pra dentro (igual ao jogo) e o lado de fora é proibido
          const lx = Math.max(2, comp.hw * est.largura - margem), ly = Math.max(2, comp.hh * est.altura - margem);
          if (lx < limX || ly < limY) {
            const [i0, i1] = meio(limX, lx, nx), [j0, j1] = meio(limY, ly, ny);
            for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
              if (i >= i0 && i <= i1 && j >= j0 && j <= j1) continue;
              const id = j * nx + i;
              perigo[id] = 1;
              if (R[id]) { R[id] = 0; R[Math.max(j0, Math.min(j1, j)) * nx + Math.max(i0, Math.min(i1, i))] = 1; }
            }
          }
          // caixa girada: no teclado a alma anda um pouco menos ao longo dos eixos da caixa
          // (as 8 direções da tela não batem com eles). Anda 1 célula só quando juntou crédito.
          const graus = Math.abs(est.angulo) % 45, d = Math.min(graus, 45 - graus) * Math.PI / 180;
          credito += Math.cos(Math.PI / 8) / Math.cos(Math.PI / 8 - d);
          const anda = credito >= 1 - 1e-9;
          if (anda) credito -= 1;
          for (let q = 0; q < at.n; q++) {
            const o = at.vivos[q], s = o.s;
            if (s.k === T.BALA) {
              if (tt < s.t0) continue;
              const r = s.hr + rH;
              const i0 = Math.max(0, Math.floor((o.x - r + limX) / g)), i1 = Math.min(nx - 1, Math.ceil((o.x + r + limX) / g));
              const j0 = Math.max(0, Math.floor((o.y - r + limY) / g)), j1 = Math.min(ny - 1, Math.ceil((o.y + r + limY) / g));
              for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
                const dx = cx(i) - o.x, dy = cy(j) - o.y;
                if (dx * dx + dy * dy < r * r) perigo[j * nx + i] = 1;
              }
            } else if (s.k === T.PAREDE) {
              if (tt < s.t0 || tt >= s.tF) continue;
              // meio-plano: tudo além da borda (mais a folga) é perigo
              const e = Patterns.bordaParede(s, tt);
              const lim = s.lado < 0 ? e - CONFIG.ataques.folgaHitbox + rH : e + CONFIG.ataques.folgaHitbox - rH;
              if (s.eixo === 'h') {
                for (let i = 0; i < nx; i++) {
                  const x = cx(i);
                  if (s.lado < 0 ? x < lim : x > lim) for (let j = 0; j < ny; j++) perigo[j * nx + i] = 1;
                }
              } else {
                for (let j = 0; j < ny; j++) {
                  const y = cy(j);
                  if (s.lado < 0 ? y < lim : y > lim) for (let i = 0; i < nx; i++) perigo[j * nx + i] = 1;
                }
              }
            } else if (s.k === T.LASER && s.eixoAlinhado) {
              if (tt < s.t0 || tt >= s.t1) continue;
              const p = s.p0 + (s.p1 - s.p0) * (tt - s.t0) / (s.t1 - s.t0);
              const r = s.hr + rH;
              if (s.ang === -90) {
                for (let i = 0; i < nx; i++) if (Math.abs(cx(i) - p) < r) for (let j = 0; j < ny; j++) perigo[j * nx + i] = 1;
              } else {
                for (let j = 0; j < ny; j++) if (Math.abs(cy(j) - p) < r) for (let i = 0; i < nx; i++) perigo[j * nx + i] = 1;
              }
            } else if (s.k === T.MURO) {
              // muro com vão andando: só as colunas (ou linhas) perto dele podem ser perigosas
              if (tt < s.t0) continue;
              const m = s.m0 + s.dir * s.vel * (tt - s.t0);
              const alc = s.larg / 2 + rH + s.hrFolga + g;
              if (s.horiz) {
                const i0 = Math.max(0, Math.floor((m - alc + limX) / g)), i1 = Math.min(nx - 1, Math.ceil((m + alc + limX) / g));
                for (let i = i0; i <= i1; i++) for (let j = 0; j < ny; j++) {
                  const id = j * nx + i;
                  if (!perigo[id] && at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[id] = 1;
                }
              } else {
                const j0 = Math.max(0, Math.floor((m - alc + limY) / g)), j1 = Math.min(ny - 1, Math.ceil((m + alc + limY) / g));
                for (let j = j0; j <= j1; j++) for (let i = 0; i < nx; i++) {
                  const id = j * nx + i;
                  if (!perigo[id] && at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[id] = 1;
                }
              }
            } else if (s.k === T.LASER) {
              if (at.distancia(o, tt, 0, 0) === Infinity) continue;
              for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
                if (perigo[j * nx + i]) continue;
                if (at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[j * nx + i] = 1;
              }
            }
          }
          // alma espelhada: a posição só é segura se o espelho dela também for
          if (est.espelho) {
            const copia = perigo.slice();
            for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
              const mi = est.espelho === 'y' ? i : nx - 1 - i, mj = est.espelho === 'x' ? j : ny - 1 - j;
              if (copia[mj * nx + mi]) perigo[j * nx + i] = 1;
            }
          }
          // R2 = dilata(R) ∩ seguro
          let area = 0;
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const id = j * nx + i;
            let r = R[id] || (anda && ((i > 0 && R[id - 1]) || (i < nx - 1 && R[id + 1]) || (j > 0 && R[id - nx]) || (j < ny - 1 && R[id + nx])));
            r = r && !perigo[id] ? 1 : 0;
            R2[id] = r; area += r;
          }
          const tmp = R; R = R2; R2 = tmp;
          const frac = area / N;
          const b = Math.floor(tt / comp.B);
          if (tt > 1.5 && (porBatida[b] === undefined || frac < porBatida[b])) porBatida[b] = frac;
          if (tt > 2 && frac < minFrac) { minFrac = frac; tMin = tt; }
          if (area === 0) { morreuEm = tt; k = passos + 1; break; }
          if ((k & 7) === 7 && agora() > fim) { k++; return false; }
        }
        // avisos curtos demais
        const avisosCurtos = [];
        for (const s of comp.specs) {
          if (s.k === T.BALA && s.av === null) continue;          // balas de espiral/anel: o emissor avisa
          if (s.k === T.MOEDA || s.k === T.ORBE || s.k === T.EMISSOR) continue;
          const a = s.t0 - s.tA;
          if (fase.dificuldade !== 'demonio' && a < Math.max(CONFIG.ataques.avisoMinimoS, comp.B) - 1e-6) avisosCurtos.push({ batida: s.batida, aviso: a });
        }
        self.resultado = { fase: fase.id, ok: morreuEm === null, morreuEm, minFrac, tMin, batidaMin: tMin / comp.B,
          pctMin: tMin / comp.duracao * 100, porBatida, avisosCurtos, specs: comp.specs.length, duracao: comp.duracao };
        return true;
      },
    };
    return self;
  }

  // Análise inteira de uma vez (testes, ferramentas).
  function analisar(fase, op) {
    const a = Analise(fase, op);
    a.avancar();
    return a.resultado;
  }

  return { Analise, analisar };
})();
