const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T}=await import('../js/data.js');
const W=new World(104,{map:'mer'});const N=W.N;const bad={};let tot={};
for(const n of W.s.nodes){const t=W.G.terrain[n.j*N+n.i];tot[n.type]=(tot[n.type]||0)+1;if(t<T.sand||t>T.scrub){const k=n.type+'@'+Object.keys(T).find(x=>T[x]===t);bad[k]=(bad[k]||0)+1;}}
console.log('nœuds',JSON.stringify(tot),'\nsur l\'eau :',JSON.stringify(bad));
const ex=W.s.nodes.filter(n=>{const t=W.G.terrain[n.j*N+n.i];return t<T.sand}).slice(0,5).map(n=>`${n.type}(${n.i},${n.j})`);console.log(ex.join(' '));
