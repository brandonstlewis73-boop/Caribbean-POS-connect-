export type Role = "owner" | "admin" | "manager" | "cashier" | "dispatcher" | "driver" | "kitchen" | "staff";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  active: boolean;
  avatar_key?: string | null;
  avatar_url?: string | null;
};

export type StaffInput = Partial<
  Pick<User, "name" | "email" | "phone" | "role" | "active" | "avatar_key" | "avatar_url">
>;

export type Business = {
  id: string;
  name: string;
  legal_name?: string | null;
  slug?: string | null;
  phone?: string | null;
  email?: string | null;
  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  country: string;
  currency: string;
  logo_url?: string | null;
  tax_id?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BusinessInput = Partial<
  Pick<
    Business,
    | "name"
    | "legal_name"
    | "slug"
    | "phone"
    | "email"
    | "street_address"
    | "city"
    | "region"
    | "country"
    | "currency"
    | "logo_url"
    | "tax_id"
  >
>;

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  image_url?: string | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  active: boolean;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  email?: string | null;
  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  country: string;
  delivery_notes?: string | null;
  waze_link?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  preferred_payment_method?: string | null;
  notes?: string | null;
  birthday?: string | null;
  marketing_consent: boolean;
  loyalty_points: number;
  total_spent: number;
  orders_count: number;
  last_order_at?: string | null;
  tags: string[];
};

export type CustomerInput = Partial<
  Pick<
    Customer,
    | "name"
    | "phone"
    | "email"
    | "street_address"
    | "city"
    | "region"
    | "country"
    | "delivery_notes"
    | "waze_link"
    | "gps_latitude"
    | "gps_longitude"
    | "preferred_payment_method"
    | "notes"
    | "birthday"
    | "marketing_consent"
  >
>;

export type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_snapshot: CustomerInput;
  order_type: "in_store" | "pickup" | "delivery" | "online" | "draft";
  status: "draft" | "completed" | "cancelled";
  payment_method: string;
  payment_status: "paid" | "unpaid" | "partial" | "refunded";
  delivery_status:
    | "not_required"
    | "pending"
    | "assigned"
    | "out_for_delivery"
    | "delivered"
    | "failed";
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  notes?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_location_link?: string | null;
  waze_link?: string | null;
  payment_link?: string | null;
  whatsapp_business_link?: string | null;
  whatsapp_customer_link?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

export type Settings = {
  business_name: string;
  business_phone: string;
  business_email: string;
  business_address: string;
  logo_url?: string | null;
  active_business_id?: string | null;
  currency: string;
  tax_enabled: boolean;
  tax_rate: number;
  service_fee_enabled: boolean;
  service_fee_rate: number;
  delivery_fee: number;
  delivery_rates: Record<string, number>;
  receipt_message: string;
  loyalty_enabled: boolean;
  loyalty_points_per_ttd: number;
  loyalty_redeem_ttd_per_point: number;
  payment_links_enabled: boolean;
  payment_link_template: string;
  whatsapp_enabled: boolean;
  whatsapp_business_number: string;
  whatsapp_country_code: string;
  whatsapp_order_template: string;
  facebook_url: string;
  instagram_url: string;
  payment_cash_enabled: boolean;
  payment_card_enabled: boolean;
  payment_bank_enabled: boolean;
  payment_paypal_enabled: boolean;
  payment_wipay_enabled: boolean;
  payment_pod_enabled: boolean;
  receipt_print_customer_enabled: boolean;
  receipt_print_kitchen_enabled: boolean;
  receipt_email_enabled: boolean;
  receipt_whatsapp_enabled: boolean;
};

export type CheckoutPayload = {
  items: Array<{
    product_id: string;
    quantity: number;
    discount?: number;
  }>;
  customer?: CustomerInput;
  order_type: "in_store" | "pickup" | "delivery" | "online" | "draft";
  payment_method: string;
  payment_status?: "paid" | "unpaid" | "partial";
  status?: "draft" | "completed";
  discount_amount?: number;
  service_fee?: number;
  delivery_fee?: number;
  notes?: string | null;
  assigned_driver_id?: string | null;
  delivery?: {
    street_address?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    notes?: string | null;
    latitude?: number;
    longitude?: number;
    location_link?: string | null;
  };
  created_by?: string | null;
};

export type DashboardData = {
  currency: string;
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  deliveryOrderCount: number;
  profitEstimate: number;
  lowStock: Product[];
  bestSellers: Array<{ name: string; quantity: number; total: number }>;
  topCustomers: Array<{ name: string; total_spent: number; orders_count: number }>;
  paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  cashierPerformance: Array<{ name: string; total: number; count: number }>;
  salesSeries: Array<{ date: string; total: number }>;
};

export type SubscriptionPlanId = "starter" | "business" | "pro";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  audience: string;
  monthly_price: number;
  currency: string;
  features: string[];
};

export type Subscription = {
  id: string;
  business_id?: string | null;
  plan_id: SubscriptionPlanId;
  plan_name: string;
  status: "trialing" | "active" | "past_due" | "paused" | "cancelled";
  seats: number;
  monthly_price: number;
  currency: string;
  provider?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};
