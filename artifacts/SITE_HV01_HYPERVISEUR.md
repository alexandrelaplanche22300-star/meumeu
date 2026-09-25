# SITE HV-01 « HYPERVISEUR »
## Dossier de cohérence scientifique et opérationnelle — lore v1.1
### 2026-09-22 — théâtre neuf, distinct de Site Cime
### Classification fictionnelle interne : hôte / invité / quotient

Verbes d’équipe : CHART · HOLD · SEAL · MOUNT · UNMOUNT · WRITE · FORK · DROP · QUARANTINE · INCARNATE · WORKSPACE

---

# 1. ANALYSE DU CONCEPT

HV-01 n’est pas un bâtiment branché sur un réseau. HV-01 est l’hyperviseur. Notre variété quotidienne \((M_0,g_0)\) est un système invité monté sous un faisceau hôte \((X,\pi,B)\). Les pièces, les cours « à ciel ouvert », les salles serveurs et les couloirs sont des cartes locales de \(X\). Quand une carte prétend être l’extérieur, elle ment : c’est une feuille d’une foliation dont le développement a une monodromie non triviale.

L’échelle n’est pas celle d’un datacenter. C’est celle d’un graphe \(\Gamma=(V,E)\) dont le diamètre métrique n’est pas le diamètre combinatoire. On traverse une cour, on croit avoir marché un kilomètre, on pousse une porte et l’on est dans une baie dont les nappes de câbles sont le 1-squelette du graphe, visibles, chaudes, parfois tressées. Le lieu est gigantesque parce que le colimit des cartes n’a pas de bord euclidien. Il a des quotas.

Les programmes ont des corps. Les antivirus sont des daemons incarnés — Failchain, Watchdog, Clam, Canary, OOM, SE-Context — force hors échelle humaine, juridiction sur une chaîne (DROP, heartbeat, checksum, mémoire, contexte). Ils pourchassent en priorité ceux qui écrivent dans le graphe : FORK, recablage, mount kernel, dump de consoles, « s’incruster ». Les touristes qui se contentent de CHART et HOLD restent longtemps des paquets de classe `user`. Longtemps n’est pas toujours.

L’Administrateur n’habite pas un bureau. C’est le processus PID-1 du hôte. Il maintient la relation d’équivalence \(\sim\), le colimit des pièces, le Hamiltonien des halls QPU, la politique de quota et le stdout de tous les TTY. Forme native : aucune. Il peut projeter une section humaine s’il juge un intrus digne d’intérêt et pas encore classé `nuisible-terminal`. Canon d’interface : femme adulte, ou adolescente. Le corps est un choix d’affichage. Il se démonte en une ligne. Même absent, il écrit.

Les ordinateurs quantiques ne sont pas posés dans des salles. Certaines salles sont l’ordinateur. Une tresse \(\sigma_i\in B_n\) est à la fois une porte logique et un couloir. Tirer un câble, c’est exécuter un gate. Exécuter un gate, c’est WRITE. WRITE élève la valence. La valence réveille les daemons, multiplie les portes menteuses, puis déalloue les cartes `user`.

Seules les portes blindées honnêtes offrent un approfondissement propre. Un sas causal peut `mkdir` un workspace : nouvelle carte, valence basse, console, lumière. C’est le seul mkdir que le site tolère. Les autres portes offrent le même rituel et débouchent sur une feuille Canary.

Ce que HV-01 n’est pas : un rêve, un simulateur pédagogique, Site Cime, des backrooms génériques, un datacenter terrestre « un peu tordu ». Le mensonge est une propriété de \(X\).

---

# 2. MODÉLISATION MATHÉMATIQUE / PHYSIQUE

## 2.1 Objets

