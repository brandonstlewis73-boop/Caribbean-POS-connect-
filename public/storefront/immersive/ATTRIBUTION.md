# Character asset

`shopper.glb` is a derivative of Quaternius Universal Base Characters (Standard) and Universal Animation Library (Standard), released under CC0 1.0 (public domain; commercial use permitted).

- Creator: https://quaternius.com/
- Official pack: https://quaternius.com/packs/universalbasecharacters.html
- Rigged combined source: https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender/blob/main/test/human_male.glb
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Source repository includes the original Quaternius License_Standard.txt and animation License.txt.

Optimization: retain idle, talking, walking, jogging, interact and table pickup clips; remove unused animation channels, samplers and accessors; resample/deduplicate; resize textures to 512px WebP; meshopt compression. No runtime request to a third-party model host is required. Three.js provides its local meshopt decoder.

This is a stylized reusable human rig, not a photoreal character scan.

The derivative bakes a jade shirt, navy trousers, dark shoes and cropped hair colors into the mesh. Retained clips are used for locomotion blending and staff/pickup gestures.

## Reproduce

Use Node 22+ in an isolated tooling directory. Install `@gltf-transform/core@4.5.1`, `@gltf-transform/extensions@4.5.1`, `@gltf-transform/functions@4.5.1`, `meshoptimizer@1.3.0` and `sharp@0.35.5` there. Copy `scripts/optimize-immersive-character.mjs` into that directory so Node can resolve these tooling packages, then run:

```
node optimize-immersive-character.mjs /path/to/human_male.glb /path/to/shopper.glb
```

These tools are not runtime dependencies. The application uses its existing Three.js/R3F/Drei packages. Verify the output with `node scripts/test-immersive-character.mjs` in the repository.

## Bakery surface materials

Local `materials/oak.webp`, `materials/stone.webp` and `materials/plaster.webp` are resized WebP derivatives of Poly Haven CC0 textures:

- https://polyhaven.com/a/wood_table_001 — diffuse JPG, 1K source, 768px WebP derivative.
- https://polyhaven.com/a/marble_01 — diffuse JPG, 1K source, 768px WebP derivative.
- https://polyhaven.com/a/plastered_wall_02 — diffuse JPG, 1K source, 512px WebP derivative.
- License: https://polyhaven.com/license (CC0).

Combined encoded size: 78,370 bytes. Runtime limits the surface texture backing canvases to 512 × 512. A base material remains usable if a texture request fails.

The optional shirt and jacket shells are derived at runtime from the CC0 rig's existing vertices and skin weights; no remote avatar service is used. Outfit/appearance preferences are stored locally in the shopper's browser, without changing merchant records.
