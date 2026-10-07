// Les radiographies, en 3D. Quand un Meumeu de la sélection est touché, ou qu'il touche, une petite fenêtre rejoue la (ou les)
// balle(s) au ralenti dans le corps : un vrai rendu en perspective, qui tourne lentement autour du Meumeu — sa grosse tête,
// son museau plein d'air, ses cornes, son ventre et ses quatre estomacs, ses sabots. Deux manières de voir :
//  · la radiographie : les tissus s'additionnent comme sur un film (un os épais est plus clair, les poumons et le museau
//    sont sombres), les vaisseaux en rouge comme une angiographie ;
//  · l'anatomie : le Meumeu en peluche translucide, les organes en couleur, triés par profondeur.
// Le trajet est coloré par la vitesse (blanc : très rapide, rouge sombre : presque arrêtée) ; la balle est dessinée avec sa
// bascule ; la cavité temporaire s'ouvre derrière elle puis se referme ; les éclats (de balle, d'os) partent à leur vitesse.
// Un clic sur la fenêtre ouvre la salle de radiologie : on tourne autour, on zoome, on avance image par image, et la courbe
// dit la cinématique — vitesse, bascule, énergie cédée centimètre par centimètre, organes traversés.
// Tout ce qu'on y voit est ce que la simulation a calculé.
import {PARTS,REGIONS,PART,BODY_H,RIB,partAt,regionAt,setSpecies} from './body.js';
import {fmt} from './ballistics.js';
import {has3d,render3d,updateSceneFx,disposeSceneFx,Fiche3D} from './gl3d.js';
import {MATS} from './armor.js';
const MATN=Object.fromEntries(Object.entries(MATS).map(([k,M])=>[k,M.name]));

// des vignettes discrètes, 200 px de large, fermées seules après lecture
// (V12.8) une fenêtre par côté, les suivantes en file (QMAX au plus) ; READQ : le temps de lecture quand d'autres attendent
const ZOOM=.8,FPS=15,PLAY=2.6,GAP=.5,READ=2.2,READQ=.9,QMAX=40,MERGE=2500,FOV=.55;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SEVC=['#9aa','#8fb996','#e8bf62','#ee9a3a','#e0663f','#d23a2e','#b0122a'];
const MARK=['#ffd36a','#7fd3f0','#ff8a6a','#b6f07f'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/n,a[1]/n,a[2]/n];};

// ---------- la caméra : une vraie perspective ----------
// Elle tourne autour d'un point F. Le repère du corps a x à la droite du Meumeu : vu de face, sa droite est à notre gauche.
function camera(F,th,ph,dist,W,H){const C=[F[0]+dist*Math.sin(th)*Math.cos(ph),F[1]+dist*Math.sin(ph),F[2]+dist*Math.cos(th)*Math.cos(ph)];
  const f=norm(sub(F,C)),r=norm(cross(f,[0,1,0])),u=cross(r,f);const foc=H/2/Math.tan(FOV/2);
  const P=p=>{const d=sub(p,C);const z=Math.max(1e-4,dot(d,f));const k=foc/z;return [W/2-dot(d,r)*k,H/2-dot(d,u)*k,z,k];};
  return {C,f,r,u,P,W,H,dist};}
// la silhouette d'un ellipsoïde : la projection de ses trois axes donne l'ellipse (exacte en vue parallèle)
function ellProj(cam,s){const c=cam.P(s.c);const R=s.t==='sph'?[s.r,s.r,s.r]:s.r;let a=0,b=0,d=0;
  for(let i=0;i<3;i++){const ax=[0,0,0];ax[i]=R[i];const vx=-dot(ax,cam.r),vy=-dot(ax,cam.u);a+=vx*vx;b+=vx*vy;d+=vy*vy;}
  const tr=a+d,q=Math.sqrt(Math.max(0,tr*tr/4-(a*d-b*b)));return {x:c[0],y:c[1],z:c[2],rx:Math.sqrt(tr/2+q)*c[3],ry:Math.sqrt(Math.max(0,tr/2-q))*c[3],rot:.5*Math.atan2(2*b,a-d)};}
function blob(ctx,e,stops,grow=1,hl=null){if(e.z<=1e-3)return;ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.rot);ctx.scale(Math.max(.4,e.rx*grow),Math.max(.4,e.ry*grow));
  const g=hl?ctx.createRadialGradient(hl[0],hl[1],.05,0,0,1):ctx.createRadialGradient(0,0,0,0,0,1);for(const [o,c] of stops)g.addColorStop(o,c);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,6.2832);ctx.fill();ctx.restore();}
function capsule(ctx,cam,s,style,w=1){const a=cam.P(s.a),b=cam.P(s.b);ctx.strokeStyle=style;ctx.lineWidth=Math.max(1,s.r*(a[3]+b[3])*w);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
// l'épaisseur traversée : un solide est plus clair au centre ; une coque, sur ses bords
const SOLID=(c,a)=>[[0,rgba(c,a)],[.55,rgba(c,a*.84)],[.82,rgba(c,a*.56)],[.96,rgba(c,a*.25)],[1,rgba(c,0)]];
const SHELL=(c,a)=>[[0,rgba(c,a*.22)],[.8,rgba(c,a*.32)],[.92,rgba(c,a)],[.985,rgba(c,a*.6)],[1,rgba(c,0)]];
// l'anatomie : la couleur de chaque chose
export const KIND={muscle:'#d9a38f',bone:'#efe6cf',lung:'#e8a3a8',heart:'#b3262f',organ:'#9c4a3c',cns:'#e6bcc4',artery:'#d8322c',vein:'#3b56b8',air:'#5d7288',airway:'#d6a0a0',eye:'#2b1d18'};
const TINT={foie:'#7a2a22',rate:'#6d2a3c',panse:'#b59a74',bonnet:'#b0886a',feuillet:'#a68670',caillette:'#c98f86',reinD:'#8b3232',reinG:'#8b3232',intestins:'#e3a79c',vessie:'#e7d27c',moelle:'#f1e2a0',trachee:'#d8a4a4'};
export const colOf=p=>TINT[p.id]||(p.horn?'#dcc39a':KIND[p.kind]||'#aaa');
const SKIN=hex('#ecdcbc'),HOOF=hex('#c9a57a'),HORN=hex('#d9b98c');
const skinOf=r=>r.hoof?HOOF:r.horn?HORN:SKIN;
const LIGHT=new Set(['#efe6cf','#e8a3a8','#e6bcc4','#f1e2a0','#e7d27c','#dcc39a','#e3a79c','#d9a38f','#d8a4a4','#d6a0a0','#c98f86','#b59a74','#b0886a','#a68670']);
// la vitesse, en couleur : blanc (vite) → jaune → orange → rouge sombre (presque arrêtée)
const RAMP=[[0,[140,16,26]],[.3,[240,70,40]],[.6,[255,180,60]],[1,[255,248,222]]];
function speedCol(f,a=1){f=clamp(f,0,1);let i=1;while(i<RAMP.length-1&&RAMP[i][0]<f)i++;const [f0,c0]=RAMP[i-1],[f1,c1]=RAMP[i];const q=(f-f0)/((f1-f0)||1);return rgba(c0.map((v,k)=>Math.round(v+(c1[k]-v)*q)),a);}

// ---------- la scène : une ou plusieurs balles dans le même Meumeu ----------
// la balle arrive de 25 cm avant le corps, sur sa ligne d'entrée : on voit son angle d'arrivée ; `slot` : sa gerbe (les
// plombs d'une chevrotine, les éclats d'une grenade partent ensemble, les coups d'une rafale l'un après l'autre)
const PRE=.25;
function prepBullet(e,i,slot=i){const R=e.rec;const P0=R.path;const q0=P0[0].p,q1=P0[Math.min(P0.length-1,2)].p;let dx=q1[0]-q0[0],dy=q1[1]-q0[1],dz=q1[2]-q0[2];const L0=Math.hypot(dx,dy,dz);
  if(L0<1e-6){dx=1;dy=0;dz=0;}else{dx/=L0;dy/=L0;dz/=L0;}const P=[{...P0[0],p:[q0[0]-dx*PRE,q0[1]-dy*PRE,q0[2]-dz*PRE],yaw:0},...P0];const tt=[0],ss=[0];let T=0,S=0;
  for(let k=1;k<P.length;k++){const a=P[k-1].p,b=P[k].p;const ds=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);S+=ds;T+=ds/Math.max(60,(P[k-1].v+P[k].v)/2);tt.push(T);ss.push(S);}
  const near=q=>{let bi=0,bd=1e9;for(let k=0;k<P.length;k++){const p=P[k].p;const d=(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;if(d<bd){bd=d;bi=k;}}return bi;};
  const frags=(R.frags||[]).map(f=>({pts:f.pts,bone:f.bone,at:near(f.pts[0].p)}));const tc=(R.tc||[]).map(c=>({p:c.p,r:c.r,at:near(c.p)}));
  const hurt=[];for(const [k,d] of Object.entries(R.dmg||{})){const part=PART[k];if(!part)continue;if(!(d.crush>1e-4||d.cut>.2||d.frac||d.stretch>.05))continue;
    hurt.push({part,d,at:d.at?near(d.at):P.length-1,stretch:d.crush<1e-4&&!d.cut&&!d.frac});}
  // ce qu'elle traverse, dans l'ordre
  const seq=[];for(let k=0;k<P.length;k++){const p=P[k].p;const part=partAt(p);const reg=part?null:regionAt(p);const name=part?part.name:reg?`chairs (${reg.name})`:null;const kind=part?part.kind:reg?'muscle':'out';
    const last=seq[seq.length-1];if(last&&last.name===name)last.s1=ss[k];else seq.push({name,kind,s0:ss[k],s1:ss[k],part});}
  const vIn=R.vIn||P[0].v;const m=2*R.E0/(vIn*vIn);const dE=[0];for(let k=1;k<P.length;k++){const ds=Math.max(1e-6,ss[k]-ss[k-1]);dE.push(Math.max(0,.5*m*(P[k-1].v**2-P[k].v**2))/(ds*100));}
  const bleeds=hurt.filter(h=>(h.part.kind==='artery'||h.part.kind==='vein')&&h.d.cut>.2).map(h=>({p:h.d.at||P[h.at].p,art:h.part.kind==='artery',at:h.at,cut:h.d.cut}));
  return {e,R,P,tt,ss,T,S,frags,tc,hurt,bleeds,seq,dE,vIn,m,slow:T>0?PLAY/T:1,start:slot*(PLAY+GAP),slot,pre:PRE,col:MARK[i%MARK.length],n:i+1};}
function buildScene(events){setSpecies(events[0]?.vf);let slot=-1,last=-1e9;const slots=events.map(e=>{const t=e._xt??0;if(slot<0||t-last>60)slot++;last=t;return slot;});
  const bullets=events.map((e,i)=>prepBullet(e,i,slots[i]));const lo=[1,1,1],hi=[-1,-1,-1];
  for(const b of bullets)for(const p of [...b.P.map(q=>q.p),...b.frags.flatMap(f=>f.pts.map(q=>q.p))])for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}
  const F=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2];const ext=Math.max(.13,Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])*1.6);
  // de côté par rapport à la première balle, un peu de trois quarts, plutôt de face
  const P=bullets[0].P;const a=P[0].p,b=P[P.length-1].p;let th=Math.atan2(-(b[2]-a[2]),b[0]-a[0]);if(Math.cos(th)<0)th+=Math.PI;th+=.5;
  return {events,bullets,F,ext,th0:th,end:ZOOM+(slot+1)*(PLAY+GAP),volleys:slot+1};}
