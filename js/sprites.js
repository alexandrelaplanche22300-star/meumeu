// Chargement paresseux des visuels : on ne demande une image que la première fois qu'on
// la dessine, et on dessine un rien tant qu'elle n'est pas là.
const cache=new Map();
export let manifest=null;
// Le jeu doit pouvoir démarrer même si un antivirus, un lecteur réseau ou le
// protocole app:// met quelques instants à répondre aux fichiers d'images.
// Avant cette protection, une promesse fetch bloquée arrêtait toute ui.js :
// la fenêtre s'ouvrait, mais restait avec une carte vide et aucun panneau.
const EMPTY_MANIFEST={buildings:{},vehicles:{},resources:{},characters:{},sheets:{},terrain:{},fx:{},props:{}};
export async function loadManifest(){
  const url=new URL('assets/manifest.json',document.baseURI).href;
  let timer=null;
  try{
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`délai dépassé : ${url}`)),1800);});
    const response=await Promise.race([fetch(url,{cache:'no-store'}),timeout]);
    if(!response.ok)throw new Error(`manifest ${response.status} : ${response.statusText}`);
    const m=await response.json();
    if(!m||typeof m!=='object')throw new Error('manifest invalide');
    manifest={...EMPTY_MANIFEST,...m};
  }catch(e){
    console.warn('Manifest visuel indisponible, démarrage avec le rendu de secours',e);
    manifest={...EMPTY_MANIFEST};
  }finally{if(timer)clearTimeout(timer);}
  return manifest;
}
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
  // Atlas 4 × 4 : une direction par ligne ; repos, deux pas, mains en avant.
  // L'arme équipée est dessinée séparément par le moteur.
  const atlas={
    'meumeu_player-villager':'custom/meumeu-villageois.png',
    'meumeu_player-soldier':'custom/meumeu-soldat.png',
    'meumeu_player-camo':'custom/meumeu-camouflage-v10.png',
    'beee_player-villager':'custom/beee-villageois.png',
    'beee_player-soldier':'custom/beee-soldat-clean.png'};
  if(atlas[sprite]){
    const im=img(atlas[sprite]);if(!im)return null;const fw=im.naturalWidth/4,fh=im.naturalHeight/4;
    // lignes vérifiées sur les images : 1 face tourné à droite (se), 2 face tourné à gauche (sw), 3 dos vers la gauche (nw), 4 dos vers la droite (ne)
    const row=({se:0,sw:1,nw:2,ne:3})[dir]??0,walk=action==='walk';
    // la marche en quatre temps : pas, passage, autre pas, passage (le corps monte au passage, voir view.js)
    const cols=walk?[1,0,2,0]:[action==='action'||action==='aim'||action==='carry'?3:0];
    return {im,frames:cols.length,frameCols:cols,frameW:fw,frameH:fh,row,box:[8,2,fw-8,fh-6],cut:cutAtlas(atlas[sprite],im)};
  }
  let key=`${sprite}_${action}_${dir}`,flip=false;
  if(!manifest.sheets[key]){const alt={ne:'se',nw:'sw',se:'ne',sw:'nw'}[dir];if(manifest.sheets[`${sprite}_${action}_${alt}`]){key=`${sprite}_${action}_${alt}`;}
    else if(manifest.sheets[`${sprite}_idle_${dir}`])key=`${sprite}_idle_${dir}`;else return null;}
  const s=manifest.sheets[key];const im=img(s.path);return im?{im,frames:s.frames,flip,box:s.box||[0,0,FRAME,FRAME],boxes:s.boxes}:null;
}
// Dessine un cadre de sorte que le personnage fasse `size` de haut, pieds en (x,y).
// Feuilles du pack : une seule boîte par feuille (l'union de tous ses cadres), même échelle et même aplomb d'une image à l'autre.
// Atlas découpé (cutAtlas) : chaque cadre a son aplomb (bas des pieds) et son axe, une seule échelle par feuille.
export function drawFrame(ctx,sh,frame,x,y,size){const f=((frame%sh.frames)+sh.frames)%sh.frames;
  if(sh.flip){ctx.save();ctx.translate(2*x,0);ctx.scale(-1,1);}
  const col=sh.frameCols?.[f]??f;const fr=sh.cut?.frames[(sh.row||0)*4+col];
  if(fr){const k=size/sh.cut.ref;ctx.drawImage(fr.cv,x-fr.ax*k,y-fr.by*k,fr.cv.width*k,fr.cv.height*k);}
  else{let [x0,y0,x1,y1]=sh.box;const bh=Math.max(1,y1-y0),bw=x1-x0;const k=size/bh;const fw=sh.frameW||FRAME,fh=sh.frameH||FRAME;
    ctx.drawImage(sh.im,col*fw,(sh.row||0)*fh,fw,fh,x-(x0+bw/2)*k,y-y1*k,fw*k,fh*k);}
  if(sh.flip)ctx.restore();}
