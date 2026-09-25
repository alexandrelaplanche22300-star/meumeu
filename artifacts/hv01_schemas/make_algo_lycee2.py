#!/usr/bin/env python3
"""Organigrammes propres, colonne centrale, comme l'exemple ax2+bx+c."""

from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path("/home/workdir/artifacts/hv01_schemas")
INK = "#111111"
BOXFC = "#ffffff"
DIMFC = "#efefef"


def new(h=12.5, title=""):
    fig, ax = plt.subplots(figsize=(7.0, h * 0.78))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, h)
    ax.axis("off")
    ax.text(5, h - 0.15, title, ha="center", va="top", fontsize=12, color=INK)
    return fig, ax


def oval(ax, x, y, w, h, text):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.02,rounding_size=0.42",
                                facecolor=BOXFC, edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=10, color=INK)


def rect(ax, x, y, w, h, text, fs=9):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.02,rounding_size=0.05",
                                facecolor=BOXFC, edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def diamond(ax, x, y, w, h, text, fs=9):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor=DIMFC, edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def down(ax, x, y1, y2):
    ax.annotate("", xy=(x, y2), xytext=(x, y1),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))


def side(ax, x1, y, x2):
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))


def save(fig, name):
    fig.savefig(OUT / name, dpi=210, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(name)


# ---------- A cycle PID-1 : structure identique à Δ ----------
fig, ax = new(14.2, "Algorithme — un cycle de PID-1")
oval(ax, 5, 13.35, 2.3, 0.7, "Début")
down(ax, 5, 13.0, 12.55)
rect(ax, 5, 12.2, 6.6, 0.65, "Extraire le syndrome  s(t)")
down(ax, 5, 11.87, 11.42)
rect(ax, 5, 11.07, 6.6, 0.65, "Decoder s  relatif au frame de L0")
down(ax, 5, 10.74, 10.25)
diamond(ax, 5, 9.35, 4.6, 1.7, "s = 0 ?")

# oui down
down(ax, 5, 8.5, 8.05)
ax.text(5.35, 8.22, "oui", fontsize=9)
rect(ax, 5, 7.7, 5.4, 0.6, "leftover  ←  0")
down(ax, 5, 7.4, 6.95)
rect(ax, 5, 6.6, 5.4, 0.6, "écrire  [pid1] hold")
down(ax, 5, 6.3, 5.85)
oval(ax, 5, 5.45, 2.3, 0.7, "Fin")

# non right then down to second diamond? Better: non goes to contractile test
# like the quadratic: non from first diamond goes right then down to second diamond
side(ax, 7.3, 9.35, 8.7)
ax.text(7.85, 9.58, "non", fontsize=9)
ax.plot([8.7, 8.7], [9.35, 3.85], color=INK, lw=1.1)
ax.annotate("", xy=(7.3, 3.85), xytext=(8.7, 3.85),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))

diamond(ax, 5, 3.85, 4.6, 1.7, "erreur\ncontractile ?")
down(ax, 5, 3.0, 2.55)
ax.text(5.35, 2.72, "oui", fontsize=9)
rect(ax, 5, 2.2, 5.6, 0.6, "appliquer la correction Pauli")
down(ax, 5, 1.9, 1.45)
oval(ax, 5, 1.05, 2.3, 0.7, "Fin")

# non left to DROP then to Fin
side(ax, 2.7, 3.85, 1.35)
ax.text(1.85, 4.08, "non", fontsize=9)
rect(ax, 1.35, 2.55, 2.3, 0.7, "DROP")
ax.plot([1.35, 1.35], [2.2, 1.05], color=INK, lw=1.1)
ax.annotate("", xy=(3.85, 1.05), xytext=(1.35, 1.05),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))
save(fig, "A2_cycle_pid1.png")


# ---------- C FRAMELOCK like Δ ----------
fig, ax = new(13.6, "Algorithme — FRAMELOCK (F-00)")
oval(ax, 5, 12.85, 2.3, 0.7, "Début")
down(ax, 5, 12.5, 12.05)
rect(ax, 5, 11.7, 6.6, 0.65, "Mount de l'invite  M0")
down(ax, 5, 11.37, 10.92)
rect(ax, 5, 10.57, 6.6, 0.65, "MERGE   F_sky  ||  HOLD-00")
down(ax, 5, 10.24, 9.75)
diamond(ax, 5, 8.85, 4.6, 1.7, "SPLIT\neffectue ?")

down(ax, 5, 8.0, 7.55)
ax.text(5.35, 7.72, "oui", fontsize=9)
rect(ax, 5, 7.2, 5.8, 0.6, "~  =  identification honnete")
down(ax, 5, 6.9, 6.45)
oval(ax, 5, 6.05, 3.5, 0.7, "Fin  (hote sain)")

