import { readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 2 * 1024 * 1024;

export function trustedReceiptLogoUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    const hosts = new Set<string>();
    for (const configured of [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
      if (configured) hosts.add(new URL(configured).hostname);
    }
    for (const host of (process.env.RECEIPT_LOGO_ALLOWED_HOSTS || "").split(",")) {
      if (host.trim()) hosts.add(host.trim().toLowerCase());
    }
    return hosts.has(url.hostname) ? url : null;
  } catch { return null; }
}

export async function createLogoBuffer(logoUrl?: string | null) {
  const value = logoUrl?.trim();
  if (!value || value.length > Math.ceil(MAX_BYTES * 4 / 3) + 128) return null;
  if (value.startsWith("data:image/")) {
    const match = value.match(/^data:image\/(png|jpe?g);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) return null;
    const buffer = Buffer.from(match[2], "base64");
    return buffer.length && buffer.length <= MAX_BYTES ? buffer : null;
  }
  if (value.startsWith("/") && !value.startsWith("//") && /\.(png|jpe?g)$/i.test(value)) {
    try {
      const publicRoot = await realpath(path.join(process.cwd(), "public"));
      const candidate = await realpath(path.resolve(publicRoot, `.${value}`));
      if (!candidate.startsWith(`${publicRoot}${path.sep}`)) return null;
      const info = await stat(candidate);
      if (!info.isFile() || info.size > MAX_BYTES) return null;
      return await readFile(candidate);
    } catch { return null; }
  }
  const url = trustedReceiptLogoUrl(value);
  if (!url) return null;
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok || !/^image\/(png|jpe?g)(?:;|$)/i.test(response.headers.get("content-type") || "")) return null;
    if (Number(response.headers.get("content-length")) > MAX_BYTES) { await response.body?.cancel(); return null; }
    if (!response.body) return null;
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        bytes += chunk.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); return null; }
        chunks.push(Buffer.from(chunk));
      }
      return bytes ? Buffer.concat(chunks) : null;
    } finally { reader.releaseLock(); }
  } catch { return null; }
}
