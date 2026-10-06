// Depuis une sauvegarde : les chantiers de bateaux bèè sur la plage, les bateaux à l'eau, l'assaut. node test/_bee_flotte.mjs <sauvegarde> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const raw=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));raw.state.buildings=raw.state.buildings.filter(b=>b.k!=='cale');const W=new World(1).restore(JSON.stringify(raw));const B=W.s.beee;
for(let h=0;h<+(process.argv[3]||192);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%12===11){const S=W.amphiBeeSites();
  console.log(`J${W.day} h${(W.s.t%24)|0} | chantiers ${S.length} ${S.map(b=>`(${b.i},${b.j}) ${(b.progress||0).toFixed(2)} [${(b.why||"").slice(0,70)}] payé ${JSON.stringify(b.paid||{})} bât ${W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length}`).join(' ')} | bateaux ${W.amphiBeeBoats().length} | ops ${(W.s.amphi||[]).map(o=>o.state+' '+o.units.length).join(',')} lancées ${B.amphiCount||0} | ${B.amphiWhy||''}`);}}
