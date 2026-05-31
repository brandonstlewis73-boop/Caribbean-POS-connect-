import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { createPoolConfig } from "./db-pool-config.mjs";

async function readEnvFile() {
  try {
    const text = await readFile(resolve(".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").trim().replace(/^"|"$/g, "");
      }
    }
  } catch {
    // Production and CI provide environment variables directly.
  }
}

await readEnvFile();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString || connectionString.startsWith("file:")) {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL is required to apply the AI business logs migration.");
}

let databaseUrl;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL is not a valid Postgres URL.");
}

if (databaseUrl.hostname.endsWith(".supabase.co") && databaseUrl.port === "5432") {
  throw new Error(
    "This machine is using the direct Supabase database host on port 5432. Use the Supabase transaction pooler host on port 6543 in DATABASE_URL, then rerun npm run db:ai-logs."
  );
}

const sql = await readFile(resolve("db/add_ai_business_logs.sql"), "utf8");
const pool = new Pool(createPoolConfig(connectionString));

try {
  await pool.query(sql);
  console.log("AI business logs migration applied.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown database error";
  throw new Error(`AI business logs migration failed: ${message}`);
} finally {
  await pool.end();
}
