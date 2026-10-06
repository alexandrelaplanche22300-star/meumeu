// Coût d'un pas de simulation selon la taille de la carte : monde neuf, 600 pas de 1/60 s, puis le détail par poste (profil grossier).
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
for(const mode of ['classique','mer']){const W=new World(104,{map:mode});for(let h=0;h<48;h++)W.update(1);
  const n=600;const t0=performance.now();for(let k=0;k<n;k++){W.update(1/60);W.events.length=0;}const dt=(performance.now()-t0)/n;
  console.log(mode.padEnd(10),`N=${W.N}`,'pas :',dt.toFixed(2),'ms · unités',W.s.units.length,'· bâtiments',W.s.buildings.length);
  // quelles méthodes coûtent : on enveloppe les méthodes du prototype et on mesure le temps cumulé
  const P=Object.getPrototypeOf(W);const acc={};for(const k of Object.getOwnPropertyNames(P)){const ds=Object.getOwnPropertyDescriptor(P,k);if(ds.get||ds.set||typeof ds.value!=="function"||k==="constructor")continue;const f=ds.value;
    P[k]=function(...a){const t=performance.now();const r=f.apply(this,a);acc[k]=(acc[k]||0)+performance.now()-t;return r;};}
  for(let k=0;k<n;k++){W.update(1/60);W.events.length=0;}
  console.log('   postes (ms cumulés sur '+n+' pas, auto-inclusif) :',Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,9).map(([k,v])=>k+' '+v.toFixed(0)).join(' · '));}
