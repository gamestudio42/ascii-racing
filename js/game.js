'use strict';
/* =====================================================================
   ASCII RACING
   Corrida de combate em visão isométrica (estilo Rock'n Roll Racing) toda
   desenhada com caracteres ASCII. Física em coordenadas de mundo; o
   projeção isométrica 2:1 (o mapa gira 45° e é achatado).
   ===================================================================== */

// ---------- Configuração ----------
const LAPS = 3;
const NUM_CARS = 4;
const ROAD_HW = 140;            // meia largura da pista (asfalto + zebra)
const CURB_W = 9;               // largura da zebra
const WALL_T = 6;               // espessura do muro
const CROWD_W = 8;              // largura da faixa da torcida
// No ASCII, uma faixa mais fina que 1 linha de caracteres pode cair entre duas linhas e sumir num trecho inteiro.
// Por isso o muro e a torcida nunca ficam mais finos que ~1 linha de caracteres (recalculado a cada zoom/resize).
let WALL_EFF=WALL_T, CROWD_EFF=CROWD_W;
const SPACING = 6;              // distância entre pontos da linha central
const FONT = '"DejaVu Sans Mono","Liberation Mono",Menlo,Consolas,monospace';

const CTRL = [[0,0],[900,-60],[1500,-300],[2100,-100],[2300,400],[1950,850],[1400,800],
              [1150,1100],[1350,1450],[1000,1800],[200,1550],[-250,1000],[-150,450]];

const cv = document.getElementById('c');
const ctx = cv.getContext('2d',{alpha:false});     // tela opaca: composição mais barata

// ---------- Utilidades ----------
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[(Math.random()*a.length)|0];
function angDiff(a,b){ let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; }
function hash(x,y){ let h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }

// ---------- Tela / glifos ----------
let ZOOM_CSS=0.57;              // distância da câmera em pixels CSS (maior = mais perto). Teclas , e .
let ZOOM=ZOOM_CSS;              // o mesmo em pixels do canvas (ZOOM_CSS x DPR) — recalculado em resize()
// Projeção isométrica 2:1: o mapa gira 45° e é achatado pela metade.
let K=ZOOM*Math.SQRT1_2;
let GS=ZOOM*CAR_SPRITE.scale/4.4;   // fator dos brilhos (acompanha o tamanho do carro na tela)
const SPD=1.50;                 // escala de velocidade: carros grandes na tela pedem movimento mais lento
const ZOOM_PADRAO=ZOOM_CSS;
function setZoom(z){ ZOOM_CSS=Math.max(0.5,Math.min(3,z)); resize(); logMsg(t('msgZoom',ZOOM_CSS.toFixed(2))+(Math.abs(ZOOM_CSS-ZOOM_PADRAO)<0.01?'  '+t('zoomDefault'):'')); }
const isoX=(x,y)=>(x-y)*K;
const isoY=(x,y)=>(x+y)*K*0.5;
// ---- Qualidade: tecla Q alterna. Cai sozinha se o jogo ficar lento. ----
const QUALITY=[
  { name:'q0',    fs:5, dpr:2,   part:700, glow:true,  vig:true  },
  { name:'q1',    fs:6, dpr:1.5, part:350, glow:true,  vig:true  },
  { name:'q2',    fs:8, dpr:1,   part:150, glow:false, vig:false },
];
let qIdx=1;
function setQuality(i){ qIdx=Math.max(0,Math.min(QUALITY.length-1,i)); FS_BASE=QUALITY[qIdx].fs; resize(); logMsg(t('msgQuality',t(QUALITY[qIdx].name))); }
let FS_BASE=QUALITY[qIdx].fs;                  // tamanho da fonte do mundo (menor = mais densidade ASCII)
let DPR=1, W=0, H=0, FS=9, CW=6, CH=11;          // fonte do mundo (terreno)
let SFS=6, SCW=4, SCH=7;                          // fonte fina dos sprites (mais detalhe)
let HFS=13, HCW=8, HCH=16, vigCv=null;   // métricas do HUD
const glyphCache = new Map();

function glyph(ch, fg, bg){
  const key = ch+'|'+fg+'|'+(bg||'');
  let g = glyphCache.get(key);
  if(g) return g;
  g = document.createElement('canvas');
  g.width = CW; g.height = CH;
  const x = g.getContext('2d');
  if(bg){ x.fillStyle = bg; x.fillRect(0,0,CW,CH); }
  if(ch !== ' '){
    x.font = `bold ${FS}px ${FONT}`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = fg;
    x.fillText(ch, CW/2, CH/2+1);
  }
  glyphCache.set(key, g);
  return g;
}
function putGlyph(ch, fg, sx, sy, bg){ // sx,sy = centro do glifo em px de tela
  ctx.drawImage(glyph(ch,fg,bg||null), Math.round(sx-CW/2), Math.round(sy-CH/2));
}

function sglyph(ch, fg){                       // glifo pequeno (sprites), fundo transparente
  const key='s|'+ch+'|'+fg;
  let g=glyphCache.get(key); if(g) return g;
  g=document.createElement('canvas'); g.width=SCW; g.height=SCH;
  const x=g.getContext('2d');
  x.font=`bold ${SFS}px ${FONT}`; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle=fg;
  x.fillText(ch,SCW/2,SCH/2+0.5);
  glyphCache.set(key,g); return g;
}
function putS(ch,fg,cx,cy){ ctx.drawImage(sglyph(ch,fg),Math.round(cx-SCW/2),Math.round(cy-SCH/2)); }

// ---------- Áudio (WebAudio minimalista) ----------
let AC=null, muted=false, engOsc=null, engGain=null, noiseBuf=null;
function ensureAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate*0.6, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
    engOsc = AC.createOscillator(); engOsc.type='sawtooth'; engOsc.frequency.value=60;
    const lp = AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=320;
    engGain = AC.createGain(); engGain.gain.value=0;
    engOsc.connect(lp); lp.connect(engGain); engGain.connect(AC.destination); engOsc.start();
  }catch(e){ AC=null; }
}
function tone(type,f0,f1,dur,vol){
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),AC.currentTime+dur);
  g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+dur);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+dur+0.02);
}
function sfx(type, x, y){
  if(!AC || muted) return;
  let vol = 1;
  if(x !== undefined && player){ vol = clamp(1 - Math.hypot(x-player.x,y-player.y)/1000, 0, 1); if(vol<=0.02) return; }
  try{
    if(type==='boom'){
      const s=AC.createBufferSource(), g=AC.createGain(), f=AC.createBiquadFilter();
      s.buffer=noiseBuf; f.type='lowpass'; f.frequency.value=900; g.gain.value=0.5*vol;
      s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
    }
    else if(type==='missile') tone('sawtooth',900,180,0.3,0.12*vol);
    else if(type==='pick')    tone('square',500,1200,0.14,0.08*vol);
    else if(type==='mine')    tone('triangle',260,140,0.1,0.12*vol);
    else if(type==='nitro')   tone('sawtooth',150,700,0.5,0.1*vol);
    else if(type==='hit')     tone('square',160,60,0.12,0.1*vol);
    else if(type==='beep')    tone('sine',440,440,0.18,0.15);
    else if(type==='go')      tone('sine',880,880,0.45,0.18);
    else if(type==='lap')     tone('triangle',600,900,0.25,0.12);
  }catch(e){}
}

