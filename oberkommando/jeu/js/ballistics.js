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
import {PARTS,TISSUE,partAt,regionAt,distTo,shapeNear,BODY_KG,BODY_H,INELASTIC,VESSELS} from './body.js';
import {charge,arcTable,FILLS,SHELLS,FUSES} from './explosive.js';
import {MATS} from './armor.js';

export const TILE_M=4;            // une case de carte : 4 m à l'échelle des Meumeu
export const CRATE_KG=.25;        // une caisse : ce qu'un Meumeu porte à deux mains
export const SHOOTER_KG=BODY_KG;
export const Q_POWDER=4.0e6,RHO_AIR=1.225,G=9.81,C_SOUND=340;
const G7=[[0,.120],[.8,.122],[.9,.146],[.95,.204],[1,.38],[1.05,.404],[1.1,.401],[1.2,.39],[1.4,.362],[1.6,.336],[1.8,.314],[2,.297],[2.5,.266],[3,.24],[4,.215]];
export function cdG7(M){if(M<=0)return G7[0][1];for(let i=1;i<G7.length;i++)if(M<=G7[i][0]){const [a,ca]=G7[i-1],[b,cb]=G7[i];return ca+(cb-ca)*(M-a)/(b-a);}return G7[G7.length-1][1];}

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
const CONS0={
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
  // (V12.8) la charge creuse des Bèè, faite dans l'urgence : un cône d'acier embouti, mal centré — elle ne perce qu'un calibre et demi d'acier
  creuse_bee:{name:'Charge creuse rustique',rho:6.2,frag:0,fr:.5,K:0,he:1,shaped:1.6,minD:8,disp:.9,desc:'un cône d’acier embouti, mal centré : le jet perce un calibre et demi d’acier quelle que soit la vitesse ; il faut s’approcher (8 mm et plus)'},
  creuse:{name:'Charge creuse',rho:6.2,frag:0,fr:.5,K:0,he:1,shaped:5,minD:8,disp:.7,desc:'un cône de cuivre qu’une charge écrase en jet : perce cinq calibres d’acier quelle que soit la vitesse ; petit effet autour (8 mm et plus)'},
  flechette:{name:'Fléchettes (20 dards)',rho:7.85,frag:Infinity,fr:0,K:9e-4,core:1,pellets:20,dart:1,spread:16,fill:.45,disp:0,desc:'vingt dards d’acier empennés : ils ne basculent pas, percent un peu, font de petits trous — beaucoup'},
};
// ---------- la construction sur mesure ----------
// Une balle construite pièce par pièce : la chemise (son épaisseur), le noyau (sa matière), la pointe, des charges (traçante,
// incendiaire, explosive, cumulables), le nombre de projectiles par coup et l'ouverture de la gerbe. Sa clé la décrit tout
// entière (« cx:mince.acier.dure.1.0.0.1.6 ») : le catalogue calcule ses propriétés à la demande, partout dans le jeu, et une
// sauvegarde la garde telle quelle.
export const CX={
  j:{nue:{name:'aucune (plomb nu)',f:0},mince:{name:'mince',f:.12},normale:{name:'normale',f:.2},epaisse:{name:'épaisse',f:.3}},
  c:{plomb:{name:'plomb',rho:11.3,K:4.5e-4},acier:{name:'acier',rho:7.85,K:1.3e-3,hard:1},tungstene:{name:'tungstène',rho:17,K:1.8e-3,hard:1,ferx:3},
    cuivre:{name:'cuivre massif',rho:8.9,K:7e-4,mono:1},fritte:{name:'métal fritté',rho:7.2,K:1.2e-4,fragile:1}},
  t:{ogive:{name:'fermée',K:1},molle:{name:'molle',K:.7,expand:[430,820,1.55]},creuse:{name:'creuse',K:.5,expand:[280,650,1.75]},dure:{name:'coiffe dure',K:1.15},dard:{name:'dard empenné',K:1.25,dart:1}}};
export const CX0={cxj:'normale',cxc:'plomb',cxt:'ogive',cxtr:0,cxinc:0,cxhe:0,cxn:1,cxs:6};
export const cxKey=p=>'cx:'+[p.cxj??CX0.cxj,p.cxc??CX0.cxc,p.cxt??CX0.cxt,p.cxtr?1:0,p.cxinc?1:0,p.cxhe?1:0,Math.round(p.cxn??1),Math.round(p.cxs??6)].join('.');
export function cxParse(k){const [j,c,t,tr,inc,he,n,s]=String(k).slice(3).split('.');
  return {cxj:CX.j[j]?j:'normale',cxc:CX.c[c]?c:'plomb',cxt:CX.t[t]?t:'ogive',cxtr:+tr?1:0,cxinc:+inc?1:0,cxhe:+he?1:0,cxn:Math.max(1,Math.min(30,Math.round(+n)||1)),cxs:Math.max(1,Math.min(60,Math.round(+s)||6))};}
function cxBuild(k){const o=cxParse(k);const J=CX.j[o.cxj],Co=CX.c[o.cxc],T=CX.t[o.cxt];const jf=Co.mono||Co.fragile?0:J.f;
  const K=Co.K*T.K*(o.cxj==='nue'&&!Co.hard?.8:o.cxj==='mince'?.95:o.cxj==='epaisse'?1.05:1);
  const C={rho:+(Co.rho*(1-jf)+8.9*jf).toFixed(2),K:+K.toPrecision(3),disp:+(.15+(o.cxtr?.6:0)+(o.cxinc?.4:0)+(o.cxhe?.3:0)+(o.cxj==='nue'?.15:0)).toFixed(2),custom:1};
  // la tenue dans le corps : un noyau dur ne se brise pas ; le fritté éclate au premier choc ; le cuivre massif s'ouvre sans se
  // briser ; le plomb nu se déforme ; sinon la chemise décide (mince : se fragmente dès 760 m/s ; épaisse : tient jusqu'à 1 100)
  if(Co.hard){C.core=1;C.frag=Infinity;C.fr=0;}else if(Co.fragile){C.fragile=1;C.frag=220;C.fr=.9;}else if(Co.mono){C.mono=1;C.frag=Infinity;C.fr=0;}
  else if(o.cxj==='nue'){C.soft=1;C.frag=Infinity;C.fr=0;}else{C.frag={mince:760,normale:900,epaisse:1100}[o.cxj];C.fr={mince:.45,normale:.35,epaisse:.25}[o.cxj];}
  if(T.expand&&!Co.hard&&!Co.fragile)C.expand=Co.mono?[480,900,1.5]:T.expand;else if(o.cxj==='nue'&&o.cxc==='plomb')C.expand=[300,650,1.4];
  if(T.dart){C.dart=1;if(!C.core){C.core=1;C.frag=Infinity;C.fr=0;}}
  if(o.cxtr)C.tracer=1;if(o.cxinc)C.inc=1;if(o.cxhe){C.he=1;C.frag=0;C.fr=.9;C.minD=3;}
  if(Co.ferx)C.ferx=Co.ferx;if(o.cxn>1){C.pellets=o.cxn;C.spread=o.cxs;C.fill=o.cxn>=6?.5:.9;}
  const bits=[`chemise ${J.name}`,`noyau ${Co.name}`,`pointe ${T.name}`];if(o.cxtr)bits.push('traçante');if(o.cxinc)bits.push('incendiaire');if(o.cxhe)bits.push('explosive');if(o.cxn>1)bits.push(`${o.cxn} projectiles, gerbe de ${o.cxs} mrad`);
  C.name='Sur mesure · '+bits.slice(1).join(', ');C.desc='construite pièce par pièce : '+bits.join(', ');return C;}
export const CONSTRUCTIONS=new Proxy(CONS0,{get(t,k){if(typeof k==='string'&&k.startsWith('cx:')&&!(k in t))t[k]=cxBuild(k);return t[k];}});

// La culasse : sa masse (kg par mm³ de cartouche, elle grandit avec la cartouche), sa cadence, ce qu'elle coûte.
export const ACTIONS={
  verrou:{name:'À verrou',k:3.2e-6,cycle:1.6,rpm:15,disp:0,cost:0,hours:0,desc:'précis, simple, lent'},
  bascule:{name:'À bascule',k:2.4e-6,cycle:1.15,rpm:22,disp:.05,cost:-.2,hours:-.4,break:1,desc:'le canon pivote pour charger : extrêmement simple, idéal pour un fusil de chasse ou un énorme coup unique'},
  semi:{name:'Semi-automatique',k:5e-6,cycle:.35,rpm:40,disp:.4,cost:.8,hours:1.5,desc:'un coup par pression'},
  levier:{name:'À levier',k:4e-6,cycle:.8,rpm:30,disp:.2,cost:.4,hours:.8,desc:'on réarme d’un mouvement de la main sous l’arme : deux fois plus vite qu’un verrou, un peu moins précis'},
  pompe:{name:'À pompe',k:4.5e-6,cycle:.7,rpm:35,disp:.3,cost:.5,hours:1,desc:'on réarme en tirant le garde-main : solide, simple, fait pour les gerbes de plombs'},
  auto:{name:'Automatique',k:7e-6,cycle:0,rpm:0,disp:1,cost:2,hours:3,auto:1,desc:'des rafales : suppression, mais munitions, recul, chaleur'},
  gaz:{name:'Emprunt de gaz',k:8e-6,cycle:0,rpm:0,disp:.72,cost:2.6,hours:3.5,auto:1,gas:1,desc:'un piston au-dessus du canon : automatique plus doux et précis, mais plus long et plus complexe'},
  recul:{name:'Long recul',k:1.05e-5,cycle:0,rpm:0,disp:.85,cost:3.1,hours:4,auto:1,recoil:1,desc:'canon et culasse reculent ensemble : accepte de très grosses cartouches, lourd et lent à remettre en batterie'},
  bouche:{name:'Mortier (par la bouche)',k:1.2e-6,cycle:2.2,rpm:22,disp:.6,cost:-.4,hours:-1,mortar:1,desc:'un tube lisse posé sur une plaque : on laisse glisser l’obus par la bouche, il part tout seul. Léger, simple, le recul va au sol — mais il ne tire qu’en cloche (tir sur zone), un coup à la fois ; l’obus tient par ses ailettes'},
  culasse:{name:'Obusier à culasse',k:7e-6,cycle:1.5,rpm:12,disp:.35,cost:3,hours:4,mortar:1,howitzer:1,desc:'une pièce rayée chargée par l’arrière : tir indirect précis, charges réglables, affût lourd et plusieurs servants'},
  rotatif:{name:'Rotatif',k:1.8e-5,cycle:0,rpm:0,disp:1.4,cost:5,hours:6,auto:1,multi:4,desc:'de deux à huit canons qui tournent : cadence énorme sans surchauffe, mais très lourd, un affût et des servants'},
};
// Les modules : ce qu'ils pèsent (kg, selon le tube et l'arme), ce qu'ils changent. Chacun a son prix.
export const PROPS={cartouche:{name:'Cartouche',desc:'la poudre brûle dans l’étui, derrière la balle : tout se joue dans le canon'},fusee:{name:'Auto-propulsée (fusée)',desc:'la poudre est dans la balle : elle sort lentement, puis accélère seule ; pas de recul, un tube léger, un souffle arrière — et de la dispersion'}};
export const MODS={
  infrarouge:{name:'Visée infrarouge',desc:'un projecteur infrarouge sur l’arme, une lunette qui voit sa lumière, une batterie dans le dos : la nuit, on voit très loin dans le faisceau, plus loin qu’en plein jour avec un bon réglage. La batterie tient plusieurs nuits et se recharge au dépôt (réglages ci-dessous)'},
  frein:{name:'Frein de bouche',desc:'des lumières qui renvoient les gaz en arrière : le recul baisse d’un tiers ; le souffle et l’éclair montent, les servants sont assourdis, la poussière trahit la pièce'},
  cacheflamme:{name:'Cache-flamme',desc:'des becs qui refroidissent le jet : l’éclair de bouche presque éteint — la nuit, on ne voit plus d’où l’on tire'},
  manchon:{name:'Silencieux',desc:'un volume où les gaz se détendent : son effet dépend de son volume rapporté à la charge de poudre et de son architecture (réglages ci-dessous) ; il n’efface ni le claquement d’une balle supersonique ni le bruit de la culasse'},
  poignee:{name:'Poignée avant',desc:'une main de plus sur l’arme : épauler plus vite, rafales mieux tenues'},
  lunette:{name:'Lunette',desc:'des lentilles polies : on vise loin bien mieux ; de près, le champ étroit ralentit'},
  roues:{name:'Affût à roues',desc:'deux roues, une flèche : la pièce se pousse au lieu de se porter et se met en batterie plus vite qu’un trépied ; lourde et chère, elle prend la place du trépied ou du bipied'},
  bipied:{name:'Bipied',desc:'deux pieds sous le canon : couché, l’arme ne tremble plus et le recul passe dans le sol'},
  trepied:{name:'Trépied',desc:'un affût à trois pieds : précision de pièce fixe, recul absorbé ; lourd, il faut le porter, le mettre en batterie'},
  bouclier:{name:'Bouclier',desc:'une plaque d’acier devant les servants : arrête les balles de face ; très lourd, affût obligatoire'},
  reflex:{name:'Viseur à lichen',desc:'un point de lichen luminescent sous une lentille : on vise les deux yeux ouverts, bien plus vite de près ; sans grossissement'},
  cannelures:{name:'Tube cannelé',desc:'des gorges usinées le long du tube : un cinquième de son poids en moins, il refroidit mieux ; un peu moins raide'},
  baionnette:{name:'Baïonnette',desc:'une lame sous la bouche : à l’assaut, le dernier mètre se gagne sans tirer ; un peu de poids à l’avant'},
  ailettes:{name:'Radiateur à ailettes',desc:'des ailettes de cuivre autour du tube : il tient bien plus longtemps en rafale ; lourd et encombrant'},
};
// Les attaches : où chaque module se fixe sur l'arme. Certaines ne portent qu'une pièce (« one ») : le dessin n'en montre qu'une,
// donc la balistique n'en compte qu'une, la même — la première de la liste, qui est celle que le dessin choisit. Les autres attaches
// sont libres : chaque pièce a la sienne et rien ne se dispute.
export const PORTS={
  bouche:{name:'Bouche du canon',one:1,hint:'un seul dispositif au bout du tube : silencieux, frein ou cache-flamme',mods:['manchon','frein','cacheflamme']},
  optique:{name:'Rail de visée',one:1,hint:'une seule optique de jour : la lunette ou le viseur à lichen',mods:['lunette','reflex']},
  appui:{name:'Appui sous l’arme',one:1,hint:'un trépied, un bipied ou un affût à roues : un seul',mods:['trepied','bipied','roues']},
  sousbouche:{name:'Dessous de la bouche',hint:'un tenon pour la lame',mods:['baionnette']},
  poignee:{name:'Sous le garde-main',hint:'un collier et une poignée',mods:['poignee']},
  tube:{name:'Autour du tube',hint:'usiné dans le tube ou serré en colliers',mods:['cannelures','ailettes']},
  nuit:{name:'Dessus de la boîte',hint:'le tube convertisseur et la lampe ; la batterie est dans le dos',mods:['infrarouge']},
  devant:{name:'Devant les servants',hint:'une plaque sur l’affût',mods:['bouclier']}};
