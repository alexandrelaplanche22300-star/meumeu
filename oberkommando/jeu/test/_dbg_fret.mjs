const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {VEHICLES}=await import('../js/data.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));for(let k=0;k<(+process.env.H||0)*60;k++)W.update(1/60);
const V=W.s.vehicles.filter(v=>v.f==='beee');const by={};for(const v of V){const k=v.k+':'+(v.state||'?')+(v.job?' job':'');by[k]=(by[k]||0)+1;}console.log(JSON.stringify(by));
console.log('portée porteur',VEHICLES.porteur?.range,'| villes',W.s.beee.cities.filter(c=>!c.fallen).length,'| gares',W.s.buildings.filter(b=>b.f==='beee'&&b.k==='gare'&&b.done).length,'| trains',V.filter(v=>v.k==='train').length);
const at=W.s.buildings.filter(b=>b.f==='beee'&&b.k==='atelier'&&b.done);for(const b of at){const S=W.building(b.sup);const M=W.market('beee');console.log('atelier',b.id,'sup',S?.k,S?.id,'demande au sup',JSON.stringify(M.dem.get(S?.id)||{}).slice(0,200));}
for(const v of V.filter(v=>v.k==='porteur').slice(0,6))console.log('porteur',v.id,v.state,JSON.stringify(v.job||v.trip||v.load||null).slice(0,160),'at',v.at,'why',v.why);
