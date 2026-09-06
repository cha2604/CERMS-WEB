import { getZones, findZoneForCoords } from "./ZoneQueries";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    const parts = [addr.road, addr.suburb || addr.village || addr.neighbourhood].filter(
      Boolean
    );

    return parts.length > 0 ? parts.join(", ") : null;
  } catch (err) {
    console.error("Reverse geocoding failed:", err);
    return null;
  }
}

export async function getFullAddress(lat: number, lng: number): Promise<string> {
  const [zones, streetInfo] = await Promise.all([
    getZones(),
    reverseGeocode(lat, lng),
  ]);

  const zone = findZoneForCoords(lat, lng, zones);

  const parts = [
    zone?.name,
    streetInfo,
    "Barangay Tankulan",
    "Manolo Fortich",
    "Bukidnon",
  ].filter(Boolean);

  return parts.join(", ");
}