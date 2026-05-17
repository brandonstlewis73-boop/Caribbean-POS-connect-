export const APP_NAME = "Caribbean Connect POS";
export const CURRENCY_CODE = "TTD";
export const CURRENCY_SYMBOL = "TT$";

export const CARIBBEAN_CURRENCIES = [
  { code: "AWG", name: "Aruban florin", symbol: "Afl ", territories: "Aruba" },
  { code: "BSD", name: "Bahamian dollar", symbol: "B$", territories: "Bahamas" },
  { code: "BBD", name: "Barbadian dollar", symbol: "Bds$", territories: "Barbados" },
  { code: "BZD", name: "Belize dollar", symbol: "BZ$", territories: "Belize" },
  { code: "BMD", name: "Bermudian dollar", symbol: "BD$", territories: "Bermuda" },
  { code: "KYD", name: "Cayman Islands dollar", symbol: "CI$", territories: "Cayman Islands" },
  { code: "CUP", name: "Cuban peso", symbol: "CUP$", territories: "Cuba" },
  { code: "DOP", name: "Dominican peso", symbol: "RD$", territories: "Dominican Republic" },
  { code: "XCD", name: "East Caribbean dollar", symbol: "EC$", territories: "OECS countries and territories" },
  { code: "XCG", name: "Caribbean guilder", symbol: "Cg ", territories: "Curacao and Sint Maarten" },
  { code: "HTG", name: "Haitian gourde", symbol: "G ", territories: "Haiti" },
  { code: "GYD", name: "Guyanese dollar", symbol: "G$", territories: "Guyana" },
  { code: "JMD", name: "Jamaican dollar", symbol: "J$", territories: "Jamaica" },
  { code: "SRD", name: "Surinamese dollar", symbol: "Sr$", territories: "Suriname" },
  { code: "TTD", name: "Trinidad and Tobago dollar", symbol: "TT$", territories: "Trinidad and Tobago" },
  { code: "USD", name: "United States dollar", symbol: "US$", territories: "United States, Puerto Rico, USVI, BVI, Turks and Caicos, Caribbean Netherlands" },
  { code: "EUR", name: "Euro", symbol: "EUR ", territories: "French Caribbean territories" }
] as const;

export type CaribbeanCurrencyCode = (typeof CARIBBEAN_CURRENCIES)[number]["code"];

export function getCurrencyMeta(currency?: string | null) {
  return (
    CARIBBEAN_CURRENCIES.find((item) => item.code === currency) || {
      code: currency || CURRENCY_CODE,
      name: currency || "Currency",
      symbol: currency ? `${currency} ` : CURRENCY_SYMBOL,
      territories: ""
    }
  );
}

export function currencyOptionLabel(currency: (typeof CARIBBEAN_CURRENCIES)[number]) {
  return `${currency.code} - ${currency.name} (${currency.symbol.trim() || currency.code})`;
}

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

export const US_REGIONS: string[] = [
  "Mainland United States",
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "Washington, DC",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "Puerto Rico",
  "US Virgin Islands",
  "American Samoa",
  "Guam",
  "Northern Mariana Islands",
  "British Virgin Islands",
  "Turks and Caicos",
  "Bonaire",
  "Saba",
  "Sint Eustatius"
];

