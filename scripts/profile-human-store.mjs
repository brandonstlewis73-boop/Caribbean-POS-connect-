import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const folder = "/tmp/human-style-review";
await mkdir(folder, { recursive: true });
const reports = [];
try {
  for (const mobile of [true, false]) {
    console.log("Profile", mobile ? "phone" : "desktop");
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.QA_ORIGIN + "/store/qa-immersive", {
      waitUntil: "load",
    });
    await page.getByRole("button", { name: "Enter immersive store" }).click();
    const engine = page.locator("[data-ready]");
    await expect(engine).toHaveAttribute("data-ready", "true", {
      timeout: 60000,
    });
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: folder + `/${mobile ? "phone" : "desktop"}.png`,
    });
    console.log("Wardrobe", mobile);
    await page.getByRole("button", { name: "Your look", exact: true }).click();
    await page
      .getByRole("button", { name: "Soft knitwear", exact: true })
      .click();
    await page.getByRole("button", { name: "Clay", exact: true }).click();
    await page.screenshot({
      path: folder + `/${mobile ? "phone" : "desktop"}-wardrobe.png`,
    });
    await page.getByRole("button", { name: "Wear this look" }).click();
    await expect(engine).toHaveAttribute("data-ready", "true", { timeout: 60000 });
    await page.waitForTimeout(2500);
    await engine.focus();
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(650);
    await page.keyboard.up("KeyS");
    await page.screenshot({
      path: folder + `/${mobile ? "phone" : "desktop"}-jacket.png`,
    });
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const values = [];
          let start = 0,
            last = 0;
          function frame(t) {
            if (!start) start = t;
            if (last) values.push(t - last);
            last = t;
            if (t - start > 6000) resolve(values);
            else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }),
    );
    const sorted = [...frames].sort((a, b) => a - b);
    reports.push({
      view: mobile ? "phone" : "desktop",
      fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      renderer: await engine.evaluate((e) => ({ ...e.dataset })),
      errors,
    });
    await writeFile(folder + "/metrics.json", JSON.stringify(reports, null, 2));
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Enter immersive store" }).click();
    await expect(engine).toHaveAttribute("data-ready", "true", {
      timeout: 60000,
    });
    console.log("Wardrobe", mobile);
    await page.getByRole("button", { name: "Your look", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Soft knitwear", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Clay", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.close();
  }
  await writeFile(folder + "/metrics.json", JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
