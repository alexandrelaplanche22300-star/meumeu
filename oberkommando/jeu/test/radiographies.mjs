// V12.8 · les radiographies « Envoyé / Reçu » : la surpression, les coups sur le blindage des engins, les blessures de l'équipage à bord, la file.
// CRITÈRES (fixés avant de lancer) :
//   X1 une charge qui éclate près d'un Meumeu émet un événement « blast » : la victime, la distance (à 5 % près), une pression > 0, un effet connu
//   X2 des antichars bèè sur le flanc d'un engin conçu : des événements plate / ricochet / pierce portant leur fiche (épaisseur, inclinaison,
//      obliquité, épaisseur à percer, perforation, issue) — au moins une perforation, avec sa vitesse restante
//   X3 la plaque percée, l'équipage à bord touché : chaque blessure dit l'engin, la cause, la vitesse (> 0), le tireur, et a un trajet à dessiner
//   X4 la file : cinq blessures d'un coup sur cinq Meumeu différents → une fenêtre et quatre en attente ; elles s'ouvrent ensuite dans l'ordre
//      (avant : une fenêtre, les quatre autres oubliées)
//   X5 les fenêtres « souffle » et « plaque » se dessinent sans erreur, une fenêtre « balle » à bord aussi
//   node test/radiographies.mjs [graine]
const out={textContent:''};
// un document de poche : des éléments qui gardent leur texte, des toiles dont chaque appel de dessin est accepté
const ctx2d=new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>ctx2d),set:(t,k,v)=>{t[k]=v;return true;}});
const el=()=>{const kids={};return {style:{},classList:{add(){},toggle(){},remove(){}},textContent:'',innerHTML:'',dataset:{},appendChild(){},remove(){this.gone=true;},addEventListener(){},
  querySelector(q){return kids[q]??=(q==='canvas'?{width:0,height:0,getContext:()=>ctx2d}:el());},parentElement:{clientHeight:900}};};
