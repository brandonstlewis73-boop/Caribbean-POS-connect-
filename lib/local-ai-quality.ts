import type { LocalGeneration } from "./local-ai-config";
import { LocalRepetitionError } from "./local-ai-lifecycle";
import { CARIBBEAN_CURRENCIES } from "./constants";

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const currencyAliases = CARIBBEAN_CURRENCIES.flatMap(currency => [
  { text: currency.symbol.trim(), code: currency.code },
  { text: currency.code, code: currency.code }
]);
const pricePattern = new RegExp(`(?<![a-z])(${[...new Set(currencyAliases.map(alias => alias.text)), "$", "€", "£"].sort((a,b) => b.length-a.length).map(escapePattern).join("|")})\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)`, "gi");
function pricesIn(text: string) {
  return [...text.matchAll(pricePattern)].map(match => ({
    currency: currencyAliases.find(alias => alias.text.toLowerCase() === match[1].toLowerCase())?.code || match[1],
    amount: Number(match[2].replace(/,/g, ""))
  }));
}
function samePrice(a: ReturnType<typeof pricesIn>[number], b: ReturnType<typeof pricesIn>[number]) {
  return a.currency === b.currency && a.amount === b.amount;
}
export class LocalDraftQualityError extends Error {
  constructor(public readonly reason: string) {
    super(`The local model's response did not pass the check: ${reason} No usable draft was produced.`);
    this.name = "LocalDraftQualityError";
  }
}

export function localDraftInstructions(request: LocalGeneration) {
  if (request.purpose === "product-promotion" || request.purpose === "product-description" || request.purpose === "customer-message" || request.purpose === "order-delay") {
    return request.instructions.slice(0, 5000) + "\nWrite each sentence once. Do not promise that you will send a message or perform an action. Output only the finished text.";
  }
  return request.instructions.slice(0, 5000) + "\nFollow the user request directly. Output the requested draft, without an introduction or explanation. Use bracketed placeholders for facts the user has not provided. When price placeholders are requested, include [PRICE] in the actual promotion. Do not ask for missing details when placeholders are requested. Never promise to send messages, look up prices, or perform actions. Write each sentence once." +
    (request.purpose !== "product-promotion" && /\b(?:promo|promotion|promotions|advertisement)\b/i.test(request.input.split("Business context")[0])
      ? "\nExample of a promotion with placeholders: Lunch is ready at [BUSINESS NAME]! Enjoy [LUNCH SPECIAL] for [CURRENCY][PRICE]. Available [TIME]. Message us to order. Adapt to the user's request." : "");
}

