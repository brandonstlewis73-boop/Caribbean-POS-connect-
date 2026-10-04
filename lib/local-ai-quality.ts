import type { LocalGeneration } from "./local-ai-config";

export function localDraftInstructions(request: LocalGeneration) {
  return request.instructions.slice(0, 5000) + "\nFollow the user request directly. Output the requested draft, without an introduction or explanation. Use bracketed placeholders for facts the user has not provided. When price placeholders are requested, include [PRICE] in the actual promotion. Do not ask for missing details when placeholders are requested. Never promise to send messages, look up prices, or perform actions. Write each sentence once." +
    (/\b(?:promo|promotion|promotions|advertisement)\b/i.test(request.input.split("Business context")[0])
      ? "\nExample of a promotion with placeholders: Lunch is ready at [BUSINESS NAME]! Enjoy [LUNCH SPECIAL] for [CURRENCY][PRICE]. Available [TIME]. Message us to order. Adapt to the user's request." : "");
}

export function localDraftIssue(request: LocalGeneration, text: string): string | null {
  if (!text.trim()) return "The model returned no draft.";
  const normalized = text.replace(/[’‘]/g, "'");
  if (/^(?:sure[,! ]|here(?:'s| is)|I can (?:write|draft|create))/i.test(normalized.trim())) {
    return "Output only the requested draft, without an assistant introduction.";
  }
  const asksForPlaceholders = /\bplaceholders?\b/i.test(request.input);
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
  const first = await generate();
  const issue = localDraftIssue(request, first);
  if (!issue) return first;
  onRepair();
  const repaired = await generate(issue);
  if (localDraftIssue(request, repaired)) {
    throw new Error("This local model could not follow the request reliably. Try a simpler request. No usable draft was produced.");
  }
  return repaired;
}
