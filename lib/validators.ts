import { z } from "zod";
import { CARIBBEAN_CURRENCIES, ORDER_TYPES, PAYMENT_METHODS, PRODUCT_CATEGORIES, STAFF_AVATAR_OPTIONS, STAFF_ROLES, TT_REGIONS } from "./constants";
import { HELP_CATEGORIES, QUICK_HELP_PROMPTS } from "./support-context";

const optionalText = z.string().trim().optional().nullable();
const optionalImageUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Product image URL must start with http:// or https://.");
const caribbeanCurrencyCodes = CARIBBEAN_CURRENCIES.map((currency) => currency.code) as [string, ...string[]];
const currencySchema = z.enum(caribbeanCurrencyCodes);
const orderStatusSchema = z.enum([
  "draft",
  "new",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled"
]);

export const customerInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: optionalText,
  email: z.string().email().optional().or(z.literal("")).nullable(),
  street_address: optionalText,
  city: optionalText,
  region: z.enum(TT_REGIONS).optional().or(z.string().trim()).nullable(),
  country: z.string().trim().default("Trinidad and Tobago").optional(),
  postal_code: optionalText,
  delivery_notes: optionalText,
  waze_link: optionalText,
  gps_latitude: z.coerce.number().optional().nullable(),
  gps_longitude: z.coerce.number().optional().nullable(),
  preferred_payment_method: optionalText,
  notes: optionalText,
  birthday: optionalText,
  notification_whatsapp: z.boolean().optional().default(true),
  notification_sms: z.boolean().optional().default(false),
  notification_email: z.boolean().optional().default(false),
  marketing_consent: z.boolean().optional().default(false)
});

const productOptionSchema = z.object({
  name: z.string().trim().min(1),
  price_delta: z.coerce.number().optional().default(0)
});

export const productSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  barcode: optionalText,
  category_id: optionalText,
  category: z.enum(PRODUCT_CATEGORIES).or(z.string().trim().min(1)),
  description: optionalText,
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  discount_price: z.coerce.number().min(0).optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_alert: z.coerce.number().int().min(0).default(5),
  image_url: optionalImageUrl,
  supplier_name: optionalText,
  supplier_phone: optionalText,
  active: z.boolean().optional(),
  variations: z.array(productOptionSchema).optional().default([]),
  add_ons: z.array(productOptionSchema).optional().default([])
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  slug: optionalText,
  description: optionalText,
  icon: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(32).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  active: z.boolean().optional()
});

export const categoryReorderSchema = z.object({
  categories: z.array(z.object({
    id: z.string().min(1),
    sort_order: z.coerce.number().int().min(0)
  })).min(1)
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        discount: z.coerce.number().min(0).optional().default(0)
      })
    )
    .min(1),
  customer: customerInputSchema.optional(),
  order_type: z.enum(ORDER_TYPES),
  payment_method: z.enum(PAYMENT_METHODS).or(z.string().trim().min(1)),
  payment_status: z.enum(["paid", "unpaid", "partial"]).optional(),
  status: orderStatusSchema.optional(),
  discount_amount: z.coerce.number().min(0).optional().default(0),
  service_fee: z.coerce.number().min(0).optional(),
  delivery_fee: z.coerce.number().min(0).optional(),
  notes: optionalText,
  assigned_driver_id: optionalText,
  delivery: z
    .object({
      street_address: optionalText,
      city: optionalText,
      region: optionalText,
      country: z.string().trim().default("Trinidad and Tobago").optional(),
      postal_code: optionalText,
      notes: optionalText,
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
      location_link: optionalText
    })
    .optional()
});