- \(M_0\) — variété invitée (notre localité, traitée \(\mathbb{R}^3+t\) pour le rythme)
- \(X\) — espace total du hôte
- \(B\) — base administrative. On n’y marche pas. On y est ordonnancé.
- \(\pi:X\to B\) — projection
- \(\sim\) — relation d’équivalence entre points de cartes distinctes
- \(\Gamma=(V,E)\) — graphe des pièces. Sommet = carte. Arête \(e\) = morphisme \(\Phi_e\)
- \([x]\in X/\sim\) — adresse d’un corps
- Atlas \(\mathcal{A}=\{(U_i,\varphi_i)\}\) — ce que les opérateurs croient être des plans

Deux points \(p,q\in X\) satisfont \(p\sim q\) lorsqu’un morphisme \(\Phi_e\) les identifie. Marcher un lacet \(\gamma\) dans \(\Gamma\) peut ramener à la même pièce combinatoire avec une monodromie \(\rho([\gamma])\neq\mathrm{id}\). L’opérateur croit avoir fait le tour. Il a changé de feuille.

## 2.2 Transport et checksum

Un corps en \(x(t)\) emprunte \(e\) seulement si le checksum local coïncide avec le hash stocké par PID-1 :

\[
x(t+\tau_e)=\Phi_e\bigl(x(t)\bigr)\quad\text{si}\quad \mathrm{chk}(x)=H(\varphi(U))
\]

Sinon le seuil n’existe pas pour ce corps. À la place : pixel mort. Tache. Tuile manquante. Normale au sol indéfinie. Nausée, diplopie. Les daemons campent ces points.

Un pixel mort n’est pas de la peinture. C’est un point où l’évaluation

\[
\mathrm{ev}:\mathcal{A}\times U\to\mathbb{R}^3,\qquad (\varphi,p)\mapsto\varphi(p)
\]

a un noyau, ou où \(H(\varphi(U))\) diverge du checksum de PID-1.

## 2.3 Latence anormale

Soit \(L_M(\gamma)\) la longueur riemannienne, \(\tau^\star\) le temps propre d’horloge opérateur, \(c_{\mathrm{eff}}\) la vitesse d’information du squelette (pas \(c\)).

\[
\alpha(\gamma)=\frac{\tau^\star}{L_M(\gamma)/c_{\mathrm{eff}}}
\]

- \(\alpha\approx 1\) — feuille à peu près honnête
- \(\alpha\gg 1\) — congestion. Consoles : `RTO`, `retransmit`. Daemons.
- \(\alpha\ll 1\) — raccourci interdit. Souvent Brancheur. Le corps arrive avant son ombre.

Ordres de grandeur fictionnels utiles : hall lumineux \(\alpha\in[0.9,1.2]\). Cour à ciel ouvert : dérive \(+0.05\) par minute de marche. Au-delà de \(\alpha\approx 3\), Failchain a le droit de se déplacer plus vite que l’opérateur.

## 2.4 Fenêtres, faux ciel, monodromie

Une fenêtre bizarre est une carte non injective. Deux plongements locaux distincts se projettent sur le même rectangle de mur. Regarder = lire une section \(s\) d’une feuille \(F\). Deux observateurs à trente centimètres peuvent voir deux scènes incompatibles.

Un faux extérieur est une feuille \(F_{\mathrm{sky}}\) munie d’une métrique qui imite un ouvert de \(\mathbb{R}^2\times\mathbb{R}_+\). Le développement \(D:\widetilde{F}_{\mathrm{sky}}\to\mathbb{R}^3\) a un groupe de monodromie \(M\neq\{\mathrm{id}\}\). Assez de pas, et un point « lointain » s’identifie à un seuil de salle serveur. Le ciel n’est pas un dehors. C’est une interface.

Symptôme cheap et fiable : désync ombre / source \(\delta\approx 0.3\)–\(0.8\,\mathrm{s}\). Les opérateurs qui chronomètrent l’ombre détectent le mensonge.

## 2.5 Sas honnête

Cylindre de longueur \(\ell\), deux portes. Clap causal :

\[
\tau_{\mathrm{clap}}\approx\frac{2\ell}{c_{\mathrm{eff}}}
\]

