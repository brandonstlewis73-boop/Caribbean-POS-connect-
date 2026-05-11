import { randomUUID } from "node:crypto";
import dns from "node:dns";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";
import { DEFAULT_DELIVERY_RATES, PRODUCT_CATEGORIES } from "./constants";
import { DEFAULT_HELP_ARTICLES } from "./support-context";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Older Node versions can ignore this; Vercel's supported runtimes honor it.
}

type DbClient = Pool | PoolClient;
type DatabaseEnvName = "DATABASE_URL" | "SUPABASE_DB_URL";
type DatabaseSslConfig = PoolConfig["ssl"];

type DatabaseConnectionConfig = {
  selectedDatabaseEnv: DatabaseEnvName | null;
  connectionString: string | null;
  databaseHost: string | null;
  databasePort: string | null;
  databaseName: string | null;
  databaseUser: string | null;
  databaseUserLooksLikeSupabasePooler: boolean;
  databasePasswordLength: number | null;
  databasePasswordHasWhitespace: boolean;
  databasePasswordHasWrappingBrackets: boolean;
  databasePasswordContainsBrackets: boolean;
  databaseUrlHasWhitespace: boolean;
  sslMode: string | null;
  sslModeKnown: boolean;
  sslConfigured: boolean;
  sslRejectUnauthorized: boolean | null;
  usesSupabasePooler: boolean;
  usesDirectSupabaseHost: boolean;
  supabaseProjectRef: string | null;
  warnings: string[];
  ssl: DatabaseSslConfig;
};

const SSL_QUERY_PARAMS = ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"];
const KNOWN_SSL_MODES = new Set([
  "disable",
  "allow",
  "prefer",
  "require",
  "verify-ca",
  "verify-full",
  "true",
  "no-verify"
]);

function getSelectedDatabaseEnv(): DatabaseEnvName | null {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return "DATABASE_URL";
  }
  if (process.env.SUPABASE_DB_URL && !process.env.SUPABASE_DB_URL.startsWith("file:")) {
    return "SUPABASE_DB_URL";
  }
  return null;
}

function rawDatabaseUrl() {
  const envName = getSelectedDatabaseEnv();
  return envName ? process.env[envName] || null : null;
}

const configuredDatabaseUrl = rawDatabaseUrl() || undefined;
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
  var __cpcPool: Pool | undefined;
  var __cpcDbInit: Promise<void> | undefined;
  var __cpcDbConfigLogged: boolean | undefined;
}

function normalizeDatabaseUrl(url: string) {
  const trimmedUrl = url.trim();
  try {
    const parsed = new URL(trimmedUrl);
    const databaseUser = decodeUrlValue(parsed.username) || null;
    const databasePassword = decodeUrlValue(parsed.password);
    const sslMode =
      parsed.searchParams.get("sslmode")?.toLowerCase() ||
      parsed.searchParams.get("ssl")?.toLowerCase() ||
      null;
    for (const param of SSL_QUERY_PARAMS) {
      parsed.searchParams.delete(param);
    }
    return {
      connectionString: parsed.toString(),
      databaseHost: parsed.hostname || null,
      databasePort: parsed.port || null,
      databaseName: parsed.pathname.replace(/^\/+/, "") || null,
      databaseUser,
      databasePassword,
      sslMode
    };
  } catch {
    return {
      connectionString: trimmedUrl,
      databaseHost: databaseHost(trimmedUrl),
      databasePort: databasePort(trimmedUrl),
      databaseName: null,
      databaseUser: null,
      databasePassword: "",
      sslMode: extractSslMode(trimmedUrl)
    };
  }
}

function decodeUrlValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function databasePort(url: string) {
  try {
    return new URL(url).port || null;
  } catch {
    const match = url.match(/@[^/:?]+:(\d+)/);
    return match?.[1] || null;
  }
}

function extractSslMode(url: string) {
  const match = url.match(/[?&](?:sslmode|ssl)=([^&]+)/i);
  return match?.[1]?.toLowerCase() || null;
}