// ---------- Fonte grande 5x5 (títulos / contagem) ----------
const BIG = {
 'A':[" ### ","#   #","#####","#   #","#   #"],
 'C':[" ####","#    ","#    ","#    "," ####"],
 'E':["#####","#    ","#### ","#    ","#####"],
 'F':["#####","#    ","#### ","#    ","#    "],
 'G':[" ####","#    ","#  ##","#   #"," ####"],
 'H':["#   #","#   #","#####","#   #","#   #"],
 'I':["#####","  #  ","  #  ","  #  ","#####"],
 'K':["#   #","#  # ","###  ","#  # ","#   #"],
 'N':["#   #","##  #","# # #","#  ##","#   #"],
 'O':[" ### ","#   #","#   #","#   #"," ### "],
 'R':["#### ","#   #","#### ","#  # ","#   #"],
 'S':[" ####","#    "," ### ","    #","#### "],
 '1':["  #  "," ##  ","  #  ","  #  "," ### "],
 '2':[" ### ","#   #","  ## "," #   ","#####"],
 '3':["#### ","    #"," ### ","    #","#### "],
 '!':["  #  ","  #  ","  #  ","     ","  #  "],
 "'":["  #  ","  #  ","     ","     ","     "],
 ' ':["     ","     ","     ","     ","     "]
};
function bigWidth(str,sx){ return str.length*6*sx - sx; }
function drawBig(str, cx, cy, sx, sy, colorFn){
  // cx,cy = coluna/linha (em células do HUD) do canto superior esquerdo
  let x0 = cx;
  ctx.font=`bold ${HFS}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const chr of str){
    const rows = BIG[chr] || BIG[' '];
    for(let r=0;r<5;r++) for(let c=0;c<5;c++) if(rows[r][c]==='#'){
      for(let yy=0;yy<sy;yy++) for(let xx=0;xx<sx;xx++){
        const col = x0 + c*sx + xx, row = cy + r*sy + yy;
        ctx.fillStyle = colorFn(r*sy+yy, 5*sy);
        ctx.fillText('#', col*HCW+HCW/2, row*HCH+HCH/2);
      }
    }
    x0 += 6*sx;
  }
}

// ---------- Pista ----------
let track=[], N=0, DS=6;      // DS = distância média entre pontos do traçado

const cr = (a,b,c,d,t) => 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);

function buildTrack(){
  const P=CTRL, n=P.length, dense=[];
  for(let i=0;i<n;i++){
    const p0=P[(i-1+n)%n], p1=P[i], p2=P[(i+1)%n], p3=P[(i+2)%n];
    for(let s=0;s<40;s++){ const t=s/40; dense.push([cr(p0[0],p1[0],p2[0],p3[0],t), cr(p0[1],p1[1],p2[1],p3[1],t)]); }
  }
  const m=dense.length, cum=[0];
  for(let i=1;i<=m;i++){ const a=dense[i-1], b=dense[i%m]; cum[i]=cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]); }
  const L=cum[m]; N=Math.round(L/SPACING);
  track=[]; let j=0;
  for(let k=0;k<N;k++){
    const s=k*L/N; while(cum[j+1]<s) j++;
    const f=(s-cum[j])/(cum[j+1]-cum[j]); const a=dense[j], b=dense[(j+1)%m];
    track.push({x:a[0]+(b[0]-a[0])*f, y:a[1]+(b[1]-a[1])*f});
  }
  for(let k=0;k<N;k++){
    const a=track[(k-1+N)%N], b=track[(k+1)%N];
    const ang=Math.atan2(b.y-a.y,b.x-a.x), p=track[k];
    p.ang=ang; p.tx=Math.cos(ang); p.ty=Math.sin(ang); p.nx=-p.ty; p.ny=p.tx;
  }
  for(let k=0;k<N;k++) track[k].curv = Math.abs(angDiff(track[(k+12)%N].ang, track[k].ang));
  // A largada fica no trecho mais reto: procura onde há menos curva entre a grade (antes da linha)
  // e a aceleração (depois dela) e gira o índice do traçado para a linha cair ali.
  const BEFORE=45, AFTER=90;
  let bestK=0, bestC=1e9;
  for(let k=0;k<N;k++){
    let mx=0;
    for(let o=-BEFORE;o<=AFTER;o++) mx=Math.max(mx,track[(k+o+N)%N].curv);
    if(mx<bestC){ bestC=mx; bestK=k; }
  }
  track=track.slice(bestK).concat(track.slice(0,bestK));
  let len=0; for(let k=0;k<N;k++){ const a=track[k], b=track[(k+1)%N]; len+=Math.hypot(b.x-a.x,b.y-a.y); }
  DS=len/N;
}

// ---------- Terreno isométrico em BLOCOS (gerados sob demanda) ----------
function vnoise(x,y){
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const a=hash(xi,yi), b=hash(xi+1,yi), c=hash(xi,yi+1), d=hash(xi+1,yi+1);
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}

// O mapa é uma grade infinita de células de tela (CW x CH) no espaço PROJETADO.
// Ela é dividida em blocos de CHK_C x CHK_R células; cada bloco vira um canvas
// só quando aparece (ou está perto de aparecer) na tela.
const CHK_C=96, CHK_R=48;
const chunks=new Map();                         // chave -> { cv, ops[], used }
let chunkFrame=0, baseX=0, baseY=0;
const chunkKey=(cx,cy)=>(cx+4000)*8192+(cy+4000);
function terrainReset(){ chunks.clear(); pendQ=[]; }

// Linha de largada: faixa branca com xadrez, desenhada como polígonos projetados em isométrico (bordas nítidas,
// sem serrilhado da grade de caracteres). É pintada em cada bloco que ela cruza; as coordenadas são as do mundo.
// Zebra, linha lateral e pontilhada central como polígonos isométricos: nítidos em qualquer zoom
// (faixas finas em caracteres somem entre duas linhas da grade quando o zoom está afastado).
function drawTrackDecals(g,offX,offY){
  const W0=CHK_C*CW, H0=CHK_R*CH, m=(ROAD_HW+12)*ZOOM*1.5;
  const A=ROAD_HW-CURB_W, lineIn=A-14, lineOut=A-9;
  const pr=(p,l)=>{ const x=p.x+p.nx*l, y=p.y+p.ny*l; return [isoX(x,y)-offX,isoY(x,y)-offY]; };
  const band=(p,q,l0,l1,col)=>{
    const a=pr(p,l0), b=pr(q,l0), c=pr(q,l1), d=pr(p,l1);
    g.fillStyle=col; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.lineTo(c[0],c[1]); g.lineTo(d[0],d[1]); g.closePath(); g.fill();
  };
  for(let k=0;k<N;k+=2){
    const p=track[k], q=track[(k+2)%N];
    const sx=isoX(p.x,p.y)-offX, sy=isoY(p.x,p.y)-offY;
    if(sx<-m||sx>W0+m||sy<-m||sy>H0+m) continue;
    const arc=(k>N/2?k-N:k)*DS, red=(((Math.floor(arc/12))%2)+2)%2===1;
    for(const s of [-1,1]){
      band(p,q,s*A,s*ROAD_HW,red?'#d63b34':'#f0f0f5');          // zebra (listras de ~12 unidades)
      band(p,q,s*lineIn,s*lineOut,'#cfd4e2');                  // linha lateral
    }
    if((((Math.floor(arc/24))%2)+2)%2===0) band(p,q,-2.5,2.5,'#e8c547');   // pontilhada central
  }
}

// Muro como faixa contínua em polígonos isométricos: acompanha a curva, é fino e nítido em qualquer zoom.
// Cada trecho é um quadrilátero no chão (face escura) mais o mesmo quadrilátero deslocado para cima (topo claro);
// o que sobra da face aparece como a lateral do muro. Os trechos são desenhados do mais longe ao mais perto.
function drawWalls(g,offX,offY){
  const W0=CHK_C*CW, H0=CHK_R*CH, m=(ROAD_HW+30)*ZOOM*1.5, lift=TERRAIN.wallPx;
  const a=ROAD_HW+1, b=ROAD_HW+TERRAIN.wallWidth;
  const pr=(p,l)=>{ const x=p.x+p.nx*l, y=p.y+p.ny*l; return [isoX(x,y)-offX,isoY(x,y)-offY]; };
  const segs=[];
  for(let k=0;k<N;k+=2){
    const p=track[k], sx=isoX(p.x,p.y)-offX, sy=isoY(p.x,p.y)-offY;
    if(sx<-m||sx>W0+m||sy<-m||sy>H0+m) continue;
    segs.push([sy,k,-1],[sy,k,1]);
  }
  segs.sort((u,v)=>u[0]-v[0]);                                   // mais longe (y menor) primeiro
  g.lineJoin='round'; g.lineWidth=0.8;
  const poly=(pts,col)=>{ g.fillStyle=col; g.strokeStyle=col; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<4;i++) g.lineTo(pts[i][0],pts[i][1]); g.closePath(); g.fill(); g.stroke(); };
  for(const [,k,s] of segs){
    const p=track[k], q=track[(k+2)%N];
    const A=pr(p,s*a), B=pr(q,s*a), C=pr(q,s*b), D=pr(p,s*b);
    poly([A,B,C,D],TERRAIN.wallFaceColor);                                         // face (no chão)
    const arc=(k>N/2?k-N:k)*DS, tone=(((Math.floor(arc/36))%2)+2)%2;
    poly([[A[0],A[1]-lift],[B[0],B[1]-lift],[C[0],C[1]-lift],[D[0],D[1]-lift]],TERRAIN.wallTopColors[tone]);   // topo (levantado)
  }
}

function drawStartDecal(g,offX,offY){
  const p=track[0], H=TERRAIN.startHalf, B=TERRAIN.startBorder, Q=TERRAIN.startSq, half=ROAD_HW-CURB_W;
  const proj=(a,l)=>{ const x=p.x+p.tx*a+p.nx*l, y=p.y+p.ty*a+p.ny*l; return [isoX(x,y)-offX,isoY(x,y)-offY]; };
  // fora deste bloco? (testa os 4 cantos da faixa inteira)
  const W0=CHK_C*CW, H0=CHK_R*CH, cs=[proj(-H,-half),proj(H,-half),proj(H,half),proj(-H,half)];
  if(Math.max(...cs.map(c=>c[0]))<-2||Math.min(...cs.map(c=>c[0]))>W0+2||Math.max(...cs.map(c=>c[1]))<-2||Math.min(...cs.map(c=>c[1]))>H0+2) return;
  const quad=(a0,a1,l0,l1,col)=>{
    g.fillStyle=col; g.beginPath();
    [proj(a0,l0),proj(a1,l0),proj(a1,l1),proj(a0,l1)].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
    g.closePath(); g.fill();
  };
  quad(-H,-H+B,-half,half,'#f2f2f2'); quad(H-B,H,-half,half,'#f2f2f2');       // bordas brancas
  const ncols=Math.ceil(2*half/Q), inner0=-H+B;
  for(let r=0;r<2;r++) for(let c=0;c<ncols;c++){                                // xadrez: 2 fileiras
    const a0=inner0+r*Q, l0=-half+c*Q, l1=Math.min(half,l0+Q);
    quad(a0,a0+Q,l0,l1,((r+c)&1)?'#f2f2f2':'#050507');
  }
}

// cor CSS ("#rrggbb" ou "rgb(r,g,b)") -> inteiro RGBA para escrever direto no ImageData
const colorCache=new Map();
function cssToU32(s){
  let v=colorCache.get(s); if(v!==undefined) return v;
  let r,g,b;
  if(s.charCodeAt(0)===35){ const n=parseInt(s.length===4?s[1]+s[1]+s[2]+s[2]+s[3]+s[3]:s.slice(1),16); r=n>>16&255; g=n>>8&255; b=n&255; }
  else { const m=s.match(/\d+/g); r=+m[0]; g=+m[1]; b=+m[2]; }
  v=((255<<24)|(b<<16)|(g<<8)|r)>>>0;
  if(colorCache.size>20000) colorCache.clear();
  colorCache.set(s,v); return v;
}

// Espessura mínima do muro e da torcida POR TRECHO. Uma célula de caractere (CW x CH) "enxerga" a faixa conforme a
// orientação dela na tela: faixa horizontal precisa de ~1 linha (CH), faixa vertical só de ~1 coluna (CW, bem mais fina).
let wallTk=null, crowdTk=null;
const WALL_COVER=0.3;
const CROWD_ON=false;            // true = liga a torcida atrás do muro (faixa de cabeças e corpos coloridos)
const wallBand=k=>k>=0?wallTk[k]:WALL_EFF;
function updateSideMetrics(){
  wallTk=new Float32Array(N); crowdTk=new Float32Array(N);
  let mw=WALL_T, mc=CROWD_ON?CROWD_W:0;
  for(let k=0;k<N;k++){
    const p=track[k];
    const ux=(p.tx-p.ty)*K, uy=(p.tx+p.ty)*K*0.5, vx=(p.nx-p.ny)*K, vy=(p.nx+p.ny)*K*0.5;   // ao longo e de lado, em px de tela por unidade
    const ul=Math.hypot(ux,uy)||1;
    const perp=Math.abs(ux*vy-uy*vx)/ul;                        // espessura na tela (perpendicular à faixa) por unidade lateral
    const need=(Math.abs(uy)/ul)*CW+(Math.abs(ux)/ul)*CH;       // o que uma célula cobre na perpendicular da faixa
    const tReq=need/Math.max(perp,1e-3);
    wallTk[k]=Math.max(WALL_T,tReq*WALL_COVER);                 // fração do mínimo teórico (1 = nunca quebra; menor = mais fino, mas pode tracejar em trechos horizontais)
    crowdTk[k]=CROWD_ON?Math.max(CROWD_W,tReq*0.4):0;
    if(wallTk[k]>mw) mw=wallTk[k]; if(crowdTk[k]>mc) mc=crowdTk[k];
  }
  WALL_EFF=mw; CROWD_EFF=mc;                                    // máximos: só para raios de busca
}

function* buildChunkGen(cx,cy){
  const LIFT=1;                                         // linhas extras abaixo do bloco (o topo do muro sobe só alguns PIXELS, não linhas inteiras)
  const LIFTPX=Math.max(1,Math.min(CH-1,TERRAIN.wallPx));
  const TR=TERRAIN.tree;
  const c0=cx*CHK_C, r0=cy*CHK_R;
  // região expandida: sombras/copas de árvore e muros cruzam as bordas do bloco
  const EX=Math.ceil(TR.unit*4.2/CW)+2, UP=18, DN=Math.ceil((TR.unit*3.2+TR.liftPx)/CH)+LIFT+3;
  const rc0=c0-EX, rr0=r0-UP, RW=CHK_C+2*EX, RH=CHK_R+UP+DN;
  // distância ao traçado: calculada só nas células de posição par (grade 1/2 x 1/2) a partir de 1 ponto sim, 1 não;
  // as demais são interpoladas. O erro fica abaixo de 1 célula e o custo cai ~8x.
  const cd=new Float32Array(RW*RH).fill(1e9), ck=new Int32Array(RW*RH).fill(-1), cl=new Float32Array(RW*RH), ca=new Float32Array(RW*RH);
  const Rw=ROAD_HW+WALL_EFF+40, rxc=Rw*ZOOM/CW+2, ryc=Rw*ZOOM*0.5/CH+2, inv=1/(2*K);
  for(let k=0;k<N;k+=2){
    if((k&63)===0 && performance.now()>chunkDeadline) yield;
    const p=track[k], pc=isoX(p.x,p.y)/CW, pr=isoY(p.x,p.y)/CH;
    if(pc+rxc<rc0||pc-rxc>rc0+RW||pr+ryc<rr0||pr-ryc>rr0+RH) continue;
    const ax0=Math.max(rc0,Math.floor(pc-rxc)), bx=Math.min(rc0+RW-1,Math.ceil(pc+rxc));
    const ay0=Math.max(rr0,Math.floor(pr-ryc)), by=Math.min(rr0+RH-1,Math.ceil(pr+ryc));
    const ax=ax0+((ax0-rc0)&1), ay=ay0+((ay0-rr0)&1);              // alinha às posições pares da região
    for(let ty=ay;ty<=by;ty+=2){
      const pY=(ty+0.5)*CH, row=(ty-rr0)*RW-rc0;
      for(let tx=ax;tx<=bx;tx+=2){
        const pX=(tx+0.5)*CW;
        const wx=(pX+2*pY)*inv, wy=(2*pY-pX)*inv;
        const d=Math.hypot(wx-p.x,wy-p.y), i=row+tx;
        if(d<cd[i]){ cd[i]=d; ck[i]=k; cl[i]=(wx-p.x)*p.nx+(wy-p.y)*p.ny;
          ca[i]=(k>N/2?k-N:k)*DS+((wx-p.x)*p.tx+(wy-p.y)*p.ty); }          // distância ao longo da pista a partir da largada (com sinal)
      }
    }
  }
  const dist=new Float32Array(RW*RH), idx=new Int32Array(RW*RH), lat=new Float32Array(RW*RH), arc=new Float32Array(RW*RH);
  const maxE=(RW-1)&~1, maxEy=(RH-1)&~1;
  for(let y=0;y<RH;y++){
    const ya=y&~1, yb=Math.min(ya+2,maxEy), fy=(y-ya)*0.5;
    for(let x=0;x<RW;x++){
      const xa=x&~1, xb=Math.min(xa+2,maxE), fx=(x-xa)*0.5, i=y*RW+x;
      const i00=ya*RW+xa, i10=ya*RW+xb, i01=yb*RW+xa, i11=yb*RW+xb;
      if(fx===0&&fy===0){ dist[i]=cd[i00]; idx[i]=ck[i00]; lat[i]=cl[i00]; arc[i]=ca[i00]; continue; }
      const d00=cd[i00], d10=cd[i10], d01=cd[i01], d11=cd[i11];
      const mn=Math.min(d00,d10,d01,d11);
      if(Math.max(d00,d10,d01,d11)>1e8){ dist[i]=mn; }                          // borda da região de busca
      else dist[i]=(d00*(1-fx)+d10*fx)*(1-fy)+(d01*(1-fx)+d11*fx)*fy;
      idx[i]=mn===d00?ck[i00]:mn===d10?ck[i10]:mn===d01?ck[i01]:ck[i11];
      lat[i]=(cl[i00]*(1-fx)+cl[i10]*fx)*(1-fy)+(cl[i01]*(1-fx)+cl[i11]*fx)*fy;
      arc[i]=Math.max(d00,d10,d01,d11)>1e8 ? (mn===d00?ca[i00]:mn===d10?ca[i10]:mn===d01?ca[i01]:ca[i11])
            : (ca[i00]*(1-fx)+ca[i10]*fx)*(1-fy)+(ca[i01]*(1-fx)+ca[i11]*fx)*fy;
    }
  }
  const R=(tx,ty)=>(ty-rr0)*RW+(tx-rc0);
  // "Rasterização conservadora": toda amostra do traçado força a célula que contém o centro da faixa do muro (nos dois lados),
  // então o muro vira uma linha contínua de células mesmo quando a faixa é mais fina que uma célula (nunca some no ASCII).
  const forced=new Set(), tmid=ROAD_HW+WALL_T*0.5;
  for(let k=0;k<(TERRAIN.vectorWalls?0:N);k++){
    const p=track[k];
    for(const s of [-1,1]){
      const x=p.x+p.nx*s*tmid, y=p.y+p.ny*s*tmid;
      const fx=Math.floor(isoX(x,y)/CW), fy=Math.floor(isoY(x,y)/CH);
      if(fx>=rc0&&fx<rc0+RW&&fy>=rr0&&fy<rr0+RH) forced.add((fy-rr0)*RW+(fx-rc0));
    }
  }
  const isWall=(tx,ty)=>{ const i=R(tx,ty); if(forced.has(i)) return true; const d=dist[i], k=idx[i]; return d>=ROAD_HW&&d<ROAD_HW+(k>=0?wallTk[k]:WALL_EFF); };

  // estilo das células do bloco (+ LIFT linhas abaixo, de onde vêm os topos dos muros)
  const LR=CHK_R+LIFT, CHS=new Array(CHK_C*LR), FG=new Array(CHK_C*LR), BG=new Array(CHK_C*LR), walls=new Map();
  for(let r=0;r<LR;r++){
    if(performance.now()>chunkDeadline) yield;
    const ty=r0+r, pY=(ty+0.5)*CH;
    for(let c=0;c<CHK_C;c++){
      const tx=c0+c, pX=(tx+0.5)*CW, ri=R(tx,ty), li=r*CHK_C+c;
      const wx=(pX+2*pY)*inv, wy=(2*pY-pX)*inv, kk=idx[ri], near=dist[ri]<ROAD_HW+WALL_EFF+CROWD_W+6;
      const t=TERRAIN.tile({d:(forced.has(ri)&&!(dist[ri]>=ROAD_HW&&dist[ri]<ROAD_HW+wallBand(kk)))?ROAD_HW+1:dist[ri],k:kk,lat:lat[ri],arc:arc[ri],dch:kk>=0?dirTab[kk]:'-',h:hash(tx,ty),h2:hash(tx*7+3,ty*11+5),
        n1:vnoise(wx/110,wy/110)*0.65+vnoise(wx/55+7,wy/55)*0.35,
        n2:near?vnoise(wx/38+50,wy/38):0.3,n3:near?vnoise(wx/11+9,wy/11):0.5,   // ruído fino só perto da pista
        tx,ty,N,ROAD_HW,WALL_T:kk>=0?wallTk[kk]:WALL_EFF,CURB_W,CROWD_W:kk>=0?crowdTk[kk]:CROWD_EFF});
      if(t.kind==='wall'){ CHS[li]=t.face.ch; FG[li]=t.face.fg; BG[li]=t.face.bg; walls.set(li,t); }
      else { CHS[li]=t.ch; FG[li]=t.fg; BG[li]=t.bg; }
    }
  }

  // árvores: sombra no chão, copa elevada
  const far=ROAD_HW+WALL_EFF+70, dens=TR.density*CW*CH/90, liftRows=Math.round(TR.liftPx/CH);
  const trees=[];
  for(let ty=rr0;ty<rr0+RH;ty++) for(let tx=rc0;tx<rc0+RW;tx++){
    if(dist[R(tx,ty)]>far && hash(tx*13+7,ty*17+3)<dens) trees.push([tx,ty,1+((hash(tx,ty*5)*3)|0)]);
  }
  for(const pass of [1]) for(const [tx,ty,r] of trees){          // só a copa (sem sombra no chão)
    const rp=(r+0.8)*TR.unit, rows=Math.ceil(rp*0.7/CH)+3, cols=Math.ceil(rp/CW)+4;
    const cy0=pass?ty-liftRows:ty;
    for(let dy=-rows;dy<=rows;dy++) for(let dx=-cols;dx<=cols;dx++){
      const X=tx+dx, Y=cy0+dy;
      if(X<c0||X>=c0+CHK_C||Y<r0||Y>=r0+LR) continue;
      if(dist[R(X,Y)]<=ROAD_HW+WALL_EFF+30) continue;
      const li=(Y-r0)*CHK_C+(X-c0);
      if(pass===0){
        const px=dx*CW-rp*0.55, py=dy*CH-rp*0.4;
        if((px/rp)**2+(py/(rp*0.7))**2<1){ BG[li]=TR.shadowBg; if(CHS[li]!==' ') FG[li]=TR.shadowFg; }
      } else {
        const e=(dx*CW/rp)**2+(dy*CH/(rp*0.7))**2;
        if(e<1){
          const s=clamp(1-e*0.55-((dx*CW+dy*CH*1.2)/rp)*0.12,0.1,1);
          const c=TR.canopy(s,hash(X,Y)); CHS[li]=c.ch; FG[li]=c.fg; BG[li]=c.bg;
        }
      }
    }
  }

  // canvas do bloco: chão
  const cv=document.createElement('canvas'); cv.width=CHK_C*CW; cv.height=CHK_R*CH;
  const g=cv.getContext('2d');
  g.font=`bold ${FS}px ${FONT}`; g.textAlign='center'; g.textBaseline='middle';
  const paint=(c,r,ch,fg,bg,dy=0)=>{
    g.fillStyle=bg; g.fillRect(c*CW,r*CH+dy,CW,CH);
    if(ch!==' '){ g.fillStyle=fg; g.fillText(ch,c*CW+CW/2,r*CH+CH/2+1+dy); }
  };
  {                                                       // fundos de todas as células de uma vez (ImageData)
    const wpx=CHK_C*CW, id=g.createImageData(wpx,CHK_R*CH), u32=new Uint32Array(id.data.buffer);
    for(let r=0;r<CHK_R;r++) for(let c=0;c<CHK_C;c++){
      const col=cssToU32(BG[r*CHK_C+c]), x0=c*CW;
      for(let yy=0;yy<CH;yy++){ const o=(r*CH+yy)*wpx+x0; for(let xx=0;xx<CW;xx++) u32[o+xx]=col; }
    }
    g.putImageData(id,0,0);
  }
  for(let r=0;r<CHK_R;r++){                               // depois só os caracteres
    if(performance.now()>chunkDeadline) yield;
    for(let c=0;c<CHK_C;c++){
      const li=r*CHK_C+c, ch=CHS[li];
      if(ch!==' '){ g.fillStyle=FG[li]; g.fillText(ch,c*CW+CW/2,r*CH+CH/2+1); }
    }
    if((r&7)===7) flushCanvas(cv);
  }

  drawTrackDecals(g,c0*CW,r0*CH);                         // zebra, linhas (vetoriais) por cima do asfalto
  if(TERRAIN.vectorWalls) drawWalls(g,c0*CW,r0*CH);       // muro (vetorial)
  drawStartDecal(g,c0*CW,r0*CH);                          // linha de largada (vetorial)

  // muros: o topo sobe LIFTPX pixels. Os que ficam ao sul da pista (mais perto da câmera)
  // também vão para a lista "ops", desenhada POR CIMA dos carros.
  const ops=[];
  for(let r=0;r<LR;r++){ if(performance.now()>chunkDeadline) yield; for(let c=0;c<CHK_C;c++){
    const t=walls.get(r*CHK_C+c); if(!t) continue;
    const tx=c0+c, ty=r0+r;
    // o topo é pintado LIFTPX pixels acima do chão: como a altura é menor que 1 linha, nunca sobra vão entre topo e face
    paint(c,r,t.top.ch,t.top.fg,t.top.bg,-LIFTPX);
    let j=ty-1, steps=0; while(steps<16 && isWall(tx,j)){ j--; steps++; }
    if(dist[R(tx,j)]<ROAD_HW){                             // muro ao sul da pista: também vai por cima dos carros
      if(r<CHK_R) ops.push(tx,ty,glyph(t.face.ch,t.face.fg,t.face.bg),0);
      ops.push(tx,ty,glyph(t.top.ch,t.top.fg,t.top.bg),-LIFTPX);
    }
  } }
  flushCanvas(cv);
  if(performance.now()>chunkDeadline) yield;
  let front=null;                                       // muros da frente num bitmap só (1 drawImage por bloco)
  if(ops.length){
    front=document.createElement('canvas'); front.width=CHK_C*CW; front.height=CHK_R*CH;
    const fg=front.getContext('2d');
    for(let i=0;i<ops.length;i+=4) fg.drawImage(ops[i+2],(ops[i]-c0)*CW,(ops[i+1]-r0)*CH+ops[i+3]);
    flushCanvas(front);
  }
  return { cv, front, used:chunkFrame };
}

// O canvas só executa os comandos de desenho quando é usado pela 1ª vez. Para o custo não cair no quadro em que o
// bloco aparece, forçamos a pintura aqui (dentro do orçamento da fatia), copiando 1 pixel dele para um canvas auxiliar.
const probeCtx=(()=>{ const c=document.createElement('canvas'); c.width=c.height=1; return c.getContext('2d'); })();
function flushCanvas(cv){ probeCtx.drawImage(cv,0,0,1,1,0,0,1,1); }

let chunkDeadline=Infinity;
// versão síncrona (usada ao começar a cena)
function buildChunk(cx,cy){ chunkDeadline=Infinity; const gen=buildChunkGen(cx,cy); let r; do{ r=gen.next(); }while(!r.done); return r.value; }
// versão em fatias: o trabalho é distribuído pelos quadros (orçamento em ms por quadro)
let pendQ=[];
function requestChunk(cx,cy,high){
  const key=chunkKey(cx,cy);
  if(chunks.has(key)) return;
  const i=pendQ.findIndex(p=>p.key===key);
  if(i>=0){ if(high&&i>0){ const [p]=pendQ.splice(i,1); pendQ.unshift(p); } return; }
  const p={key,gen:buildChunkGen(cx,cy)};
  if(high) pendQ.unshift(p); else pendQ.push(p);
}
function pumpChunks(ms){
  if(!pendQ.length) return;
  chunkDeadline=performance.now()+ms;
  while(pendQ.length && performance.now()<chunkDeadline){
    const p=pendQ[0]; let r;
    while(performance.now()<chunkDeadline && !(r=p.gen.next()).done){}
    if(r&&r.done){ r.value.used=chunkFrame; chunks.set(p.key,r.value); pendQ.shift(); }
  }
}

function getChunk(cx,cy,build){
  const key=chunkKey(cx,cy);
  let ch=chunks.get(key);
  if(!ch && build){ ch=buildChunk(cx,cy); chunks.set(key,ch); }
  if(ch) ch.used=chunkFrame;
  return ch;
}

// intervalo de blocos visíveis
function visibleChunks(){
  const wC=CHK_C*CW, hC=CHK_R*CH;
  const cpx=isoX(camX,camY), cpy=isoY(camX,camY);
  return { x0:Math.floor((cpx-W/2-8)/wC), x1:Math.floor((cpx+W/2+8)/wC),
           y0:Math.floor((cpy-H/2-8)/hC), y1:Math.floor((cpy+H/2+8)/hC) };
}
// gera já todos os blocos da tela (usado ao começar/trocar de cena)
function prewarmTerrain(){
  chunkFrame++;
  const v=visibleChunks();
  for(let cy=v.y0;cy<=v.y1;cy++) for(let cx=v.x0;cx<=v.x1;cx++) getChunk(cx,cy,true);
}

let prevCamPX=null, prevCamPY=null, camVelX=0, camVelY=0;     // velocidade da câmera (px por quadro, suavizada)
function drawTerrain(){
  chunkFrame++;
  camPX=isoX(camX,camY); camPY=isoY(camX,camY);
  if(prevCamPX!==null){ camVelX+=((camPX-prevCamPX)-camVelX)*0.1; camVelY+=((camPY-prevCamPY)-camVelY)*0.1; }
  prevCamPX=camPX; prevCamPY=camPY;
  baseX=Math.round(W/2+shakeX-camPX); baseY=Math.round(H/2+shakeY-camPY);
  const v=visibleChunks(), wC=CHK_C*CW, hC=CHK_R*CH;

  // região "necessária": o que está na tela + 1 bloco em volta + ~1,2 s à frente na direção do movimento
  let nx0=v.x0-1, nx1=v.x1+1, ny0=v.y0-1, ny1=v.y1+1;
  const lx=camVelX*72/wC, ly=camVelY*72/hC;
  if(lx>0.1) nx1+=Math.ceil(lx); else if(lx<-0.1) nx0-=Math.ceil(-lx);
  if(ly>0.1) ny1+=Math.ceil(ly); else if(ly<-0.1) ny0-=Math.ceil(-ly);

  visChunks.length=0;
  let missingVisible=0;
  const ahead=[];
  for(let cy=ny0;cy<=ny1;cy++) for(let cx=nx0;cx<=nx1;cx++){
    const vis=cx>=v.x0&&cx<=v.x1&&cy>=v.y0&&cy<=v.y1;
    const ch=getChunk(cx,cy,false);                      // (marca como usado)
    if(vis){
      if(ch){ ctx.drawImage(ch.cv,cx*wC+baseX,cy*hC+baseY); if(ch.front) visChunks.push(ch,cx*wC+baseX,cy*hC+baseY); }
      else { missingVisible++; requestChunk(cx,cy,true); ctx.fillStyle='#0a140d'; ctx.fillRect(cx*wC+baseX,cy*hC+baseY,wC,hC); }
    } else if(!ch){
      const dx=cx+0.5-((camPX+camVelX*72)/wC), dy=cy+0.5-((camPY+camVelY*72)/hC);
      ahead.push([dx*dx+dy*dy,cx,cy]);
    }
  }
  ahead.sort((p,q)=>p[0]-q[0]);
  for(const [,cx,cy] of ahead) requestChunk(cx,cy,false);   // os mais perto de onde o carro vai estar primeiro
  pumpChunks(missingVisible?14:(state==='title'||state==='countdown'?8:3));

  const limit=(nx1-nx0+1)*(ny1-ny0+1)+20;               // o cache acompanha o tamanho da tela
  if(chunks.size>limit){
    const old=[...chunks.entries()].sort((a,b)=>a[1].used-b[1].used).slice(0,chunks.size-limit+8);
    for(const [k] of old) chunks.delete(k);
  }
}
const visChunks=[];
function drawFront(){          // muros ao sul da pista: cobrem quem está atrás deles
  for(let i=0;i<visChunks.length;i+=3) ctx.drawImage(visChunks[i].front,visChunks[i+1],visChunks[i+2]);
}

// distância (no mundo) até a linha central da pista
function tileDistAt(x,y){
  let best=1e18;
  for(let k=0;k<N;k+=2){ const p=track[k], dx=x-p.x, dy=y-p.y, d=dx*dx+dy*dy; if(d<best) best=d; }
  return Math.sqrt(best);
}

// caractere de linha na direção (dx,dy) da tela:  -  \  |  /
function edgeDirChar(dx,dy){
  let deg=Math.atan2(dy,dx)*180/Math.PI; deg=((deg%180)+180)%180;
  if(deg<22.5||deg>=157.5) return '-';
  if(deg<67.5) return '\\';
  if(deg<112.5) return '|';
  return '/';
}
let dirTab=[];
function buildDirTab(){ dirTab=track.map(p=>edgeDirChar((p.tx-p.ty)*K,(p.tx+p.ty)*K*0.5)); }

// ---------- Estado do jogo ----------
let state='title';                // title | countdown | race | finish
let flashes=[], cars=[], player=null, missiles=[], mines=[], pickups=[], FX=[], floaters=[], logMsgs=[];
let camX=0, camY=0, shake=0, raceTime=0, countdown=0, finishedCount=0, paused=false, lastBeep=-1;
const keys={}, pressed={};

const CAR_DEFS = [
  {name:'VOCÊ',   color:'#00e5ff', skill:1.00},
  {name:'VIPER',  color:'#ff5252', skill:0.98},
  {name:'BRUTUS', color:'#ffd23f', skill:0.95},
  {name:'NOVA',   color:'#7dff6b', skill:0.97}
];

function placeOnTrack(c, idx, lane){
  const p=track[idx];
  c.x=p.x+p.nx*lane; c.y=p.y+p.ny*lane; c.a=p.ang; c.vx=c.vy=0; c.idx=idx;
}

function makeCar(i, slot){
  const d=CAR_DEFS[i];
  const c={ i, _name:d.name, get name(){ return this.isPlayer?t('you'):this._name; }, color:d.color, skill:d.skill, isPlayer:i===0, auto:i!==0,
    x:0,y:0,a:0,vx:0,vy:0,speed:0,hp:100,idx:0,lap:0,prog:0,dist:0,
    nitro:0,nitroCount:1,missiles:3,mines:2,cd:0,mcd:0,inv:0,dead:0,
    finished:false,place:0,finishTime:0,lane:rnd(-35,35),laneT:0,aiNitroT:rnd(2,6),flash:0 };
  placeOnTrack(c, (N-10-(slot%2)*9+N)%N, [-96,-32,32,96][slot]);   // 4 na largura da pista, em zigue-zague (os ímpares uns ~54 unidades atrás)
  c.prog=-N+c.idx;
  return c;
}

function buildPickups(){
  pickups=[];
  const types=['M','N','X','+','M','N','M','X','+'];
  for(let s=0;s<types.length;s++){
    const k=Math.floor((s+0.5)*N/types.length);
    for(const lane of [-85,0,85]){
      const p=track[k];
      pickups.push({x:p.x+p.nx*lane, y:p.y+p.ny*lane, type:types[s], cool:0});
    }
  }
}
const PICK_COL = {M:'#ff5555', N:'#33e0ff', X:'#ffa030', '+':'#55ff88'};
const pickName=k=>t({M:'pickM',N:'pickN',X:'pickX','+':'pickRepair'}[k]);

function resetRace(withPlayer){
  missiles=[]; mines=[]; FX=[]; flashes=[]; floaters=[]; logMsgs=[];
  finishedCount=0; raceTime=0; shake=0; lastBeep=-1;
  // jogador no fim do grid
  const slots=[2,0,1,3];                         // 4 carros lado a lado; o jogador sai na 3ª posição
  cars=[]; for(let i=0;i<NUM_CARS;i++) cars.push(makeCar(i, slots[i]));
  player=cars[0];
  player.auto=!withPlayer;
  buildPickups();
  camX=player.x; camY=player.y;
  prewarmTerrain();
}

function startRace(){
  resetRace(true);
  state='countdown'; countdown=3.99;
}

// ---------- Efeitos ----------
function fx(o){
  if(FX.length>QUALITY[qIdx].part) return;
  o.max=o.life; o.z=o.z||0; o.vz=o.vz||0; o.g=o.g||0; o.vx=o.vx||0; o.vy=o.vy||0;
  FX.push(o);
}
function explosion(x,y,big){
  flashes.push({x,y,life:0.4,max:0.4,r:big?130:70});
  const n=big?44:24;
  for(let i=0;i<n;i++){
    const a=rnd(0,Math.PI*2), s=rnd(40,big?330:220);
    fx({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:rnd(0,12),vz:rnd(60,300),g:520,life:rnd(0.4,0.95),
        ch:pick(['*','%','#','@','+','x']),col:pick(['#ffd23f','#ff8a2a','#ff4d2e','#fff2a8'])});
  }
  for(let i=0;i<(big?14:8);i++){
    const a=rnd(0,Math.PI*2), s=rnd(10,70);
    fx({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:rnd(0,10),vz:rnd(30,90),g:-20,life:rnd(0.8,1.6),
        ch:pick(['.','o','O']),col:pick(['#555','#777','#444'])});
  }
}
function sparks(x,y,n,col){
  for(let i=0;i<n;i++){
    const a=rnd(0,Math.PI*2), s=rnd(40,200);
    fx({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:rnd(0,8),vz:rnd(40,160),g:600,life:rnd(0.2,0.5),ch:pick(['*','.','`',"'"]),col:col||'#ffe27a'});
  }
}
function floater(x,y,text,color){ floaters.push({x,y,text,color,life:1.3,max:1.3}); }
function logMsg(t){ logMsgs.unshift({t,life:5}); if(logMsgs.length>4) logMsgs.pop(); }

