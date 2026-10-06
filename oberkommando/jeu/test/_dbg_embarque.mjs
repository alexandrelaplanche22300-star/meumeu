// l'embarquement bèè : que deviennent les soldats appelés ? — node test/_dbg_embarque.mjs <sauvegarde> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s;
const show=()=>{for(const o of (s.amphi||[]).filter(o=>o.f==='beee')){const B=W.amphiBoatsOf(o);const U=o.units.map(id=>W.unit(id));const T={};
  for(const u of U){const k=!u?'disparu':u.hp<=0?'mort':u.inVeh?'à bord':u.task?.kind==='board'?'board':`autre:${u.task?.kind||'-'}${u.band?'/bande':''}${u.head?'/tête':''}${u.city!=null?'/ville':''}`;T[k]=(T[k]||0)+1;}
  const bx=B.reduce((n,b)=>n+b.x,0)/B.length,by=B.reduce((n,b)=>n+b.y,0)/B.length;const dist=U.filter(u=>u&&u.task?.kind==='board').map(u=>Math.hypot(u.x-bx,u.y-by));
  console.log(`J${(s.t/24).toFixed(2)} ${o.state} v${o.wave} t-tl ${(s.t-o.tl).toFixed(1)} h · ${U.length} appelés : ${JSON.stringify(T)} · distance aux bateaux moy ${dist.length?(dist.reduce((a,v)=>a+v,0)/dist.length).toFixed(0):'-'} max ${dist.length?Math.max(...dist).toFixed(0):'-'} · passagers à bord ${B.reduce((n,b)=>n+(b.crew||[]).filter(u=>u.vrole==='passager').length,0)} pilotes ${B.filter(b=>W.vehDriver(b)).length}/${B.length}`);
  const ex=U.find(u=>u&&u.task?.kind==='board');if(ex)console.log('   ex. board',ex.id,'à',ex.x|0,ex.y|0,'vers',JSON.stringify(ex.task).slice(0,80),'path',ex.path?ex.path.length:null,'goal',ex.goal,'spd?',ex.state||'');}};
show();for(let h=1;h<=(+process.argv[3]||30);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%3===0)show();}
