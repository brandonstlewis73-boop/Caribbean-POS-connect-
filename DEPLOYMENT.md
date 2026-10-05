# Caribbean POS Connect Deployment

## Vercel Checklist

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Use the `Next.js` framework preset.
4. Keep the default install command from `vercel.json`: `npm install`.
5. Keep the default build command from `vercel.json`: `npm run build`.
6. Add the production environment variables.
7. Deploy.
8. Log in and run a live checkout smoke test.

## Required Vercel Environment Variables

```text
DATABASE_URL=postgresql://postgres.<project-ref>:<database-password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify
SUPABASE_DB_URL=
PGSSLMODE=require
SESSION_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-or-anon-key>
ADMIN_EMAIL=admin@example.com
OPENAI_API_KEY=
AI_MODEL=gpt-5
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

Use the Supabase transaction pooler connection string for Vercel. For this project, the host should end with `pooler.supabase.com:6543`; do not use the direct `db.<project-ref>.supabase.co:5432` host for production.

AI tools require `OPENAI_API_KEY` in Vercel Production environment variables. `AI_MODEL` defaults to `gpt-5`, and `AI_SUPPORT_ENABLED=true` enables AI support and AI Business OS tools after a fresh redeploy.

After deploying AI tools, apply the AI logging migration with `npm run db:ai-logs` from a trusted machine that has `DATABASE_URL`, or run `db/add_ai_business_logs.sql` in Supabase SQL Editor.

Stripe billing requires Product Prices in Stripe for Starter, Pro, Premium, and optionally Enterprise. Set those price IDs in Vercel, add a Stripe webhook that points to `https://your-domain.com/api/stripe/webhook`, copy the signing secret into `STRIPE_WEBHOOK_SECRET`, then redeploy so production can start Checkout and sync subscription status. Enable these Stripe webhook events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.

## Supabase Setup

Run this SQL once in Supabase SQL Editor:

```text
db/supabase_schema_seed.sql
```

The initial owner/admin account for a fresh seeded database is:

```text
Create an owner account at /signup. No default administrator password is created.
For controlled local bootstrap only, set BOOTSTRAP_ADMIN_PASSWORD to a unique password of at least 12 characters.
```

Change seeded passwords before real production use.

## Domain Setup

In Vercel:

1. Open Project -> Settings -> Domains.
2. Add your custom domain.
3. Copy Vercel's DNS records.
4. Add those records at your domain registrar.
5. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain.
6. Redeploy after DNS is verified.

## Post-Deploy Smoke Test

1. Visit `/login`.
2. Log in with a real owner/admin account.
3. Open `/pos`.
4. Complete a delivery order with `Pay on delivery`.
5. Confirm the order appears in `/orders`.
6. Confirm product stock decreased in `/inventory`.
7. Open the receipt and shipping label.
8. Update the order through Accepted, Preparing, Ready, Out for Delivery or Pickup Ready, and Completed.
9. Confirm Waze/Google Maps links, WhatsApp links, receipt generation, and `/track` status history are present.
10. Log out and confirm protected pages redirect to `/login`.

## Payments

Payment links are template-based in Settings. Replace placeholder templates with the live WiPay, PayPal, bank transfer, or payment provider link. Do not treat online payments as automatically paid until a real provider callback or manual verification workflow is added.

## WhatsApp And Waze

WhatsApp can send automatically when provider credentials are configured. If credentials are missing, order and receipt workflows still save normally.

Waze links prefer GPS latitude/longitude, then coordinates found in a shared location link, then address search.

Receipt PDFs and shipping label PDFs include Waze QR codes when a delivery navigation link exists.

## Order Workflow

Business users can manage orders through New, Accepted, Preparing, Ready, Out for Delivery/Pickup Ready, Completed, and Cancelled. Each status change is saved in `order_status_history` and customer notification records are saved in `customer_notifications`; WhatsApp/SMS/email providers can be enabled later without changing the order workflow.

## Current Checkpoint

`CHECKPOINT.md` records the final known-good Supabase QA checkpoint for this version.


## Security upgrade rollout (October 2026)

Apply `db/security_rate_limits.sql` with the trusted backend database role **before** deploying this branch. Missing counters intentionally return 503 for login/signup/tracking/public order/geocoding requests rather than silently disabling protection. The backend role must own the table or have the required access; the table has RLS and no public grants. Configure a daily database maintenance job to delete expired rows as shown in the migration.

Set `SESSION_SECRET` to a cryptographically random value of at least 32 bytes (for example, `openssl rand -base64 48`). Keep it server-only. The new JWT format invalidates prior cookies, so users must sign in again. Password changes now invalidate existing sessions immediately. Reset any existing staff account that was created with the old shared password; the staff editor accepts a new password. Audit existing bootstrap administrator accounts and reset or disable them. No administrator is automatically created unless `BOOTSTRAP_ADMIN_PASSWORD` is explicitly configured.

Confirm `NEXT_PUBLIC_APP_URL` is the correct public origin. Vercel preview and branch origins supplied by Vercel are also allowed for same-site browser writes. Signature-verified PayPal/Stripe webhooks remain exempt from browser origin checks.

Supply the Supabase server root certificate as `PGSSL_CA` (PEM, either real newlines or escaped `\n`) to enable certificate and hostname verification. Download it from your project's Database settings. Existing Supabase/no-verify connections retain the compatibility fallback until this certificate is configured; encryption alone does not authenticate the database server. Validate with authenticated `/api/health?details=1`. Anonymous `/api/health` is liveness only, not a database readiness check.

Receipt logos uploaded in Settings continue to use inline data. Remote receipt logos must use the configured Supabase hostname or an explicitly trusted hostname in the server-only comma-separated `RECEIPT_LOGO_ALLOWED_HOSTS`. Redirects, credentials in URLs, insecure HTTP, and unapproved hosts are rejected; missing logos never block receipt generation.

Validate signup/login, staff creation and password rotation, tenant boundaries, POS checkout, storefront ordering, receipt printing, subscription return flows and real webhooks on a preview with a test database before merging. Password recovery still has no email delivery or reset-token flow and requires a separate implementation. Review Supabase RLS/storage policies, deployment environment secrets, and Vercel WAF/access controls in the connected production services; repository tests cannot verify their live state.

Dependency audit after the upgrade: zero reported production vulnerabilities. Seven high advisories remain in development tooling (`braces` and affected Tailwind 3/glob/Next ESLint dependencies); they require a Tailwind/tooling migration. Keep untrusted glob patterns out of build inputs. CI gates production dependency advisories and Dependabot checks npm and Actions weekly.

Validation completed locally: optimized build, typecheck, lint (two existing unused-function warnings), security regressions, Postgres-engine atomic rate limits/session revocation, billing, tenant isolation, POS, backup, local AI and map links. Rendered browser checks passed for all 14 dashboard pages at phone widths, POS barcode/camera/layout/quantity controls, free receipt sharing, customer opt-outs and AI availability replies without device GPU support. These use test fixtures and mocked APIs, not live customer orders or paid messaging. The live Supabase rate-limit table has been provisioned, its public-role grants revoked, and an active daily cleanup scheduled at 03:17 UTC. Production release remains contingent on a strong SESSION_SECRET being saved in Vercel; plugin environment-variable access returned 403.
