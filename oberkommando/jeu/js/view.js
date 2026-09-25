// La vue : la carte entière en isométrique, qu'on parcourt comme dans Age of Empires. Elle lit le monde, ne le modifie jamais ;
// les clics deviennent des demandes à l'interface. Deux niveaux de détail pour le sol : de près, une texture par case ;
// de loin, une image de toute la carte, calculée une fois (c'est aussi la minicarte).
import {MAP_N,TERRAIN,T,BUILDINGS,UNITS,VEHICLES,BEEE,RES,OUTCROP,NODES,LINES,DAY} from './data.js';
import {building,vehicle,resource,terrain,prop,sheet,drawFrame,fx,img} from './sprites.js';
import {BLOOD,BODY_H} from './body.js';
import {bleedRate,triage} from './health.js';

export const TW=64,TH=32;
// assombrir ou éclaircir une couleur #rrggbb
function shade(hex,f){const n=parseInt(hex.slice(1),16);const c=v=>Math.max(0,Math.min(255,Math.round(v*f)));return `rgb(${c(n>>16)},${c((n>>8)&255)},${c(n&255)})`;}
const TREES={[T.grass]:['tree_oak','tree_birch','tree_round','tree_maple'],[T.meadow]:['tree_fir','tree_pines','tree_birch-yellow','tree_oak'],[T.sand]:['tree_palm'],[T.dirt]:['tree_spruce','tree_fir'],[T.scrub]:['tree_dead','tree_cypress']};
const BEEE_SPRITE={centre:'beee-colonial-shelter',maison:'beee-colonial-shelter',camp:'beee-depot'};
// les caisses de munitions et les armes n'ont pas d'image dans le pack : on les dessine (une cartouche, un fusil)
export const AMMO_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="2" fill="#6b5a3a" stroke="#3b301d"/><rect x="3" y="9" width="18" height="3" fill="#8a7650"/><g fill="#d9a441" stroke="#7a5a1a" stroke-width=".6"><rect x="6" y="3" width="3" height="9" rx="1.2"/><rect x="10.5" y="3" width="3" height="9" rx="1.2"/><rect x="15" y="3" width="3" height="9" rx="1.2"/></g><g fill="#b87333"><path d="M6 4.2a1.5 1.5 0 0 1 3 0z"/><path d="M10.5 4.2a1.5 1.5 0 0 1 3 0z"/><path d="M15 4.2a1.5 1.5 0 0 1 3 0z"/></g></svg>');
export const ARM_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1.5 15 L7 13.9 L9 16.8 L6.2 20 L2 19.2 Z" fill="#b07a44" stroke="#3a2614" stroke-width=".8" stroke-linejoin="round"/><path d="M7 13.9 L14 12.4 L23 11.6 L23 13.2 L14.5 14.2 L12.8 17.2 L10.8 17.4 L11.2 15 L9 16.8 Z" fill="#a9b1b8" stroke="#2b3136" stroke-width=".8" stroke-linejoin="round"/><rect x="13.5" y="10.6" width="5" height="1.5" rx=".6" fill="#6d767e" stroke="#2b3136" stroke-width=".5"/></svg>');
const icon=k=>{if(k.startsWith('m:'))return img(AMMO_SVG,true);if(k.startsWith('a:'))return img(ARM_SVG,true);const [kind,name]=RES[k].icon;return kind==='p'?prop(name):resource(name);};
export {icon};