function sslConfigForDatabase({
  sslMode,
  usesSupabasePooler,
  usesDirectSupabaseHost
}: Pick<DatabaseConnectionConfig, "sslMode" | "usesSupabasePooler" | "usesDirectSupabaseHost">): DatabaseSslConfig {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (
    process.env.PGSSL_DISABLE === "true" &&
    !isProduction &&
    !usesSupabasePooler &&
    !usesDirectSupabaseHost
  ) {
    return false;
  }

  if (sslMode === "disable" && !isProduction && !usesSupabasePooler && !usesDirectSupabaseHost) {
    return false;
  }

  if (
    sslMode === "no-verify" ||
    usesSupabasePooler ||
    usesDirectSupabaseHost
  ) {
    return { rejectUnauthorized: false };
  }

  if (sslMode === "require" || sslMode === "true" || isProduction || process.env.PGSSLMODE === "require") {
    return true;
  }

  return undefined;
}

function describeSslConfig(ssl: DatabaseSslConfig) {
  if (!ssl) {
    return {
      sslConfigured: false,
      sslRejectUnauthorized: null
    };
  }
  if (ssl === true) {
    return {
      sslConfigured: true,
      sslRejectUnauthorized: true
    };
  }
  return {
    sslConfigured: true,
    sslRejectUnauthorized: ssl.rejectUnauthorized !== false
  };
}

function getDatabaseConnectionConfig(): DatabaseConnectionConfig {
  const selectedDatabaseEnv = getSelectedDatabaseEnv();
  const url = rawDatabaseUrl();
  if (!url || url.startsWith("file:")) {
    return {
      selectedDatabaseEnv,
      connectionString: null,
      databaseHost: null,
      databasePort: null,
      databaseName: null,
      databaseUser: null,
      databaseUserLooksLikeSupabasePooler: false,
      databasePasswordLength: null,
      databasePasswordHasWhitespace: false,
      databasePasswordHasWrappingBrackets: false,
      databasePasswordContainsBrackets: false,
      databaseUrlHasWhitespace: false,
      sslMode: null,
      sslModeKnown: true,
      sslConfigured: false,
      sslRejectUnauthorized: null,
      usesSupabasePooler: false,
      usesDirectSupabaseHost: false,
      supabaseProjectRef: null,
      warnings: [],
      ssl: undefined
    };
  }

  const normalized = normalizeDatabaseUrl(url);
  const databaseHost = normalized.databaseHost;
  const directSupabaseMatch = databaseHost?.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  const poolerUserMatch = normalized.databaseUser?.match(/^postgres\.([a-z0-9]+)$/);
  const usesSupabasePooler = Boolean(
    databaseHost === "pooler.supabase.com" || databaseHost?.endsWith(".pooler.supabase.com")
  );
  const databasePassword = normalized.databasePassword || "";
  const usesDirectSupabaseHost = Boolean(directSupabaseMatch);
  const sslModeKnown = !normalized.sslMode || KNOWN_SSL_MODES.has(normalized.sslMode);
  const databaseUrlHasWhitespace = url !== url.trim() || /\s/.test(url);
  const warnings: string[] = [];
  if (databaseUrlHasWhitespace) {
    warnings.push("The selected database URL contains whitespace. Remove spaces or line breaks in Vercel, then redeploy.");
  }
  if (normalized.sslMode && !sslModeKnown) {
    warnings.push(`The selected database URL has an unrecognized sslmode value: ${normalized.sslMode}. Use sslmode=no-verify for the Supabase pooler.`);
  }
  if (usesSupabasePooler && normalized.databasePort !== "6543") {
    warnings.push("The Supabase transaction pooler should use port 6543 for serverless deployments.");
  }
  if (usesDirectSupabaseHost) {
    warnings.push("The selected database URL uses the direct Supabase host. Vercel should use the Supabase transaction pooler host on port 6543.");
  }
  const ssl = sslConfigForDatabase({
    sslMode: normalized.sslMode,
    usesSupabasePooler,
    usesDirectSupabaseHost
  });
  const sslDescription = describeSslConfig(ssl);

  return {
    selectedDatabaseEnv,
    connectionString: normalized.connectionString,
    databaseHost,
    databasePort: normalized.databasePort,
    databaseName: normalized.databaseName,
    databaseUser: normalized.databaseUser,
    databaseUserLooksLikeSupabasePooler: !usesSupabasePooler || Boolean(poolerUserMatch),
    databasePasswordLength: databasePassword.length,
    databasePasswordHasWhitespace: /\s/.test(databasePassword),
    databasePasswordHasWrappingBrackets:
      databasePassword.startsWith("[") && databasePassword.endsWith("]"),
    databasePasswordContainsBrackets: /[\[\]]/.test(databasePassword),
    databaseUrlHasWhitespace,
    sslMode: normalized.sslMode,
    sslModeKnown,
    ...sslDescription,
    usesSupabasePooler,
    usesDirectSupabaseHost,
    supabaseProjectRef: directSupabaseMatch?.[1] || poolerUserMatch?.[1] || null,
    warnings,
    ssl
  };
}

