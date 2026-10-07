const out={textContent:''};globalThis.document??={getElementById:()=>out};
globalThis.AI_TUNE=JSON.parse(process.env.AI_TUNE||'{}');
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const DAYS=+(process.env.DAYS||24),SEED=+(process.env.SEED||101);const W=new World(SEED);const bot=player(W);const goal=[W.N*.12,W.N*.88];let waves=0,first=null,arcShots=0,errs=[];
const hist=[];for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){errs.push('bot '+e.message);}try{W.update(1);}catch(e){errs.push('monde j'+W.day+' '+e.message+' '+(e.stack||'').split('\n')[1]);if(errs.length>3)break;}
  for(const e of W.events.splice(0)){if(e.type==='wave'){waves++;if(first==null)first=W.day;}if(e.type==='shot'&&e.f==='beee'&&e.arc)arcShots++;}
  if(h%48===47){const cs=W.s.beee.cities.filter(c=>!c.fallen);hist.push(W.day+':'+cs.length+'v/'+Math.round(Math.min(...cs.map(c=>Math.hypot(c.x-goal[0],c.y-goal[1])))) );}}
const cs=W.s.beee.cities.filter(c=>!c.fallen);const us=W.s.units.filter(u=>u.f==='beee'&&u.hp>0);
const heavy={};for(const u of us)if(u.heavy&&!u.servant&&u.w)heavy[u.w]=(heavy[u.w]||0)+1;
console.log(JSON.stringify({villes:cs.length,frontMin:Math.round(Math.min(...cs.map(c=>Math.hypot(c.x-goal[0],c.y-goal[1])))),soldats:us.filter(u=>u.k==='soldat').length,civils:us.filter(u=>u.k==='villageois').length,niv:W.beeeLevel(),offensives:waves,premiere:first,tirsArtBee:arcShots,lourdes:heavy,capitale:W.capital().ruin?'TOMBEE':Math.round(W.capital().hp),erreurs:errs,hist:hist.filter((x,i)=>i%2===1).join(' ')}));
