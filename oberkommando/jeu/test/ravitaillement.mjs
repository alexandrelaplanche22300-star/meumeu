// La logistique des munitions : une escouade à sec à 40 cases de tout dépôt garni finit-elle ravitaillée ?
//   A : quatre soldats et leur porteur de munitions (il va recharger au dépôt, revient, redistribue) ;
//   B : un soldat seul (il va lui-même au dépôt le plus proche) ;
//   C : un camp-dépôt avancé près de l'escouade : le fret y amène des munitions, le porteur s'y recharge.
// Pas réalistes : W.update(1/240) (une image du vrai jeu).
//   node test/ravitaillement.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const seed=+(process.argv[2]||31);
function spot(W,cx,cy,R){const comp=W.G.comp,N=W.N,c0=comp[Math.floor(cy)*N+Math.floor(cx)];
  for(let a=0;a<64;a++){const x=cx+Math.cos(a/64*6.283)*R,y=cy+Math.sin(a/64*6.283)*R;const k=Math.floor(y)*N+Math.floor(x);
    let ok=true;for(let dj=-2;dj<=2&&ok;dj++)for(let di=-2;di<=2;di++){const kk=k+dj*N+di;if(!TERRAIN[W.G.terrain[kk]]?.walk||W.occ[kk]>=0||comp[kk]!==c0){ok=false;break;}}if(ok)return [x,y];}return null;}
function run(name,setup,H=60){const W=new World(seed);for(let h=0;h<6;h++)W.update(1);const cap=W.capital();const cx=cap.i+2,cy=cap.j+2;
  // seul le centre-ville a des munitions (et en a assez)
  for(const b of W.s.buildings)if(b.f==='meumeu'&&b.stock)delete b.stock['m:mle1'];cap.stock['m:mle1']=30;
  const p=spot(W,cx,cy,40);if(!p){console.log(name,': pas de place');return false;}
  const S=setup(W,p,cap);const us=S.us;const t0=W.s.t;let done=null;
  const dbg=process.env.DBG&&W.s.units.find(u=>u.role==='munitions');
  for(let n=0;n<H*240&&done==null;n++){W.update(1/240);if(us.every(u=>u.mag+u.pouch>0))done=W.s.t-t0;
    if(dbg&&n%480===0)console.log(Math.round(W.s.t-t0),'h porteur',dbg.x.toFixed(1),dbg.y.toFixed(1),'caisses',(dbg.crates||0).toFixed(2),dbg.task?.kind,dbg.task?.ammoRun,dbg.why,'| soldats',us.map(u=>u.mag+u.pouch).join(','));}
  const far=us.map(u=>Math.round(Math.min(...W.s.buildings.filter(b=>b.f==='meumeu'&&W.isDepot(b)&&(b.stock['m:mle1']||0)>=0).map(b=>W.distB(b,u.x,u.y))))).join(',');
  console.log(`${name} : ${done!=null?`tous ravitaillés en ${done.toFixed(1)} h`:`ÉCHEC — ${us.filter(u=>u.mag+u.pouch<=0).length}/${us.length} à sec (${us.map(u=>u.why||'-').join(' | ')})`} · distance au dépôt le plus proche ${far}${S.after?' · '+S.after(W):''}`);
  return done!=null;}
const dry=(W,x,y)=>{const u=W.addUnit('meumeu','soldat',x,y);u.w='mle1';u.mag=0;u.pouch=0;u.task={kind:'guard',tx:x,ty:y};return u;};
const okA=run('A · escouade + porteur',(W,[x,y])=>{const us=[0,1,2,3].map(n=>dry(W,x+n*.7,y));const b=dry(W,x,y+.8);W.formSquad([...us,b].map(u=>u.id));W.setRole(b,'munitions');b.crates=0;return {us};});
const okB=run('B · soldat seul',(W,[x,y])=>({us:[dry(W,x,y)]}));
const okC=run('C · camp-dépôt avancé',(W,[x,y],cap)=>{const us=[0,1,2].map(n=>dry(W,x+n*.7,y));const b=dry(W,x,y+.8);W.formSquad([...us,b].map(u=>u.id));W.setRole(b,'munitions');b.crates=0;
  // un camp bâti à 6 cases de l'escouade, deux porteurs au centre-ville
  let camp=null;for(let r=4;r<12&&!camp;r++)for(let a=0;a<16&&!camp;a++){const i=Math.round(x+Math.cos(a/16*6.283)*r),j=Math.round(y+Math.sin(a/16*6.283)*r);if(W.canPlace('meumeu','camp',i,j).ok)camp=W.place('meumeu','camp',i,j).b;}
  if(camp){camp.done=true;camp.progress=1;camp.hp=camp.max;}W.addPorters(cap,2);
  return {us,after:W2=>camp?`camp : ${(camp.stock['m:mle1']||0).toFixed(1)} caisses reçues`:'camp non posé'};});
console.log(okA&&okB&&okC?'OK : la logistique des munitions tient':'ÉCHEC');