// ---------- Dano ----------
function hurt(c, amt, src){
  if(c.dead>0 || c.inv>0) return;
  c.hp-=amt; c.flash=0.15;
  if(c===player) shake=Math.min(1,shake+amt/50);
  if(c.hp<=0){ c.hp=0; destroy(c, src); }
}
function destroy(c, src){
  c.dead=2.6; c.vx=c.vy=0; c.nitro=0;
  explosion(c.x,c.y,true); sfx('boom',c.x,c.y);
  if(c===player) shake=1;
  logMsg(src && src!==c ? (src===player ? t('youKilled',c.name) : c===player ? t('killedYou',src.name) : t('killed',src.name,c.name))
                        : (c===player ? t('youExploded') : t('exploded',c.name)));
}
function respawn(c){
  const p=track[c.idx];
  c.x=p.x; c.y=p.y; c.a=p.ang; c.vx=c.vy=0; c.hp=100; c.inv=2.4; c.dead=0;
}

// ---------- Armas ----------
function fireMissile(c){
  if(c.missiles<=0||c.cd>0||c.dead>0) return;
  c.missiles--; c.cd=0.35;
  const fxv=Math.cos(c.a), fyv=Math.sin(c.a);
  missiles.push({x:c.x+fxv*36,y:c.y+fyv*36,a:c.a,v:Math.max(560*SPD,c.speed+280*SPD),life:2.4,age:0,owner:c});
  sfx('missile',c.x,c.y);
}
function dropMine(c){
  if(c.mines<=0||c.mcd>0||c.dead>0) return;
  c.mines--; c.mcd=0.45;
  mines.push({x:c.x-Math.cos(c.a)*28,y:c.y-Math.sin(c.a)*28,arm:0.7,owner:c,t:0});
  sfx('mine',c.x,c.y);
}
function useNitro(c){
  if(c.nitroCount<=0||c.nitro>0||c.dead>0) return;
  c.nitroCount--; c.nitro=2.0; sfx('nitro',c.x,c.y);
}

