// Les Meumeu en vraie 3D (WebGL, three.js embarqué) : la peluche, son squelette, ses organes et ses vaisseaux, pour la fiche
// médicale, les radiographies et la salle de radiologie. Tout est bâti à partir du même plan que la simulation (body.js) :
//  · la peau est une surface lisse, tirée des formes du corps fondues entre elles (une union douce de champs de distance,
//    maillée par « surface nets »), cousue et teinte comme la peluche des planches : crème, manchons fauves aux mains et
//    aux pieds, cornes, yeux boutons, naseaux, sourire brodé, coutures ;
//  · dedans : un cerveau à circonvolutions, un cœur en poire, des côtes une à une, des vertèbres empilées, des os longs
//    à têtes renflées, un bassin en anneau, un intestin enroulé, des artères et des veines luisantes ;
//  · trois manières de voir : la peluche (opaque, les plaies en taches de sang), l'anatomie (la peluche en voile de verre,
//    les organes en couleur) et la radiographie (chaque tissu s'additionne comme sur un film, les bords s'allument).
// Un seul contexte WebGL sert toutes les fenêtres : on rend dans une zone du canevas partagé, puis on la recopie dans le
// canevas 2D de la fenêtre, où s'ajoutent les étiquettes et les chiffres. Le repère du corps a x à la droite du Meumeu
// (un repère « gauche ») : le groupe racine est retourné en x, et la caméra montre la même chose que l'ancienne projection.
import * as THREE from './lib/three.module.js';
import {BODIES,RIB,BLOOD} from './body.js';
import {MATS} from './armor.js';

const FOVDEG=.55*180/Math.PI;
const ALL={peau:true,os:true,organes:true,vaisseaux:true,cavite:true,eclats:true};
const C3=h=>new THREE.Color(h);
const RAW=h=>new THREE.Color().setHex(parseInt(h.slice(1),16),THREE.LinearSRGBColorSpace);   // valeurs d'écran, sans conversion
const SRGB=c=>new THREE.Color().setRGB(c[0]/255,c[1]/255,c[2]/255,THREE.SRGBColorSpace);
const V3=p=>new THREE.Vector3(p[0],p[1],p[2]);
const Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sp2=f=>f==='beee'?'beee':'meumeu';

// ---------- le contexte ----------
let G=null,dead=false;
export function has3d(){return !!init();}
function init(){if(G||dead)return G;
  try{const cv=document.createElement('canvas');
    const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    r.setPixelRatio(1);r.setSize(64,64,false);r.toneMapping=THREE.NeutralToneMapping;r.toneMappingExposure=1.05;r.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();const root=new THREE.Group();root.scale.x=-1;scene.add(root);
    scene.environment=envMap(r);scene.environmentIntensity=.85;
    const key=new THREE.DirectionalLight(0xfff0dc,1.9),rim=new THREE.DirectionalLight(0xcfe0ff,1.5),fill=new THREE.HemisphereLight(0xf2f0ff,0x3a2c22,.35);
    scene.add(key,key.target,rim,rim.target,fill);
    const cam=new THREE.PerspectiveCamera(FOVDEG,1,.002,4);
    G={r,scene,root,key,rim,cam,cw:64,ch:64,models:{},
      bg:{xray:bgTex(['#12283f','#060d18','#010307']),anat:bgTex(['#3a4652','#1c242a','#0c1013']),peluche:bgTex(['#fbf4e6','#efe3cc','#d6c4a4'])},
      geo:{sph:new THREE.SphereGeometry(1,44,30),lo:new THREE.SphereGeometry(1,12,8),cyl:new THREE.CylinderGeometry(1,1,1,16),torus:new THREE.TorusGeometry(1,.1,10,36),
        box:new THREE.BoxGeometry(1,1,1),bullet:bulletGeo(),disc:new THREE.CircleGeometry(1,48)},
      tex:{glow:glowTex(),shadow:glowTex(true)}};
    G.mat=sharedMats();
    return G;}catch(e){console.warn('3D indisponible, rendu 2D',e);dead=true;return null;}}
function envMap(r){const pm=new THREE.PMREMGenerator(r);const sc=new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshBasicMaterial({color:0x2c3138,side:THREE.BackSide})));
  const panel=(w,h,p,k,c=0xffffff)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);sc.add(m);};
  panel(7,3,[0,4.9,0],3.2);panel(3,5,[-4.9,1,1.5],2.4,0xfff0dd);panel(3,5,[4.9,0,-1],1.4,0xdde8ff);panel(5,2,[0,.5,4.9],1.1);panel(4,1,[0,-4.9,0],.35,0xffe4c8);
  const t=pm.fromScene(sc,.035).texture;pm.dispose();return t;}
function bgTex(stops){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');const g=x.createRadialGradient(256,210,20,256,256,380);
  g.addColorStop(0,stops[0]);g.addColorStop(.55,stops[1]);g.addColorStop(1,stops[2]);x.fillStyle=g;x.fillRect(0,0,512,512);
  // un grain très léger, pour que le fond ne fasse pas de marches
  const d=x.getImageData(0,0,512,512);for(let i=0;i<d.data.length;i+=4){const n=(Math.random()-.5)*5;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n;}x.putImageData(d,0,0);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function glowTex(soft){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
  if(soft){g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');}
  else{g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.7)');g.addColorStop(.5,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');}
  x.fillStyle=g;x.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);return t;}