export const portOf=m=>Object.keys(PORTS).find(k=>PORTS[k].mods.includes(m))||null;
// la liste réellement montée : dans une attache à une seule pièce, seule la première de la liste reste
export function fitMods(list){const s=new Set(list||[]);for(const P of Object.values(PORTS)){if(!P.one)continue;let kept=false;for(const m of P.mods)if(s.has(m)){if(kept)s.delete(m);else kept=true;}}return [...s];}
// ajouter ou retirer un module : le nouveau prend la place de l'ancien occupant de son attache
export function toggleMod(list,m){const s=new Set(fitMods(list));if(s.has(m)){s.delete(m);return [...s];}const P=PORTS[portOf(m)];if(P?.one)for(const o of P.mods)s.delete(o);s.add(m);return [...s];}
// Le bouclier (module « bouclier ») : une plaque devant les servants, d'un matériau (ceux des protections) et d'une épaisseur. Sa taille suit le calibre de la
// pièce ; sa hauteur et sa largeur se règlent (shieldH, shieldW en cm ; l'ancien shieldSize les met à l'échelle ensemble). Elle se dresse du sol à h, sur une
// largeur w : c'est ce que le combat protège (world.js, hy < h et |écart| < w/2) et ce que les dessins montrent. Sans aucun réglage, c'est la plaque
// d'avant : la même masse (0,02 + 0,012 × calibre kg), son épaisseur d'acier en découle.
export const SHIELD_MATS=['acier','ceramique','composite','soie','lin','cuir','toile'];
export function shieldOf(p){
  if(!fitMods(p.mods).includes('bouclier'))return null;
  const custom=p.shieldMat!=null||p.shieldT!=null||p.shieldSize!=null||p.shieldH!=null||p.shieldW!=null;
  const mat=MATS[p.shieldMat]?p.shieldMat:'acier',M=MATS[mat],size=Math.max(.5,Math.min(1.6,p.shieldSize??1));
  const h0=Math.min(.6,Math.max(.12,.12+p.d*.004))*size;
  const h=p.shieldH!=null?Math.max(.04,Math.min(.9,p.shieldH/100)):h0,w=p.shieldW!=null?Math.max(.03,Math.min(.9,p.shieldW/100)):h0*.45,area=h*w;
  const kg=custom?area*Math.max(.2,Math.min(8,p.shieldT??1.8))*M.rho:.02+p.d*.012;
  const t=custom?Math.max(.2,Math.min(8,p.shieldT??1.8)):kg/(area*M.rho);
  return {mat,t,size,h,w,area,kg,eq:t*M.k,custom,name:M.name};}
export const portConflicts=list=>Object.entries(PORTS).filter(([,P])=>P.one).map(([k,P])=>[k,P.mods.filter(m=>(list||[]).includes(m))]).filter(([,l])=>l.length>1);
// Alimentation, profil de tube et affût sont indépendants du mécanisme : une pompe peut recevoir un tambour, un automatique
// peut être alimenté par plateau ou par bande, et une pièce peut reposer sur roues, traîneau ou plateforme.
export const FEEDS={
  interne:{name:'Magasin interne',k:1.05,fixed:0,disp:0,cost:0,desc:'les cartouches sont cachées dans l’arme : compact, lent à garnir'},
  boite:{name:'Boîte droite',k:1.18,fixed:.002,disp:.03,cost:.15,desc:'chargeur détachable simple et léger'},
  courbe:{name:'Chargeur courbe',k:1.22,fixed:.003,disp:.05,cost:.25,desc:'suit la forme des cartouches à bourrelet et accepte davantage de coups'},
  tambour:{name:'Tambour',k:1.42,fixed:.009,disp:.12,cost:.65,desc:'beaucoup de coups dans un disque compact, lourd et mécanique'},
  bande:{name:'Bande et caisse',k:1.12,fixed:.012,disp:.08,cost:.55,crew:1,belt:1,desc:'une bande souple plonge dans une caisse : énorme réserve, un pourvoyeur aide'},
  plateau:{name:'Plateau supérieur',k:1.35,fixed:.007,disp:.08,cost:.45,desc:'un disque horizontal au-dessus de la culasse, très visible'},
  tube:{name:'Tube sous canon',k:1.12,fixed:.002,disp:.02,cost:.1,tube:1,desc:'les cartouches sont bout à bout sous le canon, parfait pour une pompe'},
  helicoidal:{name:'Hélicoïdal',k:1.3,fixed:.008,disp:.1,cost:.7,desc:'un long cylindre en spirale au-dessus de l’arme : beaucoup de coups sans tambour'},
  tremie:{name:'Trémie',k:1.5,fixed:.015,disp:.18,cost:.8,crew:1,desc:'les cartouches tombent par gravité depuis une boîte : absurde, encombrant, mais inépuisable'},
};
export const TUBES={
  droit:{name:'Droit',mass:1,cool:1,moa:1,life:1,desc:'profil cylindrique classique'},
  conique:{name:'Conique',mass:.88,cool:1.05,moa:1.04,life:.95,desc:'épais à la chambre, aminci vers la bouche : plus léger'},
  lourd:{name:'Lourd étagé',mass:1.35,cool:.9,moa:.8,life:1.35,desc:'renforts successifs autour de la chambre : lourd, raide et durable'},
  refroidi:{name:'Chemise perforée',mass:1.12,cool:1.35,moa:.96,life:1.1,desc:'une enveloppe ajourée protège le tube et accélère son refroidissement'},
};
export const CARRIAGES={
  roues:{name:'Roues et flèche',mass:1,setup:1,cost:.8,desc:'affût de campagne classique, mobile et stable'},
  bifleche:{name:'Double flèche',mass:1.2,setup:1.2,cost:1.1,desc:'deux bras s’écartent au sol : large secteur de tir et excellente stabilité'},
  traineau:{name:'Traîneau',mass:.72,setup:.8,cost:.45,desc:'deux patins bas, faciles à fabriquer et pénibles à déplacer'},
  plateforme:{name:'Plateforme circulaire',mass:1.55,setup:1.45,cost:1.5,desc:'pivot complet, lourd et presque fixe : la meilleure base pour une pièce déraisonnable'},
  pieux:{name:'Pieux',mass:.6,setup:1.8,cost:.5,desc:'pièce volontairement ancrée au sol : elle ne suit pas l’escouade'},
};
// L'étui : sa matière (ce qu'il pèse, ce qu'il coûte, sa couleur) ; « sans étui » : la poudre moulée en bloc, rien à éjecter,
// mais la chaleur du tube peut l'allumer toute seule (tir en continu réduit).
export const CASEMATS={laiton:{name:'Laiton',k:1,col:['#f0cf73','#c9a043','#8a6a22'],res:'cuivre',desc:'le classique : s’étire et scelle la chambre, se recharge'},
  acier:{name:'Acier laqué',k:.92,col:['#9fae8a','#6d7a5a','#3f4734'],res:'fer',desc:'moins cher en cuivre, un peu plus dur à extraire'},
  alu:{name:'Aluminium',k:.42,col:['#e3e8ec','#b3bcc4','#7b858e'],res:'cuivre',desc:'très léger : on porte plus de coups ; il ne tient pas les fortes pressions'},
  polymere:{name:'Polymère',k:.3,col:['#6d7b86','#4b5660','#2a3238'],res:'pieces',desc:'un étui de résine à culot de laiton : le plus léger, isole la poudre de la chaleur'},
  sansetui:{name:'Sans étui',k:0,col:['#8a6a3e','#5e4424','#3a2814'],res:'poudre',desc:'la charge moulée autour de la balle : rien à éjecter, plus de coups par caisse — mais un tube chaud l’allume tout seul'}};
export const RIMS={sans:{name:'Sans bourrelet',k:1,desc:'gorge d’extraction : s’empile bien dans un chargeur droit'},bourrelet:{name:'À bourrelet',k:1.08,desc:'un rebord qui tient la cartouche dans la chambre : robuste, mais s’accroche dans les chargeurs'},ceinture:{name:'À ceinture',k:1.12,desc:'un anneau renforcé devant la gorge : tient les fortes pressions'}};
// La crosse : ce qu'elle pèse, comment elle tient le recul, ce qu'elle fait gagner à l'épaule.
export const STOCKS={bois:{name:'Bois plein',kg:1,rk:1,aim:1,disp:0,desc:'lourde, elle boit le recul'},squelette:{name:'Squelette',kg:.5,rk:1.1,aim:.95,disp:.1,desc:'un cadre de métal : moitié moins lourd'},
  pliante:{name:'Pliante',kg:.7,rk:1.15,aim:.93,disp:.15,desc:'repliée pour marcher, dépliée pour tirer'},bullpup:{name:'Bullpup',kg:.8,rk:1,aim:.88,disp:.05,bull:1,desc:'la culasse dans la crosse : l’arme raccourcit de toute la culasse, pour le même canon'},
  sans:{name:'Sans crosse',kg:0,rk:1.7,aim:.8,disp:.8,desc:'une poignée seulement : légère et courte, tenue à bout de bras'}};
// La finition : pour l'œil (et un peu de cuivre pour les gravures). Des peluches de 30 cm ont bien le droit d'avoir du goût.
export const FINISHES={bronze:{name:'Bronze',m:['#b08a5a','#6e5432','#3a2c18'],w:['#a8703f','#6a4221']},bleui:{name:'Bleui',m:['#7b848d','#3d434a','#23272b'],w:['#a8703f','#6a4221']},
  kaki:{name:'Kaki',m:['#8d9469','#5a6040','#343823'],w:['#7a6a48','#4d4128']},ivoire:{name:'Ivoire et or',m:['#f3e7cf','#cdb68a','#8f7447'],w:['#e9d9b8','#b39a6c'],gold:1},
  laque:{name:'Laque rouge',m:['#6a6e74','#34383d','#1d2023'],w:['#b3372b','#6e1b14']},grave:{name:'Gravé d’or',m:['#8a8f96','#4a4f55','#25282c'],w:['#6b3a1c','#3b1e0d'],gold:1}};
// Le guidage des balles-fusées (de la fantaisie à l'échelle des peluches : ça tient dans 5 mm)
export const GUIDES={aucun:{name:'Aucun',disp:1,cost:0,desc:'la fusée file où la poussée l’envoie'},gyro:{name:'Gyroscope',disp:.55,cost:.25,desc:'une toupie de laiton qui garde l’axe pendant la poussée : moitié moins de dispersion'},
  moustaches:{name:'Moustaches',disp:.4,cost:.45,seek:1,desc:'des vibrisses de crin qui sentent la chaleur d’une peluche et braquent les ailettes : se corrige en vol vers la cible la plus proche'}};
