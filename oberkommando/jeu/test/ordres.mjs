// Les ordres sont obéis : tenir près d'une ville bèè sans rien y brûler, une formation qui garde ses intervalles,
// un blessé léger qui reste à son poste, une pièce à roues que ses servants poussent, un regard dans le sens de la marche.
//   node test/ordres.mjs
// Pas de temps réalistes : le jeu appelle update avec ≈ 1/240 h par image ; on fait de même.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const {newHealth}=await import('../js/health.js');
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);let fails=0;
const ok=(c,msg)=>{console.log(`${c?'OK ':'ÉCHEC'} ${msg}`);if(!c)fails++;};
const run=(W,h)=>{for(let t=0;t<Math.round(h*240);t++)W.update(1/240);};
const soldiers=(W,n,x,y)=>{const us=[];for(let q=0;q<n;q++){const u=W.addUnit('meumeu','soldat',x+q*.7,y);u.w='mle1';u.mag=5;u.pouch=40;us.push(u);}return us;};
const fresh=seed=>{const W=new World(seed);for(let h=0;h<24;h++)W.update(1);return W;};

// 1. une escouade envoyée au contact d’une ville bèè (garnison retirée, tours muettes), puis « tenir » : pas un feu, pas un point de dégât
{const W=fresh(41);W.defenseTick=()=>{};const c=W.s.beee.cities.find(c=>!c.fallen);for(const u of W.s.units)if(u.f==='beee')u.hp=0;W.update(1/240);
  const bs=W.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&d2(b.i,b.j,c.x,c.y)<14);const hp0=bs.map(b=>b.hp),fire0=bs.map(b=>b.fire||0);
  const tb=bs.find(b=>b.k!=='centre')||bs[0];const fx=W.freeSpot(tb.i-1.5,tb.j+1,4);const us=soldiers(W,5,fx[0],fx[1]);const sq=W.formSquad(us.map(u=>u.id)).sq;
  // un ordre de marche qui passe tout contre les bâtiments
  W.order(us.map(u=>u.id),{type:'point',x:fx[0]+.5,y:fx[1]+1});run(W,2);
  let fires=0;const ev=()=>{for(const e of W.events.splice(0))if(e.type==='fire')fires++;};ev();
  W.holdOrder(us.map(u=>u.id));const p0=us.map(u=>[u.x,u.y]);for(let k=0;k<12;k++){run(W,.5);ev();}
  const dmg=bs.reduce((a,b,q)=>a+Math.max(0,hp0[q]-b.hp),0),lit=bs.filter((b,q)=>(b.fire||0)>fire0[q]+1e-6).length;
  const drift=Math.max(...us.map((u,q)=>d2(u.x,u.y,p0[q][0],p0[q][1])));
  ok(fires===0&&lit===0&&dmg<1,`près de ${c.name} (${bs.length} bâtiments) : ${fires} incendie(s), ${dmg.toFixed(1)} points de dégâts`);
  ok(drift<.8,`ordre de tenir : écart max à la position tenue ${drift.toFixed(2)} case`);
  ok(us.every(u=>!u.task||u.task.kind==='guard'),`tâches : ${us.map(u=>u.task?.kind||'—').join(', ')}`);}

// 2. la formation : en ligne, l'intervalle réglé ; en marche, le rang reste aligné ; changée à l'arrêt, elle s'applique
{const W=fresh(42);const cap=W.capital();const p=W.freeSpot(cap.i+4,cap.j+12,6);const us=soldiers(W,5,p[0],p[1]);const sq=W.formSquad(us.map(u=>u.id)).sq;sq.spacing=1.5;
  const tx=p[0]+14,ty=p[1]+3;W.order(us.map(u=>u.id),{type:'point',x:tx,y:ty});const [dx,dy]=[us[0].task.fx,us[0].task.fy];const px=-dy,py=dx;
  let spread=0;for(let t=0;t<240*4;t++){W.update(1/240);if(t>120&&us.some(u=>u.anim==='walk')){const f=us.map(u=>u.x*dx+u.y*dy);spread=Math.max(spread,Math.max(...f)-Math.min(...f));}}
  const lat=us.map(u=>u.x*px+u.y*py).sort((a,b)=>a-b),gaps=lat.slice(1).map((v,q)=>v-lat[q]);const f=us.map(u=>u.x*dx+u.y*dy);
  const want=1.35*1.5;ok(gaps.every(g=>Math.abs(g-want)<.45)&&Math.max(...f)-Math.min(...f)<.6,`en ligne, écart ×1,5 : intervalles ${gaps.map(g=>g.toFixed(2)).join(' / ')} (voulu ${want.toFixed(2)}), profondeur ${(Math.max(...f)-Math.min(...f)).toFixed(2)}`);
  ok(spread<2.2,`en marche : le rang s'étire au plus de ${spread.toFixed(2)} case d'avant en arrière`);
  sq.form='colonne';run(W,3);const lat2=us.map(u=>u.x*px+u.y*py),w2=Math.max(...lat2)-Math.min(...lat2),f2=us.map(u=>u.x*dx+u.y*dy),dep2=Math.max(...f2)-Math.min(...f2);
  ok(w2<2.6&&dep2>3,`passée en colonne à l'arrêt : largeur ${w2.toFixed(2)}, profondeur ${dep2.toFixed(2)}`);}

