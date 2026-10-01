// Chargement paresseux des visuels : on ne demande une image que la première fois qu'on
// la dessine, et on dessine un rien tant qu'elle n'est pas là.
const cache=new Map();
export let manifest=null;
export async function loadManifest(){manifest=await (await fetch('assets/manifest.json')).json();return manifest;}
export function img(path,abs=false){let e=cache.get(path);if(!e){e=new Image();e.src=abs?path:'assets/'+path;cache.set(path,e);}return e.complete&&e.naturalWidth?e:null;}
export const building=(kind,stage)=>{const p=manifest.buildings[kind]?.[stage-1];return p?img(p):null;};
export const vehicle=name=>{const p=manifest.vehicles[name];return p?img(p):null;};
export const resource=name=>{const p=manifest.resources[name];return p?img(p):null;};
export const portrait=name=>{const p=manifest.characters[name];return p?img(p):null;};
export const terrain=name=>{const p=manifest.terrain[name];return p?img(p):null;};
export const prop=name=>{const p=manifest.props?.[name];return p?img(p):null;};
export const FRAME=128;
// Une feuille d'animation : `sprite_action_dir`. Les rôles qui n'ont que se/sw sont
// retournés pour ne/nw ; ceux qui n'ont pas l'action demandée retombent sur idle.
export function sheet(sprite,action,dir){
  let key=`${sprite}_${action}_${dir}`,flip=false;
  if(!manifest.sheets[key]){const alt={ne:'se',nw:'sw',se:'ne',sw:'nw'}[dir];if(manifest.sheets[`${sprite}_${action}_${alt}`]){key=`${sprite}_${action}_${alt}`;}
    else if(manifest.sheets[`${sprite}_idle_${dir}`])key=`${sprite}_idle_${dir}`;else return null;}
  const s=manifest.sheets[key];const im=img(s.path);return im?{im,frames:s.frames,flip,box:s.box||[0,0,FRAME,FRAME],boxes:s.boxes}:null;
}
// Dessine un cadre de sorte que le personnage (sa boîte mesurée) fasse `size` de haut, pieds en (x,y).
// Les feuilles du pack n'ont pas la même échelle d'un rôle à l'autre ; ici elles l'ont.
// Un cadre dont la hauteur s'écarte de plus de 10 % de celle de la feuille est ramené à la
// même hauteur : les feuilles du pack ont des cadres dessinés à des échelles différentes.
export function drawFrame(ctx,sh,frame,x,y,size){const f=frame%sh.frames;let [x0,y0,x1,y1]=sh.box;const fb=sh.boxes?.[f];
  if(fb){const hf=fb[3]-fb[1],hm=y1-y0;if(Math.abs(hf/hm-1)>.1)[x0,y0,x1,y1]=fb;}
  const bh=Math.max(1,y1-y0),bw=x1-x0;const k=size/bh;
  ctx.drawImage(sh.im,f*FRAME,0,FRAME,FRAME,x-(x0+bw/2)*k,y-y1*k,FRAME*k,FRAME*k);}
export function fx(name){const s=manifest.fx[name];if(!s)return null;const im=img(s.path);return im?{im,frames:s.frames}:null;}