export const MOUNTS={epaule:{name:'À l’épaule',rank:0},bipied:{name:'Sur bipied',rank:1},trepied:{name:'Sur trépied',rank:2},fixe:{name:'Pièce fixe',rank:3}};
export const ROLES=['tireur','chargeur','pourvoyeur','second pourvoyeur','chef de pièce'];
export const HUMAN=6;             // un Meumeu (30 cm) contre un humain (1,80 m) : à l'échelle humaine, tout ×6
export const fmt=(v,n=0)=>(+v).toFixed(n).replace('.',',');

// ---------- ce qu'une conception donne ----------
// p : {d, l, nose, base, cons, c (poudre, g), L (canon, mm), twist (mm par tour), action, rof (coups/min), mag, heavy}
// Le silencieux. Ce qu'il retire (en dB) : 10·log10(1 + volume / (30 × charge)) × l'efficacité de son architecture — un gros
// fusil sature un petit manchon, un pistolet s'éteint dans un grand. Jamais plus de 38 dB. Il reste toujours la culasse
// (100 dB à verrou, 112 en automatique) et, si la balle va plus vite que le son, son claquement le long de la trajectoire,
// qu'aucun silencieux n'efface (mais qu'on situe mal). Chiffres réels de l'époque : un fusil 160–170 dB à la bouche, un
// manchon de fusil 20–30 dB, un pistolet subsonique au silencieux autour de 125 dB — un claquement vers 140.
export const SUPS={
  chicanes:{name:'Chicanes',desc:'des disques percés empilés : robuste, simple, bon marché',eff:n=>.55+.05*n,kg:1,cost:1},
  cones:{name:'Cônes',desc:'des chicanes coniques embouties : plus efficaces à volume égal, plus chères à usiner',eff:n=>.62+.055*n,kg:1.1,cost:1.8},
  essuie:{name:'Essuies',desc:'des rondelles de cuir que la balle perce : le plus silencieux, mais elles s’usent (vingt coups) et se changent au dépôt',eff:n=>.8+.05*n,kg:.8,cost:1.2,life:20,floor:.55},
  humide:{name:'Humide',desc:'graissé, un peu d’eau : les six premiers coups presque muets, puis comme un manchon sec ; on le regraisse au dépôt',eff:n=>.6+.05*n,kg:1,cost:1,wet:6,wetK:1.35},
};
// La visée infrarouge (le « Vampir » de 1944) : une lampe à filtre noir (sa puissance fait la portée), un tube convertisseur
// (sa qualité aussi), une batterie au plomb dans le dos (sa capacité fait l'autonomie ; elle pèse). Réel : 30 W, ~70 m ; 13 kg de pack.
// L'optique d'une lunette. Le grossissement fait voir plus loin (on distingue plus petit : ×4, deux fois plus loin ; ×8, presque
// trois fois) ; l'objectif fait voir au crépuscule et la nuit : la pupille de sortie (objectif ÷ grossissement) doit remplir l'œil
// d'un Meumeu (2,5 mm à son échelle), sinon l'image s'assombrit et le gain de nuit fond. Le facteur crépusculaire √(G×D) des opticiens.
export function opticOf(mag,obj){mag=Math.max(1,+mag||1);obj=Math.max(2,+obj||(6+2.6*mag));const day=mag>1?1+.42*Math.pow(mag-1,.72):1;const ep=obj/mag;
  const night=mag>1?1+(day-1)*Math.pow(Math.max(.2,Math.min(1,ep/2.5)),.8):1;return {mag,obj:+obj.toFixed(1),ep:+ep.toFixed(2),day:+day.toFixed(2),night:+night.toFixed(2),tf:+Math.sqrt(mag*obj).toFixed(1)};}
// Le viseur infrarouge du Meumeu (les Bèè n'en ont pas : la technologie est du côté des Meumeu). Réglages : la puissance de la lampe (W) et la
// qualité du tube font la portée ; un faisceau étroit porte plus loin mais éclaire moins de terrain (43° = le réglage moyen) ; sans filtre, la
// lampe laisse une lueur rouge visible qui trahit l'opérateur. La BATTERIE reste (Wh : plus grosse = plus lourde dans le dos) mais dure dix
// fois plus qu'avant (IR_ENDURANCE) : le réglage moyen tient 44 h d'utilisation au lieu de 4,4 — plusieurs nuits. La portée est en CASES
// (1 case = 4 m) : un réglage moyen (35 W) voit à 45 cases (180 m) de nuit, aussi loin qu'un œil nu en plein jour ; le meilleur réglage
// (150 W, tube 1,6, faisceau étroit) plafonne à 140 cases (560 m).
export const IR_MAX_RANGE=45,IR_ENDURANCE=10;
// Ce que coûte l'ensemble (lampe, tube, batterie) en matériaux : la batterie pèse lourd sur la facture (plomb surtout), la lampe et le tube en cuivre
// et en pièces. Un réglage moyen (35 W, 200 Wh, tube ×1) : 10 plomb, 3,4 cuivre, 10,7 pièces — de quoi équiper très peu de soldats sans vraie filière.
export const irCostOf=I=>({plomb:+(I.Wh*.05).toFixed(1),cuivre:+(.6+I.W*.012+I.Wh*.012).toFixed(1),pieces:+(1.5+I.q*3.6+I.Wh*.01).toFixed(1)});
// V12.4 (règle du joueur) : plus de recharge. La batterie est celle qu'il faut à la lampe choisie, elle fait partie de l'ensemble et ne se vide pas :
// sa taille suit la puissance (Wh = 200/35 × W : au réglage moyen, la même batterie qu'avant, 120 g) — plus puissante, plus lourde. L'ancien réglage irWh
// des conceptions est ignoré. « hours » reste pour la compatibilité (999 : sans fin), il ne s'affiche plus.
export const IR_WH_PER_W=200/35,IR_NO_DRAIN=999;
export function irOf(p){const W=Math.max(10,Math.min(150,p.irW??35)),Wh=Math.round(W*IR_WH_PER_W),q=Math.max(.5,Math.min(1.6,p.irQ??1));
  const beam=Math.max(8,Math.min(60,Math.round(p.irBeam??43))),filt=(p.irFilt??1)?1:0;
  const range=Math.min(IR_MAX_RANGE,3.6*Math.sqrt(W)*Math.pow(q,.8)*Math.pow(43/beam,.5));   // (V12.4 : 35 W → ~21 cases, 85 m ; 150 W → plafond 45 cases ; avant : jusqu'à 140)
  return {W,Wh,q,beam,mode:0,filt,range:+range.toFixed(1),hours:IR_NO_DRAIN,lampKg:+(.004+W*.00012+q*.003+(filt?.002:0)).toFixed(4),packKg:+(Wh*.0006).toFixed(3),leak:!filt};}
export function supOf(p,c){const V=Math.max(40,Math.min(900,p.supVol??250)),n=Math.max(2,Math.min(12,Math.round(p.supBaffles??5))),A=SUPS[p.supArch]||SUPS.chicanes;
  const R=Math.min(38,10*Math.log10(1+V/(30*Math.max(1e-4,c)))*Math.min(1.35,A.eff(n)));return {V,n,arch:p.supArch in SUPS?p.supArch:'chicanes',A,R};}
// ---------- le bureau d'études « kit » (assets/designer-kit) : le modèle continu du joueur ----------
// Une conception kit (k) donne les cotes réelles de l'objet à l'échelle des Meumeu (30 cm) : un fusil de 7,2 mm, un tube de 24 cm,
// quelques centaines de grammes ; une pièce de campagne de 28 mm, quelques kilogrammes, poussée sur roues. kitCalc(k) suit
// FORMULES.md ; kitToP(k) la traduit vers le modèle p du reste du jeu, et derive() garde alors les chiffres du kit (V₀, masse,
// servants, poussée, vue, coût, perforation).
export const KIT_DEF={name:'Fusil',role:'',caliberMm:7.2,barrelLengthCm:24,barrelProfile:.38,rifled:true,twistCm:20,material:'steel',muzzle:'crown',receiver:'bolt',stock:'full',sight:'leaf',sightRadiusCm:32,zeroM:100,magnification:1,sightHeightCm:2.4,
  massG:8.2,lengthCal:4.1,ogive:.72,boattail:.12,meplat:.12,coreDensity:11.2,filler:0,tracer:false,vivacity:1.05,energyMjKg:3.85,loadDensity:.9,caseLenCm:4.4,caseOverbore:1.32,motorNs:0,carriage:'shoulder',assignedCrew:1,
  magazine:5,launcherTubes:1,salvoInterval:.65,rocketBurn:.35,fins:4,rof:500,supVol:250,supBaffles:5,supArch:'chicanes',irW:35,irWh:200,irQ:1,irBeam:43,irMode:0,irFilt:1};
// la matière du tube : densité, résistance (une fonte fait une paroi plus épaisse), prix au kg (marks)
export const KIT_MAT={steel:{name:'Acier',rho:7.85,res:1,rate:46},iron:{name:'Fonte',rho:7.2,res:.62,rate:22},bronze:{name:'Bronze',rho:8.8,res:.78,rate:96}};
// le boîtier : la pression qu'il fait tenir au tube (pr), sa masse pour un 7,2 mm (kg), la charge qu'il tient par gramme d'ogive (lim)
export const KIT_RECV={break:{name:'Bascule',pr:.85,kg:.09,lim:.3,act:'bascule',mag:2,len:3},bolt:{name:'Verrou',pr:1,kg:.19,lim:.5,act:'verrou',mag:5,len:4},auto:{name:'Automatique',pr:.9,kg:.14,lim:.4,act:'semi',mag:8,len:3.5},
  open:{name:'Culasse ouverte',pr:1,kg:.3,lim:.5,leak:.85,act:'auto',mag:50,len:6},breech:{name:'Culasse de pièce',pr:1,kg:0,lim:.115,act:'culasse',mag:1,len:3},mortar:{name:'Mortier',pr:.5,kg:0,lim:.036,act:'bouche',mag:1,len:1},
  tube:{name:'Tube roquette',pr:.25,kg:.03,lim:1,act:'verrou',mag:1,len:2},recoilless:{name:'Sans recul',pr:.5,kg:.06,lim:.4,act:'verrou',mag:1,len:3}};
export const KIT_STOCK={none:{name:'Sans crosse',kg:0,cm:0,st:'sans'},pistol:{name:'Poignée',kg:.07,cm:3,st:'sans'},straight:{name:'Droite',kg:.09,cm:14,st:'bois'},full:{name:'Pleine',kg:.11,cm:16,st:'bois'},
  wire:{name:'Fil d’acier',kg:.045,cm:13,st:'squelette'},bullpup:{name:'Bullpup',kg:.09,cm:5,st:'bullpup'},thumbhole:{name:'Trou de pouce',kg:.11,cm:16,st:'bois'}};
// le viseur : qualité (q), masse, usinage (marks) ; « mag » : le grossissement agit ; « ir » : la visée infrarouge (lampe, batterie)
export const KIT_SIGHT={none:{name:'Aucun',q:.62,kg:0,cost:0},notch:{name:'Cran et guidon',q:1.05,kg:.003,cost:8.3},leaf:{name:'Planchette',q:1,kg:.008,cost:12},ladder:{name:'Hausse graduée',q:1,kg:.012,cost:14},
  diopter:{name:'Dioptre',q:1.1,kg:.012,cost:18,err:.75},optic:{name:'Optique',q:.9,kg:.02,kgMag:.006,cost:20,costMag:19,mag:1},panoramic:{name:'Panoramique',q:1.35,kg:.05,kgMag:.01,cost:60,costMag:11.5,mag:1},
  infrared:{name:'Infrarouge',q:.95,kg:.02,kgMag:.006,cost:45,costMag:10,mag:1,ir:1}};
