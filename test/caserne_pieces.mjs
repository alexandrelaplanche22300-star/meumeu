// La caserne et les pièces servies : un équipage complet sort en escouade, ses servants portent une arme ET des caisses de la pièce.
// Bug mesuré avant correction (V12.0, dbg_caserne) : un servant sorti avec le fusil choisi par défaut emportait des caisses de MUNITIONS DE FUSIL,
// que le code re-étiquetait « obus » une fois rattaché à la pièce ; les servants sortaient toujours sans arme, le tireur seul, hors escouade.
// CRITÈRES (fixés avant de lancer) :
//   E1 « Équipage complet » : 1 tireur (la pièce) + (équipage − 1) servants, tous dans UNE escouade nommée d'après la pièce, chaque servant déjà affecté
//      à sa pièce (serve = le tireur), sans attendre un tour de simulation ; testé pour une pièce à 2 et à ≥ 3 servants
//   E2 « Ils prennent des armes » : chaque servant sort avec une arme légère adoptée (jamais une pièce servie), ses cartouches, ET des caisses de la
//      pièce (ammoW = la pièce, caisses > 0) ; le tireur a ses obus
//   E3 Atomique et honnête : pas assez de recrues, pièce absente du dépôt, pas d'arme légère ni de munitions → refus qui NOMME ce qui manque, aucun stock
//      touché, personne ne sort
//   E4 Plus de conversion : la sortie de servants avec une arme non servie est refusée ; des caisses d'un autre type portées par un servant ne deviennent
//      jamais des obus (type et quantité inchangés après 12 h avec la pièce)
//   E5 Conservation : ce que le dépôt perd = 1 pièce + (équipage − 1) armes légères + les caisses (servants) + les cartouches emportées (tireur, servants)
//   E6 Ravitaillement physique : le tireur vidé est rechargé par un servant ; les obus reçus = les caisses perdues par les servants (× obus par caisse)
//   E7 Disposition : après 3 h, les servants sont à ≤ 2 cases de la pièce, et la pièce regarde du côté du point de ralliement
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/caserne_pieces.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
// une pièce lourde à trépied : plusieurs servants
const MG={id:'mg',f:'meumeu',name:'Mitrailleuse',status:'adopte',p:{d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:260,twist:70,action:'auto',rof:650,mag:150,heavy:true,wallx:1.6,mods:['trepied']}};
const mk=(seed=3,recrues=8)=>{const W=new World(seed,{assisted:true});const cap=W.capital();Object.assign(cap.stock,{pieces:900,fer:900,cuivre:900,bois:900,poudre:400,plomb:500,explosifs:200,vivres:900});
  W.s.designs.mg=JSON.parse(JSON.stringify(MG));
  let cas=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='caserne'&&b.done);if(!cas){const at=W.buildSpot('meumeu','caserne',cap.i+8,cap.j+2,0,24);cas=W.addBuilding('meumeu','caserne',at[0],at[1],true);}
  Object.assign(cap.stock,{'a:canon_mle1':4,'m:canon_mle1':12,'a:mle1':30,'m:mle1':20,'a:mg':3,'m:mg':12});
  for(const v of W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,recrues))W.enterBarracks(v,cas);
  cas.rally=[cas.i+6,cas.j+8];return {W,cap,cas};};
const total=(W,k)=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.stock).reduce((n,b)=>n+(b.stock[k]||0),0);
const snap=W=>JSON.stringify(W.s.buildings.filter(b=>b.stock).map(b=>[b.id,Object.entries(b.stock).filter(([,v])=>v).sort()]));
const crewOf=(W,gid)=>W.s.units.filter(u=>u.serve===gid);
// E1
{const r=[];for(const id of ['canon_mle1','mg']){const {W,cas}=mk();const Wd=W.W(id);const res=W.releaseCrew(cas,id);const g=W.s.units.find(u=>u.w===id&&!u.serve);
    const servants=g?crewOf(W,g.id):[];const sq=g&&g.sq&&W.squad(g.sq);const membres=sq?W.members(sq):[];
    r.push({id,ok:res.ok,crew:Wd.crew,sortis:res.n,servants:servants.length,memeEscouade:sq&&servants.every(s=>s.sq===g.sq)&&membres.length===Wd.crew,nom:sq?.name||'',chef:sq?.leader===g?.id});}
  const bon=r.every(x=>x.ok&&x.sortis===x.crew&&x.servants===x.crew-1&&x.memeEscouade&&x.chef&&/./.test(x.nom))&&r.some(x=>x.crew>=3);
  P(bon,'E1. un équipage complet sort en une escouade, chaque servant déjà affecté à sa pièce',r.map(x=>`${x.id}: équipage ${x.crew} · sortis ${x.sortis} · servants ${x.servants} · escouade « ${x.nom} » ${x.memeEscouade?'complète':'incomplète'}`).join(' | '));}
