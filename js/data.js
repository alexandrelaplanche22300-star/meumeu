// Oberkommando der Meumeu — tout ce qui se règle est ici.
import {bunkerDefs,BUNKER_IDS,bunkerKey} from './bunkerdata.js';
// Une seule carte, immense et continue. Deux civilisations : les Meumeu, qui partent d'une ville sur la côte, et les Bèè,
// qui tiennent l'autre bout du continent. On ramasse, on bâtit des villes, on les relie (rails, trains, porteurs),
// on arme — et la guerre vient : elle vise les villes, les voies, les dépôts, tout ce qui fait tenir une civilisation.
// Chaque dépôt a son stock : ce qui est ramassé là-bas est là-bas. Un chantier se paie dans les dépôts à moins de RADIUS cases ;
// un soldat recharge ses munitions dans ces mêmes dépôts. Couper les voies d'une armée, c'est la priver de munitions.
// Chaque usine ne fait qu'une chose, prend ses matières à un dépôt et livre à un autre (le joueur les choisit) ; ses machines
// brûlent du charbon. Ce qui manque à un dépôt devient une commande : le bureau du fret y envoie trains et porteurs,
// dans l'ordre des priorités. Ces règles valent pour les deux camps.

export const HOUR_REAL=4;      // base de la simulation ; le ralenti du cycle est appliqué par l'interface
export const DAY=24;
export const NIGHT=[17,8];   // quinze heures de noir : temps de gagner l'objectif et de décrocher
export const MAP_N_MER=1500;   // V12.5 : la carte « mer » — un rectangle de 1 500 × 600 (2,5 fois la carte de 600) : 600 de terre, 300 de mer, 600 de terre.
// La grille reste carrée (1 500 × 1 500, tout le code suppose N × N) ; ce qui est hors du rectangle (lignes 450 à 1 050 jouables) est de la mer profonde.
export const SEA_RECT={y0:450,y1:1050};
export const MAP_N_V2=1200;   // V12.5 : la carte normale V2 — deux fois plus grande, des grappes de gisements espacées (gen.js), des villes plus espacées (world.mapK)
export const MAP_N=600;        // cases de côté (V12.4 : 440 → 600, demande du joueur : un front grand et dur à tenir ; capitale ↔ Bèè : ~450 cases)
// un chantier, un soldat, un canon puisent dans les dépôts à moins de RADIUS cases (un dépôt sert tout un quartier)
export const RADIUS=32;
export const CARRY=10;         // ce qu'un Meumeu porte d'un coup
export const GAP=2;
export const SITE_RANGE=36;    // les bâtisseurs vont à pied au dépôt du chantier

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
  pierre:{name:'Pierre',icon:['p','outcrop_pale']},
  vivres:{name:'Vivres',icon:['r','common_food']},
  pieces:{name:'Pièces',icon:['r','common_mechanical-parts']},
  carburant:{name:'Carburant',icon:['r','sels-de-brule_fuel-canister']},
  explosifs:{name:'Explosifs',icon:['r','chem_explosif']},
  melange_inc:{name:'Mélange incendiaire',icon:['r','chem_explosif']},
  explosifs_brisants:{name:'Explosifs brisants',icon:['r','chem_explosif']},
  mine:{name:'Mines',icon:['r','chem_explosif']},
  sante:{name:'Fournitures médicales',icon:['r','soie-de-falaise_fabric-roll']},
  charbon:{name:'Charbon',icon:['r','chem_charbon']},
  // l'industrie : le fer fait les armes, les pièces, les plaques ; le plomb le noyau des balles, le cuivre la chemise et
  // l'étui ; le salpêtre (avec du charbon), à l'usine chimique, la poudre et les explosifs
  fer:{name:'Fer',icon:['r','fer-de-cendre_raw']},
  cuivre:{name:'Cuivre',icon:['r','fer-de-cendre_ingots']},
  plomb:{name:'Plomb',icon:['r','chem_residu']},
  salpetre:{name:'Salpêtre',icon:['r','chem_divers']},
  poudre:{name:'Poudre',icon:['r','chem_explosif']},
  // l'équipement des commandos : des jumelles (atelier), une tenue camouflée, des jumelles infrarouges (chères)
  jumelles:{name:'Jumelles',icon:['r','common_mechanical-parts']},
  tenue_camo:{name:'Tenues camouflées',icon:['r','soie-de-falaise_fabric-roll']},
  jumelles_ir:{name:'Jumelles infrarouges',icon:['r','common_mechanical-parts']},
  batterie:{name:'Batteries infrarouges',icon:['r','common_mechanical-parts']},
};
// plus de ressource rare : tout se fait avec le commun
export const RARE=[];
export const GOODS=Object.keys(RES);
export const OUTCROP={fer:'outcrop_fer',charbon:'outcrop_charbon',pierre:'outcrop_pale',cuivre:'outcrop_green',plomb:'outcrop_goudron',salpetre:'outcrop_rock'};
// la couleur de chaque gisement sur la carte et la mini-carte
export const ORE_COL={fer:'#ff6a2a',charbon:'#2a2d31',pierre:'#d8d2c4',cuivre:'#8ccf4a',plomb:'#5d6b7c',salpetre:'#f4f1e6'};
// les filons communs : plus riches que le rare
export const ORE_LEFT={charbon:14000,fer:20000,pierre:20000,cuivre:10000,plomb:10000,salpetre:10000};
// les gisements du commun, et où les chercher (près de la capitale : de quoi démarrer ; loin : à relier par le rail)
export const COMMON_ORES=['pierre','charbon','fer','cuivre','plomb','salpetre'];   // la pierre : de gros gisements, une mine dessus
// Les familles de fret : un véhicule peut n'en porter que certaines (un train de charbon, un porteur de munitions).
export const FAMILIES={
  materiaux:{name:'Matériaux',goods:['bois','pierre']},
  minerais:{name:'Minerais',goods:['fer','cuivre','plomb','salpetre']},
  energie:{name:'Charbon',goods:['charbon']},
  industrie:{name:'Pièces',goods:['pieces']},
  vivres:{name:'Vivres',goods:['vivres']},
  guerre:{name:'Guerre',goods:['explosifs','melange_inc','explosifs_brisants','mine','sante','batterie'],prefix:['m:','a:','p:']},
};
export const familyOf=k=>{for(const [f,F] of Object.entries(FAMILIES))if(F.goods.includes(k)||(F.prefix||[]).some(p=>k.startsWith(p)))return f;return 'materiaux';};
// Le fret : une usine commande de quoi faire BUF lots d'avance (au moins BUF_H heures de travail) ; un porteur sert les
// dépôts à CART_RANGE cases de sa base ; une locomotive brûle COAL_PER_CASE charbon par case et part le tender plein.
export const FRET={BUF:3,BUF_H:6,CART_RANGE:60,TENDER:12,COAL_PER_CASE:.05,LOOK:.5,EVAC_HI:.6,EVAC_LO:.35};
export const PRIO=['','Basse','Réduite','Normale','Haute','Urgente'];

