// sonde temporaire : pourquoi aucune offensive bèè ne part
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {DAY}=await import('../js/data.js');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||30);const W=new World(SEED);const bot=player(W);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  if(h%48===40){const B=W.s.beee,K=W.raidK(),cities=B.cities.filter(c=>!c.fallen);
    const groups=cities.map(c=>({c,g:W.beeeGuards(c),min:W.beeeGarrisonMin(c)})).map(q=>({...q,free:q.g.slice(0,Math.max(0,q.g.length-Math.max(4,Math.ceil(q.min*K.keep))))})).sort((a,b)=>b.free.length-a.free.length);
    const from=groups[0]?.c;const mobile=from?groups.filter(q=>dist(q.c,from)<240).flatMap(q=>q.free):[];
    const known=Object.values(B.known||{}).filter(I=>typeof I==='object'&&!I.ruin&&I.done);const fresh=known.filter(I=>W.t-I.t<=DAY*4);
    const plan=from?W.beeePlanRaid(from,mobile):null;
    const cand=fresh.slice(0,40).map(I=>({k:I.k,d:Math.round(Math.hypot(I.x-from.x,I.y-from.y)),def:W.defendersAt(I.x,I.y),need:Math.max(K.armyMin,Math.ceil(W.defendersAt(I.x,I.y)*K.odds+4+(W.t-I.t)/DAY*.5))})).sort((a,b)=>a.need-b.need).slice(0,3);
    const sold=W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.hp>0);const tasks={};for(const u of sold){const k=u.band?'bande':u.heavy?'lourd':u.task?.recon?'recon':u.task?.kind||'aucune';tasks[k]=(tasks[k]||0)+1;}
    console.log(`j${W.day} L${W.beeeLevel()} prêt ${W.beeeReady()} | t ${W.t.toFixed(0)} nextWave ${(B.nextWave||0).toFixed(0)} | colonnes ${(B.bands||[]).filter(b=>b.state!=='repli'&&b.kind!=='defense').length}/${K.maxcol} vagues ${B.waves||0} | soldats ${sold.length} ${JSON.stringify(tasks)} | gardes top ${groups.slice(0,3).map(q=>`${q.c.name}:${q.g.length}-min${q.min}=${q.free.length}`).join(' ')} | mobile ${mobile.length}/${K.armyMin} | connus ${known.length} frais ${fresh.length} | plan ${plan?plan.target.k+' need '+plan.need:'aucun'} | moins chers ${JSON.stringify(cand)}`);}}