export function localDraftIssue(request: LocalGeneration, text: string): string | null {
  if (!text.trim()) return "The model returned no draft.";
  const normalized = text.replace(/[’‘]/g, "'");
  if (/^(?:sure[,! ]|here(?:'s| is)|I can (?:write|draft|create))/i.test(normalized.trim())) {
    return "Output only the requested draft, without an assistant introduction.";
  }
  if (request.purpose === "order-delay" && request.orderDelayFacts) {
    const facts = request.orderDelayFacts;
    if (/```|\b(?:python|order_number|json)\b|[{}]|^\s*\[\s*\{/i.test(text)) return "Return a plain-language next-step checklist, not code, JSON, sample data, or an order report.";
    const orderNumbers = new Set(facts.orders.map(order => order.number));
    const refs = [...text.matchAll(/#([a-z0-9_-]+)|\border\s+(?:number\s*)?#?([0-9][a-z0-9_-]*)/gi)];
    if (refs.some(match => !orderNumbers.has(match[1] || match[2]))) return "Refer only to the exact order numbers in the verified review. Do not invent an order.";
    const timestamps = [facts.asOf, ...facts.orders.map(order => order.createdAt).filter((value): value is string => Boolean(value))];
    const dates = new Set(timestamps.map(value => value.slice(0, 10)));
    const times = new Set(timestamps.map(value => value.slice(11, 16)));
    if ((text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).some(value => !dates.has(value)) ||
      (text.match(/\b\d{2}:\d{2}\b/g) || []).some(value => !times.has(value))) return "Use only recorded dates and times from the verified review.";
    const source = JSON.stringify(facts);
    const knownNumbers = new Set(source.match(/\d+/g) || []);
    const prose = text.replace(/^\s*\d+[.)]\s+/gm, "");
    if ((prose.match(/\d+/g) || []).some(number => !knownNumbers.has(number))) return "Remove invented numbers, dates, and times. Use only the verified order review.";
    if (/[$€£]|\b(?:price|cost|margin|revenue)\b/i.test(text)) return "Order-delay advice must not include invented prices or financial records.";
    if (/\b(?:is|are|confirmed|definitely)\s+(?:late|delayed|overdue)\b/i.test(text)) return "Elapsed time does not prove a delay without a promised completion time. Suggest checking progress instead.";
    if (/\bwill\b.{0,45}\b(?:ready|arrive|finish|deliver)\b/i.test(text)) return "Do not promise completion or delivery times that are not provided.";
  }
  if (request.purpose === "customer-message" && request.customerMessageFacts) {
    const facts = request.customerMessageFacts;
    if (/\b(?:current|daily|weekly|monthly|today'?s?)\s+(?:sales|revenue)|\b(?:estimated profit|profit margin|cost price|pending orders|completed orders|new orders|customer spending)\b|^\s*(?:stock|margin|cost|assumptions?|internal notes?)\s*:/im.test(text)) {
      return "Remove internal sales, costs, profit, stock, and order-report fields. Return only a reply for the customer.";
    }
    if (facts.catalogRequested && !facts.pickupEnabled && /\b(?:pickup|pick up)\b/i.test(text) && !/\b(?:not|no|unavailable|cannot|don't)\b.{0,35}\b(?:pickup|pick up)\b|\b(?:pickup|pick up)\b.{0,35}\b(?:not|unavailable)\b/i.test(text)) return "Pickup is not offered. Do not invite the customer to collect an order.";
    if (facts.catalogRequested && !facts.deliveryEnabled && /\bdelivery\b/i.test(text) && !/\b(?:not|no|unavailable|cannot|don't)\b.{0,35}\bdelivery\b|\bdelivery\b.{0,35}\b(?:not|unavailable)\b/i.test(text)) return "Delivery is not offered. Do not promise delivery.";
    if (facts.catalogRequested && facts.products.length) {
      const lower = text.toLowerCase();
      const mentioned = facts.products.filter(product => lower.includes(product.name.toLowerCase()));
      if (!mentioned.length) return "Answer the availability question by naming at least one provided product and its saved price, then ask which items the customer wants.";
      if (mentioned.some(product => !lower.includes(product.priceText.toLowerCase()))) return "Include the exact saved prices for the products you name.";
      if (!/\b(?:which|what|choose|choice|prefer|would you like|want|interested)\b/i.test(text)) return "Ask which listed items the customer would like.";
      if (/\b(?:provide|send|share|enter)\b.{0,35}\b(?:personal|details|address|phone|email)\b/i.test(text)) return "First help the customer choose items. Do not request personal details before their selection.";
    }
    const prices = text.match(/[a-z]{0,3}\s*[$€£]\s*\d+(?:[.,]\d+)*/gi) || [];
    const compact = (value: string) => value.toLowerCase().replace(/\s|,/g, "");
    if (facts.catalogRequested && prices.some(price => !facts.products.some(product => compact(product.priceText) === compact(price)))) return "Use only the saved catalog prices. Do not invent another price.";
  }
  if (request.purpose === "product-description" && request.descriptionFacts) {
    const facts = request.descriptionFacts;
    if (/^\s*(?:sku|stock|in stock|price|category|assumptions?|notes?|review|description)\s*:/im.test(text) || /\[[^\]]+\]/.test(text)) {
      return "Return only one or two storefront description sentences. Remove internal product fields, placeholders, assumptions, and review notes.";
    }
    const words = (value: string) => value.toLowerCase().match(/[a-z]+/g) || [];
    const source = `${facts.productName} ${facts.category} ${facts.description}`;
    const savedWords = new Set(words(source).flatMap(word => [word, word.replace(/s$/, "")]));
    const savedNumbers = new Set(source.match(/\d+(?:[.,]\d+)*/g) || []);
    if ((text.match(/\d+(?:[.,]\d+)*/g) || []).some(number => !savedNumbers.has(number))) return "Remove numbers that are not in the saved description facts. Do not add prices, stock counts, or SKU values.";
    const styleWords = new Set(words("a an the and or for of to in on with from by at is are this that it its our your you enjoy try discover choose choice product item option treat everyday classic simple delightful delicious indulgent perfect ideal great addition favorite favourite available selection selected features offers offering suitable made shop find look looking store collection range ready time taste experience"));
    const unsupported = words(text).filter(word => word.length > 3 && !savedWords.has(word) && !savedWords.has(word.replace(/s$/, "")) && !styleWords.has(word));
    if (unsupported.length) return `Use only the saved product facts. Remove unsupported details such as ${Array.from(new Set(unsupported)).slice(0, 5).join(", ")}. Keep it simple when details are missing.`;
    if (!text.toLowerCase().includes(facts.productName.toLowerCase())) return "Include the exact selected product name.";
  }
  if (request.purpose === "product-promotion" && request.promotionFacts) {
    const facts = request.promotionFacts;
    const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9$€£]+/g, "");
    if (/^\s*(?:stock|in stock|stock quantity|inventory|category|price)\s*:/im.test(text)) {
      return "Rewrite this as two short customer-facing sentences, not a labeled stock or price report. Include the product, saved price, and invitation to reply.";
    }
    if (!compact(text).includes(compact(facts.productName))) return "Include the exact selected product name in the message.";
    const savedPrice = pricesIn(facts.priceText)[0];
    const monetaryValues = pricesIn(text);
    if (!savedPrice || !monetaryValues.some(value => samePrice(value, savedPrice))) return `Use the saved price ${facts.priceText}, not a different price or a placeholder.`;
    if (/\[(?:PRICE|CURRENCY)\]/i.test(text)) return "The price is known. Use the saved price instead of a price or currency placeholder.";
    if (!/\b(?:reply|message|contact|whatsapp|order|shop|visit)\b/i.test(text) && !/\b(?:no|without|omit|remove)\b.{0,25}(?:call to action|cta)/i.test(request.input)) {
      return "End the customer-facing promotion with a clear invitation to reply or message the business.";
    }
    const claims = text.toLowerCase().split(facts.productName.toLowerCase()).join("");
    if (/\b(?:discount|sale|free|limited(?:[- ]time)?|selling fast|hurry|last chance|today only)\b|\d+\s*%|\b\d+\s*(?:left|remaining|in stock)\b/i.test(claims)) {
      return "Do not invent discounts, scarcity, deadlines, or include internal stock counts. Use only the selected product and saved price.";
    }
    if (monetaryValues.some(value => !samePrice(value, savedPrice))) return `Include only the saved price ${facts.priceText}. Do not add another price.`;
    if (facts.available && /\b(?:unavailable|out of stock|not available)\b/i.test(text)) return "The selected product is available. Do not claim it is out of stock.";
    if (!facts.available && !/\b(?:unavailable|out of stock|not available)\b/i.test(text)) return "The product is currently unavailable. Say so clearly; invite a message about availability, not an immediate order.";
  }
  const asksForPlaceholders = !request.purpose && /\bplaceholders?\b/i.test(request.input);
  if (asksForPlaceholders && /\b(?:prices?|costs?|amounts?)\b/i.test(request.input) &&
      !/\[[^\]\n]*(?:price|cost|amount)[^\]\n]*\]/i.test(text)) {
    return "Include a bracketed [PRICE] placeholder in the draft instead of discussing prices.";
  }
  if (asksForPlaceholders && /(?:what(?:'s| is| are).*\bprice|please (?:let me know|provide|tell me).*(?:price|details))/i.test(text)) {
    return "Use placeholders instead of asking for missing information.";
  }
  if (/\bI(?:'ll| will| am going to) (?:send|message|contact|check|look up|get you)\b/i.test(normalized)) {
    return "Write the requested draft without promising to perform actions.";
  }
  return null;
}

// One repair attempt; never label a draft ready when it fails these checks.
export async function checkedLocalDraft(
  request: LocalGeneration,
  generate: (repair?: string) => Promise<string>,
  onRepair: () => void
) {
  let first = "";
  let issue: string | null;
  try { first = await generate(); issue = localDraftIssue(request, first); }
  catch (error) {
    if (!(error instanceof LocalRepetitionError)) throw error;
    issue = "Write a shorter response. Each sentence must appear only once. End when the requested message is complete.";
  }
  if (!issue) return first;
  onRepair();
  let repaired: string;
  try { repaired = await generate(issue); }
  catch (error) {
    if (!(error instanceof LocalRepetitionError)) throw error;
    throw new LocalDraftQualityError("The model repeated its response twice. Choose Higher quality in Device AI, or use saved product details for a promotion.");
  }
  const remainingIssue = localDraftIssue(request, repaired);
  if (remainingIssue) throw new LocalDraftQualityError(remainingIssue);
  return repaired;
}
