// Convertisseur de modèles 3D : OBJ + textures (millions de faces) → maillage « low poly » aux couleurs de sommets, prêt pour le jeu.
// 1) lecture de l'OBJ, couleur de chaque coin échantillonnée dans sa texture (Electron décode les JPG/PNG)
// 2) soudure des sommets, puis regroupement par grille jusqu'à ~60 000 faces (rapide, grossier)
// 3) simplification par erreur quadrique (QEM), bords protégés, retournements refusés, jusqu'au budget de faces demandé
// 4) sortie compacte : positions Int16, indices Uint16, couleurs Uint8 (en base64), modèle centré, posé sur y=0
// Lancer SANS ELECTRON_RUN_AS_NODE :  electron.exe outils/convertir.cjs <dossier-modèles> <dossier-sortie> [nom ...]
const {app,nativeImage}=require('electron');const fs=require('fs');const path=require('path');
const SRC=process.argv[2],OUT=process.argv[3],ONLY=process.argv.slice(4).filter(a=>!a.startsWith('-'));
// budget de triangles par modèle (le rendu en montre des dizaines à l'écran : on garde le strict nécessaire)
const BUDGET=n=>/^(rock_|rocky|stone_rock|crystal|lava|multicolored)/.test(n)?700:/atank|guncarrier|casemate|vehicle|car|jeep|locomotive|wagon|bomber/.test(n)?2800:/cannon|carriage/.test(n)?2600:/rocket/.test(n)?1800:/rifle|gun|firearm|gewehr|mg_/.test(n)?1600:/meumeu|cow|goat/.test(n)?1800:2600;

function readMtl(file){const M={};let cur=null;if(!fs.existsSync(file))return M;
  for(const raw of fs.readFileSync(file,'latin1').split(/\r?\n/)){const l=raw.trim();if(!l||l[0]==='#')continue;const s=l.split(/\s+/),k=s[0].toLowerCase();
    if(k==='newmtl')M[cur=s.slice(1).join(' ')]={kd:[.7,.7,.7],map:null};else if(cur&&k==='kd')M[cur].kd=[+s[1],+s[2],+s[3]];
    else if(cur&&k==='map_kd')M[cur].map=path.join(path.dirname(file),s[s.length-1].replace(/\\/g,'/'));}
  return M;}

const texCache=new Map();
function texture(file){if(texCache.has(file))return texCache.get(file);let t=null;
  try{let img=nativeImage.createFromPath(file);if(!img.isEmpty()){let {width:w,height:h}=img.getSize();if(w>1024||h>1024){const k=1024/Math.max(w,h);img=img.resize({width:Math.max(1,Math.round(w*k)),height:Math.max(1,Math.round(h*k)),quality:'good'});({width:w,height:h}=img.getSize());}
    t={w,h,d:img.toBitmap()};}}catch(e){}
  if(texCache.size>40)texCache.delete(texCache.keys().next().value);texCache.set(file,t);return t;}
// Skia rend du BGRA sous Windows
const sample=(t,u,v)=>{u-=Math.floor(u);v-=Math.floor(v);const x=Math.min(t.w-1,u*t.w|0),y=Math.min(t.h-1,(1-v)*t.h|0),o=(y*t.w+x)*4;return [t.d[o+2],t.d[o+1],t.d[o]];};

function parseObj(file){
  const txt=fs.readFileSync(file,'latin1');const P=[],T=[];const FV=[],FT=[],FM=[],FO=[];const mats=[],objs=[];let mi=-1,mtl={},oi=-1;
  let pos=0;const N=txt.length;
  while(pos<N){let e=txt.indexOf('\n',pos);if(e<0)e=N;const c0=txt.charCodeAt(pos),c1=txt.charCodeAt(pos+1);
    if(c0===118&&c1===32){const s=txt.substring(pos+2,e).trim().split(/\s+/);P.push(+s[0],+s[1],+s[2]);}
    else if(c0===118&&c1===116){const s=txt.substring(pos+3,e).trim().split(/\s+/);T.push(+s[0],+s[1]);}
    else if(c0===102&&c1===32){const s=txt.substring(pos+2,e).trim().split(/\s+/);const cv=[],ct=[];
      for(const tok of s){const q=tok.split('/');let a=+q[0];a=a<0?P.length/3+a:a-1;let b=-1;if(q[1]){b=+q[1];b=b<0?T.length/2+b:b-1;}cv.push(a);ct.push(b);}
      for(let k=1;k+1<cv.length;k++){FV.push(cv[0],cv[k],cv[k+1]);FT.push(ct[0],ct[k],ct[k+1]);FM.push(mi);FO.push(oi);}}
    else if(c0===111&&c1===32){const nm=txt.substring(pos+2,e).trim();let i=objs.indexOf(nm);if(i<0){i=objs.length;objs.push(nm);}oi=i;}
    else if(c0===117&&txt.startsWith('usemtl',pos)){const nm=txt.substring(pos+7,e).trim();let i=mats.indexOf(nm);if(i<0){i=mats.length;mats.push(nm);}mi=i;}
    else if(c0===109&&txt.startsWith('mtllib',pos)){mtl={...mtl,...readMtl(path.join(path.dirname(file),txt.substring(pos+7,e).trim()))};}
    pos=e+1;}
  return {P,T,FV,FT,FM,FO,mats,objs,mtl};}

