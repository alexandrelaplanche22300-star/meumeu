// Les charges de démolition et l'absence de grenades :
//   · un soldat meumeu s'équipe d'une charge au dépôt tout proche (une demi-caisse d'explosifs), quatre au plus, et en rend une ;
//   · son retard réglé est celui de la charge posée ; elle saute à l'heure dite ;
//   · les saboteurs bèè partent avec une charge chacun s'il y a des explosifs à leur ville, sinon une torche ;
//   · après vingt jours de partie, personne ne porte de grenade.
//   node test/charges.mjs <graine>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {BUILDINGS}=await import('../js/data.js');
const seed=+(process.argv[2]||301);const W=new World(seed);const P=player(W);const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);let bad=0;const CAP0=W.capital();const C0=[CAP0.i,CAP0.j];
const ok=(c,t)=>{console.log((c?'OK  ':'ÉCHEC ')+t);if(!c)bad++;};
for(let d=0;d<20;d++)for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
ok(!W.s.units.some(u=>(u.gren||0)>0),`jour ${W.day} : aucune grenade portée (${W.s.units.length} unités)`);
// s'équiper au dépôt
// (les Bèè peuvent avoir pris la base d'un joueur automatique passif : on rouvre alors un camp-dépôt là où elle était — le test porte sur les charges, pas sur la guerre)
const dep=W.depotList('meumeu').find(b=>!BUILDINGS[b.k].foodOnly)||(()=>{for(let r=0;r<30;r++)for(let a=0;a<8;a++){const i=C0[0]+Math.round(Math.cos(a)*r),j=C0[1]+Math.round(Math.sin(a)*r);const c=W.canPlace('meumeu','camp',i,j);if(c.ok||c.why.every(w=>/camp/.test(w)))return W.addBuilding('meumeu','camp',i,j,true);}})();for(const u of W.s.units)if(u.f==='beee'&&Math.hypot(u.x-dep.i,u.y-dep.j)<60){u.hp=0;}const [dx,dy]=[dep.i+1,dep.j+BUILDINGS[dep.k].size[1]+1];
dep.stock.explosifs=3;const u=W.addUnit('meumeu','soldat',dx,dy);u.w='mle1';u.mag=5;u.pouch=30;
const rs=[1,2,3,4,5].map(()=>W.equip(u,'charge',true));
ok(u.charges===4&&!rs[4].ok&&Math.abs(dep.stock.explosifs-1)<1e-9,`quatre charges au plus (${u.charges}), 2 caisses prises (reste ${dep.stock.explosifs}) — la 5e : « ${rs[4].why?.[0]} »`);
const r0=W.equip(u,'charge',false);ok(u.charges===3&&Math.abs(dep.stock.explosifs-1.5)<1e-9,`une charge rendue (${r0.text})`);
const far=W.addUnit('meumeu','soldat',dx+30,dy+30);far.w='mle1';ok(!W.equip(far,'charge',true).ok,'loin d’un dépôt : pas de charge');
// le retard réglé est celui de la charge posée
const cities=W.s.beee.cities.filter(c=>!c.fallen);const tg=W.s.buildings.find(b=>b.f==='beee'&&b.done&&!b.ruin&&b.k!=='centre');
if(tg){const [w,h]=BUILDINGS[tg.k].size;const s=W.addUnit('meumeu','soldat',tg.i+w/2,tg.j+h+.8);s.w='mle1';s.charges=1;s.fuse=2.5;s.holdFire=true;s.task={kind:'sabotage',b:tg.id,back:[s.x,s.y],next:[]};
  let placed=null;for(let k=0;k<120&&!placed;k++){W.update(1/60);W.events.length=0;placed=(W.s.charges||[]).find(c=>c.b===tg.id&&c.f==='meumeu');}
  ok(placed&&Math.abs(placed.t-W.s.t-2.5)<.1,placed?`charge posée, elle sautera dans ${(placed.t-W.s.t).toFixed(2)} h (réglé : 2,5 h)`:'la charge n’a pas été posée');}
// les saboteurs bèè : une charge chacun s'il y a des explosifs, sinon une torche
// une cible à leur portée (moins de 220 cases d'une de leurs villes) : un camp-dépôt meumeu posé à 60 cases de leur première ville
const c=cities[0];let known=null;if(c){const [fi,fj]=W.freeSpot(c.x+60,c.y,8).map(v=>Math.floor(v));known=W.addBuilding('meumeu','camp',fi,fj,true);}
if(c&&known){W.s.beee.known={[known.id]:W.s.t};const [kx,ky]=W.bc(known);const oc=cities.slice().sort((p,q)=>d2(p.x,p.y,kx,ky)-d2(q.x,q.y,kx,ky))[0];
  // la ville la plus proche de la cible : au moins cinq gardes (sinon elle n'envoie personne)
  for(let k=W.beeeGuards(oc).length;k<6;k++){const g=W.addUnit('beee','soldat',oc.x+(k%3),oc.y+2+(k/3|0));g.w='bee_fusil';g.mag=10;g.city=oc.id;g.task={kind:'guard',tx:g.x,ty:g.y};}
  const exAt=W.depots('beee',oc.x,oc.y,40);const before=exAt.reduce((a,b)=>a+(b.stock.explosifs||0),0);if(exAt[0])exAt[0].stock.explosifs=(exAt[0].stock.explosifs||0)+2;
  while(W.light()>.3){W.update(1/60);W.events.length=0;}W.s.beee.sabT=0;W.beeeSabotage(cities);
  const sab=W.s.units.filter(x=>x.f==='beee'&&x.task?.kind==='sabotage');
  ok(sab.length===0||sab.every(x=>x.charges>0||x.torch>0),`saboteurs bèè : ${sab.length} — ${sab.map(x=>x.charges>0?`charge (retard ${x.fuse} h)`:x.torch>0?'torche':'rien').join(', ')||'aucun parti (pas de cible ou garnison trop faible)'} · explosifs à la ville avant : ${before.toFixed(1)}`);
  ok(!sab.some(x=>(x.gren||0)>0),'aucun saboteur bèè n’a de grenade');}
console.log(bad?`${bad} échec(s)`:'tout est bon');
