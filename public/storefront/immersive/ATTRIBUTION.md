# Immersive store assets

## Textured characters and animation

`people/denim.glb`, `linen.glb`, `knit.glb`, `chef.glb` and their wardrobe previews are derivatives of Microsoft Rocketbox, licensed under the MIT License. The complete license is included in `licenses/Microsoft-Rocketbox-MIT.txt`.

- Source: https://github.com/microsoft/Microsoft-Rocketbox
- License: https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md
- Models: `Assets/Avatars/Adults/Male_Adult_12`, `Male_Adult_08`, `Female_Adult_14`, and `Assets/Avatars/Professions/Chef_Female_01`.
- Motion: gender-matched idle, walk, run, documents_take and gestic_talk_neutral clips under `Assets/Animations/all_animations_max_motextr_static` and `all_animations_max_motextr_xy`.

Derivatives preserve authored body proportions, clothing geometry, UVs and textures. Bone rotations are retargeted in pose space and baked in Blender; root translation is controlled by the application. Five clips are retained. Body color maps are limited to 1024px, other maps to 512px, then WebP/Meshopt compressed. Garment materials remain separate for color customization. Browser-local avatar preferences do not alter merchant records.

Reproduction: download these source folders retaining the upstream directory structure, then run Blender 4.3:

```
blender -b --python scripts/assets/build-store-humans.py -- /path/to/source
```

In a separate tooling directory install `@gltf-transform/core@4.5.1`, `@gltf-transform/extensions@4.5.1`, `@gltf-transform/functions@4.5.1`, `meshoptimizer@1.3.0`, `sharp@0.35.5`. Copy the optimization scripts there for dependency resolution:

```
node optimize-store-humans.mjs /path/to/source/export /path/to/repo/public/storefront/immersive/people
```

Wardrobe previews are cropped/resized 220×360 WebP derivatives of the corresponding upstream model previews. These tools are not runtime dependencies.

## Scanned bakery decoration

`decor/croissant.glb`, `carrot_cake.glb`, `potted_plant_01.glb` derive from Poly Haven CC0 assets:

- https://polyhaven.com/a/croissant
- https://polyhaven.com/a/carrot_cake
- https://polyhaven.com/a/potted_plant_01
- License: https://polyhaven.com/license

Download the 1K glTF assets and their relative texture files. Place croissant in `SOURCE/pastry`, carrot_cake in `SOURCE/carrot_cake`, and potted_plant_01 in `SOURCE/potted_plant_01`. Run `optimize-store-decor.mjs SOURCE OUTPUT` in the tooling directory. Derivatives use mesh simplification, centered floor pivots, 512px WebP and Meshopt compression. Repeated objects are instanced. These are environmental decorations; only backend product displays are purchasable.

## Bakery surface materials

`materials/oak.webp`, `stone.webp`, `plaster.webp` are resized Poly Haven CC0 texture derivatives:

- https://polyhaven.com/a/wood_table_001
- https://polyhaven.com/a/marble_01
- https://polyhaven.com/a/plastered_wall_02

Combined encoded size: 78,370 bytes. Surface backing canvases are limited to 512×512. A base material remains available if a texture request fails.

## Legacy asset

`shopper.glb` is retained for historical tooling only; the current scene does not load it. It derives from Quaternius Universal Base Characters/Universal Animation Library, CC0: https://quaternius.com/packs/universalbasecharacters.html. Original combined source: https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender/blob/main/test/human_male.glb.