// Découpe d'un atlas 4 × 4 en cadres propres, une fois par image. Les cadres de ces feuilles débordent les uns sur les
// autres (les cornes d'une ligne dans la case du dessus) et le fond porte un voile presque transparent : on étiquette les
// taches opaques (alpha ≥ 96), on rend chaque tache assez grosse à la case qui contient son centre, puis chaque cadre devient
// une petite image à part avec son aplomb (le bas des pieds) et son axe (le centre de masse du corps).
const atlasCache=new Map();
function cutAtlas(path,im){let A=atlasCache.get(path);if(A!==undefined)return A;A=null;
  try{const W=im.naturalWidth,H=im.naturalHeight,fw=W/4,fh=H/4;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);
    const src=x.getImageData(0,0,W,H).data;const N=W*H,lab=new Int32Array(N),st=new Int32Array(N);const comps=[null];const T=96;
    for(let p0=0;p0<N;p0++){if(lab[p0]||src[p0*4+3]<T)continue;const id=comps.length;const c={n:0,x0:1e9,y0:1e9,x1:-1,y1:-1,sx:0,sy:0};comps.push(c);let sp=0;st[sp++]=p0;lab[p0]=id;
      while(sp){const p=st[--sp];const px=p%W,py=(p-px)/W;c.n++;c.sx+=px;c.sy+=py;if(px<c.x0)c.x0=px;if(px>c.x1)c.x1=px;if(py<c.y0)c.y0=py;if(py>c.y1)c.y1=py;
        if(px>0&&!lab[p-1]&&src[(p-1)*4+3]>=T){lab[p-1]=id;st[sp++]=p-1;}if(px<W-1&&!lab[p+1]&&src[(p+1)*4+3]>=T){lab[p+1]=id;st[sp++]=p+1;}
        if(py>0&&!lab[p-W]&&src[(p-W)*4+3]>=T){lab[p-W]=id;st[sp++]=p-W;}if(py<H-1&&!lab[p+W]&&src[(p+W)*4+3]>=T){lab[p+W]=id;st[sp++]=p+W;}}}
    // chaque tache assez grosse à la case de son centre
    const cell=Array.from({length:16},()=>({x0:1e9,y0:1e9,x1:-1,y1:-1,n:0,sx:0}));const own=new Int8Array(comps.length).fill(-1);const minN=fw*fh*.004;
    for(let id=1;id<comps.length;id++){const c=comps[id];if(c.n<minN)continue;const col=Math.min(3,Math.floor(c.sx/c.n/fw)),row=Math.min(3,Math.floor(c.sy/c.n/fh));const k=row*4+col,C=cell[k];
      own[id]=k;C.n+=c.n;C.sx+=c.sx;C.x0=Math.min(C.x0,c.x0);C.y0=Math.min(C.y0,c.y0);C.x1=Math.max(C.x1,c.x1);C.y1=Math.max(C.y1,c.y1);}
    const frames=[];for(let k=0;k<16;k++){const C=cell[k];if(!C.n){frames.push(null);continue;}const x0=Math.max(0,C.x0-1),y0=Math.max(0,C.y0-1),x1=Math.min(W-1,C.x1+1),y1=Math.min(H-1,C.y1+1);const w=x1-x0+1,h=y1-y0+1;
      const fc=document.createElement('canvas');fc.width=w;fc.height=h;const fx=fc.getContext('2d');const out=fx.createImageData(w,h),d=out.data;const mine=q=>own[lab[q]]===k;
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const p=(y0+yy)*W+x0+xx;let keep=lab[p]?mine(p):false;
        // le bord adouci (alpha < 96) d'une tache gardée reste ; le voile isolé part
        if(!lab[p]&&src[p*4+3]>0){const px=x0+xx,py=y0+yy;keep=(px>0&&mine(p-1))||(px<W-1&&mine(p+1))||(py>0&&mine(p-W))||(py<H-1&&mine(p+W));}
        if(keep){const o=(yy*w+xx)*4;d[o]=src[p*4];d[o+1]=src[p*4+1];d[o+2]=src[p*4+2];d[o+3]=src[p*4+3];}}
      fx.putImageData(out,0,0);frames.push({cv:fc,ax:C.sx/C.n-x0,by:C.y1-y0,h:C.y1-C.y0});}
    // une seule échelle par feuille : la plus haute des poses de repos fait la taille demandée
    const ref=Math.max(1,...[0,4,8,12].map(k=>frames[k]?.h||0));
    A={frames,ref};}catch(e){console.warn('Découpe de la feuille impossible, rendu en grille',path,e);A=null;}
  atlasCache.set(path,A);return A;}
export function fx(name){const s=manifest.fx[name];if(!s)return null;const im=img(s.path);return im?{im,frames:s.frames}:null;}
