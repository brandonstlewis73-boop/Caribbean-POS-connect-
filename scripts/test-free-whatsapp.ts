import assert from "node:assert/strict";
import { freeWhatsAppLink, freeOrderUpdate } from "../lib/free-whatsapp";
import type { Order } from "../lib/types";

assert.equal(freeWhatsAppLink("", "hello"), null);
assert.equal(freeWhatsAppLink("123", "hello"), null);
assert.equal(freeWhatsAppLink("+14437582368", "  "), null);
for (const [phone, expected] of [["4437582368", "14437582368"], ["+18681234567", "18681234567"], ["1234567", "18681234567"]]) {
  const url = new URL(freeWhatsAppLink(phone, "Order #1063 & pickup: ready")!);
  assert.equal(url.pathname, `/${expected}`);
  assert.equal(url.searchParams.get("text"), "Order #1063 & pickup: ready");
}
const order = { order_number: "1063", status: "out_for_delivery", total: 685, payment_status: "unpaid", customer_snapshot: { name: "Customer" }, items: [{ quantity: 11, product_name: "Brownie" }], notes: "PRIVATE INTERNAL NOTE", assigned_driver_name: "Malik", assigned_driver_phone: "+18681234567" } as Order;
const text = freeOrderUpdate(order, "TTD");
assert.match(text, /#1063 is out for delivery/);
assert.match(text, /11 × Brownie/);
assert.match(text, /TT\$685\.00/);
assert.match(text, /Payment: unpaid/);
assert.match(text, /Driver: Malik/);
assert(!text.includes(order.notes!));
const noDriver = freeOrderUpdate({ ...order, assigned_driver_name: null, assigned_driver_phone: null }, "TTD");
assert(!noDriver.includes("Your driver"));
assert(!noDriver.includes("Not provided"));
console.log("Free WhatsApp phone, encoding, status, payment and privacy checks passed.");
