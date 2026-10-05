import "server-only";
import { callbackUrl, normalizeTwilioStatus, startWhatsAppAttempt, twilioDeliveryHelp, updateWhatsAppAttempt } from "./twilio-delivery";
import { formatTwilioWhatsAppNumber, isValidWhatsAppE164, normalizeWhatsAppNumber } from "./whatsapp";

export type WhatsAppConfigStatus = {
  enabled: boolean;
  selectedProvider: "twilio";
  configured: boolean;
  missing: string[];
  warnings: string[];
  defaultCountryCode: string;
  twilio: {
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    hasPhoneNumber: boolean;
    hasFrom: boolean;
    accountSidLooksValid: boolean;
    accountSidLength: number;
    accountSidHadWhitespace: boolean;
    accountSidHadWrappingQuotes: boolean;
    authTokenLength: number;
    authTokenHadWhitespace: boolean;
    authTokenHadWrappingQuotes: boolean;
    phoneNumberLooksValid: boolean;
    fromUsesWhatsAppPrefix: boolean;
    fromLooksValid: boolean;
    fromHadWhitespace: boolean;
    fromHadWrappingQuotes: boolean;
    fromNormalizedUsesWhatsAppPrefix: boolean;
  };
  message: string;
};

type WhatsAppSendOptions = {
  defaultCountryCode?: string;
  provider?: string | null;
  businessId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  status?: string;
  contentSid?: string;
  contentVariables?: Record<string,string>;
  notificationId?: string;
  testMode?: boolean;
  dedupeKey?: string | null;
};

type WhatsAppAttemptStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "undelivered" | "skipped" | "failed";

function readSecretEnv(name: string) {
  const raw = process.env[name] || "";
  const trimmed = raw.trim();
  const unwrapped = trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
  return {
    value: unwrapped,
    hadWhitespace: raw !== trimmed,
    hadWrappingQuotes: unwrapped !== trimmed
  };
}

