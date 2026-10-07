// Ravitaillement du camp avancé, version stricte : on ne s'arrête pas quand les soldats sont servis.
// On suit, heure par heure, le stock de munitions du camp, la demande « front » qui lui est adressée, le fret en route,
// et d'où chaque soldat a réellement pris ses caisses (camp ou capitale).
//   node test/ravitaillement_strict.mjs [graine] [heures] [coupe]     coupe=1 : le porteur n'a pas le droit d'aller à la capitale
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const seed=+(process.argv[2]||31),H=+(process.argv[3]||24),cut=process.argv[4]==='1';
function spot(W,cx,cy,R){const comp=W.G.comp,N=W.N,c0=comp[Math.floor(cy)*N+Math.floor(cx)];
  for(let a=0;a<64;a++){const x=cx+Math.cos(a/64*6.283)*R,y=cy+Math.sin(a/64*6.283)*R;const k=Math.floor(y)*N+Math.floor(x);
    let ok=true;for(let dj=-2;dj<=2&&ok;dj++)for(let di=-2;di<=2;di++){const kk=k+dj*N+di;if(!TERRAIN[W.G.terrain[kk]]?.walk||W.occ[kk]>=0||comp[kk]!==c0){ok=false;break;}}if(ok)return [x,y];}return null;}
const W=new World(seed);for(let h=0;h<6;h++)W.update(1);const cap=W.capital();const cx=cap.i+2,cy=cap.j+2;
for(const b of W.s.buildings)if(b.f==='meumeu'&&b.stock)delete b.stock['m:mle1'];cap.stock['m:mle1']=60;
const [x,y]=spot(W,cx,cy,40);
const dry=(x,y)=>{const u=W.addUnit('meumeu','soldat',x,y);u.w='mle1';u.mag=0;u.pouch=0;u.task={kind:'guard',tx:x,ty:y};return u;};
const us=[0,1,2].map(n=>dry(x+n*.7,y));const b=dry(x,y+.8);W.formSquad([...us,b].map(u=>u.id));W.setRole(b,'munitions');b.crates=0;
let camp=null;for(let r=4;r<12&&!camp;r++)for(let a=0;a<16&&!camp;a++){const i=Math.round(x+Math.cos(a/16*6.283)*r),j=Math.round(y+Math.sin(a/16*6.283)*r);if(W.canPlace('meumeu','camp',i,j).ok)camp=W.place('meumeu','camp',i,j).b;}
if(!camp){console.log('camp non posé');process.exit(1);}
camp.done=true;camp.progress=1;camp.hp=camp.max;W.addPorters(cap,2);
const k='m:mle1';let campMax=0,campFirst=null,capTaken=0,capStart=cap.stock[k];
const dt=1/240;const t0=W.s.t;let served=null;
for(let n=0;n<H*240;n++){W.update(dt);
  if(cut&&b.task?.ammoRun==='dep'&&W.distB(cap,b.x,b.y)<W.distB(camp,b.x,b.y)){b.task=null;b.crates=0;}   // interdit de repartir à la capitale
  const cs=camp.stock[k]||0;if(cs>campMax)campMax=cs;if(cs>0&&campFirst==null)campFirst=W.s.t-t0;
  if(served==null&&us.every(u=>u.mag+u.pouch>0))served=W.s.t-t0;
  if(n%(240*4)===0){const M=W.market('meumeu');const d=(M.dem.get(camp.id)?.[k]||[]).map(q=>`${q.src}:${q.n}`).join(',');
    console.log(`h${((W.s.t-t0)).toFixed(1)} camp=${cs.toFixed(2)} demande[${d}] fret vers camp=${((M.inb.get(camp.id)||{})[k]||0).toFixed(2)} capitale=${(cap.stock[k]||0).toFixed(1)} soldats=${us.map(u=>(u.mag+u.pouch)|0).join(',')} porteur=${b.task?.ammoRun||'-'}`);}}
console.log(`\nsoldats servis : ${served!=null?served.toFixed(1)+' h':'JAMAIS'} · camp : max ${campMax.toFixed(2)} caisses, première arrivée ${campFirst!=null?campFirst.toFixed(1)+' h':'JAMAIS'} · capitale : ${capStart} → ${(cap.stock[k]||0).toFixed(1)}`);
const ok=served!=null&&campFirst!=null;console.log(ok?'OK : le fret alimente réellement le camp avancé':'ÉCHEC : le camp avancé ne reçoit aucune caisse');process.exit(ok?0:1);