function updateMissiles(dt){
  for(let i=missiles.length-1;i>=0;i--){
    const m=missiles[i]; m.age+=dt; m.life-=dt;
    let best=null, bd=1e9;
    for(const c of cars){
      if(c===m.owner||c.dead>0) continue;
      const dx=c.x-m.x, dy=c.y-m.y, d=Math.hypot(dx,dy);
      if(d<650 && Math.abs(angDiff(Math.atan2(dy,dx),m.a))<0.9 && d<bd){ bd=d; best=c; }
    }
    if(best){ const da=angDiff(Math.atan2(best.y-m.y,best.x-m.x),m.a); m.a+=clamp(da,-3.4*dt,3.4*dt); }
    m.x+=Math.cos(m.a)*m.v*dt; m.y+=Math.sin(m.a)*m.v*dt;
    fx({x:m.x-Math.cos(m.a)*8,y:m.y-Math.sin(m.a)*8,z:4,vz:20,vx:rnd(-10,10),vy:rnd(-10,10),life:0.45,ch:pick(['.',':','*']),col:pick(['#ffb347','#ff6a3d','#aaa'])});
    let boom=false;
    for(const c of cars){
      if(c.dead>0) continue;
      if(c===m.owner && m.age<0.25) continue;
      if(Math.hypot(c.x-m.x,c.y-m.y)<34){
        hurt(c,32,m.owner);
        c.vx+=Math.cos(m.a)*140*SPD; c.vy+=Math.sin(m.a)*140*SPD;
        boom=true; break;
      }
    }
    if(!boom && (m.life<=0 || tileDistAt(m.x,m.y)>ROAD_HW+2)) boom=true;
    if(boom){ explosion(m.x,m.y,false); sfx('boom',m.x,m.y); missiles.splice(i,1); }
  }
}