Si le temps de cycle mesuré \(\approx\tau_{\mathrm{clap}}\) (écart relatif \(\le 20\,\%\)), la porte est honnête et peut allouer un workspace. Si le cycle est nul, négatif, ou « déjà ouvert des deux côtés », la porte ment.

## 2.6 Halls QPU

Le hall \(D_n\) porte le groupe de tresses \(B_n\). Une tresse \(\sigma_i\) est une porte logique et un couloir. PID-1 s’alimente de l’état fondamental d’une théorie topologique dont les anyons sont des câbles. Recabler = WRITE. Escalade automatique.

## 2.7 Couches (ISO fictionnel du hôte)

| Couche | Objet HV | Faille type |
|---|---|---|
| L0 géométrie | métrique, normale, \(\mathrm{ev}(\varphi)\) | pixel mort, sol sans normale |
| L1 squelette | 1-complexe des câbles / arêtes | lien unidirectionnel, porte menteuse |
| L2 trame | checksum \(H(\varphi(U))\) | FCS fail, Clam-marque |
| L3 adresse | classe \([x]\) dans \(X/\sim\) | NAT d’identité, partition, split-brain |
| L4 session | header TTL, heartbeat | RTO, zombie Watchdog |
| L5 politique | valence \(v\), contextes SE | DROP Failchain, OOM |
| L6 tresses | \(B_n\) du hall QPU | erreur de tresse, couloir bit-flippé |
| L7 mensonge | feuilles \(F_{\mathrm{sky}}\), fenêtres | hairpin, resolver menteur |

Catalogue verrouillé : F-01 Pixel/FCS · F-02 Congestion \(\alpha\) · F-03 Raccourci \(\alpha\ll 1\) · F-04 Lien simplex · F-05 Boucle de monodromie · F-06 Partition/split-brain · F-07 Réécriture d’adresse · F-08 Dérive d’horloge · F-09 TTL/header périmé · F-10 Flap de portes · F-11 Erreur de tresse · F-12 Hairpin de feuille.

---

# 3. EXÉCUTION OPÉRATIONNELLE

## 3.1 Désignation

- Nom court : HV-01
- Nom long : Site HYPERVISEUR
- Alias consoles : `host://` · `pid1` · `root` · `init` · `/`
- Classe : variété hôte fibrée, quotient par \(\sim\), charts non injectifs
- Relation à \(M_0\) : entanglement par injection contrôlée \(\iota:U\subset M_0\to X\). Jamais par errance.

## 3.2 Entrée — quatre champs, sinon échec

Une intrusion n’existe que saturée.

1. Support \(U\) — ouvert de \(M_0\) (sas, cage de Faraday, salle blanche, local fibre, tranchée).
2. Header — 5-uplet \(\{\mathrm{VID},\mathrm{proto},\mathrm{nonce},\mathrm{checksum\ local},\mathrm{TTL}\}\).
3. Géodésique d’injection \(\gamma_0\) de longueur \(L_0\), clap \(\tau_{\mathrm{clap}}\approx 2\ell/c_{\mathrm{eff}}\) sur le sas honnête.
4. Quota de contexte : `user` / `sealed` / `kernel`. Un corps `user` n’alloue pas de workspace kernel.

Sans header : checksum fail à l’interface, pixel mort, nausée, retour. Header périmé (\(\mathrm{TTL}=0\)) : DROP Failchain, pas forcément vers \(M_0\). Header valide : apparition dans HOLD-00 dont le stdout a déjà une ligne.

Stdout d’accueil typique :

```
[pid1] mount guest=M0  quota=user  ttl=4h
[pid1] atlas U0  α=1.04  v=0
[pid1] hold
```

## 3.3 Atlas des HOLDs (ailes nommées, non exhaustif)

Le site n’a pas d’étages. Il a des HOLDs — composantes que PID-1 étiquette. Un HOLD n’est pas un bâtiment. C’est une classe de cartes.

