// Oberkommando der Meumeu — l'interface. La boucle, le panneau, la barre de construction, la minicarte, les alertes, le son,
// les radiographies, le bureau d'études, le service de santé, les idées des Meumeu, l'économie.
import {SITE_RANGE,CARRY,HOUR_REAL,DAY,RES,RARE,GOODS,BUILDINGS,BUILD_ORDER,BUILD_CATS,UNITS,VEHICLES,LINES,BEEE,GOAL,RADIUS,RECIPES,PRODUCTS,FAMILIES,PRIO,FRET,LIMIT_OF,INNOV,DOMAINS,STEPS,NODES} from './data.js';
import {World} from './world.js';
import {loadManifest,manifest} from './sprites.js';
import {View,AMMO_SVG,ARM_SVG} from './view.js';
import {Audio} from './audio.js';
import {XRay,XRoom,BodyView} from './xray.js';
import {Designer} from './designer.js';
import {Armorer} from './armorer.js';
import {deriveArmor,ZONES,MATS} from './armor.js';
import {REGIONS,PARTS,BLOOD,setSpecies} from './body.js';
import {bleedRate,bleedFactor,SEV,vitals,triage,needsSurgery,needsCare,TQ_LIMIT,SEPSIS,MED} from './health.js';
import {derive,fmt} from './ballistics.js';
import {FILLS} from './explosive.js';
import {KIT_PRESETS} from './kitdata.js';
import {rankOf,DRILL_MAX} from './war.js';
import {layout,drawWeapon,drawRound} from './gunart.js';
import {FixedClock} from './clock.js';
import {resumeWorld} from './persistence.js';
import {operationUI} from './operations-ui.js';
import {VEHDEF} from './vehicules.js';

const $=s=>document.querySelector(s);
// Une erreur de démarrage ne doit plus laisser une fenêtre muette : elle est
// visible dans la barre d'état et reste aussi dans la console d'Electron.
const bootError=e=>{
  const msg=e?.reason?.stack||e?.error?.stack||e?.message||String(e);
  console.error('Erreur de démarrage du rendu',msg);
  const status=document.querySelector('#status');
  if(status){status.textContent='Erreur de rendu : '+String(msg).slice(0,180);status.title=String(msg);}
};
window.addEventListener('error',bootError);
window.addEventListener('unhandledrejection',bootError);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n0=v=>Math.floor(v+1e-6);
const n1=v=>v>=10?String(n0(v)):fmt(Math.floor(v*10+1e-6)/10,1);
const TENT_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M6 50 L32 14 L58 50 Z" fill="#f3eee4" stroke="#6b5a48" stroke-width="2"/><path d="M32 14 L58 50 L44 50 Z" fill="#d9d2c4" stroke="#6b5a48" stroke-width="2"/><path d="M28 50 L32 36 L36 50 Z" fill="#6b5a48"/><rect x="18" y="33" width="10" height="3.6" fill="#c62828"/><rect x="21.2" y="29.8" width="3.6" height="10" fill="#c62828"/></svg>');
const SHIELD_SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#7d8a8c" stroke="#2e3a3d" stroke-width="2"/><path d="M16 6 L24 9 V15 C24 20 20.5 24 16 26 Z" fill="#a9b6b8"/></svg>');
const ico=k=>{if(k.startsWith('m:'))return `<img class="ico" src="${AMMO_SVG}" alt="" title="${esc(world.goodName(k))}">`;if(k.startsWith('a:'))return `<img class="ico" src="${ARM_SVG}" alt="" title="${esc(world.goodName(k))}">`;
  if(k.startsWith('p:'))return `<img class="ico" src="${SHIELD_SVG}" alt="" title="${esc(world.goodName(k))}">`;if(!RES[k])return `<span class="ico" title="${esc(k)}">•</span>`;
  const [kind,name]=RES[k].icon;return `<img class="ico" src="assets/${kind==='p'?'p/'+name+'.webp':'r/'+name+'.webp'}" alt="" title="${RES[k].name}">`;};
const costHtml=(cost,have)=>Object.entries(cost).map(([k,n])=>`<span class="cost ${have&&(have[k]||0)<n-1e-6?'miss':''}">${ico(k)}${n<1?fmt(n,2):n1(n)}</span>`).join('')||'<span class="quiet">gratuit</span>';
const hours=h=>h<1?Math.round(h*60)+' min':h<48?Math.round(h)+' h':(h/DAY).toFixed(1)+' j';
const secs=s=>s<90?Math.round(s)+' s':Math.round(s/60)+' min';
const SEVC=['#9aa','#6f9f78','#c9a340','#e08a3a','#d8603a','#c2352a','#a0122a'];
const STATE={ok:'indemne',blesse:'blessé',hors:'hors de combat',mort:'mort'};
const bthumb=k=>{const B=BUILDINGS[k];if(k==='tente')return TENT_SVG;const p=manifest?.buildings?.[B.sprite]?.[2];return p?'assets/'+p:'';};

let world=resumeWorld(World);
const audio=new Audio();
const ui={zoneN:6,zoneHigh:true,speed:1,panelAt:0,lastPanel:'',pick:null,trainW:{},trainA:{},trainRole:{},bb:true,bbCat:'vivre',modal:null};
const view=new View($('#view'),world,{
  describe:t=>describe(t),
  pickOperation:(w,button)=>ops.map(w,button),
  unitLabel:u=>unitLabel(u),
  unitInfo:u=>openFiche(u.id),
  zoneAt:(w,keep)=>{const r=world.zoneFire([...view.sel],w.x,w.y,{n:ui.zoneN||Infinity,high:ui.zoneHigh});say(r.ok?r.text:r.why[0],r.ok?'':'bad');audio.play(r.ok?'order':'bad');view.marks.push({x:w.x,y:w.y,age:0,bad:!r.ok});renderPanel(true);return r;},
  order:(ids,t)=>{const r=world.order(ids,t);say(r.ok?r.text:r.why[0],r.ok?'':'bad');audio.play(r.ok?'order':'bad');if(r.ok){const u=world.unit(ids[0]);if(u)audio.play('ack',null,{f:u.f,n:ids.length});}renderPanel(true);return r;},
  place:(k,i,j,rot=0)=>{const r=world.place('meumeu',k,i,j,rot);if(!r.ok){say(r.why[0],'bad');audio.play('bad');return r;}
    // ceux qu'on a choisis y vont ; sinon, les villageois oisifs les plus proches
    let vil=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.k==='villageois');const B=BUILDINGS[k];
    if(!vil.length)vil=world.idle().filter(u=>Math.hypot(u.x-i,u.y-j)<45).sort((a,b)=>Math.hypot(a.x-i,a.y-j)-Math.hypot(b.x-i,b.y-j)).slice(0,B.size[0]*B.size[1]>=9?4:3);
    if(vil.length)world.order(vil.map(u=>u.id),{type:'building',id:r.b.id});
    // la fiche du chantier s'ouvre : ce qu'il lui faut, qui y travaille, d'où viennent les matériaux
    view.sel.clear();view.selV=null;view.selB=r.b.id;
    say(`${B.name} posé${vil.length?` : ${vil.length} villageois ${view.sel.size?'y vont':'oisifs y vont d’eux-mêmes'}`:' — aucun villageois libre : choisissez-en, clic droit sur le chantier'}.`,'good');audio.play('order');renderPanel(true);return r;},
  planLine:(kind,cells)=>{if(kind==='gomme'){let n=0;const N=world.N;for(const [i,j] of cells){const k=j*N+i;n+=world.cancelLine('meumeu','rail',k)+world.cancelLine('meumeu','mur',k)+world.cancelLine('meumeu','sacs',k)+world.cancelLine('meumeu','fosses',k)+world.cancelLine('meumeu','mines',k);}
      say(n?`Tracé annulé : ${n} case${n>1?'s':''} prévue${n>1?'s':''} retirée${n>1?'s':''} ; ce qui était payé revient au dépôt.`:'Aucun tracé prévu ici (seules les cases pas encore bâties s’annulent).',n?'good':'bad');renderPanel(true);return;}
    // une voie trouée ne servirait à rien : on ne la pose pas, on dit pourquoi
    if(kind==='rail'){const N=world.N;const ok=new Set(world.canLine('meumeu','rail',cells));const bad=cells.filter(([i,j])=>!ok.has(j*N+i)&&!world.rail[j*N+i]).length;
      if(bad){say(`Voie impossible : ${bad} case${bad>1?'s':''} barrée${bad>1?'s':''} (roc, eau, bâtiment, filon). Tracez vers une case libre : la voie contourne d’elle-même ce qui la gêne.`,'bad');return;}}
    const r=world.planLine('meumeu',kind,cells);if(!r.ok){say('rien à poser là','bad');return;}let vil=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.k==='villageois');
    const [i,j]=cells[0];if(!vil.length)vil=world.idle().filter(u=>Math.hypot(u.x-i,u.y-j)<45).slice(0,4);if(vil.length)world.order(vil.map(u=>u.id),{type:kind==='rail'?'rail':kind==='sacs'||kind==='fosses'?'sacs':kind==='mines'?'mines':kind==='piste'?'piste':'wall',k:j*world.N+i});
    say(`${LINES[kind].name} : ${r.n} cases en plan · ${Object.entries(r.cost).map(([k,v])=>v+' '+RES[k].name.toLowerCase()).join(', ')}, payés case par case${vil.length?` · ${vil.length} villageois y vont`:' — envoyez des villageois (clic droit sur le tracé)'}.`);},
  inspect:t=>{ui.inspect=t;},
  // à la sélection, ils répondent « meu ? » (« bè ? » si l'on clique un Bèè) ; à l'ordre, « meu ! »
  changed:()=>{ui.pick=null;const sig=[...view.sel].join(',');if(sig&&sig!==ui.selSig){const u=world.unit([...view.sel][0]);if(u)audio.play('select',null,{f:u.f,n:view.sel.size});}ui.selSig=sig;renderPanel(true);},
  rally:w=>{const b=world.building(view.selB);if(b&&b.f==='meumeu'){b.rally=[w.x,w.y];say('Point de ralliement posé.');view.marks.push({x:w.x,y:w.y,age:0});}},
  vehicleOrder:w=>vehicleOrder(w),
  groupVehicleOrder:(ids,w)=>groupVehicleOrder(ids,w),
  vehicleHint:w=>{const v=world.s.vehicles.find(x=>x.id===view.selV);return v?.k==='bombardier'?'clic droit : bombarder ici':null;},
  get pickStop(){return ui.pick?pickStop:null;}});
const ops=operationUI({world:()=>world,view,ui,say,open:openModal,close:()=>{ui.modal=null;renderModal();},speed:setSpeed});
const room=new XRoom($('#xroom'));const body3d=new BodyView();
const xray=new XRay($('#xray'),{onGo:(x,y)=>view.lookAt(x,y),room,onFiche:id=>openFiche(id),hostL:$('#xrayL')});
const designer=new Designer($('#dz'),{world:()=>world,
  bureau:()=>{const b=world.building(view.selB);if(b?.k==='armurerie'&&b.f==='meumeu'&&b.done)return b;return world.s.buildings.find(x=>x.k==='armurerie'&&x.f==='meumeu'&&x.done&&!x.proto)||null;},
  propose:(p,name)=>{const b=designer.bureau();if(!b)return {ok:false,why:['un bureau d’études']};const r=world.propose(b,name,p);if(r.ok){audio.play('built');say(r.text,'good');}return r;},
  ico,goodName:k=>world.goodName(k),toArmor:()=>armorer.show('gilet')});
const armorer=new Armorer($('#dz'),{world:()=>world,bureau:()=>designer.bureau(),ico,toWeapons:()=>designer.show('mle1'),onClose:()=>{if(ui.dzSpeed!=null){setSpeed(ui.dzSpeed);ui.dzSpeed=null;}renderPanel(true);}});
designer.close=(orig=>function(){orig.call(this);if(ui.dzSpeed!=null){setSpeed(ui.dzSpeed);ui.dzSpeed=null;}renderPanel(true);})(designer.close);
// le temps s'arrête pendant qu'on conçoit ; la vitesse d'avant n'est gardée qu'une fois (un second appel ne l'écrase pas)
function pauseForBureau(){if(ui.dzSpeed==null){ui.dzSpeed=ui.speed;setSpeed(0);}}
function resumeAfterBureau(){if(ui.dzSpeed!=null&&designer.host.hidden){setSpeed(ui.dzSpeed);ui.dzSpeed=null;}renderPanel(true);}
function openDesigner(from){pauseForBureau();designer.show(from);}
function openArmorer(from){pauseForBureau();armorer.show(from);}

// ---------- les mots ----------
function unitName(u){const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];return u.name||D.name;}
function unitLabel(u){const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];const st=u.h?(u.h.state==='ok'?'':STATE[u.h.state]+(u.h.state==='hors'&&u.h.cause?` (${u.h.cause})`:'')):'';
  const w=u.w?world.design(u.w)?.name:'';const tr=u.h&&u.f==='meumeu'&&u.h.state!=='ok'?triage(u.h).label:'';return [u.f==='beee'?D.name:`${unitName(u)} · ${D.name.toLowerCase()}`,st,tr,w].filter(Boolean).join(' · ');}
function describe(t){if(!t)return null;const peace=!world.atWar;
  if(t.type==='fauna'){const a=world.s.fauna.find(a=>a.id===t.id);return a?.kind==='belier'?'Bélier sauvage · troupeau dangereux · envoyer un chasseur armé':`${a?.kind==='lapin'?'Lièvre':'Biche'} · capturer avec un villageois ou chasser avec un chasseur armé`;}
  if(t.type==='carcass')return 'Carcasse · envoyer villageois ou chasseur rapporter les vivres au dépôt';
  if(t.type==='unit'){const u=world.unit(t.id);if(!u)return null;if(u.f==='beee')return `attaquer : ${BEEE.units[u.k].name.toLowerCase()}${peace?' — ce sera la guerre':''}`;if(u.h&&needsCare(u.h))return 'soigner (un infirmier, un médecin)';if(u.h?.state==='hors')return 'aller chercher le blessé';return null;}
  if(t.type==='building'){const b=world.building(t.id);const B=BUILDINGS[b.k];if(b.f==='beee')return `à l’assaut : ${B.name.toLowerCase()} bèè${peace?' — ce sera la guerre':''}`;if(!b.done)return `${b.ruin?'rebâtir':'bâtir'} : ${B.name.toLowerCase()}${b.why?' · '+b.why:''}`;
    if(b.fire>0||b.hp<b.max-1)return b.fire>0?'éteindre le feu, réparer':'réparer';if(B.hub)return `récolter autour du camp (${world.workers(b).length}/${B.workers})`;if(B.workers)return `travailler : ${B.name.toLowerCase()} (${world.workers(b).length}/${B.workers})`;if(B.airfield)return 'embarquer dans les avions';if(B.store)return 'déposer';return B.name;}
  if(t.type==='node'){const nd=world.s.nodes[t.id];return nd.type==='ore'?`extraire ${RES[nd.res].name.toLowerCase()} à la main (${n0(nd.left)})`:`${nd.type==='tree'?'couper':nd.type==='rock'?'casser':'cueillir'} (${n0(nd.left)})`;}
  if(t.type==='rail')return 'poser la voie';if(t.type==='sacs')return world.s.sacs[t.k]?.b?(world.s.sacs[t.k]?.t==='fosses'?'occuper la fosse (soldats)':'occuper les sacs de sable (soldats)'):(world.s.sacs[t.k]?.t==='fosses'?'creuser la fosse (villageois)':'poser les sacs de sable (villageois)');if(t.type==='wall'){const w=world.s.walls[t.k];return w?.f==='beee'?`abattre le mur${peace?' — ce sera la guerre':''}`:'bâtir le mur';}return 'aller là';}
function say(text,tone=''){const h=$('#hint');h.textContent=text;h.className='hint show '+tone;clearTimeout(ui.sayT);ui.sayT=setTimeout(()=>h.className='hint',4500);}
// La taille de l'interface (A− / A+, Ctrl + / Ctrl −). Dans l'application : un vrai zoom de page, net, les clics justes ;
// dans un navigateur : le zoom CSS. Par défaut, calée pour que l'écran fasse ~1650 points de large quel que soit le
// grossissement de Windows (à 175 % sur un écran 1920 : 65 %). Le choix du joueur est retenu d'une partie à l'autre.
const ZOOMS=[.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,1,1.1,1.2,1.3,1.4,1.5];
const near=z=>ZOOMS.reduce((a,b)=>Math.abs(b-z)<Math.abs(a-z)?b:a);
const uiZ={auto(){return Math.min(1,near((window.okmApp?.zoom?screen.width:innerWidth)/1650));},
  cur:1,
  set(z,keep=true){z=Math.max(ZOOMS[0],Math.min(ZOOMS[ZOOMS.length-1],z));this.cur=z;
    if(window.okmApp?.zoom)window.okmApp.zoom(z);else{document.documentElement.style.zoom=z===1?'':String(z);document.body.style.width=innerWidth/z+'px';document.body.style.height=innerHeight/z+'px';}
    if(keep){try{localStorage.setItem('okm-zoom',String(z));}catch(e){}}
    const l=document.querySelector('[data-act="zoom-auto"]');if(l)l.textContent=Math.round(z*100)+' %';
    requestAnimationFrame(()=>view?.resize?.());},
  step(d){if(!d){try{localStorage.removeItem('okm-zoom');}catch(e){}this.cur=1;this.set(this.auto(),false);return;}
    const i=ZOOMS.findIndex(x=>x>=this.cur-1e-6);this.set(ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,(i<0?ZOOMS.length-1:i)+d))]);
    say(`Taille de l’interface : ${Math.round(this.cur*100)} % (Ctrl + / Ctrl −).`);},
  init(){let z=NaN;try{z=parseFloat(localStorage.getItem('okm-zoom'));}catch(e){}this.set(z>0?z:this.auto(),false);}};
window.okmZoom=d=>uiZ.step(d);
uiZ.init();
function setSpeed(v){ui.speed=v;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('on',+b.dataset.speed===v));}
const wounded=()=>{const L=world.s.units.filter(u=>u.f==='meumeu'&&u.h&&u.h.state!=='ok').map(u=>({u,where:'terrain'}));for(const b of world.s.buildings)if(b.f==='meumeu')for(const u of b.wardList||[])L.push({u,where:b});return L;};

// ---------- la barre du haut ----------
function topbar(){const cap=world.capital();const p=world.pop('meumeu');const st=cap?.stock||{};
  const sumK=pre=>Object.entries(st).filter(([k])=>k.startsWith(pre)).reduce((a,[,v])=>a+v,0);
  const B=world.s.beee;const war=`<span class="tb alarm" title="Seules les villes reconnues sont comptées">⚔ Guerre permanente · ${B.cities.filter(c=>!c.fallen&&(!world.s.fog||world.s.intel?.[c.centre])).length} villes reconnues</span>`;
  const W=wounded();const red=W.filter(x=>triage(x.u.h).k==='rouge').length;const ideas=world.s.innov.ideas.length;
  // la ligne des ressources : chacune avec son nom, ce qu'il y a à la capitale
  const SHORT={bois:'Bois',pierre:'Pierre',fer:'Fer',cuivre:'Cuivre',plomb:'Plomb',salpetre:'Salpêtre',charbon:'Charbon',vivres:'Vivres',grain:'Grain',ble_moulu:'Blé moulu',pieces:'Pièces',poudre:'Poudre',explosifs:'Explosifs',sante:'Santé',fer:'Fer',sels:'Sels',soie:'Soie',verre:'Verre'};
  const chip=(k,v,cls='')=>`<span class="rchip ${cls}" title="${RES[k].name} à la capitale">${ico(k)}<b>${v}</b><i>${SHORT[k]}</i></span>`;
  const h=`${['bois','pierre','charbon','fer','cuivre','plomb','salpetre','vivres','pieces','poudre','explosifs','sante'].map(k=>chip(k,n0(st[k]||0))).join('')}
    <span class="rchip" title="Caisses de munitions à la capitale (toutes conceptions)"><img class="ico" src="${AMMO_SVG}" alt=""><b>${n1(sumK('m:'))}</b><i>Munitions</i></span><span class="rchip" title="Armes en stock à la capitale"><img class="ico" src="${ARM_SVG}" alt=""><b>${n0(sumK('a:'))}</b><i>Armes</i></span>${RARE.map(k=>chip(k,n0(st[k]||0),'rare')).join('')}`;
  const idleN=world.idle().length;
  const h2=`<span class="rchip" title="Population : chaque Meumeu mange sa ration, chaque nouveau coûte des vivres">👥 <b>${p.used}</b><i>Meumeu</i></span><button class="tb idle ${idleN?'on':''}" data-act="idle" title="Villageois sans tâche (bulle « z » au-dessus d’eux). Clic ou touche « . » : aller au suivant">💤 <b>${idleN}</b> oisif${idleN>1?'s':''}</button>${war}
    <button class="tb ${red?'alarm':''}" data-modal="med" title="Le service de santé (M)">✚ <b>${W.length}</b> Blessés${red?` <i>${red} rouge${red>1?'s':''}</i>`:''}</button><button class="tb ${ideas?'glow':''}" data-modal="innov" title="Les idées des Meumeu, le laboratoire (I)">💡 <b>${ideas}</b> Idées</button><button class="tb" data-modal="eco" title="Le fret, la production, les stocks, les convois (E)">📦 Économie</button><button class="tb" data-modal="operation">☾ Opérations</button><button class="tb" data-act="save">Sauver</button>`;
  if(h!==ui.topHtml){$('#stocks').innerHTML=h;ui.topHtml=h;}if(h2!==ui.topHtml2){$('#status').innerHTML=h2;ui.topHtml2=h2;}
  syncFogBtn();const hr=world.hour(),solar=world.nightRemaining(),secs=Math.ceil(solar.seconds/Math.max(.5,ui.speed));$('#clock').textContent=`Jour ${world.day} · ${String(Math.floor(hr)).padStart(2,'0')}:${String(Math.floor(hr%1*60)).padStart(2,'0')} · ${solar.night?'☾ Nuit':'☀ Jour'} ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}${ui.speed===0?' (pause)':''}${ui.catchup?' · rattrapage':''}`;
  const sq=world.s.squads.map((q,i)=>{const ms=world.members(q);const up=ms.filter(u=>u.h?.state!=='hors').length;const on=ms.length&&ms.every(u=>view.sel.has(u.id));
    return `<button class="sqchip ${on?'on':''} ${q.broken?'broken':''}" data-squad="${q.id}" title="Clic : choisir · double-clic : y aller"><b>${i+1}</b> ${esc(q.name)} <span>${up}/${ms.length}</span><i style="--m:${Math.round(q.morale*100)}%"></i></button>`;}).join('');
  if(sq!==ui.sqHtml){$('#squads').innerHTML=sq;ui.sqHtml=sq;}
  const xm={sel:'Radios : la sélection',ecran:'Radios : tout l’écran',off:'Radios : coupées'}[xray.mode];if($('#xmode').textContent!==xm)$('#xmode').textContent=xm;
  buildBar();}
// ---------- la barre de construction ----------
// Toujours là, en bas : les familles, les bâtiments en image, ce qu'ils coûtent (en rouge ce qui manque près de la vue).
function buildBar(){const el=$('#buildbar');if(!ui.bb){if(el.innerHTML!=='')el.innerHTML='<button class="bb-open" data-act="bb">▲ Bâtir (B)</button>';return;}
  const now=performance.now();if(now-(ui.bbAt||0)<500&&ui.bbHtml)return;ui.bbAt=now;
  const cat=BUILD_CATS.find(c=>c.k===ui.bbCat)||BUILD_CATS[0];const have=world.have('meumeu',view.cx,view.cy,RADIUS+8);
  const cards=cat.items.map((k,n)=>{const B=BUILDINGS[k],cost=B.cost;const can=Object.entries(cost).every(([r,v])=>(have[r]||0)>=v);const lim=B.unique&&world.s.buildings.some(b=>b.f==='meumeu'&&b.k===k&&!b.ruin);
      const need=[B.onOre?'sur un filon':'',B.station?'au bord d’une voie':'',B.unique?'un seul':'',k==='centre'?'à 24 cases d’une autre ville':''].filter(Boolean).join(' · ');
      return `<button class="bb-card ${view.placing===k?'on':''} ${lim?'far':''}" data-build="${k}" title="${esc(B.why)}${can?'':' — les matériaux en rouge manquent près d’ici : le chantier les commandera.'}"><span class="bb-img">${bthumb(k)?`<img src="${bthumb(k)}" alt="">`:''}<i>${n+1}</i></span><b>${B.name}</b><span class="costs">${costHtml(cost,have)}</span><small>${B.size.join('×')}${need?' · '+need:''}${lim?' · déjà bâti':''}</small></button>`;}).join('')+
    (cat.lines||[]).map(k=>{const L=LINES[k];return `<button class="bb-card line ${view.lining?.kind===k?'on':''}" data-line="${k}" title="${k==='rail'?'Cliquez-glissez : la voie va droit et tourne à angle droit, en contournant ce qui la barre. Partez d’une voie existante pour un embranchement.':'Cliquez-glissez sur la carte pour tracer.'} Maj : plusieurs tracés."><span class="bb-img line-${k}"></span><b>${L.name}</b><span class="costs">${costHtml(L.cost)}<small>/case</small></span><small>à tracer</small></button>`;}).join('')+
    ((cat.lines||[]).length?`<button class="bb-card line ${view.lining?.kind==='gomme'?'on':''}" data-line="gomme" title="Balayez un tracé prévu (pointillés dorés) : il est retiré, et ce qui était payé revient au dépôt. Suppr sur un tracé prévu fait de même."><span class="bb-img line-gomme"></span><b>Annuler un tracé</b><span class="costs"><small>rembourse</small></span><small>voie ou mur prévu</small></button>`:'');
  const h=`<div class="bb-tabs">${BUILD_CATS.map(c=>`<button data-bcat="${c.k}" class="${c===cat?'on':''}" title="${esc(c.hint)}">${c.name}</button>`).join('')}<span class="bb-hint" title="Posé, les villageois oisifs proches y vont · deux cases d’écart entre bâtiments · le chantier commande ses matériaux au dépôt le plus proche">${esc(cat.hint)}</span><button class="bb-x" data-act="bb" title="Replier (B)">▼</button></div>${cat.k==='vivre'?`<div class="bb-pen">Moulin : 4 ouvriers sur une terre moyenne nourrissent ~45 Meumeu (un villageois mange 0,08 vivre/h, un soldat 0,13). Touche F : la fertilité.</div>`:''}<div class="bb-row">${cards}</div>`;
  if(h!==ui.bbHtml){el.innerHTML=h;ui.bbHtml=h;}}

