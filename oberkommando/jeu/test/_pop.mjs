const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));
const by={};for(const u of W.s.units){const k=u.f+':'+u.k+':'+(u.task?.kind||'-');by[k]=(by[k]||0)+1;}for(const [k,n] of Object.entries(by).sort((a,z)=>z[1]-a[1]).slice(0,16))console.log(String(n).padStart(5),k);
console.log('villes bèè',W.s.beee.cities.filter(c=>!c.fallen).length);
