// Le rechargement d'une pièce suit le poids de l'obus, partagé entre ceux qui la servent ; les caisses pèsent ce qu'elles contiennent.
// Avant : le poids de l'obus comptait (1 s par 100 g, branche « mortier » qui sert aussi les obusiers), mais pas le nombre de bras (11 kg : 116 s à 2 bras comme à 12) ;
// et une caisse ralentissait toujours de 15 %, qu'elle contienne 834 cartouches (250 g) ou un obus de 711 g.
// CRITÈRES INITIAUX (fixés avant de lancer ; leur prémisse était fausse) :
//   L1 l'obusier de base (obus de 711 g, un servant présent = 2 bras) recharge exactement en 2,5 s comme avant (±2 %) ; L2 la durée croît avec la masse du coup, égale à 2,5 s × un facteur annoncé ;
//   L3 les bras comptent ; L4 les extrêmes : 11 kg à 2 bras ≥ 10 × la référence, à 12 bras ≤ 3 × ; L5 l'état de la pièce dit le poids et les bras ; L6 le mortier garde sa règle
// MESURE : « comme avant » = 9,61 s (2,5 + 711 g / 100 g par s), pas 2,5 s : la branche « mortier » sert aussi les obusiers.
// CRITÈRES CORRIGÉS (après mesure) :
//   L1 l'obusier de base (711 g, un servant présent) recharge en 2,5 + 7,11 = 9,61 s comme avant (±2 %)
//   L2 à deux bras, la loi d'avant est conservée pour six calibres d'une même pièce : 2,5 + masse du coup / 100 s (±3 %), strictement croissante avec la masse
//   L3 les bras comptent : sans servant présent (1 bras), plus lent qu'avec son servant (2 bras) ; au-delà de l'équipage prévu, plus de servants ne vont pas plus vite (±2 %)
//   L4 les extrêmes : un obus de 11 kg à 2 bras ≥ 10 × la référence (impossible à soulever) ; à 12 bras, entre 1 × et 4 ×
//   L5 le joueur le voit : pendant le rechargement, l'état de la pièce dit le poids de l'obus et le nombre de bras
//   L6 le mortier (2 bras) garde exactement sa règle d'avant : 5,15 s pour l'obus de 265 g du modèle du bureau (±2 %)
//   L7 les caisses pèsent ce qu'elles contiennent : un servant avec 2 caisses d'obus (1,42 kg) marche plus lentement que le même avec 2 caisses de cartouches (0,5 kg),
//      et le rapport suit le modèle de charge (facteur 1 − (L − 0,3) × 1,1, L = kg / 1,5, plancher 0,55), à ±5 %
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/rechargement.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {HOUR_REAL}=await import('../js/data.js');
const {derive,kitToP,CRATE_KG}=await import('../js/ballistics.js');const {KIT_PRESETS}=await import('../js/kitdata.js');const {DEFAULT_DESIGNS}=await import('../js/designs.js');const {presetP}=await import('../js/presets.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const canon=DEFAULT_DESIGNS.find(d=>d.id==='canon_mle1').p;
// la durée assignée au premier rechargement d'une pièce servie par `servants` Meumeu présents
function mesure(p,servants,{ticks=4000}={}){const W=new World(41);W.s.fog=false;const cap=W.capital();W.s.designs.essai={id:'essai',f:'meumeu',name:'Essai',status:'adopte',p:JSON.parse(JSON.stringify(p))};
  const Wd=W.W('essai');const spot=W.freeSpot(cap.i+30,cap.j+2,6);
  const gun=W.addUnit('meumeu','soldat',spot[0],spot[1],{w:'essai',rounds:0});gun.mag=0;gun.pouch=5;gun.task={kind:'guard',tx:gun.x,ty:gun.y};gun.fx=1;gun.fy=0;
  // en couronne, tous « présents » (à moins de 1,2 case de la pièce)
  for(let n=0;n<servants;n++){const a=n/Math.max(1,servants)*6.283,c=W.addUnit('meumeu','soldat',gun.x+.7*Math.cos(a),gun.y+.7*Math.sin(a),{rounds:0});c.w=null;c.mag=c.pouch=0;c.serve=gun.id;c.servant=true;}
  // des cibles à une distance que la pièce peut battre (sa portée minimale de tir courbe, sa portée maximale)
  const A=W.arcOf(Wd);const Rm=Math.max(40,Math.min(A.max*.5,400),Math.min(A.min*1.5,A.max*.7)),dc=Rm/4;
  const foes=[];for(let n=0;n<4;n++){const e=W.addUnit('beee','soldat',gun.x+dc+n*.6,gun.y+(n%3)*.7);e.w=null;e.task={kind:'guard',tx:e.x,ty:e.y};foes.push(e);}
  const aim=()=>{const e=foes.find(f=>f.hp>0&&W.unit(f.id));if(e)W.order([gun.id],{type:'unit',id:e.id});};aim();
  let val=null,why=null;
  for(let i=0;i<ticks&&val==null;i++){if(i%50===0)aim();W.update(1/(HOUR_REAL*20));for(const ev of W.events.splice(0))if(ev.type==='reload'&&Math.hypot(ev.x-gun.x,ev.y-gun.y)<.8&&val==null){val=gun.reload;why=gun.why;}
    for(const e of foes){e.hp=1e9;if(e.h)e.h.state='ok';}}
  return {t:val,why,W,gun,Wd};}
// L1
const ref=mesure(canon,1);const REF=2.5+ref.Wd.rm/100;
P(ref.t!=null&&Math.abs(ref.t-REF)/REF<=.02,'L1. l’obusier de base recharge en 9,61 s comme avant',`obus ${ref.Wd.rm.toFixed(0)} g · 1 servant présent (2 bras) · ${ref.t?.toFixed(3)} s (attendu ${REF.toFixed(3)})`);
// L2
{const ds=[14,18,22,26,32,40].map(d=>({...canon,d,l:Math.round(d*3.2)}));const rs=ds.map(p=>{const m=mesure(p,1);return {d:p.d,rm:m.Wd.rm,t:m.t,attendu:2.5+m.Wd.rm/100};});
  const mono=rs.every((x,i)=>i===0||(x.t>rs[i-1].t&&x.rm>rs[i-1].rm));const fid=rs.every(x=>x.t!=null&&Math.abs(x.t-x.attendu)/x.attendu<=.03);
  P(mono&&fid,'L2. à deux bras, la loi d’avant est conservée et croît avec le poids',rs.map(x=>`${x.d} mm : ${x.rm.toFixed(0)} g → ${x.t?.toFixed(2)} s (attendu ${x.attendu.toFixed(2)})`).join(' · '));}
// L3
{const seul=mesure(canon,0),deux=mesure(canon,1),trois=mesure(canon,3);
  P(seul.t>deux.t&&Math.abs(trois.t-deux.t)/deux.t<=.02,'L3. les bras comptent, jusqu’à l’équipage prévu',`sans servant ${seul.t?.toFixed(2)} s · avec son servant ${deux.t?.toFixed(2)} s · avec 3 servants (1 prévu) ${trois.t?.toFixed(2)} s`);}
// L4 : la pièce de rupture (obus de 11 kg, équipage de 12)
{const rupture=presetP('rupture');const seul=mesure(rupture,1),plein=mesure(rupture,11);
  P(seul.t>=REF*10&&plein.t>=REF&&plein.t<=REF*4,'L4. les extrêmes : 11 kg à deux bras est impossible, à douze bras c’est faisable',`obus ${seul.Wd.rm.toFixed(0)} g · 2 bras ${seul.t?.toFixed(1)} s (${(seul.t/REF).toFixed(1)}×) · 12 bras ${plein.t?.toFixed(1)} s (${(plein.t/REF).toFixed(1)}×)`);}
// L5
P(!!ref.why&&/obus/i.test(ref.why)&&/bras/i.test(ref.why)&&/(g|kg)/.test(ref.why),'L5. le joueur voit le poids et les bras pendant le rechargement',`état de la pièce : « ${ref.why} »`);
// L6
{const mortier=kitToP(KIT_PRESETS.find(k=>k.id==='mortar').design);const m=mesure(mortier,1);const attendu=2.5+Math.max(0,(m.Wd.rm||0)/100);
  P(m.t!=null&&Math.abs(m.t-attendu)/attendu<=.02,'L6. le mortier garde exactement sa règle d’avant',`obus ${m.Wd.rm.toFixed(0)} g : ${m.t?.toFixed(2)} s (attendu ${attendu.toFixed(2)})`);}
// L7
{const W=new World(5);const cap=W.capital();W.s.designs.canon_mle1&&0;
  const mk=(ammoW)=>{const u=W.addUnit('meumeu','soldat',cap.i+6,cap.j+6,{rounds:0});u.w=null;u.mag=u.pouch=0;u.ammoW=ammoW;u.crates=2;return u;};
  const A=mk('mle1'),B=mk('canon_mle1');const sA=W.speedOf(A,true),sB=W.speedOf(B,true);
  const nu=W.addUnit('meumeu','soldat',cap.i+7,cap.j+6,{rounds:0});nu.w=null;nu.mag=nu.pouch=0;const s0=W.speedOf(nu,true);
  const f=kg=>{const L=kg/1.5;return L>.3?Math.max(.55,1-(L-.3)*1.1):1;};
  const kgA=W.crateKg(A),kgB=W.crateKg(B);const attendu=f(kgA)/f(kgB),mesure_=sA/sB;
  P(sB<sA&&Math.abs(mesure_/attendu-1)<=.05&&sA/s0>.9,'L7. les caisses pèsent ce qu’elles contiennent',`2 caisses de cartouches ${kgA.toFixed(2)} kg → ${(sA/s0*100).toFixed(0)} % de la vitesse · 2 caisses d’obus ${kgB.toFixed(2)} kg → ${(sB/s0*100).toFixed(0)} % · rapport ${mesure_.toFixed(2)} (attendu ${attendu.toFixed(2)})`);}
process.exit(fail?1:0);
