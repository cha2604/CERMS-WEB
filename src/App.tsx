import { useEffect } from "react";
import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";
import StaffAppRouter from "./routes/StaffApprouter";
import { PreferencesProvider } from "./context/PreferencesContext";

function normalizeDomain(value: string | undefined, fallback: string) {
  return (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

const ADMIN_DOMAIN = normalizeDomain(
  import.meta.env.VITE_ADMIN_DOMAIN,
  "admin.localhost"
);

const USER_DOMAIN = normalizeDomain(
  import.meta.env.VITE_USER_DOMAIN,
  "user.localhost"
);

const STAFF_DOMAIN = normalizeDomain(
  import.meta.env.VITE_STAFF_DOMAIN,
  "staff.localhost"
);

function RedirectToUserDomain() {
  useEffect(() => {
    const port = window.location.port
      ? `:${window.location.port}`
      : "";

    window.location.replace(
      `${window.location.protocol}//${USER_DOMAIN}${port}/login`
    );
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
        Redirecting to the resident portal...
      </p>
    </div>
  );
}

export default function App() {
  const hostname = window.location.hostname.trim().toLowerCase();

  return (
    <PreferencesProvider>
      {hostname === ADMIN_DOMAIN ? (
        <AdminAppRouter />
      ) : hostname === STAFF_DOMAIN ? (
        <StaffAppRouter />
      ) : hostname === USER_DOMAIN ? (
        <UserAppRouter />
      ) : hostname === "localhost" ? (
        <RedirectToUserDomain />
      ) : (
        <UserAppRouter />
      )}
    </PreferencesProvider>
  );
}