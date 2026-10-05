/** Customer-facing explanations. Technical diagnostics stay out of the interface. */
export function userMessage(value: unknown, fallback = "Something went wrong. Please try again.") {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : "";
  if (!message.trim()) return fallback;
  if (/did not pass the check|No usable draft|LocalRepetition|repeating itself|repeated its response/i.test(message)) return "That response wasn’t ready to use. Try a shorter request or use your saved business details.";
  if (/WebGPU|GPU|shader|MLC|model.{0,30}(?:load|download|memory)|device lost/i.test(message)) return "On-device writing isn’t available right now. Update your browser, close other apps, and try again. Replies from saved business details remain available.";
  if (/bucket|photo storage|product_images_storage|storage.{0,30}(?:credentials|configured)/i.test(message)) return "Photo uploads are unavailable right now. Try again later or contact support.";
  if (/Twilio|sandbox|ContentSid|Messaging Logs|\b(?:63015|63016|63055)\b/i.test(message)) return "Automatic WhatsApp couldn’t send this update. Open customer WhatsApp to send it yourself, or contact support.";
  if (/Vercel|Supabase|environment variables|env vars|API key|service.role|(?:provider|database|storage) credentials|\.sql\b|SQL Editor|database schema|migration|\b[A-Z][A-Z_]{4,}\b.{0,20}(?:missing|required|not set)/i.test(message)) return "This feature needs attention. Please contact support or try again later.";
  if (/SQLSTATE|PGRST|relation .{0,100}does not exist|column .{0,100}does not exist|ECONN|ENOTFOUND|stack trace|postgres(?:ql)?:\/\//i.test(message)) return fallback;
  return message;
}

export function developerInstructions(text: string) {
  return /Vercel|Supabase|environment variables|env vars|TWILIO_[A-Z_]+|API key|service.role|\.sql\b|SQL Editor|\/api\/health|redeploy|database schema|build logs/i.test(text);
}
