export type WazeInput = {
  latitude?: number | null;
  longitude?: number | null;
  locationLink?: string | null;
  address?: string | null;
};

export function buildAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
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
