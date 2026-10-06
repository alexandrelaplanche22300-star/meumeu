// Scénario 2, partie A — l'oreille du joueur. Un soldat meumeu à l'écoute, de nuit, entend des sources bèè à plusieurs distances.
// Chemins réels du jeu : noiseTick() pour train, usine, mine, chantier, abattage (sources fictives injectées à sa place, il ne lit
// que ces listes) ; emit() pour tirs et explosions ; la portée des pas vient de stepRange(). Aucun temps ne passe : ce sont des
// mesures d'acoustique pure. Durées en heures de jeu, angles en degrés, distances en cases (1 case = 4 m).
//   node test/bruits_nocturnes.mjs [nbGraines=20] [graineDeDépart=1]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');const {SOUND_LIFE}=await import('../js/perception.js');
const NS=+(process.argv[2]||20),S0=+(process.argv[3]||1);
const DS=[10,24,50,100];
const prng=s=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
const ang=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))*180/Math.PI;
const med=a=>{const v=a.filter(x=>x!=null).sort((p,q)=>p-q);return v.length?v[v.length>>1]:null;};const p90=a=>{const v=a.filter(x=>x!=null).sort((p,q)=>p-q);return v.length?v[Math.min(v.length-1,Math.floor(v.length*.9))]:null;};
const f=(v,d=0)=>v==null?'—':v.toFixed(d);
const walk=(W,x,y)=>x>3&&y>3&&x<W.N-3&&y<W.N-3&&TERRAIN[W.G.terrain[Math.floor(y)*W.N+Math.floor(x)]]?.walk&&W.occ[Math.floor(y)*W.N+Math.floor(x)]<0;
// sources : chaque entrée dit comment provoquer le bruit et quel « kind » il laisse dans s.heard
const SRC={
  train:{kind:'train',go:(W,x,y)=>viaNoise(W,{vehicles:[{k:'train',state:'go',x,y,f:'beee'}]})},
  usine:{kind:'usine',go:(W,x,y)=>viaNoise(W,{buildings:[{k:'poudrerie',done:true,ruin:false,working:true,i:x-1,j:y-1,f:'beee'}]})},
  mine:{kind:'mine',go:(W,x,y)=>viaNoise(W,{buildings:[{k:'mine',done:true,ruin:false,working:true,i:x-1,j:y-1,f:'beee'}]})},
  chantier:{kind:'chantier',go:(W,x,y)=>viaNoise(W,{units:[{f:'beee',hp:1,x,y,task:{kind:'build'},anim:'action'}]})},
  abattage:{kind:'abattage',go:(W,x,y)=>viaNoise(W,{units:[{f:'beee',hp:1,x,y,task:{kind:'gather',type:'tree'},anim:'action'}]})},
  'tir Bèè (149 dB)':{kind:'tirs',go:(W,x,y)=>W.emit({type:'shot',f:'beee',by:null,x,y,dB:149})},
  'tir silencieux (131 dB)':{kind:'tirs',go:(W,x,y)=>W.emit({type:'shot',f:'beee',by:null,x,y,dB:131})},
  explosion:{kind:'explosion',go:(W,x,y)=>W.emit({type:'boom',kind:'grenade',src:'beee',x,y})},
  'pas Bèè':{kind:'pas',go:(W,x,y)=>{const u={f:'beee',hp:1,x,y,band:null};const R=W.stepRange(u);if(Math.hypot(x-W._L.x,y-W._L.y)<R)W.meumeuHear(x,y,110+R*1.6,'pas');}}};
function viaNoise(W,extra){const s=W.s,save={b:s.buildings,v:s.vehicles,u:s.units};
  s.buildings=extra.buildings||[];s.vehicles=extra.vehicles||[];s.units=[W._L,...(extra.units||[])];W.noiT=1;
  try{W.noiseTick(1);}finally{s.buildings=save.b;s.vehicles=save.v;s.units=save.u;}}
function world(seed){const W=new World(seed);for(let h=0;h<6;h++)W.update(1);W.s.solar=.5;W._L=W.addUnit('meumeu','soldat',10,10);W._L.hp=1;W.s.units=W.s.units.filter(u=>u!==W._L);return W;}
// une mesure : source en (sx,sy), écouteur à distance d dans une direction tirée ; renvoie l'entrée entendue ou null
function measure(W,rnd,name,d,at){const S=SRC[name];let sx,sy,lx,ly,ok=false;
  for(let tries=0;tries<200&&!ok;tries++){if(at){sx=at[0]+(rnd()-.5)*20;sy=at[1]+(rnd()-.5)*20;}else{sx=25+rnd()*(W.N-50);sy=25+rnd()*(W.N-50);}const a=rnd()*6.283;lx=sx+Math.cos(a)*d;ly=sy+Math.sin(a)*d;ok=walk(W,sx,sy)&&walk(W,lx,ly);}
  if(!ok)return {skip:true};
  W._L.x=lx;W._L.y=ly;W.s.heard=[];const save=W.s.units;W.s.units=[W._L];   // seul l'écouteur entend
  S.go(W,sx,sy);W.s.units=save;
  const h=(W.s.heard||[]).filter(q=>q.kind===S.kind&&q.oid===W._L.id).sort((p,q)=>p.uncertainty-q.uncertainty)[0];
  const blocked=!W.los(lx,ly,sx,sy);
  return {heard:!!h,blocked,err:h?ang(h.angle,Math.atan2(sy-ly,sx-lx)):null,unc:h?.uncertainty,derr:h?Math.abs(h.d-d)/d*100:null,ttl:h?.ttl,inten:h?.intensity};}
