import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const origin = process.env.QA_ORIGIN,
  results = [],
  errors = [];
await mkdir("/tmp/immersive-review", { recursive: true });
async function open(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/store/qa-immersive`);
  return { page, context };
}
async function enter(page) {
  const start = Date.now();
  await page.getByRole("button", { name: "Enter immersive store" }).click();
  const engine = page.getByRole("region", {
    name: "Baker Buds immersive store",
  });
  await expect(engine).toHaveAttribute("data-ready", "true", {
    timeout: 45000,
  });
  await expect(engine).toHaveCSS("position", "fixed");
  return { engine, loadMs: Date.now() - start };
}
async function addBrownie(page) {
  await page.getByRole("button", { name: "Browse products" }).click();
  await page
    .getByRole("dialog", { name: "Products" })
    .getByRole("button", { name: /Strawberry/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("TT$50.00");
  await page.getByRole("button", { name: /Add to bag/ }).click();
}
try {
  console.log("Desktop rendering and shopping");
  const { page, context } = await open({
    viewport: { width: 1024, height: 700 },
  });
  const { engine, loadMs } = await enter(page);
  await expect
    .poll(async () => Number(await engine.getAttribute("data-fps")), {
      timeout: 20000,
    })
    .toBeGreaterThan(0);
  await engine.focus();
  const z0 = Number(await engine.getAttribute("data-player-z"));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(4500);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(1500);
  assert.ok(
    Number(await engine.getAttribute("data-player-z")) < z0 - 0.1,
    "keyboard moves player",
  );
  await addBrownie(page);
  await expect(page.getByRole("button", { name: /Bag 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Browse products" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Sold out cookie/ })
    .click();
  await expect(
    page.getByRole("button", { name: "No more available" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close Product details" }).click();
  await page.getByRole("button", { name: "Store settings" }).click();
  await page.getByLabel("Graphics", { exact: true }).selectOption("low");
  await page.getByRole("button", { name: "Return to entrance" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/immersive-review/desktop.png" });
  results.push({
    view: "desktop",
    loadMs,
    ...(await engine.evaluate((e) => ({ ...e.dataset }))),
  });
  // Context loss must leave the bag intact and offer conventional checkout.
  await engine
    .locator("canvas")
    .evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator("[data-ready] [role=alert]")).toContainText(
    "Your bag is still available",
  );
  await page
    .getByRole("button", { name: "Open Quick Shop", exact: true })
    .click();
  await expect(engine).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Cart 1/ })).toBeVisible();
  await context.close();
  console.log("Mobile touch and checkout");
  const mobile = await open({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const m = await enter(mobile.page);
  const mp = mobile.page;
  const joy = mp.getByLabel("Movement joystick");
  await expect(joy).toBeVisible();
  await expect
    .poll(async () => Number(await m.engine.getAttribute("data-fps")), {
      timeout: 20000,
    })
    .toBeGreaterThan(0);
  const box = await joy.boundingBox();
  const before = Number(await m.engine.getAttribute("data-player-z"));
  const cdp = await mobile.context.newCDPSession(mp);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 58, y: box.y + 58, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + 58, y: box.y + 15, id: 1 }],
  });
  await mp.waitForTimeout(3500);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await mp.waitForTimeout(1500);
  assert.ok(
    Number(await m.engine.getAttribute("data-player-z")) < before - 0.1,
    "touch joystick moves player",
  );
  await addBrownie(mp);
  await mp.getByRole("button", { name: /Bag 1/ }).click();
  await expect(m.engine).toHaveCount(0);
  await expect(
    mp.getByRole("button", { name: "Pickup", exact: true }),
  ).toBeVisible();
  await mp.getByRole("button", { name: "Pickup", exact: true }).click();
  await expect(mp.getByLabel("Payment method")).toHaveValue("Cash");
  await expect(
    mp
      .getByLabel("Payment method")
      .locator("option", { hasText: "Pay on delivery" }),
  ).toHaveCount(0);
  await mp.screenshot({ path: "/tmp/immersive-review/mobile-checkout.png" });
  // Reopen: cart must survive every view switch.
  await mp
    .getByRole("button", { name: /Close checkout/i })
    .last()
    .click();
  await enter(mp);
  await expect(mp.getByRole("button", { name: /Bag 1/ })).toBeVisible();
  await mp.screenshot({ path: "/tmp/immersive-review/mobile.png" });
  results.push({
    view: "mobile",
    loadMs: m.loadMs,
    ...(await mp.locator("[data-ready]").evaluate((e) => ({ ...e.dataset }))),
  });
  await mp.setViewportSize({ width: 844, height: 390 });
  await expect(mp.getByLabel("Movement joystick")).toBeVisible();
  await mp.setViewportSize({ width: 768, height: 1024 });
  await expect(mp.getByLabel("Movement joystick")).toBeVisible();
  await mp.setViewportSize({ width: 320, height: 568 });
  assert.ok(
    await mp
      .locator("[data-ready]")
      .evaluate((e) => e.scrollWidth <= innerWidth),
    "320px layout does not overflow",
  );
  await mp.getByRole("button", { name: /Bag 1/ }).click();
  let submitted;
  await mp.route("**/api/orders", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          order: {
            id: "qa-only",
            order_number: "QA-1",
            total: 50,
            order_type: "pickup",
            payment_status: "unpaid",
          },
        },
      }),
    });
  });
  await mp.getByLabel("Full name", { exact: true }).fill("QA shopper");
  await mp.getByLabel("Phone", { exact: true }).fill("14430000000");
  await mp.getByRole("button", { name: "Proceed to payment" }).click();
  await expect(
    mp.getByRole("heading", { name: "Order received" }),
  ).toBeVisible();
  assert.deepEqual(submitted.items, [{ product_id: "p1", quantity: 1 }]);
  assert.equal(submitted.expected_total, 50);
  assert.equal(submitted.order_type, "pickup");
  assert.equal(submitted.payment_status, "unpaid");
  assert.equal(submitted.items[0].price, undefined);
  await mobile.context.close();
  console.log("WebGL and reduced-motion fallbacks");
  const fallback = await open({ viewport: { width: 390, height: 844 } });
  await fallback.page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl2" || type === "webgl") return null;
      return get.call(this, type, ...args);
    };
  });
  await fallback.page.reload();
  await fallback.page
    .getByRole("button", { name: "Enter immersive store" })
    .click();
  await expect(
    fallback.page.locator("[data-ready] [role=alert]"),
  ).toContainText("3D view couldn’t open");
  await fallback.page
    .getByRole("button", { name: "Open Quick Shop", exact: true })
    .click();
  await fallback.context.close();
  const asset = await open({ viewport: { width: 390, height: 844 } });
  const assetErrors = [];
  asset.page.removeAllListeners("pageerror");
  asset.page.on("pageerror", (e) => assetErrors.push(e.message));
  let first = true;
  await asset.page.route("**/storefront/immersive/shopper.glb", (route) => {
    if (first) {
      first = false;
      return route.fulfill({ status: 503, body: "Temporary asset failure" });
    }
    return route.continue();
  });
  await asset.page
    .getByRole("button", { name: "Enter immersive store" })
    .click();
  await expect(asset.page.locator("[data-ready] [role=alert]")).toBeVisible({
    timeout: 45000,
  });
  await asset.page
    .getByRole("button", { name: "Retry with lighter graphics" })
    .click();
  await expect(asset.page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 45000 },
  );
  assert.ok(
    assetErrors.every(
      (message) => message.includes("shopper.glb") && message.includes("503"),
    ),
    "only the deliberately failed asset may report an error",
  );
  await asset.context.close();
  const reduced = await open({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  await reduced.page
    .getByRole("button", { name: "Enter immersive store" })
    .click();
  await expect(reduced.page.locator("[data-ready]")).toHaveCount(0);
  await reduced.context.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "/tmp/immersive-review/metrics.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    "PASS real WebGL render, desktop movement, touch joystick, sold-out guard, shared bag, pickup checkout, responsive layout, context loss, WebGL fallback and reduced motion",
    results,
  );
} finally {
  await browser.close();
}
