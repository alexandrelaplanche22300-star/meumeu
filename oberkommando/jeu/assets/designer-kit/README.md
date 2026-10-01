# Bureau d'étude — kit d'intégration

Module **uniquement** pour le bureau d'étude d'Oberkommando der Meumeu.
Ne remplace pas la campagne, la carte, ni les autres écrans. On branche ces données à la place de l'ancien concepteur d'armes.

## Échelle

Les meumeu font 30 cm. Leurs armes sont à leur taille : un fusil pèse quelques centaines de grammes, un canon de campagne quelques kilogrammes, et se pousse. Un « 75 » de l'ancien vocabulaire n'est pas un tube de 75 mm réel à côté d'une peluche de 30 cm — ici l'âme d'une pièce de campagne tourne autour de 28–36 mm **réels**, soit l'encombrement d'un canon de campagne à côté d'un servant de 30 cm.

## Comment brancher

1. Lire `data/parts.json` : chaque pièce a un `id`, une catégorie, et un `apply` (champs du modèle qu'elle propose). Ce ne sont pas des verrous. Après le clic, tous les curseurs restent libres.
2. Lire `data/schema.json` : le modèle continu.
3. Les SVG dans `assets/svg/` sont des silhouettes de côté, encre et laiton, à l'échelle du dessin (pas du monde). Les composer en jeu selon les champs du modèle, ou les utiliser comme icônes de bibliothèque.
4. `FORMULES.md` est la référence. Le bureau vivant calcule la même chose : un changement de curseur met à jour V₀, le zéro, l'œil, la masse, les servants et le coût.
5. `data/exemples.json` donne des fiches déjà calculées pour comparer votre portage.

## Règles de jeu à conserver

- Servants minimum = fonction de la masse et de l'affût. On peut en affecter plus : chaque kg en moins par servant rend la poussée plus rapide.
- Roues = mobile. Pieux = fixe, et seulement si on le choisit.
- Le viseur (zéro, rayon, grossissement) change ce qu'on voit et où tombe le coup par rapport au point visé. Il ne change pas V₀.
- La longueur du tube change V₀ seulement tant que la poudre n'a pas fini de pousser. Une ogive lourde avec une poudre lente a besoin de course. Un tube trop long n'ajoute presque plus rien, et pèse le poids de l'acier en plus — pas un malus caché.
- Le coût de la pièce suit la matière et l'usinage. Le prix du coup est séparé. L'artillerie est plus chère qu'un fusil, pas d'un facteur absurde.
- Une roquette se règle par l'impulsion du moteur. Allonger le tube guide sert la dispersion, pas la vitesse.

## Fiche d'arme

Le fichier que le bureau exporte (`fiche.json`) est un `Design` plus le rapport du dernier calcul. C'est ce que le reste du jeu doit lire : masse, servants, vitesse de poussée, V₀, portées, pénétration, éclat, coût.
