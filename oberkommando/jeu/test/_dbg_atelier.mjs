const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));for(let k=0;k<(+process.env.H||0)*60;k++)W.update(1/60);
const f=W.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&BUILDINGS[b.k].factory);const by={};
for(const b of f){const k=b.k+(b.done?'':' (chantier)');(by[k]??=[]).push(`prod=${b.prod} entrées proches=${JSON.stringify(Object.fromEntries(Object.keys(W.recipe(b,b.prod)?.in||{}).map(k=>[k,Math.round(W.have("beee",b.i+1,b.j+1)[k]||0)])))} sortie=${W.building(b.out)?.k}:${b.working?'tourne':(b.why||'?').slice(0,50)} ouvriers ${W.s.units.filter(u=>u.task?.kind==='work'&&u.task.b===b.id).length}/${BUILDINGS[b.k].workers||0}`);}
for(const [k,L] of Object.entries(by)){console.log(k,L.length);for(const s of L.slice(0,4))console.log('   ',s);}
console.log('T pièces',W.s.beee.plan?.T?.pieces|0,'nat',W.s.beee.plan?.nat?.pieces|0);
