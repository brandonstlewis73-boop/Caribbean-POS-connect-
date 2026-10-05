export type Role = "owner" | "admin" | "manager" | "cashier" | "dispatcher" | "driver" | "kitchen" | "staff";

export type User = {
  id: string;
  business_id?: string | null;
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
  storefront_slug?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  business_whatsapp_number?: string | null;
  phone?: string | null;
  email?: string | null;
  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  country: string;
  currency: string;
  base_currency?: string | null;
  use_live_currency_conversion?: boolean;
  display_converted_customer_currency?: boolean;
  customer_display_currency?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
  subscription_plan?: SubscriptionPlanId | string | null;
  subscription_status?: "trial" | "active" | "past_due" | "cancelled" | string | null;
  trial_ends_at?: string | null;
  setup_checklist?: Record<string, boolean>;
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
    | "storefront_slug"
    | "owner_name"
    | "owner_email"
    | "owner_phone"
    | "business_whatsapp_number"
    | "phone"
    | "email"
    | "street_address"
    | "city"
    | "region"
    | "postal_code"
    | "latitude"
    | "longitude"
    | "country"
    | "currency"
    | "logo_url"
    | "tax_id"
    | "subscription_plan"
    | "subscription_status"
  >
>;

export type Product = {
  id: string;
  business_id?: string | null;
  name: string;
  sku: string;
  barcode?: string | null;
  category_id?: string | null;
  category: string;
  description?: string | null;
  cost_price: number;
  selling_price: number;
  discount_price?: number | null;
  stock_quantity: number;
  low_stock_alert: number;
  image_url?: string | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  variations?: ProductOption[];
  add_ons?: ProductOption[];
  active: boolean;
};

export type ProductOption = {
  name: string;
  price_delta?: number;
};

export type Category = {
  id: string;
  business_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  is_active: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CategoryInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  active?: boolean;
};

export type Customer = {
  id: string;
  business_id?: string | null;
  name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  email?: string | null;
  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  country: string;
  postal_code?: string | null;
  delivery_notes?: string | null;
  waze_link?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  preferred_payment_method?: string | null;
  notes?: string | null;
  birthday?: string | null;
  notification_whatsapp: boolean;
  notification_sms: boolean;
  notification_email: boolean;
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
    | "postal_code"
    | "delivery_notes"
    | "waze_link"
    | "gps_latitude"
    | "gps_longitude"
    | "preferred_payment_method"
    | "notes"
    | "birthday"
    | "notification_whatsapp"
    | "notification_sms"
    | "notification_email"
    | "marketing_consent"
  >
>;

export type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  sku?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  line_total: number;
};

export type Order = {
  id: string;
  business_id?: string | null;
  order_number: string;
  customer_id?: string | null;
  customer_snapshot: CustomerInput;
  order_type: "in_store" | "pickup" | "delivery" | "online" | "draft";
  status:
    | "draft"
    | "new"
    | "accepted"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "completed"
    | "cancelled";
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
  assigned_driver_phone?: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate_used?: number | null;
  original_total?: number | null;
  converted_total?: number | null;
  converted_currency?: string | null;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  notes?: string | null;
  driver_notes?: string | null;
  estimated_delivery_at?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_postal_code?: string | null;
  delivery_location_link?: string | null;
  waze_link?: string | null;
  google_maps_link?: string | null;
  payment_link?: string | null;
  whatsapp_business_link?: string | null;
  whatsapp_customer_link?: string | null;
  created_by?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  completed_at?: string | null;
  inventory_applied?: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  status_history?: OrderStatusHistory[];
  customer_notifications?: CustomerNotification[];
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: Order["status"] | string;
  note?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  created_at: string;
};

export type CustomerNotification = {
  id: string;
  business_id?: string | null;
  order_id: string;
  customer_id?: string | null;
  channel: "whatsapp" | "sms" | "email" | "in_app";
  status: string;
  message: string;
  destination?: string | null;
  provider?: string | null;
  delivery_status: "queued" | "sending" | "sent" | "delivered" | "read" | "undelivered" | "skipped" | "failed";
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
};

export type Receipt = {
  id: string;
  business_id?: string | null;
  order_id: string;
  order_number: string;
  receipt_number: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: OrderItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  delivery_fee: number;
  total: number;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate_used?: number | null;
  original_total?: number | null;
  converted_total?: number | null;
  converted_currency?: string | null;
  payment_method: string;
  payment_status: Order["payment_status"];
  completed_by?: string | null;
  completed_by_name?: string | null;
  completed_at?: string | null;
  channel: string;
  whatsapp_sent_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type Settings = {
  business_name: string;
  business_phone: string;
  business_email: string;
  business_address: string;
  business_street_address?: string | null;
  business_city?: string | null;
  business_region?: string | null;
  business_country?: string | null;
  business_postal_code?: string | null;
  business_latitude?: number | null;
  business_longitude?: number | null;
  logo_url?: string | null;
  logo_storage_path?: string | null;
  business_type?: string | null;
  business_color?: string | null;
  storefront_banner_url?: string | null;
  storefront_3d_enabled?: boolean;
  storefront_3d_theme?: "caribbean" | "modern-retail" | "cafe" | "restaurant" | "grocery" | "beauty" | "clothing" | string;
  storefront_3d_background?: string | null;
  storefront_3d_lighting?: "soft" | "bright" | "evening" | "gallery" | string;
  storefront_3d_layout?: "shelves" | "islands" | "gallery" | "counter" | string;
  storefront_status?: "live" | "paused" | string;
  store_hours?: string | null;
  delivery_enabled?: boolean;
  pickup_enabled?: boolean;
  free_delivery_minimum?: number;
  waze_enabled?: boolean;
  driver_waze_enabled?: boolean;
  show_empty_categories?: boolean;
  active_business_id?: string | null;
  currency: string;
  base_currency?: string | null;
  use_live_currency_conversion?: boolean;
  display_converted_customer_currency?: boolean;
  customer_display_currency?: string | null;
  tax_enabled: boolean;
  tax_rate: number;
  service_fee_enabled: boolean;
  service_fee_rate: number;
  delivery_fee: number;
  delivery_rates: Record<string, number>;
  receipt_message: string;
  receipt_template?: "modern" | "classic" | "minimal";
  receipt_show_logo?: boolean;
  loyalty_enabled: boolean;
  loyalty_points_per_ttd: number;
  loyalty_redeem_ttd_per_point: number;
  payment_links_enabled: boolean;
  payment_link_template: string;
  whatsapp_enabled: boolean;
  whatsapp_provider?: "twilio" | "meta" | string;
  whatsapp_business_number: string;
  whatsapp_country_code: string;
  whatsapp_owner_alerts_enabled: boolean;
  whatsapp_customer_confirmations_enabled: boolean;
  whatsapp_customer_receipts_enabled: boolean;
  whatsapp_driver_assignment_enabled: boolean;
  whatsapp_driver_alerts_enabled: boolean;
  whatsapp_out_for_delivery_enabled: boolean;
  whatsapp_order_template: string;
  whatsapp_customer_confirmation_template: string;
  whatsapp_customer_receipt_template: string;
  whatsapp_driver_assigned_template: string;
  whatsapp_driver_alert_template: string;
  whatsapp_out_for_delivery_template: string;
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
  notification_whatsapp_enabled: boolean;
  notification_sms_enabled: boolean;
  notification_email_enabled: boolean;
  new_order_alerts_enabled: boolean;
  new_order_sound_enabled: boolean;
  new_order_browser_notifications_enabled: boolean;
  new_order_alert_preview_enabled: boolean;
  default_prep_time_minutes: number;
};

export type CheckoutPayload = {
  business_id?: string | null;
  storefront_slug?: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    discount?: number;
  }>;
  customer?: CustomerInput;
  order_type: "in_store" | "pickup" | "delivery" | "online" | "draft";
  payment_method: string;
  payment_status?: "paid" | "unpaid" | "partial";
  status?: Order["status"];
  discount_amount?: number;
  expected_total?: number;
  idempotency_key?: string;
  service_fee?: number;
  delivery_fee?: number;
  notes?: string | null;
  assigned_driver_id?: string | null;
  delivery?: {
    street_address?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    postal_code?: string | null;
    notes?: string | null;
    latitude?: number;
    longitude?: number;
    location_link?: string | null;
  };
  created_by?: string | null;
};

export type DashboardData = {
  currency: string;
  base_currency?: string | null;
  use_live_currency_conversion?: boolean;
  display_converted_customer_currency?: boolean;
  customer_display_currency?: string | null;
  business?: Business | null;
  storefrontUrl?: string | null;
  whatsappConfigured?: boolean;
  subscription?: Subscription | null;
  setupChecklist?: Array<{ key: string; label: string; complete: boolean }>;
  newOrders: number;
  pendingOrders: number;
  completedOrders: number;
  recentCustomers: Customer[];
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  deliveryOrderCount: number;
  profitEstimate: number;
  recentOrders: Order[];
  lowStock: Product[];
  bestSellers: Array<{ name: string; quantity: number; total: number }>;
  topCustomers: Array<{ name: string; total_spent: number; orders_count: number }>;
  paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  cashierPerformance: Array<{ name: string; total: number; count: number }>;
  salesSeries: Array<{ date: string; total: number }>;
};

export type SubscriptionPlanId = "trial" | "starter" | "pro" | "premium" | "enterprise" | "business";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  audience: string;
  monthly_price: number;
  currency: string;
  base_currency?: string | null;
  use_live_currency_conversion?: boolean;
  display_converted_customer_currency?: boolean;
  customer_display_currency?: string | null;
  max_products?: number | null;
  max_staff?: number | null;
  max_locations?: number | null;
  max_ai_generations?: number | null;
  max_whatsapp_messages?: number | null;
  whatsapp_enabled?: boolean;
  ai_support_enabled?: boolean;
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
  base_currency?: string | null;
  use_live_currency_conversion?: boolean;
  display_converted_customer_currency?: boolean;
  customer_display_currency?: string | null;
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

export type HelpArticleVisibility = "admin" | "staff" | "public";

export type HelpArticle = {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  visibility: HelpArticleVisibility;
  published: boolean;
  last_updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type HelpArticleInput = Partial<
  Pick<HelpArticle, "title" | "category" | "content" | "tags" | "visibility" | "published">
>;

export type SupportTicketStatus = "new" | "open" | "waiting_on_customer" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";

export type SupportTicket = {
  id: string;
  business_id?: string | null;
  ticket_number: string;
  name: string;
  business_name?: string | null;
  email: string;
  phone?: string | null;
  issue_category: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  message: string;
  screenshot_url?: string | null;
  ai_summary?: string | null;
  ai_category?: string | null;
  ai_priority?: SupportTicketPriority | null;
  ai_possible_solution?: string | null;
  ai_steps_tried: string[];
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketInput = Partial<
  Pick<
    SupportTicket,
    | "name"
    | "business_name"
    | "email"
    | "phone"
    | "issue_category"
    | "priority"
    | "message"
    | "screenshot_url"
  >
>;

export type AiSupportLog = {
  id: string;
  user_id?: string | null;
  business_id?: string | null;
  question: string;
  response_summary?: string | null;
  ticket_id?: string | null;
  created_at: string;
};
