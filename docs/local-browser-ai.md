# Local browser AI testing

Open `/ai-test` while signed in with settings access. Enter a test request and click **Download & generate** to load Qwen2.5-0.5B. This page uses only your entered text and does not fetch business records or change plan entitlements.

The model runs in a Web Worker through WebLLM. The first run downloads about 300 MB of weights plus runtime files; browser caching depends on available storage. WebGPU, a secure HTTPS connection (or localhost), and sufficient device memory are required. Compatible desktop Chrome or Edge is recommended for the initial test. Unsupported devices display a clear error. Downloads can take several minutes. Use Stop to cancel a download or generation on the test page. Closing or reloading the page also stops the worker. Startup, download, and generation have timeouts; worker failures are reported instead of leaving the button busy.

No OpenAI API calls or paid fallback remain. Existing OPENAI_API_KEY and AI_MODEL variables are ignored and can be removed from Vercel. AI_SUPPORT_ENABLED=false disables the business/support flows and owner test page. No AI key is needed.

Business tools and help chat still authenticate, enforce plan/usage restrictions, redact inputs, and prepare only the signed-in account's context on the server. Prepared requests are logged and count against existing usage limits, including cases where the device later fails to generate. Generated local drafts are displayed in the browser and are not stored in server logs. Ticket summaries use deterministic server heuristics instead of remote AI. This is local inference, not an offline version of the entire app: accounts, records, and support still require the application server.

The test model is Apache 2.0 licensed: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct. WebLLM: https://webllm.mlc.ai/. Drafts need human review. Context is bounded for device memory and may contain selected records only.

Validation includes production compilation of the worker, server tests for prompt preparation/disabled mode/secret requests/no remote inference, and a browser test for unsupported devices and mobile layout. Actual model loading and generation must be tested on a physical WebGPU device; the execution environment has no suitable GPU.

The smaller 32-bit model needs approximately 1.1 GB of GPU memory according to WebLLM’s catalog and does not require shader-f16. Drafts stream on the test page and are limited to 256 output tokens. A GPU adapter check runs before downloading weights. The smaller model trades answer quality for lower memory use; physical-device testing is still required.

Draft validation checks explicitly requested price placeholders and unsupported first-person action promises. A completed invalid draft gets one model-generated correction attempt, then an error if it still fails. This is a limited check, not a guarantee of factual accuracy or overall quality. No canned promotion is substituted for model output.

## Guided business workflows

Open `/ai` and choose one of the 19 workflows available under your plan. Use the suggested starting point or enter your own goal, then add up to 600 characters of extra context. Generate the workflow draft, edit it directly, or enter a requested change and choose **Revise with AI**. Revisions include the edited draft (up to 850 characters), original goal, and requested changes; each revision prepares a new authorized request and counts toward the plan's AI allowance. A failed or stopped revision restores the previous draft.

Copy the edited draft and open the linked business workspace to send or save it using that workspace's existing controls. Workflows do not automatically send messages, create orders, modify stock, dispatch deliveries, or save accounting entries. Drafts remain in page memory and are cleared when switching workflows or reloading. Stop and workflow changes cancel the active run. Context is selected by workflow category so active orders are not crowded out by a large product catalog. Plan and business access checks remain on the server.

Rendered-flow checks cover mobile/desktop selection, generation, edits, revision context, failed-revision recovery, clipboard, workspace links, cancellation, and plan locks with mocked model/API responses. Live tenant data and physical-device inference are separate checks.
