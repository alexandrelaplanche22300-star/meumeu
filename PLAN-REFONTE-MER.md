# Refonte « La mer, les plages, le ciel » — plan (2026-10-02)

Demande du joueur : carte bien plus grande coupée par la mer, longues plages fortifiables, retrait des tranchées,
barges de débarquement, planeurs et avion de transport (pont aérien), munitions réalistes.
Règles qui ne changent pas : pas de régression, mesure avant/après avec critères écrits d'abord, un chantier à la fois,
commit local à chaque étape, jeu relancé et testé par le joueur entre deux phases.

**Un seul exe, deux modes de jeu** (décision du joueur) : au lancement d'une partie, on choisit la carte « classique » ou la carte
« mer » (deux rives séparées par la mer, longues plages). Même code, mêmes nouveautés : toute amélioration sert aux deux modes.
Le générateur (`gen.js`) reçoit le mode ; le menu de nouvelle partie le propose ; la sauvegarde le retient.

Déjà fait : sol lissé (couleur moyenne de chaque terrain) à tous les zooms — 0bb4972.

---

## Phase 1 — Munitions réalistes (petite, indépendante, prépare le pont aérien)
Constat : `ballistics.js:480` → `carry = 18 % du poids du tireur en cartouches`. Un fusilier emporte des centaines
de coups : il ne recharge presque jamais.
- Mesurer AVANT : coups tirés par soldat et par combat, part des soldats « à sec » après 1, 2, 3 combats (test/combat, assaut).
- Dotation réaliste par arme (ex. fusil ≈ 60–90 coups, pistolet-mitrailleur ≈ 6 chargeurs, mitrailleuse : bandes
  portées par les servants), et non plus un pourcentage du poids.
- Critères : après un combat moyen, ≥ 30 % des fusiliers sous la moitié de leur dotation ; après trois, une escouade
  sans ravitaillement se tait. Le porteur de munitions et les dépôts deviennent vitaux. L'IA bèè suit les mêmes règles.

## Phase 2 — Retrait des tranchées
- `data.js` (ligne `tranchee`, onglet Défendre), `ui.js`, `world.js`, `war.js` (les Bèè en creusent) : tout retirer.
- Les anciennes sauvegardes : les tranchées existantes sont ignorées au chargement (pas de plantage).
- Test : aucune occurrence active, partie de 30 jours sans erreur, l'IA bèè ne bloque pas sur une tâche disparue.

## Phase 3 — La carte : deux rives, la mer, de longues plages
- `gen.js` (115 lignes) : une côte par rive, un détroit de mer profonde, plages de sable larges (plusieurs cases),
  falaises par endroits (comme Omaha / Longues-sur-Mer). Les terrains `deep` / `shallow` / `sand` existent déjà.
