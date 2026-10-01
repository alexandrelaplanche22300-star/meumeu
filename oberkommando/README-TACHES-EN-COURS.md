# Oberkommando der Meumeu — reprise du travail (V12.4 livrée, 2026-10-01)

Jeu RTS JS/Electron. Meumeu (peluches vache) = joueur ; Bèè (peluches chèvre) = IA.
- Jeu : `jeu/` (index.html, `js/`, `assets3d/`, `css/`) ; tests : `jeu/test/*.mjs` ; liste maîtresse détaillée : `SUIVI-3D-GUERRE.md` (section K = ce lot).
- Lancer un test (Windows, Electron fourni dans `.runtime/`, non inclus dans ce zip) : `ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/x.mjs [graine]` depuis `jeu/`.
  Avec Node ≥ 20 ailleurs : `node test/x.mjs [graine]` (les tests n'utilisent pas le DOM).
- Construire l'exe : `build-v10.cjs` (electron-builder), sortie copiée à la racine du dossier parent.
- Banc de captures (fenêtre Electron cachée) : `outils-dev/shots/harness.cjs` + scénarios `scene_*.cjs`.

## Règles du joueur (à respecter)
- Travail mesuré : critères écrits AVANT de lancer un test ; garder critère initial ET corrigé, avec la raison.
- Points d'étape courts, en français, souvent. Pas de sous-agents. Aucune régression. « Fiable, sans sur-complexifier ».
- Ne lancer le jeu que si aucune fenêtre du jeu n'est ouverte. Ne jamais pousser sur GitHub sans demande.
- Régler l'IA bèè avant de livrer quoi que ce soit. Seuls les Meumeu ont fusées, artillerie lourde, blindés. Les Bèè : surtout des fusiliers.
- Modèles 3D : jamais déformés (échelle uniforme, pas de scale.y), axes de rotation centrés ; préférer la génération par le code aux modèles convertis.

## V12.4 (session cloud du 2026-10-01) — livrée en exe
Détail et mesures : SUIVI-3D-GUERRE.md, sections K (fin) et L. En bref : K2 et K3 vérifiés ; K5 (foulée des Bèè) ; artillerie qui ne tirait plus (servant qui
va seul au dépôt, obus entiers) ; servants sans arme (même sans caisse) ; moulin ; fosses bèè 2 × 2 ; échelon ; explosions à l'échelle de la charge et
traînées d'obus ; dégâts visibles des bâtiments ; modèles soldat et chevalier du joueur ; troupe de choc et caserne d'élite ; vision nocturne sans
recharge ; tirs audibles à l'écran. K5b (moins de civils bèè) ABANDONNÉ à la demande du joueur.
Outils ajoutés : outils/convertir-sans-electron.cjs (convertir.cjs sous Node) et outils/glb2obj.cjs (GLB → OBJ).
Tests ajoutés ou réécrits : artillerie_seche, troupe_choc, fosses, formations, batterie (V12.4), bouclier B8, bee_fluide S4, caserne_pieces E9.

## Fait au lot précédent (V12.3 en cours)
- K1 [x] Éditeur de pièces V6 retiré (designer.js : classe DesignerKit, bouton ; css .kb ; svg du kit). kitCalc/kitToP gardés (armes de départ).
- K2 [code fait, À VÉRIFIER] Bouclier : hauteur `shieldH` et largeur `shieldW` (cm) réglables dans l'atelier (ballistics.js shieldOf, designs.js LIMITS,
  designer.js curseurs) ; la plaque dessinée (gun3d.js 3D, gunart.js 2D) va du sol à h sur la largeur w = ce que protège le combat (world.js hy<S.h, |ex|<S.w/2).
  Avant : dessin 3D deux fois trop large et centré sur l'axe. À faire : test (étendre test/bouclier.mjs : régler h/w change S.h/S.w, masse = h·w·t·ρ, sans réglage inchangé) + capture du plateau.
- K3 [code fait, À VÉRIFIER] Plateau 3D de l'atelier (gun3d.js GunViewer) : caméra orthographique, plus d'écrasement « à genou » (scale.y .72) → tous les Meumeu même taille. Capture à faire.
- Armes « préfabriquées » (modèles convertis mg_shield_wheels, atank, huge_cannon…) retirées de gun3d.js : toute arme est générée par gunModel.
- K4 [x] Aspect sombre : le soleil éclairait les faces opposées à la caméra. scene3d.js : soleil côté caméra (sunOff 43,47,29), lumières neutres.
  Mesuré : rendu/couleur propre 0,579 → 0,957 ; orange +0,085 → +0,015.
