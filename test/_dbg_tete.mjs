// Une tête de pont bèè, heure par heure : effectif, tâches, éclaireurs, ce que les Bèè connaissent de nous — node test/_dbg_tete.mjs <sauvegarde> [heures]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const B=W.s.beee,H0=+(process.argv[3]||36);
const show=()=>{for(const H of B.heads||[]){const men=W.amphiBeeHeadMen(H);const tasks={};for(const u of men){const k=(u.task?.kind||'aucune')+(u.task?.scout?'(éclaireur)':'')+(u.task?.hold?'(tient)':'');tasks[k]=(tasks[k]||0)+1;}
  const known=W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&B.known?.[b.id]);const near=known.map(b=>Math.round(Math.hypot(b.i-H.x,b.j-H.y))).sort((a,z)=>a-z).slice(0,3);
  const mb=W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&b.done).map(b=>Math.round(Math.hypot(b.i-H.x,b.j-H.y))).sort((a,z)=>a-z).slice(0,3);
  console.log(`J${(W.s.t/24).toFixed(2)} tête (${H.bx|0},${H.by|0}) ligne (${H.x|0},${H.y|0}) à ${Math.round(Math.hypot(H.x-H.bx,H.y-H.by))} c · ${men.length} hommes ${JSON.stringify(tasks)} · camp ${H.camp?(W.building(H.camp)?.done?'bâti':'en chantier'):'—'} · éclaireurs n°${H.reconN||0} prochain J${((H.reconT||0)/24).toFixed(2)} · connus ${known.length} (plus proches ${near.join(',')||'—'}) · nos bâtiments les plus proches ${mb.join(',')} · bandes ${(B.bands||[]).filter(b=>b.kind==='debarquement').map(b=>W.bandMembers(b).length).join('/')||'—'}`);}};
show();for(let h=0;h<H0;h++){for(let k=0;k<60;k++)W.update(1/60);if(h%6===5)show();}
