// (V12.9) LA GUERRE CHIMIQUE — l'interface du soldat choisi : sa protection (masque, lunettes, combinaison, antidote), les bouteilles à portée
// (poser, remplir, charger, poser, ouvrir, ouvrir la batterie, fermer), le vent et le temps. Agents FICTIFS. Appelé par ui.js (unitsPane, clics data-gas).
import {AGENTS,AGENT_IDS} from './gaz.js';
import {METEO} from './gaz-nuages.js';
import {BOUTEILLE,dirName} from './gaz-bouteilles.js';
import {FICHE,TIER_NAME} from './gaz-equip.js';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n0=v=>Math.round(v||0);
const GEARS=[['masque_gaz','Masque','maskKit'],['lunettes_gaz','Lunettes','goggles'],['combinaison','Combinaison','chemSuit']];

export function gasPaneHtml(world,one){if(!one||one.f!=='meumeu'||!one.h)return '';
  const anyGear=['prod:masque_gaz','prod:lunettes_gaz','prod:combinaison','prod:antidote','prod:bouteille_gaz'].some(k=>world.unlocked(k));if(!anyGear&&!one.maskKit&&!world.s.gas)return '';
  let h='';const g=world.s.gas;
  if(g){const w=g.wind;h+=`<div class="kv"><span>Vent</span><b>${Math.round(w.v)} cases/h vers ${dirName(w.a)} · ${(METEO[g.meteo]||METEO.sec).name}</b></div>`;}
  const C=world.gasAt(one.x,one.y);const here=Object.entries(C).filter(([,c])=>c>.05).map(([a,c])=>`${AGENTS[a].name} ${c.toFixed(1)}`);
  if(here.length)h+=`<div class="kv"><span>Gaz ici</span><b class="bad">${esc(here.join(' · '))}</b></div>`;
  h+=`<div class="kv"><span>Protection chimique</span><b>${esc(world.gasGearOf(one).join(' · '))||'<span class="quiet">aucune</span>'}</b></div>`;
  const gd=world.gearDepot(one),st=gd?.stock||{};
  if(gd){h+=`<div class="row small">`;for(const [k,n,f] of GEARS){if(!world.unlocked('prod:'+k)&&!one[f])continue;
      h+=one[f]?`<button class="small ghost" data-gas="gear:${k}:0">Rendre ${n.toLowerCase()}</button>`:`<button class="small" data-gas="gear:${k}:1" ${(st[k]||0)>=1?'':'disabled'} title="${n0(st[k])} au dépôt">${n} (${n0(st[k])})</button>`;}
    if(world.unlocked('prod:antidote'))h+=`<button class="small" data-gas="gear:antidote:1" ${(st.antidote||0)>=1&&(one.antidote||0)<3?'':'disabled'} title="${n0(st.antidote)} au dépôt ; 3 au plus">+ Antidote</button>`;
    h+=`</div>`;}
  // les bouteilles
  if(world.unlocked('prod:bouteille_gaz')||one.cyl!=null){const near=world.cylsNear(one.x,one.y,BOUTEILLE.REACH+.5,'meumeu').filter(c=>c.by==null);
    h+=`<div class="row small">`;
    if(one.cyl!=null){const c=world.cyl(one.cyl);h+=`<span>Porte une ${esc(c?world.cylName(c):'bouteille')} (${Math.round(world.cylLevel(c)*100)} %)</span><button class="small" data-gas="drop">Poser la bouteille</button>`;}
    else h+=`<button class="small" data-gas="place" ${gd&&(st.bouteille_gaz||0)>=1?'':'disabled'} title="une bouteille vide prise au dépôt (${n0(st.bouteille_gaz)})">Poser une bouteille vide</button>`;
    h+=`</div>`;
    const agents=AGENT_IDS.filter(a=>world.unlocked('prod:'+AGENTS[a].res));
    for(const c of near){const lvl=world.cylLevel(c);const batt=world.cylBattery(c).length;
      h+=`<div class="row small"><span title="la barre de remplissage">${esc(world.cylName(c))} <span class="bar" style="display:inline-block;width:60px;height:6px;background:#333;vertical-align:middle"><i style="display:block;height:6px;width:${Math.round(lvl*100)}%;background:${AGENTS[c.agent]?.col||'#888'}"></i></span> ${Math.round(lvl*100)} %${c.fill?' · remplit':''}${c.open?' · <b class="bad">ouverte</b>':''}${c.hp<BOUTEILLE.HP/2?' · <span class="bad">cabossée, fuit</span>':''}</span>`;
      if(!c.open&&lvl<1&&agents.length)h+=`<select data-gas-agent="${c.id}">${agents.map(a=>`<option value="${a}" ${a===c.agent?'selected':''}>${esc(AGENTS[a].name)}</option>`).join('')}</select><button class="small" data-gas="fill:${c.id}">Remplir</button>`;
      if(!c.open)h+=`<button class="small" data-gas="carry:${c.id}">Charger</button>`;
      if(!c.open&&lvl>0)h+=`<button class="small" data-gas="open:${c.id}:0">Ouvrir</button>${batt>1?`<button class="small" data-gas="open:${c.id}:1" ${world.unlocked('gaz:batterie')?'':'disabled title="découverte : Les batteries de bouteilles"'}>Ouvrir la batterie (${batt})</button>`:''}`;
      if(c.open)h+=`<button class="small ghost" data-gas="close:${c.id}">Fermer</button>`;
      h+=`</div>`;}}
  return h;}

// un clic data-gas="…" : rend {ok, text | why[]}
export function gasAction(world,u,d,root=globalThis.document){if(!u)return {ok:false,why:['choisissez un soldat']};const [k,a,b]=d.split(':');
  if(k==='gear')return world.equip(u,a,b==='1');
  if(k==='place')return world.cylPlace(u);
  if(k==='drop')return world.cylDrop(u);
  const c=world.cyl(+a);
  if(k==='fill'){const sel=root?.querySelector?.(`[data-gas-agent="${a}"]`);return world.cylFill(c,sel?.value||c?.agent||'foin');}
  if(k==='carry')return world.cylCarry(u,c);
  if(k==='open')return world.cylOpen(c,b==='1');
  if(k==='close')return world.cylClose(c);
  return {ok:false,why:['ordre inconnu']};}

// la fiche d'un agent, pour l'aide (létalité, organes, parade, défauts, temps)
export function ficheHtml(a){const A=AGENTS[a],F=FICHE[a];if(!A||!F)return '';
  return `<b>${esc(A.name)}</b> (${esc(A.fam)}, ${TIER_NAME[F.tier]}) — ${esc(A.desc)}. Organes : ${F.organes.join(', ')}. Parade : ${F.parade.join(' + ')}. Défauts : ${esc(F.defauts.join(' ; '))}. Temps : ${esc(F.temps)}.`;}
