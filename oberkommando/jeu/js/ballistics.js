// La balistique, de la poudre à l'organe. Unités : mm pour les dimensions d'une munition, g pour les masses, m/s, joules.
// Les Meumeu et les Bèè mesurent 30 cm : leurs armes sont à leur taille (un fusil de base tire une balle de 1,8 mm, 0,1 g, à 800 m/s).
// Rien ici ne dépend de l'échelle : les mêmes formules donnent la vraie 7,62×51 humaine, qui sert de calibration aux bancs.
//
//  intérieure : l'énergie de la poudre, un rendement qui plafonne avec la longueur du canon, la masse de gaz qu'il faut aussi pousser
//               (calé sur 7,62×51, 5,56×45, 9×19, 7,62×39, 12,7×99 : à ±6 %) ; la pression, la paroi du tube, l'usure ;
//  extérieure : le coefficient balistique (masse / section / forme), la traînée G7 selon le nombre de Mach, la gravité ;
//               la stabilité gyroscopique (règle de Miller) : une balle trop longue pour son pas de rayure bascule en vol ;
//  terminale  : pas à pas dans le corps : traînée et résistance des tissus, basculement après un « cou » (quelques longueurs de balle),
//               fragmentation au-dessus d'une vitesse seuil, expansion, os qui cassent, dévient et projettent des éclats ;
//               cavité permanente (ce qui est écrasé) et cavité temporaire (ce qui est étiré : foie, rate, reins, cerveau).
import {PARTS,TISSUE,partAt,regionAt,distTo,BODY_KG,BODY_H,INELASTIC,VESSELS} from './body.js';

export const TILE_M=4;            // une case de carte : 4 m à l'échelle des Meumeu
export const CRATE_KG=.25;        // une caisse : ce qu'un Meumeu porte à deux mains
export const SHOOTER_KG=BODY_KG;
export const Q_POWDER=4.0e6,RHO_AIR=1.225,G=9.81,C_SOUND=340;
const G7=[[0,.120],[.8,.122],[.9,.146],[.95,.204],[1,.38],[1.05,.404],[1.1,.401],[1.2,.39],[1.4,.362],[1.6,.336],[1.8,.314],[2,.297],[2.5,.266],[3,.24],[4,.215]];
function cdG7(M){if(M<=0)return G7[0][1];for(let i=1;i<G7.length;i++)if(M<=G7[i][0]){const [a,ca]=G7[i-1],[b,cb]=G7[i];return ca+(cb-ca)*(M-a)/(b-a);}return G7[G7.length-1][1];}

