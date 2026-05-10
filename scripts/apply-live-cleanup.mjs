import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

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
    // Vercel and CI should provide DATABASE_URL directly.
  }
}

await readEnvFile();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString || connectionString.startsWith("file:")) {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL is required to run the live cleanup migration.");
}

const sql = await readFile(resolve("db/live_business_cleanup.sql"), "utf8");
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase") || process.env.PGSSLMODE === "require"
    ? { rejectUnauthorized: false }
    : undefined
});

try {
  await pool.query(sql);
  console.log("Live cleanup migration applied.");
} finally {
  await pool.end();
}
