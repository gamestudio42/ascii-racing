/* =====================================================================
   sprites/car.js  —  O CARRO
   Edite as caixas em CAR_SPRITE.model para mudar o formato do carro.
   (x = frente, y = direita, z = cima — veja sprites/iso.js)
   Cada caixa:  c = centro [x,y,z]   s = tamanho [x,y,z]   role = cor
   ===================================================================== */
const CAR_SPRITE = {
  scale: 1.5,            // tamanho visual (multiplicado pelo ZOOM da câmera). 1 = tamanho físico
  w: 380, h: 250,        // área de desenho do sprite, em pixels de tela

  // pegada no chão (para a sombra): retângulo 46 x 21
  footprint: [[-23,-10.5],[23,-10.5],[23,10.5],[-23,10.5]],

  model: [
    // ---- carroceria ----
    { n:'chassi',    c:[  0,    0,  4.5], s:[46, 21, 7  ], role:'body'  },
    { n:'capo',      c:[ 14,    0,  8.4], s:[16, 17, 1.6], role:'bodyHi'},
    { n:'listraCapo',c:[ 14,    0,  9.4], s:[16,  3, 0.4], role:'stripe'},
    { n:'porta-mala',c:[-17,    0,  8.4], s:[10, 17, 1.6], role:'bodyHi'},
    { n:'listraTras',c:[-17,    0,  9.4], s:[10,  3, 0.4], role:'stripe'},
    { n:'entrada',   c:[ 11,    0,  9.9], s:[ 6,  5, 1.4], role:'dark'  },
    { n:'ventE',     c:[  8,  -7.2, 9.4], s:[ 4,  2, 0.6], role:'dark'  },
    { n:'ventD',     c:[  8,   7.2, 9.4], s:[ 4,  2, 0.6], role:'dark'  },
    // ---- cabine (parabrisa e vidro traseiro em degraus) ----
    { n:'vidros',    c:[ -3,    0, 11.5], s:[13, 13, 6  ], role:'glass' },
    { n:'parabrisa1',c:[  4.5,  0, 11.0], s:[ 3, 12, 5  ], role:'glass' },
    { n:'parabrisa2',c:[  6.5,  0, 10.0], s:[ 2, 12, 3  ], role:'glass' },
    { n:'traseiro1', c:[-10.5,  0, 11.0], s:[ 3, 12, 5  ], role:'glass' },
    { n:'traseiro2', c:[-12.5,  0, 10.0], s:[ 2, 12, 3  ], role:'glass' },
    { n:'teto',      c:[ -3,    0, 15.0], s:[13, 11, 1.6], role:'bodyHi'},
    { n:'faixaTeto', c:[ -3,    0, 15.9], s:[13,  2, 0.3], role:'stripe'},
    { n:'colunaE',   c:[ -3,   -6.6,11.5], s:[ 2,  0.8, 6], role:'dark' },
    { n:'colunaD',   c:[ -3,    6.6,11.5], s:[ 2,  0.8, 6], role:'dark' },
    { n:'retroE',    c:[  5,   -9, 12.5], s:[ 2,  3, 1.6], role:'dark'  },
    { n:'retroD',    c:[  5,    9, 12.5], s:[ 2,  3, 1.6], role:'dark'  },
    // ---- aerofólio com placas laterais ----
    { n:'suporteE',  c:[-21, -7.5, 11  ], s:[2.5, 2, 6  ], role:'dark'  },
    { n:'suporteD',  c:[-21,  7.5, 11  ], s:[2.5, 2, 6  ], role:'dark'  },
    { n:'asa',       c:[-22,    0, 14.5], s:[5,  23, 1.5], role:'dark'  },
    { n:'asaTopo',   c:[-22,    0, 15.4], s:[3,  21, 0.4], role:'bodyHi'},
    { n:'placaE',    c:[-22,  -11.7,14 ], s:[5, 0.6, 4  ], role:'dark'  },
    { n:'placaD',    c:[-22,   11.7,14 ], s:[5, 0.6, 4  ], role:'dark'  },
    // ---- caixas de roda, pneus e calotas ----
    { n:'arcoFE',    c:[ 13, -11.3, 3.4], s:[13, 3, 7.2], role:'dark'  },
    { n:'arcoFD',    c:[ 13,  11.3, 3.4], s:[13, 3, 7.2], role:'dark'  },
    { n:'arcoTE',    c:[-14, -11.3, 3.4], s:[13, 3, 7.2], role:'dark'  },
    { n:'arcoTD',    c:[-14,  11.3, 3.4], s:[13, 3, 7.2], role:'dark'  },
    { n:'rodaFE',    c:[ 13, -12.2, 3.2], s:[10, 4.5, 6.4], role:'tire' },
    { n:'rodaFD',    c:[ 13,  12.2, 3.2], s:[10, 4.5, 6.4], role:'tire' },
    { n:'rodaTE',    c:[-14, -12.2, 3.2], s:[10, 4.5, 6.4], role:'tire' },
    { n:'rodaTD',    c:[-14,  12.2, 3.2], s:[10, 4.5, 6.4], role:'tire' },
    { n:'calotaFE',  c:[ 13, -14.6, 3.2], s:[5, 0.5, 5  ], role:'rim'   },
    { n:'calotaFD',  c:[ 13,  14.6, 3.2], s:[5, 0.5, 5  ], role:'rim'   },
    { n:'calotaTE',  c:[-14, -14.6, 3.2], s:[5, 0.5, 5  ], role:'rim'   },
    { n:'calotaTD',  c:[-14,  14.6, 3.2], s:[5, 0.5, 5  ], role:'rim'   },
    { n:'cuboFE',    c:[ 13, -14.9, 3.2], s:[1.6,0.4,1.6], role:'dark'  },
    { n:'cuboFD',    c:[ 13,  14.9, 3.2], s:[1.6,0.4,1.6], role:'dark'  },
    { n:'cuboTE',    c:[-14, -14.9, 3.2], s:[1.6,0.4,1.6], role:'dark'  },
    { n:'cuboTD',    c:[-14,  14.9, 3.2], s:[1.6,0.4,1.6], role:'dark'  },
    // ---- laterais: saias, portas, número ----
    { n:'saiaE',     c:[  0, -10.8, 1.8], s:[28, 0.8, 2.4], role:'dark' },
    { n:'saiaD',     c:[  0,  10.8, 1.8], s:[28, 0.8, 2.4], role:'dark' },
    { n:'portaE1',   c:[ -8, -10.7, 5.8], s:[0.8, 0.4, 5.4], role:'dark' },
    { n:'portaE2',   c:[  5, -10.7, 5.8], s:[0.8, 0.4, 5.4], role:'dark' },
    { n:'portaD1',   c:[ -8,  10.7, 5.8], s:[0.8, 0.4, 5.4], role:'dark' },
    { n:'portaD2',   c:[  5,  10.7, 5.8], s:[0.8, 0.4, 5.4], role:'dark' },
    { n:'numE',      c:[ -1.5,-10.75,6.2], s:[5,  0.3, 4  ], role:'stripe'},
    { n:'numD',      c:[ -1.5, 10.75,6.2], s:[5,  0.3, 4  ], role:'stripe'},
    { n:'puxadorE',  c:[ -4,  -10.8, 7.6], s:[2,  0.3, 0.6], role:'rim'  },
    { n:'puxadorD',  c:[ -4,   10.8, 7.6], s:[2,  0.3, 0.6], role:'rim'  },
    // ---- para-choques, escapamentos, faróis e lanternas ----
    { n:'parachoqF', c:[ 24.2,   0, 3.0], s:[2, 19, 3  ], role:'dark'  },
    { n:'parachoqT', c:[-24.4,   0, 3.0], s:[2, 19, 3  ], role:'dark'  },
    { n:'splitter',  c:[ 24.8,   0, 1.3], s:[1.6,21, 0.8], role:'rim'  },
    { n:'escapeE',   c:[-24.8,  -5, 2.0], s:[3,  2, 2  ], role:'rim'   },
    { n:'escapeD',   c:[-24.8,   5, 2.0], s:[3,  2, 2  ], role:'rim'   },
    { n:'grade',     c:[ 23.4,   0, 5.8], s:[0.8, 7, 2.2], role:'dark' },
    { n:'farolE',    c:[ 23.2,  -6.5, 6.2], s:[1.6, 4.4, 2.8], role:'light' },
    { n:'farolD',    c:[ 23.2,   6.5, 6.2], s:[1.6, 4.4, 2.8], role:'light' },
    { n:'lanternaE', c:[-23.4,  -7.5, 6.2], s:[1.6, 4.4, 2.6], role:'tail'  },
    { n:'lanternaD', c:[-23.4,   7.5, 6.2], s:[1.6, 4.4, 2.6], role:'tail'  },
  ],

  // paleta derivada da cor do carro
  roles(color, hit) {
    if (hit) return { body:'#ffffff', bodyHi:'#ffffff', stripe:'#ffffff', glass:'#dddddd', dark:'#cccccc', tire:'#dddddd', light:'#ffffff', tail:'#ffffff', rim:'#ffffff' };
    const t = (f) => Iso.tint(color, f);
    return { body: color, bodyHi: t(1.35), stripe:'#f4f4f4', glass:'#1d4258', dark: t(0.5),
             tire:'#2e2e3a', rim:'#c9cedc', light:'#fff6c0', tail:'#ff2a2a' };
  },

  // chama do nitro (um triângulo laranja com núcleo amarelo, atrás do carro)
  flame(g, yaw, ax, ay, k, zs, len) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (lx, ly) => { const X = lx*cs - ly*sn, Y = lx*sn + ly*cs; return [ax + (X-Y)*k, ay + (X+Y)*k*0.5 - 6*zs]; };
    g.fillStyle = '#ff7a1a'; g.beginPath();
    for (const [i, p] of [P(-25,-6), P(-25,6), P(-25-len,0)].entries()) i ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1]);
    g.closePath(); g.fill();
    g.fillStyle = '#fff3a0'; g.beginPath();
    for (const [i, p] of [P(-25,-3), P(-25,3), P(-25-len*0.55,0)].entries()) i ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1]);
    g.closePath(); g.fill();
  },
  paintFlame(buf, yaw, k, zs, len) { const g = buf.begin(), [ax, ay] = buf.anchor; this.flame(g, yaw, ax, ay, k, zs, len); },

  // desenha o carro em um SpriteBuffer
  paint(buf, car, k, zs) {
    const g = buf.begin(), [ax, ay] = buf.anchor, hit = car.flash > 0;
    if (car.nitro > 0) this.flame(g, car.a, ax, ay, k, zs, 30 + Math.random() * 12);
    Iso.drawModel(g, this.model, car.a, this.roles(car.color, hit), ax, ay, k, zs);
  },
};