export const KIT_MUZZLE={none:{name:'Nue',kg:0},crown:{name:'Couronne',kg:.002},flash:{name:'Cache-flamme',kg:.01,mod:'cacheflamme'},brake:{name:'Frein',kg:.015,mod:'frein'},trumpet:{name:'Tromblon',kg:.02},taper:{name:'Réducteur',kg:.006},suppressor:{name:'Silencieux',kg:.03,mod:'manchon'}};
// l'affût : ce qu'un servant porte ou pousse (cap, kg), la masse de l'affût (a + b × pièce), la poussée (v0 × exp(−kg par servant / k))
export const KIT_CARR={shoulder:{name:'Épaule',cap:1.45,a:0,b:0,v:.78,k:2.15,have:'epaule',setup:0,h:.22},bipod:{name:'Bipied',cap:2.15,a:.04,b:.06,v:.78,k:2.15,have:'bipied',setup:1.5,h:.12},tripod:{name:'Trépied',cap:3.4,a:.1,b:.25,v:.78,k:2.15,have:'trepied',setup:6,h:.3},
  wheels:{name:'Roues',cap:14,a:.3,b:.34,v:.86,k:10,have:'trepied',setup:3,h:.42,wheels:1},shield:{name:'Roues et bouclier',cap:14,a:.45,b:.4,v:.86,k:10,have:'trepied',setup:4,h:.42,wheels:1},emplaced:{name:'Pieux',cap:14,a:.2,b:.2,v:0,k:10,have:'trepied',setup:12,h:.42,fixed:1}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// la masse d'ogive « suggérée » par la géométrie : un cylindre de lengthCal calibres, allégé par l'ogive, la queue et la charge
export function kitSuggestMass(k){const r=k.caliberMm/20,Lg=k.lengthCal*k.caliberMm/10;const vol=Math.PI*r*r*Lg*(1-.3*k.ogive)*(1-.25*k.boattail);return +(vol*((k.coreDensity||11.2)*(1-k.filler)+1.6*k.filler)).toFixed(2);}
export function kitCalc(k0){const k={...KIT_DEF,...k0};const d=clamp(+k.caliberMm||7.2,.5,120),r=d/20,m=Math.max(.05,+k.massG||1),Lc=Math.max(1,+k.barrelLengthCm||1);
  const M=KIT_MAT[k.material]||KIT_MAT.steel,R=KIT_RECV[k.receiver]||KIT_RECV.bolt,S=KIT_STOCK[k.stock]||KIT_STOCK.full,V=KIT_SIGHT[k.sight]||KIT_SIGHT.leaf,Z=KIT_MUZZLE[k.muzzle]||KIT_MUZZLE.none,C=KIT_CARR[k.carriage]||KIT_CARR.shoulder;
  const rocket=k.motorNs>.25&&k.receiver==='tube';const filler=clamp(k.filler||0,0,.55);
  // la poudre : la capacité de l'étui, la charge ; écrêtée si la culasse ne la tient pas (on n'alourdit pas l'arme pour la payer)
  const capCm3=Math.PI*(r*k.caseOverbore)**2*k.caseLenCm*.64;let charge=capCm3*clamp(k.loadDensity,.2,1.05)*.93;const clipped=charge>m*R.lim;if(clipped)charge=m*R.lim;if(rocket)charge=Math.min(charge,m*.05);
  const E=charge*k.energyMjKg*1000;const sej=clamp(Math.sqrt(m/(.181*d*d)),.78,1.55);const Ls=14.2*Math.pow(Math.max(1e-4,charge)/1.5,.45)/(Math.max(.2,k.vivacity)*sej);
  const burnt=1-Math.exp(-1.9*Lc/Ls),fric=Math.exp(-Math.max(0,Lc-1.45*Ls)/340);const eta=.38*burnt*fric*(k.receiver==='recoilless'?.42:1)*(R.leak||1);
  const guide=.86+.2*(1-Math.exp(-Lc/28));const v0=rocket?k.motorNs/(m/1000)*guide:Math.sqrt(2*eta*E/(m/1000));
  // la masse : la paroi du tube (géométrie, pas un malus), le boîtier, la crosse, le viseur, la bouche, l'affût
  const wall=Math.max(.04,.16*Math.pow(r,.42)*(.5+clamp(k.barrelProfile,0,1))*R.pr/M.res);const tubes=k.receiver==='tube'?Math.max(1,Math.min(12,Math.round(k.launcherTubes||1))):1;const barrelKg=Math.PI*((r+wall)**2-r*r)*Lc*M.rho/1000*tubes;
  const recvKg=k.receiver==='breech'?.4*barrelKg+.05:k.receiver==='mortar'?.1+.004*d:k.receiver==='tube'?R.kg*Math.pow(d/7.2,1.2)*tubes+.055*(tubes-1):R.kg*Math.pow(d/7.2,1.2);
  const mag=V.mag?clamp(+k.magnification||1,1,16):1;const I=V.ir?irOf(k):null;const sightKg=V.kg+(V.kgMag||0)*mag+(I?I.lampKg:0);
  const supV=clamp(k.supVol??250,40,900);const muzzleKg=Z.mod==='manchon'?Z.kg*Math.pow(d/7.2,1.5)*Math.pow(supV/250,.9)*(1+.03*(k.supBaffles??5)):Z.kg*(d>7.2?Math.pow(d/7.2,1.5):1);
  const stockKg=C.wheels||C.fixed?0:S.kg;const gunKg=barrelKg+recvKg+stockKg+sightKg+muzzleKg;const carrKg=C.a+C.b*gunKg;const massKg=gunKg+carrKg;
  // la longueur hors tout (cm) : crosse, boîtier, tube, bouche ; le rayon de visée ne dépasse pas l'arme
  const recvCm=k.receiver==='breech'?d/10*3:k.receiver==='mortar'?d/10:R.len*Math.max(1,k.caseLenCm/4.4)*Math.pow(d/7.2,.3);
  const lengthCm=(C.wheels||C.fixed?0:S.cm)+recvCm+Lc+(Z.mod==='manchon'?Math.max(3,d*.5)*Math.pow(supV/250,.5):Z.kg>.005?d*.4:0);
  const radius=clamp(Math.min(+k.sightRadiusCm||10,lengthCm),2,200);
  // les servants : la même formule que l'atelier (teamSize). L'affût plafonne l'équipe ;
  // le poids n'y ajoute des bras que jusqu'à ce plafond. assignedCrew n'y change rien.
  const piece=k.receiver==='breech'||(k.receiver==='mortar'&&k.carriage!=='shoulder'&&k.carriage!=='bipod'&&k.carriage!=='none');
  const crew=teamSize({mass:massKg,have:C.have,howitzer:piece,carriage:k.carriage==='emplaced'?'pieux':k.carriage==='none'?'none':(k.carriage==='wheels'||k.carriage==='shield')?'roues':'porte',wheels:k.carriage==='wheels'||k.carriage==='shield'});
  const crewMin=Math.max(1,Math.min(crew,C.fixed?5:6));const overload=!C.fixed&&massKg/crewMin>C.cap*1.6;const perKg=massKg/crew;const speed=C.fixed?0:C.v*Math.exp(-perKg/C.k);
  // le viseur : l'œil (distance d'identification) et l'erreur de visée — jamais V₀
  const bonus=k.sight==='none'?.5:clamp(radius/28,.3,1.35);const seeM=46*V.q*Math.pow(mag,.74)*bonus;
  const sightErr=V.mag?1.25/Math.sqrt(mag):k.sight==='none'?8:2.5*(32/radius)*(V.err||1);const sightMul=k.sight==='none'?.85:V.mag?1+.27*Math.log2(mag):1;
  // la stabilité (Miller) : pas et longueur en calibres ; un tube lisse ne tient que ce qui a une queue (mortier, roquette, flèche)
  const tCal=k.twistCm*10/d,L=k.lengthCal,dIn=d/25.4;const Sg=k.rifled?30*m*15.432/(tCal*tCal*dIn**3*L*(1+L*L)):0;const finStable=!k.rifled&&(rocket||k.receiver==='mortar'||k.boattail>=.15||L>=6);
  // la perforation (acier doux) et l'éclat (pas une perforation)
  const dens=(k.coreDensity||11.2)/11.2,full=1-filler;const penAt=v=>.00112*Math.sqrt(m)*Math.pow(Math.max(0,v),1.4)/Math.pow(d,.75)*dens*full*clamp((v-120)/250,0,1);
  const blastCm=filler>0?24*Math.cbrt(m*filler):0;
  // le coût : matière et usinage (la pièce) ; le coup à part ; le fer en lingots
  const rifling=k.rifled?.35*Lc:0;const pieceCost=gunKg*M.rate+carrKg*46+rifling+V.cost+(V.costMag||0)*(mag>1?mag:0)+(Z.mod==='manchon'?14*Math.sqrt(supV/250):0)+(I?20*I.q:0);
  const shotCost=.1*m+.5*m*filler+.12*charge+.25*(rocket?k.motorNs:0)+(k.tracer?.3:0);const lingots=Math.max(1,Math.round(massKg*1.15+.35));
  const costW={fer:lingots,pieces:+Math.max(.5,pieceCost/30).toFixed(1)};if(k.material==='bronze')costW.cuivre=+(gunKg*.8+.2).toFixed(1);if(V.mag||V.ir)costW.cuivre=+((costW.cuivre||0)+.3+.05*mag).toFixed(1);if(I){const C=irCostOf(I);costW.cuivre=+((costW.cuivre||0)+C.cuivre).toFixed(1);costW.plomb=+((costW.plomb||0)+C.plomb).toFixed(1);costW.pieces=+((costW.pieces||0)+C.pieces).toFixed(1);}
  const flash=clamp((1-burnt)*1.4+(Lc<Ls?.2:0),0,1);const mobility=C.fixed?'Fixe sur pieux : on l’a choisi, elle ne bouge plus.':C.wheels?`Sur roues, poussée par ${crew} meumeu. Plus c’est lourd par servant, plus c’est lent.`:crew>1?`Portée par ${crew} meumeu.`:'Épaulée ou portée par un seul servant.';
  return {k,d,m,charge,clipped,capCm3,E,Ls,burnt,eta,v0,E0:.5*m/1000*v0*v0,rocket,guide,tubes,wall,barrelKg,recvKg,stockKg,sightKg,muzzleKg,carrKg,gunKg,massKg,lengthCm,lengthMm:lengthCm*10,radius,crewMin,crew,overload,perKg,speed,seeM,sightMag:mag,sightMul,sightErr,aimMrad:1.8*sightErr/2.5,
    Sg,finStable,penAt,blastCm,pieceCost,shotCost,lingots,costW,hoursW:+(3+pieceCost/40).toFixed(1),flash,mobility,have:C.have,setup:C.setup,fixed:!!C.fixed,wheels:!!C.wheels,muzzleH:C.h,ir:!!V.ir,carr:C,recv:R,sight:V,muzzle:Z,stock:S,mat:M};}
// la conception kit vers le modèle p du jeu (derive) : les cotes deviennent d, l, c, L… ; p.kit garde l'original
export function kitToP(k0){const k={...KIT_DEF,...k0};
  // Changer de vue n'est pas une modification d'arme : aller-retour sans perte,
  // y compris les réglages avancés que la bibliothèque ne représente pas.
  if(k._sourceP&&k._sourceK){const check={...k};delete check._sourceP;delete check._sourceK;if(JSON.stringify(check)===k._sourceK)return JSON.parse(JSON.stringify(k._sourceP));}
  const K=kitCalc(k);const R=K.recv,d=K.d;const mods=[];if(K.muzzle.mod)mods.push(K.muzzle.mod);if(k.sight==='optic'||k.sight==='panoramic')mods.push('lunette');if(K.sight.ir)mods.push('infrarouge');
  if(k.carriage==='bipod')mods.push('bipied');if(k.carriage==='tripod')mods.push('trepied');if(k.carriage==='shield')mods.push('bouclier');
  const nose=k.meplat>.4?'plate':k.ogive>.65?'pointue':k.ogive>.35?'ogive':'ronde';
  const cons=k.filler>=.1?'he':k.tracer?'trc':k.coreDensity>=14?'tungstene':k.coreDensity<5?'frangible':k.coreDensity<9.5?'ap':k.meplat>=.5&&k.filler>0?'chevrotine':k.ogive<.4&&k.coreDensity>=11.3?'plombnu':'fmj';
  const act=R.act;const mag=k.receiver==='tube'?K.tubes:Math.max(1,Math.round(k.magazine??R.mag));
  // Le modèle historique ne connaît pas tous les affûts du bureau continu. On garde néanmoins une traduction
  // fidèle au lieu de transformer silencieusement toute arme non ancrée en « roues ».
  const legacyCarriage={shoulder:'roues',bipod:'traineau',tripod:'traineau',wheels:'roues',shield:'bifleche',emplaced:'pieux'}[k.carriage]||'roues';
  return {d,l:+(k.lengthCal*d).toFixed(2),nose,base:k.boattail>.1?'bt':'plat',boat:k.boattail,meplat:Math.min(.9,k.meplat),cons,hef:k.filler>=.1?k.filler:undefined,c:+K.charge.toFixed(4),L:+(k.barrelLengthCm*10).toFixed(1),twist:k.rifled?Math.max(3,k.twistCm*10):4000,
    action:act,rof:Math.max(1,Math.round(k.rof??500)),mag:ACTIONS[act]?.mortar?1:mag,feed:act==='auto'&&mag>=50?'bande':undefined,heavy:k.barrelProfile>.6,wallx:1,burn:clamp(k.vivacity,.35,2.5),zero:clamp(k.zeroM,5,2000),prop:K.rocket?'fusee':'cartouche',rocketBurn:k.rocketBurn,fins:k.fins,barrels:K.tubes,
    stock:K.stock.st,mods,supVol:k.supVol,supBaffles:k.supBaffles,supArch:k.supArch,irW:k.irW,irWh:k.irWh,irQ:k.irQ,irBeam:k.irBeam,irMode:k.irMode,irFilt:k.irFilt,sightMag:k.magnification,sightObj:k.objectiveMm??16,sightRadius:k.sightRadiusCm,sightHeight:k.sightHeightCm,fill:k.fill||k._sourceP?.fill||'tolite',shell:k._sourceP?.shell||'lisse',fuse:k._sourceP?.fuse||'impact',carriage:legacyCarriage,kit:JSON.parse(JSON.stringify(k))};}
// l'inverse approché : une arme de l'ancien modèle vue par le bureau (pour « partir de » une conception existante)
const ACT2RECV={verrou:'bolt',bascule:'break',semi:'auto',levier:'bolt',pompe:'bolt',auto:'open',gaz:'open',recul:'open',bouche:'mortar',culasse:'breech',rotatif:'open'};
export function pToKit(p,D){if(p.kit)return {...KIT_DEF,...JSON.parse(JSON.stringify(p.kit))};const ms=new Set(p.mods||[]),C=CONSTRUCTIONS[p.cons]||CONSTRUCTIONS.fmj,N=NOSES[p.nose]||NOSES.ogive;D=D||derive(p);
  const ob=clamp((D.Dc||p.d*1.45)/p.d,1,1.8),cap=p.c/(.9*.93),caseLen=cap/(Math.PI*(p.d/20*ob)**2*.64);
  const result={...KIT_DEF,name:'',caliberMm:p.d,barrelLengthCm:+(p.L/10).toFixed(1),barrelProfile:p.heavy?.7:.38,rifled:!(ACTIONS[p.action]?.mortar&&!ACTIONS[p.action]?.howitzer),twistCm:+(p.twist/10).toFixed(1),material:'steel',
    muzzle:ms.has('manchon')?'suppressor':ms.has('frein')?'brake':ms.has('cacheflamme')?'flash':'crown',receiver:ACT2RECV[p.action]||'bolt',stock:{sans:'pistol',squelette:'wire',pliante:'wire',bullpup:'bullpup'}[p.stock]||'full',
    sight:ms.has('infrarouge')?'infrared':ms.has('lunette')?'optic':'leaf',magnification:p.sightMag??(ms.has('lunette')?2:1),objectiveMm:p.sightObj??16,sightHeightCm:p.sightHeight??1.2,sightRadiusCm:p.sightRadius??Math.min(32,p.L/10+8),zeroM:p.zero||50,massG:+D.m.toFixed(3),lengthCal:+(p.l/p.d).toFixed(2),
    ogive:{pointue:.78,ogive:.5,ronde:.28,plate:.1}[p.nose]??.5,boattail:p.boat??(p.base==='bt'?.3:0),meplat:p.meplat||(p.nose==='plate'?.5:.1),coreDensity:C.rho,filler:C.he?(p.hef??.3):0,tracer:!!C.tracer,vivacity:p.burn??1,energyMjKg:3.85,loadDensity:.9,
    caseLenCm:+clamp(caseLen,.3,30).toFixed(2),caseOverbore:+ob.toFixed(2),motorNs:0,carriage:ms.has('trepied')?'tripod':ms.has('bipied')?'bipod':ACTIONS[p.action]?.howitzer?'wheels':'shoulder',assignedCrew:D.crew||1,
    magazine:p.mag||1,rof:p.rof||500,supVol:p.supVol??250,supBaffles:p.supBaffles??5,supArch:p.supArch||'chicanes',irW:p.irW??35,irWh:p.irWh??200,irQ:p.irQ??1,irBeam:p.irBeam??43,irMode:p.irMode??0,irFilt:p.irFilt??1};
  result._sourceK=JSON.stringify(result);result._sourceP=JSON.parse(JSON.stringify(p));return result;}
// Adaptateur d'édition : aucun curseur de l'atelier complet ne supprime la fiche continue.
export function editKit(p,key){const k=p.kit;if(!k)return;
  const priorMass=kitSuggestMass(k);
  const map={d:['caliberMm',1],L:['barrelLengthCm',.1],twist:['twistCm',.1],zero:['zeroM',1],sightMag:['magnification',1],sightObj:['objectiveMm',1],sightRadius:['sightRadiusCm',1],sightHeight:['sightHeightCm',1],burn:['vivacity',1],mag:['magazine',1],rof:['rof',1],boat:['boattail',1],meplat:['meplat',1],hef:['filler',1],supVol:['supVol',1],supBaffles:['supBaffles',1],irW:['irW',1],irWh:['irWh',1],irQ:['irQ',1],irBeam:['irBeam',1],irMode:['irMode',1],irFilt:['irFilt',1]};
  if(map[key]){const [name,factor]=map[key];k[name]=p[key]*factor;}
  if(key==='l'||key==='d'){k.lengthCal=p.l/p.d;if(key==='d')k.caliberMm=p.d;const after=kitSuggestMass(k);if(priorMass>0)k.massG=Math.max(.05,k.massG*after/priorMass);}
  if(key==='c'){const area=Math.PI*(k.caliberMm/20*k.caseOverbore)**2*.64;k.caseLenCm=Math.max(.01,p.c/Math.max(1e-9,area*k.loadDensity*.93));}
  if(key==='heavy'||key==='wallx')k.barrelProfile=clamp(((p.wallx??(p.heavy?1.5:1))-.35)/2.5,0,1);
  if(key==='action')k.receiver=ACT2RECV[p.action]||'bolt';
  if(key==='stock')k.stock={sans:'pistol',squelette:'wire',pliante:'wire',bullpup:'bullpup',bois:'full'}[p.stock]||'full';
  if(key==='carriage')k.carriage=p.carriage==='pieux'||p.carriage==='fixe'?'emplaced':p.carriage==='bifleche'?'shield':'wheels';
  if(key==='nose')k.ogive={pointue:.78,ogive:.5,ronde:.28,plate:.1}[p.nose]??.5;
  if(key==='base')k.boattail=p.base==='bt'?.3:0;
  if(key==='cons'){const C=CONSTRUCTIONS[p.cons]||CONSTRUCTIONS.fmj;k.coreDensity=C.rho;k.filler=C.he?(p.hef??.3):0;k.tracer=!!C.tracer;}
  if(key==='mods'){const m=new Set(p.mods||[]);k.muzzle=m.has('manchon')?'suppressor':m.has('frein')?'brake':m.has('cacheflamme')?'flash':'crown';k.sight=m.has('infrarouge')?'infrared':m.has('lunette')?'optic':m.has('reflex')?'notch':'leaf';k.carriage=m.has('trepied')?'tripod':m.has('bipied')?'bipod':ACTIONS[p.action]?.howitzer?'wheels':'shoulder';}
}
const cache=new Map();
export function derive(p){const key=JSON.stringify(p);let D=cache.get(key);if(D)return D;D=compute(p);cache.set(key,D);if(cache.size>500)cache.delete(cache.keys().next().value);return D;}
function compute(p){if(ACTIONS[p.action]?.mortar&&p.mag!==1)p={...p,mag:1};const K=p.kit?kitCalc(p.kit):null;const N=NOSES[p.nose],B=BASES[p.base],C=CONSTRUCTIONS[p.cons],A=ACTIONS[p.action];const mods=new Set(fitMods(p.mods));const zero=p.zero||50;const hef=C.he?(p.hef??(C.shaped?.45:.3)):0,coreF=C.core||C.he?0:(p.core||0),jacket=p.jacket??1,wallx=p.wallx??(p.heavy?1.5:1);
  const barrels=K?.rocket?K.tubes:A.multi?Math.max(2,Math.min(8,Math.round(p.barrels??A.multi))):(p.prop==='fusee'&&A.mortar)?Math.max(1,Math.min(12,Math.round(p.barrels??1))):1;const FD=FEEDS[p.feed]||FEEDS[A.mortar?'interne':A.auto&&p.mag>=50?'bande':p.action==='pompe'||p.action==='levier'?'tube':p.mag>40?'tambour':p.mag>12?'courbe':'boite'];const TP=TUBES[p.tube]||TUBES.droit;const CG=CARRIAGES[p.carriage]||CARRIAGES.roues;
  const d=p.d,A_mm2=Math.PI*d*d/4;const l=p.l,noseLen=Math.min(N.len*d*(p.noseScale??1),Math.max(0,l-.3*d));
  // le projectile : une balle ; un dard sous-calibré (sabot) ; ou une gerbe de plombs, de fléchettes
  const sub=C.sub||1,dp=d*sub,Ap=Math.PI*dp*dp/4;const pel=C.pellets||1;
  let m,mp,dpr,lpr;if(pel>1){m=A_mm2*l*(C.fill||.5)*C.rho/1000;mp=m/pel;if(C.dart){dpr=d*.16;lpr=mp*1000/C.rho/(Math.PI*dpr*dpr/4);}else{dpr=Math.cbrt(6*mp*1000/C.rho/Math.PI);lpr=dpr;}}
  else{const vol=Ap*(l-noseLen*sub+noseLen*sub*N.vf)*(1-(p.boat??(p.base==='bt'?.3:0))*.12);
    // la densité : l'explosif (1,6) prend la place du métal ; un noyau d'acier (7,85) remplace une part du plomb
    const rho=C.he?C.rho*(1-hef)+1.6*hef:C.core||C.mono||!coreF?C.rho:C.rho*(1-coreF)+7.85*coreF;m=vol*rho/1000*(1-Math.max(0,Math.min(.9,p.cavity||0))*Math.min(1,noseLen/Math.max(.1,l))*.3);if(C.tracer)m*=.93;mp=m;dpr=dp;lpr=l;}
  if(K&&pel===1)m=mp=K.m;
  const mLaunch=m*(sub<1?1.35:1)+(pel>1?m*.08:0);                           // le sabot, la bourre : poussés aussi, puis perdus
  const c=p.c,burn=Math.max(.35,Math.min(2.5,p.burn??1));const P=p.prop==='fusee'?25:370*Math.pow(Math.max(.01,c/mLaunch)/.3,.35)*Math.pow(burn,.1);let eta=0;
  // la balle auto-propulsée (une fusée) : la poudre brûle dans la balle elle-même, qui sort lentement du tube et accélère
  // ensuite — Δv = ve·ln(m0/m1) (Tsiolkovski, ve ≈ 1500 m/s pour une poudre de fusée) ; un tube sans pression, léger,
  // presque sans recul (les gaz partent en arrière : le souffle arrière est dangereux) ; mais la poussée n'est jamais tout à
  // fait dans l'axe : elle disperse.
  const rocket=p.prop==='fusee';let boost=null,mc=0;
  let v0;if(rocket){const st2=(p.stages||1)>=2,cant=Math.max(0,Math.min(25,p.cant||0))*Math.PI/180,ign=Math.max(0,Math.min(.4,(p.ignite||0)/1000));
    mc=(c*.7+.0004*d**3)*(st2?1.15:1)+Math.max(0,Math.min(8,Math.round(p.fins||0)))*(p.finSize??1)*.0003*d*d;const m1=mLaunch+mc,m0=m1+c;
    // deux étages : le premier se détache vide, le second repart léger (Tsiolkovski étage par étage)
    const dv=1500*(p.nozzle??1)*Math.cos(cant)*(st2?Math.log((m0)/(m0-c*.55))+Math.log((m1+c*.45-mc*.35)/(m1-mc*.35)):Math.log(m0/m1));
    const Lm=c/.0016/(A_mm2*.8);const tb=(.03+Lm/300)*(p.rocketBurn??1);const a=dv/tb;
    // allumage retardé : une petite charge l'éjecte doucement, le moteur s'allume loin du tireur (pas de souffle arrière, mais elle sort lente)
    v0=ign>0?Math.min(dv,28+Math.sqrt(c)*40):Math.min(dv,Math.sqrt(2*a*p.L/1000));boost={a,tr:Math.max(0,tb-(ign>0?0:v0/a))+ign,ig:ign,dv,tb,Lm,m1,mc,st2,cant};eta=0;}
  else{
     // Travail du gaz : P(x)=Pmax(1-e^(-x/Lb))e^(-x/Le), puis W=∫P(x)A dx - frottement.
     // Lb décrit la combustion, Le la détente ; le travail ne dépasse pas l'énergie chimique disponible.
     const L=p.L/1000,A=A_mm2/1e6,Lb=Math.max(.012,.06*Math.sqrt(Math.max(.05,c/3.1))*Math.pow(7.62/d,.35)/burn),Le=Math.max(.04,.36*Math.sqrt(Math.max(.05,c/3.1))*Math.pow(7.62/d,.2));
     const k=1/Lb+1/Le,profile=Le*(1-Math.exp(-L/Le))-(1-Math.exp(-L*k))/k;
     const fr=Math.min(5,P*.2)*1e6*A,gasW=Math.max(0,P*1e6*A*profile),work=Math.max(0,gasW-fr*L),available=Q_POWDER*c/1000,cap=available*.42;
     // Le plafond d'énergie masquait le frottement : de 14 cm à 2 m, le Mle 1 gardait 937 m/s. Au-delà de la longueur Lsat où le gaz a
     // tout donné, chaque centimètre de tube en plus ne fait plus que freiner : le frottement s'y applique (Lsat par dichotomie).
     let Lsat=L;if(work>cap){let lo=0,hi=L;for(let n=0;n<28;n++){const m=(lo+hi)/2,pf=Le*(1-Math.exp(-m/Le))-(1-Math.exp(-m*k))/k;if(Math.max(0,P*1e6*A*pf)-fr*m>=cap)hi=m;else lo=m;}Lsat=hi;}
     const muzzleWork=Math.max(0,Math.min(work,cap)-fr*Math.max(0,L-Lsat));eta=muzzleWork/Math.max(1e-9,available);
     v0=Math.sqrt(2*muzzleWork/Math.max(1e-9,mLaunch/1000+c/3000))*(mods.has('manchon')?1.02:1);
   }
  if(K){if(rocket){const top=K.v0;v0=top*(.3+.18*(1-Math.exp(-K.k.barrelLengthCm/40)));boost.tr=Math.max(.05,Math.min(3,K.k.rocketBurn||.35));boost.a=(top-v0)/boost.tr;boost.dv=top;boost.tb=boost.tr;}else v0=K.v0;}
  const vTop=rocket?boost.dv:v0;const E0=.5*m/1000*vTop*vTop;
  // P est la pression de pointe estimée à partir de la charge rapportée au projectile.
  // l'étui qu'il faut pour cette charge, la cartouche entière, ce qu'elle pèse
  const pistol=c/(A_mm2*d)<.002;const CM=CASEMATS[p.caseMat]||CASEMATS.laiton,RM=RIMS[p.rim]||RIMS.sans;
  // l'étui : son diamètre (en calibres), son collet (la longueur qui tient la balle), l'angle de l'épaulement ; le volume de poudre décide du reste
  const Dc=d*(p.caseD??(pistol?1.25:1.45)),neckL=d*(p.neck??1.1),shAng=Math.max(8,Math.min(80,p.shoulder??30)),shL=pistol&&p.caseD==null?0:Math.max(0,(Dc-d)/2)/Math.tan(shAng*Math.PI/180);
  const caseless=CM.k===0;const chargeCaseLen=(c/.85*1000)/(Math.PI*(Dc/2)**2*.8)+neckL*.9+shL*.35;
  // Même avec peu de poudre, la balle doit pouvoir être sertie dans un collet et l'étui garder un corps positif.
  const caseLen=rocket?boost.Lm+l:Math.max(chargeCaseLen,l*.3+d*.8,neckL+shL+d*.5);const caseMass=rocket?mc:(4.2*c+.0012*Dc**3)*CM.k*RM.k;const COL=rocket?caseLen:caseLen+l*.7;
  const rm0=mLaunch+c+caseMass;const salvo=rocket&&A.mortar&&barrels>1?barrels:1;const rm=rm0*salvo;   // un coup de la pièce = une salve : une fusée par tube (masse, coût, caisses comptés en salves)
  const perCrate=Math.max(1,Math.floor(CRATE_KG*1000/rm));
  // la stabilité (Miller) : m en grains, d en pouces, longueur et pas en calibres, v en pieds/s
  // la stabilité : une balle doit être tenue par la rayure ; un dard sous-calibré et une fléchette sont empennés, un plomb est rond
  const t_cal=p.twist/d,l_cal=l/d,d_in=d/25.4;const Sg=K&&K.finStable||pel>1||sub<1||A.mortar||rocket?5:30*(m*15.432)/(t_cal*t_cal*d_in**3*l_cal*(1+l_cal*l_cal))*Math.cbrt(Math.max(1,v0*3.281)/2800);
  const stab=Sg<1?6:Sg<1.3?1.4:1;
  const SD=(mp/1000)/((dpr/1000)**2);const cramped=N.len*d>0?Math.max(0,1-noseLen/(N.len*d)):0;
  const meplat=pel>1?0:Math.max(0,Math.min(.9,p.meplat||0)),fins=rocket?Math.max(0,Math.min(8,Math.round(p.fins||0))):0,finS=p.finSize??1;
  const BC=SD/((pel>1&&!C.dart?2.6:C.dart?1.3:N.i*(1+cramped*.8))*Math.max(.83,1-(p.boat??(p.base==='bt'?.3:0))*.15)*(C.tracer?1.03:1)*(1+meplat*meplat*1.4)*(1+fins*finS*.035)*(1+Math.min(4,p.bands||0)*.01));
  // l'arme : le tube (plus épais si la pression monte), la culasse, la crosse, le chargeur
  const wall=rocket?d*.08*wallx:d*(.35+.00075*P)*wallx;const Dout=d+2*wall;const barrelOne=p.L*Math.PI*((Dout/2)**2-(d/2)**2)*7.85e-6*TP.mass;const barrelKg=barrelOne*barrels;
  const actionKg=(rocket?A.k*(3*d)**3*.3:A.k*COL**3)*(A.multi?1+barrels*.16:1);const ST=STOCKS[p.stock]||STOCKS.bois;
  // La crosse ne s'allonge pas quand seul le tube s'allonge : son volume suit la culasse et le calibre.
  const stockKg=((95+3*COL)/800)**3*ST.kg;const magKg=p.mag*rm/1000*FD.k+FD.fixed;const carriageKg=A.howitzer?(barrelKg+actionKg)*CG.mass*.7:0;const gun=stockKg+barrelKg+actionKg+carriageKg;
  const shield=shieldOf(p);
  const MK={reflex:.004,cannelures:-barrelKg*.2,baionnette:.003+d*.0009,ailettes:barrelKg*.35+.002*d,frein:barrelKg*.06+.0008*d,cacheflamme:barrelKg*.04,manchon:(barrelKg*.12+.0015*d)*Math.pow(Math.max(40,p.supVol??250)/250,.9)*(SUPS[p.supArch]||SUPS.chicanes).kg*(1+.03*(p.supBaffles??5)),poignee:.004+gun*.02,lunette:.008,infrarouge:(.004+Math.max(10,Math.min(150,p.irW??35))*.00012+Math.max(.5,Math.min(1.6,p.irQ??1))*.003),bipied:.01+gun*.08,trepied:.05+gun*.45,roues:.07+gun*.55,bouclier:shield?shield.kg:.02+d*.012};
  const modKg={};let modSum=0;for(const k of mods)if(MK[k]!=null){modKg[k]=MK[k];modSum+=MK[k];}
  const massEmpty=K?K.massKg:gun+modSum;const mass=massEmpty+magKg;
  const impulse=rocket?mLaunch/1000*v0*.15:mLaunch/1000*v0+c/1000*1250;const recoil=impulse*impulse/(2*mass)*(mods.has('frein')?.62:1)*(mods.has('manchon')?.85:1);const rk0=recoil/SHOOTER_KG/(A.mortar?4:1);
  // l'affût qu'il faut : l'épaule tient un recul modéré et une arme légère ; au-delà, bipied, puis trépied — ou une pièce fixe
  const need=K?K.have:rocket?(mass>SHOOTER_KG*.3?'trepied':mass>SHOOTER_KG*.16?'bipied':'epaule'):A.mortar?(d>12?'trepied':d>7?'bipied':'epaule'):A.multi||rk0>1.6||(mass>SHOOTER_KG*.4&&A.auto)||d>11?'trepied':rk0>.8||mass>SHOOTER_KG*.22||d>7.5?'bipied':'epaule';   // une arme à un coup, même lourde (un gros fusil antichar), tient sur bipied : c'est le poids d'une arme qui tire en rafale qui demande un trépied
  // un mortier a son affût : la plaque de base et le bipied font partie de l'arme
  const have=K?K.have:mods.has('trepied')||mods.has('roues')?'trepied':mods.has('bipied')?'bipied':A.mortar?need:'epaule';const mountOk=MOUNTS[have].rank>=MOUNTS[need].rank;
  const rk=rk0*(have==='trepied'?.25:have==='bipied'?.55:ST.rk);
  // les servants : l'arme, son affût et ce qu'il faut de munitions pour tenir (quatre chargeurs, ou 200 coups en bande)
  const supply=(FD.belt?Math.max(200,p.mag*2):Math.max(4*p.mag,20))*rm/1000;const load=mass+supply;
  // L'affût décide de l'équipe, pas la masse seule. Un Meumeu porte environ 0,45 kg ; jusqu'à 0,63 kg il s'en charge encore.
  // Au-delà on ajoute des bras, puis on s'arrête : épaule 1, bipied 2, trépied 4, obusier ou roues 6, pièce ancrée 5.
  // Le surplus se paie en lenteur, pas en une foule de pourvoyeurs.
  const served=MOUNTS[need].rank>MOUNTS[have].rank?need:have;
  const mnt=crewMount(p,A,mods);
  const crewN=teamSize({mass,have:served,supply,feed:FD,...mnt});
  const crew=crewN;const fixed=K?K.fixed:p.carriage==='pieux'||p.carriage==='fixe';
  const roles=Array.from({length:crew},(_,i)=>ROLES[i]||`pourvoyeur ${i-2}`);const setup=K?K.setup:(have==='trepied'?6+2*(crew-1):have==='bipied'?1.5:0)*(A.howitzer?CG.setup:1);
  // la signature : l'éclair (d'autant plus qu'il reste de la poudre à brûler à la bouche), le bruit, le claquement supersonique
  const flash=rocket?Math.max(.15,1-(boost.ig||0)*3):Math.min(1,(1-eta/.32+.15)*Math.sqrt(c/.032)*.6)*(mods.has('cacheflamme')?.2:1)*(mods.has('frein')?1.3:1)*(mods.has('manchon')?.1:1);
  const sup=mods.has('manchon')&&!rocket?supOf(p,c):null;const dB0=(rocket?140:150)+10*Math.log10(Math.max(1e-4,c)/.032)+(mods.has('frein')?4:0);const actDb=A.auto?112:A.mortar?118:100;
  const dB=Math.round(Math.max(actDb,dB0-(sup?sup.R:0)));const vMax=Math.max(v0,vTop||0);const crackDb=vMax>343?Math.round(132+6*Math.log10(Math.max(.2,d)/1.8)+7*Math.min(1.3,vMax/343-1)):0;
  const life=Math.max(50,Math.min(60000,Math.round(9000*(400/Math.max(P,50))**2*(850/Math.max(v0,100))**2.5*Math.max(.6,wallx)*(C.soft&&v0>550?.5:1)*(RM===RIMS.ceinture?1.1:1)*(mods.has('cannelures')?.9:1)*TP.life)));
  // la chaleur : un petit tube se refroidit vite ; la cadence qu'il tient sans surchauffer
  const heatShot=rocket?c/1000*Q_POWDER*.01:c/1000*Q_POWDER*.2;const heatCap=barrelKg*460;const cool=.012*(7.62/d)*(wallx>1?.9:1)*TP.cool;const sustain=Math.round(60*cool*300*heatCap/Math.max(1e-6,heatShot)*(mods.has('cannelures')?1.2:1)*(mods.has('ailettes')?1.8:1)*(caseless?.55:1));
  const rpm=K?.rocket&&barrels>1?60/Math.max(.15,K.k.salvoInterval||.65):ACTIONS[p.action].auto?p.rof:A.rpm;const cyc=K?.rocket&&barrels>1?60/rpm:ACTIONS[p.action].auto?60/p.rof:A.cycle;
  const aim=(.45+7*mass/SHOOTER_KG*(have==='epaule'?1:.35)+.3*(p.L/1000)/BODY_H)*(mods.has('poignee')?.85:1)*(mods.has('lunette')?1.1:1)*(mods.has('reflex')?.85:1)*ST.aim;
  let moa=(1.6+(p.L/d<45?(45-p.L/d)/15:0)+A.disp+C.disp+FD.disp)*TP.moa;moa*=wallx>=1?1/(1+(wallx-1)*.3):1+(1-wallx)*.9;moa*=stab;moa*=have==='trepied'?.55:have==='bipied'?.75:1;if(mods.has('poignee')&&ACTIONS[p.action].auto)moa*=.9;if(rocket)moa+=(4+12/Math.max(1,p.twist/d<40?3:1))*(p.nozzle??1)/(1+fins*finS*.18)*Math.max(.4,1-(p.cant||0)*.03)*(GUIDES[p.guide]||GUIDES.aucun).disp*((p.stages||1)>=2?1.15:1)*(boost.ig?1.2:1);
  moa+=ST.disp;moa*=1-Math.max(-.1,Math.min(.1,((p.neck??1.1)-1.1)*.05))-Math.min(3,p.bands||0)*.025;if(mods.has('cannelures'))moa*=1.04;if(RM===RIMS.bourrelet&&ACTIONS[p.action].auto)moa*=1.05;
  // le plomb nu encrasse le tube au-delà de 550 m/s
  const lead=C.soft&&v0>550;if(lead)moa+=(v0-550)/100;
  // la trajectoire, tous les mètres jusqu'à 600 m
  // (pour une fusée, la poussée continue après le tube : la balle accélère sur quelques mètres, allégée de sa poudre)
  const table=[];{let x=0,v=v0,vx=v0,t=0,y=0,vy=0;const dt=.0002;let next=0;const tr=boost?.tr||0;
    while(x<=600&&(v>60||t<tr)){if(x>=next){table.push({x:next,v,t,drop:-y,E:.5*mp/1000*v*v});next+=1;}
      const drag=.5*RHO_AIR*v*cdG7(v/C_SOUND)*(Math.PI/4)/BC*(t<tr&&boost?mp/(boost.m1+c*(1-t/tr)):1);vx=Math.max(0,vx+((t<tr&&t>=(boost?.ig||0)?boost.a:0)-drag*vx)*dt);vy+=(-G-drag*vy)*dt;x+=vx*dt;y+=vy*dt;v=Math.hypot(vx,vy);t+=dt;}}
  const at=x=>{if(!table.length)return {x,v:0,t:0,drop:0,E:0,beyond:true};const i=Math.min(table.length-1,Math.max(0,Math.floor(x)));const a=table[i],b=table[Math.min(table.length-1,i+1)];const f=Math.max(0,Math.min(1,x-a.x));
    return {x,v:a.v+(b.v-a.v)*f,t:a.t+(b.t-a.t)*f,drop:a.drop+(b.drop-a.drop)*f,E:a.E+(b.E-a.E)*f,beyond:x>table[table.length-1].x};};
  // la hausse : on règle la visée pour toucher juste à `zero` m ; la ligne de visée est 1,2 cm au-dessus de l'axe du canon
  const hs=K?Math.max(.005,(p.kit.sightHeightCm||1.2)/100):Math.max(.005,(p.sightHeight??(mods.has('lunette')?1.8:mods.has('reflex')?1.6:1.2))/100);const th=(at(zero).drop+hs)/Math.max(1,zero);const los=x=>th*x-at(x).drop-hs;
  // la charge explosive : sa masse, le souffle (Hopkinson), les éclats (la chemise brisée en éclats de 4 mg)
  // (V12.8) une coque mince rend au chargement une part de la paroi (thin)
  let he=null;if(C.he){const Sh=SHELLS[p.shell];const hefE=Sh?.thin&&!C.shaped?Math.min(.85,hef+(1-hef)*Sh.thin):hef;const rho=C.rho*(1-hefE)+1.6*hefE;const vol=m/rho;const g=vol*hefE*1.6;const casing=Math.max(0,m-g);
    if(C.shaped){const W=g/1000;const n=Math.round(casing*.2/.004);const vg=2400*Math.sqrt((g/Math.max(1e-6,casing))/(1+g/Math.max(1e-6,casing)/2));
      he={g,casing,vg,W,blast:2.2*Math.cbrt(W),conc:4.5*Math.cbrt(W),stun:7*Math.cbrt(W),inj:3.2*Math.cbrt(W),n,lethal:0,danger:0,safe:0,shaped:true,cls:[],geo:0,dmgB:40*Math.cbrt(W/.004)};}
    else{he=charge(g,casing,p);if(C.inc){he.inc=true;he.fire=Math.max(he.fire||0,8*Math.cbrt(Math.max(1e-9,he.W)));}}}
  // la perforation d'une plaque d'acier (mm), de Marre
  // un noyau plus fin concentre l'effort (le reste de la balle s'écrase autour)
  const coreK=C.core||coreF?1+(.55-(p.coreD??.55))*.6:1;const pen=K&&!C.shaped?K.penAt:v=>C.shaped?C.shaped*d:coreK*C.K*(1+coreF*1.6)*Math.pow(mp,.7)*Math.pow(Math.max(0,v),1.43)/Math.pow(dpr,1.07)*(C.core?1:Math.max(0,Math.min(1,(v-150)/350)));
  // la portée utile : là où un tireur moyen touche encore un Meumeu debout (7 cm × 20 cm) une fois sur trois
  const erf=z=>{const t=1/(1+.3275911*Math.abs(z));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);return z>=0?y:-y;};
  const partsAt=R=>{const r2=at(R+1),r=at(R);const slope=Math.abs(r2.drop-r.drop);const mag=mods.has('lunette')?Math.max(1,Math.min(16,p.sightMag??2)):1;const radius=Math.max(2,Math.min((p.sightRadius??Math.min(32,p.L/10+8)),p.L/10+18));const eye=K?K.aimMrad:mods.has('lunette')?.95/Math.sqrt(mag):mods.has('reflex')?(R<40?1.05:1.5):1.8*32/radius;return {disp:moa*.291*R/1000,aim:eye*(have==='trepied'?.45:have==='bipied'?.65:1)*R/1000*(mods.has('lunette')&&R<15?1.6:1),drop:slope*.12*R};};
  const sigAt=R=>{const q=partsAt(R);return Math.hypot(q.disp,q.aim,q.drop,.004);};
  const hitP=R=>{const sig=sigAt(R);const pHit=erf(.035/(sig*Math.SQRT2))*erf(.1/(sig*Math.SQRT2));if(pel<2)return pHit;
    const cone=(C.spread||20)/1000*R/2;const cover=Math.min(1,(.07*.2)/(Math.PI*cone*cone+1e-9));return Math.min(1,1-Math.pow(1-Math.max(pHit*.6,cover),Math.max(1,pel*.6)));};
  let eff=0,effWhy='frein';for(let R=2;R<=600;R+=2){if(at(R).beyond){effWhy='frein';break;}if(hitP(R)<.33){const q=partsAt(R);effWhy=q.disp>=q.aim&&q.disp>=q.drop?'dispersion':q.aim>=q.drop?'visee':'chute';break;}eff=R;}
  // ce que ça coûte (en caisses) : pour mille coups, pour une arme
  // plomb : le noyau ; cuivre : la chemise et l'étui ; fer : le noyau dur des perforantes ; poudre : la charge (et la charge explosive)
  const core=m*(C.rare?.45:1)*(C.ferx||1);const costK={plomb:C.mono?0:core*(C.ferx>1?.3:C.soft?1:.8)/CRATE_KG,fer:(C.ferx>1?core*.7:coreF*m*.6)/CRATE_KG,cuivre:(core*(C.mono?1:C.soft?0:.2)+caseMass+(C.shaped?m*.3:0))/CRATE_KG,poudre:c/(CRATE_KG*500)*1000+(C.inc?m*.1/CRATE_KG:0)+(C.shaped?m*.3/CRATE_KG:0)+(C.tracer?.05:0),pieces:.15+(C.tracer?.08:0)+(C.he?.2:0)};
  if(C.inc){costK.poudre-=m*.1/CRATE_KG;costK.melange_inc=Math.max(.35,m*.45/CRATE_KG);}
  if(C.shaped)costK.explosifs=(costK.explosifs||0)+m*.45/CRATE_KG;
  // la charge explosive : de la poudre noire, ou des explosifs de l'usine chimique ; la coque et la fusée coûtent des pièces
  // (V12.8) un thermobarique : la tolite du cœur, et son combustible (charbon, fer, essence) — un peu plus que sa masse (les pertes au mélange)
  if(he&&!he.shaped){const F=FILLS[p.fill]||FILLS.tolite;costK.fer=(costK.fer||0)+he.casing*.8/CRATE_KG;costK.plomb=0;costK[F.res]=(costK[F.res]||0)+4*(he.tb?he.tb.gCore:he.g)*F.x/CRATE_KG;if(he.tb)costK[he.tb.fuel]=(costK[he.tb.fuel]||0)+4*he.tb.gFuel*1.15/CRATE_KG;for(const o of [SHELLS[p.shell],FUSES[p.fuse]])for(const [k,v] of Object.entries(o?.cost||{}))costK[k]=(costK[k]||0)+v;}
  if(CM.res!=='cuivre'&&!rocket){const cm=caseMass/CRATE_KG;costK.cuivre=Math.max(0,(costK.cuivre||0)-cm);if(CM.res==='poudre')costK.poudre=(costK.poudre||0)+c/(CRATE_KG*500)*300;else costK[CM.res]=(costK[CM.res]||0)+cm*(CM.res==='pieces'?.6:1);}
  if(rocket){const G=GUIDES[p.guide]||GUIDES.aucun;costK.pieces=(costK.pieces||0)+G.cost+fins*.02+((p.stages||1)>=2?.2:0);}
  if(C.rare)costK[C.rare]=m*.55/CRATE_KG;if(salvo>1)for(const k in costK)costK[k]*=salvo;
  // une mitrailleuse (automatique posée ou servie, ou nourrie par bande) : ses munitions coûtent moitié plus (maillons, caisses, graissage, tri des lots)
  const mg=!K&&!!ACTIONS[p.action]?.auto&&(!!FD.belt||mods.has('bipied')||mods.has('trepied')||mods.has('roues'));if(mg)for(const k in costK)costK[k]*=1.5;for(const k in costK)costK[k]=+costK[k].toFixed(3);
  const costW={fer:Math.max(1,Math.round(massEmpty*1.15+.35)),pieces:+(1+A.cost+FD.cost+(A.howitzer?CG.cost:0)+(p.L>220?1:0)+(wallx>1.3?.5:0)+mods.size*.4+(mods.has('trepied')?1:0)+(mods.has('roues')?1.8:0)+(barrels-1)*.55).toFixed(2),bois:.15,...(mods.has('lunette')||mods.has('reflex')?{cuivre:.3}:{})};if(mods.has('ailettes'))costW.cuivre=+((costW.cuivre||0)+.4).toFixed(2);
  // le matériau du bouclier se paie (l'acier, lui, est déjà dans le fer que réclame la masse de l'arme) ; sans réglage, rien de plus qu'avant
  if(shield?.custom)for(const [r,v] of Object.entries(MATS[shield.mat].cost)){if(r==='fer'&&shield.mat==='acier')continue;costW[r]=+((costW[r]||0)+v*shield.kg/.05).toFixed(2);}if(sup)costW.pieces=+(costW.pieces+.6*sup.A.cost*Math.sqrt(sup.V/250)+sup.n*.08).toFixed(2);if(mods.has('infrarouge')){const I=irOf(p),C=irCostOf(I);costW.cuivre=+((costW.cuivre||0)+C.cuivre).toFixed(2);costW.plomb=+((costW.plomb||0)+C.plomb).toFixed(2);costW.pieces=+(costW.pieces+C.pieces).toFixed(2);}if((FINISHES[p.finish]||{}).gold)costW.cuivre=+((costW.cuivre||0)+.5).toFixed(2);if(K){for(const r in costW)delete costW[r];Object.assign(costW,K.costW);}const hoursW=K?K.hoursW:3+A.hours+FD.cost+(A.howitzer?CG.cost:0)+(p.L>220?2:0)+mods.size*.5+(barrels-1)*.6;
  // Dotation davantage exploitable : elle reste pesée, mais le soldat ne
  // part plus avec une poignée de cartouches avant de dépendre d'un porteur.
  // Même un obus plus lourd que la charge de marche reste rechargeable : le servant
  // transporte au minimum un chargeur complet (ou un coup pour une pièce à coup unique).
  // V12.5 (demande du joueur : « on ne recharge presque jamais ») : 18 % du poids du tireur donnait 901 cartouches à un fusil, 1 731 à un
  // pistolet-mitrailleur. Un tireur seul porte désormais ce qu'on portait vraiment : ~60 coups pour une arme à répétition (douze lames de 5),
  // six chargeurs pour une arme automatique ; jamais plus que ce que permet son poids. Une arme servie (équipe, bande) garde la dotation pesée.
  const carryKg=Math.max(p.mag,Math.floor(.18*SHOOTER_KG*1000/rm));const solo=crew<=1&&!FD.belt;
  const carry=solo?Math.max(p.mag,Math.min(carryKg,A.auto?p.mag*6:Math.max(p.mag*4,Math.ceil(60/p.mag)*p.mag))):carryKg;
  // ce qui entre dans le corps : pour une gerbe, un plomb (ou une fléchette) ; pour un sabot, le dard
  const proj={p:{...p,d:dpr,l:lpr,nose:pel>1&&!C.dart?'ronde':p.nose},m:mp,l:lpr,Sg:Math.max(Sg,pel>1||sub<1?5:Sg),dart:!!C.dart};
  const D={p:{...p,l},Dc,neckL,shL,shAng,caseless,meplat,fins,barrels,salvo,feed:FD,tube:TP,carriage:CG,bull:!!ST.bull,rocket,boost,vTop,m,mp,pel,proj,l,noseLen,v0,E0,P,eta,Sg,stab,BC,SD,A_mm2,caseLen,COL,caseMass,rm,perCrate,mass,massEmpty,recoil,rk,mg,life,heatShot,sustain,rpm,cyc,aim,moa,table,at,pen,eff,effWhy,hitP,costK,costW,hoursW,carry,pistol,sigAt,hef,core:coreF,jacket,wallx,tracer:!!C.tracer,mods:[...mods],modKg,shield,need,have,mountOk,rk0,crew,fixed,roles,setup,supply,flash,ir:mods.has('infrarouge')?irOf(p):null,dB,dB0:Math.round(dB0),actDb,sup:sup&&{V:sup.V,n:sup.n,arch:sup.arch,R:+sup.R.toFixed(1),life:sup.A.life||0,floor:sup.A.floor||1,wet:sup.A.wet||0,wetK:sup.A.wetK||1},crackDb,crack:v0>C_SOUND,zero,hs,los,th,he,lead,human:HUMAN,name:`${fmt(d,1)} × ${fmt(caseLen,caseLen<10?1:0)}`};
  {const base={verrou:.002,bascule:.001,levier:.004,pompe:.004,semi:.006,gaz:.005,recul:.007,auto:.008,rotatif:.004,bouche:.001,culasse:.002}[p.action]??.005;const FDk={interne:.8,boite:1,courbe:1.05,tambour:1.6,bande:1.2,plateau:1.3,tube:1,helicoidal:1.8,tremie:2.2};
    const CMk=CASEMATS[p.caseMat]||CASEMATS.laiton,RMk=p.rim||'sans';let r=base*(FDk[p.feed]||1)*(D.P>460?1+(D.P-460)/200:1)*(p.caseMat==='alu'&&D.P>380?2:1)*(p.caseMat==='polymere'?1.2:1)*(D.caseless?1.5:1)
      *(RMk==='bourrelet'&&['boite','tambour','helicoidal'].includes(p.feed)?1.8:1)*(C.soft&&D.v0>550?2:1)*((p.shoulder??30)>50?1.3:1)*((p.neck??1.1)<.5?1.4:1)*(D.mods.includes('manchon')?1.2:1)*(D.barrels>1&&!ACTIONS[p.action]?.multi?1.3:1);
    D.jam=Math.min(.25,r);D.clear=ACTIONS[p.action]?.auto?4:ACTIONS[p.action]?.mortar?3:1.5;}
  // pour le reste du jeu : la vue (détection), les servants minimum, la poussée, la longueur hors tout
  if(K){K.crew=crew;const per=mass/Math.max(1,crew);const speed=K.fixed?0:K.carr.v*Math.exp(-per/K.carr.k);K.speed=speed;K.crewMin=crew;
    K.mobility=K.fixed?'Fixe sur pieux : on l’a choisi, elle ne bouge plus.':K.wheels?`Sur roues, poussée par ${crew} meumeu. Plus c’est lourd par servant, plus c’est lent.`:crew>1?`Portée par ${crew} meumeu.`:'Épaulée ou portée par un seul servant.';
    D.kit=K;D.overload=K.overload;D.sightMul=K.sightMul;D.sightMag=K.sightMag;D.optic=opticOf(K.sightMag,p.sightObj??K.k?.objectiveMm);D.sightAimMrad=K.aimMrad;D.crewMin=crew;D.pushMps=speed;D.lengthMm=K.lengthMm;D.seeM=K.seeM;D.blastCm=K.blastCm;D.wheels=K.wheels;}
  else{const lu=mods.has('lunette'),mag=lu?Math.max(1,Math.min(16,p.sightMag??2)):1;D.sightMul=lu?1+.27*Math.log2(mag):1;D.sightMag=mag;D.optic=opticOf(mag,p.sightObj);D.crewMin=crew;{const pieux=p.carriage==='pieux'||p.carriage==='fixe';const kgS=mass/Math.max(1,crew);D.pushMps=pieux?0:A.howitzer||have==='trepied'&&mass>8?.86*Math.exp(-kgS/10):.78*Math.exp(-kgS/2.15);D.fixed=pieux;}D.lengthMm=Math.round(p.L+COL*2.4+8+((STOCKS[p.stock]||STOCKS.bois).kg?Math.max(55,60+COL*1.6):COL*.3+6));const radius=Math.max(2,Math.min(p.sightRadius??Math.min(32,p.L/10+8),D.lengthMm/10));D.sightRadius=radius;D.sightAimMrad=lu?.95/Math.sqrt(mag):mods.has('reflex')?1.05:1.8*32/radius;D.seeM=46*(lu?1.15*Math.pow(mag,.74):1.14)*Math.max(.5,Math.min(1.35,radius/28));D.blastCm=0;D.wheels=!!A.howitzer;}
  D.verdicts=verdicts(D,p,C);return D;}