// ---- couleurs par sommet soudé, puis regroupement par grille
function frameOf(o){const n0=o.P.length/3;let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
  for(let i=0;i<n0;i++)for(let k=0;k<3;k++){const v=o.P[3*i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v;}
  return {mn,mx,diag:Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2])||1};}
function weld(o,frame=frameOf(o)){
  const n0=o.P.length/3;const {mn,diag}=frame;const q=diag*1e-6;
  const map=new Map();const remap=new Int32Array(n0);const wp=[];let nw=0;
  for(let i=0;i<n0;i++){const key=Math.round((o.P[3*i]-mn[0])/q)+','+Math.round((o.P[3*i+1]-mn[1])/q)+','+Math.round((o.P[3*i+2]-mn[2])/q);let j=map.get(key);if(j===undefined){j=nw++;map.set(key,j);wp.push((o.P[3*i]-mn[0])/diag,(o.P[3*i+1]-mn[1])/diag,(o.P[3*i+2]-mn[2])/diag);}remap[i]=j;}
  map.clear();
  const colSum=new Float64Array(nw*3),colN=new Float64Array(nw);
  const texOf=o.mats.map(nm=>{const m=o.mtl[nm];return m&&m.map?texture(m.map):null;});
  const kdOf=o.mats.map(nm=>{const m=o.mtl[nm];return m?m.kd.map(x=>x*255):[180,180,180];});
  const nf=o.FV.length/3;const F=new Int32Array(nf*3);
  for(let f=0;f<nf;f++){const m=o.FM[f];const tx=m>=0?texOf[m]:null;
    for(let k=0;k<3;k++){const vi=o.FV[3*f+k],w=remap[vi];F[3*f+k]=w;let c;const ti=o.FT[3*f+k];
      if(tx&&ti>=0)c=sample(tx,o.T[2*ti],o.T[2*ti+1]);else c=m>=0?kdOf[m]:[180,180,180];
      colSum[3*w]+=c[0];colSum[3*w+1]+=c[1];colSum[3*w+2]+=c[2];colN[w]++;}}
  const col=new Float32Array(nw*3);for(let i=0;i<nw;i++){const n=colN[i]||1;col[3*i]=colSum[3*i]/n;col[3*i+1]=colSum[3*i+1]/n;col[3*i+2]=colSum[3*i+2]/n;}
  return {pos:Float64Array.from(wp),col,F,n:nw,diag};}

function cluster(m,targetF){
  const nf=m.F.length/3;if(nf<=targetF)return m;
  const tryRes=res=>{const cell=new Int32Array(m.n);const map=new Map();let nc=0;
    for(let i=0;i<m.n;i++){const a=Math.min(res-1,m.pos[3*i]*res|0),b=Math.min(res-1,m.pos[3*i+1]*res|0),c=Math.min(res-1,m.pos[3*i+2]*res|0);const key=(a*res+b)*res+c;let j=map.get(key);if(j===undefined){j=nc++;map.set(key,j);}cell[i]=j;}
    let nfa=0;const F=m.F;for(let f=0;f<nf;f++){const a=cell[F[3*f]],b=cell[F[3*f+1]],c=cell[F[3*f+2]];if(a!==b&&b!==c&&a!==c)nfa++;}return {cell,nc,nfa};};
  // le modèle est normalisé par sa diagonale : la plus grande arête vaut ≤ 1/√3 ; on cherche par dichotomie la finesse qui donne ~targetF
  let lo=8,hi=2048,best=null;
  for(let it=0;it<9;it++){const mid=Math.round((lo+hi)/2);const r=tryRes(mid);if(r.nfa>targetF){hi=mid-1;}else{lo=mid+1;best={res:mid,...r};}if(lo>hi)break;}
  if(!best)best={res:8,...tryRes(8)};
  const {cell,nc}=best;const pos=new Float64Array(nc*3),col=new Float32Array(nc*3),cnt=new Float64Array(nc);
  for(let i=0;i<m.n;i++){const j=cell[i];cnt[j]++;for(let k=0;k<3;k++){pos[3*j+k]+=m.pos[3*i+k];col[3*j+k]+=m.col[3*i+k];}}
  for(let j=0;j<nc;j++)for(let k=0;k<3;k++){pos[3*j+k]/=cnt[j];col[3*j+k]/=cnt[j];}
  const F=[];for(let f=0;f<nf;f++){const a=cell[m.F[3*f]],b=cell[m.F[3*f+1]],c=cell[m.F[3*f+2]];if(a!==b&&b!==c&&a!==c)F.push(a,b,c);}
  return {pos,col,F:Int32Array.from(F),n:nc,diag:m.diag};}

