// La vue : la carte entière en isométrique, qu'on parcourt comme dans Age of Empires. Elle lit le monde, ne le modifie jamais ;
// les clics deviennent des demandes à l'interface. Deux niveaux de détail pour le sol : de près, une texture par case ;
// de loin, une image de toute la carte, calculée une fois (c'est aussi la minicarte).
import {MAP_N,TERRAIN,T,BUILDINGS,UNITS,VEHICLES,BEEE,RES,OUTCROP,ORE_COL,NODES,LINES,DAY,RADIUS,HOUR_REAL} from './data.js';
import {VEHDEF} from './vehicules.js';
import {MATS} from './armor.js';
import {MODS as GMODS,ACTIONS,derive,kitToP} from './ballistics.js';
import {layout as gunLayout,drawWeapon} from './gunart.js';
import {Director} from './director.js';
import {Scene3D} from './scene3d.js';
import {KIT_PRESETS} from './kitdata.js';
import {building,vehicle,resource,terrain,prop,sheet,drawFrame,fx,img} from './sprites.js';
import {BLOOD,BODY_H} from './body.js';
import {bleedRate,triage} from './health.js';

export const TW=64,TH=32;
const ELEV0=Math.asin(.5);   // l'élévation de l'isométrie d'origine (30°)
const UDEF=u=>u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];
// assombrir ou éclaircir une couleur #rrggbb
function shade(hex,f){const n=parseInt(hex.slice(1),16);const c=v=>Math.max(0,Math.min(255,Math.round(v*f)));return `rgb(${c(n>>16)},${c((n>>8)&255)},${c(n&255)})`;}
const TREES={[T.grass]:['tree_oak','tree_birch','tree_round','tree_maple','tree_cherry','tree_fruit','tree_willow','tree_red','tree_oak','tree_round'],[T.meadow]:['tree_fir','tree_pines','tree_birch-yellow','tree_oak','tree_firs','tree_yellow','tree_jacaranda','tree_fir'],[T.sand]:['tree_palm','tree_banana','tree_umbrella','tree_palm'],[T.dirt]:['tree_spruce','tree_fir','tree_snowfir','tree_orange','tree_spruce'],[T.scrub]:['tree_dead','tree_cypress','tree_bamboo','tree_cypress']};
const BEEE_SPRITE={centre:'beee-colonial-shelter',maison:'beee-colonial-shelter',camp:'beee-depot'};
// les caisses de munitions et les armes n'ont pas d'image dans le pack : on les dessine (une cartouche, un fusil)
export const AMMO_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="2" fill="#6b5a3a" stroke="#3b301d"/><rect x="3" y="9" width="18" height="3" fill="#8a7650"/><g fill="#d9a441" stroke="#7a5a1a" stroke-width=".6"><rect x="6" y="3" width="3" height="9" rx="1.2"/><rect x="10.5" y="3" width="3" height="9" rx="1.2"/><rect x="15" y="3" width="3" height="9" rx="1.2"/></g><g fill="#b87333"><path d="M6 4.2a1.5 1.5 0 0 1 3 0z"/><path d="M10.5 4.2a1.5 1.5 0 0 1 3 0z"/><path d="M15 4.2a1.5 1.5 0 0 1 3 0z"/></g></svg>');
export const ARM_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1.5 15 L7 13.9 L9 16.8 L6.2 20 L2 19.2 Z" fill="#b07a44" stroke="#3a2614" stroke-width=".8" stroke-linejoin="round"/><path d="M7 13.9 L14 12.4 L23 11.6 L23 13.2 L14.5 14.2 L12.8 17.2 L10.8 17.4 L11.2 15 L9 16.8 Z" fill="#a9b1b8" stroke="#2b3136" stroke-width=".8" stroke-linejoin="round"/><rect x="13.5" y="10.6" width="5" height="1.5" rx=".6" fill="#6d767e" stroke="#2b3136" stroke-width=".5"/></svg>');
const icon=k=>{if(k.startsWith('m:'))return img(AMMO_SVG,true);if(k.startsWith('a:'))return img(ARM_SVG,true);const [kind,name]=RES[k].icon;return kind==='p'?prop(name):resource(name);};
export {icon};

export class View{
  constructor(canvas,world,ui){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.world=world;this.ui=ui;this.dir=new Director();this.cx=0;this.cy=0;this.zoom=.9;this.sx=0;this.sy=0;
    this.sel=new Set();this.selVs=new Set();this.selB=null;this.selV=null;this.placing=null;this.lining=null;this.hover=null;this.drag=null;this.parts=[];this.decals=[];this.marks=[];this.streaks=[];this.rings=[];this.waves=[];this.zoning=false;this.toppling=[];this.fx=[];this.frame=0;this.clock=0;this.shake=0;this.tiles=null;this.tinted=new Map();this.g3=null;this.o3=false;this.want3d=false;
    this.bind();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();}
  resize(){const d=devicePixelRatio||1;const r=this.canvas.parentElement.getBoundingClientRect();this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.dpr=d;}
  z(){return this.zoom*this.dpr;}
  // V12.4 : la caméra libre (3D) — azimut (yaw, 0 = l'isométrie d'origine, vue depuis +X+Z) et élévation (30° d'origine). La projection générale d'une caméra
  // orthographique : S = 45,25 px par case et par zoom ; une hauteur h vaut h × 0,8165 en Y (comme scene3d). Aux valeurs d'origine, c'est exactement l'ancienne
  // formule (on la garde telle quelle, et pour la passe du sol, dessinée en isométrique sous une transformation affine : voir groundPass)
  camFree(){return this.o3&&(Math.abs(this.yaw||0)>1e-6||Math.abs((this.elev??ELEV0)-ELEV0)>1e-6);}
  camTrig(){const y=this.yaw||0,e=this.elev??ELEV0;if(this._ct?.y!==y||this._ct?.e!==e){const f=Math.PI/4+y;this._ct={y,e,c:Math.cos(f),s:Math.sin(f),se:Math.sin(e),ce:Math.cos(e)};}return this._ct;}
  toScreen(x,y,h=0){const z=this.z();if(this._iso||!this.camFree())return {x:this.canvas.width/2+((x-y)-(this.cx-this.cy))*TW/2*z+this.sx,y:this.canvas.height/2+((x+y)-(this.cx+this.cy))*TH/2*z-h*TH*z+this.sy};
    const T=this.camTrig(),S=45.2548*z,X=x-this.cx,Z=y-this.cy;return {x:this.canvas.width/2+S*(X*T.c-Z*T.s)+this.sx,y:this.canvas.height/2+S*(T.se*(X*T.s+Z*T.c)-T.ce*.8165*h)+this.sy};}
  toWorld(sx,sy){const z=this.z();if(this._iso||!this.camFree()){const a=(sx-this.canvas.width/2)/(TW/2*z)+(this.cx-this.cy),b=(sy-this.canvas.height/2)/(TH/2*z)+(this.cx+this.cy);return {x:(a+b)/2,y:(b-a)/2};}
    const T=this.camTrig(),S=45.2548*z,a=(sx-this.canvas.width/2-this.sx)/S,b=(sy-this.canvas.height/2-this.sy)/(S*T.se);return {x:this.cx+a*T.c+b*T.s,y:this.cy-a*T.s+b*T.c};}
  // la passe du sol : dessinée en isométrique d'origine (tuiles en losange, cratères, flaques…), sous la transformation affine qui l'amène dans la vue libre
  groundPass(on){const ctx=this.ctx;if(!on){this._iso=false;ctx.setTransform(1,0,0,1,0,0);return;}if(!this.camFree())return;
    const T=this.camTrig(),C=[this.canvas.width/2+this.sx,this.canvas.height/2+this.sy];
    // J_iso (par unité de X, Z) et J_libre ; L = J_libre · J_iso⁻¹
    const a=TW/2,b=-TW/2,c=TH/2,d=TH/2,det=a*d-b*c,ia=d/det,ib=-b/det,ic=-c/det,id=a/det;
    const S=45.2548,p=S*T.c,q=-S*T.s,r=S*T.se*T.s,t=S*T.se*T.c;const L00=p*ia+q*ic,L01=p*ib+q*id,L10=r*ia+t*ic,L11=r*ib+t*id;
    ctx.setTransform(L00,L10,L01,L11,C[0]-(L00*C[0]+L01*C[1]),C[1]-(L10*C[0]+L11*C[1]));this._iso=true;}
  resetCam(){this.yaw=0;this.elev=ELEV0;}
  lookAt(x,y){this.cx=x;this.cy=y;}
  // la vue 3D : les modèles remplacent les sprites ; tout le reste (barres, brouillard, effets) reste dessiné en 2D par-dessus
  async set3d(on){this.want3d=!!on;try{localStorage.setItem('okm-3d',on?'1':'0');}catch(e){}if(!on){this.g3=null;this.o3=false;return false;}if(!this.scene3d){try{this.scene3d=await Scene3D.create();}catch(e){console.warn('3D indisponible',e);this.scene3d=null;this.want3d=false;return false;}}this.g3=this.want3d?this.scene3d:null;return !!this.g3;}
  // le centre des soldats choisis (le mode cinéma y revient quand rien ne se passe)
  selCenter(){const us=[...this.sel].map(id=>this.world.unit(id)).filter(u=>u&&u.hp>0);return us.length?{x:us.reduce((a,u)=>a+u.x,0)/us.length,y:us.reduce((a,u)=>a+u.y,0)/us.length}:null;}

