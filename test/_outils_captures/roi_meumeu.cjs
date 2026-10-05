// Le roi Meumeu (V12.7) : le modèle meumeu, plus LA CAPE de l'Élite à cape (plush_cow_knight : le velours rouge, sa bordure et son col d'hermine —
// détachés par la couleur et la distance au velours), ajustée au dos du Meumeu hauteur par hauteur, et une couronne d'or faite ici. Les modèles
// d'origine ne sont PAS modifiés (règle : ne jamais toucher au soldat camouflé ni à l'élite à cape) : on les lit, on écrit assets3d/meumeu_roi.json.
//   ELECTRON_RUN_AS_NODE=1 electron.exe test/_outils_captures/roi_meumeu.cjs
const fs=require('fs'),path=require('path');const A=path.join(__dirname,'../../assets3d/');
const dec=n=>{const m=JSON.parse(fs.readFileSync(A+n+'.json','utf8'));const b=s=>Buffer.from(s,'base64');const pb=b(m.p),cb=b(m.c),ib=b(m.i);const k=m.half/32767;
  const p=new Int16Array(pb.buffer.slice(pb.byteOffset,pb.byteOffset+pb.length));return {m,P:Array.from(p,v=>v*k),C:Array.from(new Uint8Array(cb)),I:Array.from(new Uint16Array(ib.buffer.slice(ib.byteOffset,ib.byteOffset+ib.length)))};};
const M=dec('meumeu'),K=dec('plush_cow_knight');
// ---- la cape de l'élite : le velours rouge, et ce qui le borde de près sous la tête (l'hermine), sans le museau ni les jambes de devant
const isRed=(d,v)=>d.C[v*3]>77&&d.C[v*3+1]<41&&d.C[v*3+2]<56;
const nt=K.I.length/3,cen=[],red=[];for(let t=0;t<nt;t++){const v=[0,1,2].map(q=>K.I[t*3+q]);cen.push([0,1,2].map(a=>(K.P[v[0]*3+a]+K.P[v[1]*3+a]+K.P[v[2]*3+a])/3));red.push(isRed(K,v[0]));}
const RC=cen.filter((_,t)=>red[t]);const dRed=c=>{let m=9;for(const q of RC){const d=Math.hypot(q[0]-c[0],q[1]-c[1],q[2]-c[2]);if(d<m)m=d;}return m;};
const keep=[];for(let t=0;t<nt;t++){const [cx,cy,cz]=cen[t];if(red[t]){keep.push(t);continue;}if(cy>=.46)continue;
  if(cz>.03&&cy>.34&&Math.abs(cx)<.14)continue;   // le museau de l'élite, au-dessus du col
  if(Math.abs(cx)<.14&&cz>-.04&&cy<.34)continue;   // ses jambes, son plastron, les cordons, entre les pans
  if(dRed(cen[t])<.045)keep.push(t);}
// ---- placer la cape : à l'échelle (uniforme), centrée sur l'axe du Meumeu, puis PLAQUÉE autour de son corps — à chaque hauteur et dans chaque
// direction, le Meumeu (épaules et bras compris) a un rayon ; un point de la cape qui y entre est repoussé juste dehors ; le col est resserré au cou
const SY=M.m.ext[1]/K.m.ext[1],SXZ=1.12,GAP=.014,DY=.01,NA=48;
const capeV=new Set(keep.flatMap(t=>[0,1,2].map(q=>K.I[t*3+q])));
// l'axe d'un corps (le milieu du tronc d'avant en arrière, hauteur par hauteur), sans la cape
const axisOf=(d,skip)=>{const n=Math.ceil(.8/DY)+1,lo=new Array(n).fill(9),hi=new Array(n).fill(-9);for(let v=0;v<d.P.length/3;v++){if(skip(v))continue;const x=d.P[v*3],y=d.P[v*3+1],z=d.P[v*3+2];if(Math.abs(x)>.08)continue;const b=Math.round(y/DY);lo[b]=Math.min(lo[b],z);hi[b]=Math.max(hi[b],z);}
  const a=lo.map((l,i)=>l<9?(l+hi[i])/2:null);for(let i=0;i<n;i++)if(a[i]==null){let j=i;while(j<n&&a[j]==null)j++;a[i]=j<n?a[j]:a[i-1]??0;}return a.map((_,i)=>{let s=0,c=0;for(let k=-3;k<=3;k++)if(a[i+k]!=null){s+=a[i+k];c++;}return s/c;});};
