// La recherche (V12.6) : savants, école, projets d'un bâtiment à l'autre, réunions, savants libres, destruction, sauvegarde.
// CRITÈRES (fixés avant de lancer) :
//   R1 « former un chimiste » prend d'abord l'ouvrier de l'usine chimique (praticien) ; il marche jusqu'au centre, y étudie 24 h, en sort savant : discipline
//      chimie, deux traits distincts et compatibles, 10 points d'expérience d'avance ; pendant l'école il compte dans la population
//   R2 un maître (chercheur confirmé) libre au centre fait finir l'école en moins de 20 h
//   R3 un projet de chimie (l'amatol) passe par ses trois étapes, chacune dans son bâtiment (théorie au centre, expériences au laboratoire, essai à
//      l'usine chimique) : on relève où travaille l'équipe pendant chaque étape ; à la fin l'amatol est adopté
//   R4 sans laboratoire, le projet attend à l'étape « Expériences » et dit pourquoi ; le laboratoire bâti, il repart
//   R5 un remue-méninges de trois savants donne au moins une idée en dix essais sur dix ; chaque idée est dans une discipline des présents et ses préalables
//      sont acquis ; la pratique seule ne propose jamais une découverte réservée aux savants
//   R6 un point d'avancement lève le blocage d'un projet au moins douze fois sur vingt
//   R7 deux ingénieurs libres au bureau d'études font avancer un prototype au moins 1,5 fois plus vite ; un chimiste libre presse l'usine chimique
//   R8 le centre détruit : les savants sortent (dans la rue), les élèves redeviennent villageois, la réunion est annulée
//   R9 sauvegarde et reprise : les savants sont toujours dans leurs bâtiments, le projet continue jusqu'au bout
//   R10 une percée accroît l'effet de l'innovation de moitié (×1,3 → ×1,45)
//   R11 trois jours de jeu avec la recherche en marche : aucune exception
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/recherche.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {INNOV,BUILDINGS}=await import('../js/data.js');
const {DISC,TRAITS,LAB_KIND,gradeOf}=await import('../js/researchdata.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const free=(W,k,ci,cj,r0=5,r1=30)=>{for(let r=r0;r<r1;r++)for(let a=0;a<40;a++){const i=Math.round(ci+Math.cos(a/40*6.283)*r),j=Math.round(cj+Math.sin(a/40*6.283)*r);if(W.canPlace('meumeu',k,i,j).ok)return [i,j];}return null;};
const put=(W,k,ci,cj)=>{const at=free(W,k,ci,cj);if(!at)throw new Error('pas de place pour '+k);return W.addBuilding('meumeu',k,at[0],at[1],true);};
const run=(W,h,step=.05,each=null)=>{for(let t=0;t<h;t+=step){W.update(step);if(each)each();}};
// une partie : départ établi (usine chimique, bureau d'études), un centre de recherche et un laboratoire près de la capitale, de quoi payer
const mk=(seed=5,{labo=true}={})=>{const W=new World(seed,{assisted:true});W.s.fog=false;const [ci,cj]=W.G.capital;const cap=W.capital();
  Object.assign(cap.stock,{vivres:2000,pieces:400,bois:900,pierre:900,fer:300,salpetre:300,charbon:300,cuivre:100,sante:60,explosifs:40});
  const C=put(W,'centre_recherche',ci,cj),L=labo?put(W,'labo',ci,cj):null;const U=W.s.buildings.find(b=>b.k==='poudrerie'),A=W.s.buildings.find(b=>b.k==='armurerie');return {W,C,L,U,A,cap,ci,cj};};
// un savant tout fait, dans un bâtiment (pour les essais qui ne portent pas sur l'école)
const savant=(W,b,disc,xp=30,traits=['methodique','optimiste'])=>{const u=W.addUnit('meumeu','villageois',b.i,b.j+5);u.k='savant';u.sci={disc,xp,traits,prat:false,metier:null,mor:.8,fat:0,pid:null,born:W.s.t,papers:0,idleT:0};W.labEnter(u,b);return u;};

// R1 et R2 : l'école
{const {W,C,U}=mk();const v=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&!u.ally);const ouv=v[3];ouv.task={kind:'work',b:U.id};
  const c0=W.schoolCands(C,'chimie')[0];const r=W.trainSavant(C,'chimie');let pop0=null,pop1=null;
  let t=0,inAt=null;while(t<60&&ouv.k!=='savant'){const p=W.pop('meumeu').used;W.update(.1);t+=.1;if(inAt==null&&ouv.inLab===C.id){inAt=t;pop0=p;pop1=W.pop('meumeu').used;}}
  const S=ouv.sci||{};const okTraits=S.traits?.length===2&&S.traits[0]!==S.traits[1]&&!(S.traits.includes('audacieux')&&S.traits.includes('prudent'));
  P(r.ok&&c0.u===ouv&&c0.prat&&ouv.k==='savant'&&S.disc==='chimie'&&S.prat&&S.xp>=10&&okTraits&&inAt!=null&&pop1===pop0,'R1 l’ouvrier poudrier devient chimiste',
    `${r.ok?'formé':r.why} · premier candidat ${c0?.u?.name} (${c0?.metier}, praticien ${c0?.prat}) · entré au centre à ${inAt?.toFixed(1)} h · savant à ${t.toFixed(1)} h · ${S.disc}, ${S.traits?.map(k=>TRAITS[k].name).join(' + ')}, xp ${S.xp} · population en entrant à l’école ${pop0}→${pop1}`);
  // R2 : un maître libre au centre
  const M=savant(W,C,'medecine',80,['pedagogue','optimiste']);const r2=W.trainSavant(C,'geo');let t2=0;const st=r2.u;while(t2<40&&st.k!=='savant'){W.update(.1);t2+=.1;}
  P(r2.ok&&st.k==='savant'&&t2<20,'R2 un maître fait aller l’école plus vite',`${r2.ok?'':r2.why} · élève savant en ${t2.toFixed(1)} h (sans maître : 24 h + la marche) · maître ${M.name}, ${gradeOf(M.sci.xp)}`);}

