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
  brisant:{name:'Explosif brisant',k:1.35,gur:1.2,res:'explosifs_brisants',x:1.5,desc:'transformé à l’usine chimique : plus de souffle et des éclats plus rapides, au prix de salpêtre, fer et pièces'},
  // (débloqués par la recherche : amatol, thermite, phosphore blanc)
  amatol:{name:'Amatol',k:.92,gur:.88,res:'explosifs',x:.65,desc:'de la tolite coupée de nitrate d’ammonium : un peu moins brisante, un tiers moins chère — l’obus de la guerre de masse'},
  thermite:{name:'Thermite',k:.5,gur:.42,res:'melange_inc',x:2.4,inc:1,fire:1.9,desc:'fer et oxyde de fer à plus de deux mille degrés : elle fond les tôles et met le feu à tout ; peu de souffle, une flaque de métal en fusion qui brûle bien plus loin que le gel'},
  phosphore:{name:'Phosphore blanc',k:.55,gur:.5,res:'melange_inc',x:2.8,inc:1,fire:1.2,smoke:1,desc:'brûle à l’air libre : un nuage blanc épais qui aveugle une dizaine de secondes, et des particules incandescentes qui collent — couvre une retraite, chasse une tour, brûle les peluches'},
  // (V12.8) LES THERMOBARIQUES — débloqués par la recherche (la science thermobarique, puis l'explosif air-essence). Un cœur de tolite et un COMBUSTIBLE
  // (part p.tbf du chargement) que la détonation disperse puis que l'oxygène de l'AIR brûle : un souffle plus long et plus large que la tolite seule,
  // une boule de feu, presque pas d'éclats ; enfermé (une pièce, un abri, une tranchée), il ravage. tb : fuel (la ressource), Hc (MJ/kg de chaleur
  // de combustion ; la tolite : 4,6), eta (la part brûlée assez vite pour pousser l'onde, à l'air libre), rmin (le cœur nécessaire pour disperser le
  // combustible : masse cœur / combustible), f0 (la proportion proposée), fopt (au-delà, le combustible ne brûle plus en entier), conc (kg/m³ du nuage
  // le plus violent), aero (un liquide en brouillard : il lui faut l'obus à deux temps), fire (la boule de feu, relative).
  tb_charbon:{name:'Thermobarique au charbon',k:1,gur:.7,res:'explosifs',x:1,tb:{fuel:'charbon',Hc:30,eta:.34,rmin:.7,f0:.35,fopt:.42,conc:.25,fire:.8},
    desc:'un cœur de tolite et de la poussière de charbon : la détonation la soulève en nuage, l’air la brûle — un souffle plus long et plus large, une boule de feu, peu d’éclats ; bon marché'},
  tb_fer:{name:'Thermobarique à la poudre de fer',k:1,gur:.8,res:'explosifs',x:1,tb:{fuel:'fer',Hc:7.4,eta:.6,rmin:.5,f0:.45,fopt:.5,conc:.9,fire:1.4},
    desc:'de la poudre de fer fine autour du cœur : elle brûle à plus de deux mille degrés — moins d’énergie que le charbon, mais une chaleur qui met le feu à tout et colle aux peluches'},
  tb_essence:{name:'Explosif air-essence',k:1,gur:.4,res:'explosifs',x:1,tb:{fuel:'essence',Hc:44,eta:.62,rmin:.04,f0:.85,fopt:.92,conc:.07,aero:1,fire:1},
    desc:'de l’essence en brouillard : une petite charge ouvre l’obus et la répand, une seconde allume le nuage, qui détone d’un bloc. Énorme, mais il faut l’obus à deux temps — sinon, une boule de feu'},
  gelinc:{name:'Gel incendiaire chimique',k:.62,gur:.58,res:'melange_inc',x:1.8,inc:1,fire:1.25,desc:'un gel collant de l’usine chimique : moins de brisance, mais une gerbe brûlante qui reste au sol et enflamme bâtiments et peluches'},
};
// la coque : la part qui devient des éclats utiles, leur dispersion en taille [facteur de masse, part], leur forme dans l'air
export const SHELLS={
  lisse:{name:'Coque lisse',use:.55,mix:[[.3,.35],[1,.4],[2.6,.25]],aero:.85,desc:'elle éclate au hasard : beaucoup de poussière de métal, quelques gros morceaux ; la moitié de la coque ne sert à rien'},
  rainuree:{name:'Coque rainurée',use:.8,mix:[[.8,.5],[1.25,.5]],aero:1,cost:{pieces:.1},desc:'rainurée à l’intérieur : elle se brise en éclats de la taille voulue'},
  // (V12.8) les coques du souffle : thin = la part de la coque rendue au chargement (une paroi fine) ; cloud : l'obus à deux temps (le nuage détone)
  mince:{name:'Coque mince',use:.4,mix:[[.4,.6],[1,.4]],aero:.8,thin:.2,cost:{pieces:.05},desc:'une paroi fine : bien plus de mélange dans le même obus, presque pas d’éclats — l’obus du souffle'},
  deux_temps:{name:'Obus à deux temps',use:.25,mix:[[.4,1]],aero:.8,thin:.15,cloud:1,cost:{pieces:.3,cuivre:.05},desc:'une petite charge ouvre l’obus et répand le combustible en nuage ; une seconde, un instant après, l’allume : tout le nuage détone, il entre dans les tranchées et les abris'},
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
// Mesuré (test/eclat_table.mjs, bodyRay → wound → applyWound sur un Meumeu debout, moyenne sur des éclats de 0,5 à 4 g, 600 essais par point) :
// UN éclat qui touche blesse presque toujours (dès 0,5 J) mais met rarement hors de combat — moins de 1 % sous 20 J, 3,5 % à 100 J, 7 % à 200 J,
// 10 % à 500 J, 20 % à 4 kJ. La létalité d'un obus vient du NOMBRE d'éclats qui touchent, pas de chacun. L'ancienne formule (11 % à 0,5 J, 80 % à
// 128 J par éclat) surestimait d'un facteur cent ce que l'atelier affichait ; ces deux courbes suivent la simulation.
const GRAVE=[[.5,0],[1,.001],[5,.001],[10,.001],[20,.002],[50,.009],[100,.035],[200,.072],[500,.102],[1000,.126],[2000,.151],[4000,.199],[10000,.28]];
const lerpLog=(T,E)=>{if(E<=T[0][0])return T[0][1];for(let i=1;i<T.length;i++)if(E<=T[i][0]){const a=T[i-1],b=T[i],f=Math.log(E/a[0])/Math.log(b[0]/a[0]);return a[1]+(b[1]-a[1])*f;}return T[T.length-1][1];};
export const pGrave=E=>lerpLog(GRAVE,Math.max(0,E));
export const pBless=E=>Math.min(1,Math.max(0,E)/.5);
const dOf=g=>2*Math.cbrt(3*(g*1000/7.85)/(4*Math.PI));           // diamètre (mm) d'un éclat d'acier de g grammes

// La charge : g grammes d'explosif dans une coque de `casing` grammes, réglée par p (fill, fragm, shell, fuse)
// ENVELOPE_BLAST : effet d'enveloppe (Fisher) et réflexion du sol sur le souffle. Physiquement juste, mais DÉSACTIVÉ : à 1 m l'obusier ne met
// plus que 71 % des soldats hors de combat (critère B5-brutal : ≥ 80 %) et le gilet perd son avantage (B5-gilet) ; l'utilisateur veut un souffle qui
// tue, pas moins. Le calcul reste en place (E.phi, E.Wnom) pour l'afficher, et se réactive en passant la constante à true.
const ENVELOPE_BLAST=false;
// Le thermobarique : g grammes de chargement, dont la part f de combustible. Le cœur (1 − f) doit disperser le combustible (q : la dispersion,
// selon cœur / combustible face à rmin) ; au-delà de fopt, il en reste qui ne brûle pas à temps. Le brouillard d'un liquide (aero) sans obus à deux
// temps ne détone pas : il flambe (un tiers de l'effet). La postcombustion pousse l'onde de toute la part qui brûle à temps (eta) : en impulsion, un
// thermobarique vaut 1,3 à 1,5 tolite à l'air libre (mesuré au premier essai avec la moitié seulement : +4 %, rien qui justifie la science).
// Le nuage (obus à deux temps) : le combustible à la concentration conc, en demi-sphère au sol — dedans, tout détone (Rc).
export function thermo(g,tb,p={},S={}){const f=Math.max(.05,Math.min(.95,p.tbf??tb.f0)),gCore=g*(1-f),gFuel=g*f;
  const q=Math.max(0,Math.min(1,((1-f)/f)/tb.rmin)),over=f>tb.fopt?Math.max(.3,1-(f-tb.fopt)*2.2):1;
  const eta=Math.min(.85,tb.eta*(S.cloud?(tb.aero?1.25:1.1):(tb.aero?.35:1))*over);
  const Wcore=gCore/1000,Wab=gFuel/1000*(tb.Hc/4.6)*eta*q,W=Wcore+Wab;
  const cloud=S.cloud?Math.cbrt(3*(gFuel/1000/tb.conc)/(2*Math.PI))*q:0;
  // enfermé (bâtiment, abri, tranchée) : l'onde et la boule de feu restent, réfléchies — d'autant plus que la postcombustion compte
  const conf=1+2.2*(Wab/Math.max(1e-9,W));
  return {f,q,eta,gCore,gFuel,Wcore,Wab,W,cloud,conf,fuel:tb.fuel,fire:Math.max(.5,3.2*Math.cbrt(Math.max(1e-9,Wab))*10*(tb.fire||1)/3)};}
export function charge(g,casing,p={}){const F=FILLS[p.fill]||FILLS.tolite,S=SHELLS[p.shell]||SHELLS.lisse,U=FUSES[p.fuse]||FUSES.impact;
  // Le souffle vient de la charge ÉQUIVALENTE NUE, pas de la masse d'explosif inscrite : l'acier vole l'énergie que les éclats emportent
  // (Fisher : C·(0,2 + 0,8/(1 + M/C)) — un obus de campagne, M/C de 5 à 10, ne souffle qu'avec 25 à 35 % de son explosif). Posé au sol,
  // le souffle est renforcé par la réflexion (charge hémisphérique, ×1,8) ; éclaté en l'air, non. Les éclats gardent toute la charge (Gurney).
  // (V12.8) un thermobarique : le cœur détone (tolite), le combustible brûle avec l'air — W = W cœur + W de la postcombustion
  const T=F.tb?thermo(g,F.tb,p,S):null;const gc=T?T.gCore:g;
  const phi=.2+.8/(1+casing/Math.max(1e-6,g));const Wnom=T?T.W:g/1000*F.k;const W=ENVELOPE_BLAST?Wnom*phi*(U.air?1:1.8):Wnom;const r=gc/Math.max(1e-6,casing);const vg=2400*F.gur*Math.sqrt(r/(1+r/2));
  const fm=(p.fragm??4)/1000;const useful=casing*S.use;
  // les classes d'éclats : masse, nombre, diamètre, distance de freinage λ (m) — v(R) = vg·e^(−R/λ)
  // distance de freinage d'un éclat d'acier (m) : v(R)=vg·e^(−R/λ), λ = 2·m / (ρ_air · Cd · A) avec A la section de l'éclat (une sphère de même masse,
  // Cd = 1 pour un éclat qui tourne), réduite à 30 % pour le jeu. Avant : 16·∛m (3,2 m pour 8 g), environ dix fois trop court — à 17 m d'une
  // charge de 500 g plus aucun soldat n'était blessé (physique : plusieurs dizaines de mètres, de quelques grammes à un obus).
  const lamOf=m=>{const dm=2*Math.cbrt(3*m/(4*Math.PI*7850)),A=Math.PI/4*dm*dm;return Math.min(120,.3*2*m/(1.2*1.0*Math.max(1e-9,A)));};
  const cls=S.mix.map(([f,share])=>{const m=fm*f;return {m,n:Math.max(0,useful*share/m),d:dOf(m),lam:lamOf(m)*S.aero};}).filter(c=>c.n>=.5);
  const n=Math.round(cls.reduce((a,c)=>a+c.n,0));
  const R=z=>z*Math.cbrt(Math.max(1e-9,W));
  const rootW=Math.cbrt(Math.max(1e-9,W));const pressure=Rm=>Math.min(1800,900/Math.max(.16,(Math.max(.03,Rm)/rootW)**2));
  const impulse=Rm=>pressure(Rm)*(.0018*rootW*(1+Math.max(.03,Rm)/rootW));
  const E={W,Wnom,phi,g,casing,vg,n,fm,cls,geo:U.geo,air:!!U.air,bld:(U.bld||1)*(T?T.conf:1),fill:F,shell:S,fuse:U,blast:R(ZB.lethal),inj:R(ZB.inj),conc:R(ZB.conc),stun:R(ZB.stun),pressure,impulse,inc:!!F.inc||!!T,fire:F.inc?10*rootW*(F.fire||1):T?T.fire:0,tb:T};
  // la chance, pour un Meumeu à R mètres, d'être gravement touché / touché, par les éclats seuls
  E.at=(Rm,post='debout')=>{const A=EXPO[E.air?'air':'sol'][post];let hg=0,hb=0;const r2=Math.max(.01,Rm*Rm);
    for(const c of cls){const hits=c.n*U.geo*A/(4*Math.PI*r2);const v=vg*Math.exp(-Rm/c.lam);const e=.5*c.m*v*v;   /* c.m est en kg : le /1000 d'avant rendait l'énergie mille fois trop petite */hg+=hits*pGrave(e);hb+=hits*pBless(e);}
    return {pg:1-Math.exp(-hg),pb:1-Math.exp(-hb)};};
  const reach=(f,th)=>{let lo=0;for(let x=.02;x<200;x*=1.04){if(f(x)>=th)lo=x;}return lo;};
  E.lethal=reach(x=>E.at(x).pg,.5);E.lethal10=reach(x=>E.at(x).pg,.1);E.danger=reach(x=>E.at(x).pb,.1);E.lethalProne=reach(x=>E.at(x,'couche').pg,.5);
  E.radius=Math.max(E.danger,E.stun);
  // les dégâts aux bâtiments (même unité que les obus des canons : 45 pour 1)
  E.dmgB=Math.min(3000,90*Math.cbrt(W/.004)*E.bld);
  return E;}

// Le tir courbe : on cherche l'angle (sous 45° pour un canon, au-dessus pour un mortier) qui porte à R mètres ; on renvoie le
// temps de vol, l'angle, la vitesse à l'arrivée, et la portée maximale (à 45°, avec la traînée).
export function flight(v0,BC,deg,B=null){const a=deg*Math.PI/180;let x=0,y=0,vx=v0*Math.cos(a),vy=v0*Math.sin(a),t=0;const dt=v0>300||B?.004:.008;
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
