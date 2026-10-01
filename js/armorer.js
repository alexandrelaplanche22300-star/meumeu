// Le bureau d'études, côté protections : quatre zones, chacune son matériau et son épaisseur. La page dit, pour chaque arme
// connue (les nôtres, celles des Bèè), à quelle distance la plaque l'arrête — et ce que coûte chaque gramme : la vitesse du
// soldat, le temps qu'il met à viser, les ressources.
import {MATS,ZONES,deriveArmor,stopsAt} from './armor.js';
import {derive,fmt,CONSTRUCTIONS} from './ballistics.js';
import {BODIES} from './body.js';
const REGIONS=BODIES.meumeu.REGIONS;

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MCOL={acier:'#8d99a6',ceramique:'#e8e0cf',soie:'#c9b27a',verre:'#6fd6c8'};
export class Armorer{
  constructor(host,{world,bureau,ico,toWeapons,onClose}){this.host=host;this.world=world;this.bureau=bureau;this.ico=ico;this.toWeapons=toWeapons;this.onClose=onClose;
    host.addEventListener('input',e=>{if(!e.target.closest('#armorer'))return;const id=e.target.id;if(id==='az-name'){this.name=e.target.value;return;}const m=id.match(/^az-t-(\w+)$/);if(m){this.a[m[1]][1]=+e.target.value;this.render();}});
    host.addEventListener('change',e=>{if(e.target.id==='az-from')this.load(e.target.value);});
    host.addEventListener('click',e=>{const b=e.target.closest('[data-az]');if(!b)return;const [k,v,w]=b.dataset.az.split(':');
      if(k==='close'){this.close();}else if(k==='weapons'){this.host.hidden=true;this.toWeapons();}else if(k==='mat'){this.a[v][0]=w;this.build();}
      else if(k==='go'){const bur=this.bureau();const r=bur?this.world().proposeArmor(bur,this.name,this.a):{ok:false,why:['un bureau d’études bâti']};const s=this.host.querySelector('.az-say');if(s){s.textContent=r.ok?r.text:r.why.join(' · ');s.className='az-say '+(r.ok?'good':'bad');}if(r.ok)setTimeout(()=>this.close(),600);}});}
  close(){this.host.hidden=true;this.onClose?.();}
  show(from='gilet'){this.host.hidden=false;this.load(from);}
  load(id){const W=this.world();const A=W.s.armors[id]||W.s.armors.gilet;this.ref=A;this.a=JSON.parse(JSON.stringify(A.a));this.name=`${A.base?'Protection':A.name} ${Object.keys(W.s.armors).length}`;this.build();}
  build(){const W=this.world();const list=Object.values(W.s.armors).filter(a=>a.status!=='perdu');
    this.host.innerHTML=`<div class="dz" id="armorer" role="dialog" aria-label="Bureau d’études : protections">
      <header class="dz-head"><div><b>Bureau d’études · Protections</b><small>quatre zones, un matériau et une épaisseur chacune</small></div>
        <div class="seg"><button data-az="weapons">Armes</button><button class="on">Protections</button></div>
        <label class="dz-name">Nom <input id="az-name" value="${esc(this.name)}" maxlength="28"></label>
        <label class="dz-name">Partir de <select id="az-from">${list.map(a=>`<option value="${a.id}" ${a.id===this.ref.id?'selected':''}>${esc(a.name)}${a.f==='beee'?' (bèè)':''}</option>`).join('')}</select></label>
        <button class="ghost" data-az="close">Fermer</button></header>
      <div class="dz-body az">
        <section class="dz-col">${Object.entries(ZONES).map(([z,Z])=>`<h3>${Z.name}</h3><div class="seg wrap">${Object.entries(MATS).map(([m,M])=>`<button data-az="mat:${z}:${m}" class="${this.a[z][0]===m?'on':''}" title="${esc(M.desc)}">${M.name}</button>`).join('')}</div>
          <label class="dz-r"><span>Épaisseur<em id="az-v-${z}"></em></span><input type="range" id="az-t-${z}" min="0" max="${Z.max}" step=".1" value="${this.a[z][1]}"></label>`).join('')}
          <p class="quiet small">${Object.values(MATS).map(M=>`<b>${M.name}</b> : ${esc(M.desc)}.`).join(' ')}</p></section>
        <section class="dz-col"><div class="az-fig" id="az-fig"></div><h3>Ce qu’elle arrête <small>au plastron et au casque, à 5, 20 et 50 m</small></h3><div id="az-tab" class="az-tab"></div></section>
        <section class="dz-col"><h3>Le poids, le prix</h3><div id="az-sum" class="dz-tab"></div><div class="dz-go"><button data-az="go">Lancer le prototype (8 h)</button><p class="az-say quiet small"></p></div>
          <p class="quiet small">Adoptée, la manufacture la fabrique ; la caserne en équipe les recrues. Une plaque qui arrête une balle s’use — la céramique vite, l’acier à peine.</p></section></div></div>`;
    this.render();}
  render(){const W=this.world();const D=deriveArmor(this.a);const $=id=>this.host.querySelector('#'+id);if(!$('az-fig'))return;
    for(const [z,Z] of Object.entries(ZONES)){const e=$('az-v-'+z);if(e)e.textContent=` ${fmt(this.a[z][1],1)} mm · ${Math.round(D.zones[z].kg*1000)} g`;}
    $('az-fig').innerHTML=this.figure(D);
    // les armes connues : les nôtres et celles de l'ennemi
    const guns=Object.values(W.s.designs).filter(d=>d.status==='adopte'||d.f==='beee');
    $('az-tab').innerHTML=`<table class="medt"><thead><tr><th>Arme</th><th>Munition</th>${[5,20,50].map(r=>`<th>${r} m</th>`).join('')}</tr></thead><tbody>${guns.map(g=>{const Wd=derive(g.p);
      const cell=R=>{const s=stopsAt(D,Wd,R);const pl=s.plastron,ca=s.casque;const f=(x,n)=>x==null?'':x.stops?`<span class="good">${n} ✓</span>`:`<span class="bad">${n} ✗ ${Math.round(x.v2)} m/s</span>`;return `<td>${f(pl,'plastron')}<br>${f(ca,'casque')}</td>`;};
      return `<tr><td>${esc(g.name)}${g.f==='beee'?' <small class="bad">bèè</small>':''}</td><td><small>${esc(CONSTRUCTIONS[g.p.cons].name)} · ${fmt(Wd.pen(Wd.at(20).v),2)} mm à 20 m</small></td>${[5,20,50].map(cell).join('')}</tr>`;}).join('')}</tbody></table>`;
    const bur=this.bureau();$('az-sum').innerHTML=`<div class="kv"><span>Poids</span><b>${Math.round(D.mass*1000)} g <small class="quiet">(${fmt(D.mass/1.5*100,0)} % du Meumeu)</small></b></div>
      <div class="kv"><span>Vitesse de marche</span><b class="${D.move<.85?'bad':''}">×${fmt(D.move,2)}</b></div><div class="kv"><span>Temps pour viser</span><b>×${fmt(D.aim,2)}</b></div>
      ${Object.entries(D.zones).map(([z,Z])=>`<div class="kv"><span>${ZONES[z].name}</span><b>${Z.t>0?`${fmt(Z.t,1)} mm ${MATS[Z.mat].name.toLowerCase()} = ${fmt(Z.eq,1)} mm d’acier`:'—'}</b></div>`).join('')}
      <div class="kv"><span>Une protection</span><b>${Object.entries(D.cost).map(([k,v])=>`<span class="cost">${this.ico(k)}${fmt(v,v<1?2:1)}</span>`).join(' ')} · ${fmt(D.hours/2,1)} h</b></div>
      <div class="kv"><span>Le prototype</span><b>${Object.entries(D.cost).map(([k,v])=>`<span class="cost">${this.ico(k)}${fmt(v*3,1)}</span>`).join(' ')} · 8 h</b></div>${bur?'':'<p class="small warn">Il faut un bureau d’études bâti pour lancer le prototype.</p>'}`;}
  // le Meumeu de face et de profil, ses plaques par-dessus
  figure(D){const sil=(side)=>{const X=side?2:0;const sh=REGIONS.map(r=>{const s=r.shape;const c=r.hoof?'#c9a57a':r.horn?'#d9b98c':'#e4d6bd';if(s.t==='ell')return `<ellipse cx="${s.c[X]}" cy="${-s.c[1]}" rx="${s.r[X]}" ry="${s.r[1]}" fill="${c}"/>`;
        if(s.t==='sph')return `<circle cx="${s.c[X]}" cy="${-s.c[1]}" r="${s.r}" fill="${c}"/>`;return `<line x1="${s.a[X]}" y1="${-s.a[1]}" x2="${s.b[X]}" y2="${-s.b[1]}" stroke="${c}" stroke-width="${2*s.r}" stroke-linecap="round"/>`;}).join('');
      const Z=D.zones;const pl=(z,shape)=>Z[z].t>0?shape(MCOL[Z[z].mat],.35+Math.min(.6,Z[z].t/6)):'';
      const plates=side?[pl('casque',(c,o)=>`<path d="M-.036 -.262 A .038 .045 0 0 1 .034 -.262 L .034 -.25 L -.036 -.25 Z" fill="${c}" opacity="${o}" stroke="#333" stroke-width=".001"/>`),
          pl('plastron',(c,o)=>`<rect x=".03" y="-.19" width=".018" height=".125" rx=".006" fill="${c}" opacity="${o}" stroke="#333" stroke-width=".001"/>`),
          pl('dos',(c,o)=>`<rect x="-.05" y="-.19" width=".018" height=".125" rx=".006" fill="${c}" opacity="${o}" stroke="#333" stroke-width=".001"/>`),
          pl('flancs',(c,o)=>`<rect x="-.03" y="-.18" width=".06" height=".08" rx=".01" fill="${c}" opacity="${o*.7}" stroke="#333" stroke-width=".001"/>`)].join('')
        :[pl('flancs',(c,o)=>`<rect x="-.066" y="-.19" width=".132" height=".11" rx=".02" fill="${c}" opacity="${o*.8}" stroke="#333" stroke-width=".001"/>`),
          pl('plastron',(c,o)=>`<rect x="-.045" y="-.19" width=".09" height=".125" rx=".014" fill="${c}" opacity="${o}" stroke="#333" stroke-width=".001"/>`),
          pl('casque',(c,o)=>`<path d="M-.039 -.258 A .039 .046 0 0 1 .039 -.258 L .039 -.25 L -.039 -.25 Z" fill="${c}" opacity="${o}" stroke="#333" stroke-width=".001"/>`)].join('');
      const face=side?'':`<g fill="#5a3f2a"><circle cx="-.02" cy="-.242" r=".004"/><circle cx=".02" cy="-.242" r=".004"/><circle cx="-.019" cy="-.207" r=".0035"/><circle cx=".019" cy="-.207" r=".0035"/></g>`;
      return `<svg class="azsil" viewBox="${side?'-.08':'-.11'} -.31 ${side?'.16':'.22'} .32">${sh}${side?'':face}${plates}</svg>`;};
    return `${sil(false)}${sil(true)}<div class="az-leg">${Object.entries(MATS).map(([m,M])=>`<span><i style="background:${MCOL[m]}"></i>${M.name}</span>`).join('')}</div>`;}
}
