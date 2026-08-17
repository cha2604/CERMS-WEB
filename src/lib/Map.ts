import { supabase } from "./supabase";
import type { ReportStatus, ReportSeverity } from "./DashboardQueries";

export interface MapReport {
  id: string;
  title: string;
  category: string;
  status: ReportStatus;
  severity: ReportSeverity | null;
  latitude: number;
  longitude: number;
  image_urls: string[];
  created_at: string;
}

export async function getMapReports(): Promise<MapReport[]> {
  const { data, error } = await supabase
    .from("map_reports_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MapReport[];
}