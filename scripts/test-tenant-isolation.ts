import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const data = read("lib/data.ts");
const support = read("lib/support.ts");
const onlineApi = read("app/api/online/route.ts");
const settings = read("components/settings/SettingsClient.tsx");
const db = read("lib/db.ts");
const receipt = read("lib/receipt.ts");

assert(!/biz_savannah_sea/.test(data), "lib/data.ts must not reference the seed business id.");
assert(!/insertSetting\("active_business_id",\s*"biz_savannah_sea"\)/.test(db), "lib/db.ts must not seed active_business_id to the seed business.");
assert(!/business_id\s+IS\s+NULL/i.test(data), "lib/data.ts must not include nullable business tenant fallback filters.");
assert(!/business_id\s+IS\s+NULL/i.test(support), "lib/support.ts must not include nullable business tenant fallback filters.");
assert(/Business context is required/.test(data), "data layer should reject missing business context for writes/orders.");
assert(/return \[\]/.test(data), "list helpers should return empty arrays when business context is missing.");

assert(/business_name:\s*defaultSettings\.business_name/.test(data), "business settings must reset branded business name before applying tenant settings.");
assert(/logo_url:\s*null/.test(data), "business settings must not inherit a global logo for tenant-scoped views.");
assert(/receipt_message:\s*defaultSettings\.receipt_message/.test(data), "business settings must not inherit another business receipt footer.");
assert(/payment_link_template:\s*defaultSettings\.payment_link_template/.test(data), "business settings must not inherit another business payment link template.");
assert(/whatsapp_business_number:\s*""/.test(data), "business settings must not inherit another business WhatsApp number.");
assert(/getBusinessSettings\(order\.business_id\)/.test(receipt), "receipt PDFs must load settings using the order business id.");
assert(!/getSettings\(\)/.test(receipt), "receipt PDFs must not use global settings.");

assert(!/listProducts|getSettings|listCategories/.test(onlineApi), "/api/online must not load unscoped products, categories, or settings.");
assert(/Your storefront is not set up yet/.test(onlineApi), "/api/online should return setup state instead of default business data.");

assert(/Take Photo/.test(settings), "Logo upload should expose Take Photo action.");
assert(/Choose Photos/.test(settings), "Logo upload should expose Choose Photos action.");
assert(/Browse Files/.test(settings), "Logo upload should expose Browse Files action.");
assert(/capture="environment"/.test(settings), "Only the Take Photo input should use camera capture.");
assert((settings.match(/type="file"/g) || []).length >= 3, "Logo upload should use separate file inputs for camera/photos/files.");
assert(/business-logos\/\$\{businessId/.test(settings), "Logo storage path should include the current business id.");
assert(/image\/webp/.test(settings) && /image\/svg\+xml/.test(settings), "Logo upload should allow WebP and safe SVG files.");

console.log("Tenant isolation and Android upload picker checks passed.");