# Game FX Pack — transparent PNG
Prêt à importer (Unity / Godot / Unreal Niagara / GameMaker).

## Structure
- cinematic/        sprites haute qualité, fond transparent (recadrés)
- engine_ready/     mêmes FX cadrés dans 256x256 et 512x512 (pivot centre)
- muzzle/ smoke/ impact/ blood_splatter/ blood_spray/   variantes procédurales stylisées
- sheets/           planches 256px

## Blend modes recommandés
- muzzle + impact sparks : Additive / Add
- smoke : Alpha (premultiplied si possible) ou Mix
- blood splatter (decals au sol/mur) : Alpha, albedo, pas d'émission
- blood spray (giclée dans l'air) : Alpha, éventuellement soft-light léger

## Implémentation rapide

### Godot 4
1. Importer les PNG (detect 3D: Off, hdr: Off)
2. CPUParticles2D ou GPUParticles2D
   - Texture = sprite
   - Draw pass / blend : Add pour muzzle/impact, Mix pour sang/fumée
   - explosiveness 0.85-1.0 pour un flash unique
   - lifetime 0.06-0.12s muzzle, 0.4-1.2s smoke, 0.25-0.6s blood spray
3. Decal sang : Sprite2D + modulate alpha, ou canvas_item shader qui multiplie par une noise d'usure

### Unity
- Texture Type: Sprite (2D and UI), Alpha Is Transparency ON, Wrap Clamp
- Particle System:
  - Renderer: Billboard, Material Particles/Standard Unlit
  - Muzzle: Additive, start lifetime 0.08, size 0.6-1.4
  - Blood spray: Alpha Blended, start speed 2-6, size over lifetime down
- Ground splatter: Quad + transparent material, random rotation Z

### Pivot
Tous les engine_ready/*_256.png et *_512.png ont le pivot au centre.
muzzle_horizontal : l'origine visuelle du flash est plutôt à gauche du centre — décale le particle origin vers la bouche du canon.

## Couleurs
Sang : crimson #9a1018 → #5a070a
Muzzle : blanc #fff6c8 cœur, orange #ff9a28, rouge #ff4a0a
Fumée : gris 0.45-0.75 linéaire

Généré pour usage jeu. Les versions cinematic viennent d'images isolées sur noir puis détourage luminance/chroma.
