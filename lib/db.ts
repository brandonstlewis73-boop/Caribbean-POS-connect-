import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { DEFAULT_DELIVERY_RATES, PRODUCT_CATEGORIES, PRODUCT_IMAGE_URLS } from "./constants";

type DbClient = Pool | PoolClient;

export const isDemoMode =
  (!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) ||
    process.env.SUPABASE_DB_URL?.startsWith("file:") ||
    process.env.DATABASE_URL?.startsWith("file:")) &&
  process.env.FORCE_POSTGRES !== "true";

declare global {
  // eslint-disable-next-line no-var
  var __cpcPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __cpcDbInit: Promise<void> | undefined;
}

function databaseUrl() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  return url && !url.startsWith("file:") ? url : null;
}

function shouldUseSsl(url: string) {
  if (process.env.PGSSL_DISABLE === "true") return false;
  return url.includes("supabase") || process.env.PGSSLMODE === "require";
}

export function getDb() {
  if (globalThis.__cpcPool) return globalThis.__cpcPool;
  const url = databaseUrl();
  if (!url) return undefined as unknown as Pool;
  globalThis.__cpcPool = new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX || 5),
    ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined
  });
  return globalThis.__cpcPool;
}

export async function ensureDatabase() {
  if (isDemoMode) return;
  if (!globalThis.__cpcDbInit) {
    globalThis.__cpcDbInit = initializeDatabase();
  }
  await globalThis.__cpcDbInit;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: DbClient
): Promise<QueryResult<T>> {
  if (isDemoMode) return emptyResult<T>();
  await ensureDatabase();
  return (client || getDb()).query<T>(text, params);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  if (isDemoMode) return fn(fakeClient() as unknown as PoolClient);
  await ensureDatabase();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function rawQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: DbClient
) {
  if (isDemoMode) return emptyResult<T>();
  return (client || getDb()).query<T>(text, params);
}

