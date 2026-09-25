// Le bureau d'études : on dessine une arme, la physique répond. Rien n'est une note arbitraire — la vitesse sort de la poudre et
// du canon, la portée de la traînée et de la dispersion, la blessure du bloc de gélatine calculé pas à pas. Chaque avantage a son
// prix : une balle plus lourde porte plus loin et perce mieux, mais le soldat en porte moins et le recul monte ; plus de poudre,
// c'est plus vite, mais la pression use le tube et l'étui grossit l'arme ; l'automatique arrose, et vide les dépôts.
// Tout se voit en direct : le plateau (l'arme à l'échelle, ses servants), la trajectoire au ralenti, la précision à chaque
// distance, la perforation, le bloc de gélatine ; et chaque réglage s'explique, avec ses chiffres, dans « Ce que ça change ».
import {derive,gel,wound,NOSES,BASES,CONSTRUCTIONS,ACTIONS,MODS,MOUNTS,HUMAN,fmt} from './ballistics.js';
import {setSpecies,regionAt,PART} from './body.js';
import {MATS,deriveArmor,armorHit,plateZone} from './armor.js';
import {ShotView} from './xray.js';
// les cibles du tir d'essai : un Bèè nu, ou protégé
const TARGETS={nue:{name:'Sans protection',a:null},toile:{name:'Gilet de toile',a:{casque:['acier',0],plastron:['toile',5],dos:['toile',5],flancs:['toile',3]}},
  soie:{name:'Gilet de soie',a:{casque:['acier',.8],plastron:['soie',4],dos:['soie',4],flancs:['soie',3]}},acier:{name:'Plastron d’acier',a:{casque:['acier',1],plastron:['acier',1.2],dos:['acier',0],flancs:['acier',0]}},
  composite:{name:'Composite',a:{casque:['acier',1],plastron:['composite',2],dos:['composite',2],flancs:['soie',3]}}};
import {LIMITS,crateCost,weaponCost,protoCost,PROTO_HOURS} from './designs.js';
import {rng} from './gen.js';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const C_LO=Math.log(LIMITS.c[0]),C_HI=Math.log(LIMITS.c[1]);
const cToS=c=>Math.round((Math.log(c)-C_LO)/(C_HI-C_LO)*1000),sToC=s=>+Math.exp(C_LO+(C_HI-C_LO)*s/1000).toFixed(4);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
const mg=g=>g<1?`${fmt(g*1000,0)} mg`:`${fmt(g,g<10?2:1)} g`;
const cm=m=>Math.abs(m)<.1?`${fmt(m*100,1)} cm`:`${fmt(m*100,0)} cm`;

// Les munitions, par famille : ce qui sert à quoi
const FAMS=[['Ordinaires',['fmj','fmjm','plombnu','duplex','trc']],['Expansives',['sp','hp','monolithique','frangible','slug']],
  ['Perforantes',['ap','apt','tungstene','sabot','apfsds']],['Incendiaires, explosives',['inc','api','he','hei','saphei','creuse']],['Gerbes',['chevrotine','flechette']]];
// La couleur de pointe (le code des arsenaux) : on reconnaît la munition à l'œil
const TIPC={ap:'#15181b',apt:'#15181b',apv:'#6a4bc4',tungstene:'#9aa4ad',inc:'#2d6fd6',api:'#2d6fd6',trc:'#d23a2e',he:'#f0c419',hei:'#e0801f',saphei:'#e0801f',creuse:'#f0c419',sp:'#8d9196',frangible:'#58a55c',apfsds:'#15181b',sabot:'#15181b'};

// ---------- ce que change chaque réglage : le mécanisme, et les chiffres de cette arme ----------
const HELP={
  d:(D,p)=>`<b>Le calibre</b> : le diamètre de la balle. Plus large, elle est plus lourde à longueur égale (ici ${mg(D.m)}), creuse une cavité plus grande et casse plus d’os ; mais sa section freine dans l’air (coefficient balistique ${fmt(D.BC,0)}) et, à masse égale, elle perce moins. Au-delà de 6 mm l’épaule ne suffit plus, au-delà de 8,5 mm il faut un trépied. À l’échelle humaine : ${fmt(p.d*HUMAN,1)} mm.`,
  l:(D,p)=>`<b>La longueur</b> de la balle : plus longue, plus lourde (${mg(D.m)}) et plus effilée — elle garde sa vitesse et perce mieux. Mais elle doit être tenue par la rayure : stabilité Sg ${fmt(D.Sg,2)} (${D.Sg<1?'<b class="bad">elle bascule en vol</b>':D.Sg<1.3?'juste':D.Sg>3?'surstabilisée : elle file droit, mais bascule tard dans le corps':'bonne'}). Dans le corps, une balle longue bascule plus tôt (après ${NOSES[p.nose].neck} longueurs pour ce nez).`,
  nose:(D,p)=>`<b>Le nez</b> : sa forme dans l’air et dans la chair. ${esc(NOSES[p.nose].desc)}. Pointue : faible traînée (facteur ${NOSES.pointue.i}), bascule tôt dans le corps. Plate : freine vite (facteur ${NOSES.plate.i}) mais coupe net et ne bascule jamais.`,
  base:(D,p)=>`<b>Le culot</b> : ${p.base==='bt'?'en dépouille (conique), il réduit la traînée d’environ 10 % : la balle garde sa vitesse plus loin, la trajectoire est plus tendue':'plat : plus de volume donc un peu plus lourd, mais plus de traînée en vol'}. Dans le corps, un culot en dépouille aide la balle à basculer un peu plus tôt.`,
  cons:(D,p)=>{const C=CONSTRUCTIONS[p.cons];return `<b>${esc(C.name)}</b> : ${esc(C.desc)}.${C.frag<Infinity&&C.frag>0?` Elle se brise au-dessus de ${C.frag} m/s (elle part à ${Math.round(D.v0)} m/s).`:''}${C.expand?` Elle s’ouvre entre ${C.expand[0]} et ${C.expand[1]} m/s, jusqu’à ${fmt(C.expand[2],2)} fois son diamètre.`:''}${C.minD?` Il faut ${C.minD} mm de calibre au moins.`:''}${D.he?` <b>Charge explosive : ${mg(D.he.g)}</b>.`:' Pas de charge explosive.'}`;},
  c:(D,p)=>`<b>La poudre</b> : ${mg(p.c)}. C’est l’énergie : ${Math.round(D.v0)} m/s au départ, ${fmt(D.E0,1)} J. Plus de poudre, c’est plus vite, mais la pression monte (${Math.round(D.P)} MPa ; au-delà de 460 le tube s’use vite, au-delà de 620 il peut éclater), l’étui grossit (${fmt(D.caseLen,1)} mm), le recul aussi (${fmt(D.recoil,2)} J). Un canon trop court ne brûle pas tout : ici ${Math.round(D.eta/.32*100)} % du possible.`,
  L:(D,p)=>`<b>Le canon</b> : ${p.L} mm. Plus long, la poudre pousse la balle plus longtemps (${Math.round(D.eta/.32*100)} % de l’énergie possible), moins d’éclair à la bouche, meilleure précision ; mais l’arme s’alourdit (${Math.round(D.mass*1000)} g), s’allonge, épaule plus lentement (${fmt(D.aim,2)} s pour viser). À l’échelle humaine : ${fmt(p.L*HUMAN/10,0)} cm.`,
  twist:(D,p)=>`<b>Le pas de rayure</b> : la balle fait un tour tous les ${p.twist} mm. Plus court, elle tourne plus vite : Sg ${fmt(D.Sg,2)}. Sous 1, elle bascule en vol ; entre 1,3 et 2,5, c’est l’idéal ; au-delà de 3 elle est surstabilisée — précise, mais elle reste droite plus longtemps dans le corps (blessure plus fine), et s’use plus vite dans le tube.`,
  heavy:(D,p)=>`<b>Canon lourd</b> : un tube plus épais, ${p.heavy?'monté':'non monté'}. Il chauffe moins vite (tient ${D.sustain} coups/min en continu), vibre moins (dispersion −15 %), dure plus longtemps ; mais il pèse bien plus lourd.`,
  action:(D,p)=>`<b>La culasse</b> : ${esc(ACTIONS[p.action].desc)}. ${p.action==='verrou'?'Le tireur manœuvre à la main : précis, fiable, lent':p.action==='semi'?'Les gaz réarment : un coup par pression':'Les gaz réarment en boucle : des rafales, de la suppression — mais la chaleur, le recul qui disperse, et les caisses qui fondent'}. Cadence : ${D.rpm} coups/min.`,
  rof:(D,p)=>`<b>La cadence</b> en automatique : ${p.rof} coups/min. Plus haute, plus de balles dans la zone (l’ennemi se couche), mais le tube chauffe (il tient ${D.sustain} coups/min en continu) et un chargeur de ${p.mag} dure ${fmt(p.mag/p.rof*60,1)} s.`,
  mag:(D,p)=>`<b>Le chargeur</b> : ${p.mag} coups. ${ACTIONS[p.action]?.auto&&p.mag>=50?'À partir de 50 en automatique, c’est une bande : il faut un chargeur à côté du tireur. ':''}Plus grand, moins de rechargements ; mais plus lourd (${Math.round(p.mag*D.rm)} g plein).`,
  zero:(D,p)=>`<b>La hausse</b> : on règle la visée pour toucher juste à ${p.zero||50} m. La balle monte au-dessus de la ligne de visée, la croise à ${p.zero||50} m, puis retombe : ${[25,50,100,200].filter(r=>r<=600&&!D.at(r).beyond).map(r=>`${r} m : ${D.los(r)>=0?'+':''}${cm(D.los(r))}`).join(' · ')}. Un Meumeu fait 20 cm de haut : au-delà de ±10 cm, on le rate sans corriger.`,
  wallx:(D,p)=>`<b>L’épaisseur du tube</b> : ×${fmt(D.wallx,2)}. Un tube épais vibre moins (dispersion ${fmt(D.moa,1)} MOA), chauffe moins vite (tient ${D.sustain} coups/min), dure plus (${D.life} coups) ; il pèse (arme ${Math.round(D.mass*1000)} g). Mince : léger, mais il se tord à la chaleur et disperse.`,
  jacket:(D,p)=>`<b>La chemise</b> : l’enveloppe de cuivre autour du noyau, ×${fmt(D.jacket,1)}. Épaisse, la balle reste entière plus longtemps : elle se brise au-dessus de ${Math.round((CONSTRUCTIONS[p.cons].frag||0)*Math.sqrt(D.jacket))||'—'} m/s et s’ouvre plus tard. Mince : elle éclate vite dans le corps (grosse blessure, perce peu).`,
  core:(D,p)=>`<b>Le noyau d’acier</b> : ${Math.round((D.core||0)*100)} % du plomb remplacé par de l’acier trempé. Plus dur, il perce mieux (${fmt(D.pen(D.at(30).v),2)} mm à 30 m), mais la balle est plus légère et coûte du fer.`,
  hef:(D,p)=>D.he?`<b>La charge explosive</b> : ${Math.round(D.hef*100)} % du volume de la balle, soit ${D.he.g<1?Math.round(D.he.g*1000)+' mg':fmt(D.he.g,2)+' g'}. Le souffle tue à ${cm(D.he.blast)} ; la coque (${mg(D.he.casing)}) éclate en ${D.he.n} éclats lancés à ${Math.round(D.he.vg)} m/s, mortels à ${cm(D.he.lethal)}. Plus d’explosif : plus de souffle, des éclats plus rapides — mais moins nombreux, et une balle plus légère qui perce moins.`:'<b>La charge explosive</b> : seulement pour les munitions explosives (explosive, explosive-incendiaire, semi-perforante, charge creuse).',
  mods:(D,p)=>`<b>Les modules</b> : chacun a son prix en poids et en fabrication. Montés ici : ${D.mods.length?D.mods.map(k=>`${MODS[k].name.toLowerCase()} (${Math.round(D.modKg[k]*1000)} g)`).join(', '):'aucun'}.`,
  ...Object.fromEntries(Object.entries(MODS).map(([k,M])=>[`mod-${k}`,(D,p)=>`<b>${esc(M.name)}</b> : ${esc(M.desc)}.${D.modKg[k]!=null?` Ici : ${Math.round(D.modKg[k]*1000)} g.`:''}`])),
};