export function databaseConfigStatus() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")),
    hasSupabaseDbUrl: Boolean(process.env.SUPABASE_DB_URL && !process.env.SUPABASE_DB_URL.startsWith("file:")),
    isDemoMode,
    nodeEnv: process.env.NODE_ENV || "development",
    vercelEnv: process.env.VERCEL_ENV || null
  };
}

export function databaseConnectionDiagnostics() {
  const config = getDatabaseConnectionConfig();
  return {
    selectedDatabaseEnv: config.selectedDatabaseEnv,
    databaseHost: config.databaseHost,
    databasePort: config.databasePort,
    databaseName: config.databaseName,
    databaseUser: config.databaseUser,
    databaseUserLooksLikeSupabasePooler: config.databaseUserLooksLikeSupabasePooler,
    databasePasswordLength: config.databasePasswordLength,
    databasePasswordHasWhitespace: config.databasePasswordHasWhitespace,
    databasePasswordHasWrappingBrackets: config.databasePasswordHasWrappingBrackets,
    databasePasswordContainsBrackets: config.databasePasswordContainsBrackets,
    databaseUrlHasWhitespace: config.databaseUrlHasWhitespace,
    sslMode: config.sslMode,
    sslModeKnown: config.sslModeKnown,
    sslConfigured: config.sslConfigured,
    sslRejectUnauthorized: config.sslRejectUnauthorized,
    usesSupabasePooler: config.usesSupabasePooler,
    usesDirectSupabaseHost: config.usesDirectSupabaseHost,
    supabaseProjectRef: config.supabaseProjectRef,
    warnings: config.warnings
  };
}

function databaseHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    const match = url.match(/@([^/:?]+)(?::\d+)?/);
    return match?.[1] || null;
  }
}

export function databaseErrorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "Database request failed.";
  const normalized = message.toLowerCase();
  const diagnostics = databaseConnectionDiagnostics();

  if (
    diagnostics.usesDirectSupabaseHost &&
    (process.env.VERCEL ||
      code === "EACCES" ||
      code === "ENETUNREACH" ||
      code === "ENOTFOUND" ||
      normalized.includes("eacces") ||
      normalized.includes("enetunreach") ||
      normalized.includes("getaddrinfo enotfound"))
  ) {
    return "Database URL is using the direct Supabase host. Use the Supabase Transaction pooler host on port 6543 for DATABASE_URL, then redeploy.";
  }

  if (
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    normalized.includes("self-signed certificate") ||
    normalized.includes("certificate chain")
  ) {
    return "Database SSL verification failed. Check that Vercel is using the Supabase pooler URL and that the latest deployment includes server-side pooler SSL handling.";
  }

  if (code === "ENETUNREACH" || normalized.includes("enetunreach")) {
    return "Database connection failed from Vercel. Set DATABASE_URL to the Supabase pooled connection string, then redeploy.";
  }

  if (code === "ENOTFOUND" || normalized.includes("getaddrinfo enotfound")) {
    return "Database host was not found from Vercel. Use the Supabase Transaction pooler connection string for DATABASE_URL or SUPABASE_DB_URL, then redeploy.";
  }

  if (code === "ECONNREFUSED" || normalized.includes("econnrefused")) {
    return "Database refused the connection. Check the Vercel DATABASE_URL host, port, password, and SSL settings.";
  }

  if (code === "ETIMEDOUT" || normalized.includes("timeout")) {
    return "Database connection timed out. Check Vercel DATABASE_URL or use the Supabase pooled connection string.";
  }

  if (code === "28P01" || normalized.includes("password authentication failed")) {
    if (diagnostics.databasePasswordHasWrappingBrackets) {
      return "Database login failed. Vercel DATABASE_URL password appears to include wrapping square brackets; remove the brackets and redeploy.";
    }
    if (diagnostics.databasePasswordHasWhitespace) {
      return "Database login failed. Vercel DATABASE_URL password appears to include whitespace; remove extra spaces or line breaks and redeploy.";
    }
    if (!diagnostics.databaseUserLooksLikeSupabasePooler) {
      return "Database login failed. For the Supabase pooler, the username should look like postgres.PROJECT_REF.";
    }
    return "Postgres authentication failed. The app reached the Supabase pooler, but Supabase rejected the username/password saved in the selected Vercel database environment variable. Confirm the Production DATABASE_URL value and redeploy.";
  }

  if (normalized.includes("database is not configured")) {
    return message;
  }

  return `Database request failed: ${message}`;
}

