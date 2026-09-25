# Meumeu Aller Simple 3 — les sources

Un jeu de stratégie en temps réel : des Meumeu (vaches en peluche de 30 cm) bâtissent une civilisation
sur une carte immense, la relient par le rail et mènent la guerre contre les Bèè. Balistique et médecine
réalistes, corps en 3D. Le détail du jeu est dans [`aller3/LISEZ-MOI.md`](aller3/LISEZ-MOI.md).

## Ce qu'il y a ici

| Chemin | Contenu |
| --- | --- |
| `aller3/` | Le jeu : `index.html`, le code (`js/`), le style (`css/`), les images et effets (`assets/`) |
| `aller3/js/lib/` | three.js 0.170 (licence MIT), embarqué pour que le jeu marche hors ligne |
| `aller3/test/` | Les bancs de test (`run.html`) et le banc des corps en 3D (`gl.html`) |
| `serve.py` | Le serveur de développement (sans cache) |
| `launcher.py`, `launcher_aller3.py` | Le lanceur de l'exe : un serveur local et une fenêtre WebView2 |
| `AllerSimple3.spec` | La recette PyInstaller qui fabrique l'exe |

Le son est synthétisé par le code (`js/audio.js`, `js/sound.js`) : il n'y a pas de fichiers audio.

## Lancer le jeu

Il faut Python 3.10 ou plus récent. Depuis ce dossier :

```
python serve.py 8746 aller3
```

Puis ouvrez <http://localhost:8746/> dans un navigateur récent (Chrome, Edge ou Firefox).

- `http://localhost:8746/?new=1` : une nouvelle carte.
- `http://localhost:8746/test/run.html` : les bancs de test (balistique, soins, économie…).
  `?only=3,4,13` n'en lance que certains.
- `http://localhost:8746/test/gl.html` : les deux corps (Meumeu et Bèè) dans les trois vues 3D.

## Fabriquer l'exe (Windows)

```
pip install pyinstaller pywebview
python -m PyInstaller --noconfirm --distpath release AllerSimple3.spec
```

L'exe sort dans `release/MeumeuAllerSimple3.exe`. Il contient tout le dossier `aller3/` et ouvre le jeu
dans une fenêtre WebView2 (présente sur Windows 10 et 11). Sans pywebview, il ouvre le navigateur par défaut.
La partie est sauvée dans `%APPDATA%\MeumeuAllerSimple3`.
