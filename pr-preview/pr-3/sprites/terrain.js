/* =====================================================================
   sprites/terrain.js  —  VISUAL DA PISTA E DO CENÁRIO
   `tile()` decide, para cada célula do mapa, o caractere, a cor do
   caractere e a cor de fundo. Mexa nas cores/caracteres à vontade.

   Dados recebidos por célula (i):
     d     distância (mundo) até a linha central      lat  deslocamento lateral com sinal
     k     índice do ponto da pista mais próximo      dch  caractere "na direção da pista" ( - | / \ )
     h,h2  aleatórios fixos (0..1)                    n1,n2,n3  ruídos suaves (grande, médio, fino)
     tx,ty célula        N  nº de pontos da pista     ROAD_HW, WALL_T  larguras
   ===================================================================== */
const rgb = (r, g, b) => `rgb(${Math.max(0, Math.min(255, r)) | 0},${Math.max(0, Math.min(255, g)) | 0},${Math.max(0, Math.min(255, b)) | 0})`;

const TERRAIN = {
  startHalf: 17, startBorder: 3, startSq: 14,   // linha de largada: meia espessura, borda e lado dos quadrados (unidades do mundo)
  wallPx: 4,                           // altura dos muros, em pixels de tela (menor que 1 linha de caracteres)
  crowdColors: ['#ff5252', '#ffd23f', '#58d3ff', '#ff8ad8', '#9dff7a', '#ffffff', '#ff9a3a'],
  boards: ['#2e6fd0', '#d4a017', '#27ae60', '#8e44ad', '#e67e22', '#1fa7a7'],   // placas de patrocinador (sem vermelho: não confunde com a zebra)
  // Muro VETORIAL: faixa contínua desenhada em polígonos isométricos (segue a curva e pode ser tão fino quanto se queira).
  vectorWalls: true,
  wallWidth: 10,                       // espessura do muro (unidades do mundo)
  wallTopColors: ['#929bb6', '#8890ab'],   // topo (alterna a cada 36 unidades: emendas)
  wallFaceColor: '#2f3447',            // face lateral (escura)
  boardsOn: false,                     // true = liga as placas de patrocinador coloridas nos muros
  boardLen: 70,                        // comprimento de cada placa e de cada trecho de concreto entre elas (unidades)
  grass: ",'`.:;\"",
  flowers: ['#ffd23f', '#ffffff', '#ff8ad8', '#58d3ff'],

  tile(i) {
    const { d, k, lat, arc, h, h2, n1, n2, n3, tx, ty, N, ROAD_HW, WALL_T, CURB_W, CROWD_W, dch } = i;
    const par = (v, size) => ((Math.floor(v / size) % 2) + 2) % 2;      // alterna 0/1 a cada `size` unidades
    const al = Math.abs(lat);

    // ---------- ASFALTO ----------
    if (d < ROAD_HW) {                                                       // asfalto (a zebra e as linhas são desenhadas por cima, em vetor)
      let l = 22 + n2 * 14 + (1 - d / ROAD_HW) * 5 + (n3 - 0.5) * 7;     // base + grão fino
      if (n1 > 0.72) l += 5;                                              // remendos mais claros
      if (n1 < 0.22) l -= 4;                                              // manchas de óleo
      const rub = Math.max(0, 1 - Math.abs(al - ROAD_HW * 0.38) / 15) * (0.4 + 0.6 * n2);   // marcas de borracha
      l -= rub * 9;
      let ch = ' ', fg = '#fff', bg = rgb(l, l + 2, l + 9);
      if (rub > 0.4 && h < 0.55) { ch = h2 < 0.5 ? ':' : '.'; fg = rgb(l + 10, l + 11, l + 17); }
      else if (h < 0.07) { ch = '.'; fg = rgb(l + 30, l + 32, l + 42); }                // pedrinhas
      else if (n3 > 0.62 && h < 0.3) { ch = ','; fg = rgb(l + 16, l + 18, l + 26); }
      else if (h2 < 0.01) { ch = h < 0.5 ? '/' : '\\'; fg = rgb(l + 20, l + 22, l + 30); }   // trincas
      return { kind: 'road', ch, fg, bg };
    }

    // ---------- MURO (topo + face): placas de patrocinador alternando com concreto, em trechos regulares ----------
    if (!this.vectorWalls && d < ROAD_HW + WALL_T) {
      const q = Math.round(n2 * 3) / 3, L = this.boardLen;
      const seg = Math.floor(arc / L), board = this.boardsOn && (((seg % 2) + 2) % 2) === 0;   // placa nos trechos pares (se ligadas)
      const bc = Iso.rgbOf(this.boards[((((seg >> 1) % this.boards.length) + this.boards.length) % this.boards.length)]);
      const end = board && (((arc % L) + L) % L < 3 || ((arc % L) + L) % L > L - 3);   // moldura clara nas pontas da placa
      const seam = !board && (((arc % 36) + 36) % 36) < 4;                          // emendas do concreto
      if (board) {
        return {
          kind: 'wall',
          top:  { ch: end ? ' ' : '=', fg: rgb(bc[0] * 0.8 + 50, bc[1] * 0.8 + 50, bc[2] * 0.8 + 50), bg: end ? '#d8dbe6' : rgb(bc[0] * 0.45 + 28, bc[1] * 0.45 + 28, bc[2] * 0.45 + 28) },
          face: { ch: end ? ' ' : '=', fg: rgb(bc[0] * 0.9 + 40, bc[1] * 0.9 + 40, bc[2] * 0.9 + 40), bg: end ? '#aeb2c2' : rgb(bc[0] * 0.55 + 10, bc[1] * 0.55 + 10, bc[2] * 0.55 + 10) },
        };
      }
      return {
        kind: 'wall',
        top:  { ch: h < 0.12 ? '%' : ' ', fg: '#9aa3bf', bg: rgb(78 + q * 14, 84 + q * 16, 106 + q * 18) },
        face: { ch: seam ? '|' : '=', fg: seam ? '#8791ad' : '#4a5270', bg: '#262a38' },
      };
    }

    const dd = d - ROAD_HW - (this.vectorWalls ? this.wallWidth : WALL_T);
    // ---------- TORCIDA (cabeça + corpo em linhas alternadas) ----------
    if (dd < CROWD_W) {
      if (h < 0.78) {
        const col = this.crowdColors[(h2 * 997 | 0) % this.crowdColors.length];
        const head = (ty & 1) === 0;
        return { kind: 'ground', ch: head ? (h2 < 0.15 ? '@' : 'o') : (h2 < 0.1 ? '^' : '#'),
                 fg: head ? col : Iso.tint(col, 0.6), bg: '#10131b' };
      }
      return { kind: 'ground', ch: ' ', fg: '#fff', bg: '#10131b' };
    }

    // ---------- GRAMA / TERRA (exterior simples: pouco ruído, poucos caracteres) ----------
    let ch = ' ', fg = '#fff', bg = rgb(7 + n1 * 12, 18 + n1 * 32, 9 + n1 * 12);
    if (n1 > 0.7) { bg = rgb(32 + n1 * 16, 25 + n1 * 11, 16); if (h < 0.3) { ch = '.'; fg = rgb(90, 72, 50); } }   // terra batida
    else if (h2 < 0.002) { ch = '*'; fg = this.flowers[(h * 997 | 0) % 4]; }                                         // flores
    else if (h < 0.3) { ch = this.grass[(h * 100 | 0) % this.grass.length]; fg = rgb(22 + n1 * 28, 66 + n1 * 54, 32 + n1 * 22); }
    return { kind: 'ground', ch, fg, bg };
  },

  // árvores e arbustos
  tree: {
    density: 0.0004,                   // chance por célula de 7x13 px (ajustada ao tamanho da célula)
    unit: 14,                          // raio-base da copa, em pixels de tela
    liftPx: 24,                        // quanto a copa fica acima do chão, em pixels
    shadowBg: '#06130a', shadowFg: '#0e2412',
    canopy(s, hx) {                    // s = luz 0..1, hx = aleatório 0..1
      return { ch: '@%&#8'[(hx * 5) | 0], fg: rgb(30 + s * 60, 100 + s * 120, 40 + s * 60), bg: rgb(9 + s * 22, 36 + s * 58, 12 + s * 22) };
    },
  },
};
