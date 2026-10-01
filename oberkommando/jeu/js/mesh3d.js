// Modèles 3D « low poly » du jeu : lecture des maillages produits par outils/convertir.cjs (couleurs de sommets, pas de texture).
// Un modèle est un petit fichier JSON (positions Int16, indices Uint16, couleurs Uint8, en base64), centré en x/z et posé sur y=0.
// Les tailles (ext, half) sont exprimées en « diagonale du modèle » : le jeu choisit lui-même la taille à l'écran (scaleTo).
import * as THREE from './lib/three.module.js';

const bytes=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;};
// sRGB 8 bits → linéaire (les couleurs de sommets sont lues comme du linéaire par le moteur)
const LIN=(()=>{const t=new Float32Array(256);for(let i=0;i<256;i++)t[i]=Math.pow(i/255,2.2);return t;})();

export function geometryOf(m){
  const p=new Int16Array(bytes(m.p)),c=new Uint8Array(bytes(m.c)),idx=new Uint16Array(bytes(m.i));
  const pos=new Float32Array(p.length),col=new Float32Array(c.length),k=m.half/32767;
  for(let i=0;i<p.length;i++){pos[i]=p[i]*k;col[i]=LIN[c[i]];}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  // V12.4 : un modèle « cuit » (outils/cuire.cjs) a ses coordonnées de texture par coin (Uint16, 0 → 65535)
  if(m.uv){const u=new Uint16Array(bytes(m.uv)),uv=new Float32Array(u.length);for(let i=0;i<u.length;i++)uv[i]=u[i]/65535;g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
  g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
// un modèle en plusieurs pièces (roues, tourelle, ailes) : chaque pièce a sa géométrie et son pivot ; geo les réunit pour qui n'en veut qu'une
function mergeGeos(gs){let np=0,ni=0;for(const g of gs){np+=g.attributes.position.count;ni+=g.index.count;}const hasUv=gs.every(g=>g.attributes.uv);
  const pos=new Float32Array(np*3),col=new Float32Array(np*3),uv=hasUv?new Float32Array(np*2):null,idx=new Uint32Array(ni);let po=0,io=0;
  for(const g of gs){pos.set(g.attributes.position.array,po*3);col.set(g.attributes.color.array,po*3);if(uv)uv.set(g.attributes.uv.array,po*2);const gi=g.index.array;for(let i=0;i<gi.length;i++)idx[io+i]=gi[i]+po;po+=g.attributes.position.count;io+=gi.length;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));if(uv)g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}

const MAT=new Map();
// un seul matériau partagé par tous les modèles : couleurs de sommets, ombrage à facettes (le « low poly » voulu)
export const materialOf=(flat=true)=>{const key=flat?'f':'s';if(!MAT.has(key))MAT.set(key,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:flat}));return MAT.get(key);};

// V12.4 : le matériau d'un modèle cuit — sa texture (l'atlas, en sRGB), ombrage à facettes ; null sinon (couleurs de sommets, materialOf)
function texturedOf(m){if(!m.tex||typeof Image==='undefined')return Promise.resolve(null);const im=new Image();im.src=m.tex;
  return im.decode().then(()=>{const t=new THREE.Texture(im);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;
    return new THREE.MeshLambertMaterial({map:t,flatShading:true});}).catch(()=>null);}
const CACHE=new Map();
// les modèles déjà arrivés, lisibles tout de suite (les armes se construisent sans attendre)
export const LOADED=new Map();
export async function loadModel(name,base='assets3d/'){
  if(CACHE.has(name))return CACHE.get(name);
  const job=fetch(base+name+'.json').then(r=>{if(!r.ok)throw Error('modèle introuvable : '+name);return r.json();}).then(m=>{
    const mat=texturedOf(m);
    if(m.parts){const parts=m.parts.map(q=>({name:q.n,pivot:q.pv,tris:q.tris,geo:geometryOf({half:m.half,p:q.p,i:q.i,c:q.c,uv:q.uv})}));const byName=Object.fromEntries(parts.map(q=>[q.name,q]));
      return mat.then(mat=>({name,ext:m.ext,half:m.half,tris:m.tris,parts,byName,geo:mergeGeos(parts.map(q=>q.geo)),mat}));}
    return mat.then(mat=>({name,ext:m.ext,half:m.half,tris:m.tris,geo:geometryOf(m),mat}));});
  CACHE.set(name,job);job.then(mod=>LOADED.set(name,mod)).catch(()=>{});return job;}

// un maillage à la hauteur voulue (mètres du jeu), ou à la plus grande dimension horizontale si « width »
export function meshOf(model,{height,width,length,flat=true}={}){
  const mesh=new THREE.Mesh(model.geo,model.mat||materialOf(flat));
  const [ex,ey,ez]=model.ext;let s=1;
  if(height)s=height/ey;else if(length)s=length/Math.max(ex,ez);else if(width)s=width/Math.min(ex,ez);
  mesh.scale.setScalar(s);return mesh;}
