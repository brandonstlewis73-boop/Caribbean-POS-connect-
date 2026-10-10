import { availableSaleStock, saleUnitPrice } from "../pos-checkout";
import type { Product } from "../types";
export type StoreCartItem = Product & { quantity: number };
export function reconcileStoreCart(cart: StoreCartItem[], products: Product[]) {
  return cart.flatMap((item) => {
    const product = products.find(
      (p) => p.id === item.id && p.active !== false,
    );
    if (!product) return [];
    const quantity = Math.min(item.quantity, availableSaleStock(product));
    return quantity > 0
      ? [{ ...product, selling_price: saleUnitPrice(product), quantity }]
      : [];
  });
}
export function addStoreItem(
  cart: StoreCartItem[],
  products: Product[],
  id: string,
  quantity: number,
) {
  const next = reconcileStoreCart(cart, products),
    product = products.find((p) => p.id === id && p.active !== false);
  if (!product || !Number.isInteger(quantity) || quantity <= 0) return next;
  const existing = next.find((p) => p.id === id),
    amount = Math.min(
      quantity,
      availableSaleStock(product) - (existing?.quantity || 0),
    );
  if (amount <= 0) return next;
  return existing
    ? next.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + amount } : item,
      )
    : [
        ...next,
        { ...product, selling_price: saleUnitPrice(product), quantity: amount },
      ];
}
