import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed." },
        405
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error(
        "Supabase function environment is incomplete."
      );
    }

    const authorization =
      request.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        { error: "Authentication required." },
        401
      );
    }

    const authenticatedClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const {
      data: authenticatedData,
      error: authenticationError,
    } = await authenticatedClient.auth.getUser();

    if (authenticationError || !authenticatedData.user) {
      return jsonResponse(
        { error: "Invalid administrator session." },
        401
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: administrator,
      error: administratorError,
    } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", authenticatedData.user.id)
      .single();

    if (
      administratorError ||
      administrator?.role !== "admin"
    ) {
      return jsonResponse(
        { error: "Administrator access required." },
        403
      );
    }

    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const surname = String(body.surname || "").trim();
    const username = String(body.username || "")
      .trim()
      .toLowerCase();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const contactNumber = String(
      body.contactNumber || ""
    ).trim();
    const teamName = String(body.teamName || "").trim();
    const position = String(body.position || "").trim();

    const password = surname;

    if (
      !fullName ||
      !surname ||
      !username ||
      !email ||
      !contactNumber ||
      !teamName
    ) {
      throw new Error(
        "Please complete all required staff information."
      );
    }

    if (!/^\d{11}$/.test(contactNumber)) {
      throw new Error(
        "Contact number must contain exactly 11 digits."
      );
    }

    const allowedTeams = [
      "Barangay Sanitary Inspection",
      "Solid Waste Management",
      "Barangay Garbage Crew",
    ];

    if (!allowedTeams.includes(teamName)) {
      throw new Error("Invalid response team.");
    }

    const {
      data: existingUsername,
      error: usernameCheckError,
    } = await adminClient
      .from("staff_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (usernameCheckError) {
      throw usernameCheckError;
    }

    if (existingUsername) {
      throw new Error("Username is already in use.");
    }

    const {
      data: existingEmail,
      error: emailCheckError,
    } = await adminClient
      .from("staff_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (emailCheckError) {
      throw emailCheckError;
    }

    if (existingEmail) {
      throw new Error(
        "Email address is already assigned to another staff account."
      );
    }

    const {
      data: existingContact,
      error: contactCheckError,
    } = await adminClient
      .from("staff_profiles")
      .select("id")
      .eq("contact_number", contactNumber)
      .maybeSingle();

    if (contactCheckError) {
      throw contactCheckError;
    }

    if (existingContact) {
      throw new Error(
        "Contact number is already assigned to another staff account."
      );
    }

    const {
      data: authData,
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        contact_number: contactNumber,
        role: "staff",
      },
    });

    if (authError || !authData.user) {
      if (
        authError?.message &&
        /password.*(minimum|least|characters|length)/i.test(
          authError.message
        )
      ) {
        throw new Error(
          `Supabase rejected this surname as a password because it does not meet the configured password requirements. ${authError.message}`
        );
      }

      throw (
        authError ||
        new Error(
          "Unable to create staff authentication account."
        )
      );
    }

    const staffId = authData.user.id;

    const {
      error: profileError,
    } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: staffId,
          full_name: fullName,
          username,
          email,
          contact_number: contactNumber,
          address:
            "Barangay Tankulan, Manolo Fortich, Bukidnon",
          role: "staff",
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(staffId);
      throw profileError;
    }

    const {
      error: staffProfileError,
    } = await adminClient
      .from("staff_profiles")
      .insert({
        id: staffId,
        full_name: fullName,
        username,
        email,
        contact_number: contactNumber,
        team_name: teamName,
        position: position || null,
        account_status: "Active",
        created_by: authenticatedData.user.id,
      });

    if (staffProfileError) {
      await adminClient
        .from("profiles")
        .delete()
        .eq("id", staffId);

      await adminClient.auth.admin.deleteUser(staffId);

      throw staffProfileError;
    }

    return jsonResponse(
      {
        success: true,
        message: "Staff account created successfully.",
        staff: {
          id: staffId,
          fullName,
          username,
          email,
          contactNumber,
          teamName,
          position: position || null,
        },
      },
      200
    );
  } catch (error) {
    console.error("create-staff:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create staff account.",
      },
      400
    );
  }
});