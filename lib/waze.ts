export type WazeInput = {
  latitude?: number | null;
  longitude?: number | null;
  locationLink?: string | null;
  address?: string | null;
};

const GENERIC_ADDRESS_PARTS = new Set([
  "mainland united states",
  "us dollar caribbean territories",
  "eastern caribbean",
  "french caribbean territories"
]);

export function buildAddress(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim().replace(/\s+/g, " "))
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalized = part.toLowerCase();
      if (GENERIC_ADDRESS_PARTS.has(normalized)) return false;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(", ");
}

export function buildWazeLink({ latitude, longitude, locationLink, address }: WazeInput) {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  }

  const sharedLocation = extractCoordinates(locationLink);
  if (sharedLocation) {
    return `https://waze.com/ul?ll=${sharedLocation.latitude},${sharedLocation.longitude}&navigate=yes`;
  }

  if (address?.trim()) {
    return `https://waze.com/ul?q=${encodeURIComponent(address.trim())}&navigate=yes`;
  }

  return null;
}

export function buildGoogleMapsLink({ latitude, longitude, locationLink, address }: WazeInput) {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  const sharedLocation = extractCoordinates(locationLink);
  if (sharedLocation) {
    return `https://maps.google.com/?q=${sharedLocation.latitude},${sharedLocation.longitude}`;
  }

  if (address?.trim()) {
    return `https://maps.google.com/?q=${encodeURIComponent(address.trim())}`;
  }

  return null;
}

function extractCoordinates(value?: string | null) {
  if (!value) return null;
  const match = value.match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
