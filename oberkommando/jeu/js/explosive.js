// Les charges explosives : le souffle, les éclats, la commotion — et le tir courbe des armes à obus.
// Le souffle ne dépend pas de la taille de la victime : une surpression tue un Meumeu comme un homme. On le compte en distance
// réduite Z = R / W^(1/3) (W : masse de tolite équivalente, kg ; R en m) — Hopkinson-Cranz :
//   Z < 2,2 : mortel (poumons, cœur) ; < 3,2 : lésions internes ; < 4,5 : commotion (assommé) ; < 7 : sonné, sourd, désorienté.
// Les éclats : la coque brisée, lancée à la vitesse de Gurney, ralentie par l'air (plus un éclat est petit, plus vite il freine) ;
// leur nombre décroît comme le carré de la distance. Chaque éclat qui touche fait sa vraie blessure (ballistics.wound) ;
// les courbes ci-dessous (calées sur ces blessures, test/_cal) servent aux estimations du bureau d'études.
import {cdG7,RHO_AIR,G,C_SOUND} from './ballistics.js';

// l'explosif : k = équivalent tolite ; gur = vitesse de Gurney relative ; res = ce qu'il coûte ; x = combien
export const FILLS={
  poudre:{name:'Poudre noire',k:.42,gur:.42,res:'poudre',x:1,desc:'de la poudre à fusil tassée : bon marché, faible — un souffle court, des éclats lents et gros'},
  tolite:{name:'Tolite',k:1,gur:1,res:'explosifs',x:1,desc:'l’explosif de l’usine chimique : la référence'},
  brisant:{name:'Explosif brisant',k:1.35,gur:1.2,res:'explosifs',x:1.8,desc:'plus violent : 35 % de souffle en plus, des éclats plus rapides ; coûte presque deux fois plus d’explosifs'},
};
// la coque : la part qui devient des éclats utiles, leur dispersion en taille [facteur de masse, part], leur forme dans l'air
export const SHELLS={
  lisse:{name:'Coque lisse',use:.55,mix:[[.3,.35],[1,.4],[2.6,.25]],aero:.85,desc:'elle éclate au hasard : beaucoup de poussière de métal, quelques gros morceaux ; la moitié de la coque ne sert à rien'},
  rainuree:{name:'Coque rainurée',use:.8,mix:[[.8,.5],[1.25,.5]],aero:1,cost:{pieces:.1},desc:'rainurée à l’intérieur : elle se brise en éclats de la taille voulue'},
  billes:{name:'Billes d’acier',use:.93,mix:[[1,1]],aero:1.3,cost:{fer:.25,pieces:.15},desc:'des billes calibrées noyées autour de la charge : toutes utiles, rondes, elles portent loin ; chères'},
};
// la fusée : geo = part des éclats qui partent vers les cibles (le reste va au sol ou au ciel) ; air : éclate au-dessus
export const FUSES={
  impact:{name:'Percutante',geo:.45,desc:'éclate au contact : la moitié des éclats part dans le sol ; se coucher protège beaucoup'},
  retard:{name:'Retard',geo:.22,bld:2.2,desc:'éclate un instant après l’impact, enfoncée : peu d’éclats, mais le souffle enfermé ravage bâtiments, murs et abris'},
  fusant:{name:'Fusante (en l’air)',geo:.72,air:1,minD:8,cost:{pieces:.3},desc:'éclate à hauteur d’homme au-dessus de la cible : les éclats pleuvent, coucher ou tranchée ne protègent plus (8 mm et plus)'},
};
export const ZB={lethal:2.2,inj:3.2,conc:4.5,stun:7};
// la surface exposée d'un Meumeu (m²), selon sa posture, face aux éclats d'un obus au sol ou en l'air
export const EXPO={sol:{debout:.018,accroupi:.012,couche:.004},air:{debout:.012,accroupi:.013,couche:.02}};
// ce qu'un éclat qui touche fait, selon son énergie (J) : une blessure grave (hors de combat, ou pire), une blessure
export const pGrave=E=>.85*(1-Math.exp(-Math.pow(Math.max(0,E)/18,.55)));
export const pBless=E=>.95*(1-Math.exp(-Math.pow(Math.max(0,E)/4,.6)));
const dOf=g=>2*Math.cbrt(3*(g*1000/7.85)/(4*Math.PI));           // diamètre (mm) d'un éclat d'acier de g grammes