// Ce qu'on ramasse. left : ce que contient une touffe ; rate : par heure et par Meumeu.
export const NODES={
  tree:{name:'Arbre',res:'bois',left:40,rate:7},
  rock:{name:'Rocher',res:'pierre',left:60,rate:5,regrow:720},   // regrow : heures pour se regarnir entièrement (V12.5 ; les arbres ne repoussent pas)
  bush:{name:'Buisson à baies',res:'vivres',left:30,rate:6,regrow:36},
  ore:{name:'Filon',left:900,rate:2.5,regrow:1440},
};

// Les bâtiments. size : [i, j] en cases. store : un dépôt, et combien il tient. pop : places de vie. hp : ce qu'il encaisse.
// Un bâtiment à zéro s'effondre : il reste une ruine qu'on rebâtit (sans repayer), ou qu'on déblaie.
export const BUILDINGS={
  centre:{name:'Centre-ville',sprite:'command',big:true,size:[4,4],cost:{bois:200,pierre:150,pieces:20},hours:30,store:4000,pop:10,hp:1600,trains:['villageois'],defense:{range:9,shooters:2},shelter:Infinity,   /* (V12.5 : un abri sans limite pour toute la ville) */ward:4,
    why:'Le cœur d’une ville : un grand dépôt, dix places de vie, on y forme des Meumeu. Le premier est la capitale : le rare doit y arriver. Tombé, la ville est perdue.'},
  camp:{name:'Camp-dépôt',sprite:'shelter',size:[2,2],cost:{},hours:5,store:500,hp:300,workers:6,hub:true,
    why:'Dépôt avancé gratuit : posez-le d’abord près d’un filon, sans autre dépôt à proximité. Envoyez des villageois le bâtir ; il stocke les matériaux de la mine et de la gare, et ses travailleurs récoltent autour (10 cases).'},
  maison:{name:'Maison',sprite:'dorm',size:[2,2],cost:{bois:30},hours:6,pop:5,hp:350,shelter:5,why:'Cinq places de vie de plus, et un abri pour cinq quand les Bèè sont là.'},
  // la ferme n'est plus au menu des Meumeu : le moulin la remplace (l'intendance bèè s'en sert encore)
  ferme:{name:'Ferme',sprite:'food',size:[3,3],cost:{bois:35},hours:8,workers:3,makes:{vivres:.5},soil:true,hp:300,hidden:true,why:'Une ferme bèè : ses fermiers nourrissent la ville.'},
  // le moulin : quatre ouvriers sur une terre moyenne récoltent ~3,5 blé/h, moulus en ~2,4 vivres/h — vingt Meumeu (0,12/h chacun)
  moulin:{name:'Moulin',sprite:'windmill',size:[3,3],cost:{bois:45,pierre:20,pieces:4},hours:9,workers:4,makes:{vivres:.67},ble:1.45,soil:true,hp:360,why:'Un domaine de 3×3 : le moulin au centre, huit champs de blé autour. Ses quatre ouvriers récoltent le blé et le moulent en vivres : sur une terre moyenne, de quoi nourrir une quarantaine de Meumeu. Le rendement dépend de la fertilité des huit champs (touche F) ; un cratère n’y fait plus rien pousser.'},
  grenier:{name:'Grenier',sprite:'warehouse',size:[2,2],cost:{bois:20},hours:5,store:800,foodOnly:true,hp:350,why:'Un dépôt consacré aux vivres, au bord des champs : ses porteurs les apportent aux villes.'},
  atelier:{name:'Atelier',sprite:'workshop',size:[2,2],cost:{bois:40,pierre:20},hours:8,workers:2,hp:400,factory:{coal:.2,mod:'atelier'},
    why:'Des pièces : une production à la fois. Il prend ses matières à son dépôt d’approvisionnement, livre à son dépôt de sortie, et ses tours brûlent du charbon.'},
  four:{name:'Four à charbon de bois',sprite:'charcoal',size:[2,2],cost:{bois:20,pierre:20},hours:6,workers:2,hp:300,factory:{coal:0,mod:'atelier'},
    why:'Une meule de bois qui couve : quatre caisses de bois donnent une caisse de charbon. Lent, mais partout — en attendant un vrai filon.'},
  mine:{name:'Mine',sprite:'kiln',size:[2,2],cost:{bois:40,pierre:30,pieces:6},hours:10,workers:4,onOre:true,rate:4,hp:500,
    why:'Sur un filon. Quatre Meumeu en sortent le rare quatre fois plus vite qu’à la main. Il faut un dépôt tout près.'},
  gare:{name:'Gare',sprite:'depot',size:[3,2],cost:{bois:70},hours:10,store:1500,station:true,hp:600,trains:['train'],
    why:'Un dépôt au bord de la voie. Si la voie rejoint déjà une gare, le chantier sert de tête de ligne : les trains y apportent le bois sans autre dépôt. Sinon, posez d’abord un camp-dépôt gratuit. On y construit les locomotives.'},
  entrepot:{name:'Entrepôt',sprite:'warehouse',big:true,size:[3,3],cost:{bois:80},hours:10,store:2500,hp:700,
    why:'Un grand dépôt, sans voie : au cœur d’un quartier d’usines, au pied d’une mine. Réglez sa priorité et ses demandes : le fret le remplit.'},
  labo:{name:'Laboratoire',sprite:'still',size:[3,3],cost:{bois:80,pierre:70},hours:14,hp:500,lab:true,
    why:'Paillasses, cornues, balances : les savants y mènent les expériences des projets d’agronomie, de géologie, de médecine et de chimie. Cinq places. Cliquez dessus : le toit s’ouvre sur la vue recherche.'},
  // V12.6 : le centre de recherche — l'école des savants, leurs bureaux, le tableau noir, la salle de réunion
  centre_recherche:{name:'Centre de recherche',sprite:'research',size:[5,4],cost:{bois:120,pierre:140,pieces:20},hours:24,hp:900,lab:true,
    why:'On y forme des savants (un villageois, des vivres, une journée d’école), on y fait la théorie des projets au tableau noir, on s’y réunit autour de la grande table. Dix places. Cliquez dessus : le toit s’ouvre sur la vue recherche.'},
  caserne:{name:'Caserne',sprite:'school',size:[3,3],cost:{bois:60,pierre:50},stock0:{'a:mle1':4,'m:mle1':2,vivres:60,pieces:8},hours:12,hp:800,trains:['soldat'],
    why:'On y forme ceux qu’on y envoie : ils s’entraînent, puis sortent armés d’une conception adoptée. Un soldat devient commando par son équipement : charges, tenue camouflée, jumelles, arme. Loin des dépôts, le porteur de munitions ravitaille l’escouade.'},
  caserne_elite:{name:'Caserne d’élite',sprite:'school',size:[3,3],cost:{bois:90,pierre:110,fer:30,pieces:16},stock0:{vivres:60},hours:20,hp:1100,trains:['choc'],
    why:'On y forme la troupe de choc : un civil, des vivres pour une longue formation, puis l’arme et la protection choisies au dépôt.'},
  poudrerie:{name:'Usine chimique',sprite:'motor',size:[2,2],cost:{bois:40,pierre:50,pieces:6},hours:10,workers:3,hp:350,factory:{coal:.15,mod:'armement'},
    why:'Le salpêtre et le charbon, traités, broyés, mêlés : la poudre des cartouches, ou des explosifs (obus, charges de démolition). Une seule production à la fois. Loin des maisons : ça saute. Son atelier pilote reçoit trois savants : l’essai des projets de chimie, et des chimistes qui pressent la production.'},
  arsenal:{name:'Arsenal',sprite:'chem',size:[2,2],cost:{bois:40,pierre:50,pieces:10},hours:10,workers:2,hp:500,arsenal:true,factory:{coal:.25,mod:'armement'},
    why:'Les munitions d’une conception adoptée — plomb pour les balles, cuivre pour les étuis, poudre, pièces : une seule production par arsenal. Tout part en caisses au dépôt de sortie.'},
  armurerie:{name:'Bureau d’études',sprite:'research',size:[2,2],cost:{bois:40,pierre:30,pieces:10},hours:12,hp:400,design:true,
    why:'On y conçoit les armes : le calibre, l’ogive, la poudre, le canon, la culasse. Un prototype coûte des ressources et du temps ; adopté, il se fabrique. Trois planches à dessin pour les savants : les plans des projets de mécanique et de balistique, et des ingénieurs qui pressent les prototypes.'},
  manufacture:{name:'Manufacture d’armes',sprite:'foundry',size:[3,3],cost:{pierre:100,bois:40,pieces:30,fer:10},hours:20,workers:4,hp:900,manufacture:true,factory:{coal:.3,mod:'armement'},
    why:'Une usine d’armes, outillée pour un seul modèle (fusil ou protection) : changer de modèle, c’est refaire l’outillage (6 h). Quand la dernière tombe, les plans sont perdus — sauf des archives dans une autre ville.'},
  // le garage : les véhicules meumeu (jeeps, automitrailleuse, char, automoteur) — fer, pièces, et les armes montées prises au dépôt ; long à produire
  garage:{name:'Garage',sprite:'foundry',size:[4,4],cost:{pierre:120,bois:70,fer:40,pieces:30},hours:24,hp:1100,trains:['jeep','jeep_mg','automitrailleuse','char','automoteur'],
    why:'On y monte les véhicules : du fer, des pièces, et les armes qu’on y installe (prises au dépôt). Une jeep en une demi-journée ; un char, trois jours. Ils sortent sans équipage : envoyez-y des Meumeu.'},
  hopital:{name:'Hôpital',sprite:'lab',stock0:{vivres:40,sante:8},size:[3,3],cost:{bois:60,pierre:50,pieces:10},hours:14,hp:600,ward:12,workers:2,trains:['infirmier','medecin'],makesMed:true,factory:{coal:0,mod:'soins'},
    why:'On y opère et on y guérit tout à fait : le sang revient, les os se ressoudent en trois jours. On y forme infirmiers et médecins, on y fait les fournitures médicales avec des pièces.'},
  tente:{name:'Tente médicale',sprite:'tent',size:[2,2],cost:{bois:5,sante:1},hours:1.5,hp:120,ward:6,store:30,tent:true,
    why:'Le poste de secours avancé : un médecin la plante près du front et y opère — hémostase, ligatures, sutures. On y stabilise, puis on évacue vers l’hôpital. Un petit dépôt : ravitaillez-la en fournitures médicales.'},
  archives:{name:'Archives techniques',sprite:'loom',size:[2,2],cost:{pierre:40,bois:20},hours:10,hp:500,archives:true,
    why:'Une copie des plans d’armes. Si la manufacture tombe, les conceptions survivent — à condition que les archives soient loin d’elle (20 cases).'},
  fonderie:{name:'Fonderie',sprite:'boiler',size:[3,2],cost:{pierre:80,pieces:20},stock0:{pieces:40,fer:30,bois:30,charbon:10},hours:14,hp:700,trains:['canon'],
    why:'Des canons, avec du fer. Ils portent loin et abattent les murs, les tours, les maisons.'},
  hangar:{name:'Hangar',sprite:'foundry',size:[9,7],cost:{pierre:80,bois:140,fer:60,pieces:40},hours:30,hp:1200,store:300,trains:['avion','planeur','planeur_lourd'],needsRunway:true,
    why:'À bâtir à côté d’une piste (44 cases de long, 3 de large, posées par les villageois : onglet Relier). On y construit l’avion de transport et les planeurs, qui sortent sur la piste. C’est aussi un dépôt : on y charge les caisses du pont aérien.'},
  barge:{name:'Barge de débarquement',sprite:'foundry',size:[4,2],cost:{},hours:1,hp:1,coastal:true,launch:'barge',faction:'meumeu',
    why:'À poser sur la plage, au bord de l’eau : les villageois construisent la barge sur place ; finie, elle glisse à l’eau devant le chantier. Chargez-la (soldats, véhicule, caisses), puis clic droit sur la plage d’en face.'},
  grande_barge:{name:'Grande barge de débarquement',sprite:'foundry',size:[7,3],cost:{},hours:1,hp:1,coastal:true,launch:'grande_barge',faction:'meumeu',
    why:'La barge des blindés, à poser sur une grande plage : quarante soldats et des véhicules à la file sur le pont (deux automitrailleuses à canon, une automitrailleuse à canon et un automoteur, ou trois jeeps), deux mitrailleuses lourdes sur le roof (deux mitrailleurs à bord, des caisses dans la soute). Plus chère et plus lente que la barge.'},
  bateau_bee:{name:'Bateau bèè',sprite:'foundry',size:[4,2],cost:{},hours:1,hp:1,coastal:true,launch:'bateau_bee',faction:'beee',
    why:'Les Bèè construisent leurs bateaux sur leur plage ; finis, ils glissent à l’eau.'},
  tour:{name:'Tour',sprite:'turret',size:[2,2],cost:{pierre:50,bois:20},hours:10,hp:1000,defense:{range:11,shooters:3},
    why:'Elle tire seule sur tout Bèè à portée. Plusieurs lignes de tours derrière un mur : la défense en profondeur.'},
};
// V12.5 : les bunkers — dix-sept plans (bunkerdata.js), chacun un bâtiment « bk_<plan> » ; leur empreinte est celle du plan, tournée à la pose (b.rot)
Object.assign(BUILDINGS,bunkerDefs());
export const BUILD_ORDER=['camp','maison','moulin','grenier','atelier','four','mine','poudrerie','gare','entrepot','centre','caserne','arsenal','armurerie','manufacture','hopital','tente','archives','centre_recherche','fonderie','barge','grande_barge','hangar','tour',...BUNKER_IDS.map(bunkerKey)];
// le menu de construction, par familles : ce qui fait vivre, ce qui relie, ce qui arme, ce qui soigne, ce qui défend
export const BUILD_CATS=[
  {k:'vivre',name:'Vivre',hint:'ramasser, nourrir, fonder des villes',items:['camp','moulin','grenier','maison','centre']},
  {k:'produire',name:'Produire',hint:'extraire, transformer : une usine, une production',items:['mine','four','atelier','poudrerie']},
  {k:'chercher',name:'Chercher',hint:'savants, projets, réunions : le centre de recherche forme les savants ; théorie au centre, expériences au laboratoire, plans au bureau d’études, essais à l’usine chimique',items:['centre_recherche','labo','armurerie','poudrerie']},
  {k:'relier',name:'Relier',hint:'camp-dépôt gratuit d’abord, puis mine, gare et fret',items:['camp','gare','entrepot'],lines:['rail']},
  {k:'armer',name:'Armer',hint:'concevoir, fabriquer, former',items:['armurerie','manufacture','arsenal','caserne','caserne_elite','garage','fonderie','barge','grande_barge','archives']},
  {k:'soigner',name:'Soigner',hint:'la chaîne des soins',items:['hopital','tente']},
  {k:'defendre',name:'Défendre',hint:'tenir les villes',items:['tour',...BUNKER_IDS.map(bunkerKey)],lines:['sacs','fosses','mines']}];

