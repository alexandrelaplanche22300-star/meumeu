# Les tests d'Oberkommando der Meumeu

Ce dossier contient des tests de **mesure** : la plupart affichent des chiffres et des lignes `PASS` / `FAIL`. Les critères sont écrits **en tête de chaque fichier, avant l'exécution**. Quand un critère a été corrigé après coup, les deux versions (initiale et corrigée) sont gardées avec la justification (voir `mobilisation.mjs` et `dev.mjs`).

## Les lancer (pas de Node installé)
On utilise le runtime Electron du projet comme Node :

```bash
cd oberkommando-v10/jeu
ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/<fichier>.mjs [arguments]
```

Les durées sont en **heures de jeu**, une case fait 4 m, un garde marche à environ 7 cases/h. Les tests longs (campagnes de 30 jours) demandent 2 à 3 minutes par graine : les lancer en arrière-plan.

## À lancer avant toute livraison
| Fichier | Ce qu'il vérifie | Attendu |
|---|---|---|
| `v10.mjs` | Recette V10 (39 tests : horloge, écoute, opérations, offensives, sabotage) | 39/39 |
| `nir.mjs` | Module infrarouge : faisceau, impulsion, filtre, cône, signature | 7/7 |
| `dev.mjs` | Partie de test « Dev » : mines, usines, stocks, brouillard en place (critère corrigé, l'ancien « levé » est gardé en INFO), 3 jours sans erreur | tout PASS (les lignes 5 et 6a sont des INFO gardées volontairement) |
| `depart_etabli.mjs` | « Départ établi » : cinq mines sur leur filon, deux moulins servis, arsenal + manufacture + usine chimique à l'arrêt, minerais produits, « Dev » sans doublon | tout PASS (D3 et D4 initiaux gardés en INFO, corrigés en D3bis / D4bis) |
| `explosions.mjs` | Explosions : maisons détruites, feu, cratère, portée des éclats d'une grosse charge (500 g, bombe de 3 kg), grenade | tout PASS (X3d INFO, remplacé par X3e) |
| `armee.mjs <graine> <jours>` | Armée bèè conventionnelle : une seule formation offensive à la fois, jamais de diversion, au moins 30 soldats au départ | A1 à A5 PASS |
| `economie.mjs` | Économie des Meumeu : consommation −⅓, moulins +50 %, 12 soldats + 40 villageois sur 20 jours, Bèè inchangés | E1 à E4 PASS |
| `batterie.mjs` | Batterie infrarouge : produit d'atelier cher, recharge au dépôt, pas de recharge gratuite, pas au-dessus de la moitié | B1 à B7 PASS |
| `couronne.mjs` | Couronne sonore : précision selon la source, équipes qui marchent, temps réel, jamais de position | C1 à C7 PASS |
| `decouverte.mjs <graine> <jours>` | Quand les Bèè trouvent puis attaquent la capitale d'un joueur passif (sans aucun tir) | mesure (jour de découverte, de l'assaut, de la chute) |
| `recrutement.mjs` | Croissance automatique des Meumeu : ne dépend que de la nourriture, s'arrête sous la réserve, interrupteur respecté, pas de famine, Bèè inchangés | R1 à R7 PASS |
| `expansion.mjs <graine> <jours>` | Expansion des Bèè, joueur passif : villes debout, fondations, plus long silence, freins (`colonyWhy`), coût de calcul | critères E1 à E4 en tête du fichier |
| `bruits_bee.mjs` | Les Bèè ne reçoivent qu'un relèvement, jamais une position ; les contacts fusionnent sans se dégrader | tout PASS |
| `mobilisation.mjs` | Plafond de mobilisation par ville, réserve, retour des binômes, comptage unique | voir la section « Mobilisation » |
| `garnison.mjs` | Les points clés importants restent tenus quand des gardes partent (la relève) | poste n°2 ≥ 85 %, agitation ≤ 0,1 |
| `balistique_coherence.mjs` | Balistique et concepteur d'armes : le viseur ne donne aucune vitesse, saturation de la vitesse avec la longueur du canon, roues/servants/pieux, silencieux, recul, stabilité, pénétration (36 critères) | tout PASS (1 INFO) |
| `balistique_blessure.mjs` | Chaîne balle → blessure → protection : une protection arrête réellement des balles, une arme puissante est brutale | tout PASS |
| `v7-regressions.mjs` | Anciennes régressions (radiographie, bruits, viseur, étui, riposte des garnisons, rondes) | OK (mis à jour à la règle V10, l'ancienne version reste en commentaire) |
| `doublons.mjs` | Méthodes définies deux fois (la dernière écrase les autres) | ne doit pas augmenter (3 connues dans la classe `World`) |
| `node.mjs` | Les 15 bancs de `run.mjs` en Node (dont sauvegarde/rechargement, soins, chaîne complète) ; le banc appelait `load()` (renommé `restore()` en V10) et plantait avant le banc 10 : corrigé en V12.0 | exit 0 |
| `chimie.mjs` | V12.0 · découvertes de chimie de guerre : prérequis, pièces verrouillées puis ouvertes, thermite, phosphore, napalm, lance-flammes | K1 à K8 PASS |
| `sifflement.mjs` | V11.1 · le sifflement d'une balle ne joue que pour un tir ennemi qui passe près d'un soldat sélectionné, et arrive avec le coup | W1 à W6 PASS |
| `attaches.mjs` | V12.0 · une pièce par attache (bouche, optique, appui) : la physique compte ce que le dessin montre | A1 à A6 PASS |
| `projets.mjs` | V12.0 · le bureau d'études : projets, industrie qui les fabrique (avec ou sans ouvriers), plans perdus relancés, recherche | R1 à R7 PASS |
| `catalogue.mjs` | V12.0 · le catalogue des pièces généré depuis les tables du jeu : exhaustif, tout se dessine, attaches = physique, échelle commune vraie, nomenclature | C1 à C7 PASS |
| `caserne_pieces.mjs` | V12.0 · l'équipage complet sort de la caserne en escouade, servants armés avec des caisses de la pièce, tout ou rien, conservation, cap de la pièce | E1 à E7 PASS |
| `bouclier.mjs` | V12.0 · le bouclier configurable (matériau, épaisseur, taille) arrête vraiment les balles de face ; usure, prix, dessin | B1 à B7 PASS |
| `rechargement.mjs` | V12.0 · le rechargement d'une pièce partage le poids de l'obus entre les bras ; les caisses pèsent ce qu'elles contiennent | L1 à L7 PASS |

## Acoustique et renseignement
- `tir_nocturne.mjs [graines] [départ] [distance] [jours] [modes]` : un commando tire de nuit à 24 cases de quatre gardes. Modes `N` Mle 1 nu, `S` silencieux, `U` subsonique silencieux, `Q` subsonique nu, `M` fuite, `R` deux tirs, `V` aucun tir, `F` son coupé. Mesure l'alerte, l'orientation, la recherche, la couverture du balayage, qui a localisé le commando (le son ou la vue).
- `bruits_nocturnes.mjs` : portées, précision et hiérarchie des sons (train, usine, mine, chantier, tir, explosion, pas).
- `patrouilles_nocturnes.mjs` : rondes de nuit d'une ville développée.

## Ravitaillement et économie
`ravitaillement.mjs`, `ravitaillement_strict.mjs`, `ravitaillement_camp.mjs` (le camp avancé est réellement approvisionné par le fret puis sert l'escouade), `nourriture.mjs` (moulin, fertilité, cratères, rations).

## Guerre
- `campagne.mjs <parties> <jours> <graine>` : parties de 30 jours avec un joueur automatique (`bot.mjs`).
- `guerre_diag.mjs <graine> <jours>` : pourquoi une offensive ne part pas (gardes disponibles, cibles connues, âge du renseignement).
- `ia.mjs`, `ia_tombee.mjs` : réaction de l'état-major à un bombardement et à la chute d'une ville (multi-graines pour `ia_tombee`).

### Garde-fou de cohérence (seuils fixés avant de lancer, campagnes de 30 jours, graines 101 à 109)
Référence V10.3 d'origine : 217 Bèè vivants, 3,8 villes, 1,8 offensive par partie, capitale tombée 1 fois sur 9.

| Critère | Seuil |
|---|---|
| Bèè vivants en moyenne | ≥ 195 |
| Villes bèè en moyenne | ≥ 3,4 |
| Offensives par partie | ≥ 1,5 |
| Capitale meumeu tombée | ≤ 2 parties sur 9 |
| Erreurs d'exécution | 0 |

## Mobilisation : critères initiaux et corrigés
Le fichier `mobilisation.mjs` affiche les deux séries. Les corrections de mesure, avec leur justification :
- La latence d'une **recherche** n'a pas de sens face à un danger en vue (la réponse est une bande de défense) : on mesure la première réponse.
- Les soldats **engagés localement** (`assault`) comptent dans la garnison ; les bandes se comptent par **ville d'origine** des soldats.
- Les gardes morts ne comptent plus comme « encore dehors ».
- Nouveaux : cinq alertes simultanées, et comptage unique (un recomptage indépendant doit égaler les compteurs du moteur).

## Tests plus anciens
`run.mjs` (les bancs) se lance en Node par `node.mjs`, ou dans un navigateur. Les autres (`beee_bilan`, `beee_reel`, `chasse_nuit`, `optique`, `saccades`, `perf`, `operation`, `servants`, `ordres`, `combat`, `charges`, `bureau`, `sim`, `campagne`) documentent leur but dans leur en-tête.
