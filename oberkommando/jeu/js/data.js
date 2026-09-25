// Aller Simple 3 — tout ce qui se règle est ici.
// Une seule carte, immense et continue. Deux civilisations : les Meumeu, qui partent d'une ville sur la côte, et les Bèè,
// qui tiennent l'autre bout du continent. On ramasse, on bâtit des villes, on les relie (rails, trains, charrettes, avions),
// on arme — et la guerre vient : elle vise les villes, les voies, les dépôts, tout ce qui fait tenir une civilisation.
// Chaque dépôt a son stock : ce qui est ramassé là-bas est là-bas. Un chantier se paie dans les dépôts à moins de RADIUS cases ;
// un soldat recharge ses munitions dans ces mêmes dépôts. Couper les voies d'une armée, c'est la priver de munitions.

export const HOUR_REAL=4;      // secondes réelles par heure de jeu, à 1× : une journée dure une minute et demie
export const DAY=24;
export const NIGHT=[21,5];
export const MAP_N=192;        // cases de côté
export const RADIUS=14;        // un chantier, un soldat, un canon puisent dans les dépôts à moins de RADIUS cases
export const CARRY=10;         // ce qu'un Meumeu porte d'un coup

// Le terrain. walk : on y marche ; build : on y bâtit.
export const TERRAIN=[
  {k:'deep',tex:'zone_shallows',tint:[22,62,92],walk:false,build:false,water:true},
  {k:'shallow',tex:'zone_coast',tint:[52,118,134],walk:false,build:false,water:true},
  {k:'sand',tex:'zone_sand',tint:[214,196,140],walk:true,build:true},
  {k:'grass',tex:'zone_grass',tint:[104,142,70],walk:true,build:true},
  {k:'meadow',tex:'zone_meadow',tint:[130,156,80],walk:true,build:true},
  {k:'dirt',tex:'zone_dirt',tint:[150,120,82],walk:true,build:true},
  {k:'scrub',tex:'zone_scree',tint:[140,128,104],walk:true,build:true},
  {k:'rock',tex:'zone_rock',tint:[112,106,100],walk:false,build:false},
  {k:'snow',tex:'zone_snow',tint:[226,230,236],walk:false,build:false},
];
export const T={deep:0,shallow:1,sand:2,grass:3,meadow:4,dirt:5,scrub:6,rock:7,snow:8};

export const RES={
  bois:{name:'Bois',icon:['p','tree_fir']},
  pierre:{name:'Pierre',icon:['p','outcrop_rock']},
  vivres:{name:'Vivres',icon:['r','common_food']},
  pieces:{name:'Pièces',icon:['r','common_mechanical-parts']},
  carburant:{name:'Carburant',icon:['r','sels-de-brule_fuel-canister']},
  explosifs:{name:'Explosifs',icon:['r','chem_explosif']},
  sante:{name:'Fournitures médicales',icon:['r','soie-de-falaise_fabric-roll']},
  fer:{name:'Fer-de-Cendre',icon:['r','fer-de-cendre_raw'],rare:true},
  sels:{name:'Sels de Brûle',icon:['r','sels-de-brule_raw'],rare:true},
  soie:{name:'Soie de Falaise',icon:['r','soie-de-falaise_fiber'],rare:true},
  verre:{name:'Verre-Qui-Écoute',icon:['r','verre-qui-ecoute_raw'],rare:true},
};
export const RARE=['fer','sels','soie','verre'];
export const GOODS=Object.keys(RES);
export const OUTCROP={fer:'outcrop_fer',sels:'outcrop_sel',verre:'outcrop_verre',soie:'outcrop_teal'};

// Ce qu'on ramasse. left : ce que contient une touffe ; rate : par heure et par Meumeu.
export const NODES={
  tree:{name:'Arbre',res:'bois',left:40,rate:7},
  rock:{name:'Rocher',res:'pierre',left:60,rate:5},
  bush:{name:'Buisson à baies',res:'vivres',left:30,rate:6,regrow:36},
  ore:{name:'Filon',left:900,rate:2.5},
};