// ---- simplification par erreur quadrique
function qem(m,target){
  const n=m.n,pos=m.pos,col=m.col,F=m.F,nf=F.length/3;const Q=new Float64Array(n*10),W=new Float64Array(n).fill(1),alive=new Uint8Array(n).fill(1),ver=new Int32Array(n),falive=new Uint8Array(nf).fill(1);
  const vf=Array.from({length:n},()=>[]);let liveF=nf;
  const addPlane=(v,a,b,c,d,w)=>{const q=v*10;Q[q]+=w*a*a;Q[q+1]+=w*a*b;Q[q+2]+=w*a*c;Q[q+3]+=w*a*d;Q[q+4]+=w*b*b;Q[q+5]+=w*b*c;Q[q+6]+=w*b*d;Q[q+7]+=w*c*c;Q[q+8]+=w*c*d;Q[q+9]+=w*d*d;};
  const fnormal=(f,sub,sp)=>{const v=[F[3*f],F[3*f+1],F[3*f+2]];const P=v.map(x=>x===sub?sp:[pos[3*x],pos[3*x+1],pos[3*x+2]]);
    const ux=P[1][0]-P[0][0],uy=P[1][1]-P[0][1],uz=P[1][2]-P[0][2],vx=P[2][0]-P[0][0],vy=P[2][1]-P[0][1],vz=P[2][2]-P[0][2];return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];};
  const edgeCount=new Map();const ekey=(a,b)=>a<b?a*n+b:b*n+a;
  for(let f=0;f<nf;f++){const a=F[3*f],b=F[3*f+1],c=F[3*f+2];vf[a].push(f);vf[b].push(f);vf[c].push(f);
    const nn=fnormal(f);const len=Math.hypot(nn[0],nn[1],nn[2]);if(len<1e-18)continue;const A=nn[0]/len,B=nn[1]/len,C=nn[2]/len,D=-(A*pos[3*a]+B*pos[3*a+1]+C*pos[3*a+2]),area=len/2;
    addPlane(a,A,B,C,D,area);addPlane(b,A,B,C,D,area);addPlane(c,A,B,C,D,area);
    for(const [x,y] of [[a,b],[b,c],[c,a]]){const k=ekey(x,y);edgeCount.set(k,(edgeCount.get(k)||0)+1);}}
  // bords : un plan perpendiculaire à la face le long de l'arête, pour que les contours ne fondent pas
  for(let f=0;f<nf;f++){const vs=[F[3*f],F[3*f+1],F[3*f+2]];const nn=fnormal(f);const len=Math.hypot(nn[0],nn[1],nn[2]);if(len<1e-18)continue;const N=[nn[0]/len,nn[1]/len,nn[2]/len];
    for(let k=0;k<3;k++){const x=vs[k],y=vs[(k+1)%3];if(edgeCount.get(ekey(x,y))!==1)continue;
      const ex=pos[3*y]-pos[3*x],ey=pos[3*y+1]-pos[3*x+1],ez=pos[3*y+2]-pos[3*x+2];const el=Math.hypot(ex,ey,ez)||1;
      let a=ey*N[2]-ez*N[1],b=ez*N[0]-ex*N[2],c=ex*N[1]-ey*N[0];const pl=Math.hypot(a,b,c)||1;a/=pl;b/=pl;c/=pl;const d=-(a*pos[3*x]+b*pos[3*x+1]+c*pos[3*x+2]);
      addPlane(x,a,b,c,d,el*el*8);addPlane(y,a,b,c,d,el*el*8);}}
  const qcost=(q,x,y,z)=>Q[q]*x*x+2*Q[q+1]*x*y+2*Q[q+2]*x*z+2*Q[q+3]*x+Q[q+4]*y*y+2*Q[q+5]*y*z+2*Q[q+6]*y+Q[q+7]*z*z+2*Q[q+8]*z+Q[q+9];
  const sumQ=new Float64Array(10);
  const edgeInfo=(a,b)=>{for(let k=0;k<10;k++)sumQ[k]=Q[a*10+k]+Q[b*10+k];
    const A=[sumQ[0],sumQ[1],sumQ[2],sumQ[1],sumQ[4],sumQ[5],sumQ[2],sumQ[5],sumQ[7]],r=[-sumQ[3],-sumQ[6],-sumQ[8]];
    const det=A[0]*(A[4]*A[8]-A[5]*A[7])-A[1]*(A[3]*A[8]-A[5]*A[6])+A[2]*(A[3]*A[7]-A[4]*A[6]);
    const cands=[[pos[3*a],pos[3*a+1],pos[3*a+2]],[pos[3*b],pos[3*b+1],pos[3*b+2]],[(pos[3*a]+pos[3*b])/2,(pos[3*a+1]+pos[3*b+1])/2,(pos[3*a+2]+pos[3*b+2])/2]];
    if(Math.abs(det)>1e-14){const inv=1/det;const x=(r[0]*(A[4]*A[8]-A[5]*A[7])-A[1]*(r[1]*A[8]-A[5]*r[2])+A[2]*(r[1]*A[7]-A[4]*r[2]))*inv,y=(A[0]*(r[1]*A[8]-A[5]*r[2])-r[0]*(A[3]*A[8]-A[5]*A[6])+A[2]*(A[3]*r[2]-r[1]*A[6]))*inv,z=(A[0]*(A[4]*r[2]-r[1]*A[7])-A[1]*(A[3]*r[2]-r[1]*A[6])+r[0]*(A[3]*A[7]-A[4]*A[6]))*inv;
      const el=Math.hypot(pos[3*a]-pos[3*b],pos[3*a+1]-pos[3*b+1],pos[3*a+2]-pos[3*b+2]);const mx=(pos[3*a]+pos[3*b])/2,my=(pos[3*a+1]+pos[3*b+1])/2,mz=(pos[3*a+2]+pos[3*b+2])/2;
      if(Math.hypot(x-mx,y-my,z-mz)<3*el+1e-9)cands.push([x,y,z]);}
    let best=null,bc=Infinity;const q=[...sumQ];for(const c of cands){const cc=q[0]*c[0]*c[0]+2*q[1]*c[0]*c[1]+2*q[2]*c[0]*c[2]+2*q[3]*c[0]+q[4]*c[1]*c[1]+2*q[5]*c[1]*c[2]+2*q[6]*c[1]+q[7]*c[2]*c[2]+2*q[8]*c[2]+q[9];if(cc<bc){bc=cc;best=c;}}
    // petit biais pour les arêtes courtes : à erreur égale, on retire d'abord les plus petites
    const el=Math.hypot(pos[3*a]-pos[3*b],pos[3*a+1]-pos[3*b+1],pos[3*a+2]-pos[3*b+2]);return {cost:Math.max(0,bc)+el*el*1e-9,p:best};};
  // tas binaire
  const H=[];const up=i=>{while(i>0){const p=(i-1)>>1;if(H[p].cost<=H[i].cost)break;[H[p],H[i]]=[H[i],H[p]];i=p;}};
  const down=i=>{for(;;){let l=2*i+1,r=l+1,s=i;if(l<H.length&&H[l].cost<H[s].cost)s=l;if(r<H.length&&H[r].cost<H[s].cost)s=r;if(s===i)break;[H[s],H[i]]=[H[i],H[s]];i=s;}};
  const push=e=>{H.push(e);up(H.length-1);};const pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;down(0);}return t;};
  const pushEdge=(a,b)=>{if(a===b)return;const i=edgeInfo(a,b);push({cost:i.cost,a,b,va:ver[a],vb:ver[b],p:i.p});};
  const seen=new Set();for(let f=0;f<nf;f++){for(const [x,y] of [[F[3*f],F[3*f+1]],[F[3*f+1],F[3*f+2]],[F[3*f+2],F[3*f]]]){const k=ekey(x,y);if(seen.has(k))continue;seen.add(k);pushEdge(x,y);}}
  seen.clear();
  while(liveF>target&&H.length){const e=pop();const {a,b}=e;if(!alive[a]||!alive[b]||ver[a]!==e.va||ver[b]!==e.vb)continue;
    // les faces touchées par a ou b, sauf celles qui portent l'arête (elles disparaissent)
    let ok=true;const touched=[];for(const v of [a,b])for(const f of vf[v]){if(!falive[f])continue;const has=(F[3*f]===a||F[3*f+1]===a||F[3*f+2]===a)&&(F[3*f]===b||F[3*f+1]===b||F[3*f+2]===b);if(has)continue;touched.push(f);}
    for(const f of touched){const v=(F[3*f]===a||F[3*f+1]===a||F[3*f+2]===a)?a:b;const n0=fnormal(f),n1=fnormal(f,v,e.p);const l0=Math.hypot(...n0),l1=Math.hypot(...n1);if(l1<1e-16*1+0&&l0>1e-16){ok=false;break;}if(l0>1e-16&&l1>0){const dot=(n0[0]*n1[0]+n0[1]*n1[1]+n0[2]*n1[2])/(l0*l1);if(dot<.25){ok=false;break;}}}
    if(!ok)continue;
    pos[3*a]=e.p[0];pos[3*a+1]=e.p[1];pos[3*a+2]=e.p[2];for(let k=0;k<10;k++)Q[a*10+k]+=Q[b*10+k];
    const wt=W[a]+W[b];for(let k=0;k<3;k++)col[3*a+k]=(col[3*a+k]*W[a]+col[3*b+k]*W[b])/wt;W[a]=wt;alive[b]=0;ver[a]++;
    for(const f of vf[b]){if(!falive[f])continue;for(let k=0;k<3;k++)if(F[3*f+k]===b)F[3*f+k]=a;
      if(F[3*f]===F[3*f+1]||F[3*f+1]===F[3*f+2]||F[3*f]===F[3*f+2]){falive[f]=0;liveF--;}else vf[a].push(f);}
    vf[b]=[];const uniq=new Set();const keep=[];const nb=new Set();
    for(const f of vf[a]){if(!falive[f]||uniq.has(f))continue;uniq.add(f);keep.push(f);for(let k=0;k<3;k++){const v=F[3*f+k];if(v!==a)nb.add(v);}}
    vf[a]=keep;for(const v of nb)pushEdge(a,v);}
  // compactage
  const remap=new Int32Array(n).fill(-1);let nn=0;const outP=[],outC=[],outF=[];
  for(let f=0;f<nf;f++){if(!falive[f])continue;for(let k=0;k<3;k++){const v=F[3*f+k];if(remap[v]<0){remap[v]=nn++;outP.push(pos[3*v],pos[3*v+1],pos[3*v+2]);outC.push(col[3*v],col[3*v+1],col[3*v+2]);}outF.push(remap[v]);}}
  return {pos:Float64Array.from(outP),col:Float32Array.from(outC),F:Int32Array.from(outF),n:nn,diag:m.diag};}

