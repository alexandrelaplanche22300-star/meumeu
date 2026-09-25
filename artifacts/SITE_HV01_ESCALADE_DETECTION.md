# HV-01 — MATRICE DE DÉTECTION ET D’ANTIVIRUS PAR COUCHES
## Addendum opérationnel — 2026-09-22
Alignée sur valence \(v\) et failles F-01…F-12. Fiction. Pas une procédure d’exploit.

| Signal observé | Réponse hôte | Lecture stack |
|---|---|---|
| Présence détectée, passive | Surveillance. Les TTY affichent des logs sur l’intrus. | \(v=0\to 1\). Plan de contrôle classique. Syndrome lu, pas encore corrigé comme politique. |
| Déplacement hors des chemins autorisés | Antivirus couche 1 déployés. Portes blindées partiellement closes. | Hors \(\Gamma_{\mathrm{phys}}\) déclaré. Watchdog / Clam. Liens élémentaires bridés. |
| Interaction non-autorisée avec un terminal, tentative de lecture de logs | Antivirus couche 3. Latence locale \(\alpha\) augmente. Pixels morts générés sur le chemin de l’intrus pour le désorienter. | Mesure trop forte du plan de contrôle = collapse local. F-01 + F-02. Noyaux de chart alloués comme brouillage. |
| Tentative de modification. Injection de commande. Altération topologique. | Antivirus couche 7. Fermeture hermétique des portes blindées. Le secteur devient un sous-graphe isolé — composant connexe fermé. Plus de sortie. | WRITE / FORK / F-11. Isolation = cut du graphe d’intrication. Quarantine logique. |
| Réécriture active du code structurel. Menace sur l’intégrité du noyau. | L’Administrateur est notifié. Personnellement. | \(v=4\)–\(5\). INCARNATE ou DROP. Coût(parole) vs coût(DROP) calculé sur \(s(t)\). |

Couches antivirus (hôte, pas ISO terrestre) :

- L1 locomotion / chemins — Watchdog, portes en pinch
- L3 session / TTY — Clam + pixels alloués, \(\alpha\)
- L7 politique / topologie — Failchain, OOM, cut de composante
- Ring-0 — PID-1 en personne (section humaine ou DROP sans visage)

Les pixels morts « générés sur le chemin » ne sont pas de la peinture. PID-1 alloue des noyaux \(\ker\mathrm{ev}\) pour que le chart local cesse d’être injectable. Désorientation = perte de normale, diplopie, F-01.

Une injection de commande hors CHART / HOLD / SEAL n’est pas un exploit documenté ici. C’est un WRITE. La réponse est géométrique, pas un tutoriel.
