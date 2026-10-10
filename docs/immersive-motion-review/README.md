# Immersive movement and mobile review

Feature branch: `feature/immersive-motion-quality`. Baseline: `eacf2501ee3258817f6fa74b5068071f02c230f3`. This review does not authorize a production release.

## Implementation

- Fixed-step movement with acceleration, braking through sharp direction changes, bounded turning, collision sliding and interpolated player transforms. Animation speed now follows actual displacement, including stopping at an obstacle.
- Walk and run share a stride phase calibrated against the existing rig. Idle and pickup blend in/out. This reduces sliding; it does not add foot-lock IK or replace the stylized character asset.
- Camera orbit and follow smoothing, fixture occlusion before and after interpolation, and entrance reset without flying through the room.
- Analog joystick deadzone, proportional movement, independent camera pointer capture and reliable key release after focus changes.
- Customer waypoints visit shelves and the counter with idle pauses. Staff move between preparation and service positions. Both use collision checks and yield to shoppers. Ambient activity never creates orders. Battery saver keeps the player and staff; high detail adds the customer.
- Generated wood, stone and plaster textures; glass display case, brass trim, packaging, window frames and bakery signage. High detail adds generated indoor reflections and shadows. Battery saver uses lighter materials without the reflection map or shadow pass. The existing optimized 527,816-byte rig is reused; no new asset download is required.
- Safe-area-aware phone HUD with separate wrapping rows, readable buttons and preserved Quick Shop/cart access. The three-dimensional scene is memoized so joystick updates do not rebuild its component tree.
- Active-frame profiling excludes hidden tabs and open dialogs. It reports frame percentiles, draw calls, triangle counts, asset timing and resource estimates. GPU timing is sampled only when the browser exposes the timer extension. Automatic resolution uses sustained slow/fast windows and stays between 0.7 and 1 DPR. Explicit high detail uses 1.35 DPR.

## Business boundaries

No database, order endpoint, tax calculation, fulfillment, payment setting or inventory policy was changed. `OnlineOrderClient` still owns the shared cart and checkout. The existing server remains authoritative for saved prices and stock. Test submissions are intercepted; no live order, notification or payment is created.

## Performance evidence

Reproduce with `QA_SCRIPT=scripts/profile-immersive-browser.mjs npm run test:immersive:browser`. The runner creates and removes a local-only fixture. Raw captures are adjacent JSON files.

Chromium with Linux SwiftShader software rendering, development server, 390 × 844 CSS pixels, device DPR 1; six-second active-canvas windows after warm-up:

| Capture | Mean FPS | Frame p50 | Frame p95 | Draw calls at report |
| --- | ---: | ---: | ---: | ---: |
| Baseline idle | 9.81 | 100.0 ms | 250.0 ms | 52 |
| Upgrade idle | 13.12 | 83.3 ms | 166.7 ms | 58 |
| Baseline run path | 10.52 | 99.9 ms | 183.4 ms | 23 |
| Upgrade run path | 19.06 | 50.0 ms | 83.4 ms | 27 |

The upgraded automatic tier reduced render DPR to 0.7; the baseline remained at 1. This measures the complete adaptive experience, **not equal-resolution shader throughput**. The run path ends against a wall and includes stopping. These are single development captures, not statistically controlled hardware benchmarks. The subsequent staff shirt change removes a rigid mesh and clones its vertex colors; these numbers precede that small visual adjustment.

The upgrade reported approximately 25–26 MiB of geometry, textures and drawing buffers. This is an estimate, not total driver/GPU memory; browser/driver allocations and some render targets are not exposed. Model transfer remained 257,102 bytes compressed / 527,816 bytes decoded on localhost. Entry-to-ready was 2,519 ms versus 2,883 ms baseline; localhost/dev compilation is not a network loading SLA.

Neither capture meets 30/60 FPS on this software renderer. Hardware targets remain **unverified**, and production rollout should wait for physical-device review. An initial heavier fallback was rejected after profiling; the final fallback omits that reflection/bump-lighting cost.

## Required physical-device acceptance

On a physical iPhone in Safari and the in-app browser, check a cold entry and a cached entry, at least two minutes of walking/running/turning, simultaneous joystick and camera input, pickup transitions, shelf inspection, Quick Shop/cart continuity, rotation, background/resume, audio and low-memory recovery. Record iPhone/iOS versions, resolution tier, frame p50/p95, thermal state and loading timings. Repeat on a representative Android and desktop GPU. Aim for 60 FPS on suitable hardware and a stable usable 30 FPS fallback; reduce detail further if measured frame times require it.

The current character is a reused stylized rig, not a photoreal person. NPC routes are controlled ambient activity rather than crowd simulation. There is no measured guarantee of zero foot sliding or physical-iPhone frame rate.

## Validation

- `npm run test:immersive`: passed controller/collision/cart/stock tests, new gait/camera/NPC/adaptive-resolution tests, server checkout policy tests with mocked SQL, and decoded animation/asset-budget checks.
- `npm run test:pos`: passed pricing, totals, inventory and idempotency/tenant scoping checks.
- `npm run typecheck`: passed.
- Scoped ESLint for the immersive components, helpers and changed test scripts: passed.
- Chromium browser suite: passed desktop keyboard movement, touch joystick, shared bag, sold-out guard, intercepted pickup checkout, 320px/tablet/landscape layout, simulated 59px top safe area, context loss, missing WebGL, asset-download retry and reduced motion.
- Linux WebKit browser suite: passed the same flows. WebKit uses pointer dragging rather than Chromium's CDP native touch dispatch. Host libraries were installed privately for this execution environment; this is not iOS hardware.
- `npm run build`: passed. Only two existing unused notification-function warnings remain in `lib/data.ts`. The temporary QA fixture is absent from production output.

Browser captures (`browser-chromium.json`, `browser-webkit.json`) are regression snapshots, not controlled performance samples; use the dedicated profile files for the timed comparison above. No live order or payment was submitted.

## Changed files

- `components/storefront/immersive/Character.tsx`
- `components/storefront/immersive/Environment.tsx`
- `components/storefront/immersive/FrameProfiler.tsx`
- `components/storefront/immersive/ImmersiveStorefront.module.css`
- `components/storefront/immersive/ImmersiveStorefront.tsx`
- `components/storefront/immersive/RoomLighting.tsx`
- `components/storefront/immersive/Scene.tsx`
- `components/storefront/immersive/useControls.ts`
- `docs/IMMERSIVE_STORE_RELEASE.md`
- `docs/immersive-motion-review/README.md`
- `docs/immersive-motion-review/baseline-profile.json`
- `docs/immersive-motion-review/browser-chromium.json`
- `docs/immersive-motion-review/browser-webkit.json`
- `docs/immersive-motion-review/upgrade-profile.json`
- `lib/immersive/camera.ts`
- `lib/immersive/motion.ts`
- `lib/immersive/npc.ts`
- `lib/immersive/performance.ts`
- `lib/immersive/world.ts`
- `package.json`
- `scripts/profile-immersive-browser.mjs`
- `scripts/test-immersive-browser.mjs`
- `scripts/test-immersive-motion.ts`
- `scripts/test-immersive-runner.mjs`
- `scripts/test-immersive.ts`
