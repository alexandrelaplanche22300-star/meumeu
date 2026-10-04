// La recherche (V12.6, demande du joueur) — mélangé à World. Les savants meumeu : on les forme au centre de recherche à partir d'un villageois (son ancien
// métier lui laisse un savoir-faire), ils ont une discipline, deux traits de caractère, un grade qui monte avec l'expérience, un moral, une fatigue, et des
// affinités entre eux. Ils vivent DANS les bâtiments de recherche (b.staff, hors de la carte, comme les recrues d'une caserne) et n'en sortent que pour aller
// de l'un à l'autre, à pied, par les rues.
// Un projet mène une idée (celle d'un ouvrier, ou celle d'un savant) jusqu'à l'innovation, par étapes, chacune dans son bâtiment : la théorie au tableau
// noir du centre de recherche, les expériences à la paillasse du laboratoire, les plans à la planche du bureau d'études, l'essai à l'atelier pilote de
// l'usine chimique. L'équipe va d'un bâtiment à l'autre. En route : eurêkas, blocages, accidents, percées. Les réunions (remue-méninges, point
// d'avancement, colloque, séminaire) font naître des idées, débloquent, forment. Les savants libres pressent les prototypes du bureau d'études et la
// production de l'usine chimique ; les maîtres enseignent aux élèves.
import {BUILDINGS,INNOV,UNITS,DAY} from './data.js';
import {DISC,DOM_DISC,METIERS,PHASES,LAB_KIND,LAB_SEATS,DOM_PHASES,PHASE_SHARE,WORK_K,GRADES,gradeOf,TRAITS,TRAIT_KEYS,MEETINGS} from './researchdata.js';

const SCHOOL=4,STUDY_H=24,TICK=.1,IDEAS_MAX=10,LOG_MAX=240;
const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
// le produit des effets des traits d'un savant (k : la clé de l'effet, voir TRAITS)
const tr=(u,k)=>{let v=1;for(const t of u?.sci?.traits||[]){const x=TRAITS[t]?.[k];if(x!=null)v*=x;}return v;};
const has=(u,t)=>!!u?.sci?.traits?.includes(t);
const pairKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
// des traits qui ne vont pas ensemble
const CLASH=[['audacieux','prudent'],['bavard','solitaire'],['methodique','distrait']];
// les blocages, selon l'étape
const BLOCKS={theorie:['la démonstration ne tient pas','deux mesures se contredisent','il manque une hypothèse'],experience:['l’expérience ne se reproduit pas','les éprouvettes se fendent','les mesures dérivent'],
  conception:['la maquette casse au premier essai','les cotes ne tombent pas juste','le mécanisme se grippe'],pilote:['la cuve ne monte pas en température','le mélange tourne','le rendement s’effondre']};
// « un laboratoire », « au laboratoire »
export const ART={centre_recherche:'un centre de recherche',labo:'un laboratoire',armurerie:'un bureau d’études',poudrerie:'une usine chimique'};
export const AU={centre_recherche:'au centre de recherche',labo:'au laboratoire',armurerie:'au bureau d’études',poudrerie:'à l’usine chimique'};

