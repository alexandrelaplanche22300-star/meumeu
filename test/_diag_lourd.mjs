// sonde temporaire : la chaîne des armes lourdes bèè (fabrication, munitions, caserne, recrues) ; blindés vus au jour 16 comme dans escalade_armes
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||20);
const W=new World(SEED);const bot=player(W);
for(let h=0;h<DAYS*24;h++){if(W.day>=16)W.s.beee.sawArmor=true;try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  if(h%48===47){const P=W.s.beee.plan||{};const nat=P.nat||{},T=P.T||{};const man=W.beeeBuildings('manufacture'),ars=W.beeeBuildings('arsenal');
    const prod=a=>{const o={};for(const b of a.filter(b=>b.done))o[b.prod]=(o[b.prod]||0)+1;return JSON.stringify(o);};
    const cas=W.beeeBuildings('caserne').filter(b=>b.done).map(b=>(b.inside||[]).length).join(',');const f=(k)=>`${(+(nat[k]||0)).toFixed(1)}/${T[k]??'-'}`;
    const teams=id=>W.beeeTeams(id).length;const wants=JSON.stringify(W.beeeHeavyWants());
    console.log(`j${W.day} L${W.beeeLevel()} sold ${P.sold}/${P.pop} villes ${W.s.beee.cities.filter(c=>!c.fallen).length} | voulu ${wants} | HMG a ${f('a:bee_mg_lourde')} m ${f('m:bee_mg_lourde')} eq ${teams('bee_mg_lourde')} | AT a ${f('a:bee_at')} m ${f('m:bee_at')} eq ${teams('bee_at')} | fusil a ${f('a:bee_fusil')} | pieces ${Math.round(nat.pieces||0)} fer ${Math.round(nat.fer||0)} cuivre ${Math.round(nat.cuivre||0)} plomb ${Math.round(nat.plomb||0)} | manuf ${man.filter(b=>b.done).length}/${man.length} ${prod(man)} | arsenal ${ars.filter(b=>b.done).length}/${ars.length} ${prod(ars)} | casernes ${cas} | why ${W.s.beee.heavyWhy||'-'}`);}}
