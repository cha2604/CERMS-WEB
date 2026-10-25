import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PasswordInput from "../../components/common/Password";
import Button from "../../components/common/Button";
import {
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import {
  checkUsernameAvailability,
  ensureResidentProfile,
  loginWithGoogle,
  registerWithEmail,
} from "../../lib/authHelpers";
import { supabase } from "../../lib/supabase";

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

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const [
    usernameSuggestions,
    setUsernameSuggestions,
  ] = useState<string[]>([]);

  const [area, setArea] =
    useState("");

  const [
    contactNumber,
    setContactNumber,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [
    emailValid,
    setEmailValid,
  ] = useState(false);

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    showTerms,
    setShowTerms,
  ] = useState(false);

  const [
    registrationComplete,
    setRegistrationComplete,
  ] = useState(false);

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function generateUsernameSuggestions(
    baseUsername: string
  ) {
    const possibleSuggestions = [
      `${baseUsername}${Math.floor(
        Math.random() * 90 + 10
      )}`,
      `${baseUsername}_${Math.floor(
        Math.random() * 90 + 10
      )}`,
      `${baseUsername}2026`,
    ];

    try {
      const checked =
        await Promise.all(
          possibleSuggestions.map(
            async (suggestion) => {
              const available =
                await checkUsernameAvailability(
                  suggestion
                );

              return available
                ? suggestion
                : null;
            }
          )
        );

      setUsernameSuggestions(
        checked.filter(
          (
            item
          ): item is string =>
            item !== null
        )
      );
    } catch (error) {
      console.error(
        "Username suggestion error:",
        error
      );

      setUsernameSuggestions([
        `${baseUsername}2026`,
        `${baseUsername}_01`,
        `${baseUsername}123`,
      ]);
    }
  }

  async function handleUsernameChange(
    value: string
  ) {
    const cleanUsername = value
      .replace(/\s/g, "")
      .toLowerCase()
      .slice(0, 20);

    setUsername(cleanUsername);
    setUsernameSuggestions([]);
    setErrorMessage("");

    if (!cleanUsername) {
      setUsernameStatus("idle");
      return;
    }

    if (
      cleanUsername.length < 3 ||
      !/^[a-z0-9_]+$/.test(
        cleanUsername
      )
    ) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    try {
      const available =
        await checkUsernameAvailability(
          cleanUsername
        );

      if (available) {
        setUsernameStatus(
          "available"
        );
      } else {
        setUsernameStatus("taken");

        await generateUsernameSuggestions(
          cleanUsername
        );
      }
    } catch (error) {
      console.error(
        "Username check failed:",
        error
      );

      setUsernameStatus("idle");
    }
  }

  async function handleSuggestionClick(
    suggestion: string
  ) {
    setUsername(suggestion);
    setUsernameStatus("checking");
    setUsernameSuggestions([]);
    setErrorMessage("");

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
        setUsernameStatus("taken");

        await generateUsernameSuggestions(
          suggestion
        );
      }
    } catch (error) {
      console.error(
        "Suggestion check failed:",
        error
      );

      setUsernameStatus("idle");
    }
  }

  function handleEmailChange(
    value: string
  ) {
    const cleanEmail =
      value.trimStart();

    setEmail(cleanEmail);

    if (!cleanEmail) {
      setEmailValid(false);
      return;
    }

    setEmailValid(
      emailRegex.test(
        cleanEmail.trim()
      )
    );
  }

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setErrorMessage("");

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanUsername =
      username.trim().toLowerCase();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanContact =
      contactNumber.replace(
        /\D/g,
        ""
      );

    if (!cleanFirstName) {
      setErrorMessage(
        "Please enter your first name."
      );
      return;
    }

    if (!cleanLastName) {
      setErrorMessage(
        "Please enter your last name."
      );
      return;
    }

    if (!cleanUsername) {
      setErrorMessage(
        "Please enter a username."
      );
      return;
    }

    if (
      !/^[a-z0-9_]{3,20}$/.test(
        cleanUsername
      )
    ) {
      setErrorMessage(
        "Username must contain 3 to 20 letters, numbers, or underscores only."
      );
      return;
    }

    if (
      usernameStatus === "checking"
    ) {
      setErrorMessage(
        "Please wait while we check your username."
      );
      return;
    }

    try {
      const available =
        await checkUsernameAvailability(
          cleanUsername
        );

      if (!available) {
        setUsernameStatus("taken");

        await generateUsernameSuggestions(
          cleanUsername
        );

        setErrorMessage(
          "This username is already in use. Please choose another username."
        );

        return;
      }

      setUsernameStatus("available");
    } catch (error) {
      console.error(
        "Username availability check failed:",
        error
      );

      setErrorMessage(
        "Unable to check username availability. Please try again."
      );

      return;
    }

    if (!area) {
      setErrorMessage(
        "Please select your area."
      );
      return;
    }

    if (
      cleanContact.length !== 11
    ) {
      setErrorMessage(
        "Contact number must contain exactly 11 digits."
      );
      return;
    }

    if (
      !cleanContact.startsWith("09")
    ) {
      setErrorMessage(
        "Contact number must start with 09."
      );
      return;
    }

    if (!cleanEmail) {
      setErrorMessage(
        "Please enter your email."
      );
      return;
    }

    if (
      !emailRegex.test(
        cleanEmail
      )
    ) {
      setEmailValid(false);

      setErrorMessage(
        "Please enter a valid email address."
      );

      return;
    }

    setEmailValid(true);

    if (password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match."
      );
      return;
    }

    const fullName =
      `${cleanFirstName} ${cleanLastName}`;

    const fullAddress =
      `${area}, ${FIXED_ADDRESS_SUFFIX}`;

    setLoading(true);

    try {
      const result =
        await registerWithEmail(
          fullName,
          cleanUsername,
          cleanEmail,
          password,
          fullAddress,
          cleanContact
        );

      if (!result.user) {
        throw new Error(
          "Account could not be created."
        );
      }

      if (!result.session) {
        throw new Error(
          "Account was created, but automatic login is unavailable. Please make sure Confirm Email is disabled in Supabase."
        );
      }

      await ensureResidentProfile(
        result.user
      );

      await supabase
        .from("profiles")
        .update({
          profile_completed: true,
          terms_accepted: true,
        })
        .eq("id", result.user.id);

      setRegistrationComplete(
        true
      );

      setShowTerms(true);
    } catch (error) {
      console.error(
        "Registration failed:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";

      if (
        message
          .toLowerCase()
          .includes(
            "already registered"
          )
      ) {
        setErrorMessage(
          "This email address is already registered."
        );

        return;
      }

      if (
        message
          .toLowerCase()
          .includes("username")
      ) {
        setUsernameStatus("taken");

        await generateUsernameSuggestions(
          cleanUsername
        );
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAgreeTerms() {
    setShowTerms(false);

    navigate(
      "/dashboard",
      {
        replace: true,
      }
    );
  }

  async function handleDeclineTerms() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Sign out failed:",
        error
      );
    }

    setShowTerms(false);
    setRegistrationComplete(
      false
    );

    setErrorMessage(
      "You must agree to the Terms and Conditions before continuing to CERMS."
    );
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    setErrorMessage("");

    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(
        "Google registration failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Google registration failed."
      );

      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <Card>
        <h1 className="text-center text-lg font-bold text-green-800">
          CERMS
        </h1>

        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            Create Account
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Register as a Barangay
            Tankulan resident
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="mt-6 space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              type="text"
              placeholder="Enter first name"
              icon={
                <FiUser
                  size={16}
                />
              }
              value={firstName}
              onChange={(e) =>
                setFirstName(
                  e.target.value
                )
              }
              autoComplete="given-name"
              disabled={
                registrationComplete
              }
              required
            />

            <Input
              label="Last Name"
              type="text"
              placeholder="Enter last name"
              icon={
                <FiUser
                  size={16}
                />
              }
              value={lastName}
              onChange={(e) =>
                setLastName(
                  e.target.value
                )
              }
              autoComplete="family-name"
              disabled={
                registrationComplete
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Username
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiUser
                  size={16}
                />
              </span>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  handleUsernameChange(
                    e.target.value
                  )
                }
                minLength={3}
                maxLength={20}
                autoComplete="username"
                placeholder="Enter username"
                disabled={
                  registrationComplete
                }
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            {usernameStatus ===
              "checking" && (
              <p className="mt-1 text-xs text-gray-500">
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

                {usernameSuggestions.length >
                  0 && (
                  <>
                    <p className="mt-2 text-xs text-gray-500">
                      Suggested usernames:
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
                              handleSuggestionClick(
                                suggestion
                              )
                            }
                            disabled={
                              registrationComplete
                            }
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {
                              suggestion
                            }
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="mt-1 text-xs text-gray-400">
              Use 3–20 letters,
              numbers, or underscores.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Address
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
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
                disabled={
                  registrationComplete
                }
                required
                className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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

            <p className="mt-1 text-xs text-gray-400">
              {
                FIXED_ADDRESS_SUFFIX
              }{" "}
              will be added
              automatically.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contact Number
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiPhone
                  size={16}
                />
              </span>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="09[0-9]{9}"
                maxLength={11}
                minLength={11}
                value={
                  contactNumber
                }
                disabled={
                  registrationComplete
                }
                onChange={(e) => {
                  const numbersOnly =
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        11
                      );

                  setContactNumber(
                    numbersOnly
                  );
                }}
                placeholder="09XXXXXXXXX"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Enter exactly 11
              digits starting with 09.
            </p>
          </div>

          <div>
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              icon={
                <FiMail
                  size={16}
                />
              }
              value={email}
              onChange={(e) =>
                handleEmailChange(
                  e.target.value
                )
              }
              autoComplete="email"
              disabled={
                registrationComplete
              }
              required
            />

            {email &&
              emailValid && (
                <p className="mt-2 text-xs font-semibold text-green-600">
                  ✓ Valid Email Address
                </p>
              )}

            {email &&
              !emailValid && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Please enter a valid email address.
                </p>
              )}
          </div>

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            autoComplete="new-password"
            minLength={6}
            required
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={
              confirmPassword
            }
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            autoComplete="new-password"
            minLength={6}
            required
          />

          <Button
            type="submit"
            disabled={
              loading ||
              registrationComplete ||
              usernameStatus ===
                "checking" ||
              usernameStatus ===
                "taken"
            }
          >
            {loading
              ? "Creating account..."
              : "Register"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-medium text-gray-400">
              OR
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={
              handleGoogleRegister
            }
            disabled={
              googleLoading ||
              registrationComplete
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.5-.4-3.5z"
              />

              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />

              <path
                fill="#4CAF50"
                d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
              />

              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.5 36.5 44 30.7 44 24c0-1.3-.1-2.5-.4-3.5z"
              />
            </svg>

            {googleLoading
              ? "Connecting..."
              : "Continue with Google"}
          </button>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-green-700 hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </Card>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-800">
                Terms and Conditions
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Please read the Terms and Conditions before continuing to CERMS.
              </p>
            </div>

            <div className="mt-5 max-h-[55vh] space-y-5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 pr-4 text-sm leading-relaxed text-slate-600">
              <div>
                <h3 className="font-bold text-slate-800">
                  1. Account Registration
                </h3>

                <p className="mt-1">
                  Users must provide accurate and complete information when creating a CERMS account. Users are responsible for keeping their account credentials secure and must not allow another person to use their account.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  2. Proper Use of CERMS
                </h3>

                <p className="mt-1">
                  CERMS is intended for reporting and monitoring waste-related concerns within Barangay Tankulan. Users must use the system responsibly and only for its intended purpose.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  3. Waste Reports
                </h3>

                <p className="mt-1">
                  Reports submitted through CERMS must contain truthful and relevant information about waste-related concerns. False, misleading, inappropriate, or intentionally duplicated reports are not allowed.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  4. Photos and Location Information
                </h3>

                <p className="mt-1">
                  Users may submit photos and location information together with their waste reports. This information will be used to help authorized barangay personnel identify, locate, review, and respond to reported concerns.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  5. Personal Information
                </h3>

                <p className="mt-1">
                  CERMS collects information such as your name, username, email address, contact number, address, and information connected to your submitted reports. This information is used for account management, report processing, monitoring, and communication related to CERMS.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  6. User Conduct
                </h3>

                <p className="mt-1">
                  Users must not misuse CERMS, attempt unauthorized access, impersonate another person, submit harmful or offensive content, or intentionally interfere with the operation of the system.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  7. Account Restrictions
                </h3>

                <p className="mt-1">
                  Barangay administrators may restrict or suspend accounts that repeatedly misuse CERMS, submit false information, or violate these Terms and Conditions.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  8. Agreement
                </h3>

                <p className="mt-1">
                  By selecting "I Agree," you confirm that you have read, understood, and accepted these Terms and Conditions before accessing the CERMS resident dashboard.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={
                  handleDeclineTerms
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                I Don't Agree
              </button>

              <button
                type="button"
                onClick={
                  handleAgreeTerms
                }
                className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                I Agree
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              You must agree before continuing to the CERMS dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}