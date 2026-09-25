// Oberkommando der Meumeu — tout ce qui se règle est ici.
// Une seule carte, immense et continue. Deux civilisations : les Meumeu, qui partent d'une ville sur la côte, et les Bèè,
// qui tiennent l'autre bout du continent. On ramasse, on bâtit des villes, on les relie (rails, trains, porteurs),
// on arme — et la guerre vient : elle vise les villes, les voies, les dépôts, tout ce qui fait tenir une civilisation.
// Chaque dépôt a son stock : ce qui est ramassé là-bas est là-bas. Un chantier se paie dans les dépôts à moins de RADIUS cases ;
// un soldat recharge ses munitions dans ces mêmes dépôts. Couper les voies d'une armée, c'est la priver de munitions.
// Chaque usine ne fait qu'une chose, prend ses matières à un dépôt et livre à un autre (le joueur les choisit) ; ses machines
// brûlent du charbon. Ce qui manque à un dépôt devient une commande : le bureau du fret y envoie trains et porteurs,
// dans l'ordre des priorités. Ces règles valent pour les deux camps.

export const HOUR_REAL=4;      // secondes réelles par heure de jeu, à 1× : une journée dure une minute et demie
export const DAY=24;
export const NIGHT=[21,5];
export const MAP_N=320;        // cases de côté : assez pour que le rail soit indispensable (capitale ↔ Bèè : ~330 cases)
export const RADIUS=14;        // un chantier, un soldat, un canon puisent dans les dépôts à moins de RADIUS cases
export const CARRY=10;         // ce qu'un Meumeu porte d'un coup
export const GAP=2;
export const SITE_RANGE=30;    // un chantier est servi par un dépôt à moins de SITE_RANGE cases : ses bâtisseurs y vont à pied chercher les matériaux            // l'écart minimum entre deux bâtiments, en cases : des rues, une vue claire, un feu qui ne saute pas

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
  charbon:{name:'Charbon',icon:['r','chem_charbon']},
  argile:{name:'Argile',icon:['r','chem_argile']},
  // l'industrie de l'armement : le plomb fait le noyau des balles, le cuivre la chemise et l'étui, le salpêtre et le soufre
  // (avec du charbon) la poudre
  cuivre:{name:'Cuivre',icon:['r','fer-de-cendre_ingots']},
  plomb:{name:'Plomb',icon:['r','chem_residu']},
  soufre:{name:'Soufre',icon:['r','chem_engrais']},
  salpetre:{name:'Salpêtre',icon:['r','chem_divers']},
  poudre:{name:'Poudre',icon:['r','chem_explosif']},
  briques:{name:'Briques',icon:['r','common_bricks']},
  fer:{name:'Fer-de-Cendre',icon:['r','fer-de-cendre_raw'],rare:true},
  sels:{name:'Sels de Brûle',icon:['r','sels-de-brule_raw'],rare:true},
  soie:{name:'Soie de Falaise',icon:['r','soie-de-falaise_fiber'],rare:true},
  verre:{name:'Verre-Qui-Écoute',icon:['r','verre-qui-ecoute_raw'],rare:true},
};
export const RARE=['fer','sels','soie','verre'];
export const GOODS=Object.keys(RES);
export const OUTCROP={fer:'outcrop_fer',sels:'outcrop_sel',verre:'outcrop_verre',soie:'outcrop_teal',charbon:'outcrop_charbon',argile:'outcrop_argile',pierre:'outcrop_pale',cuivre:'outcrop_purple',plomb:'outcrop_goudron',soufre:'outcrop_green',salpetre:'outcrop_rock'};
// les filons communs (charbon, argile) : plus riches que le rare
export const ORE_LEFT={charbon:2400,argile:1800,pierre:4000,cuivre:1600,plomb:1600,soufre:1200,salpetre:1400};
// les gisements du commun, et où les chercher (près de la capitale : de quoi démarrer ; loin : à relier par le rail)
export const COMMON_ORES=['pierre','charbon','argile','cuivre','plomb','soufre','salpetre'];   // la pierre : de gros gisements, une mine dessus
// Les familles de fret : un véhicule peut n'en porter que certaines (un train de charbon, un porteur de munitions).
export const FAMILIES={
  materiaux:{name:'Matériaux',goods:['bois','pierre','argile','briques']},
  energie:{name:'Charbon',goods:['charbon']},
  industrie:{name:'Pièces',goods:['pieces']},
  vivres:{name:'Vivres',goods:['vivres']},
  rare:{name:'Le rare',goods:['fer','sels','soie','verre']},
  guerre:{name:'Guerre',goods:['explosifs','sante'],prefix:['m:','a:','p:']},
};
export const familyOf=k=>{for(const [f,F] of Object.entries(FAMILIES))if(F.goods.includes(k)||(F.prefix||[]).some(p=>k.startsWith(p)))return f;return 'materiaux';};
// Le fret : une usine commande de quoi faire BUF lots d'avance (au moins BUF_H heures de travail) ; un porteur sert les
// dépôts à CART_RANGE cases de sa base ; une locomotive brûle COAL_PER_CASE charbon par case et part le tender plein.
export const FRET={BUF:3,BUF_H:6,CART_RANGE:45,TENDER:12,COAL_PER_CASE:.05,LOOK:.5,EVAC_HI:.6,EVAC_LO:.35};
export const PRIO=['','Basse','Réduite','Normale','Haute','Urgente'];

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
  centre:{name:'Centre-ville',sprite:'command',big:true,size:[4,4],cost:{bois:200,pierre:120,pieces:20,briques:60},hours:30,store:4000,pop:10,hp:1600,trains:['villageois'],defense:{range:9,shooters:2},shelter:20,ward:4,
    why:'Le cœur d’une ville : un grand dépôt, dix places de vie, on y forme des Meumeu. Le premier est la capitale : le rare doit y arriver. Tombé, la ville est perdue.'},
  camp:{name:'Camp',sprite:'shelter',size:[2,2],cost:{bois:15},hours:5,store:500,hp:300,workers:6,hub:true,
    why:'Un dépôt de poche au bord d’une forêt, de rochers, de buissons : envoyez-y des villageois, ils ramassent tout autour (10 cases) et y rapportent. Ce qui est au camp y reste : les porteurs et les trains le font circuler.'},
  maison:{name:'Maison',sprite:'dorm',size:[2,2],cost:{bois:30},hours:6,pop:5,hp:350,shelter:5,why:'Cinq places de vie de plus, et un abri pour cinq quand les Bèè sont là.'},
  ferme:{name:'Ferme',sprite:'food',size:[3,3],cost:{bois:35},hours:8,workers:3,makes:{vivres:3.2},hp:300,why:'Trois Meumeu y font des vivres sans fin.'},
  atelier:{name:'Atelier',sprite:'workshop',size:[2,2],cost:{bois:40,pierre:20},hours:8,workers:2,hp:400,factory:{coal:.2,mod:'atelier'},
    why:'Des pièces : une production à la fois. Il prend ses matières à son dépôt d’approvisionnement, livre à son dépôt de sortie, et ses tours brûlent du charbon.'},
  four:{name:'Four à charbon de bois',sprite:'charcoal',size:[2,2],cost:{bois:20,pierre:20},hours:6,workers:2,hp:300,factory:{coal:0,mod:'atelier'},
    why:'Une meule de bois qui couve : quatre caisses de bois donnent une caisse de charbon. Lent, mais partout — en attendant un vrai filon.'},
  briqueterie:{name:'Briqueterie',sprite:'bricks',size:[2,2],cost:{bois:40,pierre:30},hours:8,workers:3,hp:450,factory:{coal:0,mod:'briques'},
    why:'Argile et charbon : le four cuit des briques. Sans briques, pas de gare, pas d’arsenal, pas de ville nouvelle.'},
  mine:{name:'Mine',sprite:'kiln',size:[2,2],cost:{bois:40,pierre:30,pieces:6},hours:10,workers:4,onOre:true,rate:4,hp:500,
    why:'Sur un filon. Quatre Meumeu en sortent le rare quatre fois plus vite qu’à la main. Il faut un dépôt tout près.'},
  gare:{name:'Gare',sprite:'depot',size:[3,2],cost:{bois:70},hours:10,store:1500,station:true,hp:600,trains:['train'],
    why:'Un dépôt au bord de la voie. Les trains y chargent et y déchargent ; on y construit les locomotives. Une mine, une usine qui y sont rattachées sont reliées au réseau.'},
  entrepot:{name:'Entrepôt',sprite:'warehouse',big:true,size:[3,3],cost:{bois:80},hours:10,store:2500,hp:700,
    why:'Un grand dépôt, sans voie : au cœur d’un quartier d’usines, au pied d’une mine. Réglez sa priorité et ses demandes : le fret le remplit.'},
  labo:{name:'Laboratoire',sprite:'still',size:[3,3],cost:{bois:80,pierre:60,briques:20},hours:14,unique:true,hp:500,lab:true,
    why:'Les idées des Meumeu y deviennent des innovations : chaque idée se développe ici, contre des ressources et du temps.'},
  caserne:{name:'Caserne',sprite:'school',size:[3,3],cost:{bois:60,pierre:40,briques:20},stock0:{'a:mle1':4,vivres:60,pieces:8},hours:12,hp:800,trains:['soldat','commando'],
    why:'On y forme soldats et commandos, armés d’une conception adoptée : il faut l’arme et ses munitions dans un dépôt proche. Ils rechargent dans les dépôts : une armée loin de ses dépôts finit à sec.'},
  poudrerie:{name:'Poudrerie',sprite:'motor',size:[2,2],cost:{bois:40,pierre:40,briques:20,pieces:6},hours:10,workers:3,hp:350,factory:{coal:.15,mod:'armement'},
    why:'Salpêtre, soufre et charbon broyés ensemble : la poudre des cartouches, ou des explosifs. Une seule production à la fois. Loin des maisons : ça saute.'},
  arsenal:{name:'Arsenal',sprite:'chem',size:[2,2],cost:{bois:40,pierre:40,pieces:10,briques:20},hours:10,workers:2,hp:500,arsenal:true,factory:{coal:.25,mod:'armement'},
    why:'Les munitions d’une conception adoptée — plomb pour les balles, cuivre pour les étuis, poudre, pièces : une seule production par arsenal. Tout part en caisses au dépôt de sortie.'},
  armurerie:{name:'Bureau d’études',sprite:'research',size:[2,2],cost:{bois:40,pierre:30,pieces:10},hours:12,hp:400,design:true,
    why:'On y conçoit les armes : le calibre, l’ogive, la poudre, le canon, la culasse. Un prototype coûte des ressources et du temps ; adopté, il se fabrique.'},
  manufacture:{name:'Manufacture d’armes',sprite:'foundry',size:[3,3],cost:{pierre:80,bois:40,pieces:30,fer:10,briques:40},hours:20,workers:4,hp:900,manufacture:true,factory:{coal:.3,mod:'armement'},
    why:'Une usine d’armes, outillée pour un seul modèle (fusil ou protection) : changer de modèle, c’est refaire l’outillage (6 h). Quand la dernière tombe, les plans sont perdus — sauf des archives dans une autre ville.'},
  hopital:{name:'Hôpital',sprite:'lab',stock0:{vivres:40,sante:8},size:[3,3],cost:{bois:60,pierre:40,pieces:10,briques:20},hours:14,hp:600,ward:12,workers:2,trains:['infirmier','medecin'],makesMed:true,factory:{coal:0,mod:'soins'},
    why:'On y opère et on y guérit tout à fait : le sang revient, les os se ressoudent en trois jours. On y forme infirmiers et médecins, on y fait les fournitures médicales avec de la soie.'},
  tente:{name:'Tente médicale',sprite:'tent',size:[2,2],cost:{bois:5,sante:1},hours:1.5,hp:120,ward:6,store:30,tent:true,
    why:'Le poste de secours avancé : un médecin la plante près du front et y opère — hémostase, ligatures, sutures. On y stabilise, puis on évacue vers l’hôpital. Un petit dépôt : ravitaillez-la en fournitures médicales.'},
  archives:{name:'Archives techniques',sprite:'loom',size:[2,2],cost:{pierre:40,bois:20},hours:10,hp:500,archives:true,
    why:'Une copie des plans d’armes. Si la manufacture tombe, les conceptions survivent — à condition que les archives soient loin d’elle (20 cases).'},
  fonderie:{name:'Fonderie',sprite:'boiler',size:[3,2],cost:{pierre:60,pieces:20,briques:40},stock0:{pieces:40,fer:30,bois:30,charbon:10},hours:14,hp:700,trains:['canon'],
    why:'Des canons, avec du fer. Ils portent loin et abattent les murs, les tours, les maisons.'},
  tour:{name:'Tour',sprite:'turret',size:[2,2],cost:{pierre:50,bois:20},hours:10,hp:1000,defense:{range:11,shooters:3},
    why:'Elle tire seule sur tout Bèè à portée. Plusieurs lignes de tours derrière un mur : la défense en profondeur.'},
};
export const BUILD_ORDER=['camp','maison','ferme','atelier','four','briqueterie','mine','poudrerie','gare','entrepot','centre','caserne','arsenal','armurerie','manufacture','hopital','tente','archives','fonderie','tour'];
// le menu de construction, par familles : ce qui fait vivre, ce qui relie, ce qui arme, ce qui soigne, ce qui défend
export const BUILD_CATS=[
  {k:'vivre',name:'Vivre',hint:'ramasser, loger, nourrir',items:['camp','maison','ferme','centre']},
  {k:'produire',name:'Produire',hint:'extraire, transformer : une usine, une production',items:['mine','four','briqueterie','atelier','poudrerie','labo']},
  {k:'relier',name:'Relier',hint:'dépôts et fret : rails, gares, entrepôts',items:['gare','entrepot'],lines:['rail']},
  {k:'armer',name:'Armer',hint:'concevoir, fabriquer, former',items:['armurerie','manufacture','arsenal','caserne','fonderie','archives']},
  {k:'soigner',name:'Soigner',hint:'la chaîne des soins',items:['hopital','tente']},
  {k:'defendre',name:'Défendre',hint:'tenir les villes',items:['tour'],lines:['mur']}];

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
  canon:{name:'Canon',img:'canon',speed:5,range:14,cd:9,vsB:3,dmg:45,hp:160,shell:true,cost:{pieces:40,fer:30,bois:30,charbon:10},hours:8,pop:2,
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
  {id:'economiseur',dom:'atelier',name:'L’économiseur de vapeur',text:'On récupère la chaleur perdue des chaudières : les machines brûlent un quart de charbon en moins.',mod:{charbon_machines:.75},cost:{pieces:10,fer:3},hours:8},
  {id:'ridelles',dom:'logistique',name:'La hotte et le joug',text:'Une hotte d’osier, un joug sur les épaules : un porteur prend moitié plus.',mod:{cap_porteur:1.5},cost:{bois:25,pieces:4},hours:5},
  {id:'baches',dom:'logistique',name:'Les wagons bâchés',text:'On charge jusqu’au toit sans rien perdre en route.',mod:{cap_train:1.3},cost:{soie:4,pieces:10},hours:8},
  {id:'tender',dom:'logistique',name:'Le tender allongé',text:'Un wagon à charbon plus grand derrière la locomotive : elle va moitié plus loin sans refaire le plein.',mod:{tender:1.5},cost:{pieces:10,fer:4},hours:6},
  {id:'aiguillages',dom:'logistique',name:'Les aiguillages à levier',text:'Moins d’arrêts, des trains qui roulent plus vite.',mod:{vit_train:1.25},cost:{fer:6,pieces:10},hours:10},
  {id:'echafaudages',dom:'construction',name:'Les échafaudages',text:'On bâtit à plusieurs étages en même temps.',mod:{construction:1.35},cost:{bois:40},hours:6},
  {id:'hoffmann',dom:'construction',name:'Le four annulaire',text:'Un four en anneau qui ne s’éteint jamais : les briques cuisent en continu.',mod:{briques:1.4},cost:{briques:30,pierre:20},hours:8},
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
  {k:'maisons',name:'Deux maisons',hint:'Bâtir → Vivre → Maison : plus de place pour de nouveaux Meumeu. Deux cases d’écart entre les bâtiments.'},
  {k:'camp',name:'Un camp au bord de la forêt',hint:'Bâtir → Vivre → Camp près des arbres, puis clic droit des villageois sur le camp : ils récoltent autour.'},
  {k:'charbon',name:'Une mine de charbon',hint:'Un filon noir brille près de la capitale : un camp à côté (un dépôt), puis Bâtir → Produire → Mine dessus. Le chantier commande ses matériaux au camp.'},
  {k:'charrette',name:'Des porteurs',hint:'Sur un dépôt : Affecter des porteurs. À pied, ils servent les commandes des dépôts voisins (22 cases) — la gare, le camp, l’usine.'},
  {k:'briques',name:'Une briqueterie qui tourne',hint:'Une mine d’argile, puis Bâtir → Produire → Briqueterie : elle commande argile et charbon à son dépôt, le fret les amène.'},
  {k:'atelier',name:'Un atelier',hint:'Bâtir → Produire → Atelier : des pièces (choisissez sa production), du charbon pour ses machines.'},
  {k:'labo',name:'Un laboratoire',hint:'Bâtir → Produire → Laboratoire : les idées des Meumeu y deviennent des innovations.'},
  {k:'hopital',name:'Un hôpital',hint:'Bâtir → Soigner → Hôpital : on y forme infirmiers et médecins.'},
  {k:'caserne',name:'Une caserne et six soldats',hint:'Bâtir → Armer → Caserne, puis Former des soldats (il faut des fusils au dépôt).'},
  {k:'arsenal',name:'Un arsenal qui tourne',hint:'Bâtir → Armer → Arsenal, deux villageois dedans : des munitions, avec du fer, des sels et du charbon.'},
  {k:'rail',name:'Une voie ferrée, deux gares, un train',hint:'Bâtir → Relier : tracez une voie, une gare à chaque bout, un train à la gare. Rattachez une mine lointaine à sa gare : le rail la relie.'},
  {k:'defense',name:'Deux tours et un mur',hint:'Bâtir → Défendre : des tours, un mur tracé devant la ville. La guerre vient.'},
  {k:'escouade',name:'Une escouade avec un médecin',hint:'Choisissez des soldats et un médecin, touche G.'}];
