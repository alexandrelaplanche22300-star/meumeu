// La chimie de guerre : des découvertes à prérequis qui débloquent du NEUF (explosifs, modèle), plus le napalm et la fumée du phosphore.
// CRITÈRES (fixés avant de lancer) :
//   K1 ce que rien ne verrouille reste libre dès le départ (explosif « brisant », modèle « obusier ») ; thermite, phosphore, amatol et lance-flammes sont verrouillés
//      et se débloquent en adoptant leur découverte
//   K2 un projet (V12.6 : la recherche des savants) refuse une découverte dont les prérequis manquent (message qui nomme ce qui manque) et ne le dit plus quand ils sont là
//   K3 la pratique de la chimie monte quand une poudrerie travaille, et les idées respectent les prérequis (jamais « napalm » avant thermite ET phosphore)
//   K4 la thermite incendie plus fort que le gel (rayon de feu ≥ 1,4 ×) avec moins de souffle que la tolite
//   K5 un obus au phosphore laisse un nuage qui coupe la vue au travers, puis qui se dissipe
//   K6 le napalm double la durée des flaques incendiaires
//   K7 le lance-flammes : un gel incendiaire, porté par un seul servant, de courte portée (≤ 30 m utiles)
//   K8 l'amatol coûte au moins un tiers de moins en explosifs que la tolite pour une même charge
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/chimie.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {INNOV,FIRE}=await import('../js/data.js');
const {charge,FILLS}=await import('../js/explosive.js');const {derive,kitToP}=await import('../js/ballistics.js');const {KIT_PRESETS}=await import('../js/kitdata.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const mk=(seed=3)=>{const W=new World(seed,{assisted:true});return W;};
// K1
{const W=mk();const libre=W.unlocked('fill:brisant')&&W.unlocked('preset:howitzer')&&W.unlocked('fill:tolite');
  const ferme=['fill:thermite','fill:phosphore','fill:amatol','preset:flamethrower'].map(k=>W.unlocked(k));
  W.s.innov.done.push('thermite','amatol');const ouvert=W.unlocked('fill:thermite')&&W.unlocked('fill:amatol')&&!W.unlocked('fill:phosphore');
  P(libre&&ferme.every(x=>!x)&&ouvert,'K1. le neuf est verrouillé, l\'ancien reste libre, une découverte ouvre son contenu',`libre ${libre} · verrouillés ${ferme.join('/')} · après thermite+amatol : ${ouvert}`);}
// K2
{const W=mk();const lab=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='labo'&&b.done)||W.s.buildings.find(b=>b.f==='meumeu'&&/lab/.test(b.k));
  if(!lab){const at=W.buildSpot('meumeu','labo',W.capital().i+10,W.capital().j+10,0,20);if(at)W.addBuilding('meumeu','labo',at[0],at[1],true);}
  const cap=W.capital();Object.assign(cap.stock,{fer:500,pieces:500,charbon:500,cuivre:500,salpetre:500});
  const r0=W.canStartProject('napalm',[]);W.s.innov.done.push('thermite','phosphore');const r1=W.canStartProject('napalm',[]);
  P(!r0.ok&&r0.why.some(w=>/thermite/i.test(w)&&/phosphore/i.test(w))&&!r1.why.some(w=>/d\u2019abord/.test(w)),'K2. un projet refuse sans prérequis et le dit',`sans : « ${r0.why.find(w=>/abord/.test(w))||r0.why[0]} » · avec : ${r1.ok?'accepté':r1.why.join(' ; ')}`);}
// K3
{const W=mk(5);const cap=W.capital();
  const pou=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='poudrerie'&&b.done);pou.prod='poudre';Object.assign(cap.stock,{salpetre:400,charbon:400});
  const workers=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,3);for(const u of workers)u.task={kind:'work',b:pou.id};
  for(let h=0;h<48;h++)W.update(1);const pr=W.s.innov.prac.chimie||0;
  // les idées : on force la pratique et on laisse tourner longtemps
  const I=W.s.innov;I.prac.chimie=1e6;let seen=new Set();for(let k=0;k<400;k++){I.clock=99;I.next.chimie=1;W.innovTick(2);for(const x of I.ideas)seen.add(x.id);I.ideas=[];if(k===150)I.done.push('presse');}
  const avant=[...seen].filter(x=>['napalm','lanceflammes','phosphore'].includes(x));
  P(pr>0&&avant.length===0,'K3. la chimie se pratique à la poudrerie, les idées respectent les prérequis',`pratique ${pr.toFixed(1)} après 48 h · idées vues ${[...seen].join(',')||'aucune'} · idées trop avancées : ${avant.join(',')||'aucune'}`);}
// K4
{const g=500,cas=1500;const tol=charge(g,cas,{fill:'tolite'}),gel=charge(g,cas,{fill:'gelinc'}),th=charge(g,cas,{fill:'thermite'});
  P(th.fire>=gel.fire*1.4&&th.blast<tol.blast,'K4. la thermite incendie plus fort que le gel, souffle moindre que la tolite',`feu ${th.fire.toFixed(1)} m contre ${gel.fire.toFixed(1)} m (gel) · souffle ${th.blast.toFixed(2)} m contre ${tol.blast.toFixed(2)} m (tolite)`);}
// K5
{const W=mk();const E=charge(300,900,{fill:'phosphore'});const x=200,y=200;const n0=W.s.smokes.length;W.heBlast(x,y,E,'beee',null,{kind:'obus'});
  const cloud=W.s.smokes.length===n0+1;const vueAvant=W.los(x-12,y,x+12,y);
  W.s.t+=11;W.update(.01);const vueApres=W.los(x-12,y,x+12,y);
  P(cloud&&!vueAvant&&vueApres,'K5. le phosphore laisse un nuage qui coupe la vue, puis se dissipe',`nuage ${cloud} · vue à travers : ${vueAvant} puis, 11 h plus tard, ${vueApres}`);}
// K6
{const dur=(nap)=>{const W=mk();if(nap)W.s.innov.done.push('napalm'),W.remod();const E=charge(300,900,{fill:'gelinc'});const n0=W.s.groundFires.length;const t0=W.s.t;W.heBlast(200,200,E,'beee',null,{kind:'obus'});const f=W.s.groundFires[n0];return f?f.end-t0:0;};
  const d0=dur(false),d1=dur(true);P(d0>0&&Math.abs(d1/d0-2)<.05,'K6. le napalm double la durée des flaques',`${d0} h → ${d1} h (FIRE.hours ${FIRE.hours})`);}
// K7
{const pre=KIT_PRESETS.find(p=>p.id==='flamethrower');const p=kitToP(pre.design),D=derive(p);
  P(p.fill==='gelinc'&&D.he?.inc&&D.crewMin===1&&D.eff<=30&&!D.overload,'K7. le lance-flammes : gel incendiaire, un seul servant, courte portée',`fill ${p.fill} · gel ${D.he?.g?.toFixed(0)} g · servants ${D.crewMin} · portée utile ${D.eff} m · masse ${D.massEmpty.toFixed(2)} kg`);}
// K8
{const a=charge(300,900,{fill:'amatol'}),t=charge(300,900,{fill:'tolite'});
  const cout=(F)=>F.x;P(FILLS.amatol.x<=FILLS.tolite.x*.67&&FILLS.amatol.res==='explosifs','K8. l\'amatol coûte au moins un tiers de moins que la tolite',`coût relatif ${FILLS.amatol.x} contre ${FILLS.tolite.x} · souffle ${a.blast.toFixed(2)} m contre ${t.blast.toFixed(2)} m`);}
process.exit(fail?1:0);
