#!/usr/bin/env python3
"""Organigrammes type lycée + commandes + but + domaine G/P/A."""

from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path("/home/workdir/artifacts/hv01_schemas")
INK = "#111111"
BOXFC = "#ffffff"
DIMFC = "#f2f2f2"
GCOL = "#1a5f4a"
PCOL = "#1a3d6b"
ACOL = "#6b3a14"


def new(h=16.5, title="", w=8.4):
    fig, ax = plt.subplots(figsize=(w, h * 0.72))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, h)
    ax.axis("off")
    ax.text(5, h - 0.12, title, ha="center", va="top", fontsize=12, color=INK)
    return fig, ax


def oval(ax, x, y, w, h, text, fs=10):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.02,rounding_size=0.4",
                                facecolor=BOXFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def rect(ax, x, y, w, h, text, fs=8.2):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.015,rounding_size=0.05",
                                facecolor=BOXFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def diamond(ax, x, y, w, h, text, fs=8.4):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor=DIMFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def down(ax, x, y1, y2):
    ax.annotate("", xy=(x, y2), xytext=(x, y1),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))


def across(ax, x1, y, x2):
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))


def save(fig, name):
    fig.savefig(OUT / name, dpi=210, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(name)


# =============================================================================
# 1. Cycle PID-1 avec commandes / but / domaine
# =============================================================================
fig, ax = new(17.2, "Algorithme — cycle PID-1   (commande + but + domaine)")
ax.text(5, 16.72,
        "G = geometrie     P = physique (qubits / syndrome)     A = autre (politique / TTY)",
        ha="center", fontsize=8, color=INK)

oval(ax, 5, 16.15, 2.2, 0.55, "Debut")
down(ax, 5, 15.87, 15.55)
rect(ax, 5, 15.15, 7.4, 0.72,
     "commande  EXTRACT          domaine P\nbut : lire s(t) sur les plaquettes HOLD-Q")
down(ax, 5, 14.79, 14.47)
rect(ax, 5, 14.07, 7.4, 0.72,
     "commande  DECODE           domaine P\nbut : estimer l'erreur RELATIVE au frame L0")
down(ax, 5, 13.71, 13.35)
diamond(ax, 5, 12.45, 4.5, 1.65, "s = 0 ?\nP")

# oui
down(ax, 5, 11.62, 11.28)
ax.text(5.38, 11.42, "oui", fontsize=8)
rect(ax, 5, 10.82, 7.4, 0.72,
     "commande  HOLD             domaine A\nbut : declarer l'hote sain   leftover <- 0")
down(ax, 5, 10.46, 10.12)
oval(ax, 5, 9.72, 2.2, 0.55, "Fin")

# non -> contractile
across(ax, 7.25, 12.45, 8.55)
ax.text(7.75, 12.68, "non", fontsize=8)
ax.plot([8.55, 8.55], [12.45, 8.55], color=INK, lw=1.05)
ax.annotate("", xy=(7.25, 8.55), xytext=(8.55, 8.55),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

diamond(ax, 5, 8.55, 4.5, 1.65, "erreur\ncontractile ?\nG+P")
down(ax, 5, 7.72, 7.38)
ax.text(5.38, 7.52, "oui", fontsize=8)
rect(ax, 5, 6.92, 7.4, 0.72,
     "commande  CORRECT          domaine P\nbut : Pauli / frame tracking, garder |L> dans C")
down(ax, 5, 6.56, 6.22)
oval(ax, 5, 5.82, 2.2, 0.55, "Fin")

across(ax, 2.75, 8.55, 1.4)
ax.text(1.95, 8.78, "non", fontsize=8)
rect(ax, 1.4, 7.15, 2.45, 0.85,
     "DROP\ndomaine A\nbut : retirer\nle paquet")
ax.plot([1.4, 1.4], [6.72, 5.82], color=INK, lw=1.05)
ax.annotate("", xy=(3.9, 5.82), xytext=(1.4, 5.82),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 4.35, 7.6, 1.55,
     "Rappel FRAMELOCK (pas dans la boucle)\n"
     "le losange « s = 0 ? » est vrai DANS le frame L0\n"
     "il ne teste jamais « SPLIT effectue ? »   —   domaine G casse, lu comme P sain")
save(fig, "F1_cycle_commandes.png")


# =============================================================================
# 2. Operateur devant le lieu
# =============================================================================
fig, ax = new(18.0, "Algorithme — un corps dans HV-01   (commandes autorisees)")
ax.text(5, 17.52,
        "Seuls CHART / HOLD / SEAL n'elevent pas la valence. Le reste = WRITE.",
        ha="center", fontsize=8, color=INK)

oval(ax, 5, 16.95, 2.2, 0.55, "Debut")
down(ax, 5, 16.67, 16.35)
rect(ax, 5, 15.93, 7.4, 0.75,
     "commande  CHART            domaine G\nbut : lire un seuil, pas le modifier")
down(ax, 5, 15.55, 15.22)
diamond(ax, 5, 14.35, 4.6, 1.6, "pixel mort\nker(ev) ?\nG")

across(ax, 2.7, 14.35, 1.35)
ax.text(1.9, 14.58, "oui", fontsize=8)
rect(ax, 1.35, 12.85, 2.5, 1.0,
     "HOLD\nG+A\nne pas camper\nWatchdog")
ax.plot([1.35, 1.35], [12.35, 2.35], color=INK, lw=1.05)

down(ax, 5, 13.55, 13.2)
ax.text(5.38, 13.35, "non", fontsize=8)
diamond(ax, 5, 12.3, 4.6, 1.6, "clap ~ 2l/c_eff\necart <= 20% ?\nP")

across(ax, 7.3, 12.3, 8.6)
ax.text(7.8, 12.53, "non", fontsize=8)
rect(ax, 8.6, 10.85, 2.5, 1.0,
     "porte menteuse\nG\nne pas SEAL\nCanary")
ax.plot([8.6, 8.6], [10.35, 2.35], color=INK, lw=1.05)

down(ax, 5, 11.5, 11.15)
ax.text(5.38, 11.32, "oui", fontsize=8)
rect(ax, 5, 10.7, 7.4, 0.75,
     "commande  SEAL             domaine G+P\nbut : fermer un sas causal des deux cotes")
down(ax, 5, 10.32, 9.98)
rect(ax, 5, 9.55, 7.4, 0.75,
     "commande  WORKSPACE        domaine A\nbut : mkdir /ws/<nonce>   carte a valence basse")
down(ax, 5, 9.17, 8.82)
diamond(ax, 5, 7.95, 4.6, 1.6, "taper autre chose\nque CHART/HOLD/SEAL ?\nA")

down(ax, 5, 7.15, 6.8)
ax.text(5.38, 6.97, "non", fontsize=8)
rect(ax, 5, 6.35, 6.4, 0.7,
     "commande  HOLD             domaine A\nbut : rester un paquet lisible")
down(ax, 5, 6.0, 5.65)
oval(ax, 5, 5.25, 2.2, 0.55, "Fin")

across(ax, 2.7, 7.95, 1.35)
ax.text(1.9, 8.18, "oui", fontsize=8)
rect(ax, 1.35, 6.55, 2.5, 0.95,
     "WRITE\nA+G\nvalence +1\nClam / Failchain")
# join to Fin from left already has long line from pixel - ok
ax.annotate("", xy=(3.9, 5.25), xytext=(1.35, 5.25),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))
ax.annotate("", xy=(6.1, 5.25), xytext=(8.6, 5.25),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 3.55, 7.6, 1.35,
     "autres commandes et leur domaine\n"
     "MOUNT / UNMOUNT = A+G   (namespace)\n"
     "FORK / recablage QPU = G+P   (WRITE grave, v=3)\n"
     "QUARANTINE / DROP / INCARNATE = A   (reponses hote, pas de l'intrus)")
save(fig, "F2_corps_commandes.png")


# =============================================================================
# 3. Politique U_pol avec commandes + buts
# =============================================================================
fig, ax = new(15.6, "Algorithme — U_pol   (ce que PID-1 execute)")
ax.text(5, 15.12, "Trois issues, comme trois ensembles S. Chaque issue est une commande.",
        ha="center", fontsize=8)

oval(ax, 5, 14.55, 2.2, 0.55, "Debut")
down(ax, 5, 14.27, 13.95)
rect(ax, 5, 13.52, 7.4, 0.75,
     "lire L5 valence, L2 quota, s(t)\ndomaine P+A    but : nourrir U_pol")
down(ax, 5, 13.14, 12.78)
diamond(ax, 5, 11.9, 4.6, 1.6, "corps hors\ncode ?\nP")

across(ax, 2.7, 11.9, 1.4)
ax.text(1.9, 12.13, "oui", fontsize=8)
rect(ax, 1.4, 10.35, 2.5, 0.95,
     "DROP\nA\nbut : oter\nl'operateur\nnon contractile")
ax.plot([1.4, 1.4], [9.87, 3.55], color=INK, lw=1.05)

down(ax, 5, 11.1, 10.75)
ax.text(5.38, 10.9, "non", fontsize=8)
diamond(ax, 5, 9.85, 4.6, 1.6, "cost(parole)\n< cost(DROP) ?\nA")

down(ax, 5, 9.05, 8.7)
ax.text(5.38, 8.85, "oui", fontsize=8)
rect(ax, 5, 8.22, 7.4, 0.75,
     "commande  INCARNATE        domaine A\nbut : preparer L11, section d'interface")
down(ax, 5, 7.84, 7.5)
rect(ax, 5, 7.05, 7.4, 0.7,
     "commande  (TTY)            domaine A\nbut : ecrire le tarif, hold Failchain 8s")
down(ax, 5, 6.7, 6.35)
oval(ax, 5, 5.95, 2.2, 0.55, "Fin")

across(ax, 7.3, 9.85, 8.6)
ax.text(7.8, 10.08, "non", fontsize=8)
rect(ax, 8.6, 8.35, 2.5, 0.85,
     "HOLD\nA\nbut : ne rien\nchanger")
ax.plot([8.6, 8.6], [7.92, 5.95], color=INK, lw=1.05)
ax.annotate("", xy=(6.1, 5.95), xytext=(8.6, 5.95),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))
ax.annotate("", xy=(3.9, 5.95), xytext=(1.4, 5.95),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 4.15, 7.6, 1.15,
     "QUARANTINE (A+G) : cut de composante, secteur isole\n"
     "jamais une commande d'intrus — reponse couche 7")
