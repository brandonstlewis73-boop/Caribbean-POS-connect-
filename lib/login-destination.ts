/** Only navigate to a path on this application after login. */
export function safeLoginDestination(value?: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return "/dashboard";
  }
  try {
    const base = "https://caribbean-pos-connect.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}
