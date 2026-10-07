// Le réalisateur du mode cinéma : où est l'action ? Chaque événement (tir, blessure, mort, explosion) dépose un poids qui s'éteint (constante 1,6 s) ;
// la caméra glisse vers le centre de l'action la plus lourde, plus près quand elle est plus intense. Il ne voit que ce que le joueur peut voir,
// et se retire 6 s dès que le joueur touche à la caméra (glisser, molette, touches). Fonctions pures : testables sans écran.
export const HOLD=6;                    // secondes de liberté après un geste du joueur
const TAU=1.6,RADIUS=14;                // extinction de l'intérêt ; rayon (cases) d'un foyer
const W={shot:.5,wound:1.6,death:2.2,collapse:3,cannon:1.2,pierce:.5,impact:.15,'fire-area':1.2,flak:1};
export const weightOf=e=>e.type==='boom'?(e.kind==='pop'?.4:e.kind==='bomb'?9:e.kind==='shell'?5:3):(W[e.type]??0);
// le foyer de l'action : le groupe de plus grand poids (rayon RADIUS), son centre pondéré et son intensité ; null si tout est éteint
export function focusOf(list,t,tau=TAU,R=RADIUS){
  const live=[];for(const o of list){const a=o.w*Math.exp(-(t-o.t)/tau);if(a>.04)live.push({x:o.x,y:o.y,a});}
  if(!live.length)return null;
  let best=null;for(const o of live){let s=0;for(const q of live)if(Math.hypot(q.x-o.x,q.y-o.y)<=R)s+=q.a;if(!best||s>best.s)best={o,s};}
  let sx=0,sy=0,sw=0;for(const q of live)if(Math.hypot(q.x-best.o.x,q.y-best.o.y)<=R){sx+=q.x*q.a;sy+=q.y*q.a;sw+=q.a;}
  return {x:sx/sw,y:sy/sw,I:sw};}
// plus l'action est intense, plus on s'approche (0,95 au calme, 1,55 au plus fort)
export const zoomFor=I=>.95+.6*Math.min(1,I/14);
// lissage exponentiel : jamais de dépassement, converge en trois constantes de temps
export const step=(cur,tgt,dt,tau=.9)=>cur+(tgt-cur)*(1-Math.exp(-dt/tau));
export class Director{
  constructor(){this.ev=[];this.hold=0;this.set=null;this.on=false;}
  // visible : le joueur peut-il voir cet événement ? (brouillard de guerre) — sinon il ne compte pas
  note(e,t,visible=true){if(!this.on||!visible||e.x==null)return;const w=weightOf(e);if(!w)return;this.ev.push({x:e.x,y:e.y,w,t});if(this.ev.length>90)this.ev.shift();}
  // cam : {cx,cy,zoom}, modifié en place ; sel : {x,y}, le centre des soldats choisis, ou null
  tick(cam,dt,t,sel){
    if(!this.on)return;
    // le joueur a bougé la caméra lui-même (écart avec ce que le réalisateur a réglé au tick précédent) : il se retire
    if(this.set&&(Math.abs(cam.cx-this.set.cx)>.05||Math.abs(cam.cy-this.set.cy)>.05||Math.abs(cam.zoom-this.set.z)>.02))this.hold=t+HOLD;
    if(t>=this.hold){const f=focusOf(this.ev,t);let tx,ty,tz;
      if(f){tx=f.x;ty=f.y;tz=zoomFor(f.I);}else{tx=sel?sel.x:cam.cx;ty=sel?sel.y:cam.cy;tz=.95;}
      cam.cx=step(cam.cx,tx,dt);cam.cy=step(cam.cy,ty,dt);cam.zoom=step(cam.zoom,tz,dt,1.4);}
    this.set={cx:cam.cx,cy:cam.cy,z:cam.zoom};}
  reset(){this.ev.length=0;this.hold=0;this.set=null;}
}
