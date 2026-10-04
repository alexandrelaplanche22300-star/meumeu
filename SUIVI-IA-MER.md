# Suivi — IA de la carte mer, abris, moulin (sessions du 3 et 4 octobre 2026)

À lire avant de reprendre. Le code est dans ce dépôt (`resources/jeu`, branche master, jamais poussé).

## Les instructions du joueur (à respecter)

**Batteries de tests**
- Faire des batteries de débarquement sur une longue période, avec des captures.
- L'allié IA est responsable de toute l'île (option `allyAll`) : tester des situations d'égalité de décision stratégique, pour évaluer et régler l'IA bèè.
- Évaluer et relever le plus d'informations possible.

**Têtes de pont**
- Les têtes de pont doivent être exploitées et efficaces, côté Bèè comme côté allié.
- Débarqué, on avance ou on tient, jamais de repli vers la plage.

**Abris**
- Les mises à l'abri sont locales par rapport à la menace ; sinon tout le pays s'arrête de produire.
- Un bouton « Aux abris » dans chaque centre-ville appelle les villageois d'une zone autour du centre.
- « Fin d'alerte » renvoie chaque villageois à la tâche qu'il faisait juste avant.
- La place dans les centres-villes est illimitée.
- Un centre-ville détruit : tous sortent et vont s'abriter au centre-ville non menacé le plus proche, au lieu de rester sans rien faire. Cela vaut aussi pour les IA.
- On sort de l'abri si sa ville n'est pas considérée comme attaquée.
- Les boutons « Aux abris » globaux sont limités aux villes proches de la menace.

**Moulin**
- Les ailes du moulin sont centrées et reliées, et ne traversent pas le toit.

**Soldats meumeu (fait le 4 octobre)**
- Enlever les casques des soldats meumeu.
- Leur donner une posture qui tient l'arme, sans déformer les bras.
- L'arme est droite, dans l'axe logique de la Meumeu.

**Centres-villes meumeu (fait le 4 octobre)**
- Les centres-villes meumeu doivent être des pyramides aztèques.

**Décisions du 4 octobre (suite)**
- Seul le bras droit de la Meumeu tient le fusil ; le gauche reste au repos.
- Sommet de la pyramide : un seul bloc de la même pierre, sans couleur ni entrée.
- **Ne jamais toucher aux tenues « Soldat camouflé » et « Élite à cape »** (ni casque, ni tête, ni bras).
- Engins et grande barge : plus d'armes préfabriquées dans leur coût (elles viennent avec l'engin) ; soute pour les ressources (surtout munitions), et des civils peuvent traverser pour bâtir de l'autre côté.
- Plafond de population bèè : 2 500 vivants (plus de naissances, de renforts ni de fondations au-delà).
- Tout se renouvelle sauf les arbres : filons (plein en 60 jours) et rochers (30 jours).

## Fait (commits locaux)

**IA bèè**
- Les colonnes de terre ne visent que la même terre.
  - Sur la carte mer, 230 à 510 soldats restaient « en rassemblement » jusqu'à 22 jours.
- Les Bèè égarés sur notre rive rejoignent une tête de pont, ou en fondent une là où ils sont.
- La garnison ne reprend plus les hommes des têtes de pont ni ceux du port, et seulement sur la même terre.
- Rassemblement au port (`amphiBeeStage`).
  - Avant, les vagues partaient vides : 0 débarqué sur 180 appelés, venus de villes à 200-390 cases.
  - Après : 256 débarqués en 3 vagues en 9 jours.
- La traversée n'attend plus une barge sans pilote ni un retardataire.
  - Mesuré : jusqu'à 110 h d'attente.
- Les têtes de pont attaquent en masse, avec la doctrine `raidK`.

**Allié**
- Son dépôt côtier est bâti : la ville côtière et les barges arrivent dès J32-37 ; il débarque.
- Ligne de défense quand il est en infériorité, au lieu de charges suicides.
- Réserve près de la ville côtière, armée plus grande en `allyAll`.
- Récolte : plus de souches.
  - Mesuré : 144 villageois renvoyés sur des souches.
- Mines de plomb, de cuivre et de salpêtre, et poudrerie : enfin des cartouches.
- Fusils et cartouches réclamés à chaque caserne.
- Abris locaux à portée d'arme d'un Bèè vu.
  - Mesuré : 28 villageois tués en 6 jours, contre environ 187 sans abri.