// 3. un blessé léger qui ne saigne pas reste à son poste ; un blessé qui se vide part à l'hôpital
{const W=fresh(43);const cap=W.capital();const hb=W.s.buildings.find(b=>b.k==='hopital'&&b.f==='meumeu')||(()=>{const q=W.freeSpot(cap.i-8,cap.j+8,8);return W.addBuilding('meumeu','hopital',Math.floor(q[0]),Math.floor(q[1]),true);})();
  const p=W.freeSpot(cap.i+6,cap.j+14,6);const [a,b]=soldiers(W,2,p[0],p[1]);
  for(const u of [a,b]){u.h??=newHealth();u.h.state='blesse';u.h.wounds=[{sev:1,text:'éraflure',parts:[]}];u.task={kind:'guard',tx:u.x,ty:u.y};}
  b.h.bleeds=[{name:"cuisse",rate:1.2}];run(W,.5);
  ok(a.task?.kind!=='hosp',`blessé léger sans saignement : ${a.task?.kind||'—'} (${a.why||'à son poste'})`);
  ok(b.task?.kind==='hosp'||b.h.state!=='blesse',`blessé qui saigne (1,2 mL/s) : ${b.task?.kind||'—'} · état ${b.h.state}`);}

// 4. une pièce à roues avance, poussée par ses servants, plus lentement qu'un fantassin ; sur pieux, elle reste en place
{const W=fresh(44);const cap=W.capital();const p=W.freeSpot(cap.i+4,cap.j+12,6);
  const P=car=>({d:20,l:65,nose:'ogive',base:'plat',cons:'he',c:3.5,L:420,twist:700,action:'culasse',rof:12,mag:1,heavy:true,burn:.65,wallx:1.8,jacket:1,core:0,hef:.48,fragm:18,zero:100,prop:'cartouche',fill:'tolite',shell:'rainuree',fuse:'impact',mods:['trepied','bouclier'],carriage:car});
  W.s.designs.ob={id:'ob',f:'meumeu',name:'Obusier',status:'adopte',p:P('roues')};W.s.designs.fx={id:'fx',f:'meumeu',name:'Pièce fixe',status:'adopte',p:P('pieux')};
  const D=W.W('ob');const us=soldiers(W,Math.min(5,D.crew),p[0],p[1]);us[0].w='ob';us[0].mag=1;W.formSquad(us.map(u=>u.id));W.update(1/240);
  const g=us[0],x0=g.x,y0=g.y;const r=W.order([g.id],{type:'point',x:p[0]+8,y:p[1]});run(W,1);const v=W.speedOf(g,true),dist=d2(g.x,g.y,x0,y0);
  ok(dist>1&&v<6,`obusier à roues (${D.mass.toFixed(1)} kg, ${W.servants(g,1.6).length} servants) : ${dist.toFixed(2)} cases en 1 h, ${v.toFixed(2)} cases/h (fantassin 8) — « ${r.text} »`);
  const W2=fresh(45);const cap2=W2.capital();const q=W2.freeSpot(cap2.i+4,cap2.j+12,6);W2.s.designs.fx={id:'fx',f:'meumeu',name:'Pièce fixe',status:'adopte',p:P('pieux')};
  const vs=soldiers(W2,4,q[0],q[1]);vs[0].w='fx';W2.formSquad(vs.map(u=>u.id));W2.update(1/240);const f0=[vs[0].x,vs[0].y];W2.order([vs[0].id],{type:'point',x:q[0]+8,y:q[1]});run(W2,1);
  ok(d2(vs[0].x,vs[0].y,f0[0],f0[1])<.2,`pièce sur pieux : reste en place (${vs[0].why||'—'})`);}

// 5. le regard suit la marche (projection isométrique : écran x ∝ dx − dy, écran y ∝ dx + dy)
{const W=fresh(46);const cap=W.capital();const p=W.freeSpot(cap.i+4,cap.j+12,6);const [u]=soldiers(W,1,p[0],p[1]);
  const want={'1,0':'se','0,1':'sw','-1,0':'nw','0,-1':'ne'};const got={};for(const k of Object.keys(want)){const [dx,dy]=k.split(',').map(Number);W.face(u,dx,dy);got[k]=u.dir;}
  ok(Object.keys(want).every(k=>got[k]===want[k]),`face() : ${Object.entries(got).map(([k,v])=>`(${k})→${v}`).join(' ')}`);
  W.order([u.id],{type:'point',x:p[0]+6,y:p[1]});let dirs=new Set();for(let t=0;t<240;t++){W.update(1/240);if(u.anim==='walk')dirs.add(u.dir);}
  ok(dirs.size>0&&[...dirs].every(d=>d==='se'||d==='ne'),`marche vers +x : directions ${[...dirs].join(', ')||'aucune'}`);}

console.log(fails?`${fails} échec(s)`:'tout est bon');process.exitCode=fails?1:0;
