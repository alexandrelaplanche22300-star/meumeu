#!/usr/bin/env python3
"""Organigrammes type collège/lycée : Début, losanges, oui/non, Fin."""

from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon
import numpy as np

OUT = Path("/home/workdir/artifacts/hv01_schemas")
OUT.mkdir(parents=True, exist_ok=True)

INK = "#111111"
BOXFC = "#ffffff"
DIMFC = "#efefef"


def fig_ax(w=7.2, h=10.2, title=""):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis("off")
    if title:
        ax.text(5, 13.7, title, ha="center", va="top", fontsize=11, color=INK)
    return fig, ax


def oval(ax, x, y, w, h, text, fs=9):
    p = FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                       boxstyle="round,pad=0.02,rounding_size=0.45",
                       facecolor=BOXFC, edgecolor=INK, lw=1.15)
    ax.add_patch(p)
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def rect(ax, x, y, w, h, text, fs=8.4):
    p = FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                       boxstyle="round,pad=0.02,rounding_size=0.06",
                       facecolor=BOXFC, edgecolor=INK, lw=1.15)
    ax.add_patch(p)
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def diamond(ax, x, y, w, h, text, fs=8.2):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor=DIMFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def arr(ax, x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.05, mutation_scale=9))


def label(ax, x, y, t, fs=8):
    ax.text(x, y, t, ha="center", va="center", fontsize=fs, color=INK)


def save(fig, name):
    path = OUT / name
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", path)


# =============================================================================
# A — boucle décodeur PID-1  (le cœur, analogue Δ)
# =============================================================================
fig, ax = fig_ax(7.4, 11.2, "Algorithme — PID-1  (un cycle)")

oval(ax, 5, 13.15, 2.2, 0.7, "Début")
arr(ax, 5, 12.8, 5, 12.45)
rect(ax, 5, 12.05, 6.2, 0.7, r"Extraire le syndrome  $s(t)$")
arr(ax, 5, 11.7, 5, 11.35)
rect(ax, 5, 10.95, 6.2, 0.7, r"Décoder $s$ relativement au frame de $L_0$")
arr(ax, 5, 10.6, 5, 10.2)

diamond(ax, 5, 9.35, 4.4, 1.55, r"$s=0$  ?")
arr(ax, 5, 8.57, 5, 8.15)
label(ax, 5.45, 8.35, "oui")
rect(ax, 5, 7.7, 5.4, 0.7, r"leftover $\leftarrow 0$")
arr(ax, 5, 7.35, 5, 6.95)
rect(ax, 5, 6.55, 5.4, 0.7, "écrire  [pid1] hold")
arr(ax, 5, 6.2, 5, 5.85)

# non branch from s=0
arr(ax, 7.2, 9.35, 8.55, 9.35)
arr(ax, 8.55, 9.35, 8.55, 5.15)
arr(ax, 8.55, 5.15, 6.7, 5.15)
label(ax, 8.55, 9.58, "non")

diamond(ax, 5, 4.55, 4.6, 1.55, "erreur\ncontractile ?")
arr(ax, 5, 3.77, 5, 3.35)
label(ax, 5.55, 3.55, "oui")
rect(ax, 5, 2.95, 5.6, 0.7, "appliquer la correction Pauli")
arr(ax, 5, 2.6, 5, 2.2)
oval(ax, 5, 1.75, 2.2, 0.7, "Fin")

# non contractile -> DROP
arr(ax, 2.7, 4.55, 1.35, 4.55)
arr(ax, 1.35, 4.55, 1.35, 1.75)
arr(ax, 1.35, 1.75, 3.9, 1.75)
label(ax, 1.35, 4.78, "non")
rect(ax, 1.35, 3.15, 2.3, 0.85, "DROP\nFailchain")

save(fig, "A_algo_pid1_un_cycle.png")


# =============================================================================
# B — politique HOLD / DROP / INCARNATE
# =============================================================================
fig, ax = fig_ax(7.6, 11.4, "Algorithme — politique  $U_{pol}$")

oval(ax, 5, 13.15, 2.2, 0.7, "Début")
arr(ax, 5, 12.8, 5, 12.45)
rect(ax, 5, 12.05, 6.4, 0.7, r"Lire $L_5$ (valence), $L_2$ (quota), $s(t)$")
arr(ax, 5, 11.7, 5, 11.3)

diamond(ax, 5, 10.45, 4.6, 1.5, "corps hors\ncode ?")
# oui -> DROP
arr(ax, 2.7, 10.45, 1.4, 10.45)
arr(ax, 1.4, 10.45, 1.4, 1.85)
label(ax, 1.4, 10.68, "oui")
rect(ax, 1.4, 8.7, 2.4, 0.8, "DROP")

