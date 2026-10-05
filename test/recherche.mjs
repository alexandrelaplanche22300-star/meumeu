// La recherche (V12.7) : les programmes nés des conceptions du joueur, l'état de l'art, les trois métiers, les réunions et leurs propositions, le
// commandement qui tranche, la conception déclarée terminée, les variantes ; les savants unités du monde ; le laboratoire de chimie.
// CRITÈRES (fixés avant de lancer) :
//   R1 l'école : un villageois envoyé à l'école de chaque métier y marche, y étudie 24 h, en sort savant de ce métier — et reste une unité du monde
//      (dans la liste des unités, posté dans le bâtiment)
//   R2 l'analyse : une conception déjà maîtrisée ne demande que le dossier et l'essai ; un obusier de 50 mm demande des tâches des trois sortes de
//      travail (ingénieur, chimiste — et physicien si la portée dépasse), chiffrées avec ses valeurs
//   R3 un programme entier : lancement (rassemblement, tour de table, propositions, débat, décision) avec au moins trois propositions de deux métiers ; le commandement en retient
//      une, la conception change et les tâches sont recalculées ; chaque métier travaille dans son bâtiment ; une revue à mi-chemin ; l'essai ; la revue
//      finale laisse la conception « prête » ; le commandement la déclare terminée : adoptée, et l'état de l'art avance
//   R4 sans le commandement : le lancement garde la conception, la conception prête est close par le chef de projet au bout d'un jour et demi
//   R5 le prévu et le mesuré : la réunion qui suit une proposition retenue compare ce que son auteur annonçait à ce qu'on a mesuré
//   R6 les variantes : après l'adoption, l'équipe étudie, une revue de variantes propose ; ce qui est retenu devient un prototype « Mk 2 » avec son
//      programme ; l'arme adoptée ne change pas
//   R7 un savant corrige un défaut par ses calculs : sur un fusil instable (Sg < 1), la piste « stabilité » d'un physicien, creusée pas à pas,
//      rend Sg ≥ 1,3
//   R8 les savants sont dans le monde : un obus qui éclate dans le centre de recherche en blesse
//   R9 le laboratoire de chimie fait la poudre et les explosifs ; les Meumeu ne peuvent plus bâtir d'usine chimique
//   R10 le centre détruit : on évacue ; les élèves redeviennent villageois
//   R11 sauvegarde et reprise en plein programme : il va jusqu'à l'adoption
//   R12 trois jours, décisions au hasard : aucune exception
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/recherche.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS,PRODUCTS}=await import('../js/data.js');
const {kitToP,derive}=await import('../js/ballistics.js');const {KIT_PRESETS}=await import('../js/kitdata.js');const T=await import('../js/techaxes.js');const {charge}=await import('../js/explosive.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const free=(W,k,ci,cj,r0=5,r1=30)=>{for(let r=r0;r<r1;r++)for(let a=0;a<40;a++){const i=Math.round(ci+Math.cos(a/40*6.283)*r),j=Math.round(cj+Math.sin(a/40*6.283)*r);if(W.canPlace('meumeu',k,i,j).ok)return [i,j];}return null;};
const put=(W,k,ci,cj)=>{const at=free(W,k,ci,cj);if(!at)throw new Error('pas de place pour '+k);return W.addBuilding('meumeu',k,at[0],at[1],true);};
const run=(W,h,each=null)=>{for(let t=0;t<h;t+=.05){W.update(.05);if(each&&each())return t;}return h;};
const mk=(seed=5)=>{const W=new World(seed,{assisted:true});W.s.fog=false;const [ci,cj]=W.G.capital;const cap=W.capital();
  Object.assign(cap.stock,{vivres:2000,pieces:600,bois:900,pierre:900,fer:400,salpetre:300,charbon:300,cuivre:150,sante:60,explosifs:40,plomb:100});
  const C=put(W,'centre_recherche',ci,cj),L=W.s.buildings.find(b=>b.k==='labo')||put(W,'labo',ci,cj),A=W.s.buildings.find(b=>b.k==='armurerie');return {W,C,L,A,ci,cj};};
// un savant tout fait, posté dans un bâtiment
const savant=(W,b,role,xp=30)=>{const u=W.addUnit('meumeu','villageois',b.i,b.j+5);u.k='savant';u.sci={role,xp,born:W.s.t,task:null,pid:null,papers:0};W.labEnter(u,b);return u;};
const team=(W,C,L,A,n=1)=>{const T=[];for(let k=0;k<n;k++){T.push(savant(W,A,'ingenieur',30),savant(W,L,'chimiste',30),savant(W,C,'physicien',80));}return T;};
const obusier50=()=>kitToP({...KIT_PRESETS.find(x=>x.id==='howitzer').design,caliberMm:50,massG:1100,barrelLengthCm:70});
// décide toute réunion qui attend : la première proposition (ou rien)
const autoDecide=(W,pick=[0])=>{for(const Pg of W.s.research.programs)if(Pg.meet?.phase==='decision')W.decide(Pg.id,pick);};

// R1 : l'école, trois métiers
{const {W,C}=mk();const L=[];for(const r of ['ingenieur','chimiste','physicien']){const x=W.trainSavant(C,r);L.push([r,x]);}
  run(W,30);const ok=L.every(([r,x])=>x.ok&&x.u.k==='savant'&&x.u.sci.role===r&&W.s.units.includes(x.u)&&x.u.inLab!=null);
  P(ok,'R1 l’école forme les trois métiers, dans le monde',L.map(([r,x])=>`${r} : ${x.ok?x.u.name+' '+x.u.k+(x.u.inLab!=null?' posté':' dehors'):x.why}`).join(' · '));}

// R2 : l'analyse
{const {W}=mk();const an0=W.analyzeDesign(W.design('mle1').p),an1=W.analyzeDesign(obusier50());const roles=new Set(an1.tasks.map(t=>t.role));
  P(an0.tasks.every(t=>t.ax==='dossier'||t.ax==='essai')&&roles.has('ingenieur')&&roles.has('chimiste')&&an1.tasks.some(t=>/50 mm|g de tolite|kJ/.test(t.label)),'R2 l’analyse découpe la conception en tâches chiffrées',
    `Mle 1 : ${an0.tasks.map(t=>t.ax).join(', ')} · obusier 50 : ${an1.tasks.map(t=>`[${t.role}] ${t.label}`).join(' · ')} — ${an1.work} h`);}

// R3 : un programme entier
{const {W,C,L,A}=mk(7);const S=team(W,C,L,A,1);const r=W.propose(A,'Obusier 50',obusier50());const Pg=W.s.research.programs.find(x=>x.kind==='arme');
  let t=run(W,6,()=>Pg.meet?.phase==='decision');const M=Pg.meet;const props=M?.props||[],cats=new Set(props.map(c=>c.role));const p0=JSON.stringify(Pg.p);const d=W.decide(Pg.id,[0]);const changed=JSON.stringify(Pg.p)!==p0;
  const where={};let rev=false,fin=false;const art0=W.s.research.art.calibre;
  run(W,160,()=>{for(const u of S){if(u.sci.act==='travail'){(where[u.sci.role]??=new Set()).add(W.where(u)?.k);}}if(Pg.meet?.type==='revue')rev=true;if(Pg.meet?.type==='finale')fin=true;autoDecide(W,[]);return Pg.st==='pret';});
  const ready=Pg.st==='pret';const a=W.adoptNow(Pg.id);const des=W.design(Pg.ref);
  const okW=['ingenieur','chimiste','physicien'].filter(k=>where[k]).every(k=>where[k].size===1&&[...where[k]][0]===({ingenieur:'armurerie',chimiste:'labo',physicien:'centre_recherche'})[k]);
  P(r.ok&&props.length>=3&&cats.size>=2&&d.ok&&changed&&okW&&rev&&fin&&ready&&a.ok&&des.status==='adopte'&&W.s.research.art.calibre>art0,'R3 un programme, du lancement à la conception déclarée terminée',
    `${r.ok?r.text:r.why} · décision au bout de ${t.toFixed(1)} h : ${props.length} propositions (${[...cats].join(', ')}) — retenu « ${props[0]?.title} », conception ${changed?'changée':'inchangée'} · travail : ${Object.entries(where).map(([k,s])=>k+' → '+[...s].join('/')).join(' · ')} · revue ${rev} · finale ${fin} · prête ${ready} · ${a.ok?a.text:a.why} · calibre maîtrisé ${art0} → ${W.s.research.art.calibre}`);
  console.log('  la réunion de lancement :');for(const l of M.script.slice(0,40))console.log(`    [${l.role}${l.by?' '+W.unit(l.by)?.name:''}] ${l.text}`);}

// R4 : sans le commandement
{const {W,C,L,A}=mk(9);team(W,C,L,A,1);W.propose(A,'Obusier 44',kitToP({...KIT_PRESETS.find(x=>x.id==='howitzer').design,caliberMm:44,massG:800}));const Pg=W.s.research.programs.at(-1);
  let st=[];const t=run(W,260,()=>{if(st.at(-1)!==Pg.st)st.push(Pg.st);return Pg.st==='fini'||Pg.st==='suivi';});
  P((Pg.st==='suivi'||Pg.st==='fini')&&W.design(Pg.ref).status==='adopte'&&st.includes('pret'),'R4 sans décision : on garde, puis le chef de projet clôt',`${st.join(' → ')} en ${t.toFixed(0)} h · ${Pg.ev.slice(0,3).map(e=>e.txt).join(' | ')}`);}

// R5 : le prévu et le mesuré
{const {W,C,L,A}=mk(11);team(W,C,L,A,1);W.propose(A,'Obusier 50',obusier50());const Pg=W.s.research.programs.at(-1);run(W,8,()=>Pg.meet?.phase==='decision');W.decide(Pg.id,[0]);
  run(W,160,()=>Pg.meet&&Pg.meet.type!=='lancement'&&Pg.meet.script.length>0);const line=(Pg.meet?.script||[]).find(l=>/annonçait|imprévu/.test(l.text));
  P(!!line,'R5 la réunion suivante compare le prévu au mesuré',line?line.text:'aucune ligne');}

// R6 : les variantes
{const {W,C,L,A}=mk(13);team(W,C,L,A,1);W.propose(A,'Obusier 44',kitToP({...KIT_PRESETS.find(x=>x.id==='howitzer').design,caliberMm:44,massG:800}));const Pg=W.s.research.programs.at(-1);
  run(W,220,()=>{autoDecide(W,[]);if(Pg.st==='pret')W.adoptNow(Pg.id);return Pg.st==='suivi';});const p0=JSON.stringify(W.design(Pg.ref).p);
  const t=run(W,80,()=>Pg.meet?.type==='variante'&&Pg.meet.phase==='decision');const n=Pg.meet?.props.length||0;const r=Pg.meet?W.decide(Pg.id,[0]):{ok:false,text:'pas de revue'};if(Pg.meet)W.closeMeeting(Pg.id);
  const V=W.s.research.programs.find(x=>x.parent===Pg.id);const dv=V&&W.design(V.ref);
  P(Pg.st!=='actif'&&n>0&&r.ok&&V&&/Mk 2/.test(V.name)&&dv?.status==='prototype'&&JSON.stringify(W.design(Pg.ref).p)===p0&&W.design(Pg.ref).status==='adopte','R6 les variantes deviennent un prototype Mk 2',
    `revue de variantes au bout de ${t.toFixed(0)} h, ${n} propositions · ${r.text} · ${V?V.name+', '+V.tasks.length+' tâches, '+V.st:'pas de variante'} · l’arme adoptée ${JSON.stringify(W.design(Pg.ref).p)===p0?'inchangée':'CHANGÉE'}`);}

// R7 : un physicien corrige un fusil instable par ses calculs
{const {W}=mk();const p={...W.design('mle1').p,twist:110,l:8,L:120};const D=derive(p);const def=T.defectsSeen('physicien',D).find(d=>d.goal==='Sg');
  const L=T.newLead({id:1,pid:1,owner:1,role:'physicien',goal:'Sg',origin:'defaut',t:0,why:def?.why});let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<16&&(L.st==='exploration'||L.st==='mure');i++)T.thinkStep(L,p,{rnd,grade:3,lab:true});const D1=derive(T.applyEdit(p,L.edits));
  P(D.Sg<1&&!!def&&D1.Sg>=1.3,'R7 un physicien corrige un fusil instable par ses calculs',`vu : ${def?.why} · « ${T.ideaTitle(L,p)} » → Sg ${D1.Sg.toFixed(2)} en ${L.steps} essais · ${L.notes.slice(0,2).join(' / ')}`);}

