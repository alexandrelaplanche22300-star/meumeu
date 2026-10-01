// Scénario 2C — ce que les Bèè entendent. Règle de conception : un bruit ne leur donne qu'un RELÈVEMENT (direction + incertitude),
// jamais la position ni la distance de la source ; seule une vue directe donne une position.
// Les mesures passent par les chemins réels : shotNoise/beeeHear (tirs), emit « boom » (explosions), stepsTick-équivalent (pas),
// noiseTick (bruit de travail des Meumeu). Un seul Bèè écoute, pour contrôler qui entend.
//   node test/bruits_bee.mjs [nbGraines=20] [graineDeDépart=1]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const NS=+(process.argv[2]||20),S0=+(process.argv[3]||1);
const prng=s=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
const ang=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))*180/Math.PI;
const walk=(W,x,y)=>x>3&&y>3&&x<W.N-3&&y<W.N-3&&TERRAIN[W.G.terrain[Math.floor(y)*W.N+Math.floor(x)]]?.walk&&W.occ[Math.floor(y)*W.N+Math.floor(x)]<0;
const med=a=>{const v=a.filter(x=>x!=null).sort((p,q)=>p-q);return v.length?v[v.length>>1]:null;};const f=(v,d=1)=>v==null?'—':v.toFixed(d);
function world(seed){const W=new World(seed);for(let h=0;h<6;h++)W.update(1);W.s.solar=.5;W.ug=null;   // near() : parcours simple des unités
  W._L=W.addUnit('beee','soldat',10,10);W._L.hp=1;W.s.units=W.s.units.filter(u=>u!==W._L);W._M=W.addUnit('meumeu','soldat',10,10);W.s.units=W.s.units.filter(u=>u!==W._M);return W;}
// place l'écouteur bèè et une source à distance d ; renvoie les positions
function setup(W,rnd,d){for(let k=0;k<200;k++){const sx=25+rnd()*(W.N-50),sy=25+rnd()*(W.N-50),a=rnd()*6.283,lx=sx+Math.cos(a)*d,ly=sy+Math.sin(a)*d;if(walk(W,sx,sy)&&walk(W,lx,ly)){W._L.x=lx;W._L.y=ly;W.s.beee.alerts=[];W.s.beee.lead=null;W.s.units=[W._L];return {sx,sy,lx,ly,a};}}return null;}
const SRC={
  'tir 149 dB':(W,x,y)=>W.beeeHear(x,y,149,'tir'),
  'tir silencieux 131 dB':(W,x,y)=>W.beeeHear(x,y,131,'tir'),
  'claquement 141 dB':(W,x,y)=>W.beeeHear(x,y,141,'claquement'),
  'explosion (grenade meumeu)':(W,x,y)=>W.emit({type:'boom',kind:'grenade',src:'meumeu',x,y}),
  'pas d’un Meumeu':(W,x,y)=>{const R=W.stepRange(W._M);W.beeeHear(x,y,110+R*1.6,'pas');}};
const worlds=[];for(let s=S0;s<S0+NS;s++)worlds.push([s,world(s)]);
const line=(l,ok,d)=>console.log(`${ok?'PASS':'FAIL'}  ${l}${d?'  ['+d+']':''}`);
console.log(`### scénario 2C — ce que les Bèè entendent · ${NS} graines · nuit`);
console.log('\nsource'.padEnd(30)+'distance'.padStart(9)+'alertes'.padStart(9)+'sans position'.padStart(15)+'erreur médiane'.padStart(16)+'  cône contient la source');
let leaks=0,total=0;
for(const [name,go] of Object.entries(SRC)){for(const d of [6,10,24,36]){let n=0,cones=0,noPos=0,inside=0;const errs=[];
    for(const [s,W] of worlds){const rnd=prng(s*977+d);for(let k=0;k<4;k++){const P=setup(W,rnd,d);if(!P)continue;go(W,P.sx,P.sy);
        const al=W.s.beee.alerts||[];if(!al.length)continue;n++;const a=al.at(-1);total++;
        const isCone=a.cone===true;if(isCone)cones++;const ok=isCone&&a.r===0&&!('d' in a)&&!('estX' in a);if(ok)noPos++;else leaks++;
        if(isCone){errs.push(ang(a.bearing,Math.atan2(P.sy-a.oy,P.sx-a.ox)));if(W.alertCovers(a,P.sx,P.sy,0))inside++;}}}
    console.log(name.padEnd(30)+String(d).padStart(9)+`${n}`.padStart(9)+`${noPos}/${n}`.padStart(15)+(errs.length?`${f(med(errs))}°`:'—').padStart(16)+`  ${inside}/${cones}`);}}
line('AUCUNE alerte sonore ne porte de position ni de distance estimée',leaks===0&&total>0,`${leaks} fuites sur ${total} alertes`);
// ---- l'apex du cône est l'écouteur, jamais la source (sauf s'il en est tout près) ----
{let bad=0,n=0;for(const [s,W] of worlds){const rnd=prng(s*31);for(let k=0;k<4;k++){const P=setup(W,rnd,30);if(!P)continue;W.beeeHear(P.sx,P.sy,149,'tir');const a=W.s.beee.alerts.at(-1);if(!a)continue;n++;if(Math.hypot(a.x-P.sx,a.y-P.sy)<20)bad++;}}
  line('l’apex du cône est l’écouteur, pas la source (source à 30 c)',bad===0&&n>0,`${bad}/${n} trop proches de la source`);}
