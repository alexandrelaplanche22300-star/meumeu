// La démo de guerre : une capitale déjà équipée pour la guerre, et un avant-poste bèè à une quarantaine de cases.
// De quoi essayer tout de suite la chaîne militaire : concevoir une arme au bureau d'études, la produire (manufacture,
// arsenal, poudrerie), former des soldats à la caserne (armés et protégés depuis le dépôt), les grouper en escouades
// (touche G), soigner (hôpital, médecins), et aller frapper les Bèè — ou les recevoir : leurs vagues viennent au jour 5.
import {BUILDINGS,DAY,RARE} from './data.js';

const MEUMEU=['caserne','armurerie','manufacture','arsenal','arsenal','poudrerie','hopital','entrepot','atelier','four','maison','maison','maison','maison','maison','maison','maison','maison','maison','maison','maison','maison','ferme','ferme'];
const STOCK={bois:700,pierre:400,charbon:300,fer:260,cuivre:200,plomb:220,salpetre:160,pieces:300,poudre:160,explosifs:40,soie:60,
  vivres:900,sante:60,'a:mle1':30,'m:mle1':60,'a:mg2':4,'m:mg2':30,'p:casque':20,'p:gilet':12};

// un emplacement libre pour un bâtiment, en anneaux autour de (cx, cy) : le terrain, l'écart, la place (le dépôt, on s'en passe)
function spot(W,f,k,cx,cy,r0=6,r1=30){for(let r=r0;r<=r1;r++)for(let a=0;a<24;a++){const an=a/24*Math.PI*2+r*.37;const i=Math.round(cx+Math.cos(an)*r),j=Math.round(cy+Math.sin(an)*r);
    const c=W.canPlace(f,k,i,j);if(c.ok||c.why.every(w=>w.startsWith('aucun dépôt')))return [i,j];}return null;}
function build(W,f,k,at){const B=BUILDINGS[k];const [i,j]=at;for(let a=0;a<B.size[0];a++)for(let c=0;c<B.size[1];c++){const kk=(j+c)*W.N+i+a;const nd=W.nodeAt[kk];if(nd>=0&&W.s.nodes[nd].type!=='ore'){W.s.nodes[nd].left=0;W.nodeAt[kk]=-1;}}
  return W.addBuilding(f,k,i,j,true);}

// une voie ferrée : le plus court chemin sur les cases où l'on peut bâtir (ni eau, ni roc, ni bâtiment, ni filon)
function railPath(W,from,goal){const N=W.N;const ok=k=>{const T=W.G.terrain[k];return T>=2&&T<=6&&W.occ[k]<0&&!(W.nodeAt[k]>=0&&W.s.nodes[W.nodeAt[k]].type==='ore');};
  const prev=new Int32Array(N*N).fill(-1);const q=[];for(const [i,j] of from){const k=j*N+i;if(ok(k)){prev[k]=k;q.push(k);}}
  for(let h=0;h<q.length;h++){const k=q[h];const i=k%N,j=(k/N)|0;if(goal(i,j)){const out=[];let c=k;while(prev[c]!==c){out.push([c%N,(c/N)|0]);c=prev[c];}out.push([c%N,(c/N)|0]);return out.reverse();}
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<2||b<2||a>=N-2||b>=N-2)continue;const kk=b*N+a;if(prev[kk]<0&&ok(kk)){prev[kk]=k;q.push(kk);}}}return null;}
// une gare collée à la voie : on essaie toutes les positions dont un bord touche l'une des cases données
function station(W,cells){for(const [i,j] of cells)for(let dj=-2;dj<=1;dj++)for(let di=-3;di<=1;di++){const a=i+di,b=j+dj;
    if(di>=-2&&di<=0&&dj>=-1&&dj<=0)continue;
    const c=W.canPlace('meumeu','gare',a,b);if(c.ok||c.why.every(w=>w.startsWith('aucun dépôt')))return build(W,'meumeu','gare',[a,b]);}return null;}
