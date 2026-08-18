import { supabase } from "./supabase";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  contact_number: string | null;
  role: string;
  created_at: string;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name: string; contact_number: string }
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: updates.full_name,
      contact_number: updates.contact_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}