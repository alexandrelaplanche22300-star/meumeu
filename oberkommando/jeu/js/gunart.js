// L'arme et sa munition, dessinées pièce par pièce. Chaque réglage du bureau d'études a sa forme : la crosse choisie, la culasse
// (verrou, levier, pompe, gaz), le chargeur (boîte, courbe, tambour, tube, bande), le tube (épais, cannelé, à ailettes), les
// bouches (frein, cache-flamme, manchon), la baïonnette, les visées, l'affût (bipied, trépied, affût de campagne à roues).
// La munition est une demi-coupe de dessin technique : dessus, l'extérieur ; dessous, coupé net — l'amorce, la poudre, l'étui,
// la chemise, le noyau, la cavité, la charge, la traçante ; pour une balle-fusée, le bloc de propergol, les tuyères, les ailettes.
import {ACTIONS,CONSTRUCTIONS,NOSES,CASEMATS,RIMS,STOCKS,FINISHES,GUIDES} from './ballistics.js';
import {MATS} from './armor.js';

// La couleur de pointe (le code des arsenaux) : on reconnaît la munition à l'œil — ici, au combat aussi
const TIPC0={ap:'#15181b',apt:'#15181b',apv:'#6a4bc4',tungstene:'#9aa4ad',inc:'#2d6fd6',api:'#2d6fd6',trc:'#d23a2e',he:'#f0c419',hei:'#e0801f',saphei:'#e0801f',creuse:'#f0c419',sp:'#8d9196',frangible:'#58a55c',apfsds:'#15181b',sabot:'#15181b'};
// sur mesure : la couleur dit la charge (explosive jaune, incendiaire bleue, traçante rouge), sinon le noyau (acier noir)
export const TIPC=new Proxy(TIPC0,{get(t,k){if(typeof k==='string'&&k.startsWith('cx:')){const [,c,tp,tr,inc,he]=k.slice(3).split('.');return +he?'#f0c419':+inc?'#2d6fd6':+tr?'#d23a2e':c==='acier'?'#15181b':c==='tungstene'?'#9aa4ad':tp==='creuse'||tp==='molle'?'#8a8f94':undefined;}return t[k];}});
const INK='#15181b';
// une teinte éclaircie (k > 0) ou assombrie (k < 0) d'une couleur #rrggbb
function tint(c,k){const n=parseInt(c.slice(1),16),m=k>0?255:0,a=Math.abs(k),f=v=>Math.round(v+(m-v)*a).toString(16).padStart(2,'0');return '#'+f(n>>16&255)+f(n>>8&255)+f(n&255);}
const lin=(x,y0,y1,cs)=>{const g=x.createLinearGradient(0,y0,0,y1);cs.forEach((c,i)=>g.addColorStop(i/(cs.length-1),c));return g;};
function rrect(x,a,b,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));x.beginPath();x.moveTo(a+r,b);x.lineTo(a+w-r,b);x.quadraticCurveTo(a+w,b,a+w,b+r);x.lineTo(a+w,b+h-r);x.quadraticCurveTo(a+w,b+h,a+w-r,b+h);x.lineTo(a+r,b+h);x.quadraticCurveTo(a,b+h,a,b+h-r);x.lineTo(a,b+r);x.quadraticCurveTo(a,b,a+r,b);x.closePath();}
function rnd(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
let HATCH=null;function hatch(x){if(HATCH)return x.createPattern(HATCH,'repeat');if(typeof document==='undefined')return '#999';const c=document.createElement('canvas');c.width=c.height=6;const g=c.getContext('2d');g.strokeStyle='rgba(20,20,24,.35)';g.lineWidth=1;g.beginPath();g.moveTo(0,6);g.lineTo(6,0);g.stroke();HATCH=c;return x.createPattern(c,'repeat');}
// un reflet : une bande claire le long d'une pièce de métal
function shine(x,a,b,w,h){x.save();x.globalAlpha=.28;x.fillStyle='#ffffff';x.fillRect(a,b+h*.18,w,Math.max(.6,h*.12));x.restore();}

// ---------- la disposition de l'arme, en mm depuis le talon de crosse ----------
export function layout(D){const p=D.p,A=ACTIONS[p.action]||{},ms=new Set(D.mods||[]);const COL=D.COL,d=p.d;const ST=STOCKS[p.stock]?p.stock:'bois';
  const crewGun=D.have==='trepied'||!!A.howitzer;const act=COL*2.4+8;
  const stock=crewGun?COL*1.1+14:ST==='sans'?COL*.3+6:ST==='bullpup'?Math.max(14,COL*.8):Math.max(55,60+COL*1.6)*(ST==='pliante'?.9:1);
  const dev=ms.has('manchon')?Math.max(d*14,18)*Math.pow((p.supVol??250)/250,.55):ms.has('frein')?d*3.2:ms.has('cacheflamme')?d*4:0;const bay=ms.has('baionnette')&&!crewGun?Math.max(18,Math.min(60,p.L*.22)):0;
  // bullpup : la culasse est logée dans la crosse, derrière la poignée — le canon commence juste devant
  const rs=ST==='bullpup'&&!crewGun?stock*.2:stock,b0=rs+act;const m0=b0+p.L;
  return {crewGun,act,stock,dev,bay,rs,b0,m0,Lw:m0+dev+Math.max(0,bay-dev*.6),ST,bull:ST==='bullpup'&&!crewGun};}

// ---------- les attaches, en pixels : où chaque pièce se fixe, avec la géométrie même de drawWeapon ----------
// o : {bx, ay, s} comme pour drawWeapon. Une balle-fusée est un tube de lancement : talon, milieu, bouche.
export function ports(D,o){const p=D.p,G=o.G||layout(D),{bx,ay,s}=o;const X=v=>bx+v*s;
  if(D.rocket){const Lt=G.stock+G.act+p.L,bw=Math.max(4,p.d*1.25*s*1.1);
    return {talon:{x:X(0),y:ay},boitier:{x:X(Lt*.4),y:ay},chargeur:{x:X(Lt*.4),y:ay+bw/2},rail:{x:X(Lt*.55),y:ay-bw/2},canon:{x:X(Lt*.5),y:ay},bouche:{x:X(Lt),y:ay},
      sousbouche:{x:X(Lt),y:ay+bw/2},poignee:{x:X(Lt*.4),y:ay+bw/2},bipied:{x:X(Lt*.6),y:ay+bw/2},trepied:{x:X(Lt*.45),y:ay+bw/2},affut:{x:X(Lt*.45),y:ay+bw/2},devant:{x:X(Lt*.3),y:ay}};}
  const d=p.d,Dc=D.Dc||d*1.45,wall=d*(.35+.00075*D.P)*(D.wallx||1),Dout=d+2*wall;
  const RH=Math.max(Dc*3.2+6,Dout*1.8),r2=RH*s/2,bw=Math.max(2.2,Dout*s),R0=X(G.rs),Rw=G.act*s;
  return {talon:{x:X(0),y:ay},boitier:{x:R0+Rw*.5,y:ay},chargeur:{x:R0+Rw*.5,y:ay+r2},rail:{x:R0+Rw*.5,y:ay-r2},canon:{x:X(G.b0+p.L*.5),y:ay},bouche:{x:X(G.m0),y:ay},
    sousbouche:{x:X(G.m0-G.bay*.25),y:ay+bw*.9},poignee:{x:X(G.b0+p.L*.25),y:ay+r2*.75},bipied:{x:X(G.b0+p.L*.62),y:ay+2},trepied:{x:X(G.rs+G.act*.6),y:ay+r2},
    affut:{x:X(G.rs+G.act*.8),y:ay+r2},devant:{x:X(G.b0+Math.min(p.L*.2,40)),y:ay}};}

// ---------- l'arme, de profil ----------
// o : {bx, ay, s, ground, t} — bx : le talon de crosse à l'écran ; ay : l'axe du canon ; s : px par mm. Rend la bouche (px).
export function drawWeapon(x,D,o){const p=D.p,A=ACTIONS[p.action]||{},ms=new Set(D.mods||[]);const G=o.G||layout(D);const {bx,ay,s,ground}=o;
  const F=FINISHES[p.finish]||FINISHES.bleui;const d=p.d,Dc=D.Dc||d*1.45,COL=D.COL,wall=d*(.35+.00075*D.P)*(D.wallx||1),Dout=d+2*wall;
  const X=v=>bx+v*s;const RH=Math.max(Dc*3.2+6,Dout*1.8);const r2=RH*s/2;const M=(y0,h)=>lin(x,y0,y0+h,F.m),Wd=(y0,h)=>lin(x,y0,y0+h,F.w);
  const brass=(CASEMATS[p.caseMat]||CASEMATS.laiton).col;
  x.save();x.lineJoin='round';x.lineWidth=1;x.strokeStyle=INK;
  // --- la sangle (armes d'épaule) : elle pend sous l'arme, du garde-main à la crosse
  if(!o.inhand&&!G.crewGun&&!D.rocket&&G.ST!=='sans'){x.strokeStyle='rgba(70,55,35,.9)';x.lineWidth=Math.max(1.5,r2*.28);x.beginPath();x.moveTo(X(G.stock*.35),ay+r2*1.9);x.quadraticCurveTo(X((G.stock+G.b0)*.55),ay+r2*5.2,X(G.b0+p.L*.3),ay+r2*.7);x.stroke();x.lineWidth=1;x.strokeStyle=INK;}
  // --- la balle-fusée : un tube de lancement
  if(D.rocket){const Lt=G.stock+G.act+p.L;const bw=Math.max(4,d*1.25*s*1.1);const tube=lin(x,ay-bw/2,ay+bw/2,[F.m[0],F.m[1],F.m[2]]);
    if(!o.inhand&&G.crewGun)carriage(x,D,G,X,ay,s,ground,F,r2);
    const tubes=Math.min(12,D.barrels||1);if(tubes>1){for(let n=tubes-1;n>=1;n--){const row=Math.ceil(n/2),side=n%2?1:-1,yy=ay+side*row*bw*.76;x.fillStyle=lin(x,yy-bw/2,yy+bw/2,[F.m[0],F.m[1],F.m[2]]);rrect(x,X(0),yy-bw/2,Lt*s,bw,bw*.2);x.fill();x.stroke();shine(x,X(0),yy-bw/2,Lt*s,bw);x.fillStyle='#171c1d';x.beginPath();x.ellipse(X(Lt),yy,bw*.22,bw*.4,0,0,7);x.fill();}x.fillStyle=F.m[2];for(const q of [.2,.65]){rrect(x,X(Lt*q)-2,ay-bw*Math.ceil((tubes-1)/2)*.76-bw*.6,4,bw*(Math.ceil((tubes-1)/2)*1.52+1.2),1);x.fill();}}
    x.fillStyle=tube;rrect(x,X(0),ay-bw/2,Lt*s,bw,bw*.2);x.fill();x.stroke();shine(x,X(0),ay-bw/2,Lt*s,bw);
    // le cône arrière (venturi), la bague avant, les colliers
    x.fillStyle=F.m[2];x.beginPath();x.moveTo(X(0),ay-bw/2);x.lineTo(X(0)-bw*.7,ay-bw*.9);x.lineTo(X(0)-bw*.7,ay+bw*.9);x.lineTo(X(0),ay+bw/2);x.closePath();x.fill();x.stroke();
    for(const f of [.2,.55,.97]){x.fillStyle=F.m[2];rrect(x,X(Lt*f)-2.5,ay-bw/2-1.5,5,bw+3,1.5);x.fill();}
    // la poignée, la détente, la hausse repliable, l'épaulière
    grip(x,X(Lt*.4),ay+bw/2,r2,F,true);x.fillStyle=Wd(ay-bw/2,bw);rrect(x,X(Lt*.2),ay+bw/2-1,Lt*s*.08,bw*.8,2);x.fill();
    x.fillStyle='#c9cdd2';x.fillRect(X(Lt*.55),ay-bw/2-7,2.5,7);x.fillRect(X(Lt*.92),ay-bw/2-5,2,5);
    // la balle qui dépasse de la bouche, prête : sa pointe, sa couleur, ses moustaches
    const tip=X(Lt);x.fillStyle=TIPC[p.cons]||'#c07a3e';x.beginPath();x.moveTo(tip,ay-bw*.36);x.quadraticCurveTo(tip+bw*.9,ay-bw*.3,tip+bw*1.1,ay);x.quadraticCurveTo(tip+bw*.9,ay+bw*.3,tip,ay+bw*.36);x.fill();x.stroke();
    if(GUIDES[p.guide]?.seek){x.strokeStyle='rgba(240,230,210,.9)';x.lineWidth=.8;for(const k of [-1,-.4,.4,1]){x.beginPath();x.moveTo(tip+bw*1.05,ay+k*1.2);x.quadraticCurveTo(tip+bw*1.6,ay+k*bw*.5,tip+bw*2.1,ay+k*bw*.8);x.stroke();}}
    x.restore();return X(Lt);}
  // --- l'affût : trépied, ou affût de campagne à roues pour un obusier
  if(o.inhand){}else if(A.howitzer||ms.has('roues')){carriage(x,D,G,X,ay,s,ground,F,r2);}
  else if(ms.has('trepied')){const hx=X(G.rs+G.act*.6),hh=ground-ay;x.strokeStyle=F.m[2];x.lineWidth=Math.max(2.5,d*s*.9);x.lineCap='round';x.beginPath();x.moveTo(hx,ay+r2);x.lineTo(hx+hh*.95,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*1.15,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*.2,ground+3);x.stroke();
    x.lineWidth=1;x.fillStyle=F.m[1];rrect(x,hx-7,ay+r2-3,14,8,2);x.fill();x.stroke();x.fillStyle=F.m[0];x.beginPath();x.arc(hx,ay+r2+1,2.5,0,7);x.fill();x.lineCap='butt';}
  if(ms.has('bipied')&&!o.inhand){const lx=X(G.b0+p.L*.62);x.strokeStyle=F.m[2];x.lineWidth=Math.max(1.8,d*s*.6);x.lineCap='round';x.beginPath();x.moveTo(lx,ay+2);x.lineTo(lx-9,ground-2);x.moveTo(lx,ay+2);x.lineTo(lx+9,ground-2);x.stroke();x.lineWidth=1;x.fillStyle=F.m[1];x.beginPath();x.arc(lx,ay+2,3,0,7);x.fill();x.stroke();for(const e of [-9,9]){x.fillStyle=INK;x.fillRect(lx+e-3,ground-3,6,2);}x.lineCap='butt';}
  // --- la crosse
  if(G.crewGun){x.fillStyle=M(ay-r2,r2*2);rrect(x,X(0),ay-r2*.7,G.stock*s,r2*1.4,2);x.fill();x.stroke();for(const o2 of [-1,1]){x.fillStyle=F.m[2];rrect(x,X(0)-3,ay+o2*r2*.9-3,7,6,2);x.fill();}x.fillStyle=Wd(ay,r2);rrect(x,X(0)-5,ay-r2*1.5,6,r2*3,2);x.fill();x.stroke();}
  else stockShape(x,G,X,ay,r2,s,F);
  // --- la boîte de culasse
  const R0=X(G.rs),Rw=G.act*s;x.fillStyle=M(ay-r2,r2*2);rrect(x,R0,ay-r2,Rw,r2*2,Math.min(4,r2*.4));x.fill();x.stroke();shine(x,R0,ay-r2,Rw,r2*2);
  // vis, gravures
  x.fillStyle=F.m[2];for(const f of [.12,.88])x.fillRect(R0+Rw*f-1,ay+r2*.45,2,2);
  if(F.gold){x.strokeStyle='rgba(232,196,90,.85)';x.lineWidth=.8;x.beginPath();for(let k=0;k<3;k++){const cx=R0+Rw*(.25+k*.22),cy=ay+r2*.1;x.moveTo(cx-Rw*.08,cy);x.bezierCurveTo(cx-Rw*.04,cy-r2*.6,cx+Rw*.04,cy+r2*.6,cx+Rw*.08,cy);}x.stroke();x.lineWidth=1;x.strokeStyle=INK;}
  // la manœuvre, selon la culasse
  const act=p.action;
  if(act==='verrou'||act==='culasse'){const hx=R0+Rw*.66;x.strokeStyle='#cfd4d9';x.lineWidth=Math.max(1.6,r2*.22);x.beginPath();x.moveTo(hx,ay-r2*.1);x.lineTo(hx+r2*.5,ay+r2*1.35);x.stroke();x.lineWidth=1;x.fillStyle=lin(x,ay+r2,ay+r2*1.8,['#eef1f3','#8f979e']);x.beginPath();x.arc(hx+r2*.55,ay+r2*1.45,Math.max(2.2,r2*.32),0,7);x.fill();x.stroke();x.fillStyle=INK;x.fillRect(R0+Rw*.3,ay-r2*.5,Rw*.34,1.2);}
  else if(act==='bascule'){x.fillStyle='#d5a94f';x.beginPath();x.arc(R0+Rw*.87,ay+r2*.1,Math.max(2.4,r2*.34),0,7);x.fill();x.stroke();x.strokeStyle='#d5d9dc';x.lineWidth=1.5;x.beginPath();x.moveTo(R0+Rw*.7,ay-r2*.85);x.lineTo(R0+Rw*.82,ay-r2*1.35);x.lineTo(R0+Rw*.94,ay-r2*.85);x.stroke();x.lineWidth=1;}
  else{// fenêtre d'éjection et levier d'armement
    x.fillStyle='#0c0e10';rrect(x,R0+Rw*.42,ay-r2*.55,Rw*.28,r2*.55,1.5);x.fill();x.fillStyle=lin(x,ay-r2*.55,ay,brass);x.fillRect(R0+Rw*.46,ay-r2*.42,Rw*.18,r2*.3);
    x.fillStyle='#c9cdd2';rrect(x,R0+Rw*.76,ay-r2*.75,Math.max(4,r2*.7),Math.max(2,r2*.28),1);x.fill();x.stroke();}
  if(act==='levier'){x.strokeStyle=F.m[1];x.lineWidth=Math.max(1.6,r2*.25);x.beginPath();const lx=R0+Rw*.1;x.moveTo(lx,ay+r2);x.lineTo(lx-r2*.6,ay+r2*2.6);x.quadraticCurveTo(lx+r2*.8,ay+r2*3.3,lx+r2*1.4,ay+r2*1.2);x.stroke();x.lineWidth=1;}
  if(act==='gaz'){const gx0=X(G.b0+p.L*.08),gl=p.L*s*.52,gy=ay-r2*1.4;x.fillStyle=M(gy,r2*.7);rrect(x,gx0,gy,gl,r2*.65,r2*.25);x.fill();x.stroke();x.fillStyle=F.m[2];x.fillRect(gx0+gl*.12,gy-r2*.3,Math.max(2,r2*.25),r2*.3);}
  if(act==='recul'){x.strokeStyle='#c9cdd2';x.lineWidth=Math.max(1.2,r2*.18);for(const f of [.18,.3,.42,.54]){const sx=R0+Rw*f;x.beginPath();x.moveTo(sx,ay-r2*.85);x.lineTo(sx+Rw*.13,ay+r2*.85);x.stroke();}x.lineWidth=1;}
  // la poignée pistolet, la détente et son pontet (pas pour un bullpup : la poignée est devant la culasse)
  const gx=G.bull?X(G.b0)-r2*.4:R0+Rw*.14;if(!(G.crewGun&&A.howitzer))grip(x,gx,ay+r2*.9,r2,F,G.crewGun);
  // --- le chargeur
  magazine(x,D,{...G,inhand:!!o.inhand},X,ay,r2,s,ground,F,brass);
  // --- le canon
  const bw=Math.max(2.2,Dout*s);const B0=X(G.b0),BL=p.L*s,TP=p.tube||'droit';
  if(A.multi){const show=Math.min(5,D.barrels||A.multi||4),mid=(show-1)/2;for(let q=0;q<show;q++){const o2=(q-mid)*.78;x.fillStyle=M(ay+o2*bw-bw/2,bw);rrect(x,B0,ay+o2*bw-bw/2,BL,bw,bw*.3);x.fill();x.stroke();}x.fillStyle=F.m[2];for(const f of [.05,.5,.95]){rrect(x,X(G.b0+p.L*f)-2.5,ay-bw*(mid*.78+.7),5,bw*(mid*1.56+1.4),2);x.fill();}x.fillStyle='#dce2e6';x.font=`${Math.max(7,r2*.9)}px system-ui`;x.fillText(`×${D.barrels||A.multi}`,B0+BL*.42,ay-bw*(mid*.78+1));}
  else if(TP==='conique'){x.fillStyle=M(ay-bw*.68,bw*1.36);x.beginPath();x.moveTo(B0,ay-bw*.68);x.lineTo(B0+BL,ay-bw*.38);x.lineTo(B0+BL,ay+bw*.38);x.lineTo(B0,ay+bw*.68);x.closePath();x.fill();x.stroke();}
  else{x.fillStyle=M(ay-bw/2,bw);rrect(x,B0,ay-bw/2,BL,bw,Math.min(bw*.3,3));x.fill();x.stroke();shine(x,B0,ay-bw/2,BL,bw);if(TP==='lourd'){x.fillStyle='rgba(25,29,32,.75)';for(const [f,w2] of [[.02,.2],[.27,.12],[.55,.09]]){rrect(x,B0+BL*f,ay-bw*.82,BL*w2,bw*1.64,2);x.fill();x.stroke();}}if(TP==='refroidi'){x.fillStyle='rgba(38,43,47,.8)';rrect(x,B0,ay-bw*1.15,BL*.72,bw*2.3,3);x.fill();x.stroke();x.fillStyle='#0b0d0e';for(let gx=B0+bw;gx<B0+BL*.68;gx+=bw*1.5)for(const yy of [-.65,.1]){x.beginPath();x.ellipse(gx,ay+yy*bw,bw*.28,bw*.18,0,0,7);x.fill();}}}
  // tube cannelé : des gorges longues
  if(ms.has('cannelures')&&!A.multi){x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=Math.max(.8,bw*.12);const n=Math.max(2,Math.floor(p.L/(d*8)));for(let k=0;k<n;k++){const a0=G.b0+p.L*.12+k*p.L*.7/n;x.beginPath();x.moveTo(X(a0),ay-bw*.12);x.lineTo(X(a0+p.L*.7/n*.8),ay-bw*.12);x.moveTo(X(a0),ay+bw*.18);x.lineTo(X(a0+p.L*.7/n*.8),ay+bw*.18);x.stroke();}x.lineWidth=1;x.strokeStyle=INK;}
  // radiateur à ailettes de cuivre
  if(ms.has('ailettes')){const n=Math.max(6,Math.floor(p.L*.45/(d*.9)));for(let k=0;k<n;k++){const fx=X(G.b0+p.L*.08+k*p.L*.45/n);x.fillStyle=lin(x,ay-bw*1.7,ay+bw*1.7,['#f0b27a','#c46d38','#7a3c16']);x.fillRect(fx,ay-bw*1.7,Math.max(1.2,d*s*.35),bw*3.4);}}
  // le garde-main : bois (arme d'épaule), métal ajouré (automatique), rien sur une pièce
  if(!G.crewGun){const hw=p.L*s*(ACTIONS[act]?.auto?.36:.42),hy=ay-r2*.78,hh=r2*1.56;
    if(act==='pompe'){x.fillStyle=Wd(hy,hh);rrect(x,B0+p.L*s*.18,hy+hh*.15,hw*.7,hh*.7,3);x.fill();x.stroke();x.strokeStyle='rgba(0,0,0,.4)';for(let k=1;k<6;k++){const q=B0+p.L*s*.18+hw*.7*k/6;x.beginPath();x.moveTo(q,hy+hh*.2);x.lineTo(q,hy+hh*.8);x.stroke();}x.strokeStyle=INK;}
    else if(ACTIONS[act]?.auto){x.fillStyle=M(hy,hh);rrect(x,B0,hy,hw,hh,3);x.fill();x.stroke();x.fillStyle='#0c0e10';for(let q=B0+hh*.6;q<B0+hw-hh*.5;q+=hh*.75){x.beginPath();x.ellipse(q,ay,hh*.2,hh*.28,0,0,7);x.fill();}}
    else{x.fillStyle=Wd(hy,hh);rrect(x,B0,hy,hw,hh,hh*.45);x.fill();x.stroke();grain(x,B0,hy,hw,hh,F);}
    // tube magasin (pompe, levier) sous le canon
    if(D.feed?.tube&&p.mag>1){const tl=Math.min(p.L*.88,p.mag*COL*.95+10)*s,tw=Math.max(2,Dc*s*1.1);x.fillStyle=M(ay+bw/2,tw);rrect(x,B0,ay+bw/2+.5,tl,tw,tw/2);x.fill();x.stroke();}}
  // guidon, hausse
  x.fillStyle='#d6dade';x.fillRect(X(G.m0)-4,ay-bw/2-5,2,5);if(!ms.has('lunette')&&!ms.has('reflex')){x.fillRect(R0+Rw*.95,ay-r2-3,5,3);x.fillStyle=INK;x.fillRect(R0+Rw*.95+2,ay-r2-3,1,2);}
  // --- la bouche
  const m0=G.m0;
  if(ms.has('manchon')){const hh=Math.max(bw*2.3,7)*Math.pow((p.supVol??250)/250,.2);x.fillStyle=M(ay-hh/2,hh);rrect(x,X(m0),ay-hh/2,G.dev*s,hh,hh*.25);x.fill();x.stroke();shine(x,X(m0),ay-hh/2,G.dev*s,hh);x.strokeStyle='rgba(0,0,0,.35)';const nb=Math.round(p.supBaffles??5)+1;for(let k=1;k<nb;k++){const q=X(m0+G.dev*k/nb);x.beginPath();x.moveTo(q,ay-hh/2+1);x.lineTo(q,ay+hh/2-1);x.stroke();}x.strokeStyle=INK;}
  else if(ms.has('frein')){const hh=Math.max(bw*1.7,5);x.fillStyle=M(ay-hh/2,hh);rrect(x,X(m0),ay-hh/2,G.dev*s,hh,1.5);x.fill();x.stroke();x.fillStyle='#0c0e10';for(let k=1;k<4;k++){const q=X(m0+G.dev*k/4);x.beginPath();x.moveTo(q-1.5,ay-hh/2);x.lineTo(q+1,ay-hh/2);x.lineTo(q-.5,ay+hh/2);x.lineTo(q-3,ay+hh/2);x.closePath();x.fill();}}
  else if(ms.has('cacheflamme')){x.fillStyle=M(ay-bw,bw*2);x.fillRect(X(m0),ay-bw/2,G.dev*s*.3,bw);for(const o2 of [-1,-.33,.33,1]){x.fillRect(X(m0+G.dev*.3),ay+o2*bw*.42-.7,G.dev*s*.7,1.4);}}
  // la baïonnette : une lame sous la bouche
  if(ms.has('baionnette')&&!G.crewGun){const by=ay+bw*.9,bl=G.bay*s;x.fillStyle=F.m[2];rrect(x,X(m0-G.bay*.25),by-2,8,4,1.5);x.fill();x.fillStyle=lin(x,by-2,by+3,['#f3f5f7','#aab2ba','#6a737c']);x.beginPath();x.moveTo(X(m0-G.bay*.25)+6,by-1.6);x.lineTo(X(m0-G.bay*.25)+6+bl,by);x.lineTo(X(m0-G.bay*.25)+6,by+2.2);x.closePath();x.fill();x.stroke();}
  // --- l'infrarouge : le tube convertisseur (gros, sombre, œilleton de caoutchouc), la lampe au-dessus (sa taille suit sa
  // puissance, son verre noir filtré), le câble vers la batterie dans le dos
  if(ms.has('infrarouge')){const W=Math.max(10,Math.min(150,p.irW??35)),q=p.irQ??1;const tw=Math.max(COL*3.4*s,Rw*1.2),th=Math.max(7,(d*2.8+6)*s)*(.85+q*.15),tx=R0+Rw*.0,ty=ay-r2-th-(ms.has('lunette')?th+6:6);
    x.fillStyle='#2e3a33';rrect(x,tx,ty,tw,th,th*.35);x.fill();x.stroke();x.fillStyle='#161a18';rrect(x,tx-th*.5,ty+th*.12,th*.6,th*.76,th*.3);x.fill();x.stroke();
    const lr=Math.max(6,th*.85*Math.sqrt(W/35)),lx=tx+tw*.62,ly=ty-lr*2-2;x.fillStyle='#3a4640';rrect(x,lx,ly,lr*2.4,lr*2,lr*.5);x.fill();x.stroke();
    const gl=x.createRadialGradient(lx+lr*2.4,ly+lr,1,lx+lr*2.4,ly+lr,lr);gl.addColorStop(0,'#5a1418');gl.addColorStop(.6,'#1a0a0c');gl.addColorStop(1,'#070304');x.fillStyle=gl;x.beginPath();x.ellipse(lx+lr*2.4,ly+lr,lr*.35,lr*.9,0,0,7);x.fill();x.stroke();
    x.fillStyle=INK;x.fillRect(lx+lr*.8,ly+lr*2,2,ty-ly-lr*2);x.strokeStyle='#1c1c1c';x.lineWidth=Math.max(1,1.4*s);x.beginPath();x.moveTo(tx,ty+th*.8);x.quadraticCurveTo(tx-th*1.4,ty+th*2.2,tx-th*2.4,ay+r2*2);x.stroke();x.strokeStyle=INK;x.lineWidth=1;}
  // --- les visées : lunette, viseur à lichen
  if(ms.has('lunette')){const lx=R0+Rw*.05,lw=Math.max(COL*3*s,Rw*1.1),lh=Math.max(5,(d*2.2+4)*s),ly=ay-r2-lh-5;x.fillStyle=M(ly,lh);rrect(x,lx,ly,lw,lh,lh/2);x.fill();x.stroke();
    x.fillStyle=M(ly-lh*.25,lh*1.5);rrect(x,lx+lw*.78,ly-lh*.25,lw*.22,lh*1.5,lh*.5);x.fill();x.stroke();rrect(x,lx-lw*.04,ly-lh*.12,lw*.16,lh*1.24,lh*.4);x.fill();x.stroke();
    x.fillStyle=F.m[2];x.fillRect(lx+lw*.45,ly-lh*.45,lh*.5,lh*.45);x.fillRect(lx+lw*.25,ly+lh,3,5);x.fillRect(lx+lw*.62,ly+lh,3,5);
    const gl=x.createLinearGradient(lx+lw,ly-lh*.25,lx+lw,ly+lh*1.25);gl.addColorStop(0,'#bff7ee');gl.addColorStop(.5,'#3aa89a');gl.addColorStop(1,'#0e3a36');x.fillStyle=gl;x.fillRect(lx+lw-1.5,ly-lh*.2,2,lh*1.4);}
  else if(ms.has('reflex')){const lx=R0+Rw*.45,lw=Math.max(8,Rw*.35),lh=Math.max(6,r2*1.1),ly=ay-r2-lh-2;x.fillStyle=M(ly,lh);rrect(x,lx,ly,lw,lh,2);x.fill();x.stroke();x.fillStyle='rgba(120,220,200,.25)';x.fillRect(lx+lw*.15,ly+2,lw*.7,lh-4);
    const gd=x.createRadialGradient(lx+lw*.5,ly+lh*.5,0,lx+lw*.5,ly+lh*.5,lh*.5);gd.addColorStop(0,'rgba(170,255,150,1)');gd.addColorStop(.3,'rgba(110,230,120,.6)');gd.addColorStop(1,'rgba(110,230,120,0)');x.fillStyle=gd;x.beginPath();x.arc(lx+lw*.5,ly+lh*.5,lh*.5,0,7);x.fill();}
  // --- poignée avant
  if(ms.has('poignee')){const gx2=X(G.b0+p.L*.25);x.fillStyle=M(ay,r2*2.6);rrect(x,gx2-3,ay+r2*.75,7,r2*2.5,3);x.fill();x.stroke();x.strokeStyle='rgba(0,0,0,.4)';for(let k=1;k<5;k++){x.beginPath();x.moveTo(gx2-2,ay+r2*.8+k*r2*.45);x.lineTo(gx2+3,ay+r2*.8+k*r2*.45);x.stroke();}x.strokeStyle=INK;}
  // --- le bouclier
  // la plaque suit la conception : sa taille (le calibre et le réglage), son matériau (sa teinte), son épaisseur (le chant) ; l'acier garde la teinte de la finition
  if(ms.has('bouclier')&&!o.inhand){const S=D.shield||{h:.2,w:.09,t:1.8,mat:'acier'},Mt=S.mat==='acier'?null:MATS[S.mat];const sx=X(G.b0+Math.min(p.L*.2,40)),ww=Math.max(14,S.w*1000*s);
    const cs=Mt?[tint(Mt.col,.28),Mt.col,tint(Mt.col,-.35)]:[F.m[0],F.m[1],F.m[2]],top=ground-2-S.h*1000*s;x.fillStyle=lin(x,top,ground,cs);x.globalAlpha=.94;x.beginPath();x.moveTo(sx,top);x.lineTo(sx+ww*.35,top-ww*.25);x.lineTo(sx+ww*.35,ground-2-ww*.25);x.lineTo(sx,ground-2);x.closePath();x.fill();x.stroke();x.globalAlpha=1;
    const th=Math.max(1.4,Math.min(ww*.3,S.t*s*4));x.fillStyle=Mt?tint(Mt.col,.55):'#e8edf0';x.fillRect(sx-th*.35,top,th,ground-2-top);
    if(ay>top+4){x.fillStyle='#0d0f10';rrect(x,sx+ww*.08,ay-5,ww*.2,7,2);x.fill();}x.fillStyle=cs[2];for(let k=0;k<4;k++){x.beginPath();x.arc(sx+ww*.17,top+(ground-2-top)*(.12+k*.25),1.4,0,7);x.fill();}}
  x.restore();return X(m0+G.dev);}

function grain(x,a,b,w,h,F){const r=rnd(Math.round(a*7+b*3));x.save();rrect(x,a,b,w,h,h*.4);x.clip();x.strokeStyle='rgba(40,20,8,.22)';x.lineWidth=.7;for(let k=0;k<7;k++){const y=b+h*(.12+k*.12)+r()*2;x.beginPath();x.moveTo(a,y);x.bezierCurveTo(a+w*.3,y+r()*3-1.5,a+w*.6,y+r()*3-1.5,a+w,y+r()*2-1);x.stroke();}x.restore();}
function grip(x,gx,top,r2,F,metal){const h=r2*2.1,w=r2*1.05;x.fillStyle=metal?lin(x,top,top+h,F.m):lin(x,top,top+h,F.w);x.beginPath();x.moveTo(gx,top);x.lineTo(gx+w,top);x.lineTo(gx+w*.55,top+h);x.quadraticCurveTo(gx-w*.25,top+h*1.05,gx-w*.45,top+h*.9);x.closePath();x.fill();x.stroke();
  x.fillStyle='rgba(0,0,0,.25)';for(let k=0;k<5;k++)for(let q=0;q<2;q++){x.beginPath();x.arc(gx+w*(.25+q*.25)-k*w*.07,top+h*(.25+k*.13),.7,0,7);x.fill();}
  // pontet et détente
  x.strokeStyle=F.m[2];x.lineWidth=Math.max(1,r2*.16);x.beginPath();x.arc(gx+w*1.55,top+r2*.05,r2*.62,0,Math.PI);x.stroke();x.lineWidth=Math.max(1,r2*.18);x.strokeStyle='#bfc5ca';x.beginPath();x.moveTo(gx+w*1.5,top-1);x.quadraticCurveTo(gx+w*1.62,top+r2*.35,gx+w*1.4,top+r2*.5);x.stroke();x.lineWidth=1;x.strokeStyle=INK;}
function stockShape(x,G,X,ay,r2,s,F){const S=G.stock,T=G.ST;const wood=lin(x,ay-r2*1.2,ay+r2*3.2,F.w);
  if(T==='sans')return;
  if(T==='squelette'||T==='pliante'){const top=ay-r2*.7,bot=ay+r2*(T==='pliante'?1.1:2.6);x.strokeStyle=lin(x,top,bot,F.m);x.lineWidth=Math.max(2,r2*.42);x.lineCap='round';x.beginPath();x.moveTo(X(S),ay-r2*.5);x.lineTo(X(2),top);x.lineTo(X(2),bot);x.lineTo(X(S*.55),ay+r2*1.1);x.lineTo(X(S),ay+r2*.6);x.stroke();x.lineWidth=1;x.lineCap='butt';
    if(T==='pliante'){x.fillStyle=F.m[1];x.beginPath();x.arc(X(S),ay,r2*.45,0,7);x.fill();x.stroke();}x.fillStyle='#1d1d1f';rrect(x,X(0),top-2,4,bot-top+4,2);x.fill();return;}
  if(T==='bullpup'){const L=G.b0+(G.act*.15);x.fillStyle=lin(x,ay-r2*1.3,ay+r2*2.4,[F.m[1],F.m[2],'#101214']);x.beginPath();x.moveTo(X(0),ay-r2*1.1);x.lineTo(X(L),ay-r2*1.1);x.lineTo(X(L),ay+r2*1.2);x.lineTo(X(G.rs+G.act*.35),ay+r2*1.3);x.quadraticCurveTo(X(G.rs),ay+r2*2.6,X(0),ay+r2*2.4);x.closePath();x.fill();x.stroke();
    x.fillStyle='rgba(255,255,255,.08)';x.fillRect(X(0),ay-r2*1.05,(L)*s,r2*.3);x.fillStyle='#1d1d1f';rrect(x,X(0)-2,ay-r2*1.1,4,r2*3.5,2);x.fill();return;}
  // bois plein : une crosse galbée, la poignée de la main, le talon, le grain du bois
  x.fillStyle=wood;x.beginPath();x.moveTo(X(0),ay-r2*1.15);x.quadraticCurveTo(X(S*.5),ay-r2*1.05,X(S),ay-r2*.85);x.lineTo(X(S),ay+r2*.9);x.quadraticCurveTo(X(S*.72),ay+r2*1.1,X(S*.52),ay+r2*1.55);x.quadraticCurveTo(X(S*.25),ay+r2*2.6,X(0),ay+r2*3.25);x.closePath();x.fill();x.stroke();
  const r=rnd(Math.round(S*13));x.save();x.clip();x.strokeStyle='rgba(40,20,8,.25)';x.lineWidth=.8;for(let k=0;k<9;k++){const y=ay-r2+k*r2*.48;x.beginPath();x.moveTo(X(0),y+r2*.4);x.bezierCurveTo(X(S*.3),y+r()*r2*.6,X(S*.6),y-r()*r2*.4,X(S),y-r2*.2);x.stroke();}x.restore();
  x.fillStyle='rgba(255,255,255,.1)';x.beginPath();x.moveTo(X(2),ay-r2*1.05);x.quadraticCurveTo(X(S*.5),ay-r2*.95,X(S-2),ay-r2*.78);x.lineTo(X(S-2),ay-r2*.5);x.quadraticCurveTo(X(S*.5),ay-r2*.7,X(2),ay-r2*.7);x.closePath();x.fill();
  x.fillStyle='#2a1a0e';rrect(x,X(0)-1,ay-r2*1.15,4,r2*4.4,1.5);x.fill();
  if(F.gold){x.strokeStyle='rgba(232,196,90,.9)';x.lineWidth=.8;rrect(x,X(S*.3),ay-r2*.6,S*s*.35,r2*1.3,r2*.5);x.stroke();x.lineWidth=1;x.strokeStyle=INK;}}
function magazine(x,D,G,X,ay,r2,s,ground,F,brass){const p=D.p,A=ACTIONS[p.action]||{};const mag=p.mag,Dc=D.Dc||p.d*1.45,COL=D.COL,feed=p.feed||(A.auto&&mag>=50?'bande':p.action==='pompe'||p.action==='levier'?'tube':mag>40?'tambour':mag>12?'courbe':'boite');if(mag<=1||A.mortar||feed==='tube'||feed==='interne')return;
  const mx0=G.bull?X(G.rs+G.act*.25):X(G.rs+G.act*.55);
  // une bande : des maillons et leurs cartouches, qui pendent vers la caisse
  if(feed==='bande'&&!G.inhand){const by=ay+r2;const pts=[];for(let k=0;k<=14;k++){const q=k/14;pts.push([mx0+Math.sin(q*2.6)*10-q*16,by+q*Math.min(ground-by-8,62)]);}
    for(let k=0;k<pts.length;k++){const [px,py]=pts[k];x.fillStyle=lin(x,py-2,py+2,brass);rrect(x,px-COL*s*.5,py-Dc*s*.55,COL*s,Math.max(2,Dc*s*1.1),1);x.fill();x.strokeStyle='rgba(0,0,0,.45)';x.stroke();x.fillStyle=TIPC[p.cons]||'#c07a3e';x.fillRect(px+COL*s*.35,py-Dc*s*.3,COL*s*.15,Math.max(1,Dc*s*.6));}
    const bw2=Math.max(16,COL*s*1.8),bh=Math.max(11,Math.min(40,mag*.12*s*4));x.fillStyle=lin(x,ground-bh,ground,['#6c7a4c','#4f5a3a','#343c26']);rrect(x,pts[14][0]-bw2*.6,ground-bh,bw2,bh,2);x.fill();x.strokeStyle=INK;x.stroke();x.fillStyle='rgba(255,255,255,.4)';x.fillRect(pts[14][0]-bw2*.4,ground-bh+3,bw2*.8,1.5);return;}
  if(feed==='bande'){for(let k=0;k<4;k++){const px=mx0-k*COL*s*.35,py=ay+r2+k*Dc*s*1.3;x.fillStyle=lin(x,py-2,py+2,brass);x.fillRect(px-COL*s*.5,py,COL*s,Math.max(1.5,Dc*s*1.1));}return;}
  // plateau supérieur : grand disque vu de profil, au-dessus de la culasse
  if(feed==='plateau'){const rr=Math.max(8,Math.sqrt(mag)*Dc*s*.9),cy=ay-r2-rr*.35;x.fillStyle=lin(x,cy-rr*.18,cy+rr*.18,F.m);x.beginPath();x.ellipse(mx0+rr*.2,cy,rr,Math.max(3,rr*.18),0,0,7);x.fill();x.stroke();x.fillStyle=F.m[2];x.beginPath();x.arc(mx0+rr*.2,cy,Math.max(2,rr*.12),0,7);x.fill();return;}
  // alimentation hélicoïdale : cylindre rainuré couché au-dessus de l'arme
  if(feed==='helicoidal'){const L=Math.max(24,Math.min(100,mag*Dc*.24))*s,H=Math.max(6,Dc*s*3),xx=mx0-L*.2,yy=ay-r2-H-3;x.fillStyle=lin(x,yy,yy+H,F.m);rrect(x,xx,yy,L,H,H/2);x.fill();x.stroke();x.strokeStyle='rgba(255,255,255,.2)';for(let k=1;k<9;k++){const q=xx+L*k/9;x.beginPath();x.moveTo(q-H*.22,yy+H*.15);x.lineTo(q+H*.22,yy+H*.85);x.stroke();}x.strokeStyle=INK;return;}
  // trémie gravitaire : une boîte évasée plantée sur la culasse
  if(feed==='tremie'){const H=Math.max(14,Math.min(60,Math.sqrt(mag)*Dc*s*1.4)),W=Math.max(14,Math.min(70,COL*s*2.4)),yy=ay-r2-H;x.fillStyle=lin(x,yy,ay-r2,F.m);x.beginPath();x.moveTo(mx0-W*.58,yy);x.lineTo(mx0+W*.58,yy);x.lineTo(mx0+W*.28,ay-r2);x.lineTo(mx0-W*.28,ay-r2);x.closePath();x.fill();x.stroke();x.fillStyle='#d9b14f';for(let k=0;k<5;k++)x.fillRect(mx0-W*.35+k*W*.16,yy+3,Math.max(1,COL*s*.35),Math.max(2,Dc*s));return;}
  // un tambour
  if(feed==='tambour'){const rr=Math.max(7,Math.sqrt(mag)*Dc*s*1.25);const cx=mx0+rr*.3,cy=ay+r2+rr*.95;x.fillStyle=lin(x,cy-rr,cy+rr,F.m);x.beginPath();x.arc(cx,cy,rr,0,7);x.fill();x.strokeStyle=INK;x.stroke();x.strokeStyle='rgba(255,255,255,.18)';x.beginPath();x.arc(cx,cy,rr*.72,0,7);x.stroke();x.fillStyle=F.m[2];x.beginPath();x.arc(cx,cy,rr*.22,0,7);x.fill();x.strokeStyle=INK;x.stroke();
    x.fillStyle='#d6dade';x.beginPath();x.moveTo(cx+rr*.12,cy-rr*.08);x.lineTo(cx+rr*.5,cy-rr*.3);x.lineTo(cx+rr*.5,cy-rr*.18);x.closePath();x.fill();return;}
  // une boîte, droite ou courbe ; on voit la cartouche du dessus
  const mh=Math.max(7,Math.min(r2*9,mag/2*Dc*s*1.02+6)),mw=Math.max(5,COL*s*1.08);const curve=feed==='courbe'?Math.min(.72,.25+mag/100):0;
  x.fillStyle=lin(x,ay,ay+mh,F.m);x.beginPath();x.moveTo(mx0,ay+r2);x.lineTo(mx0+mw,ay+r2);x.quadraticCurveTo(mx0+mw+mh*curve*.4,ay+r2+mh*.6,mx0+mw+mh*(.15+curve*.7),ay+r2+mh);x.lineTo(mx0+mh*(.15+curve*.7),ay+r2+mh);x.quadraticCurveTo(mx0+mh*curve*.4,ay+r2+mh*.6,mx0,ay+r2);x.closePath();x.fill();x.stroke();
  x.strokeStyle='rgba(255,255,255,.15)';for(let k=1;k<4;k++){const y=ay+r2+mh*k/4;x.beginPath();x.moveTo(mx0+mh*curve*.3*k/4+2,y);x.lineTo(mx0+mw+mh*curve*.3*k/4-2,y);x.stroke();}
  x.fillStyle=F.m[2];rrect(x,mx0+mh*(.15+curve*.7)-1,ay+r2+mh-2,mw+2,3,1);x.fill();x.strokeStyle=INK;}
// l'affût de campagne : un berceau, deux roues à rayons, la flèche qui descend à la bêche
function carriage(x,D,G,X,ay,s,ground,F,r2){const p=D.p;const cx=X(G.rs+G.act*.8);const R=Math.max(10,(ground-ay)*.8);const wy=ground-R;
  const kind=p.carriage||'roues';
  if(kind==='plateforme'){const W=Math.max(34,R*2.3);x.fillStyle=lin(x,ground-10,ground,[F.m[0],F.m[1],F.m[2]]);x.beginPath();x.ellipse(cx,ground-4,W,10,0,0,7);x.fill();x.stroke();x.fillStyle=F.m[1];x.beginPath();x.arc(cx,ground-9,Math.max(7,R*.42),0,7);x.fill();x.stroke();x.strokeStyle=F.m[2];x.lineWidth=Math.max(3,r2*.5);x.beginPath();x.moveTo(cx,ground-9);x.lineTo(cx,ay+r2);x.stroke();x.lineWidth=1;for(let k=0;k<12;k++){const a=k/12*Math.PI*2;x.fillStyle=k%2?F.m[1]:F.m[2];x.fillRect(cx+Math.cos(a)*W*.72-2,ground-7+Math.sin(a)*5,4,4);}return;}
  if(kind==='traineau'){x.strokeStyle=lin(x,ay,ground,[F.m[1],F.m[2]]);x.lineWidth=Math.max(3,r2*.55);x.lineCap='round';for(const q of [-1,1]){x.beginPath();x.moveTo(cx-R*1.2,ground+q);x.quadraticCurveTo(cx-R*1.55,ground-2,cx-R*1.65,ground-8);x.moveTo(cx-R*1.2,ground+q);x.lineTo(cx+R*.9,ground+q);x.stroke();}x.beginPath();x.moveTo(cx,ground);x.lineTo(cx,ay+r2);x.stroke();x.lineWidth=1;x.lineCap='butt';x.fillStyle=F.m[1];rrect(x,cx-R*.55,ay+r2*.6,R*1.15,r2,3);x.fill();x.stroke();return;}
  x.strokeStyle=lin(x,ay,ground,[F.m[1],F.m[2]]);x.lineWidth=Math.max(3,r2*.55);x.lineCap='round';x.beginPath();x.moveTo(cx,wy);x.lineTo(X(-G.stock*.8),ground-2);x.stroke();x.fillStyle=F.m[2];x.beginPath();x.moveTo(X(-G.stock*.8)-6,ground-2);x.lineTo(X(-G.stock*.8)+2,ground-2);x.lineTo(X(-G.stock*.8)-2,ground+4);x.closePath();x.fill();
  if(kind==='bifleche'){x.beginPath();x.moveTo(cx,wy);x.lineTo(X(-G.stock*.72),ground-11);x.moveTo(cx,wy);x.lineTo(X(-G.stock*.72),ground+5);x.stroke();for(const yy of [ground-11,ground+5]){x.fillStyle=F.m[2];x.fillRect(X(-G.stock*.72)-7,yy-2,10,4);}}
  x.lineWidth=Math.max(2,r2*.4);x.beginPath();x.moveTo(cx,wy);x.lineTo(cx,ay+r2);x.stroke();x.lineWidth=1;x.lineCap='butt';x.fillStyle=lin(x,ay+r2*.5,ay+r2*1.6,F.m);rrect(x,X(G.rs),ay+r2*.6,(G.act+p.L*.3)*s,r2*.9,3);x.fill();x.strokeStyle=INK;x.stroke();
  const wood=lin(x,wy-R,wy+R,['#8a5a2e','#5a3616']);x.strokeStyle=wood;x.lineWidth=Math.max(2.5,R*.13);x.beginPath();x.arc(cx,wy,R*.92,0,7);x.stroke();x.lineWidth=Math.max(1,R*.05);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;x.beginPath();x.moveTo(cx+Math.cos(a)*R*.18,wy+Math.sin(a)*R*.18);x.lineTo(cx+Math.cos(a)*R*.86,wy+Math.sin(a)*R*.86);x.stroke();}
  x.lineWidth=Math.max(1.2,R*.05);x.strokeStyle='#23272b';x.beginPath();x.arc(cx,wy,R,0,7);x.stroke();x.fillStyle=F.m[1];x.beginPath();x.arc(cx,wy,R*.17,0,7);x.fill();x.lineWidth=1;x.strokeStyle=INK;x.stroke();}

