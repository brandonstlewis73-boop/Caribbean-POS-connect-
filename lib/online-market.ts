import { getMarketForCountry } from "./constants";
import type { Settings } from "./types";

export type OnlineMarket = {
  countryCode: string | null;
  country: string | null;
  currency: string;
  localized: boolean;
};

export function localizeOnlineSettings(settings: Settings, countryValue?: string | null) {
  const market = getMarketForCountry(countryValue);
  if (!market) {
    return {
      settings,
      market: {
        countryCode: null,
        country: null,
        currency: settings.currency,
        localized: false
      } satisfies OnlineMarket
    };
  }

  // Product prices are stored in the merchant currency. Location is not an FX quote.
  const currency = settings.currency;
  return {
    settings,
    market: {
      countryCode: market.countryCode,
      country: market.country,
      currency,
      localized: true
    } satisfies OnlineMarket
  };
}
