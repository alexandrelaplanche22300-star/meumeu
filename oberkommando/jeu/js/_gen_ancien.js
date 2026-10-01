// La carte d'une partie, tirée au sort : un seul continent, sans mer — des plaines, des prairies, des forêts, des clairières,
// des collines rocheuses. Au milieu, une chaîne de montagnes le traverse en diagonale, percée de trois cols : les passages
// où la guerre passera. La capitale meumeu est dans un coin, les villes bèè dans le coin opposé : on ne se voit pas au début.
// Les gisements sont répartis également entre les deux camps (voir plus bas) : l'armement et le rare demandent le rail.
import {MAP_N,T,NODES,RARE,ORE_LEFT,COMMON_ORES} from './data.js';

export function rng(seed){let s=(seed>>>0)||1;const next=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};next.state=v=>{if(v!==undefined)s=(v>>>0)||1;return s;};return next;}
function noise2(r){const P=256,g=new Float32Array(P*P);for(let i=0;i<g.length;i++)g[i]=r();
  const at=(x,y)=>g[((y&255)<<8)|(x&255)];
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),tx=x-xi,ty=y-yi,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
    return (at(xi,yi)*(1-sx)+at(xi+1,yi)*sx)*(1-sy)+(at(xi,yi+1)*(1-sx)+at(xi+1,yi+1)*sx)*sy;};}
function fbm(n,x,y,oct){let a=0,w=.5,f=1,s=0;for(let o=0;o<oct;o++){a+=w*n(x*f,y*f);s+=w;w*=.5;f*=2.03;}return a/s;}

