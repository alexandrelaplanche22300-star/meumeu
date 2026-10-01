// Des Bèè vivants : le regard et les pas des gardes au repos, les pas qui s'entendent (dans les deux camps), les rondes de nuit
// à la lanterne — ce que nos soldats en voient et en entendent (au joueur d'en tenir compte).
//   node test/beee_vivants.mjs <graine> <jour>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAY]=[+(process.argv[2]||301),+(process.argv[3]||10)];const W=new World(seed);const P=player(W);const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
for(let d=0;d<DAY;d++)for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
const run=H=>{for(let k=0;k<H*60;k++){W.update(1/60);W.events.length=0;}};
const calls=[];const bn=W.beeeNotice.bind(W);W.beeeNotice=(x,y,r,why)=>{calls.push({x,y,why,t:W.s.t});return bn(x,y,r,why);};
const kill=u=>{u.hp=0;if(u.h)u.h.state='mort';};

// 1. de jour : le regard des gardes et leurs quelques pas
while(W.light()<.95)run(.25);
const guards=W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='guard'&&!u.band&&u.hp>0).slice(0,60);const seen=new Map();
for(const u of guards)seen.set(u.id,{n:0,fx:u.fx,fy:u.fy,x:u.x,y:u.y,max:0});
for(let k=0;k<3*60;k++){W.update(1/60);W.events.length=0;for(const u of guards){const o=seen.get(u.id);if(u.fx!=null&&(o.fx==null||o.fx*u.fx+o.fy*u.fy<.9)){o.n++;o.fx=u.fx;o.fy=u.fy;}o.max=Math.max(o.max,d2(u.x,u.y,o.x,o.y));}}
const still=guards.filter(u=>u.task?.kind==='guard'&&u.hp>0);const avg=still.reduce((a,u)=>a+seen.get(u.id).n,0)/Math.max(1,still.length);
console.log(`jour ${W.day} : ${still.length} gardes suivis 3 h · la tête tournée ${avg.toFixed(1)} fois en moyenne · ${still.filter(u=>seen.get(u.id).max>1.5).length} ont fait quelques pas`);

// 2. les pas : un villageois passe à deux cases d'un garde, debout puis courbé (auprès d'un autre garde)
function walkBy(g,post){const a=g.id*1.7,ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux;const [x0,y0]=W.freeSpot(g.x+px*2-ux*6,g.y+py*2-uy*6,2),[x1,y1]=W.freeSpot(g.x+px*2+ux*6,g.y+py*2+uy*6,2);
  const u=W.addUnit('meumeu','villageois',x0,y0);u.orderPost=post;u.postSet=true;u.task={kind:'move',tx:x1,ty:y1};const n0=calls.length,t0=W.s.t;let near=99;
  for(let k=0;k<90&&u.task;k++){W.update(1/60);W.events.length=0;near=Math.min(near,d2(u.x,u.y,g.x,g.y));}
  const heard=calls.slice(n0).filter(c=>c.why==='pas'&&d2(c.x,c.y,g.x,g.y)<9).length;kill(u);return {heard,near,dt:W.s.t-t0};}
const G=W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='guard'&&!u.band&&u.hp>0);const g1=G[0],g2=G.find(o=>d2(o.x,o.y,g1.x,g1.y)>12)||G.find(o=>o!==g1);
const a1=walkBy(g1,'debout'),a2=g2?walkBy(g2,'accroupi'):null;
console.log(`pas de jour : debout à ${a1.near.toFixed(1)} case(s) → ${a1.heard} alerte(s) « pas » · courbé à ${a2?a2.near.toFixed(1):'-'} → ${a2?a2.heard:'-'}`);

// 3. la nuit : les rondes, leurs lanternes ; un guetteur des nôtres, couché à 14 cases d'une ville, voit les lumières et entend les pas
while(W.light()>.3)run(.25);
const cap=W.capital();const c=W.s.beee.cities.filter(c=>!c.fallen).sort((a,z)=>d2(a.x,a.y,cap.i,cap.j)-d2(z.x,z.y,cap.i,cap.j))[0];
const an=Math.atan2(cap.j-c.y,cap.i-c.x);const [ox,oy]=W.freeSpot(c.x+Math.cos(an)*14,c.y+Math.sin(an)*14,3);const obs=W.addUnit('meumeu','soldat',ox,oy);obs.orderPost='couche';obs.postSet=true;obs.holdFire=true;obs.task={kind:'guard',tx:ox,ty:oy};
const h0=(W.s.heard||[]).length;let pat=0,lamps=0,lit=new Set(),n=0;
for(let k=0;k<4*60;k++){W.update(1/60);W.events.length=0;if(k%15)continue;n++;const B=W.s.units.filter(u=>u.f==='beee'&&u.hp>0);pat+=B.filter(u=>u.task?.kind==='patrol').length;lamps+=B.filter(u=>u.lamp).length;
  for(const u of B)if(u.lamp&&W.spotted(u,'meumeu'))lit.add(u.id);}
const pasH=(W.s.heard||[]).filter(h=>h.kind==='pas'&&h.oid===obs.id).length;
console.log(`nuit (4 h) : ${(pat/n).toFixed(1)} Bèè en ronde en moyenne, ${(lamps/n).toFixed(1)} lanternes · ${lit.size} lanterne(s) repérée(s) par nos soldats · notre guetteur a entendu ${pasH} fois des pas (${obs.hp>0?'vivant':'tué'})`);
kill(obs);
