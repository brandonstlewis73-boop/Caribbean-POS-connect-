# Business dashboard workspaces

The dashboard uses a shared page-section control: tabs on desktop and a labelled selector on phones. Hidden sections stay mounted so switching sections does not discard unsaved fields. Keyboard navigation supports arrows, Home and End on desktop tabs.

- Dashboard: overview, sales, storefront, setup and quick actions.
- Inventory: catalog and product editor; editing opens the editor. Product forms separate details, pricing/stock, photos and options/supplier. Save remains outside the section switcher.
- Orders: queue and details; details separate summary, fulfillment, notifications and history/documents. Order query links open the details view.
- Settings: one card per category, with existing direct links preserved. Notifications have separate alert, WhatsApp update, template and connection views.
- Team and customer pages separate directories from profiles. Phone customer editing remains in its existing sheet.
- Reports, receipt printing, subscriptions and support have focused views. AI conversations have a bounded scrolling area on phones.
- Inventory, orders, customers, receipts, categories and team lists show six records per page. Deliveries show three stops; support guides show four. Search/filter changes reset the page and shortening a list clamps the current page.

No new sales, messages or payments are sent by the layout checks. Test routes are created temporarily by the runner and removed afterward. Test fixtures under `scripts/fixtures` are not application routes.

## POS accuracy

Catalog discount prices are applied consistently in the UI and saved order. The preview includes tax, service and delivery fees. POS fees are recomputed from business settings on the server; an expected-total check rejects a changed catalog/configuration. Client limits and transaction locks protect available stock; completion rejects negative stock. Pending orders do not reserve inventory.

Payment defaults to unpaid. Selecting a payment method records the method; it does not charge a gateway. Unsupported split payments are excluded. Disabled methods and incorrectly marked pay-on-delivery sales are rejected server-side.

Each POS save includes a UUID idempotency key. An unchanged retry reuses it. The transaction locks the business/user/key, stores its payload hash in the existing order audit metadata, and returns the saved order on retry without repeating stock movements or notifications. A reused key with a different payload is rejected. If a connection fails, check Orders before changing the sale.

Phone lookup uses the full normalized number. The camera scanner falls back to ZXing when native BarcodeDetector is unavailable; the camera policy permits same-origin use. Scanner tests decode a generated QR video stream and verify that the track stops afterward. A physical iPhone camera still needs device testing.

## Business exports

Business backup exports are scoped to the authenticated business, including related order/customer rows. Global settings and password hashes are excluded. The export runs in a read-only repeatable-read transaction and is served with private/no-store caching. Non-functional account reset/cancellation controls were replaced with support and subscription management links.

## Validation

```sh
npm run test:pos
npm run test:backup
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers npm run test:dashboard
npm run build
npm run typecheck
```

The browser runner requires an installed Playwright Chromium and a free localhost port 3040. It checks 14 dashboard page fixtures, mobile section selection, 320/390/430px page overflow, pagination/search reset, retained product edits, settings links, desktop keyboard tabs, scanner fallback and POS retry behavior. Screenshots are written to `/tmp/caribbean-layout-review`.

These checks use mocked API responses and synthetic records; they do not establish that a merchant's physical printer, payment provider or WhatsApp sender is configured.
