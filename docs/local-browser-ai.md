# Local browser AI testing

Open `/ai-test` while signed in with settings access. Enter a test request and click **Download & generate** to load SmolLM2-360M. This page uses only your entered text and does not fetch business records or change plan entitlements.

The model runs in a Web Worker through WebLLM. The first run downloads about 250 MB of weights plus runtime files; browser caching depends on available storage. WebGPU, a secure HTTPS connection (or localhost), and sufficient device memory are required. Compatible desktop Chrome or Edge is recommended for the initial test. Unsupported devices display a clear error. Downloads can take several minutes. Use Stop to cancel a download or generation on the test page. Closing or reloading the page also stops the worker. Startup, download, and generation have timeouts; worker failures are reported instead of leaving the button busy.

No OpenAI API calls or paid fallback remain. Existing OPENAI_API_KEY and AI_MODEL variables are ignored and can be removed from Vercel. AI_SUPPORT_ENABLED=false disables the business/support flows and owner test page. No AI key is needed.

Business tools and help chat still authenticate, enforce plan/usage restrictions, redact inputs, and prepare only the signed-in account's context on the server. Prepared requests are logged and count against existing usage limits, including cases where the device later fails to generate. Generated local drafts are displayed in the browser and are not stored in server logs. Ticket summaries use deterministic server heuristics instead of remote AI. This is local inference, not an offline version of the entire app: accounts, records, and support still require the application server.

The test model is Apache 2.0 licensed: https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct. WebLLM: https://webllm.mlc.ai/. Drafts need human review. Context is bounded for device memory and may contain selected records only.

Validation includes production compilation of the worker, server tests for prompt preparation/disabled mode/secret requests/no remote inference, and a browser test for unsupported devices and mobile layout. Actual model loading and generation must be tested on a physical WebGPU device; the execution environment has no suitable GPU.

The smaller 32-bit model needs approximately 580 MB of GPU memory according to WebLLM’s catalog and does not require shader-f16. Drafts stream on the test page and are limited to 256 output tokens. A GPU adapter check runs before downloading weights. The smaller model trades answer quality for lower memory use; physical-device testing is still required.
