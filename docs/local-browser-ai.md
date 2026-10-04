# Local browser AI testing

Open `/ai-test` while signed in with settings access. Enter a test request and click **Download & generate** to load Qwen2.5-0.5B. This page uses only your entered text and does not fetch business records or change plan entitlements.

The model runs in a Web Worker through WebLLM. The first run downloads about 300 MB of weights plus runtime files; browser caching depends on available storage. WebGPU, a secure HTTPS connection (or localhost), and sufficient device memory are required. Compatible desktop Chrome or Edge is recommended for the initial test. Unsupported devices display a clear error. Downloads can take several minutes. Use Stop to cancel a download or generation on the test page. Closing or reloading the page also stops the worker. Startup, download, and generation have timeouts; worker failures are reported instead of leaving the button busy.

No OpenAI API calls or paid fallback remain. Existing OPENAI_API_KEY and AI_MODEL variables are ignored and can be removed from Vercel. AI_SUPPORT_ENABLED=false disables the business/support flows and owner test page. No AI key is needed.

Business tools and help chat still authenticate, enforce plan/usage restrictions, redact inputs, and prepare only the signed-in account's context on the server. Prepared requests are logged and count against existing usage limits, including cases where the device later fails to generate. Generated local drafts are displayed in the browser and are not stored in server logs. Ticket summaries use deterministic server heuristics instead of remote AI. This is local inference, not an offline version of the entire app: accounts, records, and support still require the application server.

The test model is Apache 2.0 licensed: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct. WebLLM: https://webllm.mlc.ai/. Drafts need human review. Context is bounded for device memory and may contain selected records only.

Validation includes production compilation of the worker, server tests for prompt preparation/disabled mode/secret requests/no remote inference, and a browser test for unsupported devices and mobile layout. Actual model loading and generation must be tested on a physical WebGPU device; the execution environment has no suitable GPU.

The smaller 32-bit model needs approximately 1.1 GB of GPU memory according to WebLLM’s catalog and does not require shader-f16. Drafts stream on the test page and are limited to 256 output tokens. A GPU adapter check runs before downloading weights. The smaller model trades answer quality for lower memory use; physical-device testing is still required.

Draft validation checks explicitly requested price placeholders and unsupported first-person action promises. A completed invalid draft gets one model-generated correction attempt, then an error if it still fails. This is a limited check, not a guarantee of factual accuracy or overall quality. No canned promotion is substituted for model output.

## AI Workspace

Open `/ai` and choose one of the 19 workflows available under your plan. The workspace provides a conversation area, suggested starting points, editable responses, and workflow-specific business context. Revisions include your edited response, original goal, and requested changes. Each preparation counts toward the existing AI allowance. Failed or stopped requests preserve your previous response. Switching workflows retains completed conversations in page memory; reloading clears them.

Product descriptions and promotions require selecting an actual product from the signed-in business catalog. Users with product write access can choose **Save to product** on a completed product description. The server validates authentication, role, plan, business ownership, and the original description. A transaction locks the product, updates only its description and timestamp, and records the audit event. Concurrent changes return a conflict instead of overwriting another user's work. Changing the selected product clears that conversation to prevent applying a response to the wrong product.

Results can be edited, copied, or downloaded as text. Message workflows offer **Open in WhatsApp**, which opens the result for the user to choose a recipient and send. It does not automatically send a provider message. Other workflows link to their business workspace; they do not automatically create orders, modify stock, dispatch deliveries, or save accounting entries.

Rendered-flow checks use mocked model/API responses and cover mobile/desktop layouts, all workflow choices, generation, edits, save payloads, revisions, failed-save and failed-revision recovery, clipboard, downloads, workflow retention, cancellation, and product isolation. Transaction tests verify permissions, tenant isolation, description conflicts, audit rollback, and preservation of prices and stock. Physical-device inference remains a separate check.

Catalog promotions use a focused prompt with the selected product name, saved price, and availability instead of stock-report fields. Local validation rejects inventory summaries, missing product names, price changes, unsupported discounts/scarcity, and missing invitations to reply. Invalid output receives one model-generated correction attempt; a second failure returns an error. No prewritten promotion is substituted for model output. These checks are limited and do not guarantee all claims are factual.
