export const LOCAL_AI_MODEL = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
export type LocalGeneration = {
  instructions: string;
  input: string;
  purpose?: 'product-promotion' | 'product-description';
  descriptionFacts?: { productName: string; category: string; description: string };
  promotionFacts?: { productName: string; priceText: string; available: boolean };
};
export function localAiEnabled() {
  return !["false", "0"].includes(process.env.AI_SUPPORT_ENABLED || "");
}