// Les bâtiments. size : [i, j] en cases. store : un dépôt, et combien il tient. pop : places de vie. hp : ce qu'il encaisse.
// Un bâtiment à zéro s'effondre : il reste une ruine qu'on rebâtit (sans repayer), ou qu'on déblaie.
export const BUILDINGS={
  centre:{name:'Centre-ville',sprite:'command',size:[4,4],cost:{bois:200,pierre:120,pieces:20},hours:30,store:4000,pop:10,hp:1600,trains:['villageois','charrette'],defense:{range:9,shooters:2},shelter:20,ward:4,
    why:'Le cœur d’une ville : un grand dépôt, dix places de vie, on y forme des Meumeu. Le premier est la capitale : le rare doit y arriver. Tombé, la ville est perdue.'},
  camp:{name:'Camp',sprite:'shelter',size:[2,2],cost:{},hours:5,store:500,hp:300,trains:['charrette'],workers:6,hub:true,
    why:'Un dépôt de poche au bord d’une forêt, de rochers, de buissons : envoyez-y des villageois, ils ramassent tout autour (10 cases) et y rapportent. Ce qui est au camp y reste : charrettes, trains et avions le font circuler.'},
  maison:{name:'Maison',sprite:'dorm',size:[2,2],cost:{bois:30},hours:6,pop:5,hp:350,shelter:5,why:'Cinq places de vie de plus, et un abri pour cinq quand les Bèè sont là.'},
  ferme:{name:'Ferme',sprite:'food',size:[3,3],cost:{bois:35},hours:8,workers:3,makes:{vivres:3.2},hp:300,why:'Trois Meumeu y font des vivres sans fin.'},
  atelier:{name:'Atelier',sprite:'workshop',size:[2,2],cost:{bois:40,pierre:20},hours:8,workers:2,hp:400,recipes:['pieces','carburant'],
    why:'Pièces et carburant, avec du bois et de la pierre. Il prend et range dans le dépôt le plus proche.'},
  mine:{name:'Mine',sprite:'kiln',size:[2,2],cost:{bois:40,pierre:30,pieces:6},hours:10,workers:4,onOre:true,rate:4,hp:500,
    why:'Sur un filon. Quatre Meumeu en sortent le rare quatre fois plus vite qu’à la main. Il faut un dépôt tout près.'},
  gare:{name:'Gare',sprite:'depot',size:[3,2],cost:{bois:40,pierre:30,pieces:8},hours:10,store:1000,station:true,hp:600,trains:['train'],
    why:'Un dépôt au bord de la voie. Les trains y chargent et y déchargent ; on y construit les locomotives.'},
  aerodrome:{name:'Aérodrome',sprite:'hangar',size:[6,2],cost:{pierre:60,bois:30,pieces:12},hours:16,store:600,airfield:true,hp:700,trains:['avion','bombardier'],
    why:'Une piste et un hangar. Avions de transport et bombardiers y chargent, y font le plein, en décollent.'},
  labo:{name:'Laboratoire',sprite:'still',size:[3,3],cost:{bois:80,pierre:60},hours:14,unique:true,hp:500,lab:true,
    why:'Les idées des Meumeu y deviennent des innovations : chaque idée se développe ici, contre des ressources et du temps.'},
  caserne:{name:'Caserne',sprite:'school',size:[3,3],cost:{bois:60,pierre:40},hours:12,hp:800,trains:['soldat','commando'],
    why:'On y forme soldats et commandos, armés d’une conception adoptée : il faut l’arme et ses munitions dans un dépôt proche. Ils rechargent dans les dépôts : une armée loin de ses dépôts finit à sec.'},
  arsenal:{name:'Arsenal',sprite:'chem',size:[2,2],cost:{bois:40,pierre:40,pieces:10},hours:10,workers:2,hp:500,arsenal:true,
    why:'Des munitions de chaque conception adoptée (fer, sels, pièces), et des explosifs. Tout part au dépôt le plus proche, en caisses.'},
  armurerie:{name:'Bureau d’études',sprite:'research',size:[2,2],cost:{bois:40,pierre:30,pieces:10},hours:12,hp:400,design:true,
    why:'On y conçoit les armes : le calibre, l’ogive, la poudre, le canon, la culasse. Un prototype coûte des ressources et du temps ; adopté, il se fabrique.'},
  manufacture:{name:'Manufacture d’armes',sprite:'foundry',size:[3,3],cost:{pierre:80,bois:40,pieces:30,fer:10},hours:20,workers:4,unique:true,hp:900,manufacture:true,
    why:'La seule usine d’armes : chaque conception y demande un outillage. Détruite, l’outillage est perdu — et les plans aussi, s’ils ne sont pas aux archives d’une autre ville.'},
  hopital:{name:'Hôpital',sprite:'lab',size:[3,3],cost:{bois:60,pierre:40,pieces:10},hours:14,hp:600,ward:12,workers:2,trains:['infirmier','medecin'],makesMed:true,
    why:'On y opère et on y guérit tout à fait : le sang revient, les os se ressoudent en trois jours. On y forme infirmiers et médecins, on y fait les fournitures médicales avec de la soie.'},
  tente:{name:'Tente médicale',sprite:'tent',size:[2,2],cost:{bois:5,sante:1},hours:1.5,hp:120,ward:6,store:30,tent:true,
    why:'Le poste de secours avancé : un médecin la plante près du front et y opère — hémostase, ligatures, sutures. On y stabilise, puis on évacue vers l’hôpital. Un petit dépôt : ravitaillez-la en fournitures médicales.'},
  archives:{name:'Archives techniques',sprite:'warehouse',size:[2,2],cost:{pierre:40,bois:20},hours:10,hp:500,archives:true,
    why:'Une copie des plans d’armes. Si la manufacture tombe, les conceptions survivent — à condition que les archives soient loin d’elle (20 cases).'},
  fonderie:{name:'Fonderie',sprite:'boiler',size:[3,2],cost:{pierre:60,pieces:20},hours:14,hp:700,trains:['canon'],
    why:'Des canons, avec du fer. Ils portent loin et abattent les murs, les tours, les maisons.'},
  tour:{name:'Tour',sprite:'turret',size:[2,2],cost:{pierre:50,bois:20},hours:10,hp:1000,defense:{range:11,shooters:3},
    why:'Elle tire seule sur tout Bèè à portée. Plusieurs lignes de tours derrière un mur : la défense en profondeur.'},
  dca:{name:'DCA',sprite:'radio',size:[2,2],cost:{pierre:40,pieces:20},hours:10,hp:600,flak:{range:13,cd:.06},
    why:'Tire sur les avions bèè qui passent. Les obus éclatent là où l’avion sera.'},
};
export const BUILD_ORDER=['camp','maison','ferme','atelier','mine','gare','aerodrome','centre','caserne','arsenal','armurerie','manufacture','hopital','tente','archives','fonderie','tour','dca'];
// le menu de construction, par familles : ce qui fait vivre, ce qui relie, ce qui arme, ce qui soigne, ce qui défend
export const BUILD_CATS=[
  {k:'vivre',name:'Vivre',hint:'ramasser, loger, nourrir',items:['camp','maison','ferme','centre']},
  {k:'produire',name:'Produire',hint:'transformer, extraire le rare',items:['atelier','mine','labo']},
  {k:'relier',name:'Relier',hint:'le fret : rails, gares, pistes',items:['gare','aerodrome'],lines:['rail']},
  {k:'armer',name:'Armer',hint:'concevoir, fabriquer, former',items:['armurerie','manufacture','arsenal','caserne','fonderie','archives']},
  {k:'soigner',name:'Soigner',hint:'la chaîne des soins',items:['hopital','tente']},
  {k:'defendre',name:'Défendre',hint:'tenir les villes',items:['tour','dca'],lines:['mur']}];