// ---------- le panneau ----------
function renderPanel(force){const now=performance.now();if(!force&&now-ui.panelAt<400)return;const act=document.activeElement;if(!force&&act&&(act.tagName==='SELECT'||act.tagName==='INPUT')&&$('#panel')?.contains(act))return;if(!force&&ui.pointerIn&&now-(ui.lastPointer||0)<900)return;ui.panelAt=now;
  let h='';const sel=[...view.sel].map(id=>world.unit(id)).filter(Boolean);
  if(ui.pick)h=pickPane();else if(view.selV!=null)h=vehiclePane();else if(sel.length)h=unitsPane(sel);else if(view.selVs.size)h=vehiclesPane();else if(view.selB!=null&&world.building(view.selB))h=buildingPane(world.building(view.selB));else h=overviewPane();
  if(h!==ui.lastPanel){const p=$('#panel');const top=p.scrollTop;p.innerHTML=h;p.scrollTop=top;ui.lastPanel=h;}
  renderModal();}
function pickPane(){return `<section class="pane"><h2>Tracer une ligne</h2><p>${ui.pick.a?'Cliquez l’arrêt d’arrivée.':'Cliquez l’arrêt de départ (le plus souvent : la ville).'}</p><p class="quiet small">${ui.pick.need}</p><button class="ghost small" data-act="pick-off">Annuler</button></section>`;}
// Les planches : le portrait en peluche (Meumeu ou Bèè), taché de sang là où les balles sont entrées et sorties ;
// la radiographie, où s'allument les organes touchés, les trajets, les hémorragies. Chaque image est calée sur le corps :
// (x, y) en mètres → pixels de la planche (vu de face, la droite du Meumeu est à gauche de l'image).
const PLATES={meumeu:{src:'assets/plates/meumeu.webp',W:1008,H:1792,cx:505,y0:1440,k:3333},beee:{src:'assets/plates/be.webp',W:1152,H:1728,cx:598,y0:1440,k:3650},
  radio:{src:'assets/plates/radiograph.webp',W:1152,H:1728,cx:576,y0:1500,k:4200}};
function plateSvg(u,kind='portrait',cls=''){const h=u.h;const P=kind==='radio'?PLATES.radio:PLATES[u.f==='beee'?'beee':'meumeu'];const X=x=>P.cx-x*P.k,Y=y=>P.y0-y*P.k,L=v=>v*P.k;setSpecies(u.f);
  const dead=h.state==='mort',down=h.state==='hors';let over='';
  if(kind==='portrait'){for(const w of h.wounds){for(const [p,out] of [[w.entry,0],[w.exit,1]]){if(!p)continue;const r=18+(w.sev||2)*7*(out?1.4:1);const x=X(p[0]),y=Y(p[1]);
        over+=`<g><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.9}" fill="#7a0a0e" opacity=".85"/><ellipse cx="${x-r*.25}" cy="${y-r*.25}" rx="${r*.4}" ry="${r*.35}" fill="#b3141c" opacity=".8"/><rect x="${x-r*.18}" y="${y}" width="${r*.36}" height="${r*(1.6+(w.sev||2)*.5)}" rx="${r*.18}" fill="#6d080c" opacity=".8"/></g>`;}}
    if(h.blood<BLOOD*.9)over+=`<ellipse cx="${P.cx}" cy="${P.y0+20}" rx="${L(.05+(1-h.blood/BLOOD)*.12)}" ry="${L(.012+(1-h.blood/BLOOD)*.03)}" fill="#5c070a" opacity=".7"/>`;}
  else{const names=new Map();for(const w of h.wounds)for(const p of w.parts||[])names.set(p.name,Math.max(names.get(p.name)||0,p.sev));
    for(const pt of PARTS){if(!names.has(pt.name))continue;const s=pt.shape;const c=SEVC[names.get(pt.name)];
      if(s.t==='cap')over+=`<line class="blink" x1="${X(s.a[0])}" y1="${Y(s.a[1])}" x2="${X(s.b[0])}" y2="${Y(s.b[1])}" stroke="${c}" stroke-width="${Math.max(8,L(2*s.r))}" stroke-linecap="round"/>`;
      else{const r=s.t==='sph'?[s.r,s.r]:s.r;over+=`<ellipse class="blink" cx="${X(s.c[0])}" cy="${Y(s.c[1])}" rx="${L(r[0])}" ry="${L(r[1])}" fill="${c}" opacity=".55"/>`;}}
    for(const w of h.wounds){if(!w.entry)continue;const a=[X(w.entry[0]),Y(w.entry[1])];if(w.exit)over+=`<line x1="${a[0]}" y1="${a[1]}" x2="${X(w.exit[0])}" y2="${Y(w.exit[1])}" stroke="#ff5a3a" stroke-width="7" stroke-dasharray="18 12"/>`;over+=`<circle cx="${a[0]}" cy="${a[1]}" r="14" fill="#ff5a3a"/>`;}
    for(const b of h.bleeds){const o=PARTS.find(p=>p.name===b.name)||REGIONS.find(r=>r.name===b.name);if(!o)continue;const s=o.shape;const c=s.c||[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2];const r=b.rate*bleedFactor(b);if(r<.01)continue;
      over+=`<circle class="pulse" cx="${X(c[0])}" cy="${Y(c[1])}" r="${16+Math.min(40,r*25)}" fill="none" stroke="#ff2d2d" stroke-width="6"/>`;}}
  const filt=dead?'grayscale(1) brightness(.6)':down?'saturate(.7) brightness(.85)':'none';
  return `<svg class="plate ${kind} ${cls}" viewBox="0 0 ${P.W} ${P.H}" preserveAspectRatio="xMidYMid meet" aria-label="${kind==='radio'?'Radiographie':'Portrait'}"><image href="${P.src}" width="${P.W}" height="${P.H}" style="filter:${filt}"/>${over}${dead?`<text x="${P.W/2}" y="${P.H*.12}" text-anchor="middle" font-size="80" fill="#eee" font-family="serif">✝</text>`:''}</svg>`;}
// la silhouette : de face (et de profil dans la fiche), les plaies, les organes touchés
function silhouette(u,side=false,big=false){setSpecies(u.f);const h=u.h;const loss=1-h.blood/BLOOD;const fill=h.state==='hors'?'#c9a79a':loss>.2?'#d9c2a8':'#e4d6bd';const X=side?2:0;
  const sh=REGIONS.map(r=>{const s=r.shape;const c=r.hoof?'#c9a57a':r.horn?'#d9b98c':fill;if(s.t==='sph')return `<circle cx="${s.c[X]}" cy="${-s.c[1]}" r="${s.r}" fill="${c}"/>`;if(s.t==='ell')return `<ellipse cx="${s.c[X]}" cy="${-s.c[1]}" rx="${s.r[X]}" ry="${s.r[1]}" fill="${c}"/>`;
    return `<line x1="${s.a[X]}" y1="${-s.a[1]}" x2="${s.b[X]}" y2="${-s.b[1]}" stroke-width="${2*s.r}" stroke-linecap="round" stroke="${c}"/>`;}).join('');
  const names=new Map();for(const w of h.wounds)for(const p of w.parts||[])names.set(p.name,Math.max(names.get(p.name)||0,p.sev));
  const hurt=big?PARTS.filter(p=>names.has(p.name)).map(p=>{const s=p.shape;const c=SEVC[names.get(p.name)];if(s.t==='cap')return `<line x1="${s.a[X]}" y1="${-s.a[1]}" x2="${s.b[X]}" y2="${-s.b[1]}" stroke-width="${Math.max(.002,2*s.r)}" stroke="${c}" stroke-linecap="round" opacity=".85"/>`;
    const r=s.t==='sph'?[s.r,s.r,s.r]:s.r;return `<ellipse cx="${s.c[X]}" cy="${-s.c[1]}" rx="${r[X]}" ry="${r[1]}" fill="${c}" opacity=".7"/>`;}).join(''):'';
  const w=h.wounds.map(x=>[x.entry&&`<circle cx="${x.entry[X]}" cy="${-x.entry[1]}" r=".0045" fill="${SEVC[x.sev]}" stroke="#300" stroke-width=".001"/>`,x.exit&&`<circle cx="${x.exit[X]}" cy="${-x.exit[1]}" r=".006" fill="none" stroke="${SEVC[x.sev]}" stroke-width=".0018"/>`].filter(Boolean).join('')).join('');
  const face=side?'':`<g fill="#5a3f2a"><circle cx="-.02" cy="-.242" r=".004"/><circle cx=".02" cy="-.242" r=".004"/><circle cx="-.019" cy="-.207" r=".0035"/><circle cx=".019" cy="-.207" r=".0035"/></g>`;
  return `<svg class="sil ${big?'big':''}" viewBox="${side?'-.07':'-.11'} -.31 ${side?'.14':'.22'} .32" aria-label="Silhouette et blessures"><g opacity=".95">${sh}</g>${face}${hurt}${w}</svg>`;}
function healthHtml(u){const h=u.h;const v=vitals(h);const tr=triage(h);
  const flags=[h.legs>(h.splint||0)?'jambe brisée : ne tient plus debout':h.legs?'jambe sous attelle':null,h.arms?'bras cassé : vise mal':null,h.pneumo?(h.drained?'drainé':h.sealed?'pneumothorax (pansé)':'pneumothorax : il étouffe'):null,h.conc>0?'commotion':null,h.shock>0?'en état de choc':null,
    h.bleeds.some(b=>b.internal&&!b.clamped&&!b.tq)?'saignement interne : chirurgie':null,h.bleeds.some(b=>b.tq&&!b.lost)?'garrot posé':null,h.gut&&!h.gutFixed?`panse ou intestin percés : péritonite dans ${hours(Math.max(0,(1-h.sepsis)*SEPSIS/MED.sepsis/4))}`:null,h.lost?.length?'membre perdu':null].filter(Boolean);
  return `<div class="health">${plateSvg(u,'portrait','mini')}<div class="hcol"><div class="kv"><span>État</span><b class="${h.state==='hors'?'bad':h.state==='blesse'?'warn':'good'}">${STATE[h.state]}${h.state==='hors'&&h.cause?` (${esc(h.cause)})`:''}</b></div>
    ${h.state!=='ok'?`<div class="kv"><span>Triage</span><b><i class="tri" style="background:${tr.c}"></i>${tr.label}</b></div>`:''}
    <div class="kv"><span>Sang</span><b class="${v.loss>.3?'bad':v.loss>.12?'warn':''}">${fmt(h.blood,0)} / ${BLOOD} mL</b></div><i class="bloodbar"><b style="width:${Math.round(h.blood/BLOOD*100)}%"></b><em style="left:50%"></em></i>
    ${h.state!=='ok'?`<div class="kv small"><span>Pouls, souffle</span><b>${v.pulse}/min · ${v.resp}/min · ${v.cons}</b></div>`:''}
    ${v.br>.002?`<div class="kv"><span>Il perd</span><b class="bad">${fmt(v.br,2)} mL/s${v.left!=null&&v.br>.02?` · ${secs(v.left)} avant la mort`:''}</b></div>`:''}
    ${flags.length?`<p class="small warn">${flags.map(esc).join(' · ')}</p>`:''}</div></div>
    ${h.wounds.length?`<div class="wounds">${h.wounds.slice().reverse().slice(0,4).map(w=>`<div class="wl"><i style="background:${SEVC[w.sev]}"></i><b>${SEV[w.sev]}</b> <span>${esc(w.text)}</span> <em>${w.from==='éclat'?'éclat':'balle'}</em></div>`).join('')}</div>`:''}
    ${h.state!=='ok'||h.wounds.length?`<div class="row"><button class="small ghost" data-fiche="${u.id}">Fiche médicale</button></div>`:''}`;}
function armorHtml(u){const Ar=u.armor&&world.armorOf(u.armor);if(!Ar)return u.w?'<div class="kv"><span>Protection</span><b class="quiet">aucune</b></div>':'';
  return `<div class="kv"><span>Protection</span><b>${esc(Ar.A.name)} <small class="quiet">${Math.round(Ar.D.mass*1000)} g</small></b></div><div class="plates">${Object.entries(Ar.D.zones).filter(([,Z])=>Z.t>0).map(([z,Z])=>{const it=u.plates?.[z]??1;
    return `<span title="${esc(MATS[Z.mat].name)} ${fmt(Z.t,1)} mm"><i style="width:${Math.round(it*100)}%;background:${it>.6?'var(--teal)':it>.3?'var(--orange)':'var(--red)'}"></i>${ZONES[z].name.split(' ')[0].toLowerCase()} ${Math.round(it*100)} %</span>`;}).join('')}</div>`;}
// le portrait d'une arme : elle, pièce par pièce, et sa munition en coupe — dessiné une fois par conception
const PORTRAITS=new Map();
function weaponPortrait(id){const d=world.design(id);if(!d)return '';const key=id+JSON.stringify(d.p);if(PORTRAITS.has(key))return PORTRAITS.get(key);let url='';
  try{const D=world.W(id),G=layout(D);const dpr=2,w=340,h=74,cv=document.createElement('canvas');cv.width=w*dpr;cv.height=h*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);
    const RH=Math.max((D.Dc||D.p.d*1.45)*3.2+6,D.p.d*3);const heavy=D.have==='trepied'||D.crew>1;const s=Math.min((230)/(G.Lw*1.06+(D.rocket?30:0)),(h-12)/(RH*(heavy?7:4.6)));
    drawWeapon(x,D,{bx:8+(D.rocket?10:0),ay:heavy?h*.42:h*.5,s,ground:h-3,t:0,G});drawRound(x,D,248,8,88,h-16,{compact:true,labels:false});url=cv.toDataURL();}catch(e){console.error(e);}
  PORTRAITS.set(key,url);if(PORTRAITS.size>60)PORTRAITS.delete(PORTRAITS.keys().next().value);return url;}
function weaponHtml(u){if(!u.w)return '';const d=world.design(u.w);const W=world.W(u.w);const n=u.mag+u.pouch;const pic=weaponPortrait(u.w);
  return `${pic?`<img class="wpn-pic" src="${pic}" alt="${esc(d?.name||'')}" width="340" height="74">`:''}<div class="kv"><span>Arme</span><b>${esc(d?.name||'?')} <small class="quiet">${esc(W.name)}</small></b></div><div class="kv"><span>Munitions</span><b class="${n<=0?'bad':n<W.carry*.25?'warn':''}">${u.mag}/${W.p.mag} + ${u.pouch}</b></div>`;}
// La fiche d'une pièce servie : l'équipage par rôles, la mise en batterie, le rechargement en cours (et pourquoi il dure), les obus chargés et ceux que
// portent les servants, le bouclier et son usure. Tout est lu sur la pièce et sur ses servants : rien n'est inventé pour l'affichage.
function pieceHtml(u){const Wd=world.W(u.w);if(!(Wd.crew>1))return '';
  const need=Wd.crew-1,sv=world.servants(u),bar=(p,c='')=>`<i class="bar ${c}"><i style="width:${Math.round(Math.max(0,Math.min(1,p))*100)}%"></i></i>`;
  const carried=world.s.units.filter(o=>o.serve===u.id&&o.crates>0&&o.ammoW===u.w).reduce((a,o)=>a+o.crates*Wd.perCrate,0);
  const dep=Wd.setup>0?Math.min(1,(u.deployT||0)/Wd.setup):1,rl=u.reload>0&&u.reloadTotal>0?1-u.reload/u.reloadTotal:null,S=Wd.shield,integ=u.plates?.bouclier??1;
  const roles=Wd.roles||[],dots=[`<span class="dot gun on" title="${esc(roles[0]||'tireur')}"></span>`];for(let i=1;i<=need;i++)dots.push(`<span class="dot ${sv.length>=i?'on':''}" title="${esc(roles[i]||'servant')} : ${sv.length>=i?'à son poste':'manque'}"></span>`);
  return `<div class="piece"><h3>Pièce servie <small>${esc(Wd.name)}</small></h3>
    <div class="crew">${dots.join('')}<b>${sv.length+1}/${Wd.crew}</b><small class="quiet">${need-sv.length>0?`<span class="warn">${need-sv.length} manquant${need-sv.length>1?'s':''} : pièce au ralenti</span>`:'équipage complet'}</small></div>
    <div class="kv"><span>Mise en batterie</span><b>${dep>=1?'<span class="good">en batterie</span>':`${bar(dep)} ${Math.round(dep*100)} %`}</b></div>
    <div class="kv"><span>Rechargement</span><b>${rl!=null?`${bar(rl)} <small>${esc(u.loading||'')} · ${fmt(u.reload,1)} s</small>`:'<span class="quiet">prête</span>'}</b></div>
    <div class="kv"><span>Obus</span><b class="${(u.mag+u.pouch)<=0?'bad':''}">${u.mag} chargé${u.mag>1?'s':''} · ${u.pouch} en réserve${carried>0?` · ${fmt(carried,carried<10?1:0)} portés par les servants`:''} <small class="quiet">(${fmt(Wd.rm||0,0)} g pièce)</small></b></div>
    ${S?`<div class="kv"><span>Bouclier</span><b>${esc(S.name.toLowerCase())} ${fmt(S.t,1)} mm · <span class="${integ<.4?'bad':integ<.8?'warn':'good'}">${Math.round(integ*100)} %</span></b></div>`:''}</div>`;}
function postureRow(sel){const armed=sel.filter(u=>u.w&&u.h);if(!armed.length)return '';const cur=new Set(armed.map(u=>u.orderPost||'auto'));const one=cur.size===1?[...cur][0]:null;
  return `<div class="row"><span class="quiet small">Posture</span><div class="seg">${[['auto','Libre'],['debout','Debout'],['accroupi','Accroupi'],['couche','Couché']].map(([k,n])=>`<button data-post="${k}" class="${one===k?'on':''}" title="${k==='auto'?'debout en marche, accroupi au combat, couché sous le feu':k==='couche'?'une cible minuscule ; lent':k==='accroupi'?'plus petit, plus stable':'on marche vite, on est une grande cible'}">${n}</button>`).join('')}</div></div>`;}
// un retard (en heures), dit comme on le dit : « 40 min », « 2 h 30 »
const fuseTxt=v=>{const m=Math.round(v*60);return m<60?`${m} min`:`${Math.floor(m/60)} h${m%60?' '+String(m%60).padStart(2,'0'):''}`;};
function stealthRow(sel){const armed=sel.filter(u=>u.w&&u.h);if(!armed.length)return '';const hold=armed.every(u=>u.holdFire),free=armed.every(u=>!u.holdFire);
  const sab=sel.filter(u=>(u.charges||0)>0);const ch=sel.reduce((a,u)=>a+(u.charges||0),0);const fz=new Set(sab.map(u=>u.fuse??.33));const f1=fz.size===1?[...fz][0]:null;
  const seen=sel.filter(u=>world.spotted(u,'beee')).length,sus=sel.filter(u=>!world.spotted(u,'beee')&&(u.det?.beee||0)>.15).length;
  const sc=armed.filter(u=>u.scoutRole).length;
  let h=`<div class="row"><span class="quiet small">Rôle</span><button class="small ${sc?'on':''}" data-scout="${sc?0:1}" title="voit une fois et demie plus loin, repère plus vite ; ne tire que s’il est découvert">${sc?`Éclaireur${armed.length>1?` (${sc})`:''} ✓`:'Désigner éclaireur'}</button></div>`+`<div class="row"><span class="quiet small">Tir</span><div class="seg"><button data-fire="0" class="${free&&!armed.some(u=>u.quiet)?'on':''}" title="ils répondent à l’ennemi qu’ils repèrent">Libre</button><button data-fire="2" class="${armed.every(u=>u.quiet&&!u.holdFire)?'on':''}" title="ils n’abattent qu’un Bèè isolé et proche, si personne d’autre n’entendra le coup ni ne verra la chute (un silencieux, une balle subsonique aident beaucoup) ; découverts, ils répondent">Discret</button><button data-fire="1" class="${hold?'on':''}" title="ils ne tirent jamais, même repérés : pour passer sans combattre et saboter">Tenu</button></div>${seen?`<b class="small bad">${seen} repéré${seen>1?'s':''} !</b>`:sus?`<b class="small warn">${sus} soupçonné${sus>1?'s':''} : à terre !</b>`:''}</div>`;
  {const camo=sel.filter(u=>u.camoSuit).length;const irs=sel.filter(u=>u.irMax);const sup=armed.filter(u=>world.W(u.w).sup);const worn=sup.filter(u=>{const S=world.W(u.w).sup;return S.life&&(u.supUse||0)>S.life*.5||S.wet&&(u.supUse||0)>=S.wet;}).length;
    const bits=[];if(camo)bits.push(`${camo} en tenue camouflée`);if(irs.length){const on=irs.filter(u=>u.nvOn).length;bits.push(`<button class="small ${on?'on':''}" data-nv="${on===irs.length?0:1}" title="allumée, elle montre l’ennemi dans le noir, très loin, dans la direction où l’on regarde, — sa batterie est celle de la lampe, sans recharge ; sans filtre, sa lueur rouge trahit l’opérateur ; éteinte, on la garde pour le combat (V)">Vision nocturne ${on===irs.length?'allumée':on?`allumée (${on}/${irs.length})`:'éteinte'}</button>`);}if(sup.length)bits.push(`${sup.length} silencieux${worn?` <b class="warn">(${worn} usé${worn>1?'s':''} : au dépôt)</b>`:''}`);
    if(bits.length)h+=`<div class="row small"><span class="quiet">Nuit</span> ${bits.join(' · ')} <small class="quiet">(C : vigilance)</small></div>`;}
  // le retard des charges : au curseur, de dix minutes à douze heures (par dix minutes), et trois raccourcis
  if(sab.length){const fv=f1??.33;h+=`<div class="row"><span class="quiet small">Retard</span><input type="range" data-fusev min="1" max="72" step="1" value="${Math.max(1,Math.round(fv*6))}" title="la charge saute ce temps après avoir été posée : de 10 minutes à 12 heures"><b class="small" id="fuse-l">${f1==null?'différents':fuseTxt(fv)}</b><div class="seg">${[[1/6,'10 min'],[1,'1 h'],[6,'6 h']].map(([v,n])=>`<button data-fuse="${v}" class="${f1!=null&&Math.abs(f1-v)<.01?'on':''}" title="la charge saute ${n} après avoir été posée">${n}</button>`).join('')}</div><small class="quiet">${ch?`${ch} charge${ch>1?'s':''}`:''}</small></div>`;}
  return h;}
