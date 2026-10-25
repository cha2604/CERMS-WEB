import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export async function loginWithEmail(
  email: string,
  pass: string
) {
  const cleanEmail =
    email.trim().toLowerCase();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function loginWithGoogle() {
  const redirectTo =
    import.meta.env.DEV
      ? "http://user.localhost:5173/auth/callback"
      : `${window.location.origin}/auth/callback`;

  const { data, error } =
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function getEmailByUsername(
  username: string
) {
  const cleanUsername =
    username.trim().toLowerCase();

  if (!cleanUsername) {
    throw new Error(
      "Please enter your username."
    );
  }

  const { data, error } =
    await supabase.rpc(
      "get_email_by_username",
      {
        input_username:
          cleanUsername,
      }
    );

  if (error) {
    console.error(
      "Username lookup failed:",
      error
    );

    throw new Error(
      "Unable to find this username."
    );
  }

  if (!data) {
    throw new Error(
      "Username not found."
    );
  }

  return String(data)
    .trim()
    .toLowerCase();
}

export async function checkUsernameAvailability(
  username: string
) {
  const cleanUsername =
    username.trim().toLowerCase();

  if (!cleanUsername) {
    return false;
  }

  const { data, error } =
    await supabase.rpc(
      "is_username_available",
      {
        candidate:
          cleanUsername,
      }
    );

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function ensureResidentProfile(
  user: User
) {
  if (!user) {
    throw new Error(
      "User session could not be verified."
    );
  }

  const metadata =
    user.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    "";

  const username =
    metadata.username || "";

  const email =
    user.email || "";

  const address =
    metadata.address || "";

  const contactNumber =
    metadata.contact_number || "";

  const {
    data: existingProfile,
    error: lookupError,
  } = await supabase
    .from("profiles")
    .select(
      "id, role, username, full_name, email, address, contact_number, profile_completed, terms_accepted"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (
    existingProfile?.role ===
    "admin"
  ) {
    return true;
  }

  if (!existingProfile) {
    const {
      error: insertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: fullName,
        username:
          username || null,
        email,
        address:
          address || null,
        contact_number:
          contactNumber || null,
        role: "resident",
        profile_completed: false,
        terms_accepted: false,
        terms_accepted_at: null,
      });

    if (insertError) {
      throw insertError;
    }

    return true;
  }

  const updates: {
    full_name?: string;
    username?: string;
    email?: string;
    address?: string;
    contact_number?: string;
  } = {};

  if (
    fullName &&
    !existingProfile.full_name
  ) {
    updates.full_name =
      fullName;
  }

  if (
    username &&
    !existingProfile.username
  ) {
    updates.username =
      username;
  }

  if (
    email &&
    !existingProfile.email
  ) {
    updates.email =
      email;
  }

  if (
    address &&
    !existingProfile.address
  ) {
    updates.address =
      address;
  }

  if (
    contactNumber &&
    !existingProfile.contact_number
  ) {
    updates.contact_number =
      contactNumber;
  }

  if (
    Object.keys(updates).length >
    0
  ) {
    const {
      error: updateError,
    } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }
  }

  return true;
}

export async function registerWithEmail(
  fullName: string,
  username: string,
  email: string,
  pass: string,
  fullAddress: string,
  contactNumber: string
) {
  const cleanUsername =
    username.trim().toLowerCase();

  const cleanEmail =
    email.trim().toLowerCase();

  const cleanContact =
    contactNumber.replace(
      /\D/g,
      ""
    );

  if (
    !/^[a-z0-9_]{3,20}$/.test(
      cleanUsername
    )
  ) {
    throw new Error(
      "Username must contain 3 to 20 letters, numbers, or underscores only."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
      cleanEmail
    )
  ) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  if (
    cleanContact.length !== 11 ||
    !cleanContact.startsWith("09")
  ) {
    throw new Error(
      "Please enter a valid 11-digit contact number starting with 09."
    );
  }

  const available =
    await checkUsernameAvailability(
      cleanUsername
    );

  if (!available) {
    throw new Error(
      "This username is already in use."
    );
  }

  const { data, error } =
    await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name:
            fullName.trim(),
          username:
            cleanUsername,
          email:
            cleanEmail,
          address:
            fullAddress.trim(),
          contact_number:
            cleanContact,
          role:
            "resident",
        },
      },
    });

  if (error) {
    throw error;
  }

  if (
    data.user &&
    data.session
  ) {
    await ensureResidentProfile(
      data.user
    );

    const {
      error: updateError,
    } = await supabase
      .from("profiles")
      .update({
        full_name:
          fullName.trim(),
        username:
          cleanUsername,
        email:
          cleanEmail,
        address:
          fullAddress.trim(),
        contact_number:
          cleanContact,
        role:
          "resident",
        profile_completed:
          false,
        terms_accepted:
          false,
        terms_accepted_at:
          null,
      })
      .eq(
        "id",
        data.user.id
      );

    if (updateError) {
      throw updateError;
    }
  }

  return data;
}

