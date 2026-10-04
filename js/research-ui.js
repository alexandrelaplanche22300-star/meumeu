// Le panneau de la vue recherche (V12.6) : ce que le joueur gère quand le toit est ouvert. Six onglets —
//  Projets : les projets en cours (leurs étapes d'un bâtiment à l'autre, l'équipe, les évènements) et les propositions (lancer un projet, en choisissant
//            l'équipe) ;
//  Savants : l'école (former un villageois dans une discipline) et chaque savant (grade, caractère, moral, fatigue, ce qu'il fait, où ; l'affecter) ;
//  Réunions : convoquer un remue-méninges, un point d'avancement, un colloque, un séminaire ;
//  Carnet : le carnet de laboratoire (tout ce qui s'est passé) ;  Savoir : la pratique de chaque domaine, l'arbre, ce qui est adopté ;
//  Bâtiment : le panneau ordinaire du bâtiment (la production de l'usine chimique, le concepteur du bureau d'études…).
// Le choix d'une équipe, d'une discipline, des convoqués reste dans ui.R (le panneau est redessiné souvent).
import {BUILDINGS,INNOV,DOMAINS,UNITS} from './data.js';
import {DISC,DOM_DISC,DOM_PHASES,PHASES,LAB_KIND,LAB_SEATS,GRADES,gradeOf,TRAITS,MEETINGS,WORK_K} from './researchdata.js';
import {FILLS} from './explosive.js';
import {KIT_PRESETS} from './kitdata.js';

export const MODN={gather_tree:'coupe du bois',gather_rock:'taille de pierre',gather_bush:'cueillette',gather_ore:'extraction à la main',ferme:'moulins',mine:'mines',atelier:'ateliers',carburant_bois:'bois par carburant',cap_porteur:'charge des portettes',cap_train:'charge des trains',vit_train:'vitesse des trains',
  construction:'vitesse de construction',charbon_machines:'charbon des machines',briques:'briqueteries',tender:'tender des locomotives',mur:'solidité des murs',fer_munitions:'fer par caisse',armement:'arsenal et manufacture',napalm:'durée des flaques incendiaires',tir:'précision',garrot:'durée d’un garrot',plasma:'plasma',brancard:'vitesse des brancardiers',antiseptique:'vitesse de l’infection',chirurgie:'vitesse de la chirurgie',creneaux:'tireurs par tour',couvert:'protection des murs',
  ration:'vivres mangés',recherche:'vitesse de la recherche',formation:'vitesse de l’école',poudrerie:'production de l’usine chimique'};
export const unlockName=k=>{const [t,id]=k.split(':');return t==='fill'?`explosif « ${FILLS[id]?.name||id} »`:t==='preset'?`modèle « ${KIT_PRESETS.find(P=>P.id===id)?.design.name||id} »`:k;};
const ACT={consulte:'vient jeter un regard neuf sur une équipe bloquée',etude:'étudie',cours:'fait cours aux élèves',reunion:'en réunion',orateur:'parle en réunion',travail:'travaille',affecte:'presse la production',pause:'à la pause',dort:'s’est endormi',attente:'attend son équipe',oisif:'sans projet',marche:'en chemin'};
const AU={centre_recherche:'au centre de recherche',labo:'au laboratoire',armurerie:'au bureau d’études',poudrerie:'à l’usine chimique'};