export function whatsappConfigStatus(): WhatsAppConfigStatus {
  const provider = "twilio" as const;
  const enabled = true;
  const twilioAccountSid = readSecretEnv("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = readSecretEnv("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = readSecretEnv("TWILIO_PHONE_NUMBER");
  const twilioFrom = readSecretEnv("TWILIO_WHATSAPP_FROM");
  const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || "+1868";
  const normalizedFrom = formatTwilioWhatsAppNumber(twilioFrom.value);
  const normalizedPhoneNumber = normalizeWhatsAppNumber(twilioPhoneNumber.value, defaultCountryCode);
  const twilio = {
    hasAccountSid: Boolean(twilioAccountSid.value),
    hasAuthToken: Boolean(twilioAuthToken.value),
    hasPhoneNumber: Boolean(twilioPhoneNumber.value),
    hasFrom: Boolean(twilioFrom.value),
    accountSidLooksValid: /^AC[a-fA-F0-9]{32}$/.test(twilioAccountSid.value),
    accountSidLength: twilioAccountSid.value.length,
    accountSidHadWhitespace: twilioAccountSid.hadWhitespace,
    accountSidHadWrappingQuotes: twilioAccountSid.hadWrappingQuotes,
    authTokenLength: twilioAuthToken.value.length,
    authTokenHadWhitespace: twilioAuthToken.hadWhitespace,
    authTokenHadWrappingQuotes: twilioAuthToken.hadWrappingQuotes,
    phoneNumberLooksValid: !twilioPhoneNumber.value || isValidWhatsAppE164(normalizedPhoneNumber),
    fromUsesWhatsAppPrefix: normalizedFrom.startsWith("whatsapp:"),
    fromLooksValid: normalizedFrom.startsWith("whatsapp:+") && isValidWhatsAppE164(normalizedFrom.replace(/^whatsapp:/, "")),
    fromHadWhitespace: twilioFrom.hadWhitespace,
    fromHadWrappingQuotes: twilioFrom.hadWrappingQuotes,
    fromNormalizedUsesWhatsAppPrefix: normalizedFrom.startsWith("whatsapp:")
  };
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!twilio.hasAccountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!twilio.hasAuthToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!twilio.hasFrom) missing.push("TWILIO_WHATSAPP_FROM");
  if (twilio.hasAccountSid && !twilio.accountSidLooksValid) {
    missing.push("TWILIO_ACCOUNT_SID must start with AC and be 34 characters");
  }
  if (twilio.hasFrom && !twilio.fromLooksValid) missing.push("TWILIO_WHATSAPP_FROM must be whatsapp:+number");
  if (twilio.hasPhoneNumber && !twilio.phoneNumberLooksValid) warnings.push("TWILIO_PHONE_NUMBER should be a valid E.164 phone number such as +18681234567.");
  if (!twilio.hasPhoneNumber) warnings.push("TWILIO_PHONE_NUMBER is optional for WhatsApp, but add it if you also send SMS from Twilio.");
  if (twilio.hasAccountSid && twilio.accountSidHadWrappingQuotes) warnings.push("TWILIO_ACCOUNT_SID had wrapping quotes; the app will trim them.");
  if (twilio.hasAccountSid && twilio.accountSidHadWhitespace) warnings.push("TWILIO_ACCOUNT_SID had leading/trailing spaces; the app will trim them.");
  if (twilio.hasAuthToken && twilio.authTokenHadWrappingQuotes) warnings.push("TWILIO_AUTH_TOKEN had wrapping quotes; the app will trim them.");
  if (twilio.hasAuthToken && twilio.authTokenHadWhitespace) warnings.push("TWILIO_AUTH_TOKEN had leading/trailing spaces; the app will trim them.");
  if (twilio.hasFrom && !twilioFrom.value.startsWith("whatsapp:")) warnings.push("TWILIO_WHATSAPP_FROM was normalized to whatsapp:+number automatically.");

  const configured = enabled && missing.length === 0;
  const message = configured
    ? "Twilio WhatsApp is configured."
    : `WhatsApp is not configured. Missing: ${missing.join(", ")}. Add these in Vercel Production environment variables, then redeploy.`;

  return {
    enabled,
    selectedProvider: provider,
    configured,
    missing,
    warnings,
    defaultCountryCode,
    twilio,
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
  if (error.code === "63016" || error.code === "63055") return twilioDeliveryHelp(error.code);
  if (error.code === "63015") {
    return `Twilio rejected the recipient WhatsApp number.${suffix} If using the Twilio sandbox, the recipient phone must join the sandbox before it can receive messages.`;
  }
  return `WhatsApp send failed through Twilio (HTTP ${error.status}).${suffix} ${error.message}`;
}

export async function sendWhatsAppMessage(
  to: string | null | undefined,
  message: string,
  options: WhatsAppSendOptions = {}
) {
  message = message.replace(/\\n/g, "\n");
  const formattedTo = toE164Digits(to || "", options.defaultCountryCode);
  const config = whatsappConfigStatus();
  const provider = "twilio";
  const destination = formattedTo || normalizeWhatsAppNumber(to || "", options.defaultCountryCode);
  const dedupeKey = options.dedupeKey || createWhatsAppDedupeKey({
    to: formattedTo,
    message,
    orderId: options.orderId,
    status: options.status
  });
  if (!formattedTo || !message.trim()) {
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: "WhatsApp recipient or message is missing.", dedupeKey });
    return { ok: false, skipped: true, message: "Invalid phone number or message. Use +1868XXXXXXX for Trinidad and Tobago or +1XXXXXXXXXX for the US.", dedupeKey };
  }
  if (!isValidWhatsAppE164(formattedTo)) {
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: "Invalid WhatsApp phone number.", dedupeKey });
    return { ok: false, skipped: true, message: "Invalid phone number. Use +1868XXXXXXX for Trinidad and Tobago or +1XXXXXXXXXX for the US.", dedupeKey };
  }
  if (!config.configured) {
    console.info("WhatsApp is not configured", { provider, missing: config.missing });
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: config.message, dedupeKey });
    return { ok: false, skipped: true, message: config.message, status: config, dedupeKey };
  }

  if (!options.notificationId && wasWhatsAppRecentlySent(dedupeKey)) {
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: "Duplicate WhatsApp send prevented.", dedupeKey });
    return { ok: true, skipped: true, message: "Duplicate WhatsApp send prevented.", dedupeKey };
  }

  if (options.testMode) {
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: "Test mode: message was validated but not sent.", dedupeKey });
    return { ok: true, skipped: true, message: "Test mode passed. Twilio credentials and phone number format look valid. No real message was sent.", status: config, dedupeKey };
  }

  if (options.contentSid && !/^HX[a-fA-F0-9]{32}$/.test(options.contentSid)) {
    return {ok:false,skipped:true,message:"The approved WhatsApp Content SID must start with HX and contain 34 characters.",dedupeKey};
  }
  const accountSid = readSecretEnv("TWILIO_ACCOUNT_SID").value;
  const authToken = readSecretEnv("TWILIO_AUTH_TOKEN").value;
  const from = readSecretEnv("TWILIO_WHATSAPP_FROM").value;
  if (!accountSid || !authToken || !from) {
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "skipped", errorMessage: config.message, dedupeKey });
    return { ok: false, skipped: true, message: config.message, status: config, dedupeKey };
  }

  let attemptId: string | null = null;
  try {
    if (!options.businessId) throw new Error("WhatsApp message requires a business context.");
    const started = await startWhatsAppAttempt({businessId:options.businessId,orderId:options.orderId,customerId:options.customerId,notificationId:options.notificationId,to:formattedTo,message,status:options.status});
    attemptId=started.attempt.id;
    if(started.duplicate)return {ok:true,skipped:true,message:"Duplicate WhatsApp send prevented.",providerMessageSid:started.attempt.provider_message_sid,dedupeKey};
    const body = new URLSearchParams({
      From: formatTwilioWhatsAppNumber(from, options.defaultCountryCode),
      To: `whatsapp:${formattedTo}`,
      StatusCallback: callbackUrl(attemptId)
    });
    if(options.contentSid){body.set("ContentSid",options.contentSid);body.set("ContentVariables",JSON.stringify(options.contentVariables||{}));}
    else body.set("Body",message);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const providerError = await getProviderError(response);
      const safeError = twilioErrorMessage(providerError);
      await updateWhatsAppAttempt(attemptId,null,"failed",providerError.code);
      console.warn("WhatsApp send failed", { provider: "twilio", error: providerError, dedupeKey });
      await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "failed", errorMessage: safeError, dedupeKey });
      return { ok: false, skipped: false, message: safeError, providerError, dedupeKey };
    }
    const payload = await response.json().catch(() => ({})) as { sid?: string; status?: string; error_code?: number };
    if (!payload.sid || !/^(?:SM|MM)[a-fA-F0-9]{32}$/.test(payload.sid)) throw new Error("Twilio did not return a message identifier.");
    const deliveryStatus=normalizeTwilioStatus(payload.status||"queued");
    if(!deliveryStatus)throw new Error("Twilio returned an unknown message status.");
    await updateWhatsAppAttempt(attemptId,payload.sid,deliveryStatus,payload.error_code?String(payload.error_code):null);
    rememberWhatsAppSent(dedupeKey);
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus, errorMessage: null, dedupeKey });
    return { ok: !["failed","undelivered"].includes(deliveryStatus), skipped: false, deliveryStatus, message: ["failed","undelivered"].includes(deliveryStatus) ? twilioDeliveryHelp(payload.error_code?String(payload.error_code):null) : `WhatsApp ${deliveryStatus}. ${deliveryStatus === "queued" ? "Queued does not confirm delivery." : "Check delivery for the latest result."}`, providerMessageSid: payload.sid || null, dedupeKey };
  } catch (error) {
    if (attemptId) await updateWhatsAppAttempt(attemptId,null,"failed").catch(() => undefined);
    const safeError = "Network/API error while sending WhatsApp through Twilio. Check connectivity and Twilio service status.";
    console.warn("WhatsApp send failed", { provider: "twilio", error: error instanceof Error ? error.message : "Unknown error", dedupeKey });
    await logWhatsAppAttempt({ ...options, provider, destination, message, deliveryStatus: "failed", errorMessage: safeError, dedupeKey });
    return { ok: false, skipped: false, message: safeError, dedupeKey };
  }
}

