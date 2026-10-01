// L'économie des Meumeu : de quoi entretenir une armée. « La tech pour les Meumeu, la masse pour les Bèè ».
// CRITÈRES (fixés avant de lancer) :
//   E1 un Meumeu mange au plus 0,085 vivre/h (villageois) et 0,14 (soldat) — un tiers de moins qu'avant (0,12 et 0,20)
//   E2 un moulin de quatre ouvriers produit au moins 50 % de plus qu'avant : ≥ 1,45 × sa production de référence (rendement de sa terre × 0,67 × 4)
//   E3 un départ établi (deux moulins) entretient 12 soldats + 40 villageois pendant 20 jours sans que la ration tombe sous 0,9 (avant : famine)
//   E4 les Bèè sont inchangés : un villageois bèè coûte toujours 0,12 × 0,78 vivre/h
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/economie.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(4,{assisted:true});const cap=W.capital();W.s.units=W.s.units.filter(u=>u.f!=='meumeu'||false);
const rateOf=(k)=>{const V=W.s.units.filter(u=>u.f==='meumeu');W.s.units=W.s.units.filter(u=>u.f!=='meumeu');const u=W.addUnit('meumeu',k,cap.i+3,cap.j+3);u.home=cap.id;const r=W.cityFoodRate0(cap);W.s.units=W.s.units.filter(x=>x!==u).concat(V);return r;};
const civ=rateOf('villageois'),sol=rateOf('soldat');
P(civ<=.085&&sol<=.14,'E1. un Meumeu mange un tiers de moins',`villageois ${civ.toFixed(3)} (avant 0,12) · soldat ${sol.toFixed(3)} (avant 0,20)`);
// E2 : la production réelle d'un moulin pendant 24 h avec 4 ouvriers, comparée à sa référence sans bonus
{const Wm=new World(4,{assisted:true});const c=Wm.capital();const mills=Wm.s.buildings.filter(b=>b.f==='meumeu'&&b.k==='moulin');const m=mills[0];
  const v0=(Wm.building(m.out)?.stock.vivres)||0;for(let h=0;h<24;h++)Wm.update(1);
  const made=m.madeV||0;const ref=BUILDINGS.moulin.makes.vivres*Math.min(4,Wm.workers(m).length)*24*(m.yield/1.5);
  P(made>=ref*1.45,'E2. un moulin produit 50 % de plus',`${made.toFixed(1)} vivres en 24 h · référence sans bonus ${ref.toFixed(1)} · rendement de la terre ${(m.yield/1.5).toFixed(2)} (×1,5 = ${m.yield.toFixed(2)})`);}
// E3 : 12 soldats + 40 villageois, 20 jours
{const We=new World(4,{assisted:true});const c=We.capital();c.grow=false;
  const civN=We.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').length;for(let n=civN;n<40;n++)We.addUnit('meumeu','villageois',c.i+3+n*.1,c.j+9);
  const sold=We.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat').length;for(let n=sold;n<12;n++){const u=We.addUnit('meumeu','soldat',c.i+3+n*.2,c.j+10,{rounds:14});u.w='mle1';}
  let minR=1;for(let h=0;h<480;h++){We.update(1);minR=Math.min(minR,c.ration??1);}
  P(minR>=.9,'E3. 12 soldats + 40 villageois pendant 20 jours sans famine',`ration minimale ${minR.toFixed(2)} · vivres restants ${Math.round(c.stock.vivres||0)} · consommation ${We.cityFoodRate(c).toFixed(2)}/h`);}
// E4 : les Bèè
{const b=W.s.beee.cities.find(x=>!x.fallen);const ct=W.building(b.centre);const before=W.s.units.filter(u=>u.f==='beee'&&W.homeOf(u)===ct&&u.k==='villageois').length;
  const r=W.cityFoodRate0(ct);const expected=W.s.units.filter(u=>u.f==='beee'&&u.hp>0&&W.homeOf(u)===ct).reduce((a,u)=>a+(u.k==='villageois'?.12:.2),0)*.78;
  P(Math.abs(r-expected)<.05*Math.max(1,expected)+1.2,'E4. les Bèè sont inchangés',`consommation ${r.toFixed(2)}/h · attendu ${expected.toFixed(2)}/h (véhicules et bâtiments en plus)`);}
process.exit(fail?1:0);
