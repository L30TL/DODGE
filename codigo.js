'use strict';
// =============================================================================
// DODGE — codigo.js
// Código curto pra compartilhar uma fase (sem servidor: o código É a fase).
//   DG1Z.<dados>.<soma>
//   DG1  = versão do formato · Z = compactado (deflate) · J = sem compactar (navegador antigo)
//   <dados> = JSON da fase em base64url · <soma> = soma de verificação (pega código cortado)
// Ler um código nunca confia nele: tamanho máximo antes e depois de descompactar,
// soma, JSON, música conhecida, validador de fases, e o nome passa pelo filtro (quem
// chama decide). Sem DOM: roda no Node 18+ (CompressionStream é global lá também).
// =============================================================================

const Codigo = (() => {
  const VERSAO = 1;
  const RE = /^DG(\d+)([ZJ])\.([A-Za-z0-9_-]+)\.([a-z0-9]+)$/;
  const temCompressao = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  function paraBase64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deBase64url(txt) {
    try {
      const bin = atob(txt.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((txt.length + 3) % 4));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) { return null; }
  }

  // Lê um stream inteiro, desistindo se passar de max bytes (código "bomba" não trava nada).
  async function lerTudo(stream, max) {
    const r = stream.getReader();
    const partes = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await r.read();
        if (done) break;
        total += value.length;
        if (total > max) { r.cancel().catch(() => {}); return null; }
        partes.push(value);
      }
    } catch (e) { return null; }
    const out = new Uint8Array(total);
    let p = 0;
    for (const x of partes) { out.set(x, p); p += x.length; }
    return out;
  }
  function passar(bytes, transformador, max) {
    const w = transformador.writable.getWriter();
    w.write(bytes).catch(() => {});
    w.close().catch(() => {});
    return lerTudo(transformador.readable, max);
  }

  // Código de uma fase. verificada = o criador venceu essa versão (vai junto no código).
  async function gerar(fase, verificada) {
    const dados = { n: fase.nome, d: fase.dificuldade, m: fase.musica,
      e: fase.eventos.filter(ev => ev.batida <= fase.duracaoBatidas) };
    if (verificada) dados.v = 1;
    const bytes = new TextEncoder().encode(JSON.stringify(dados));
    let tipo = 'J', corpo = bytes;
    if (temCompressao()) {
      const z = await passar(bytes, new CompressionStream('deflate-raw'), Infinity);
      if (z) { corpo = z; tipo = 'Z'; }
    }
    const b64 = paraBase64url(corpo);
    return 'DG' + VERSAO + tipo + '.' + b64 + '.' + Criadas.hash(b64);
  }

  // Lê um código. Devolve { ok: true, fase: { nome, dificuldade, musica, eventos }, verificada }
  // ou { ok: false, erro: 'formato' | 'incompleto' | 'versao' | 'grande' | 'invalido' | 'navegador' }.
  async function ler(txt) {
    const erro = (e) => ({ ok: false, erro: e });
    txt = String(txt == null ? '' : txt).replace(/\s+/g, '');
    if (txt.length > CONFIG.codigo.maxTexto) return erro('grande');
    const m = RE.exec(txt);
    if (!m) return erro(/^DG\d/.test(txt) ? 'incompleto' : 'formato');
    if (+m[1] > VERSAO) return erro('versao');
    if (+m[1] !== VERSAO) return erro('formato');
    if (Criadas.hash(m[3]) !== m[4]) return erro('incompleto');
    let bytes = deBase64url(m[3]);
    if (!bytes) return erro('incompleto');
    if (m[2] === 'Z') {
      if (!temCompressao()) return erro('navegador');
      bytes = await passar(bytes, new DecompressionStream('deflate-raw'), CONFIG.codigo.maxBytes);
      if (!bytes) return erro('invalido');
    }
    if (bytes.length > CONFIG.codigo.maxBytes) return erro('grande');
    let d;
    try { d = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { return erro('invalido'); }
    if (!d || typeof d !== 'object' || !Array.isArray(d.e) || !Criadas.MUSICAS.includes(d.m)) return erro('invalido');
    return { ok: true, verificada: d.v === 1,
      fase: { nome: typeof d.n === 'string' ? d.n : '', dificuldade: d.d, musica: d.m, eventos: d.e } };
  }

  return { gerar, ler, VERSAO };
})();
