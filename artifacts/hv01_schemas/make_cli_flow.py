#!/usr/bin/env python3
from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path("/home/workdir/artifacts/hv01_schemas")
INK = "#111111"


def new(h, title):
    fig, ax = plt.subplots(figsize=(8.2, h * 0.70))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, h)
    ax.axis("off")
    ax.text(5, h - 0.18, title, ha="center", va="top", fontsize=12, color=INK)
    return fig, ax


def oval(ax, x, y, w, h, t):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.02,rounding_size=0.4",
                                facecolor="white", edgecolor=INK, lw=1.15))
    ax.text(x, y, t, ha="center", va="center", fontsize=10, color=INK,
            fontfamily="DejaVu Sans Mono")


def rect(ax, x, y, w, h, t, fs=8.0):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0.015,rounding_size=0.05",
                                facecolor="white", edgecolor=INK, lw=1.15))
    ax.text(x, y, t, ha="center", va="center", fontsize=fs, color=INK,
            fontfamily="DejaVu Sans Mono")


def diamond(ax, x, y, w, h, t, fs=8.2):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor="#f2f2f2", edgecolor=INK, lw=1.15))
    ax.text(x, y, t, ha="center", va="center", fontsize=fs, color=INK,
            fontfamily="DejaVu Sans Mono")


def down(ax, x, a, b):
    ax.annotate("", xy=(x, b), xytext=(x, a),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))


def across(ax, x1, y, x2):
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))


def save(fig, name):
    fig.savefig(OUT / name, dpi=210, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(name)


# ----- cycle PID-1 -----
fig, ax = new(16.4, "Algorithme — cycle PID-1   (lignes de console)")
oval(ax, 5, 15.55, 2.3, 0.55, "Debut")
down(ax, 5, 15.27, 14.92)
rect(ax, 5, 14.45, 8.2, 0.85,
     "extract  --hold=Q --cycle\n"
     "[pid1] extract  hold=Q  leftover=?     P")
down(ax, 5, 14.02, 13.68)
rect(ax, 5, 13.2, 8.2, 0.85,
     "decode   --frame=L0 --rel\n"
     "[pid1] decode   frame=L0  rel=1         P")
down(ax, 5, 12.77, 12.4)
diamond(ax, 5, 11.5, 4.6, 1.65, "leftover=0 ?\nP")

down(ax, 5, 10.67, 10.32)
ax.text(5.42, 10.48, "oui", fontsize=8)
rect(ax, 5, 9.82, 8.2, 0.85,
     "hold\n"
     "[pid1] hold                             A")
down(ax, 5, 9.39, 9.05)
oval(ax, 5, 8.55, 2.3, 0.55, "Fin")

across(ax, 7.3, 11.5, 8.55)
ax.text(7.75, 11.72, "non", fontsize=8)
ax.plot([8.55, 8.55], [11.5, 7.35], color=INK, lw=1.05)
ax.annotate("", xy=(7.3, 7.35), xytext=(8.55, 7.35),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

diamond(ax, 5, 7.35, 4.6, 1.65, "contractile ?\nG+P")
down(ax, 5, 6.52, 6.18)
ax.text(5.42, 6.33, "oui", fontsize=8)
rect(ax, 5, 5.68, 8.2, 0.85,
     "correct  --pauli=<chaine>\n"
     "[pid1] correct  pauli=ok  F_log~1       P")
down(ax, 5, 5.25, 4.9)
oval(ax, 5, 4.4, 2.3, 0.55, "Fin")

across(ax, 2.7, 7.35, 1.4)
ax.text(1.9, 7.57, "non", fontsize=8)
rect(ax, 1.4, 5.7, 2.55, 1.05,
     "drop --addr=[x]\n--reason=\nnon-contractile\nA")
ax.plot([1.4, 1.4], [5.17, 4.4], color=INK, lw=1.05)
ax.annotate("", xy=(3.85, 4.4), xytext=(1.4, 4.4),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 2.85, 8.2, 1.0,
     "jamais dans cette boucle :\n"
     "split  F_sky  /hold/00                 G")
save(fig, "G1_cli_cycle.png")


# ----- FRAMELOCK -----
fig, ax = new(16.6, "Algorithme — FRAMELOCK   (lignes de console)")
oval(ax, 5, 15.75, 2.3, 0.55, "Debut")
down(ax, 5, 15.47, 15.12)
rect(ax, 5, 14.65, 8.2, 0.85,
     "mount  --guest=M0 --quota=user --ttl=4h\n"
     "[pid1] mount guest=M0  quota=user       A+G")
down(ax, 5, 14.22, 13.88)
rect(ax, 5, 13.4, 8.2, 0.85,
     "merge  F_sky  /hold/00\n"
     "[pid1] merge  F_sky|/hold/00            G+P")
down(ax, 5, 12.97, 12.6)
diamond(ax, 5, 11.7, 4.6, 1.65, "split\nexecute ?\nG")

down(ax, 5, 10.87, 10.52)
ax.text(5.42, 10.68, "oui", fontsize=8)
rect(ax, 5, 10.02, 8.2, 0.85,
     "split    F_sky  /hold/00\n"
     "unmount  F_sky                         G")
down(ax, 5, 9.59, 9.25)
oval(ax, 5, 8.7, 3.6, 0.55, "Fin  (hote sain)")

across(ax, 7.3, 11.7, 8.55)
ax.text(7.75, 11.92, "non", fontsize=8)
ax.plot([8.55, 8.55], [11.7, 7.2], color=INK, lw=1.05)
ax.annotate("", xy=(7.3, 7.2), xytext=(8.55, 7.2),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 7.2, 8.2, 0.85,
     "decode  --frame=L0 --rel --absorb\n"
     "[pid1] decode  absorb=1  leftover=0     P+G")
down(ax, 5, 6.77, 6.42)
rect(ax, 5, 5.95, 8.2, 0.85,
     "hold    --permanent\n"
     "[pid1] hold                             A")
down(ax, 5, 5.52, 5.18)
rect(ax, 5, 4.55, 8.2, 1.05,
     "effets :\n"
     "G  faux ciel / pixels / monodromie\n"
     "P  leftover=0 toujours     A  daemons")
down(ax, 5, 4.02, 3.68)
oval(ax, 5, 3.15, 3.8, 0.55, "Fin  (hote menteur)")
save(fig, "G2_cli_framelock.png")


# ----- corps -----
fig, ax = new(16.8, "Algorithme — corps   (lignes tapees)")
oval(ax, 5, 15.95, 2.3, 0.55, "Debut")
down(ax, 5, 15.67, 15.32)
rect(ax, 5, 14.85, 8.2, 0.85,
     "chart  /hold/F --delta --alpha\n"
     "but : lire seuil                         G")
down(ax, 5, 14.42, 14.05)
diamond(ax, 5, 13.15, 4.6, 1.65, "chk fail\nker(ev) ?\nG")

across(ax, 2.7, 13.15, 1.4)
ax.text(1.9, 13.37, "oui", fontsize=8)
rect(ax, 1.4, 11.55, 2.55, 0.95,
     "hold\nne pas camper\nA")
ax.plot([1.4, 1.4], [11.07, 3.55], color=INK, lw=1.05)

down(ax, 5, 12.32, 11.97)
ax.text(5.42, 12.13, "non", fontsize=8)
diamond(ax, 5, 11.07, 4.6, 1.65, "clap honnete\n<= 20% ?\nP")

across(ax, 7.3, 11.07, 8.6)
ax.text(7.8, 11.29, "non", fontsize=8)
rect(ax, 8.6, 9.45, 2.5, 0.95,
     "(aucune)\nporte menteuse\nG")
ax.plot([8.6, 8.6], [8.97, 3.55], color=INK, lw=1.05)

down(ax, 5, 10.24, 9.9)
ax.text(5.42, 10.05, "oui", fontsize=8)
rect(ax, 5, 9.4, 8.2, 0.85,
     "seal  /hold/F --both --ell=<m>\n"
     "but : sas causal                         G+P")
down(ax, 5, 8.97, 8.62)
rect(ax, 5, 8.12, 8.2, 0.85,
     "workspace --nonce=<hex> --quota=user\n"
     "mkdir /ws/<nonce> ; chroot /ws/<nonce>   A")
down(ax, 5, 7.69, 7.35)
diamond(ax, 5, 6.45, 4.6, 1.65, "ligne hors\nchart|hold|seal ?\nA")

down(ax, 5, 5.62, 5.28)
ax.text(5.42, 5.43, "non", fontsize=8)
rect(ax, 5, 4.8, 6.2, 0.7, "hold                              A")
down(ax, 5, 4.45, 4.1)
oval(ax, 5, 3.55, 2.3, 0.55, "Fin")

across(ax, 2.7, 6.45, 1.4)
ax.text(1.9, 6.67, "oui", fontsize=8)
rect(ax, 1.4, 5.05, 2.55, 0.9,
     "WRITE\nv += 1\nA+G")
ax.annotate("", xy=(3.85, 3.55), xytext=(1.4, 3.55),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))
ax.annotate("", xy=(6.15, 3.55), xytext=(8.6, 3.55),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))
save(fig, "G3_cli_corps.png")


