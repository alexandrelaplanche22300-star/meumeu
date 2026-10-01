# Oberkommando der Meumeu V12.4

## Nouveautés V12.4

**Corrigé**
- **L'artillerie tire de nouveau** : une pièce à sec envoie d'elle-même un servant chercher des obus au dépôt (avant : « plus d'obus » jusqu'à un ordre ; 2 coups sur 12, maintenant 12 sur 12). Le tireur garde sa position.
- **Servants sans arme** : ils ne portent que les caisses de leur pièce ; la caserne ne bloque plus faute de fusils, et on peut les sortir seuls, même sans caisse au dépôt.
- **Les Bèè éloignés ne saccadent plus** (leur foulée sautait de quatre pas une image sur quatre).
- **Moulin** : ailes refaites, accrochées au toit côté caméra.
- **Sons des tirs** : un combat à l'écran s'entend toujours, même si les soldats choisis sont loin.

**Nouveau**
- **Troupe de choc** (Armer → Caserne d'élite) : plus de vie, plus dure aux blessures, le poids de son arme et de sa protection ne la gêne qu'à moitié ; sa formation coûte 90 vivres et 6 pièces. Modèle : le chevalier meumeu.
- **Soldats** : ton modèle de soldat meumeu (casque compris) pour tous les soldats et servants ; les civils restent en peluche.
- **Vision nocturne** : plus de batterie à recharger — la batterie est celle de la lampe (plus puissante, plus lourde).
- **Bouclier** : hauteur et largeur réglables, la plaque dessinée est celle qui protège.
- **Tranchées bèè** : une fosse de 2 × 2 cases (au moins une par ville gardée dès que la guerre monte) au lieu d'un champ de petits trous ; les cases voisines se dessinent en un seul trou.
- **Formations bèè** : ligne plus espacée, puis échelon avant l'objectif.
- **Caméra libre (3D)** : bouton du milieu de la souris pour orienter la caméra (gauche-droite : tourner ; haut-bas : incliner) ; Maj + bouton du milieu pour déplacer la vue ; touche Origine (Home) pour revenir à la vue isométrique. Le sol, les effets, la sélection et les clics suivent.
- **Obus et fusées en 3D** dans la scène, à leur forme (ogive, ceinture, ailettes) et à leur taille (calibre, à l'échelle des Meumeu), orientés selon leur trajectoire ; **explosions 3D** : boule de feu, onde de choc au sol jusqu'au rayon de souffle, dôme de poussière, à la taille de la charge — plus la poussière, les mottes, la fumée et la traînée des obus.
- **Bâtiments touchés** : ils noircissent, penchent, s'affaissent et fument avant de s'effondrer.
- **Arbres transparents** autour de nos unités et des ennemis repérés : on voit qui est sous les arbres.

**Vérifié** : batterie de non-régression (voir SUIVI-3D-GUERRE.md), nouveaux tests, captures du jeu.

# Oberkommando der Meumeu V12.2

## Nouveautés V12.2 — les engins de combat

Cinq engins, réservés aux Meumeu (les Bèè n'en ont pas) : **jeep**, **jeep à mitrailleuse**, **automitrailleuse** (tourelle, deux mitrailleuses jumelées), **char léger** (canon de 16 mm et mitrailleuse coaxiale), **automoteur à casemate** (deux canons de 28 mm).

**S'en servir**
- Bâtir un **garage** (onglet Armer). Chaque engin coûte des ressources et ses armes montées (prises au dépôt), et prend du temps : la jeep 10 h, le char 70 h. S'il manque quelque chose, le garage le dit et ne prélève rien.
- Un engin sort **sans équipage** : il ne roule ni ne tire. Désigner des Meumeu, puis clic droit sur l'engin. Le premier conduit, puis viennent les servants des armes, puis les passagers, dans la limite des places. Le panneau de l'engin a « Débarquer les passagers » et « Tout le monde descend ».
- Clic droit sur la carte : l'engin y va. Il contourne les obstacles, manœuvre en plusieurs temps s'il le faut, et les chenillés pivotent sur place.
- **Plusieurs engins à la fois** : un cadre de sélection les prend aussi, et Maj+clic en ajoute ou en retire. Au clic droit, ils partent de front, chacun à sa place.

**Au combat**
- Chaque tourelle choisit sa cible : l'antichar d'abord, le canon pour les groupes et les ouvrages, la mitrailleuse pour l'infanterie. La coaxiale prend ce qui est dans l'axe du canon, et l'automoteur pivote sa caisse vers la cible.
- Si l'engin est touché, ses armes pivotent déjà vers le tireur. Un passager reprend l'arme d'un servant tombé.
- **Blindage réaliste** :
  - la face touchée dépend de l'angle ; l'épaisseur effective croît sous l'incidence ;
  - un coup peut **ricocher** (rasant), **être arrêté** (étincelles) ou **percer** ;
  - s'il perce, le projectile et des éclats de la plaque blessent ou tuent l'équipage, avec le même modèle de blessure qu'à pied ;
  - il peut aussi abîmer le moteur, le train, la tourelle ou une arme, ou mettre le feu.
  - Repères : le fusil bèè ne perce pas l'automitrailleuse ; l'antichar bèè perce ses flancs et ceux du char, mais pas l'avant du char. La jeep ne protège presque pas.
  - Un obus qui éclate à côté d'une jeep touche son équipage comme des hommes à terre ; dans un blindé, personne.
- Les Bèè qui voient un blindé réclament des fusils antichars, et leurs antichars visent les engins en priorité.

**À voir** : roues et chenilles qui tournent selon la distance, suspension, tourelles et armes qui pivotent, recul du tube, flamme et traçante à la bouche, poussière et échappement, Meumeu assis dans les jeeps, éclats de ricochet.

**Vérifié** (tests dans `jeu/test/vehicules_*.mjs`, détails et chiffres dans `SUIVI-3D-GUERRE.md`) :
- conduite : 199 buts sur 200, sur 10 cartes et 5 engins ;
- équipage, feu, blindage, garage : tout passe sur 3 cartes ;
- modèles 3D : échelle uniforme, tourelles et roues pivotant en leur centre, chaque tube de l'automoteur dans sa propre rotule ;
- suite générale de non-régression : identique, sauf deux scènes racontées qui divergent après 20 jours de partie (effet des réglages d'économie, pas une panne).

**Limites connues**
- La jeep à mitrailleuse peut s'écarter de 1 à 1,5 case de son chemin pendant un demi-tour serré, sans jamais entrer dans un obstacle.
- Un automoteur sur un très long détour peut arriver un peu après l'heure prévue.
- Sur une des cartes de test (101), les Bèè restent lents à s'équiper en armes lourdes.

---

# Oberkommando der Meumeu V11.2

## Nouveautés V11.2 — la vraie cause du « pschiiit »

- **L'écho d'un son arrivait AVANT le son.** Pour tout bruit joué depuis un échantillon (coup de feu, impact d'une blessure, explosion, ricochet, sifflement), l'écho du champ de bataille partait au réverbérateur **tout de suite**, plein bande et d'autant plus fort que la source était loin, alors que le son direct est **retardé selon la distance** (`d·4 m / 343 m/s`). On entendait donc un souffle avant chaque coup lointain (et avant chaque impact). Mesuré hors ligne sur un tir à 150 m : le signal qui arrivait avant le coup valait **43 % du volume du coup** ; il vaut maintenant **zéro**, et l'écho suit le coup avec le même retard et les mêmes aigus mangés par la distance.
- Retrait d'une petite bouffée de souffle aigu ajoutée au départ de chaque tir en V10.8 (l'échantillon a déjà son claquement).
- Rappel V11.1 : le sifflement d'une balle ne joue plus que pour un tir ennemi qui passe tout près d'un de tes soldats sélectionnés, et arrive avec le bruit du coup ; l'ambiance de nuit est plus lourde.

---

# Oberkommando der Meumeu V11.1

## Nouveautés V11.1 — le son

- **Plus de « pschiiit » avant chaque tir.** Le sifflement d'une balle qui passe était joué tout de suite, pour tous les tirs qui traversaient le centre de l'écran (les tiens compris), alors que le bruit du coup arrive avec le retard de la distance : on entendait « pschiiit… puis BANG ». Maintenant le sifflement ne joue que pour un **tir ennemi qui passe à moins de 1,8 case d'un de tes soldats sélectionnés**, jamais pour tes propres tirs, plus faible quand la balle passe plus loin, et il **arrive avec le bruit du coup** (`test/sifflement.mjs`, six critères, sur la vraie fonction).
- **Une ambiance pesante, surtout la nuit.** Une nappe grave (deux oscillateurs à peine désaccordés, dont le battement lent fait comme une respiration), un vent en rafales lentes (il était presque inaudible), et la nuit des événements rares : grondement lointain, ululement, craquement. Quand des tirs, des explosions ou une équipe qui marche sont entendus, la tension monte : la nappe grossit et s'assombrit, puis un cœur sourd bat de plus en plus vite. Le jour reste léger.

---

# Oberkommando der Meumeu V11.0

## Nouveautés V11.0 — « la tech pour les Meumeu, la masse pour les Bèè »

- **Économie des Meumeu** : un Meumeu mange un tiers de moins (villageois 0,08 vivre/h au lieu de 0,12 ; soldat 0,13 au lieu de 0,20) et un moulin produit 50 % de plus (~45 Meumeu nourris au lieu de ~20). Mesuré : 12 soldats + 40 villageois tiennent 20 jours avec deux moulins, sans famine (`test/economie.mjs`). Les Bèè sont inchangés.
- **Vision nocturne bien plus loin** : le viseur infrarouge voit à 45 cases (180 m) de nuit avec le réglage moyen, aussi loin qu'un œil nu en plein jour (contre 19 cases avant, et 10 sans viseur), et jusqu'à 140 cases (560 m) avec le meilleur réglage (150 W, tube ×1,6, faisceau étroit). La portée croît avec la puissance de la lampe, la qualité du tube, l'étroitesse du faisceau et le grossissement. Les jumelles infrarouges voient à 60 cases. Elles étaient affichées en « m » alors que la portée est en cases : corrigé (× 4 m).
- **La batterie reste, dix fois plus durable** : 44 h d'utilisation pour le réglage moyen (4,4 h avant) ; une nuit entière n'en use qu'une infime part. **Elle coûte cher** (réglage moyen : 10 plomb, 3,4 cuivre, 7,1 pièces pour l'ensemble) et c'est **un vrai objet** : la batterie chargée se fabrique à l'atelier (5 plomb, 2 cuivre, 4 pièces, 1 charbon, 4 h — n'importe quel villageois y travaille), le fret la porte aux dépôts comme n'importe quelle marchandise, et un soldat dont la batterie est à moitié vide la remplace dès qu'un dépôt à moins de 6 cases en a une (plus de recharge gratuite). Les départs équipés (Départ établi : 3, Dev : 12) en contiennent quelques-unes.
- **Les données, à côté des curseurs** : dans l'atelier, le bloc « Visée infrarouge » affiche en direct la portée de nuit, le faisceau, l'autonomie de la batterie, son poids et le coût en matériaux ; l'éditeur à curseurs a une carte « Nuit ».
- **Écoute d'équipe en temps réel** : une équipe bèè qui marche s'entend de plus loin qu'un soldat seul (×1 + 0,18 par homme, jusqu'à ×3,5 : 7 cases pour un seul de nuit, 21 pour douze), son contact se rafraîchit à chaque tick et la couronne l'annonce « ÉQUIPE ≈ N — direction — proche / à moyenne distance / lointaine ». Plus la source est forte, plus le relèvement est net : à 5 cases, un train se situe à 0,06 rad près, une usine 0,09, une mine 0,09, un chantier 0,10, des pas 0,11 (`test/couronne.mjs`).
- **Les éclaireurs bèè ne trichent plus** : leur reconnaissance visitait d'abord les cases les plus éloignées de leur capitale, c'est-à-dire le côté des Meumeu. Une capitale meumeu passive était connue au jour 3. Ordre aléatoire maintenant : jours 3, 3, 13, 15, 24, jamais (6 parties, joueur passif).
- **Les Bèè n'ont pas besoin de ton artillerie pour trouver ta capitale** : joueur passif, aucun tir — la capitale est connue puis visée par une armée entre les jours 13 et 24, assaillie, et tombe (`test/decouverte.mjs`). Un tir de ta part sur une ville bèè ne fait qu'orienter une contre-batterie vers ta pièce.
- **Tests** : `economie.mjs`, `batterie.mjs`, `decouverte.mjs`, `armee.mjs`, `couronne.mjs` (équipes), `nir.mjs` (nouveaux critères, l'historique est gardé en tête du fichier).

---

# Oberkommando der Meumeu V10.9

## Nouveautés V10.9

Base : le code de la V10.8 (sons selon le calibre et la charge, explosions plus grosses, cratères plus sombres, roquettes qui accélèrent après la bouche, ravitaillement de l'artillerie par un servant, batterie de six roquettes), lui-même bâti sur la V10.7 (méthodes en double retirées, jusqu'à 3 colonnes offensives) et la V10.6.

- **Les éclats portent enfin loin.** Leur distance de freinage était de 3 à 4 m (environ dix fois trop court : à 17 m d'une charge de 500 g, plus personne n'était blessé alors que la charge projette 170 000 éclats). Elle suit maintenant la traînée d'air d'un éclat d'acier (λ = 2m / ρ·Cd·A, réduite à 30 % pour le jeu). Mesuré (`test/explosions.mjs`) : charge de 500 g, 62 % / 21 % / 7 % de blessés à 8 / 17 / 33 m ; bombe de 3 kg, 24 % / 8 % à 30 / 61 m ; personne à 260 m. Un « blessé » compte la moindre égratignure ; hors de combat ou tué : 17 % / 3 % / 0,2 % pour la charge de 500 g, 3 % à 30 m pour la bombe. Le souffle, lui, reste court, comme en réalité : c'est le fragment qui tue à distance.
- **Le sol reste marqué** : chaque cratère est entouré d'un halo de terre brûlée et de traînées de suie, plus large pour un gros obus.
- **Panneaux 3D des tirs reçus et envoyés** : par défaut sur « tout l'écran » (avant : seulement pour les soldats sélectionnés, ce qui faisait croire qu'ils avaient disparu). Le bouton « Radios » choisit toujours entre la sélection, tout l'écran et coupé, et se souvient de ton choix.
- **Couronne sonore d'équipe** : autour du centre des soldats sélectionnés, un anneau-compas (nord en haut). Chaque bruit y est une marque : sa position est la direction entendue, la largeur de l'arc le flou, l'épaisseur la force, un pictogramme dit quoi (🔫 💥 🚂 🏭 🔨 ⛏ 👣) et des points combien de soldats l'ont entendu. Un trait qui pulse est neuf (moins de 2 s), qui pâlit vieillit, et « contact perdu » reste 4 s. Six marques au plus, classées par force × danger. Jamais de position sur la carte. La précision suit la puissance de la source : à 5 cases, un train se situe à 0,06 rad près, une usine 0,09, une mine 0,09, un chantier 0,10, des pas 0,11 (`test/couronne.mjs`).
- **Fiche de charge fiable** : l'atelier calculait l'énergie des éclats mille fois trop petite (un /1000 en trop) et une courbe de létalité cent fois trop optimiste. Corrigé : un éclat isolé blesse presque toujours mais met rarement hors de combat (3,5 % à 100 J, 10 % à 500 J), et la fiche annonce maintenant 22 % / 4 % / 4,5 % là où la simulation donne 17 % / 3 % / 3 % (charge de 500 g à 8 et 17 m, bombe à 30 m). L'éditeur à curseurs sépare « Souffle » et « Éclats ». L'effet d'enveloppe sur le souffle (l'acier en garde les deux tiers) est écrit mais désactivé (`ENVELOPE_BLAST`) : il faisait passer l'obusier de 80 % à 71 % de soldats hors de combat à 1 m, sous ton exigence de brutalité.
- **Artillerie** : vérifié qu'une pièce à 6 coups en tire 6 puis annonce « plus d'obus », y compris près d'un dépôt vide (`test/artillerie_conso.mjs`). Je n'ai pas retrouvé les « munitions infinies ». Non fait : le choix du type de pièce dans le concepteur, les pièces autopropulsées, les zones de charge et l'usure du tube.
- **Tests** : `explosions.mjs` ajouté (portée des éclats, maisons, feu, cratères) ; `bureau.mjs` compare la roquette à sa vitesse de fin de combustion (le modèle de la V10.8 en a deux).

Non fait (gardé pour la suite) : de meilleurs bruitages d'explosion avec écho selon la distance ; un feu qui prend sur les bâtiments combustibles selon une chance (un obus brisant n'est pas un incendiaire) ; plus de personnalisation de l'artillerie dans le concepteur (type de pièce, lance-roquettes multiples au-delà du preset de six tubes) ; l'affichage des dégâts d'éclats de l'atelier, qui ne correspond toujours pas à la simulation.

**La doctrine bèè est une armée conventionnelle, plus des raids.** Avant, les Bèè envoyaient des formations de 4 à 23 soldats (jusqu'à trois à la fois en V10.7, avec un groupe de « diversion ») alors qu'ils comptent 200 à 300 soldats : ces petits groupes s'égrenaient sans faire une guerre. Maintenant : **une seule armée à la fois**, rassemblée avec tout ce que les villes peuvent libérer (elles gardent la moitié de leur garnison minimale), qui ne part que si elle compte au moins 30 soldats et 2,2 fois la défense estimée de l'objectif, puis marche en masse, donne l'assaut et se replie. Plus de diversion. Les commandos de sabotage de nuit restent des unités à part. Mesuré (`test/armee.mjs`, 3 graines de 30 jours) : formations de 32 à 63 soldats (moyenne 43), jamais deux à la fois. Garde-fou sur 9 campagnes de 30 jours contre le joueur automatique : 330 Bèè vivants, 6,7 villes, 2,4 offensives par partie, capitale tombée 2 fois sur 9, aucune erreur.

---

# Oberkommando der Meumeu V10.6

## Nouveautés V10.6

- **Le concepteur d'armes redevient celui de V9** : il s'ouvre sur l'atelier complet ; l'éditeur de pièces à curseurs reste à un bouton (« Éditeur de pièces V6 »). V10.0 à V10.5 avaient inversé l'ordre sans que cela soit signalé.
- **Recrutement automatique des Meumeu** : plus rien à cliquer. Le centre-ville forme des villageois tout seul dès que la ville a de quoi tenir (25 vivres + une réserve de rations : un jour si un moulin tourne, trois sinon), sans plafond de places, environ 10 par jour tant que la nourriture suit. Le bouton « Croissance » l'arrête. Une partie neuve sans moulin ne meurt pas de faim avant l'heure 72 (`test/recrutement.mjs`).
- **Départ établi (partie avancée)** : deux moulins servis, cinq mines en service (salpêtre, plomb, cuivre, fer, charbon) avec leurs camps-dépôts, et un arsenal, une manufacture d'armes et une usine chimique bâtis mais à l'arrêt (pas d'ouvrier, pas de commande : la production reste au joueur). « Dev » reprend cette base et ajoute la pierre, les fonderie/four/hôpital/tours et de gros stocks ; **le brouillard de guerre reste en place** (bouton « Brouillard » ou touche N pour le lever).
- **Les Bèè s'étendent vraiment** : ils lançaient 10 à 17 fondations en 30 jours pour n'avoir que 2 à 4 villes. Trois causes corrigées : (1) les bâtisseurs allaient chercher le matériau le plus abondant (bois) avant celui qui bloquait la progression (20 pièces) — désormais ce qui manque le plus en proportion d'abord (cela vaut aussi pour les chantiers du joueur) ; (2) un chantier dont les matériaux arrivent n'est plus « abandonné après 4 jours sans progrès » ; (3) les sites de colonie sont choisis à portée des porteurs (58 cases) et le centre d'une colonie coûte la moitié (les colons partent équipés). Mesuré sur 9 campagnes de 30 jours avec le joueur automatique : **7,2 villes bèè** (3,3 en V10.5), 328 Bèè vivants, 3,0 offensives par partie, aucune erreur.
- **Balistique** : le frottement du canon agit enfin au-delà de la longueur de saturation (l'ancien modèle gardait 937 m/s de 14 cm à 2 m ; maintenant 850 m/s à 3 m, le Mle 1 garde ses 936 m/s à sa longueur) ; une balle qui traverse une plaque bascule proportionnellement à l'énergie perdue (un gilet de soie qu'elle traverse à peine ne l'aggrave plus) ; une arme trop lourde pour son affût ne peut plus être lancée en prototype ; l'éditeur à curseurs affiche la surcharge, le recul et la stabilité réelle ; deux textes d'aide inexacts corrigés (7,5 / 11 mm, usure du tube).
- **Tests** : `recrutement.mjs`, `depart_etabli.mjs`, `expansion.mjs` ajoutés ; `dev.mjs` mis à jour (critère « brouillard levé » gardé en INFO, remplacé par « brouillard en place »).

Non fait dans cette version (mesuré, gardé pour la suite) : la formule d'éclats affichée par l'atelier surestime encore la létalité ; le cahier des charges « IA + balistique en un seul système » (fiche opérationnelle par ville, munitions par mission, mémoire des protections, artillerie dans la doctrine) ; le critère d'expansion E3 (jamais plus de 5 jours sans fondation) est raté sur une graine (10 jours, faute de matériaux) et le calcul par heure de jeu croît jusqu'à ×3,5 avec l'empire (250 ms par heure de jeu, soit 6 % du temps réel) ; la capitale meumeu tombe dans 2 parties sur 9 contre le joueur automatique (seuil fixé à 2).

## Nouveautés V10.5

- **Plein écran au démarrage** (F11 ou Alt+Entrée pour basculer ; le choix est retenu dans un nouveau fichier de préférence).
- **Bouton « Dev »** : une partie de test avec la base équipée, une mine en service sur chaque filon proche (charbon, fer, cuivre, plomb, salpêtre, pierre) avec son camp-dépôt, arsenal, manufacture, poudrerie, fonderie, hôpital, gros stocks (armes, cartouches, protections, explosifs) et le brouillard levé.
- **Bouton « Brouillard »** (et touche N) : oui = on ne voit que ce que voient nos soldats ; non = toute la carte, les Bèè et **ce qu'ils ont entendu** (un cône par alerte, la prochaine étape du balayage de chaque fouilleur).
- **Viseur infrarouge simplifié** : largeur du faisceau (un faisceau étroit porte plus loin), mode continu ou impulsion (autonomie ×2, vision intermittente), filtre IR (sans filtre, une lueur rouge trahit l'opérateur). Rendu vert-jaune granuleux dans le cône. Réglages dans le concepteur.
- **Garnisons plus fluides** : quand des gardes partent en fouille, les postes importants vidés sont repris (couverture du 2ᵉ poste clé 64 % → 89 %, du 3ᵉ 86 % → 100 %).
- **Mobilisation** : plafond par ville (40 % de la garnison en rondes et fouilles, 60 % face à un danger, la moitié du minimum toujours en ville), rappel des sorties en trop, bande de défense et gardes engagés comptés une seule fois (par ville d'origine), départ des recherches en 0,14 h.
- **Guerre plus dure** : la cause de la « guerre molle » est corrigée. Le renseignement sur la base meumeu vieillissait sans être rafraîchi (plus de cible valable après 4 jours). Les reconnaissances passent désormais avant les rondes de secteur et vont revoir d'abord ce que les Bèè ont déjà vu. Les défenseurs d'une base ne sont plus comptés plusieurs fois. Offensives : 0,7 → 2,6 par partie (1,8 en V10.3).
- **Protections corrigées** : les plaques d'armure n'arrêtaient jamais rien en jeu (le point d'entrée de la balle était calculé 1 mm hors du corps). Un plastron d'acier arrête maintenant 75 % des balles d'un Mle 1 ; le gilet de soie divise par deux les pertes contre la mitraillette bèè.
- **Tests** : `jeu/test/LISEZ-MOI.md` en donne la liste, la façon de les lancer et les critères. `v7-regressions.mjs` passe enfin (test mis à jour, ancienne version en commentaire).

Limites connues : la carte fait 440 cases et un garde marche à 7 cases/h, donc les offensives mettent des jours à arriver. Le concepteur du kit n'affiche pas encore la surcharge, l'optique superflue, le recul ni la dispersion. La formule d'éclats de l'atelier surestime la létalité (57 % affiché contre 4 % réel à 1,5 m). Un gilet franchi aggrave la blessure (194 J → 820 J), incohérence relevée dans `world.js`. Le canon de l'ancien modèle reste à 937 m/s de 14 cm à 2 m. Un guerre plus dure est possible en montant `MAXCOL` à 2 dans `strategy.js` (4,3 offensives par partie, mais la capitale tombe alors dans 3 parties sur 9 contre un joueur qui n'a que 4 soldats).

---

# Oberkommando der Meumeu V10.4

## Nouveautés V10.4 (renseignement et acoustique)

- **Les Bèè n'entendent qu'une direction.** Un bruit (tir, explosion, pas, chantier) ne leur donne plus qu'un relèvement, avec son incertitude et la portée d'audition du bruit, depuis l'endroit où le garde écoute. Ni la position ni la distance de la source ne sont transmises ; seule une vue directe donne une position. Les chercheurs balaient le cône en zigzag, du proche au lointain, au lieu de converger sur un point : un commando immobile peut rester inconnu, un commando qui s'éloigne échappe.
- **Un contact précis n'est jamais dégradé.** Un bruit plus lointain sur le même relèvement ne rend pas le contact moins précis, côté Bèè comme côté Meumeu ; un bruit plus proche le resserre.
- **Une ville à son minimum de garnison** envoie désormais un binôme d'écoute après un tir, sans descendre sous la moitié de son minimum.
- **Affichage acoustique** : arcs de cercle plus grands autour du soldat sélectionné, dont l'épaisseur suit la puissance perçue (portée de la source, silencieux compris) et la largeur l'incertitude. Étiquette « TIRS 131 dB — ouest — moyen — il y a 12 s », flèches de bord sans doublon, et message « contact acoustique perdu » à l'extinction. L'atelier indique la portée d'un tir en mètres, le jour et la nuit.
- **Menace des villes** : elle ne monte plus qu'une fois toutes les 1,5 h par source de bruit, pour ne pas confondre un combat prolongé avec une suite de menaces neuves.
- Nettoyage : 8 méthodes mortes retirées de `war.js` (remplacées à l'exécution par `strategy.js`).

Limites connues : la latence de départ de la recherche est de 0,63 h ; les binômes restent dehors jusqu'à environ 9 h ; la forêt et le relief n'atténuent pas encore l'écoute ; la mobilisation de la garnison peut dépasser 50 % certaines nuits (chantier suivant). Les mesures sont dans `jeu/test/` (`tir_nocturne.mjs`, `bruits_bee.mjs`, `bruits_nocturnes.mjs`, `patrouilles_nocturnes.mjs`, `ia_tombee.mjs`).

---

# Oberkommando der Meumeu V10.3

Version indépendante de la V9. Son EXE original, ses sources et ses sauvegardes restent intacts. La V10 utilise son propre emplacement de sauvegarde. Elle démarre dans une fenêtre maximisée normale : le plein écran n'est pas imposé.

## Jouer

Lancer `Oberkommando der Meumeu V10.3.exe`. Les V10.1 et V10.2 restent disponibles sans modification. Une **nouvelle partie** bénéficie des nouveaux effectifs initiaux Bèè ; charger une sauvegarde ne recrée pas les villes et leurs habitants.

### Correctifs V10.3 du bureau d'études

- L'éditeur V6 à curseurs est désormais la vue ouverte par défaut. Les réglages hérités V5.8 restent accessibles depuis son en-tête.
- Les affûts V6 ne sont plus tous traduits en « roues » : roues, bouclier/double flèche, traîneau portatif et pieux conservent une représentation cohérente dans l'ancienne fiche et dans le rendu.
- Le zéro est cohérent jusqu'à 2 000 m et le grossissement optique peut être réglé jusqu'à ×16. Aucun de ces réglages ne modifie la vitesse initiale.
- Une pièce à plusieurs servants n'est plus arbitrairement interdite de tir parce que son équipage est incomplet. Elle pointe, recharge et tire avec de très lourds malus progressifs ; les pieux seuls la rendent immobile par choix.

- Espace : pause. Boutons ½×, 1×, 2×, 4× : vitesse de simulation.
- Une nuit complète dure 6 minutes à ×1 ; un jour complet, 4 minutes. À ×2 et ×4, ces durées sont divisées par deux et quatre. Le départ se fait près de l'aube : la première fin de nuit est donc courte.
- Sélectionner les soldats, puis **Opérations** : préparer l'équipe, vérifier les munitions, charges de sabotage et équipements, ajouter approche, observation, infiltration/sabotage et retour. Les ordres manuels interrompent le programme ; les unités marchent réellement au point de retour.
- L'écoute directionnelle est liée aux unités sélectionnées. Les indices vieillissent et disparaissent ; une source éloignée donne une direction incertaine, pas une position exacte. Les optiques et la vision nocturne participent à l'observation effective.
- **Sauver** enregistre la campagne. Une sauvegarde automatique complète les sauvegardes manuelles.

### Lisibilité acoustique et pistes

- Les sons sont fusionnés par catégorie et relèvement; au plus trois indices de proximité apparaissent près des unités sélectionnées, et deux flèches au bord d'écran indiquent uniquement les sources hors champ.
- Les tirs et les pas annoncent une portée théorique compacte au lieu de dessiner des cercles géants présentés comme une détection certaine.
- Les déplacements laissent des empreintes périssables dont la durée varie selon le sol et la posture. Une patrouille Bèè doit repérer une piste fraîche et avoir une ligne de vue pour la signaler; les pistes ennemies ne sont montrées au joueur qu'après découverte.
- Le vent est fortement abaissé et filtré dans les basses fréquences pour laisser les pas, tirs et machines audibles.

### Bèè et démarrage établi

- Les soldats Bèè utilisent la planche à 16 poses en tenue rouge et casque de cuir. L'original est préservé ; la version affichée enlève la contamination de transparence autour des personnages.
- Le bouton **Départ établi**, en haut à droite, lance une nouvelle carte avec moulin, grenier, atelier, bureau d'études, caserne, entrepôt, stocks substantiels, seize villageois et quatre soldats. La menace Bèè reste active.

## Changements livrés

### Temps, observation et opérations

Horloge à pas fixe, vitesse séparée du calendrier solaire et suppression des ralentissements implicites de la nuit et des impacts. Les renseignements sur les ennemis sont mémorisés ; leurs états cachés ne remplacent pas automatiquement les observations anciennes. Les FX de construction et de combat sont filtrés par la visibilité.

Préparation d'opération avec avertissements sur l'équipement réellement porté, séquence d'ordres, règles de feu et bilan de retour. Le sabotage consomme une charge disponible et interrompt temporairement l'exploitation sans supprimer la réserve du gisement. Un blessé ne quitte pas automatiquement une opération pour un ravitaillement ordinaire.

### Adversaire

Deux villes initiales, soit **56 civils et 24 soldats Bèè** au départ. Recrutement, plafond d'armée et cadence d'expansion renforcés. Les villes conservent leur économie, leurs mines, leurs voies et leurs trains : il ne s'agit pas de vagues sans origine.

Patrouilles de secteur selon les forces disponibles, éclaireurs éloignés, alertes acoustiques incertaines, recherche et transmission différée des observations. Les offensives évaluent les objectifs connus, regroupent les troupes, préservent une garnison et peuvent lancer une diversion. Les contre-attaques et la reconquête existantes sont renforcées. Les défenseurs ne disposent pas d'un suivi visuel permanent du joueur hors observation.

### Combat, atelier et présentation

Concepteur continu et radiographie **3D** conservés. Transmission des réglages de l'arme à ses capacités de jeu et dessin de l'artillerie à partir de sa conception. Orientation de l'arme et origine visuelle du tir partagées ; proportions liées au modèle du designer. Les servants et leur disponibilité restent liés à l'utilisation des pièces.

Explosions : dégâts renforcés, surtout contre les bâtiments, souffle et FX augmentés, destruction des éléments de voie, murs, arbres et tranchées selon leur résistance ; cratères persistants affectant la navigation. Ce n'est pas une reconstruction volumétrique intégrale du terrain.

Camouflage : planche de 16 poses sans fusil pré-dessiné, afin d'éviter de superposer une arme fixe à celle du concepteur. Radiographies de combat compactes. Cris de douleur courts et gémissements plafonnés, sans boucle continue.

### Bruitages

Les enregistrements WAV existants sont conservés et enrichis par des couches de détonation, grave, mécanisme et débris. Familles distinctes selon le calibre et l'architecture. Écho moins envahissant, limitation des sons simultanés et compression pour éviter qu'une grande bataille couvre tous les indices.

Avec une unité sélectionnée : distance et obstacles atténuent les sons, les aigus diminuent au loin, la stéréo traduit la direction et un délai représente la propagation. Un tir discret est atténué. Sans unité sélectionnée, l'écoute de caméra reste disponible. Aucun nouvel enregistrement professionnel n'a été créé ; la qualité subjective du mixage n'est pas certifiée par les tests automatiques.

## Vérifications et limites

- **39 tests déterministes réussis, 0 échec** : vitesses, durée du cycle, pause, dette de simulation, équipement continu, sauvegarde/RNG, optiques/NV, incertitude acoustique, FX cachés, opération complète avec approche/observation/retour sans téléportation, sabotage réparable, servants, pièce sous-servie encore rechargeable avec malus, renseignement différé, patrouilles accessibles, deux villes initiales et explosion coupant une voie avec cratère franchissable.
- Bancs historiques 8 et 15 réussis après les modifications de logistique et de combat. Les 15 bancs historiques avaient également été exécutés auparavant ; ils ne constituent pas une validation exhaustive de tous les changements ultérieurs.
- Trois campagnes déterministes avec **joueur passif**, configuration de renforcement à deux villes : graines 301/302/303. Jusqu'au jour 30, 63–99 soldats au pic, 20–24 membres de patrouille au pic, 4–5 villes, 1–3 trains et 1–2 offensives. Le joueur passif perd au jour 21 pour la graine 302 ; les deux autres capitales survivent au jour 30. Ces essais précèdent le dernier mixage audio et les derniers ajustements mineurs de regroupement : ils démontrent une activité stratégique, pas un équilibre final contre un joueur expérimenté.
- Inspection du navigateur : interface, tir, pièce, visualisation radiographique 3D réellement affichée ; pas seulement un bouton intitulé « radiographie ». Le harnais de test est exclu de l'EXE.
- L'équilibrage reste un réglage initial. L'ensemble des résolutions, armes extrêmes, situations de combat et sauvegardes anciennes n'a pas fait l'objet d'une recette manuelle exhaustive.

## Sources et reproduction

Sources : dossier `oberkommando-v10`. Tests : `node jeu/test/v10.mjs`. Bancs : `node jeu/test/node.mjs 8 15`. Construction locale : `node build-v10.cjs` avec les dépendances et la distribution Electron locales déjà préparées. Le script de construction vérifie l'absence de dépendances npm d'exécution avant le conditionnement portable.

Asset de camouflage : `jeu/assets/custom/meumeu-camouflage-v10.png`, PNG RGBA 1222 × 1287, alpha vérifié de 0 à 255. Méthode : édition raster générative de la planche fournie, consigne de préserver les 16 poses, leurs silhouettes et le camouflage en supprimant les fusils intégrés, fond transparent. Le rendu des armes est ensuite assuré séparément par le jeu. La planche d'origine reste conservée.

SHA-256 de la V9 originale inchangée : `6C168FA216DBF369CAEC1B12808143610DA3C88D8CF01AFD3F6EDB0A00593332`.

## Paquet final vérifié

Portable final : `../Oberkommando der Meumeu V10.3.exe`, 140 951 745 octets. SHA-256 : `A0711589D4CD18A2224E98589AEF06B48309A8C6B3E0F80BF8316DD5812282C3`.

Construction terminée avec succès. Comparaison des 792 fichiers du jeu avec le contenu embarqué : aucune différence ; dossier de tests exclu. Le portable et l'application décompactée démarrent sur Windows ; la fenêtre V10.3 répond et porte le bon titre. L'instance de contrôle a ensuite été fermée. Ces vérifications ne prétendent pas valider acoustiquement le mixage ni jouer une campagne manuelle complète.