**Abris**
- Bouton par ville, alerte tenue, fin d'alerte qui rend tâche et charge.
- Centre-ville illimité ; bonus de tireurs plafonné à 6.
- Abri relâché quand la ville n'est plus attaquée : un ennemi vu à 40 cases.
- Réfugiés vers le centre sûr le plus proche, même maître d'abord.
- Boutons globaux limités aux villes menacées.

**Moulin**
- Restes du jeu d'ailes d'origine retirés de la tour : 539 triangles.
- Moyeu devant la calotte, arbre de couche.

## Reste à faire

1. ~~Soldats meumeu~~ : faits (casque retiré, arme tenue droite, bras rigides détachés du modèle — scene3d.js meumeuRig/holdGun).
2. ~~Centres-villes en pyramides~~ : faits (bldg3d.js pyramide ; le centre bèè garde son hôtel de ville).
3. ~~Moulin~~ : fait (moyeu et racines d'ailes d'origine retirés au dos du toit ; ce qui reste de dos est la galerie d'origine).
4. **Batailles** (série 2 reprise à J40 avec --reprendre ; les séries 1 et 2 tournent sans le plafond bèè : en relancer une série 3 avec)
   - Les séries :
     - série 1 : `test/_saves/bataille_<graine>`, sans les têtes en masse, l'économie de guerre alliée ni les abris ;
     - série 2 : `test/_saves/bataille2_<graine>`, avec tout le code ;
     - « avant » : `test/_saves/avant_bataille_<graine>`, le code du début.
   - Graines 301, 305 et 311.
   - Dépouiller avec `node test/_analyse_bataille.mjs <dossiers…>`.
   - Captures avec `test/_outils_captures/shots_mer.cjs`. Le lancer avec electron, pas en mode node : `OKM_ROOT=<jeu> SAVES=bataille2_301/j40.json,…`.
   - Faire le rapport au joueur : comparaison avant/après, chiffres, captures.
5. **Chemins** (mesuré : budget 14 → 40 : marcheurs 4,4 → 5,9 cases/h, calcul +4 % ; réglable par world.pathBudgetMax) : 14 recherches de chemin par minute de jeu pour tout le monde. À 6 000 unités, une marche de 200 cases prend des jours (2,5 cases/h).
   - Proposer et mesurer un budget adaptatif.
   - Le vrai jeu fait 80 pas par heure de jeu, le banc 60.
6. **Bandes bèè « debarquement »** : elles abandonnent (« plus rien à prendre ») faute d'arriver avant leur délai.
   - Le délai `lim` vaut 30 + distance/4 heures, et la marche est lente.

## Les tests (dans `test/`, gitignoré — `git add -f`)

**Recette**
- `abris_ville.mjs` : abris par ville, fin d'alerte, réfugiés, bouton global.
- `naval.mjs`, `amphi.mjs`, `allie.mjs`, `ia_tombee.mjs`.

**Vérifications ciblées**
- `_verif_abris.mjs`
- `_verif_port.mjs`
- `_verif_rive.mjs`
- `_verif_depot_allie.mjs`

**Banc de bataille**
- `_bataille.mjs <graine> <jours> <dossier>` relève :
  - les morts par camp, lieu et cause ;
  - les bandes ;
  - les bâtiments détruits ;
  - un bilan tous les 10 jours.
- `_analyse_bataille.mjs`.

**Diagnostics**
- `_dbg_bandes.mjs`
- `_dbg_rive.mjs`
- `_dbg_embarque.mjs`
- `_dbg_traversee.mjs`
- `_dbg_bande_vie.mjs`
- `_dbg_barges_allie.mjs`
- `_dbg_tete.mjs`

**Outils de capture** (`test/_outils_captures/`)
- `harness.cjs` : fenêtre cachée, env `OKM_ROOT`, `OKM_PAGE`, `ZOOMF`.
- `shots_mer.cjs`
- `moulin*.cjs`, `rayon*.cjs` (lancer de rayon depuis l'écran), `abris_ui.cjs`, `crop.cjs`.

**Lancer un test** :

```
ELECTRON_RUN_AS_NODE=1 "…/oberkommando-v12.0/.runtime/electron.exe" test/<t>.mjs
```
