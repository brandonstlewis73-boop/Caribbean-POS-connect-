# Bakery materials and character wardrobe

Feature branch: `feature/bakery-style-avatar`, based on deployed PR #44 (`eacd41d`). Deployment was requested after review; production release is gated on the checks below. No live orders, messages, payments or database writes were made during validation.

## Implemented

- Warm oak, stone and plaster surface maps, olive cabinetry, brass trim, arched windows, baked window light, illuminated shelf strips, hanging foliage, bread shelves, bottles and glass display domes. Repeated decorative meshes are instanced. Decorative goods never enter the shopping catalog.
- Player wardrobe: Everyday shirt or Canvas jacket; five top colors, three trouser colors, three footwear colors, four skin tones and four hair colors. Clothing shells retain the original rig's skin weights and follow idle/walk/run/pickup animations. Jacket sleeves and eased torso geometry give the two tops distinct coverage.
- Clothing/Appearance tabs, labeled touch targets, staged changes, Reset and Apply, browser-local persistence with safe defaults for invalid or unavailable storage. Clothes are free; no account, checkout or payment change is involved.
- Staff use a consistent cream/dark uniform. The existing shared cart, catalog refresh, price/stock reconciliation, Quick Shop, fulfillment, taxes and server checkout remain authoritative.
- The entrance position and island were adjusted to present the main aisle; the additional back shelving has a collision fixture.

## Visual scope

The supplied reference guides the olive/cream/wood/brass palette and bakery details. This implementation remains a stylized, lightweight real-time scene, not a photoreal reproduction. The existing body proportions and hairstyles remain; appearance customization changes colors and two skinned top styles, not body shape, arbitrary uploaded garments or simulated fabric. Outfits are saved only on the current browser, not synchronized between devices.

Reviewed captures use fixture products, not live merchant data:

- [Desktop with canvas jacket](desktop-jacket.webp)
- [Phone wardrobe](phone-wardrobe.webp)

## Performance measurement

[Raw profile](profile.json), Linux Chromium, software SwiftShader GPU, Next development server, DPR 1, six-second idle sampling after applying a jacket. These are software-rendering observations, **not physical-iPhone FPS or a controlled before/after benchmark**.

| Viewport | Average FPS | rAF p95 | Draw calls | Triangles | Estimated resources | First render |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280×800 | 4.7 | 283.3 ms | 89 | 50,100 | 32 MB | 1,390 ms |
| 390×844 | 19.1 | 83.4 ms | 59 | 49,744 | 29.4 MB | 819 ms |

Auto selected low quality and resolution scale 0.7 in both samples. Resource memory is the engine's estimate, not driver-measured VRAM. Desktop memory/calls include resources seen during the earlier quality transition. CPU software rendering did not achieve 30 or 60 FPS; there is no claim those hardware targets are verified.

The three new local WebP maps total 78,370 bytes. They upload through 512px canvases with procedural fallback finishes if downloads fail. The existing character GLB remains 606,186 bytes. The profiler's `assetBytes`/`assetMs` cover that character, not the entire scene's download cost. Room reflections are generated locally. No remote asset service or paid runtime dependency was added. Clothing geometries/materials and cloned skeleton resources are disposed when changing looks or leaving the scene.

## Validation

- `npm run test:immersive`: passed cart/stock, movement/collision, gait, NPC waypoint/yielding, adaptive quality, saved-price checkout rules, and decoded character animation checks.
- New `scripts/test-avatar.ts`: passed appearance allowlist/defaults, malformed/denied storage, preference roundtrip, actual GLB decoding, source immutability, skin-weight retention, jacket coverage and nonempty body/garment triangle partition.
- `npm run test:pos`: passed pricing, inventory, idempotency and tenant-scoped checkout checks.
- Scoped ESLint and `git diff --check`: passed.
- Style profile: both viewport renders, Apply, reload and saved outfit checks passed; no page errors.
- Chromium and Linux WebKit browser suites: passed real WebGL rendering, clothing Apply/reopen, movement, touch controls, stock guards, shared cart, intercepted checkout, responsive layouts, context loss, model retry, WebGL fallback and reduced motion. WebKit on Linux is not physical iPhone testing.
- `npm run build` and `npm run typecheck`: passed. Build retains two existing unused notification-function warnings in `lib/data.ts`. The temporary QA route is absent from production output.

The checkout suite mocks SQL, and browser checkout is intercepted; neither proves a live payment provider transaction. Physical iPhone Safari/in-app-browser testing is still required for garment clipping through full gait/pickup cycles, cold and warm loading, camera/joystick combinations, rotation, background/resume, storage/private mode, sustained FPS/heat and low-memory recovery. Test both 60 FPS-capable hardware and the 30 FPS fallback before production approval.

## Changed files

- `components/storefront/immersive/BakeryDetails.tsx`
- `components/storefront/immersive/BakeryWindows.tsx`
- `components/storefront/immersive/Wardrobe.tsx`
- `docs/bakery-style-review/README.md`
- `docs/bakery-style-review/desktop-jacket.webp`
- `docs/bakery-style-review/phone-wardrobe.webp`
- `docs/bakery-style-review/profile.json`
- `lib/immersive/avatar.ts`
- `lib/immersive/wardrobe.ts`
- `public/storefront/immersive/materials/oak.webp`
- `public/storefront/immersive/materials/plaster.webp`
- `public/storefront/immersive/materials/stone.webp`
- `scripts/profile-store-style.mjs`
- `scripts/test-avatar.ts`
- `components/storefront/immersive/Character.tsx`
- `components/storefront/immersive/Environment.tsx`
- `components/storefront/immersive/ImmersiveStorefront.module.css`
- `components/storefront/immersive/ImmersiveStorefront.tsx`
- `components/storefront/immersive/Scene.tsx`
- `docs/IMMERSIVE_STORE_RELEASE.md`
- `lib/immersive/world.ts`
- `package.json`
- `public/storefront/immersive/ATTRIBUTION.md`
- `scripts/test-immersive-browser.mjs`

- `docs/bakery-style-review/browser-chromium.json`
- `docs/bakery-style-review/browser-webkit.json`
