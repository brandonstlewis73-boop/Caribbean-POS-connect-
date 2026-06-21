export type PlanId = "trial" | "starter" | "pro" | "premium" | "enterprise";

export type FeatureKey =
  | "pos"
  | "storefront"
  | "inventory"
  | "delivery"
  | "reports"
  | "whatsappMessaging"
  | "aiSupport"
  | "advancedReports"
  | "multiLocation"
  | "customBranding"
  | "threeDStorefront"
  | "prioritySupport";

export type UsageLimitKey = "aiGenerations" | "whatsappMessages" | "staff" | "products" | "locations";

export type UsageSnapshot = Record<UsageLimitKey, number>;

export type UsageMeter = {
  key: UsageLimitKey;
  label: string;
  used: number;
  limit: number | null;
  locked: boolean;
  remaining: number | null;
  percent: number;
};

export type PlanUsageSummary = {
  planId: PlanId;
  planName: string;
  usage: UsageSnapshot;
  meters: UsageMeter[];
};

export type PlanConfig = {
  id: PlanId;
  name: string;
  audience: string;
  monthlyPrice: number;
  currency: string;
  limits: Record<UsageLimitKey, number | null>;
  features: FeatureKey[];
  featureList: string[];
};

export const PLAN_ORDER: PlanId[] = ["trial", "starter", "pro", "premium", "enterprise"];

export const FEATURE_PLANS: Record<FeatureKey, PlanId> = {
  pos: "trial",
  storefront: "trial",
  inventory: "trial",
  delivery: "starter",
  reports: "starter",
  whatsappMessaging: "starter",
  aiSupport: "pro",
  advancedReports: "pro",
  multiLocation: "premium",
  customBranding: "premium",
  threeDStorefront: "premium",
  prioritySupport: "enterprise"
};

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  trial: {
    id: "trial",
    name: "Free / Trial",
    audience: "For testing the core POS flow",
    monthlyPrice: 0,
    currency: "TTD",
    limits: { aiGenerations: 5, whatsappMessages: 20, staff: 1, products: 25, locations: 1 },
    features: ["pos", "storefront", "inventory"],
    featureList: ["Basic POS", "Online storefront", "Inventory basics", "Trial usage limits"]
  },
  starter: {
    id: "starter",
    name: "Starter Plan",
    audience: "For small Caribbean businesses",
    monthlyPrice: 149,
    currency: "TTD",
    limits: { aiGenerations: 0, whatsappMessages: 200, staff: 3, products: 100, locations: 1 },
    features: ["pos", "storefront", "inventory", "delivery", "reports", "whatsappMessaging"],
    featureList: ["Basic POS", "Customer management", "Order tracking", "Basic reports", "WhatsApp order alerts"]
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    audience: "For growing retail and delivery teams",
    monthlyPrice: 299,
    currency: "TTD",
    limits: { aiGenerations: 500, whatsappMessages: 1000, staff: 10, products: 500, locations: 1 },
    features: ["pos", "storefront", "inventory", "delivery", "reports", "whatsappMessaging", "aiSupport", "advancedReports"],
    featureList: ["Everything in Starter", "AI support", "Inventory management", "Delivery management", "Advanced reports"]
  },
  premium: {
    id: "premium",
    name: "Premium Plan",
    audience: "For multi-location operators",
    monthlyPrice: 499,
    currency: "TTD",
    limits: { aiGenerations: 2000, whatsappMessages: 5000, staff: 30, products: 2000, locations: 5 },
    features: ["pos", "storefront", "inventory", "delivery", "reports", "whatsappMessaging", "aiSupport", "advancedReports", "multiLocation", "customBranding", "threeDStorefront"],
    featureList: ["Everything in Pro", "3D storefront", "Multi-location support", "Custom branding", "Full back office tools"]
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Plan",
    audience: "For larger teams needing custom limits",
    monthlyPrice: 0,
    currency: "TTD",
    limits: { aiGenerations: null, whatsappMessages: null, staff: null, products: null, locations: null },
    features: ["pos", "storefront", "inventory", "delivery", "reports", "whatsappMessaging", "aiSupport", "advancedReports", "multiLocation", "customBranding", "threeDStorefront", "prioritySupport"],
    featureList: ["Unlimited usage", "3D storefront", "Enterprise support", "Custom onboarding", "Priority support"]
  }
};

export function normalizePlanId(planId?: string | null): PlanId {
  if (!planId || planId === "free") return "trial";
  if (planId === "business") return "premium";
  return PLAN_ORDER.includes(planId as PlanId) ? (planId as PlanId) : "trial";
}

export function getPlanConfig(planId?: string | null): PlanConfig {
  return PLAN_CONFIG[normalizePlanId(planId)];
}

function rank(planId: string | null | undefined) {
  return PLAN_ORDER.indexOf(normalizePlanId(planId));
}

export function canUseFeature(planId: string | null | undefined, feature: FeatureKey) {
  const requiredPlan = FEATURE_PLANS[feature];
  const allowed = rank(planId) >= rank(requiredPlan);
  return {
    allowed,
    feature,
    requiredPlan,
    currentPlan: normalizePlanId(planId),
    message: allowed ? "Feature available." : `Upgrade to ${PLAN_CONFIG[requiredPlan].name} to use this feature.`
  };
}

export function isWithinLimit(planId: string | null | undefined, key: UsageLimitKey, usage: number, adding = 0) {
  const plan = getPlanConfig(planId);
  const limit = plan.limits[key];
  const nextUsage = usage + adding;
  const allowed = limit === null || nextUsage <= limit;
  return {
    allowed,
    key,
    usage,
    adding,
    nextUsage,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - usage),
    message: allowed ? "Usage allowed." : `Upgrade your plan to increase the ${key} limit.`
  };
}

export function buildUsageMeters(planId: string | null | undefined, usage: Partial<UsageSnapshot>): UsageMeter[] {
  const plan = getPlanConfig(planId);
  return (Object.keys(plan.limits) as UsageLimitKey[]).map((key) => {
    const used = Number(usage[key] || 0);
    const limit = plan.limits[key];
    return {
      key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      used,
      limit,
      locked: limit === 0,
      remaining: limit === null ? null : Math.max(0, limit - used),
      percent: limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
    };
  });
}
