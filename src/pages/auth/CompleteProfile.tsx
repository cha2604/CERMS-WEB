import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import {
  checkUsernameAvailability,
  completeGoogleResidentProfile,
} from "../../lib/authHelpers";

const AREAS = [
  "CENTRO",
  "TUMAMPONG",
  "ST. JOSEPH",
  "MULBERRY",
  "MANGIMA",
  "LOWER KALANAWAN",
  "UPPER KALANAWAN",
  "PROPER KALANAWAN",
  "UPPER POL-OTON",
  "LOWER POL-OTON",
  "KIHARE",
  "LOWER SOSOHON",
  "UPPER SOSOHON",
];

const FIXED_ADDRESS_SUFFIX =
  "Barangay Tankulan, Manolo Fortich, Bukidnon";

export default function CompleteProfile() {
  const navigate = useNavigate();

  const [
    loadingPage,
    setLoadingPage,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    originalUsername,
    setOriginalUsername,
  ] = useState("");

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState<
    | "idle"
    | "checking"
    | "available"
    | "taken"
  >("idle");

  const [
    usernameSuggestions,
    setUsernameSuggestions,
  ] = useState<string[]>([]);

  const [
    contactNumber,
    setContactNumber,
  ] = useState("");

  const [
    area,
    setArea,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    showTerms,
    setShowTerms,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function waitForSession() {
      for (
        let attempt = 0;
        attempt < 10;
        attempt++
      ) {
        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          return session.user;
        }

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              300
            )
        );
      }

      return null;
    }

    async function loadProfile() {
      try {
        const sessionUser =
          await waitForSession();

        if (!sessionUser) {
          throw new Error(
            "Your Google session could not be found. Please sign in again."
          );
        }

        const metadata =
          sessionUser.user_metadata ||
          {};

        if (!active) {
          return;
        }

        setFullName(
          metadata.full_name ||
            metadata.name ||
            ""
        );

        setEmail(
          sessionUser.email ||
            ""
        );

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "role, username, contact_number, address, profile_completed, terms_accepted"
          )
          .eq(
            "id",
            sessionUser.id
          )
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (
          profile?.role ===
          "admin"
        ) {
          await supabase.auth.signOut();

          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        const completed =
          profile?.profile_completed ===
            true &&
          profile?.terms_accepted ===
            true &&
          Boolean(
            profile?.username
              ?.trim()
          ) &&
          Boolean(
            profile?.contact_number
              ?.trim()
          ) &&
          Boolean(
            profile?.address
              ?.trim()
          );

        if (completed) {
          navigate(
            "/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          profile?.username
        ) {
          const value =
            profile.username
              .trim()
              .toLowerCase();

          setUsername(
            value
          );

          setOriginalUsername(
            value
          );

          setUsernameStatus(
            "available"
          );
        }

        if (
          profile?.contact_number
        ) {
          setContactNumber(
            profile.contact_number
          );
        }

        if (
          profile?.address
        ) {
          const matchingArea =
            AREAS.find(
              (item) =>
                profile.address
                  .toUpperCase()
                  .startsWith(
                    `${item},`
                  )
            );

          if (matchingArea) {
            setArea(
              matchingArea
            );
          }
        }
      } catch (error) {
        console.error(
          "Profile loading failed:",
          error
        );

        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (active) {
          setLoadingPage(
            false
          );
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function generateSuggestions(
    base: string
  ) {
    const candidates = [
      `${base}${Math.floor(
        Math.random() *
          90 +
          10
      )}`,
      `${base}_${Math.floor(
        Math.random() *
          90 +
          10
      )}`,
      `${base}2026`,
    ];

    const results =
      await Promise.all(
        candidates.map(
          async (candidate) => {
            try {
              const available =
                await checkUsernameAvailability(
                  candidate
                );

              return available
                ? candidate
                : null;
            } catch {
              return null;
            }
          }
        )
      );

    setUsernameSuggestions(
      results.filter(
        (
          item
        ): item is string =>
          item !== null
      )
    );
  }

  async function handleUsernameChange(
    value: string
  ) {
    const cleanUsername =
      value
        .replace(/\s/g, "")
        .toLowerCase()
        .slice(0, 20);

    setUsername(
      cleanUsername
    );

    setUsernameSuggestions(
      []
    );

    setErrorMessage("");

    if (!cleanUsername) {
      setUsernameStatus(
        "idle"
      );

      return;
    }

    if (
      cleanUsername.length <
        3 ||
      !/^[a-z0-9_]+$/.test(
        cleanUsername
      )
    ) {
      setUsernameStatus(
        "idle"
      );

      return;
    }

    if (
      originalUsername &&
      cleanUsername ===
        originalUsername
    ) {
      setUsernameStatus(
        "available"
      );

      return;
    }

    setUsernameStatus(
      "checking"
    );

    try {
      const available =
        await checkUsernameAvailability(
          cleanUsername
        );

      if (available) {
        setUsernameStatus(
          "available"
        );

        return;
      }

      setUsernameStatus(
        "taken"
      );

      await generateSuggestions(
        cleanUsername
      );
    } catch (error) {
      console.error(
        "Username check failed:",
        error
      );

      setUsernameStatus(
        "idle"
      );

      setErrorMessage(
        "Unable to check username availability."
      );
    }
  }

  async function selectSuggestion(
    suggestion: string
  ) {
    setUsername(
      suggestion
    );

    setUsernameSuggestions(
      []
    );

    setUsernameStatus(
      "checking"
    );

    try {
      const available =
        await checkUsernameAvailability(
          suggestion
        );

      if (available) {
        setUsernameStatus(
          "available"
        );
      } else {
        setUsernameStatus(
          "taken"
        );
      }
    } catch {
      setUsernameStatus(
        "idle"
      );
    }
  }

  async function validateDetails() {
    setErrorMessage("");

    const cleanUsername =
      username
        .trim()
        .toLowerCase();

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
      setErrorMessage(
        "Username must contain 3 to 20 letters, numbers, or underscores only."
      );

      return false;
    }

    if (
      usernameStatus ===
      "checking"
    ) {
      setErrorMessage(
        "Please wait while we check your username."
      );

      return false;
    }

    if (
      usernameStatus ===
      "taken"
    ) {
      setErrorMessage(
        "This username is already in use."
      );

      return false;
    }

    if (
      cleanUsername !==
      originalUsername
    ) {
      const available =
        await checkUsernameAvailability(
          cleanUsername
        );

      if (!available) {
        setUsernameStatus(
          "taken"
        );

        await generateSuggestions(
          cleanUsername
        );

        setErrorMessage(
          "This username is already in use."
        );

        return false;
      }
    }

    if (
      cleanContact.length !==
        11 ||
      !cleanContact.startsWith(
        "09"
      )
    ) {
      setErrorMessage(
        "Please enter a valid 11-digit contact number starting with 09."
      );

      return false;
    }

    if (!area) {
      setErrorMessage(
        "Please select your area."
      );

      return false;
    }

    return true;
  }

  async function handleContinue(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      const valid =
        await validateDetails();

      if (!valid) {
        return;
      }

      setShowTerms(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to validate your information."
      );
    }
  }

  async function handleAgree() {
    if (saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const valid =
        await validateDetails();

      if (!valid) {
        setShowTerms(false);

        return;
      }

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        throw new Error(
          "Your Google session has expired. Please sign in again."
        );
      }

      const fullAddress =
        `${area}, ${FIXED_ADDRESS_SUFFIX}`;

      const savedProfile =
        await completeGoogleResidentProfile(
          session.user,
          username,
          fullAddress,
          contactNumber
        );

      if (
        savedProfile.profile_completed !==
          true ||
        savedProfile.terms_accepted !==
          true
      ) {
        throw new Error(
          "CERMS could not complete your profile."
        );
      }

      setShowTerms(false);

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Profile completion failed:",
        error
      );

      setShowTerms(false);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your CERMS profile could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-700" />

          <p className="mt-4 text-sm text-slate-500">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <div className="w-full max-w-xl rounded-2xl border border-green-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <h1 className="text-lg font-bold text-green-800">
            CERMS
          </h1>

          <h2 className="mt-3 text-2xl font-bold text-slate-800">
            Complete Your Profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Complete your resident information before using CERMS.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-green-800">
            Google Account
          </p>

          <p className="mt-2 font-bold text-slate-800">
            {fullName ||
              "Google User"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {email}
          </p>
        </div>

        <form
          onSubmit={
            handleContinue
          }
          className="mt-6 space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Username
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiUser
                  size={16}
                />
              </span>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  void handleUsernameChange(
                    e.target.value
                  )
                }
                minLength={3}
                maxLength={20}
                placeholder="Choose a username"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-700 focus:ring-4 focus:ring-green-200"
              />
            </div>

            {usernameStatus ===
              "checking" && (
              <p className="mt-1 text-xs text-slate-500">
                Checking username...
              </p>
            )}

            {usernameStatus ===
              "available" && (
              <p className="mt-1 text-xs font-semibold text-green-600">
                ✓ Username is available
              </p>
            )}

            {usernameStatus ===
              "taken" && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-red-600">
                  This username is already in use.
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {usernameSuggestions.map(
                    (
                      suggestion
                    ) => (
                      <button
                        key={
                          suggestion
                        }
                        type="button"
                        onClick={() =>
                          void selectSuggestion(
                            suggestion
                          )
                        }
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700"
                      >
                        {
                          suggestion
                        }
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contact Number
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiPhone
                  size={16}
                />
              </span>

              <input
                type="tel"
                value={
                  contactNumber
                }
                onChange={(e) =>
                  setContactNumber(
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        11
                      )
                  )
                }
                maxLength={11}
                placeholder="09XXXXXXXXX"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-700 focus:ring-4 focus:ring-green-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Area
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiMapPin
                  size={16}
                />
              </span>

              <select
                value={area}
                onChange={(e) =>
                  setArea(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-700 focus:ring-4 focus:ring-green-200"
              >
                <option
                  value=""
                  disabled
                >
                  Select your Area
                </option>

                {AREAS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              usernameStatus ===
                "checking" ||
              usernameStatus ===
                "taken"
            }
            className="w-full rounded-xl bg-green-700 py-3 font-semibold text-white disabled:opacity-60"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={() =>
              void handleDecline()
            }
            className="w-full text-sm font-semibold text-slate-500"
          >
            Cancel and Sign Out
          </button>
        </form>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-center text-2xl font-bold text-green-800">
              Terms and Conditions
            </h2>

            <div className="mt-5 max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <p>
                By continuing, you confirm that the information you provided is accurate and that CERMS may use your account information, submitted photos, and report location for waste reporting and monitoring within Barangay Tankulan.
              </p>

              <p className="mt-4">
                You agree not to submit false, misleading, harmful, or intentionally duplicated reports.
              </p>

              <p className="mt-4">
                Your personal information will only be used for CERMS account management and waste-report processing by authorized personnel.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  void handleDecline()
                }
                disabled={saving}
                className="rounded-xl border border-slate-300 py-3 font-semibold text-slate-700"
              >
                I Don't Agree
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleAgree()
                }
                disabled={saving}
                className="rounded-xl bg-green-700 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving Profile..."
                  : "I Agree"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}