export class View{
  constructor(canvas,world,ui){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.world=world;this.ui=ui;this.cx=0;this.cy=0;this.zoom=.9;this.sx=0;this.sy=0;
    this.sel=new Set();this.selB=null;this.selV=null;this.placing=null;this.lining=null;this.hover=null;this.drag=null;this.parts=[];this.decals=[];this.marks=[];this.streaks=[];this.toppling=[];this.fx=[];this.frame=0;this.clock=0;this.shake=0;this.tiles=null;this.tinted=new Map();
    this.bind();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();}
  resize(){const d=devicePixelRatio||1;const r=this.canvas.parentElement.getBoundingClientRect();this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.dpr=d;}
  z(){return this.zoom*this.dpr;}
  toScreen(x,y,h=0){const z=this.z();return {x:this.canvas.width/2+((x-y)-(this.cx-this.cy))*TW/2*z+this.sx,y:this.canvas.height/2+((x+y)-(this.cx+this.cy))*TH/2*z-h*TH*z+this.sy};}
  toWorld(sx,sy){const z=this.z();const a=(sx-this.canvas.width/2)/(TW/2*z)+(this.cx-this.cy),b=(sy-this.canvas.height/2)/(TH/2*z)+(this.cx+this.cy);return {x:(a+b)/2,y:(b-a)/2};}
  lookAt(x,y){this.cx=x;this.cy=y;}

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
  makeOverview(){const W=this.world,N=W.N,G=W.G;const s=8;const c=document.createElement('canvas');c.width=N*s;c.height=N*s/2;const x=c.getContext('2d');
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const t=G.terrain[j*N+i];const [r,g,b]=TERRAIN[t].tint;const n=((i*7919+j*104729)%13)/13*.12+.94;x.fillStyle=`rgb(${r*n|0},${g*n|0},${b*n|0})`;
      const px=(i-j+N)*s/2,py=(i+j)*s/4;x.beginPath();x.moveTo(px,py);x.lineTo(px+s/2,py+s/4);x.lineTo(px,py+s/2);x.lineTo(px-s/2,py+s/4);x.closePath();x.fill();}
    this.overview=c;this.ovS=s;}

  // ---------- les événements : le monde annonce, on anime ----------
  // Les effets dessinés (flashes de bouche, étincelles, fumées, giclées de sang) : des images, placées, tournées, qui vivent
  // quelques dixièmes de seconde. add : en lumière (les flashes) ; rise : la fumée monte ; ground : à plat sur le sol.
  sfx(name,x,y,{z=0,size=30,life=.3,ang=0,add=false,rise=0,grow=1,alpha=1,vx=0,vy=0,ground=false}={}){if(this.near(x,y)<=0)return;this.fx.push({name,x,y,z,size,life,max:life,ang,add,rise,grow,alpha,vx,vy,ground});if(this.fx.length>600)this.fx.splice(0,this.fx.length-600);}
  screenAng(x0,y0,x1,y1){const a=this.toScreen(x0,y0),b=this.toScreen(x1,y1);return Math.atan2(b.y-a.y,b.x-a.x);}
  onEvent(e){const P=(x,y,o)=>this.puff(x,y,o);const R=Math.random;
    if(e.type==='shot'){const ang=e.x1!=null?this.screenAng(e.x,e.y,e.x1,e.y1):0;const k=Math.min(2.2,.7+Math.sqrt(e.E||36)/9);
      this.sfx(R()<.5?'muzzle_side':'muzzle_rifle'+(1+(R()*2|0)),e.x,e.y,{z:e.tower?1.2:.3,size:22*k,life:.07,ang,add:true});this.sfx('smoke_gun',e.x,e.y,{z:e.tower?1.2:.32,size:14*k,life:1.1,rise:.5,grow:2.2,alpha:.45,ang:R()*6});}
    else if(e.type==='wound'){const [dx,dy]=e.dir||[1,0];const ang=this.screenAng(e.x,e.y,e.x+dx,e.y+dy);const big=(e.out?.sev||1)>=4;
      this.sfx(['spray1','spray2','spray4','spray_mist'][R()*4|0],e.x,e.y,{z:.25,size:big?46:30,life:.45,ang,grow:1.6,alpha:.95});
      this.decals.push({kind:'bloodimg',img:['blood_burst1','blood_burst2','blood_burst5','blood_dir4','blood_dir6','blood_small'][big?(R()*5|0):5],x:e.x+dx/(Math.hypot(dx,dy)||1)*.3,y:e.y+dy/(Math.hypot(dx,dy)||1)*.3,r:big?.55:.32,age:0,rot:ang});}
    else if(e.type==='impact'&&['pierre','mur','maison','metal','rocher'].includes(e.mat))this.sfx('sparks'+(1+(R()*3|0)),e.x,e.y,{z:.1,size:18,life:.12,ang:R()*6,add:true});
    else if(e.type==='boom'){const big=e.kind==='bomb',shell=e.kind==='shell';const S=big?3:shell?1.8:1;
      this.sfx('muzzle_burst',e.x,e.y,{z:.3,size:70*S,life:.18,ang:R()*6,add:true,grow:1.4});this.sfx('sparks_big',e.x,e.y,{z:.3,size:60*S,life:.25,ang:R()*6,add:true});
      for(let n=0;n<(big?7:shell?4:2);n++)this.sfx(n%2?'smoke_cloud':'smoke_gray'+(R()<.5?1:4),e.x+(R()-.5)*.8*S,e.y+(R()-.5)*.8*S,{z:.2,size:(40+R()*30)*S,life:2.5+R()*3,rise:.4+R()*.5,grow:1.8,alpha:.8,ang:R()*6,vx:(R()-.5)*.3,vy:(R()-.5)*.3});}
    else if(e.type==='collapse'){for(let n=0;n<5;n++)this.sfx('smoke_dust',e.x+(R()-.5)*1.5,e.y+(R()-.5)*1.5,{z:.3,size:70+R()*40,life:4+R()*2,rise:.3,grow:1.7,alpha:.75,ang:R()*6});}
    else if(e.type==='plate')this.sfx('sparks'+(1+(R()*3|0)),e.x,e.y,{z:.25,size:20,life:.14,ang:R()*6,add:true});
    else if(e.type==='cannon')this.sfx('muzzle_burst',e.x,e.y,{z:.35,size:44,life:.12,ang:R()*6,add:true});
    else if(e.type==='death'||e.type==='down')this.decals.push({kind:'bloodimg',img:'blood_small',x:e.x,y:e.y,r:.35,age:0,rot:R()*6});

    if(e.type==='boom'){const big=e.kind==='bomb';P(e.x,e.y,{n:big?50:e.kind==='shell'?30:18,color:'#ffb347',size:big?9:6,spread:big?3.6:2.4,up:big?3.4:2.4,life:.7,grav:3,glow:true});
      P(e.x,e.y,{n:big?40:20,color:'rgba(60,52,44,.8)',size:big?22:14,spread:big?2.2:1.4,up:1.4,life:big?4:2.5});P(e.x,e.y,{n:big?24:10,color:'#5b4a36',size:4,spread:3,up:4.5,life:1.2,grav:9});
      if(big||e.kind==='shell')this.decals.push({kind:'crater',x:e.x,y:e.y,r:big?1.2:.7,age:0});this.shake=Math.max(this.shake,this.near(e.x,e.y)*(big?1.2:.5));}
    else if(e.type==='collapse'){const s=e.big?1.6:1;P(e.x,e.y,{n:40*s,color:'rgba(170,150,120,.75)',size:18*s,spread:2*s,up:1.2,life:4});P(e.x,e.y,{n:20*s,color:'#6b5a44',size:5,spread:2.5*s,up:4,life:1.4,grav:8});this.shake=Math.max(this.shake,this.near(e.x,e.y)*.9);}
    else if(e.type==='shot'){P(e.x,e.y,{n:2,color:'#ffe08a',size:3,spread:.2,up:.2,life:.1,z:e.tower?1.2:.3,glow:true});if(e.x1!=null&&this.near(e.x,e.y)>0)this.streaks.push({x0:e.x,y0:e.y,x1:e.x1,y1:e.y1,h0:e.tower?1.2:.3,age:0,life:e.tr?.3:.14,tr:e.tr,f:e.f});if(this.streaks.length>300)this.streaks.shift();}
    else if(e.type==='wound'&&this.near(e.x,e.y)>0){const [dx,dy]=e.dir||[0,0];const L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L;const big=(e.out?.sev||1)>=4;
      for(let n=0;n<(big?14:7);n++){const sp=.4+Math.random()*1.4;this.parts.push({x:e.x,y:e.y,z:.25,vx:ux*sp+(Math.random()-.5)*.6,vy:uy*sp+(Math.random()-.5)*.6,vz:.4+Math.random()*1.2,life:.5,max:.5,color:'#9b1111',size:1.6+Math.random()*1.6,grav:5,glow:false});}
      this.decals.push({kind:'blood',x:e.x+ux*(.25+Math.random()*.3),y:e.y+uy*(.25+Math.random()*.3),r:big?.28:.16,age:0,rot:Math.atan2(uy,ux),seed:Math.random()*1000});if(this.decals.length>700)this.decals.splice(0,this.decals.length-700);}
    else if(e.type==='pierce'){P(e.x,e.y,{n:4,color:'#b8ab94',size:2.5,spread:.5,up:1,life:.4,grav:5,z:.3});}
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
  near(x,y){const d=Math.hypot(x-this.cx,y-this.cy);return Math.max(0,1-d/(18/this.zoom));}
  puff(x,y,{n=6,color='#ccc',size=5,spread=.5,up=.6,life=.9,grav=0,z=0,glow=false}={}){if(this.near(x,y)<=0&&!glow)return;
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=Math.random()*spread;this.parts.push({x,y,z,vx:Math.cos(a)*r,vy:Math.sin(a)*r,vz:up*(.5+Math.random()),life:life*(.6+Math.random()*.6),max:life,color,size:size*(.6+Math.random()*.8),grav,glow});}
    if(this.parts.length>2500)this.parts.splice(0,this.parts.length-2500);}
  stepParts(dt){const W=this.world;for(const p of this.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.grav*dt;if(p.z<0){p.z=0;p.vz*=-.2;p.vx*=.5;p.vy*=.5;}if(!p.grav){p.vx*=1-dt*1.2;p.vy*=1-dt*1.2;}}
    this.parts=this.parts.filter(p=>p.life>0);
    // les incendies fument, les ruines fument encore
    for(const b of W.s.buildings){if(!(b.fire>0)&&!b.ruin)continue;const [w,h]=BUILDINGS[b.k].size;if(this.near(b.i+w/2,b.j+h/2)<=0)continue;const k=b.fire>0?1:.25;
      if(Math.random()<dt*25*k)this.puff(b.i+w*Math.random(),b.j+h*Math.random(),{n:1,color:Math.random()<.5?'#ff7a2a':'#ffc24a',size:6,spread:.3,up:1.8,life:.7,z:.3,glow:true});
      if(Math.random()<dt*12*k)this.puff(b.i+w/2,b.j+h/2,{n:1,color:'rgba(38,32,28,.6)',size:18,spread:.3,up:1.3,life:5,z:1.2});}
    // les trains fument
    for(const v of W.s.vehicles)if(v.k==='train'&&v.state==='go'&&Math.random()<dt*8)this.puff(v.x,v.y,{n:1,color:'rgba(220,220,220,.6)',size:10,spread:.1,up:1.4,life:2.2,z:1.4});
    // ceux qui saignent laissent une trace
    for(const u of W.s.units){if(!u.h||!u.h.bleeds.length||this.near(u.x,u.y)<=0)continue;const br=bleedRate(u.h);if(br>.03&&Math.random()<dt*Math.min(6,br*6)*(u.anim==='walk'?2:.5))this.decals.push({kind:'blood',x:u.x+(Math.random()-.5)*.15,y:u.y+(Math.random()-.5)*.15,r:.04+Math.random()*.05,age:0,rot:Math.random()*6,seed:Math.random()*1000});}
    // ceux qui travaillent : ce qu'ils font saute en l'air
    for(const u of W.s.units){if(u.anim!=='action'||Math.random()>dt*4||this.near(u.x,u.y)<=0)continue;const T0=u.task;if(T0?.kind==='gather'){const nd=W.s.nodes[T0.node];if(nd)this.puff(nd.i+.5,nd.j+.5,{n:2,color:nd.type==='tree'?'#b07a42':nd.type==='bush'?'#6fae52':'#b8b3a6',size:3,spread:1,up:2.4,life:.8,grav:7,z:.5});}
      else if(T0&&(T0.kind==='build'||T0.kind==='line'||T0.kind==='repair'))this.puff(u.x,u.y,{n:2,color:'#ffe7a8',size:2,spread:1,up:2,life:.35,grav:5,z:.4,glow:true});}}

  // ---------- dessiner ----------
  draw(dt){const ctx=this.ctx,W=this.world,s=W.s;this.frame+=dt*8;this.clock+=dt;this.shake=Math.max(0,this.shake-dt*1.8);this.sx=(Math.random()-.5)*this.shake*12;this.sy=(Math.random()-.5)*this.shake*9;
    if(!this.tiles)this.tiles=this.makeTiles();if(!this.overview)this.makeOverview();
    const cw=this.canvas.width,ch=this.canvas.height,z=this.z();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0d2233';ctx.fillRect(0,0,cw,ch);
    // ce qui est à l'écran, en cases
    const c0=this.toWorld(0,0),c1=this.toWorld(cw,0),c2=this.toWorld(0,ch),c3=this.toWorld(cw,ch);const N=W.N;
    const i0=Math.max(0,Math.floor(Math.min(c0.x,c1.x,c2.x,c3.x))-2),i1=Math.min(N-1,Math.ceil(Math.max(c0.x,c1.x,c2.x,c3.x))+2),j0=Math.max(0,Math.floor(Math.min(c0.y,c1.y,c2.y,c3.y))-2),j1=Math.min(N-1,Math.ceil(Math.max(c0.y,c1.y,c2.y,c3.y))+2);
    this.vis=[i0,i1,j0,j1];
    // le sol
    if(this.zoom<.45||!this.tiles){const o=this.toScreen(0,0);const k=TW/2*z/(this.ovS/2);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.overview,o.x-N*this.ovS/2*k,o.y,this.overview.width*k,this.overview.height*k);}
    else{const tw=(TW+2)*z,th=(TH+2)*z;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const p=this.toScreen(i,j);if(p.x<-tw||p.x>cw+tw||p.y<-th||p.y>ch+th)continue;const t=W.G.terrain[j*N+i];ctx.drawImage(this.tiles[t][(j&3)*4+(i&3)],p.x-tw/2,p.y,tw,th);}
      if(!this.shadeCv)this.makeShade();const o=this.toScreen(0,0);const k=TW/2*z/(this.shS/2);ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.55;ctx.imageSmoothingEnabled=true;ctx.drawImage(this.shadeCv,o.x-N*this.shS/2*k,o.y,this.shadeCv.width*k,this.shadeCv.height*k);ctx.restore();}
    // les cratères
    this.decals=this.decals.filter(d=>(d.age+=dt)<(d.kind==='stump'||d.kind==='rubble'?4000:400));if(this.decals.length>900)this.decals.splice(0,this.decals.length-900);for(const d of this.decals){if(d.x<i0-2||d.x>i1+2||d.y<j0-2||d.y>j1+2)continue;const q=this.toScreen(d.x,d.y);ctx.save();
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
    this.drawLines(i0,i1,j0,j1);
    // tout ce qui a de la hauteur, trié par profondeur
    const items=[];const inView=(x,y,m=3)=>x>=i0-m&&x<=i1+m&&y>=j0-m&&y<=j1+m;
    if(this.zoom>=.3)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const nd=W.nodeAt[j*N+i];if(nd>=0){const n=s.nodes[nd];items.push({d:i+j+1,f:()=>this.drawNode(n)});}}
    for(const b of s.buildings){const [w,h]=BUILDINGS[b.k].size;if(!inView(b.i,b.j,6))continue;items.push({d:b.k==='aerodrome'?b.i+b.j+1:b.i+b.j+w+h-.5,f:()=>this.drawBuilding(b)});}
    for(const c of s.corpses)if(inView(c.x,c.y)&&this.zoom>=.35)items.push({d:c.x+c.y-.05,f:()=>this.drawCorpse(c)});
    this.toppling=this.toppling.filter(t=>(t.age+=dt)<1.6);for(const t of this.toppling)if(inView(t.x,t.y))items.push({d:t.x+t.y,f:()=>{const im=prop(t.name);if(!im)return;const q=this.toScreen(t.x,t.y);const w=TW*1.15*z;const k=Math.min(1,t.age/.9);const ang=t.side*1.45*k*k;
      ctx.save();ctx.globalAlpha=t.age<1.1?1:Math.max(0,1-(t.age-1.1)/.5);ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.drawImage(im,-w/2,-w*.9,w,w);ctx.restore();}});
    for(const u of s.units)if(inView(u.x,u.y))items.push({d:u.x+u.y,f:()=>this.drawUnit(u)});
    for(const v of s.vehicles)if(inView(v.x,v.y,8)&&!(v.alt>0))items.push({d:v.x+v.y+.3,f:()=>this.drawVehicle(v)});
    items.sort((a,b)=>a.d-b.d);
    for(const u of s.units)if(this.sel.has(u.id)){const q=this.toScreen(u.x,u.y);ctx.strokeStyle='#ffd36a';ctx.lineWidth=2*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,11*z,5.5*z,0,0,7);ctx.stroke();}
    for(const it of items)it.f();
    this.stepParts(dt);this.drawShots();this.drawStreaks(dt);this.drawParts(false);this.drawSmokes();this.drawFx(dt);
    for(const v of s.vehicles)if(v.alt>0&&inView(v.x,v.y,12))this.drawVehicle(v);
    this.drawNight();this.drawParts(true);this.drawLinks();
    if(this.placing&&this.hover)this.drawGhost();if(this.lining?.cells)this.drawLinePlan();
    if(this.drag?.box){const {x0,y0,x1,y1}=this.drag.box;ctx.fillStyle='rgba(255,211,106,.12)';ctx.strokeStyle='#ffd36a';ctx.lineWidth=1.5*this.dpr;ctx.fillRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));ctx.strokeRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));}
    this.marks=this.marks.filter(m=>(m.age+=dt)<.6);for(const m of this.marks){const q=this.toScreen(m.x,m.y);ctx.strokeStyle=m.bad?`rgba(235,90,70,${1-m.age/.6})`:`rgba(255,211,106,${1-m.age/.6})`;ctx.lineWidth=2.5*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,(6+m.age*30)*z,(3+m.age*15)*z,0,0,7);ctx.stroke();}
    if(this.hover?.label&&!this.drag?.box)this.tag(this.hover.label,this.hover.sx+14*this.dpr,this.hover.sy+22*this.dpr,this.hover.tone||'ink',true);}

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
    // le ballast d'abord, sous toutes les voies bâties : un lit de gravier clair
    ctx.save();ctx.lineCap='round';for(const [w,col] of [[14,'#857e70'],[10,'#a39c8c']]){ctx.strokeStyle=col;ctx.lineWidth=w*z;ctx.beginPath();
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(W.rail[j*N+i]!==2)continue;const c=this.toScreen(i+.5,j+.5);let n=0;
        for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N||W.rail[b*N+a]!==2)continue;n++;const e=this.toScreen(i+.5+di*.5,j+.5+dj*.5);ctx.moveTo(c.x,c.y);ctx.lineTo(e.x,e.y);}
        if(!n){ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+.1,c.y);}}
      ctx.stroke();}ctx.restore();
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;const r=W.rail[k];if(!r)continue;const c=this.toScreen(i+.5,j+.5);let n=0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N||!W.rail[b*N+a])continue;n++;
        const e=this.toScreen(i+.5+di*.5,j+.5+dj*.5);const dx=e.x-c.x,dy=e.y-c.y,L=Math.hypot(dx,dy)||1;const px=-dy/L*4*z,py=dx/L*4*z;
        ctx.save();if(r===1){ctx.globalAlpha=.55;ctx.setLineDash([4*z,3*z]);}
        ctx.strokeStyle=r===2?'#6b4a2e':'#e8bf62';ctx.lineWidth=3.2*z;for(let t=.15;t<1;t+=.35){const mx=c.x+dx*t,my=c.y+dy*t;ctx.beginPath();ctx.moveTo(mx-px*1.5,my-py*1.5);ctx.lineTo(mx+px*1.5,my+py*1.5);ctx.stroke();}
        ctx.strokeStyle=r===2?'#9aa0a6':'#e8bf62';ctx.lineWidth=1.4*z;for(const sgn of [-1,1]){ctx.beginPath();ctx.moveTo(c.x+px*sgn,c.y+py*sgn);ctx.lineTo(e.x+px*sgn,e.y+py*sgn);ctx.stroke();}ctx.restore();}
      if(!n){ctx.fillStyle=r===2?'#9aa0a6':'#e8bf62';ctx.beginPath();ctx.arc(c.x,c.y,3*z,0,7);ctx.fill();}
      if(W.s.rails[k]?.broken&&r===1){ctx.fillStyle='rgba(189,75,61,.8)';ctx.beginPath();ctx.arc(c.x,c.y,4*z,0,7);ctx.fill();}}
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;const w=W.wall[k];if(!w)continue;const built=Math.abs(w)===2;const mine=w>0;const c=this.toScreen(i+.5,j+.5);const hgt=(built?1.1:.15)*TH*z;
      const top=mine?'#cbb893':'#6f7456',side=mine?'#9a8866':'#4c5040',side2=mine?'#b3a07c':'#5b6048';const a=this.toScreen(i,j),b=this.toScreen(i+1,j),cc=this.toScreen(i+1,j+1),d=this.toScreen(i,j+1);
      ctx.save();if(!built)ctx.globalAlpha=.5;ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(cc.x,cc.y-hgt);ctx.lineTo(d.x,d.y-hgt);ctx.fill();
      ctx.fillStyle=side2;ctx.beginPath();ctx.moveTo(cc.x,cc.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y-hgt);ctx.lineTo(cc.x,cc.y-hgt);ctx.fill();
      ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(a.x,a.y-hgt);ctx.lineTo(b.x,b.y-hgt);ctx.lineTo(cc.x,cc.y-hgt);ctx.lineTo(d.x,d.y-hgt);ctx.fill();
      if(built){ctx.fillStyle=side;for(const t of [.25,.75]){const q=this.toScreen(i+t,j+t);ctx.fillRect(q.x-3*z,q.y-hgt-5*z,6*z,5*z);}const wo=W.s.walls[k];if(wo&&wo.hp<LINES.mur.hp*.99)this.bar(c.x,c.y-hgt-10*z,22*z,wo.hp/LINES.mur.hp,'#bd4b3d');}ctx.restore();}}
  drawNode(n){const ctx=this.ctx,z=this.z();const q=this.toScreen(n.i+.5,n.j+.5);const W=this.world;
    if(n.type==='ore'){const im=prop(OUTCROP[n.res]);const w=TW*1.3*z;const pulse=.5+.5*Math.sin(this.frame/3);ctx.save();ctx.globalAlpha=.2+.2*pulse;ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.ellipse(q.x,q.y,w*.5,w*.22,0,0,7);ctx.fill();ctx.restore();
      if(im&&!W.s.buildings.some(b=>b.ore===n.id))ctx.drawImage(im,q.x-w/2,q.y-w*.75,w,w);const ic=icon(n.res);if(ic&&this.zoom>.5)ctx.drawImage(ic,q.x-9*z,q.y-w*.9,18*z,18*z);return;}
    if(n.left<1&&n.type!=='bush')return;let name,w,lift=.9;const f=Math.min(1,n.left/n.max);
    if(n.type==='tree'){const ks=TREES[W.G.terrain[n.j*W.N+n.i]]||TREES[T.grass];name=ks[n.id%ks.length];w=TW*(1+.25*f)*z;}
    else if(n.type==='rock'){name='outcrop_rock';w=TW*(.6+.4*f)*z;lift=.72;}else{name=n.left>=1?'bush_berry':'bush_green';w=TW*.7*z;lift=.8;}
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
  drawBuilding(b){const ctx=this.ctx,z=this.z(),W=this.world;const B=BUILDINGS[b.k];const [w,h]=B.size;const sel=this.selB===b.id;
    const a=this.toScreen(b.i,b.j),bb=this.toScreen(b.i+w,b.j),cc=this.toScreen(b.i+w,b.j+h),d=this.toScreen(b.i,b.j+h);
    const dia=(fill,stroke,dash)=>{ctx.save();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bb.x,bb.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5*this.dpr;if(dash)ctx.setLineDash(dash);ctx.stroke();}ctx.restore();};
    dia(b.ruin?'rgba(40,32,26,.55)':!b.done?'rgba(122,86,50,.4)':'rgba(90,70,48,.25)',sel?'#ffd36a':b.f==='beee'?'rgba(224,80,58,.6)':!b.done&&!b.ruin?'#e8bf62':null,!b.done&&!b.ruin?[5*z,4*z]:null);
    if(b.k==='tente'){this.drawTent(b,z);}
    else if(b.k==='aerodrome'){ctx.save();ctx.fillStyle=b.ruin?'#5a4a3a':'#b9a888';const s0=this.toScreen(b.i,b.j+.3),s1=this.toScreen(b.i+w,b.j+.3),s2=this.toScreen(b.i+w,b.j+1.5),s3=this.toScreen(b.i,b.j+1.5);ctx.beginPath();ctx.moveTo(s0.x,s0.y);ctx.lineTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.lineTo(s3.x,s3.y);ctx.fill();
      if(!b.ruin){ctx.strokeStyle='#fff8e6';ctx.lineWidth=2*z;for(let t=.1;t<.9;t+=.14){const m1=this.toScreen(b.i+w*t,b.j+.9),m2=this.toScreen(b.i+w*(t+.06),b.j+.9);ctx.beginPath();ctx.moveTo(m1.x,m1.y);ctx.lineTo(m2.x,m2.y);ctx.stroke();}}ctx.restore();
      const im=this.sprite('aerodrome',b.done?3:1,b.f);const p=this.toScreen(b.i+w,b.j+h);const pw=2*TW*z;if(im){ctx.save();if(b.ruin)ctx.filter='brightness(.4)';ctx.drawImage(im,p.x-pw*.6,p.y-pw*.9,pw,pw);ctx.restore();}}
    else{const stage=b.done?3:b.ruin?1:b.progress<.5?1:2;const p=this.toScreen(b.i+w,b.j+h);const pw=(w+h)/2*TW*z*1.05;const im=this.sprite(b.k,stage,b.f);
      if(im){ctx.save();if(b.ruin)ctx.filter='brightness(.35) saturate(.3)';else if(!b.done)ctx.globalAlpha=.5+.5*b.progress;if(b.hitAt&&W.t-b.hitAt<.03)ctx.filter='brightness(1.6)';ctx.drawImage(im,p.x-pw/2,p.y-pw*.95,pw,pw);ctx.restore();}
      if(b.k==='mine'){const nd=W.s.nodes[b.ore];if(nd){const ic=icon(nd.res);if(ic)ctx.drawImage(ic,p.x-pw*.45,p.y-pw*.4,22*z,22*z);}}}
    if(b.ruin){ctx.save();ctx.fillStyle='#3d3128';for(let n=0;n<9;n++){const q=this.toScreen(b.i+w*((n*37%10)/10),b.j+h*((n*53%10)/10));ctx.beginPath();ctx.ellipse(q.x,q.y,(5+n%3*3)*z,(2.5+n%2*1.5)*z,0,0,7);ctx.fill();}ctx.restore();}
    if(b.fire>0){const q=this.toScreen(b.i+w/2,b.j+h/2);ctx.save();ctx.globalCompositeOperation='lighter';for(let n=0;n<4;n++){const f=Math.sin(this.frame*1.7+n*2.1+b.id)*.5+.5;const x=q.x+(n-1.5)*9*z,y=q.y-8*z-n%2*6*z;
      ctx.globalAlpha=.5+.3*f;ctx.fillStyle=n%2?'#ffd36a':'#ff7a2a';ctx.beginPath();ctx.ellipse(x,y-(8+8*f)*z,(5+3*f)*z,(12+9*f)*z,0,0,7);ctx.fill();}ctx.restore();}
    const top=this.toScreen(b.i+w/2,b.j+h/2);
    if(b.hp<b.max*.99||sel)this.bar(top.x,top.y-(w+h)*TH*z*.55,Math.max(30,(w+h)*9)*z,b.hp/b.max,b.f==='beee'?'#e0503a':'#54aaa1');
    if(!b.done&&!b.ruin&&this.zoom>.5)this.bar(top.x,top.y+4*z,40*z,b.progress,'#ee7d26');
    if(this.zoom>.55&&(sel||this.hover?.b===b.id)){const lbl=`${B.name}${b.f==='beee'?' bèè':''}${b.ruin?' · en ruine':!b.done?` · ${Math.round(b.progress*100)} %`:''}${b.why?' · '+b.why:''}`;this.tag(lbl,top.x,top.y+16*z,b.f==='beee'?'bad':b.ruin?'bad':'ink');}
    if(b.k==='centre'&&this.zoom>.35){this.text(b.city+(b.f==='beee'?'':''),top.x,top.y-(w+h)*TH*z*.62-8*z,b.f==='beee'?'#ffb4a6':'#fff1c9',13);}}
  // Un Meumeu : debout, accroupi, couché, à terre ou mort. Le sang est sur le sprite, là où la balle est entrée (et sortie),
  // et par terre sous ceux qui saignent : plus il a perdu de sang, plus la flaque est grande.
  drawUnit(u){const ctx=this.ctx,z=this.z(),W=this.world;const q=this.toScreen(u.x,u.y);const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];const size=(u.k==='villageois'?34:38)*z;const down=u.h?.state==='hors';
    if(this.zoom<.35){ctx.fillStyle=down?'#8a1c1c':u.f==='beee'?'#e0503a':u.k==='villageois'?'#fff1c9':'#7fd3f0';ctx.fillRect(q.x-2*z*3,q.y-4*z*3,4*z*3,4*z*3);return;}
    if(u.f==='beee'&&!down){ctx.strokeStyle='rgba(224,80,58,.75)';ctx.lineWidth=1.6*this.dpr;ctx.beginPath();ctx.ellipse(q.x,q.y,9*z,4.5*z,0,0,7);ctx.stroke();}
    if(u.h){const lost=1-u.h.blood/BLOOD;if(down||lost>.06)this.pool(q.x,q.y,lost,z,u.id);}
    if(D.img==='canon'){this.drawCannon(u,q,z);}
    else{const act=down?'idle':u.anim==='aim'?'aim':u.anim==='action'?'action':u.anim==='walk'?'walk':'idle';let name=D.sheet;if(u.k==='villageois'){const t=u.task?.kind;name=t==='build'||t==='line'||t==='repair'?'meumeu_builder':u.carry?'meumeu_logistician':t==='work'?'meumeu_mechanic':'meumeu_colonist';}
      const sh=sheet(name,act,u.dir||'se')||sheet(name,'idle',u.dir||'se');const pose=down?'down':u.post==='couche'?'prone':u.post==='accroupi'?'crouch':'up';
      if(sh)this.body(sh,down?0:Math.floor(this.frame+(u.id%5)),q,size,pose,u.h?.wounds,u.dir,u.id,down?.25:0,u.armor?W.armorOf(u.armor)?.D:null);else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y-8*z,5*z,0,7);ctx.fill();}}
    const top=down?q.y-size*.35:u.post==='couche'?q.y-size*.4:u.post==='accroupi'?q.y-size*.78:q.y-size;
    if(u.carry&&u.carry.n>=1){const ic=icon(u.carry.k);if(ic)ctx.drawImage(ic,q.x-7*z,top-14*z,14*z,14*z);}
    if(u.carrying!=null){ctx.fillStyle='#fff8e6';ctx.font=`800 ${10*this.dpr}px system-ui`;ctx.textAlign='center';ctx.fillText('✚',q.x,top-4*z);}
    if(u.h&&!down&&u.h.blood<BLOOD*.98)this.bar(q.x,top-6*z,22*z,u.h.blood/BLOOD,'#c0392b');
    if(!u.h&&(u.hp<u.max||this.sel.has(u.id)))this.bar(q.x,top-6*z,22*z,u.hp/u.max,u.f==='beee'?'#e0503a':'#54aaa1');
    if(u.h&&u.f==='meumeu'&&u.h.state!=='ok'&&this.zoom>.5){const tr=triage(u.h);ctx.fillStyle=tr.c;ctx.strokeStyle='#fff';ctx.lineWidth=1*this.dpr;ctx.fillRect(q.x-14*z,top-9*z,6*z,6*z);ctx.strokeRect(q.x-14*z,top-9*z,6*z,6*z);}
    if(down){ctx.fillStyle='#b3261e';ctx.beginPath();ctx.arc(q.x+10*z,top-2*z,5*z,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(q.x+10*z-3.2*z,top-2*z-1*z,6.4*z,2*z);ctx.fillRect(q.x+10*z-1*z,top-2*z-3.2*z,2*z,6.4*z);}
    if(u.w&&u.f==='meumeu'&&!down){const Wd=W.W(u.w);const n=(u.mag||0)+(u.pouch||0);if(n<Wd.carry*.25){ctx.fillStyle=n<=0?'#bd4b3d':'#ee7d26';ctx.beginPath();ctx.arc(q.x+9*z,top,3*z,0,7);ctx.fill();}}
    if(u.sq&&this.sel.has(u.id)&&this.zoom>.6){const sq=W.squad(u.sq);if(sq){ctx.save();ctx.font=`800 ${9*this.dpr}px system-ui`;ctx.textAlign='center';ctx.fillStyle=sq.leader===u.id?'#ffd36a':'#fff1c9';ctx.strokeStyle='#173d44';ctx.lineWidth=3*this.dpr;const t=String(W.s.squads.indexOf(sq)+1)+(sq.leader===u.id?'★':'');ctx.strokeText(t,q.x-10*z,top);ctx.fillText(t,q.x-10*z,top);ctx.restore();}}
    if(u.f==='meumeu'&&u.k==='villageois'&&!u.task&&!down&&!this.sel.has(u.id)){ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.arc(q.x+8*z,top+2*z,2.6*z,0,7);ctx.fill();}}
  // Un corps : couché, assombri, dans sa flaque. Il reste trois jours.
  drawCorpse(c){const ctx=this.ctx,z=this.z();const q=this.toScreen(c.x,c.y);const age=this.world.t-c.t;const a=Math.max(0,Math.min(1,1-age/(3*DAY)));if(a<=0)return;ctx.save();ctx.globalAlpha=.35+.65*a;
    this.pool(q.x,q.y,Math.max(.3,c.bl||.3),z,Math.round(c.x*97+c.y*31));
    if(c.sheet){const sh=sheet(c.sheet,'idle',c.dir||'se');if(sh)this.body(sh,0,q,(c.k==='villageois'?34:38)*z,'dead',c.wounds,c.dir,Math.round(c.x*13),.45);}
    else{ctx.fillStyle='#2b2520';ctx.beginPath();ctx.ellipse(q.x,q.y-3*z,13*z,6*z,.2,0,7);ctx.fill();}ctx.restore();}
  pool(x,y,lost,z,seed){const ctx=this.ctx;const r=(4+Math.min(1,lost*1.8)*13)*z;const ox=((seed*7)%5-2)*z;ctx.save();ctx.fillStyle='rgba(92,8,10,.75)';ctx.beginPath();ctx.ellipse(x+ox,y+2*z,r,r*.45,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(150,18,18,.55)';ctx.beginPath();ctx.ellipse(x+ox-r*.25,y+1.5*z,r*.45,r*.18,0,0,7);ctx.fill();ctx.restore();}
  // Dessine un personnage dans une posture, avec son sang : on compose d'abord le cadre à part (le sang ne tache que le personnage),
  // puis on le pose — accroupi, on le tasse ; couché ou à terre, on le couche sur le sol.
  body(sh,frame,q,size,pose,wounds,dir,seed,dim=0,arm=null){const ctx=this.ctx;const blood=wounds&&wounds.length;
    if(pose==='up'&&!blood&&!dim&&!arm){drawFrame(ctx,sh,frame,q.x,q.y,size);return;}
    const ow=Math.ceil(size*1.7),oh=Math.ceil(size*1.3);if(!this.oc)this.oc=document.createElement('canvas');const oc=this.oc;if(oc.width<ow||oc.height<oh){oc.width=Math.max(oc.width,ow);oc.height=Math.max(oc.height,oh);}
    const o=oc.getContext('2d');o.setTransform(1,0,0,1,0,0);o.globalCompositeOperation='source-over';o.clearRect(0,0,ow+2,oh+2);const fx=ow/2,fy=oh-2;drawFrame(o,sh,frame,fx,fy,size);
    if(blood){o.globalCompositeOperation='source-atop';const front=dir==='se'||dir==='sw'||!dir,facing=dir==='se'||dir==='ne'||!dir?1:-1;const k=size/BODY_H;
      for(const w of wounds){for(const [p,out] of [[w.entry,0],[w.exit,1]]){if(!p)continue;const x=fx+(front?-1:1)*p[0]*k*.85+facing*p[2]*k*.6,y=fy-p[1]*k;const r=Math.max(1.3,size*(.03+.012*(w.sev||2))*(out?1.5:1));
        o.fillStyle='rgba(112,6,8,.92)';o.beginPath();o.arc(x,y,r,0,7);o.fill();o.fillStyle='rgba(100,5,7,.8)';o.fillRect(x-r*.3,y,r*.6,r*(1.4+(w.sev||2)*.7));o.fillStyle='rgba(185,28,28,.85)';o.beginPath();o.arc(x-r*.3,y-r*.3,r*.38,0,7);o.fill();}}}
    if(arm){o.globalCompositeOperation='source-atop';const k=size/BODY_H;const col={acier:'rgba(110,120,130,.8)',ceramique:'rgba(225,218,200,.8)',soie:'rgba(160,140,90,.75)',verre:'rgba(90,200,190,.75)'};
      if(arm.zones.casque.t>0){o.fillStyle=col[arm.zones.casque.mat];o.beginPath();o.ellipse(fx,fy-.262*k,.04*k,.024*k,0,Math.PI,0);o.fill();o.fillRect(fx-.04*k,fy-.264*k,.08*k,.006*k);}
      if(arm.zones.plastron.t>0||arm.zones.dos.t>0){const z=arm.zones.plastron.t>0?arm.zones.plastron:arm.zones.dos;o.fillStyle=col[z.mat];o.fillRect(fx-.045*k,fy-.19*k,.09*k,.115*k);o.fillStyle='rgba(0,0,0,.25)';o.fillRect(fx-.045*k,fy-.135*k,.09*k,.004*k);}}
    if(dim){o.globalCompositeOperation='source-atop';o.fillStyle=`rgba(38,30,28,${dim})`;o.fillRect(0,0,ow,oh);}
    o.globalCompositeOperation='source-over';ctx.save();ctx.translate(q.x,q.y);
    if(pose==='crouch'){ctx.scale(1,.74);ctx.drawImage(oc,0,0,ow,oh,-fx,-fy,ow,oh);}
    else if(pose==='prone'||pose==='down'||pose==='dead'){const sgn=seed%2?1:-1;ctx.scale(1,.55);ctx.rotate(sgn*(pose==='prone'?1.5:1.35));ctx.drawImage(oc,0,0,ow,oh,-fx,-fy+size*.5,ow,oh);}
    else ctx.drawImage(oc,0,0,ow,oh,-fx,-fy,ow,oh);ctx.restore();}
  // les fumigènes : un nuage épais qui gonfle, tourne lentement, puis se dissipe
  drawSmokes(){const ctx=this.ctx,z=this.z(),W=this.world;const im=img('fx/smoke_cloud.webp'),im2=img('fx/smoke_gray1.webp');if(!im)return;
    for(const s of W.s.smokes){if(this.near(s.x,s.y)<=0)continue;const age=W.t-s.t0,left=s.end-W.t;const a=Math.min(1,age*3)*Math.min(1,left/2);const grow=Math.min(1,.4+age*1.5);
      for(let n=0;n<7;n++){const an=n/7*6.283+age*.15;const r=s.r*.55*grow;const q=this.toScreen(s.x+Math.cos(an)*r,s.y+Math.sin(an)*r,.25+(n%3)*.15);const w=s.r*TW*z*.9*grow;
        ctx.save();ctx.globalAlpha=.78*a;ctx.translate(q.x,q.y);ctx.rotate(an+age*.2);ctx.drawImage(n%2&&im2?im2:im,-w/2,-w/2,w,w);ctx.restore();}}}
  drawFx(dt){const ctx=this.ctx,z=this.z();this.fx=this.fx.filter(f=>(f.life-=dt)>0);
    for(const pass of [false,true]){ctx.save();if(pass)ctx.globalCompositeOperation='lighter';
      for(const f of this.fx){if(f.add!==pass)continue;const im=img('fx/'+f.name+'.webp');if(!im)continue;const k=1-f.life/f.max;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.rise*dt;
        const q=this.toScreen(f.x,f.y,f.z);const s=f.size*z*(1+(f.grow-1)*k);const a=f.alpha*(f.add?(1-k):Math.min(1,(1-k)*1.6));if(a<=0)continue;ctx.globalAlpha=a;
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(f.ang);const r=im.width/im.height;ctx.drawImage(im,-s*r/2*(f.name.startsWith('muzzle_side')||f.name.startsWith('muzzle_rifle')||f.name.startsWith('spray')?0:1),-s/2,s*r,s);ctx.restore();}ctx.restore();}}
  // les balles : un trait bref qui file du tireur au point d'arrivée ; les traçantes, rouges et plus longues
  drawStreaks(dt){const ctx=this.ctx;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const s of this.streaks){s.age+=dt;const q=Math.min(1,s.age/s.life);const L=Math.hypot(s.x1-s.x0,s.y1-s.y0)||1;const tail=Math.max(0,q-(s.tr?1.2:.7)/L);
      const hx=s.x0+(s.x1-s.x0)*q,hy=s.y0+(s.y1-s.y0)*q,tx=s.x0+(s.x1-s.x0)*tail,ty=s.y0+(s.y1-s.y0)*tail;const h=s.h0*(1-q)+.25*q;const a=this.toScreen(hx,hy,h),b=this.toScreen(tx,ty,s.h0*(1-tail)+.25*tail);
      ctx.strokeStyle=s.tr?(s.f==='beee'?'rgba(120,255,140,.95)':'rgba(255,90,60,.95)'):(s.f==='beee'?'rgba(255,190,150,.55)':'rgba(255,245,200,.55)');ctx.lineWidth=(s.tr?2.2:1.2)*this.dpr;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();}
    ctx.restore();this.streaks=this.streaks.filter(s=>s.age<s.life);}
  drawCannon(u,q,z){const ctx=this.ctx;const dx=u.dir==='se'||u.dir==='ne'?1:-1;ctx.save();ctx.translate(q.x,q.y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,0,14*z,5*z,0,0,7);ctx.fill();
    ctx.fillStyle=u.f==='beee'?'#4c5040':'#5a4632';ctx.fillRect(-10*z,-8*z,20*z,5*z);ctx.fillStyle='#2b2b2b';ctx.save();ctx.rotate(-.35*dx);ctx.fillRect(dx>0?-2*z:-16*z,-14*z,18*z,5*z);ctx.restore();
    ctx.fillStyle='#3a2a1c';for(const x of [-7,7]){ctx.beginPath();ctx.arc(x*z,-3*z,5*z,0,7);ctx.fill();}ctx.restore();}
  // Un train : la locomotive devant, quatre wagons derrière, le long de la voie parcourue.
  drawVehicle(v){const ctx=this.ctx,z=this.z(),W=this.world;const sel=this.selV===v.id;
    if(v.k==='train'){this.drawTrain(v,sel);return;}
    const q=this.toScreen(v.x,v.y);const air=v.alt>0;const g=this.toScreen(v.x,v.y,air?v.alt:0);
    if(air){ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(q.x,q.y,26*z,8*z,0,0,7);ctx.fill();}
    const V=VEHICLES[v.k];const im=vehicle(v.f==='beee'?'beee_prop-plane':air?(V.sprite||'prop-plane_flying'):v.k==='charrette'?'hand-cart':'prop-plane_grounded');const w=(v.k==='charrette'?TW*.9:TW*2.2)*z;
    const right=((v.dx||0)-(v.dy||0))>0;if(im){ctx.save();ctx.translate(g.x,g.y-w*.3);if(right)ctx.scale(-1,1);if(v.hitAt&&W.t-v.hitAt<.05)ctx.filter='brightness(1.8)';ctx.drawImage(im,-w/2,-w/2,w,w);ctx.restore();}
    if(v.k==='charrette'&&sum(v.cargo)>0){const ic=icon(Object.keys(v.cargo)[0]);if(ic)ctx.drawImage(ic,g.x-8*z,g.y-w*.8,16*z,16*z);}
    if(air&&v.hp<v.max)this.bar(g.x,g.y-w*.75,40*z,v.hp/v.max,v.f==='beee'?'#e0503a':'#54aaa1');
    if(sel||(air&&v.f==='beee'))this.tag(v.f==='beee'?'Bombardier bèè':`${v.name}${v.why?' · '+v.why:''}`,g.x,g.y-w*.85,v.f==='beee'?'bad':v.why?'warn':'ink');}
  // Un train dessiné : la locomotive à vapeur (chaudière, cabine, cheminée qui fume, fanal la nuit), le tender de charbon, et
  // quatre wagons faits pour ce qu'ils portent — trémies de charbon, d'argile, de minerai ; plats de grumes, de briques, de caisses ;
  // citerne de carburant ; wagons couverts pour les munitions et les pièces. Les voitures suivent la trace de la locomotive.
  drawTrain(v,sel){const ctx=this.ctx,z=this.z(),W=this.world;const pts=[[v.x,v.y],...(v.trail||[])];
    const at=d=>{let left=d;for(let n=0;n<pts.length-1;n++){const [ax,ay]=pts[n],[bx,by]=pts[n+1];const L=Math.hypot(bx-ax,by-ay);if(left<=L){const t=L?left/L:0;return [ax+(bx-ax)*t,ay+(by-ay)*t,ax-bx,ay-by];}left-=L;}const l=pts[pts.length-1];return [l[0]-(v.dx||1)*(left),l[1]-(v.dy||0)*(left),v.dx||1,v.dy||0];};
    const keys=Object.entries(v.cargo||{}).filter(([,n])=>n>=.05).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
    const cars=[{k:'loco',h:.5},{k:'tender',h:.3}];for(let n=0;n<4;n++)cars.push({k:'wagon',h:.44,load:keys.length?keys[n%keys.length]:null,fill:keys.length?Math.min(1,W.cargoW(v)/Math.max(1,W.capOf(v))*1.3):0});
    let d=0;for(let n=0;n<cars.length;n++){const c=cars[n];if(n)d+=cars[n-1].h+c.h+.1;const [x,y,dx,dy]=at(d);Object.assign(c,{x,y,dx:dx||v.dx||1,dy:dy||v.dy||0});}
    const moving=v.path&&v.state!=='wait';
    for(const c of [...cars].sort((a,b)=>(a.x+a.y)-(b.x+b.y)))this.drawCar(c,v,moving);
    // la fumée : des bouffées qui montent et partent en arrière
    const L0=cars[0];const Lh=Math.hypot(L0.dx,L0.dy)||1;const ux=L0.dx/Lh,uy=L0.dy/Lh;
    for(let k=0;k<6;k++){const age=((this.clock*(moving?1.4:.5))+k/6)%1;const q=this.toScreen(L0.x+ux*.35-ux*age*(moving?1.2:.2),L0.y+uy*.35-uy*age*(moving?1.2:.2),1.45+age*(moving?1.1:1.5));
      ctx.fillStyle=`rgba(${moving?'62,62,64':'120,120,122'},${(1-age)*(moving?.38:.22)})`;ctx.beginPath();ctx.arc(q.x,q.y,(2.5+age*7)*z,0,7);ctx.fill();}
    if(W.isNight()){const q=this.toScreen(L0.x+ux*.55,L0.y+uy*.55,.5);const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,26*z);g.addColorStop(0,'rgba(255,226,140,.8)');g.addColorStop(1,'rgba(255,226,140,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,26*z,0,7);ctx.fill();}
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
      else{const h=(sh.kind==='shell'?3:1.4)*4*q*(1-q)+.5*(1-q);const g=this.toScreen(x,y),a=this.toScreen(x,y,h);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(g.x,g.y,3*z,1.5*z,0,0,7);ctx.fill();ctx.fillStyle=sh.kind==='shell'?'#222':'#46513a';ctx.beginPath();ctx.arc(a.x,a.y,(sh.kind==='shell'?3.5:3)*z,0,7);ctx.fill();}}
    for(const F of W.s.falls){const q=F.t/F.dur;const x=F.x0+(F.x1-F.x0)*q,y=F.y0+(F.y1-F.y0)*q;const a=this.toScreen(x,y,F.alt*(1-q*q));const g=this.toScreen(x,y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(g.x,g.y,(3+5*q)*z,(1.5+2.5*q)*z,0,0,7);ctx.fill();
      if(F.kind==='bomb'){ctx.fillStyle='#2c2f28';ctx.beginPath();ctx.ellipse(a.x,a.y,3*z,6.5*z,0,0,7);ctx.fill();}else{const im=vehicle(F.f==='beee'?'beee_prop-plane':'cargo-plane');const w=TW*2*z;if(im){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(-.7-q);ctx.filter='brightness(.4)';ctx.drawImage(im,-w/2,-w/2,w,w);ctx.restore();}if(Math.random()<.6)this.puff(x,y,{n:1,color:'rgba(40,36,32,.7)',size:12,spread:.2,up:.2,life:1.4,z:F.alt*(1-q*q)});}}}
  drawParts(glow){const ctx=this.ctx,z=this.z();ctx.save();if(glow)ctx.globalCompositeOperation='lighter';
    for(const p of this.parts){if(!!p.glow!==glow)continue;const q=this.toScreen(p.x,p.y,p.z);const a=Math.max(0,Math.min(1,p.life/p.max*1.4));ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.6,p.size*z*(p.glow?1:.6+.6*(1-a))),0,7);ctx.fill();}ctx.restore();}
  // La nuit : un voile, percé autour des villes (et des incendies).
  drawNight(){const L=this.world.light();if(L>=.999)return;const ctx=this.ctx,z=this.z();if(!this.nightCv)this.nightCv=document.createElement('canvas');const n=this.nightCv;if(n.width!==this.canvas.width||n.height!==this.canvas.height){n.width=this.canvas.width;n.height=this.canvas.height;}
    const x=n.getContext('2d');x.globalCompositeOperation='source-over';x.clearRect(0,0,n.width,n.height);x.fillStyle=`rgba(8,14,40,${(1-L)*.6})`;x.fillRect(0,0,n.width,n.height);x.globalCompositeOperation='destination-out';
    const light=(wx,wy,r,a=.85)=>{const q=this.toScreen(wx,wy);const R=r*TW*z*.7;if(q.x<-R||q.y<-R||q.x>n.width+R||q.y>n.height+R)return;const g=x.createRadialGradient(q.x,q.y,R*.1,q.x,q.y,R);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.ellipse(q.x,q.y,R,R*.6,0,0,7);x.fill();};
    for(const b of this.world.s.buildings){if(!b.done&&!(b.fire>0))continue;const [w,h]=BUILDINGS[b.k].size;light(b.i+w/2,b.j+h/2,b.fire>0?5:b.k==='centre'?6:2.5);}
    ctx.drawImage(n,0,0);}
  drawGhost(){const k=this.placing;const B=BUILDINGS[k];const [w,h]=B.size;const c=this.hover.cell;if(!c)return;const i=c[0]-Math.floor((w-1)/2),j=c[1]-Math.floor((h-1)/2);this.ghost=[i,j];
    const r=this.world.canPlace('meumeu',k,i,j);const ctx=this.ctx,z=this.z();const a=this.toScreen(i,j),b=this.toScreen(i+w,j),cc=this.toScreen(i+w,j+h),d=this.toScreen(i,j+h);
    ctx.fillStyle=r.ok?'rgba(84,170,161,.35)':'rgba(189,75,61,.35)';ctx.strokeStyle=r.ok?'#54aaa1':'#bd4b3d';ctx.lineWidth=2*this.dpr;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();ctx.stroke();
    const im=this.sprite(k,3,'meumeu');const pw=(w+h)/2*TW*z*1.05;if(im){ctx.save();ctx.globalAlpha=.5;ctx.drawImage(im,cc.x-pw/2,cc.y-pw*.95,pw,pw);ctx.restore();}
    // le rayon où il puise
    const ctr=this.toScreen(i+w/2,j+h/2);ctx.save();ctx.strokeStyle='rgba(255,241,201,.25)';ctx.setLineDash([6*z,6*z]);ctx.beginPath();ctx.ellipse(ctr.x,ctr.y,14*TW/2*z*1.41,14*TH/2*z*1.41,0,0,7);ctx.stroke();ctx.restore();
    this.tag(r.ok?`${B.name} : cliquez pour poser`:r.why[0],cc.x,cc.y+14*z,r.ok?'ok':'bad');}
  drawLinePlan(){const L=this.lining;const ctx=this.ctx,z=this.z();const ks=new Set(this.world.canLine('meumeu',L.kind,L.cells).map(String));
    for(const [i,j] of L.cells){const ok=ks.has(String(j*this.world.N+i));const a=this.toScreen(i,j),b=this.toScreen(i+1,j),c=this.toScreen(i+1,j+1),d=this.toScreen(i,j+1);ctx.fillStyle=ok?'rgba(232,191,98,.45)':'rgba(189,75,61,.35)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();}
    const last=L.cells[L.cells.length-1];const q=this.toScreen(last[0]+.5,last[1]+.5);const n=ks.size;const C=LINES[L.kind].cost;this.tag(`${LINES[L.kind].name} : ${n} cases · ${Object.entries(C).map(([r,v])=>v*n+' '+RES[r].name.toLowerCase()).join(', ')}`,q.x,q.y-20*z,'ok');}
  text(t,x,y,color='#fff8e6',size=11){const ctx=this.ctx;ctx.save();ctx.font=`800 ${size*this.dpr*Math.max(.8,Math.min(1.3,this.zoom))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.lineWidth=3.5*this.dpr;ctx.strokeStyle='#173d44';ctx.strokeText(t,x,y);ctx.fillStyle=color;ctx.fillText(t,x,y);ctx.restore();}
  tag(t,x,y,tone='ink',left=false){const ctx=this.ctx;ctx.save();ctx.font=`700 ${11.5*this.dpr}px system-ui,sans-serif`;const w=ctx.measureText(t).width+14*this.dpr,h=20*this.dpr;const x0=left?x:x-w/2;
    ctx.fillStyle={bad:'#bd4b3dee',ok:'#227b7bee',warn:'#c86a1fee',ink:'#173d44e6'}[tone]||'#173d44e6';ctx.beginPath();ctx.roundRect(x0,y-h/2,w,h,6*this.dpr);ctx.fill();ctx.fillStyle='#fff8e6';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(t,x0+7*this.dpr,y+.5);ctx.restore();}
  bar(x,y,w,f,color='#ee7d26'){const ctx=this.ctx,d=this.dpr;ctx.fillStyle='#173d44cc';ctx.fillRect(x-w/2,y,w,5*d);ctx.fillStyle=color;ctx.fillRect(x-w/2+1*d,y+1*d,(w-2*d)*Math.max(0,Math.min(1,f)),3*d);}

  // ---------- la minicarte ----------
  drawMini(mc){const x=mc.getContext('2d');const W=this.world,N=W.N;if(!this.overview)return;const w=mc.width,h=mc.height;x.setTransform(1,0,0,1,0,0);x.fillStyle='#0d2233';x.fillRect(0,0,w,h);
    x.drawImage(this.overview,0,0,w,h);const P=(i,j)=>[(i-j+N)/(2*N)*w,(i+j)/(2*N)*h];
    for(const b of W.s.buildings){const [px,py]=P(b.i+1,b.j+1);x.fillStyle=b.f==='beee'?(b.ruin?'#6a3a30':'#e0503a'):(b.ruin?'#555':'#ffd36a');x.fillRect(px-2,py-1.5,b.k==='centre'?5:3,b.k==='centre'?4:3);}
    for(const [k,r] of Object.entries(W.s.rails)){if(!r.b)continue;const [px,py]=P(+k%N,(+k/N)|0);x.fillStyle='#cfd3d6';x.fillRect(px,py,1,1);}
    for(const u of W.s.units){const [px,py]=P(u.x,u.y);x.fillStyle=u.f==='beee'?'#ff3b2f':u.k==='villageois'?'#fff':'#7fd3f0';x.fillRect(px-1,py-1,2,2);}
    for(const v of W.s.vehicles){const [px,py]=P(v.x,v.y);x.fillStyle=v.f==='beee'?'#ff3b2f':'#9fe8ff';x.beginPath();x.arc(px,py,2.5,0,7);x.fill();}
    // le champ de vision
    const cw=this.canvas.width,ch=this.canvas.height;const cs=[this.toWorld(0,0),this.toWorld(cw,0),this.toWorld(cw,ch),this.toWorld(0,ch)].map(p=>P(p.x,p.y));x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();cs.forEach(([a,b],n)=>n?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.stroke();
    this.miniP=(mx,my)=>{const a=mx/w*2*N-N,b=my/h*2*N;return {x:(a+b)/2,y:(b-a)/2};};}

  // ---------- la souris ----------
  pos(e){const r=this.canvas.getBoundingClientRect();return [(e.clientX-r.left)*this.dpr,(e.clientY-r.top)*this.dpr];}
  unitAt(sx,sy){const W=this.world,z=this.z();let best=null,bd=1e9;for(const u of W.s.units){const q=this.toScreen(u.x,u.y);const dx=sx-q.x,dy=sy-(q.y-14*z);if(Math.abs(dx)<13*z&&dy>-20*z&&dy<18*z){const d=Math.hypot(dx,dy);if(d<bd){bd=d;best=u;}}}return best;}
  vehicleAt(sx,sy){const W=this.world,z=this.z();for(const v of W.s.vehicles){const q=this.toScreen(v.x,v.y,v.alt||0);if(Math.hypot(sx-q.x,sy-(q.y-15*z))<28*z)return v;}return null;}
  bind(){const cv=this.canvas;cv.addEventListener('contextmenu',e=>e.preventDefault());
    cv.addEventListener('pointerdown',e=>{const [sx,sy]=this.pos(e);cv.setPointerCapture(e.pointerId);this.drag={btn:e.button,x0:sx,y0:sy,px:e.clientX,py:e.clientY,moved:false,shift:e.shiftKey};
      if(this.lining&&e.button===0){const w=this.toWorld(sx,sy);this.lining.a=[Math.floor(w.x),Math.floor(w.y)];this.lining.cells=[this.lining.a];}});
    cv.addEventListener('pointermove',e=>{const [sx,sy]=this.pos(e);const w=this.toWorld(sx,sy);const cell=[Math.floor(w.x),Math.floor(w.y)];
      if(this.drag){const D=this.drag;if(Math.hypot(sx-D.x0,sy-D.y0)>6*this.dpr)D.moved=true;
        if(D.moved&&D.btn===1){this.cx-=(e.clientX-D.px)*0/1;const z=this.zoom;const a=-(e.clientX-D.px)/(TW/2*z),b=-(e.clientY-D.py)/(TH/2*z);this.cx+=(a+b)/2;this.cy+=(b-a)/2;}
        else if(this.lining?.a&&D.btn===0)this.lining.cells=this.world.lineCells(this.lining.a[0],this.lining.a[1],cell[0],cell[1]);
        else if(D.moved&&D.btn===0&&!this.placing&&!this.lining)D.box={x0:D.x0,y0:D.y0,x1:sx,y1:sy};
        D.px=e.clientX;D.py=e.clientY;}
      this.hover={cell,sx,sy,w};const u=this.unitAt(sx,sy);let label=null,tone='ink';
      if(this.placing||this.lining)label=null;
      else if(u&&this.ui.unitLabel){label=this.ui.unitLabel(u);tone=u.f==='beee'?'bad':u.h?.state==='hors'?'warn':'ink';}
      else if(this.sel.size&&!u){const t=this.world.targetAt(w.x,w.y);label=this.ui.describe(t);tone=t?.type==='unit'||(t?.type==='building'&&this.world.building(t.id)?.f==='beee')?'bad':'ink';}
      else if(this.selV&&this.ui.vehicleHint)label=this.ui.vehicleHint(w);
      const t=this.world.targetAt(w.x,w.y);if(t?.type==='building')this.hover.b=t.id;this.hover.label=label;this.hover.tone=tone;
      cv.style.cursor=this.placing||this.lining?'crosshair':u?'pointer':this.sel.size?'crosshair':'default';});
    cv.addEventListener('pointerleave',()=>{this.hover=null;});
    cv.addEventListener('pointerup',e=>{const D=this.drag;this.drag=null;if(!D)return;const [sx,sy]=this.pos(e);const w=this.toWorld(sx,sy);
      if(this.lining){if(e.button===2){this.lining=null;this.ui.changed();return;}if(this.lining.cells?.length){this.ui.planLine(this.lining.kind,this.lining.cells);this.lining.cells=null;this.lining.a=null;if(!e.shiftKey){this.lining=null;}}this.ui.changed();return;}
      if(D.btn===1)return;
      if(D.box){const {x0,y0,x1,y1}=D.box;const [a,b]=[Math.min(x0,x1),Math.max(x0,x1)],[c,d]=[Math.min(y0,y1),Math.max(y0,y1)];if(!D.shift)this.sel.clear();this.selB=null;this.selV=null;
        const inBox=this.world.s.units.filter(u=>u.f==='meumeu').filter(u=>{const q=this.toScreen(u.x,u.y);return q.x>=a&&q.x<=b&&q.y-10*this.dpr>=c&&q.y-10*this.dpr<=d;});
        const mil=inBox.filter(u=>u.k!=='villageois');for(const u of (mil.length&&!D.shift?mil:inBox))this.sel.add(u.id);this.ui.changed();return;}
      if(D.moved&&D.btn!==2)return;
      if(this.placing){if(e.button===2){this.placing=null;this.ui.changed();return;}const r=this.ui.place(this.placing,this.ghost[0],this.ghost[1]);if(r.ok&&!e.shiftKey)this.placing=null;return;}
      if(e.button===0){const u=this.unitAt(sx,sy);const v=u?null:this.vehicleAt(sx,sy);
        if(this.ui.pickStop&&!u){const t=this.world.targetAt(w.x,w.y);if(t?.type==='building'){this.ui.pickStop(t.id);return;}}
        if(u&&u.f==='meumeu'){if(D.shift){this.sel.has(u.id)?this.sel.delete(u.id):this.sel.add(u.id);}else{this.sel.clear();this.sel.add(u.id);
            if(e.detail>=2){for(const o of this.world.s.units)if(o.f==='meumeu'&&o.k===u.k){const q=this.toScreen(o.x,o.y);if(q.x>0&&q.y>0&&q.x<this.canvas.width&&q.y<this.canvas.height)this.sel.add(o.id);}}}
          this.selB=null;this.selV=null;this.ui.changed();return;}
        if(u&&u.f!=='meumeu'&&this.ui.unitInfo){this.ui.unitInfo(u);return;}
        if(v){this.sel.clear();this.selB=null;this.selV=v.id;this.ui.changed();return;}
        const t=this.world.targetAt(w.x,w.y);this.sel.clear();this.selV=null;this.selB=t?.type==='building'?t.id:null;this.ui.inspect(t);this.ui.changed();return;}
      if(e.button===2){if(this.selV){this.ui.vehicleOrder(w);return;}if(this.selB&&!this.sel.size){this.ui.rally(w);return;}if(!this.sel.size)return;const t=this.world.targetAt(w.x,w.y);const r=this.ui.order([...this.sel],t);this.marks.push({x:w.x,y:w.y,age:0,bad:!r.ok});}});
    cv.addEventListener('wheel',e=>{e.preventDefault();const [sx,sy]=this.pos(e);const before=this.toWorld(sx,sy);this.zoom=Math.max(.18,Math.min(2,this.zoom*(e.deltaY<0?1.15:1/1.15)));const after=this.toWorld(sx,sy);this.cx+=before.x-after.x;this.cy+=before.y-after.y;},{passive:false});}
  pan(dx,dy){const z=this.zoom;const a=dx/(TW/2*z),b=dy/(TH/2*z);this.cx+=(a+b)/2;this.cy+=(b-a)/2;const N=this.world.N;this.cx=Math.max(0,Math.min(N,this.cx));this.cy=Math.max(0,Math.min(N,this.cy));}
}
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
