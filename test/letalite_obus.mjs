// La létalité d'un obus explosif : un obus au centre d'une troupe de 60 Bèè debout, à découvert, serrés (une case et demie entre voisins,
// comme une compagnie rassemblée en plein champ). Pour chaque arme à obus explosif : tués, hors de combat, blessés (moyenne sur 10 tirs),
// et les rayons de la charge (souffle mortel, lésions, commotion, portée des éclats). node test/letalite_obus.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TILE_M}=await import('../js/ballistics.js');
const W0=new World(7);const ids=Object.keys(W0.s.designs).filter(id=>W0.W(id)?.he);
const N0=60,SP=1.5,RUNS=+(process.argv[2]||10);
const rows=[];
for(const id of ids){const Wd=W0.W(id),E=Wd.he;let dead=0,hors=0,hurt=0;
  for(let r=0;r<RUNS;r++){const W=new World(7+r);W.s.fog=false;const cap=W.capital();const cx=cap.i+60.5,cy=cap.j-40.5;const us=[];const side=Math.ceil(Math.sqrt(N0));
    for(let k=0;k<N0;k++){const u=W.addUnit('beee','soldat',cx+((k%side)-(side-1)/2)*SP,cy+(Math.floor(k/side)-(side-1)/2)*SP,{w:'bee_fusil'});u.post='debout';us.push(u);}
    W.heBlast(cx+.3,cy+.2,E,'meumeu',null,{w:id});
    for(const u of us){const st=u.h?.state;if(st==='mort'||u.hp<=0)dead++;else if(st==='hors')hors++;else if((u.h?.wounds||[]).length)hurt++;}}
  rows.push({id,name:Wd.name,cal:Wd.p?.d,dead:dead/RUNS,hors:hors/RUNS,hurt:hurt/RUNS,blast:E.blast,inj:E.inj,conc:E.conc,frags:(E.cls||[]).reduce((n,c)=>n+c.n,0),reach:Math.max(...(E.cls||[]).map(c=>c.lam*Math.log(Math.max(1,E.vg)/55)))});}
rows.sort((a,z)=>(z.cal||0)-(a.cal||0));
console.log('arme'.padEnd(34),'cal mm','tués','hors','blessés','| souffle mortel m','lésions m','commotion m','éclats','portée éclats m');
for(const r of rows)console.log(String(r.name||r.id).slice(0,33).padEnd(34),String(r.cal??'').padStart(6),r.dead.toFixed(1).padStart(5),r.hors.toFixed(1).padStart(5),r.hurt.toFixed(1).padStart(7),'|',r.blast.toFixed(1).padStart(8),r.inj.toFixed(1).padStart(9),r.conc.toFixed(1).padStart(11),String(r.frags).padStart(7),r.reach.toFixed(0).padStart(8));
console.log(`(une case = ${TILE_M} m ; troupe de ${N0}, ${SP} case entre voisins)`);
