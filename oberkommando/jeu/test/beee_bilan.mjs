// Le bilan de l'IA bèè, jour après jour, en vraie partie (joueur automatique, pas d'images réalistes) :
//   node test/beee_bilan.mjs <graine> <jours> [tous les N jours]
// Villes et étendue sur la carte, vivres (réserve en jours, production contre consommation), armement (stocks, soldats armés),
// usines (qui tournent, et pourquoi les autres attendent), chantiers bloqués, ruines, logistique (rails, gares, trains, porteurs).
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {BUILDINGS}=await import('../js/data.js');
const [seed,DAYS,EVERY]=[+(process.argv[2]||301),+(process.argv[3]||40),+(process.argv[4]||5)];
const W=new World(seed);const P=player(W);const N=W.N;const t0=Date.now();const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const live=u=>u.hp>0&&u.h?.state!=='hors'&&u.h?.state!=='mort';const r=v=>Math.round(v);
const made={};const snap={};
function bilan(d){const B=W.s.beee,pl=B.plan||{},nat=pl.nat||{};const cs=B.cities.filter(c=>!c.fallen);const us=W.s.units.filter(u=>u.f==='beee'&&live(u));
  const sold=us.filter(u=>u.k==='soldat'),civ=us.filter(u=>u.k==='villageois');const armed=sold.filter(u=>u.w).length,ammo=sold.filter(u=>(u.mag||0)+(u.pouch||0)>0).length;
  const eat=us.reduce((a,u)=>a+(u.k==='villageois'?.12:.2),0)*.7*24;
  const xs=cs.map(c=>c.x),ys=cs.map(c=>c.y);const bb=cs.length?`${r(Math.min(...xs))}-${r(Math.max(...xs))} × ${r(Math.min(...ys))}-${r(Math.max(...ys))}`:'-';
  const bs=W.s.buildings.filter(b=>b.f==='beee');const fac=bs.filter(b=>b.done&&!b.ruin&&BUILDINGS[b.k].factory);
  const why={};for(const b of fac){const k=b.k+':'+(b.working?'tourne':(b.why||'?').replace(/[0-9.]+/g,'#').slice(0,60));why[k]=(why[k]||0)+1;}
  const sites=bs.filter(b=>!b.done&&!b.ruin);const stuck=sites.filter(b=>W.s.t-(b.stallT??W.s.t)>24);
  const tasks={};for(const u of civ){const k=u.task?.kind||'rien';tasks[k]=(tasks[k]||0)+1;}
  const rails=Object.values(W.s.rails).filter(x=>x.f==='beee');const V=W.s.vehicles.filter(v=>v.f==='beee');
  const dmg=bs.filter(b=>b.done&&!b.ruin&&b.hp<(BUILDINGS[b.k].hp||1)*.7).length;
  const delta=k=>{const v=(nat[k]||0)-(snap[k]??0);snap[k]=nat[k]||0;return (v>=0?'+':'')+r(v);};
  console.log(`\n══ jour ${d} · ${((Date.now()-t0)/1000).toFixed(0)} s · Meumeu ${W.s.units.filter(u=>u.f==='meumeu'&&live(u)).length} (bâtiments ${W.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin).length})`);
  console.log(`  villes ${cs.length} (tombées ${B.cities.length-cs.length}) · étendue ${bb} sur une carte de ${N} · pop ${us.length} (civils ${civ.length}, soldats ${sold.length} dont armés ${armed}, avec munitions ${ammo})`);
  for(const c of cs){const ct=W.building(c.centre);const st=ct?.done?W.cityStats(ct):{res:0,cap:0};const nb=bs.filter(b=>!b.ruin&&b.done&&d2(b.i,b.j,c.x,c.y)<26);const cnt={};for(const b of nb)cnt[b.k]=(cnt[b.k]||0)+1;
    console.log(`   · ${c.name} (${r(c.x)},${r(c.y)}) hab ${st.res}/${st.cap} vivres ${r(ct?.stock?.vivres||0)} · ${Object.entries(cnt).map(([k,n])=>k+(n>1?'×'+n:'')).join(' ')}`);}
  console.log(`  vivres ${r(nat.vivres||0)} (${delta('vivres')}) = ${((nat.vivres||0)/Math.max(1,eat)).toFixed(1)} jours de réserve · mange ${r(eat)}/j · moulins peuvent ${((B.foodCan||0)*24).toFixed(0)}/j · faim ${B.hunger}`);
  {const mix={},arm={};for(const u of sold){mix[u.w||'aucune']=(mix[u.w||'aucune']||0)+1;arm[u.armor||'sans']=(arm[u.armor||'sans']||0)+1;}console.log(`  armée : ${Object.entries(mix).map(([k,n])=>k.replace('bee_','')+' '+n).join(' · ')} — protections : ${Object.entries(arm).map(([k,n])=>k.replace('bee_','')+' '+n).join(' · ')}`);}
  console.log(`  armes : fusils ${r(nat['a:bee_fusil']||0)} (${delta('a:bee_fusil')}) · pm ${r(nat['a:bee_pm']||0)} · caisses ${r(nat['m:bee_fusil']||0)} (${delta('m:bee_fusil')}) · poudre ${r(nat.poudre||0)} salpêtre ${r(nat.salpetre||0)} plomb ${r(nat.plomb||0)} fer ${r(nat.fer||0)} (${delta('fer')}) pièces ${r(nat.pieces||0)} charbon ${r(nat.charbon||0)} bois ${r(nat.bois||0)} pierre ${r(nat.pierre||0)}`);
  console.log(`  usines : ${Object.entries(why).map(([k,n])=>n+'× '+k).join(' | ')}`);
  console.log(`  chantiers ${sites.length} (bloqués >1 j : ${stuck.map(b=>b.k+' '+r(b.progress*100)+'% '+(b.why||'')).join(', ')||'aucun'}) · ruines bèè ${bs.filter(b=>b.ruin).length} · abîmés ${dmg}`);
  console.log(`  civils : ${JSON.stringify(tasks)}`);
  console.log(`  logistique : rails ${rails.filter(x=>x.b).length}/${rails.length} · gares ${bs.filter(b=>b.k==='gare'&&b.done&&!b.ruin).length} · trains ${V.filter(v=>v.k==='train').length} · porteurs ${V.filter(v=>v.k==='porteur').length} (${V.filter(v=>v.k==='porteur'&&v.job).length} en course) · dépôts ${bs.filter(b=>!b.ruin&&b.done&&W.isDepot(b)).length}`);
  {const M=W.market('beee');let unmet=0,items=0;const byK={};for(const D of M.deps)for(const it of W.deficits(M,D)){unmet+=it.n;items++;byK[it.k]=(byK[it.k]||0)+it.n;}
    const siteW=bs.filter(b=>!b.done&&!b.ruin&&/attend|chercher|arrivent/.test(b.why||'')).length,facW=bs.filter(b=>b.done&&!b.ruin&&BUILDINGS[b.k].factory&&/attend/.test(b.why||'')).length;const jams=W.jams('beee').length;
    const idle=civ.filter(u=>!u.task).length;const tr=V.filter(v=>v.k==='train');const po=B.plan?.porters||{};
    console.log(`  flux : manques ${Math.round(unmet)} (${items} lignes ; ${Object.entries(byK).sort((a,z)=>z[1]-a[1]).slice(0,5).map(([k,n])=>k+' '+Math.round(n)).join(', ')}) · chantiers qui attendent ${siteW} · usines qui attendent ${facW} · dépôts engorgés ${jams} · porteurs ${po.have}/${po.want} · trains en marche ${tr.filter(v=>v.state==='go').length}/${tr.length} · sans tâche ${idle} · stable ${W.beeeStable()?'oui':'non'}`);}
  console.log(`  fondation : ${B.colonyWhy||"-"} (fondées ${B.founded||0})`);
  console.log(`  guerre : vagues ${B.waves||0} · bandes ${(B.bands||[]).map(b=>`${b.aim||b.kind||'raid'}/${b.state}/${W.bandMembers(b).length}`).join(', ')||'aucune'} · pertes bèè ${B.lossT||'?'} · bâtiments meumeu détruits ${W.s.buildings.filter(b=>b.f==='meumeu'&&b.ruin).length}`);}
