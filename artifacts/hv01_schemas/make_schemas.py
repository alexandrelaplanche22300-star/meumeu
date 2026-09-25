#!/usr/bin/env python3
"""HV-01 technical schematics — boxes, arrows, graphs. No atmosphere plates."""

from pathlib import Path
import math
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle, Polygon, Arc
import networkx as nx
import numpy as np

OUT = Path("/home/workdir/artifacts/hv01_schemas")
OUT.mkdir(parents=True, exist_ok=True)

BG = "#0b0f14"
FG = "#d7e2ea"
ACC = "#3ee0c8"
ACC2 = "#f0c14b"
DANGER = "#ff5a5a"
MUTED = "#6b7c89"
BOX = "#152028"
EDGE = "#2a3a46"


def setup(fig, ax, title, subtitle=""):
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_title(title, color=ACC, fontsize=13, fontfamily="DejaVu Sans", pad=10, loc="left",
                 fontweight="medium")
    if subtitle:
        ax.text(0.0, 1.02, subtitle, transform=ax.transAxes, color=MUTED, fontsize=8,
                fontfamily="DejaVu Sans", va="bottom")


def box(ax, x, y, w, h, text, fc=BOX, ec=ACC, tc=FG, fs=8, lw=1.2):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.04",
                       facecolor=fc, edgecolor=ec, linewidth=lw)
    ax.add_patch(p)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color=tc, fontsize=fs,
            fontfamily="DejaVu Sans", wrap=True)
    return p


def arrow(ax, x1, y1, x2, y2, color=ACC, lw=1.3):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw,
                                mutation_scale=10))


def save(fig, name):
    path = OUT / name
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("wrote", path)


# ---------------------------------------------------------------------------
# 01 — matrice détection / réponse (flowchart)
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 8.2))
setup(ax, ax, "HV-01  ·  Schéma 01  ·  Matrice détection → politique",
      "Machine d'états. Pas un décor. Chaque transition élève v ou coupe Γ_ent.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 8.2)

stages = [
    (0.35, 6.3, 3.5, 1.45, "S0  PRÉSENCE PASSIVE\nTTY : logs sur l'intrus\nv = 0 → 1   ·   HOLD", ACC),
    (0.35, 4.55, 3.5, 1.45, "S1  HORS CHEMIN AUTORISÉ\nAV couche 1\nportes pinch / partiellement closes", ACC),
    (0.35, 2.8, 3.5, 1.45, "S3  LECTURE TTY NON AUTORISÉE\nAV couche 3   ·   α ↑\npixels morts alloués sur le chemin", ACC2),
    (0.35, 1.05, 3.5, 1.45, "S7  WRITE / INJECTION / Φ_e\naltération topologique\nAV couche 7   ·   cut de composante", DANGER),
]
for x, y, w, h, t, c in stages:
    box(ax, x, y, w, h, t, ec=c, fs=7.6)

resp = [
    (5.0, 6.3, 3.7, 1.45, "SURVEILLANCE\nplan de contrôle classique\nsyndrome lu, pas encore DROP", ACC),
    (5.0, 4.55, 3.7, 1.45, "CONTRAINTE LOCOMOTION\nWatchdog + Clam\nliens élémentaires bridés", ACC),
    (5.0, 2.8, 3.7, 1.45, "BROUILLAGE DE CHART\nker(ev) posés sous le pas\nF-01 + F-02   diplopie", ACC2),
    (5.0, 1.05, 3.7, 1.45, "QUARANTINE GÉOMÉTRIQUE\nsecteur = sous-graphe isolé\ncomposante connexe fermée", DANGER),
]
for x, y, w, h, t, c in resp:
    box(ax, x, y, w, h, t, ec=c, fs=7.6)

box(ax, 9.55, 3.35, 3.3, 2.6,
    "RING-0\nréécriture code structurel\nmenace sur ~  /  noyau\n\nPID-1 NOTIFIÉ\nPERSONNELLEMENT\n\nINCARNATE  si cost(talk)<cost(DROP)\nsinon  DROP Failchain",
    ec=DANGER, fs=7.4, lw=1.6)

for y in (7.0, 5.25, 3.5, 1.75):
    arrow(ax, 3.9, y, 4.95, y)
arrow(ax, 2.1, 6.3, 2.1, 6.05)
arrow(ax, 2.1, 4.55, 2.1, 4.3)
arrow(ax, 2.1, 2.8, 2.1, 2.55)
arrow(ax, 8.75, 1.75, 11.2, 3.35, color=DANGER)

ax.text(0.35, 0.28, "Verbes autorisés sans WRITE : CHART · HOLD · SEAL. Toute autre ligne console = WRITE.",
        color=MUTED, fontsize=7.5)
save(fig, "01_matrice_detection_etats.png")


# ---------------------------------------------------------------------------
# 02 — trois graphes
# ---------------------------------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(13.2, 5.6))
fig.patch.set_facecolor(BG)
titles = [
    r"Γ_phys   pièces / nappes / sas",
    r"Γ_ent    paires de Bell / états graphe",
    r"Γ_log    qubits après QEC  = politique",
]
seeds = [2, 7, 11]
for ax, title, seed in zip(axes, titles, seeds):
    ax.set_facecolor(BG)
    for s in ax.spines.values():
        s.set_color(EDGE)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(title, color=ACC, fontsize=9, pad=8)
    rng = np.random.default_rng(seed)
    if seed == 2:
        G = nx.grid_2d_graph(4, 3)
        pos = {n: (n[0], n[1]) for n in G.nodes}
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color=ACC, width=1.2)
        nx.draw_networkx_nodes(G, pos, ax=ax, node_size=280, node_color=BOX, edgecolors=ACC, linewidths=1.2)
        labels = {n: f"H{n[0]}{n[1]}" for n in G.nodes}
        nx.draw_networkx_labels(G, pos, labels, ax=ax, font_size=6, font_color=FG)
    elif seed == 7:
        G = nx.random_geometric_graph(14, 0.42, seed=7)
        pos = nx.spring_layout(G, seed=7)
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color=ACC2, width=1.0, style="dashed")
        nx.draw_networkx_nodes(G, pos, ax=ax, node_size=160, node_color=BOX, edgecolors=ACC2, linewidths=1.0)
    else:
        G = nx.star_graph(8)
        pos = nx.spring_layout(G, seed=11)
        colors = [DANGER if n == 0 else ACC for n in G.nodes]
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color=MUTED, width=1.1)
        nx.draw_networkx_nodes(G, pos, ax=ax, node_size=220, node_color=BOX, edgecolors=colors, linewidths=1.4)
        ax.text(0.5, -0.08, "centre = PID-1  (étoile logique)", transform=ax.transAxes,
                ha="center", color=MUTED, fontsize=7)