// où en est une balle au temps t de la scène
function stateOf(b,t){const local=t-ZOOM-b.start;if(local<0)return null;const real=Math.min(b.T,local/b.slow);let i=0;while(i<b.P.length-1&&b.tt[i+1]<=real)i++;
  const fr=i<b.P.length-1?clamp((real-b.tt[i])/Math.max(1e-12,b.tt[i+1]-b.tt[i]),0,1):0;const P=b.P;const cur=i<P.length-1?P[i].p.map((v,a)=>lerp(v,P[i+1].p[a],fr)):P[P.length-1].p;
  return {i,fr,cur,real,done:real>=b.T,after:Math.max(0,local-b.T*b.slow),v:i<P.length-1?lerp(P[i].v,P[i+1].v,fr):P[P.length-1].v,s:i<P.length-1?lerp(b.ss[i],b.ss[i+1],fr):b.S,yaw:P[i].yaw||0,d:P[i].d||1.8};}

// ---------- le rendu ----------
const LAYERS={peau:true,os:true,organes:true,vaisseaux:true,cavite:true,eclats:true};
function ribs(ctx,cam,p,style){const s=p.shape;const [rx,ry,rz]=s.r;const zc=cam.P(s.c)[2];ctx.lineCap='round';
  for(let n=Math.ceil((s.c[1]-ry)/RIB);n*RIB<s.c[1]+ry;n++){const y=(n+.26)*RIB;const f=1-((y-s.c[1])/ry)**2;if(f<=.04)continue;const sf=Math.sqrt(f);let prev=null;
    for(let a=0;a<=28;a++){const an=a/28*Math.PI*2;const q=cam.P([s.c[0]+rx*sf*Math.cos(an),y-.004*Math.max(0,Math.sin(an)),s.c[2]+rz*sf*Math.sin(an)]);
      if(prev){ctx.strokeStyle=style((prev[2]+q[2])/2,zc);ctx.lineWidth=Math.max(1,.5*RIB*q[3]);ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}prev=q;}}}
function drawXrayBody(ctx,cam,L){
  ctx.globalCompositeOperation='lighter';
  if(L.peau)for(const r of REGIONS){const s=r.shape;const c=r.hoof?[170,190,205]:r.horn?[190,205,220]:[110,150,180];if(s.t==='cap')capsule(ctx,cam,s,rgba(c,.13));else blob(ctx,ellProj(cam,s),SOLID(c,.2));}
  // l'air : les poumons, le museau — plus sombres
  ctx.globalCompositeOperation='source-over';for(const p of PARTS)if(p.kind==='lung'||p.kind==='air')blob(ctx,ellProj(cam,p.shape),SOLID([0,4,10],p.kind==='air'?.45:.4));
  ctx.globalCompositeOperation='lighter';
  if(L.organes)for(const p of PARTS){const s=p.shape;
    if(p.kind==='organ')blob(ctx,ellProj(cam,s),SOLID(p.gut?[70,110,120]:[70,100,135],.16));else if(p.kind==='heart')blob(ctx,ellProj(cam,s),SOLID([150,70,90],.3));
    else if(p.id==='cerveau')blob(ctx,ellProj(cam,s),SOLID([90,120,150],.24));else if(p.kind==='eye')blob(ctx,ellProj(cam,s),SOLID([150,180,200],.3));
    else if(p.kind==='cns'||p.kind==='airway')capsule(ctx,cam,s,p.kind==='cns'?'rgba(255,230,160,.4)':'rgba(160,190,210,.3)');}
  if(L.vaisseaux)for(const p of PARTS)if(p.kind==='artery')capsule(ctx,cam,p.shape,'rgba(255,60,60,.55)');else if(p.kind==='vein')capsule(ctx,cam,p.shape,'rgba(110,120,255,.42)');
  if(L.os){const B=[225,236,255];for(const p of PARTS){if(p.kind!=='bone')continue;const s=p.shape;
      if(p.ribs)ribs(ctx,cam,p,(z,zc)=>`rgba(225,236,255,${.34*(z<zc?1:.55)})`);
      else if(p.shell)blob(ctx,ellProj(cam,s),SHELL(B,p.id==='crane'?.55:.45));
      else if(s.t==='cap'){capsule(ctx,cam,s,rgba(B,.38));ctx.globalCompositeOperation='source-over';capsule(ctx,cam,s,'rgba(6,12,20,.35)',.45);ctx.globalCompositeOperation='lighter';}
      else blob(ctx,ellProj(cam,s),SOLID(B,.42));}}
  ctx.globalCompositeOperation='source-over';}
function drawAnatBody(ctx,cam,L){
  // la peluche, derrière : un voile très léger
  if(L.peau)for(const r of REGIONS){const s=r.shape;const c=skinOf(r);if(s.t==='cap')capsule(ctx,cam,s,rgba(c,.12));else blob(ctx,ellProj(cam,s),[[0,rgba(c,.08)],[.8,rgba(c,.12)],[1,rgba(c,0)]]);}
  // les organes, du plus loin au plus près
  const items=[];for(const p of PARTS){const L2=p.kind==='bone'?'os':p.kind==='artery'||p.kind==='vein'?'vaisseaux':'organes';if(!L[L2])continue;const s=p.shape;items.push({z:cam.P(s.c||s.a)[2],p});}
  items.sort((a,b)=>b.z-a.z);
  for(const {p} of items){const s=p.shape;const c=hex(colOf(p));
    if(p.kind==='air'){blob(ctx,ellProj(cam,s),SOLID(c,.25));continue;}
    if(p.ribs){ribs(ctx,cam,p,(z,zc)=>rgba(c,z<zc?.95:.45));continue;}
    if(p.shell){blob(ctx,ellProj(cam,s),[[0,rgba(c,.05)],[.85,rgba(c,.12)],[.95,rgba(c,.7)],[1,rgba(c,0)]]);continue;}
    if(s.t==='cap'){capsule(ctx,cam,s,rgba(c.map(v=>v*.62|0),.95));capsule(ctx,cam,s,rgba(c,1),.62);capsule(ctx,cam,s,'rgba(255,255,255,.35)',.2);continue;}
    const e=ellProj(cam,s);const hl=[-.35*Math.cos(e.rot)-.4*Math.sin(e.rot),.35*Math.sin(e.rot)-.4*Math.cos(e.rot)];const lite=c.map(v=>Math.min(255,v+60)),dark=c.map(v=>v*.55|0);const a=p.kind==='lung'?.72:.95;
    blob(ctx,e,[[0,rgba(lite,a)],[.6,rgba(c,a)],[1,rgba(dark,a)]],1,hl);}}
