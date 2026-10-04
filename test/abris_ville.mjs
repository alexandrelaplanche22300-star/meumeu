// « Aux abris » par ville (V12.5) : seuls les villageois de la zone du centre s'abritent, l'alerte les garde à l'abri, la fin d'alerte rend à chacun sa tâche
//   node test/abris_ville.mjs [sauvegarde]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2]||'test/_saves/mer301_j30.json','utf8'));const s=W.s;let fails=0;
const ok=(c,m,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+m+(d?' — '+d:''));if(!c)fails++;};
const step=h=>{for(let k=0;k<60*h;k++)W.update(1/60);};
const c=s.buildings.find(b=>b.k==='centre'&&b.f==='meumeu'&&!b.ally&&b.done&&!b.ruin);   /* (une ville du joueur : l'IA alliée ne réaffecte pas ses villageois) */const cx=c.i+2,cy=c.j+2;
const V=()=>s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&u.hp>0);
const sig=t=>t?[t.kind,t.b??t.node??t.id??'',t.res??''].join(':'):'-';
const before=new Map(V().map(u=>[u.id,sig(u.task)]));const inZone=new Set(V().filter(u=>Math.hypot(u.x-cx,u.y-cy)<=30).map(u=>u.id));
const r=W.shelterZone(c);ok(r.n>0&&r.full===0,'tous les villageois de la zone partent à l’abri (le centre a une place illimitée)',`${r.n} partis, ${r.full} sans place, ${inZone.size} dans la zone, ${V().length} villageois en tout`);
ok(V().filter(u=>!inZone.has(u.id)&&u.task?.kind==='shelter').length===0,'personne hors de la zone ne s’abrite',`${V().length-inZone.size} villageois hors zone`);
step(2);const h2=W.shelterHidden(c);ok(h2>=r.n*.6,'deux heures après : la plupart sont à l’abri (les plus loin marchent encore)',`${h2} à l’abri`);
step(3);const h5=W.shelterHidden(c);ok(h5>=r.n*.95,'cinq heures après, sans ennemi : tous à l’abri, l’alerte les y garde',`${h5} à l’abri`);
const hidIds=new Set(s.buildings.flatMap(b=>(b.hide||[]).map(u=>u.id)));
const n=W.shelterEnd(c);ok(n>=h5,'fin d’alerte : tous sortent',`${n} sortis, ${W.shelterHidden(c)} encore à l’abri`);
let same=0,diff=[];for(const id of hidIds){const u=W.unit(id);if(!u)continue;if(sig(u.task)===before.get(id))same++;else diff.push(before.get(id)+' → '+sig(u.task));}
ok(same>=hidIds.size*.95,'chacun reprend la tâche qu’il avait juste avant',`${same}/${hidIds.size} identiques${diff.length?' ; ex. '+diff.slice(0,3).join(' | '):''}`);
const had=[...hidIds].filter(id=>before.get(id)!=='-');step(1);const busy=had.map(id=>W.unit(id)).filter(u=>u&&u.task).length;ok(busy>=had.length*.85,'une heure après : ceux qui travaillaient travaillent',`${busy}/${had.length} (${hidIds.size-had.length} étaient déjà sans tâche avant l’alerte)`);
console.log(fails?`${fails} ÉCHEC(S)`:'TOUT PASSE');
