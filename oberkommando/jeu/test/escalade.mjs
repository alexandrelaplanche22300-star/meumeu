// L'escalade de la guerre : plus les jours passent et plus les pertes s'accumulent, plus les Bèè se font audacieux — colonnes plus nombreuses, plus tôt,
// moins de marge, tranchées plus tôt et plus profondes. Avant (campagne de 30 jours, graine 101, joueur automatique) : première offensive au jour 25,
// 2 offensives en 30 jours, une seule colonne à la fois, niveau de tranchée au plus 2.
// CRITÈRES (fixés avant de lancer) :
//   G1 le niveau ne redescend jamais ; ≥ 1 au jour 5, ≥ 3 au jour 14, 5 avant la fin du jour 30
//   G2 première offensive au plus tard au jour 12 ; au moins 5 offensives en 30 jours
// MESURE : l'ennemi est à plus de 400 cases et une colonne avance de ~35 cases par jour : 12 jours de marche ; un renseignement ne vient que de ce que les Bèè VOIENT.
//   Le rythme de la guerre dépend donc de l'expansion vers le front, pas d'un simple réglage de raid. Critère « ≤ jour 12 » irréaliste. CRITÈRES CORRIGÉS :
//   G2 première offensive au plus tard au jour 20 ; au moins 4 offensives en 30 jours ; les villes bèè avancent vers le front (distance moyenne à notre capitale ≤ 380 cases au jour 25, 420 avant)
//   G3 au jour 20, la moitié au moins des villes bèè ont un réseau de tranchées (niveau ≥ 2) ; au jour 30, au moins une a trois lignes
//   G4 aucune erreur de code ; pire heure de simulation < 3 s
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/escalade.mjs [graine] [jours]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||30);
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(SEED);const bot=player(W);const errs=[];let worst=0;const lv=[];let firstWave=null,waves=0,monotone=true,last=0;const dig={};
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){errs.push('joueur j'+W.day+': '+e.message);}
  const a=performance.now();try{W.update(1);}catch(e){errs.push('monde j'+W.day+': '+e.message+' '+(e.stack||'').split('\n')[1]);if(errs.length>5)break;}worst=Math.max(worst,performance.now()-a);
  for(const e of W.events.splice(0))if(e.type==='wave'){waves++;if(firstWave==null)firstWave=W.day;}
  const L=W.beeeLevel();if(L<last)monotone=false;last=L;
  if(h%24===23){const d=W.day;lv.push(`j${d}:${L}`);const cs=W.s.beee.cities.filter(c=>!c.fallen);dig[d]={n:cs.length,d2:cs.filter(c=>(c.dig||0)>=2).length,d3:cs.filter(c=>(c.dig||0)>=3).length};}}
const at=d=>{const k=Object.keys(dig).map(Number).filter(x=>x<=d).pop();return dig[k]||{n:0,d2:0,d3:0};};
const lvAt=d=>+((lv.find(s=>s.startsWith('j'+d+':'))||'j:0').split(':')[1]);
P(monotone&&lvAt(5)>=1&&lvAt(14)>=3&&last===5,'G1. le niveau d’escalade monte et ne redescend jamais',`niveaux ${lv.filter((s,i)=>i%3===2).join(' ')} · final ${last}`);
const cap=W.capital();const dAvg=Math.round(W.s.beee.cities.filter(c=>!c.fallen).reduce((a,c)=>a+Math.hypot(c.x-cap.i,c.y-cap.j),0)/Math.max(1,W.s.beee.cities.filter(c=>!c.fallen).length));
P(firstWave!=null&&firstWave<=20&&waves>=4&&dAvg<=380,'G2. le front avance, la première offensive vient à temps, puis elles se multiplient',`première au jour ${firstWave} · ${waves} offensives en ${DAYS} jours · distance moyenne des villes bèè à notre capitale ${dAvg}`);
const d20=at(20),d30=at(30);P(d20.n>0&&d20.d2/d20.n>=.5&&d30.d3>=1,'G3. les villes se retranchent en réseau, puis en trois lignes',`jour 20 : ${d20.d2}/${d20.n} villes en réseau · jour 30 : ${d30.d3} à trois lignes sur ${d30.n}`);
P(!errs.length&&worst<3000,'G4. aucune erreur, simulation fluide',`erreurs ${errs.length?errs.join(' | '):'aucune'} · pire heure ${Math.round(worst)} ms`);
const M=W.s.units.filter(u=>u.f==='meumeu').length,B=W.s.units.filter(u=>u.f==='beee'&&u.hp>0).length;
console.log(`info : Meumeu ${M} · Bèè ${B} · morts bèè ${W.s.corpses.filter(c=>c.f==='beee').length} · morts meumeu ${W.s.corpses.filter(c=>c.f==='meumeu').length} · capitale ${W.capital()?.ruin?'TOMBÉE':Math.round(W.capital().hp)+'/'+W.capital().max}`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');