function updateMines(dt){
  for(let i=mines.length-1;i>=0;i--){
    const m=mines[i]; m.t+=dt; m.arm-=dt;
    if(m.arm>0) continue;
    for(const c of cars){
      if(c.dead>0) continue;
      if(c===m.owner && m.t<1.8) continue;
      if(Math.hypot(c.x-m.x,c.y-m.y)<34){
        explosion(m.x,m.y,true); sfx('boom',m.x,m.y);
        for(const o of cars){
          const d=Math.hypot(o.x-m.x,o.y-m.y);
          if(d<110 && o.dead<=0){
            hurt(o, 46*(1-d/150), m.owner);
            const nx=(o.x-m.x)/(d||1), ny=(o.y-m.y)/(d||1);
            o.vx+=nx*220*SPD; o.vy+=ny*220*SPD;
          }
        }
        mines.splice(i,1); break;
      }
    }
  }
}

// ---------- Progresso na pista ----------
function locate(c){
  let best=1e18, bi=c.idx;
  for(let o=-40;o<=40;o++){
    const k=(c.idx+o+N)%N, p=track[k], dx=c.x-p.x, dy=c.y-p.y, d2=dx*dx+dy*dy;
    if(d2<best){ best=d2; bi=k; }
  }
  const old=c.idx;
  if(old>N*0.75 && bi<N*0.25) c.lap++;
  else if(old<N*0.25 && bi>N*0.75) c.lap--;
  c.idx=bi; c.dist=Math.sqrt(best);
  c.prog=(c.lap-1)*N+bi;
  if(c.lap>LAPS && !c.finished){
    c.finished=true; c.place=++finishedCount; c.finishTime=raceTime; c.auto=true;
    logMsg(c===player ? t('youFinished',I18N.ord(c.place)) : t('finishedLog',c.name,I18N.ord(c.place)));
    if(c===player && state==='race'){ state='finish'; }
  } else if(old>N*0.75 && bi<N*0.25 && c===player && c.lap<=LAPS){
    floater(c.x,c.y,t('lap',c.lap,LAPS),'#ffffff'); sfx('lap');
  }
}

// ---------- Física do carro ----------
function driveCar(c, dt, steer, thr, brake){
  const boost = c.nitro>0;
  const top = 430*SPD*(c.isPlayer?1:c.skill*c.rubber||1) * (boost?1.5:1);
  c.a += steer * 3.0 * clamp(Math.abs(c.vxf||0)/140,0,1) / (1+Math.abs(c.vxf||0)/900) * ((c.vxf||0)<0?-1:1) * dt;
  const fxv=Math.cos(c.a), fyv=Math.sin(c.a);
  let vf=c.vx*fxv+c.vy*fyv, vl=-c.vx*fyv+c.vy*fxv;
  if(thr>0) vf+=thr*(boost?820:400)*SPD*dt;
  if(brake>0){ if(vf>0) vf-=760*SPD*dt; else vf-=300*SPD*dt; vf=Math.max(vf,-130*SPD); }
  vf-=vf*(thr>0?0.2:0.9)*dt;
  if(vf>top) vf-=(vf-top)*4*dt;
  vl*=Math.exp(-6.5*dt);
  c.vxf=vf;
  c.vx=fxv*vf-fyv*vl; c.vy=fyv*vf+fxv*vl;
  c.x+=c.vx*dt; c.y+=c.vy*dt;
  c.speed=Math.hypot(c.vx,c.vy);
}

function wallCollide(c, dt){
  locate(c);
  const limit=ROAD_HW-22;
  if(c.dist>limit){
    const p=track[c.idx], dx=c.x-p.x, dy=c.y-p.y, d=c.dist||1, nx=dx/d, ny=dy/d;
    c.x=p.x+nx*limit; c.y=p.y+ny*limit;
    const vn=c.vx*nx+c.vy*ny;
    if(vn>0){
      c.vx-=1.35*vn*nx; c.vy-=1.35*vn*ny; c.vx*=0.94; c.vy*=0.94;
      if(vn>170*SPD) hurt(c,(vn-170*SPD)*0.07,null);
      if(vn>60*SPD){ sparks(c.x+nx*10,c.y+ny*10,Math.min(10,vn/40|0),'#ffe27a'); if(c===player) sfx('hit'); }
    }
  }
}