// Ce qui se pose case par case, en traçant : les voies ferrées, les murs. Bâti par des Meumeu, payé au dépôt le plus proche.
export const LINES={
  rail:{name:'Voie ferrée',cost:{bois:1,pierre:.5},hours:.12,hp:60},
  mur:{name:'Mur',cost:{pierre:4},hours:.6,hp:500,block:true},
  piste:{name:'Piste',cost:{pierre:.6,bois:.2},hours:.2,hp:150},   // (V12.5) une bande de 3 cases de large ; 44 cases de long au moins : une piste d'avion
  mines:{name:'Mines',cost:{mine:1},hours:.2,hp:30},   // (V12.5) une mine par case, invisible de l'ennemi tant qu'elle n'a pas sauté près de lui
  fosses:{name:'Fosses et boyaux',cost:{bois:.4},hours:.5,hp:260},   // (V12.5) un trou dans le sol, parapet de terre : bon couvert, on y entre et on y circule (les cases voisines forment un boyau)
  sacs:{name:'Sacs de sable',cost:{pierre:1,bois:.5},hours:.25,hp:220},   // (V12.5) un parapet bas : couvre le tireur à genou ou couché, ne gêne pas la marche
};

// Les unités. Personne n'a de « points de vie » : chacun a un corps (body.js), du sang, des os ; la balistique décide.
// speed : cases par heure de jeu ; arm : il porte une arme d'une conception (la caserne la lui donne) ; skill : sa dispersion
// de tireur (milliradians : plus c'est petit, mieux il tire) ; smoke : ses fumigènes.
export const UNITS={
  villageois:{name:'Villageois',sheet:'meumeu_colonist',speed:9,cost:{vivres:25},hours:4,pop:1,
    why:'Ramasse, porte, bâtit, répare, éteint les incendies. Sans arme : sous le feu, il court aux abris.'},
  soldat:{name:'Soldat',sheet:'meumeu_scout-commando',speed:8,arm:true,skill:2.2,smoke:1,cost:{vivres:30,pieces:4},hours:3,pop:1,
    why:'Une arme de la conception choisie et les munitions qu’il porte ; il recharge dans les dépôts proches.'},
  eclaireur:{name:'Éclaireur',sheet:'meumeu_scout-commando',speed:10,arm:true,skill:2,scout:1.6,camo:.5,smoke:2,cost:{},hours:3,pop:1,
    why:'Voit loin et se fond dans le paysage : repère villes, colonnes et batteries, suit une armée sans se montrer, corrige le tir des pièces. Il ne tire que s’il est découvert.'},
  tireur:{name:'Tireur d’élite',sheet:'meumeu_scout-commando',speed:8,arm:true,skill:1.1,scout:1.25,camo:.45,sniper:true,cost:{},hours:3,pop:1,
    why:'Caché, il tire rarement et choisit : le servant d’une pièce, un éclaireur, un infirmier, un chef. Après deux coups, il change de place.'},
  // plus formé à la caserne : un soldat devient commando par son équipement (le type sert encore aux Bèè et aux essais)
  commando:{name:'Commando',sheet:'meumeu_heavy-commando',speed:8.5,arm:true,skill:1.6,camo:.8,smoke:2,cost:{},hours:5,pop:1,
    why:'Mieux entraîné, il tire mieux ; il porte des fumigènes, et des charges de démolition si on lui en donne.'},
  // V12.4 : la troupe de choc, formée à la caserne d'élite et payée en vivres (la formation nourrit longtemps) : plus de vie (elle tient une plus grande
  // perte de sang), plus dure aux blessures (saigne moins, tombe moins de choc, souffre moins), et le poids de son arme et de sa protection ne la gêne
  // qu'à moitié. choc.vit : seuils de perte de sang × vit ; choc.tough : saignements, risque de choc et douleur × tough ; choc.load : part du poids ressentie
  choc:{name:'Troupe de choc',sheet:'meumeu_heavy-commando',speed:8.5,arm:true,skill:1.5,smoke:2,cost:{vivres:20},hours:10,drill:24,pop:1,choc:{vit:1.3,tough:.6,load:.5},
    why:'L’élite d’assaut, formée 24 h à la caserne d’élite (peu de vivres, beaucoup de temps) : plus de vie, saigne moins, tombe moins ; poids et recul ressentis de moitié ; sang-froid (se remet 2,5× plus vite de la suppression, 2× plus vite d’un étourdissement) ; visée rapide (change de cible 30 % plus vite) ; vue 15 % plus longue ; deux fumigènes.'},
  infirmier:{name:'Infirmier',sheet:'meumeu_assistant',speed:9,medic:true,kits:6,cost:{vivres:30,sante:2},hours:4,pop:1,
    why:'Les premiers secours sous le feu : garrots, pansements, pansement thoracique, plasma. Il porte les blessés à la tente, puis de la tente à l’hôpital.'},
  medecin:{name:'Médecin',sheet:'meumeu_scientist',speed:8.5,medic:true,doctor:true,kits:10,tents:1,cost:{vivres:40,sante:4,pieces:2},hours:8,pop:1,
    why:'Il suit l’armée avec une tente pliée : il la plante près du front et y opère. Sur place : drain thoracique, attelle, morphine, transfusion ; sous la tente : hémostase, ligature, suture. Il trie les blessés.'},
  // V12.6 : le savant, formé au centre de recherche à partir d'un villageois ; il vit dans les bâtiments de recherche (b.staff) et n'en sort que pour aller de l'un à l'autre
  savant:{name:'Savant',sheet:'meumeu_scientist',speed:8.5,cost:{vivres:40,pieces:6},hours:24,pop:1,savant:true,
    why:'Un villageois formé au centre de recherche : une discipline, deux traits de caractère, un grade qui monte avec l’expérience. Il mène les projets, de la théorie à l’essai, et se réunit avec ses collègues.'},
  canon:{name:'Canon',img:'canon',speed:5,range:14,cd:9,vsB:3,dmg:45,hp:160,shell:true,crew:2,cost:{pieces:12,fer:6,bois:5,cuivre:1},hours:16,pop:1,
    why:'Pièce lourde coûteuse à fondre ; ses obus consomment des caisses d’explosifs acheminées par les dépôts.'},
};
// Ce qui éclate : combien d'éclats, leur masse (g), leur calibre (mm), leur vitesse (m/s), la distance où ils ralentissent (m),
// le rayon (cases) où l'on regarde, le souffle (cases) qui tue à coup sûr, les dégâts aux bâtiments.
export const BLASTS={
  grenade:{frags:400,mass:.02,d:1.2,v:1000,lambda:3,radius:.45,blast:.07,dmgB:60,throw:6,fuse:2.5},
  obus:{frags:1500,mass:.05,d:1.8,v:1100,lambda:6,radius:1,blast:.2,dmgB:45},
  bombe:{frags:6000,mass:.2,d:3,v:1400,lambda:12,radius:2.2,blast:.5,dmgB:110},
  mine:{frags:900,mass:.03,d:1.4,v:1000,lambda:5,radius:.7,blast:.12,dmgB:70},   // (V12.5) une mine antipersonnel : éclats et souffle à bout portant
};
// Les innovations. Les Meumeu qui travaillent ont des idées : à force de couper du bois, de miner, de soigner, de tirer, l'un
// d'eux propose quelque chose. On la développe au laboratoire. Chaque partie tire ses idées dans un ordre différent.
// mod : ce que l'innovation multiplie (voir World.mod).
export const DOMAINS={bois:'Bûcheronnage',pierre:'Carrières',vivres:'Cueillette et moulins',mine:'Mines',atelier:'Ateliers',logistique:'Transports',construction:'Construction',
  armement:'Armement',tir:'Tir',soins:'Soins',defense:'Défense',chimie:'Chimie de guerre'};