// devant : le bord de la peluche (plus opaque sur les bords, comme une enveloppe), les yeux, les naseaux
function drawAnatFront(ctx,cam,L){if(!L.peau)return;
  for(const r of REGIONS){const s=r.shape;const c=skinOf(r);if(s.t==='cap'){capsule(ctx,cam,s,rgba(c,.1));continue;}blob(ctx,ellProj(cam,s),[[0,rgba(c,0)],[.72,rgba(c,.05)],[.93,rgba(c,.42)],[1,rgba(c,0)]]);}
  const head=cam.P([0,.22,0])[2];for(const q of [[.02,.242,.034],[-.02,.242,.034],[.019,.207,.047],[-.019,.207,.047]]){const p=cam.P(q);if(p[2]>head)continue;ctx.fillStyle='rgba(60,36,24,.85)';ctx.beginPath();ctx.arc(p[0],p[1],Math.max(1.2,.0042*p[3]),0,6.3);ctx.fill();}}
function drawScene(ctx,W,H,sc,t,cam,o){setSpecies(sc.events[0]?.vf);const anat=o.mode==='anat';const L=o.layers||LAYERS;const big=H/300;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  const st=sc.bullets.map(b=>stateOf(b,t));
  // la vraie 3D (WebGL) quand elle est là ; sinon, le dessin 2D d'avant
  if(o.prefer3d!==false&&has3d()){const pulse=.55+.45*Math.sin(t*6);const hurt=new Map();
    sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;for(const h of b.hurt){if(h.at>s.i&&!s.done)continue;const cur=hurt.get(h.part);if(cur&&!cur.stretch)continue;hurt.set(h.part,{col:h.stretch?[255,150,40]:[255,40,30],k:pulse*(h.stretch?.7:1.2),stretch:h.stretch});}});
    render3d(ctx,W,H,cam,{sp:sc.events[0]?.vf,mode:o.mode||'xray',layers:L,hurt,fx:updateSceneFx(sc,st,L,PLAY),t});}
  else{
  const g=ctx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,W*.75);if(anat){g.addColorStop(0,'#2a3238');g.addColorStop(1,'#101518');}else{g.addColorStop(0,'#0b1620');g.addColorStop(1,'#020508');}ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(anat)drawAnatBody(ctx,cam,L);else drawXrayBody(ctx,cam,L);
  // ce qui est touché s'allume quand la balle y passe
  const pulse=.55+.45*Math.sin(t*6);ctx.globalCompositeOperation=anat?'source-over':'lighter';
  sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;for(const h of b.hurt){if(h.at>s.i&&!s.done)continue;const col=h.stretch?`rgba(255,150,40,${.38*pulse})`:`rgba(255,40,30,${.5*pulse})`;const sh=h.part.shape;
    if(sh.t==='cap')capsule(ctx,cam,sh,col,1.3);else blob(ctx,ellProj(cam,sh),[[0,col],[.85,col],[1,'rgba(255,40,30,0)']]);}});
  // la cavité temporaire : une bulle qui s'ouvre derrière la balle et se referme
  if(L.cavite){ctx.globalCompositeOperation=anat?'source-over':'lighter';sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;for(const q of b.tc){if(q.at>s.i)continue;const since=(b.tt[s.i]-b.tt[q.at])*b.slow+(s.done?s.after:0);
      const open=since<.15?since/.15:Math.max(.18,1-(since-.15)/.8);const c=cam.P(q.p);const r=q.r*c[3]*open;if(r<.5)continue;
      const gr=ctx.createRadialGradient(c[0],c[1],0,c[0],c[1],r);gr.addColorStop(0,`rgba(255,140,80,${(anat?.22:.14)*open})`);gr.addColorStop(.75,`rgba(255,110,60,${(anat?.16:.1)*open})`);gr.addColorStop(1,'rgba(255,110,60,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(c[0],c[1],r,0,6.3);ctx.fill();}});}
  ctx.globalCompositeOperation='source-over';
  // le trajet (la cavité permanente), coloré par la vitesse
  ctx.lineCap='round';ctx.lineJoin='round';sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;const P=b.P;
    for(let k=0;k<=s.i&&k<P.length-1;k++){const a=cam.P(P[k].p),q=cam.P(k===s.i?s.cur:P[k+1].p);const w=Math.max(1.6*big,(P[k].d||1.8)/1000*a[3]*1.3);
      ctx.strokeStyle='rgba(40,4,6,.85)';ctx.lineWidth=w+2*big;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.strokeStyle=speedCol(P[k].v/b.vIn);ctx.lineWidth=w;ctx.stroke();}});
  // les éclats
  if(L.eclats){ctx.globalCompositeOperation='lighter';sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;for(const f of b.frags){if(f.at>s.i)continue;const since=(s.done?b.T*b.slow+s.after:s.real*b.slow)-b.tt[f.at]*b.slow;
      const m=Math.min(f.pts.length,Math.max(1,Math.floor(since/(PLAY*.45)*f.pts.length)));ctx.strokeStyle=f.bone?'rgba(235,242,255,.85)':'rgba(255,200,110,.9)';ctx.lineWidth=1.2*big;ctx.beginPath();
      for(let k=0;k<m;k++){const q=cam.P(f.pts[k].p);k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);}ctx.stroke();if(m<f.pts.length){const q=cam.P(f.pts[m-1].p);ctx.fillStyle='#ffe6b0';ctx.beginPath();ctx.arc(q[0],q[1],1.6*big,0,6.3);ctx.fill();}}});}
  // les balles : orientées selon leur trajet et leur bascule
  ctx.globalCompositeOperation='lighter';sc.bullets.forEach((b,n)=>{const s=st[n];if(!s||(s.done&&!b.R.lodged))return;const P=b.P;const i2=Math.min(s.i+1,P.length-1),i1=Math.max(0,Math.min(s.i,P.length-2));
    let dir=norm(sub(P[i2].p,P[i1].p));const up=Math.abs(dir[1])<.9?[0,1,0]:[1,0,0];const side=norm(cross(dir,up));const ax=dir.map((v,a)=>v*Math.cos(s.yaw)+side[a]*Math.sin(s.yaw));
    const broke=b.R.fragAt&&s.s>=Math.hypot(...sub(b.R.fragAt,P[0].p));const Lh=(b.e.len||.0065)*(broke?.35:.5);const a=cam.P(s.cur.map((v,k)=>v-ax[k]*Lh)),c=cam.P(s.cur.map((v,k)=>v+ax[k]*Lh));const w=Math.max(2.4*big,s.d/1000*a[3]);
    ctx.strokeStyle='rgba(255,220,150,.3)';ctx.lineWidth=w*3.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();ctx.strokeStyle='#fff3c8';ctx.lineWidth=w;ctx.stroke();});
  ctx.globalCompositeOperation='source-over';
  if(anat)drawAnatFront(ctx,cam,L);}
  // l'entrée, la sortie
  const fs=Math.round(13*big);ctx.font=`600 ${fs}px system-ui`;
  sc.bullets.forEach((b,n)=>{const s=st[n];if(!s)return;const R=b.R;const tag=sc.bullets.length>1?` ${b.n}`:'';const mk=(p,txt)=>{const q=cam.P(p);ctx.strokeStyle=b.col;ctx.lineWidth=1.4*big;ctx.beginPath();ctx.arc(q[0],q[1],5*big,0,6.3);ctx.stroke();ctx.fillStyle=b.col;ctx.fillText(txt,q[0]+7*big,q[1]-5*big);};
    if(R.entry)mk(R.entry,'entrée'+tag);if(s.done)(R.exit?mk(R.exit,'sortie'+tag):mk(b.P[b.P.length-1].p,'logée'+tag));});
  // les chiffres : la balle qui joue (ou la dernière)
  let k=-1;for(let n=0;n<st.length;n++)if(st[n])k=n;if(k<0||!o.hud)return;
  if(o.mode==='peluche'){const gr=ctx.createLinearGradient(0,0,0,72*big);gr.addColorStop(0,'rgba(24,16,10,.6)');gr.addColorStop(1,'rgba(24,16,10,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,72*big);}const b=sc.bullets[k],s=st[k];const where=partAt(s.cur);const reg=where?null:regionAt(s.cur);
  ctx.textAlign='left';ctx.font=`700 ${Math.round(17*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='#e8f2ff';ctx.fillText(`${Math.round(s.done?(b.R.exit?b.R.vOut:0):s.v)} m/s`,12*big,24*big);
  ctx.font=`600 ${Math.round(13.5*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='rgba(232,242,255,.8)';
  {const dep=s.s-(b.pre||0);ctx.fillText(`${dep<0?`${fmt(-dep*100,1)} cm avant l’entrée`:`${fmt(dep*100,1)} cm dans le corps`} · ${fmt(s.real*1e6,0)} µs${s.yaw>.35?` · bascule ${Math.round(s.yaw*57.3)}°`:''}`,12*big,43*big);}
  if(!s.done)ctx.fillText(where?`dans : ${where.name}`:reg?`dans : chairs (${reg.name})`:'hors du corps',12*big,61*big);
  ctx.textAlign='right';ctx.fillStyle='rgba(232,242,255,.6)';ctx.fillText(`ralenti ×${Math.round(b.slow).toLocaleString('fr-FR')}`,W-10*big,H-10*big);ctx.fillText(`${fmt(b.R.E,1)} J cédés`,W-10*big,24*big);
  if(sc.bullets.length>1){const g=sc.bullets.filter(o=>o.slot===b.slot).length;ctx.fillText(g>1?`gerbe de ${g}${sc.volleys>1?` · ${b.slot+1} / ${sc.volleys}`:''}`:`balle ${b.slot+1} / ${sc.volleys}`,W-10*big,43*big);}ctx.textAlign='left';}

// ---------- (V12.8) la surpression : l'onde de choc traverse le Meumeu ----------
// Pas de projectile : le front de l'onde arrive du côté de l'explosion, passe, et ce que le souffle a fait s'allume — les poumons et les
// intestins (lésions internes), le cerveau (commotion), les oreilles (sonné, sourd). Les chiffres : la pression de crête, la distance, la charge.
const BLAST={mort:['dead','Tué net','le souffle seul : poumons, intestins et cerveau',['poumonG','poumonD','intestins','cerveau','coeur'],true],
  lesions:['down','Hors de combat','lésions internes : les poumons déchirés, il saigne dedans',['poumonG','poumonD','intestins'],true],
  commotion:['down','Assommé','commotion cérébrale',['cerveau'],true],sonne:['hurt','Sonné','il ne tire plus quelques secondes, sourd',['cerveau'],true],
  etourdi:['hurt','Étourdi','les oreilles sifflent',[],true],renverse:['hurt','Renversé','l’onde le jette au sol',[],false]};
function blastScene(e){return {kind:'souffle',events:[e],bullets:[],F:[0,BODY_H*.5,0],ext:BODY_H*1.5,th0:Math.PI/2+.35,end:ZOOM+PLAY+GAP,volleys:1};}
function drawBlast(ctx,W,H,sc,t,cam){const e=sc.events[0];setSpecies(e.vf);const big=H/300,B=BLAST[e.eff]||BLAST.renverse;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  const g=ctx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,W*.75);g.addColorStop(0,'#0b1620');g.addColorStop(1,'#020508');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  drawXrayBody(ctx,cam,LAYERS);
  // le front : de la gauche (côté de l'explosion) à la droite ; d'autant plus blanc que la pression est forte
  const tl=clamp((t-ZOOM)/PLAY,0,1),xf=lerp(-.15*W,1.15*W,tl),k=clamp(Math.log10(1+e.pk)/3,.15,1);ctx.globalCompositeOperation='lighter';
  const gr=ctx.createLinearGradient(xf-W*.45,0,xf+4*big,0);gr.addColorStop(0,'rgba(120,170,255,0)');gr.addColorStop(.8,`rgba(150,200,255,${.16*k})`);gr.addColorStop(.97,`rgba(235,245,255,${.75*k})`);gr.addColorStop(1,'rgba(235,245,255,0)');
  ctx.fillStyle=gr;ctx.fillRect(xf-W*.45,0,W*.45+4*big,H);
  // ce que le souffle a fait : allumé quand le front a passé le corps
  const mid=cam.P(sc.F)[0];if(xf>mid){const pulse=.55+.45*Math.sin(t*6),col=`rgba(255,40,30,${.55*pulse})`;
    for(const id of B[3]){const p=PART[id];if(!p)continue;const s=p.shape;if(s.t==='cap')capsule(ctx,cam,s,col,1.3);else blob(ctx,ellProj(cam,s),[[0,col],[.85,col],[1,'rgba(255,40,30,0)']]);}
    if(B[4])for(const r of REGIONS)if(/^oreille/.test(r.id)){const s=r.shape;const c2=`rgba(255,170,40,${.5*pulse})`;if(s.t==='cap')capsule(ctx,cam,s,c2,1.3);else blob(ctx,ellProj(cam,s),[[0,c2],[.85,c2],[1,'rgba(255,170,40,0)']]);}
    if(e.eff==='renverse'||e.pk>12){const q=cam.P([0,BODY_H*.55,0]);const L=Math.min(W*.2,(18+e.pk/6)*big);ctx.strokeStyle='rgba(255,220,150,.8)';ctx.lineWidth=2.2*big;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[0]+L,q[1]);ctx.lineTo(q[0]+L-6*big,q[1]-5*big);ctx.moveTo(q[0]+L,q[1]);ctx.lineTo(q[0]+L-6*big,q[1]+5*big);ctx.stroke();}}
  ctx.globalCompositeOperation='source-over';
  ctx.textAlign='left';ctx.font=`700 ${Math.round(17*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='#e8f2ff';ctx.fillText(`${fmt(e.pk,e.pk<10?1:0)} kPa`,12*big,24*big);
  ctx.font=`600 ${Math.round(13.5*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='rgba(232,242,255,.8)';
  ctx.fillText(`à ${fmt(e.r,e.r<10?1:0)} m · ${fmt(e.W*1000,e.W<.01?1:0)} g de TNT · ${{debout:'debout',accroupi:'accroupi',couche:'couché'}[e.post]||e.post}`,12*big,43*big);
  ctx.fillText(xf>mid?B[1].toLowerCase():'l’onde arrive',12*big,61*big);}

// ---------- (V12.8) la plaque d'un engin : un coup sur le blindage, en coupe ----------
// Le projectile arrive de la gauche ; la plaque est tournée de l'obliquité (l'angle entre sa trajectoire et la normale de la plaque, inclinaison
// et angle d'arrivée composés). Il ricoche, s'arrête dans l'acier (à la profondeur qu'il perce), ou passe avec ce qui lui reste de vitesse et
// arrache des éclats à la face intérieure, vers l'équipage.
function plateScene(e){return {kind:'plaque',events:[e],bullets:[],F:[0,0,0],ext:1,th0:0,end:ZOOM+PLAY+GAP,volleys:1};}
function drawPlate(ctx,W,H,sc,t){const c=sc.events[0].card,big=H/300;ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  const g=ctx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,W*.75);g.addColorStop(0,'#14202a');g.addColorStop(1,'#04080c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const cx=W*.5,cy=H*.56,th=(Math.min(c.te,c.t*3)>0?clamp(6+c.t*5,6,H*.22):3)*big*.7,len=H*.82,a=clamp(c.obl,0,85)*Math.PI/180;
  // la plaque : sa normale fait l'angle a avec la trajectoire (horizontale)
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-a);ctx.fillStyle='#5d6a74';ctx.fillRect(0,-len/2,th,len);ctx.strokeStyle='#a9b6c0';ctx.lineWidth=1*big;ctx.strokeRect(0,-len/2,th,len);ctx.restore();
  const tl=clamp((t-ZOOM)/PLAY,0,1),hit=.42,x0=W*.04;const lenP=Math.max(5*big,Math.min(16*big,c.cal*2.2*big));
  const proj=(x,y,ang,col)=>{ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(lenP*.5,0);ctx.lineTo(-lenP*.5,-lenP*.18);ctx.lineTo(-lenP*.5,lenP*.18);ctx.closePath();ctx.fill();ctx.restore();};
  const trail=(xa,ya,xb,yb,col)=>{ctx.strokeStyle=col;ctx.lineWidth=1.6*big;ctx.beginPath();ctx.moveTo(xa,ya);ctx.lineTo(xb,yb);ctx.stroke();};
  if(tl<hit){const x=lerp(x0,cx,tl/hit);trail(x0,cy,x,cy,'rgba(255,220,150,.5)');proj(x,cy,0,'#fff3c8');}
  else{trail(x0,cy,cx,cy,'rgba(255,220,150,.35)');const u=(tl-hit)/(1-hit);
    // (le ricochet : la trajectoire réfléchie sur la face, d − 2(d·n)n = (−cos 2a, sin 2a) — elle repart en rasant la plaque)
    if(c.out==='ricochet'){const L=u*W*.45,xr=cx-Math.cos(2*a)*L,yr=cy+Math.sin(2*a)*L;trail(cx,cy,xr,yr,'rgba(255,190,120,.6)');proj(xr,yr,Math.atan2(Math.sin(2*a),-Math.cos(2*a)),'#ffd9a0');}
    // (arrêté : à la part de son trajet dans l'acier qu'il perce — le trajet dans la plaque fait th / cos a)
    else if(c.out==='arrêté'){const xs=cx+clamp(c.pen/Math.max(.01,c.te),0,1)*th/Math.max(.2,Math.cos(a)),ys=cy;proj(xs,ys,0,'#e8c890');
      ctx.globalCompositeOperation='lighter';for(let n=0;n<8;n++){const an=Math.PI*.6+n*.22,L=(6+n*2)*big*(1-u*.5);trail(cx,cy,cx+Math.cos(an)*L,cy-Math.sin(an)*L,`rgba(255,200,90,${.7*(1-u)})`);}ctx.globalCompositeOperation='source-over';}
    else{const xe=cx+th/Math.max(.2,Math.cos(a))+u*W*.4;trail(cx,cy,xe,cy,'rgba(255,120,80,.6)');proj(xe,cy,0,'#ffb08a');
      const nf=Math.min(14,c.nf||0);ctx.globalCompositeOperation='lighter';for(let n=0;n<nf;n++){const an=(n/(nf||1)-.5)*1.1,L=u*W*.3*(.6+.4*((n*37)%10)/10);const xb=cx+th/Math.max(.2,Math.cos(a));trail(xb,cy,xb+Math.cos(an)*L,cy+Math.sin(an)*L,'rgba(255,170,90,.75)');}ctx.globalCompositeOperation='source-over';
      for(let n=0;n<Math.min(4,c.crew||0);n++){const x=W*.78+((n%2)*W*.1),y=cy+(n<2?-1:1)*H*.16;ctx.strokeStyle='rgba(120,180,230,.6)';ctx.lineWidth=1.4*big;ctx.beginPath();ctx.arc(x,y,7*big,0,6.3);ctx.stroke();}}}
  ctx.textAlign='left';ctx.font=`700 ${Math.round(17*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='#e8f2ff';ctx.fillText(`${Math.round(tl>=hit&&c.out==='percé'?c.v2:c.v)} m/s`,12*big,24*big);
  ctx.font=`600 ${Math.round(13.5*big)}px ui-monospace,Consolas,monospace`;ctx.fillStyle='rgba(232,242,255,.8)';
  ctx.fillText(`${c.where} : ${fmt(c.t,1)} mm à ${Math.round(c.slope)}° · vus sous ${Math.round(c.obl)}°`,12*big,43*big);
  ctx.fillText(`il faut percer ${fmt(c.te,1)} mm · il en perce ${fmt(c.pen,1)}`,12*big,61*big);
  ctx.textAlign='right';ctx.fillText(`calibre ${fmt(c.cal,1)} mm`,W-10*big,H-10*big);ctx.textAlign='left';}

// ---------- la pile de fenêtres ----------
export class XRay{
  // deux côtés, qui jouent en même temps : à gauche ce que nos Meumeu (et nos engins) reçoivent, à droite ce qu'ils envoient. Une fenêtre à la
  // fois par côté ; les suivantes attendent leur tour, dans l'ordre (V12.8 : avant, une blessure arrivée moins de 0,7 s après la dernière fenêtre
  // était oubliée). En attente, une blessure n'est qu'un événement : sa scène ne se calcule qu'à son tour (c'est ce qui ralentissait les combats).
  constructor(host,{onGo,room,onFiche,hostL=null}={}){this.host=host;this.hostL=hostL;this.cards=[];this.queue={L:[],R:[]};this.dropped={L:0,R:0};this.onGo=onGo;this.room=room;this.onFiche=onFiche;this.mode=localStorage.getItem('okm-xray')==='off'?'off':'sel';
    for(const h of [host,hostL].filter(Boolean))this.listen(h);}
  side(s){return this.cards.filter(c=>c.side===s);}
  listen(host){
    host.addEventListener('click',e=>{const b=e.target.closest('[data-x]');const card=e.target.closest('.xcard');if(!card)return;const c=this.cards.find(k=>k.el===card);if(!c)return;
      if(b?.dataset.x==='close'){this.remove(c);return;}if(b?.dataset.x==='go'){this.onGo?.(c.sc.events[0].x,c.sc.events[0].y);return;}if(b?.dataset.x==='fiche'){this.onFiche?.(c.victim);return;}if(b?.dataset.x==='replay'){c.t=0;this.front(c);return;}
      if(c.kind==='balle'&&(e.target.tagName==='CANVAS'||b?.dataset.x==='room')){this.room?.open(c.sc,c.el.querySelector('header b').textContent,c.el.querySelector('footer').innerHTML);return;}this.front(c);});
    host.addEventListener('pointerover',e=>{const card=e.target.closest('.xcard');for(const c of this.cards)c.hover=c.el===card;});
    host.addEventListener('pointerleave',()=>{for(const c of this.cards)c.hover=false;});}
  setMode(m){this.mode=m;try{localStorage.setItem('okm-xray',m);}catch(e){}if(m==='off'){this.queue={L:[],R:[]};for(const c of [...this.cards])this.remove(c);}}
  // kind : 'balle' (une balle, un éclat dans le corps), 'souffle' (la surpression), 'plaque' (un coup sur le blindage d'un engin)
  // une blessure sur le même Meumeu, du même tireur, dans les deux secondes et demie : elle rejoint la même fenêtre (une rafale), ou la même attente
  add(e,{title,sub,side='R',kind='balle'}){if(this.mode==='off'||kind==='balle'&&!e.rec?.path?.length)return;const now=performance.now();e._xt=now;if(!this.hostL)side='R';
    const joins=(victim,shooter,evs,last)=>kind==='balle'&&victim===e.victim&&(shooter??null)===(e.shooter??null)&&now-last<MERGE&&(evs.length<6||now-last<60&&evs.length<12)&&!e.rec.stopped&&!evs[0].rec?.stopped;
    const same=this.cards.find(c=>c.kind==='balle'&&c.side===side&&joins(c.victim,c.shooter,c.sc.events,c.last));
    if(same){same.last=now;disposeSceneFx(same.sc);same.sc=buildScene([...same.sc.events,e]);same.el.querySelector('footer').innerHTML=this.footer(same.sc.events);same.el.querySelector('header b').textContent=this.titleOf(same);return;}
    const Q=this.queue[side],tail=Q[Q.length-1];if(tail&&tail.kind==='balle'&&joins(tail.victim,tail.shooter,tail.events,tail.last)){tail.events.push(e);tail.last=now;return;}
    const en={kind,victim:e.victim??null,shooter:e.shooter??null,events:[e],title,sub,side,last:now,hidden:!!e.hiddenIntel};
    if(this.side(side).length){if(Q.length<QMAX)Q.push(en);else this.dropped[side]++;this.layout();return;}
    this.open(en);}
  titleOf(c){const sc=c.sc;if(c.kind!=='balle'||sc.events.length<2)return c.title;return `${c.title} · ${sc.volleys>1?'rafale de '+sc.volleys+(sc.volleys<sc.events.length?` (${sc.events.length} projectiles)`:''):'gerbe de '+sc.events.length}`;}
  open(en){const now=performance.now();const sc=en.kind==='souffle'?blastScene(en.events[0]):en.kind==='plaque'?plateScene(en.events[0]):buildScene(en.events);
    const c={kind:en.kind,victim:en.victim,shooter:en.shooter,born:now,last:en.kind==='balle'?now:en.last,t:0,acc:1,done:false,title:en.title,side:en.side,sc};const el=document.createElement('div');el.className='xcard';
    const fiche=!en.hidden&&en.kind!=='plaque'&&en.victim!=null;
    el.innerHTML=`<header><b></b><span class="xn"></span>${fiche?`<button data-x="fiche" title="La fiche médicale de la victime, en 3D">✚</button>`:''}${en.kind==='balle'?`<button data-x="room" title="La salle de radiologie : tourner, zoomer, image par image">⤢</button>`:''}<button data-x="replay" title="Rejouer">↻</button>${en.hidden?'':`<button data-x="go" title="Voir sur la carte">◎</button>`}<button data-x="close" title="Fermer (la suivante joue)">✕</button></header>
      <canvas width="400" height="224"${en.kind==='balle'?' title="Cliquez pour ouvrir la salle de radiologie"':''}></canvas><footer></footer><small class="xsub">${esc(en.sub)}</small>`;
    c.el=el;el.querySelector('header b').textContent=this.titleOf(c);el.querySelector('footer').innerHTML=en.kind==='souffle'?this.footBlast(en.events[0]):en.kind==='plaque'?this.footPlate(en.events[0].card):this.footer(en.events);
    c.cv=el.querySelector('canvas');{const k=Math.max(1,Math.min(2,devicePixelRatio||1));c.cv.width=Math.round(204*k);c.cv.height=Math.round(114*k);}c.ctx=c.cv.getContext('2d');
    this.cards.push(c);(en.side==='L'?this.hostL:this.host).appendChild(el);this.layout();}
  front(c){c.t=0;c.done=false;c.acc=1;}
  remove(c){const i=this.cards.indexOf(c);if(i<0)return;this.cards.splice(i,1);c.el.remove();if(this.room?.sc!==c.sc&&c.kind==='balle')disposeSceneFx(c.sc);
    const Q=this.queue[c.side];if(!this.side(c.side).length&&Q.length&&this.mode!=='off')this.open(Q.shift());this.layout();}
  layout(){for(const s of ['L','R']){const Q=this.queue[s];this.side(s).forEach((c,i)=>{c.el.style.zIndex=String(100-i);c.el.style.transform='translateY(0)';c.el.style.opacity='1';c.el.style.pointerEvents='';c.el.classList.add('front');
    c.el.querySelector('.xn').textContent=Q.length?`+${Q.length} en attente`:'';});}}
  footBlast(e){const B=BLAST[e.eff]||BLAST.renverse;return `<b class="${B[0]==='dead'?'dead':B[0]==='down'?'down':'hurt'}">${B[1]}</b> — ${esc(B[2])}<br>surpression de crête ${fmt(e.pk,e.pk<10?1:0)} kPa à ${fmt(e.r,1)} m`;}
  footPlate(c){if(c.out==='ricochet')return `<b class="hurt">Ricochet</b> sur ${esc(c.where)} — vu sous ${Math.round(c.obl)}°, le projectile glisse<br>${fmt(c.t,1)} mm à ${Math.round(c.slope)}°`;
    if(c.out==='arrêté')return `<b class="hurt">Arrêté</b> par ${esc(c.where)} — il perce ${fmt(c.pen,1)} mm, il en fallait ${fmt(c.te,1)}<br>${fmt(c.t,1)} mm à ${Math.round(c.slope)}°, vus sous ${Math.round(c.obl)}°`;
    return `<b class="dead">Percé</b> — ${esc(c.where)} : ${Math.round(c.v2||0)} m/s dans l’habitacle${c.he?' · l’obus éclate dedans':c.nf?` · ${c.nf} éclat${c.nf>1?'s':''}${c.shaped?' du jet':' de blindage'}${c.fhits?`, ${c.fhits} touchent l’équipage`:''}`:''}<br>${c.path?.length?`traverse : ${esc(c.path.join(' → '))}${c.boom?' — <b class="dead">les munitions explosent</b>':''}<br>`:''}${c.crew||0} à bord · ${fmt(c.t,1)} mm à ${Math.round(c.slope)}°, vus sous ${Math.round(c.obl)}°`;}
  footer(evs){const e=evs[evs.length-1];if(e.rec?.stopped)return `<b class="hurt">Arrêtée</b> par ${esc(e.armorName||'la protection')} (${esc({casque:'casque',plastron:'plastron',dos:'dos',flancs:'flancs'}[e.zone]||e.zone||'')}) — le choc passe : ${fmt(e.blunt||0,1)} J<br>${esc(MATN[e.mat]||e.mat||'')}`;const o=e.out;if(!o)return '';const tone=o.now==='mort'?'dead':o.now==='hors'?'down':'hurt';
    const now=o.now==='mort'?`<b class="${tone}">Tué</b> — ${esc(e.cause||'')}`:o.now==='hors'?`<b class="${tone}">Hors de combat</b> — ${esc(e.cause||'')}`:`<b class="${tone}">Blessé</b>, il tient encore`;
    const all=new Map();for(const x of evs)for(const p of x.out?.parts||[])if(!all.has(p.name)||all.get(p.name).sev<p.sev)all.set(p.name,p);
    const parts=[...all.values()].sort((a,b)=>b.sev-a.sev).slice(0,4).map(p=>`<span style="color:${SEVC[p.sev]}">${esc(p.name)}${p.note?' ('+esc(p.note)+')':''}</span>`).join(' · ');
    const bleed=evs.reduce((a,x)=>a+(x.out?.bleed||0),0);return `${now}${bleed>.005?` · saigne ${fmt(bleed,2)} mL/s`:''}<br>${parts||'rien de vital'}`;}
  step(dt){for(const s of ['L','R']){const read=this.queue[s].length?READQ:READ;for(const c of this.side(s)){const hold=c.hover||this.room?.isOpen;if(!hold)c.t+=dt;c.acc+=dt;
        // 15 images par seconde suffisent à une vignette ; l'animation finie, la dernière image reste à l'écran sans être repeinte
        if(!c.done&&c.acc>=1/FPS){c.acc=0;this.draw(c);if(c.t>c.sc.end)c.done=true;}if(c.t>c.sc.end+read&&!hold)this.remove(c);}}}
  draw(c){const sc=c.sc,t=c.t;const W=c.cv.width,H=c.cv.height;
    if(c.kind==='plaque'){drawPlate(c.ctx,W,H,sc,t);return;}
    if(c.kind==='souffle'){const dist=sc.ext/2/Math.tan(FOV/2)*1.05;drawBlast(c.ctx,W,H,sc,t,camera(sc.F,sc.th0,.15,dist,W,H));return;}
    const z=ease(t/ZOOM);const F=[lerp(0,sc.F[0],z),lerp(BODY_H*.5,sc.F[1],z),lerp(0,sc.F[2],z)];const ext=lerp(.36,sc.ext,z);const dist=ext/2/Math.tan(FOV/2)*1.05;
    const cam=camera(F,sc.th0-.6*(1-z)+.28*Math.sin(t*.4),.2,dist,W,H);drawScene(c.ctx,W,H,sc,t,cam,{mode:'xray',hud:true,prefer3d:false});   /* la vignette : le dessin 2D (0,3 ms l'image, contre 3,8 ms en WebGL et presque une seconde au premier rendu) ; la salle de radiologie, au clic, est en 3D */}
}

// ---------- le tir d'essai du bureau d'études : un Bèè, la munition dessinée, au ralenti, en boucle ----------
export class ShotView{
  constructor(cv){this.cv=cv;this.t=0;this.sc=null;this.mode='xray';this.th=0;}
  set(events){if(this.sc)disposeSceneFx(this.sc);this.sc=events.length?buildScene(events):null;this.t=0;}
  step(dt){const cv=this.cv,sc=this.sc;if(!cv?.isConnected)return;const dpr=devicePixelRatio||1;const r=cv.getBoundingClientRect();if(!r.width)return;const W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    if(!sc){const ctx=cv.getContext('2d');ctx.fillStyle='#122332';ctx.fillRect(0,0,W,H);ctx.fillStyle='#a8c3d3';ctx.font=`${Math.max(13,14*dpr)}px system-ui`;ctx.fillText('Aucun impact dans la cible — relancez le tir ou changez la distance.',18*dpr,35*dpr);return;}
    this.t+=dt;if(this.t>sc.end+2.2)this.t=0;const t=this.t;const z=ease(t/ZOOM);const F=[lerp(0,sc.F[0],z),lerp(BODY_H*.5,sc.F[1],z),lerp(0,sc.F[2],z)];const ext=lerp(.36,Math.min(.3,Math.max(.22,sc.ext*1.15)),z);const dist=ext/2/Math.tan(FOV/2)*1.05;
    drawScene(cv.getContext('2d'),W,H,sc,t,camera(F,sc.th0-.6*(1-z)+.35*Math.sin(t*.35),.18,dist,W,H),{mode:this.mode,hud:true});}
  dispose(){if(this.sc)disposeSceneFx(this.sc);this.sc=null;}}

// ---------- la salle de radiologie ----------
// Une grande vue : on tourne autour (glisser), on zoome (molette), double-clic pour recadrer ; lecture, pause, vitesse,
// image par image ; radiographie ou anatomie ; les calques. En bas, la cinématique de la balle choisie.
export class XRoom{
  constructor(host){this.host=host;this.isOpen=false;this.mode='xray';this.layers={...LAYERS};this.speed=1;
    host.addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(!b)return;const [k,v]=b.dataset.r.split(':');
      if(k==='close'){this.close();return;}if(k==='play'){this.playing=!this.playing;if(this.playing&&this.t>=this.sc.end)this.t=ZOOM;}else if(k==='restart'){this.t=ZOOM;this.playing=true;}
      else if(k==='step'){this.playing=false;this.t=clamp(this.t+(+v)*.04,ZOOM,this.sc.end);}else if(k==='mode')this.mode=v;else if(k==='layer')this.layers[v]=!this.layers[v];
      else if(k==='speed')this.speed=+v;else if(k==='bullet'){this.pick=+v;const b=this.sc.bullets[+v];this.t=ZOOM+b.start;this.playing=true;this.frame(b);}else if(k==='reset')this.frame();this.sync();});
    host.addEventListener('input',e=>{if(e.target.id==='xr-scrub'){this.playing=false;this.t=ZOOM+(+e.target.value/1000)*(this.sc.end-ZOOM);this.sync();}});}
  open(sc,title,foot){this.sc=sc;this.title=title;this.foot=foot;this.isOpen=true;this.t=ZOOM;this.playing=true;this.pick=0;this.frame();this.build();this.host.hidden=false;this.last=performance.now();
    const loop=now=>{if(!this.isOpen)return;try{this.tick(now);}catch(err){console.error(err);}requestAnimationFrame(loop);};requestAnimationFrame(loop);}
  close(){this.isOpen=false;this.host.hidden=true;this.host.innerHTML='';}
  frame(b=null){const sc=this.sc;let F=sc.F,ext=sc.ext;if(b){const lo=[1,1,1],hi=[-1,-1,-1];for(const q of b.P)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],q.p[a]);hi[a]=Math.max(hi[a],q.p[a]);}F=lo.map((v,a)=>(v+hi[a])/2);ext=Math.max(.12,Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])*1.8);}
    this.cam={F:F.slice(),th:sc.th0,ph:.22,dist:ext/2/Math.tan(FOV/2)*1.05};}
  build(){const sc=this.sc;
    this.host.innerHTML=`<div class="xroom" role="dialog" aria-label="Salle de radiologie"><header class="xr-head"><div><b>${esc(this.title)}</b><small>salle de radiologie · glisser : tourner · molette : zoomer · double-clic : recadrer</small></div><button class="ghost" data-r="close">Fermer</button></header>
      <div class="xr-body"><div class="xr-main"><div class="xr-view"><canvas id="xr-cv"></canvas><div class="xr-tools"><div id="xr-mode"></div><div id="xr-layers"></div></div></div>
        <div class="xr-play"><button data-r="restart" title="Depuis le début">⏮</button><button data-r="step:-1" title="Image précédente">◀</button><button data-r="play" id="xr-pp">⏸</button><button data-r="step:1" title="Image suivante">▶</button>
          <input type="range" id="xr-scrub" min="0" max="1000" value="0" aria-label="Le temps"><div id="xr-speed"></div></div>
        <canvas id="xr-ch"></canvas></div>
        <aside class="xr-side"><div class="xr-foot">${this.foot}</div><div id="xr-bul"></div><p class="xr-legend"><i class="sw"></i> la couleur du trajet : sa vitesse — blanc très rapide, jaune, orange, rouge sombre presque arrêtée</p></aside></div></div>`;
    const cv=this.host.querySelector('#xr-cv');this.cv=cv;this.ch=this.host.querySelector('#xr-ch');
    let drag=null;cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;const c=this.cam;c.th-=(e.clientX-drag.x)*.008;c.ph=clamp(c.ph+(e.clientY-drag.y)*.008,-1.3,1.3);drag={x:e.clientX,y:e.clientY};});
    cv.addEventListener('pointerup',()=>drag=null);cv.addEventListener('dblclick',()=>this.frame());
    cv.addEventListener('wheel',e=>{e.preventDefault();this.cam.dist=clamp(this.cam.dist*(e.deltaY>0?1.12:1/1.12),.08,1.6);},{passive:false});
    // chaque balle : ses chiffres, ce qu'elle a traversé
    const bl=sc.bullets.map((b,n)=>{const R=b.R;const yi=b.P.findIndex(q=>q.yaw>.35);const fragS=R.fragAt?Math.hypot(...sub(R.fragAt,b.P[0].p)):null;
      const path=b.seq.filter(x=>x.name).map(x=>`<span style="border-color:${x.part?colOf(x.part):KIND[x.kind]||'#999'}">${esc(x.name)}</span>`).join('<i>→</i>');
      return `<section class="xr-b" style="--c:${b.col}"><h4><button data-r="bullet:${n}">Balle ${b.n}</button> <small>${esc(b.e.sname||'')}${b.e.w?'':' · éclat'}</small></h4>
        <div class="kv"><span>Entre à</span><b>${Math.round(b.vIn)} m/s · ${fmt(R.E0,1)} J</b></div><div class="kv"><span>${R.exit?'Ressort à':'Logée, après'}</span><b>${R.exit?Math.round(R.vOut)+' m/s':fmt(b.S*100,1)+' cm'}</b></div>
        <div class="kv"><span>Cède</span><b>${fmt(R.E,1)} J (${Math.min(100,Math.round(R.E/Math.max(1e-9,R.E0)*100))} %)</b></div><div class="kv"><span>Trajet</span><b>${fmt(b.S*100,1)} cm en ${fmt(b.T*1e6,0)} µs</b></div>
        <div class="kv"><span>Bascule</span><b>${yi>=0?`à ${fmt(b.ss[yi]*100,1)} cm`:'non'}</b></div><div class="kv"><span>Se brise</span><b>${fragS!=null?`à ${fmt(fragS*100,1)} cm · ${b.frags.filter(f=>!f.bone).length} éclats`:R.expanded?'s’expanse':'non'}</b></div>
        ${b.frags.some(f=>f.bone)?`<div class="kv"><span>Éclats d’os</span><b>${b.frags.filter(f=>f.bone).length}</b></div>`:''}<div class="xr-path">${path}</div></section>`;}).join('');
    this.host.querySelector('#xr-bul').innerHTML=bl;this.sync();}
  sync(){const $=id=>this.host.querySelector('#'+id);if(!$('xr-mode'))return;const seg=(k,opts,on)=>`<div class="seg">${opts.map(([v,n])=>`<button data-r="${k}:${v}" class="${on(v)?'on':''}">${n}</button>`).join('')}</div>`;
    $('xr-mode').innerHTML=seg('mode',[['xray','Radiographie'],['anat','Anatomie'],...(has3d()?[['peluche','Peluche']]:[])],v=>this.mode===v);
    $('xr-layers').innerHTML=seg('layer',[['peau','Peau'],['os','Os'],['organes','Organes'],['vaisseaux','Vaisseaux'],['cavite','Cavité'],['eclats','Éclats']],v=>this.layers[v])+`<div class="seg"><button data-r="reset">Recadrer</button></div>`;
    $('xr-speed').innerHTML=seg('speed',[['0.25','×¼'],['0.5','×½'],['1','×1'],['2','×2']],v=>+v===this.speed);$('xr-pp').textContent=this.playing?'⏸':'⏵';
    for(const b of this.host.querySelectorAll('[data-r^="bullet:"]'))b.classList.toggle('on',+b.dataset.r.split(':')[1]===this.pick);}
  tick(now){const dt=Math.min(.1,(now-this.last)/1000);this.last=now;if(this.playing){this.t+=dt*this.speed;if(this.t>=this.sc.end){this.t=this.sc.end;this.playing=false;this.sync();}}
    const cv=this.cv;const dpr=devicePixelRatio||1;const r=cv.getBoundingClientRect();const W=Math.max(10,Math.round(r.width*dpr)),H=Math.max(10,Math.round(r.height*dpr));if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    const c=this.cam;drawScene(cv.getContext('2d'),W,H,this.sc,this.t,camera(c.F,c.th,c.ph,c.dist,W,H),{mode:this.mode,layers:this.layers,hud:true});
    const sc=this.host.querySelector('#xr-scrub');if(sc&&document.activeElement!==sc)sc.value=String(Math.round((this.t-ZOOM)/Math.max(1e-6,this.sc.end-ZOOM)*1000));
    for(let n=this.sc.bullets.length-1;n>=0;n--){const s=stateOf(this.sc.bullets[n],this.t);if(s&&!s.done){if(this.pick!==n){this.pick=n;this.sync();}break;}}
    this.chart();}
  // la cinématique : vitesse et bascule le long du trajet, l'énergie cédée par centimètre, les organes traversés
  chart(){const cv=this.ch;const dpr=devicePixelRatio||1;const r=cv.getBoundingClientRect();const W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(!W||!H)return;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    const x=cv.getContext('2d');const k=dpr;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,W,H);const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
    const b=this.sc.bullets[this.pick]||this.sc.bullets[0];const s=stateOf(b,this.t);const X0=52*k,X1=W-60*k,Y0=14*k,Y1=H-48*k;const Smax=Math.max(b.S,.01);const X=v=>X0+(X1-X0)*v/Smax;
    const ink=css('--ink'),muted=css('--muted'),line=css('--line');x.font=`${11*k}px system-ui`;x.strokeStyle=line;x.lineWidth=1;x.fillStyle=muted;
    const step=Smax>.1?.02:Smax>.04?.01:.005;for(let v=0;v<=Smax+1e-9;v+=step){x.beginPath();x.moveTo(X(v),Y0);x.lineTo(X(v),Y1);x.stroke();x.fillText(`${fmt(v*100,step<.01?1:0)} cm`,X(v)-10*k,Y1+13*k);}
    const dmax=Math.max(1e-6,...b.dE);x.fillStyle='rgba(210,60,40,.28)';x.beginPath();x.moveTo(X(0),Y1);b.P.forEach((q,i)=>x.lineTo(X(b.ss[i]),Y1-(Y1-Y0)*b.dE[i]/dmax));x.lineTo(X(b.S),Y1);x.closePath();x.fill();
    x.lineWidth=2*k;x.beginPath();b.P.forEach((q,i)=>{const px=X(b.ss[i]),py=Y1-(Y1-Y0)*q.v/b.vIn;i?x.lineTo(px,py):x.moveTo(px,py);});x.strokeStyle=css('--teal');x.stroke();
    x.setLineDash([5*k,4*k]);x.beginPath();b.P.forEach((q,i)=>{const px=X(b.ss[i]),py=Y1-(Y1-Y0)*Math.min(1,(q.yaw||0)/Math.PI);i?x.lineTo(px,py):x.moveTo(px,py);});x.strokeStyle=css('--orange');x.stroke();x.setLineDash([]);
    x.fillStyle=css('--teal');x.textAlign='right';x.fillText(`${Math.round(b.vIn)} m/s`,X0-4*k,Y0+8*k);x.fillText('0',X0-4*k,Y1);x.textAlign='left';x.fillStyle=css('--orange');x.fillText('180°',X1+4*k,Y0+8*k);
    x.fillStyle='rgba(210,60,40,.95)';x.fillText(`${fmt(dmax,1)} J/cm`,X1+4*k,Y0+24*k);
    const yb=Y1+20*k,hb=13*k;for(const g of b.seq){if(!g.name)continue;const c=g.part?colOf(g.part):KIND[g.kind]||'#999';x.fillStyle=c;x.fillRect(X(g.s0),yb,Math.max(1,X(g.s1)-X(g.s0)),hb);
      const w=X(g.s1)-X(g.s0);const nm=g.name.replace(/^chairs \((.*)\)$/,'$1');if(w>x.measureText(nm).width+6*k){x.fillStyle=LIGHT.has(c)?'#222':'#fff';x.fillText(nm,X(g.s0)+3*k,yb+hb-3*k);}}
    if(s){const px=X(Math.min(s.s,b.S));x.strokeStyle=ink;x.lineWidth=1.5*k;x.beginPath();x.moveTo(px,Y0);x.lineTo(px,yb+hb);x.stroke();x.fillStyle=ink;x.fillText(`${Math.round(s.done?(b.R.exit?b.R.vOut:0):s.v)} m/s · ${Math.round(s.yaw*57.3)}°`,Math.min(px+4*k,X1-110*k),Y0+10*k);}
    x.fillStyle=muted;x.fillText('— vitesse   - - bascule   ▇ énergie cédée par cm   ▬ ce qu’elle traverse',X0,H-5*k);}
}

// ---------- le blessé en 3D, pour la fiche médicale ----------
// Le corps entier du Meumeu, qui tourne lentement (on le fait tourner à la souris, on zoome à la molette) : les organes,
// le cerveau, les artères et les veines ; ce qui est touché s'allume à la couleur de sa gravité ; chaque hémorragie coule,
// d'autant plus fort qu'elle saigne ; un garrot est une bande jaune, un pansement un carré blanc, un vaisseau opéré un clip ;
// le trajet de chaque balle, de l'entrée à la sortie.
const SEVCOL=[null,[140,190,150],[220,190,80],[240,150,60],[235,100,55],[215,50,40],[180,15,40]];
const byName=new Map([...REGIONS.map(r=>[r.name,r]),...PARTS.map(p=>[p.name,p])]);
const centerOf=s=>s.c||[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2,(s.a[2]+s.b[2])/2];
export class BodyView{
  constructor(){const cv=document.createElement('canvas');cv.className='body3d';this.cv=cv;this.th=.5;this.ph=.12;this.dist=.6;this.mode='anat';this.drops=[];this.auto=true;this.t=0;
    let drag=null;cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};this.auto=false;cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;this.th-=(e.clientX-drag.x)*.01;this.ph=clamp(this.ph+(e.clientY-drag.y)*.01,-1.2,1.2);drag={x:e.clientX,y:e.clientY};});
    cv.addEventListener('pointerup',()=>drag=null);cv.addEventListener('dblclick',()=>{this.auto=true;this.dist=.6;this.ph=.12;});
    cv.addEventListener('wheel',e=>{e.preventDefault();this.dist=clamp(this.dist*(e.deltaY>0?1.1:1/1.1),.18,1.4);},{passive:false});}
  draw(h,dt,sp='meumeu'){setSpecies(sp);const cv=this.cv;const dpr=devicePixelRatio||1;const r=cv.getBoundingClientRect();if(!r.width)return;const W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    this.t+=dt;if(this.auto)this.th+=dt*.35;const ctx=cv.getContext('2d');const cam=camera([0,.15,0],this.th,this.ph,this.dist,W,H);const anat=this.mode!=='xray';const big=Math.min(2.2,H/300);
    if(has3d()){this.f3??=new Fiche3D();const r3=this.f3.update(h,sp,dt,this.t,this.mode);if(r3){render3d(ctx,W,H,cam,{sp,mode:this.mode,hurt:r3.hurt,fx:r3.group,t:this.t});
      ctx.font=`600 ${Math.round(10*big)}px system-ui`;ctx.fillStyle=this.mode==='peluche'?'rgba(60,40,24,.6)':'rgba(232,242,255,.6)';ctx.fillText(this.auto?'glisser : tourner · molette : zoomer':'double-clic : tourner seul',10*big,H-10*big);return;}}
    ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';const g=ctx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,W*.8);if(anat){g.addColorStop(0,'#2a3238');g.addColorStop(1,'#101518');}else{g.addColorStop(0,'#0b1620');g.addColorStop(1,'#020508');}ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(anat)drawAnatBody(ctx,cam,LAYERS);else drawXrayBody(ctx,cam,LAYERS);
    // ce qui est touché, à la couleur de la gravité
    const hurt=new Map();for(const w of h.wounds)for(const p of w.parts||[])hurt.set(p.name,Math.max(hurt.get(p.name)||0,p.sev));
    const pulse=.6+.4*Math.sin(this.t*5);ctx.globalCompositeOperation=anat?'source-over':'lighter';
    for(const [name,sev] of hurt){const o=byName.get(name);if(!o||REGIONS.includes(o))continue;const c=SEVCOL[sev]||SEVCOL[3];const col=rgba(c,(anat?.55:.45)*pulse);const s=o.shape;
      if(s.t==='cap')capsule(ctx,cam,s,col,1.5);else blob(ctx,ellProj(cam,s),[[0,col],[.85,col],[1,rgba(c,0)]]);}
    ctx.globalCompositeOperation='source-over';
    // les trajets des balles
    for(const w of h.wounds){if(!w.entry)continue;const a=cam.P(w.entry);if(w.exit){const b=cam.P(w.exit);ctx.strokeStyle='rgba(255,90,60,.85)';ctx.lineWidth=2*big;ctx.setLineDash([5*big,4*big]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.setLineDash([]);
        ctx.strokeStyle='#ffb347';ctx.lineWidth=1.5*big;ctx.beginPath();ctx.arc(b[0],b[1],5*big,0,6.3);ctx.stroke();}
      ctx.fillStyle=`rgb(${(SEVCOL[w.sev]||SEVCOL[3]).join(',')})`;ctx.beginPath();ctx.arc(a[0],a[1],4*big,0,6.3);ctx.fill();ctx.strokeStyle='#300';ctx.lineWidth=1;ctx.stroke();}
    // les hémorragies : le sang coule du vaisseau ou de la plaie ; les soins se voient
    for(const b of h.bleeds){const o=byName.get(b.name);if(!o)continue;const c=centerOf(o.shape);const q=cam.P(c);const rate=b.rate*(b.tq?0:b.clamped?.04:b.dressed?(b.internal?.85:.2):1);
      if(rate>.001&&Math.random()<dt*Math.min(40,rate*25+2))this.drops.push({p:[c[0]+(Math.random()-.5)*.006,c[1],c[2]+(Math.random()-.5)*.006],v:[(Math.random()-.5)*.03,.02+Math.random()*.03*Math.min(3,rate),(Math.random()-.5)*.03],age:0,internal:b.internal,big:Math.min(2.4,.8+rate)});
      if(b.tq){ctx.strokeStyle='#f0c419';ctx.lineWidth=4*big;ctx.beginPath();ctx.ellipse(q[0],q[1],9*big,4*big,0,0,6.3);ctx.stroke();}
      else if(b.clamped){ctx.fillStyle='#7fb3ff';ctx.fillRect(q[0]-3*big,q[1]-6*big,6*big,12*big);}
      else if(b.dressed&&!b.internal){ctx.fillStyle='rgba(250,250,245,.9)';ctx.fillRect(q[0]-6*big,q[1]-6*big,12*big,12*big);}
      if(rate>.05){ctx.fillStyle=`rgba(255,40,30,${.35+.35*pulse})`;ctx.beginPath();ctx.arc(q[0],q[1],(4+Math.min(10,rate*6))*big*pulse,0,6.3);ctx.fill();}}
    this.drops=this.drops.filter(d=>(d.age+=dt)<1.6).slice(-400);for(const d of this.drops){d.v[1]-=.12*dt;d.p=d.p.map((x,i)=>x+d.v[i]*dt);if(d.p[1]<0){d.p[1]=0;d.v=[0,0,0];}
      const q=cam.P(d.p);ctx.fillStyle=d.internal?`rgba(170,20,30,${.6*(1-d.age/1.6)})`:`rgba(200,20,20,${.9*(1-d.age/1.6)})`;ctx.beginPath();ctx.arc(q[0],q[1],Math.max(1,.0022*q[3]*d.big),0,6.3);ctx.fill();}
    if(anat)drawAnatFront(ctx,cam,LAYERS);
    // le sang perdu : une flaque sous lui
    const lost=1-h.blood/105;if(lost>.03){const q=cam.P([0,0,0]);ctx.fillStyle=`rgba(110,8,12,${Math.min(.8,lost*1.5)})`;ctx.beginPath();ctx.ellipse(q[0],q[1],Math.min(1,lost*2)*.12*q[3],Math.min(1,lost*2)*.05*q[3],0,0,6.3);ctx.fill();}
    ctx.font=`600 ${Math.round(10*big)}px system-ui`;ctx.fillStyle='rgba(232,242,255,.6)';ctx.fillText(this.auto?'glisser : tourner · molette : zoomer':'double-clic : tourner seul',10*big,H-10*big);}
}
