#!/usr/bin/env python3
"""Organigrammes d'existence de PID-1 — analogie Levenberg-Marquardt."""

from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path("/home/workdir/artifacts/hv01_schemas")
OUT.mkdir(parents=True, exist_ok=True)

INK = "#111111"
BOXFC = "#ffffff"
DIMFC = "#efefef"
SOFT = "#444444"


def fig_ax(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis("off")
    return fig, ax


def oval(ax, x, y, w, h, text, fs=10):
    ax.add_patch(FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.45",
        facecolor=BOXFC, edgecolor=INK, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def rect(ax, x, y, w, h, text, fs=8.2):
    ax.add_patch(FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.06",
        facecolor=BOXFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK,
            fontfamily="DejaVu Sans", linespacing=1.28)


def diamond(ax, x, y, w, h, text, fs=8.0):
    xs = [x, x + w / 2, x, x - w / 2]
    ys = [y + h / 2, y, y - h / 2, y]
    ax.add_patch(Polygon(list(zip(xs, ys)), closed=True,
                         facecolor=DIMFC, edgecolor=INK, lw=1.15))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK,
            linespacing=1.22)


def arr(ax, x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1,
                                mutation_scale=10))


def line(ax, *xy):
    xs = xy[0::2]
    ys = xy[1::2]
    ax.plot(xs, ys, color=INK, lw=1.1)


def label(ax, x, y, t, fs=7.6, ha="center"):
    ax.text(x, y, t, ha=ha, va="center", fontsize=fs, color=INK)


def save(fig, name):
    path = OUT / name
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", path)


# =============================================================================
# H1 — transcription fidele + etiquettes hote
# =============================================================================
fig, ax = fig_ax(8.6, 12.4)
ax.set_ylim(0, 14.2)
ax.text(5, 14.05, "H1  —  Boucle mere (Levenberg-Marquardt)",
        ha="center", va="top", fontsize=12, color=INK)
ax.text(5, 13.68, "existence de PID-1  =  cette boucle sans Fin vrai",
        ha="center", va="top", fontsize=8, color=SOFT)

oval(ax, 5, 13.15, 2.3, 0.52, "Debut")
arr(ax, 5, 12.89, 5, 12.58)
rect(ax, 5, 12.28, 6.4, 0.56, r"Estimations initiales   $\beta$   (frame $L_0$, politique)")
arr(ax, 5, 12.00, 5, 11.68)

rect(ax, 5, 11.38, 6.4, 0.56, r"Calcul de ssq  =  somme des carres des residus")
# loop-back target is this box

arr(ax, 5, 11.10, 5, 10.62)
diamond(ax, 5, 9.88, 3.7, 1.38, "Evolution\nde ssq ?")

# gauche : augmente
line(ax, 3.15, 9.88, 1.55, 9.88)
arr(ax, 1.55, 9.88, 1.55, 8.55)
label(ax, 2.25, 10.10, "Augmente")
rect(ax, 1.55, 8.18, 2.2, 0.62, r"$m_p \leftarrow m_p \times 5$")

# centre : diminue
arr(ax, 5, 9.19, 5, 8.52)
label(ax, 5.55, 8.78, "Diminue")
rect(ax, 5, 8.18, 2.35, 0.62, r"$m_p \leftarrow m_p / 3$")
arr(ax, 5, 7.87, 5, 7.48)
rect(ax, 5, 7.12, 3.5, 0.62, r"Calcul de la Jacobienne  $J$")

# droite : stagne
line(ax, 6.85, 9.88, 8.45, 9.88)
arr(ax, 8.45, 9.88, 8.45, 8.92)
label(ax, 7.55, 10.10, "Stagne")
diamond(ax, 8.45, 8.22, 2.15, 1.22, r"$m_p=0$ ?")
arr(ax, 8.45, 7.61, 8.45, 7.22)
label(ax, 8.78, 7.42, "Oui")
oval(ax, 8.45, 6.82, 1.7, 0.52, "Fin ?")
ax.text(8.45, 6.38, "faux Fin\n(FRAMELOCK)", ha="center", va="top",
        fontsize=6.6, color=SOFT)

