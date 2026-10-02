// Oberkommando der Meumeu — la mer : les barges de débarquement. Une barge est un ENGIN (VEHDEF, nav:'eau') : elle a un blindage (les balles de fusil et de mitrailleuse bèè
// ne percent pas sa coque), un pilote et des passagers (v.crew), une soute (v.cargo), un point de vie, et elle reçoit le feu comme n'importe quel engin. Ce fichier lui
// donne SA conduite : un chemin sur l'eau (jamais sur la terre), un pilote qui braque et accélère, l'échouage sur une plage, la rampe, le débarquement par l'avant,
// le désengagement et le retour, le chargement d'un véhicule à bord. Les méthodes sont posées sur World.
//  · v.state : 'go' (en route), 'idle' ; v.beached : échouée (elle touche la terre), v.ramp : 0 relevée → 1 abaissée (v.rampTo la consigne) ;
//  · v.cargoVeh : l'id du véhicule à bord (il suit la barge, posé sur le pont) ; v.aboard : sur un véhicule de ce type, l'id de sa barge.
import {TERRAIN,T,HOUR_REAL,BUILDINGS} from './data.js';
import {VEHDEF} from './vehicules.js';

const D2R=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const isWater=t=>t===T.deep||t===T.shallow;
const V0=v=>VEHDEF[v.k];

