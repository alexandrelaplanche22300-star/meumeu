# La guerre chimique — conception (V12.9, branche `feat/guerre-chimique`)

> Tout est **mécanique de jeu fictive** : les agents (ortie, foin, miel, X-G, X-V) sont inventés, les nombres sont des réglages de jeu
> (unités de jeu, pas de chimie réelle). Rien ici ne décrit une fabrication, un précurseur ou une dose réelle.

Demande du joueur (9/10) : des agents de plusieurs types, plus ou moins mortels, volatils ou denses (interdiction de zones), des brûlures
chimiques jusqu'aux organes, du **brutal** (cloques de sang, infection, crache du sang, mort lente sans remède), passant par la **recherche**,
des **bouteilles** que les soldats fabriquent, remplissent (barre), portent, posent, **combinent** à la manière de 1915 — et des
**défauts** : le vent qui ramène le nuage, le terrain qu'on s'interdit soi-même, les fuites, le coût, la parade (masque, lunettes, combinaison).

Point de départ : la conversation Grok « Suite : CONTEXTE PROJET OBERKOMMANDO V12.7 » (foin, miel, X-G, X-V ; dégâts par organe ;
masque, lunettes, combinaison, antidote ; vrai nuage à partir de 18 mm ; fusion des nuages sur la grille). Le code de main n'avait rien
de chimique (seuls le phosphore, le gel incendiaire et les thermobariques existent) : tout est neuf, branché sur l'existant.

## 1. Les agents (`js/gaz.js`, table `AGENTS`)

| Agent | Famille | Volatilité / persistance | Densité (rampe au sol) | Létalité | Organes | Symptômes | Parade | Défauts |
|---|---|---|---|---|---|---|---|---|
| **Ortie** (extra) | irritant | très volatil, ½-vie air 0,4 h, pas de dépôt | 0,3 | presque nulle | yeux, voies respiratoires | larmes, toux, vise mal | lunettes, masque | ne tue pas ; force seulement le masque |
| **Foin** | suffocant | volatil, ½-vie 1,5 h, pas de dépôt | 0,7 (coule dans trous et tranchées) | moyenne | poumons ++, yeux | toux, **crache du sang**, œdème, noyade lente | masque | nuage visible (jaune-vert), suit le vent, retour sur nos lignes |
| **Miel** | vésicant | persistant : ½-vie air 3 h, **au sol 30 h** | 0,9 | lente mais lourde | peau ++, yeux, poumons | **latence** de 2 à 6 h, puis rougeurs, **cloques de sang**, **infection**, brûlures qui **traversent jusqu'aux organes** | combinaison + masque + lunettes | interdit le terrain des jours — à nous aussi ; colle à la fourrure (contamine les brancardiers) |
| **X-G** | neurotoxique volatil | ½-vie 0,8 h | 0,5 | très haute, rapide | nerfs (par les poumons et les yeux) | pupilles, bave, **spasmes**, **convulsions**, arrêt respiratoire | masque + **antidote** dans les minutes | très cher, long à chercher ; un stock qui se dégrade ; une fuite au labo tue les chimistes |
| **X-V** | neurotoxique huileux | **très persistant** : au sol 60 h | 1,0 | extrême | nerfs (**à travers la peau** aussi), peau | comme X-G, plus lent par la peau | combinaison + masque + antidote | le plus cher, le plus long ; le terrain devient inhabitable |
| **Cendre** (extra) | sanguin | ultra volatil (½-vie 0,25 h), monte et se dilue | 0,2 | tout ou rien | sang / nerfs (asphyxie cellulaire) | chute brutale, mort rapide à forte concentration | masque (filtre vite saturé) | il faut une concentration énorme ; le vent le disperse aussitôt |

### La fiche de jeu (`js/gaz-equip.js`, table `FICHE`) — le cœur : foin, miel, X-G, X-V

Aucun agent n'est meilleur partout : chacun a sa parade et ses défauts.

