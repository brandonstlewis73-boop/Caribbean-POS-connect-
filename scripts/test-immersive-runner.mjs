import { spawn } from "node:child_process";
import { mkdir, copyFile, rm, access } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
if (process.env.NODE_ENV === "production" || process.env.VERCEL)
  throw Error("Run the layout checks in a local development workspace.");
const origin = "http://127.0.0.1:3050";
const fixtures = [
  ["scripts/fixtures/immersive-page.tsx", "app/store/qa-immersive"],
];
const created = [];
let server;
let log = "";
function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: { ...process.env, QA_ORIGIN: origin },
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${script} failed (${code}).`)),
    );
  });
}
try {
  for (const [source, target] of fixtures) {
    let exists = true;
    try {
      await access(target);
    } catch {
      exists = false;
    }
    if (exists)
      throw Error(
        `Remove the existing ${target} fixture before running this test.`,
      );
    await mkdir(target, { recursive: true });
    created.push(target);
    await copyFile(source, `${target}/page.tsx`);
  }
  server = spawn(
    process.execPath,
    [
      "--max-old-space-size=1024",
      "node_modules/next/dist/bin/next",
      "dev",
      "-H",
      "127.0.0.1",
      "-p",
      "3050",
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const keep = (chunk) => {
    log = (log + chunk.toString()).slice(-6000);
  };
  server.stdout.on("data", keep);
  server.stderr.on("data", keep);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${origin}/store/qa-immersive`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Development server is starting. */
    }
    await delay(500);
  }
  if (!ready) throw Error(`Development server did not start.\n${log}`);
  await run("scripts/test-immersive-browser.mjs");
} catch (error) {
  console.error(log);
  throw error;
} finally {
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* Already stopped. */
    }
  }
  for (const target of created)
    await rm(target, { recursive: true, force: true });
}
