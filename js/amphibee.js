// Oberkommando der Meumeu — l'état-major bèè de l'assaut amphibie (la mécanique commune est dans amphi.js).
// Les Bèè ne trichent pas : ils construisent leurs bateaux sur leur plage, comme des bâtiments, rassemblent des soldats des villes proches,
// choisissent une plage en face (près d'une cible CONNUE de leur renseignement, sinon une plage au hasard) et lancent la flotte.
// À terre, les débarqués forment un groupe d'assaut (le même que celui des attaques par terre).
import {BUILDINGS} from './data.js';
import {VEHDEF} from './vehicules.js';

const BEE_AMPHI_DAY=22,BEE_AMPHI_BUNKERS=15,SITES=3;
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);

export const AMPHI_BEE={
  // ce que la flotte voulue coûte encore (bateaux ni à l'eau ni en chantier) : le programme côtier le laisse en réserve
  amphiBeeReserve(){if(this.G?.mode!=='mer'||this.day<BEE_AMPHI_DAY-2)return {};const miss=Math.max(0,Math.min(6,this.amphiBeeWant()-this.amphiBeeBoats().length-this.amphiBeeSites().length));
    const out={};for(const [k,n] of Object.entries(BUILDINGS.bateau_bee.cost))out[k]=n*miss;return out;},
  amphiBeeWant(){return Math.min(24,6+Math.floor(Math.max(0,this.day-BEE_AMPHI_DAY)/2));},
  amphiBeeBoats(){return this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='bateau_bee'&&v.hp>0&&!v.dead);},
  // les bateaux en chantier sur la plage
  amphiBeeSites(){return this.s.buildings.filter(b=>b.f==='beee'&&b.k==='bateau_bee'&&!b.done&&!b.ruin);},
  // l'état-major : toutes les deux heures de jeu
  amphiBeeTick(){if(this.G?.mode!=='mer'||!this.G.dcoast)return;this.amphiBeeRiposteTick();const B=this.s.beee,t=this.s.t;if(t-(B.amphiT??-99)<2)return;B.amphiT=t;this.amphiBeeHeadTick();
    if(this.day<BEE_AMPHI_DAY||(B.fort?.count||0)<BEE_AMPHI_BUNKERS)return;
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(cities.length<4)return;
    // 1. les bateaux se construisent sur la plage, comme des bâtiments : trois chantiers à la fois au plus, sur la côte de la ville la plus proche de la mer
    //    (ses dépôts fournissent le bois et le fer) ; fini, le bateau glisse à l'eau devant son chantier
    const want=this.amphiBeeWant(),have=this.amphiBeeBoats().length,sites=this.amphiBeeSites();
    if(have+sites.length<want&&sites.length<SITES&&t>=(B.siteT??0)){B.siteT=t+4;let at=null,bd=1e9;const cost=BUILDINGS.bateau_bee.cost;const stocked=this.depotList('beee').filter(D=>D.done&&!D.ruin&&!BUILDINGS[D.k].foodOnly&&Object.entries(cost).every(([k,n])=>k==='pieces'||(this.have('beee',D.i+1,D.j+1)[k]||0)>=n*2));
      for(const o of [...stocked.map(D=>({x:D.i+1,y:D.j+1,R:70})),...cities.map(c=>({x:c.x,y:c.y,R:170,far:1}))]){const p=this.amphiBeeBoatSite(o,o.R);if(!p)continue;const d=d2(p[0],p[1],o.x,o.y)+(o.far?400:0);if(d<bd){bd=d;at=p;}if(at&&!o.far&&bd<25)break;}
      if(at){const b=this.beeeBuild('bateau_bee',at[0],at[1],4);if(b){b.prio=3;B.amphiWhy=null;}else B.amphiWhy='pas de place pour un bateau';}else B.amphiWhy='pas de plage près des villes';}
    for(const b of sites){const n=this.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;for(const u of this.beeeAvailable(b.i,b.j,600).slice(0,Math.max(0,4-n)))this.beeeAssign(u,{kind:'build',b:b.id});}
    // 3. l'assaut : assez de bateaux libres, assez de monde dans les villes de la côte, et l'intervalle écoulé
    if(t<(B.amphiNext??0)||this.s.amphi?.some(o=>o.f==='beee'))return;
    const free=this.amphiBeeBoats().filter(v=>!v.op);const need0=Math.min(want,6+2*(B.amphiCount||0));if(free.length<need0){B.amphiWhy=`flotte ${free.length}/${need0}`;return;}   /* (premier assaut à 6 bateaux, puis deux de plus à chaque fois) */
    const cx=free.reduce((n,v)=>n+v.x,0)/free.length,cy=free.reduce((n,v)=>n+v.y,0)/free.length;
    const base=cities.slice().sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy))[0];if(!base)return;
    const cap=Math.floor(VEHDEF.bateau_bee.places.passagers-1),need=Math.min(free.length*cap,Math.floor(free.length*cap*.9));
    const pool=this.beeeMuster(base,cities,need,2,260);if(pool.length<Math.max(24,free.length*7)){B.amphiWhy='troupes insuffisantes ('+pool.length+')';return;}
    const aim=this.amphiBeeAim(base);if(!aim)return;
    const vil=(B.heads||[]).some(h=>h.camp)?[]:this.beeeAvailable(base.x,base.y,260).slice(0,6);pool.push(...vil);
    const boats=free.slice(0,Math.ceil(pool.length/cap));const R=this.amphiLaunch('beee',pool.slice(0,boats.length*cap),boats,aim[0],aim[1]);
    if(R.ok){B.amphiNext=t+24*(8+this.rand()*6);B.amphiCount=(B.amphiCount||0)+1;B.amphiWhy=null;this.log?.('Bèè',`Une flotte bèè appareille : ${R.op.units.length} soldats, ${boats.length} bateaux.`,'warn');}else B.amphiWhy=R.why?.[0];},
  // un chantier de bateau près d'une ville : du sable à 1-3 cases de l'eau, le plus proche du centre (le coin haut-gauche du chantier de 4 × 2)
  amphiBeeBoatSite(c,R=170){const N=this.N,dc=this.G.dcoast;let best=null,bd=1e9;
    for(let dj=-R;dj<=R;dj+=2)for(let di=-R;di<=R;di+=2){const i=Math.floor(c.x)+di,j=Math.floor(c.y)+dj;if(i<6||j<6||i>=N-6||j>=N-6)continue;const k=j*N+i;if(dc[k]<1||dc[k]>3||this.occ[k]>=0)continue;const d=Math.hypot(di,dj);if(d<bd&&this.canPlace('beee','bateau_bee',i-2,j-1).ok){bd=d;best=[i,j];}}return best;},
  // la plage visée : une tête de pont qui tient encore (on la renforce), sinon près d'un bâtiment meumeu connu, sinon en face de la base (la traversée la plus courte)
  amphiBeeAim(base){const B=this.s.beee,mid=this.N/2,bee=base.x>mid;let tgt=null,bd=1e9;
    const H=(B.heads||[]).find(h=>this.amphiBeeHeadMen(h).length>0);if(H)tgt=[H.bx,H.by];
    if(!tgt)for(const b of this.s.buildings){if(b.f!=='meumeu'||b.ruin||!B.known?.[b.id])continue;const d=d2(b.i,b.j,base.x,base.y);if(d<bd){bd=d;tgt=[b.i+1,b.j+1];}}
    if(!tgt){const [,y0,,y1]=this.G.bounds||[0,0,this.N,this.N];const y=Math.max(y0+40,Math.min(y1-40,base.y+(this.rand()-.5)*160));tgt=[bee?mid-160:mid+160,y];}
    const beach=this.amphiBeach(tgt[0],tgt[1],120);return beach&&(beach.x<mid)===bee?[beach.x,beach.y]:null;},
  // ---------- la tête de pont ----------
  // les débarqués : si une cible meumeu est connue, un groupe d'assaut ; sinon (les Bèè ne savent rien de cette rive) une tête de pont qui se retranche,
  // envoie des éclaireurs, bâtit un camp-dépôt avec les villageois venus avec la vague, et lance l'assaut dès qu'un éclaireur a vu quelque chose
  amphiBeeLanded(op,out){const B=this.s.beee;let band=op.bandId&&B.bands?.find(b=>b.id===op.bandId);
    if(band){for(const u of out){if(u.k!=='soldat')continue;band.m.push(u.id);u.band=band.id;u.task={kind:'band',tx:u.x,ty:u.y};}band.peak=Math.max(band.peak,band.m.length);}
    let H=(B.heads??=[]).find(h=>d2(h.bx,h.by,op.beach.x,op.beach.y)<40);
    if(!H){const b0=op.beach;H={id:this.id(),bx:b0.x,by:b0.y,x:b0.x-b0.nx*12,y:b0.y-b0.ny*12,nx:b0.nx,ny:b0.ny,tx:b0.tx,ty:b0.ty,m:[],t0:this.s.t,reconT:0,camp:null};B.heads.push(H);
      this.log?.('Front',`Les Bèè ont débarqué : une tête de pont près de (${b0.x|0}, ${b0.y|0}).`,'bad');}
    for(const u of out){if(band&&u.k==='soldat')continue;u.amphi=null;u.city=null;u.head=H.id;H.m.push(u.id);}
    this.amphiBeeHeadPlace(H);},
  amphiBeeHeadMen(H){return H.m.map(id=>this.unit(id)).filter(u=>u&&u.hp>0&&u.f==='beee'&&!u.band&&u.head===H.id&&u.h?.state!=='hors');},
  // le retranchement : un arc à une douzaine de cases à l'intérieur, face aux terres ; les villageois au camp
  amphiBeeHeadPlace(H){const men=this.amphiBeeHeadMen(H),sold=men.filter(u=>u.k==='soldat'&&u.task?.kind!=='search');const n=sold.length;
    sold.forEach((u,q)=>{const off=(q-(n-1)/2)*1.6,row=q%2?3:0;const p=this.freeSpot(H.x+H.tx*off-H.nx*row,H.y+H.ty*off-H.ny*row,3);u.task={kind:'guard',tx:p[0],ty:p[1],hold:true,fx:-H.nx,fy:-H.ny};u.path=null;u.goal=null;});
    for(const u of men)if(u.k==='villageois'&&!u.task)u.task={kind:'move',tx:H.x+H.nx*3,ty:H.y+H.ny*3};},
  amphiBeeHeadTick(){const B=this.s.beee,t=this.s.t;if(!B.heads?.length)return;
    for(const H of [...B.heads]){const men=this.amphiBeeHeadMen(H);if(!men.length){B.heads.splice(B.heads.indexOf(H),1);continue;}
      const sold=men.filter(u=>u.k==='soldat'),vil=men.filter(u=>u.k==='villageois');
      // le camp-dépôt de la tête de pont (ses villageois le bâtissent)
      if(vil.length&&!(H.camp&&this.building(H.camp)&&!this.building(H.camp).ruin)){const c=this.beeeBuild('camp',H.x+H.nx*3,H.y+H.ny*3,10);if(c){H.camp=c.id;c.prio=4;for(const u of vil)this.beeeAssign(u,{kind:'build',b:c.id});}}
      // une cible connue (vue par un éclaireur, ou entendue) à moins de 350 cases : l'assaut, en gardant six hommes au retranchement
      let tgt=null,bd=350;for(const b of this.s.buildings){if(b.f!=='meumeu'||b.ruin||!B.known?.[b.id])continue;const d=d2(b.i,b.j,H.x,H.y);if(d<bd){bd=d;tgt=b;}}
      const free=sold.filter(u=>u.task?.kind!=='search');
      if(tgt&&free.length>=14){const go=free.slice(6);for(const u of go){u.head=null;H.m.splice(H.m.indexOf(u.id),1);}const band=this.makeBand(go,tgt,{x:H.x,y:H.y});band.kind='debarquement';
        this.log?.('Front',`Depuis leur tête de pont, ${go.length} Bèè passent à l’attaque.`,'bad');this.amphiBeeHeadPlace(H);continue;}
      // les éclaireurs : deux soldats, en éventail vers l'intérieur, toutes les dix heures
      // (chaque reconnaissance va plus loin, jusqu'à 300 cases ; un bruit entendu sur cette rive depuis moins d'un jour donne la direction)
      if(t>=H.reconT&&free.length>=4){H.reconT=t+10;H.reconN=(H.reconN||0)+1;const L=B.lead,heard=L&&t-L.t<24&&(L.x<this.N/2)===(H.x<this.N/2)&&L.bearing!=null;
        const a=heard?L.bearing+(this.rand()-.5)*(L.half||.4):Math.atan2(-H.ny,-H.nx)+(this.rand()-.5)*1.8,D=Math.min(300,60+40*H.reconN+this.rand()*40),ox=heard?L.x:H.x,oy=heard?L.y:H.y;
        if(heard){const p=this.freeSpot(ox+Math.cos(a)*Math.min(D,140),oy+Math.sin(a)*Math.min(D,140),8);for(const u of free.slice(-2)){u.task={kind:'search',pts:[p,[H.x,H.y]],i:0,scout:1,until:t+40,home:[H.x,H.y],t0:t};u.path=null;}}else{
        const p1=this.freeSpot(H.x+Math.cos(a)*D,H.y+Math.sin(a)*D,8),p2=this.freeSpot(H.x+Math.cos(a+.5)*D*.7,H.y+Math.sin(a+.5)*D*.7,8);
        for(const u of free.slice(-2)){u.task={kind:'search',pts:[p1,p2,[H.x,H.y]],i:0,scout:1,until:t+20+D*.3,home:[H.x,H.y],t0:t};u.path=null;}}}
      // les éclaireurs rentrés (garde sans place) et les renforts reprennent leur place dans l'arc
      if(sold.some(u=>!u.task||u.task.kind==='guard'&&!u.task.hold))this.amphiBeeHeadPlace(H);}},
  // ---------- la riposte : des Meumeu vus sur la rive bèè ----------
  // toutes les heures : les Meumeu VUS (pas devinés) sur la terre des Bèè sont regroupés par carrés de 48 cases ; le plus gros groupe déclenche une riposte
  // à sa mesure (deux Bèè pour un Meumeu, plus six), prise dans les villes proches — jamais dans les garnisons des ouvrages, qui tiennent leurs postes.
  // Le groupe de riposte suit l'ennemi (son point est remis à jour), reçoit des renforts s'il fond, et rentre quand la zone est calme.
  amphiBeeRiposteTick(){const B=this.s.beee,t=this.s.t;if(t-(B.ripT??-9)<1)return;B.ripT=t;
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(!cities.length)return;const L=this.landComp(),N=this.N;
    const home=L[Math.floor(cities[0].y)*N+Math.floor(cities[0].x)];if(home<0)return;
    const G=new Map();for(const u of this.s.units){if(u.f!=='meumeu'||!(u.hp>0)||u.inVeh||u.h?.state==='hors'||u.h?.state==='mort')continue;const k=Math.floor(u.y)*N+Math.floor(u.x);if(L[k]!==home||!this.spotted(u,'beee'))continue;
      const g=Math.floor(u.x/48)+','+Math.floor(u.y/48);let a=G.get(g);if(!a)G.set(g,a=[]);a.push(u);}
    const rip=(B.bands||[]).filter(b=>b.kind==='riposte');
    for(const b of rip){const g=[...G.values()].map(a=>[a,d2(a.reduce((n,u)=>n+u.x,0)/a.length,a.reduce((n,u)=>n+u.y,0)/a.length,b.pt[0],b.pt[1])]).sort((p,q)=>p[1]-q[1])[0];
      if(g&&g[1]<90){const a=g[0];b.pt=[a.reduce((n,u)=>n+u.x,0)/a.length,a.reduce((n,u)=>n+u.y,0)/a.length];b.seenT=t;b.enemy=a.length;}}
    for(const a of [...G.values()].sort((p,q)=>q.length-p.length)){if(a.length<2)break;const x=a.reduce((n,u)=>n+u.x,0)/a.length,y=a.reduce((n,u)=>n+u.y,0)/a.length;
      const need=Math.min(140,a.length*2+6);let band=rip.find(b=>d2(b.pt[0],b.pt[1],x,y)<90);
      const c=cities.slice().sort((p,q)=>d2(p.x,p.y,x,y)-d2(q.x,q.y,x,y))[0];
      if(band){const have=this.bandMembers(band).filter(u=>u.hp>0).length;if(have>=need*.7||t-(band.reinfT??-9)<6)continue;band.reinfT=t;
        const more=this.beeeMuster(c,cities,need-have,2,300).filter(u=>!u.task?.bunker&&!u.head);for(const u of more){band.m.push(u.id);u.from=u.city??u.from;u.city=null;u.band=band.id;u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}continue;}
      if(t<(B.ripRetry??0))continue;
      const pool=this.beeeMuster(c,cities,need,2,300).filter(u=>!u.task?.bunker&&!u.head);if(pool.length<Math.max(6,Math.ceil(need*.5))){B.ripRetry=t+2;continue;}
      const b=this.makeBand(pool,this.building(c.centre),c);b.city=c.id;b.pt=[x,y];b.seenT=t;b.enemy=a.length;b.kind='riposte';
      this.log?.(c.name,`${c.name} lance ${pool.length} hommes contre ${a.length} Meumeu débarqués.`,'warn');}
    // une riposte sans ennemi vu depuis 8 h rentre
    for(const b of rip)if(t-(b.seenT??t)>8){const up=this.bandMembers(b).filter(u=>u.hp>0);this.bandRetreat(b,up,b.pt,true);}},
};
