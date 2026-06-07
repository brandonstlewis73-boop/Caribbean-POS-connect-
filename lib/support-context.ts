import type { HelpArticle } from "./types";

export const HELP_CATEGORIES = [
  "Getting Started",
  "Orders & Checkout",
  "Products & Categories",
  "Customers",
  "Storefront Setup",
  "Orders",
  "Delivery",
  "WhatsApp/SMS Notifications",
  "Receipts",
  "Reports",
  "Staff",
  "AI Features",
  "Billing & Subscriptions",
  "Troubleshooting"
] as const;

export const QUICK_HELP_PROMPTS = [
  "How do I add a product?",
  "How do I scan a barcode?",
  "How do I complete an order?",
  "How do I send a WhatsApp receipt?",
  "Why can't I log in?",
  "How do I add staff?",
  "How do I set my business WhatsApp number?",
  "How do subscriptions work?",
  "How do I print a receipt?"
];

export const GETTING_STARTED_CHECKLIST = [
  "Add business profile",
  "Add first category",
  "Add first product",
  "Set pickup/delivery options",
  "Configure WhatsApp/SMS/email",
  "Customize storefront",
  "Test customer checkout",
  "Enable AI features"
];

export const FAQS = [
  {
    question: "Why is AI support unavailable?",
    answer: "AI support needs OPENAI_API_KEY and AI_SUPPORT_ENABLED in the server environment. The help articles and ticket form still work without AI."
  },
  {
    question: "Can staff see private customer or order data in support chat?",
    answer: "The assistant is instructed to answer from safe app documentation and the user's role. It does not fetch private customer or order records for chat answers."
  },
  {
    question: "How do WhatsApp messages send automatically?",
    answer: "Add WhatsApp provider credentials in Vercel, enable WhatsApp automation in Settings, then use order completion or delivery status changes."
  },
  {
    question: "What should I do if products or customers are not saving?",
    answer: "Check /api/health, confirm the database is connected, then try creating a small test product or customer from the dashboard."
  },
  {
    question: "Can I use the app on my phone?",
    answer: "Yes. Use the Vercel production URL from any device, or run npm run dev:lan locally and open your computer's LAN IP from your phone."
  }
];

export const SUPPORT_KNOWLEDGE_CONTEXT = `
Caribbean Connect POS is a SaaS-style point-of-sale app for Caribbean businesses.
Main dashboard areas: POS checkout, Orders, Receipts, Deliveries, Customers, Inventory, Reports, Staff, Subscription, Settings, Printer, and Help & Support.
Products can include name, SKU, barcode, category, price, stock quantity, supplier info, and image.
POS checkout supports tapping products, searching, manual barcode entry, scanner-enter input, delivery/pickup/in-store orders, customers, and order completion.
Customers store name, phone, optional email, street address, city/town, country, delivery notes, optional Waze link, and optional GPS coordinates.
Orders use statuses New, Accepted, Preparing, Ready, Out for Delivery, Completed, and Cancelled.
Delivery uses pending, assigned, out_for_delivery, delivered, and failed. Waze links help drivers navigate.
WhatsApp automation can notify owners for new orders, customers for completed receipts, customers when drivers are assigned, drivers when assigned, and customers when orders go out for delivery.
Receipts are generated when an order is completed and can be viewed, printed, or resent by WhatsApp if configured.
Settings control business profile, logo, currency, delivery regions/rates, receipt message, payment options, WhatsApp templates, and staff visibility.
Staff roles include Owner, Manager, Cashier, Dispatcher, Delivery Driver, Kitchen Staff, Staff, and Admin.
Subscriptions describe SaaS plan access and billing status.
Database health is checked by /api/health. Production should use the Supabase transaction pooler on port 6543.
AI support must never reveal secrets, environment variable values, API keys, database passwords, session tokens, or full database URLs.
AI support cannot execute commands, change database settings, delete records, or bypass role permissions.
`;