const axM=axisOf(M,()=>false);
// les dos, hauteur par hauteur (lissés) : celui de la cape de l'élite, celui du Meumeu (le plus en arrière autour, la queue comprise)
const prof=(d,pick,y,band=.025)=>{let z=9;for(let v=0;v<d.P.length/3;v++){const Y=d.P[v*3+1];if(Math.abs(Y-y)>band||!pick(v))continue;if(Math.abs(d.P[v*3])<.1)z=Math.min(z,d.P[v*3+2]);}return z<9?z:null;};
const Ys=[];for(let y=0;y<=.5;y+=.02)Ys.push(y);
const fill=a=>{for(let i=0;i<a.length;i++)if(a[i]==null){let j=i;while(j<a.length&&a[j]==null)j++;a[i]=a[j<a.length?j:i-1]??a[i-1]??0;}return a;};
const smooth=a=>a.map((_,i)=>{let s=0,n=0;for(let k=-2;k<=2;k++){const x=a[i+k];if(x!=null){s+=x;n++;}}return s/n;});
const Bk=fill(Ys.map(y=>prof(K,v=>capeV.has(v),y))),Bm=fill(Ys.map(y=>prof(M,()=>true,y*SY,.03)));
const bk=smooth(Bk),bm=smooth(Bm.map((z,i)=>Math.min(z,...Bm.slice(Math.max(0,i-2),i+3))));
const at=(a,y)=>{const f=Math.max(0,Math.min(Ys.length-1.001,y/.02)),i=Math.floor(f),w=f-i;return a[i]*(1-w)+a[i+1]*w;};
const ax=(a,y)=>{const f=Math.max(0,Math.min(a.length-1.001,y/DY)),i=Math.floor(f),w=f-i;return a[i]*(1-w)+a[i+1]*w;};
// le rayon du Meumeu : tranches de 1 cm, 48 directions, dilaté puis lissé (pas de dents)
const NB=Math.ceil(.8/DY)+1,Rad=Array.from({length:NB},()=>new Array(NA).fill(0));
for(let v=0;v<M.P.length/3;v++){const x=M.P[v*3],y=M.P[v*3+1],z=M.P[v*3+2]-ax(axM,M.P[v*3+1]);const b=Math.round(y/DY),s=((Math.round(Math.atan2(z,x)/(2*Math.PI)*NA)%NA)+NA)%NA;Rad[b][s]=Math.max(Rad[b][s],Math.hypot(x,z));}
let R2=Rad.map((row,b)=>row.map((_,s)=>{let m=0;for(let db=-2;db<=2;db++)for(let ds=-2;ds<=2;ds++){const r=Rad[b+db]?.[(s+ds+NA)%NA];if(r>m)m=r;}return m;}));
R2=R2.map((row,b)=>row.map((_,s)=>{let t=0,c=0;for(let db=-1;db<=1;db++)for(let ds=-1;ds<=1;ds++){const r=R2[b+db]?.[(s+ds+NA)%NA];if(r!=null){t+=r;c++;}}return t/c;}));
const radAt=(y,th)=>{const b=Math.max(0,Math.min(NB-1,Math.round(y/DY))),f=((th/(2*Math.PI)*NA)%NA+NA)%NA,s=Math.floor(f),w=f-s;return R2[b][s]*(1-w)+R2[b][(s+1)%NA]*w;};
// ---- le maillage du roi : le Meumeu tel quel, la cape placée, la couronne
const P=[...M.P],C=[...M.C],I=[...M.I];let pushed=0;
const remap=new Map();for(const t of keep)for(let q=0;q<3;q++){const v=K.I[t*3+q];if(!remap.has(v)){const x0=K.P[v*3],y0=K.P[v*3+1],z0=K.P[v*3+2];remap.set(v,P.length/3);
    const y=y0*SY,x=x0*SXZ,dz=(z0-at(bk,y0))*1.15+at(bm,y0)-GAP-ax(axM,y);let r=Math.hypot(x,dz);const th=Math.atan2(dz,x),R=radAt(y,th)+GAP;
    if(y0>.38)r+=(R-r)*.5;else if(r<R){r=R;pushed++;}   // (le col : contre le cou ; ailleurs : jamais dans le corps)
    P.push(Math.cos(th)*r,y,ax(axM,y)+Math.sin(th)*r);C.push(K.C[v*3],K.C[v*3+1],K.C[v*3+2]);}I.push(remap.get(v));}