export const INNOV=[
  {id:'scie',dom:'bois',name:'La scie à deux Meumeu',text:'Deux Meumeu de part et d’autre du tronc : l’arbre tombe en moitié moins de coups.',mod:{gather_tree:1.4},cost:{bois:30,pieces:4},hours:6},
  {id:'hache',dom:'bois',name:'La hache à tranchant de fer',text:'Un tranchant trempé qui ne s’émousse pas.',mod:{gather_tree:1.25},cost:{fer:3,bois:10},hours:5},
  {id:'coins',dom:'pierre',name:'Les coins de fer',text:'On fend le rocher en suivant ses veines au lieu de le frapper.',mod:{gather_rock:1.35},cost:{fer:2,bois:10},hours:5},
  {id:'panier',dom:'vivres',name:'Le panier à deux anses',text:'On cueille à deux mains, on porte plus à chaque voyage.',mod:{gather_bush:1.35,ferme:1.1},cost:{bois:15,pieces:2},hours:4},
  {id:'assolement',dom:'vivres',name:'L’assolement',text:'Les champs se reposent à tour de rôle : ils donnent plus.',mod:{ferme:1.35},cost:{bois:20,vivres:30},hours:8},
  {id:'boisage',dom:'mine',name:'Le boisage des galeries',text:'Des étais : on creuse plus loin sans que tout s’effondre.',mod:{mine:1.4,gather_ore:1.2},cost:{bois:40,pieces:6},hours:8},
  {id:'wagonnets',dom:'mine',name:'Les wagonnets',text:'Des bacs sur rails dans la galerie : le minerai sort tout seul.',mod:{mine:1.3},cost:{fer:6,bois:20,pieces:8},hours:10},
  {id:'tour_pedale',dom:'atelier',name:'Le tour à pédale',text:'Les pièces sortent régulières, deux fois plus vite à façonner.',mod:{atelier:1.35},cost:{bois:25,pieces:6,fer:2},hours:8},
  {id:'economiseur',dom:'atelier',name:'L’économiseur de vapeur',text:'On récupère la chaleur perdue des chaudières : les machines brûlent un quart de charbon en moins.',mod:{charbon_machines:.75},cost:{pieces:10,fer:3},hours:8},
  {id:'ridelles',dom:'logistique',name:'La hotte et le joug',text:'Une hotte d’osier, un joug sur les épaules : un porteur prend moitié plus.',mod:{cap_porteur:1.5},cost:{bois:25,pieces:4},hours:5},
  {id:'baches',dom:'logistique',name:'Les wagons bâchés',text:'On charge jusqu’au toit sans rien perdre en route.',mod:{cap_train:1.3},cost:{pieces:12,fer:2},hours:8},
  {id:'tender',dom:'logistique',name:'Le tender allongé',text:'Un wagon à charbon plus grand derrière la locomotive : elle va moitié plus loin sans refaire le plein.',mod:{tender:1.5},cost:{pieces:10,fer:4},hours:6},
  {id:'aiguillages',dom:'logistique',name:'Les aiguillages à levier',text:'Moins d’arrêts, des trains qui roulent plus vite.',mod:{vit_train:1.25},cost:{fer:6,pieces:10},hours:10},
  {id:'echafaudages',dom:'construction',name:'Les échafaudages',text:'On bâtit à plusieurs étages en même temps.',mod:{construction:1.35},cost:{bois:40},hours:6},
  {id:'mortier',dom:'construction',name:'Le mortier de cendre',text:'Des murs qui tiennent sous les obus.',mod:{mur:1.5},cost:{pierre:30,salpetre:2},hours:8},
  {id:'presse',dom:'armement',name:'La presse à étuis',text:'Des étuis emboutis au lieu de tournés : moins de fer par caisse.',mod:{fer_munitions:.75},cost:{fer:8,pieces:12},hours:12},
  {id:'chaine',dom:'armement',name:'La chaîne de montage',text:'Chaque Meumeu ne fait qu’une pièce : les fusils sortent plus vite.',mod:{armement:1.4},cost:{pieces:20,bois:20},hours:12},
  {id:'hausse',dom:'tir',name:'La hausse graduée',text:'Une mire qu’on règle à la distance : on corrige la chute de la balle.',mod:{tir:1.2},cost:{pieces:6,fer:2},hours:8},
  {id:'appui',dom:'tir',name:'Le tir appuyé',text:'On pose l’arme sur un sac, un mur, une pierre : la main ne tremble plus.',mod:{tir:1.12},cost:{pieces:3,vivres:20},hours:4},
  {id:'tourniquet',dom:'soins',name:'Le garrot à tourniquet',text:'Un garrot qu’on desserre un peu par heure : le membre tient bien plus longtemps.',mod:{garrot:1.8},cost:{pieces:3,sante:2},hours:5},
  {id:'plasma_sec',dom:'soins',name:'Le plasma séché',text:'Une poudre qu’on délaye sur place : deux fois plus de plasma par trousse.',mod:{plasma:2},cost:{sante:4,salpetre:1},hours:8},
  {id:'brancard',dom:'soins',name:'Le brancard à roues',text:'On évacue un blessé presque au pas de course.',mod:{brancard:1.5},cost:{bois:15,pieces:4},hours:4},
  {id:'antiseptique',dom:'soins',name:'L’antiseptique',text:'On lave les plaies : l’infection d’une panse percée va trois fois moins vite.',mod:{antiseptique:.33},cost:{salpetre:3,sante:2},hours:8},
  {id:'suture',dom:'soins',name:'La suture rapide',text:'Un fil et une aiguille courbe : on opère en deux fois moins de temps.',mod:{chirurgie:2},cost:{pieces:4,sante:2},hours:6},
  {id:'creneaux',dom:'defense',name:'Les créneaux',text:'Des ouvertures étroites dans les tours : un tireur de plus, mieux protégé.',mod:{creneaux:1.34},cost:{pierre:30},hours:6},
  {id:'sacs',dom:'defense',name:'Les sacs de terre',text:'Derrière un mur doublé de sacs, les balles s’arrêtent.',mod:{couvert:1.6},cost:{bois:20,pieces:2},hours:5},
  // ---- Chimie de guerre (ère II) : ces idées ouvrent du NEUF (un explosif, un modèle), elles ne multiplient pas seulement un pourcentage.
  // needs : les découvertes à avoir faites avant ; unlock : ce qui se débloque (fill:<explosif> dans l'atelier, preset:<modèle> au bureau d'études).
  {id:'amatol',dom:'chimie',era:2,name:'L’amatol',text:'De la tolite coupée de nitrate d’ammonium : un peu moins brisante, mais un tiers moins chère. L’obus de la guerre de masse.',mod:{},needs:['presse'],unlock:['fill:amatol'],cost:{pieces:8,salpetre:20,charbon:10},hours:10},
  {id:'thermite',dom:'chimie',era:2,name:'La thermite',text:'Fer et oxyde de fer, portés à plus de deux mille degrés : elle fond les tôles et met le feu à tout. Peu de souffle, une flaque de métal en fusion qui brûle bien plus loin que le gel.',mod:{},needs:['chaine'],unlock:['fill:thermite'],cost:{fer:20,pieces:10,charbon:15},hours:14},
  {id:'phosphore',dom:'chimie',era:2,name:'Le phosphore blanc',text:'Il brûle à l’air libre : un nuage blanc épais qui aveugle, et des particules incandescentes qui collent. Couvre une retraite, chasse une tour, brûle les peluches.',mod:{},needs:['amatol'],unlock:['fill:phosphore'],cost:{pieces:14,charbon:20,salpetre:15},hours:16},
  {id:'napalm',dom:'chimie',era:2,name:'Le napalm',text:'Un gel qui colle et qui dure : les flaques incendiaires brûlent deux fois plus longtemps et s’étalent davantage.',mod:{napalm:2},needs:['thermite','phosphore'],cost:{pieces:16,charbon:30,cuivre:6},hours:18},
  {id:'lanceflammes',dom:'chimie',era:3,name:'Le lance-flammes',text:'Un projecteur de gel enflammé à courte portée, porté à l’épaule : le bunker et la tranchée n’ont plus de secret. Nouveau modèle au bureau d’études.',mod:{},needs:['napalm'],unlock:['preset:flamethrower'],cost:{fer:25,pieces:18,cuivre:8},hours:20},
  // ---- V12.6 : la recherche savante. Ces découvertes ne viennent jamais de la pratique : seuls les savants les proposent (remue-méninges, colloques,
  // rêveurs à leur bureau). sci : réservée aux savants.
  {id:'engrais',dom:'vivres',sci:true,name:'L’engrais au salpêtre',text:'Le salpêtre rend aux champs ce que le blé leur prend : les moulins donnent davantage.',mod:{ferme:1.3},needs:['assolement'],cost:{salpetre:12,vivres:20},hours:10},
  {id:'ble_hybride',dom:'vivres',sci:true,name:'Le blé hybride',text:'Deux blés croisés, le plus robuste et le plus lourd : un épi plus gros sur la même terre.',mod:{ferme:1.25},needs:['engrais'],cost:{vivres:40,pieces:4},hours:14},
  {id:'sylviculture',dom:'bois',sci:true,name:'La sylviculture',text:'On coupe les bons arbres au bon moment, on abat dans le bon sens : le bûcheron va bien plus vite.',mod:{gather_tree:1.3},needs:['scie'],cost:{bois:30,vivres:10},hours:8},
  {id:'conserve',dom:'vivres',sci:true,name:'La boîte de conserve',text:'Des vivres stérilisés dans du fer-blanc : rien ne se gâte, on mange moins pour autant d’effort.',mod:{ration:.85},cost:{fer:6,pieces:8,vivres:30},hours:12},
  {id:'prospection',dom:'mine',sci:true,name:'La prospection géologique',text:'On lit la roche avant de creuser : les mineurs suivent la veine au lieu de la chercher.',mod:{mine:1.2,gather_ore:1.3},needs:['boisage'],cost:{pieces:6,vivres:15},hours:10},
  {id:'tir_de_mine',dom:'pierre',sci:true,name:'Le tir de mine',text:'Une charge bien placée abat la paroi d’un coup : carrières et mines avancent à grands pas.',mod:{mine:1.25,gather_rock:1.3},needs:['prospection'],cost:{explosifs:4,pieces:6},hours:10},
  {id:'acier',dom:'mine',sci:true,name:'L’acier au creuset',text:'Un fer affiné, dur et souple : des étuis plus minces, des murs armés.',mod:{fer_munitions:.8,mur:1.25},needs:['coins'],cost:{fer:15,charbon:20},hours:14},
  {id:'compound',dom:'atelier',sci:true,name:'La machine compound',text:'La vapeur sert deux fois, dans deux cylindres : moins de charbon, des machines plus vives.',mod:{charbon_machines:.75,atelier:1.15},needs:['economiseur'],cost:{fer:10,pieces:14},hours:14},
  {id:'interchangeables',dom:'armement',sci:true,name:'Les pièces interchangeables',text:'Chaque pièce au calibre, sans ajustage : on monte les armes à la chaîne, on répare en échangeant.',mod:{armement:1.3,atelier:1.15},needs:['chaine'],cost:{pieces:20,fer:6},hours:16},
  {id:'imprimerie',dom:'atelier',sci:true,name:'L’imprimerie de campagne',text:'Les savants publient et se lisent : la recherche avance plus vite, les élèves apprennent plus vite.',mod:{recherche:1.2,formation:1.25},cost:{pieces:12,bois:30},hours:10},
  {id:'beton_arme',dom:'construction',sci:true,name:'Le béton armé',text:'Du ciment coulé sur des fers : des murs et des couverts qui encaissent les obus.',mod:{mur:1.4,couvert:1.25},needs:['mortier'],cost:{pierre:40,fer:12},hours:16},
  {id:'tables_tir',dom:'tir',sci:true,name:'Les tables de tir',text:'La chute de la balle mesurée à chaque distance, recopiée dans un carnet : on vise juste du premier coup.',mod:{tir:1.12},needs:['hausse'],cost:{pieces:8},hours:10},
  {id:'rayures',dom:'tir',sci:true,name:'L’étude des rayures',text:'Le pas des rayures accordé à l’ogive : la balle tourne juste, plus loin, plus droit, et le canon s’use moins.',mod:{tir:1.08,fer_munitions:.9},needs:['tables_tir'],cost:{fer:6,pieces:10},hours:14},
  {id:'penicilline',dom:'soins',sci:true,name:'La moisissure qui soigne',text:'Une moisissure du pain arrête l’infection : la plaie ne pourrit presque plus.',mod:{antiseptique:.5},needs:['antiseptique'],cost:{vivres:20,sante:4},hours:16},
  {id:'transfusion',dom:'soins',sci:true,name:'Les groupes sanguins',text:'On sait quel sang donner à qui : chaque trousse de plasma sauve davantage.',mod:{plasma:1.5},needs:['plasma_sec'],cost:{sante:6,pieces:4},hours:12},
  {id:'anesthesie',dom:'soins',sci:true,name:'L’anesthésie à l’éther',text:'Le blessé dort, le chirurgien prend son temps sans en perdre : on opère plus vite et mieux.',mod:{chirurgie:1.5},needs:['suture'],cost:{sante:4,salpetre:2},hours:10},
  {id:'colloidale',dom:'chimie',sci:true,name:'La poudre colloïdale',text:'La nitrocellulose gélifiée, laminée, découpée : l’usine chimique en sort un tiers de plus.',mod:{poudrerie:1.3},needs:['amatol'],cost:{salpetre:15,charbon:10},hours:12},
  {id:'catalyse',dom:'chimie',sci:true,name:'La catalyse',text:'Un peu de métal dans la cuve, et la réaction va d’elle-même : l’usine chimique tourne plus vite pour moins de charbon.',mod:{poudrerie:1.25,charbon_machines:.9},needs:['colloidale'],cost:{cuivre:8,pieces:10,salpetre:10},hours:16},
];
// Les étapes : ce qu'on fait d'habitude, dans l'ordre, pour se préparer avant la guerre. Rien n'est obligatoire.
export const STEPS=[
  {k:'bois',name:'Couper du bois',hint:'Choisissez des villageois (glisser), clic droit sur un arbre.'},
  {k:'maisons',name:'Des vivres qui tournent',hint:'Bâtir → Vivre → Moulin : un domaine de 3×3, le moulin au centre et ses huit champs de blé. Posez-le sur une bonne terre (touche F : la fertilité). Chaque nouveau Meumeu coûte des vivres.'},
  {k:'camp',name:'Un camp au bord de la forêt',hint:'Bâtir → Vivre → Camp près des arbres, puis clic droit des villageois sur le camp : ils récoltent autour.'},
  {k:'charbon',name:'Une mine de charbon',hint:'Un filon noir brille près de la capitale : un camp à côté (un dépôt), puis Bâtir → Produire → Mine dessus. Le chantier commande ses matériaux au camp.'},
  {k:'charrette',name:'Des porteurs',hint:'Sur un dépôt : Affecter des porteurs. Choisissez combien (− / +), y compris zéro ou un : à pied, ils servent les dépôts voisins (60 cases) — la gare, le camp, l’usine.'},
  {k:'atelier',name:'Un atelier',hint:'Bâtir → Produire → Atelier : des pièces (choisissez sa production), du charbon pour ses machines.'},
  {k:'labo',name:'Un centre de recherche',hint:'Bâtir → Chercher → Centre de recherche, puis formez-y des savants : ils mènent les idées des Meumeu jusqu’à l’innovation, du tableau noir au laboratoire. Cliquez sur le bâtiment : le toit s’ouvre.'},
  {k:'hopital',name:'Un hôpital',hint:'Bâtir → Soigner → Hôpital : on y forme infirmiers et médecins.'},
  {k:'caserne',name:'Une caserne et six soldats',hint:'Bâtir → Armer → Caserne, puis Former des soldats (il faut des fusils au dépôt).'},
  {k:'arsenal',name:'Un arsenal qui tourne',hint:'Bâtir → Armer → Arsenal, deux villageois dedans : des munitions (plomb, cuivre, poudre, pièces), qu’on commande à son dépôt.'},
  {k:'rail',name:'Une voie ferrée, deux gares, un train',hint:'Bâtir → Relier : tracez une voie, une gare à chaque bout, un train à la gare. Rattachez une mine lointaine à sa gare : le rail la relie.'},
  {k:'defense',name:'Deux tours et un mur',hint:'Bâtir → Défendre : des tours, un mur tracé devant la ville. La guerre vient.'},
  {k:'escouade',name:'Une escouade avec un médecin',hint:'Choisissez des soldats et un médecin, touche G.'}];