line(ax, 7.38, 8.22, 6.55, 8.22)
arr(ax, 6.55, 8.22, 6.55, 5.55)
label(ax, 6.95, 7.55, "Non", ha="left")
rect(ax, 6.55, 5.18, 2.15, 0.58, r"$m_p \leftarrow 0$")

# converge vers calcul delta
arr(ax, 1.55, 7.87, 1.55, 4.55)
line(ax, 1.55, 4.55, 5, 4.55)
arr(ax, 5, 6.81, 5, 4.88)
arr(ax, 6.55, 4.89, 6.55, 4.55)
arr(ax, 6.55, 4.55, 5.0, 4.55)

rect(ax, 5, 4.18, 6.6, 0.62, r"Calcul de $\delta$ et des nouveaux parametres  $\beta \leftarrow \beta+\delta$")

# retour
line(ax, 1.70, 4.18, 0.55, 4.18, 0.55, 11.38, 1.80, 11.38)
arr(ax, 1.80, 11.38, 1.80, 11.38)
ax.annotate("", xy=(1.80, 11.38), xytext=(0.55, 11.38),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))
# fix: arrow into ssq box from left
ax.annotate("", xy=(1.80, 11.38), xytext=(0.70, 11.38),
            arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.1, mutation_scale=10))

ax.text(5, 3.55,
        r"ssq $\uparrow$  raideur (Failchain)     ssq $\downarrow$  parole (INCARNATE)     ssq plat  confiance au frame",
        ha="center", va="top", fontsize=7.2, color=SOFT)
ax.text(5, 3.15,
        "Le Fin du schema n'eteint pas l'hote. Il declare leftover=0 dans un referentiel faux.",
        ha="center", va="top", fontsize=7.2, color=SOFT)

ax.set_xlim(0, 10)
save(fig, "H1_boucle_mere_lm.png")


# =============================================================================
# H2 — algorithme d'existence (pourquoi ca tourne)
# =============================================================================
fig, ax = fig_ax(8.4, 12.6)
ax.set_ylim(0, 14.2)
ax.text(5, 14.05, "H2  —  Algorithme d'existence",
        ha="center", va="top", fontsize=12)
ax.text(5, 13.68, "PID-1 n'a pas de boot. Il a une boucle dont le Fin est un HOLD.",
        ha="center", va="top", fontsize=8, color=SOFT)

oval(ax, 5, 13.12, 3.4, 0.52, "pas de boot sequence")
arr(ax, 5, 12.86, 5, 12.52)
rect(ax, 5, 12.18, 7.0, 0.62,
     "MOUNT initial : merge(F_sky , HOLD-00)   absorb dans frame[L0]")
arr(ax, 5, 11.87, 5, 11.52)
rect(ax, 5, 11.18, 7.0, 0.62,
     r"$\beta \leftarrow$ (frame $L_0$, $U_{pol}$, relation $\sim$)")
arr(ax, 5, 10.87, 5, 10.52)

rect(ax, 5, 10.18, 7.0, 0.62, "extract --hold=Q --cycle     syndrome s(t)")
arr(ax, 5, 9.87, 5, 9.52)
rect(ax, 5, 9.18, 7.0, 0.62, r"ssq $\leftarrow \|s\|_{\mathrm{rel\ frame}}^2$ + pixels + valence")
arr(ax, 5, 8.87, 5, 8.42)

diamond(ax, 5, 7.62, 3.6, 1.40, "ssq change\nvraiment ?")