// ---- fusion : un bruit lointain ne dégrade jamais un contact plus précis ----
console.log('\n===== fusion des contacts (même écouteur, même relèvement) =====');
{let ba=0,bb=0,bc=0,bd=0,n=0;for(const [s,W] of worlds){const rnd=prng(s*17);for(let k=0;k<4;k++){
    const P=setup(W,rnd,10);if(!P)continue;const far={x:P.lx+(P.sx-P.lx)*5,y:P.ly+(P.sy-P.ly)*5},near={x:P.sx,y:P.sy};if(!walk(W,far.x,far.y))continue;   // même relèvement : source à 10 c puis à 50 c
    W.s.beee.alerts=[];W.beeeHear(far.x,far.y,190,'tir');const halfFar=W.s.beee.alerts.at(-1)?.half;W.beeeHear(near.x,near.y,190,'tir');const A1=W.s.beee.alerts;const halfAfter=A1.at(-1)?.half;const n1=A1.length;
    W.s.beee.alerts=[];W.beeeHear(near.x,near.y,190,'tir');const halfNear=W.s.beee.alerts.at(-1)?.half;W.beeeHear(far.x,far.y,190,'tir');const A2=W.s.beee.alerts;const halfAfter2=A2.at(-1)?.half;const n2=A2.length;
    if(halfFar==null||halfNear==null)continue;n++;
    if(halfAfter<=halfFar+1e-9&&halfAfter<halfFar)ba++;            // loin puis près : le cône se resserre
    if(halfAfter2<=halfNear+1e-9)bb++;                             // près puis loin : le cône ne s'élargit pas
    if(n1===1)bc++;if(n2===1)bd++;}}
  line('bruit lointain puis proche : le cône se resserre',ba===n&&n>0,`${ba}/${n}`);
  line('bruit proche puis lointain : le cône ne s’élargit jamais',bb===n&&n>0,`${bb}/${n}`);
  line('les deux bruits fusionnent en une seule alerte (loin→près)',bc===n&&n>0,`${bc}/${n}`);
  line('les deux bruits fusionnent en une seule alerte (près→loin)',bd===n&&n>0,`${bd}/${n}`);}
// ---- côté Meumeu : même règle ----
{let ok1=0,ok2=0,n=0;for(const [s,W] of worlds){const rnd=prng(s*29);for(let k=0;k<4;k++){
    const sx=25+rnd()*(W.N-50),sy=25+rnd()*(W.N-50),a=rnd()*6.283;const P=d=>[sx+Math.cos(a)*d,sy+Math.sin(a)*d];const [n10x,n10y]=P(10),[f50x,f50y]=P(50);if(!walk(W,sx,sy)||!walk(W,n10x,n10y)||!walk(W,f50x,f50y))continue;
    const ear=W.addUnit('meumeu','soldat',sx,sy);W.s.units=[ear];const hear=(x,y)=>{W.emit({type:'boom',kind:'grenade',src:'beee',x,y});return (W.s.heard||[]).filter(h=>h.kind==='explosion').at(-1)?.uncertainty;};
    W.s.heard=[];const uf=hear(f50x,f50y),un=hear(n10x,n10y);W.s.heard=[];const vn=hear(n10x,n10y),vf=hear(f50x,f50y);
    if([uf,un,vn,vf].some(v=>v==null))continue;n++;if(un<uf)ok1++;if(vf<=vn+1e-9)ok2++;}}
  console.log('\n===== côté Meumeu (perception.js) =====');
  line('bruit lointain puis proche : l’incertitude baisse',ok1===n&&n>0,`${ok1}/${n}`);
  line('bruit proche puis lointain : l’incertitude ne remonte pas',ok2===n&&n>0,`${ok2}/${n}`);}
// ---- bruit de travail des Meumeu (chantier) entendu par un Bèè : relèvement seulement ----
console.log('\n===== bruit de chantier meumeu entendu par un Bèè =====');
{let n=0,coneLead=0,posAlert=0;for(const [s,W] of worlds){const rnd=prng(s*53);for(let k=0;k<4;k++){const P=setup(W,rnd,12);if(!P)continue;
      const worker={f:'meumeu',hp:1,x:P.sx,y:P.sy,task:{kind:'build'},anim:'action',id:9e6};const save={b:W.s.buildings,v:W.s.vehicles,u:W.s.units};
      W.s.buildings=[];W.s.vehicles=[];W.s.units=[W._L,worker];W.noiT=1;W.s.beee.noiseT={};
      try{W.noiseTick(1);}finally{W.s.buildings=save.b;W.s.vehicles=save.v;W.s.units=save.u;}
      n++;const lead=W.s.beee.lead;if(lead?.cone===true&&!('why' in lead&&false))coneLead++;
      // aucune alerte positionnelle (r > 0) : seulement des cônes
      if((W.s.beee.alerts||[]).some(a=>!a.cone))posAlert++;}}
  line('le « lead » du bruit est un relèvement (cone:true), pas un point',coneLead===n&&n>0,`${coneLead}/${n}`);
  line('aucune alerte positionnelle née du bruit de chantier',posAlert===0,`${posAlert}/${n}`);}
