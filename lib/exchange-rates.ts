import { query } from "./db";

const CACHE_MS = 60 * 60 * 1000;

type ExchangeRateResult = {
  ok: boolean;
  fromCurrency: string;
  toCurrency: string;
  rate: number | null;
  provider: string;
  fetchedAt: string | null;
  message: string;
};

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase().slice(0, 3);
}

async function readCachedRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateResult | null> {
  try {
    const rows = await query<{ rate: string; provider: string; fetched_at: Date }>(
      `SELECT rate, provider, fetched_at
       FROM exchange_rates
       WHERE base_currency = $1 AND target_currency = $2
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [fromCurrency, toCurrency]
    );
    const row = rows.rows[0];
    if (!row) return null;
    return {
      ok: true,
      fromCurrency,
      toCurrency,
      rate: Number(row.rate),
      provider: row.provider || "cache",
      fetchedAt: row.fetched_at?.toISOString?.() || String(row.fetched_at),
      message: "Using cached exchange rate."
    };
  } catch {
    return null;
  }
}

async function saveCachedRate(fromCurrency: string, toCurrency: string, rate: number, provider: string) {
  try {
    await query(
      `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, provider, fetched_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [`${fromCurrency}-${toCurrency}-${Date.now()}`, fromCurrency, toCurrency, rate, provider]
    );
  } catch {
    // Missing migration should not break the app; the caller still gets the live rate.
  }
}

export async function getExchangeRate(fromCurrencyInput: string, toCurrencyInput: string): Promise<ExchangeRateResult> {
  const fromCurrency = normalizeCurrency(fromCurrencyInput);
  const toCurrency = normalizeCurrency(toCurrencyInput);
  if (!fromCurrency || !toCurrency) {
    return { ok: false, fromCurrency, toCurrency, rate: null, provider: "none", fetchedAt: null, message: "Choose both currencies." };
  }
  if (fromCurrency === toCurrency) {
    return { ok: true, fromCurrency, toCurrency, rate: 1, provider: "same-currency", fetchedAt: new Date().toISOString(), message: "Currencies match." };
  }

  const cached = await readCachedRate(fromCurrency, toCurrency);
  if (cached?.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MS) return cached;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    return cached || {
      ok: false,
      fromCurrency,
      toCurrency,
      rate: null,
      provider: "none",
      fetchedAt: null,
      message: "Live exchange rates are not configured. Add EXCHANGE_RATE_API_KEY."
    };
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`, {
      cache: "no-store"
    });
    const data = await response.json().catch(() => null) as { conversion_rate?: number; result?: string } | null;
    const rate = Number(data?.conversion_rate || 0);
    if (!response.ok || !rate) throw new Error("Provider did not return a usable rate.");
    await saveCachedRate(fromCurrency, toCurrency, rate, "exchangerate-api");
    return { ok: true, fromCurrency, toCurrency, rate, provider: "exchangerate-api", fetchedAt: new Date().toISOString(), message: "Live exchange rate loaded." };
  } catch {
    return cached || {
      ok: false,
      fromCurrency,
      toCurrency,
      rate: null,
      provider: "exchangerate-api",
      fetchedAt: null,
      message: "Live exchange rate could not be loaded and no cached rate is available."
    };
  }
}
