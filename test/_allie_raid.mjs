// Depuis la sauvegarde J19 : les troupes débarquées de l'allié, jour par jour — leurs cibles, leurs distances, leurs pertes. node test/_allie_raid.mjs <sauvegarde> <jours>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const D=+(process.argv[3]||12);
const E0=W.amphiEnd.bind(W);W.amphiEnd=(op,why)=>{if(op.ally)console.log(`  FIN op alliée J${W.day} : ${why}, débarqués ${op.landed}/${op.units.length}`);return E0(op,why);};
const L0=W.amphiLaunch.bind(W);W.amphiLaunch=(...a)=>{const r=L0(...a);if(a[0]==='meumeu')console.log(`  DÉPART J${W.day} : ${a[1].length} soldats, ${a[2].length} barges → (${a[3]|0},${a[4]|0}) ${r.ok?'':JSON.stringify(r.why)}`);return r;};
for(let h=0;h<D*24;h++){for(let k=0;k<60;k++)W.update(1/60);W.events.length=0;
  if(h%12===11){const raid=W.allyUnits().filter(u=>u.allyRaid&&!u.inVeh&&u.x>W.N/2);const tg={};for(const u of raid){const T=u.task;let k=T?.kind||'-';if(T?.kind==='attack'&&T.b!=null){const b=W.building(T.b);k+=':'+(b?b.k+(b.ruin?'(ruine)':'')+'@'+Math.round(Math.hypot(b.i-u.x,b.j-u.y)):'?');}else if(T?.kind==='attack'){const e=W.unit(T.unit);k+=':'+(e?e.k+'@'+Math.round(Math.hypot(e.x-u.x,e.y-u.y)):'?');}else if(T?.kind==='assault'||T?.b!=null){const b=W.building(T.b??T.id);k+=':'+(b?b.k+'@'+Math.round(Math.hypot(b.i-u.x,b.j-u.y)):'?');}tg[k]=(tg[k]||0)+1;}
    const cx=raid.reduce((n,u)=>n+u.x,0)/Math.max(1,raid.length),cy=raid.reduce((n,u)=>n+u.y,0)/Math.max(1,raid.length);
    console.log(`J${W.day} h${(W.s.t%24)|0} raid ${raid.length} centre (${cx|0},${cy|0}) | ${JSON.stringify(tg).slice(0,240)} | bèè à 30 cases ${W.s.units.filter(e=>e.f==='beee'&&e.hp>0&&Math.hypot(e.x-cx,e.y-cy)<30).length} | ops ${(W.s.amphi||[]).filter(o=>o.ally).map(o=>o.state).join(',')} navalNext J${((W.s.ally.navalNext||0)/24+1)|0}`);}}
