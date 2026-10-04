import type { LocalGeneration } from './local-ai-config';

export function prepareProductPromotion(prompt: string, facts: {
  productName: string; priceText: string; businessName: string; available: boolean;
}): LocalGeneration {
  return {
    purpose: 'product-promotion',
    promotionFacts: { productName: facts.productName, priceText: facts.priceText, available: facts.available },
    instructions: `Write customer-facing WhatsApp promotion copy, not a product record or stock report.
Use two short sentences: an inviting line naming the product with its saved price, then a clear invitation to reply or message the business.
Use the exact product name and saved price. Do not replace a known price with [PRICE].
Do not print field labels, stock counts, headings, or assistant introductions.
Do not invent ingredients, discounts, scarcity, opening hours, pickup, delivery, or health claims.
If the product is unavailable, say so and invite a message about availability instead of inviting an immediate order.
Follow requested edits while preserving these verified facts. Output only the finished message.`,
    input: `User request:\n${prompt.slice(0, 1800)}\n\nVerified facts:\nProduct name: ${facts.productName}\nSaved price: ${facts.priceText}\nBusiness name: ${facts.businessName}\nAvailability: ${facts.available ? 'Available' : 'Currently unavailable'}`
  };
}