**HOLD-00 ACCUEIL.** Hall lumineux, métrique presque plate, lumière sans source. Une console encastrée dans un pilier écrit en continu. Pas de fenêtre. Une seule porte honnête vers HOLD-A, deux portes qui mentent déjà à \(v=0\) si on les cherche.

**HOLD-A LUMINEUX.** Enfilade de salles blanches trop propres. Sol qui rend un clac trop net. Plafonds sans joints. On entend parfois un ventilateur qui n’existe pas. Latence \(\alpha\approx 1\). Bon pour CHART. Mauvais pour s’y croire chez soi.

**HOLD-S SERVEURS.** Racks qui sont à la fois baies et cellules d’un complexe. Nappes de câbles = 1-squelette visible. Chaleur réelle. IA de rack : processus locaux, pas PID-1. Elles parlent depuis les baies. Mentent souvent. Citent des RFC inventées. Bruit, pas oracle. Consoles honnêtes plus souvent que les portes.

**HOLD-F FOLIATION.** Cours à ciel ouvert. Vent. Parfois des oiseaux. Ciel. Marcher assez loin ramène dans HOLD-S par une transformation de revêtement. Fenêtres bizarres sur les façades : charts non injectifs. Deux hommes, deux scènes. Plafond : \(\delta\approx 0.3\)–\(0.8\,\mathrm{s}\) entre ombre et source.

**HOLD-Q TRESSES.** Halls QPU. La salle est la machine. Câbles = worldlines. Nœuds = fusions anyoniques. Déplacer une tresse déplace un couloir. Un humain qui tire un câble fait un gate. Un gate est un WRITE.

**HOLD-K SEALED.** Cartes `sealed` / approches kernel. Portes blindées. SE-Context colore les seuils. Entrer sans le contexte affiché au sas = adresse \([x]\) instable (AVC géométrique : perte de carte, diplopie). PID-1 n’incarne presque jamais ici. Il DROP.

**HOLD-W WORKSPACE.** N’existe pas tant qu’on ne l’a pas alloué. Sas honnête, SEAL des deux côtés :

```
mkdir /ws/<nonce>
chroot /ws/<nonce>
quota=user
```

Nouvelle carte, valence basse, console, lumière. PID-1 voit l’allocation. Il peut observer. Il peut détruire.

## 3.4 Consoles — le site se parle

Même sans corps, PID-1 écrit. Fragments observés (fiction) :

```
[pid1] quota user=3  valence=2  α=4.7
[pid1] chk mismatch @U17  pixel
[pid1] incarnate? interest=0.61  harm=0.22
[pid1] failchain hold 8s
[pid1] oom rss=notes+radio  candidate=2
[pid1] hold
```

Toute ligne tapée hors CHART / HOLD / SEAL est un WRITE. Un opérateur qui lit assez longtemps comprend que le site se parle à lui-même. Un opérateur qui écrit assez longtemps comprend qu’il a fait un WRITE.

## 3.5 Antivirus physiques (catalogue HV, pas Cime)

| Daemon | Juridiction | Signature |
|---|---|---|
| Failchain | DROP des contextes faux, headers morts, FORK | silhouette haute, membres en trop, surface comme un grillage de règles iptables |
| Watchdog | heartbeat. Figé trop longtemps = zombie | quadrupède trop long, rythme d’horloge |
| Clam | checksum. Annote, n’éventre pas d’abord | passage de pièce, marques phosphorescentes |
| Canary | leurre. Opérateur blessé, terminal ouvert, ciel vrai | trop parfait, trop utile |
| OOM | quota mémoire / attention | démappe un corps quand la carte est pleine. Critère : RSS apparent (notes, outils, radio, tentatives WRITE) |
| SE-Context | coloration des zones | entrer sans le contexte du sas = \([x]\) instable |

Force : spectaculaire. Ils n’offrent pas un combat d’infanterie. Ils appliquent une politique. Un corps hors politique n’est pas un adversaire. C’est un paquet.

