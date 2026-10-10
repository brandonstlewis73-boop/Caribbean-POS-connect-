// Server-side allowlist. No NEXT_PUBLIC flag and no URL parameter can opt a merchant in.
export function immersiveMerchantEnabled(
  slug: string,
  existingGate: boolean,
  allowlist = process.env.IMMERSIVE_STOREFRONT_MERCHANTS || "",
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
