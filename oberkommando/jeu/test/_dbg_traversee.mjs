// pourquoi une traversée bèè dure-t-elle des jours ? suit l'opération depuis une sauvegarde — node test/_dbg_traversee.mjs <sauvegarde> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s;let last='';
for(let h=1;h<=(+process.argv[3]||120);h++){for(let k=0;k<60;k++)W.update(1/60);
  for(const o of s.amphi||[]){const st=o.state+o.wave;const dt=s.t-o.tl;if(st!==last){console.log(`J${(s.t/24).toFixed(2)} op ${o.f} → ${o.state} vague ${o.wave} débarqués ${o.landed}`);last=st;}
    if(o.state==='sail'&&dt>8&&h%4===0){const B=W.amphiBoatsOf(o);console.log(`   sail depuis ${dt.toFixed(1)} h :`,B.filter(b=>b.state==='go').map(b=>`#${b.id} (${b.x|0},${b.y|0}) spd ${(b.spd||0).toFixed(1)} drv ${!!W.vehDriver(b)} pass ${(b.crew||[]).filter(u=>u.vrole==='passager').length} bi ${b.bi}/${b.bpath?.length} reste ${b.goal?Math.hypot(b.goal[0]-b.x,b.goal[1]-b.y).toFixed(0):'?'} backing ${!!b.backing} stuck ${(b.stuckT||0).toFixed(1)}`).join(' | ')||'aucun en route', 'arrivés', B.filter(b=>b.state!=='go').length);}}}
