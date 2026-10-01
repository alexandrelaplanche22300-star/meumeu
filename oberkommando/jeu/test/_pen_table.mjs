// table de perforation (mm d'acier doux, de Marre) de chaque arme de départ selon la distance — pour calibrer les blindages des véhicules
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const B=await import('../js/ballistics.js');const {DEFAULT_DESIGNS}=await import('../js/designs.js');
const Rs=[10,25,50,100,200,400];console.log('arme'.padEnd(22),'f'.padEnd(7),'d mm'.padEnd(6),'v0'.padEnd(5),Rs.map(r=>(r+'m').padStart(7)).join(''),'  he?');
for(const d of DEFAULT_DESIGNS){let D;try{D=B.derive(d.p);}catch(e){continue;}if(!D?.pen||!D.at)continue;
  console.log(d.id.padEnd(22),d.f.padEnd(7),String(d.p.d).padEnd(6),String(Math.round(D.v0)).padEnd(5),Rs.map(r=>{const a=D.at(r);return (a.beyond?'  —':D.pen(a.v).toFixed(2)).padStart(7);}).join(''),D.he?' HE '+(D.he.shaped?'creuse':''):'');}