// Ce qui se pose case par case, en traçant : les voies ferrées, les murs. Bâti par des Meumeu, payé au dépôt le plus proche.
export const LINES={
  rail:{name:'Voie ferrée',cost:{bois:2,pierre:1},hours:.3,hp:60},
  mur:{name:'Mur',cost:{pierre:4},hours:.6,hp:500,block:true},
};

// Les unités. Personne n'a de « points de vie » : chacun a un corps (body.js), du sang, des os ; la balistique décide.
// speed : cases par heure de jeu ; arm : il porte une arme d'une conception (la caserne la lui donne) ; skill : sa dispersion
// de tireur (milliradians : plus c'est petit, mieux il tire) ; grenades : combien il en porte.
export const UNITS={
  villageois:{name:'Villageois',sheet:'meumeu_colonist',speed:9,cost:{vivres:25},hours:4,pop:1,
    why:'Ramasse, porte, bâtit, répare, éteint les incendies. Sans arme : sous le feu, il court aux abris.'},
  soldat:{name:'Soldat',sheet:'meumeu_guard',speed:8,arm:true,skill:2.2,smoke:1,cost:{vivres:30,pieces:4},hours:3,pop:1,
    why:'Une arme de la conception choisie et les munitions qu’il porte ; il recharge dans les dépôts proches.'},
  commando:{name:'Commando',sheet:'meumeu_heavy-commando',speed:8.5,arm:true,skill:1.6,grenades:3,smoke:2,cost:{vivres:40,pieces:8,fer:2},hours:5,pop:1,
    why:'Mieux entraîné, il tire mieux ; il porte des grenades (explosifs du dépôt) : la guerre des rues.'},
  infirmier:{name:'Infirmier',sheet:'meumeu_assistant',speed:9,medic:true,kits:6,cost:{vivres:30,sante:2},hours:4,pop:1,
    why:'Les premiers secours sous le feu : garrots, pansements, pansement thoracique, plasma. Il porte les blessés à la tente, puis de la tente à l’hôpital.'},
  medecin:{name:'Médecin',sheet:'meumeu_scientist',speed:8.5,medic:true,doctor:true,kits:10,tents:1,cost:{vivres:40,sante:4,pieces:2},hours:8,pop:1,
    why:'Il suit l’armée avec une tente pliée : il la plante près du front et y opère. Sur place : drain thoracique, attelle, morphine, transfusion ; sous la tente : hémostase, ligature, suture. Il trie les blessés.'},
  canon:{name:'Canon',img:'canon',speed:5,range:14,cd:9,vsB:3,dmg:45,hp:160,shell:true,cost:{pieces:40,fer:30,bois:30},hours:8,pop:2,
    why:'Porte à quatorze cases, abat murs, tours et maisons ; ses éclats fauchent tout autour. Un obus : un dixième de caisse d’explosifs.'},
};
// Ce qui éclate : combien d'éclats, leur masse (g), leur calibre (mm), leur vitesse (m/s), la distance où ils ralentissent (m),
// le rayon (cases) où l'on regarde, le souffle (cases) qui tue à coup sûr, les dégâts aux bâtiments.
export const BLASTS={
  grenade:{frags:400,mass:.02,d:1.2,v:1000,lambda:3,radius:.45,blast:.07,dmgB:60,throw:6,fuse:2.5},
  obus:{frags:1500,mass:.05,d:1.8,v:1100,lambda:6,radius:1,blast:.2,dmgB:45},
  bombe:{frags:6000,mass:.2,d:3,v:1400,lambda:12,radius:2.2,blast:.5,dmgB:110},
};
// Les innovations. Les Meumeu qui travaillent ont des idées : à force de couper du bois, de miner, de soigner, de tirer, l'un
// d'eux propose quelque chose. On la développe au laboratoire. Chaque partie tire ses idées dans un ordre différent.
// mod : ce que l'innovation multiplie (voir World.mod).
export const DOMAINS={bois:'Bûcheronnage',pierre:'Carrières',vivres:'Cueillette et fermes',mine:'Mines',atelier:'Ateliers',logistique:'Transports',construction:'Construction',
  armement:'Armement',tir:'Tir',soins:'Soins',defense:'Défense'};
