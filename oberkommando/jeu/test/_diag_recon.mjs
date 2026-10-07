// sonde temporaire : les éclaireurs bèè approchent-ils des Meumeu ?
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const SEED=+(process.argv[2]||101),DAYS=+(process.argv[3]||30);const W=new World(SEED);const bot=player(W);
const cap=W.capital();const N=W.N;console.log('N',N,'capitale meumeu',cap.i,cap.j,'but recon',Math.round(N*.12),Math.round(N*.88));
let closest=1e9;const mb=()=>W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin);
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  for(const u of W.s.units)if(u.f==='beee'&&u.hp>0&&(u.task?.recon||u.task?.scout)){for(const b of mb()){const d=Math.hypot(b.i-u.x,b.j-u.y);if(d<closest)closest=d;}}
  if(h%48===40){const sc=W.s.units.filter(u=>u.f==='beee'&&u.hp>0&&(u.task?.recon||u.task?.scout));const near=Math.min(...W.s.units.filter(u=>u.f==='beee'&&u.hp>0).map(u=>Math.min(...mb().map(b=>Math.hypot(b.i-u.x,b.j-u.y)))));
    const ext=mb().reduce((a,b)=>Math.max(a,Math.hypot(b.i-cap.i,b.j-cap.j)),0);const bc=W.s.beee.cities.filter(c=>!c.fallen).map(c=>Math.round(Math.hypot(c.x-cap.i,c.y-cap.j))).sort((a,b)=>a-b).slice(0,4);
    console.log(`j${W.day} éclaireurs ${sc.length} [${sc.slice(0,4).map(u=>`${Math.round(u.x)},${Math.round(u.y)} pts ${u.task.pts?.length} i ${u.task.i} why ${(u.why||'').slice(0,25)}`).join(' | ')}] | bèè le plus proche d'un bâtiment meumeu ${Math.round(near)} | éclaireur le plus proche (cumul) ${Math.round(closest)} | rayon meumeu ${Math.round(ext)} | villes bèè les plus proches ${bc} | reconT ${(W.s.beee.reconT||0).toFixed(0)} t ${W.s.t.toFixed(0)}`);}}
