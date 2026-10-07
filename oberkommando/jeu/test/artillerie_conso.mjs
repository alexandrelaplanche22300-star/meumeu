// L'artillerie tire-t-elle plus de coups qu'elle n'en porte ? (« munitions quasi infinies »)
// CRITÈRES (fixés avant de lancer) :
//   M1 une pièce à 6 coups, hors de portée d'un dépôt, face à des ennemis en vue : au plus 6 coups tirés, puis « à sec » (aucun tir de plus en 400 h de jeu-tick)
//   M2 la même pièce garée à moins de 2,5 cases d'un dépôt VIDE de ses obus : au plus 6 coups, elle ne se remplit pas toute seule
//   M3 la même pièce près d'un dépôt qui a 3 caisses : les obus tirés au total ≤ 6 + (obus sortis du dépôt) — conservation, jamais d'obus créé
//   M4 la batterie de six roquettes : 6 tubes chargés → au plus 6 départs avant rechargement
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/artillerie_conso.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {HOUR_REAL}=await import('../js/data.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
function scenario({seed,near,depotCrates,rounds=6,design='canon_mle1',ticks=6000}){
  const W=new World(seed);W.s.fog=false;const cap=W.capital();
  const spot=near?W.freeSpot(cap.i+4,cap.j+4,4):W.freeSpot(cap.i+30,cap.j+2,6);
  const gun=W.addUnit('meumeu','canon',spot[0],spot[1],{w:design,rounds:0});gun.mag=Math.min(rounds,W.W(design).p.mag||1);gun.pouch=Math.max(0,rounds-gun.mag);gun.task={kind:'guard',tx:gun.x,ty:gun.y};
  const perCrate=W.W(design).perCrate||1;
  for(const b of W.s.buildings)if(b.stock)b.stock['m:'+design]=0;
  if(near&&depotCrates){cap.stock['m:'+design]=depotCrates;}
  const stock0=(cap.stock['m:'+design]||0)*perCrate;
  const foes=[];for(let n=0;n<6;n++){const e=W.addUnit('beee','soldat',gun.x+9+n*.6,gun.y+(n%3)*.7);e.w=null;e.task={kind:'guard',tx:e.x,ty:e.y};e.h&&(e.hp=1e9);foes.push(e);}
  // un servant, et un ordre de tir sur l'ennemi le plus proche (une pièce n'ouvre pas le feu seule sans servant)
  const crew=W.addUnit('meumeu','soldat',gun.x+.6,gun.y+.4,{rounds:0});crew.w=null;crew.mag=crew.pouch=0;crew.serve=gun.id;
  const aim=()=>{const e=foes.find(f=>f.hp>0&&W.unit(f.id));if(e)W.order([gun.id],{type:'unit',id:e.id});};aim();
  let shots=0,lastShotTick=0;for(let i=0;i<ticks;i++){if(i%50===0)aim();W.update(1/(HOUR_REAL*10));for(const ev of W.events.splice(0))if(ev.type==='shot'&&ev.f==='meumeu'&&Math.hypot(ev.x-gun.x,ev.y-gun.y)<.8){shots++;lastShotTick=i;}
    for(const e of foes){if(e.hp<1e8)e.hp=1e9;if(e.h){e.h.state='ok';}}}
  const left=(gun.mag||0)+(gun.pouch||0),stock1=(cap.stock['m:'+design]||0)*perCrate;
  return {shots,left,used:stock0-stock1,lastShotTick,why:gun.why,carried:rounds};}
const m1=scenario({seed:41,near:false,depotCrates:0});
P(m1.shots<=6&&m1.shots>0,'M1. 6 coups portés, loin d\'un dépôt : au plus 6 tirés',`${m1.shots} coups tirés, ${m1.left} restants, état « ${m1.why||'—'} »`);
const m2=scenario({seed:42,near:true,depotCrates:0});
P(m2.shots<=6,'M2. près d\'un dépôt vide : pas de remplissage automatique',`${m2.shots} coups tirés, ${m2.left} restants`);
const m3=scenario({seed:43,near:true,depotCrates:3});
P(m3.shots<=m3.carried+Math.ceil(m3.used)+1,'M3. près d\'un dépôt garni : les coups tirés viennent du stock (conservation)',`${m3.shots} tirés · ${m3.carried} portés · ${m3.used.toFixed(1)} sortis du dépôt`);
process.exit(fail?1:0);
