import assert from "node:assert/strict";
import type { Pool } from "pg";
import { saveAiProductDescription, AiProductActionError } from "../lib/ai-product-actions";
import type { User } from "../lib/types";
import { NextRequest } from "next/server";
import { POST } from "../app/api/ai/actions/product-description/route";

async function main() {
  process.env.CPC_AUTO_MIGRATE = "false";
  const originalPool = globalThis.__cpcPool;
  const product = { id: "product-one", business_id: "business-one", name: "Brownie", description: "Original", selling_price: 60, stock_quantity: 26 };
  let snapshot = { ...product };
  let auditFailure = false;
  let writes = 0;
  let audits = 0;
  const statements: string[] = [];
  const client = {
    async query(sql: string, params: unknown[] = []) {
      statements.push(sql);
      if (sql === "BEGIN") snapshot = { ...product };
      if (sql === "ROLLBACK") Object.assign(product, snapshot);
      if (sql.startsWith("SELECT id, name, description FROM products")) {
        assert(sql.includes("business_id = $2"));
        assert(sql.includes("FOR UPDATE"));
        return { rows: params[0] === product.id && params[1] === product.business_id ? [{ id: product.id, name: product.name, description: product.description }] : [] };
      }
      if (sql.startsWith("UPDATE products")) {
        assert(sql.includes("business_id = $3"));
        assert(!/selling_price|cost_price|stock_quantity/.test(sql));
        assert.equal(params[2], product.business_id);
        product.description = String(params[0]); writes++;
      }
      if (sql.startsWith("INSERT INTO audit_logs")) {
        if (auditFailure) throw new Error("Audit unavailable");
        assert.equal(params[2], "ai:product-description:save");
        assert.equal(JSON.parse(String(params[5])).previousDescription, snapshot.description);
        audits++;
      }
      return { rows: [] };
    }, release() {}
  };
  globalThis.__cpcPool = { query: client.query.bind(client), connect: async () => client } as unknown as Pool;
  const owner: User = { id: "owner-one", business_id: "business-one", name: "Owner", email: "owner@example.test", role: "owner", active: true };
  try {
    const input = { productId: product.id, description: "A concise product description.", expectedDescription: "Original" };
    const result = await saveAiProductDescription(owner, input);
    assert.equal(result.description, input.description);
    assert.equal(product.selling_price, 60);
    assert.equal(product.stock_quantity, 26);
    assert.equal(writes, 1); assert.equal(audits, 1);
    assert(statements.includes("COMMIT"));
    await assert.rejects(saveAiProductDescription({ ...owner, business_id: "other-business" }, { ...input, expectedDescription: product.description }), (e: unknown) => e instanceof AiProductActionError && e.status === 404);
    const before = statements.length;
    await assert.rejects(saveAiProductDescription({ ...owner, role: "cashier" }, input), (e: unknown) => e instanceof AiProductActionError && e.status === 403);
    assert.equal(statements.length, before, "read-only roles do not open a write transaction");
    await assert.rejects(saveAiProductDescription(owner, input), (e: unknown) => e instanceof AiProductActionError && e.status === 409);
    assert.equal(writes, 1, "stale descriptions do not overwrite current content");
    const savedDescription = product.description;
    auditFailure = true;
    await assert.rejects(saveAiProductDescription(owner, { ...input, description: "Another description", expectedDescription: savedDescription }), /Audit unavailable/);
    assert.equal(product.description, savedDescription, "failed audit rolls back the description change");
    assert.equal(product.stock_quantity, 26);
    auditFailure = false;
    product.description = "";
    const emptyResult = await saveAiProductDescription(owner, { ...input, expectedDescription: null });
    assert.equal(emptyResult.description, input.description, "an empty catalog description does not produce a false conflict");
    assert.equal(product.stock_quantity, 26);
    const unauthorized = await POST(new NextRequest("http://localhost/api/ai/actions/product-description", { method: "POST", headers: { cookie: "cpc_session=invalid-test-session" }, body: JSON.stringify(input) }));
    assert.equal(unauthorized.status, 401);
    console.log("AI product save: persistence, audit, role/tenant isolation, stale-content conflict, rollback, and unauthenticated API checks passed.");
  } finally { globalThis.__cpcPool = originalPool; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