export function safeDatabaseErrorDetails(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error ? String(error.code) : null;
  return {
    code,
    message: databaseErrorMessage(error),
    database: databaseConnectionDiagnostics()
  };
}

function safeConnectionLogDetails(connection: DatabaseConnectionConfig) {
  return {
    selectedDatabaseEnv: connection.selectedDatabaseEnv,
    databaseHost: connection.databaseHost,
    databasePort: connection.databasePort,
    databaseName: connection.databaseName,
    sslMode: connection.sslMode,
    sslConfigured: connection.sslConfigured,
    sslRejectUnauthorized: connection.sslRejectUnauthorized,
    usesSupabasePooler: connection.usesSupabasePooler,
    usesDirectSupabaseHost: connection.usesDirectSupabaseHost,
    warnings: connection.warnings
  };
}

export function getDb() {
  if (globalThis.__cpcPool) return globalThis.__cpcPool;
  const connection = getDatabaseConnectionConfig();
  if (!connection.connectionString) {
    throw new Error(
      "Database is not configured. Add DATABASE_URL or SUPABASE_DB_URL in Vercel Environment Variables, then redeploy."
    );
  }
  if (!globalThis.__cpcDbConfigLogged) {
    console.info("Database connection configuration", safeConnectionLogDetails(connection));
    globalThis.__cpcDbConfigLogged = true;
  }
  globalThis.__cpcPool = new Pool({
    connectionString: connection.connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
    ssl: connection.ssl
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
  await seedHelpArticles();
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
  await insertSetting("logo_url", "/logo.svg");
  await insertSetting("active_business_id", "biz_savannah_sea");
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
  await insertSetting("whatsapp_owner_alerts_enabled", true);
  await insertSetting("whatsapp_customer_receipts_enabled", false);
  await insertSetting("whatsapp_driver_assignment_enabled", true);
  await insertSetting("whatsapp_driver_alerts_enabled", true);
  await insertSetting("whatsapp_out_for_delivery_enabled", true);
  await insertSetting(
    "whatsapp_order_template",
    "New Order - {{business_name}}\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nType: {{order_type}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nPayment status: {{payment_status}}\nOrder status: {{order_status}}\nDate/time: {{date_time}}\nDashboard: {{dashboard_link}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}"
  );
  await insertSetting(
    "whatsapp_customer_receipt_template",
    "Hi {{customer_name}}, your receipt for order #{{order_number}} from {{business_name}} is ready.\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nCompleted: {{completed_at}}\n\n{{receipt_message}}\nContact: {{business_phone}}"
  );
  await insertSetting(
    "whatsapp_driver_assigned_template",
    "Hi {{customer_name}}, your {{business_name}} order #{{order_number}} has been assigned to {{driver_name}}.\nDriver phone: {{driver_phone}}\nStatus: {{delivery_status}}\nTotal: {{total}}\nContact: {{business_phone}}"
  );
  await insertSetting(
    "whatsapp_driver_alert_template",
    "Delivery assigned - {{business_name}}\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}} ({{payment_status}})\nWaze: {{waze_link}}\nDashboard: {{dashboard_link}}"
  );
  await insertSetting(
    "whatsapp_out_for_delivery_template",
    "Hi {{customer_name}}, your {{business_name}} order #{{order_number}} is out for delivery.\nDriver: {{driver_name}}\nDriver phone: {{driver_phone}}\nTotal: {{total}}\n{{receipt_message}}\nContact: {{business_phone}}"
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

async function seedHelpArticles() {
  for (const article of DEFAULT_HELP_ARTICLES) {
    await rawQuery(
      `INSERT INTO help_articles (
        id, title, category, content, tags, visibility, published, last_updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`,
      [
        article.id,
        article.title,
        article.category,
        article.content,
        JSON.stringify(article.tags),
        article.visibility,
        article.published,
        article.last_updated_at
      ]
    );
  }
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
