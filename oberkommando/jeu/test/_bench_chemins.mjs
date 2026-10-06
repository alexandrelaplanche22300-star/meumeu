// Le budget de recherches de chemin : vitesse réelle des marcheurs et coût de calcul, depuis une sauvegarde chargée — node test/_bench_chemins.mjs <sauvegarde> <budget> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s,BUD=+process.argv[3]||14,HRS=+process.argv[4]||4;
W.pathBudgetMax=BUD;   // (le plafond de recherches de chemin par pas, 14 par défaut)
const pos=new Map(s.units.map(u=>[u.id,[u.x,u.y]]));let ms=0;
for(let h=0;h<HRS;h++){const a=performance.now();for(let k=0;k<60;k++)W.update(1/60);ms+=performance.now()-a;}
// les marcheurs : ceux qui avaient une marche (bande, garde au port, embarquement) et ont bougé
let dist=0,n=0,still=0;for(const u of s.units){const p=pos.get(u.id);if(!p||!(u.hp>0))continue;const want=u.band||u.stage||u.task?.kind==='board'||u.task?.kind==='band';if(!want)continue;const d=Math.hypot(u.x-p[0],u.y-p[1]);if(d<.5)still++;else{dist+=d;n++;}}
console.log(`budget ${BUD} · ${s.units.length} unités · ${(ms/HRS/1000).toFixed(2)} s de calcul par heure de jeu · marcheurs : ${n} ont avancé de ${(dist/Math.max(1,n)/HRS).toFixed(1)} cases/h en moyenne, ${still} immobiles`);