// Les véhicules. cap : caisses ; speed : cases/h ; seats : passagers ; fuel : carburant pour cent cases.
export const VEHICLES={
  charrette:{name:'Charrette',sprite:'hand-cart',cost:{bois:20,pieces:2},hours:3,cap:15,speed:13,
    why:'Sur terre, partout où marche un Meumeu. Lente.'},
  // le porteur : un villageois affecté à un dépôt, à pied, une caisse ou dix sur le dos ; il sert les dépôts à `range` cases
  porteur:{name:'Porteur',cap:15,speed:9,hp:40,foot:true,range:60,
    why:'Un Meumeu affecté à un dépôt : il porte à pied (15 caisses, 40 cases) ce qui manque aux dépôts voisins — du camp à la gare, de la gare à l’usine.'},
  train:{name:'Train',cost:{bois:40,pieces:20,pierre:10,charbon:12},hours:8,cap:120,speed:12,hp:250,
    why:'Une locomotive à vapeur, son tender et quatre wagons, sur les rails : beaucoup, vite, loin. Elle brûle du charbon (une caisse pour vingt cases) et fait le plein en gare. Une voie coupée l’arrête.'},
};
// Les productions. at : l'usine qui la fait ; in, out : un lot ; hours : les heures de travail d'un lot (deux Meumeu : moitié moins).
// Les munitions (m:), les armes (a:) et les protections (p:) se calculent d'après la conception (world.recipe).
// limit : le plafond par défaut — l'usine s'arrête quand son dépôt de sortie en a autant.
export const PRODUCTS={
  pieces:{name:'Pièces',at:'atelier',in:{fer:1,bois:1},out:{pieces:2},hours:1.5,limit:80},
  charbon:{name:'Charbon de bois',at:'four',in:{bois:4},out:{charbon:1},hours:2,limit:80},
  poudre:{name:'Poudre',at:'poudrerie',in:{salpetre:3,charbon:1},out:{poudre:4},hours:2,limit:60},
  explosifs:{name:'Explosifs',at:'poudrerie',in:{salpetre:5},out:{explosifs:2},hours:9,limit:30},   // du salpêtre seul, mais lentement (la nitration, le séchage)
  melange_inc:{name:'Mélange incendiaire',at:'poudrerie',in:{salpetre:2,charbon:2,cuivre:1},out:{melange_inc:2},hours:3,limit:20},
  explosifs_brisants:{name:'Explosifs brisants',at:'poudrerie',in:{explosifs:2,salpetre:2,fer:1,pieces:1},out:{explosifs_brisants:1},hours:5,limit:16},
  // V12.5 : une mine (explosifs, fer, pièces) fondue et chargée à la manufacture d'armes ; les villageois la posent sur le terrain, elle explose sous l'ennemi
  mine:{name:'Mines',at:'manufacture',in:{explosifs:1,fer:2,pieces:1},out:{mine:1},hours:1.5,limit:60},
  sante:{name:'Fournitures médicales',at:'hopital',in:{pieces:2},out:{sante:4},hours:3,limit:12},
  // des jumelles simples (laiton, lentilles) : la vue porte plus loin de jour — l'outil de l'éclaireur
  jumelles:{name:'Jumelles',at:'atelier',in:{pieces:2,cuivre:2},out:{jumelles:1},hours:3,limit:8},
  // une tenue bariolée, teinte au charbon, pour la nuit ; des jumelles à projecteur infrarouge et leur batterie au plomb
  tenue_camo:{name:'Tenues camouflées',at:'atelier',in:{pieces:3,charbon:2,cuivre:1},out:{tenue_camo:1},hours:4,limit:10},
  jumelles_ir:{name:'Jumelles infrarouges',at:'manufacture',in:{cuivre:4,plomb:5,pieces:6,fer:2},out:{jumelles_ir:1},hours:12,limit:4},
  // la batterie du viseur infrarouge : fabriquée à l'atelier (n'importe quel villageois y travaille), chère en plomb, en cuivre et en pièces ;
  // une fois chargée elle est une marchandise comme une autre — le fret la porte aux dépôts, où un soldat à moitié à plat la change (world.resupply)
  // V12.4 : plus fabriquée (les batteries de l'infrarouge ne se rechargent plus) ; la recette reste pour les anciennes parties, hors des ateliers
  batterie:{name:'Batteries infrarouges',at:null,in:{plomb:5,cuivre:2,pieces:4,charbon:1},out:{batterie:1},hours:4,limit:6},
};
export const RECIPES=PRODUCTS;
export const LIMIT_OF=k=>PRODUCTS[k]?.limit??(k.startsWith('m:')?12:8);
export const BOMB={dmg:110,radius:2.2,fall:.3,stick:3};   // stick : le chapelet s'étale sur ± stick cases autour de la cible
export const FLAK={flight:.07,spread:1.3,hit:.9,dmg:22};
export const FIRE={hours:6,dps:6};  // un bâtiment qui brûle perd des points jusqu'à ce qu'un Meumeu l'éteigne