export const INNOV=[
  {id:'scie',dom:'bois',name:'La scie à deux Meumeu',text:'Deux Meumeu de part et d’autre du tronc : l’arbre tombe en moitié moins de coups.',mod:{gather_tree:1.4},cost:{bois:30,pieces:4},hours:6},
  {id:'hache',dom:'bois',name:'La hache à tranchant de fer',text:'Un tranchant trempé qui ne s’émousse pas.',mod:{gather_tree:1.25},cost:{fer:3,bois:10},hours:5},
  {id:'coins',dom:'pierre',name:'Les coins de fer',text:'On fend le rocher en suivant ses veines au lieu de le frapper.',mod:{gather_rock:1.35},cost:{fer:2,bois:10},hours:5},
  {id:'panier',dom:'vivres',name:'Le panier à deux anses',text:'On cueille à deux mains, on porte plus à chaque voyage.',mod:{gather_bush:1.35,ferme:1.1},cost:{bois:15,soie:1},hours:4},
  {id:'assolement',dom:'vivres',name:'L’assolement',text:'Les champs se reposent à tour de rôle : ils donnent plus.',mod:{ferme:1.35},cost:{bois:20,vivres:30},hours:8},
  {id:'boisage',dom:'mine',name:'Le boisage des galeries',text:'Des étais : on creuse plus loin sans que tout s’effondre.',mod:{mine:1.4,gather_ore:1.2},cost:{bois:40,pieces:6},hours:8},
  {id:'wagonnets',dom:'mine',name:'Les wagonnets',text:'Des bacs sur rails dans la galerie : le minerai sort tout seul.',mod:{mine:1.3},cost:{fer:6,bois:20,pieces:8},hours:10},
  {id:'tour_pedale',dom:'atelier',name:'Le tour à pédale',text:'Les pièces sortent régulières, deux fois plus vite à façonner.',mod:{atelier:1.35},cost:{bois:25,pieces:6,fer:2},hours:8},
  {id:'alambic',dom:'atelier',name:'La distillation lente',text:'Moins de bois brûlé pour le même carburant.',mod:{atelier:1.15,carburant_bois:.75},cost:{pieces:8,sels:2},hours:8},
  {id:'ridelles',dom:'logistique',name:'La charrette à ridelles',text:'Des planches sur les côtés : on y entasse moitié plus.',mod:{cap_charrette:1.5},cost:{bois:25,pieces:4},hours:5},
  {id:'baches',dom:'logistique',name:'Les wagons bâchés',text:'On charge jusqu’au toit sans rien perdre en route.',mod:{cap_train:1.3},cost:{soie:4,pieces:10},hours:8},
  {id:'aiguillages',dom:'logistique',name:'Les aiguillages à levier',text:'Moins d’arrêts, des trains qui roulent plus vite.',mod:{vit_train:1.25},cost:{fer:6,pieces:10},hours:10},
  {id:'echafaudages',dom:'construction',name:'Les échafaudages',text:'On bâtit à plusieurs étages en même temps.',mod:{construction:1.35},cost:{bois:40},hours:6},
  {id:'mortier',dom:'construction',name:'Le mortier de cendre',text:'Des murs qui tiennent sous les obus.',mod:{mur:1.5},cost:{pierre:30,sels:2},hours:8},
  {id:'presse',dom:'armement',name:'La presse à étuis',text:'Des étuis emboutis au lieu de tournés : moins de fer par caisse.',mod:{fer_munitions:.75},cost:{fer:8,pieces:12},hours:12},
  {id:'chaine',dom:'armement',name:'La chaîne de montage',text:'Chaque Meumeu ne fait qu’une pièce : les fusils sortent plus vite.',mod:{armement:1.4},cost:{pieces:20,bois:20},hours:12},
  {id:'hausse',dom:'tir',name:'La hausse graduée',text:'Une mire qu’on règle à la distance : on corrige la chute de la balle.',mod:{tir:1.2},cost:{pieces:6,fer:2},hours:8},
  {id:'appui',dom:'tir',name:'Le tir appuyé',text:'On pose l’arme sur un sac, un mur, une pierre : la main ne tremble plus.',mod:{tir:1.12},cost:{soie:2,vivres:20},hours:4},
  {id:'tourniquet',dom:'soins',name:'Le garrot à tourniquet',text:'Un garrot qu’on desserre un peu par heure : le membre tient bien plus longtemps.',mod:{garrot:1.8},cost:{soie:2,sante:2},hours:5},
  {id:'plasma_sec',dom:'soins',name:'Le plasma séché',text:'Une poudre qu’on délaye sur place : deux fois plus de plasma par trousse.',mod:{plasma:2},cost:{sante:4,sels:2},hours:8},
  {id:'brancard',dom:'soins',name:'Le brancard à roues',text:'On évacue un blessé presque au pas de course.',mod:{brancard:1.5},cost:{bois:15,pieces:4},hours:4},
  {id:'antiseptique',dom:'soins',name:'L’antiseptique de sels',text:'On lave les plaies : l’infection d’une panse percée va trois fois moins vite.',mod:{antiseptique:.33},cost:{sels:4,sante:2},hours:8},
  {id:'suture',dom:'soins',name:'La suture rapide',text:'Un fil et une aiguille courbe : on opère en deux fois moins de temps.',mod:{chirurgie:2},cost:{soie:3,sante:2},hours:6},
  {id:'creneaux',dom:'defense',name:'Les créneaux',text:'Des ouvertures étroites dans les tours : un tireur de plus, mieux protégé.',mod:{creneaux:1.34},cost:{pierre:30},hours:6},
  {id:'sacs',dom:'defense',name:'Les sacs de terre',text:'Derrière un mur doublé de sacs, les balles s’arrêtent.',mod:{couvert:1.6},cost:{soie:3,bois:10},hours:5},
];
// Les étapes : ce qu'on fait d'habitude, dans l'ordre, pour se préparer avant la guerre. Rien n'est obligatoire.
export const STEPS=[
  {k:'bois',name:'Couper du bois',hint:'Choisissez des villageois (glisser), clic droit sur un arbre.'},
  {k:'maisons',name:'Deux maisons',hint:'Bâtir → Vivre → Maison : plus de place pour de nouveaux Meumeu.'},
  {k:'camp',name:'Un camp au bord de la forêt',hint:'Bâtir → Vivre → Camp près des arbres, puis clic droit des villageois sur le camp : ils récoltent autour.'},
  {k:'ferme',name:'Une ferme au travail',hint:'Bâtir → Vivre → Ferme, puis envoyez-y trois villageois.'},
  {k:'atelier',name:'Un atelier',hint:'Bâtir → Produire → Atelier : des pièces et du carburant.'},
  {k:'mine',name:'Une mine sur un filon',hint:'Un filon brille sur la carte : Bâtir → Produire → Mine dessus, un camp tout près.'},
  {k:'labo',name:'Un laboratoire',hint:'Bâtir → Produire → Laboratoire : les idées des Meumeu y deviennent des innovations.'},
  {k:'charrette',name:'Une charrette sur une ligne',hint:'Au centre-ville : Construire une charrette, puis Tracer la ligne entre deux dépôts.'},
  {k:'hopital',name:'Un hôpital',hint:'Bâtir → Soigner → Hôpital : on y forme infirmiers et médecins.'},
  {k:'caserne',name:'Une caserne et six soldats',hint:'Bâtir → Armer → Caserne, puis Former des soldats (il faut des fusils au dépôt).'},
  {k:'arsenal',name:'Un arsenal qui tourne',hint:'Bâtir → Armer → Arsenal, deux villageois dedans : il fait les munitions avec du fer et des sels.'},
  {k:'defense',name:'Deux tours et un mur',hint:'Bâtir → Défendre : des tours, un mur tracé devant la ville. La guerre vient.'},
  {k:'rail',name:'Une voie ferrée et une gare',hint:'Bâtir → Relier : tracez une voie, posez une gare à chaque bout, construisez un train.'},
  {k:'escouade',name:'Une escouade avec un médecin',hint:'Choisissez des soldats et un médecin, touche G.'}];
