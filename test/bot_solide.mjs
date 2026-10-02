// Un joueur automatique plus solide que bot.mjs (qui n'arme que douze soldats en tout, et les laisse tomber à la première offensive) : il garde son effectif
// soldat à un sixième de la population, ses recrues sortent en anneau autour de la capitale, puis en avant-postes ; il bâtit un deuxième moulin-hôpital et des tours.
// But : donner aux mesures de guerre (offensives bèè, défense de la capitale) un adversaire qui se défend — pas un test de stratégie humaine.
const base=await import('./bot.mjs');
export function player(W){const P=base.player(W);const F='meumeu',cap=W.capital(),CX=cap.i+2,CY=cap.j+2;const did={};
  return {...P,did:P.did,tick(){P.tick();
    const cas=W.s.buildings.find(b=>b.f===F&&b.k==='caserne'&&b.done&&!b.ruin);if(!cas)return;
    const soldiers=W.s.units.filter(u=>u.f===F&&u.k==='soldat'&&u.hp>0).length,pop=W.s.units.filter(u=>u.f===F&&u.hp>0).length;const want=Math.min(120,8+Math.floor(pop/6));
    // toutes les 12 heures : quatre villageois à la caserne tant que l'effectif n'y est pas ; leurs recrues sortent dès qu'elles sont formées
    if(W.day>=5&&soldiers+(cas.inside?.length||0)<want&&Math.floor(W.s.t)%12===0&&did.h!==Math.floor(W.s.t)){did.h=Math.floor(W.s.t);
      const g=W.s.units.filter(u=>u.f===F&&u.k==='villageois'&&u.task?.kind==='gather').slice(0,4);if(g.length>=3)W.order(g.map(u=>u.id),{type:'building',id:cas.id});}
    if((cas.inside||[]).length>=2&&Math.floor(W.s.t)%6===0&&did.r!==Math.floor(W.s.t)){did.r=Math.floor(W.s.t);const r=W.releaseRecruits(cas,cas.inside.length,'soldat','mle1',null);
      if(r.ok){const us=W.s.units.filter(u=>u.f===F&&u.k==='soldat'&&!u.task);let n=0;for(const u of W.s.units.filter(u=>u.f===F&&u.k==='soldat'&&(!u.task||u.task.kind==='guard'))){const a=(n++)*2.399,r0=6+(n%3)*4;u.task={kind:'guard',tx:CX+Math.cos(a)*r0,ty:CY+Math.sin(a)*r0};u.path=null;}}}
  }};}