// ---- sortie : centré en x/z, posé sur y=0, positions sur 16 bits
function pack(m,name,up){
  let {pos,col,F,n}=m;const P=new Float64Array(pos);
  // axe vertical : par défaut Y ; « up » permet de basculer un modèle couché (Z vers le haut)
  if(up==='z')for(let i=0;i<n;i++){const y=P[3*i+1],z=P[3*i+2];P[3*i+1]=z;P[3*i+2]=-y;}
  const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(let i=0;i<n;i++)for(let k=0;k<3;k++){const v=P[3*i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v;}
  const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2;for(let i=0;i<n;i++){P[3*i]-=cx;P[3*i+1]-=mn[1];P[3*i+2]-=cz;}
  const ext=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];const half=Math.max(ext[0]/2,ext[2]/2,ext[1])||1;
  const pi=new Int16Array(n*3);for(let i=0;i<n;i++){pi[3*i]=Math.round(P[3*i]/half*32767);pi[3*i+1]=Math.round(P[3*i+1]/half*32767);pi[3*i+2]=Math.round(P[3*i+2]/half*32767);}
  const ci=new Uint8Array(n*3);for(let i=0;i<n*3;i++)ci[i]=Math.max(0,Math.min(255,Math.round(col[i])));
  const ii=Uint16Array.from(F);const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
  return {name,tris:F.length/3,verts:n,ext:ext.map(x=>+x.toFixed(5)),half:+half.toFixed(5),p:b64(pi),i:b64(ii),c:b64(ci)};}

