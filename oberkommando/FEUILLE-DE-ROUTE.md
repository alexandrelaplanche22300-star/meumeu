# Oberkommando der Meumeu — feuille de route

Le but final : une guerre totale contre une IA Bèè qui joue avec **les mêmes règles** que le joueur (usines, dépôts, rails,
fret, conception d'armes). La gestion doit être solide d'abord ; chaque étape est vérifiée par la simulation automatique
(`jeu/test/sim.mjs`, qui joue N jours et relève les chiffres) avant de passer à la suivante.

## Étape 1 — Boucher les trous de l'économie (ce que la simulation a montré)
1. **Carrière** : la pierre s'épuise aujourd'hui sans remplaçant. Filons de pierre inépuisables mais lents, carrière dédiée.
2. **Faim** : chaque Meumeu mange (vivres par jour) ; les maisons et casernes commandent leurs vivres à leur dépôt comme
   une usine ; un Meumeu qui a faim travaille moins bien, puis tombe malade. Fermes, boulangerie (farine → pain), rations
   militaires pour le front.
3. **Bâtisseurs** : des Meumeu affectés à la construction, rattachés à un dépôt ; les chantiers se remplissent dans l'ordre
   de priorité choisi, plus de villageois qui partent au hasard.
4. **Tracé de voie automatique** : on clique départ et arrivée, la voie contourne relief, eau et bâtiments ; aperçu du coût
   avant de valider ; plus aucun trou silencieux dans une ligne.

## Étape 2 — Outils de logisticien
5. **Débit** : chaque dépôt montre entrées et sorties par jour ; la fenêtre Économie montre les flux sur une carte
   (flèches épaisses = gros débit, rouge = bouchon).
6. **Lignes régulières** : un train qui fait une tournée fixe (A → B → C) avec des consignes de chargement par arrêt.
7. **Wagons spécialisés** (tombereau, citerne, couvert, plat) et longueur de train ; gares de triage ; signaux et cantons
   pour que plusieurs trains partagent une voie sans se percuter.
8. **Camions** et routes pour le dernier kilomètre, entre la gare et le front.
9. **Statistiques** : courbes de production, stocks, consommation, sur 7 et 30 jours.

## Étape 3 — L'armée branchée sur l'économie
10. **Ravitaillement du front** : les unités consomment munitions, vivres, carburant, pièces ; un dépôt de front ravitaillé
    par le rail ; une unité coupée de son dépôt s'use et perd le moral.
11. **Équilibrage** : aujourd'hui les vagues Bèè submergent la capitale vers le jour 23-30 ; on règle le rythme sur ce que
    l'économie peut réellement fournir.
12. **Balistique (pistes du dossier)** : recul calculé depuis la masse de l'arme et la charge, surstabilisation des balles
    longues, dispersion réelle ; conventions de guerre (brancardiers, prisonniers, trêves pour les blessés).

## Étape 4 — L'IA Bèè, un vrai état-major
13. **Plus de triche** : l'IA Bèè n'a plus de ravitaillement gratuit ; elle a sa capitale, ses dépôts, ses mines, son fret —
    le même moteur que le joueur.
14. **Planificateur économique** : elle repère les filons, y envoie des bâtisseurs, pose dépôts et voies, ouvre des usines
    selon ses manques (le même tableau « demandes » que celui du joueur).
15. **Bureau d'études** : elle conçoit ses propres armes avec le même atelier de conception, selon ce qu'elle observe du
    joueur (blindage vu → calibre plus gros) et ce que son économie peut produire.
16. **Stratégie** : reconnaissance, choix d'objectifs (couper une voie, raser un dépôt, prendre un filon), offensives
    préparées par des stocks au front, repli quand le ravitaillement lâche.
17. **Brouillard de guerre** et renseignement : on ne voit l'ennemi que par ses éclaireurs, avions, espions.

## Étape 5 — Finition
18. Tutoriel guidé pas à pas pour la chaîne complète (filon → dépôt → rail → usine → front).
19. Sons d'usine et de train, météo et saisons (neige qui ralentit le rail, récoltes).
20. Plusieurs cartes, niveaux de difficulté de l'IA, sauvegardes multiples nommées.