const seenB=new Map();
for(let d=0;d<DAYS;d++){for(let h=0;h<24;h++){if(h%3===0)for(const b of W.s.beee.bands||[]){const o=seenB.get(b.id)||{states:new Set(),aim:b.aim,max:0};o.states.add(b.state);o.aim=b.aim||b.kind||'raid';o.max=Math.max(o.max,W.bandMembers(b).length);seenB.set(b.id,o);}try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
  if((d+1)%EVERY===0||d+1===DAYS)bilan(d+1);}
{const L=W.s.log;const cnt=re=>L.filter(l=>re.test(l.text)).length;
  console.log(`\njournal (160 dernières lignes) : rassemblements ${cnt(/rassemblent une armée/)} · départs ${cnt(/s’ébranle/)} · contre-attaques ${cnt(/contre-attaquent/)} · fouilles ${cnt(/partent fouiller/)} · sorties de défense ${cnt(/sortent à la rencontre/)} · assauts en masse ${cnt(/assaut en masse/)} · décrochages ${cnt(/décrochent/)}`);
  console.log(L.filter(l=>/armée|ébranle|contre-attaqu|assaut|décrochent|fouiller|détruit|rasé/.test(l.text)).slice(0,10).map(l=>`j${Math.floor(l.t/24)} ${l.text}`).join('\n'));}
console.log('bandes vues :',[...seenB.values()].map(o=>`${o.aim}(${o.max}) ${[...o.states].join('→')}`).join(' | '));
