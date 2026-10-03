// La flotte bèè dans une sauvegarde : pourquoi pas d'assaut, que font les chantiers de bateaux : node test/_dbg_flotte.mjs <sauvegarde> [heures]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const B=W.s.beee;const H=+(process.argv[3]||0);
const show=()=>{const cities=B.cities.filter(c=>!c.fallen&&W.building(c.centre)?.done);const boats=W.amphiBeeBoats(),free=boats.filter(v=>!v.op);
  console.log(`J${W.day} ${Math.floor(W.hour())}h · ouvrages ${B.fort?.count} · villes ${cities.length} · flotte voulue ${W.amphiBeeWant()} · bateaux ${boats.length} (libres ${free.length}) · raison « ${B.amphiWhy||''} » · prochain assaut à ${((B.amphiNext??0)/24).toFixed(1)} j · assauts faits ${B.amphiCount||0} · ops ${(W.s.amphi||[]).map(o=>o.f+(o.ally?' allié':'')+' '+o.state).join(', ')||'aucune'}`);
  for(const b of W.amphiBeeSites()){const n=W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;console.log(`   chantier ${b.id} (${b.i},${b.j}) progrès ${(b.progress||0).toFixed(2)} · ouvriers ${n} · pourquoi « ${b.why||''} » · stock ${JSON.stringify(b.stock||{})} · besoin ${JSON.stringify(W.siteNeed?.(b)||'')}`);}
  for(const v of boats)console.log(`   bateau ${v.id} (${v.x.toFixed(0)},${v.y.toFixed(0)}) op ${v.op??'—'} état ${v.state} pv ${v.hp}`);};
show();for(let h=0;h<H;h++){for(let k=0;k<60;k++)W.update(1/60);if(h%12===11)show();}
