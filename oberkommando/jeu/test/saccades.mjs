// Les à-coups : image après image (vitesse ×1), à partir d'un monde de fin de partie (l'instantané de perf.mjs), la répartition
// du temps de simulation, les pires images, et la pire recherche de chemin.
//   node test/saccades.mjs <graine> <jour> <images>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
import fs from 'node:fs';import v8 from 'node:v8';
const {World}=await import('../js/world.js');const {generate,rng}=await import('../js/gen.js');const {Pather}=await import('../js/path.js');
const [seed,DAY,FR]=[+(process.argv[2]||302),+(process.argv[3]||40),+(process.argv[4]||2400)];const snap=`test/.perf-${seed}-${DAY}.bin`;
if(!fs.existsSync(snap)){console.log('lancez d’abord perf.mjs',seed,DAY);process.exit();}
const s=v8.deserialize(fs.readFileSync(snap));const W=Object.create(World.prototype);W.events=[];const G=generate(s.seed);W.G=G;W.N=G.N;W.rand=rng(seed*31+5);W.pather=new Pather(W.N);W.s=s;W.remod();W.grids();
const pf=W.pather.find;let pfMax=0,pfN=0,pfTot=0;W.pather.find=function(...a){const t=performance.now();try{return pf.apply(this,a);}finally{const d=performance.now()-t;pfMax=Math.max(pfMax,d);pfTot+=d;pfN++;}};
const L=[];for(let k=0;k<FR;k++){const t=performance.now();W.update(1/60/4);W.events.length=0;L.push(performance.now()-t);}
const S=L.slice().sort((a,b)=>a-b),q=p=>S[Math.floor(p*(S.length-1))].toFixed(1);
console.log(`${FR} images (${(FR/60).toFixed(0)} s de jeu à ×1) · simulation : médiane ${q(.5)} ms · 95 % ${q(.95)} · 99 % ${q(.99)} · pire ${q(1)} ms · images > 33 ms : ${L.filter(x=>x>33).length}`);
console.log(`chemins : ${pfN} recherches · pire ${pfMax.toFixed(0)} ms · total ${pfTot.toFixed(0)} ms`);
// les coupables : les fonctions du monde les plus longues pendant les pires images
{const P=World.prototype;const names=Object.getOwnPropertyNames(P).filter(k=>typeof Object.getOwnPropertyDescriptor(P,k).value==='function'&&k!=='update'&&k!=='constructor'&&k!=='tick'&&k!=='unitTick'&&k!=='go'&&!/^(near|d2|bc|distB|building|unit|W|sizeOf|room|stored|isDepot|have|speedOf|alive)$/.test(k));const T={};const orig={};
  for(const k of names){orig[k]=W[k];W[k]=function(...a){const t=performance.now();try{return orig[k].apply(this,a);}finally{const d=performance.now()-t;if(d>8){const o=T[k]??={n:0,max:0};o.n++;o.max=Math.max(o.max,d);}}};}
  for(let k=0;k<FR;k++){W.update(1/60/4);W.events.length=0;}
  console.log('appels de plus de 8 ms :',Object.entries(T).sort((a,b)=>b[1].max-a[1].max).slice(0,12).map(([k,o])=>`${k} ×${o.n} (pire ${o.max.toFixed(0)} ms)`).join(' · '));}
