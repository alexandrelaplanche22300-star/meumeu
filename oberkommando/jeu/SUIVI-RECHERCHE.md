# La recherche (V12.6) — suivi

Demande du joueur (2026-10-04) : « rajoute toute une partie recherche… les bureaux d'études et centres de recherche, laboratoires et usines chimiques
doivent tous faire partie de ce système ; quand on clique sur un de ces bâtiments on arrive dans la vue recherche, qui enlève le toit pour voir l'intérieur
avec les chercheurs et scientifiques meumeu (modèle en pièce jointe) ; un système majeur, fascinant, vivant ; les centres de recherche sont des nouveaux
bâtiments où l'on gère les équipes de scientifiques, où l'on forme des villageois au métier de scientifique, où des réunions sont organisées, des projets… »

## Ce qui est fait

- **Le savant** (`UNITS.savant`, modèle `assets3d/meumeu_chercheur.json`, la Meumeu en blouse du joueur, 1 799 faces) : formé au **centre de recherche**
  à partir d'un villageois (40 vivres, 6 pièces, 24 h d'école ; un maître gradé ou pédagogue au centre : jusqu'à ×2). Son **ancien métier** compte :
  formé dans la discipline de son métier (le poudrier → chimiste, le mineur → géologue…), il est *praticien* (+25 %, 10 points d'avance).
  Six **disciplines** (agronomie, géologie, mécanique, chimie, balistique, médecine), deux **traits** tirés à la sortie d'école (douze : génie distrait,
  méthodique, audacieux, prudent, bavard, solitaire, pédagogue, insomniaque, perfectionniste, rêveur, ombrageux, optimiste), cinq **grades**
  (assistant → sommité), un **moral**, une **fatigue**, des **ententes** et des rivalités entre savants.
- **Les projets** : une idée (d'un ouvrier, par la pratique, ou d'un savant) devient un projet mené par une équipe (chef d'équipe), par **étapes, chacune
  dans son bâtiment** : théorie au tableau noir du centre de recherche, expériences à la paillasse du laboratoire, plans à la planche du bureau d'études,
  essai à l'atelier pilote de l'usine chimique (la chimie : les trois). L'équipe marche d'un bâtiment à l'autre. **Eurêkas**, **blocages** (un point
  d'avancement les lève), **accidents** (laboratoire, usine : le bâtiment touché, parfois en feu ; la chimie trois fois plus), **percées** (l'effet de
  l'innovation accru de moitié), **sérendipité** (une idée d'une autre discipline en chemin).
- **Les réunions** autour de la grande table : remue-méninges (des idées neuves), point d'avancement (débloque), colloque (expérience, idées croisées,
  ententes), séminaire (les maîtres forment les jeunes). Les pauses café (moral, ententes, parfois une idée), le rêveur qui rêve à son bureau.
- **18 découvertes savantes** (`INNOV` `sci:true`) que la pratique ne trouve jamais : engrais, blé hybride, sylviculture, conserve (on mange 15 % de
  moins), prospection, tir de mine, acier au creuset, machine compound, pièces interchangeables, imprimerie (recherche et école plus rapides), béton
  armé, tables de tir, rayures, pénicilline, groupes sanguins, anesthésie, poudre colloïdale, catalyse.
- **Les savants libres** affectés : au bureau d'études ils pressent les prototypes (deux ingénieurs : ×2,6 mesuré), à l'usine chimique la production.
- **La vue recherche** (`labview.js`, `labs3d.js`) : un clic sur un de ces bâtiments → la caméra vole, s'incline, le toit s'envole ; l'intérieur
  (maison de poupée : murs du fond hauts, de devant coupés) : l'école et son tableau, la salle de réunion, six bureaux, la bibliothèque, le coin café ;
  les paillasses, la hotte, les flacons ; les planches à dessin et la maquette ; la cuve de cuivre, le condenseur, le pupitre. Chacun à son poste selon
  ce qu'il fait, par les allées ; il écrit, parle, regarde l'orateur, dort, saute à l'eurêka. Noms, icônes, bulles de paroles, bandeau des projets.
  La nuit : la lumière chaude des lampes. Autour, les arbres et nos unités s'effacent.
- **Le panneau** (`research-ui.js`) : Projets (étapes, équipe, évènements ; propositions et équipe à choisir), Savants (l'école, chaque savant),
  Réunions, Carnet de laboratoire, Savoir (pratique, arbre, adoptées), Bâtiment. Touche **I** : la vue recherche ; **Échap** : la refermer.
- Retiré : l'ancien développement au laboratoire (`b.dev`, `develop`, `canDevelop`), la modale des idées ; le laboratoire n'est plus unique.

## Tests

- `test/recherche.mjs` (R1–R11) : école et praticien, maître, amatol sur trois bâtiments, sans laboratoire, remue-méninges (et jamais de savante par la
  pratique), point d'avancement, prototype et usine, destruction, sauvegarde, percée, trois jours sans exception.
- `test/_outils_captures/recherche_save.mjs` (la partie de démonstration, par les vrais chemins) et `recherche_vue.cjs` (les captures : clic, réunion,
  usine, bureau, nuit — brouillard actif). Page de contrôle `_labos.html` (?el=, ?ext=1, ?ext=seul).

## À faire, idées

- De grands projets à plusieurs disciplines ; des savants qui vont consulter dans un autre bâtiment quand un projet bloque.
- L'allié IA ne cherche pas (il n'a pas de savants).