// Le nez : sa longueur (en calibres), la part de volume qu'il garde, sa forme dans l'air (i), dans les tissus (cdT),
// et le « cou » : combien de longueurs de balle elle parcourt dans le corps avant de basculer.
export const NOSES={
  pointue:{name:'Pointue',len:2.3,vf:.45,i:1.08,cdT:.26,neck:6,desc:'file dans l’air ; dans le corps, elle bascule tôt'},
  ogive:{name:'Ogive ronde',len:1.4,vf:.6,i:1.45,cdT:.34,neck:12,desc:'un compromis'},
  ronde:{name:'Ronde',len:.8,vf:.72,i:1.9,cdT:.45,neck:36,desc:'freine dans l’air, reste droite dans le corps'},
  plate:{name:'Plate',len:.45,vf:.88,i:2.3,cdT:.85,neck:Infinity,desc:'coupe net, ne bascule jamais, perd vite sa vitesse'},
};
export const BASES={plat:{name:'Culot plat',i:1,vol:1,neck:1},bt:{name:'Culot en dépouille',i:.9,vol:.96,neck:.9}};
// La construction : densité (g/cm³), vitesse de fragmentation (m/s) et part qui se brise, expansion [vmin, vmax, facteur],
// perforation (constante de de Marre), dispersion en plus. `core` : un noyau dur ne se brise pas.
export const CONSTRUCTIONS={
  fmj:{name:'Blindée',rho:10.4,frag:900,fr:.35,K:5.5e-4,disp:.2,desc:'la balle de guerre : chemise de métal sur un noyau de plomb'},
  fmjm:{name:'Blindée à chemise mince',rho:10.5,frag:760,fr:.45,K:5e-4,disp:.25,desc:'se fragmente au-dessus de 760 m/s : terrible de près, ordinaire plus loin'},
  sp:{name:'Pointe molle',rho:10.8,expand:[430,820,1.55],frag:780,fr:.3,K:3.5e-4,disp:0,desc:'s’expanse : grosse blessure, perce mal'},
  hp:{name:'Pointe creuse',rho:10.2,expand:[280,650,1.75],frag:640,fr:.35,K:2.5e-4,disp:0,desc:'s’ouvre en corolle : arrête tout, ne perce rien'},
  ap:{name:'Perforante (noyau acier)',rho:8.9,frag:Infinity,fr:0,K:1.37e-3,core:1,disp:.4,desc:'traverse tôles et murs, et le corps sans y laisser grand-chose'},
  inc:{name:'Incendiaire',rho:9.6,frag:850,fr:.35,K:6.5e-4,inc:1,disp:.6,desc:'met le feu à ce qu’elle touche de dur : dépôts, réservoirs, maisons'},
  trc:{name:'Traçante',rho:9.7,frag:900,fr:.35,K:5e-4,tracer:1,disp:.8,desc:'on voit où elle va : le tireur corrige, l’ennemi voit d’où elle vient'},
  he:{name:'Explosive',rho:9.2,frag:0,fr:.9,K:4e-4,he:1,minD:3,disp:.5,desc:'éclate au contact (3 mm et plus) : des éclats autour du point d’impact'},
  sabot:{name:'Sous-calibre (sabot)',rho:17,frag:Infinity,fr:0,K:1.9e-3,core:1,sub:.5,disp:.7,ferx:2,desc:'un dard de métal lourd moitié moins large que le canon, lancé dans un sabot qui tombe à la bouche : très vite, perce tout, blessure fine'},
  tungstene:{name:'Noyau de tungstène',rho:16,frag:Infinity,fr:0,K:1.8e-3,core:1,disp:.4,ferx:3,desc:'le plus dense des métaux : lourde, perce les plaques ; trois fois plus de fer par caisse'},
  frangible:{name:'Frangible',rho:7.2,frag:220,fr:.9,K:1.2e-4,fragile:1,disp:.3,desc:'du métal fritté qui éclate au premier choc : terrible dans le corps, ne traverse ni un mur ni une plaque, ne ricoche pas'},
  api:{name:'Perforante-incendiaire',rho:9,frag:Infinity,fr:0,K:1.25e-3,core:1,inc:1,disp:.5,desc:'un noyau dur et une charge incendiaire : perce la tôle et met le feu derrière'},
  hei:{name:'Explosive-incendiaire',rho:8.8,frag:0,fr:.9,K:3.5e-4,he:1,inc:1,minD:3,disp:.6,desc:'éclate et enflamme (3 mm et plus) : contre les dépôts, les réservoirs, les trains'},
  chevrotine:{name:'Chevrotine (9 plombs)',rho:11.3,frag:Infinity,fr:0,K:3e-4,pellets:9,spread:28,fill:.5,disp:0,desc:'neuf plombs ronds par coup : de près, rien ne résiste à la gerbe ; à 30 m, elle s’est ouverte et ne touche plus'},
  plombnu:{name:'Plomb nu',rho:11.3,expand:[300,650,1.4],frag:Infinity,fr:0,K:2e-4,disp:.3,soft:1,desc:'la balle des vieux fusils, sans chemise : se déforme dans le corps, coûte peu ; au-delà de 550 m/s le plomb encrasse le canon'},
  monolithique:{name:'Monolithique (cuivre massif)',rho:8.9,expand:[480,900,1.5],frag:Infinity,fr:0,K:7e-4,mono:1,disp:.1,desc:'tout en cuivre : s’ouvre sans se briser, garde sa masse, perce mieux qu’une pointe molle ; plus longue à masse égale, et chère en cuivre'},
  apt:{name:'Perforante-traçante',rho:8.7,frag:Infinity,fr:0,K:1.3e-3,core:1,tracer:1,disp:.7,desc:'un noyau d’acier et une traçante au culot : on voit où l’on perce'},
  saphei:{name:'Semi-perforante explosive-incendiaire',rho:8.6,frag:0,fr:.85,K:9e-4,he:1,inc:1,delay:.012,minD:4,disp:.6,desc:'une coiffe dure perce d’abord, la charge éclate un peu plus loin, derrière la plaque ou dans le corps (4 mm et plus)'},
  duplex:{name:'Duplex (deux balles)',rho:10.6,frag:Infinity,fr:0,K:5e-4,pellets:2,spread:5,fill:.9,disp:.2,desc:'deux balles l’une derrière l’autre : deux trous par coup, la seconde un peu à côté ; chacune plus légère'},
  slug:{name:'Balle unique lourde (slug)',rho:11.3,expand:[260,600,1.3],frag:Infinity,fr:0,K:3e-4,disp:.6,soft:1,desc:'un gros cylindre de plomb : énorme choc de près, retombe vite, perce peu'},
  apfsds:{name:'Flèche sous-calibrée empennée',rho:17.5,frag:Infinity,fr:0,K:2.6e-3,core:1,sub:.32,minD:5,disp:.5,ferx:3,desc:'une longue flèche de métal lourd, trois fois plus fine que le canon, stabilisée par ses ailettes : la plus forte perforation par l’énergie (5 mm et plus)'},
  creuse:{name:'Charge creuse',rho:6.2,frag:0,fr:.5,K:0,he:1,shaped:5,minD:8,disp:.7,desc:'un cône de cuivre qu’une charge écrase en jet : perce cinq calibres d’acier quelle que soit la vitesse ; petit effet autour (8 mm et plus)'},
  flechette:{name:'Fléchettes (20 dards)',rho:7.85,frag:Infinity,fr:0,K:9e-4,core:1,pellets:20,dart:1,spread:16,fill:.45,disp:0,desc:'vingt dards d’acier empennés : ils ne basculent pas, percent un peu, font de petits trous — beaucoup'},
};
// La culasse : sa masse (kg par mm³ de cartouche, elle grandit avec la cartouche), sa cadence, ce qu'elle coûte.
export const ACTIONS={
  verrou:{name:'À verrou',k:3.2e-6,cycle:1.6,rpm:15,disp:0,cost:0,hours:0,desc:'précis, simple, lent'},
  semi:{name:'Semi-automatique',k:5e-6,cycle:.35,rpm:40,disp:.4,cost:.8,hours:1.5,desc:'un coup par pression'},
  levier:{name:'À levier',k:4e-6,cycle:.8,rpm:30,disp:.2,cost:.4,hours:.8,desc:'on réarme d’un mouvement de la main sous l’arme : deux fois plus vite qu’un verrou, un peu moins précis'},
  pompe:{name:'À pompe',k:4.5e-6,cycle:.7,rpm:35,disp:.3,cost:.5,hours:1,desc:'on réarme en tirant le garde-main : solide, simple, fait pour les gerbes de plombs'},
  auto:{name:'Automatique',k:7e-6,cycle:0,rpm:0,disp:1,cost:2,hours:3,auto:1,desc:'des rafales : suppression, mais munitions, recul, chaleur'},
  rotatif:{name:'Rotatif (plusieurs canons)',k:1.8e-5,cycle:0,rpm:0,disp:1.4,cost:5,hours:6,auto:1,multi:4,desc:'quatre canons qui tournent : une cadence énorme sans surchauffe, mais très lourd, un trépied et des servants'},
};
// Les modules : ce qu'ils pèsent (kg, selon le tube et l'arme), ce qu'ils changent. Chacun a son prix.
export const MODS={
  frein:{name:'Frein de bouche',desc:'des lumières qui renvoient les gaz en arrière : le recul baisse d’un tiers ; le souffle et l’éclair montent, les servants sont assourdis, la poussière trahit la pièce'},
  cacheflamme:{name:'Cache-flamme',desc:'des becs qui refroidissent le jet : l’éclair de bouche presque éteint — la nuit, on ne voit plus d’où l’on tire'},
  manchon:{name:'Manchon silencieux',desc:'des chicanes qui détendent les gaz : 25 dB de moins ; avec une balle subsonique, on n’entend presque rien ; plus lourd, plus long, il chauffe'},
  poignee:{name:'Poignée avant',desc:'une main de plus sur l’arme : épauler plus vite, rafales mieux tenues'},
  lunette:{name:'Lunette',desc:'des lentilles polies : on vise loin bien mieux ; de près, le champ étroit ralentit'},
  bipied:{name:'Bipied',desc:'deux pieds sous le canon : couché, l’arme ne tremble plus et le recul passe dans le sol'},
  trepied:{name:'Trépied',desc:'un affût à trois pieds : précision de pièce fixe, recul absorbé ; lourd, il faut le porter, le mettre en batterie'},
  bouclier:{name:'Bouclier',desc:'une plaque d’acier devant les servants : arrête les balles de face ; très lourd, affût obligatoire'},
};
export const MOUNTS={epaule:{name:'À l’épaule',rank:0},bipied:{name:'Sur bipied',rank:1},trepied:{name:'Sur trépied',rank:2},fixe:{name:'Pièce fixe',rank:3}};
export const ROLES=['tireur','chargeur','pourvoyeur','chef de pièce'];
export const HUMAN=6;             // un Meumeu (30 cm) contre un humain (1,80 m) : à l'échelle humaine, tout ×6
export const fmt=(v,n=0)=>(+v).toFixed(n).replace('.',',');

