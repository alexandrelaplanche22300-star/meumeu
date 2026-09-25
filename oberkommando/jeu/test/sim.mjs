// Oberkommando der Meumeu — une partie jouée seule. Un « joueur automatique » tient les Meumeu pendant des semaines
// avec les mêmes commandes que le joueur (poser, envoyer, former, régler une usine, rattacher, demander, tracer une voie),
// et relève chaque jour ce qui tient et ce qui coince : population, stocks, usines et pourquoi elles s'arrêtent, chantiers
// qui attendent, fret servi ou non, guerre. Lancer : node test/sim.mjs [graine] [jours]   (ou plusieurs graines : 1,2,3)
import {World} from '../js/world.js';
import {BUILDINGS,DAY,RARE,MAP_N,T} from '../js/data.js';

const seeds=(process.argv[2]||'3').split(',').map(Number);const DAYS=+(process.argv[3]||30);const F='meumeu';
const pct=(a,b)=>b?Math.round(a/b*100):0;const r1=v=>Math.round(v*10)/10;

function play(seed){const W=new World(seed);const cap=W.capital();const [ci,cj]=W.bc(cap);const log=[];const say=t=>log.push(`j${W.day} ${String(Math.floor(W.hour())).padStart(2,'0')}h · ${t}`);
  const d2=(a,b,x,y)=>Math.hypot(a-x,b-y);
  const spot=(k,x,y,r0=4,r1=26)=>{for(let r=r0;r<r1;r++)for(let a=0;a<48;a++){const i=Math.round(x+Math.cos(a/48*6.283)*r-BUILDINGS[k].size[0]/2),j=Math.round(y+Math.sin(a/48*6.283)*r-BUILDINGS[k].size[1]/2);if(W.canPlace(F,k,i,j).ok)return [i,j];}return null;};
  const ore=res=>W.s.nodes.filter(n=>n.type==='ore'&&n.res===res&&n.left>0&&!W.s.buildings.some(b=>b.ore===n.id)).sort((a,b)=>d2(a.i,a.j,ci,cj)-d2(b.i,b.j,ci,cj))[0];
  const mine=[];const S={placed:{},fails:{},railTried:false};
  const place=(k,at,tag)=>{if(!at){S.fails[tag||k]=(S.fails[tag||k]||0)+1;return null;}const r=W.place(F,k,at[0],at[1]);if(!r.ok){S.fails[tag||k]=(S.fails[tag||k]||0)+1;return null;}S.placed[tag||k]=r.b.id;say(`pose ${BUILDINGS[k].name}${tag&&tag!==k?' ('+tag+')':''}`);return r.b;};
  const got=tag=>S.placed[tag]!=null?W.building(S.placed[tag]):null;
  const done=tag=>got(tag)?.done;
  // une mine sur un filon : d'abord un camp à côté (le dépôt), puis la mine dessus
  const minePlan=(res,tag)=>{if(got(tag+'-mine'))return true;const nd=S[tag]||(S[tag]=ore(res));if(!nd)return false;
    if(!got(tag+'-camp')){place('camp',spot('camp',nd.i+.5,nd.j+.5,5,11),tag+'-camp');return false;}if(!done(tag+'-camp'))return false;
    const b=place('mine',[nd.i,nd.j],tag+'-mine');if(b)mine.push(b);return false;};
  // la voie : un chemin à pied du centre-ville jusqu'au dépôt d'un filon lointain, une gare à chaque bout, un train
  const railPlan=(tag,to)=>{if(S.railTried)return;const far=got(to);if(!far?.done)return;S.railTried=true;
    const [fx,fy]=W.bc(far);const a=[ci+6,cj],b=[fx-4,fy];const cost=W.costFn(F);const gi=Math.floor(b[0]),gj=Math.floor(b[1]);const r=W.pather.find(Math.floor(a[0]),Math.floor(a[1]),gi,gj,cost,k=>Math.hypot(k%MAP_N-gi,((k/MAP_N)|0)-gj)<3,120000);
    if(!r.done||r.path.length<6){say('voie : pas de chemin');S.fails.rail=1;return;}const pl=W.planLine(F,'rail',r.path);say(`voie tracée : ${pl.n} cases (${r.path.length} voulues)`);S.rail={cells:r.path,n:pl.n};};
  const gares=()=>{if(!S.rail||got('gare-a'))return;const c=S.rail.cells;const try2=(from,tag)=>{for(const [i,j] of from)for(const [di,dj] of [[1,1],[-4,1],[1,-3],[-4,-3],[1,-1],[-2,1]]){const r=W.canPlace(F,'gare',i+di,j+dj);if(r.ok){return place('gare',[i+di,j+dj],tag);}}S.fails[tag]=(S.fails[tag]||0)+1;return null;};
    try2(c.slice(0,6),'gare-a');try2(c.slice(-6).reverse(),'gare-b');};
  const sendIdle=(b,n)=>{const ids=W.idle().sort((p,q)=>d2(p.x,p.y,b.i,b.j)-d2(q.x,q.y,b.i,b.j)).slice(0,n).map(u=>u.id);if(ids.length)W.order(ids,{type:'building',id:b.id});return ids.length;};
  const workersOf=b=>W.workers(b).length;
  const M=[];let lastWar=null;const t0=Date.now();
  for(let h=0;h<DAYS*DAY;h++){
    // --- le joueur, toutes les heures ---
    const pop=W.pop(F);
    if(!cap.queue.length&&pop.used<pop.cap&&(cap.stock.vivres||0)>=40)W.train(cap,'villageois');
    if(cap.ruin)continue;
    if(pop.used>=pop.cap-1&&!W.s.buildings.some(b=>b.f===F&&b.k==='maison'&&!b.done&&!b.ruin))place('maison',spot('maison',ci,cj,5,22),'maison'+h);
    // le plan de construction, dans l'ordre ; chaque étape attend que la précédente soit posée
    const steps=[()=>got('maison1')||place('maison',spot('maison',ci,cj,5,14),'maison1'),()=>got('maison2')||place('maison',spot('maison',ci,cj,5,16),'maison2'),
      ()=>{if(got('camp-bois'))return true;const tr=W.s.nodes.filter(n=>n.type==='tree'&&n.left>1).sort((a,b)=>d2(a.i,a.j,ci,cj)-d2(b.i,b.j,ci,cj))[20];return place('camp',tr&&spot('camp',tr.i,tr.j,2,8),'camp-bois');},
      ()=>got('ferme')||place('ferme',spot('ferme',ci,cj,6,20),'ferme'),
      ()=>minePlan('charbon','charbon'),()=>minePlan('argile','argile'),
      ()=>got('briqueterie')||place('briqueterie',spot('briqueterie',ci,cj,6,20),'briqueterie'),
      ()=>got('atelier')||place('atelier',spot('atelier',ci,cj,6,22),'atelier'),
      ()=>got('caserne')||place('caserne',spot('caserne',ci,cj,7,24),'caserne'),
      ()=>minePlan('fer','fer'),()=>minePlan('sels','sels'),
      ()=>got('arsenal')||place('arsenal',spot('arsenal',ci,cj,7,24),'arsenal'),
      ()=>got('manufacture')||place('manufacture',spot('manufacture',ci,cj,7,26),'manufacture'),
      ()=>got('hopital')||place('hopital',spot('hopital',ci,cj,7,26),'hopital'),
      ()=>got('tour1')||place('tour',spot('tour',ci+8,cj-8,2,10),'tour1'),()=>got('tour2')||place('tour',spot('tour',ci+10,cj,2,10),'tour2')];
    // on n'ouvre pas plus de trois chantiers à la fois
    const sites=W.s.buildings.filter(b=>b.f===F&&!b.done&&!b.ruin);if(sites.length<3)for(const st of steps){st();if(W.s.buildings.filter(b=>b.f===F&&!b.done&&!b.ruin).length>=3)break;}
    if(done('fer-camp'))railPlan('rail','fer-camp');gares();
    const ga=got('gare-a'),gb=got('gare-b');if(ga?.done&&gb?.done&&!W.s.vehicles.some(v=>v.k==='train')&&!ga.queue.length){const r=W.train(ga,'train');if(r.ok)say('train commandé');}
    if(gb?.done&&got('fer-mine')&&!S.relinked){const m=got('fer-mine');if(W.linkOk(m,gb.id)){W.setLink(m,'out',gb.id);S.relinked=true;say('mine de fer rattachée à la gare');}}
    // porteurs : un par dépôt achevé (deux au centre-ville), pris parmi les oisifs
    for(const D of W.s.buildings.filter(b=>b.f===F&&b.done&&W.isDepot(b)))if(W.porters(D).length<(D.k==='centre'?2:1)&&W.idle(F).length>2)W.addPorters(D,1);
    // la briqueterie, l'arsenal : leur production
    const ar=got('arsenal');if(ar?.done&&!S.arsSet){S.arsSet=true;}
    // les soldats : une douzaine
    const cas=got('caserne');if(cas?.done&&!cas.queue.length&&W.s.units.filter(u=>u.f===F&&u.w).length<12){const r=W.train(cas,'soldat','mle1');if(!r.ok)S.soldierWhy=r.why.join(', ');}
    // les villageois oisifs : aux chantiers, aux postes vides, sinon au bois
    for(const b of W.s.buildings.filter(b=>b.f===F&&!b.done&&!b.ruin)){const nb=W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;if(nb<2&&!sendIdle(b,2-nb)){
      // personne d'oisif : on retire des bûcherons
      const g=W.s.units.filter(u=>u.f===F&&u.k==='villageois'&&u.task?.kind==='gather').slice(0,2-nb);if(g.length)W.order(g.map(u=>u.id),{type:'building',id:b.id});}}
    // on garde deux villageois pour les chantiers
    const siteN=W.s.buildings.filter(b=>b.f===F&&!b.done&&!b.ruin).length;const spare=W.idle().length-(siteN?2:0);let give=spare;
    for(const b of W.s.buildings.filter(b=>b.f===F&&b.done&&BUILDINGS[b.k].workers)){if(give<=0)break;const miss=BUILDINGS[b.k].workers-workersOf(b);if(miss>0)give-=sendIdle(b,Math.min(miss,give,b.k==='camp'?3:miss));}
    const idle=W.idle();if(idle.length){const tr=W.s.nodes.filter(n=>n.type==='tree'&&n.left>1).sort((a,b)=>d2(a.i,a.j,ci,cj)-d2(b.i,b.j,ci,cj))[0];if(tr)W.order(idle.map(u=>u.id),{type:'node',id:tr.id});}
    // --- le monde tourne une heure ---
    W.update(1);
    if(W.atWar&&!lastWar){lastWar=W.day;say('LA GUERRE');}
    for(const e of W.events.splice(0))if(e.type==='wave')say(`vague bèè de ${e.n}`);else if(e.type==='collapse'&&e.f===F&&e.k)say(`détruit : ${BUILDINGS[e.k].name}`);
    // --- le relevé, chaque jour à minuit ---
    if((h+1)%DAY===0){const bs=W.s.buildings.filter(b=>b.f===F);const fac=bs.filter(b=>b.done&&(BUILDINGS[b.k].factory||b.k==='mine'||BUILDINGS[b.k].makes));
      const why={};for(const b of fac){const k=b.working?'au travail':(b.why||'à l’arrêt').replace(/[0-9.,]+/g,'#').slice(0,60);why[k]=(why[k]||0)+1;}
      const sh=W.shortages(F);const vs=W.s.vehicles.filter(v=>v.f===F&&v.k!=='porteur'||true);
      const tot={};for(const b of bs)if(b.stock)for(const [k,v] of Object.entries(b.stock))tot[k]=(tot[k]||0)+v;
      M.push({day:W.day-1,pop:W.pop(F),vil:W.s.units.filter(u=>u.f===F&&u.k==='villageois').length,idle:W.idle().length,sold:W.s.units.filter(u=>u.f===F&&u.w).length,
        built:bs.filter(b=>b.done).length,sites:bs.filter(b=>!b.done&&!b.ruin).length,waiting:bs.filter(b=>!b.done&&!b.ruin&&b.why).map(b=>`${BUILDINGS[b.k].name}: ${b.why}`),ruins:bs.filter(b=>b.ruin).length,
        why,short:sh.length,shortTop:sh.slice(0,4).map(s=>`${BUILDINGS[s.D.k].name}/${s.k} ${r1(s.n)}${s.inb>0?' (en route)':s.src<1?' (sans source)':''}`),
        veh:vs.map(v=>`${v.k[0]}${v.trips||0}${v.why?'!':''}`).join(' '),vehWhy:vs.filter(v=>v.why).map(v=>`${v.name}: ${v.why}`),
        stock:Object.fromEntries(['bois','pierre','vivres','charbon','argile','briques','pieces','fer','sels','m:mle1','a:mle1'].map(k=>[k,Math.round(tot[k]||0)])),
        war:W.atWar,waves:W.s.beee.waves,deadM:W.s.corpses.filter(c=>c.f===F).length,deadB:W.s.corpses.filter(c=>c.f==='beee').length,beee:W.s.units.filter(u=>u.f==='beee').length});}}
  if(process.env.DBG){const bs=W.s.buildings.filter(b=>b.f===F);
    console.log('SITES',bs.filter(b=>!b.done&&!b.ruin).map(b=>({k:b.k,prog:+b.progress.toFixed(2),why:b.why,site:b.site&&W.depotName(W.building(b.site)),paid:b.paid,builders:W.s.units.filter(u=>u.task?.b===b.id).length})));
    console.log('DEPOTS',bs.filter(b=>W.isDepot(b)).map(b=>({k:b.k,name:W.depotName(b),used:Math.round(W.stored(b)),cap:BUILDINGS[b.k].store,stock:Object.fromEntries(Object.entries(b.stock).filter(([,v])=>v>=1).map(([k,v])=>[k,Math.round(v)]))})));
    console.log('FACT',bs.filter(b=>b.done&&(BUILDINGS[b.k].workers)).map(b=>({k:b.k,w:W.workers(b).length,why:b.why,sup:b.sup&&W.depotName(W.building(b.sup)),out:b.out&&W.depotName(W.building(b.out))})));
    console.log('VEH',W.s.vehicles.map(v=>({n:v.name,job:W.jobText(v),why:v.why,at:v.at&&W.depotName(W.building(v.at)),st:v.state})));
    console.log('SHORT',W.shortages(F).map(s=>`${W.depotName(s.D)} ${s.k} ${s.n.toFixed(1)} p${s.p} src ${s.src.toFixed(1)} inb ${s.inb}`));
    console.log('POP',W.pop(F),'queue',cap.queue,'cap vivres',cap.stock.vivres);
    console.log('TASKS',Object.entries(W.s.units.filter(u=>u.f===F).reduce((o,u)=>{const k=u.task?(u.task.kind+(u.task.b!=null?':'+W.building(u.task.b)?.k:'')):'none';o[k]=(o[k]||0)+1;return o;},{})));}
  return {W,M,log,S,ms:Date.now()-t0};}

