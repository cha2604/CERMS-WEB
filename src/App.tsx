
import { useEffect } from "react";
import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";
import StaffAppRouter from "./routes/StaffApprouter";

function normalizeDomain(
  value: string | undefined,
  fallback: string
) {
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
    window.location.replace(
      `http://${USER_DOMAIN}:5173/login`
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm font-semibold text-slate-500">
        Redirecting to the resident portal...
      </p>
    </div>
  );
}

export default function App() {
  const hostname = window.location.hostname
    .trim()
    .toLowerCase();

  if (hostname === ADMIN_DOMAIN) {
    return <AdminAppRouter />;
  }

  if (hostname === STAFF_DOMAIN) {
    return <StaffAppRouter />;
  }

  if (hostname === USER_DOMAIN) {
    return <UserAppRouter />;
  }

  if (hostname === "localhost") {
    return <RedirectToUserDomain />;
  }

  return <UserAppRouter />;
}
