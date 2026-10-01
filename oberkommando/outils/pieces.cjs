// Les pièces d'un OBJ découpé (Tripo : « o tripo_part_N ») : pour chacune, ses faces et sa boîte englobante, dans le repère du modèle
// normalisé (x, z centrés ; y posé à 0 ; la plus grande demi-dimension vaut 1). Sert à ranger les pièces d'un véhicule en caisse,
// roues, tourelle, canon, avant de les convertir en pièces animées (convertir.cjs, SPLIT).
// Lancer :  ELECTRON_RUN_AS_NODE=1 electron.exe outils/pieces.cjs <fichier.obj>
const fs=require('fs');
const file=process.argv[2];const txt=fs.readFileSync(file,'latin1');
const P=[];const parts=new Map();let cur=null;let pos=0;const N=txt.length;
while(pos<N){let e=txt.indexOf('\n',pos);if(e<0)e=N;const c0=txt.charCodeAt(pos),c1=txt.charCodeAt(pos+1);
  if(c0===118&&c1===32){const s=txt.substring(pos+2,e).trim().split(/\s+/);P.push(+s[0],+s[1],+s[2]);}
  else if(c0===111&&c1===32){const nm=txt.substring(pos+2,e).trim();if(!parts.has(nm))parts.set(nm,{n:nm,f:0,mn:[1e30,1e30,1e30],mx:[-1e30,-1e30,-1e30]});cur=parts.get(nm);}
  else if(c0===102&&c1===32&&cur){const s=txt.substring(pos+2,e).trim().split(/\s+/);cur.f+=s.length-2;
    for(const tok of s){let a=+tok.split('/')[0];a=a<0?P.length/3+a:a-1;for(let k=0;k<3;k++){const v=P[3*a+k];if(v<cur.mn[k])cur.mn[k]=v;if(v>cur.mx[k])cur.mx[k]=v;}}}
  pos=e+1;}
const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(const p of parts.values())for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p.mn[k]);mx[k]=Math.max(mx[k],p.mx[k]);}
const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2,half=Math.max((mx[0]-mn[0])/2,(mx[2]-mn[2])/2,mx[1]-mn[1]);
const nx=v=>((v-cx)/half),ny=v=>((v-mn[1])/half),nz=v=>((v-cz)/half);const f2=v=>(v>=0?' ':'')+v.toFixed(2);
console.log(`ensemble : x ${f2(nx(mn[0]))}..${f2(nx(mx[0]))}  y ${f2(ny(mn[1]))}..${f2(ny(mx[1]))}  z ${f2(nz(mn[2]))}..${f2(nz(mx[2]))}  (${parts.size} pièces)`);
for(const p of [...parts.values()].sort((a,b)=>+a.n.replace(/\D/g,'')- +b.n.replace(/\D/g,''))){
  const d=[p.mx[0]-p.mn[0],p.mx[1]-p.mn[1],p.mx[2]-p.mn[2]].map(v=>v/half);
  console.log(`${p.n.padEnd(15)} ${String(p.f).padStart(7)} f | x ${f2(nx(p.mn[0]))}..${f2(nx(p.mx[0]))} y ${f2(ny(p.mn[1]))}..${f2(ny(p.mx[1]))} z ${f2(nz(p.mn[2]))}..${f2(nz(p.mx[2]))} | taille ${d.map(v=>v.toFixed(2)).join(' × ')}`);}
