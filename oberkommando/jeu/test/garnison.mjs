// Fluidité d'une garnison bèè quand une partie de ses gardes part en fouille : les points clés importants restent-ils tenus ?
// Une ville développée, de nuit ; un commando tire huit fois (toutes les 0,4 h) de huit endroits ; on suit 12 h de jeu.
// Mesures (heures de jeu) :
//   couverture  : part du temps où chacun des 3 points clés les plus importants a un garde à moins de 5 cases
//   trou max    : la plus longue durée continue pendant laquelle le point clé n°1 est resté vide
//   agitation   : nombre de changements de poste par garde et par heure (trop = ils font des allers-retours)
//   node test/garnison.mjs [nbGraines=8] [graineDeDépart=1]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const NS=+(process.argv[2]||8),S0=+(process.argv[3]||1);
const DT=1/60,SPAN=12,alive=u=>u.hp>0&&u.h?.state!=='hors';
const f=(v,d=2)=>v==null?'—':v.toFixed(d);
function spot(W,cx,cy,R,a0){const N=W.N;for(let k=0;k<72;k++){const a=a0+k/72*6.283,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(x<3||y<3||x>N-3||y>N-3)continue;
  let ok=true;for(let dj=-1;dj<=1&&ok;dj++)for(let di=-1;di<=1;di++){const kk=(Math.floor(y)+dj)*N+Math.floor(x)+di;if(!TERRAIN[W.G.terrain[kk]]?.walk||W.occ[kk]>=0){ok=false;break;}}if(ok)return [x,y];}return null;}
const rows=[];
for(let seed=S0;seed<S0+NS;seed++){
  const W=new World(seed);for(let h=0;h<6+3*24;h++)W.update(1);W.s.solar=.5;
  const B=W.s.beee,c=B.cities.filter(c=>!c.fallen).sort((a,b)=>W.beeeTroops(b).length-W.beeeTroops(a).length)[0];
  const cm=W.addUnit('meumeu','soldat',c.x+40,c.y);cm.w='mle1';cm.mag=5;cm.pouch=200;
  const spots=[];for(let k=0;k<8;k++){const p=spot(W,c.x,c.y,30,k/8*6.283);if(p)spots.push(p);}if(!spots.length)continue;
  const t0=W.s.t;let next=0,shots=0,ticks=0;const cov=[0,0,0];let gap=0,gapMax=0,moves=0,guardHours=0;const lastKey=new Map();
  for(let n=0;n<SPAN/DT;n++){const t=W.s.t-t0;
    if(t>=next&&shots<8){const p=spots[shots%spots.length];cm.x=p[0];cm.y=p[1];cm.task={kind:'guard',tx:p[0],ty:p[1]};W.shotNoise(cm,W.W('mle1'),cm.x+20,cm.y);shots++;next=t+.4;}
    if(t>=6&&cm.hp>0){W.s.units=W.s.units.filter(u=>u!==cm);cm.hp=0;}
    W.update(DT);
    if(n%60===0){const K=W.beeeKeyPoints(c).slice(0,3);const G=W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city===c.id&&alive(u)&&!u.band&&(u.task?.kind==='guard'||u.task?.kind==='assault'));
      ticks++;K.forEach((b,i)=>{const [w,h]=W.sizeOf(b);const held=G.some(u=>Math.hypot(u.x-(b.i+w/2),u.y-(b.j+h/2))<5+w);if(held)cov[i]++;if(i===0){if(held)gap=0;else{gap+=1/(1/DT/60)*1;gapMax=Math.max(gapMax,gap);}}});
      for(const u of G){const k=u.keyB??null;if(lastKey.has(u.id)&&lastKey.get(u.id)!==k)moves++;lastKey.set(u.id,k);}guardHours+=G.length*(60*DT);}}
  rows.push({seed,keep:W.beeeGarrisonMin(c),cov:cov.map(v=>v/ticks),gapMax,moves,guardHours,churn:moves/Math.max(1,guardHours)});
  console.log(`graine ${seed} : couverture des 3 points clés ${cov.map(v=>Math.round(v/ticks*100)+' %').join(' / ')} · trou max du point n°1 ${f(gapMax,1)} h · changements de poste par garde-heure ${f(moves/Math.max(1,guardHours))}`);}
const avg=(fn)=>rows.reduce((n,r)=>n+fn(r),0)/Math.max(1,rows.length);
console.log(`\nmoyennes sur ${rows.length} graines : couverture ${[0,1,2].map(i=>Math.round(avg(r=>r.cov[i])*100)+' %').join(' / ')} · trou max du point n°1 ${f(avg(r=>r.gapMax),1)} h (pire ${f(Math.max(...rows.map(r=>r.gapMax)),1)} h) · agitation ${f(avg(r=>r.churn))} changements/garde-heure`);