save(fig, "F3_upol_commandes.png")


# =============================================================================
# 4. FRAMELOCK en commandes
# =============================================================================
fig, ax = new(15.8, "Algorithme — FRAMELOCK   en commandes")
oval(ax, 5, 14.85, 2.2, 0.55, "Debut")
down(ax, 5, 14.57, 14.25)
rect(ax, 5, 13.82, 7.4, 0.75,
     "commande  MOUNT            domaine A+G\nbut : monter l'invite M0 sous l'hote")
down(ax, 5, 13.44, 13.1)
rect(ax, 5, 12.67, 7.4, 0.75,
     "chirurgie MERGE            domaine G+P\nbut : coller F_sky a HOLD-00")
down(ax, 5, 12.29, 11.95)
diamond(ax, 5, 11.05, 4.6, 1.65, "SPLIT\neffectue ?\nG")

down(ax, 5, 10.22, 9.88)
ax.text(5.38, 10.05, "oui", fontsize=8)
rect(ax, 5, 9.45, 7.0, 0.7,
     "UNMOUNT propre de F_sky     domaine G\nbut : ~ honnete")
down(ax, 5, 9.1, 8.75)
oval(ax, 5, 8.3, 3.4, 0.55, "Fin  (hote sain)")

across(ax, 7.3, 11.05, 8.55)
ax.text(7.8, 11.28, "non", fontsize=8)
ax.plot([8.55, 8.55], [11.05, 6.85], color=INK, lw=1.05)
ax.annotate("", xy=(7.25, 6.85), xytext=(8.55, 6.85),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 6.85, 7.4, 0.75,
     "WRITE silencieux dans L0     domaine P+G\nbut manque : le syndrome est ABSORBE, pas corrige")
down(ax, 5, 6.47, 6.13)
rect(ax, 5, 5.7, 7.4, 0.75,
     "HOLD permanent              domaine A\nbut declare : leftover=0   (cadre fige)")
down(ax, 5, 5.32, 4.98)
rect(ax, 5, 4.5, 7.4, 0.85,
     "effets G : faux ciel, pixels, monodromie\n"
     "effets P : s=0 toujours    effets A : daemons chassent les temoins")
down(ax, 5, 4.07, 3.72)
oval(ax, 5, 3.25, 3.6, 0.55, "Fin  (hote menteur)")
save(fig, "F4_framelock_commandes.png")

print("ok")
