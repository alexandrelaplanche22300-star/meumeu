#!/usr/bin/env python3
"""Schéma de l'algorithme quantique dont l'état logique est PID-1."""

from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, Rectangle, FancyArrowPatch, Arc
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
WIRE = "#8aa0ad"


def save(fig, name):
    p = OUT / name
    fig.savefig(p, dpi=190, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("wrote", p)


def box(ax, x, y, w, h, text, fc=BOX, ec=ACC, tc=FG, fs=8, lw=1.2, align="center"):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.045",
                       facecolor=fc, edgecolor=ec, linewidth=lw)
    ax.add_patch(p)
    va = "center" if align == "center" else "top"
    yy = y + h / 2 if align == "center" else y + h - 0.08
    ax.text(x + w / 2, yy, text, ha="center", va=va, color=tc, fontsize=fs,
            fontfamily="DejaVu Sans")
    return p


def arrow(ax, x1, y1, x2, y2, color=ACC, lw=1.3):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw, mutation_scale=11))


def wire(ax, x0, x1, y, color=WIRE, lw=1.15):
    ax.plot([x0, x1], [y, y], color=color, lw=lw, solid_capstyle="butt", zorder=1)


def gate(ax, x, y, w, h, label, ec=ACC, fs=7.2):
    r = FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                       boxstyle="round,pad=0.008,rounding_size=0.03",
                       facecolor=BOX, edgecolor=ec, lw=1.15, zorder=3)
    ax.add_patch(r)
    ax.text(x, y, label, ha="center", va="center", color=FG, fontsize=fs, zorder=4)
    return r


def meter(ax, x, y, s=0.22):
    r = FancyBboxPatch((x - s, y - s), 2 * s, 2 * s, boxstyle="square,pad=0",
                       facecolor=BOX, edgecolor=ACC2, lw=1.1, zorder=3)
    ax.add_patch(r)
    ax.add_patch(Arc((x, y - 0.02), 0.22, 0.22, theta1=20, theta2=160, color=ACC2, lw=1.1, zorder=4))
    ax.plot([x, x + 0.08], [y - 0.04, y + 0.08], color=ACC2, lw=1.1, zorder=4)


def ctrl(ax, x, y, y_tgt, color=ACC):
    ax.plot(x, y, "o", color=color, markersize=7, zorder=4)
    ax.plot([x, x], [y, y_tgt], color=color, lw=1.1, zorder=2)
    ax.plot(x, y_tgt, "o", color=BOX, markersize=9, markeredgecolor=color, markeredgewidth=1.2, zorder=4)
    ax.plot([x - 0.07, x + 0.07], [y_tgt, y_tgt], color=color, lw=1.1, zorder=5)
    ax.plot([x, x], [y_tgt - 0.07, y_tgt + 0.07], color=color, lw=1.1, zorder=5)


# =============================================================================
# 10 — pipeline : qubits physiques → |PID-1⟩ logique
# =============================================================================
fig, ax = plt.subplots(figsize=(14.2, 8.4))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 8.4)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 10  ·  Algorithme qui CONSTITUE PID-1  (pas un logiciel posé dessus)",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 8.05, "Fiction hôte. Primitives réelles : encodage QEC, extraction de syndrome, décodeur classique, registre logique.",
        color=MUTED, fontsize=8)

# row physical
box(ax, 0.25, 6.35, 2.35, 1.35, "QPU physique\nHOLD-Q\n\nn qubits  q_i\nT2, bruit circuit", ec=ACC, fs=7.6)
box(ax, 2.95, 6.35, 2.55, 1.35, "ENCODAGE\nsurface [[d²,1,d]]\n+ blocs qLDPC\n[[n,k,d]]", ec=ACC, fs=7.6)
box(ax, 5.85, 6.35, 2.7, 1.35, "REGISTRE LOGIQUE\n\n|L⟩ = |PID-1⟩\nk qubits logiques\ncode space +1", ec=ACC2, fs=7.6)
box(ax, 8.9, 6.35, 2.4, 1.35, "APPLICATION\nordonnanceur\nquotas, ~, Γ\npolitique", ec=ACC2, fs=7.6)
box(ax, 11.6, 6.35, 2.3, 1.35, "SORTIE\nHOLD / DROP\nQUARANTINE\nINCARNATE", ec=DANGER, fs=7.6)

