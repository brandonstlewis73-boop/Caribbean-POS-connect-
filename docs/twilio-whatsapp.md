# Twilio WhatsApp delivery

The app sends WhatsApp through the standard Twilio Programmable Messaging Messages API. It records the Message SID, initial provider state, and final callbacks. Queued is not delivered. Orders → select an order → **Check delivery** queries Twilio directly for that business's stored message attempts and displays error codes and next steps. This does not send another message.

Callbacks are attached per message at `/api/whatsapp/status?attempt=<id>`. The route validates `X-Twilio-Signature` against the configured public URL and `TWILIO_AUTH_TOKEN`, verifies AccountSid, and binds the callback to the stored message. Duplicate and late callbacks cannot downgrade delivered/read states. Private attempt rows have RLS enabled and no public grants/policies; only server database access can reach them. No credentials are returned by these endpoints. Callback delivery is best effort; Check delivery provides reconciliation.

Customer confirmation, accepted, preparing, ready, cancelled, completed, and delivery updates are dispatched after the order transaction commits. Customer opt-outs, enabled status flags, and plan gates remain effective. Receipt sent timestamps are recorded after sent/delivered/read states rather than on a queued acknowledgement. Provider failures are visible alongside order notifications. Owner/driver messages are separately tracked, not exposed on the public customer tracking response. In-memory and database dedupe prevent repeat sends during the ten-minute window. Failed attempts can be retried.

**Retry customer update** requires order update permission, business ownership, WhatsApp plan allowance, customer consent, enabled notifications, and a failed/skipped current-status notification. It sends the saved update to the saved customer number. It cannot accept arbitrary message text or destinations. A second simultaneous retry cannot reset an already queued notification. Retry after fixing the sandbox/window/template problem; repeated failure does not bypass WhatsApp rules.

## Sandbox testing

In WhatsApp, send the current `join <code>` from Twilio Console to `+14155238886`. Sandbox membership expires after three days. Send a fresh message (such as Hi) to the sandbox sender to reopen the 24-hour service window before testing free-form order messages. The phone must be WhatsApp-enabled. Trial-account restrictions may also apply.

Error 63015 is a sandbox membership issue. Error 63016 is a 24-hour window/template issue, not the same error. Error 63055 means a non-marketing message was routed through Marketing Messages Lite; utility order updates must use the WhatsApp Cloud API route. Do not relabel order updates as marketing to evade routing rules. Check sender routing with Twilio if this error persists through the standard Messages API.

## Production utility templates

Free-form Body messages work only within 24 hours of the recipient's last inbound message. For proactive order updates outside that window, register a production WhatsApp sender and obtain Meta approval for an appropriate utility template in Twilio Content Template Builder. The app cannot grant approval or bypass sender/account restrictions.

Set `TWILIO_CUSTOMER_ORDER_STATUS_CONTENT_SID` in Vercel Production to the approved HX Content SID, then redeploy. This is optional; without it, customer updates use Body mode. When configured, the app uses ContentSid and ContentVariables instead of Body for queued customer status notifications. Variables must match the approved template exactly:

| Variable | Value |
|---|---|
| 1 | Customer name |
| 2 | Business name |
| 3 | Order number |
| 4 | Current order status |
| 5 | Customer tracking URL |

Example utility template: `Hi {{1}}, order #{{3}} from {{2}} is {{4}}. Track your order: {{5}}`. This example is not an approved Content SID. Sender registration and template approval happen in the Twilio/Meta account. Owner/driver alerts and generic settings tests currently remain free-form and need an open service window or separate approved templates. Saved free-form text templates do not override an approved provider template.

Required credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM. NEXT_PUBLIC_APP_URL must be the stable HTTPS production domain so callbacks can validate the exact signed URL. Do not paste Auth Tokens into chat or put them in public environment variables.

Apply `db/patches/whatsapp-delivery.sql` before deploying. The Supabase production migration was applied and verified. Known Message SIDs for test order #1061 were recovered from the app's Twilio acknowledgement logs so Check delivery can reconcile them; their final delivery was not inferred from queue acknowledgements.

Validation: `node --conditions=react-server --import tsx scripts/test-twilio-delivery.ts`, typecheck, production build, and mocked browser UI tests. Coverage includes queued/delivered differences, signature tampering, callback order/replay, message ownership, tenant scope, database dedupe, accepted-status dispatch, no retry of a non-failed update, template request shape, optional template validation, and mobile widths. Tests make no real Twilio sends. Live delivery needs a recipient with an open window or an approved template and the final provider status.
