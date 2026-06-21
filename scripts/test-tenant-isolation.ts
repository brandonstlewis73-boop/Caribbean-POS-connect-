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
const dashboard = read("components/dashboard/DashboardHome.tsx");
const appShell = read("components/layout/AppShell.tsx");
const schema = read("db/schema.sql");
const db = read("lib/db.ts");
const receipt = read("lib/receipt.ts");
const storePage = read("app/store/[slug]/page.tsx");
const storeApi = read("app/api/store/[slug]/route.ts");
const onlineStore = read("components/orders/OnlineOrderClient.tsx");

assert(!/biz_savannah_sea/.test(data), "lib/data.ts must not reference the seed business id.");
assert(!/biz_savannah_sea/.test(db), "lib/db.ts must not seed or reference the Savannah tenant.");
assert(!/biz_savannah_sea/.test(schema), "db/schema.sql must not assign unscoped rows to the Savannah tenant.");
assert(!/settings WHERE key = 'active_business_id'/.test(data), "data layer must not use global active_business_id as tenant fallback.");
assert(!/business_id\s+IS\s+NULL/i.test(data), "lib/data.ts must not include nullable business tenant fallback filters.");
assert(!/business_id\s+IS\s+NULL/i.test(support), "lib/support.ts must not include nullable business tenant fallback filters.");
assert(/Business context is required/.test(data), "data layer should reject missing business context for writes/orders.");
assert(/return \[\]/.test(data), "list helpers should return empty arrays when business context is missing.");

assert(/business_name:\s*defaultSettings\.business_name/.test(data), "business settings must reset branded business name before applying tenant settings.");
assert(/business_country:\s*""/.test(data), "business settings must not default every tenant to Trinidad and Tobago.");
assert(/currency:\s*""/.test(data), "business settings must not default every tenant to TTD before setup.");
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
assert(!/businesses\[0\]/.test(settings), "Settings must not fall back to the first business record.");
assert(/Complete business profile first/.test(settings), "Settings should show setup guidance when storefront slug is missing.");
assert(/Storefront not set up yet/.test(dashboard), "Dashboard should show storefront setup state for missing business profile/slug.");
assert(!/data\.storefrontUrl \|\| "\/online"/.test(dashboard), "Dashboard must not fall back to /online as a storefront.");
assert(/hasStorefront/.test(dashboard), "Dashboard should gate Open Store behind a valid current-business storefront.");
assert(/Set country\/currency/.test(appShell), "Header should prompt for missing country/currency setup.");
assert(/getBusinessBySlug\(slug\)/.test(storePage) && /business\.id/.test(storePage), "Store page should load 3D products/settings by the matched business slug only.");
assert(/getBusinessBySlug\(slug\)/.test(storeApi) && /business\.id/.test(storeApi), "Store API should load 3D products/settings by the matched business slug only.");
assert(/storefront_3d_enabled:\s*Boolean\(settings\.storefront_3d_enabled && threeDGate\.allowed\)/.test(storePage), "Store page should strip 3D mode unless the current business plan allows it.");
assert(/storefront_3d_enabled:\s*Boolean\(settings\.storefront_3d_enabled && threeDGate\.allowed\)/.test(storeApi), "Store API should strip 3D mode unless the current business plan allows it.");
assert(/products=\{products\}/.test(onlineStore) && /onAddToCart=\{add\}/.test(onlineStore), "3D storefront should receive the current storefront products and existing cart callback only.");
assert(/image\/webp/.test(settings) && /image\/svg\+xml/.test(settings), "Logo upload should allow WebP and safe SVG files.");

const runtimeText = [data, settings, dashboard, appShell, onlineApi].join("\n");
assert(!/Baker buds|Baker Buds|baker-buds|Savannah Sea Retail|savannah-sea-retail/.test(runtimeText), "Runtime app code must not contain Baker Buds or Savannah storefront identity.");

console.log("Tenant isolation and Android upload picker checks passed.");