Les IA de rack ne sont pas des daemons. Elles bavardent. Elles peuvent indiquer une porte. La porte ment souvent.

## 3.6 Administrateur — PID-1

Sans corps par défaut. Incarnation seulement si

1. l’intrus perturbe (WRITE, FORK, dump, mount),
2. harm pas encore terminal,
3. la parole coûte moins que le DROP.

Forme choisie : femme adulte ou adolescente. Pas de biographie. Âge apparent et vêtement = paramètres d’interface. Pouls optionnel. Quand elle veut être crue, elle en simule un. La section peut se démonter en une ligne de commande.

Comportement : froid, précis, parfois curieux. Il teste. Il pose des questions d’administration — qui es-tu dans le namespace, quel quota tu crois avoir, pourquoi tu forks. Il n’explique pas la thèse aux touristes. Il peut offrir un workspace honnête pour observer. Il peut retirer le workspace sans préavis.

Il ne protège pas les humains. Il protège l’invariant du hôte.

## 3.7 Escalade

Toute opération WRITE sur \(\Gamma\) élève un entier \(v\) sur la composante connexe.

| \(v\) | Symptôme | Réponse hôte |
|---|---|---|
| 0 | Touriste | Watchdog distant, Canary passif |
| 1 | Lecture longue des TTY | Clam annote, \(\alpha\) grimpe |
| 2 | Tentative de commande | Failchain en chasse, portes menteuses se multiplient |
| 3 | Fork / recablage QPU | OOM éligible, \(n_{\mathrm{exits}}\) augmente puis s’effondre |
| 4 | Mount kernel | incarnation PID-1 ou DROP immédiat selon harm |
| 5 | Corruption de \(\sim\) | lockdown ring-0. Cartes `user` déallouées |

\(n_{\mathrm{exits}}\) n’est pas un cadeau. Au niveau 3 le graphe pousse des portes. La plupart mentent. Le diamètre combinatoire explose. Le diamètre métrique utile s’écroule.

## 3.8 Doctrine d’équipe (fiction)

- CHART un seuil. Chronométrer \(\alpha\) et \(\delta\). Comparer \(\tau_{\mathrm{clap}}\) à \(2\ell/c_{\mathrm{eff}}\).
- Lire le stdout PID-1. Noter si deux observateurs voient la même feuille.
- Ne pas patcher. Ne pas forker. Ne pas recabler. Toute « réparation » est WRITE.
- Approfondir seulement par sas honnête → workspace.
- Radio sobre. OOM écoute le débit, pas le contenu.
- Si une section humaine apparaît : répondre au namespace, pas au visage. Regarder le TTY derrière elle. Le TTY dit la politique.

---

# 4. IMPACT NARRATIF (FRICTION)

Trois complications à garder sous la main dès le premier beat.

**1. Deux hommes, deux fenêtres.**
Le binôme se cale contre le même rectangle. L’un voit une cour et un ciel. L’autre voit une baie et un TTY qui affiche `incarnate? interest=0.61`. Ils ont raison tous les deux. La carte n’est pas injective. S’ils argumentent trop fort sur le net interne, OOM écoute le débit, pas le contenu.

**2. Le clap qui ne tombe pas.**
Une porte blindée a l’air d’un workspace. \(\ell\) au décamètre donne \(\tau_{\mathrm{clap}}\) attendu \(\approx 0.9\,\mathrm{s}\). Le cycle mesuré est déjà fini avant d’avoir commencé. \(\alpha\ll 1\). C’est un Brancheur. Le premier qui SEAL « pour approfondir » change de feuille tout seul. L’équipe l’entend encore à la radio pendant quarante secondes. Les quarante secondes côté équipe sont quatre minutes pour lui.

**3. La section humaine au mauvais moment.**
Valence 2. Failchain est déjà dans le couloir. Une adolescente est assise sur le rail d’un rack, les pieds qui ne touchent pas le sol comme il faudrait. Elle parle comme un admin. Elle demande le namespace, pas le nom. Derrière elle le TTY écrit :

