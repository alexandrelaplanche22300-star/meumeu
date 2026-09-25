// Le bureau d'études : on dessine une arme, la physique répond. Rien n'est une note arbitraire — la vitesse sort de la poudre et
// du canon, la portée de la traînée et de la dispersion, la blessure du bloc de gélatine calculé pas à pas. Chaque avantage a son
// prix : une balle plus lourde porte plus loin et perce mieux, mais le soldat en porte moins et le recul monte ; plus de poudre,
// c'est plus vite, mais la pression use le tube et l'étui grossit l'arme ; l'automatique arrose, et vide les dépôts.
import {derive,gel,NOSES,BASES,CONSTRUCTIONS,ACTIONS,fmt} from './ballistics.js';
import {LIMITS,crateCost,weaponCost,protoCost,PROTO_HOURS} from './designs.js';
import {rng} from './gen.js';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const C_LO=Math.log(LIMITS.c[0]),C_HI=Math.log(LIMITS.c[1]);
const cToS=c=>Math.round((Math.log(c)-C_LO)/(C_HI-C_LO)*1000),sToC=s=>+Math.exp(C_LO+(C_HI-C_LO)*s/1000).toFixed(4);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';

export class Designer{
  constructor(host,{world,bureau,propose,ico,goodName,toArmor}){this.host=host;this.world=world;this.bureau=bureau;this.propose=propose;this.ico=ico;this.goodName=goodName;this.toArmor=toArmor;this.gelR=20;
    host.addEventListener('input',e=>{if(e.target.closest('#designer'))this.read(e.target);});
    host.addEventListener('change',e=>{if(e.target.id==='dz-from'){this.load(e.target.value);}});
    host.addEventListener('click',e=>{const b=e.target.closest('[data-dz]');if(!b)return;const [k,v]=b.dataset.dz.split(':');
      if(k==='close')this.close();else if(k==='armor'){this.toArmor?.();}else if(k==='gel'){this.gelR=+v;this.render();}else if(k==='go'){const r=this.propose(this.p,this.name);this.say(r.ok?r.text:r.why.join(' · '),r.ok?'good':'bad');if(r.ok)this.close();}
      else if(['nose','base','action','cons'].includes(k)){this.p[k]=v;this.sync();this.render();}});}
  get open(){return !this.host.hidden;}
  show(fromId='mle1'){this.host.hidden=false;this.load(fromId);}
  close(){this.host.hidden=true;}
  load(id){const d=this.world().design(id)||this.world().design('mle1');this.ref=d;this.p=JSON.parse(JSON.stringify(d.p));this.name=d.base?`${d.name.replace(/Mle \d+/,'')}Modèle ${Object.keys(this.world().s.designs).length}`.trim():`${d.name} (variante)`;this.build();this.render();}
  say(t,tone){const el=this.host.querySelector('.dz-say');if(el){el.textContent=t;el.className='dz-say '+tone;}}
  // la page, une fois ; ensuite on ne change que les chiffres
  build(){const p=this.p;const W=this.world();const ds=Object.values(W.s.designs).filter(d=>d.status!=='perdu');
    const seg=(k,opts)=>`<div class="seg">${Object.entries(opts).map(([v,o])=>`<button data-dz="${k}:${v}" class="${p[k]===v?'on':''}" title="${esc(o.desc||'')}">${esc(o.name)}</button>`).join('')}</div>`;
    const range=(id,label,min,max,step,val,hint)=>`<label class="dz-r"><span>${label}<em id="dz-v-${id}"></em></span><input type="range" id="dz-${id}" min="${min}" max="${max}" step="${step}" value="${val}"><small>${hint}</small></label>`;
    this.host.innerHTML=`<div class="dz" id="designer" role="dialog" aria-label="Bureau d’études">
      <header class="dz-head"><div><b>Bureau d’études</b><small>une arme, de la poudre à la plaie</small></div>
        <div class="seg"><button class="on">Armes</button><button data-dz="armor">Protections</button></div>
        <label class="dz-name">Nom <input id="dz-name" value="${esc(this.name)}" maxlength="28"></label>
        <label class="dz-name">Partir de <select id="dz-from">${ds.map(d=>`<option value="${d.id}" ${d.id===this.ref.id?'selected':''}>${esc(d.name)}${d.f==='beee'?' (bèè)':''}${d.status==='prototype'?' — prototype':''}</option>`).join('')}</select></label>
        <button class="ghost" data-dz="close">Fermer</button></header>
      <div class="dz-body">
        <section class="dz-col dz-ctl">
          <h3>La balle</h3>
          ${range('d','Calibre',LIMITS.d[0],LIMITS.d[1],LIMITS.d[2],p.d,'large : plus lourde, plus de cavité ; perce moins à masse égale')}
          ${range('l','Longueur',LIMITS.l[0],LIMITS.l[1],LIMITS.l[2],p.l,'longue : plus lourde, file mieux ; il faut plus de rayure pour la tenir')}
          <div class="dz-f"><span>Nez</span>${seg('nose',NOSES)}</div>
          <div class="dz-f"><span>Culot</span>${seg('base',BASES)}</div>
          <div class="dz-f"><span>Construction</span><div class="seg wrap">${Object.entries(CONSTRUCTIONS).map(([v,o])=>`<button data-dz="cons:${v}" class="${p.cons===v?'on':''}" title="${esc(o.desc)}">${esc(o.name)}</button>`).join('')}</div><small id="dz-consdesc"></small></div>
          <h3>La poudre, le canon</h3>
          ${range('c','Poudre',0,1000,1,cToS(p.c),'plus : plus vite — plus de pression, un étui et une arme plus gros')}
          ${range('L','Canon',LIMITS.L[0],LIMITS.L[1],LIMITS.L[2],p.L,'long : brûle toute la poudre, plus précis ; plus lourd, plus lent à épauler')}
          ${range('twist','Pas de rayure',LIMITS.twist[0],LIMITS.twist[1],LIMITS.twist[2],p.twist,'court : tient les balles longues ; trop long, elles basculent en vol')}
          <h3>L’arme</h3>
          <div class="dz-f"><span>Culasse</span>${seg('action',ACTIONS)}</div>
          ${range('rof','Cadence (automatique)',LIMITS.rof[0],LIMITS.rof[1],LIMITS.rof[2],p.rof,'plus : plus de suppression, plus de chaleur, les munitions fondent')}
          ${range('mag','Chargeur',LIMITS.mag[0],LIMITS.mag[1],LIMITS.mag[2],p.mag,'grand : moins de rechargements ; plus lourd')}
          <label class="dz-ck"><input type="checkbox" id="dz-heavy" ${p.heavy?'checked':''}> Canon lourd <small>— plus précis, tient la chaleur ; bien plus lourd</small></label>
        </section>
        <section class="dz-col dz-mid">
          <div class="dz-big" id="dz-big"></div>
          <h3>Le plan <small>la cartouche en coupe, l’arme à l’échelle d’un Meumeu de 30 cm</small></h3>
          <canvas id="dz-plan" width="760" height="230"></canvas>
          <h3>En vol <small>vitesse, énergie et chance de toucher un Meumeu debout, selon la distance</small></h3>
          <canvas id="dz-fly" width="640" height="220"></canvas>
          <h3>Dans le corps <small>bloc de gélatine de 16 cm, comme un Meumeu</small><span class="seg sm">${[5,20,50,100].map(r=>`<button data-dz="gel:${r}" class="${r===this.gelR?'on':''}">${r} m</button>`).join('')}</span></h3>
          <canvas id="dz-gel" width="640" height="240"></canvas><p class="dz-gelt" id="dz-gelt"></p>
        </section>
        <section class="dz-col dz-side">
          <h3>Les chiffres <small>face à ${esc(this.ref.name)}</small></h3><div id="dz-tab" class="dz-tab"></div>
          <h3>Le verdict</h3><ul id="dz-ver" class="dz-ver"></ul>
          <h3>Ce que ça coûte</h3><div id="dz-cost" class="dz-cost"></div>
          <div class="dz-go"><button data-dz="go" id="dz-go">Lancer le prototype</button><p class="dz-say quiet small"></p></div>
        </section></div></div>`;
    this.sync();}
  read(el){const id=el.id.replace('dz-','');if(id==='name'){this.name=el.value;return;}if(id==='heavy'){this.p.heavy=el.checked;}else if(id==='c')this.p.c=sToC(+el.value);else if(id in this.p)this.p[id]=+el.value;else return;this.sync();this.render();}
  sync(){const p=this.p;const $=id=>this.host.querySelector('#dz-v-'+id);const set=(id,t)=>{const e=$(id);if(e)e.textContent=t;};
    set('d',` ${fmt(p.d,1)} mm`);set('l',` ${fmt(p.l,1)} mm`);set('c',` ${fmt(p.c*1000,0)} mg`);set('L',` ${p.L} mm`);set('twist',` 1 tour / ${p.twist} mm`);set('rof',p.action==='auto'?` ${p.rof} coups/min`:' — (automatique seulement)');set('mag',` ${p.mag} coups`);
    const rof=this.host.querySelector('#dz-rof');if(rof)rof.disabled=p.action!=='auto';
    for(const b of this.host.querySelectorAll('[data-dz]')){const [k,v]=b.dataset.dz.split(':');if(['nose','base','action','cons'].includes(k))b.classList.toggle('on',p[k]===v);if(k==='gel')b.classList.toggle('on',+v===this.gelR);}
    const cd=this.host.querySelector('#dz-consdesc');if(cd)cd.textContent=CONSTRUCTIONS[p.cons].desc;}
  render(){const D=derive(this.p),R=derive(this.ref.p);const W=this.world();const $=id=>this.host.querySelector('#'+id);if(!$('dz-big'))return;
    const pen=D.pen(D.at(30).v),penR=R.pen(R.at(30).v);
    $('dz-big').innerHTML=[['Vitesse',`${Math.round(D.v0)}`,'m/s'],['Énergie',fmt(D.E0,1),'J'],['Portée utile',`${D.eff}`,'m'],['Perce à 30 m',fmt(pen,2),'mm']].map(([k,v,u])=>`<div><small>${k}</small><b>${v}<i>${u}</i></b></div>`).join('')+`<div class="dz-cal"><small>Cartouche</small><b>${esc(D.name)}</b></div>`;
    // le tableau, avec l'écart à la référence
    const row=(k,v,rv,u,dec=0,better=1)=>{const d=v-rv;const tone=Math.abs(d)<Math.abs(rv)*.02+1e-9?'':((d>0)===(better>0)?'good':'bad');return `<div class="kv"><span>${k}</span><b>${fmt(v,dec)} ${u}${better&&tone?` <em class="${tone}">${d>0?'+':''}${fmt(d,dec)}</em>`:''}</b></div>`;};
    $('dz-tab').innerHTML=row('Balle',D.m*1000,R.m*1000,'mg',0,0)+row('Cartouche entière',D.rm,R.rm,'g',2,-1)+row('Pression',D.P,R.P,'MPa',0,-1)+row('Stabilité (Sg)',D.Sg,R.Sg,'',2,0)+row('Coefficient balistique',D.BC,R.BC,'kg/m²',0,1)+
      row('Dispersion',D.moa,R.moa,'MOA',1,-1)+row('Arme chargée',D.mass*1000,R.mass*1000,'g',0,-1)+row('Recul',D.recoil,R.recoil,'J',2,-1)+row('Temps pour viser',D.aim,R.aim,'s',2,-1)+
      row('Cadence',D.rpm,R.rpm,'coups/min',0,1)+row('Vie du canon',D.life,R.life,'coups',0,1)+row('Portés par soldat',D.carry,R.carry,'coups',0,1)+row('Par caisse',D.perCrate,R.perCrate,'coups',0,1);
    $('dz-ver').innerHTML=D.verdicts.map(v=>`<li class="${v.tone}">${v.tone==='good'?'＋':v.tone==='bad'?'－':'·'} ${esc(v.t)}</li>`).join('');
    const cc=crateCost(this.p),wc=weaponCost(this.p),pc=protoCost(this.p);const costs=o=>Object.entries(o).map(([k,n])=>`<span class="cost">${this.ico(k)}${fmt(n,n<1?2:1)}</span>`).join(' ');
    $('dz-cost').innerHTML=`<div class="kv"><span>Une caisse (${D.perCrate} coups)</span><b>${costs(cc)}</b></div><div class="kv"><span>Une arme</span><b>${costs(wc)} · ${fmt(D.hoursW/2,1)} h</b></div><div class="kv"><span>Le prototype</span><b>${costs(pc)} · ${PROTO_HOURS} h</b></div>
      <p class="quiet small">Adopté, il faut encore l’outillage de la manufacture (4 pièces, 1 fer, 6 h) — et le perdre si elle tombe.</p>`;
    const bur=this.bureau();const can=bur?W.canPropose(bur,this.p):{ok:false,why:['un bureau d’études bâti (choisissez-le, puis « Concevoir »)']};const go=$('dz-go');go.disabled=!can.ok;go.title=can.ok?'':can.why.join(', ');
    if(!can.ok)this.say(`Il faut : ${can.why.join(' · ')}`,'warn');else this.say(`Prêt : ${PROTO_HOURS} h au bureau d’études, puis adopté.`,'');
    this.drawPlan(D);this.drawFly(D,R);this.drawGel(D);}
  // Le plan : à gauche, la cartouche en coupe (l'étui de laiton, la poudre, la balle et sa forme, la couleur de sa pointe) ;
  // à droite, l'arme entière et un Meumeu debout à la même échelle. Un bleu d'architecte, lisible en clair comme en sombre.
  drawPlan(D){const cv=this.host.querySelector('#dz-plan');if(!cv)return;const x=cv.getContext('2d');const W=cv.width,H=cv.height;const p=D.p;
    x.setTransform(1,0,0,1,0,0);x.fillStyle='#123047';x.fillRect(0,0,W,H);x.strokeStyle='rgba(160,200,230,.12)';x.lineWidth=1;for(let g=0;g<W;g+=16){x.beginPath();x.moveTo(g,0);x.lineTo(g,H);x.stroke();}for(let g=0;g<H;g+=16){x.beginPath();x.moveTo(0,g);x.lineTo(W,g);x.stroke();}
    const ink='#dcecf7',dim='#8fc3e6';x.font='11px ui-monospace,Consolas,monospace';
    // ---- la cartouche ----
    const N=NOSES[p.nose],C=CONSTRUCTIONS[p.cons];const d=p.d,l=D.l,nose=D.noseLen,Dc=d*(D.pistol?1.25:1.45),caseLen=D.caseLen;const neck=D.pistol?0:d*1.1,shoulder=D.pistol?0:(Dc-d)*.9;const out=l*.7,seat=l-out;const COL=caseLen+out;
    const sc=Math.min(300/COL,120/Dc);const X0=18,Y=H/2+6;const px=v=>X0+v*sc,py=v=>Y-v*sc;
    const body=caseLen-neck-shoulder;
    // l'étui : culot à gorge, corps, épaulement, collet
    x.fillStyle='#c9a043';x.strokeStyle='#6d5418';x.lineWidth=1.2;x.beginPath();x.moveTo(px(0),py(Dc/2*.92));x.lineTo(px(d*.12),py(Dc/2*.92));x.lineTo(px(d*.2),py(Dc/2*.78));x.lineTo(px(d*.36),py(Dc/2*.78));x.lineTo(px(d*.42),py(Dc/2));
    x.lineTo(px(body),py(Dc/2*.97));x.lineTo(px(body+shoulder),py(d/2*1.06));x.lineTo(px(caseLen),py(d/2*1.06));x.lineTo(px(caseLen),py(-d/2*1.06));x.lineTo(px(body+shoulder),py(-d/2*1.06));x.lineTo(px(body),py(-Dc/2*.97));
    x.lineTo(px(d*.42),py(-Dc/2));x.lineTo(px(d*.36),py(-Dc/2*.78));x.lineTo(px(d*.2),py(-Dc/2*.78));x.lineTo(px(d*.12),py(-Dc/2*.92));x.lineTo(px(0),py(-Dc/2*.92));x.closePath();x.fill();x.stroke();
    // la coupe : la moitié du haut ouverte, la poudre dedans
    x.fillStyle='#2a2418';x.beginPath();x.rect(px(d*.5),py(Dc/2*.8),(body-d*.5)*sc,Dc/2*.8*sc);x.fill();const fill=Math.min(1,.55+p.c*20);x.fillStyle='#6b6b52';for(let k=0;k<180*fill;k++){const gx=d*.5+Math.random()*(body-d*.5)*fill,gy=Math.random()*Dc/2*.8;x.fillRect(px(gx),py(gy),1.6,1.6);}
    // la balle : ce qui dépasse, et (en pointillés) ce qui est serti dans le collet
    const b0=caseLen-seat;const shank=l-nose;const bt=p.base==='bt';const r=d/2;
    x.beginPath();x.moveTo(px(b0+(bt?d*.35:0)),py(bt?r*.72:r));if(bt)x.lineTo(px(b0+d*.35),py(r));x.lineTo(px(b0+shank),py(r));
    const tip=b0+l;if(p.nose==='plate'){x.lineTo(px(tip-nose*.2),py(r*.95));x.lineTo(px(tip),py(r*.55));x.lineTo(px(tip),py(-r*.55));x.lineTo(px(tip-nose*.2),py(-r*.95));}
    else{const k=p.nose==='pointue'?.08:p.nose==='ogive'?.3:.55;x.quadraticCurveTo(px(b0+shank+nose*.75),py(r),px(tip),py(r*k));x.lineTo(px(tip),py(-r*k));x.quadraticCurveTo(px(b0+shank+nose*.75),py(-r),px(b0+shank),py(-r));}
    x.lineTo(px(b0+(bt?d*.35:0)),py(-r));if(bt)x.lineTo(px(b0),py(-r*.72));x.closePath();
    const jacket=C.core?'#a8744a':C.expand?'#b87333':'#c07a3e';x.fillStyle=jacket;x.fill();x.strokeStyle='#5a3310';x.stroke();
    // l'intérieur de la balle, dans la moitié coupée : le plomb, le noyau d'acier ou de verre, le creux
    x.save();x.beginPath();x.rect(px(b0),py(r),l*sc,r*sc);x.clip();x.fillStyle='#8d9196';x.fillRect(px(b0+d*.12),py(r*.82),(l-nose*.6)*sc,r*.82*sc);
    if(C.core){x.fillStyle=C.rare?'#5fd1c1':'#40464d';x.fillRect(px(b0+d*.25),py(r*.5),(l-nose*.4)*sc,r*.5*sc);}
    if(p.cons==='hp'){x.fillStyle='#2a2418';x.beginPath();x.moveTo(px(tip),py(r*.4));x.lineTo(px(tip-nose*.7),py(0));x.lineTo(px(tip),py(0));x.fill();}
    if(C.he){x.fillStyle='#f0c419';x.fillRect(px(b0+shank*.3),py(r*.6),shank*.6*sc,r*.6*sc);}x.restore();
    // la couleur de la pointe dit ce qu'elle est
    const TIP={ap:'#111',apv:'#6a4bc4',inc:'#2d6fd6',trc:'#d23a2e',he:'#f0c419',sp:'#8d9196',hp:null,fmj:null,fmjm:null}[p.cons];if(TIP){x.fillStyle=TIP;x.beginPath();x.arc(px(tip-nose*.1),py(0),Math.max(1.5,r*.55*sc),0,6.3);x.fill();}
    x.setLineDash([3,3]);x.strokeStyle='rgba(255,255,255,.55)';x.strokeRect(px(b0),py(r),seat*sc,d*sc);x.setLineDash([]);
    // les cotes
    const cote=(a,b,y,t)=>{x.strokeStyle=dim;x.fillStyle=dim;x.lineWidth=1;x.beginPath();x.moveTo(px(a),y);x.lineTo(px(b),y);x.stroke();for(const e of [a,b]){x.beginPath();x.moveTo(px(e),y-4);x.lineTo(px(e),y+4);x.stroke();}x.textAlign='center';x.fillText(t,(px(a)+px(b))/2,y-4);x.textAlign='left';};
    cote(0,caseLen,py(-Dc/2)+18,`étui ${fmt(caseLen,1)} mm`);cote(b0,tip,py(Dc/2)-14,`balle ${fmt(l,1)} mm · ${fmt(D.m*1000,0)} mg`);cote(0,COL,H-12,`cartouche ${fmt(COL,1)} mm · ${fmt(D.rm,2)} g`);
    x.fillStyle=ink;x.fillText(`⌀ ${fmt(d,1)} mm · ${N.name.toLowerCase()} · ${C.name.toLowerCase()}`,X0,16);x.fillStyle=dim;x.fillText(`poudre ${fmt(p.c*1000,0)} mg · ${Math.round(D.P)} MPa`,X0,30);
    // ---- l'arme, et un Meumeu à côté ----
    const wall=d*(.35+.00075*D.P)*(p.heavy?1.5:1),Dout=d+2*wall;const actLen=COL*2.4+8,stock=70,Lb=p.L;const total=stock+actLen+Lb;const A0=W*.46,A1=W-86;const s2=Math.min((A1-A0)/Math.max(total,120),.6);
    const gx=v=>A0+v*s2,gy=H*.52,body2=Math.max(10,Dc*3.2+6);
    x.fillStyle='#8a5a33';x.strokeStyle='#3b2412';x.lineWidth=1.2;x.beginPath();x.moveTo(gx(0),gy+body2*.9);x.lineTo(gx(stock*.15),gy-body2*.2*s2*3);x.lineTo(gx(stock),gy-body2*.25*s2*2);x.lineTo(gx(stock),gy+body2*.5*s2*3);x.lineTo(gx(stock*.55),gy+body2*.5*s2*3+4);x.closePath();x.fill();x.stroke();
    x.fillStyle='#59616a';x.strokeStyle='#23282d';x.fillRect(gx(stock),gy-body2*s2*1.2,actLen*s2,body2*s2*2.2);x.strokeRect(gx(stock),gy-body2*s2*1.2,actLen*s2,body2*s2*2.2);
    if(p.action==='verrou'){x.strokeStyle='#c9cdd2';x.lineWidth=2;x.beginPath();x.moveTo(gx(stock+actLen*.35),gy-body2*s2*.4);x.lineTo(gx(stock+actLen*.35)+8,gy+body2*s2*1.6);x.stroke();x.fillStyle='#c9cdd2';x.beginPath();x.arc(gx(stock+actLen*.35)+8,gy+body2*s2*1.6,2.5,0,6.3);x.fill();}
    const bw=Math.max(2,Dout*s2*2.2);x.fillStyle=p.heavy?'#2d3136':'#3a3f44';x.fillRect(gx(stock+actLen),gy-bw/2,Lb*s2,bw);x.fillStyle='#c9cdd2';x.fillRect(gx(stock+actLen+Lb)-3,gy-bw/2-4,2,4);
    if(p.mag>5){const mh=Math.min(60,8+p.mag*D.rm*.9);x.fillStyle='#474e55';x.fillRect(gx(stock+actLen*.4),gy+body2*s2,COL*s2*1.2+6,mh*s2*3);x.strokeStyle='#23282d';x.strokeRect(gx(stock+actLen*.4),gy+body2*s2,COL*s2*1.2+6,mh*s2*3);}
    if(p.heavy){x.strokeStyle='#23282d';x.lineWidth=1.5;const bx=gx(stock+actLen+Lb*.7);x.beginPath();x.moveTo(bx,gy);x.lineTo(bx-10,gy+26);x.moveTo(bx,gy);x.lineTo(bx+10,gy+26);x.stroke();}
    // le Meumeu debout : 30 cm, à la même échelle
    const mx=A1+44,m=v=>v*1000*s2,base=H-22;x.fillStyle='rgba(236,220,188,.9)';x.strokeStyle='#8a7a5a';x.lineWidth=1;
    const el=(cx,cy,rx,ry)=>{x.beginPath();x.ellipse(mx+m(cx),base-m(cy),m(rx),m(ry),0,0,6.3);x.fill();x.stroke();};
    el(-.033,.035,.024,.035);el(.033,.035,.024,.035);el(0,.11,.06,.058);el(-.068,.12,.018,.04);el(.068,.12,.018,.04);el(0,.248,.037,.044);el(0,.19,.039,.034);el(-.053,.258,.02,.017);el(.053,.258,.02,.017);
    x.fillStyle='#5a3f2a';for(const [ex,ey] of [[-.02,.242],[.02,.242],[-.019,.207],[.019,.207]]){x.beginPath();x.arc(mx+m(ex),base-m(ey),Math.max(1,m(.004)),0,6.3);x.fill();}
    x.strokeStyle=dim;x.beginPath();x.moveTo(mx+m(.075),base);x.lineTo(mx+m(.075),base-m(.3));x.stroke();x.fillStyle=dim;x.fillText('30 cm',mx+m(.075)+3,base-m(.15));
    x.strokeStyle=dim;x.beginPath();x.moveTo(gx(0),H-10);x.lineTo(gx(total),H-10);x.stroke();x.textAlign='center';x.fillText(`arme ${fmt(total/10,1)} cm · canon ${fmt(Lb/10,1)} cm · ${Math.round(D.mass*1000)} g chargée`,(gx(0)+gx(total))/2,H-14);x.textAlign='left';
    x.fillStyle=ink;x.fillText(`${ACTIONS[p.action].name.toLowerCase()}${p.action==='auto'?` · ${p.rof} coups/min`:''} · chargeur ${p.mag}${p.heavy?' · canon lourd, bipied':''}`,A0,16);}
  // vitesse et énergie selon la distance ; la chance de toucher
  drawFly(D,R){const cv=this.host.querySelector('#dz-fly');const x=cv.getContext('2d');const w=cv.width,h=cv.height;x.clearRect(0,0,w,h);const ink=css('--ink'),muted=css('--muted'),line=css('--line'),teal=css('--teal'),orange=css('--orange'),red=css('--red');
    const X0=44,X1=w-44,Y0=12,Y1=h-28;const maxR=200;const vmax=Math.max(D.v0,R.v0)*1.05,emax=Math.max(D.E0,R.E0)*1.05;const X=r=>X0+(X1-X0)*r/maxR;
    x.font='12px system-ui';x.fillStyle=muted;x.strokeStyle=line;x.lineWidth=1;for(let r=0;r<=maxR;r+=50){x.beginPath();x.moveTo(X(r),Y0);x.lineTo(X(r),Y1);x.stroke();x.fillText(`${r} m`,X(r)-12,h-10);}
    for(let f=0;f<=1;f+=.25){const y=Y1-(Y1-Y0)*f;x.beginPath();x.moveTo(X0,y);x.lineTo(X1,y);x.stroke();}
    x.textAlign='right';x.fillStyle=teal;x.fillText(`${Math.round(vmax)} m/s`,X0-4,Y0+8);x.textAlign='left';x.fillStyle=orange;x.fillText(`${fmt(emax,0)} J`,X1+4,Y0+8);
    const plot=(fn,max,col,dash=[])=>{x.setLineDash(dash);x.strokeStyle=col;x.lineWidth=2;x.beginPath();for(let r=0;r<=maxR;r+=2){const v=fn(r);const y=Y1-(Y1-Y0)*Math.min(1,v/max);r?x.lineTo(X(r),y):x.moveTo(X(r),y);}x.stroke();x.setLineDash([]);};
    plot(r=>R.at(r).v,vmax,teal+'66',[4,4]);plot(r=>R.at(r).E,emax,orange+'66',[4,4]);plot(r=>D.at(r).v,vmax,teal);plot(r=>D.at(r).E,emax,orange);plot(r=>D.hitP(r),1,ink,[1,3]);
    x.fillStyle=ink;x.fillText('touche (sur 1)',X(maxR*.62),Y1-(Y1-Y0)*Math.min(1,D.hitP(maxR*.6))-6);if(D.eff){x.strokeStyle=red;x.setLineDash([2,3]);x.beginPath();x.moveTo(X(Math.min(maxR,D.eff)),Y0);x.lineTo(X(Math.min(maxR,D.eff)),Y1);x.stroke();x.setLineDash([]);x.fillStyle=red;x.fillText('portée utile',X(Math.min(maxR,D.eff))+4,Y0+22);}
    x.fillStyle=muted;x.fillText('— cette arme   - - la référence',X0+6,Y0+12);}
  // le bloc de gélatine, vu de côté : le trajet (sa couleur dit la bascule), la cavité temporaire, les éclats
  drawGel(D){const cv=this.host.querySelector('#dz-gel');const x=cv.getContext('2d');const w=cv.width,h=cv.height;x.clearRect(0,0,w,h);const v=D.at(this.gelR).v;const g=gel(D,v,rng(3),.16);
    const X0=20,X1=w-20,Yc=h/2-6,Lm=.16;const k=(X1-X0)/Lm;const X=z=>X0+z*k,Y=y=>Yc-y*k;const half=Math.min(.03*k,Yc-10);
    x.fillStyle='rgba(236,204,150,.35)';x.fillRect(X0,Yc-half,X1-X0,2*half);x.strokeStyle='rgba(180,140,90,.6)';x.strokeRect(X0,Yc-half,X1-X0,2*half);
    x.fillStyle='rgba(215,90,60,.25)';x.beginPath();x.moveTo(X(0),Yc);for(const t of g.R.tc)x.lineTo(X(t.p[2]),Yc-Math.min(half,t.r*k));for(const t of [...g.R.tc].reverse())x.lineTo(X(t.p[2]),Yc+Math.min(half,t.r*k));x.closePath();x.fill();
    for(const f of g.R.frags){x.strokeStyle='rgba(200,110,40,.8)';x.lineWidth=1;x.beginPath();f.pts.forEach((q,i)=>{const px=X(q.p[2]),py=Y(q.p[1]);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}
    const P=g.R.path;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const yaw=Math.min(1,b.yaw/(Math.PI/2));x.strokeStyle=`rgb(${Math.round(90+150*yaw)},${Math.round(60-30*yaw)},${Math.round(40)})`;x.lineWidth=Math.max(1.5,b.d/1000*k*.9);x.beginPath();x.moveTo(X(Math.max(0,a.p[2])),Y(a.p[1]));x.lineTo(X(Math.max(0,b.p[2])),Y(b.p[1]));x.stroke();}
    let row=0;const tag=(z,t,col)=>{if(z==null)return;x.strokeStyle=col;x.lineWidth=1.5;x.setLineDash([3,3]);x.beginPath();x.moveTo(X(z),Yc-half);x.lineTo(X(z),Yc+half);x.stroke();x.setLineDash([]);x.font='600 12px system-ui';const tw=x.measureText(t).width;const ty=Yc-half+14+row*16;row++;x.fillStyle='rgba(255,255,255,.75)';x.fillRect(X(z)+2,ty-11,tw+6,15);x.fillStyle=col;x.fillText(t,X(z)+5,ty);};
    tag(g.yawAt,`bascule ${fmt(g.yawAt*100,1)} cm`,'#b3261e');tag(g.fragAt,`se brise ${fmt(g.fragAt*100,1)} cm`,'#c86a1f');if(!g.exit)tag(g.depth,`arrêtée ${fmt(g.depth*100,1)} cm`,css('--ink'));
    x.fillStyle=css('--muted');x.font='12px system-ui';for(let c=0;c<=16;c+=4)x.fillText(`${c} cm`,X(c/100)-8,h-6);
    const t=this.host.querySelector('#dz-gelt');const exitE=.5*D.m/1000*g.vOut**2;
    t.innerHTML=`À ${this.gelR} m, elle arrive à <b>${Math.round(v)} m/s</b> (${fmt(.5*D.m/1000*v*v,1)} J) et laisse <b>${fmt(g.E,1)} J</b> dans le bloc${g.exit?` — elle en ressort à ${Math.round(g.vOut)} m/s (${fmt(exitE,1)} J perdus pour la blessure)`:''}. `+
      `${g.yawAt!=null?`Elle bascule à ${fmt(g.yawAt*100,1)} cm. `:'Elle reste droite. '}${g.fragmented?'Elle se fragmente : des éclats partout. ':''}${g.expanded?'Elle s’expanse. ':''}Cavité temporaire jusqu’à ${fmt(g.maxTc*2*1000,1)} mm de large, à ${fmt(g.tcAt*100,1)} cm : elle déchire le foie, la rate, le cerveau.`;}
}