// ---- plusieurs pièces dans un même repère : (x,z) centrés sur l'ensemble, posé sur y=0 ; chaque pièce garde son pivot (en unités du modèle)
function packMulti(parts,name){
  const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(const {m} of parts)for(let i=0;i<m.n;i++)for(let k=0;k<3;k++){const v=m.pos[3*i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v;}
  const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2,ext=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];const half=Math.max(ext[0]/2,ext[2]/2,ext[1])||1;
  const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
  const out={name,ext:ext.map(x=>+x.toFixed(5)),half:+half.toFixed(5),parts:[]};
  for(const {n,m,pivot} of parts){const pi=new Int16Array(m.n*3);for(let i=0;i<m.n;i++){pi[3*i]=Math.round((m.pos[3*i]-cx)/half*32767);pi[3*i+1]=Math.round((m.pos[3*i+1]-mn[1])/half*32767);pi[3*i+2]=Math.round((m.pos[3*i+2]-cz)/half*32767);}
    const ci=new Uint8Array(m.n*3);for(let i=0;i<m.n*3;i++)ci[i]=Math.max(0,Math.min(255,Math.round(m.col[i])));
    out.parts.push({n,tris:m.F.length/3,verts:m.n,pv:pivot?[+(pivot[0]-cx).toFixed(5),+(pivot[1]-mn[1]).toFixed(5),+(pivot[2]-cz).toFixed(5)]:[0,0,0],p:b64(pi),i:b64(Uint16Array.from(m.F)),c:b64(ci)});}
  out.tris=out.parts.reduce((a,p)=>a+p.tris,0);return out;}