function unitsPane(sel){const by={};for(const u of sel)by[u.k]=(by[u.k]||0)+1;const vil=sel.filter(u=>u.k==='villageois');const one=sel.length===1?sel[0]:null;
  const sqs=new Set(sel.map(u=>u.sq));const sq=sqs.size===1&&sel[0].sq?world.squad(sel[0].sq):null;const whole=sq&&world.members(sq).every(u=>view.sel.has(u.id));
  let h=`<section class="pane"><h2>${sel.length>1?(whole?esc(sq.name):`${sel.length} choisis`):esc(unitName(one))} <small>${Object.entries(by).map(([k,n])=>`${n} ${UNITS[k].name.toLowerCase()}${n>1?'s':''}`).join(' · ')}${one?.sq&&world.squad(one.sq)?' · '+esc(world.squad(one.sq).name):''}</small></h2>`;
  if(one){if(one.h)h+=healthHtml(one);else h+=`<div class="kv"><span>Solidité</span><b>${n0(one.hp)}/${one.max}</b></div><div class="kv"><span>Obus</span><b>${one.shells}</b></div>`;
    h+=weaponHtml(one)+armorHtml(one);if(one.w&&world.W(one.w).crew>1)h+=pieceHtml(one);
    if(one.f==='meumeu'&&one.w&&world.W(one.w).crew>1){const active=world.s.units.find(u=>u.crewAmmo?.gun===one.id);h+=`<div class="row"><button class="small" data-act="crew-resupply" ${active?'disabled':''}>${active?'Servant en route…':'Envoyer un servant ravitailler'}</button><span class="quiet small">${one.mag+one.pouch} coups à la pièce · ${world.servants(one,2).length}/${Math.max(0,world.W(one.w).crew-1)} servants proches</span></div>`;}
    // l'équipement du commando : jumelles, tenue ; pris ou rendu au dépôt tout proche
    if(one.f==='meumeu'&&one.w&&one.h){const gd=world.gearDepot(one);const st=gd?.stock||{};const G=[['jumelles','Jumelles',!!one.jum&&!one.bino],['jumelles_ir','Jumelles IR',!!one.bino],['tenue_camo','Tenue camouflée',!!one.camoSuit]];
      h+=`<div class="kv"><span>Équipement</span><b>${world.isCommando(one)?'<span class="good">commando</span> · ':''}${[one.bino?'jumelles IR (44 cases de jour, 22 de nuit)':one.jum?'jumelles (44 cases de jour)':'',one.camoSuit?'tenue camouflée':'',(one.charges||0)>0?`${one.charges} charge${one.charges>1?'s':''}`:''].filter(Boolean).join(' · ')||'<span class="quiet">rien</span>'}</b></div>
        <div class="row small">${gd?G.map(([k,n,on])=>on?`<button class="small ghost" data-gear="${k}:0">Rendre ${n.toLowerCase()}</button>`:`<button class="small" data-gear="${k}:1" ${(st[k]||0)>=1?'':'disabled'} title="${n0(st[k]||0)} au dépôt">${n} (${n0(st[k]||0)})</button>`).join(''):'<span class="quiet">Près d’un dépôt (6 cases), il peut y prendre jumelles, tenue ou charges de démolition.</span>'}${gd?`<button class="small" data-gear="charge:1" ${(st.explosifs||0)>=.5&&(one.charges||0)<4?'':'disabled'} title="une charge de démolition : une demi-caisse d’explosifs (${fmt(st.explosifs||0,1)} au dépôt) ; quatre au plus par homme">+ Charge de démolition</button>${(one.charges||0)>0?`<button class="small ghost" data-gear="charge:0">Rendre une charge</button>`:''}`:''}</div>`;}
     if(one.role==='munitions'&&!one.sq&&world.s.squads.length){h+=`<div class="row"><label class="small">Escouade à ravitailler <select data-join-target="${one.id}">${world.s.squads.map(sq=>`<option value="${sq.id}">${esc(sq.name)} · ${world.members(sq).length} soldats</option>`).join('')}</select></label><button class="small" data-join="${one.id}">Rallier</button></div>`;}
    // rééquiper un soldat déjà formé : une autre arme (prise au dépôt proche), un autre rôle
    if(UNITS[one.k].arm&&one.h){const dep=world.depots('meumeu',one.x,one.y)[0];const have=dep?dep.stock:{};const guns=world.designsOf('meumeu');const arms=world.armorsOf('meumeu');
      h+=`<div class="kv"><span>Arme</span><b><select data-sqw="${one.id}">${guns.map(d=>`<option value="${d.id}" ${d.id===one.w?'selected':''}>${esc(d.name)}${d.id!==one.w?` (${n0(have['a:'+d.id]||0)} au dépôt)`:''}</option>`).join('')}</select></b></div>
        <div class="kv"><span>Protection</span><b><select data-sqa="${one.id}"><option value="">aucune</option>${arms.map(a=>`<option value="${a.id}" ${a.id===one.armor?'selected':''}>${esc(a.name)}</option>`).join('')}</select></b></div>
        <div class="kv"><span>Rôle</span><b><select data-sqr="${one.id}">${[['tireur','Tireur'],['munitions','Porteur de munitions (2 caisses)']].map(([v,n])=>`<option value="${v}" ${(one.role==='munitions'?'munitions':'tireur')===v?'selected':''}>${n}</option>`).join('')}</select></b></div>`;}if(one.smoke)h+=`<div class="kv"><span>Fumigènes</span><b>${one.smoke}</b></div>`;if(UNITS[one.k].medic)h+=`<div class="kv"><span>Trousses</span><b class="${one.kits<=0?'bad':''}">${one.kits}/${UNITS[one.k].kits}</b></div>`;
    if(UNITS[one.k].doctor)h+=`<div class="kv"><span>Tente pliée</span><b>${one.tents?'oui':'non — il en reprend une au dépôt'}</b></div><div class="row"><button class="small" data-act="tent" ${one.tents?'':'disabled'}>Planter une tente médicale ici (T)</button></div>`;
    h+=`<div class="kv"><span>Fait</span><b>${esc(doing(one))}</b></div>${one.why?`<p class="small warn">${esc(one.why)}</p>`:''}`;
    if(one.h?.state==='blesse')h+=`<div class="row"><button class="small warn" data-act="to-hosp">Envoyer se faire soigner</button></div>`;}
  else{const st={ok:0,blesse:0,hors:0};for(const u of sel)if(u.h)st[u.h.state]=(st[u.h.state]||0)+1;const armed=sel.filter(u=>u.w);const dry=armed.filter(u=>u.mag+u.pouch<=0).length;
    h+=`<div class="kv"><span>État</span><b>${st.ok} indemnes${st.blesse?` · <span class="warn">${st.blesse} blessés</span>`:''}${st.hors?` · <span class="bad">${st.hors} à terre</span>`:''}</b></div>`;
    if(armed.length)h+=`<div class="kv"><span>Munitions</span><b class="${dry?'bad':''}">${armed.reduce((a,u)=>a+u.mag+u.pouch,0)} coups${dry?` · ${dry} à sec`:''}</b></div>`;
    const med=sel.filter(u=>UNITS[u.k].medic);if(med.length)h+=`<div class="kv"><span>Santé</span><b>${med.length} soignant${med.length>1?'s':''} · ${med.reduce((a,u)=>a+u.kits,0)} trousses</b></div>`;
    if(sel.some(u=>UNITS[u.k].doctor&&u.tents))h+=`<div class="row"><button class="small" data-act="tent">Planter une tente médicale (T)</button></div>`;}
  // le tir sur zone : les pièces à obus de la sélection
  const zg=sel.filter(u=>u.w&&u.h&&world.canZone(world.W(u.w)));if(zg.length){const Wd=world.W(zg[0].w),A=world.arcOf(Wd),mortar=A.mortar;
    h+=`<div class="zonebox"><h3>Tir sur zone <small>${zg.length} pièce${zg.length>1?'s':''} à obus</small></h3><p class="small">Portée <b>${Math.round(A.max)} m</b> (${Math.round(A.max/4)} cases)${A.min>6?`, au moins ${Math.round(A.min)} m`:''}. Un obus : mortel à <b>${fmt(Wd.he.lethal*100,0)} cm</b>, blesse à ${fmt(Wd.he.danger*100,0)} cm, assomme à ${fmt(Wd.he.conc*100,0)} cm.</p>
      <div class="row"><span class="quiet small">Coups</span><div class="seg">${[[1,'1'],[3,'3'],[6,'6'],[12,'12'],[0,'∞']].map(([n,t])=>`<button data-zonen="${n}" class="${(ui.zoneN||0)===n?'on':''}">${t}</button>`).join('')}</div>
      ${mortar?'':`<div class="seg">${[[1,'En cloche'],[0,'Tendu']].map(([k,t])=>`<button data-zoneh="${k}" class="${(ui.zoneHigh?1:0)===k?'on':''}" title="${k?'par-dessus murs et maisons, lent, plus dispersé en portée':'plus rapide, plus précis, mais le relief et les murs arrêtent'}">${t}</button>`).join('')}</div>`}</div>
      <div class="row"><button class="small ${view.zoning?'on':''}" data-act="zone">Tir sur zone (X) : cliquez le point visé</button>${zg.some(u=>u.task?.kind==='zone')?'<button class="small ghost" data-act="stop">Cessez le feu</button>':''}</div>
      <p class="quiet small">Un Meumeu qui voit la zone règle le tir : l’erreur fond de moitié à chaque obus. Sans observateur, les obus tombent loin (6 % de la distance).</p></div>`;}
  h+=postureRow(sel)+stealthRow(sel);const sm=sel.filter(u=>u.smoke>0).length;if(sm)h+=`<div class="row"><button class="small ghost" data-act="smoke" title="Un nuage entre eux et l’ennemi : il coupe la vue">Fumigène (F) · ${sel.reduce((a,u)=>a+(u.smoke||0),0)}</button></div>`;
  if(sq&&whole){h+=`<div class="kv"><span>Moral</span><b class="${sq.morale<.4?'bad':sq.morale<.7?'warn':'good'}">${Math.round(sq.morale*100)} %${sq.broken?' · en déroute':''}</b></div><i class="bloodbar morale"><b style="width:${Math.round(sq.morale*100)}%"></b></i>
      <div class="row"><span class="quiet small">Formation</span><div class="seg">${[['ligne','En ligne'],['colonne','En colonne'],['dispersee','Dispersés']].map(([k,n])=>`<button data-form="${k}" class="${sq.form===k?'on':''}">${n}</button>`).join('')}</div></div>
      <div class="row"><span class="quiet small">Écart</span><b class="kctl"><button class="small ghost" data-sqsp="-1" title="Serrer les rangs">−</button> ${Math.round((sq.spacing??1)*1.35*4)} m entre deux soldats <button class="small ghost" data-sqsp="1" title="Desserrer : moins de pertes par obus, moins de cohésion">+</button></b></div>
      <div class="row"><button class="small" data-act="sq-open">Gérer l’escouade : rôles, armes, caisses</button><button class="small ghost" data-act="dissolve">Dissoudre l’escouade</button></div>`;}
  else if(sel.filter(u=>u.k!=='villageois').length>=2)h+=`<div class="row"><button class="small" data-act="squad">Former une escouade (G)</button><span class="quiet small">elle se commande d’un bloc, tient son moral ; un médecin la suit</span></div>`;
  h+=`<p class="quiet small">Clic droit : une cible (ressource, chantier, camp, bâtiment, ennemi, blessé) ou un point — les soldats y vont en formation et attaquent ce qu’ils voient.</p><div class="row"><button class="small ghost" data-act="stop">Arrêter</button></div></section>`;
  if(vil.length){const cx=vil.reduce((a,u)=>a+u.x,0)/vil.length,cy=vil.reduce((a,u)=>a+u.y,0)/vil.length;const deps=world.s.buildings.filter(d=>d.f==='meumeu'&&world.isDepot(d)).sort((a,z)=>world.distB(a,cx,cy)-world.distB(z,cx,cy)).slice(0,10);const cur=vil.every(u=>u.dep===vil[0].dep)?vil[0].dep:undefined;
    h+=`<section class="pane"><h2>Rattachement <small>où ils rapportent ce qu’ils ramassent</small></h2><label class="row small">Livrent à <select data-udep><option value="" ${cur==null?'selected':''}>le dépôt le plus proche</option>${deps.map(d=>`<option value="${d.id}" ${cur===d.id?'selected':''}>${esc(BUILDINGS[d.k].name)} · ${esc(world.cityName(d))} — ${Math.round(world.distB(d,cx,cy))} cases</option>`).join('')}</select></label><p class="quiet small">Des mineurs à la main, des bûcherons : rattachez-les au dépôt du filon, de la gare, pour que le fret l’emporte.</p></section>`;}
  if(vil.length)h+=`<section class="pane"><h2>Bâtir <small>la barre en bas de la carte (B)</small></h2><p class="small">Choisissez un bâtiment en bas, cliquez sa place : ces ${vil.length} villageois y iront. Clic droit sur un arbre, un rocher, un buisson : ils ramassent et rapportent au dépôt le plus proche — ou envoyez-les à un camp, ils récoltent tout autour.</p></section>`;
  return h;}
// Le cinéma : l'interface s'efface, des bandes noires et une vignette cadrent l'image, et la caméra suit l'action (director.js).
// la vue 3D (V) : les modèles à la place des images ; un choix retenu d'une partie à l'autre
async function toggle3d(force,quiet){const on=true;   // la vue 2D d'origine est retirée : toujours la 3D
const ok=await view.set3d(on);const b=document.getElementById('b3d');if(b)b.classList.toggle('on',ok);if(!quiet)say(ok?'Vue 3D.':on?'La 3D n’est pas disponible ici.':'Vue dessinée.','good');}
// la 3D est la vue par défaut ; le choix « vue dessinée » est retenu
setTimeout(()=>toggle3d(true,true),0);
function toggleCine(force){const cs=document.body.classList,on=force??!cs.contains('cine');if(on===cs.contains('cine'))return;
  if(on){ui.cinePanelWas=cs.contains('nopanel');cs.add('cine','nopanel');}else{cs.remove('cine');if(!ui.cinePanelWas)cs.remove('nopanel');}
  view.dir.on=on;view.dir.reset();dispatchEvent(new Event('resize'));
  say(on?'Cinéma : la caméra suit l’action, l’interface s’efface. Touchez à la caméra pour la reprendre ; K ou Échap pour sortir.':'Interface affichée.');}
function togglePanel(){document.body.classList.toggle('nopanel');dispatchEvent(new Event('resize'));say(document.body.classList.contains('nopanel')?'Interface masquée : Tab pour la remettre.':'Interface affichée.');}
function doing(u){const T=u.task;if(u.h?.state==='hors')return u.carriedBy?'on le porte vers les soins':'à terre';if(!T)return u.carry?'rapporte au dépôt':u.anim==='aim'?'tire':'rien';const b=T.b!=null?world.building(T.b):null;
  return {gather:'ramasse',build:`bâtit ${b?BUILDINGS[b.k].name.toLowerCase():''}`,repair:'répare',work:b&&BUILDINGS[b.k].hub?'récolte autour du camp':`travaille : ${b?BUILDINGS[b.k].name.toLowerCase():''}`,move:'marche',guard:'en position',assault:'attaque en avançant',attack:'attaque',line:'pose une voie, un mur',deposit:'dépose',board:'embarque',
    zone:`tir sur zone${T.n<1e9?` : ${T.fired}/${T.n} coups`:` : ${T.fired} coups`}`,evac:'porte un blessé',soigne:'soigne un blessé',operer:'opère sous la tente',hosp:'va se faire soigner',shelter:'court aux abris'}[T.kind]||T.kind;}
// ---------- la gestion : usines, rattachements, dépôts ----------
const SRC={equilibre:'équilibrage',want:'commande',reserve:'réserve',usine:'usine',chantier:'chantier',voie:'voies, murs tracés',locomotive:'locomotive',objectif:'objectif (le rare)',front:'soldats à portée'};
function depotOpt(d,b,cur){const [x,y]=world.bc(b);return `<option value="${d.id}" ${cur===d.id?'selected':''}>${esc(BUILDINGS[d.k].name)} · ${esc(world.cityName(d))} — ${Math.round(world.distB(d,x,y))} cases</option>`;}
function factoryPane(b){const B=BUILDINGS[b.k];const list=world.productsOf(b);const R=b.prod&&world.recipe(b,b.prod);const n=world.workers(b).filter(u=>u.at).length;const out=world.building(b.out);const coal=world.coalRate(b);
  let h=`<section class="pane"><h2>Production <small>une seule à la fois</small></h2>
    <label class="row small">Fabrique <select data-prod="${b.id}"><option value="">— rien, à l’arrêt —</option>${list.map(k=>`<option value="${esc(k)}" ${k===b.prod?'selected':''}>${esc(world.productName(k))}</option>`).join('')}</select></label>`;
  if(R){const per=n?R.hours/n/world.mod(B.factory.mod):null;
    h+=`<div class="recipe"><span class="costs">${costHtml(R.in)}</span><span class="arrow">→</span><span class="costs">${R.tool?'<span class="quiet">outillage</span>':costHtml(R.out)}</span></div>
      <p class="quiet small">${R.tool?`D’abord l’outillage pour ${esc(world.design(R.tool)?.name||'')} : 6 h de travail.`:`Un lot : ${fmt(R.hours,1)} h de travail${per?` · ${hours(per)} avec ${n} au poste`:' · personne au poste'}`}${coal?` · les machines brûlent ${fmt(coal,2)} charbon par heure et par Meumeu`:''}.</p>`;
    if(b.batch)h+=`<div class="kv"><span>Lot en cours</span><b>${Math.round(Math.min(1,b.batch.done/b.batch.hours)*100)} %</b></div><i class="gauge"><i style="width:${Math.round(Math.min(1,b.batch.done/b.batch.hours)*100)}%"></i></i>`;
    if(!R.tool)h+=`<div class="kv"><span>Plafond</span><b class="kctl"><button class="small ghost" data-limit="-1">−</button> ${b.limit||'sans limite'} <button class="small ghost" data-limit="1">+</button></b></div>
      <p class="quiet small">Elle s’arrête quand son dépôt de sortie en a ${b.limit||'…'} (il en a ${n1(out?.stock[b.prod]||0)}). Sans limite : elle tourne tant qu’elle a ses matières.</p>`;}
  h+=`<div class="row"><button class="small ${b.halt?'':'ghost'}" data-act="halt">${b.halt?'Reprendre':'Arrêter l’usine'}</button><span class="quiet small">${b.made||0} lot${(b.made||0)>1?'s':''} faits</span></div></section>`;
  return h+linksPane(b);}
function linksPane(b){const near=world.reach(b);
  const sel=w=>`<select data-link="${w}">${near.map(d=>depotOpt(d,b,b[w])).join('')||'<option value="">aucun à portée</option>'}</select>`;
  let h=`<section class="pane"><h2>Rattachements <small>des dépôts à moins de ${RADIUS} cases</small></h2>`;
  if(world.takesIn(b))h+=`<label class="row small">Approvisionnée par ${sel('sup')}</label>`;
  if(world.givesOut(b))h+=`<label class="row small">Livre à ${sel('out')}</label>`;
  const need=world.takesIn(b)&&world.factoryNeed(b);const sup=world.building(b.sup);
  if(need&&sup){const {inb}=world.demandLines(sup);h+=`<h3>Sa commande au dépôt d’approvisionnement</h3>${Object.entries(need).map(([k,n])=>{const have=sup.stock[k]||0;return `<div class="kv"><span>${ico(k)} ${esc(world.goodName(k))}</span><b class="${have>=n-1e-6?'good':have>0?'':'warn'}">${n1(have)} / ${n1(n)}${inb[k]?` · <span class="good">+${n1(inb[k])} en route</span>`:''}</b></div>`;}).join('')}`;}
  else if(world.takesIn(b))h+=`<p class="quiet small">Pas de commande en ce moment (${b.halt?'usine arrêtée':!b.prod?'aucune production':'plafond atteint'}).</p>`;
  h+=`<p class="quiet small">Le dépôt d’approvisionnement porte la commande : le bureau du fret y amène ce qui manque, dans l’ordre des priorités. Reliez-le : porteurs, rail.</p></section>`;return h;}
function wantGoods(){return [...GOODS,...world.designsOf('meumeu').flatMap(d=>['m:'+d.id,'a:'+d.id]),...world.armorsOf('meumeu').map(a=>'p:'+a.id)];}
function depotPane(b){const B=BUILDINGS[b.k];const st=Object.entries(b.stock).filter(([,v])=>v>=.05);const used=world.stored(b);const {lines,inb,outb,def}=world.demandLines(b);const L=world.linkedTo(b);const p=b.prio??3;
  let h=`<section class="pane"><h2>Dépôt <small>${n0(used)}/${B.store} caisses</small></h2><i class="gauge"><i style="width:${Math.min(100,used/B.store*100)}%"></i></i>
    <div class="stockrow">${st.map(([k,v])=>`<span class="rchip" title="${esc(world.goodName(k))}">${ico(k)}<b>${n1(v)}</b></span>`).join('')||'<span class="quiet">vide</span>'}</div>${(b.pass||[]).length?`<p class="small">${b.pass.length} passagers attendent l’avion.</p>`:''}
    <div class="row"><span class="quiet small">Ravitaillement</span><div class="seg prio"><button data-prio="3" class="${p<5?'on':''}" title="Les biens de base se répartissent d’eux-mêmes entre les dépôts">Équilibré</button><button data-prio="5" class="${p>=5?'on':''}" title="Servi avant tous les autres, une part plus grosse : le front, les usines d’armement">Prioritaire</button></div></div>
    <p class="quiet small">${p>=5?'Prioritaire : le fret le sert en premier et lui amène une part et demie des biens de base.':'Équilibré : bois, pierre, charbon, pièces, métaux, poudre, munitions se répartissent seuls entre les dépôts reliés (porteurs, rail).'} Pour autre chose, commandez-le ci-dessous.</p>
    <div class="kv"><span>Porteurs</span><b class="kctl"><button class="small ghost" data-act="porters-off" ${world.porters(b).length?'':'disabled'} title="Un porteur redevient villageois">−</button> ${world.porters(b).length} <button class="small ghost" data-act="porters" ${world.idle().length?'':'disabled'} title="Un villageois oisif devient porteur de ce dépôt">+</button></b></div>
    <p class="quiet small">Rayon : il sert les chantiers, usines et soldats à ${RADIUS} cases ; ses porteurs (${n0(world.capOf({k:'porteur'}))} caisses chacun) vont à pied jusqu’aux dépôts à ${VEHICLES.porteur.range} cases. Aucun n’est obligatoire : le rail et les autres dépôts le servent aussi.${world.idle().length?'':' Aucun villageois oisif à affecter.'}</p>
    ${B.big?'':`<div class="row"><button class="small ${b.evac===false?'ghost':''}" data-act="evac">${b.evac===false?'Trop-plein gardé ici':'Trop-plein évacué'}</button><span class="quiet small">plein à ${Math.round(FRET.EVAC_HI*100)} %, il envoie le surplus au grand dépôt le plus proche</span></div>`}</section>`;
  const byK={};for(const l of lines)(byK[l.k]??=[]).push(l);const miss=Object.fromEntries(def.map(d=>[d.k,(def.filter(x=>x.k===d.k).reduce((a,x)=>a+x.n,0))]));
  h+=`<section class="pane"><h2>Demandes <small>ce que le fret doit y amener</small></h2>${Object.keys(byK).length?`<table class="dem"><thead><tr><th>Bien</th><th>Pour</th><th>Voulu</th><th>Ici</th><th>En route</th></tr></thead><tbody>${Object.entries(byK).map(([k,ls])=>ls.map((l,i)=>{
      const by=l.src==='usine'||l.src==='chantier'||l.src==='reserve'?`<a data-selb="${l.by}">${esc(BUILDINGS[world.building(l.by)?.k]?.name||'?')}</a>`:l.src==='locomotive'?`locomotive « ${esc(world.s.vehicles.find(v=>v.id===l.by)?.name||'')} »`:SRC[l.src];
      const ctl=l.src==='want'?` <button class="small ghost" data-want="${esc(k)}:-10">−</button><button class="small ghost" data-want="${esc(k)}:10">+</button>`:'';
      return `<tr class="${miss[k]>.05?'short':''}"><td>${i?'':`${ico(k)} ${esc(world.goodName(k))}`}</td><td>${by}${l.p!==p?` <small class="quiet">(${l.p<1?'en dernier':PRIO[l.p]?.toLowerCase()})</small>`:''}</td><td>${n1(l.n)}${ctl}</td><td>${i?'':n1(b.stock[k]||0)}</td><td>${i?'':inb[k]?`<span class="good">+${n1(inb[k])}</span>`:miss[k]>.05?'<span class="warn">manque</span>':''}</td></tr>`;}).join('')).join('')}</tbody></table>`:'<p class="quiet small">Aucune demande : rien n’y sera amené.</p>'}
    <div class="row"><span class="quiet small">Commander</span><select data-wantk>${wantGoods().map(k=>`<option value="${esc(k)}" ${ui.wantK===k?'selected':''}>${esc(world.goodName(k))}</option>`).join('')}</select><button class="small" data-act="want-add">+10</button><button class="small" data-act="want-add50">+50</button></div>
    <p class="quiet small">Une commande est permanente : le dépôt en réclame jusqu’à en avoir autant (− pour la réduire).</p></section>`;
  const lk=(arr,lbl)=>arr.length?`<div class="kv"><span>${lbl}</span><b>${arr.map(x=>`<a data-selb="${x.id}">${esc(BUILDINGS[x.k].name)}${x.prod?` (${esc(world.productName(x.prod).toLowerCase())})`:''}</a>`).join(', ')}</b></div>`:'';
  const vs=world.s.vehicles.filter(v=>v.f===b.f&&(v.job?.to===b.id||v.job?.from===b.id));
  h+=`<section class="pane"><h2>Rattachés, fret</h2>${lk(L.sup,'S’y approvisionnent')}${lk(L.out,'Y livrent')}${lk(L.site,'Chantiers')}${!L.sup.length&&!L.out.length&&!L.site.length?'<p class="quiet small">Aucun bâtiment rattaché.</p>':''}
    ${vs.map(v=>`<div class="kv"><span><a data-vehicle="${v.id}">${esc(VEHICLES[v.k].name)} « ${esc(v.name)} »</a></span><b class="small">${esc(world.jobText(v))}</b></div>`).join('')||'<p class="quiet small">Aucun véhicule en route pour ce dépôt.</p>'}</section>`;
  return h;}
// la réserve d'une caserne, d'une fonderie, d'un hôpital : ce que son dépôt garde pour les prochaines formations
function reservePane(b){const sup=world.building(b.sup);const need=b.need||{};
  let h=`<section class="pane"><h2>Réserve <small>à son dépôt, pour les prochains</small></h2>${Object.entries(need).map(([k,n])=>`<div class="kv"><span>${ico(k)} ${esc(world.goodName(k))}</span><b class="kctl">${n1(sup?.stock[k]||0)} / ${n} <button class="small ghost" data-need="${esc(k)}:-${n>=20?10:2}">−</button><button class="small ghost" data-need="${esc(k)}:${n>=20?10:2}">+</button></b></div>`).join('')||'<p class="quiet small">Aucune réserve.</p>'}
    <div class="row"><select data-wantk>${wantGoods().map(k=>`<option value="${esc(k)}" ${ui.wantK===k?'selected':''}>${esc(world.goodName(k))}</option>`).join('')}</select><button class="small" data-act="need-add">Réserver 4 de plus</button></div>
    <p class="quiet small">Le dépôt rattaché réclame cette réserve au fret : des fusils, des vivres, des pièces là où l’on forme — pas à l’autre bout de la ville.</p></section>`;
  return h+linksPane(b);}
function sitePane(b){const cost=world.siteCost(b);if(!Object.keys(cost).length)return '';const site=world.building(b.site);
  return `<section class="pane"><h2>Matériaux <small>payés à mesure qu’ils arrivent</small></h2>${Object.entries(cost).map(([k,v])=>{const pd=b.paid?.[k]||0;return `<div class="kv"><span>${ico(k)} ${esc(world.goodName(k))}</span><b class="${pd>=v-1e-6?'good':''}">${n1(pd)} / ${n1(v)}</b></div>`;}).join('')}
    ${b.k==='gare'&&b.site===b.id?'<p class="small good">Tête de ligne : les trains apportent les matériaux directement sur ce chantier relié au réseau.</p>':''}
    ${(()=>{const bs=world.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id);const on=bs.filter(u=>u.task.fetch!=null||u.task.bring).length;const idle=world.idle().length;
      return `<div class="row"><span>Bâtisseurs : <b>${bs.length}</b>${on?` · ${on} en chemin avec des matériaux`:''}</span><button class="small" data-act="site-idle" ${idle?'':'disabled'}>Envoyer ${Math.min(2,idle)||2} oisifs</button></div>`;})()}
    <label class="row small">Dépôt du chantier <select data-sitedep>${world.depots('meumeu',...world.bc(b),SITE_RANGE).filter(d=>!BUILDINGS[d.k].foodOnly).map(d=>`<option value="${d.id}" ${site?.id===d.id?'selected':''}>${esc(world.depotName(d))} · ${Math.round(world.distB(d,...world.bc(b)))} cases</option>`).join('')}</select></label>
    <p class="quiet small">Les bâtisseurs vont y chercher les matériaux à pied, ${CARRY} caisses par voyage. Ce qui manque au dépôt y est commandé : le fret l’y amène (porteurs, trains, depuis les gares reliées). Choisissez des Meumeu, clic droit sur le chantier : ils y travaillent.</p></section>`;}
