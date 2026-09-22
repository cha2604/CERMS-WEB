import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Layout from "../pages/admin/Layout";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminReports from "../pages/admin/Reports";
import AdminMap from "../pages/admin/Map";
import AdminReportDetails from "../pages/admin/ReportDetails";
import Users from "../pages/admin/Users";
import Approval from "../pages/admin/Approval";
import Archive from "../pages/admin/Archive";
import WasteWeighing from "../pages/admin/WasteWeighing";
import { supabase } from "../lib/supabase";

function AdminProtectedRoute() {
  const location = useLocation();

  const [checking, setChecking] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdminSession() {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setAuthorized(false);
            setChecking(false);
          }

          return;
        }

        const {
          data: profile,
          error,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        setAuthorized(
          profile?.role === "admin"
        );

        setChecking(false);
      } catch (error) {
        console.error(
          "Failed to verify admin session:",
          error
        );

        if (mounted) {
          setAuthorized(false);
          setChecking(false);
        }
      }
    }

    checkAdminSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          checkAdminSession();
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">
          Verifying admin session...
        </div>
      </div>
    );
  }

  if (!authorized) {
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

  return <Outlet />;
}

export default function AdminAppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<AdminLogin />}
      />

      <Route element={<AdminProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/map"
            element={<AdminMap />}
          />

          <Route
            path="/reports"
            element={<AdminReports />}
          />

          <Route
            path="/users"
            element={<Users />}
          />

          <Route
            path="/approval"
            element={<Approval />}
          />

          <Route
            path="/waste-weighing"
            element={<WasteWeighing />}
          />

          <Route
            path="/archive"
            element={<Archive />}
          />

          <Route
            path="/report/:id"
            element={<AdminReportDetails />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}