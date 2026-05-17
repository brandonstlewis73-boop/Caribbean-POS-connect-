import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../lib/db";

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

async function main() {
  const backupDir = join(process.cwd(), "backups");
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const tables: Record<string, unknown> = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = (await query(`SELECT * FROM ${table}`)).rows;
  }

  const filePath = join(backupDir, `caribbean-pos-connect-${Date.now()}.json`);
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        database: "supabase-postgres",
        tables
      },
      null,
      2
    )
  );
  console.log(`Database export created: ${filePath}`);
  console.log("For production point-in-time recovery, also enable Supabase backups in your Supabase project.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