// R3 : l'amatol, de la théorie à l'essai pilote
{const {W,C,L,U}=mk(7);W.s.innov.done.push('presse');W.remod();const team=[savant(W,C,'chimie',30),savant(W,C,'chimie',30,['audacieux','bavard']),savant(W,C,'chimie',30,['reveur','optimiste'])];
  W.s.innov.ideas.push({id:'amatol',who:{name:'test'},t:0});const r=W.startProject('amatol',team.map(u=>u.id));const Pj=r.P;const seen={};let t=0,acc=0;
  W.events=[];while(t<120&&Pj.st==='actif'){W.update(.1);t+=.1;const ph=Pj.phases[Pj.ph].k;for(const u of team){const b=W.where(u);if(b&&u.sci.act==='travail'){(seen[ph]??=new Set()).add(b.k);}}for(const e of W.events)if(e.type==='labboom')acc++;W.events=[];}
  const ok=['theorie','experience','pilote'].every(k=>seen[k]?.size===1&&[...seen[k]][0]===({theorie:'centre_recherche',experience:'labo',pilote:'poudrerie'})[k]);
  P(r.ok&&Pj.st==='fini'&&W.s.innov.done.includes('amatol')&&ok,'R3 trois étapes, trois bâtiments',`${r.ok?'':r.why} · ${Pj?.st} en ${t.toFixed(1)} h · ${Object.entries(seen).map(([k,s])=>k+' → '+[...s].join('/')).join(' · ')} · ${acc} accident(s) · ${Pj?.ev.length} évènements`);}

// R4 : pas de laboratoire
{const {W,C,cj,ci}=mk(9,{labo:false});const team=[savant(W,C,'medecine',30),savant(W,C,'medecine',30)];W.s.innov.ideas.push({id:'tourniquet',who:{name:'test'},t:0});
  const r=W.startProject('tourniquet',team.map(u=>u.id));const Pj=r.P;run(W,30);const w1=Pj.wait,ph1=Pj.phases[Pj.ph].k;const L=put(W,'labo',ci,cj);run(W,40);
  P(r.ok&&ph1==='experience'&&/laboratoire/.test(w1||'')&&Pj.st==='fini','R4 sans laboratoire, on attend ; bâti, on repart',`${r.ok?'':r.why} · après 30 h : étape ${ph1}, « ${w1} » · laboratoire bâti, 40 h plus tard : ${Pj.st}`);}

