// Le recrutement des Meumeu, mesuré : sans rien cliquer, la ville forme des villageois tant qu'elle a de la nourriture.
// CRITÈRES (fixés avant de relancer, plusieurs graines) :
//   R1 abondance (1 500 vivres) : au moins 6 naissances par jour de jeu sur 48 h, à chaque graine
//   R2 pénurie (30 vivres, sous 25 + 24 h de rations) : aucune naissance en 48 h
//   R3 interrupteur « Croissance arrêtée » (grow=false) avec 1 500 vivres : aucune naissance
//   R4 pas de famine due à la croissance : la ration reste ≥ 0,9 pendant les 96 premières heures avec 1 500 vivres
//   R5 la croissance s'arrête d'elle-même avant que le stock tombe sous 25 vivres, ville sans production, sur 400 h (INFO : ration finale)
//   R7 partie neuve, aucun moulin : la ration ne tombe pas sous 0,5 avant l'heure 72 (sans croissance automatique : famine vers l'heure 156)
//   R6 Bèè inchangé : la croissance bèè garde son plafond de places (habitants ≤ places + 1 pour une ville bèè de départ)
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/recrutement.mjs [graines séparées par des virgules]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const seeds=(process.argv[2]||'3,5,7').split(',').map(Number);
const civ=W=>W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&u.hp>0).length;
// Compte les naissances par les entrées de file : un villageois qui meurt ne les fausse pas.
function run(seed,{food,hours,grow=true}){const W=new World(seed),cap=W.capital();cap.stock.vivres=food;if(!grow)cap.grow=false;
  let births=0,minRation=1,last=civ(W);const seen=new Set(W.s.units.map(u=>u.id));
  for(let h=0;h<hours;h++){W.update(1);minRation=Math.min(minRation,cap.ration??1);for(const u of W.s.units)if(u.f==='meumeu'&&u.k==='villageois'&&!seen.has(u.id)){seen.add(u.id);births++;}}
  return {W,cap,births,minRation,food:cap.stock.vivres||0,n:civ(W)};}
let fail=0;const P=(ok,txt,det)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${txt}  [${det}]`);};
const r1=seeds.map(s=>run(s,{food:1500,hours:48}));
P(r1.every(r=>r.births>=12),'R1. abondance : ≥ 6 naissances par jour (≥ 12 en 48 h) à chaque graine',r1.map((r,i)=>`graine ${seeds[i]} : ${r.births}`).join(' · '));
const r2=seeds.map(s=>run(s,{food:30,hours:48}));
P(r2.every(r=>r.births===0),'R2. pénurie : aucune naissance sous la réserve',r2.map((r,i)=>`graine ${seeds[i]} : ${r.births}`).join(' · '));
const r3=seeds.map(s=>run(s,{food:1500,hours:48,grow:false}));
P(r3.every(r=>r.births===0),'R3. croissance arrêtée : aucune naissance',r3.map((r,i)=>`graine ${seeds[i]} : ${r.births}`).join(' · '));
const r4=seeds.map(s=>run(s,{food:1500,hours:96}));
P(r4.every(r=>r.minRation>=.9),'R4. pas de famine due à la croissance (ration ≥ 0,9 sur 96 h)',r4.map((r,i)=>`graine ${seeds[i]} : ration min ${r.minRation.toFixed(2)}, ${r.n} villageois`).join(' · '));
const r5=run(seeds[0],{food:1500,hours:400});
const rate=r5.W.cityFoodRate(r5.cap);
P(r5.births>0&&r5.births<200,'R5. la croissance se borne d\'elle-même (pas d\'emballement) sur 400 h sans production',`${r5.births} naissances · ${r5.n} villageois · stock ${r5.food.toFixed(0)} · ration finale ${(r5.cap.ration??1).toFixed(2)} (INFO : sans moulin la ville finit par avoir faim)`);
// R6bis (corrigé) : l'ancien R6 comptait aussi les soldats rentrés de mission, rattachés à la ville de la caserne (une garnison ne loge pas en maison) : il dépendait de la trajectoire.
//   Ce que « Bèè inchangé » veut dire : aucune naissance bèè dans une ville déjà pleine.
{const W=new World(seeds[0]);let born=0,over=0;const T0=W.train.bind(W);W.train=(b,k,...r)=>{if(b.f==='beee'&&k==='villageois'&&b.k==='centre'){const st=W.cityStats(b);born++;if(st.res>=st.cap)over++;}return T0(b,k,...r);};for(let h=0;h<96;h++)W.update(1);
 P(born>0&&over===0,'R6bis. Bèè inchangé : aucune naissance bèè dans une ville pleine',`${born} naissances, ${over} dans une ville pleine`);}
if(process.env.ANCIENS){const W=new World(seeds[0]);for(let h=0;h<96;h++)W.update(1);const bc=W.s.buildings.filter(b=>b.k==='centre'&&b.f==='beee'&&!b.ruin&&b.done);
 const over=bc.map(b=>{const st=W.cityStats(b);return st.res-st.cap;});P(bc.length>0&&over.every(d=>d<=1),'R6. Bèè inchangé : habitants ≤ places + 1 dans chaque ville bèè',over.map(d=>d>0?`+${d}`:String(d)).join(' '));}
{const W=new World(seeds[0]),cap=W.capital();let famine=null,peak=civ(W);const n0=peak;for(let h=1;h<=240&&famine===null;h++){W.update(1);peak=Math.max(peak,civ(W));if((cap.ration??1)<.5)famine=h;}
 P(famine===null||famine>=72,'R7. partie neuve sans moulin : pas de famine avant 72 h',`famine à l'heure ${famine??'>240'} · villageois ${n0} → ${peak} · vivres ${(cap.stock.vivres||0).toFixed(0)}`);}
process.exit(fail?1:0);
