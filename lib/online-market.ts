import { getDefaultDeliveryRatesForCurrency, getDeliveryRegionsForCurrency, getMarketForCountry } from "./constants";
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

  const currency = market.currency;
  const regions = getDeliveryRegionsForCurrency(currency);
  const defaultRates = getDefaultDeliveryRatesForCurrency(currency);
  const existingRates = settings.currency === currency ? settings.delivery_rates || {} : {};

  return {
    settings: {
      ...settings,
      currency,
      delivery_fee:
        settings.currency === currency
          ? settings.delivery_fee
          : Number(defaultRates[regions[0] || ""] ?? settings.delivery_fee ?? 0),
      delivery_rates: {
        ...defaultRates,
        ...existingRates
      }
    },
    market: {
      countryCode: market.countryCode,
      country: market.country,
      currency,
      localized: true
    } satisfies OnlineMarket
  };
}
