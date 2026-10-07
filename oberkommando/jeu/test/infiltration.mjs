// Une mission de nuit : trois commandos, deux charges chacun, tir tenu, minuterie d'une heure, contre un dépôt bèè gardé
// par une sentinelle. On suit la suspicion, le repérage, la pose, l'explosion, et la fouille bèè qui suit.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
for(const seed of [71,72,73]){const W=new World(seed);for(let h=0;h<24*20;h++)W.update(1);
  const c=W.s.beee.cities[0],cap=W.capital();const tgt=W.addBuilding('beee','entrepot',Math.round(c.x+(cap.i-c.x)*.3),Math.round(c.y+(cap.j-c.y)*.3),true);tgt.stock={poudre:15};
  const [tw,th]=W.sizeOf(tgt);const sent=W.addUnit('beee','soldat',tgt.i+tw/2+(seed-70)*1.5,tgt.j+th/2+(seed-70)*1.5);sent.w='bee_fusil';sent.city=c.id;sent.task={kind:'guard',tx:sent.x,ty:sent.y};
  for(let n=0;n<6;n++){const u=W.addUnit('beee','soldat',c.x+n%3,c.y+3+(n/3|0));u.w='bee_fusil';u.city=c.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
  W.s.t=Math.floor(W.s.t/24)*24+24+21;const a=Math.atan2(cap.j-tgt.j,cap.i-tgt.i);
  const us=[0,1,2].map(n=>{const u=W.addUnit('meumeu','commando',tgt.i+Math.cos(a)*24+n*.8,tgt.j+Math.sin(a)*24);u.w='mle1';u.mag=5;u.pouch=30;u.charges=2;u.gren=0;u.holdFire=true;u.fuse=1;return u;});
  W.order(us.map(u=>u.id),{type:'building',id:tgt.id});
  let maxDet=0,spotted=0,planted=null,boom=null,far=null,search=0,shots=0;
  for(let t=0;t<6*12&&!boom;t++){W.update(1/6);for(const u of us){maxDet=Math.max(maxDet,u.det?.beee||0);if(W.spotted(u,'beee'))spotted++;}
    if(!planted&&(W.s.charges||[]).length)planted=W.s.t;
    for(const e of W.events.splice(0))if(e.type==='shot'&&e.f==='meumeu')shots++;
    if(planted&&!W.s.charges?.length&&!boom){boom=W.s.t;far=Math.min(...us.filter(u=>u.hp>0).map(u=>Math.hypot(u.x-tgt.i,u.y-tgt.j)));}}
  for(let t=0;t<12;t++)W.update(1/6);search=W.s.units.filter(u=>u.task?.kind==='search').length;
  console.log(`graine ${seed} : suspicion max ${maxDet.toFixed(2)} · repérés ${spotted} fois · tirs meumeu ${shots} · charge posée ${planted?'oui':'non'}${boom?` · explosion, l'équipe à ${far.toFixed(0)} cases`:''} · pv dépôt ${Math.round(tgt.hp)}/${tgt.max}${tgt.ruin?' (ruine)':''} · Bèè qui fouillent ${search} · alertes ${(W.s.beee.alerts||[]).map(a=>a.why).join(',')} · commandos debout ${us.filter(u=>u.hp>0&&u.h?.state!=='mort').length}/3`);}
