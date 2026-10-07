# Arbre technologique — proposition

État actuel : 26 « idées » à plat, en 11 domaines (bois, pierre, vivres, mine, atelier, transports, construction, armement, tir, soins, défense).
Chacune est un bonus de pourcentage, sans prérequis, sans rien débloquer de neuf. C'est l'**ère I** ; elle reste telle quelle.
La suite : des ères II et III qui **ouvrent des possibilités** (pièces du concepteur, bâtiments, unités, gestes), pas seulement des pourcentages.

## Principes

1. **Prérequis** : chaque nœud a des `needs` (un ou deux nœuds de l'ère précédente). Le laboratoire montre trois états : acquis, disponible, verrouillé (avec ce qui manque).
2. **Ouvrir, pas seulement multiplier** : au moins la moitié des nœuds des ères II et III débloquent quelque chose de nouveau et de visible.
3. **Choix qui s'excluent** : à certains carrefours, une voie ou l'autre (poudre vive et tube qui s'use, ou poudre lente et longs tubes).
4. **La recherche vient de l'usage** : les « idées » naissent déjà de la pratique. Étendre : beaucoup tirer fait naître les idées d'armement, veiller de nuit celles d'optique.
5. **Rétro-ingénierie** : une arme, une plaque ou une machine bèè capturée donne un point de recherche dans son domaine. La guerre nourrit le laboratoire.
6. **Les Bèè en miroir** : chez eux, « masse » = techs de production (fusils bon marché, casernes, conscription) ; ils progressent en réponse à ce qu'ils subissent (plaques contre balles standard → munitions perforantes). Jamais de précision ni d'électronique du côté bèè.
7. **Le laboratoire a des niveaux** : l'ère II demande un labo de niveau 2, l'ère III un niveau 3 et des « savants » (villageois affectés).

## Branches (ère I existante → ère II → ère III)

| Branche | Ère II (ouvre) | Ère III (ouvre) |
|---|---|---|
| **Vivres et terre** (assolement, panier) | Engrais au salpêtre (fertilité ↑), moulin à eau (rendement, bâtiment) | Silos et conserves (réserve qui ne se perd pas), serre |
| **Industrie** (tour à pédale, économiseur, chaîne) | Forge à soufflet, haut-fourneau (fer ×), machines-outils (qualité de tube) | Aciérie (acier trempé : plaques et tubes meilleurs), atelier de précision |
| **Chimie** (mélange incendiaire, explosifs) | Poudre sans fumée, amatol (obus bon marché), grains à 7 trous (pression plus douce) | Triple base (moins d'usure), composition B (brisant), fumigènes et éclairants |
| **Armement et pièces** (presse à étuis, chaîne) | Chargeur amovible, canon fretté, obusier long, roquettes en salve | Pièce autopropulsée, lance-roquettes multiple, culasse à recul court, base bleed |
| **Optique et nuit** (hausse) | Lunette achromatique (×8), collimateur, **tube renforcé** (qualité de l'infrarouge ↑) | **Intensificateur d'image** (vision nocturne passive : pas de lampe, donc pas de lueur rouge ; portée moindre), viseur thermique |
| **Renseignement et écoute** (couronne sonore) | Cornet acoustique (+30 % de portée d'écoute), géophone (pas ×1,5 la nuit), carnet de reconnaissance | Goniomètre (arcs ×0,7 plus fins), ballon d'observation (repère les batteries), radio de campagne (ordres instantanés) |
| **Transports** (hotte, wagons, tender, aiguillages) | Locotracteur, wagons blindés, pont | Camion (fret sans rail), télégraphe (rapports plus rapides) |
| **Soins** (tourniquet, plasma, suture) | Hôpital de campagne mobile, sérum | Transfusion, prothèses (un blessé grave revient) |
| **Défense** (créneaux, sacs) | Tranchées profondes, fil barbelé (ralentit une colonne) | Mines (pièges), bunker, tourelle automatique |
| **Protections** (gilet, plaques) | Plaque d'acier trempé, casque renforcé | Céramique, bouclier de pièce |
| **Commandement** (formations, ordres) | Feu et mouvement, observateur avancé (précision de l'artillerie ↑) | Barrage roulant, ordres d'opération complets |

## Ce qui s'appuie sur du code déjà là

- Prérequis, états et ères : `INNOV` reçoit `needs`, `era`, `lab` ; `canDevelop` les vérifie ; le panneau du laboratoire les montre.
- Multiplicateurs : `remod()` et `mod(k)`, déjà utilisés partout (`mod('ferme')`, `mod('tir')`…).
- Ouvertures dans le concepteur : un nœud lève un plafond (grossissement, qualité du tube infrarouge, choix de remplissage, types d'affût) ; le concepteur lit `world.s.innov.done`.
- Bâtiments et produits neufs : `BUILDINGS` et `PRODUCTS`, comme la batterie infrarouge de la V11.
- Écoute et vision : `acousticContact` (incertitude, portée) et `eyeProfile` (portée de nuit) prennent déjà des modificateurs.

## Ordre de réalisation conseillé

1. **Fondation** : prérequis, ères, niveaux du laboratoire, panneau lisible (rien de neuf en jeu, mais tout devient possible).
2. **Optique et nuit** : tube renforcé, puis intensificateur d'image (le viseur infrarouge vient d'être refait).
3. **Renseignement et écoute** : cornet, géophone, goniomètre (la couronne sonore vient d'être refaite).
4. **Vivres** : moulin à eau, engrais, silos (l'économie vient d'être rééquilibrée).
5. Chimie et armement (le plus gros : il ouvre le concepteur d'artillerie), puis le reste.

À chaque branche : critères de test écrits avant, mesure, et garde-fou de guerre sur 9 parties avant de livrer.


---

# Volet « chimie, guerre industrielle et projets secrets » (goût WW2 et prototypes)

## 1. La chimie comme colonne vertébrale (elle nourrit tout le reste)

La chimie n'est pas une branche parmi d'autres : c'est ce qui relie l'économie, l'armement et la médecine, comme au XXe siècle.

- **Nitration** : nitrocellulose → nitroglycérine → dynamite stabilisée → tolite → **hexogène (RDX)**. Chaque palier améliore un explosif ou un propergol déjà dans le jeu (`FILLS`, propergols).
- **Synthèse de l'azote** (le procédé Haber) : engrais azoté (les champs donnent plus) **et** salpêtre de synthèse (les explosifs ne dépendent plus des filons de salpêtre). Un même palier sert l'assiette et la guerre.
- **Carburants synthétiques** (Fischer-Tropsch, à partir du charbon) : motorisation. Débloque le locotracteur, le camion, la pièce autopropulsée. Sans lui, le charbon reste réservé au rail.
- **Caoutchouc et plastiques synthétiques** : pneus (camions), isolants (radio, radar), bakélite (pièces légères).
- **Pénicilline** : la branche des soins passe de « ralentir le sepsis » à le guérir.
- **Pyrotechnie** : fumigènes au phosphore (couvrent une retraite, aveuglent une tour), éclairants (la nuit, un tir d'éclairant rend visible une colonne bèè un instant, mais te révèle), incendiaires de type napalm (le gel incendiaire existe : le rendre collant, durable, plus cher).
- **Métallurgie chimique** : aciers alliés (nickel, chrome), thermite (souder, percer, incendier une plaque).

## 2. Prototypes : la fiabilité comme jeu

Aujourd'hui un prototype se lance et devient une arme adoptée. Idée : un **polygone d'essais** (bâtiment) où l'on éprouve un prototype avant de l'adopter.

- Chaque prototype a une **fiabilité** (0 à 100 %) : au début 50-70 %, plus haute avec des essais. Un tir d'essai peut rater (enrayage), exploser (tube éclaté : les servants blessés) ou révéler un défaut (dispersion, surchauffe).
- Chaque essai fait du **bruit** (les Bèè l'entendent : la couronne sonore travaille pour eux aussi) et consomme des munitions : tester coûte et expose.
- Le concepteur donne déjà les chiffres (recul, pression, stabilité) : une pression trop haute pour le métal du tube = risque d'éclatement réel au lieu d'un simple avertissement.
- Adopter un prototype non éprouvé est possible, mais il s'enraye en combat.

## 3. Les projets secrets (le cœur de ce que tu aimes)

Des programmes de fin de partie, coûteux et longs, qui donnent **une arme dévastatrice et rare** (un exemplaire, ou deux), mais qui font de toi **la cible prioritaire** des Bèè.

**La mécanique**
1. **Un site secret** (bâtiment spécial, loin des villes, cher) : bunker de recherche, ou polygone.
2. **Des phases** : études (laboratoire) → prototype (matières rares : plomb, cuivre, explosifs brisants, longues heures d'atelier) → essais (bruyants) → production limitée.
3. **La signature** : le site accumule de la « chaleur » : bruit, fumée, va-et-vient de porteurs et de trains, lumière la nuit. Elle alimente la chance que les éclaireurs bèè le repèrent (renseignement déjà là : `beeeScout`, `visibleAt`).
4. **La cible prioritaire** : dès que le site est connu, le poids de cette cible dans `beeePlanRaid` explose : l'armée bèè marche dessus avant tout le reste. Tu peux gagner la guerre… si tu défends ce site.
5. **La contre-mesure** (techs de défense) : filets de camouflage (signature ×0,6), galeries souterraines (bruit ×0,5), travail de nuit sans lumière, leurres (un faux site attire une armée bèè pour rien), postes de garde, écoute radio pour être prévenu.

**Quelques projets, dans l'esprit WW2**
- **Le canon ferroviaire** : un tube monstrueux sur wagons, qui n'avance que sur ta voie ferrée (le rail existe déjà), avec sa propre équipe et des tonnes d'obus. Des obus qui rasent un bâtiment. Signature énorme ; en couper la voie le paralyse.
- **La fusée balistique** (façon V-2) : portée quasi illimitée, imprécise, charge lourde. Terrorise les villes bèè (moral, économie) ; sa rampe de lancement est repérée à chaque tir (contre-batterie).
- **La fusée de proximité** : les obus fusants explosent à la bonne hauteur sans réglage ; l'artillerie contre colonnes devient redoutable. Peu de signature (une usine), mais énorme valeur : tentante à espionner.
- **Le bombardier lourd** (les bombes et la DCA existent déjà) : une escadrille de deux appareils qui rase un quartier ; les Bèè répondent par de la DCA sur leurs villes.
- **Le char lourd** : une caisse blindée à chenilles (motorisation + aciers alliés), peu nombreuse, presque insensible aux balles ; l'antichar bèè devient le nerf de leur guerre.
- **Le lance-roquettes antichar** et **le lance-flammes** : petits projets, mais qui changent l'assaut d'un bunker.
- **Les leurres** (armée fantôme) : des formes gonflables et des bruits enregistrés qui simulent une colonne ; un jeu de renseignement à part entière.
- **Le radar** : détecte une armée bèè à grande distance, sans écoute ni vue ; le résultat est une flèche sur la couronne. Techs de suite : brouilleur.

## 4. Les Bèè en miroir : la masse a ses propres « secrets »

Pas d'électronique, mais des projets de **masse** que le joueur peut repérer et saboter :
- **La grande levée** : mobilisation générale qui double l'armée pendant quelques jours (préparée par un signe visible : casernes pleines, rassemblements).
- **Le parc d'artillerie** : une immense batterie construite lentement, qui écrase une ville d'un coup ; tant qu'elle n'est pas prête, une opération de sabotage peut la retarder.
- **La cité-forteresse** : l'une de leurs villes se fortifie à outrance ; une cible que l'on reconnaît de loin.
- **La chaîne d'armement de masse** : des fusils par milliers, mais toujours du même modèle (le joueur peut lire leur doctrine).
L'éclaireur meumeu devient un métier : trouver, identifier, saboter les projets bèè avant qu'ils n'aboutissent.

## 5. Le lien avec ce qui est déjà construit

| Idée | S'appuie sur |
|---|---|
| Signature du site secret | Bruit (`acousticContact`), équipes qui marchent (`teamOf`), fumée, portée de nuit |
| Cible prioritaire | Poids des cibles dans `beeePlanRaid`, `B.known`, armée unique (`ARMY_MIN`) |
| Prototype et fiabilité | Flux `proto` du bureau d'études, pression et stabilité déjà calculées (`derive`) |
| Chimie | `FILLS`, propergols, `PRODUCTS` (la batterie infrarouge en est le modèle) |
| Motorisation | Rail et véhicules (`VEHICLES`), fret (`FAMILIES`) |
| Radar et écoute radio | Couronne sonore (`drawCrown`), arcs de direction |

## 6. Par où commencer

1. **La fondation** (prérequis, ères, niveaux du laboratoire) — sans elle rien ne s'ordonne.
2. **La chimie** : nitration, azote de synthèse, carburant synthétique (elle débloque les autres branches).
3. **Le polygone d'essais** et la fiabilité des prototypes (petit, très « prototypes »).
4. **Le premier projet secret** avec toute la mécanique de signature et de cible prioritaire : le canon ferroviaire (le rail est déjà là) ou la fusée balistique.