const worlds=[];for(let s=S0;s<S0+NS;s++)worlds.push([s,world(s)]);
console.log(`### scénario 2A — acoustique de nuit · ${NS} graines · écouteur meumeu · cases de 4 m`);
console.log(`\ntaux d’écoute (%) | erreur angulaire médiane (°) — par source et par distance`);
console.log('source'.padEnd(26)+DS.map(d=>(d+' c').padStart(16)).join(''));
const table={};
for(const name of Object.keys(SRC)){let row=name.padEnd(26);table[name]={};
  for(const d of DS){const R=[];for(const [s,W] of worlds){const rnd=prng(s*7919+d);for(let k=0;k<5;k++){const m=measure(W,rnd,name,d);if(!m.skip)R.push(m);}}
    const rate=R.filter(r=>r.heard).length/Math.max(1,R.length)*100;table[name][d]={rate,err:med(R.map(r=>r.err)),p90:p90(R.map(r=>r.err)),unc:med(R.map(r=>r.unc)),derr:med(R.map(r=>r.derr)),n:R.length};
    row+=`${f(rate)}% | ${f(table[name][d].err)}°`.padStart(16);}
  console.log(row);}
console.log('\nerreur angulaire à 90 % (°) et incertitude médiane (rad) là où l’écoute est ≥ 50 %');
for(const name of Object.keys(SRC)){let row=name.padEnd(26);for(const d of DS){const t=table[name][d];row+=(t.rate>=50?`${f(t.p90)}° | ${f(t.unc,2)}`:'—').padStart(16);}console.log(row);}
// portée : plus grande distance où le bruit est entendu dans au moins 50 % / 90 % des essais (pas de 5 cases)
console.log('\nportée d’écoute (cases) : distance maximale avec ≥ 90 % puis ≥ 50 % d’écoute');
const range={};for(const name of Object.keys(SRC)){let r50=0,r90=0;for(let d=5;d<=170;d+=5){const R=[];for(const [s,W] of worlds){const rnd=prng(s*104729+d);for(let k=0;k<3;k++){const m=measure(W,rnd,name,d);if(!m.skip)R.push(m);}}
    const rt=R.filter(r=>r.heard).length/Math.max(1,R.length);if(rt>=.9)r90=d;if(rt>=.5)r50=d;}range[name]={r50,r90};console.log(name.padEnd(26),`${String(r90).padStart(4)} c (${r90*4} m)  /  ${String(r50).padStart(4)} c (${r50*4} m)`);}
const order=Object.entries(range).sort((a,b)=>b[1].r50-a[1].r50).map(([n])=>n);console.log('classement par portée :',order.join(' > '));
// ---- critères de la recette ----
console.log('\n===== critères =====');const line=(l,ok,d)=>console.log(`${ok?'PASS':'FAIL'}  ${l}${d?'  ['+d+']':''}`);
line('train > usine, mine > chantier > pas',range.train.r50>Math.max(range.usine.r50,range.mine.r50)&&Math.min(range.usine.r50,range.mine.r50)>range.chantier.r50&&range.chantier.r50>range['pas Bèè'].r50,`train ${range.train.r50}, usine ${range.usine.r50}, mine ${range.mine.r50}, chantier ${range.chantier.r50}, pas ${range['pas Bèè'].r50}`);
line('explosion > tir normal > tir silencieux > pas',range.explosion.r50>range['tir Bèè (149 dB)'].r50&&range['tir Bèè (149 dB)'].r50>range['tir silencieux (131 dB)'].r50&&range['tir silencieux (131 dB)'].r50>range['pas Bèè'].r50,`explosion ${range.explosion.r50}, tir ${range['tir Bèè (149 dB)'].r50}, silencieux ${range['tir silencieux (131 dB)'].r50}, pas ${range['pas Bèè'].r50}`);
line('train détectable à 100 cases',table.train[100].rate>=90,f(table.train[100].rate)+' %');
line('pas : portée courte (≤ 12 cases)',range['pas Bèè'].r50<=12,range['pas Bèè'].r50+' c');
for(const name of Object.keys(SRC)){const t=table[name][10];if(t.rate>=50)line(`précision proche (10 c, médiane < 15°) — ${name}`,t.err<15,f(t.err,1)+'° (90 % : '+f(t.p90,1)+'°)');}
for(const name of Object.keys(SRC)){const t=table[name][24];if(t.rate>=50)line(`précision moyenne (24 c, médiane < 30°) — ${name}`,t.err<30,f(t.err,1)+'° (90 % : '+f(t.p90,1)+'°)');}
line('précision lointaine : incertitude large (train à 100 c ≥ 0,5 rad)',table.train[100].unc>=.5,f(table.train[100].unc,2)+' rad');
// ---- obstacles : la même source vue depuis un abri de bâtiments ou à découvert, autour d’une ville bèè ----
console.log('\n===== obstacles (source = centre-ville bèè, écouteur à 24 cases, usine) =====');
{const B={clear:[],blocked:[]};for(const [s,W] of worlds){const c=W.s.beee.cities[0];const rnd=prng(s*31+5);for(let k=0;k<40;k++){const m=measure(W,rnd,'usine',24,[Math.floor(c.x),Math.floor(c.y)]);if(!m.skip)B[m.blocked?'blocked':'clear'].push(m);}}
  for(const k of ['clear','blocked'])console.log(`${k==='clear'?'à découvert':'derrière des bâtiments'} : ${B[k].length} essais · écouté ${f(B[k].filter(r=>r.heard).length/Math.max(1,B[k].length)*100)} % · incertitude médiane ${f(med(B[k].map(r=>r.unc)),2)} rad · erreur médiane ${f(med(B[k].map(r=>r.err)),1)}°`);
  line('bâtiments : modifient l’atténuation ou la précision',B.blocked.length>0&&(med(B.blocked.map(r=>r.unc))>med(B.clear.map(r=>r.unc))||B.blocked.filter(r=>r.heard).length<B.blocked.length),B.blocked.length+' essais bloqués');}