// Les Bèè. Leurs villes grossissent, forment des soldats, puis lancent des vagues vers ce qui fait tenir les nôtres.
// Rien avant le jour `first` ; ensuite une vague tous les `every` jours, plus grosse chaque fois ; des bombardiers dès le jour `air`.
// La paix ne dure pas : la guerre éclate entre le jour peace[0] et peace[1], annoncée quelques jours avant.
// Ensuite une vague tous les `every` jours, plus grosse chaque fois ; leurs bombardiers `air` jours après la déclaration.
// Les Bèè, c'est le nombre : un fusil simple, une mitraillette, pas d'artillerie ni d'armes exotiques (la qualité, l'invention, c'est nous) ;
// mais près de la moitié du peuple sous les armes.
// Les Bèè démarrent plus nombreux et mieux pourvus (leur terre est maigre, leurs filons loin) : le nombre, dès le début.
export const BEEE={cities:2,firstRaid:7,every:3,wave:3,grow:0,cap:180,armed:.6,villagers:28,garrison:12,frugal:.78,boost:{bois:3.2,pierre:3.2,vivres:4,pieces:2.4,charbon:2.4,fer:3},colonyDay:3,colonyCost:.25,   // colonyCost : les colons partent avec leur équipement — le centre d'une colonie coûte la moitié (les matériaux venaient de 100 cases : 4 à 10 jours par fondation)

  units:{
    villageois:{...UNITS.villageois,sheet:'beee_player-villager',name:'Villageois bèè'},
    soldat:{...UNITS.soldat,name:'Soldat bèè',sheet:'beee_player-soldier',speed:7.5,arm:'bee_fusil',skill:3.1},
    commando:{...UNITS.commando,name:'Commando bèè',sheet:'beee_player-soldier',speed:8,arm:'bee_pm',skill:2.8,smoke:1},
    canon:{...UNITS.canon,name:'Canon bèè',speed:4.5,range:13,cd:10,vsB:3,dmg:40,hp:150},
  }};