// E2
{const {W,cas}=mk();const id='mg';const Wd=W.W(id);W.releaseCrew(cas,id);const g=W.s.units.find(u=>u.w===id&&!u.serve);const servants=crewOf(W,g.id);
  const armes=servants.map(s=>({w:s.w,servi:s.w&&W.W(s.w).crew>1,cart:(s.mag||0)+(s.pouch||0),ammoW:s.ammoW,caisses:s.crates||0}));
  const ok=servants.length>=2&&armes.every(a=>a.w&&!a.servi&&W.design(a.w)?.status==='adopte'&&a.cart>0&&a.ammoW===id&&a.caisses>0)&&((g.mag||0)+(g.pouch||0))>=1;
  P(ok,'E2. les servants prennent une arme légère, ses cartouches et des caisses de la pièce ; le tireur a ses munitions',`servants ${JSON.stringify(armes)} · tireur ${g.mag}+${g.pouch} coups`);}
// E3
{const cas3=[];
  {const {W,cas}=mk(3,1);const s0=snap(W),n0=cas.inside.length;const r=W.releaseCrew(cas,'mg');cas3.push(['trop peu de recrues',!r.ok&&/recrue/i.test(r.why.join(' '))&&snap(W)===s0&&cas.inside.length===n0,r.why?.[0]]);}
  {const {W,cap,cas}=mk();cap.stock['a:mg']=0;for(const b of W.s.buildings)if(b.stock)b.stock['a:mg']=0;const s0=snap(W),n0=cas.inside.length;const r=W.releaseCrew(cas,'mg');cas3.push(['pièce absente',!r.ok&&/Mitrailleuse|pièce/i.test(r.why.join(' '))&&snap(W)===s0&&cas.inside.length===n0,r.why?.[0]]);}
  {const {W,cas}=mk();for(const b of W.s.buildings)if(b.stock){b.stock['a:mle1']=0;}const s0=snap(W),n0=cas.inside.length;const r=W.releaseCrew(cas,'mg');cas3.push(['aucune arme légère',!r.ok&&/arme légère|arme/i.test(r.why.join(' '))&&snap(W)===s0&&cas.inside.length===n0,r.why?.[0]]);}
  {const {W,cas}=mk();for(const b of W.s.buildings)if(b.stock){b.stock['m:mg']=0;}const s0=snap(W),n0=cas.inside.length;const r=W.releaseCrew(cas,'mg');cas3.push(['plus de munitions pour la pièce',!r.ok&&/munitions|caisses/i.test(r.why.join(' '))&&snap(W)===s0&&cas.inside.length===n0,r.why?.[0]]);}
  P(cas3.every(c=>c[1]),'E3. un refus nomme ce qui manque et ne touche à rien',cas3.map(c=>`${c[0]} : ${c[1]?'refusé, intact':'FAUX'} (« ${c[2]} »)`).join(' | '));}
// E4
{const {W,cas}=mk();const refus=W.releaseRecruits(cas,1,'servant','mle1',null);const propre=!refus.ok&&/pièce/i.test((refus.why||[]).join(' '));
  // des caisses d'un autre type portées par un servant rattaché à la pièce : jamais converties en obus
  const {W:W2,cas:cas2}=mk(5);W2.releaseCrew(cas2,'mg');const g=W2.s.units.find(u=>u.w==='mg'&&!u.serve);const sv=crewOf(W2,g.id)[0];
  sv.ammoW='mle1';sv.crates=2;const avant={ammoW:sv.ammoW,crates:sv.crates};g.mag=0;g.pouch=0;
  for(let h=0;h<12;h++)W2.update(1);
  const ok=propre&&sv.ammoW==='mle1'&&near(sv.crates,2,1e-6);
  P(ok,'E4. plus de conversion : servants sans pièce refusés ; des caisses d’un autre type ne deviennent jamais des obus',`sortie avec un fusil : ${refus.ok?'ACCEPTÉE':'refusée « '+refus.why?.[0]+' »'} · caisses de fusil après 12 h : ${sv.crates} de type ${sv.ammoW} (avant ${avant.crates} ${avant.ammoW})`);}
