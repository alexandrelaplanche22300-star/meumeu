const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const W=new World(3);
// trace : à chaque heure, quelles villes dépassent, et quelles unités y sont arrivées (nouvelle attache)
const prev=new Map();
for(let h=0;h<96;h++){W.update(1);
  for(const u of W.s.units){if(u.f!=='beee')continue;const hm=W.homeOf(u)?.id;const p=prev.get(u.id);if(p!==undefined&&p!==hm&&hm!=null){const c=W.building(hm);const st=W.cityStats(c);if(st.res>st.cap)console.log(`h${h} ${u.k} #${u.id} attaché à ${hm} (avant ${p}) tâche=${u.task?.kind} → ${st.res}/${st.cap}`);}prev.set(u.id,hm);}
  for(const u of W.s.units)if(u.f==='beee'&&!prev.has(u.id))prev.set(u.id,W.homeOf(u)?.id);}
const bc=W.s.buildings.filter(b=>b.k==='centre'&&b.f==='beee'&&!b.ruin&&b.done);
for(const b of bc){const st=W.cityStats(b);const ks={};for(const u of W.s.units)if(u.f==='beee'&&W.homeOf(u)?.id===b.id)ks[u.k]=(ks[u.k]||0)+1;console.log('ville',b.id,st.res+'/'+st.cap,JSON.stringify(ks));}
