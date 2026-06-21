import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARIBBEAN_CURRENCIES, money } from "../lib/constants";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const requiredSymbols: Record<string, string> = {
  USD: "US$",
  TTD: "TT$",
  JMD: "J$",
  BBD: "Bds$",
  GYD: "G$",
  CAD: "CA$",
  GBP: "\u00A3",
  EUR: "\u20AC"
};

for (const [code, symbol] of Object.entries(requiredSymbols)) {
  const meta = CARIBBEAN_CURRENCIES.find((currency) => currency.code === code);
  assert.ok(meta, `${code} should be supported.`);
  assert.equal(meta?.symbol, symbol, `${code} should use the requested symbol.`);
}

assert.equal(money(12.5, "USD"), "US$12.50");
assert.equal(money(12.5, "TTD"), "TT$12.50");
assert.equal(money(12.5, "JMD"), "J$12.50");
assert.equal(money(12.5, "BBD"), "Bds$12.50");
assert.equal(money(12.5, "GYD"), "G$12.50");
assert.equal(money(12.5, "CAD"), "CA$12.50");

const settings = read("components/settings/SettingsClient.tsx");
assert.match(settings, /Store currency/, "Settings should expose store currency selector.");
assert.match(settings, /Use live currency conversion/, "Settings should expose live currency conversion toggle.");
assert.doesNotMatch(settings, /Delete sample data/, "Settings should not show sample-data wording.");

const inventory = read("components/inventory/InventoryClient.tsx");
assert.match(inventory, /Take Photo/, "Product image upload should expose camera option.");
assert.match(inventory, /Choose Photos/, "Product image upload should expose photos option.");
assert.match(inventory, /Browse Files/, "Product image upload should expose file picker option.");
assert.match(inventory, /compressProductImage/, "Product image uploads should compress large images before upload.");
assert.match(inventory, /XMLHttpRequest/, "Product image upload should expose progress events.");
assert.match(inventory, /capture="environment"/, "Only Take Photo should request camera capture.");

const storage = read("lib/supabase-storage.ts");
assert.match(storage, /product-images/, "Product image uploads should use the product-images bucket.");
assert.match(storage, /SUPABASE_SERVICE_ROLE_KEY/, "Product image uploads should use a server-only Supabase key.");
assert.ok(storage.includes("businessId") && storage.includes("productId"), "Product image object paths should include business and product ids.");
const imageRoute = read("app/api/inventory/images/route.ts");
assert.match(imageRoute, /requireUser\(request, "inventory:write"\)/, "Product image upload route should require inventory write access.");
assert.match(imageRoute, /updateProduct\(productId, \{ image_url/, "Product image upload route should save image_url to the product.");
const storageSql = read("db/product_images_storage.sql");
assert.match(storageSql, /storage\.buckets/, "Product image storage setup should create the bucket.");
assert.match(storageSql, /Public read product images/, "Product image storage setup should include a public read policy.");

const onlineStore = read("components/orders/OnlineOrderClient.tsx");
const virtualStore = read("components/storefront/VirtualStorefrontClient.tsx");
const storePage = read("app/store/[slug]/page.tsx");
const storeApi = read("app/api/store/[slug]/route.ts");
const data = read("lib/data.ts");
assert.match(data, /name\.toLowerCase\(\) !== "uncategorized"/, "Product saves should not recreate deleted category names.");
assert.match(data, /UPDATE products SET category = \$1, category_id = NULL/, "Deleted category products should be marked Uncategorized.");

const runtimeText = [read("lib/ai-business.ts"), settings, inventory].join("\n");
assert.doesNotMatch(runtimeText, /Savannah Retail|Savannah & Sea|Baker Buds|Dutty|fake data|John Doe|Priya/);

assert.match(settings, /3D Storefront/, "Settings should expose 3D storefront controls.");
assert.match(onlineStore, /dynamic\(\(\) => import\("@\/components\/storefront\/VirtualStorefrontClient"\)/, "3D storefront should be lazy loaded only on demand.");
assert.match(onlineStore, /Enter 3D Store/, "Public storefront should offer an Enter 3D Store action when enabled.");
assert.match(onlineStore, /Shop Normally/, "Public storefront should keep the normal shopping fallback.");
assert.match(virtualStore, /supportsWebGL/, "3D storefront should detect WebGL support.");
assert.match(virtualStore, /onAddToCart\(selectedProduct\)/, "3D storefront product modal should use the existing cart callback.");
assert.match(virtualStore, /Canvas/, "3D storefront should use React Three Fiber Canvas.");
assert.match(storePage, /canUseFeature\(planId, "threeDStorefront"\)/, "Store page should enforce Premium 3D access server-side.");
assert.match(storeApi, /canUseFeature\(planId, "threeDStorefront"\)/, "Store API should enforce Premium 3D access on refresh.");
const exchange = read("lib/exchange-rates.ts");
assert.match(exchange, /EXCHANGE_RATE_API_KEY/, "Exchange rates should be backend configured through env.");
assert.match(exchange, /exchange_rates/, "Exchange rates should use the cache table when available.");

console.log("Production hardening checks passed.");
