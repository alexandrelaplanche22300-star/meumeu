// Oberkommando der Meumeu — l'allié : l'équivalent de l'IA bèè, mais du côté des Meumeu. Il tient la moitié haute de l'île meumeu (le joueur, la moitié basse)
// et la mène seul : villes, économie, armée, côte, offensives par la mer. Ses bâtiments et ses unités portent la marque `ally` : le joueur ne les commande pas,
// et l'allié ne touche jamais à ce qui est au joueur ni ne bâtit dans sa moitié. Il joue avec les règles du joueur (mêmes ordres, chantiers, dépôts, barges).
//   · les villes : chacune suit son ordre de construction ; une pénurie (pièces, charbon, fer, pierre) fait bâtir son producteur d'abord ; un chantier bloqué
//     36 h est abandonné (les matériaux reviennent) ; des villageois tant que les vivres suivent ; un moulin pour vingt-quatre bouches ;
//   · l'expansion : une nouvelle ville près des filons de sa moitié, tous les deux jours, jusqu'à six ; chacune reliée au réseau par une voie ferrée,
//     une gare à chaque bout et un train ;
//   · l'armée : des recrues par six à chaque caserne ; une garnison par ville, le reste en armée de campagne ; tout Bèè VU dans sa moitié (ou à ses abords)
//     est attaqué ; deux postes de mitrailleuse sur la côte de chaque ville côtière, tenus par deux hommes ;
//   · l'offensive : des barges bâties sur sa plage ; quand l'armée de campagne est assez forte, un débarquement sur la côte bèè (la plage la moins gardée) ;
//     à terre, jamais de repli : ses troupes marchent sur la ville bèè reconnue la plus proche, sinon poussent vers l'intérieur ; les renforts débarquent là où elles sont.
import {BUILDINGS,VEHICLES} from './data.js';
import {bunkerKey} from './bunkerdata.js';

const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const up=u=>u&&u.hp>0&&u.h?.state!=='hors'&&u.h?.state!=='mort';
const ORDER_MAIN=['camp','atelier','moulin','grenier','four','mine:pierre','moulin','mine:fer','mine:charbon','caserne','entrepot','moulin','arsenal','manufacture','hopital','tour','tour','moulin','caserne'];
const ORDER_TOWN=['camp','moulin','atelier','mine:fer','mine:charbon','tour','moulin','caserne'];
const PRODUCT={four:'charbon',atelier:'pieces',arsenal:'m:mle1',manufacture:'a:mle1'};
const MAKER={pieces:'atelier',charbon:'four',fer:'mine:fer',pierre:'mine:pierre'};
const MAXC=6;