// ---------- ce qu'une conception donne ----------
// p : {d, l, nose, base, cons, c (poudre, g), L (canon, mm), twist (mm par tour), action, rof (coups/min), mag, heavy}
const cache=new Map();
export function derive(p){const key=JSON.stringify(p);let D=cache.get(key);if(D)return D;D=compute(p);cache.set(key,D);if(cache.size>500)cache.delete(cache.keys().next().value);return D;}
function compute(p){const N=NOSES[p.nose],B=BASES[p.base],C=CONSTRUCTIONS[p.cons],A=ACTIONS[p.action];const mods=new Set(p.mods||[]);const zero=p.zero||50;const hef=C.he?(p.hef??(C.shaped?.45:.3)):0,coreF=C.core||C.he?0:(p.core||0),jacket=p.jacket??1,wallx=p.wallx??(p.heavy?1.5:1);
  const d=p.d,A_mm2=Math.PI*d*d/4;const noseLen=N.len*d;const l=Math.max(p.l,noseLen+.3*d);
  // le projectile : une balle ; un dard sous-calibré (sabot) ; ou une gerbe de plombs, de fléchettes
  const sub=C.sub||1,dp=d*sub,Ap=Math.PI*dp*dp/4;const pel=C.pellets||1;
  let m,mp,dpr,lpr;if(pel>1){m=A_mm2*l*(C.fill||.5)*C.rho/1000;mp=m/pel;if(C.dart){dpr=d*.16;lpr=mp*1000/C.rho/(Math.PI*dpr*dpr/4);}else{dpr=Math.cbrt(6*mp*1000/C.rho/Math.PI);lpr=dpr;}}
  else{const vol=Ap*(l-noseLen*sub+noseLen*sub*N.vf)*B.vol;
    // la densité : l'explosif (1,6) prend la place du métal ; un noyau d'acier (7,85) remplace une part du plomb
    const rho=C.he?C.rho*(1-hef)+1.6*hef:C.core||C.mono||!coreF?C.rho:C.rho*(1-coreF)+7.85*coreF;m=vol*rho/1000;if(C.tracer)m*=.93;mp=m;dpr=dp;lpr=l;}
  const mLaunch=m*(sub<1?1.35:1)+(pel>1?m*.08:0);                           // le sabot, la bourre : poussés aussi, puis perdus
  const c=p.c;const L0=3200*c/A_mm2;const eta=.32*(1-Math.exp(-p.L/Math.max(.01,L0)));
  const v0=Math.sqrt(2*eta*Q_POWDER*c/1000/(mLaunch/1000+c/3000))*(mods.has('manchon')?1.02:1);const E0=.5*m/1000*v0*v0;
  // la pression de pointe (MPa) : elle monte avec la charge rapportée à la balle — 370 MPa pour un fusil ordinaire
  // (poudre ≈ 0,3 × la balle), 200 pour un pistolet, 700 et plus si l'on bourre l'étui
  const P=370*Math.pow(Math.max(.01,c/mLaunch)/.3,.35);
  // l'étui qu'il faut pour cette charge, la cartouche entière, ce qu'elle pèse
  const pistol=c/(A_mm2*d)<.002;const Dc=d*(pistol?1.25:1.45);const caseLen=(c/.85*1000)/(Math.PI*(Dc/2)**2*.8)+d;const caseMass=4.2*c+.0012*Dc**3;const COL=caseLen+l*.7;
  const rm=mLaunch+c+caseMass;const perCrate=Math.floor(CRATE_KG*1000/rm);
  // la stabilité (Miller) : m en grains, d en pouces, longueur et pas en calibres, v en pieds/s
  // la stabilité : une balle doit être tenue par la rayure ; un dard sous-calibré et une fléchette sont empennés, un plomb est rond
  const t_cal=p.twist/d,l_cal=l/d,d_in=d/25.4;const Sg=pel>1||sub<1?5:30*(m*15.432)/(t_cal*t_cal*d_in**3*l_cal*(1+l_cal*l_cal))*Math.cbrt(Math.max(1,v0*3.281)/2800);
  const stab=Sg<1?6:Sg<1.3?1.4:1;
  const SD=(mp/1000)/((dpr/1000)**2);const BC=SD/((pel>1&&!C.dart?2.6:C.dart?1.3:N.i)*B.i*(C.tracer?1.03:1));
  // l'arme : le tube (plus épais si la pression monte), la culasse, la crosse, le chargeur
  const wall=d*(.35+.00075*P)*wallx;const Dout=d+2*wall;const barrelKg=p.L*Math.PI*((Dout/2)**2-(d/2)**2)*7.85e-6;
  const actionKg=A.k*COL**3;const stockKg=((p.L+3*COL)/800)**3;const magKg=p.mag*rm/1000*1.25;const gun=stockKg+barrelKg+actionKg;
  const MK={frein:barrelKg*.06+.0008*d,cacheflamme:barrelKg*.04,manchon:barrelKg*.3+.002*d,poignee:.004+gun*.02,lunette:.008,bipied:.01+gun*.08,trepied:.05+gun*.45,bouclier:.02+d*.012};
  const modKg={};let modSum=0;for(const k of mods)if(MK[k]!=null){modKg[k]=MK[k];modSum+=MK[k];}
  const massEmpty=gun+modSum;const mass=massEmpty+magKg;
  const impulse=mLaunch/1000*v0+c/1000*1250;const recoil=impulse*impulse/(2*mass)*(mods.has('frein')?.62:1)*(mods.has('manchon')?.85:1);const rk0=recoil/SHOOTER_KG;
  // l'affût qu'il faut : l'épaule tient un recul modéré et une arme légère ; au-delà, bipied, puis trépied — ou une pièce fixe
  const need=A.multi||rk0>1.6||mass>SHOOTER_KG*.3||d>8.5?'trepied':rk0>.7||mass>SHOOTER_KG*.16||d>6?'bipied':'epaule';
  const have=mods.has('trepied')?'trepied':mods.has('bipied')?'bipied':'epaule';const mountOk=MOUNTS[have].rank>=MOUNTS[need].rank;
  const rk=rk0*(have==='trepied'?.25:have==='bipied'?.55:1);
  // les servants : l'arme, son affût et ce qu'il faut de munitions pour tenir (quatre chargeurs, ou 200 coups en bande)
  const supply=(ACTIONS[p.action].auto&&p.mag>=50?Math.max(200,p.mag*2):Math.max(4*p.mag,20))*rm/1000;const load=mass+supply;const perBearer=SHOOTER_KG*.22;
  let crew=Math.max(have==='trepied'?2:1,Math.ceil(mass/(perBearer*1.4)))+(supply>perBearer*.5?1:0);if(ACTIONS[p.action].auto&&p.mag>=50)crew=Math.max(crew,2);const fixed=crew>4;crew=Math.min(4,crew);
  const roles=ROLES.slice(0,crew);const setup=have==='trepied'?6+2*(crew-1):have==='bipied'?1.5:0;
  // la signature : l'éclair (d'autant plus qu'il reste de la poudre à brûler à la bouche), le bruit, le claquement supersonique
  const flash=Math.min(1,(1-eta/.32+.15)*Math.sqrt(c/.032)*.6)*(mods.has('cacheflamme')?.2:1)*(mods.has('frein')?1.3:1)*(mods.has('manchon')?.1:1);
  const dB=Math.round(150+10*Math.log10(Math.max(1e-4,c)/.032)-(mods.has('manchon')?25:0)+(mods.has('frein')?4:0));   // J par kg de tireur (un fusil humain : 0,23)
  const life=Math.max(50,Math.min(60000,Math.round(9000*(400/Math.max(P,50))**2*(850/Math.max(v0,100))**2.5*Math.max(.6,wallx)*(C.soft&&v0>550?.5:1))));
  // la chaleur : un petit tube se refroidit vite ; la cadence qu'il tient sans surchauffer
  const heatShot=c/1000*Q_POWDER*.2;const heatCap=barrelKg*460;const cool=.012*(7.62/d)*(wallx>1?.9:1)*(A.multi||1);const sustain=Math.round(60*cool*300*heatCap/Math.max(1e-6,heatShot));
  const rpm=ACTIONS[p.action].auto?p.rof:A.rpm;const cyc=ACTIONS[p.action].auto?60/p.rof:A.cycle;
  const aim=(.45+7*mass/SHOOTER_KG*(have==='epaule'?1:.35)+.3*(p.L/1000)/BODY_H)*(mods.has('poignee')?.85:1)*(mods.has('lunette')?1.1:1);
  let moa=1.6+(p.L/d<45?(45-p.L/d)/15:0)+A.disp+C.disp;moa*=wallx>=1?1/(1+(wallx-1)*.3):1+(1-wallx)*.9;moa*=stab;moa*=have==='trepied'?.55:have==='bipied'?.75:1;if(mods.has('poignee')&&ACTIONS[p.action].auto)moa*=.9;
  // le plomb nu encrasse le tube au-delà de 550 m/s
  const lead=C.soft&&v0>550;if(lead)moa+=(v0-550)/100;
  // la trajectoire, tous les mètres jusqu'à 600 m
  const table=[];{let x=0,v=v0,t=0,y=0,vy=0;const dt=.0002;let next=0;
    while(x<=600&&v>60){if(x>=next){table.push({x:next,v,t,drop:-y,E:.5*mp/1000*v*v});next+=1;}
      const a=.5*RHO_AIR*v*v*cdG7(v/C_SOUND)*(Math.PI/4)/BC;const vx=v;v=Math.max(0,v-a*dt);vy-=G*dt;x+=vx*dt;y+=vy*dt;t+=dt;}}
  const at=x=>{if(!table.length)return {x,v:0,t:0,drop:0,E:0,beyond:true};const i=Math.min(table.length-1,Math.max(0,Math.floor(x)));const a=table[i],b=table[Math.min(table.length-1,i+1)];const f=Math.max(0,Math.min(1,x-a.x));
    return {x,v:a.v+(b.v-a.v)*f,t:a.t+(b.t-a.t)*f,drop:a.drop+(b.drop-a.drop)*f,E:a.E+(b.E-a.E)*f,beyond:x>table[table.length-1].x};};
  // la hausse : on règle la visée pour toucher juste à `zero` m ; la ligne de visée est 1,2 cm au-dessus de l'axe du canon
  const hs=.012+(mods.has('lunette')?.006:0);const th=(at(zero).drop+hs)/Math.max(1,zero);const los=x=>th*x-at(x).drop-hs;
  // la charge explosive : sa masse, le souffle (Hopkinson), les éclats (la chemise brisée en éclats de 4 mg)
  let he=null;if(C.he){const rho=C.rho*(1-hef)+1.6*hef;const vol=m/rho;const g=vol*hef*1.6;const W=g/1000;const casing=Math.max(0,m-g);
    // les éclats : la coque (ce qui n'est pas de l'explosif) brisée en morceaux de 4 mg, lancés à la vitesse de Gurney
    const n=C.shaped?Math.round(casing*.2/.004):Math.max(4,Math.min(600,Math.round(casing*.8/.004)));const vg=2400*Math.sqrt((g/Math.max(1e-6,casing))/(1+g/Math.max(1e-6,casing)/2));
    const reach=Math.min(1,vg/1400);he={g,casing,vg,blast:2.2*Math.cbrt(W),n,lethal:Math.sqrt(n*.014/(4*Math.PI*.5))*reach,danger:Math.sqrt(n*.014/(4*Math.PI*.5))*3*reach,shaped:!!C.shaped};}
  // la perforation d'une plaque d'acier (mm), de Marre
  const pen=v=>C.shaped?C.shaped*d:C.K*(1+coreF*1.6)*Math.pow(mp,.7)*Math.pow(Math.max(0,v),1.43)/Math.pow(dpr,1.07)*(C.core?1:Math.max(0,Math.min(1,(v-150)/350)));
  // la portée utile : là où un tireur moyen touche encore un Meumeu debout (7 cm × 20 cm) une fois sur trois
  const erf=z=>{const t=1/(1+.3275911*Math.abs(z));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);return z>=0?y:-y;};
  const sigAt=R=>{const r2=at(R+1),r=at(R);const slope=Math.abs(r2.drop-r.drop);return Math.hypot(moa*.291*R/1000,(mods.has('lunette')?.7:1.8)*(have==='trepied'?.45:have==='bipied'?.65:1)*R/1000*(mods.has('lunette')&&R<15?1.6:1),slope*.12*R,.004);};
  const hitP=R=>{const sig=sigAt(R);const pHit=erf(.035/(sig*Math.SQRT2))*erf(.1/(sig*Math.SQRT2));if(pel<2)return pHit;
    const cone=(C.spread||20)/1000*R/2;const cover=Math.min(1,(.07*.2)/(Math.PI*cone*cone+1e-9));return Math.min(1,1-Math.pow(1-Math.max(pHit*.6,cover),Math.max(1,pel*.6)));};
  let eff=0;for(let R=2;R<=600;R+=2){if(hitP(R)<.33||at(R).beyond)break;eff=R;}
  // ce que ça coûte (en caisses) : pour mille coups, pour une arme
  // plomb : le noyau ; cuivre : la chemise et l'étui ; fer : le noyau dur des perforantes ; poudre : la charge (et la charge explosive)
  const core=m*(C.rare?.45:1)*(C.ferx||1);const costK={plomb:C.mono?0:core*(C.ferx>1?.3:C.soft?1:.8)/CRATE_KG,fer:(C.ferx>1?core*.7:coreF*m*.6)/CRATE_KG,cuivre:(core*(C.mono?1:C.soft?0:.2)+caseMass+(C.shaped?m*.3:0))/CRATE_KG,poudre:c/(CRATE_KG*500)*1000+(C.inc?m*.1/CRATE_KG:0)+(C.he?m*.3/CRATE_KG:0)+(C.tracer?.05:0),pieces:.15+(C.tracer?.08:0)+(C.he?.2:0)};
  if(C.rare)costK[C.rare]=m*.55/CRATE_KG;for(const k in costK)costK[k]=+costK[k].toFixed(3);
  const costW={fer:+(massEmpty*1.6/CRATE_KG).toFixed(2),pieces:+(1+A.cost+(p.L>220?1:0)+(wallx>1.3?.5:0)+mods.size*.4+(mods.has('trepied')?1:0)).toFixed(2),bois:.15,...(mods.has('lunette')?{cuivre:.3}:{})};const hoursW=3+A.hours+(p.L>220?2:0)+mods.size*.5;
  const carry=Math.floor(.13*SHOOTER_KG*1000/rm);
  // ce qui entre dans le corps : pour une gerbe, un plomb (ou une fléchette) ; pour un sabot, le dard
  const proj={p:{...p,d:dpr,l:lpr,nose:pel>1&&!C.dart?'ronde':p.nose},m:mp,l:lpr,Sg:Math.max(Sg,pel>1||sub<1?5:Sg),dart:!!C.dart};
  const D={p:{...p,l},m,mp,pel,proj,l,noseLen,v0,E0,P,eta,Sg,stab,BC,SD,A_mm2,caseLen,COL,caseMass,rm,perCrate,mass,massEmpty,recoil,rk,life,heatShot,sustain,rpm,cyc,aim,moa,table,at,pen,eff,hitP,costK,costW,hoursW,carry,pistol,sigAt,hef,core:coreF,jacket,wallx,tracer:!!C.tracer,mods:[...mods],modKg,need,have,mountOk,rk0,crew,fixed,roles,setup,supply,flash,dB,crack:v0>C_SOUND,zero,hs,los,th,he,lead,human:HUMAN,name:`${fmt(d,1)} × ${fmt(caseLen,caseLen<10?1:0)}`};
  D.verdicts=verdicts(D,p,C);return D;}