// l'économie de guerre de la démo : une voie jusqu'à un pôle minier, deux gares, des mines, un train, des ouvriers partout
function warEconomy(W,cap,ci,cj){const s=W.s;const ores=s.nodes.filter(n=>n.type==='ore'&&['fer','salpetre','plomb','cuivre'].includes(n.res));
  const score=n=>{const d=Math.hypot(n.i-ci,n.j-cj);if(d<28||d>70)return -1;const near=ores.filter(o=>Math.hypot(o.i-n.i,o.j-n.j)<16);
    return new Set(near.map(o=>o.res)).size*30+near.length*10+(near.some(o=>o.res==='salpetre')?25:0)-d*.2;};
  const hub=ores.map(n=>({n,s:score(n)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s)[0]?.n;if(!hub)return null;
  const from=[];for(let a=0;a<32;a++){const r=9;from.push([Math.round(ci+Math.cos(a/32*6.283)*r),Math.round(cj+Math.sin(a/32*6.283)*r)]);}
  const path=railPath(W,from,(i,j)=>Math.hypot(i-hub.i,j-hub.j)<7);if(!path||path.length<10)return null;
  W.planLine('meumeu','rail',path);for(const k of Object.keys(s.rails))W.lineBuilt('rail',+k);
  const gA=station(W,path.slice(0,Math.min(24,path.length>>1))),gB=station(W,path.slice(-Math.min(20,path.length>>1)).reverse());if(!gA||!gB)return null;
  // les mines du pôle : sur chaque filon à portée de la gare, quatre mineurs, livrant à la gare
  const mines=[];for(const n of ores.filter(o=>Math.hypot(o.i-hub.i,o.j-hub.j)<16)){const c=W.canPlace('meumeu','mine',n.i,n.j);if(!(c.ok||c.why.every(w=>w.startsWith('aucun dépôt'))))continue;const m=build(W,'meumeu','mine',[n.i,n.j]);m.ore=n.id;
    if(W.linkOk(m,gB.id))W.setLink(m,'out',gB.id);mines.push(m);for(let k=0;k<4;k++){const u=W.addUnit('meumeu','villageois',m.i+1+k*.4,m.j+3);u.home=cap.id;u.task={kind:'work',b:m.id};}}
  gB.stock.charbon=40;gB.stock.vivres=60;gA.stock.charbon=40;
  // les commandes permanentes : la capitale réclame le minerai à la gare A, qui le réclame au train, qui le prend à la gare B
  const got=[...new Set(mines.map(m=>s.nodes[m.ore].res))];for(const k of got){W.setWant(cap,k,(cap.stock[k]||0)+150);W.setWant(gA,k,80);}
  const tr=W.addVehicle('meumeu','train',gA);
  return {gA,gB,mines,path,tr,hub};}

export function setupDemo(W){const s=W.s;const cap=W.capital();const [ci,cj]=[cap.i+2,cap.j+2];
  // une mitrailleuse lourde déjà adoptée : sur trépied, trois servants
  s.designs.mg2={id:'mg2',f:'meumeu',name:'Mitrailleuse Mle 2',status:'adopte',p:{d:2.6,l:10,nose:'pointue',base:'bt',cons:'fmj',c:.09,L:230,twist:75,action:'auto',rof:500,mag:100,mods:['trepied','cacheflamme'],zero:100}};
  // la capitale équipée
  for(const k of MEUMEU){const at=spot(W,'meumeu',k,ci,cj,7,34);if(at)build(W,'meumeu',k,at);}
  const ent=s.buildings.find(b=>b.k==='entrepot'&&b.f==='meumeu');
  // le rare va à l'entrepôt : au dépôt de la capitale, il compterait pour la victoire
  for(const [k,n] of Object.entries(STOCK)){const a=RARE.includes(k)&&ent?0:Math.round(n*.6);cap.stock[k]=(cap.stock[k]||0)+a;if(ent)ent.stock[k]=(ent.stock[k]||0)+n-a;else cap.stock[k]+=n-a;}
  // l'armée : dix soldats armés et protégés, deux médecins, deux infirmiers ; deux escouades ; des villageois de plus
  const sol=[];for(let n=0;n<10;n++){const a=n/10*Math.PI*2;const u=W.addUnit('meumeu','soldat',ci+6+Math.cos(a)*2,cj+6+Math.sin(a)*2,{w:'mle1',armor:n<4?'gilet':'casque'});W.resupply(u);sol.push(u);}
  const med=[];for(const k of ['medecin','medecin','infirmier','infirmier']){const u=W.addUnit('meumeu',k,ci+8+med.length*.6,cj+4);W.resupply?.(u);med.push(u);}
  for(let n=0;n<6;n++)W.addUnit('meumeu','villageois',ci-4+n*.7,cj+5);
  sol[0].w='mg2';sol[0].mag=100;sol[0].pouch=300;sol[4].role='munitions';
  W.formSquad([...sol.slice(0,5),med[0],med[2]].map(u=>u.id));W.formSquad([...sol.slice(5),med[1],med[3]].map(u=>u.id));
  // l'économie de guerre : la voie, les gares, les mines, le train ; des ouvriers dans les usines ; des porteurs
  const eco=warEconomy(W,cap,ci,cj);
  for(const b of s.buildings.filter(b=>b.f==='meumeu'&&b.done&&BUILDINGS[b.k].factory&&BUILDINGS[b.k].workers)){for(let k=0;k<BUILDINGS[b.k].workers;k++){const u=W.addUnit('meumeu','villageois',b.i+1+k*.4,b.j+BUILDINGS[b.k].size[1]+.6);u.home=cap.id;u.task={kind:'work',b:b.id};}}
  const ars=s.buildings.filter(b=>b.k==='arsenal'&&b.f==='meumeu');if(ars[1])W.setProduct(ars[1],'m:mg2');const man=s.buildings.find(b=>b.k==='manufacture');if(man){man.tooled=man.tooled||{};man.tooled.mg2=true;}
  for(const b of s.buildings)if(b.f==='meumeu'&&b.prod)b.limit*=4;
  for(let k=0;k<4;k++)W.addUnit('meumeu','villageois',ci-3+k*.6,cj+6);W.addPorters(cap,2);if(eco)W.addPorters(eco.gA,1);
  // l'avant-poste bèè, vers les Bèè, à une quarantaine de cases
  const [bi,bj]=W.G.beee[0];const d=Math.hypot(bi-ci,bj-cj);let post=null;
  for(let R=38;R<=95&&!post;R+=3){const x=Math.round(ci+(bi-ci)/d*R),y=Math.round(cj+(bj-cj)/d*R);for(let r=0;r<18&&!post;r++)for(let a=0;a<16;a++){const i=Math.round(x+Math.cos(a/16*6.283)*r),j=Math.round(y+Math.sin(a/16*6.283)*r);
      if(W.G.comp[j*W.N+i]!==W.G.main)continue;let ok=true;for(let dy=-4;dy<=4&&ok;dy++)for(let dx=-4;dx<=4;dx++){const kk=(j+dy)*W.N+i+dx;const T=W.G.terrain[kk];if(T==null||T<2||T>6||W.occ[kk]>=0){ok=false;break;}}if(ok){post=[i,j];break;}}}
  if(post){W.makeBeeeCity(post[0],post[1],'Avant-poste de Bèèval');const c=s.beee.cities[s.beee.cities.length-1];
    for(let n=0;n<6;n++){const a=n/6*Math.PI*2;const u=W.addUnit('beee',n<5?'soldat':'commando',post[0]+Math.cos(a)*4,post[1]+Math.sin(a)*4,{armor:n<5?'bee_casque':'bee_plaque'});W.resupply?.(u);u.city=c.id;}}
  // la guerre est déclarée ; leurs grandes vagues attendent le jour 5
  W.declareWar('meumeu');s.beee.nextWave=s.t+DAY*4;s.beee.nextAir=Infinity;
  W.log('Démo',`La guerre est déclarée. Un avant-poste bèè tient ${post?Math.round(Math.hypot(post[0]-ci,post[1]-cj)):'?'} cases au nord-est de la capitale ; leurs vagues viendront au jour 5. Deux escouades sont prêtes (touches 1 et 2), la caserne, le bureau d’études, la manufacture et l’arsenal attendent.`,'good');
  return {post,eco};}
