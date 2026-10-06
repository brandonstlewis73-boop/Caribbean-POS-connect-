/** Parse only when saving, so editing never removes a decimal point or resets the caret. */
export function parseProductPrice(value: string, emptyDefault?: number): number | null {
  const text = value.trim();
  if (!text) return emptyDefault ?? null;
  if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text)) return null;
  const price = Number(text.replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}
