# Caribbean POS Connect

Caribbean POS Connect is a full-stack POS, customer management, inventory, orders, delivery, Waze, WhatsApp, loyalty, receipts, reporting, and storefront system for businesses in Trinidad and Tobago.

The app now runs as a Supabase/Postgres-backed production app with no in-memory fallback.

## Tech Stack

- Next.js App Router and React
- Tailwind CSS
- Next.js API routes on Node.js
- Supabase/Postgres via `pg`
- Hashed passwords with `bcryptjs`
- HTTP-only session cookies with `jose`
- PDF receipts and shipping labels with `pdfkit`
- Waze QR codes with `qrcode`
- Charts with `recharts`
- Optional 3D storefront with `three` and `@react-three/fiber`

## Run Locally

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

On Windows PowerShell, `npm.ps1` may be blocked by execution policy. Use `npm.cmd` directly if needed:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Start the local web app:

```bash
npm run dev
```

The dev server binds to `0.0.0.0` for phone/tablet testing on the same Wi-Fi network. You can also run the explicit LAN script:

```bash
npm run dev:lan
```

Open:

```text
http://localhost:3000/login
```

From another device on the same network, open:

```text
http://YOUR_LOCAL_IP:3000/login
```

On Windows, allow Node.js/Next.js through Windows Defender Firewall when prompted for private networks.

## Required Environment Variables

Put these in `.env.local` for local development and in Vercel Project Settings -> Environment Variables for deployment:

```text
DATABASE_URL=postgresql://postgres.<project-ref>:<database-password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify
SUPABASE_DB_URL=
PGSSLMODE=require
SESSION_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-or-anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
SUPABASE_STORAGE_BUCKET=product-images
ADMIN_EMAIL=admin@example.com
AI_SUPPORT_ENABLED=true
DEFAULT_COUNTRY_CODE=+1868
DEFAULT_COUNTRY=TT
GEOCODING_PROVIDER=fallback
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
SMS_PROVIDER=
EMAIL_PROVIDER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
```

Notes:

- `DATABASE_URL` is required for real Supabase mode.
- `SUPABASE_DB_URL` is an optional fallback if you prefer that name.
- Use the Supabase transaction pooler URI on port `6543` for Vercel and for local LAN testing.
- Do not use the direct Supabase Postgres URI on port `5432` for production.
- `SESSION_SECRET` should be a long random value before production use.
- Product photo uploads require `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=product-images`, and the `product-images` storage bucket. Never expose the service role key in frontend code.
- 3D Storefront is a Premium/Enterprise feature. It is off by default, lazy-loaded on the public storefront, and falls back to normal shopping when WebGL is unavailable.
- Leave WhatsApp provider variables blank to keep orders working with safe "WhatsApp is not configured" logs.
- Stripe billing uses Checkout Sessions and the Customer Portal. Add `STRIPE_SECRET_KEY`, one Stripe Price ID per paid plan, and `STRIPE_WEBHOOK_SECRET` after creating a webhook endpoint for `/api/stripe/webhook`.
- Never commit `.env.local`.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run:

```text
db/supabase_schema_seed.sql
```

That file creates:

- `businesses`
- `staff_users`
- `categories`
- `products`
- `customers`
- `orders`
- `order_items`
- `payments`
- `inventory_logs`
- `subscriptions`
- `settings`
- plus receipt, loyalty, delivery event, audit log, and compatibility objects used by the app

4. In Supabase Project Settings -> Database, copy the Postgres connection string into `DATABASE_URL`.
5. In Supabase Project Settings -> API, copy the project URL and publishable/anon key into:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=product-images
```

6. For product photo uploads, run this storage setup SQL in Supabase SQL Editor:

```text
db/product_images_storage.sql
```

This creates a public `product-images` bucket for direct storefront image display. Uploads, replacements, and deletes still happen only through the server API using `SUPABASE_SERVICE_ROLE_KEY`, and object paths are scoped as `businesses/{businessId}/products/{productId}/...`.

7. In Vercel, open Project -> Settings -> Environment Variables and add these to Production (and Preview if you test preview deployments):

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-api-settings>
SUPABASE_STORAGE_BUCKET=product-images
```

Redeploy after saving the Vercel environment variables. Old deployments will not see new values.

## Initial Login Credentials

For a fresh database seeded with `db/supabase_schema_seed.sql`:

```text
Create an owner account at /signup. No default administrator password is created.
For controlled local bootstrap only, set BOOTSTRAP_ADMIN_PASSWORD to a unique password of at least 12 characters.
```

Change the seeded owner password before using the app for a real business, or sign up through the business owner signup flow.

## Test Checkout

Manual test:

1. Log in at `/login` with a real owner/admin account.
2. Go to `/pos`.
3. Add a product to the cart.
4. Add customer details, including phone, address, city, country, and delivery notes.
5. Choose `Delivery` and `Pay on delivery`.
6. Complete the sale.
7. Confirm:
   - A receipt is generated.
   - The order appears in `/orders`.
   - Inventory stock decreases.
   - Customer history updates.
   - Waze, WhatsApp business, and WhatsApp customer links are generated.

