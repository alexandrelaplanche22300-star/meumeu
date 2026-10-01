// sonde temporaire : pourquoi la capitale bèè ne bâtit pas sa manufacture
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {BUILDINGS}=await import('../js/data.js');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||20);
const W=new World(SEED);const bot=player(W);let blockedH=0,hours=0;
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  const cap=W.s.beee.cities.find(c=>c.capital)||W.s.beee.cities[0];const base=W.building(cap.centre);if(!base)continue;
  const sb=W.beeeBuildings().filter(b=>!b.done&&!['camp','mine','centre','maison','gare'].includes(b.k)&&Math.hypot(b.i-base.i,b.j-base.j)<32);hours++;if(sb.length)blockedH++;
  if(h%48===47){const nat=W.s.beee.plan?.nat||{};const has=k=>W.beeeBuildings(k).map(b=>b.done?'1':'0').join('');
    console.log(`j${W.day} chantiers bloquants ${sb.length} [${[...new Set(sb.map(b=>b.k))].join(',')}] (bloqué ${Math.round(blockedH/hours*100)}% des heures) | pierre ${Math.round(nat.pierre||0)} bois ${Math.round(nat.bois||0)} pieces ${Math.round(nat.pieces||0)} fer ${Math.round(nat.fer||0)} | ferme ${has('ferme')} atelier ${has('atelier')} four ${has('four')} poudrerie ${has('poudrerie')} arsenal ${has('arsenal')} caserne ${has('caserne')} manuf ${has('manufacture')}`);}}
