import { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { isDemoMode, query } from "@/lib/db";
import { demoExportTables } from "@/lib/demo-store";

export const runtime = "nodejs";

const BACKUP_TABLES = [
  "users",
  "settings",
  "customers",
  "products",
  "orders",
  "order_items",
  "stock_movements",
  "receipts",
  "loyalty_transactions",
  "delivery_events",
  "audit_logs"
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const tables: Record<string, unknown> = isDemoMode ? await demoExportTables() : {};
  if (!isDemoMode) {
    for (const table of BACKUP_TABLES) {
      tables[table] = (await query(`SELECT * FROM ${table}`)).rows;
    }
  }

  const fileName = `caribbean-pos-connect-${Date.now()}.json`;
  return new Response(
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        database: isDemoMode ? "demo-memory" : "supabase-postgres",
        tables
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    }
  );
}