export const DEFAULT_HELP_ARTICLES: HelpArticle[] = [
  {
    id: "help_getting_started_setup",
    title: "First-time setup checklist",
    category: "Getting Started",
    content:
      "Start in Settings. Add your business name, phone, logo, country, currency, delivery rates, receipt message, and WhatsApp number. Then add products in Inventory, add staff roles, run a small POS checkout test, complete the order, and confirm a receipt is created.",
    tags: ["setup", "business profile", "checklist"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_pos_complete_order",
    title: "Complete an order in POS checkout",
    category: "Orders & Checkout",
    content:
      "Open POS, add products to the cart, choose or create the customer if needed, choose payment method and order type, then submit. For active orders, open Orders and move the status to Completed. Completion updates receipts, customer history, and inventory.",
    tags: ["checkout", "complete order", "pos"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_barcode_scanning",
    title: "Use barcode scanning",
    category: "Products & Categories",
    content:
      "Add each product barcode in Inventory. On POS checkout, keep the barcode input ready, scan with a USB/Bluetooth scanner, or enter the barcode manually and press Enter. Matching products are added to the cart or quantity is increased.",
    tags: ["barcode", "scanner", "inventory"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_create_customer",
    title: "Create a customer",
    category: "Customers",
    content:
      "Open Customers and add the customer name, phone number, optional email, street address, city/town, country, optional delivery notes, optional Waze link, and optional GPS latitude/longitude. After saving, the customer appears in the list and can be selected during checkout.",
    tags: ["customers", "delivery address", "save"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_orders_status",
    title: "Order status workflow",
    category: "Orders",
    content:
      "Use New, Accepted, Preparing, Ready, Out for Delivery, Completed, and Cancelled. Completed creates or updates the receipt and applies inventory if it has not already been applied. Cancelled can reverse completed inventory effects.",
    tags: ["orders", "statuses", "workflow"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_delivery_waze",
    title: "Delivery and Waze",
    category: "Delivery",
    content:
      "Delivery orders can be assigned to a driver. When an address or GPS location is present, the app can create Waze links. Dispatchers can move delivery status from pending to assigned, out for delivery, delivered, or failed.",
    tags: ["delivery", "driver", "waze"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_whatsapp_setup",
    title: "Set up WhatsApp automation",
    category: "WhatsApp/SMS Notifications",
    content:
      "In Settings, add the business WhatsApp number and default country code. Add Twilio or Meta WhatsApp credentials in Vercel environment variables. Enable owner alerts, customer receipts, driver assignment messages, and out-for-delivery messages as needed.",
    tags: ["whatsapp", "twilio", "meta", "settings"],
    visibility: "admin",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_receipts",
    title: "Print or resend receipts",
    category: "Receipts",
    content:
      "Receipts are created when orders are completed. Open Receipts to search by customer, phone, order number, or date. Use Print for a paper receipt or WhatsApp to resend the receipt if messaging is configured.",
    tags: ["receipt", "print", "whatsapp"],
    visibility: "staff",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_reports",
    title: "Read reports",
    category: "Reports",
    content:
      "Reports show sales, product movement, payment breakdown, customer activity, and staff performance. Managers and admins should use reports to spot low stock, busy days, and payment trends.",
    tags: ["reports", "sales", "analytics"],
    visibility: "admin",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_staff_roles",
    title: "Add staff and roles",
    category: "Staff",
    content:
      "Open Staff to create profiles with name, phone, email, role, active status, and avatar. Use Cashier for checkout, Dispatcher for delivery management, Driver for assigned delivery work, Kitchen Staff for preparation, and Manager or Owner for broader access.",
    tags: ["staff", "roles", "permissions"],
    visibility: "admin",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_subscriptions",
    title: "How subscriptions work",
    category: "Billing & Subscriptions",
    content:
      "Subscription settings show the current plan, trial, seats, and billing status. Owners can review plan options and keep payment settings up to date before selling the app as SaaS to more locations.",
    tags: ["subscription", "billing", "plan"],
    visibility: "admin",
    published: true,
    last_updated_at: "2026-05-11"
  },
  {
    id: "help_login_database",
    title: "Troubleshoot login and database issues",
    category: "Troubleshooting",
    content:
      "If login fails, open /api/health. The app should show database connected, selected environment variable, host, port, SSL configuration, and admin user presence. On Vercel, DATABASE_URL should use the Supabase transaction pooler on port 6543, then a fresh redeploy is required.",
    tags: ["login", "database", "supabase", "vercel"],
    visibility: "admin",
    published: true,
    last_updated_at: "2026-05-11"
  }
];
