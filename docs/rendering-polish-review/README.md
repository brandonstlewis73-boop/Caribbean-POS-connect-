# Rendering polish and mobile geometry budget

Feature branch: `feature/store-rendering-polish`. Production checkout, inventory and payment integrations are unchanged.

Changes:
- Mobile plants use a 4,198-triangle derivative instead of 12,379 triangles; full-detail foliage remains in higher quality.
- A single instanced contact-shading pass grounds counters and shelving (one draw call, 14 triangles); no additional shadow camera.
- Marble counters now receive the intended procedural veins/bump. Floor anisotropy improves angled texture clarity and lighting is less washed out.
- GPU submissions are paced to 30 FPS in battery saver and 60 FPS in higher quality while input, collision simulation and animation continue on the animation loop. These are caps, not guaranteed device frame rates.
- Resolution recovery accounts for the selected frame budget. Telemetry measures submitted frame intervals rather than skipped animation frames.

Mobile Chromium fixture: 53,752 triangles versus 70,100 before (23.3% reduction), 60 draw calls versus 59. Asset transfer is 2,269,882 bytes; estimated owned GPU memory is 45.9 MB. Memory is an estimate, not driver-reported VRAM. See `chromium.json` for the complete run including the desktop quality-switch snapshot.

Physical iPhone testing remains necessary for sustained frame rates, heat/battery usage, memory pressure and visual quality on Retina screens. Headless software rendering cannot establish 30/60 FPS on hardware. The captured software-renderer timings must not be represented as iPhone benchmarks.

Validation: immersive/cart/inventory/checkout unit suites, POS suites, scoped ESLint, Chromium and Linux WebKit browser suites pass. Browser coverage includes keyboard/touch movement, wardrobe, sold-out handling, shared cart, pickup checkout, context loss, unavailable WebGL and reduced motion. An initial Chromium keyboard movement assertion failed; a complete rerun and the WebKit run passed. No real order was placed.

The profile script now labels animation-loop cadence separately from renderer FPS, because skipped GPU frames must not be counted as rendered frames.

Production build and TypeScript check pass. Build reports only the two existing unused notification-helper warnings in `app/actions.ts`.

Settled six-second software-renderer profile (`profile.json`): phone renderer snapshot 16 FPS, p95 86.1 ms, GPU sample 64.52 ms, 61 calls and 55,754 triangles after switching to knitwear; desktop snapshot 6 FPS, p95 259.2 ms, 91 calls and 56,110 triangles after automatic quality fallback. The prior phone snapshot was 15 FPS/p95 86.9 ms; this run does not establish a significant sustained FPS improvement. The desktop remains costly in this software environment. Profile captures had no page errors. Physical-device acceptance is still outstanding.
