// La chasse au char des Bèè (V12.8) — mélangé à World. Le joueur : « il faut être très proche pour le lance-roquettes léger à charge creuse,
// donc il faut des changements à l'IA ennemie ». Une équipe antichar bèè (fusil antichar, fusil antichar lourd, lance-roquettes) qui voit un de nos
// blindés quitte son poste et va le chercher : par le FLANC ou l'ARRIÈRE (là où la plaque est mince), courbée, à la portée de son arme — le
// lance-roquettes à moins de seize mètres —, et ne tire qu'une fois là ; puis elle revient à son poste. De jour, face à un char qui veille, à
// découvert : elle ne traverse pas, elle attend couchée la nuit, ou que le char vienne à elle (l'embuscade). Le lance-roquettes ne gâche pas ses
// roquettes sur l'infanterie ni de loin (voir vehThreatFor, nearestEnemy).
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const active=u=>u&&u.hp>0&&(!u.h||u.h.state==='ok'||u.h.state==='blesse');
const AT={bee_lrac:'lrac',bee_at_lourd:'at',bee_at:'at'};
const TILE_M=4;
export const ANTICHAR={
  atKind(w){return AT[w]||null;},
  // la distance de tir (cases) : un peu au-delà de la portée utile ; le lance-roquettes, pas plus
  atFireMax(W,k){return k==='lrac'?Math.max(2.5,W.eff*1.15/TILE_M):Math.max(6,W.eff*1.6/TILE_M);},
  // toutes les quinze minutes : chaque équipe antichar libre choisit le blindé repéré le plus proche à sa portée de chasse
  beeeTankHunt(){if(!this.atWar)return;const tanks=(this.cvs||[]).filter(v=>v.f==='meumeu'&&v.hp>0&&!v.aboard&&this.vehDef(v)?.blindage&&((this.vehDef(v).blindage.flanc?.[0]||0)>=.5)&&this.vehSeen('beee',v));if(!tanks.length)return;
    for(const u of this.s.units){if(u.f!=='beee'||!active(u)||u.servant||!u.w||u.inVeh)continue;const k=this.atKind(u.w);if(!k)continue;const T=u.task;if(T?.kind==='tankhunt'||!(T?.kind==='guard'||T?.kind==='assault'))continue;
      if(!((u.mag||0)+(u.pouch||0)>0))continue;const R=k==='lrac'?32:26;
      const v=tanks.map(v=>({v,d:d2(v.x,v.y,u.x,u.y)})).filter(o=>o.d<R).sort((a,b)=>a.d-b.d)[0]?.v;if(!v)continue;
      u.task={kind:'tankhunt',v:v.id,back:T.kind==='guard'?[T.tx,T.ty]:(u.post||[u.x,u.y]),t0:this.s.t};u.path=null;}},
  // la chasse elle-même (appelée par la tâche « tankhunt » de chaque Bèè)
  tankHuntTick(u,T0){const v=this.s.vehicles.find(o=>o.id===T0.v);const back=()=>{u.task={kind:'guard',tx:T0.back[0],ty:T0.back[1]};u.path=null;u.orderPost=null;};
    if(!v||v.hp<=0||this.s.t-T0.t0>20||!((u.mag||0)+(u.pouch||0)>0)){back();return;}
    if(!this.vehSeen('beee',v)){if(this.s.t-(T0.seen??T0.t0)>1.5){back();return;}}else T0.seen=this.s.t;
    const W=this.W(u.w),k=this.atKind(u.w),fm=this.atFireMax(W,k),d=d2(u.x,u.y,v.x,v.y);
    // la place de tir : sur un flanc ou à l'arrière, à ~85 % de la distance de tir ; refaite quand l'engin a bougé
    if(!T0.spot||d2(T0.vx??0,T0.vy??0,v.x,v.y)>1.5||this.s.t-(T0.spotT||-9)>1){T0.vx=v.x;T0.vy=v.y;T0.spotT=this.s.t;
      const r=fm*.8,cands=[Math.PI/2,-Math.PI/2,Math.PI*.75,-Math.PI*.75,Math.PI].map(o=>{const a=v.h+o;return this.freeSpot?.(v.x+Math.cos(a)*r,v.y+Math.sin(a)*r,3)||null;}).filter(Boolean);
      const side=u.id%2?1:-1;T0.spot=cands.sort((p,q)=>d2(p[0],p[1],u.x,u.y)-d2(q[0],q[1],u.x,u.y)+((Math.sin(Math.atan2(q[1]-v.y,q[0]-v.x)-v.h)*side>0?1:0)-(Math.sin(Math.atan2(p[1]-v.y,p[0]-v.x)-v.h)*side>0?1:0))*3)[0]||[v.x,v.y];u.path=null;}
    // à portée et en vue : feu (couché si l'on ne bouge plus)
    if(d<=fm&&this.los(u.x,u.y,v.x,v.y)){u.orderPost='couche';if(this.engage(u,v))return;}
    // L'EMBUSCADE (mesuré au premier essai : en plein jour, trois chasseurs marchant à découvert vers un char dont le tireur veillait tombaient tous
    // à cinq ou six cases, avant leur portée de quatre) — de jour, à découvert, face à un char qui a un tireur, on ne traverse pas : couché, on attend
    // la nuit, ou que le char vienne à portée ; à découvert, on avance par bonds (une course, puis à terre)
    const gunner=(v.crew||[]).some(c=>c.vrole==='servant'&&c.hp>0&&c.h?.state!=='hors'),night=this.light()<.35;
    const exposed=gunner&&!night&&this.los(v.x,v.y,u.x,u.y)&&!this.smokeBetween(v.x,v.y,u.x,u.y);
    if(exposed&&d>fm*1.6){T0.wait=true;u.orderPost='couche';u.path=null;u.anim='idle';return;}
    T0.wait=false;if(exposed&&((this.s.t*7+u.id*.37)%1)>.6){u.orderPost='couche';u.path=null;u.anim='idle';return;}
    u.orderPost='accroupi';this.go(u,T0.spot[0],T0.spot[1]);},
};
