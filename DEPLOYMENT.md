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
DATABASE_URL=postgresql://postgres:<password>@<your-supabase-host>:6543/postgres?pgbouncer=true
SUPABASE_DB_URL=
PGSSLMODE=require
SESSION_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-or-anon-key>
ADMIN_EMAIL=admin@demo.com
DEFAULT_WHATSAPP_NUMBER=4437582368
```

Use the Supabase pooled Postgres connection string for Vercel when possible. Local development can use the direct `5432` URI.

## Supabase Setup

Run this SQL once in Supabase SQL Editor:

```text
db/supabase_schema_seed.sql
```

The seeded demo admin is:

```text
Email: admin@demo.com
Password: demo123
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
2. Log in as `admin@demo.com`.
3. Open `/pos`.
4. Complete a delivery order with `Pay on delivery`.
5. Confirm the order appears in `/orders`.
6. Confirm product stock decreased in `/inventory`.
7. Open the receipt and shipping label.
8. Confirm Waze and WhatsApp links are present.
9. Log out and confirm protected pages redirect to `/login`.

## Payments

Payment links are template-based in Settings. Replace the demo template with the live WiPay, PayPal, bank transfer, or payment provider link. Do not treat online payments as automatically paid until a real provider callback or manual verification workflow is added.

## WhatsApp And Waze

WhatsApp uses click-to-chat links only. The app does not send messages automatically.

Waze links prefer GPS latitude/longitude, then coordinates found in a shared location link, then address search.

Receipt PDFs and shipping label PDFs include Waze QR codes when a delivery navigation link exists.

## Current Checkpoint

`CHECKPOINT.md` records the final known-good Supabase QA checkpoint for this version.
