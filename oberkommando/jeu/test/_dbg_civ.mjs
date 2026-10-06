const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));
const C=W.beeeCivilians();const by={};for(const u of C){const t=u.task;let k=t?.kind||'aucune';if(k==='work'||k==='build')k+=':'+(W.building(t.b)?.k||'?');if(k==='gather')k+=':'+(t.res||t.type);by[k]=(by[k]||0)+1;}
console.log(C.length,'civils');for(const [k,n] of Object.entries(by).sort((a,z)=>z[1]-a[1]))console.log(String(n).padStart(4),k);
console.log(W.beeeAvailable.toString().slice(0,400));