export const START={villagers:8,stock:{bois:95,pierre:36,vivres:150,pieces:16,explosifs:3,sante:6,charbon:20,fer:12,plomb:8,cuivre:8,poudre:8,'a:mle1':5,'m:mle1':4,'p:casque':5,'p:gilet':1}};
export const GOAL=100;
export const NAMES=['Biscotte','Praline','Nougat','Réglisse','Cannelle','Muscade','Pistache','Cachou','Grelot','Clochette','Berlingot','Roudoudou','Cardamome','Guimauve','Chicorée','Pâquerette','Tilleul','Semoule','Griotte','Amandine','Fleurette','Noisette','Caramel','Violette','Bergamote','Sucre','Mirabelle','Câpre','Marelle','Galette','Brioche','Dragée','Vanille','Sésame','Cerise','Myrtille'];
export const CITY_NAMES=['Meumeuville','Port-Biscotte','Praline-sur-Mer','Val-Nougat','Cannelle-les-Mines','Fort-Réglisse','Grelotin'];
export const BEEE_CITIES=['Bèèbourg','Fort-Bèè','Bèèlune','Crève-Laine','Tondeville','Laineuse','Bêlemont','Mouton-sur-Crin','Toisonne','Agnelle','Bergerie-Haute','Pâtis-Noir','Suintville','Cardeuse','Brebisac','Fort-Toison','Bèèrenfels','Houppelande','Mérinos','Laine-Grise','Bouclette','Tricotin','Pelote','Quenouille','Rouet','Bélier-Ville','Crin-Rouge','Frisotte'];
export const VEHICLE_NAMES=['Mésange','Fauvette','Martinet','Bourdon','Hirondelle','Scarabée','Libellule','Moineau','Colibri','Pinson','Grive','Rouge-gorge','Loriot','Bouvreuil','Sittelle','Mouette'];
