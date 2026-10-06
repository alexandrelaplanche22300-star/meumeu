// L'escalade, côté armes lourdes : à mesure que la guerre s'aggrave, les Bèè arment leurs villes (mitrailleuses lourdes, fusils antichars, batteries de
// fusées et de canons), puis les emploient. Avant (campagne de 30 jours, joueur automatique) : aucune arme lourde bèè, aucun tir d'artillerie bèè.
// CRITÈRES (fixés avant de lancer) :
//   H1 au niveau 1 (jour 4), au moins une équipe de mitrailleuse lourde avant le jour 16 ; ses servants l'accompagnent (équipage complet)
//   H2 au niveau 2, au moins une équipe antichar avant le jour 24
//   H3 l'artillerie bèè tire : au moins 10 coups courbes bèè avant le jour 30 (barrage, pilonnage ou feu sur ce qui approche)
// CORRECTION DE CONCEPTION (le joueur) : fusées, artillerie lourde, blindés et véhicules de combat sont la supériorité technologique des Meumeu. Les Bèè n'en ont pas.
//   H2 devient : antichar avant le jour 24 (et aucune conception de fusée ou d'obusier bèè fabriquée) ; H3 devient : AUCUN tir courbe bèè, aucune équipe de fusées ou de canons bèè
// SECONDE CORRECTION (le joueur) : le fusil antichar ne vient que quand les Bèè ont VU nos blindés. H2 devient : aucun antichar avant qu'ils en voient ; on simule
//   la rencontre au jour 16 (sawArmor) : une équipe antichar avant le jour 28. H1 : première mitrailleuse lourde avant le jour 16 (inchangé).
//   H4 aucune erreur de code ; simulation fluide (pire heure < 3 s)
//   H5 les équipes lourdes ne sont pas comptées parmi les gardes de ville (elles gardent leur poste) : chaque équipe a un poste et y reste (à moins de 6 cases) sauf en tir
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/escalade_armes.mjs [graine] [jours]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
globalThis.AI_TUNE=JSON.parse(process.env.AI_TUNE||'{}');
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||32);
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(SEED);const bot=player(W);const errs=[];let worst=0,arc=0;const first={};const crewFull=[];let stray=0,checks=0;
let atBefore=0;for(let h=0;h<DAYS*24;h++){if(W.day===16&&!W.s.beee.sawArmor){W.s.beee.sawArmor=true;}if(!W.s.beee.sawArmor&&W.s.units.some(u=>u.f==='beee'&&u.w==='bee_at'))atBefore++;try{bot.tick();}catch(e){errs.push('bot '+e.message);}
  const a=performance.now();try{W.update(1);}catch(e){errs.push('monde j'+W.day+' '+e.message+' '+(e.stack||'').split('\n')[1]);if(errs.length>4)break;}worst=Math.max(worst,performance.now()-a);
  for(const e of W.events.splice(0))if(e.type==='shot'&&e.f==='beee'&&e.arc)arc++;
  for(const u of W.s.units)if(u.f==='beee'&&u.heavy&&!u.servant&&u.w&&u.hp>0){first[u.w]??=W.day;
    if(h%24===12){const Wd=W.W(u.w),n=W.servants(u).length;crewFull.push(n>=Wd.crew-1);if(u.post&&u.task?.kind==='guard'){checks++;if(Math.hypot(u.x-u.post[0],u.y-u.post[1])>6)stray++;}}}}
const L=W.beeeLevel();const cnt={};for(const u of W.s.units)if(u.f==='beee'&&u.heavy&&!u.servant&&u.w&&u.hp>0)cnt[u.w]=(cnt[u.w]||0)+1;
P(first.bee_mg_lourde!=null&&first.bee_mg_lourde<=16&&crewFull.filter(x=>x).length>0,'H1. des mitrailleuses lourdes bèè au niveau 1, équipage complet',`première au jour ${first.bee_mg_lourde} · équipes vivantes ${cnt.bee_mg_lourde||0} · équipages complets vus ${crewFull.filter(x=>x).length}/${crewFull.length}`);
P(atBefore===0&&first.bee_at!=null&&first.bee_at<=28,'H2. des fusils antichars bèè seulement après avoir vu nos blindés',`avant (heures avec antichar) ${atBefore} · premier antichar jour ${first.bee_at} (blindés vus au jour 16) · niveau final ${L}`);
P(arc===0&&!cnt.bee_fusees&&!cnt.bee_canon,'H3. pas de fusées ni d’artillerie lourde chez les Bèè (supériorité des Meumeu)',`${arc} coups courbes bèè · équipes ${JSON.stringify(cnt)}`);
P(!errs.length&&worst<3000,'H4. aucune erreur, simulation fluide',`erreurs ${errs.length?errs.join(' | '):'aucune'} · pire heure ${Math.round(worst)} ms`);
P(checks>0&&stray/checks<.25,'H5. les équipes lourdes tiennent leur poste',`${stray} écarts sur ${checks} contrôles`);
console.log(`info : équipes ${JSON.stringify(cnt)} · villes ${W.s.beee.cities.filter(c=>!c.fallen).length}`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');