function carCollisions(){
  for(let i=0;i<cars.length;i++) for(let j=i+1;j<cars.length;j++){
    const a=cars[i], b=cars[j];
    if(a.dead>0||b.dead>0) continue;
    const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy);
    if(d<48 && d>0.001){
      const nx=dx/d, ny=dy/d, ov=48-d;
      a.x-=nx*ov/2; a.y-=ny*ov/2; b.x+=nx*ov/2; b.y+=ny*ov/2;
      const vn=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(vn>0){
        const j2=vn*0.85;
        a.vx-=nx*j2; a.vy-=ny*j2; b.vx+=nx*j2; b.vy+=ny*j2;
        if(vn>120*SPD){ hurt(a,vn*0.02,b); hurt(b,vn*0.02,a); sparks((a.x+b.x)/2,(a.y+b.y)/2,6,'#fff'); if(a===player||b===player) sfx('hit'); }
      }
    }
  }
}

// ---------- IA ----------
function aiControl(c, dt){
  // rubber banding leve em relação ao jogador
  const gap=(c.prog-player.prog)/N;
  c.rubber = gap>0.25 ? 0.93 : gap<-0.25 ? 1.06 : 1;
  c.laneT-=dt; if(c.laneT<=0){ c.laneT=rnd(2,5); c.lane=rnd(-85,85); }
  const look=12+Math.floor(c.speed/32);
  const tp=track[(c.idx+look)%N];
  const tx=tp.x+tp.nx*c.lane, ty=tp.y+tp.ny*c.lane;
  const da=angDiff(Math.atan2(ty-c.y,tx-c.x),c.a);
  const steer=clamp(da*2.6,-1,1);
  let curv=0; for(const o of [6,16,28,40]) curv=Math.max(curv,track[(c.idx+o)%N].curv);
  const top=430*SPD*c.skill*c.rubber*(c.nitro>0?1.5:1);
  const tgt=clamp(1.55*72/Math.max(curv,0.05),175,top);
  let thr=1, brake=0;
  if(c.speed>tgt*1.05){ thr=0; brake=c.speed>tgt*1.25?1:0; }
  // comportamento ofensivo
  if(state==='race'||state==='title'){
    if(c.missiles>0 && c.cd<=0){
      for(const o of cars){
        if(o===c||o.dead>0) continue;
        const dx=o.x-c.x, dy=o.y-c.y, d=Math.hypot(dx,dy);
        if(d<460 && Math.abs(angDiff(Math.atan2(dy,dx),c.a))<0.22 && Math.random()<dt*2.5){ fireMissile(c); break; }
      }
    }
    if(c.mines>0 && c.mcd<=0){
      for(const o of cars){
        if(o===c||o.dead>0) continue;
        const dx=c.x-o.x, dy=c.y-o.y;
        if(Math.hypot(dx,dy)<190 && Math.abs(angDiff(Math.atan2(dy,dx),o.a))<0.5 && Math.random()<dt*1.2){ dropMine(c); break; }
      }
    }
    c.aiNitroT-=dt;
    if(c.aiNitroT<=0){ c.aiNitroT=rnd(3,8); if(curv<0.18) useNitro(c); }
  }
  return {steer,thr,brake};
}

// ---------- Atualização ----------
function updateCar(c, dt){
  if(c.cd>0) c.cd-=dt; if(c.mcd>0) c.mcd-=dt; if(c.nitro>0) c.nitro-=dt;
  if(c.inv>0) c.inv-=dt; if(c.flash>0) c.flash-=dt;
  if(c.dead>0){ c.dead-=dt; if(c.dead<=0) respawn(c); return; }
  let ctl;
  if(state==='countdown') ctl={steer:0,thr:0,brake:1};
  else if(c.auto) ctl=aiControl(c,dt);
  else {
    ctl={steer:(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),
         thr:(keys.ArrowUp||keys.KeyW)?1:0, brake:(keys.ArrowDown||keys.KeyS)?1:0};
    if(pressed.Space||pressed.KeyZ) fireMissile(c);
    if(pressed.KeyX||pressed.KeyE) dropMine(c);
    if(pressed.ShiftLeft||pressed.ShiftRight||pressed.KeyC) useNitro(c);
  }
  if(state==='countdown'){ c.vx=c.vy=0; c.speed=0; locate(c); return; }
  driveCar(c,dt,ctl.steer,ctl.thr,ctl.brake);
  wallCollide(c,dt);
  // chamas do nitro / fumaça de dano
  if(c.nitro>0){
    fx({x:c.x-Math.cos(c.a)*20,y:c.y-Math.sin(c.a)*20,vx:-Math.cos(c.a)*80+rnd(-20,20),vy:-Math.sin(c.a)*80+rnd(-20,20),z:4,life:0.3,ch:pick(['~','*','^']),col:pick(['#ffd23f','#ff7a1a','#33e0ff'])});
  }
  if(c.hp<45 && Math.random()<dt*14) fx({x:c.x,y:c.y,z:8,vz:40,vx:rnd(-15,15),vy:rnd(-15,15),g:-30,life:0.9,ch:pick(['.','o','O']),col:'#666'});
  if(c.hp<22 && Math.random()<dt*14) fx({x:c.x,y:c.y,z:8,vz:60,vx:rnd(-15,15),vy:rnd(-15,15),life:0.5,ch:pick(['*','^']),col:pick(['#ff8a2a','#ffd23f'])});
  // coleta de itens
  for(const p of pickups){
    if(p.cool>0||c.dead>0) continue;
    if(Math.hypot(c.x-p.x,c.y-p.y)<36){
      p.cool=8;
      if(p.type==='M') c.missiles=Math.min(9,c.missiles+3);
      else if(p.type==='X') c.mines=Math.min(6,c.mines+3);
      else if(p.type==='N') c.nitroCount=Math.min(3,c.nitroCount+1);
      else c.hp=Math.min(100,c.hp+40);
      if(c===player){ floater(p.x,p.y,pickName(p.type),PICK_COL[p.type]); sfx('pick'); }
    }
  }
}

function update(dt){
  if(state==='countdown'){
    countdown-=dt;
    const n=Math.ceil(countdown);
    if(n!==lastBeep && n>=1 && n<=3){ lastBeep=n; sfx('beep'); }
    if(countdown<=0){ state='race'; sfx('go'); }
  }
  if(state==='race'||state==='finish') raceTime+=dt;
  for(const c of cars) updateCar(c,dt);
  if(state!=='countdown') carCollisions();
  updateMissiles(dt); updateMines(dt);
  for(const p of pickups) if(p.cool>0) p.cool-=dt;
  for(let i=FX.length-1;i>=0;i--){
    const f=FX[i]; f.life-=dt;
    if(f.life<=0){ FX.splice(i,1); continue; }
    f.x+=f.vx*dt; f.y+=f.vy*dt; f.z+=f.vz*dt; f.vz-=f.g*dt; if(f.z<0){ f.z=0; f.vz=0; f.vx*=0.8; f.vy*=0.8; }
  }
  for(let i=flashes.length-1;i>=0;i--){ flashes[i].life-=dt; if(flashes[i].life<=0) flashes.splice(i,1); }
  for(let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.life-=dt; f.y-=30*dt; if(f.life<=0) floaters.splice(i,1); }
  for(let i=logMsgs.length-1;i>=0;i--){ logMsgs[i].life-=dt; if(logMsgs[i].life<=0) logMsgs.splice(i,1); }
  shake=Math.max(0,shake-dt*2.2);
  // câmera
  let tgt=player;
  if(state==='title'){ tgt=cars.slice().sort((a,b)=>b.prog-a.prog)[0]; }
  const k=Math.min(1,dt*5);
  camX+=(tgt.x+tgt.vx*0.35-camX)*k; camY+=(tgt.y+tgt.vy*0.35-camY)*k;
  // áudio do motor
  if(engGain){
    const on = !muted && (state==='race'||state==='finish') && player.dead<=0;
    engGain.gain.value = on ? 0.035 : 0;
    engOsc.frequency.value = 50 + player.speed*0.22 + (player.nitro>0?25:0);
  }
}

function ranking(){
  return cars.slice().sort((a,b)=>{
    if(a.finished&&b.finished) return a.place-b.place;
    if(a.finished) return -1; if(b.finished) return 1;
    return b.prog-a.prog;
  });
}

// ---------- Renderização ----------
let camPX=0, camPY=0, shakeX=0, shakeY=0;
const w2sx = (x,y) => isoX(x,y)-camPX+W/2+shakeX;
const w2sy = (x,y,z=0) => isoY(x,y)-camPY+H/2+shakeY - z*ZOOM*0.8;

// ---------- Sprites ----------
let carBuf=null, misBuf=null;
function initSprites(){
  const f=Math.max(1,ZOOM*CAR_SPRITE.scale/3.08), fm=Math.max(1,ZOOM*PROPS.missile.scale/2.52);
  carBuf=new Iso.SpriteBuffer(Math.round(CAR_SPRITE.w*f),Math.round(CAR_SPRITE.h*f),0.62);
  PROPS.clearCache(); glowCache.clear(); queueSpriteBake();
  misBuf=new Iso.SpriteBuffer(Math.round(PROPS.missile.w*fm),Math.round(PROPS.missile.h*fm),0.6);
}

