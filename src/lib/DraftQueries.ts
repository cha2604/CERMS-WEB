import { supabase } from "./supabase";

export interface ReportDraft {
  id: string;
  category: string | null;
  description: string | null;
  contact_number: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface DraftInput {
  category: string;
  description: string;
  contactNumber: string;
  latitude: number | null;
  longitude: number | null;
}

export async function saveDraft(
  userId: string,
  draft: DraftInput,
  draftId?: string
): Promise<ReportDraft> {
  const payload = {
    user_id: userId,
    category: draft.category,
    description: draft.description,
    contact_number: draft.contactNumber,
    latitude: draft.latitude,
    longitude: draft.longitude,
    updated_at: new Date().toISOString(),
  };

  if (draftId) {
    const { data, error } = await supabase
      .from("report_drafts")
      .update(payload)
      .eq("id", draftId)
      .select()
      .single();

    if (error) throw error;
    return data as ReportDraft;
  }

  const { data, error } = await supabase
    .from("report_drafts")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as ReportDraft;
}

export async function getUserDrafts(userId: string): Promise<ReportDraft[]> {
  const { data, error } = await supabase
    .from("report_drafts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportDraft[];
}

export async function getDraftById(draftId: string): Promise<ReportDraft> {
  const { data, error } = await supabase
    .from("report_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error) throw error;
  return data as ReportDraft;
}

export async function deleteDraft(draftId: string): Promise<void> {
  const { error } = await supabase
    .from("report_drafts")
    .delete()
    .eq("id", draftId);

  if (error) throw error;
}