export const RESEARCH={
  // ---------- où sont les savants ----------
  // les bâtiments de recherche bâtis et debout (les nôtres ; l'allié ne cherche pas)
  labs(){return this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ally&&LAB_KIND[b.k]&&b.done&&!b.ruin);},
  labKind(b){return LAB_KIND[b?.k]||null;},
  // tous ceux de la recherche : dans les bâtiments (b.staff) et dans les rues (u.sci) — élèves compris
  sciAll(){const L=[];for(const b of this.s.buildings)for(const u of b.staff||[])L.push(u);for(const u of this.s.units)if(u.sci&&u.hp>0)L.push(u);return L;},
  savants(){return this.sciAll().filter(u=>u.k==='savant');},
  sci(id){return this.sciMap?.get(id)||this.unit(id)||this.sciAll().find(u=>u.id===id)||null;},
  where(u){return u?.inLab!=null?this.building(u.inLab):null;},
  // les places : dix au centre (plus quatre bancs d'école), cinq au laboratoire, trois au bureau d'études et à l'usine chimique
  seatsUsed(b){return (b.staff||[]).filter(u=>u.k==='savant').length+this.s.units.filter(u=>u.task?.kind==='lab'&&u.task.b===b.id&&!u.task.study&&u.k==='savant').length;},
  seatsFree(b){return (LAB_SEATS[b.k]||0)-this.seatsUsed(b);},
  schoolUsed(b){return (b.staff||[]).filter(u=>u.k!=='savant').length+this.s.units.filter(u=>u.task?.kind==='lab'&&u.task.b===b.id&&u.task.study).length;},
  // le bâtiment d'un genre (étape) le plus proche de u qui a une place (celui où l'équipe est déjà, d'abord)
  labFor(kind,u,mates=[]){const L=this.labs().filter(b=>LAB_KIND[b.k]===kind);if(!L.length)return null;const x=u.x,y=u.y;
    const withMates=L.find(b=>mates.some(m=>m!==u&&this.where(m)===b)&&this.seatsFree(b)>0);if(withMates)return withMates;
    return L.filter(b=>this.seatsFree(b)>0||this.where(u)===b).sort((a,z)=>d2(a.i,a.j,x,y)-d2(z.i,z.j,x,y))[0]||null;},

  // ---------- entrer, sortir, marcher de l'un à l'autre ----------
  labEnter(u,b){const k=this.s.units.indexOf(u);if(k>=0)this.s.units.splice(k,1);this.uIndex.delete(u.id);if(u.sq)this.leave(u);(b.staff??=[]).push(u);u.inLab=b.id;u.task=null;u.path=null;u.carry=null;
    const [w,h]=this.sizeOf(b);u.x=b.i+w/2;u.y=b.j+h/2;u.anim='idle';if(u.sci){u.sci.idleW=0;}},
  labExit(u,b){const k=(b.staff||[]).indexOf(u);if(k>=0)b.staff.splice(k,1);u.inLab=null;const [w,h]=this.sizeOf(b);u.x=b.i+w/2+(this.rand()-.5)*Math.min(1.6,w-.4);u.y=b.j+h+.6;u.task=null;u.path=null;
    this.s.units.push(u);this.uIndex.set(u.id,u);},
  // envoyer un savant (ou un élève) à un bâtiment : il sort de celui où il est, et marche jusqu'à la porte de l'autre
  sendTo(u,b,extra={}){const from=this.where(u);if(from===b)return;if(from)this.labExit(u,from);u.task={kind:'lab',b:b.id,...extra};u.path=null;},
  // la marche (unitTick, tâche « lab ») : à la porte, on entre — s'il y a de la place ; sinon un autre bâtiment du même genre, ou l'on attend devant
  labWalkTick(u,T){const b=this.building(T.b);if(!b||!b.done||b.ruin){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h+.7,[b.i,b.j,w,h]))return;
    if(T.study){if((b.staff||[]).filter(x=>x.k!=='savant').length>=SCHOOL){u.anim='idle';return;}this.labEnter(u,b);return;}
    if((b.staff||[]).filter(x=>x.k==='savant').length>=(LAB_SEATS[b.k]||0)){const alt=this.labFor(LAB_KIND[b.k],u);if(alt&&alt!==b){T.b=alt.id;u.path=null;return;}u.anim='idle';return;}
    this.labEnter(u,b);},

  // ---------- l'école ----------
  // le métier d'un villageois, d'après ce qu'il fait (le domaine de pratique)
  jobDom(u){const T=u.task;if(!T)return u.jobDom||null;
    if(T.kind==='gather')return {tree:'bois',rock:'pierre',bush:'vivres',ore:'mine'}[T.type]||null;
    if(T.kind==='work'){const k=this.building(T.b)?.k;return {mine:'mine',moulin:'vivres',ferme:'vivres',grenier:'vivres',atelier:'atelier',four:'atelier',poudrerie:'chimie',arsenal:'armement',manufacture:'armement',fonderie:'armement',hopital:'soins',camp:'bois'}[k]||null;}
    if(T.kind==='build'||T.kind==='repair'||T.kind==='line')return 'construction';return null;},
  // les villageois qu'on peut envoyer à l'école pour une discipline : d'abord ceux dont le métier y mène (ils en gardent le savoir-faire), puis les oisifs, puis les plus proches
  schoolCands(b,disc){const city=this.cityOf(b);
    return this.s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois'&&u.hp>0&&u.h?.state!=='hors'&&!u.sci&&u.task?.kind!=='shelter'&&(!city||this.homeOf(u)===city))
      .map(u=>{const dom=this.jobDom(u);return {u,dom,metier:dom?METIERS[dom]:null,prat:!!dom&&DOM_DISC[dom]===disc};})
      .sort((a,z)=>Number(z.prat)-Number(a.prat)||Number(!!a.u.task)-Number(!!z.u.task)||d2(a.u.x,a.u.y,b.i,b.j)-d2(z.u.x,z.u.y,b.i,b.j));},
  canTrainSavant(b,disc,uid=null){const why=[];if(!b||b.k!=='centre_recherche'||!b.done||b.ruin)why.push('un centre de recherche bâti');if(!DISC[disc])why.push('une discipline');
    if(b&&this.schoolUsed(b)>=SCHOOL)why.push(`quatre élèves au plus (${SCHOOL} bancs)`);const D=UNITS.savant;
    const c=b&&(this.cityOf(b)||b);if(c?.k==='centre'&&(c.ration??1)<.5)why.push('la ville a faim : moins de la moitié des rations');
    const cand=b&&DISC[disc]?(uid!=null?this.schoolCands(b,disc).find(x=>x.u.id===uid):this.schoolCands(b,disc)[0]):null;if(b&&!cand)why.push('un villageois de la ville');
    if(b){const p=this.canPay('meumeu',b.i+2,b.j+2,D.cost);if(!p.ok)why.push('il manque : '+p.miss.join(', '));}return {ok:!why.length,why,cand};},
  trainSavant(b,disc,uid=null){const r=this.canTrainSavant(b,disc,uid);if(!r.ok)return r;const {u,metier,prat,dom}=r.cand;this.pay('meumeu',b.i+2,b.j+2,UNITS.savant.cost);
    if(u.sq)this.leave(u);u.carry=null;u.sci={disc,study:{left:STUDY_H,total:STUDY_H},metier,dom,prat};u.task={kind:'lab',b:b.id,study:disc};u.path=null;
    const txt=`${u.name} part à l’école : ${DISC[disc].who}${metier?`, ancien ${metier}${prat?' — il en garde le savoir-faire':''}`:''}.`;this.rlog(b,txt,'good',u);
    return {ok:true,text:txt,u};},
  // le maître du centre : un savant libre, gradé ou pédagogue, qui fait cours aux élèves ; l'école va jusqu'à deux fois plus vite
  teacherOf(b){let best=null,bv=0;for(const u of b.staff||[]){if(u.k!=='savant'||u.sci.pid||u.sci.meet||u.sci.pause>0)continue;const g=gradeOf(u.sci.xp);if(g<2&&!has(u,'pedagogue'))continue;
      const v=(.3+.15*g)*tr(u,'teach');if(v>bv){bv=v;best=u;}}return best?{u:best,k:1+bv}:null;},
  rollTraits(){const out=[];let n=0;while(out.length<2&&n++<40){const t=TRAIT_KEYS[Math.floor(this.rand()*TRAIT_KEYS.length)];if(out.includes(t)||CLASH.some(([a,c])=>(a===t&&out.includes(c))||(c===t&&out.includes(a))))continue;out.push(t);}return out;},
  graduate(u,b){const S=u.sci,traits=this.rollTraits();u.k='savant';u.sci={disc:S.disc,xp:S.prat?10:0,traits,prat:S.prat,metier:S.metier,dom:S.dom,mor:.8,fat:0,pid:null,born:this.s.t,papers:0,idleT:0};
    this.rlog(b,`${u.name} sort de l’école : ${DISC[S.disc].who} (${traits.map(t=>TRAITS[t].name.toLowerCase()).join(', ')})${S.prat?`, ancien ${S.metier}`:''}.`,'good',u);
    this.emit({type:'graduate',b:b.id,id:u.id});},

  // ---------- le carnet ----------
  rlog(b,txt,tone='info',u=null,big=false){const R=this.s.research;R.log.unshift({t:this.s.t,b:b?.id??null,where:b?BUILDINGS[b.k].name:'',txt,tone,who:u?.id??null});if(R.log.length>LOG_MAX)R.log.length=LOG_MAX;
    if(big||tone==='bad'||tone==='good')this.log(b?this.cityName(b):'Recherche',txt,tone);},

  // ---------- l'habileté, l'entente ----------
  // ce que vaut une heure de travail d'un savant sur une étape d'une discipline
  skill(u,disc,phase){const S=u?.sci;if(!S||u.k!=='savant')return 0;let k=GRADES[gradeOf(S.xp)].k*(S.disc===disc?1:.35);if(S.prat&&S.disc===disc)k*=1.25;k*=tr(u,'work');
    if(phase==='experience'||phase==='pilote')k*=tr(u,'exp');return k*(.55+.6*S.mor)*(1-.45*S.fat);},
  // l'entente de deux savants (−1 à 1) : ce que les réunions et les pauses en ont fait, sinon leurs caractères et leurs disciplines
  aff(a,b){const R=this.s.research,k=pairKey(a.id,b.id);if(R.aff[k]!=null)return R.aff[k];let v=((a.id*7919+b.id*104729)%997)/997*.4-.2;if(a.sci?.disc===b.sci?.disc)v+=.1;
    for(const t of [...(a.sci?.traits||[]),...(b.sci?.traits||[])])v+=TRAITS[t]?.aff||0;return Math.max(-1,Math.min(1,v));},
  affAdd(a,b,dv){const R=this.s.research;R.aff[pairKey(a.id,b.id)]=Math.max(-1,Math.min(1,this.aff(a,b)+dv));},
  synergy(L){if(L.length<2)return 1;let s=0,n=0;for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){s+=this.aff(L[i],L[j]);n++;}return 1+.12*(s/n);},
  // les savants libres d'un bâtiment (sans projet, ni réunion, ni pause) : ils pressent les prototypes du bureau d'études et la production de l'usine chimique
  freeHere(b){return (b.staff||[]).filter(u=>u.k==='savant'&&!u.sci.pid&&!u.sci.meet&&!(u.sci.pause>0));},
  protoRate(b){if(b.k!=='armurerie')return 1;let k=0;for(const u of this.freeHere(b))k+=Math.max(this.skill(u,'meca'),this.skill(u,'balist'));return 1+.5*k;},
  labBoost(b){if(b.k!=='poudrerie')return 1;let k=0;for(const u of this.freeHere(b))k+=this.skill(u,'chimie');return (1+.2*k)*this.mod('poudrerie');},

  // ---------- les idées des savants ----------
  // l'ordre des découvertes savantes dans cette partie : mêlé selon la graine, sans tirer au générateur (la suite aléatoire de la partie ne bouge pas)
  sciOrder(){const sd=this.s.seed|0,h=s=>{let x=sd^0x9e3779b9;for(let i=0;i<s.length;i++)x=Math.imul(x^s.charCodeAt(i),0x5bd1e995)>>>0;return x;};return INNOV.filter(x=>!this.s.innov.order.includes(x.id)).map(x=>x.id).sort((a,z)=>h(a)-h(z));},
  // une idée dans la discipline d'un savant : la prochaine que cette partie amène, dans un des domaines de sa discipline, dont les préalables sont acquis
  sciIdea(u,why='',b=null,disc=null){const I=this.s.innov;if(I.ideas.length>=IDEAS_MAX)return null;disc=disc||u.sci.disc;
    const busy=new Set([...I.done,...I.ideas.map(x=>x.id),...this.s.research.projects.filter(P=>P.st==='actif').map(P=>P.ref)]);
    const order=[...I.order,...this.sciOrder()];
    const ok=order.map(id=>INNOV.find(y=>y.id===id)).filter(d=>d&&DOM_DISC[d.dom]===disc&&!busy.has(d.id)&&(d.needs||[]).every(n=>I.done.includes(n)));
    if(!ok.length)return null;const sci=ok.filter(d=>d.sci);const X=(sci.length&&this.rand()<.6?sci:ok)[0];
    I.ideas.push({id:X.id,who:{name:u.name,k:u.k,id:u.id},t:this.s.t,src:'savant'});u.sci.bub={k:'idee',t:this.s.t};
    this.rlog(b||this.where(u),`${u.name} propose : ${X.name}${why?` (${why})`:''}.`,'good',u);this.emit({type:'idea',id:X.id,who:u.name});return X;},

  // ---------- les projets ----------
  canStartProject(ideaId,ids=[]){const why=[],I=INNOV.find(x=>x.id===ideaId),R=this.s.research;if(!I)return {ok:false,why:['idée inconnue']};
    if(!this.s.innov.ideas.some(x=>x.id===ideaId))why.push('cette idée n’est plus proposée');if(R.projects.some(P=>P.st==='actif'&&P.ref===ideaId))why.push('déjà en projet');
    const miss=(I.needs||[]).filter(n=>!this.s.innov.done.includes(n));if(miss.length)why.push('il faut d’abord : '+miss.map(n=>INNOV.find(y=>y.id===n)?.name||n).join(', '));
    const team=ids.map(id=>this.sci(id)).filter(u=>u&&u.k==='savant');if(!team.length)why.push('au moins un savant dans l’équipe');if(team.some(u=>u.sci.pid))why.push('un des savants est déjà sur un projet');
    const C=this.labs().find(b=>b.k==='centre_recherche');if(!C)why.push('un centre de recherche');
    if(C){const p=this.canPay('meumeu',C.i+2,C.j+2,I.cost);if(!p.ok)why.push('il manque : '+p.miss.join(', '));}
    return {ok:!why.length,why,I,team,C};},
  startProject(ideaId,ids,lead=null){const r=this.canStartProject(ideaId,ids);if(!r.ok)return r;const {I,team,C}=r,R=this.s.research;this.pay('meumeu',C.i+2,C.j+2,I.cost);
    const path=DOM_PHASES[I.dom]||['theorie','experience'],share=PHASE_SHARE[path.length],W=I.hours*WORK_K;const idea=this.s.innov.ideas.find(x=>x.id===ideaId);
    const L=lead!=null&&team.find(u=>u.id===lead)||team.slice().sort((a,z)=>z.sci.xp-a.sci.xp)[0];
    const P={id:R.nid++,ref:I.id,name:I.name,dom:I.dom,disc:DOM_DISC[I.dom],phases:path.map((k,n)=>({k,need:+(W*share[n]).toFixed(1),done:0})),ph:0,team:team.map(u=>u.id),lead:L.id,st:'actif',t0:this.s.t,
      block:null,wait:null,ev:[],from:idea?.who?.name||null,src:idea?.src||'pratique'};
    R.projects.push(P);this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==ideaId);for(const u of team){u.sci.pid=P.id;u.sci.idleT=0;}
    this.pev(P,`Projet lancé : ${team.length} savant${team.length>1?'s':''}, chef d’équipe ${L.name}.`,'good');
    this.rlog(C,`Projet lancé : ${I.name} — équipe de ${team.map(u=>u.name).join(', ')} (chef : ${L.name}).`,'good',L,true);return {ok:true,text:`Projet lancé : ${I.name}`,P};},
  pev(P,txt,tone='info'){P.ev.unshift({t:this.s.t,txt,tone});if(P.ev.length>30)P.ev.length=30;},
  project(pid){return this.s.research.projects.find(P=>P.id===pid)||null;},
  abandonProject(pid){const P=this.project(pid);if(!P||P.st!=='actif')return {ok:false,why:['pas de projet en cours']};P.st='abandon';P.t1=this.s.t;
    for(const id of P.team){const u=this.sci(id);if(u?.sci)u.sci.pid=null;}
    // l'idée revient dans les propositions (le travail fait est perdu, les ressources aussi)
    if(!this.s.innov.done.includes(P.ref))this.s.innov.ideas.push({id:P.ref,who:{name:P.from||'l’équipe'},t:this.s.t,src:P.src});
    this.rlog(null,`Projet abandonné : ${P.name}. L’idée retourne aux propositions.`,'bad');return {ok:true,text:`Projet abandonné : ${P.name}`};},
  // ajouter un savant libre à l'équipe d'un projet, ou l'en retirer (pid null)
  assignSavant(uid,pid){const u=this.sci(uid);if(!u||u.k!=='savant')return {ok:false,why:['savant inconnu']};
    if(pid==null){const P=u.sci.pid&&this.project(u.sci.pid);if(P){P.team=P.team.filter(id=>id!==uid);if(P.lead===uid)P.lead=P.team[0]??null;this.pev(P,`${u.name} quitte l’équipe.`);}u.sci.pid=null;return {ok:true,text:`${u.name} est libre.`};}
    const P=this.project(pid);if(!P||P.st!=='actif')return {ok:false,why:['pas de projet en cours']};if(u.sci.pid===pid)return {ok:true,text:''};
    if(u.sci.pid)this.assignSavant(uid,null);P.team.push(uid);u.sci.pid=pid;u.sci.idleT=0;if(P.lead==null)P.lead=uid;this.pev(P,`${u.name} rejoint l’équipe.`);return {ok:true,text:`${u.name} rejoint ${P.name}.`};},
  setLead(pid,uid){const P=this.project(pid);if(!P||!P.team.includes(uid))return {ok:false,why:['pas dans l’équipe']};P.lead=uid;const u=this.sci(uid);this.pev(P,`${u?.name} prend la tête de l’équipe.`);return {ok:true,text:`${u?.name} dirige ${P.name}.`};},
  // envoyer un savant libre dans un autre bâtiment de recherche (affectation)
  moveSavant(uid,bid){const u=this.sci(uid),b=this.building(bid);if(!u||!b||!LAB_KIND[b.k]||!b.done||b.ruin)return {ok:false,why:['bâtiment de recherche introuvable']};if(this.where(u)===b)return {ok:true,text:''};
    if(this.seatsFree(b)<=0)return {ok:false,why:['plus de place']};if(u.sci.pid)return {ok:false,why:['il est sur un projet : son équipe va où le projet la mène']};this.sendTo(u,b);return {ok:true,text:`${u.name} part ${AU[b.k]}.`};},
  // le travail qui reste (heures-savant), et une estimation à l'allure de l'équipe
  projectLeft(P){let w=0;for(let n=P.ph;n<P.phases.length;n++)w+=P.phases[n].need-P.phases[n].done;return Math.max(0,w);},
  projectEta(P){const team=P.team.map(id=>this.sci(id)).filter(Boolean);let r=0;for(const u of team)r+=this.skill(u,P.disc,P.phases[P.ph]?.k);r*=this.synergy(team)*this.mod('recherche');return r>0?this.projectLeft(P)/r:Infinity;},

  // ---------- les réunions ----------
  canMeet(b,type,ids,pid=null){const why=[],D=MEETINGS[type];if(!D)return {ok:false,why:['réunion inconnue']};if(!b||b.k!=='centre_recherche'||!b.done||b.ruin)why.push('la salle de réunion d’un centre de recherche');
    if(b?.meet)why.push('une réunion s’y tient déjà');const L=ids.map(id=>this.sci(id)).filter(u=>u&&u.k==='savant');if(L.length<D.min)why.push(`au moins ${D.min} savant${D.min>1?'s':''}`);
    if(L.some(u=>u.sci.meet))why.push('un des savants est déjà en réunion');if(L.length>8)why.push('huit chaises autour de la table');
    if(D.project){const P=this.project(pid);if(!P||P.st!=='actif')why.push('un projet en cours');else if(L.some(u=>!P.team.includes(u.id)))why.push('seulement l’équipe du projet');}
    if(type==='colloque'&&new Set(L.map(u=>u.sci.disc)).size<2)why.push('au moins deux disciplines');
    if(type==='seminaire'&&(!L.some(u=>gradeOf(u.sci.xp)>=2||has(u,'pedagogue'))||!L.some(u=>gradeOf(u.sci.xp)<=1)))why.push('un maître (chercheur confirmé ou pédagogue) et des jeunes');
    return {ok:!why.length,why,L,D};},
  meet(b,type,ids,pid=null){const r=this.canMeet(b,type,ids,pid);if(!r.ok)return r;b.meet={type,ids:r.L.map(u=>u.id),pid,left:r.D.hours,total:r.D.hours,t0:this.s.t,speaker:r.L.slice().sort((a,z)=>z.sci.xp-a.sci.xp)[0].id};
    for(const u of r.L){u.sci.meet=b.id;u.sci.pause=0;if(this.where(u)!==b)this.sendTo(u,b);}
    this.rlog(b,`${r.D.name} convoqué : ${r.L.map(u=>u.name).join(', ')}.`,'info');return {ok:true,text:`${r.D.name} : ${r.L.length} savants convoqués.`};},
  cancelMeet(b,why='annulée'){const M=b?.meet;if(!M)return;for(const id of M.ids){const u=this.sci(id);if(u?.sci&&u.sci.meet===b.id)u.sci.meet=null;}b.meet=null;this.rlog(b,`Réunion ${why}.`,'info');},
  endMeeting(b){const M=b.meet,D=MEETINGS[M.type],L=M.ids.map(id=>this.sci(id)).filter(u=>u&&u.k==='savant');const g=u=>gradeOf(u.sci.xp);const out=[];
    for(const u of L){u.sci.meet=null;u.sci.fat=Math.min(1,u.sci.fat+.04);}
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)this.affAdd(L[i],L[j],M.type==='colloque'?.07:.035);
    if(M.type==='remue'){let pts=0;for(const u of L)pts+=tr(u,'meet')*tr(u,'idea')*(.45+.2*g(u));let n=Math.min(3,Math.floor(pts*.55+this.rand()*1.2));
      const pool=L.slice().sort((a,z)=>tr(z,'idea')*this.rand()-tr(a,'idea')*this.rand());let got=0;for(const u of pool){if(got>=n)break;if(this.sciIdea(u,'remue-méninges',b))got++;}
      out.push(got?`${got} idée${got>1?'s':''} neuve${got>1?'s':''}`:'aucune idée neuve');}
    else if(M.type==='point'){const P=this.project(M.pid);if(P){const lead=this.sci(P.lead);const p=.7+.08*(lead?g(lead):0)+.05*L.reduce((a,u)=>a+tr(u,'meet')-1,0);
        if(P.block&&this.rand()<p){this.pev(P,`Point d’avancement : le blocage saute (${P.block.why}).`,'good');P.block=null;out.push('le blocage saute');}else if(P.block)out.push('le blocage tient encore');
        for(const u of L)u.sci.mor=Math.min(1,u.sci.mor+.12);if(lead)lead.sci.xp+=4;}}
    else if(M.type==='colloque'){const nd=new Set(L.map(u=>u.sci.disc)).size;for(const u of L)u.sci.xp+=3*(1+.1*nd)*tr(u,'meet');
      if(this.rand()<.35+.1*nd){const u=L[Math.floor(this.rand()*L.length)],o=L.find(x=>x.sci.disc!==u.sci.disc);if(this.sciIdea(u,`colloque, avec ${o?.name||'ses collègues'}`,b,o&&this.rand()<.5?o.sci.disc:null))out.push('une idée à la croisée des disciplines');}}
    else if(M.type==='seminaire'){const mas=L.filter(u=>g(u)>=2||has(u,'pedagogue')),jun=L.filter(u=>g(u)<=1&&!mas.includes(u));const k=mas.reduce((a,u)=>a+(g(u)+1)*tr(u,'teach'),0);
      for(const u of jun)u.sci.xp+=3*k/Math.max(1,Math.sqrt(jun.length));for(const u of mas)u.sci.xp+=1;out.push(`${jun.length} élève${jun.length>1?'s':''} formés`);}
    this.rlog(b,`${D.name} terminé${out.length?' : '+out.join(', '):''}.`,'good');b.meet=null;this.emit({type:'meetEnd',b:b.id,kind:M.type});},

  // ---------- les évènements ----------
  accident(P,b,here){const u=here[Math.floor(this.rand()*here.length)],ph=P.phases[P.ph];ph.done=Math.max(0,ph.done-ph.need*.15);
    b.hp=Math.max(b.max*.15,b.hp-b.max*(.05+.08*this.rand()));if(P.dom==='chimie'&&this.rand()<.3)b.fire=Math.max(b.fire||0,1);
    for(const x of here){x.sci.mor=Math.max(0,x.sci.mor-.2);x.sci.bub={k:'accident',t:this.s.t};}u.sci.fat=1;u.sci.mor=Math.max(0,u.sci.mor-.15);
    const what=P.dom==='chimie'?'une cornue explose':P.dom==='mine'||P.dom==='pierre'?'une charge d’essai part trop tôt':'un montage d’essai se rompt';
    this.pev(P,`Accident : ${what} (${u.name}). Le travail recule.`,'bad');this.rlog(b,`Accident ${AU[b.k]} : ${what} pendant « ${P.name} » — ${u.name} est sonné, l’équipe recule.`,'bad',u);
    const [w,h]=this.sizeOf(b);this.emit({type:'labboom',b:b.id,x:b.i+w/2,y:b.j+h/2,f:'meumeu',chem:P.dom==='chimie'});},
  eureka(P,here){const u=here.slice().sort((a,z)=>tr(z,'eur')*this.rand()-tr(a,'eur')*this.rand())[0],ph=P.phases[P.ph];ph.done=Math.min(ph.need,ph.done+ph.need*.22);
    u.sci.mor=Math.min(1,u.sci.mor+.15);u.sci.xp+=3;u.sci.bub={k:'eureka',t:this.s.t};for(const x of here)x.sci.mor=Math.min(1,x.sci.mor+.05);
    this.pev(P,`Eurêka ! ${u.name} trouve la clé de l’étape « ${PHASES[ph.k].name} ».`,'good');this.rlog(this.where(u),`Eurêka ! ${u.name} — ${P.name}.`,'good',u);this.emit({type:'eureka',b:this.where(u)?.id,id:u.id});},
  finishProject(P,b){const R=this.s.research,I=INNOV.find(x=>x.id===P.ref),team=P.team.map(id=>this.sci(id)).filter(Boolean),lead=this.sci(P.lead);P.st='fini';P.t1=this.s.t;
    const pc=.08+.05*(lead?gradeOf(lead.sci.xp):0)+(team.some(u=>has(u,'perfectionniste'))?.12:0);const perc=this.rand()<pc;if(perc)R.boost[P.ref]=1.5;
    if(!this.s.innov.done.includes(P.ref))this.s.innov.done.push(P.ref);this.remod();
    for(const u of team){u.sci.pid=null;u.sci.mor=Math.min(1,u.sci.mor+.2);u.sci.xp+=5;u.sci.papers=(u.sci.papers||0)+1;u.sci.bub={k:'fini',t:this.s.t};}
    this.pev(P,perc?`Percée ! L’innovation dépasse ce qu’on espérait : ses effets sont accrus de moitié.`:'Projet abouti.','good');
    this.rlog(b,`Innovation : ${I.name}${perc?' — une PERCÉE, ses effets accrus de moitié':''}. ${I.text}`,'good',lead,true);this.emit({type:'innov',id:I.id,perc});
    // la sérendipité : une idée d'une autre discipline, en passant
    if(team.length&&this.rand()<.15){const u=team[Math.floor(this.rand()*team.length)];const others=Object.keys(DISC).filter(d=>d!==u.sci.disc);this.sciIdea(u,'trouvée en chemin',b,others[Math.floor(this.rand()*others.length)]);}},

  // ---------- le pas de la recherche (toutes les 0,1 h de jeu) ----------
  researchTick(dt){this.resT=(this.resT||0)+dt;if(this.resT<TICK)return;const h=this.resT;this.resT=0;const R=this.s.research,s=this.s;
    const map=this.sciMap=new Map();for(const b of s.buildings)for(const u of b.staff||[])map.set(u.id,u);for(const u of s.units)if(u.sci&&u.hp>0)map.set(u.id,u);
    const hr=this.hour(),sleep=hr>=23||hr<6,labs=this.labs();for(const u of map.values())if(u.k==='savant')u.sci.act=null;
    // les élèves : l'école avance (plus vite avec un maître) ; les élèves dans la rue arrivent
    for(const b of labs){if(!b.staff?.some(u=>u.k!=='savant'))continue;const T=b.k==='centre_recherche'?this.teacherOf(b):null;
      for(const u of [...b.staff]){if(u.k==='savant')continue;u.sci.act='etude';u.sci.study.left-=h*(T?.k||1)*this.mod('formation');if(u.sci.study.left<=0)this.graduate(u,b);}
      if(T)T.u.sci.act='cours';}
    // les réunions : le temps ne court que quand assez de présents sont autour de la table
    for(const b of labs){const M=b.meet;if(!M)continue;const D=MEETINGS[M.type];const L=M.ids.map(id=>map.get(id)).filter(u=>u&&u.k==='savant');M.ids=L.map(u=>u.id);
      if(L.length<D.min){this.cancelMeet(b,'annulée : il n’y a plus assez de monde');continue;}
      for(const u of L){u.sci.meet=b.id;u.sci.pause=0;if(this.where(u)!==b&&u.task?.kind!=='lab')this.sendTo(u,b);}
      const here=L.filter(u=>this.where(u)===b);for(const u of here)u.sci.act='reunion';M.wait=here.length<L.length;if(here.length<D.min)continue;M.left-=h;if(M.left<=0)this.endMeeting(b);}
    for(const b of s.buildings)if(b.meet&&(!b.done||b.ruin))this.cancelMeet(b,'annulée : la salle est détruite');
    // les projets
    for(const P of R.projects){if(P.st!=='actif')continue;P.team=P.team.filter(id=>map.has(id));if(P.lead!=null&&!P.team.includes(P.lead))P.lead=P.team[0]??null;
      const ph=P.phases[P.ph],kind=ph.k,team=P.team.map(id=>map.get(id));if(!team.length){P.wait='plus personne dans l’équipe : ajoutez des savants';continue;}
      const kindLabs=labs.filter(b=>LAB_KIND[b.k]===kind);
      if(!kindLabs.length){P.wait=`il faut ${ART[PHASES[kind].at]} pour l’étape « ${PHASES[kind].name} »`;for(const u of team)if(!u.sci.meet)u.sci.act='attente';continue;}
      const here=[];for(const u of team){const b=this.where(u);if(u.sci.meet)continue;if(b&&LAB_KIND[b.k]===kind){if(!(u.sci.pause>0))here.push(u);continue;}
        if(u.task?.kind==='lab'){const tb=this.building(u.task.b);if(tb&&LAB_KIND[tb.k]===kind)continue;}
        const dst=this.labFor(kind,u,team);if(dst)this.sendTo(u,dst);else u.sci.act='attente';}
      if(!here.length){P.wait=team.some(u=>u.task?.kind==='lab')?'l’équipe est en chemin':team.every(u=>u.sci.meet)?'l’équipe est en réunion':'pas de place libre pour l’équipe';continue;}P.wait=null;
      const lead=map.get(P.lead),lg=lead?gradeOf(lead.sci.xp):0,rivals=R.projects.filter(Q=>Q!==P&&Q.st==='actif').map(Q=>map.get(Q.lead)).filter(Boolean);
      let rate=0;for(const u of here){let k=this.skill(u,P.disc,kind);const dozing=sleep&&!has(u,'insomniaque');if(dozing)k*=.3;
        if(team.length===1)k*=tr(u,'alone');if(team.length>=3)k*=tr(u,'chat');
        if(has(u,'ombrageux')&&rivals.some(o=>o!==u&&this.aff(u,o)<-.3))k*=tr(u,'rival');
        rate+=k;u.sci.act=dozing?'dort':'travail';u.sci.idleT=0;
        const junior=gradeOf(u.sci.xp)<=1&&here.some(m=>m!==u&&has(m,'pedagogue'));u.sci.xp+=h*(u.sci.disc===P.disc?1:.4)*(junior?1.5:1)*(dozing?.3:1);
        u.sci.fat=Math.min(1,u.sci.fat+(dozing?-.06:.03*tr(u,'fat'))*h);}
      rate*=this.synergy(here)*(1+.04*lg)*this.mod('recherche')*(P.block?.3:1);ph.done+=rate*h;
      // les évènements, à l'heure
      const nB=here.map(u=>this.where(u)).find(Boolean);
      if(this.rand()<h*.015*here.reduce((a,u)=>a+tr(u,'eur')*(1+.15*gradeOf(u.sci.xp)),0))this.eureka(P,here);
      if(!P.block&&this.rand()<h*.01*Math.min(2.5,ph.need/15)){const L=BLOCKS[kind];P.block={why:L[Math.floor(this.rand()*L.length)],t:s.t};for(const u of here)u.sci.bub={k:'bloque',t:s.t};this.pev(P,`Blocage : ${P.block.why}. Un point d’avancement en réunion aide à s’en sortir.`,'bad');}
      else if(P.block){
        // un regard neuf : un savant libre d'une autre discipline vient voir l'équipe bloquée, là où elle travaille ; sa présence aide le blocage à sauter
        const cons=[...map.values()].filter(u=>u.k==='savant'&&u.sci.consult?.pid===P.id),consHere=cons.filter(u=>this.where(u)===nB);for(const u of consHere)u.sci.act='consulte';
        if(!cons.length&&nB&&this.rand()<h*.2){const c=[...map.values()].filter(u=>u.k==='savant'&&!u.sci.pid&&!u.sci.meet&&!u.sci.consult&&u.sci.disc!==P.disc&&this.where(u)&&(this.where(u)===nB||this.seatsFree(nB)>0))
            .sort((a,z)=>d2(this.where(a).i,this.where(a).j,nB.i,nB.j)-d2(this.where(z).i,this.where(z).j,nB.i,nB.j))[0];
          if(c){c.sci.consult={pid:P.id,t:s.t};if(this.where(c)!==nB)this.sendTo(c,nB);this.pev(P,`${c.name}, ${DISC[c.sci.disc].who}, vient jeter un regard neuf.`);this.rlog(nB,`${c.name} (${DISC[c.sci.disc].who}) va voir l’équipe bloquée de « ${P.name} ».`,'info',c);}}
        if(this.rand()<h*(.025+(new Set(here.map(u=>u.sci.disc)).size>=2?.04:0)+(consHere.length?.08:0))){const c=consHere[0];
          this.pev(P,c?`Le regard neuf de ${c.name} fait sauter le blocage (${P.block.why}).`:`Le blocage saute de lui-même (${P.block.why}).`,'good');if(c){c.sci.xp+=2;for(const u of here)this.affAdd(u,c,.05);c.sci.bub={k:'idee',t:s.t};}P.block=null;}}
      if((kind==='experience'||kind==='pilote')&&nB){const danger=P.dom==='chimie'?3:P.dom==='mine'||P.dom==='pierre'?1.5:1;const acc=here.reduce((a,u)=>a+tr(u,'acc'),0)/here.length;if(this.rand()<h*.004*danger*acc)this.accident(P,nB,here);}
      if(ph.done>=ph.need){ph.done=ph.need;for(const u of here)u.sci.act='attente';if(P.ph+1<P.phases.length){P.ph++;const nx=PHASES[P.phases[P.ph].k];this.pev(P,`Étape « ${PHASES[kind].name} » terminée : l’équipe part ${nx.verb}.`,'good');
          this.rlog(nB,`${P.name} : la ${PHASES[kind].name.toLowerCase()} est faite, l’équipe passe ${nx.verb}.`,'info',lead);P.block=null;}
        else this.finishProject(P,nB);}}
    // les savants : moral, fatigue, pauses, oisiveté, idées du rêveur ; ceux qui traînent dans la rue rentrent
    for(const u of map.values()){if(u.k!=='savant')continue;const S=u.sci,b=this.where(u);
      if(S.consult){const Q=this.project(S.consult.pid);if(!Q||Q.st!=='actif'||!Q.block||S.pid||S.meet||s.t-S.consult.t>5)delete S.consult;}
      if(S.pause>0){S.pause-=h;S.act='pause';S.fat=Math.max(0,S.fat-.35*h);}
      if(!b)S.act='marche';
      else if(!S.act)S.act=sleep&&!has(u,'insomniaque')?'dort':!S.pid&&((b.k==='poudrerie'&&S.disc==='chimie')||(b.k==='armurerie'&&(S.disc==='meca'||S.disc==='balist')&&(b.proto||b.protoA)))?'affecte':S.pid?'attente':'oisif';
      if(S.act==='affecte')S.fat=Math.min(1,S.fat+.02*h*tr(u,'fat'));else if(S.act==='oisif'||S.act==='dort'||S.act==='attente')S.fat=Math.max(0,S.fat-.06*h);
      if(S.act==='oisif'){S.idleT=(S.idleT||0)+h;if(has(u,'reveur')&&this.rand()<h*.012)this.sciIdea(u,'rêvé à son bureau',b);}
      // la pause café (au centre, à deux c'est mieux : on s'entend mieux, et parfois une idée)
      if(b&&!S.meet&&!(S.pause>0)&&S.fat>.55&&(S.act==='travail'||S.act==='affecte'||S.act==='oisif')&&this.rand()<h*.6){S.pause=.5;S.act='pause';
        const mate=(b.staff||[]).find(x=>x!==u&&x.k==='savant'&&x.sci.pause>0);if(mate){this.affAdd(u,mate,.03);if(this.rand()<.06)this.sciIdea(u,`à la pause, avec ${mate.name}`,b);}}
      // le moral : il tend vers son niveau (plus bas si oisif longtemps, si la ville a faim ou est attaquée), plus vite chez l'optimiste
      const city=b?this.cityOf(b):null;let tgt=.72;if((S.idleT||0)>12)tgt-=.18;if(city&&(city.ration??1)<.5)tgt-=.15;if(city&&this.cityAttacked?.(city))tgt-=.2;
      const P=S.pid&&this.project(S.pid);if(P?.block)tgt-=.08;if(P)for(const id of P.team){const m=map.get(id);if(m&&m!==u&&has(m,'optimiste'))tgt+=.05;}
      S.mor+=(tgt-S.mor)*Math.min(1,h*.05*tr(u,'mor'));S.mor=Math.max(0,Math.min(1,S.mor));
      // dans la rue, sans rien à faire : il rentre au bâtiment de recherche le plus proche
      if(!b&&!u.task){S.idleW=(S.idleW||0)+h;if(S.idleW>.5){const L=labs.filter(x=>this.seatsFree(x)>0).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y));if(L[0])this.sendTo(u,L[0]);S.idleW=0;}}}
    // un élève resté dans la rue sans école (la sienne détruite) : il redevient villageois
    for(const u of map.values())if(u.k!=='savant'&&!this.where(u)&&u.task?.kind!=='lab'){delete u.sci;}},

  // ---------- un bâtiment de recherche détruit ----------
  // ceux qui sont dedans sortent en courant ; un sur cinq y reste. Les élèves retournent au village. La réunion est perdue.
  labCollapse(b){if(b.meet)this.cancelMeet(b,'annulée : la salle est détruite');const L=[...(b.staff||[])];if(!L.length)return;let dead=0;
    for(const u of L){this.labExit(u,b);if(u.k!=='savant'){delete u.sci;continue;}if(this.rand()<.2){dead++;if(u.h)u.h.cause='écrasé sous les décombres du '+BUILDINGS[b.k].name.toLowerCase();this.death(u);}}
    this.rlog(b,`${BUILDINGS[b.k].name} détruit : ${L.length} savant${L.length>1?'s':''} et élève${L.length>1?'s':''} évacués${dead?`, ${dead} mort${dead>1?'s':''} sous les décombres`:''}.`,'bad');},
};
