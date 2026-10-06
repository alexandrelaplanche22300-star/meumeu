const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(301,{map:'mer'});const P=player(W);
for(let d=1;d<=+(process.env.D||16);d++){for(let h=0;h<24;h++){try{P.tick();}catch(e){}for(let k=0;k<60;k++)W.update(1/60);W.events.length=0;}}
for(const b of W.s.buildings.filter(b=>b.ally&&b.k==='barge'))console.log('barge',b.i,b.j,b.done,'progrès',(b.progress||0).toFixed(2),'payé',JSON.stringify(b.paid||{}),'why',b.why,'| bâtisseurs',W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).map(u=>(u.why||u.task.fetch||'')).join('|'),'| dépôts 36:',W.depots('meumeu',b.i,b.j,36).map(d=>d.k).join(','));
console.log('ville côtière',JSON.stringify(W.allyCoastCity()?.b&&[W.allyCoastCity().b.i,W.allyCoastCity().b.j]));