# ----- U_pol -----
fig, ax = new(14.8, "Algorithme — U_pol   (lignes hote)")
oval(ax, 5, 14.05, 2.3, 0.55, "Debut")
down(ax, 5, 13.77, 13.42)
rect(ax, 5, 12.95, 8.2, 0.85,
     "[pid1] read  L5=valence L2=quota s(t)\n"
     "but : nourrir U_pol                      P+A")
down(ax, 5, 12.52, 12.15)
diamond(ax, 5, 11.25, 4.6, 1.65, "hors code ?\nP")

across(ax, 2.7, 11.25, 1.4)
ax.text(1.9, 11.47, "oui", fontsize=8)
rect(ax, 1.4, 9.7, 2.55, 1.0,
     "drop --addr=[x]\n--reason=\nnon-contractile")
ax.plot([1.4, 1.4], [9.2, 3.7], color=INK, lw=1.05)

down(ax, 5, 10.42, 10.08)
ax.text(5.42, 10.23, "non", fontsize=8)
diamond(ax, 5, 9.15, 4.6, 1.65, "cost.talk <\ncost.drop ?\nA")

down(ax, 5, 8.32, 7.98)
ax.text(5.42, 8.13, "oui", fontsize=8)
rect(ax, 5, 7.48, 8.2, 0.85,
     "incarnate --prep=L11 --hold-failchain=8s\n"
     "[pid1] incarnate? interest=.. harm=..    A")
down(ax, 5, 7.05, 6.7)
oval(ax, 5, 6.15, 2.3, 0.55, "Fin")

across(ax, 7.3, 9.15, 8.6)
ax.text(7.8, 9.37, "non", fontsize=8)
rect(ax, 8.6, 7.55, 2.5, 0.8, "hold\nA")
ax.plot([8.6, 8.6], [7.15, 6.15], color=INK, lw=1.05)
ax.annotate("", xy=(6.15, 6.15), xytext=(8.6, 6.15),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))
ax.annotate("", xy=(3.85, 6.15), xytext=(1.4, 6.15),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))

rect(ax, 5, 4.35, 8.2, 0.9,
     "quarantine --cut=ent --sector=<id>\n"
     "couche 7, jamais tape par l'intrus       A+G")
save(fig, "G4_cli_upol.png")
print("ok")
