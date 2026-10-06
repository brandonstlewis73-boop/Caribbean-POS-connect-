const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WEBHOOKS = new Set(["/api/paypal/webhook", "/api/stripe/webhook"]);

export function unsafeRequestReason(request: Request, pathname = new URL(request.url).pathname) {
  if (SAFE_METHODS.has(request.method) || WEBHOOKS.has(pathname)) return null;
  if (request.headers.get("sec-fetch-site") === "cross-site") return "Cross-site requests are not allowed.";
  const origin = request.headers.get("origin");
  if (!origin) return null; // Non-browser clients; routes still enforce authentication/signatures.
  try {
    const allowed = new Set([new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin]);
    // Vercel previews have their own trusted, deployment-provided origin.
    if (process.env.VERCEL_URL) allowed.add(new URL(`https://${process.env.VERCEL_URL}`).origin);
    if (process.env.VERCEL_BRANCH_URL) allowed.add(new URL(`https://${process.env.VERCEL_BRANCH_URL}`).origin);
    if (!allowed.has(new URL(origin).origin)) return "Cross-site requests are not allowed.";
  } catch {
    return "Invalid request origin.";
  }
  return null;
}

export async function readBoundedJson(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