// Ce qu'on en dit, en clair : ses forces, ses défauts — chaque avantage a son prix.
function verdicts(D,p,C){const out=[];const g=t=>out.push({tone:'good',t}),b=t=>out.push({tone:'bad',t}),n=t=>out.push({tone:'',t});
  if(D.Sg<1)b(`Instable en vol (Sg ${fmt(D.Sg,2)}) : la balle bascule, précision catastrophique — raccourcir le pas de rayure`);else if(D.Sg<1.3)b(`Stabilité juste (Sg ${fmt(D.Sg,2)}) : dispersion accrue`);
  if(D.P>620)b(`Pression hors limites (${Math.round(D.P)} MPa) : le tube peut éclater et blesser le tireur`);else if(D.P>460)b(`Pression élevée (${Math.round(D.P)} MPa) : canon usé en ${D.life} coups`);
  if(ACTIONS[p.action]?.mortar)n('Le recul part dans le sol par la plaque de base ; le tube ne tire qu’en cloche');else if(D.rk>.7)b(`Recul intenable (${fmt(D.recoil,2)} J pour un tireur de ${fmt(SHOOTER_KG,1)} kg) : il faut un affût`);else if(D.rk>.35)b(`Recul violent (${fmt(D.recoil,2)} J) : tir lent, rafales dispersées`);else if(D.rk<.1)g(`Recul doux (${fmt(D.recoil,2)} J)`);
  if(D.mass>SHOOTER_KG*.08)b(`Arme lourde (${Math.round(D.mass*1000)} g chargée) : le soldat marche moins vite, vise plus lentement`);
  if(D.eff>=90)g(`Portée utile ${D.eff} m`);else if(D.eff<35)b(`Portée utile ${D.eff} m seulement`);else n(`Portée utile ${D.eff} m`);
  const p30=D.pen(D.at(30).v);if(p30>=2)g(`Perce ${fmt(p30,1)} mm d’acier à 30 m : murs, tôles, casques`);else if(p30<.6)b(`Perce ${fmt(p30,2)} mm d’acier à 30 m : un mur de brique l’arrête`);else n(`Perce ${fmt(p30,1)} mm d’acier à 30 m`);
  if(C.frag<Infinity&&D.v0>C.frag){let r=0;for(let x=0;x<=600;x+=2){if(D.at(x).v>C.frag)r=x;}g(`Se fragmente dans le corps jusqu’à ${r} m`);}
  if(D.carry<120)b(`Munition lourde (${fmt(D.rm,2)} g le coup) : un soldat n’en porte que ${D.carry}, une caisse ${D.perCrate}`);else if(D.carry>450)g(`Munition légère : ${D.carry} coups par soldat, ${D.perCrate} par caisse`);
  if(D.jam!=null){const every=Math.round(1/Math.max(1e-6,D.jam));if(D.jam>.02)b(`Peu fiable : un enrayage tous les ${every} coups environ (${fmt(D.clear,1)} s pour dégager)`);else if(D.jam<.003)g(`Très fiable : un enrayage tous les ${every} coups`);else n(`Fiabilité : un enrayage tous les ${every} coups`);}
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
    // (dans l'air avant l'entrée : à grands pas de 2 mm tant que le pas suivant reste dans l'air — puis à pas fins, l'entrée garde sa précision)
    if(!med&&!inside){const big=Math.max(ds,.002);const nx=add(pr.p,pr.dir,big);if(big>ds&&!medium(nx)){pr.p=nx;continue;}}
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
    for(const q of VESSELS){if(!shapeNear(q.shape,pr.p,dEff/2000))continue;const dd=distTo(q,pr.p);if(dd<dEff/2000){const rv=R.dmg[q.id]??={crush:0,stretch:0,cut:0,frac:0,E:0,at:pr.p.slice()};rv.cut=Math.max(rv.cut,Math.min(1,.3+(dEff/1000)/(2*q.shape.r)*(1-dd/(dEff/2000))));}}
    if(part&&part.kind==='bone'&&dE>.004*R.E0&&pr.v>120&&!pr.bones?.has(part.id)){(pr.bones??=new Set()).add(part.id);rec.frac=1;
      if(pr.main){// l'os casse, dévie la balle, et projette ses propres éclats
        pr.dir=cone(pr.dir,(C?.core?.03:.1)*(pr.v<500?1.6:1),rnd);const n=2+Math.floor(rnd()*4);const mb=pr.m*.03;for(let k=0;k<n;k++)R.spawn.push({p:pr.p.slice(),dir:cone(pr.dir,.8,rnd),v:pr.v*.35,m:mb,d:pr.d0*.5,d0:pr.d0*.5,l:pr.d0*.5,cd:1,yaw:0,neck:Infinity,bone:1});}}
    // la cavité temporaire : l'énergie cédée par centimètre étire autour du trajet
    const eCm=dE/(ds*100);const rtc=.0055*Math.sqrt(Math.max(0,eCm));
    if(rtc>dEff/1000){for(const q of INELASTIC){if(!shapeNear(q.shape,pr.p,rtc))continue;const dd=distTo(q,pr.p);if(dd<rtc){const r2=R.dmg[q.id]??={crush:0,stretch:0,cut:0,frac:0,E:0,at:pr.p.slice()};r2.stretch+=(1-dd/rtc)*ds/q.size*(q.kind==='heart'?.5:1);}}
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

// Les servants nécessaires. L'affût plafonne l'équipe ; le poids ne fait qu'y ajouter des bras, jamais une foule.
// Même appel pour l'atelier ancien, la fiche continue et les canons d'engin (carriage 'none' : pas un affût à roues).
export function crewMount(p,A,mods){
  const k=p?.kit,set=mods?.has?mods:new Set(p?.mods||[]);
  if(k?.carriage){
    const piece=k.receiver==='breech'||(k.receiver==='mortar'&&k.carriage!=='shoulder'&&k.carriage!=='bipod'&&k.carriage!=='none')||!!A?.howitzer;
    return {howitzer:piece,carriage:k.carriage==='emplaced'?'pieux':k.carriage==='none'?'none':(k.carriage==='wheels'||k.carriage==='shield')?'roues':'porte',wheels:k.carriage==='wheels'||k.carriage==='shield'||set.has('roues')};
  }
  return {howitzer:!!A?.howitzer,carriage:p?.carriage,wheels:set.has('roues')};
}
export function teamSize({mass,have,supply=0,feed,howitzer=false,carriage,wheels=false}){
  const haul=SHOOTER_KG*.3*1.4, planted=carriage==='pieux'||carriage==='fixe'||carriage==='plateforme';
  const wheeled=wheels||(howitzer&&carriage!=='none'&&(carriage==='roues'||carriage==='bifleche'||!carriage));
  let cap=have==='epaule'?1:have==='bipied'?2:planted?5:wheeled||howitzer?6:4;
  const base=howitzer?3:have==='trepied'?2:1; cap=Math.max(cap,Math.min(6,base));
  let crew=Math.max(base,Math.min(cap,Math.ceil(Math.max(0,mass)/haul)));
  const belt=!!feed?.belt, extra=!!feed?.crew;
  if((belt||extra)&&crew<cap)crew++;
  else if(supply>SHOOTER_KG*.3*1.2&&crew<cap)crew++;
  return Math.max(1,Math.min(6,crew));}
// Les servants nécessaires quand le porteur ne ressent qu'une part k du poids (la troupe de choc : k = 0,5) — même formule que derive(), jamais plus que D.crew.
export function crewOf(D,k=1){if(!D||k>=1)return D?.crew||1;const A=ACTIONS[D.p?.action]||{};const served=(MOUNTS[D.need]?.rank||0)>(MOUNTS[D.have]?.rank||0)?D.need:D.have;
  const c=teamSize({mass:D.mass*k,have:served,supply:(D.supply||0)*k,feed:D.feed,...crewMount(D.p,A)});
  return Math.max(1,Math.min(D.crew,c));}
export const heavyFor=(D,k=1)=>D.mass*k>SHOOTER_KG*.08;
