# Oberkommando der Meumeu

*Bâtir. Relier. Tenir.* Un jeu de gestion et de guerre totale : des Meumeu (vaches en peluche de 30 cm) contre les Bèè (des chèvres).
On bâtit une économie de guerre (mines, usines, dépôts, chemins de fer), on conçoit ses propres armes au bureau d'études,
on forme et on équipe des escouades, et on mène la guerre. Tout est calculé : la balistique, les blessures, les éclats, le fret.

## Jouer

Télécharger **[OberkommandoDerMeumeu.exe](https://github.com/alexandrelaplanche22300-star/meumeu/releases/latest/download/OberkommandoDerMeumeu.exe)**
puis double-cliquer (Windows 10 ou 11, rien à installer). Les parties sont sauvées dans `%APPDATA%\Oberkommando der Meumeu`.

Pour essayer tout de suite la guerre : bouton **« Démo guerre »**. La démo donne :
- une capitale équipée et deux escouades prêtes ;
- une voie ferrée, deux gares, des mines et un train qui roule ;
- un avant-poste bèè à une quarantaine de cases.

## Commandes

| Touche / souris | Effet |
|---|---|
| Clic gauche | choisir (un clic sur un soldat d'escouade choisit toute l'escouade ; Alt+clic : lui seul) |
| Clic droit | ordre : aller, attaquer, bâtir, ramasser, soigner, porter un blessé |
| Glisser | choisir plusieurs unités |
| Z Q S D / flèches | déplacer la vue ; molette : zoom |
| Espace, 1, 2, 3 | pause, vitesses |
| G | former une escouade |
| X | tir sur zone (pièces à obus) : cliquer le point visé |
| F | fumigène |
| T | planter une tente médicale (médecin) |
| Tab | masquer le panneau de droite (place aux radiographies) |
| B | barre de construction ; E : économie ; M : santé ; I : idées ; H : capitale |
| Ctrl + / − / 0 | taille de l'interface ; F11 : plein écran |

## L'économie

- **Gisements** (fer, charbon, pierre, cuivre, plomb, salpêtre, soie rare) : visibles et nommés sur la carte, avec ce qui reste.
  Ils s'épuisent. Ceux proches de la capitale sont petits : il faut aller plus loin.
- **Usines** : chacune fait une seule chose, commande ses matières à son dépôt et livre au sien.
  - L'usine chimique fait la poudre (salpêtre + charbon) et les explosifs.
  - L'arsenal fait les munitions, la manufacture les armes.
- **Dépôts et fret** : les dépôts ont des priorités et des demandes permanentes. Le fret se fait à la demande :
  - les trains relient les gares ;
  - les porteurs font le dernier kilomètre à pied.
- **Chantiers** : les bâtisseurs vont chercher les matériaux au dépôt du chantier.
- **Villes** : chaque centre-ville a sa population, ses maisons et sa croissance.

## L'armée

- **Caserne** : elle transforme un villageois en soldat, armé et protégé depuis le dépôt.
- **Rééquiper un soldat formé** : dans son panneau, on change son arme, sa protection, son rôle (tireur ou porteur de munitions).
- **Escouades** : leur fenêtre règle la formation, les rôles, les servants des pièces et les porteurs de caisses.
- **Pièces à servants** : mitrailleuse, mortier. Elles se mettent en batterie, et chaque servant manquant les ralentit.
- **Soins** : infirmiers, médecins, tentes, hôpital. Triage, garrots, chirurgie.
- **Radiographies** : chaque tir de l'escouade choisie se voit en 3D, balle et éclats dans le corps. Les coups reçus
  sont à gauche, les coups envoyés à droite.

## Le bureau d'études

On y dessine une arme de A à Z : calibre, balle, poudre, canon, rayure, culasse, modules, affût. La physique répond en direct :
vitesse, trajectoire, précision, perforation, blessure dans la gélatine, tir d'essai en 3D sur un Bèè.

- **Munitions** : 25 constructions (blindée, expansive, perforante, sous-calibrée, explosive, charge creuse, gerbes…).
- **Charge explosive** : quantité d'explosif, type (poudre noire, tolite, brisant), taille des éclats, coque (lisse, rainurée,
  billes), fusée (percutante, retard, fusante). La vue « zone d'effet » montre le souffle, la commotion et les éclats, à l'échelle.
- **Mortier** (chargement par la bouche) et **tir sur zone** : tir en cloche calculé avec la traînée. Un observateur qui voit
  la zone règle le tir obus après obus.
- **Balles auto-propulsées** : une fusée dans la balle. Pas de recul, un souffle arrière, plus de dispersion.
- **Protections** : toile, cuir, lin, acier, céramique, soie, composite. Chacune a son coût et sa protection.

## Développement

Le jeu est dans `oberkommando/jeu` (JavaScript sans dépendance, Canvas 2D et three.js), l'application Windows dans
`oberkommando/electron`.

- Bancs de test : `node oberkommando/jeu/test/node.mjs`.
- Chaque fusion sur `main` fabrique et publie l'exe (GitHub Actions).
- La feuille de route est dans `oberkommando/FEUILLE-DE-ROUTE.md`.
