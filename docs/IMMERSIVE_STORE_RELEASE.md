# Immersive storefront implementation and release review

## Unreleased movement upgrade

The feature-branch audit, performance comparison, limitations and validation are in [Immersive movement and mobile review](immersive-motion-review/README.md). This upgrade is not approved for production deployment. Results farther below describe the earlier release.

## Rollout

The old image/video-based 3D storefront has been removed at the merchant’s request. Quick Shop remains the default landing view, with the new engine loaded only when the shopper chooses to enter. No live database migration is required.

The reviewed code rollout allows `baker-buds` only when `IMMERSIVE_STOREFRONT_MERCHANTS` is unset. An explicit empty environment value disables the engine; a comma-separated server-only value overrides the rollout. The merchant’s `storefront_3d_enabled` setting and subscription permission must also allow 3D. A URL parameter cannot bypass these checks.

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

The earlier environment-variable mutation was denied by Vercel (403). The new release uses a reviewed, merchant-specific code allowlist, retaining an environment override and the existing subscription/settings gates. Deployment status is reported separately after hosted verification.

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

## iPhone compatibility follow-up

- Removed `VirtualStorefrontClient.tsx` and its stylesheet, old entry buttons and state. No legacy scene/video runs behind the new engine.
- Touch/coarse-pointer devices (including iPad and landscape iPhone) start with battery-saver graphics: DPR 1, no shadow map, two characters. The initial renderer is lightweight before capability detection.
- Rendering pauses while product/settings dialogs are open or the browser tab is hidden.
- Shelf label texture resolution is halved in each dimension, reducing their GPU allocation by 75%. Product information remains available as accessible HTML.
- Explicit loading, reduced-motion and unavailable-fullscreen feedback replaces silent actions.
- Browser suite can run with `QA_BROWSER=webkit`; Chromium retains native touch dispatch, while WebKit uses native pointer dragging because its automation API has no touch-drag primitive.
- Physical iPhone GPU/memory and iOS audio behavior still require a device check. Linux WebKit is closer browser-engine coverage, not proof of physical-device performance.

Follow-up validation (2026-10-10): typecheck, immersive unit/route/asset tests, POS tests and production-hardening tests passed. Full Chromium and WebKit browser suites passed, including shared cart, pickup checkout (intercepted submission only), controls, 320px/landscape/tablet layout, context loss, unsupported WebGL, reduced motion and failed-asset retry. No live orders or notifications were generated. Latest raw development/software-renderer samples are `metrics.json` and `metrics-webkit.json`; FPS samples are not physical-device benchmarks (they may include paused dialogs).