function buildingPane(b){if(b.f==='beee'&&world.s.fog!==false&&!world.visibleAt('meumeu',...world.bc(b))){const I=world.s.intel?.[b.id];return `<section class="pane"><h2>${esc(BUILDINGS[b.k].name)} bèè</h2><p>Dernière observation : ${I?Math.ceil((world.t-I.t)*HOUR_REAL)+' s':'inconnue'}.</p><p class="quiet">Hors de vue : état actuel, production, stocks et effectifs inconnus.</p></section>`;}const B=BUILDINGS[b.k];const beee=b.f==='beee';let h=`<section class="pane"><div class="bhead">${bthumb(b.k)?`<img src="${bthumb(b.k)}" alt="">`:''}<div><h2>${B.name}${beee?' bèè':''} <small>${esc(world.cityName(b))}</small></h2>
    <div class="kv"><span>Solidité</span><b class="${b.hp<b.max*.4?'bad':''}">${n0(b.hp)}/${b.max}${b.fire>0?' · <span class="bad">en feu</span>':''}${b.ruin?' · <span class="bad">en ruine</span>':''}</b></div></div></div>
    ${!b.done&&!beee?`<div class="kv"><span>Chantier</span><b>${Math.round(b.progress*100)} % · ${world.s.units.filter(u=>u.task?.b===b.id).length} dessus</b></div><i class="gauge"><i style="width:${Math.round(b.progress*100)}%"></i></i>`:''}${b.why?`<p class="small warn">${esc(b.why)}</p>`:''}<p class="quiet small">${esc(B.why)}</p>`;
  if(!b.done&&!b.ruin&&!beee){h+='</section>'+sitePane(b);return h;}
  if(!beee){if(B.workers&&b.done){const n=world.workers(b).length;h+=`<div class="row"><span>${n}/${B.workers} ${B.hub?'récoltent':'au travail'}</span>${n<B.workers&&world.idle().length?`<button class="small" data-act="send-idle">Envoyer ${Math.min(B.workers-n,world.idle().length)} oisifs</button>`:''}</div>`;}
    if(B.hub&&b.done){const around=['tree','rock','bush'].map(t=>[t,world.s.nodes.filter(n=>n.type===t&&n.left>=1&&world.distB(b,n.i+.5,n.j+.5)<10).length]);
      h+=`<div class="row"><span class="quiet small">Récolter</span><div class="seg">${[['auto','Ce qui manque'],['bois','Bois'],['pierre','Pierre'],['vivres','Baies']].map(([k,n])=>`<button data-hub="${k}" class="${(b.res||'auto')===k?'on':''}">${n}</button>`).join('')}</div></div>
        <p class="small quiet">Autour du camp (10 cases) : ${around.map(([t,n])=>`${n} ${NODES[t].name.toLowerCase()}${n>1?'s':''}`).join(', ')}.</p>`;}
    if(b.fire>0||b.ruin||b.hp<b.max-1)h+=`<div class="row"><button class="small warn" data-act="send-repair">${b.ruin?'Envoyer rebâtir':'Envoyer éteindre, réparer'}</button></div>`;
    if(!b.done&&!b.ruin)h+=`<div class="row"><button class="small ghost" data-act="cancel-site">Annuler (rembourse)</button></div>`;
    if(B.defense&&b.done){const wid=world.bestRifle('meumeu');h+=`<div class="kv"><span>Tireurs</span><b>${Math.round(B.defense.shooters*world.mod('creneaux'))+Math.floor((b.hide||[]).length/3)} · ${esc(world.design(wid)?.name||'')}</b></div>${b.dry?'<p class="small bad">À sec : aucune caisse de munitions dans les dépôts voisins.</p>':''}`;}}
  h+='</section>';
  if(b.k==='centre'&&!beee&&b.done){const st=world.cityStats(b);h+=`<section class="pane"><h2>La ville <small>${esc(b.city||'')}</small></h2><div class="kv"><span>Habitants</span><b>${st.res}</b></div><div class="kv"><span>Rations</span><b class="${(b.ration??1)<.5?'bad':(b.ration??1)<1?'warn':''}">${Math.round((b.ration??1)*100)} % des besoins</b></div>
    <div class="kv"><span>Rations</span><b class="${(b.ration??1)<.999?'warn':''}">${(b.ration??1)<.999?`${Math.round((b.ration??0)*100)} % couverts`:'Approvisionnées'}</b></div><div class="kv"><span>Vivres en ville</span><b>${n1(b.stock.vivres||0)} · ${n1(world.cityFoodRate(b)*24)} / jour</b></div>
    <div class="row"><button class="small ${b.grow===false?'ghost':''}" data-act="grow">${b.grow===false?'Croissance arrêtée':'Croissance : le centre forme des villageois'}</button><span class="quiet small">25 vivres chacun, automatiquement, tant que la ville a de quoi tenir (une réserve de vivres pour un à trois jours, selon qu’un moulin tourne)</span></div>
    <p class="quiet small">Chaque ville consomme ses vivres et réclame deux jours de réserve au fret. Les soldats consomment davantage. Sous 50 % de rations, la croissance ralentit ; sans vivres, le recrutement attend. Une maison compte pour la ville la plus proche (26 cases).</p></section>`;}
  if(b.stock&&!beee&&b.done)h+=depotPane(b);
  if(beee){h+=`<section class="pane war"><p>Choisissez des soldats, puis clic droit sur ce bâtiment : au contact, ils le saccagent et y mettent le feu ; les commandos y posent leurs charges. Les canons l’abattent de loin ; un bombardier, d’en haut.${!world.atWar?' <b>Nous sommes en paix : attaquer, c’est déclarer la guerre.</b>':''}</p></section>`;return h;}
  if(!b.done)return h;
  const mine=world.designsOf('meumeu');
  if(B.lab){const dev=b.dev&&INNOV.find(x=>x.id===b.dev.id);h+=`<section class="pane"><h2>Recherche</h2>${dev?`<p>En développement : <b>${esc(dev.name)}</b> — encore ${hours(b.dev.left)}.</p><i class="gauge"><i style="width:${Math.round((1-b.dev.left/b.dev.total)*100)}%"></i></i>`:'<p class="quiet small">Rien en cours.</p>'}
    <div class="row"><button data-modal="innov">Les idées des Meumeu (${world.s.innov.ideas.length})</button></div><p class="quiet small">${world.s.innov.done.length} innovation${world.s.innov.done.length>1?'s':''} adoptée${world.s.innov.done.length>1?'s':''}.</p></section>`;}
  if(B.factory)h+=factoryPane(b);else if(b.need)h+=reservePane(b);
  else if(B.makes||b.k==='mine'){const nd=b.k==='mine'&&world.s.nodes[b.ore];h+=nd?`<section class="pane"><div class="kv"><span>Filon</span><b>${ico(nd.res)} ${esc(RES[nd.res].name)} · ${n0(nd.left)} restant</b></div></section>`:'';
    // le moulin : le blé récolté, les vivres moulus, combien de bouches ça nourrit
    if(b.k==='moulin'){const Y=world.cropYield(b);const nw=world.workers(b).filter(u=>u.at).length;const rate=(B.makes.vivres||0)*nw*world.mod('ferme')*Y;const full=(B.makes.vivres||0)*B.workers*world.mod('ferme')*Y;
      h+=`<section class="pane"><h2>Récolte <small>blé → vivres</small></h2><div class="kv"><span>Blé récolté → vivres</span><b>${n1(rate*(B.ble||1))} blé/h → <span class="good">${n1(rate)} vivres/h</span></b></div>
        <div class="kv"><span>Nourrit</span><b class="${nw<B.workers?'warn':''}">${Math.floor(rate/.12)} Meumeu${nw<B.workers?` · ${Math.floor(full/.12)} avec ${B.workers} ouvriers`:''}</b></div>
        <div class="kv"><span>Depuis sa fondation</span><b>${n0(b.ble||0)} blé · ${n0(b.madeV||0)} vivres</b></div></section>`;}
    if(B.soil){const Y=world.cropYield(b);h+=`<section class="pane"><div class="kv"><span>Terre</span><b class="${Y<.7?'warn':Y>=1.15?'good':''}">rendement ${Math.round(Y*100)} % · ${Y>=1.3?'terre noire':Y>=1.15?'bonne terre':Y>=.8?'terre moyenne':'terre maigre'}</b></div><p class="quiet small">La fertilité de ${b.k==='moulin'?'ses huit champs':'ses neuf cases'} (F : la carte des sols). Un obus, une bombe, un incendie la ruinent pour longtemps.</p></section>`;}
    if(B.makes){const lim=b.limit??B.limit??0;const out=world.building(b.out);const k0=Object.keys(B.makes)[0];h+=`<section class="pane"><div class="kv"><span>Plafond</span><b class="kctl"><button class="small ghost" data-mlimit="-1">−</button> ${lim||'sans limite'} <button class="small ghost" data-mlimit="1">+</button></b></div>
      <p class="quiet small">Il s’arrête quand son dépôt de sortie en a ${lim||'…'} (il en a ${n0(out?.stock[k0]||0)}).</p></section>`;}
    h+=linksPane(b);}
  if(B.design){const ds=Object.values(world.s.designs).filter(d=>d.f==='meumeu'&&!d.relance),nb=s=>ds.filter(d=>d.status===s).length;h+=`<section class="pane"><h2>Bureau d’études</h2>${b.proto?`<p>Prototype en fabrication : <b>${esc(world.design(b.proto.id)?.name)}</b> — encore ${hours(b.proto.left)}.</p>`:''}
    <div class="row"><button data-act="design">Concevoir une arme</button><button data-act="armor">Concevoir une protection</button></div>${b.protoA?`<p>Protection en fabrication : <b>${esc(world.s.armors[b.protoA.id]?.name)}</b> — encore ${hours(b.protoA.left)}.</p>`:''}<div class="row"></div>
    <p class="quiet small">${nb('adopte')} conception${nb('adopte')>1?'s':''} adoptée${nb('adopte')>1?'s':''}${nb('prototype')?`, ${nb('prototype')} en étude`:''}${nb('perdu')?`, <span class="warn">${nb('perdu')} à relancer</span>`:''}.</p></section>`;}
  if(B.archives){const man=world.s.buildings.find(x=>x.f==='meumeu'&&x.k==='manufacture'&&!x.ruin);const far=man?Math.hypot(man.i-b.i,man.j-b.j):null;h+=`<section class="pane"><p>${man?(far>=20?`À ${Math.round(far)} cases de la manufacture : les plans sont à l’abri.`:`<span class="warn">Trop près de la manufacture (${Math.round(far)} cases) : une même bombe emporterait tout.</span>`):'Pas encore de manufacture.'}</p></section>`;}
  if(B.ward){const L=b.wardList||[];h+=`<section class="pane"><h2>${B.tent?'Sous la tente':'Blessés'} <small>${L.length}/${B.ward} lits${B.tent?' · on y opère, on y stabilise':B.ward<=4?' · un poste de secours : on y guérit lentement':''}</small></h2>${L.map(u=>{const tr=triage(u.h);return `<div class="kv"><span><i class="tri" style="background:${tr.c}"></i><a data-fiche="${u.id}">${esc(unitName(u))}</a></span><b>${Math.round(u.h.blood/BLOOD*100)} % de sang${needsSurgery(u.h)?' · <span class="bad">à opérer</span>':''}${u.h.legs||u.h.arms?` · os : ${Math.max(0,Math.round(72-(u.h.bone||0)))} h`:''}</b></div>`;}).join('')||`<p class="quiet small">${B.tent?'Personne. Les infirmiers y portent ceux qui tombent près d’ici ; un médecin y opère.':'Personne. Les soignants y ramènent ceux qui sont à terre ; les blessés qui le peuvent y viennent d’eux-mêmes.'}</p>`}
    ${B.tent?`<p class="small ${world.s.units.some(u=>u.task?.kind==='operer'&&u.task.b===b.id)?'good':'warn'}">${world.s.units.some(u=>u.task?.kind==='operer'&&u.task.b===b.id)?'Un médecin opère.':'Aucun médecin sur place : on y stabilise sans opérer.'}</p>`:''}</section>`;}
  if((B.trains?.includes('soldat')||B.trains?.includes('choc'))&&b.f==='meumeu'){const elite=B.trains.includes('choc');const L=(b.inside||[]).slice().sort((a,z)=>(z.xp||0)-(a.xp||0));const n=Math.min(L.length,ui.relN??L.length)||0;
    h+=`<section class="pane"><h2>Tenue des recrues</h2><div class="kv"><span>Les soldats sortent en</span><b><select data-skin="${b.id}">${[['meumeu','Meumeu (normal)'],['meumeu_soldat','Soldat camouflé'],['plush_cow_knight','Élite à cape']].map(([v,n])=>`<option value="${v}" ${(b.skin||'meumeu')===v?'selected':''}>${n}</option>`).join('')}</select></b></div></section>`;
    h+=`<section class="pane"><h2>À l’entraînement <small>${L.length} dans la caserne</small></h2>
      ${L.map(u=>`<div class="kv"><span>${esc(unitName(u))} <small class="quiet">${u.k==='villageois'?'villageois':esc(UNITS[u.k]?.name||u.k)}</small></span><b>${hours(u.drillT||0)} · ${rankOf(u.xp)}${(u.xp||0)>=DRILL_MAX?' <small class="quiet">(le reste au combat)</small>':''} <button class="small ghost" data-relone="${u.id}">Sortir</button></b></div>`).join('')||'<p class="quiet small">Personne. Choisissez des villageois (ou des soldats), clic droit sur la caserne : ils y entrent et s’entraînent. Plus ils y restent, mieux ils tirent — jusqu’à « entraîné » ; au-delà, seul le combat les aguerrit.</p>'}
      ${(()=>{const hv=world.have('meumeu',b.i+1,b.j+1);return `<div class="kv"><span>Équipement au dépôt</span><b>${ico('jumelles')} ${n0(hv.jumelles||0)} jumelles · ${ico('tenue_camo')} ${n0(hv.tenue_camo||0)} tenues · ${ico('jumelles_ir')} ${n0(hv.jumelles_ir||0)} IR · ${ico('explosifs')} ${n1(hv.explosifs||0)} explosifs</b></div>`;})()}
      ${L.length?(()=>{const relK=elite?'choc':(ui.relK&&ui.relK!=='choc'?ui.relK:'soldat'),hv=world.have('meumeu',b.i+1,b.j+1);const pieces=mine.filter(d=>world.W(d.id).crew>1);
        const psel=ui.relP&&pieces.some(d=>d.id===ui.relP)?ui.relP:(pieces.find(d=>(hv['a:'+d.id]||0)>=1)||pieces[0])?.id;const Wp=psel&&world.W(psel);
        const modes=elite?[['choc',`troupe de choc (${UNITS.choc.cost.vivres} vivres et ${UNITS.choc.cost.pieces} pièces chacun pour la formation)`]]:[['soldat','soldats'],['servant','servants de pièce (sans arme, avec des caisses de la pièce)'],['equipage','équipage complet d’une pièce (tireur + servants, en escouade)']];
        const armeLegere='aucune arme';
        const crewPane=relK==='equipage'||relK==='servant'?`<div class="row small">Pièce servie <select id="relp" data-relp>${pieces.map(d=>`<option value="${d.id}" ${d.id===psel?'selected':''}>${esc(d.name)} — ${n0(hv['a:'+d.id]||0)} en stock</option>`).join('')||'<option value="">aucune pièce servie adoptée</option>'}</select></div>
          <p class="quiet small">${Wp?(relK==='equipage'?`Il faut <b>${Wp.crew}</b> recrues (1 tireur et ${Wp.crew-1} servant${Wp.crew>2?'s':''}) : ${L.length} à la caserne${L.length<Wp.crew?' <span class="warn">— pas assez</span>':''}. Le tireur prend la pièce (${n0(hv['a:'+psel]||0)} au dépôt) et ses obus ; chaque servant ne prend ${armeLegere}, seulement des caisses de la pièce (${n1(hv['m:'+psel]||0)} caisses au dépôt). Ils sortent ensemble, en escouade.`:`Chaque servant ne prend ${armeLegere}, seulement des caisses de la pièce (${n1(hv['m:'+psel]||0)} caisses au dépôt) : il les apporte au tireur. S’il n’y en a pas, il sort quand même et ira chercher les obus quand la pièce sera à sec.`):'Adoptez d’abord une pièce servie (obusier, mitrailleuse à trépied…) au bureau d’études.'}</p>`:'';
        return `<div class="row small">Faire sortir ${relK==='equipage'?'':`<b class="kctl"><button class="small ghost" data-reln="-1">−</button> ${n} <button class="small ghost" data-reln="1">+</button></b> en `}<select id="relk" data-relk>${modes.map(([k,t])=>`<option value="${k}" ${relK===k?'selected':''}>${t}</option>`).join('')}</select></div>${crewPane}
        <div class="row small"><label class="small">charges<select id="relc" title="une demi-caisse d’explosifs chacune : pour faire sauter un bâtiment, un filon"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label> <label class="small">équipement <select id="relnv" title="jumelles : la vue porte à 44 cases de jour ; tenue camouflée : moins visible ; jumelles IR : de plus 22 cases de nuit dans leur faisceau (batterie sans recharge)"><option value="">rien</option><option value="jum">jumelles</option><option value="camo">tenue camouflée</option><option value="jumcamo">jumelles + tenue</option><option value="bino">jumelles IR</option><option value="both">jumelles IR + tenue</option></select></label> <button class="small" data-act="release">Faire sortir</button></div><p class="quiet small">Armés et protégés comme choisi ci-dessous, avec leurs munitions. Avec des charges, des jumelles ou une tenue, c’est un commando : l’équipement se prend au dépôt (l’atelier fait jumelles et tenues).</p>`;})():''}</section>`;}
  // ce qu'un bâtiment produit : une unité, un véhicule de fret, ou un véhicule de combat (garage)
  const PD=k=>UNITS[k]||VEHICLES[k]||(()=>{const V=world.vehDef({k});return V&&{name:V.name,hours:V.heures,why:V.why,cost:V.cout};})();
  if(B.trains){const have=world.have('meumeu',b.i+1,b.j+1);const guns=mine;const wsel=ui.trainW[b.id]||guns.find(d=>(have['a:'+d.id]||0)>=1)?.id||'mle1';const asel=ui.trainA[b.id]!==undefined?ui.trainA[b.id]:(world.armorsOf('meumeu').find(a=>(have['p:'+a.id]||0)>=1)?.id||'');
    h+=`<section class="pane"><h2>Former, construire ${b.queue.length?`<small>${b.queue.map(q=>`${PD(q.k).name.toLowerCase()} ${hours(q.left)}`).join(' · ')}</small>`:''}</h2>
      ${B.trains.some(k=>UNITS[k]?.arm)?`<label class="row small">Armés de <select data-trainw="${b.id}">${guns.map(d=>`<option value="${d.id}" ${d.id===wsel?'selected':''}>${esc(d.name)} — ${n0(have['a:'+d.id]||0)} en stock</option>`).join('')}</select></label>
        <label class="row small">Protégés par <select data-traina="${b.id}"><option value="">rien</option>${world.armorsOf('meumeu').map(a=>`<option value="${a.id}" ${a.id===asel?'selected':''}>${esc(a.name)} (${Math.round(deriveArmor(a.a).mass*1000)} g) — ${n0(have['p:'+a.id]||0)} en stock</option>`).join('')}</select></label>
        ${(()=>{const Wd=world.W(wsel);const Ar=asel&&world.armorOf(asel);const kg=Wd.mass+(Ar?Ar.D.mass:0)+Wd.carry*Wd.rm/1000;return `<p class="quiet small">Dotation : ${Math.round(kg*1000)} g portés (${Math.round(kg/1.5*100)} % de son poids) · marche ×${fmt(Ar?Ar.D.move:1,2)}.</p>`;})()}<label class="row small">Rôle des recrues armées <select data-trainrole="${b.id}"><option value="tireur" ${(ui.trainRole[b.id]||'tireur')==='tireur'?'selected':''}>Tireur</option><option value="munitions" ${ui.trainRole[b.id]==='munitions'?'selected':''}>Porteur de munitions</option></select></label><p class="quiet small">Ralliez le porteur à l’escouade qu’il ravitaille depuis sa fiche.</p>`:''}
      <div class="offers">${B.trains.filter(k=>!(VEHDEF[k]?.faction&&VEHDEF[k].faction!==b.f)).map(k=>{const D=PD(k);const r=world.canTrain(b,k,wsel,asel||null);
      return `<div class="offer ${r.ok?'can':''}"><div class="ohead"><b>${D.name}</b><small class="quiet">${D.hours} h</small></div><p>${esc(D.why)}</p><div class="row between"><span class="costs">${costHtml(r.cost||D.cost,have)}</span><button class="small" data-train="${k}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">${UNITS[k]?'Former':'Construire'}</button></div></div>`;}).join('')}</div><p class="quiet small">Clic droit sur la carte : point de ralliement.</p></section>`;}
  return h;}
// Un véhicule de combat : son état (et ce qui l'arrête), ce qu'il est, sa vitesse, son blindage face par face, ses armes et leurs munitions, ses places
function combatVehiclePane(v){const V=world.vehDef(v);const FACE={avant:'Avant',flanc:'Flancs',arriere:'Arrière',dessus:'Dessus',tourelle:'Tourelle',tourelle_flanc:'Tourelle (flancs)'};
  const etat=v.hp<=0?'<span class="bad">détruit</span>':v.why?`<span class="warn">${esc(v.why)}</span>`:v.state==='go'?'en route':'à l’arrêt';
  let h=`<section class="pane"><h2>${esc(v.name)} <small>${etat}</small></h2><p class="quiet small">${esc(V.why)}</p>`;
  h+=`<div class="kv"><span>État</span><b>${Math.max(0,Math.round(v.hp))} / ${v.max}</b></div><div class="kv"><span>Vitesse</span><b>${Math.round(v.spd||0)} / ${V.vmax} cases/h · ${V.nav==='eau'?'navigue (eau seulement), vire sur place':V.roues==='roues'?`roues, rayon ${V.r} cases`:'chenilles, pivote sur place'}</b></div>`;
  if(V.nav==='eau'){const down=(v.ramp||0)>.5,cv=v.cargoVeh!=null?world.s.vehicles.find(o=>o.id===v.cargoVeh):null;
    h+=`<h3>Barge</h3><div class="kv"><span>Rampe</span><b>${down?'baissée (la proue est ouverte)':'relevée (la proue arrête les balles)'}${v.beached?' · échouée':''}</b></div><div class="kv"><span>Pont</span><b>${cv?esc(cv.name):'aucun véhicule'}</b></div>
      <div class="row"><button class="small" data-act="boat-ramp">${down?'Relever la rampe':'Baisser la rampe'}</button>${down?'<button class="small" data-act="boat-unload">Débarquer</button>':''}</div>
      <p class="quiet small">Clic droit sur l’eau : naviguer. Clic droit sur une plage : s’y échouer (la barge recule d’abord pour se dégager si elle est déjà à terre). Rampe baissée : les passagers sortent par l’avant et courent ; le pilote reste. Un véhicule monte à bord quand vous le choisissez et faites un clic droit sur la barge (rampe baissée, tout près).</p>`;}
  // les dégâts : les organes touchés, le feu, et ce qu'a fait le dernier coup (l'épaisseur effective sous l'angle, contre ce que le projectile perçait)
  const CMP={moteur:'moteur détruit : immobilisé',train:'train de roulement brisé : immobilisé',tourelle:'tourelle bloquée'},mm=x=>x.toLocaleString('fr-FR',{maximumFractionDigits:2});
  const dmg=[...Object.keys(v.comp||{}).filter(k=>v.comp[k]).map(k=>CMP[k]||k),...(v.fire>0?['en feu']:[])];
  if(dmg.length)h+=`<div class="kv"><span>Dégâts</span><b class="bad">${dmg.map(esc).join(' · ')}</b></div>`;
  const L=v.lastHit;if(L)h+=`<div class="kv"><span>Dernier coup</span><b>${FACE[L.face]||L.face}, ${L.obl}° · ${mm(L.te)} mm effectifs contre ${mm(L.pen)} mm · ${L.out==='percé'?'<span class="bad">percé</span>':L.out==='ricochet'?'ricochet':'arrêté'}</b></div>`;
  h+=`<h3>Blindage</h3>${Object.entries(V.blindage).map(([f,[t,a]])=>`<div class="kv"><span>${FACE[f]||f}</span><b>${t>0?`${t.toLocaleString('fr-FR')} mm d’acier${a?`, incliné à ${a}°`:''}`:'découvert'}</b></div>`).join('')}`;
  if(V.armes.length)h+=`<h3>Armement</h3>${v.mounts.map((m,i)=>{const A=V.armes[i],d=world.design(m.w);return `<div class="kv"><span>${esc(d?.name||m.w)}${A.coax?' (coaxiale)':A.jumelle?' (jumelée)':''}</span><b>${A.arc>=360?'tout l’horizon':`±${A.arc/2}°`} · ${m.broken?'<span class="bad">hors d’usage</span> · ':''}${m.mag+m.pouch} coups à bord</b></div>`;}).join('')}`;
  // l'équipage : qui est à bord, à quel poste, dans quel état
  const ROLE={conducteur:'conduit',servant:'aux armes',passager:'passager'};const crew=v.crew||[];
  h+=`<h3>À bord <small>${crew.length} / ${1+V.places.servants+V.places.passagers}</small></h3>${crew.length?crew.map(u=>`<div class="kv"><span>${esc(u.name||UNITS[u.k]?.name||'Meumeu')}</span><b>${ROLE[u.vrole]||u.vrole}${u.h&&u.h.state!=='ok'?` · <span class="warn">${u.h.state==='hors'?'hors de combat':'blessé'}</span>`:''}</b></div>`).join(''):'<p class="quiet small">Personne : il ne roule ni ne tire. Désignez des Meumeu, puis clic droit sur l’engin.</p>'}`;
  if(crew.length)h+=`<div class="row">${crew.some(u=>u.vrole==='passager')?'<button class="small" data-act="veh-out-pass">Débarquer les passagers</button>':''}<button class="small" data-act="veh-out-all">Tout le monde descend</button></div>`;
  h+=`<div class="kv"><span>Places</span><b>conducteur${V.places.servants?` · ${V.places.servants} servant${V.places.servants>1?'s':''}`:''}${V.places.passagers?` · ${V.places.passagers} passager${V.places.passagers>1?'s':''}`:''}${V.soute?` · ${V.soute} caisses`:''}</b></div>`;
  if(V.soute){const used=world.souteUsed(v),items=Object.entries(v.cargo||{}).filter(([,n])=>n>=.05);
    h+=`<h3>Soute <small>${Math.round(used*10)/10} / ${V.soute} caisses</small></h3>${items.length?items.map(([k,n])=>`<div class="kv"><span>${ico(k)} ${esc(world.goodName(k))}</span><b>${n1(n)} <button class="small ghost" data-vunl="${esc(k)}">décharger</button></b></div>`).join(''):'<p class="quiet small">Vide.</p>'}
      <div class="row"><select data-vcargo>${wantGoods().map(k=>`<option value="${esc(k)}" ${ui.vcargoK===k?'selected':''}>${esc(world.goodName(k))}</option>`).join('')}</select><button class="small" data-vload="1">Charger 1</button><button class="small" data-vload="4">Charger 4</button>${items.length?'<button class="small ghost" data-vunl="*">Tout décharger</button>':''}</div>
      <p class="quiet small">On charge et décharge à un dépôt à moins de 4 cases (une caisse de munitions = 1, 10 unités d’une ressource = 1). À l’arrêt, l’équipage, les Meumeu tout près et les armes de l’engin se ravitaillent dans la soute.</p>`;}
  return h+`<p class="quiet small">Clic droit sur la carte : y aller.</p></section>`;}