// R5 : remue-méninges, et la pratique ne trouve jamais une découverte savante
{let ok=0,bad=[];for(let k=0;k<10;k++){const {W,C}=mk(20+k);const L=[savant(W,C,'agro',60,['reveur','bavard']),savant(W,C,'geo',40),savant(W,C,'meca',40)];const n0=W.s.innov.ideas.length;
    const r=W.meet(C,'remue',L.map(u=>u.id));run(W,3);const neu=W.s.innov.ideas.slice(n0).filter(x=>x.src==='savant');if(r.ok&&neu.length)ok++;
    for(const x of neu){const I=INNOV.find(y=>y.id===x.id);const disc={bois:'agro',vivres:'agro',pierre:'geo',mine:'geo'}[I.dom]||({atelier:'meca',logistique:'meca',construction:'meca',armement:'meca'})[I.dom];
      if(!L.some(u=>u.sci.disc===disc)||!(I.needs||[]).every(n=>W.s.innov.done.includes(n)))bad.push(x.id);}}
  const W=new World(3,{assisted:true});const I=W.s.innov;let sciFromPractice=0;for(const d of Object.keys(I.next))I.next[d]=1;for(let k=0;k<300;k++){for(const d of ['bois','vivres','pierre','mine','atelier','soins','tir','chimie','construction','armement','logistique','defense'])I.prac[d]=1e6;I.clock=99;for(const d in I.next)I.next[d]=1;W.innovTick(2);for(const x of I.ideas){if(INNOV.find(y=>y.id===x.id)?.sci)sciFromPractice++;I.done.push(x.id);}I.ideas=[];}
  P(ok===10&&!bad.length&&sciFromPractice===0,'R5 le remue-méninges donne des idées ; la pratique jamais les savantes',`${ok}/10 réunions avec idée · hors discipline ou préalables manquants : ${bad.join(',')||'aucune'} · savantes venues de la pratique : ${sciFromPractice}`);}

// R6 : le point d'avancement lève le blocage
{let up=0;for(let k=0;k<20;k++){const {W,C}=mk(40+k);const L=[savant(W,C,'agro',40),savant(W,C,'agro',40)];W.s.innov.ideas.push({id:'panier',who:{name:'t'},t:0});const r=W.startProject('panier',L.map(u=>u.id));
    r.P.block={why:'essai',t:W.s.t};const m=W.meet(C,'point',L.map(u=>u.id),r.P.id);let t=0;while(C.meet&&t<5){W.update(.05);t+=.05;r.P.block??=null;}if(m.ok&&!r.P.block)up++;}
  P(up>=12,'R6 le point d’avancement débloque',`${up}/20`);}

// R7 : savants libres au bureau d'études et à l'usine chimique
{const {W,A,U}=mk(11);A.proto={id:'mle1',left:20};const l0=A.proto.left;run(W,4);const base=l0-A.proto.left;
  const {W:W2,A:A2,U:U2}=mk(11);savant(W2,A2,'meca',80);savant(W2,A2,'balist',80);A2.proto={id:'mle1',left:20};run(W2,4);const fast=20-A2.proto.left;
  const b0=W2.labBoost(U2);savant(W2,U2,'chimie',80);const b1=W2.labBoost(U2);
  P(fast>=base*1.5&&b1>b0,'R7 les savants libres pressent prototype et usine',`prototype : ${base.toFixed(2)} h d’avance en 4 h seuls, ${fast.toFixed(2)} h avec deux ingénieurs (×${(fast/base).toFixed(2)}) · usine chimique ×${b0.toFixed(2)} → ×${b1.toFixed(2)}`);}

// R8 : le centre détruit
{const {W,C}=mk(13);const L=[savant(W,C,'agro',30),savant(W,C,'geo',30),savant(W,C,'meca',30)];const r=W.trainSavant(C,'chimie');const st=r.u;let t=0;while(st.inLab!==C.id&&t<20){W.update(.1);t+=.1;}
  W.meet(C,'remue',L.map(u=>u.id));run(W,.3);W.collapse(C);run(W,.3);
  const out=L.filter(u=>W.s.units.includes(u)||u.hp<=0).length,stOk=st.k==='villageois'&&!st.sci&&W.s.units.includes(st);
  P(out===3&&stOk&&!C.meet&&!(C.staff||[]).length,'R8 le centre détruit : on évacue',`${out}/3 savants sortis ou morts sous les décombres · l’élève ${stOk?'redevenu villageois':'?'} · réunion ${C.meet?'encore là':'annulée'} · reste ${(C.staff||[]).length} dedans`);}

