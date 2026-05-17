import { buildAddress } from "./waze";

export type ReverseGeocodeAddress = {
  formatted: string;
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
};

export type ReverseGeocodeResult = {
  address: ReverseGeocodeAddress;
  provider: "google" | "mapbox" | "fallback";
};

function defaultCountryName() {
  const value = (process.env.DEFAULT_COUNTRY || "TT").trim().toUpperCase();
  if (value === "TT" || value === "TTO") return "Trinidad and Tobago";
  if (value === "US" || value === "USA") return "United States";
  return value || "Trinidad and Tobago";
}

function fallbackAddress(lat: number, lng: number): ReverseGeocodeResult {
  const formatted = `Location selected near ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return {
    provider: "fallback",
    address: {
      formatted,
      street: formatted,
      city: "",
      region: "",
      country: defaultCountryName(),
      postalCode: "",
      lat,
      lng
    }
  };
}

function componentValue(components: Array<{ long_name?: string; short_name?: string; types?: string[] }>, type: string) {
  return components.find((component) => component.types?.includes(type))?.long_name || "";
}

async function reverseGeocodeGoogle(lat: number, lng: number, key: string): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
    }>;
  } | null;
  if (!payload || payload.status !== "OK" || !payload.results?.length) return null;

  const result = payload.results[0];
  const components = result.address_components || [];
  const street = buildAddress([
    componentValue(components, "street_number"),
    componentValue(components, "route")
  ]);
  const city =
    componentValue(components, "locality") ||
    componentValue(components, "postal_town") ||
    componentValue(components, "sublocality") ||
    componentValue(components, "administrative_area_level_2");
  const region = componentValue(components, "administrative_area_level_1");
  const country = componentValue(components, "country") || defaultCountryName();
  const postalCode = componentValue(components, "postal_code");
  const formatted = result.formatted_address || buildAddress([street, city, region, postalCode, country]);

  return {
    provider: "google",
    address: { formatted, street, city, region, country, postalCode, lat, lng }
  };
}

function mapboxContextValue(feature: any, id: string) {
  const match = feature?.context?.find((item: any) => String(item.id || "").startsWith(`${id}.`));
  return match?.text || "";
}

async function reverseGeocodeMapbox(lat: number, lng: number, token: string): Promise<ReverseGeocodeResult | null> {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("types", "address,place,locality,neighborhood,region,postcode,country");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as { features?: any[] } | null;
  const feature = payload?.features?.[0];
  if (!feature) return null;

  const street = feature.address ? `${feature.address} ${feature.text || ""}`.trim() : feature.text || "";
  const city =
    mapboxContextValue(feature, "place") ||
    mapboxContextValue(feature, "locality") ||
    mapboxContextValue(feature, "neighborhood");
  const region = mapboxContextValue(feature, "region");
  const country = mapboxContextValue(feature, "country") || defaultCountryName();
  const postalCode = mapboxContextValue(feature, "postcode");
  const formatted = feature.place_name || buildAddress([street, city, region, postalCode, country]);

  return {
    provider: "mapbox",
    address: { formatted, street, city, region, country, postalCode, lat, lng }
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const provider = (process.env.GEOCODING_PROVIDER || "fallback").trim().toLowerCase();
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  try {
    if ((provider === "google" || provider === "auto") && googleKey) {
      const google = await reverseGeocodeGoogle(lat, lng, googleKey);
      if (google) return google;
    }
    if ((provider === "mapbox" || provider === "auto") && mapboxToken) {
      const mapbox = await reverseGeocodeMapbox(lat, lng, mapboxToken);
      if (mapbox) return mapbox;
    }
  } catch (error) {
    console.warn("Reverse geocoding failed; using address fallback", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }

  return fallbackAddress(lat, lng);
}