// sous-maillage : les seuls sommets utilisés par un ensemble de faces
function subMesh(m,faces){const map=new Int32Array(m.n).fill(-1);let n=0;const P=[],C=[],F=[];
  for(const f of faces)for(let k=0;k<3;k++){const v=m.F[3*f+k];if(map[v]<0){map[v]=n++;P.push(m.pos[3*v],m.pos[3*v+1],m.pos[3*v+2]);C.push(m.col[3*v],m.col[3*v+1],m.col[3*v+2]);}F.push(map[v]);}
  return {pos:Float64Array.from(P),col:Float32Array.from(C),F:Int32Array.from(F),n,diag:m.diag};}
// Découpes : pour chaque modèle, une fonction qui range chaque face dans une pièce. Les coordonnées sont celles de l'OBJ d'origine.
const SPLIT={
  // le moulin : les ailes (tout ce qui dépasse la tour, côté face) tournent autour de leur moyeu, le reste ne bouge pas
  windmill:o=>{const n=o.P.length/3,H=1,bins=40;const prof=new Float64Array(bins);
    for(let i=0;i<n;i++){const x=o.P[3*i],y=o.P[3*i+1],z=o.P[3*i+2];if(x>.03){const b=Math.min(bins-1,Math.max(0,y/H*bins|0));prof[b]=Math.max(prof[b],Math.hypot(x,z));}}
    for(let k=1;k<bins;k++)if(prof[k]===0)prof[k]=prof[k-1];
    const isSail=(x,y,z)=>y>.56&&x<.04&&Math.hypot(x,z)>prof[Math.min(bins-1,Math.max(0,y/H*bins|0))]+.02;
    const g=new Uint8Array(o.FV.length/3);const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];let sx=0,sc=0;
    for(let f=0;f<g.length;f++){let x=0,y=0,z=0;for(let k=0;k<3;k++){const v=o.FV[3*f+k];x+=o.P[3*v]/3;y+=o.P[3*v+1]/3;z+=o.P[3*v+2]/3;}
      if(isSail(x,y,z)){g[f]=1;for(let k=0;k<3;k++){const v=o.FV[3*f+k];for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],o.P[3*v+a]);mx[a]=Math.max(mx[a],o.P[3*v+a]);}}sx+=x;sc++;}}
    // le moyeu : au milieu des ailes en hauteur (y) et en largeur (z), sur le plan moyen des ailes (x)
    return {names:['tour','ailes'],g,pivots:{ailes:[sx/sc,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2]},budget:{tour:2400,ailes:900}};}
};
// --objets : une pièce par objet de l'OBJ (« o tripo_part_N »), pour les inspecter (outils/pieces.cjs, page _pieces.html) avant d'écrire une découpe
const BY_OBJECT=o=>{const nf=o.FV.length/3,cnt=new Array(o.objs.length).fill(0);for(let f=0;f<nf;f++)if(o.FO[f]>=0)cnt[o.FO[f]]++;const total=cnt.reduce((a,b)=>a+b,0)||1;
  const g=new Uint8Array(nf);const keep=o.objs.map((_,i)=>i).filter(i=>cnt[i]>0);if(keep.length>250)throw new Error('trop de pièces');const idx=new Map(keep.map((i,k)=>[i,k]));for(let f=0;f<nf;f++)g[f]=idx.get(o.FO[f])??0;
  const budget={};for(const i of keep)budget[o.objs[i]]=Math.max(60,Math.round(cnt[i]/total*9000));return {names:keep.map(i=>o.objs[i]),g,budget};};