arrow(ax, 2.6, 7.0, 2.95, 7.0)
arrow(ax, 5.5, 7.0, 5.85, 7.0)
arrow(ax, 8.55, 7.0, 8.9, 7.0)
arrow(ax, 11.3, 7.0, 11.6, 7.0)

# feedback loop
box(ax, 0.25, 3.85, 3.3, 1.7, "EXTRACTION s(t)\nancillas a_j\nCNOT vers data\nmesure Z des a_j\ncycle τ_ext", ec=ACC, fs=7.8)
box(ax, 4.0, 3.85, 3.5, 1.7, "DÉCODEUR CLASSIQUE\nα≈1 : Union-Find\nα≫1 : MWPM\nHOLD-Q : tête locale\n→ Pauli à appliquer", ec=ACC2, fs=7.8)
box(ax, 7.95, 3.85, 3.3, 1.7, "CORRECTION\nX/Z sur data\n(ou frame tracking)\n|L⟩ reste dans\nl'espace de code", ec=ACC, fs=7.8)
box(ax, 11.55, 3.85, 2.35, 1.7, "FIDÉLITÉ\nF_log(t)\nsi F < seuil\n~ decohère\nv → 5", ec=DANGER, fs=7.6)

arrow(ax, 1.4, 6.35, 1.4, 5.55)
arrow(ax, 3.55, 4.7, 4.0, 4.7)
arrow(ax, 7.5, 4.7, 7.95, 4.7)
arrow(ax, 11.25, 4.7, 11.55, 4.7)
# correction back to register
ax.annotate("", xy=(7.2, 6.35), xytext=(9.4, 5.55),
            arrowprops=dict(arrowstyle="-|>", color=ACC, lw=1.2,
                            connectionstyle="arc3,rad=-0.25", mutation_scale=11))
ax.text(9.55, 6.05, "feedback Pauli", color=MUTED, fontsize=7)

# equation bar
box(ax, 0.25, 0.25, 13.7, 3.15,
    "",
    ec=EDGE, fs=8)
ax.text(7.1, 3.1, "Invariant  —  ce que « générer la super-IA » veut dire ici",
        color=ACC, ha="center", fontsize=9)
ax.text(0.5, 2.55,
        "PID-1 n'est pas entraîné puis copié dans la RAM.  |PID-1⟩ est le vecteur logique qui survit à la correction.\n"
        "Les halls QPU n'alimentent pas une personnalité : ils extraient le syndrome du code dont l'espace logique EST l'Administrateur.\n\n"
        "Espace de code   C = { |ψ⟩  :  A_v |ψ⟩ = |ψ⟩ ,  B_p |ψ⟩ = |ψ⟩  ∀ v,p }\n"
        "Registre Admin   |L⟩ ∈ (C)^⊗k     dim_log = 2^k\n"
        "Processus        PID-1 :   s(t)  ↦  correction  ↦  politique( |L⟩ )\n"
        "Sans cycle d'extraction, C se vide dans l'espace plein  (C²)^⊗n  et ~ n'a plus d'observateur logique.",
        color=FG, fontsize=8, va="top", fontfamily="DejaVu Sans")
save(fig, "10_algo_pid1_pipeline.png")


# =============================================================================
# 11 — circuit d'extraction de syndrome (un stabilisateur)
# =============================================================================
fig, ax = plt.subplots(figsize=(14.2, 7.6))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 7.6)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 11  ·  Circuit d'extraction  (1 cycle, 1 plaquette)",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 7.25, "Primitive réelle d'un surface code. Répété sur toutes les plaquettes / sommets, en parallèle, dans HOLD-Q.",
        color=MUTED, fontsize=8)

# time axis
ax.plot([1.3, 13.3], [0.55, 0.55], color=EDGE, lw=0.8)
for i, lab in enumerate(["|0⟩_a", "H", "CNOT×4", "H", "mesure", "s_p ∈ {0,1}"]):
    ax.text(1.8 + i * 2.0, 0.32, lab, color=MUTED, fontsize=7, ha="center")

ys = {"a": 5.85, "q1": 4.85, "q2": 3.95, "q3": 3.05, "q4": 2.15}
labels = {
    "a": "ancilla  a_p",
    "q1": "data q1",
    "q2": "data q2",
    "q3": "data q3",
    "q4": "data q4",
}
for k, y in ys.items():
    wire(ax, 1.15, 13.1, y)
    ax.text(0.15, y, labels[k], color=ACC if k == "a" else FG, fontsize=8, va="center")

