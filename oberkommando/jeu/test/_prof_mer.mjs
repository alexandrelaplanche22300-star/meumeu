// Profil de la carte mer : temps passé par fonction de tick, par tranche de jours. node test/_prof_mer.mjs <graine> <jours>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAYS]=[+(process.argv[2]||301),+(process.argv[3]||30)];
const P0=World.prototype;const acc={};const now=()=>performance.now();
const hot=/Tick$|^update$|^los$|^go$|^repath$|^depots$|^have$|^beeeAvailable$|^beeeCivilians$|^fort[A-Z]|^bunker(Posts|Occ|PlanOf)$|^find$|^engage$|^resolve$|^spotted$|^visibleAt$|^beeePlan$|^beeeMuster$|^cityStats$|^canPlace$|^bandContacts$|^bandLine$|^defendersAt$|^take$|^canPay$/;
for(const k of Object.getOwnPropertyNames(P0)){const ds=Object.getOwnPropertyDescriptor(P0,k);const f=ds.value;if(typeof f!=='function'||k==='constructor'||!hot.test(k))continue;
  P0[k]=function(...a){const t=now();try{return f.apply(this,a);}finally{const d=now()-t;const o=acc[k]??={n:0,ms:0};o.n++;o.ms+=d;}};}
const W=new World(seed,{map:'mer'});const P=player(W);let day=0,t0=Date.now();
for(;;){W.update(1/60);P.tick?.(1/60);const d=Math.floor(W.s.t/24);if(d!==day){day=d;
  if(day%5===0||day>=DAYS){const top=Object.entries(acc).sort((a,z)=>z[1].ms-a[1].ms).slice(0,16);
    console.log(`--- J${day} ${((Date.now()-t0)/1000).toFixed(0)}s | unités ${W.s.units.length} bâtiments ${W.s.buildings.length} bunkers ${W.s.beee.fort?.count||0}`);
    for(const [k,o] of top)console.log(`  ${k.padEnd(22)} ${(o.ms/1000).toFixed(1).padStart(7)}s  ${String(o.n).padStart(9)} appels  ${(o.ms/o.n).toFixed(3)} ms`);
    for(const k in acc)delete acc[k];t0=Date.now();}
  if(day>=DAYS)break;}}