| Agent | Létalité (1-5) | Organes | Parade | Défauts | Temps |
|---|---|---|---|---|---|
| **Foin** | 3 meurtrier | poumons, yeux | masque | nuage visible (l'ennemi se masque à temps) ; le vent le ramène ; le masque l'arrête presque tout | frais et calme : idéal ; chaleur : 2× plus vite dissipé ; pluie : rabattu |
| **Miel** | 4 très meurtrier | peau, yeux, poumons | combinaison + masque + lunettes | terrain interdit des jours, à nous aussi ; colle à la fourrure (contamine les infirmiers) ; effet retardé : n'arrête pas un assaut | chaleur : remonte du sol (plus dangereux, moins durable) ; pluie : fixé au sol |
| **X-G** | 5 extrême | nerfs, yeux | masque + antidote | très cher, long à chercher ; les lots fuient au labo (2 %/h de production) ; se dissipe vite | vent fort : dilué aussitôt ; nuit calme : stagne |
| **X-V** | 5 extrême | nerfs (aussi par la peau), peau | combinaison + masque + antidote | le plus cher ; terrain inhabitable : notre avance s'arrête aussi ; peu de nuage, il faut des obus en masse | peu sensible ; la chaleur seule le fait remonter |
| Ortie (extra) | 1 gêne | yeux, poumons | lunettes, masque | ne tue presque jamais | se dissipe très vite |
| Cendre (extra) | 4 | nerfs, poumons | masque | concentration énorme nécessaire ; sature les filtres (×5) | inutilisable par vent fort ou chaleur |

Coûts de production (laboratoire de chimie, par lot) : foin 3 salpêtre + 2 charbon, 4 h → 2 caisses ; miel 4 + 3 + 1 cuivre, 8 h → 1 ;
X-G 6 salpêtre + 3 cuivre + 2 pièces, 14 h → 1 ; X-V 8 + 4 cuivre + 3 pièces + 2 charbon, 20 h → 1. Un obus à gaz coûte ses caisses d'agent
(×1,4 pour X-G, ×1,6 pour X-V).

Champs d'un agent : `vol` (½-vie dans l'air, h), `sol` (½-vie au sol, h, 0 = pas de dépôt), `dep` (part déposée), `dens` (0-1), `pot`
(puissance d'une caisse), `voies` (`inh` respiré, `oeil`, `cut` par la peau → poids par organe), `lat` (latence de la peau, h), `col`
(couleur du nuage), `cout` (recette au labo).

## 2. La dose : concentration × temps, organe par organe (`js/gaz-sante.js`)

À chaque pas de gaz, pour chaque peluche dans un nuage : concentration `C` (unités de jeu, `gasAt`) → trois voies :
`inh` (respiré : masque), `oeil` (yeux : lunettes, le masque à moitié), `cut` (peau : combinaison). La protection `P` (0-1) vient de
`unitProtection(u)`. Dose ajoutée à chaque organe : `C × poids(voie→organe) × (1 − P_voie) × posture × dt`.
- couché : ×1,3 pour un agent dense (on respire au ras du sol) ; dans une tranchée/un cratère, la concentration est déjà plus forte (nuages).
- effort : en courant on respire ×1,4.
- la **pellicule** (`h.cx.film`) : miel et X-V collent à la fourrure ; la peau continue d'en absorber hors du nuage tant qu'on n'est pas
  décontaminé (et le porteur d'un blessé contaminé en prend aussi).
- la **latence** du miel : la dose de peau entre dans un réservoir `lat` et ne « sort » qu'en quelques heures — on ne sait pas encore qu'on est perdu.

Les doses ne redescendent pas (sauf nerfs sous antidote) : ce qui compte, c'est le cumul C × t. Les seuils par organe :

| Organe | Seuil 1 | Seuil 2 | Seuil 3 | Seuil 4 — **incurable** |
|---|---|---|---|---|
| poumons | 5 : toux (vise mal) | 15 : **crache du sang** (saignement interne lent), essoufflé | 30 : **œdème** → hors de combat | 55 : poumons détruits — **mort lente** en 6 à 40 h, quoi qu'on fasse |
| yeux | 4 : larmes | 12 : yeux brûlés (aveugle quelques jours) | 30 : **aveugle** à vie | — |
| peau | 8 : rougeurs, douleur | 20 : **cloques de sang** → infection si non soignées | 45 : brûlures chimiques profondes → hors | 80 : brûlures **jusqu'aux organes** (saignements internes) — **mort lente** |
| nerfs | 3 : pupilles, bave | 8 : spasmes (sonné, marche mal) | 16 : **convulsions** → hors | 28 : arrêt respiratoire en quelques minutes **sauf antidote** ; 45 : irréversible |

**L'infection** (`h.cx.inf`, 0→1) : les cloques crevées s'infectent ; ×0,3 pansées par un infirmier, ×0,33 avec l'antiseptique ;
à 0,75 fièvre → hors ; à 1 → mort (« infection des brûlures chimiques »). L'hôpital la stoppe.

**L'état incurable** (`h.cx.doom`) : une heure de mort fixée, une agonie racontée dans le carnet de santé (« il crache du sang », « il
étouffe », « ses brûlures suintent »). Ni infirmier, ni médecin, ni hôpital ne l'arrêtent ; la morphine seule calme la douleur.
C'est la face brutale voulue par le joueur.

Branchement : `tickHealth` (health.js) appelle `chemTick` ; ses états (`hors`, `mort`, causes) passent par le même chemin que les balles,
les fiches de blessure et le triage (noir = dépassé pour l'incurable). `malus()` ajoute la toux, les larmes, les spasmes.

## 3. Le nuage (`js/gaz-nuages.js`)

- Grille clairsemée de cellules de `GAS_CELL` = 2 cases (8 m) : `s.gas.air[key][agent]`, `s.gas.sol[key][agent]` (dépôt), `key = cj*NC+ci`.
  Échelle des concentrations (unités de jeu) : 1 on le sent, 5 dangereux, 20 mortel vite. Une caisse d'agent apporte `pot × 2`.
- Pas fixe de 0,05 h (`NUAGE.STEP`), au plus 8 pas par appel (jeu accéléré : on ne court pas après le retard).
- **Vent** `s.gas.wind` {a (rad), v (cases/h)} : marche au hasard (0,35 rad/√h), force 1,5 à 14 cases/h, **×0,35 la nuit** (le gaz stagne).
  **Temps** `s.gas.meteo` (change toutes les 8 à 20 h) : sec ; chaud (½-vie air et sol ×0,5, réévaporation ×2) ; pluie (½-vie air ×0,6,
  dépôt ×2,5, réévaporation ×0,2, sol ×1,4).
- **Advection** : la part qui part sous le vent est répartie sur les voisines (x, y, diagonale) ; un agent dense ne suit qu'à
  `1 − 0,55·densité` du vent, et moins encore dans un creux. **Diffusion** : `0,9·(1 − 0,8·densité)` par heure, vers les 4 voisines.
  **Décroissance** : ½-vie `vol` × temps. **Dépôt** : `dep` par heure vers le sol (persistants) ; **réévaporation** 4 %/h du dépôt,
  qui décroît lui-même avec sa ½-vie `sol` → le miel et X-V interdisent le terrain des jours.
- **Points bas** : profondeur d'une cellule = cratères (×0,8) + tranchées (sacs) ; un agent dense (> 0,45) glisse vers la voisine plus
  creuse (0,8 × densité × écart par heure) ; à la case, `gasFeel` majore jusqu'à ×2 dans un trou (c'est ce que respire `gasExpose`).
- **Fusion** : la grille est commune ; deux nuages qui se recouvrent s'additionnent cellule par cellule.
- **Obus** (`gasShell`, appelé par `heBlast` quand `E.fill.gas`) : chargements `gaz_*` (FILLS, petite charge d'ouverture `k = 0,08`).
  **À partir de 18 mm** : vrai nuage, masse ∝ chargement (`g / 250 g` caisses × `pot × 2`), rayon `1 + 1,3·∛caisses` cases (6 au plus) ;
  un persistant arrose aussi le sol (30 %). **En dessous** : bouffée à 15 %, dont les cellules se dissipent 3× plus vite pendant 2 h.
- Les Bèè (IA) fuient un nuage (> 0,6) de 8 cases vers l'amont du vent ; nos soldats, non (le joueur commande).
- Dessin (`view.js`, `drawGas`) : chaque cellule teintée par l'agent dominant (X-G/X-V presque invisibles), flaques sombres au sol.

## 4. Les bouteilles (`js/gaz-bouteilles.js`)

- **Fabriquer** : `bouteille_gaz` à la manufacture (3 fer, 2 pièces, 1 cuivre, 3 h). **Poser** : un soldat valide à moins de 6 cases d'un
  dépôt qui en a pose une bouteille vide à ses pieds.
- **Remplir** : choisir l'agent ; la **barre de remplissage** monte de 1 caisse/h tant qu'un dépôt à 6 cases a l'agent ; 4 caisses = pleine.
- **Porter** : un soldat à portée la charge (vitesse **×0,6**) ; la bouteille le suit ; **poser** où l'on veut. Porteur tombé : elle tombe.
- **Ouvrir** : la vanne lâche 6 caisses/h au pied de la bouteille (le vent fait le reste). **Batterie** : les bouteilles posées et chargées
  à moins de 3 cases de proche en proche ; « Ouvrir la batterie » (découverte « Les batteries de bouteilles ») les ouvre toutes d'un coup,
  **+15 % de nuage par bouteille en plus** : un seul gros nuage fusionné.
- **Défauts** : le vent tourne (retour du nuage) ; petite fuite des joints (0,5 %/h) ; un obus tout près (rayon des lésions) la **crève**
  (tout l'agent sur place, porteur compris) ; un peu plus loin elle se **cabosse** et fuit à 12 %/h ; pleine, elle pèse — repérable et lente.

## 5. La recherche, la protection, les soins, l'interface

Arbre (INNOV, ère 3 ; `unlock` : `fill:` obus au bureau d'études, `prod:` une production, `gaz:`/`soin:` une capacité) :

| Découverte (`id`) | Besoin | Ouvre | Heures |
|---|---|---|---|
| Les toxiques de combat (`toxiques`) | phosphore | foin (+ ortie) : caisses, obus | 50 |
| Le masque et les lunettes (`masques`) | toxiques | masque_gaz, lunettes_gaz | 30 |
| Les bouteilles à gaz (`bouteilles_gaz`) | toxiques | bouteille_gaz | 30 |
| Le miel (`miel`) | toxiques | agent_miel, obus | 60 |
| La combinaison étanche (`combinaisons`) | miel + masques | combinaison | 40 |
| La décontamination (`decontamination`, soins) | masques + antiseptique | lavage de la pellicule par les infirmiers | 25 |
| X-G (`xg`) | miel | agent_xg, obus | 90 |
| L'antidote (`antidotes`, soins) | X-G | antidote (hôpital : 3 par lot) | 40 |
| X-V (`xv`) | X-G + combinaisons | agent_xv, obus | 120 |
| Les batteries de bouteilles (`batteries_gaz`) | bouteilles | ouverture synchronisée | 35 |
| La cendre (`cendre`, extra) | X-G | agent_cendre | 60 |

Les productions verrouillées n'apparaissent pas dans les usines (`productsOf` filtre `prod:`).

Protection (`js/gaz-equip.js`, prise au dépôt à 6 cases, panneau du soldat) : **masque** (`inh` 0,92, `oeil` 0,5 ; on l'**enfile au premier
souffle** en 0,25 h — on a déjà respiré une bouffée ; retiré après 1 h sans gaz ; **filtre** qui s'use avec la concentration, ×5 pour la cendre ;
visée ×1,3), **lunettes** (`oeil` 0,9), **combinaison** (`cut` 0,85 ; vitesse ×0,8), **antidote** (3 par homme, **auto-injection** quand les nerfs
passent le seuil 2). **Infirmiers** : l'antidote d'abord, puis la décontamination (sans combinaison, l'infirmier prend un dixième de la
pellicule), puis le pansement des cloques. **Hôpital** : arrête l'infection, soigne poumons, peau et yeux tant que ce n'est pas perdu ;
**jamais** l'incurable. **Laboratoire** : un lot en cours peut fuir (foin 0,5 %/h, X-G 2 %/h, X-V 1,5 %/h) — un nuage dans les ateliers.

Interface (`js/gaz-ui.js`, dans le panneau du soldat choisi) : le vent et le temps, le gaz sur sa case, sa protection (prendre/rendre),
« Poser une bouteille vide », pour chaque bouteille à portée : barre de remplissage, choix de l'agent, Remplir, Charger, Ouvrir,
Ouvrir la batterie (n), Fermer.

## 6. Tests

- `node test/gaz.mjs` — la santé : dose → stades, masque, incurable (triage noir, hôpital impuissant, mort lente), miel (latence, cloques,
  infection, pansement, combinaison), X-G (arrêt sans antidote, survie avec), pellicule de X-V et décontamination, intégration `W.update`.
- `node test/gaz_nuages.mjs` — les nuages (obus ≥ 18 mm / bouffée, vent, fusion, dissipation, persistance, creux), les bouteilles (poser,
  remplir, porter, batterie, crever), l'arbre de recherche, le masque et la combinaison, une partie qui tourne avec du gaz.
- Sans Node : `ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/gaz.mjs` (même chose pour `gaz_nuages.mjs`).
- Le banc général `test/node.mjs` s'arrête déjà au banc 8 sur main (`free(...) is not iterable`) — antérieur à cette branche.

## 7. Reste à faire

- Les balles ne percent pas encore les bouteilles (seuls les obus et leurs éclats les crèvent).
- Le masque ne réduit pas encore la vue (−20 % prévu) ; seule la visée est touchée.
- Les Bèè n'évitent pas un terrain contaminé dans leurs chemins (ils fuient seulement un nuage dense).
- Pas de rendu 3D (scene3d) des nuages ni des bouteilles ; l'équilibrage des concentrations est à jouer.
- Les tables `rts_shell_cards` / `rts_shell_injury` et les zips V12.8.4 à V12.8.6 du projet Grok ne sont pas dans le dépôt : cette branche part de main.
