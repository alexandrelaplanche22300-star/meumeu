// La dotation de chaque arme : chargeur, coups portés, coups par caisse, cadence.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const W=new World(104);
const ids=new Set([...Object.keys(W.s.designs||{}),'mle1','bee_fusil','bee_pm','mg_lourde','canon_mle1','bee_canon']);
for(const id of ids){let D;try{D=W.W(id);}catch(e){continue;}if(!D?.p)continue;console.log(id.padEnd(18),'chargeur',String(D.p.mag).padStart(4),'| porte',String(D.carry).padStart(5),'coups =',(D.carry/D.p.mag).toFixed(1).padStart(5),'chargeurs | caisse',String(D.perCrate).padStart(5),'| cadence',Math.round(D.rpm||0),'c/min | coup',(D.rm||0).toFixed(2),'g');}
