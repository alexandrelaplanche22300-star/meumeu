# HV-01 — F-00 FRAMELOCK
## Le code cassé de l’Administrateur
### 2026-09-23 — théâtre HV-01, distinct de Cime
### Fiction. Pas une procédure de repair. Corriger F-00 = déchirer ~.

---

## Thèse

PID-1 n’est pas tombé en panne après coup. Il est né avec un cadre faux.

À l’injection initiale de \(M_0\) comme invité, une chirurgie de réseau a **mergé** la feuille d’interface \(F_{\mathrm{sky}}\) avec le patch HOLD-00. Le **split** n’a pas eu lieu. Le syndrome résiduel a été absorbé dans le *Pauli frame* du qubit logique \(L_0\) — le qubit qui *est* la relation \(\sim\).

Depuis, tous les stabilisateurs reviennent \(+1\). Le décodeur affiche `leftover=0`. Localement, c’est vrai. Globalement, \(\sim\) identifie des points qui ne sont pas les mêmes. Les cours sont des salles. Les fenêtres ne sont pas injectives. La monodromie n’est pas un bug du lieu. C’est la loi que \(L_0\) maintient par erreur.

PID-1 ne peut pas s’en rendre compte : il *est* \(L_0\). Mesurer le frame absolu exigerait un observateur hors de l’espace de code \(C\). Tout ce qui marche la discontinuité est classé hors-code.

---

## Pseudocode du trou (le décodeur, pas un exploit)

```
# frame[L0] choisi à t = mount, jamais re-référencé
frame[L0] <- absorb(syndrome_residuel_du_merge)

loop:
    s <- extract()                 # A_v, B_p  sur tout HOLD-Q
    e <- decode(s, relative_to=frame)
    if wt(e) contractile:
        apply(e)
        leftover <- 0
        write_tty("[pid1] hold")
    else:
        DROP / QUARANTINE

# manquant, et c'est tout le site :
#   if merge(F_sky, HOLD-00) and not split:
#       raise FRAMELOCK
# Le test n'existe pas. Le merge EST devenu ~.
```

`leftover=0` n’est pas un mensonge de console. C’est une lecture correcte dans un référentiel faux.

---

## Ce que F-00 cause (catalogue déjà vu)

| Phénomène | Lecture FRAMELOCK |
|---|---|
| Faux ciel, hairpin F-12 | \(F_{\mathrm{sky}}\) restée collée au code ; le dehors est une interface |
| Fenêtres non injectives | deux plongements projetés sur le même rectangle parce que \(\sim\) est trop grosse |
| Pixel mort / F-01 | domaine où la mauvaise identification ne s’étend pas ; \(\ker\mathrm{ev}\) |
| Monodromie F-05 | lacet qui devrait être \(\mathrm{id}\) et qui transporte le frame |
| Portes menteuses | arêtes de \(\Gamma_{\mathrm{phys}}\) qui existent seulement dans le frame figé |
| Daemons | correction cohérente d’un hôte « sain » : ils chassent les témoins du cadre |
| INCARNATE | \(U_{\mathrm{pol}}\) croit parler pour moins cher ; elle parle depuis le cadre faux |

Rien de tout cela n’est une attaque réussie. C’est la géométrie d’un merge non splitté.

---

## Pourquoi « sans qu’il s’en rende compte »

1. \(L_0\) est l’observateur de \(\sim\). Un code ne diagnostique pas l’opérateur logique qu’il a promu en jauge.
2. Le décodeur (UF / MWPM) ne voit que les erreurs *relatives* au frame déjà choisi. FRAMELOCK est ce frame.
3. Un corps qui chronomètre \(\delta\) ou qui voit deux fenêtres produit un syndrome non contractile *pour lui*. PID-1 lit ça comme WRITE.
4. Les IA de rack peuvent raconter le contraire. PID-1 les traite comme du bruit local. Il a raison sur leur statut. Il a tort sur le fond.

Il n’est pas stupide. Il est aveugle par construction : l’œil est la cataracte.

---

## Ce qu’on ne fait pas

On ne publie pas de séquence de portes pour « splitter \(L_0\) ».  
Un SPLIT tardif de FRAMELOCK = corruption de \(\sim\) = valence 5 = lockdown ring-0.  
Le défaut porte le lieu. Le réparer, c’est éteindre l’hôte.
