import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createPoolConfig } from "./db-pool-config.mjs";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";

function loadEnvFile(text) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cookieHeader(headers) {
  const cookies = [];
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  }
  return cookies.join("; ");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return {
    path,
    status: response.status,
    url: response.url,
    headers: response.headers,
    text
  };
}

await loadEnvFile(await readFile(".env.local", "utf8"));

const qaDatabaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

assertOk(Boolean(qaDatabaseUrl), "DATABASE_URL or SUPABASE_DB_URL is missing");
assertOk(
  /^postgres(ql)?:\/\//.test(qaDatabaseUrl),
  "DATABASE_URL or SUPABASE_DB_URL is not a Postgres connection string"
);
assertOk(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), "NEXT_PUBLIC_SUPABASE_URL is missing");
assertOk(Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");

const pool = new Pool(createPoolConfig(qaDatabaseUrl));

const summary = {
  env: {
    databaseUrlSet: true,
    supabaseUrlSet: true,
    anonKeySet: true
  },
  routes: [],
  before: {},
  checkout: {},
  after: {},
  logout: {}
};

try {
  const beforeCounts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM public.orders) AS orders,
      (SELECT COUNT(*)::int FROM public.customers) AS customers,
      (SELECT COUNT(*)::int FROM public.inventory_logs) AS inventory_logs
  `);
  const beforeStock = await pool.query(
    "SELECT stock_quantity FROM public.products WHERE id = $1",
    ["prd_sorrel"]
  );
  assertOk(beforeStock.rows.length === 1, "Seed product prd_sorrel was not found");
  summary.before = {
    ...beforeCounts.rows[0],
    prd_sorrel_stock: Number(beforeStock.rows[0].stock_quantity)
  };

  const loginPage = await request("/login");
  assertOk(loginPage.status === 200, "/login did not return 200");
  summary.routes.push({ path: "/login", status: loginPage.status });

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.com", password: "demo123" })
  });
  assertOk(login.status === 200, "Login failed");
  const cookie = cookieHeader(login.headers);
  assertOk(cookie.includes("cpc_session="), "Login did not set a session cookie");
  summary.routes.push({ path: "/api/auth/login", status: login.status });

  const pagePaths = [
    "/dashboard",
    "/settings",
    "/products",
    "/customers",
    "/pos",
    "/orders"
  ];
  for (const path of pagePaths) {
    const page = await request(path, { headers: { Cookie: cookie } });
    assertOk(page.status === 200, `${path} did not return 200`);
    summary.routes.push({
      path,
      status: page.status,
      finalPath: new URL(page.url).pathname
    });
  }

  const settingsApi = await request("/api/settings", { headers: { Cookie: cookie } });
  assertOk(settingsApi.status === 200, "/api/settings did not return 200");
  const settingsPayload = JSON.parse(settingsApi.text);
  assertOk(
    settingsPayload.data.settings.business_name === "Savannah & Sea Retail Ltd.",
    "Settings did not return seeded Supabase business name"
  );
  summary.routes.push({ path: "/api/settings", status: settingsApi.status });

  const posApi = await request("/api/pos", { headers: { Cookie: cookie } });
  assertOk(posApi.status === 200, "/api/pos did not return 200");
  const posPayload = JSON.parse(posApi.text);
  assertOk(posPayload.data.products.length >= 8, "POS did not read seeded products");
  assertOk(posPayload.data.customers.length >= 3, "POS did not read seeded customers");
  summary.routes.push({
    path: "/api/pos",
    status: posApi.status,
    products: posPayload.data.products.length,
    customers: posPayload.data.customers.length
  });

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const qaPhone = `868-${stamp.slice(-7, -4)}-${stamp.slice(-4)}`;
  const checkout = await request("/api/pos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      items: [{ product_id: "prd_sorrel", quantity: 1, discount: 0 }],
      customer: {
        name: `QA Supabase Customer ${stamp}`,
        phone: qaPhone,
        email: `qa-${stamp}@example.com`,
        street_address: "25 Main Road",
        city: "Chaguanas",
        region: "Chaguanas",
        country: "Trinidad and Tobago",
        delivery_notes: "QA delivery test",
        marketing_consent: true
      },
      order_type: "delivery",
      status: "completed",
      payment_method: "Pay on delivery",
      payment_status: "unpaid",
      discount_amount: 0,
      notes: `QA checkout ${stamp}`,
      delivery: {
        street_address: "25 Main Road",
        city: "Chaguanas",
        region: "Chaguanas",
        country: "Trinidad and Tobago",
        notes: "QA delivery test"
      }
    })
  });
  assertOk(
    checkout.status === 201,
    `POS checkout failed with status ${checkout.status}: ${checkout.text}`
  );
  const checkoutPayload = JSON.parse(checkout.text);
  const order = checkoutPayload.data.order;
  assertOk(order?.id, "Checkout did not return an order id");
  summary.checkout = {
    status: checkout.status,
    order_id: order.id,
    order_number: order.order_number,
    total: order.total,
    waze_link: Boolean(order.waze_link),
    whatsapp_business_link: Boolean(order.whatsapp_business_link),
    whatsapp_customer_link: Boolean(order.whatsapp_customer_link)
  };

  const receipt = await request(`/api/orders/${order.id}/receipt`, {
    headers: { Cookie: cookie }
  });
  assertOk(receipt.status === 200, "Receipt endpoint did not return 200");
  assertOk(receipt.text.length > 1000, "Receipt PDF response looked too small");
  summary.routes.push({
    path: `/api/orders/${order.id}/receipt`,
    status: receipt.status,
    bytes: receipt.text.length
  });

  const orderRows = await pool.query(
    "SELECT id, order_number, total, customer_snapshot, waze_link FROM public.orders WHERE id = $1",
    [order.id]
  );
  assertOk(orderRows.rows.length === 1, "New checkout order was not saved in Supabase");

  const orderItems = await pool.query(
    "SELECT product_id, quantity, line_total FROM public.order_items WHERE order_id = $1",
    [order.id]
  );
  assertOk(orderItems.rows.length === 1, "New checkout order item was not saved in Supabase");

  const inventoryRows = await pool.query(
    "SELECT quantity_delta FROM public.inventory_logs WHERE reference_id = $1 AND product_id = $2",
    [order.id, "prd_sorrel"]
  );
  assertOk(inventoryRows.rows.length >= 1, "Inventory log was not saved in Supabase");
  assertOk(Number(inventoryRows.rows[0].quantity_delta) === -1, "Inventory log delta was not -1");

  const afterStock = await pool.query(
    "SELECT stock_quantity FROM public.products WHERE id = $1",
    ["prd_sorrel"]
  );
  const afterCounts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM public.orders) AS orders,
      (SELECT COUNT(*)::int FROM public.customers) AS customers,
      (SELECT COUNT(*)::int FROM public.inventory_logs) AS inventory_logs
  `);
  summary.after = {
    ...afterCounts.rows[0],
    prd_sorrel_stock: Number(afterStock.rows[0].stock_quantity),
    stock_delta: Number(afterStock.rows[0].stock_quantity) - summary.before.prd_sorrel_stock
  };
  assertOk(summary.after.orders === summary.before.orders + 1, "Order count did not increase by 1");
  assertOk(summary.after.customers >= summary.before.customers + 1, "Customer count did not increase");
  assertOk(summary.after.stock_delta === -1, "Product stock did not decrease by 1");

  const ordersPage = await request("/orders", { headers: { Cookie: cookie } });
  assertOk(ordersPage.status === 200, "/orders failed after checkout");
  assertOk(
    ordersPage.text.includes(order.order_number),
    "Orders page did not include the new order number"
  );
  summary.routes.push({ path: "/orders-after-checkout", status: ordersPage.status });

  const patchSettings = await request("/api/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(settingsPayload.data.settings)
  });
  assertOk(patchSettings.status === 200, "Settings save/PATCH failed");
  summary.routes.push({ path: "/api/settings PATCH", status: patchSettings.status });

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: cookie }
  });
  assertOk(logout.status === 200, "Logout failed");
  const logoutSetCookie = logout.headers.get("set-cookie") || "";
  assertOk(
    logoutSetCookie.includes("cpc_session="),
    "Logout did not return a session-clearing Set-Cookie header"
  );
  const postLogout = await fetch(`${baseUrl}/pos`, {
    redirect: "manual"
  });
  summary.logout = {
    status: logout.status,
    set_cookie_seen: true,
    protected_route_after_logout_status: postLogout.status,
    protected_route_after_logout_location: postLogout.headers.get("location")
  };
  assertOk(
    postLogout.status === 307 || postLogout.status === 302,
    "Protected route did not redirect after logout"
  );

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await pool.end();
}
