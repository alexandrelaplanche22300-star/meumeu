// les Bèè sur la rive meumeu : que font-ils ? (tête, bande, tâche, ville d'origine) ; les bateaux en mer — node test/_dbg_rive.mjs <sauvegarde…>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
for(const f of process.argv.slice(2)){const W=new World(1).restore(fs.readFileSync(f,'utf8'));const s=W.s,B=s.beee,mid=W.N/2;
  const far=s.units.filter(u=>u.f==='beee'&&u.hp>0&&u.x<mid);const cnt={};
  for(const u of far){const band=u.band&&B.bands.find(b=>b.id===u.band);const k=`${u.k} ${u.head?'tête':band?'bande '+(band.kind||'raid')+'/'+band.state:'sans rôle'} tâche=${u.task?.kind||'-'}${u.task?.kind==='move'||u.task?.kind==='goto'?'':''} ${u.h?.state||''} ${u.inVeh?'en véhicule':''}${u.amphi!=null?' amphi':''}`;cnt[k]=(cnt[k]||0)+1;}
  console.log(`== ${f} J${W.day} · ${far.length} Bèè sur la rive meumeu`);for(const [k,n] of Object.entries(cnt).sort((a,z)=>z[1]-a[1]))console.log('  ',n,k);
  const lost=far.filter(u=>!u.head&&!u.band);if(lost.length){const x=lost.reduce((n,u)=>n+u.x,0)/lost.length,y=lost.reduce((n,u)=>n+u.y,0)/lost.length;console.log('   sans rôle : centre',x|0,y|0,'exemple',JSON.stringify({task:lost[0].task,city:lost[0].city,from:lost[0].from,goal:lost[0].goal}).slice(0,300));}
  for(const o of s.amphi||[])console.log(`  op ${o.f} ${o.state} vague ${o.wave} tl=${(s.t-o.tl).toFixed(1)} h · bateaux ${o.boats.map(id=>{const v=s.vehicles.find(q=>q.id===id);return v?`(${v.x|0},${v.y|0} ${v.state||''} spd ${(v.spd||0).toFixed(2)} pass ${(v.pass||[]).length})`:'?';}).join(' ')}`);}