// R8 : les savants sont dans le monde
{let hurt=0,tries=0;for(let k=0;k<6;k++){const {W,C}=mk(20+k);const S=[];for(let n=0;n<4;n++)S.push(savant(W,C,'physicien',30));const [w,h]=W.sizeOf(C);
    W.heBlast(C.i+w/2,C.j+h/2,charge(400,900,{fill:'tolite'}),'beee',null,{});run(W,.2);tries++;if(S.some(u=>u.hp<=0||(u.h&&u.h.state!=='ok')))hurt++;}
  P(hurt>=4,'R8 un obus dans le centre blesse ses savants',`${hurt}/${tries} explosions ont touché des savants`);}

// R9 : le laboratoire de chimie
{const {W,L,ci,cj}=mk();const pr=W.productsOf(L);const can=W.canPlace('meumeu','poudrerie',...free(W,'camp',ci,cj));
  P(pr.includes('poudre')&&pr.includes('explosifs')&&!can.ok,'R9 le laboratoire de chimie produit ; plus d’usine chimique meumeu',`productions : ${pr.join(', ')} · usine chimique : ${can.ok?'permise':can.why.join(', ')}`);}

// R10 : le centre détruit
{const {W,C}=mk(15);const S=[savant(W,C,'physicien',30),savant(W,C,'physicien',30),savant(W,C,'physicien',30)];const r=W.trainSavant(C,'chimiste');run(W,4,()=>r.u.inLab===C.id);W.collapse(C);run(W,.3);
  const out=S.filter(u=>u.inLab==null).length;P(out===3&&r.u.k==='villageois'&&!r.u.sci,'R10 le centre détruit : on évacue',`${out}/3 savants dehors (${S.filter(u=>u.hp<=0).length} morts) · l’élève ${r.u.sci?'encore élève':'redevenu villageois'}`);}

