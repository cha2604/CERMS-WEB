import { supabase } from "./supabase";

export async function loginWithEmail(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw error;
  return data;
}

export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function registerWithEmail(
  fullName: string,
  email: string,
  pass: string,
  fullAddress: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
        address: fullAddress,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email: email,
      address: fullAddress,
      role: "resident",
    });
  }

  return data;
}

export async function getAccountStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { role: "resident", suspended: false };

    const { data, error } = await supabase
      .from("profiles")
      .select("role, status, suspended")
      .eq("id", user.id)
      .single();

    if (error || !data) return { role: "resident", suspended: false };

    return {
      role: data.role === "admin" ? "admin" : "resident",
      suspended: data.suspended || data.status === "suspended",
    };
  } catch (err) {
    return { role: "resident", suspended: false };
  }
}