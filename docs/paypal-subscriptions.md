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
