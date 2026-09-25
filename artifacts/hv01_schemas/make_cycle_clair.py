#!/usr/bin/env python3
from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path("/home/workdir/artifacts/hv01_schemas")
INK = "#111111"
GRAY = "#f3f3f3"


def rect(ax, x, y, w, h, text, fs=8.5):
    ax.add_patch(FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.016,rounding_size=0.05",
        facecolor="white", edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK,
            fontfamily="DejaVu Sans Mono", linespacing=1.35)


def oval(ax, x, y, w, h, text, fs=11):
    ax.add_patch(FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.45",
        facecolor="white", edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def diamond(ax, x, y, w, h, text, fs=9.2):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor=GRAY, edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK,
            fontfamily="DejaVu Sans Mono", linespacing=1.25)


def arr(ax, x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.15,
                                mutation_scale=10))


fig, ax = plt.subplots(figsize=(9.4, 13.0))
fig.patch.set_facecolor("white")
ax.set_facecolor("white")
ax.set_xlim(0, 10)
ax.set_ylim(0, 13.6)
ax.axis("off")

ax.text(5.0, 13.42, "Un cycle de PID-1", ha="center", va="top", fontsize=14)
ax.text(5.0, 13.05, "execute par l'hote seul, toutes les ~11 us   —   un seul Fin",
        ha="center", va="top", fontsize=8.5, color="#444")

CX = 5.15  # slightly right to leave left gutter for HOLD path

oval(ax, CX, 12.50, 2.35, 0.56, "Debut")
arr(ax, CX, 12.22, CX, 11.88)

rect(ax, CX, 11.50, 6.6, 0.68,
     "extract  --hold=Q --cycle\n[pid1] extract   hold=Q")
arr(ax, CX, 11.16, CX, 10.82)

rect(ax, CX, 10.44, 6.6, 0.68,
     "decode   --frame=L0 --rel\n[pid1] decode    frame=L0  rel=1")
arr(ax, CX, 10.10, CX, 9.72)

diamond(ax, CX, 8.88, 4.2, 1.52, "leftover = 0 ?")

# ---- OUI : hold, then LEFT gutter down to Fin (does not cross 2nd diamond)
arr(ax, CX, 8.12, CX, 7.78)
ax.text(CX + 0.40, 7.92, "oui", fontsize=9)
rect(ax, CX, 7.40, 6.6, 0.68,
     "hold\n[pid1] hold     (hote declare sain)")

# left gutter path
ax.plot([CX, 0.55], [7.06, 7.06], color=INK, lw=1.15)
ax.plot([0.55, 0.55], [7.06, 1.18], color=INK, lw=1.15)
arr(ax, 0.55, 1.18, 3.95, 1.18)
ax.text(0.70, 7.22, "vers Fin", fontsize=7.5, color="#444")

# ---- NON : right rail to second diamond
arr(ax, CX + 2.10, 8.88, 8.85, 8.88)
ax.text(7.15, 9.08, "non", fontsize=9)
ax.plot([8.85, 8.85], [8.88, 5.35], color=INK, lw=1.15)
arr(ax, 8.85, 5.35, CX + 2.10, 5.35)

diamond(ax, CX, 5.35, 4.2, 1.52, "erreur\ncontractile ?")

# OUI contractile -> correct -> Fin
arr(ax, CX, 4.59, CX, 4.25)
ax.text(CX + 0.40, 4.39, "oui", fontsize=9)
rect(ax, 6.05, 3.78, 5.3, 0.68,
     "correct  --pauli=<chaine>\n[pid1] correct   pauli=ok")
arr(ax, 6.05, 3.44, 6.05, 1.48)
arr(ax, 6.05, 1.48, CX + 1.15, 1.18)

# NON contractile -> DROP, colonne gauche, sans chevauchement
arr(ax, CX - 2.10, 5.35, 2.05, 5.35)
ax.text(2.85, 5.55, "non", fontsize=9)
rect(ax, 2.05, 3.78, 2.20, 1.00,
     "drop\n--addr=[x]\n--reason=\nnon-contractile", fs=7.3)
ax.plot([2.05, 2.05], [3.28, 1.18], color=INK, lw=1.15)
arr(ax, 2.05, 1.18, 3.95, 1.18)

oval(ax, CX, 1.18, 2.35, 0.56, "Fin")

# hors boucle
ax.add_patch(FancyBboxPatch(
    (0.70, 0.16), 8.6, 0.52,
    boxstyle="round,pad=0.01,rounding_size=0.05",
    facecolor="#f7f7f7", edgecolor=INK, lw=1.0, linestyle="--"))
ax.text(5.0, 0.42,
        "hors boucle — jamais execute ici     split  F_sky  /hold/00",
        ha="center", va="center", fontsize=8.2,
        fontfamily="DejaVu Sans Mono")

fig.savefig(OUT / "G1b_cycle_clair.png", dpi=210, bbox_inches="tight",
            facecolor="white")
plt.close()
print("ok")
