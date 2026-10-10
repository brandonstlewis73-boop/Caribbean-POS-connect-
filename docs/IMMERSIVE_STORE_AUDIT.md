# Immersive shopping audit

Baseline: 2d32ef3c032060f7e2be0075abba1c2625bbab0c. Implementation is on feature/immersive-shopping-engine, isolated from the earlier working checkout.

- Next.js 15 / React 19; Three.js 0.184, React Three Fiber 9 and Drei 10 already installed.
- Current VirtualStorefrontClient is image/video with product hotspots, not navigable 3D. Keep it available.
- Store page resolves slug to business, loads business-scoped products/settings/categories and checks the subscription feature. Reuse these, no alternate product database.
- OnlineOrderClient owns the cart, sale-price calculation, stock caps, fulfillment form and order submission. Engine receives products, quantities and add/checkout callbacks; it does not POST orders itself.
- Public order route validates input, resolves business from URL, strips client discounts/fees and forces unpaid/new. createOrder locks active tenant products FOR UPDATE, aggregates duplicate quantities, checks stock, and calculates saved prices, tax and fees server-side.
- Stock is deducted when orders complete, not reserved for pending orders. This existing policy is not a reservation guarantee; changing it requires a separate reservation/expiry design.
- Merchant checkout uses configured payment methods and configured payment links. PayPal API integration elsewhere is subscription billing, not merchant purchase capture. Reuse merchant checkout; do not claim a card charge occurred on animation or order submission.
- Audit defects: market localization rewrites currency without converting product prices; public checkout lacks paused/fulfillment/payment method guards. Scope fixes to public storefront, preserving subscription integrations.
- No existing rigged 3D assets. Use attributed CC0 Quaternius assets, prune animation tracks and compress textures. Actual world geometry is mesh-based (intentional deviation from sprite-oriented design skill), with instanced repeated fixtures and product image textures.
- Separate server-side flag IMMERSIVE_STOREFRONT_MERCHANTS defaults empty. Existing plan/merchant 3D setting must also allow entry. No query-only bypass. Production is not enabled by this branch.

## Visual specification
Warm oak, cream plaster, jade cabinetry, brass trim; over-shoulder full-body character; wide walkable aisles. Ivory compact HUD with merchant brand, Quick Shop, Settings, bag, contextual Inspect/Checkout. Mobile uses two-thumb joystick/look areas. Real prices and product labels remain readable DOM controls outside the canvas. Geometry/configuration and controls are reusable per merchant. Accessibility and reduced motion lead to conventional shopping by default.
