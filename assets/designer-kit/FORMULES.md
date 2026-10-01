# Formules — bureau d'étude meumeu

Échelle. Un servant fait 30 cm. Les cotes sont les cotes réelles de l'objet (mm, cm, g), pas des masses humaines collées sur une peluche.

## Masse — géométrie, pas un malus

Paroi du tube, plus lente que l'alésage — sinon un 36 mm est un lingot plein :

    paroi = max(0,04 cm, 0,16 × rayon^0,42 × profil × pression / résistance)

Fonte : résistance 0,62 (paroi plus épaisse). Bronze 0,78. Acier 1.
Masse = volume d'acier × densité. +1 cm de canon de fusil = quelques grammes.
La culasse d'une pièce ≈ 0,4 × masse du tube. Ce n'est pas un coefficient « artillerie × 20 ».

Fer à sortir de la réserve (lingots, pas les grammes) :

    fer = max(1, arrondi(kg × 1,15 + 0,35))

Un fusil ≈ 1 lingot. Une pièce de campagne ≈ 4 à 8.

Servants. Capacité : épaule 1,45 kg, bipied 2,15 kg, trépied 3,4 kg, roues 14 kg.
Minimum = ceil(masse / capacité). On peut en ajouter : la vitesse dépend des kg par servant.

    roues : 0,86 × exp(−(kg/servant) / 10)  m/s
    épaule : 0,78 × exp(−(kg/servant) / 2,15) m/s

Un affût à roues n'est jamais « fixe ». Seul l'affût à pieux est immobile, et c'est un choix.

Coût de la pièce = somme (masse × taux matière) + usinage modeste du viseur et des rayures.
Le coup (poudre, ogive, éclat, moteur) est à part. Une pièce ne paie pas son munitionnement dans son prix d'achat.
Taux : acier 46, fonte 22, bronze 96 marks/kg.

## Balistique intérieure

Capacité d'étui ≈ π (rayonAlésage × suralésage)² × longueurÉtui × 0,64
Charge = capacité × densitéChargement × 0,93 g/cm³
Si pression relative > limite de culasse, la charge est écrêtée. On n'alourdit pas l'arme pour « payer » la pression.

    L* = 14,2 × (charge/1,5)^0,45 / (vivacité × séjour)
    séjour = √(masseOgive / masseRéférence), borné 0,78–1,55
    fractionBrûlée = 1 − exp(−1,9 × L / L*)
    η = 0,38 × fractionBrûlée × frottement
    frottement = exp(−max(0, L − 1,45 L*) / 340)

Ogive lourde → elle reste plus longtemps → L* baisse un peu (meilleure combustion) mais V₀ = √(2E/m) baisse quand même.
Poudre lente → L* grand → il faut du tube. Sans tube, le flash monte et V₀ manque. La masse bouge peu.
Sans recul : η × 0,42, impulsion de recul × 0,20.
Roquette (moteur > 0,25 N·s et tube) : V₀ = impulsion / masse × guide. Le guide vaut 0,86 à 1,06. La longueur ne fait pas la portée.

## Balistique extérieure

Traînée quadratique, ρ = 1,2 kg/m³, Cd selon Mach × facteur de forme.

    i = 1,42 − 0,62×ogive + 0,85×méplat − 0,50×queue + 0,08 si explosif
    départ à hauteur de bouche (0,22 m à l'épaule, 0,42 m sur roues), pas au sol.

Zéro. On cherche l'angle de canon qui met l'ogive à 15 cm de haut à la distance de zéro.
En tir direct, la ligne de visée vise le centre de la cible ; le canon garde le même décalage angulaire que lors du zéro.
Changer le zéro ou le grossissement ne change pas l'énergie à la bouche.
Le grossissement et le rayon de visée changent la distance d'identification et l'erreur angulaire.

    œil ≈ 46 m × qualitéViseur × grossissement^0,74 × bonusRayon
    erreurOptique ≈ 1,25 / √grossissement   (MOA)
    erreurHausse ≈ 2,5 × (32 cm / rayon)    (MOA)

Pénétration acier doux, ordre de grandeur :

    mm ≈ 0,00112 × √m_g × V^1,4 / d_mm^0,75 × densité × fractionPleine

Éclat : 24 × (masse × fractionCharge)^⅓ centimètres. Ce n'est pas de la pénétration.

Stabilité Miller (pas en calibres) :

    S = 30 m_grains / (t² d_in³ L (1+L²))

S < 1,2 : l'ogive bascule. Serrer le pas ou raccourcir l'ogive.

## Ce qu'il ne faut pas réimporter

- Masse qui double parce que la catégorie s'appelle « artillerie ».
- Pièce déclarée fixe dès qu'elle dépasse un seuil. Des roues, des servants, une vitesse faible.
- Portée qui augmente parce que la hausse est graduée plus loin.
- Un seul style de balle. Ogive, queue, méplat, densité, charge, vivacité sont des continus.