// R9 : sauvegarde et reprise en plein projet
{const {W,C}=mk(15);const L=[savant(W,C,'agro',40),savant(W,C,'agro',40)];W.s.innov.ideas.push({id:'assolement',who:{name:'t'},t:0});W.startProject('assolement',L.map(u=>u.id));run(W,4);
  const data=W.serialize();const W2=new World(1).restore(data);const C2=W2.s.buildings.find(b=>b.k==='centre_recherche');const P2=W2.s.research.projects[0];const inC=(C2.staff||[]).filter(u=>u.k==='savant').length+W2.s.units.filter(u=>u.k==='savant').length;
  let t=0;while(P2.st==='actif'&&t<80){W2.update(.1);t+=.1;}
  P(inC===2&&P2.st==='fini'&&W2.s.innov.done.includes('assolement'),'R9 sauvegarde et reprise',`${inC} savants retrouvés · projet ${P2.st} ${t.toFixed(1)} h après la reprise`);}

// R10 : la percée
{const {W}=mk(17);W.s.innov.done.push('scie');W.remod();const a=W.mod('gather_tree');W.s.research.boost.scie=1.5;W.remod();const b=W.mod('gather_tree');
  P(Math.abs(a-1.4)<1e-9&&Math.abs(b-1.6)<1e-9,'R10 la percée accroît l’effet de moitié',`scie : ×${a.toFixed(2)} → ×${b.toFixed(2)}`);}

// R12 : le regard neuf — un savant libre d'une autre discipline vient voir l'équipe bloquée ; le blocage saute plus vite (moyenne sur dix parties)
{const trial=(seed,withHelp)=>{const {W,C}=mk(60+seed);const L=[savant(W,C,'agro',40),savant(W,C,'agro',40)];if(withHelp)savant(W,C,'chimie',40);W.s.innov.ideas.push({id:'assolement',who:{name:'t'},t:0});
    const r=W.startProject('assolement',L.map(u=>u.id));r.P.block={why:'essai',t:W.s.t};let t=0,came=false;while(r.P.block&&t<60){W.update(.1);t+=.1;r.P.phases[0].done=0;if(W.savants().some(u=>u.sci.consult?.pid===r.P.id))came=true;}return {t,came};};
  const A=[],B=[];let came=0;for(let k=0;k<10;k++){A.push(trial(k,false).t);const b=trial(k,true);B.push(b.t);if(b.came)came++;}const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  P(avg(B)<avg(A)*.8&&came>=7,'R12 le regard neuf lève le blocage plus vite',`sans aide : ${avg(A).toFixed(1)} h en moyenne · avec un chimiste libre : ${avg(B).toFixed(1)} h (venu ${came}/10 fois)`);}

// R11 : trois jours, la recherche en marche
{const {W,C,L}=mk(19);let errs=0;const S=[savant(W,C,'agro',20,['reveur','bavard']),savant(W,C,'chimie',20,['audacieux','distrait']),savant(W,C,'medecine',20,['solitaire','insomniaque']),savant(W,C,'meca',90,['pedagogue','perfectionniste'])];
  W.trainSavant(C,'geo');W.trainSavant(C,'balist');let meets=0,proj=0;
  try{for(let h=0;h<72;h+=.1){W.update(.1);const free=W.savants().filter(u=>!u.sci.pid&&!u.sci.meet);const id=W.s.innov.ideas.find(x=>W.canStartProject(x.id,free.slice(0,2).map(u=>u.id)).ok);
      if(id&&free.length>=2){if(W.startProject(id.id,free.slice(0,2).map(u=>u.id)).ok)proj++;}
      else if(!C.meet&&free.length>=2&&W.meet(C,'remue',free.map(u=>u.id).slice(0,4)).ok)meets++;}}catch(e){errs++;console.log(e.stack);}
  const R=W.s.research;P(errs===0,'R11 trois jours sans exception',`${errs} erreur(s) · ${meets} remue-méninges · ${proj} projets lancés, ${R.projects.filter(P=>P.st==='fini').length} aboutis · ${W.savants().length} savants · carnet ${R.log.length} lignes`);
  console.log('  carnet (extraits) :');for(const l of R.log.slice(0,14).reverse())console.log('   ',`j${Math.floor(l.t/24)+1} ${String(Math.floor(l.t%24)).padStart(2,'0')}h`,l.where,'—',l.txt);}
console.log(fail?`ÉCHECS : ${fail}`:'TOUT PASSE');process.exit(fail?1:0);
