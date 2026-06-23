export function titleFromStoreSlug(slug?: string | null) {
  return (slug || "")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function storeNameMatchesSlug(name?: string | null, slug?: string | null) {
  const nameTokens = new Set((name || "").toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 2));
  const slugTokens = (slug || "").toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 2);
  if (!slugTokens.length || !nameTokens.size) return true;
  return slugTokens.some((part) => nameTokens.has(part));
}

export function publicStoreName(name?: string | null, slug?: string | null) {
  const cleanName = (name || "").trim();
  if (!slug) return cleanName || "Storefront";
  if (cleanName && storeNameMatchesSlug(cleanName, slug)) return cleanName;
  return titleFromStoreSlug(slug) || cleanName || "Storefront";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceStaleName(value: unknown, oldName: string, displayName: string) {
  if (typeof value !== "string" || !oldName || oldName === displayName) return value;
  return value.replace(new RegExp(escapeRegExp(oldName), "gi"), displayName);
}

function isExamplePaymentTemplate(value: unknown) {
  return typeof value === "string" && /(^|\/\/|\.)(example\.com|pay\.example\.com)(\/|$)/i.test(value);
}

export function withPublicStoreIdentity<T extends { business_name?: string | null }>(settings: T, slug?: string | null): T {
  const source = settings as T & Record<string, unknown>;
  const oldName = typeof source.business_name === "string" ? source.business_name.trim() : "";
  const displayName = publicStoreName(oldName, slug);
  const shouldReplaceName = Boolean(displayName && displayName !== oldName);
  const shouldDisableExamplePayment = isExamplePaymentTemplate(source.payment_link_template);
  if (!shouldReplaceName && !shouldDisableExamplePayment) return settings;
  return {
    ...settings,
    business_name: shouldReplaceName ? displayName : source.business_name,
    receipt_message: shouldReplaceName ? replaceStaleName(source.receipt_message, oldName, displayName) : source.receipt_message,
    whatsapp_order_template: shouldReplaceName ? replaceStaleName(source.whatsapp_order_template, oldName, displayName) : source.whatsapp_order_template,
    whatsapp_customer_confirmation_template: shouldReplaceName ? replaceStaleName(source.whatsapp_customer_confirmation_template, oldName, displayName) : source.whatsapp_customer_confirmation_template,
    whatsapp_customer_receipt_template: shouldReplaceName ? replaceStaleName(source.whatsapp_customer_receipt_template, oldName, displayName) : source.whatsapp_customer_receipt_template,
    whatsapp_driver_assigned_template: shouldReplaceName ? replaceStaleName(source.whatsapp_driver_assigned_template, oldName, displayName) : source.whatsapp_driver_assigned_template,
    whatsapp_driver_alert_template: shouldReplaceName ? replaceStaleName(source.whatsapp_driver_alert_template, oldName, displayName) : source.whatsapp_driver_alert_template,
    whatsapp_out_for_delivery_template: shouldReplaceName ? replaceStaleName(source.whatsapp_out_for_delivery_template, oldName, displayName) : source.whatsapp_out_for_delivery_template,
    payment_links_enabled: shouldDisableExamplePayment ? false : source.payment_links_enabled,
    payment_link_template: shouldDisableExamplePayment ? "" : source.payment_link_template
  };
}