console.log('cape : sommets repoussés hors du corps',pushed,'sur',remap.size);
// la couronne : un bandeau d'or, cinq pointes, des pierres — sur le haut de la tête, entre les cornes
let top=0;for(let v=0;v<M.P.length/3;v++)top=Math.max(top,M.P[v*3+1]);
let fx0=9,fx1=-9;for(let v=0;v<M.P.length/3;v++){const y=M.P[v*3+1],z=M.P[v*3+2],l=M.C[v*3]+M.C[v*3+1]+M.C[v*3+2];if(y>.48&&y<.66&&z>.08&&l<330){fx0=Math.min(fx0,M.P[v*3]);fx1=Math.max(fx1,M.P[v*3]);}}
let zb=9,zf=-9;for(let v=0;v<M.P.length/3;v++){const y=M.P[v*3+1],x=M.P[v*3];if(Math.abs(y-(top-.06))<.02&&Math.abs(x-(fx0+fx1)/2)<.05){zb=Math.min(zb,M.P[v*3+2]);zf=Math.max(zf,M.P[v*3+2]);}}
const hx=(fx0+fx1)/2,hz=(zb+zf)/2;console.log('axe du visage x',fx0.toFixed(3),'..',fx1.toFixed(3),'· tête z',zb.toFixed(3),'..',zf.toFixed(3));
const GOLD=[236,184,52],GOLD2=[200,140,30],RUBY=[200,24,40],SAPH=[40,80,210];
const tri=(a,b,c,col)=>{for(const p of [a,b,c]){P.push(...p);C.push(...col);I.push(P.length/3-1);}};
const quad=(a,b,c,d,col)=>{tri(a,b,c,col);tri(a,c,d,col);};
const R0=.062,R1=.066,y0=top-.045,y1=top-.008,N=20;
for(let k=0;k<N;k++){const a=k/N*Math.PI*2,b=(k+1)/N*Math.PI*2,p=(r,y,t)=>[hx+Math.cos(t)*r,y,hz+Math.sin(t)*r];
  quad(p(R1,y0,a),p(R1,y0,b),p(R1,y1,b),p(R1,y1,a),k%2?GOLD:GOLD2);quad(p(R0,y0,b),p(R0,y0,a),p(R0,y1,a),p(R0,y1,b),GOLD2);quad(p(R0,y1,a),p(R0,y1,b),p(R1,y1,b),p(R1,y1,a),GOLD);}
for(let k=0;k<5;k++){const t=k/5*Math.PI*2+Math.PI/2,w=.32,p=(r,y,u)=>[hx+Math.cos(u)*r,y,hz+Math.sin(u)*r];const tip=p(R1*.95,y1+.042,t);
  tri(p(R1,y1,t-w),p(R1,y1,t+w),tip,GOLD);tri(p(R0,y1,t+w),p(R0,y1,t-w),tip,GOLD2);tri(p(R0,y1,t-w),p(R1,y1,t-w),tip,GOLD2);tri(p(R1,y1,t+w),p(R0,y1,t+w),tip,GOLD2);
  const g=p(R1+.004,(y0+y1)/2,t),col=k%2?RUBY:SAPH,s=.011;quad([g[0]-Math.sin(t)*s,g[1],g[2]+Math.cos(t)*s],[g[0],g[1]+s,g[2]],[g[0]+Math.sin(t)*s,g[1],g[2]-Math.cos(t)*s],[g[0],g[1]-s,g[2]],col);
  const ball=p(R1*.95,y1+.047,t);for(let j=0;j<4;j++){const u=j/4*Math.PI*2,v=(j+1)/4*Math.PI*2,r=.007;tri([ball[0]+Math.cos(u)*r,ball[1],ball[2]+Math.sin(u)*r],[ball[0]+Math.cos(v)*r,ball[1],ball[2]+Math.sin(v)*r],[ball[0],ball[1]+r*1.6,ball[2]],GOLD);}}
// ---- l'écriture, au format des modèles (positions Int16 sur half, couleurs Uint8, indices Uint16)
const nv=P.length/3;if(nv>65535)throw new Error('trop de sommets : '+nv);
let bb=[9,9,9,-9,-9,-9];for(let v=0;v<nv;v++)for(let a=0;a<3;a++){bb[a]=Math.min(bb[a],P[v*3+a]);bb[a+3]=Math.max(bb[a+3],P[v*3+a]);}
const half=Math.max(...P.map(Math.abs));const q=new Int16Array(P.map(v=>Math.round(v/half*32767)));
const out={name:'meumeu_roi',tris:I.length/3,verts:nv,ext:[bb[3]-bb[0],bb[4]-bb[1],bb[5]-bb[2]].map(x=>+x.toFixed(5)),half:+half.toFixed(5),
  p:Buffer.from(q.buffer).toString('base64'),i:Buffer.from(new Uint16Array(I).buffer).toString('base64'),c:Buffer.from(new Uint8Array(C)).toString('base64')};
fs.writeFileSync(A+'meumeu_roi.json',JSON.stringify(out));
console.log(`meumeu_roi : ${out.tris} triangles (cape ${keep.length}), ${nv} sommets, ext ${out.ext.join(' × ')}, couronne en (${hx.toFixed(3)}, ${top.toFixed(3)}, ${hz.toFixed(3)})`);
