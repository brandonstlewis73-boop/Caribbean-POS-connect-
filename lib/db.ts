import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { DEFAULT_DELIVERY_RATES, PRODUCT_CATEGORIES } from "./constants";

type DbClient = Pool | PoolClient;

const configuredDatabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const hasFileDatabaseUrl = Boolean(
  configuredDatabaseUrl?.startsWith("file:")
);
const explicitDemoMode =
  process.env.FORCE_DEMO === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const isDemoMode =
  explicitDemoMode ||
  (process.env.NODE_ENV !== "production" &&
    (!configuredDatabaseUrl || hasFileDatabaseUrl) &&
    process.env.FORCE_POSTGRES !== "true");

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

export function databaseConfigStatus() {
  const url = databaseUrl();
  return {
    hasDatabaseUrl: Boolean(url),
    hasSupabaseDbUrl: Boolean(process.env.SUPABASE_DB_URL && !process.env.SUPABASE_DB_URL.startsWith("file:")),
    hasPrimaryDatabaseUrl: Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")),
    isDemoMode,
    nodeEnv: process.env.NODE_ENV || "development",
    vercelEnv: process.env.VERCEL_ENV || null
  };
}

function shouldUseSsl(url: string) {
  if (process.env.PGSSL_DISABLE === "true") return false;
  return url.includes("supabase") || process.env.PGSSLMODE === "require";
}

export function getDb() {
  if (globalThis.__cpcPool) return globalThis.__cpcPool;
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "Database is not configured. Add DATABASE_URL or SUPABASE_DB_URL in Vercel Environment Variables, then redeploy."
    );
  }
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
  await seedInitialData();
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
  await insertSetting("payment_link_template", "");
  await insertSetting("whatsapp_enabled", true);
  await insertSetting("whatsapp_business_number", "4437582368");
  await insertSetting("whatsapp_country_code", "+1");
  await insertSetting(
    "whatsapp_order_template",
    "New Order - Caribbean POS Connect\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nStatus: {{payment_status}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}"
  );
  await insertSetting("facebook_url", "");
  await insertSetting("instagram_url", "");
  await insertSetting("payment_cash_enabled", true);
  await insertSetting("payment_card_enabled", true);
  await insertSetting("payment_bank_enabled", true);
  await insertSetting("payment_paypal_enabled", true);
  await insertSetting("payment_wipay_enabled", true);
  await insertSetting("payment_pod_enabled", true);
  await insertSetting("order_counter", 1024);
  await insertSetting("receipt_counter", 4024);
}

async function seedInitialData() {
  await rawQuery(
    `INSERT INTO businesses (id, name, legal_name, slug, phone, email, street_address, city, region, country, currency, logo_url)
     VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'Trinidad and Tobago', 'TTD', '/logo.svg')
     ON CONFLICT (id) DO NOTHING`,
    [
      "biz_savannah_sea",
      "Savannah & Sea Retail Ltd.",
      "savannah-sea-retail",
      "868-443-7582",
      "hello@savannahsea.tt",
      "18 Independence Square",
      "Port of Spain",
      "Port of Spain"
    ]
  );

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

  for (const [index, category] of PRODUCT_CATEGORIES.entries()) {
    await rawQuery(
      `INSERT INTO categories (id, name, slug, sort_order, active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, active = TRUE, updated_at = NOW()`,
      [
        `cat_${category.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
        category,
        category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        (index + 1) * 10
      ]
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