// Les véhicules : des pièces nommées par numéro d'objet Tripo (inspectées avec outils/pieces.cjs et la page jeu/_pieces.html) ; tout le reste est la caisse.
//  front : l'axe vers l'avant du modèle d'origine ('+x', '-x', '+z', '-z') — il fixe le côté de la culasse des armes
//  roues : chaque roue (numéro de sa pièce principale) devient sa propre pièce, pivot en son centre ; les petites pièces logées dans sa boîte (jante, moyeu)
//          la suivent d'office
//  groupes : { nom: [numéros] } ; pivot 'base' (tourelle : axe vertical au centre, à sa base), 'culasse' (arme : à l'arrière du tube), 'centre'
const VEHICULE=spec=>o=>{const num=nm=>+String(nm).replace(/\D/g,'');const nObj=o.objs.length;
  const bb=Array.from({length:nObj},()=>({mn:[1e30,1e30,1e30],mx:[-1e30,-1e30,-1e30],f:0}));const nf=o.FV.length/3;
  for(let f=0;f<nf;f++){const oi=o.FO[f];if(oi<0)continue;const B=bb[oi];B.f++;for(let k=0;k<3;k++){const v=o.FV[3*f+k];for(let a=0;a<3;a++){const c=o.P[3*v+a];if(c<B.mn[a])B.mn[a]=c;if(c>B.mx[a])B.mx[a]=c;}}}
  const byNum=new Map(o.objs.map((nm,i)=>[num(nm),i]));const names=['caisse'],of=new Int16Array(nObj).fill(0),piv={};
  const inside=(a,b,m)=>[0,1,2].every(k=>a.mn[k]>=b.mn[k]-m&&a.mx[k]<=b.mx[k]+m);
  (spec.roues||[]).forEach((n,w)=>{const i=byNum.get(n);if(i==null)throw new Error('roue introuvable : '+n);const gi=names.push('roue'+(w+1))-1;of[i]=gi;const B=bb[i],m=Math.max(...[0,1,2].map(k=>B.mx[k]-B.mn[k]))*.12;
    for(let j=0;j<nObj;j++)if(j!==i&&!of[j]&&bb[j].f>0&&bb[j].f<B.f&&inside(bb[j],B,m))of[j]=gi;});
  for(const [g,list] of Object.entries(spec.groupes||{})){const gi=names.push(g)-1;for(const n of list){const i=byNum.get(n);if(i==null)throw new Error(g+' : pièce introuvable '+n);of[i]=gi;}}
  const g=new Uint8Array(nf);const mn=names.map(()=>[1e30,1e30,1e30]),mx=names.map(()=>[-1e30,-1e30,-1e30]);
  for(let f=0;f<nf;f++){const gi=o.FO[f]>=0?of[o.FO[f]]:0;g[f]=gi;for(let k=0;k<3;k++){const v=o.FV[3*f+k];for(let a=0;a<3;a++){const c=o.P[3*v+a];if(c<mn[gi][a])mn[gi][a]=c;if(c>mx[gi][a])mx[gi][a]=c;}}}
  const ax=spec.front[1]==='x'?0:2,sg=spec.front[0]==='+'?1:-1;
  names.forEach((n,gi)=>{if(!gi)return;const c=[0,1,2].map(a=>(mn[gi][a]+mx[gi][a])/2);const P=spec.pivots?.[n]||(n.startsWith('roue')?'centre':'base');
    // 'masque' (tubes de casemate) : là où le tube traverse la plaque avant — le sommet de la caisse le plus en avant, à la hauteur des tubes et dans leur
    // largeur (mesuré : pivotés à la culasse, au fond de la casemate, les tubes glissaient de côté à travers la plaque au lieu de tourner dans leur rotule)
    if(P==='masque'){const l=2-ax,th=mx[gi][1]-mn[gi][1],lo=mn[gi][1]-th*.5,hi=mx[gi][1]+th*.5;let best=null;
      for(let f=0;f<nf;f++){if(g[f])continue;for(let k=0;k<3;k++){const v=o.FV[3*f+k],y=o.P[3*v+1],L=o.P[3*v+l],A=o.P[3*v+ax];if(y<lo||y>hi||L<mn[gi][l]||L>mx[gi][l])continue;if(best==null||(sg>0?A>best:A<best))best=A;}}
      if(best!=null)c[ax]=best;}
    else if(P==='base')c[1]=mn[gi][1];else if(P==='culasse')c[ax]=sg>0?mn[gi][ax]:mx[gi][ax];else if(Array.isArray(P)){const i=byNum.get(P[0]);const B=bb[i];for(let a=0;a<3;a++)c[a]=(B.mn[a]+B.mx[a])/2;if(P[1]==='haut')c[1]=B.mx[1];}
    piv[n]=c;});
  const budget={caisse:spec.caisse||2600};for(const n of names)if(n.startsWith('roue'))budget[n]=spec.roue||140;Object.assign(budget,spec.budget||{});
  return {names,g,pivots:piv,budget};};