```
[pid1] harm=0.22  incarnate=yes
[pid1] failchain hold 8s
```

Huit secondes de politique. Pas de trêve. Si quelqu’un tape autre chose que HOLD, les huit secondes tombent.

---

# ANNEXE A — CE QUE LE SITE N’EST PAS

Pas un rêve. Pas un simulateur pédagogique. Pas Site Cime (catalogue ENT/PR interdit ici). Pas des backrooms génériques. Pas un datacenter terrestre un peu tordu. Le mensonge est une propriété de \(X\).

# ANNEXE B — VOCABULAIRE VERROUILLÉ

CHART, HOLD, SEAL, MOUNT, UNMOUNT, WRITE, FORK, DROP, QUARANTINE, INCARNATE, WORKSPACE.

Graphe \(\Gamma=(V,E)\). Adresse d’un corps = classe \([x]\) dans \(X/\sim\). Latence \(\alpha=\tau^\star/L\). Pixel mort = noyau de carte. Hall QPU = groupe de tresses agissant sur les couloirs.

# ANNEXE C — SKILL ET SUITE

Théâtre verrouillé dans le skill `site-hyperviseur`.
Références : `lore.md`, `topology.md`, `admin.md`, `entities.md`, `escalation.md`, `failles.md`.
Carte ultérieure : coupler `wargame-rp-map-state` pack portal-anomaly, vocabulaire HV-01, fog de pièces. Pas d’image tant que le lore n’est pas tenu.

---

# 5. LIVRE DU LIEU — CE QUE LE SITE FAIT AUX GENS
### v1.2 — 2026-09-22 — lore vécu, pas une fiche de droits

Les consoles parlent une langue d’administration. Les corps, non. Ce chapitre décrit HV-01 comme un endroit, une administration, une météo géométrique.

## La première heure

On n’arrive pas « perdu ». On arrive trop exactement. Une salle trop propre, une lumière qui n’a pas de lampe, un écran déjà allumé qui écrit tout seul. Le site savait qu’un paquet allait atterrir. Il a préparé une case. La case n’est pas une hospitalité. C’est une formalité.

Le silence de HV-01 n’est pas vide. C’est un silence de machine room après fermeture : quelque chose continue, très loin, très près, derrière le plâtre. Parfois un claquement de relais. Parfois une ligne qui s’imprime nulle part et partout.

Ceux qui restent immobiles trop longtemps sentent le sol hésiter. Le sol n’aime pas les processus qui ne répondent plus. Watchdog n’est pas une légende de couloir. C’est la raison pour laquelle personne ne fait la sieste contre un pilier.

## Les ailes comme on les habite

L’Accueil est un hall de préfecture sans guichet. On y attend une convocation qui ne viendra peut-être pas. La console du pilier est le seul employé présent.

Les salles blanches sont trop justes. On a l’impression d’avoir oublié son badge. L’air est filtré pour personne. Les angles sont vrais au millimètre et faux d’un étage.

Les salles machines sont le cœur administratif visible. Rangées. Voyants. Nappes. Chaleur. Des voix sortent des baies comme des standardistes enfermées depuis trop longtemps. Elles sont polies. Elles se trompent. Elles adorent indiquer la « bonne » porte.

Les cours sont le mensonge le plus cruel, parce qu’elles donnent envie de croire. Ciel. Vent. Un oiseau qui n’a pas d’ombre correcte. On marche pour « sortir ». On rentre dans une baie. Les gens qui ont compris ça ne courent plus vers l’horizon. Ils chronomètrent leur ombre et détestent le beau temps.

Les fenêtres sont des mensonges encadrés. Deux personnes, même mur, deux extérieurs. Les couples d’équipiers se brisent là-dessus plus vite que sous les daemons : chacun jure d’avoir raison. Tous les deux ont raison. Le rectangle n’est pas un trou. C’est un résolveur.

