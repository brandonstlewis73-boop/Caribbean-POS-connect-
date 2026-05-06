import { z } from "zod";
import { ORDER_TYPES, PAYMENT_METHODS, PRODUCT_CATEGORIES, TT_REGIONS } from "./constants";

const optionalText = z.string().trim().optional().nullable();

export const customerInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: optionalText,
  email: z.string().email().optional().or(z.literal("")).nullable(),
  street_address: optionalText,
  community: optionalText,
  city: optionalText,
  region: z.enum(TT_REGIONS).optional().or(z.string().trim()).nullable(),
  country: z.string().trim().default("Trinidad and Tobago").optional(),
  delivery_notes: optionalText,
  preferred_payment_method: optionalText,
  notes: optionalText,
  birthday: optionalText,
  marketing_consent: z.boolean().optional().default(false)
});

export const productSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  barcode: optionalText,
  category: z.enum(PRODUCT_CATEGORIES).or(z.string().trim().min(1)),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_alert: z.coerce.number().int().min(0).default(5),
  image_url: optionalText,
  supplier_name: optionalText,
  supplier_phone: optionalText
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
  status: z.enum(["draft", "completed"]).optional(),
  discount_amount: z.coerce.number().min(0).optional().default(0),
  service_fee: z.coerce.number().min(0).optional(),
  delivery_fee: z.coerce.number().min(0).optional(),
  notes: optionalText,
  assigned_driver_id: optionalText,
  delivery: z
    .object({
      street_address: optionalText,
      community: optionalText,
      city: optionalText,
      region: optionalText,
      country: z.string().trim().default("Trinidad and Tobago").optional(),
      notes: optionalText,
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
      location_link: optionalText
    })
    .optional()
});

export const settingsSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.coerce.number())])
);