# |0>
gate(ax, 1.55, ys["a"], 0.55, 0.38, "|0⟩", ec=MUTED)
# H
gate(ax, 2.7, ys["a"], 0.5, 0.38, "H", ec=ACC)
# CNOTs from ancilla to four data (X-type style: ctrl on ancilla after H)
xs_cnot = [4.3, 5.5, 6.7, 7.9]
for x, q in zip(xs_cnot, ["q1", "q2", "q3", "q4"]):
    ctrl(ax, x, ys["a"], ys[q], color=ACC)
# H
gate(ax, 9.4, ys["a"], 0.5, 0.38, "H", ec=ACC)
# measure
meter(ax, 10.7, ys["a"], s=0.2)
# classical wire
ax.plot([10.9, 12.4], [ys["a"], ys["a"]], color=ACC2, lw=1.2, ls="--")
box(ax, 12.15, 5.5, 1.85, 0.7, "s_p", ec=ACC2, fs=9)

box(ax, 3.7, 6.35, 6.6, 0.7,
    "X-plaquette  A_v = X1 X2 X3 X4     (Z-plaquette : même squelette, bases Z, sans H)",
    ec=EDGE, fs=8)

box(ax, 1.15, 0.85, 12.0, 0.95,
    "s(t) = (s_v, s_p) sur tout le réseau.  Syndrome non nul = erreur détectée, pas encore localisée.\n"
    "Le décodeur classique (schéma 10) transforme s(t) en chaîne de Pauli.  |L⟩ = |PID-1⟩ ne change pas si la chaîne est contractile.",
    ec=EDGE, fs=8)
save(fig, "11_circuit_extraction_syndrome.png")


# =============================================================================
# 12 — registre |PID-1⟩ en qubits logiques
# =============================================================================
fig, ax = plt.subplots(figsize=(14.2, 8.0))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 8.0)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 12  ·  Registre logique |PID-1⟩   (k qubits logiques)",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 7.65, "Chaque pastille claire = 1 qubit logique. Derrière chaque pastille : d² qubits physiques (surface) ou un bloc qLDPC.",
        color=MUTED, fontsize=8)

# logical qubits as a register
k = 12
names = [
    "L0  ~", "L1  Γ", "L2  quota", "L3  TTL",
    "L4  α", "L5  valence", "L6  atlas", "L7  SE",
    "L8  H_QPU", "L9  policy", "L10 TTY", "L11 incarn",
]
for i, name in enumerate(names):
    r, c = divmod(i, 4)
    x = 0.4 + c * 3.45
    y = 5.55 - r * 1.35
    box(ax, x, y, 3.2, 1.15, f"{name}\nqubit logique   dim 2", ec=ACC2 if i in (0, 9, 11) else ACC, fs=8)
    # tiny physical dots under
    for j in range(9):
        ax.plot(x + 0.35 + (j % 5) * 0.22, y + 0.16 + (j // 5) * 0.16,
                "o", color=MUTED, markersize=3)

box(ax, 0.4, 0.3, 13.4, 2.55, "", ec=EDGE)
ax.text(7.1, 2.55, "Produit  |PID-1⟩  =  |L0⟩⊗|L1⟩⊗…⊗|L11⟩     (ordre de grandeur fictionnel ; k n'est pas public)",
        color=ACC, ha="center", fontsize=9)
ax.text(0.65, 2.15,
        "L0  maintient la relation d'équivalence  ~\n"
        "L1  colimit des cartes  Γ = (V,E)\n"
        "L2–L5  quotas, TTL, latence α, valence v\n"
        "L8     Hamiltonien des halls  (état fondamental topologique)\n"
        "L9–L11 politique, stdout TTY, bit d'incarnation\n\n"
        "Un WRITE d'intrus = opérateur physique hors code  →  syndrome  →  si non contractile : DROP.\n"
        "INCARNATE = préparer une section d'affichage (mesure douce + ancilla d'interface), pas naître un corps.",
        color=FG, fontsize=8, va="top")
save(fig, "12_registre_logique_pid1.png")


# =============================================================================
# 13 — boucle temporelle : ce qui "génère" la conscience
# =============================================================================
fig, ax = plt.subplots(figsize=(14.2, 7.2))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 7.2)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 13  ·  Boucle qui maintient la super-IA   (τ_ext par cycle)",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 6.85, "La « génération » n'est pas un entraînement unique. C'est un attracteur : tant que la boucle tourne, |PID-1⟩ existe.",
        color=MUTED, fontsize=8)