export function generate(seed){const N=MAP_N;const r=rng(seed*9973+17);for(let k=0;k<8;k++)r();const n1=noise2(r),n2=noise2(r),n3=noise2(r),n4=noise2(r);
  const terrain=new Uint8Array(N*N);
  // Le relief : pas de muraille en diagonale, des massifs naturels — un bruit déformé donne de grandes zones de hauteurs,
  // un bruit « de crête » y trace des chaînes sinueuses ; la neige n'est que sur les plus hauts sommets. Rien près des capitales.
  const passes=[];
  const ridge=(x,y)=>1-Math.abs(fbm(n2,x,y,4)*2-1);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=i/N,y=j/N,k=j*N+i;
    const wx=x+.18*(fbm(n4,x*3,y*3,3)-.5),wy=y+.18*(fbm(n4,x*3+7.3,y*3+2.9,3)-.5);
    const mass=fbm(n1,wx*3.1,wy*3.1,4),rg=ridge(wx*6.5,wy*6.5);const dry=fbm(n3,x*6,y*6,4);
    const far=Math.min(Math.hypot(x-.12,y-.88),Math.hypot(x-.87,y-.13));
    // des plaines et des forêts : herbe, prairies, quelques clairières de terre, de rares landes caillouteuses ; ni dunes ni sable
    let t=dry>.69?T.scrub:dry>.62?T.dirt:dry>.45?T.meadow:T.grass;
    const high=mass>.63&&far>.13;if(high&&rg>.86)t=(mass>.7&&rg>.95)?T.snow:T.rock;else if(high&&rg>.78)t=T.scrub;
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
    if((terrain[k]===T.grass||terrain[k]===T.meadow)&&f>.52&&r()<.62)add('tree',i,j);
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
  //  · à pied de la ville (10-18 cases) : pierre, charbon, fer — de quoi démarrer ;
  //  · à 35-65 cases, en éventail vers le centre : cuivre, plomb, salpêtre — l'armement demande le rail ;
  //  · à 50-85 : encore du charbon, du fer, de la pierre ; le rare de plus en plus loin ;
  //  · au milieu, disputés : un peu de tout ; et partout ailleurs, une grille tirée au sort pour qu'aucune région ne soit vide.
  const deposits=[];const place=(res,ok,gap=12)=>{for(let t=0;t<8000;t++){const i=4+Math.floor(r()*(N-8)),j=4+Math.floor(r()*(N-8));const k=j*N+i;if(!land(k)||nodeAt[k]>=0||!ok(i,j,k))continue;
      if(deposits.some(d=>Math.hypot(d.i-i,d.j-j)<gap))continue;let free=0;for(let b=-1;b<=2;b++)for(let a=-1;a<=2;a++){const kk=(j+b)*N+i+a;if(land(kk)&&nodeAt[kk]<0)free++;}if(free<14)continue;
      const nd=add('ore',i,j,{res});deposits.push(nd);return nd;}return null;};
  const order=RARE.slice().sort(()=>r()-.5);const shuffle=L=>L.slice().sort(()=>r()-.5);
  const mid=[N/2,N/2];const angDiff=(a,b)=>Math.abs(((a-b+Math.PI*3)%(Math.PI*2))-Math.PI);
  // autour d'une ville : dans l'anneau [r0, r1], vers l'angle `ang` (± spread)
  const near=([ci,cj],res,r0,r1,ang,spread=.6,gap=10)=>place(res,(i,j)=>{const d=Math.hypot(i-ci,j-cj);return d>r0&&d<r1&&(ang==null||angDiff(Math.atan2(j-cj,i-ci),ang)<spread);},gap);
  const arm=['fer','cuivre','plomb','salpetre'];
  // Les Meumeu ont leurs gisements à portée ; ceux des Bèè sont dispersés (au-delà du démarrage, une fois et demie plus loin) :
  // ils doivent fonder des villes au loin pour s'armer.
  for(const T0 of [capital,beee[0]]){const toMid=Math.atan2(mid[1]-T0[1],mid[0]-T0[0]);const X=T0===capital?1:1.55;
    ['pierre','charbon'].forEach((res,n)=>near(T0,res,10,18,toMid+(n-.5)*1.6,.9,7)||near(T0,res,9,22,null,1,6)||near(T0,res,8,28,null,1,4));
    near(T0,'fer',16,26,null,1,6)||near(T0,'fer',14,32,null,1,4);
    // Les Meumeu ont l'essentiel à portée (ni collé, ni loin) : de quoi s'armer vite face au nombre qui monte
    if(T0===capital)for(const res of ['cuivre','plomb','salpetre','charbon'])near(T0,res,18,32,null,1,6)||near(T0,res,16,40,null,1,4);
    near(T0,'fer',25*X,42*X,null,1,8);
    near(T0,'fer',36*X,58*X,toMid,1.2,9);
    shuffle(arm).forEach((res,n)=>near(T0,res,35*X,65*X,toMid+(n-1.5)*.55,.35)||near(T0,res,35*X,70*X,toMid,1.2));
    for(const res of ['charbon','fer','pierre','fer','fer'])near(T0,res,50*X,95*X,null);
    for(const res of order)near(T0,res,70*X,110*X,toMid,.9);}
  for(const T0 of beee.slice(1))for(const res of ['pierre','charbon','fer'])near(T0,res,10,20,null);
  const dC=(i,j)=>Math.hypot(i-capital[0],j-capital[1]),dB=(i,j)=>Math.min(...beee.map(([a,b])=>Math.hypot(a-i,b-j)));
  for(const res of [...COMMON_ORES,...COMMON_ORES,...order])place(res,(i,j)=>Math.abs(dC(i,j)-dB(i,j))<40&&dC(i,j)>70);
  // un peu partout, éparpillés : deux passes sur une grille de 7 × 7
  for(let pass=0;pass<2;pass++){const G=7,cell=N/G;let cyc=shuffle(COMMON_ORES),ci=0;
  for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){const res=cyc[ci++%cyc.length];if(ci%cyc.length===0)cyc=shuffle(COMMON_ORES);
    place(res,(i,j)=>i>=gx*cell&&i<(gx+1)*cell&&j>=gy*cell&&j<(gy+1)*cell&&dC(i,j)>25&&dB(i,j)>25,14);}}
  // près des villes, les filons sont petits (de quoi démarrer) ; les gros sont loin : il faut s'étendre
  // près de chez soi, des filons de démarrage (quelques jours de mine) ; à mi-distance, moyens ; loin, riches — et plus on s'éloigne
  // de sa capitale, plus ils sont riches : on est poussé à fonder des villes, des dépôts ferroviaires, des mines au loin
  const START_LEFT={fer:1400,charbon:1400,pierre:1800,cuivre:1000,plomb:1000,salpetre:1000};
  for(const d of deposits){const near=Math.min(dC(d.i,d.j),dB(d.i,d.j));
    if(near<32)d.left=d.max=Math.min(d.max,START_LEFT[d.res]||800);
    else if(near<60)d.left=d.max=Math.round(d.max*.5);
    else if(near>80)d.left=d.max=Math.round(d.max*Math.min(2.2,1+(near-80)/100));}
  // La fertilité du sol (0–100) : les limons des plaines, des poches de terre noire ; les landes et la roche, presque rien.
  // Les Meumeu démarrent dans une vallée grasse ; les Bèè sur un plateau maigre et caillouteux — les meilleures terres sont
  // ailleurs, au milieu et vers nous : c'est pour elles aussi qu'ils s'étendront. (Un tirage à part : le reste de la carte ne bouge pas.)
  const rf=rng(seed*7919+3);const nf=noise2(rf);const fert=new Uint8Array(N*N);const blobs=[];
  const blobAt=(ok,rad)=>{for(let t=0;t<600;t++){const i=10+Math.floor(rf()*(N-20)),j=10+Math.floor(rf()*(N-20));if(comp[j*N+i]!==main||!ok(i,j)||blobs.some(b=>Math.hypot(b.i-i,b.j-j)<b.r+rad+6))continue;blobs.push({i,j,r:rad});return;}};
  for(let n=0;n<2;n++)blobAt((i,j)=>dC(i,j)>14&&dC(i,j)<38,9+rf()*4);
  for(let n=0;n<4;n++)blobAt((i,j)=>Math.abs(dC(i,j)-dB(i,j))<70&&dC(i,j)>60&&dB(i,j)>60,10+rf()*7);
  for(let n=0;n<5;n++)blobAt((i,j)=>dB(i,j)>75&&dC(i,j)>55,9+rf()*7);
  for(let n=0;n<3;n++)blobAt((i,j)=>dB(i,j)>55&&dB(i,j)<100&&dC(i,j)>90,8+rf()*5);
  const TF={[T.grass]:1,[T.meadow]:1.1,[T.dirt]:.6,[T.scrub]:.3};
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i;const tf=TF[terrain[k]]||0;if(!tf)continue;let v=(fbm(nf,i/N*7,j/N*7,4)-.28)*170;
    for(const b of blobs){const d=Math.hypot(b.i-i,b.j-j);if(d<b.r)v+=48*Math.pow(1-d/b.r,.6);}
    const c=dC(i,j),e=dB(i,j);if(c<55)v=Math.max(v,78*(1-c/70))+14*(1-c/55);if(e<60)v=Math.min(v,30+30*e/60);
    let fv=v*tf;if(c<50)fv=Math.max(fv,82*(1-c/70));fert[k]=Math.max(0,Math.min(100,Math.round(fv)));}
  return {N,terrain,nodes,nodeAt,comp,main,capital,beee,deposits,passes,fert,blobs};}
