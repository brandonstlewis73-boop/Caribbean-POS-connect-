import { money } from "./constants";
import { buildAddress } from "./waze";
import type { Order, Settings } from "./types";

export function cleanWhatsAppNumber(input?: string | null, defaultCountryCode = "1868") {
  const normalizedDefault = String(defaultCountryCode || "1868").replace(/[^\d]/g, "");
  const countryPrefix = normalizedDefault === "1" ? "1868" : normalizedDefault || "1868";
  let digits = String(input ?? "").replace(/[^\d]/g, "");

  if (digits.length === 7) {
    digits = `${countryPrefix}${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 10 && !digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 8 && digits.startsWith("1")) {
    digits = `${countryPrefix}${digits.slice(1)}`;
  }

  return digits;
}

export function normalizeWhatsAppNumber(input?: string | null, defaultCountryCode = "+1868") {
  const normalizedDefault = String(defaultCountryCode || "+1868").replace(/[^\d]/g, "") || "1868";
  const countryPrefix = normalizedDefault === "1" ? "1868" : normalizedDefault;
  let digits = String(input ?? "").trim();
  if (!digits) return "";

  if (digits.startsWith("+")) {
    return `+${digits.slice(1).replace(/[^\d]/g, "")}`;
  }

  digits = digits.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 7) return `+${countryPrefix}${digits}`;
  if (digits.length === 10 && digits.startsWith("868")) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1868")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

export function formatTwilioWhatsAppNumber(input?: string | null, defaultCountryCode = "+1868") {
  const normalized = normalizeWhatsAppNumber(input, defaultCountryCode);
  return normalized ? `whatsapp:${normalized}` : "";
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string, defaultCountryCode = "1868") {
  const clean = cleanWhatsAppNumber(phone, defaultCountryCode);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function orderDashboardLink(order: Order) {
  const base = appBaseUrl();
  return base ? `${base}/orders?order=${encodeURIComponent(order.id)}` : "/orders";
}

function typeLabel(order: Order) {
  if (order.order_type === "delivery") return "Delivery";
  if (order.order_type === "pickup") return "Pickup";
  if (order.order_type === "online") return "Online";
  if (order.order_type === "draft") return "Draft";
  return "In-store";
}

function statusLabel(value?: string | null) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
}

function orderItemsText(order: Order, settings: Settings) {
  return order.items
    .map((item) => `${item.quantity} x ${item.product_name} - ${money(item.line_total, settings.currency)}`)
    .join("\n");
}

function applyOrderTokens(template: string, order: Order, settings: Settings) {
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  return template
    .replaceAll("{{business_name}}", settings.business_name)
    .replaceAll("{{business_phone}}", settings.business_phone || "")
    .replaceAll("{{order_number}}", order.order_number)
    .replaceAll("{{receipt_number}}", order.order_number)
    .replaceAll("{{customer_name}}", customer.name || "Walk-in customer")
    .replaceAll("{{customer_phone}}", customer.phone || "")
    .replaceAll("{{order_type}}", typeLabel(order))
    .replaceAll("{{address}}", address)
    .replaceAll("{{items}}", orderItemsText(order, settings))
    .replaceAll("{{total}}", money(order.total, settings.currency))
    .replaceAll("{{payment_method}}", order.payment_method)
    .replaceAll("{{payment_status}}", order.payment_status)
    .replaceAll("{{order_status}}", statusLabel(order.status))
    .replaceAll("{{delivery_status}}", statusLabel(order.delivery_status))
    .replaceAll("{{driver_name}}", order.assigned_driver_name || "Your driver")
    .replaceAll("{{driver_phone}}", order.assigned_driver_phone || "Not provided")
    .replaceAll("{{date_time}}", formatDateTime(order.created_at))
    .replaceAll("{{completed_at}}", formatDateTime(order.completed_at))
    .replaceAll("{{payment_link}}", order.payment_link || "")
    .replaceAll("{{location_link}}", order.delivery_location_link || "")
    .replaceAll("{{waze_link}}", order.waze_link || "")
    .replaceAll("{{dashboard_link}}", orderDashboardLink(order))
    .replaceAll("{{receipt_message}}", settings.receipt_message || "Thank you for shopping with us.");
}

export function buildOrderWhatsAppMessage(order: Order, settings: Settings) {
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  const items = orderItemsText(order, settings);

  const template = settings.whatsapp_order_template?.trim();
  if (template) {
    return applyOrderTokens(template, order, settings);
  }

  return [
    `New Order - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${customer.name || "Walk-in customer"}`,
    `Phone: ${customer.phone || "Not provided"}`,
    customer.email ? `Email: ${customer.email}` : null,
    `Type: ${typeLabel(order)}`,
    address ? `Address: ${address}` : null,
    customer.delivery_notes ? `Instructions: ${customer.delivery_notes}` : null,
    "",
    "Items:",
    items,
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method}`,
    `Payment status: ${order.payment_status}`,
    `Order status: ${statusLabel(order.status)}`,
    `Date/time: ${formatDateTime(order.created_at)}`,
    `Dashboard: ${orderDashboardLink(order)}`,
    order.notes ? `Notes: ${order.notes}` : null,
    order.payment_link ? "" : null,
    order.payment_link ? "Payment link:" : null,
    order.payment_link,
    order.waze_link ? "" : null,
    order.waze_link ? "Waze:" : null,
    order.waze_link
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerConfirmationMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_customer_confirmation_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  const items = order.items.map((item) => `${item.quantity} x ${item.product_name}`).join("\n");
  const name = order.customer_snapshot.name || "there";
  return [
    `Thank you for ordering from ${settings.business_name}.`,
    "",
    `Order: #${order.order_number}`,
    "Items:",
    items,
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Status: ${statusLabel(order.status || "new") || "Received"}`,
    "",
    `Hi ${name}, we will update you when your order is ready.`,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildCustomerReceiptWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_customer_receipt_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Receipt - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${order.customer_snapshot.name || "Customer"}`,
    "",
    "Items:",
    orderItemsText(order, settings),
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method}`,
    `Completed: ${formatDateTime(order.completed_at)}`,
    "",
    settings.receipt_message,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildCustomerDriverAssignedWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_driver_assigned_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Hi ${order.customer_snapshot.name || "there"}, your ${settings.business_name} order #${order.order_number} has been assigned to ${order.assigned_driver_name || "a delivery driver"}.`,
    order.assigned_driver_phone ? `Driver phone: ${order.assigned_driver_phone}` : null,
    order.waze_link ? `Navigation: ${order.waze_link}` : null,
    `Status: ${statusLabel(order.delivery_status)}`,
    `Total: ${money(order.total, settings.currency)}`,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildDriverAssignmentWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_driver_alert_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  return [
    `Delivery assigned - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${customer.name || "Customer"}`,
    customer.phone ? `Customer phone: ${customer.phone}` : null,
    address ? `Address: ${address}` : null,
    customer.delivery_notes ? `Instructions: ${customer.delivery_notes}` : null,
    "",
    "Items:",
    orderItemsText(order, settings),
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method} (${order.payment_status})`,
    order.waze_link ? `Waze: ${order.waze_link}` : null,
    `Dashboard: ${orderDashboardLink(order)}`
  ].filter(Boolean).join("\n");
}

export function buildCustomerOutForDeliveryWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_out_for_delivery_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Hi ${order.customer_snapshot.name || "there"}, your ${settings.business_name} order #${order.order_number} is out for delivery.`,
    order.assigned_driver_name ? `Driver: ${order.assigned_driver_name}` : null,
    order.assigned_driver_phone ? `Driver phone: ${order.assigned_driver_phone}` : null,
    `Total: ${money(order.total, settings.currency)}`,
    settings.receipt_message,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export type WhatsAppConfigStatus = {
  enabled: boolean;
  selectedProvider: string | null;
  configured: boolean;
  missing: string[];
  warnings: string[];
  defaultCountryCode: string;
  twilio: {
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    hasFrom: boolean;
    accountSidLooksValid: boolean;
    accountSidLength: number;
    accountSidHadWhitespace: boolean;
    accountSidHadWrappingQuotes: boolean;
    authTokenLength: number;
    authTokenHadWhitespace: boolean;
    authTokenHadWrappingQuotes: boolean;
    fromUsesWhatsAppPrefix: boolean;
    fromHadWhitespace: boolean;
    fromHadWrappingQuotes: boolean;
    fromNormalizedUsesWhatsAppPrefix: boolean;
  };
  meta: {
    hasToken: boolean;
    hasPhoneNumberId: boolean;
  };
  message: string;
};

function readSecretEnv(name: string) {
  const raw = process.env[name] || "";
  const trimmed = raw.trim();
  const hadWhitespace = raw !== trimmed;
  const unwrapped = trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
  const hadWrappingQuotes = unwrapped !== trimmed;
  return {
    value: unwrapped,
    hadWhitespace,
    hadWrappingQuotes
  };
}

function whatsappEnabled() {
  return !["false", "0", "no", "off"].includes(String(process.env.WHATSAPP_ENABLED || "true").trim().toLowerCase());
}

function whatsappProvider(providerOverride?: string | null) {
  return (providerOverride || process.env.WHATSAPP_PROVIDER || "twilio").trim().toLowerCase();
}

export function whatsappConfigStatus(providerOverride?: string | null): WhatsAppConfigStatus {
  const provider = whatsappProvider(providerOverride);
  const enabled = whatsappEnabled();
  const twilioAccountSid = readSecretEnv("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = readSecretEnv("TWILIO_AUTH_TOKEN");
  const twilioFrom = readSecretEnv("TWILIO_WHATSAPP_FROM");
  const normalizedFrom = formatTwilioWhatsAppNumber(twilioFrom.value);
  const twilio = {
    hasAccountSid: Boolean(twilioAccountSid.value),
    hasAuthToken: Boolean(twilioAuthToken.value),
    hasFrom: Boolean(twilioFrom.value),
    accountSidLooksValid: /^AC[a-fA-F0-9]{32}$/.test(twilioAccountSid.value),
    accountSidLength: twilioAccountSid.value.length,
    accountSidHadWhitespace: twilioAccountSid.hadWhitespace,
    accountSidHadWrappingQuotes: twilioAccountSid.hadWrappingQuotes,
    authTokenLength: twilioAuthToken.value.length,
    authTokenHadWhitespace: twilioAuthToken.hadWhitespace,
    authTokenHadWrappingQuotes: twilioAuthToken.hadWrappingQuotes,
    fromUsesWhatsAppPrefix: twilioFrom.value.startsWith("whatsapp:"),
    fromHadWhitespace: twilioFrom.hadWhitespace,
    fromHadWrappingQuotes: twilioFrom.hadWrappingQuotes,
    fromNormalizedUsesWhatsAppPrefix: normalizedFrom.startsWith("whatsapp:")
  };
  const meta = {
    hasToken: Boolean(process.env.META_WHATSAPP_TOKEN),
    hasPhoneNumberId: Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID)
  };
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!enabled) missing.push("WHATSAPP_ENABLED=true");

  if (provider === "twilio") {
    if (!twilio.hasAccountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!twilio.hasAuthToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!twilio.hasFrom) missing.push("TWILIO_WHATSAPP_FROM");
    if (twilio.hasAccountSid && !twilio.accountSidLooksValid) {
      missing.push("TWILIO_ACCOUNT_SID must start with AC and be 34 characters");
    }
    if (twilio.hasAccountSid && twilio.accountSidHadWrappingQuotes) warnings.push("TWILIO_ACCOUNT_SID had wrapping quotes; the app will trim them.");
    if (twilio.hasAccountSid && twilio.accountSidHadWhitespace) warnings.push("TWILIO_ACCOUNT_SID had leading/trailing spaces; the app will trim them.");
    if (twilio.hasAuthToken && twilio.authTokenHadWrappingQuotes) warnings.push("TWILIO_AUTH_TOKEN had wrapping quotes; the app will trim them.");
    if (twilio.hasAuthToken && twilio.authTokenHadWhitespace) warnings.push("TWILIO_AUTH_TOKEN had leading/trailing spaces; the app will trim them.");
    if (twilio.hasFrom && !twilio.fromUsesWhatsAppPrefix) warnings.push("TWILIO_WHATSAPP_FROM should be saved as whatsapp:+14155238886.");
  } else if (provider === "meta") {
    if (!meta.hasToken) missing.push("META_WHATSAPP_TOKEN");
    if (!meta.hasPhoneNumberId) missing.push("META_WHATSAPP_PHONE_NUMBER_ID");
  } else {
    missing.push("WHATSAPP_PROVIDER must be twilio or meta");
  }

  const configured = enabled && missing.length === 0 && (provider === "twilio" || provider === "meta");
  const message = configured
    ? "WhatsApp is configured."
    : `WhatsApp is not configured. Missing: ${missing.join(", ")}. Add these in Vercel Production environment variables, then redeploy.`;

  return {
    enabled,
    selectedProvider: provider || null,
    configured,
    missing,
    warnings,
    defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || "+1868",
    twilio,
    meta,
    message
  };
}

function toE164Digits(to: string, defaultCountryCode = "1868") {
  return normalizeWhatsAppNumber(to, defaultCountryCode);
}

async function getProviderError(response: Response) {
  const text = await response.text().catch(() => "");
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  const rawMessage = String(payload.message || payload.error || response.statusText || "Provider rejected the request");
  const safeMessage = rawMessage.replace(/\+?\d[\d\s().-]{6,}\d/g, "[phone]").slice(0, 260);
  return {
    status: response.status,
    code: payload.code ? String(payload.code) : null,
    message: safeMessage,
    moreInfo: typeof payload.more_info === "string" ? payload.more_info : null
  };
}

function twilioErrorMessage(error: Awaited<ReturnType<typeof getProviderError>>) {
  const suffix = error.code ? ` Twilio code ${error.code}.` : "";
  if (error.status === 401 || error.code === "20003") {
    return `Twilio authentication failed.${suffix} Use the Account SID that starts with AC and the Auth Token from the same Twilio account, then redeploy.`;
  }
  if (error.code === "63007") {
    return `Twilio rejected the WhatsApp sender.${suffix} Set TWILIO_WHATSAPP_FROM to an approved WhatsApp sender such as whatsapp:+14155238886 for the sandbox.`;
  }
  if (error.code === "63015" || error.code === "63016") {
    return `Twilio rejected the recipient WhatsApp number.${suffix} If using the Twilio sandbox, the recipient phone must join the sandbox before it can receive messages.`;
  }
  return `WhatsApp send failed through Twilio (HTTP ${error.status}).${suffix} ${error.message}`;
}

export async function sendWhatsAppMessage(
  to: string | null | undefined,
  message: string,
  options: { defaultCountryCode?: string; provider?: string | null } = {}
) {
  const formattedTo = toE164Digits(to || "", options.defaultCountryCode);
  const config = whatsappConfigStatus(options.provider);
  const provider = config.selectedProvider || "twilio";
  if (!formattedTo || !message.trim()) {
    return { ok: false, skipped: true, message: "WhatsApp recipient or message is missing." };
  }
  if (!config.configured) {
    console.info("WhatsApp is not configured", {
      provider,
      missing: config.missing
    });
    return { ok: false, skipped: true, message: config.message, status: config };
  }

  if (provider === "twilio") {
    const accountSid = readSecretEnv("TWILIO_ACCOUNT_SID").value;
    const authToken = readSecretEnv("TWILIO_AUTH_TOKEN").value;
    const from = readSecretEnv("TWILIO_WHATSAPP_FROM").value;
    if (!accountSid || !authToken || !from) return { ok: false, skipped: true, message: config.message, status: config };
    try {
      const body = new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : formatTwilioWhatsAppNumber(from, options.defaultCountryCode),
        To: `whatsapp:${formattedTo}`,
        Body: message
      });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (!response.ok) {
        const providerError = await getProviderError(response);
        console.warn("WhatsApp send failed", { provider: "twilio", error: providerError });
        return { ok: false, skipped: false, message: twilioErrorMessage(providerError), providerError };
      }
      return { ok: true, skipped: false, message: "WhatsApp sent" };
    } catch (error) {
      console.warn("WhatsApp send failed", { provider: "twilio", error: error instanceof Error ? error.message : "Unknown error" });
      return { ok: false, skipped: false, message: "WhatsApp send failed through Twilio. Check Vercel server logs for the safe provider error." };
    }
  }

  if (provider === "meta") {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return { ok: false, skipped: true, message: config.message, status: config };
    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""),
          type: "text",
          text: { body: message, preview_url: true }
        })
      });
      if (!response.ok) {
        console.warn("WhatsApp send failed", { provider: "meta", status: response.status });
        return {
          ok: false,
          skipped: false,
          message: `WhatsApp send failed through Meta (HTTP ${response.status}). Check the Meta token, phone number ID, and recipient number.`
        };
      }
      return { ok: true, skipped: false, message: "WhatsApp sent" };
    } catch (error) {
      console.warn("WhatsApp send failed", { provider: "meta", error: error instanceof Error ? error.message : "Unknown error" });
      return { ok: false, skipped: false, message: "WhatsApp send failed through Meta. Check Vercel server logs for the safe provider error." };
    }
  }

  console.info("WhatsApp is not configured", { provider, missing: config.missing });
  return { ok: false, skipped: true, message: config.message, status: config };
}