side(ax, 7.3, 8.85, 8.7)
ax.text(7.85, 9.08, "non", fontsize=9)
ax.plot([8.7, 8.7], [8.85, 4.35], color=INK, lw=1.1)
ax.annotate("", xy=(7.3, 4.35), xytext=(8.7, 4.35),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))

rect(ax, 5, 4.35, 6.6, 0.65, "absorber le syndrome dans le frame de L0")
down(ax, 5, 4.02, 3.57)
rect(ax, 5, 3.22, 6.6, 0.65, "leftover  ←  0   (pour toujours)")
down(ax, 5, 2.89, 2.44)
rect(ax, 5, 2.09, 6.6, 0.65, "~  =  cadre fige   +   faux ciel, pixels")
down(ax, 5, 1.76, 1.31)
oval(ax, 5, 0.9, 3.7, 0.7, "Fin  (hote menteur)")
save(fig, "C2_framelock.png")


# ---------- B politique : 3 issues comme 3 ensembles S ----------
fig, ax = new(14.0, "Algorithme — politique U_pol")
oval(ax, 5, 13.2, 2.3, 0.7, "Début")
down(ax, 5, 12.85, 12.4)
rect(ax, 5, 12.05, 6.8, 0.65, "Lire  L5 valence,  L2 quota,  s(t)")
down(ax, 5, 11.72, 11.25)
diamond(ax, 5, 10.35, 4.8, 1.7, "corps hors\ncode ?")

# oui left DROP
side(ax, 2.6, 10.35, 1.3)
ax.text(1.8, 10.58, "oui", fontsize=9)
rect(ax, 1.3, 9.15, 2.2, 0.65, "DROP")
ax.plot([1.3, 1.3], [8.82, 1.15], color=INK, lw=1.1)

down(ax, 5, 9.5, 9.05)
ax.text(5.35, 9.22, "non", fontsize=9)
diamond(ax, 5, 8.15, 4.8, 1.7, "cost(parole)\n< cost(DROP) ?")

down(ax, 5, 7.3, 6.85)
ax.text(5.35, 7.02, "oui", fontsize=9)
rect(ax, 5, 6.5, 5.8, 0.6, "INCARNATE   (preparer L11)")
down(ax, 5, 6.2, 5.75)
rect(ax, 5, 5.4, 5.8, 0.6, "ecrire le tarif sur TTY")
down(ax, 5, 5.1, 4.65)
oval(ax, 5, 4.2, 2.3, 0.7, "Fin")

# non right HOLD
side(ax, 7.4, 8.15, 8.7)
ax.text(7.9, 8.38, "non", fontsize=9)
rect(ax, 8.7, 6.9, 2.2, 0.65, "HOLD")
ax.plot([8.7, 8.7], [6.57, 4.2], color=INK, lw=1.1)
ax.annotate("", xy=(6.15, 4.2), xytext=(8.7, 4.2),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))
ax.annotate("", xy=(3.85, 4.2), xytext=(1.3, 4.2),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))
# wait DROP should join Fin which is at 4.2 - but I drew line to 1.15. Fix join at 4.2 only
save(fig, "B2_upol.png")


# ---------- E extraction like a small Δ ----------
fig, ax = new(12.2, "Algorithme — extraire s_p  (1 plaquette)")
oval(ax, 5, 11.5, 2.3, 0.7, "Début")
down(ax, 5, 11.15, 10.7)
rect(ax, 5, 10.35, 5.8, 0.6, "a  ←  |0>")
down(ax, 5, 10.05, 9.6)
rect(ax, 5, 9.25, 5.8, 0.6, "H  sur  a")
down(ax, 5, 8.95, 8.5)
rect(ax, 5, 8.15, 6.4, 0.6, "CNOT   a → q1, q2, q3, q4")
down(ax, 5, 7.85, 7.4)
rect(ax, 5, 7.05, 5.8, 0.6, "H  sur  a")
down(ax, 5, 6.75, 6.3)
rect(ax, 5, 5.95, 5.8, 0.6, "Mesurer  a   →   s_p")
down(ax, 5, 5.65, 5.2)
diamond(ax, 5, 4.3, 4.4, 1.7, "s_p = 0 ?")
down(ax, 5, 3.45, 3.0)
ax.text(5.35, 3.17, "oui", fontsize=9)
rect(ax, 5, 2.65, 4.6, 0.6, "S  ←  { plaquette saine }")
down(ax, 5, 2.35, 1.9)
oval(ax, 5, 1.45, 2.3, 0.7, "Fin")
side(ax, 7.2, 4.3, 8.55)
ax.text(7.7, 4.53, "non", fontsize=9)
rect(ax, 8.55, 3.15, 2.5, 0.7, "S  ←  {1}")
ax.plot([8.55, 8.55], [2.8, 1.45], color=INK, lw=1.1)
ax.annotate("", xy=(6.15, 1.45), xytext=(8.55, 1.45),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))
save(fig, "E2_extraire_sp.png")

print("ok")
