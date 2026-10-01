const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(104);const bot=player(W);
for(let h=0;h<20*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;}
const K=W.beeeTeamKit('bee_mg_lourde'),KA=W.beeeTeamKit('bee_at');console.log('kit HMG',JSON.stringify(K),'kit AT',JSON.stringify(KA));
for(const d of W.s.buildings.filter(d=>d.f==='beee'&&W.isDepot(d)&&((d.stock['a:bee_mg_lourde']||0)>0||(d.stock['m:bee_mg_lourde']||0)>0)))console.log('depot',d.k,d.id,'ville',W.cityName?.(d),'a',d.stock['a:bee_mg_lourde']||0,'m',(d.stock['m:bee_mg_lourde']||0).toFixed(2));
for(const b of W.beeeBuildings('caserne').filter(b=>b.done)){const H=W.have('beee',b.i+1,b.j+1);const c=W.s.beee.cities.find(c=>W.distB(b,c.x,c.y)<28);const ct=c&&W.building(c.centre);
  console.log('caserne',b.id,'in',(b.inside||[]).length,'| H a',H['a:bee_mg_lourde']||0,'m',(H['m:bee_mg_lourde']||0).toFixed(2),'fusils',H['a:bee_fusil']||0,'cart',(H['m:bee_fusil']||0).toFixed(2),'| want',JSON.stringify(Object.fromEntries(Object.entries(ct?.want||{}).filter(([k])=>/mg_lourde|bee_fusil|bee_at/.test(k)))));}
