import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export async function loginWithEmail(
  email: string,
  pass: string
) {
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
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
  } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: import.meta.env.DEV
        ? "http://user.localhost:5173/auth/callback"
        : `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureResidentProfile(
  user: User
) {
  if (!user) {
    throw new Error(
      "User session could not be verified."
    );
  }

  const metadata = user.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    "";

  const email = user.email || "";

  const address =
    metadata.address || "";

  const contactNumber =
    metadata.contact_number || "";

  const {
    data: existingProfile,
    error: profileLookupError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  if (!existingProfile) {
    const {
      error: profileInsertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: fullName,
        email,
        address,
        contact_number: contactNumber,
        role: "resident",
      });

    if (profileInsertError) {
      throw profileInsertError;
    }
  } else if (
    existingProfile.role !== "admin"
  ) {
    const {
      error: profileUpdateError,
    } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || undefined,
        email: email || undefined,
        address: address || undefined,
        contact_number:
          contactNumber || undefined,
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }
  }

  const {
    data: existingApproval,
    error: approvalLookupError,
  } = await supabase
    .from("resident_approvals")
    .select("user_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (approvalLookupError) {
    throw approvalLookupError;
  }

  if (!existingApproval) {
    const {
      error: approvalInsertError,
    } = await supabase
      .from("resident_approvals")
      .insert({
        user_id: user.id,
        status: "pending",
      });

    if (approvalInsertError) {
      throw approvalInsertError;
    }
  }

  return true;
}

export async function registerWithEmail(
  fullName: string,
  email: string,
  pass: string,
  fullAddress: string,
  contactNumber: string
) {
  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
        email,
        address: fullAddress,
        contact_number: contactNumber,
        role: "resident",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user && data.session) {
    await ensureResidentProfile(
      data.user
    );
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
  } = await supabase
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
      approvalStatus: "approved",
    };
  }

  const {
    data: approval,
    error: approvalError,
  } = await supabase
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
      approval?.status ?? "pending",
  };
}