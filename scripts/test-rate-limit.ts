import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { createSession, getSessionUserFromRequest } from "../lib/auth";
import type { Pool } from "pg";
import { enforceRateLimit, requestClientKey } from "../lib/rate-limit";

async function main() {
  Object.assign(process.env, { CPC_AUTO_MIGRATE: "false", SESSION_SECRET: "test-rate-limit-secret-with-32-bytes" });
  const db = new PGlite();
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated");
  await db.exec(await readFile("db/security_rate_limits.sql", "utf8"));
  const grants = await db.query<{anon_read:boolean;user_write:boolean}>("SELECT has_table_privilege('anon', 'security_rate_limits', 'SELECT') AS anon_read, has_table_privilege('authenticated', 'security_rate_limits', 'INSERT') AS user_write");
  assert.equal(grants.rows[0].anon_read,false);
  assert.equal(grants.rows[0].user_write,false);
  globalThis.__cpcPool = { query: async (sql: string, params: unknown[]) => db.query(sql, params) } as unknown as Pool;
  try {
    await db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, business_id TEXT, name TEXT, email TEXT, role TEXT, phone TEXT, active BOOLEAN, password_hash TEXT)");
    await db.exec("INSERT INTO users VALUES ('user-a', 'tenant-a', 'Staff', 'staff@example.com', 'cashier', NULL, TRUE, 'original-test-hash')");
    const user = { id: "user-a", business_id: "tenant-a", name: "Staff", email: "staff@example.com", role: "cashier" as const, active: true };
    const token = await createSession(user);
    const request = new NextRequest("https://pos.example/api/auth/me", { headers: { cookie: `cpc_session=${token}` } });
    const identity = await getSessionUserFromRequest(request);
    assert.equal(identity?.id, user.id);
    assert.ok(!JSON.stringify(identity).includes("hash"));
    await db.exec("UPDATE users SET password_hash = 'rotated-test-hash' WHERE id = 'user-a'");
    assert.equal(await getSessionUserFromRequest(request), null);
    const refreshed = await createSession(user);
    const refreshedRequest = new NextRequest("https://pos.example/api/auth/me", { headers: { cookie: `cpc_session=${refreshed}` } });
    await db.exec("UPDATE users SET active = FALSE WHERE id = 'user-a'");
    assert.equal(await getSessionUserFromRequest(refreshedRequest), null);
    const rule = { scope: "test", key: "private@example.com", limit: 5, windowSeconds: 900 };
    const results = await Promise.all(Array.from({ length: 20 }, () => enforceRateLimit(rule)));
    assert.equal(results.filter((response) => response === null).length, 5);
    assert.equal(results.filter((response) => response?.status === 429).length, 15);
    const blocked = results.find((response) => response?.status === 429)!;
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    assert.equal(blocked.headers.get("cache-control"), "no-store");
    const rows = await db.query<{ key: string; attempts: number }>("SELECT key, attempts FROM security_rate_limits");
    assert.equal(rows.rows[0].attempts, 20);
    assert.match(rows.rows[0].key, /^[a-f0-9]{64}$/);
    assert.equal(await enforceRateLimit({ ...rule, key: "another@example.com" }), null);
    assert.equal(await enforceRateLimit({ ...rule, scope: "another" }), null);
    await db.exec("UPDATE security_rate_limits SET expires_at = NOW() - INTERVAL '1 second'");
    assert.equal(await enforceRateLimit(rule), null);
    const reset = await db.query<{ attempts: number }>("SELECT attempts FROM security_rate_limits WHERE key = $1", [rows.rows[0].key]);
    assert.equal(reset.rows[0].attempts, 1);
    process.env.VERCEL = "1";
    assert.equal(requestClientKey(new Request("https://pos.example", { headers: { "x-forwarded-for": "spoofed", "x-vercel-forwarded-for": "trusted, proxy" } })), "trusted");
    assert.equal(requestClientKey(new Request("https://pos.example", { headers: { "x-forwarded-for": "spoofed" } })), "unknown");
    globalThis.__cpcPool = { query: async () => { throw new Error("test database unavailable"); } } as unknown as Pool;
    assert.equal((await enforceRateLimit(rule))?.status, 503);
    console.log("Postgres session revocation and rate-limit tests passed: 20 concurrent attempts, shared atomic counters, hashed identities, expiry reset, separate scopes, retry headers, trusted IP header, and fail-closed outages.");
  } finally { globalThis.__cpcPool = undefined; await db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
