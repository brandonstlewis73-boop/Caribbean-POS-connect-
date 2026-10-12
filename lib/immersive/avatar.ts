export const AVATAR_KEY = "caribbean-pos.avatar.v2";
export const CHARACTERS = [
  {
    id: "denim",
    name: "Denim jacket",
    description: "Textured denim, layered tee and sneakers",
    height: 1.8,
  },
  {
    id: "linen",
    name: "Relaxed shirt",
    description: "Rolled sleeves, tailored trousers and leather shoes",
    height: 1.78,
  },
  {
    id: "knit",
    name: "Soft knitwear",
    description: "Belted cardigan, fitted jeans and ankle boots",
    height: 1.69,
  },
] as const;
export type CharacterId = (typeof CHARACTERS)[number]["id"];
export const TOP_COLORS = [
  { id: "original", name: "Original fabric", hex: "#ffffff" },
  { id: "sage", name: "Sage", hex: "#a4b59a" },
  { id: "navy", name: "Navy", hex: "#8299b0" },
  { id: "clay", name: "Clay", hex: "#c28f75" },
] as const;
export const TROUSER_COLORS = [
  { id: "original", name: "Original trousers", hex: "#ffffff" },
  { id: "dark", name: "Charcoal", hex: "#838587" },
  { id: "sand", name: "Warm sand", hex: "#c1ad8c" },
] as const;
export type Avatar = {
  character: CharacterId;
  top: (typeof TOP_COLORS)[number]["id"];
  trousers: (typeof TROUSER_COLORS)[number]["id"];
};
export const DEFAULT_AVATAR: Avatar = {
  character: "denim",
  top: "original",
  trousers: "original",
};
export const CHARACTER_MODELS = ["denim", "linen", "knit", "chef"] as const;
export function characterUrl(id: (typeof CHARACTER_MODELS)[number]) {
  return `/storefront/immersive/people/${id}.glb`;
}
export function normalizeAvatar(value: unknown): Avatar {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const result = { ...DEFAULT_AVATAR };
  const groups = {
    character: CHARACTERS,
    top: TOP_COLORS,
    trousers: TROUSER_COLORS,
  };
  for (const key of Object.keys(groups) as (keyof Avatar)[]) {
    const option = groups[key].find((o) => o.id === input[key]);
    if (option) Object.assign(result, { [key]: option.id });
  }
  return result;
}
export function readAvatar(storage: Pick<Storage, "getItem">): Avatar {
  try {
    return normalizeAvatar(JSON.parse(storage.getItem(AVATAR_KEY) || "null"));
  } catch {
    return { ...DEFAULT_AVATAR };
  }
}
export function saveAvatar(
  storage: Pick<Storage, "setItem">,
  value: Avatar,
): boolean {
  try {
    storage.setItem(AVATAR_KEY, JSON.stringify(normalizeAvatar(value)));
    return true;
  } catch {
    return false;
  }
}
