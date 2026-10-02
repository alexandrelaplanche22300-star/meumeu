// Oberkommando der Meumeu — l'état-major bèè de l'assaut amphibie (la mécanique commune est dans amphi.js).
// Les Bèè ne trichent pas : ils bâtissent des cales sur leur côte, y font construire des bateaux, rassemblent des soldats des villes proches,
// choisissent une plage en face (près d'une cible CONNUE de leur renseignement, sinon une plage au hasard) et lancent la flotte.
// À terre, les débarqués forment un groupe d'assaut (le même que celui des attaques par terre).
import {BUILDINGS} from './data.js';
import {VEHDEF} from './vehicules.js';

const BEE_AMPHI_DAY=22,BEE_AMPHI_BUNKERS=15,CALES=3;
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);

export const AMPHI_BEE={
  // ce que la flotte voulue coûte encore (cales manquantes, bateaux manquants) : le programme côtier le laisse en réserve
  amphiBeeReserve(){if(this.G?.mode!=='mer'||this.day<BEE_AMPHI_DAY-2)return {};const B=this.s.beee;const want=this.amphiBeeWant();let miss=Math.max(0,want-this.amphiBeeBoats().length);for(const b of this.amphiBeeCales())miss-=b.queue.filter(q=>q.k==='bateau_bee').length;miss=Math.max(0,Math.min(6,miss));
    const cm=Math.max(0,CALES-this.amphiBeeCales().length),C=VEHDEF.bateau_bee.cout||{},K=BUILDINGS.cale.cost;const out={};for(const [k,n] of Object.entries(C))out[k]=(out[k]||0)+n*miss;for(const [k,n] of Object.entries(K))out[k]=(out[k]||0)+n*Math.min(1,cm);return out;},
  amphiBeeWant(){return Math.min(24,6+Math.floor(Math.max(0,this.day-BEE_AMPHI_DAY)/2));},
  amphiBeeBoats(){return this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='bateau_bee'&&v.hp>0&&!v.dead);},
  amphiBeeCales(){return this.s.buildings.filter(b=>b.f==='beee'&&b.k==='cale'&&!b.ruin);},
  // l'état-major : toutes les quatre heures de jeu
  amphiBeeTick(){if(this.G?.mode!=='mer'||!this.G.dcoast)return;const B=this.s.beee,t=this.s.t;if(t-(B.amphiT??-99)<4)return;B.amphiT=t;
    if(this.day<BEE_AMPHI_DAY||(B.fort?.count||0)<BEE_AMPHI_BUNKERS)return;
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(cities.length<4)return;
    // 1. les cales : jusqu'à trois, au bord de l'eau, près d'une ville (une à la fois)
    const cales=this.amphiBeeCales();
    if(cales.length<CALES&&!cales.some(b=>!b.done)&&t>=(B.caleT??0)){B.caleT=t+12;const c=cities[Math.floor(this.rand()*cities.length)],at=this.amphiBeeCaleSite(c);if(at){const b=this.beeeBuild('cale',at[0],at[1],10);if(b)b.prio=3;}}
    for(const b of cales){if(b.done)continue;const have=this.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;for(const u of this.beeeAvailable(b.i,b.j,600).slice(0,Math.max(0,4-have)))this.beeeAssign(u,{kind:'build',b:b.id});}
    // 2. les bateaux : chaque cale finie en fabrique un à la fois, jusqu'à la taille de la flotte voulue
    const want=this.amphiBeeWant(),have=this.amphiBeeBoats().length;let queued=0;for(const b of cales)queued+=b.queue.filter(q=>q.k==='bateau_bee').length;
    if(have+queued<want)for(const b of cales){if(!b.done||b.queue.length)continue;if(have+queued>=want)break;const r=this.train(b,'bateau_bee');if(r.ok){queued++;B.amphiWhy=null;}else B.amphiWhy='bateau refusé : '+(r.why||[]).join(', ');}
    // 3. l'assaut : assez de bateaux libres, assez de monde dans les villes de la côte, et l'intervalle écoulé
    if(t<(B.amphiNext??0)||this.s.amphi?.some(o=>o.f==='beee'))return;
    const free=this.amphiBeeBoats().filter(v=>!v.op);if(free.length<Math.max(4,Math.ceil(want*.6)))return;
    const cx=free.reduce((n,v)=>n+v.x,0)/free.length,cy=free.reduce((n,v)=>n+v.y,0)/free.length;
    const base=cities.slice().sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy))[0];if(!base)return;
    const cap=Math.floor(VEHDEF.bateau_bee.places.passagers-1),need=Math.min(free.length*cap,Math.floor(free.length*cap*.9));
    const pool=this.beeeMuster(base,cities,need,2,260);if(pool.length<Math.max(24,free.length*7)){B.amphiWhy='troupes insuffisantes ('+pool.length+')';return;}
    const aim=this.amphiBeeAim(base);if(!aim)return;
    const boats=free.slice(0,Math.ceil(pool.length/cap));const R=this.amphiLaunch('beee',pool.slice(0,boats.length*cap),boats,aim[0],aim[1]);
    if(R.ok){B.amphiNext=t+24*(8+this.rand()*6);B.amphiCount=(B.amphiCount||0)+1;B.amphiWhy=null;this.log?.('Bèè',`Une flotte bèè appareille : ${R.op.units.length} soldats, ${boats.length} bateaux.`,'warn');}else B.amphiWhy=R.why?.[0];},
  // un site de cale près d'une ville : sable à 2-4 cases de l'eau, le plus proche du centre
  amphiBeeCaleSite(c){const N=this.N,dc=this.G.dcoast,ter=this.G.terrain;let best=null,bd=1e9;const R=170;
    for(let dj=-R;dj<=R;dj+=2)for(let di=-R;di<=R;di+=2){const i=Math.floor(c.x)+di,j=Math.floor(c.y)+dj;if(i<6||j<6||i>=N-6||j>=N-6)continue;const k=j*N+i;if(dc[k]<2||dc[k]>4||this.occ[k]>=0)continue;const d=Math.hypot(di,dj);if(d<bd&&this.canPlace('beee','cale',i-2,j-2).ok){bd=d;best=[i,j];}}return best;},
  // la plage visée : près d'un bâtiment meumeu connu (le plus proche de la côte bèè), sinon un point au hasard sur la rive d'en face
  amphiBeeAim(base){const B=this.s.beee,mid=this.N/2,bee=base.x>mid;let tgt=null,bd=1e9;
    for(const b of this.s.buildings){if(b.f!=='meumeu'||b.ruin||!B.known?.[b.id])continue;const d=d2(b.i,b.j,base.x,base.y);if(d<bd){bd=d;tgt=[b.i+1,b.j+1];}}
    if(!tgt){const y=this.G.bounds?this.G.bounds[1]+this.rand()*(this.G.bounds[3]-this.G.bounds[1]):this.N/2;tgt=[bee?mid-130:mid+130,y];}
    const beach=this.amphiBeach(tgt[0],tgt[1],120);return beach&&(beach.x<mid)===bee?[beach.x,beach.y]:null;},
  // les débarqués forment un groupe d'assaut (un seul par opération), contre la cible connue la plus proche de la plage
  amphiBeeLanded(op,out){const B=this.s.beee;let band=op.bandId&&B.bands?.find(b=>b.id===op.bandId);
    if(!band){let tgt=null,bd=1e9;for(const b of this.s.buildings){if(b.f!=='meumeu'||b.ruin||!B.known?.[b.id])continue;const d=d2(b.i,b.j,op.beach.x,op.beach.y);if(d<bd){bd=d;tgt=b;}}
      if(!tgt){for(const u of out){u.amphi=null;u.task={kind:'move',tx:op.beach.x-op.beach.nx*8,ty:op.beach.y-op.beach.ny*8};}return;}
      band=this.makeBand(out,tgt,{x:op.beach.x,y:op.beach.y});band.kind='debarquement';op.bandId=band.id;return;}
    for(const u of out){band.m.push(u.id);u.band=band.id;u.task={kind:'band',tx:u.x,ty:u.y};}band.peak=Math.max(band.peak,band.m.length);},
};
