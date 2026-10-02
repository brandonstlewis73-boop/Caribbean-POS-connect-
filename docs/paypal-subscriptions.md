# PayPal subscription checkout

Only the application subscription plans use PayPal. Merchant storefront payments are unchanged. New Stripe checkout returns HTTP 410. Legacy Stripe portal and webhooks remain for existing subscribers; cancel their old subscription before opening PayPal checkout to avoid duplicate billing.

## Vercel configuration

Use a PayPal Business account and create a REST app. Set server-only PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENVIRONMENT (sandbox or live), and a strong stable SESSION_SECRET. Set NEXT_PUBLIC_APP_URL to the canonical HTTPS application URL.

Create three ACTIVE indefinite monthly USD plans with exactly one REGULAR billing cycle, no trial cycles or setup fees: Starter $29, Business $79, Pro $149. Set PAYPAL_STARTER_PLAN_ID, PAYPAL_PREMIUM_PLAN_ID, PAYPAL_PRO_PLAN_ID to the matching plan IDs. The server validates these prices against the application before checkout. Sandbox and live apps, plans, and webhooks must use the same environment.

Register https://caribbean-pos-connect.vercel.app/api/paypal/webhook on that PayPal app. Subscribe to BILLING.SUBSCRIPTION.CREATED, ACTIVATED, UPDATED, CANCELLED, SUSPENDED, EXPIRED, PAYMENT.FAILED and PAYMENT.SALE.COMPLETED and DENIED. Store the returned webhook ID, then redeploy.

## Verification before accepting payments

In sandbox, subscribe with a sandbox buyer and confirm the USD amount. Approval without a confirmed first payment must not grant paid access. Verify the return and signed webhook activate the correct business. Cancel and suspend subscriptions and confirm paid access ends. Retry webhook delivery and checkout; verify no duplicate subscription. Test that another business cannot confirm or change the subscription. Repeat with the live configuration before advertising paid checkout.

Signed checkout references bind provider subscriptions to durable database attempts. The business row serializes checkout reservation and synchronization. A pending checkout only supports its original plan. PayPal request IDs reuse the same creation request; attempts older than 48 hours require support reset to avoid retries outside PayPal's idempotency retention period. Support must verify and cancel any provider agreement before clearing pending metadata. Configuration secrets must be entered in Vercel, never in chat or public client variables.

PayPal management opens the buyer's automatic-payments page. Cancellation, suspension, and payment failure remove paid entitlement when the verified provider state is synchronized. The app does not automatically migrate existing Stripe agreements.

## Create the billing resources automatically

The setup script creates or reuses the product, the three monthly plans, and the webhook. It does not charge a buyer. Run it locally with the PayPal app credentials in your environment or an ignored environment file. Use sandbox first, then a separate live app.

```sh
# .env.paypal-private: local file containing client ID, client secret, environment, and HTTPS app URL
# Keep this file private. It is ignored by Git.
node --env-file=.env.paypal-private scripts/setup-paypal.mjs
# After reviewing the dry-run:
node --env-file=.env.paypal-private scripts/setup-paypal.mjs --apply
# Live resources require PAYPAL_ENVIRONMENT=live and both flags:
node --env-file=.env.paypal-private scripts/setup-paypal.mjs --apply --live
```

The script writes `.env.paypal-setup.sandbox` or `.env.paypal-setup.live` with non-secret plan IDs and webhook ID. It refuses to reuse existing plans with different prices or multiple matching plans/webhooks. Copy the generated values and app credentials into Vercel project Settings → Environment Variables, using Preview for sandbox and Production for live. Keep the same SESSION_SECRET already configured for each environment. Redeploy after any variable changes.

The Preview deployment also needs its own DATABASE_URL or SUPABASE_DB_URL and SESSION_SECRET to test signup and subscription checkout. Its NEXT_PUBLIC_APP_URL must match the stable preview URL used by the PayPal webhook. Production already has a working database; preview variables are configured separately.
