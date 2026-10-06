const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const [file,H]=[process.argv[2],+(process.argv[3]||6)];
const W=new World(1).restore(fs.readFileSync(file,'utf8'));const pf=W.pather;const F0=pf.find.bind(pf);const N=W.N;let cur=null;
const U0=W.unitTick.bind(W);W.unitTick=(u,dt)=>{cur=u;return U0(u,dt);};
pf.find=(si,sj,ti,tj,cost,goal,max)=>{const r=F0(si,sj,ti,tj,cost,goal,max);if(!r.done){const k=tj*N+ti;const u=cur;console.log(`${u?.f} ${u?.k} tâche=${u?.task?.kind} (${si},${sj})→(${ti},${tj}) côté ${si<N/2?'O':'E'}→${ti<N/2?'O':'E'} terrain=${TERRAIN[W.G.terrain[k]]?.walk?'marchable':'NON'} occ=${W.occ[k]} bâtiment=${W.building(W.occ[k])?.k||''} coût=${cost(k)} trouvé=${r.path.length}`);}return r;};
for(let k=0;k<H*60;k++)W.update(1/60);
