// Pourquoi une offensive bèè ne part pas ? Suivi jour par jour d'une campagne de 30 jours (joueur automatique de bot.mjs).
// Pour chaque jour : gardes disponibles pour une offensive (au-delà de la garnison minimale + 2), cibles connues, échéance de la prochaine
// vague, bandes en cours, et — le jour où une vague est due — la raison du refus de beeePlanRaid.
//   node test/guerre_diag.mjs [graine=105] [jours=30]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {DAY}=await import('../js/data.js');
const {player}=await import('./bot.mjs');
const seed=+(process.argv[2]||105),DAYS=+(process.argv[3]||30);
const W=new World(seed);const P=player(W);const B=W.s.beee;
for(let h=0;h<DAYS*24;h++){try{P.tick();}catch(e){}W.update(1);
  if(h%24===23){const cities=B.cities.filter(c=>!c.fallen);
    const surplus=cities.map(c=>{const g=W.beeeGuards(c).length;return Math.max(0,g-W.beeeGarrisonMin(c)-2);});
    const guards=cities.map(c=>W.beeeGuards(c).length),troops=cities.map(c=>W.beeeTroops(c).length),mins=cities.map(c=>W.beeeGarrisonMin(c));
    const known=Object.values(B.known||{}).filter(I=>typeof I==='object'&&!I.ruin&&I.done);
    const bands=(B.bands||[]).map(b=>`${b.kind||'raid'}:${b.state}(${b.m.length})`).join(' ')||'—';
    const out_=cities.map(c=>W.beeeOut(c)).join('/');
    console.log(`j${W.day} · villes ${cities.length} · gardes ${guards.join('/')} (troupes ${troops.join('/')}, min ${mins.join('/')}) · surplus offensif ${surplus.join('/')} · dehors ${out_} · cibles connues ${known.length} · vague dans ${((B.nextWave||0)-W.s.t).toFixed(0)} h · bandes ${bands} · vagues lancées ${B.waves||0}`);}}
// pourquoi beeePlanRaid refuse-t-il ? (état final, en rejouant ses tests)
{const cities=B.cities.filter(c=>!c.fallen);const groups=cities.map(c=>({c,g:W.beeeGuards(c).slice(0,Math.max(0,W.beeeGuards(c).length-W.beeeGarrisonMin(c)-2))})).sort((a,b)=>b.g.length-a.g.length);const from=groups[0]?.c;
 const mobile=from?groups.filter(q=>Math.hypot(q.c.x-from.x,q.c.y-from.y)<160).flatMap(q=>q.g):[];const avail=mobile.length;
 const why={ruine:0,pasFini:0,tropVieux:0,tropFort:0,cible:0};const rows=[];
 for(const I of Object.values(B.known||{})){if(typeof I!=='object')continue;if(I.ruin){why.ruine++;continue;}if(!I.done){why.pasFini++;continue;}const age=(W.t-I.t)/DAY;if(age>4){why.tropVieux++;rows.push(`${I.k} âge ${age.toFixed(1)} j`);continue;}
   const def=W.defendersAt(I.x,I.y),need=Math.max(4,Math.ceil(def*1.6+2));if(need>avail){why.tropFort++;rows.push(`${I.k} défendu ${def} → besoin ${need} > dispo ${avail}`);continue;}why.cible++;rows.push(`${I.k} OK (besoin ${need})`);}
 console.log(`REFUS (état final) : disponibles ${avail} · ${JSON.stringify(why)} · détail : ${rows.slice(0,8).join(' | ')}`);}
console.log(`FIN : vagues ${B.waves||0}, villes ${B.cities.filter(c=>!c.fallen).length}, Bèè ${W.s.units.filter(u=>u.f==='beee'&&u.hp>0).length}`);