export const ALLIE={
  allyCentre(){const A=this.s.ally;if(!A)return null;for(const c of A.cities||[]){const b=this.building(c.c);if(b&&!b.ruin)return b;}return null;},
  allyCities(){return (this.s.ally?.cities||[]).map(c=>({b:this.building(c.c),C:c})).filter(x=>x.b&&!x.b.ruin);},
  allyUnits(){return this.s.units.filter(u=>u.ally&&up(u));},
  // sa moitié : la même terre que sa première ville, et du bon côté de la ligne de partage
  allyZone(x,y){const A=this.s.ally;if(!A)return false;const L=this.landComp(),N=this.N,k=Math.floor(y)*N+Math.floor(x);return L[k]>=0&&L[k]===A.land&&(A.up?y<A.split:y>A.split);},
  allyPlace(k,cx,cy,r0=6,r1=34,rot=0){let at=null;const [w,h]=BUILDINGS[k].size||[2,2];const ok=(i,j)=>this.allyZone(i,j)&&this.allyZone(i+w,j+h)&&this.canPlace('meumeu',k,i,j,rot).ok;
    if(BUILDINGS[k].soil){let bs=-1e9;for(let j=Math.round(cy-r1);j<=cy+r1;j++)for(let i=Math.round(cx-r1);i<=cx+r1;i++){const d=d2(i,j,cx,cy);if(d<r0||d>r1||!ok(i,j))continue;const sc=this.cropYield(null,i,j,k)*30-d*.25;if(sc>bs){bs=sc;at=[i,j];}}}
    else for(let r=r0;r<=r1&&!at;r++)for(let a=0;a<32;a++){const i=Math.round(cx+Math.cos(a/32*6.283+r*.37)*r),j=Math.round(cy+Math.sin(a/32*6.283+r*.37)*r);if(ok(i,j)){at=[i,j];break;}}
    if(!at)return null;const out=this.place('meumeu',k,at[0],at[1],rot);if(!out.ok)return null;out.b.ally=true;return out.b;},
  allyMine(res,cx,cy){const ns=this.s.nodes.filter(n=>n.left>0&&n.type==='ore'&&n.res===res&&d2(n.i,n.j,cx,cy)<70&&this.allyZone(n.i,n.j)&&!this.s.buildings.some(b=>b.k==='mine'&&!b.ruin&&d2(b.i+1,b.j+1,n.i,n.j)<3)).sort((a,z)=>d2(a.i,a.j,cx,cy)-d2(z.i,z.j,cx,cy));
    for(const n of ns)for(const [di,dj] of [[0,0],[-1,0],[0,-1],[-1,-1]]){if(!this.canPlace('meumeu','mine',n.i+di,n.j+dj).ok)continue;const out=this.place('meumeu','mine',n.i+di,n.j+dj);if(out.ok){out.b.ally=true;return out.b;}}
    return null;},
  allyBuild(k,cx,cy){if(k.startsWith('mine:'))return this.allyMine(k.slice(5),cx,cy);
    if(k==='camp'){const tr=this.s.nodes.filter(n=>n.type==='tree'&&n.left>0&&this.allyZone(n.i,n.j)).sort((a,z)=>d2(a.i,a.j,cx,cy)-d2(z.i,z.j,cx,cy))[0];return tr?this.allyPlace('camp',tr.i,tr.j,2,10):null;}
    return this.allyPlace(k,cx,cy,k==='tour'?9:6);},
  // des porteurs pour ses dépôts : ses villageois oisifs (jamais ceux du joueur) deviennent porteurs de ce dépôt
  allyPorters(D,n){const [x,y]=this.bc(D);const us=this.s.units.filter(u=>u.ally&&u.k==='villageois'&&!u.task&&up(u)&&d2(u.x,u.y,x,y)<60).slice(0,n);
    for(const u of us){this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);const v=this.addVehicle(D.f,'porteur',D);Object.assign(v,{x:u.x,y:u.y,at:null,name:u.name||v.name,u,range:VEHICLES.porteur.range,ally:true});}return us.length;},
  // un camp-dépôt près de (x, y) s'il n'y a aucun dépôt meumeu à 30 cases (un chantier en a besoin) ; vrai s'il faut attendre
  allyNeedDepot(x,y){if(this.depots('meumeu',x,y,30).length)return false;if(!this.s.buildings.some(b=>b.ally&&b.k==='camp'&&!b.done&&d2(b.i,b.j,x,y)<30))this.allyPlace('camp',x,y,2,14);return true;},
  // ---------- le pas : toutes les demi-heures de jeu ----------
  allyTick(){const A=this.s.ally;if(!A)return;const t=this.s.t;if(t-(A.t??-9)<.5)return;A.t=t;const cities=this.allyCities();
    if(!cities.length){if(!A.fallen){A.fallen=true;this.log('Front','Les villes alliées sont toutes tombées.','bad');}return;}
    const us=this.allyUnits();for(const c of cities)this.allyCity(c,us,cities);
    this.allyExpand(cities,us);this.allyRail(cities,us);this.allyArmy(cities,us);this.allyCoast(cities,us);this.allyNaval(cities,us);},
  // une ville : chantiers, pénuries, bras, croissance
  allyCity({b:C,C:S},us,cities){const t=this.s.t,[cx,cy]=[C.i+2,C.j+2],near=b=>d2(b.i,b.j,cx,cy)<40;
    const mine=k=>this.s.buildings.filter(b=>b.ally&&b.k===k&&!b.ruin&&near(b));
    const V=us.filter(u=>u.k==='villageois'&&u.h?.state==='ok'&&!u.inBarracks&&d2(u.x,u.y,cx,cy)<60),idle=V.filter(u=>!u.task);
    const sites=this.s.buildings.filter(b=>b.ally&&!b.done&&!b.ruin&&near(b)),st=this.have('meumeu',cx,cy);const go=(u,tg)=>this.order([u.id],tg,true);
    // un chantier qui n'avance plus depuis 36 h est abandonné (les matériaux reviennent au dépôt)
    for(const s of sites){const adv=(s.progress||0)+Object.values(s.paid||{}).reduce((a,v)=>a+v,0)/1000;if(s.allyP!==adv){s.allyP=adv;s.allyT=t;}else if(t-(s.allyT??t)>36)this.cancel(s.id);}
    for(let n=sites.length-1;n>=0;n--)if(!this.building(sites[n].id))sites.splice(n,1);
    // une pénurie : le producteur de ce qui manque passe devant (une fois par jour et par manque)
    if(sites.length<3)for(const s of sites){const m=/(\d[\d.,]*) (pièces|charbon|fer|pierre)/.exec(s.why||'');if(!m)continue;const g={'pièces':'pieces',charbon:'charbon',fer:'fer',pierre:'pierre'}[m[2]],P=MAKER[g];
      const have=P.startsWith('mine:')?this.s.buildings.some(b=>b.ally&&b.k==='mine'&&!b.ruin&&near(b)&&this.s.nodes[b.ore]?.res===P.slice(5)):mine(P).length;if(have||(S.made??={})[P]>t)continue;S.made[P]=t+24;this.allyBuild(P,cx,cy);break;}
    // l'ordre de construction : deux chantiers à la fois
    const L=S.main?ORDER_MAIN:ORDER_TOWN;S.step??=0;if(this.s.buildings.filter(b=>b.ally&&!b.done&&!b.ruin&&near(b)).length<2&&S.step<L.length&&t>=(S.buildT||0)){
      const b=this.allyBuild(L[S.step],cx,cy);if(b||(S.fails=(S.fails||0)+1)>6){S.step++;S.fails=0;}else S.buildT=t+2;}
    const pop=V.length,food=mine('moulin').length*24;if(sites.length<2&&pop>food-4&&!sites.some(b=>BUILDINGS[b.k].soil)&&t>=(S.millT||0)){S.millT=t+8;this.allyPlace('moulin',cx,cy);}
    for(const b of this.s.buildings)if(b.ally&&b.done&&BUILDINGS[b.k].factory&&!b.prod&&PRODUCT[b.k])this.setProduct(b,PRODUCT[b.k]);
    if(S.main&&mine('caserne').some(b=>b.done)&&!S.want){S.want=1;this.setWant(C,'pieces',40);this.setWant(C,'a:mle1',12);this.setWant(C,'m:mle1',12);this.setPrio?.(C,5);}
    // les bras : chantiers (trois), usines et mines (au complet), camps (quatre), puis la récolte de ce qui manque
    for(const s of sites){for(let n=V.filter(u=>u.task?.b===s.id).length;n<3&&idle.length;n++)go(idle.shift(),{type:'building',id:s.id});}
    const enough=b=>b.k==='mine'&&(st[this.s.nodes[b.ore]?.res]||0)>600||b.k==='camp'&&(st.bois||0)>1500&&(st.pierre||0)>400;
    for(const b of this.s.buildings)if(b.ally&&b.done&&!b.ruin&&near(b)&&enough(b))for(const u of this.workers(b))if(u.ally){u.task=null;u.path=null;}
    // un dépôt plein à 90 % : un entrepôt de plus (une fois par jour)
    if(t>=(S.storeT||0)&&this.s.buildings.some(D=>D.ally&&D.done&&near(D)&&BUILDINGS[D.k].store&&!BUILDINGS[D.k].foodOnly&&this.stored(D)>BUILDINGS[D.k].store*.9)){S.storeT=t+24;this.allyPlace('entrepot',cx,cy);}
    for(const b of this.s.buildings){if(!b.ally||!b.done||b.ruin||!BUILDINGS[b.k].workers||b.k==='caserne'||!near(b)||enough(b))continue;const cap=b.k==='camp'?4:BUILDINGS[b.k].workers;for(let n=this.workers(b).length;n<cap&&idle.length;n++)go(idle.shift(),{type:'building',id:b.id});}
    for(const u of idle){const need=(st.pierre||0)<150?'rock':(st.bois||0)<500?'tree':null;if(!need)continue;const n=this.s.nodes.filter(n=>n.type===need&&n.left>0&&d2(n.i,n.j,cx,cy)<60&&this.allyZone(n.i,n.j)).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y))[0];if(n)go(u,{type:'node',id:n.id});}
    if((C.stock.vivres||0)>80&&!C.queue.length&&pop<food+6)this.train(C,'villageois');
    // les porteurs : trois au centre, deux au grenier et à l'entrepôt, un par camp
    for(const D of this.s.buildings){if(!D.ally||!D.done||D.ruin||!near(D))continue;const want={centre:3,grenier:2,entrepot:2,camp:1}[D.k];if(want&&this.porters(D).length<want&&this.s.vehicles.filter(v=>v.ally&&v.k==='porteur').length<us.filter(u=>u.k==='villageois').length/4)this.allyPorters(D,1);}},
  // ---------- l'expansion : une ville de plus, près des filons de sa moitié ----------
  allyExpand(cities,us){const A=this.s.ally,t=this.s.t;if(cities.length>=MAXC||t<(A.expandT??48))return;A.expandT=t+48;
    if(A.expandAt){const [i,j]=A.expandAt;if(this.allyNeedDepot(i,j)){A.expandT=t+4;if((A.expandTry=(A.expandTry||0)+1)>12){A.expandAt=null;A.expandTry=0;}return;}
      const b=this.allyPlace('centre',i,j,0,10);A.expandAt=null;A.expandTry=0;if(!b)return;b.city=this.allyCityName();A.cities.push({c:b.id});
      const V=us.filter(u=>u.k==='villageois'&&!u.inBarracks&&(!u.task||u.task.kind==='gather'));for(const u of V.slice(0,6))this.order([u.id],{type:'building',id:b.id},true);
      this.log(b.city,`L’allié fonde une nouvelle ville : ${b.city}.`,'info');return;}
    if(this.s.buildings.some(b=>b.ally&&b.k==='centre'&&!b.done&&!b.ruin))return;
    const main=cities.find(c=>c.C.main)||cities[0];const V=us.filter(u=>u.k==='villageois'&&!u.inBarracks);if(V.length<25)return;
    const st=this.have('meumeu',main.b.i+2,main.b.j+2,60);if((st.bois||0)<220||(st.pierre||0)<160)return;
    // un site : à 50-130 cases des villes alliées, dans sa moitié, le plus de filons (fer, charbon, pierre) à 30 cases
    let best=null,bs=-1e9;const [x0,y0,x1,y1]=this.bounds;
    for(let j=y0+20;j<y1-20;j+=8)for(let i=x0+20;i<x1-20;i+=8){if(!this.allyZone(i,j)||!this.allyZone(i+4,j+4))continue;const dm=Math.min(...cities.map(c=>d2(i,j,c.b.i,c.b.j)));if(dm<50||dm>(this.allyCoastCity()?130:300))continue;
      const ores=this.s.nodes.filter(n=>n.type==='ore'&&n.left>0&&Math.abs(n.i-i)<30&&Math.abs(n.j-j)<30).length;const dk=this.G.dcoast?this.G.dcoast[j*this.N+i]:99,coastal=dk>=25&&dk<=60;const needCoast=!this.allyCoastCity();if(needCoast&&!coastal)continue;const sc=ores*3-dm*.03;if(sc>bs&&this.occ[j*this.N+i]<0){bs=sc;best=[i,j];}}
    if(!best)return;A.expandAt=best;A.expandT=t+1;},
  // la ville alliée la plus proche de la mer (centrale), celle des barges
  allyCoastCity(){const dc=this.G.dcoast;if(!dc)return null;let best=null,bd=70;for(const c of this.allyCities()){const d=dc[(c.b.j+2)*this.N+c.b.i+2];if(d<bd){bd=d;best=c;}}return best;},
  allyCityName(){const L=['Crème-sur-Bise','Beurre-les-Monts','Lait-Neuf','Fromagerie','Clochette','Pré-Doré'];const A=this.s.ally;A.nameN=(A.nameN||0)+1;return L[(A.nameN-1)%L.length]+' (allié)';},
  // ---------- l'armée ----------
  allyArmy(cities,us){const A=this.s.ally,t=this.s.t;
    const sold=us.filter(u=>u.k!=='villageois'&&!u.inBarracks&&!u.inVeh&&u.amphi==null);
    // les casernes : six recrues à la fois, tant que l'armée est sous son objectif (10 + 4 par jour, 160 au plus) et que la ville garde quinze bras
    const target=Math.min(160,10+4*Math.max(0,this.day-4));
    for(const cas of this.s.buildings.filter(b=>b.ally&&b.k==='caserne'&&b.done&&!b.ruin)){const inside=(cas.inside||[]).length,S=(cas.allyS??={});
      const V=us.filter(u=>u.k==='villageois'&&!u.inBarracks&&d2(u.x,u.y,cas.i,cas.j)<60);
      if(!inside&&sold.length<target&&V.length>15&&t>=(S.draftT||0)){const g=V.filter(u=>u.task?.kind==='gather'||!u.task).slice(0,6);if(g.length>=4){this.order(g.map(u=>u.id),{type:'building',id:cas.id},true);S.draftT=t+6;S.from=t;}}
      if(inside&&t-(S.from??t)>=48&&t>=(S.outT||0)){const r=this.releaseRecruits(cas,inside,'soldat','mle1',null);S.outT=t+4;if(r.ok){const fresh=this.s.units.filter(u=>u.ally&&u.k==='soldat'&&!u.sq);if(fresh.length>=2)this.formSquad(fresh.map(u=>u.id));}}}
    // les garnisons : quatre hommes par ville (six à la première), au plus près ; les postes de côte gardent les leurs
    const free=sold.filter(u=>!u.task?.bunker&&!u.allyRaid);const garr=new Set();
    for(const c of cities){const [cx,cy]=[c.b.i+2,c.b.j+2];const n=c.C.main?6:4;for(const u of free.filter(u=>!garr.has(u)).sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy)).slice(0,n)){garr.add(u);u.allyHome=c.b.id;}}
    const field=free.filter(u=>!garr.has(u));for(const u of field)u.allyHome=null;
    // la menace : des Bèè VUS dans sa moitié ou à 40 cases de ses villes
    const foes=this.s.units.filter(e=>e.f==='beee'&&up(e)&&!e.inVeh&&this.spotted(e,'meumeu')&&(this.allyZone(e.x,e.y)||cities.some(c=>d2(e.x,e.y,c.b.i+2,c.b.j+2)<40)));
    const send=(units,e)=>{const ids=units.filter(u=>!(u.task?.kind==='attack'&&up(this.unit(u.task.unit)))).map(u=>u.id);if(ids.length)this.order(ids,{type:'unit',id:e.id},true);};
    for(const c of cities){const [cx,cy]=[c.b.i+2,c.b.j+2];const close=foes.filter(e=>d2(e.x,e.y,cx,cy)<45);if(!close.length)continue;const e=close.sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy))[0];
      send(free.filter(u=>u.allyHome===c.b.id),e);if(!(c.C.alertT>t-12)){c.C.alertT=t;this.log(c.b.city||'Allié',`${c.b.city||'Une ville alliée'} est attaquée : la garnison riposte.`,'warn');}}
    if(foes.length&&field.length>=4){const cx=field.reduce((n,u)=>n+u.x,0)/field.length,cy=field.reduce((n,u)=>n+u.y,0)/field.length;const e=foes.sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy))[0];send(field,e);
      if(!A.sortieT||t-A.sortieT>12){A.sortieT=t;this.log('Front',`L’allié lance ${field.length} soldats contre des Bèè repérés.`,'info');}}
    // au calme : la garnison en couronne autour de sa ville ; l'armée de campagne en réserve près de la première ville
    const main=cities.find(c=>c.C.main)||cities[0];
    for(const u of free){if(u.task&&u.task.kind!=='guard'&&u.task.kind!=='attack')continue;if(u.task?.kind==='attack'&&up(this.unit(u.task.unit)))continue;
      const home=(u.allyHome!=null&&this.building(u.allyHome))||main.b;const [cx,cy]=[home.i+2,home.j+2],a=(u.id%12)/12*6.283,R=u.allyHome!=null?12:7;const tx=cx+Math.cos(a)*R,ty=cy+Math.sin(a)*R;
      if(u.task?.kind==='guard'&&u.task.allyPost&&d2(u.task.tx,u.task.ty,tx,ty)<1)continue;u.task={kind:'guard',tx,ty,allyPost:1};u.path=null;}
    // les troupes débarquées : la cible reconnue la plus proche, sinon fouiller l'intérieur
    this.allyRaidTick(sold.filter(u=>u.allyRaid));},
  // ---------- les chemins de fer : chaque ville est reliée au réseau allié par une voie, une gare à chaque bout, un train sur la ligne ----------
  // (comme les Bèè : la voie part vers la ville déjà reliée la plus proche ; jusqu'à six poseurs ; une voie qui n'avance plus change d'équipe,
  // ses dernières cases introuvables sont posées d'office ; la ligne finie, un train y roule)
  allyRail(cities,us){const t=this.s.t,N=this.N;if(this.day<3)return;const main=cities.find(c=>c.C.main)||cities[0];
    const near=(c,k)=>this.s.buildings.filter(b=>b.ally&&b.k===k&&!b.ruin&&d2(b.i,b.j,c.b.i,c.b.j)<26);
    for(const c of cities){if(c===main||!c.b.done)continue;const S=c.C;
      if(!S.railCells&&t>=(S.railTry||0)){S.railTry=t+12;const st=this.have('meumeu',c.b.i+2,c.b.j+2,60);if((st.bois||0)<100)continue;const a=[Math.round(c.b.i-6),Math.round(c.b.j-6)];
        const hubs=cities.filter(o=>o!==c&&(o===main||o.C.railCells)).map(o=>o===main?[main.b.i-7,main.b.j-6]:o.C.railCells[0]);const z=hubs.sort((p,q)=>d2(p[0],p[1],a[0],a[1])-d2(q[0],q[1],a[0],a[1]))[0];
        const cells=z&&this.railRoute(a[0],a[1],z[0],z[1]);if(cells?.length>1){this.planLine('meumeu','rail',cells);S.railCells=cells;S.railT=t;this.log(c.b.city||'Allié',`L’allié trace une voie ferrée de ${c.b.city||'sa ville'} à son réseau.`,'info');}}
      if(!S.railCells)continue;const A=S.railCells[0],Z=S.railCells[S.railCells.length-1];
      // une gare à chaque bout (au bord des rails)
      if(!near(c,'gare').length&&t>=(S.gareT||0)){S.gareT=t+6;this.allyNeedDepot(A[0],A[1])||this.allyPlace('gare',A[0],A[1],0,6);}
      if(!this.s.buildings.some(g=>g.ally&&g.k==='gare'&&!g.ruin&&d2(g.i,g.j,Z[0],Z[1])<10)&&t>=(S.gareZT||0)){S.gareZT=t+6;this.allyPlace('gare',Z[0],Z[1],0,6);}
      for(const g of this.s.buildings)if(g.ally&&g.k==='gare'&&!g.done&&!g.ruin&&d2(g.i,g.j,c.b.i,c.b.j)<200){const n=us.filter(u=>u.task?.kind==='build'&&u.task.b===g.id).length;if(n<2){const V=us.filter(u=>u.k==='villageois'&&(!u.task||u.task.kind==='gather')).sort((p,q)=>d2(p.x,p.y,g.i,g.j)-d2(q.x,q.y,g.i,g.j)).slice(0,2-n);for(const u of V)this.order([u.id],{type:'building',id:g.id},true);}}
      // les poseurs
      const todo=S.railCells.filter(([i,j])=>this.s.rails[j*N+i]&&!this.s.rails[j*N+i].b);
      if(todo.length){if(S.railTodo!==todo.length){S.railTodo=todo.length;S.railT=t;}
        const layers=us.filter(u=>u.task?.kind==='line'&&u.task.line==='rail');
        if(t-S.railT>36&&t-(S.railReset||0)>36){S.railReset=t;for(const u of layers)if(todo.some(([i,j])=>d2(i,j,u.x,u.y)<16)){u.task=null;u.path=null;}}
        if(t-S.railT>96&&todo.length<=4){for(const [i,j] of todo){const k=j*N+i;this.s.rails[k].paid=1;this.lineBuilt('rail',k);}S.railT=t;}
        const V=us.filter(u=>u.k==='villageois'&&(!u.task||u.task.kind==='gather'));for(let n=layers.length;n<Math.min(6,layers.length+2)&&V.length;n++){const [i,j]=todo[Math.floor(this.rand()*todo.length)];const u=V.sort((p,q)=>d2(p.x,p.y,i,j)-d2(q.x,q.y,i,j)).shift();u.task={kind:'line',line:'rail',x:i,y:j};u.path=null;u.goal=null;}}
      // la ligne finie : un train, une fois (la gare commande ce qu'il lui faut)
      else if(!S.trainAsked){const gz=this.s.buildings.find(g=>g.ally&&g.k==='gare'&&g.done&&!g.ruin&&d2(g.i,g.j,Z[0],Z[1])<10);if(gz){const r=this.train(gz,'train');if(r.ok){S.trainAsked=true;this.log(c.b.city||'Allié',`Un train allié roule sur la ligne de ${c.b.city||'sa ville'}.`,'info');}
        else{gz.want??={};for(const [k,n] of Object.entries(VEHICLES.train.cost))gz.want[k]=Math.max(gz.want[k]||0,n);gz.prio=5;}}}}},
  // ---------- la côte : deux postes de mitrailleuse face à la mer pour chaque ville côtière ----------
  allyCoast(cities,us){const t=this.s.t,A=this.s.ally;if(!this.G.dcoast||t<(A.coastT??0))return;A.coastT=t+12;const dc=this.G.dcoast,N=this.N;
    const sold=us.filter(u=>u.k==='soldat'&&!u.inBarracks&&!u.inVeh&&u.amphi==null&&!u.allyRaid);
    for(const c of cities){const [cx,cy]=[c.b.i+2,c.b.j+2];const posts=this.s.buildings.filter(b=>b.ally&&BUILDINGS[b.k].bunker&&!b.ruin&&d2(b.i,b.j,cx,cy)<90);
      // les postes finis reçoivent deux hommes
      for(const p of posts.filter(p=>p.done)){const occ=Object.keys(this.bunkerOcc?.(p)||{}).length;if(occ>=2)continue;const men=sold.filter(u=>!u.task?.bunker).sort((a,z)=>d2(a.x,a.y,p.i,p.j)-d2(z.x,z.y,p.i,p.j)).slice(0,2-occ);if(men.length)this.garrison(p,men);}
      if(posts.length>=2||!this.s.buildings.some(b=>b.ally&&b.k==='caserne'&&b.done))continue;
      // la plage la plus proche à moins de 90 cases ; le poste à 14 cases de l'eau, les embrasures vers le large
      let best=null,bd=1e9;for(let dj=-90;dj<=90;dj+=3)for(let di=-90;di<=90;di+=3){const i=cx+di,j=cy+dj;if(i<4||j<4||i>=N-4||j>=N-4)continue;const k=Math.floor(j)*N+Math.floor(i);if(dc[k]!==14||!this.allyZone(i,j))continue;const d=Math.hypot(di,dj)+posts.reduce((n,p)=>n+(d2(p.i,p.j,i,j)<25?200:0),0);if(d<bd){bd=d;best=[Math.floor(i),Math.floor(j)];}}
      if(!best)continue;const [i,j]=best;const gx=dc[j*N+Math.min(N-1,i+3)]-dc[j*N+Math.max(0,i-3)],gy=dc[Math.min(N-1,j+3)*N+i]-dc[Math.max(0,j-3)*N+i];const fx=-gx,fy=-gy;
      const dirs=[[0,-1],[1,0],[0,1],[-1,0]];let rot=0,bdot=-9;for(let r=0;r<4;r++){const dd=dirs[r][0]*fx+dirs[r][1]*fy;if(dd>bdot){bdot=dd;rot=r;}}
      const b=this.allyPlace(bunkerKey('poste_mg'),i,j,0,8,rot);if(b){const V=us.filter(u=>u.k==='villageois'&&!u.task).slice(0,3);for(const u of V)this.order([u.id],{type:'building',id:b.id},true);}}},
  // ---------- l'offensive par la mer ----------
  allyNaval(cities,us){const A=this.s.ally,t=this.s.t;if(this.G.mode!=='mer'||this.day<10)return;
    const boats=this.s.vehicles.filter(v=>v.f==='meumeu'&&v.k==='barge'&&v.hp>0&&!v.dead&&v.ally),sites=this.s.buildings.filter(b=>b.ally&&b.k==='barge'&&!b.done&&!b.ruin);
    // les barges : sur la plage la plus proche de la première ville, trois chantiers au plus ; la flotte voulue grandit avec les jours et les villes
    const coast=this.allyCoastCity();for(const s of sites){const adv=(s.progress||0)+Object.values(s.paid||{}).reduce((a,v)=>a+v,0)/1000;if(s.allyP!==adv){s.allyP=adv;s.allyT=t;}else if(t-(s.allyT??t)>48)this.cancel(s.id);}
    if(!coast)return;const main=coast;const want=Math.min(8,2+Math.floor(cities.length/2)+Math.floor(this.day/10));
    if(boats.length+sites.length<want&&sites.length<3&&t>=(A.bargeT||0)&&this.s.buildings.some(b=>b.ally&&b.k==='caserne'&&b.done)){A.bargeT=t+6;const p=this.allyBeachSite(main.b.i+2,main.b.j+2);
      if(p){const out=this.place('meumeu','barge',p[0],p[1]);if(out.ok)out.b.ally=true;}else{const q=this.allyBeachSite(main.b.i+2,main.b.j+2,true);if(q){this.allyNeedDepot(q[0],q[1]);A.bargeT=t+3;}}}
    for(const s of sites){const n=this.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===s.id).length;if(n<3){const V=us.filter(u=>u.k==='villageois'&&(!u.task||u.task.kind==='gather')).sort((a,z)=>d2(a.x,a.y,s.i,s.j)-d2(z.x,z.y,s.i,s.j)).slice(0,3-n);for(const u of V)this.order([u.id],{type:'building',id:s.id},true);}}
    if(!this.allyCoastCity())return;
    // le dépôt le plus proche des barges réclame des munitions (le fret les apporte) ; au départ, chaque barge en charge vingt caisses
    {const b0=boats[0]||sites[0];const D=b0&&this.depots('meumeu',b0.x??b0.i,b0.y??b0.j,40)[0];if(D&&!(D.want?.['m:mle1']>=60))this.setWant(D,'m:mle1',60);}
    // l'assaut : au moins deux barges libres, vingt soldats de campagne libres, un débarquement à la fois, dix jours entre deux
    if(this.s.amphi?.some(o=>o.ally)||t<(A.navalNext??0))return;const free=boats.filter(v=>!v.op);if(free.length<2)return;
    const field=us.filter(u=>u.k==='soldat'&&u.w&&!u.inBarracks&&!u.inVeh&&!u.task?.bunker&&!u.allyRaid&&u.amphi==null&&u.allyHome==null);
    if(field.length<60||free.length<3)return;   /* (un assaut lourd : 60 hommes et trois barges au moins — 41 fusiliers sur une côte fortifiée : 4 survivants le lendemain) */const cap=23,take=field.slice(0,Math.min(field.length,free.length*cap));const aim=this.allyAim(main);if(!aim)return;
    const fleet=free.slice(0,Math.ceil(take.length/cap));for(const v of fleet){v.cargo??={};const need=20-(v.cargo['m:mle1']||0);if(need<=0)continue;const got=this.take('meumeu',v.x,v.y,'m:mle1',need,120);if(got>0)v.cargo['m:mle1']=(v.cargo['m:mle1']||0)+got;}   /* (les soldats qui embarquent passent par les dépôts alliés à 120 cases et montent les caisses à bord) */
    const R=this.amphiLaunch('meumeu',take,fleet,aim[0],aim[1]);
    if(R.ok){R.op.ally=true;A.navalNext=t+24*10;A.navalN=(A.navalN||0)+1;for(const u of take)u.allyRaid=true;this.log('Front',`L’allié embarque ${take.length} soldats sur ${R.op.boats.length} barges pour la côte bèè.`,'info');}},
  // un site de barge : du sable à 1-3 cases de l'eau, dans sa moitié, au plus près de sa première ville (le chantier de 4 × 2)
  allyBeachSite(cx,cy,raw=false){const N=this.N,dc=this.G.dcoast;let best=null,bd=1e9;for(let dj=-150;dj<=150;dj+=2)for(let di=-60;di<=300;di+=2){const i=Math.floor(cx)+di,j=Math.floor(cy)+dj;if(i<6||j<6||i>=N-6||j>=N-6)continue;const k=j*N+i;if(dc[k]<1||dc[k]>3||this.occ[k]>=0)continue;
      if(!this.allyZone(i,j))continue;const d=Math.hypot(di,dj);if(d<bd&&(raw||this.canPlace('meumeu','barge',i-2,j-1).ok)){bd=d;best=raw?[i,j]:[i-2,j-1];}}return best;},
  // la plage visée : la plus proche de ses troupes déjà à terre (des renforts), sinon près du bâtiment bèè reconnu le plus proche de sa côte, sinon en face de sa première ville
  allyAim(main){const I=this.s.intel||{},mid=this.N/2,R=this.s.ally.raid;let tgt=null,bd=1e9;
    {const a=this.allyUnits().filter(u=>u.allyRaid&&!u.inVeh&&u.x>mid);if(a.length)tgt=[a.reduce((n,u)=>n+u.x,0)/a.length,a.reduce((n,u)=>n+u.y,0)/a.length];}   // (les renforts : la plage la plus proche des troupes déjà à terre)
    if(!tgt){const [,y0,,y1]=this.bounds;const known=this.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&I[b.id]),forts=known.filter(b=>BUILDINGS[b.k]?.bunker),towns=known.filter(b=>b.k==='centre');let bs=1e9;
      const cand=[];for(let y=y0+40;y<=y1-40;y+=25)cand.push([mid+170,y,1]);for(let x=mid+250;x<=this.bounds[2]-80;x+=50){cand.push([x,y0+20,0]);cand.push([x,y1-20,0]);}
      for(const [cx0,cy0,west] of cand){const p=this.amphiBeach(cx0,cy0,50);if(!p||p.x<=mid+60)continue;const nb=forts.filter(b=>d2(b.i,b.j,p.x,p.y)<40).length;const dt=towns.length?Math.min(...towns.map(b=>d2(b.i,b.j,p.x,p.y))):Math.abs(p.y-(main.b.j+2))*.5;const sc=nb*100+(west?150:0)+dt*.3;if(sc<bs){bs=sc;tgt=[p.x,p.y];}}}
    if(!tgt)tgt=[mid+160,main.b.j+2];const beach=this.amphiBeach(tgt[0],tgt[1],120);return beach&&beach.x>mid+40?[beach.x,beach.y]:null;},
  // à terre : un objectif, gardé jusqu'à sa destruction — le centre-ville bèè reconnu le plus proche, sinon le bâtiment reconnu le plus proche ; ceux qui sont
  // accrochés finissent leur combat ; sans cible connue, on fouille vers l'intérieur ; à moins de huit, on se retranche près de la plage en attendant des renforts
  // (mesuré : l'ordre était refait toutes les six heures vers une cible recalculée — le groupe faisait des allers-retours sans rien prendre)
  allyRaidTick(raid){const t=this.s.t,I=this.s.intel||{},A=this.s.ally,R=(A.raid??={});const ashore=raid.filter(u=>!u.inVeh&&u.amphi==null&&u.x>this.N/2);
    if(!ashore.length){if(!this.s.amphi?.some(o=>o.ally)){R.target=null;R.beach=null;}return;}
    const cx=ashore.reduce((n,u)=>n+u.x,0)/ashore.length,cy=ashore.reduce((n,u)=>n+u.y,0)/ashore.length;R.beach??=[cx,cy];
    const engaged=u=>u.task&&(u.task.kind==='attack'&&u.task.unit!=null&&up(this.unit(u.task.unit))||u.task.kind==='assault'||u.task.kind==='hosp'||u.task.kind==='evac');
    // (pas de repli : une fois débarqué, on ne retourne pas à la plage — la mer est dans le dos ; on avance ou on tient sur place, au contact)
    let T=R.target!=null&&this.building(R.target);if(T&&BUILDINGS[T.k]?.bunker)T=null;
    // (jamais un ouvrage de béton : le fusil n'y fait rien — mesuré : le raid allait d'un Tobrouk à l'autre sans en abattre un ; il les contourne)
    if(!T||T.ruin){const known=this.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&!BUILDINGS[b.k]?.bunker&&(I[b.id]||this.visibleAt('meumeu',b.i+1,b.j+1))&&d2(b.i,b.j,cx,cy)<220);
      const rank=b=>b.k==='centre'?0:['caserne','arsenal','manufacture','poudrerie','mine','gare','camp','atelier','four'].includes(b.k)?1:2;
      // (les petites cibles — camps, maisons — seulement en passant, à 40 cases : un camp de côte se relève aussitôt, le raid y piétinait)
      T=known.filter(b=>rank(b)<2||d2(b.i,b.j,cx,cy)<40).sort((a,z)=>rank(a)-rank(z)||d2(a.i,a.j,cx,cy)-d2(z.i,z.j,cx,cy))[0]||null;
      R.target=T?.id??null;if(T)this.log('Front',`Les troupes alliées débarquées marchent sur ${T.k==='centre'?'une ville bèè':'un bâtiment bèè'}.`,'info');}
    for(const u of ashore)if(u.task?.kind==='evac'){u.task=null;u.path=null;}
    const ammoBoats=this.s.vehicles.filter(v=>v.ally&&v.k==='barge'&&v.hp>0&&(v.cargo?.['m:mle1']||0)>=1&&v.x>this.N/2&&!(v.spd>.5));
    for(const u of ashore){const Wd=u.w&&this.W(u.w);if(Wd&&ammoBoats.length&&(u.mag||0)+(u.pouch||0)<(Wd.carry||Wd.p.mag*4)*.3){const v=ammoBoats.sort((a,z)=>d2(a.x,a.y,u.x,u.y)-d2(z.x,z.y,u.x,u.y))[0];if(d2(v.x,v.y,u.x,u.y)>25){/* trop loin : on ne recule pas pour des cartouches */}else if(d2(v.x,v.y,u.x,u.y)>2){if(!(u.task?.kind==='move'&&u.task.toBoat===v.id)){u.task={kind:'move',tx:v.x,ty:v.y,toBoat:v.id};u.path=null;}}continue;}
      if(engaged(u))continue;
      if(T){if(u.task?.kind==='attack'&&u.task.b===T.id)continue;this.order([u.id],{type:'building',id:T.id},true);}
      // sans cible : on pousse vers l'intérieur du pays bèè (vers son milieu), en ligne, là où sont les villes
      else if(!u.task||u.task.kind==='guard'||t-(u.raidT||0)>8){u.raidT=t;const [x0,y0,x1,y1]=this.bounds;const gx=Math.min(x1-40,cx+60),gy=cy+((y0+y1)/2-cy)*.35;const off=((u.id%9)-4)*1.4;this.order([u.id],{type:'point',x:gx,y:gy+off},true);}}},
};
