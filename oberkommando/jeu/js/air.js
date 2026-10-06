// Oberkommando der Meumeu — le ciel : un avion de transport, des planeurs, une piste, un hangar (réservés aux Meumeu : le joueur les commande).
// Un aéronef est un ENGIN (VEHDEF, `air:{…}`) : pilote et passagers (v.crew), soute (v.cargo), points de vie, et une conduite à lui, ici.
// Unités : positions en cases (4 m), altitude en mètres, vitesses en m/s — qui valent aussi des « cases/h » (une heure de jeu dure HOUR_REAL = 4 s de combat) —, durées en
// secondes de combat (this.dts). Un virage se fait à l'inclinaison permise : ω = g·tan(inclinaison) / vitesse. Un planeur ne sait que planer (finesse : mètres parcourus par mètre perdu).
//  · l'avion : au sol (parked) → roule (roll) → monte (climb) → croisière (cruise) → approche (approach) → arrondi et toucher → roulage (rollout) → au sol ;
//  · le planeur : au sol → remorqué (towed : attaché derrière l'avion par un câble) → largué : plane (glide), gère son énergie (il tourne en spirale s'il est trop haut au-dessus de sa
//    cible, se pose au plus près sinon), s'arrondit, touche, roule ; un arbre ou un mur à hauteur, une eau, un choc trop dur : accident (airCrash : blessés, parfois le pilote tué).
//  · la piste : des cases « piste » posées par les villageois ; l'ensemble connexe d'au moins 44 cases de long et 3 de large est une piste (axe principal) ;
//  · le hangar : bâtiment qui construit les aéronefs et les met sur la piste voisine ; c'est aussi un dépôt (le pont aérien : on charge et on décharge à côté).
import {TERRAIN,T,HOUR_REAL,BUILDINGS,LINES} from './data.js';
import {VEHDEF} from './vehicules.js';
import {fragDesign} from './designs.js';

const G=9.81,D2R=Math.PI/180,RW_MIN=44,RW_W=3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const TREE_H=8,BUILD_H=7,WALL_H=3;   // hauteurs d'obstacles (m)

export const AIR={
  // l'aire d'un aéronef (A = VEHDEF[k].air) : voir les entrées dans vehicules.js
  runwayMin:RW_MIN,
};

