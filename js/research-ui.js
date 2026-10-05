// Le panneau de la recherche (V12.7) : ce que le joueur dirige quand la vue recherche est ouverte, et la fenêtre de réunion.
//  Programmes : chaque conception en développement — son dessin et ses chiffres, la réunion en cours (« Assister »), les tâches et qui y travaille,
//               les directives du commandement (ce qui est prioritaire, ce à quoi on ne touche plus), les carnets (les pistes de chaque savant, vivantes,
//               mûres, abandonnées), « conception terminée », les variantes ; les petits programmes ; les idées des ouvriers ;
//  Savants : chacun — son métier, son grade, ce qu'il fait, où, ce à quoi il pense ;  École : former des savants des trois métiers ;
//  État de l'art : ce que nos armes ont prouvé ;  Carnet : tout ce qui s'est passé ;  Bâtiment : le panneau ordinaire du bâtiment.
// LA RÉUNION (meetModal) : les phases, la conception sur la table, ce qui se dit, et les PROPOSITIONS — chacune avec la conception proposée dessinée sur
// l'ancienne (en transparence), ce qu'elle change, ce que son auteur en estime (avec sa marge d'erreur : il peut se tromper, ne pas voir un effet), sa
// confiance, son origine, les objections et les soutiens, ce qu'elle coûte au programme. Le commandement en retient plusieurs par vague ; la conception
// change aussitôt, les savants recalculent ce qui reste et rebondissent — jusqu'à trois vagues.
import {BUILDINGS,INNOV,UNITS} from './data.js';
import {derive,fmt} from './ballistics.js';
import {layout,drawWeapon,drawRound} from './gunart.js';
import {LAB_KIND,LAB_SEATS,GRADES,gradeOf,MEETINGS,MEET_PHASES} from './researchdata.js';
import {ROLES,GOALS,AXES,nums,metricOk,confOf,ideaTitle,applyEdit,conflictOf,leverOk,LEVER_NAME,rangeOf,wallF} from './techaxes.js';

const ACT={etude:'étudie',cours:'fait cours',reunion:'en réunion',travail:'travaille',reflexion:'réfléchit',dort:'dort',attente:'attend',oisif:'sans programme',marche:'en chemin'};
const AU={centre_recherche:'au centre de recherche',labo:'au laboratoire de chimie',armurerie:'au bureau d’études'};
const KIND={piste:'Piste',idee:'Idée en l’air',rebond:'Rebond',compromis:'Compromis',combinaison:'Combinaison',contre:'Contre-proposition'};
const ST={lancement:'Lancement',actif:'En développement',pret:'Prête',suivi:'En service — variantes',fini:'Close',abandon:'Abandonnée'};
const LEAD_ST={exploration:'en cours',mure:'mûre',proposee:'sur la table',retenue:'retenue',refusee:'refusée',impasse:'impasse',caduque:'caduque'};
const LEVERS=['calibre','balle','tube','paroi','pas','charge','vivacite','ogive','culot','cadence','remplissage','moteur','ailettes','frein','lunette','affut','material','coque','fusee','explosif','gyro','etages'];
const short=t=>String(t).replace(/^(Refonte — )?Pour [^:]+: /,'');
const dist=m=>m>=1000?`${fmt(m/1000,1)} km`:`${Math.round(m)} m`;

// le dessin d'une conception (et, en transparence, celle qu'elle remplace) : l'arme, pièce par pièce, et sa munition en coupe
const PIC=new Map();
export function portrait(p,p0=null,w=340,h=80){const key=JSON.stringify([p,p0,w,h]);if(PIC.has(key))return PIC.get(key);let url='';
  try{const D=derive(p),G=layout(D),D0=p0?derive(p0):null,G0=D0?layout(D0):null;const dpr=2,cv=document.createElement('canvas');cv.width=w*dpr;cv.height=h*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);
    const rw=Math.round(w*.24),gw=w-rw-16,RH=E=>Math.max((E.Dc||E.p.d*1.45)*3.2+6,E.p.d*3),heavy=D.have==='trepied'||D.crew>1;
    const L=Math.max(G.Lw*1.06+(D.rocket?30:0),G0?G0.Lw*1.06+(D0.rocket?30:0):0),R=Math.max(RH(D),D0?RH(D0):0),s=Math.min(gw/L,(h-12)/(R*(heavy?7:4.6)));
    const o={bx:8+(D.rocket?10:0),ay:heavy?h*.42:h*.5,s,ground:h-3,t:0};
    if(D0){x.save();x.globalAlpha=.24;drawWeapon(x,D0,{...o,G:G0});x.restore();}drawWeapon(x,D,{...o,G});drawRound(x,D,w-rw-4,6,rw,h-12,{compact:true,labels:false});url=cv.toDataURL();}catch(e){console.error(e);}
  PIC.set(key,url);if(PIC.size>160)PIC.delete(PIC.keys().next().value);return url;}

