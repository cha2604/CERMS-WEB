import {
  useEffect,
  useState,
} from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function StaffProtectedRoute() {
  const [loading, setLoading] =
    useState(true);

  const [
    authorized,
    setAuthorized,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkStaff() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setAuthorized(false);
          }

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          profile?.role !== "staff"
        ) {
          await supabase.auth.signOut();

          if (mounted) {
            setAuthorized(false);
          }

          return;
        }

        const {
          data: staff,
          error: staffError,
        } = await supabase
          .from("staff_profiles")
          .select("account_status")
          .eq("id", user.id)
          .single();

        if (
          staffError ||
          staff?.account_status !==
            "Active"
        ) {
          await supabase.auth.signOut();

          if (mounted) {
            setAuthorized(false);
          }

          return;
        }

        if (mounted) {
          setAuthorized(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkStaff();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}