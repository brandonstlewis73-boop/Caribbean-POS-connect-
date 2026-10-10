# Immersive storefront implementation and release review

## Rollout

This implementation is isolated on `feature/immersive-shopping-engine`. The existing storefront remains the default. No production environment variable or live database was changed.

Set server-only `IMMERSIVE_STOREFRONT_MERCHANTS=baker-buds` in a **preview** environment to expose the entry for Baker Buds. The merchant's existing `storefront_3d_enabled` setting and subscription permission must also allow 3D. A URL parameter cannot bypass these checks. Removing the allowlist entry removes the new experience without replacing checkout.

## Architecture

`OnlineOrderClient` remains the sole cart/checkout owner. The lazy engine receives current products, settings and shopping callbacks. It has no order-write endpoint, payment credentials or independent totals authority. Opening Quick Shop or checkout retains the bag. The public merchant menu is refreshed on entry, every 45 seconds while the engine is open, and on window focus. Stock reductions, deleted products and saved-price changes reconcile into the shared bag.

The public order endpoint resolves the merchant from its slug, validates fulfillment and payment availability, strips client price/discount/fee overrides, and forces new/unpaid status. Existing transactional product locks and saved prices remain authoritative. `expected_total` detects a stale customer quote; it never determines the charged/order total. Merchant currency is preserved across visitor countries; no unquoted currency conversion occurs.

Merchant branding, theme, lighting and layout reuse current settings. Products are paged across 12 physical shelf positions; the accessible product browser can reach the full catalog. The gallery layout removes the middle island. New layout models can extend `worldConfig` without another catalog or checkout implementation.

## Controls and recovery

WASD/arrows, Shift to run, drag to look, E to inspect. Phones use an independent movement joystick and camera drag, with a run button. Movement has exponential acceleration/deceleration, shortest-path rotation, bounded collision substeps and wall sliding. The follow camera checks fixture occlusion.

Reduced motion chooses conventional shopping. Native product/settings dialogs provide DOM labels, keyboard focus containment and close controls. Quick Shop remains available while assets load and after rendering failures. A lost WebGL context, unsupported WebGL2, model error or loading timeout presents recovery without discarding the bag. Audio starts only after an explicit user gesture and pauses when hidden.

## Validation and limitations

See the completed validation results below before enabling production. Browser automation uses Chromium/SwiftShader in a Linux container; phone viewport emulation is not physical iPhone Safari validation. Hardware frame rate, memory-pressure recovery and iOS audio behavior require device testing.

Inventory is checked under the existing server transaction; pending orders do not reserve stock. The application's existing inventory deduction happens on completion. This upgrade does not claim a reservation guarantee or change that business policy.

The existing merchant checkout/payment-link flow is preserved. PayPal subscription billing is separate. Local test submissions are intercepted and do not create live orders, send notifications or charge a payment method.

Characters and geometry are stylized, with a small CC0 rig and locally optimized textures. The generated visual concept establishes palette and HUD composition, not a claim of photoreal output. Staff gestures and ambient customers are visual activity and do not represent paid orders. Optional audio is synthesized rather than recorded dialogue.

## Visual fidelity ledger

- Preserved: cream/jade palette, warm bakery fixtures, third-person framing, compact ivory HUD, contextual inspect, shared bag, direct Quick Shop exit.
- Adapted: photoreal concept materials and bespoke character art become lightweight real-time meshes and a reusable licensed rig. High detail uses real shadows; battery saver reduces GPU work.
- Required pre-launch review: physical iPhone Safari, representative lower-end Android, merchant-provided product photos and store branding, accessibility review, real merchant payment sandbox configuration.

## Results

Automated validation (2026-10-10):

- `npm run test:immersive`: passed. Shared-cart stock clamps and repricing; inactive/missing products; feature allowlist; controller acceleration/deceleration, diagonal normalization and collision substeps; merchant currency; fulfillment/payment policy; actual `createOrder` saved-price/fee calculations and stock/tenant lock query path with mocked SQL; decoded skinned animation clips and 700 KB asset budget.
- `npm run test:pos`: passed existing pricing, totals, stock and idempotency/tenant scoping regressions.
- `npm run test:immersive:browser`: passed real WebGL rendering, desktop movement, touch joystick, sold-out guard, cart persistence, pickup checkout and an intercepted order submission, 320px layout, tablet and landscape controls, context loss, unsupported WebGL, reduced motion, and a simulated 503 model download followed by successful retry. No live API mutation or payment was performed.
- Scoped ESLint: passed with no errors or warnings in the new engine, helpers, tests and changed storefront components.
- Production build and `npm run typecheck`: passed. The build retains two pre-existing unused notification-function warnings in `lib/data.ts`; no new lint errors. No test fixture route is present in the production output.

Performance observations from the final development-browser run (Chromium, Linux SwiftShader software GPU, DPR 1):

