const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";

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
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  return {
    path,
    status: response.status,
    headers: response.headers,
    text,
    payload
  };
}

function authJson(cookie, body) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(body)
  };
}

const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.QA_LOGIN_EMAIL || "admin@caribbeanpos.test",
    password: process.env.QA_LOGIN_PASSWORD || "Admin123!"
  })
});
assertOk(login.status === 200, `Login failed with status ${login.status}: ${login.text}`);

const cookie = cookieHeader(login.headers);
assertOk(cookie.includes("cpc_session="), "Login did not return a session cookie.");

const stamp = Date.now();
const customerName = `QA Save Flow Customer ${stamp}`;
const productName = `QA Save Flow Product ${stamp}`;

const customerCreate = await request(
  "/api/customers",
  authJson(cookie, {
    name: customerName,
    phone: `868555${String(stamp).slice(-4)}`,
    email: `qa.customer.${stamp}@example.com`,
    street_address: "15 Save Flow Street",
    city: "Chaguanas",
    country: "Trinidad and Tobago",
    delivery_notes: "QA save flow delivery note",
    waze_link: "https://waze.com/ul?q=15%20Save%20Flow%20Street",
    gps_latitude: 10.5168,
    gps_longitude: -61.4114
  })
);
assertOk(customerCreate.status === 201, `Customer create failed: ${customerCreate.text}`);
const customer = customerCreate.payload?.data?.customer;
assertOk(customer?.id, "Customer create did not return an id.");

const customerList = await request(`/api/customers?q=${encodeURIComponent(customerName)}`, {
  headers: { Cookie: cookie }
});
assertOk(customerList.status === 200, `Customer list failed: ${customerList.text}`);
assertOk(
  customerList.payload?.data?.customers?.some((item) => item.id === customer.id),
  "Saved customer did not appear in the customer list."
);

const customerDetail = await request(`/api/customers/${customer.id}`, {
  headers: { Cookie: cookie }
});
assertOk(customerDetail.status === 200, `Customer detail failed: ${customerDetail.text}`);
assertOk(
  customerDetail.payload?.data?.customer?.id === customer.id,
  "Saved customer detail page payload did not return the saved customer."
);

const productCreate = await request(
  "/api/inventory",
  authJson(cookie, {
    name: productName,
    sku: "",
    barcode: `QA${stamp}`,
    category: "Meals",
    cost_price: 8,
    selling_price: 18,
    stock_quantity: 5,
    low_stock_alert: 1,
    image_url: "",
    supplier_name: "QA Supplier",
    supplier_phone: "8685550000"
  })
);
assertOk(productCreate.status === 201, `Product create failed: ${productCreate.text}`);
const product = productCreate.payload?.data?.product;
assertOk(product?.id, "Product create did not return an id.");
assertOk(product.sku?.trim(), "Product save did not auto-generate a SKU.");

const productList = await request(`/api/inventory?q=${encodeURIComponent(productName)}`, {
  headers: { Cookie: cookie }
});
assertOk(productList.status === 200, `Product list failed: ${productList.text}`);
assertOk(
  productList.payload?.data?.products?.some((item) => item.id === product.id),
  "Saved product did not appear in the inventory list."
);

const productAlias = await request(`/api/products?q=${encodeURIComponent(productName)}`, {
  headers: { Cookie: cookie }
});
assertOk(productAlias.status === 200, `/api/products alias failed: ${productAlias.text}`);

const posData = await request("/api/pos", {
  headers: { Cookie: cookie }
});
assertOk(posData.status === 200, `POS data failed: ${posData.text}`);
assertOk(
  posData.payload?.data?.products?.some((item) => item.id === product.id),
  "Saved product did not appear in POS data."
);
assertOk(
  posData.payload?.data?.customers?.some((item) => item.id === customer.id),
  "Saved customer did not appear in POS data."
);

const orderCreate = await request(
  "/api/pos",
  authJson(cookie, {
    items: [{ product_id: product.id, quantity: 1, discount: 0 }],
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      street_address: customer.street_address,
      city: customer.city,
      region: "Chaguanas",
      country: customer.country,
      delivery_notes: customer.delivery_notes,
      marketing_consent: false
    },
    order_type: "delivery",
    payment_method: "Pay on delivery",
    payment_status: "unpaid",
    discount_amount: 0,
    delivery: {
      street_address: customer.street_address,
      city: customer.city,
      region: "Chaguanas",
      country: customer.country,
      notes: customer.delivery_notes
    }
  })
);
assertOk(orderCreate.status === 201, `Order create failed: ${orderCreate.text}`);
const order = orderCreate.payload?.data?.order;
assertOk(order?.id, "Order create did not return an id.");
assertOk(order.status === "new", "Delivery order should start in the new workflow status.");

