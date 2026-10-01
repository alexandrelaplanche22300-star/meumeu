# Suivi — passage en 3D, guerre brutale, véhicules (V12.x)

Ce fichier est la liste maîtresse : chaque demande du joueur y figure, avec son état, son critère de réussite et le test qui le vérifie.
Règles de travail : critères écrits AVANT de lancer un test ; critères initiaux et corrigés tous les deux gardés ; une phrase de point à chaque étape ;
pas de sous-agents ; aucune régression (HUD, FX, mécaniques) ; on ne coche que ce qui est mesuré ou vu.

Légende : [x] fait et vérifié · [~] fait, à vérifier/affiner · [ ] à faire

## A. Vision (la raison de tout)
« À force que la guerre devient brutale, les villes deviennent des forteresses, les assauts sont brutaux et beaux dans leur brutalité. »
→ escalade de la guerre (niveau 0–5), artillerie et fusées des deux camps, tranchées, mitrailleuses lourdes, blindés, antimatériel, pas de tir.

## B. Rendu 3D
- [x] Pipeline OBJ → low poly (outils/convertir.cjs) ; 37 modèles d'origine convertis (jeu/assets3d)
- [x] Scène 3D isométrique calée sur la vue (js/scene3d.js), touche V, défaut 3D
- [x] Bâtiments, arbres, filons, unités animées (marche), train, faune, charrette, avions
- [x] Rochers procéduraux plus naturels ; zones de roche du terrain 2 à 5 fois plus petites (gen.js)
- [x] Arsenal/tour : plus de VTOL ; ailes du moulin qui tournent (pièces séparées)
- [x] Rails plus larges, train plus grand
- [~] Bras levés, arme tenue, recul physique, rechargement, ressources portées devant soi
- [ ] Nouveaux modèles : ATank, porte-canon à casemate (meumeuguncarrier), lance-roquettes, fusées historiques ×2, mitrailleuse à bouclier et roues, véhicule blindé, voiture blindée ancienne, gros canon, affût « high caliber or ramp gun carriage », fusil d'assaut + projecteur IR + lunette
- [ ] Modèles en pièces animables (roues, tourelle, canon, bouclier) — convertir en plusieurs pièces avec pivots
- [ ] Traçantes visibles en 3D (trajectoires 3D)
- [ ] Armes : plus de détail (moins « low poly »), mains qui tiennent vraiment l'arme
- [ ] Plus d'animations (mort, course, accroupi, tir, soin, construction, coupe d'arbre, minage)
- [ ] Sol 3D et caméra libre (rotation/inclinaison)
- [ ] Effets brutaux et beaux : barrages, cratères, fumées, éclats, flammes, tremblements (3D)

## C. Concepteur d'armes en 3D
- [x] Plateau 3D (tourner, zoom, recul, éclair) ; armes conçues en 3D dans les mains et sur les affûts
- [x] Batterie de fusées en 3D (affût à roues)
- [ ] Module « roues » (affût à roues pour mitrailleuse/canon) + bouclier ; modèle « mitrailleuse à bouclier et roues »
- [ ] Affûts très lourds (« high caliber carriage ») pour gros canons et lanceurs de fusées
- [ ] Vues 3D : blindages, munition

## D. Armes et artillerie
- [x] Batterie de fusées de départ (Meumeu, Bèè), tir indirect en salve, test F1–F5 (test/fusees.mjs)
- [ ] Modèles 3D cohérents des lance-fusées (plateformes autopropulsées de gros calibre) d'après les nouveaux modèles
- [ ] Artillerie : modèles améliorés (gros canon, casemate, affût lourd)
- [ ] Pas de tir constructible (très cher) pour gros canon / fusées lourdes
- [x] Fusil antichar à verrou, gros calibre (4,5 mm), bipied, 2 servants ; mitrailleuse lourde à roues et bouclier, 3 servants (Meumeu + Bèè) ; module « roues » du concepteur ; règle : une arme à un coup, même lourde, tient sur bipied (la mitrailleuse exige le trépied)

