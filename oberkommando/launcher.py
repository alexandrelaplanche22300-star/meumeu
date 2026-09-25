"""Wargameuh — lanceur autonome.

Le jeu est fait de modules ES natifs : ouvert en file:// il échoue silencieusement,
il lui faut donc un serveur HTTP. Ce lanceur en démarre un sur un port libre, sur la
boucle locale uniquement, puis affiche le jeu dans une fenêtre WebView2 — la même base
Chromium que le navigateur, sans en avoir l'apparence.

Empaqueté par PyInstaller, tout cela tient dans un seul .exe : rien à installer,
rien à servir à la main.
"""
from __future__ import annotations

import http.server
import os
import socket
import socketserver
import sys
import threading
from pathlib import Path

TITLE = "Wargameuh — Table de Guerre V15"


def resources() -> Path:
    """Racine des fichiers du jeu, que l'on tourne depuis les sources ou depuis l'exe."""
    bundled = getattr(sys, "_MEIPASS", None)
    root = Path(bundled) if bundled else Path(__file__).resolve().parent
    return root / "dist"


class Handler(http.server.SimpleHTTPRequestHandler):
    """Sert le jeu sans cache et sans bavarder dans la console."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(resources()), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # noqa: D102 - on reste muet
        pass


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def start_server() -> str:
    port = free_port()
    httpd = Server(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/"


def main() -> int:
    root = resources()
    if not (root / "index.html").exists():
        sys.stderr.write(f"Fichiers du jeu introuvables dans {root}\n")
        return 1

    url = start_server()

    try:
        import webview
    except ImportError:
        # Sans WebView2 ni pywebview, le navigateur par défaut fait tout aussi bien.
        import webbrowser

        webbrowser.open(url)
        print(f"{TITLE}\n{url}\nFermez cette fenêtre pour arrêter le jeu.")
        threading.Event().wait()
        return 0

    # Fenêtre maximisée, zoom du navigateur désactivé : la taille de l'interface se règle
    # dans le jeu (boutons A− / A+), pas par un ctrl+molette qui reste mémorisé.
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass
    window = webview.create_window(TITLE, url, width=1480, height=900, min_size=(1024, 680), maximized=True, zoomable=False)
    # confirm_close laisse une chance de sauvegarder avant de tout perdre.
    window.confirm_close = True
    webview.start()
    return 0


if __name__ == "__main__":
    os.environ.setdefault("PYWEBVIEW_GUI", "edgechromium")
    raise SystemExit(main())