export function researchUI({world,view,ui,say,esc,ico,costHtml,hours,buildingPane,audio,open,close,draft}){
  const R=()=>ui.R??={tab:'programmes',role:'ingenieur',cand:0,sel:null,confirm:null,picks:{},openP:{}};
  const W=()=>world();
  const pct=x=>Math.round(Math.max(0,Math.min(1,x))*100);
  const gauge=(f,col)=>`<i class="gauge"><i style="width:${pct(f)}%${col?`;background:${col}`:''}"></i></i>`;
  const clock=t=>`j${Math.floor(t/24)+1} ${String(Math.floor(t%24)).padStart(2,'0')}h${String(Math.floor((t%1)*60)).padStart(2,'0')}`;
  const role=r=>ROLES[r]?`<span class="rrole" style="--c:${ROLES[r].col}">${ROLES[r].ico} ${ROLES[r].name}</span>`:'';
  const nameOf=id=>id==='reine'?'La reine':id>0?(W().unit(id)?.name||'?'):'L’équipe du bureau';
  const roleCol=r=>r==='reine'?'#e8bf62':ROLES[r]?.col||'#ccc';
  // une conversation (s.research.talk) : qui, à qui, quoi
  const talkHtml=L=>L.length?`<div class="rtalk">${L.map(l=>{const u=W().unit(l.by);return `<p class="k-${l.k}" style="--c:${roleCol(u?.sci?.role)}"><b>${esc(nameOf(l.by))}</b>${l.to?`<small> → ${esc(nameOf(l.to))}</small>`:''} ${esc(l.text)}</p>`;}).join('')}</div>`:'';
  // la feuille de calculs d'une piste
  const histHtml=H=>H?.length?`<ol class="rhist">${H.map(h=>`<li class="${h.ok?'ok':'ko'}">${h.ok?'✓':'✗'} ${esc(h.val||h.txt)}${h.fx?` <small>${esc(h.fx)}</small>`:''}</li>`).join('')}</ol>`:'';
  const where=u=>{const w=W(),b=w.where(u);if(b)return AU[b.k]||BUILDINGS[b.k].name;const T=u.task;if(T?.kind==='lab'){const tb=w.building(T.b);return tb?'en route '+(AU[tb.k]||'').replace(/^au /,'vers le ').replace(/^à l’/,'vers l’'):'en chemin';}return 'dehors';};
  // les chiffres d'une conception (ce qui compte pour cette arme)
  const numsHtml=p=>{let D;try{D=derive(p);}catch(e){return '';}const n=nums(D),L=[];const add=(k,lbl,v)=>{if(metricOk(k,D))L.push(`<span><small>${lbl}</small><b>${v}</b></span>`);};
    add('range','Portée',dist(n.range));add('moa','Dispersion',`${fmt(n.moa,1)} MOA`);add('lethal','Éclats',`${fmt(n.lethal,1)} m`);add('blast','Souffle',`${fmt(n.blast,1)} m`);add('pen','Perce',`${fmt(n.pen,1)} mm`);
    add('rk','Recul',`${fmt(D.recoil,1)} J`);add('Sg','Stabilité',fmt(D.Sg,2));add('P','Pression',`${Math.round(n.P)} MPa`);add('sustain','Cadence tenue',`${n.sustain}/${n.rpm}`);L.push(`<span><small>Masse</small><b>${n.mass<1?Math.round(n.mass*1000)+' g':fmt(n.mass,1)+' kg'}</b></span>`);
    return `<div class="rnums"><span class="rname">${esc(D.name)}</span>${L.join('')}</div>`;};
  // un effet estimé : la barre (centrée sur zéro), la marge d'erreur de son auteur
  const fxBar=e=>{const r=Math.max(-1,Math.min(1,e.rel)),er=Math.min(1,e.err||0),a=50+Math.min(0,r)*50,wd=Math.abs(r)*50,ea=50+Math.max(-1,Math.min(1,r-er))*50,eb=50+Math.max(-1,Math.min(1,r+er))*50;
    return `<div class="rfx ${e.good?'good':'bad'}"><span>${esc(e.name)}</span><i class="rbar"><i style="left:${a}%;width:${wd}%"></i><i class="rerr" style="left:${Math.min(ea,eb)}%;width:${Math.abs(eb-ea)}%"></i></i><b>${e.rel>0?'+':'−'}${Math.round(Math.abs(e.rel)*100)} %${e.err?`<small> ±${Math.round(e.err*100)}</small>`:''}</b></div>`;};

  // ---------- l'en-tête : le bâtiment, les autres bâtiments de recherche, les onglets ----------
  function head(b){const w=W(),S=R(),L=w.labs(),sv=w.savants();const act=w.s.research.programs.filter(P=>['lancement','actif','pret','suivi'].includes(P.st));
    const nav=L.sort((a,z)=>Object.keys(LAB_KIND).indexOf(a.k)-Object.keys(LAB_KIND).indexOf(z.k)).map(x=>{const n=w.s.units.filter(u=>u.inLab===x.id&&u.k==='savant').length;return `<button class="small ${x.id===b.id?'':'ghost'}" data-r="go:${x.id}" title="${esc(w.cityName(x))}">${esc(BUILDINGS[x.k].name)} <small>${n}/${LAB_SEATS[x.k]}</small></button>`;}).join('');
    const waiting=act.filter(P=>P.meet?.phase==='decision');
    const tabs=[['programmes',`Programmes (${act.length})`],['savants',`Savants (${sv.length})`],['ecole','École'],['art','État de l’art'],['carnet','Carnet'],['batiment','Bâtiment']];
    return `<section class="pane rv"><header class="rv-head"><div><small>Vue recherche · ${esc(w.cityName(b))}</small><b>${esc(BUILDINGS[b.k].name)}</b></div><button class="ghost small" data-r="close" title="Échap">✕ Fermer</button></header>
      <div class="rv-nav">${nav}</div>
      ${waiting.map(P=>`<button class="rv-call" data-r="meet:${P.id}">💬 ${esc(MEETINGS[P.meet.type].name)} de « ${esc(P.name)} » — ${P.meet.props.length} proposition${P.meet.props.length>1?'s':''} attendent votre décision · <b>Assister</b></button>`).join('')}
      <div class="seg tabs">${tabs.map(([k,n])=>`<button class="${S.tab===k?'on':''}" data-r="tab:${k}">${n}</button>`).join('')}</div></section>`;}

  // ---------- Programmes ----------
  const STEPS=['lancement','taches','revue','essai','finale','pret','service'];
  function ribbon(P){const done=P.tasks.filter(t=>t.done>=t.work).length,essai=P.tasks.find(t=>t.ax==='essai');const at=P.st==='lancement'?0:P.st==='pret'?5:P.st==='suivi'||P.st==='fini'?6:P.meet?.type==='finale'?4:essai&&essai.done>0?3:P.meetings.some(m=>m.type==='revue')?2:1;
    const N={lancement:'Lancement',taches:`Tâches ${done}/${P.tasks.length}`,revue:'Revues',essai:'Essai de tir',finale:'Revue finale',pret:'Prête',service:'En service'};
    return `<div class="rribbon">${STEPS.map((k,i)=>`<span class="${i<at?'done':i===at?'cur':''}">${N[k]}</span>`).join('')}</div>`;}
  function taskRow(P,t){const team=t.ids.map(id=>W().unit(id)).filter(Boolean);const f=t.work?t.done/t.work:1;
    return `<div class="rtask ${t.done>=t.work?'done':''} ${t.block?'blk':''}" style="--c:${roleCol(t.role)}"><div><span>${ROLES[t.role]?.ico||''} ${esc(t.label)}</span><small>${t.gap?esc(t.gap):''}</small></div>${gauge(f,t.done>=t.work?'var(--good)':t.block?'var(--red)':null)}
      <small>${t.done>=t.work?`fait${t.res?' — '+esc(t.res):''}`:t.block?`<b class="bad">bloqué : ${esc(t.block.why)}</b>`:t.wait?`<span class="warn">${esc(t.wait)}</span>`:team.map(u=>esc(u.name)).join(', ')||'—'} · ${Math.round(t.done)}/${Math.round(t.work)} h</small></div>`;}
  function leadsHtml(P){const w=W(),L=P.leads||[];if(!L.length)return '<p class="quiet small">Les carnets sont vides : les savants n’ont pas encore pensé à ce programme.</p>';
    const live=L.filter(x=>x.st==='exploration'||x.st==='mure'||x.st==='proposee'),dead=L.filter(x=>!live.includes(x)).slice(-6).reverse();
    const row=x=>`<div class="rlead st-${x.st}" style="--c:${roleCol(x.role)}"><b>${esc(nameOf(x.owner))}</b><span>${esc(GOALS[x.goal]?.name||x.goal)}${x.bold?' · <em>radicale</em>':''} — ${LEAD_ST[x.st]||x.st}</span>${gauge(confOf(x))}
      <small>${esc(x.titleAt?short(x.titleAt):x.edits.length?short(ideaTitle(x,P.p)):'')}${x.notes[0]?` · <i>${esc(x.notes[0])}</i>`:''}</small>${x.hist?.length?`<details class="rcalc"><summary class="small quiet">Ses calculs (${x.hist.length})</summary>${histHtml(x.hist)}</details>`:''}</div>`;
    return `${live.sort((a,z)=>(z.st==='mure')-(a.st==='mure')||z.score-a.score).map(row).join('')||'<p class="quiet small">Aucune piste vivante.</p>'}${dead.length?`<details><summary class="quiet small">${L.length-live.length} piste${L.length-live.length>1?'s':''} close${L.length-live.length>1?'s':''} (retenues, refusées, impasses)</summary>${dead.map(row).join('')}</details>`:''}`;}
  function dirHtml(P){const w=W(),dir=P.dir||{prio:{},frozen:[]};let D;try{D=derive(P.p);}catch(e){return '';}
    const goals=Object.keys(GOALS).filter(g=>metricOk(g,D)),levers=LEVERS.filter(l=>leverOk(l,P.p,D,{})||(dir.frozen||[]).includes(l));
    return `<div class="rdir"><span class="quiet small">Priorités</span>${goals.map(g=>{const v=dir.prio?.[g]||0;return `<button class="chip ${v?'on':''} p${v}" data-r="prio:${P.id}:${g}" title="clic : normal → important → essentiel">${esc(GOALS[g].name)}${v?' '+'★'.repeat(v):''}</button>`;}).join('')}</div>
      <details class="rdir"><summary class="quiet small">Ne pas toucher à… ${(dir.frozen||[]).length?`<b>${dir.frozen.map(l=>esc(LEVER_NAME(l))).join(', ')}</b>`:''}</summary>${levers.map(l=>`<button class="chip ${(dir.frozen||[]).includes(l)?'on bad':''}" data-r="freeze:${P.id}:${l}">${esc(LEVER_NAME(l))}</button>`).join('')}</details>`;}
  function programCard(P){const w=W(),S=R(),M=P.meet,conf=S.confirm===P.id,openP=S.openP[P.id]??true;
    const team=P.team.map(id=>w.unit(id)).filter(u=>u?.k==='savant');
    const meet=M?`<div class="rmeetline ${M.phase==='decision'?'wait':''}"><span>💬 ${esc(MEETINGS[M.type].name)} — ${esc(MEET_PHASES[M.phase]||M.phase)}${M.wave?` (vague ${M.wave+1})`:''} ${AU[w.building(M.b)?.k]||''}${M.phase==='decision'?` · encore ${hours(Math.max(0,M.deadline-w.s.t))}`:''}</span><button class="small ${M.phase==='decision'?'':'ghost'}" data-r="meet:${P.id}">${M.phase==='decision'?'Assister et décider':'Écouter'}</button></div>`:'';
    const acts=[];if(w.canAdopt(P))acts.push(`<button class="small" data-r="adopt:${P.id}">Conception terminée : adopter</button>`);
    if(P.kind==='arme'&&!M&&P.st==='actif')acts.push(`<button class="small ghost" data-r="review:${P.id}">Convoquer une revue</button>`);
    if(P.kind==='arme'&&(P.st==='actif'||P.st==='lancement'||P.st==='suivi'||P.st==='pret'))acts.push(`<label class="small rtog"><input type="checkbox" data-rsel="variants:${P.id}" ${P.variants!==false?'checked':''}> variantes après l’adoption</label>`);
    if(P.st==='actif'||P.st==='lancement')acts.push(`<button class="small ${conf?'bad':'ghost'}" data-r="abandon:${P.id}">${conf?'Confirmer l’abandon ?':'Abandonner'}</button>`);
    return `<article class="rprog st-${P.st}"><header><span class="rst">${ST[P.st]||P.st}${P.parent?' · prototype':''}</span><b>${esc(P.name)}</b><button class="x" data-r="fold:${P.id}">${openP?'▾':'▸'}</button></header>
      ${P.kind==='arme'?`<img class="rpic" src="${portrait(P.p)}" alt="">${numsHtml(P.p)}${ribbon(P)}`:''}${meet}
      ${openP?`<div class="rtasks">${P.tasks.map(t=>taskRow(P,t)).join('')}</div>
      ${P.kind==='arme'?`<h3 class="rsub">Directives</h3>${dirHtml(P)}<h3 class="rsub">Les carnets <small>${(P.leads||[]).filter(x=>x.st==='exploration'||x.st==='mure').length} pistes vivantes</small></h3><div class="rleads">${leadsHtml(P)}</div>`:''}
      <div class="rteam">${team.map(u=>`<span class="rwho" style="--c:${roleCol(u.sci.role)}"><button class="link" data-r="sel:${u.id}">${esc(u.name)}</button> <small>${ROLES[u.sci.role].ico} ${GRADES[gradeOf(u.sci.xp)].name}</small></span>`).join('')||'<span class="quiet small">l’équipe du bureau seule</span>'}</div>
      ${(()=>{const T=(w.s.research.talk||[]).filter(l=>l.pid===P.id).slice(-6);return T.length?`<h3 class="rsub">Ce qu’ils se disent</h3>${talkHtml(T)}`:'';})()}
      <ul class="rev">${P.ev.slice(0,5).map(e=>`<li class="${e.tone}"><time>${clock(e.t)}</time> ${esc(e.txt)}</li>`).join('')}</ul>`:''}
      ${acts.length?`<div class="row wrap">${acts.join('')}</div>`:''}</article>`;}
  function tabProgrammes(){const w=W(),Rs=w.s.research;const live=Rs.programs.filter(P=>['lancement','actif','pret','suivi'].includes(P.st)).sort((a,z)=>(z.kind==='arme')-(a.kind==='arme')||z.t0-a.t0);
    const done=Rs.programs.filter(P=>P.st==='fini'||P.st==='abandon').slice(-6).reverse();const ideas=w.s.innov.ideas;
    return `<section class="pane"><h2>Programmes <small>une conception lancée au bureau d’études devient un programme ; ses savants y pensent, en discutent, proposent — vous tranchez</small></h2>
      ${live.map(programCard).join('')||'<p class="quiet small">Aucun programme. Concevez une arme au bureau d’études, puis « Lancer le programme ».</p>'}</section>
      ${ideas.length?`<section class="pane"><h2>Idées des ouvriers <small>la pratique : de petits programmes, sans réunion</small></h2>${ideas.map(x=>{const I=INNOV.find(y=>y.id===x.id);if(!I)return '';return `<div class="ridea"><div><b>${esc(I.name)}</b><small>${esc(I.text)}</small></div><button class="small" data-r="idea:${I.id}">Lancer</button><button class="x" data-r="drop:${I.id}" title="Écarter">✕</button></div>`;}).join('')}</section>`:''}
      ${done.length?`<section class="pane"><h2>Clos</h2>${done.map(P=>`<p class="small"><b>${esc(P.name)}</b> — ${ST[P.st]} ${P.t1?clock(P.t1):''}${P.meetings?.length?` · ${P.meetings.length} réunion${P.meetings.length>1?'s':''}, ${P.applied.length} proposition${P.applied.length>1?'s':''} retenue${P.applied.length>1?'s':''}`:''}</p>`).join('')}</section>`:''}`;}

  // ---------- Savants, école ----------
  function savantCard(u){const w=W(),S=u.sci,g=gradeOf(S.xp),nx=GRADES[g+1],P=S.pid&&w.program(S.pid),T=S.think,sel=R().sel===u.id;const live=w.s.research.programs.flatMap(x=>x.leads||[]).filter(L=>L.owner===u.id&&(L.st==='exploration'||L.st==='mure'));
    return `<article class="rsav ${sel?'on':''}" style="--c:${roleCol(S.role)}"><header><button class="link" data-r="sel:${u.id}"><b>${esc(u.name)}</b></button>${role(S.role)}<span class="rgrade">${GRADES[g].name}</span></header>
      <label class="small quiet" title="${nx?`${Math.floor(S.xp)} / ${nx.xp} pour ${nx.name.toLowerCase()}`:'au sommet'}">expérience ${gauge(nx?(S.xp-GRADES[g].xp)/(nx.xp-GRADES[g].xp):1,'var(--gold)')}</label>
      <p class="small">${esc(ACT[S.act]||S.act||'—')} — ${esc(where(u))}${P?` · <b>${esc(P.name)}</b>`:''}</p>
      ${T&&w.s.t-T.t<6?`<p class="rthink">💭 ${esc(T.txt)}${T.good?' — <b class="good">mieux !</b>':''}</p>`:''}
      ${sel?talkHtml((w.s.research.talk||[]).filter(l=>l.by===u.id||l.to===u.id).slice(-5)):''}
      ${sel?`<p class="small">${live.length} piste${live.length>1?'s':''} vivante${live.length>1?'s':''}${live.length?' : '+live.map(L=>esc(GOALS[L.goal]?.name||L.goal)+(L.st==='mure'?' (mûre)':'')).join(', '):''} · ${(S.bold??.5)>.6?'audacieux : beaucoup de refontes':(S.bold??.5)<.25?'prudent':'mesuré'} · ${S.papers||0} programme${(S.papers||0)>1?'s':''} abouti${(S.papers||0)>1?'s':''} · savant depuis le ${clock(S.born)}</p>`:''}</article>`;}
  function tabSavants(b){const w=W(),S=R(),L=w.savants().sort((a,z)=>Number(z.id===S.sel)-Number(a.id===S.sel)||Number(w.where(z)===b)-Number(w.where(a)===b)||z.sci.xp-a.sci.xp);
    return `<section class="pane"><h2>Les savants <small>${L.length} · trois métiers : ${Object.values(ROLES).map(r=>r.plural).join(', ')}</small></h2>${L.map(savantCard).join('')||'<p class="quiet small">Aucun savant : formez-en à l’école (onglet École).</p>'}</section>`;}
  function tabEcole(b){const w=W(),S=R(),C=b.k==='centre_recherche'?b:w.labs().find(x=>x.k==='centre_recherche');if(!C)return `<section class="pane"><h2>L’école</h2><p class="warn small">Il faut un centre de recherche : on y forme les savants.</p></section>`;
    const cands=w.schoolCands(C),c=cands[Math.min(S.cand,cands.length-1)]||null,r=w.canTrainSavant(C,S.role,c?.id??null),T=w.teacherOf(C);
    const stu=w.s.units.filter(u=>u.sci&&u.k!=='savant'&&(u.inLab===C.id||(u.task?.kind==='lab'&&u.task.b===C.id)));
    return `<section class="pane"><h2>L’école <small>${esc(w.cityName(C))} · 4 bancs · 24 h</small></h2>
      <div class="seg">${Object.entries(ROLES).map(([k,D])=>`<button class="${S.role===k?'on':''}" data-r="role:${k}" style="--c:${D.col}">${D.ico} ${D.name}</button>`).join('')}</div>
      <p class="small quiet">${esc(ROLES[S.role].name)} : ${esc(ROLES[S.role].what)} — ${esc(AU[ROLES[S.role].at]||'')}.</p>
      ${c?`<p class="small">Élève : <b>${esc(c.name)}</b> <button class="small ghost" data-r="cand:-1">◀</button><button class="small ghost" data-r="cand:1">▶</button> <small class="quiet">${Math.min(S.cand,cands.length-1)+1}/${cands.length}</small></p>`:'<p class="warn small">Aucun villageois disponible.</p>'}
      <div class="row between"><span class="costs">${costHtml(UNITS.savant.cost,w.have('meumeu',C.i+2,C.j+2))}${T?` · <b class="good">${esc(T.u.name)} fait cours (×${T.k.toFixed(1)})</b>`:' · sans maître'}</span><button class="small" data-r="train:${C.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Envoyer à l’école</button></div>
      ${stu.length?`<div class="rstu">${stu.map(u=>`<div class="kv"><span>${ROLES[u.sci.role]?.ico||''} ${esc(u.name)}</span><span style="flex:1;max-width:45%">${u.sci.study?gauge(1-u.sci.study.left/u.sci.study.total):''}</span><small>${u.inLab===C.id&&u.sci.study?hours(Math.max(0,u.sci.study.left)):'en chemin'}</small></div>`).join('')}</div>`:''}</section>`;}

  // ---------- État de l'art, carnet ----------
  function tabArt(){const A=W().s.research.art,rows=[];
    for(const ax of AXES){if(ax.type==='probleme')continue;const ks=Object.keys(A).filter(k=>k===ax.id||k.startsWith(ax.id+':'));for(const k of ks){const v=A[k];const sub=k.includes(':')?' — '+k.split(':')[1]:'';
      rows.push(`<div class="kv"><span>${ROLES[ax.role]?.ico||''} ${esc(ax.name)}${esc(sub)}</span><b>${Array.isArray(v)?v.map(esc).join(', '):ax.unit==='m'?dist(v):fmt(v,v<10?2:0)+' '+esc(ax.unit||'')}</b></div>`);}}
    return `<section class="pane"><h2>L’état de l’art <small>ce que nos armes adoptées ont prouvé — au-delà, chaque conception demande des tâches</small></h2>${rows.join('')||'<p class="quiet small">Rien encore.</p>'}</section>`;}
  function tabCarnet(){const L=W().s.research.log,T=(W().s.research.talk||[]).slice(-60).reverse();return `<section class="pane"><h2>Les conversations <small>ce qu’ils se disent, du plus récent</small></h2>${talkHtml(T)||'<p class="quiet small">Personne n’a encore parlé.</p>'}</section><section class="pane"><h2>Le carnet de laboratoire <small>${L.length} lignes</small></h2>${L.slice(0,150).map(l=>`<div class="logline ${l.tone}"><time>${clock(l.t)}</time>${l.where?`<b>${esc(l.where)}</b>`:''}${esc(l.txt)}</div>`).join('')||'<p class="quiet small">Rien encore.</p>'}</section>`;}

  // ---------- la réunion ----------
  const picks=(pid,M)=>{const S=R();const k=pid+':'+(M?.wave||0)+':'+(M?.props.length||0);if(S.picks[pid]?.k!==k)S.picks[pid]={k,L:[]};return S.picks[pid].L;};
  function card(P,M,c,i,sel){const on=sel.includes(i),conflict=!on&&sel.some(j=>M.props[j]&&conflictOf(M.props[j],c));let p1=null;try{p1=applyEdit(M.p,c.edits);}catch(e){}
    const why=c.origin==='defaut'?`A vu : ${c.why}`:c.origin==='directive'?'Directive de la reine':c.origin==='inspiration'?c.why:c.origin==='reprise'?'Reprend une idée refusée, autrement':c.origin==='compromis'||c.origin==='combinaison'||c.origin==='contre'?c.why:c.why?c.why.charAt(0).toUpperCase()+c.why.slice(1):'';
    const also=c.also?.length?` · arrivé${c.also.length>1?'s':''} au même calcul : ${c.also.map(a=>esc(a.byName)).join(', ')}`:'';
    return `<article class="rcard ${on?'on':''} ${conflict?'off':''} ${c.bold?'bold':''}" style="--c:${roleCol(c.role)}">
      <header><span class="rkind">${c.bold?'Refonte radicale · ':''}${KIND[c.kind]||c.kind}</span><b>${esc(short(c.title))}</b><small>${ROLES[c.role]?.ico||''} ${esc(c.byName)} — ${esc(GRADES[c.grade]?.name.toLowerCase()||'')}${also}</small></header>
      ${p1?`<img class="rc-pic" src="${portrait(p1,M.p,320,72)}" alt="">`:''}
      <ul class="rc-ch">${(c.changes||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <div class="rc-fx">${c.est.length?c.est.slice(0,7).map(fxBar).join(''):'<p class="quiet small">Il n’a rien chiffré.</p>'}</div>
      <div class="rc-conf"><small>confiance</small>${gauge(c.conf,c.conf<.45?'var(--orange)':null)}<small>${c.steps} calcul${c.steps>1?'s':''}${c.exp?`, ${c.exp} au banc`:''}</small></div>
      ${why?`<p class="rc-why">${esc(why)}</p>`:''}
      ${(c.objections||[]).map(o=>`<p class="rc-obj"><b>${esc(o.byName)}</b> : ${esc(o.text)}</p>`).join('')}${(c.supports||[]).map(o=>`<p class="rc-sup"><b>${esc(o.byName)}</b> : ${esc(o.text)}</p>`).join('')}
      <p class="rc-cost small">${c.dWork>0.5?`+${Math.round(c.dWork)} heures-savants`:c.dWork<-.5?`${Math.round(c.dWork)} heures-savants`:'sans travail de plus'}${c.newTasks?.length?' · nouveau : '+c.newTasks.map(esc).join(', ').toLowerCase():''}</p>
      ${c.hist?.length?`<details class="rc-notes"><summary class="small quiet">Ses calculs (${c.steps})</summary>${histHtml(c.hist)}</details>`:''}
      <footer>${M.phase==='decision'?`<button class="small ${on?'':'ghost'}" data-r="mpick:${P.id}:${i}" ${conflict?'disabled title="touche la même chose qu’une proposition déjà retenue"':''}>${on?'✓ Retenue':'Retenir'}</button>`:''}${M.phase==='decision'&&c.lead>0?`<button class="small ${c.deep?'':'ghost'}" data-r="mdeep:${P.id}:${i}" title="Ni retenue ni refusée : son auteur y retourne en priorité, et la représentera">${c.deep?'✓ À creuser':'À creuser'}</button>`:''}<button class="small ghost" data-r="mdraft:${P.id}:${i}">Voir dans le concepteur</button></footer></article>`;}
  function meetModal(pid){const w=W(),P=w.program(+pid);if(!P)return '';const M=P.meet;
    if(!M){const last=P.meetings.at(-1);return `<header class="mhead"><div><b>« ${esc(P.name)} »</b><small>pas de réunion en cours</small></div><button class="ghost" data-act="modal-off">Fermer</button></header><div class="mbody">${last?`<p>Dernière réunion : ${esc(MEETINGS[last.type]?.name||last.type)}, ${clock(last.t)} — ${last.waves} vague${last.waves>1?'s':''}, ${last.seen||0} propositions, retenues : ${last.chosen.length?last.chosen.map(t=>esc(short(t))).join(' ; '):'aucune'}.</p>`:''}<img class="rpic" src="${portrait(P.p)}" alt="">${numsHtml(P.p)}</div>`;}
    const b=w.building(M.b),sel=picks(P.id,M);const who=(M.who||[]).map(x=>`<span class="rwho" style="--c:${roleCol(x.role)}">${ROLES[x.role]?.ico||''} ${esc(x.name)}</span>`).join('');
    const PH=['rassemblement','tour','propositions','debat','decision'];const cur=M.phase==='application'?4:PH.indexOf(M.phase);
    const script=M.script.slice(-40).reverse().map(l=>`<p class="k-${l.k}" style="--c:${roleCol(l.role)}"><b>${esc(nameOf(l.by))}</b> ${esc(l.text)}</p>`).join('');
    const props=M.props.map((c,i)=>card(P,M,c,i,sel)).join('');
    if(R().mini){const l=M.script.at(-1);return `<header class="mhead"><div><b>👑 ${esc(MEETINGS[M.type].name)} — « ${esc(P.name)} »</b><small>${esc(MEET_PHASES[M.phase]||M.phase)}${M.phase==='decision'?` · ${M.props.length} proposition${M.props.length>1?'s':''} attendent votre décision`:''}${l?` · <b>${esc(nameOf(l.by))}</b> : ${esc(l.text)}`:''}</small></div><button data-r="mini:0">Rouvrir la réunion</button><button class="ghost" data-act="modal-off">Quitter</button></header>`;}
    return `<header class="mhead"><div><b>${esc(MEETINGS[M.type].name)} — « ${esc(P.name)} »</b><small>${esc(AU[b?.k]||'')} · vague ${M.wave+1} sur 3 · vous présidez : la reine siège au bout de la table</small></div><button class="ghost" data-r="mini:1" title="Réduire la fenêtre : la réunion dans la vue recherche">👑 Voir la table</button><button class="ghost" data-act="modal-off">Fermer</button></header>
      <div class="mbody rmeet">
        <div class="rribbon">${PH.map((k,i)=>`<span class="${i<cur?'done':i===cur?'cur':''}">${esc(MEET_PHASES[k])}${k==='decision'&&M.wave?` (vague ${M.wave+1})`:''}</span>`).join('')}${M.phase==='application'?'<span class="cur">On redessine</span>':''}</div>
        <div class="rm-top"><figure class="rm-design"><img class="rpic" src="${portrait(M.p,M.chosen.length&&M.p0?M.p0:null)}" alt="">${numsHtml(M.p)}<figcaption class="small quiet">Autour de la table : ${who||'personne encore'}</figcaption>
          ${M.chosen.length?`<p class="small"><b>Déjà retenu :</b> ${M.chosen.map(c=>esc(short(c.title))).join(' ; ')}</p>`:''}</figure>
          <div class="rm-talk">${script||'<p class="quiet">On se rassemble…</p>'}</div></div>
        ${M.phase==='decision'?`<div class="rm-bar"><span>Retenez une ou plusieurs propositions compatibles : elles s’appliquent aussitôt à la conception, et l’équipe rediscute de ce qui reste. <b>${sel.length} sélectionnée${sel.length>1?'s':''}</b> · le chef de projet tranchera dans ${hours(Math.max(0,M.deadline-w.s.t))}</span>
          <button data-r="mdecide:${P.id}" ${sel.length?'':'disabled'}>Retenir la sélection</button><button class="ghost" data-r="mclose:${P.id}">${M.chosen.length?'Clore la réunion':'Ne rien retenir'}</button></div>`:`<p class="rm-bar quiet">${esc(MEET_PHASES[M.phase]||M.phase)}… la décision viendra après le débat.</p>`}
        <div class="rm-cards">${props||'<p class="quiet">Pas encore de proposition sur la table.</p>'}</div></div>`;}

  return {
    pane(b){const S=R();const t=S.tab;let body='';try{body=t==='programmes'?tabProgrammes():t==='savants'?tabSavants(b):t==='ecole'?tabEcole(b):t==='art'?tabArt():t==='carnet'?tabCarnet():buildingPane(b);}catch(e){console.error(e);body=`<p class="bad">${esc(e.message)}</p>`;}
      return head(b)+body;},
    // la fenêtre de la recherche, sans bâtiment de recherche (touche I) : les programmes et l'état de l'art
    modal(){return `<header class="mhead"><div><b>La recherche des Meumeu</b><small>${W().s.research.programs.length} programmes · ${W().s.innov.done.length} innovations</small></div><button class="ghost" data-act="modal-off">Fermer</button></header><div class="mbody">${tabProgrammes()}${tabArt()}</div>`;},
    meetModal,
    pick(uid){const S=R();S.sel=uid;S.tab='savants';},
    // ouvrir la vue recherche : le centre de recherche d'abord ; rend faux s'il n'y a pas de bâtiment de recherche (ou pas de 3D)
    open(tab=null){const L=W().labs();const b=L.find(x=>x.k==='centre_recherche')||L[0];if(!b||!view.g3)return false;if(tab)R().tab=tab;view.enterLab(b);return true;},
    click(arg){const w=W(),S=R(),[k,a,c]=String(arg).split(':');const ok=r=>{if(!r)return;if(r.text)say(r.text,r.ok?'good':'bad');else if(!r.ok)say(r.why?.[0]||'impossible','bad');audio?.play(r.ok?'order':'bad');};S.confirm=k==='abandon'?S.confirm:null;
      if(k==='close'){view.exitLab();return;}
      if(k==='open'){this.open(a||null);return;}
      if(k==='go'){const b=w.building(+a);if(b)view.enterLab(b);return;}
      if(k==='tab'){S.tab=a;return;}
      if(k==='sel'){S.sel=+a;view.labSel=+a;return;}
      if(k==='fold'){S.openP[+a]=!(S.openP[+a]??true);return;}
      if(k==='meet'){S.mini=false;const P=w.program(+a),b=P?.meet&&w.building(P.meet.b);if(b&&view.g3&&view.enterLab)view.enterLab(b);open?.('reunion',+a);return;}
      if(k==='mini'){S.mini=a==='1';return;}
      if(k==='adopt'){ok(w.adoptNow(+a));return;}
      if(k==='review'){ok(w.callReview(+a));return;}
      if(k==='abandon'){if(S.confirm!==+a){S.confirm=+a;return;}S.confirm=null;ok(w.abandonProgram(+a));return;}
      if(k==='prio'){const P=w.program(+a);const v=((P?.dir?.prio?.[c]||0)+1)%3;ok(w.setPriority(+a,c,v));return;}
      if(k==='freeze'){const P=w.program(+a);ok(w.setFrozen(+a,c,!(P?.dir?.frozen||[]).includes(c)));return;}
      if(k==='idea'){ok(w.launchIdea(a));return;}
      if(k==='drop'){w.s.innov.ideas=w.s.innov.ideas.filter(x=>x.id!==a);return;}
      if(k==='role'){S.role=a;return;}
      if(k==='cand'){S.cand=Math.max(0,S.cand+(+a));return;}
      if(k==='train'){const C=w.building(+a);const cands=C?w.schoolCands(C):[];const u=cands[Math.min(S.cand,cands.length-1)];ok(w.trainSavant(C,S.role,u?.id??null));S.cand=0;return;}
      // la réunion : retenir (une vague), clore, voir une proposition dans le concepteur
      if(k==='mpick'){const P=w.program(+a);if(!P?.meet)return;const L=picks(P.id,P.meet),i=+c;const at=L.indexOf(i);if(at>=0)L.splice(at,1);else L.push(i);return;}
      if(k==='mdecide'){const P=w.program(+a);if(!P?.meet)return;const L=picks(P.id,P.meet).slice();const r=w.decide(P.id,L);ok(r);S.picks[P.id]=null;return;}
      if(k==='mdeep'){ok(w.deepenProp(+a,+c));return;}
      if(k==='mclose'){const r=w.closeMeeting(+a);ok(r);return;}
      if(k==='mdraft'){const P=w.program(+a),pr=P?.meet?.props[+c];if(!pr)return;let p;try{p=applyEdit(P.meet.p,pr.edits);}catch(e){return;}close?.();draft?.(p,`${P.name} — ${short(pr.title).slice(0,40)}`);return;}},
    change(arg,value,el){const w=W(),[k,a]=String(arg).split(':');
      if(k==='variants'){const r=w.setVariants(+a,!!el?.checked);if(r.text)say(r.text,r.ok?'good':'bad');return;}},
  };
}
