/* =====================================================================
   sprites/iso.js  —  MOTOR DE SPRITES ISOMÉTRICOS
   Pega um "modelo" feito de caixas 3D, gira, projeta em isométrico 2:1
   (com luz vinda da esquerda) e converte o resultado em ASCII.

   Convenção do modelo (coordenadas locais do objeto):
     x = frente   y = direita   z = para cima      (unidades do mundo)
   Cada caixa:  { c:[x,y,z]  centro,  s:[largura x, y, z]  tamanho,  role:'nome-da-cor' }
   As cores vêm de um objeto "roles" { nome: '#rrggbb' } passado ao desenhar.
   ===================================================================== */
const Iso = (() => {
  const SQ = Math.SQRT1_2;

  const rgbOf = c => {
    if (Array.isArray(c)) return c;
    if (c.charCodeAt(0) === 114) { const m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]]; }     // "rgb(r,g,b)"
    const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  // f<1 escurece, f>1 clareia rumo ao branco
  function tint(c, f) {
    const [r, g, b] = rgbOf(c);
    if (f <= 1) return `rgb(${r * f | 0},${g * f | 0},${b * f | 0})`;
    const t = f - 1;
    return `rgb(${r + (255 - r) * t | 0},${g + (255 - g) * t | 0},${b + (255 - b) * t | 0})`;
  }

  // 4 faces laterais (normal local + vértices) e o topo
  const SIDES = [
    { n: [ 1, 0], v: [[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1],[ 1,-1, 1]] },
    { n: [-1, 0], v: [[-1, 1,-1],[-1,-1,-1],[-1,-1, 1],[-1, 1, 1]] },
    { n: [ 0, 1], v: [[ 1, 1,-1],[-1, 1,-1],[-1, 1, 1],[ 1, 1, 1]] },
    { n: [ 0,-1], v: [[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1]] },
  ];
  const TOP = [[-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]];

  /* Ordem de desenho (do mais longe para o mais perto da câmera).
     Ordenar só pelo centro falha com caixas empilhadas (capô sobre o chassi, teto sobre a cabine).
     Aqui comparamos cada par de caixas: se existe um plano alinhado aos eixos que as separa, a que está
     do lado da câmera vem depois. Depois fazemos uma ordenação topológica com essas relações. */
  const VIEW_Z = 0.884;                        // elevação da câmera isométrica 2:1 (dz por unidade de x+y)
  const EPS = 0.7;                             // sobreposições pequenas contam como "encostadas"
  function orderBoxes(model, cs, sn) {
    const n = model.length, lv = [cs + sn, -sn + cs, VIEW_Z];     // direção da câmera no sistema local do carro
    const key = model.map(b => { const X = b.c[0] * cs - b.c[1] * sn, Y = b.c[0] * sn + b.c[1] * cs; return X + Y + b.c[2] * VIEW_Z; });
    const out = model.map(() => []), indeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = model[i], B = model[j];
      let best = -1, first = 0;                                   // first: +1 => i antes de j
      for (let a = 0; a < 3; a++) {
        const aMax = A.c[a] + A.s[a] / 2, aMin = A.c[a] - A.s[a] / 2, bMax = B.c[a] + B.s[a] / 2, bMin = B.c[a] - B.s[a] / 2;
        const w = Math.abs(lv[a]);
        if (w <= best) continue;
        if (aMax <= bMin + EPS) { best = w; first = lv[a] > 0 ? +1 : -1; }          // B fica no lado + de A
        else if (bMax <= aMin + EPS) { best = w; first = lv[a] > 0 ? -1 : +1; }     // A fica no lado + de B
      }
      if (best < 0) first = key[i] <= key[j] ? +1 : -1;           // caixas que se atravessam: cai para a distância
      const [p, q] = first > 0 ? [i, j] : [j, i];
      out[p].push(q); indeg[q]++;
    }
    const done = new Array(n).fill(false), order = [];
    for (let step = 0; step < n; step++) {
      let pick = -1;
      for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (pick < 0 || key[i] < key[pick])) pick = i;
      if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || key[i] < key[pick])) pick = i;   // ciclo: desempata pela distância
      done[pick] = true; order.push(model[pick]);
      for (const q of out[pick]) indeg[q]--;
    }
    return order;
  }

  /* Desenha um modelo de caixas no contexto g.
     yaw = giro do objeto no mundo; (ax,ay) = onde fica o chão do centro do objeto
     k = escala horizontal iso;  zs = escala vertical (altura)                     */
  function drawModel(g, model, yaw, roles, ax, ay, k, zs) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (const b of orderBoxes(model, cs, sn)) {
      const col = roles[b.role] || '#ff00ff';
      const hx = b.s[0] / 2, hy = b.s[1] / 2, hz = b.s[2] / 2;
      const pt = (sx, sy, sz) => {
        const lx = b.c[0] + sx * hx, ly = b.c[1] + sy * hy, lz = b.c[2] + sz * hz;
        const X = lx * cs - ly * sn, Y = lx * sn + ly * cs;
        return [ax + (X - Y) * k, ay + (X + Y) * k * 0.5 - lz * zs];
      };
      const fill = (verts, color) => {
        g.beginPath();
        verts.forEach((v, i) => { const p = pt(v[0], v[1], v[2]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
        g.closePath();
        g.lineJoin = 'round';
        g.strokeStyle = 'rgba(6,6,10,0.9)'; g.lineWidth = 2.2; g.stroke();   // contorno escuro
        g.fillStyle = color; g.fill();
      };
      for (const f of SIDES) {
        const nx = f.n[0] * cs - f.n[1] * sn, ny = f.n[0] * sn + f.n[1] * cs;
        if (nx + ny <= 0.001) continue;                    // face de costas para a câmera
        const shade = 0.58 + 0.42 * Math.max(0, -nx * SQ + ny * SQ);   // luz vem da esquerda
        fill(f.v, tint(col, shade));
      }
      fill(TOP, tint(col, 1.12));
    }
  }

  /* Buffer de sprite: desenha-se em "hi" (alta resolução) e depois converte
     cada célula em um caractere, no estilo de gravura ASCII:
       - bordas  -> caractere na direção da linha:  -  |  /  \
       - interior -> hachura ordenada (dither) com  .  -  +  #                      */
  const TONE = ' -+#';                       // vazio, leve, médio, denso
  const BAYER = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5].map(v => v / 16);
  function edgeChar(gx, gy) {                  // (gx,gy) = gradiente; a linha é perpendicular a ele
    let deg = (Math.atan2(gy, gx) * 180 / Math.PI + 90) % 180; if (deg < 0) deg += 180;
    if (deg < 22.5 || deg >= 157.5) return '-';
    if (deg < 67.5) return '\\';
    if (deg < 112.5) return '|';
    return '/';
  }

  class SpriteBuffer {
    constructor(w, h, anchorY = 0.62) { this.w = w; this.h = h; this.ay = anchorY; this.build(); }
    build() {                                              // chamar de novo após resize
      this.cols = Math.ceil(this.w / SCW); this.rows = Math.ceil(this.h / SCH);
      this.hi = document.createElement('canvas');
      this.hi.width = this.cols * SCW; this.hi.height = this.rows * SCH;
      this.g = this.hi.getContext('2d', { willReadFrequently: true });
      this.mini = document.createElement('canvas'); this.mini.width = this.cols; this.mini.height = this.rows;
      this.m = this.mini.getContext('2d', { willReadFrequently: true });
      this.m.imageSmoothingQuality = 'high';
      this.A = new Float32Array(this.cols * this.rows); this.L = new Float32Array(this.cols * this.rows);
      this.cache = new Map();
    }
    begin() { this.g.clearRect(0, 0, this.hi.width, this.hi.height); return this.g; }
    get anchor() { return [this.hi.width / 2, this.hi.height * this.ay]; }

    // Converte o que está em "hi" numa lista de caracteres posicionados (coordenadas relativas ao sprite)
    convert() {
      const cols = this.cols, rows = this.rows, A = this.A, L = this.L;
      this.m.clearRect(0, 0, cols, rows);
      this.m.drawImage(this.hi, 0, 0, cols, rows);
      const d = this.m.getImageData(0, 0, cols, rows).data;
      for (let i = 0, n = cols * rows; i < n; i++) {
        const p = i * 4; A[i] = d[p + 3] / 255;
        L[i] = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255;
      }
      const at = (arr, c, r) => (c < 0 || r < 0 || c >= cols || r >= rows) ? 0 : arr[r * cols + c];
      const q = v => ((Math.min(255, v) >> 4) << 4) + 8;                    // quantiza cor
      const items = [];
      let minC = 1e9, maxC = -1, minR = 1e9, maxR = -1;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c, a = A[i];
        if (a < 0.12) continue;
        const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
        // gradiente do contorno (alfa) e das faces (luminância), em espaço de pixel
        const gax = (at(A, c + 1, r) - at(A, c - 1, r)) / SCW, gay = (at(A, c, r + 1) - at(A, c, r - 1)) / SCH;
        const glx = (at(L, c + 1, r) - at(L, c - 1, r)) / SCW, gly = (at(L, c, r + 1) - at(L, c, r - 1)) / SCH;
        const ga = Math.hypot(gax, gay) * SCW, gl = Math.hypot(glx, gly) * SCW;
        let ch, boost = 1.4, add = 50;
        if (a < 0.93 && ga > 0.28) { ch = edgeChar(gax, gay); boost = 1.4; add = 70; }          // silhueta: tinta clara
        else if (gl > 0.2) { ch = edgeChar(glx, gly); boost = 1.4; add = 22; }                 // dobras entre faces
        else {
          const t = Math.pow(L[i], 0.75) * (TONE.length - 1) + BAYER[(r & 3) * 4 + (c & 3)] - 0.25;
          const k = Math.max(a > 0.6 ? 1 : 0, Math.min(TONE.length - 1, Math.floor(t)));   // interior nunca fica vazio
          ch = TONE[k];
          if (ch === ' ') continue;
        }
        items.push(c, r, sglyph(ch, `rgb(${q(R * boost + add)},${q(G * boost + add)},${q(B * boost + add)})`));
        if (c < minC) minC = c; if (c > maxC) maxC = c; if (r < minR) minR = r; if (r > maxR) maxR = r;
      }
      if (maxC < 0) return { bmp: null, ox: 0, oy: 0 };
      // monta a pose inteira num único bitmap (recortado): no jogo vira 1 só drawImage
      const w = maxC - minC + 1, h = maxR - minR + 1;
      const bmp = document.createElement('canvas'); bmp.width = w * SCW; bmp.height = h * SCH;
      const g = bmp.getContext('2d');
      // base de cor SÓLIDA (o carro não fica transparente); os caracteres entram por cima, como textura
      const base = document.createElement('canvas'); base.width = w; base.height = h;
      const bgc = base.getContext('2d'), id = bgc.createImageData(w, h);
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const si = (r + minR) * cols + (c + minC);
        if (A[si] < 0.3) continue;
        const p = si * 4, o = (r * w + c) * 4;
        id.data[o] = d[p]; id.data[o + 1] = d[p + 1]; id.data[o + 2] = d[p + 2]; id.data[o + 3] = 255;
      }
      bgc.putImageData(id, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(base, 0, 0, w, h, 0, 0, w * SCW, h * SCH);
      for (let i = 0; i < items.length; i += 3) g.drawImage(items[i + 2], (items[i] - minC) * SCW, (items[i + 1] - minR) * SCH);
      flushCanvas(bmp);                                  // pinta agora (no orçamento de bake), não no 1º quadro em que aparece
      return { bmp, ox: minC * SCW, oy: minR * SCH };
    }

    // Desenha com o chão do centro do objeto em (sx,sy). `key` liga o cache (mesma pose = mesmo resultado);
    // `paintFn` só roda quando a pose ainda não está em cache.
    // Gera a pose em cache sem desenhar (usado em segundo plano para não travar a corrida)
    prime(key, paintFn) {
      if (this.cache.has(key)) return;
      paintFn();
      if (this.cache.size > 700) this.cache.clear();
      this.cache.set(key, this.convert());
    }

    render(ctx, sx, sy, key, paintFn) {
      let e = key ? this.cache.get(key) : null;
      if (!e) {
        paintFn();
        e = this.convert();
        if (key) { if (this.cache.size > 700) this.cache.clear(); this.cache.set(key, e); }
      }
      if (!e.bmp) return;
      const x0 = Math.round(sx - this.hi.width / 2), y0 = Math.round(sy - this.hi.height * this.ay);
      ctx.drawImage(e.bmp, x0 + e.ox, y0 + e.oy);
    }
  }

  return { drawModel, SpriteBuffer, tint, rgbOf };
})();