- Taille (décision du joueur) : 2,5 fois la carte actuelle, dont 0,5 de mer. Lecture retenue : deux territoires de 600 × 600 (un par camp)
  séparés par un bras de mer de 300 cases → carte de 1 500 × 600 (rectangulaire : le code suppose aujourd'hui une carte carrée N × N, à adapter).
  Coûts à surveiller : image du sol (le sol lissé n'a besoin que
  d'un pixel par case, donc plus de limite de la carte graphique), brouillard, chemins, `railNets` (tableaux N×N),
  mémoire, l'IA bèè qui cherche des sites.
- Les Bèè sur leur rive, les Meumeu sur la leur ; pas de rail sur la mer.
- Mesures : parts de terrain sur 10 graines, longueur des plages, temps par image en vue large, `beee_bilan` 30 jours.
  Critère : aucune image > 50 ms, mémoire < 1,5 Go, Bèè ≥ autant de soldats qu'avant à surface égale.

## Phase 4 — Fortifications de plage
- **Sacs de sable** : une ligne comme le mur, basse, couvre le tireur couché ou à genou.
- **Bunkers** (modèles faits par le code, d'après les photos) :
  - Tobrouk (Ringstand) : une mitrailleuse sur affût pivotant, un servant debout, la soute à munitions ;
  - blockhaus à mitrailleuse : embrasure frontale, deux ou trois tireurs, mitrailleuse sur le toit ;
  - casemate à canon : un canon (de l'artillerie existante) derrière une embrasure.
  Béton = blindage épais dans le système existant (`vehImpact` / pénétration) : seuls les gros calibres l'entament.
- **Mines** : fabriquées à la fonderie d'armes avec des explosifs, posées par des villageois ; elles explosent sous
  un soldat ou un engin. Elles sont invisibles pour l'ennemi tant qu'elles n'ont pas été repérées.
- Bande de débarquement : rien de construit sur le sable mouillé au bord de l'eau, sinon on ne pourrait pas débarquer.
  Les mines restent permises sur la plage.

## Phase 5 — Barges de débarquement
- Le modèle du joueur (`military landing craft 3d model.zip`) passe par `outils/convertir.cjs`, découpé en pièces
  (coque, rampe sur pivot), sans déformation.
- Une barge se bâtit sur notre plage comme un bâtiment, puis devient un engin. On y charge des soldats, des Meumeu
  ordinaires, un véhicule au plus et des caisses de munitions.
- Navigation : une couche de chemins sur l'eau (cases `deep` / `shallow`), comme les engins sur terre (`vehicules.js`).
- Blindage : coque et rampe arrêtent la plupart des calibres bèè ; un pilote est exposé. Si la barge est coulée ou le
  pilote tué, elle est perdue.
- Sur la plage ennemie : elle s'échoue, la rampe s'abaisse, les troupes sortent par l'avant, puis le véhicule.
- Retour : elle se désengage, repart chercher des troupes et refait l'aller-retour.

## Phase 6 — Aviation : hangar, piste, avion de transport, planeurs (Meumeu seulement)
- **Bâtiments** : un hangar relié à une piste. On construit les planeurs et l'avion dans le hangar.
- **Modèles du joueur** : `gotha+go (transport aircraft)` (avion), `dfs-230v-6 glider` (petit planeur, ~9 soldats
  et le pilote), `planeurmammout` (Me 321 Gigant : une compagnie ou un véhicule). Ils passent tous par `convertir.cjs`
  et sont contrôlés en image avant livraison.
- **Vol réaliste, commandé comme une unité** : vitesse, altitude, virage selon l'inclinaison, vitesse de décrochage.
  L'avion décolle de la piste en remorquant le planeur et le largue avant la côte quand c'est possible. Le planeur
  plane ensuite selon sa finesse : la distance de largage décide s'il atteint la zone voulue.
- **Atterrissage** : dans un champ dégagé, le groupe sort entier et prêt au combat (contrairement aux parachutistes).
  Un planeur qui percute un arbre à grande vitesse abîme l'équipage, et dans le pire des cas son pilote meurt.
- **Silence** : le planeur ne fait aucun bruit, donc les Bèè ne l'entendent pas (leur renseignement passe par le
  son). De nuit, un atterrissage peut passer totalement inaperçu.
- **Pont aérien** : l'avion de transport fonctionne comme un dépôt volant, avec un inventaire et des commandes,
  comme les trains et les porteurs dans `eco.js`. Il emporte des troupes, un véhicule, et surtout des munitions.

## Ordre et contrôle
1 → 2 → 3 → 4 → 5 → 6. On ne passe à la phase suivante qu'après une partie jouée par le joueur. Chaque phase
reçoit son test dans `test/` et passe la non-régression `regress.ps1`. Les phases 5 et 6 sont les plus lourdes,
avec un nouveau mode de déplacement chacune ; je les découperai en sous-étapes jouables.

---
## État (2026-10-02)
- Phases 1 (munitions) et 2 (tranchées) : faites, commitées.
- Phase 3 (carte) : **faite en première version** — bouton « Carte mer » du menu, 950 × 950 (carte carrée : 2,5 fois la surface, dont ~20 % de mer
  en diagonale, donc une bande verticale au centre de l'écran), plages de sable de 13 à 20 cases de large sur ~1 300 cases de long, hauts-fonds.
  Capitale meumeu sur la rive ouest, villes bèè sur la rive est. Sauvegarde : le mode de carte est mémorisé (`s.map`).
  Restent à faire : falaises, bande de plage « sable mouillé » où l'on ne bâtit pas, rendu des vagues, filons plus proches des côtes.
- **Les Bèè ne peuvent plus attaquer à pied** (pas de vagues dans cette carte) tant que les barges n'existent pas : ils s'étendent et se fortifient.
- Perf : un pas de simulation coûte ~1,35 ms (contre 0,73 en 600 × 600) ; la recherche de ressources autour d'un camp ne parcourt plus toute la carte.
- Prochaine étape : phase 4 (sacs de sable, bunkers, mines), puis 5 (barges), puis 6 (aviation).

## Correction (2026-10-02, soir) — la carte mer
- Retour du joueur : mer trop petite, carte trop petite, « un rectangle », mer affichée brune, rochers sur la plage, « retire le biome rocher ».
- Maintenant : rectangle jouable de **1 500 × 600** (600 de terre, 300 de mer, 600 de terre) dans une grille carrée de 1 500 (hors rectangle : mer profonde).
  `world.bounds` borne la caméra, le brouillard et la minicarte. Plages de sable de 17 à 21 cases sur toutes les côtes, hauts-fonds, mer bleue
  (la mer et le sable gardent leur teinte propre au lieu de la couleur moyenne de la texture).
- **Plus de biome rocher ni de neige, sur les deux cartes** : les anciennes montagnes sont de l'herbe. Plus de roche ni de filon à moins de 34 cases de l'eau
  (les tas de pierre ordinaires restent : on en a besoin pour bâtir).
- Mesure (graine 104, 20 jours) : carte mer, 18 villes bèè et 1 403 soldats ; carte classique, 16 villes et 886 soldats ; aucune erreur.
