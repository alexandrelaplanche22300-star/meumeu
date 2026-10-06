const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));
const L=W.beeeCivilians().filter(u=>u.task?.kind==='line');const by={};for(const u of L){const k=u.task.line+' why='+(u.why||'').replace(/[0-9.]+/g,'#').slice(0,60)+' carry='+(u.carry?.k||'-');by[k]=(by[k]||0)+1;}
for(const [k,n] of Object.entries(by).sort((a,z)=>z[1]-a[1]))console.log(String(n).padStart(4),k);
