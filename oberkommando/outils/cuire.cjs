// La cuisson des textures (K4b) : la texture d'origine, cuite sur le modèle réduit du jeu.
// Le modèle du jeu (assets3d/<nom>.json, sorti de convertir.cjs : quelques milliers de faces, une couleur par sommet) perdait le détail des textures :
// d'où l'aspect « sombre et moche ». Ici, chaque face du modèle réduit reçoit sa case dans un atlas ; chaque pixel de la case prend la couleur du point le
// plus proche de la surface D'ORIGINE (des millions de faces), lue dans sa texture. Le modèle garde sa forme, ses pièces et ses pivots ; il gagne :
//   uv (par coin, Uint16 base64) et tex (l'atlas, JPEG en data:) ; les sommets ne sont plus partagés (chaque face a ses coins : ombrage à facettes inchangé).
// Correspondance des repères : convertir.cjs normalise l'original par sa diagonale (frameOf) puis centre (x, z) et pose sur y = 0 ; l'échelle est donc
// exactement la diagonale, et le décalage se retrouve en alignant les boîtes englobantes (la simplification garde les extrémités).
// Utilisation : npm i jpeg-js pngjs   puis
//   node --max-old-space-size=12000 outils/cuire.cjs <dossier-modèles-d'origine> <dossier-json-du-jeu> <dossier-sortie> [nom ...]
//   (<dossier-modèles-d'origine>/<nom>/ contient l'OBJ, le MTL et les textures, comme pour convertir.cjs)
const fs=require('fs'),path=require('path');
const req=n=>require(require.resolve(n,{paths:[process.cwd(),__dirname]}));const jpeg=req('jpeg-js'),{PNG}=req('pngjs');
const [SRC,JS,OUT]=process.argv.slice(2,5);const ONLY=process.argv.slice(5).filter(a=>!a.startsWith('-'));const ATLAS=+(process.env.ATLAS||1024);

function readMtl(file){const M={};let cur=null;if(!fs.existsSync(file))return M;
  for(const raw of fs.readFileSync(file,'latin1').split(/\r?\n/)){const l=raw.trim();if(!l||l[0]==='#')continue;const s=l.split(/\s+/),k=s[0].toLowerCase();
    if(k==='newmtl')M[cur=s.slice(1).join(' ')]={kd:[.7,.7,.7],map:null};else if(cur&&k==='kd')M[cur].kd=[+s[1],+s[2],+s[3]];
    else if(cur&&k==='map_kd')M[cur].map=path.join(path.dirname(file),s[s.length-1].replace(/\\/g,'/'));}
  return M;}
function parseObj(file){const txt=fs.readFileSync(file,'latin1');const P=[],T=[];const FV=[],FT=[],FM=[];const mats=[];let mi=-1,mtl={};let pos=0;const N=txt.length;
  while(pos<N){let e=txt.indexOf('\n',pos);if(e<0)e=N;const c0=txt.charCodeAt(pos),c1=txt.charCodeAt(pos+1);
    if(c0===118&&c1===32){const s=txt.substring(pos+2,e).trim().split(/\s+/);P.push(+s[0],+s[1],+s[2]);}
    else if(c0===118&&c1===116){const s=txt.substring(pos+3,e).trim().split(/\s+/);T.push(+s[0],+s[1]);}
    else if(c0===102&&c1===32){const s=txt.substring(pos+2,e).trim().split(/\s+/);const cv=[],ct=[];
      for(const tok of s){const q=tok.split('/');let a=+q[0];a=a<0?P.length/3+a:a-1;let b=-1;if(q[1]){b=+q[1];b=b<0?T.length/2+b:b-1;}cv.push(a);ct.push(b);}
      for(let k=1;k+1<cv.length;k++){FV.push(cv[0],cv[k],cv[k+1]);FT.push(ct[0],ct[k],ct[k+1]);FM.push(mi);}}
    else if(c0===117&&txt.startsWith('usemtl',pos)){const nm=txt.substring(pos+7,e).trim();let i=mats.indexOf(nm);if(i<0){i=mats.length;mats.push(nm);}mi=i;}
    else if(c0===109&&txt.startsWith('mtllib',pos)){mtl={...mtl,...readMtl(path.join(path.dirname(file),txt.substring(pos+7,e).trim()))};}
    pos=e+1;}
  return {P:Float64Array.from(P),T:Float32Array.from(T),FV:Int32Array.from(FV),FT:Int32Array.from(FT),FM:Int32Array.from(FM),mats,mtl};}
