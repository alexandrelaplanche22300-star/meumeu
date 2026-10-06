// Une sauvegarde de la carte « mer » : reprise à l'identique ; sauvegarde d'une ancienne version de la carte : refusée, on repart d'une carte « mer » neuve.
const store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {resumeWorld}=await import('../js/persistence.js');
const W=new World(104,{map:'mer'});const data=W.save();let ok=true;const check=(n,c)=>{console.log((c?'OK  ':'ÉCHEC ')+n);if(!c)ok=false;};
const R=resumeWorld(World);check('reprise : même carte',R.s.map==='mer'&&R.N===1500&&R.s.nodes.length===W.s.nodes.length&&R.s.seed===W.s.seed);
const old=JSON.parse(data);old.state.genV=1;store['okm-v10-save']=JSON.stringify(old);
const R2=resumeWorld(World);check('ancienne version : refusée, carte « mer » neuve',R2.s.map==='mer'&&R2.N===1500&&R2.s.genV===W.s.genV);
const cl=new World(7);cl.save();const R3=resumeWorld(World);check('carte classique : reprise',R3.s.map==='classique'&&R3.N===600);
console.log(ok?'TOUT PASSE':'IL Y A DES ÉCHECS');
