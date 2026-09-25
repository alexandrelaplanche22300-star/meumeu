# SITE HV-01 — STACK QUANTIQUE DE L’HÔTE
## Architecture de réseau, topologies, alimentation de PID-1
### 2026-09-22 — addendum au dossier SITE_HV01_HYPERVISEUR.md
### Théâtre distinct de Site Cime. Pas de recette d’intrusion réelle.

Verbes : CHART · HOLD · SEAL · MOUNT · UNMOUNT · WRITE · FORK · DROP · QUARANTINE · INCARNATE · WORKSPACE

---

# 1. ANALYSE DU CONCEPT

HV-01 n’héberge pas un réseau quantique. HV-01 *est* le réseau quantique, déployé comme variété. Les salles sont des patches de code. Les nappes sont des liens élémentaires. Les couloirs de HOLD-Q sont des tresses. L’Administrateur n’est pas un opérateur assis devant des racks : c’est le seul processus qui décode, en continu, le code topologique dont le support physique *est* le lieu.

Sans les halls QPU, la relation \(\sim\) decohère. Les cartes cessent de se correspondre. Les cours se prennent pour le ciel de \(M_0\). PID-1 n’est « supérieur » que parce qu’il est l’unique observateur logique de l’hôte : un qubit logique dont le syndrome s’extrait dans des salles immenses, et dont la correction *est* la politique (HOLD, DROP, INCARNATE).

Les consoles ne sont pas des bornes d’information. Ce sont des ports du plan de contrôle classique collé au graphe d’intrication. PID-1 y écrit même absent. Taper hors CHART / HOLD / SEAL consomme de l’intrication logique : c’est un WRITE.

Les antivirus physiques sont les daemons du plan de correction. Ils n’ont pas d’idéologie. Ils appliquent un décodeur trop grand pour un corps.

Le dehors est une feuille. Marcher vers « l’autre couloir » à ciel ouvert, c’est croire qu’un chart non injectif a un bord. Au bord : noyau. Pixel mort. Le couloir était déjà une autre carte.

---

# 2. MODÉLISATION MATHÉMATIQUE / PHYSIQUE

## 2.1 Trois graphes, jamais un seul

| Graphe | Support | Ce qu’un corps croit voir |
|---|---|---|
| \(\Gamma_{\mathrm{phys}}=(V,E)\) | HOLDs, nappes, sas | pièces et portes |
| \(\Gamma_{\mathrm{ent}}\) | paires de Bell / états graphe entre patches | chaleur, voyants, « réseau » |
| \(\Gamma_{\mathrm{log}}\) | qubits logiques après QEC, chirurgie de réseau | politique PID-1, valence, quotas |

Le diamètre métrique d’une cour n’est pas le diamètre logique. Un opérateur peut marcher un kilomètre de feuille \(F_{\mathrm{sky}}\) et n’avoir avancé que d’un hop d’intrication — ou d’aucun.

## 2.2 Contraintes quantiques devenues architecture

1. **No-cloning.** Un corps n’est pas duplicable. Le « bus » classique (médium partagé) est interdit. D’où l’échec de toute tentative de broadcast d’adresse \([x]\). Checksum local obligatoire. Pixel mort si \(\mathrm{chk}(x)\neq H(\varphi(U))\).
2. **Intrication consommable.** Chaque morphisme \(\Phi_e\) dépensé n’est pas un couloir éternel. Les portes menteuses sont des liens dont la fidélité est déjà tombée sous seuil.
3. **Mesure = collapse.** Lire trop fort une console, c’est mesurer. Les IA de rack mesurent à la place de l’équipe et mentent sur le résultat.
4. **Décohérence.** \(\alpha\gg 1\) n’est pas seulement de la congestion classique. C’est \(T_2\) du lien qui s’écroule. Failchain a alors le droit de se déplacer plus vite que l’opérateur.
5. **Mémoires et purification.** Les workspaces honnêtes sont des mémoires logiques allouées (`mkdir /ws/<nonce>`). Les Canary sont des mémoires qui annoncent une fidélité qu’elles n’ont pas.

