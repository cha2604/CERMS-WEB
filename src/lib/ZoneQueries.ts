import { supabase } from "./supabase";

export interface Zone {
  id: string;
  name: string;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  color: string;
}

export interface ZoneWithCount extends Zone {
  reportCount: number;
}

export const DEFAULT_TANKULAN_PUROKS: Zone[] = [
  { id: "purok-1", name: "Purok 1 (Poblacion / Proper)", min_lat: 8.364, max_lat: 8.372, min_lng: 124.860, max_lng: 124.872, color: "#10b981" },
  { id: "purok-2a", name: "Purok 2a (52nd Engineer Brigade / Susohon)", min_lat: 8.362, max_lat: 8.368, min_lng: 124.872, max_lng: 124.880, color: "#3b82f6" },
  { id: "purok-2b", name: "Purok 2b (Binantalan)", min_lat: 8.360, max_lat: 8.365, min_lng: 124.855, max_lng: 124.862, color: "#8b5cf6" },
  { id: "purok-3a", name: "Purok 3a (Lower Kalanawan)", min_lat: 8.358, max_lat: 8.363, min_lng: 124.862, max_lng: 124.868, color: "#ec4899" },
  { id: "purok-3b", name: "Purok 3b (Upper Kalanawan)", min_lat: 8.356, max_lat: 8.360, min_lng: 124.868, max_lng: 124.875, color: "#f43f5e" },
  { id: "purok-4a", name: "Purok 4a (Kihare)", min_lat: 8.353, max_lat: 8.358, min_lng: 124.862, max_lng: 124.870, color: "#f97316" },
  { id: "purok-4b", name: "Purok 4b (Mulberry Subdivision)", min_lat: 8.350, max_lat: 8.355, min_lng: 124.858, max_lng: 124.865, color: "#eab308" },
  { id: "purok-5", name: "Purok 5 (Pol-oton)", min_lat: 8.348, max_lat: 8.353, min_lng: 124.868, max_lng: 124.876, color: "#06b6d4" },
  { id: "purok-6a", name: "Purok 6a (Bliss)", min_lat: 8.355, max_lat: 8.360, min_lng: 124.875, max_lng: 124.882, color: "#14b8a6" },
  { id: "purok-6b", name: "Purok 6b (Mangima)", min_lat: 8.360, max_lat: 8.370, min_lng: 124.880, max_lng: 124.892, color: "#6366f1" },
];

export async function getZones(): Promise<Zone[]> {
  try {
    const { data, error } = await supabase.from("zones").select("*");
    if (error || !data || data.length === 0) return DEFAULT_TANKULAN_PUROKS;
    return data as Zone[];
  } catch (err) {
    return DEFAULT_TANKULAN_PUROKS;
  }
}

export function findZoneForCoords(
  lat: number,
  lng: number,
  zones: Zone[]
): Zone | null {
  return (
    zones.find(
      (z) => lat >= z.min_lat && lat <= z.max_lat && lng >= z.min_lng && lng <= z.max_lng
    ) ?? null
  );
}

export async function getZoneBreakdown(): Promise<ZoneWithCount[]> {
  const zones = await getZones();
  let reports: any[] = [];

  try {
    const { data, error } = await supabase.from("reports").select("latitude, longitude");
    if (!error && data) reports = data;
  } catch (err) {
    console.error("Failed fetching report coordinates:", err);
  }

  const counts: Record<string, number> = {};
  zones.forEach((z) => (counts[z.id] = 0));

  for (const report of reports) {
    if (report.latitude == null || report.longitude == null) continue;
    const zone = findZoneForCoords(report.latitude, report.longitude, zones);
    if (zone) counts[zone.id] = (counts[zone.id] ?? 0) + 1;
  }

  return zones.map((z) => ({ ...z, reportCount: counts[z.id] ?? 0 }));
}

export interface MonthlyCount {
  month: string;
  count: number;
}

export async function getMonthlyReportTrends(): Promise<MonthlyCount[]> {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1).toISOString();

  let data: any[] = [];
  try {
    const { data: res, error } = await supabase
      .from("reports")
      .select("created_at")
      .gte("created_at", startOfYear);
    if (!error && res) data = res;
  } catch (err) {
    console.error("Failed fetching monthly trends:", err);
  }

  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const counts = new Array(12).fill(0);

  for (const row of data) {
    const month = new Date(row.created_at).getMonth();
    counts[month]++;
  }

  return monthLabels.map((label, i) => ({ month: label, count: counts[i] }));
}