Automated Supabase QA:

```bash
npm run qa:supabase
```

This script logs in, checks core pages and APIs, creates a real checkout order in Supabase, verifies inventory movement, verifies the receipt endpoint, saves settings, and checks logout behavior.

## Current Working Checkpoint

See:

```text
CHECKPOINT.md
```

The latest passing Supabase QA run verified login, dashboard, products, customers, POS checkout, receipt generation, orders, settings, inventory updates, and logout using real Supabase data.

## Vercel Deployment

This project includes `vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build"
}
```

Deploy steps:

1. Push this project to a GitHub repository.
2. Import the repo in Vercel.
3. Set Framework Preset to `Next.js`.
4. Add the environment variables listed above.
5. Set `NEXT_PUBLIC_APP_URL` to the final Vercel or custom domain URL.
6. Deploy.
7. After deployment, log in with the seeded admin account and run a checkout test.

Recommended production settings:

- Use a Supabase pooled Postgres connection string for `DATABASE_URL`.
- Enable Supabase backups.
- Replace `SESSION_SECRET`.
- Replace placeholder payment link templates with real WiPay, PayPal, bank transfer, or payment provider links.
- Keep WhatsApp as click-to-chat unless a WhatsApp Business API integration is added.

## Build And Typecheck

Run:

```bash
npm run typecheck
npm run build
```

Known local limitation:

- On this HP Windows laptop, PowerShell may block `npm.ps1`.
- TypeScript needed a larger Node heap locally.
- The project scripts now run typecheck and build with `--max-old-space-size=2048`.
- If PowerShell blocks `npm`, run the command through `npm.cmd`.

## Main Routes

- `/login`
- `/`
- `/dashboard`
- `/pos`
- `/printer`
- `/orders`
- `/customers`
- `/staff`
- `/categories`
- `/inventory`
- `/products`
- `/deliveries`
- `/reports`
- `/ai`
- `/settings`
- `/subscription`
- `/track`
- `/online`
- `/privacy`
- `/contact`

## Waze And WhatsApp

Delivery orders generate Waze links:

```text
https://waze.com/ul?ll=LATITUDE,LONGITUDE&navigate=yes
https://waze.com/ul?q=ENCODED_ADDRESS&navigate=yes
```

Receipts and shipping labels include Waze QR codes when a delivery navigation link exists.

WhatsApp support has two layers:

- Server-side automatic sending through Twilio WhatsApp when provider credentials are configured.
- Safe click-to-chat links on orders and receipts so checkout still works when provider credentials are missing.

```text
https://wa.me/BUSINESS_PHONE_NUMBER?text=ENCODED_ORDER_MESSAGE
https://wa.me/CUSTOMER_PHONE_NUMBER?text=ENCODED_CUSTOMER_MESSAGE
```

The app cleans Trinidad and Tobago phone numbers before building WhatsApp links and automatic WhatsApp recipients.

## AI Business OS

- `/ai` adds AI workflows for WhatsApp ordering, missed calls, product descriptions, promos, slow-day sales boosts, loyalty, inventory forecasts, prep lists, delivery dispatch, delay detection, business coaching, profit advice, review replies, onboarding, SaaS support, receipt/expense review, Caribbean business mode, and smart checkout upsells.
- AI drafts run locally in the browser through WebLLM (Qwen3-1.7B), with no paid API fallback. Business context remains scoped to the logged-in account. Owners can test with `/ai-test`; see [local AI setup](docs/local-browser-ai.md).
- AI outputs are drafts only. Staff must review before sending, saving, posting, or applying anything.
- AI usage is plan-gated and counted in monthly AI generation usage.
- Apply AI logging with `npm run db:ai-logs` or run `db/add_ai_business_logs.sql` in Supabase SQL Editor.

## Categories, Orders, And Tracking

- `/categories` lets each business add, edit, hide/show, delete, search, and reorder its own product categories.
- Inventory items can be assigned to categories and can store barcode, image, description, discount price, variations, add-ons, and availability.
- Orders support the workflow `New -> Accepted -> Preparing -> Ready -> Out for Delivery/Pickup Ready -> Completed` plus `Cancelled`.
- Every status change writes to `order_status_history` and creates safe customer notification records in `customer_notifications`.
- `/track` is the public order tracking page. Customers enter order number and phone number to see order status, items, business contact details, maps links, and the status timeline.

## Optional Test Data

For a separate Irie Munchies test business with Caribbean food categories and sample orders, run this file manually in Supabase SQL Editor after the main schema:

```text
db/irie_munchies_test_data.sql
```

This file is not part of the default production seed.

## Privacy And Safety

- Passwords are hashed before storage.
- Sessions use HTTP-only cookies.
- API routes enforce authentication and role permissions.
- Driver users only see assigned deliveries.
- Marketing consent is captured on customer forms.
- Admin and business mutations write audit logs.
- Customer data should be handled under the privacy notice in `/privacy`.

Security upgrade deployment prerequisites and remaining work are documented in [DEPLOYMENT.md](DEPLOYMENT.md#security-upgrade-rollout-october-2026).
