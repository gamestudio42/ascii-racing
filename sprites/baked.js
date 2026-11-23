/* =====================================================================
   sprites/baked.js  —  CARREGA OS SPRITES PRÉ-GERADOS (sprites/baked/)
   Os PNGs e o meta.js saem de tools/bake.html. Se não existirem, o jogo
   gera os carros em tempo real (mais lento, mas funciona igual).
   O meta.js é carregado com um número de versão na URL (evita usar um cache antigo depois de refazer o bake).
   ===================================================================== */
const BAKED = {
  ready: false, meta: null, atlas: [], flame: null, colorIndex: {},
  init() {
    const s = document.createElement('script');
    s.src = 'sprites/baked/meta.js?t=' + Date.now();
    s.onload = () => this.load();
    s.onerror = () => {};                                          // ainda não foi gerado: o jogo usa o modo em tempo real
    document.head.appendChild(s);
  },
  load() {
    if (typeof BAKED_META === 'undefined') return;
    const m = this.meta = BAKED_META, v = '?v=' + (m.built || 0);
    m.colors.forEach((c, i) => { this.colorIndex[c] = i; });
    let pend = m.files.length + 1;
    const done = () => { if (--pend === 0) this.ready = true; };
    m.files.forEach((f, i) => { const im = new Image(); im.onload = done; im.src = 'sprites/baked/' + f + v; this.atlas[i] = im; });
    const fi = new Image(); fi.onload = done; fi.src = 'sprites/baked/' + m.flame.file + v; this.flame = fi;
  },
};
BAKED.init();