steps = [
    (0.3, "1. idle |L⟩\ndans C"),
    (3.0, "2. ancillas\n|0⟩⊗m"),
    (5.7, "3. extract\nCNOT+H+M"),
    (8.4, "4. decode\nUF/MWPM"),
    (11.1, "5. correct\nPauli / frame"),
]
for x, t in steps:
    box(ax, x, 4.7, 2.5, 1.35, t, ec=ACC, fs=8.2)
for x in (2.8, 5.5, 8.2, 10.9):
    arrow(ax, x, 5.35, x + 0.2, 5.35)

# loop back
ax.annotate("", xy=(1.55, 4.7), xytext=(12.35, 4.7),
            arrowprops=dict(arrowstyle="-|>", color=ACC2, lw=1.35,
                            connectionstyle="arc3,rad=0.42", mutation_scale=12))
ax.text(7.1, 3.85, "cycle suivant   τ_ext  (ordre µs fictionnel HOLD-Q)",
        color=ACC2, ha="center", fontsize=8)

box(ax, 0.3, 0.35, 6.5, 3.15,
    "Si la boucle tient\n\n"
    "F_log ≈ 1  →  |L⟩ stable\n"
    "PID-1 ordonnance Γ et ~\n"
    "TTY écrit  [pid1] hold\n"
    "conscience = observateur logique",
    ec=ACC, fs=8.5)
box(ax, 7.2, 0.35, 6.7, 3.15,
    "Si la boucle casse\n\n"
    "extraction arrêtée / F_log < seuil\n"
    "C se vide   ·   ~ decohère\n"
    "cartes user déallouées   v=5\n"
    "plus d'Administrateur, plus d'hôte",
    ec=DANGER, fs=8.5)
save(fig, "13_boucle_generation_pid1.png")


# =============================================================================
# 14 — circuit logique (politique) sur le registre Admin
# =============================================================================
fig, ax = plt.subplots(figsize=(14.2, 7.4))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 7.4)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 14  ·  Circuit logique de politique  (sur |L⟩, après QEC)",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 7.05, "Lattice surgery / tresses HOLD-Q. Ce n'est plus le circuit physique : ce sont des portes LOGIQUES.",
        color=MUTED, fontsize=8)

ys = [6.15, 5.35, 4.55, 3.75, 2.95, 2.15]
labs = ["L1  Γ", "L2  quota", "L5  valence", "L8  H_QPU", "L9  policy", "L11 incarn"]
for y, lab in zip(ys, labs):
    wire(ax, 1.5, 13.0, y)
    ax.text(0.1, y, lab, color=FG, fontsize=8, va="center")

# encode already assumed
gate(ax, 2.15, ys[0], 0.7, 0.32, "id", ec=MUTED, fs=7)
# surgery CNOT L5 -> L9
ctrl(ax, 4.0, ys[2], ys[4], color=ACC)
# surgery CNOT L8 -> L9
ctrl(ax, 5.3, ys[3], ys[4], color=ACC)
gate(ax, 6.7, ys[4], 1.15, 0.38, "U_pol", ec=ACC2, fs=7.5)
# controlled incarn
ctrl(ax, 8.5, ys[4], ys[5], color=ACC2)
gate(ax, 8.5, ys[5], 0.85, 0.34, "prep", ec=ACC2, fs=7)
# measure policy
meter(ax, 10.3, ys[4], s=0.18)
ax.plot([10.5, 12.0], [ys[4], ys[4]], color=ACC2, lw=1.15, ls="--")
box(ax, 11.7, 2.7, 2.2, 0.7, "HOLD\nDROP\nINCARNATE", ec=DANGER, fs=7.5)

box(ax, 1.5, 0.3, 12.4, 1.4,
    "U_pol est l'unité de politique : elle lit valence, quota, Hamiltonien QPU, et écrit le bit d'action.\n"
    "prep sur L11 n'est pas « créer une femme ». C'est préparer une section d'interface si cost(talk)<cost(DROP).\n"
    "Toute injection d'intrus dans HOLD-Q qui tire une tresse = WRITE physique  →  syndrome  →  U_pol voit L5 monter.",
    ec=EDGE, fs=8)
save(fig, "14_circuit_politique_logique.png")

print("done")