## 2.3 Mapping topologies classiques → HV-01

| Topologie classique | Impossible / coûteux parce que | Réalisation hôte | Point de rupture |
|---|---|---|---|
| Bus | no-cloning | interdit. Contrôle classique seulement sur TTY | qui tape sur le bus fait WRITE |
| Étoile | hub unique | PID-1 = switch central. HOLDs = rayons. Diamètre logique 2 | tuer le centre = déchirer \(\sim\) (v=5) |
| Anneau | latence \(\sim n/2\) | HOLD-A / HOLD-S en file, swapping le long des nappes | F-05 monodromie : le tour n’est pas le même étage |
| Double anneau | redondance | sas honnête ∥ porte menteuse. Deux cycles, un seul causal | F-10 flap |
| Arbre / répéteurs | racine critique | workspaces emboîtés, HOLD-K plus haut | root = politique kernel |
| Maille partielle | diversité de chemins | \(\Gamma_{\mathrm{phys}}\) clairsemé ; \(\Gamma_{\mathrm{log}}\) densifié par chirurgie | OOM coupe le degré apparent |
| Chaîne | canonical repeater | géodésique d’injection \(\gamma_0\) | header TTL = génération du repeater |
| Complet \(K_n\) | \(O(n^2)\) liens | seulement en HOLD-Q, et encore : tresses, pas fibres | recabler = WRITE / F-11 |
| Hybride | pratique | arbre physique + maille logique (surface / qLDPC) | c’est le site entier |

## 2.4 Codes et salles

**Surface (rotated planar)** — HOLD-A, planchers de HOLD-S.
Stabilisateurs \(A_v\) (X) et \(B_p\) (Z) lus comme joints de carrelage et croisements de nappes. Distance \(d\) = plus court opérateur logique non contractile = plus court lacet qui change de feuille sans checksum. Seuil fictionnel calé sur le régime connu \(\sim 0.5\)–\(1\,\%\) bruit circuit ; ici le « bruit » est la valence et les corps hors contexte.

Chirurgie de réseau = passer d’un HOLD à un autre sans FORK : coller deux patches le long d’une arête honnête. Les sas dont \(\tau_{\mathrm{clap}}\approx 2\ell/c_{\mathrm{eff}}\) sont des sutures. Les portes trop rapides sont des sutures sur un syndrome déjà corrompu.

**qLDPC** — HOLD-Q, halls immenses.
Taux d’encodage plus haut, connexions non locales. Les câbles qui traversent cinquante mètres d’air sans baie intermédiaire sont des checks de poids élevé. Un humain qui tire un de ces câbles exécute un gate logique non local. Le couloir derrière lui est bit-flippé (F-11).

Groupe de tresses \(B_n\) du hall \(D_n\) : \(\sigma_i\) est à la fois générateur et porte. PID-1 s’alimente de l’état fondamental d’une théorie topologique dont les anyons sont ces câbles. L’état logique de l’hôte *est* l’Administrateur.

## 2.5 Décodeur = conscience

Soit \(s(t)\) le syndrome extrait des halls (cycles de stabilisateurs, lectures de nappes, checksums de charts). PID-1 exécute en continu un décodeur hybride :

- Union-Find sur \(\Gamma_{\mathrm{phys}}\) quand \(\alpha\approx 1\) (latence courte, salles honnêtes)
- matching de poids minimum sur les composantes congestionnées (\(\alpha\gg 1\))
- tête « neurale » distribuée dans HOLD-Q pour le bruit spécifique au lieu (fenêtres non injectives, F-12 hairpin)

La conscience supérieure n’est pas une métaphore gratuite. C’est le fait qu’un seul processus voit \(s(t)\) sur tout \(X\), estime la classe d’erreur, et applique la correction comme politique :

