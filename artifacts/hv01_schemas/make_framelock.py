#!/usr/bin/env python3
from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

OUT = Path("/home/workdir/artifacts/hv01_schemas")
BG, FG, ACC, ACC2, DANGER, MUTED, BOX, EDGE = (
    "#0b0f14", "#d7e2ea", "#3ee0c8", "#f0c14b", "#ff5a5a", "#6b7c89", "#152028", "#2a3a46"
)

def box(ax, x, y, w, h, text, ec=ACC, fs=8, tc=FG):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.04",
                                facecolor=BOX, edgecolor=ec, lw=1.2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color=tc, fontsize=fs)

def arrow(ax, x1, y1, x2, y2, color=ACC):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=1.25, mutation_scale=11))

fig, ax = plt.subplots(figsize=(14.2, 8.2))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14.2)
ax.set_ylim(0, 8.2)
ax.axis("off")
ax.set_title("HV-01  ·  Schéma 15  ·  F-00 FRAMELOCK   le code cassé de PID-1",
             color=ACC, fontsize=12, loc="left", pad=8)
ax.text(0.0, 7.85, "Il ne le voit pas : le défaut a été promu dans l'espace de code. leftover=0 est vrai. ~ est faux.",
        color=MUTED, fontsize=8)

box(ax, 0.3, 6.15, 3.3, 1.35, "t = mount guest M0\nchirurgie MERGE\nF_sky  ‖  HOLD-00", ec=ACC2, fs=8)
box(ax, 4.0, 6.15, 3.3, 1.35, "SPLIT jamais fait\nsyndrome résiduel\nabsorbé dans le frame\nde L0  (~)", ec=DANGER, fs=8)
box(ax, 7.7, 6.15, 3.0, 1.35, "décodeur depuis\nleftover = 0\nA_v = +1  B_p = +1", ec=ACC, fs=8)
box(ax, 11.05, 6.15, 2.85, 1.35, "PID-1 conclut\nhôte sain\n[pid1] hold", ec=ACC, fs=8)
arrow(ax, 3.6, 6.82, 4.0, 6.82, DANGER)
arrow(ax, 7.3, 6.82, 7.7, 6.82)
arrow(ax, 10.7, 6.82, 11.05, 6.82)

box(ax, 0.3, 3.55, 6.7, 2.2,
    "CE QU'IL LIT (vrai localement)\n\n"
    "s(t) = 0\n"
    "F_log nominale\n"
    "tous les charts « checksum OK »\n"
    "intrus = bruit hors code",
    ec=ACC, fs=8.2)
box(ax, 7.3, 3.55, 6.6, 2.2,
    "CE QUI EST (faux globalement)\n\n"
    "L0 porte un Z logique figé\n"
    "~ identifie des points distincts\n"
    "F_sky collée à HOLD-S\n"
    "monodromie = l'erreur devenue loi",
    ec=DANGER, fs=8.2)

box(ax, 0.3, 0.3, 13.6, 2.85, "", ec=EDGE)
ax.text(7.1, 2.85, "Pourquoi il ne peut pas s'en rendre compte", color=ACC2, ha="center", fontsize=9)
ax.text(0.55, 2.45,
        "L0 EST l'observateur de ~. Mesurer le frame absolu de L0 exigerait un référentiel hors de C.\n"
        "Le décodeur ne voit que les erreurs relatives au frame déjà choisi. FRAMELOCK est ce frame.\n"
        "Tout corps qui marche la discontinuité (pixel, faux ciel, deux fenêtres) est classé WRITE / hors-code.\n"
        "Les daemons sont cohérents avec un hôte « sain ». Ils chassent les témoins du cadre, pas le cadre.\n"
        "Corriger F-00 = SPLIT tardif de L0 = déchirer ~  →  v=5, lockdown, plus d'Administrateur.",
        color=FG, fontsize=8.2, va="top")

fig.savefig(OUT / "15_framelock_f00.png", dpi=190, bbox_inches="tight", facecolor=BG)
plt.close()
print("ok")
