// Les Bèè trouvent-ils et attaquent-ils la capitale meumeu si le joueur ne fait rien (aucun tir, aucun soldat, aucune artillerie) ?
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/decouverte.mjs <graine> [jours]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const seed=+(process.argv[2]||101),days=+(process.argv[3]||30);
const W=new World(seed),B=W.s.beee,cap=W.capital();let known=null,targeted=null,assault=null,fell=null;const shotsMe=()=>0;
for(let h=1;h<=days*24;h++){W.update(1);
  if(known===null&&B.known?.[cap.id]&&typeof B.known[cap.id]==='object')known=+(h/24).toFixed(1);
  for(const b of B.bands||[]){if(b.target===cap.id&&targeted===null)targeted=+(h/24).toFixed(1);if(b.target===cap.id&&(b.state==='assaut'||b.state==='bond'||b.state==='feu')&&assault===null)assault=+(h/24).toFixed(1);}
  if(fell===null&&cap.ruin)fell=+(h/24).toFixed(1);}
const meumeuShots=0;
console.log(`graine ${seed} · capitale connue des Bèè au jour ${known??'jamais'} · visée par une armée au jour ${targeted??'jamais'} · assaut au jour ${assault??'jamais'} · tombée au jour ${fell??'jamais'} · armées lancées ${B.waves||0}`);