// Ce qu'on en dit, en clair : ses forces, ses défauts — chaque avantage a son prix.
function verdicts(D,p,C){const out=[];const g=t=>out.push({tone:'good',t}),b=t=>out.push({tone:'bad',t}),n=t=>out.push({tone:'',t});
  if(D.Sg<1)b(`Instable en vol (Sg ${fmt(D.Sg,2)}) : la balle bascule, précision catastrophique — raccourcir le pas de rayure`);else if(D.Sg<1.3)b(`Stabilité juste (Sg ${fmt(D.Sg,2)}) : dispersion accrue`);
  if(D.P>620)b(`Pression hors limites (${Math.round(D.P)} MPa) : le tube peut éclater et blesser le tireur`);else if(D.P>460)b(`Pression élevée (${Math.round(D.P)} MPa) : canon usé en ${D.life} coups`);
  if(D.rk>.7)b(`Recul intenable (${fmt(D.recoil,2)} J pour un tireur de ${fmt(SHOOTER_KG,1)} kg) : il faut un affût`);else if(D.rk>.35)b(`Recul violent (${fmt(D.recoil,2)} J) : tir lent, rafales dispersées`);else if(D.rk<.1)g(`Recul doux (${fmt(D.recoil,2)} J)`);
  if(D.mass>SHOOTER_KG*.08)b(`Arme lourde (${Math.round(D.mass*1000)} g chargée) : le soldat marche moins vite, vise plus lentement`);
  if(D.eff>=90)g(`Portée utile ${D.eff} m`);else if(D.eff<35)b(`Portée utile ${D.eff} m seulement`);else n(`Portée utile ${D.eff} m`);
  const p30=D.pen(D.at(30).v);if(p30>=2)g(`Perce ${fmt(p30,1)} mm d’acier à 30 m : murs, tôles, casques`);else if(p30<.6)b(`Perce ${fmt(p30,2)} mm d’acier à 30 m : un mur de brique l’arrête`);else n(`Perce ${fmt(p30,1)} mm d’acier à 30 m`);
  if(C.frag<Infinity&&D.v0>C.frag){let r=0;for(let x=0;x<=600;x+=2){if(D.at(x).v>C.frag)r=x;}g(`Se fragmente dans le corps jusqu’à ${r} m`);}
  if(D.carry<120)b(`Munition lourde (${fmt(D.rm,2)} g le coup) : un soldat n’en porte que ${D.carry}, une caisse ${D.perCrate}`);else if(D.carry>450)g(`Munition légère : ${D.carry} coups par soldat, ${D.perCrate} par caisse`);
  if(ACTIONS[p.action].auto&&D.sustain<p.rof)b(`Surchauffe : tient ${D.sustain} coups/min en continu (cadence ${p.rof})`);
  if(C.inc)n('Incendiaire : les dépôts qui la stockent brûlent s’ils sont touchés');
  if(C.tracer)g('Traçante : en rafale, le tireur voit où vont ses balles et corrige — dispersion −30 % dès la 2e balle ; mais l’ennemi voit d’où elles viennent');
  if(D.he)n(`Charge explosive de ${D.he.g<1?Math.round(D.he.g*1000)+' mg':D.he.g.toFixed(2)+' g'} : souffle mortel à ${Math.round(D.he.blast*100)} cm${D.he.shaped?'':`, ${D.he.n} éclats à ${Math.round(D.he.vg)} m/s, mortels à ${Math.round(D.he.lethal*100)} cm`}`);
  if(D.pel>1)n(`${D.pel} ${C.dart?'fléchettes':'plombs'} de ${fmt(D.mp*1000,0)} mg par coup : la gerbe s’ouvre de ${C.spread} cm tous les 10 m`);
  if(C.sub)g(`Dard de ${fmt(D.proj.p.d,1)} mm lancé à ${Math.round(D.v0)} m/s : la perforation d’une arme bien plus grosse`);
  if(D.v0<340)n('Subsonique : pas de claquement dans l’air — on l’entend à peine');
  return out;}

