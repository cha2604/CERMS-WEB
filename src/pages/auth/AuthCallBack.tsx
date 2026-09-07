import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getAccountStatus } from "../../lib/authHelpers";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    async function finishLogin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await handleAuthenticatedUser(session.user.id);
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;

            if (
              event === "SIGNED_IN" ||
              event === "INITIAL_SESSION"
            ) {
              if (newSession?.user) {
                subscription.unsubscribe();
                await handleAuthenticatedUser(
                  newSession.user.id
                );
              }
            }
          }
        );

        timeoutId = window.setTimeout(() => {
          if (mounted) {
            subscription.unsubscribe();
            setErrorMessage(
              "Google sign-in could not be completed. Please try again."
            );
          }
        }, 10000);
      } catch (error) {
        console.error(
          "Google authentication failed:",
          error
        );

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Google sign-in failed."
          );
        }
      }
    }

    async function handleAuthenticatedUser(userId: string) {
      try {
        const { data: existingProfile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!existingProfile) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          const fullName =
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            "";

          const { error: insertError } =
            await supabase.from("profiles").insert({
              id: userId,
              full_name: fullName,
              email: user?.email || null,
              role: "resident",
            });

          if (insertError) {
            throw insertError;
          }
        }

        const status = await getAccountStatus();

        if (status.suspended) {
          await supabase.auth.signOut();

          if (mounted) {
            setErrorMessage(
              "Your account has been suspended. Please contact the barangay office."
            );
          }

          return;
        }

        if (mounted) {
          navigate(
            status.role === "admin"
              ? "/admin/dashboard"
              : "/dashboard",
            { replace: true }
          );
        }
      } catch (error) {
        console.error(
          "Failed to finish Google sign-in:",
          error
        );

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to complete Google sign-in."
          );
        }
      }
    }

    finishLogin();

    return () => {
      mounted = false;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [navigate]);

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-black text-slate-900">
            Google Sign-In Failed
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", { replace: true })
            }
            className="mt-6 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Completing Google sign in...
        </p>
      </div>
    </div>
  );
}