  // ---------- les textures du sol ----------
  // Une case : un losange taillé dans la texture de son terrain (trois variantes), un peu plus grand pour cacher les joints.
  // La texture de chaque terrain est d'abord projetée en isométrique sur 4 × 4 cases, puis découpée en seize losanges :
  // deux cases voisines du même terrain se raccordent sans joint, et le motif ne se répète qu'au-delà de quatre cases.
  makeTiles(){const P=4,out=[];for(const [t,Tr] of TERRAIN.entries()){const im=terrain(Tr.tex);if(!im)return null;
      const big=document.createElement('canvas');big.width=P*TW+4;big.height=P*TH+4;const g=big.getContext('2d');const k=TW/2/(im.width/P)*1;
      // l'image carrée devient un losange : l'axe i vers le bas à droite, l'axe j vers le bas à gauche
      g.setTransform(TW/2/(im.width/P),TH/2/(im.width/P),-TW/2/(im.width/P),TH/2/(im.width/P),P*TW/2+2,2);g.drawImage(im,0,0);g.setTransform(1,0,0,1,0,0);
      const [r,gg,b]=Tr.tint;g.globalAlpha=Tr.water?.5:.18;g.fillStyle=`rgb(${r},${gg},${b})`;g.fillRect(0,0,big.width,big.height);if(t===T.deep){g.globalAlpha=.35;g.fillStyle='#0b2a44';g.fillRect(0,0,big.width,big.height);}
      const vars=[];for(let bj=0;bj<P;bj++)for(let ai=0;ai<P;ai++){const c=document.createElement('canvas');c.width=TW+2;c.height=TH+2;const x=c.getContext('2d');
        x.beginPath();x.moveTo(TW/2+1,0);x.lineTo(TW+2,TH/2+1);x.lineTo(TW/2+1,TH+2);x.lineTo(0,TH/2+1);x.closePath();x.clip();
        const ox=P*TW/2+2+(ai-bj)*TW/2-TW/2-1,oy=2+(ai+bj)*TH/2-1;x.drawImage(big,ox,oy,TW+2,TH+2,0,0,TW+2,TH+2);vars.push(c);}
      out.push(vars);}return out;}
  // Une lumière douce à grande échelle, posée par-dessus les textures : elle casse la répétition du motif et fond les bords.
  makeShade(){const N=this.world.N,s=2;const c=document.createElement('canvas');c.width=N*s;c.height=N*s/2;const x=c.getContext('2d');const img=x.createImageData(c.width,c.height);
    const h=(i,j)=>{const v=Math.sin(i*127.1+j*311.7)*43758.5453;return v-Math.floor(v);};
    const vn=(x0,y0)=>{const xi=Math.floor(x0),yi=Math.floor(y0),tx=x0-xi,ty=y0-yi;const sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);return (h(xi,yi)*(1-sx)+h(xi+1,yi)*sx)*(1-sy)+(h(xi,yi+1)*(1-sx)+h(xi+1,yi+1)*sx)*sy;};
    for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){// le pixel de l'image en losange → la case
      const a=px/(s/2)-N,b=py/(s/4);const i=(a+b)/2,j=(b-a)/2;const o=(py*c.width+px)*4;if(i<0||j<0||i>=N||j>=N){img.data[o+3]=0;continue;}
      const n=vn(i/9,j/9)*.6+vn(i/3.5,j/3.5)*.4;const g=Math.round(128+(n-.5)*120);img.data[o]=g;img.data[o+1]=g;img.data[o+2]=g;img.data[o+3]=255;}
    x.putImageData(img,0,0);this.shadeCv=c;this.shS=s;}
  // Toute la carte en petit : pour le lointain et pour la minicarte.
  // (le sol en vraie texture : chaque case reçoit sa tuile, réduite ; faute de tuiles, sa couleur)
  makeOverview(){const W=this.world,N=W.N,G=W.G;const s=this.tiles?14:8;const c=document.createElement('canvas');c.width=N*s;c.height=N*s/2;const x=c.getContext('2d');x.imageSmoothingEnabled=true;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const t=G.terrain[j*N+i];const px=(i-j+N)*s/2,py=(i+j)*s/4;
      if(this.tiles){x.drawImage(this.tiles[t][(j&3)*4+(i&3)],px-s/2-.5,py-.5,s+1,s/2+1);continue;}
      const [r,g,b]=TERRAIN[t].tint;const n=((i*7919+j*104729)%13)/13*.12+.94;x.fillStyle=`rgb(${r*n|0},${g*n|0},${b*n|0})`;
      x.beginPath();x.moveTo(px,py);x.lineTo(px+s/2,py+s/4);x.lineTo(px,py+s/2);x.lineTo(px-s/2,py+s/4);x.closePath();x.fill();}
    this.overview=c;this.ovS=s;this.ovTex=!!this.tiles;}
  // Les forêts vues de haut : chaque arbre dessiné en petit sur une grande image, refaite quand des arbres tombent
  makeForest(){const W=this.world,N=W.N;const s=this.ovS;const trees=W.s.nodes.filter(n=>n.type==='tree'&&n.left>=1);const sig=trees.length;
    if(this.forest&&(this.forestSig===sig||performance.now()-this.forestAt<20000))return;
    const c=this.forest||document.createElement('canvas');c.width=N*s;c.height=N*s/2;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);let miss=0;
    for(const n of trees){const ks=TREES[W.G.terrain[n.j*N+n.i]]||TREES[T.grass];const im=prop(ks[(n.id*7+n.i)%ks.length]);if(!im){miss++;continue;}const w=s*1.5;const px=(n.i-n.j+N)*s/2,py=(n.i+n.j+1)*s/4;x.drawImage(im,px-w/2,py-w*.85,w,w);}
    this.forest=c;this.forestSig=miss?-1:sig;this.forestAt=performance.now();}

  // ---------- les événements : le monde annonce, on anime ----------
  // Les effets dessinés (flashes de bouche, étincelles, fumées, giclées de sang) : des images, placées, tournées, qui vivent
  // quelques dixièmes de seconde. add : en lumière (les flashes) ; rise : la fumée monte ; ground : à plat sur le sol.
  fxVisible(x,y,f){if(f==='meumeu'||this.world.s.fog===false)return true;const N=this.world.N,i=Math.floor(x),j=Math.floor(y);return i>=0&&j>=0&&i<N&&j<N&&!!this.fogVis?.[j*N+i];}
  sfx(name,x,y,{z=0,size=30,life=.3,ang=0,add=false,rise=0,grow=1,alpha=1,vx=0,vy=0,ground=false,f=null}={}){if(this.near(x,y)<=0||!this.fxVisible(x,y,f))return;this.fx.push({name,x,y,z,size,life,max:life,ang,add,rise,grow,alpha,vx,vy,ground,f});if(this.fx.length>600)this.fx.splice(0,this.fx.length-600);}
  screenAng(x0,y0,x1,y1){const a=this.toScreen(x0,y0),b=this.toScreen(x1,y1);return Math.atan2(b.y-a.y,b.x-a.x);}
  onEvent(e){if(this.g3&&e.type==='shot'&&e.by!=null)this.g3.kick(e.by,e);if(e.x!=null&&!this.fxVisible(e.x,e.y,e.f||e.vf))return;if(this.g3&&e.type==='boom')this.g3.boom?.(e);
    if(this.dir.on)this.dir.note(e,this.clock,true);   // le réalisateur ne voit que ce que le joueur voit (la garde de brouillard est la ligne du dessus)
    if(e.type==='shot'&&e.by!=null){const u=this.world.unit(e.by);if(u?.w){const D=this.world.W(u.w),z=this.z(),q=this.toScreen(u.x,u.y),collective=D.crew>1||UDEF(u).img==='canon';let mx,my;
      if(collective){const bm=this.artilleryBitmap(D),a=Math.atan2(((u.fx||0)+(u.fy||0))*.5,(u.fx||0)-(u.fy||0)),L=(bm?.Lw||D.p.L)*38*z/300;mx=q.x+Math.cos(a)*L;my=q.y-5*z+Math.sin(a)*L;}
      else{const g=this.gunPose(u,q,38*z,D,u.post==='couche'?'prone':u.post==='accroupi'?'crouch':'stand');mx=g.x0+Math.cos(g.ang)*g.L;my=g.y0+Math.sin(g.ang)*g.L;}
      const p=this.toWorld(mx-this.sx,my-this.sy+.3*TH*z);e={...e,x:p.x,y:p.y};}}
    const P=(x,y,o)=>this.puff(x,y,o);const R=Math.random;this.combatInfo(e);
    if(e.type==='shot'&&e.rk){const L=Math.hypot(e.x1-e.x,e.y1-e.y)||1;const ux=(e.x1-e.x)/L,uy=(e.y1-e.y)/L;this.sfx('muzzle_energy',e.x-ux*.3,e.y-uy*.3,{z:.3,size:34,life:.15,ang:R()*6,add:true});
      for(let k=0;k<4;k++)this.sfx('smoke_gray1',e.x-ux*(.2+k*.15),e.y-uy*(.2+k*.15),{z:.3,size:22+k*6,life:1.6,rise:.3,grow:2,alpha:.55,ang:R()*6});
      for(let k=1;k<=Math.min(12,L*2);k++){const q=k/Math.min(12,L*2);this.sfx('smoke_gray4',e.x+(e.x1-e.x)*q*.9,e.y+(e.y1-e.y)*q*.9,{z:e.arc?1+2*q*(1-q)*Math.min(8,L/3):.3,size:10+q*8,life:1.2+q,rise:.15,grow:2.2,alpha:.35});}}
    if(e.type==='shot'){const ang=e.x1!=null?this.screenAng(e.x,e.y,e.x1,e.y1):0;const k=Math.min(2.2,.7+Math.sqrt(e.E||36)/9);
      if((e.flash??1)>.08)this.sfx('weapon_muzzle_generated',e.x,e.y,{z:e.z??(e.tower?1.2:.3),size:32*k*Math.max(.35,e.flash??1),life:.16,ang,add:true});this.sfx(R()<.3?'smoke_gun2':'smoke_gun',e.x,e.y,{z:e.z??(e.tower?1.2:.32),size:14*k,life:1.1,rise:.5,grow:2.2,alpha:.45,ang:R()*6});}
    else if(e.type==='wound'){const [dx,dy]=e.dir||[1,0];const ang=this.screenAng(e.x,e.y,e.x+dx,e.y+dy);const big=(e.out?.sev||1)>=4;
      this.sfx(['spray1','spray2','spray4','spray_mist'][R()*4|0],e.x,e.y,{z:.25,size:big?46:30,life:.45,ang,grow:1.6,alpha:.95});
      this.decals.push({kind:'bloodimg',img:['blood_burst1','blood_burst2','blood_burst5','blood_dir4','blood_dir6','blood_small'][big?(R()*5|0):5],x:e.x+dx/(Math.hypot(dx,dy)||1)*.3,y:e.y+dy/(Math.hypot(dx,dy)||1)*.3,r:big?.55:.32,age:0,rot:ang});}
    else if(e.type==='impact'&&['pierre','mur','maison','metal','rocher'].includes(e.mat))this.sfx('sparks'+(1+(R()*3|0)),e.x,e.y,{z:.1,size:18,life:.12,ang:R()*6,add:true});
    else if(e.type==='impact')this.sfx('smoke_dust',e.x,e.y,{z:.05,size:13,life:.45,rise:.12,grow:1.45,alpha:.42,ang:R()*6});
    else if(e.type==='boom'&&e.kind==='pop'){this.sfx('muzzle_burst',e.x,e.y,{z:.2,size:22,life:.1,ang:R()*6,add:true});this.sfx('smoke_gray1',e.x,e.y,{z:.2,size:18,life:1,rise:.3,grow:1.6,alpha:.5,ang:R()*6});}
    else if(e.type==='boom'){const big=e.kind==='bomb',shell=e.kind==='shell';
      // V12.4 : la taille suit la CHARGE réelle (kg d'explosif, racine cubique comme le souffle) : une grenade, un obus de 28 mm, une bombe ne se ressemblent plus
      const KC=Math.max(.7,Math.min(3.2,Math.cbrt(Math.max(.002,e.chargeKg||(big?20:shell?.5:.05))/(big?20:shell?.5:.05))));
      const S=(big?3.6:shell?2.2:1.15)*Math.max(.8,Math.min(1.55,.85+(e.blast||0)*.18))*KC;
      if(e.conc)this.rings.push({x:e.x,y:e.y,r:Math.max(.4,e.conc*1.6),age:0});const bz=e.air?1.3:.3;
      // l'onde de choc : un anneau de pression qui file jusqu'au rayon du souffle (e.blast, en cases), puis la jupe de poussière soulevée au sol
      const RB=Math.max(.5,(e.blast||e.r||1)*1.15),life=.32+.12*Math.min(4,S);this.waves.push({x:e.x,y:e.y,r:RB,age:0,life,air:!!e.air});
      if(!e.air)this.waves.push({x:e.x,y:e.y,r:RB*.75,age:-.04,life:life*3.2,dust:true});
      // des mottes de terre projetées (au sol), d'autant plus nombreuses et loin que la charge est grosse
      if(!e.air)P(e.x,e.y,{n:Math.round(8+10*S),color:'#4a3b2a',size:2.5+S*.8,spread:1.2+S*.9,up:2.5+S*1.4,life:1+S*.15,grav:9});
      // une grosse charge laisse une colonne de fumée qui monte
      if(S>=3)for(let n=0;n<Math.round(S*1.5);n++)this.sfx(n%2?'smoke_cloud':'smoke_gray1',e.x+(R()-.5)*.4,e.y+(R()-.5)*.4,{z:.3+n*.25,size:(55+R()*30)*Math.min(2.4,S*.5),life:5+R()*4,rise:.5+n*.08,grow:2.1,alpha:.7,ang:R()*6});
      this.sfx('muzzle_burst',e.x,e.y,{z:bz,size:53*S,life:.12,ang:R()*6,add:true,grow:1.7});this.sfx('shell_impact_generated',e.x,e.y,{z:bz,size:80*S,life:.42,ang:R()*6,add:true,grow:1.35});this.sfx('sparks_big',e.x,e.y,{z:bz,size:60*S,life:.25,ang:R()*6,add:true});
      for(let n=0;n<(big?42:shell?27:13);n++){const a=R()*6.283,L=(.45+R()*(big?3.2:shell?2.2:1.3))*S;this.streaks.push({x0:e.x,y0:e.y,x1:e.x+Math.cos(a)*L,y1:e.y+Math.sin(a)*L,h0:bz,age:-R()*.06,life:.16+R()*.12,frag:true,f:e.f});}
      for(let n=0;n<(big?10:shell?7:3);n++)this.sfx(n%2?'smoke_cloud':'smoke_gray'+(R()<.5?1:4),e.x+(R()-.5)*.8*S,e.y+(R()-.5)*.8*S,{z:.2,size:(40+R()*30)*S,life:2.5+R()*3,rise:.4+R()*.5,grow:1.8,alpha:.8,ang:R()*6,vx:(R()-.5)*.3,vy:(R()-.5)*.3});}
    else if(e.type==='fire-area'||e.type==='burn'){const S=e.r?Math.max(1,e.r):1;for(let n=0;n<(e.type==='fire-area'?18:4);n++)this.sfx(n%2?'muzzle_energy':'muzzle_burst',e.x+(R()-.5)*S,e.y+(R()-.5)*S,{z:.15,size:20+R()*30,life:.25+R()*.45,rise:.8,grow:1.4,alpha:.8,ang:R()*6,add:true});}
    else if(e.type==='collapse'){for(let n=0;n<5;n++)this.sfx('smoke_dust',e.x+(R()-.5)*1.5,e.y+(R()-.5)*1.5,{z:.3,size:70+R()*40,life:4+R()*2,rise:.3,grow:1.7,alpha:.75,ang:R()*6});}
    else if(e.type==='plate'||e.type==='ricochet')this.sfx('sparks'+(1+(R()*3|0)),e.x,e.y,{z:.25,size:e.type==='ricochet'?16:20,life:.14,ang:R()*6,add:true});
    else if(e.type==='cannon'){this.sfx('muzzle_burst',e.x,e.y,{z:.35,size:44,life:.12,ang:R()*6,add:true});this.sfx('smoke_rising',e.x,e.y,{z:.3,size:34,life:2.4,rise:.45,grow:1.8,alpha:.6,ang:R()*6});}
    else if(e.type==='death'||e.type==='down')this.decals.push({kind:'bloodimg',img:'blood_small',x:e.x,y:e.y,r:.35,age:0,rot:R()*6});

    if(e.type==='boom'&&e.kind!=='pop'){const big=e.kind==='bomb';P(e.x,e.y,{n:big?50:e.kind==='shell'?30:18,color:'#ffb347',size:big?9:6,spread:big?3.6:2.4,up:big?3.4:2.4,life:.7,grav:3,glow:true});
      P(e.x,e.y,{n:big?40:20,color:'rgba(60,52,44,.8)',size:big?22:14,spread:big?2.2:1.4,up:1.4,life:big?4:2.5});P(e.x,e.y,{n:big?24:10,color:'#5b4a36',size:4,spread:3,up:4.5,life:1.2,grav:9});
      this.shake=Math.max(this.shake,this.nearC(e.x,e.y)*(big?1.4:e.kind==='shell'?.8:.45));}
    else if(e.type==='collapse'){const s=e.big?1.6:1;P(e.x,e.y,{n:40*s,color:'rgba(170,150,120,.75)',size:18*s,spread:2*s,up:1.2,life:4});P(e.x,e.y,{n:20*s,color:'#6b5a44',size:5,spread:2.5*s,up:4,life:1.4,grav:8});this.shake=Math.max(this.shake,this.nearC(e.x,e.y)*.9);}
    else if(e.type==='shot'){P(e.x,e.y,{n:2,color:'#ffe08a',size:3,spread:.2,up:.2,life:.16,z:e.z??(e.tower?1.2:.3),glow:true});const tracer=e.tr||R()<.12;
      if(e.eject&&e.caseMat&&this.near(e.x,e.y)>0)P(e.x,e.y,{n:1,color:{laiton:'#d9b14f',acier:'#7d8a66',alu:'#d6dde3',polymere:'#56626c'}[e.caseMat]||'#d9b14f',size:1.6,spread:.35,up:.55,life:.9,z:.35});if(e.x1!=null&&this.near(e.x,e.y)>0)this.streaks.push({x0:e.x,y0:e.y,x1:e.x1,y1:e.y1,h0:e.z??(e.tower?1.2:.3),age:0,life:e.rk?.95+(e.ig||0)*3:Math.max(.035,Math.min(.15,Math.hypot(e.x1-e.x,e.y1-e.y)*4/Math.max(1,e.v0||600))),tr:tracer,f:e.f,cal:e.cal||1.8,rk:e.rk,tip:e.tip,he:e.he,fins:e.fins,ig:e.ig,seek:e.seek,st2:e.stages>1,wob:Math.random()*6});if(this.streaks.length>300)this.streaks.shift();}
    else if(e.type==='wound'&&this.near(e.x,e.y)>0){const [dx,dy]=e.dir||[0,0];const L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L;const big=(e.out?.sev||1)>=4;
      for(let n=0;n<(big?14:7);n++){const sp=.4+Math.random()*1.4;this.parts.push({x:e.x,y:e.y,z:.25,vx:ux*sp+(Math.random()-.5)*.6,vy:uy*sp+(Math.random()-.5)*.6,vz:.4+Math.random()*1.2,life:.5,max:.5,color:'#9b1111',size:1.6+Math.random()*1.6,grav:5,glow:false});}
      this.decals.push({kind:'blood',x:e.x+ux*(.25+Math.random()*.3),y:e.y+uy*(.25+Math.random()*.3),r:big?.28:.16,age:0,rot:Math.atan2(uy,ux),seed:Math.random()*1000});if(this.decals.length>700)this.decals.splice(0,this.decals.length-700);}
    else if(e.type==='pierce'){P(e.x,e.y,{n:4,color:e.veh!=null?'#ffd27a':'#b8ab94',size:2.5,spread:.5,up:1,life:.4,grav:5,z:.3,glow:e.veh!=null});}
    // un ricochet sur un blindage : la balle repart, déviée, en un éclat lumineux bref
    else if(e.type==='ricochet'&&this.near(e.x,e.y)>0){const L=1.2+R()*2.4;this.streaks.push({x0:e.x,y0:e.y,x1:e.x+Math.cos(e.ang)*L,y1:e.y+Math.sin(e.ang)*L,h0:.35,age:0,life:.1+R()*.06,frag:true,f:e.f});
      P(e.x,e.y,{n:4,color:'#ffd27a',size:2,spread:.35,up:.7,life:.18,z:.3,glow:true});}
    else if(e.type==='cannon'){P(e.x,e.y,{n:10,color:'#ffd27a',size:5,spread:.6,up:.6,life:.2,z:.4,glow:true});P(e.x,e.y,{n:8,color:'rgba(200,195,185,.7)',size:12,spread:.8,up:.6,life:2,z:.4});}
    else if(e.type==='impact'&&this.near(e.x,e.y)>.3){const c={terre:'rgba(150,122,86,.85)',maison:'rgba(190,170,140,.85)',mur:'rgba(200,190,170,.85)',pierre:'rgba(200,190,170,.85)',ruine:'rgba(120,105,90,.85)',arbre:'rgba(150,110,60,.85)',rocher:'rgba(170,165,155,.85)',metal:'#ffd27a'}[e.mat]||'rgba(160,140,110,.8)';
      P(e.x+(Math.random()-.5)*.2,e.y+(Math.random()-.5)*.2,{n:3,color:c,size:2.2,spread:.5,up:1.1,life:.4,grav:5,z:.05,glow:e.mat==='metal'});}
    else if(e.type==='flak'){P(e.x,e.y,{n:8,color:'rgba(30,28,26,.85)',size:10,spread:.4,up:.1,life:1.8,z:e.h});P(e.x,e.y,{n:4,color:'#ffb347',size:5,spread:.6,up:.1,life:.2,z:e.h,glow:true});}
    else if(e.type==='death'){P(e.x,e.y,{n:6,color:'#b33',size:2.5,spread:.6,up:1,life:.5,grav:4,z:.3});}
    else if(e.type==='built'){P(e.x,e.y,{n:26,color:'rgba(214,196,150,.8)',size:10,spread:1.8,up:1.2,life:1.4});}
    else if(e.type==='felled'){P(e.x+.5,e.y+.5,{n:8,color:'#6b8e3a',size:4,spread:1,up:1.4,life:.8,grav:4,z:.6});
      if(e.nt==='tree'){const ks=TREES[this.world.G.terrain[e.y*this.world.N+e.x]]||TREES[T.grass];const nd=this.world.s.nodes.find(n=>n.i===e.x&&n.j===e.y);this.toppling.push({x:e.x+.5,y:e.y+.5,name:ks[(nd?.id||0)%ks.length],age:0,side:Math.random()<.5?-1:1});
        this.decals.push({kind:'stump',x:e.x+.5,y:e.y+.5,r:.12,age:0,seed:Math.random()*1000});}
      else if(e.nt==='rock')this.decals.push({kind:'rubble',x:e.x+.5,y:e.y+.5,r:.2,age:0,seed:Math.random()*1000});}
    else if(e.type==='rail-cut'){P(e.x,e.y,{n:10,color:'#7a6a5a',size:3,spread:1,up:2,life:.8,grav:6});}}
  // un effet se dessine s'il est à l'écran (et s'estompe au-delà du bord) ; trop dézoomé, les détails disparaissent
  // Le combat en images et en mots : la lumière des coups de feu et des explosions dans la nuit, ce qu'une balle a fait (au-dessus
  // de la victime, en couleur de gravité), le fil des combats (qui a abattu qui, où, à quelle distance), un voile rouge quand
  // l'un des nôtres qu'on regarde est touché, un ralenti bref et un éclair pour une grosse explosion au centre de l'écran.
  combatInfo(e){const W=this.world,nm=id=>{const u=W.unit(id);return u?(u.name||(u.f==='beee'?'Bèè':'Meumeu')):null;};
    if(e.type==='shot'){const k=Math.min(2.2,.7+Math.sqrt(e.E||36)/9);if((e.flash??1)>.08)this.flash(e.x,e.y,.7+k*.55*Math.max(.3,e.flash??1),.07);return;}
    if(e.type==='cannon'){this.flash(e.x,e.y,4.5,.2);return;}
    if(e.type==='boom'&&e.kind!=='pop'){const big=e.kind==='bomb',sh=e.kind==='shell';this.flash(e.x,e.y,big?11:sh?7:3.5,big?.45:sh?.3:.2,'255,170,80');
      const c=this.nearC(e.x,e.y);if((big||sh)&&c>.35){this.boomFlash=Math.max(this.boomFlash||0,c*(big?.55:.3));if(big||c>.7)this.slowmo={until:performance.now()+(big?420:240),k:big?.25:.45};}return;}
    if(e.type==='fire-area'){this.flash(e.x,e.y,5,.6,'255,140,60');return;}
    if(e.type==='wound'){const o=e.out||{};const parts=(o.parts||[]).slice().sort((a,b)=>b.sev-a.sev);const p0=parts[0];const sev=o.sev||1;
      const col=o.now==='mort'?'#ff4a3d':o.now==='hors'||sev>=4?'#ff8a3d':sev>=2?'#ffd36a':'#e8e0c8';
      this.float(e.x,e.y,o.now==='mort'?'✝ TUÉ':o.now==='hors'?`À TERRE${p0?' · '+p0.name:''}`:p0?`${p0.name}${sev>=3?' · grave':''}`:'touché',col,{size:o.now?13:10.5,life:o.now?2.4:1.5,f:e.vf});
      if(e.plate)this.float(e.x,e.y+.2,'la balle traverse la plaque','#c8d4e0',{size:9,life:1.4,z:.7});
      if(this.sel.has(e.victim))this.hurt=Math.min(1,(this.hurt||0)+(o.now?1:.55));
      if(o.now){const who=e.sname||(e.frag?'un éclat':'un tir'),vic=e.name||(e.vf==='beee'?'un Bèè':'un Meumeu');const d=e.R?Math.round(e.R)+' m':'';
        this.feed(`<b class="${e.vf==='beee'?'fm':'fb'}">${who}</b> ${o.now==='mort'?'✝':'▸'} <b class="${e.vf==='beee'?'fb':'fm'}">${vic}</b>${p0?' · '+p0.name:''}${d?' · '+d:''}`,e.vf==='beee'?'good':'bad');}return;}
    if(e.type==='plate'){this.float(e.x,e.y,'arrêtée par la plaque','#c8d4e0',{size:10,life:1.3});return;}
    if(e.type==='death'&&!e.shown){return;}}
  near(x,y){if(this.zoom<.28)return 0;const q=this.toScreen(x,y);const cw=this.canvas.width,ch=this.canvas.height,m=160*this.dpr;const out=Math.max(0,-q.x,q.x-cw,-q.y,q.y-ch);return Math.max(0,1-out/m);}
  // près du centre de l'écran : la secousse, le ralenti, l'éclair (ce qu'on regarde)
  nearC(x,y){const d=Math.hypot(x-this.cx,y-this.cy);return Math.max(0,1-d/(22/this.zoom));}
  flash(x,y,r,life,col='255,190,110'){if(this.world.light()>.85&&r<4)return;(this.flashes??=[]).push({x,y,r,life,t0:performance.now(),col});if(this.flashes.length>160)this.flashes.splice(0,this.flashes.length-160);}
  float(x,y,text,color,{size=11,life=1.6,z=1.1,bold=true,f=null}={}){if(this.near(x,y)<=0||!this.fxVisible(x,y,f))return;(this.floaters??=[]).push({x,y,z,text,color,size,life,t0:performance.now(),bold,dx:(Math.random()-.5)*.25});if(this.floaters.length>70)this.floaters.shift();}
  feed(html,tone){(this.feedL??=[]).unshift({html,tone,t0:performance.now()});if(this.feedL.length>7)this.feedL.pop();}
  puff(x,y,{n=6,color='#ccc',size=5,spread=.5,up=.6,life=.9,grav=0,z=0,glow=false}={}){if(!this.fxVisible(x,y)||this.near(x,y)<=0&&!glow)return;
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=Math.random()*spread;this.parts.push({x,y,z,vx:Math.cos(a)*r,vy:Math.sin(a)*r,vz:up*(.5+Math.random()),life:life*(.6+Math.random()*.6),max:life,color,size:size*(.6+Math.random()*.8),grav,glow});}
    if(this.parts.length>2500)this.parts.splice(0,this.parts.length-2500);}
  stepParts(dt){const W=this.world;for(const p of this.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.grav*dt;if(p.z<0){p.z=0;p.vz*=-.2;p.vx*=.5;p.vy*=.5;}if(!p.grav){p.vx*=1-dt*1.2;p.vy*=1-dt*1.2;}}
    this.parts=this.parts.filter(p=>p.life>0);
    // les incendies fument, les ruines fument encore
    for(const b of W.s.buildings){if(!(b.fire>0)&&!b.ruin)continue;const [w,h]=BUILDINGS[b.k].size;if(this.near(b.i+w/2,b.j+h/2)<=0||!this.fxVisible(b.i+w/2,b.j+h/2,b.f))continue;const k=b.fire>0?1:.25;
      if(Math.random()<dt*25*k)this.puff(b.i+w*Math.random(),b.j+h*Math.random(),{n:1,color:Math.random()<.5?'#ff7a2a':'#ffc24a',size:6,spread:.3,up:1.8,life:.7,z:.3,glow:true});
      if(Math.random()<dt*12*k)this.puff(b.i+w/2,b.j+h/2,{n:1,color:'rgba(38,32,28,.6)',size:18,spread:.3,up:1.3,life:5,z:1.2});}
    // les trains fument
    for(const v of W.s.vehicles)if(v.k==='train'&&v.state==='go'&&this.fxVisible(v.x,v.y,v.f)&&Math.random()<dt*8)this.puff(v.x,v.y,{n:1,color:'rgba(220,220,220,.6)',size:10,spread:.1,up:1.4,life:2.2,z:1.4});
    // les engins : la poussière soulevée de chaque côté, derrière les roues ou les chenilles (selon la vitesse) ; l'échappement à l'arrière (au ralenti
    // si un équipage est à bord, plus fort en roulant)
    for(const v of W.s.vehicles){const V=VEHDEF[v.k];if(!V||v.hp<=0||!this.fxVisible(v.x,v.y,v.f))continue;const sp=Math.abs(v.spd||0),c=Math.cos(v.h),s=Math.sin(v.h),bx=v.x-c*V.long*.45,by=v.y-s*V.long*.45;
      if(sp>2&&Math.random()<dt*sp*.6){const sd=(Math.random()<.5?-1:1)*V.large*.4;this.sfx('smoke_dust',bx-s*sd,by+c*sd,{z:.05,size:16+sp*1.2,life:1.2+sp*.04,rise:.08,grow:1.9,alpha:.32,ang:Math.random()*6,vx:-c*.2,vy:-s*.2});}
      if((sp>.5||v.crew?.length)&&Math.random()<dt*(sp>.5?6:2))this.sfx('smoke_gray1',bx,by,{z:.35,size:8+sp*.4,life:.9,rise:.35,grow:2,alpha:.18,ang:Math.random()*6});}
    // ceux qui saignent laissent une trace
    for(const u of W.s.units){if(!u.h||!u.h.bleeds.length||this.near(u.x,u.y)<=0)continue;const br=bleedRate(u.h);if(br>.002&&Math.random()<dt*Math.min(3,.18+br*3)*(u.anim==='walk'?1.4:1))this.decals.push({kind:'blood',x:u.x+(Math.random()-.5)*.15,y:u.y+(Math.random()-.5)*.15,r:.025+Math.random()*.045,age:0,rot:Math.random()*6,seed:Math.random()*1000});}
    if(this.decals.length>700)this.decals.splice(0,this.decals.length-700);
    // ceux qui travaillent : ce qu'ils font saute en l'air
    for(const u of W.s.units){if(u.anim!=='action'||Math.random()>dt*4||this.near(u.x,u.y)<=0||!this.fxVisible(u.x,u.y,u.f))continue;const T0=u.task;if(T0?.kind==='gather'){const nd=W.s.nodes[T0.node];if(nd)this.puff(nd.i+.5,nd.j+.5,{n:2,color:nd.type==='tree'?'#b07a42':nd.type==='bush'?'#6fae52':'#b8b3a6',size:3,spread:1,up:2.4,life:.8,grav:7,z:.5});}
      else if(T0&&(T0.kind==='build'||T0.kind==='line'||T0.kind==='repair'))this.puff(u.x,u.y,{n:2,color:'#ffe7a8',size:2,spread:1,up:2,life:.35,grav:5,z:.4,glow:true});}}

  // ---------- dessiner ----------
  // une image : les Bèè au pas lent sont montrés en chemin (World.lodShow), puis remis à leur vraie place, quoi qu'il arrive pendant le dessin
  draw(dt){const back=this.world.lodShow?.()||[];try{return this.paintFrame(dt);}finally{for(const [u,x,y,ph] of back){u.x=x;u.y=y;u.walkPh=ph;}}}
  paintFrame(dt){const ctx=this.ctx,W=this.world,s=W.s;this.frame+=dt*8;this.clock+=dt;if(this.dir.on)this.dir.tick(this,dt,this.clock,this.selCenter());this.shake=Math.max(0,this.shake-dt*1.8);this.sx=(Math.random()-.5)*this.shake*12;this.sy=(Math.random()-.5)*this.shake*9;
    if(!this.tiles)this.tiles=this.makeTiles();if(!this.overview)this.makeOverview();
    const cw=this.canvas.width,ch=this.canvas.height,z=this.z();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#4f6b2c';ctx.fillRect(0,0,cw,ch);
    // ce qui est à l'écran, en cases
    const c0=this.toWorld(0,0),c1=this.toWorld(cw,0),c2=this.toWorld(0,ch),c3=this.toWorld(cw,ch);const N=W.N;const mg=this.camFree()?6:2;
    const i0=Math.max(0,Math.floor(Math.min(c0.x,c1.x,c2.x,c3.x))-mg),i1=Math.min(N-1,Math.ceil(Math.max(c0.x,c1.x,c2.x,c3.x))+mg),j0=Math.max(0,Math.floor(Math.min(c0.y,c1.y,c2.y,c3.y))-mg),j1=Math.min(N-1,Math.ceil(Math.max(c0.y,c1.y,c2.y,c3.y))+mg);
    this.vis=[i0,i1,j0,j1];
    // le sol (V12.4 : en caméra libre, dessiné en isométrique sous une transformation — groundPass)
    this.groundPass(true);
    if(this.tiles&&!this.ovTex)this.makeOverview();
    if(this.zoom<.45||!this.tiles){const o=this.toScreen(0,0);const k=TW/2*z/(this.ovS/2);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.overview,o.x-N*this.ovS/2*k,o.y,this.overview.width*k,this.overview.height*k);
      if(!this.shadeCv)this.makeShade();const k2=TW/2*z/(this.shS/2);ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.45;ctx.drawImage(this.shadeCv,o.x-N*this.shS/2*k2,o.y,this.shadeCv.width*k2,this.shadeCv.height*k2);ctx.restore();
      // les arbres, en petit et un peu transparents, pour voir les forêts et ce qu'elles cachent
      if(this.zoom<.3){this.makeForest();ctx.save();ctx.globalAlpha=.72;ctx.drawImage(this.forest,o.x-N*this.ovS/2*k,o.y,this.forest.width*k,this.forest.height*k);ctx.restore();}}
    else{const tw=(TW+2)*z,th=(TH+2)*z;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const p=this.toScreen(i,j);if(!this._iso&&(p.x<-tw||p.x>cw+tw||p.y<-th||p.y>ch+th))continue;const t=W.G.terrain[j*N+i];ctx.drawImage(this.tiles[t][(j&3)*4+(i&3)],p.x-tw/2,p.y,tw,th);}
      if(!this.shadeCv)this.makeShade();const o=this.toScreen(0,0);const k=TW/2*z/(this.shS/2);ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.55;ctx.imageSmoothingEnabled=true;ctx.drawImage(this.shadeCv,o.x-N*this.shS/2*k,o.y,this.shadeCv.width*k,this.shadeCv.height*k);ctx.restore();}
    // Les cratères d'obus sont dans le monde : ils restent après sauvegarde et rendent réellement la case pénible à traverser.
    for(const d of s.craters||[]){if(!this.fxVisible(d.x,d.y))continue;if(d.x<i0-3||d.x>i1+3||d.y<j0-3||d.y>j1+3)continue;const q=this.toScreen(d.x,d.y),rx=d.r*TW/2*z,ry=d.r*TH/2*z;ctx.save();ctx.globalAlpha=.94;
      // le sol autour du cratère : un halo de terre brûlée et de suie, plus large pour un gros obus, avec des traînées radiales projetées par le souffle
      {const hf=1.55+(d.force||1)*.3,hr=rx*hf,hy=ry*hf,gh=ctx.createRadialGradient(q.x,q.y,rx*.6,q.x,q.y,hr);gh.addColorStop(0,'rgba(20,16,12,.55)');gh.addColorStop(.55,'rgba(38,29,20,.30)');gh.addColorStop(1,'rgba(48,36,24,0)');ctx.fillStyle=gh;ctx.beginPath();ctx.ellipse(q.x,q.y,hr,hy,0,0,7);ctx.fill();
       ctx.strokeStyle='rgba(14,12,10,.30)';ctx.lineWidth=Math.max(1,this.dpr*1.5);for(let n=0;n<14;n++){const a=n/14*6.283+d.seed*.0007,L2=1.15+(Math.sin(d.seed+n*7.7)*.5+.5)*.55;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*rx*1.05,q.y+Math.sin(a)*ry*1.05);ctx.lineTo(q.x+Math.cos(a)*rx*L2*1.3,q.y+Math.sin(a)*ry*L2*1.3);ctx.stroke();}}
      const g=ctx.createRadialGradient(q.x-rx*.15,q.y-ry*.1,rx*.08,q.x,q.y,rx);g.addColorStop(0,'rgba(9,10,10,.98)');g.addColorStop(.42,'rgba(17,17,16,.93)');g.addColorStop(.7,'rgba(34,30,27,.85)');g.addColorStop(.88,'rgba(64,48,36,.67)');g.addColorStop(1,'rgba(90,70,53,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,rx,ry,0,0,7);ctx.fill();ctx.strokeStyle='rgba(20,18,16,.8)';ctx.lineWidth=Math.max(1,this.dpr);for(let n=0;n<9;n++){const a=n/9*Math.PI*2+d.seed*.001,L=.5+(Math.sin(d.seed+n*9.2)*.5+.5)*.35;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*rx*.48,q.y+Math.sin(a)*ry*.48);ctx.lineTo(q.x+Math.cos(a)*rx*L,q.y+Math.sin(a)*ry*L);ctx.stroke();}ctx.restore();}
    for(const f of s.groundFires||[]){if(!this.fxVisible(f.x,f.y))continue;if(f.x<i0-3||f.x>i1+3||f.y<j0-3||f.y>j1+3)continue;const q=this.toScreen(f.x,f.y),rx=f.r*TW/2*z,ry=f.r*TH/2*z,p=.75+.25*Math.sin(this.frame*2.1+f.x);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,rx);g.addColorStop(0,`rgba(255,236,115,${.42*p})`);g.addColorStop(.42,`rgba(255,91,22,${.34*p})`);g.addColorStop(1,'rgba(90,20,5,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,rx,ry,0,0,7);ctx.fill();ctx.restore();}
    // traces de sang, souches et gravats temporaires
    this.decals=this.decals.filter(d=>(d.age+=dt)<(d.kind==='stump'||d.kind==='rubble'?4000:400));if(this.decals.length>900)this.decals.splice(0,this.decals.length-900);for(const d of this.decals){if(!this.fxVisible(d.x,d.y))continue;if(d.x<i0-2||d.x>i1+2||d.y<j0-2||d.y>j1+2)continue;const q=this.toScreen(d.x,d.y);ctx.save();
      if(d.kind==='bloodimg'){const im=img('fx/'+d.img+'.webp');if(im){const a=Math.max(0,1-d.age/400);const dry=Math.min(1,d.age/80);ctx.globalAlpha=.9*a;ctx.translate(q.x,q.y);ctx.scale(1,.5);ctx.rotate(d.rot);
          ctx.filter=dry>.05?`brightness(${1-.45*dry}) saturate(${1-.3*dry})`:'none';const w=d.r*TW*z*2;ctx.drawImage(im,-w/2,-w/2,w,w);ctx.filter='none';}ctx.restore();continue;}
      if(d.kind==='stump'){// une souche : le bois clair du tronc coupé, ses cernes, l'écorce
        ctx.fillStyle='#5a3f25';ctx.beginPath();ctx.ellipse(q.x,q.y-2*z,7*z,4.5*z,0,0,7);ctx.fill();ctx.fillStyle='#4a331d';ctx.fillRect(q.x-7*z,q.y-2*z,14*z,3*z);ctx.fillStyle='#c9a26a';ctx.beginPath();ctx.ellipse(q.x,q.y-3.5*z,5.6*z,3.3*z,0,0,7);ctx.fill();
        ctx.strokeStyle='#9c7644';ctx.lineWidth=.8*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y-3.5*z,3.4*z,2*z,0,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(q.x,q.y-3.5*z,1.4*z,.8*z,0,0,7);ctx.stroke();ctx.restore();continue;}
      if(d.kind==='rubble'){ctx.fillStyle='#8f887c';for(let n=0;n<5;n++){const h=Math.sin(d.seed+n*7.1)*999;const f=h-Math.floor(h);ctx.beginPath();ctx.ellipse(q.x+(f-.5)*18*z,q.y+((n%3)-1)*4*z,(2+f*3)*z,(1.2+f*1.6)*z,0,0,7);ctx.fill();}ctx.restore();continue;}
      if(d.kind==='blood'){// une flaque, des gouttes autour, qui brunissent en séchant
        const a=Math.max(0,1-d.age/400);const dry=Math.min(1,d.age/60);ctx.globalAlpha=.8*a;ctx.fillStyle=`rgb(${Math.round(120-62*dry)},${Math.round(10+10*dry)},${Math.round(12+4*dry)})`;
        const rx=d.r*TW/2*z,ry=d.r*TH/2*z;ctx.beginPath();ctx.ellipse(q.x,q.y,rx,ry,0,0,7);ctx.fill();for(let n=0;n<5;n++){const h=Math.sin(d.seed+n*12.9898)*43758.5453;const f=h-Math.floor(h);const a2=d.rot+(f-.5)*1.2,r2=(1+f*1.4);
          ctx.beginPath();ctx.ellipse(q.x+Math.cos(a2)*rx*r2,q.y+Math.sin(a2)*ry*r2,rx*.22*(1-f*.5),ry*.22*(1-f*.5),0,0,7);ctx.fill();}}
      else{ctx.globalAlpha=.65*(1-d.age/400);ctx.fillStyle='#2f2519';ctx.beginPath();ctx.ellipse(q.x,q.y,d.r*TW/2*z,d.r*TH/2*z,0,0,7);ctx.fill();}ctx.restore();}
    if(this.soil||this.placing&&BUILDINGS[this.placing]?.soil)this.drawSoil();
    this.drawLines(i0,i1,j0,j1);
    this.groundPass(false);
    // tout ce qui a de la hauteur, trié par profondeur
    const items=[];const inView=(x,y,m=3)=>x>=i0-m&&x<=i1+m&&y>=j0-m&&y<=j1+m;
    if(this.zoom>=.3)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const nd=W.nodeAt[j*N+i];if(nd>=0){const n=s.nodes[nd];items.push({d:i+j+1,f:()=>this.drawNode(n)});}}
    const fog=s.fog!==false;if(fog)this.updateFog();
    this.puffT=(this.puffT||0)+dt;const puff=this.puffT>.4;if(puff)this.puffT=0;
    for(const b of s.buildings){const [w,h]=W.sizeOf(b);if(!inView(b.i+w/2,b.j+h/2,Math.max(w,h)/2+6))continue;
      if(puff&&!b.ruin&&this.fxVisible(b.i+w/2,b.j+h/2,b.f)){const R=Math.random;if(!b.done&&b.progress>0&&b.progress<1&&!b.why&&R()<.3)this.sfx('construction-dust',b.i+R()*w,b.j+h,{z:.05,size:24+R()*12,life:1.2,rise:.15,grow:1.3,alpha:.4,ang:R()*6,f:b.f});
        // V12.4 : un bâtiment touché fume, d'autant plus qu'il a perdu de sa solidité
        else if(b.done&&b.max>0&&b.hp<b.max*.75&&R()<(1-b.hp/b.max)*.5)this.sfx(b.hp<b.max*.4?'smoke_cloud':'smoke_gray1',b.i+w*(.2+R()*.6),b.j+h*(.2+R()*.6),{z:.8+R()*.6,size:(30+R()*30)*(1.4-b.hp/b.max),life:3+R()*3,rise:.45,grow:1.9,alpha:.55,ang:R()*6,f:b.f});
        else if(b.done&&b.working&&BUILDINGS[b.k].factory&&R()<.45)this.sfx('workshop-sparks',b.i+w*(.3+R()*.4),b.j+h*(.3+R()*.4),{z:.6,size:26,life:.35,add:true,ang:R()*6,f:b.f});}if(fog&&b.f==='beee'&&!this.fxVisible(b.i+w/2,b.j+h/2,b.f)){const I=s.intel?.[b.id];if(I)(this.ghosts??=[]).push({b,I,w,h});}else items.push({d:b.k==='aerodrome'?b.i+b.j+1:b.i+b.j+w+h-.5,f:()=>this.drawBuilding(b)});}
    for(const c of s.corpses)if(inView(c.x,c.y)&&this.zoom>=.35)items.push({d:c.x+c.y-.05,f:()=>this.drawCorpse(c)});
    this.toppling=this.toppling.filter(t=>(t.age+=dt)<1.6);for(const t of this.toppling)if(inView(t.x,t.y))items.push({d:t.x+t.y,f:()=>{const im=prop(t.name);if(!im)return;const q=this.toScreen(t.x,t.y);const w=TW*1.15*z;const k=Math.min(1,t.age/.9);const ang=t.side*1.45*k*k;
      ctx.save();ctx.globalAlpha=t.age<1.1?1:Math.max(0,1-(t.age-1.1)/.5);ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.drawImage(im,-w/2,-w*.9,w,w);ctx.restore();}});
    const seen=u=>!fog||u.f==='meumeu'||W.spotted(u,'meumeu',.5);
    for(const u of s.units)if(inView(u.x,u.y)&&seen(u))items.push({d:u.x+u.y,f:()=>this.drawUnit(u)});
    for(const a of s.fauna||[])if(inView(a.x,a.y)&&this.zoom>=.3&&((a.alive)||a.food>0))items.push({d:a.x+a.y+.02,f:()=>this.drawFauna(a)});
    for(const v of s.vehicles)if(inView(v.x,v.y,8)&&!(v.alt>0)&&(!fog||v.f==='meumeu'||this.fogVis?.[Math.floor(v.y)*N+Math.floor(v.x)]))items.push({d:v.x+v.y+.3,f:()=>this.drawVehicle(v)});
    items.sort((a,b)=>a.d-b.d);
    for(const u of s.units)if(this.sel.has(u.id)){const q=this.toScreen(u.x,u.y);ctx.strokeStyle='#ffd36a';ctx.lineWidth=2*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,11*z,5.5*z,0,0,7);ctx.stroke();}
    const g3=this.g3;this.o3=!!g3;
    if(g3){ // le sol vivant sous les modèles (lueur des filons, flaques de sang), puis la scène 3D
      for(const n of s.nodes)if(n.type==='ore'&&inView(n.i,n.j))this.oreGlow(n);
      for(const u of s.units)if(u.h&&inView(u.x,u.y)&&seen(u)){const lost=1-u.h.blood/BLOOD,dn=u.h.state==='hors';if(dn||lost>.06){const q=this.toScreen(u.x,u.y);this.pool(q.x,q.y,lost,z,u.id);}}
      for(const c of s.corpses)if(inView(c.x,c.y)){const a=Math.max(0,Math.min(1,1-(W.t-c.t)/(3*DAY)));if(a>0){const q=this.toScreen(c.x,c.y);ctx.save();ctx.globalAlpha=.35+.65*a;this.pool(q.x,q.y,Math.max(.3,c.bl||.3),z,Math.round(c.x*97+c.y*31));ctx.restore();}}
      for(const b of s.buildings){const [w,h]=W.sizeOf(b);if(!inView(b.i+w/2,b.j+h/2,Math.max(w,h)/2+6))continue;this.groundDecor(b,w,h,z);}
      g3.setCamera(this);g3.sync(this,dt,this.vis);ctx.drawImage(g3.render(),0,0);}
    for(const it of items)it.f();
    this.drawTracks(inView);
    // une unité cachée derrière un bâtiment se devine en transparence (seulement les bâtiments à l'écran, et seulement ce qu'on voit)
    const vb=this.zoom>=.4?s.buildings.filter(b=>{if(!b.done||b.ruin)return false;const [w,h]=W.sizeOf(b);return inView(b.i+w/2,b.j+h/2,Math.max(w,h)/2+4);}):[];
    if(vb.length)for(const u of s.units)if(inView(u.x,u.y)&&u.hp>0&&seen(u)){const q=this.toScreen(u.x,u.y);const blocked=vb.some(b=>{const [w,h]=W.sizeOf(b);if(b.i+b.j+w+h-.5<=u.x+u.y||Math.abs(b.i+w/2-u.x)>w+2||Math.abs(b.j+h/2-u.y)>h+3)return false;const foot=this.toScreen(b.i+w,b.j+h),pw=(w+h)/2*TW*z*1.05;return q.y<foot.y&&q.y>foot.y-pw&&Math.abs(q.x-foot.x)<pw*.55;});if(blocked){ctx.save();ctx.globalAlpha=.5;ctx.shadowColor=u.f==='beee'?'#ffae80':'#ffeebb';ctx.shadowBlur=6*z;this.drawUnit(u);ctx.restore();}}
    // Les pieds déterminent la profondeur ; un repère au-dessus du décor rend
    // aussi les unités masquées par un grand bâtiment toujours localisables.
    for(const u of s.units)if(inView(u.x,u.y)&&u.hp>0&&seen(u)&&(u.f==='beee'||this.sel.has(u.id))){
      const q=this.toScreen(u.x,u.y);ctx.save();ctx.globalAlpha=.7;ctx.strokeStyle=u.f==='beee'?'#ff8060':'#ffd36a';ctx.lineWidth=1.3*this.dpr;
      ctx.beginPath();ctx.ellipse(q.x,q.y,9*z,4.5*z,0,0,7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(q.x,q.y-41*z);ctx.lineTo(q.x,q.y-47*z);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y-49*z,2.6*z,0,7);ctx.fillStyle=u.f==='beee'?'#ff8060':'#ffd36a';ctx.fill();ctx.restore();}
    if(fog)this.drawFog();
    this.drawNight();
    if(fog)this.drawIntel();else this.drawHeard();
    this.stepParts(dt);this.drawShots();this.drawStreaks(dt);this.drawParts(false);this.drawSmokes();this.drawFx(dt);this.drawLogistics();this.drawFocus();
    for(const v of s.vehicles)if(v.alt>0&&inView(v.x,v.y,12))this.drawVehicle(v);
    this.drawNightVision();this.drawCones();this.drawCharges();this.drawParts(true);this.drawLinks();
    if(this.placing&&this.hover)this.drawGhost();if(this.lining?.cells)this.drawLinePlan();
    if(this.drag?.box){const {x0,y0,x1,y1}=this.drag.box;ctx.fillStyle='rgba(255,211,106,.12)';ctx.strokeStyle='#ffd36a';ctx.lineWidth=1.5*this.dpr;ctx.fillRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));ctx.strokeRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));}
    this.marks=this.marks.filter(m=>(m.age+=dt)<.6);for(const m of this.marks){const q=this.toScreen(m.x,m.y);ctx.strokeStyle=m.bad?`rgba(235,90,70,${1-m.age/.6})`:`rgba(255,211,106,${1-m.age/.6})`;ctx.lineWidth=2.5*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,(6+m.age*30)*z,(3+m.age*15)*z,0,0,7);ctx.stroke();}
    this.drawZones(dt);this.drawCombatHud(dt);
    if(this.hover?.label&&!this.drag?.box)this.tag(this.hover.label,this.hover.sx+14*this.dpr,this.hover.sy+22*this.dpr,this.hover.tone||'ink',true);}

  drawCombatHud(dt){const ctx=this.ctx,z=this.z(),dpr=this.dpr,cw=this.canvas.width,ch=this.canvas.height,now=performance.now(),W=this.world;
    // la poussière que soulèvent les balles autour de ceux qui sont cloués au sol
    if(this.zoom>=.5)for(const u of W.s.units){if(!(u.supp>.55)||u.hp<=0||Math.random()>.06*dt*60)continue;if(this.near(u.x,u.y)<=0||!this.fxVisible(u.x,u.y,u.f))continue;const a=Math.random()*6.283,r=.3+Math.random()*.7;
      this.puff(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r,{n:3,color:'rgba(150,122,86,.8)',size:2.4,spread:.4,up:1,life:.4,grav:5,z:.05});}
    // les textes de combat, qui montent et s'effacent
    this.floaters=(this.floaters||[]).filter(f=>now-f.t0<f.life*1000);ctx.save();ctx.textAlign='center';
    for(const f of this.floaters){const k=(now-f.t0)/(f.life*1000);if(!this.fxVisible(f.x,f.y))continue;const q=this.toScreen(f.x+f.dx*k,f.y,f.z+k*.9);const pop=k<.12?.7+k/.12*.45:1.15-Math.min(.15,(k-.12)*.4);
      ctx.globalAlpha=Math.min(1,(1-k)*2.2);ctx.font=`${f.bold?900:700} ${f.size*dpr*Math.max(.85,Math.min(1.3,this.zoom))*pop}px system-ui,sans-serif`;ctx.lineWidth=3.4*dpr;ctx.strokeStyle='rgba(12,8,6,.85)';ctx.strokeText(f.text,q.x,q.y);ctx.fillStyle=f.color;ctx.fillText(f.text,q.x,q.y);}ctx.restore();
    // le voile rouge : l'un des nôtres qu'on regarde est touché
    if(this.hurt>.01){const g=ctx.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*.35,cw/2,ch/2,Math.max(cw,ch)*.72);g.addColorStop(0,'rgba(160,0,0,0)');g.addColorStop(1,`rgba(170,10,5,${.42*this.hurt})`);ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);this.hurt*=Math.pow(.18,dt);}
    // l'éclair d'une grosse explosion au centre de l'écran
    if(this.boomFlash>.01){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,214,160,${this.boomFlash})`;ctx.fillRect(0,0,cw,ch);ctx.restore();this.boomFlash*=Math.pow(.02,dt);}
    // le fil des combats, en bas à droite de la carte (à gauche du panneau, au-dessus du bord) : le plus récent en bas
    this.feedL=(this.feedL||[]).filter(f=>now-f.t0<9000);if(this.feedL.length){const pan=document.getElementById('panel')?.getBoundingClientRect(),cr=this.canvas.getBoundingClientRect();const right=pan&&pan.width>0?Math.min(cw,(pan.left-cr.left)*(cw/cr.width)):cw;
      ctx.save();ctx.textAlign='right';ctx.font=`700 ${10.5*dpr}px system-ui,sans-serif`;let y=ch-24*dpr;for(const f of this.feedL){const a=Math.min(1,(9000-(now-f.t0))/1200);const txt=f.html.replace(/<[^>]+>/g,'');const w=ctx.measureText(txt).width+16*dpr;
        ctx.globalAlpha=a;ctx.fillStyle=f.tone==='good'?'rgba(18,42,26,.82)':'rgba(52,16,12,.82)';ctx.fillRect(right-12*dpr-w,y-13*dpr,w,18*dpr);ctx.fillStyle=f.tone==='good'?'#bff0c8':'#ffc9b8';ctx.fillText(txt,right-20*dpr,y);y-=21*dpr;}ctx.restore();}}
  // Les rattachements du bâtiment choisi : d'où une usine prend (sarcelle), où elle livre (orange), les chantiers d'un dépôt (or) ;
  // le voyage du véhicule choisi. Des pointillés qui avancent, une flèche au bout.
  drawLinks(){const W=this.world,ctx=this.ctx,z=this.z();const L=[];const b=this.selB!=null&&W.building(this.selB);
    if(b&&b.f==='meumeu'&&W.bc){if(W.takesIn(b)&&b.sup!=null){const d=W.building(b.sup);if(d)L.push([d,b,'#54aaa1']);}if(W.givesOut(b)&&b.out!=null){const d=W.building(b.out);if(d)L.push([b,d,'#ee7d26']);}
      if(W.isDepot(b)){const K=W.linkedTo(b);for(const x of K.sup)L.push([b,x,'#54aaa1']);for(const x of K.out)if(x!==b)L.push([x,b,'#ee7d26']);for(const x of K.site)L.push([b,x,'#e8bf62']);}
      if(!b.done&&!b.ruin&&b.site!=null){const d=W.building(b.site);if(d)L.push([d,b,'#e8bf62']);}}
    const v=this.selV!=null&&W.s.vehicles.find(x=>x.id===this.selV);
    if(v?.job){const S=v.job.from!=null?W.building(v.job.from):null,D=W.building(v.job.to);const me={x:v.x,y:v.y};if(S&&v.job.phase==='src'){L.push([me,S,'#fff1c9']);if(D)L.push([S,D,'#fff1c9']);}else if(D)L.push([me,D,'#fff1c9']);}
    if(!L.length)return;const P=o=>o.k?W.bc(o):[o.x,o.y];
    ctx.save();ctx.lineWidth=2.4*this.dpr;ctx.setLineDash([8*this.dpr,6*this.dpr]);ctx.lineDashOffset=-this.clock*30*this.dpr;
    for(const [a,c,col] of L){const [ax,ay]=P(a),[cx,cy]=P(c);const p=this.toScreen(ax,ay),q=this.toScreen(cx,cy);const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<4)continue;
      ctx.strokeStyle='rgba(20,30,34,.55)';ctx.lineWidth=4.4*this.dpr;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      ctx.strokeStyle=col;ctx.lineWidth=2.4*this.dpr;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      const ux=dx/d,uy=dy/d,s=9*this.dpr,tx=q.x-ux*14*z,ty=q.y-uy*14*z;ctx.save();ctx.setLineDash([]);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(tx+ux*s,ty+uy*s);ctx.lineTo(tx-uy*s*.6,ty+ux*s*.6);ctx.lineTo(tx+uy*s*.6,ty-ux*s*.6);ctx.closePath();ctx.fill();ctx.restore();}
    ctx.restore();}
  // Les rails : deux files et des traverses, dans le sens des voisins. Les murs : des blocs de pierre, crénelés.
  drawLines(i0,i1,j0,j1){const W=this.world,ctx=this.ctx,N=W.N,z=this.z();
    this.drawRails(i0,i1,j0,j1);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=W.s.trenches?.[j*N+i];if(!t)continue;
      // V12.4 : les cases voisines se raccordent (pas de bord entre elles) — une fosse de 2 × 2 cases se voit comme UN trou, plus comme quatre
      const T=W.s.trenches,nb=(di,dj)=>{const o=T[(j+dj)*N+i+di];return o&&o.f===t.f;},x0=nb(-1,0)?0:.12,x1=nb(1,0)?1:.85,y0=nb(0,-1)?0:.15,y1=nb(0,1)?1:.84;
      const a=this.toScreen(i+x0,j+y0),b=this.toScreen(i+x1,j+y0),c=this.toScreen(i+x1,j+y1),d=this.toScreen(i+x0,j+y1);
      ctx.save();ctx.globalAlpha=t.b?1:.42;ctx.fillStyle='#382c24';ctx.strokeStyle=t.f==='beee'?'#8f775a':'#a98a5b';ctx.lineWidth=3*z;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
      // le parapet : seulement sur les bords extérieurs de la fosse
      ctx.beginPath();if(!nb(0,-1)){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}if(!nb(1,0)){ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);}if(!nb(0,1)){ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);}if(!nb(-1,0)){ctx.moveTo(d.x,d.y);ctx.lineTo(a.x,a.y);}ctx.stroke();
      ctx.restore();}
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;const w=W.wall[k];if(!w)continue;const built=Math.abs(w)===2;const mine=w>0;const c=this.toScreen(i+.5,j+.5);const hgt=(built?1.1:.15)*TH*z;
      const top=mine?'#cbb893':'#6f7456',side=mine?'#9a8866':'#4c5040',side2=mine?'#b3a07c':'#5b6048';const a=this.toScreen(i,j),b=this.toScreen(i+1,j),cc=this.toScreen(i+1,j+1),d=this.toScreen(i,j+1);
      ctx.save();if(!built)ctx.globalAlpha=.5;ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(cc.x,cc.y-hgt);ctx.lineTo(d.x,d.y-hgt);ctx.fill();
      ctx.fillStyle=side2;ctx.beginPath();ctx.moveTo(cc.x,cc.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y-hgt);ctx.lineTo(cc.x,cc.y-hgt);ctx.fill();
      ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(a.x,a.y-hgt);ctx.lineTo(b.x,b.y-hgt);ctx.lineTo(cc.x,cc.y-hgt);ctx.lineTo(d.x,d.y-hgt);ctx.fill();
      if(built){ctx.fillStyle=side;for(const t of [.25,.75]){const q=this.toScreen(i+t,j+t);ctx.fillRect(q.x-3*z,q.y-hgt-5*z,6*z,5*z);}const wo=W.s.walls[k];if(wo&&wo.hp<LINES.mur.hp*.99)this.bar(c.x,c.y-hgt-10*z,22*z,wo.hp/LINES.mur.hp,'#bd4b3d');}ctx.restore();}}
  oreGlow(n){const ctx=this.ctx,z=this.z();const q=this.toScreen(n.i+.5,n.j+.5);const w=TW*1.7*z;const pulse=.5+.5*Math.sin(this.frame/3);const col=ORE_COL[n.res]||'#ffd36a';ctx.save();const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,w*.75);g.addColorStop(0,col);g.addColorStop(1,col+'00');ctx.globalAlpha=(.35+.25*pulse)*(n.left>0?1:.3);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,w*.75,w*.34,0,0,7);ctx.fill();ctx.restore();}
  drawNode(n){const ctx=this.ctx,z=this.z();const q=this.toScreen(n.i+.5,n.j+.5);const W=this.world;
    if(n.type==='ore'){const im=prop(OUTCROP[n.res]);const w=TW*1.7*z;const col=ORE_COL[n.res]||'#ffd36a';if(!this.o3)this.oreGlow(n);
      if(this.zoom>.45){const t=`${RES[n.res]?.name||n.res} · ${Math.round(n.left)}`;ctx.font=`600 ${Math.round(11*Math.min(1.6,Math.max(.8,z)))}px system-ui`;const tw=ctx.measureText(t).width;const ly=q.y-w*.62;ctx.fillStyle='rgba(12,18,22,.78)';ctx.fillRect(q.x-tw/2-5,ly-12,tw+10,16);ctx.fillStyle=col;ctx.fillRect(q.x-tw/2-5,ly-12,3,16);ctx.fillStyle='#e8eef0';ctx.textAlign='center';ctx.fillText(t,q.x+1,ly);ctx.textAlign='left';}
      if(!this.o3&&im&&!W.s.buildings.some(b=>b.ore===n.id))ctx.drawImage(im,q.x-w/2,q.y-w*.75,w,w);const ic=icon(n.res);if(ic&&this.zoom>.5)ctx.drawImage(ic,q.x-9*z,q.y-w*.9,18*z,18*z);return;}
    if(this.o3)return;
    if(n.left<1&&n.type!=='bush')return;let name,w,lift=.9;const f=Math.min(1,n.left/n.max);
    if(n.type==='tree'){const ks=TREES[W.G.terrain[n.j*W.N+n.i]]||TREES[T.grass];name=f<.25?'tree_sapling':ks[(n.id*7+n.i)%ks.length];w=TW*(f<.25?.7:1+.25*f)*z;}
    else if(n.type==='rock'){name='outcrop_rock';w=TW*(.6+.4*f)*z;lift=.72;}else{name=n.left>=1?(n.id%4===0?'bush_flower':'bush_berry'):(n.id%2?'bush_green':'bush_low');w=TW*.7*z;lift=.8;}
    const im=prop(name);if(!im)return;const ox=((n.id*37)%9-4)*z,oy=((n.id*53)%7-3)*z*.5;ctx.drawImage(im,q.x-w/2+ox,q.y-w*lift+oy,w,w);}
  // La tente médicale : une toile blanche sur deux mâts, une croix rouge sur chaque pan, la porte ouverte ; à moitié montée,
  // les mâts seuls ; en ruine, la toile à terre.
  drawTent(b,z){const ctx=this.ctx;const W=this.world;const c=this.toScreen(b.i+1,b.j+1);const P=(dx,dy,h=0)=>this.toScreen(b.i+1+dx,b.j+1+dy,h);const k=b.done?1:b.ruin?0:Math.min(1,b.progress);const H=1.1*k;
    if(b.ruin){ctx.fillStyle='#bdb3a2';ctx.beginPath();const a=P(-.9,-.6),q=P(.8,-.8),r=P(.9,.7),d=P(-.7,.9);ctx.moveTo(a.x,a.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();return;}
    const f1=P(-.85,-.85),f2=P(.85,-.85),f3=P(.85,.85),f4=P(-.85,.85),r1=P(-.85,0,H),r2=P(.85,0,H);
    ctx.strokeStyle='#5a4632';ctx.lineWidth=2*z;for(const [a,q] of [[P(-.85,0),r1],[P(.85,0),r2]]){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
    if(k<.35)return;ctx.globalAlpha=b.done?1:.55+.45*k;
    const pan=(a,q,r,d,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(90,80,70,.5)';ctx.lineWidth=1*this.dpr;ctx.stroke();};
    pan(f1,f2,r2,r1,'#d9d2c4');pan(f4,f3,r2,r1,'#f3eee4');
    // la porte, sur le petit côté
    ctx.fillStyle='#6b5a48';ctx.beginPath();const p1=P(.85,.35),p2=P(.85,-.35);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(r2.x,r2.y+4*z);ctx.closePath();ctx.fill();
    // la croix rouge, sur le pan clair
    const cx=(f4.x+f3.x+r1.x+r2.x)/4,cy=(f4.y+f3.y+r1.y+r2.y)/4;ctx.fillStyle='#c62828';ctx.fillRect(cx-5*z,cy-1.8*z,10*z,3.6*z);ctx.fillRect(cx-1.8*z,cy-5*z,3.6*z,10*z);ctx.globalAlpha=1;
    const L=(b.wardList||[]).length;if(L&&this.zoom>.45){this.tag(`✚ ${L}`,c.x,c.y-H*TH*z-14*z,'bad');}}
  // un sprite de bâtiment aux couleurs bèè : repeint une fois, gardé
  sprite(k,stage,f){const B=BUILDINGS[k];const name=f==='beee'&&BEEE_SPRITE[k]?BEEE_SPRITE[k]:B.sprite;const im=building(name,stage);if(!im||f!=='beee'||BEEE_SPRITE[k])return im;
    const key=name+stage;let c=this.tinted.get(key);if(!c){c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.filter='sepia(.6) hue-rotate(35deg) saturate(.7) brightness(.85)';x.drawImage(im,0,0);this.tinted.set(key,c);}return c;}
  // Les huit champs du moulin : le blé mûr d'une bonne terre est doré et dense ; sur une terre maigre, clairsemé et pâle ;
  // un cratère, de la terre retournée. Les sillons suivent le domaine ; le vent fait onduler les épis.
  drawFields(b,z){const ctx=this.ctx,W=this.world,N=W.N;const t=this.clock;
    for(let dj=0;dj<3;dj++)for(let di=0;di<3;di++){if(di===1&&dj===1)continue;const i=b.i+di,j=b.j+dj;const f=W.fertAt(i,j),cr=W.crater?.[j*N+i]>0;
      const P=[this.toScreen(i,j),this.toScreen(i+1,j),this.toScreen(i+1,j+1),this.toScreen(i,j+1)];ctx.save();ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);for(const q of P.slice(1))ctx.lineTo(q.x,q.y);ctx.closePath();
      const q=Math.min(1,f/85),grown=b.done&&!b.ruin?1:b.progress||0;
      ctx.fillStyle=cr||b.ruin?'#4a3a28':`rgb(${Math.round(150+80*q*grown)},${Math.round(128+60*q*grown)},${Math.round(70-20*q)})`;ctx.fill();ctx.clip();
      if(!cr&&!b.ruin&&grown>.2){ctx.strokeStyle=`rgba(${q>.5?'120,86,22':'96,78,50'},${.35+.3*q})`;ctx.lineWidth=Math.max(1,1.3*z);const rows=5;for(let r=1;r<rows;r++){const u=r/rows;const a0=this.toScreen(i+u,j),a1=this.toScreen(i+u,j+1);const sway=Math.sin(t*1.6+i*.7+j*.4+r)*1.2*z;ctx.beginPath();ctx.moveTo(a0.x+sway,a0.y);ctx.lineTo(a1.x+sway,a1.y);ctx.stroke();}
        if(z>.55){ctx.fillStyle=`rgba(255,226,120,${.25+.45*q})`;const m=Math.round(4+8*q);for(let n=0;n<m;n++){const h=Math.sin((i*31+j*17+n*7.3)*12.9898)*43758.5;const fx=h-Math.floor(h),fy=(h*7)%1;const e=this.toScreen(i+fx,j+Math.abs(fy));ctx.fillRect(e.x-.8*z,e.y-3*z+Math.sin(t*1.6+n)*z,1.6*z,3*z);}}}
      ctx.restore();ctx.strokeStyle='rgba(60,44,24,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);for(const q2 of P.slice(1))ctx.lineTo(q2.x,q2.y);ctx.closePath();ctx.stroke();}}
  // ce que les bâtiments posent au sol (et que la scène 3D ne montre pas) : champs du moulin, piste de l'aérodrome, gravats des ruines
  groundDecor(b,w,h,z){const ctx=this.ctx;
    if(b.k==='moulin')this.drawFields(b,z);
    else if(b.k==='aerodrome'){ctx.save();ctx.fillStyle=b.ruin?'#5a4a3a':'#b9a888';const s0=this.toScreen(b.i,b.j+.3),s1=this.toScreen(b.i+w,b.j+.3),s2=this.toScreen(b.i+w,b.j+1.5),s3=this.toScreen(b.i,b.j+1.5);ctx.beginPath();ctx.moveTo(s0.x,s0.y);ctx.lineTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.lineTo(s3.x,s3.y);ctx.fill();
      if(!b.ruin){ctx.strokeStyle='#fff8e6';ctx.lineWidth=2*z;for(let t=.1;t<.9;t+=.14){const m1=this.toScreen(b.i+w*t,b.j+.9),m2=this.toScreen(b.i+w*(t+.06),b.j+.9);ctx.beginPath();ctx.moveTo(m1.x,m1.y);ctx.lineTo(m2.x,m2.y);ctx.stroke();}}ctx.restore();}
    if(b.ruin){ctx.save();ctx.fillStyle='#3d3128';for(let n=0;n<9;n++){const q=this.toScreen(b.i+w*((n*37%10)/10),b.j+h*((n*53%10)/10));ctx.beginPath();ctx.ellipse(q.x,q.y,(5+n%3*3)*z,(2.5+n%2*1.5)*z,0,0,7);ctx.fill();}ctx.restore();}}
  drawBuilding(b){const ctx=this.ctx,z=this.z(),W=this.world;const B=BUILDINGS[b.k];const [w,h]=W.sizeOf(b);const sel=this.selB===b.id;
    const a=this.toScreen(b.i,b.j),bb=this.toScreen(b.i+w,b.j),cc=this.toScreen(b.i+w,b.j+h),d=this.toScreen(b.i,b.j+h);
    const dia=(fill,stroke,dash)=>{ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bb.x,bb.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(d.x,d.y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5*this.dpr;if(dash)ctx.setLineDash(dash);ctx.stroke();}ctx.restore();};
    dia(this.o3?null:b.ruin?'rgba(40,32,26,.55)':!b.done?'rgba(122,86,50,.4)':'rgba(90,70,48,.25)',sel?'#ffd36a':b.f==='beee'?'rgba(224,80,58,.6)':!b.done&&!b.ruin?'#e8bf62':null,!b.done&&!b.ruin?[5*z,4*z]:null);
    if(!this.o3){
    if(b.k==='tente'){this.drawTent(b,z);}
    else if(b.k==='aerodrome'){ctx.save();ctx.fillStyle=b.ruin?'#5a4a3a':'#b9a888';const s0=this.toScreen(b.i,b.j+.3),s1=this.toScreen(b.i+w,b.j+.3),s2=this.toScreen(b.i+w,b.j+1.5),s3=this.toScreen(b.i,b.j+1.5);ctx.beginPath();ctx.moveTo(s0.x,s0.y);ctx.lineTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.lineTo(s3.x,s3.y);ctx.fill();
      if(!b.ruin){ctx.strokeStyle='#fff8e6';ctx.lineWidth=2*z;for(let t=.1;t<.9;t+=.14){const m1=this.toScreen(b.i+w*t,b.j+.9),m2=this.toScreen(b.i+w*(t+.06),b.j+.9);ctx.beginPath();ctx.moveTo(m1.x,m1.y);ctx.lineTo(m2.x,m2.y);ctx.stroke();}}ctx.restore();
      const im=this.sprite('aerodrome',b.done?3:1,b.f);const p=this.toScreen(b.i+w,b.j+h);const pw=2*TW*z;if(im){ctx.save();if(b.ruin)ctx.filter='brightness(.4)';ctx.drawImage(im,p.x-pw*.6,p.y-pw*.9,pw,pw);ctx.restore();}}
    else if(b.k==='moulin'){this.drawFields(b,z);const stage=b.done?3:b.ruin?1:b.progress<.5?1:2;const p=this.toScreen(b.i+2,b.j+2);const pw=1.75*TW*z;const im=this.sprite(b.k,stage,b.f);
      if(im){ctx.save();if(b.ruin)ctx.filter='brightness(.35) saturate(.3)';else if(!b.done)ctx.globalAlpha=.5+.5*b.progress;const ph=pw*im.naturalHeight/im.naturalWidth;ctx.drawImage(im,p.x-pw/2,p.y-ph*.93,pw,ph);ctx.restore();}}
    else{const stage=b.done?3:b.ruin?1:b.progress<.5?1:2;const p=this.toScreen(b.i+(b.k==='enclos'?Math.min(w,3):w),b.j+(b.k==='enclos'?Math.min(h,3):h));const pw=(b.k==='enclos'?3:(w+h)/2)*TW*z*1.05;const im=this.sprite(b.k,stage,b.f);
      if(im){ctx.save();if(b.ruin)ctx.filter='brightness(.35) saturate(.3)';else if(!b.done)ctx.globalAlpha=.5+.5*b.progress;if(b.hitAt&&W.t-b.hitAt<.03)ctx.filter='brightness(1.6)';const ph=b.done&&['moulin','enclos'].includes(b.k)?pw*im.naturalHeight/im.naturalWidth:pw;ctx.drawImage(im,p.x-pw/2,p.y-ph*.95,pw,ph);ctx.restore();}
      if(b.k==='mine'){const nd=W.s.nodes[b.ore];if(nd){const ic=icon(nd.res);if(ic)ctx.drawImage(ic,p.x-pw*.45,p.y-pw*.4,22*z,22*z);}}}
    if(b.k==='enclos'&&b.done&&!b.ruin){ctx.save();ctx.strokeStyle='#91603b';ctx.lineWidth=2.5*z;for(let edge=0;edge<4;edge++){const p0=[a,bb,cc,d][edge],p1=[bb,cc,d,a][edge];ctx.beginPath();ctx.moveTo(p0.x,p0.y-7*z);ctx.lineTo(p1.x,p1.y-7*z);ctx.moveTo(p0.x,p0.y-13*z);ctx.lineTo(p1.x,p1.y-13*z);ctx.stroke();const posts=edge%2?w:h;for(let t=0;t<=posts;t++){const f=t/posts,x=p0.x+(p1.x-p0.x)*f,y=p0.y+(p1.y-p0.y)*f;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-17*z);ctx.stroke();}}ctx.restore();
      const herd=b.herd||{biche:b.animals};let index=0;for(const kind of ['biche','lapin'])for(let n=0;n<Math.min(herd[kind]||0,Math.min(12,w*h));n++){const im=img('custom/fauna-'+kind+(kind==='lapin'?'-anim':'')+'.png');if(!im)continue;const fx=.5+((index*13+5)%Math.max(1,w*4-4))/4,fy=.5+((index*17+3)%Math.max(1,h*4-4))/4,q=this.toScreen(b.i+fx,b.j+fy),ah=(kind==='lapin'?13:17)*z,aw=(kind==='lapin'?13:16)*z;if(kind==='lapin')ctx.drawImage(im,2*384,512,384,512,q.x-aw/2,q.y-ah*.88,aw,ah);else ctx.drawImage(im,q.x-aw/2,q.y-ah*.88,aw,ah);index++;}}
    if(b.ruin){ctx.save();ctx.fillStyle='#3d3128';for(let n=0;n<9;n++){const q=this.toScreen(b.i+w*((n*37%10)/10),b.j+h*((n*53%10)/10));ctx.beginPath();ctx.ellipse(q.x,q.y,(5+n%3*3)*z,(2.5+n%2*1.5)*z,0,0,7);ctx.fill();}ctx.restore();}
    }
    if(b.fire>0){const q=this.toScreen(b.i+w/2,b.j+h/2);ctx.save();ctx.globalCompositeOperation='lighter';for(let n=0;n<4;n++){const f=Math.sin(this.frame*1.7+n*2.1+b.id)*.5+.5;const x=q.x+(n-1.5)*9*z,y=q.y-8*z-n%2*6*z;
      ctx.globalAlpha=.5+.3*f;ctx.fillStyle=n%2?'#ffd36a':'#ff7a2a';ctx.beginPath();ctx.ellipse(x,y-(8+8*f)*z,(5+3*f)*z,(12+9*f)*z,0,0,7);ctx.fill();}ctx.restore();}
    const top=this.toScreen(b.i+w/2,b.j+h/2);
    if(b.hp<b.max*.99||sel)this.bar(top.x,top.y-(w+h)*TH*z*.55,Math.max(30,(w+h)*9)*z,b.hp/b.max,b.f==='beee'?'#e0503a':'#54aaa1');
    if(!b.done&&!b.ruin&&this.zoom>.5)this.bar(top.x,top.y+4*z,40*z,b.progress,'#ee7d26');
    if(this.zoom>.55&&(sel||this.hover?.b===b.id)){const lbl=`${B.name}${b.f==='beee'?' bèè':''}${b.ruin?' · en ruine':!b.done?` · ${Math.round(b.progress*100)} %`:''}${b.why?' · '+b.why:''}`;this.tag(lbl,top.x,top.y+16*z,b.f==='beee'?'bad':b.ruin?'bad':'ink');}
    if(b.k==='centre'&&this.zoom>.35){this.text(b.city+(b.f==='beee'?'':''),top.x,top.y-(w+h)*TH*z*.62-8*z,b.f==='beee'?'#ffb4a6':'#fff1c9',13);}}
  // Un Meumeu : debout, accroupi, couché, à terre ou mort. Le sang est sur le sprite, là où la balle est entrée (et sortie),
  // et par terre sous ceux qui saignent : plus il a perdu de sang, plus la flaque est grande.
  drawFauna(a){const ctx=this.ctx,z=this.z(),q=this.toScreen(a.x,a.y),im=img(a.kind==='lapin'?'custom/fauna-lapin-anim.png':'custom/fauna-'+a.kind+'.png');if(!im)return;if(this.o3){if(!a.alive){const h=(a.kind==='belier'?46:a.kind==='lapin'?33:48)*z;this.bar(q.x,q.y-h*.9,22*z,a.food/({belier:75,biche:38,lapin:14}[a.kind]||38),'#b88555');}return;}
    const w=(a.kind==='belier'?57:a.kind==='lapin'?31:45)*z,h=(a.kind==='belier'?46:a.kind==='lapin'?33:48)*z,moving=a.alive&&this.world.s.t-(a.moveAt||-10)<.05,bob=moving?Math.abs(Math.sin(this.frame*2+a.id))*1.8*z:0;
    ctx.save();if(!a.alive)ctx.filter='grayscale(.7) brightness(.65)';ctx.translate(q.x,q.y-bob);ctx.scale(a.fx<0?-1:1,1);
    if(a.kind==='lapin'){const frame=!a.alive?7:moving?[2,3,4,5][Math.floor(this.frame*1.4+a.id)%4]:Math.floor(this.frame*.12+a.id)%9===0?1:0;ctx.drawImage(im,(frame%4)*384,Math.floor(frame/4)*512,384,512,-w/2,-h*.86,w,h);}
    else ctx.drawImage(im,-w/2,-h*.86,w,h);ctx.restore();if(!a.alive){this.bar(q.x,q.y-h*.9,22*z,a.food/({belier:75,biche:38,lapin:14}[a.kind]||38),'#b88555');}}
  drawUnit(u){const ctx=this.ctx,z=this.z(),W=this.world;const q=this.toScreen(u.x,u.y);const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];const size=(u.k==='villageois'?34:38)*z;const down=u.h?.state==='hors';
    if(this.zoom<.35&&!this.o3){ctx.fillStyle=down?'#8a1c1c':u.f==='beee'?'#e0503a':u.k==='villageois'?'#fff1c9':'#7fd3f0';ctx.fillRect(q.x-2*z*3,q.y-4*z*3,4*z*3,4*z*3);return;}
    if(u.f==='beee'&&!down&&!this.o3){ctx.strokeStyle='rgba(224,80,58,.75)';ctx.lineWidth=1.6*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,9*z,4.5*z,0,0,7);ctx.stroke();}
    if(u.h&&!this.o3){const lost=1-u.h.blood/BLOOD;if(down||lost>.06)this.pool(q.x,q.y,lost,z,u.id);}
    if(D.img==='canon'){this.drawCannon(u,q,z);}
    else if(!this.o3){const act=down?'idle':u.anim==='walk'?'walk':u.carry&&u.carry.n>0?'carry':u.anim==='aim'?'aim':u.anim==='action'?'action':'idle';
      let name=u.f==='beee'?D.sheet:u.k==='villageois'?'meumeu_player-villager':u.camoSuit?'meumeu_player-camo':'meumeu_player-soldier';
      const sh=sheet(name,act,u.dir||'se')||sheet(name,'idle',u.dir||'se');const pose=down?'down':u.post==='couche'?'prone':u.post==='accroupi'?'crouch':'up';
      // Un servant montre son rôle auprès de la pièce, pas son fusil personnel : cela évite les canons superposés.
      // la marche : quatre temps (pas, passage, pas, passage) sur la distance parcourue ; au passage le corps monte un peu
      // et se balance d'un côté à l'autre, l'arme suit le corps
      const walking=act==='walk'&&!down,ph=(u.walkPh||0)*1.5;const qb=walking?{x:q.x+Math.sin(ph*Math.PI/2)*size*.018,y:q.y-(.5-.5*Math.cos(Math.PI*(ph-.5)))*size*.035}:q;
      // La planche camouflée contient déjà le fusil tenu dans la bonne pose.
      // Ne pas superposer un second modèle d'arme sur les mains du sprite.
      const Wg=u.w&&!down&&!u.serve?W.W(u.w):null;const crewGun=Wg&&Wg.crew>1;const away=u.dir==='ne'||u.dir==='nw';if(Wg&&away&&!crewGun)this.drawGun(u,qb,size,Wg,pose);
      if(sh)this.body(sh,down?0:walking?Math.floor(ph):0,qb,size,pose,u.h?.wounds,u.dir,u.id,down?.25:0,u.armor?W.armorOf(u.armor)?.D:null,D.uniform||null);else this.drawUnitFallback(u,q,size,z,down);
      if(crewGun&&!down)this.drawDesignedCrewGun(u,qb,z,Wg);else if(Wg&&!away)this.drawGun(u,qb,size,Wg,pose);}
    if(u.crates>0&&!down&&!this.o3)this.drawCarried(u,q,z,size);
    const top=down?q.y-size*.35:u.post==='couche'?q.y-size*.4:u.post==='accroupi'?q.y-size*.78:q.y-size;
    if(u.carry&&u.carry.n>=1){const ic=icon(u.carry.k);if(ic)ctx.drawImage(ic,q.x-8*z,q.y-size*.58,16*z,16*z);}
    if(u.carrying!=null){ctx.fillStyle='#fff8e6';ctx.font=`800 ${10*this.dpr}px system-ui`;ctx.textAlign='center';ctx.fillText('✚',q.x,top-4*z);}
    if(u.h&&!down&&u.h.blood<BLOOD*.98)this.bar(q.x,top-6*z,22*z,u.h.blood/BLOOD,'#c0392b');
    if(!u.h&&(u.hp<u.max||this.sel.has(u.id)))this.bar(q.x,top-6*z,22*z,u.hp/u.max,u.f==='beee'?'#e0503a':'#54aaa1');
    if(!down&&(u.supp||0)>.12){this.bar(q.x,top-11*z,22*z,Math.min(1,u.supp),'#e4a62b');if(u.supp>.75){ctx.fillStyle='#ffd36a';ctx.font=`900 ${10*this.dpr}px system-ui`;ctx.textAlign='center';ctx.fillText('!',q.x+15*z,top-5*z);}}
    if(u.h&&u.f==='meumeu'&&u.h.state!=='ok'&&this.zoom>.5){const tr=triage(u.h);ctx.fillStyle=tr.c;ctx.strokeStyle='#fff';ctx.lineWidth=1*this.dpr;ctx.fillRect(q.x-14*z,top-9*z,6*z,6*z);ctx.strokeRect(q.x-14*z,top-9*z,6*z,6*z);}
    // un villageois sans tâche : une bulle « z » au-dessus de lui, qu'on repère de loin
    if(u.f==='meumeu'&&u.k==='villageois'&&!u.task&&!down&&!u.carry){const bx=q.x+11*z,by=top-12*z,r=Math.max(5*this.dpr,7*z);const bob=Math.sin(this.clock*2.5+u.id)*1.5*z;
      ctx.fillStyle='rgba(246,239,220,.95)';ctx.strokeStyle='#173d44';ctx.lineWidth=1.2*this.dpr;ctx.beginPath();ctx.arc(bx,by+bob,r,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#173d44';ctx.font=`900 ${r*1.3}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('z',bx,by+bob+.5);ctx.textBaseline='alphabetic';}
    if(down){ctx.fillStyle='#b3261e';ctx.beginPath();ctx.arc(q.x+10*z,top-2*z,5*z,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(q.x+10*z-3.2*z,top-2*z-1*z,6.4*z,2*z);ctx.fillRect(q.x+10*z-1*z,top-2*z-3.2*z,2*z,6.4*z);}
    if(u.w&&u.f==='meumeu'&&!down){const Wd=W.W(u.w);const n=(u.mag||0)+(u.pouch||0);if(n<Wd.carry*.25){ctx.fillStyle=n<=0?'#bd4b3d':'#ee7d26';ctx.beginPath();ctx.arc(q.x+9*z,top,3*z,0,7);ctx.fill();}}
    if(u.sq&&this.sel.has(u.id)&&this.zoom>.6){const sq=W.squad(u.sq);if(sq){ctx.save();ctx.font=`800 ${9*this.dpr}px system-ui`;ctx.textAlign='center';ctx.fillStyle=sq.leader===u.id?'#ffd36a':'#fff1c9';ctx.strokeStyle='#173d44';ctx.lineWidth=3*this.dpr;const t=String(W.s.squads.indexOf(sq)+1)+(sq.leader===u.id?'★':'');ctx.strokeText(t,q.x-10*z,top);ctx.fillText(t,q.x-10*z,top);ctx.restore();}}
    // ce que l'ennemi sait de ce soldat : « ? » la suspicion monte (vite, à terre !) ; « ! » repéré
    if(u.f==='meumeu'&&!down&&W.atWar&&this.zoom>=.4&&u.k!=='villageois'){const sp=W.spotted(u,'beee'),dv=Math.min(1,u.det?.beee||0);if(sp||dv>.08){const bx=q.x-9*z,by=top-6*z,r=4.6*z;ctx.save();ctx.fillStyle='rgba(12,20,26,.85)';ctx.beginPath();ctx.arc(bx,by,r,0,7);ctx.fill();
      if(sp){ctx.fillStyle='#e5533d';ctx.beginPath();ctx.arc(bx,by,r,0,7);ctx.fill();}else{ctx.fillStyle='#f0b43a';ctx.beginPath();ctx.moveTo(bx,by);ctx.arc(bx,by,r,-Math.PI/2,-Math.PI/2+dv*Math.PI*2);ctx.closePath();ctx.fill();}
      ctx.fillStyle='#fff';ctx.font=`900 ${r*1.5}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sp?'!':'?',bx,by+.5);ctx.restore();}}
    if(u.f==='meumeu'&&u.k==='villageois'&&!u.task&&!down&&!this.sel.has(u.id)){ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.arc(q.x+8*z,top+2*z,2.6*z,0,7);ctx.fill();}}
  // Un corps : couché, assombri, dans sa flaque. Il reste trois jours.
  drawCorpse(c){if(this.o3)return;const ctx=this.ctx,z=this.z();const q=this.toScreen(c.x,c.y);const age=this.world.t-c.t;const a=Math.max(0,Math.min(1,1-age/(3*DAY)));if(a<=0)return;ctx.save();ctx.globalAlpha=.35+.65*a;
    this.pool(q.x,q.y,Math.max(.3,c.bl||.3),z,Math.round(c.x*97+c.y*31));
    if(c.sheet){const sh=sheet(c.sheet,'idle',c.dir||'se');if(sh)this.body(sh,0,q,(c.k==='villageois'?34:38)*z,'dead',c.wounds,c.dir,Math.round(c.x*13),.45);}
    else{ctx.fillStyle='#2b2520';ctx.beginPath();ctx.ellipse(q.x,q.y-3*z,13*z,6*z,.2,0,7);ctx.fill();}ctx.restore();}
  pool(x,y,lost,z,seed){const ctx=this.ctx;const r=(4+Math.min(1,lost*1.8)*13)*z;const ox=((seed*7)%5-2)*z;ctx.save();ctx.fillStyle='rgba(92,8,10,.75)';ctx.beginPath();ctx.ellipse(x+ox,y+2*z,r,r*.45,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(150,18,18,.55)';ctx.beginPath();ctx.ellipse(x+ox-r*.25,y+1.5*z,r*.45,r*.18,0,0,7);ctx.fill();ctx.restore();}
  drawUnitFallback(u,q,size,z,down=false){const c=this.ctx,team=u.f==='beee'?'#a84e39':'#55734a',fur=u.f==='beee'?'#c28b58':'#e8d4b4';c.save();c.translate(q.x,q.y);c.globalAlpha=down?.78:1;
    c.fillStyle='rgba(20,24,19,.24)';c.beginPath();c.ellipse(0,0,10*z,4*z,0,0,Math.PI*2);c.fill();c.fillStyle=team;c.beginPath();c.ellipse(0,-13*z,7*z,10*z,0,0,Math.PI*2);c.fill();c.strokeStyle='#392e24';c.lineWidth=1.3*z;c.stroke();
    c.fillStyle=fur;c.beginPath();c.arc(0,-25*z,7*z,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=team;c.beginPath();c.ellipse(-5*z,-30*z,3*z,4*z,-.5,0,Math.PI*2);c.ellipse(5*z,-30*z,3*z,4*z,.5,0,Math.PI*2);c.fill();
    c.fillStyle='#332820';c.beginPath();c.arc(-2.5*z,-26*z,.8*z,0,Math.PI*2);c.arc(2.5*z,-26*z,.8*z,0,Math.PI*2);c.fill();c.strokeStyle='#6e5133';c.lineWidth=2.5*z;c.beginPath();c.moveTo(-3*z,-19*z);c.lineTo(3*z,-8*z);c.moveTo(3*z,-19*z);c.lineTo(-3*z,-8*z);c.stroke();c.restore();}
  // Dessine un personnage dans une posture, avec son sang : on compose d'abord le cadre à part (le sang ne tache que le personnage),
  // puis on le pose — accroupi, on le tasse ; couché ou à terre, on le couche sur le sol.
  body(sh,frame,q,size,pose,wounds,dir,seed,dim=0,arm=null,uniform=null){const ctx=this.ctx;const blood=wounds&&wounds.length;
    const place=draw=>{ctx.save();ctx.translate(q.x,q.y);if(pose==='crouch')ctx.scale(1,.74);else if(pose==='prone'||pose==='down'||pose==='dead'){const sgn=seed%2?1:-1;ctx.scale(1,.55);ctx.rotate(sgn*(pose==='prone'?1.5:1.35));ctx.translate(0,size*.5);}draw();ctx.restore();};
    // rien par-dessus (ni sang, ni protection, ni uniforme) : le cadre directement, dans la pose (accroupi, couché, à terre)
    if(!blood&&!dim&&!arm&&!uniform){if(pose==='up')drawFrame(ctx,sh,frame,q.x,q.y,size);else place(()=>drawFrame(ctx,sh,frame,0,0,size));return;}
    // par-dessus : l'image composée (le cadre, les blessures, la protection, l'uniforme) est gardée tant que rien ne change —
    // la recomposer à chaque image coûtait deux dixièmes de milliseconde par soldat, la moitié d'une image en pleine bataille
    const fr=((frame%sh.frames)+sh.frames)%sh.frames,S=Math.max(4,Math.round(size));const key=`${sh.im?.src||sh.cut?.ref||''}|${sh.row||0}|${sh.frameCols?.[fr]??fr}|${sh.flip?1:0}|${S}|${seed}|${blood?wounds.length+':'+(wounds[wounds.length-1].sev||0):0}|${dim}|${arm?arm.mass.toFixed(4):''}|${uniform||''}|${dir}`;
    const C=this.bodyCache??=new Map();let hit=C.get(key);if(hit){C.delete(key);C.set(key,hit);place(()=>ctx.drawImage(hit.cv,-hit.fx,-hit.fy));return;}
    size=S;
    const ow=Math.ceil(size*1.7),oh=Math.ceil(size*1.3);const oc=document.createElement('canvas');oc.width=ow;oc.height=oh;
    const o=oc.getContext('2d');o.setTransform(1,0,0,1,0,0);o.globalCompositeOperation='source-over';o.clearRect(0,0,ow+2,oh+2);const fx=ow/2,fy=oh-2;drawFrame(o,sh,frame,fx,fy,size);
    if(blood){o.globalCompositeOperation='source-atop';const front=dir==='se'||dir==='sw'||!dir,facing=dir==='se'||dir==='ne'||!dir?1:-1;const k=size/BODY_H;
      for(const w of wounds){for(const [p,out] of [[w.entry,0],[w.exit,1]]){if(!p)continue;const x=fx+(front?-1:1)*p[0]*k*.85+facing*p[2]*k*.6,y=fy-p[1]*k;const r=Math.max(1.3,size*(.03+.012*(w.sev||2))*(out?1.5:1));
        o.fillStyle='rgba(112,6,8,.92)';o.beginPath();o.arc(x,y,r,0,7);o.fill();o.fillStyle='rgba(100,5,7,.8)';o.fillRect(x-r*.3,y,r*.6,r*(1.4+(w.sev||2)*.7));o.fillStyle='rgba(185,28,28,.85)';o.beginPath();o.arc(x-r*.3,y-r*.3,r*.38,0,7);o.fill();}}}
    if(uniform){o.globalCompositeOperation='source-atop';const k=size/BODY_H;o.fillStyle=uniform;o.fillRect(fx-.07*k,fy-.2*k,.14*k,.135*k);o.fillRect(fx-.05*k,fy-.07*k,.1*k,.035*k);}
    if(arm){o.globalCompositeOperation='source-atop';const k=size/BODY_H;const col=Object.fromEntries(Object.entries(MATS).map(([m,M])=>[m,M.col+(M.soft?'8c':'b8')]));
      if(arm.zones.casque.t>0){o.fillStyle=col[arm.zones.casque.mat];o.beginPath();o.ellipse(fx,fy-.262*k,.04*k,.024*k,0,Math.PI,0);o.fill();o.fillRect(fx-.04*k,fy-.264*k,.08*k,.006*k);}
      if(arm.zones.plastron.t>0||arm.zones.dos.t>0){const z=arm.zones.plastron.t>0?arm.zones.plastron:arm.zones.dos;o.fillStyle=col[z.mat];o.beginPath();o.ellipse(fx,fy-.135*k,.047*k,.058*k,0,0,7);o.fill();o.strokeStyle='rgba(0,0,0,.28)';o.lineWidth=Math.max(.6,.004*k);o.beginPath();o.moveTo(fx-.03*k,fy-.19*k);o.lineTo(fx-.02*k,fy-.08*k);o.moveTo(fx+.03*k,fy-.19*k);o.lineTo(fx+.02*k,fy-.08*k);o.stroke();}}
    if(dim){o.globalCompositeOperation='source-atop';o.fillStyle=`rgba(38,30,28,${dim})`;o.fillRect(0,0,ow,oh);}
    o.globalCompositeOperation='source-over';C.set(key,{cv:oc,fx,fy});if(C.size>360)C.delete(C.keys().next().value);place(()=>ctx.drawImage(oc,-fx,-fy));}
  // L'arme du soldat, d'après sa conception : crosse, boîte de culasse, canon, chargeur, lunette, bouche ; à l'échelle du
  // Meumeu (30 cm). En visée, à l'épaule, pointée vers où il regarde ; en marche, en bandoulière ; une pièce sur trépied est
  // posée au sol devant son tireur quand il ne bouge pas, et portée sur le dos quand il marche.
  gunPose(u,q,size,D,pose){const p=D.p,k=size/BODY_H,COL=D.COL,crew=D.have==='trepied',ms=new Set(D.mods||[]);
    const stock=crew?COL*1.1+14:Math.max(55,60+COL*1.6),act=COL*2.4+8,dev=ms.has('manchon')?p.d*14*Math.pow((p.supVol??250)/250,.55):ms.has('frein')?p.d*3.2:ms.has('cacheflamme')?p.d*4:0,bm=this.gunBitmap(u.w,D);
    const L=(bm?.Lw||D.lengthMm||stock+act+p.L+dev)/1000*k,fx=u.fx??1,fy=u.fy??0,sx=fx-fy,sy=(fx+fy)*.5,n=Math.hypot(sx,sy)||1,ux=sx/n,uy=sy/n,moving=u.anim==='walk',aiming=u.anim==='aim'||u.anim==='action'||u.cool>0&&!moving,low=pose==='prone'?.03:pose==='crouch'?.13:.17;
    let ang=Math.atan2(sy,sx),x0,y0;if(crew&&!moving){x0=q.x-ux*.02*k;y0=q.y-.10*k-uy*.02*k;}else if(crew||!aiming){x0=q.x-ux*.025*k;y0=q.y-.09*k;ang+=Math.cos(ang)>=0?-.10:.10;}else{x0=q.x-ux*.055*k;y0=q.y-low*k-uy*.012*k;}
    return {x0,y0,ang,L};
  }
  drawGun(u,q,size,D,pose){const ctx=this.ctx,p=D.p;const k=size/BODY_H;
    const Dc=p.d*(D.pistol?1.25:1.45),COL=D.COL,crew=D.have==='trepied',ms=new Set(D.mods||[]);const stock=crew?COL*1.1+14:Math.max(55,60+COL*1.6),act=COL*2.4+8,dev=ms.has('manchon')?p.d*14*Math.pow((p.supVol??250)/250,.55):ms.has('frein')?p.d*3.2:ms.has('cacheflamme')?p.d*4:0;
    // L'échelle : le sprite fait BODY_H (30 cm) de haut, donc k px par mètre. Une arme d'épaule tient dans 35–40 cm, un
    // pistolet dans 12 cm, une pièce sur trépied dans 60 cm : au-delà, la conception est ramenée à cette longueur hors tout
    // à l'écran (proportions d'une arme tenue par un Meumeu, pas d'une perche).
    // Ne pas écraser la géométrie paramétrique avec un plafond arbitraire de 36 cm :
    // le profil conçu doit rester lisible à côté du Meumeu, y compris le tube long.
    const Lm=(stock+act+p.L+dev)/1000*(D.pistol?.82:crew?.9:1.12);const L=Lm*k;const th=Math.max(1.6,(Dc*3.2+6)/1000*k);const moving=u.anim==='walk';const aiming=u.anim==='aim'||u.anim==='action'||(u.cool>0&&!moving);
    let x0,y0,ang;const low=pose==='prone'?.03:pose==='crouch'?.13:.17;
    // Projection isométrique de la direction réellement visée : sx=fx-fy, sy=fx+fy.
    const fx=u.fx??(u.dir==='ne'||u.dir==='se'?1:-1),fy=u.fy??(u.dir==='se'||u.dir==='sw'?1:-1);const sx=fx-fy,sy=(fx+fy)*.5,n=Math.hypot(sx,sy)||1,ux=sx/n,uy=sy/n;ang=Math.atan2(sy,sx);
    if(crew&&!moving){x0=q.x-ux*.02*k;y0=q.y-.10*k-uy*.02*k;}
    // à la bretelle : crosse à la hanche, bouche vers le haut du côté où il regarde (jamais pointée dans les pieds)
    else if(crew||!aiming){x0=q.x-ux*.025*k;y0=q.y-.09*k;ang+=Math.cos(ang)>=0?-.10:.10;}
    else{x0=q.x-ux*.055*k;y0=q.y-low*k-uy*.012*k;}
    const shared=this.gunPose(u,q,size,D,pose);x0=shared.x0;y0=shared.y0;ang=shared.ang;
    ctx.save();ctx.translate(x0,y0);ctx.rotate(ang);ctx.lineJoin='round';
    const f=v=>v/(stock+act+p.L+dev)*shared.L;const h=th;
    // l'arme dessinée pièce par pièce (bureau d'études), en image une fois par conception ; retournée quand elle pointe à gauche
    const bm=this.gunBitmap(u.w,D);if(bm){if(Math.cos(ang)<0)ctx.scale(1,-1);const sc=shared.L/(bm.Lw*bm.s);ctx.drawImage(bm.cv,-bm.pad*sc,-bm.ay*sc,bm.cv.width*sc,bm.cv.height*sc);
      if(crew&&!moving){ctx.strokeStyle='#2b2f33';ctx.lineWidth=Math.max(1.2,h*.35);const hx=f(stock+act*.6);ctx.beginPath();ctx.moveTo(hx,h*.4);ctx.lineTo(hx+.08*k,.09*k);ctx.moveTo(hx,h*.4);ctx.lineTo(hx-.09*k,.09*k);ctx.stroke();}
      if(ms.has('bipied')&&!moving&&aiming){ctx.strokeStyle='#2b2f33';ctx.lineWidth=1;const bx=f(stock+act+p.L*.6);ctx.beginPath();ctx.moveTo(bx,0);ctx.lineTo(bx-2,h*3);ctx.moveTo(bx,0);ctx.lineTo(bx+2,h*3);ctx.stroke();}
      ctx.restore();return;}
    // le trépied (en batterie)
    if(crew&&!moving){ctx.strokeStyle='#2b2f33';ctx.lineWidth=Math.max(1.2,h*.35);const hx=f(stock+act*.6);ctx.beginPath();ctx.moveTo(hx,h*.4);ctx.lineTo(hx+.08*k,.09*k);ctx.moveTo(hx,h*.4);ctx.lineTo(hx-.09*k,.09*k);ctx.stroke();}
    // la crosse (ou les poignées d'une pièce), la culasse, le canon, la bouche
    if(!crew){ctx.fillStyle='#8a5a2e';ctx.beginPath();ctx.moveTo(0,-h*.45);ctx.lineTo(f(stock),-h*.4);ctx.lineTo(f(stock),h*.45);ctx.lineTo(f(stock*.45),h*.6);ctx.lineTo(0,h*1.1);ctx.closePath();ctx.fill();}
    else{ctx.fillStyle='#3a3f44';ctx.fillRect(0,-h*.35,f(stock),h*.7);}
    ctx.fillStyle='#3d434a';ctx.fillRect(f(stock),-h*.5,f(act),h);ctx.fillStyle='#8a929a';ctx.fillRect(f(stock),-h*.5,f(act),Math.max(.6,h*.18));
    const bw=Math.max(1.1,h*.42);const multi=D.p.action==='rotatif';ctx.fillStyle='#2a2e33';if(multi)for(const o of [-.6,0,.6])ctx.fillRect(f(stock+act),o*bw-bw/2,f(p.L),bw);else ctx.fillRect(f(stock+act),-bw/2,f(p.L),bw);
    if(!crew&&!multi){ctx.fillStyle='#7a4e28';ctx.fillRect(f(stock+act),-h*.38,f(p.L*.4),h*.76);}
    if(dev){ctx.fillStyle=ms.has('manchon')?'#4a5058':'#23272b';const dh=ms.has('manchon')?bw*2:bw*1.4;ctx.fillRect(f(stock+act+p.L),-dh/2,f(dev),dh);}
    // le chargeur : boîte, tambour, ou bande
    if(p.mag>1){ctx.fillStyle='#2f3439';if(D.p.mag>=50&&(D.p.action==='auto'||multi)){ctx.fillStyle='#b8912f';ctx.fillRect(f(stock+act*.3),h*.5,Math.max(1,h*.3),h*1.8);}else if(p.mag>30){ctx.beginPath();ctx.arc(f(stock+act*.5),h*1.1,h*.9,0,7);ctx.fill();}else ctx.fillRect(f(stock+act*.5),h*.5,f(COL*1.1)+1,Math.min(h*3,h*.6+p.mag*.12*h));}
    if(ms.has('lunette')){ctx.fillStyle='#1e2226';ctx.fillRect(f(stock+act*.1),-h*1.25,f(COL*3),h*.55);}
    if(ms.has('bipied')&&!moving&&aiming){ctx.strokeStyle='#2b2f33';ctx.lineWidth=1;const bx=f(stock+act+p.L*.6);ctx.beginPath();ctx.moveTo(bx,0);ctx.lineTo(bx-2,h*3);ctx.moveTo(bx,0);ctx.lineTo(bx+2,h*3);ctx.stroke();}
    if(ms.has('bouclier')&&crew&&!moving){ctx.fillStyle='rgba(90,98,106,.95)';ctx.fillRect(f(stock+act+Math.min(p.L*.2,40)),-.12*k,Math.max(2,h*.5),(D.shield?.h||.2)*k);}
    ctx.restore();}
  // Le brouillard de guerre (touche N) : la vue de nos soldats (plus loin pour un éclaireur, courte la nuit) et de nos bâtiments ;
  // ce qu'on a déjà vu reste gris ; le reste est noir. Les Bèè n'y apparaissent que repérés.
  updateFog(){const now=performance.now();if(this.fogT&&now-this.fogT<250)return;this.fogT=now;const W=this.world,N=W.N,s=W.s;
    const vis=this.fogVis&&this.fogVis.length===N*N?this.fogVis.fill(0):(this.fogVis=new Uint8Array(N*N));if(!(s.explored instanceof Uint8Array)||s.explored.length!==N*N)s.explored=new Uint8Array(N*N);const ex=this.explored=s.explored;
    const circ=(x,y,r)=>{const r2=r*r;const i0=Math.max(0,Math.floor(x-r)),i1=Math.min(N-1,Math.ceil(x+r)),j0=Math.max(0,Math.floor(y-r)),j1=Math.min(N-1,Math.ceil(y+r));for(let j=j0;j<=j1;j++){const dy=j+.5-y;for(let i=i0;i<=i1;i++){const dx=i+.5-x;if(dx*dx+dy*dy<=r2){vis[j*N+i]=1;ex[j*N+i]=1;}}}};
    // un cône : ce que la lunette ou l'infrarouge montre, dans la direction où le soldat regarde
    const wedge=(x,y,r,fx,fy,cosMin)=>{const r2=r*r;const i0=Math.max(0,Math.floor(x-r)),i1=Math.min(N-1,Math.ceil(x+r)),j0=Math.max(0,Math.floor(y-r)),j1=Math.min(N-1,Math.ceil(y+r));for(let j=j0;j<=j1;j++){const dy=j+.5-y;for(let i=i0;i<=i1;i++){const dx=i+.5-x;const d2_=dx*dx+dy*dy;if(d2_<=r2&&(d2_<4||(dx*fx+dy*fy)/Math.sqrt(d2_)>=cosMin)){vis[j*N+i]=1;ex[j*N+i]=1;}}}};
    W.visibilityMask('meumeu',vis,ex);
    if(!this.fogCv){this.fogCv=document.createElement('canvas');}const cv=this.fogCv;if(cv.width!==N){cv.width=N;cv.height=N;this.fogImg=null;}
    const x=cv.getContext('2d');const im=this.fogImg||(this.fogImg=x.createImageData(N,N));const d=im.data;for(let k=0;k<N*N;k++){const a=vis[k]?0:ex[k]?125:232;d[k*4]=6;d[k*4+1]=12;d[k*4+2]=18;d[k*4+3]=a;}x.putImageData(im,0,0);}
  // l'étiquette d'un renseignement : depuis quand
  intelTag(x,y,t0,extra){const ctx=this.ctx,W=this.world,dpr=this.dpr;const q=this.toScreen(x,y,2.2);const age=W.s.t-t0;const txt=`vu il y a ${age<1?'moins d’1 h':age<48?Math.round(age)+' h':Math.round(age/24)+' j'}${extra?' · '+extra:''}`;
    ctx.save();ctx.font=`600 ${9.5*dpr}px system-ui`;ctx.textAlign='center';const w=ctx.measureText(txt).width+8*dpr;ctx.fillStyle='rgba(10,16,22,.75)';ctx.fillRect(q.x-w/2,q.y-11*dpr,w,14*dpr);ctx.fillStyle='#cfd6da';ctx.fillText(txt,q.x,q.y);ctx.restore();}
  // Ce qu'on sait sans le voir, sobrement. Les bâtiments bèè déjà vus restent en gris, sans étiquette (la date au survol, et
  // une seule par ville, sur son centre). Les groupes aperçus s'effacent en 6 h. Les BRUITS ne sont plus des cercles datés posés
  // sur la carte : chacun devient une direction entendue par le Meumeu le plus proche — un arc autour de lui, large quand le
  // bruit est lointain, fin quand on s'approche — et une flèche au bord de l'écran quand la source est hors champ.
  drawIntel(){const ctx=this.ctx,W=this.world,z=this.z(),dpr=this.dpr,t=W.s.t,N=W.N,s=W.s;const hc=this.hover?.cell;
    for(const {b,I,w,h} of (this.ghosts||[]).sort((p,q)=>(p.b.i+p.b.j)-(q.b.i+q.b.j))){ctx.save();ctx.globalAlpha=.45;ctx.filter='grayscale(.9) brightness(.9)';this.drawBuilding(I.snapshot||{...b,done:I.done,ruin:I.ruin,fire:0,working:false,progress:I.progress});ctx.restore();
      const over=hc&&hc[0]>=b.i-1&&hc[0]<=b.i+w&&hc[1]>=b.j-1&&hc[1]<=b.j+h;if(over||b.k==='centre')this.intelTag(b.i+w/2,b.j+h/2,I.t,(b.k==='centre'&&b.city?b.city+' · ':'')+(I.ruin?'ruine':''));}this.ghosts=[];
    // les groupes aperçus : un par endroit (le plus récent), texte seulement tant qu'il est frais ou survolé
    const shown=[];for(const g of [...(s.sightings||[])].sort((a,b)=>b.t-a.t)){const age=t-g.t;if(age>6||age<.3&&this.fogVis?.[Math.floor(g.y)*N+Math.floor(g.x)])continue;if(shown.some(o=>Math.hypot(o.x-g.x,o.y-g.y)<5))continue;shown.push(g);
      const q=this.toScreen(g.x,g.y,.2);ctx.save();ctx.globalAlpha=Math.max(.15,1-age/6)*.85;
      ctx.strokeStyle='#ff6a4d';ctx.setLineDash([5*dpr,4*dpr]);ctx.lineWidth=1.6*dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,(10+Math.sqrt(g.n)*3)*z,(5+Math.sqrt(g.n)*1.5)*z,0,0,7);ctx.stroke();ctx.setLineDash([]);
      if(g.dx||g.dy){const e=this.toScreen(g.x+(g.dx||0)*3,g.y+(g.dy||0)*3,.2);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(e.x,e.y);ctx.stroke();}
      const over=hc&&Math.hypot(hc[0]-g.x,hc[1]-g.y)<3;if(age<1.5||over){ctx.fillStyle='#ffd0c4';ctx.font=`700 ${9.5*dpr}px system-ui`;ctx.textAlign='center';ctx.fillText(`~${g.n} Bèè${age<1?'':' · '+Math.round(age)+' h'}`,q.x,q.y-12*z);}ctx.restore();}
    this.drawHeard();}
  // Le mode éclaireur : les bruits entendus, en direction approximative depuis nos soldats. Chaque contact est un ARC de cercle
  // autour du soldat qui l'a entendu : sa direction est celle du bruit, sa largeur l'incertitude, son épaisseur la puissance perçue
  // (portée de la source — tir et silencieux compris — et proximité), son éclat la fraîcheur. Une étiquette dit quoi, où, combien, quand.
  heardWords(A){const CARD=['nord','nord-est','est','sud-est','sud','sud-ouest','ouest','nord-ouest'];
    const k=Math.round((((A.ang+Math.PI/2)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(Math.PI/4))%8;      // 0 = le haut de l'écran
    const sec=Math.max(0,Math.round(A.age*HOUR_REAL)),when=sec<60?`il y a ${sec} s`:`il y a ${Math.floor(sec/60)} min ${String(sec%60).padStart(2,'0')}`;
    const p=A.pow,force=A.fresh<.35?'incertain':p<.3?'faible':p<.55?'moyen':p<.8?'fort':'très fort';
    const db=(A.kind==='tirs'||A.kind==='explosion')&&A.db?` ${Math.round(A.db)} dB`:'';
    // une équipe en marche s'annonce comme telle : combien (à peu près) et à quelle distance (proche / moyenne / lointaine)
    const team=A.kind==='pas'&&(A.team||1)>=3,size=A.team>=12?'FORMATION ≈'+A.team:A.team>=6?'ÉQUIPE ≈'+A.team:'PETITE ÉQUIPE ≈'+A.team,prox=(A.near??.5)>.66?'proche':(A.near??.5)>.33?'à moyenne distance':'lointaine';
    if(team)return `${size} — ${CARD[k]} — ${prox} — ${when}`;
    return `${A.lbl.toUpperCase()}${db} — ${CARD[k]} — ${force} — ${when}`;}
  // Brouillard levé : ce que les Bèè savent. Chaque alerte est un CÔNE (direction entendue, jamais une position) ; les chercheurs
  // en fouille montrent le prochain point de leur balayage.
  drawDevCones(){const W=this.world,B=W.s.beee,ctx=this.ctx,z=this.z(),dpr=this.dpr,t=W.s.t;
    for(const a of B.alerts||[]){const age=t-a.t;if(age>3||age<0)continue;const fade=1-age/3;
      if(a.cone){const pts=[[a.ox,a.oy]];for(let k=0;k<=14;k++){const an=a.bearing-a.half+2*a.half*k/14;pts.push([a.ox+Math.cos(an)*a.reach,a.oy+Math.sin(an)*a.reach]);}
        ctx.save();ctx.beginPath();pts.forEach(([x,y],i)=>{const q=this.toScreen(x,y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();
        ctx.fillStyle=`rgba(255,90,70,${.10*fade+.03})`;ctx.fill();ctx.strokeStyle=`rgba(255,120,100,${.55*fade+.15})`;ctx.lineWidth=1.4*dpr;ctx.stroke();
        const q=this.toScreen(a.ox,a.oy);ctx.font=`700 ${10*dpr}px system-ui`;ctx.fillStyle='rgba(255,170,150,.95)';ctx.strokeStyle='rgba(8,14,18,.9)';ctx.lineWidth=3*dpr;const txt=`alerte « ${a.why} » (cône, ${Math.round(a.reach)} c)${a.done?' · fouille lancée':''}`;ctx.strokeText(txt,q.x+8*dpr,q.y-8*dpr);ctx.fillText(txt,q.x+8*dpr,q.y-8*dpr);ctx.restore();}
      else{const q=this.toScreen(a.x,a.y);ctx.save();ctx.strokeStyle=`rgba(255,200,90,${.8*fade+.1})`;ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(q.x,q.y,10*z+a.r*z*8,0,6.283);ctx.stroke();ctx.font=`700 ${10*dpr}px system-ui`;ctx.fillStyle='rgba(255,215,140,.95)';ctx.strokeStyle='rgba(8,14,18,.9)';ctx.lineWidth=3*dpr;ctx.strokeText(`vue directe « ${a.why} »`,q.x+12*dpr,q.y);ctx.fillText(`vue directe « ${a.why} »`,q.x+12*dpr,q.y);ctx.restore();}}
    for(const u of W.s.units){if(u.f!=='beee'||!(u.hp>0)||u.task?.kind!=='search'||u.task.scout||!u.task.pts)continue;
      const p=u.task.pts[u.task.i||0];if(!p)continue;const q0=this.toScreen(u.x,u.y),q1=this.toScreen(p[0],p[1]);
      ctx.save();ctx.strokeStyle='rgba(255,150,120,.55)';ctx.setLineDash([4*dpr,4*dpr]);ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(q0.x,q0.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();ctx.fillStyle='rgba(255,150,120,.9)';ctx.fillRect(q1.x-2*dpr,q1.y-2*dpr,4*dpr,4*dpr);ctx.restore();}}
  // Le tube infrarouge : dans son faisceau, une image monochrome vert-jaune et granuleuse ; hors du faisceau, la nuit reste la nuit.
  drawNir(){const W=this.world;if(W.light()>=.4)return;const ctx=this.ctx,dpr=this.dpr;
    for(const id of this.sel){const u=W.unit(id);if(!u||u.f!=='meumeu'||!u.nvOn||!((u.irLeft??0)>0))continue;
      const Wd=u.w?W.W(u.w):null,ir=Wd?.ir;const range=ir?ir.range*(1+.2*Math.log2(Wd.optic?.mag||1)):(u.bino||0);if(!range)continue;
      const beam=(ir?.beam||43)*Math.PI/180,a0=Math.atan2(u.fy??0,u.fx??1),pts=[[u.x,u.y]];
      for(let k=0;k<=18;k++){const a=a0-beam/2+beam*k/18;pts.push([u.x+Math.cos(a)*range,u.y+Math.sin(a)*range]);}
      ctx.save();ctx.beginPath();pts.forEach(([x,y],i)=>{const q=this.toScreen(x,y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();
      ctx.fillStyle='rgba(175,255,110,.11)';ctx.fill();ctx.clip();
      ctx.fillStyle='rgba(215,255,150,.55)';for(let g=0;g<110;g++){const r=Math.random()*range,a=a0+(Math.random()-.5)*beam,q=this.toScreen(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r);ctx.fillRect(q.x,q.y,1.6*dpr,1.6*dpr);}
      ctx.restore();}}
  // La couronne d'équipe : un anneau-compas autour du centre des soldats sélectionnés (haut de l'écran = nord). Chaque bruit est une marque sur
  // l'anneau : sa POSITION est la direction entendue, la LARGEUR de l'arc le flou (fin = on sait, large = on ne sait pas), l'ÉPAISSEUR et
  // l'opacité la force entendue, un pictogramme dit quoi et des points combien de soldats l'ont entendu. Un trait qui pulse est neuf (moins
  // de 2 s), qui pâlit vieillit ; à sa disparition « contact perdu » reste 4 s. Six marques au plus, classées par force × danger : un tir
  // passe avant des pas proches, puis un chantier, une usine ; un train très loin n'a de place que s'il est fort. Jamais de point sur la
  // carte, jamais de croisement de cônes : l'oreille la plus nette donne la direction. L'anneau est du commandement, pas de la vision.
  drawCrown(arcs,ears,KIND){const ctx=this.ctx,dpr=this.dpr,cw=this.canvas.width,ch=this.canvas.height,now=performance.now();
    const GLYPH={tirs:'🔫',explosion:'💥',train:'🚂',usine:'🏭',chantier:'🔨',abattage:'🪓',mine:'⛏',ville:'🏘',pas:'👣'};
    const DANGER={tirs:1,explosion:1,pas:.8,abattage:.5,chantier:.5,mine:.45,usine:.4,ville:.3,train:.3};
    let sx=0,sy=0;for(const u of ears){const q=this.toScreen(u.x,u.y);sx+=q.x;sy+=q.y;}sx/=ears.length;sy/=ears.length;
    const R=Math.min(112,64+ears.length*2)*dpr,m=R+40*dpr;const cx=Math.max(m,Math.min(cw-m,sx)),cy=Math.max(m,Math.min(ch-m,sy-16*dpr));
    // l'anneau nu et ses quatre repères (le nord en haut)
    ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(8,14,18,.55)';ctx.lineWidth=4.5*dpr;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.stroke();
    ctx.strokeStyle='rgba(225,236,242,.30)';ctx.lineWidth=1.6*dpr;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.stroke();
    ctx.lineWidth=1.4*dpr;for(let k=0;k<4;k++){const a=-Math.PI/2+k*Math.PI/2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(R-5*dpr),cy+Math.sin(a)*(R-5*dpr));ctx.lineTo(cx+Math.cos(a)*(R+5*dpr),cy+Math.sin(a)*(R+5*dpr));ctx.stroke();}
    ctx.font=`800 ${10*dpr}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(225,236,242,.55)';ctx.fillText('N',cx,cy-R-11*dpr);ctx.restore();
    const list=[...arcs.values()].map(A=>({A,sc:A.pow*(.4+.6*A.fresh)*(DANGER[A.kind]??.5)})).sort((a,b)=>b.sc-a.sc).slice(0,6);
    let first=true;
    for(const {A} of list){const [col]=KIND[A.kind]||['#ffe08a'];const half=Math.max(.07,Math.min(1.1,A.half)),sec=A.age*HOUR_REAL,newer=sec<2;
      const w=(3+8*A.pow)*dpr*(newer?1+.3*Math.sin(now/85):1),al=.35+.65*A.fresh;
      ctx.save();ctx.lineCap='round';
      ctx.globalAlpha=al*.6;ctx.strokeStyle='rgba(8,14,18,.95)';ctx.lineWidth=w+3.5*dpr;ctx.beginPath();ctx.arc(cx,cy,R,A.ang-half,A.ang+half);ctx.stroke();
      ctx.globalAlpha=al;ctx.strokeStyle=col;ctx.lineWidth=w;if(newer){ctx.shadowColor=col;ctx.shadowBlur=10*dpr;}ctx.beginPath();ctx.arc(cx,cy,R,A.ang-half,A.ang+half);ctx.stroke();ctx.shadowBlur=0;
      // le pictogramme, dehors, dans la direction
      const gx=cx+Math.cos(A.ang)*(R+19*dpr),gy=cy+Math.sin(A.ang)*(R+19*dpr);ctx.globalAlpha=Math.max(.5,al);ctx.font=`${13*dpr}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(8,14,18,.75)';ctx.beginPath();ctx.arc(gx,gy,10*dpr,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(GLYPH[A.kind]||'•',gx,gy+.5*dpr);
      // les points : qui a entendu (cinq au plus), en dedans de l'anneau
      const nWho=Math.min(5,A.who?.size||1);for(let q=0;q<nWho;q++){const da=(q-(nWho-1)/2)*.11,px=cx+Math.cos(A.ang+da)*(R-11*dpr),py=cy+Math.sin(A.ang+da)*(R-11*dpr);ctx.fillStyle=col;ctx.globalAlpha=al;ctx.beginPath();ctx.arc(px,py,2.4*dpr,0,7);ctx.fill();}
      if(first&&this.zoom>.3){first=false;ctx.globalAlpha=Math.max(.6,al);ctx.font=`800 ${10.5*dpr}px system-ui`;ctx.textAlign='center';ctx.fillStyle=col;ctx.strokeStyle='rgba(8,14,18,.92)';ctx.lineWidth=3*dpr;
        const txt=this.heardWords(A),tw=ctx.measureText(txt).width,tx=Math.max(6*dpr+tw/2,Math.min(cw-6*dpr-tw/2,gx+Math.cos(A.ang)*(16*dpr+tw/2))),ty=Math.max(12*dpr,Math.min(ch-12*dpr,gy+Math.sin(A.ang)*20*dpr));ctx.strokeText(txt,tx,ty);ctx.fillText(txt,tx,ty);}
      ctx.restore();}
    // les contacts éteints : « contact perdu » 4 s, à leur place sur l'anneau
    for(const L of (this._heardLost||[]).slice(-2)){const A=L.A,[col]=KIND[A.kind]||['#ffe08a'];const ang0=A.ang;
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(.85,(L.until-now)/1500));ctx.font=`700 ${10*dpr}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';const txt=`${A.lbl.toUpperCase()} — contact perdu`,tw=ctx.measureText(txt).width;const tx=Math.max(6*dpr+tw/2,Math.min(cw-6*dpr-tw/2,cx+Math.cos(ang0)*(R+34*dpr+tw/2))),ty=Math.max(12*dpr,Math.min(ch-12*dpr,cy+Math.sin(ang0)*(R+50*dpr)));ctx.fillStyle=col;ctx.strokeStyle='rgba(8,14,18,.9)';ctx.lineWidth=3*dpr;
      ctx.strokeText(txt,tx,ty);ctx.fillText(txt,tx,ty);ctx.restore();}}
  drawHeard(){const ctx=this.ctx,W=this.world,z=this.z(),dpr=this.dpr,t=W.s.t,s=W.s;const cw=this.canvas.width,ch=this.canvas.height;
    if(this.world.s.fog===false)this.drawDevCones();
    this.drawNir();
    const KIND={explosion:['#ffb347','explosion'],tirs:['#ff8a6a','tirs'],train:['#9fd3ff','train'],usine:['#ffbd7a','usine'],chantier:['#e8d48a','chantier'],abattage:['#b9d98a','abattage'],mine:['#d0b8ff','mine'],ville:['#f2c2e0','ville'],pas:['#e9eef2','pas']};
    // La localisation acoustique est celle des unités commandées, pas un radar
    // global omniscient. Les auditeurs sélectionnés déterminent les relèvements.
    const selected=new Set(this.sel);const ears=s.units.filter(u=>selected.has(u.id)&&u.f==='meumeu'&&u.hp>0&&u.h?.state!=='hors');if(!ears.length){this._heardKeys=null;return;}
    const arcs=new Map(),edges=new Map(),margin=18*dpr;
    for(const h of s.heard||[]){const age=t-h.t,ttl=h.ttl??1.25;if(age>ttl||age<0)continue;let e=null;
      if(h.oid!=null)e=ears.find(u=>u.id===h.oid)||null;
      if(!e)continue;
      const ox=h.ox??e.x,oy=h.oy??e.y,bearing=h.angle??0,dist=h.d??Math.hypot(h.x-ox,h.y-oy);if(dist>200)continue;
      // Le relèvement appartient au témoin qui a entendu le bruit, pas à une position ennemie révélée.
      const ang=this.screenAng(ox,oy,ox+Math.cos(bearing),oy+Math.sin(bearing)),half=Math.max(.07,Math.min(1.25,h.uncertainty??.4));const fresh=Math.max(0,1-age/ttl);
      // puissance perçue : proximité dans la portée du bruit, et portée de la source (un train pèse plus qu'un pas, un silencieux moins qu'un tir nu)
      const pow=Math.max(.08,Math.min(1,.55*(h.intensity??.5)+.45*Math.min(1,(h.range??20)/60)));
      // Un même bruit entendu par plusieurs soldats du groupe ne doit faire qu'un marqueur.
      const key=h.kind+'|'+Math.round(ang/.75);const o=arcs.get(key);const qq=this.toScreen(ox+Math.cos(bearing)*dist,oy+Math.sin(bearing)*dist),off=qq.x<margin||qq.y<margin||qq.x>cw-margin||qq.y>ch-margin;
      const who=o?.who||new Set();who.add(h.oid);if(!o||fresh>o.fresh||half<o.half)arcs.set(key,{e,ox,oy,ang,half,fresh,kind:h.kind,n:h.n||1,d:dist,age,pow,db:h.db,off,who,team:Math.max(h.team||1,o?.team||1),near:h.intensity,lbl:(KIND[h.kind]||['',h.kind])[1]});else{o.who=who;o.team=Math.max(o.team||1,h.team||1);}
      // La flèche de bord utilise le relèvement estimé, jamais la vraie source cachée.
      const q=this.toScreen(ox+Math.cos(bearing)*dist,oy+Math.sin(bearing)*dist);if(q.x<margin||q.y<margin||q.x>cw-margin||q.y>ch-margin){const P=this.toScreen(ox,oy),unc=half;
        const a0=this.screenAng(ox,oy,ox+Math.cos(bearing-unc/2),oy+Math.sin(bearing-unc/2)),a1=this.screenAng(ox,oy,ox+Math.cos(bearing+unc/2),oy+Math.sin(bearing+unc/2));
        const k=h.kind+'|'+Math.round(ang/(Math.PI/8));const p=edges.get(k);if(!p||fresh>p.fresh)edges.set(k,{P,a:ang,a0,a1,fresh,kind:h.kind,age,d:dist,n:h.n||1,pow,db:h.db,lbl:(KIND[h.kind]||['',h.kind])[1],ang});}}
    // Les contacts qui viennent de s'éteindre restent signalés un instant : « contact acoustique perdu ».
    const now=performance.now();this._heardKeys??=new Map();this._heardLost??=[];
    for(const [key,rec] of this._heardKeys)if(!arcs.has(key)){this._heardLost.push({...rec,until:now+4000});this._heardKeys.delete(key);}
    for(const [key,A] of arcs)this._heardKeys.set(key,{A});
    this._heardLost=this._heardLost.filter(L=>L.until>now);
    this.drawCrown(arcs,ears,KIND);
    // Au bord de l'écran : depuis le soldat qui écoute, l'éventail des directions possibles (fin comme une flèche quand le bruit
    // est proche, large quand il est lointain), sa couleur dit ce que c'est, son éclat la fraîcheur ; au milieu, une pointe et le nom.
    const m=22*dpr;const hit=(P,a)=>{const c=Math.cos(a),sn=Math.sin(a);let k=1e9;if(c>1e-6)k=Math.min(k,(cw-m-P.x)/c);if(c<-1e-6)k=Math.min(k,(m-P.x)/c);if(sn>1e-6)k=Math.min(k,(ch-m-P.y)/sn);if(sn<-1e-6)k=Math.min(k,(m-P.y)/sn);k=Math.max(0,k);return [P.x+c*k,P.y+sn*k];};
    const placed=[];for(const E of [...edges.values()].sort((a,b)=>b.fresh-a.fresh).slice(0,2)){const [col]=KIND[E.kind]||['#ffe08a'];const P={x:Math.max(m,Math.min(cw-m,E.P.x)),y:Math.max(m,Math.min(ch-m,E.P.y))};
      let a0=E.a0,a1=E.a1;if(a1<a0)[a0,a1]=[a1,a0];if(a1-a0>Math.PI){const t0=a0;a0=a1;a1=t0+Math.PI*2;}const n=Math.max(2,Math.ceil((a1-a0)/.05));const pts=[];for(let q=0;q<=n;q++)pts.push(hit(P,a0+(a1-a0)*q/n));
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
      ctx.globalAlpha=(.25+.55*E.fresh)*.6;ctx.strokeStyle='rgba(8,14,18,.95)';ctx.lineWidth=(2+5*E.pow)*dpr+3*dpr;ctx.beginPath();pts.forEach(([x,y],q)=>q?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      ctx.globalAlpha=.3+.65*E.fresh;ctx.strokeStyle=col;ctx.lineWidth=(2+5*E.pow)*dpr;ctx.beginPath();pts.forEach(([x,y],q)=>q?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      const [x,y]=hit(P,E.a);ctx.translate(x,y);ctx.rotate(E.a);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(7*dpr,0);ctx.lineTo(-5*dpr,-4*dpr);ctx.lineTo(-2*dpr,0);ctx.lineTo(-5*dpr,4*dpr);ctx.closePath();ctx.fill();ctx.restore();
      // l'étiquette : dans l'écran, jamais par-dessus une autre (on la fait glisser le long du bord)
      const c=Math.cos(E.a),sn=Math.sin(E.a);ctx.save();ctx.globalAlpha=.9*E.fresh+.1;ctx.font=`800 ${10.5*dpr}px system-ui`;ctx.textAlign='center';ctx.fillStyle=col;ctx.strokeStyle='rgba(8,14,18,.9)';ctx.lineWidth=3*dpr;
      const txt=this.heardWords(E);const tw=ctx.measureText(txt).width,th=13*dpr;
      let lx=Math.max(m+tw/2+4*dpr,Math.min(cw-m-tw/2-4*dpr,x-c*26*dpr)),ly=Math.max(m+th,Math.min(ch-m-4*dpr,y-sn*26*dpr+4*dpr));const side=Math.abs(c)>Math.abs(sn);
      for(let k=0;k<12&&placed.some(r=>Math.abs(r[0]-lx)<(r[2]+tw)/2+4*dpr&&Math.abs(r[1]-ly)<th+2*dpr);k++){if(side)ly=Math.min(ch-m-4*dpr,ly+th+3*dpr);else lx=Math.min(cw-m-tw/2-4*dpr,lx+tw/2+12*dpr);}
      placed.push([lx,ly,tw]);ctx.strokeText(txt,lx,ly);ctx.fillText(txt,lx,ly);ctx.restore();}}
  // La carte des sols : la fertilité de chaque case, du gris (rien ne pousse) au vert sombre (terre noire), les champs labourés
  // par les obus en brun. Refaite quand la terre change (un bombardement), pas à chaque image.
  drawSoil(){const W=this.world,N=W.N,F=W.s.fert;if(!F)return;const ver=W.fertV||0;
    if(!this.soilCv||this.soilV!==ver){this.soilV=ver;const cv=this.soilCv||(this.soilCv=document.createElement('canvas'));cv.width=N;cv.height=N;const x=cv.getContext('2d');const im=x.createImageData(N,N);const d=im.data;
      for(let k=0;k<N*N;k++){const v=F[k];const t=W.G.terrain[k];const land=TERRAIN[t]?.walk;const q=v/100;d[k*4]=land?Math.round(170-140*q):0;d[k*4+1]=land?Math.round(150-40*q+30*Math.min(1,q*2)):0;d[k*4+2]=land?Math.round(120-100*q):0;d[k*4+3]=land?150:0;}
      x.putImageData(im,0,0);}
    const ctx=this.ctx,z=this.z();const o=this.toScreen(0,0);ctx.save();ctx.setTransform(TW/2*z,TH/2*z,-TW/2*z,TH/2*z,o.x,o.y);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.soilCv,0,0);ctx.restore();}
  // Les empreintes : visibles sur le terrain et périssables. La nuit elles ressortent près des unités,
  // tandis qu'une piste ennemie n'apparaît qu'après découverte par un observateur.
  drawTracks(inView){const W=this.world,ctx=this.ctx,z=this.z(),dpr=this.dpr,t=W.s.t;if(this.zoom<.34)return;const placed=new Set();
    for(const tr of W.s.tracks||[]){const age=t-tr.t;if(age<0||age>tr.life||!inView(tr.x,tr.y,1))continue;
      const own=tr.f==='meumeu',found=tr.foundByMe!=null;if(!own&&!found)continue;
      const bucket=`${tr.f}:${Math.floor(tr.x/1.25)}:${Math.floor(tr.y/1.25)}`;if(placed.has(bucket))continue;placed.add(bucket);
      const q=this.toScreen(tr.x,tr.y,.015),fade=Math.max(0,1-age/tr.life),night=W.light()<.4;
      const scale=Math.max(.55,Math.min(1.35,z)),ang=this.screenAng(tr.x,tr.y,tr.x+Math.cos(tr.heading||0),tr.y+Math.sin(tr.heading||0));
      ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.globalAlpha=(own?(night?.36:.14):.62)*fade;ctx.fillStyle=own?'#f2e1b1':'#ffb28a';ctx.strokeStyle=own?'rgba(34,40,35,.8)':'rgba(35,22,18,.9)';ctx.lineWidth=.7*dpr;
      for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(-sign*2.4*scale,sign*1.4*scale,1.45*scale,.72*scale,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.restore();}}
  // La vigilance (touche C ; d'office la nuit quand on commande une équipe d'infiltration). Pour chaque Bèè qu'on voit près de
  // nos soldats choisis : ce qu'il voit — plein devant, moins sur les côtés, presque rien derrière — en trois limites : un
  // Meumeu debout, accroupi, couché (l'aplat : debout). Vert-gris : calme ; jaune : en ronde, il tourne la tête ; rouge : en alerte.
  // Autour de chacun de nos tireurs : jusqu'où s'entendra son prochain coup (et, pointillé, le claquement d'une balle supersonique).
  // La nuit : ce que voit chacune de nos unités — sa vue nue tout autour (face, flancs, dos), sa lunette et son infrarouge dans l'axe.
  // Même calcul que la perception (World.eyeProfile / visualRange), échantillonné sur 32 directions.
  drawNightVision(){const W=this.world,s=W.s;if(!(W.light()<.4))return;const ctx=this.ctx,[i0,i1,j0,j1]=this.vis;let n=0;
    // toutes les zones sont peintes, opaques, sur un calque à part : leurs recouvrements se fondent en une seule tache, posée ensuite en douceur
    const cv=this.nvCv??=document.createElement('canvas');if(cv.width!==this.canvas.width||cv.height!==this.canvas.height){cv.width=this.canvas.width;cv.height=this.canvas.height;}
    const x=cv.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.filter=`blur(${Math.round(6*this.dpr)}px)`;let any=false;
    for(const u of s.units){if(u.f!=='meumeu'||!(u.hp>0)||u.h?.state==='hors'||u.inVeh||u.inBarracks)continue;if(u.k==='villageois'||u.k==='medecin'||u.k==='infirmier'||!u.w&&!u.serve)continue;if(u.x<i0-8||u.x>i1+8||u.y<j0-8||u.y>j1+8)continue;if(++n>260)break;
      const P=W.eyeProfile(u),fx=u.fx??1,fy=u.fy??0,fl=Math.hypot(fx,fy)||1;const pts=[];let nv=false;
      for(let k=0;k<48;k++){const a=k/48*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a),c=(fx*dx+fy*dy)/fl;
        // (les paliers du calcul — face, flancs, dos — adoucis en une courbe continue pour le dessin)
        const t=Math.max(0,Math.min(1,(c+.6)/1.3)),back=[.22,.38,.62][P.wide];let r=P.base*(back+(1-back)*t*t*(3-2*t));
        if(c>=P.cos)r=Math.max(r,P.optic*Math.min(1,(c-P.cos)/.04+.6));if(c>=P.nvCos&&P.nv>r){r=P.nv*Math.min(1,(c-P.nvCos)/.03+.5);nv=true;}if(u.lamp)r=Math.max(r,5);r=Math.max(1.6,r);
        pts.push(this.toScreen(u.x+dx*r,u.y+dy*r));}
      x.beginPath();for(let k=0;k<pts.length;k++){const p=pts[k],q=pts[(k+1)%pts.length],m=[(p.x+q.x)/2,(p.y+q.y)/2];if(!k)x.moveTo(m[0],m[1]);else x.quadraticCurveTo(p.x,p.y,m[0],m[1]);}
      {const p=pts[0],q=pts[1];x.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}x.closePath();x.fillStyle=nv?'rgb(140,255,170)':'rgb(255,236,180)';x.fill();any=true;}
    x.filter='none';if(!any)return;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=.13;ctx.globalCompositeOperation='screen';ctx.drawImage(cv,0,0);ctx.restore();}
  drawCones(){const W=this.world,s=W.s;const sel=[];for(const id of this.sel){const u=W.unit(id);if(u&&u.f==='meumeu'&&u.hp>0)sel.push(u);}if(!sel.length)return;
    const night=W.light()<.4;if(!(this.cones||night&&sel.some(u=>u.holdFire||u.charges>0||u.scoutRole||u.camoSuit||u.task?.kind==='sabotage')))return;
    const ctx=this.ctx,z=this.z(),dpr=this.dpr,base=W.sight(),alerts=s.beee.alerts||[];const [i0,i1,j0,j1]=this.vis;
    const sigs=[1,.58*(night?.85:1),.32*(night?.7:1)];const CONE=[[1,.55,.22],[1,.72,.38],[1,.88,.62]];const col=['150,190,150','240,205,90','255,95,70'];
    const watched=s.units.filter(o=>{if(o.f!=='beee'||!(o.hp>0)||o.h?.state==='hors'||o.x<i0-20||o.x>i1+20||o.y<j0-20||o.y>j1+20||s.fog!==false&&!W.spotted(o,'meumeu',.5))return false;return sel.some(u=>Math.hypot(u.x-o.x,u.y-o.y)<45);}).sort((a,b)=>Math.min(...sel.map(u=>Math.hypot(u.x-a.x,u.y-a.y)))-Math.min(...sel.map(u=>Math.hypot(u.x-b.x,u.y-b.y)))).slice(0,3);
    for(const o of watched){
      const civ=!o.w;const alert=o.task?.kind==='search'||alerts.some(a=>s.t-a.t<3&&Math.hypot(a.x-o.x,a.y-o.y)<a.r+14);const wide=alert?2:o.task?.kind==='patrol'?1:0;
      const eye=(civ?.45:1)*(o.post==='couche'?.9:1),a0=o.fx!=null?Math.atan2(o.fy,o.fx):0,lamp=o.lamp&&night?5:0,half=alert?Math.PI*.72:wide?Math.PI*.48:Math.PI*.34;
      ctx.save();ctx.beginPath();const center=this.toScreen(o.x,o.y);ctx.moveTo(center.x,center.y);
      for(let k=0;k<=28;k++){const rel=-half+k/28*half*2,ang=a0+rel,R=Math.max(lamp,W.visualRange(o,o.x+Math.cos(ang)*base*eye,o.y+Math.sin(ang)*base*eye));
        const q=this.toScreen(o.x+Math.cos(ang)*R,o.y+Math.sin(ang)*R);ctx.lineTo(q.x,q.y);}ctx.closePath();ctx.fillStyle=`rgba(${col[wide]},${alert?.055:.028})`;ctx.fill();ctx.strokeStyle=`rgba(${col[wide]},${alert?.32:.18})`;ctx.lineWidth=1*dpr;ctx.stroke();ctx.restore();}
    // Prévision sonore compacte : les grands anneaux faisaient prendre une portée maximale pour une détection certaine.
    // La direction réelle n'apparaît que lorsqu'un auditeur reçoit effectivement le bruit.
    const said=new Map();
    for(const u of sel){if(!u.w)continue;if(said.size>=2&&!said.has(u.w))continue;const Wd=W.W(u.w);let dB=Wd.dB;const S=Wd.sup;if(S){let R=S.R;const use=(u.supUse||0)+1;if(S.life)R*=1-(1-S.floor)*Math.min(1,(use-1)/S.life);if(S.wet)R*=use<=S.wet?S.wetK:1;dB=Math.max(Wd.actDb||100,Math.round(Wd.dB0-Math.min(38,R)));}
      const key=u.w+'|'+dB;if(said.get(key)?.some(p=>Math.hypot(p.x-u.x,p.y-u.y)<6))continue;if(!said.has(key))said.set(key,[]);said.get(key).push(u);
      const nightGain=night?1.5:1,r=Math.max(4,(dB-110)/1.6*nightGain),q=this.toScreen(u.x,u.y);ctx.save();
      ctx.fillStyle='rgba(8,14,18,.82)';ctx.strokeStyle='rgba(255,236,160,.62)';ctx.lineWidth=dpr;const txt=`Tir : portée sonore théorique ≈ ${Math.round(r*4)} m${night?' cette nuit':''}`;ctx.font=`700 ${9*dpr}px system-ui`;const tw=ctx.measureText(txt).width+12*dpr;ctx.beginPath();ctx.roundRect(q.x-tw/2,q.y-34*dpr,tw,17*dpr,5*dpr);ctx.fill();ctx.stroke();ctx.fillStyle='#ffedb8';ctx.textAlign='center';ctx.fillText(txt,q.x,q.y-22*dpr);ctx.restore();}
    // Les portées de pas sont annoncées au groupe, sans grands anneaux qui se superposent
    // aux directions acoustiques effectivement reçues. Les empreintes montrent le trajet parcouru.
    const groups=[];for(const u of sel){const g=groups.find(g=>Math.hypot(g.x-u.x,g.y-u.y)<6);const post=u.orderPost||'debout',R=W.stepRange(u,post);if(g){if(R>g.R){g.R=R;g.post=post;}g.n++;}else groups.push({x:u.x,y:u.y,R,post,n:1});}
    for(const g of groups.slice(0,2)){const q=this.toScreen(g.x,g.y),heard=W.near(g.x,g.y,g.R,o=>o.f==='beee'&&o.hp>0&&o.h?.state!=='hors'&&Math.hypot(o.x-g.x,o.y-g.y)<g.R&&(s.fog===false||W.spotted(o,'meumeu',.5)));
      const name={debout:'debout',accroupi:'accroupi',couche:'rampant'}[g.post]||g.post;ctx.save();ctx.fillStyle='rgba(8,14,18,.84)';ctx.strokeStyle=heard?'rgba(255,110,90,.8)':'rgba(205,222,230,.6)';ctx.lineWidth=dpr;
      ctx.font=`700 ${9*dpr}px system-ui`;const txt=`Pas ${name} : audibles jusqu’à ≈ ${Math.round(g.R*4)} m${heard?' · Bèè proche':''}`;const tw=ctx.measureText(txt).width+12*dpr;ctx.beginPath();ctx.roundRect(q.x-tw/2,q.y+13*dpr,tw,17*dpr,5*dpr);ctx.fill();ctx.stroke();ctx.fillStyle=heard?'#ffc1b5':'#e6edf0';ctx.textAlign='center';ctx.fillText(txt,q.x,q.y+25*dpr);ctx.restore();}}
  // Les charges posées : les nôtres toujours, celles des Bèè si on les voit — un point rouge qui clignote plus vite à l'approche
  // de l'explosion, et le temps qui reste.
  drawCharges(){const W=this.world,s=W.s,C=s.charges;if(!C?.length)return;const ctx=this.ctx,dpr=this.dpr,z=this.z(),now=performance.now();
    for(const c of C){if(c.f!=='meumeu'&&!this.fxVisible(c.x,c.y,'beee'))continue;const q=this.toScreen(c.x,c.y,.4);if(q.x<-40||q.y<-40||q.x>this.canvas.width+40||q.y>this.canvas.height+40)continue;
      const rem=Math.max(0,c.t-s.t),m=Math.round(rem*60);const txt=m<1?'feu !':m<60?`${m} min`:`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`;const on=Math.sin(now/(rem<.34?90:rem<1?220:520))>0;
      ctx.save();ctx.fillStyle=on?'#ff3b2f':'#7a1a14';ctx.strokeStyle='rgba(10,8,6,.9)';ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(3,4*z),0,7);ctx.fill();ctx.stroke();
      ctx.font=`800 ${10*dpr}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3*dpr;ctx.strokeText(`charge · ${txt}`,q.x,q.y-9*dpr);ctx.fillStyle=c.f==='meumeu'?'#ffd9a0':'#ff9a8a';ctx.fillText(`charge · ${txt}`,q.x,q.y-9*dpr);ctx.restore();}}
  drawFog(){if(!this.fogCv)return;const ctx=this.ctx,z=this.z();const free=this.camFree();ctx.save();if(free)this.groundPass(true);const o=this.toScreen(0,0);const M=[TW/2*z,TH/2*z,-TW/2*z,TH/2*z,o.x,o.y];if(free)ctx.transform(...M);else ctx.setTransform(...M);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.fogCv,0,0);ctx.restore();if(free)this.groundPass(false);}
  // La carte logistique (touche L) : chaque dépôt et ce qu'il attend sans l'avoir, les convois en route (porteurs, trains),
  // les voies coupées, les usines arrêtées ou sabotées, les soldats presque à sec. D'un coup d'œil : où la chaîne casse.
  drawLogistics(){if(!this.logi)return;const ctx=this.ctx,W=this.world,z=this.z(),dpr=this.dpr,cw=this.canvas.width,ch=this.canvas.height;const on=q=>q.x>-40&&q.y>-40&&q.x<cw+40&&q.y<ch+40;
    ctx.save();ctx.fillStyle='rgba(8,16,24,.38)';ctx.fillRect(0,0,cw,ch);
    const now=performance.now();if(!this._lm||now-this._lm.t>1000)this._lm={t:now,M:W.market('meumeu')};const M=this._lm.M;
    for(const k in W.s.rails){const r=W.s.rails[k];const q=this.toScreen(k%W.N+.5,((k/W.N)|0)+.5);if(!on(q))continue;ctx.fillStyle=r.b?'rgba(205,215,225,.6)':'rgba(235,70,50,.95)';ctx.fillRect(q.x-2.5*z,q.y-1.2*z,5*z,2.4*z);}
    ctx.lineWidth=2*dpr;for(const v of W.s.vehicles){if(v.f!=='meumeu'||!v.job)continue;const S=v.job.from!=null?W.building(v.job.from):null,D=W.building(v.job.to);if(!D)continue;
      const a=this.toScreen(...(S?W.bc(S):[v.x,v.y]),.3),b=this.toScreen(...W.bc(D),.3);const col=v.k==='train'?'255,211,106':'143,211,255';ctx.strokeStyle=`rgba(${col},.8)`;ctx.setLineDash([6*dpr,5*dpr]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
      const an=Math.atan2(b.y-a.y,b.x-a.x);ctx.fillStyle=`rgb(${col})`;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(an-.4)*9*dpr,b.y-Math.sin(an-.4)*9*dpr);ctx.lineTo(b.x-Math.cos(an+.4)*9*dpr,b.y-Math.sin(an+.4)*9*dpr);ctx.fill();
      const p=this.toScreen(v.x,v.y,.3);ctx.beginPath();ctx.arc(p.x,p.y,3.2*dpr,0,7);ctx.fill();}
    ctx.textAlign='center';ctx.font=`700 ${10*dpr}px system-ui`;
    for(const D of W.s.buildings){if(D.f!=='meumeu'||!W.isDepot(D))continue;const q=this.toScreen(...W.bc(D),1.4);if(!on(q))continue;const dem=M.dem.get(D.id)||{};let un=0;for(const L of Object.values(dem))for(const d of L)if(d.src!=='equilibre')un+=d.n;
      let ammo=0;for(const [k,n] of Object.entries(D.stock||{}))if(k.startsWith('m:'))ammo+=n;const col=un>40?'#e5533d':un>8?'#f0a93a':'#5fd18a';const r=(8+Math.min(14,Math.sqrt(un)))*dpr;
      ctx.fillStyle='rgba(10,20,28,.8)';ctx.beginPath();ctx.arc(q.x,q.y,r,0,7);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=3*dpr;ctx.beginPath();ctx.arc(q.x,q.y,r,0,7);ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillText(un>0.5?Math.round(un):'✓',q.x,q.y+3.5*dpr);ctx.fillStyle='#ffd36a';ctx.fillText(`${Math.round(ammo)} cais. mun.${D.prio>=5?' · prioritaire':''}`,q.x,q.y+r+12*dpr);}
    for(const b of W.s.buildings){if(b.f!=='meumeu'||b.ruin)continue;const sab=b.sabUntil>W.s.t,stop=BUILDINGS[b.k].factory&&b.why&&b.done;if(!sab&&!stop)continue;const q=this.toScreen(...W.bc(b),1.8);if(!on(q))continue;
      ctx.fillStyle=sab?'#e5533d':'#f0a93a';ctx.beginPath();ctx.arc(q.x,q.y,8*dpr,0,7);ctx.fill();ctx.fillStyle='#10161a';ctx.fillText(sab?'✖':'!',q.x,q.y+3.5*dpr);}
    for(const u of W.s.units){if(u.f!=='meumeu'||!u.w||u.hp<=0)continue;const Wd=W.W(u.w);const n=(u.mag||0)+(u.pouch||0);if(n>=Wd.carry*.25)continue;const q=this.toScreen(u.x,u.y,1.1);if(!on(q))continue;ctx.fillStyle=n<=0?'#e5533d':'#f0a93a';ctx.beginPath();ctx.arc(q.x,q.y,4*dpr,0,7);ctx.fill();}
    ctx.textAlign='left';ctx.fillStyle='rgba(10,20,28,.85)';ctx.fillRect(12*dpr,ch-86*dpr,330*dpr,74*dpr);ctx.fillStyle='#e8dcc4';ctx.font=`700 ${11*dpr}px system-ui`;ctx.fillText('Carte logistique (L)',20*dpr,ch-68*dpr);ctx.font=`${10*dpr}px system-ui`;
    ctx.fillText('Cercle : dépôt — chiffre : ce qu’il attend sans l’avoir (vert : servi)',20*dpr,ch-52*dpr);ctx.fillText('Tirets bleus : porteurs · jaunes : trains · rouge : voie coupée',20*dpr,ch-38*dpr);ctx.fillText('! usine arrêtée · ✖ sabotée · points : soldats presque à sec',20*dpr,ch-24*dpr);ctx.restore();}
  // La logistique d'un dépôt ou d'un chantier, par-dessus la carte, quand on le choisit : ce qu'il a, ce qu'il attend et ce qui
  // arrive (les convois en route, avec leur chargement), les usines qu'il nourrit (orange) et celles qui le remplissent (vert),
  // les chantiers qu'il sert ; pour un chantier : ce qui reste à apporter, ce qui est en route, où ses bâtisseurs vont le chercher.
  drawFocus(){const W=this.world,b=this.selB!=null?W.building(this.selB):null;if(!b||b.f!=='meumeu'||b.ruin)return;const depot=W.isDepot(b)&&b.done,site=!b.done;if(!depot&&!site)return;
    const ctx=this.ctx,z=this.z(),dpr=this.dpr,cw=this.canvas.width,ch=this.canvas.height;const now=performance.now();if(!this._lm||now-this._lm.t>700)this._lm={t:now,M:W.market('meumeu')};const M=this._lm.M;
    const nm=k=>W.goodName(k),n0=v=>v>=10?Math.round(v):Math.round(v*10)/10;const ico=k=>{try{return (k.startsWith('m:')||k.startsWith('a:')||RES[k])?icon(k):null;}catch(e){return null;}};
    const [bx,by]=W.bc(b);const P=this.toScreen(bx,by,.3);ctx.save();
    const arrow=(a,c,col,label,dash=[7*dpr,5*dpr])=>{ctx.strokeStyle=col;ctx.lineWidth=2.2*dpr;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.setLineDash([]);
      const an=Math.atan2(c.y-a.y,c.x-a.x);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x-Math.cos(an-.4)*10*dpr,c.y-Math.sin(an-.4)*10*dpr);ctx.lineTo(c.x-Math.cos(an+.4)*10*dpr,c.y-Math.sin(an+.4)*10*dpr);ctx.fill();
      if(label){const m={x:(a.x+c.x)/2,y:(a.y+c.y)/2};ctx.font=`600 ${9.5*dpr}px system-ui`;const w=ctx.measureText(label).width+8*dpr;ctx.fillStyle='rgba(10,18,26,.85)';ctx.fillRect(m.x-w/2,m.y-9*dpr,w,13*dpr);ctx.fillStyle=col;ctx.textAlign='center';ctx.fillText(label,m.x,m.y+1*dpr);}};
    const cargo=o=>Object.entries(o||{}).filter(([,n])=>n>.05).slice(0,3).map(([k,n])=>`${n0(n)} ${nm(k).toLowerCase()}`).join(', ');
    // les convois vers lui (bleu : porteurs, jaune : trains) et depuis lui
    for(const v of W.s.vehicles){if(v.f!=='meumeu'||!v.job)continue;const J=v.job;const into=J.to===b.id||site&&J.to===b.site,from=J.from===b.id;if(!into&&!from)continue;
      const col=v.k==='train'?'rgb(255,211,106)':'rgb(143,211,255)';const V=this.toScreen(v.x,v.y,.3);const dst=W.building(J.to);if(!dst)continue;
      if(J.phase==='src'&&J.from!=null){const S=W.building(J.from);if(S)arrow(V,this.toScreen(...W.bc(S),.3),col+'',null,[3*dpr,4*dpr]);arrow(S?this.toScreen(...W.bc(S),.3):V,this.toScreen(...W.bc(dst),.3),col,`${v.name||v.k} : ${cargo(J.q)}`);}
      else arrow(V,this.toScreen(...W.bc(dst),.3),col,`${v.name||v.k} : ${cargo(v.cargo)||'à vide'}`);}
    if(depot){// les usines qu'il nourrit, celles qui le remplissent, les chantiers qu'il sert
      for(const o of W.s.buildings){if(o.f!=='meumeu'||o.ruin||o===b)continue;const q=this.toScreen(...W.bc(o),.3);
        if(o.sup===b.id&&BUILDINGS[o.k].factory)arrow(P,q,'rgba(240,169,58,.9)',o.why&&o.done?`${BUILDINGS[o.k].name} : ${o.why}`:BUILDINGS[o.k].name);
        else if(o.out===b.id&&(BUILDINGS[o.k].factory||BUILDINGS[o.k].makes||o.k==='mine'))arrow(q,P,'rgba(95,209,138,.85)',BUILDINGS[o.k].name,[2*dpr,5*dpr]);
        else if(!o.done&&o.site===b.id)arrow(P,q,'rgba(232,191,98,.9)',`chantier : ${BUILDINGS[o.k].name}`,[4*dpr,4*dpr]);}}
    if(site){const D=W.siteDepot(b);if(D)arrow(this.toScreen(...W.bc(D),.3),P,'rgba(232,191,98,.9)',`dépôt du chantier : ${W.depotName(D)}`,[4*dpr,4*dpr]);
      for(const u of W.s.units){if(u.task?.kind!=='build'||u.task.b!==b.id)continue;const U=this.toScreen(u.x,u.y,.3);
        if(u.task.fetchDepot!=null){const F=W.building(u.task.fetchDepot);if(F)arrow(U,this.toScreen(...W.bc(F),.3),'rgba(200,160,255,.9)',`va chercher ${n0(u.task.fetchN||0)} ${nm(u.task.fetch).toLowerCase()}`,[2*dpr,4*dpr]);}
        else if(u.carry&&u.task.bring)arrow(U,P,'rgba(200,160,255,.9)',`apporte ${n0(u.carry.n)} ${nm(u.carry.k).toLowerCase()}`,[2*dpr,4*dpr]);}}
    // la fiche : par-dessus le bâtiment, dans l'écran
    const rows=[];const title=depot?`${W.depotName(b)} · ${Math.round(W.stored(b))}/${BUILDINGS[b.k].store}`:`Chantier : ${BUILDINGS[b.k].name} · ${Math.round(b.progress*100)} %`;
    if(depot){const st=Object.entries(b.stock).filter(([,n])=>n>=.5).sort((a,z)=>z[1]-a[1]);for(const [k,n] of st.slice(0,8))rows.push({k,t:`${n0(n)} ${nm(k).toLowerCase()}`,c:'#e8dcc4'});if(st.length>8)rows.push({t:`… et ${st.length-8} autres`,c:'#9aa6ad'});
      const inb=M.inb.get(b.id)||{};for(const it of W.deficits(M,b).slice(0,6))rows.push({k:it.k,t:`attend ${n0(it.n)} ${nm(it.k).toLowerCase()}${inb[it.k]?` · ${n0(inb[it.k])} en route`:' · rien en route'}`,c:inb[it.k]?'#8fd3ff':'#f0a93a'});}
    else{const cost=W.siteCost(b),rem=W.siteRemaining(b);for(const [k,n] of Object.entries(cost)){const r=rem[k]||0,e=W.enRoute(b,k);rows.push({k,t:r<=.05?`${nm(k)} : ${n0(n)}, tout est là`:`${nm(k)} : manque ${n0(r)} / ${n0(n)}${e>0?` · ${n0(e)} portés par les bâtisseurs`:''}`,c:r<=.05?'#5fd18a':e>0?'#c8a0ff':'#f0a93a'});}
      const bu=W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;rows.push({t:`${bu} bâtisseur${bu>1?'s':''}${b.why?' · '+b.why:''}`,c:b.why?'#f0a93a':'#9aa6ad'});}
    ctx.font=`700 ${11*dpr}px system-ui`;let w=ctx.measureText(title).width;ctx.font=`600 ${10*dpr}px system-ui`;for(const r of rows)w=Math.max(w,ctx.measureText(r.t).width+(r.k?18*dpr:0));w+=20*dpr;const lh=15*dpr,h=22*dpr+rows.length*lh+6*dpr;
    let x=P.x+40*dpr,y=P.y-h-30*dpr;x=Math.max(8*dpr,Math.min(cw-w-8*dpr,x));y=Math.max(8*dpr,Math.min(ch-h-8*dpr,y));
    ctx.fillStyle='rgba(10,18,26,.9)';ctx.strokeStyle='rgba(255,211,106,.7)';ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,6*dpr):ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,211,106,.5)';ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(Math.max(x,Math.min(x+w,P.x)),y+h);ctx.stroke();
    ctx.textAlign='left';ctx.fillStyle='#ffd36a';ctx.font=`700 ${11*dpr}px system-ui`;ctx.fillText(title,x+10*dpr,y+16*dpr);ctx.font=`600 ${10*dpr}px system-ui`;
    rows.forEach((r,i)=>{const yy=y+22*dpr+i*lh+10*dpr;let xx=x+10*dpr;if(r.k){const im=ico(r.k);if(im)ctx.drawImage(im,xx,yy-10*dpr,13*dpr,13*dpr);xx+=18*dpr;}ctx.fillStyle=r.c;ctx.fillText(r.t,xx,yy);});
    ctx.restore();}
  gunBitmap(id,D){this.gunBms??=new Map();const key=id+'|'+JSON.stringify(D.p);let bm=this.gunBms.get(key);if(bm!==undefined)return bm;
    try{const G=gunLayout(D);const s=2.4,pad=Math.ceil(10*s);const RH=Math.max((D.Dc||D.p.d*1.45)*3.2+6,D.p.d*3);const w=Math.ceil((G.Lw+30)*s)+pad,h=Math.ceil(RH*6*s)+8;const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      const x=cv.getContext('2d');const ay=Math.round(h*.4);drawWeapon(x,D,{bx:pad,ay,s,ground:h-2,t:0,G,inhand:true});bm={cv,pad,ay,s,Lw:G.Lw};}catch(e){console.error(e);bm=null;}
    this.gunBms.set(key,bm);if(this.gunBms.size>40)this.gunBms.delete(this.gunBms.keys().next().value);return bm;}
  // les fumigènes : un nuage épais qui gonfle, tourne lentement, puis se dissipe
  drawSmokes(){const ctx=this.ctx,z=this.z(),W=this.world;const im=img('fx/smoke_cloud.webp'),im2=img('fx/smoke_gray1.webp');if(!im)return;
    for(const s of W.s.smokes){if(this.near(s.x,s.y)<=0)continue;const age=W.t-s.t0,left=s.end-W.t;const a=Math.min(1,age*3)*Math.min(1,left/2);const grow=Math.min(1,.4+age*1.5);
      for(let n=0;n<7;n++){const an=n/7*6.283+age*.15;const r=s.r*.55*grow;const q=this.toScreen(s.x+Math.cos(an)*r,s.y+Math.sin(an)*r,.25+(n%3)*.15);const w=s.r*TW*z*.9*grow;
        ctx.save();ctx.globalAlpha=.6*a;ctx.translate(q.x,q.y);ctx.rotate(an+age*.2);ctx.drawImage(n%2&&im2?im2:im,-w/2,-w/2,w,w);ctx.restore();}}}
  drawFx(dt){const ctx=this.ctx,z=this.z();this.fx=this.fx.filter(f=>(f.life-=dt)>0);
    for(const pass of [false,true]){ctx.save();if(pass)ctx.globalCompositeOperation='lighter';
      for(const f of this.fx){if(f.add!==pass||!this.fxVisible(f.x,f.y,f.f))continue;const im=img('fx/'+f.name+(f.name.endsWith('_generated')?'.png':'.webp'));if(!im)continue;const k=1-f.life/f.max;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.rise*dt;
        const q=this.toScreen(f.x,f.y,f.z);const s=f.size*z*(1+(f.grow-1)*k);const a=f.alpha*(f.add?(1-k):Math.min(1,(1-k)*1.6)*.6);if(a<=0)continue;ctx.globalAlpha=a;
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(f.ang);const r=im.width/im.height;ctx.drawImage(im,-s*r/2*(f.name.startsWith('weapon_muzzle')||f.name.startsWith('muzzle_side')||f.name.startsWith('muzzle_rifle')||f.name.startsWith('spray')?0:1),-s/2,s*r,s);ctx.restore();}ctx.restore();}}
  // les balles : un trait bref qui file du tireur au point d'arrivée ; les traçantes, rouges et plus longues
  drawStreaks(dt){const ctx=this.ctx;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const s of this.streaks){s.age+=dt;if(!this.fxVisible(s.x0,s.y0,s.f)&&!this.fxVisible(s.x1,s.y1))continue;const q=Math.min(1,s.age/s.life);const L=Math.hypot(s.x1-s.x0,s.y1-s.y0)||1;const tail=Math.max(0,q-(s.tr?1.2:.7)/L);
      const hx=s.x0+(s.x1-s.x0)*q,hy=s.y0+(s.y1-s.y0)*q,tx=s.x0+(s.x1-s.x0)*tail,ty=s.y0+(s.y1-s.y0)*tail;const arc=t=>s.frag?0:Math.min(.28,L*.009)*4*t*(1-t);const h=s.h0*(1-q)+.25*q+arc(q);const a=this.toScreen(hx,hy,h),b=this.toScreen(tx,ty,s.h0*(1-tail)+.25*tail+arc(tail));
      if(s.rk){// la balle-fusée : lente au départ (charge d'éjection), puis la flamme et la fumée
        const on=q*s.life>=(s.ig||0)*3;const n=this.toScreen(hx+(s.seek?Math.sin(s.wob+q*9)*.12:0),hy+(s.seek?Math.cos(s.wob+q*7)*.12:0),h);
        if(on&&Math.random()<.7)this.sfx('smoke_gray1',hx,hy,{z:h,size:8+s.cal*1.4,life:1.1,rise:.12,grow:2.2,alpha:.42,ang:Math.random()*6});
        if(on&&s.st2&&Math.abs(q-.45)<.03)this.sfx('muzzle_burst',hx,hy,{z:h,size:14,life:.12,ang:Math.random()*6,add:true});
        const ang=Math.atan2(a.y-b.y,a.x-b.x);ctx.save();ctx.translate(n.x,n.y);ctx.rotate(ang);const k=Math.max(1.6,s.cal*.7)*this.dpr;
        if(on){ctx.fillStyle='rgba(255,196,110,.95)';ctx.beginPath();ctx.moveTo(-k*1.3,-k*.35);ctx.lineTo(-k*(3.4+Math.random()),0);ctx.lineTo(-k*1.3,k*.35);ctx.fill();}
        ctx.globalCompositeOperation='source-over';ctx.fillStyle=s.he?'#6b7b3a':'#9aa4ad';ctx.fillRect(-k*1.3,-k*.35,k*1.9,k*.7);ctx.fillStyle=s.tip||'#c07a3e';ctx.beginPath();ctx.moveTo(k*.6,-k*.35);ctx.lineTo(k*1.25,0);ctx.lineTo(k*.6,k*.35);ctx.fill();
        if(s.fins){ctx.fillStyle='#50565e';ctx.beginPath();ctx.moveTo(-k*1.3,-k*.35);ctx.lineTo(-k*1.3,-k*.9);ctx.lineTo(-k*.8,-k*.35);ctx.moveTo(-k*1.3,k*.35);ctx.lineTo(-k*1.3,k*.9);ctx.lineTo(-k*.8,k*.35);ctx.fill();}
        ctx.restore();continue;}
      ctx.strokeStyle=s.frag?'rgba(255,220,145,.85)':s.rk?'rgba(255,167,93,.95)':s.tr?(s.f==='beee'?'rgba(120,255,140,.95)':'rgba(255,90,60,.95)'):(s.f==='beee'?'rgba(255,190,150,.65)':'rgba(255,245,200,.65)');ctx.lineWidth=(s.frag?1:s.rk?2.8:s.tr?2.2:Math.min(2.2,.9+s.cal*.15))*this.dpr;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();
      // la tête : la balle elle-même, de la couleur de sa pointe (au-dessus de 2,5 mm on la voit filer)
      if(!s.frag&&(s.tip||s.cal>=2.5)&&q<.97){ctx.fillStyle=s.tip||'#e0a060';const k=Math.min(3.2,.8+s.cal*.35)*this.dpr;ctx.beginPath();ctx.arc(a.x,a.y,k,0,7);ctx.fill();if(s.he){ctx.fillStyle='rgba(255,230,120,.8)';ctx.beginPath();ctx.arc(a.x,a.y,k*.45,0,7);ctx.fill();}}if(s.rk&&q<.9){ctx.fillStyle='#ffd091';ctx.beginPath();ctx.arc(a.x,a.y,2.2*this.dpr,0,7);ctx.fill();}}
    ctx.restore();this.streaks=this.streaks.filter(s=>s.age<s.life);}
  designedArtillery(u){return u.w?this.world.W(u.w):null;}
  artilleryBitmap(D){this.artBms??=new Map();const key=JSON.stringify(D.p);if(this.artBms.has(key))return this.artBms.get(key);try{const G=gunLayout(D),s=.5,pad=50,ground=270,ay=130,w=Math.ceil((G.Lw+pad*2+120)*s),h=390,cv=document.createElement('canvas');cv.width=w;cv.height=h;drawWeapon(cv.getContext('2d'),D,{bx:pad,ay,s,ground,t:0,G});const bm={cv,pad,ay,s,Lw:G.Lw};this.artBms.set(key,bm);return bm;}catch(e){console.error('Rendu de la pièce conçue impossible',e);return null;}}
  // Les munitions sont physiques : un porteur ou un servant a ses caisses sur le dos (une, deux, trois empilées), en bois pour des cartouches, avec un obus
  // en évidence pour celles d'une pièce ; plus il en porte, plus la pile est haute (et plus il est lent : world.crateKg).
  drawCarried(u,q,z,size){const ctx=this.ctx,W=this.world,Wa=u.ammoW&&W.design(u.ammoW)?W.W(u.ammoW):null,shell=!!(Wa&&Wa.crew>1),n=Math.max(1,Math.min(3,Math.ceil(u.crates-1e-6)));
    const right=((u.fx??1)-(u.fy??0))>=0,bx=q.x+(right?-1:1)*7*z,by=q.y-size*.5;ctx.save();ctx.lineJoin='round';
    for(let k=0;k<n;k++){const y=by-k*5.2*z,w=8.4*z,h=5.6*z,x=bx-w/2;ctx.fillStyle=shell?'#6b6a48':'#9a6a3a';ctx.strokeStyle='#241a10';ctx.lineWidth=Math.max(1,.9*z);ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y-h,w,h,1.2*z):ctx.rect(x,y-h,w,h);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(230,230,225,.75)';ctx.fillRect(x+w*.18,y-h,1.2*z,h);ctx.fillRect(x+w*.72,y-h,1.2*z,h);   // les cerclages
      if(shell){ctx.fillStyle='#d8b04a';ctx.beginPath();ctx.ellipse(bx,y-h,2.1*z,1.5*z,0,0,7);ctx.fill();ctx.stroke();}}   // la pointe de l'obus dépasse
    ctx.restore();}
  drawDesignedCrewGun(u,q,z,D){const ctx=this.ctx,bm=this.artilleryBitmap(D);if(!bm)return;const fx=u.fx??1,fy=u.fy??0,ang=Math.atan2((fx+fy)*.5,fx-fy),s=38*z/300,scale=s/bm.s,w=bm.cv.width*scale,h=bm.cv.height*scale;
    if(!this.o3){ctx.save();ctx.translate(q.x,q.y-5*z);ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,4*z,Math.max(18*z,D.p.L*s*.7),9*z,0,0,Math.PI*2);ctx.fill();ctx.rotate(ang);if(Math.cos(ang)<0)ctx.scale(1,-1);
    ctx.drawImage(bm.cv,-bm.pad*scale,-bm.ay*scale,w,h);ctx.restore();}
    // le chargement, en image : l'obus que le servant le plus proche porte jusqu'à la culasse, pendant tout le rechargement (plus il est lourd, plus c'est long)
    if(u.reload>0&&u.reloadTotal>1.4){const sv=this.world.servants(u).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0];
      if(sv){const p=1-u.reload/u.reloadTotal,t=Math.max(0,Math.min(1,(p-.12)/.8)),e=t*t*(3-2*t),a0=this.toScreen(sv.x,sv.y),br={x:q.x+Math.cos(ang)*bm.Lw*.22*s,y:q.y-5*z+Math.sin(ang)*bm.Lw*.22*s};
        const px=a0.x+(br.x-a0.x)*e,py=a0.y-9*z+(br.y-(a0.y-9*z))*e-Math.sin(Math.PI*e)*4*z,len=Math.max(4,Math.min(10,(D.rm||300)/60+3.5))*z;
        ctx.save();ctx.translate(px,py);ctx.rotate(t<.999?Math.atan2(br.y-a0.y,br.x-a0.x)*.5+ang*.5:ang);ctx.fillStyle='#7b7a52';ctx.strokeStyle='#1b1710';ctx.lineWidth=Math.max(1,.9*z);
        ctx.beginPath();ctx.roundRect?ctx.roundRect(-len/2,-1.6*z,len,3.2*z,1.4*z):ctx.rect(-len/2,-1.6*z,len,3.2*z);ctx.fill();ctx.stroke();ctx.fillStyle='#d8b04a';ctx.fillRect(-len*.18,-1.6*z,len*.16,3.2*z);ctx.restore();}}
    const required=Math.max(0,D.crew-1),present=this.world.servants(u,1.5).length,missing=Math.max(0,required-present);if(this.sel.has(u.id)||missing){const text=missing?`ÉQUIPAGE ${present}/${required} · MANQUE ${missing}`:`ÉQUIPAGE COMPLET ${present}/${required}`;ctx.save();ctx.font=`800 ${10*this.dpr}px system-ui`;const tw=ctx.measureText(text).width+14*this.dpr,x=q.x-tw/2,y=q.y-37*z;ctx.fillStyle=missing?'rgba(117,34,28,.96)':'rgba(20,84,66,.94)';ctx.strokeStyle=missing?'#ff8b65':'#70dbad';ctx.lineWidth=1*this.dpr;ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,tw,18*this.dpr,5*this.dpr):ctx.rect(x,y,tw,18*this.dpr);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4df';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,q.x,y+9*this.dpr);ctx.restore();}}
  drawCannon(u,q,z){const D=this.designedArtillery(u);if(!this.o3)this.drawUnitFallback(u,{x:q.x-15*z,y:q.y+6*z},38*z,z,false);if(D)this.drawDesignedCrewGun(u,q,z,D);}
  // Un train : la locomotive devant, quatre wagons derrière, le long de la voie parcourue.
  drawVehicle(v){const ctx=this.ctx,z=this.z(),W=this.world;const sel=this.selV===v.id||this.sel?.has?.(v.id)||this.selVs?.has(v.id);
    if(VEHDEF[v.k]){this.drawCombatVehicle(v,sel);return;}
    if(v.k==='train'){this.drawTrain(v,sel);return;}
    // un porteur : le Meumeu lui-même, à pied, ce qu'il porte sur le dos
    if(v.k==='porteur'&&v.u){const u=v.u;const k0=Object.keys(v.cargo).find(k=>v.cargo[k]>=.05);Object.assign(u,{x:v.x,y:v.y,dx:v.dx,dy:v.dy,anim:v.path?'walk':'idle',carry:k0?{k:k0,n:v.cargo[k0]}:null});
      if(sel){const q=this.toScreen(v.x,v.y),z=this.z();this.ctx.strokeStyle='#ffd36a';this.ctx.lineWidth=2;this.ctx.beginPath();this.ctx.ellipse(q.x,q.y,14*z,7*z,0,0,7);this.ctx.stroke();}
      this.drawUnit(u);return;}
    const q=this.toScreen(v.x,v.y);const air=v.alt>0;const g=this.toScreen(v.x,v.y,air?v.alt:0);
    if(air){ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(q.x,q.y,26*z,8*z,0,0,7);ctx.fill();}
    const V=VEHICLES[v.k];const im=vehicle(v.f==='beee'?'beee_prop-plane':air?(V.sprite||'prop-plane_flying'):v.k==='charrette'?'hand-cart':'prop-plane_grounded');const w=(v.k==='charrette'?TW*.9:TW*2.2)*z;
    const right=((v.dx||0)-(v.dy||0))>0;if(im&&!this.o3){ctx.save();ctx.translate(g.x,g.y-w*.3);if(right)ctx.scale(-1,1);if(v.hitAt&&W.t-v.hitAt<.05)ctx.filter='brightness(1.8)';ctx.drawImage(im,-w/2,-w/2,w,w);ctx.restore();}
    if(v.k==='charrette'&&sum(v.cargo)>0){const ic=icon(Object.keys(v.cargo)[0]);if(ic)ctx.drawImage(ic,g.x-8*z,g.y-w*.8,16*z,16*z);}
    if(air&&v.hp<v.max)this.bar(g.x,g.y-w*.75,40*z,v.hp/v.max,v.f==='beee'?'#e0503a':'#54aaa1');
    if(sel||(air&&v.f==='beee'))this.tag(v.f==='beee'?'Bombardier bèè':`${v.name}${v.why?' · '+v.why:''}`,g.x,g.y-w*.85,v.f==='beee'?'bad':v.why?'warn':'ink');}
  // Un véhicule de combat : en 2D, sa silhouette vue de dessus (la caisse, la tourelle, le tube) ; en 3D, la scène le dessine — on n'ajoute que le contour
  // de son emprise quand il est sélectionné, sa barre de vie et son nom (avec ce qui l'arrête, s'il est arrêté)
  drawCombatVehicle(v,sel){const ctx=this.ctx,z=this.z(),V=VEHDEF[v.k];const c=Math.cos(v.h),s=Math.sin(v.h),hl=V.long/2,hw=V.large/2;
    const pt=(a,b)=>this.toScreen(v.x+c*a-s*b,v.y+s*a+c*b);const box=[pt(hl,hw),pt(hl,-hw),pt(-hl,-hw),pt(-hl,hw)];const poly=P=>{ctx.beginPath();P.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
    if(!this.o3){poly(box);ctx.fillStyle=v.hp<=0?'#3a3632':v.f==='beee'?'#8a5a48':'#6f7650';ctx.fill();ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=1.5;ctx.stroke();
      const m0=v.mounts?.[0];const ty=v.h+(m0?.yaw||0);const tc=this.toScreen(v.x,v.y,.35);ctx.fillStyle='#565c3e';ctx.beginPath();ctx.ellipse(tc.x,tc.y,hw*.8*TW/2*z,hw*.8*TH/2*z,0,0,7);ctx.fill();
      if(V.armes.length){const tip=this.toScreen(v.x+Math.cos(ty)*hl*1.1,v.y+Math.sin(ty)*hl*1.1,.35);ctx.strokeStyle='#2c2f22';ctx.lineWidth=3*z;ctx.beginPath();ctx.moveTo(tc.x,tc.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();}}
    if(sel){poly(box);ctx.strokeStyle='#ffd36a';ctx.lineWidth=2;ctx.stroke();}
    const top=this.toScreen(v.x,v.y,1.6);if(v.hp<v.max||sel)this.bar(top.x,top.y,46*z,Math.max(0,v.hp/v.max),'#54aaa1');
    if(sel)this.tag(`${v.name}${v.why?' · '+v.why:''}`,top.x,top.y-10*z,v.why?'warn':'ink');}
  // Un train dessiné : la locomotive à vapeur (chaudière, cabine, cheminée qui fume, fanal la nuit), le tender de charbon, et
  // quatre wagons faits pour ce qu'ils portent — trémies de charbon, d'argile, de minerai ; plats de grumes, de briques, de caisses ;
  // citerne de carburant ; wagons couverts pour les munitions et les pièces. Les voitures suivent la trace de la locomotive.
  drawTrain(v,sel){const ctx=this.ctx,z=this.z(),W=this.world;const pts=[[v.x,v.y],...(v.trail||[])];
    const at=d=>{let left=d;for(let n=0;n<pts.length-1;n++){const [ax,ay]=pts[n],[bx,by]=pts[n+1];const L=Math.hypot(bx-ax,by-ay);if(left<=L){const t=L?left/L:0;return [ax+(bx-ax)*t,ay+(by-ay)*t,ax-bx,ay-by];}left-=L;}const l=pts[pts.length-1];return [l[0]-(v.dx||1)*(left),l[1]-(v.dy||0)*(left),v.dx||1,v.dy||0];};
    const keys=Object.entries(v.cargo||{}).filter(([,n])=>n>=.05).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
    const cars=[{k:'loco',h:.5},{k:'tender',h:.3}];for(let n=0;n<4;n++)cars.push({k:'wagon',h:.44,load:keys.length?keys[n%keys.length]:null,fill:keys.length?Math.min(1,W.cargoW(v)/Math.max(1,W.capOf(v))*1.3):0});
    let d=0;for(let n=0;n<cars.length;n++){const c=cars[n];if(n)d+=cars[n-1].h+c.h+.1;const [x,y,dx,dy]=at(d);Object.assign(c,{x,y,dx:dx||v.dx||1,dy:dy||v.dy||0});}
    const moving=v.path&&v.state!=='wait';
    if(!this.o3)for(const c of [...cars].sort((a,b)=>(a.x+a.y)-(b.x+b.y)))this.drawCar(c,v,moving);
    // la fumée : des bouffées qui montent et partent en arrière
    const L0=cars[0];const Lh=Math.hypot(L0.dx,L0.dy)||1;const ux=L0.dx/Lh,uy=L0.dy/Lh;
    for(let k=0;k<6;k++){const age=((this.clock*(moving?1.4:.5))+k/6)%1;const cO=this.o3?.9:.35,cH=this.o3?2.3:1.45;const q=this.toScreen(L0.x+ux*cO-ux*age*(moving?1.2:.2),L0.y+uy*cO-uy*age*(moving?1.2:.2),cH+age*(moving?1.1:1.5));
      ctx.fillStyle=`rgba(${moving?'62,62,64':'120,120,122'},${(1-age)*(moving?.38:.22)})`;ctx.beginPath();ctx.arc(q.x,q.y,(2.5+age*7)*z,0,7);ctx.fill();}
    if(W.isNight()){const q=this.o3?this.toScreen(L0.x+ux*1.5,L0.y+uy*1.5,1.0):this.toScreen(L0.x+ux*.55,L0.y+uy*.55,.5);const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,26*z);g.addColorStop(0,'rgba(255,226,140,.8)');g.addColorStop(1,'rgba(255,226,140,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,26*z,0,7);ctx.fill();}
    if(sel||this.zoom>.8||v.why){const q=this.toScreen(v.x,v.y,1.5);this.tag(`${v.name}${v.why?' · '+v.why:''}`,q.x,q.y-10*z,v.why?'warn':'ink');}}
  drawCar(c,v,moving){const {x,y,dx,dy}=c;const L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L,px=-uy,py=ux;const WS=1.6,HS=1.5;const P=(a,b,[len,wid,h0,h1,col])=>this.prism(x+ux*a+px*b*WS,y+uy*a+py*b*WS,ux,uy,len,wid*WS,h0*HS,h1*HS,col);const ctx=this.ctx,z=this.z();
    // le châssis et les roues
    const wheel=(a,s)=>{const q=this.toScreen(x+ux*a+px*s*.2,y+uy*a+py*s*.2,.08);ctx.fillStyle='#161a1c';ctx.beginPath();ctx.ellipse(q.x,q.y,4.6*z,3.4*z,0,0,7);ctx.fill();ctx.fillStyle='#6d6f71';ctx.beginPath();ctx.ellipse(q.x,q.y,1.6*z,1.2*z,0,0,7);ctx.fill();};
    for(const a of [-c.h*.6,c.h*.6])for(const s of [-1,1])wheel(a,s);
    P(0,0,[c.h,.13,.06,.13,'#2b2d2f']);
    if(c.k==='loco'){P(-c.h*.62,0,[c.h*.38,.14,.13,.62,'#6a2a22']);P(-c.h*.62,0,[c.h*.42,.155,.62,.68,'#3a3f44']);   // la cabine, son toit
      P(c.h*.18,0,[c.h*.62,.1,.13,.27,'#23313a']);P(c.h*.18,0,[c.h*.56,.075,.27,.34,'#2f4150']);                   // la chaudière
      P(c.h*.52,0,[.025,.1,.13,.3,'#b58a3a']);P(-c.h*.1,0,[.02,.1,.13,.31,'#b58a3a']);                              // les cerclages de laiton
      P(c.h*.7,0,[.045,.045,.34,.62,'#1b1f22']);P(c.h*.7,0,[.06,.06,.6,.66,'#2a2f33']);                             // la cheminée
      P(c.h*.2,0,[.05,.05,.34,.44,'#b58a3a']);                                                                     // le dôme
      P(c.h*.98,0,[.03,.14,.06,.14,'#7a1f1a']);return;}                                                          // le chasse-pierres
    if(c.k==='tender'){P(0,0,[c.h*.95,.14,.13,.34,'#2c3236']);ctx.fillStyle='#111';for(let n=0;n<5;n++){const q=this.toScreen(x+ux*(n-2)*.09+px*((n%2)-.5)*.14,y+uy*(n-2)*.09+py*((n%2)-.5)*.14,.34*HS);ctx.beginPath();ctx.ellipse(q.x,q.y,5*z,3*z,0,0,7);ctx.fill();}return;}
    const k=c.load;const bulk={charbon:'#16181a',argile:'#9a5a3a',pierre:'#8d8a84',fer:'#6d4a3a',sels:'#d0772c',soie:'#3aa39a',verre:'#6aa8d8'};
    if(!k||bulk[k]){// une trémie : parois basses, le chargement bombé dessus
      P(0,0,[c.h*.95,.14,.13,.36,'#5b4a3a']);if(k){const lvl=.2+.18*c.fill;P(0,0,[c.h*.85,.12,.13,lvl,bulk[k]]);if(c.fill>.5)P(0,0,[c.h*.55,.08,lvl,lvl+.06,bulk[k]]);}return;}
    if(k==='carburant'){P(0,0,[c.h*.9,.11,.13,.35,'#d9d2c4']);P(0,0,[c.h*.9,.085,.35,.41,'#e8e2d6']);P(0,0,[.03,.115,.13,.42,'#c05a1c']);P(0,0,[.04,.04,.41,.46,'#555']);return;}
    if(k==='bois'){P(0,0,[c.h*.95,.14,.13,.16,'#6b4a2e']);for(const s of [-1,0,1])P(0,s*.08,[c.h*.9,.035,.16,.16+.2*c.fill,'#8a5a34']);return;}
    if(k==='briques'){P(0,0,[c.h*.95,.14,.13,.16,'#6b4a2e']);for(const a of [-.5,.5])P(c.h*a*.9,0,[c.h*.35,.11,.16,.16+.24*c.fill,'#b5522f']);return;}
    // un wagon couvert : munitions, armes, pièces, vivres
    const col=k.startsWith('m:')||k.startsWith('a:')||k.startsWith('p:')||k==='explosifs'?'#55613a':k==='sante'?'#d9d2c4':'#8a5a34';
    P(0,0,[c.h*.95,.145,.13,.5,col]);P(0,0,[c.h*.98,.16,.5,.54,'#4a4e50']);if(k==='sante'){const q=this.toScreen(x+px*.146*WS,y+py*.146*WS,.32*HS);ctx.fillStyle='#c62828';ctx.fillRect(q.x-3*z,q.y-1*z,6*z,2*z);ctx.fillRect(q.x-1*z,q.y-3*z,2*z,6*z);}}
  // Un prisme posé sur la carte : axe (ux, uy), demi-longueur, demi-largeur, de la hauteur h0 à h1. On ne peint que les faces
  // tournées vers nous, ombrées selon leur orientation (la lumière vient du haut à gauche), puis le dessus.
  prism(x,y,ux,uy,len,wid,h0,h1,col){const ctx=this.ctx,z=this.z();const px=-uy,py=ux;
    const C=[[ux*len+px*wid,uy*len+py*wid],[ux*len-px*wid,uy*len-py*wid],[-ux*len-px*wid,-uy*len-py*wid],[-ux*len+px*wid,-uy*len+py*wid]].map(([a,b])=>[x+a,y+b]);
    const S=(p,h)=>this.toScreen(p[0],p[1],h);
    for(let n=0;n<4;n++){const a=C[n],b=C[(n+1)%4];const ex=b[0]-a[0],ey=b[1]-a[1];const nx=ey,ny=-ex;const cx=(a[0]+b[0])/2-x,cy=(a[1]+b[1])/2-y;const out=(nx*cx+ny*cy)>0?1:-1;const Nx=nx*out,Ny=ny*out;
      if(Nx+Ny<=0)continue;const l=Math.hypot(Nx,Ny)||1;const f=.62+.2*((Nx-Ny)/l);
      const p1=S(a,h0),p2=S(b,h0),p3=S(b,h1),p4=S(a,h1);ctx.fillStyle=shade(col,f);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(p3.x,p3.y);ctx.lineTo(p4.x,p4.y);ctx.closePath();ctx.fill();}
    ctx.fillStyle=shade(col,1.08);ctx.beginPath();C.forEach((p,n)=>{const q=S(p,h1);n?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.8*this.dpr;ctx.stroke();}
  // une boîte isométrique orientée : wagon, locomotive
  box(x,y,dx,dy,len,wid,top,side,front,hgt){const ctx=this.ctx,z=this.z();const L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L,px=-uy,py=ux;
    const c=[[x+ux*len+px*wid,y+uy*len+py*wid],[x+ux*len-px*wid,y+uy*len-py*wid],[x-ux*len-px*wid,y-uy*len-py*wid],[x-ux*len+px*wid,y-uy*len+py*wid]].map(([a,b])=>this.toScreen(a,b));
    const H=hgt*TH*z;ctx.fillStyle=side;for(let n=0;n<4;n++){const a=c[n],b=c[(n+1)%4];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y-H);ctx.lineTo(a.x,a.y-H);ctx.closePath();ctx.fill();}
    ctx.fillStyle=top;ctx.beginPath();c.forEach((p,n)=>n?ctx.lineTo(p.x,p.y-H):ctx.moveTo(p.x,p.y-H));ctx.closePath();ctx.fill();ctx.strokeStyle=front;ctx.lineWidth=1*this.dpr;ctx.stroke();}
  drawShots(){const ctx=this.ctx,z=this.z(),W=this.world;
    for(const sh of W.s.shots){const q=Math.min(1,sh.t/sh.dur);const x=sh.x0+(sh.x1-sh.x0)*q,y=sh.y0+(sh.y1-sh.y0)*q;
      if(sh.kind==='round')continue;
      if(sh.kind==='bullet'){const q2=Math.max(0,q-.4);const a=this.toScreen(x,y,.6),b=this.toScreen(sh.x0+(sh.x1-sh.x0)*q2,sh.y0+(sh.y1-sh.y0)*q2,.6);ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=sh.f==='beee'?'#ff9a6a':'#fff1a8';ctx.lineWidth=1.8*this.dpr;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.restore();}
      else if(sh.kind==='flak'){const a=this.toScreen(x,y,sh.h*q),b=this.toScreen(sh.x0+(sh.x1-sh.x0)*Math.max(0,q-.3),sh.y0+(sh.y1-sh.y0)*Math.max(0,q-.3),sh.h*Math.max(0,q-.3));ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffe08a';ctx.lineWidth=2*this.dpr;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.restore();}
      else{const h=(sh.kind==='hshell'?Math.min(14,Math.max(1.5,sh.top||3)):sh.kind==='shell'?3:1.4)*4*q*(1-q)+.5*(1-q);const g=this.toScreen(x,y),a=this.toScreen(x,y,h);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(g.x,g.y,3*z,1.5*z,0,0,7);ctx.fill();
        if(sh.kind==='shell'||sh.kind==='hshell'){const design=sh.w&&W.design(sh.w),p=design?.p,cal=p?.d||8,sz=Math.max(3.5,Math.min(14,cal*.5))*z;
          // V12.4 : la trajectoire se voit — une traînée (fumée de la charge, air chaud) sur l'arc déjà parcouru, plus épaisse et plus longue avec le calibre
          {const H=hh=>(sh.kind==='hshell'?Math.min(14,Math.max(1.5,sh.top||3)):3)*4*hh*(1-hh)+.5*(1-hh),n=14,back=Math.min(q,.18+Math.min(.5,cal/120));ctx.save();ctx.lineCap='round';
            for(let m=this.o3?2:0;m<n;m++){const q0=q-back*(m+1)/n,q1=q-back*m/n;if(q0<0)break;   // en 3D, la traînée commence derrière l'obus (il est dans la scène)const pa=this.toScreen(sh.x0+(sh.x1-sh.x0)*q0,sh.y0+(sh.y1-sh.y0)*q0,H(q0)),pb=this.toScreen(sh.x0+(sh.x1-sh.x0)*q1,sh.y0+(sh.y1-sh.y0)*q1,H(q1));
              const f=1-m/n;ctx.strokeStyle=`rgba(225,218,200,${.5*f})`;ctx.lineWidth=Math.max(1,sz*.55*(.4+.6*f));ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}
            if(cal>=20&&!this.o3){ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,190,110,.55)';ctx.lineWidth=Math.max(1,sz*.18);const q0=Math.max(0,q-.04),pa=this.toScreen(sh.x0+(sh.x1-sh.x0)*q0,sh.y0+(sh.y1-sh.y0)*q0,H(q0));ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(a.x,a.y);ctx.stroke();}
            ctx.restore();}
          if(this.o3)continue;   // V12.4 : en 3D, l'obus est un objet de la scène (scene3d) ; la traînée et l'ombre restent ici
          const b=this.toScreen(sh.x0,sh.y0),end=this.toScreen(sh.x1,sh.y1),ang=Math.atan2(end.y-b.y,end.x-b.x);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(ang);
          ctx.fillStyle=p?.cons==='he'||p?.cons==='hei'?'#635b41':'#3d474c';ctx.strokeStyle='#161b1d';ctx.lineWidth=Math.max(1,z);ctx.beginPath();ctx.moveTo(sz*1.6,0);ctx.lineTo(sz*.35,-sz*.42);ctx.lineTo(-sz*1.5,-sz*.42);ctx.lineTo(-sz*1.5,sz*.42);ctx.lineTo(sz*.35,sz*.42);ctx.closePath();ctx.fill();ctx.stroke();
          ctx.fillStyle='rgba(240,235,205,.68)';ctx.fillRect(-sz*1.3,-sz*.31,sz*1.9,Math.max(1,z*.13));ctx.fillStyle=p?.fill==='brisant'?'#e18d35':'#c9a64a';ctx.fillRect(-sz*.9,-sz*.42,sz*.3,sz*.84);
          ctx.fillStyle='#313a36';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-sz*1.35,side*sz*.3);ctx.lineTo(-sz*1.8,side*sz*.8);ctx.lineTo(-sz*.95,side*sz*.43);ctx.fill();}
          if(p?.prop==='fusee'){ctx.globalCompositeOperation='lighter';const flame=sz*(1.4+.55*Math.sin(this.frame*18+sh.x0));ctx.fillStyle='#ffb13c';ctx.beginPath();ctx.moveTo(-sz*1.6,-sz*.27);ctx.lineTo(-sz*1.6-flame,0);ctx.lineTo(-sz*1.6,sz*.27);ctx.fill();ctx.fillStyle='#fff5bf';ctx.beginPath();ctx.moveTo(-sz*1.5,-sz*.09);ctx.lineTo(-sz*1.5-flame*.55,0);ctx.lineTo(-sz*1.5,sz*.09);ctx.fill();}ctx.restore();}
        else{ctx.fillStyle='#46513a';ctx.beginPath();ctx.arc(a.x,a.y,3*z,0,7);ctx.fill();}}}
    for(const F of W.s.falls){const q=F.t/F.dur;const x=F.x0+(F.x1-F.x0)*q,y=F.y0+(F.y1-F.y0)*q;const a=this.toScreen(x,y,F.alt*(1-q*q));const g=this.toScreen(x,y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(g.x,g.y,(3+5*q)*z,(1.5+2.5*q)*z,0,0,7);ctx.fill();
      if(F.kind==='bomb'){ctx.fillStyle='#2c2f28';ctx.beginPath();ctx.ellipse(a.x,a.y,3*z,6.5*z,0,0,7);ctx.fill();}else{const im=vehicle(F.f==='beee'?'beee_prop-plane':'cargo-plane');const w=TW*2*z;if(im){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(-.7-q);ctx.filter='brightness(.4)';ctx.drawImage(im,-w/2,-w/2,w,w);ctx.restore();}if(Math.random()<.6)this.puff(x,y,{n:1,color:'rgba(40,36,32,.7)',size:12,spread:.2,up:.2,life:1.4,z:F.alt*(1-q*q)});}}}
  drawParts(glow){const ctx=this.ctx,z=this.z();ctx.save();if(glow)ctx.globalCompositeOperation='lighter';
    for(const p of this.parts){if(!this.fxVisible(p.x,p.y)||!!p.glow!==glow)continue;const q=this.toScreen(p.x,p.y,p.z);const a=Math.max(0,Math.min(1,p.life/p.max*1.4));ctx.globalAlpha=p.glow?a:a*.55;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.6,p.size*z*(p.glow?1:.5+.35*(1-a))),0,7);ctx.fill();}ctx.restore();}
  // La nuit : un voile, percé autour des villes (et des incendies).
  drawNight(){const L=this.world.light();if(L>=.999)return;const ctx=this.ctx,z=this.z();if(!this.nightCv)this.nightCv=document.createElement('canvas');const n=this.nightCv;if(n.width!==this.canvas.width||n.height!==this.canvas.height){n.width=this.canvas.width;n.height=this.canvas.height;}
    const x=n.getContext('2d');x.globalCompositeOperation='source-over';x.clearRect(0,0,n.width,n.height);x.fillStyle=`rgba(8,14,40,${(1-L)*.6})`;x.fillRect(0,0,n.width,n.height);x.globalCompositeOperation='destination-out';
    const light=(wx,wy,r,a=.85)=>{const q=this.toScreen(wx,wy);const R=r*TW*z*.7;if(q.x<-R||q.y<-R||q.x>n.width+R||q.y>n.height+R)return;const g=x.createRadialGradient(q.x,q.y,R*.1,q.x,q.y,R);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.ellipse(q.x,q.y,R,R*.6,0,0,7);x.fill();};
    for(const b of this.world.s.buildings){if(!b.done&&!(b.fire>0))continue;const [w,h]=this.world.sizeOf(b);if(this.fxVisible(b.i+w/2,b.j+h/2,b.f))light(b.i+w/2,b.j+h/2,b.fire>0?5:b.k==='centre'?6:2.5);}
    // les lanternes des rondes bèè : celles qu'on voit (dans notre champ, ou repérées de loin grâce à leur lumière)
    const Wl=this.world,lamps=Wl.s.units.filter(u=>u.lamp&&u.hp>0&&(this.fxVisible(u.x,u.y,'beee')||Wl.spotted(u,'meumeu')));for(const u of lamps)light(u.x,u.y,3.4,.8);
    const now=performance.now();this.flashes=(this.flashes||[]).filter(f=>now-f.t0<f.life*1000);for(const f of this.flashes){const k=1-(now-f.t0)/(f.life*1000);if(this.fxVisible(f.x,f.y))light(f.x,f.y,f.r*(.7+.3*k),.98*k);}
    ctx.drawImage(n,0,0);
    if(L<.7&&lamps.length){ctx.save();ctx.globalCompositeOperation='lighter';for(const u of lamps){const q=this.toScreen(u.x,u.y,.35);const R=2.2*TW*z*.55;if(q.x<-R||q.y<-R||q.x>n.width+R||q.y>n.height+R)continue;
      const fl=.85+.15*Math.sin(now/90+u.id);const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,R);g.addColorStop(0,`rgba(255,190,110,${.42*fl*(1-L)})`);g.addColorStop(.25,`rgba(255,160,80,${.16*fl*(1-L)})`);g.addColorStop(1,'rgba(255,150,70,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,R,R*.6,0,0,7);ctx.fill();}ctx.restore();}
    // la lueur : chaude, additive, qui éclaire le sol et les soldats autour du coup de feu ou de l'explosion
    if(L<.7&&this.flashes.length){ctx.save();ctx.globalCompositeOperation='lighter';for(const f of this.flashes){const k=1-(now-f.t0)/(f.life*1000);const q=this.toScreen(f.x,f.y,.3);const R=f.r*TW*z*.55;if(q.x<-R||q.y<-R||q.x>n.width+R||q.y>n.height+R)continue;
      const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,R);g.addColorStop(0,`rgba(${f.col},${(f.r>3?.5:.28)*k*(1-L)})`);g.addColorStop(1,`rgba(${f.col},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y,R,R*.6,0,0,7);ctx.fill();}ctx.restore();}}
  drawGhost(){const k=this.placing;const B=BUILDINGS[k];const [w,h]=k==='enclos'?(this.world.penSize||B.size):B.size;const c=this.hover.cell;if(!c)return;const i=c[0]-Math.floor((w-1)/2),j=c[1]-Math.floor((h-1)/2);this.ghost=[i,j];
    const r=this.world.canPlace('meumeu',k,i,j);const ctx=this.ctx,z=this.z();const a=this.toScreen(i,j),b=this.toScreen(i+w,j),cc=this.toScreen(i+w,j+h),d=this.toScreen(i,j+h);
    ctx.fillStyle=r.ok?'rgba(84,170,161,.35)':'rgba(189,75,61,.35)';ctx.strokeStyle=r.ok?'#54aaa1':'#bd4b3d';ctx.lineWidth=2*this.dpr;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();ctx.stroke();
    const im=this.sprite(k,3,'meumeu');const pw=(k==='enclos'?3:(w+h)/2)*TW*z*1.05;if(im){ctx.save();ctx.globalAlpha=.5;const anchor=k==='enclos'?this.toScreen(i+Math.min(w,3),j+Math.min(h,3)):cc;ctx.drawImage(im,anchor.x-pw/2,anchor.y-pw*.95,pw,pw);ctx.restore();}
    // le rayon où il puise
    const ctr=this.toScreen(i+w/2,j+h/2);ctx.save();ctx.strokeStyle='rgba(255,241,201,.25)';ctx.setLineDash([6*z,6*z]);ctx.beginPath();ctx.ellipse(ctr.x,ctr.y,14*TW/2*z*1.41,14*TH/2*z*1.41,0,0,7);ctx.stroke();ctx.restore();
    const Y=B.soil?this.world.cropYield(null,i,j,k):null;const nodep=(B.makes||B.factory)&&!this.world.depots('meumeu',i+w/2,j+h/2,RADIUS).length;const soil=(Y!=null?` · rendement ${Math.round(Y*100)} % (${Y>=1.15?'bonne terre':Y>=.8?'terre moyenne':'terre maigre'})`:'')+(nodep?` · aucun dépôt à ${RADIUS} cases : rien ne sortira`:'');
    this.tag(r.ok?`${B.name} : cliquez pour poser${soil}`:r.why[0],cc.x,cc.y+14*z,r.ok?(Y!=null&&Y<.7?'bad':'ok'):'bad');}
  drawLinePlan(){const L=this.lining;const ctx=this.ctx,z=this.z();
    if(L.kind==='gomme'){const W=this.world,N=W.N;let n=0;for(const [i,j] of L.cells){const k=j*N+i;const hit=(W.s.rails[k]&&!W.s.rails[k].b)||(W.s.walls[k]&&!W.s.walls[k].b&&W.s.walls[k].f==='meumeu')||(W.s.trenches[k]&&!W.s.trenches[k].b&&W.s.trenches[k].f==='meumeu');if(hit)n++;
        const a=this.toScreen(i,j),b=this.toScreen(i+1,j),c=this.toScreen(i+1,j+1),d=this.toScreen(i,j+1);ctx.fillStyle=hit?'rgba(189,75,61,.6)':'rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();}
      const last=L.cells[L.cells.length-1];const q=this.toScreen(last[0]+.5,last[1]+.5);this.tag(n?'Annuler les tracés prévus touchés':'Passez sur un tracé prévu (pointillés dorés)',q.x,q.y-20*z,n?'bad':'ink');return;}
    const ks=new Set(this.world.canLine('meumeu',L.kind,L.cells).map(String));
    for(const [i,j] of L.cells){const ok=ks.has(String(j*this.world.N+i));const a=this.toScreen(i,j),b=this.toScreen(i+1,j),c=this.toScreen(i+1,j+1),d=this.toScreen(i,j+1);ctx.fillStyle=ok?'rgba(232,191,98,.45)':'rgba(189,75,61,.35)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();}
    const last=L.cells[L.cells.length-1];const q=this.toScreen(last[0]+.5,last[1]+.5);const n=ks.size;const C=LINES[L.kind].cost;this.tag(`${LINES[L.kind].name} : ${n} cases · ${Object.entries(C).map(([r,v])=>v*n+' '+RES[r].name.toLowerCase()).join(', ')}`,q.x,q.y-20*z,'ok');}
  text(t,x,y,color='#fff8e6',size=11){const ctx=this.ctx;ctx.save();ctx.font=`800 ${size*this.dpr*Math.max(.8,Math.min(1.3,this.zoom))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.lineWidth=3.5*this.dpr;ctx.strokeStyle='#173d44';ctx.strokeText(t,x,y);ctx.fillStyle=color;ctx.fillText(t,x,y);ctx.restore();}
  tag(t,x,y,tone='ink',left=false){const ctx=this.ctx;ctx.save();ctx.font=`700 ${11.5*this.dpr}px system-ui,sans-serif`;const w=ctx.measureText(t).width+14*this.dpr,h=20*this.dpr;const x0=left?x:x-w/2;
    ctx.fillStyle={bad:'#bd4b3dee',ok:'#227b7bee',warn:'#c86a1fee',ink:'#173d44e6'}[tone]||'#173d44e6';ctx.beginPath();ctx.roundRect(x0,y-h/2,w,h,6*this.dpr);ctx.fill();ctx.fillStyle='#fff8e6';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(t,x0+7*this.dpr,y+.5);ctx.restore();}
  bar(x,y,w,f,color='#ee7d26'){const ctx=this.ctx,d=this.dpr;ctx.fillStyle='#173d44cc';ctx.fillRect(x-w/2,y,w,5*d);ctx.fillStyle=color;ctx.fillRect(x-w/2+1*d,y+1*d,(w-2*d)*Math.max(0,Math.min(1,f)),3*d);}

  // ---------- la minicarte ----------
  drawMini(mc){const x=mc.getContext('2d');const W=this.world,N=W.N;if(!this.overview)return;const w=mc.width,h=mc.height;x.setTransform(1,0,0,1,0,0);x.fillStyle='#1c1d14';x.fillRect(0,0,w,h);
    x.drawImage(this.overview,0,0,w,h);const P=(i,j)=>[(i-j+N)/(2*N)*w,(i+j)/(2*N)*h];
    const fog=W.s.fog!==false&&this.explored;for(const b of W.s.buildings){if(fog&&b.f==='beee'&&!W.s.intel?.[b.id])continue;const shown=fog&&b.f==='beee'&&!this.fxVisible(b.i+1,b.j+1,b.f)?W.s.intel?.[b.id]?.snapshot||b:b;const [px,py]=P(shown.i+1,shown.j+1);x.fillStyle=b.f==='beee'?(shown.ruin?'#6a3a30':'#e0503a'):(b.ruin?'#555':'#ffd36a');x.fillRect(px-2,py-1.5,b.k==='centre'?5:3,b.k==='centre'?4:3);}
    for(const n of W.s.nodes){if(n.type!=='ore'||n.left<=0)continue;const [px,py]=P(n.i+.5,n.j+.5);x.fillStyle='#000a';x.fillRect(px-2.5,py-2.5,5,5);x.fillStyle=ORE_COL[n.res]||'#ffd36a';x.fillRect(px-1.8,py-1.8,3.6,3.6);}
    for(const [k,r] of Object.entries(W.s.rails)){if(!r.b||fog&&r.f==='beee'&&!this.fxVisible(+k%N,(+k/N)|0,r.f))continue;const [px,py]=P(+k%N,(+k/N)|0);x.fillStyle='#cfd3d6';x.fillRect(px,py,1,1);}
    for(const u of W.s.units){if(fog&&u.f==='beee'&&!W.spotted(u,'meumeu',.5))continue;const [px,py]=P(u.x,u.y);x.fillStyle=u.f==='beee'?'#ff3b2f':u.k==='villageois'?'#fff':'#7fd3f0';x.fillRect(px-1,py-1,2,2);}
    for(const v of W.s.vehicles){if(fog&&v.f!=='meumeu'&&!this.fxVisible(v.x,v.y,v.f))continue;const [px,py]=P(v.x,v.y);x.fillStyle=v.f==='beee'?'#ff3b2f':'#9fe8ff';x.beginPath();x.arc(px,py,2.5,0,7);x.fill();}
    // le champ de vision
    const cw=this.canvas.width,ch=this.canvas.height;const cs=[this.toWorld(0,0),this.toWorld(cw,0),this.toWorld(cw,ch),this.toWorld(0,ch)].map(p=>P(p.x,p.y));x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();cs.forEach(([a,b],n)=>n?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.stroke();
    this.miniP=(mx,my)=>{const a=mx/w*2*N-N,b=my/h*2*N;return {x:(a+b)/2,y:(b-a)/2};};}

  // ---------- la souris ----------
  pos(e){const r=this.canvas.getBoundingClientRect();return [(e.clientX-r.left)*this.dpr,(e.clientY-r.top)*this.dpr];}
  unitAt(sx,sy){const W=this.world,z=this.z();let best=null,bd=1e9;for(const u of W.s.units){if(u.f!=='meumeu'&&W.s.fog!==false&&!W.spotted(u,'meumeu'))continue;const q=this.toScreen(u.x,u.y);const dx=sx-q.x,dy=sy-(q.y-14*z);if(Math.abs(dx)<13*z&&dy>-20*z&&dy<18*z){const d=Math.hypot(dx,dy);if(d<bd){bd=d;best=u;}}}return best;}
  vehicleAt(sx,sy){const W=this.world,z=this.z();for(const v of W.s.vehicles){if(v.f!=='meumeu'&&!this.fxVisible(v.x,v.y,v.f))continue;const q=this.toScreen(v.x,v.y,v.alt||0);if(Math.hypot(sx-q.x,sy-(q.y-15*z))<28*z)return v;}return null;}
  bind(){const cv=this.canvas;cv.addEventListener('contextmenu',e=>e.preventDefault());
    cv.addEventListener('pointerdown',e=>{const [sx,sy]=this.pos(e);cv.setPointerCapture(e.pointerId);this.drag={btn:e.button,x0:sx,y0:sy,px:e.clientX,py:e.clientY,moved:false,shift:e.shiftKey};
      if(this.lining&&e.button===0){const w=this.toWorld(sx,sy);this.lining.a=[Math.floor(w.x),Math.floor(w.y)];this.lining.cells=[this.lining.a];}});
    cv.addEventListener('pointermove',e=>{const [sx,sy]=this.pos(e);const w=this.toWorld(sx,sy);const cell=[Math.floor(w.x),Math.floor(w.y)];
      if(this.drag){const D=this.drag;if(Math.hypot(sx-D.x0,sy-D.y0)>6*this.dpr)D.moved=true;
        // V12.4 : en 3D, le bouton du milieu ORIENTE la caméra (gauche-droite : tourner ; haut-bas : incliner) ; Maj + milieu (et en 2D, le milieu) : déplacer
        if(D.moved&&D.btn===1&&this.o3&&!e.shiftKey){D.piv??=[sx,sy,this.toWorld(D.x0,D.y0)];this.yaw=((this.yaw||0)+(e.clientX-D.px)*.006)%(Math.PI*2);this.elev=Math.max(.12,Math.min(1.45,(this.elev??ELEV0)+(e.clientY-D.py)*.004));
          // (on tourne autour du point saisi : il reste sous la souris de départ)
          {const P=D.piv[2],w=this.toWorld(D.x0,D.y0);this.cx+=P.x-w.x;this.cy+=P.y-w.y;}}
        else if(D.moved&&D.btn===1){const w0=this.toWorld(sx-(e.clientX-D.px)*this.dpr,sy-(e.clientY-D.py)*this.dpr),w1=this.toWorld(sx,sy);this.cx+=w0.x-w1.x;this.cy+=w0.y-w1.y;}
        else if(this.lining?.a&&D.btn===0)this.lining.cells=this.lining.kind==='rail'?this.world.railRoute(this.lining.a[0],this.lining.a[1],cell[0],cell[1]):this.world.lineCells(this.lining.a[0],this.lining.a[1],cell[0],cell[1]);
        else if(D.moved&&D.btn===0&&!this.placing&&!this.lining)D.box={x0:D.x0,y0:D.y0,x1:sx,y1:sy};
        D.px=e.clientX;D.py=e.clientY;}
      this.hover={cell,sx,sy,w};const u=this.unitAt(sx,sy);let label=null,tone='ink';
      if(this.placing||this.lining||this.zoning)label=null;
      else if(u&&this.ui.unitLabel){label=this.ui.unitLabel(u);tone=u.f==='beee'?'bad':u.h?.state==='hors'?'warn':'ink';}
      else if(this.sel.size&&!u){const t=this.world.targetAt(w.x,w.y);label=this.ui.describe(t);tone=t?.type==='unit'||(t?.type==='building'&&this.world.building(t.id)?.f==='beee')?'bad':'ink';}
      else if(this.selV&&this.ui.vehicleHint)label=this.ui.vehicleHint(w);
      const t=this.world.targetAt(w.x,w.y);if(t?.type==='building')this.hover.b=t.id;this.hover.label=label;this.hover.tone=tone;
      cv.style.cursor=this.placing||this.lining||this.zoning?'crosshair':u?'pointer':this.sel.size?'crosshair':'default';});
    cv.addEventListener('pointerleave',()=>{this.hover=null;});
    cv.addEventListener('pointerup',e=>{const D=this.drag;this.drag=null;if(!D)return;const [sx,sy]=this.pos(e);const w=this.toWorld(sx,sy);
      if(!D.moved&&this.ui.pickOperation?.(w,e.button))return;
      if(this.lining){if(e.button===2){this.lining=null;this.ui.changed();return;}if(this.lining.cells?.length){this.ui.planLine(this.lining.kind,this.lining.cells);this.lining.cells=null;this.lining.a=null;if(!e.shiftKey){this.lining=null;}}this.ui.changed();return;}
      if(D.btn===1)return;
      if(D.box){const {x0,y0,x1,y1}=D.box;const [a,b]=[Math.min(x0,x1),Math.max(x0,x1)],[c,d]=[Math.min(y0,y1),Math.max(y0,y1)];if(!D.shift){this.sel.clear();this.selVs.clear();}this.selB=null;this.selV=null;
        // (les engins de combat aussi : une colonne de blindés se choisit d'un cadre)
        for(const v of this.world.s.vehicles){if(v.f!=='meumeu'||!VEHDEF[v.k]||v.hp<=0)continue;const q=this.toScreen(v.x,v.y);if(q.x>=a&&q.x<=b&&q.y-10*this.dpr>=c&&q.y-10*this.dpr<=d)this.selVs.add(v.id);}
        const inBox=this.world.s.units.filter(u=>u.f==='meumeu').filter(u=>{const q=this.toScreen(u.x,u.y);return q.x>=a&&q.x<=b&&q.y-10*this.dpr>=c&&q.y-10*this.dpr<=d;});
        const mil=inBox.filter(u=>u.k!=='villageois');for(const u of (mil.length&&!D.shift?mil:inBox))this.sel.add(u.id);this.ui.changed();return;}
      if(D.moved&&D.btn!==2)return;
      if(this.zoning){this.ui.zoneAt?.(w,e.shiftKey);if(!e.shiftKey)this.zoning=false;this.ui.changed();return;}
      if(this.placing){if(e.button===2){this.placing=null;this.ui.changed();return;}const r=this.ui.place(this.placing,this.ghost[0],this.ghost[1]);if(r.ok&&!e.shiftKey)this.placing=null;return;}
      if(e.button===0){const u=this.unitAt(sx,sy);const v=u?null:this.vehicleAt(sx,sy);
        if(this.ui.pickStop&&!u){const t=this.world.targetAt(w.x,w.y);if(t?.type==='building'){this.ui.pickStop(t.id);return;}}
        if(u&&u.f==='meumeu'){const grp=u.sq&&!e.altKey?this.world.members(this.world.squad(u.sq)||{m:[]}).map(m=>m.id):[u.id];if(D.shift){for(const id of grp)this.sel.has(u.id)?this.sel.delete(id):this.sel.add(id);}else{this.sel.clear();for(const id of grp)this.sel.add(id);
            this.selVs.clear();if(e.detail>=2){for(const o of this.world.s.units)if(o.f==='meumeu'&&o.k===u.k){const q=this.toScreen(o.x,o.y);if(q.x>0&&q.y>0&&q.x<this.canvas.width&&q.y<this.canvas.height)this.sel.add(o.id);}}}
          this.selB=null;this.selV=null;this.ui.changed();return;}
        if(u&&u.f!=='meumeu'&&this.ui.unitInfo){this.ui.unitInfo(u);return;}
        if(v&&D.shift&&VEHDEF[v.k]&&v.f==='meumeu'){if(this.selV!=null&&this.selV!==v.id&&VEHDEF[this.world.s.vehicles.find(o=>o.id===this.selV)?.k])this.selVs.add(this.selV);this.selV=null;this.selB=null;this.selVs.has(v.id)?this.selVs.delete(v.id):this.selVs.add(v.id);this.ui.changed();return;}
        if(v){this.sel.clear();this.selVs.clear();this.selB=null;this.selV=v.id;this.ui.changed();return;}
        const t=this.world.targetAt(w.x,w.y);this.sel.clear();this.selVs.clear();this.selV=null;this.selB=t?.type==='building'?t.id:null;this.ui.inspect(t);this.ui.changed();return;}
      if(e.button===2){if(this.selV){this.ui.vehicleOrder(w);return;}if(this.selVs.size)this.ui.groupVehicleOrder([...this.selVs],w);if(this.selB&&!this.sel.size&&!this.selVs.size){this.ui.rally(w);return;}if(!this.sel.size)return;const t=this.world.targetAt(w.x,w.y);if(t&&e.shiftKey)t.queue=true;const r=this.ui.order([...this.sel],t);this.marks.push({x:w.x,y:w.y,age:0,bad:!r.ok});}});
    cv.addEventListener('wheel',e=>{e.preventDefault();const [sx,sy]=this.pos(e);const before=this.toWorld(sx,sy);this.zoom=Math.max(.18,Math.min(6,this.zoom*(e.deltaY<0?1.15:1/1.15)));const after=this.toWorld(sx,sy);this.cx+=before.x-after.x;this.cy+=before.y-after.y;},{passive:false});}
  // La géométrie des voies : les cases de rail deviennent des chaînes (d'un aiguillage à l'autre), lissées (Chaikin) pour que
  // l'escalier des cases devienne une courbe ; traverses tous les 0,2 case. Recalculée quand une voie change.
  railGeom(){const W=this.world,N=W.N;const ks=Object.keys(W.s.rails);let sig=ks.length;for(const k of ks)sig=(sig*31+(+k)*3+(W.rail[+k]||0))|0;
    if(this._rg?.sig===sig)return this._rg;
    const cells=new Map();for(const k of ks){const r=W.rail[+k];if(r)cells.set(+k,r);}
    const nb=k=>{const i=k%N,j=(k/N)|0;const out=[];for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const kk=(j+dj)*N+i+di;if(cells.has(kk))out.push(kk);}
      for(const [di,dj] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const kk=(j+dj)*N+i+di;if(cells.has(kk)&&!cells.has(j*N+i+di)&&!cells.has((j+dj)*N+i))out.push(kk);}return out;};
    const adj=new Map();for(const k of cells.keys())adj.set(k,nb(k));
    const seen=new Set(),ek=(a,b)=>a<b?a+','+b:b+','+a,chains=[];
    const walk=(a,b)=>{const pts=[a,b];seen.add(ek(a,b));let prev=a,cur=b;while(adj.get(cur).length===2){const nx=adj.get(cur).find(x=>x!==prev);if(nx==null||seen.has(ek(cur,nx)))break;seen.add(ek(cur,nx));pts.push(nx);prev=cur;cur=nx;}return pts;};
    for(const [k,L] of adj)if(L.length!==2)for(const n of L)if(!seen.has(ek(k,n)))chains.push(walk(k,n));
    for(const [k,L] of adj)for(const n of L)if(!seen.has(ek(k,n)))chains.push(walk(k,n));
    const junctions=[...adj].filter(([,L])=>L.length>=3).map(([k])=>[k%N+.5,((k/N)|0)+.5]);const lone=[...adj].filter(([,L])=>!L.length).map(([k])=>({x:k%N+.5,y:((k/N)|0)+.5,st:cells.get(k)}));
    // chaque chaîne est coupée en tronçons de même état (bâti, prévu) ; l'escalier des cases est redressé (Douglas-Peucker :
    // on garde les vrais virages), puis les coins arrondis (Chaikin)
    const dp=(P,tol)=>{if(P.length<3)return P;const a=P[0],b=P[P.length-1];let best=-1,bd=0;const L=Math.hypot(b.x-a.x,b.y-a.y)||1e-6;
      for(let n=1;n<P.length-1;n++){const d=Math.abs((b.x-a.x)*(a.y-P[n].y)-(a.x-P[n].x)*(b.y-a.y))/L;if(d>bd){bd=d;best=n;}}
      if(bd<=tol)return [a,b];return [...dp(P.slice(0,best+1),tol).slice(0,-1),...dp(P.slice(best),tol)];};
    // les virages à angle droit deviennent une pièce courbe : un quart de cercle de rayon une demi-case, tangent aux deux droites
    const turns=P=>{if(P.length<3)return P;const Q=[P[0]];for(let n=1;n<P.length-1;n++){const a=P[n-1],b=P[n],c=P[n+1];const d1x=Math.sign(b.x-a.x),d1y=Math.sign(b.y-a.y),d2x=Math.sign(c.x-b.x),d2y=Math.sign(c.y-b.y);
        if(Math.abs(d1x)+Math.abs(d1y)===1&&Math.abs(d2x)+Math.abs(d2y)===1&&(d1x!==d2x||d1y!==d2y)){const sx=b.x-d1x*.5,sy=b.y-d1y*.5,cx=sx+d2x*.5,cy=sy+d2y*.5;const a0=Math.atan2(sy-cy,sx-cx),a1=Math.atan2(b.y+d2y*.5-cy,b.x+d2x*.5-cx);let da=a1-a0;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
          for(let q=0;q<=8;q++){const t=a0+da*q/8;Q.push({x:cx+Math.cos(t)*.5,y:cy+Math.sin(t)*.5});}}else Q.push(b);}Q.push(P[P.length-1]);return Q;};
    const chaikin=P=>{if(P.length<3)return P;const Q=[P[0]];for(let n=0;n<P.length-1;n++){const a=P[n],b=P[n+1];const L=Math.hypot(b.x-a.x,b.y-a.y);const f=Math.min(.25,.45/Math.max(.01,L));
        if(n>0)Q.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});if(n<P.length-2)Q.push({x:b.x-(b.x-a.x)*f,y:b.y-(b.y-a.y)*f});}Q.push(P[P.length-1]);return Q;};
    const out=[];for(const ch of chains){const C=ch.map(k=>({x:k%N+.5,y:((k/N)|0)+.5,k}));
      const runs=[];let cur=null;for(let n=0;n<C.length-1;n++){const st=cells.get(C[n].k)===2&&cells.get(C[n+1].k)===2?2:1;if(!cur||cur.st!==st){cur={st,P:[C[n]]};runs.push(cur);}cur.P.push(C[n+1]);}
      for(const r of runs){let P=turns(r.P);const st=P.slice(1).map(()=>r.st);
        const ties=[];let acc=0,next=.1;for(let n=0;n<P.length-1;n++){const a=P[n],b=P[n+1];const L=Math.hypot(b.x-a.x,b.y-a.y)||1e-6;while(next<=acc+L){const t=(next-acc)/L;ties.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,px:-(b.y-a.y)/L,py:(b.x-a.x)/L,st:r.st,h:(ties.length*7919)%3});next+=.21;}acc+=L;}
        let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of P){x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);}
        out.push({P,st,ties,box:[x0,y0,x1,y1]});}}
    return this._rg={sig,chains:out,junctions,lone};}
  drawRails(i0,i1,j0,j1){const G=this.railGeom();const ctx=this.ctx,z=this.z(),W=this.world,N=W.N;const vis=c=>c.box[2]>=i0-1&&c.box[0]<=i1+1&&c.box[3]>=j0-1&&c.box[1]<=j1+1;
    const CH=G.chains.filter(vis);const S=(x,y)=>this.toScreen(x,y);
    const path=(c,off,want)=>{ctx.beginPath();let on=false;for(let n=0;n<c.P.length-1;n++){if(want&&c.st[n]!==want){on=false;continue;}const a=c.P[n],b=c.P[n+1];const L=Math.hypot(b.x-a.x,b.y-a.y)||1;const ox=-(b.y-a.y)/L*off,oy=(b.x-a.x)/L*off;
        const pa=S(a.x+ox,a.y+oy),pb=S(b.x+ox,b.y+oy);if(!on){ctx.moveTo(pa.x,pa.y);on=true;}ctx.lineTo(pb.x,pb.y);}};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    // le ballast : un remblai sombre, un lit de gravier, des bords clairs
    for(const [w,col] of [[27,'rgba(60,54,46,.55)'],[21,'#7d766a'],[15,'#9a9384']]){ctx.strokeStyle=col;ctx.lineWidth=w*z;for(const c of CH){path(c,0,2);ctx.stroke();}}
    for(const [x,y] of G.junctions){const q=S(x,y);ctx.fillStyle='#8d8678';ctx.beginPath();ctx.ellipse(q.x,q.y,24*z,12*z,0,0,7);ctx.fill();}
    // les traverses : du bois goudronné, un peu de variété
    const TC=['#4a3321','#5a3e27','#3f2b1b'];for(const c of CH)for(const t of c.ties){const a=S(t.x+t.px*.33,t.y+t.py*.33),b=S(t.x-t.px*.33,t.y-t.py*.33);
      if(t.st===2){ctx.strokeStyle=TC[t.h];ctx.lineWidth=5*z;ctx.lineCap='butt';}else{ctx.strokeStyle='rgba(232,191,98,.35)';ctx.lineWidth=2*z;}ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.lineCap='round';
    // les rails : l'ombre, l'acier, le reflet du champignon usé par les roues
    for(const off of [-.21,.21]){for(const [w,col,dy] of [[3.6,'rgba(20,18,16,.6)',1.4],[2.7,'#5d6368',0],[1.3,'#d9dde0',-.5]]){ctx.strokeStyle=col;ctx.lineWidth=w*z;ctx.save();ctx.translate(0,dy*z);for(const c of CH){path(c,off,2);ctx.stroke();}ctx.restore();}}
    // la voie prévue : un tracé doré, en pointillés
    ctx.setLineDash([5*z,4*z]);ctx.strokeStyle='rgba(232,191,98,.85)';ctx.lineWidth=1.6*z;for(const off of [-.21,.21])for(const c of CH){path(c,off,1);ctx.stroke();}ctx.setLineDash([]);
    for(const o of G.lone){const q=S(o.x,o.y);ctx.fillStyle=o.st===2?'#9aa0a6':'#e8bf62';ctx.beginPath();ctx.arc(q.x,q.y,3*z,0,7);ctx.fill();}
    ctx.restore();
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;if(W.rail[k]===1&&W.s.rails[k]?.broken){const c=S(i+.5,j+.5);ctx.fillStyle='rgba(189,75,61,.85)';ctx.beginPath();ctx.arc(c.x,c.y,4.5*z,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(c.x-2.5*z,c.y-2.5*z);ctx.lineTo(c.x+2.5*z,c.y+2.5*z);ctx.moveTo(c.x+2.5*z,c.y-2.5*z);ctx.lineTo(c.x-2.5*z,c.y+2.5*z);ctx.stroke();}}}
  // un cercle au sol (r en cases)
  ring(x,y,r,stroke,fill=null,dash=null,w=1.5){const ctx=this.ctx,z=this.zoom,q=this.toScreen(x,y);ctx.save();if(dash)ctx.setLineDash(dash.map(v=>v*z));ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(1,r*TW/2*z*1.41),Math.max(.5,r*TH/2*z*1.41),0,0,7);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w*this.dpr;ctx.stroke();}ctx.restore();}
  // le tir sur zone : l'onde de choc des explosions ; les zones visées par les pièces choisies ; l'aperçu sous la souris (touche X)
  drawZones(dt){const W=this.world,ctx=this.ctx;const TM=4;
    this.rings=this.rings.filter(r=>(r.age+=dt)<.5);for(const r of this.rings){const k=r.age/.5;this.ring(r.x,r.y,r.r*(.2+k*.8),`rgba(255,240,210,${.7*(1-k)})`,null,null,2.5*(1-k)+.5);}
    // V12.4 : l'onde de choc (anneau clair et vif, l'air comprimé qui file) et la jupe de poussière (brune, plus lente, qui s'étale et retombe)
    this.waves=this.waves.filter(w=>(w.age+=dt)<w.life);for(const w of this.waves){if(w.age<0)continue;const k=w.age/w.life,e=1-Math.pow(1-k,2.2);
      if(w.dust)this.ring(w.x,w.y,w.r*(.35+.65*e),null,`rgba(120,100,76,${.38*(1-k)})`);
      else{this.ring(w.x,w.y,w.r*e,`rgba(255,248,230,${.85*(1-k)})`,`rgba(255,230,190,${.10*(1-k)})`,null,4*(1-k)+.8);this.ring(w.x,w.y,w.r*e*.93,`rgba(160,190,255,${.35*(1-k)})`,null,null,1.5);}}
    const zone=(x,y,he,lab,col)=>{if(he){this.ring(x,y,he.danger/TM,'rgba(255,170,60,.85)','rgba(255,170,60,.07)',[5,4]);this.ring(x,y,he.lethal/TM,'rgba(235,70,50,.95)','rgba(235,70,50,.14)');if(he.conc>he.lethal*.6)this.ring(x,y,he.conc/TM,'rgba(190,200,255,.7)',null,[2,3]);}
      const q=this.toScreen(x,y);const z=this.zoom;ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1.5*this.dpr;ctx.beginPath();ctx.moveTo(q.x-9*z,q.y);ctx.lineTo(q.x+9*z,q.y);ctx.moveTo(q.x,q.y-5*z);ctx.lineTo(q.x,q.y+5*z);ctx.stroke();ctx.restore();if(lab)this.tag(lab,q.x+10*this.dpr,q.y-14*this.dpr,'ink');};
    const guns=[...this.sel].map(id=>W.unit(id)).filter(u=>u&&u.w&&W.canZone(W.W(u.w)));
    const done=new Set();for(const u of guns){const T=u.task?.kind==='zone'?u.task:null;if(!T)continue;const g=this.toScreen(u.x,u.y),t=this.toScreen(T.x,T.y);ctx.save();ctx.strokeStyle='rgba(255,211,106,.35)';ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.restore();
      const key=Math.round(T.x*4)+','+Math.round(T.y*4);if(done.has(key))continue;done.add(key);zone(T.x,T.y,W.W(u.w).he,`${T.n<1e9?`${T.fired}/${T.n} coups`:`${T.fired} coups`} · ${T.obs!=null?'réglé par un observateur':'sans observateur'}`,'#ffd36a');}
    if(this.zoning&&this.hover?.w){const p=this.hover.w;if(!guns.length){this.tag('Tir sur zone : choisissez d’abord une pièce à obus',this.hover.sx+14*this.dpr,this.hover.sy+22*this.dpr,'bad',true);return;}
      let inR=0;for(const u of guns){const Wd=W.W(u.w);const R=Math.hypot(p.x-u.x,p.y-u.y)*TM;const A=W.arcOf(Wd);const ok=R<=A.max*.96&&R>=Math.max(6,A.min*.9);if(ok)inR++;const g=this.toScreen(u.x,u.y),t=this.toScreen(p.x,p.y);ctx.save();ctx.strokeStyle=ok?'rgba(255,211,106,.6)':'rgba(235,90,70,.6)';ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.restore();}
      const u=guns[0];const Wd=W.W(u.w);const R=Math.hypot(p.x-u.x,p.y-u.y)*TM;const A=W.arcOf(Wd);
      zone(p.x,p.y,Wd.he,`${Math.round(R)} m · ${inR}/${guns.length} à portée · ${W.observer('meumeu',p.x,p.y)?'observée':'sans observateur'}`,inR?'#ffd36a':'#eb5a46');}}
  pan(dx,dy){const w0=this.toWorld(this.canvas.width/2,this.canvas.height/2),w1=this.toWorld(this.canvas.width/2+dx,this.canvas.height/2+dy);this.cx+=w1.x-w0.x;this.cy+=w1.y-w0.y;{const N=this.world.N,m=Math.min(12,N/4);this.cx=Math.max(m,Math.min(N-m,this.cx));this.cy=Math.max(m,Math.min(N-m,this.cy));}const N=this.world.N;this.cx=Math.max(0,Math.min(N,this.cx));this.cy=Math.max(0,Math.min(N,this.cy));}
}
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