const recentWhatsAppSends = new Map<string, number>();
const whatsappDedupeWindowMs = 10 * 60 * 1000;

function createWhatsAppDedupeKey({ to, message, orderId, status }: { to: string; message: string; orderId?: string | null; status?: string }) {
  const input = [to, orderId || "none", status || "message", message].join("|");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(31, hash) + input.charCodeAt(index) | 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0").slice(0, 32);
}

function wasWhatsAppRecentlySent(dedupeKey: string) {
  const now = Date.now();
  for (const [key, sentAt] of recentWhatsAppSends) {
    if (now - sentAt > whatsappDedupeWindowMs) {
      recentWhatsAppSends.delete(key);
    }
  }
  const sentAt = recentWhatsAppSends.get(dedupeKey);
  return Boolean(sentAt && now - sentAt <= whatsappDedupeWindowMs);
}

function rememberWhatsAppSent(dedupeKey: string) {
  recentWhatsAppSends.set(dedupeKey, Date.now());
}

async function logWhatsAppAttempt({
  businessId,
  orderId,
  customerId,
  provider,
  destination,
  message,
  deliveryStatus,
  errorMessage,
  status,
  dedupeKey
}: WhatsAppSendOptions & {
  provider: string;
  destination: string;
  message: string;
  deliveryStatus: WhatsAppAttemptStatus;
  errorMessage?: string | null;
  dedupeKey: string;
}) {
  const safeDestination = destination ? `${destination.slice(0, 5)}...${destination.slice(-4)}` : null;
  console.info("WhatsApp message attempt", {
    business_id: businessId || null,
    order_id: orderId || null,
    customer_id: customerId || null,
    provider,
    destination: safeDestination,
    status: status || null,
    delivery_status: deliveryStatus,
    error_message: errorMessage || null,
    message_length: message.length,
    dedupe_key: dedupeKey
  });
}
