// La recherche (V12.7) — mélangé à World. La recherche, c'est le développement des CONCEPTIONS DU JOUEUR, par de vrais chercheurs.
// Une conception lancée au bureau d'études devient un PROGRAMME : analysée contre l'état de l'art (techaxes.js), elle se découpe en TÂCHES chiffrées
// avec ses propres valeurs, chacune pour un métier (ingénieur au bureau d'études, chimiste au laboratoire de chimie, physicien au centre de recherche).
// Les savants sont de vraies unités du monde : ils marchent d'un bâtiment à l'autre, y travaillent (u.inLab), l'ennemi les voit, les obus les blessent.
// ILS PENSENT : chacun tient un carnet de PISTES sur le programme qu'il sert (techaxes : un défaut vu par son métier, une directive, l'idée d'un
// collègue, une intuition, raisonnable ou radicale) et les creuse pas à pas sur la vraie balistique du concepteur — plus vite à son poste, où il vérifie.
// Une piste mûre se présente en RÉUNION. Une réunion se tient par PHASES : le tour de table (l'avancement, le prévu et le mesuré), les propositions
// (chacun refait ses calculs au tableau), le débat (objections, soutiens, compromis, calculs des combinaisons), puis la DÉCISION du commandement — le
// joueur — par VAGUES : ce qu'il retient s'applique aussitôt à la conception, les propositions restantes sont recalculées ou tombent, d'autres naissent
// de la nouvelle conception ; jusqu'à trois vagues. De retour à leur poste, les savants refont leurs pistes sur la conception nouvelle.
// Le commandement oriente aussi par des DIRECTIVES (un but prioritaire, un levier auquel on ne touche pas). Une tâche finie fait avancer l'état de
// l'art. Une conception adoptée se fabrique ; l'équipe peut continuer sur des variantes, qui deviennent des prototypes (Mk 2, Mk 3…).
// Les idées des ouvriers (la pratique) et les protections du concepteur deviennent de petits programmes, sans réunion.
import {BUILDINGS,INNOV,UNITS} from './data.js';
import {derive} from './ballistics.js';
import {deriveArmor} from './armor.js';
import {LAB_KIND,LAB_SEATS,DOM_ROLE,GRADES,gradeOf,MEETINGS,BLOCKS} from './researchdata.js';
import {ROLES,GOALS,EYES,PARAMS,descEdit,analyze,artPush,applyEdit,presentLines,progressLines,effects,fxTxt,newLead,thinkStep,burst,defectsSeen,goalsFor,rebaseLead,ideaTitle,proposalOf,debate,merge,conflictOf,keysOf,leverOfEdit} from './techaxes.js';

const SCHOOL=4,STUDY_H=24,TICK=.1,LOG_MAX=300,BASE_STAFF=.35,CHAIRS=8,LEADS_MAX=60,WAVES=3;
// combien de pas de réflexion par heure : libre à son poste, à son poste pendant une tâche, en marchant ; la nuit ; l'équipe d'un bureau sans ingénieur
const THINK={free:1.2,task:.6,walk:.35,night:.15,bureau:.45};
const LIVE=new Set(['exploration','mure']);
const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clone=o=>JSON.parse(JSON.stringify(o));
const CHEM_AX=new Set(['charge','explosif','remplissage','moteur']);
// ce qu'un écart mesuré donne à chercher (un collègue qui voit sa conséquence cherche à la compenser)
const FX_GOAL={range:'range',v0:'range',moa:'moa',Sg:'Sg',rk:'rk',P:'P',life:'life',mass:'mass',lethal:'lethal',blast:'lethal',pen:'pen',sustain:'sustain',jam:'jam',cost:'cost'};
const short=t=>t.replace(/^(Refonte — )?Pour [^:]+: /,'');
const cap1=t=>t.charAt(0).toUpperCase()+t.slice(1);
// deux propositions qui disent la même chose (mêmes champs, valeurs à 12 % près)
const sameIdea=(a,b)=>a.edits.length===b.edits.length&&a.edits.every(e=>{const o=b.edits.find(x=>x[0]===e[0]);return o&&(typeof e[1]==='number'&&typeof o[1]==='number'?Math.abs(e[1]-o[1])<=Math.abs(e[1])*.12+1e-6:e[1]===o[1]);});
const leadIds=c=>[...new Set([c.lead,...(c.leads||[]),...(c.from||[])].filter(x=>x>0))];
export const AU={centre_recherche:'au centre de recherche',labo:'au laboratoire de chimie',armurerie:'au bureau d’études'};
export const ART={centre_recherche:'un centre de recherche',labo:'un laboratoire de chimie',armurerie:'un bureau d’études'};

