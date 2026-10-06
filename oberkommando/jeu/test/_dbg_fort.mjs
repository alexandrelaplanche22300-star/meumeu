// Diagnostic : pourquoi la côte ne se fortifie pas — on joue 22 jours et on inspecte le programme.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {BUILDINGS}=await import('../js/data.js');
const D=+(process.argv[2]||22);const W=new World(104,{map:'mer'});const P=player(W);
for(let d=0;d<D;d++){for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
  if(d>=5){const F=W.s.beee.fort||{};const pl=W.s.beee.plan;console.log(`j${d+1} on=${F.on} count=${F.count} villes=${W.s.beee.cities.filter(c=>!c.fallen).length} vivresD=${(pl?.D?.vivres||0).toFixed(2)} caserne/arsenal/manuf=${['caserne','arsenal','manufacture'].map(k=>W.beeeBuildings(k).some(b=>b.done)?1:0).join('')}`);}}
const secs=W._fsec||[];for(const sec of secs.filter(s=>s.el&&s.el.some(e=>e.placed||e.fails))){console.log(`secteur ${sec.id} base ${sec.base} menace ${sec.threat.toFixed(1)} (${sec.cx.toFixed(0)},${sec.cy.toFixed(0)})`);
  for(const el of sec.el.filter(e=>e.placed||e.fails||e.retryT)){let st='';if(el.kind==='bunker'||el.kind==='camp'){const b=W.building(el.pid);st=b?`${b.k} ${b.done?'FINI':Math.round(b.progress*100)+'%'} why=${b.why||''} bâtisseurs=${W.s.units.filter(u=>u.task?.b===b.id).length}`:'pas de bâtiment';}
    else{const s=W.lineStore(el.kind==='mines'?'mines':el.line);st=`${el.kind==='mines'?'mines':el.line} ${el.keys?el.keys.filter(k=>s[k]?.b).length:0}/${el.cells.length} posées, poseurs=${W.s.units.filter(u=>u.task?.kind==='line'&&u.task.line===(el.kind==='mines'?'mines':el.line)).length}`;}
    console.log(`   t${el.tier} ${el.kind} ${el.type||el.line||''} placed=${!!el.placed} fails=${el.fails||0} failed=${!!el.failed} retry=${el.retryT?(el.retryT-W.s.t).toFixed(0):'-'} · ${st}`);}}
