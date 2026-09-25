// La démo de guerre : une capitale déjà équipée pour la guerre, et un avant-poste bèè à une quarantaine de cases.
// De quoi essayer tout de suite la chaîne militaire : concevoir une arme au bureau d'études, la produire (manufacture,
// arsenal, poudrerie), former des soldats à la caserne (armés et protégés depuis le dépôt), les grouper en escouades
// (touche G), soigner (hôpital, médecins), et aller frapper les Bèè — ou les recevoir : leurs vagues viennent au jour 5.
import {BUILDINGS,DAY,RARE} from './data.js';

const MEUMEU=['caserne','armurerie','manufacture','arsenal','arsenal','poudrerie','hopital','entrepot','atelier','maison','maison','maison','maison','maison','maison'];
const STOCK={bois:700,pierre:350,briques:200,charbon:300,pieces:300,fer:150,plomb:220,cuivre:200,poudre:160,salpetre:80,soufre:40,sels:60,soie:60,verre:20,
  vivres:900,explosifs:40,sante:60,'a:mle1':30,'m:mle1':60,'p:casque':20,'p:gilet':12};

// un emplacement libre pour un bâtiment, en anneaux autour de (cx, cy) : le terrain, l'écart, la place (le dépôt, on s'en passe)
function spot(W,f,k,cx,cy,r0=6,r1=30){for(let r=r0;r<=r1;r++)for(let a=0;a<24;a++){const an=a/24*Math.PI*2+r*.37;const i=Math.round(cx+Math.cos(an)*r),j=Math.round(cy+Math.sin(an)*r);
    const c=W.canPlace(f,k,i,j);if(c.ok||c.why.every(w=>w.startsWith('aucun dépôt')))return [i,j];}return null;}
function build(W,f,k,at){const B=BUILDINGS[k];const [i,j]=at;for(let a=0;a<B.size[0];a++)for(let c=0;c<B.size[1];c++){const kk=(j+c)*W.N+i+a;const nd=W.nodeAt[kk];if(nd>=0&&W.s.nodes[nd].type!=='ore'){W.s.nodes[nd].left=0;W.nodeAt[kk]=-1;}}
  return W.addBuilding(f,k,i,j,true);}

export function setupDemo(W){const s=W.s;const cap=W.capital();const [ci,cj]=[cap.i+2,cap.j+2];
  // la capitale équipée
  for(const k of MEUMEU){const at=spot(W,'meumeu',k,ci,cj,7,34);if(at)build(W,'meumeu',k,at);}
  const ent=s.buildings.find(b=>b.k==='entrepot'&&b.f==='meumeu');
  // le rare va à l'entrepôt : au dépôt de la capitale, il compterait pour la victoire
  for(const [k,n] of Object.entries(STOCK)){const a=RARE.includes(k)&&ent?0:Math.round(n*.6);cap.stock[k]=(cap.stock[k]||0)+a;if(ent)ent.stock[k]=(ent.stock[k]||0)+n-a;else cap.stock[k]+=n-a;}
  // l'armée : dix soldats armés et protégés, deux médecins, deux infirmiers ; deux escouades ; des villageois de plus
  const sol=[];for(let n=0;n<10;n++){const a=n/10*Math.PI*2;const u=W.addUnit('meumeu','soldat',ci+6+Math.cos(a)*2,cj+6+Math.sin(a)*2,{w:'mle1',armor:n<4?'gilet':'casque'});W.resupply(u);sol.push(u);}
  const med=[];for(const k of ['medecin','medecin','infirmier','infirmier']){const u=W.addUnit('meumeu',k,ci+8+med.length*.6,cj+4);W.resupply?.(u);med.push(u);}
  for(let n=0;n<6;n++)W.addUnit('meumeu','villageois',ci-4+n*.7,cj+5);
  W.formSquad([...sol.slice(0,5),med[0],med[2]].map(u=>u.id));W.formSquad([...sol.slice(5),med[1],med[3]].map(u=>u.id));
  // l'avant-poste bèè, vers les Bèè, à une quarantaine de cases
  const [bi,bj]=W.G.beee[0];const d=Math.hypot(bi-ci,bj-cj);let post=null;
  for(let R=40;R<=70&&!post;R+=3){const x=Math.round(ci+(bi-ci)/d*R),y=Math.round(cj+(bj-cj)/d*R);for(let r=0;r<10&&!post;r++)for(let a=0;a<12;a++){const i=Math.round(x+Math.cos(a/12*6.283)*r),j=Math.round(y+Math.sin(a/12*6.283)*r);
      let ok=true;for(let dy=-5;dy<=5&&ok;dy++)for(let dx=-5;dx<=5;dx++){const kk=(j+dy)*W.N+i+dx;const T=W.G.terrain[kk];if(T==null||T<2||T>6||W.occ[kk]>=0){ok=false;break;}}if(ok){post=[i,j];break;}}}
  if(post){W.makeBeeeCity(post[0],post[1],'Avant-poste de Bèèval');const c=s.beee.cities[s.beee.cities.length-1];
    for(let n=0;n<6;n++){const a=n/6*Math.PI*2;const u=W.addUnit('beee',n<5?'soldat':'commando',post[0]+Math.cos(a)*4,post[1]+Math.sin(a)*4,{armor:n<5?'bee_casque':'bee_plaque'});W.resupply?.(u);u.city=c.id;}}
  // la guerre est déclarée ; leurs grandes vagues attendent le jour 5
  W.declareWar('meumeu');s.beee.nextWave=s.t+DAY*4;s.beee.nextAir=Infinity;
  W.log('Démo',`La guerre est déclarée. Un avant-poste bèè tient ${post?Math.round(Math.hypot(post[0]-ci,post[1]-cj)):'?'} cases au nord-est de la capitale ; leurs vagues viendront au jour 5. Deux escouades sont prêtes (touches 1 et 2), la caserne, le bureau d’études, la manufacture et l’arsenal attendent.`,'good');
  return {post};}