export const RESEARCH={
  // ---------- où sont les savants ----------
  labs(){return this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ally&&LAB_KIND[b.k]&&b.done&&!b.ruin);},
  sciUnits(){return this.s.units.filter(u=>u.sci&&u.f==='meumeu'&&u.hp>0);},
  savants(){return this.s.units.filter(u=>u.k==='savant'&&u.f==='meumeu'&&u.hp>0);},
  sci(id){return this.unit(id);},
  where(u){return u?.inLab!=null?this.building(u.inLab):null;},
  seatsUsed(b){return this.s.units.filter(u=>u.k==='savant'&&(u.inLab===b.id||(u.task?.kind==='lab'&&u.task.b===b.id&&!u.task.meet))).length;},
  seatsFree(b){return (LAB_SEATS[b.k]||0)-this.seatsUsed(b);},
  schoolUsed(b){return this.s.units.filter(u=>u.k!=='savant'&&u.sci&&(u.inLab===b.id||(u.task?.kind==='lab'&&u.task.b===b.id))).length;},
  // le bâtiment où travaille un métier : près de x, y, avec une place (celui où il est déjà, d'abord ; pref : celui qu'on préfère)
  labFor(role,x,y,u=null,pref=null){const k=ROLES[role].at;const L=this.labs().filter(b=>b.k===k);if(!L.length)return null;if(pref&&L.includes(pref)&&(this.where(u)===pref||this.seatsFree(pref)>0))return pref;
    if(u&&L.includes(this.where(u)))return this.where(u);return L.filter(b=>this.seatsFree(b)>0).sort((a,z)=>d2(a.i,a.j,x,y)-d2(z.i,z.j,x,y))[0]||null;},

  // ---------- entrer, sortir, marcher de l'un à l'autre (dans les rues : on les voit, on peut les tuer) ----------
  labEnter(u,b){if(u.sq)this.leave(u);u.inLab=b.id;u.task={kind:'labwork',b:b.id};u.path=null;u.carry=null;const [w,h]=this.sizeOf(b);u.x=b.i+w/2+(this.rand()-.5)*.8;u.y=b.j+h/2+(this.rand()-.5)*.8;u.anim='idle';},
  labExit(u,b){u.inLab=null;if(u.sci&&u.k==='savant')u.sci.act='marche';const [w,h]=this.sizeOf(b);u.x=b.i+w/2+(this.rand()-.5)*Math.min(1.6,w-.4);u.y=b.j+h+.6;u.task=null;u.path=null;},
  sendTo(u,b,extra={}){const from=this.where(u);if(from===b&&!extra.study)return;if(from)this.labExit(u,from);u.task={kind:'lab',b:b.id,...extra};u.path=null;},
  // la marche (unitTick, tâche « lab ») : à la porte, on entre — s'il y a de la place (une réunion ne compte pas)
  labWalkTick(u,T){const b=this.building(T.b);if(!b||!b.done||b.ruin){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h+.7,[b.i,b.j,w,h]))return;
    if(T.study){if(this.s.units.filter(x=>x!==u&&x.sci&&x.k!=='savant'&&x.inLab===b.id).length>=SCHOOL){u.anim='idle';return;}this.labEnter(u,b);return;}
    if(!T.meet&&u.k==='savant'&&this.s.units.filter(x=>x!==u&&x.k==='savant'&&x.inLab===b.id).length>=(LAB_SEATS[b.k]||0)){const alt=this.labFor(u.sci.role,u.x,u.y);if(alt&&alt!==b){T.b=alt.id;u.path=null;return;}u.anim='idle';return;}
    this.labEnter(u,b);},
  // dedans : on y reste (la vue recherche les montre à leur poste) ; le bâtiment tombé, on est dehors
  labWorkTick(u,T){const b=this.building(T.b);if(!b||!b.done||b.ruin){u.inLab=null;u.task=null;return;}u.anim='idle';},

  // ---------- l'école ----------
  schoolCands(b){const city=this.cityOf(b);
    return this.s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois'&&u.hp>0&&u.h?.state!=='hors'&&!u.sci&&u.task?.kind!=='shelter'&&(!city||this.homeOf(u)===city))
      .sort((a,z)=>Number(!!a.task)-Number(!!z.task)||d2(a.x,a.y,b.i,b.j)-d2(z.x,z.y,b.i,b.j));},
  canTrainSavant(b,role,uid=null){const why=[];if(!b||b.k!=='centre_recherche'||!b.done||b.ruin)why.push('un centre de recherche bâti');if(!ROLES[role])why.push('un métier');
    if(b&&this.schoolUsed(b)>=SCHOOL)why.push(`quatre élèves au plus (${SCHOOL} bancs)`);const c=b&&(this.cityOf(b)||b);if(c?.k==='centre'&&(c.ration??1)<.5)why.push('la ville a faim : moins de la moitié des rations');
    const cand=b?(uid!=null?this.schoolCands(b).find(u=>u.id===uid):this.schoolCands(b)[0]):null;if(b&&!cand)why.push('un villageois de la ville');
    if(b){const p=this.canPay('meumeu',b.i+2,b.j+2,UNITS.savant.cost);if(!p.ok)why.push('il manque : '+p.miss.join(', '));}return {ok:!why.length,why,cand};},
  trainSavant(b,role,uid=null){const r=this.canTrainSavant(b,role,uid);if(!r.ok)return r;const u=r.cand;this.pay('meumeu',b.i+2,b.j+2,UNITS.savant.cost);
    if(u.sq)this.leave(u);u.carry=null;u.sci={role,study:{left:STUDY_H,total:STUDY_H}};this.sendTo(u,b,{study:role});
    const txt=`${u.name} part à l’école : ${ROLES[role].name.toLowerCase()}.`;this.rlog(b,txt,'good',u);return {ok:true,text:txt,u};},
  // le maître du centre : un savant gradé (chercheur confirmé et plus), sans tâche, au centre — l'école va plus vite
  teacherOf(b){let best=null,bv=0;for(const u of this.s.units){if(u.k!=='savant'||u.inLab!==b.id||u.sci.task||u.sci.meet)continue;const g=gradeOf(u.sci.xp);if(g<2)continue;const v=.3+.15*g;if(v>bv){bv=v;best=u;}}return best?{u:best,k:1+bv}:null;},
  // bold : son audace (la part de ses pistes qui sont des refontes radicales)
  graduate(u,b){const role=u.sci.role;u.k='savant';u.sci={role,xp:0,born:this.s.t,task:null,pid:null,papers:0,bold:+this.rand().toFixed(2)};
    this.rlog(b,`${u.name} sort de l’école : ${ROLES[role].name.toLowerCase()}.`,'good',u);this.emit({type:'graduate',b:b.id,id:u.id});},

  // ---------- le carnet ----------
  rlog(b,txt,tone='info',u=null,big=false){const R=this.s.research;R.log.unshift({t:this.s.t,b:b?.id??null,where:b?BUILDINGS[b.k].name:'',txt,tone,who:u?.id??null});if(R.log.length>LOG_MAX)R.log.length=LOG_MAX;
    if(big||tone==='bad'||tone==='good')this.log(b?this.cityName(b):'Recherche',txt,tone);},
  skill(u){return u?.sci&&u.k==='savant'?GRADES[gradeOf(u.sci.xp)].k:0;},

  // ---------- les programmes ----------
  program(pid){return this.s.research.programs.find(P=>P.id===pid)||null;},
  activePrograms(){return this.s.research.programs.filter(P=>P.st==='lancement'||P.st==='actif');},
  analyzeDesign(p){return analyze(p,this.s.research.art);},
  // ce que la conception du joueur demande, avant de la lancer (le concepteur l'affiche)
  programPreview(p){const an=this.analyzeDesign(p);return {work:an.work,nov:an.nov,tasks:an.tasks.map(t=>({role:t.role,label:t.label,gap:t.gap,work:t.work,n:t.n}))};},
  // une conception lancée au bureau d'études (world.propose) : le programme, et sa réunion de lancement
  launchProgram(b,d){const R=this.s.research,an=this.analyzeDesign(d.p);
    const P={id:R.nid++,kind:'arme',ref:d.id,name:d.name,b0:b.id,st:'lancement',t0:this.s.t,p:clone(d.p),tasks:an.tasks.map((t,i)=>({...t,i,done:0,ids:[]})),ev:[],applied:[],meetings:[],team:[],leads:[],lid:1,dir:{prio:{},frozen:[]},lastMeet:null};
    R.programs.push(P);this.pev(P,`Programme lancé : ${P.tasks.length} tâches, ${Math.round(an.work)} heures-savants${an.nov>0?`, ${P.tasks.filter(t=>t.n>0).length} au-delà de l’état de l’art`:''}.`,'good');
    this.rlog(b,`Programme « ${d.name} » : ${P.tasks.length} tâches, ${Math.round(an.work)} heures-savants.`,'good',null,true);this.assignAll(P,true);this.callMeeting(P,'lancement');return P;},
  launchIdea(id){const I=INNOV.find(x=>x.id===id),R=this.s.research;if(!I)return {ok:false,why:['idée inconnue']};if(!this.s.innov.ideas.some(x=>x.id===id))return {ok:false,why:['cette idée n’est plus proposée']};
    if(R.programs.some(P=>(P.st==='actif'||P.st==='lancement')&&P.kind==='idee'&&P.ref===id))return {ok:false,why:['déjà en programme']};const miss=(I.needs||[]).filter(n=>!this.s.innov.done.includes(n));if(miss.length)return {ok:false,why:['il faut d’abord : '+miss.map(n=>INNOV.find(y=>y.id===n)?.name||n).join(', ')]};
    const role=DOM_ROLE[I.dom]||'ingenieur',b=this.labs().find(x=>x.k===ROLES[role].at)||this.labs()[0];if(!b)return {ok:false,why:['un bâtiment de recherche']};
    const p=this.canPay('meumeu',b.i+1,b.j+1,I.cost);if(!p.ok)return {ok:false,why:['il manque : '+p.miss.join(', ')]};this.pay('meumeu',b.i+1,b.j+1,I.cost);
    const P={id:R.nid++,kind:'idee',ref:id,name:I.name,b0:b.id,st:'actif',t0:this.s.t,tasks:[{i:0,ax:'idee',role,label:I.name,gap:I.text,v:0,a:null,n:.3,work:+(I.hours*1.4).toFixed(1),done:0,ids:[]}],ev:[],applied:[],meetings:[],team:[]};
    R.programs.push(P);this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==id);this.rlog(b,`Petit programme : ${I.name} (${ROLES[role].plural}).`,'good');return {ok:true,text:`Programme lancé : ${I.name}`,P};},
  launchArmor(b,a){const R=this.s.research,D=deriveArmor(a.a);const mats=[...new Set(Object.values(a.a||{}).map(z=>z?.[0]).filter(Boolean))];const chem=mats.some(m=>['composite','ceramique','soie'].includes(m));
    const P={id:R.nid++,kind:'protection',ref:a.id,name:a.name,b0:b.id,st:'actif',t0:this.s.t,ev:[],applied:[],meetings:[],team:[],
      tasks:[{i:0,ax:'materiau',role:chem?'chimiste':'ingenieur',label:`Plaques : ${mats.join(', ')||'acier'}, ${Math.round(D.mass*1000)} g`,gap:'',v:0,a:null,n:chem?.6:.2,work:chem?8:5,done:0,ids:[]},
        {i:1,ax:'essai',role:'ingenieur',label:'Essai : tirs sur plaques',gap:'',v:0,a:null,n:0,work:3,done:0,ids:[],after:true}]};
    R.programs.push(P);this.rlog(b,`Programme de protection : ${a.name}.`,'good');return P;},
  pev(P,txt,tone='info'){P.ev.unshift({t:this.s.t,txt,tone});if(P.ev.length>40)P.ev.length=40;},
  abandonProgram(pid){const P=this.program(pid);if(!P||(P.st!=='actif'&&P.st!=='lancement'))return {ok:false,why:['pas de programme en cours']};if(P.meet)this.closeMeet(P);P.st='abandon';P.t1=this.s.t;this.release(P);
    if(P.kind==='arme'){const d=this.design(P.ref);if(d)d.status='perdu';}if(P.kind==='protection'){const a=this.s.armors[P.ref];if(a)a.status='perdu';}
    if(P.kind==='idee'&&!this.s.innov.done.includes(P.ref))this.s.innov.ideas.push({id:P.ref,who:{name:'l’équipe'},t:this.s.t});
    this.rlog(this.building(P.b0),`Programme abandonné : ${P.name}.`,'bad');return {ok:true,text:`Programme abandonné : ${P.name}`};},
  release(P){for(const u of this.savants())if(u.sci.pid===P.id){u.sci.task=null;u.sci.pid=null;if(u.sci.meet===P.id)u.sci.meet=null;}for(const t of P.tasks)t.ids=[];},
  // l'équipe d'une tâche : les savants de son métier, libres ; au plus trois pour une grosse tâche (au lancement : on désigne déjà l'équipe)
  assignAll(P,all=false){const free=role=>this.savants().filter(u=>u.sci.role===role&&!u.sci.task&&!(u.sci.meet&&u.sci.meet!==P.id));
    for(const t of P.tasks){if(t.done>=t.work)continue;if(t.after&&!all&&P.tasks.some(o=>!o.after&&o.done<o.work))continue;
      t.ids=t.ids.filter(id=>{const u=this.unit(id);return u&&u.hp>0&&u.k==='savant'&&u.sci.task===P.id+':'+t.i;});const want=t.work>18?3:t.work>8?2:1;
      if(t.ids.length<want){const b0=this.building(P.b0);const L=free(t.role).sort((a,z)=>Number(P.team.includes(z.id))-Number(P.team.includes(a.id))||z.sci.xp-a.sci.xp||d2(a.x,a.y,b0?.i??a.x,b0?.j??a.y)-d2(z.x,z.y,b0?.i??z.x,b0?.j??z.y));
        for(const u of L){if(t.ids.length>=want)break;t.ids.push(u.id);u.sci.task=P.id+':'+t.i;u.sci.pid=P.id;if(!P.team.includes(u.id))P.team.push(u.id);}}}},
  // le lieu de travail d'une tâche : le bureau d'origine pour les ingénieurs (sinon un autre), le laboratoire de chimie, le centre
  workplace(P,t,u=null){const b0=this.building(P.b0);return this.labFor(t.role,b0?.i??0,b0?.j??0,u,t.role==='ingenieur'&&b0&&b0.done&&!b0.ruin?b0:null);},

  // ---------- les directives du commandement ----------
  // une priorité (1 : important, 2 : essentiel) sur un but ; un levier gelé (on n'y touche plus : les pistes qui le touchaient tombent)
  setPriority(pid,goal,w){const P=this.program(pid);if(!P||P.kind!=='arme'||!GOALS[goal])return {ok:false,why:['pas un programme d’arme']};P.dir??={prio:{},frozen:[]};w=Math.max(0,Math.min(2,+w||0));
    if(w)P.dir.prio[goal]=w;else delete P.dir.prio[goal];const txt=w?`Directive : ${w>=2?'priorité absolue à':'priorité à'} ${GOALS[goal].name}.`:`Directive levée : ${GOALS[goal].name}.`;this.pev(P,txt);return {ok:true,text:`${P.name} — ${txt}`};},
  setFrozen(pid,lever,on){const P=this.program(pid);if(!P||P.kind!=='arme')return {ok:false,why:['pas un programme d’arme']};P.dir??={prio:{},frozen:[]};const F=P.dir.frozen;
    if(on&&!F.includes(lever)){F.push(lever);for(const L of P.leads||[])if(LIVE.has(L.st)&&L.edits.some(e=>leverOfEdit(e)===lever)){L.st='caduque';L.notes.unshift('Le commandement a gelé ce levier.');}}
    else if(!on)P.dir.frozen=F.filter(x=>x!==lever);const txt=on?`Directive : ne plus toucher à ${lever}.`:`Directive levée : ${lever}.`;this.pev(P,txt);return {ok:true,text:`${P.name} — ${txt}`};},

  // ---------- la réflexion : chacun creuse ses pistes ----------
  pseudoOf(P){return {id:-P.b0,name:'L’équipe du bureau',role:'ingenieur',grade:0,pseudo:true};},
  whoOf(u){return {id:u.id,name:u.name,role:u.sci.role,grade:gradeOf(u.sci.xp)};},
  boldOf(w){if(w.pseudo)return .15;const u=this.unit(w.id);return u?.sci?.bold??((w.id*.6180339)%1);},
  fillsCtx(P=null){const A=this.s.research.art;if(P&&P.p&&P.d0==null)P.d0=PARAMS.calibre.get(P.p);return {fills:[...new Set(['poudre','tolite','brisant','gelinc',...(A.remplissage||[])])],d0:P?.d0};},
  // le programme auquel pense un savant : celui de sa tâche, sinon l'un de ses équipes ; libre, il rejoint de lui-même un programme où son métier sert
  thinkProgram(u){const S=u.sci,all=this.s.research.programs,ok=P=>P.kind==='arme'&&['lancement','actif','suivi','pret'].includes(P.st);
    const P0=S.pid?this.program(S.pid):null;if(P0)return ok(P0)?P0:null;const mine=all.filter(x=>ok(x)&&x.team.includes(u.id));if(mine.length)return mine[Math.floor(this.rand()*mine.length)];
    const same=x=>x.team.filter(id=>this.unit(id)?.sci?.role===S.role).length;const P=all.filter(x=>ok(x)&&x.team.length<CHAIRS).sort((a,z)=>same(a)-same(z)||z.t0-a.t0)[0];
    if(P){P.team.push(u.id);this.pev(P,`${u.name} (${ROLES[S.role].name.toLowerCase()}) rejoint l’équipe de lui-même.`);}return P||null;},
  // une piste neuve : un défaut que son métier voit (ou une directive), une idée refusée qu'il reprend, une intuition ; force : un but imposé (l'inspiration)
  openLead(P,w,p,force=null){const D=derive(p),dir=P.dir||{},ctx=this.fillsCtx(P);const mine=P.leads.filter(L=>L.owner===w.id),live=mine.filter(L=>LIVE.has(L.st));let pick=force;
    if(!pick){const def=defectsSeen(w.role,D,dir,ctx).filter(d=>!live.some(L=>L.goal===d.goal));const ref=mine.filter(L=>L.st==='refusee'&&(L.refused||0)<2);const r=this.rand();
      if(ref.length&&r<.15){const L=ref[Math.floor(this.rand()*ref.length)];L.st='exploration';L.origin='reprise';L.edits=L.edits.slice(0,1);L.notes.unshift('Le commandement n’en a pas voulu : je reprends autrement.');rebaseLead(L,p,{dir});if(!LIVE.has(L.st))return null;return L;}
      if(def.length&&r<.8){const d=def[Math.floor(this.rand()*def.length)];pick={goal:d.goal,why:d.why,origin:d.origin};}
      else{const g=goalsFor(w.role,D,dir,ctx).filter(x=>!live.some(L=>L.goal===x));if(!g.length)return null;const goal=g[Math.floor(this.rand()*g.length)];pick={goal,why:`une intuition sur ${GOALS[goal].name}`,origin:'intuition'};}}
    if(live.some(L=>L.goal===pick.goal&&!!L.bold===!!pick.bold))return null;
    const bold=pick.bold??(this.rand()<(pick.origin==='intuition'?.25:.08)+.45*this.boldOf(w));
    const L=newLead({id:P.lid++,pid:P.id,owner:w.id,role:w.role,goal:pick.goal,origin:pick.origin,t:this.s.t,why:pick.why,inspiredBy:pick.inspiredBy??null,bold});
    P.leads.push(L);if(P.leads.length>LEADS_MAX){const dead=P.leads.filter(x=>!LIVE.has(x.st)&&x.st!=='proposee').sort((a,z)=>a.t0-z.t0);for(const x of dead.slice(0,P.leads.length-LEADS_MAX))P.leads.splice(P.leads.indexOf(x),1);}
    return L;},
  // une piste mûrit : les collègues des autres métiers voient ce qu'elle abîme dans leur domaine, et cherchent à le compenser — ou ont une autre idée
  inspire(P,L,w,p){const team=this.savants().filter(u=>u.id!==w.id&&(u.sci.pid===P.id||P.team.includes(u.id))&&!u.sci.meet);if(!team.length)return;const ctx=this.fillsCtx(P);
    for(const f of L.fx.filter(f=>!f.good&&Math.abs(f.rel)>.08)){const goal=FX_GOAL[f.k];if(!goal)continue;const u=team.find(x=>EYES[x.sci.role].includes(f.k)&&goalsFor(x.sci.role,derive(p),P.dir,ctx).includes(goal));
      if(u&&this.rand()<.5){const N=this.openLead(P,this.whoOf(u),p,{goal,why:`${w.name} veut ${short(ideaTitle(L,p)).toLowerCase()}, mais ${fxTxt(f).toLowerCase()} : je cherche à compenser`,origin:'inspiration',inspiredBy:w.id});if(N)this.pev(P,`${u.name} s’inspire de la piste de ${w.name}.`);}}
    const other=team.filter(x=>x.sci.role!==w.role&&goalsFor(x.sci.role,derive(p),P.dir,ctx).includes(L.goal));
    if(other.length&&this.rand()<.25){const u=other[Math.floor(this.rand()*other.length)];this.openLead(P,this.whoOf(u),p,{goal:L.goal,why:`${w.name} avance sur ${GOALS[L.goal].name} : j’ai une autre idée`,origin:'inspiration',inspiredBy:w.id});}},
  // un pas de réflexion d'un savant (u : l'unité, absente pour l'équipe d'un bureau)
  thinkOne(P,w,u,p,lab){const live=P.leads.filter(L=>L.owner===w.id&&LIVE.has(L.st));const cap=w.grade>=2?3:2;let L=null;
    if(live.length<cap&&(!live.length||this.rand()<.3))L=this.openLead(P,w,p);
    if(!L){const ex=live.filter(x=>x.st==='exploration');L=ex.length&&this.rand()<.8?ex[Math.floor(this.rand()*ex.length)]:live[Math.floor(this.rand()*live.length)];}
    if(!L)return null;const st0=L.st;const r=thinkStep(L,p,{rnd:()=>this.rand(),dir:P.dir||{},lab,grade:w.grade,ctx:this.fillsCtx(P)});
    if(u)u.sci.think={t:this.s.t,pid:P.id,lead:L.id,goal:L.goal,txt:r?r.tried:L.notes[0]||'…',good:!!r?.better,st:L.st};
    if(st0!=='mure'&&L.st==='mure'){this.pev(P,`${w.name} tient une piste : ${short(ideaTitle(L,p))}.`,'good');if(u){u.sci.bub={k:'eureka',t:this.s.t};const b=this.where(u);if(b)this.emit({type:'eureka',b:b.id,id:u.id});}this.inspire(P,L,w,p);}
    return r;},
  thinkTick(h,sleep){const R=this.s.research.programs;
    for(const P of R)if(P.kind==='arme'){P.leads??=[];P.lid??=1;P.dir??={prio:{},frozen:[]};}
    for(const u of this.savants()){const MP=u.sci.meet?this.program(u.sci.meet):null;if(MP&&MP.meet?.phase!=='decision')continue;   // (en réunion : on écoute ; en attendant le commandement, on griffonne)
      const P=MP||this.thinkProgram(u);if(!P)continue;const b=this.where(u);const g=gradeOf(u.sci.xp);
      const rate=GRADES[g].k*(MP?THINK.walk:b?(u.sci.task?THINK.task:THINK.free):THINK.walk)*(sleep?THINK.night:1);if(this.rand()>=rate*h)continue;
      this.thinkOne(P,this.whoOf(u),u,P.meet?.p||P.p,!!b&&b.k===ROLES[u.sci.role].at);}
    // un bureau sans ingénieur : ses dessinateurs réfléchissent aussi (lentement, en débutants)
    for(const P of R){if(P.kind!=='arme'||!['lancement','actif','suivi'].includes(P.st)||P.meet||sleep)continue;if(this.savants().some(u=>u.sci.role==='ingenieur'&&(u.sci.pid===P.id||P.team.includes(u.id))))continue;
      const b0=this.building(P.b0);if(b0&&b0.done&&!b0.ruin&&this.rand()<THINK.bureau*h)this.thinkOne(P,this.pseudoOf(P),null,P.p,true);}},

  // ---------- les réunions ----------
  // le lieu : le centre de recherche le plus proche du bureau d'origine ; sans centre, le bureau lui-même
  meetPlace(P){const b0=this.building(P.b0),C=this.labs().filter(b=>b.k==='centre_recherche');if(!C.length)return b0&&b0.done&&!b0.ruin?b0:this.labs()[0]||null;
    return C.sort((a,z)=>d2(a.i,a.j,b0?.i??0,b0?.j??0)-d2(z.i,z.j,b0?.i??0,b0?.j??0))[0];},
  callMeeting(P,type,focus=null){if(P.kind!=='arme'||P.meet)return;const b=this.meetPlace(P);if(!b)return;
    const busy=u=>u.sci.meet&&u.sci.meet!==P.id;
    const ids=[...new Set([...P.tasks.flatMap(t=>t.done<t.work?t.ids:[]),...P.team])].filter(id=>{const u=this.unit(id);return u?.k==='savant'&&u.hp>0&&!busy(u);}).slice(0,CHAIRS);
    // au lancement, les ingénieurs du bureau d'origine présentent ; un physicien et un chimiste libres viennent faire les calculs
    if(type==='lancement'){for(const u of this.savants())if(ids.length<CHAIRS&&u.sci.role==='ingenieur'&&u.inLab===P.b0&&!ids.includes(u.id)&&!busy(u))ids.push(u.id);
      for(const role of ['physicien','chimiste']){const x=this.savants().filter(u=>u.sci.role===role&&!u.sci.task&&!u.sci.meet&&!ids.includes(u.id)).sort((a,z)=>z.sci.xp-a.sci.xp)[0];if(x&&ids.length<CHAIRS)ids.push(x.id);}}
    for(const id of ids)if(!P.team.includes(id))P.team.push(id);
    P.meet={type,focus,b:b.id,ids,phase:'rassemblement',t0:this.s.t,script:[],props:[],chosen:[],wave:0,p:clone(P.p),p0:clone(P.p),seg:null,deadline:null,seen:0};
    for(const id of ids){const u=this.unit(id);if(!u)continue;u.sci.meet=P.id;if(this.where(u)!==b)this.sendTo(u,b,{meet:true});}
    this.pev(P,`${MEETINGS[type].name} convoquée ${AU[b.k]||''}.`);this.emit({type:'meeting',pid:P.id,b:b.id,kind:type});},
  // qui est là : les savants présents (et, sans ingénieur, l'équipe du bureau — des dessinateurs, au savoir d'un débutant)
  meetWho(P,b){const L=P.meet.ids.map(id=>this.unit(id)).filter(u=>u&&u.k==='savant'&&this.where(u)===b).map(u=>this.whoOf(u));
    if(!L.some(w=>w.role==='ingenieur'))L.push(this.pseudoOf(P));return L;},
  // une réplique (k : parole, calcul, prop, objection, soutien, compromis, decision ; ref : la proposition dont on parle)
  sayer(M){const who=M.who||[];const byRole=r=>who.find(w=>w.role===r&&w.id>0)?.id??who.find(w=>w.role===r)?.id??null;
    return (role,text,by,k='parole',ref=null)=>M.script.push({role,text,by:by===undefined?byRole(role):by,k,ref});},
  // une phase : ses répliques défilent pendant sa durée
  meetSeg(M,phase,from,per=.07,min=.25){M.phase=phase;M.seg={from,to:M.script.length,t0:this.s.t,dur:Math.max(min,(M.script.length-from)*per)};},
  // le tour de table : la conception (ou l'avancement), ce qu'on a mesuré de ce qu'on avait annoncé, ce qui bloque, les pistes en cours
  meetOpen(P,b){const M=P.meet;M.who=this.meetWho(P,b);const say=this.sayer(M),from=M.script.length;
    if(M.type==='lancement'){const an=this.analyzeDesign(M.p);for(const l of presentLines(M.p,an,P.name))say(l.role,l.text);}
    else if(M.type==='variante'){const D=derive(M.p);say('ingenieur',`« ${P.name} » est en service. Voici ce qu’on a trouvé pour la rendre meilleure.`);
      for(const v of (D.verdicts||[]).filter(v=>v.tone==='bad').slice(0,3))say('physicien',`Encore : ${v.t.charAt(0).toLowerCase()+v.t.slice(1)}.`);}
    else for(const l of progressLines(P))say(l.role,l.text);
    for(const a of P.applied.filter(x=>!x.told)){a.told=true;const worst=a.real.map(r=>{const e=a.est.find(x=>x.k===r.k);return {r,e,d:e?Math.abs(e.rel-r.rel):Math.abs(r.rel)};}).sort((x,z)=>z.d-x.d)[0];
      if(!worst)continue;if(!worst.e)say('physicien',`Mesuré après « ${short(a.title)} » : imprévu — ${fxTxt(worst.r).toLowerCase()}.`,undefined,'calcul');
      else say(a.role,`« ${short(a.title)} » : ${a.byName} annonçait ${fxTxt(worst.e).toLowerCase()} ; mesuré : ${fxTxt(worst.r).toLowerCase()}.`,a.by>0&&this.unit(a.by)?a.by:undefined,'calcul');}
    if(M.focus){const t=P.tasks.find(x=>x.ax===M.focus);if(t?.block)say(t.role,`${t.label} : bloqué — ${t.block.why}.`);}
    const live=P.leads.filter(L=>LIVE.has(L.st)),mure=live.filter(L=>L.st==='mure').length;if(live.length)say('physicien',`${live.length} piste${live.length>1?'s':''} en cours dans les carnets, dont ${mure} mûre${mure>1?'s':''}.`);
    this.meetSeg(M,'tour',from);},
  // la phase suivante
  meetNext(P,b){const M=P.meet;if(M.phase==='tour')this.meetPropose(P,b);else if(M.phase==='propositions')this.meetDebate(P,b);else this.meetDecision(P,b);},
  // les propositions : chacun refait ses calculs au tableau, et présente ce qu'il tient — pistes mûres, et parfois une idée en l'air
  meetPropose(P,b){const M=P.meet,who=M.who,A=this.s.research.art,rnd=()=>this.rand(),dir=P.dir||{},ctx=this.fillsCtx(P),say=this.sayer(M),from=M.script.length;const fresh=[];
    const first=M.type==='lancement';
    for(const w of who){let live=P.leads.filter(L=>L.owner===w.id&&LIVE.has(L.st));const want=first?2:live.length<2&&this.rand()<.5?live.length+1:1;
      while(live.length<want){const L=this.openLead(P,w,M.p);if(!L)break;live.push(L);}
      for(const L of live)burst(L,M.p,(first?3:1)+w.grade,{rnd,dir,lab:false,grade:w.grade,ctx});
      const ok=live.filter(L=>L.edits.length&&LIVE.has(L.st));const mine=ok.filter(L=>L.st==='mure'||L.score>=6).sort((a,z)=>z.score-a.score).slice(0,w.grade>=3?3:2);
      if(!mine.length){const raw=ok.filter(L=>L.score>=3).sort((a,z)=>z.score-a.score)[0];if(raw&&this.rand()<.6)mine.push(raw);}
      for(const L of mine){let c;try{c=proposalOf(L,M.p,A,w,{rnd,dir});}catch(e){continue;}L.st='proposee';fresh.push(c);}}
    this.addProps(P,fresh,say);if(!M.props.length)say('ingenieur','Personne n’a de meilleure idée pour l’instant.');
    this.meetSeg(M,'propositions',from,.1,.4);},
  // mettre des propositions sur la table (deux savants arrivés au même calcul : une seule, plus sûre)
  addProps(P,list,say){const M=P.meet;for(const c of list){const twin=M.props.find(o=>sameIdea(o,c));
      if(twin){twin.also=[...(twin.also||[]),{by:c.by,byName:c.byName}];twin.conf=Math.min(.99,+(twin.conf+.15).toFixed(2));(twin.leads??=[]).push(c.lead);say(c.role,`J’arrive au même calcul que ${twin.byName}.`,c.by,'soutien',M.props.indexOf(twin));continue;}
      M.props.push(c);M.seen++;this.sayProp(M,c,say);}},
  sayProp(M,c,say){const i=M.props.indexOf(c);say(c.role,`${c.kind==='idee'?'Une idée en l’air : ':c.kind==='rebond'?'Avec ce changement, je vois autre chose. ':''}${c.title}.`,c.by,'prop',i);
    const why=c.origin==='defaut'?`J’ai vu : ${c.why}.`:c.origin==='directive'?`Le commandement l’a demandé.`:c.origin==='reprise'?`Je reprends l’idée refusée, autrement.`:c.why?cap1(c.why)+'.':'';if(why)say(c.role,why,c.by,'calcul',i);
    if(c.est.length)say(c.role,`${c.steps} calcul${c.steps>1?'s':''}${c.exp?`, dont ${c.exp} vérifiés au banc`:''} : ${c.est.slice(0,3).map(e=>`${e.name.toLowerCase()} ${e.rel>0?'+':'−'}${Math.round(Math.abs(e.rel)*100)} %`).join(', ')}.`,c.by,'calcul',i);
    if(c.dWork>1)say(c.role,`Il faudra ${Math.round(c.dWork)} heures-savants de plus${c.newTasks.length?' : '+c.newTasks.slice(0,2).join(', ').toLowerCase():''}.`,c.by,'calcul',i);},
  // le débat : objections et soutiens ; les conflits donnent des compromis, les propositions compatibles se calculent ensemble
  meetDebate(P,b){const M=P.meet,who=M.who,A=this.s.research.art,rnd=()=>this.rand(),dir=P.dir||{},say=this.sayer(M),from=M.script.length;
    const fresh=M.props.filter(c=>!c.debated),lines=debate(fresh,who,rnd,derive(M.p));for(const l of lines)say(l.role,l.text,l.by,/^Et c’est bon/.test(l.text)?'soutien':'objection',M.props.indexOf(l.on));for(const c of fresh)c.debated=true;
    const senior=[...who].sort((a,z)=>z.grade-a.grade)[0],phys=who.find(w=>w.role==='physicien')||senior;const base=M.props.filter(c=>!c.from);let nc=0,nk=0,nx=0;const add=[];
    for(const o of lines){if(nx>=3||/^Et c’est bon/.test(o.text)||!o.fx)continue;const w=who.find(x=>x.id===o.by),c=o.on,goal=FX_GOAL[o.k];if(!w||!goal||this.rand()>.4+.1*w.grade)continue;
      const q=applyEdit(M.p,c.edits);const L=this.openLead(P,w,q,{goal,why:`pour garder l’idée de ${c.byName} sans perdre ${o.fx.name.toLowerCase()}`,origin:'inspiration',inspiredBy:c.by});if(!L)continue;
      burst(L,q,2+w.grade,{rnd,dir,lab:false,grade:w.grade,ctx:this.fillsCtx(P)});if(!L.edits.length||L.score<4)continue;
      const X={id:-1,edits:[...c.edits.filter(e=>!L.edits.some(x=>x[0]===e[0])),...L.edits],goal:c.goal,role:w.role,steps:L.steps,exp:0,origin:'contre',why:L.why,bold:c.bold,notes:L.notes};
      let k;try{k=proposalOf(X,M.p,A,w,{rnd,dir,kind:'contre',title:`${short(c.title)}, en compensant : ${L.edits.map(e=>descEdit(q,e)).join(' ; ')}`});}catch(e){continue;}
      if(k.score<c.score-2||[...M.props,...add].some(x=>sameIdea(x,k)))continue;k.from=[c.lead,L.id];k.base=c.byName;k.fix=L.edits.map(e=>descEdit(q,e));L.st='proposee';add.push(k);nx++;}
    for(let i=0;i<base.length;i++)for(let j=i+1;j<base.length;j++){const a=base[i],c=base[j];if(sameIdea(a,c))continue;
      if(conflictOf(a,c)){if(nc>=2||a.score<3||c.score<3)continue;const m=merge(a,c,M.p,A,senior,{rnd,dir});if(m&&m.score>=Math.max(a.score,c.score)-3&&![...M.props,...add].some(o=>sameIdea(o,m))){add.push(m);nc++;}}
      else if(nk<2&&a.score>=6&&c.score>=6){const m=merge(a,c,M.p,A,phys,{rnd,dir});if(!m)continue;if(m.synergy>=3&&![...M.props,...add].some(o=>sameIdea(o,m))){add.push(m);nk++;}
        else if(m.synergy<=-8&&this.rand()<.5)say(phys.role,`Attention : ensemble, « ${short(a.title)} » et « ${short(c.title)} » se nuisent (${Math.round(m.synergy)} points).`,phys.id,'objection',M.props.indexOf(a));}}
    for(const m of add){M.props.push(m);M.seen++;const i=M.props.length-1;
      if(m.kind==='contre')say(m.role,`Je garde l’idée de ${m.base}, et je compense : ${m.fix.join(' ; ')}. Au total : ${m.est.slice(0,3).map(fxTxt).join(', ').toLowerCase()}.`,m.by,'compromis',i);
      else if(m.kind==='compromis')say(senior.role,`Ces deux-là touchent la même chose. Je propose un compromis : ${short(m.title)}.`,senior.id,'compromis',i);
      else say(phys.role,`J’ai fait le calcul des deux ensemble : ${m.est.slice(0,3).map(fxTxt).join(', ').toLowerCase()}. ${m.synergy>=8?'Elles se renforcent !':'Elles vont bien ensemble.'}`,phys.id,'compromis',i);}
    this.meetSeg(M,'debat',from,.09,.3);},
  // la décision : on attend le commandement
  meetDecision(P,b){const M=P.meet;if(!M.props.length){this.meetEnd(P,{decided:true});return;}
    if(M.type==='revue'&&!M.wave)for(const t of P.tasks)if(t.block&&this.rand()<.7){t.block=null;this.pev(P,`La revue a débloqué : ${t.label.toLowerCase()}.`,'good');}
    M.phase='decision';M.deadline=this.s.t+MEETINGS[M.type].wait;M.seg={from:M.script.length,to:M.script.length,t0:this.s.t,dur:1};
    this.emit({type:'decision',pid:P.id,b:b.id,n:M.props.length,wave:M.wave+1});
    this.rlog(b,`${MEETINGS[M.type].name} de « ${P.name} »${M.wave?` (vague ${M.wave+1})`:''} : ${M.props.length} proposition${M.props.length>1?'s':''} attendent la décision du commandement.`,'warn',null,true);},
  // la réunion qui se tient dans un bâtiment (pour la vue) : le programme, la réunion, la réplique en cours
  meetingAt(b){for(const P of this.s.research.programs){const M=P.meet;if(!M||M.b!==b.id)continue;let idx=-1;const S=M.seg;
      if(S&&M.phase!=='rassemblement'){const n=S.to-S.from;idx=M.phase==='decision'||n<=0?M.script.length-1:S.from+Math.min(n-1,Math.floor((this.s.t-S.t0)/S.dur*n));}
      return {P,M,idx,line:idx>=0?M.script[idx]:null};}return null;},
  // une proposition recalculée sur la conception nouvelle (rend null si elle n'apporte plus rien)
  recalcProp(P,c,p){const A=this.s.research.art;const L={id:c.lead,edits:c.edits,goal:c.goal,role:c.role,steps:c.steps,exp:c.exp||0,origin:c.origin,why:c.why,bold:c.bold,notes:c.notes||[],inspiredBy:c.inspiredBy};
    let n;try{n=proposalOf(L,p,A,{id:c.by,name:c.byName,role:c.role,grade:c.grade},{rnd:()=>this.rand(),dir:P.dir||{},kind:c.kind,title:c.from?c.title:null});}catch(e){return null;}
    if(n.score<3||!n.real.length)return null;for(const k of ['also','leads','from','synergy','debated'])if(c[k]!==undefined)n[k]=c[k];n.conf=c.conf;n.objections=c.objections;n.supports=c.supports;n.prev=c.score;return n;},
  dropProp(P,c,how){for(const id of leadIds(c)){const L=P.leads.find(x=>x.id===id);if(!L||L.st!=='proposee')continue;
      if(how==='refusee'){L.st='refusee';L.refused=(L.refused||0)+1;L.notes.unshift('Le commandement ne l’a pas retenue.');}
      else if(how==='caduque'){L.st='caduque';L.notes.unshift('La décision l’a rendue sans objet.');}
      else L.st=L.score>=8&&L.steps>=4?'mure':'exploration';}},
  // le commandement tranche une vague : picks (les numéros des propositions retenues) ; close : il clôt la réunion ; absent : personne n'est venu
  decide(pid,picks=[],{close=false,absent=false}={}){const P=this.program(pid),M=P?.meet;if(!M||M.phase!=='decision')return {ok:false,why:['pas de décision attendue']};
    const chosen=[];for(const i of picks){const c=M.props[i];if(!c||chosen.includes(c)||chosen.some(o=>conflictOf(o,c)))continue;chosen.push(c);}
    if(!chosen.length){this.meetEnd(P,{decided:!absent,absent});return {ok:true,text:absent?'Réunion close sans le commandement':M.chosen.length?'Réunion close':'Conception gardée'};}
    const b=this.building(M.b),say=this.sayer(M),from=M.script.length,dir=P.dir||{},rnd=()=>this.rand();
    const p0=M.p;let p=p0;for(const c of chosen){try{p=applyEdit(p,c.edits);}catch(e){}}const fx=effects(derive(p0),derive(p));M.p=p;M.wave++;
    for(const c of chosen){c.taken=M.wave;M.chosen.push(c);for(const id of leadIds(c)){const L=P.leads.find(x=>x.id===id);if(L){L.st='retenue';L.titleAt=c.title;L.notes.unshift('Retenue par le commandement.');}}
      P.applied.push({title:c.title,by:c.by,byName:c.byName,role:c.role,est:c.est,real:c.real,t:this.s.t});}
    const what=chosen.map(c=>short(c.title).toLowerCase()).join(' ; ');say('ingenieur',`Le commandement retient : ${what}. On redessine.`,undefined,'decision');
    if(fx.length)say('physicien',`La conception nouvelle : ${fx.slice(0,5).map(fxTxt).join(', ').toLowerCase()}.`,undefined,'calcul');
    if(M.type!=='variante')this.reshape(P,p);
    this.pev(P,`Le commandement retient : ${what}.${fx.length?' '+fx.slice(0,4).map(fxTxt).join(', ')+'.':''}`,'good');this.rlog(b,`« ${P.name} » : retenu — ${what}.`,'good');
    // ce qui reste sur la table : ce que la décision a tranché tombe ; le reste est recalculé sur la conception nouvelle
    const rest=[];for(const c of M.props){if(c.taken)continue;if(chosen.some(o=>conflictOf(o,c))){this.dropProp(P,c,'caduque');continue;}const n=this.recalcProp(P,c,p);
      if(!n){this.dropProp(P,c,'caduque');say(c.role,`« ${short(c.title)} » n’apporte plus rien : je la retire.`,c.by,'parole');continue;}
      if(Math.abs(n.score-c.score)>6)say(c.role,`Avec ce qui vient d’être retenu, « ${short(n.title)} » ${n.score>c.score?'vaut davantage':'vaut moins'} : ${n.real.slice(0,2).map(fxTxt).join(', ').toLowerCase()}.`,c.by,'calcul',rest.length);rest.push(n);}
    M.props=rest;
    if(M.wave>=WAVES||close){this.meetEnd(P,{decided:true});return {ok:true,text:`${chosen.length} retenue${chosen.length>1?'s':''} — réunion close`};}
    // les rebonds : la conception nouvelle fait voir autre chose ; ce que la décision abîme, un collègue cherche à le compenser
    const fresh=[],A=this.s.research.art,ctx=this.fillsCtx(P);
    for(const w of M.who||[]){if(this.rand()>.65)continue;let force=null;const bad=chosen.flatMap(c=>c.real).filter(f=>!f.good&&EYES[w.role].includes(f.k)&&Math.abs(f.rel)>.06)[0];
      if(bad&&FX_GOAL[bad.k])force={goal:FX_GOAL[bad.k],why:`la décision abîme ${bad.name.toLowerCase()} (${fxTxt(bad).toLowerCase()}) : je cherche à compenser`,origin:'inspiration'};
      const L=this.openLead(P,w,p,force);if(!L)continue;burst(L,p,2+w.grade,{rnd,dir,lab:false,grade:w.grade,ctx});
      if(L.edits.length&&L.score>=6&&LIVE.has(L.st)){let c;try{c=proposalOf(L,p,A,w,{rnd,dir,kind:'rebond'});}catch(e){continue;}L.st='proposee';fresh.push(c);}}
    this.addProps(P,fresh,say);const nd=M.props.filter(c=>!c.debated);for(const l of debate(nd,M.who||[],rnd,derive(p)))say(l.role,l.text,l.by,/^Et c’est bon/.test(l.text)?'soutien':'objection',M.props.indexOf(l.on));for(const c of nd)c.debated=true;
    if(!M.props.length){this.meetEnd(P,{decided:true});return {ok:true,text:`${chosen.length} retenue${chosen.length>1?'s':''} — plus rien sur la table`};}
    this.meetSeg(M,'application',from,.08,.35);return {ok:true,text:`${chosen.length} retenue${chosen.length>1?'s':''} : la conception change`};},
  // le roi (le joueur) assiste : on la tient à jour tant que la fenêtre de réunion est ouverte (sinon il s'en va au bout d'une demi-heure)
  attendMeeting(pid,on){const P=this.program(pid),M=P?.meet;if(!M)return;if(on){M.kingT=this.s.t;if(!M.king){M.king=true;const say=this.sayer(M);say('ingenieur','Le roi entre et prend place au bout de la table.','roi','decision');
      const w=(M.who||[]).find(x=>x.id>0);if(w)say(w.role,['Majesté !','Le roi est là : on vous écoute, Majesté.','Majesté, la conception est sur la table.'][Math.floor(this.rand()*3)],w.id,'parole');}}
    else if(M.king){M.king=false;}},
  closeMeeting(pid){const P=this.program(pid);if(!P?.meet)return {ok:false,why:['pas de réunion en cours']};if(P.meet.phase==='decision')return this.decide(pid,[],{close:true});
    const n=P.meet.chosen.length;this.meetEnd(P,{decided:true});return {ok:true,text:n?'Réunion close':'Réunion close sans rien retenir'};},
  callReview(pid){const P=this.program(pid);if(!P||P.kind!=='arme'||P.st!=='actif')return {ok:false,why:['pas de programme en développement']};if(P.meet)return {ok:false,why:['une réunion est déjà en cours']};
    this.callMeeting(P,'revue');return P.meet?{ok:true,text:`${P.name} : revue convoquée`}:{ok:false,why:['pas de lieu de réunion']};},
  // la fin d'une réunion : ce qui n'a pas été retenu est refusé (ou, sans le commandement, retourne au carnet) ; chacun repart à son poste
  // refaire ses pistes sur la conception nouvelle
  meetEnd(P,{decided=false,absent=false}={}){const M=P.meet;if(!M)return null;
    for(const c of M.props)if(!c.taken)this.dropProp(P,c,decided?'refusee':'retour');
    const changed=M.chosen.flatMap(keysOf);if(changed.length&&M.type!=='variante')for(const L of P.leads)rebaseLead(L,P.p,{dir:P.dir,changed});
    P.meetings.push({type:M.type,t:this.s.t,waves:M.wave,seen:M.seen,chosen:M.chosen.map(c=>c.title)});
    for(const id of M.ids){const u=this.unit(id);if(u?.sci?.meet===P.id)u.sci.meet=null;}P.meet=null;P.lastMeet=this.s.t;
    if(!M.chosen.length)this.pev(P,absent?`Le commandement n’est pas venu : le chef de projet garde la conception.`:`Le commandement garde la conception telle quelle.`,absent?'bad':'info');
    if(M.type==='variante'){if(M.chosen.length){const V=this.createVariant(P,M.p);V.applied=P.applied.map(a=>({...a}));return V;}this.pev(P,'Rien de retenu : l’équipe continue d’étudier.');for(const t of P.tasks)t.done=0;this.assignAll(P);return null;}
    if(P.st==='lancement')P.st='actif';
    // après l'essai, sans changement : la conception est prête — c'est le commandement qui la déclare terminée (adoptNow)
    if(M.type==='finale'&&!M.chosen.length&&P.tasks.every(t=>t.done>=t.work)){P.st='pret';P.readyT=this.s.t;this.pev(P,`La conception est prête : au commandement de la déclarer terminée.`,'good');}else this.assignAll(P);
    return null;},
  // une réunion interrompue (le bâtiment tombé, la conception déclarée terminée) : rien n'est décidé
  closeMeet(P){const M=P.meet;if(!M)return;for(const c of M.props)if(!c.taken)this.dropProp(P,c,'retour');for(const id of M.ids){const u=this.unit(id);if(u?.sci?.meet===P.id)u.sci.meet=null;}P.meet=null;P.lastMeet=this.s.t;},
  // le commandement clôt la conception : l'arme est adoptée (après l'essai seulement) ; l'équipe peut continuer à étudier des variantes
  canAdopt(P){return P&&P.kind==='arme'&&(P.st==='actif'||P.st==='pret')&&P.tasks.every(t=>t.done>=t.work);},
  adoptNow(pid){const P=this.program(pid);if(!this.canAdopt(P))return {ok:false,why:['l’essai de tir n’est pas encore fait']};if(P.meet)this.closeMeet(P);this.adopt(P);return {ok:true,text:`${P.name} : conception close, arme adoptée`};},
  // les variantes : après l'adoption, l'équipe continue de penser l'arme ; ce qu'une revue de variantes retient devient un prototype
  setVariants(pid,on){const P=this.program(pid);if(!P||P.kind!=='arme')return {ok:false,why:['pas un programme d’arme']};P.variants=!!on;
    if(!on&&P.st==='suivi'){if(P.meet)this.closeMeet(P);P.st='fini';this.release(P);}
    else if(on&&P.st==='fini'&&this.design(P.ref)?.status==='adopte')this.startSuite(P);return {ok:true,text:on?`${P.name} : l’équipe étudie des variantes`:`${P.name} : plus de variantes`};},
  startSuite(P){P.st='suivi';P.tasks=[{i:0,ax:'variantes',role:'ingenieur',label:`Études de variantes de « ${P.name} »`,gap:'',v:0,a:null,n:0,work:12,done:0,ids:[]},
    {i:1,ax:'variantes_calc',role:'physicien',label:`Calculs pour les variantes`,gap:'',v:0,a:null,n:0,work:8,done:0,ids:[]}];P.rev50=true;this.assignAll(P);},
  // une variante retenue : une nouvelle conception (Mk 2, Mk 3…), son propre programme — l'arme adoptée reste en fabrication ; les pistes suivent
  createVariant(P,p){const base=this.design(P.ref);const k=(P.mk||1)+1;P.mk=k;const id='d'+this.id();const name=`${(base?.name||P.name).replace(/ Mk \d+$/,'')} Mk ${k}`;
    this.s.designs[id]={id,f:'meumeu',name,status:'prototype',p:clone(p),origin:P.b0,parent:P.ref};const b0=this.building(P.b0)||this.labs().find(b=>b.k==='armurerie');
    const R=this.s.research,an=this.analyzeDesign(p);const V={id:R.nid++,kind:'arme',ref:id,name,b0:b0?.id??P.b0,st:'actif',t0:this.s.t,p:clone(p),tasks:an.tasks.map((t,i)=>({...t,i,done:0,ids:[]})),ev:[],applied:[],meetings:[],team:[...P.team],parent:P.id,variants:true,
      leads:[],lid:P.lid||1,d0:P.d0,dir:clone(P.dir||{prio:{},frozen:[]}),lastMeet:this.s.t};
    for(const L of P.leads||[])if(LIVE.has(L.st)){const N=clone(L);N.pid=V.id;rebaseLead(N,p,{dir:V.dir});if(LIVE.has(N.st))V.leads.push(N);}
    R.programs.push(V);P.st='fini';P.leads=[];this.release(P);this.pev(V,`Variante de « ${P.name} » : ${V.tasks.length} tâches, ${Math.round(an.work)} heures-savants.`,'good');
    this.rlog(b0,`Prototype : ${name}, variante de ${P.name}.`,'good',null,true);this.assignAll(V);return V;},
  // la nouvelle conception : les tâches recalculées ; le travail déjà fait sur un même axe est gardé ; l'essai est à refaire
  reshape(P,p){const an=this.analyzeDesign(p);const old=P.tasks;P.p=p;const d=this.design(P.ref);if(d)d.p=clone(p);
    P.tasks=an.tasks.map((t,i)=>{const o=old.find(x=>x.ax===t.ax);return {...t,i,done:o&&t.ax!=='essai'?Math.min(o.done,t.work):0,ids:[],block:null};});
    for(const u of this.savants())if(u.sci.pid===P.id)u.sci.task=null;},
  adopt(P){P.st='fini';P.t1=this.s.t;const b=this.building(P.b0);this.release(P);
    if(P.kind==='arme'){const d=this.design(P.ref);if(d){d.p=clone(P.p);d.status='adopte';artPush(this.s.research.art,d.p,derive(d.p));}
      this.rlog(b,`Adoptée : ${P.name}. La manufacture et l’arsenal peuvent la fabriquer.`,'good',null,true);this.emit({type:'design',id:P.ref});
      if(P.variants!==false)this.startSuite(P);}
    else if(P.kind==='protection'){const a=this.s.armors[P.ref];if(a)a.status='adopte';this.rlog(b,`Protection adoptée : ${P.name}.`,'good',null,true);this.emit({type:'design',id:P.ref});}
    else if(P.kind==='idee'){if(!this.s.innov.done.includes(P.ref))this.s.innov.done.push(P.ref);this.remod();const I=INNOV.find(x=>x.id===P.ref);this.rlog(b,`Innovation : ${I?.name}. ${I?.text||''}`,'good',null,true);this.emit({type:'innov',id:P.ref});}
    for(const id of P.team){const u=this.unit(id);if(u?.sci)u.sci.papers=(u.sci.papers||0)+1;}},

  // ---------- les évènements d'une tâche ----------
  accident(P,t,b,here){t.done=Math.max(0,t.done-t.work*.15);b.hp=Math.max(b.max*.15,b.hp-b.max*(.05+.08*this.rand()));if(this.rand()<.3)b.fire=Math.max(b.fire||0,1);
    for(const u of here)u.sci.bub={k:'accident',t:this.s.t};
    this.pev(P,`Accident ${AU[b.k]} : ${t.label.toLowerCase()} — le travail recule.`,'bad');this.rlog(b,`Accident ${AU[b.k]} pendant « ${P.name} » (${t.label.toLowerCase()}).`,'bad');
    const [w,h]=this.sizeOf(b);this.emit({type:'labboom',b:b.id,x:b.i+w/2,y:b.j+h/2,f:'meumeu',chem:true});},
  taskDone(P,t,b){t.done=t.work;t.block=null;const D=P.p?derive(P.p):null;
    if(P.kind==='arme'&&t.ax!=='dossier'&&t.ax!=='essai'&&D)artPush(this.s.research.art,P.p,D,t.ax);
    t.res=t.ax==='essai'&&D?`${Math.round(D.v0)} m/s au chronographe, ${D.moa.toFixed(1).replace('.',',')} MOA`:t.ax==='tube'&&D?`épreuve tenue à ${Math.round(D.P*1.25)} MPa`:'';
    for(const id of t.ids){const u=this.unit(id);if(u?.sci){u.sci.task=null;u.sci.bub={k:'fini',t:this.s.t};}}t.ids=[];
    this.pev(P,`Fait : ${t.label}${t.res?' — '+t.res:''}.`,'good');this.rlog(b,`« ${P.name} » : ${t.label.toLowerCase()} — fait.`,'info');},

  // ---------- le pas de la recherche (toutes les 0,1 h de jeu) ----------
  researchTick(dt){this.resT=(this.resT||0)+dt;if(this.resT<TICK)return;const h=this.resT;this.resT=0;const R=this.s.research,s=this.s;
    const hr=this.hour(),sleep=hr>=23||hr<6,labs=this.labs(),sav=this.sciUnits();
    for(const u of sav)if(u.k==='savant')u.sci.act=null;
    // l'école
    for(const b of labs){if(b.k!=='centre_recherche')continue;const st=sav.filter(u=>u.k!=='savant'&&u.inLab===b.id);if(!st.length)continue;const T=this.teacherOf(b);
      for(const u of st){u.sci.act='etude';u.sci.study.left-=h*(T?.k||1);if(u.sci.study.left<=0)this.graduate(u,b);}if(T)T.u.sci.act='cours';}
    for(const u of sav)if(u.k!=='savant'&&!this.where(u)&&u.task?.kind!=='lab')delete u.sci;   // (un élève détourné de l'école redevient villageois)
    // les programmes
    for(const P of R.programs){if(P.st!=='lancement'&&P.st!=='actif'&&P.st!=='suivi'&&P.st!=='pret')continue;
      // prête : le commandement doit la déclarer terminée ; au bout d'un jour et demi, le chef de projet la clôt
      if(P.st==='pret'){if(s.t-(P.readyT??s.t)>36){this.pev(P,`Sans nouvelle du commandement, le chef de projet clôt la conception.`,'bad');this.adopt(P);}continue;}
      // la réunion : on se rassemble (deux heures au plus), les phases défilent, puis on attend la décision du commandement
      const M=P.meet;if(M){const b=this.building(M.b);if(!b||!b.done||b.ruin){this.closeMeet(P);if(P.st==='lancement')P.st='actif';continue;}
        if(M.king&&s.t-(M.kingT??0)>.5)M.king=false;   // (la fenêtre fermée sans le dire : le roi est parti)
        if(M.phase==='rassemblement'){const here=M.ids.filter(id=>this.where(this.unit(id))===b);for(const id of M.ids){const u=this.unit(id);if(u&&u.k==='savant'&&this.where(u)!==b&&u.task?.kind!=='lab')this.sendTo(u,b,{meet:true});}
          if(here.length>=M.ids.length||s.t-M.t0>2)this.meetOpen(P,b);}
        else if(M.phase==='decision'){if(M.king)M.deadline=Math.max(M.deadline,s.t+.5);if(s.t>=M.deadline){this.decide(P.id,[],{absent:true});continue;}}
        else if(s.t>=M.seg.t0+M.seg.dur)this.meetNext(P,b);
        if(P.meet)for(const id of P.meet.ids){const u=this.unit(id);if(u&&this.where(u)===b)u.sci.act=P.meet.phase==='decision'?'attente':'reunion';}}
      if(P.st==='lancement')continue;   // (rien ne commence avant la décision du lancement)
      this.assignAll(P);let left=0,all=0;
      for(const t of P.tasks){all+=t.work;left+=Math.max(0,t.work-t.done);if(t.done>=t.work)continue;if(t.after&&P.tasks.some(o=>!o.after&&o.done<o.work))continue;
        const team=t.ids.map(id=>this.unit(id)).filter(u=>u&&u.k==='savant');
        // chacun va à son poste ; un savant en réunion y reste
        for(const u of team){if(u.sci.meet)continue;const wp=this.workplace(P,t,u);if(!wp){u.sci.act='attente';continue;}if(this.where(u)!==wp&&!(u.task?.kind==='lab'&&u.task.b===wp.id))this.sendTo(u,wp);}
        const wk=ROLES[t.role].at;if(!labs.some(b=>b.k===wk)){t.wait=`il faut ${ART[wk]}`;continue;}
        const here=team.filter(u=>!u.sci.meet&&this.where(u)?.k===wk);t.wait=team.length&&!here.length?'l’équipe est en chemin':!team.length?`aucun ${ROLES[t.role].name.toLowerCase()} libre — le personnel du bâtiment s’y met`:null;
        let rate=0;for(const u of here){const k=this.skill(u)*(sleep?.35:1);rate+=k;u.sci.act=sleep?'dort':'travail';u.sci.xp+=h*(sleep?.35:1);}
        if(!team.length)rate=BASE_STAFF*(sleep?.35:1);rate*=t.block?.25:1;t.done=Math.min(t.work,t.done+rate*h);
        const wb=here.map(u=>this.where(u)).find(Boolean)||labs.find(b=>b.k===wk);
        // un eurêka, un blocage, un accident de laboratoire
        if(here.length&&this.rand()<h*.006*here.length){t.done=Math.min(t.work,t.done+t.work*.15);const u=here[Math.floor(this.rand()*here.length)];u.sci.bub={k:'eureka',t:s.t};this.pev(P,`Eurêka ! ${u.name} avance « ${t.label.toLowerCase()} ».`,'good');this.emit({type:'eureka',b:wb?.id,id:u.id});}
        if(!t.block&&t.n>.25&&this.rand()<h*.01*t.n){const L=BLOCKS[t.ax]||BLOCKS._;t.block={why:L[Math.floor(this.rand()*L.length)],t:s.t};for(const u of here)u.sci.bub={k:'bloque',t:s.t};this.pev(P,`Bloqué : ${t.label.toLowerCase()} — ${t.block.why}.`,'bad');if(!P.meet)this.callMeeting(P,'revue',t.ax);}
        else if(t.block&&this.rand()<h*.03){this.pev(P,`Débloqué : ${t.label.toLowerCase()}.`,'good');t.block=null;}
        if(CHEM_AX.has(t.ax)&&wb?.k==='labo'&&here.length&&this.rand()<h*.003*(1+t.n))this.accident(P,t,wb,here);
        if(t.done>=t.work)this.taskDone(P,t,wb);}
      if(P.kind!=='arme')continue;const mure=(P.leads||[]).filter(L=>L.st==='mure').length,since=s.t-(P.lastMeet??P.t0);
      if(P.st==='actif'&&!P.meet&&!P.rev50&&all>0&&left/all<=.5&&P.tasks.some(t=>t.done<t.work)){P.rev50=true;this.callMeeting(P,'revue');}
      // plusieurs pistes mûres : le chef de projet convoque une revue (ou, l'arme en service, une revue de variantes)
      if(P.st==='actif'&&!P.meet&&mure>=3&&since>=8){this.pev(P,`${mure} pistes sont mûres : le chef de projet convoque une revue.`);this.callMeeting(P,'revue');}
      if(P.st==='actif'&&P.tasks.every(t=>t.done>=t.work)&&!P.meet)this.callMeeting(P,'finale');
      if(P.st==='suivi'&&!P.meet&&((mure>=3&&since>=12)||P.tasks.every(t=>t.done>=t.work)))this.callMeeting(P,'variante');}
    for(const P of R.programs)if(P.kind!=='arme'&&P.st==='actif'&&P.tasks.every(t=>t.done>=t.work))this.adopt(P);
    // la réflexion
    this.thinkTick(h,sleep);
    // les savants sans tâche : à leur bâtiment, ils réfléchissent ; la nuit, ils dorment
    for(const u of sav){if(u.k!=='savant')continue;const S=u.sci,b=this.where(u);
      if(!S.task&&!S.meet&&!b&&!u.task){const home=this.labFor(S.role,u.x,u.y,u);if(home)this.sendTo(u,home);}
      if(!S.act)S.act=!b?'marche':sleep?'dort':S.task?'attente':S.think&&s.t-S.think.t<3?'reflexion':'oisif';}},

  // ---------- un bâtiment de recherche détruit ----------
  // ceux qui sont dedans sortent ; un sur cinq y reste
  labCollapse(b){let n=0,dead=0;for(const u of this.s.units){if(u.inLab!==b.id)continue;n++;this.labExit(u,b);if(u.k!=='savant'){delete u.sci;continue;}if(this.rand()<.2){dead++;if(u.h)u.h.cause=`écrasé sous les décombres du ${BUILDINGS[b.k].name.toLowerCase()}`;this.death(u);}}
    if(n)this.rlog(b,`${BUILDINGS[b.k].name} détruit : ${n} évacué${n>1?'s':''}${dead?`, ${dead} mort${dead>1?'s':''} sous les décombres`:''}.`,'bad');},
};