// E5
{const {W,cas}=mk();const id='mg',Wd=W.W(id);const k=['a:mg','a:mle1','m:mg','m:mle1'];const av=Object.fromEntries(k.map(x=>[x,total(W,x)]));
  const res=W.releaseCrew(cas,id);const ap=Object.fromEntries(k.map(x=>[x,total(W,x)]));const g=W.s.units.find(u=>u.w===id&&!u.serve);const sv=crewOf(W,g.id);
  const nsv=Wd.crew-1;const cr=sv[0].crates;const side=sv[0].w;const Ws=W.W(side);
  const cartServants=sv.reduce((n,s)=>n+(s.mag||0)+(s.pouch||0),0);const cartGunner=(g.mag||0)+(g.pouch||0);
  const att={['a:mg']:-1,['a:'+side]:-nsv,['m:mg']:-(nsv*cr+cartGunner/Wd.perCrate),['m:'+side]:-(cartServants/Ws.perCrate)};
  const diffs=k.map(x=>[x,+(ap[x]-av[x]).toFixed(6),+(att[x]||0).toFixed(6)]);
  P(res.ok&&diffs.every(([,a,b])=>Math.abs(a-b)<1e-4)&&k.every(x=>ap[x]>=-1e-9),'E5. le dépôt perd exactement : la pièce, les armes légères, les caisses, les cartouches emportées',diffs.map(([x,a,b])=>`${x}: ${a} (attendu ${b})`).join(' · '));}
// E6
{const {W,cas}=mk();const id='mg',Wd=W.W(id);W.releaseCrew(cas,id);const g=W.s.units.find(u=>u.w===id&&!u.serve);const sv=crewOf(W,g.id);
  for(let h=0;h<2;h++)W.update(1);g.mag=0;g.pouch=0;const crates0=sv.reduce((n,s)=>n+(s.crates||0),0);
  for(let h=0;h<10;h++)W.update(1);
  const crates1=sv.reduce((n,s)=>n+(s.crates||0),0);const recu=(g.mag||0)+(g.pouch||0);const perdu=(crates0-crates1)*Wd.perCrate;
  P(recu>=Math.min(Wd.carry,1)&&near(recu,perdu,.51),'E6. le tireur vidé est rechargé par un servant : obus reçus = caisses perdues',`tireur ${recu} coups (portée max ${Wd.carry}) · caisses des servants ${crates0.toFixed(2)} → ${crates1.toFixed(2)} = ${perdu.toFixed(1)} coups`);}
// E7
{const {W,cas}=mk();W.releaseCrew(cas,'mg');const g=W.s.units.find(u=>u.w==='mg'&&!u.serve);for(let i=0;i<240;i++)W.update(.0125);const sv=crewOf(W,g.id);   // 3 h de jeu, au pas d'une image réelle (~1/240 h)
  const d=sv.map(s=>Math.hypot(s.x-g.x,s.y-g.y));const R=cas.rally,c0=W.bc(cas),dx=R[0]-c0[0],dy=R[1]-c0[1],n=Math.hypot(dx,dy)||1;const cos=(g.fx*dx+g.fy*dy)/((Math.hypot(g.fx,g.fy)||1)*n);
  P(sv.length>=2&&d.every(x=>x<=2)&&cos>.8,'E7. les servants sont autour de la pièce, la pièce regarde du côté du ralliement',`distances ${d.map(x=>x.toFixed(2))} · cosinus du cap avec la direction caserne→ralliement ${cos.toFixed(2)} (à ${n.toFixed(1)} cases)`);}
// E8 (ajouté après mesure, dans rechargement.mjs L4 : 82 s au lieu de 31 s) : un grand équipage est compté « présent » tout entier.
// Avant : le rayon de présence était fixe (1,2 case) alors que la table des places range les servants au-delà du septième plus loin en arrière ;
// un équipage de douze en comptait huit et la pièce tirait « au ralenti » avec tout son monde.
{const {presetP}=await import('../js/presets.js');const {W,cap,cas}=mk(3,0);W.s.designs.rupture={id:'rupture',f:'meumeu',name:'Rupture',status:'adopte',p:JSON.parse(JSON.stringify(presetP('rupture')))};
  Object.assign(cap.stock,{'a:rupture':1,'m:rupture':40});
  const vs=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois');while(vs.length<12)vs.push(W.addUnit('meumeu','villageois',cap.i+5,cap.j+5+vs.length*.3));
  for(const v of vs.slice(0,12))W.enterBarracks(v,cas);
  const res=W.releaseCrew(cas,'rupture');const g=res.gunner;for(let i=0;i<480;i++)W.update(.0125);   // 6 h de jeu, au pas d'une image
  const need=W.W('rupture').crew-1,present=g?W.servants(g).length:0,miss=Math.max(0,need-present);
  P(res.ok&&need===11&&present===11&&miss===0,'E8. un équipage de douze est compté présent tout entier, sans « servant manquant »',`${res.ok?'sorti':res.why?.[0]} · équipage ${need+1} · présents ${present}/${need} · manquants ${miss} · état de la pièce « ${g?.why||'—'} »`);}
process.exit(fail?1:0);