export async function acceptResidentTerms() {
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Your session could not be verified."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "username, full_name, email, address, contact_number"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error(
      "Your CERMS profile could not be found."
    );
  }

  const hasUsername =
    Boolean(
      profile.username?.trim()
    );

  const hasName =
    Boolean(
      profile.full_name?.trim()
    );

  const hasEmail =
    Boolean(
      profile.email?.trim()
    );

  const hasAddress =
    Boolean(
      profile.address?.trim()
    );

  const cleanContact =
    (
      profile.contact_number ||
      ""
    ).replace(/\D/g, "");

  const hasContact =
    cleanContact.length ===
      11 &&
    cleanContact.startsWith(
      "09"
    );

  if (
    !hasUsername ||
    !hasName ||
    !hasEmail ||
    !hasAddress ||
    !hasContact
  ) {
    throw new Error(
      "Please complete all required profile information before continuing."
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("profiles")
    .update({
      profile_completed:
        true,
      terms_accepted:
        true,
      terms_accepted_at:
        new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    throw updateError;
  }

  return true;
}

export async function completeGoogleResidentProfile(
  user: User,
  username: string,
  fullAddress: string,
  contactNumber: string
) {
  if (!user) {
    throw new Error(
      "Your Google session could not be verified."
    );
  }

  const cleanUsername =
    username.trim().toLowerCase();

  const cleanContact =
    contactNumber.replace(
      /\D/g,
      ""
    );

  if (
    !/^[a-z0-9_]{3,20}$/.test(
      cleanUsername
    )
  ) {
    throw new Error(
      "Username must contain 3 to 20 letters, numbers, or underscores only."
    );
  }

  if (
    cleanContact.length !== 11 ||
    !cleanContact.startsWith(
      "09"
    )
  ) {
    throw new Error(
      "Please enter a valid 11-digit contact number starting with 09."
    );
  }

  if (!fullAddress.trim()) {
    throw new Error(
      "Please select your area."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, username, role"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (
    profile?.role ===
    "admin"
  ) {
    throw new Error(
      "Admin accounts cannot use the resident portal."
    );
  }

  const currentUsername =
    profile?.username
      ?.trim()
      .toLowerCase() ||
    "";

  if (
    currentUsername !==
    cleanUsername
  ) {
    const available =
      await checkUsernameAvailability(
        cleanUsername
      );

    if (!available) {
      throw new Error(
        "This username is already in use."
      );
    }
  }

  const metadata =
    user.user_metadata || {};

  const fullName =
    metadata.full_name ||
    metadata.name ||
    "";

  const email =
    user.email || "";

  if (!email) {
    throw new Error(
      "Your Google account does not contain a valid email address."
    );
  }

  if (profile) {
    const {
      error: updateError,
    } = await supabase
      .from("profiles")
      .update({
        full_name:
          fullName,
        username:
          cleanUsername,
        email,
        address:
          fullAddress.trim(),
        contact_number:
          cleanContact,
        role:
          "resident",
        profile_completed:
          true,
        terms_accepted:
          true,
        terms_accepted_at:
          new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return true;
  }

  const {
    error: insertError,
  } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name:
        fullName,
      username:
        cleanUsername,
      email,
      address:
        fullAddress.trim(),
      contact_number:
        cleanContact,
      role:
        "resident",
      profile_completed:
        true,
      terms_accepted:
        true,
      terms_accepted_at:
        new Date().toISOString(),
    });

  if (insertError) {
    throw insertError;
  }

  return true;
}

export async function getAccountStatus() {
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return {
      userId: null,
      role: null,
      profileCompleted:
        false,
      termsAccepted:
        false,
      approvalStatus:
        "approved",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, profile_completed, terms_accepted"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return {
    userId:
      user.id,
    role:
      profile?.role ===
      "admin"
        ? "admin"
        : "resident",
    profileCompleted:
      profile?.profile_completed ===
      true,
    termsAccepted:
      profile?.terms_accepted ===
      true,
    approvalStatus:
      "approved",
  };
}