const productBeforeCompletion = await request(`/api/products/${product.id}`, {
  headers: { Cookie: cookie }
});
assertOk(productBeforeCompletion.status === 200, `Product detail before completion failed: ${productBeforeCompletion.text}`);
assertOk(
  Number(productBeforeCompletion.payload?.data?.product?.stock_quantity) === 5,
  "New delivery order should not decrement product stock before completion."
);

const orderComplete = await request(`/api/orders/${order.id}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie
  },
  body: JSON.stringify({ status: "completed" })
});
assertOk(orderComplete.status === 200, `Order completion failed: ${orderComplete.text}`);
assertOk(orderComplete.payload?.data?.order?.status === "completed", "Order did not move to completed status.");

const productAfterOrder = await request(`/api/products/${product.id}`, {
  headers: { Cookie: cookie }
});
assertOk(productAfterOrder.status === 200, `Product detail after order failed: ${productAfterOrder.text}`);
assertOk(
  Number(productAfterOrder.payload?.data?.product?.stock_quantity) === 4,
  "Completed order did not decrement product stock."
);

const receiptPdf = await request(`/api/orders/${order.id}/receipt`, {
  headers: { Cookie: cookie }
});
assertOk(receiptPdf.status === 200, `Receipt PDF failed: ${receiptPdf.text}`);

const receipts = await request(`/api/receipts?q=${encodeURIComponent(order.order_number)}`, {
  headers: { Cookie: cookie }
});
assertOk(receipts.status === 200, `Receipts list failed: ${receipts.text}`);
assertOk(
  receipts.payload?.data?.receipts?.some((item) => item.order_id === order.id),
  "Completed order did not generate a receipt record."
);

const customerAfterOrder = await request(`/api/customers/${customer.id}`, {
  headers: { Cookie: cookie }
});
assertOk(customerAfterOrder.status === 200, `Customer detail after order failed: ${customerAfterOrder.text}`);
assertOk(
  customerAfterOrder.payload?.data?.orders?.some((item) => item.id === order.id),
  "Saved order did not appear on the customer detail payload."
);

const staffCreate = await request(
  "/api/staff",
  authJson(cookie, {
    name: `QA Delete Staff ${stamp}`,
    phone: "8685552222",
    email: `qa.staff.${stamp}@example.com`,
    role: "cashier",
    active: true,
    avatar_key: "gold-cashier",
    avatar_url: ""
  })
);
assertOk(staffCreate.status === 201, `Staff create failed: ${staffCreate.text}`);
const staff = staffCreate.payload?.data?.staff;
assertOk(staff?.id, "Staff create did not return an id.");

const staffDelete = await request(`/api/staff/${staff.id}`, {
  method: "DELETE",
  headers: { Cookie: cookie }
});
assertOk(staffDelete.status === 200, `Staff delete failed: ${staffDelete.text}`);

const orderDelete = await request(`/api/orders/${order.id}`, {
  method: "DELETE",
  headers: { Cookie: cookie }
});
assertOk(orderDelete.status === 200, `Order delete failed: ${orderDelete.text}`);

const productDelete = await request(`/api/products/${product.id}`, {
  method: "DELETE",
  headers: { Cookie: cookie }
});
assertOk(productDelete.status === 200, `Product delete failed: ${productDelete.text}`);

const customerDelete = await request(`/api/customers/${customer.id}`, {
  method: "DELETE",
  headers: { Cookie: cookie }
});
assertOk(customerDelete.status === 200, `Customer delete failed: ${customerDelete.text}`);

console.log(
  JSON.stringify(
    {
      baseUrl,
      customer: { id: customer.id, name: customer.name },
      product: { id: product.id, name: product.name, sku: product.sku },
      order: { id: order.id, order_number: order.order_number, total: order.total },
      checks: [
        "customer-create",
        "customer-list",
        "customer-detail",
        "product-create",
        "product-list",
        "api-products-alias",
        "pos-data",
        "order-create",
        "order-complete",
        "stock-decrement",
        "receipt-generation",
        "customer-order-history",
        "staff-delete",
        "order-delete",
        "product-delete",
        "customer-delete"
      ]
    },
    null,
    2
  )
);
