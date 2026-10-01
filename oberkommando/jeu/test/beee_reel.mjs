// L'IA bèè dans une vraie partie : le joueur automatique (bot.mjs), des pas d'images réalistes, et une attaque au jour 20.
//   node test/beee_reel.mjs <graine> <jours> <mode reel|gros>
//   reel : W.update(1/240) répété les trois premiers jours (dont deux nuits), puis 1/60 ; gros : W.update(1) (tick de 0,025 h)
// Mesure, ville par ville : habitants, garnison, rondes de nuit, tranchées (cases bâties, morceaux, occupants), mines, trains,
// distance à la ville bèè la plus proche ; et la réaction à notre attaque (délai, effectifs).
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAYS,MODE]=[+(process.argv[2]||301),+(process.argv[3]||26),process.argv[4]||'reel'];const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const W=new World(seed);const P=player(W);const N=W.N;const t0=Date.now();
const live=u=>u.hp>0&&u.h?.state!=='hors'&&u.h?.state!=='mort';
const nightMax={};const atk={};
function trenchStats(c){const T=Object.keys(W.s.trenches).map(Number).filter(k=>{const t=W.s.trenches[k];return t.f==='beee'&&d2(k%N+.5,((k/N)|0)+.5,c.x,c.y)<26;});
  const built=T.filter(k=>W.s.trenches[k].b);const S=new Set(built);let parts=0;const seen=new Set();
  for(const k of built){if(seen.has(k))continue;parts++;const q=[k];seen.add(k);while(q.length){const a=q.pop();const i=a%N,j=(a/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const b=(j+dj)*N+i+di;if(S.has(b)&&!seen.has(b)){seen.add(b);q.push(b);}}}}
  const occ=W.s.units.filter(u=>u.f==='beee'&&live(u)&&S.has(Math.floor(u.y)*N+Math.floor(u.x))).length;return {plan:T.length,bati:built.length,morceaux:parts,occupants:occ};}
function cityRow(c){const ct=W.building(c.centre);const st=ct?.done?W.cityStats(ct):{res:0,cap:0};const us=W.s.units.filter(u=>u.f==='beee'&&live(u));
  const gar=us.filter(u=>u.k==='soldat'&&u.city===c.id&&!u.band&&d2(u.x,u.y,c.x,c.y)<30).length;const pat=us.filter(u=>u.task?.kind==='patrol'&&u.task.city===c.id).length;
  const sent=us.filter(u=>u.sentry&&u.city===c.id).length;const mines=W.s.buildings.filter(b=>b.f==='beee'&&b.k==='mine'&&b.done&&!b.ruin&&d2(b.i,b.j,c.x,c.y)<40).length;
  const other=W.s.beee.cities.filter(o=>o!==c&&!o.fallen);const dn=other.length?Math.round(Math.min(...other.map(o=>d2(o.x,o.y,c.x,c.y)))):'-';
  const food=W.s.buildings.filter(b=>b.f==='beee'&&(b.k==='moulin'||b.k==='ferme')&&b.done&&!b.ruin&&d2(b.i,b.j,c.x,c.y)<30).length;const mais=W.s.buildings.filter(b=>b.f==='beee'&&b.k==='maison'&&b.done&&!b.ruin&&d2(b.i,b.j,c.x,c.y)<30).length;
  return {ville:c.name,hab:st.res,cap:st.cap,maisons:mais,vivriers:food,garnison:gar,rondes:pat,nuitMax:nightMax[c.id]||0,sentinelles:sent,mines,voisine:dn,...trenchStats(c)};}
// notre attaque : 8 soldats armés (mle1) sur la ville bèè la plus proche de notre capitale
function attack(){const cap=W.capital();const cs=W.s.beee.cities.filter(c=>!c.fallen);const c=cs.sort((a,z)=>d2(a.x,a.y,cap.i,cap.j)-d2(z.x,z.y,cap.i,cap.j))[0];if(!c)return;
  const a=Math.atan2(cap.j-c.y,cap.i-c.x);const sx=c.x+Math.cos(a)*38,sy=c.y+Math.sin(a)*38;const us=[];for(let n=0;n<8;n++){const [x,y]=W.freeSpot(sx+(n%4)*.8,sy+(n>>2)*.8,3);const u=W.addUnit('meumeu','soldat',x,y);u.w='mle1';u.mag=5;u.pouch=40;us.push(u);}
  W.order(us.map(u=>u.id),{type:'building',id:c.centre});Object.assign(atk,{t:W.s.t,c,us,d0:W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&live(u)&&d2(u.x,u.y,c.x,c.y)<30).length});}
