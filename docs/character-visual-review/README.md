# Character and bakery visual overhaul

Replaces the colored base mesh and generated garment shells with four textured, animated human rigs. Three shopper looks have different faces, proportions, hair and clothing; the staff member uses a chef uniform. All assets are local MIT/CC0 derivatives, with sources and reproduction steps in `public/storefront/immersive/ATTRIBUTION.md`.

## Changes

- Denim jacket/tee/jeans/sneakers, rolled-sleeve shirt/trousers, and belted knitwear/jeans/boots. Authored textures, UVs, normal maps and skinning are retained.
- Five native-source retargeted clips per rig: idle, walk, run, pickup and talking. Existing velocity-driven blending, collision controller and camera remain in use.
- Initialize cloned bone matrices before fitting character height. Regression coverage prevents the 100× scale error found during integration.
- Clothing tints affect garment materials without recoloring the head or hand materials. Three model previews and browser-local saved preferences; old incompatible palette preferences reset to the new default.
- Scanned croissants, cakes and potted plants replace selected primitive decorations. Repeated objects are instanced. Floor texture scale is corrected and worktops have a separate marble surface.
- Quantized geometry is expanded before applying node transforms. Owned geometry/material/skeleton resources are disposed; shared cached source assets remain intact.
- Existing real product shelf data, cart, stock, order processing, pricing, fulfillment, taxes and payment configuration are preserved. Decorations are not purchasable products.

## Scope limits

These are optimized game assets, not the photoreal concept image. Outfit styles are complete character/outfit bundles with fabric tints; arbitrary uploaded clothes, separate garment swapping across bodies, face sculpting, and foot-lock IK are not included. Lighter graphics retain the chef and omit the ambient shopper. Physical iPhone Safari checks are needed for sustained frame rate, thermal behavior, memory pressure, safe areas and touch controls. Desktop WebKit emulation cannot establish iPhone performance.

## Verification

Results and measurements are recorded below. No production configuration is changed by this feature branch.

### Browser evidence

The screenshots use the local catalog fixture; they do not represent new live merchant products or real orders.

- [Phone, changed outfit and walking pose](phone.png)
- [Desktop store](desktop.png)
- [Character/outfit chooser](wardrobe.png)

### Tests

- `npm run test:immersive`: passed. Movement/collisions, NPC routes, camera, cart reconciliation, inventory and checkout tamper validation, avatar persistence, garment boundaries, cloned rig scale, animation poses, quantized geometry, asset budgets.
- `npm run test:pos`: passed. Saved pricing/totals, stock, payment method selection and idempotent transaction checks.
- `npm run test:immersive:browser`: passed in Chromium and Linux WebKit. Actual WebGL rendering, desktop and touch movement, outfit selection, sold-out handling, shared bag, pickup checkout fixture, responsive layout, context loss, failed asset recovery, unsupported WebGL and reduced-motion fallback. No real orders were submitted.
- `npm run build` and `npm run typecheck`: passed. Build reported two existing unused notification helper warnings in `app/actions.ts`; no new errors.
- Scoped ESLint and `git diff --check`: passed.
- `QA_SCRIPT=scripts/profile-human-store.mjs npm run test:immersive:browser`: passed; visual captures, clothing changes and saved preferences after reload, with no page errors.

### Measurements and limits

These are local development measurements on a **software GPU**, not physical iPhone results. The 30/60 FPS targets are **not verified**. Do not use the numbers as a hardware promise.

| Final six-second profile | 390×844 phone viewport | 1280×800 desktop viewport |
| --- | ---: | ---: |
| Mean animation-frame rate | 10.8 FPS | 4.9 FPS |
| Frame-time p95 | 183.3 ms | 283.4 ms |
| Renderer draw calls at final sample | 60 | 90 |
| Rendered triangles | 72,102 | 72,458 |
| Estimated retained GPU resources | 46.2 MB | 48.8 MB |
| Cumulative encoded assets after changing outfit | 3.41 MB | 3.41 MB |
| First rendered frame | 1.66 s | 2.51 s |

The cold/default phone fixture used 2.38 MB of assets, 59 draw calls and 70,100 triangles. Lighter rendering reduces the preceding integration's ~106,000 triangles by roughly one third and avoids normal-map PBR lighting while retaining fabric/skin texture and hair cutouts. High quality keeps PBR materials, additional décor and the ambient shopper. Encoded assets are lazy loaded; cached models remain bounded to the four authored characters.

GPU resource memory is an application estimate, not driver-reported VRAM. GPU timer queries are unavailable under this WebKit environment. Asset timings are localhost transfer timings; first-frame measurements include compilation. Raw records: [Chromium suite](chromium-metrics.json), [WebKit suite](webkit-metrics.json), [six-second profile](profile.json).

Before production approval, test a recent and an older supported physical iPhone in Safari for 10–15 minutes: all three looks, camera/joystick simultaneously, repeated look changes, background/resume, memory pressure, cart retention and checkout navigation. Verify sustained 30 FPS fallback and 60 FPS on suitable hardware. Preview is appropriate for this validation; production is not changed by this PR.

## Files changed

- `components/storefront/immersive/BakeryDetails.tsx`
- `components/storefront/immersive/Character.tsx`
- `components/storefront/immersive/Environment.tsx`
- `components/storefront/immersive/ImmersiveStorefront.module.css`
- `components/storefront/immersive/ImmersiveStorefront.tsx`
- `components/storefront/immersive/ScannedDecor.tsx`
- `components/storefront/immersive/Scene.tsx`
- `components/storefront/immersive/Wardrobe.tsx`
- `docs/IMMERSIVE_STORE_RELEASE.md`
- `docs/character-visual-review/README.md`
- `docs/character-visual-review/chromium-metrics.json`
- `docs/character-visual-review/desktop.png`
- `docs/character-visual-review/phone.png`
- `docs/character-visual-review/profile.json`
- `docs/character-visual-review/wardrobe.png`
- `docs/character-visual-review/webkit-metrics.json`
- `lib/immersive/avatar.ts`
- `lib/immersive/model-geometry.ts`
- `lib/immersive/wardrobe.ts`
- `package.json`
- `public/storefront/immersive/ATTRIBUTION.md`
- `public/storefront/immersive/decor/carrot_cake.glb`
- `public/storefront/immersive/decor/croissant.glb`
- `public/storefront/immersive/decor/potted_plant_01.glb`
- `public/storefront/immersive/licenses/Microsoft-Rocketbox-MIT.txt`
- `public/storefront/immersive/people/chef.glb`
- `public/storefront/immersive/people/denim.glb`
- `public/storefront/immersive/people/denim.webp`
- `public/storefront/immersive/people/knit.glb`
- `public/storefront/immersive/people/knit.webp`
- `public/storefront/immersive/people/linen.glb`
- `public/storefront/immersive/people/linen.webp`
- `scripts/assets/build-store-humans.py`
- `scripts/assets/optimize-store-decor.mjs`
- `scripts/assets/optimize-store-humans.mjs`
- `scripts/profile-human-store.mjs`
- `scripts/profile-store-style.mjs`
- `scripts/test-avatar.ts`
- `scripts/test-immersive-browser.mjs`
- `scripts/test-immersive-character.mjs`
- `scripts/test-immersive-geometry.ts`
