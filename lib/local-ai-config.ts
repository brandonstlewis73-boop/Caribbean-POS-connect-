import type { OrderDelayReview } from "./ai-order-delays";
export const LOCAL_AI_MODEL = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";
export type LocalModelChoice = "quality" | "light";
export const LOCAL_MODEL_STORAGE_KEY = "caribbean-local-ai-model";
export function localModelId(choice: LocalModelChoice, supportsFloat16: boolean) {
  return choice === "light" ? "Qwen2.5-0.5B-Instruct-q4f32_1-MLC"
    : supportsFloat16 ? "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" : LOCAL_AI_MODEL;
}
export function readLocalModelChoice(): LocalModelChoice {
  try { return typeof window !== "undefined" && window.localStorage.getItem(LOCAL_MODEL_STORAGE_KEY) === "light" ? "light" : "quality"; }
  catch { return "quality"; }
}
export function saveLocalModelChoice(choice: LocalModelChoice) {
  try { window.localStorage.setItem(LOCAL_MODEL_STORAGE_KEY, choice); } catch { /* Storage is optional. */ }
}
export type LocalGeneration = {
  instructions: string;
  input: string;
  purpose?: 'product-promotion' | 'product-description' | 'customer-message' | 'order-delay';
  orderDelayFacts?: OrderDelayReview;
  customerMessageFacts?: { products: { name: string; priceText: string }[]; pickupEnabled: boolean; deliveryEnabled: boolean; catalogRequested: boolean };
  descriptionFacts?: { productName: string; category: string; description: string };
  promotionFacts?: { productName: string; priceText: string; available: boolean };
};
export function localAiEnabled() {
  return !["false", "0"].includes(process.env.AI_SUPPORT_ENABLED || "");
}
