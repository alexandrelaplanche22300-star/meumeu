// Une opération commando grandeur nature : trois équipes de trois, de nuit, contre la ville bèè la moins gardée.
// Chacune a deux cibles (dépôts, usines, caserne), tir tenu, deux charges par homme, minuterie de trois heures.
// On suit : les cibles détruites, les repérages, les pertes, les patrouilles et fouilles bèè, et qui rentre chez nous.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
// node test/operation.mjs <graines> <équipement : nu | nuit>   — « nuit » : tenue camouflée, pistolet-mitrailleur subsonique à silencieux d'essuies, tir discret
const EQ=process.argv[3]||'nu';
for(const seed of (process.argv[2]||'81,82,83').split(',').map(Number)){const W=new World(seed);for(let h=0;h<24*22;h++)W.update(1);
  if(EQ==='nuit')W.s.designs.silence={id:'silence',f:'meumeu',name:'PM silencieux',status:'adopte',p:{d:2.0,l:3.8,nose:'ronde',base:'plat',cons:'fmj',c:.003,L:55,twist:60,action:'auto',rof:450,mag:30,heavy:false,mods:['manchon'],supVol:300,supArch:'essuie',supBaffles:6}};
  const cities=W.s.beee.cities.filter(c=>!c.fallen);const guards=c=>W.s.units.filter(u=>u.f==='beee'&&u.w&&u.hp>0&&d2(u.x,u.y,c.x,c.y)<22).length;
  const c=cities.slice().sort((a,z)=>guards(a)-guards(z))[0];const cap=W.capital();
  const val={entrepot:5,arsenal:5,manufacture:5,poudrerie:5,grenier:3,camp:3,atelier:3,caserne:4,four:2,mine:3,fonderie:4,gare:4};
  const tg=W.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&val[b.k]&&d2(b.i,b.j,c.x,c.y)<24).sort((a,z)=>val[z.k]-val[a.k]).slice(0,6);
  if(tg.length<2){console.log(`graine ${seed} : pas assez de cibles`);continue;}
  const a0=Math.atan2(cap.j-c.y,cap.i-c.x);W.s.t=Math.floor(W.s.t/24)*24+24+21;
  const teams=[-.55,0,.55].map((da,ti)=>{const a=a0+da,sx=c.x+Math.cos(a)*38,sy=c.y+Math.sin(a)*38;const us=[0,1,2].map(n=>{const u=W.addUnit('meumeu','commando',sx+n*.7,sy);if(EQ==='nuit'){u.w='silence';u.mag=30;u.pouch=90;u.camoSuit=true;u.quiet=true;}else{u.w='mle1';u.mag=5;u.pouch=30;u.holdFire=true;}u.charges=2;u.gren=1;u.fuse=3;return u;});
    const mine=tg.filter((b,k)=>k%3===ti);if(!mine.length)return null;W.order(us.map(u=>u.id),{type:'building',id:mine[0].id});for(const b of mine.slice(1))W.order(us.map(u=>u.id),{type:'building',id:b.id,queue:true});return {us,start:[sx,sy],targets:mine};}).filter(Boolean);
  const startHp=Object.fromEntries(tg.map(b=>[b.id,b.hp]));let spotted=0,shotsB=0,patrols=0,searches=0;const first={};
  for(let t=0;t<6*16;t++){W.update(1/6);for(const [ti,T] of teams.entries())for(const u of T.us)if(u.hp>0&&W.spotted(u,'beee')){spotted++;if(process.env.DBG&&!first[ti]){const o=W.unit(u.spotBy?.beee);first[ti]=1;console.log(`   équipe ${ti+1} repérée à ${(W.s.t%24).toFixed(1)} h (lumière ${W.light().toFixed(2)}) : ${u.task?.kind}${u.task?.plant?' en pose':''} post ${u.post} anim ${u.anim} · par ${o?`${o.k} (${o.task?.kind}) à ${d2(o.x,o.y,u.x,u.y).toFixed(1)} cases`:'une tour'} · suspicion ${(u.det?.beee||0).toFixed(2)} · à ${d2(u.x,u.y,c.x,c.y).toFixed(0)} cases de la ville`);}}
    for(const e of W.events.splice(0))if(e.type==='shot'&&e.f==='beee')shotsB++;
    patrols=Math.max(patrols,W.s.units.filter(u=>u.task?.kind==='patrol').length);searches=Math.max(searches,W.s.units.filter(u=>u.task?.kind==='search').length);}
  const home=u=>u.hp>0&&u.h?.state!=='mort'&&u.h?.state!=='hors'&&(W.s.units.includes(u))&&d2(u.x,u.y,c.x,c.y)>30;
  console.log(`graine ${seed} : ville ${c.name} (${guards(c)} gardes armés, ${tg.length} cibles) · repérages ${spotted} · tirs bèè ${shotsB} · patrouilles ${patrols}, fouilles ${searches}`);
  for(const [k,T] of teams.entries())console.log(`   équipe ${k+1} : cibles ${T.targets.map(b=>`${BUILDINGS[b.k].name}${b.ruin?' (détruite)':b.hp<startHp[b.id]?` (${Math.round(b.hp/b.max*100)} %)`:' (intacte)'}`).join(', ')} · charges restantes ${T.us.reduce((a,u)=>a+(u.charges||0),0)} · rentrés ${T.us.filter(home).length}/3 · morts ou à terre ${T.us.filter(u=>u.hp<=0||u.h?.state==='mort'||u.h?.state==='hors').length}`);
  if(process.env.DBG)for(const [k,T] of teams.entries())for(const u of T.us)console.log(`     é${k+1} ${u.name} · à ${d2(u.x,u.y,c.x,c.y).toFixed(0)} cases de la ville, ${d2(u.x,u.y,T.start[0],T.start[1]).toFixed(0)} du départ · ${u.task?u.task.kind+(u.task.tx!=null?` → ${d2(u.task.tx,u.task.ty,c.x,c.y).toFixed(0)} de la ville`:''):'aucune tâche'} · ${u.post} ${u.anim} · ${u.why||''} · ${u.h?.state}`);
  console.log(`   journal : ${W.s.log.filter(l=>/sabot|sauter|sauté|charge/i.test(l.text)).slice(-4).map(l=>l.text).join(' | ')}`);}