// Les véhicules. cap : caisses ; speed : cases/h ; seats : passagers ; fuel : carburant pour cent cases.
export const VEHICLES={
  charrette:{name:'Charrette',sprite:'hand-cart',cost:{bois:20,pieces:2},hours:3,cap:15,speed:13,
    why:'Sur terre, partout où marche un Meumeu. Lente.'},
  train:{name:'Train',cost:{bois:40,pieces:20,pierre:10},hours:8,cap:80,speed:40,hp:250,
    why:'Une locomotive et quatre wagons, sur les rails : beaucoup, vite, loin. Une voie coupée l’arrête.'},
  avion:{name:'Avion de transport',sprite:'cargo-plane',cost:{pieces:30,carburant:20,bois:20},hours:12,cap:24,seats:8,speed:70,fuel:8,hp:80,
    why:'Par-dessus les montagnes, d’aérodrome en aérodrome, en ligne droite ; huit passagers — des renforts, des médecins, des blessés.'},
  bombardier:{name:'Bombardier',sprite:'cargo-plane',cost:{pieces:60,fer:40,soie:20,carburant:30},hours:24,speed:55,fuel:10,hp:120,bombs:8,
    why:'Huit bombes (une caisse d’explosifs chacune) sur le point qu’on lui donne : maisons, gares, voies, dépôts. La DCA bèè tire dessus.'},
};
// Les recettes. L'atelier et l'arsenal font ce qui manque le plus au dépôt voisin.
export const RECIPES={
  pieces:{name:'Pièces',in:{bois:2,pierre:1},out:{pieces:2},hours:1.5},
  carburant:{name:'Carburant',in:{bois:3},out:{carburant:2},hours:1.5},
  explosifs:{name:'Explosifs',in:{fer:1,sels:1},out:{explosifs:2},hours:2},
  sante:{name:'Fournitures médicales',in:{soie:1},out:{sante:4},hours:3},
};
export const BOMB={dmg:110,radius:2.2,fall:.3,stick:3};   // stick : le chapelet s'étale sur ± stick cases autour de la cible
export const FLAK={flight:.07,spread:1.3,hit:.9,dmg:22};
export const FIRE={hours:6,dps:6};  // un bâtiment qui brûle perd des points jusqu'à ce qu'un Meumeu l'éteigne