// ---------- la balle dans la matière ----------
const add=(a,b,k=1)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k];
const norm=a=>{const n=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/n,a[1]/n,a[2]/n];};
function cone(dir,ang,rnd){const up=Math.abs(dir[1])<.9?[0,1,0]:[1,0,0];const u=norm([dir[1]*up[2]-dir[2]*up[1],dir[2]*up[0]-dir[0]*up[2],dir[0]*up[1]-dir[1]*up[0]]);const w=[dir[1]*u[2]-dir[2]*u[1],dir[2]*u[0]-dir[0]*u[2],dir[0]*u[1]-dir[1]*u[0]];
  const a=rnd()*Math.PI*2,t=Math.tan(ang*Math.sqrt(rnd()));return norm(add(add(dir,u,Math.cos(a)*t),w,Math.sin(a)*t));}
// Un projectile (balle, fragment, éclat d'os) avance pas à pas. `medium(p)` : ce qu'il y a au point, ou null (l'air).
// Le pas est un dixième du calibre (au moins 0,2 mm) : une balle de 1,8 mm avance de 0,2 mm à la fois.
function track(pr,medium,R,rnd){const ds=Math.max(.0002,pr.d0/10000);let inside=false,outFor=0,sIn=0;const pts=[];let vIn=pr.v;const recEvery=Math.max(1,Math.round(.002/ds));
  const C=pr.D?CONSTRUCTIONS[pr.D.p.cons]:null;const maxSteps=Math.ceil(1.5/ds);
  for(let step=0;step<maxSteps;step++){const med=medium(pr.p);
    if(!med){if(inside){outFor+=ds;if(outFor>pr.d0/1000*3+.004){pr.exit=pr.p.slice();break;}}pr.p=add(pr.p,pr.dir,ds);continue;}
    if(!inside){inside=true;vIn=pr.v;if(pr.main&&!R.entry){R.entry=pr.p.slice();R.vIn=pr.v;}}outFor=0;
    const T=TISSUE[med.kind]||TISSUE.muscle;const m=pr.m/1000;
    let dEff=pr.d,cd=pr.cd;
    const jk=Math.sqrt(pr.D?.p?.jacket||1);
    if(pr.main&&C){if(C.expand&&!pr.expanded&&vIn>=C.expand[0]*jk){const f=Math.max(.2,Math.min(1,(vIn-C.expand[0])/(C.expand[1]-C.expand[0])));const L=pr.d0/1000*3;pr.dExp=pr.d0*(1+(C.expand[2]-1)*f*Math.min(1,sIn/L));dEff=pr.dExp;cd=.95;if(sIn>=L){pr.expanded=true;R.expanded=true;}}
      else if(pr.expanded){dEff=pr.dExp;cd=.95;}
      else if(isFinite(pr.neck)&&sIn>pr.neck){const k=(sIn-pr.neck)/(pr.l/1000);pr.yaw=Math.min(Math.PI,k<1.2?k/1.2*Math.PI/2:Math.PI/2+(k-1.2)/2*Math.PI/2);}}
    const sy=Math.abs(Math.sin(pr.yaw)),cy=Math.abs(Math.cos(pr.yaw));
    const area=(Math.PI*(dEff/2)**2*cy+dEff*pr.l*sy)*1e-6;if(pr.yaw>0&&!pr.expanded)cd=pr.yaw<=Math.PI/2?cd+(1.2-cd)*sy:.55+.65*sy;
    // freinage : la traînée du tissu, et sa résistance (qui finit par arrêter une balle lente)
    const v0=pr.v;const drag=T.rho*1000*cd*area*ds*T.k/(2*m);let v=v0*Math.exp(-drag);const resist=(med.kind==='bone'?2.5e7:2e6)*area*ds;
    const E=.5*m*v*v-resist;v=E>0?Math.sqrt(2*E/m):0;const dE=.5*m*(v0*v0-v*v);pr.v=v;
    // ce qui est écrasé ; les vaisseaux coupés ; les os cassés
    const part=med.part;const key=part?part.id:med.region?.id||'?';const rec=R.dmg[key]??={crush:0,stretch:0,cut:0,frac:0,E:0,at:pr.p.slice()};rec.crush+=area*ds*1e6;rec.E+=dE;
    if(part&&part.kind==='heart')rec.cut=Math.max(rec.cut,Math.min(1,.3+(dEff/1000)/(2*part.shape.r[0])));
    for(const q of VESSELS){const dd=distTo(q,pr.p);if(dd<dEff/2000){const rv=R.dmg[q.id]??={crush:0,stretch:0,cut:0,frac:0,E:0,at:pr.p.slice()};rv.cut=Math.max(rv.cut,Math.min(1,.3+(dEff/1000)/(2*q.shape.r)*(1-dd/(dEff/2000))));}}
    if(part&&part.kind==='bone'&&dE>.004*R.E0&&pr.v>120&&!pr.bones?.has(part.id)){(pr.bones??=new Set()).add(part.id);rec.frac=1;
      if(pr.main){// l'os casse, dévie la balle, et projette ses propres éclats
        pr.dir=cone(pr.dir,(C?.core?.03:.1)*(pr.v<500?1.6:1),rnd);const n=2+Math.floor(rnd()*4);const mb=pr.m*.03;for(let k=0;k<n;k++)R.spawn.push({p:pr.p.slice(),dir:cone(pr.dir,.8,rnd),v:pr.v*.35,m:mb,d:pr.d0*.5,d0:pr.d0*.5,l:pr.d0*.5,cd:1,yaw:0,neck:Infinity,bone:1});}}
    // la cavité temporaire : l'énergie cédée par centimètre étire autour du trajet
    const eCm=dE/(ds*100);const rtc=.0055*Math.sqrt(Math.max(0,eCm));
    if(rtc>dEff/1000){for(const q of INELASTIC){const dd=distTo(q,pr.p);if(dd<rtc){const r2=R.dmg[q.id]??={crush:0,stretch:0,cut:0,frac:0,E:0,at:pr.p.slice()};r2.stretch+=(1-dd/rtc)*ds/q.size*(q.kind==='heart'?.5:1);}}
      if(pr.main&&step%recEvery===0)R.tc.push({p:pr.p.slice(),r:rtc});}
    R.E+=dE;if(med.region)R.regions.add(med.region.id);
    // la fragmentation : une balle qui bascule (ou s'expanse) trop vite se brise
    if(pr.main&&C&&!pr.fragmented&&C.frag<Infinity&&pr.v>=C.frag*jk&&(pr.yaw>.9||pr.expanded||C.he||(C.fragile&&(med.kind==='bone'||sIn>pr.d0/1000*4)))){pr.fragmented=true;R.fragmented=true;R.fragAt=pr.p.slice();const mf=pr.m*C.fr;pr.m-=mf;const n=C.he?24:7+Math.floor(rnd()*11);
      for(let k=0;k<n;k++){const mk=mf/n*(.3+rnd()*1.4);const df=pr.d0*1.3*Math.cbrt(mk/(pr.m+mf));R.spawn.push({p:pr.p.slice(),dir:cone(pr.dir,C.he?1.2:.5,rnd),v:pr.v*(.75+rnd()*.25),m:mk,d:df,d0:df,l:df,cd:.95,yaw:0,neck:Infinity,frag:1});}
      if(C.he)R.he=true;}
    pr.p=add(pr.p,pr.dir,ds);sIn+=ds;
    if(step%recEvery===0)pts.push({p:pr.p.slice(),v:pr.v,yaw:pr.yaw,d:dEff});
    if(pr.v<25){pr.lodged=true;break;}}
  pts.push({p:pr.p.slice(),v:pr.v,yaw:pr.yaw,d:pr.d});R.maxYaw=Math.max(R.maxYaw||0,pr.yaw);return pts;}