globalThis.document??={getElementById:()=>out,createElement:el};globalThis.localStorage??={getItem:()=>null,setItem(){}};globalThis.devicePixelRatio=1;globalThis.performance??={now:()=>Date.now()};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const {charge}=await import('../js/explosive.js');const {XRay}=await import('../js/xray.js');
const {enginsDeTest,CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101);let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const mk=()=>{const W=enginsDeTest(new World(SEED,CARTE));W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');return W;};
const run=(W,h,each)=>{for(let t=0;t<h;t+=.025){W.update(.025);each?.();}};
const EFF=['mort','lesions','commotion','sonne','etourdi','renverse'];
// X1
const blasts=[];{const W=mk();const c=W.capital();const u=W.s.units.find(o=>o.f==='meumeu'&&o.hp>0&&o.h);const E=charge(300,900,{fill:'tolite'});const r=2.5;
  W.events.length=0;W.heBlast(u.x+r/4,u.y,E,'beee',null,{kind:'obus'});for(const e of W.events)if(e.type==='blast')blasts.push(e);const e=blasts.find(o=>o.victim===u.id);
  P(e&&Math.abs(e.r-r)<=r*.05&&e.pk>0&&EFF.includes(e.eff),'X1. le souffle émet sa radiographie',e?`${e.name||'Meumeu'} à ${e.r.toFixed(2)} m · ${e.pk.toFixed(0)} kPa · ${e.eff} · ${blasts.length} victime(s) du souffle`:`aucun événement (${blasts.length} autres)`);}
// X2, X3
const plates=[],inside=[];let tank=null;{const W=mk();const c=W.capital();const V=VEHDEF.automitrailleuse;let p=null;
  for(let r=30;r<120&&!p;r++)for(let a=0;a<32&&!p;a++){const x=Math.floor(c.i+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(c.j+Math.sin(a/32*6.283)*r)+.5;let ok=W.vehFits(V,x,y,0);for(let q=-10;ok&&q<=10;q+=2)ok=W.vehFits(V,x,y+q,0)&&W.los(x,y,x,y+q);if(ok)p=[x,y];}
  tank=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,4);for(const u of us){u.x=tank.x;u.y=tank.y;W.vehBoard(tank,u);}
  for(let n=0;n<2;n++){const b=W.addUnit('beee','soldat',p[0]-.5+n,p[1]+8,{w:'bee_at',rounds:300});b.task={kind:'guard',tx:b.x,ty:b.y};b.spot={meumeu:W.s.t};}
  W.events.length=0;run(W,6,()=>{for(const e of W.events.splice(0)){if(e.card&&e.veh===tank.id)plates.push(e);if(e.type==='wound'&&e.veh===tank.id)inside.push(e);}});}
{const ok=plates.length&&plates.every(e=>{const c=e.card;return c&&c.t>=0&&c.obl>=0&&c.te>=0&&c.pen>0&&['ricochet','arrêté','percé'].includes(c.out)&&c.veh===tank.id;});const pc=plates.filter(e=>e.card.out==='percé');
  P(ok&&pc.length&&pc.every(e=>e.card.v2>=0),'X2. les coups sur le blindage portent leur fiche',`${plates.length} coups : ${['ricochet','arrêté','percé'].map(k=>k+' '+plates.filter(e=>e.card.out===k).length).join(', ')} · ex. ${pc[0]?`${pc[0].card.where} ${pc[0].card.t.toFixed(1)} mm à ${pc[0].card.slope}°, vus sous ${pc[0].card.obl.toFixed(0)}°, perce ${pc[0].card.pen.toFixed(1)} / ${pc[0].card.te.toFixed(1)} → ${Math.round(pc[0].card.v2)} m/s`:'—'}`);}
P(inside.length&&inside.every(e=>e.veh===tank.id&&e.inside&&e.v>0&&e.shooter!=null&&e.rec?.path?.length),'X3. les blessures à bord disent l’engin, la cause, la vitesse, le tireur',
  `${inside.length} blessure(s) à bord · ${[...new Set(inside.map(e=>e.inside))].join(', ')||'aucune'}${inside[0]?` · ex. ${Math.round(inside[0].v)} m/s, tireur ${inside[0].shooter}`:''}`);
// X4 : la file
{const X=new XRay(el(),{hostL:el()});const base=inside[0]||null;let x4='';
  if(!base)x4='pas de blessure à rejouer (X3)';else{for(let n=0;n<5;n++)X.add({...base,victim:1000+n,shooter:2000+n},{side:'L',title:'Reçu · '+n,sub:''});
    const first=X.side('L').map(c=>c.victim),waiting=X.queue.L.map(q=>q.victim);const order=[...first];for(let k=0;k<6&&X.side('L').length;k++){X.remove(X.side('L')[0]);if(X.side('L')[0])order.push(X.side('L')[0].victim);}
    x4=`ouverte ${first.join(',')} · en attente ${waiting.join(',')} · ordre d’ouverture ${order.join(',')}`;
    P(first.length===1&&waiting.length===4&&order.join(',')==='1000,1001,1002,1003,1004','X4. plusieurs à la fois : la file, dans l’ordre',x4);}
  if(!base)P(false,'X4. plusieurs à la fois : la file, dans l’ordre',x4);}
// X5 : dessiner
{let err=null;try{const X=new XRay(el(),{hostL:el()});const b=blasts[0],pl=plates.find(e=>e.card.out==='percé')||plates[0];
    if(b)X.add(b,{kind:'souffle',side:'L',title:'souffle',sub:''});if(pl)X.add({...pl,victim:pl.card.veh},{kind:'plaque',side:'R',title:'plaque',sub:''});
    for(let k=0;k<80;k++)X.step(1/15);if(inside[0]){const X2=new XRay(el(),{hostL:el()});X2.add(inside[0],{side:'L',title:'à bord',sub:''});for(let k=0;k<80;k++)X2.step(1/15);}}
  catch(e){err=e;}P(!err&&blasts.length&&plates.length,'X5. souffle, plaque et balle à bord se dessinent',err?err.stack.split('\n').slice(0,3).join(' | '):`souffle ${blasts.length?'oui':'—'} · plaque ${plates.length?'oui':'—'} · à bord ${inside.length?'oui':'—'}`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