export class Designer{
  constructor(host,{world,bureau,propose,ico,goodName,toArmor}){this.host=host;this.world=world;this.bureau=bureau;this.propose=propose;this.ico=ico;this.goodName=goodName;this.toArmor=toArmor;this.gelR=20;this.help='cons';this.anim=null;this.target='nue';this.shotKey='';
    host.addEventListener('input',e=>{if(e.target.closest('#designer'))this.read(e.target);});
    host.addEventListener('change',e=>{if(e.target.id==='dz-from'){this.load(e.target.value);}else if(e.target.closest('#designer')&&e.target.type==='range')this.fire();});
    host.addEventListener('pointerover',e=>{const h=e.target.closest('[data-help]');if(h&&h.dataset.help!==this.help){this.help=h.dataset.help;this.renderHelp();}});
    host.addEventListener('focusin',e=>{const h=e.target.closest('[data-help]');if(h){this.help=h.dataset.help;this.renderHelp();}});
    host.addEventListener('click',e=>{const b=e.target.closest('[data-dz]');if(!b)return;const [k,v]=b.dataset.dz.split(':');
      if(k==='close')this.close();else if(k==='armor'){this.toArmor?.();}else if(k==='gel'){this.gelR=+v;this.render();}else if(k==='tgt'){this.target=v;this.render();}else if(k==='shotmode'){if(this.shot)this.shot.mode=v;this.sync();}else if(k==='fire')this.fire();
      else if(k==='go'){const r=this.propose(this.p,this.name);this.say(r.ok?r.text:r.why.join(' · '),r.ok?'good':'bad');if(r.ok)this.close();}
      else if(k==='mod'){const m=new Set(this.p.mods||[]);if(m.has(v))m.delete(v);else{m.add(v);if(v==='bipied')m.delete('trepied');if(v==='trepied')m.delete('bipied');}this.p.mods=[...m];this.help='mod-'+v;this.sync();this.render();this.fire();}
      else if(['nose','base','action','cons'].includes(k)){this.p[k]=v;this.help=k;this.sync();this.render();this.fire();}});
    addEventListener('resize',()=>{if(this.open)this.render();});}
  get open(){return !this.host.hidden;}
  show(fromId='mle1'){this.host.hidden=false;this.load(fromId);let last=performance.now();const loop=now=>{if(!this.open)return;const dt=Math.min(.1,(now-last)/1000);last=now;try{this.shot?.step(dt);}catch(e){console.error(e);}requestAnimationFrame(loop);};requestAnimationFrame(loop);}
  close(){this.host.hidden=true;this.anim=null;this.shot?.dispose();this.shot=null;this.shotKey='';}
  load(id){const d=this.world().design(id)||this.world().design('mle1');this.ref=d;this.p=JSON.parse(JSON.stringify(d.p));this.p.mods??=[];this.p.zero??=50;
    this.name=d.base?`${d.name.replace(/Mle \d+/,'')}Modèle ${Object.keys(this.world().s.designs).length}`.trim():`${d.name} (variante)`;this.build();this.render();this.fire();}
  say(t,tone){const el=this.host.querySelector('.dz-say');if(el){el.textContent=t;el.className='dz-say '+tone;}}
  // la page, une fois ; ensuite on ne change que les chiffres et les dessins
  build(){const p=this.p;const W=this.world();const ds=Object.values(W.s.designs).filter(d=>d.status!=='perdu');
    const seg=(k,opts)=>`<div class="seg" data-help="${k}">${Object.entries(opts).map(([v,o])=>`<button data-dz="${k}:${v}" class="${p[k]===v?'on':''}" title="${esc(o.desc||'')}">${esc(o.name)}</button>`).join('')}</div>`;
    const range=(id,label,min,max,step,val,hint)=>`<label class="dz-r" data-help="${id}"><span>${label}<em id="dz-v-${id}"></em></span><input type="range" id="dz-${id}" min="${min}" max="${max}" step="${step}" value="${val}"><small>${hint}</small></label>`;
    this.host.innerHTML=`<div class="dz" id="designer" role="dialog" aria-label="Bureau d’études">
      <header class="dz-head"><div><b>Bureau d’études</b><small>une arme, de la poudre à la plaie — pour des Meumeu de 30 cm</small></div>
        <div class="seg"><button class="on">Armes</button><button data-dz="armor">Protections</button></div>
        <label class="dz-name">Nom <input id="dz-name" value="${esc(this.name)}" maxlength="28"></label>
        <label class="dz-name">Partir de <select id="dz-from">${ds.map(d=>`<option value="${d.id}" ${d.id===this.ref.id?'selected':''}>${esc(d.name)}${d.f==='beee'?' (bèè)':''}${d.status==='prototype'?' — prototype':''}</option>`).join('')}</select></label>
        <button class="ghost" data-dz="close">Fermer</button></header>
      <div class="dz-body">
        <section class="dz-col dz-ctl">
          <details open><summary>La balle</summary>
            ${range('d','Calibre',LIMITS.d[0],LIMITS.d[1],LIMITS.d[2],p.d,'large : plus lourde, grosse blessure ; freine plus, perce moins à masse égale')}
            ${range('l','Longueur',LIMITS.l[0],LIMITS.l[1],LIMITS.l[2],p.l,'longue : plus lourde, file mieux ; demande plus de rayure')}
            ${range('jacket','Chemise',LIMITS.jacket[0],LIMITS.jacket[1],LIMITS.jacket[2],p.jacket??1,'épaisse : se brise et s’ouvre plus tard ; plus de cuivre')}
            ${range('core','Noyau d’acier',LIMITS.core[0],LIMITS.core[1],LIMITS.core[2],p.core||0,'une part de plomb remplacée par de l’acier : perce mieux, plus légère')}
            ${range('hef','Charge explosive',LIMITS.hef[0],LIMITS.hef[1],LIMITS.hef[2],p.hef??.3,'munitions explosives : plus d’explosif, plus de souffle — moins de coque, moins d’éclats')}
            <div class="dz-f"><span>Nez</span>${seg('nose',NOSES)}</div>
            <div class="dz-f"><span>Culot</span>${seg('base',BASES)}</div>
            <div class="dz-f" data-help="cons"><span>Construction</span>${FAMS.map(([fam,ks])=>`<div class="dz-fam"><small>${fam}</small><div class="seg wrap">${ks.filter(k=>CONSTRUCTIONS[k]).map(v=>`<button data-dz="cons:${v}" class="${p.cons===v?'on':''}" title="${esc(CONSTRUCTIONS[v].desc)}"><i class="tip" style="background:${TIPC[v]||'#c07a3e'}"></i>${esc(CONSTRUCTIONS[v].name)}</button>`).join('')}</div></div>`).join('')}</div>
          </details>
          <details open><summary>La charge et le canon</summary>
            ${range('c','Poudre',0,1000,1,cToS(p.c),'plus : plus vite — plus de pression, un étui et un recul plus gros')}
            ${range('L','Canon',LIMITS.L[0],LIMITS.L[1],LIMITS.L[2],p.L,'long : brûle toute la poudre, plus précis ; plus lourd')}
            ${range('twist','Pas de rayure',LIMITS.twist[0],LIMITS.twist[1],LIMITS.twist[2],p.twist,'court : tient les balles longues ; trop long, elles basculent')}
            ${range('wallx','Épaisseur du tube',LIMITS.wallx[0],LIMITS.wallx[1],LIMITS.wallx[2],p.wallx??(p.heavy?1.5:1),'épais : plus précis, tient la chaleur, dure ; bien plus lourd')}
          </details>
          <details open><summary>L’arme</summary>
            <div class="dz-f"><span>Culasse</span>${seg('action',ACTIONS)}</div>
            ${range('rof','Cadence (automatique)',LIMITS.rof[0],LIMITS.rof[1],LIMITS.rof[2],p.rof,'plus : plus de suppression, plus de chaleur')}
            ${range('mag','Chargeur',LIMITS.mag[0],LIMITS.mag[1],LIMITS.mag[2],p.mag,'grand : moins de rechargements ; plus lourd ; 50 et plus en auto : une bande')}
            ${range('zero','Hausse',LIMITS.zero[0],LIMITS.zero[1],LIMITS.zero[2],p.zero,'la distance où la balle croise la ligne de visée')}
          </details>
          <details open><summary>Modules</summary><div class="dz-mods" data-help="mods">${Object.entries(MODS).map(([k,M])=>`<button class="chip" data-dz="mod:${k}" data-help="mod-${k}" title="${esc(M.desc)}">${esc(M.name)}</button>`).join('')}</div></details>
        </section>
        <section class="dz-col dz-mid">
          <div class="dz-big" id="dz-big"></div>
          <h3>Le plateau <small>l’arme à l’échelle, ses servants — des Meumeu de 30 cm</small><button class="small" data-dz="fire">Tirer ▸</button></h3>
          <canvas id="dz-plan" class="dz-cv" style="height:300px"></canvas>
          <h3>La trajectoire <small>au-dessus et au-dessous de la ligne de visée, au ralenti</small></h3>
          <canvas id="dz-traj" class="dz-cv" style="height:200px"></canvas>
          <h3>Portée et précision <small>où tombent les balles sur un Meumeu debout (7 × 20 cm), à chaque distance</small></h3>
          <canvas id="dz-prec" class="dz-cv" style="height:190px"></canvas>
          <h3>Perforation <small>millimètres d’acier traversés, selon la distance</small></h3>
          <canvas id="dz-pen" class="dz-cv" style="height:170px"></canvas>
          <h3>Dans le corps <small>bloc de gélatine de 16 cm, comme un Meumeu</small><span class="seg sm">${[5,20,50,100].map(r=>`<button data-dz="gel:${r}" class="${r===this.gelR?'on':''}">${r} m</button>`).join('')}</span></h3>
          <canvas id="dz-gel" class="dz-cv" style="height:210px"></canvas><p class="dz-gelt" id="dz-gelt"></p>
          <h3>Sur un Bèè, en 3D <small>le tir d’essai au ralenti, à la distance choisie ci-dessus</small><span class="seg sm">${Object.entries(TARGETS).map(([k,T])=>`<button data-dz="tgt:${k}" class="${k===this.target?'on':''}">${T.name}</button>`).join('')}</span></h3>
          <div class="dz-shotwrap"><canvas id="dz-shot" class="dz-cv dz-shot"></canvas><span class="seg sm dz-shotmode">${[['xray','Radiographie'],['anat','Anatomie'],['peluche','Peluche']].map(([k,n])=>`<button data-dz="shotmode:${k}">${n}</button>`).join('')}</span></div><p class="dz-gelt" id="dz-shott"></p>
        </section>
        <section class="dz-col dz-side">
          <div class="dz-help" id="dz-help"></div>
          <h3>Affût et servants</h3><div id="dz-crew" class="dz-crew"></div>
          <h3>Signature</h3><div id="dz-sig" class="dz-tab"></div>
          <div id="dz-he"></div>
          <h3>Les chiffres <small>face à ${esc(this.ref.name)}</small></h3><div id="dz-tab" class="dz-tab"></div>
          <h3>Le verdict</h3><ul id="dz-ver" class="dz-ver"></ul>
          <h3>Ce que ça coûte</h3><div id="dz-cost" class="dz-cost"></div>
          <div class="dz-go"><button data-dz="go" id="dz-go">Lancer le prototype</button><p class="dz-say quiet small"></p></div>
        </section></div></div>`;
    this.sync();}
  read(el){const id=el.id.replace('dz-','');if(id==='name'){this.name=el.value;return;}if(id==='heavy'){this.p.heavy=el.checked;this.help='heavy';}else if(id==='c'){this.p.c=sToC(+el.value);this.help='c';}else if(id in LIMITS||id in this.p){this.p[id]=+el.value;this.help=id;}else return;this.sync();this.render();}
  sync(){const p=this.p;const $=id=>this.host.querySelector('#dz-v-'+id);const set=(id,t)=>{const e=$(id);if(e)e.textContent=t;};
    set('d',` ${fmt(p.d,1)} mm`);set('l',` ${fmt(p.l,1)} mm`);set('c',` ${mg(p.c)}`);set('L',` ${p.L} mm`);set('twist',` 1 tour / ${p.twist} mm`);set('rof',ACTIONS[p.action]?.auto?` ${p.rof} coups/min`:' — (automatique seulement)');set('mag',` ${p.mag} coups`);set('zero',` ${p.zero} m`);set('wallx',` ×${fmt(p.wallx??(p.heavy?1.5:1),2)}`);set('jacket',` ×${fmt(p.jacket??1,1)}`);set('core',` ${Math.round((p.core||0)*100)} %`);set('hef',CONSTRUCTIONS[p.cons].he?` ${Math.round((p.hef??.3)*100)} % du volume`:' — (munitions explosives)');
    const C0=CONSTRUCTIONS[p.cons];for(const [id,off] of [['hef',!C0.he],['core',!!(C0.core||C0.he||C0.pellets)]]){const e=this.host.querySelector('#dz-'+id);if(e)e.disabled=off;}
    const rof=this.host.querySelector('#dz-rof');if(rof)rof.disabled=p.action!=='auto';const ms=new Set(p.mods||[]);
    for(const b of this.host.querySelectorAll('[data-dz]')){const [k,v]=b.dataset.dz.split(':');if(['nose','base','action','cons'].includes(k))b.classList.toggle('on',p[k]===v);if(k==='gel')b.classList.toggle('on',+v===this.gelR);if(k==='tgt')b.classList.toggle('on',v===this.target);if(k==='shotmode')b.classList.toggle('on',v===(this.shot?.mode||'xray'));if(k==='mod')b.classList.toggle('on',ms.has(v));}}
  renderHelp(){const el=this.host.querySelector('#dz-help');if(!el||!this.D)return;const f=HELP[this.help]||HELP.cons;el.innerHTML=`<h3>Ce que ça change</h3><p>${f(this.D,this.p)}</p>`;}
  render(){const D=derive(this.p),R=derive(this.ref.p);this.D=D;const W=this.world();const $=id=>this.host.querySelector('#'+id);if(!$('dz-big'))return;const p=this.p;
    const pen=D.pen(D.at(30).v),penR=R.pen(R.at(30).v);
    $('dz-big').innerHTML=[['Vitesse',`${Math.round(D.v0)}`,'m/s'],['Énergie',fmt(D.E0,D.E0<10?1:0),'J'],['Portée utile',`${D.eff}`,'m'],['Perce à 30 m',fmt(pen,pen<10?2:0),'mm']].map(([k,v,u])=>`<div><small>${k}</small><b>${v}<i>${u}</i></b></div>`).join('')+
      `<div class="dz-cal"><small>Cartouche</small><b>${esc(D.name)}</b><i>≈ ${fmt(p.d*HUMAN,1)} mm humain</i></div>`;
    this.renderHelp();
    // l'affût et les servants
    const need=MOUNTS[D.need],have=MOUNTS[D.have];
    $('dz-crew').innerHTML=`<div class="kv"><span>Il faut</span><b>${need.name}</b></div><div class="kv"><span>Monté</span><b class="${D.mountOk?'good':'bad'}">${have.name}${D.mountOk?'':' — insuffisant'}</b></div>
      <div class="dz-roles">${D.roles.map(r=>`<span class="chip on">${r}</span>`).join('')}</div>
      <p class="small">${D.crew} servant${D.crew>1?'s':''}${D.setup?` · mise en batterie ${fmt(D.setup,1)} s`:''}${D.fixed?' · <b class="bad">trop lourde pour être portée : une pièce fixe, qui ne suit pas l’escouade</b>':''}. ${D.crew>1?`Ce que l’arme demande en munitions pour tenir : ${fmt(D.supply*1000,0)} g — un pourvoyeur les porte.`:''}</p>
      ${D.mountOk?'':`<p class="small bad">L’épaule refuse : recul ${fmt(D.rk0,2)} J/kg, arme de ${Math.round(D.mass*1000)} g, calibre ${fmt(p.d,1)} mm. Ajoutez ${D.need==='trepied'?'un trépied':'un bipied'} dans les modules.</p>`}`;
    $('dz-sig').innerHTML=`<div class="kv"><span>Éclair de bouche</span><b>${D.flash<.15?'presque nul':D.flash<.4?'faible':D.flash<.7?'visible':'aveuglant'}</b></div><div class="kv"><span>Bruit</span><b>${D.dB} dB${D.dB<135?' — discret':''}</b></div><div class="kv"><span>Claquement</span><b>${D.crack?'oui : supersonique':'non : subsonique'}</b></div>`;
    $('dz-he').innerHTML=D.he?`<h3>Charge explosive</h3><div class="dz-tab"><div class="kv"><span>Explosif</span><b>${mg(D.he.g)}</b></div>${D.he.shaped?`<div class="kv"><span>Jet de cuivre</span><b>perce ${fmt(D.pen(0),0)} mm d’acier, à toute distance</b></div>`:`<div class="kv"><span>Éclats</span><b>${D.he.n}</b></div>`}<div class="kv"><span>Souffle mortel</span><b>${cm(D.he.blast)}</b></div>${D.he.shaped?'':`<div class="kv"><span>Éclats mortels</span><b>${cm(D.he.lethal)}</b></div><div class="kv"><span>Éclats dangereux</span><b>${cm(D.he.danger)}</b></div>`}</div>`:'';
    const row=(k,v,rv,u,dec=0,better=1)=>{const d=v-rv;const tone=Math.abs(d)<Math.abs(rv)*.02+1e-9?'':((d>0)===(better>0)?'good':'bad');return `<div class="kv"><span>${k}</span><b>${fmt(v,dec)} ${u}${better&&tone?` <em class="${tone}">${d>0?'+':''}${fmt(d,dec)}</em>`:''}</b></div>`;};
    $('dz-tab').innerHTML=row('Balle',D.m*1000,R.m*1000,'mg',0,0)+row('Cartouche entière',D.rm,R.rm,'g',2,-1)+row('Pression',D.P,R.P,'MPa',0,-1)+row('Stabilité (Sg)',D.Sg,R.Sg,'',2,0)+row('Coefficient balistique',D.BC,R.BC,'kg/m²',0,1)+
      row('Dispersion de l’arme',D.moa,R.moa,'MOA',1,-1)+row('Arme chargée',D.mass*1000,R.mass*1000,'g',0,-1)+row('Recul ressenti',D.rk*SHOOTER,R.rk*SHOOTER,'J',2,-1)+row('Temps pour viser',D.aim,R.aim,'s',2,-1)+
      row('Cadence',D.rpm,R.rpm,'coups/min',0,1)+row('Vie du canon',D.life,R.life,'coups',0,1)+row('Portés par soldat',D.carry,R.carry,'coups',0,1)+row('Par caisse',D.perCrate,R.perCrate,'coups',0,1);
    $('dz-ver').innerHTML=D.verdicts.map(v=>`<li class="${v.tone}">${v.tone==='good'?'＋':v.tone==='bad'?'－':'·'} ${esc(v.t)}</li>`).join('')+(D.mountOk?'':`<li class="bad">－ L’épaule ne tient pas cette arme : ${D.need==='trepied'?'trépied':'bipied'} obligatoire</li>`);
    const cc=crateCost(p),wc=weaponCost(p),pc=protoCost(p);const costs=o=>Object.entries(o).map(([k,n])=>`<span class="cost">${this.ico(k)}${fmt(n,n<1?2:1)}</span>`).join(' ');
    $('dz-cost').innerHTML=`<div class="kv"><span>Une caisse (${D.perCrate} coups)</span><b>${costs(cc)}</b></div><div class="kv"><span>Une arme</span><b>${costs(wc)} · ${fmt(D.hoursW/2,1)} h</b></div><div class="kv"><span>Le prototype</span><b>${costs(pc)} · ${PROTO_HOURS} h</b></div>
      <p class="quiet small">Adopté, il faut encore l’outillage de la manufacture (4 pièces, 1 fer, 6 h) — et le perdre si elle tombe.</p>`;
    const bur=this.bureau();const can=bur?W.canPropose(bur,p):{ok:false,why:['un bureau d’études bâti (choisissez-le, puis « Concevoir »)']};const go=$('dz-go');go.disabled=!can.ok;go.title=can.ok?'':can.why.join(', ');
    if(!can.ok)this.say(`Il faut : ${can.why.join(' · ')}`,'warn');else this.say(`Prêt : ${PROTO_HOURS} h au bureau d’études, puis adopté.`,'');
    this.draw(0);this.drawPrec(D);this.drawPen(D,R);this.drawGel(D);this.shoot(D);}
  // ---------- le tir d'essai : la balle (ou la gerbe) entre dans un Bèè, à travers sa protection s'il en a une ----------
  shoot(D){const cv=this.host.querySelector('#dz-shot');if(!cv)return;const key=JSON.stringify([this.p,this.gelR,this.target]);if(key===this.shotKey)return;this.shotKey=key;
    if(!this.shot||this.shot.cv!==cv){this.shot?.dispose();this.shot=new ShotView(cv);}
    setSpecies('beee');const p=this.p,C=CONSTRUCTIONS[p.cons];const v0=D.at(this.gelR).v;const r=rng(5);const n=Math.min(D.pel||1,6);const T=TARGETS[this.target];const A=T.a?deriveArmor(T.a):null;const evs=[];const notes=[];
    const spread=D.pel>1?Math.min(.05,(C.spread||20)/1000*this.gelR/2):0;
    for(let k=0;k<n;k++){let v=v0;const x=(r()-.5)*.03+(spread?(r()-.5)*2*spread:0),y=.15+(r()-.5)*.05+(spread?(r()-.5)*spread:0);const dir=[(r()-.5)*.03,(r()-.5)*.03,-1];const L=Math.hypot(...dir);const d=dir.map(q=>q/L);
      let q=[x,y,.2];for(let i=0;i<500&&!regionAt(q);i++)q=q.map((c,j)=>c+d[j]*.0008);if(!regionAt(q)){notes.push('à côté');continue;}
      let yaw0=0,plate=null;const zone=A?plateZone(q):null;
      if(A&&zone&&A.zones[zone]?.t>0){const W=D.proj||D;const res=armorHit(A,zone,{},W,v,D.pen(v),r);
        if(res?.stopped){const back=q.map((c,j)=>c-d[j]*.04);const dd=D.proj?.p?.d||p.d;const m=(D.proj||D).m;evs.push({victim:'essai',vf:'beee',len:D.l/1000,cons:p.cons,armor:T.a,zone,mat:res.mat,armorName:T.name,blunt:res.blunt,
          rec:{path:[{p:back,v,yaw:0,d:dd},{p:q.slice(),v:v*.4,yaw:0,d:dd*1.6},{p:q.slice(),v:0,yaw:0,d:dd*1.8}],vIn:v,E0:.5*m/1000*v*v,E:0,dmg:{},tc:[],frags:[],entry:q.slice(),exit:null,lodged:true,stopped:true}});notes.push(`arrêtée par le ${zone} (${MATS[res.mat].name.toLowerCase()})`);continue;}
        if(res){v=res.v;yaw0=.5+r()*.8;plate=zone;notes.push(`traverse le ${zone} (${MATS[A.zones[zone].mat].name.toLowerCase()}) : ${Math.round(v0)} → ${Math.round(v)} m/s`);}}
      const rec=wound(D.proj||D,v,q,d,r,yaw0);evs.push({victim:'essai',vf:'beee',len:D.l/1000,cons:p.cons,armor:T.a,plate,rec});
      const hit=Object.entries(rec.dmg).filter(([id,x])=>PART[id]&&(x.crush>1e-4||x.cut>.2||x.frac||x.stretch>.1)).map(([id,x])=>`${PART[id].name}${x.cut>.2&&/artère|veine|aorte/.test(PART[id].name)?' (ouverte)':x.frac?' (fracture)':x.stretch>.1&&x.crush<1e-4?' (déchiré par la cavité)':''}`);
      notes.push(`${n>1?`${D.pel>1?(C.dart?'dard':'plomb'):'balle'} ${k+1} : `:''}${fmt(rec.E,1)} J cédés${rec.exit?`, ressort à ${Math.round(rec.vOut)} m/s`:', logée'}${rec.fragmented?(C.he?', éclate':', se fragmente'):''}${hit.length?' — '+hit.slice(0,5).join(', '):''}`);}
    this.shot.set(evs);const t=this.host.querySelector('#dz-shott');if(t)t.innerHTML=`À ${this.gelR} m, contre un Bèè ${T.a?'('+T.name.toLowerCase()+')':'sans protection'} : ${notes.map(esc).join(' · ')||'rien'}.`;}
  // ---------- l'animation du tir : l'éclair, le recul, puis la balle au ralenti le long de sa trajectoire ----------
  fire(){this.anim={t0:performance.now()};const loop=()=>{if(!this.anim||!this.open)return;const t=(performance.now()-this.anim.t0)/1000;this.draw(t);if(t<3.2)requestAnimationFrame(loop);else{this.anim=null;this.draw(0);}};requestAnimationFrame(loop);}
  draw(t){if(!this.D)return;this.drawPlan(this.D,t);this.drawTraj(this.D,t);}
  fit(id){const cv=this.host.querySelector('#'+id);if(!cv)return null;const dpr=devicePixelRatio||1;const w=cv.clientWidth||860,h=cv.clientHeight||200;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
    const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);return [x,w,h];}

  // ---------- le plateau ----------
  drawPlan(D,t){const F=this.fit('dz-plan');if(!F)return;const [x,W,H]=F;const p=D.p;const ms=new Set(D.mods);
    const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1c2a33');bg.addColorStop(.72,'#141d23');bg.addColorStop(1,'#0e1418');x.fillStyle=bg;x.fillRect(0,0,W,H);const sp=x.createRadialGradient(W*.4,H*.6,10,W*.4,H*.6,W*.6);sp.addColorStop(0,'rgba(255,230,190,.10)');sp.addColorStop(1,'rgba(255,230,190,0)');x.fillStyle=sp;x.fillRect(0,0,W,H);
    const ground=H-26;x.fillStyle='rgba(90,70,45,.45)';x.fillRect(0,ground,W,H-ground);x.strokeStyle='rgba(160,130,90,.45)';x.beginPath();x.moveTo(0,ground);x.lineTo(W,ground);x.stroke();
    // les dimensions de l'arme (mm)
    const d=p.d,Dc=d*(D.pistol?1.25:1.45),COL=D.COL,wall=d*(.35+.00075*D.P)*D.wallx,Dout=d+2*wall;const crewGun=D.have==='trepied';
    const act=COL*2.4+8,stock=crewGun?COL*1.1+14:Math.max(55,60+COL*1.6),dev=ms.has('manchon')?d*14:ms.has('frein')?d*3.2:ms.has('cacheflamme')?d*4:0;const Lw=stock+act+p.L+dev;
    // la place des servants derrière l'arme : le tireur, puis les pourvoyeurs qui attendent avec leurs caisses
    const bearers=D.roles.filter(r=>r!=='tireur'&&r!=='chargeur').length;const behind=D.have==='epaule'?.075:D.have==='bipied'?.18:.075;const crewMm=(behind+bearers*.13)*1000+40;
    const s=Math.min(.9,(W-40)/(Lw+crewMm),(H-50)/330);const u=v=>v*1000*s;          // s : px par mm ; u : m → px
    const recoil=t>0&&t<.35?Math.sin(Math.min(1,t/.35)*Math.PI)*Math.min(26,4+D.rk*40)*(1-Math.min(1,t/.35)):0;
    // la hauteur de l'axe : à l'épaule d'un Meumeu debout, au ras du sol couché, ou sur son affût
    const axisY=D.have==='epaule'?ground-u(.185):D.have==='bipied'?ground-u(.05):ground-Math.max(u(.1),Dout*s*6+20);
    const bx=20+crewMm*s-recoil;
    // les servants d'abord (l'arme passe devant eux) : le chargeur de l'autre côté de l'arme, les pourvoyeurs derrière, le tireur
    if(D.roles.includes('chargeur'))meu(x,bx+(stock+act*.5)*s,ground-u(.012),s,'genou',true);
    for(let k=0;k<bearers;k++)meu(x,bx-u(behind+.07)-k*u(.13),ground,s,'porte');
    if(D.have==='epaule')meu(x,bx-u(.04),ground,s,'epaule');else if(D.have==='bipied')meu(x,bx+u(.01),ground,s,'couche');else meu(x,bx-u(.035),ground,s,'genou');
    const mx=this.gun(x,D,bx,axisY,s,ground,ms,stock,act,dev);
    // l'éclair, la fumée, l'étui éjecté
    if(t>0&&t<.1&&D.flash>.02){const r=(10+D.flash*60)*Math.min(1,s*3)*(1-t/.1);const g=x.createRadialGradient(mx,axisY,0,mx,axisY,r);g.addColorStop(0,'rgba(255,250,210,.95)');g.addColorStop(.4,'rgba(255,190,70,.7)');g.addColorStop(1,'rgba(255,120,20,0)');x.fillStyle=g;x.beginPath();x.ellipse(mx+r*.5,axisY,r*1.3,r*.6,0,0,7);x.fill();}
    if(t>0&&t<2.2){const k=t/2.2;for(let i=0;i<5;i++){x.fillStyle=`rgba(200,196,188,${.35*(1-k)})`;x.beginPath();x.arc(mx+10+i*9+k*40,axisY-k*30-i*3,6+k*20+i*2,0,7);x.fill();}
      if(p.action!=='verrou'&&t<.8){const ex=bx+(stock+act*.45)*s+t*60,ey=axisY-20*s-Math.sin(t/.8*Math.PI)*40+t*t*60;x.fillStyle='#c9a043';x.fillRect(ex,ey,Math.max(3,D.caseLen*s),Math.max(2,Dc*s));}}
    // la cartouche en coupe, en médaillon
    this.cartridge(x,D,W-250,10,240,96);
    x.fillStyle='#e8dcc4';x.font='600 12px system-ui';const TW=W-280;x.fillText(`${MOUNTS[D.have].name.toLowerCase()} · ${D.crew} servant${D.crew>1?'s':''} · ${Math.round(D.mass*1000)} g chargée · ${fmt(Lw/10,1)} cm`,12,18,TW);
    x.fillStyle='#a8b4ba';x.font='11px system-ui';x.fillText(`${ACTIONS[p.action].name.toLowerCase()}${ACTIONS[p.action]?.auto?` · ${p.rof} coups/min`:''} · ${ACTIONS[p.action]?.auto&&p.mag>=50?'bande':'chargeur'} de ${p.mag}${D.mods.length?' · '+D.mods.map(k=>MODS[k].name.toLowerCase()).join(', '):''}`,12,34,TW);
    // l'échelle
    x.strokeStyle='#a8b4ba';x.beginPath();x.moveTo(12,ground+14);x.lineTo(12+u(.1),ground+14);x.stroke();x.fillStyle='#a8b4ba';x.fillText('10 cm',16+u(.1),ground+18);}
  // l'arme de profil : crosse (ou poignées de pièce), boîte de culasse, canon, bouche, chargeur, modules. Rend la bouche.
  gun(x,D,bx,ay,s,ground,ms,stock,act,dev){const p=D.p;const d=p.d,Dc=d*(D.pistol?1.25:1.45),COL=D.COL,wall=d*(.35+.00075*D.P)*D.wallx,Dout=d+2*wall;const crewGun=D.have==='trepied';
    const X=v=>bx+v*s;const hR=Math.max(Dc*3.2+6,Dout*1.8);const r2=hR*s/2;
    const metal=(y0,h)=>{const g=x.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,'#7b848d');g.addColorStop(.45,'#3d434a');g.addColorStop(1,'#23272b');return g;};
    const wood=(y0,h)=>{const g=x.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,'#a8703f');g.addColorStop(1,'#6a4221');return g;};
    x.lineWidth=1;x.strokeStyle='#1c1f22';
    // l'affût
    if(ms.has('trepied')){const hx=X(stock+act*.6);x.strokeStyle='#2e3338';x.lineWidth=Math.max(2,d*s*.9);const hh=ground-ay;x.beginPath();x.moveTo(hx,ay+r2);x.lineTo(hx+hh*.95,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*1.15,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*.2,ground+3);x.stroke();x.fillStyle='#2e3338';x.fillRect(hx-6,ay+r2-2,12,6);x.lineWidth=1;}
    if(ms.has('bipied')){const lx=X(stock+act+p.L*.62);x.strokeStyle='#2e3338';x.lineWidth=Math.max(1.5,d*s*.6);x.beginPath();x.moveTo(lx,ay);x.lineTo(lx-8,ground);x.moveTo(lx,ay);x.lineTo(lx+8,ground);x.stroke();x.lineWidth=1;}
    // la crosse ou les poignées de pièce
    if(crewGun){x.fillStyle=metal(ay-r2,r2*2);x.fillRect(X(0),ay-r2*.8,stock*s,r2*1.6);x.fillStyle='#6a4221';x.fillRect(X(0)-2,ay-r2*1.6,5,r2*3.2);}
    else{x.fillStyle=wood(ay-r2,r2*4);x.beginPath();x.moveTo(X(0),ay-r2*1.1);x.lineTo(X(stock),ay-r2*.9);x.lineTo(X(stock),ay+r2*.9);x.lineTo(X(stock*.45),ay+r2*1.5);x.lineTo(X(0),ay+r2*3.2);x.closePath();x.fill();x.stroke();
      x.fillStyle='#2a1a0e';x.fillRect(X(0),ay-r2*1.1,3,r2*4.3);}
    // la boîte de culasse, la détente, la poignée
    x.fillStyle=metal(ay-r2,r2*2);x.fillRect(X(stock),ay-r2,act*s,r2*2);x.strokeRect(X(stock),ay-r2,act*s,r2*2);
    x.fillStyle='#2b2f33';x.beginPath();x.moveTo(X(stock+act*.18),ay+r2);x.lineTo(X(stock+act*.1),ay+r2+r2*1.6);x.lineTo(X(stock+act*.25),ay+r2+r2*1.6);x.lineTo(X(stock+act*.3),ay+r2);x.fill();
    x.strokeStyle='#1c1f22';x.beginPath();x.arc(X(stock+act*.36),ay+r2*1.35,r2*.5,0,Math.PI);x.stroke();
    if(p.action==='verrou'){x.strokeStyle='#c9cdd2';x.lineWidth=2;x.beginPath();x.moveTo(X(stock+act*.62),ay-r2*.2);x.lineTo(X(stock+act*.62)+6,ay+r2*1.4);x.stroke();x.fillStyle='#c9cdd2';x.beginPath();x.arc(X(stock+act*.62)+6,ay+r2*1.4,2.5,0,7);x.fill();x.lineWidth=1;}
    else{x.fillStyle='#c9cdd2';x.fillRect(X(stock+act*.7),ay-r2*.5,5,2);x.fillStyle='#15181b';x.fillRect(X(stock+act*.45),ay-r2*.25,act*s*.25,r2*.5);}
    // le canon, son garde-main
    const bw=Math.max(2,Dout*s);const b0=stock+act;const multi=ACTIONS[p.action]?.multi;
    // une arme rotative : un faisceau de canons autour d'un axe, tenu par des colliers
    if(multi){for(const o of [-.95,0,.95]){x.fillStyle=metal(ay+o*bw-bw/2,bw);x.fillRect(X(b0),ay+o*bw-bw/2,p.L*s,bw);x.strokeRect(X(b0),ay+o*bw-bw/2,p.L*s,bw);}x.fillStyle='#2b2f33';for(const f of [.05,.5,.95])x.fillRect(X(b0+p.L*f)-2,ay-bw*1.6,4,bw*3.2);}
    else{x.fillStyle=metal(ay-bw/2,bw);x.fillRect(X(b0),ay-bw/2,p.L*s,bw);x.strokeRect(X(b0),ay-bw/2,p.L*s,bw);}
    if(!crewGun){x.fillStyle=wood(ay-r2*.8,r2*1.6);x.fillRect(X(b0),ay-r2*.8,p.L*s*.42,r2*1.6);x.strokeRect(X(b0),ay-r2*.8,p.L*s*.42,r2*1.6);}
    else if(D.wallx>1.3||ACTIONS[p.action]?.auto){x.fillStyle='rgba(30,34,38,.85)';for(let k=0;k<p.L*.5;k+=d*1.6){x.fillRect(X(b0+k),ay-bw*.95,Math.max(1,d*s*.8),bw*1.9);}}
    x.fillStyle='#c9cdd2';x.fillRect(X(b0+p.L)-3,ay-bw/2-4,2,4);
    // la bouche
    const m0=b0+p.L;if(ms.has('manchon')){const hh=Math.max(bw*2.3,6);x.fillStyle=metal(ay-hh/2,hh);x.fillRect(X(m0),ay-hh/2,dev*s,hh);x.strokeRect(X(m0),ay-hh/2,dev*s,hh);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(X(m0),ay-hh/2+1,dev*s,hh*.2);}
    else if(ms.has('frein')){const hh=Math.max(bw*1.6,5);x.fillStyle=metal(ay-hh/2,hh);x.fillRect(X(m0),ay-hh/2,dev*s,hh);x.fillStyle='#101214';for(let k=1;k<4;k++)x.fillRect(X(m0+dev*k/4)-1,ay-hh/2,2,hh);}
    else if(ms.has('cacheflamme')){x.fillStyle='#2b2f33';for(const o of [-1,1])x.fillRect(X(m0),ay+o*bw*.45-(o<0?1.5:0),dev*s,1.5);x.fillRect(X(m0),ay-bw/2,dev*s*.3,bw);}
    // le chargeur : boîte, tambour, ou bande qui pend vers une caisse
    const mag=p.mag,rmm=Dc;if(ACTIONS[p.action]?.auto&&mag>=50){const bxx=X(stock+act*.35),by=ay+r2;x.strokeStyle='#b8912f';x.lineWidth=Math.max(2,Dc*s*1.2);x.beginPath();x.moveTo(bxx,by);x.quadraticCurveTo(bxx-10,by+30,bxx-5,Math.min(ground-8,by+50));x.stroke();x.lineWidth=1;
      const bw2=Math.max(14,COL*s*1.6),bh=Math.max(10,Math.min(60,mag*D.rm*.1*s*30));x.fillStyle='#4f5a3a';x.fillRect(bxx-bw2,Math.min(ground-bh,by+40),bw2,bh);x.strokeRect(bxx-bw2,Math.min(ground-bh,by+40),bw2,bh);}
    else if(mag>30){const rr=Math.max(6,Math.sqrt(mag)*rmm*s*1.3);x.fillStyle=metal(ay,rr*2);x.beginPath();x.arc(X(stock+act*.45),ay+r2+rr*.9,rr,0,7);x.fill();x.stroke();}
    else if(mag>1){const mh=Math.max(6,Math.min(r2*8,mag/2*rmm*s*1.05+6)),mw=Math.max(4,COL*s*1.1);const mx0=X(stock+act*.55);x.fillStyle=metal(ay,mh);x.beginPath();x.moveTo(mx0,ay+r2);x.lineTo(mx0+mw,ay+r2);x.lineTo(mx0+mw+mh*.15,ay+r2+mh);x.lineTo(mx0+mh*.15,ay+r2+mh);x.closePath();x.fill();x.stroke();}
    // poignée avant, lunette, bouclier
    if(ms.has('poignee')){const gx=X(b0+p.L*.25);x.fillStyle='#2b2f33';x.fillRect(gx-2,ay+r2*.8,5,r2*2.4);}
    if(ms.has('lunette')){const lx=X(stock+act*.15),lw=COL*3*s,lh=Math.max(5,(d*2.2+4)*s);x.fillStyle=metal(ay-r2-lh-4,lh);x.fillRect(lx,ay-r2-lh-4,lw,lh);x.strokeRect(lx,ay-r2-lh-4,lw,lh);x.fillStyle='#5fd1c1';x.fillRect(lx+lw-2,ay-r2-lh-3,2,lh-2);x.fillStyle='#2b2f33';x.fillRect(lx+lw*.25,ay-r2-4,3,4);x.fillRect(lx+lw*.7,ay-r2-4,3,4);}
    if(ms.has('bouclier')){const sx=X(b0+Math.min(p.L*.2,40));const hh=Math.max(40,.2*1000*s),ww=Math.max(14,.09*1000*s);x.fillStyle=metal(ay-hh*.6,hh);x.globalAlpha=.9;x.beginPath();x.moveTo(sx,ay-hh*.62);x.lineTo(sx+ww*.35,ay-hh*.62-ww*.25);x.lineTo(sx+ww*.35,ground-2-ww*.25);x.lineTo(sx,ground-2);x.closePath();x.fill();x.stroke();x.globalAlpha=1;x.fillStyle='#0d0f10';x.fillRect(sx+ww*.1,ay-4,ww*.15,5);}
    return X(m0+dev);}
  // la cartouche en coupe : l'étui de laiton, la poudre, la balle et sa construction, la couleur de pointe
  cartridge(x,D,x0,y0,w,h){const p=D.p,C=CONSTRUCTIONS[p.cons];x.save();x.fillStyle='rgba(18,48,71,.92)';x.beginPath();x.roundRect?x.roundRect(x0,y0,w,h,8):x.rect(x0,y0,w,h);x.fill();
    x.strokeStyle='rgba(160,200,230,.12)';for(let g=x0;g<x0+w;g+=12){x.beginPath();x.moveTo(g,y0);x.lineTo(g,y0+h);x.stroke();}
    const d=p.d,l=D.l,nose=D.noseLen,Dc=d*(D.pistol?1.25:1.45),caseLen=D.caseLen,neck=D.pistol?0:d*1.1,shoulder=D.pistol?0:(Dc-d)*.9,out=l*.7,seat=l-out,COL=caseLen+out;
    const sc=Math.min((w-24)/COL,(h-36)/Dc);const px=v=>x0+12+v*sc,Y=y0+h/2+6,py=v=>Y-v*sc;const body=caseLen-neck-shoulder;const pel=D.pel>1;
    // l'étui (ou la douille de papier d'une cartouche de chevrotine)
    const brass=x.createLinearGradient(0,py(Dc/2),0,py(-Dc/2));brass.addColorStop(0,'#f0cf73');brass.addColorStop(.5,'#c9a043');brass.addColorStop(1,'#8a6a22');
    x.fillStyle=pel&&!C.dart&&p.cons!=='duplex'?'#b3302a':brass;x.strokeStyle='#5a4412';x.beginPath();x.moveTo(px(0),py(Dc/2*.92));x.lineTo(px(d*.2),py(Dc/2*.78));x.lineTo(px(d*.42),py(Dc/2));x.lineTo(px(body),py(Dc/2*.97));x.lineTo(px(body+shoulder),py(d/2*1.06));x.lineTo(px(caseLen),py(d/2*1.06));
    x.lineTo(px(caseLen),py(-d/2*1.06));x.lineTo(px(body+shoulder),py(-d/2*1.06));x.lineTo(px(body),py(-Dc/2*.97));x.lineTo(px(d*.42),py(-Dc/2));x.lineTo(px(d*.2),py(-Dc/2*.78));x.lineTo(px(0),py(-Dc/2*.92));x.closePath();x.fill();x.stroke();
    x.fillStyle='#2a2418';x.fillRect(px(d*.5),py(Dc/2*.8),(body-d*.5)*sc,Dc/2*.8*sc);const r0=rng(7);x.fillStyle='#6b6b52';for(let k=0;k<160;k++)x.fillRect(px(d*.5+r0()*(body-d*.5)),py(r0()*Dc/2*.8),1.4,1.4);
    const b0=caseLen-seat,r=d/2,tip=b0+l,shank=l-nose;
    if(pel&&p.cons!=='duplex'){x.fillStyle=C.dart?'#9aa4ad':'#7d8388';const n=Math.min(D.pel,24);for(let k=0;k<n;k++){const fx=b0+(k%4+.5)*l/4,fy=((k/4|0)%2?.5:-.5)*r*.8;if(C.dart){x.fillRect(px(b0),py(fy+r*.08*(k%3-1)),l*sc,1.2);}else{x.beginPath();x.arc(px(fx),py(fy),Math.max(1.5,r*.35*sc),0,7);x.fill();}}}
    else{const jacket=C.mono?'#c46d38':C.soft?'#8d9196':C.core?'#a8744a':'#c07a3e';const drawB=(o,sub)=>{const rr=r*sub,bt=p.base==='bt';x.beginPath();x.moveTo(px(o),py(bt?rr*.72:rr));x.lineTo(px(o+shank*(1-(bt?.1:0))),py(rr));
        if(p.nose==='plate'){x.lineTo(px(o+l-nose*.2),py(rr*.95));x.lineTo(px(o+l),py(rr*.55));x.lineTo(px(o+l),py(-rr*.55));x.lineTo(px(o+l-nose*.2),py(-rr*.95));}
        else{const k=p.nose==='pointue'?.08:p.nose==='ogive'?.3:.55;x.quadraticCurveTo(px(o+shank+nose*.75),py(rr),px(o+l),py(rr*k));x.lineTo(px(o+l),py(-rr*k));x.quadraticCurveTo(px(o+shank+nose*.75),py(-rr),px(o+shank),py(-rr));}
        x.lineTo(px(o),py(bt?-rr*.72:-rr));x.closePath();x.fillStyle=jacket;x.fill();x.strokeStyle='#4a2a10';x.stroke();};
      if(C.sub){x.fillStyle='#6c7a5a';x.fillRect(px(b0),py(r),l*.75*sc,d*sc);drawB(b0,C.sub);}else if(p.cons==='duplex'){drawB(b0,1);}else drawB(b0,1);
      x.save();x.beginPath();x.rect(px(b0),py(r),l*sc,r*sc);x.clip();if(!C.mono&&!C.sub){x.fillStyle='#8d9196';x.fillRect(px(b0+d*.12),py(r*.82),(l-nose*.6)*sc,r*.82*sc);}
      if(C.core){x.fillStyle=C.rare?'#5fd1c1':p.cons==='tungstene'?'#9aa4ad':'#40464d';x.fillRect(px(b0+d*.25),py(r*.5),(l-nose*.4)*sc,r*.5*sc);}
      if(p.cons==='hp'){x.fillStyle='#2a2418';x.beginPath();x.moveTo(px(tip),py(r*.4));x.lineTo(px(tip-nose*.7),py(0));x.lineTo(px(tip),py(0));x.fill();}
      if(C.he&&!C.shaped){const hf=Math.sqrt(D.hef||.3);x.fillStyle='#f0c419';x.fillRect(px(b0+shank*.15),py(r*.9*hf),shank*.8*sc,r*.9*hf*sc);}
      if(C.shaped){x.fillStyle='#f0c419';x.fillRect(px(b0+d*.2),py(r*.8),shank*.6*sc,r*.8*sc);x.strokeStyle='#e08a4a';x.lineWidth=2;x.beginPath();x.moveTo(px(b0+shank*.75),py(r*.8));x.lineTo(px(b0+shank*.4),py(0));x.stroke();x.lineWidth=1;}
      if(C.tracer){x.fillStyle='#d23a2e';x.fillRect(px(b0),py(r*.4),d*.6*sc,r*.4*sc);}x.restore();
      if(TIPC[p.cons]){x.fillStyle=TIPC[p.cons];x.beginPath();x.arc(px(tip-nose*.12),py(0),Math.max(1.5,r*.5*sc),0,7);x.fill();}}
    x.fillStyle='#dcecf7';x.font='11px ui-monospace,Consolas,monospace';x.fillText(`${D.name} · ${C.name.toLowerCase()}`,x0+10,y0+14,w-20);x.fillStyle='#8fc3e6';x.fillText(`balle ${mg(D.m)} · poudre ${mg(p.c)} · ${Math.round(D.P)} MPa`,x0+10,y0+h-8,w-20);x.restore();}

  // ---------- la trajectoire : au-dessus / au-dessous de la ligne de visée, et la balle au ralenti ----------
  drawTraj(D,t){const F=this.fit('dz-traj');if(!F)return;const [x,W,H]=F;const ink=css('--ink'),muted=css('--muted'),line=css('--line'),teal=css('--teal'),orange=css('--orange'),red=css('--red');
    const last=D.table.length?D.table[D.table.length-1].x:0;const Xmax=Math.max(60,Math.min(last,600,Math.ceil(Math.max(D.eff*2.2,(D.p.zero||50)*1.6)/25)*25));
    const X0=46,X1=W-16,Y0=16,Y1=H-26;const ys=[];for(let r=0;r<=Xmax;r+=Math.max(1,Xmax/200))ys.push([r,D.los(r)]);const top=Math.max(.06,...ys.map(q=>q[1]))*1.15,bot=Math.min(-.12,...ys.map(q=>q[1]))*1.1;
    const X=r=>X0+(X1-X0)*r/Xmax,Y=y=>Y0+(Y1-Y0)*(top-y)/(top-bot);
    // la zone où l'on touche encore un Meumeu (±10 cm)
    x.fillStyle='rgba(84,170,161,.12)';x.fillRect(X0,Y(.1),X1-X0,Y(-.1)-Y(.1));x.strokeStyle=line;x.lineWidth=1;x.font='11px system-ui';x.fillStyle=muted;
    const step=Xmax>300?100:Xmax>120?50:25;for(let r=0;r<=Xmax;r+=step){x.beginPath();x.moveTo(X(r),Y0);x.lineTo(X(r),Y1);x.stroke();x.fillText(`${r} m`,X(r)-10,H-8);}
    for(const y of [.1,0,-.1,-.3,-.5,-1,-2].filter(y=>y<=top&&y>=bot)){x.fillText(`${y>0?'+':''}${fmt(y*100,0)} cm`,4,Y(y)+4);}
    x.setLineDash([6,4]);x.strokeStyle=ink;x.beginPath();x.moveTo(X0,Y(0));x.lineTo(X1,Y(0));x.stroke();x.setLineDash([]);x.fillStyle=ink;x.fillText('ligne de visée',X1-80,Y(0)-5);
    // la trajectoire, teinte par la vitesse (bleu-vert supersonique, orange subsonique)
    for(let i=1;i<ys.length;i++){const [r0,y0]=ys[i-1],[r1,y1]=ys[i];x.strokeStyle=D.at(r1).v>340?teal:orange;x.lineWidth=2.4;x.beginPath();x.moveTo(X(r0),Y(y0));x.lineTo(X(r1),Y(y1));x.stroke();}
    const z=D.p.zero||50;if(z<=Xmax){x.fillStyle=red;x.beginPath();x.arc(X(z),Y(0),4,0,7);x.fill();x.fillText(`hausse ${z} m`,X(z)+6,Y(0)+14);}
    for(const r of [25,50,100,200,300].filter(r=>r<Xmax&&r!==z)){const y=D.los(r);x.fillStyle=Math.abs(y)>.1?red:muted;x.fillText(`${y>=0?'+':''}${cm(y)}`,X(r)+3,Y(y)+(y>0?-6:14));}
    const sub=D.table.find(q=>q.v<340&&q.x<Xmax);if(sub&&D.v0>340){x.fillStyle=orange;x.fillText('passe le mur du son',X(sub.x)+4,Y0+10);}
    if(D.eff&&D.eff<Xmax){x.strokeStyle=red;x.setLineDash([2,3]);x.beginPath();x.moveTo(X(D.eff),Y0);x.lineTo(X(D.eff),Y1);x.stroke();x.setLineDash([]);x.fillStyle=red;x.fillText(`portée utile ${D.eff} m`,X(D.eff)+4,Y1-6);}
    // la balle au ralenti : le temps de vol étiré, une traînée derrière elle
    if(t>.05){const tf=D.at(Xmax).t||1;const slow=2.6;const tt=Math.min(tf,(t-.05)/slow*tf);let r=0;for(const q of D.table){if(q.t>tt||q.x>Xmax)break;r=q.x;}
      const y=D.los(r);const g=x.createLinearGradient(X(Math.max(0,r-Xmax*.08)),0,X(r),0);g.addColorStop(0,'rgba(255,200,80,0)');g.addColorStop(1,'rgba(255,200,80,.9)');x.strokeStyle=g;x.lineWidth=3;x.beginPath();x.moveTo(X(Math.max(0,r-Xmax*.08)),Y(D.los(Math.max(0,r-Xmax*.08))));x.lineTo(X(r),Y(y));x.stroke();
      x.fillStyle='#fff3c4';x.beginPath();x.arc(X(r),Y(y),3.5,0,7);x.fill();x.fillStyle=ink;x.font='600 11px system-ui';x.fillText(`${Math.round(r)} m · ${Math.round(D.at(r).v)} m/s · ${fmt(D.at(r).t*1000,0)} ms`,Math.min(X(r)+8,X1-150),Y(y)-8);}}

  // ---------- la précision : un Meumeu de face à chaque distance, et où tombent vingt balles ----------
  drawPrec(D){const F=this.fit('dz-prec');if(!F)return;const [x,W,H]=F;const muted=css('--muted'),ink=css('--ink');const Rs=[10,25,50,100,200].filter(r=>!D.at(r).beyond);const n=Rs.length||1;const pw=W/n;
    for(let i=0;i<Rs.length;i++){const R=Rs[i];const sig=D.sigAt(R);const cx=pw*i+pw/2,cy=H/2-6;const sc=Math.min(95/.3,(pw*.42)/Math.max(.15,sig*2.4));const k=v=>v*sc;
      x.fillStyle='rgba(84,170,161,.08)';x.fillRect(pw*i+4,4,pw-8,H-8);
      // le Meumeu de face (d'après le portrait) : 30 cm, cible utile 7 × 20 cm
      meuFront(x,cx,cy+k(.15),sc);
      x.strokeStyle='rgba(179,38,30,.8)';x.setLineDash([3,3]);x.beginPath();x.ellipse(cx,cy+k(.02),k(sig*2),k(sig*2),0,0,7);x.stroke();x.setLineDash([]);
      const r0=rng(11+i);for(let j=0;j<20;j++){const a=r0()*6.283,g=Math.sqrt(-2*Math.log(Math.max(1e-6,r0())));const hx=cx+Math.cos(a)*g*k(sig),hy=cy+k(.02)+Math.sin(a)*g*k(sig);x.fillStyle='#b3261e';x.beginPath();x.arc(hx,hy,2,0,7);x.fill();}
      x.fillStyle=ink;x.font='600 12px system-ui';x.textAlign='center';x.fillText(`${R} m`,cx,16);x.font='600 12px system-ui';const hp=Math.round(D.hitP(R)*100);x.fillStyle=hp>=50?css('--good'):hp>=20?css('--orange2'):css('--red');x.fillText(`touche ${hp} %`,cx,H-22);x.font='11px system-ui';x.fillStyle=muted;x.fillText(`groupe ${cm(sig*4)}`,cx,H-8);x.textAlign='left';}}
  // ---------- la perforation selon la distance, contre ce qu'on rencontre ----------
  drawPen(D,R){const F=this.fit('dz-pen');if(!F)return;const [x,W,H]=F;const muted=css('--muted'),line=css('--line'),teal=css('--teal'),ink=css('--ink');
    const last=D.table.length?D.table[D.table.length-1].x:0;const Xmax=Math.max(50,Math.min(last,400,Math.ceil(D.eff*2.5/50)*50));const pmax=Math.max(1.5,D.pen(D.v0),R.pen(R.v0))*1.15;
    const X0=40,X1=W-170,Y0=10,Y1=H-24;const X=r=>X0+(X1-X0)*r/Xmax,Y=v=>Y1-(Y1-Y0)*Math.min(1,v/pmax);x.font='11px system-ui';
    const refs=[['casque Mle 1',.8],['plastron bèè',1.2],['tôle de wagon',3],['mur de briques',8],['plaque de pièce',15]].filter(([,v])=>v<pmax);
    for(const [n,v] of refs){x.strokeStyle=line;x.setLineDash([3,3]);x.beginPath();x.moveTo(X0,Y(v));x.lineTo(X1,Y(v));x.stroke();x.setLineDash([]);x.fillStyle=muted;x.fillText(`${n} (${fmt(v,1)} mm)`,X1+6,Y(v)+4);}
    const step=Xmax>200?100:50;for(let r=0;r<=Xmax;r+=step){x.fillStyle=muted;x.fillText(`${r} m`,X(r)-10,H-8);}
    const plot=(W2,col,dash)=>{x.setLineDash(dash);x.strokeStyle=col;x.lineWidth=2.2;x.beginPath();for(let r=0;r<=Xmax;r+=Math.max(1,Xmax/150)){const v=W2.pen(W2.at(r).v);r?x.lineTo(X(r),Y(v)):x.moveTo(X(r),Y(v));}x.stroke();x.setLineDash([]);};
    plot(R,teal+'66',[4,4]);plot(D,teal,[]);x.fillStyle=ink;x.fillText(`${fmt(D.pen(D.v0),D.pen(D.v0)<10?2:0)} mm à la bouche`,X0+4,Y0+10);x.fillStyle=muted;x.fillText('— cette arme   - - la référence',X0+4,Y0+24);}
  // le bloc de gélatine, vu de côté : le trajet (sa couleur dit la bascule), la cavité temporaire, les éclats
  drawGel(D){const F=this.fit('dz-gel');if(!F)return;const [x,w,h]=F;const v=D.at(this.gelR).v;const g=gel(D,v,rng(3),.16);
    const X0=20,X1=w-20,Yc=h/2-6,Lm=.16;const k=(X1-X0)/Lm;const X=z=>X0+Math.min(Lm,Math.max(0,z))*k,Y=y=>Yc-Math.max(-.035,Math.min(.035,y))*k;const half=Math.min(.03*k,Yc-10);
    const gg=x.createLinearGradient(0,Yc-half,0,Yc+half);gg.addColorStop(0,'rgba(240,214,160,.55)');gg.addColorStop(1,'rgba(220,180,120,.45)');x.fillStyle=gg;x.fillRect(X0,Yc-half,X1-X0,2*half);x.strokeStyle='rgba(180,140,90,.6)';x.strokeRect(X0,Yc-half,X1-X0,2*half);
    x.fillStyle='rgba(215,90,60,.25)';x.beginPath();x.moveTo(X(0),Yc);for(const t of g.R.tc)x.lineTo(X(t.p[2]),Yc-Math.min(half,t.r*k));for(const t of [...g.R.tc].reverse())x.lineTo(X(t.p[2]),Yc+Math.min(half,t.r*k));x.closePath();x.fill();
    for(const f of g.R.frags){x.strokeStyle='rgba(200,110,40,.85)';x.lineWidth=1;x.beginPath();f.pts.forEach((q,i)=>{const px=X(q.p[2]),py=Y(q.p[1]);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}
    const P=g.R.path;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const yaw=Math.min(1,b.yaw/(Math.PI/2));x.strokeStyle=`rgb(${Math.round(90+150*yaw)},${Math.round(60-30*yaw)},40)`;x.lineWidth=Math.max(1.5,b.d/1000*k*.9);x.beginPath();x.moveTo(X(Math.max(0,a.p[2])),Y(a.p[1]));x.lineTo(X(Math.max(0,b.p[2])),Y(b.p[1]));x.stroke();}
    let row=0;const tag=(z,t,col)=>{if(z==null)return;x.strokeStyle=col;x.lineWidth=1.5;x.setLineDash([3,3]);x.beginPath();x.moveTo(X(z),Yc-half);x.lineTo(X(z),Yc+half);x.stroke();x.setLineDash([]);x.font='600 12px system-ui';const tw=x.measureText(t).width;const ty=Yc-half+14+row*16;row++;x.fillStyle='rgba(255,255,255,.8)';x.fillRect(X(z)+2,ty-11,tw+6,15);x.fillStyle=col;x.fillText(t,X(z)+5,ty);};
    tag(g.yawAt,`bascule ${fmt(g.yawAt*100,1)} cm`,'#b3261e');tag(g.fragAt,`${D.he?'éclate':'se brise'} ${fmt(g.fragAt*100,1)} cm`,'#c86a1f');if(!g.exit)tag(g.depth,`arrêtée ${fmt(g.depth*100,1)} cm`,css('--ink'));
    x.fillStyle=css('--muted');x.font='12px system-ui';for(let c=0;c<=16;c+=4)x.fillText(`${c} cm`,X(c/100)-8,h-6);
    const t=this.host.querySelector('#dz-gelt');const exitE=.5*D.m/1000*g.vOut**2;
    t.innerHTML=`À ${this.gelR} m, elle arrive à <b>${Math.round(v)} m/s</b> (${fmt(.5*D.m/1000*v*v,1)} J) et laisse <b>${fmt(g.E,1)} J</b> dans le bloc${g.exit?` — elle en ressort à ${Math.round(g.vOut)} m/s (${fmt(exitE,1)} J perdus pour la blessure)`:''}. `+
      `${g.yawAt!=null?`Elle bascule à ${fmt(g.yawAt*100,1)} cm. `:'Elle reste droite. '}${g.fragmented?(D.he?'La charge éclate : des éclats partout. ':'Elle se fragmente : des éclats partout. '):''}${g.expanded?'Elle s’expanse. ':''}Cavité temporaire jusqu’à ${fmt(g.maxTc*2*1000,1)} mm de large, à ${fmt(g.tcAt*100,1)} cm : elle déchire le foie, la rate, le cerveau.${D.he?` Autour du point d’éclatement : souffle mortel à ${cm(D.he.blast)}${D.he.shaped?'':`, éclats mortels à ${cm(D.he.lethal)}`}.`:''}`;}
}
const SHOOTER=1.5;
// ---------- les Meumeu du plateau, d'après le portrait : une peluche crème, museau clair, cornes, pattes et sabots plus foncés ----------
const CREAM='#f1e3c6',SHADE='#dcc6a0',PAW='#c9a57a',LINE='#8a7355',EYE='#4a2e1e';
function blob(x,cx,cy,rx,ry,fill,rot=0){x.beginPath();x.ellipse(cx,cy,Math.max(.5,rx),Math.max(.5,ry),rot,0,7);x.fillStyle=fill;x.fill();x.strokeStyle=LINE;x.lineWidth=1;x.stroke();}
function head(x,cx,cy,k,face=1){blob(x,cx-face*k*.028,cy-k*.03,k*.013,k*.01,SHADE,-.5*face);blob(x,cx+face*k*.012,cy-k*.043,k*.008,k*.016,PAW,.3*face);// oreille, corne
  blob(x,cx,cy,k*.034,k*.04,CREAM);blob(x,cx+face*k*.012,cy+k*.018,k*.026,k*.02,'#f6ecd6');
  x.fillStyle=EYE;x.beginPath();x.arc(cx+face*k*.012,cy-k*.012,Math.max(1,k*.004),0,7);x.fill();x.beginPath();x.arc(cx+face*k*.028,cy+k*.016,Math.max(.8,k*.0032),0,7);x.fill();
  x.strokeStyle='#b98a55';x.setLineDash([2,2]);x.beginPath();x.arc(cx+face*k*.012,cy+k*.02,k*.014,.3,Math.PI-.3);x.stroke();x.setLineDash([]);}
