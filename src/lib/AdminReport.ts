import { supabase } from "./supabase";
import type { ReportStatus } from "./DashboardQueries";
import type { ExifData } from "./ExifHelper";

export interface AdminReportDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ReportStatus;
  severity: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_urls: string[];
  contact_number: string | null;
  exif_data: ExifData | null;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
  reporter_name: string;
  reporter_email: string | null;
  reporter_phone: string | null;
}

export async function getAllAdminReports(
  status?: ReportStatus | "All"
): Promise<AdminReportDetail[]> {
  let query = supabase
    .from("admin_reports_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminReportDetail[];
}

export async function getAdminReportById(
  id: string
): Promise<AdminReportDetail | null> {
  const { data, error } = await supabase
    .from("admin_reports_view")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as AdminReportDetail;
}

export async function updateReportStatusAndRemarks(
  reportId: string,
  status: ReportStatus,
  remarks?: string
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (remarks) {
    updatePayload.admin_remarks = remarks;
  }

  const { error } = await supabase
    .from("reports")
    .update(updatePayload)
    .eq("id", reportId);

  if (error) throw error;
}