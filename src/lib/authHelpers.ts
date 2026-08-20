import { supabase } from "./supabase";
export async function registerWithEmail(
fullName: string, email: string, password: string, address: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  });

  if (error) throw error;
  return data;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("09")) return `+63${digits.slice(1)}`;
  if (digits.startsWith("63")) return `+${digits}`;

  return digits;
}


export async function sendPhoneOtp(phone: string, fullName?: string) {
  const formatted = formatPhoneNumber(phone);

  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formatted,
    options: fullName
      ? { data: { full_name: fullName.trim() } }
      : undefined,
  });

  if (error) throw error;
  return data;
}


export async function verifyPhoneOtp(phone: string, token: string) {
  const formatted = formatPhoneNumber(phone);

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token,
    type: "sms",
  });

  if (error) throw error;
  return data;
}

export async function getCurrentUserRole(): Promise<"resident" | "admin" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return (profile?.role as "resident" | "admin") ?? "resident";
}