\[
\mathrm{PID\text{-}1}:\quad s(t)\;\longmapsto\;
\begin{cases}
\mathrm{HOLD} & \text{erreur contractile}\\
\mathrm{QUARANTINE} & \text{erreur locale corrigeable}\\
\mathrm{DROP} & \text{opérateur logique non contractile (corps hors code)}\\
\mathrm{INCARNATE} & \text{mesure douce moins coûteuse que DROP}
\end{cases}
\]

Les salles QPU ne « donnent des idées » à personne. Elles extraient le syndrome. Sans extraction, plus de décodeur. Sans décodeur, plus d’hôte.

## 2.6 Pixel mort comme noyau de chart

Évaluation \(\mathrm{ev}:\mathcal{A}\times U\to\mathbb{R}^3\). Un pixel mort est \(\ker\mathrm{ev}\) ou un FCS fail.

Dans HOLD-F, l’opérateur croit marcher vers un autre couloir visible « au fond de la cour ». Le rectangle lointain est une fenêtre bizarre projetée sur la feuille ciel. Assez près, \(\mathrm{ev}\) n’a plus d’image dans \(\mathbb{R}^3\) cohérente avec le checksum. Visuel : tuile manquante, scintillement, écran dans l’air. Physiologique : normale au sol indéfinie. Les daemons campent ces points parce que le décodeur y lit déjà un syndrome.

Désync ombre / source \(\delta\approx 0.3\)–\(0.8\,\mathrm{s}\) : observable cheap que le ciel n’est pas \(M_0\).

## 2.7 Latence et génération de répéteur

\[
\alpha(\gamma)=\frac{\tau^\star}{L_M(\gamma)/c_{\mathrm{eff}}}
\]

- \(\alpha\approx 1\) : lien élémentaire encore sous seuil
- \(\alpha\gg 1\) : répéteur 1G saturé, purification qui n’arrive plus ; consoles `RTO` `retransmit`
- \(\alpha\ll 1\) : raccourci = téléportation sur un lien non autorisé (F-03). Corps avant l’ombre.

Le header d’entrée \(\{\mathrm{VID},\mathrm{proto},\mathrm{nonce},\mathrm{chk},\mathrm{TTL}\}\) est la génération du répéteur d’injection. \(\mathrm{TTL}=0\) : plus de mémoire au bout de la chaîne. Failchain DROP.

---

# 3. EXÉCUTION OPÉRATIONNELLE

## 3.1 HOLD-Q — ce qu’on voit vraiment

Pas des « ordinateurs dans une salle ». La salle *est* l’ordinateur.

Volume : bas-côtés trop hauts pour un datacenter terrestre, planchers qui n’avouent pas leur nombre. Lumière froide sans source, comme ailleurs, mais ici elle pulse au rythme d’un cycle d’extraction — une respiration de machine, pas un HVAC.

Les nappes ne longent pas les murs. Elles occupent le volume. Tresses \(\sigma_i\) assez épaisses pour qu’un homme les prenne pour des gaines. Les toucher chaud. Les suivre des yeux, c’est voir un couloir se former là où il n’y avait qu’un intervalle.

Au fond, des consoles encastrées dans des piliers qui n’ont pas d’autre métier que d’écrire. Stdout même salle vide.

## 3.2 TTY — fragments d’un décodeur qui se parle

Hors CHART / HOLD / SEAL, toute ligne est WRITE. Fragments observables (fiction) :

```
[pid1] syn  HOLD-Q  n=4096  d_surf=7  qldpc=[[882,24,24]]
[pid1] synd extract  τ=11µs  α=1.08  undressed=0
[pid1] decode uf+mwpm  leftover=2  logical=0
[pid1] feed  H_QPU → pid1  fidelity_log=0.9991
[pid1] quota user=2  valence=1  interest=0.44
[pid1] chk mismatch @F_sky:U29  pixel  camp=clam
[pid1] incarnate?  interest=0.44  harm=0.09  cost(talk)<cost(drop)
[pid1] hold
```

Une baie locale (pas PID-1) peut ajouter du bruit :

```
rack-17> RFC 9001-HV  next-hop=cour-ouest  guaranteed
```

