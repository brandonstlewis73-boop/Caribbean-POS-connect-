export const APP_NAME = "Caribbean Connect POS";
export const CURRENCY_CODE = "TTD";
export const CURRENCY_SYMBOL = "TT$";

export const PRODUCT_CATEGORIES = [
  "Meals",
  "Drinks",
  "Snacks",
  "Retail",
  "Services",
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
  "Transfer",
  "Digital Wallet",
  "Split Payment",
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
  owner: "Owner",
  admin: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  dispatcher: "Dispatcher",
  driver: "Delivery Driver",
  kitchen: "Kitchen Staff",
  staff: "Staff"
};

export const STAFF_ROLES = [
  "owner",
  "manager",
  "cashier",
  "dispatcher",
  "driver",
  "kitchen"
] as const;

export const STAFF_AVATAR_OPTIONS = [
  { key: "teal-register", label: "Teal register", initials: "TR", gradient: "from-teal-300 to-cyan-400" },
  { key: "emerald-store", label: "Emerald store", initials: "ES", gradient: "from-emerald-300 to-lime-400" },
  { key: "amber-delivery", label: "Amber delivery", initials: "AD", gradient: "from-amber-200 to-orange-400" },
  { key: "blue-dispatch", label: "Blue dispatch", initials: "BD", gradient: "from-sky-300 to-blue-500" },
  { key: "rose-kitchen", label: "Rose kitchen", initials: "RK", gradient: "from-rose-300 to-pink-500" },
  { key: "violet-manager", label: "Violet manager", initials: "VM", gradient: "from-violet-300 to-fuchsia-500" },
  { key: "slate-owner", label: "Slate owner", initials: "SO", gradient: "from-slate-200 to-slate-500" },
  { key: "gold-cashier", label: "Gold cashier", initials: "GC", gradient: "from-yellow-200 to-amber-500" }
] as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter Plan",
    audience: "For small food businesses",
    monthly_price: 149,
    currency: CURRENCY_CODE,
    features: [
      "Basic POS",
      "Customer management",
      "Order tracking",
      "Basic reports"
    ]
  },
  {
    id: "business",
    name: "Business Plan",
    audience: "For growing retail and delivery teams",
    monthly_price: 299,
    currency: CURRENCY_CODE,
    features: [
      "Everything in Starter",
      "Multi-user staff access",
      "Inventory management",
      "Delivery management",
      "WhatsApp order alerts",
      "Advanced reports"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    audience: "For multi-branch operators",
    monthly_price: 499,
    currency: CURRENCY_CODE,
    features: [
      "Everything in Business",
      "Multi-branch support",
      "Role permissions",
      "Priority support",
      "Custom branding",
      "Full back office tools"
    ]
  }
] as const;

export function money(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `${CURRENCY_SYMBOL}${numeric.toFixed(2)}`;
}
