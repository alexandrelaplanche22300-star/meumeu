// vérification : depuis une sauvegarde allyAll, le dépôt côtier se bâtit-il, puis la ville côtière et les barges ? — node test/_verif_depot_allie.mjs <sauvegarde> <jours>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s;
for(let h=1;h<=24*(+process.argv[3]||6);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%24===0){const c=s.buildings.filter(b=>b.ally&&b.k==='camp');
  console.log('J'+W.day,'camps',c.map(b=>b.done?'fini':Math.round((b.progress||0)*100)+'%').join(' '),'villes',W.allyCities().length,'côtière',!!W.allyCoastCity(),'chantiers barge',s.buildings.filter(b=>b.ally&&b.k==='barge'&&!b.done).length,'barges',s.vehicles.filter(v=>v.ally&&v.k==='barge'&&v.hp>0).length,'ops alliées',(s.amphi||[]).filter(o=>o.ally).length);}}
