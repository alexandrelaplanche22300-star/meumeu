// depuis une sauvegarde : 6 bateaux bèè donnés devant une plage bèè, l'état-major lance l'assaut ; on suit l'opération jusqu'au bout
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const N=W.N;
const sp=W.amphiBeach(905,750,40);for(let n=0;n<6;n++){const w=W.nearestWater(sp.x+sp.nx*3,sp.y+sp.ny*3+(n-2.5)*5,12);W.addCombatVehicle('beee','bateau_bee',w[0]+.5,w[1]+.5,Math.PI);}
const B=W.s.beee;B.amphiNext=0;B.amphiT=-99;const E0=W.amphiEnd.bind(W);W.amphiEnd=(op,why)=>{console.log(`FIN t+${(W.s.t-t0).toFixed(0)} h : ${why}, débarqués ${op.landed}, plage (${op.beach.x|0},${op.beach.y|0})`);return E0(op,why);};
const t0=W.s.t;W.amphiBeeTick();console.log('lancement :',B.amphiWhy||'ok',(W.s.amphi||[]).map(o=>o.units.length+' soldats').join());
let last='';for(let h=0;h<+(process.env.H||200);h++){for(let k=0;k<60;k++)W.update(1/60);const o=(W.s.amphi||[]).find(o=>o.f==='beee');const s=o?`${o.state} à bord ${W.amphiBoatsOf(o).reduce((n,b)=>n+(b.crew||[]).length,0)} bateaux ${W.amphiBoatsOf(o).map(b=>b.state+(b.beached?'*':'')).join('')}`:'—';if(s!==last){console.log(`t+${h+1} ${s}`);last=s;}if(!o&&h>5&&!process.env.H)break;}
const ws=W.s.units.filter(u=>u.f==='beee'&&u.x<N/2);console.log('Bèè sur la rive meumeu :',ws.length,'tâches',JSON.stringify(ws.reduce((a,u)=>(a[u.task?.kind||'aucune']=(a[u.task?.kind||'aucune']||0)+1,a),{})),'connus :',Object.keys(B.known||{}).length);
for(const H of B.heads||[])console.log('tête de pont',H.bx|0,H.by|0,'hommes',W.amphiBeeHeadMen(H).length,'camp',H.camp&&W.building(H.camp)?(W.building(H.camp).done?'fini':'chantier'):'aucun','éclaireurs',W.amphiBeeHeadMen(H).filter(u=>u.task?.kind==='search').length);
for(const b of (B.bands||[]).filter(b=>b.kind==='debarquement'))console.log('groupe d’assaut',b.state,b.m.length,'cible',W.building(b.target)?.k);
const mb=W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin);console.log('bâtiments meumeu',mb.length,'connus des Bèè',mb.filter(b=>B.known?.[b.id]).length,'capitale meumeu',W.capital()?.i,W.capital()?.j);
