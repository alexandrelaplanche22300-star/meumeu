# Oberkommando der Meumeu — les sources

Un jeu de stratégie et de gestion en temps réel : des Meumeu (vaches en peluche de 30 cm) bâtissent une
civilisation sur une carte immense, la font tourner — mines, usines, charbon, dépôts, commandes, fret, rail — et
mènent une guerre totale contre les Bèè. Balistique et médecine réalistes, corps en 3D. Le détail du jeu est dans
[`jeu/LISEZ-MOI.md`](jeu/LISEZ-MOI.md).

## Ce qu'il y a ici

| Chemin | Contenu |
| --- | --- |
| `jeu/` | Le jeu : `index.html`, le code (`js/`), le style (`css/`), les images et effets (`assets/`) |
| `jeu/js/eco.js` | La gestion : usines, rattachements, commandes, dépôts, priorités, bureau du fret |
| `jeu/js/lib/` | three.js 0.170 (licence MIT), embarqué pour que le jeu marche hors ligne |
| `jeu/test/` | Les bancs de test (`run.html`) et le banc des corps en 3D (`gl.html`) |
| `serve.py` | Le serveur de développement (sans cache), pour jouer dans un navigateur pendant le travail |
| `electron/` | L'application : `main.js` ouvre le jeu dans sa fenêtre, avec son propre moteur ; `icon.png` |
| `package.json` | Electron et electron-builder, et la recette de l'exe |

Le son est synthétisé par le code (`js/audio.js`, `js/sound.js`) : il n'y a pas de fichiers audio.

## Lancer le jeu

Il faut Python 3.10 ou plus récent. Depuis ce dossier :

```
python serve.py 8746 jeu
```

Puis ouvrez <http://localhost:8746/> dans un navigateur récent (Chrome, Edge ou Firefox).

- `http://localhost:8746/?new=1` : une nouvelle carte.
- `http://localhost:8746/test/run.html` : les bancs de test (balistique, soins, économie, fret…).
  `?only=8,15` n'en lance que certains. Le banc 15 monte toute la chaîne : filons, mines, briqueterie, fret, trains.
- `http://localhost:8746/test/gl.html` : les deux corps (Meumeu et Bèè) dans les trois vues 3D.

## L'application (Windows)

Rien à fabriquer à la main : à chaque mise à jour de `main`, GitHub Actions (`.github/workflows/exe.yml`) lance les bancs,
fabrique l'application avec Electron sur une machine Windows et la publie dans les Releases. La dernière est toujours ici :
<https://github.com/alexandrelaplanche22300-star/meumeu/releases/latest/download/OberkommandoDerMeumeu.exe>

C'est une vraie application : elle embarque son propre moteur (Chromium), sans navigateur, sans Edge ni WebView2.
Un seul fichier, rien à installer ; F11 : plein écran. Taille de l’interface : boutons A− / A+ en haut à droite (ou Ctrl + / Ctrl −, Ctrl 0 : automatique) — calée d’office selon le grossissement de Windows. Les parties sont sauvées dans `%APPDATA%\Oberkommando der Meumeu`.

Pour la lancer depuis les sources : `npm install` puis `npm start` dans ce dossier ; pour fabriquer l'exe soi-même sous
Windows : `npm run dist` (il sort dans `release/`).
