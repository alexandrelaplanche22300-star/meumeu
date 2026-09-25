// La carte d'une partie, tirée au sort : un seul continent, sans mer — des plaines, des prairies, des forêts, des terres sèches,
// des collines rocheuses. Au milieu, une chaîne de montagnes le traverse en diagonale, percée de trois cols : les passages
// où la guerre passera. La capitale meumeu est dans un coin, les villes bèè dans le coin opposé : on ne se voit pas au début.
// Les gisements sont répartis également entre les deux camps (voir plus bas) : l'armement et le rare demandent le rail.
import {MAP_N,T,NODES,RARE,ORE_LEFT,COMMON_ORES} from './data.js';

export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function noise2(r){const P=256,g=new Float32Array(P*P);for(let i=0;i<g.length;i++)g[i]=r();
  const at=(x,y)=>g[((y&255)<<8)|(x&255)];
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),tx=x-xi,ty=y-yi,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
    return (at(xi,yi)*(1-sx)+at(xi+1,yi)*sx)*(1-sy)+(at(xi,yi+1)*(1-sx)+at(xi+1,yi+1)*sx)*sy;};}
function fbm(n,x,y,oct){let a=0,w=.5,f=1,s=0;for(let o=0;o<oct;o++){a+=w*n(x*f,y*f);s+=w;w*=.5;f*=2.03;}return a/s;}