## E. Véhicules
Demande du joueur (2026-10-01), à enchaîner dès que l'IA est réglée, « de manière très poussée » :
- [~] Conduite et recherche de chemin propres (rayon de braquage, accélération, pas de glisse ; beau à voir se mouvoir)
- [x] Embarquer / débarquer des Meumeu selon le nombre de places
- [x] Tourelles mobiles, plusieurs canons par tourelle, calibres différents et cohérents ; tourelles et canons employés « à la perfection » (choix de cible, de l'arme selon la cible)
- [x] Blindage adapté et fixe (pas encore de personnalisation des véhicules) ; jeep presque pas blindée
- [x] Coût en ressources (test/vehicules_garage.mjs G1–G5, tout passe sur 101, 104, 107 : prélevé exactement à la commande, refus motivé s'il manque une arme montée)
- [x] Protection balistique réaliste : pénétration, ricochet, non-pénétration ; si pénétration → éclats, ou Meumeu blessé / tué directement
- [x] Garage (Meumeu) : construire des véhicules (durée et ressources) — char en 70 h, jeep en 10 h, sortie sur une case qui débouche (vehOpenAt), cinq en attente au plus
- [x] Plusieurs engins à la fois : le cadre de sélection prend aussi les engins de combat, Maj+clic en ajoute ou en retire ; clic droit : de front, sur une ligne perpendiculaire à la marche, espacés selon leur largeur, chacun du côté où il est (vérifié en jeu, gestes simulés : trois engins choisis, trois places à 2,6 cases d'écart, tous arrivés)

### Plan véhicules (écrit le 2026-10-01, avant d'écrire le code ; chaque étape a son critère mesuré)
Modèles fournis, pièces inspectées (outils/pieces.cjs, convertir.cjs --objets, page jeu/_pieces.html) :
- vintage_military_jeep_logistic_unarmed / _with_gun : jeep, 4 roues (pièces 2, 5, 7, 10), mitrailleuse arrière (26, 38, 42) ; avant vers +x
- vintage_armored_car : automitrailleuse 1914-18, tourelle en dôme (2, 8, 14) et sa mitrailleuse (20), roues (4, 18…)
- armored_vehicle : en fait un char léger à chenilles (2, 33), tourelle (4, 29, 31, 32, 7), antenne
- guncarrier_casemate : canon automoteur à casemate sur chenilles, tube (25, 35)
- armored_car : DEUX voitures blindées dans un même fichier (à séparer ou à n'en garder qu'une)
- heavy_carriage : affût très lourd (pas de tir), pas un véhicule roulant
Échelle : le monde est à l'échelle des peluches (fusil bèè 2,0 mm, antichar 4,5 mm qui perce ~3,7 mm d'acier) → les blindages se calibrent sur la perforation calculée par le jeu (W.pen, de Marre), pas sur des chars historiques.
- [x] V1 Pièces animables : outils/convertir.cjs (VEHICULES, découpe par numéros de pièces, roues avec jantes rattachées d'office, pivots base/culasse) ; jeep, jeep à mitrailleuse (affût), automitrailleuse (tourelle + 2 mitrailleuses jumelées), char (tourelle + canon + barbotins), automoteur (2 tubes jumelés). Vérifié en images (pose tourelle 40°, armes relevées, roues tournées : rien ne se détache)
  - contrôle des modèles (demande du joueur : ne pas déformer, centrer les axes ; page jeu/_pivots.html, vue de dessus tourelle à 0/90/180/270°) : échelle uniforme (setScalar sur la longueur) — aucune déformation ; largeur visible toujours un peu sous l'emprise logique (0,76/0,85 · 0,98/1,0 · 1,30/1,40 · 1,38/1,45) ; roues : une roue par pièce, pivot au centre (écart ≤ 0,008 case) ; tourelle de l'automitrailleuse à 0,001 case du centre de sa couronne, celle du char centrée sur son corps (les 4 positions se superposent) ; affût de la jeep sur son poteau
  - corrigé : les deux tubes de l'automoteur tournaient ensemble autour de leur culasse, au fond de la casemate (ils glissaient de côté à travers la plaque) → un tube par pièce, chacun pivotant dans sa rotule à la plaque avant (convertir.cjs, pivot « masque » : le sommet de la caisse le plus en avant à la hauteur et dans la largeur du tube) ; géométrie identique au bit près, seuls les pivots changent ; hausse autour de l'axe du tube puis direction (ordre des rotations) ; la logique de tir suit le modèle (rotules à 1,12 case devant le centre et ±0,30 de l'axe, bouche au nez à 0,18 — avant : ±0,15 et une bouche 0,12 case en l'air devant l'engin)
- [~] V2 Conduite (js/vehicules.js, test/vehicules_conduite.mjs C1–C5) : itinéraire de grille à la mesure de l'engin (il doit y tenir dans un cap au moins) + horizon glissant d'A* hybride (arcs de braquage réels, marche arrière et rebroussements, pivots des chenillés au coût de leur temps, emprise, marge gardée autour des engins garés) + pilote (poursuite pure, vitesse selon courbure/terrain/arrêt, place libre mesurée le long du chemin, manœuvre en plusieurs temps) + chien de garde de progression (le long de l'itinéraire). Mesuré sur 10 graines × 5 engins × 4 buts : 196–197 buts sur 200 atteints à temps, 6 graines sur 10 sans aucun défaut, jamais dans une case interdite, rayon minimal toujours tenu. Reste : quelques très longs détours (930 cases) ratés, écart p95 à 0,62 au lieu de 0,6 sur 2 graines, coût moyen jusqu'à 0,56 ms par pas sur la graine aux longs détours
  - remesuré après V3–V10 (char 2,4 et automoteur 2,6 cases, feu, blindage) : 197/200, 6 graines sur 10 sans défaut — pas de régression. Échecs : automoteur bloqué (graine 102), jeep bloquée au bout d'un détour de 924 cases (109, 0,47 ms par pas), jeep à mitrailleuse 0,1 h en retard (101), écart max 1,09 (automitrailleuse, 101), p95 0,62 (jeep, 105)
  - corrigé (graine 102, l'automoteur figé 9 h à 58 cases du but) : mesuré pas à pas — en pivotant vers son point de visée, son flanc entrait de 0,01 case dans le coin d'un char garé ; refus, recalcul du même chemin, sans fin. Cause de fond : les chenillés prenaient les virages sans ralentir (le pilote ne regardait que l'erreur de cap actuelle), sortaient de 0,6 case par l'extérieur. Désormais le virage à venir se prend à la vitesse que permet le pivot (v ≤ 1,5·ω/k, au moins 55 % de la vitesse maximale) ; contre un engin ARRÊTÉ seulement, un pas de rechange tout droit avant d'attendre
  - trois réglages comparés sur les 10 graines : sans limite 197/200 (6 graines sans défaut, écart chenillés 0,50–0,60) · plancher 45 % 195/200 (6, 0,43) · plancher 55 % **198/200 (7, 0,47)** — retenu. Les chenillés atteignent tous leurs buts ; restent deux cas anciens à roues (jeep à mitrailleuse 0,1 h en retard en 101, jeep bloquée au bout d'un détour de 924 cases en 109, 0,46 ms par pas) et deux écarts (automitrailleuse 1,09 en 101, jeep 0,62 en 105)
  - les gisements non épuisés sont désormais infranchissables pour les engins (vu en jeu : une jeep garée au milieu du chevalement d'un filon) → remesuré, 10 graines : **199/200 buts**, 6 graines sans défaut ; le seul but manqué : l'automoteur de 102 à 4,3 cases au bout du temps ; défauts restants : écart de la jeep à mitrailleuse pendant un demi-tour au rayon minimal (104 : max 1,59 ; 110 : p95 1,02 — jamais dans une case interdite), 0,51 ms par pas sur la graine aux longs détours (109)
  - essai écarté (mesuré pire) : planifier les arcs des roues à 1,15 × leur rayon minimal pour laisser de la marge au pilote → 192/200, les manœuvres serrées s'allongent
  - essai écarté (mesuré sans effet) : baisser le surcoût d'un passage étroit dans le planificateur ; les lacets des chenillés sont de vrais contournements (l'itinéraire de grille accepte un passage que l'engin ne tient que sous un cap)
  - corrections de test écrites dans le fichier : C3/C4 hors manœuvre de demi-tour ; l'horloge du monde avance ; buts et départs à plus de 3 cases des autres engins
- [x] V3 Places : embarquer/débarquer des Meumeu (conducteur, tireurs, passagers ; nombre de places par véhicule) ; sans conducteur, le véhicule s'arrête. test/vehicules_equipage.mjs E1–E6 : tout passe sur 101, 104, 107
  - correction de test écrite : sur 104 et 107 le but de E3 tombait sur un arbre, et sur 104 la jeep naissait dans une poche fermée par les arbres → départ sur une case qui débouche, but atteignable le plus proche. Le même défaut existait en jeu à la sortie du garage : corrigé (vehOpenAt, message « garage enclavé » sinon)
- [x] V4 Armement : tourelles (vitesse de rotation, débattement, hausse), plusieurs armes par véhicule (canon + coaxiale + caisse), calibres cohérents tirés des conceptions du joueur ; munitions embarquées. test/vehicules_feu.mjs F1–F7 : tout passe sur 101, 104, 107
- [x] V5 Emploi « à la perfection » : chaque arme choisit sa cible (perforant contre blindé, explosif contre groupe/ouvrage, mitrailleuse contre infanterie ; les antichars d'abord), la caisse s'oriente pour la casemate. Critère : test contre des Bèè (antichar visé en premier, pas de tir de canon sur un isolé quand une mitrailleuse suffit) — F2, F3, F6
  - correction de test F5 écrite : depuis que les balles qui percent la tôle blessent vraiment l'équipage, six fusiliers à 8 cases mettent la jeep à mitrailleuse hors de combat (0,2 h) avant que l'affût, au repos vers l'arrière, ait pivoté et visé (0,8 h) ; F5 mesure les munitions → cibles sans cartouches
  - réaction d'une arme montée (mesure d'information, jeep à mitrailleuse contre six fusiliers bèè armés à 8 cases, graines 101/104/107) : avant, jamais un coup (l'arme en garde vers l'arrière pivotait 0,35 h, visait 0,45 h, le servant tombait à 0,175 h) ; corrigé : garde vers l'avant (le modèle garde son orientation propre pour le dessin), visée d'une arme montée à 0,3 du temps du fantassin, passage à la cible voisine au prorata de l'angle, un passager valide reprend l'arme d'un servant tombé, les pièces sans cible pivotent vers le tireur qui vient de frapper, une balle n'abîme un organe que selon son énergie restante (mesuré : 22 % par balle cassait la mitrailleuse à la première salve) → premier coup à 0,10 h ; 2 hommes à bord : 16–20 coups puis perdue ; 4 à bord : gagne 2 combats sur 3 (4/6 et 6/6 Bèè hors de combat). Feu, blindage, équipage : tout passe sur les 3 graines
- [x] V6 Blindage : plaques par face (avant, flancs, arrière, dessus, tourelle) avec inclinaison ; jeep presque nue. test/vehicules_blindage.mjs B1 (calibrage) : fusil bèè 0,77 mm à 25 m < automitrailleuse ≥ 0,9 mm effectifs (arrière et flanc épaissis de 0,7/0,8 à 0,9 : mesuré, l'arrière cédait au fusil) ; antichar 3,38 mm à 50 m > flanc du char 2,0 ; < avant du char 4,39
- [x] V7 Balistique du coup : obliquité, ricochet (angle critique selon épaisseur/calibre), non-perforation (étincelles, choc), perforation → éclats dans l'habitacle, Meumeu blessé ou tué (modèle de blessure existant), dégâts (moteur, tourelle, canon, feu). test/vehicules_blindage.mjs B1–B10, tout passe sur 101, 104, 107 :
  - B2 six fusils 4 h sur l'automitrailleuse : 0 perforation sur ~46 impacts, personne touché · B3 deux antichars : 6–8 perforations, équipage touché · B4 fusils sur la jeep : tout passe, 4/4 touchés · B5 antichar sur le char : avant 92–94 % arrêtés + 6–8 % ricochets, flanc 96–98 % percé · B6 l'antichar préfère l'engin · B8 à 12° de l'axe : 22–30 % de ricochets · B9 obus à 1 case : équipage de jeep touché comme à terre (8–11 contre 4–11 sur 40 obus), automitrailleuse et char : personne · B10 les Bèè voient nos blindés
  - mesuré et corrigé en route : face choisie par quadrant (jamais de ricochet) → au prorata de la surface présentée ; rayon de vehCrewHit qui manquait presque toujours le corps ; éclats de blindage de 15–95 g (jusqu'à 100× l'énergie de la balle) → le bouchon d'acier découpé ; 74 % de chances qu'une balle perçante touche un des 2 hommes → 1−(1−a)ⁿ ; les engins n'étaient pas vus de plus loin qu'un homme (signature ×2,2)
  - rendu : étincelles (non-perforation), éclat dévié réfléchi sur la normale de la face (ricochet), débris lumineux (perforation), son de ricochet ; panneau du véhicule : dégâts (organes, feu, arme hors d'usage) et dernier coup (face, angle, épaisseur effective contre perforation)
- [x] V8 (test/vehicules_garage.mjs) Coûts et garage : bâtiment garage, durée et ressources par véhicule, armes montées prises au dépôt. Critère : coûts lus dans l'interface, production mesurée
- [~] V9 Rendu « beau à voir se mouvoir » : roues qui tournent selon la distance, chenilles, suspension, poussière, échappement, tourelle qui pivote, recul, flammes de bouche, traçantes. Critère : images — fait : roues selon la distance, suspension, tourelle et armes qui pivotent, ricochets ; recul du tube le long de son axe selon le calibre (mesuré en jeu : char 0,05 case, automoteur 0,09, mitrailleuses 0,008, retour en ~0,6 s) ; flamme, fumée et traçante à la hauteur réelle de l'arme (avant : à hauteur de fantassin) ; poussière de chaque côté derrière les roues/chenilles selon la vitesse, échappement à l'arrière ; équipage visible dans les jeeps (assis, échelle uniforme 0,8, le servant debout derrière sa mitrailleuse et tournant avec elle) — vu en images (graine de test, 13 h) ; reste : chenilles qui défilent
- [x] V10 (remesuré : test/escalade_armes.mjs tout passe sur 104 et 107 — premier antichar aux jours 17 et 16 après des blindés vus au jour 16 ; sur 101, H1/H2 échouent comme avant, graine lente : une seule équipe lourde en fin de partie) Bèè face aux blindés : vus → antichar, les antichars visent les véhicules en priorité, les fusils ne gâchent pas leurs cartouches sur un blindé qu'ils ne percent pas. B6, B10 (mesuré : beeeSawArmor cherchait un champ « armored » que les engins de combat ne portaient pas — les Bèè ne voyaient jamais nos blindés)

- [ ] Jeep de transport (mitrailleuse arrière) : ressources, munitions, soldats
- [ ] Voitures blindées (chères, longues à produire, tourelle, blindage — balistique du blindage simulée)
- [ ] Char (ATank) et porte-canon à casemate
- [ ] Meumeu à l'intérieur des véhicules (soldats ou non)
- [ ] Trains et véhicules intégrés ; échelle des trains cohérente

### Non-régression après le chantier véhicules (2026-10-01, 27 tests, même script que la passe de 05 h 52)
- identiques : 24 tests (mêmes PASS/FAIL, ou journaux identiques mot pour mot pour ceux qui racontent sans critère) ; mobilisation 10/6 comme avant (6 échecs anciens)
- armee : coupé à 540 s (lancé en même temps que les tests les plus lourds) — à relancer seul
- issues changées (sans critère de réussite) : sabotage (graine 51, 20 jours simulés avant la scène : 2 gardes autour du dépôt au lieu d'un, les commandos repérés, le dépôt ne saute plus) et beee_reel (partie de 20 jours qui diverge) — déterministes (deux lancements identiques) ; les changements d'aujourd'hui sont inertes sans engin de combat (vérifié : pas de tirage aléatoire, rien de modifié) ; la divergence vient des réglages d'économie et d'IA faits depuis 05 h 52 (usure des mitrailleuses, ravitaillements abandonnés après 24 h…) — effet papillon, pas une panne
- expansion, saccades : même partie, temps de calcul plus élevés en parallèle ; perf : aucune mesure antérieure de la phase « images de fin de partie » (l'ancienne passe construisait encore l'instantané) — mesuré seul : 47 ms par image en médiane, 542 ms au pire (70 jours, 3 851 Bèè) ; corrigé au passage : chaque soldat parcourait tous les véhicules (trains et fret compris) en cherchant sa cible → liste des engins de combat tenue une fois par pas

## F. IA bèè (guerre totale, expansion permanente, forteresses)
- [x] Niveau d'escalade (0–5) ; offensives plus audacieuses ; tranchées plus tôt et plus profondes (test/escalade.mjs G1, G3, G4)
- [x] Colons équipés (kit versé à la fondation) + plus de bâtisseurs + colonies moins chères + 3 fondations de plus à la fois + moins de soldats au début : 8 villes au jour 24 → 11 (graine 101) ; 27–37 villes au jour 35 sur d'autres graines
- [~] Conquête ferroviaire des sites lointains (code posé, non validé seul) ; reconnaissance lointaine (reach 140+60×niveau)
- [~] Critère G2 (première offensive) : initial « ≤ jour 12, ≥ 5 » irréaliste (ennemi à 12 jours de marche) → corrigé « ≤ jour 20, ≥ 4 » ; mesuré avec les nouveaux réglages : première offensive jours 26–33, 2 à 5 offensives en 34 jours → à revoir ; après le réglage du 2026-10-01 : jours 14 / 16 / 23 (graines 107 / 104 / 101), 6 / 7 / 3 offensives en 30 jours
- [ ] Un joueur automatique faible fait tomber la capitale : à régler avec un vrai test de défense (joueur armé)
- [x] Réglage de l'IA bèè (2026-10-01), pannes trouvées par sondes et corrigées une à une :
  - la manufacture de la capitale n'était jamais finie (bâtisseur enfermé dans l'emprise du chantier, 175 h sans bouger ; sa réservation « en route » bloquait tout) → pas de côté hors d'une case infranchissable (world.go), voyage abandonné après 24 h, l'industrie payée à moitié attend 10 jours
  - le kit des colons vidait la capitale de sa pierre → il ne prend que le surplus des dépôts ; les chantiers en attente comptent comme un manque du plan
  - une usine à la fois pour tout l'empire, la manufacture toujours en premier → l'usine dont le produit manque le plus, deux chantiers dès six villes, rien de plus avant le trio arsenal-caserne-manufacture de la capitale
  - cartouches : le cuivre manquait 20 jours → étuis d'acier laqué pour les armes de masse bèè ; les mines suivent le manque national
  - recrues formées en attente (≈400) → la caserne réclame jusqu'à 12 armes et en libère 8 par passage
  - équipes lourdes : dotation exacte (5,1 caisses pour la mitrailleuse lourde, fusils des servants), commandées par les 3 villes de caserne les plus proches de la menace, plafond 2 + 2 × niveau
  - reconnaissance : jamais lancée (prise dans une colonie trop faible), bornée à 140 + 60 × niveau, écart de ±150 cases → la ville la plus avancée qui peut céder deux éclaireurs, jusqu'au bout de la direction connue, ±25 cases
  - mitrailleuses : munitions ×1,5 (bande, maillons), usure du tube → une pièce au dépôt tous les 1/8 de vie de tube, sinon enrayages ; la très lourde réservée aux villes de caserne, la légère suit la doctrine, le fusil reste la majorité
  - mesuré (graines 104 / 107, 30-32 jours) : 1re mitrailleuse lourde jours 7 / 5, antichar 3 / 2 jours après nos blindés, 1re offensive jours 16 / 14, 7 / 6 offensives, capitale du joueur automatique tombée, pire heure < 1,2 s → H1–H5 et G1–G4 passent
  - graine 101 plus lente (carte pauvre) : mitrailleuse lourde jour 19, 1re offensive jour 23, 3 offensives, capitale tombée → H1, H2, G2, G3 échouent encore sur cette graine (critères gardés tels quels)
- [~] Les Bèè utilisent la mitrailleuse lourde, le fusil antichar (batteries retirées : supériorité meumeu) : js/escalade.js, test/escalade_armes.mjs (H1–H5) — passe sur 2 graines sur 3
- [ ] Les Bèè construisent des lignes de tranchées (petites suffisent) autour des zones importantes ; nids de mitrailleuses
- [ ] Les Bèè produisent des fusils antimatériel dès qu'ils rencontrent des voitures blindées
- [ ] Barrage d'artillerie avant l'assaut ; désolation du territoire par l'artillerie
- [ ] Villes qui deviennent des forteresses à mesure que la guerre devient brutale
- [ ] Les Bèè peuvent construire des blindés et des plateformes lourdes

## G. Son
- [x] Nappes : plus de grondement continu ; vent, oiseaux, grillons, hibou
- [~] Voix des Meumeu : petit veau aigu et mignon — à écouter
- [~] Coups de feu refaits (assets/sfx/forge2.py) — à écouter ; ambiance de bataille — à écouter

## H. Terrain
- [x] Taches de roche/lande plus petites, bords irréguliers, vallée de la capitale protégée

## I. Livraison
- [x] V12.0 sans le Hub (ancien concepteur conservé)
- [x] V12.2 (les engins de combat) : `Oberkommando der Meumeu V12.2.exe` + `.zip` à la racine (2026-10-01) ; section V12.2 en tête de LIVRAISON-V10.md ; paquet vérifié (aucun fichier `_*` ni test embarqué — filtre d'emballage « !**/_* » —, fichiers du jeu identiques aux sources) ; tests de recette lancés en fin de lot (voir la non-régression ci-dessus)
- [ ] Envoi sur GitHub (gh absent ; .gitignore pour exe/.runtime) — à faire à la demande finale

## K. V12.3 — demandes du 2026-10-01 (après la V12.2), dans l'ordre reçu
- [x] K1 Éditeur de pièces V6 retiré (« superflu et inutile ») : classe DesignerKit, bouton de l'atelier, styles .kb, 68 silhouettes svg ; le modèle de calcul kitCalc/kitToP reste (armes de départ). Sauvegarde : scratchpad backup_v122.
- [x] K2 Bouclier : hauteur ET largeur réglables dans l'atelier ; la plaque dessinée (2D et 3D) = la plaque du combat (du sol à h, largeur w).
  - VÉRIFIÉ (session cloud) : test/bouclier.mjs B8 (critères écrits avant) : 40×30 → S.h 0,40 / S.w 0,30, masse h·w·t·ρ, réglage d'un seul côté sans effet sur l'autre ; en combat la grande plaque arrête 532 tirs sur 600 contre 196 pour celle par défaut. B1–B7 inchangés : tout passe.
- [ ] K3 Plateau 3D : tous les Meumeu à la même taille (pas d'écrasement « à genou », pas de grossissement par la perspective).
- [x] K4 Modèles convertis : « l'aspect sombre bizarre » ; il avait donné des textures 4k/2k.
  - CORRECTION (scene3d.js) : le soleil vient du côté de la caméra (sunOff 43,47,29), ciel et sol neutres (0xfcfbf7 / 0x9a9a90, 2,0), soleil 0xfff8ef 2,2
  - MESURÉ (essai 1, lumière encore chaude : rapport 0,942, orange +0,031 → C2 manqué de 0,001 ; lumières neutralisées) → essai 2 : **C1 0,957 · C2 +0,015 ·
    C3 +X 0,61 / +Z 0,41 · C4 ombres 0,045** → les quatre passent (captures lumiere_avant.png / lumiere_apres2.png)
  - [ ] K4b les vraies textures (4k/2k) : cuire la texture d'origine sur le modèle réduit (atlas par triangle) — gros chantier, à faire après les autres
  - diagnostic (scratchpad shots/scene_lumiere.cjs : même image rendue deux fois, éclairage du jeu puis lumière blanche uniforme = la couleur propre des sommets) :
    luminance rendue / couleur propre = **0,579** ; teinte orange (R−B)/(R+V+B) 0,248 contre 0,163 ; la caméra voit les faces +X et +Z (0,61), le soleil
    éclaire −X et −Z (+X : −0,46, +Z : −0,27) → tout ce que le joueur voit des murs et des peluches est à contre-jour, éclairé par le seul ciel, chaud et brun
  - CRITÈRES (écrits avant la correction) : C1 rapport rendu/couleur propre entre 0,85 et 1,15 ; C2 décalage orange (rendu − propre) ≤ 0,03 ;
    C3 les deux faces que voit la caméra reçoivent le soleil (cos ≥ 0,25 chacune) ; C4 les ombres portées restent (part de l'image ≥ 0,02 ; avant 0,075)
- [x] K5 Bèè saccadés. (Moins de civils bèè : ABANDONNÉ à la demande du joueur, 2026-10-01 : « ne limite pas le nombre de bè, ça passe ; les saccades c'est une erreur d'animation ».)
  - suite (session cloud) : la position glissait, mais la FOULÉE (u.walkPh) avançait encore de quatre pas une image sur quatre → jambes qui sautent. lodShow interpole aussi walkPh ;
    View.draw la remet. test/bee_fluide.mjs S4 (critère écrit avant) : CV de la foulée 1,73 → 0,00, plus grande avance / moyenne 1,00 ; S1–S3 passent (simulation identique au bit près).
  - cause des saccades : le niveau de détail (world.js) ne simule les Bèè loin de tout Meumeu qu'un pas sur quatre, avec un pas quatre fois plus long →
    à l'écran : immobiles trois images, puis un saut. Correction d'affichage seulement : World.lodShow + View.draw (la simulation garde son économie de calcul)
  - CRITÈRES (test/bee_fluide.mjs, écrits avant) : S1 déplacement affiché régulier (CV ≤ 0,5, plus grand pas ≤ 2 × moyen) ; S2 vraies places remises ;
    S3 simulation identique au bit près avec ou sans affichage
- [ ] K6 Carte : biomes rocailleux = plus de filons mais plus petits et plus dispersés (ils empêchent la culture) ; sable inchangé ; l'herbe prédomine.
- [ ] K7 Engins générés par le code (fin des modèles convertis déformés) ; pivots exacts par construction.
- [ ] K8 Modèles 3D superflus retirés du jeu.
- [ ] K9 Audit, revue, corrections, axes d'amélioration.
- [ ] K10 La nuit, les villes beaucoup plus éclairées : chaque bâtiment émet de la lumière (capture du joueur : on ne voit presque rien).
- [ ] K11 Les arbres sont détruits quand on pose un bâtiment dessus.
- [x] K12 Les arbres deviennent transparents autour de nos unités et des unités ennemies repérées (V12.4 : scene3d, lots « fantômes » par essence, opacité 0,22, sans ombre ; deux cases autour de chaque unité ; capture arbres.png).
- [x] K13 (capture du joueur : « 0/12 coups · sans observateur ») L'artillerie ne tirait plus : une pièce à sec restait « plus d'obus » tant qu'on ne cliquait pas
  « Ravitailler », et le servant gardait une fraction d'obus impossible à donner (1,7 caisse d'un obus → 0,69 restante). Corrections : war.js servantCrates en coups
  ENTIERS ; world.js crewDry : à sec (tir sur zone ou en garde), un servant part seul au dépôt garni le plus proche (stock débité à son arrivée), le tireur ne bouge
  plus de sa position. test/artillerie_seche.mjs (critères écrits avant) : 12/12 coups en 48 h sans ordre (V12.2 : 2/12), pièce partie vide 11/12, conservation
  exacte, tireur immobile, coups entiers.
- [x] K14 Les servants de pièce ne portent PAS d'arme, seulement des munitions (règle du joueur, déjà demandée avant la V12) : releaseCrew et la sortie « servants »
  ne prennent plus de fusil ; sans fusil au dépôt, l'équipage sort (c'était le blocage de la caserne). test/caserne_pieces.mjs E2/E3/E5 corrigés (critères initiaux
  gardés, avec la raison) : tout passe. (Bèè : escalade.js garde sa dotation de fusils, sans effet sur la sortie.)
- [x] K15 Atelier : les modèles 3D convertis (mg_shield_wheels, atank, huge_cannon…) n'y sont plus — toute arme est générée par le code (vérifié : plus aucune référence).

## L. V12.4 — demandes du 2026-10-01 (session cloud), dans l'ordre reçu
- [x] L1 Moulin : les ailes du modèle converti étaient DANS la tour, côté opposé à la caméra (« détachées ») → ailes faites par le code (scene3d windSails),
  moyeu sur la face vue (+X), rotation autour de l'axe du moyeu. Capture moulin_a.png.
- [~] L2 Textures sombres : l'éclairage (K4) est corrigé depuis la V12.3 ; les modèles du joueur (soldat, chevalier) convertis avec leurs couleurs.
  Les vraies textures (K4b, cuire la texture sur le modèle réduit) restent à faire : le joueur peut renvoyer les fichiers d'origine.
- [x] L3 Formations bèè : ligne élargie (1,8) loin du but, ÉCHELON à < 30 cases, ligne de feu au contact ; colonne élargie (1,6 × 1,8) pour défense et
  contre-batterie. Trois colonnes de marche essayées pour les offensives : serraient (49–77 % à < 1 case), 2/3 n'arrivaient plus → abandonnées.
  test/formations.mjs (critères initiaux gardés, corrigés avec la raison) : M1' M3 M4 passent.
- [x] L14 Caméra libre (3D) : bouton du milieu = orienter (azimut libre, élévation 22° à 80°), Maj + milieu = déplacer, Origine = isométrie. view.js : projection
  générale (toScreen/toWorld) identique à l'ancienne aux valeurs d'origine ; la passe du sol (tuiles en losange, cratères, flaques, voies) est dessinée en
  isométrique sous une transformation affine (groundPass) ; scene3d : caméra et soleil tournent ensemble. Vérifié : aller-retour écran ↔ monde exact,
  captures cam_0/1/2 (sol, bâtiments, unités, sélection alignés).
- [x] L4 (suite) obus et fusées en maillages 3D (scene3d PROJ_GEO, lots obus3d/fusee3d), explosions 3D (boule, onde, dôme) ; en 3D, la couche 2D garde la
  traînée et l'ombre. Captures p3d_*.
- [~] L4 Projectiles et explosions : explosion à l'échelle de la CHARGE (kg, racine cubique), onde de choc jusqu'au rayon de souffle, jupe de poussière,
  mottes projetées, colonne de fumée pour les grosses charges ; traînée des obus sur l'arc, épaisseur selon le calibre, lueur au-delà de 20 mm.
  Reste : vrais obus 3D (maillages) dans la scène WebGL — aujourd'hui dessinés dans la couche 2D au-dessus.
- [x] L5 Bâtiments : dégâts déjà proportionnels à la charge (obusier : 3 coups pour une maison, 11 pour un centre-ville) ; ajouté 4 états visibles
  (suie, puis penche et s'affaisse — sans déformation) et une fumée qui croît avec les dégâts. Capture degats.png.
- [x] L6 Modèle du soldat meumeu (zip du joueur) : converti (outils/convertir.cjs via un adaptateur Node, 1 800 faces) ; soldats et servants = meumeu_soldat
  (casque compris), civils = peluche ; atelier = soldat.
- [x] L7 Tranchées : les Bèè creusent des FOSSES de 2 × 2 (au moins une par ville gardée dès le niveau d'escalade 1 — dès le premier jour, mesuré : régression de test/mobilisation.mjs, recherche 3,4 h au lieu de 0,14 h ; 1, 3 ou 5 selon le niveau) ; le dessin raccorde les cases voisines
  (une fosse = un trou). test/fosses.mjs F1–F3 passent.
- [x] L8 Véhicules : rien à corriger — Armer → Garage, puis Construire sur son panneau (jeep tout de suite ; les autres demandent leurs armes au dépôt).
- [x] L9 Vision nocturne : plus de recharge — la batterie est celle de la lampe (Wh = 200/35 × W ; 120 g au réglage moyen, plus lourde si plus puissante),
  ne se vide pas ; plus de batteries à l'atelier ni au dépôt ; curseur « Batterie (Wh) » retiré. test/batterie.mjs réécrit (N1–N4, anciens critères gardés).
- [x] L10 Troupe de choc (modèle plush_cow_knight du joueur) : caserne d'élite (Armer) ; formation payée 90 vivres + 6 pièces ; plus de vie (seuils de
  perte de sang × 1,3), plus dure (saignements, choc, douleur × 0,6), poids de l'arme et de la protection ressenti à 50 %. test/troupe_choc.mjs C1–C6.
- [x] L11 Sons des tirs : les fichiers jouent ; mais avec une sélection, un tir à plus de ~25 cases des soldats choisis était MUET même à l'écran (V12.2 :
  volume 0, mesuré) → la plus forte des deux écoutes (soldats choisis ou caméra) : 0,85.
- [x] L13 Modèles d'origine renvoyés par le joueur (20 : chèvre, engins, trains, moulin, raffinerie, forge, four, tente, rochers) : reconvertis
  (outils/convertir-sans-electron.cjs) et comparés côte à côte avec ceux du jeu sous la caméra du jeu : IDENTIQUES — la conversion d'origine était juste.
  Le rendu « sombre et moche » vient du principe (une couleur par sommet sur 700 à 2 800 faces). Pour mieux : K4b (cuire la texture) ou plus de faces.
  military_firearms ignoré (demande du joueur).
- [x] L12 Servants livrables seuls, sans arme et même sans caisse au dépôt (ils iront chercher les obus) : test/caserne_pieces.mjs E9.

## J. Notes
- Le message du joueur sur les modules était tronqué (« dans module il devrait y avoir roue… ») : interprété comme « un module roues ».
- Les tests de recette longs (campagnes) ne se lancent qu'en fin de lot.
