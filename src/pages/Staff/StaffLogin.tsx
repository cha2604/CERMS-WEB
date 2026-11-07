import {
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

export default function StaffLogin() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        data: profile,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const {
        data: staff,
      } = await supabase
        .from("staff_profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profile?.role === "staff" &&
        staff?.account_status ===
          "Active"
      ) {
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      }
    }

    checkSession();
  }, [navigate]);

  const handleLogin = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const {
        data,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password,
          }
        );

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error(
          "Unable to sign in."
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq(
          "id",
          data.user.id
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_profiles")
        .select(
          "account_status"
        )
        .eq(
          "id",
          data.user.id
        )
        .single();

      if (
        profile.role !== "staff"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "This account is not authorized for the staff portal."
        );
      }

      if (staffError) {
        await supabase.auth.signOut();

        throw staffError;
      }

      if (
        staff.account_status !==
        "Active"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "This staff account is inactive."
        );
      }

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 text-xl font-black text-white">
            C
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            CERMS Staff Portal
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Sign in using the account provided by the barangay administrator.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="mt-7 space-y-5"
        >
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Email
            </label>

            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="staff@email.com"
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Password
            </label>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? (
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-800 py-3.5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] font-semibold text-slate-400">
        <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
          New accounts: use your last name as the initial password.
        </p>
          Staff accounts can only be created by a CERMS administrator.
        </p>
      </div>
    </div>
  );
}