console.log('forêt et relief : `los()` ne les prend pas en compte (seuls bâtiments et fumée) — vérifié dans le code, voir rapport.');
// ---- mise à jour d’un contact et expiration ----
console.log('\n===== mise à jour et expiration =====');
{let better=0,worse=0,n=0;for(const [s,W] of worlds){const rnd=prng(s*17);for(let k=0;k<4;k++){
    // écouteur immobile ; deux explosions sur le même relèvement (10 c et 50 c) : loin puis près → l'incertitude doit baisser ;
    // près puis loin → elle ne doit pas remonter
    const lx=25+rnd()*(W.N-50),ly=25+rnd()*(W.N-50),a=rnd()*6.283;const P=d=>[lx+Math.cos(a)*d,ly+Math.sin(a)*d];const [n10x,n10y]=P(10),[f50x,f50y]=P(50);
    if(!walk(W,lx,ly)||!walk(W,n10x,n10y)||!walk(W,f50x,f50y))continue;W._L.x=lx;W._L.y=ly;
    const hear=(x,y)=>{const save=W.s.units;W.s.units=[W._L];W.emit({type:'boom',kind:'grenade',src:'beee',x,y});W.s.units=save;return (W.s.heard||[]).filter(h=>h.kind==='explosion').at(-1)?.uncertainty;};
    W.s.heard=[];const u50=hear(f50x,f50y);const u10=hear(n10x,n10y);
    W.s.heard=[];const v10=hear(n10x,n10y);const v50=hear(f50x,f50y);
    if(u50==null||u10==null||v10==null||v50==null)continue;n++;if(u10<u50)better++;if(v50>v10+1e-9)worse++;}}
  line('un bruit plus proche réduit l’incertitude du contact',better===n&&n>0,`${better}/${n}`);
  line('un bruit plus lointain, sur le même relèvement, ne dégrade pas un contact précis',worse===0&&n>0,`${worse}/${n} dégradés (le contact récent remplace toujours l’ancien)`);}
console.log('durée de vie des contacts (heures de jeu) : '+Object.entries(SOUND_LIFE).map(([k,v])=>`${k} ${(v/4).toFixed(2)} h`).join(' · '));
console.log('précision qui se dégrade avec l’âge : non — `uncertainty` est fixé à la création ; seul l’affichage s’estompe (view.js, `fresh`)');
// ---- pas des Meumeu entendus par les Bèè (portées par posture, nuit) ----
console.log('\n===== pas des Meumeu (portée d’écoute bèè, nuit, cases) =====');
{const W=worlds[0][1];for(const [k,u0] of [['soldat',{k:'soldat'}],['commando',{k:'commando'}]]){const rows=['debout','accroupi','couche'].map(p=>{const u=W.addUnit('meumeu',k,50,50);u.w=null;const R=W.stepRange(u,p);W.s.units=W.s.units.filter(x=>x!==u);return `${p} ${R.toFixed(1)} c`;});console.log(k.padEnd(10),rows.join(' · '));}
  const b=W.addUnit('beee','soldat',50,50);console.log('soldat bèè'.padEnd(10),`nuit ${W.stepRange(b).toFixed(1)} c`);W.s.units=W.s.units.filter(x=>x!==b);}