function watchAtk(){if(!atk.t)return;const c=atk.c;const near=atk.us.filter(live).map(u=>d2(u.x,u.y,c.x,c.y));if(!atk.arr&&near.some(d=>d<30))atk.arr=W.s.t;
  const bands=(W.s.beee.bands||[]).filter(b=>b.kind==='defense');const def=W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&live(u)&&(u.band||u.task?.kind==='assault')&&d2(u.x,u.y,c.x,c.y)<45).length;
  if(atk.arr&&def>0&&atk.react==null)atk.react=W.s.t-atk.arr;atk.maxDef=Math.max(atk.maxDef||0,def);if(bands.length)atk.bands=Math.max(atk.bands||0,bands.length);
  const far=W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&live(u)&&u.city!=null&&u.city!==c.id&&d2(u.x,u.y,c.x,c.y)<45).length;atk.renforts=Math.max(atk.renforts||0,far);
  atk.nous=atk.us.filter(live).length;if(W.s.t-atk.t<30){const ts=trenchStats(c);atk.tranchee=Math.max(atk.tranchee||0,ts.occupants);atk.lignes=ts.bati;}}
function report(d){const cs=W.s.beee.cities.filter(c=>!c.fallen);const us=W.s.units.filter(u=>u.f==='beee'&&live(u));
  console.log(`— jour ${d} · villes ${cs.length} · Bèè ${us.length} (soldats ${us.filter(u=>u.k==='soldat').length}, en bandes ${us.filter(u=>u.band).length}) · trains ${W.s.vehicles.filter(v=>v.f==='beee'&&v.k==='train').length} · rails bâtis ${Object.values(W.s.rails).filter(r=>r.f==='beee'&&r.b).length}/${Object.values(W.s.rails).filter(r=>r.f==='beee').length} · vagues ${W.s.beee.waves||0} · ${((Date.now()-t0)/1000).toFixed(0)} s`);
  for(const c of cs)console.log('   '+Object.entries(cityRow(c)).map(([k,v])=>k+' '+v).join(' · '));}
console.log(`graine ${seed} · ${DAYS} jours · mode ${MODE}`);
for(let d=0;d<DAYS;d++){for(let h=0;h<24;h++){if(d===20&&h===8)attack();try{P.tick();}catch(e){}
    if(MODE==='gros')W.update(1);else{const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);}W.events.length=0;watchAtk();
    if(W.light()<.4)for(const c of W.s.beee.cities){const n=W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='patrol'&&u.task.city===c.id).length;nightMax[c.id]=Math.max(nightMax[c.id]||0,n);}}
  if((d+1)%5===0||d+1===DAYS||d===1)report(d+1);}
if(atk.t)console.log(`attaque au jour 20 sur ${atk.c.name} : ${atk.d0} soldats bèè à moins de 30 cases au départ · arrivée ${atk.arr!=null?'+'+(atk.arr-atk.t).toFixed(1)+' h':'jamais'} · première riposte ${atk.react!=null?'+'+atk.react.toFixed(1)+' h après l’arrivée':'aucune'} · défenseurs au plus ${atk.maxDef||0} · renforts d’autres villes ${atk.renforts||0} · bandes de défense ${atk.bands||0} · en tranchée au plus ${atk.tranchee||0} (cases bâties ${atk.lignes||0}) · nos survivants ${atk.nous}/8`);
console.log(`journal : ${W.s.log.filter(l=>/Bèè|bèè/.test(l.text)).slice(-8).map(l=>`j${Math.floor((l.t||0)/24)} ${l.text}`).join(' | ')}`);
