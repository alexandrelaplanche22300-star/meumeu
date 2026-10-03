// Oberkommando der Meumeu — l'assaut amphibie : UNE mécanique, pour le joueur comme pour l'état-major bèè.
// Une opération (s.amphi) conduit des barges ou des bateaux et des troupes à travers la mer jusqu'à une plage :
//   load  → les troupes montent à bord (chaque barge reçoit ses passagers, le premier à bord pilote) ;
//   sail  → les barges se dispersent le long de la plage visée (4,5 cases d'écart) et font route, chacune vers sa case ;
//   land  → échouées, elles baissent la rampe, les troupes sortent par l'avant et courent vers l'intérieur ;
//   ferry → (si demandé) la rampe se relève, les barges repartent chercher la vague suivante à leur port d'attache ; puis retour à « load ».
// Le joueur la lance d'un clic droit sur une plage de l'autre rive avec des soldats choisis (le jeu prend les barges libres les plus proches) ; les Bèè, quand leur état-major
// a réuni une flotte (voir navalai.js). Dans les deux cas : mêmes règles, mêmes barges, mêmes pertes (une barge coulée au large noie ses passagers).
import {TERRAIN,T,HOUR_REAL,BUILDINGS} from './data.js';
import {VEHDEF} from './vehicules.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const SPREAD=4.5,LOAD_MAX=24,SAIL_MAX=110,LAND_MAX=14;

