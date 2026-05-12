"use client";

export type DetectedAddress = {
  formatted: string;
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
};

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    });
  });
}

export async function detectCurrentAddress() {
  if (!navigator.geolocation) {
    throw new Error("GPS location is not available in this browser.");
  }
  if (!window.isSecureContext) {
    throw new Error("Phone GPS requires HTTPS. Use the deployed Vercel link, or enter the address manually.");
  }

  try {
    const position = await currentPosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const response = await fetch("/api/location/reverse-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng })
    });
    const payload = await response.json().catch(() => null) as {
      ok?: boolean;
      error?: string;
      address?: DetectedAddress;
      provider?: string;
    } | null;

    if (!response.ok || !payload?.ok || !payload.address) {
      throw new Error(payload?.error || "Address could not be detected.");
    }

    return { address: payload.address, provider: payload.provider || "demo" };
  } catch (error) {
    if (typeof GeolocationPositionError !== "undefined" && error instanceof GeolocationPositionError) {
      if (error.code === error.PERMISSION_DENIED) {
        throw new Error("Location permission was denied. You can still enter the address manually.");
      }
      if (error.code === error.TIMEOUT) {
        throw new Error("Location lookup timed out. Try again or enter the address manually.");
      }
    }
    throw error instanceof Error ? error : new Error("Location could not be detected.");
  }
}
