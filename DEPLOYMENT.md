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
Email: admin@caribbeanpos.test
Password: Admin123!
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
