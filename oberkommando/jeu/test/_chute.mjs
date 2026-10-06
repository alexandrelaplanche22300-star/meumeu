// J10 → J15 (carte classique, graine 101) : où passent les Meumeu ? groupes bèè, bâtiments perdus, journal
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(101);const P=player(W);const run=d0=>{for(let d=0;d<d0;d++)for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=W.day<=3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}};
run(10);const ids=new Map(W.s.units.filter(u=>u.f==='meumeu').map(u=>[u.id,u]));
for(let h=0;h<5*24;h++){try{P.tick();}catch(e){}for(let k=0;k<60;k++)W.update(1/60);W.events.length=0;
  if(h%12===11){const M=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0);const gone=[...ids.values()].filter(u=>!W.s.units.includes(u));
    const why={};for(const u of gone){const k=(u.hp<=0?'mort':'disparu')+':'+(u.h?.state||'')+':'+(u.inVeh?'véhicule':'')+(u.inBarracks?'caserne':'')+(u.hidden?'abri':'');why[k]=(why[k]||0)+1;}
    const bands=(W.s.beee.bands||[]).map(b=>`${b.kind}:${b.state}:${b.m.length}`).join(',');
    console.log(`J${W.day} h${(W.s.t%24)|0} meumeu ${M.length} | partis ${gone.length} ${JSON.stringify(why)} | groupes bèè ${bands} | bâtiments meumeu ${W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin).length}`);}}
console.log(W.s.log.filter(l=>l.t>=10*24).slice(0,14).map(l=>`${(l.t/24).toFixed(1)} ${l.where}: ${l.text}`).join('\n'));