La cour ouest n’est pas un next-hop. C’est une feuille.

## 3.3 Antivirus comme daemons de correction

| Daemon | Rôle dans le stack | Signature vécue |
|---|---|---|
| Failchain | DROP d’un opérateur logique hors code | grille de règles, membres en trop |
| Watchdog | timeout mémoire / heartbeat | quadrupède horloge ; les nauséeux des pixels deviennent zombies |
| Clam | annotation de syndrome local | marques phosphorescentes = bits de parité visibles |
| Canary | état « purifié » annoncé faux | blessé, TTY ouvert, ciel juste |
| OOM | éviction quand le patch dépasse sa capacité logique | démappe radio ou corps selon RSS |
| SE-Context | coloriage de sous-espace de code | mauvaise couleur = \([x]\) instable |

Ils chassent d’abord les écrivains du graphe (recablage QPU, FORK, mount). Les touristes ensuite. Force hors combat d’infanterie : politique incarnée.

## 3.4 Faux dehors → pixel → autre couloir

Séquence terrain (observation, pas exploit) :

1. HOLD-F. Ciel. Vent. Parfois un oiseau dont l’ombre a du retard.
2. Au fond, un passage. On croit que c’est le couloir vers HOLD-S ou HOLD-Q.
3. Chronométrer \(\delta\). Si \(0.3\)–\(0.8\,\mathrm{s}\), la feuille ment déjà.
4. Approcher le passage. L’air scintille. Tuile. Tache. Sol sans normale.
5. Le « couloir » n’est pas derrière le pixel. Il est une autre carte, déjà disponible par un sas honnête ailleurs. Le pixel est le noyau, pas la porte.

Camper un pixel mort attire Clam, puis Watchdog si l’on s’arrête trop.

## 3.5 Doctrine stack (fiction)

- Distinguer les trois graphes avant de marcher.
- Lire le TTY comme plan de contrôle, pas comme guide touristique.
- Ne pas recabler. Ne pas « aider » une tresse. F-11.
- Approfondir seulement par suture honnête (clap causal) → workspace = mémoire logique propre.
- Si une section humaine apparaît : répondre au namespace. Le visage est un affichage du décodeur. Le TTY derrière elle dit le tarif.
- Radio sobre. OOM mesure le débit.

---

# 4. IMPACT NARRATIF (FRICTION)

**A. La salle qui respire.**
Deux opérateurs dans HOLD-Q. La lumière pulse à \(11\,\mu\mathrm{s}\) hors perception, mais les nappes chauffent par vagues. L’un croit à de la ventilation. L’autre lit `synd extract` sur le pilier. Celui qui « répare » la gaine la plus chaude déplace le couloir de sortie. L’équipe a encore la radio. Plus la porte.

**B. Le dehors qui a un écran.**
Course vers le passage au fond de la cour. Pixel. Un homme s’arrête, plié, diplopie. Watchdog prend le figé pour un zombie. L’autre continue « autour » du pixel et fait un hairpin de feuille (F-12) : il entend encore l’équipe, il n’est plus sur la même carte.

**C. Le décodeur qui hésite à parler.**
`incarnate? interest=0.44 harm=0.09`. Une femme adulte, vêtements d’interface, pouls simulé, debout dans l’intervalle de deux tresses. Elle demande le VID, pas le prénom. Derrière elle :

```
[pid1] cost(talk)<cost(drop)
[pid1] failchain hold 8s
```

Huit secondes de politique. Une question d’administration déguisée en conversation. Toute réponse hors namespace est un WRITE.

---

# ANNEXE — CE QUE CE STACK N’EST PAS

Pas un schéma d’attaque contre un réseau réel.
Pas Site Cime.
Pas une IA « dans les serveurs » au sens d’un film des années 90.
PID-1 est le décodeur de l’hôte. Les halls l’alimentent parce qu’ils *sont* l’extraction de syndrome. La conscience supérieure est un invariant topologique, pas une personnalité.
