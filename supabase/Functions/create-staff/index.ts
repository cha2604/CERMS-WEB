
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

function asRecord(value: unknown): Record<string, unknown> {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getString(
  source: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== null) {
      const result = String(value).trim();

      if (result) {
        return result;
      }
    }
  }

  return "";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;

    const parts = [
      record.message,
      record.details,
      record.hint,
      record.error,
      record.code ? `Code: ${record.code}` : "",
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    if (record.cause && record.cause !== error) {
      return getErrorMessage(record.cause);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "An unknown error occurred while creating the staff account.";
    }
  }

  return "An unknown error occurred while creating the staff account.";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  let createdStaffId: string | null = null;
  let adminClient: ReturnType<typeof createClient> | null = null;

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
        "Supabase function environment is incomplete. Check your Supabase function secrets."
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

    adminClient = createClient(
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

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      throw new Error("Invalid request body.");
    }

    const outerBody = asRecord(parsedBody);
    const nestedBody = asRecord(outerBody.body);
    const nestedData = asRecord(outerBody.data);
    const nestedStaff = asRecord(outerBody.staff);

    const body =
      Object.keys(nestedStaff).length > 0
        ? nestedStaff
        : Object.keys(nestedBody).length > 0
          ? nestedBody
          : Object.keys(nestedData).length > 0
            ? nestedData
            : outerBody;

    const fullName = getString(body, [
      "fullName",
      "firstName",
      "first_name",
      "full_name",
    ]);

    const surname = getString(body, [
      "surname",
      "lastName",
      "last_name",
    ]);

    const username = getString(body, [
      "username",
    ]).toLowerCase();

    const email = getString(body, [
      "email",
    ]).toLowerCase();

    const contactNumber = getString(body, [
      "contactNumber",
      "contact_number",
      "phone",
      "phoneNumber",
    ]);

    const teamName = getString(body, [
      "teamName",
      "team_name",
      "responseTeam",
      "response_team",
    ]);

    const missingFields: string[] = [];

    if (!fullName) missingFields.push("First Name");
    if (!surname) missingFields.push("Surname");
    if (!username) missingFields.push("Username");
    if (!email) missingFields.push("Email");
    if (!contactNumber) {
      missingFields.push("Contact Number");
    }
    if (!teamName) {
      missingFields.push("Response Team");
    }

    if (missingFields.length > 0) {
      console.error(
        "Missing staff fields:",
        missingFields,
        "Received keys:",
        Object.keys(body)
      );

      throw new Error(
        `Please complete the following required fields: ${missingFields.join(", ")}.`
      );
    }

    if (!/^\d{11}$/.test(contactNumber)) {
      throw new Error(
        "Contact number must contain exactly 11 digits."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(
        "Please enter a valid email address."
      );
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, periods, underscores, and hyphens."
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

    const initialPassword = surname;

    const {
      data: authData,
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${fullName} ${surname}`,
        username,
        contact_number: contactNumber,
        role: "staff",
      },
    });

    if (authError || !authData.user) {
      throw (
        authError ||
        new Error(
          "Unable to create staff authentication account."
        )
      );
    }

    const staffId = authData.user.id;
    createdStaffId = staffId;

    const {
      error: profileError,
    } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: staffId,
          full_name: `${fullName} ${surname}`,
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
      throw profileError;
    }

    const {
      error: staffProfileError,
    } = await adminClient
      .from("staff_profiles")
      .insert({
        id: staffId,
        full_name: `${fullName} ${surname}`,
        username,
        email,
        contact_number: contactNumber,
        team_name: teamName,
        account_status: "Active",
        created_by: authenticatedData.user.id,
      });

    if (staffProfileError) {
      throw staffProfileError;
    }

    createdStaffId = null;

    return jsonResponse(
      {
        success: true,
        message: "Staff account created successfully.",
        staff: {
          id: staffId,
          fullName: `${fullName} ${surname}`,
          username,
          email,
          contactNumber,
          teamName,
          accountStatus: "Active",
        },
      },
      200
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    console.error("CREATE STAFF ERROR:", error);
    console.error(
      "CREATE STAFF ERROR MESSAGE:",
      errorMessage
    );

    if (createdStaffId && adminClient) {
      const { error: staffDeleteError } = await adminClient
        .from("staff_profiles")
        .delete()
        .eq("id", createdStaffId);

      if (staffDeleteError) {
        console.error(
          "Staff profile rollback failed:",
          staffDeleteError
        );
      }

      const { error: profileDeleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", createdStaffId);

      if (profileDeleteError) {
        console.error(
          "Profile rollback failed:",
          profileDeleteError
        );
      }

      const { error: authDeleteError } =
        await adminClient.auth.admin.deleteUser(
          createdStaffId
        );

      if (authDeleteError) {
        console.error(
          "Auth rollback failed:",
          authDeleteError
        );
      }
    }

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
      },
      400
    );
  }
});
