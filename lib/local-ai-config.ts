export const LOCAL_AI_MODEL = "SmolLM2-360M-Instruct-q4f32_1-MLC";
export type LocalGeneration = { instructions: string; input: string };
export function localAiEnabled() {
  return !["false", "0"].includes(process.env.AI_SUPPORT_ENABLED || "");
}
