// sonde temporaire : les voyages des bâtisseurs (fetch) — durée, distance, coincés
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(+(process.argv[2]||104));const bot=player(W);const DAYS=+(process.argv[3]||10);const start=new Map();const done=[];
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  for(const u of W.s.units){const T=u.task;const key=u.id;if(T?.kind==='build'&&T.fetch){if(!start.has(key)){const D=W.building(T.fetchDepot);start.set(key,{t:W.s.t,d:D?Math.hypot(D.i-u.x,D.j-u.y):-1,b:T.b,f:u.f,x:u.x,y:u.y});}}
    else if(start.has(key)){const s=start.get(key);done.push({dur:W.s.t-s.t,d:s.d,f:s.f});start.delete(key);}}
  if(h%24===23){const now=[...start.entries()].map(([id,s])=>{const u=W.unit(id);return {id,f:s.f,age:Math.round(W.s.t-s.t),d:Math.round(s.d),moved:u?Math.round(Math.hypot(u.x-s.x,u.y-s.y)):-1,path:u?.path?.length??null,why:u?.why||'',site:W.building(s.b)?.k};}).filter(o=>o.age>6);
    const bee=done.filter(o=>o.f==='beee');const q=a=>{const s=a.map(o=>o.dur).sort((x,y)=>x-y);return s.length?`med ${s[s.length>>1].toFixed(1)}h p95 ${s[Math.floor(s.length*.95)].toFixed(1)}h max ${s[s.length-1].toFixed(1)}h n ${s.length}`:'-';};
    console.log(`j${W.day} voyages finis bèè ${q(bee)} | coincés >6h : ${JSON.stringify(now.slice(0,6))}`);}}