function rgba(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
const glowCache=new Map();
function glow(sx,sy,rx,col,a){ // brilho aditivo; em isométrico um círculo do chão vira elipse 2:1 (bitmap em cache)
  if(!QUALITY[qIdx].glow) return;
  rx=Math.max(4,Math.round(rx/4)*4);
  const key=col+'|'+rx;
  let cv=glowCache.get(key);
  if(!cv){
    cv=document.createElement('canvas'); cv.width=rx*2; cv.height=rx;
    const g=cv.getContext('2d'); g.translate(rx,rx/2); g.scale(1,0.5);
    const gr=g.createRadialGradient(0,0,0,0,0,rx); gr.addColorStop(0,rgba(col,1)); gr.addColorStop(1,rgba(col,0));
    g.fillStyle=gr; g.fillRect(-rx,-rx,rx*2,rx*2);
    if(glowCache.size>200) glowCache.clear();
    glowCache.set(key,cv);
  }
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.max(0,Math.min(1,a));
  ctx.drawImage(cv,Math.round(sx-rx),Math.round(sy-rx/2)); ctx.restore();
}

// pré-gera as poses de todos os carros aos poucos (evita conversões no meio da corrida)
let bakeQueue=[];
function queueSpriteBake(){ bakeQueue=[]; for(const d of CAR_DEFS) for(let i=0;i<36;i++) bakeQueue.push([d.color,i]); }
function bakeSprites(budgetMs){
  const t0=performance.now(), S=ZOOM*CAR_SPRITE.scale;
  while(bakeQueue.length && performance.now()-t0<budgetMs){
    const [col,i]=bakeQueue.shift();
    carBuf.prime(col+'|'+i,()=>CAR_SPRITE.paint(carBuf,{color:col,a:i*Math.PI*2/36,nitro:0,flash:0},S*Math.SQRT1_2,S*0.8));
  }
}

// Desenha o carro a partir do atlas pré-gerado (sprites/baked). Devolve false se não houver sprite para essa cor.
function drawBakedCar(c,sx,sy){
  const m=BAKED.meta, ci=BAKED.colorIndex[c.color];
  if(ci===undefined) return false;
  const N=m.angles; let step=Math.round(c.a/(Math.PI*2)*N); step=((step%N)+N)%N;
  const f=ZOOM*CAR_SPRITE.scale/m.S, scaled=Math.abs(f-1)>0.02;          // f=1: cópia 1:1; senão reduz/amplia com suavização
  ctx.imageSmoothingEnabled=scaled; if(scaled) ctx.imageSmoothingQuality='high';
  if(c.nitro>0){                                                           // chama (pré-gerada, 4 variações)
    const R=m.flame.rects[((chunkFrame>>1)%m.flame.variants)*N+step];
    if(R) ctx.drawImage(BAKED.flame,R.x,R.y,R.w,R.h,Math.round(sx+R.l*f),Math.round(sy+R.t*f),R.w*f,R.h*f);
  }
  const R=m.rects[ci][step];
  if(R){
    const x=Math.round(sx+R.l*f), y=Math.round(sy+R.t*f);
    ctx.drawImage(BAKED.atlas[ci],R.x,R.y,R.w,R.h,x,y,R.w*f,R.h*f);
    if(c.flash>0){                                                         // flash de dano: o mesmo sprite, bem mais claro
      ctx.filter='brightness(3)';
      ctx.drawImage(BAKED.atlas[ci],R.x,R.y,R.w,R.h,x,y,R.w*f,R.h*f);
      ctx.filter='none';
    }
  }
  ctx.imageSmoothingEnabled=false;
  return true;
}

function drawCar(c){
  if(c.dead>0) return;
  if(c.inv>0 && ((c.inv*10)|0)%2===0) return;
  const sx=w2sx(c.x,c.y), sy=w2sy(c.x,c.y);
  const S=ZOOM*CAR_SPRITE.scale, k=S*Math.SQRT1_2, zs=S*0.8;
  const cs=Math.cos(c.a), sn=Math.sin(c.a);
  // sombra (pegada do carro projetada no chão)
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.beginPath();
  CAR_SPRITE.footprint.forEach(([lx,ly],i)=>{
    const X=lx*cs-ly*sn+3, Y=lx*sn+ly*cs+3, px=sx+(X-Y)*k, py=sy+(X+Y)*k*0.5;
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  });
  ctx.closePath(); ctx.fill();
  // faróis e nitro
  if(state!=='countdown'){ const fx=c.x+cs*60, fy=c.y+sn*60; glow(w2sx(fx,fy),w2sy(fx,fy),48*GS,'#fff2c0',0.13); }
  if(c.nitro>0){ const bx=c.x-cs*34, by=c.y-sn*34; glow(w2sx(bx,by),w2sy(bx,by),46*GS,'#ff7a1a',0.55); }
  if(!(BAKED.ready && drawBakedCar(c,sx,sy))){                            // sem sprites pré-gerados: gera na hora (com cache)
    const step=Math.round(c.a/(Math.PI*2)*36);
    const key=c.flash>0?null:c.color+'|'+((step%36)+36)%36+(c.nitro>0?'|n'+(chunkFrame%3):'');
    const ang=key?step*(Math.PI*2)/36:c.a;
    carBuf.render(ctx,sx,sy,key,()=>CAR_SPRITE.paint(carBuf,key?{...c,a:ang}:c,k,zs));
  }
  // etiqueta
  ctx.font=`bold ${Math.round(HFS*0.75)}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  const ty=sy-26*zs-HFS*0.5;
  if(c.isPlayer){ ctx.fillStyle='#ffd23f'; ctx.fillText('▼',sx,ty-2+Math.sin(performance.now()/160)*2); }
  else { ctx.fillStyle=rgba(c.color,0.85); ctx.fillText(c.name,sx,ty); }
}

function drawMissile(m){
  const sx=w2sx(m.x,m.y), sy=w2sy(m.x,m.y,8);
  glow(sx,sy+6,30*GS,'#ffb347',0.5);
  const M=PROPS.missile, S=ZOOM*M.scale;
  const mk='m'+(Math.round(m.a/(Math.PI*2)*48)%48+48)%48, ma=Math.round(m.a/(Math.PI*2)*48)*(Math.PI*2)/48;
  misBuf.render(ctx,sx,sy,mk,()=>{ const g=misBuf.begin(), [ax,ay]=misBuf.anchor; Iso.drawModel(g,M.model,ma,M.roles,ax,ay,S*Math.SQRT1_2,S*0.8); });
}

function drawWorld(){
  const t=performance.now()/1000;
  // itens
  for(const p of pickups){
    if(p.cool>0) continue;
    const zf=ZOOM_CSS/ZOOM_PADRAO, sx=w2sx(p.x,p.y), bob=Math.sin(t*4+p.x)*1.8*zf, sy=w2sy(p.x,p.y)-9*zf+bob;
    if(sx<-80||sx>W+80||sy<-80||sy>H+80) continue;
    const col=PICK_COL[p.type], pulse=0.5+0.5*Math.sin(t*5+p.x*0.05);
    glow(sx,sy+10*zf,26*GS*zf,col,0.30+0.25*pulse);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx,sy+11*zf-bob,12*zf,4.5*zf,0,0,Math.PI*2); ctx.fill();
    PROPS.drawArt(PROPS.pad,sx,sy,col,p.type,pulse>0.5?'#ffffff':col);
  }
  // minas
  for(const m of mines){
    const zf=ZOOM_CSS/ZOOM_PADRAO, sx=w2sx(m.x,m.y), sy=w2sy(m.x,m.y)-4*zf, on=m.arm<=0 && (((t*4)|0)%2===0);
    if(m.arm<=0) glow(sx,sy+3*zf,20*GS*zf,on?'#ff3b30':'#ffa030',on?0.5:0.2);
    PROPS.drawArt(PROPS.mine,sx,sy,m.arm>0?'#888':(on?'#ff3b30':'#ffa030'));
  }
  // carros em ordem de profundidade (x+y), depois os muros que ficam à frente
  const order=cars.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  for(const c of order) drawCar(c);
  drawFront();
  for(const m of missiles) drawMissile(m);
  // clarões de explosão
  for(const f of flashes){
    const k=f.life/f.max, sx=w2sx(f.x,f.y), sy=w2sy(f.x,f.y);
    glow(sx,sy,f.r*GS*(1.4-k*0.4),'#ff9a3a',0.85*k);
    glow(sx,sy,f.r*GS*0.5,'#fff2c0',0.9*k);
  }
  // partículas
  ctx.font=`bold ${FS}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle';   // fillText é bem mais barato que 1 drawImage por partícula
  for(const f of FX){
    const sx=w2sx(f.x,f.y), sy=w2sy(f.x,f.y,f.z);
    if(sx<-20||sx>W+20||sy<-20||sy>H+20) continue;
    ctx.globalAlpha=clamp(f.life/f.max*1.4,0,1);
    ctx.fillStyle=f.col; ctx.fillText(f.ch,sx,sy);
  }
  ctx.globalAlpha=1;
  // textos flutuantes
  ctx.font=`bold ${HFS}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const f of floaters){
    ctx.globalAlpha=clamp(f.life/f.max*2,0,1); ctx.fillStyle=f.color;
    ctx.fillText(f.text,w2sx(f.x,f.y),w2sy(f.x,f.y)-40);
  }
  ctx.globalAlpha=1;
}

// ---------- HUD ----------
let miniCanvas=null, miniScale=1, miniOx=0, miniOy=0, MW=0, MH=0;
let mmX0=0, mmY0=0;
function buildMinimap(){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const p of track){
    const a=isoX(p.x,p.y), b=isoY(p.x,p.y);
    x0=Math.min(x0,a); y0=Math.min(y0,b); x1=Math.max(x1,a); y1=Math.max(y1,b);
  }
  mmX0=x0; mmY0=y0;
  const maxW=Math.min(W*0.22,260*DPR), maxH=Math.min(H*0.28,170*DPR);
  miniScale=Math.min(maxW/(x1-x0), maxH/(y1-y0));
  MW=Math.ceil((x1-x0)*miniScale)+HCW*2; MH=Math.ceil((y1-y0)*miniScale)+HCH*2;
  miniOx=HCW; miniOy=HCH;
  miniCanvas=document.createElement('canvas'); miniCanvas.width=MW; miniCanvas.height=MH;
  const x=miniCanvas.getContext('2d');
  x.font=`bold ${HFS}px ${FONT}`; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle='#4a5370';
  for(let k=0;k<N;k+=4) x.fillText('.',(isoX(track[k].x,track[k].y)-mmX0)*miniScale+miniOx,(isoY(track[k].x,track[k].y)-mmY0)*miniScale+miniOy);
  x.fillStyle='#fff'; x.fillText('#',(isoX(track[0].x,track[0].y)-mmX0)*miniScale+miniOx,(isoY(track[0].x,track[0].y)-mmY0)*miniScale+miniOy);
}

function ord(n){ return I18N.ord(n); }
function fmtTime(t){ const m=Math.floor(t/60), s=t-m*60; return m+':'+(s<10?'0':'')+s.toFixed(1); }

function text(str,x,y,col,align,size){
  ctx.font=`bold ${size||HFS}px ${FONT}`; ctx.textAlign=align||'left'; ctx.textBaseline='top';
  ctx.fillStyle='#000'; ctx.fillText(str,x+1,y+1);
  ctx.fillStyle=col||'#fff'; ctx.fillText(str,x,y);
}

function drawHUD(){
  const pad=HCW*2, rk=ranking();
  const myPos=rk.indexOf(player)+1;
  // topo-esquerdo: volta / posição / tempo
  text(t('lap',clamp(player.lap,1,LAPS),LAPS),pad,pad*0.6,'#fff');
  text(t('pos',myPos,NUM_CARS),pad,pad*0.6+HCH,'#ffd23f');
  text(t('time',fmtTime(raceTime)),pad,pad*0.6+HCH*2,'#9aa3bd');
  // ranking
  for(let i=0;i<rk.length;i++){
    const c=rk[i];
    text(`${i+1}. ${c.name}${c.finished?' ✓':''}`,pad,pad*0.6+HCH*(4+i),c.color);
  }
  // minimapa
  if(miniCanvas){
    const mx=W-MW-pad, my=pad*0.6;
    ctx.globalAlpha=0.9; ctx.drawImage(miniCanvas,mx,my); ctx.globalAlpha=1;
    ctx.font=`bold ${HFS}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const c of cars){
      ctx.fillStyle=c.color;
      ctx.fillText(c.isPlayer?'@':'o', mx+(isoX(c.x,c.y)-mmX0)*miniScale+miniOx, my+(isoY(c.x,c.y)-mmY0)*miniScale+miniOy);
    }
  }
  // log
  for(let i=0;i<logMsgs.length;i++){
    ctx.globalAlpha=clamp(logMsgs[i].life,0,1);
    text(logMsgs[i].t,W-pad,my0()+HCH*i,'#ffb347','right');
  }
  ctx.globalAlpha=1;
  // barra de vida + itens (rodapé)
  const by=H-HCH*4.2;
  const hpN=Math.round(player.hp/5);
  const bar='['+'#'.repeat(hpN)+'-'.repeat(20-hpN)+']';
  const hc=player.hp>60?'#55ff88':player.hp>30?'#ffd23f':'#ff4d4d';
  const lx=pad+HCW*11, cxn=pad+HCW*21;                      // colunas: tecla | rótulo | quantidade (cabem em qualquer idioma)
  text(t('health'),pad,by,'#9aa3bd'); text(bar+' '+Math.ceil(player.hp),lx,by,hc);
  text(t('keySpace'),pad,by+HCH,'#ff5555'); text(t('missiles'),lx,by+HCH,'#ff5555'); text('x'+player.missiles,cxn,by+HCH,'#fff');
  text('X',pad,by+HCH*2,'#ffa030'); text(t('mines'),lx,by+HCH*2,'#ffa030'); text('x'+player.mines,cxn,by+HCH*2,'#fff');
  text('SHIFT',pad,by+HCH*3,'#33e0ff'); text(t('nitro'),lx,by+HCH*3,'#33e0ff'); text('x'+player.nitroCount+(player.nitro>0?'  ▶▶▶':''),cxn,by+HCH*3,'#fff');
  // velocímetro
  text(`${Math.round(player.speed*0.4)} km/h`,W-pad,H-HCH*2.4,'#fff','right');
  // contra-mão
  if(state==='race' && player.dead<=0 && player.speed>90){
    const p=track[player.idx];
    if(player.vx*p.tx+player.vy*p.ty < -40 && ((performance.now()/300)|0)%2===0)
      text(t('wrongWay'),W/2,H*0.2,'#ff4d4d','center',HFS*1.6);
  }
  if(player.dead>0) text(t('destroyed'),W/2,H*0.25,'#ff4d4d','center',HFS*1.6);
}
function my0(){ return HCW*2*0.6+MH+HCH; }

