// Oberkommando der Meumeu — l'interface. La boucle, le panneau, la barre de construction, la minicarte, les alertes, le son,
// les radiographies, le bureau d'études, le service de santé, les idées des Meumeu, l'économie.
import {SITE_RANGE,CARRY,HOUR_REAL,DAY,RES,RARE,GOODS,BUILDINGS,BUILD_ORDER,BUILD_CATS,UNITS,VEHICLES,LINES,BEEE,GOAL,RADIUS,RECIPES,PRODUCTS,FAMILIES,PRIO,FRET,LIMIT_OF,INNOV,DOMAINS,STEPS,NODES} from './data.js';
import {World} from './world.js';
import {loadManifest,manifest} from './sprites.js';
import {View,AMMO_SVG,ARM_SVG} from './view.js';
import {Audio} from './audio.js';
import {XRay,XRoom,BodyView} from './xray.js';
import {warm as warm3d} from './gl3d.js';
import {Designer} from './designer.js';
import {setupDemo} from './demo.js';
import {Armorer} from './armorer.js';
import {deriveArmor,ZONES,MATS} from './armor.js';
import {REGIONS,PARTS,BLOOD,setSpecies} from './body.js';
import {bleedRate,bleedFactor,SEV,vitals,triage,needsSurgery,needsCare,TQ_LIMIT,SEPSIS,MED} from './health.js';
import {derive,fmt} from './ballistics.js';

const $=s=>document.querySelector(s);
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

let world=new World();
const audio=new Audio();
const ui={speed:1,panelAt:0,lastPanel:'',pick:null,trainW:{},trainA:{},bb:true,bbCat:'vivre',modal:null};
const view=new View($('#view'),world,{
  describe:t=>describe(t),
  unitLabel:u=>unitLabel(u),
  unitInfo:u=>openFiche(u.id),
  order:(ids,t)=>{const r=world.order(ids,t);say(r.ok?r.text:r.why[0],r.ok?'':'bad');audio.play(r.ok?'order':'bad');renderPanel(true);return r;},
  place:(k,i,j)=>{const r=world.place('meumeu',k,i,j);if(!r.ok){say(r.why[0],'bad');audio.play('bad');return r;}
    // ceux qu'on a choisis y vont ; sinon, les villageois oisifs les plus proches
    let vil=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.k==='villageois');const B=BUILDINGS[k];
    if(!vil.length)vil=world.idle().filter(u=>Math.hypot(u.x-i,u.y-j)<45).sort((a,b)=>Math.hypot(a.x-i,a.y-j)-Math.hypot(b.x-i,b.y-j)).slice(0,B.size[0]*B.size[1]>=9?4:3);
    if(vil.length)world.order(vil.map(u=>u.id),{type:'building',id:r.b.id});
    // la fiche du chantier s'ouvre : ce qu'il lui faut, qui y travaille, d'où viennent les matériaux
    view.sel.clear();view.selV=null;view.selB=r.b.id;
    say(`${B.name} posé${vil.length?` : ${vil.length} villageois ${view.sel.size?'y vont':'oisifs y vont d’eux-mêmes'}`:' — aucun villageois libre : choisissez-en, clic droit sur le chantier'}.`,'good');audio.play('order');renderPanel(true);return r;},
  planLine:(kind,cells)=>{const r=world.planLine('meumeu',kind,cells);if(!r.ok){say('rien à poser là','bad');return;}let vil=[...view.sel].map(id=>world.unit(id)).filter(u=>u?.k==='villageois');
    const [i,j]=cells[0];if(!vil.length)vil=world.idle().filter(u=>Math.hypot(u.x-i,u.y-j)<45).slice(0,4);if(vil.length)world.order(vil.map(u=>u.id),{type:kind==='rail'?'rail':'wall',k:j*world.N+i});
    say(`${LINES[kind].name} : ${r.n} cases en plan · ${Object.entries(r.cost).map(([k,v])=>v+' '+RES[k].name.toLowerCase()).join(', ')}, payés case par case${vil.length?` · ${vil.length} villageois y vont`:' — envoyez des villageois (clic droit sur le tracé)'}.`);},
  inspect:t=>{ui.inspect=t;},
  changed:()=>{ui.pick=null;renderPanel(true);},
  rally:w=>{const b=world.building(view.selB);if(b&&b.f==='meumeu'){b.rally=[w.x,w.y];say('Point de ralliement posé.');view.marks.push({x:w.x,y:w.y,age:0});}},
  vehicleOrder:w=>vehicleOrder(w),
  vehicleHint:w=>{const v=world.s.vehicles.find(x=>x.id===view.selV);return v?.k==='bombardier'?'clic droit : bombarder ici':null;},
  get pickStop(){return ui.pick?pickStop:null;}});
const room=new XRoom($('#xroom'));const body3d=new BodyView();
const xray=new XRay($('#xray'),{onGo:(x,y)=>view.lookAt(x,y),room,onFiche:id=>openFiche(id),hostL:$('#xrayL')});warm3d();
const designer=new Designer($('#dz'),{world:()=>world,
  bureau:()=>{const b=world.building(view.selB);if(b?.k==='armurerie'&&b.f==='meumeu'&&b.done)return b;return world.s.buildings.find(x=>x.k==='armurerie'&&x.f==='meumeu'&&x.done&&!x.proto)||null;},
  propose:(p,name)=>{const b=designer.bureau();if(!b)return {ok:false,why:['un bureau d’études']};const r=world.propose(b,name,p);if(r.ok){audio.play('built');say(r.text,'good');}return r;},
  ico,goodName:k=>world.goodName(k),toArmor:()=>armorer.show('gilet')});
const armorer=new Armorer($('#dz'),{world:()=>world,bureau:()=>designer.bureau(),ico,toWeapons:()=>designer.show('mle1'),onClose:()=>{if(ui.dzSpeed!=null){setSpeed(ui.dzSpeed);ui.dzSpeed=null;}renderPanel(true);}});
designer.close=(orig=>function(){orig.call(this);if(ui.dzSpeed!=null){setSpeed(ui.dzSpeed);ui.dzSpeed=null;}renderPanel(true);})(designer.close);
function openDesigner(from){ui.dzSpeed=ui.speed;setSpeed(0);designer.show(from);}
function openArmorer(from){ui.dzSpeed=ui.speed;setSpeed(0);armorer.show(from);}

// ---------- les mots ----------
function unitName(u){const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];return u.name||D.name;}
function unitLabel(u){const D=u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];const st=u.h?(u.h.state==='ok'?'':STATE[u.h.state]+(u.h.state==='hors'&&u.h.cause?` (${u.h.cause})`:'')):'';
  const w=u.w?world.design(u.w)?.name:'';const tr=u.h&&u.f==='meumeu'&&u.h.state!=='ok'?triage(u.h).label:'';return [u.f==='beee'?D.name:`${unitName(u)} · ${D.name.toLowerCase()}`,st,tr,w].filter(Boolean).join(' · ');}
function describe(t){if(!t)return null;const peace=!world.atWar;
  if(t.type==='unit'){const u=world.unit(t.id);if(!u)return null;if(u.f==='beee')return `attaquer : ${BEEE.units[u.k].name.toLowerCase()}${peace?' — ce sera la guerre':''}`;if(u.h&&needsCare(u.h))return 'soigner (un infirmier, un médecin)';if(u.h?.state==='hors')return 'aller chercher le blessé';return null;}
  if(t.type==='building'){const b=world.building(t.id);const B=BUILDINGS[b.k];if(b.f==='beee')return `à l’assaut : ${B.name.toLowerCase()} bèè${peace?' — ce sera la guerre':''}`;if(!b.done)return `${b.ruin?'rebâtir':'bâtir'} : ${B.name.toLowerCase()}${b.why?' · '+b.why:''}`;
    if(b.fire>0||b.hp<b.max-1)return b.fire>0?'éteindre le feu, réparer':'réparer';if(B.hub)return `récolter autour du camp (${world.workers(b).length}/${B.workers})`;if(B.workers)return `travailler : ${B.name.toLowerCase()} (${world.workers(b).length}/${B.workers})`;if(B.airfield)return 'embarquer dans les avions';if(B.store)return 'déposer';return B.name;}
  if(t.type==='node'){const nd=world.s.nodes[t.id];return nd.type==='ore'?`extraire ${RES[nd.res].name.toLowerCase()} à la main (${n0(nd.left)})`:`${nd.type==='tree'?'couper':nd.type==='rock'?'casser':'cueillir'} (${n0(nd.left)})`;}
  if(t.type==='rail')return 'poser la voie';if(t.type==='wall'){const w=world.s.walls[t.k];return w?.f==='beee'?`abattre le mur${peace?' — ce sera la guerre':''}`:'bâtir le mur';}return 'aller là';}
