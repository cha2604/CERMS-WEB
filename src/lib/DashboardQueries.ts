import { supabase } from "./supabase";

// Support both database variations of Ongoing
export type ReportStatus = "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
export type ReportSeverity = "Very Low" | "Low" | "Moderate" | "High" | "Critical";

export interface ReportRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ReportStatus;
  severity: ReportSeverity | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminReportRow extends ReportRow {
  reporter_name: string;
  reporter_email: string;
}

export interface StatusCounts {
  total: number;
  pending: number;
  ongoing: number;
  resolved: number;
  rejected: number;
}

export interface SeverityCounts {
  veryLow: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

export interface WeeklyPoint {
  day: string;
  pending: number;
  ongoing: number;
  resolved: number;
  rejected: number;
}

const emptyStatusCounts: StatusCounts = {
  total: 0,
  pending: 0,
  ongoing: 0,
  resolved: 0,
  rejected: 0,
};

function tallyStatuses(rows: { status: string }[]): StatusCounts {
  const counts = { ...emptyStatusCounts, total: rows.length };
  for (const row of rows) {
    if (row.status === "Pending") counts.pending++;
    else if (row.status === "Ongoing" || row.status === "On-going") counts.ongoing++;
    else if (row.status === "Resolved") counts.resolved++;
    else if (row.status === "Rejected") counts.rejected++;
  }
  return counts;
}

// RESIDENT DASHBOARD

export async function getResidentStats(userId: string): Promise<StatusCounts> {
  const { data, error } = await supabase
    .from("reports")
    .select("status")
    .eq("user_id", userId);

  if (error) throw error;
  return tallyStatuses((data ?? []) as { status: string }[]);
}

export async function getResidentRecentReports(
  userId: string,
  limit = 5
): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function getResidentReports(
  userId: string,
  status?: string
): Promise<ReportRow[]> {
  let query = supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status && status !== "All") {
    if (status === "Ongoing" || status === "On-going") {
      query = query.in("status", ["Ongoing", "On-going"]);
    } else {
      query = query.eq("status", status);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

// ADMIN DASHBOARD

export async function getAdminStats(): Promise<StatusCounts> {
  const { data, error } = await supabase.from("reports").select("status");

  if (error) throw error;
  return tallyStatuses((data ?? []) as { status: string }[]);
}

export async function getSeverityBreakdown(): Promise<SeverityCounts> {
  const { data, error } = await supabase.from("reports").select("severity");

  if (error) throw error;

  const counts: SeverityCounts = {
    veryLow: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  for (const row of (data ?? []) as { severity: ReportSeverity | null }[]) {
    switch (row.severity) {
      case "Very Low":
        counts.veryLow++;
        break;
      case "Low":
        counts.low++;
        break;
      case "Moderate":
        counts.moderate++;
        break;
      case "High":
        counts.high++;
        break;
      case "Critical":
        counts.critical++;
        break;
    }
  }

  return counts;
}

export async function getWeeklyReportsOverview(): Promise<WeeklyPoint[]> {
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayIndex = (now.getDay() + 6) % 7;
  startOfWeek.setDate(now.getDate() - dayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("reports")
    .select("status, created_at")
    .gte("created_at", startOfWeek.toISOString());

  if (error) throw error;

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const points: WeeklyPoint[] = dayLabels.map((day) => ({
    day,
    pending: 0,
    ongoing: 0,
    resolved: 0,
    rejected: 0,
  }));

  for (const row of (data ?? []) as { status: string; created_at: string }[]) {
    const created = new Date(row.created_at);
    const idx = (created.getDay() + 6) % 7;
    const point = points[idx];
    if (row.status === "Pending") point.pending++;
    else if (row.status === "Ongoing" || row.status === "On-going") point.ongoing++;
    else if (row.status === "Resolved") point.resolved++;
    else if (row.status === "Rejected") point.rejected++;
  }

  return points;
}

export async function getAdminRecentReports(limit = 10): Promise<AdminReportRow[]> {
  const { data, error } = await supabase
    .from("admin_reports_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AdminReportRow[];
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) throw error;
}