export function researchUI({world,view,ui,say,esc,ico,costHtml,hours,buildingPane,audio}){
  const R=()=>ui.R??={tab:'projets',disc:'chimie',cand:0,team:{},mt:'remue',mids:null,mpid:null,sel:null,confirm:null};
  const W=()=>world();
  const pct=x=>Math.round(Math.max(0,Math.min(1,x))*100);
  const gauge=(f,col)=>`<i class="gauge"><i style="width:${pct(f)}%${col?`;background:${col}`:''}"></i></i>`;
  const dname=d=>DISC[d]?`<span class="rdisc" style="--c:${DISC[d].col}">${DISC[d].ico} ${DISC[d].name}</span>`:'';
  const clock=t=>`j${Math.floor(t/24)+1} ${String(Math.floor(t%24)).padStart(2,'0')}h${String(Math.floor((t%1)*60)).padStart(2,'0')}`;
  const where=u=>{const w=W(),b=w.where(u);if(b)return AU[b.k];const T=u.task;if(T?.kind==='lab'){const tb=w.building(T.b);return tb?'en route '+AU[tb.k].replace(/^au /,'vers le ').replace(/^à l’/,'vers l’'):'en chemin';}return 'dehors';};
  const nameOf=id=>W().sci(id)?.name||'?';
  const free=()=>W().savants().filter(u=>!u.sci.pid);
  const defIds=()=>{const S=R(),w=W();if(S.mt==='point')return w.project(S.mpid)?.team||[];const L=w.savants().filter(u=>!u.sci.meet),fr=L.filter(u=>!u.sci.pid);return (fr.length>=MEETINGS[S.mt].min?fr:L).slice(0,8).map(u=>u.id);};
  // l'équipe proposée pour une idée : celle qu'on a choisie, sinon deux savants libres de la bonne discipline (les plus gradés), sinon les plus gradés
  const teamFor=id=>{const S=R();if(S.team[id])return S.team[id].filter(uid=>free().some(u=>u.id===uid));const I=INNOV.find(x=>x.id===id),d=DOM_DISC[I?.dom];
    const L=free().sort((a,z)=>Number(z.sci.disc===d)-Number(a.sci.disc===d)||z.sci.xp-a.sci.xp);return L.filter(u=>u.sci.disc===d).slice(0,2).map(u=>u.id).concat(L.some(u=>u.sci.disc===d)?[]:L.slice(0,1).map(u=>u.id));};
  const etaIdea=(I,ids)=>{const w=W();let r=0;for(const id of ids){const u=w.sci(id);if(u)r+=w.skill(u,DOM_DISC[I.dom],'theorie');}return r>0?I.hours*WORK_K/(r*w.mod('recherche')):Infinity;};
  const fx=X=>`<p class="fx">${Object.entries(X.mod).map(([k,v])=>`<span>${esc(MODN[k]||k)} ${v>=1?'+':'−'}${Math.round(Math.abs(v-1)*100)} %</span>`).join('')}${(X.unlock||[]).map(k=>`<span class="new">ouvre : ${esc(unlockName(k))}</span>`).join('')}</p>`;

  // ---------- l'en-tête : le bâtiment, les autres bâtiments de recherche, le résumé, les onglets ----------
  function head(b){const w=W(),S=R(),L=w.labs();const sv=w.savants(),stu=w.sciAll().filter(u=>u.k!=='savant');const act=w.s.research.projects.filter(P=>P.st==='actif');
    const nav=L.sort((a,z)=>Object.keys(LAB_KIND).indexOf(a.k)-Object.keys(LAB_KIND).indexOf(z.k)).map(x=>{const n=(x.staff||[]).length;return `<button class="small ${x.id===b.id?'':'ghost'}" data-r="go:${x.id}" title="${esc(w.cityName(x))}">${esc(BUILDINGS[x.k].name)} <small>${n}/${LAB_SEATS[x.k]}</small></button>`;}).join('');
    const tabs=[['projets',`Projets (${act.length})`],['savants',`Savants (${sv.length})`],['reunions','Réunions'],['carnet','Carnet'],['savoir','Savoir'],['batiment','Bâtiment']];
    return `<section class="pane rv"><header class="rv-head"><div><small>Vue recherche · ${esc(w.cityName(b))}</small><b>${esc(BUILDINGS[b.k].name)}</b></div><button class="ghost small" data-r="close" title="Échap">✕ Fermer</button></header>
      <div class="rv-nav">${nav}</div>
      <p class="small quiet">${sv.length} savant${sv.length>1?'s':''} · ${stu.length} élève${stu.length>1?'s':''} · ${act.length} projet${act.length>1?'s':''} en cours · ${w.s.innov.ideas.length} proposition${w.s.innov.ideas.length>1?'s':''} · ${w.s.innov.done.length} innovation${w.s.innov.done.length>1?'s':''}</p>
      <div class="seg tabs">${tabs.map(([k,n])=>`<button class="${S.tab===k?'on':''}" data-r="tab:${k}">${n}</button>`).join('')}</div></section>`;}

  // ---------- Projets ----------
  function projectCard(P){const w=W(),S=R(),team=P.team.map(id=>w.sci(id)).filter(Boolean),eta=w.projectEta(P);
    const pipe=P.phases.map((ph,i)=>{const at=BUILDINGS[PHASES[ph.k].at].name;return `<div class="rph ${i<P.ph?'done':i===P.ph?'cur':''}"><span>${PHASES[ph.k].ico} ${PHASES[ph.k].name}${i<P.ph?' ✓':''}</span>${gauge(ph.done/ph.need,i<P.ph?'var(--good)':null)}<small>${esc(at)}</small></div>`;}).join('<span class="rarr">▸</span>');
    const status=P.block?`<b class="bad">Bloqué : ${esc(P.block.why)}.</b> Un point d’avancement aide à s’en sortir.`:P.wait?`<span class="warn">${esc(P.wait)}</span>`:`à cette allure, encore ${isFinite(eta)?hours(eta):'?'}`;
    const chips=team.map(u=>`<span class="rwho" style="--c:${DISC[u.sci.disc].col}">${u.id===P.lead?'★ ':''}<button class="link" data-r="sel:${u.id}">${esc(u.name)}</button> <small>${DISC[u.sci.disc].ico} ${GRADES[gradeOf(u.sci.xp)].name}</small>${u.id!==P.lead?`<button class="x" data-r="lead:${P.id}:${u.id}" title="Chef d’équipe">★</button>`:''}<button class="x" data-r="unassign:${u.id}" title="Retirer de l’équipe">×</button></span>`).join('');
    const fr=free();const add=fr.length?`<select data-rsel="add:${P.id}"><option value="">+ ajouter un savant libre…</option>${fr.map(u=>`<option value="${u.id}">${esc(u.name)} — ${DISC[u.sci.disc].who}, ${GRADES[gradeOf(u.sci.xp)].name.toLowerCase()}</option>`).join('')}</select>`:'';
    const conf=S.confirm===P.id;
    return `<article class="rproj ${P.block?'blk':''}"><header>${dname(P.disc)}<b>${esc(P.name)}</b><small>${P.from?`idée de ${esc(P.from)}`:''}</small></header>
      <div class="rpipe">${pipe}</div><p class="small">${status}</p><div class="rteam">${chips||'<span class="warn small">personne</span>'}</div>
      <div class="row">${add}<button class="small ${P.block?'warn':'ghost'}" data-r="point:${P.id}" title="${esc(MEETINGS.point.text)}">Point d’avancement</button><button class="small ${conf?'bad':'ghost'}" data-r="abandon:${P.id}">${conf?'Confirmer l’abandon ?':'Abandonner'}</button></div>
      <ul class="rev">${P.ev.slice(0,3).map(e=>`<li class="${e.tone}"><time>${clock(e.t)}</time> ${esc(e.txt)}</li>`).join('')}</ul></article>`;}
  function ideaCard(x){const w=W(),S=R(),X=INNOV.find(y=>y.id===x.id);if(!X)return '';const ids=teamFor(x.id),fr=free(),C=w.labs().find(b=>b.k==='centre_recherche');const r=w.canStartProject(x.id,ids);
    const have=C?w.have('meumeu',C.i+2,C.j+2):{};const path=(DOM_PHASES[X.dom]||['theorie','experience']).map(k=>PHASES[k].ico+' '+PHASES[k].name).join(' ▸ ');const eta=etaIdea(X,ids);
    return `<article class="idea"><header><span class="dom">${esc(DOMAINS[X.dom])} · ${DISC[DOM_DISC[X.dom]].ico} ${DISC[DOM_DISC[X.dom]].name}${X.sci?' · savante':''}</span><b>${esc(X.name)}</b></header><p>${esc(X.text)}</p>${fx(X)}
      ${X.needs?.length?`<p class="quiet small">demande : ${X.needs.map(n=>{const ok=w.s.innov.done.includes(n);return `<b class="${ok?'':'warn'}">${esc(INNOV.find(y=>y.id===n)?.name||n)}${ok?' ✓':''}</b>`;}).join(' · ')}</p>`:''}
      <p class="small quiet">${path}</p>
      <div class="rpick">${fr.length?fr.map(u=>`<button class="chip ${ids.includes(u.id)?'on':''}" data-r="tsel:${x.id}:${u.id}" title="${esc(DISC[u.sci.disc].who)}, ${esc(GRADES[gradeOf(u.sci.xp)].name.toLowerCase())}">${DISC[u.sci.disc].ico} ${esc(u.name)}</button>`).join(''):'<span class="quiet small">aucun savant libre</span>'}</div>
      <div class="row between"><span class="costs">${costHtml(X.cost,have)}${ids.length&&isFinite(eta)?` · ≈ ${hours(eta)}`:''}</span><span><button class="small ghost" data-r="drop:${x.id}">Écarter</button> <button class="small" data-r="start:${x.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Lancer le projet</button></span></div>
      ${x.who?`<small class="who">idée de <b>${esc(x.who.name||x.who)}</b>${x.src==='savant'?', savant':x.who.k?', '+esc(UNITS[x.who.k]?.name.toLowerCase()||''):''}</small>`:''}</article>`;}
  function tabProjets(){const w=W(),act=w.s.research.projects.filter(P=>P.st==='actif'),done=w.s.research.projects.filter(P=>P.st==='fini').slice(-5).reverse();
    const noCentre=!w.labs().some(b=>b.k==='centre_recherche');
    return `<section class="pane"><h2>Projets en cours <small>une étape par bâtiment : théorie au centre, expériences au laboratoire, plans au bureau d’études, essai à l’usine chimique</small></h2>
      ${act.map(projectCard).join('')||'<p class="quiet small">Aucun projet. Choisissez une proposition ci-dessous et son équipe.</p>'}</section>
      <section class="pane"><h2>Propositions <small>${w.s.innov.ideas.length} — des ouvriers (la pratique) et des savants (réunions, rêveries)</small></h2>${noCentre?'<p class="warn small">Il faut un centre de recherche pour lancer un projet.</p>':''}
      <div class="ideas">${w.s.innov.ideas.map(ideaCard).join('')||'<p class="quiet small">Pas de proposition : travaillez (les ouvriers ont des idées), ou réunissez les savants en remue-méninges.</p>'}</div></section>
      ${done.length?`<section class="pane"><h2>Derniers aboutis</h2>${done.map(P=>`<p class="small"><b>${esc(P.name)}</b> — ${clock(P.t1)}, en ${hours(P.t1-P.t0)}${w.s.research.boost[P.ref]?' · <b class="good">percée</b>':''}</p>`).join('')}</section>`:''}`;}

  // ---------- Savants ----------
  function trainBox(b){const w=W(),S=R(),C=b.k==='centre_recherche'?b:w.labs().find(x=>x.k==='centre_recherche');if(!C)return `<section class="pane"><h2>L’école</h2><p class="warn small">Il faut un centre de recherche : on y forme les savants.</p></section>`;
    const cands=w.schoolCands(C,S.disc),c=cands[Math.min(S.cand,cands.length-1)]||null,r=w.canTrainSavant(C,S.disc,c?.u.id??null),T=w.teacherOf(C),stu=(C.staff||[]).filter(u=>u.k!=='savant'),walk=w.s.units.filter(u=>u.task?.kind==='lab'&&u.task.study&&u.task.b===C.id);
    return `<section class="pane"><h2>L’école <small>${esc(w.cityName(C))} · 4 bancs</small></h2>
      <div class="seg">${Object.entries(DISC).map(([k,D])=>`<button class="${S.disc===k?'on':''}" data-r="disc:${k}" style="--c:${D.col}">${D.ico} ${D.name}</button>`).join('')}</div>
      ${c?`<p class="small">Élève : <b>${esc(c.u.name)}</b>${c.metier?`, ${esc(c.metier)}`:', sans métier'}${c.prat?` — <b class="good">praticien : il gardera son savoir-faire (+25 % en ${DISC[S.disc].name.toLowerCase()})</b>`:''} <button class="small ghost" data-r="cand:-1">◀</button><button class="small ghost" data-r="cand:1">▶</button> <small class="quiet">${Math.min(S.cand,cands.length-1)+1}/${cands.length}</small></p>`:'<p class="warn small">Pas de villageois disponible dans cette ville.</p>'}
      <div class="row between"><span class="costs">${costHtml(UNITS.savant.cost,w.have('meumeu',C.i+2,C.j+2))} · 24 h d’école${T?` · <b class="good">${esc(T.u.name)} fait cours (×${T.k.toFixed(1)})</b>`:' · sans maître'}</span><button class="small" data-r="train:${C.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Envoyer à l’école</button></div>
      ${stu.length||walk.length?`<div class="rstu">${stu.map(u=>`<div class="kv"><span>${DISC[u.sci.disc].ico} ${esc(u.name)} <small class="quiet">${esc(DISC[u.sci.disc].who)}</small></span><span style="flex:1;max-width:45%">${gauge(1-u.sci.study.left/u.sci.study.total)}</span><small>${hours(Math.max(0,u.sci.study.left))}</small></div>`).join('')}${walk.map(u=>`<div class="kv quiet small"><span>${esc(u.name)}</span><span>en route vers l’école</span></div>`).join('')}</div>`:''}</section>`;}
  function savantCard(u,full){const w=W(),S=u.sci,g=gradeOf(S.xp),nx=GRADES[g+1],P=S.pid&&w.project(S.pid),b=w.where(u),D=DISC[S.disc];
    const traits=S.traits.map(t=>`<span class="rtrait" title="${esc(TRAITS[t].text)}">${esc(TRAITS[t].name)}</span>`).join('')+(S.prat?`<span class="rtrait prat" title="Il a gardé le savoir-faire de son ancien métier : +25 % dans sa discipline.">Ancien ${esc(S.metier)}</span>`:'');
    const act=S.act||'oisif';const L=w.labs().filter(x=>x!==b);
    let more='';if(full){const others=w.savants().filter(o=>o!==u).map(o=>({o,a:w.aff(u,o)})).sort((a,z)=>z.a-a.a);const best=others[0],worst=others[others.length-1];
      more=`<p class="small">${S.papers||0} publication${(S.papers||0)>1?'s':''} · savant depuis le ${clock(S.born)}${best&&best.a>.15?` · s’entend bien avec <b>${esc(best.o.name)}</b>`:''}${worst&&worst.a<-.2?` · <b class="warn">rival de ${esc(worst.o.name)}</b>`:''}</p>`;}
    return `<article class="rsav ${R().sel===u.id?'on':''}" style="--c:${D.col}"><header><button class="link" data-r="sel:${u.id}"><b>${esc(u.name)}</b></button><span>${D.ico} ${esc(D.who)}</span><span class="rgrade">${GRADES[g].name}</span></header>
      <div class="rbars"><label>moral ${gauge(S.mor,S.mor<.4?'var(--red)':null)}</label><label>fatigue ${gauge(S.fat,S.fat>.6?'var(--orange)':'#8a9aa0')}</label><label title="${nx?`${Math.floor(S.xp)} / ${nx.xp} pour ${nx.name.toLowerCase()}`:'au sommet'}">expérience ${gauge(nx?(S.xp-GRADES[g].xp)/(nx.xp-GRADES[g].xp):1,'var(--gold)')}</label></div>
      <div class="rtraits">${traits}</div>
      <p class="small">${esc(ACT[act]||act)} — ${esc(where(u))}${P?` · <b>${esc(P.name)}</b>${P.lead===u.id?' (chef)':''}`:''}</p>${more}
      ${!S.pid&&L.length?`<select data-rsel="move:${u.id}"><option value="">Affecter…</option>${L.map(x=>`<option value="${x.id}" ${w.seatsFree(x)>0?'':'disabled'}>${esc(BUILDINGS[x.k].name)} — ${esc(w.cityName(x))} (${(x.staff||[]).filter(o=>o.k==='savant').length}/${LAB_SEATS[x.k]})</option>`).join('')}</select>`:''}</article>`;}
  function tabSavants(b){const w=W(),S=R(),L=w.savants().sort((a,z)=>Number(z.id===S.sel)-Number(a.id===S.sel)||Number(w.where(z)===b)-Number(w.where(a)===b)||z.sci.xp-a.sci.xp);
    return trainBox(b)+`<section class="pane"><h2>Les savants <small>${L.length} · cliquez un savant dans le bâtiment pour sa fiche</small></h2>${L.map(u=>savantCard(u,u.id===S.sel)).join('')||'<p class="quiet small">Aucun savant : formez-en à l’école.</p>'}</section>`;}

  // ---------- Réunions ----------
  function tabReunions(b){const w=W(),S=R(),C=b.k==='centre_recherche'?b:w.labs().find(x=>x.k==='centre_recherche');if(!C)return `<section class="pane"><h2>Réunions</h2><p class="warn small">Les réunions se tiennent autour de la grande table d’un centre de recherche.</p></section>`;
    const M=C.meet;const all=w.savants();const D=MEETINGS[S.mt];
    const ids=S.mids||defIds();
    const act=w.s.research.projects.filter(P=>P.st==='actif');const r=w.canMeet(C,S.mt,ids,S.mpid);
    const cur=M?`<section class="pane"><h2>En séance <small>${esc(MEETINGS[M.type].name)}</small></h2><p class="small">${M.ids.map(nameOf).map(esc).join(', ')}${M.wait?' — <span class="warn">on attend ceux qui arrivent</span>':''}</p>${gauge(1-M.left/M.total)}<div class="row"><button class="small ghost" data-r="mcancel:${C.id}">Lever la séance</button></div></section>`:'';
    return cur+`<section class="pane"><h2>Convoquer <small>${esc(w.cityName(C))}</small></h2><div class="seg">${Object.entries(MEETINGS).map(([k,m])=>`<button class="${S.mt===k?'on':''}" data-r="mt:${k}">${m.name}</button>`).join('')}</div>
      <p class="small quiet">${esc(D.text)} ${D.hours} h.</p>
      ${S.mt==='point'?`<select data-rsel="mpid"><option value="">Quel projet ?</option>${act.map(P=>`<option value="${P.id}" ${P.id===S.mpid?'selected':''}>${esc(P.name)}${P.block?' (bloqué)':''}</option>`).join('')}</select>`:''}
      <div class="rpick">${all.map(u=>`<button class="chip ${ids.includes(u.id)?'on':''}" data-r="mtog:${u.id}" ${u.sci.meet?'disabled title="déjà en réunion"':''}>${DISC[u.sci.disc].ico} ${esc(u.name)}</button>`).join('')||'<span class="quiet small">aucun savant</span>'}</div>
      <div class="row between"><small class="quiet">${ids.length} convoqué${ids.length>1?'s':''} — leurs projets attendent pendant la séance</small><button class="small" data-r="meet:${C.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Convoquer</button></div></section>`;}

  // ---------- Carnet, Savoir ----------
  function tabCarnet(){const L=W().s.research.log;return `<section class="pane"><h2>Le carnet de laboratoire <small>${L.length} lignes</small></h2>${L.slice(0,120).map(l=>`<div class="logline ${l.tone}"><time>${clock(l.t)}</time>${l.where?`<b>${esc(l.where)}</b>`:''}${esc(l.txt)}</div>`).join('')||'<p class="quiet small">rien encore</p>'}</section>`;}
  function tabSavoir(){const w=W(),I=w.s.innov,B=w.s.research.boost;
    const doms=Object.entries(DOMAINS).map(([k,n])=>{const p=I.prac[k]||0,nx=I.next[k]||14;const left=INNOV.filter(x=>x.dom===k&&!x.sci&&!I.done.includes(x.id)).length,sci=INNOV.filter(x=>x.dom===k&&x.sci&&!I.done.includes(x.id)).length;return `<div class="dm"><span>${esc(n)}</span>${gauge(nx>=1e8?1:p/nx)}<small>${nx>=1e8?'plus d’idée par la pratique':left?`${left} par la pratique`:'pratique épuisée'}${sci?` · ${sci} pour les savants`:''}</small></div>`;}).join('');
    return `<section class="pane"><h2>Ce qu’on pratique <small>à force de travailler, les ouvriers ont des idées ; les découvertes savantes ne viennent que des savants</small></h2><div class="doms">${doms}</div></section>
      <section class="pane"><h2>L’arbre <small>ce qui demande une découverte préalable</small></h2>${INNOV.filter(x=>x.needs?.length).map(x=>{const st=I.done.includes(x.id)?'<b>acquise</b>':x.needs.every(n=>I.done.includes(n))?'<b class="good">à trouver</b>':'<b class="warn">verrouillée</b>';return `<div class="rtree"><b>${esc(x.name)}${x.sci?' ⚗':''}</b><span>${st}</span><small class="quiet">demande ${x.needs.map(n=>(I.done.includes(n)?'✓ ':'✗ ')+esc(INNOV.find(y=>y.id===n)?.name||n)).join(' · ')}</small></div>`;}).join('')}</section>
      <section class="pane"><h2>Adoptées <small>${I.done.length}</small></h2><div class="ideas done">${I.done.map(id=>{const X=INNOV.find(y=>y.id===id);return X?`<article class="idea"><header><span class="dom">${esc(DOMAINS[X.dom])}${B[id]?' · <b class="good">percée ×1,5</b>':''}</span><b>${esc(X.name)}</b></header><p>${esc(X.text)}</p>${fx(X)}</article>`:'';}).join('')||'<p class="quiet small">aucune encore</p>'}</div></section>`;}

  return {
    pane(b){const S=R();const t=S.tab;let body='';try{body=t==='projets'?tabProjets():t==='savants'?tabSavants(b):t==='reunions'?tabReunions(b):t==='carnet'?tabCarnet():t==='savoir'?tabSavoir():buildingPane(b);}catch(e){console.error(e);body=`<p class="bad">${esc(e.message)}</p>`;}
      return head(b)+body;},
    // la modale du savoir (touche I quand aucun bâtiment de recherche n'existe encore)
    modal(){return `<header class="mhead"><div><b>Le savoir des Meumeu</b><small>${W().s.innov.done.length} innovations · ${W().s.innov.ideas.length} propositions</small></div><button class="ghost" data-act="modal-off">Fermer</button></header><div class="mbody">${tabSavoir()}</div>`;},
    pick(uid){const S=R();S.sel=uid;S.tab='savants';},
    // ouvrir la vue recherche : le centre de recherche d'abord ; rend faux s'il n'y a pas de bâtiment de recherche (ou pas de 3D)
    open(tab=null){const L=W().labs();const b=L.find(x=>x.k==='centre_recherche')||L[0];if(!b||!view.g3)return false;if(tab)R().tab=tab;view.enterLab(b);return true;},
    click(arg){const w=W(),S=R(),[k,a,c]=String(arg).split(':');const ok=r=>{if(!r)return;if(r.text)say(r.text,r.ok?'good':'bad');else if(!r.ok)say(r.why?.[0]||'impossible','bad');audio?.play(r.ok?'order':'bad');};S.confirm=k==='abandon'?S.confirm:null;
      if(k==='close'){view.exitLab();return;}
      if(k==='open'){this.open(a||null);return;}
      if(k==='go'){const b=w.building(+a);if(b)view.enterLab(b);return;}
      if(k==='tab'){S.tab=a;return;}
      if(k==='sel'){S.sel=+a;view.labSel=+a;return;}
      if(k==='start'){const r=w.startProject(a,teamFor(a));ok(r.ok?{ok:true,text:r.text}:r);if(r.ok)delete S.team[a];return;}
      if(k==='tsel'){const cur=teamFor(a),uid=+c;S.team[a]=cur.includes(uid)?cur.filter(x=>x!==uid):[...cur,uid];return;}
      if(k==='drop'){w.dropIdea(a);delete S.team[a];return;}
      if(k==='unassign'){ok(w.assignSavant(+a,null));return;}
      if(k==='lead'){ok(w.setLead(+a,+c));return;}
      if(k==='abandon'){if(S.confirm!==+a){S.confirm=+a;return;}S.confirm=null;ok(w.abandonProject(+a));return;}
      if(k==='point'){const P=w.project(+a);const C=w.labs().filter(b=>b.k==='centre_recherche').sort((x,z)=>Number(!!x.meet)-Number(!!z.meet))[0];if(!P||!C){say('Il faut un centre de recherche libre.','bad');return;}ok(w.meet(C,'point',P.team,P.id));return;}
      if(k==='disc'){S.disc=a;S.cand=0;return;}
      if(k==='cand'){S.cand=Math.max(0,S.cand+(+a));return;}
      if(k==='train'){const C=w.building(+a);const cands=C?w.schoolCands(C,S.disc):[];const c=cands[Math.min(S.cand,cands.length-1)];ok(w.trainSavant(C,S.disc,c?.u.id??null));S.cand=0;return;}
      if(k==='mt'){S.mt=a;S.mids=null;return;}
      if(k==='mtog'){const ids=S.mids||defIds();const uid=+a;S.mids=ids.includes(uid)?ids.filter(x=>x!==uid):[...ids,uid];return;}
      if(k==='meet'){const C=w.building(+a);const ids=S.mids||defIds();const r=w.meet(C,S.mt,ids,S.mpid);ok(r);if(r.ok)S.mids=null;return;}
      if(k==='mcancel'){const C=w.building(+a);if(C)w.cancelMeet(C,'levée');return;}},
    change(arg,value){const w=W(),S=R(),[k,a]=String(arg).split(':');if(value===''||value==null)return;
      if(k==='add'){const r=w.assignSavant(+value,+a);if(r.text)say(r.text,r.ok?'good':'bad');return;}
      if(k==='move'){const r=w.moveSavant(+a,+value);if(r.text||!r.ok)say(r.text||r.why[0],r.ok?'good':'bad');return;}
      if(k==='mpid'){S.mpid=+value;S.mids=null;return;}},
  };
}
