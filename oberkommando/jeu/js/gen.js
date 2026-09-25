// La carte d'une partie, tirée au sort : un seul continent, sans mer — des plaines, des prairies, des forêts, des terres sèches,
// des collines rocheuses. Au milieu, une chaîne de montagnes le traverse en diagonale, percée de trois cols : les passages
// où la guerre passera. La capitale meumeu est dans un coin, les villes bèè dans le coin opposé : on ne se voit pas au début.
// Le rare est dispersé pour qu'on progresse : pour chaque rare, un filon de notre côté, un au milieu, un près des Bèè.
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
  // le rare : pour chaque rare, un filon de notre côté (le premier tout près), un au milieu, un chez les Bèè
  const deposits=[];const place=(res,ok)=>{for(let t=0;t<6000;t++){const i=4+Math.floor(r()*(N-8)),j=4+Math.floor(r()*(N-8));const k=j*N+i;if(!land(k)||nodeAt[k]>=0||!ok(i,j,k))continue;
      if(deposits.some(d=>Math.hypot(d.i-i,d.j-j)<14))continue;let free=0;for(let b=-1;b<=2;b++)for(let a=-1;a<=2;a++){const kk=(j+b)*N+i+a;if(land(kk)&&nodeAt[kk]<0)free++;}if(free<14)continue;
      const nd=add('ore',i,j,{res});deposits.push(nd);return nd;}return null;};
  const [ci,cj]=capital;const order=RARE.slice().sort(()=>r()-.5);const [bi,bj]=beee[0];
  const dC=(i,j)=>Math.hypot(i-ci,j-cj),dB=(i,j)=>Math.min(...beee.map(([a,b])=>Math.hypot(a-i,b-j)));
  place(order[0],(i,j)=>dC(i,j)>16&&dC(i,j)<26);place(order[1],(i,j)=>dC(i,j)>22&&dC(i,j)<40);
  for(const res of order){if(!deposits.some(d=>d.res===res))place(res,(i,j)=>dC(i,j)>30&&dC(i,j)<70);}
  for(const res of order)place(res,(i,j)=>Math.abs(dC(i,j)-dB(i,j))<30&&dC(i,j)>60);
  for(const res of order)place(res,(i,j)=>dB(i,j)>12&&dB(i,j)<34);
  // le commun (pierre, charbon, argile, et ce que demande l'armement) : plus de gisements que de rare.
  const common=(res,ok,gap=9)=>{for(let t=0;t<6000;t++){const i=4+Math.floor(r()*(N-8)),j=4+Math.floor(r()*(N-8));const k=j*N+i;if(!land(k)||nodeAt[k]>=0||!ok(i,j))continue;
      if(deposits.some(d=>Math.hypot(d.i-i,d.j-j)<gap))continue;let free=0;for(let b=-1;b<=2;b++)for(let a=-1;a<=2;a++){const kk=(j+b)*N+i+a;if(land(kk)&&nodeAt[kk]<0)free++;}if(free<14)continue;
      const nd=add('ore',i,j,{res});deposits.push(nd);return nd;}return null;};
  // une de chaque près de la capitale (la pierre, le charbon et l'argile d'abord), d'autres plus loin, et chez les Bèè
  for(const res of COMMON_ORES)common(res,(i,j)=>dC(i,j)>9&&dC(i,j)<(res==='pierre'?18:24),7);
  for(const res of COMMON_ORES)for(let n=0;n<(res==='charbon'||res==='pierre'?3:2);n++)common(res,(i,j)=>dC(i,j)>26&&dC(i,j)<80);
  for(let n=0;n<3;n++)common('charbon',(i,j)=>Math.abs(dC(i,j)-dB(i,j))<40&&dC(i,j)>60);
  for(const _ of beee)for(const res of COMMON_ORES)common(res,(i,j)=>dB(i,j)>9&&dB(i,j)<32);
  return {N,terrain,nodes,nodeAt,comp,main,capital,beee,deposits,passes};}
