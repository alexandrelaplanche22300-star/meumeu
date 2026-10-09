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

## 3. Le nuage (`js/gaz-nuages.js` — branche `feat/chimie-nuages`)

- Grille clairsemée de cellules de `GAS_CELL` = 2 cases (8 m) : `s.gas.air[key][agent]`, `s.gas.sol[key][agent]` (dépôt), `key = cj*NC+ci`.
- **Vent** `s.gas.wind` (direction, force en cases/h) qui tourne lentement ; la nuit, vent faible (le gaz stagne) ; **temps** : sec,
  chaud (évaporation ×2, persistance ÷2), pluie (lessive l'air, fixe le dépôt).
- **Advection** par le vent, **diffusion** (selon volatilité), **décroissance** (½-vie), **dépôt** puis **réévaporation** (persistants).
- **Points bas** : un agent dense glisse vers les cratères et les tranchées (sacs) voisins et s'y accumule (×1 à ×2).
- **Fusion** : deux nuages qui se recouvrent s'additionnent dans les mêmes cellules (grille commune) — rien à fusionner à la main.
- **Obus** : les chargements `gaz_*` (FILLS) ; à partir de **18 mm**, un vrai nuage (masse ∝ chargement, rayon ∝ ∛masse) ;
  en dessous, une bouffée locale qui se dissipe trois fois plus vite.
- Les Bèè (IA) fuient un nuage vers l'amont du vent ; nos soldats, non (le joueur commande).

## 4. Les bouteilles (`js/gaz-bouteilles.js` — branche `feat/chimie-cylindres`)

- **Fabriquer** : `bouteille_gaz` (manufacture : fer, pièces, cuivre) ; un soldat près d'un dépôt en **pose** une au sol.
- **Remplir** : près d'un dépôt qui a l'agent (`agent_*`), la **barre de remplissage** monte (1 caisse/h, 4 caisses par bouteille).
- **Porter** : un soldat la charge (vitesse ×0,6) ; **poser** où l'on veut.
- **Combiner** : les bouteilles à moins de 3 cases forment une **batterie** ; « Ouvrir la batterie » lâche tout d'un coup — un mur de
  gaz (×1,15 par bouteille en plus) ; il faut la recherche « batteries » pour l'ouverture synchronisée.
- **Défauts** : vent tournant (retour du nuage), une bouteille touchée par un obus ou des éclats **crève** et vide tout sur place ;
  petite fuite au fil du temps ; pleine, elle pèse — repérable et lente.

## 5. La recherche, la protection, les soins, l'interface (branche `feat/chimie-recherche`)

Arbre (INNOV, domaine `chimie`, ère 3, programmes de savants : chimiste aux agents, physicien aux nuages, ingénieur aux bouteilles) :

| Découverte | Besoin | Ouvre | Coût indicatif |
|---|---|---|---|
| Les toxiques de combat | phosphore | ortie, foin (agents + obus) | 50 h |
| Le masque et les lunettes | toxiques | masque_gaz, lunettes_gaz | 30 h |
| Les bouteilles à gaz | toxiques | bouteille_gaz | 30 h |
| Le miel | toxiques | agent_miel, obus | 60 h |
| La combinaison étanche | miel + masque | combinaison | 40 h |
| La décontamination | masque + antiseptique | lavage de la pellicule, cloques pansées | 25 h |
| X-G | miel | agent_xg, obus | 90 h |
| L'antidote | X-G | antidote (auto-injection, infirmiers) | 40 h |
| X-V | X-G + combinaison | agent_xv, obus | 120 h |
| Les batteries de bouteilles | bouteilles | ouverture synchronisée, grosses vannes | 35 h |
| La cendre (extra) | X-G | agent_cendre | 60 h |

Protection : masque (`inh` 0,92, `oeil` 0,5 ; filtre qui s'use ; visée ×1,3, vue −20 %), lunettes (`oeil` 0,9), combinaison
(`cut` 0,85 ; vitesse ×0,8, fatigue), antidote (3 par homme). Les infirmiers : décontamination, pansement des cloques, antidote,
morphine ; l'hôpital : arrête l'infection et les yeux, **jamais** l'état incurable. Le labo : chaque lot d'agent peut fuir (accident).

## 6. Tests

`node test/gaz.mjs` (bancs dédiés : dose → symptômes → incurable, protection, antidote, infection). Le banc général `test/node.mjs`
s'arrête déjà au banc 8 sur main (`free(...) is not iterable`) — antérieur à cette branche.
