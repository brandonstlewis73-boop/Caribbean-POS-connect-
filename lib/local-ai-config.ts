export const LOCAL_AI_MODEL = "Qwen3-1.7B-q4f16_1-MLC";
export type LocalGeneration = { instructions: string; input: string };
export function localAiEnabled() {
  return !["false", "0"].includes(process.env.AI_SUPPORT_ENABLED || "");
}
