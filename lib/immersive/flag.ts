// Reviewed rollout: Baker Buds only. An explicit empty environment value disables
// it immediately; other merchants still require a server-side allowlist entry.
// No NEXT_PUBLIC flag or URL parameter can opt a merchant in.
export function immersiveMerchantEnabled(
  slug: string,
  existingGate: boolean,
  allowlist = process.env.IMMERSIVE_STOREFRONT_MERCHANTS ?? "baker-buds",
) {
  return (
    existingGate &&
    allowlist
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(slug.toLowerCase())
  );
}