export const DELIVERY_REGIONS_BY_CURRENCY = {
  AWG: ["Oranjestad", "Noord", "Paradera", "Santa Cruz", "Savaneta", "San Nicolas"],
  BSD: ["New Providence", "Grand Bahama", "Abaco", "Eleuthera", "Exuma", "Andros", "Bimini", "Long Island", "Cat Island"],
  BBD: ["Bridgetown", "Christ Church", "St. Michael", "St. George", "St. James", "St. Philip", "St. Thomas", "St. John", "St. Joseph", "St. Lucy", "St. Peter", "St. Andrew"],
  BZD: ["Belize District", "Cayo", "Corozal", "Orange Walk", "Stann Creek", "Toledo"],
  BMD: ["Hamilton", "St. George's", "Sandys", "Southampton", "Warwick", "Paget", "Pembroke", "Devonshire", "Smith's", "Hamilton Parish", "St. George's Parish"],
  KYD: ["Grand Cayman", "Cayman Brac", "Little Cayman"],
  CUP: ["Havana", "Santiago de Cuba", "Camaguey", "Holguin", "Matanzas", "Villa Clara", "Cienfuegos", "Pinar del Rio", "Granma", "Guantanamo", "Las Tunas", "Sancti Spiritus", "Ciego de Avila", "Artemisa", "Mayabeque", "Isla de la Juventud"],
  DOP: ["Santo Domingo", "Distrito Nacional", "Santiago", "La Altagracia", "Puerto Plata", "La Romana", "San Pedro de Macoris", "San Cristobal", "La Vega", "Duarte", "Espaillat", "Samana", "Barahona"],
  XCD: ["Anguilla", "Antigua and Barbuda", "Dominica", "Grenada", "Montserrat", "St. Kitts and Nevis", "Saint Lucia", "St. Vincent and the Grenadines"],
  XCG: ["Curacao", "Sint Maarten"],
  HTG: ["Ouest", "Artibonite", "Nord", "Nord-Est", "Nord-Ouest", "Centre", "Sud", "Sud-Est", "Grand'Anse", "Nippes"],
  GYD: ["Georgetown", "Demerara-Mahaica", "Essequibo Islands-West Demerara", "Pomeroon-Supenaam", "Mahaica-Berbice", "East Berbice-Corentyne", "Cuyuni-Mazaruni", "Potaro-Siparuni", "Upper Takutu-Upper Essequibo", "Barima-Waini"],
  JMD: ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. Elizabeth", "Westmoreland", "Hanover", "St. James", "Trelawny", "St. Ann", "St. Mary", "Portland", "St. Thomas"],
  SRD: ["Paramaribo", "Wanica", "Nickerie", "Commewijne", "Para", "Marowijne", "Saramacca", "Brokopondo", "Coronie", "Sipaliwini"],
  TTD: TT_REGIONS,
  USD: US_REGIONS,
  EUR: ["Guadeloupe", "Martinique", "Saint Martin", "Saint Barthelemy"]
} as const satisfies Record<CaribbeanCurrencyCode, readonly string[]>;

export const DEFAULT_COUNTRY_BY_CURRENCY: Record<CaribbeanCurrencyCode, string> = {
  AWG: "Aruba",
  BSD: "Bahamas",
  BBD: "Barbados",
  BZD: "Belize",
  BMD: "Bermuda",
  KYD: "Cayman Islands",
  CUP: "Cuba",
  DOP: "Dominican Republic",
  XCD: "Eastern Caribbean",
  XCG: "Curacao and Sint Maarten",
  HTG: "Haiti",
  GYD: "Guyana",
  JMD: "Jamaica",
  SRD: "Suriname",
  TTD: "Trinidad and Tobago",
  USD: "United States",
  EUR: "French Caribbean territories"
};

export const CARIBBEAN_MARKETS_BY_COUNTRY = {
  AG: { country: "Antigua and Barbuda", currency: "XCD", aliases: ["antigua", "barbuda"] },
  AI: { country: "Anguilla", currency: "XCD" },
  AW: { country: "Aruba", currency: "AWG" },
  BB: { country: "Barbados", currency: "BBD" },
  BL: { country: "Saint Barthelemy", currency: "EUR", aliases: ["st barthelemy", "st. barthelemy", "saint barth"] },
  BM: { country: "Bermuda", currency: "BMD" },
  BQ: { country: "Caribbean Netherlands", currency: "USD", aliases: ["bonaire", "saba", "sint eustatius"] },
  BS: { country: "Bahamas", currency: "BSD", aliases: ["the bahamas"] },
  BZ: { country: "Belize", currency: "BZD" },
  CU: { country: "Cuba", currency: "CUP" },
  CW: { country: "Curacao", currency: "XCG", aliases: ["curacao"] },
  DM: { country: "Dominica", currency: "XCD" },
  DO: { country: "Dominican Republic", currency: "DOP" },
  GD: { country: "Grenada", currency: "XCD" },
  GP: { country: "Guadeloupe", currency: "EUR" },
  GY: { country: "Guyana", currency: "GYD" },
  HT: { country: "Haiti", currency: "HTG" },
  JM: { country: "Jamaica", currency: "JMD" },
  KN: { country: "Saint Kitts and Nevis", currency: "XCD", aliases: ["st kitts and nevis", "st. kitts and nevis"] },
  KY: { country: "Cayman Islands", currency: "KYD" },
  LC: { country: "Saint Lucia", currency: "XCD", aliases: ["st lucia", "st. lucia"] },
  MF: { country: "Saint Martin", currency: "EUR", aliases: ["st martin", "st. martin"] },
  MQ: { country: "Martinique", currency: "EUR" },
  MS: { country: "Montserrat", currency: "XCD" },
  PR: { country: "Puerto Rico", currency: "USD" },
  SR: { country: "Suriname", currency: "SRD" },
  SX: { country: "Sint Maarten", currency: "XCG", aliases: ["saint maarten"] },
  TC: { country: "Turks and Caicos", currency: "USD", aliases: ["turks and caicos islands"] },
  TT: { country: "Trinidad and Tobago", currency: "TTD" },
  US: { country: "United States", currency: "USD", aliases: ["usa", "u.s.", "u.s.a.", "america", "mainland united states", "united states of america"] },
  VC: {
    country: "Saint Vincent and the Grenadines",
    currency: "XCD",
    aliases: ["st vincent and the grenadines", "st. vincent and the grenadines"]
  },
  VG: { country: "British Virgin Islands", currency: "USD", aliases: ["bvi"] },
  VI: { country: "US Virgin Islands", currency: "USD", aliases: ["u.s. virgin islands", "united states virgin islands", "usvi"] }
} as const satisfies Record<
  string,
  {
    country: string;
    currency: CaribbeanCurrencyCode;
    aliases?: readonly string[];
  }
