// L'assaut amphibie bèè en vraie partie (carte mer) : node test/amphi_bee.mjs <graine> <jours>
// Affiche tous les 3 jours : bunkers, cales, bateaux, raison d'attente, opérations en cours, débarqués.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAYS]=[+(process.argv[2]||301),+(process.argv[3]||45)];
const W=new World(seed,{map:'mer'});const P=player(W);const t0=Date.now();
let day=0,landed=0,ops=0;
for(let k=0;;k++){W.update(1/60);P.tick?.(1/60);const d=Math.floor(W.s.t/24);
  for(const o of W.s.amphi||[])if(o.f==='beee'&&!o.seen){o.seen=1;ops++;console.log(`  >> opération bèè lancée : ${o.units.length} soldats, ${o.boats.length} bateaux, plage (${o.beach.x|0},${o.beach.y|0})`);}
  if(d!==day){day=d;if(day%3===0||day>=DAYS){const B=W.s.beee,bs=W.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin);
    console.log(`J${day} | bunkers ${B.fort?.count||0} | cales ${W.amphiBeeCales().length} (${W.amphiBeeCales().filter(b=>b.done).length} finies) | bateaux ${W.amphiBeeBoats().length} | ops ${W.s.amphi?.length||0}/${B.amphiCount||0} | ${B.amphiWhy||''} | ${((Date.now()-t0)/1000)|0}s`);}
    if(day>=DAYS)break;}}
const done=(W.s.beee.amphiCount||0);console.log('opérations lancées :',done);process.exit(done>0?0:1);
