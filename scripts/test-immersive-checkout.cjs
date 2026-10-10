/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  Module = require("node:module");
function load(file, mocks) {
  const filename = path.resolve(file),
    mod = new Module(filename, module);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = Module.createRequire(filename);
  mod.require = (id) => (Object.hasOwn(mocks, id) ? mocks[id] : normal(id));
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return mod.exports;
}
(async () => {
  const { checkoutSchema } = require("../lib/validators.ts"),
    { publicCheckoutError } = require("../lib/immersive/checkout-policy.ts");
  let received,
    calls = 0,
    settings = {
      storefront_status: "live",
      pickup_enabled: true,
      delivery_enabled: true,
      payment_cash_enabled: true,
    };
  const route = load("app/api/store/[slug]/orders/route.ts", {
    "@/lib/rate-limit": { limitRequest: async () => null },
    "@/lib/request-security": { readBoundedJson: async (r) => r.json() },
    "@/lib/api": {
      ok: (data, options) => ({ data, status: options.status }),
      fail: (message, status) => ({ message, status }),
    },
    "@/lib/data": {
      getBusinessBySlug: async () => ({ id: "merchant-a" }),
      getBusinessSettings: async () => settings,
      createOrder: async (p) => {
        received = p;
        calls++;
        return { id: "order-test" };
      },
    },
    "@/lib/validators": { checkoutSchema },
    "@/lib/immersive/checkout-policy": { publicCheckoutError },
  });
  const payload = {
    customer: { name: "QA", phone: "14430000000" },
    items: [{ product_id: "p1", quantity: 2, price: 0.01, discount: 99 }],
    order_type: "pickup",
    payment_method: "Cash",
    payment_status: "paid",
    status: "completed",
    business_id: "attacker",
    discount_amount: 999,
    delivery_fee: 0,
    service_fee: 0,
    total: 0.02,
    expected_total: 100,
    assigned_driver_id: "attacker",
  };
  const post = (p) =>
    route.POST(
      { json: async () => p },
      { params: Promise.resolve({ slug: "baker-buds" }) },
    );
  assert.equal((await post(payload)).status, 201);
  assert.equal(received.business_id, "merchant-a");
  assert.equal(received.payment_status, "unpaid");
  assert.equal(received.status, "new");
  assert.equal(received.discount_amount, 0);
  assert.equal(received.items[0].discount, 0);
  assert.equal(received.items[0].price, undefined);
  assert.equal(received.total, undefined);
  assert.equal(received.delivery_fee, undefined);
  assert.equal(received.service_fee, undefined);
  assert.equal(received.assigned_driver_id, undefined);
  settings = { ...settings, storefront_status: "paused" };
  assert.equal((await post(payload)).status, 409);
  assert.equal(calls, 1);
  settings = { ...settings, storefront_status: "live", pickup_enabled: false };
  assert.equal((await post(payload)).status, 409);
  assert.equal(
    (await post({ ...payload, order_type: "delivery" })).status,
    422,
  );
  // Exercise the actual createOrder pricing/stock path, intercepting SQL before any write.
  let products = [
      {
        id: "p1",
        name: "Brownie",
        selling_price: 60,
        discount_price: 50,
        stock_quantity: 3,
      },
    ],
    insert,
    locked = false;
  const config = {
    currency: "TTD",
    tax_enabled: false,
    service_fee_enabled: true,
    service_fee_rate: 5,
    delivery_fee: 25,
    delivery_rates: {},
    free_delivery_minimum: 100,
    whatsapp_enabled: false,
  };
  const db = {
    createId: () => "qa-id",
    transaction: async (f) => f({}),
    query: async (sql, args) => {
      if (sql.includes("FROM business_settings"))
        return {
          rows: Object.entries(config).map(([key, value]) => ({ key, value })),
        };
      if (sql.includes("FROM products WHERE id=ANY")) {
        assert.match(sql, /business_id=\$2.*FOR UPDATE/);
        assert.equal(args[1], "merchant-a");
        locked = true;
        return { rows: products };
      }
      if (sql.includes("INSERT INTO orders (")) {
        insert = args;
        throw Error("QA_CAPTURE");
      }
      return { rows: [] };
    },
  };
  const data = load("lib/data.ts", {
    "./db": db,
    "./whatsapp-server": {
      sendWhatsAppMessage: () => {
        throw Error("Notifications forbidden in QA");
      },
    },
    react: { cache: (f) => f },
  });
  const base = {
    business_id: "merchant-a",
    storefront_slug: "baker-buds",
    items: [{ product_id: "p1", quantity: 2, price: 0.01 }],
    order_type: "delivery",
    payment_method: "Cash",
    payment_status: "unpaid",
    status: "new",
    discount_amount: 0,
  };
  await assert.rejects(
    () => data.createOrder({ ...base, expected_total: 105 }),
    /QA_CAPTURE/,
  );
  assert.ok(locked);
  assert.equal(insert[11], 100);
  assert.equal(insert[14], 5);
  assert.equal(insert[15], 0);
  assert.equal(insert[16], 105);
  await assert.rejects(
    () => data.createOrder({ ...base, expected_total: 0.02 }),
    /Prices or fees changed/,
  );
  await assert.rejects(
    () =>
      data.createOrder({
        ...base,
        items: [
          { product_id: "p1", quantity: 2 },
          { product_id: "p1", quantity: 2 },
        ],
      }),
    /only 3 in stock/,
  );
  products = [];
  await assert.rejects(() => data.createOrder(base), /Product not found/);
  console.log(
    "PASS public checkout tampering, paused fulfillment, actual saved-price/free-delivery/service-fee calculations, duplicate stock requests and tenant-scoped product locks (mock SQL; no external writes)",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
