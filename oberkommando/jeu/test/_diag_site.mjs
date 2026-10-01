// sonde temporaire : le chantier de la manufacture bèè, heure par heure
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(+(process.argv[2]||101));const bot=player(W);const DAYS=+(process.argv[3]||16);
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  if(h%12===11){for(const b of W.beeeBuildings().filter(b=>!b.done&&['manufacture','arsenal','caserne'].includes(b.k))){const bs=W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id);const cap=W.building(W.s.beee.cities[0].centre);
    const P=W.s.beee.plan;const slotVal=null;
    console.log(`j${W.day.toFixed?W.day:W.day} h${h} ${b.k}#${b.id} a ${Math.round(Math.hypot(b.i-cap.i,b.j-cap.j))} cases prog ${(b.progress||0).toFixed(2)} paye ${JSON.stringify(b.paid||{})} reste ${JSON.stringify(W.siteRemaining(b))} why "${b.why||''}" batisseurs ${bs.length} stall ${Math.round(W.s.t-(b.stallT??W.s.t))}h | civ ${P?.civ} sold ${P?.sold}`);}}}