function meu(x,cx,ground,s,pose,face=false){const k=1000*s;const f=face?-1:1;x.save();x.globalAlpha=face?.92:1;
  if(pose==='couche'){blob(x,cx-k*.06,ground-k*.03,k*.07,k*.03,CREAM);blob(x,cx-k*.13,ground-k*.018,k*.03,k*.014,PAW);head(x,cx+k*.005,ground-k*.06,k,1);blob(x,cx+k*.02,ground-k*.03,k*.012,k*.03,PAW,.6);}
  else if(pose==='genou'){blob(x,cx-k*.01,ground-k*.018,k*.035,k*.018,PAW);blob(x,cx,ground-k*.075,k*.05,k*.055,CREAM);head(x,cx+f*k*.01,ground-k*.16,k,f);blob(x,cx+f*k*.035,ground-k*.08,k*.012,k*.03,PAW,.8*f);}
  else if(pose==='porte'){blob(x,cx-k*.02,ground-k*.03,k*.017,k*.03,SHADE);blob(x,cx+k*.02,ground-k*.03,k*.017,k*.03,SHADE);blob(x,cx-k*.02,ground-k*.008,k*.018,k*.009,PAW);blob(x,cx+k*.02,ground-k*.008,k*.018,k*.009,PAW);
    blob(x,cx,ground-k*.11,k*.055,k*.058,CREAM);head(x,cx+k*.005,ground-k*.215,k,1);x.fillStyle='#6a4a2a';x.fillRect(cx-k*.03,ground-k*.14,k*.06,k*.04);x.strokeStyle='#3a2410';x.strokeRect(cx-k*.03,ground-k*.14,k*.06,k*.04);blob(x,cx+k*.04,ground-k*.12,k*.013,k*.03,PAW,.5);}
  else{// debout, l'arme à l'épaule
    blob(x,cx-k*.02,ground-k*.035,k*.018,k*.035,SHADE);blob(x,cx+k*.024,ground-k*.035,k*.018,k*.035,SHADE);blob(x,cx-k*.02,ground-k*.009,k*.019,k*.01,PAW);blob(x,cx+k*.024,ground-k*.009,k*.019,k*.01,PAW);
    blob(x,cx,ground-k*.115,k*.058,k*.06,CREAM);x.strokeStyle='#b98a55';x.setLineDash([2,2]);x.beginPath();x.arc(cx+k*.02,ground-k*.1,k*.018,3.6,5.2);x.stroke();x.setLineDash([]);
    head(x,cx+k*.02,ground-k*.235,k,1);blob(x,cx+k*.05,ground-k*.175,k*.03,k*.013,PAW,-.1);}
  x.restore();}