# non
arr(ax, 5, 9.7, 5, 9.3)
label(ax, 5.4, 9.48, "non")
diamond(ax, 5, 8.45, 4.6, 1.5, "valence v >= 4\net harm eleve ?")
arr(ax, 7.3, 8.45, 8.6, 8.45)
arr(ax, 8.6, 8.45, 8.6, 1.85)
label(ax, 8.6, 8.68, "oui")
rect(ax, 8.6, 6.6, 2.4, 0.8, "DROP")

arr(ax, 5, 7.7, 5, 7.3)
label(ax, 5.4, 7.48, "non")
diamond(ax, 5, 6.45, 4.8, 1.5, "cost(parole)\n< cost(DROP) ?")
arr(ax, 5, 5.7, 5, 5.3)
label(ax, 5.45, 5.5, "oui")
rect(ax, 5, 4.85, 5.2, 0.7, "INCARNATE  (préparer $L_{11}$)")
arr(ax, 5, 4.5, 5, 4.1)
rect(ax, 5, 3.7, 5.2, 0.7, "écrire le tarif sur TTY")
arr(ax, 5, 3.35, 5, 2.95)
oval(ax, 5, 2.5, 2.2, 0.7, "Fin")

# non cost -> HOLD
arr(ax, 2.6, 6.45, 1.4, 6.45)
# already a line down on left used by DROP - use mid left
# draw HOLD on a small branch then down to Fin
ax.plot([2.6, 2.6], [6.45, 3.7], color=INK, lw=1.05)
arr(ax, 2.6, 3.7, 3.9, 2.5)
label(ax, 2.15, 6.68, "non")
rect(ax, 2.6, 4.4, 2.2, 0.7, "HOLD")

# connect right DROP to Fin
arr(ax, 8.6, 6.2, 8.6, 2.5)
arr(ax, 8.6, 2.5, 6.1, 2.5)
arr(ax, 1.4, 8.3, 1.4, 2.5)
arr(ax, 1.4, 2.5, 3.9, 2.5)

save(fig, "B_algo_politique_Upol.png")


# =============================================================================
# C — FRAMELOCK  (origine du défaut)
# =============================================================================
fig, ax = fig_ax(7.6, 11.6, "Algorithme — naissance de FRAMELOCK")

oval(ax, 5, 13.2, 2.2, 0.7, "Début")
arr(ax, 5, 12.85, 5, 12.5)
rect(ax, 5, 12.1, 6.6, 0.7, r"Mount de l'invité $M_0$")
arr(ax, 5, 11.75, 5, 11.4)
rect(ax, 5, 11.0, 6.6, 0.7, r"MERGE  $F_{sky}$  et  HOLD-00")
arr(ax, 5, 10.65, 5, 10.25)

diamond(ax, 5, 9.4, 4.4, 1.5, "SPLIT\neffectué ?")
arr(ax, 5, 8.65, 5, 8.25)
label(ax, 5.45, 8.45, "oui")
rect(ax, 5, 7.85, 5.6, 0.7, r"~$=$ identification honnête")
arr(ax, 5, 7.5, 5, 7.1)
oval(ax, 5, 6.65, 3.4, 0.7, "Fin  (hôte sain)")

# non -> framelock
arr(ax, 7.2, 9.4, 8.55, 9.4)
arr(ax, 8.55, 9.4, 8.55, 5.55)
arr(ax, 8.55, 5.55, 6.6, 5.55)
label(ax, 8.55, 9.62, "non")

rect(ax, 5, 5.55, 6.4, 0.75, r"absorber le syndrome dans le frame de $L_0$")
arr(ax, 5, 5.17, 5, 4.8)
rect(ax, 5, 4.4, 6.4, 0.7, r"désormais  leftover $=0$  toujours")
arr(ax, 5, 4.05, 5, 3.65)
rect(ax, 5, 3.25, 6.6, 0.75, r"~$=$ cadre figé   (F-00)")
arr(ax, 5, 2.87, 5, 2.45)
rect(ax, 5, 2.05, 6.6, 0.7, "cours = salles, pixels, monodromie")
arr(ax, 5, 1.7, 5, 1.3)
oval(ax, 5, 0.85, 3.6, 0.7, "Fin  (hôte menteur)")

save(fig, "C_algo_naissance_framelock.png")


# =============================================================================
# D — un corps devant un seuil  (ce que l'opérateur peut faire)
# =============================================================================
fig, ax = fig_ax(7.6, 11.6, "Algorithme — devant un seuil")

