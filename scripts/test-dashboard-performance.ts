import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { getDashboardData } from "../lib/data";

async function main() {
  process.env.CPC_AUTO_MIGRATE = "false";
  const db = new PGlite();
  await db.exec("CREATE TABLE orders (business_id TEXT, total NUMERIC, status TEXT, order_type TEXT, created_at TIMESTAMPTZ)");
  await db.exec(`INSERT INTO orders VALUES
    ('tenant-a', 20, 'new', 'pickup', NOW()),
    ('tenant-a', 45, 'completed', 'delivery', NOW()),
    ('tenant-a', 100, 'cancelled', 'delivery', NOW()),
    ('tenant-a', 30, 'preparing', 'delivery', NOW() - INTERVAL '2 days'),
    ('tenant-a', 40, 'completed', 'pickup', NOW() - INTERVAL '10 days'),
    ('tenant-a', 50, 'completed', 'pickup', NOW() - INTERVAL '40 days'),
    ('tenant-b', 9999, 'new', 'delivery', NOW())`);
  let metricCalls = 0;
  const previous = globalThis.__cpcPool;
  globalThis.__cpcPool = { query: async (sql: string, params: unknown[]) => {
    if (sql.includes("AS daily_sales")) { metricCalls++; return db.query(sql, params); }
    return { rows: [] };
  } } as unknown as Pool;
  try {
    const data = await getDashboardData("tenant-a");
    assert.equal(metricCalls, 1, "Headline metrics should use one database round trip");
    assert.equal(data.dailySales, 65);
    assert.equal(data.weeklySales, 95);
    assert.equal(data.monthlySales, 135);
    assert.equal(data.newOrders, 1);
    assert.equal(data.pendingOrders, 2);
    assert.equal(data.completedOrders, 1);
    assert.equal(data.deliveryOrderCount, 3);
    const empty = await getDashboardData("missing-tenant");
    assert.equal(empty.dailySales, 0);
    assert.equal(empty.pendingOrders, 0);
    const unscoped = await getDashboardData(null);
    assert.equal(unscoped.dailySales, 0);
    assert.equal(unscoped.newOrders, 0);
    console.log("Dashboard aggregate checks passed: one metric query, date windows, cancellations, pending/completed states, delivery counts, and tenant isolation.");
  } finally { globalThis.__cpcPool = previous; await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