// Les véhicules. cap : caisses ; speed : cases/h ; seats : passagers ; fuel : carburant pour cent cases.
export const VEHICLES={
  charrette:{name:'Charrette',sprite:'hand-cart',cost:{bois:20,pieces:2},hours:3,cap:15,speed:13,
    why:'Sur terre, partout où marche un Meumeu. Lente.'},
  // le porteur : un villageois affecté à un dépôt, à pied, une caisse ou dix sur le dos ; il sert les dépôts à `range` cases
  porteur:{name:'Porteur',cap:10,speed:7,hp:40,foot:true,range:22,
    why:'Un Meumeu affecté à un dépôt : il porte à pied ce qui manque aux dépôts voisins — du camp à la gare, de la gare à l’usine.'},
  train:{name:'Train',cost:{bois:40,pieces:20,pierre:10,charbon:12},hours:8,cap:80,speed:40,hp:250,
    why:'Une locomotive à vapeur, son tender et quatre wagons, sur les rails : beaucoup, vite, loin. Elle brûle du charbon (une caisse pour vingt cases) et fait le plein en gare. Une voie coupée l’arrête.'},
};
// Les productions. at : l'usine qui la fait ; in, out : un lot ; hours : les heures de travail d'un lot (deux Meumeu : moitié moins).
// Les munitions (m:), les armes (a:) et les protections (p:) se calculent d'après la conception (world.recipe).
// limit : le plafond par défaut — l'usine s'arrête quand son dépôt de sortie en a autant.
export const PRODUCTS={
  pieces:{name:'Pièces',at:'atelier',in:{bois:2,pierre:1},out:{pieces:2},hours:1.5,limit:80},
  charbon:{name:'Charbon de bois',at:'four',in:{bois:4},out:{charbon:1},hours:2,limit:80},
  briques:{name:'Briques',at:'briqueterie',in:{argile:3,charbon:1},out:{briques:4},hours:2,limit:160},
  poudre:{name:'Poudre',at:'poudrerie',in:{salpetre:3,soufre:1,charbon:1},out:{poudre:4},hours:2,limit:60},
  explosifs:{name:'Explosifs',at:'poudrerie',in:{salpetre:2,soufre:1,charbon:1},out:{explosifs:2},hours:2,limit:20},
  sante:{name:'Fournitures médicales',at:'hopital',in:{soie:1},out:{sante:4},hours:3,limit:12},
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
export const BEEE={cities:2,peace:[14,18],every:2.2,wave:3,grow:2,air:5,airEvery:1.6,garrison:8,buildEvery:18,cap:40,
  units:{
    soldat:{name:'Soldat bèè',sheet:'beee_pathfinder-soldier',speed:7.5,arm:'bee_fusil',skill:2.4},
    commando:{name:'Commando bèè',sheet:'beee_mountain-commando',speed:8,arm:'bee_pm',skill:1.8,grenades:3,smoke:1},
    canon:{name:'Canon bèè',img:'canon',speed:4.5,range:13,cd:10,vsB:3,dmg:40,hp:150,shell:true},
  }};

export const START={villagers:8,stock:{bois:200,pierre:80,vivres:250,pieces:30,explosifs:6,sante:8,charbon:60,briques:40,plomb:20,cuivre:20,poudre:20,'a:mle1':10,'m:mle1':8,'p:casque':10,'p:gilet':2}};
export const GOAL=100;
export const NAMES=['Biscotte','Praline','Nougat','Réglisse','Cannelle','Muscade','Pistache','Cachou','Grelot','Clochette','Berlingot','Roudoudou','Cardamome','Guimauve','Chicorée','Pâquerette','Tilleul','Semoule','Griotte','Amandine','Fleurette','Noisette','Caramel','Violette','Bergamote','Sucre','Mirabelle','Câpre','Marelle','Galette','Brioche','Dragée','Vanille','Sésame','Cerise','Myrtille'];
export const CITY_NAMES=['Meumeuville','Port-Biscotte','Praline-sur-Mer','Val-Nougat','Cannelle-les-Mines','Fort-Réglisse','Grelotin'];
export const BEEE_CITIES=['Bèèbourg','Fort-Bèè','Bèèlune','Crève-Laine'];
export const VEHICLE_NAMES=['Mésange','Fauvette','Martinet','Bourdon','Hirondelle','Scarabée','Libellule','Moineau','Colibri','Pinson','Grive','Rouge-gorge','Loriot','Bouvreuil','Sittelle','Mouette'];