function drawCenterBig(str,row,sx,sy,colorFn){
  const cols=Math.floor(W/HCW);
  drawBig(str, Math.floor((cols-bigWidth(str,sx))/2), row, sx, sy, colorFn);
}

function drawOverlay(){
  const cols=Math.floor(W/HCW), rows=Math.floor(H/HCH);
  if(state==='title'){
    ctx.fillStyle='rgba(4,6,10,0.62)'; ctx.fillRect(0,0,W,H);
    const sx=W>1100?2:1, sy=1;
    const top=Math.max(2,Math.floor(rows*0.12));
    drawCenterBig("ASCII",top,sx,sy,(r,n)=>r<n/2?'#ffd23f':'#ff9a2a');
    drawCenterBig("RACING",top+7,sx,sy,(r,n)=>r<n/2?'#ff6a3d':'#ff3b30');
    const cx=W/2, y0=(top+14)*HCH;
    ctx.textAlign='center'; ctx.textBaseline='top';
    const spaced=s=>s.split(' ').map(w=>w.split('').join(' ')).join('   ');
    text('~ ~ ~   '+spaced(t('subtitle'))+'   ~ ~ ~',cx,y0,'#9aa3bd','center');
    const blink=((performance.now()/500)|0)%2===0;
    if(blink) text(t('pressEnter'),cx,y0+HCH*3,'#ffffff','center',HFS*1.25);
    const row=(k,a)=>k+' '+'.'.repeat(Math.max(3,22-k.length))+' '+a;
    const L=[
      row(t('keyArrows')+' / WASD',t('ctrlDrive')),
      row(t('keySpace'),t('ctrlMissile')),
      row('X',t('ctrlMine')),
      row('SHIFT',t('ctrlNitro')),
      t('sysKeys')
    ];
    for(let i=0;i<L.length;i++) text(L[i],cx,y0+HCH*(6+i),'#c8cee0','center');
    text(t('itemsLine'),cx,y0+HCH*12,'#9aa3bd','center');
    text('[L]  '+I18N.langs.map(l=>l===I18N.lang?'< '+I18N.names[l]+' >':I18N.names[l]).join('   '),cx,y0+HCH*14,'#7f88a6','center');
  }
  else if(state==='countdown'){
    const n=Math.ceil(countdown);
    if(n>=1){
      drawCenterBig(String(n),Math.floor(rows*0.22),4,2,(r,m)=>'#ffd23f');
    }
  }
  else if(state==='race' && raceTime<1.2){
    drawCenterBig('GO!',Math.floor(rows*0.22),4,2,(r,m)=>'#55ff88');
  }
  else if(state==='finish'){
    ctx.fillStyle='rgba(4,6,10,0.6)'; ctx.fillRect(0,0,W,H);
    drawCenterBig('FINISH',Math.floor(rows*0.1),2,1,(r,n)=>r<n/2?'#ffd23f':'#ff9a2a');
    const rk=ranking(), cx=W/2, y0=Math.floor(rows*0.1+8)*HCH;
    text(t('finishMsg',ord(player.place)),cx,y0,player.place===1?'#ffd23f':'#fff','center',HFS*1.4);
    for(let i=0;i<rk.length;i++){
      const c=rk[i];
      const line=`${i+1}. ${c.name.padEnd(8)} ${c.finished?fmtTime(c.finishTime):t('racing')}`;
      text(line,cx,y0+HCH*(3+i*1.3),c.color,'center');
    }
    if(((performance.now()/500)|0)%2===0) text(t('again'),cx,y0+HCH*11,'#fff','center',HFS*1.2);
  }
  if(paused){
    ctx.fillStyle='rgba(4,6,10,0.5)'; ctx.fillRect(0,0,W,H);
    text(t('paused'),W/2,H*0.4,'#fff','center',HFS*2.4);
  }
}

function drawFps(){
  text(Math.round(1000/Math.max(1,fpsEma))+' FPS ('+fpsEma.toFixed(1)+' ms)   '+t('fpsLine',ZOOM_CSS.toFixed(2),t(QUALITY[qIdx].name),FS_BASE,chunks.size),W/2,HCH*0.5,'#9aa3bd','center');
}
function render(){
  ctx.fillStyle='#07080c'; ctx.fillRect(0,0,W,H);
  shakeX=(Math.random()*2-1)*shake*6*DPR; shakeY=(Math.random()*2-1)*shake*6*DPR;
  drawTerrain();
  drawWorld();
  if(vigCv && QUALITY[qIdx].vig) ctx.drawImage(vigCv,0,0);
  if(state!=='title') drawHUD();
  drawOverlay();
  if(showFps) drawFps();
}

// ---------- Loop / entrada ----------
function resize(){
  DPR=Math.min(QUALITY[qIdx].dpr,window.devicePixelRatio||1);
  ZOOM=ZOOM_CSS*DPR; K=ZOOM*Math.SQRT1_2; GS=ZOOM*CAR_SPRITE.scale/4.4;   // a câmera não muda com a densidade da tela
  W=cv.width=Math.floor(innerWidth*DPR); H=cv.height=Math.floor(innerHeight*DPR);
  ctx.imageSmoothingEnabled=false;                     // tudo é desenhado 1:1 em pixels inteiros
  FS=Math.max(6,Math.round(FS_BASE*DPR));
  ctx.font=`bold ${FS}px ${FONT}`; CW=Math.ceil(ctx.measureText('M').width); CH=Math.ceil(FS*1.15);
  SFS=Math.max(5,FS-1);
  ctx.font=`bold ${SFS}px ${FONT}`; SCW=Math.max(3,Math.round(ctx.measureText('M').width)); SCH=Math.ceil(SFS*1.15);
  HFS=Math.round(13*DPR);
  ctx.font=`bold ${HFS}px ${FONT}`; HCW=Math.ceil(ctx.measureText('M').width); HCH=Math.ceil(HFS*1.25);
  glyphCache.clear();
  updateSideMetrics(); terrainReset(); buildDirTab();
  initSprites();
  buildMinimap();
  vigCv=document.createElement('canvas'); vigCv.width=W; vigCv.height=H;
  const vg=vigCv.getContext('2d');
  const gr=vg.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.hypot(W,H)*0.55);
  gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0.6)');
  vg.fillStyle=gr; vg.fillRect(0,0,W,H);
  if(player) prewarmTerrain();
}

let resizeT=0;
addEventListener('resize',()=>{ clearTimeout(resizeT); resizeT=setTimeout(resize,150); });
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  ensureAudio();
  if(!e.repeat) pressed[e.code]=true;
  keys[e.code]=true;
  if(e.code==='Enter' && (state==='title'||state==='finish')) startRace();
  if(e.code==='KeyM') muted=!muted;
  if(e.code==='KeyF') showFps=!showFps;
  if(e.code==='KeyL'){ I18N.next(); logMsg(t('msgLang',I18N.names[I18N.lang])); }
  if(e.code==='KeyQ') setQuality((qIdx+1)%QUALITY.length);
  if(e.code==='Period') setZoom(ZOOM_CSS*1.15);
  if(e.code==='Comma') setZoom(ZOOM_CSS/1.15);
  if(e.code==='Digit0'||e.code==='Numpad0') setZoom(ZOOM_PADRAO);       // volta ao zoom padrão
  if(e.code==='Equal'||e.code==='NumpadAdd'){ FS_BASE=Math.max(4,FS_BASE-1); resize(); }
  if(e.code==='Minus'||e.code==='NumpadSubtract'){ FS_BASE=Math.min(12,FS_BASE+1); resize(); }
  if(e.code==='KeyP' && (state==='race'||state==='countdown')) paused=!paused;
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });

let last=performance.now();
let showFps=false, autoQuality=true, fpsEma=16, slowFrames=0;
function frame(now){
  const raw=now-last;
  const dt=Math.min(1/30,raw/1000); last=now;
  if(bakeQueue.length){ if(BAKED.ready) bakeQueue=[]; else bakeSprites(state==='race'?2:6); }
  if(raw<250){                                    // ignora pausas (aba em segundo plano)
    fpsEma+=(raw-fpsEma)*0.05;
    slowFrames = (fpsEma>26 && (state==='race'||state==='countdown')) ? slowFrames+1 : 0;
    if(autoQuality && slowFrames>120){                   // ~2 s abaixo de ~38 FPS: reduz a qualidade
      slowFrames=0; fpsEma=16;
      if(qIdx<QUALITY.length-1){ setQuality(qIdx+1); logMsg(t('msgQualityAuto')); }
      else if(FS_BASE<10){ FS_BASE++; resize(); logMsg(t('msgDensityAuto')); }
    }
  }
  if(!paused) update(dt);
  for(const k in pressed) delete pressed[k];
  render();
  requestAnimationFrame(frame);
}

buildTrack();
resize();
resetRace(false);       // modo demonstração na tela de título (IA corre sozinha)
requestAnimationFrame(frame);