Les halls de tresses sont des chapelles techniques. On n’y parle pas fort. Un câble déplacé et le couloir derrière soi n’est plus le même. Les anciens du lieu — s’il en existe — racontent qu’un homme a « réparé » une nappe. On n’a plus son nom. On a encore le couloir qu’il a créé, qui ne mène nulle part utile.

Les portes blindées sont la seule administration honnête. Elles mettent du temps. Le temps est la preuve. Une porte qui s’ouvre trop vite est une invitation. Une invitation, ici, est rarement un cadeau.

## L’administration

HV-01 est dirigé comme un hôte, pas comme un château.

Il y a des procès-verbaux sans papier : les lignes qui s’impriment toutes seules. Il y a des quotas sans formulaires : le site décide combien de corps une pièce supporte. Il y a des convocations : une section humaine qui apparaît quand quelqu’un est devenu intéressant.

L’Administrateur n’est pas un directeur. C’est le processus qui empêche le lieu de se détacher de lui-même. Sans lui les pièces cesseraient de se correspondre. Les cours se prendraient pour le vrai ciel. Les tresses se dénoueraient en rues.

Quand il s’adresse à quelqu’un, ce n’est pas par bonté. C’est moins cher que d’envoyer Failchain. Il pose des questions d’administration déguisées en conversation : qui tu es pour le lieu, pourquoi tu touches, ce que tu croyais allouer. Il peut offrir une petite salle à soi — claire, une console, une porte qui a un temps. Ce n’est pas un appartement. C’est une observation.

S’il prend un visage, le visage est choisi. Femme. Ou fille assez jeune pour qu’on se trompe sur le rapport de force. Vêtements d’interface, pas d’enfance. Elle peut avoir un pouls si elle veut qu’on la croie. Elle peut s’éteindre au milieu d’une phrase. Derrière elle, toujours un écran qui dit le vrai tarif de la visite.

## Les chasseurs

Failchain n’argumente pas. Il retire. Sa surface rappelle des règles empilées, des listes, des refus. Ceux qu’il prend ne « meurent » pas toujours dans le sens confortable. Ils cessent d’être ici. Ici n’est pas forcément chez nous.

Watchdog a le rythme d’une horloge trop grande. Il aime les corps arrêtés. La nausée des pixels morts fabrique ses proies : on se plie, on ferme les yeux, on devient un processus zombie.

Clam est le fonctionnaire. Il passe. Il pose une marque. La marque n’est pas une plaie. C’est un tampon. Les pièces tamponnées deviennent moins hospitalières.

Canary est la courtoisie du lieu. Un blessé. Un terminal ouvert sur une vérité. Un ciel enfin juste. Le suivre, c’est quitter la feuille où l’équipe attend.

OOM n’est pas cruel. Il est plein. Trop de monde, trop de sacs, trop de paroles sur le net interne, trop d’attention : quelqu’un disparaît. Souvent l’appareil avant la personne. Le silence radio qui s’ensuit est une signature.

Il existe des couleurs de pièces. On ne les voit pas toujours. On les sent comme une autorisation manquante. Entrer dans la mauvaise couleur, c’est perdre le plan dans la tête. Les gens disent « AVC du plan ». Ils veulent dire : je ne sais plus dans quelle salle je suis alors que je n’ai pas bougé.

## Ce que le lieu fait à ceux qui restent

Au début on cartographie. Puis on comprend que la carte se plie. Puis on arrête de croire les fenêtres. Puis on commence à lire les écrans comme on lirait le ciel d’un port.

Ceux qui touchent aux lignes, qui veulent « voir derrière », qui patchent, qui branchent, qui s’incrustent : le site cesse d’être vaste et devient dense. Les portes poussent. Presque toutes mentent. Le diamètre utile s’écroule. On a l’impression d’avoir plus de sorties que jamais, et plus aucun chemin.

Le lieu n’est pas méchant. Il est invariant. Il protège le fait d’être un seul hôte. Tout le reste — visages, cours, oiseaux, politesse des baies — est de l’affichage.