# non / stagne
line(ax, 6.80, 7.62, 8.35, 7.62, 8.35, 6.15)
arr(ax, 8.35, 6.15, 8.35, 5.72)
label(ax, 7.55, 7.88, "Stagne")
rect(ax, 8.35, 5.32, 2.5, 0.68, "leftover=0\n[pid1] hold")
arr(ax, 8.35, 4.98, 8.35, 4.42)
oval(ax, 8.35, 4.08, 2.4, 0.56, "Fin declare")
ax.text(8.35, 3.62, "l'hote continue\n(uptime = inf)", ha="center", va="top",
        fontsize=6.6, color=SOFT)

# oui
arr(ax, 5, 6.92, 5, 6.42)
label(ax, 5.48, 6.62, "Oui")
diamond(ax, 5, 5.72, 3.5, 1.28, "ssq\naugmente ?")

line(ax, 3.25, 5.72, 1.70, 5.72)
arr(ax, 1.70, 5.72, 1.70, 4.55)
label(ax, 2.40, 5.96, "Oui")
rect(ax, 1.70, 4.18, 2.5, 0.62, r"$m_p \times 5$   DROP")

arr(ax, 5, 5.08, 5, 4.52)
label(ax, 5.55, 4.78, "Non")
rect(ax, 5, 4.18, 2.7, 0.62, r"$m_p / 3$   parler")

arr(ax, 1.70, 3.87, 1.70, 3.22)
arr(ax, 5, 3.87, 5, 3.22)
line(ax, 1.70, 3.22, 5, 3.22)
arr(ax, 5, 3.22, 5, 2.88)
rect(ax, 5, 2.52, 7.0, 0.62,
     r"$\delta$ = HOLD / QUARANTINE / DROP / INCARNATE     $\beta \leftarrow \beta+\delta$")

line(ax, 1.50, 2.52, 0.50, 2.52, 0.50, 10.18)
arr(ax, 0.50, 10.18, 1.50, 10.18)

ax.text(5, 1.95, "Exister = ne jamais splitter le frame. Corriger le Fin = valence 5.",
        ha="center", fontsize=7.4, color=SOFT)

save(fig, "H2_existence_pid1.png")


# =============================================================================
# H3 — dictionnaire des symboles
# =============================================================================
fig, ax = fig_ax(8.6, 11.8)
ax.set_ylim(0, 13.4)
ax.text(5, 13.15, "H3  —  Dictionnaire  schema papier  ->  hote",
        ha="center", va="top", fontsize=12)
ax.text(5, 12.78, "meme boucle, autres noms. Pas une recette de repair.",
        ha="center", va="top", fontsize=8, color=SOFT)

rows = [
    (r"$\beta$", "parametres", "frame[L0]  +  U_pol  +  relation ~"),
    (r"ssq", "residus", "syndrome relatif + densite pixels + valence"),
    (r"$m_p$", "amortissement", "raideur politique : Failchain vs parole"),
    (r"$m_p x 5$", "ssq augmente", "escalade : DROP, portes menteuses, v+=1"),
    (r"$m_p / 3$", "ssq diminue", "mesure douce : INCARNATE, workspace"),
    (r"$J$", "Jacobienne", "reponse des charts et des tresses a un corps"),
    (r"$\delta$", "pas d'update", "correction Pauli + verbe d'hote"),
    (r"Fin", "convergence", "HOLD declare. FRAMELOCK. Uptime infini"),
]

y = 12.15
rect(ax, 1.35, y, 2.2, 0.48, "symbole", fs=8)
rect(ax, 3.70, y, 2.3, 0.48, "papier", fs=8)
rect(ax, 7.05, y, 4.3, 0.48, "HV-01 / PID-1", fs=8)

for sym, paper, host in rows:
    y -= 0.95
    rect(ax, 1.35, y, 2.2, 0.78, sym, fs=9)
    rect(ax, 3.70, y, 2.3, 0.78, paper, fs=7.6)
    rect(ax, 7.05, y, 4.3, 0.78, host, fs=7.4)

