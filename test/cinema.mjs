// Le mode cinéma : un réalisateur qui cadre l'action. Chaque événement (tir, blessure, mort, explosion) dépose un poids qui s'éteint ;
// la caméra glisse vers le centre de l'action la plus lourde, plus près quand elle est plus intense, et se retire quand le joueur y touche.
// CRITÈRES (fixés avant de lancer) :
//   Q1 sans événement, pas de foyer ; une grosse explosion donne un foyer à son point, d'intensité au moins égale à son poids ; l'intérêt s'éteint : après 8 s, moins de 5 % du départ
//   Q2 deux foyers : le plus lourd gagne même s'il est plus loin ; son centre est la moyenne pondérée de ses événements (à ±0,05 case) ; un événement isolé loin du foyer n'entre pas dans le calcul
//   Q3 le zoom croît avec l'intensité, entre 0,95 (calme) et 1,55 (violent), jamais hors de ces bornes
//   Q4 le lissage converge : après trois constantes de temps, à moins de 5 % de la cible ; jamais de dépassement (pas d'oscillation)
//   Q5 le joueur reprend la main : un mouvement de caméra qu'il fait lui-même (glisser, molette) retire le réalisateur pendant 6 s, puis il reprend la caméra
//   Q6 pas de triche : un événement que le joueur ne peut pas voir (brouillard) n'attire jamais la caméra ; éteint (mode off), le réalisateur ne touche à rien
//   Q7 le calme suit la sélection : sans action, la caméra va vers le centre des soldats choisis (pas ailleurs) et revient au plan large
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/cinema.mjs
const {Director,focusOf,zoomFor,step,weightOf}=await import('../js/director.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
// Q1
{const d=new Director();d.on=true;const vide=focusOf(d.ev,0);d.note({type:'boom',kind:'bomb',x:40,y:60},0,true);const f0=focusOf(d.ev,0),f8=focusOf(d.ev,8);
  P(vide===null&&f0&&near(f0.x,40,1e-9)&&near(f0.y,60,1e-9)&&f0.I>=weightOf({type:'boom',kind:'bomb'})-1e-9&&(f8===null||f8.I<f0.I*.05),'Q1. foyer à l’explosion, intérêt qui s’éteint',`sans événement ${vide} · bombe : (${f0?.x},${f0?.y}) intensité ${f0?.I.toFixed(1)} · après 8 s ${f8?f8.I.toFixed(2):'plus rien'}`);}
// Q2
// (4 blessures pèsent 6,4 : moins qu'une bombe (9), même à 280 cases)
{const d=new Director();d.on=true;for(let i=0;i<4;i++)d.note({type:'wound',x:100+i*.5,y:100},0,true);d.note({type:'shot',x:20,y:20},0,true);d.note({type:'shot',x:22,y:20},0,true);d.note({type:'boom',kind:'bomb',x:300,y:300},0,true);
  const f=focusOf(d.ev,0);const ev=d.ev.filter(e=>Math.hypot(e.x-100,e.y-100)<14);
  d.ev=d.ev.filter(e=>e.x<200);const f2=focusOf(d.ev,0);let sx=0,sw=0;for(const e of d.ev.filter(e=>Math.hypot(e.x-100,e.y-100)<14)){sx+=e.x*e.w;sw+=e.w;}
  P(f&&Math.hypot(f.x-300,f.y-300)<.5&&f2&&near(f2.x,sx/sw,.05)&&Math.abs(f2.y-100)<.05,'Q2. le foyer le plus lourd gagne, centre pondéré, l’isolé n’y entre pas',`avec la bombe : (${f?.x.toFixed(1)},${f?.y.toFixed(1)}) · sans elle : (${f2?.x.toFixed(2)},${f2?.y.toFixed(2)}) attendu x=${(sx/sw).toFixed(2)}`);}
// Q3
{const zs=[0,1,3,7,14,50,1000].map(zoomFor);const mono=zs.every((z,i)=>i===0||z>=zs[i-1]);
  P(mono&&near(zs[0],.95,1e-9)&&near(zs.at(-1),1.55,1e-9)&&zs.every(z=>z>=.95-1e-9&&z<=1.55+1e-9),'Q3. le zoom croît avec l’intensité, borné',`zoom ${zs.map(z=>z.toFixed(2)).join(' → ')}`);}
// Q4
{let x=0;const tgt=100;const tau=.9;let overshoot=false;for(let t=0;t<3*tau;t+=1/60){x=step(x,tgt,1/60,tau);if(x>tgt)overshoot=true;}const err=Math.abs(x-tgt)/tgt;
  P(err<.05&&!overshoot,'Q4. le lissage converge sans dépasser',`après 3τ : ${x.toFixed(2)} sur ${tgt} (écart ${(err*100).toFixed(1)} %) · dépassement ${overshoot}`);}
// Q5 : le joueur reprend la main
{const d=new Director();d.on=true;const cam={cx:0,cy:0,zoom:.95};const dt=1/60;let t=0;
  const run=s=>{for(let i=0;i<s*60;i++){d.tick(cam,dt,t,null);t+=dt;}};
  d.note({type:'boom',kind:'bomb',x:50,y:0},t,true);run(3);const suivi=cam.cx>25;
  // le joueur fait glisser la caméra à la main, loin de l'action
  cam.cx=-40;cam.cy=30;d.tick(cam,dt,t,null);t+=dt;const x0=cam.cx;run(3);const libre=Math.abs(cam.cx-x0)<.01;   // 3 s après : il ne la reprend pas
  d.note({type:'boom',kind:'bomb',x:50,y:0},t,true);run(6);const repris=cam.cx>x0+5;                          // 6 s plus tard : il la reprend
  P(suivi&&libre&&repris,'Q5. le joueur reprend la main 6 s, puis le réalisateur revient',`suit l’action : ${suivi} · libre 3 s après le geste (bouge de ${Math.abs(cam.cx-x0).toFixed(2)}) : ${libre} · repris ensuite : ${repris} (x=${cam.cx.toFixed(1)})`);}
// Q6
{const d=new Director();d.on=true;d.note({type:'boom',kind:'bomb',x:10,y:10},0,false);const cache=focusOf(d.ev,0)===null;
  const off=new Director();off.on=false;off.note({type:'boom',kind:'bomb',x:10,y:10},0,true);const cam={cx:5,cy:5,zoom:1};off.tick(cam,1/60,0,null);
  P(cache&&off.ev.length===0&&cam.cx===5&&cam.cy===5&&cam.zoom===1,'Q6. pas de triche : rien d’invisible n’attire la caméra ; éteint, il ne touche à rien',`événement invisible retenu : ${!cache} · éteint : ${off.ev.length} événement, caméra (${cam.cx},${cam.cy}, ×${cam.zoom})`);}
// Q7
{const d=new Director();d.on=true;const cam={cx:0,cy:0,zoom:1.4};for(let i=0;i<60*8;i++)d.tick(cam,1/60,i/60,{x:30,y:-20});
  P(Math.hypot(cam.cx-30,cam.cy+20)<1&&Math.abs(cam.zoom-.95)<.05,'Q7. au calme, la caméra va vers la sélection et revient au plan large',`caméra (${cam.cx.toFixed(1)},${cam.cy.toFixed(1)}) ×${cam.zoom.toFixed(2)} pour une sélection en (30,-20)`);}
process.exit(fail?1:0);