// ---------- la munition en demi-coupe ----------
// Rend la liste des pièces montrées (pour la légende). o.labels : dessiner les renvois ; o.compact : médaillon.
export function drawRound(x,D,x0,y0,w,h,o={}){const p=D.p,C=CONSTRUCTIONS[p.cons]||CONSTRUCTIONS.fmj;const d=p.d,l=D.l,r=d/2;const CM=CASEMATS[p.caseMat]||CASEMATS.laiton,RM=p.rim||'sans';
  const pel=D.pel>1,rocket=D.rocket;const caseLen=D.caseLen,Dc=D.Dc||d*1.45,neck=Math.min(D.neckL??d*1.1,caseLen*.5),sh=Math.min(D.shL??0,caseLen*.4);
  const out=l*.7,seat=l-out,COL=rocket?D.caseLen:caseLen+out;const nose=Math.min(D.noseLen,l*.95),shank=Math.max(0,l-nose);
  const parts=[];x.save();
  // l'échelle : la munition entière, ses renvois au-dessus et au-dessous
  const padT=o.compact?16:46,padB=o.compact?14:54,big=Math.max(Dc,rocket?d*(1+(p.fins?(p.finSize??1)*1.2:0)):d)*(RM==='bourrelet'?1.2:1);
  const sc=Math.min((w-28)/(COL+(GUIDES[p.guide]?.seek?d*1.5:0)),(h-padT-padB)/big);const ox=x0+14+Math.max(0,(w-28-COL*sc)/2),Y=y0+padT+(h-padT-padB)/2;const px=v=>ox+v*sc,py=v=>Y-v*sc;
  const labels=[];const tag=(v,rr,text,below)=>{labels.push({x:px(v),y:py(below?-rr:rr),text,below});parts.push(text);};
  // --- le profil de l'étui (demi-profil : [x, rayon])
  const straight=sh<.02*d||D.pistol&&p.caseD==null;const bodyEnd=caseLen-neck-(straight?0:sh);const Rb=Dc/2,Rn=straight?Rb*.97:r+d*.07;
  const caseProf=[];if(!rocket){const rimR=RM==='bourrelet'?Rb*1.2:Rb*.99,rs=Math.min(Dc,Math.max(.1,bodyEnd))* .55;caseProf.push([0,rimR*.9],[rs*.08,rimR]);
    if(RM==='bourrelet')caseProf.push([rs*.2,rimR],[rs*.22,Rb]);else{caseProf.push([rs*.2,rimR],[rs*.24,Rb*.78],[rs*.4,Rb*.78],[rs*.48,Rb]);}
    if(RM==='ceinture')caseProf.push([rs*.6,Rb*1.07],[rs*.9,Rb*1.07],[rs*.95,Rb]);
    caseProf.push([bodyEnd,Rb*.965]);if(!straight)caseProf.push([bodyEnd+sh,Rn]);caseProf.push([caseLen,Rn]);}
  const path=(prof,sgn=1,close=true)=>{x.beginPath();prof.forEach(([a,b],i)=>i?x.lineTo(px(a),py(b*sgn)):x.moveTo(px(a),py(b*sgn)));for(let i=prof.length-1;i>=0;i--)x.lineTo(px(prof[i][0]),py(-prof[i][1]*sgn));if(close)x.closePath();};
  const halfPath=(prof,lower)=>{x.beginPath();x.moveTo(px(prof[0][0]),Y);prof.forEach(([a,b])=>x.lineTo(px(a),py(lower?-b:b)));x.lineTo(px(prof[prof.length-1][0]),Y);x.closePath();};
  // --- le profil de la balle
  const b0=rocket?D.boost.Lm:caseLen-seat;const sub=C.sub||1,rr=r*sub;const boat=Math.max(0,Math.min(.9,p.boat??(p.base==='bt'?.3:0)));
  const tipR=Math.max(rr*(p.nose==='plate'?.55:p.nose==='ronde'?.12:.02),rr*(D.meplat||0));const ex={pointue:[1.7,.75],ogive:[2,.5],ronde:[2.4,.45],plate:[3,.35]}[p.nose]||[2,.5];
  const bl=Math.min(shank*.55,d*.7)*boat/.3*.5;const bulProf=[[0,rr*(1-boat*.45)],[bl,rr]];const bands=Math.min(4,p.bands||0);
  for(let k=0;k<bands;k++){const c0=shank*(.25+k*.14);bulProf.push([c0,rr],[c0+d*.03,rr*.93],[c0+d*.09,rr*.93],[c0+d*.12,rr]);}
  bulProf.push([shank,rr]);for(let k=1;k<=16;k++){const t=k/16;bulProf.push([shank+nose*t,tipR+(rr-tipR)*Math.pow(Math.max(0,1-Math.pow(t,ex[0])),ex[1])]);}
  const Bp=bulProf.map(([a,b])=>[b0+a,b]);
  const brassG=(a,b)=>lin(x,py(a),py(b),CM.col);
  // ================= L'EXTÉRIEUR (moitié haute) puis la COUPE (moitié basse) =================
  if(rocket){rocketRound(x,D,p,C,px,py,Y,sc,tag,parts,Bp,halfPath);}
  else if(CM.k===0){// sans étui : un bloc de poudre moulée, la balle enfoncée dedans
    const blk=[[0,Rb],[caseLen,Rb]];x.fillStyle=lin(x,py(Rb),py(-Rb),CM.col);path(blk);x.fill();x.strokeStyle='#2a1a0c';x.stroke();
    x.save();halfPath(blk,true);x.clip();grains(x,px(0),Y,caseLen*sc,Rb*sc,'#2a1d10','#b09058');x.restore();tag(caseLen*.4,Rb,'poudre moulée (sans étui)',false);tag(caseLen*.1,Rb,'amorce noyée',true);
    x.fillStyle='#caa24a';x.beginPath();x.arc(px(d*.12),py(-Rb*.3),Math.max(1.4,Rb*.18*sc),0,7);x.fill();}
  else if(pel&&p.cons!=='duplex'){// une cartouche de chevrotine : douille de carton, culot de laiton, bourre
    const hull=[[0,Rb*1.1],[Dc*.06,Rb*1.1],[Dc*.07,Rb],[caseLen+out,Rb]];x.fillStyle=lin(x,py(Rb),py(-Rb),['#d9483f','#b3302a','#6e1a16']);path(hull);x.fill();x.strokeStyle=INK;x.stroke();x.fillStyle=brassG(Rb,-Rb);x.fillRect(px(0),py(Rb*1.1),caseLen*.28*sc,Rb*2.2*sc);x.strokeRect(px(0),py(Rb*1.1),caseLen*.28*sc,Rb*2.2*sc);
    x.save();halfPath(hull,true);x.clip();x.fillStyle='#e9dcc0';x.fillRect(px(caseLen*.1),Y,(caseLen*.4)*sc,Rb*sc);grains(x,px(caseLen*.1),Y,caseLen*.28*sc,Rb*.9*sc,'#2a1d10','#8b8b6b');x.fillStyle='#caa76a';x.fillRect(px(caseLen*.42),Y,Rb*.6*sc,Rb*sc);
    const n=Math.min(D.pel,24);const r1=rnd(5);for(let k=0;k<n;k++){const fx=caseLen*.5+(k%6+.5)*(caseLen*.5+out)/6*.95,fy=-(r1()*.8+.1)*Rb;if(C.dart){x.fillStyle='#9aa4ad';x.fillRect(px(caseLen*.5),py(fy),(caseLen*.5+out)*sc*.9,Math.max(1,d*.12*sc));}else{x.fillStyle=lin(x,py(fy)-3,py(fy)+3,['#b8bec3','#6d7378']);x.beginPath();x.arc(px(fx),py(fy),Math.max(1.5,Math.min(Rb*.32,(caseLen*.5+out)/12)*sc),0,7);x.fill();x.stroke();}}x.restore();
    tag(caseLen*.1,Rb*1.1,'culot de laiton',false);tag(caseLen*.65,Rb,C.dart?`${D.pel} fléchettes`:`${D.pel} plombs`,true);tag(caseLen*.46,Rb,'bourre',true);tag(caseLen*.2,Rb,'poudre',true);}
  else{// ---- l'étui
    x.fillStyle=brassG(Rb,-Rb);path(caseProf);x.fill();x.strokeStyle='rgba(60,40,10,.85)';x.stroke();
    x.save();path(caseProf);x.clip();x.fillStyle='rgba(255,255,255,.35)';x.fillRect(px(0),py(Rb*.62),caseLen*sc,Rb*.14*sc);x.restore();
    // la balle, dehors
    const jc=C.mono?['#e09a64','#c46d38','#7a3c16']:C.soft?['#c3c7cb','#8d9196','#565b60']:C.he&&!C.shaped?['#9aa06a','#6b7b3a','#3d4722']:['#e7a26a','#c0773c','#7a4219'];
    if(C.sub){x.fillStyle=lin(x,py(r),py(-r),['#8a9a6a','#6c7a5a','#40492f']);x.fillRect(px(b0),py(r),l*.72*sc,d*sc);x.strokeRect(px(b0),py(r),l*.72*sc,d*sc);tag(b0+l*.2,r,'sabot (tombe à la bouche)',false);}
    x.fillStyle=lin(x,py(rr),py(-rr),jc);path(Bp);x.fill();x.strokeStyle='#3a200c';x.stroke();x.save();path(Bp);x.clip();x.fillStyle='rgba(255,255,255,.3)';x.fillRect(px(b0),py(rr*.62),l*sc,rr*.14*sc);x.restore();
    if(p.cons==='apfsds'){for(const s2 of [1,-1]){x.fillStyle='#50565e';x.beginPath();x.moveTo(px(b0),py(s2*rr));x.lineTo(px(b0+d*.9),py(s2*rr));x.lineTo(px(b0),py(s2*rr*2.2));x.closePath();x.fill();x.stroke();}tag(b0+d*.3,rr*2,'empennage',false);}
    if(TIPC[p.cons]){x.save();path(Bp);x.clip();x.fillStyle=TIPC[p.cons];x.fillRect(px(b0+l-nose*.28),py(rr),nose*.3*sc,rr*2*sc);x.restore();tag(b0+l-nose*.12,rr*.4,'couleur de pointe',false);}
    // ---- la coupe : on ouvre la moitié basse
    x.save();x.beginPath();x.rect(px(-1),Y,(COL+2)*sc,Rb*1.4*sc+2);x.clip();
    x.fillStyle=lin(x,Y,py(-Rb),[CM.col[0],CM.col[1]]);path(caseProf);x.fill();x.fillStyle=hatch(x);path(caseProf);x.fill();
    // l'intérieur de l'étui : la chambre de poudre
    const wt=Math.max(d*.05,Dc*.045),inner=caseProf.filter(([a])=>a>=Dc*.26).map(([a,b])=>[a,Math.max(.05,b-wt)]);inner.unshift([Dc*.26,Math.max(.05,Rb*.78-wt)]);
    x.fillStyle='#1d160e';path(inner);x.fill();x.save();path(inner);x.clip();grains(x,px(Dc*.26),Y,(caseLen-Dc*.26)*sc,Rb*sc,'#1d160e','#9a8a62');x.restore();
    // l'amorce : la cuvette, l'enclume, l'évent
    x.fillStyle='#caa24a';x.fillRect(px(0),Y,Dc*.12*sc,Rb*.38*sc);x.fillStyle='#6b3b1a';x.fillRect(px(Dc*.02),Y+Rb*.08*sc,Dc*.07*sc,Rb*.22*sc);x.fillStyle='#0c0a08';x.fillRect(px(Dc*.12),Y,Dc*.14*sc,Math.max(1,d*.08*sc));
    // la balle coupée : la chemise, le plomb, le noyau, la cavité, la charge, la traçante
    const jt=C.mono||C.soft?0:Math.max(d*.035,d*.07*(D.jacket||1));
    x.fillStyle=lin(x,Y,py(-rr),[jc[1],jc[2]]);path(Bp);x.fill();x.fillStyle=hatch(x);path(Bp);x.fill();
    const inB=Bp.filter(([a,b])=>b>jt*1.1&&a<b0+l-jt).map(([a,b])=>[a,b-jt]);if(inB.length>2&&jt>0){inB[0][0]+=jt;x.fillStyle=C.he&&!C.shaped?'#f0c419':C.sub?'#6d757d':'#9aa0a6';path(inB);x.fill();if(!C.he){x.fillStyle=hatch(x);path(inB);x.fill();}}
    if(jt>0)tag(b0+shank*.5,rr,C.he?'coque d’acier':`chemise ×${(D.jacket||1).toFixed(1).replace('.',',')}`,true);
    if(C.mono)tag(b0+shank*.5,rr,'cuivre massif',true);else if(C.soft)tag(b0+shank*.5,rr,'plomb nu',true);else if(!C.he&&!C.sub&&!C.core)tag(b0+shank*.3,rr*.5,'noyau de plomb',true);
    if(C.core||(D.core||0)>0){const cd=(p.coreD??.55)*rr,cl=(shank+nose*.5)*.82,c0=b0+jt+d*.1;x.fillStyle=lin(x,Y,py(-cd),p.cons==='tungstene'||C.ferx>1?['#b9c6d4','#7d8fa3']:['#6a727b','#3d434a']);x.beginPath();x.moveTo(px(c0),Y);x.lineTo(px(c0),py(-cd));x.lineTo(px(c0+cl*.78),py(-cd));x.quadraticCurveTo(px(c0+cl*.95),py(-cd*.8),px(c0+cl),Y);x.closePath();x.fill();x.strokeStyle=INK;x.stroke();
      tag(c0+cl*.5,cd,`${p.cons==='tungstene'?'noyau de tungstène':C.ferx>1?'dard de métal lourd':'noyau d’acier'} (⌀ ${Math.round((p.coreD??.55)*100)} %)`,true);}
    const cav=Math.max(p.cons==='hp'?.45:0,p.cavity||0);if(cav>0){const cdp=nose*cav,cm=Math.max(tipR,rr*.35);x.fillStyle='#0c0a08';x.beginPath();x.moveTo(px(b0+l),Y);x.lineTo(px(b0+l),py(-cm));x.lineTo(px(b0+l-cdp),Y);x.closePath();x.fill();tag(b0+l-cdp*.5,cm*.6,`cavité ${Math.round(cav*100)} %`,true);}
    if(C.he&&!C.shaped){tag(b0+shank*.5,rr*.5,`explosif ${Math.round((D.hef||.3)*100)} %`,true);x.fillStyle='#b8341f';x.fillRect(px(b0+l-nose*.35),Y,nose*.25*sc,rr*.3*sc);tag(b0+l-nose*.25,rr*.3,'fusée',false);}
    if(C.shaped){x.fillStyle='#f0c419';x.fillRect(px(b0+jt),Y,shank*.6*sc,(rr-jt)*sc);x.strokeStyle='#e08a4a';x.lineWidth=2.2;x.beginPath();x.moveTo(px(b0+shank*.75),py(-(rr-jt)));x.lineTo(px(b0+shank*.35),Y);x.stroke();x.lineWidth=1;tag(b0+shank*.55,rr*.5,'cône de cuivre (jet)',true);}
    if(C.tracer){x.fillStyle=lin(x,Y,py(-rr*.45),['#ff8a70','#d23a2e']);x.fillRect(px(b0+jt),Y,l*.22*sc,rr*.45*sc);tag(b0+l*.1,rr*.45,'traçante',true);}
    if(C.inc){x.fillStyle='#2d6fd6';x.fillRect(px(b0+l-nose*.6),Y,nose*.3*sc,rr*.35*sc);tag(b0+l-nose*.45,rr*.35,'incendiaire',true);}
    if(p.cons==='duplex'){x.strokeStyle='#3a200c';x.lineWidth=1.5;x.beginPath();x.moveTo(px(b0+l*.48),Y);x.lineTo(px(b0+l*.48),py(-rr));x.stroke();x.lineWidth=1;tag(b0+l*.48,rr,'deux balles',true);}
    x.restore();
    // les renvois de l'étui
    tag(Dc*.06,Rb*.3,'amorce',true);tag(Dc*.26+(bodyEnd-Dc*.26)*.45,Rb*.5,'poudre',true);tag(bodyEnd*.55,Rb,`étui ${CM.name.toLowerCase()}`,false);
    if(RM!=='sans')tag(Dc*.05,RM==='bourrelet'?Rb*1.2:Rb*1.07,RIMS[RM].name.toLowerCase(),false);
    if(!straight)tag(bodyEnd+sh*.5,(Rb+Rn)/2,`épaulement ${Math.round(D.shAng||30)}°`,false);tag(caseLen-neck*.5,Rn,'collet',false);
    if(bands)tag(b0+shank*.35,rr,`${bands} cannelure${bands>1?'s':''}`,false);if((D.meplat||0)>.05)tag(b0+l,tipR,`méplat ${Math.round(D.meplat*100)} %`,false);
    if(boat>.05)tag(b0+bl*.4,rr*(1-boat*.3),'culot en dépouille',false);}
  // l'axe, les cotes
  x.setLineDash([6,3,1.5,3]);x.strokeStyle='rgba(160,210,240,.45)';x.beginPath();x.moveTo(px(-2),Y);x.lineTo(px(COL+2),Y);x.stroke();x.setLineDash([]);
  if(!o.compact){const dimY=y0+h-8;x.strokeStyle='rgba(160,210,240,.6)';x.fillStyle='rgba(200,230,250,.9)';x.font='10px ui-monospace,Consolas,monospace';
    const dim=(a,b,yy,t)=>{x.beginPath();x.moveTo(px(a),yy-4);x.lineTo(px(a),yy+3);x.moveTo(px(b),yy-4);x.lineTo(px(b),yy+3);x.moveTo(px(a),yy);x.lineTo(px(b),yy);x.stroke();const tw=x.measureText(t).width;x.fillStyle='rgba(12,34,52,.9)';x.fillRect((px(a)+px(b))/2-tw/2-3,yy-6,tw+6,11);x.fillStyle='rgba(200,230,250,.95)';x.fillText(t,(px(a)+px(b))/2-tw/2,yy+3);};
    dim(0,COL,dimY,`${(COL).toFixed(1).replace('.',',')} mm`);if(!rocket&&!pel)dim(b0,b0+l,dimY-13,`balle ${l.toFixed(1).replace('.',',')}`);}
  // les renvois : une ligne fine vers une étiquette, en haut ou en bas, sans se chevaucher
  if(o.labels!==false&&!o.compact){x.font='10.5px system-ui';for(const below of [false,true]){const L=labels.filter(q=>q.below===below).sort((a,b)=>a.x-b.x);let last=-1e9;const rowY=below?y0+h-padB+12:y0+padT-8;let row=0;
      for(const q of L){const tw=x.measureText(q.text).width;let lx=Math.max(q.x-tw/2,last+6,x0+4);if(lx+tw>x0+w-4){row++;lx=Math.max(x0+4,Math.min(q.x-tw/2,x0+w-tw-4));last=-1e9;}const ly=rowY+(below?row*12:-row*12);
        x.strokeStyle='rgba(200,230,250,.45)';x.beginPath();x.moveTo(q.x,q.y);x.lineTo(Math.max(lx,Math.min(lx+tw,q.x)),ly+(below?-9:3));x.stroke();x.fillStyle='rgba(225,240,250,.95)';x.fillText(q.text,lx,ly);last=lx+tw;}}}
  x.restore();return parts;}
