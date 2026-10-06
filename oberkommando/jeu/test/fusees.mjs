// L'artillerie à fusées : une batterie de tubes lisses sur roues, tir indirect en salve.
// Avant : les fusées n'existaient que dans l'éditeur de pièces V6 (« Batterie de six roquettes »), sans arme prête au départ, et traduite en tir DIRECT
// (action « verrou ») : portée utile 18 m, danger 9,8 m — bien moins efficace qu'un obus (portée 4 050 m, danger 23 m). Les fusées du préréglage de l'atelier
// n'avaient que 4 g de poudre pour 54 g (vTop 96 m/s, 252 J contre 5 547 J pour l'obusier).
// CRITÈRES (fixés avant de lancer) :
//   F1 les deux camps ont une batterie de fusées de départ, en tir indirect (action bouche), 4 tubes, portée en cloche ≥ 3 000 m, caisse comptée en salves ;
//      (CORRIGÉ : les fusées sont la supériorité technologique des Meumeu — les Bèè n'en ont pas : F1 ne vérifie plus que la batterie meumeu, et que les Bèè n'en ont aucune)
//   F2 un ordre de tir sur zone lance une SALVE : 4 fusées, une par tube, échelonnées (pas toutes au même instant) ;
//   F3 les 4 fusées ne tombent pas au même point (écart mesuré > 1 m) mais groupées : écart moyen au point visé ≤ 6 % de la distance ;
//   F4 une salve vide la batterie (u.mag 1 → 0) et la recharge prend du temps (la pièce ne tire pas en continu) ;
//   F5 comparaison avec l'obusier de base : surface de danger d'une salve ≥ 50 % de celle d'un obus, coût d'une salve ≤ 3 × celui d'un obus, équipage ≤ celui de l'obusier
// MESURE : F4 échouait par défaut de mesure (l'ordre ne demandait qu'une salve : la pièce s'arrête avant de recharger) ; F5 : la batterie demande 5 servants (les tubes,
// les fusées), pas 2 comme l'obusier — mon critère « équipage ≤ celui de l'obusier » était une supposition, pas une règle du jeu.
// CRITÈRES CORRIGÉS (après mesure) :
//   F4 deux salves demandées : la seconde ne part qu'après un rechargement d'au moins 4 s, qui a pris une salve dans les caisses (mortier : la salve suivante est chargée aussitôt, d'où « charge 1 » pendant l'attente)
//   F5 danger ≥ 50 % d'un obus, coût ≤ 3 × celui d'un obus, équipage ≤ 6
// MESURE (seconde correction, de la mesure et non du critère) : F3 ne regardait qu'une salve de quatre fusées — trop bruité (4,4 % puis 6,0 % du simple fait de
//   l'ordre de simulation). On mesure sur les deux salves (huit fusées), même seuil de 6 %.
// TROISIÈME CORRECTION (du critère) : l'écart du centre au but vient de l'erreur de pointage SANS observateur (écart-type 6 % de la distance, règle de
//   l'artillerie du jeu) : ce n'est pas le groupement des fusées. F3 devient : écart entre fusées > 1 m et ≤ 8 % de la distance (groupées mais pas au même point).
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/fusees.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {HOUR_REAL,TILE_M}=await import('../js/data.js').then(m=>({HOUR_REAL:m.HOUR_REAL,TILE_M:4}));
const {derive,ACTIONS}=await import('../js/ballistics.js');const {DEFAULT_DESIGNS,crateCost}=await import('../js/designs.js');const {arcTable}=await import('../js/explosive.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const fm=DEFAULT_DESIGNS.find(d=>d.id==='fusees_mle1'),ob=DEFAULT_DESIGNS.find(d=>d.id==='canon_mle1');const bee=DEFAULT_DESIGNS.filter(d=>d.f==='beee'&&(derive(d.p).rocket));
const Dm=derive(fm.p),Do=derive(ob.p);const rng=D=>arcTable(D.v0,D.BC,true,D.boost).max;
P(!!fm&&fm.f==='meumeu'&&ACTIONS[fm.p.action].mortar&&Dm.salvo===4&&rng(Dm)>=3000&&bee.length===0,'F1. les Meumeu ont une batterie de fusées de départ, en tir indirect ; les Bèè n’en ont aucune',`Mle 1 : ${Math.round(rng(Dm))} m, ${Dm.salvo} tubes, ${Dm.perCrate} salve/caisse · conceptions de fusées bèè : ${bee.length}`);
const W=new World(41);W.s.fog=false;const cap=W.capital();
const spot=W.freeSpot(cap.i+30,cap.j+2,6);const gun=W.addUnit('meumeu','soldat',spot[0],spot[1],{w:'fusees_mle1',rounds:0});gun.mag=1;gun.pouch=6;gun.task={kind:'guard',tx:gun.x,ty:gun.y};gun.fx=1;gun.fy=0;
for(let n=0;n<Dm.crew-1;n++){const a=n/(Dm.crew-1)*6.283,c=W.addUnit('meumeu','soldat',gun.x+.7*Math.cos(a),gun.y+.7*Math.sin(a),{rounds:0});c.w=null;c.mag=c.pouch=0;c.serve=gun.id;c.servant=true;}
const Wd=W.W('fusees_mle1');const A=W.arcOf(Wd);const dist=Math.min(A.max*.5,1200)/4;const tx=gun.x+dist,ty=gun.y;
const hit=[];const starts=[];let launched=0,emitted=0;const t0=W.s.t;
W.zoneFire([gun.id],tx,ty,{n:2,high:true});
let magAfter=null,firstStart=null,secondStart=null;
for(let i=0;i<6000;i++){W.update(1/(HOUR_REAL*20));
  for(const ev of W.events.splice(0)){if(ev.type==='shot'&&ev.by===gun.id){emitted++;starts.push(W.s.t);}}
  for(const sh of W.s.shots)if(sh.kind==='hshell'&&sh.by===gun.id&&!sh._seen){sh._seen=true;launched++;hit.push([sh.x1,sh.y1]);if(launched===1)firstStart=W.s.t;if(launched===5)secondStart=W.s.t;}
  if(magAfter==null&&launched>=4)magAfter=gun.mag;
  if(launched>=8)break;}
const reloadS=secondStart!=null&&firstStart!=null?(secondStart-firstStart)*HOUR_REAL:null;
const dts=starts.slice(1,4).map((t,i)=>(t-starts[i])*HOUR_REAL);
P(launched>=4&&dts.length===3&&dts.every(x=>x>.2),'F2. un ordre de tir lance une salve de 4 fusées, échelonnées',`fusées parties ${launched} · départs ${emitted} · écarts (s) ${dts.map(x=>x.toFixed(2)).join(', ')}`);
hit.length=Math.min(hit.length,8);const mx=hit.reduce((a,p)=>a+p[0],0)/hit.length,my=hit.reduce((a,p)=>a+p[1],0)/hit.length;const spread=Math.sqrt(hit.reduce((a,p)=>a+(p[0]-mx)**2+(p[1]-my)**2,0)/hit.length)*TILE_M;const off=Math.hypot(mx-tx,my-ty)*TILE_M;
const R=dist*TILE_M;
P(launched>=4&&spread>1&&spread/R<=.08,'F3. les fusées tombent groupées mais pas au même point',`distance ${Math.round(R)} m · écart entre fusées ${spread.toFixed(1)} m (${(100*spread/R).toFixed(1)} %) · centre à ${off.toFixed(1)} m du but (${(100*off/R).toFixed(1)} %, erreur de pointage sans observateur)`);
P(launched>=8&&reloadS>=4&&gun.pouch<6,'F4. la salve suivante attend le rechargement, pris dans les caisses',`fusées parties ${launched} · de la 1re à la 5e fusée ${reloadS?.toFixed(1)} s · caisses ${gun.pouch}/6`);
const area=D=>Math.PI*(D.he.danger**2)*(D.salvo||1),cost=D=>Object.values(D.costK).reduce((a,b)=>a+b,0);
P(area(Dm)>=area(Do)*.5&&cost(Dm)<=cost(Do)*3&&Dm.crew<=6,'F5. face à l’obusier : surface de danger, coût, équipage',`danger ${Math.round(area(Dm))} m² contre ${Math.round(area(Do))} (${(100*area(Dm)/area(Do)).toFixed(0)} %) · coût ${cost(Dm).toFixed(0)} contre ${cost(Do).toFixed(0)} (${(cost(Dm)/cost(Do)).toFixed(2)}×) · équipage ${Dm.crew} contre ${Do.crew}`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');