function neckOf(D,yaw0=0){const N=NOSES[D.p.nose],C=CONSTRUCTIONS[D.p.cons],B=BASES[D.p.base]||BASES.plat;if(C?.dart||D.dart||C?.sub)return Infinity;return N.neck*(D.l/1000)*(C.core?1.5:1)*B.neck*(D.Sg<1?.15:D.Sg>3?1+Math.min(.6,(D.Sg-3)*.15):1)*(yaw0>.3?.2:1);}
// Une balle qui entre dans un corps : `start` et `dir` dans le repère du corps (voir body.js), en mètres.
export function wound(D,v,start,dir,rnd,yaw0=0){const R={dmg:{},tc:[],spawn:[],E:0,E0:.5*D.m/1000*v*v,regions:new Set(),entry:null,exit:null,vIn:v,vOut:0,fragmented:false,expanded:false,frags:[]};
  const bullet={p:start.slice(),dir:norm(dir),v,m:D.m,d:D.p.d,d0:D.p.d,l:D.l,cd:NOSES[D.p.nose].cdT,yaw:yaw0,neck:neckOf(D,yaw0),main:1,D};
  const medium=p=>{const reg=regionAt(p);if(!reg)return null;const part=partAt(p);return {kind:part?part.kind:'muscle',part,region:reg};};
  R.path=track(bullet,medium,R,rnd);R.exit=bullet.exit||null;R.vOut=bullet.exit?bullet.v:0;R.lodged=!!bullet.lodged;
  for(let k=0;k<R.spawn.length&&k<40;k++){const f=R.spawn[k];R.frags.push({pts:track(f,medium,R,rnd),bone:!!f.bone});}
  R.spawn=null;return R;}
