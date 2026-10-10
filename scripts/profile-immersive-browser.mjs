import { chromium, webkit, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const safari = process.env.QA_BROWSER === "webkit";
const browser = await (safari ? webkit : chromium).launch({
  headless: true,
  args: safari
    ? []
    : [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
});
const folder = process.env.QA_PROFILE_DIR || "/tmp/immersive-profile";
await mkdir(folder, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await page.goto(`${process.env.QA_ORIGIN}/store/qa-immersive`);
  const start = Date.now();
  await page.getByRole("button", { name: "Enter immersive store" }).click();
  const engine = page.locator("[data-ready]");
  await expect(engine).toHaveAttribute("data-ready", "true", {
    timeout: 60000,
  });
  const bootMs = Date.now() - start;
  await page.waitForTimeout(3000);
  async function sample(label) {
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let previous = 0,
            start = 0;
          function frame(time) {
            if (!start) start = time;
            if (previous) samples.push(time - previous);
            previous = time;
            if (time - start >= 6000) resolve(samples);
            else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }),
    );
    const sorted = [...frames].sort((a, b) => a - b),
      mean = frames.reduce((a, b) => a + b, 0) / frames.length;
    return {
      label,
      samples: frames.length,
      meanMs: mean,
      p50Ms: sorted[Math.floor(sorted.length * 0.5)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      fps: 1000 / mean,
      renderer: await engine.evaluate((e) => ({ ...e.dataset })),
    };
  }
  const idle = await sample("idle, active canvas");
  await engine.focus();
  await page.keyboard.down("KeyW");
  await page.keyboard.down("ShiftLeft");
  const moving = await sample("run into aisle boundary");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  await page.screenshot({ path: `${folder}/phone.png` });
  const assets = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("/storefront/immersive/"))
      .map((r) => ({
        url: r.name.split("/").pop(),
        durationMs: r.duration,
        decodedBytes: r.decodedBodySize,
        transferBytes: r.transferSize,
      })),
  );
  const report = {
    browser: safari ? "WebKit Linux" : "Chromium SwiftShader",
    viewport: "390x844 DPR1",
    bootMs,
    idle,
    moving,
    assets,
    note: "Development server, software rendering. No physical iPhone FPS or total GPU-memory claim.",
  };
  await writeFile(`${folder}/profile.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
