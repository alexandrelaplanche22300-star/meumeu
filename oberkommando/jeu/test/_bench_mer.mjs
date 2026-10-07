// Mesure : reprend une sauvegarde, simule H heures, donne les ms par heure de jeu et les fonctions les plus chères. node test/_bench_mer.mjs <fichier> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const [file,H]=[process.argv[2],+(process.argv[3]||24)];
const P0=World.prototype;const acc={};const now=()=>performance.now();
const hot=/Tick$|^go$|^follow$|^freeSpot$|^coarseRoute$|^los$|^meumeuHear$|^near$|^beeeAvailable$|^beeeCivilians$|^spotted$|^visibleAt$|^smooth$|^depots$/;
if(process.env.PROF)for(const k of Object.getOwnPropertyNames(P0)){const f=Object.getOwnPropertyDescriptor(P0,k).value;if(typeof f!=='function'||k==='constructor'||!hot.test(k))continue;
  P0[k]=function(...a){const t=now();try{return f.apply(this,a);}finally{const o=acc[k]??={n:0,ms:0};o.n++;o.ms+=now()-t;}};}
const W=new World(1).restore(fs.readFileSync(file,'utf8'));const pf=W.pather;let nf=0;const F0=pf.find.bind(pf);pf.find=(...a)=>{nf++;return F0(...a);};
const t0=now();for(let k=0;k<H*60;k++)W.update(1/60);const ms=now()-t0;
console.log(`${(ms/H).toFixed(0)} ms par heure de jeu (${H} h, ${W.s.units.length} unités, ${nf} recherches de chemin)`);
for(const [k,o] of Object.entries(acc).sort((a,z)=>z[1].ms-a[1].ms).slice(0,14))console.log(`  ${k.padEnd(18)} ${(o.ms/H).toFixed(1).padStart(7)} ms/h  ${o.n} appels`);