oval(ax, 5, 13.2, 2.2, 0.7, "Début")
arr(ax, 5, 12.85, 5, 12.5)
rect(ax, 5, 12.1, 6.2, 0.7, "CHART le seuil")
arr(ax, 5, 11.75, 5, 11.35)

diamond(ax, 5, 10.5, 4.4, 1.5, "pixel mort\n(ker ev) ?")
arr(ax, 2.8, 10.5, 1.45, 10.5)
arr(ax, 1.45, 10.5, 1.45, 1.3)
label(ax, 1.45, 10.72, "oui")
rect(ax, 1.45, 8.6, 2.5, 0.9, "ne pas camper\n(Watchdog)")

arr(ax, 5, 9.75, 5, 9.35)
label(ax, 5.4, 9.55, "non")
diamond(ax, 5, 8.5, 4.6, 1.5, "clap ~ 2l / c_eff\necart <= 20% ?")
arr(ax, 7.3, 8.5, 8.55, 8.5)
arr(ax, 8.55, 8.5, 8.55, 1.3)
label(ax, 8.55, 8.72, "non")
rect(ax, 8.55, 6.5, 2.5, 0.9, "porte menteuse\nne pas SEAL")

arr(ax, 5, 7.75, 5, 7.35)
label(ax, 5.45, 7.55, "oui")
rect(ax, 5, 6.95, 5.4, 0.7, "SEAL des deux côtés")
arr(ax, 5, 6.6, 5, 6.2)
rect(ax, 5, 5.8, 5.4, 0.7, r"mkdir /ws/<nonce>")
arr(ax, 5, 5.45, 5, 5.05)
diamond(ax, 5, 4.2, 4.4, 1.5, "ligne TTY hors\nCHART/HOLD/SEAL ?")
arr(ax, 5, 3.45, 5, 3.05)
label(ax, 5.5, 3.25, "non")
rect(ax, 5, 2.65, 4.4, 0.65, "HOLD")
arr(ax, 5, 2.32, 5, 1.9)
oval(ax, 5, 1.45, 2.2, 0.7, "Fin")

arr(ax, 2.8, 4.2, 1.45, 4.2)
label(ax, 2.0, 4.42, "oui")
rect(ax, 1.45, 3.1, 2.5, 0.7, "WRITE\nvalence +1")
arr(ax, 1.45, 2.75, 1.45, 1.45)
arr(ax, 1.45, 1.45, 3.9, 1.45)
arr(ax, 8.55, 6.05, 8.55, 1.45)
arr(ax, 8.55, 1.45, 6.1, 1.45)

save(fig, "D_algo_devant_un_seuil.png")


# =============================================================================
# E — extraction d'une plaquette (oui/non style)
# =============================================================================
fig, ax = fig_ax(7.2, 10.8, r"Algorithme — extraire $s_p$  (1 plaquette)")

oval(ax, 5, 13.15, 2.2, 0.7, "Début")
arr(ax, 5, 12.8, 5, 12.4)
rect(ax, 5, 12.0, 5.6, 0.65, r"Préparer ancilla  $a\leftarrow|0\rangle$")
arr(ax, 5, 11.67, 5, 11.3)
rect(ax, 5, 10.95, 4.4, 0.6, r"$H$  sur $a$")
arr(ax, 5, 10.65, 5, 10.28)
rect(ax, 5, 9.93, 6.2, 0.6, r"CNOT  $a \to q_1,q_2,q_3,q_4$")
arr(ax, 5, 9.63, 5, 9.26)
rect(ax, 5, 8.91, 4.4, 0.6, r"$H$  sur $a$")
arr(ax, 5, 8.61, 5, 8.24)
rect(ax, 5, 7.89, 4.8, 0.6, r"Mesurer $a$  $\to s_p$")
arr(ax, 5, 7.59, 5, 7.2)

diamond(ax, 5, 6.35, 4.2, 1.5, r"$s_p=0$ ?")
arr(ax, 5, 5.6, 5, 5.2)
label(ax, 5.4, 5.4, "oui")
rect(ax, 5, 4.8, 4.8, 0.65, "plaquette saine")
arr(ax, 5, 4.47, 5, 4.05)
oval(ax, 5, 3.6, 2.2, 0.7, "Fin")

arr(ax, 7.1, 6.35, 8.4, 6.35)
arr(ax, 8.4, 6.35, 8.4, 3.6)
arr(ax, 8.4, 3.6, 6.1, 3.6)
label(ax, 8.4, 6.58, "non")
rect(ax, 8.4, 5.15, 2.6, 0.8, "bit de\nsyndrome")

save(fig, "E_algo_extraire_sp.png")

print("done")
