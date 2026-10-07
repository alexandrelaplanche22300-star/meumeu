// La croissance meumeu (carte classique, joueur automatique) : population, vivres, naissances, tous les 2 jours
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const seed=+(process.argv[2]||101),D=+(process.argv[3]||14);const W=new World(seed);const P=player(W);
let born=0;const T0=W.train.bind(W);W.train=(b,k,...r)=>{const x=T0(b,k,...r);if(x.ok&&b.f==='meumeu'&&k==='villageois')born++;return x;};
for(let d=0;d<D;d++){for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
  if(d%2===1){const M=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0);const cap=W.capital();const by={};for(const u of M){const k=u.k+':'+(u.task?.kind||'-');by[k]=(by[k]||0)+1;}
    console.log(`J${W.day} meumeu ${M.length} nés ${born} vivres cap ${Math.round(cap?.stock?.vivres||0)} ration ${(cap?.ration??1).toFixed(2)} dépôts ${W.depotList('meumeu').length} | ${Object.entries(by).sort((a,z)=>z[1]-a[1]).slice(0,5).map(([k,n])=>k+' '+n).join(', ')}`);}}