// une texture : décodée, réduite à 2048 au plus (moyenne de boîte), lue en bilinéaire (u, v d'OBJ : v vers le haut)
function loadTex(file){try{const d=fs.readFileSync(file);let w,h,px;if(/\.png$/i.test(file)){const p=PNG.sync.read(d);w=p.width;h=p.height;px=p.data;}else{const j=jpeg.decode(d,{useTArray:true,maxMemoryUsageInMB:4096,formatAsRGBA:true});w=j.width;h=j.height;px=j.data;}
    const k=Math.max(1,Math.ceil(Math.max(w,h)/2048));if(k>1){const W=Math.floor(w/k),H=Math.floor(h/k),o=new Uint8Array(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let r=0,g=0,b=0;for(let yy=0;yy<k;yy++)for(let xx=0;xx<k;xx++){const i=((y*k+yy)*w+x*k+xx)*4;r+=px[i];g+=px[i+1];b+=px[i+2];}const j=(y*W+x)*4;o[j]=r/k/k;o[j+1]=g/k/k;o[j+2]=b/k/k;o[j+3]=255;}w=W;h=H;px=o;}
    // les atlas d'origine (Tripo) posent leurs îlots sur un fond NOIR ; au bord d'un îlot, l'échantillon prenait du fond (mesuré : taches noires sur le
    // blindé). On fait « baver » les îlots dans le fond : 16 passes de dilatation sur les pixels presque noirs (r, g, b < 6)
    {const n=w*h,bg=new Uint8Array(n);let any=0;for(let i=0;i<n;i++){if(px[i*4]<6&&px[i*4+1]<6&&px[i*4+2]<6){bg[i]=1;any++;}}
      for(let pass=0;pass<16&&any;pass++){const nb=bg.slice();let ch=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!bg[i])continue;let r=0,g=0,b=0,c=0;
          for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(bg[j])continue;r+=px[j*4];g+=px[j*4+1];b+=px[j*4+2];c++;}
          if(c){px[i*4]=r/c;px[i*4+1]=g/c;px[i*4+2]=b/c;nb[i]=0;ch++;}}bg.set(nb);any-=ch;if(!ch)break;}}
    return {w,h,px};}catch(e){console.log('  texture illisible',file,e.message);return null;}}
function sample(t,u,v,out){u-=Math.floor(u);v-=Math.floor(v);const x=u*(t.w-1),y=(1-v)*(t.h-1);const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(t.w-1,x0+1),y1=Math.min(t.h-1,y0+1),fx=x-x0,fy=y-y0;
  for(let c=0;c<3;c++){const a=t.px[(y0*t.w+x0)*4+c],b=t.px[(y0*t.w+x1)*4+c],d=t.px[(y1*t.w+x0)*4+c],e=t.px[(y1*t.w+x1)*4+c];out[c]=(a*(1-fx)+b*fx)*(1-fy)+(d*(1-fx)+e*fx)*fy;}return out;}
// le point le plus proche d'un triangle (Ericson, Real-Time Collision Detection 5.1.5) : renvoie la distance² et les coordonnées barycentriques
function closest(px,py,pz,ax,ay,az,bx,by,bz,cx,cy,cz,R){const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=px-ax,apy=py-ay,apz=pz-az;
  const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;let u,v,w;
  if(d1<=0&&d2<=0){u=1;v=0;w=0;}else{const bpx=px-bx,bpy=py-by,bpz=pz-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
    if(d3>=0&&d4<=d3){u=0;v=1;w=0;}else{const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);u=1-t;v=t;w=0;}
      else{const cpx=px-cx,cpy=py-cy,cpz=pz-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
        if(d6>=0&&d5<=d6){u=0;v=0;w=1;}else{const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);u=1-t;v=0;w=t;}
          else{const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const t=(d4-d3)/((d4-d3)+(d5-d6));u=0;v=1-t;w=t;}
            else{const den=1/(va+vb+vc);v=vb*den;w=vc*den;u=1-v-w;}}}}}}
  const qx=ax*u+bx*v+cx*w,qy=ay*u+by*v+cy*w,qz=az*u+bz*v+cz*w;R[0]=u;R[1]=v;R[2]=w;return (qx-px)**2+(qy-py)**2+(qz-pz)**2;}

