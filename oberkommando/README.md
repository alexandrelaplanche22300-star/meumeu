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
| `serve.py` | Le serveur de développement (sans cache) |
| `launcher.py`, `launcher_oberkommando.py` | Le lanceur de l'exe : un serveur local et une fenêtre WebView2 |
| `Oberkommando.spec` | La recette PyInstaller qui fabrique l'exe |

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

## Fabriquer l'exe (Windows)

```
pip install pyinstaller pywebview
python -m PyInstaller --noconfirm --distpath release Oberkommando.spec
```

L'exe sort dans `release/OberkommandoDerMeumeu.exe`. Il contient tout le dossier `jeu/` et ouvre le jeu dans une
fenêtre WebView2 (présente sur Windows 10 et 11). Sans pywebview, il ouvre le navigateur par défaut.
La partie est sauvée dans `%APPDATA%\OberkommandoDerMeumeu` (les sauvegardes d'Aller Simple 3 ne se chargent pas :
l'économie a changé).