function say(text,tone=''){const h=$('#hint');h.textContent=text;h.className='hint show '+tone;clearTimeout(ui.sayT);ui.sayT=setTimeout(()=>h.className='hint',4500);}
// La taille de l'interface (A− / A+, Ctrl + / Ctrl −). Dans l'application : un vrai zoom de page, net, les clics justes ;
// dans un navigateur : le zoom CSS. Par défaut, calée pour que l'écran fasse ~1650 points de large quel que soit le
// grossissement de Windows (à 175 % sur un écran 1920 : 65 %). Le choix du joueur est retenu d'une partie à l'autre.
const ZOOMS=[.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,1,1.1,1.2,1.3,1.4,1.5];
const near=z=>ZOOMS.reduce((a,b)=>Math.abs(b-z)<Math.abs(a-z)?b:a);
const uiZ={auto(){return Math.min(1,near((screen.width||innerWidth)/1650));},
  cur:1,
  set(z,keep=true){z=Math.max(ZOOMS[0],Math.min(ZOOMS[ZOOMS.length-1],z));this.cur=z;
    if(window.okmApp?.zoom)window.okmApp.zoom(z);else document.documentElement.style.zoom=z===1?'':String(z);
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
  const B=world.s.beee;const war=world.atWar?`<span class="rchip war" title="La guerre depuis le jour ${B.warDay}">⚔ <b>Guerre</b></span>`:`<span class="rchip peace" title="Les Bèè s’arment. La guerre éclatera entre le jour ${BEEE.peace[0]} et le jour ${BEEE.peace[1]} — ils l’annonceront.">☮ <b>Paix armée</b></span>`;
  const W=wounded();const red=W.filter(x=>triage(x.u.h).k==='rouge').length;const ideas=world.s.innov.ideas.length;
  // la ligne des ressources : chacune avec son nom, ce qu'il y a à la capitale
  const SHORT={bois:'Bois',pierre:'Pierre',fer:'Fer',cuivre:'Cuivre',plomb:'Plomb',salpetre:'Salpêtre',charbon:'Charbon',vivres:'Vivres',pieces:'Pièces',poudre:'Poudre',explosifs:'Explosifs',sante:'Santé',fer:'Fer',sels:'Sels',soie:'Soie',verre:'Verre'};
  const chip=(k,v,cls='')=>`<span class="rchip ${cls}" title="${RES[k].name} à la capitale">${ico(k)}<b>${v}</b><i>${SHORT[k]}</i></span>`;
  const h=`${['bois','pierre','charbon','fer','cuivre','plomb','salpetre','vivres','pieces','poudre','explosifs','sante'].map(k=>chip(k,n0(st[k]||0))).join('')}
    <span class="rchip" title="Caisses de munitions à la capitale (toutes conceptions)"><img class="ico" src="${AMMO_SVG}" alt=""><b>${n1(sumK('m:'))}</b><i>Munitions</i></span><span class="rchip" title="Armes en stock à la capitale"><img class="ico" src="${ARM_SVG}" alt=""><b>${n0(sumK('a:'))}</b><i>Armes</i></span>${RARE.map(k=>chip(k,n0(st[k]||0),'rare')).join('')}`;
  const h2=`<span class="rchip ${p.used>=p.cap?'bad':''}" title="Population / places de vie">👥 <b>${p.used}/${p.cap}</b><i>Meumeu</i></span>${war}
    <button class="tb ${red?'alarm':''}" data-modal="med" title="Le service de santé (M)">✚ <b>${W.length}</b> Blessés${red?` <i>${red} rouge${red>1?'s':''}</i>`:''}</button><button class="tb ${ideas?'glow':''}" data-modal="innov" title="Les idées des Meumeu, le laboratoire (I)">💡 <b>${ideas}</b> Idées</button><button class="tb" data-modal="eco" title="Le fret, la production, les stocks, les convois (E)">📦 Économie</button>`;
  if(h!==ui.topHtml){$('#stocks').innerHTML=h;ui.topHtml=h;}if(h2!==ui.topHtml2){$('#status').innerHTML=h2;ui.topHtml2=h2;}
  const hr=world.hour();$('#clock').textContent=`Jour ${world.day} · ${String(Math.floor(hr)).padStart(2,'0')}:${String(Math.floor(hr%1*60)).padStart(2,'0')}${world.isNight()?' ☾':''}`;
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
  const cards=cat.items.map((k,n)=>{const B=BUILDINGS[k];const can=Object.entries(B.cost).every(([r,v])=>(have[r]||0)>=v);const lim=B.unique&&world.s.buildings.some(b=>b.f==='meumeu'&&b.k===k&&!b.ruin);
      const need=[B.onOre?'sur un filon':'',B.station?'au bord d’une voie':'',B.unique?'un seul':'',k==='centre'?'à 24 cases d’une autre ville':''].filter(Boolean).join(' · ');
      return `<button class="bb-card ${view.placing===k?'on':''} ${lim?'far':''}" data-build="${k}" title="${esc(B.why)}${can?'':' — les matériaux en rouge manquent près d’ici : le chantier les commandera.'}"><span class="bb-img">${bthumb(k)?`<img src="${bthumb(k)}" alt="">`:''}<i>${n+1}</i></span><b>${B.name}</b><span class="costs">${costHtml(B.cost,have)}</span><small>${B.size.join('×')}${need?' · '+need:''}${lim?' · déjà bâti':''}</small></button>`;}).join('')+
    (cat.lines||[]).map(k=>{const L=LINES[k];return `<button class="bb-card line ${view.lining?.kind===k?'on':''}" data-line="${k}" title="Cliquez-glissez sur la carte pour tracer. Maj : plusieurs tracés."><span class="bb-img line-${k}"></span><b>${L.name}</b><span class="costs">${costHtml(L.cost)}<small>/case</small></span><small>à tracer</small></button>`;}).join('');
  const h=`<div class="bb-tabs">${BUILD_CATS.map(c=>`<button data-bcat="${c.k}" class="${c===cat?'on':''}" title="${esc(c.hint)}">${c.name}</button>`).join('')}<span class="bb-hint" title="Posé, les villageois oisifs proches y vont · deux cases d’écart entre bâtiments · le chantier commande ses matériaux au dépôt le plus proche">${esc(cat.hint)}</span><button class="bb-x" data-act="bb" title="Replier (B)">▼</button></div><div class="bb-row">${cards}</div>`;
  if(h!==ui.bbHtml){el.innerHTML=h;ui.bbHtml=h;}}

// ---------- le panneau ----------
function renderPanel(force){const now=performance.now();if(!force&&now-ui.panelAt<400)return;if(!force&&ui.pointerIn&&now-(ui.lastPointer||0)<900)return;ui.panelAt=now;
  let h='';const sel=[...view.sel].map(id=>world.unit(id)).filter(Boolean);
  if(ui.pick)h=pickPane();else if(view.selV!=null)h=vehiclePane();else if(sel.length)h=unitsPane(sel);else if(view.selB!=null&&world.building(view.selB))h=buildingPane(world.building(view.selB));else h=overviewPane();
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
function weaponHtml(u){if(!u.w)return '';const d=world.design(u.w);const W=world.W(u.w);const n=u.mag+u.pouch;
  return `<div class="kv"><span>Arme</span><b>${esc(d?.name||'?')} <small class="quiet">${esc(W.name)}</small></b></div><div class="kv"><span>Munitions</span><b class="${n<=0?'bad':n<W.carry*.25?'warn':''}">${u.mag}/${W.p.mag} + ${u.pouch}${u.gren?` · ${u.gren} grenades`:''}</b></div>`;}
function postureRow(sel){const armed=sel.filter(u=>u.w&&u.h);if(!armed.length)return '';const cur=new Set(armed.map(u=>u.orderPost||'auto'));const one=cur.size===1?[...cur][0]:null;
  return `<div class="row"><span class="quiet small">Posture</span><div class="seg">${[['auto','Libre'],['debout','Debout'],['accroupi','Accroupi'],['couche','Couché']].map(([k,n])=>`<button data-post="${k}" class="${one===k?'on':''}" title="${k==='auto'?'debout en marche, accroupi au combat, couché sous le feu':k==='couche'?'une cible minuscule ; lent':k==='accroupi'?'plus petit, plus stable':'on marche vite, on est une grande cible'}">${n}</button>`).join('')}</div></div>`;}
function unitsPane(sel){const by={};for(const u of sel)by[u.k]=(by[u.k]||0)+1;const vil=sel.filter(u=>u.k==='villageois');const one=sel.length===1?sel[0]:null;
  const sqs=new Set(sel.map(u=>u.sq));const sq=sqs.size===1&&sel[0].sq?world.squad(sel[0].sq):null;const whole=sq&&world.members(sq).every(u=>view.sel.has(u.id));
  let h=`<section class="pane"><h2>${sel.length>1?(whole?esc(sq.name):`${sel.length} choisis`):esc(unitName(one))} <small>${Object.entries(by).map(([k,n])=>`${n} ${UNITS[k].name.toLowerCase()}${n>1?'s':''}`).join(' · ')}${one?.sq&&world.squad(one.sq)?' · '+esc(world.squad(one.sq).name):''}</small></h2>`;
  if(one){if(one.h)h+=healthHtml(one);else h+=`<div class="kv"><span>Solidité</span><b>${n0(one.hp)}/${one.max}</b></div><div class="kv"><span>Obus</span><b>${one.shells}</b></div>`;
    h+=weaponHtml(one)+armorHtml(one);if(one.smoke)h+=`<div class="kv"><span>Fumigènes</span><b>${one.smoke}</b></div>`;if(UNITS[one.k].medic)h+=`<div class="kv"><span>Trousses</span><b class="${one.kits<=0?'bad':''}">${one.kits}/${UNITS[one.k].kits}</b></div>`;
    if(UNITS[one.k].doctor)h+=`<div class="kv"><span>Tente pliée</span><b>${one.tents?'oui':'non — il en reprend une au dépôt'}</b></div><div class="row"><button class="small" data-act="tent" ${one.tents?'':'disabled'}>Planter une tente médicale ici (T)</button></div>`;
    h+=`<div class="kv"><span>Fait</span><b>${esc(doing(one))}</b></div>${one.why?`<p class="small warn">${esc(one.why)}</p>`:''}`;
    if(one.h?.state==='blesse')h+=`<div class="row"><button class="small warn" data-act="to-hosp">Envoyer se faire soigner</button></div>`;}
  else{const st={ok:0,blesse:0,hors:0};for(const u of sel)if(u.h)st[u.h.state]=(st[u.h.state]||0)+1;const armed=sel.filter(u=>u.w);const dry=armed.filter(u=>u.mag+u.pouch<=0).length;
    h+=`<div class="kv"><span>État</span><b>${st.ok} indemnes${st.blesse?` · <span class="warn">${st.blesse} blessés</span>`:''}${st.hors?` · <span class="bad">${st.hors} à terre</span>`:''}</b></div>`;
    if(armed.length)h+=`<div class="kv"><span>Munitions</span><b class="${dry?'bad':''}">${armed.reduce((a,u)=>a+u.mag+u.pouch,0)} coups${dry?` · ${dry} à sec`:''}</b></div>`;
    const med=sel.filter(u=>UNITS[u.k].medic);if(med.length)h+=`<div class="kv"><span>Santé</span><b>${med.length} soignant${med.length>1?'s':''} · ${med.reduce((a,u)=>a+u.kits,0)} trousses</b></div>`;
    if(sel.some(u=>UNITS[u.k].doctor&&u.tents))h+=`<div class="row"><button class="small" data-act="tent">Planter une tente médicale (T)</button></div>`;}
  h+=postureRow(sel);const sm=sel.filter(u=>u.smoke>0).length;if(sm)h+=`<div class="row"><button class="small ghost" data-act="smoke" title="Un nuage entre eux et l’ennemi : il coupe la vue">Fumigène (F) · ${sel.reduce((a,u)=>a+(u.smoke||0),0)}</button></div>`;
  if(sq&&whole){h+=`<div class="kv"><span>Moral</span><b class="${sq.morale<.4?'bad':sq.morale<.7?'warn':'good'}">${Math.round(sq.morale*100)} %${sq.broken?' · en déroute':''}</b></div><i class="bloodbar morale"><b style="width:${Math.round(sq.morale*100)}%"></b></i>
      <div class="row"><span class="quiet small">Formation</span><div class="seg">${[['ligne','En ligne'],['colonne','En colonne'],['dispersee','Dispersés']].map(([k,n])=>`<button data-form="${k}" class="${sq.form===k?'on':''}">${n}</button>`).join('')}</div></div>
      <div class="row"><button class="small" data-act="sq-open">Gérer l’escouade : rôles, armes, caisses</button><button class="small ghost" data-act="dissolve">Dissoudre l’escouade</button></div>`;}
  else if(sel.filter(u=>u.k!=='villageois').length>=2)h+=`<div class="row"><button class="small" data-act="squad">Former une escouade (G)</button><span class="quiet small">elle se commande d’un bloc, tient son moral ; un médecin la suit</span></div>`;
  h+=`<p class="quiet small">Clic droit : une cible (ressource, chantier, camp, bâtiment, ennemi, blessé) ou un point — les soldats y vont en formation et attaquent ce qu’ils voient.</p><div class="row"><button class="small ghost" data-act="stop">Arrêter</button></div></section>`;
  if(vil.length){const cx=vil.reduce((a,u)=>a+u.x,0)/vil.length,cy=vil.reduce((a,u)=>a+u.y,0)/vil.length;const deps=world.s.buildings.filter(d=>d.f==='meumeu'&&world.isDepot(d)).sort((a,z)=>world.distB(a,cx,cy)-world.distB(z,cx,cy)).slice(0,10);const cur=vil.every(u=>u.dep===vil[0].dep)?vil[0].dep:undefined;
    h+=`<section class="pane"><h2>Rattachement <small>où ils rapportent ce qu’ils ramassent</small></h2><label class="row small">Livrent à <select data-udep><option value="" ${cur==null?'selected':''}>le dépôt le plus proche</option>${deps.map(d=>`<option value="${d.id}" ${cur===d.id?'selected':''}>${esc(BUILDINGS[d.k].name)} · ${esc(world.cityName(d))} — ${Math.round(world.distB(d,cx,cy))} cases</option>`).join('')}</select></label><p class="quiet small">Des mineurs à la main, des bûcherons : rattachez-les au dépôt du filon, de la gare, pour que le fret l’emporte.</p></section>`;}
  if(vil.length)h+=`<section class="pane"><h2>Bâtir <small>la barre en bas de la carte (B)</small></h2><p class="small">Choisissez un bâtiment en bas, cliquez sa place : ces ${vil.length} villageois y iront. Clic droit sur un arbre, un rocher, un buisson : ils ramassent et rapportent au dépôt le plus proche — ou envoyez-les à un camp, ils récoltent tout autour.</p></section>`;
  return h;}
function doing(u){const T=u.task;if(u.h?.state==='hors')return u.carriedBy?'on le porte vers les soins':'à terre';if(!T)return u.carry?'rapporte au dépôt':u.anim==='aim'?'tire':'rien';const b=T.b!=null?world.building(T.b):null;
  return {gather:'ramasse',build:`bâtit ${b?BUILDINGS[b.k].name.toLowerCase():''}`,repair:'répare',work:b&&BUILDINGS[b.k].hub?'récolte autour du camp':`travaille : ${b?BUILDINGS[b.k].name.toLowerCase():''}`,move:'marche',guard:'en position',assault:'attaque en avançant',attack:'attaque',line:'pose une voie, un mur',deposit:'dépose',board:'embarque',
    evac:'porte un blessé',soigne:'soigne un blessé',operer:'opère sous la tente',hosp:'va se faire soigner',shelter:'court aux abris'}[T.kind]||T.kind;}
// ---------- la gestion : usines, rattachements, dépôts ----------
const SRC={want:'réglée ici',reserve:'réserve',usine:'usine',chantier:'chantier',voie:'voies, murs tracés',locomotive:'locomotive',objectif:'objectif (le rare)'};
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
    <div class="row"><span class="quiet small">Priorité</span><div class="seg prio">${[1,2,3,4,5].map(q=>`<button data-prio="${q}" class="${p===q?'on':''}" title="${PRIO[q]}">${q}</button>`).join('')}</div><b class="small">${PRIO[p]}</b></div>
    <p class="quiet small">Le fret sert d’abord les dépôts les plus prioritaires ; un dépôt garde ce qu’il demande lui-même, sauf face à une priorité plus haute.</p>
    <div class="row"><span>Porteurs : <b>${world.porters(b).length}</b></span><button class="small" data-act="porters" ${world.idle().length?'':'disabled'} title="Des villageois oisifs deviennent porteurs de ce dépôt : à pied, ils servent les dépôts à ${VEHICLES.porteur.range} cases">Affecter 2 porteurs</button>${world.porters(b).length?`<button class="small ghost" data-act="porters-off">En rendre 1</button>`:''}</div>
    ${B.big?'':`<div class="row"><button class="small ${b.evac===false?'ghost':''}" data-act="evac">${b.evac===false?'Trop-plein gardé ici':'Trop-plein évacué'}</button><span class="quiet small">plein à ${Math.round(FRET.EVAC_HI*100)} %, il envoie le surplus au grand dépôt le plus proche</span></div>`}</section>`;
  const byK={};for(const l of lines)(byK[l.k]??=[]).push(l);const miss=Object.fromEntries(def.map(d=>[d.k,(def.filter(x=>x.k===d.k).reduce((a,x)=>a+x.n,0))]));
  h+=`<section class="pane"><h2>Demandes <small>ce que le fret doit y amener</small></h2>${Object.keys(byK).length?`<table class="dem"><thead><tr><th>Bien</th><th>Pour</th><th>Voulu</th><th>Ici</th><th>En route</th></tr></thead><tbody>${Object.entries(byK).map(([k,ls])=>ls.map((l,i)=>{
      const by=l.src==='usine'||l.src==='chantier'||l.src==='reserve'?`<a data-selb="${l.by}">${esc(BUILDINGS[world.building(l.by)?.k]?.name||'?')}</a>`:l.src==='locomotive'?`locomotive « ${esc(world.s.vehicles.find(v=>v.id===l.by)?.name||'')} »`:SRC[l.src];
      const ctl=l.src==='want'?` <button class="small ghost" data-want="${esc(k)}:-10">−</button><button class="small ghost" data-want="${esc(k)}:10">+</button>`:'';
      return `<tr class="${miss[k]>.05?'short':''}"><td>${i?'':`${ico(k)} ${esc(world.goodName(k))}`}</td><td>${by}${l.p!==p?` <small class="quiet">(${l.p<1?'en dernier':PRIO[l.p]?.toLowerCase()})</small>`:''}</td><td>${n1(l.n)}${ctl}</td><td>${i?'':n1(b.stock[k]||0)}</td><td>${i?'':inb[k]?`<span class="good">+${n1(inb[k])}</span>`:miss[k]>.05?'<span class="warn">manque</span>':''}</td></tr>`;}).join('')).join('')}</tbody></table>`:'<p class="quiet small">Aucune demande : rien n’y sera amené.</p>'}
    <div class="row"><select data-wantk>${wantGoods().map(k=>`<option value="${esc(k)}" ${ui.wantK===k?'selected':''}>${esc(world.goodName(k))}</option>`).join('')}</select><button class="small" data-act="want-add">Demander 10 de plus</button></div>
    <p class="quiet small">Une demande réglée ici est permanente : le dépôt en réclame jusqu’à en avoir autant. Le front, un quartier d’usines, une gare au bout de la ligne.</p></section>`;
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
    ${(()=>{const bs=world.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id);const on=bs.filter(u=>u.task.fetch!=null||u.task.bring).length;const idle=world.idle().length;
      return `<div class="row"><span>Bâtisseurs : <b>${bs.length}</b>${on?` · ${on} en chemin avec des matériaux`:''}</span><button class="small" data-act="site-idle" ${idle?'':'disabled'}>Envoyer ${Math.min(2,idle)||2} oisifs</button></div>`;})()}
    <label class="row small">Dépôt du chantier <select data-sitedep>${world.depots('meumeu',...world.bc(b),SITE_RANGE).map(d=>`<option value="${d.id}" ${site?.id===d.id?'selected':''}>${esc(world.depotName(d))} · ${Math.round(world.distB(d,...world.bc(b)))} cases</option>`).join('')}</select></label>
    <p class="quiet small">Les bâtisseurs vont y chercher les matériaux à pied, ${CARRY} caisses par voyage. Ce qui manque au dépôt y est commandé : le fret l’y amène (porteurs, trains, depuis les gares reliées). Choisissez des Meumeu, clic droit sur le chantier : ils y travaillent.</p></section>`;}
function buildingPane(b){const B=BUILDINGS[b.k];const beee=b.f==='beee';let h=`<section class="pane"><div class="bhead">${bthumb(b.k)?`<img src="${bthumb(b.k)}" alt="">`:''}<div><h2>${B.name}${beee?' bèè':''} <small>${esc(world.cityName(b))}</small></h2>
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
  if(b.k==='centre'&&!beee&&b.done){const st=world.cityStats(b);h+=`<section class="pane"><h2>La ville <small>${esc(b.city||'')}</small></h2><div class="kv"><span>Habitants</span><b class="${st.res>=st.cap?'warn':''}">${st.res} / ${st.cap} places</b></div><div class="kv"><span>Maisons</span><b>${st.houses} · 5 places chacune</b></div>
    <div class="row"><button class="small ${b.grow===false?'ghost':''}" data-act="grow">${b.grow===false?'Croissance arrêtée':'Croissance : le centre forme des villageois'}</button><span class="quiet small">25 vivres chacun, tant qu’il y a de la place</span></div>
    <p class="quiet small">Chaque ville grandit par son centre : plus de villes, plus de naissances en même temps. Une maison compte pour la ville la plus proche (26 cases).</p></section>`;}
  if(b.stock&&!beee&&b.done)h+=depotPane(b);
  if(beee){h+=`<section class="pane war"><p>Choisissez des soldats, puis clic droit sur ce bâtiment : au contact, ils le saccagent et y mettent le feu ; les commandos y jettent leurs grenades. Les canons l’abattent de loin ; un bombardier, d’en haut.${!world.atWar?' <b>Nous sommes en paix : attaquer, c’est déclarer la guerre.</b>':''}</p></section>`;return h;}
  if(!b.done)return h;
  const mine=world.designsOf('meumeu');
  if(B.lab){const dev=b.dev&&INNOV.find(x=>x.id===b.dev.id);h+=`<section class="pane"><h2>Recherche</h2>${dev?`<p>En développement : <b>${esc(dev.name)}</b> — encore ${hours(b.dev.left)}.</p><i class="gauge"><i style="width:${Math.round((1-b.dev.left/b.dev.total)*100)}%"></i></i>`:'<p class="quiet small">Rien en cours.</p>'}
    <div class="row"><button data-modal="innov">Les idées des Meumeu (${world.s.innov.ideas.length})</button></div><p class="quiet small">${world.s.innov.done.length} innovation${world.s.innov.done.length>1?'s':''} adoptée${world.s.innov.done.length>1?'s':''}.</p></section>`;}
  if(B.factory)h+=factoryPane(b);else if(b.need)h+=reservePane(b);
  else if(B.makes||b.k==='mine'){const nd=b.k==='mine'&&world.s.nodes[b.ore];h+=nd?`<section class="pane"><div class="kv"><span>Filon</span><b>${ico(nd.res)} ${esc(RES[nd.res].name)} · ${n0(nd.left)} restant</b></div></section>`:'';h+=linksPane(b);}
  if(B.design){const ds=Object.values(world.s.designs).filter(d=>d.f==='meumeu');h+=`<section class="pane"><h2>Bureau d’études</h2>${b.proto?`<p>Prototype en fabrication : <b>${esc(world.design(b.proto.id)?.name)}</b> — encore ${hours(b.proto.left)}.</p>`:''}
    <div class="row"><button data-act="design">Concevoir une arme</button><button data-act="armor">Concevoir une protection</button></div>${b.protoA?`<p>Protection en fabrication : <b>${esc(world.s.armors[b.protoA.id]?.name)}</b> — encore ${hours(b.protoA.left)}.</p>`:''}<div class="dlist">${ds.map(d=>{const D=derive(d.p);return `<div class="dl ${d.status}"><b>${esc(d.name)}</b> <small>${esc(D.name)} · ${Math.round(D.v0)} m/s · ${fmt(D.E0,1)} J · ${D.eff} m</small> <em>${{adopte:'adopté',prototype:'prototype',perdu:'plans perdus'}[d.status]||d.status}</em>${d.status!=='perdu'?` <a data-design="${d.id}">variante</a>`:''}</div>`;}).join('')}</div></section>`;}
  if(B.archives){const man=world.s.buildings.find(x=>x.f==='meumeu'&&x.k==='manufacture'&&!x.ruin);const far=man?Math.hypot(man.i-b.i,man.j-b.j):null;h+=`<section class="pane"><p>${man?(far>=20?`À ${Math.round(far)} cases de la manufacture : les plans sont à l’abri.`:`<span class="warn">Trop près de la manufacture (${Math.round(far)} cases) : une même bombe emporterait tout.</span>`):'Pas encore de manufacture.'}</p></section>`;}
  if(B.ward){const L=b.wardList||[];h+=`<section class="pane"><h2>${B.tent?'Sous la tente':'Blessés'} <small>${L.length}/${B.ward} lits${B.tent?' · on y opère, on y stabilise':B.ward<=4?' · un poste de secours : on y guérit lentement':''}</small></h2>${L.map(u=>{const tr=triage(u.h);return `<div class="kv"><span><i class="tri" style="background:${tr.c}"></i><a data-fiche="${u.id}">${esc(unitName(u))}</a></span><b>${Math.round(u.h.blood/BLOOD*100)} % de sang${needsSurgery(u.h)?' · <span class="bad">à opérer</span>':''}${u.h.legs||u.h.arms?` · os : ${Math.max(0,Math.round(72-(u.h.bone||0)))} h`:''}</b></div>`;}).join('')||`<p class="quiet small">${B.tent?'Personne. Les infirmiers y portent ceux qui tombent près d’ici ; un médecin y opère.':'Personne. Les soignants y ramènent ceux qui sont à terre ; les blessés qui le peuvent y viennent d’eux-mêmes.'}</p>`}
    ${B.tent?`<p class="small ${world.s.units.some(u=>u.task?.kind==='operer'&&u.task.b===b.id)?'good':'warn'}">${world.s.units.some(u=>u.task?.kind==='operer'&&u.task.b===b.id)?'Un médecin opère.':'Aucun médecin sur place : on y stabilise sans opérer.'}</p>`:''}</section>`;}
  if(B.trains){const have=world.have('meumeu',b.i+1,b.j+1);const guns=mine;const wsel=ui.trainW[b.id]||guns.find(d=>(have['a:'+d.id]||0)>=1)?.id||'mle1';const asel=ui.trainA[b.id]!==undefined?ui.trainA[b.id]:(world.armorsOf('meumeu').find(a=>(have['p:'+a.id]||0)>=1)?.id||'');
    h+=`<section class="pane"><h2>Former, construire ${b.queue.length?`<small>${b.queue.map(q=>`${(UNITS[q.k]||VEHICLES[q.k]).name.toLowerCase()} ${hours(q.left)}`).join(' · ')}</small>`:''}</h2>
      ${B.trains.some(k=>UNITS[k]?.arm)?`<label class="row small">Armés de <select data-trainw="${b.id}">${guns.map(d=>`<option value="${d.id}" ${d.id===wsel?'selected':''}>${esc(d.name)} — ${n0(have['a:'+d.id]||0)} en stock</option>`).join('')}</select></label>
        <label class="row small">Protégés par <select data-traina="${b.id}"><option value="">rien</option>${world.armorsOf('meumeu').map(a=>`<option value="${a.id}" ${a.id===asel?'selected':''}>${esc(a.name)} (${Math.round(deriveArmor(a.a).mass*1000)} g) — ${n0(have['p:'+a.id]||0)} en stock</option>`).join('')}</select></label>
        ${(()=>{const Wd=world.W(wsel);const Ar=asel&&world.armorOf(asel);const kg=Wd.mass+(Ar?Ar.D.mass:0)+Wd.carry*Wd.rm/1000;return `<p class="quiet small">Dotation : ${Math.round(kg*1000)} g portés (${Math.round(kg/1.5*100)} % de son poids) · marche ×${fmt(Ar?Ar.D.move:1,2)}.</p>`;})()}`:''}
      <div class="offers">${B.trains.map(k=>{const D=UNITS[k]||VEHICLES[k];const r=world.canTrain(b,k,wsel,asel||null);
      return `<div class="offer ${r.ok?'can':''}"><div class="ohead"><b>${D.name}</b><small class="quiet">${D.hours} h</small></div><p>${esc(D.why)}</p><div class="row between"><span class="costs">${costHtml(r.cost||D.cost,have)}</span><button class="small" data-train="${k}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">${UNITS[k]?'Former':'Construire'}</button></div></div>`;}).join('')}</div><p class="quiet small">Clic droit sur la carte : point de ralliement.</p></section>`;}
  return h;}
function vehiclePane(){const v=world.s.vehicles.find(x=>x.id===view.selV);if(!v){view.selV=null;return overviewPane();}const V=VEHICLES[v.k];
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
const STEP_OK={bois:W=>(W.capital()?.stock.bois||0)>=260||(W.s.innov.prac.bois||0)>4,maisons:W=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.k==='maison'&&b.done).length>=2,
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
function overviewPane(){const s=world.s;const cap=world.capital();const st=cap?.stock||{};const ours=s.buildings.filter(b=>b.f==='meumeu');const army=s.units.filter(u=>u.f==='meumeu'&&u.k!=='villageois');const idle=world.idle();
  const W=wounded();
  let h=stepsPane()+`<section class="pane"><h2>${esc(cap?.city||'La capitale')} <small>la capitale</small></h2>
    <p class="quiet small">Le but : la chute de toutes les villes bèè — et que la capitale tienne.</p>${s.won?`<p class="good"><b>Gagné au jour ${s.won.day}.</b></p>`:''}${s.lost?`<p class="bad"><b>La civilisation meumeu est tombée au jour ${s.lost.day}.</b></p>`:''}</section>`;
  h+=`<section class="pane"><h2>Civilisation</h2><div class="kv"><span>Villes</span><b>${ours.filter(b=>b.k==='centre'&&!b.ruin).map(b=>{const st=b.done?world.cityStats(b):null;return `<a data-goto="${b.id}">${esc(b.city)}</a>${st?` <small>${st.res}/${st.cap}</small>`:' <small>chantier</small>'}`;}).join(', ')}</b></div>
    <div class="kv"><span>Villageois</span><b>${s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').length}${idle.length?` · <a data-act="idle">${idle.length} sans rien à faire</a>`:''}</b></div>
    <div class="kv"><span>Armée</span><b>${army.length?Object.entries(army.reduce((o,u)=>(o[u.k]=(o[u.k]||0)+1,o),{})).map(([k,n])=>`${n} ${UNITS[k].name.toLowerCase()}${n>1?'s':''}`).join(', '):'aucune'}${army.length?` · <a data-act="army">choisir</a>`:''}</b></div>
    ${W.length?`<div class="kv"><span>Blessés</span><b><a data-modal="med">${W.length} · ${W.filter(x=>triage(x.u.h).k==='rouge').length} en urgence</a></b></div>`:''}
    <div class="kv"><span>Logistique</span><b>${s.vehicles.filter(v=>v.f==='meumeu').map(v=>`<a data-vehicle="${v.id}">${esc(v.name)}</a>`).join(', ')||'aucun véhicule'} · ${Object.values(s.rails).filter(r=>r.b).length} cases de voie · <a data-modal="eco">l’économie</a></b></div>
    <div class="row"><button class="small bad" data-act="shelter">Aux abris !</button><span class="quiet small">les villageois courent au centre-ville ou dans une maison</span></div>
    <div class="row"><button class="small ghost" data-act="design">Bureau d’études</button><button class="small ghost" data-modal="innov">Les idées (${s.innov.ideas.length})</button><button class="small ghost" data-modal="med">Santé</button></div></section>`;
  const B=s.beee;const cities=B.cities;h+=`<section class="pane war"><h2>Les Bèè <small>${world.atWar?`la guerre depuis le jour ${B.warDay} · ${B.waves} vague${B.waves>1?'s':''}`:`paix armée · la guerre viendra entre le jour ${BEEE.peace[0]} et le jour ${BEEE.peace[1]}`}</small></h2>
    ${cities.map(c=>`<div class="kv"><span><a data-gotoxy="${c.x},${c.y}">${esc(c.name)}</a></span><b class="${c.fallen?'good':'bad'}">${c.fallen?'tombée':`${s.units.filter(u=>u.f==='beee'&&u.city===c.id).length} en garnison`}</b></div>`).join('')}
    <div class="kv"><span>En marche</span><b class="bad">${s.units.filter(u=>u.f==='beee'&&u.task?.kind==='assault').length} soldats</b></div>
    <p class="quiet small">${world.atWar?`Leurs armées passent les cols de la chaîne du milieu et visent ce qui fait tenir nos villes. Des tours derrière un mur, des munitions dans les dépôts, une tente médicale derrière la ligne, un hôpital en ville : la défense en profondeur.`:'Ils sont à l’autre bout du continent, derrière la chaîne du milieu. Profitez de la paix : mines, arsenal, hôpital, murs aux cols — et des rails pour tout amener là où il le faudra.'}</p></section>`;
  h+=`<details class="drawer" data-k="log" open><summary>Journal</summary>${s.log.slice(0,30).map(l=>`<div class="logline ${l.tone}"><time>j${Math.floor(l.t/DAY)+1} ${String(Math.floor(l.t%DAY)).padStart(2,'0')}h</time><b>${esc(l.where)}</b> ${esc(l.text)}</div>`).join('')}</details>`;
  return h;}

// ---------- les grandes fenêtres : santé, fiche médicale, idées, économie ----------
function openModal(kind,id=null){ui.modal={kind,id};ui.modalHtml='';renderModal();}
function renderModal(){const el=$('#modal');if(!ui.modal){if(!el.hidden){el.hidden=true;el.innerHTML='';}return;}
  let body='';try{body={med:medModal,fiche:ficheModal,innov:innovModal,eco:ecoModal,squad:squadModal}[ui.modal.kind]?.(ui.modal.id)||'';}catch(e){console.error(e);body=`<p class="bad">${esc(e.message)}</p>`;}
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
      <td>${UNITS[u.k].arm?`<select data-sqw="${u.id}">${guns.map(d=>`<option value="${d.id}" ${d.id===u.w?'selected':''}>${esc(d.name)}${d.id!==u.w?` (${n0(have['a:'+d.id]||0)} au dépôt)`:''}</option>`).join('')}</select>${W&&W.crew>1?`<small>pièce à ${W.crew} · ${world.servants(u,1.5).length}/${W.crew-1} servants · ${u.deployT>=W.setup?'en batterie':'à mettre en batterie'}</small>`:''}`:'—'}</td>
      <td>${UNITS[u.k].arm||UNITS[u.k].medic?`<select data-sqa="${u.id}"><option value="">rien</option>${arms.map(a=>`<option value="${a.id}" ${a.id===u.armor?'selected':''}>${esc(a.name)}${a.id!==u.armor?` (${n0(have['p:'+a.id]||0)})`:''}</option>`).join('')}</select>`:'—'}</td>
      <td>${W?`<i class="gauge inline"><i style="width:${Math.min(100,ammo/W.carry*100)}%"></i></i> ${ammo}/${W.carry}`:'—'}${u.role==='munitions'?`<small>${fmt(u.crates||0,1)} caisse${(u.crates||0)>=2?'s':''} de ${esc(world.design(u.ammoW)?.name||'—')}</small>`:''}</td>
      <td>${st==='ok'?'<span class="good">indemne</span>':st==='blesse'?'<span class="warn">blessé</span>':'<span class="bad">à terre</span>'}</td></tr>`;}).join('');
  return mhead(esc(sq.name),`${ms.length} membres · moral ${Math.round(sq.morale*100)} % · ${dep?`dépôt le plus proche : ${esc(world.depotName(dep))}`:'aucun dépôt à portée — on ne change d’arme qu’au dépôt'}`)+`<div class="mbody">
    <div class="row"><span class="quiet small">Formation</span><div class="seg">${[['ligne','En ligne'],['colonne','En colonne'],['dispersee','Dispersés']].map(([k,n])=>`<button data-form="${k}" class="${sq.form===k?'on':''}">${n}</button>`).join('')}</div>
      <button class="small" data-act="sq-crews" title="Pour chaque pièce, les plus proches deviennent ses servants">Répartir les servants</button><button class="small ghost" data-act="sq-resupply" title="Remplir les cartouchières au dépôt le plus proche">Ravitailler au dépôt</button></div>
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
function innovModal(){const I=world.s.innov;const lab=world.s.buildings.find(b=>b.f==='meumeu'&&BUILDINGS[b.k].lab&&b.done);const dev=lab?.dev&&INNOV.find(x=>x.id===lab.dev.id);const have=lab?world.have('meumeu',lab.i+1,lab.j+1):{};
  const card=(x,idea)=>{const X=INNOV.find(y=>y.id===x.id);const r=world.canDevelop(x.id);return `<article class="idea"><header><span class="dom">${esc(DOMAINS[X.dom])}</span><b>${esc(X.name)}</b></header><p>${esc(X.text)}</p>
      <p class="fx">${Object.entries(X.mod).map(([k,v])=>`<span>${esc(MODN[k]||k)} ${v>=1?'+':'−'}${Math.round(Math.abs(v-1)*100)} %</span>`).join('')}</p>
      <div class="row between"><span class="costs">${costHtml(X.cost,have)} · ${X.hours} h</span>${idea?`<span><button class="small ghost" data-drop="${x.id}">Écarter</button> <button class="small" data-dev="${x.id}" ${r.ok?'':'disabled'} title="${esc(r.why.join(', '))}">Développer</button></span>`:''}</div>
      ${idea&&x.who?`<small class="who">idée de <b>${esc(x.who.name||x.who)}</b>, ${esc(UNITS[x.who.k]?.name.toLowerCase()||'')}</small>`:''}</article>`;};
  const doms=Object.entries(DOMAINS).map(([k,n])=>{const p=I.prac[k]||0,nx=I.next[k]||14;const left=INNOV.filter(x=>x.dom===k&&!I.done.includes(x.id)).length;return `<div class="dm"><span>${esc(n)}</span><i class="gauge inline"><i style="width:${nx>=1e8?100:Math.min(100,p/nx*100)}%"></i></i><small>${nx>=1e8?'plus d’idée':left?`${left} à trouver`:'tout trouvé'}</small></div>`;}).join('');
  return mhead('Les idées des Meumeu',`${I.ideas.length} en attente · ${I.done.length} adoptées · ${lab?(dev?`au laboratoire : ${esc(dev.name)}, encore ${hours(lab.dev.left)}`:'le laboratoire attend une idée'):'il faut un laboratoire pour les développer'}`)+
  `<div class="mbody"><p class="quiet small">Ceux qui travaillent ont des idées : à force de couper du bois, de miner, de soigner, de tirer, l’un d’eux propose quelque chose. Chaque partie les amène dans un autre ordre.</p>
    <div class="ideas">${I.ideas.map(x=>card({...x,who:typeof x.who==='object'?x.who:{name:x.who}},true)).join('')||'<p class="quiet">Pas d’idée en attente : travaillez, elles viendront.</p>'}</div>
    <h3>Ce qu’on pratique</h3><div class="doms">${doms}</div>
    <h3>Adoptées</h3><div class="ideas done">${I.done.map(id=>card({id},false)).join('')||'<p class="quiet small">aucune encore</p>'}</div></div>`;}
const MODN={gather_tree:'coupe du bois',gather_rock:'taille de pierre',gather_bush:'cueillette',gather_ore:'extraction à la main',ferme:'fermes',mine:'mines',atelier:'ateliers',carburant_bois:'bois par carburant',cap_porteur:'charge des portettes',cap_train:'charge des trains',vit_train:'vitesse des trains',
  construction:'vitesse de construction',charbon_machines:'charbon des machines',briques:'briqueteries',tender:'tender des locomotives',mur:'solidité des murs',fer_munitions:'fer par caisse',armement:'arsenal et manufacture',tir:'précision',garrot:'durée d’un garrot',plasma:'plasma',brancard:'vitesse des brancardiers',antiseptique:'vitesse de l’infection',chirurgie:'vitesse de la chirurgie',creneaux:'tireurs par tour',couvert:'protection des murs'};
// l'économie : ce qui produit, où sont les stocks, ce qui roule
function ecoModal(){const tab=ui.ecoTab||'fret';const bs=world.s.buildings.filter(b=>b.f==='meumeu'&&b.done);let body='';
  const dn=id=>{const d=world.building(id);return d?`<a data-selb="${d.id}">${esc(BUILDINGS[d.k].name)}</a> <small>${esc(world.cityName(d))}</small>`:'<span class="warn">aucun</span>';};
  if(tab==='prod'){const prod=bs.filter(b=>{const B=BUILDINGS[b.k];return B.workers||B.factory||B.makes||B.lab||B.design;});
    body=`<table class="medt eco"><thead><tr><th></th><th>Bâtiment</th><th>Au travail</th><th>Fait</th><th>Approvisionné par</th><th>Livre à</th><th>État</th></tr></thead><tbody>${prod.map(b=>{const B=BUILDINGS[b.k];const n=B.workers?world.workers(b).length:0;
      const what=B.factory?`${b.prod?`${ico(b.prod)} ${esc(world.productName(b.prod))}`:'<span class="warn">rien</span>'}${b.batch?` <small>${Math.round(Math.min(1,b.batch.done/b.batch.hours)*100)} %</small>`:''}`:B.makes?Object.entries(B.makes).map(([k,v])=>`${ico(k)} ${fmt(v*n*world.mod('ferme'),1)}/h`).join(' '):b.k==='mine'?(()=>{const nd=world.s.nodes[b.ore];return nd?`${ico(nd.res)} ${fmt(B.rate*n*world.mod('mine'),1)}/h · filon ${n0(nd.left)}`:'';})():B.hub?`récolte : ${({auto:'ce qui manque',bois:'bois',pierre:'pierre',vivres:'baies'})[b.res||'auto']}`:b.dev?`innovation ${Math.round((1-b.dev.left/b.dev.total)*100)} %`:b.proto?'prototype':'—';
      return `<tr><td>${bthumb(b.k)?`<img class="thumb" src="${bthumb(b.k)}" alt="">`:''}</td><td><a data-selb="${b.id}">${esc(B.name)}</a><small>${esc(world.cityName(b))}</small></td><td>${B.workers?`${n}/${B.workers}`:'—'}</td><td>${what}</td><td>${world.takesIn(b)?dn(b.sup):'—'}</td><td>${world.givesOut(b)?dn(b.out):'—'}</td><td class="${b.why?'warn':b.working?'good':'quiet'}">${esc(b.why||(b.working?'au travail':'à l’arrêt'))}</td></tr>`;}).join('')}</tbody></table>`;}
  else if(tab==='stocks'){const deps=bs.filter(b=>BUILDINGS[b.k].store);const cols=['bois','pierre','charbon','fer','cuivre','plomb','salpetre','vivres','pieces','poudre','explosifs','sante','soie'];
    body=`<table class="medt eco"><thead><tr><th>Dépôt</th><th>Prio.</th><th>Plein</th>${cols.map(k=>`<th title="${RES[k].name}">${ico(k)}</th>`).join('')}<th title="Munitions (caisses)"><img class="ico" src="${AMMO_SVG}" alt=""></th><th title="Armes"><img class="ico" src="${ARM_SVG}" alt=""></th></tr></thead><tbody>${deps.map(b=>{const B=BUILDINGS[b.k];const u=world.stored(b);const sum=pre=>Object.entries(b.stock).filter(([k])=>k.startsWith(pre)).reduce((a,[,v])=>a+v,0);
      return `<tr><td><a data-selb="${b.id}">${esc(B.name)}</a><small>${esc(world.cityName(b))}</small></td><td>${b.prio??3}</td><td><i class="gauge inline"><i style="width:${Math.min(100,u/B.store*100)}%"></i></i> ${n0(u)}/${B.store}</td>${cols.map(k=>`<td class="${(b.stock[k]||0)<1?'quiet':''}">${n0(b.stock[k]||0)}</td>`).join('')}<td>${n1(sum('m:'))}</td><td>${n0(sum('a:'))}</td></tr>`;}).join('')}</tbody></table>`;}
  else if(tab==='fret'){const L=world.shortages('meumeu');const fv=world.s.vehicles.filter(v=>v.f==='meumeu'&&v.mode==='fret');const J=world.jams('meumeu');
    body=`${J.length?`<div class="jam"><b>Goulots :</b> ${J.map(j=>`<a data-selb="${j.D.id}">${esc(world.depotName(j.D))}</a> est plein — ${j.stuck.map(b=>esc(BUILDINGS[b.k].name.toLowerCase())).join(', ')} à l’arrêt`).join(' · ')}. <span class="quiet">Plus de charrettes, un train, un entrepôt près de la production.</span></div>`:''}<p class="quiet small">Tout ce qui manque, par priorité. Le bureau du fret y envoie ${fv.length} véhicule${fv.length>1?'s':''} à la demande (${fv.filter(v=>v.job).length} en voyage, ${fv.filter(v=>!v.job).length} libres).</p>
      <table class="medt eco"><thead><tr><th>Priorité</th><th>Dépôt</th><th>Bien</th><th>Manque</th><th>En route</th><th>Ailleurs</th><th>État</th></tr></thead><tbody>${L.slice(0,60).map(it=>{const served=fv.some(v=>world.serves(v,it.D));
      const st=it.inb>.05?'<span class="good">en route</span>':it.p<1&&it.src<Math.min(1,it.n)?'<span class="quiet">à rapatrier dès qu’il y en aura</span>':it.src<Math.min(1,it.n)?'<span class="warn">aucune source : il faut en produire, ou une priorité plus haute</span>':!served?'<span class="warn">aucun véhicule à la demande ne dessert ce dépôt</span>':'<span class="quiet">attend un véhicule</span>';
      return `<tr><td>${it.p<1?'objectif':PRIO[it.p]}</td><td><a data-selb="${it.D.id}">${esc(BUILDINGS[it.D.k].name)}</a><small>${esc(world.cityName(it.D))}</small></td><td>${ico(it.k)} ${esc(world.goodName(it.k))}</td><td>${n1(it.n)}</td><td>${it.inb?n1(it.inb):''}</td><td>${n1(it.src)}</td><td>${st}</td></tr>`;}).join('')||'<tr><td colspan="7" class="quiet">Rien ne manque nulle part.</td></tr>'}</tbody></table>`;}
  else if(tab==='gis'){const cap=world.capital();const [cx,cy]=cap?world.bc(cap):[0,0];const ns=world.s.nodes.filter(n=>n.type==='ore').map(n=>({n,d:Math.hypot(n.i-cx,n.j-cy),m:world.s.buildings.find(b=>b.ore===n.id&&!b.ruin)})).sort((a,b)=>a.d-b.d);
    const bf=ui.gisF||'';const kinds=[...new Set(ns.map(x=>x.n.res))];
    body=`<div class="seg">${['',...kinds].map(k=>`<button data-gisf="${k}" class="${bf===k?'on':''}">${k?`${ico(k)} ${esc(RES[k].name)}`:'Tous'}</button>`).join('')}</div><table class="medt eco"><thead><tr><th>Gisement</th><th>Distance</th><th>Reste</th><th>Exploité</th><th></th></tr></thead><tbody>${ns.filter(x=>!bf||x.n.res===bf).slice(0,60).map(({n,d,m})=>`<tr><td>${ico(n.res)} <b>${esc(RES[n.res].name)}</b></td><td>${Math.round(d)} cases${d<23?' <small class="good">à pied</small>':' <small class="quiet">rail</small>'}</td><td><i class="gauge inline"><i style="width:${Math.round(n.left/n.max*100)}%"></i></i> ${n0(n.left)}</td><td>${m?`<a data-selb="${m.id}">${m.done?'mine':'chantier'}</a>`:'<span class="quiet">non</span>'}</td><td><button class="small ghost" data-gotoxy="${n.i},${n.j}">Voir</button></td></tr>`).join('')}</tbody></table><p class="quiet small">Les filons près de la capitale sont petits ; les gros sont loin : dépôt, mine, gare, voie. Tous s’épuisent.</p>`;}
  else{const vs=world.s.vehicles.filter(v=>v.f==='meumeu');body=`<table class="medt eco"><thead><tr><th>Véhicule</th><th>Service</th><th>Voyage</th><th>À bord</th><th>Charge</th></tr></thead><tbody>${vs.map(v=>{const A=v.route&&world.building(v.route.a),B=v.route&&world.building(v.route.b);const cap=v.k==='bombardier'?1:world.capOf(v);
      return `<tr><td><a data-vehicle="${v.id}">${esc(VEHICLES[v.k].name)} « ${esc(v.name)} »</a></td><td>${v.k==='bombardier'?'—':v.mode==='fret'?'à la demande':'ligne fixe'}</td><td>${v.mode==='fret'?esc(world.jobText(v)):A&&B?`${esc(world.cityName(A))} ↔ ${esc(world.cityName(B))}`:'<span class="warn">aucune ligne</span>'}${v.why?`<small class="warn">${esc(v.why)}</small>`:''}</td>
        <td>${Object.entries(v.cargo||{}).filter(([,n])=>n>=.05).map(([k,n])=>`${ico(k)}${n1(n)}`).join(' ')||'—'}</td><td>${v.k==='bombardier'?'—':`<i class="gauge inline"><i style="width:${Math.min(100,world.cargoW(v)/cap*100)}%"></i></i> ${n1(world.cargoW(v))}/${n1(cap)}`}</td></tr>`;}).join('')||'<tr><td colspan="5" class="quiet">Aucun véhicule : construisez une charrette au centre-ville, à un camp, à un entrepôt.</td></tr>'}</tbody></table>`;}
  return mhead('L’économie','le fret, la production, les stocks, les convois')+`<div class="mbody"><div class="seg tabs">${[['fret','Le fret'],['prod','Production'],['stocks','Stocks'],['gis','Gisements'],['convois','Convois']].map(([k,n])=>`<button data-eco="${k}" class="${tab===k?'on':''}">${n}</button>`).join('')}</div>${body}</div>`;}

// ---------- les véhicules ----------
function pickStop(bid){const v=world.s.vehicles.find(x=>x.id===ui.pick.v);const b=world.building(bid);if(!v||!b)return;if(b.f!=='meumeu'){say('un arrêt à nous','bad');return;}
  if(!ui.pick.a){ui.pick.a=bid;say(`Départ : ${world.cityName(b)}. Cliquez l’arrivée.`);renderPanel(true);return;}
  const r=world.setRoute(v.id,ui.pick.a,bid);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');ui.pick=null;renderPanel(true);}
function vehicleOrder(w){const v=world.s.vehicles.find(x=>x.id===view.selV);if(!v)return;if(v.k==='bombardier'){const r=world.bomb(v.id,w.x,w.y);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');if(r.ok)view.marks.push({x:w.x,y:w.y,age:0,bad:true});return;}
  const t=world.targetAt(w.x,w.y);if(t?.type==='building'){if(!ui.pick)ui.pick={v:v.id,a:null,need:''};pickStop(t.id);}}
function selectSquad(id,go){const sq=world.squad(id);if(!sq)return;view.sel.clear();view.selB=null;view.selV=null;for(const u of world.members(sq))view.sel.add(u.id);if(go){const L=world.unit(sq.leader)||world.members(sq)[0];if(L)view.lookAt(L.x,L.y);}renderPanel(true);}
function formSquad(){const r=world.formSquad([...view.sel]);say(r.ok?r.text+' — ses radiographies s’ouvriront quand elle tire ou qu’on lui tire dessus.':r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');renderPanel(true);}
function pitchTent(){const doc=[...view.sel].map(id=>world.unit(id)).find(u=>u&&UNITS[u.k]?.doctor&&u.tents>0);if(!doc){say('Choisissez un médecin qui porte une tente.','bad');return;}const r=world.pitchTent(doc);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'order':'bad');renderPanel(true);}
function sendMedic(id){const e=world.unit(id);if(!e)return;const m=world.s.units.filter(u=>u.f==='meumeu'&&UNITS[u.k]?.medic&&u.kits>0&&u.h?.state!=='hors').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
  if(!m){say('Aucun soignant avec des trousses : formez des infirmiers et des médecins à l’hôpital.','bad');return;}m.task={kind:'soigne',id:e.id};m.path=null;m.treatT=0;say(`${m.name} court soigner ${unitName(e)}.`,'good');}
function evacuate(id){const e=world.unit(id);if(!e)return;const c=world.s.units.filter(u=>u.f==='meumeu'&&u.id!==id&&u.h?.state!=='hors'&&!u.carrying&&u.k!=='canon').sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,2);
  if(!c.length){say('Personne pour le porter.','bad');return;}const r=world.order(c.map(u=>u.id),{type:'unit',id});say(r.ok?r.text:r.why[0],r.ok?'good':'bad');}

// ---------- les clics ----------
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b||b.closest('#dz')||b.closest('#xray')||b.closest('#xroom'))return;audio.init();const d=b.dataset;
  if(d.speed!==undefined){setSpeed(+d.speed);return;}
  if(d.build){view.placing=view.placing===d.build?null:d.build;view.lining=null;ui.bbHtml='';say(view.placing?`${BUILDINGS[d.build].name} : choisissez la place (une case d’écart avec les autres). Clic droit : annuler.`:'');renderPanel(true);return;}
  if(d.line){view.lining=view.lining?.kind===d.line?null:{kind:d.line};view.placing=null;ui.bbHtml='';say(view.lining?`${LINES[d.line].name} : cliquez-glissez sur la carte. Maj : plusieurs tracés. Clic droit : fini.`:'');renderPanel(true);return;}
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
  if(d.train){const bd=world.building(view.selB);const r=world.train(bd,d.train,ui.trainW[bd.id]||$(`[data-trainw="${bd.id}"]`)?.value,($(`[data-traina="${bd.id}"]`)?.value)||null);say(r.ok?r.text:r.why[0],r.ok?'good':'bad');audio.play(r.ok?'click':'bad');renderPanel(true);return;}
  if(d.limit){const bd=world.building(view.selB);if(bd?.prod){const step=LIMIT_OF(bd.prod)>=50?20:2;world.setLimit(bd,(bd.limit||0)+(+d.limit)*step);}renderPanel(true);return;}
  if(d.prio){const bd=world.building(view.selB);if(bd){world.setPrio(bd,+d.prio);say(`${world.depotName(bd)} : priorité ${PRIO[+d.prio].toLowerCase()}.`);}renderPanel(true);return;}
  if(d.need){const bd=world.building(view.selB);const i=d.need.lastIndexOf(':');const k=d.need.slice(0,i);if(bd)world.setNeed(bd,k,(bd.need?.[k]||0)+(+d.need.slice(i+1)));renderPanel(true);return;}
  if(d.want){const bd=world.building(view.selB);const i=d.want.lastIndexOf(':');const k=d.want.slice(0,i);if(bd)world.setWant(bd,k,(bd.want?.[k]||0)+(+d.want.slice(i+1)));renderPanel(true);return;}
  if(d.vmode){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){const r=world.setMode(v,d.vmode);say(r.ok?r.text:r.why[0],r.ok?'':'bad');}renderPanel(true);return;}
  if(d.fam){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v)world.toggleFamily(v,d.fam);renderPanel(true);return;}
  if(d.vrange){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v)v.range=Math.max(6,Math.min(30,(v.range||VEHICLES.porteur.range)+Math.sign(+d.vrange)*2));renderPanel(true);return;}
  if(d.post){world.setPosture([...view.sel],d.post);renderPanel(true);return;}
  if(d.form){const u=world.unit([...view.sel][0]);const sq=u&&world.squad(u.sq);if(sq){sq.form=d.form;say(`${sq.name} : ${b.textContent.toLowerCase()} au prochain ordre de marche.`);}renderPanel(true);return;}
  if(d.squad){selectSquad(+d.squad,e.detail>=2);return;}
  if(d.design){openDesigner(d.design);return;}
  if(d.goto){const bd=world.building(+d.goto);if(bd)view.lookAt(bd.i+2,bd.j+2);return;}
  if(d.gotoxy){const [x,y]=d.gotoxy.split(',').map(Number);view.lookAt(x,y);view.zoom=Math.max(view.zoom,.8);if(ui.modal){ui.modal=null;renderModal();}return;}
  if(d.vehicle){const v=world.s.vehicles.find(x=>x.id===+d.vehicle);if(v){view.sel.clear();view.selB=null;view.selV=v.id;view.lookAt(v.x,v.y);ui.modal=null;renderPanel(true);}return;}
  if(d.goods){const [dir,k]=d.goods.split(':');const v=world.s.vehicles.find(x=>x.id===view.selV);if(v?.route){const L=v.route[dir];const i=L.indexOf(k);i>=0?L.splice(i,1):L.push(k);}renderPanel(true);return;}
  const a=d.act;if(!a)return;
  if(a==='stop'){for(const id of view.sel){const u=world.unit(id);if(u&&u.h?.state!=='hors'){u.task=null;u.path=null;}}}
  else if(a==='modal-off'){ui.modal=null;renderModal();return;}
  else if(a==='bb'){ui.bb=!ui.bb;ui.bbHtml='';$('#buildbar').innerHTML='';buildBar();return;}
  else if(a==='tent'){pitchTent();return;}
  else if(a==='idle'){const idle=world.idle();if(idle.length){view.sel.clear();view.selB=null;view.selV=null;idle.forEach(u=>view.sel.add(u.id));view.lookAt(idle[0].x,idle[0].y);}}
  else if(a==='army'){view.sel.clear();view.selB=null;view.selV=null;world.s.units.filter(u=>u.f==='meumeu'&&u.k!=='villageois').forEach(u=>view.sel.add(u.id));}
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
  else if(a==='sq-resupply'){const sq=world.squad(ui.modal?.id);if(sq){for(const u of world.members(sq))world.resupply(u);ui.modalHtml='';renderModal();say('Cartouchières remplies au dépôt (s’il en a).','good');}}
  else if(a==='grow'){const bd=world.building(view.selB);if(bd){bd.grow=bd.grow===false;say(bd.grow?`${bd.city} : croissance.`:`${bd.city} : croissance arrêtée.`);}}
  else if(a==='porters'){const bd=world.building(view.selB);const r=world.addPorters(bd,2);say(r.ok?`${r.n} porteur${r.n>1?'s':''} pour ${world.depotName(bd)}.`:r.why[0],r.ok?'good':'bad');}
  else if(a==='porters-off'){const bd=world.building(view.selB);const v=bd&&world.porters(bd).pop();if(v){world.releasePorter(v);say('Un porteur rendu au village.');}}
  else if(a==='porter-free'){const v=world.s.vehicles.find(x=>x.id===view.selV);if(v){world.releasePorter(v);view.selV=null;say('Rendu au village.');}}
  else if(a==='evac'){const bd=world.building(view.selB);if(bd){bd.evac=bd.evac===false?true:false;say(bd.evac?'Le trop-plein part au grand dépôt le plus proche.':'Le trop-plein reste ici.');}}
  else if(a==='halt'){const bd=world.building(view.selB);if(bd){bd.halt=!bd.halt;say(`${BUILDINGS[bd.k].name} : ${bd.halt?'arrêtée — elle ne commande plus rien':'reprend le travail'}.`);}}
  else if(a==='want-add'){const bd=world.building(view.selB);const k=$('[data-wantk]')?.value;if(bd&&k){ui.wantK=k;world.setWant(bd,k,(bd.want?.[k]||0)+10);say(`${world.depotName(bd)} demande ${bd.want[k]} ${world.goodName(k).toLowerCase()}.`,'good');}}
  else if(a==='route'){const v=world.s.vehicles.find(x=>x.id===view.selV);ui.pick={v:v.id,a:null,need:v.k==='train'?'Deux gares reliées par une voie bâtie.':v.k==='avion'?'Deux aérodromes. Les passagers : envoyez des Meumeu (clic droit sur l’aérodrome), ils attendent le prochain avion.':'Deux dépôts (centre, camp, gare, tente) sur la même terre.'};}
  else if(a==='pick-off')ui.pick=null;
  else if(a==='shelter'){const n=world.shelterAll();say(n?`${n} villageois courent aux abris.`:'Aucun abri à portée.',n?'':'bad');audio.play('siren');}
  else if(a==='sound'){b.textContent=audio.toggle()?'🔈':'🔇';}
  else if(a==='zoom-in')uiZ.step(1);else if(a==='zoom-out')uiZ.step(-1);else if(a==='zoom-auto'){uiZ.step(0);say(`Taille de l’interface : automatique (${Math.round(uiZ.cur*100)} %).`);}
  else if(a==='save'){localStorage.setItem('okm-save',world.save());say('Partie sauvée.','good');}
  else if(a==='load'){const j=localStorage.getItem('okm-save');if(!j){say('Aucune sauvegarde.','bad');return;}try{const w=new World(1);w.load(j);setWorld(w);say('Partie reprise.','good');}catch(err){console.error(err);say('Sauvegarde illisible (d’une version plus ancienne).','bad');}}
  else if(a==='new'){if(confirm('Nouvelle partie : une nouvelle carte. La partie en cours sera perdue si elle n’est pas sauvée.')){setWorld(new World());say('Une nouvelle carte.','good');}}
  else if(a==='demo'){if(confirm('Démo de guerre : une capitale équipée, deux escouades, un avant-poste bèè à 40 cases. La partie en cours sera perdue si elle n’est pas sauvée.')){const w=new World();const r=setupDemo(w);setWorld(w);if(r.post)alertBox('La guerre est déclarée : un avant-poste bèè vous attend.',r.post[0],r.post[1],'bad');say('Démo de guerre : escouades sur les touches 1 et 2.','good');}}
  else if(a==='win-off'){$('#win').hidden=true;}
  renderPanel(true);});
document.addEventListener('change',e=>{const sr=e.target.closest('[data-sqr],[data-sqw],[data-sqa]');if(sr){const d=sr.dataset;const u=world.unit(+(d.sqr||d.sqw||d.sqa));if(u){const r=d.sqr?world.setRole(u,sr.value):d.sqw?world.rearm(u,sr.value):world.rearmor(u,sr.value||null);if(!r.ok)say(r.why[0],'bad');ui.modalHtml='';renderModal();renderPanel(true);}return;}
  const s=e.target.closest('[data-trainw]');if(s){ui.trainW[+s.dataset.trainw]=s.value;renderPanel(true);}const a=e.target.closest('[data-traina]');if(a){ui.trainA[+a.dataset.traina]=a.value;renderPanel(true);}
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
  if(e.target.closest('input,textarea,select'))return;if(designer.open){if(e.key==='Escape')designer.close();return;}if(room.isOpen){if(e.key==='Escape')room.close();return;}audio.init();const k=e.key;
  if(ui.modal&&k==='Escape'){ui.modal=null;renderModal();return;}keys.add(k.toLowerCase());
  if(k==='Escape'){view.placing=null;view.lining=null;ui.pick=null;view.sel.clear();view.selB=null;view.selV=null;renderPanel(true);}
  else if(k===' '){e.preventDefault();setSpeed(ui.speed?0:(ui.lastSpeed||1));if(ui.speed)ui.lastSpeed=ui.speed;}
  else if(k==='1'||k==='2'||k==='3'){if(ui.bb&&view.placing==null&&!view.sel.size&&view.selB==null){}setSpeed({1:1,2:2,3:4}[k]);ui.lastSpeed=ui.speed;}
  else if(k==='g'||k==='G'){if(view.sel.size)formSquad();}
  else if(k==='b'||k==='B'){ui.bb=!ui.bb;ui.bbHtml='';$('#buildbar').innerHTML='';buildBar();}
  else if(k==='t'||k==='T'){pitchTent();}
  else if((k==='f'||k==='F')&&view.sel.size){const n=world.smokeOrder([...view.sel]);say(n?`${n} fumigène${n>1?'s':''} lancé${n>1?'s':''}.`:'Plus de fumigène.',n?'':'bad');}
  else if(k==='i'||k==='I'){ui.modal?.kind==='innov'?(ui.modal=null,renderModal()):openModal('innov');}
  else if(k==='m'||k==='M'){ui.modal?.kind==='med'?(ui.modal=null,renderModal()):openModal('med');}
  else if(k==='e'||k==='E'){ui.modal?.kind==='eco'?(ui.modal=null,renderModal()):openModal('eco');}
  else if(k==='h'||k==='H'){const c=world.capital();if(c)view.lookAt(c.i+2,c.j+2);}
  else if(k==='.'){const idle=world.idle();if(idle.length){const u=idle[(ui.idleN=((ui.idleN||0)+1))%idle.length];view.sel.clear();view.selB=null;view.sel.add(u.id);view.lookAt(u.x,u.y);renderPanel(true);}}
  else if(k==='Delete'&&view.selB!=null){world.cancel(view.selB);view.selB=null;renderPanel(true);}});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const mini=$('#mini');let miniDrag=false;const miniGo=e=>{const r=mini.getBoundingClientRect();const p=view.miniP?.((e.clientX-r.left)*mini.width/r.width,(e.clientY-r.top)*mini.height/r.height);if(p)view.lookAt(Math.max(0,Math.min(world.N,p.x)),Math.max(0,Math.min(world.N,p.y)));};
mini.addEventListener('pointerdown',e=>{miniDrag=true;mini.setPointerCapture(e.pointerId);miniGo(e);});mini.addEventListener('pointermove',e=>{if(miniDrag)miniGo(e);});mini.addEventListener('pointerup',()=>miniDrag=false);

// ---------- ce que le monde annonce : le son, les alertes, les radiographies ----------
function where(x,y){const q=view.toScreen(x,y);const w=view.canvas.width,h=view.canvas.height;const off=Math.hypot((q.x-w/2)/w,(q.y-h/2)/h);const on=q.x>-w*.2&&q.x<w*1.2&&q.y>-h*.2&&q.y<h*1.2;
  return {vol:on?Math.max(.08,1-off*.9)*Math.min(1,.5+view.zoom*.5):Math.max(0,.25-off*.08),pan:(q.x-w/2)/(w/2),far:!on};}
function alertBox(text,x,y,tone='bad'){const box=$('#alert');box.innerHTML=`${text}${x!=null?` <button class="small" data-gotoxy="${x},${y}">Voir</button>`:''}`;box.className='alert '+tone;box.hidden=false;clearTimeout(ui.alertT);ui.alertT=setTimeout(()=>box.hidden=true,9000);}
function woundCard(e){if(xray.mode==='off')return;const mine=xray.mode==='sel'?(view.sel.has(e.victim)||(e.shooter!=null&&view.sel.has(e.shooter))):!where(e.x,e.y).far;if(!mine)return;
  const vD=e.vf==='beee'?BEEE.units[e.vk]:UNITS[e.vk];const victim=e.vf==='beee'?(vD?.name||'Bèè'):(e.name||vD?.name||'Meumeu');const shooter=e.frag?`${{grenade:'Grenade',obus:'Obus',bombe:'Bombe'}[e.frag]}${e.sname?' de '+e.sname:''}`:(e.sname||(e.vf==='meumeu'?'Un Bèè':'Un Meumeu'));
  const received=e.vf==='meumeu';const d=e.w?world.design(e.w):null;if(d)e.cons=d.p.cons;
  xray.add(e,{side:received?'L':'R',title:`${received?'Reçu · ':'Envoyé · '}${shooter} → ${victim}`,sub:`${e.frag?`éclat de ${fmt(e.rec.E0*1000/Math.max(1,e.v*e.v)*2,2)} g`:(d?.name||'')} · ${fmt(e.R,e.R<10?1:0)} m · ${Math.round(e.v)} m/s à l’impact${e.cover?` · à travers : ${e.cover}`:''}`});}
function events(){for(const e of world.events.splice(0)){view.onEvent(e);const P=e.x!=null?where(e.x,e.y):null;
  switch(e.type){
    case 'shot':audio.play('shot',P,e);break;case 'cannon':audio.play('cannon',P);break;
    case 'wound':{const v=world.unit(e.victim);if(v){hurtRefs.delete(e.victim);hurtRefs.set(e.victim,v);if(hurtRefs.size>80)hurtRefs.delete(hurtRefs.keys().next().value);}woundCard(e);audio.play('hit',P,e);break;}
    case 'down':audio.play('down',P);if(e.f==='meumeu'&&P&&!P.far)say(`${unitName(world.unit(e.id)||{k:'soldat',f:'meumeu'})} est à terre : ${e.cause||''}.`,'bad');break;
    case 'throw':audio.play('throw',P);break;case 'plate':audio.play('plate',P);if(e.rec)woundCard(e);break;case 'smoke':audio.play('smoke',P);break;case 'reload':audio.play('reload',P);break;case 'pierce':audio.play('pierce',P);break;case 'impact':if(e.mat==='pierre'||e.mat==='mur'||e.mat==='rocher')audio.play('ricochet',P);break;
    case 'boom':audio.play(e.kind==='bomb'?'bomb':'boom',P);break;case 'flak':audio.play('flak',P);break;
    case 'collapse':audio.play('collapse',P);if(e.k&&e.f==='meumeu'&&!e.small)alertBox(`<b>${BUILDINGS[e.k].name} détruit !</b>`,e.x,e.y);break;
    case 'fire':audio.play('fire',P);break;case 'felled':audio.play('felled',P);break;case 'death':audio.play('death',P);break;
    case 'built':audio.play('built',P);break;case 'trained':if(e.f==='meumeu')audio.play('trained',P);break;case 'design':audio.play('built');alertBox('<b>Nouvelle arme adoptée.</b> Réglez l’arsenal et la manufacture pour la fabriquer.',null,null,'good');break;
    case 'idea':audio.play('trained');alertBox(`<b>${esc(e.who||'Un Meumeu')} a une idée :</b> ${esc(INNOV.find(x=>x.id===e.id)?.name||'')} <button class="small" data-modal="innov">Les idées</button>`,e.x,e.y,'good');break;
    case 'innov':audio.play('built');say(`Innovation adoptée : ${INNOV.find(x=>x.id===e.id)?.name}.`,'good');break;
    case 'stop':if(e.kind==='train')audio.play('train',P);break;case 'takeoff':audio.play('takeoff',P);break;case 'rail-cut':audio.play('rail',P);if(P?.vol>.05)say('Une voie ferrée est coupée : il faut la reposer.','bad');break;
    case 'tension':audio.play('drums');alertBox(`<b>Frontière.</b> ${esc(e.text)}`,null,null,'warn');break;
    case 'war':audio.play('horn');alertBox(`<b>${esc(e.text)}</b> Les tours, les soldats et les Bèè tirent désormais à vue.`);if(ui.speed>1)setSpeed(1);break;
    case 'rout':audio.play('horn',P);break;
    case 'wave':audio.play('horn',null);alertBox(`<b>Une armée bèè de ${e.n} marche sur nous !</b> <button class="small" data-act="shelter">Aux abris</button>`,e.x,e.y);if(ui.speed>1)setSpeed(1);break;
    case 'air-raid':audio.play('siren',null);alertBox('<b>Bombardier bèè en approche !</b> La DCA, les abris.',e.x,e.y);break;
    case 'downed':audio.play('bomb',P);break;
    case 'won':audio.play('won');$('#win').innerHTML=`<div class="scbox"><b class="big">Gagné !</b><p>${world.s.won.how==='guerre'?'Toutes les villes bèè sont tombées.':'Cent caisses de chaque rare à la capitale.'} Au jour ${world.s.won.day}. Le jeu continue.</p><button class="ghost" data-act="win-off">Continuer</button></div>`;$('#win').hidden=false;break;
    case 'lost':$('#win').innerHTML=`<div class="scbox"><b class="big">La civilisation meumeu est tombée</b><p>Au jour ${world.s.lost.day}, le dernier centre-ville s’est effondré.</p><button class="ghost" data-act="new">Nouvelle partie</button></div>`;$('#win').hidden=false;break;}}
  if(Math.random()<.15){const u=world.s.units.find(u=>u.anim==='action'&&u.f==='meumeu'&&Math.random()<.2);if(u){const P=where(u.x,u.y);if(P.vol>.3)audio.play(u.task?.kind==='gather'||u.task?.kind==='work'?'chop':'hammer',P);}}
  for(const F of world.s.falls)if(F.kind==='bomb'&&F.t<.02){audio.play('whistle',where(F.x1,F.y1));break;}}
function ambience(){const [i0,i1,j0,j1]=view.vis||[0,0,0,0];const inv=(x,y)=>x>=i0&&x<=i1&&y>=j0&&y<=j1;const s=world.s;
  const battle=s.units.filter(u=>u.anim==='aim'&&inv(u.x,u.y)).length;const fire=s.buildings.filter(b=>b.fire>0&&inv(b.i,b.j)).length;audio.ambience({battle,fire,night:world.isNight()});}

function setWorld(w){world=w;view.world=w;view.tiles=null;view.overview=null;view.shadeCv=null;view.sel.clear();view.selB=null;view.selV=null;view.parts=[];view.decals=[];view.streaks=[];view.toppling=[];ui.pick=null;ui.modal=null;for(const c of [...xray.cards])xray.remove(c);const c=w.capital();if(c)view.lookAt(c.i+2,c.j+2);$('#win').hidden=true;renderPanel(true);}

// ---------- la boucle ----------
let last=performance.now(),autosave=0,miniAt=0;
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;
  if(ui.speed>0)world.update(dt*ui.speed/HOUR_REAL);events();
  const sp=900*dt;if(keys.has('arrowleft')||keys.has('q')||keys.has('a'))view.pan(-sp,0);if(keys.has('arrowright')||keys.has('d'))view.pan(sp,0);if(keys.has('arrowup')||keys.has('z')||keys.has('w'))view.pan(0,-sp);if(keys.has('arrowdown')||keys.has('s'))view.pan(0,sp);
  view.draw(dt);xray.step(dt);if(ui.modal?.kind==='fiche'){const f=findUnit(ui.modal.id);if(f)body3d.draw(f.u.h,dt,f.u.f);}if(now-miniAt>250){miniAt=now;view.drawMini(mini);ambience();}
  topbar();renderPanel(false);
  autosave+=dt;if(autosave>60){autosave=0;try{localStorage.setItem('okm-auto',world.save());}catch(e){}}
  requestAnimationFrame(frame);}
$('#xmode').addEventListener('click',()=>{xray.setMode({sel:'ecran',ecran:'off',off:'sel'}[xray.mode]);topbar();});
$('#squads').addEventListener('click',e=>{const b=e.target.closest('[data-squad]');if(b)selectSquad(+b.dataset.squad,e.detail>=2);});
await loadManifest();
{const j=localStorage.getItem('okm-auto');const P=new URLSearchParams(location.search);if(P.has('demo')){const w=new World();setupDemo(w);world=w;view.world=w;}else if(j&&!P.has('new')){try{const w=new World(1);w.load(j);world=w;view.world=w;}catch(e){console.warn('sauvegarde ancienne ignorée',e.message);}}
  const c=world.capital();if(c)view.lookAt(c.i+2,c.j+2);if(P.get('speed'))setSpeed(+P.get('speed'));if(P.get('at')){const [x,y,z]=P.get('at').split(',').map(Number);view.lookAt(x,y);if(z)view.zoom=z;}}
setSpeed(ui.speed);renderPanel(true);requestAnimationFrame(frame);
window.world=()=>world;window.view=view;window.ui=ui;window.audio=audio;window.xray=xray;window.designer=designer;window.room=room;window.openModal=openModal;window.openFiche=id=>openFiche(id);
window.__step=(n=1,dt=1/30)=>{for(let i=0;i<n;i++){if(ui.speed>0)world.update(dt*ui.speed/HOUR_REAL);events();view.draw(dt);xray.step(dt);if(ui.modal?.kind==='fiche'){const f=findUnit(ui.modal.id);if(f)body3d.draw(f.u.h,dt,f.u.f);}}view.drawMini(mini);renderPanel(true);topbar();};