// R11 : sauvegarde et reprise
{const {W,C,L,A}=mk(17);team(W,C,L,A,1);W.propose(A,'Obusier 44',kitToP({...KIT_PRESETS.find(x=>x.id==='howitzer').design,caliberMm:44,massG:800}));run(W,10,()=>{autoDecide(W,[0]);return false;});
  const W2=new World(1).restore(W.serialize());const Pg=W2.s.research.programs.at(-1);const t=run(W2,220,()=>{autoDecide(W2,[]);if(Pg.st==='pret')W2.adoptNow(Pg.id);return Pg.st==='suivi'||Pg.st==='fini';});
  P(W2.design(Pg.ref).status==='adopte'&&W2.savants().length===3,'R11 sauvegarde et reprise en plein programme',`${Pg.name} adopté ${t.toFixed(0)} h après la reprise · ${W2.savants().length} savants retrouvés`);}

// R12 : trois jours au hasard
{const {W,C,L,A}=mk(19);team(W,C,L,A,2);let errs=0,launched=0;const R=()=>W.rand();
  try{run(W,72,()=>{for(const Pg of W.s.research.programs){if(Pg.meet?.phase==='decision'&&R()<.05)W.decide(Pg.id,Pg.meet.props.map((_,i)=>i).filter(()=>R()<.4));if(Pg.st==='pret'&&R()<.05)W.adoptNow(Pg.id);}
    if(!W.activePrograms().some(x=>x.kind==='arme')&&R()<.02){const p=JSON.parse(JSON.stringify(W.design('mle1').p));p.c*=1+R()*.3;p.L*=1+R()*.4;if(W.propose(A,'Fusil '+(++launched),p).ok){}}
    const id=W.s.innov.ideas[0]?.id;if(id&&R()<.01)W.launchIdea(id);return false;});}catch(e){errs++;console.log(e.stack);}
  const Rr=W.s.research;P(errs===0,'R12 trois jours sans exception',`${errs} erreur(s) · ${Rr.programs.length} programmes (${Rr.programs.map(x=>x.name+' '+x.st).join(', ')}) · carnet ${Rr.log.length} lignes`);
  console.log('  carnet (extraits) :');for(const l of Rr.log.slice(0,12).reverse())console.log('   ',`j${Math.floor(l.t/24)+1} ${String(Math.floor(l.t%24)).padStart(2,'0')}h`,l.where,'—',l.txt);}
console.log(fail?`ÉCHECS : ${fail}`:'TOUT PASSE');process.exit(fail?1:0);