export function generate(seed){const N=MAP_N;const r=rng(seed*9973+17);for(let k=0;k<8;k++)r();const n1=noise2(r),n2=noise2(r),n3=noise2(r),n4=noise2(r);
  const terrain=new Uint8Array(N*N);
  // la chaîne du milieu : le long de l'anti-diagonale (i + j = N), trois cols tirés au sort
  const passes=[];for(let k=0;k<3;k++)passes.push(.2+k*.3+(r()-.5)*.12);
  const ridge=(i,j)=>1-Math.abs(fbm(n2,i/N*5,j/N*5,4)*2-1);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=i/N,y=j/N,k=j*N+i;
    const across=(x+y-1)/Math.SQRT2,along=(x-y+1)/2;const wob=.012*Math.sin(along*23)+.02*(fbm(n1,x*4,y*4,3)-.5);
    const inPass=passes.some(p=>Math.abs(along-p)<.028);const range=Math.abs(across+wob)<.03&&!inPass&&along>.04&&along<.96;
    const hill=fbm(n1,x*5,y*5,5);const dry=fbm(n3,x*6,y*6,4);let t;
    t=dry>.6?T.sand:dry>.54?T.scrub:dry>.47?T.dirt:dry>.4?T.meadow:T.grass;
    if(range)t=hill>.55&&ridge(i,j)>.7?T.snow:T.rock;
    // des collines rocheuses çà et là, loin des coins où l'on commence
    else if(hill>.66&&ridge(i,j)>.9&&Math.min(Math.hypot(x-.12,y-.88),Math.hypot(x-.86,y-.16))>.16)t=T.rock;
    terrain[k]=t;}
  const land=k=>terrain[k]>=T.sand&&terrain[k]<=T.scrub;
  // les terres d'un seul tenant (sans les montagnes) : la plus grande est le continent
  const comp=new Int32Array(N*N).fill(-1);const sizes=[];
  for(let k=0;k<N*N;k++){if(!land(k)||comp[k]>=0)continue;const id=sizes.length;let n=0;const q=[k];comp[k]=id;
    while(q.length){const c=q.pop();n++;const ci=c%N,cj=(c/N)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=ci+di,b=cj+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(comp[kk]<0&&land(kk)){comp[kk]=id;q.push(kk);}}}
    sizes.push(n);}
  const main=sizes.indexOf(Math.max(...sizes));
  // ce qui n'est pas relié au continent devient de la roche (pas de poches inaccessibles)
  for(let k=0;k<N*N;k++)if(land(k)&&comp[k]!==main)terrain[k]=T.rock;
  const clearAround=(ci,cj,rad)=>{for(let dj=-rad;dj<=rad;dj++)for(let di=-rad;di<=rad;di++){const a=ci+di,b=cj+dj;if(a<0||b<0||a>=N||b>=N||comp[b*N+a]!==main)return 1;}return 0;};
  const siteNear=(ti,tj,rad=5,avoid=[])=>{let best=null,bd=1e9;for(let j=8;j<N-8;j++)for(let i=8;i<N-8;i++){const d=Math.hypot(i-ti,j-tj);if(d>=bd||d>60)continue;
      if(comp[j*N+i]!==main)continue;if(avoid.some(([a,b])=>Math.hypot(a-i,b-j)<30))continue;if(clearAround(i,j,rad))continue;bd=d;best=[i,j];}return best;};
  const capital=siteNear(N*.12,N*.87,7)||siteNear(N*.18,N*.8,5);
  const beee=[];for(const [ti,tj] of [[N*.87,N*.13],[N*.7,N*.1],[N*.9,N*.3]]){if(beee.length>=2)break;const p=siteNear(ti,tj,5,[capital,...beee]);if(p)beee.push(p);}
  // les ressources
  const nodes=[];const nodeAt=new Int32Array(N*N).fill(-1);
  const add=(type,i,j,extra={})=>{if(i<1||j<1||i>=N-1||j>=N-1)return null;const k=j*N+i;if(nodeAt[k]>=0||!land(k))return null;const L=(extra.res&&ORE_LEFT[extra.res])||NODES[type].left;const nd={id:nodes.length,type,i,j,left:L,max:L,...extra};nodes.push(nd);nodeAt[k]=nd.id;return nd;};
  const towns=[capital,...beee];const nearTown=(i,j,d)=>towns.some(([a,b])=>Math.hypot(a-i,b-j)<d);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i;if(!land(k)||nearTown(i,j,7))continue;const f=fbm(n4,i/N*11,j/N*11,3);
    if((terrain[k]===T.grass||terrain[k]===T.meadow)&&f>.55&&r()<.6)add('tree',i,j);
    else if(terrain[k]===T.dirt&&f>.62&&r()<.3)add('tree',i,j);
    else if(terrain[k]===T.scrub&&r()<.05)add('rock',i,j);
    else if(terrain[k]===T.meadow&&f<.4&&r()<.025)add('bush',i,j);}
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const k=j*N+i;if(!land(k)||nearTown(i,j,7))continue;let m=0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]])if(terrain[(j+b)*N+i+a]===T.rock)m++;if(m&&r()<.3)add('rock',i,j);}
  // la promesse de chaque ville : du bois, de la pierre, des baies à portée — en bosquets, pas collés aux maisons
  for(const [ci,cj] of towns){const ensure=(type,min,r0,r1)=>{let have=nodes.filter(nd=>nd.type===type&&Math.hypot(nd.i-ci,nd.j-cj)<r1).length;
      for(let t=0;t<800&&have<min;t++){const a=r()*Math.PI*2,d=r0+r()*(r1-r0);const i=Math.round(ci+Math.cos(a)*d),j=Math.round(cj+Math.sin(a)*d);
        for(let q=0;q<(type==='tree'?8:type==='rock'?5:3)&&have<min;q++){if(add(type,i+Math.round(r()*3-1.5),j+Math.round(r()*3-1.5)))have++;}}};
    ensure('tree',80,9,18);ensure('rock',26,10,19);ensure('bush',14,8,15);}
  // Les gisements, répartis de façon équilibrée et symétrique : chaque camp a les mêmes chances, aux mêmes distances.
  //  · à pied de la ville (10-18 cases) : pierre, charbon, argile — de quoi démarrer ;
  //  · à 35-65 cases, en éventail vers le centre : cuivre, plomb, soufre, salpêtre — l'armement demande le rail ;
  //  · à 50-85 : encore du charbon, de la pierre, de l'argile ; le rare de plus en plus loin ;
  //  · au milieu, disputés : un peu de tout ; et partout ailleurs, une grille tirée au sort pour qu'aucune région ne soit vide.
  const deposits=[];const place=(res,ok,gap=12)=>{for(let t=0;t<8000;t++){const i=4+Math.floor(r()*(N-8)),j=4+Math.floor(r()*(N-8));const k=j*N+i;if(!land(k)||nodeAt[k]>=0||!ok(i,j,k))continue;
      if(deposits.some(d=>Math.hypot(d.i-i,d.j-j)<gap))continue;let free=0;for(let b=-1;b<=2;b++)for(let a=-1;a<=2;a++){const kk=(j+b)*N+i+a;if(land(kk)&&nodeAt[kk]<0)free++;}if(free<14)continue;
      const nd=add('ore',i,j,{res});deposits.push(nd);return nd;}return null;};
  const order=RARE.slice().sort(()=>r()-.5);const shuffle=L=>L.slice().sort(()=>r()-.5);
  const mid=[N/2,N/2];const angDiff=(a,b)=>Math.abs(((a-b+Math.PI*3)%(Math.PI*2))-Math.PI);
  // autour d'une ville : dans l'anneau [r0, r1], vers l'angle `ang` (± spread)
  const near=([ci,cj],res,r0,r1,ang,spread=.6,gap=10)=>place(res,(i,j)=>{const d=Math.hypot(i-ci,j-cj);return d>r0&&d<r1&&(ang==null||angDiff(Math.atan2(j-cj,i-ci),ang)<spread);},gap);
  const arm=['cuivre','plomb','soufre','salpetre'];
  for(const T0 of [capital,beee[0]]){const toMid=Math.atan2(mid[1]-T0[1],mid[0]-T0[0]);
    ['pierre','charbon','argile'].forEach((res,n)=>near(T0,res,10,18,toMid+(n-1)*1.4,.9,7)||near(T0,res,9,22,null,1,6)||near(T0,res,8,28,null,1,4));
    shuffle(arm).forEach((res,n)=>near(T0,res,35,65,toMid+(n-1.5)*.55,.35)||near(T0,res,35,70,toMid,1.2));
    for(const res of ['charbon','pierre','argile','charbon'])near(T0,res,50,85,null);
    near(T0,order[0],25,40,toMid,.9);near(T0,order[1],45,70,toMid,.9);for(const res of order.slice(2))near(T0,res,75,110,toMid,.9);}
  for(const T0 of beee.slice(1))for(const res of ['pierre','charbon','argile'])near(T0,res,10,20,null);
  const dC=(i,j)=>Math.hypot(i-capital[0],j-capital[1]),dB=(i,j)=>Math.min(...beee.map(([a,b])=>Math.hypot(a-i,b-j)));
  for(const res of [...COMMON_ORES,...COMMON_ORES,...order])place(res,(i,j)=>Math.abs(dC(i,j)-dB(i,j))<40&&dC(i,j)>70);
  const G=5,cell=N/G;let cyc=shuffle(COMMON_ORES),ci=0;
  for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){const res=cyc[ci++%cyc.length];if(ci%cyc.length===0)cyc=shuffle(COMMON_ORES);
    place(res,(i,j)=>i>=gx*cell&&i<(gx+1)*cell&&j>=gy*cell&&j<(gy+1)*cell&&dC(i,j)>25&&dB(i,j)>25,14);}
  return {N,terrain,nodes,nodeAt,comp,main,capital,beee,deposits,passes};}
