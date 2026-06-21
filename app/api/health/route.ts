import { NextResponse } from "next/server";
import {
  databaseConfigStatus,
  databaseConnectionDiagnostics,
  databaseErrorMessage,
  getDb
} from "@/lib/db";
import { aiSupportStatus } from "@/lib/ai-support";
import { whatsappConfigStatus } from "@/lib/whatsapp-server";
import { stripeConfigStatus } from "@/lib/stripe";
import { supabaseProductImageStorageStatus } from "@/lib/supabase-storage";

export const runtime = "nodejs";

async function getAuthStoreStatus() {
  try {
    const result = await getDb().query<{ admin_count: string }>(
      "SELECT COUNT(*) AS admin_count FROM users WHERE role IN ('owner', 'admin') AND active = TRUE"
    );
    return {
      source: "users",
      usersViewAvailable: true,
      adminUserPresent: Number(result.rows[0]?.admin_count ?? 0) > 0,
      adminUserCount: Number(result.rows[0]?.admin_count ?? 0)
    };
  } catch (usersError) {
    try {
      const result = await getDb().query<{ admin_count: string }>(
        "SELECT COUNT(*) AS admin_count FROM staff_users WHERE role IN ('owner', 'admin') AND active = TRUE"
      );
      return {
        source: "staff_users",
        usersViewAvailable: false,
        adminUserPresent: Number(result.rows[0]?.admin_count ?? 0) > 0,
        adminUserCount: Number(result.rows[0]?.admin_count ?? 0),
        message: "The users view is unavailable; auth is using staff_users fallback."
      };
    } catch {
      return {
        source: null,
        usersViewAvailable: false,
        adminUserPresent: false,
        message: databaseErrorMessage(usersError)
      };
    }
  }
}

function deploymentStatus() {
  return {
    vercelUrl: process.env.VERCEL_URL || null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null
  };
}

async function checkRelation(name: string) {
  try {
    const result = await getDb().query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists`,
      [name]
    );
    return Boolean(result.rows[0]?.exists);
  } catch {
    return false;
  }
}

async function checkColumn(tableName: string, columnName: string) {
  try {
    const result = await getDb().query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      ) AS exists`,
      [tableName, columnName]
    );
    return Boolean(result.rows[0]?.exists);
  } catch {
    return false;
  }
}

async function getSchemaReadiness() {
  const [
    businesses,
    businessSettings,
    products,
    categories,
    customers,
    orders,
    receipts,
    aiSupportLogs,
    aiBusinessLogs,
    customerNotifications,
    orderStatusHistory,
    productsBusinessId,
    ordersBusinessId,
    receiptsBusinessId,
    aiBusinessLogsUserId
  ] = await Promise.all([
    checkRelation("businesses"),
    checkRelation("business_settings"),
    checkRelation("products"),
    checkRelation("categories"),
    checkRelation("customers"),
    checkRelation("orders"),
    checkRelation("receipts"),
    checkRelation("ai_support_logs"),
    checkRelation("ai_business_logs"),
    checkRelation("customer_notifications"),
    checkRelation("order_status_history"),
    checkColumn("products", "business_id"),
    checkColumn("orders", "business_id"),
    checkColumn("receipts", "business_id"),
    checkColumn("ai_business_logs", "user_id")
  ]);
  const tables = {
    businesses,
    businessSettings,
    products,
    categories,
    customers,
    orders,
    receipts,
    aiSupportLogs,
    aiBusinessLogs,
    customerNotifications,
    orderStatusHistory
  };
  const columns = {
    productsBusinessId,
    ordersBusinessId,
    receiptsBusinessId,
    aiBusinessLogsUserId
  };
  const missingTables = Object.entries(tables).filter(([, exists]) => !exists).map(([name]) => name);
  const missingColumns = Object.entries(columns).filter(([, exists]) => !exists).map(([name]) => name);
  return {
    ok: missingTables.length === 0 && missingColumns.length === 0,
    tables,
    columns,
    missingTables,
    missingColumns,
    message: missingTables.length || missingColumns.length
      ? "Database schema is missing required production tables or columns. Apply db/schema.sql or the specific migration file."
      : "Database schema is ready."
  };
}

function billingReadiness() {
  const stripe = stripeConfigStatus();
  const paypal = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const wipay = Boolean(process.env.WIPAY_ACCOUNT_NUMBER || process.env.WIPAY_API_KEY);
  return {
    configured: stripe.configured || paypal || wipay,
    stripe: stripe.configured,
    stripeWebhookConfigured: stripe.webhookConfigured,
    stripeReadyForPaidCheckout: stripe.readyForPaidCheckout,
    stripePriceIds: stripe.priceIds,
    missingStripe: stripe.missing,
    paypal,
    wipay,
    message: stripe.readyForPaidCheckout || paypal || wipay
      ? "At least one payment provider is configured for checkout."
      : "Subscription checkout is not fully configured. Add Stripe secret, webhook secret, and price IDs in Vercel, then redeploy."
  };
}

export async function GET() {
  const config = databaseConfigStatus();
  const diagnostics = databaseConnectionDiagnostics();
  const deployment = deploymentStatus();
  const whatsapp = whatsappConfigStatus();
  const ai = aiSupportStatus();
  const billing = billingReadiness();
  const storage = await supabaseProductImageStorageStatus();
  const startedAt = Date.now();

  try {
    await getDb().query("SELECT 1");
    const [auth, schema] = await Promise.all([getAuthStoreStatus(), getSchemaReadiness()]);
    return NextResponse.json({
      ok: true,
      mode: "postgres",
      database: {
        connected: true,
        select1: true,
        message: "Connected",
        ...diagnostics,
        latencyMs: Date.now() - startedAt
      },
      auth,
      schema,
      config,
      deployment,
      whatsapp,
      ai,
      billing,
      storage
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgres",
        database: {
          connected: false,
          select1: false,
          message: databaseErrorMessage(error),
          ...diagnostics
        },
        config,
        deployment,
        whatsapp,
        ai,
        billing,
        storage
      },
      { status: 500 }
    );
  }
}