function grains(x,a,y,w,hh,bg,fg){x.fillStyle=bg;x.fillRect(a,y,w,hh);const r=rnd(Math.round(w*3+hh));x.fillStyle=fg;const n=Math.min(700,Math.round(w*hh/9));for(let k=0;k<n;k++){const gx=a+r()*w,gy=y+r()*hh;x.fillRect(gx,gy,1.6,1.1);}}
// la balle-fusée coupée : le corps du moteur, le propergol percé en étoile, les tuyères, les ailettes, les étages, le guidage
function rocketRound(x,D,p,C,px,py,Y,sc,tag,parts,Bp,halfPath){const d=p.d,r=d/2,Lm=D.boost.Lm,fins=D.fins||0,fS=p.finSize??1,st2=(p.stages||1)>=2,cant=p.cant||0,G=GUIDES[p.guide]||GUIDES.aucun;
  const body=[[0,r*.82],[d*.35,r],[Lm,r]];const steel=lin(x,py(r),py(-r),['#c3cbd2','#7b848d','#3b4148']);
  // les ailettes, derrière le corps (on en voit deux de profil, et celle du milieu de face)
  if(fins){const fl=Math.min(Lm*.45,d*(1+fS)),fh=r*fS*1.2;x.fillStyle=lin(x,py(r+fh),py(-r-fh),['#9aa4ad','#5e666e','#2b3035']);for(const s2 of [1,-1]){x.beginPath();x.moveTo(px(d*.1),py(s2*r));x.lineTo(px(d*.1),py(s2*(r+fh)));x.lineTo(px(d*.1+fl*.55),py(s2*(r+fh*.9)));x.lineTo(px(d*.1+fl),py(s2*r));x.closePath();x.fill();x.strokeStyle='#15181b';x.stroke();}
    if(fins>=3){x.fillStyle='rgba(40,46,52,.8)';x.fillRect(px(d*.1),py(r*.12),fl*sc,r*.24*sc);}tag(d*.1+fl*.5,r+fh,`${fins} ailettes${cant?` · tuyères inclinées ${cant}°`:''}`,false);}
  x.fillStyle=steel;x.beginPath();body.forEach(([a,b],i)=>i?x.lineTo(px(a),py(b)):x.moveTo(px(a),py(b)));for(let i=body.length-1;i>=0;i--)x.lineTo(px(body[i][0]),py(-body[i][1]));x.closePath();x.fill();x.strokeStyle='#15181b';x.stroke();
  x.fillStyle='rgba(255,255,255,.3)';x.fillRect(px(d*.35),py(r*.62),(Lm-d*.35)*sc,r*.14*sc);
  if(st2){const sx=Lm*.55;x.fillStyle='#2b3035';x.fillRect(px(sx)-1.5,py(r),3,d*sc);tag(sx,r,'séparation des étages',false);}
  // l'ogive (la charge utile)
  const jc=C.he?['#9aa06a','#6b7b3a','#3d4722']:['#e7a26a','#c0773c','#7a4219'];x.fillStyle=lin(x,py(r),py(-r),jc);x.beginPath();Bp.forEach(([a,b],i)=>i?x.lineTo(px(a),py(b)):x.moveTo(px(a),py(b)));for(let i=Bp.length-1;i>=0;i--)x.lineTo(px(Bp[i][0]),py(-Bp[i][1]));x.closePath();x.fill();x.stroke();
  if(TIPC[p.cons]){x.fillStyle=TIPC[p.cons];const t=Bp[Bp.length-1][0];x.fillRect(px(t-D.noseLen*.25),py(r*.3),D.noseLen*.2*sc,r*.6*sc);}
  if(G.seek){const t=Bp[Bp.length-1][0];x.strokeStyle='rgba(240,230,210,.95)';x.lineWidth=.9;for(const k of [-.9,-.35,.35,.9]){x.beginPath();x.moveTo(px(t),py(k*r*.2));x.quadraticCurveTo(px(t+d*.8),py(k*r*1.1),px(t+d*1.4),py(k*r*1.6));x.stroke();}x.lineWidth=1;tag(t+d*.9,r*1.2,'moustaches (tête chercheuse)',false);}
  // la coupe
  x.save();x.beginPath();x.rect(px(-d),Y,(Lm+D.l+d*2)*sc,r*3*sc);x.clip();
  x.fillStyle='#8a939b';x.fillRect(px(0),Y,Lm*sc,r*sc);x.fillStyle=hatch(x);x.fillRect(px(0),Y,Lm*sc,r*sc);
  const g0=d*.45,gw=r*.84;const seg=st2?[[g0,Lm*.55-d*.1],[Lm*.55+d*.1,Lm-d*.2]]:[[g0,Lm-d*.2]];
  for(const [a,b] of seg){x.fillStyle='#6b5234';x.fillRect(px(a),Y,(b-a)*sc,gw*sc);grains(x,px(a),Y,(b-a)*sc,gw*sc,'#6b5234','#a58a5c');x.fillStyle='#0c0a08';x.beginPath();x.moveTo(px(a),Y);for(let q=a;q<=b;q+=d*.35){x.lineTo(px(q),Y+gw*.18*sc);x.lineTo(px(q+d*.17),Y+gw*.42*sc);}x.lineTo(px(b),Y);x.closePath();x.fill();}
  tag((seg[0][0]+seg[0][1])/2,gw*.6,st2?'propergol, 1er étage':'propergol (canal en étoile)',true);if(st2)tag((seg[1][0]+seg[1][1])/2,gw*.6,'2e étage',true);
  // la tuyère
  x.fillStyle='#2b3035';x.beginPath();x.moveTo(px(0),Y+r*.82*sc);x.lineTo(px(d*.45),Y+r*.35*sc);x.lineTo(px(d*.45),Y);x.lineTo(px(0),Y);x.closePath();x.fill();tag(d*.15,r*.7,cant?'tuyères inclinées':'tuyère',true);
  if(D.boost.ig){x.fillStyle='#caa24a';x.fillRect(px(-d*.25),Y,d*.25*sc,r*.6*sc);tag(-d*.12,r*.5,`charge d’éjection (allumage à ${Math.round(D.boost.ig*1000)} ms)`,true);}
  // la charge utile coupée
  const b0=Bp[0][0];x.fillStyle=C.he?'#f0c419':'#9aa0a6';x.beginPath();x.moveTo(px(b0+d*.1),Y);Bp.forEach(([a,b])=>x.lineTo(px(a),py(-Math.max(0,b-d*.06))));x.closePath();x.fill();if(C.he)tag(b0+D.l*.4,r*.5,'charge explosive',true);else tag(b0+D.l*.4,r*.5,'ogive pleine',true);
  if(G===GUIDES.gyro){x.fillStyle='#caa24a';x.beginPath();x.ellipse(px(b0+D.l*.2),Y+r*.35*sc,d*.08*sc,r*.35*sc,0,0,7);x.fill();x.stroke();tag(b0+D.l*.2,r*.6,'gyroscope',true);}
  x.restore();parts.push('moteur-fusée');}