// plusieurs engins choisis : une ligne chacun (état, structure, équipage, coups à bord) ; un nom ouvre l'engin seul
function vehiclesPane(){const vs=[...view.selVs].map(id=>world.s.vehicles.find(v=>v.id===id)).filter(v=>v&&v.hp>0);if(!vs.length){view.selVs.clear();return overviewPane();}
  const row=v=>{const V=world.vehDef(v),crew=(v.crew||[]).filter(u=>u.hp>0).length,cap=1+V.places.servants+V.places.passagers,coups=v.mounts.reduce((a,m)=>a+m.mag+m.pouch,0);
    const etat=v.why?`<span class="warn">${esc(v.why)}</span>`:v.state==='go'?'en route':'à l’arrêt';
    return `<div class="kv"><span><a data-vehicle="${v.id}">${esc(v.name)}</a></span><b>${etat} · ${Math.round(v.hp)}/${v.max} · ${crew}/${cap} à bord${V.armes.length?` · ${coups} coups`:''}</b></div>`;};
  return `<section class="pane"><h2>${vs.length} engins <small>clic droit : ils y vont de front</small></h2>${vs.map(row).join('')}<p class="quiet small">Maj+clic sur un engin : l’ajouter ou le retirer. Un nom : l’ouvrir seul.</p></section>`;}
function vehiclePane(){const v=world.s.vehicles.find(x=>x.id===view.selV);if(!v){view.selV=null;return overviewPane();}if(world.isCombatVehicle(v))return combatVehiclePane(v);const V=VEHICLES[v.k];
  let h=`<section class="pane"><h2>${V.name} « ${esc(v.name)} » <small>${v.why?`<span class="warn">${esc(v.why)}</span>`:v.mode==='fret'?esc(world.jobText(v)):v.state}</small></h2><p class="quiet small">${esc(V.why)}</p>`;
  if(v.k==='bombardier'){const home=world.building(v.home);h+=`<div class="kv"><span>Solidité</span><b>${n0(v.hp)}/${v.max}</b></div><p>Clic droit sur la carte : il y va, lâche ${V.bombs} bombes, rentre. Il lui faut, à son aérodrome, ${V.bombs} caisses d’explosifs et du carburant.${!world.atWar?' <b>En paix : bombarder les Bèè, c’est déclarer la guerre.</b>':''}</p>${home?`<p class="small">Aérodrome : ${n0(home.stock.explosifs||0)} explosifs, ${n0(home.stock.carburant||0)} carburant.</p>`:''}</section>`;return h;}
  const cap=world.capOf(v);
  h+=`<div class="kv"><span>À bord</span><b>${Object.entries(v.cargo).filter(([,n])=>n>=.05).map(([k,n])=>`${ico(k)}${n1(n)}`).join(' ')||'vide'}${v.pass?.length?` · ${v.pass.length} passagers`:''}</b></div><i class="gauge"><i style="width:${Math.min(100,world.cargoW(v)/cap*100)}%"></i></i><p class="quiet small">${n1(world.cargoW(v))} / ${n1(cap)} caisses · ${v.trips||0} voyages</p>`;
  if(v.k==='train')h+=`<div class="kv"><span>Tender</span><b class="${(v.coal||0)<2?'warn':''}">${fmt(v.coal||0,1)} / ${fmt(world.tender(),0)} charbon</b></div><i class="gauge coal"><i style="width:${Math.min(100,(v.coal||0)/world.tender()*100)}%"></i></i><p class="quiet small">Une caisse de charbon pour ${Math.round(1/FRET.COAL_PER_CASE)} cases. Elle fait le plein en gare avant chaque trajet.</p>`;
  h+=`<div class="row"><span class="quiet small">Service</span><div class="seg">${[['fret','À la demande'],['ligne','Ligne fixe']].map(([k,n])=>`<button data-vmode="${k}" class="${(v.mode||'fret')===k?'on':''}">${n}</button>`).join('')}</div></div>`;
  if(v.mode==='fret'){h+=`<div class="goods"><span class="quiet small">Porte</span>${Object.entries(FAMILIES).map(([k,F])=>`<button class="chip ${!v.only?.length||v.only.includes(k)?'on':''}" data-fam="${k}">${F.name}</button>`).join('')}</div><p class="quiet small">Aucune famille cochée à part : il porte de tout. Un train de charbon, un porteur de munitions : c’est ici.</p>`;
    if(v.k==='porteur'){const base=world.building(v.base)||world.building(v.home);const deps=world.s.buildings.filter(d=>d.f==='meumeu'&&world.isDepot(d)).sort((a,z)=>world.distB(a,v.x,v.y)-world.distB(z,v.x,v.y)).slice(0,14);
      h+=`<label class="row small">Basée à <select data-vbase>${deps.map(d=>`<option value="${d.id}" ${base?.id===d.id?'selected':''}>${esc(BUILDINGS[d.k].name)} · ${esc(world.cityName(d))}</option>`).join('')}</select></label>
        <div class="kv"><span>Rayon de service</span><b class="kctl"><button class="small ghost" data-vrange="-5">−</button> ${v.range||VEHICLES.porteur.range} cases <button class="small ghost" data-vrange="5">+</button></b></div><div class="row"><button class="small ghost" data-act="porter-free">Rendre au village</button></div>`;}
    h+=`<p class="quiet small">À la demande : il prend le manque le plus prioritaire qu’il peut servir, le charge au dépôt qui en a de trop le plus commode, et le livre. ${v.k==='train'?'Il sert les gares de son réseau.':v.k==='avion'?'Il sert les aérodromes ; le carburant est pris au départ.':'Il sert les dépôts de son rayon, sur la même terre.'}</p>`;}
  else{const A=v.route&&world.building(v.route.a),B=v.route&&world.building(v.route.b);
    h+=`<div class="kv"><span>Ligne</span><b>${A&&B?`${esc(world.cityName(A))} (${BUILDINGS[A.k].name.toLowerCase()}) ↔ ${esc(world.cityName(B))} (${BUILDINGS[B.k].name.toLowerCase()})`:'aucune'}</b></div><div class="row"><button class="small" data-act="route">${v.route?'Changer la ligne':'Tracer la ligne'}</button></div>`;
    if(v.route){const sets=[['guerre','munitions, armes, explosifs, santé'],['vivres','vivres'],['industrie','pièces'],['materiaux','bois, pierre'],['minerais','fer, cuivre, plomb, salpêtre'],['rare','le rare']];
      for(const [dir,label] of [['out',`→ vers ${esc(B?world.cityName(B):'B')}`],['back',`← vers ${esc(A?world.cityName(A):'A')}`]])h+=`<div class="goods"><span class="quiet small">${label}</span>${sets.map(([k,n])=>`<button class="chip ${v.route[dir].includes(k)?'on':''}" data-goods="${dir}:${k}">${n}</button>`).join('')}</div>`;
      h+=`<p class="quiet small">Un convoi part mêlé : au premier tour, aucun bien ne prend plus de 40 % de la place.</p>`;}}
  return h+'</section>';}
// les étapes : ce qui est fait, ce qui vient
const has=(W,k,more=()=>true)=>W.s.buildings.some(b=>b.f==='meumeu'&&b.k===k&&b.done&&more(b));
const STEP_OK={bois:W=>(W.capital()?.stock.bois||0)>=260||(W.s.innov.prac.bois||0)>4,maisons:W=>W.s.buildings.some(b=>b.f==='meumeu'&&b.k==='moulin'&&b.done),
  camp:W=>has(W,'camp',b=>W.workers(b).length),charbon:W=>has(W,'mine',b=>W.s.nodes[b.ore]?.res==='charbon'),charrette:W=>W.s.vehicles.some(v=>v.f==='meumeu'&&v.k==='porteur'&&(v.trips||0)>0),
  atelier:W=>has(W,'atelier'),labo:W=>has(W,'labo'),hopital:W=>has(W,'hopital'),
  caserne:W=>has(W,'caserne')&&W.s.units.filter(u=>u.f==='meumeu'&&u.w).length>=6,arsenal:W=>has(W,'arsenal',b=>(b.made||0)>0),
  rail:W=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.k==='gare'&&b.done).length>=2&&W.s.vehicles.some(v=>v.f==='meumeu'&&v.k==='train'),
  defense:W=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.k==='tour'&&b.done).length>=2&&Object.values(W.s.walls).filter(w=>w.f==='meumeu'&&w.b).length>=6,
  escouade:W=>W.s.squads.some(q=>W.members(q).some(u=>UNITS[u.k]?.doctor))};
function stepsPane(){const S=world.s;S.steps??={};for(const st of STEPS)if(!S.steps[st.k]&&STEP_OK[st.k]?.(world))S.steps[st.k]=world.day;const done=STEPS.filter(s=>S.steps[s.k]).length;const next=STEPS.filter(s=>!S.steps[s.k]).slice(0,3);
  return `<section class="pane"><h2>Les étapes <small>${done}/${STEPS.length} · rien n’est obligatoire</small></h2><i class="gauge"><i style="width:${Math.round(done/STEPS.length*100)}%"></i></i>
    ${next.map((s,n)=>`<div class="step ${n?'':'now'}"><b>${esc(s.name)}</b><span>${esc(s.hint)}</span></div>`).join('')||'<p class="good">Tout est prêt. Tenez.</p>'}
    <details class="drawer"><summary>Déjà fait</summary>${STEPS.filter(s=>S.steps[s.k]).map(s=>`<div class="step done"><b>✓ ${esc(s.name)}</b><span>jour ${S.steps[s.k]}</span></div>`).join('')||'<p class="quiet small">rien encore</p>'}</details></section>`;}
function overviewPane(){const s=world.s;const cap=world.capital();const st=cap?.stock||{};const ours=s.buildings.filter(b=>b.f==='meumeu'&&!b.ally);const army=s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k!=='villageois');const idle=world.idle();
  const W=wounded();
  let h=stepsPane()+`<section class="pane"><h2>${esc(cap?.city||'La capitale')} <small>la capitale</small></h2>
    <p class="quiet small">Bâtissez vos villes, reliez vos industries, développez la recherche et choisissez quand négocier. La chute des villes bèè reste un aboutissement possible.</p>${s.won?`<p class="good"><b>Gagné au jour ${s.won.day}.</b></p>`:''}${s.lost?`<p class="bad"><b>La civilisation meumeu est tombée au jour ${s.lost.day}.</b></p>`:''}</section>`;
  h+=`<section class="pane"><h2>Civilisation</h2><div class="kv"><span>Villes</span><b>${ours.filter(b=>b.k==='centre'&&!b.ruin).map(b=>{const st=b.done?world.cityStats(b):null;return `<a data-goto="${b.id}">${esc(b.city)}</a>${st?` <small>${st.res}</small>`:' <small>chantier</small>'}`;}).join(', ')}</b></div>
    <div class="kv"><span>Villageois</span><b>${s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois').length}${idle.length?` · <a data-act="idle">${idle.length} sans rien à faire</a>`:''}</b></div>
    <div class="kv"><span>Main-d’œuvre disponible</span><b>${Math.max(0,idle.length-s.buildings.reduce((n,b)=>n+(b.queue||[]).filter(q=>q.draftId!=null).length,0))} · ${s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois'&&u.task).length} affectés</b></div>
    <div class="kv"><span>Armée</span><b>${army.length?Object.entries(army.reduce((o,u)=>(o[u.k]=(o[u.k]||0)+1,o),{})).map(([k,n])=>`${n} ${UNITS[k].name.toLowerCase()}${n>1?'s':''}`).join(', '):'aucune'}${army.length?` · <a data-act="army">choisir</a>`:''}</b></div>
    ${W.length?`<div class="kv"><span>Blessés</span><b><a data-modal="med">${W.length} · ${W.filter(x=>triage(x.u.h).k==='rouge').length} en urgence</a></b></div>`:''}
    <div class="kv"><span>Logistique</span><b>${s.vehicles.filter(v=>v.f==='meumeu'&&!v.ally).map(v=>`<a data-vehicle="${v.id}">${esc(v.name)}</a>`).join(', ')||'aucun véhicule'} · ${Object.values(s.rails).filter(r=>r.b).length} cases de voie · <a data-modal="eco">l’économie</a></b></div>
    <div class="row"><button class="small bad" data-act="shelter">Aux abris !</button><span class="quiet small">les villageois courent au centre-ville ou dans une maison</span></div>
    <div class="row"><button class="small ghost" data-act="design">Bureau d’études</button><button class="small ghost" data-modal="innov">Les idées (${s.innov.ideas.length})</button><button class="small ghost" data-modal="med">Santé</button></div></section>`;
  if(s.ally){const A=s.ally,AC=world.allyCities(),us=world.allyUnits(),sold=us.filter(u=>u.k!=='villageois'),boats=s.vehicles.filter(v=>v.ally&&v.k==='barge'&&v.hp>0),lastA=s.log.find(l=>/allié/i.test(l.text)||/\(allié\)/.test(l.where||''));
    h+=`<section class="pane"><h2>L’allié <small>la moitié ${A.up?'haute':'basse'} de l’île, mené par l’IA</small></h2>
    <div class="kv"><span>Villes</span><b>${AC.map(c=>`<a data-goto="${c.b.id}">${esc((c.b.city||'').replace(' (allié)',''))}</a>${c.b.done?'':' <small>chantier</small>'}`).join(', ')||'tombées'}</b></div>
    <div class="kv"><span>Population</span><b>${us.filter(u=>u.k==='villageois').length} villageois · ${sold.length} soldats</b></div>
    <div class="kv"><span>Flotte</span><b>${boats.length} barge${boats.length>1?'s':''}${A.navalN?` · ${A.navalN} débarquement${A.navalN>1?'s':''}`:''}</b></div>
    ${lastA?`<p class="quiet small">Jour ${Math.floor(lastA.t/24)+1} : ${esc(lastA.text)}</p>`:''}</section>`;}
  const B=s.beee;const cities=B.cities;h+=`<section class="pane war"><h2>Les Bèè <small>${B.phase==='truce'?'cessez-le-feu en cours':B.phase==='peace'?'traité de paix en vigueur':world.atWar?`guerre depuis le jour ${B.warDay} · ${B.waves} vague${B.waves>1?'s':''}`:`tensions · guerre possible dès le jour ${B.warDay}`}</small></h2>
    ${cities.filter(c=>!s.fog||s.intel?.[c.centre]).map(c=>{const I=s.intel?.[c.centre];return `<div class="kv"><span><a data-gotoxy="${c.x},${c.y}">${esc(c.name)}</a></span><b>${I?.ruin?'centre vu en ruine':I?.counts?`${I.counts.mil} soldats observés · âge ${Math.round((s.t-I.t)*HOUR_REAL)} s`:'effectifs inconnus'}</b></div>`;}).join('')||'<p class="quiet">Aucune ville reconnue.</p>'}
    <div class="kv"><span>Contacts actuels</span><b class="bad">${s.units.filter(u=>u.f==='beee'&&u.w&&world.spotted(u,'meumeu')).length} soldats repérés</b></div>
    <p class="quiet small">Leurs patrouilles cherchent nos convois. Les sacs de sable, les murs et les bunkers protègent les défenseurs ; mines, villes et rails alimentent le front.</p></section>`;
  h+=`<details class="drawer" data-k="log" open><summary>Journal</summary>${s.log.filter(l=>!s.fog||!s.beee.cities.some(c=>c.name===l.where&&!s.intel?.[c.centre])).slice(0,30).map(l=>`<div class="logline ${l.tone}"><time>j${Math.floor(l.t/DAY)+1} ${String(Math.floor(l.t%DAY)).padStart(2,'0')}h</time><b>${esc(l.where)}</b> ${esc(l.text)}</div>`).join('')}</details>`;
  return h;}

// ---------- les grandes fenêtres : santé, fiche médicale, idées, économie ----------
function openModal(kind,id=null){ui.modal={kind,id};ui.modalHtml='';renderModal();}
function renderModal(){const el=$('#modal');if(!ui.modal){if(!el.hidden){el.hidden=true;el.innerHTML='';}return;}
  let body='';try{body={med:medModal,fiche:ficheModal,innov:innovModal,eco:ecoModal,squad:squadModal,operation:id=>ops.modal(id)}[ui.modal.kind]?.(ui.modal.id)||'';}catch(e){console.error(e);body=`<p class="bad">${esc(e.message)}</p>`;}
  if(!body){ui.modal=null;el.hidden=true;return;}
  if(body!==ui.modalHtml){const box=el.querySelector('.mbody');const top=box?box.scrollTop:0;el.innerHTML=`<div class="mbox ${ui.modal.kind}" role="dialog">${body}</div>`;el.hidden=false;ui.modalHtml=body;const nb=el.querySelector('.mbody');if(nb)nb.scrollTop=top;
    const slot=el.querySelector('#f3dslot');if(slot)slot.appendChild(body3d.cv);}}
// ---------- l'escouade : chaque membre, son rôle, son arme, sa protection, ses munitions ; les pièces et leurs servants ----------
function squadModal(id){const sq=world.squad(id);if(!sq)return '';const ms=world.members(sq);const dep=ms[0]&&world.depots('meumeu',ms[0].x,ms[0].y)[0];const have=dep?dep.stock:{};
  const guns=world.designsOf('meumeu');const arms=world.armorsOf('meumeu');const pieces=ms.filter(u=>u.w&&world.W(u.w).crew>1);
  const roleSel=u=>{const opts=[['tireur','Tireur'],['munitions','Porteur de munitions'],...pieces.filter(g=>g!==u).map(g=>[`serve:${g.id}`,`Servant de ${unitName(g)}`])];const cur=u.role==='munitions'?'munitions':u.serve?`serve:${u.serve}`:'tireur';
    return `<select data-sqr="${u.id}">${opts.map(([v,n])=>`<option value="${v}" ${v===cur?'selected':''}>${esc(n)}</option>`).join('')}</select>`;};
  const rows=ms.map(u=>{const W=u.w?world.W(u.w):null;const st=u.h?.state||'ok';const ammo=W?u.mag+u.pouch:0;
    return `<tr class="${st==='hors'?'bad':''}"><td><a data-fiche="${u.id}">${esc(unitName(u))}</a><small>${esc(UNITS[u.k].name)}${sq.leader===u.id?' · chef':''}</small></td>
      <td>${UNITS[u.k].medic?'<span class="quiet">soignant</span>':roleSel(u)}</td>
      <td>${UNITS[u.k].arm?`<select data-sqw="${u.id}">${guns.map(d=>`<option value="${d.id}" ${d.id===u.w?'selected':''}>${esc(d.name)}${d.id!==u.w?` (${n0(have['a:'+d.id]||0)} au dépôt)`:''}</option>`).join('')}</select>${W&&W.crew>1?(()=>{const n=world.servants(u,1.5).length,need=W.crew-1,missing=Math.max(0,need-n);return `<small>Équipage ${n}/${need} servant${need>1?'s':''}${missing?` · MANQUE ${missing}`:' · complet'} · ${u.deployT>=W.setup?'en batterie':'à mettre en batterie'}</small>`})():''}`:'—'}</td>
      <td>${UNITS[u.k].arm||UNITS[u.k].medic?`<select data-sqa="${u.id}"><option value="">rien</option>${arms.map(a=>`<option value="${a.id}" ${a.id===u.armor?'selected':''}>${esc(a.name)}${a.id!==u.armor?` (${n0(have['p:'+a.id]||0)})`:''}</option>`).join('')}</select>`:'—'}</td>
      <td>${W?`<i class="gauge inline"><i style="width:${Math.min(100,ammo/W.carry*100)}%"></i></i> ${ammo}/${W.carry}`:'—'}${u.role==='munitions'?`<small>${fmt(u.crates||0,1)} caisse${(u.crates||0)>=2?'s':''} de ${esc(world.design(u.ammoW)?.name||'—')}</small>`:''}</td>
      <td>${st==='ok'?'<span class="good">indemne</span>':st==='blesse'?'<span class="warn">blessé</span>':'<span class="bad">à terre</span>'}</td></tr>`;}).join('');
  return mhead(esc(sq.name),`${ms.length} membres · moral ${Math.round(sq.morale*100)} % · ${dep?`dépôt le plus proche : ${esc(world.depotName(dep))}`:'aucun dépôt à portée — on ne change d’arme qu’au dépôt'}`)+`<div class="mbody">
    <div class="row"><span class="quiet small">Formation</span><div class="seg">${[['ligne','En ligne'],['colonne','En colonne'],['dispersee','Dispersés']].map(([k,n])=>`<button data-form="${k}" class="${sq.form===k?'on':''}">${n}</button>`).join('')}</div>
      <button class="small" data-act="sq-crews" title="Pour chaque pièce, les plus proches deviennent ses servants">Répartir les servants</button><button class="small ghost" data-act="sq-resupply" title="Un servant de chaque pièce va réellement chercher des munitions ; les autres armes prennent au dépôt proche">Ravitailler les armes</button></div>
    <table class="medt eco sqt"><thead><tr><th>Membre</th><th>Rôle</th><th>Arme</th><th>Protection</th><th>Munitions</th><th>État</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="quiet small">Une pièce (trépied) se met en batterie immobile avant de tirer ; chaque servant manquant la ralentit, seule elle se traîne. Un porteur de munitions prend deux caisses au dépôt et remplit les cartouchières à moins d’une case et demie. On change d’arme ou de protection au dépôt, qui doit l’avoir en stock ; l’ancienne y reste.</p></div>`;}
function mhead(title,sub){return `<header class="mhead"><div><b>${title}</b><small>${sub}</small></div><button class="ghost" data-act="modal-off">Fermer</button></header>`;}
// le service de santé : tous les blessés, du plus urgent au moins urgent
function medModal(){const L=wounded();const ord={noir:3,rouge:0,jaune:1,vert:2,ok:4,mort:5};L.sort((a,b)=>ord[triage(a.u.h).k]-ord[triage(b.u.h).k]||bleedRate(b.u.h)-bleedRate(a.u.h));
  const med=world.s.units.filter(u=>u.f==='meumeu'&&UNITS[u.k]?.medic);const tents=world.s.buildings.filter(b=>b.f==='meumeu'&&BUILDINGS[b.k].tent&&b.done);const hosp=world.s.buildings.filter(b=>b.f==='meumeu'&&b.k==='hopital'&&b.done);
  const count=k=>L.filter(x=>triage(x.u.h).k===k).length;
  return mhead('Le service de santé',`${L.length} blessés · ${med.filter(u=>UNITS[u.k].doctor).length} médecins, ${med.filter(u=>!UNITS[u.k].doctor).length} infirmiers · ${tents.length} tentes · ${hosp.length} hôpital${hosp.length>1?'x':''}`)+
  `<div class="mbody"><div class="tri-sum">${[['rouge','urgence absolue','il mourra sans soins tout de suite'],['jaune','urgence relative','grave, mais il tient'],['vert','blessés légers','ils attendront'],['noir','dépassés','au-delà de ce qu’on peut faire ici']].map(([k,n,t])=>`<div class="ts ${k}"><b>${count(k)}</b><span>${n}</span><small>${t}</small></div>`).join('')}</div>
    <table class="medt"><thead><tr><th></th><th>Blessé</th><th>Où</th><th>État</th><th>Sang</th><th>Saigne</th><th>Il faut</th><th></th></tr></thead><tbody>${L.map(({u,where})=>{const h=u.h;const tr=triage(h);const v=vitals(h);
      const need=[needsCare(h)?'premiers secours':'',h.pneumo&&!h.drained?'drain':'',h.legs+h.arms>(h.splint||0)?'attelle':'',needsSurgery(h)?'chirurgie':'',h.gut&&!h.gutFixed?'péritonite !':''].filter(Boolean).join(', ')||(where==='terrain'?'repos':'soins en cours');
      return `<tr><td><i class="tri" style="background:${tr.c}" title="${tr.label}"></i></td><td><a data-fiche="${u.id}">${esc(unitName(u))}</a><small>${esc(UNITS[u.k]?.name||'')}</small></td><td>${where==='terrain'?`<a data-gotoxy="${u.x},${u.y}">sur le terrain</a>`:esc(BUILDINGS[where.k].name)}</td>
        <td>${STATE[h.state]}${h.state==='hors'&&h.cause?`<small>${esc(h.cause)}</small>`:''}</td><td><i class="gauge inline red"><i style="width:${Math.round(h.blood/BLOOD*100)}%"></i></i> ${Math.round(h.blood/BLOOD*100)} %</td>
        <td class="${v.br>.05?'bad':''}">${v.br>.002?fmt(v.br,2)+' mL/s'+(v.left!=null&&v.br>.02?`<small>mort dans ${secs(v.left)}</small>`:''):'—'}</td><td>${esc(need)}</td><td>${where==='terrain'&&needsCare(h)?`<button class="small" data-sendmed="${u.id}">Envoyer un soignant</button>`:''}</td></tr>`;}).join('')||'<tr><td colspan="8" class="quiet">Personne n’est blessé.</td></tr>'}</tbody></table>
    <p class="quiet small">La chaîne : l’infirmier pose garrot et pansement là où le blessé est tombé ; il le porte à la tente médicale, où le médecin opère (hémostase, ligature, suture) ; puis on l’évacue à l’hôpital, où il guérit. Un garrot tient ${Math.round(10*MED.tq)} heures, après quoi le membre est perdu ; une panse percée s’infecte en un jour et demi.</p></div>`;}