export const AIRCRAFT={
  // ---------- les pistes ----------
  // les cases de piste posées et reliées forment des pistes (axe principal par analyse en composantes principales)
  airRunways(){if(this._rw&&this._rwV===(this.pisteV|0))return this._rw;const N=this.N,P=this.s.pistes||{},cells=Object.keys(P).filter(k=>P[k].b).map(Number),set=new Set(cells),seen=new Set(),out=[];
    for(const k0 of cells){if(seen.has(k0))continue;const comp=[],q=[k0];seen.add(k0);while(q.length){const k=q.pop();comp.push(k);const i=k%N,j=(k/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const kk=(j+dj)*N+i+di;if(set.has(kk)&&!seen.has(kk)){seen.add(kk);q.push(kk);}}}
      if(comp.length<RW_MIN*RW_W*.6)continue;let mx=0,my=0;for(const k of comp){mx+=k%N+.5;my+=((k/N)|0)+.5;}mx/=comp.length;my/=comp.length;let xx=0,xy=0,yy=0;for(const k of comp){const x=k%N+.5-mx,y=((k/N)|0)+.5-my;xx+=x*x;xy+=x*y;yy+=y*y;}
      const a=.5*Math.atan2(2*xy,xx-yy),dx=Math.cos(a),dy=Math.sin(a);let tmin=1e9,tmax=-1e9,pmin=1e9,pmax=-1e9;for(const k of comp){const x=k%N+.5-mx,y=((k/N)|0)+.5-my,t=x*dx+y*dy,p=-x*dy+y*dx;tmin=Math.min(tmin,t);tmax=Math.max(tmax,t);pmin=Math.min(pmin,p);pmax=Math.max(pmax,p);}
      const len=tmax-tmin+1,wid=pmax-pmin+1;if(len<RW_MIN||wid<RW_W)continue;
      const R0={id:out.length,cx:mx,cy:my,dx,dy,tmin,tmax,len,wid,A:[mx+dx*tmin,my+dy*tmin],B:[mx+dx*tmax,my+dy*tmax]};out.push(R0);this.airClearApproach(R0);}
    this._rw=out;this._rwV=this.pisteV|0;return out;},
  // les trouées d'approche : à chaque bout, 60 cases dans l'axe et 8 de chaque côté, plus les abords de la piste (6 cases) — une seule fois par piste
  airClearApproach(r){const key=Math.round(r.cx)+','+Math.round(r.cy)+','+Math.round(r.len);const done=this.s.rwCleared??={};if(done[key])return;done[key]=1;const N=this.N;let n=0;
    const inZone=(x,y)=>{const t=(x-r.cx)*r.dx+(y-r.cy)*r.dy,p=-(x-r.cx)*r.dy+(y-r.cy)*r.dx;return (t>=r.tmin-62&&t<=r.tmax+62&&Math.abs(p)<=(t<r.tmin||t>r.tmax?9:r.wid/2+6));};
    const rad=Math.max(r.len,40)/2+70;for(const nd of this.s.nodes){if(nd.type!=='tree'||!(nd.left>0))continue;if(Math.abs(nd.i-r.cx)>rad||Math.abs(nd.j-r.cy)>rad)continue;if(inZone(nd.i+.5,nd.j+.5)){nd.left=0;this.nodeAt[nd.j*N+nd.i]=-1;n++;}}
    if(n)this.log('Front',`Les abords de la piste sont dégagés (${n} arbres abattus aux deux bouts).`,'info');},
  // la piste sous (x, y) (à une marge près), avec l'abscisse t le long de l'axe et le décalage latéral p
  airRunwayAt(x,y,m=2){for(const r of this.airRunways()){const t=(x-r.cx)*r.dx+(y-r.cy)*r.dy,p=-(x-r.cx)*r.dy+(y-r.cy)*r.dx;if(t>=r.tmin-1&&t<=r.tmax+1&&Math.abs(p)<=r.wid/2+m)return {rw:r,t,p};}return null;},
  // la piste la plus proche (par son centre)
  airRunwayNear(x,y){let best=null,bd=1e9;for(const r of this.airRunways()){const d=d2(x,y,r.cx,r.cy);if(d<bd){bd=d;best=r;}}return best;},

  // ---------- la création ----------
  addAircraft(f,k,x,y,h){const v=this.addCombatVehicle(f,k,x,y,h);v.air=true;v.alt=0;v.vz=0;v.bank=0;v.state='parked';v.spd=0;v.cmd=null;v.goal=null;v.rampTo=undefined;v.stealth=!!VEHDEF[k].air.silent;return v;},
  // la sortie du hangar : sur la piste voisine, du côté du hangar, le nez le long de la piste (du côté long)
  vehFromHangar(b,k){const V=VEHDEF[k];const cx=b.i+(this.sizeOf(b)[0])/2,cy=b.j+(this.sizeOf(b)[1])/2;const rw=this.airRunwayNear(cx,cy);if(!rw||d2(cx,cy,rw.cx,rw.cy)>rw.len/2+16)return null;
    const t0=((cx-rw.cx)*rw.dx+(cy-rw.cy)*rw.dy);const fromA=t0<0;const dir=fromA?1:-1;const h=Math.atan2(rw.dy*dir,rw.dx*dir);
    // la place libre sur l'axe de la piste la plus proche du hangar, puis de proche en proche le long de la piste (les aéronefs déjà posés)
    const t1=clamp(t0,rw.tmin+V.long/2+2,rw.tmax-V.long/2-2);const others=this.s.vehicles.filter(o=>o.air&&o.hp>0&&o.alt<1);
    for(let n=0;n<10;n++){const off=((n%2?1:-1)*Math.ceil(n/2))*(V.long+3);const tt=clamp(t1+off,rw.tmin+V.long/2+1,rw.tmax-V.long/2-1);const x=rw.cx+rw.dx*tt,y=rw.cy+rw.dy*tt;
      if(others.some(o=>d2(o.x,o.y,x,y)<(V.long+VEHDEF[o.k].long)/2+1.5))continue;const v=this.addAircraft(b.f,k,x,y,h);v.home=b.id;return v;}
    return null;},

  // ---------- les ordres ----------
  airPilot(v){return this.vehDriver(v);},
  airCanFly(v){return v.hp>0&&!v.dead&&this.airPilot(v);},
  // décoller : l'aéronef roule jusqu'au bon bout de la piste (taxi), puis s'élance
  airTakeoff(v){const V=VEHDEF[v.k],A=V.air;if(!A?.power)return {ok:false,why:['un planeur est remorqué : attachez-le à un avion']};if(v.hp<=0)return {ok:false,why:['détruit']};if(!this.airPilot(v))return {ok:false,why:['pas de pilote à bord']};
    if(v.state!=='parked')return {ok:false,why:['il n’est pas au sol']};const on=this.airRunwayAt(v.x,v.y,3);if(!on)return {ok:false,why:['il faut être sur une piste']};
    const roll=A.vr*A.vr/(2*A.accel)/4*(v.tows!=null?1.35:1)+6;const r=on.rw;
    if(r.len<roll+V.long+2)return {ok:false,why:[`piste trop courte : il faut ${Math.ceil(roll+V.long+2)} cases, elle en fait ${Math.floor(r.len)}`]};
    // le sens : celui du nez s'il y a la place devant, sinon l'autre ; sinon on roule d'abord jusqu'au seuil du bon bout
    const ahead=s=>s>0?r.tmax-on.t:on.t-r.tmin;let s=Math.cos(v.h)*r.dx+Math.sin(v.h)*r.dy>=0?1:-1;
    v.cmd='takeoff';v.rwId=r.id;
    if(ahead(s)>=roll+4){v.rwDir=s;v.taxi={x:v.x,y:v.y,h:Math.atan2(r.dy*s,r.dx*s)};v.state='taxi';}
    else if(ahead(-s)>=roll+4){s=-s;v.rwDir=s;v.taxi={x:v.x,y:v.y,h:Math.atan2(r.dy*s,r.dx*s)};v.state='taxi';}
    else{ // pas assez de piste devant, ni derrière : on rejoint le seuil du bout le plus proche, et l'on part de là vers l'autre bout
      const toA=on.t-r.tmin,toB=r.tmax-on.t;s=toA<=toB?1:-1;v.rwDir=s;const T0=s>0?r.tmin+V.long/2+1:r.tmax-V.long/2-1;v.taxi={x:r.cx+r.dx*T0,y:r.cy+r.dy*T0,h:Math.atan2(r.dy*s,r.dx*s)};v.state='taxi';}
    return {ok:true,text:`${v.name} roule vers le seuil de la piste`};},
  // rouler (au sol, sur la piste) jusqu'à un point de la piste : l'aire du hangar, par exemple ; le cap final est celui de la piste
  airTaxiTo(v,x,y){if(v.state!=='parked')return {ok:false,why:['il n’est pas à l’arrêt au sol']};if(!this.airPilot(v))return {ok:false,why:['pas de pilote à bord']};const on=this.airRunwayAt(x,y,4)||this.airRunwayAt(v.x,v.y,4);if(!on)return {ok:false,why:['il faut rester sur la piste']};
    const r=on.rw,t=clamp((x-r.cx)*r.dx+(y-r.cy)*r.dy,r.tmin+2,r.tmax-2),s=Math.cos(v.h)*r.dx+Math.sin(v.h)*r.dy>=0?1:-1;v.taxi={x:r.cx+r.dx*t,y:r.cy+r.dy*t,h:Math.atan2(r.dy*s,r.dx*s)};v.state='taxi';v.cmd=null;return {ok:true,text:`${v.name} roule jusqu’à l’aire du hangar`};},
  // aller en (x, y) : un avion décolle d'abord s'il est au sol ; un planeur remorqué garde ce point pour son atterrissage ; un planeur qui plane y met le cap
  airGoto(v,x,y){const V=VEHDEF[v.k],A=V.air;if(v.hp<=0)return false;v.goal=[x,y];v.landing=false;
    if(!A.power){v.target=[x,y];v.why=null;return true;}
    if(v.state==='parked'){const r=this.airTakeoff(v);if(!r.ok){v.why=r.why[0];v.goal=null;return false;}}
    v.why=null;return true;},
  // atterrir sur la piste la plus proche (ou celle de (x, y)) : l'avion rejoint l'axe de la piste et se pose ; un planeur vise le point
  airLand(v,x=null,y=null){const V=VEHDEF[v.k],A=V.air;if(v.hp<=0)return {ok:false,why:['détruit']};if(!A.power){if(x!=null){v.goal=[x,y];v.target=[x,y];}return {ok:true,text:`${v.name} cherche un champ`};}
    const r=x!=null?(this.airRunwayAt(x,y,4)?.rw||this.airRunwayNear(x,y)):this.airRunwayNear(v.x,v.y);if(!r)return {ok:false,why:['aucune piste']};
    if(v.state==='parked'||v.state==='taxi'||v.state==='roll'||v.state==='rollout')return {ok:false,why:['il est déjà au sol']};
    v.landing={rw:r.id};v.goal=null;v.state=v.state==='climb'?'climb':'cruise';return {ok:true,text:`${v.name} se présente pour atterrir`};},
  // attacher un planeur à un avion (à l'arrêt, tout près, derrière lui ou presque, sur la même piste)
  airTow(p,g){const VP=VEHDEF[p.k],VG=VEHDEF[g.k];if(!VP?.air?.power||VG?.air?.power!==false)return {ok:false,why:['impossible']};if(p.tows!=null)return {ok:false,why:['il remorque déjà un planeur']};
    if(p.state!=='parked'||g.state!=='parked')return {ok:false,why:['les deux doivent être au sol']};if(d2(p.x,p.y,g.x,g.y)>14)return {ok:false,why:['le planeur est trop loin']};
    p.tows=g.id;g.towedBy=p.id;g.state='towed';g.spd=0;g.alt=0;return {ok:true,text:`${g.name} est attaché derrière ${p.name}`};},
  // larguer le câble : le planeur plane (tout de suite)
  airRelease(g){if(g.towedBy==null)return {ok:false,why:['il n’est pas remorqué']};const p=this.s.vehicles.find(o=>o.id===g.towedBy);if(p)p.tows=null;g.towedBy=null;
    if(g.alt<3){g.state='parked';return {ok:true,text:`${g.name} est décroché au sol`};}g.state='glide';g.releaseT=this.s.t;g.why=null;return {ok:true,text:`${g.name} largue le câble à ${Math.round(g.alt)} m : il plane`};},

  // ---------- le pas de simulation ----------
  airTick(v,V,dt){const A=V.air;if(v.dead){v.spd=0;return;}if(v.hp<=0){this.airCrash(v,'détruit');return;}const dts=this.dts;
    if(v.fire>0){v.fire-=dt;v.hp-=dt*30;if(v.hp<=0){this.airCrash(v,'brûlé');return;}}
    this.vehSouteSupply(v);
    if(A.power)this.airPlane(v,V,A,dts);else this.airGlider(v,V,A,dts);
    // la hauteur d'affichage (cases) : compressée (une orthographique ne montre que le décalage)
    v.valt=v.alt>0?1+Math.min(v.alt,400)*.03:0;},
  // ----- l'avion
  airPlane(v,V,A,dts){const fly=this.airPilot(v);
    switch(v.state){
      case 'parked':v.spd=0;v.alt=0;v.vz=0;v.bank=0;break;
      case 'taxi':{const T0=v.taxi;if(!T0){v.state='parked';break;}const dx=T0.x-v.x,dy=T0.y-v.y,d=Math.hypot(dx,dy);const sp=10*dts/4;
        if(d<sp+.05){v.x=T0.x;v.y=T0.y;v.h=T0.h;v.spd=0;v.taxi=null;v.state=v.cmd==='takeoff'?'roll':'parked';v.cmd=null;}
        else{const ah=Math.atan2(dy,dx);v.h=wrap(v.h+clamp(wrap(ah-v.h),-1.2*dts,1.2*dts));v.x+=Math.cos(v.h)*sp;v.y+=Math.sin(v.h)*sp;v.spd=10;}break;}
      case 'roll':{const r=this.airRunways().find(q=>q.id===v.rwId);if(!fly||!r){v.state='parked';v.spd=0;break;}
        // plein gaz sur l'axe ; le planeur remorqué alourdit
        v.spd+=A.accel*(v.tows!=null?.75:1)*dts;const step=v.spd*dts/4;v.x+=Math.cos(v.h)*step;v.y+=Math.sin(v.h)*step;
        const on=this.airRunwayAt(v.x,v.y,1.5);if(!on||(v.rwDir>0?on.t>r.tmax+.5:on.t<r.tmin-.5)){this.airCrash(v,'sortie de piste au décollage');break;}
        if(v.spd>=A.vr){v.state='climb';v.vz=0;}break;}
      case 'climb':case 'cruise':{if(!fly){v.state='uncontrolled';break;}
        if(v.landing){this.airApproachSteer(v,V,A,dts);break;}
        const tow=v.tows!=null?this.s.vehicles.find(o=>o.id===v.tows):null,heavy=tow&&VEHDEF[tow.k].air.heavy?.7:tow?.9:1;
        // vitesse : celle de montée, puis la croisière ; le planeur remorqué ralentit tout
        const vTarget=(v.state==='climb'?A.vr+10:A.cruise)*(tow?.88:1);v.spd+=clamp(vTarget-v.spd,-2.5*dts,1.5*dts);
        if(v.state==='climb'){v.vz=A.climb*(tow?.72*heavy:1);v.alt+=v.vz*dts;if(v.alt>=A.cruiseAlt-2){v.alt=Math.min(v.alt,A.cruiseAlt);v.state='cruise';v.vz=0;}}
        else{const e=A.cruiseAlt-v.alt;v.vz=clamp(e*.25,-A.descend,A.climb);v.alt+=v.vz*dts;}
        // le cap : vers le but ; arrivé, on tourne en rond au-dessus
        if(v.goal&&v.alt>25){const dd=d2(v.x,v.y,v.goal[0],v.goal[1]);if(dd>5)this.airSteer(v,A,v.goal[0],v.goal[1],A.bank);else{v.h=wrap(v.h+A.loiter*dts);v.arrived=true;}}else v.bank=0;
        // le largage prévu : quand on est à portée du point choisi
        if(tow&&v.releaseAt&&d2(v.x,v.y,v.releaseAt.x,v.releaseAt.y)<=v.releaseAt.r){const r2=this.airRelease(tow);v.releaseAt=null;if(r2.ok&&v.f==='meumeu')this.log('Front',r2.text,'info');}
        const step=v.spd*dts/4;v.x+=Math.cos(v.h)*step;v.y+=Math.sin(v.h)*step;
        this.airObstacleCheck(v,A);break;}
      case 'rollout':{v.spd=Math.max(0,v.spd-A.brake*dts);const step=v.spd*dts/4;const nx=v.x+Math.cos(v.h)*step,ny=v.y+Math.sin(v.h)*step;
        if(!this.airGroundOk(nx,ny)){this.airCrash(v,'roulage dans un obstacle');break;}v.x=nx;v.y=ny;v.alt=0;v.vz=0;if(v.spd<=.6){v.spd=0;v.state='parked';v.landing=false;v.goal=null;}break;}
      case 'uncontrolled':{v.vz=-A.descend;v.alt+=v.vz*dts;v.spd=Math.max(A.stall,v.spd-1*dts);const step=v.spd*dts/4;v.x+=Math.cos(v.h)*step;v.y+=Math.sin(v.h)*step;if(v.alt<=0){v.alt=0;this.airCrash(v,'sans pilote');}else this.airObstacleCheck(v,A);break;}
    }},
  // tourner vers un point à l'inclinaison permise
  airSteer(v,A,tx,ty,bankMax){const err=wrap(Math.atan2(ty-v.y,tx-v.x)-v.h),wmax=G*Math.tan(bankMax*D2R)/Math.max(v.spd,A.stall);const dh=clamp(err,-wmax*this.dts,wmax*this.dts);v.h=wrap(v.h+dh);v.bank+=((Math.abs(err)>.02?Math.sign(err)*bankMax*Math.min(1,Math.abs(err)/.35):0)-v.bank)*Math.min(1,this.dts*2);return err;},
  // l'approche d'une piste : rejoindre un point d'entrée dans l'axe (à 60 cases du seuil), puis descendre sur la pente, arrondir, toucher
  airApproachSteer(v,V,A,dts){const L=v.landing;let r=L.rw!=null?this.airRunways().find(q=>q.id===L.rw):null;if(!r)r=this.airRunwayNear(v.x,v.y);if(!r){v.landing=false;return;}L.rw=r.id;
    // le bout d'entrée : celui d'où l'on arrive (le plus loin devant le nez, par rapport à la position)
    if(L.dir==null){const ta=(v.x-r.cx)*r.dx+(v.y-r.cy)*r.dy;const fromA=ta<0;L.dir=fromA?1:-1;}
    const dir=L.dir,thr=dir>0?r.A:r.B,hx=r.dx*dir,hy=r.dy*dir;const toThr=d2(v.x,v.y,thr[0],thr[1]);
    // distance le long de l'axe (positive : on est avant le seuil), écart latéral
    const rx=v.x-thr[0],ry=v.y-thr[1],along=-(rx*hx+ry*hy),lat=-rx*hy+ry*hx;
    const stage=L.stage||'join';
    if(stage==='join'){const fix=[thr[0]-hx*72,thr[1]-hy*72];const dF=d2(v.x,v.y,fix[0],fix[1]);this.airSteer(v,A,fix[0],fix[1],A.bank);const e=A.cruiseAlt;v.vz=clamp((30-v.alt)*.12,-A.descend,A.climb);v.alt+=v.vz*dts;v.spd+=clamp(A.cruise*.8-v.spd,-2*dts,2*dts);
      if(dF<8||(along<76&&Math.abs(lat)<14&&Math.abs(wrap(Math.atan2(hy,hx)-v.h))<.5)){L.stage='final';}}
    else{ // l'axe : le cap de la piste, corrigé par l'écart latéral (borné) ; la pente descend jusqu'au toucher à 8 cases après le seuil
      const aim=[thr[0]+hx*20-hy*0,thr[1]+hy*20+0];const corr=clamp(lat*.04,-.35,.35);const want=Math.atan2(hy,hx)-corr;const err=wrap(want-v.h),wmax=G*Math.tan(A.bank*D2R)/Math.max(v.spd,A.stall);v.h=wrap(v.h+clamp(err,-wmax*dts,wmax*dts));
      const dmeter=Math.max(0,along+2)*4,slope=Math.tan(3.4*D2R),want_alt=dmeter*slope;v.spd+=clamp(A.stall*1.28-v.spd,-2.5*dts,1*dts);
      // la pente (anticipation : on descend déjà de V·tan(pente)) corrigée de l'écart ; l'arrondi : sous 2,5 m on garde un taux de chute doux jusqu'au toucher
      let vz=-v.spd*slope+clamp((want_alt-v.alt)*.35,-2,2);vz=clamp(vz,-A.descend,1.2);if(v.alt<2.5)vz=Math.max(vz,-.62);v.vz=vz;v.alt+=v.vz*dts;}
    const step=v.spd*dts/4;v.x+=Math.cos(v.h)*step;v.y+=Math.sin(v.h)*step;
    if(v.alt<=0){v.alt=0;const touch=this.airTouch(v,A);if(touch.ok){v.state='rollout';v.landing=false;v.vz=0;}else this.airCrash(v,touch.why);}
    else this.airObstacleCheck(v,A);},
  // ----- le planeur
  airGlider(v,V,A,dts){const fly=this.airPilot(v);
    switch(v.state){
      case 'parked':v.spd=0;v.alt=0;v.vz=0;break;
      case 'towed':{const p=this.s.vehicles.find(o=>o.id===v.towedBy);if(!p||p.hp<=0){v.state=v.alt>3?'glide':'parked';v.towedBy=null;break;}
        // derrière l'avion, au bout d'un câble de 5 cases ; décolle un peu avant lui (il est léger), reste 2 m sous lui
        const rope=5;v.x=p.x-Math.cos(p.h)*rope;v.y=p.y-Math.sin(p.h)*rope;v.h=p.h;v.spd=p.spd;v.alt=p.alt>1?Math.max(0,p.alt-1.5):0;v.bank=p.bank;
        // si le câble casse (l'avion détruit ou sans pilote), il est largué
        break;}
      case 'glide':case 'uncontrolled':{if(!fly&&v.state==='glide')v.state='uncontrolled';
        v.spd+=clamp(A.glide-v.spd,-7*dts,2.5*dts);
        const tgt=v.state==='glide'?(v.goal||v.target):null;let bankNow=0;
        if(tgt){this.airGlideGuide(v,A,tgt,dts);}
        else if(v.state==='glide'){/* tout droit, jusqu'à la hauteur où l'on cherche un champ */ if(v.alt<60)this.airGlideField(v,A,dts);}
        // la descente : vitesse / finesse, plus quand on tourne ; l'arrondi : quasi horizontal près du sol
        const turning=Math.abs(v.bank||0)>8*D2R||v.orbit;let sink=v.spd/A.ld*(turning?1.35:1);if(v.alt<3.5)sink=Math.min(sink,.7);v.vz=-sink;v.alt+=v.vz*dts;
        const step=v.spd*dts/4;v.x+=Math.cos(v.h)*step;v.y+=Math.sin(v.h)*step;
        if(v.alt<=0){v.alt=0;const t=this.airTouch(v,A);if(t.ok){v.state='rollout';v.vz=0;}else this.airCrash(v,t.why);}else this.airObstacleCheck(v,A);break;}
      case 'rollout':{v.spd=Math.max(0,v.spd-A.brake*dts);const step=v.spd*dts/4;const nx=v.x+Math.cos(v.h)*step,ny=v.y+Math.sin(v.h)*step;
        if(!this.airGroundOk(nx,ny)){this.airCrash(v,'roulage dans un obstacle');break;}v.x=nx;v.y=ny;v.alt=0;v.vz=0;if(v.spd<=.6){v.spd=0;v.state='parked';v.goal=null;v.target=null;v.orbit=false;this.log('Front',`${v.name} s’est posé : ${v.crew.length} à bord.`,'info');}break;}
    }},
  // le guidage de plané vers un point : tout droit si on y arrive, spirale pour perdre de la hauteur si on est trop haut, sinon vers un champ à portée
  airGlideGuide(v,A,tgt,dts){const dM=d2(v.x,v.y,tgt[0],tgt[1])*4,R=Math.max(0,v.alt)*A.ld*.9;const wmax=G*Math.tan(A.bank*D2R)/Math.max(v.spd,A.stall);
    if(!v.orbit&&dM<260&&R>dM*1.7+80)v.orbit=true;if(v.orbit&&(R<=dM*1.3+50||dM>320))v.orbit=false;
    if(v.orbit){ // on tourne autour du but, à moins de 10 cases : la spirale
      const dc=dM/4;if(dc>11)this.airSteer(v,A,tgt[0],tgt[1],A.bank);else{v.h=wrap(v.h+wmax*dts);v.bank=A.bank*D2R*0+A.bank;}}
    else{
      if(R<dM*.85&&v.alt<90){this.airGlideField(v,A,dts);return;}   // il n'y arrivera pas : un champ à portée
      this.airSteer(v,A,tgt[0],tgt[1],A.bank);}
    if(v.alt<4&&!v.orbit){/* finale : on garde le cap */}},
  // un champ d'atterrissage à portée, devant : un éventail de caps, une bande libre de 14 cases
  airGlideField(v,A,dts){if(v.fieldT!=null&&this.s.t-v.fieldT<.05&&v.field){this.airSteer(v,A,v.field[0],v.field[1],A.bank);return;}
    const reach=Math.max(8,v.alt*A.ld*.7/4);let best=null,bs=-1e9;
    for(let da=-1.2;da<=1.2;da+=.2)for(const f of [.35,.6,.9]){const d=reach*f,ang=v.h+da,x=v.x+Math.cos(ang)*d,y=v.y+Math.sin(ang)*d;const q=this.airStripScore(x,y,ang,14);const sc=q-Math.abs(da)*3-f*2;if(sc>bs){bs=sc;best=[x,y];}}
    v.field=best;v.fieldT=this.s.t;if(best)this.airSteer(v,A,best[0],best[1],A.bank);},
  // la qualité d'une bande d'atterrissage de la longueur donnée (cases) : dégagée (arbres, bâtiments, eau, rochers) ; plus c'est haut, mieux c'est
  airStripScore(x,y,ang,len){let sc=0;const N=this.N;for(let s=0;s<len;s+=1.5){const px=x+Math.cos(ang)*s,py=y+Math.sin(ang)*s,i=Math.floor(px),j=Math.floor(py);if(i<1||j<1||i>=N-1||j>=N-1)return -99;
      if(!this.airGroundOk(px,py))sc-=6;else{const t=this.G.terrain[j*N+i];sc+=t===T.grass||t===T.meadow?1:t===T.dirt||t===T.sand?.8:.2;}
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){if(!this.airGroundOk(px+dx*1.2,py+dy*1.2))sc-=.7;}}
    return sc;},

  // ---------- le sol ----------
  // un point où un aéronef peut rouler ou toucher : terre marchable, ni arbre, ni bâtiment, ni mur, ni cratère profond
  airGroundOk(x,y){const N=this.N,i=Math.floor(x),j=Math.floor(y);if(i<1||j<1||i>=N-1||j>=N-1)return false;const k=j*N+i,T0=this.G.terrain[k];if(!TERRAIN[T0]?.walk)return false;if(this.occ[k]>=0||this.fort?.[k]||this.wall[k])return false;
    const nd=this.nodeAt[k];if(nd>=0){const n=this.s.nodes[nd];if(n&&n.left>0&&(n.type==='tree'||n.type==='rock'||n.type==='ore'))return false;}return (this.crater?.[k]||0)<.5;},
  // la hauteur de l'obstacle sous (x, y) : arbre, bâtiment, mur de béton ; 0 : rien
  airObstacleH(x,y){const N=this.N,i=Math.floor(x),j=Math.floor(y);if(i<0||j<0||i>=N||j>=N)return 0;const k=j*N+i;const nd=this.nodeAt[k];if(nd>=0){const n=this.s.nodes[nd];if(n&&n.left>0&&n.type==='tree')return TREE_H;}
    if(this.occ[k]>=0)return this.fort?.[k]?WALL_H:BUILD_H;return 0;},
  // un obstacle à hauteur (un arbre, un bâtiment) : le choc
  airObstacleCheck(v,A){if(v.alt<=0)return;const h=this.airObstacleH(v.x,v.y);if(h>0&&v.alt<h)this.airCrash(v,h===TREE_H?'a heurté les arbres':'a heurté un bâtiment');},
  // le toucher des roues : terre libre, pas trop vite, pas trop dur
  airTouch(v,A){if(!this.airGroundOk(v.x,v.y)){const T0=this.G.terrain[Math.floor(v.y)*this.N+Math.floor(v.x)];return {ok:false,why:TERRAIN[T0]?.water?'amerri':'s’est posé sur un obstacle'};}
    const sink=-(v.vz||0),vmaxTouch=(A.power?A.stall*1.65:A.glide*1.45);if(sink>3.4)return {ok:false,why:'atterrissage trop dur'};if(v.spd>vmaxTouch)return {ok:false,why:'trop vite au toucher'};if(v.spd<A.stall*.75&&A.power)return {ok:false,why:'décrochage à l’arrondi'};return {ok:true};},
  // l'accident : points de vie perdus, blessés selon la vitesse du choc, parfois le pilote tué (pire des cas : choc violent, plus de 25 m/s) ; les survivants sortent
  airCrash(v,cause){if(v.dead)return;const V=VEHDEF[v.k],A=V.air;const sp=Math.max(0,v.spd||0)+Math.abs(Math.min(0,v.vz||0))*.6;v.dead=true;v.crashed=true;v.state='crashed';v.hp=0;v.spd=0;v.alt=Math.max(0,v.alt||0);v.vz=0;v.crashCause=cause;
    const crew=(v.crew||[]).filter(u=>u.hp>0);let hurt=0,killed=0;
    // l'énergie : plus de 25 m/s, c'est grave ; sous 15 m/s, des bleus
    const sev=clamp((sp-10)/35,0,1);
    for(const u of crew){const pilot=u.vrole==='conducteur';
      // le pilote est devant : plus exposé ; la mort : seulement pour un gros choc (jamais sous 25 m/s)
      if(sp>=25&&pilot&&this.rand()<clamp((sp-25)/45,0,.5)*(cause.includes('arbre')||cause.includes('bâtiment')?1.2:1)){u.hp=0;if(u.h)u.h.state='mort';killed++;continue;}
      const n=this.rand()<(.25+.6*sev)?1+this.poisson(1.2*sev):0;for(let q=0;q<n&&u.hp>0;q++)if(this.vehCrewHit(v,u,fragDesign(.9+this.rand()*1.6,1.6),150+sev*550+this.rand()*200,`accident d’aéronef (${cause})`)){hurt++;}}
    this.emit({type:'boom',kind:'shell',x:v.x,y:v.y,f:v.f});if(sp>20)this.emit({type:'fire',x:v.x,y:v.y});
    // les survivants descendent (à terre) ; ils sont plantés là ; un avion en l'air qui s'écrase en mer : tout le monde se noie
    const onLand=this.airGroundOk(v.x,v.y)||TERRAIN[this.G.terrain[Math.floor(v.y)*this.N+Math.floor(v.x)]]?.walk;
    if(onLand){this.vehUnboard(v,'tous');}else{let lost=0;for(const u of [...(v.crew||[])]){u.hp=0;lost++;}v.crew=[];if(lost)killed+=lost;}
    if(v.tows!=null){const g=this.s.vehicles.find(o=>o.id===v.tows);if(g)this.airRelease(g);v.tows=null;}
    if(v.towedBy!=null){const p=this.s.vehicles.find(o=>o.id===v.towedBy);if(p)p.tows=null;v.towedBy=null;}
    v.crashInfo={cause,speed:Math.round(sp),killed,hurt};
    this.log('Front',`${v.name} s’est écrasé (${cause}, ${Math.round(sp)} m/s) : ${killed} tué${killed>1?'s':''}, ${hurt} blessé${hurt>1?'s':''}.`,v.f==='meumeu'?'bad':'good');},
};
