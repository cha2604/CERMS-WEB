import {
  useEffect,
  useState,
} from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { supabase } from "../lib/supabase";

type AccessState =
  | "loading"
  | "login"
  | "complete-profile"
  | "allowed";

export default function ProtectedRoute() {
  const [
    accessState,
    setAccessState,
  ] = useState<AccessState>(
    "loading"
  );

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        if (active) {
          setAccessState(
            "loading"
          );
        }

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          if (active) {
            setAccessState(
              "login"
            );
          }

          return;
        }

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (active) {
            setAccessState(
              "login"
            );
          }

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "role, profile_completed, terms_accepted"
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

          if (active) {
            setAccessState(
              "login"
            );
          }

          return;
        }

        if (!profile) {
          if (active) {
            setAccessState(
              "complete-profile"
            );
          }

          return;
        }

        const complete =
          profile.profile_completed ===
            true &&
          profile.terms_accepted ===
            true;

        if (!complete) {
          if (active) {
            setAccessState(
              "complete-profile"
            );
          }

          return;
        }

        if (active) {
          setAccessState(
            "allowed"
          );
        }
      } catch (error) {
        console.error(
          "Route protection failed:",
          error
        );

        if (active) {
          setAccessState(
            "login"
          );
        }
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, []);

  if (
    accessState ===
    "loading"
  ) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-700" />

          <p className="mt-4 text-sm text-slate-500">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  if (
    accessState ===
    "login"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    accessState ===
    "complete-profile"
  ) {
    return (
      <Navigate
        to="/complete-profile"
        replace
      />
    );
  }

  return <Outlet />;
}