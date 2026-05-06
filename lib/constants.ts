export const APP_NAME = "Caribbean POS Connect";
export const CURRENCY_CODE = "TTD";
export const CURRENCY_SYMBOL = "TT$";

export const PRODUCT_CATEGORIES = [
  "Food",
  "Drinks",
  "Snacks",
  "Services",
  "Apparel",
  "Digital services",
  "Custom items"
] as const;

export const TT_REGIONS = [
  "Port of Spain",
  "San Fernando",
  "Chaguanas",
  "Arima",
  "Point Fortin",
  "Couva-Tabaquite-Talparo",
  "Diego Martin",
  "San Juan-Laventille",
  "Tunapuna-Piarco",
  "Siparia",
  "Penal-Debe",
  "Princes Town",
  "Mayaro-Rio Claro",
  "Sangre Grande",
  "Tobago"
] as const;

export const DEFAULT_DELIVERY_RATES: Record<(typeof TT_REGIONS)[number], number> = {
  "Port of Spain": 25,
  "San Fernando": 30,
  Chaguanas: 25,
  Arima: 30,
  "Point Fortin": 55,
  "Couva-Tabaquite-Talparo": 35,
  "Diego Martin": 30,
  "San Juan-Laventille": 28,
  "Tunapuna-Piarco": 30,
  Siparia: 50,
  "Penal-Debe": 45,
  "Princes Town": 45,
  "Mayaro-Rio Claro": 60,
  "Sangre Grande": 45,
  Tobago: 75
};

export const PRODUCT_IMAGE_URLS: Record<string, string> = {
  "FOOD-JERK-001": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
  "FOOD-DOUB-002": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  "DRINK-SOR-003": "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
  "DRINK-MAU-004": "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80",
  "SNACK-PLA-005": "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?auto=format&fit=crop&w=900&q=80",
  "APP-TEE-006": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  "DIG-TOP-007": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "SERV-REP-008": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80"
};

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank transfer",
  "PayPal",
  "WiPay",
  "Pay on delivery"
] as const;

export const ORDER_TYPES = [
  "in_store",
  "pickup",
  "delivery",
  "online",
  "draft"
] as const;

export const ORDER_TYPE_LABELS: Record<string, string> = {
  in_store: "In-store",
  pickup: "Pickup",
  delivery: "Delivery",
  online: "Online",
  draft: "Draft"
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  driver: "Delivery driver",
  staff: "Staff"
};

export function money(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `${CURRENCY_SYMBOL}${numeric.toFixed(2)}`;
}