fig.suptitle("HV-01  ·  Schéma 02  ·  Trois graphes simultanés — ne jamais n'en garder qu'un",
             color=ACC, fontsize=12, x=0.01, ha="left")
fig.text(0.01, 0.02, "Diamètre métrique d'une cour ≠ diamètre logique. Un km de F_sky peut être 0 hop d'intrication.",
         color=MUTED, fontsize=8)
save(fig, "02_trois_graphes.png")


# ---------------------------------------------------------------------------
# 03 — stack couches
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 7.4))
setup(ax, ax, "HV-01  ·  Schéma 03  ·  Pile (ISO fictionnel du hôte)",
      "De L0 géométrie à L7 mensonge. Failles F-01 … F-12.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 7.4)

layers = [
    ("L7  mensonge", "F_sky, fenêtres non injectives", "F-12 hairpin / resolver menteur", DANGER),
    ("L6  tresses", "B_n  hall QPU   σ_i = porte ET couloir", "F-11 erreur de tresse", ACC2),
    ("L5  politique", "valence v, contextes SE, quotas", "DROP Failchain, OOM", DANGER),
    ("L4  session", "header TTL, heartbeat", "F-09  RTO  Watchdog zombie", ACC2),
    ("L3  adresse", "[x] ∈ X / ~", "F-06 split-brain   F-07 NAT d'identité", ACC),
    ("L2  trame", "checksum  H(φ(U))", "F-01 FCS   marque Clam", ACC),
    ("L1  squelette", "1-complexe câbles / arêtes Φ_e", "F-04 simplex   porte menteuse", ACC),
    ("L0  géométrie", "métrique, normale, ev(φ)", "pixel mort, sol sans normale", ACC),
]
for i, (name, obj, fail, col) in enumerate(layers):
    y = 6.55 - i * 0.78
    box(ax, 0.3, y, 2.8, 0.68, name, ec=col, fs=8)
    box(ax, 3.3, y, 5.5, 0.68, obj, ec=EDGE, fs=8)
    box(ax, 9.0, y, 3.9, 0.68, fail, ec=col, fs=7.6)
ax.text(0.3, 0.18, "Antivirus L1 locomotion · L3 session/TTY · L7 topologie · ring-0 = PID-1",
        color=MUTED, fontsize=8)
save(fig, "03_pile_couches.png")


# ---------------------------------------------------------------------------
# 04 — algorithme décodeur PID-1
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 8.0))
setup(ax, ax, "HV-01  ·  Schéma 04  ·  Algorithme PID-1  (décodeur = politique)",
      "s(t) ← extraction HOLD-Q / nappes / checksums. Sortie = HOLD | QUARANTINE | DROP | INCARNATE.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 8.0)

box(ax, 4.3, 7.15, 4.6, 0.65, "entrée  s(t)  syndrome hôte", ec=ACC, fs=9)
box(ax, 0.4, 5.7, 3.7, 0.95, "α ≈ 1\nUnion-Find sur Γ_phys\n(salles honnêtes, latence courte)", ec=ACC, fs=7.5)
box(ax, 4.75, 5.7, 3.7, 0.95, "α ≫ 1\nMWPM sur composante congestionnée\nRTO / retransmit", ec=ACC2, fs=7.5)
box(ax, 9.1, 5.7, 3.7, 0.95, "bruit de lieu (F-12, fenêtres)\ntête distribuée HOLD-Q\ndécodeur spécifique au chart", ec=ACC2, fs=7.5)
arrow(ax, 6.6, 7.15, 2.25, 6.65)
arrow(ax, 6.6, 7.15, 6.6, 6.65)
arrow(ax, 6.6, 7.15, 10.95, 6.65)

box(ax, 3.6, 4.35, 6.0, 0.75, "estimée de classe d'erreur   +   coût(parole) vs coût(DROP)", ec=ACC, fs=8)
arrow(ax, 2.25, 5.7, 5.5, 5.1)
arrow(ax, 6.6, 5.7, 6.6, 5.1)
arrow(ax, 10.95, 5.7, 7.7, 5.1)

box(ax, 0.35, 2.35, 2.9, 1.2, "erreur contractile\n\nHOLD", ec=ACC, fs=8)
box(ax, 3.5, 2.35, 2.9, 1.2, "erreur locale\ncorrigeable\nQUARANTINE", ec=ACC2, fs=8)
box(ax, 6.65, 2.35, 2.9, 1.2, "opérateur logique\nnon contractile\nDROP  Failchain", ec=DANGER, fs=8)
box(ax, 9.8, 2.35, 3.05, 1.2, "mesure douce\nmoins chère que DROP\nINCARNATE", ec=ACC2, fs=8)
arrow(ax, 5.0, 4.35, 1.8, 3.55)
arrow(ax, 5.8, 4.35, 4.95, 3.55)
arrow(ax, 7.4, 4.35, 8.1, 3.55)
arrow(ax, 8.4, 4.35, 11.3, 3.55)

box(ax, 0.35, 0.35, 12.5, 1.35,
    "Alimentation : halls QPU extraient le syndrome (cycle ~ 11 µs fictionnel).\n"
    "Sans extraction, plus de décodeur. Sans décodeur, ~ decohère → cartes user déallouées (v=5).\n"
    "PID-1 n'est pas une personnalité dans une machine. C'est l'unique observateur logique de X.",
    ec=EDGE, fs=8)
save(fig, "04_algorithme_decodeur_pid1.png")


# ---------------------------------------------------------------------------
# 05 — mapping topologies
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 7.6))
setup(ax, ax, "HV-01  ·  Schéma 05  ·  Mapping topologie classique → hôte",
      "No-cloning interdit le bus. L'étoile logique a pour centre PID-1.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 7.6)

headers = ["classique", "interdit / coûteux", "réalisation HV-01", "rupture"]
widths = [2.2, 3.3, 4.4, 2.8]
xs = [0.3, 2.55, 5.9, 10.35]
for x, w, h in zip(xs, widths, headers):
    box(ax, x, 6.7, w, 0.5, h, ec=ACC, tc=ACC, fs=8)

rows = [
    ("Bus", "no-cloning", "interdit ; TTY = contrôle classique seulement", "taper le bus = WRITE"),
    ("Étoile", "hub unique", "PID-1 switch ; HOLDs = rayons ; diam. log. 2", "tuer le centre = v=5"),
    ("Anneau", "latence ~ n/2", "HOLD-A/S + swapping le long des nappes", "F-05 monodromie"),
    ("Double anneau", "redondance", "sas honnête ∥ porte menteuse", "F-10 flap"),
    ("Arbre", "racine critique", "workspaces emboîtés / HOLD-K", "root = kernel"),
    ("Maille", "diversité", "Γ_phys clairsemé ; Γ_log densifié (chirurgie)", "OOM coupe le degré"),
    ("Chaîne", "repeater", "géodésique d'injection γ0", "TTL = génération"),
    ("Hybride", "pratique", "arbre physique + maille logique surface/qLDPC", "c'est le site"),
]
for i, row in enumerate(rows):
    y = 5.95 - i * 0.68
    cols = [ACC, MUTED, ACC, ACC2]
    for x, w, cell, c in zip(xs, widths, row, [ACC, EDGE, ACC, ACC2]):
        box(ax, x, y, w, 0.58, cell, ec=c, fs=7.2)
save(fig, "05_mapping_topologies.png")


# ---------------------------------------------------------------------------
# 06 — pixel mort / faux ciel
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 6.8))
setup(ax, ax, "HV-01  ·  Schéma 06  ·  Faux dehors → ker(ev) → pixel mort",
      "Le passage au fond de la cour n'est pas une porte. C'est une fenêtre non injective.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 6.8)

# leaf F_sky
sky = FancyBboxPatch((0.4, 2.2), 5.2, 3.8, boxstyle="round,pad=0.02,rounding_size=0.06",
                     facecolor="#101820", edgecolor=ACC, lw=1.2, linestyle="--")
ax.add_patch(sky)
ax.text(3.0, 5.75, "feuille  F_sky   (faux extérieur)", color=ACC, ha="center", fontsize=9)
ax.text(3.0, 5.35, "métrique imitant  R² × R₊", color=MUTED, ha="center", fontsize=7.5)

# path
ax.plot([1.0, 4.6], [2.7, 4.9], color=ACC2, lw=1.6)
ax.plot([4.6], [4.9], "o", color=DANGER, markersize=14)
ax.text(4.85, 5.05, "ker(ev)\npixel mort\nalloué", color=DANGER, fontsize=7.5, va="bottom")
ax.text(1.15, 2.55, "opérateur", color=FG, fontsize=7)

# "corridor" mirage
box(ax, 3.35, 4.15, 1.7, 0.55, "« couloir »", ec=MUTED, fs=7.5)
ax.text(4.2, 3.85, "image non injective", color=MUTED, fontsize=7, ha="center")

# other chart
box(ax, 7.3, 3.6, 5.4, 2.2,
    "carte réelle (HOLD-S / HOLD-Q)\naccessible seulement par sas honnête\nτ_clap ≈ 2ℓ / c_eff   écart ≤ 20 %\n\nle pixel n'est pas le seuil",
    ec=ACC, fs=8)
arrow(ax, 5.6, 4.4, 7.25, 4.6, color=MUTED)

box(ax, 7.3, 0.45, 5.4, 2.7,
    "observables (pas un exploit)\n\n1. chronométrer δ ombre/source  0.3–0.8 s\n2. α = τ* / (L_M / c_eff)\n3. deux observateurs, même rectangle ?\n4. ne pas camper le pixel  (Watchdog / Clam)",
    ec=ACC2, fs=8)

box(ax, 0.4, 0.45, 5.2, 1.5,
    "ev : A × U → R³\npixel = ker(ev)  ou  H(φ(U)) ≠ chk_pid1\nF-01  ·  couche 3 alloue des noyaux\npour désorienter (normale indéfinie)",
    ec=DANGER, fs=7.6)
save(fig, "06_faux_ciel_pixel_mort.png")


# ---------------------------------------------------------------------------
# 07 — sous-graphe isolé
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 6.4))
setup(ax, ax, "HV-01  ·  Schéma 07  ·  Couche 7  ·  Secteur isolé (cut de Γ_ent)",
      "WRITE / injection / altération Φ_e  →  composante connexe fermée.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 6.4)

G = nx.Graph()
# main mesh
core = [f"H{i}" for i in range(8)]
iso = ["S0", "S1", "S2", "INTRUS"]
G.add_nodes_from(core + iso)
edges_core = [("H0", "H1"), ("H1", "H2"), ("H2", "H3"), ("H3", "H4"),
              ("H4", "H5"), ("H5", "H6"), ("H6", "H7"), ("H7", "H0"),
              ("H0", "H4"), ("H2", "H6")]
G.add_edges_from(edges_core)
G.add_edges_from([("S0", "S1"), ("S1", "S2"), ("S2", "INTRUS"), ("S0", "INTRUS")])
# cut former links drawn dashed separately
pos = {
    "H0": (1.5, 4.6), "H1": (3.0, 5.4), "H2": (4.6, 4.8), "H3": (5.2, 3.4),
    "H4": (4.2, 2.2), "H5": (2.6, 1.8), "H6": (1.2, 2.6), "H7": (0.9, 3.8),
    "S0": (9.2, 4.6), "S1": (11.2, 4.2), "S2": (11.0, 2.6), "INTRUS": (9.0, 2.8),
}
for a, b in edges_core:
    ax.plot([pos[a][0], pos[b][0]], [pos[a][1], pos[b][1]], color=ACC, lw=1.2)
for a, b in [("S0", "S1"), ("S1", "S2"), ("S2", "INTRUS"), ("S0", "INTRUS")]:
    ax.plot([pos[a][0], pos[b][0]], [pos[a][1], pos[b][1]], color=DANGER, lw=1.4)
# cut marks
ax.plot([6.4, 7.6], [3.6, 3.9], color=DANGER, lw=2.0)
ax.plot([6.4, 7.6], [3.9, 3.6], color=DANGER, lw=2.0)
ax.text(7.0, 4.15, "CUT  Γ_ent", color=DANGER, fontsize=8, ha="center")

for n, (x, y) in pos.items():
    col = DANGER if n in iso else ACC
    ax.plot(x, y, "o", markersize=16 if n != "INTRUS" else 20, color=BOX, markeredgecolor=col, markeredgewidth=1.4)
    ax.text(x, y, n, ha="center", va="center", color=FG, fontsize=6.5)

box(ax, 8.3, 0.35, 4.5, 1.5, "plus de sortie utile\nn_exits peut encore pousser\nles nouvelles portes mentent", ec=DANGER, fs=8)
box(ax, 0.4, 0.35, 5.4, 1.5, "reste du site  ·  Γ_phys encore connexe\nmais plus de morphisme honnête\nvers le secteur quarantiné", ec=ACC, fs=8)
save(fig, "07_sous_graphe_isole.png")


# ---------------------------------------------------------------------------
# 08 — surface code + braid as algorithm
# ---------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(13.2, 6.2))
fig.patch.set_facecolor(BG)

ax = axes[0]
ax.set_facecolor(BG)
for s in ax.spines.values():
    s.set_color(EDGE)
ax.set_xticks([])
ax.set_yticks([])
ax.set_title("HOLD-A / S   surface code rotated planar", color=ACC, fontsize=9)
# lattice
n = 6
for i in range(n):
    for j in range(n):
        ax.plot(i, j, "o", color=ACC, markersize=5)
        if i < n - 1:
            ax.plot([i, i + 1], [j, j], color=MUTED, lw=0.8)
        if j < n - 1:
            ax.plot([i, i], [j, j + 1], color=MUTED, lw=0.8)
# X and Z plaquettes
for i in range(n - 1):
    for j in range(n - 1):
        col = ACC2 if (i + j) % 2 == 0 else ACC
        ax.add_patch(Rectangle((i + 0.15, j + 0.15), 0.7, 0.7, fill=False, edgecolor=col, lw=1.0))
ax.text(2.5, -0.7, "A_v (X) / B_p (Z)  = joints + nappes\nd = plus court lacet non contractile\nchirurgie = sas honnête",
        color=MUTED, fontsize=7.5, ha="center")
ax.set_aspect("equal")
ax.set_xlim(-0.5, 5.5)
ax.set_ylim(-1.3, 5.5)

ax = axes[1]
ax.set_facecolor(BG)
for s in ax.spines.values():
    s.set_color(EDGE)
ax.set_xticks([])
ax.set_yticks([])
ax.set_title("HOLD-Q   tresse σ_i ∈ B_n   = gate = couloir", color=ACC2, fontsize=9)
t = np.linspace(0, 1, 200)
# three strands, one crossing
def strand(x0, phase, amp=0.35):
    return x0 + amp * np.sin(np.pi * t + phase)
ys = t * 5
# strand A over B in middle
xa = np.where(t < 0.45, 1.2 + 0.0 * t, np.where(t < 0.55, 1.2 + (2.2 - 1.2) * (t - 0.45) / 0.1, 2.2))
xb = np.where(t < 0.45, 2.2 + 0.0 * t, np.where(t < 0.55, 2.2 + (1.2 - 2.2) * (t - 0.45) / 0.1, 1.2))
# draw under first
ax.plot(xb, ys, color=MUTED, lw=3.5, zorder=1)
ax.plot(xa, ys, color=ACC, lw=3.5, zorder=3)
ax.plot([3.2] * len(t), ys, color=ACC2, lw=3.5, zorder=2)
ax.text(1.2, -0.25, "brin i", color=ACC, ha="center", fontsize=8)
ax.text(2.2, -0.25, "brin i+1", color=MUTED, ha="center", fontsize=8)
ax.text(3.2, -0.25, "brin i+2", color=ACC2, ha="center", fontsize=8)
ax.text(2.2, 5.25, "σ_i  ·  WRITE si un corps tire le câble  ·  F-11", color=DANGER, ha="center", fontsize=7.5)
ax.set_xlim(0.5, 4.0)
ax.set_ylim(-0.6, 5.6)

fig.suptitle("HV-01  ·  Schéma 08  ·  Codes : surface (salles) / tresses (halls QPU)",
             color=ACC, fontsize=12, x=0.01, ha="left")
save(fig, "08_surface_et_tresses.png")


# ---------------------------------------------------------------------------
# 09 — antivirus stack as block diagram
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13.2, 6.6))
setup(ax, ax, "HV-01  ·  Schéma 09  ·  Antivirus physiques = daemons de correction",
      "Catalogue HV. Pas Cime. Force = politique incarnée, pas un combat d'infanterie.")
