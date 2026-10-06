// profil : temps passé dans chaque méthode du monde (cumulé), et les heures les plus lentes
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const DAYS=+(process.argv[3]||30),SEED=+(process.argv[2]||101);
const T=new Map(),C=new Map();let depth=0;
const proto=World.prototype;for(const k of Object.getOwnPropertyNames(proto)){const desc=Object.getOwnPropertyDescriptor(proto,k);if(!desc||typeof desc.value!=='function'||k==='constructor')continue;const f=desc.value;
  proto[k]=function(...a){if(depth>2)return f.apply(this,a);depth++;const t0=performance.now();try{return f.apply(this,a);}finally{depth--;T.set(k,(T.get(k)||0)+performance.now()-t0);C.set(k,(C.get(k)||0)+1);}};}
// on ne mesure que les appels de premier niveau depuis update (depth) : pour voir dans update, on mesure aussi les appels imbriqués d'un niveau
const W=new World(SEED);const bot=player(W);const slow=[];
for(let h=0;h<DAYS*24;h++){bot.tick();const a=performance.now();W.update(1);const dt=performance.now()-a;slow.push([dt,W.day]);}
slow.sort((a,b)=>b[0]-a[0]);console.log('heures les plus lentes',slow.slice(0,5).map(([d,j])=>`${Math.round(d)} ms (j${j})`).join(' · '));
console.log('temps par méthode (niveaux 1-2) :');for(const [k,v] of [...T].sort((a,b)=>b[1]-a[1]).slice(0,34))console.log('  '+k.padEnd(26),Math.round(v)+' ms',C.get(k)+' appels');
console.log('unités',W.s.units.length,'bâtiments',W.s.buildings.length,'villes bèè',W.s.beee.cities.filter(c=>!c.fallen).length);