// de face, pour la cible
function meuFront(x,cx,foot,sc){const k=sc;x.save();const B=(ax,ay,rx,ry,c)=>{x.beginPath();x.ellipse(cx+ax*k,foot-ay*k,rx*k,ry*k,0,0,7);x.fillStyle=c;x.fill();x.strokeStyle=LINE;x.lineWidth=.8;x.stroke();};
  B(-.033,.035,.022,.035,SHADE);B(.033,.035,.022,.035,SHADE);B(-.033,.01,.022,.011,PAW);B(.033,.01,.022,.011,PAW);B(-.068,.12,.018,.04,CREAM);B(.068,.12,.018,.04,CREAM);B(-.07,.09,.017,.014,PAW);B(.07,.09,.017,.014,PAW);
  B(0,.11,.06,.058,CREAM);B(-.045,.27,.016,.012,SHADE);B(.045,.27,.016,.012,SHADE);B(-.018,.285,.007,.014,PAW);B(.018,.285,.007,.014,PAW);B(0,.235,.038,.048,CREAM);B(0,.205,.03,.022,'#f6ecd6');
  x.fillStyle=EYE;for(const [ex,ey] of [[-.016,.25],[.016,.25],[-.012,.206],[.012,.206]]){x.beginPath();x.arc(cx+ex*k,foot-ey*k,Math.max(1,.0035*k),0,7);x.fill();}
  x.strokeStyle='rgba(179,38,30,.35)';x.strokeRect(cx-.035*k,foot-.23*k,.07*k,.2*k);x.restore();}
