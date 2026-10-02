// L'offensive de l'allié par la mer : chaque opération (départ, fin, débarqués) et le sort des troupes à terre. node test/_allie_naval.mjs <jours> [sauvegarde J19]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const D=+(process.argv[2]||32),SAVE=process.argv[3];const W=new World(301,{map:'mer'});const P=player(W);
const E0=W.amphiEnd.bind(W);W.amphiEnd=(op,why)=>{if(op.ally)console.log(`  FIN op alliée J${W.day} h${(W.s.t%24)|0} : ${why}, débarqués ${op.landed}/${op.units.length}, plage (${op.beach.x|0},${op.beach.y|0})`);return E0(op,why);};
const L0=W.amphiLaunch.bind(W);W.amphiLaunch=(...a)=>{const r=L0(...a);if(a[0]==='meumeu'&&r.ok)console.log(`  DÉPART J${W.day} : ${a[1].length} soldats, ${a[2].length} barges → (${a[3]|0},${a[4]|0})`);else if(a[0]==='meumeu')console.log('  départ refusé',r.why);return r;};
for(let d=1;d<=D;d++){for(let h=0;h<24;h++){try{P.tick();}catch(e){}for(let k=0;k<60;k++)W.update(1/60);W.events.length=0;}
  if(d===19&&SAVE)fs.writeFileSync(SAVE,W.serialize());
  const raid=W.allyUnits().filter(u=>u.allyRaid),ashore=raid.filter(u=>!u.inVeh&&u.x>W.N/2);if(raid.length||W.s.ally.navalN)console.log(`J${d} raid ${raid.length} (à terre en face ${ashore.length}, munitions basses ${ashore.filter(u=>u.w&&(u.mag||0)+(u.pouch||0)<10).length}, barges chargées ${W.s.vehicles.filter(v=>v.ally&&v.k==="barge"&&(v.cargo?.["m:mle1"]||0)>=1).length}) tâches ${JSON.stringify(ashore.reduce((a,u)=>(a[u.task?.kind||'-']=(a[u.task?.kind||'-']||0)+1,a),{}))} | bèè vus ${Object.keys(W.s.intel||{}).length} | bâtiments bèè détruits ${W.s.buildings.filter(b=>b.f==='beee'&&b.ruin).length}`);}