// La charge : g grammes d'explosif dans une coque de `casing` grammes, réglée par p (fill, fragm, shell, fuse)
export function charge(g,casing,p={}){const F=FILLS[p.fill]||FILLS.tolite,S=SHELLS[p.shell]||SHELLS.lisse,U=FUSES[p.fuse]||FUSES.impact;
  const W=g/1000*F.k;const r=g/Math.max(1e-6,casing);const vg=2400*F.gur*Math.sqrt(r/(1+r/2));
  const fm=(p.fragm??4)/1000;const useful=casing*S.use;
  // les classes d'éclats : masse, nombre, diamètre, distance de freinage λ (m) — v(R) = vg·e^(−R/λ)
  const cls=S.mix.map(([f,share])=>{const m=fm*f;return {m,n:Math.max(0,useful*share/m),d:dOf(m),lam:16*Math.cbrt(m)*S.aero};}).filter(c=>c.n>=.5);
  const n=Math.round(cls.reduce((a,c)=>a+c.n,0));
  const R=z=>z*Math.cbrt(Math.max(1e-9,W));
  const E={W,g,casing,vg,n,fm,cls,geo:U.geo,air:!!U.air,bld:U.bld||1,fill:F,shell:S,fuse:U,blast:R(ZB.lethal),inj:R(ZB.inj),conc:R(ZB.conc),stun:R(ZB.stun)};
  // la chance, pour un Meumeu à R mètres, d'être gravement touché / touché, par les éclats seuls
  E.at=(Rm,post='debout')=>{const A=EXPO[E.air?'air':'sol'][post];let hg=0,hb=0;const r2=Math.max(.01,Rm*Rm);
    for(const c of cls){const hits=c.n*U.geo*A/(4*Math.PI*r2);const v=vg*Math.exp(-Rm/c.lam);const e=.5*c.m/1000*v*v;hg+=hits*pGrave(e);hb+=hits*pBless(e);}
    return {pg:1-Math.exp(-hg),pb:1-Math.exp(-hb)};};
  const reach=(f,th)=>{let lo=0;for(let x=.02;x<200;x*=1.04){if(f(x)>=th)lo=x;}return lo;};
  E.lethal=reach(x=>E.at(x).pg,.5);E.danger=reach(x=>E.at(x).pb,.1);E.lethalProne=reach(x=>E.at(x,'couche').pg,.5);
  E.radius=Math.max(E.danger,E.stun);
  // les dégâts aux bâtiments (même unité que les obus des canons : 45 pour 1)
  E.dmgB=Math.min(400,60*Math.cbrt(W/.004)*E.bld);
  return E;}

// Le tir courbe : on cherche l'angle (sous 45° pour un canon, au-dessus pour un mortier) qui porte à R mètres ; on renvoie le
// temps de vol, l'angle, la vitesse à l'arrivée, et la portée maximale (à 45°, avec la traînée).
function flight(v0,BC,deg,B=null){const a=deg*Math.PI/180;let x=0,y=0,vx=v0*Math.cos(a),vy=v0*Math.sin(a),t=0;const dt=v0>300||B?.004:.008;
  while(t<200){const v=Math.hypot(vx,vy)||1e-6;const k=.5*RHO_AIR*v*cdG7(v/C_SOUND)*(Math.PI/4)/BC;const th=B&&t<B.tr?B.a:0;vx+=(th*vx/v-k*vx)*dt;vy+=(th*vy/v-k*vy-G)*dt;x+=vx*dt;y+=vy*dt;t+=dt;if(y<0&&t>.05)break;}
  return {x,t,v:Math.hypot(vx,vy),fall:Math.atan2(-vy,vx)};}
// les tables de tir : pour un mortier, plusieurs charges (des gargousses qu'on retire : 100 % à 15 % de la vitesse) ;
// pour un canon, la cartouche entière, de 1° à 80°
export const CHARGES=[1,.78,.6,.45,.33,.24,.17];
export function arcTable(v0,BC,mortar=false,B=null){const T=[];for(const q of mortar?CHARGES:[1])for(let deg=mortar?45:1;deg<=(mortar?85:80);deg+=deg<10?1:2.5)T.push({q,deg,...flight(v0*q,BC,deg,B)});
  return {T,max:Math.max(...T.map(o=>o.x)),min:mortar?Math.min(...T.map(o=>o.x)):0,mortar};}
// l'angle pour R mètres : haut (tir de mortier, par-dessus tout) ou bas (tir tendu courbe)
export function aimArc(A,R,high=true){let best=null;const qs=[...new Set(A.T.map(o=>o.q))].sort((a,b)=>a-b);
  for(const q of qs){const L=A.T.filter(o=>o.q===q&&(A.mortar||(high?o.deg>=45:o.deg<=45))).sort((a,b)=>a.deg-b.deg);
    for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i];if((a.x-R)*(b.x-R)<=0){const f=(R-a.x)/((b.x-a.x)||1);const s={q,deg:a.deg+(b.deg-a.deg)*f,t:a.t+(b.t-a.t)*f,v:a.v+(b.v-a.v)*f,fall:a.fall+(b.fall-a.fall)*f};
        if(!best||(A.mortar?s.deg>best.deg&&s.q<=best.q:high?s.deg>best.deg:s.deg<best.deg))best=s;}}
    if(A.mortar&&best)return best;}
  return best;}
