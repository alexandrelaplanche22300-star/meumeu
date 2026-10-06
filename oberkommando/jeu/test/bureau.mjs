// Le bureau d'études (kit) : on dérive les fiches du kit (assets/designer-kit/data/exemples.json) par kitToP → derive,
// et on compare V₀, masse, servants minimum, poussée, œil et coût (marks) aux valeurs du kit, à ±25 %.
// Puis : les armes par défaut et celles des Bèè restent valides ; les nouveaux champs de derive existent.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
import {readFileSync} from 'fs';
const {derive,kitCalc,kitToP,pToKit}=await import('../js/ballistics.js');
const {DEFAULT_DESIGNS,crateCost,weaponCost,protoCost}=await import('../js/designs.js');
const {KIT_PARTS,KIT_PRESETS}=await import('../js/kitdata.js');
const ex=JSON.parse(readFileSync(new URL('../assets/designer-kit/data/exemples.json',import.meta.url)));
let bad=0;const tol=.25;
const chk=(id,name,got,want)=>{const e=want?Math.abs(got-want)/Math.abs(want):Math.abs(got);const ok=e<=tol;if(!ok)bad++;return `${name} ${(+got).toFixed(2)}/${(+want).toFixed(2)}${ok?'':' ✗'}`;};
for(const a of ex){const p=kitToP(a.design),D=derive(p),K=D.kit;
  // [V10.8] la roquette sort du tube lentement (D.v0, 176 m/s) puis accélère jusqu'à la vitesse de fin de combustion (D.vTop, 425 m/s) ; la fiche
  // d'exemple garde la vitesse de fin de combustion : on la compare donc à D.vTop pour une roquette (ancienne ligne : chk(a.id,'V0',D.v0,a.v0)).
  const cols=[chk(a.id,'V0',D.rocket?D.vTop:D.v0,a.v0),chk(a.id,'masse',D.massEmpty,a.massKg),chk(a.id,'servants',D.crewMin,a.crewMin),chk(a.id,'poussée',D.pushMps,a.speed),chk(a.id,'œil',K.seeM,a.seeM),chk(a.id,'coût',K.pieceCost,a.pieceCost)];
  console.log(a.id.padEnd(12),cols.join(' | '),'| fer',D.costW.fer,'pièces',D.costW.pieces,'| pén',K.penAt(D.at(Math.min(a.env.targetM,500)).v).toFixed(1),'/',a.penMm.toFixed(1),'| éclat',K.blastCm.toFixed(0),'/',a.blastCm.toFixed(0),'| utile',D.eff,'| long',Math.round(D.lengthMm),'mm');}
// le viseur : un grossissement fait voir plus loin, ne change pas V₀
{const b={...ex[1].design};const r1=kitCalc({...b,sight:'optic',magnification:1}),r4=kitCalc({...b,sight:'optic',magnification:4});
  console.log('viseur ×1→×4 : œil',r1.seeM.toFixed(0),'→',r4.seeM.toFixed(0),'m ; V0',r1.v0.toFixed(0),'→',r4.v0.toFixed(0),'; sightMul',r4.sightMul.toFixed(2));if(r4.seeM<r1.seeM*2||Math.abs(r4.v0-r1.v0)>.01){bad++;console.log('✗ viseur');}}
// l'affût : les roues ne sont jamais fixes, les pieux oui ; un servant de plus pousse plus vite
{const h=ex.find(e=>e.id==='howitzer').design;const w2=derive(kitToP(h)),w4=derive(kitToP({...h,assignedCrew:4})),pz=derive(kitToP({...h,carriage:'emplaced'}));
  console.log('obusier : poussée 2 servants',w2.pushMps.toFixed(2),'· 4 servants',w4.pushMps.toFixed(2),'· pieux',pz.pushMps,pz.fixed);if(!(w4.pushMps>w2.pushMps&&w2.pushMps>0&&pz.pushMps===0&&pz.fixed&&!w2.fixed)){bad++;console.log('✗ affût');}}
// la traduction vers la fiche historique garde la nature de l'affût et les limites annoncées par l'interface
{const b={...ex[1].design};const cases=[['shoulder','roues'],['bipod','traineau'],['tripod','traineau'],['wheels','roues'],['shield','bifleche'],['emplaced','pieux']];
  for(const [carriage,want] of cases){const p=kitToP({...b,carriage});if(p.carriage!==want||p.kit.carriage!==carriage){bad++;console.log('✗ traduction affût',carriage,p.carriage,p.kit.carriage);}}
  const far=kitToP({...b,zeroM:2000,sight:'optic',magnification:16}),D=derive(far);if(far.zero!==2000||D.zero!==2000||D.sightMag!==16){bad++;console.log('✗ limites viseur',far.zero,D.zero,D.sightMag);}else console.log('viseur extrême : zéro',D.zero,'m · grossissement ×'+D.sightMag);}
// les pièces : chaque apply donne une conception dérivable
for(const pt of KIT_PARTS){const D=derive(kitToP({...KIT_PRESETS[1].design,...pt.apply}));if(!(D.v0>0&&D.massEmpty>0&&Number.isFinite(D.eff))){bad++;console.log('✗ pièce',pt.id,D.v0,D.massEmpty);}}
// les armes par défaut (Meumeu et Bèè) : toujours valides, avec les nouveaux champs ; le bureau les relit
for(const d of DEFAULT_DESIGNS){const D=derive(d.p);const f=['v0','E0','m','BC','pen','moa','aim','cyc','rpm','carry','perCrate','crew','have','need','mass','massEmpty','costW','costK','hoursW','sustain','jam','sightMul','sightMag','crewMin','pushMps','lengthMm'].filter(k=>D[k]==null||Number.isNaN(D[k]));
  const K=kitCalc(pToKit(d.p,D));console.log(d.id,'v0',D.v0|0,'masse',D.mass.toFixed(3),'sightMul',D.sightMul,'poussée',D.pushMps.toFixed(2),'long',D.lengthMm,'mm · vu par le bureau : v0',K.v0|0,'masse',K.massKg.toFixed(2),f.length?'✗ manque '+f:'');if(f.length)bad++;
  crateCost(d.p);weaponCost(d.p);protoCost(d.p);}
for(const a of ex){const w=weaponCost(kitToP(a.design));if(Object.keys(w).some(k=>!['fer','pieces','cuivre','plomb','poudre'].includes(k))){bad++;console.log('✗ ressource',a.id,w);}}
console.log(bad?`ÉCHEC : ${bad} écart(s)`:'OK : le bureau suit le kit');process.exit(bad?1:0);
