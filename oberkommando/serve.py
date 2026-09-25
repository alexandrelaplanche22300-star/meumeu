#!/usr/bin/env python3
"""Serveur de développement pour Wargameuh.

Sert dist/ sans aucun cache : les modules ES sont rechargés à chaque requête,
sinon le navigateur continue de servir l'ancienne version d'un fichier modifié
et les tests passent au vert sur du code périmé.

    python serve.py [port]        # jeu   : http://localhost:8743/
                                  # tests : http://localhost:8743/tests.html
    python serve.py 8746 jeu      # Oberkommando der Meumeu
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DIST = Path(__file__).resolve().parent / "dist"


class NoCacheHandler(SimpleHTTPRequestHandler):
    # HTTP/1.1 : l'enregistrement d'un service worker échoue en 1.0 sur « unknown error
    # when fetching the script », le navigateur étant strict sur la récupération du script.
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in fmt % args:
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8743
    root = Path(__file__).resolve().parent / sys.argv[2] if len(sys.argv) > 2 else DIST
    handler = partial(NoCacheHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"{root.name:10s} -> http://localhost:{port}/")
        print(f"Tests      -> http://localhost:{port}/tests.html")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