async function initializeDatabase() {
  if (isDemoMode) return;
  const schemaPath = join(process.cwd(), "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await getDb().query(schema);
  await seedSettings();
  await seedDemoData();
  await updateSeedProductImages();
}

async function insertSetting(key: string, value: unknown) {
  await rawQuery(
    "INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING",
    [key, JSON.stringify(value)]
  );
}

async function seedSettings() {
  await insertSetting("business_name", "Savannah & Sea Retail Ltd.");
  await insertSetting("business_phone", "868-555-2190");
  await insertSetting("business_email", "hello@savannahsea.tt");
  await insertSetting("business_address", "18 Independence Square, Port of Spain, Trinidad and Tobago");
  await insertSetting("currency", "TTD");
  await insertSetting("tax_enabled", true);
  await insertSetting("tax_rate", 12.5);
  await insertSetting("service_fee_enabled", false);
  await insertSetting("service_fee_rate", 0);
  await insertSetting("delivery_fee", 25);
  await insertSetting("delivery_rates", DEFAULT_DELIVERY_RATES);
  await insertSetting("receipt_message", "Thank you for shopping with us.");
  await insertSetting("loyalty_enabled", true);
  await insertSetting("loyalty_points_per_ttd", 0.1);
  await insertSetting("loyalty_redeem_ttd_per_point", 0.1);
  await insertSetting("payment_links_enabled", true);
  await insertSetting(
    "payment_link_template",
    "https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}"
  );
  await insertSetting("whatsapp_enabled", true);
  await insertSetting("whatsapp_business_number", "4437582368");
  await insertSetting("whatsapp_country_code", "+1");
  await insertSetting(
    "whatsapp_order_template",
    "New Order - Caribbean POS Connect\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nStatus: {{payment_status}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}"
  );
  await insertSetting("facebook_url", "https://facebook.com/caribbeanposconnect");
  await insertSetting("instagram_url", "https://instagram.com/caribbeanposconnect");
  await insertSetting("payment_cash_enabled", true);
  await insertSetting("payment_card_enabled", true);
  await insertSetting("payment_bank_enabled", true);
  await insertSetting("payment_paypal_enabled", true);
  await insertSetting("payment_wipay_enabled", true);
  await insertSetting("payment_pod_enabled", true);
  await insertSetting("order_counter", 1024);
  await insertSetting("receipt_counter", 4024);
}

async function seedDemoData() {
  const userCount = Number((await rawQuery<{ count: string }>("SELECT COUNT(*) AS count FROM users")).rows[0]?.count || 0);
  if (!userCount) {
    const passwordHash = await bcrypt.hash("Admin123!", 12);
    const users = [
      ["Asha Maharaj", "admin@caribbeanpos.test", "admin", "868-555-1001"],
      ["Devon Baptiste", "manager@caribbeanpos.test", "manager", "868-555-1002"],
      ["Renee Ali", "cashier@caribbeanpos.test", "cashier", "868-555-1003"],
      ["Malik Charles", "driver@caribbeanpos.test", "driver", "868-555-1004"],
      ["Talia Joseph", "staff@caribbeanpos.test", "staff", "868-555-1005"]
    ];
    for (const [name, email, role, phone] of users) {
      await rawQuery(
        "INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5, $6)",
        [createId("usr"), name, email, passwordHash, role, phone]
      );
    }
  }

  const productCount = Number((await rawQuery<{ count: string }>("SELECT COUNT(*) AS count FROM products")).rows[0]?.count || 0);
  if (!productCount) {
    const products = [
      ["Jerk Chicken Meal", "FOOD-JERK-001", "740001000001", PRODUCT_CATEGORIES[0], 38, 55, 42, 8, PRODUCT_IMAGE_URLS["FOOD-JERK-001"], "Island Fresh Foods", "868-555-2001"],
      ["Doubles Pack", "FOOD-DOUB-002", "740001000002", PRODUCT_CATEGORIES[0], 6, 12, 80, 15, PRODUCT_IMAGE_URLS["FOOD-DOUB-002"], "Central Curry Supply", "868-555-2002"],
      ["Sorrel Drink", "DRINK-SOR-003", "740001000003", PRODUCT_CATEGORIES[1], 6, 15, 30, 10, PRODUCT_IMAGE_URLS["DRINK-SOR-003"], "Tropical Bev Co", "868-555-2003"],
      ["Mauby Bottle", "DRINK-MAU-004", "740001000004", PRODUCT_CATEGORIES[1], 5, 14, 24, 10, PRODUCT_IMAGE_URLS["DRINK-MAU-004"], "Tropical Bev Co", "868-555-2003"],
      ["Plantain Chips", "SNACK-PLA-005", "740001000005", PRODUCT_CATEGORIES[2], 7, 16, 12, 12, PRODUCT_IMAGE_URLS["SNACK-PLA-005"], "SnackWorks TT", "868-555-2004"],
      ["Screen Printed Tee", "APP-TEE-006", "740001000006", PRODUCT_CATEGORIES[4], 48, 120, 18, 5, PRODUCT_IMAGE_URLS["APP-TEE-006"], "Queen Street Apparel", "868-555-2005"],
      ["Digital Top-Up", "DIG-TOP-007", "740001000007", PRODUCT_CATEGORIES[5], 45, 50, 999, 100, PRODUCT_IMAGE_URLS["DIG-TOP-007"], "Local Digital Services", "868-555-2006"],
      ["Custom Repair Service", "SERV-REP-008", "740001000008", PRODUCT_CATEGORIES[3], 80, 150, 999, 100, PRODUCT_IMAGE_URLS["SERV-REP-008"], "In-house", "868-555-0100"]
    ];
    for (const product of products) {
      await rawQuery(
        `INSERT INTO products (
          id, name, sku, barcode, category, cost_price, selling_price,
          stock_quantity, low_stock_alert, image_url, supplier_name, supplier_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [createId("prd"), ...product]
      );
    }
  }

  const customerCount = Number((await rawQuery<{ count: string }>("SELECT COUNT(*) AS count FROM customers")).rows[0]?.count || 0);
  if (!customerCount) {
    await rawQuery(
      `INSERT INTO customers (
        id, name, phone, phone_normalized, email, street_address, community, city, region,
        country, delivery_notes, preferred_payment_method, marketing_consent, loyalty_points,
        total_spent, orders_count, last_order_at, tags
      ) VALUES
        ($1, 'John Doe', '868-123-4567', '18681234567', 'john@example.com', '25 Main Road', 'Montrose', 'Chaguanas', 'Chaguanas',
         'Trinidad and Tobago', 'Call when outside', 'Cash', TRUE, 44, 440, 4, NOW() - INTERVAL '2 days', $2::jsonb),
        ($3, 'Priya Singh', '868-222-9988', '18682229988', 'priya@example.com', '7 Coffee Street', 'St. Augustine', 'Tunapuna', 'Tunapuna-Piarco',
         'Trinidad and Tobago', 'Leave at reception', 'WiPay', TRUE, 18, 180, 2, NOW() - INTERVAL '2 days', $4::jsonb)`,
      [createId("cus"), JSON.stringify(["VIP", "Frequent Buyer"]), createId("cus"), JSON.stringify(["New Customer"])]
    );
  }
}

async function updateSeedProductImages() {
  for (const [sku, imageUrl] of Object.entries(PRODUCT_IMAGE_URLS)) {
    await rawQuery(
      "UPDATE products SET image_url = $1, updated_at = NOW() WHERE sku = $2 AND (image_url IS NULL OR image_url = '')",
      [imageUrl, sku]
    );
  }
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export type { PoolClient };

function emptyResult<T extends QueryResultRow = QueryResultRow>(): QueryResult<T> {
  return {
    command: "SELECT",
    rowCount: 0,
    oid: 0,
    fields: [],
    rows: []
  };
}

function fakeClient() {
  return {
    query: async () => emptyResult(),
    release: () => undefined
  };
}