const VEHICULES={
  vintage_military_jeep_logistic_unarmed:{front:'+x',roues:[2,5,7,10],caisse:2200},
  // la mitrailleuse arrière tourne sur son pivot (pièce 42, qui reste avec la caisse) ; elle regarde vers l'arrière (−x)
  vintage_military_logistic_jeep_with_gun:{front:'+x',roues:[2,5,7,10],groupes:{affut:[26,38,9,47,53]},pivots:{affut:[42,'haut']},caisse:2200,budget:{affut:420}},
  // l'automitrailleuse : la tourelle en dôme et sa coupole ; deux mitrailleuses jumelées vers l'avant (+z)
  vintage_armored_car:{front:'+z',roues:[3,4,6,18],groupes:{tourelle:[2,8],armes:[14,20]},pivots:{armes:'culasse'},budget:{tourelle:700,armes:160}},
  // le char : chenilles fixes (la caisse), barbotins et poulies qui tournent, tourelle, canon court
  armored_vehicle:{front:'+z',roues:[3,5,8,9],groupes:{tourelle:[4,22,29,31,32],canon:[11]},pivots:{canon:'culasse'},budget:{tourelle:700,canon:120}},
  // l'automoteur : deux tubes jumelés dans la casemate, vers l'avant (−z) ; débattement limité (le jeu le borne)
  // (un tube par pièce, chacun dans sa rotule : mesuré, les deux tubes écartés tournant autour d'un seul pivot entre eux, l'un sortait de la plaque
  // pendant que l'autre y rentrait)
  guncarrier_casemate:{front:'-z',groupes:{canons_g:[24],canons_d:[25]},pivots:{canons_g:'masque',canons_d:'masque'},budget:{canons_g:130,canons_d:130}},
};
app.disableHardwareAcceleration();
app.whenReady().then(()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const dirs=fs.readdirSync(SRC).filter(d=>fs.statSync(path.join(SRC,d)).isDirectory()&&(!ONLY.length||ONLY.includes(d)));
  const index=[];
  for(const d of dirs){const t0=Date.now();
    try{const dir=path.join(SRC,d);const walk=x=>fs.readdirSync(x,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(x,e.name)):[path.join(x,e.name)]);
      const obj=walk(dir).find(f=>/\.obj$/i.test(f));if(!obj){console.log('pas d’OBJ :',d);continue;}
      const o=parseObj(obj);const sp=process.argv.includes('--objets')?BY_OBJECT:SPLIT[d.replace(/_3d_model$/,'')]||(VEHICULES[d]?VEHICULE(VEHICULES[d]):null);let out,f0,f1;
      if(sp){const S=sp(o),frame=frameOf(o);const full=weld(o,frame);f0=full.F.length/3;const parts=[];
        for(let gi=0;gi<S.names.length;gi++){const faces=[];for(let f=0;f<S.g.length;f++)if(S.g[f]===gi)faces.push(f);let m=subMesh(full,faces);const tgt=(S.budget&&S.budget[S.names[gi]])||BUDGET(d);
          m=cluster(m,Math.max(tgt*12,20000));m=qem(m,tgt);const pv=S.pivots&&S.pivots[S.names[gi]];parts.push({n:S.names[gi],m,pivot:pv?[(pv[0]-frame.mn[0])/frame.diag,(pv[1]-frame.mn[1])/frame.diag,(pv[2]-frame.mn[2])/frame.diag]:null});}
        f1=parts.reduce((a,p)=>a+p.m.F.length/3,0);out=packMulti(parts,d);out.verts=parts.reduce((a,p)=>a+p.verts||0,0);}
      else{let m=weld(o);f0=m.F.length/3;const target=BUDGET(d);
        m=cluster(m,Math.max(target*12,30000));f1=m.F.length/3;m=qem(m,target);
        out=pack(m,d,/bomber/.test(d)?'y':'y');}
      fs.writeFileSync(path.join(OUT,d+'.json'),JSON.stringify(out));
      index.push({name:d,tris:out.tris,ext:out.ext,half:out.half,bytes:JSON.stringify(out).length});
      console.log(`${d}: ${f0} → ${f1} → ${out.tris} faces (${out.verts} sommets), ${(JSON.stringify(out).length/1024)|0} Ko, ${((Date.now()-t0)/1000).toFixed(1)} s`);}
    catch(e){console.log('ERREUR',d,e&&e.stack||e);}
    texCache.clear();}
  fs.writeFileSync(path.join(OUT,'_index.json'),JSON.stringify(index));
  app.quit();});
