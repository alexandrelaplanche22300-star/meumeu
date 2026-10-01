const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(104);const bot=player(W);const flips={};let last={};
for(let h=0;h<12*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  for(const b of W.beeeBuildings('arsenal').filter(b=>b.done)){if(last[b.id]!==b.prod){flips[b.id]=(flips[b.id]||0)+1;last[b.id]=b.prod;}}}
const P=W.s.beee.plan;
for(const b of W.beeeBuildings('arsenal').filter(b=>b.done)){const o=W.building(b.out);console.log(`arsenal#${b.id} prod ${b.prod} limit ${b.limit} T ${P.T[b.prod]} sortie ${o?.k}#${o?.id} stock ${o?.stock?.[b.prod]} isDepot ${o&&W.isDepot(o)} why ${b.why} | changements ${flips[b.id]} | plan.t ${P.t} t ${W.s.t}`);}