export const settingsSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.coerce.number())]))
  .superRefine((value, ctx) => {
    if (value.receipt_template !== undefined && !["modern", "classic", "minimal"].includes(String(value.receipt_template))) ctx.addIssue({code:z.ZodIssueCode.custom,path:["receipt_template"],message:"Choose a supported receipt template."});
    if (value.receipt_show_logo !== undefined && typeof value.receipt_show_logo !== "boolean") ctx.addIssue({code:z.ZodIssueCode.custom,path:["receipt_show_logo"],message:"Logo visibility must be true or false."});
    if (value.receipt_message !== undefined && (typeof value.receipt_message !== "string" || value.receipt_message.length > 500)) ctx.addIssue({code:z.ZodIssueCode.custom,path:["receipt_message"],message:"Receipt message must be text up to 500 characters."});
    if (typeof value.currency === "string" && !caribbeanCurrencyCodes.includes(value.currency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "Choose a supported Caribbean currency."
      });
    }
  });

export const businessSchema = z.object({
  name: z.string().trim().min(1),
  legal_name: optionalText,
  slug: optionalText,
  storefront_slug: optionalText,
  owner_name: optionalText,
  owner_email: z.string().email().optional().or(z.literal("")).nullable(),
  owner_phone: optionalText,
  business_whatsapp_number: optionalText,
  phone: optionalText,
  email: z.string().email().optional().or(z.literal("")).nullable(),
  street_address: optionalText,
  city: optionalText,
  region: z.enum(TT_REGIONS).optional().or(z.string().trim()).nullable(),
  country: z.string().trim().default("Trinidad and Tobago").optional(),
  postal_code: optionalText,
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  currency: currencySchema.default("TTD").optional(),
  logo_url: optionalText,
  tax_id: optionalText
});

export const businessSignupSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required."),
  owner_name: z.string().trim().min(2, "Owner name is required.").optional().default("Business Owner"),
  email: z.string().trim().email("Enter a valid owner email address."),
  whatsapp_number: z.string().trim().min(7, "WhatsApp number is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  country: z.string().trim().optional().default("Trinidad and Tobago"),
  currency: currencySchema.optional().default("TTD")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter your account email address.")
});

export const whatsappTestSchema = z.object({
  to: optionalText,
  message: z.string().trim().min(2).max(1000).optional(),
  testMode: z.boolean().optional().default(false)
});

export const staffUserSchema = z.object({
  name: z.string().trim().min(1, "Staff name is required."),
  phone: optionalText,
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(STAFF_ROLES),
  active: z.boolean().optional().default(true),
  avatar_key: z
    .enum(STAFF_AVATAR_OPTIONS.map((avatar) => avatar.key) as [string, ...string[]])
    .optional()
    .nullable(),
  avatar_url: optionalText
});

const helpCategories = HELP_CATEGORIES as unknown as [string, ...string[]];

export const helpArticleSchema = z.object({
  title: z.string().trim().min(3, "Article title is required."),
  category: z.enum(helpCategories).or(z.string().trim().min(2)),
  content: z.string().trim().min(10, "Article content is required."),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  visibility: z.enum(["admin", "staff", "public"]).default("staff"),
  published: z.boolean().optional().default(true)
});

export const helpArticleUpdateSchema = helpArticleSchema.partial();

export const supportTicketSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  business_name: optionalText,
  email: z.string().trim().email("Enter a valid email address."),
  phone: optionalText,
  issue_category: z.enum(helpCategories).or(z.string().trim().min(2)),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  message: z.string().trim().min(10, "Tell us what happened."),
  screenshot_url: optionalText
});

export const supportTicketUpdateSchema = z.object({
  status: z.enum(["new", "open", "waiting_on_customer", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  issue_category: z.enum(helpCategories).or(z.string().trim().min(2)).optional(),
  ai_summary: optionalText,
  ai_possible_solution: optionalText
});

export const aiSupportChatSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  currentPage: optionalText,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().max(2000)
      })
    )
    .max(12)
    .optional()
    .default([]),
  quickPrompt: z.enum(QUICK_HELP_PROMPTS as unknown as [string, ...string[]]).optional()
});

export const aiBusinessToolSchema = z.object({
  selectedProductId: z.string().trim().min(1).max(128).optional(),
  toolId: z.string().trim().min(2).max(80),
  prompt: z.string().trim().min(2).max(4000),
  extraContext: optionalText
});