// Le banc d'essai : un bloc de gélatine à 10 % (comme le tissu). `len` : sa longueur en mètres (16 cm à l'échelle d'un Meumeu).
export function gel(D0,v,rnd=Math.random,len=.16){const D=D0.proj||D0;const R={dmg:{},tc:[],spawn:[],E:0,E0:.5*D.m/1000*v*v,regions:new Set(),frags:[]};
  const bullet={p:[0,0,-.0005],dir:[0,0,1],v,m:D.m,d:D.p.d,d0:D.p.d,l:D.l,cd:NOSES[D.p.nose].cdT,yaw:0,neck:neckOf(D),main:1,D};const half=len*.25;
  const medium=p=>p[2]>=0&&p[2]<=len&&Math.abs(p[0])<half&&Math.abs(p[1])<half?{kind:'muscle',part:null,region:null}:null;
  R.path=track(bullet,medium,R,rnd);for(let k=0;k<R.spawn.length&&k<40;k++)R.frags.push({pts:track(R.spawn[k],medium,R,rnd)});
  const last=R.path[R.path.length-1];const depth=Math.min(len,last?Math.max(0,last.p[2]):0);let yawAt=null,maxTc=0,tcAt=0;
  for(const q of R.path)if(yawAt==null&&q.yaw>.35&&q.p[2]>=0)yawAt=q.p[2];for(const t of R.tc)if(t.r>maxTc){maxTc=t.r;tcAt=t.p[2];}
  return {R,len,depth,exit:!!bullet.exit,yawAt,fragAt:R.fragAt?R.fragAt[2]:null,maxTc,tcAt,fragmented:R.fragmented,expanded:R.expanded,E:R.E,vOut:bullet.exit?bullet.v:0,neck:neckOf(D)};}
