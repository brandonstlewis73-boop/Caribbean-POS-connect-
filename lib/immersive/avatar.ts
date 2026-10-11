export const AVATAR_KEY = "caribbean-pos.avatar.v1";
export const OUTFITS = [
  { id: "shirt", name: "Everyday shirt" },
  { id: "jacket", name: "Canvas jacket" },
] as const;
export const CLOTH_COLORS = [
  { id: "sage", name: "Sage", hex: "#55654c" },
  { id: "cream", name: "Cream", hex: "#e4d9bf" },
  { id: "navy", name: "Navy", hex: "#263c52" },
  { id: "clay", name: "Clay", hex: "#aa6049" },
  { id: "charcoal", name: "Charcoal", hex: "#343a39" },
] as const;
export const TROUSER_COLORS = [
  { id: "sand", name: "Sand chinos", hex: "#ae9474" },
  { id: "denim", name: "Blue denim", hex: "#364e65" },
  { id: "dark", name: "Charcoal trousers", hex: "#333b3c" },
] as const;
export const SHOE_COLORS = [
  { id: "white", name: "Ivory sneakers", hex: "#e8e3d8" },
  { id: "brown", name: "Brown shoes", hex: "#684833" },
  { id: "black", name: "Black shoes", hex: "#242927" },
] as const;
export const SKIN_COLORS = [
  { id: "deep", name: "Deep", hex: "#69412e" },
  { id: "brown", name: "Brown", hex: "#a46b46" },
  { id: "tan", name: "Tan", hex: "#c99168" },
  { id: "light", name: "Light", hex: "#e6b68d" },
] as const;
export const HAIR_COLORS = [
  { id: "black", name: "Black", hex: "#211d19" },
  { id: "brown", name: "Brown", hex: "#4b3022" },
  { id: "blond", name: "Blond", hex: "#a48451" },
  { id: "silver", name: "Silver", hex: "#9c9c93" },
] as const;
export type Avatar = {
  outfit: (typeof OUTFITS)[number]["id"];
  top: (typeof CLOTH_COLORS)[number]["id"];
  trousers: (typeof TROUSER_COLORS)[number]["id"];
  shoes: (typeof SHOE_COLORS)[number]["id"];
  skin: (typeof SKIN_COLORS)[number]["id"];
  hair: (typeof HAIR_COLORS)[number]["id"];
};
export const DEFAULT_AVATAR: Avatar = {
  outfit: "shirt",
  top: "sage",
  trousers: "sand",
  shoes: "white",
  skin: "brown",
  hair: "brown",
};
export function normalizeAvatar(value: unknown): Avatar {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const result = { ...DEFAULT_AVATAR };
  const groups = {
    outfit: OUTFITS,
    top: CLOTH_COLORS,
    trousers: TROUSER_COLORS,
    shoes: SHOE_COLORS,
    skin: SKIN_COLORS,
    hair: HAIR_COLORS,
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