// Les Bèè. Leurs villes grossissent, forment des soldats, puis lancent des vagues vers ce qui fait tenir les nôtres.
// Rien avant le jour `first` ; ensuite une vague tous les `every` jours, plus grosse chaque fois ; des bombardiers dès le jour `air`.
// La paix ne dure pas : la guerre éclate entre le jour peace[0] et peace[1], annoncée quelques jours avant.
// Ensuite une vague tous les `every` jours, plus grosse chaque fois ; leurs bombardiers `air` jours après la déclaration.
export const BEEE={cities:2,peace:[14,18],every:2.2,wave:3,grow:2,air:5,airEvery:1.6,garrison:8,buildEvery:18,cap:40,
  units:{
    soldat:{name:'Soldat bèè',sheet:'beee_pathfinder-soldier',speed:7.5,arm:'bee_fusil',skill:2.4},
    commando:{name:'Commando bèè',sheet:'beee_mountain-commando',speed:8,arm:'bee_pm',skill:1.8,grenades:3,smoke:1},
    canon:{name:'Canon bèè',img:'canon',speed:4.5,range:13,cd:10,vsB:3,dmg:40,hp:150,shell:true},
  }};

export const START={villagers:8,stock:{bois:200,pierre:80,vivres:250,pieces:30,carburant:20,explosifs:6,sante:8,'a:mle1':10,'m:mle1':8,'p:casque':10,'p:gilet':2}};
export const GOAL=100;
export const NAMES=['Biscotte','Praline','Nougat','Réglisse','Cannelle','Muscade','Pistache','Cachou','Grelot','Clochette','Berlingot','Roudoudou','Cardamome','Guimauve','Chicorée','Pâquerette','Tilleul','Semoule','Griotte','Amandine','Fleurette','Noisette','Caramel','Violette','Bergamote','Sucre','Mirabelle','Câpre','Marelle','Galette','Brioche','Dragée','Vanille','Sésame','Cerise','Myrtille'];
export const CITY_NAMES=['Meumeuville','Port-Biscotte','Praline-sur-Mer','Val-Nougat','Cannelle-les-Mines','Fort-Réglisse','Grelotin'];
export const BEEE_CITIES=['Bèèbourg','Fort-Bèè','Bèèlune','Crève-Laine'];
export const VEHICLE_NAMES=['Mésange','Fauvette','Martinet','Bourdon','Hirondelle','Scarabée','Libellule','Moineau','Colibri','Pinson','Grive','Rouge-gorge','Loriot','Bouvreuil','Sittelle','Mouette'];