// ---------- les matières ----------
const phys=(c,o={})=>new THREE.MeshPhysicalMaterial({color:C3(c),roughness:.5,...o});
// un voile : opaque sur les bords, presque transparent de face (comme une bulle ou une peau vue en transparence)
function veil(m,a0,a1,p=2){m.transparent=true;m.depthWrite=false;
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
    {float fr=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),${p.toFixed(2)});gl_FragColor.a*=mix(${a0.toFixed(3)},${a1.toFixed(3)},fr);}`);};
  m.customProgramCacheKey=()=>`veil${a0}|${a1}|${p}`;return m;}
const XV=`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vV=-mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`;
const XF=`uniform vec3 uCol;uniform float uBase,uEdge,uPow;uniform vec3 uHurt;varying vec3 vN;varying vec3 vV;
void main(){float f=1.0-abs(dot(normalize(vN),normalize(vV)));float i=uBase+uEdge*pow(f,uPow);gl_FragColor=vec4(uCol*i+uHurt,1.0);}`;
// le film : chaque tissu ajoute sa lumière, les bords (là où le rayon traverse le plus d'épaisseur) s'allument
function xmat(c,base,edge,pw=2.5){return new THREE.ShaderMaterial({uniforms:{uCol:{value:RAW(c)},uBase:{value:base},uEdge:{value:edge},uPow:{value:pw},uHurt:{value:new THREE.Color(0,0,0)}},
  vertexShader:XV,fragmentShader:XF,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});}
function sharedMats(){return {
  hole:phys('#1a0204',{roughness:.6}),
  blood:phys('#6e0710',{roughness:.2,clearcoat:1,clearcoatRoughness:.08}),
  pool:phys('#4f050a',{roughness:.12,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.92}),
  gauze:phys('#f7f3ea',{roughness:.95,sheen:1,sheenColor:C3('#ffffff'),sheenRoughness:.8}),
  tq:phys('#e0ad1f',{roughness:.7,sheen:.6,sheenColor:C3('#fff0b0')}),
  clamp:phys('#9fb8d8',{metalness:1,roughness:.25}),
  track:new THREE.MeshBasicMaterial({color:C3('#ff6a3d'),transparent:true,opacity:.8,depthTest:false,depthWrite:false,toneMapped:false}),
  shadow:new THREE.MeshBasicMaterial({color:C3('#2b1d12'),transparent:true,opacity:.45,depthWrite:false}),
  bullet:phys('#c9793c',{metalness:1,roughness:.26,emissive:C3('#ff8a3a'),emissiveIntensity:.45,depthTest:false,depthWrite:false,transparent:true}),
  trackCol:new THREE.MeshBasicMaterial({vertexColors:true,depthTest:false,depthWrite:false,transparent:true,toneMapped:false}),
  trackDark:new THREE.MeshBasicMaterial({color:C3('#1e0204'),transparent:true,opacity:.7,depthTest:false,depthWrite:false,toneMapped:false}),
};}
// la couleur de chaque organe (anatomie) et sa lumière sur le film (radiographie)
const TINT={foie:'#6e2019',rate:'#5e2336',panse:'#b39670',bonnet:'#ae8466',feuillet:'#a4836b',caillette:'#c98c84',reinD:'#842c2c',reinG:'#842c2c',intestins:'#e2a393',vessie:'#e6cf7a',moelle:'#f0e0a0',trachee:'#dca8a4',cerveau:'#eab8bf',tronc:'#e2b0b8'};
const KIND={bone:'#efe4c9',lung:'#eaa0a6',heart:'#a51d2a',organ:'#9c4a3c',cns:'#e6bcc4',artery:'#cf2621',vein:'#3350ad',air:'#9fb6c8',airway:'#dca8a4',eye:'#1c120d'};
function anatMat(p){const c=TINT[p.id]||KIND[p.kind]||'#aaa';
  if(p.kind==='bone'){const m=phys(c,{roughness:.55,clearcoat:.15,sheen:.3,sheenColor:C3('#fff8e8')});return p.shell&&p.id!=='bassinos'?veil(m,.1,.85,1.6):m;}
  if(p.kind==='artery'||p.kind==='vein')return phys(c,{roughness:.28,clearcoat:.9,clearcoatRoughness:.15});
  if(p.kind==='heart')return phys(c,{roughness:.32,clearcoat:.8,clearcoatRoughness:.2,sheen:.4,sheenColor:C3('#ff9090')});
  if(p.kind==='lung')return phys(c,{roughness:.62,sheen:.8,sheenColor:C3('#ffd6d8'),sheenRoughness:.5});
  if(p.kind==='eye')return phys(c,{roughness:.15,clearcoat:1,clearcoatRoughness:.03});
  if(p.kind==='air')return veil(phys(c,{roughness:.3}),.03,.35,2);
  if(p.kind==='cns')return phys(c,{roughness:.45,clearcoat:.35,sheen:.5,sheenColor:C3('#ffe6ea')});
  if(p.id==='vessie')return veil(phys(c,{roughness:.25,clearcoat:.8}),.55,.95,1.5);
  return phys(c,{roughness:.38,clearcoat:.7,clearcoatRoughness:.22});}
function xrayMat(p){switch(p.kind){
  case 'bone':return p.shell?xmat('#dce8ff',.05,.62,2.2):xmat('#dce8ff',.26,.32,1.4);
  case 'artery':return xmat('#ff3a34',.55,.35,1.5);case 'vein':return xmat('#5c6cff',.42,.3,1.5);
  case 'heart':return xmat('#c75a74',.16,.35,2);case 'cns':return xmat('#ffe6a8',p.id==='cerveau'?.07:.3,.3,2);
  case 'eye':return xmat('#9fc8e8',.1,.45,2);case 'lung':return xmat('#4a6c88',.012,.16,2.5);case 'air':return xmat('#243848',.0,.12,3);
  case 'airway':return xmat('#9fbcd8',.08,.3,2);default:return xmat(p.gut?'#4f8a90':'#5a7ea8',.035,.2,2.2);}}

// ---------- les formes : champs de distance ----------
function sdS(s,x,y,z){
  if(s.t==='sph')return Math.hypot(x-s.c[0],y-s.c[1],z-s.c[2])-s.r;
  if(s.t==='ell'){const px=x-s.c[0],py=y-s.c[1],pz=z-s.c[2],a=s.r[0],b=s.r[1],c=s.r[2];const k0=Math.hypot(px/a,py/b,pz/c);const k1=Math.hypot(px/(a*a),py/(b*b),pz/(c*c));return k1<1e-12?-Math.min(a,b,c):k0*(k0-1)/k1;}
  const ax=s.b[0]-s.a[0],ay=s.b[1]-s.a[1],az=s.b[2]-s.a[2],px=x-s.a[0],py=y-s.a[1],pz=z-s.a[2];let h=(px*ax+py*ay+pz*az)/(ax*ax+ay*ay+az*az);h=h<0?0:h>1?1:h;
  return Math.hypot(px-ax*h,py-ay*h,pz-az*h)-s.r;}
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function bounds(s){if(s.t==='sph')return [s.c.map(v=>v-s.r),s.c.map(v=>v+s.r)];if(s.t==='ell')return [s.c.map((v,i)=>v-s.r[i]),s.c.map((v,i)=>v+s.r[i])];
  return [s.a.map((v,i)=>Math.min(v,s.b[i])-s.r),s.a.map((v,i)=>Math.max(v,s.b[i])+s.r)];}

// La peau : les grandes formes fondues largement (k = 11 mm), les oreilles juste raccordées ; maillée par « surface nets »
// (un sommet par cellule traversée, à la moyenne des passages), puis chaque sommet est reposé sur la surface exacte.
const CREAM='#efe2c8',MUZZLE='#f3e8d3',TAN='#cda277',EARIN='#d8ae86',HORN='#d7b083',STITCH='#a67a52',BUTTON='#3a2416';
function buildSkin(B){const main=[],ears=[];for(const r of B.REGIONS){if(r.horn||r.hair)continue;(/^oreille/.test(r.id)?ears:main).push(r);}
  const K=.011,KE=.0045,h=.0019,S=[...main.map(r=>[r,K]),...ears.map(r=>[r,KE])];
  const sdf=(x,y,z)=>{let d=.05;for(const [r,k] of S)d=smin(d,sdS(r.shape,x,y,z),k);return d;};
  const lo=[1,1,1],hi=[-1,-1,-1];for(const [r] of S){const [a,b]=bounds(r.shape);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],a[i]);hi[i]=Math.max(hi[i],b[i]);}}
  for(let i=0;i<3;i++){lo[i]-=.008;hi[i]+=.008;}
  const nx=Math.ceil((hi[0]-lo[0])/h)+1,ny=Math.ceil((hi[1]-lo[1])/h)+1,nz=Math.ceil((hi[2]-lo[2])/h)+1,NXY=nx*ny;
  const g=new Float32Array(nx*ny*nz).fill(.05);
  for(const [r,k] of S){const [a,b]=bounds(r.shape);const e=k+.006;const s=r.shape;
    const i0=Math.max(0,Math.floor((a[0]-e-lo[0])/h)),i1=Math.min(nx-1,Math.ceil((b[0]+e-lo[0])/h));
    const j0=Math.max(0,Math.floor((a[1]-e-lo[1])/h)),j1=Math.min(ny-1,Math.ceil((b[1]+e-lo[1])/h));
    const k0=Math.max(0,Math.floor((a[2]-e-lo[2])/h)),k1=Math.min(nz-1,Math.ceil((b[2]+e-lo[2])/h));
    for(let kk=k0;kk<=k1;kk++){const z=lo[2]+kk*h;for(let j=j0;j<=j1;j++){const y=lo[1]+j*h;let idx=i0+nx*j+NXY*kk;for(let i=i0;i<=i1;i++,idx++){const d=sdS(s,lo[0]+i*h,y,z);g[idx]=smin(g[idx],d,k);}}}}
  // les sommets
  const OFF=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];const CI=OFF.map(o=>o[0]+nx*o[1]+NXY*o[2]);
  const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const vid=new Int32Array(g.length).fill(-1);const P=[];const v=new Float32Array(8);
  for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++){let base=nx*j+NXY*k;for(let i=0;i<nx-1;i++,base++){let m=0;for(let c=0;c<8;c++){v[c]=g[base+CI[c]];if(v[c]<0)m|=1<<c;}if(m===0||m===255)continue;
      let sx=0,sy=0,sz=0,n=0;for(const [a,b] of E){const va=v[a],vb=v[b];if((va<0)===(vb<0))continue;const t=va/(va-vb);const A=OFF[a],Bq=OFF[b];sx+=A[0]+(Bq[0]-A[0])*t;sy+=A[1]+(Bq[1]-A[1])*t;sz+=A[2]+(Bq[2]-A[2])*t;n++;}
      vid[base]=P.length/3;P.push(lo[0]+(i+sx/n)*h,lo[1]+(j+sy/n)*h,lo[2]+(k+sz/n)*h);}}
  // les faces : une par arête de la grille qui traverse la surface, entre les quatre cellules qui la partagent
  const I=[];const quad=(a,b,c,d)=>{if(a<0||b<0||c<0||d<0)return;I.push(a,b,c,a,c,d);};
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const base=i+nx*j+NXY*k;const a=g[base]<0;
    if(i<nx-1&&j>0&&k>0&&a!==(g[base+1]<0))quad(vid[base-nx-NXY],vid[base-NXY],vid[base],vid[base-nx]);
    if(j<ny-1&&i>0&&k>0&&a!==(g[base+nx]<0))quad(vid[base-1-NXY],vid[base-NXY],vid[base],vid[base-1]);
    if(k<nz-1&&i>0&&j>0&&a!==(g[base+NXY]<0))quad(vid[base-1-nx],vid[base-nx],vid[base],vid[base-1]);}
  // reposés sur la surface, les normales du champ (lisses), l'orientation des faces corrigée d'après elles
  const nv=P.length/3,pos=new Float32Array(P),nor=new Float32Array(nv*3),e=.0005;
  const grad=(x,y,z)=>{const gx=sdf(x+e,y,z)-sdf(x-e,y,z),gy=sdf(x,y+e,z)-sdf(x,y-e,z),gz=sdf(x,y,z+e)-sdf(x,y,z-e);const l=Math.hypot(gx,gy,gz)||1;return [gx/l,gy/l,gz/l];};
  for(let q=0;q<nv;q++){let x=pos[3*q],y=pos[3*q+1],z=pos[3*q+2];const d=sdf(x,y,z);let n=grad(x,y,z);x-=d*n[0];y-=d*n[1];z-=d*n[2];n=grad(x,y,z);pos[3*q]=x;pos[3*q+1]=y;pos[3*q+2]=z;nor.set(n,3*q);}
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];const ux=pos[3*b]-pos[3*a],uy=pos[3*b+1]-pos[3*a+1],uz=pos[3*b+2]-pos[3*a+2],wx=pos[3*c]-pos[3*a],wy=pos[3*c+1]-pos[3*a+1],wz=pos[3*c+2]-pos[3*a+2];
    const fx=uy*wz-uz*wy,fy=uz*wx-ux*wz,fz=ux*wy-uy*wx;const s=fx*(nor[3*a]+nor[3*b]+nor[3*c])+fy*(nor[3*a+1]+nor[3*b+1]+nor[3*c+1])+fz*(nor[3*a+2]+nor[3*b+2]+nor[3*c+2]);if(s<0){I[t+1]=c;I[t+2]=b;}}
  // les couleurs de la peluche
  const col=new Float32Array(nv*3);const cc={};for(const k of [CREAM,MUZZLE,TAN,EARIN])cc[k]=C3(k);
  for(let q=0;q<nv;q++){const x=pos[3*q],y=pos[3*q+1],z=pos[3*q+2];let best=null,bd=1e9;for(const [r] of S){const d=sdS(r.shape,x,y,z);if(d<bd){bd=d;best=r;}}
    let k=CREAM;if(best.hoof||(best.limb==='leg'&&y<.029)||(best.id.startsWith('avbras')&&y<.104))k=TAN;else if(best.id==='museau')k=MUZZLE;else if(best.id.startsWith('oreille')&&nor[3*q+2]>.3)k=EARIN;
    const n=1+.03*Math.sin(x*1900+Math.sin(y*1300)*2)*Math.sin(y*1700+z*900);const c=cc[k];col[3*q]=c.r*n;col[3*q+1]=c.g*n;col[3*q+2]=c.b*n;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setIndex(I);geo.computeBoundingSphere();
  // un point de la surface, en partant de l'intérieur dans une direction
  const surf=(c,dir)=>{const l=Math.hypot(...dir);const u=dir.map(v=>v/l);let t0=0,t1=0;while(t1<.15&&sdf(c[0]+u[0]*t1,c[1]+u[1]*t1,c[2]+u[2]*t1)<0){t0=t1;t1+=.002;}
    for(let n=0;n<14;n++){const tm=(t0+t1)/2;if(sdf(c[0]+u[0]*tm,c[1]+u[1]*tm,c[2]+u[2]*tm)<0)t0=tm;else t1=tm;}const p=c.map((v,i)=>v+u[i]*t1);return {p,n:grad(...p)};};
  return {geo,sdf,grad,surf,verts:nv};}

// ---------- les pièces ----------
function place(m,a,b){const A=V3(a),B=V3(b);const d=B.clone().sub(A);const L=d.length();m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(Y,d.normalize());return L;}
const dist3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function capMesh(a,b,r,mat){const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(1e-4,dist3(a,b)),6,14),mat);place(m,a,b);return m;}
function ellMesh(c,r,mat,geo){const m=new THREE.Mesh(geo||G.geo.sph,mat);m.position.set(c[0],c[1],c[2]);if(typeof r==='number')m.scale.setScalar(r);else m.scale.set(r[0],r[1],r[2]);return m;}
function tubeGeo(pts,r,seg=48,rs=10,rad=null){const curve=new THREE.CatmullRomCurve3(pts.map(V3));const geo=new THREE.TubeGeometry(curve,seg,r,rs,false);
  if(rad){const p=geo.attributes.position;const c=new THREE.Vector3();for(let i=0;i<=seg;i++){const u=i/seg;curve.getPointAt(u,c);const k=rad(u);for(let j=0;j<=rs;j++){const q=i*(rs+1)+j;p.setXYZ(q,c.x+(p.getX(q)-c.x)*k,c.y+(p.getY(q)-c.y)*k,c.z+(p.getZ(q)-c.z)*k);}}geo.computeVertexNormals();}
  return {geo,curve};}
function tubeMesh(pts,r,mat,o={}){const {geo,curve}=tubeGeo(pts,r,o.seg,o.rs,o.rad);const grp=new THREE.Group();grp.add(new THREE.Mesh(geo,mat));
  if(o.caps!==false){const re=o.rad?r*o.rad(1):r;for(const [u,rr] of [[0,o.rad?r*o.rad(0):r],[1,re]]){const m=new THREE.Mesh(G.geo.sph,mat);m.position.copy(curve.getPointAt(u));m.scale.setScalar(rr);grp.add(m);}}return grp;}
// un os long : une tige, deux têtes renflées
function longBone(s,mat){const g=new THREE.Group();g.add(capMesh(s.a,s.b,s.r*.78,mat));for(const p of [s.a,s.b])g.add(ellMesh(p,s.r*1.22,mat));return g;}
function brainGeo(){const g=new THREE.SphereGeometry(1,120,84);const p=g.attributes.position;const v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=v.clone().normalize();const groove=.13*Math.exp(-(n.x*n.x)/.004)*(n.y>-.4?1:.3);
    const gy=.03*Math.sin(17*n.y+5*Math.sin(8*n.z)+3*n.x)*Math.sin(15*n.z+4*Math.sin(7*n.x))+.012*Math.sin(40*n.x+30*n.y);v.copy(n).multiplyScalar(1-groove+gy);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
function heartGeo(){const g=new THREE.SphereGeometry(1,48,36);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i);const k=y<0?1+.55*y:1+.08*y;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k*(1-.08*Math.max(0,p.getX(i))));}g.computeVertexNormals();return g;}
function kidneyGeo(side){const g=new THREE.SphereGeometry(1,36,24);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(x*side<0)p.setX(i,x*(1-.55*Math.exp(-y*y*6)));}g.computeVertexNormals();return g;}
function gutGeo(s){const pts=[];const [cx,cy,cz]=s.c,[rx,ry,rz]=s.r;const N=150;
  for(let i=0;i<=N;i++){const u=i/N;const th=u*Math.PI*2*5.5;const rho=.3+.42*(.5+.5*Math.sin(7*th+u*5));pts.push([cx+rx*.9*rho*Math.cos(th),cy+ry*(.62-1.24*u)+ry*.12*Math.sin(th*3),cz+rz*.9*rho*Math.sin(th)]);}
  return tubeGeo(pts,.0043,420,9).geo;}
function ribsGeo(s){const out=[];const [rx,ry,rz]=s.r;
  for(let n=Math.ceil((s.c[1]-ry)/RIB);n*RIB<s.c[1]+ry;n++){const y=(n+.26)*RIB;const f=1-((y-s.c[1])/ry)**2;if(f<=.06)continue;const sf=Math.sqrt(f);
    for(const side of [1,-1]){const pts=[];for(let i=0;i<=14;i++){const u=i/14;const an=-Math.PI/2+side*(.2+u*(Math.PI-.62));pts.push([s.c[0]+rx*sf*Math.cos(an)*(1-.05*u),y-.009*u*u,s.c[2]+rz*sf*Math.sin(an)]);}
      out.push(tubeGeo(pts,.0014+.0004*sf,28,7,u=>1-.3*u).geo);}}
  return out;}
function vertebrae(s,mat){const g=new THREE.Group();const A=V3(s.a),B=V3(s.b);const d=B.clone().sub(A);const L=d.length();const n=Math.max(4,Math.round(L/.0058));const q=new THREE.Quaternion().setFromUnitVectors(Y,d.clone().normalize());
  for(let i=0;i<n;i++){const u=(i+.5)/n;const c=A.clone().addScaledVector(d,u);const w=s.r*(1.05-.25*u);
    const body=new THREE.Mesh(G.geo.cyl,mat);body.position.copy(c);body.quaternion.copy(q);body.scale.set(w,L/n*.72,w);g.add(body);
    const sp=new THREE.Mesh(G.geo.sph,mat);sp.position.copy(c).add(new THREE.Vector3(0,-.001,-w*1.35));sp.scale.set(w*.28,L/n*.3,w*.75);g.add(sp);
    for(const x of [-1,1]){const tr=new THREE.Mesh(G.geo.sph,mat);tr.position.copy(c).add(new THREE.Vector3(x*w*1.05,0,-w*.35));tr.scale.set(w*.6,L/n*.22,w*.25);g.add(tr);}}
  return g;}
function pelvis(s,mat){const g=new THREE.Group();const ring=new THREE.Mesh(G.geo.torus,mat);ring.position.set(s.c[0],s.c[1]-s.r[1]*.25,s.c[2]+.004);ring.rotation.x=Math.PI/2*.8;ring.scale.set(s.r[0]*.62,s.r[2]*.66,s.r[1]*1.5);g.add(ring);
  for(const x of [-1,1]){const w=new THREE.Mesh(G.geo.sph,mat);w.position.set(s.c[0]+x*s.r[0]*.62,s.c[1]+s.r[1]*.35,s.c[2]-.006);w.scale.set(s.r[0]*.42,s.r[1]*.85,.0045);w.rotation.y=x*.55;w.rotation.z=-x*.25;g.add(w);}
  const sac=new THREE.Mesh(G.geo.sph,mat);sac.position.set(s.c[0],s.c[1]+.002,s.c[2]-s.r[2]*.8);sac.scale.set(.009,.014,.005);g.add(sac);return g;}
function trachea(s,mat){const g=tubeMesh([s.a,s.b],s.r*.9,mat,{seg:8});const n=Math.round(dist3(s.a,s.b)/.0028);
  for(let i=1;i<n;i++){const u=i/n;const c=s.a.map((v,k)=>v+(s.b[k]-v)*u);const r=new THREE.Mesh(G.geo.torus,mat);r.position.set(...c);r.quaternion.setFromUnitVectors(Z,V3(s.b).sub(V3(s.a)).normalize());r.scale.setScalar(s.r*1.02);g.add(r);}return g;}
function partObject(p,mat){const s=p.shape;
  if(p.id==='cerveau')return ellMesh(s.c,s.r,mat,brainGeo());
  if(p.id==='coeur'){const m=ellMesh(s.c,s.r,mat,heartGeo());m.rotation.set(.3,0,-.4);return m;}
  if(p.id==='reinD'||p.id==='reinG')return ellMesh(s.c,s.r,mat,kidneyGeo(p.id==='reinD'?-1:1));
  if(p.id==='intestins')return new THREE.Mesh(gutGeo(s),mat);
  if(p.id==='rachis')return vertebrae(s,mat);
  if(p.ribs){const g=new THREE.Group();for(const geo of ribsGeo(s))g.add(new THREE.Mesh(geo,mat));return g;}
  if(p.id==='bassinos')return pelvis(s,mat);
  if(p.id==='crosse'){const m=s.a.map((v,i)=>(v+s.b[i])/2);m[1]+=.011;return tubeMesh([s.a,m,s.b],s.r,mat,{seg:24});}
  if(p.id==='trachee')return trachea(s,mat);
  if(s.t==='cap'&&p.kind==='bone'&&!p.horn&&dist3(s.a,s.b)>.012)return longBone(s,mat);
  if(s.t==='cap')return capMesh(s.a,s.b,s.r,mat);
  return ellMesh(s.c,s.r,mat);}

// ---------- la peluche : ses détails cousus ----------
function plushBits(B,S){const out=[];const R=B.REGION;
  const mk=(obj,c,o={})=>{const plush=phys(c,{roughness:.85,sheen:.8,sheenColor:C3('#fff4e0'),sheenRoughness:.6,...o});out.push({obj,plush,ghost:veil(plush.clone(),.08,.7,2),xr:o.xr?xmat('#8fb8e0',.02,.45,2.5):null});
    obj.traverse(m=>{if(m.isMesh)m.material=plush;});return obj;};
  const onR=(reg,l)=>{const s=reg.shape;return S.surf(s.c,[l[0]*s.r[0],l[1]*s.r[1],l[2]*s.r[2]]);};
  // les cornes : effilées, un peu recourbées ; celles du Bèè annelées
  for(const r of B.REGIONS.filter(r=>r.horn)){const s=r.shape;const a=s.a.map((v,i)=>v-(s.b[i]-v)*.35);const m=s.a.map((v,i)=>(v+s.b[i])/2);const bee=B.sp==='beee';
    m[0]+=r.side*(bee?.002:.006);m[1]+=bee?.004:-.003;
    const rad=bee?(u=>(1-.62*u)*(1+.07*Math.sin(u*44))):(u=>1-.6*u);mk(tubeMesh([a,m,s.b],s.r*1.05,null,{seg:40,rs:14,rad}),HORN,{xr:1,roughness:.7,sheen:.4});}
  // la barbiche du Bèè
  for(const r of B.REGIONS.filter(r=>r.hair)){const s=r.shape;const b=s.b.slice();b[1]-=.006;b[2]+=.004;mk(tubeMesh([s.a,s.b,b],s.r,null,{seg:20,rs:10,rad:u=>1-.8*u}),TAN,{roughness:.95});}
  // les yeux boutons
  const eyeY=B.sp==='beee'?-.12:-.14;for(const x of [-.52,.52]){const q=onR(R.tete,[x,eyeY,1]);mk(ellMesh(q.p.map((v,i)=>v-q.n[i]*.0012),.0042),BUTTON,{roughness:.12,clearcoat:1,clearcoatRoughness:.04,sheen:0});}
  // les naseaux, le sourire brodé, la couture du chanfrein ; la couture du ventre
  const line=(pts,r=.00085,dash=false)=>{if(!dash)return mk(tubeMesh(pts,r,null,{seg:40,rs:6}),STITCH,{roughness:.9,sheen:.2});
    const g=new THREE.Group();for(let i=0;i<pts.length-1;i+=2)g.add(capMesh(pts[i],pts[i+1],r*.9,null));return mk(g,STITCH,{roughness:.9,sheen:.2});};
  const sn=R.museau;const lift=(q,k=.0003)=>q.p.map((v,i)=>v+q.n[i]*k);
  if(B.sp==='beee'){const V=[[-.42,.12,1],[0,-.08,1],[.42,.12,1]].map(l=>lift(onR(sn,l)));line(V,.0011);line([lift(onR(sn,[0,-.08,1])),lift(onR(sn,[0,-.32,1]))],.0009);}
  else for(const x of [-.46,.46]){const q=onR(sn,[x,.32,1]);mk(ellMesh(q.p.map((v,i)=>v-q.n[i]*.0008),[.0036,.0044,.0036]),'#5b3a26',{roughness:.5,sheen:.2});}
  const smile=[];for(let i=0;i<=12;i++){const u=-1+2*i/12;smile.push(lift(onR(sn,[u*.62,-.34+.26*u*u+(B.sp==='beee'?-.04:0),1])));}line(smile);
  const seam=[];for(let i=0;i<=22;i++){const u=-1+2*i/22;seam.push(lift(onR(sn,[u*.92,.7-.12*u*u,.72])));}line(seam,.0008,true);
  const belly=[];for(let i=0;i<=12;i++){const u=i/12;belly.push(lift(onR(R.abdomen,[-(.22+.42*u),.12+.3*Math.sin(Math.PI*u),1])));}line(belly,.0008,true);
  return out;}

function model(sp){const g=init();sp=sp2(sp);if(g.models[sp])return g.models[sp];const B=BODIES[sp];const t0=performance.now();
  const S=buildSkin(B);const group=new THREE.Group();
  const plush=phys('#ffffff',{vertexColors:true,roughness:.93,sheen:1,sheenRoughness:.5,sheenColor:C3('#fff1d8')});
  const skin={obj:new THREE.Mesh(S.geo,plush),plush,ghost:veil(phys('#ffffff',{vertexColors:true,roughness:.8,sheen:.6,sheenColor:C3('#fff1d8')}),.045,.55,2.4),xr:xmat('#6f9fcc',.012,.55,3)};
  const skins=[skin,...plushBits(B,S)];for(const s of skins){s.obj.renderOrder=5;group.add(s.obj);}
  const parts=[];for(const p of B.PARTS){const an=anatMat(p),xr=xrayMat(p);const obj=partObject(p,an);const layer=p.kind==='bone'?'os':p.kind==='artery'||p.kind==='vein'?'vaisseaux':'organes';
    const meshes=[];obj.traverse(m=>{if(m.isMesh){m.material=an;meshes.push(m);}});group.add(obj);parts.push({p,obj,meshes,an,xr,layer});}
  const shadow=new THREE.Mesh(G.geo.disc,new THREE.MeshBasicMaterial({map:G.tex.shadow,color:C3('#2b1d12'),transparent:true,opacity:.5,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.0004,0);shadow.scale.set(.11,.08,1);group.add(shadow);
  const M={sp,B,S,group,skins,parts,byPart:new Map(parts.map(x=>[x.p,x])),byName:new Map(),shadow,ms:performance.now()-t0};
  for(const x of parts){const l=M.byName.get(x.p.name)||[];l.push(x.p);M.byName.set(x.p.name,l);}
  g.models[sp]=M;return M;}
// on prépare les deux corps sans attendre la première blessure
export function warm(){if(!init())return;const go=sp=>()=>{try{model(sp);}catch(e){console.warn(e);}};(window.requestIdleCallback||setTimeout)(go('meumeu'));setTimeout(go('beee'),1500);}

function applyMode(M,mode,L,hurt,t){const xr=mode==='xray',pl=mode==='peluche';
  for(const s of M.skins){const m=xr?s.xr:pl?s.plush:s.ghost;s.obj.visible=!!(L.peau&&m);if(m)s.obj.traverse(o=>{if(o.isMesh)o.material=m;});}
  M.shadow.visible=!xr;
  for(const x of M.parts){x.obj.visible=!pl&&!!L[x.layer]&&!(xr&&x.p.kind==='air');const m=xr?x.xr:x.an;for(const me of x.meshes)me.material=m;
    const h=hurt?.get(x.p);if(xr)x.xr.uniforms.uHurt.value.setRGB(0,0,0);else x.an.emissive.setRGB(0,0,0);
    if(h){const c=SRGB(h.col);if(xr)x.xr.uniforms.uHurt.value.copy(c).multiplyScalar(.55*h.k);else{x.an.emissive.copy(c);x.an.emissiveIntensity=.9*h.k;}}}}

// ---------- rendre ----------
// cam : {C, f} dans le repère du corps (la même caméra que l'ancienne projection)
export function render3d(ctx,W,H,cam,{sp='meumeu',mode='anat',layers=ALL,hurt=null,fx=null,t=0}={}){const g=init();if(!g)return false;
  const M=model(sp);applyMode(M,mode,layers,hurt,t);g.root.add(M.group);const fxs=fx?[].concat(fx):[];for(const f of fxs)g.root.add(f);
  const C=cam.C,f=cam.f;const cm=g.cam;cm.position.set(-C[0],C[1],C[2]);cm.up.set(0,1,0);cm.lookAt(-(C[0]+f[0]),C[1]+f[1],C[2]+f[2]);cm.aspect=W/H;cm.near=Math.max(.002,cam.dist*.05||.002);cm.updateProjectionMatrix();
  // la lumière suit la caméra : une clé en haut à gauche, un contre-jour derrière
  const fw=new THREE.Vector3();cm.getWorldDirection(fw);const rt=new THREE.Vector3().crossVectors(fw,Y).normalize();const tg=cm.position.clone().addScaledVector(fw,cam.dist||.5);
  g.key.position.copy(tg).addScaledVector(fw,-1).addScaledVector(Y,.9).addScaledVector(rt,-.7);g.key.target.position.copy(tg);
  g.rim.position.copy(tg).addScaledVector(fw,1).addScaledVector(Y,.6).addScaledVector(rt,.5);g.rim.target.position.copy(tg);
  g.scene.background=g.bg[mode]||g.bg.anat;
  if(g.cw<W||g.ch<H){g.cw=Math.max(g.cw,W);g.ch=Math.max(g.ch,H);g.r.setSize(g.cw,g.ch,false);}
  g.r.setViewport(0,0,W,H);g.r.setScissor(0,0,W,H);g.r.setScissorTest(true);g.r.render(g.scene,cm);
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(g.r.domElement,0,g.ch-H,W,H,0,0,W,H);
  g.root.remove(M.group);for(const f of fxs)g.root.remove(f);return true;}

// ---------- les balles dans le corps (radiographies, salle de radiologie) ----------
const RAMP=[[0,[140,16,26]],[.3,[240,70,40]],[.6,[255,180,60]],[1,[255,248,222]]];
function ramp(f){f=clamp(f,0,1);let i=1;while(i<RAMP.length-1&&RAMP[i][0]<f)i++;const [f0,c0]=RAMP[i-1],[f1,c1]=RAMP[i];const q=(f-f0)/((f1-f0)||1);return SRGB(c0.map((v,k)=>v+(c1[k]-v)*q));}
const RS=10;
function trackGeo(P,rad,colf){const n=P.length;const full=new Float32Array(n*RS*3),cols=new Float32Array(n*RS*3);let T=[0,0,1];
  for(let k=0;k<n;k++){const a=P[Math.max(0,k-1)].p,b=P[Math.min(n-1,k+1)].p;const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];const l=Math.hypot(...d);if(l>1e-9)T=d.map(v=>v/l);
    const ref=Math.abs(T[1])<.9?[0,1,0]:[1,0,0];let N=[T[1]*ref[2]-T[2]*ref[1],T[2]*ref[0]-T[0]*ref[2],T[0]*ref[1]-T[1]*ref[0]];const nl=Math.hypot(...N);N=N.map(v=>v/nl);
    const Bn=[T[1]*N[2]-T[2]*N[1],T[2]*N[0]-T[0]*N[2],T[0]*N[1]-T[1]*N[0]];const r=rad(k);const c=colf?colf(k):null;
    for(let j=0;j<RS;j++){const an=j/RS*Math.PI*2,cs=Math.cos(an),sn=Math.sin(an);const o=(k*RS+j)*3;for(let i=0;i<3;i++)full[o+i]=P[k].p[i]+(N[i]*cs+Bn[i]*sn)*r;if(c){cols[o]=c.r;cols[o+1]=c.g;cols[o+2]=c.b;}}}
  const I=[];for(let k=0;k<n-1;k++)for(let j=0;j<RS;j++){const a=k*RS+j,b=k*RS+(j+1)%RS,c=(k+1)*RS+j,d=(k+1)*RS+(j+1)%RS;I.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(full.slice(),3));if(colf)geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.setIndex(I);geo.setDrawRange(0,0);
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),10);return {geo,full,n};}
function trackTo(T,s){const pos=T.geo.attributes.position;const a=pos.array;a.set(T.full);const n=T.n;
  if(!s.done&&s.i<n-1){const o0=s.i*RS*3,o1=(s.i+1)*RS*3;for(let q=0;q<RS*3;q++)a[o1+q]=T.full[o0+q]+(T.full[o1+q]-T.full[o0+q])*s.fr;}
  pos.needsUpdate=true;T.geo.setDrawRange(0,(s.done?n-1:Math.min(n-1,s.i+1))*RS*6);}
function sceneFx(sc){if(sc._fx)return sc._fx;const g=init();const grp=new THREE.Group();
  const items=sc.bullets.map(b=>{const P=b.P;const rad=k=>Math.max(.0011,(P[k].d||1.8)/2000*1.05);
    const dark=trackGeo(P,k=>rad(k)*1.7);const col=trackGeo(P,rad,k=>ramp(P[k].v/b.vIn));
    const md=new THREE.Mesh(dark.geo,g.mat.trackDark),mc=new THREE.Mesh(col.geo,g.mat.trackCol);md.renderOrder=30;mc.renderOrder=31;md.frustumCulled=mc.frustumCulled=false;grp.add(md,mc);
    const bullet=new THREE.Mesh(g.geo.bullet,g.mat.bullet);bullet.renderOrder=33;bullet.frustumCulled=false;grp.add(bullet);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:g.tex.glow,color:C3('#ffd9a0'),blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true}));glow.renderOrder=32;grp.add(glow);
    const cav=b.tc.map(q=>{const m=new THREE.Mesh(g.geo.sph,xmat('#ff8c50',.03,.6,2));m.renderOrder=25;m.position.set(...q.p);grp.add(m);return {m,q};});
    const frags=b.frags.map(f=>{const geo=new THREE.BufferGeometry().setFromPoints(f.pts.map(q=>V3(q.p)));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:C3(f.bone?'#eef3ff':'#ffc46e'),transparent:true,opacity:.9,depthTest:false,depthWrite:false,toneMapped:false}));
      line.renderOrder=34;line.frustumCulled=false;const head=new THREE.Mesh(g.geo.lo,new THREE.MeshBasicMaterial({color:C3('#ffe6b0'),depthTest:false,toneMapped:false}));head.renderOrder=35;head.scale.setScalar(.0011);grp.add(line,head);return {f,line,head};});
    // le sang : chaque vaisseau ouvert jaillit (une artère bat, en jets ; une veine coule), une fois la balle passée
    const blood=b.bleeds.map(v=>{const n=v.art?36:18;const m=new THREE.InstancedMesh(g.geo.lo,g.mat.blood,n);m.renderOrder=36;m.frustumCulled=false;m.count=0;grp.add(m);
      const r0=mulberry(Math.round(v.p[0]*1e5+v.p[1]*3e5));const dirs=[];for(let i=0;i<n;i++){const a=r0()*6.283,u=r0()*2-1;dirs.push([Math.sqrt(1-u*u)*Math.cos(a),Math.abs(u)*.8+.2,Math.sqrt(1-u*u)*Math.sin(a)]);}return {v,m,n,dirs};});
    return {b,dark,col,md,mc,bullet,glow,cav,frags,blood};});
  // la protection de la victime, sur le poitrail et la tête : plastron, dos, flancs, casque — la matière et son épaisseur
  const e0=sc.events[0];if(e0?.armor){const M=model(e0.vf);const reg=id=>M.B.REGIONS.find(r=>r.id===id)?.shape;const th=reg('thorax'),ab=reg('abdomen'),hd=reg('tete');
    const mat=m=>{const X=MATS[m]||{};return new THREE.MeshStandardMaterial({color:C3(X.col||'#888'),roughness:X.soft?.95:.35,metalness:m==='acier'?.75:m==='composite'?.25:0,transparent:true,opacity:X.soft?.55:.7,side:THREE.DoubleSide,depthWrite:false});};
    const patch=(c,r,t,p0,pl,t0,tl,m)=>{const geo=new THREE.SphereGeometry(1,28,14,p0,pl,t0,tl);const mesh=new THREE.Mesh(geo,mat(m));const pad=.003+t/1000;mesh.scale.set(r[0]+pad,r[1]+pad,r[2]+pad);mesh.position.set(...c);mesh.renderOrder=20;grp.add(mesh);};
    if(th&&ab){const top=th.c[1]+th.r[1]*.85,bot=ab.c[1]-ab.r[1]*.55;const c=[0,(top+bot)/2,(th.c[2]+ab.c[2])/2];const r=[Math.max(th.r[0],ab.r[0])*1.02,(top-bot)/2,Math.max(th.r[2],ab.r[2])*1.02];const P2=Math.PI/2;
      for(const [z,p0,pl] of [['plastron',P2-1.05,2.1],['dos',3*P2-1.05,2.1],['flancs',-.42,.84],['flancs',Math.PI-.42,.84]]){const Z=e0.armor[z];if(Z&&Z[1]>0)patch(c,r,Z[1],p0,pl,.2*Math.PI,.62*Math.PI,Z[0]);}}
    const Zc=e0.armor.casque;if(hd&&Zc&&Zc[1]>0){const R=hd.t==='sph'?[hd.r,hd.r,hd.r]:hd.r;patch([hd.c[0],hd.c[1]+R[1]*.08,hd.c[2]-R[2]*.05],R.map(v=>v*1.02),Zc[1],0,Math.PI*2,0,.38*Math.PI,Zc[0]);}
    // là où la balle a frappé la plaque : un éclat de métal écrasé (arrêtée) ou un trou (traversée)
    const hitAt=e0.rec?.entry;if(hitAt&&(e0.rec.stopped||e0.plate)){const m=new THREE.Mesh(g.geo.lo,new THREE.MeshBasicMaterial({color:C3(e0.rec.stopped?'#c9ccd2':'#1a0d0d'),depthTest:false,toneMapped:false}));m.position.set(...hitAt);m.scale.setScalar(e0.rec.stopped?.0035:.0022);m.renderOrder=37;grp.add(m);}}
  sc._fx={grp,items};return sc._fx;}
function mulberry(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const DUM=new THREE.Object3D();
export function disposeSceneFx(sc){const F=sc?._fx;if(!F)return;F.grp.traverse(o=>{if(o.geometry&&o.geometry!==G?.geo.bullet&&o.geometry!==G?.geo.sph&&o.geometry!==G?.geo.lo)o.geometry.dispose();if(o.material&&o.material!==G?.mat.bullet&&!Object.values(G?.mat||{}).includes(o.material))o.material.dispose?.();});sc._fx=null;}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const nrm=a=>{const n=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/n,a[1]/n,a[2]/n];};
// l'état de chaque balle (calculé par xray.js) → la scène
export function updateSceneFx(sc,st,L,PLAY){const F=sceneFx(sc);
  F.items.forEach((it,n)=>{const s=st[n],b=it.b;const on=!!s;it.md.visible=it.mc.visible=on;if(!on){it.bullet.visible=it.glow.visible=false;for(const c of it.cav)c.m.visible=false;for(const f of it.frags)f.line.visible=f.head.visible=false;return;}
    trackTo(it.dark,s);trackTo(it.col,s);
    // la balle, sa bascule
    const show=!(s.done&&!b.R.lodged);it.bullet.visible=it.glow.visible=show;
    if(show){const P=b.P;const i2=Math.min(s.i+1,P.length-1),i1=Math.max(0,Math.min(s.i,P.length-2));const dir=nrm(sub(P[i2].p,P[i1].p));const up=Math.abs(dir[1])<.9?[0,1,0]:[1,0,0];
      const side=nrm([dir[1]*up[2]-dir[2]*up[1],dir[2]*up[0]-dir[0]*up[2],dir[0]*up[1]-dir[1]*up[0]]);const ax=dir.map((v,a)=>v*Math.cos(s.yaw)+side[a]*Math.sin(s.yaw));
      const broke=b.R.fragAt&&s.s>=Math.hypot(...sub(b.R.fragAt,P[0].p));const Lb=(b.e.len||.0065)*(broke?.7:1);const d=Math.max(.0028,s.d/1000);
      it.bullet.position.set(...s.cur);it.bullet.quaternion.setFromUnitVectors(Y,V3(ax));it.bullet.scale.set(d,Math.max(Lb,d*1.2),d);
      it.glow.position.set(...s.cur);it.glow.scale.setScalar(Math.max(.014,d*5)*(s.done?.6:1));it.glow.material.opacity=s.done?.5:1;}
    // la cavité temporaire
    for(const c of it.cav){const q=c.q;if(!L.cavite||q.at>s.i){c.m.visible=false;continue;}const since=(b.tt[s.i]-b.tt[q.at])*b.slow+(s.done?s.after:0);
      const open=since<.15?since/.15:Math.max(.18,1-(since-.15)/.8);c.m.visible=q.r*open>.0008;c.m.scale.setScalar(q.r*open);c.m.material.uniforms.uEdge.value=.65*open;c.m.material.uniforms.uBase.value=.04*open;}
    // les éclats
    for(const fr of it.frags){const f=fr.f;if(!L.eclats||f.at>s.i){fr.line.visible=fr.head.visible=false;continue;}const since=(s.done?b.T*b.slow+s.after:s.real*b.slow)-b.tt[f.at]*b.slow;
      const m=Math.min(f.pts.length,Math.max(1,Math.floor(since/(PLAY*.45)*f.pts.length)));fr.line.visible=true;fr.line.geometry.setDrawRange(0,m);fr.head.visible=m<f.pts.length;if(fr.head.visible)fr.head.position.set(...f.pts[m-1].p);}
    // le sang qui jaillit des vaisseaux ouverts : des gouttes lancées en boucle, qui retombent ; une artère bat au rythme du cœur
    for(const bl of it.blood){const v=bl.v;if(v.at>s.i){bl.m.count=0;continue;}const since=(s.done?b.T*b.slow+s.after:s.real*b.slow)-b.tt[v.at]*b.slow;if(since<0){bl.m.count=0;continue;}
      const life=v.art?.9:1.4,spd=(v.art?.05:.018)*(.6+v.cut*.6);const beat=v.art?.55+.45*Math.max(0,Math.sin(since*7.5)):1;let k=0;
      for(let i=0;i<bl.n;i++){const ph=((since/life)+i/bl.n)%1;const tau=ph*life;if(since<tau)continue;const d=bl.dirs[i];const sp=spd*beat*(.5+.5*((i*37)%11)/10);
        DUM.position.set(v.p[0]+d[0]*sp*tau,v.p[1]+d[1]*sp*tau-.5*.09*tau*tau,v.p[2]+d[2]*sp*tau);DUM.scale.setScalar((v.art?.0011:.0014)*(1-ph*.5));DUM.updateMatrix();bl.m.setMatrixAt(k++,DUM.matrix);}
      bl.m.count=k;bl.m.instanceMatrix.needsUpdate=true;}});
  return F.grp;}
function bulletGeo(){const pts=[new THREE.Vector2(0,-.5),new THREE.Vector2(.46,-.5),new THREE.Vector2(.5,-.46),new THREE.Vector2(.5,.02)];
  for(let i=1;i<=10;i++){const u=i/10;pts.push(new THREE.Vector2(.5*Math.sqrt(1-u*u)*(1-.05*u),.02+.48*u));}return new THREE.LatheGeometry(pts,20);}

// ---------- la fiche médicale : le blessé, ses plaies, ses saignements, ses soins ----------
const SEVCOL=[null,[140,190,150],[220,190,80],[240,150,60],[235,100,55],[215,50,40],[180,15,40]];
export class Fiche3D{
  constructor(){this.sig='';this.drops=[];this.grp=null;}
  setup(){const g=init();this.grp=new THREE.Group();this.fixed=new THREE.Group();this.grp.add(this.fixed);
    this.dropMesh=new THREE.InstancedMesh(g.geo.lo,g.mat.blood,600);this.dropMesh.count=0;this.dropMesh.frustumCulled=false;this.grp.add(this.dropMesh);
    this.pool=new THREE.Mesh(g.geo.disc,g.mat.pool);this.pool.rotation.x=-Math.PI/2;this.pool.position.set(0,.0008,.01);this.grp.add(this.pool);this.glows=[];}
  update(h,sp,dt,t,mode){if(!init())return null;if(!this.grp)this.setup();sp=sp2(sp);const M=model(sp);const g=G;
    const pulse=.6+.4*Math.sin(t*5);const hurt=new Map();
    for(const w of h.wounds)for(const p of w.parts||[]){for(const part of M.byName.get(p.name)||[]){const c=hurt.get(part);if(!c||c.sev<p.sev)hurt.set(part,{sev:p.sev,col:SEVCOL[p.sev]||SEVCOL[3],k:pulse*1.15});}}
    const where=b=>{const o=M.byName.get(b.name)?.[0]||M.B.REGIONS.find(r=>r.name===b.name);if(!o)return null;const s=o.shape;const c=s.c||s.a.map((v,i)=>(v+s.b[i])/2);
      let src=c;if(!b.internal){let bd=1e9;for(const w of h.wounds)for(const q of [w.entry,w.exit])if(q){const d=dist3(q,c);if(d<bd){bd=d;src=q;}}}return {o,c,src};};
    // ce qui ne change qu'avec les soins : les taches, les trajets, les garrots, les pansements, les clips
    const sig=sp+mode+JSON.stringify([h.wounds.map(w=>[w.entry,w.exit,w.sev]),h.bleeds.map(b=>[b.name,!!b.tq,!!b.clamped,!!b.dressed,!!b.internal])]);
    if(sig!==this.sig){this.sig=sig;for(const c of [...this.fixed.children]){this.fixed.remove(c);c.traverse(o=>{if(o.geometry&&!Object.values(g.geo).includes(o.geometry))o.geometry.dispose();});}this.glows=[];
      for(const w of h.wounds){if(!w.entry)continue;const sev=w.sev||2;
        // une tache de sang imbibée dans la peluche : un disque bombé, couché sur la surface
        const stain=(p,r)=>{const n=M.S.grad(...p);const m=new THREE.Mesh(g.geo.sph,g.mat.blood);m.position.set(...p.map((v,i)=>v-n[i]*r*.12));m.quaternion.setFromUnitVectors(Z,V3(n));m.scale.set(r,r*.92,r*.3);this.fixed.add(m);
          const hole=new THREE.Mesh(g.geo.sph,g.mat.hole);hole.position.set(...p.map((v,i)=>v+n[i]*r*.14));hole.scale.setScalar(r*.28);this.fixed.add(hole);};
        stain(w.entry,.0045+.0012*sev);if(w.exit)stain(w.exit,.006+.0018*sev);
        if(w.exit&&mode!=='peluche'){const m=tubeMesh([w.entry,w.exit],.0011,g.mat.track,{seg:4,rs:6,caps:false});m.renderOrder=30;this.fixed.add(m);}}
      for(const b of h.bleeds){const W=where(b);if(!W)continue;
        if(b.tq){const reg=M.B.REGIONS.filter(r=>r.limb&&r.shape.t==='cap').map(r=>({r,d:sdS(r.shape,...W.c)})).sort((a,b)=>a.d-b.d)[0]?.r;
          if(reg){const s=reg.shape;const ax=V3(s.b).sub(V3(s.a));const L=ax.length();ax.normalize();const u=clamp(new THREE.Vector3(...W.c).sub(V3(s.a)).dot(ax)/L-.2,.1,.9);
            const m=new THREE.Mesh(g.geo.torus,g.mat.tq);m.position.copy(V3(s.a)).addScaledVector(ax,u*L);m.quaternion.setFromUnitVectors(Z,ax);m.scale.set(s.r*1.08,s.r*1.08,s.r*2.2);this.fixed.add(m);
            const buckle=new THREE.Mesh(g.geo.box,g.mat.clamp);buckle.position.copy(m.position).add(new THREE.Vector3(0,0,s.r*1.1));buckle.scale.set(.004,.003,.0015);this.fixed.add(buckle);}}
        else if(b.clamped){const m=new THREE.Mesh(g.geo.cyl,g.mat.clamp);m.position.set(...W.c);m.scale.set(.0012,.006,.0012);m.rotation.z=.8;this.fixed.add(m);}
        if(b.dressed&&!b.internal){const n=M.S.grad(...W.src);const m=new THREE.Mesh(g.geo.sph,g.mat.gauze);m.position.set(...W.src.map((v,i)=>v+n[i]*.0008));m.quaternion.setFromUnitVectors(Z,V3(n));m.scale.set(.012,.012,.0032);this.fixed.add(m);}
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:g.tex.glow,color:C3('#ff2d2d'),blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true}));gl.position.set(...W.c);gl.renderOrder=40;this.fixed.add(gl);this.glows.push({gl,b});}}
    // les gouttes : elles coulent de la plaie (ou, dedans, de l'organe) d'autant plus que ça saigne ; au sol elles s'étalent
    for(const x of this.glows){const b=x.b;const rate=b.rate*(b.tq?0:b.clamped?.04:b.dressed?(b.internal?.85:.2):1);x.gl.visible=rate>.05&&mode!=='peluche';x.gl.scale.setScalar((.012+Math.min(.03,rate*.02))*pulse);x.gl.material.opacity=.55+.35*pulse;}
    for(const b of h.bleeds){const rate=b.rate*(b.tq?0:b.clamped?.04:b.dressed?(b.internal?.85:.2):1);if(rate<=.001||Math.random()>=dt*Math.min(40,rate*25+2))continue;const W=where(b);if(!W)continue;
      this.drops.push({p:[W.src[0]+(Math.random()-.5)*.004,W.src[1],W.src[2]+(Math.random()-.5)*.004],v:[(Math.random()-.5)*.03,.01+Math.random()*.02*Math.min(3,rate),(Math.random()-.5)*.03+(b.internal?0:.02)],age:0,big:Math.min(2.4,.8+rate),floor:false});}
    this.drops=this.drops.filter(d=>(d.age+=dt)<2.2).slice(-600);const mx=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3();let n=0;
    for(const d of this.drops){if(!d.floor){d.v[1]-=.14*dt;d.p=d.p.map((x,i)=>x+d.v[i]*dt);if(d.p[1]<=.0006){d.p[1]=.0006;d.floor=true;}}
      const r=.0014*d.big*(1-Math.max(0,d.age-1.6)/.6);pv.set(...d.p);if(d.floor)sv.set(r*2.2,r*.25,r*2.2);else sv.set(r,r*1.35,r);mx.compose(pv,q,sv);this.dropMesh.setMatrixAt(n++,mx);}
    this.dropMesh.count=n;this.dropMesh.instanceMatrix.needsUpdate=true;
    const lost=1-h.blood/BLOOD;this.pool.visible=lost>.03;const k=Math.min(1,lost*2);this.pool.scale.set(.12*k,.075*k,1);
    return {group:this.grp,hurt};}
}