export const NAVAL={
  // ---------- la carte de l'eau ----------
  isWaterAt(x,y){const i=Math.floor(x),j=Math.floor(y);if(i<0||j<0||i>=this.N||j>=this.N)return false;return isWater(this.G.terrain[j*this.N+i]);},
  // la case la plus proche qui est de l'eau, dans un rayon ; privilégie une case d'eau voisine de la terre (une plage)
  nearestWater(x,y,r=14){const N=this.N,ter=this.G.terrain;let best=null,bd=1e9;const i0=Math.floor(x),j0=Math.floor(y);
    for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const i=i0+di,j=j0+dj;if(i<1||j<1||i>=N-1||j>=N-1)continue;if(!isWater(ter[j*N+i]))continue;const d=Math.hypot(i+.5-x,j+.5-y);if(d<bd){bd=d;best=[i,j];}}
    return best;},
  // le coût d'une case pour une barge : l'eau seulement ; le bord de la terre coûte (on s'en écarte tant qu'on n'y va pas), les hauts-fonds un peu
  boatCost(){const N=this.N,ter=this.G.terrain;return k=>{if(k<0||k>=ter.length)return Infinity;const t=ter[k];if(!isWater(t))return Infinity;let c=t===T.shallow?1.35:1;
      const i=k%N;for(const o of [1,-1,N,-N]){const kk=k+o;if(kk<0||kk>=ter.length||(o===1&&i===N-1)||(o===-1&&i===0))continue;if(!isWater(ter[kk])){c+=1.6;break;}}return c;};},
  // un chemin sur l'eau jusqu'à (tx, ty) ; si ce point est sur la terre : jusqu'à la case d'eau la plus proche (on s'y échoue). Renvoie {pts, beach, landAim} ou null.
  boatPlan(v,tx,ty){const N=this.N,cost=this.boatCost();const si=clamp(Math.floor(v.x),0,N-1),sj=clamp(Math.floor(v.y),0,N-1);
    let gx=tx,gy=ty,beach=false;if(!this.isWaterAt(tx,ty)){const w=this.nearestWater(tx,ty,18);if(!w)return null;gx=w[0]+.5;gy=w[1]+.5;beach=true;}
    const ti=Math.floor(gx),tj=Math.floor(gy),tk=tj*N+ti;
    // départ sur une case qui n'est pas de l'eau (la barge est à demi sur le sable) : la case d'eau la plus proche
    let sk=sj*N+si;if(cost(sk)===Infinity){const w=this.nearestWater(v.x,v.y,4);if(!w)return null;sk=w[1]*N+w[0];}
    const r=this.pather.find(sk%N,(sk/N)|0,ti,tj,cost,k=>k===tk,Math.max(60000,N*200));if(!r.done&&!(sk===tk))return null;
    const cells=[[sk%N+.5,((sk/N)|0)+.5],...r.path.map(([i,j])=>[i+.5,j+.5])];
    // le lissage : on saute les points intermédiaires tant que la ligne droite reste dans l'eau, à une demi-largeur de la terre
    const clear=(a,b)=>{const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L*2);for(let q=1;q<n;q++){const x=a[0]+(b[0]-a[0])*q/n,y=a[1]+(b[1]-a[1])*q/n;if(!this.isWaterAt(x,y)||!this.isWaterAt(x+.6,y)||!this.isWaterAt(x-.6,y)||!this.isWaterAt(x,y+.6)||!this.isWaterAt(x,y-.6))return false;}return true;};
    const pts=[cells[0]];let i=0;while(i<cells.length-1){let far=i+1;for(let m=Math.min(cells.length-1,i+40);m>i+1;m--)if(clear(cells[i],cells[m])){far=m;break;}pts.push(cells[far]);i=far;}
    return {pts,beach,landAim:beach?[tx,ty]:null,goal:[gx,gy]};},
  // l'ordre d'aller quelque part (clic droit) : la mer, ou une plage où s'échouer
  boatMove(v,tx,ty){const R=this.boatPlan(v,tx,ty);if(!R){v.why='pas de route sur l’eau jusque-là';v.bpath=null;v.state='idle';return false;}
    v.bpath=R.pts;v.bi=1;v.goal=R.goal;v.landAim=R.landAim;v.state='go';v.why=null;v.rampTo=0;v.aground=null;v.backing=v.beached||!this.boatClear(v,V0(v),1.3)?(v.backT=0,true):false;v.beached=false;return true;},
  // tous les points d'un cercle de rayon r autour de la barge sont de l'eau : elle peut virer sans toucher la terre
  boatClear(v,V,r){for(let a=0;a<6.2832;a+=.7854)if(!this.isWaterAt(v.x+Math.cos(a)*r,v.y+Math.sin(a)*r))return false;return true;},

  // ---------- la conduite ----------
  boatTick(v,V,dt){if(v.hp<=0){v.spd=0;return;}
    // la rampe : elle s'abaisse ou se relève en quelques secondes de combat
    v.ramp=(v.ramp||0)+clamp((v.rampTo||0)-(v.ramp||0),-dt*HOUR_REAL*.25,dt*HOUR_REAL*.25);
    if(v.fire>0){v.fire-=dt;v.hp-=dt*35;if(v.hp<=0){this.vehDestroyed(v,'brûlé');return;}}
    const drv=this.vehDriver(v);
    if(v.backing&&drv&&v.state==='go'){this.boatBack(v,V,dt);}
    else if(v.state==='go'&&v.bpath&&drv)this.boatDrive(v,V,dt);else{const dec=V.vmax/Math.max(.2,V.frein)*HOUR_REAL;v.spd=Math.max(0,(v.spd||0)-dec*dt);if(v.spd>0)this.boatStep(v,V,dt,v.h);}
    v.odo=(v.odo||0)+(v.spd||0)*dt;
    // un véhicule qui s'est mis en route pour se charger : arrivé, et la rampe baissée, il monte
    for(const c of this.s.vehicles){if(c.embarkTo!==v.id)continue;if(c.hp<=0||c.aboard){c.embarkTo=null;continue;}if((v.ramp||0)>=.9&&d2(c.x,c.y,v.x,v.y)<V.long/2+VEHDEF[c.k].long/2+2.5&&c.spd<.5){const r=this.boatEmbark(v,c);c.embarkTo=null;if(!r.ok&&c.f==='meumeu')this.log('Front',`${c.name} ne peut pas monter : ${r.why[0]}.`,'bad');}}
    // le véhicule à bord suit la barge, posé sur le pont
    if(v.cargoVeh!=null){const c=this.s.vehicles.find(o=>o.id===v.cargoVeh);if(!c||c.hp<=0||c.aboard!==v.id)v.cargoVeh=null;else{const off=V.deck?.[0]??-.2;c.x=v.x+Math.cos(v.h)*off;c.y=v.y+Math.sin(v.h)*off;c.h=v.h;c.spd=0;c.state='idle';c.path=null;c.itin=null;c.alt=0;c.onDeck=true;}}
    // une barge abandonnée (plus de pilote vivant) dérive de moins en moins : elle s'arrête ; coulée en mer : tout le monde à l'eau (voir vehDestroyed)
  },
  // avance d'un pas dans le cap h si la case suivante est de l'eau (sinon : échouage, on s'arrête)
  boatStep(v,V,dt,h,mark=true){const nx=v.x+Math.cos(h)*v.spd*dt,ny=v.y+Math.sin(h)*v.spd*dt;
    if(this.isWaterAt(nx,ny)){v.x=nx;v.y=ny;v.aground=null;return true;}
    // la proue touche le sable : échouée si c'est le but (viser une plage), sinon on s'arrête et on vire sur place
    v.spd=0;if(mark){v.beached=true;v.aground=[Math.floor(nx),Math.floor(ny)];}return false;},
  boatDrive(v,V,dt){const P=v.bpath;let bi=v.bi||1;const pr=(V.pivot||26)*D2R*HOUR_REAL;
    // le point visé : le prochain point du chemin ; atteint à moins de 0,9 case (1,5 en route, pour ne pas faire de petits cercles)
    const last=bi>=P.length-1;let tgt=P[Math.min(bi,P.length-1)];let d=d2(v.x,v.y,tgt[0],tgt[1]);
    while(!last&&d<1.6&&bi<P.length-1){bi++;tgt=P[bi];d=d2(v.x,v.y,tgt[0],tgt[1]);}v.bi=bi;
    const atEnd=bi>=P.length-1;
    if(atEnd&&d<.8){v.state='idle';v.bpath=null;v.spd=0;
      if(v.landAim){ // on s'échoue : le nez vers la terre visée
        v.h=Math.atan2(v.landAim[1]-v.y,v.landAim[0]-v.x);v.beached=true;}return;}
    const want=Math.atan2(tgt[1]-v.y,tgt[0]-v.x),err=wrap(want-v.h);v.yawRate=clamp(err*4*HOUR_REAL,-pr,pr);v.h=wrap(v.h+v.yawRate*dt);
    // la vitesse : pleine en eau profonde, réduite dans les hauts-fonds, freinée avant l'arrivée et dans les virages serrés
    const shallow=!this.isWaterAt(v.x+Math.cos(v.h)*2,v.y+Math.sin(v.h)*2)||this.G.terrain[Math.floor(v.y)*this.N+Math.floor(v.x)]===T.shallow;
    let vt=V.vmax*(shallow?.6:1)*(Math.abs(err)>.9?.35:1);const toEnd=this.boatRemain(v);vt=Math.min(vt,Math.max(1.5,toEnd*V.vmax/Math.max(2.5,V.frein*3)));
    const acc=V.vmax/Math.max(.3,V.t0)*HOUR_REAL;v.spd=v.spd<vt?Math.min(vt,v.spd+acc*dt):Math.max(vt,v.spd-acc*1.5*dt);
    const closeEnd=atEnd&&d<3;
    if(!this.boatStep(v,V,dt,v.h,closeEnd)){ // la proue touche la terre : si c'est le bout de la route, on s'y échoue ; sinon on vire sur place (le cap tourne déjà), puis un nouveau chemin s'il le faut
      if(closeEnd){v.state='idle';v.bpath=null;if(v.landAim)v.h=Math.atan2(v.landAim[1]-v.y,v.landAim[0]-v.x);return;}
      v.stuckT=(v.stuckT||0)+dt*HOUR_REAL;if(v.stuckT>6){v.stuckT=0;this.boatMove(v,v.goal[0],v.goal[1]);}}},
  // marche arrière, lentement, jusqu'à être dégagée de la rive (au plus quelques secondes de combat) ; on ne recule jamais sur la terre
  boatBack(v,V,dt){v.backT=(v.backT||0)+dt*HOUR_REAL;const sp=V.vmax*.35;const nx=v.x-Math.cos(v.h)*sp*dt,ny=v.y-Math.sin(v.h)*sp*dt;v.spd=0;
    if(this.isWaterAt(nx,ny)&&this.isWaterAt(nx-Math.cos(v.h)*.9,ny-Math.sin(v.h)*.9)){v.x=nx;v.y=ny;}else v.backT=99;
    if(this.boatClear(v,V,1.3)||v.backT>14){v.backing=false;}},
  boatRemain(v){const P=v.bpath;if(!P)return 0;let s=0,cx=v.x,cy=v.y;for(let n=v.bi||1;n<P.length;n++){s+=d2(cx,cy,P[n][0],P[n][1]);cx=P[n][0];cy=P[n][1];}return s;},

  // ---------- la rampe, le débarquement, le chargement ----------
  // abaisser ou relever la rampe (à l'arrêt seulement)
  boatRamp(v,down){if(v.hp<=0)return {ok:false,why:['barge détruite']};if(down&&(v.spd||0)>.5)return {ok:false,why:['elle n’est pas arrêtée']};v.rampTo=down?1:0;return {ok:true,text:down?`${v.name} : la rampe s’abaisse`:`${v.name} : la rampe se relève`};},
  // le point devant la proue où l'on débarque (sur la terre)
  boatBow(v,V,k=1){return [v.x+Math.cos(v.h)*(V.long/2+k),v.y+Math.sin(v.h)*(V.long/2+k)];},
  // débarquer : tous les passagers (ou seulement ceux d'un rôle) sortent par l'avant, la rampe baissée, et courent vers l'intérieur ; le pilote reste ; un véhicule à bord descend
  boatUnload(v,who='passagers'){const V=VEHDEF[v.k];if(!V||V.nav!=='eau')return {ok:false,why:['pas une barge']};if((v.ramp||0)<.9)return {ok:false,why:['la rampe n’est pas baissée']};
    const out=[];v.crew=(v.crew||[]).filter(u=>u.hp>0);const dir=[Math.cos(v.h),Math.sin(v.h)],perp=[-dir[1],dir[0]];let n=0;
    for(const u of [...v.crew]){if(who==='passagers'&&u.vrole!=='passager')continue;
      // sur deux ou trois files, par rangs, du plus près au plus loin
      const row=Math.floor(n/3),col=(n%3)-1;n++;const bx=v.x+dir[0]*(V.long/2+1.0+row*.5)+perp[0]*col*.55,by=v.y+dir[1]*(V.long/2+1.0+row*.5)+perp[1]*col*.55;
      const [x,y]=this.nearestLand(bx,by,3);v.crew.splice(v.crew.indexOf(u),1);Object.assign(u,{x,y,inVeh:null,vrole:null,task:null,path:null,goal:null,fx:dir[0],fy:dir[1]});this.s.units.push(u);this.uIndex.set(u.id,u);out.push(u);
      // ils courent : trois cases plus loin, droit devant (hors de la rampe, sous le feu)
      const [rx,ry]=this.nearestLand(x+dir[0]*(3+row*.5),y+dir[1]*(3+row*.5),4);u.task={kind:'move',tx:rx,ty:ry};}
    let veh=null;if(v.cargoVeh!=null){const c=this.s.vehicles.find(o=>o.id===v.cargoVeh);if(c&&c.hp>0){const [x,y]=this.nearestLand(...this.boatBow(v,V,1.6),4);c.x=x;c.y=y;c.h=v.h;c.aboard=null;c.onDeck=false;c.spd=0;c.state='idle';v.cargoVeh=null;veh=c;}}
    if(!out.length&&!veh)return {ok:false,why:['personne à débarquer']};
    return {ok:true,text:`${out.length} débarquent${veh?` avec ${veh.name}`:''}`,out,veh};},
  // la case marchable la plus proche (le débarquement ne tombe pas à l'eau)
  nearestLand(x,y,r=3){const N=this.N;let best=[x,y],bd=1e9;for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const i=Math.floor(x)+di,j=Math.floor(y)+dj;if(i<1||j<1||i>=N-1||j>=N-1)continue;const k=j*N+i;
      if(!TERRAIN[this.G.terrain[k]]?.walk||this.occ[k]>=0||this.wall[k])continue;const d=Math.hypot(i+.5-x,j+.5-y);if(d<bd){bd=d;best=[i+.5,j+.5];}}
    return best;},
  // un véhicule monte à bord (il doit être tout près, la barge échouée ou à quai, la rampe baissée) : un seul, il suit la barge
  boatEmbark(v,c){const V=VEHDEF[v.k],CV=VEHDEF[c.k];if(!V||V.nav!=='eau'||!CV||CV.nav==='eau')return {ok:false,why:['impossible']};if(v.cargoVeh!=null)return {ok:false,why:['un véhicule est déjà à bord']};
    if((v.ramp||0)<.9)return {ok:false,why:['la rampe n’est pas baissée']};if(d2(c.x,c.y,v.x,v.y)>V.long/2+CV.long/2+2.5)return {ok:false,why:['le véhicule est trop loin de la rampe']};if(CV.long>V.long*.85||CV.large>V.large*.9)return {ok:false,why:['trop grand pour la barge']};
    c.aboard=v.id;v.cargoVeh=c.id;c.path=null;c.itin=null;c.state='idle';return {ok:true,text:`${c.name} monte à bord de ${v.name}`};},
  // l'ordre d'un véhicule d'aller se charger sur une barge : il roule jusqu'à elle (la plage la plus proche), puis monte quand la rampe est baissée
  vehEmbarkOrder(c,b){const V=VEHDEF[b.k];if(!V||V.nav!=='eau'||b.hp<=0)return {ok:false,why:['pas une barge']};if(b.cargoVeh!=null&&b.cargoVeh!==c.id)return {ok:false,why:['un véhicule est déjà à bord']};
    c.embarkTo=b.id;b.rampTo=1;const [x,y]=this.nearestLand(...this.boatBow(b,V,.2),6);const ok=this.vehMove(c,x,y);return ok?{ok:true,text:`${c.name} va se charger sur ${b.name} (rampe baissée)`}:{ok:false,why:[c.why||'pas de chemin jusqu’à la barge']};},
  // une barge coulée ou détruite : à l'eau, tout le monde se noie, sauf près de la terre (à deux cases d'une case marchable) où l'on gagne la rive
  boatSunk(v,cause){const V=VEHDEF[v.k];const near=this.nearestLand(v.x,v.y,2);const ashore=d2(near[0],near[1],v.x,v.y)<2.2&&TERRAIN[this.G.terrain[Math.floor(near[1])*this.N+Math.floor(near[0])]]?.walk;let lost=0,saved=0;
    for(const u of [...(v.crew||[])]){if(ashore){const [x,y]=this.nearestLand(v.x+(this.rand()-.5)*2,v.y+(this.rand()-.5)*2,3);v.crew.splice(v.crew.indexOf(u),1);Object.assign(u,{x,y,inVeh:null,vrole:null,task:null,path:null,goal:null});this.s.units.push(u);this.uIndex.set(u.id,u);saved++;}
      else{u.hp=0;u.h&&(u.h.state='mort');lost++;}}
    v.crew=ashore?[]:[];if(v.cargoVeh!=null){const c=this.s.vehicles.find(o=>o.id===v.cargoVeh);if(c){c.aboard=null;c.onDeck=false;if(!ashore){c.hp=0;c.dead=true;}else{const [x,y]=this.nearestLand(v.x,v.y,3);c.x=x;c.y=y;}}v.cargoVeh=null;}
    v.drowned=lost;v.sunk=true;if(lost||saved)this.log('Front',`${v.name} est ${cause?'détruite ('+cause+')':'perdue'} : ${lost} noyé${lost>1?'s':''}${saved?`, ${saved} regagnent la rive`:''}.`,v.f==='meumeu'?'bad':'good');},
  // le chantier de plage fini : le bâtiment disparaît, le bateau est à l'eau devant lui, la proue vers le large
  launchBoat(b){const k=BUILDINGS[b.k].launch;const v=this.vehLaunch(b,k);this.remove(b);if(v){v.name=v.name||VEHDEF[k].name;this.log(this.nearCity?.(v)||'Front',`${VEHDEF[k].name} « ${v.name} » à l’eau.`,b.f==='meumeu'?'good':'info');this.emit({type:'trained',x:v.x,y:v.y,k,f:b.f});}return v;},
  vehLaunch(b,k){const V=VEHDEF[k],N=this.N,ter=this.G.terrain,[w,h]=this.sizeOf(b);const cx=b.i+w/2,cy=b.j+h/2;
    // la case d'eau la plus proche du chantier, voisine d'une terre marchable (on y monte à pied)
    let best=null,bd=1e9;for(let dj=-14;dj<=14;dj++)for(let di=-14;di<=14;di++){const i=Math.floor(cx)+di,j=Math.floor(cy)+dj;if(i<2||j<2||i>=N-2||j>=N-2||!isWater(ter[j*N+i]))continue;
      let land=false;for(const [a,c] of [[1,0],[-1,0],[0,1],[0,-1]])if(TERRAIN[ter[(j+c)*N+i+a]]?.walk){land=true;break;}if(!land)continue;
      // pas d'autre engin sur cette case
      if(this.s.vehicles.some(o=>o!==b&&VEHDEF[o.k]?.nav==='eau'&&o.hp>0&&d2(o.x,o.y,i+.5,j+.5)<V.long*.8))continue;
      const d=Math.hypot(i+.5-cx,j+.5-cy);if(d<bd){bd=d;best=[i+.5,j+.5];}}
    if(!best)return null;
    // le cap : vers le large (la case d'eau profonde la plus proche dans un rayon de 20)
    let dp=null,dd=1e9;for(let dj=-20;dj<=20;dj++)for(let di=-20;di<=20;di++){const i=Math.floor(best[0])+di,j=Math.floor(best[1])+dj;if(i<1||j<1||i>=N-1||j>=N-1||ter[j*N+i]!==T.deep)continue;const d=Math.hypot(di,dj);if(d<dd){dd=d;dp=[i+.5,j+.5];}}
    const h0=dp?Math.atan2(dp[1]-best[1],dp[0]-best[0]):0;const v=this.addCombatVehicle(b.f,k,best[0],best[1],h0);v.home=b.id;v.ramp=0;v.rampTo=0;v.beached=true;return v;},
};
