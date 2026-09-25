"""Oberkommando der Meumeu — lanceur autonome.

Un serveur HTTP local, une fenêtre WebView2. Deux différences avec le lanceur d'origine :
le port est fixe (l'adresse ne change pas d'un lancement à l'autre) et le stockage du
navigateur est gardé dans %APPDATA% : la partie sauvée est encore là au lancement suivant.
"""
from __future__ import annotations

import os
import socket
import sys
import threading
from pathlib import Path

import launcher

TITLE = "Oberkommando der Meumeu"
PORTS = (18765, 18766, 18767, 18768)


def resources() -> Path:
    bundled = getattr(sys, "_MEIPASS", None)
    root = Path(bundled) if bundled else Path(__file__).resolve().parent
    return root / "jeu"


def storage() -> Path:
    base = Path(os.environ.get("APPDATA") or Path.home())
    path = base / "OberkommandoDerMeumeu"
    path.mkdir(parents=True, exist_ok=True)
    return path


def start_server() -> str:
    # un port fixe si possible : le stockage du navigateur dépend de l'adresse
    for port in PORTS:
        try:
            httpd = launcher.Server(("127.0.0.1", port), launcher.Handler)
            break
        except OSError:
            continue
    else:
        port = launcher.free_port()
        httpd = launcher.Server(("127.0.0.1", port), launcher.Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/"


def main() -> int:
    launcher.resources = resources
    root = resources()
    if not (root / "index.html").exists():
        sys.stderr.write(f"Fichiers du jeu introuvables dans {root}\n")
        return 1
    url = start_server()
    try:
        import webview
    except ImportError:
        import webbrowser

        webbrowser.open(url)
        print(f"{TITLE}\n{url}\nFermez cette fenêtre pour arrêter le jeu.")
        threading.Event().wait()
        return 0
    try:
        import ctypes

        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass
    window = webview.create_window(TITLE, url, width=1480, height=900, min_size=(1024, 680), maximized=True, zoomable=False)
    window.confirm_close = True
    webview.start(private_mode=False, storage_path=str(storage()))
    return 0


if __name__ == "__main__":
    os.environ.setdefault("PYWEBVIEW_GUI", "edgechromium")
    raise SystemExit(main())
