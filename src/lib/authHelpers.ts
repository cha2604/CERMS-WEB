import { supabase } from "./supabase";

export async function loginWithEmail(
  email: string,
  pass: string
) {
  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function loginWithGoogle() {
  const {
    data,
    error,
  } =
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/login`,
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function registerWithEmail(
  fullName: string,
  email: string,
  pass: string,
  fullAddress: string
) {
  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          address: fullAddress,
        },
      },
    });

  if (error) {
    throw error;
  }

  if (data.user) {
    const {
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          full_name: fullName,
          email,
          address: fullAddress,
          role: "resident",
        });

    if (profileError) {
      throw profileError;
    }

    const {
      error: approvalError,
    } =
      await supabase
        .from("resident_approvals")
        .upsert(
          {
            user_id: data.user.id,
            status: "pending",
          },
          {
            onConflict: "user_id",
          }
        );

    if (approvalError) {
      throw approvalError;
    }
  }

  return data;
}

export async function getAccountStatus() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return {
      userId: null,
      role: null,
      approvalStatus: null,
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const role =
    profile?.role === "admin"
      ? "admin"
      : "resident";

  if (role === "admin") {
    return {
      userId: user.id,
      role: "admin",
      approvalStatus:
        "approved",
    };
  }

  const {
    data: approval,
    error: approvalError,
  } =
    await supabase
      .from("resident_approvals")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (approvalError) {
    throw approvalError;
  }

  return {
    userId: user.id,
    role: "resident",
    approvalStatus:
      approval?.status ??
      "pending",
  };
}