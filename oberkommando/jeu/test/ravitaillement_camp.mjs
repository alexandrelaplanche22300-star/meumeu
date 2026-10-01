// Le camp avancé sert-il vraiment l'escouade ? Phase 1 : on laisse le fret remplir le camp. Phase 2 : la capitale n'a plus
// une caisse, l'escouade est à sec ; elle ne peut plus être servie que par le camp.
//   node test/ravitaillement_camp.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const seed=+(process.argv[2]||31);
function spot(W,cx,cy,R){const comp=W.G.comp,N=W.N,c0=comp[Math.floor(cy)*N+Math.floor(cx)];
  for(let a=0;a<64;a++){const x=cx+Math.cos(a/64*6.283)*R,y=cy+Math.sin(a/64*6.283)*R;const k=Math.floor(y)*N+Math.floor(x);
    let ok=true;for(let dj=-2;dj<=2&&ok;dj++)for(let di=-2;di<=2;di++){const kk=k+dj*N+di;if(!TERRAIN[W.G.terrain[kk]]?.walk||W.occ[kk]>=0||comp[kk]!==c0){ok=false;break;}}if(ok)return [x,y];}return null;}
const W=new World(seed);for(let h=0;h<6;h++)W.update(1);const cap=W.capital();const cx=cap.i+2,cy=cap.j+2;const k='m:mle1';
for(const b of W.s.buildings)if(b.f==='meumeu'&&b.stock)delete b.stock[k];cap.stock[k]=60;
const [x,y]=spot(W,cx,cy,40);
const dry=(x,y)=>{const u=W.addUnit('meumeu','soldat',x,y);u.w='mle1';u.mag=0;u.pouch=0;u.task={kind:'guard',tx:x,ty:y};return u;};
const us=[0,1,2].map(n=>dry(x+n*.7,y));const b=dry(x,y+.8);W.formSquad([...us,b].map(u=>u.id));W.setRole(b,'munitions');b.crates=0;
let camp=null;for(let r=4;r<12&&!camp;r++)for(let a=0;a<16&&!camp;a++){const i=Math.round(x+Math.cos(a/16*6.283)*r),j=Math.round(y+Math.sin(a/16*6.283)*r);if(W.canPlace('meumeu','camp',i,j).ok)camp=W.place('meumeu','camp',i,j).b;}
camp.done=true;camp.progress=1;camp.hp=camp.max;W.addPorters(cap,2);
let t=0;const run=(h,f)=>{for(let n=0;n<h*240;n++){W.update(1/240);if(f&&f())return true;}return false;};
run(12);const before=camp.stock[k]||0;console.log(`phase 1 (12 h) : le camp a ${before.toFixed(2)} caisses`);
if(before<1){console.log('ÉCHEC : le camp ne s’est pas rempli');process.exit(1);}
// phase 2 : plus rien à la capitale, plus rien dans les mains
cap.stock[k]=0;for(const u of [...us,b]){u.mag=0;u.pouch=0;}b.crates=0;const t0=W.s.t;
const got=run(24,()=>us.every(u=>u.mag+u.pouch>0));
console.log(`phase 2 : ${got?`escouade servie en ${(W.s.t-t0).toFixed(1)} h`:'ESCOUADE JAMAIS SERVIE'} · camp ${(before).toFixed(2)} → ${(camp.stock[k]||0).toFixed(2)} caisses · porteur : ${b.why||b.task?.ammoRun||'-'} · soldats : ${us.map(u=>u.why||'-').join(' | ')}`);
console.log(got&&(camp.stock[k]||0)<before?'OK : le camp avancé ravitaille l’escouade':'ÉCHEC');process.exit(got?0:1);