>;

export function getMarketForCountry(country?: string | null) {
  const value = country?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  const exact = CARIBBEAN_MARKETS_BY_COUNTRY[upper as keyof typeof CARIBBEAN_MARKETS_BY_COUNTRY];
  if (exact) return { countryCode: upper, ...exact };

  const normalized = value.toLowerCase();
  const entry = Object.entries(CARIBBEAN_MARKETS_BY_COUNTRY).find(([, market]) => {
    const aliases = "aliases" in market ? market.aliases : [];
    const names = [market.country.toLowerCase(), ...aliases.map((alias) => alias.toLowerCase())];
    return names.includes(normalized);
  });

  return entry ? { countryCode: entry[0], ...entry[1] } : null;
}

export function getDeliveryRegionsForCurrency(currency?: string | null): readonly string[] {
  return DELIVERY_REGIONS_BY_CURRENCY[(currency || CURRENCY_CODE) as CaribbeanCurrencyCode] || DELIVERY_REGIONS_BY_CURRENCY.TTD;
}

export function getDefaultCountryForCurrency(currency?: string | null) {
  return DEFAULT_COUNTRY_BY_CURRENCY[(currency || CURRENCY_CODE) as CaribbeanCurrencyCode] || DEFAULT_COUNTRY_BY_CURRENCY.TTD;
}

export function getDefaultDeliveryRatesForCurrency(currency?: string | null) {
  return Object.fromEntries(
    getDeliveryRegionsForCurrency(currency).map((region) => [
      region,
      DEFAULT_DELIVERY_RATES[region as (typeof TT_REGIONS)[number]] ?? 25
    ])
  ) as Record<string, number>;
}

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
    max_products: 100,
    max_staff: 3,
    whatsapp_enabled: true,
    ai_support_enabled: false,
    features: [
      "Basic POS",
      "Customer management",
      "Order tracking",
      "Basic reports",
      "WhatsApp order alerts"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    audience: "For growing retail and delivery teams",
    monthly_price: 299,
    currency: CURRENCY_CODE,
    max_products: 500,
    max_staff: 10,
    whatsapp_enabled: true,
    ai_support_enabled: true,
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
    id: "premium",
    name: "Premium Plan",
    audience: "For multi-branch operators",
    monthly_price: 499,
    currency: CURRENCY_CODE,
    max_products: 2000,
    max_staff: 30,
    whatsapp_enabled: true,
    ai_support_enabled: true,
    features: [
      "Everything in Pro",
      "Multi-branch support",
      "Role permissions",
      "Priority support",
      "Custom branding",
      "Full back office tools"
    ]
  }
] as const;

export function money(value: number | string | null | undefined, currency = CURRENCY_CODE) {
  const numeric = Number(value ?? 0);
  return `${getCurrencyMeta(currency).symbol}${numeric.toFixed(2)}`;
}