// la fiche médicale : tout ce qu'on sait d'un blessé
// on garde le corps de celui qu'on examine : sa fiche reste lisible après sa mort (un Bèè abattu par l'escouade, par exemple)
function openFiche(id){const f=findUnit(id);if(f)ui.ficheRef=f.u;openModal('fiche',id);}
function findUnit(id){const u=world.unit(id);if(u)return {u,where:'terrain'};for(const b of world.s.buildings)for(const x of b.wardList||[])if(x.id===id)return {u:x,where:b};if(ui.ficheRef?.id===id)return {u:ui.ficheRef,where:'mort'};const r=hurtRefs.get(id);if(r)return {u:r,where:'mort'};return null;}
const hurtRefs=new Map();
function ficheModal(id){const f=findUnit(id);if(!f)return '';const {u,where}=f;const h=u.h;const tr=triage(h);const v=vitals(h);
  // ce qui saigne, regroupé par endroit et par état, du plus grave au plus léger
  const st=b=>b.lost?'<span class="bad">membre perdu</span>':b.tq?`garrot depuis ${hours((b.tqT||0)/4)} <small>(${hours(Math.max(0,(10*4*MED.tq-(b.tqT||0))/4))} avant de perdre le membre)</small>`:b.clamped?'<span class="good">opéré</span>':b.dressed?(b.internal?'pansé — il faut opérer':'pansé'):'<span class="bad">libre</span>';
  const grp=new Map();for(const b of h.bleeds){const key=b.name+'|'+st(b);const g=grp.get(key)||{b,n:0,r:0};g.n++;g.r+=b.rate*bleedFactor(b);grp.set(key,g);}
  const rows=[...grp.values()].sort((a,z)=>z.r-a.r);const big=rows.slice(0,8),rest=rows.slice(8);
  const bleeds=big.map(({b,n,r})=>`<tr><td>${esc(b.name)}${n>1?` <small>×${n}</small>`:''}</td><td>${b.internal?'interne':'externe'}${b.limb?' · membre':''}</td><td class="${r>.05?'bad':''}">${fmt(r,3)} mL/s</td><td>${st(b)}</td></tr>`).join('')+
    (rest.length?`<tr><td colspan="4" class="quiet">et ${rest.reduce((a,g)=>a+g.n,0)} petites plaies (${fmt(rest.reduce((a,g)=>a+g.r,0),3)} mL/s en tout)</td></tr>`:'');
  const recs=[];if(needsCare(h))recs.push(h.bleeds.some(b=>b.limb&&!b.tq&&!b.clamped&&b.rate>.02)?'Un garrot, tout de suite.':'Un pansement compressif.');if(h.pneumo&&!h.sealed&&!h.drained)recs.push('Un pansement thoracique : il étouffe.');if(h.pneumo&&!h.drained)recs.push('Un drain thoracique (médecin).');
  if(h.legs+h.arms>(h.splint||0)&&!h.para)recs.push('Une attelle (médecin) : il pourra boiter jusqu’à l’arrière.');if(needsSurgery(h))recs.push('La chirurgie : une tente médicale avec un médecin, ou l’hôpital.');if(h.gut&&!h.gutFixed)recs.push(`Suturer la panse ou l’intestin avant ${hours(Math.max(0,(1-h.sepsis)*SEPSIS/MED.sepsis/4))} : sinon la péritonite.`);
  if(h.blood<BLOOD*.75)recs.push('Du plasma, une transfusion.');if(h.legs||h.arms)recs.push('L’hôpital : trois jours pour ressouder les os.');if(h.lost?.length)recs.push('Un membre est perdu : réformé à la sortie de l’hôpital, il retournera travailler.');
  const wl=h.wounds.slice().reverse().map(w=>`<div class="wl"><i style="background:${SEVC[w.sev]}"></i><b>${SEV[w.sev]}</b> <span>${esc(w.text)}</span> <em>${w.from}</em></div>`).join('');
  const kind=u.f==='beee'?(BEEE.units[u.k]?.name||'Bèè'):(UNITS[u.k]?.name||'');
  return mhead(`Fiche médicale · ${esc(u.f==='beee'?kind:unitName(u))}${u.f==='beee'?' <span class="bad">(ennemi)</span>':''}`,`${esc(kind)} · ${where==='mort'||h.state==='mort'?`<span class="bad">mort (${esc(h.cause||'')})</span>`:where==='terrain'?'sur le terrain':esc(BUILDINGS[where.k].name)+' · '+esc(world.cityName(where))}`)+
  `<div class="mbody fbody"><div class="f-sil"><div class="f3d" id="f3dslot"></div><div class="seg">${[['peluche','Peluche'],['anat','Anatomie'],['xray','Radiographie']].map(([k,n])=>`<button data-b3="${k}" class="${body3d.mode===k?'on':''}">${n}</button>`).join('')}</div>
      <p class="quiet small">Le blessé en 3D : ce qui est touché s’allume à la couleur de sa gravité, le sang coule de chaque plaie ; garrot en jaune, pansement en blanc, vaisseau opéré en bleu ; en pointillés, le trajet des balles.</p><div class="plates2">${plateSvg(u,'portrait')}${u.f==='meumeu'?plateSvg(u,'radio'):silhouette(u,false,true)}</div><div class="sils">${silhouette(u,false,true)}${silhouette(u,true,true)}</div></div>
    <div class="f-main"><div class="vit"><div class="vt" style="--c:${tr.c}"><small>Triage</small><b>${tr.label}</b></div><div class="vt"><small>Pouls</small><b>${v.pulse}<i>/min</i></b></div><div class="vt"><small>Souffle</small><b>${v.resp}<i>/min</i></b></div>
      <div class="vt"><small>Température</small><b>${fmt(v.temp,1)}<i>°C</i></b></div><div class="vt"><small>Conscience</small><b>${v.cons}</b></div><div class="vt"><small>Sang</small><b>${fmt(h.blood,0)}<i>/${BLOOD} mL</i></b></div></div>
      ${v.br>.01?`<p class="${v.br>.05?'bad':'warn'}"><b>Il perd ${fmt(v.br,2)} mL/s</b>${v.left!=null?` — ${secs(v.left)} avant la mort sans soins`:''}.</p>`:''}
      <h3>Ce qui saigne</h3>${bleeds?`<table class="medt"><tbody>${bleeds}</tbody></table>`:'<p class="quiet small">Plus rien ne saigne.</p>'}
      <h3>L’état</h3><div class="flags">${[h.fractures?.length?`fractures : ${[...new Set(h.fractures)].join(', ')}${h.splint?' (attelle)':''}`:'',h.pneumo?(h.drained?'thorax drainé':h.sealed?'pneumothorax, pansé':'pneumothorax ouvert'):'',h.conc>0?'commotion':'',h.shock>0?'en choc':'',h.morph>0?'sous morphine':'',h.eyes?`${h.eyes} œil crevé`:'',h.gut?(h.gutFixed?'panse suturée':`infection : ${Math.round((h.sepsis||0)*100)} %`):'',h.para?'paralysé':''].filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')||'<span>rien d’autre</span>'}</div>
      <h3>Ce qu’il faut faire</h3>${recs.length?`<ol class="recs">${recs.map(r=>`<li>${esc(r)}</li>`).join('')}</ol>`:'<p class="good">Rien : il se remet.</p>'}
      ${where==='terrain'&&u.f==='meumeu'?`<div class="row">${needsCare(h)||h.state==='hors'?`<button class="small" data-sendmed="${u.id}">Envoyer le soignant le plus proche</button>`:''}${h.state==='hors'?`<button class="small warn" data-evac="${u.id}">Évacuer (deux porteurs)</button>`:''}<button class="small ghost" data-gotoxy="${u.x},${u.y}">Voir</button></div>`:''}
      <h3>Les blessures</h3><div class="wounds">${wl||'<p class="quiet small">aucune</p>'}</div>
      <h3>Les soins reçus</h3><div class="mlog">${(h.log||[]).slice().reverse().map(l=>`<div><time>j${Math.floor((l.t||0)/DAY)+1} ${String(Math.floor((l.t||0)%DAY)).padStart(2,'0')}h${String(Math.floor(((l.t||0)%1)*60)).padStart(2,'0')}</time> ${l.by?`<b>${esc(l.by)}</b> `:''}${esc(l.what)}</div>`).join('')||'<p class="quiet small">aucun</p>'}</div></div></div>`;}
