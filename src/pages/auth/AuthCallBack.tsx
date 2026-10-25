import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  const [
    message,
    setMessage,
  ] = useState(
    "Completing your Google sign-in..."
  );

  const [
    failed,
    setFailed,
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

    async function handleCallback() {
      try {
        setFailed(false);

        const user =
          await waitForSession();

        if (!user) {
          throw new Error(
            "Google sign-in session could not be found."
          );
        }

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
            user.id
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

          throw new Error(
            "Admin accounts cannot log in through the resident portal."
          );
        }

        if (!active) {
          return;
        }

        const hasUsername =
          Boolean(
            profile?.username
              ?.trim()
          );

        const hasContact =
          Boolean(
            profile?.contact_number
              ?.trim()
          );

        const hasAddress =
          Boolean(
            profile?.address
              ?.trim()
          );

        const completed =
          profile
            ?.profile_completed ===
            true &&
          profile
            ?.terms_accepted ===
            true &&
          hasUsername &&
          hasContact &&
          hasAddress;

        if (completed) {
          navigate(
            "/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        navigate(
          "/complete-profile",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Google callback failed:",
          error
        );

        if (!active) {
          return;
        }

        setFailed(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Google sign-in failed. Please try again."
        );
      }
    }

    void handleCallback();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white p-8 text-center shadow-xl">
        {!failed && (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
          </div>
        )}

        <h1 className="mt-5 text-xl font-bold text-green-800">
          CERMS
        </h1>

        <h2 className="mt-2 text-lg font-semibold text-slate-800">
          Google Sign-In
        </h2>

        <p
          className={`mt-3 text-sm ${
            failed
              ? "text-red-600"
              : "text-slate-500"
          }`}
        >
          {message}
        </p>

        {failed && (
          <button
            type="button"
            onClick={() =>
              navigate(
                "/login",
                {
                  replace: true,
                }
              )
            }
            className="mt-6 w-full rounded-xl bg-green-700 py-3 font-semibold text-white hover:bg-green-800"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}