ax.set_xlim(0, 13.2)
ax.set_ylim(0, 6.6)

daemons = [
    (0.3, 4.5, "Failchain", "DROP\ncontexte faux, header mort, FORK\ngrille de règles, membres en trop", DANGER),
    (4.55, 4.5, "Watchdog", "heartbeat\nfigé trop longtemps = zombie\nquadrupède-horloge", ACC2),
    (8.8, 4.5, "Clam", "checksum\nmarque phosphorescente\nvalence de pièce ↑", ACC),
    (0.3, 2.15, "Canary", "leurre\nblessé / TTY ouvert / ciel juste\nquitte la feuille honnête", ACC2),
    (4.55, 2.15, "OOM", "éviction mémoire/attention\nRSS = notes+radio+WRITE\ndémappe appareil ou corps", DANGER),
    (8.8, 2.15, "SE-Context", "coloration de sous-espace\nmauvaise couleur → [x] instable\nAVC géométrique", ACC),
]
for x, y, name, body, c in daemons:
    box(ax, x, y + 1.15, 4.05, 0.5, name, ec=c, tc=c, fs=9)
    box(ax, x, y, 4.05, 1.15, body, ec=c, fs=7.4)

box(ax, 0.3, 0.3, 12.6, 1.5,
    "L1 chemins → Watchdog + pinch des portes     L3 TTY → Clam + pixels alloués + α     L7 topologie → Failchain + OOM + cut\n"
    "ring-0 → PID-1 notifié personnellement (section humaine ou DROP sans visage)\n"
    "Priorité de chasse : écrivains du graphe  >  lecteurs de logs  >  touristes.",
    ec=EDGE, fs=8)
save(fig, "09_antivirus_daemons.png")

print("done")