| View | Enter-to-ready | Sample FPS | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1024 × 700 | 3,497 ms | 2 | 72 | 42,996 |
| Phone viewport 390 × 844 | 2,628 ms | 23 | 52 | 42,524 |

These are entrance-camera snapshots, not hardware frame-rate promises or percentile benchmarks. The desktop software result is below a shippable frame-rate target; hardware measurements are required before enabling production. Development compile/runtime overhead and localhost transfer make load times unsuitable as an internet-network SLA.

The rig is 527,816 bytes (256,802 bytes with gzip). Its WebP textures are at most 512px; merchant image textures are resized to at most 512px for GPU upload. At most 12 products are rendered per shelf collection. Repeated fixtures, bread decorations, foliage and floor tiles are instanced. Automatic quality reduces shadows, pixel ratio and ambient NPC count. The engine and rendering libraries are lazy-loaded on entry.

Screenshots: [desktop](immersive-review/desktop.png), [phone](immersive-review/mobile.png), [shared checkout](immersive-review/mobile-checkout.png). Raw samples: [metrics.json](immersive-review/metrics.json).

The Vercel connector returned HTTP 403 when creating the branch-scoped preview flag. No Vercel CLI or CLI token is available in this workspace. The hosted engine preview could not be enabled. Production was not deployed or enabled; physical-device validation and merchant visual approval remain release gates.

Production bundle: `/store/[slug]` first-load JavaScript is 129 KB per Next.js. The lazy engine UI is 22,067 bytes raw / 7,929 gzip; its CSS is 12,114 / 2,638. Scene chunks total 1,005,983 bytes raw / 271,688 gzip. These are generated-artifact sizes, separate from runtime asset/photo transfers.

## All files changed

- [`app/api/store/[slug]/orders/route.ts`](../app/api/store/[slug]/orders/route.ts)
- [`app/store/[slug]/page.tsx`](../app/store/[slug]/page.tsx)
- [`components/orders/OnlineOrderClient.tsx`](../components/orders/OnlineOrderClient.tsx)
- [`components/storefront/immersive/Character.tsx`](../components/storefront/immersive/Character.tsx)
- [`components/storefront/immersive/Environment.tsx`](../components/storefront/immersive/Environment.tsx)
- [`components/storefront/immersive/ImmersiveStorefront.module.css`](../components/storefront/immersive/ImmersiveStorefront.module.css)
- [`components/storefront/immersive/ImmersiveStorefront.tsx`](../components/storefront/immersive/ImmersiveStorefront.tsx)
- [`components/storefront/immersive/Scene.tsx`](../components/storefront/immersive/Scene.tsx)
- [`components/storefront/immersive/audio.ts`](../components/storefront/immersive/audio.ts)
- [`components/storefront/immersive/useControls.ts`](../components/storefront/immersive/useControls.ts)
- [`docs/IMMERSIVE_STORE_AUDIT.md`](../docs/IMMERSIVE_STORE_AUDIT.md)
- [`docs/IMMERSIVE_STORE_RELEASE.md`](../docs/IMMERSIVE_STORE_RELEASE.md)
- [`docs/immersive-review/desktop.png`](../docs/immersive-review/desktop.png)
- [`docs/immersive-review/metrics.json`](../docs/immersive-review/metrics.json)
- [`docs/immersive-review/mobile-checkout.png`](../docs/immersive-review/mobile-checkout.png)
- [`docs/immersive-review/mobile.png`](../docs/immersive-review/mobile.png)
- [`lib/data.ts`](../lib/data.ts)
- [`lib/immersive/cart.ts`](../lib/immersive/cart.ts)
- [`lib/immersive/checkout-policy.ts`](../lib/immersive/checkout-policy.ts)
- [`lib/immersive/flag.ts`](../lib/immersive/flag.ts)
- [`lib/immersive/world.ts`](../lib/immersive/world.ts)
- [`lib/online-market.ts`](../lib/online-market.ts)
- [`package.json`](../package.json)
- [`public/storefront/immersive/ATTRIBUTION.md`](../public/storefront/immersive/ATTRIBUTION.md)
- [`public/storefront/immersive/shopper.glb`](../public/storefront/immersive/shopper.glb)
- [`scripts/fixtures/immersive-page.tsx`](../scripts/fixtures/immersive-page.tsx)
- [`scripts/optimize-immersive-character.mjs`](../scripts/optimize-immersive-character.mjs)
- [`scripts/test-immersive-browser.mjs`](../scripts/test-immersive-browser.mjs)
- [`scripts/test-immersive-character.mjs`](../scripts/test-immersive-character.mjs)
- [`scripts/test-immersive-checkout.cjs`](../scripts/test-immersive-checkout.cjs)
- [`scripts/test-immersive-runner.mjs`](../scripts/test-immersive-runner.mjs)
- [`scripts/test-immersive.ts`](../scripts/test-immersive.ts)
