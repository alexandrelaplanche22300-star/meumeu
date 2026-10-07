// les bandes bèè d'une sauvegarde : genre, but, état, cible (quelle rive), effectif, position — node test/_dbg_bandes.mjs <sauvegarde…>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
for(const f of process.argv.slice(2)){const W=new World(1).restore(fs.readFileSync(f,'utf8'));const s=W.s,B=s.beee,mid=W.N/2,L=W.landComp();
  console.log(`== ${f} J${W.day} · bandes ${B.bands?.length||0}`);
  for(const b of B.bands||[]){const m=W.bandMembers(b).filter(u=>u.hp>0);if(!m.length)continue;const x=m.reduce((n,u)=>n+u.x,0)/m.length,y=m.reduce((n,u)=>n+u.y,0)/m.length;const T=W.building(b.target);
    const same=T?L[(T.j|0)*W.N+(T.i|0)]===L[(y|0)*W.N+(x|0)]:null;
    console.log(`  ${b.kind||'(raid)'} aim=${b.aim||'-'} état=${b.state} ${m.length} h. à (${x|0},${y|0}) ${x<mid?'rive meumeu':'rive bèè'} · cible ${T?T.k+' '+T.f+' ('+T.i+','+T.j+') '+(same?'même terre':'AUTRE RIVE'):'—'} · âge ${((s.t-(b.t0??s.t))/24).toFixed(1)} j t=${(b.t||0).toFixed(1)} · tâches ${[...new Set(m.map(u=>u.task?.kind))].join(',')}`);}
  const known=Object.values(B.known||{}).filter(k=>typeof k==='object');console.log(`  connus ${known.length} (rive meumeu ${known.filter(k=>k.x<mid).length}) · alertes ${B.alerts?.length||0} · lead ${B.lead?JSON.stringify({x:B.lead.x|0,y:B.lead.y|0,t:+(s.t-B.lead.t).toFixed(1)}):'-'}`);
  for(const H of B.heads||[]){const men=W.amphiBeeHeadMen(H);console.log(`  tête (${H.bx|0},${H.by|0}) ligne (${H.x|0},${H.y|0}) ${men.length} h. (${men.filter(u=>u.k==='soldat').length} sold.) · éclaireurs ${men.filter(u=>u.task?.kind==='search').length} · reconN ${H.reconN||0}`);}}