export const AMPHI={
  amphiBoatKinds(f){return f==='meumeu'?['barge','grande_barge']:['bateau_bee'];},
  // une case de plage près de (x, y) : sable à 3-6 cases de l'eau, praticable ; avec le sens de la mer (n, vers l'eau) et la tangente (t)
  amphiBeach(x,y,r=60){const N=this.N,dc=this.G.dcoast,ter=this.G.terrain;if(!dc)return null;let best=null,bd=1e9;
    for(let dj=-r;dj<=r;dj+=1)for(let di=-r;di<=r;di+=1){const i=Math.floor(x)+di,j=Math.floor(y)+dj;if(i<4||j<4||i>=N-4||j>=N-4)continue;const k=j*N+i,d=dc[k];if(d<3||d>6||!TERRAIN[ter[k]]?.walk||this.occ[k]>=0)continue;const q=Math.hypot(i+.5-x,j+.5-y);if(q<bd){bd=q;best=[i+.5,j+.5];}}
    if(!best)return null;const gx=dc[Math.floor(best[1])*N+Math.min(N-1,Math.floor(best[0])+3)]-dc[Math.floor(best[1])*N+Math.max(0,Math.floor(best[0])-3)],gy=dc[Math.min(N-1,Math.floor(best[1])+3)*N+Math.floor(best[0])]-dc[Math.max(0,Math.floor(best[1])-3)*N+Math.floor(best[0])];
    const gl=Math.hypot(gx,gy)||1;const nx=-gx/gl,ny=-gy/gl;return {x:best[0],y:best[1],nx,ny,tx:-ny,ty:nx};},
  // le joueur (ou un état-major) a-t-il des troupes d'un côté de la mer et un point sur l'autre rive ?
  amphiAcross(a,b){return this.G.mode==='mer'&&(a.x<this.N/2)!==(b.x<this.N/2);},
  amphiFreeBoats(f,x,y,r=80){const kinds=this.amphiBoatKinds(f);return this.s.vehicles.filter(v=>v.f===f&&!v.ally&&kinds.includes(v.k)&&v.hp>0&&!v.dead&&!v.op&&d2(v.x,v.y,x,y)<r).sort((a,z)=>d2(a.x,a.y,x,y)-d2(z.x,z.y,x,y));},
  // lancer : des troupes (unités), des barges, une plage visée. opts : ferry (revenir chercher du monde), onLanded (rappel de l'état-major)
  amphiLaunch(f,units,boats,tx,ty,opts={}){const beach=this.amphiBeach(tx,ty);if(!beach)return {ok:false,why:['pas de plage à cet endroit']};if(!boats.length)return {ok:false,why:['aucune barge libre à proximité']};if(!units.length)return {ok:false,why:['personne à embarquer']};
    const op={id:this.id(),f,state:'load',t0:this.s.t,tl:this.s.t,boats:boats.map(b=>b.id),units:units.map(u=>u.id),beach,wave:1,ferry:!!opts.ferry,maxWave:opts.maxWave||1,landed:0,lost:0,origin:Object.fromEntries(boats.map(b=>[b.id,[b.x,b.y]])),log:[]};
    (this.s.amphi??=[]).push(op);for(const b of boats){b.op=op.id;b.state='idle';b.bpath=null;b.rampTo=0;}this.amphiAssign(op);
    return {ok:true,op,text:`${units.length} soldats, ${boats.length} barge${boats.length>1?'s':''} : cap sur la plage d’en face`};},
  // répartir les troupes entre les barges (la capacité de chacune), les plus proches d'abord ; chacun reçoit l'ordre de monter
  amphiAssign(op){const boats=op.boats.map(id=>this.s.vehicles.find(v=>v.id===id)).filter(v=>v&&v.hp>0);const units=op.units.map(id=>this.unit(id)).filter(u=>u&&u.hp>0);op.asg={};const room=new Map(boats.map(b=>{const S=this.vehSeats(b);return [b.id,(S.cond?0:1)+Math.max(0,(VEHDEF[b.k].places.servants||0)-S.serv)+this.boatCap(b)-S.pass];}));   /* (le pilote, les mitrailleurs, puis la place du pont) */
    for(const u of units.sort((a,z)=>a.x-z.x)){let best=null,bd=1e9;for(const b of boats){if(room.get(b.id)<=0)continue;const d=d2(u.x,u.y,b.x,b.y);if(d<bd){bd=d;best=b;}}if(!best)break;room.set(best.id,room.get(best.id)-1);op.asg[u.id]=best.id;u.task={kind:'board',v:best.id};u.path=null;u.goal=null;u.amphi=op.id;}},
  amphiBoatsOf(op){return op.boats.map(id=>this.s.vehicles.find(v=>v.id===id)).filter(v=>v&&v.hp>0&&!v.dead);},
  // le pas : une fois par heure de jeu (suffisant, et bon marché)
  amphiTick(){const A=this.s.amphi;if(!A?.length)return;const t=this.s.t;
    for(const op of [...A]){if(t-(op.tick||-9)<.5)continue;op.tick=t;const boats=this.amphiBoatsOf(op);
      if(!boats.length){this.amphiEnd(op,'plus de barge');continue;}
      if(op.state==='load'){const aboard=boats.reduce((n,b)=>n+(b.crew||[]).length,0),waiting=op.units.map(id=>this.unit(id)).filter(u=>u&&u.hp>0&&u.task?.kind==='board').length;
        if((waiting===0&&aboard>0)||t-op.tl>LOAD_MAX){this.amphiSail(op,boats);}}
      /* (V12.5) les retardataires ne partent que dans les trois heures (sinon une barge seule traversait trente heures plus tard, et la vague l'attendait) ;
         la traversée est finie quand les barges parties sont arrivées — une barge vide, ou sans pilote, ne fait pas attendre les autres
         (mesuré : une barge sans pilote restée au port tenait l'opération en « traversée » 110 h) */
      else if(op.state==='sail'){if(t-op.tl<3)for(const b of boats)if(b.state!=='go'&&!b.sentOp&&(b.crew||[]).some(u=>u.vrole==='passager'))this.amphiSail(op,[b],boats.indexOf(b),boats.length);
        if(t-op.tl>12)for(const id of op.units){const u=this.unit(id);if(u&&u.task?.kind==='board'){u.task=null;u.amphi=null;}}
        const done=boats.every(b=>b.state!=='go'||b.sentOp!==op.id||!this.vehDriver(b));if(done||t-op.tl>SAIL_MAX){op.state='land';op.tl=t;for(const b of boats){b.state='idle';this.boatRamp(b,true);}}}
      else if(op.state==='land'){let left=0;for(const b of boats){if((b.ramp||0)<.9){this.boatRamp(b,true);left++;continue;}const pax=(b.crew||[]).filter(u=>u.vrole==='passager'&&u.hp>0);if(!pax.length&&!b.cargoVehs?.length)continue;const r=this.boatUnload(b,'passagers');if(r.ok){op.landed+=r.out.length;this.amphiOnLanded(op,r.out,b);}}
        const aboard=boats.reduce((n,b)=>n+(b.crew||[]).filter(u=>u.vrole==='passager').length,0);if(aboard===0||t-op.tl>LAND_MAX){
          if(op.ferry&&op.wave<op.maxWave&&this.amphiHolds(op)){op.state='ferry';op.tl=t;for(const b of boats){b.rampTo=0;const o=op.origin[b.id];if(o)this.boatMove(b,o[0],o[1]);}}else this.amphiEnd(op,'débarqué');}}
      else if(op.state==='ferry'){const back=boats.every(b=>b.state!=='go'||b.spd<.1);if(back||t-op.tl>SAIL_MAX){op.wave++;op.state='load';op.tl=t;const more=this.amphiHolds(op)?this.amphiNext(op):null;
        if(!more?.length)this.amphiEnd(op,'plus de troupes');else{op.units=more.map(u=>u.id);for(const b of boats)b.sentOp=null;this.amphiAssign(op);}}}}},
  amphiSail(op,boats,i0=null,n0=null){if(op.state!=='sail'){op.state='sail';op.tl=this.s.t;}const b0=op.beach,n=n0??boats.length;
    boats.forEach((b,i)=>{if(!(b.crew||[]).some(u=>u.vrole==='passager'))return;b.sentOp=op.id;i=i0??i;const off=(i-(n-1)/2)*SPREAD;let sx=b0.x+b0.tx*off,sy=b0.y+b0.ty*off;const sp=this.amphiBeach(sx,sy,10)||b0;b.rampTo=0;this.boatMove(b,sp.x,sp.y);});},
  amphiOnLanded(op,out,boat){if(op.f==='meumeu'){const b=op.beach;for(const u of out){u.amphi=null;u.task={kind:'move',tx:b.x-b.nx*10+(this.rand()-.5)*5,ty:b.y-b.ny*10+(this.rand()-.5)*5};}}else this.amphiBeeLanded?.(op,out);},
  amphiEnd(op,why){const A=this.s.amphi;A.splice(A.indexOf(op),1);for(const id of op.boats){const b=this.s.vehicles.find(v=>v.id===id);if(b){b.op=null;b.sentOp=null;const o=op.origin?.[id];if((op.f==='beee'||op.ally)&&o&&b.hp>0){b.rampTo=0;this.boatMove(b,o[0],o[1]);}}}for(const id of op.units){const u=this.unit(id);if(u)u.amphi=null;}if(op.f==='meumeu')this.log?.('Front',`Opération amphibie terminée (${why}) : ${op.landed} débarqués.`,'info');this.amphiDone?.(op,why);},
  // la vague suivante : des soldats à embarquer (ou rien) — selon le camp de l'opération
  amphiNext(op){return op.f==='beee'?this.amphiBeeNextWave?.(op):op.ally?this.allyNextWave?.(op):null;},
  // la tête de pont tient-elle ? (des hommes à nous, valides, près de la plage) — le joueur, lui, décide seul
  amphiHolds(op){if(op.f==='beee')return (this.s.beee.heads||[]).some(H=>d2(H.bx,H.by,op.beach.x,op.beach.y)<40&&this.amphiBeeHeadMen(H).length>0);
    if(op.ally)return this.s.units.some(u=>u.ally&&u.allyRaid&&u.hp>0&&u.h?.state!=='hors'&&!u.inVeh&&d2(u.x,u.y,op.beach.x,op.beach.y)<90);return true;},
};
