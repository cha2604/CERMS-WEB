import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getAccountStatus } from "../lib/authHelpers";

export default function ProtectedRoute() {
  const location = useLocation();

  const [loading, setLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [approvalStatus, setApprovalStatus] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setAuthenticated(false);
            setApprovalStatus(null);
            setLoading(false);
          }

          return;
        }

        const status =
          await getAccountStatus();

        if (!mounted) {
          return;
        }

        if (status.role === "admin") {
          setAuthenticated(false);
          setApprovalStatus("admin");
          setLoading(false);
          return;
        }

        setAuthenticated(true);
        setApprovalStatus(
          status.approvalStatus
        );
        setLoading(false);
      } catch (error) {
        console.error(
          "Failed to verify resident session:",
          error
        );

        if (mounted) {
          setAuthenticated(false);
          setApprovalStatus(null);
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Verifying your account...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    if (
      approvalStatus === "admin"
    ) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    if (
      approvalStatus ===
      "pending"
    ) {
      return (
        <Navigate
          to="/approval-pending"
          replace
        />
      );
    }

    if (
      approvalStatus ===
      "rejected"
    ) {
      return (
        <Navigate
          to="/approval-rejected"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (
    approvalStatus !==
    "approved"
  ) {
    if (
      approvalStatus ===
      "pending"
    ) {
      return (
        <Navigate
          to="/approval-pending"
          replace
        />
      );
    }

    if (
      approvalStatus ===
      "rejected"
    ) {
      return (
        <Navigate
          to="/approval-rejected"
          replace
        />
      );
    }
  }

  return <Outlet />;
}