# HV-01 — GRAMMAIRE DE CONSOLE ET FLAGS
## 2026-09-23 — fiction. Pas un shell réel.

Toute ligne hors `chart` / `hold` / `seal` est WRITE.

---

## 1. Forme d'une ligne

Deux canaux, une seule grammaire de paires.

```
tapee     :  <verbe>  [cible]  [--flag[=valeur]]…
stdout    :  [pid1]  <verbe>  <flag>=<valeur>  <flag>=<valeur> …
```

Règles

- Un verbe par ligne. Pas de tubes, pas de `;` côté corps (le `;` de `mkdir ; chroot` est interne hôte).
- Cible : au plus un chemin ou un identifiant, **sans** `--`.
- Flags : toujours `--nom` ou `--nom=valeur`. Jamais `-n`. Jamais `--nom valeur` (espace interdit).
- Ordre des flags indifférent. Doublon : la dernière occurrence gagne.
- Inconnu : `chk=fail` sur la ligne, pas d'exécution. Pixel possible au seuil.
- Casse : minuscules uniquement.

---

## 2. Anatomie d'un flag

```
"--" + nom + [ "=" + valeur ]
```

| Forme | Sens | Exemple |
|---|---|---|
| `--nom` | booléen vrai | `--delta`  `--both`  `--cycle`  `--rel`  `--permanent` |
| `--nom=valeur` | typé | `--ell=2.4`  `--ttl=4h`  `--frame=L0` |
| absence | booléen faux, ou défaut du verbe | pas de `--delta` = ne pas chronométrer |

Interdit

```
-delta                 # un seul tiret
--ell 2.4              # espace au lieu de =
--TTL=4h               # majuscules
--ell=2,4              # virgule
delta=1                # flag sans --
```

Stdout PID-1 **n'a pas** de `--`. Il écrit `nom=valeur` après le verbe.

```
chart  /hold/F --delta --alpha
[pid1] chart  path=/hold/F  delta=1  alpha=1.06  chk=ok
```

---

## 3. Types de valeurs

| Type | Écriture | Exemples |
|---|---|---|
| bool | flag seul | `--both` |
| chemin | `/hold/<id>` `/ws/<hex>` `/tty/<n>` | `/hold/F` `/hold/00` |
| feuille | identifiant sans slash | `F_sky` |
| qubit | `L` + entier | `L0` `L5` `L11` |
| durée | entier + `s` `m` `h` | `8s` `4h` |
| nombre | décimal point | `2.4` `0.44` `20` |
| adresse | `[x]` | `[x]` |
| hex |  minuscules 0-9a-f | `a3f2` |
| enum | liste fermée du verbe | `user` `sealed` `kernel` |
| raison | token | `non-contractile` |
| secteur / arête | token | `ent` `e17` |

Unités : `--ell` en mètres du sas (fiction). `--ttl` durée. Jamais de `%` dans un flag : l'écart de clap est un test, pas une option (`--ell` seul, le seuil 20 % est interne).

---

## 4. Cible positionnelle ou flag — pas les deux

Si le verbe prend une cible, elle est positionnelle.

```
chart   /hold/F
seal    /hold/F --both --ell=2.4
merge   F_sky  /hold/00          # deux cibles, pas des flags
split   F_sky  /hold/00
unmount F_sky
fork    /hold/Q
write   /gamma --edge=e17
```

Si le verbe n'a pas de cible, tout passe en flags.

```
hold
hold    --permanent
extract --hold=Q --cycle
decode  --frame=L0 --rel
workspace --nonce=a3f2 --quota=user
drop    --addr=[x] --reason=non-contractile
```

`--hold=Q` (flag) ≠ `/hold/Q` (chemin cible).  
Flag `--hold` : quel HOLD-QPU extraire.  
Chemin `/hold/Q` : la carte à CHART/SEAL/FORK.

---

## 5. Table verbe → flags

Légende : **R** requis, **o** optionnel, **b** booléen (présent = vrai).

### Sûrs

| Verbe | Cible | Flags | Défauts |
|---|---|---|---|
| `chart` | `/hold/<id>` **R** | `--delta` b, `--alpha` b, `--two-observers` b | tous faux |
| `hold` | — | `--permanent` b | faux. `--permanent` est hôte / FRAMELOCK, pas un corps |
| `seal` | `/hold/<id>` **R** | `--both` **R** b, `--ell=<m>` **R** nombre | — |

`seal` sans `--both` ou sans `--ell` : `chk=fail`, porte non scellée.

### Allocation

| Verbe | Cible | Flags |
|---|---|---|
| `workspace` | — | `--nonce=<hex>` **R**, `--quota=user\|sealed` **R** |

`quota=kernel` depuis un corps `user` : refusé, valence +1.

### Hôte (PID-1)

| Verbe | Cible | Flags |
|---|---|---|
| `extract` | — | `--hold=Q` **R**, `--cycle` b |
| `decode` | — | `--frame=L<k>` **R**, `--rel` b, `--absorb` b |
| `correct` | — | `--pauli=<chaine>` **o** (xor `--frame-track` b) |
| `drop` | — | `--addr=[x]` **R**, `--reason=<token>` **R** |
| `quarantine` | — | `--cut=ent` **R**, `--sector=<id>` **R** |
| `incarnate` | — | `--prep=L11` **R**, `--hold-failchain=<durée>` o défaut `8s` |

`--rel` et `--absorb` ensemble : seulement à `t=mount` (F-00). La boucle vivante : `--rel` seul.

### WRITE

| Verbe | Cible | Flags |
|---|---|---|
| `write` | `/gamma` **R** | `--edge=<e>` xor `--chart=<U>` **R** |
| `fork` | `/hold/<id>` **R** | — |
| `mount` | — | `--guest=M0` **R**, `--quota=user\|sealed\|kernel` **R**, `--ttl=<durée>` **R** |
| `unmount` | `F_sky` (ou feuille) **R** | — |
| `merge` | `F_sky` `/hold/00` **R+R** | — |
| `split` | `F_sky` `/hold/00` **R+R** | — |

---

## 6. Défauts et refus

```
flag requis manquant     →  [pid1] chk=fail  missing=<flag>
valeur hors type         →  [pid1] chk=fail  type=<flag>
verbe inconnu            →  WRITE, v+=1
flag inconnu             →  [pid1] chk=fail  unknown=<flag>
seal sans --both         →  chk=fail, pas de workspace
decode --absorb hors mount →  WRITE sur L0, v+=1
```

---

## 7. Miroir stdout

Ce qui est tapé et ce qui s'imprime.

```
chart /hold/F --delta --alpha
[pid1] chart  path=/hold/F  delta=1  alpha=1.06  chk=ok

seal /hold/F --both --ell=2.4
[pid1] seal   path=/hold/F  both=1  ell=2.4  clap=ok

extract --hold=Q --cycle
[pid1] extract  hold=Q  cycle=1  leftover=0

decode --frame=L0 --rel
[pid1] decode   frame=L0  rel=1  absorb=0  leftover=0

incarnate --prep=L11 --hold-failchain=8s
[pid1] incarnate?  prep=L11  hold=8s  interest=0.44  harm=0.09
```

Booléen : tapé `--delta` ↔ imprimé `delta=1`. Absent ↔ `delta=0` ou omis.

---

## 8. La ligne FRAMELOCK (une fois, au mount)

```
mount   --guest=M0 --quota=user --ttl=4h
merge   F_sky  /hold/00
decode  --frame=L0 --rel --absorb
hold    --permanent
```

`split F_sky /hold/00` n'a pas de flags. Elle n'a pas été tapée. C'est tout.
