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
    // passo de tempo (1/60 s) e grade: em cada passo a alma anda no máximo uma célula (velocidade do teclado)
    const v = CONFIG.alma.velocidade;
    const dt = op.grade ? op.grade / v : (op.passo || CONFIG.solver.passo);
    const g = v * dt;
    const limX = comp.hw - CONFIG.alma.margemParede, limY = comp.hh - CONFIG.alma.margemParede;
    // grade centrada (a célula do meio é exatamente o centro: o espelho fica exato)
    const ex = Math.floor(limX / g + 1e-9), ey = Math.floor(limY / g + 1e-9);
    const nx = 2 * ex + 1, ny = 2 * ey + 1;
    const N = nx * ny;
    let R = new Uint8Array(N), R2 = new Uint8Array(N);   // alcançável agora / no próximo passo
    const perigo = new Uint8Array(N), perigoAnt = new Uint8Array(N);   // perigo agora e no passo anterior
    const cx = (i) => (i - ex) * g, cy = (j) => (j - ey) * g;
    R[ey * nx + ex] = 1;
    const rH = CONFIG.alma.raioHitbox + CONFIG.solver.margem;   // margem extra = conservador
    const PALAVRAS = (N + 31) >> 5;
    const hist = op.caminho ? [] : null;                         // o alcançável de cada passo (pra refazer o caminho)
    const T = Patterns.TIPOS;
    const passos = Math.ceil(comp.duracao / dt);
    const porBatida = [];            // menor área alcançável (fração) em cada batida
    let minFrac = 1, tMin = 0, morreuEm = null;
    const alma = { x: 0, y: 0 };
    const est = {};
    const margem = CONFIG.alma.margemParede;
    const meio = (l, e) => {                    // células [a, b] que cabem na caixa encolhida
      const f = Math.max(0, Math.min(e, Math.floor(l / g + 1e-9)));
      return [e - f, e + f];
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
          // teleguiadas miram na alma: por padrão no centro; numa 2ª passada, no caminho achado antes
          if (op.almaEm) { const q = op.almaEm(tt); alma.x = q.x; alma.y = q.y; }
          at.atualizar(tt, dt, alma);
          perigo.fill(0);
          Patterns.estadoCaixa(comp, tt, est);
          // caixa encolhida: a parede empurra a alma pra dentro (igual ao jogo) e o lado de fora é proibido
          const lx = Math.max(2, comp.hw * est.largura - margem), ly = Math.max(2, comp.hh * est.altura - margem);
          if (lx < limX || ly < limY) {
            const [i0, i1] = meio(lx, ex), [j0, j1] = meio(ly, ey);
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
              const i0 = Math.max(0, Math.floor((o.x - r) / g + ex)), i1 = Math.min(nx - 1, Math.ceil((o.x + r) / g + ex));
              const j0 = Math.max(0, Math.floor((o.y - r) / g + ey)), j1 = Math.min(ny - 1, Math.ceil((o.y + r) / g + ey));
              for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
                const dx = cx(i) - o.x, dy = cy(j) - o.y;
                if (dx * dx + dy * dy < r * r) perigo[j * nx + i] = 1;
              }
            } else if (s.k === T.PAREDE) {
              // ativo em algum momento deste passo? (o último instante antes de sumir também conta)
              if (tt < s.t0 || tt - dt >= s.tF) continue;
              // meio-plano: tudo além da borda (mais a folga) é perigo
              const e = Patterns.bordaParede(s, Math.min(tt, s.tF - 1e-6));
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
              // ligado em algum momento deste passo: confere onde ele está no último instante ligado
              if (tt < s.t0 || tt - dt >= s.t1) continue;
              const te = Math.min(tt, s.t1 - 1e-6);
              const p = s.p0 + (s.p1 - s.p0) * (te - s.t0) / (s.t1 - s.t0);
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
                const i0 = Math.max(0, Math.floor((m - alc) / g + ex)), i1 = Math.min(nx - 1, Math.ceil((m + alc) / g + ex));
                for (let i = i0; i <= i1; i++) for (let j = 0; j < ny; j++) {
                  const id = j * nx + i;
                  if (!perigo[id] && at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[id] = 1;
                }
              } else {
                const j0 = Math.max(0, Math.floor((m - alc) / g + ey)), j1 = Math.min(ny - 1, Math.ceil((m + alc) / g + ey));
                for (let j = j0; j <= j1; j++) for (let i = 0; i < nx; i++) {
                  const id = j * nx + i;
                  if (!perigo[id] && at.distancia(o, tt, cx(i), cy(j)) < rH) perigo[id] = 1;
                }
              }
            } else if (s.k === T.LASER) {
              if (tt < s.t0 || tt - dt >= s.t1) continue;
              const te = Math.min(tt, s.t1 - 1e-6);
              if (at.distancia(o, te, 0, 0) === Infinity) continue;
              for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
                if (perigo[j * nx + i]) continue;
                if (at.distancia(o, te, cx(i), cy(j)) < rH) perigo[j * nx + i] = 1;
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
          // A alma tem que estar a salvo durante o passo INTEIRO (não só nas pontas): uma célula vale se
          // está livre agora e no passo anterior; quem está numa célula que ficou perigosa não sai dela.
          for (let id = 0; id < N; id++) { const p = perigo[id]; perigo[id] = p | perigoAnt[id]; perigoAnt[id] = p; }
          for (let id = 0; id < N; id++) if (R[id] && perigo[id]) R[id] = 0;
          if (hist) {
            const bits = new Uint32Array(PALAVRAS);
            for (let id = 0; id < N; id++) if (R[id]) bits[id >> 5] |= 1 << (id & 31);
            hist.push(bits);                                     // de onde dá pra partir neste passo
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
          // passada de refinamento: nos instantes em que uma teleguiada mira, a alma tem que estar
          // exatamente onde estava no caminho anterior (aí a mira da análise bate com a do jogo)
          if (op.forcar) {
            const q = op.forcar(k);
            if (q !== undefined) {
              const id = (Math.round(q.y / g) + ey) * nx + (Math.round(q.x / g) + ex);
              const tinha = id >= 0 && id < N && R[id];
              R.fill(0);
              area = 0;
              if (tinha) { R[id] = 1; area = 1; }
            }
          }
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
          pctMin: tMin / comp.duracao * 100, porBatida, avisosCurtos, specs: comp.specs.length, duracao: comp.duracao,
          caminho: hist && morreuEm === null ? refazerCaminho(hist, bitsDe(R, PALAVRAS), nx, ny, ex, ey, g, dt) : null };
        return true;
      },
    };
    return self;
  }

  function bitsDe(R, palavras) {
    const bits = new Uint32Array(palavras);
    for (let id = 0; id < R.length; id++) if (R[id]) bits[id >> 5] |= 1 << (id & 31);
    return bits;
  }

  // Refaz um caminho que sobrevive, de trás pra frente. hist[k] = de onde dava pra partir no passo k
  // (seguro durante o passo inteiro); final = onde dá pra estar no último passo.
  // Devolve { dt, x: Float32Array, y: Float32Array }: a posição em cada passo (tempo k·dt).
  function refazerCaminho(hist, final, nx, ny, ex, ey, g, dt) {
    const tem = (bits, id) => (bits[id >> 5] >>> (id & 31)) & 1;
    const n = hist.length, cel = new Int32Array(n);
    // termina na célula alcançável mais perto do centro
    let melhor = -1, dm = Infinity;
    for (let id = 0; id < nx * ny; id++) if (tem(final, id)) {
      const d = Math.abs((id % nx) - ex) + Math.abs(Math.floor(id / nx) - ey);
      if (d < dm) { dm = d; melhor = id; }
    }
    cel[n - 1] = melhor;
    for (let k = n - 1; k > 0; k--) {
      const id = cel[k], i = id % nx, j = Math.floor(id / nx), ant = hist[k];
      let achou = -1;
      for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a >= 0 && a < nx && b >= 0 && b < ny && tem(ant, b * nx + a)) { achou = b * nx + a; break; }
      }
      if (achou < 0) {
        // a caixa encolheu e empurrou a alma: vem da alcançável mais perto
        let dm2 = Infinity;
        for (let q = 0; q < nx * ny; q++) if (tem(ant, q)) {
          const d = Math.abs((q % nx) - i) + Math.abs(Math.floor(q / nx) - j);
          if (d < dm2) { dm2 = d; achou = q; }
        }
      }
      cel[k - 1] = achou;
    }
    const x = new Float32Array(n), y = new Float32Array(n);
    for (let k = 0; k < n; k++) { x[k] = ((cel[k] % nx) - ex) * g; y[k] = (Math.floor(cel[k] / nx) - ey) * g; }
    return { dt, x, y };
  }

  // Onde o caminho está no tempo t (entre dois passos, em linha reta).
  function noCaminho(cam, t, out) {
    const f = Math.max(0, t / cam.dt), k = Math.min(cam.x.length - 1, Math.floor(f)), u = Math.min(1, f - k);
    const k2 = Math.min(cam.x.length - 1, k + 1);
    out.x = cam.x[k] + (cam.x[k2] - cam.x[k]) * u;
    out.y = cam.y[k] + (cam.y[k2] - cam.y[k]) * u;
    return out;
  }

  // Joga a fase de verdade (Sim.Corrida) seguindo o caminho. Devolve { estado, morte }.
  function repetir(fase, cam) {
    const r = new Sim.Corrida(Patterns.compilar(fase, CONFIG.caixa));
    const alvo = { x: 0, y: 0 }, ent = { temAlvo: true, alvoX: 0, alvoY: 0, local: true };
    for (let t = 0; t <= r.c.duracao + 0.05 && r.estado === 'jogando'; t += cam.dt) {
      noCaminho(cam, t, alvo);
      ent.alvoX = alvo.x; ent.alvoY = alvo.y;
      r.passo(t, ent);
    }
    return { estado: r.estado, morte: r.morte };
  }

  // PROVA construtiva: acha um caminho e joga a fase seguindo ele. Se morrer numa teleguiada
  // (que mira na alma de verdade), refaz com as teleguiadas mirando nesse caminho.
  // Devolve { ok, analise, caminho, passadas, morte }.
  function provar(fase, passadas) {
    if (precisaBusca(fase)) {
      const b = buscar(fase);
      return { ok: b.ok, entradas: b.entradas, passadas: 1, morte: b.morte || null, busca: true, analise: { ok: b.ok, morreuEm: b.morreuEm } };
    }
    let almaEm = null, forcar = null, a = null, rep = null;
    for (let p = 0; p < (passadas || CONFIG.solver.passadas); p++) {
      a = analisar(fase, { caminho: true, almaEm, forcar });
      if (!a.ok) return { ok: false, analise: a, passadas: p + 1, morte: null };
      rep = repetir(fase, a.caminho);
      if (rep.estado === 'vitoria') return { ok: true, analise: a, caminho: a.caminho, passadas: p + 1 };
      const cam = a.caminho, q = { x: 0, y: 0 };
      almaEm = (t) => noCaminho(cam, t, q);
      // passos em que alguma teleguiada mira: a alma fica presa ao caminho anterior nesses instantes
      const presos = new Map(), comp = Patterns.compilar(fase, CONFIG.caixa);
      for (const sp of comp.specs) {
        if (!sp.mira) continue;
        const kk = Math.ceil(sp.t0 / cam.dt - 1e-9);
        if (kk < cam.x.length) presos.set(kk, { x: cam.x[kk], y: cam.y[kk] });
      }
      forcar = (kk) => presos.get(kk);
    }
    return { ok: false, analise: a, caminho: a.caminho, passadas: passadas || CONFIG.solver.passadas, morte: rep.morte };
  }

  // ------------------------------------------------------------- BUSCA ---
  // Prova pra QUALQUER modo da alma (gravidade, gelo, trilhos, escudo...): uma busca em feixe
  // com a física de verdade. Os candidatos andam juntos no tempo (os ataques são os mesmos pra
  // todos); a cada decisão (CONFIG.solver.busca.quadros quadros) cada um tenta as entradas do
  // modo; ficam os mais longe do perigo, um por "balde" (lugar + velocidade). Quem chega no fim
  // tem a sequência de entradas, e ela é rejogada na Sim.Corrida pra confirmar (prova construtiva).
  const ENTRADAS = {
    livre: [], gravidade: [], trilhos: [], escudo: [0, 1, 2, 3].map(e => ({ escudo: e })),
  };
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) ENTRADAS.livre.push({ dx, dy });
  for (let dx = -1; dx <= 1; dx++) for (const pulo of [false, true]) ENTRADAS.gravidade.push({ dx, pulo });
  for (let dx = -1; dx <= 1; dx++) for (let tr = -1; tr <= 1; tr++) ENTRADAS.trilhos.push({ dx, trilho: tr });
  const entradasDo = (m) => ENTRADAS[m] || ENTRADAS.livre;            // mini e gelo: as 8 direções + parado

  const CAMPOS_ALMA = ['x', 'y', 'vx', 'vy', 'chao', 'tChao', 'bufferPulo', 'trilho', 'trilhoAlvo', 'escudo'];
  const copiarAlma = (de, para) => { for (const k of CAMPOS_ALMA) para[k] = de[k]; return para; };

  // O candidato morre aqui? (sem mexer em nada dos ataques; no escudo, o que o escudo dele cobre não conta)
  function colide(r, t, x, y, escudo) {
    const at = r.at, T = Patterns.TIPOS, rHit = r.raioHit(), S = CONFIG.modos.escudo;
    const dirX = [0, 1, 0, -1][escudo | 0], dirY = [-1, 0, 1, 0][escudo | 0], cosMin = Math.cos(S.abertura / 2 * Math.PI / 180);
    for (let i = 0; i < at.n; i++) {
      const o = at.vivos[i], s = o.s;
      if (o.morto || s.k === T.MOEDA || s.k === T.PLATAFORMA || s.k === T.ORBE || s.k === T.EMISSOR) continue;
      if (s.k === T.BALA) {
        if (t < s.t0) continue;
        const bx = at.xBala(o, t) - x, by = at.yBala(o, t) - y, d = Math.hypot(bx, by);
        if (d - s.hr >= rHit + 0.5) continue;
        if (r.modo === 'escudo') {
          // já passou do centro sem matar = foi bloqueado antes (no jogo ele some)
          const bx2 = at.xBala(o, t - 0.005) - x, by2 = at.yBala(o, t - 0.005) - y, d2 = Math.hypot(bx2, by2);
          if (d2 < d) continue;
          // de que lado ele vem (bem no centro, usa onde ele estava um instante antes)
          const ux = d > 0.5 ? bx : bx2, uy = d > 0.5 ? by : by2, du = d > 0.5 ? d : d2;
          if (du > 1e-6 && (ux * dirX + uy * dirY) / du >= cosMin) continue;            // o escudo dele pega
        }
        return true;
      }
      if (at.distancia(o, t, x, y) < rHit + 0.5) return true;
    }
    return false;
  }
  // distância até o perigo mais perto (pra escolher os candidatos mais seguros)
  function folga(r, t, x, y) {
    const at = r.at, T = Patterns.TIPOS;
    let m = 60;
    for (let i = 0; i < at.n; i++) {
      const o = at.vivos[i], s = o.s;
      if (o.morto || s.k === T.MOEDA || s.k === T.PLATAFORMA || s.k === T.ORBE || s.k === T.EMISSOR) continue;
      const d = at.distancia(o, Math.max(t, s.t0), x, y);    // o que ainda vai ativar também assusta
      if (d < m) m = d;
    }
    return m;
  }

  function Busca(fase, op) {
    op = op || {};
    const Bc = Object.assign({}, CONFIG.solver.busca, op), dt = 1 / 60;
    const comp = Patterns.compilar(fase, CONFIG.caixa);
    const r = new Sim.Corrida(comp);                       // motor de física: a alma é trocada por cada candidato
    const at = r.at;
    const lider = { x: 0, y: 0 };
    const a0 = copiarAlma(r.alma, {});
    let cands = [{ a: a0, modo: r.modo, hist: null }];
    const quadrosTotal = Math.ceil(comp.duracao / dt);
    let q = 0, morreuEm = null;
    const self = {
      resultado: null,
      get progresso() { return Math.min(1, q / quadrosTotal); },
      avancar(limiteMs) {
        if (self.resultado) return true;
        const fim = limiteMs === undefined ? Infinity : agora() + limiteMs;
    while (q < quadrosTotal && morreuEm === null) {
      // filhos: cada candidato × cada entrada do modo
      const m = cands[0].modo;
      const filhos = [];
      for (const c of cands) for (const e of entradasDo(c.modo)) filhos.push({ a: copiarAlma(c.a, {}), modo: c.modo, e, pai: c, vivo: true });
      for (let f = 0; f < Bc.quadros && q < quadrosTotal; f++, q++) {
        const t = Math.min(comp.duracao, (q + 1) * dt);
        Patterns.estadoCaixa(comp, t, r.est);
        r.lim.x = Math.max(2, comp.hw * r.est.largura - CONFIG.alma.margemParede);
        r.lim.y = Math.max(2, comp.hh * r.est.altura - CONFIG.alma.margemParede);
        at.atualizar(t, dt, lider);
        r._tMover = t;
        for (const fi of filhos) {
          if (!fi.vivo) continue;
          copiarAlma(fi.a, r.alma); r.modo = fi.modo;
          if (r.est.modo !== r.modo) r.entrarModo(r.est.modo);
          const e = fi.e;
          const ent = { dx: e.dx || 0, dy: e.dy || 0, local: true, pulo: !!e.pulo, trilho: f === 0 ? (e.trilho || 0) : 0, escudo: e.escudo !== undefined ? e.escudo : -1 };
          const x0 = r.alma.x, y0 = r.alma.y;
          r.mover(dt, ent);
          const xm = (x0 + r.alma.x) / 2, ym = (y0 + r.alma.y) / 2;
          if (colide(r, t - dt / 2, xm, ym, r.alma.escudo) || colide(r, t, r.alma.x, r.alma.y, r.alma.escudo)) { fi.vivo = false; continue; }
          copiarAlma(r.alma, fi.a); fi.modo = r.modo;
        }
      }
      // poda: um por balde (lugar + velocidade + estado do modo), os mais folgados primeiro
      const tAgora = Math.min(comp.duracao, q * dt);
      const baldes = new Map();
      for (const fi of filhos) {
        if (!fi.vivo) continue;
        fi.nota = folga(r, tAgora, fi.a.x, fi.a.y) - 0.01 * Math.hypot(fi.a.x, fi.a.y);
        const k = Math.round(fi.a.x / Bc.balde) + ',' + Math.round(fi.a.y / Bc.balde) + ',' + Math.round((fi.a.vx || 0) / Bc.baldeVel) + ',' +
          Math.round((fi.a.vy || 0) / Bc.baldeVel) + ',' + (fi.a.trilhoAlvo | 0) + ',' + (fi.a.escudo | 0) + ',' + (fi.a.chao ? 1 : 0);
        const ja = baldes.get(k);
        if (!ja || ja.nota < fi.nota) baldes.set(k, fi);
      }
      const vivos = Array.from(baldes.values()).sort((x, y) => y.nota - x.nota).slice(0, Bc.maxCandidatos);
      if (!vivos.length) { morreuEm = tAgora; break; }
      cands = vivos.map(fi => ({ a: fi.a, modo: fi.modo, hist: { e: fi.e, pai: fi.pai.hist } }));
      lider.x = cands[0].a.x; lider.y = cands[0].a.y;
      if (agora() > fim) return false;
    }
        if (morreuEm !== null) { self.resultado = { ok: false, morreuEm, duracao: comp.duracao }; return true; }
        // a sequência de entradas do melhor candidato, rejogada na simulação de verdade
        const entradas = [];
        for (let h = cands[0].hist; h; h = h.pai) entradas.push(h.e);
        entradas.reverse();
        const rep = repetirEntradas(fase, entradas);
        self.resultado = { ok: rep.estado === 'vitoria', entradas, morte: rep.morte, morreuEm: rep.morte ? rep.morte.t : null, duracao: comp.duracao };
        return true;
      },
    };
    return self;
  }
  function buscar(fase, op) { const b = Busca(fase, op); b.avancar(); return b.resultado; }

  // A fase usa um modo em que só a busca com a física de verdade vale?
  const MODOS_BUSCA = { gravidade: 1, gelo: 1, trilhos: 1, escudo: 1 };
  const precisaBusca = (fase) => (fase.eventos || []).some(ev => ev && ev.tipo === 'modo' && MODOS_BUSCA[ev.modo]);

  // Joga a fase de verdade com essas entradas (uma por decisão de CONFIG.solver.busca.quadros quadros).
  function repetirEntradas(fase, entradas) {
    const Bc = CONFIG.solver.busca, dt = 1 / 60;
    const r = new Sim.Corrida(Patterns.compilar(fase, CONFIG.caixa));
    for (let q = 0; r.estado === 'jogando' && q < entradas.length * Bc.quadros + Bc.quadros + 2; q++) {
      const e = entradas[Math.min(entradas.length - 1, Math.floor(q / Bc.quadros))] || {};
      r.passo((q + 1) * dt, { dx: e.dx || 0, dy: e.dy || 0, local: true, pulo: !!e.pulo,
        trilho: q % Bc.quadros === 0 ? (e.trilho || 0) : 0, escudo: e.escudo !== undefined ? e.escudo : -1 });
    }
    return { estado: r.estado, morte: r.morte };
  }

  // Análise inteira de uma vez (testes, ferramentas).
  function analisar(fase, op) {
    const a = Analise(fase, op);
    a.avancar();
    return a.resultado;
  }

  return { Analise, analisar, noCaminho, repetir, provar, Busca, buscar, repetirEntradas, precisaBusca };
})();