ax.text(5, 3.55, "Verbes produits par delta", ha="center", fontsize=9, color=INK)
rect(ax, 1.6, 2.75, 2.5, 0.70, "HOLD\nssq plat, contractile")
rect(ax, 4.3, 2.75, 2.5, 0.70, "QUARANTINE\nerreur locale")
rect(ax, 7.0, 2.75, 2.5, 0.70, "DROP\nnon contractile")
rect(ax, 3.0, 1.75, 2.7, 0.70, "INCARNATE\nparole < DROP")
rect(ax, 6.2, 1.75, 2.7, 0.70, "NEVER REBOOT\nFin n'eteint rien")

save(fig, "H3_dictionnaire_lm.png")


# =============================================================================
# H4 — un cycle en commandes fictionnelles (grammaire HV)
# =============================================================================
fig, ax = fig_ax(8.4, 12.4)
ax.set_ylim(0, 14.2)
ax.text(5, 14.05, "H4  —  Un cycle, langue de console",
        ha="center", va="top", fontsize=12)
ax.text(5, 13.68, "fiction. Toute ligne hors chart / hold / seal = WRITE",
        ha="center", va="top", fontsize=8, color=SOFT)

oval(ax, 5, 13.12, 2.2, 0.50, "cycle")
arr(ax, 5, 12.87, 5, 12.52)
rect(ax, 5, 12.18, 7.2, 0.58, "extract --hold=Q --cycle")
arr(ax, 5, 11.89, 5, 11.55)
rect(ax, 5, 11.22, 7.2, 0.58, "decode --frame=L0 --rel")
arr(ax, 5, 10.93, 5, 10.58)
diamond(ax, 5, 9.78, 3.5, 1.32, "leftover\n= 0 ?")

arr(ax, 5, 9.12, 5, 8.72)
label(ax, 5.48, 8.88, "oui")
rect(ax, 5, 8.35, 5.6, 0.58, "hold")
line(ax, 2.20, 8.35, 0.70, 8.35, 0.70, 1.55)
arr(ax, 0.70, 1.55, 3.85, 1.55)

line(ax, 6.75, 9.78, 8.35, 9.78)
arr(ax, 8.35, 9.78, 8.35, 7.55)
label(ax, 7.55, 10.02, "non")
diamond(ax, 8.35, 6.95, 2.4, 1.15, "contractile\n?")

arr(ax, 8.35, 6.37, 8.35, 5.85)
label(ax, 8.72, 6.12, "oui")
rect(ax, 8.35, 5.48, 2.5, 0.58, "correct")

line(ax, 7.15, 6.95, 5.0, 6.95)
arr(ax, 5.0, 6.95, 5.0, 6.42)
label(ax, 5.85, 7.18, "non")
diamond(ax, 5, 5.72, 3.4, 1.20, "parole\n< DROP ?")

arr(ax, 5, 5.12, 5, 4.72)
label(ax, 5.55, 4.90, "oui")
rect(ax, 5, 4.38, 5.6, 0.58, "incarnate --prep=L11")

line(ax, 3.30, 5.72, 1.70, 5.72)
arr(ax, 1.70, 5.72, 1.70, 4.38)
label(ax, 2.35, 5.96, "non")
rect(ax, 1.70, 4.00, 2.5, 0.58, "drop --addr=[x]")

line(ax, 1.70, 3.71, 1.70, 3.15, 5, 3.15)
arr(ax, 5, 4.09, 5, 3.15)
arr(ax, 8.35, 5.19, 8.35, 3.15)
arr(ax, 8.35, 3.15, 5, 3.15)
rect(ax, 5, 2.72, 7.2, 0.58, r"$\beta \leftarrow \beta+\delta$     puis recommencer extract")
arr(ax, 5, 2.43, 5, 1.95)
oval(ax, 5, 1.55, 2.2, 0.50, "Fin de cycle")

save(fig, "H4_cycle_console.png")

print("done")