- K5a [x] Bèè saccadés : niveau de détail (world.js tick, Bèè lointains simulés 1 pas sur 4). Correction d'affichage : `World.lodShow()` + `View.draw` → `paintFrame`.
  test/bee_fluide.mjs : TOUT PASSE (CV du pas affiché 1,73 → 0,00 ; simulation identique au bit près).

## À faire (ordre proposé)
0. Restes V12.4 : L2/K4b vraies textures (le joueur peut renvoyer les fichiers) ; L4 obus en maillages 3D dans la scène WebGL ; pose « accroupi »
   des soldats en 3D (aujourd'hui écrasement scale.y .72, contraire à la règle « jamais déformé »).
1. (ABANDONNÉ) K5b Moins de civils bèè nécessaires à l'économie, au profit de l'armée et des performances. Pistes : beee.js beeeRecruit (part armée `armed` = .22/.35/.55
   selon l'escalade), data.js BEEE.boost (productivité bèè). Mesurer AVANT/APRÈS avec test/beee_bilan.mjs 104 30 10 et 107 (civils, soldats, villes, temps).
   Critères suggérés : civils/population −25 % relatif, armée +15 %, villes et production d'armes ≥ 90 % d'avant, pire heure pas plus lente ; puis escalade.mjs / escalade_armes.mjs.
2. K6 Carte (js/gen.js) : biomes rocailleux (T.scrub/T.rock) = filons plus nombreux mais plus petits (left) et plus dispersés ; ils empêchent la culture ;
   sable inchangé ; l'herbe doit prédominer. Mesurer parts de terrain et taille/espacement des filons sur 10 graines avant/après.
3. K10 La nuit : villes bien plus éclairées, chaque bâtiment émet de la lumière (view.js drawNight : `light(...)` par bâtiment fini, rayon 2,5 aujourd'hui).
4. K11 Poser un bâtiment sur des arbres les abat (world.js place / canPlace : nœuds 'tree' sous l'emprise → retirer, comme du bois récolté).
5. K12 Arbres transparents autour de nos unités et des ennemis repérés (scene3d.js : pools d'arbres instanciés → opacité ou masquage par instance près des unités).
6. K7 Engins générés par le code au lieu des modèles convertis déformés (scene3d.js vehicleGroup attend des pièces {name,pivot,geo} : caisse, roueN,
   tourelle, canon, armes, affut, canons_g/canons_d). Construire en cases, avant +X, pivots = VEHDEF.armes[].pos (x avant, y côté → Z modèle, z hauteur × 0,8165 → Y),
   tube = longueur. Mettre `avant:'+x'` et retirer `repos` dans VEHDEF (vehicules.js). Pour les tourelles, vehMuzzle pourrait tourner le décalage latéral avec la tourelle.
7. K8 Retirer de jeu/assets3d les modèles non utilisés (garder ceux de scene3d.js MODEL_NAMES) ; vérifier les autres modèles en image.
8. K4b Vraies textures 4k/2k : cuire la texture d'origine sur le modèle réduit (atlas par triangle) dans outils/convertir.cjs. Gros chantier.
9. K9 Audit/revue : 105 requêtes de sons absents par lancement (assets/sfx/tir_leger*.mp3, mortier*, obusier*, fusee*, explosion_grenade*) ;
   tests de non-régression (scratchpad regress.ps1 : 27 tests) ; liste d'axes d'amélioration.
10. Livraison V12.3 : package.json version 12.3, build-v10.cjs, exe + zip à la racine, section V12.3 en tête de LIVRAISON-V10.md.

## Repères techniques
- 1 h de jeu = 4 s de combat (HOUR_REAL=4) ; 1 case = 4 m ; peluches 0,3 m mais engins à l'échelle des cases (échelle mixte).
- Scène 3D : x,y monde → X,Z ; hauteur h → Y = h·0,8165 ; caméra iso orthographique vue depuis +X+Z.
- Le dessin lit u.x/u.y partout : pour un effet d'affichage seulement, passer par View.draw (voir lodShow).
- Nom de méthode : vérifier par grep qu'il n'existe pas déjà (les modules s'écrasent en silence).