for(const seed of seeds){const {W,M,log,S,ms}=play(seed);
  console.log(`\n================ graine ${seed} · ${DAYS} jours · ${(ms/1000).toFixed(1)} s (${Math.round(ms/DAYS)} ms par jour de jeu) ================`);
  for(const m of M)console.log(`j${String(m.day).padStart(2)} pop ${m.pop.used}/${m.pop.cap} (vil ${m.vil}, oisifs ${m.idle}, soldats ${m.sold}) · bâtis ${m.built}, chantiers ${m.sites}${m.ruins?`, ruines ${m.ruins}`:''} · manques ${m.short} · véhicules [${m.veh}] · ${Object.entries(m.stock).map(([k,v])=>`${k} ${v}`).join(' ')}${m.war?` · GUERRE vagues ${m.waves} morts M${m.deadM}/B${m.deadB} bèè ${m.beee}`:''}`);
  const last=M[M.length-1];console.log('\n— usines, mines, fermes (dernier jour) :');for(const [k,n] of Object.entries(last.why))console.log(`   ${n} × ${k}`);
  const allWhy={};for(const m of M)for(const [k,n] of Object.entries(m.why))allWhy[k]=(allWhy[k]||0)+n;console.log('— sur toute la partie (usine-jours) :');for(const [k,n] of Object.entries(allWhy).sort((a,b)=>b[1]-a[1]).slice(0,12))console.log(`   ${n} × ${k}`);
  console.log('— manques en tête (dernier jour) :',last.shortTop.join(' · ')||'aucun');
  console.log('— chantiers qui attendent (dernier jour) :',last.waiting.join(' · ')||'aucun');
  console.log('— véhicules bloqués (dernier jour) :',last.vehWhy.join(' · ')||'aucun');
  console.log('— échecs du joueur :',JSON.stringify(S.fails),S.soldierWhy?`· soldats : ${S.soldierWhy}`:'');
  console.log('— journal :');for(const l of log)console.log('   '+l);}
