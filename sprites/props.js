/* =====================================================================
   sprites/props.js  —  ITENS, MINAS E MÍSSEIS
   - PROPS.pad / PROPS.mine são ARTE ASCII feita à mão: edite os textos!
       '@' no pad = onde entra a letra do item (M, X, N, +)
   - PROPS.missile é um modelo 3D de caixas (mesmo formato do carro).
   ===================================================================== */
const PROPS = {
  // caixa de item (7 colunas x 5 linhas; cada caractere é repetido 2x na horizontal ao desenhar)
  pad: [
    " .-^-. ",
    ".'   '.",
    "<  @  >",
    "'.   .'",
    " '-v-' ",
  ],
  // mina (7 x 3)
  mine: [
    " ,-^-, ",
    "<(-X-)>",
    " '-v-' ",
  ],
  missile: {
    model: [
      { c:[  0,  0, 3  ], s:[16, 3.6, 3.6], role:'body' },
      { c:[  9,  0, 3  ], s:[ 4, 3.2, 3.2], role:'nose' },
      { c:[ 11.5,0, 3  ], s:[ 1.5,2,  2  ], role:'tip'  },
      { c:[  2,  0, 3  ], s:[ 2.5,3.9,3.9], role:'band' },
      { c:[ -7,  0, 3  ], s:[ 3, 11,  0.8], role:'fin'  },
      { c:[ -7,  0, 3  ], s:[ 3, 0.8, 9  ], role:'fin'  },
      { c:[ -9,  0, 3  ], s:[ 2, 3,   3  ], role:'dark' },
    ],
    roles: { body:'#e8e8ee', nose:'#ff4a3a', tip:'#ffd0c0', band:'#ffb347', fin:'#9aa0b0', dark:'#444a58' },
    scale: 1.23, w: 110, h: 90,
  },

  // desenha uma arte ASCII centrada em (sx,sy). `letter` substitui '@'.
  // stretch = quantas vezes cada caractere é repetido na horizontal (a arte fica mais larga, como num piso isométrico).
  // A arte é montada uma vez num bitmap (cache) e depois só copiada.
  _cache: new Map(),
  clearCache() { this._cache.clear(); },
  drawArt(art, sx, sy, color, letter, letterColor, stretch = 2) {
    const key = color + '|' + letter + '|' + letterColor + '|' + art[0] + art.length;
    let cv = this._cache.get(key);
    if (!cv) {
      const rows = art.length, cols = art[0].length;
      cv = document.createElement('canvas'); cv.width = cols * stretch * SCW; cv.height = rows * SCH;
      const g = cv.getContext('2d');
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const ch = art[r][c];
        if (ch === ' ') continue;
        if (ch === '@') { g.drawImage(sglyph(letter, letterColor || '#ffffff'), Math.round(c * stretch * SCW + (stretch - 1) * SCW / 2), r * SCH); continue; }
        for (let s = 0; s < stretch; s++) g.drawImage(sglyph(ch, color), (c * stretch + s) * SCW, r * SCH);
      }
      this._cache.set(key, cv);
    }
    // o tamanho acompanha o zoom da câmera (1 no zoom padrão): os itens ficam do tamanho de um carro
    const f = (typeof ZOOM_CSS !== 'undefined') ? ZOOM_CSS / ZOOM_PADRAO : 1, w = cv.width * f, h = cv.height * f;
    const scaled = Math.abs(f - 1) > 0.02;
    ctx.imageSmoothingEnabled = scaled;
    ctx.drawImage(cv, Math.round(sx - w / 2), Math.round(sy - h / 2), w, h);
    ctx.imageSmoothingEnabled = false;
  },
};
