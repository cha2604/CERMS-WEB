import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  loginWithGoogle,
  registerWithEmail,
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

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [area, setArea] =
    useState("");

  const [contactNumber, setContactNumber] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setErrorMessage("");

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanEmail =
      email.trim();

    const cleanContact =
      contactNumber.replace(/\D/g, "");

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

      navigate(
        "/approval-pending",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Registration failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
            Register as a Barangay Tankulan resident
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="mt-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              placeholder="Enter first name"
              icon={<FiUser size={16} />}
              value={firstName}
              onChange={(e) =>
                setFirstName(
                  e.target.value
                )
              }
              autoComplete="given-name"
              required
            />

            <Input
              label="Last Name"
              type="text"
              placeholder="Enter last name"
              icon={<FiUser size={16} />}
              value={lastName}
              onChange={(e) =>
                setLastName(
                  e.target.value
                )
              }
              autoComplete="family-name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Address
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiMapPin size={16} />
              </span>

              <select
                value={area}
                onChange={(e) =>
                  setArea(
                    e.target.value
                  )
                }
                required
                className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-200"
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
              {FIXED_ADDRESS_SUFFIX} will be added automatically.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contact Number
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiPhone size={16} />
              </span>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="09[0-9]{9}"
                maxLength={11}
                minLength={11}
                value={contactNumber}
                onChange={(e) => {
                  const numbersOnly =
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 11);

                  setContactNumber(
                    numbersOnly
                  );
                }}
                placeholder="09XXXXXXXXX"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-200"
              />
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Enter exactly 11 digits starting with 09.
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            icon={<FiMail size={16} />}
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            autoComplete="email"
            required
          />

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
            value={confirmPassword}
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
            disabled={loading}
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
              googleLoading
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
    </div>
  );
}