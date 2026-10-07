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
// --- un abri tient tant que sa ville est attaquée, puis se vide (sans alerte du joueur)
{const bee=W.addUnit('beee','soldat',cx+20,cy+6);bee.task={kind:'guard',tx:bee.x,ty:bee.y};bee.holdFire=true;const pin=()=>{bee.hp=1;if(bee.h)bee.h.state='ok';bee.x=cx+20;bee.y=cy+6;(bee.spot??={}).meumeu=s.t;};
  const v=V().find(u=>Math.hypot(u.x-cx,u.y-cy)<20);W.shelter(v);for(let k=0;k<60*3;k++){pin();W.update(1/60);}
  const inC=()=>s.buildings.some(b=>(b.hide||[]).includes(v));ok(inC(),'avec un Bèè vu à 20 cases, le villageois reste à l’abri (3 h)');
  bee.hp=0;if(bee.h)bee.h.state='mort';step(1.5);ok(!inC(),'le Bèè parti, la ville n’est plus attaquée : il sort');}
// --- le bouton général : seulement la ville menacée
{const others=s.buildings.filter(b=>b.k==='centre'&&b.f==='meumeu'&&!b.ally&&b.done&&!b.ruin);const L0=W.shelterThreatened('meumeu');ok(L0.length===0,'« Aux abris ! » sans ennemi en vue : aucune ville',`${others.length} villes au joueur`);
  const bee=W.addUnit('beee','soldat',cx+30,cy);bee.task={kind:'guard',tx:bee.x,ty:bee.y};(bee.spot??={}).meumeu=s.t;const L=W.shelterThreatened('meumeu');
  ok(L.length===1&&L[0].c===c,'avec un Bèè vu à 30 cases de cette ville : elle seule',L.map(q=>q.c.city+' '+q.n).join(', '));W.shelterEnd(c);bee.hp=0;if(bee.h)bee.h.state='mort';step(1);}
// --- le centre-ville détruit : ses abrités vont se réfugier au centre sûr le plus proche, s'y abritent, et en sortent (cette ville est calme)
{W.shelterZone(c);step(5);const hid=s.buildings.filter(b=>b.alarmBy===c.id).flatMap(b=>b.hide||[]);ok(hid.length>0,'alerte : des villageois à l’abri',`${hid.length}`);
  W.collapse(c);const run=hid.filter(u=>u.task?.kind==='shelter'&&u.task.refuge);const dest=new Set(run.map(u=>u.task.b));
  ok(run.length===hid.length&&!dest.has(c.id),'centre détruit : tous sortent et courent vers un autre centre-ville',`${run.length}/${hid.length} en route vers ${[...dest].map(id=>W.building(id)?.city).join(', ')}`);
  let inRef=0,peak=0;for(let h=0;h<48;h++){step(1);inRef=s.buildings.filter(b=>dest.has(b.id)).reduce((a,b)=>a+(b.hide||[]).filter(u=>hid.includes(u)).length,0);peak=Math.max(peak,inRef);if(peak>0&&inRef===0)break;}
  const there=hid.filter(u=>W.unit(u.id)&&[...dest].some(id=>{const b=W.building(id);return b&&Math.hypot(u.x-b.i-2,u.y-b.j-2)<12;})).length;
  ok(peak>0&&inRef===0,'ils s’y abritent, puis en sortent : cette ville n’est pas attaquée',`au plus ${peak} à l’abri là-bas, ${inRef} encore dedans, ${there}/${hid.length} près du centre-refuge`);}
console.log(fails?`${fails} ÉCHEC(S)`:'TOUT PASSE');
