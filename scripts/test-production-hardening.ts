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
assert.match(inventory, /product-images\/\$\{businessId/, "Product image logical path should include business id.");
assert.match(inventory, /capture="environment"/, "Only Take Photo should request camera capture.");

const data = read("lib/data.ts");
assert.match(data, /name\.toLowerCase\(\) !== "uncategorized"/, "Product saves should not recreate deleted category names.");
assert.match(data, /UPDATE products SET category = \$1, category_id = NULL/, "Deleted category products should be marked Uncategorized.");

const runtimeText = [read("lib/ai-business.ts"), settings, inventory].join("\n");
assert.doesNotMatch(runtimeText, /Savannah Retail|Savannah & Sea|Baker Buds|Dutty|fake data|John Doe|Priya/);

const exchange = read("lib/exchange-rates.ts");
assert.match(exchange, /EXCHANGE_RATE_API_KEY/, "Exchange rates should be backend configured through env.");
assert.match(exchange, /exchange_rates/, "Exchange rates should use the cache table when available.");

console.log("Production hardening checks passed.");