// les idées des Meumeu
function researchParts(){const I=world.s.innov;const lab=world.s.buildings.find(b=>b.f==='meumeu'&&BUILDINGS[b.k].lab&&b.done);const dev=lab?.dev&&INNOV.find(x=>x.id===lab.dev.id);const have=lab?world.have('meumeu',lab.i+1,lab.j+1):{};
  const card=(x,idea)=>{const X=INNOV.find(y=>y.id===x.id);const r=world.canDevelop(x.id);return `<article class="idea"><header><span class="dom">${esc(DOMAINS[X.dom])}</span><b>${esc(X.name)}</b></header><p>${esc(X.text)}</p>
      <p class="fx">${Object.entries(X.mod).map(([k,v])=>`<span>${esc(MODN[k]||k)} ${v>=1?'+':'−'}${Math.round(Math.abs(v-1)*100)} %</span>`).join('')}${(X.unlock||[]).map(k=>`<span class="new">ouvre : ${esc(unlockName(k))}</span>`).join('')}</p>
      ${X.needs?.length?`<p class="quiet small">demande : ${X.needs.map(n=>{const ok=world.s.innov.done.includes(n);return `<b class="${ok?'':'warn'}">${esc(INNOV.find(y=>y.id===n)?.name||n)}${ok?' ✓':''}</b>`;}).join(' · ')}</p>`:''}
      <div class="row between"><span class="costs">${costHtml(X.cost,have)} · ${X.hours} h</span>${idea?`<span><button class="small ghost" data-drop="${x.id}">Écarter</button> <button class="small" data-dev="${x.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Développer</button></span>`:''}</div>
      ${idea&&x.who?`<small class="who">idée de <b>${esc(x.who.name||x.who)}</b>, ${esc(UNITS[x.who.k]?.name.toLowerCase()||'')}</small>`:''}</article>`;};
  const doms=Object.entries(DOMAINS).map(([k,n])=>{const p=I.prac[k]||0,nx=I.next[k]||14;const left=INNOV.filter(x=>x.dom===k&&!I.done.includes(x.id)).length;return `<div class="dm"><span>${esc(n)}</span><i class="gauge inline"><i style="width:${nx>=1e8?100:Math.min(100,p/nx*100)}%"></i></i><small>${nx>=1e8?'plus d’idée':left?`${left} à trouver`:'tout trouvé'}</small></div>`;}).join('');
  const status=`${I.ideas.length} en attente · ${I.done.length} adoptées · ${lab?(dev?`au laboratoire : ${esc(dev.name)}, encore ${hours(lab.dev.left)}`:'le laboratoire attend une idée'):'il faut un laboratoire pour les développer'}`;
  return {status,html:`<p class="quiet small">Ceux qui travaillent ont des idées : à force de couper du bois, de miner, de soigner, de tirer, l’un d’eux propose quelque chose. Chaque partie les amène dans un autre ordre.</p>
    <div class="ideas">${I.ideas.map(x=>card({...x,who:typeof x.who==='object'?x.who:{name:x.who}},true)).join('')||'<p class="quiet">Pas d’idée en attente : travaillez, elles viendront.</p>'}</div>
    <h3>Ce qu’on pratique</h3><div class="doms">${doms}</div>
    <h3>L’arbre : ce qui demande une découverte préalable</h3><div style="display:block">${INNOV.filter(x=>x.needs?.length).map(x=>{const st=I.done.includes(x.id)?'<b>acquise</b>':x.needs.every(n=>I.done.includes(n))?'<b class="good">à trouver</b>':'<b class="warn">verrouillée</b>';return `<div style="display:flex;flex-wrap:wrap;gap:.2rem .7rem;align-items:baseline;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.07)"><b style="min-width:11rem">${esc(x.name)}</b><span>${st}</span><small class="quiet">demande ${x.needs.map(n=>(I.done.includes(n)?'✓ ':'✗ ')+esc(INNOV.find(y=>y.id===n)?.name||n)).join(' · ')}${x.unlock?.length?' — ouvre '+x.unlock.map(k=>esc(unlockName(k))).join(', '):''}</small></div>`;}).join('')}</div>
    <h3>Adoptées</h3><div class="ideas done">${I.done.map(id=>card({id},false)).join('')||'<p class="quiet small">aucune encore</p>'}</div>`};}
// la recherche vit désormais au bureau d'études (onglet Recherche) ; l'ancienne modale garde le même contenu
const researchHtml=()=>researchParts().html;
const innovModal=()=>{const R=researchParts();return mhead('Les idées des Meumeu',R.status)+`<div class="mbody">${R.html}</div>`;};
const unlockName=k=>{const [t,id]=k.split(':');return t==='fill'?`explosif « ${FILLS[id]?.name||id} »`:t==='preset'?`modèle « ${KIT_PRESETS.find(P=>P.id===id)?.design.name||id} »`:k;};
const MODN={gather_tree:'coupe du bois',gather_rock:'taille de pierre',gather_bush:'cueillette',gather_ore:'extraction à la main',ferme:'moulins',mine:'mines',atelier:'ateliers',carburant_bois:'bois par carburant',cap_porteur:'charge des portettes',cap_train:'charge des trains',vit_train:'vitesse des trains',
  construction:'vitesse de construction',charbon_machines:'charbon des machines',briques:'briqueteries',tender:'tender des locomotives',mur:'solidité des murs',fer_munitions:'fer par caisse',armement:'arsenal et manufacture',napalm:'durée des flaques incendiaires',tir:'précision',garrot:'durée d’un garrot',plasma:'plasma',brancard:'vitesse des brancardiers',antiseptique:'vitesse de l’infection',chirurgie:'vitesse de la chirurgie',creneaux:'tireurs par tour',couvert:'protection des murs'};
// l'économie : ce qui produit, où sont les stocks, ce qui roule
function ecoModal(){const tab=ui.ecoTab||'fret';const bs=world.s.buildings.filter(b=>b.f==='meumeu'&&b.done);let body='';
  const dn=id=>{const d=world.building(id);return d?`<a data-selb="${d.id}">${esc(BUILDINGS[d.k].name)}</a> <small>${esc(world.cityName(d))}</small>`:'<span class="warn">aucun</span>';};
  if(tab==='prod'){const prod=bs.filter(b=>{const B=BUILDINGS[b.k];return B.workers||B.factory||B.makes||B.lab||B.design;});const civilians=world.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').length,free=world.idle().length,reserved=bs.reduce((n,b)=>n+(b.queue||[]).filter(q=>q.draftId!=null).length,0),army=world.s.units.filter(u=>u.f==='meumeu'&&u.k!=='villageois').length,working=world.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&u.task).length;
    body=`<div class="eco-metrics"><div><small>Civils</small><b>${civilians}</b><span>main-d’œuvre totale</span></div><div><small>En poste</small><b>${working}</b><span>récolte, chantiers, services</span></div><div><small>Mobilisables</small><b>${Math.max(0,free-reserved)}</b><span>recrues disponibles</span></div><div><small>Armée</small><b>${army}</b><span>retirée de la main-d’œuvre</span></div></div><table class="medt eco"><thead><tr><th></th><th>Bâtiment</th><th>Au travail</th><th>Fait</th><th>Approvisionné par</th><th>Livre à</th><th>État</th></tr></thead><tbody>${prod.map(b=>{const B=BUILDINGS[b.k];const n=B.workers?world.workers(b).length:0;
      const what=B.factory?`${b.prod?`${ico(b.prod)} ${esc(world.productName(b.prod))}`:'<span class="warn">rien</span>'}${b.batch?` <small>${Math.round(Math.min(1,b.batch.done/b.batch.hours)*100)} %</small>`:''}`:B.makes?Object.entries(B.makes).map(([k,v])=>`${ico(k)} ${fmt(v*n*world.mod('ferme')*(b.yield??1),1)}/h`).join(' '):b.k==='mine'?(()=>{const nd=world.s.nodes[b.ore];return nd?`${ico(nd.res)} ${fmt(B.rate*n*world.mod('mine'),1)}/h · filon ${n0(nd.left)}`:'';})():B.hub?`récolte : ${({auto:'ce qui manque',bois:'bois',pierre:'pierre',vivres:'baies'})[b.res||'auto']}`:b.dev?`innovation ${Math.round((1-b.dev.left/b.dev.total)*100)} %`:b.proto?'prototype':'—';
      return `<tr><td>${bthumb(b.k)?`<img class="thumb" src="${bthumb(b.k)}" alt="">`:''}</td><td><a data-selb="${b.id}">${esc(B.name)}</a><small>${esc(world.cityName(b))}</small></td><td>${B.workers?`${n}/${B.workers}`:'—'}</td><td>${what}</td><td>${world.takesIn(b)?dn(b.sup):'—'}</td><td>${world.givesOut(b)?dn(b.out):'—'}</td><td class="${b.why?'warn':b.working?'good':'quiet'}">${esc(b.why||(b.working?'au travail':'à l’arrêt'))}</td></tr>`;}).join('')}</tbody></table>`;}
  else if(tab==='stocks'){const deps=bs.filter(b=>BUILDINGS[b.k].store);const cols=['bois','pierre','charbon','fer','cuivre','plomb','salpetre','vivres','pieces','poudre','explosifs','sante','jumelles','tenue_camo'];
    body=`<table class="medt eco"><thead><tr><th>Dépôt</th><th>Prio.</th><th>Plein</th>${cols.map(k=>`<th title="${RES[k].name}">${ico(k)}</th>`).join('')}<th title="Munitions (caisses)"><img class="ico" src="${AMMO_SVG}" alt=""></th><th title="Armes"><img class="ico" src="${ARM_SVG}" alt=""></th></tr></thead><tbody>${deps.map(b=>{const B=BUILDINGS[b.k];const u=world.stored(b);const sum=pre=>Object.entries(b.stock).filter(([k])=>k.startsWith(pre)).reduce((a,[,v])=>a+v,0);
      return `<tr><td><a data-selb="${b.id}">${esc(B.name)}</a><small>${esc(world.cityName(b))}</small></td><td>${b.prio??3}</td><td><i class="gauge inline"><i style="width:${Math.min(100,u/B.store*100)}%"></i></i> ${n0(u)}/${B.store}</td>${cols.map(k=>`<td class="${(b.stock[k]||0)<1?'quiet':''}">${n0(b.stock[k]||0)}</td>`).join('')}<td>${n1(sum('m:'))}</td><td>${n0(sum('a:'))}</td></tr>`;}).join('')}</tbody></table>`;}
  else if(tab==='fret'){const L=world.shortages('meumeu');const fv=world.s.vehicles.filter(v=>v.f==='meumeu'&&v.mode==='fret');const J=world.jams('meumeu');
    body=`${J.length?`<div class="jam"><b>Goulots :</b> ${J.map(j=>`<a data-selb="${j.D.id}">${esc(world.depotName(j.D))}</a> est plein — ${j.stuck.map(b=>esc(BUILDINGS[b.k].name.toLowerCase())).join(', ')} à l’arrêt`).join(' · ')}. <span class="quiet">Plus de charrettes, un train, un entrepôt près de la production.</span></div>`:''}<p class="quiet small">Tout ce qui manque, par priorité. Le bureau du fret y envoie ${fv.length} véhicule${fv.length>1?'s':''} à la demande (${fv.filter(v=>v.job).length} en voyage, ${fv.filter(v=>!v.job).length} libres).</p>
      <table class="medt eco"><thead><tr><th>Priorité</th><th>Dépôt</th><th>Bien</th><th>Manque</th><th>En route</th><th>Ailleurs</th><th>État</th></tr></thead><tbody>${L.slice(0,60).map(it=>{const served=fv.some(v=>world.serves(v,it.D));
      const st=it.inb>.05?'<span class="good">en route</span>':it.p<1&&it.src<Math.min(1,it.n)?'<span class="quiet">à rapatrier dès qu’il y en aura</span>':it.src<Math.min(1,it.n)?'<span class="warn">aucune source : il faut en produire, ou une priorité plus haute</span>':!served?'<span class="warn">aucun véhicule à la demande ne dessert ce dépôt</span>':'<span class="quiet">attend un véhicule</span>';
      return `<tr><td>${it.p<1?'objectif':PRIO[it.p]}</td><td><a data-selb="${it.D.id}">${esc(BUILDINGS[it.D.k].name)}</a><small>${esc(world.cityName(it.D))}</small></td><td>${ico(it.k)} ${esc(world.goodName(it.k))}</td><td>${n1(it.n)}</td><td>${it.inb?n1(it.inb):''}</td><td>${n1(it.src)}</td><td>${st}</td></tr>`;}).join('')||'<tr><td colspan="7" class="quiet">Rien ne manque nulle part.</td></tr>'}</tbody></table>`;}
  else if(tab==='gis'){const cap=world.capital();const [cx,cy]=cap?world.bc(cap):[0,0];const ns=world.s.nodes.filter(n=>n.type==='ore').map(n=>({n,d:Math.hypot(n.i-cx,n.j-cy),m:world.s.buildings.find(b=>b.ore===n.id&&!b.ruin)})).sort((a,b)=>a.d-b.d);
    const bf=ui.gisF||'';const kinds=[...new Set(ns.map(x=>x.n.res))];
    body=`<div class="seg">${['',...kinds].map(k=>`<button data-gisf="${k}" class="${bf===k?'on':''}">${k?`${ico(k)} ${esc(RES[k].name)}`:'Tous'}</button>`).join('')}</div><table class="medt eco"><thead><tr><th>Gisement</th><th>Distance</th><th>Reste</th><th>Exploité</th><th></th></tr></thead><tbody>${ns.filter(x=>!bf||x.n.res===bf).slice(0,60).map(({n,d,m})=>`<tr><td>${ico(n.res)} <b>${esc(RES[n.res].name)}</b></td><td>${Math.round(d)} cases${d<23?' <small class="good">à pied</small>':' <small class="quiet">rail</small>'}</td><td><i class="gauge inline"><i style="width:${Math.round(n.left/n.max*100)}%"></i></i> ${n0(n.left)}</td><td>${m?`<a data-selb="${m.id}">${m.done?'mine':'chantier'}</a>`:'<span class="quiet">non</span>'}</td><td><button class="small ghost" data-gotoxy="${n.i},${n.j}">Voir</button></td></tr>`).join('')}</tbody></table><p class="quiet small">Près d’un filon éloigné : Relier → Camp-dépôt (gratuit), puis mine et gare à proximité. Le fer a des réserves plus durables.</p>`;}
  else{const vs=world.s.vehicles.filter(v=>v.f==='meumeu'&&!world.isCombatVehicle(v));body=`<table class="medt eco"><thead><tr><th>Véhicule</th><th>Service</th><th>Voyage</th><th>À bord</th><th>Charge</th></tr></thead><tbody>${vs.map(v=>{const A=v.route&&world.building(v.route.a),B=v.route&&world.building(v.route.b);const cap=v.k==='bombardier'?1:world.capOf(v);
      return `<tr><td><a data-vehicle="${v.id}">${esc(VEHICLES[v.k].name)} « ${esc(v.name)} »</a></td><td>${v.k==='bombardier'?'—':v.mode==='fret'?'à la demande':'ligne fixe'}</td><td>${v.mode==='fret'?esc(world.jobText(v)):A&&B?`${esc(world.cityName(A))} ↔ ${esc(world.cityName(B))}`:'<span class="warn">aucune ligne</span>'}${v.why?`<small class="warn">${esc(v.why)}</small>`:''}</td>
        <td>${Object.entries(v.cargo||{}).filter(([,n])=>n>=.05).map(([k,n])=>`${ico(k)}${n1(n)}`).join(' ')||'—'}</td><td>${v.k==='bombardier'?'—':`<i class="gauge inline"><i style="width:${Math.min(100,world.cargoW(v)/cap*100)}%"></i></i> ${n1(world.cargoW(v))}/${n1(cap)}`}</td></tr>`;}).join('')||'<tr><td colspan="5" class="quiet">Aucun véhicule : construisez une charrette au centre-ville, à un camp, à un entrepôt.</td></tr>'}</tbody></table>`;}
  return mhead('L’économie','le fret, la production, les stocks, les convois')+`<div class="mbody"><div class="seg tabs">${[['fret','Le fret'],['prod','Production'],['stocks','Stocks'],['gis','Gisements'],['convois','Convois']].map(([k,n])=>`<button data-eco="${k}" class="${tab===k?'on':''}">${n}</button>`).join('')}</div>${body}</div>`;}

// ---------- les véhicules ----------
function pickStop(bid){const v=world.s.vehicles.find(x=>x.id===ui.pick.v);const b=world.building(bid);if(!v||!b)return;if(b.f!=='meumeu'){say('un arrêt à nous','bad');return;}
  if(!ui.pick.a){ui.pick.a=bid;say(`Départ : ${world.cityName(b)}. Cliquez l’arrivée.`);renderPanel(true);return;}
  const r=world.setRoute(v.id,ui.pick.a,bid);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');ui.pick=null;renderPanel(true);}
// Plusieurs engins à la fois : de front, sur une ligne perpendiculaire à la marche, espacés selon leur largeur ; chacun prend la place du côté où il
// est déjà (les trajectoires ne se croisent pas)
function groupVehicleOrder(ids,w){const vs=ids.map(id=>world.s.vehicles.find(v=>v.id===id)).filter(v=>v&&v.hp>0&&world.isCombatVehicle(v));if(!vs.length)return;
  const cx=vs.reduce((a,v)=>a+v.x,0)/vs.length,cy=vs.reduce((a,v)=>a+v.y,0)/vs.length,a=Math.atan2(w.y-cy,w.x-cx),nx=-Math.sin(a),ny=Math.cos(a);
  const gap=Math.max(...vs.map(v=>world.vehDef(v).large))+1.2;vs.sort((p,q)=>((p.x-cx)*nx+(p.y-cy)*ny)-((q.x-cx)*nx+(q.y-cy)*ny));let bad=0;
  vs.forEach((v,i)=>{const off=(i-(vs.length-1)/2)*gap,tx=w.x+nx*off,ty=w.y+ny*off;const ok=world.vehMove(v,tx,ty)||world.vehMove(v,w.x,w.y);if(!ok)bad++;view.marks.push({x:tx,y:ty,age:0,bad:!ok});});
  if(bad)say(`${bad} engin${bad>1?'s':''} sur ${vs.length} ne peu${bad>1?'vent':'t'} pas y aller (pas de conducteur, ou pas de chemin).`,'bad');else audio.play('order');renderPanel(true);}
function vehicleOrder(w){const v=world.s.vehicles.find(x=>x.id===view.selV);if(!v)return;
  if(world.isCombatVehicle(v)){const tg=world.targetAt(w.x,w.y);const tv=tg?.type==='vehicle'?world.s.vehicles.find(o=>o.id===tg.id):null;if(tv&&tv!==v&&tv.f==='meumeu'&&world.vehDef(tv).nav==='eau'&&world.vehDef(v).nav!=='eau'){const r=world.vehEmbarkOrder(v,tv);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');if(r.ok)audio.play('order');renderPanel(true);return;}
    const ok=world.vehMove(v,w.x,w.y);view.marks.push({x:w.x,y:w.y,age:0,bad:!ok});if(!ok)say(v.why,'bad');else audio.play('order');renderPanel(true);return;}
  if(v.k==='porteur'&&v.u){const u=v.u;world.releasePorter(v);view.selV=null;view.sel.clear();view.sel.add(u.id);const t=world.targetAt(w.x,w.y);const r=ui.order?null:null;view.ui.order([u.id],t||{type:'point',x:w.x,y:w.y});renderPanel(true);return;}if(v.k==='bombardier'){const r=world.bomb(v.id,w.x,w.y);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');if(r.ok)view.marks.push({x:w.x,y:w.y,age:0,bad:true});return;}
  const t=world.targetAt(w.x,w.y);if(t?.type==='building'){if(!ui.pick)ui.pick={v:v.id,a:null,need:''};pickStop(t.id);}}
function selectSquad(id,go){const sq=world.squad(id);if(!sq)return;view.sel.clear();view.selB=null;view.selV=null;for(const u of world.members(sq))view.sel.add(u.id);if(go){const L=world.unit(sq.leader)||world.members(sq)[0];if(L)view.lookAt(L.x,L.y);}renderPanel(true);}
function formSquad(){const r=world.formSquad([...view.sel]);say(r.ok?r.text+' — ses radiographies s’ouvriront quand elle tire ou qu’on lui tire dessus.':r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');renderPanel(true);}
function pitchTent(){const doc=[...view.sel].map(id=>world.unit(id)).find(u=>u&&UNITS[u.k]?.doctor&&u.tents>0);if(!doc){say('Choisissez un médecin qui porte une tente.','bad');return;}const r=world.pitchTent(doc);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');renderPanel(true);}
function sendMedic(id){const e=world.unit(id);if(!e)return;const m=world.s.units.filter(u=>u.f==='meumeu'&&UNITS[u.k]?.medic&&u.kits>0&&u.h?.state!=='hors').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
  if(!m){say('Aucun soignant avec des trousses : formez des infirmiers et des médecins à l’hôpital.','bad');return;}m.task={kind:'soigne',id:e.id};m.path=null;m.treatT=0;say(`${m.name} court soigner ${unitName(e)}.`,'good');}
function evacuate(id){const e=world.unit(id);if(!e)return;const c=world.s.units.filter(u=>u.f==='meumeu'&&u.id!==id&&u.h?.state!=='hors'&&!u.carrying&&u.k!=='canon').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,2);
  if(!c.length){say('Personne pour le porter.','bad');return;}const r=world.order(c.map(u=>u.id),{type:'unit',id});say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}

// ---------- les clics ----------
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b||b.closest('#dz')||b.closest('#hub')||b.closest('#xray')||b.closest('#xroom'))return;audio.init();const d=b.dataset;
  if(d.speed!==undefined){setSpeed(+d.speed);return;}
  if(d.op){ops.action(d.op);renderModal();renderPanel(true);return;}
  if(d.build){view.placing=view.placing===d.build?null:d.build;view.lining=null;ui.bbHtml='';say(view.placing?`${BUILDINGS[d.build].name} : choisissez la place (une case d’écart avec les autres). Clic droit : annuler.`:'');renderPanel(true);return;}
  if(d.line){view.lining=view.lining?.kind===d.line?null:{kind:d.line};view.placing=null;ui.bbHtml='';say(!view.lining?'':d.line==='gomme'?'Annuler un tracé : balayez les pointillés dorés d’une voie ou d’un mur prévus. Clic droit : fini.':`${LINES[d.line].name} : cliquez-glissez sur la carte${d.line==='rail'?' — droites et virages, en contournant les obstacles':''}. Maj : plusieurs tracés. Clic droit : fini.`);renderPanel(true);return;}
  if(d.bcat){ui.bbCat=d.bcat;ui.bbHtml='';buildBar();return;}
  if(d.modal){openModal(d.modal);return;}
  if(d.fiche){openFiche(+d.fiche);return;}
  if(d.sendmed){sendMedic(+d.sendmed);ui.modalHtml='';return;}
  if(d.evac){evacuate(+d.evac);ui.modalHtml='';return;}
  if(d.dev){const r=world.develop(d.dev);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'built':'bad');ui.modalHtml='';renderPanel(true);return;}
  if(d.drop){world.dropIdea(d.drop);ui.modalHtml='';renderPanel(true);return;}
  if(d.b3){body3d.mode=d.b3;ui.modalHtml='';renderModal();return;}
  if(d.gisf!==undefined){ui.gisF=d.gisf;ui.modalHtml='';renderModal();return;}
  if(d.eco){ui.ecoTab=d.eco;ui.modalHtml='';renderModal();return;}
  if(d.selb){const bd=world.building(+d.selb);if(bd){view.sel.clear();view.selV=null;view.selB=bd.id;view.lookAt(bd.i+1,bd.j+1);ui.modal=null;renderPanel(true);}return;}
  if(d.hub){const bd=world.building(view.selB);if(bd){bd.res=d.hub==='auto'?null:d.hub;for(const u of world.workers(bd))u.hubNode=null;}renderPanel(true);return;}
  if(d.join){const u=world.unit(+d.join);const sid=+$('[data-join-target="'+d.join+'"]')?.value;const r=world.joinSquad(u,sid);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');renderPanel(true);return;}
  if(d.train){const bd=world.building(view.selB);const r=world.train(bd,d.train,ui.trainW[bd.id]||$(`[data-trainw="${bd.id}"]`)?.value,($(`[data-traina="${bd.id}"]`)?.value)||null,ui.trainRole[bd.id]||'tireur');say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'click':'bad');renderPanel(true);return;}
  if(d.mlimit){const bd=world.building(view.selB);if(bd){bd.limit=Math.max(0,(bd.limit??BUILDINGS[bd.k].limit??0)+(+d.mlimit)*50);}renderPanel(true);return;}
  if(d.limit){const bd=world.building(view.selB);if(bd?.prod){const step=LIMIT_OF(bd.prod)>=50?20:2;world.setLimit(bd,(bd.limit||0)+(+d.limit)*step);}renderPanel(true);return;}
  if(d.prio){const bd=world.building(view.selB);if(bd){world.setPrio(bd,+d.prio);say(`${world.depotName(bd)} : priorité ${PRIO[+d.prio].toLowerCase()}.`);}renderPanel(true);return;}
  if(d.need){const bd=world.building(view.selB);const i=d.need.lastIndexOf(':');const k=d.need.slice(0,i);if(bd)world.setNeed(bd,k,(bd.need?.[k]||0)+(+d.need.slice(i+1)));renderPanel(true);return;}
  if(d.want){const bd=world.building(view.selB);const i=d.want.lastIndexOf(':');const k=d.want.slice(0,i);if(bd)world.setWant(bd,k,(bd.want?.[k]||0)+(+d.want.slice(i+1)));renderPanel(true);return;}
  if(d.vmode){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){const r=world.setMode(v,d.vmode);say(r.ok?r.text:r.why[0],r.ok?'':'bad');}renderPanel(true);return;}
  if(d.fam){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v)world.toggleFamily(v,d.fam);renderPanel(true);return;}
  if(d.vload!=null||d.vunl!=null){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){let r;if(d.vload!=null){const k=$('[data-vcargo]')?.value;ui.vcargoK=k;r=k?world.vehLoad(v,k,+d.vload):{ok:false,why:['choisissez quoi charger']};}else r=world.vehUnload(v,d.vunl==='*'?null:d.vunl);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}renderPanel(true);return;}
  if(d.vrange){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v)v.range=Math.max(6,Math.min(30,(v.range||VEHICLES.porteur.range)+Math.sign(+d.vrange)*2));renderPanel(true);return;}
  if(d.zonen!=null){ui.zoneN=+d.zonen;renderPanel(true);return;}
  if(d.zoneh!=null){ui.zoneHigh=d.zoneh==='1';renderPanel(true);return;}
  if(d.post){world.setPosture([...view.sel],d.post);renderPanel(true);return;}
  if(d.nv!=null){const on=d.nv==='1';let n=0;for(const id of view.sel){const u=world.unit(id);if(u?.irMax){u.nvOn=on;n++;}}say(n?`Vision nocturne ${on?'allumée':'éteinte'} (${n}).`:'Aucun appareil de vision nocturne dans la sélection.','info');renderPanel(true);return;}
  if(d.scout!=null){const ids=[...view.sel];const one=d.scout==='1';for(const id of ids){const u=world.unit(id);if(u)u.scoutRole=false;}if(one){const u=world.unit(ids[0]);if(u)u.scoutRole=true;}say(one?'Éclaireur désigné : il voit plus loin et ne tire que découvert.':'Plus d’éclaireur désigné.','info');renderPanel(true);return;}
  if(d.fire!=null){for(const id of view.sel){const u=world.unit(id);if(u){u.roe=d.fire==='1'?'retenu':d.fire==='2'?'discret':'libre';u.holdFire=d.fire==='1';u.quiet=d.fire==='2';}}say(d.fire==='1'?'Tir tenu : ils ne tireront pas, même repérés.':d.fire==='2'?'Tir discret : le risque est évalué sur les ennemis connus.':'Tir libre : ils répondent à ce qu’ils repèrent.','info');renderPanel(true);return;}
  if(d.fuse){for(const id of view.sel){const u=world.unit(id);if(u)u.fuse=+d.fuse;}renderPanel(true);return;}
  if(d.gear){const [k,on]=d.gear.split(':');const u=world.unit([...view.sel][0]);if(u){const r=world.equip(u,k,on==='1');say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}renderPanel(true);return;}
  if(d.reln){const bd=world.building(view.selB);const L=bd?.inside?.length||0;ui.relN=Math.max(1,Math.min(L,(ui.relN??L)+(+d.reln)));renderPanel(true);return;}
  if(d.relone){const bd=world.building(view.selB);if(bd){const r=world.releaseRecruits(bd,1,BUILDINGS[bd.k].trains.includes('choc')?'choc':'soldat',ui.trainW[bd.id]||$(`[data-trainw="${bd.id}"]`)?.value,($(`[data-traina="${bd.id}"]`)?.value)||null,[+d.relone]);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}renderPanel(true);return;}
  if(d.sqsp){const u=world.unit([...view.sel][0]);const sq=u&&world.squad(u.sq);if(sq){sq.spacing=Math.max(.5,Math.min(3,Math.round(((sq.spacing??1)+(+d.sqsp)*.25)*100)/100));say(`${sq.name} : ${Math.round(sq.spacing*1.35*4)} m entre deux soldats au prochain ordre de marche.`);}renderPanel(true);return;}
  if(d.form){const u=world.unit([...view.sel][0]);const sq=u&&world.squad(u.sq);if(sq){sq.form=d.form;say(`${sq.name} : ${b.textContent.toLowerCase()} au prochain ordre de marche.`);}renderPanel(true);return;}
  if(d.squad){selectSquad(+d.squad,e.detail>=2);return;}
  if(d.design){openDesigner(d.design);return;}
  if(d.goto){const bd=world.building(+d.goto);if(bd)view.lookAt(bd.i+2,bd.j+2);return;}
  if(d.gotoxy){const [x,y]=d.gotoxy.split(',').map(Number);view.lookAt(x,y);view.zoom=Math.max(view.zoom,.8);if(ui.modal){ui.modal=null;renderModal();}return;}
  if(d.vehicle){const v=world.s.vehicles.find(x=>x.id===+d.vehicle);if(v){view.sel.clear();view.selVs.clear();view.selB=null;view.selV=v.id;view.lookAt(v.x,v.y);ui.modal=null;renderPanel(true);}return;}
  if(d.goods){const [dir,k]=d.goods.split(':');const v=world.s.vehicles.find(x=>x.id===view.selV);if(v?.route){const L=v.route[dir];const i=L.indexOf(k);i>=0?L.splice(i,1):L.push(k);}renderPanel(true);return;}
  const a=d.act;if(!a)return;
  if(a==='zone'){view.zoning=!view.zoning;renderPanel(true);return;}
  if(a==='save'){try{world.save();say('Partie sauvegardée.','good');}catch(e){say('Sauvegarde impossible : '+e.message,'bad');}return;}
  if(a==='stop'){world.interruptOperations([...view.sel]);for(const id of view.sel){const u=world.unit(id);if(u&&u.h?.state!=='hors'){u.task=null;u.path=null;}}}
  else if(a==='modal-off'){ui.modal=null;renderModal();return;}
  else if(a==='bb'){ui.bb=!ui.bb;ui.bbHtml='';$('#buildbar').innerHTML='';buildBar();return;}
  else if(a==='tent'){pitchTent();return;}
  else if(a==='idle'){const idle=world.idle();if(idle.length){view.sel.clear();view.selB=null;view.selV=null;idle.forEach(u=>view.sel.add(u.id));view.lookAt(idle[0].x,idle[0].y);}}
  else if(a==='army'){view.sel.clear();view.selB=null;view.selV=null;world.s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k!=='villageois').forEach(u=>view.sel.add(u.id));}
  else if(a==='squad')formSquad();
  else if(a==='dissolve'){const u=world.unit([...view.sel][0]);if(u?.sq){const n=world.squad(u.sq)?.name;world.dissolve(u.sq);say(`${n} dissoute.`);}}
  else if(a==='to-hosp'){const u=world.unit([...view.sel][0]);const hb=u&&(world.hospitalFor(u)||world.careFor(u));if(hb){u.task={kind:'hosp',b:hb.id};u.path=null;say(`${unitName(u)} va vers ${BUILDINGS[hb.k].name.toLowerCase()}.`);}else say('Aucun lit libre : une tente médicale, un hôpital, ou le poste de secours d’un centre-ville.','bad');}
  else if(a==='design')openDesigner('mle1');
  else if(a==='armor')openArmorer('gilet');
  else if(a==='smoke'){const n=world.smokeOrder([...view.sel]);say(n?`${n} fumigène${n>1?'s':''} lancé${n>1?'s':''}.`:'Plus de fumigène.',n?'':'bad');}
  else if(a==='send-idle'){const bd=world.building(view.selB);const B=BUILDINGS[bd.k];const n=B.workers-world.workers(bd).length;const ids=world.idle().sort((p,q)=>Math.hypot(p.x-bd.i,p.y-bd.j)-Math.hypot(q.x-bd.i,q.y-bd.j)).slice(0,n).map(u=>u.id);const r=world.order(ids,{type:'building',id:bd.id});say(r.ok?r.text:r.why[0]);}
  else if(a==='send-repair'){const bd=world.building(view.selB);const ids=world.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&u.h?.state!=='hors').sort((p,q)=>Math.hypot(p.x-bd.i,p.y-bd.j)-Math.hypot(q.x-bd.i,q.y-bd.j)).slice(0,4).map(u=>u.id);const r=world.order(ids,{type:'building',id:bd.id});say(r.ok?r.text:r.why[0]);}
  else if(a==='cancel-site'){world.cancel(view.selB);view.selB=null;}
  else if(a==='need-add'){const bd=world.building(view.selB);const k=$('[data-wantk]')?.value;if(bd&&k){ui.wantK=k;world.setNeed(bd,k,(bd.need?.[k]||0)+4);say(`${BUILDINGS[bd.k].name} : réserve de ${bd.need[k]} ${world.goodName(k).toLowerCase()}.`,'good');}}
  else if(a==='site-idle'){const bd=world.building(view.selB);if(bd){const [x,y]=world.bc(bd);const us=world.idle().sort((a,z)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(z.x-x,z.y-y)).slice(0,2);if(us.length){world.order(us.map(u=>u.id),{type:'building',id:bd.id});say(`${us.length} bâtisseur${us.length>1?'s':''} en route.`,'good');}}}
  else if(a==='sq-open'){const u=[...view.sel].map(id=>world.unit(id)).find(u=>u?.sq);if(u)openModal('squad',u.sq);}
  else if(a==='sq-crews'){const sq=world.squad(ui.modal?.id);if(sq){for(const u of world.members(sq))if(u.serve)u.serve=null;world.assignCrews(sq);ui.modalHtml='';renderModal();say('Servants répartis.','good');}}
  else if(a==='crew-resupply'){const gun=[...view.sel].map(id=>world.unit(id)).find(u=>u?.w&&world.W(u.w).crew>1);if(gun){const r=world.requestCrewResupply(gun.id);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');renderPanel(true);}}
  else if(a==='sq-resupply'){const sq=world.squad(ui.modal?.id);if(sq){const reports=[];for(const u of world.members(sq)){if(!u.w)continue;if(world.W(u.w).crew>1){const r=world.requestCrewResupply(u.id);reports.push(r.ok?r.text:r.why[0]);}else world.resupply(u);}ui.modalHtml='';renderModal();say(reports.length?reports.join(' · '):'Armes individuelles ravitaillées uniquement si un dépôt est à portée.',reports.some(s=>s.includes('aucun'))?'bad':'good');}}
  else if(a==='grow'){const bd=world.building(view.selB);if(bd){bd.grow=bd.grow===false;say(bd.grow?`${bd.city} : croissance.`:`${bd.city} : croissance arrêtée.`);}}
  else if(a==='porters'){const bd=world.building(view.selB);const r=world.addPorters(bd,1);say(r.ok?`${world.porters(bd).length} porteur${world.porters(bd).length>1?'s':''} pour ${world.depotName(bd)}.`:r.why[0],r.ok?'good':'bad');}
  else if(a==='porters-off'){const bd=world.building(view.selB);const v=bd&&world.porters(bd).pop();if(v){world.releasePorter(v);say('Un porteur rendu au village.');}}
  else if(a==='boat-ramp'){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){const r=world.boatRamp(v,(v.rampTo||0)<.5);say(r.ok?r.text:r.why[0],r.ok?'':'bad');}renderPanel(true);}
  else if(a==='boat-unload'){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){const r=world.boatUnload(v,'passagers');say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}renderPanel(true);}
  else if(a==='veh-out-pass'||a==='veh-out-all'){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){const out=world.vehUnboard(v,a==='veh-out-pass'?'passagers':'tous');say(`${out.length} Meumeu descend${out.length>1?'ent':''} de ${v.name}.`);}renderPanel(true);}
  else if(a==='porter-free'){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){world.releasePorter(v);view.selV=null;say('Rendu au village.');}}
  else if(a==='evac'){const bd=world.building(view.selB);if(bd){bd.evac=bd.evac===false?true:false;say(bd.evac?'Le trop-plein part au grand dépôt le plus proche.':'Le trop-plein reste ici.');}}
  else if(a==='halt'){const bd=world.building(view.selB);if(bd){bd.halt=!bd.halt;say(`${BUILDINGS[bd.k].name} : ${bd.halt?'arrêtée — elle ne commande plus rien':'reprend le travail'}.`);}}
  else if(a==='want-add'){const bd=world.building(view.selB);const k=$('[data-wantk]')?.value;if(bd&&k){ui.wantK=k;world.setWant(bd,k,(bd.want?.[k]||0)+10);say(`${world.depotName(bd)} demande ${bd.want[k]} ${world.goodName(k).toLowerCase()}.`,'good');}}
  else if(a==='want-add50'){const bd=world.building(view.selB);const k=$('[data-wantk]')?.value;if(bd&&k){ui.wantK=k;world.setWant(bd,k,(bd.want?.[k]||0)+50);say(`${world.depotName(bd)} demande ${bd.want[k]} ${world.goodName(k).toLowerCase()}.`,'good');}}
  else if(a==='route'){const v=world.s.vehicles.find(x=>x.id===view.selV);ui.pick={v:v.id,a:null,need:v.k==='train'?'Deux gares reliées par une voie bâtie.':v.k==='avion'?'Deux aérodromes. Les passagers : envoyez des Meumeu (clic droit sur l’aérodrome), ils attendent le prochain avion.':'Deux dépôts (centre, camp, gare, tente) sur la même terre.'};}
  else if(a==='pick-off')ui.pick=null;
  else if(a==='idle'){const idle=world.idle();if(idle.length){const u=idle[(ui.idleN=((ui.idleN||0)+1))%idle.length];view.sel.clear();view.selB=null;view.sel.add(u.id);view.lookAt(u.x,u.y);renderPanel(true);}else say('Tous les villageois ont une tâche.');}
  else if(a==='release'){const bd=world.building(view.selB);if(bd){const L=bd.inside||[];const n=Math.min(L.length,ui.relN??L.length);const mode=$('#relk')?.value||'soldat',armor=($(`[data-traina="${bd.id}"]`)?.value)||null;
      // un équipage complet, ou des servants : la pièce se choisit dans « Pièce servie » ; des soldats : dans « Armés de »
      const r=mode==='equipage'?world.releaseCrew(bd,$('#relp')?.value,{armor}):world.releaseRecruits(bd,n,mode,mode==='servant'?$('#relp')?.value:(ui.trainW[bd.id]||$(`[data-trainw="${bd.id}"]`)?.value),armor,null,+($('#relc')?.value||0),$('#relnv')?.value||null);
      say(r.ok?r.text:r.why[0],r.ok?'good':'bad');if(r.ok)audio.play('ack',null,{f:'meumeu',n:r.n});}renderPanel(true);}
  else if(a==='shelter'){const n=world.shelterAll();say(n?`${n} villageois courent aux abris.`:'Aucun abri à portée.',n?'':'bad');audio.play('siren');}
  else if(a==='sound'){b.textContent=audio.toggle()?'🔈':'🔇';}
  else if(a==='zoom-in')uiZ.step(1);else if(a==='zoom-out')uiZ.step(-1);else if(a==='zoom-auto'){uiZ.step(0);say(`Taille de l’interface : automatique (${Math.round(uiZ.cur*100)} %).`);}
  else if(a==='new'){if(confirm('Nouvelle partie : une nouvelle carte. La partie en cours sera perdue.')){setWorld(new World());say('Une nouvelle carte.','good');}}
  else if(a==='new-sea'){if(confirm('Nouvelle partie sur la carte « mer » : deux rives séparées par la mer, 2,5 fois plus grande. La partie en cours sera perdue.')){setWorld(new World(undefined,{map:'mer'}));say('Une nouvelle carte, avec la mer.','good');}}
  else if(a==='new-assisted'){if(confirm('Départ établi : une nouvelle carte avec une base, des ressources et une petite garde. La partie en cours sera perdue.')){setWorld(new World(undefined,{assisted:true}));say('Départ établi : infrastructure et réserves prêtes.','good');}}
  else if(a==='scen-front'){if(confirm('Scénario de test « front » : notre batterie (2 obusiers, 1 lance-fusées, 2 mitrailleuses lourdes, 12 fusiliers) à 55 cases de la capitale bèè, 100 soldats bèè en face, guerre déclarée, brouillard levé. La partie en cours sera perdue.')){const w=new World(undefined,{dev:true});setWorld(w);const r=scenarioFront(w);say(r,'good');}}
  else if(a==='new-dev'){if(confirm('Partie de test (Dev) : base équipée, mines en service, usines d’armes, gros stocks. La partie en cours sera perdue.')){setWorld(new World(undefined,{dev:true}));say('Partie de test prête. Brouillard en place : bouton « Brouillard » ou touche N pour le lever.','good');}}
  else if(a==='fog'){toggleFog();}
  else if(a==='panel'){togglePanel();}
  else if(a==='cine'){toggleCine();}
  else if(a==='v3d'){toggle3d();}
  else if(a==='win-off'){$('#win').hidden=true;}
  renderPanel(true);});
// le curseur du retard : chaque cran règle tout de suite les charges de la sélection (le panneau n'est redessiné qu'au lâcher)
document.addEventListener('input',e=>{const r=e.target.closest?.('[data-fusev]');if(!r)return;const v=+r.value/6;for(const id of view.sel){const u=world.unit(id);if(u&&(u.charges>0||u.torch>0))u.fuse=v;}const l=document.getElementById('fuse-l');if(l)l.textContent=fuseTxt(v);});
document.addEventListener('change',e=>{{const sk=e.target.closest?.('[data-skin]');if(sk){const b=world.building(+sk.dataset.skin);if(b)b.skin=sk.value;return;}}if(e.target.closest?.('[data-fusev]')){renderPanel(true);return;}const sr=e.target.closest('[data-sqr],[data-sqw],[data-sqa]');if(sr){const d=sr.dataset;const u=world.unit(+(d.sqr||d.sqw||d.sqa));if(u){const r=d.sqr?world.setRole(u,sr.value):d.sqw?world.rearm(u,sr.value):world.rearmor(u,sr.value||null);if(!r.ok)say(r.why[0],'bad');ui.modalHtml='';renderModal();renderPanel(true);}return;}
  const rk=e.target.closest('[data-relk]');if(rk){ui.relK=rk.value;renderPanel(true);}const rp=e.target.closest('[data-relp]');if(rp){ui.relP=rp.value;renderPanel(true);}
  const s=e.target.closest('[data-trainw]');if(s){ui.trainW[+s.dataset.trainw]=s.value;renderPanel(true);}const a=e.target.closest('[data-traina]');if(a){ui.trainA[+a.dataset.traina]=a.value;renderPanel(true);}const r=e.target.closest('[data-trainrole]');if(r){ui.trainRole[+r.dataset.trainrole]=r.value;renderPanel(true);}
  const t=e.target;const bd=world.building(view.selB);
  if(t.matches('[data-prod]')&&bd){const r=world.setProduct(bd,t.value||null);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'click':'bad');renderPanel(true);}
  else if(t.matches('[data-link]')&&bd&&t.value){const r=world.setLink(bd,t.dataset.link,+t.value);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');renderPanel(true);}
  else if(t.matches('[data-wantk]'))ui.wantK=t.value;
  else if(t.matches('[data-vbase]')){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){v.base=+t.value;v.job=v.job?.phase==='src'?null:v.job;say(`${v.name} : basée à ${world.depotName(world.building(v.base))}.`);}renderPanel(true);}
  else if(t.matches('[data-sitedep]')){const bd=world.building(view.selB);if(bd){bd.site=+t.value;say(`Matériaux pris à ${world.depotName(world.building(bd.site))}.`);renderPanel(true);}}
  else if(t.matches('[data-udep]')){const v=t.value===''?null:+t.value;for(const id of view.sel){const u=world.unit(id);if(u&&u.k==='villageois')u.dep=v;}say(v==null?'Ils rapportent au dépôt le plus proche.':`Ils rapportent à ${world.depotName(world.building(v))}.`);renderPanel(true);}});
$('#panel').addEventListener('pointermove',()=>{ui.lastPointer=performance.now();ui.pointerIn=true;});$('#panel').addEventListener('pointerleave',()=>{ui.pointerIn=false;});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'){ui.modal=null;renderModal();}});
const keys=new Set();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(e.key)){e.preventDefault();uiZ.step(e.key==='-'?-1:e.key==='0'?0:1);return;}
  if(e.target.closest('input,textarea,select'))return;if(e.key==='Escape'&&document.body.classList.contains('cine')&&!designer.open){toggleCine(false);return;}if(designer.open){if(e.key==='Escape')designer.close();return;}if(room.isOpen){if(e.key==='Escape')room.close();return;}audio.init();const k=e.key;
  // V12.4 : Origine (Home) remet la caméra libre dans l'isométrie d'origine
  if(k==='Home'){view.resetCam();say('Caméra : vue isométrique d’origine (bouton du milieu : orienter ; Maj + milieu : déplacer).','info');return;}
  if(ui.modal&&k==='Escape'){ui.modal=null;renderModal();return;}keys.add(k.toLowerCase());
  if((k==='r'||k==='R')&&view.placing&&BUILDINGS[view.placing]?.bunker){view.placeRot=((view.placeRot||0)+1)%4;e.preventDefault();return;}
  if(k==='Escape'){view.zoning=false;view.placing=null;view.lining=null;ui.pick=null;view.sel.clear();view.selVs.clear();view.selB=null;view.selV=null;renderPanel(true);}
  else if(k===' '){e.preventDefault();setSpeed(ui.speed?0:(ui.lastSpeed||1));if(ui.speed)ui.lastSpeed=ui.speed;}
  else if(k==='1'||k==='2'||k==='3'){if(ui.bb&&view.placing==null&&!view.sel.size&&view.selB==null){}setSpeed({1:1,2:2,3:4}[k]);ui.lastSpeed=ui.speed;}
  else if(k==='g'||k==='G'){if(view.sel.size)formSquad();}
  else if(k==='Tab'){e.preventDefault();togglePanel();}
  else if(k==='x'||k==='X'){view.zoning=!view.zoning;renderPanel(true);}
  else if(k==='b'||k==='B'){ui.bb=!ui.bb;ui.bbHtml='';$('#buildbar').innerHTML='';buildBar();}
  else if(k==='n'||k==='N'){toggleFog();}
  else if(k==='k'||k==='K'){toggleCine();}
  else if(k==='v'||k==='V'){toggle3d();}
  else if(k==='c'||k==='C'){view.cones=!view.cones;say(view.cones?'Vigilance : le regard de chaque Bèè repéré près de nos soldats choisis (debout · accroupi · couché), et jusqu’où s’entend chacun de nos coups. La nuit, elle s’affiche d’elle-même pour une équipe d’infiltration. (C)':'Vigilance masquée (la nuit, elle reste pour une équipe d’infiltration).','info');}
  else if(k==='l'||k==='L'){view.logi=!view.logi;say(view.logi?'Carte logistique : dépôts, convois, voies coupées, usines arrêtées, soldats à sec. (L pour fermer)':'Carte logistique fermée.','info');}
  else if(k==='v'||k==='V'){const L=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.irMax);if(!L.length)say('Aucun appareil de vision nocturne dans la sélection.','info');else{const on=!L.every(u=>u.nvOn);for(const u of L)u.nvOn=on;say(`Vision nocturne ${on?'allumée':'éteinte'} (${L.length}) — batterie ${fmt(Math.min(...L.map(u=>u.irLeft??0)),1)} min.`,'info');renderPanel(true);}}
  else if(k==='t'||k==='T'){pitchTent();}
  else if((k==='f'||k==='F')&&view.sel.size){const n=world.smokeOrder([...view.sel]);say(n?`${n} fumigène${n>1?'s':''} lancé${n>1?'s':''}.`:'Plus de fumigène.',n?'':'bad');}
  else if(k==='f'||k==='F'){view.soil=!view.soil;say(view.soil?'Carte des sols : du gris (roche, lande) au vert sombre (terre noire). Les fermes et les moulins y rendent jusqu’à trois fois plus. (F pour fermer)':'Carte des sols fermée.','info');}
  else if(k==='i'||k==='I'){openModal('innov');}
  else if(k==='m'||k==='M'){ui.modal?.kind==='med'?(ui.modal=null,renderModal()):openModal('med');}
  else if(k==='e'||k==='E'){ui.modal?.kind==='eco'?(ui.modal=null,renderModal()):openModal('eco');}
  else if(k==='h'||k==='H'){const c=world.capital();if(c)view.lookAt(c.i+2,c.j+2);}
  else if(k==='.'){const idle=world.idle();if(idle.length){const u=idle[(ui.idleN=((ui.idleN||0)+1))%idle.length];view.sel.clear();view.selB=null;view.sel.add(u.id);view.lookAt(u.x,u.y);renderPanel(true);}}
  else if(k==='Delete'&&view.selB!=null){world.cancel(view.selB);view.selB=null;renderPanel(true);}
  else if(k==='Delete'&&view.hover?.cell){const [i,j]=view.hover.cell;const kk=j*world.N+i;const n=world.cancelLine('meumeu','rail',kk)+world.cancelLine('meumeu','mur',kk);if(n){say(`Tracé annulé : ${n} case${n>1?'s':''} prévue${n>1?'s':''} retirée${n>1?'s':''}.`,'good');renderPanel(true);}}});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const mini=$('#mini');let miniDrag=false;const miniGo=e=>{const r=mini.getBoundingClientRect();const p=view.miniP?.((e.clientX-r.left)*mini.width/r.width,(e.clientY-r.top)*mini.height/r.height);if(p)view.lookAt(Math.max(0,Math.min(world.N,p.x)),Math.max(0,Math.min(world.N,p.y)));};
mini.addEventListener('pointerdown',e=>{miniDrag=true;mini.setPointerCapture(e.pointerId);miniGo(e);});mini.addEventListener('pointermove',e=>{if(miniDrag)miniGo(e);});mini.addEventListener('pointerup',()=>miniDrag=false);

// ---------- ce que le monde annonce : le son, les alertes, les radiographies ----------
// une balle qui passe près du centre de l'écran (là où l'on regarde) : on l'entend fendre l'air
// Une balle qui passe tout près d'un de NOS soldats (les oreilles sélectionnées) : on l'entend fendre l'air. Jamais pour nos propres tirs, ni pour
// un tir qui traverse seulement le centre de l'écran : avant, chaque tir qui passait à l'écran sifflait tout de suite, alors que le bruit du coup
// arrive avec le retard de la distance — « pschiiit… puis BANG », avant chaque tir. Le sifflement arrive maintenant avec le bruit du coup.
function whiz(e){if(e.x1==null||e.f==='meumeu')return;const ears=[...view.sel].map(id=>world.unit(id)).filter(u=>u&&u.f==='meumeu'&&u.hp>0);if(!ears.length)return;
  const ax=e.x,ay=e.y,dx=e.x1-ax,dy=e.y1-ay,L2=dx*dx+dy*dy||1;let best=null;
  for(const u of ears){const t=Math.max(0,Math.min(1,((u.x-ax)*dx+(u.y-ay)*dy)/L2)),px=ax+dx*t,py=ay+dy*t,d=Math.hypot(px-u.x,py-u.y);if(t>=.15&&(!best||d<best.d))best={d,px,py};}
  if(!best||best.d>1.8)return;const P=where(best.px,best.py),S=soundWhere(e);P.vol=Math.max(.25,1-best.d/1.8)*.8;P.delay=S?.delay||0;audio.play('whiz',P,{sup:e.sup});}
// les blessés à terre, à l'écran, gémissent de temps en temps
function moans(){const [i0,i1,j0,j1]=view.vis||[0,0,0,0];const down=world.s.units.filter(u=>u.hp>0&&u.h?.state==='hors'&&bleedRate(u.h)>0&&(u.moans||0)<4&&world.t>(u.moanAt??-1)&&u.x>=i0&&u.x<=i1&&u.y>=j0&&u.y<=j1&&view.fxVisible(u.x,u.y,u.f));if(!down.length)return;
  const u=down[Math.floor(Math.random()*down.length)];u.moanAt=world.t+4;u.moans=(u.moans||0)+1;const P=where(u.x,u.y);if(P.vol>.2)audio.play('agonie',P,{f:u.f});}
function where(x,y){const q=view.toScreen(x,y);const w=view.canvas.width,h=view.canvas.height;const off=Math.hypot((q.x-w/2)/w,(q.y-h/2)/h);const on=q.x>-w*.2&&q.x<w*1.2&&q.y>-h*.2&&q.y<h*1.2;
  return {vol:on?Math.max(.08,1-off*.9)*Math.min(1,.5+view.zoom*.5):Math.max(0,.25-off*.08),pan:(q.x-w/2)/(w/2),far:!on};}
function alertBox(text,x,y,tone='bad'){const box=$('#alert');box.innerHTML=`${text}${x!=null?` <button class="small" data-gotoxy="${x},${y}">Voir</button>`:''}`;box.className='alert '+tone;box.hidden=false;clearTimeout(ui.alertT);ui.alertT=setTimeout(()=>box.hidden=true,9000);}
function woundCard(e){return;   // (retiré à la demande du joueur : les fenêtres de radiographie des tirs « Envoyé / Reçu » ralentissaient les combats)
  if(xray.mode==='off')return;const shooterUnit=e.shooter!=null?world.unit(e.shooter):null,ours=e.vf==='meumeu'||shooterUnit?.f==='meumeu';if(!ours)return;
  const selected=view.sel.has(e.victim)||(e.shooter!=null&&view.sel.has(e.shooter)),mine=xray.mode==='sel'?selected||!!e.frag&&e.vf==='meumeu':selected||e.vf==='meumeu'||!!e.frag&&shooterUnit?.f==='meumeu'||!where(e.x,e.y).far;if(!mine)return;
  const hiddenIntel=e.vf==='beee'&&!world.visibleAt('meumeu',e.x,e.y);
  const vD=e.vf==='beee'?BEEE.units[e.vk]:UNITS[e.vk];const victim=e.name||(e.vf==='beee'?(vD?.name||'Bèè'):(vD?.name||'Meumeu'));const shooter=e.frag?`${{grenade:'Charge',obus:'Obus',bombe:'Bombe'}[e.frag]}${e.sname?' de '+e.sname:''}`:(e.sname||(e.vf==='meumeu'?'Un Bèè':'Un Meumeu'));
  const received=e.vf==='meumeu';const d=e.w?world.design(e.w):null;if(d)e.cons=d.p.cons;
  xray.add({...e,hiddenIntel},{side:received?'L':'R',title:`${received?'Reçu · ':'Envoyé · '}${shooter} → ${hiddenIntel?'Bèè non localisé':victim}`,sub:`${e.frag?`éclat de ${fmt(e.rec.E0*1000/Math.max(1,e.v*e.v)*2,2)} g`:(d?.name||'')} · ${fmt(e.R,e.R<10?1:0)} m · ${Math.round(e.v)} m/s à l’impact${e.cover?` · à travers : ${e.cover}`:''}${hiddenIntel?' · impact hors ligne de mire':''}`});}
function soundWhere(e){if(e.x==null)return null;const ears=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.f==='meumeu'&&u.hp>0&&u.h?.state!=='hors');if(!ears.length)return where(e.x,e.y);
  const ear=ears.reduce((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(b.x-e.x,b.y-e.y)?a:b),dx=e.x-ear.x,dy=e.y-ear.y,d=Math.hypot(dx,dy),db=e.dB||({shot:150,boom:180,cannon:175,fire:135,collapse:165,stop:185}[e.type]||128),R=Math.max(4,(db-110)/1.6),blocked=!world.los(ear.x,ear.y,e.x,e.y),range=R*(blocked?.62:1);
  const vol=d>range?0:Math.max(.03,Math.pow(1-d/range,.8)),raw=(dx-dy)/Math.max(1,d*Math.SQRT2),pan=d>18?Math.round(raw*3)/3:raw;
  // V12.4 : ce qui se passe à l'écran s'entend toujours (le joueur regardait une bataille loin de ses soldats choisis : les tirs y étaient muets) —
  // on garde la plus forte des deux écoutes, celle des soldats choisis (avec le retard du son) ou celle de la caméra
  const S=where(e.x,e.y);if(!S.far&&S.vol*.85>vol)return {vol:S.vol*.85,pan:S.pan,far:false,blocked:false,delay:0};
  return {vol,pan,far:d>18,blocked,delay:d*4/343};}
function events(){for(const e of world.events.splice(0)){view.onEvent(e);const P=e.x!=null?soundWhere(e):null;
  switch(e.type){
    case 'shot':audio.play('shot',P,e);whiz(e);break;case 'cannon':audio.play('cannon',P);break;
    case 'wound':{const v=world.unit(e.victim);if(v){hurtRefs.delete(e.victim);hurtRefs.set(e.victim,v);if(hurtRefs.size>80)hurtRefs.delete(hurtRefs.keys().next().value);}woundCard(e);audio.play('hit',P,e);break;}
    case 'down':audio.play('down',P);if(e.f==='meumeu'&&P&&!P.far)say(`${unitName(world.unit(e.id)||{k:'soldat',f:'meumeu'})} est à terre : ${e.cause||''}.`,'bad');break;
    case 'throw':audio.play('throw',P);break;case 'plate':audio.play('plate',P);if(e.rec)woundCard(e);break;case 'smoke':audio.play('smoke',P);break;case 'reload':audio.play('reload',P);break;case 'pierce':audio.play('pierce',P);break;case 'ricochet':audio.play('ricochet',P);break;case 'impact':if(e.mat==='pierre'||e.mat==='mur'||e.mat==='rocher')audio.play('ricochet',P);else if(!e.hit&&P&&P.vol>.35)audio.play('thud',P,e);break;
    case 'boom':audio.play(e.kind==='bomb'?'bomb':'boom',P,e);break;case 'flak':audio.play('flak',P);break;
    case 'collapse':audio.play('collapse',P);if(e.k&&e.f==='meumeu'&&!e.small)alertBox(`<b>${BUILDINGS[e.k].name} détruit !</b>`,e.x,e.y);break;
    case 'fire':audio.play('fire',P);break;case 'felled':audio.play('felled',P);break;case 'death':audio.play('death',P,e);break;
    case 'built':audio.play('built',P);break;case 'trained':if(e.f==='meumeu')audio.play('trained',P);break;case 'design':audio.play('built');alertBox('<b>Nouvelle arme adoptée.</b> Réglez l’arsenal et la manufacture pour la fabriquer.',null,null,'good');break;
    case 'idea':audio.play('trained');alertBox(`<b>${esc(e.who||'Un Meumeu')} a une idée :</b> ${esc(INNOV.find(x=>x.id===e.id)?.name||'')} <button class="small" data-modal="innov">Les idées</button>`,e.x,e.y,'good');break;
    case 'innov':audio.play('built');say(`Innovation adoptée : ${INNOV.find(x=>x.id===e.id)?.name}.`,'good');break;
    case 'stop':if(e.kind==='train')audio.play('train',P);break;case 'takeoff':audio.play('takeoff',P);break;case 'rail-cut':audio.play('rail',P);if(P?.vol>.05)say('Une voie ferrée est coupée : il faut la reposer.','bad');break;
    case 'tension':audio.play('drums');alertBox(`<b>Frontière.</b> ${esc(e.text)}`,null,null,'warn');break;
    case 'war':audio.play('horn');alertBox(`<b>${esc(e.text)}</b> Les tours, les soldats et les Bèè tirent désormais à vue.`);break;
    case 'rout':audio.play('horn',P);break;
    case 'wave':audio.play('horn',null);alertBox(`<b>Une armée bèè de ${e.n} marche sur nous !</b> <button class="small" data-act="shelter">Aux abris</button>`,e.x,e.y);break;
    case 'air-raid':audio.play('siren',null);alertBox('<b>Bombardier bèè en approche !</b> La DCA, les abris.',e.x,e.y);break;
    case 'downed':audio.play('bomb',P);break;
    case 'won':audio.play('won');$('#win').innerHTML=`<div class="scbox"><b class="big">Gagné !</b><p>Toutes les villes bèè sont tombées au jour ${world.s.won.day}. Votre civilisation continue de vivre.</p><button class="ghost" data-act="win-off">Continuer</button></div>`;$('#win').hidden=false;break;
    case 'lost':$('#win').innerHTML=`<div class="scbox"><b class="big">La civilisation meumeu est tombée</b><p>Au jour ${world.s.lost.day}, le dernier centre-ville s’est effondré.</p><button class="ghost" data-act="new">Nouvelle partie</button></div>`;$('#win').hidden=false;break;}}
  if(Math.random()<.15){const u=world.s.units.find(u=>u.anim==='action'&&u.f==='meumeu'&&Math.random()<.2);if(u){const P=where(u.x,u.y);if(P.vol>.3)audio.play(u.task?.kind==='gather'||u.task?.kind==='work'?'chop':'hammer',P);}}
  for(const F of world.s.falls)if(F.kind==='bomb'&&F.t<.02){audio.play('whistle',where(F.x1,F.y1));break;}}
function ambience(){const [i0,i1,j0,j1]=view.vis||[0,0,0,0];const inv=(x,y)=>x>=i0&&x<=i1&&y>=j0&&y<=j1;const s=world.s;
  const battle=s.units.filter(u=>u.anim==='aim'&&inv(u.x,u.y)).length;ui.fight=battle>=2;if(Math.random()<.35)moans();const fire=s.buildings.filter(b=>b.fire>0&&inv(b.i,b.j)).length;const machines=s.buildings.filter(b=>b.f==='meumeu'&&b.done&&b.working&&BUILDINGS[b.k].factory&&inv(b.i,b.j)).length;// la tension : des bruits neufs (tirs, explosions, une équipe qui marche) entendus par nos soldats, plus le combat à l'écran
  const heard=(s.heard||[]).filter(h=>s.t-h.t<(h.ttl??1.25));const tension=Math.min(1,heard.filter(h=>h.kind==='tirs'||h.kind==='explosion').length*.12+heard.filter(h=>h.kind==='pas'&&(h.team||1)>=3).length*.3+Math.min(.4,battle*.1));
  audio.ambience({battle,fire,machines,night:world.isNight(),tension});}

function toggleFog(){world.s.fog=world.s.fog===false;say(world.s.fog!==false?'Brouillard de guerre : on ne voit que ce que voient nos soldats et nos bâtiments. (N)':'Brouillard de guerre levé : toute la carte est visible, avec les alertes des Bèè. (N)','info');syncFogBtn();}
function syncFogBtn(){const b=document.querySelector('[data-act="fog"]');if(!b)return;const on=world.s.fog!==false;const t='Brouillard : '+(on?'oui':'non');if(b.textContent!==t)b.textContent=t;b.classList.toggle('on',on);}
function setWorld(w){simClock.reset();world=w;view.world=w;view.fogT=0;view.fogVis=null;view.tiles=null;view.overview=null;view.shadeCv=null;view.sel.clear();view.selVs.clear();view.selB=null;view.selV=null;view.parts=[];view.decals=[];view.streaks=[];view.toppling=[];ui.pick=null;ui.modal=null;for(const c of [...xray.cards])xray.remove(c);const c=w.capital();if(c)view.lookAt(c.i+2,c.j+2);$('#win').hidden=true;renderPanel(true);}

// ---------- le scénario de test « front » : voir les Bèè réagir à notre feu ----------
function scenarioFront(w){const c=w.s.beee.cities.find(x=>!x.fallen);const cap=w.capital();if(!c||!cap)return 'Scénario impossible : pas de ville bèè.';
  if(!w.atWar)w.declareWar('meumeu');w.s.fog=false;
  const dx=cap.i-c.x,dy=cap.j-c.y,L=Math.hypot(dx,dy)||1;const [px,py]=w.freeSpot(c.x+dx/L*55,c.y+dy/L*55,10);const ux=dx/L,uy=dy/L,sx=-uy,sy=ux;
  const at=(f,b)=>w.freeSpot(px+ux*b+sx*f,py+uy*b+sy*f,3);const face=u=>{u.fx=-ux;u.fy=-uy;};
  const rocket=w.designsOf('meumeu').find(d=>/fus[ée]e/i.test(d.name)&&w.W(d.id).crew>1);
  const crewGun=(wid,f,b,rounds)=>{const [x,y]=at(f,b);const g=w.addUnit('meumeu','soldat',x,y,{w:wid,rounds});g.task={kind:'guard',tx:x,ty:y};face(g);
    const n=Math.max(0,w.W(wid).crew-1);for(let k=0;k<n;k++){const [sx2,sy2]=at(f+(k%3-1)*.8,b+1+Math.floor(k/3)*.8);const s=w.addUnit('meumeu','soldat',sx2,sy2,{w:'mle1'});s.serve=g.id;s.task={kind:'guard',tx:sx2,ty:sy2};face(s);}return g;};
  crewGun('canon_mle1',-6,10,40);crewGun('canon_mle1',6,10,40);if(rocket)crewGun(rocket.id,0,12,24);
  crewGun('mg_lourde_mle1',-4,0,1500);crewGun('mg_lourde_mle1',4,0,1500);
  for(let k=0;k<12;k++){const [x,y]=at((k-5.5)*1.2,2);const u=w.addUnit('meumeu','soldat',x,y,{w:'mle1',rounds:300});u.task={kind:'guard',tx:x,ty:y};face(u);}
  // en face : 100 soldats bèè armés, en garnison dans leurs villes (60 à la capitale, le reste dans les autres)
  const cities=w.s.beee.cities.filter(x=>!x.fallen);for(let k=0;k<100;k++){const cc=k<60?c:cities[1+(k%Math.max(1,cities.length-1))]||c;const [x,y]=w.freeSpot(cc.x+(Math.random()-.5)*14,cc.y+(Math.random()-.5)*14,4);
    const u=w.addUnit('beee','soldat',x,y,{w:'bee_fusil'});u.city=cc.id;u.home=cc.centre;u.task={kind:'guard',tx:x,ty:y};}
  view.lookAt(px,py);view.zoom=.9;
  return `Scénario « front » prêt : notre batterie à 55 cases de ${c.name}, 100 soldats bèè en face. Sélectionnez les obusiers et faites « Tir sur zone » sur la ville.`;}

// ---------- la boucle ----------
const simClock=new FixedClock();
let last=performance.now(),miniAt=0,saveAt=performance.now();
function frame(now){const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.1,elapsed);last=now;
  try{
    // Le multiplicateur choisi reste vrai à toute heure et en combat. Le vieux
    // facteur nocturne 1/5 transformait 4× en 0,8× et donnait l'impression que
    // les commandes de vitesse étaient inversées.
    if(elapsed>5&&ui.speed>0){setSpeed(0);simClock.reset();say('Interruption prolongée : partie mise en pause, sans avancer les combats en votre absence.','warn');}
    simClock.advance(elapsed,ui.speed,s=>world.update(s/HOUR_REAL));events();
    ui.catchup=simClock.debt>.5;
    const sp=900*dt;if(keys.has('arrowleft')||keys.has('q')||keys.has('a'))view.pan(-sp,0);if(keys.has('arrowright')||keys.has('d'))view.pan(sp,0);if(keys.has('arrowup')||keys.has('z')||keys.has('w'))view.pan(0,-sp);if(keys.has('arrowdown')||keys.has('s'))view.pan(0,sp);
    view.draw(dt*ui.speed);xray.step(dt);if(ui.modal?.kind==='fiche'){const f=findUnit(ui.modal.id);if(f)body3d.draw(f.u.h,dt,f.u.f);}if(now-miniAt>250){miniAt=now;view.drawMini(mini);ambience();}
    topbar();renderPanel(false);if(ui.modal?.kind==='operation')renderModal();if(now-saveAt>30000){try{world.save();saveAt=now;}catch(e){saveAt=now;say('Sauvegarde automatique impossible : '+e.message,'bad');}}
  }catch(e){
    bootError({error:e});
    // La boucle continue et affiche le diagnostic sans mettre la partie en pause.
  }
  requestAnimationFrame(frame);}
$('#xmode').addEventListener('click',()=>{xray.setMode({sel:'ecran',ecran:'off',off:'sel'}[xray.mode]);topbar();});
$('#squads').addEventListener('click',e=>{const b=e.target.closest('[data-squad]');if(b)selectSquad(+b.dataset.squad,e.detail>=2);});
await loadManifest();
{const P=new URLSearchParams(location.search);
  const c=world.capital();if(c)view.lookAt(c.i+2,c.j+2);if(P.get('speed'))setSpeed(+P.get('speed'));if(P.get('at')){const [x,y,z]=P.get('at').split(',').map(Number);view.lookAt(x,y);if(z)view.zoom=z;}}
try{setSpeed(ui.speed);renderPanel(true);}catch(e){bootError({error:e});}
requestAnimationFrame(frame);
window.world=()=>world;window.view=view;window.ui=ui;window.audio=audio;window.xray=xray;window.designer=designer;window.toggleCine=toggleCine;window.toggle3d=toggle3d;window.room=room;window.openModal=openModal;window.renderPanel=renderPanel;window.openFiche=id=>openFiche(id);
window.__step=(n=1,dt=1/30)=>{for(let i=0;i<n;i++){if(ui.speed>0)world.update(dt*ui.speed/HOUR_REAL);events();view.draw(dt*ui.speed);xray.step(dt);if(ui.modal?.kind==='fiche'){const f=findUnit(ui.modal.id);if(f)body3d.draw(f.u.h,dt,f.u.f);}}view.drawMini(mini);renderPanel(true);topbar();};