function bake(name){const t0=Date.now();const dir=path.join(SRC,name);const walk=x=>fs.readdirSync(x,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(x,e.name)):[path.join(x,e.name)]);
  const objF=walk(dir).find(f=>/\.obj$/i.test(f));if(!objF){console.log('pas d’OBJ :',name);return;}
  const J=JSON.parse(fs.readFileSync(path.join(JS,name+'.json'),'utf8'));if(J.tex){console.log(name,': déjà cuit');return;}
  const T_=()=>((Date.now()-t0)/1000).toFixed(1)+' s';const o=parseObj(objF);if(process.env.DBG)console.log('  lu',T_());const nf=o.FV.length/3;const texOf=o.mats.map(nm=>{const m=o.mtl[nm];return m&&m.map&&fs.existsSync(m.map)?loadTex(m.map):null;});const kdOf=o.mats.map(nm=>(o.mtl[nm]?.kd||[.7,.7,.7]).map(x=>x*255));
  // le repère : la diagonale de l'original (exacte), le décalage par les boîtes
  if(process.env.DBG)console.log('  textures',T_());const n0=o.P.length/3;const mnO=[1e30,1e30,1e30],mxO=[-1e30,-1e30,-1e30];for(let i=0;i<n0;i++)for(let k=0;k<3;k++){const v=o.P[3*i+k];if(v<mnO[k])mnO[k]=v;if(v>mxO[k])mxO[k]=v;}
  const diag=Math.hypot(mxO[0]-mnO[0],mxO[1]-mnO[1],mxO[2]-mnO[2]);
  const parts=J.parts?J.parts:[{n:null,p:J.p,i:J.i,c:J.c}];const k16=J.half/32767;
  const dec=parts.map(q=>{const bp=Buffer.from(q.p,'base64');const p=new Int16Array(bp.buffer.slice(bp.byteOffset,bp.byteOffset+bp.length));const b=Buffer.from(q.i,'base64');const idx=new Uint16Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));return {p,idx};});
  const mnS=[1e30,1e30,1e30],mxS=[-1e30,-1e30,-1e30];for(const d of dec)for(let i=0;i<d.p.length;i++){const v=d.p[i]*k16*diag,kk=i%3;if(v<mnS[kk])mnS[kk]=v;if(v>mxS[kk])mxS[kk]=v;}
  // décalage initial : en y par les BAS (une antenne fine, retirée par la simplification, déplaçait le centre de la boîte — mesuré : taches sur le blindé),
  // en x et z par les centres ; puis affiné par itérations (ICP, translation seule) une fois le nuage construit
  const off=[(mnO[0]+mxO[0])/2-(mnS[0]+mxS[0])/2,mnO[1]-mnS[1],(mnO[2]+mxO[2])/2-(mnS[2]+mxS[2])/2];const toO=(x,y,z,out)=>{out[0]=x*k16*diag+off[0];out[1]=y*k16*diag+off[1];out[2]=z*k16*diag+off[2];return out;};
  // le nuage de points colorés de la surface d'origine : un point par face (son centre), plusieurs sur les grandes faces (un pas de diag/1500),
  // chacun avec la couleur de la texture à cet endroit et la normale de sa face
  const step=diag/+(process.env.PAS||400);const PX=[],PY=[],PZ=[],PC=[],PN=[];const tmp=[0,0,0];
  for(let f=0;f<nf;f++){const a=o.FV[3*f],b=o.FV[3*f+1],c=o.FV[3*f+2];const ax=o.P[3*a],ay=o.P[3*a+1],az=o.P[3*a+2],bx=o.P[3*b],by=o.P[3*b+1],bz=o.P[3*b+2],cx=o.P[3*c],cy=o.P[3*c+1],cz=o.P[3*c+2];
    const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const L=Math.hypot(nx,ny,nz)||1;nx/=L;ny/=L;nz/=L;
    const edge=Math.max(Math.hypot(ux,uy,uz),Math.hypot(vx,vy,vz),Math.hypot(cx-bx,cy-by,cz-bz));const n=Math.max(1,Math.min(10,Math.ceil(edge/step)));
    const m=o.FM[f];const tx=m>=0?texOf[m]:null;const t0=o.FT[3*f],t1=o.FT[3*f+1],t2=o.FT[3*f+2];const kd=m>=0?kdOf[m]:[180,180,180];
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){const l1=(i+1/3)/n,l2=(j+1/3)/n,l0=1-l1-l2;if(l0<0)continue;
      PX.push(ax*l0+bx*l1+cx*l2);PY.push(ay*l0+by*l1+cy*l2);PZ.push(az*l0+bz*l1+cz*l2);PN.push(nx,ny,nz);
      if(tx&&t0>=0&&t1>=0&&t2>=0){sample(tx,o.T[2*t0]*l0+o.T[2*t1]*l1+o.T[2*t2]*l2,o.T[2*t0+1]*l0+o.T[2*t1+1]*l1+o.T[2*t2+1]*l2,tmp);PC.push(tmp[0],tmp[1],tmp[2]);}else PC.push(kd[0],kd[1],kd[2]);}}
  // l'arbre k-d des points (feuilles de 8) : les plus proches voisins en O(log n)
  const np=PX.length;const X=Float32Array.from(PX),Y=Float32Array.from(PY),Z=Float32Array.from(PZ),A=[X,Y,Z];const idx=Int32Array.from({length:np},(_,k)=>k);
  const nLo=[],nHi=[],nAx=[],nSp=[],nL=[],nR=[];
  const select=(lo,hi,k,ax)=>{const V=A[ax];while(hi-lo>1){const piv=V[idx[(lo+hi)>>1]];let a=lo,b=hi-1;while(a<=b){while(V[idx[a]]<piv)a++;while(V[idx[b]]>piv)b--;if(a<=b){const t=idx[a];idx[a]=idx[b];idx[b]=t;a++;b--;}}if(k<=b)hi=b+1;else if(k>=a)lo=a;else return;}};
  const build=(lo,hi)=>{const id=nLo.length;nLo.push(lo);nHi.push(hi);nAx.push(-1);nSp.push(0);nL.push(-1);nR.push(-1);if(hi-lo<=8)return id;
    const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(let q=lo;q<hi;q++){const k=idx[q];for(let a=0;a<3;a++){const v=A[a][k];if(v<mn[a])mn[a]=v;if(v>mx[a])mx[a]=v;}}
    const ax=[0,1,2].sort((a,b)=>(mx[b]-mn[b])-(mx[a]-mn[a]))[0];const mid=(lo+hi)>>1;select(lo,hi,mid,ax);nAx[id]=ax;nSp[id]=A[ax][idx[mid]];
    const l=build(lo,mid),r=build(mid,hi);nL[id]=l;nR[id]=r;return id;};
  build(0,np);if(process.env.DBG)console.log('  nuage',np,'points, arbre',nLo.length,'nœuds',T_());
  const K=10,hd=new Float64Array(K),hk=new Int32Array(K);let hn=0;let QN=0,QT=0;const col=[0,0,0];
  const push=(d,k)=>{if(hn<K){let i=hn++;while(i>0&&hd[i-1]>d){hd[i]=hd[i-1];hk[i]=hk[i-1];i--;}hd[i]=d;hk[i]=k;}else if(d<hd[K-1]){let i=K-1;while(i>0&&hd[i-1]>d){hd[i]=hd[i-1];hk[i]=hk[i-1];i--;}hd[i]=d;hk[i]=k;}};
  const near=(id,px,py,pz)=>{if(nAx[id]<0){for(let q=nLo[id];q<nHi[id];q++){const k=idx[q];QT++;push((X[k]-px)**2+(Y[k]-py)**2+(Z[k]-pz)**2,k);}return;}
    const ax=nAx[id],v=ax===0?px:ax===1?py:pz,dd=v-nSp[id];const first=dd<0?nL[id]:nR[id],second=dd<0?nR[id]:nL[id];near(first,px,py,pz);if(hn<K||dd*dd<hd[hn-1])near(second,px,py,pz);};
  const colorAt=(px,py,pz,nx,ny,nz,out)=>{QN++;hn=0;near(0,px,py,pz);if(!hn){out[0]=out[1]=out[2]=150;return out;}
    // parmi les plus proches (jusqu'à 1,8 fois la distance du plus proche), on garde la surface la plus EXTÉRIEURE le long de la normale de la face, et qui
    // regarde du même côté : la surface qu'on voit (les modèles d'origine ont des parois intérieures — mesuré : des taches noires sur le blindé)
    let best=hk[0],bv=-Infinity;const lim=hd[0]*3.24+(diag*.002)**2;for(let i=0;i<hn;i++){const k=hk[i];if(hd[i]>lim)break;const dot=PN[3*k]*nx+PN[3*k+1]*ny+PN[3*k+2]*nz;if(dot<-.2)continue;
      const out=(X[k]-px)*nx+(Y[k]-py)*ny+(Z[k]-pz)*nz;if(out>bv){bv=out;best=k;}}
    out[0]=PC[3*best];out[1]=PC[3*best+1];out[2]=PC[3*best+2];return out;};
  // ICP : chaque sommet du modèle réduit vers le point d'origine le plus proche ; la translation moyenne (médiane, robuste) corrige le décalage
  {const V=[];for(const d of dec)for(let i=0;i<d.p.length;i+=3)V.push([d.p[i],d.p[i+1],d.p[i+2]]);const step2=Math.max(1,Math.floor(V.length/3000));const w=[0,0,0];
    for(let it=0;it<8;it++){const dx=[],dy=[],dz=[];for(let k=0;k<V.length;k+=step2){toO(...V[k],w);hn=0;near(0,w[0],w[1],w[2]);if(!hn)continue;const q=hk[0];dx.push(X[q]-w[0]);dy.push(Y[q]-w[1]);dz.push(Z[q]-w[2]);}
      const med=a=>{a.sort((x,y)=>x-y);return a.length?a[a.length>>1]:0;};const m=[med(dx),med(dy),med(dz)];off[0]+=m[0];off[1]+=m[1];off[2]+=m[2];
      if(process.env.DBG)console.log('    ICP',it,'correction',m.map(v=>(v/diag).toFixed(4)).join(' '));if(Math.hypot(...m)<diag*1e-4)break;}}
  // l'atlas : deux faces par case carrée (moitié basse-gauche, moitié haute-droite), une marge d'un demi-pixel
  const T=dec.reduce((a,d)=>a+d.idx.length/3,0);const per=Math.ceil(Math.sqrt(Math.ceil(T/2)));const C=Math.max(6,Math.min(+(process.env.CASE||16),Math.floor(ATLAS/per)));const S=per*C;
  const img=new Uint8Array(S*S*4).fill(255);let slot=0;const outParts=[];
  for(let pi=0;pi<dec.length;pi++){const {p,idx}=dec[pi];const nt=idx.length/3;const P3=new Int16Array(nt*9),UV=new Uint16Array(nt*6),CC=new Uint8Array(nt*9);
    for(let t=0;t<nt;t++){const s=slot++,cx=(Math.floor(s/2)%per)*C,cy=Math.floor(Math.floor(s/2)/per)*C,up=s%2===1;
      const V=[0,1,2].map(k=>{const vi=idx[3*t+k];return [p[3*vi],p[3*vi+1],p[3*vi+2]];});for(let k=0;k<3;k++)P3.set(V[k],t*9+k*3);
      const W0=toO(...V[0],[0,0,0]),W1=toO(...V[1],[0,0,0]),W2=toO(...V[2],[0,0,0]);const ux=W1[0]-W0[0],uy=W1[1]-W0[1],uz=W1[2]-W0[2],vx=W2[0]-W0[0],vy=W2[1]-W0[1],vz=W2[2]-W0[2];
      let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const L=Math.hypot(nx,ny,nz)||1;nx/=L;ny/=L;nz/=L;
      // coins dans l'atlas (pixels) : bas-gauche (A au coin, B à droite, C en haut) ; haut-droite (A au coin opposé)
      const m=1.5,a=up?[cx+C-m,cy+C-m]:[cx+m,cy+m],b=up?[cx+m+1,cy+C-m]:[cx+C-m-1,cy+m],c=up?[cx+C-m,cy+m+1]:[cx+m,cy+C-m-1];
      const crn=[a,b,c];for(let k=0;k<3;k++){UV[t*6+2*k]=Math.round(crn[k][0]/S*65535);UV[t*6+2*k+1]=Math.round(crn[k][1]/S*65535);}
      // chaque pixel de la demi-case (et sa marge) : sa position sur la face (barycentriques ramenées dans le triangle) → la couleur de l'original
      let sr=0,sg=0,sb=0,sn=0;const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
      for(let y=cy;y<cy+C;y++)for(let x=cx;x<cx+C;x++){const inUp=(x-cx)+(y-cy)>=C-1;if(inUp!==up)continue;const X=x+.5,Y=y+.5;
        let l1=((X-a[0])*(c[1]-a[1])-(c[0]-a[0])*(Y-a[1]))/det,l2=((b[0]-a[0])*(Y-a[1])-(X-a[0])*(b[1]-a[1]))/det;l1=Math.max(0,l1);l2=Math.max(0,l2);const sm=l1+l2;if(sm>1){l1/=sm;l2/=sm;}const l0=1-l1-l2;
        const px=W0[0]*l0+W1[0]*l1+W2[0]*l2,py=W0[1]*l0+W1[1]*l1+W2[1]*l2,pz=W0[2]*l0+W1[2]*l1+W2[2]*l2;colorAt(px,py,pz,nx,ny,nz,col);
        const o4=(y*S+x)*4;img[o4]=col[0];img[o4+1]=col[1];img[o4+2]=col[2];img[o4+3]=255;sr+=col[0];sg+=col[1];sb+=col[2];sn++;}
      const avg=[sr/sn,sg/sn,sb/sn].map(v=>Math.round(v));for(let k=0;k<3;k++)CC.set(avg,t*9+k*3);}
    const b64=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
    outParts.push({...parts[pi],p:b64(P3),i:b64(Uint16Array.from({length:nt*3},(_,k)=>k)),c:b64(CC),uv:b64(UV),verts:nt*3});}
  if(process.env.DBG)console.log('  cuisson',T_(),'requêtes',QN,'tests',QT);
  const jp=jpeg.encode({data:Buffer.from(img.buffer),width:S,height:S},88).data;
  const out={...J,tex:'data:image/jpeg;base64,'+jp.toString('base64'),atlas:S};if(J.parts)out.parts=outParts.map(q=>{const {n,pv,tris}=q;return {...q,n,pv,tris};});else{const q=outParts[0];out.p=q.p;out.i=q.i;out.c=q.c;out.uv=q.uv;out.verts=q.verts;}
  fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(out));
  console.log(`${name}: ${T} faces cuites sur ${nf} d’origine · atlas ${S}×${S} (cases de ${C} px) · ${(jp.length/1024)|0} Ko d’image · ${((Date.now()-t0)/1000).toFixed(1)} s`);}

fs.mkdirSync(OUT,{recursive:true});
const names=ONLY.length?ONLY:fs.readdirSync(SRC).filter(d=>fs.statSync(path.join(SRC,d)).isDirectory()&&fs.existsSync(path.join(JS,d+'.json')));
for(const n of names){try{bake(n);}catch(e){console.log('ERREUR',n,e&&e.stack||e);}}
