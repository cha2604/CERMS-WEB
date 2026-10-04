import { useEffect } from "react";
import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";

function normalizeDomain(value: string | undefined, fallback: string) {
  const domain = (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/\/.*$/, "");

  return domain;
}

const ADMIN_DOMAIN = normalizeDomain(
  import.meta.env.VITE_ADMIN_DOMAIN,
  "admin.localhost"
);

const USER_DOMAIN = normalizeDomain(
  import.meta.env.VITE_USER_DOMAIN,
  "user.localhost"
);

function domainMatches(hostname: string, target: string) {
  if (!target) return false;
  if (hostname === target) return true;
  if (hostname.endsWith(`.${target}`)) return true;

  const hostLabel = hostname.split(".")[0];
  const targetLabel = target.split(".")[0];

  return hostLabel.length > 0 && hostLabel.startsWith(targetLabel);
}

function RedirectToUserDomain() {
  useEffect(() => {
    window.location.replace(`http://${USER_DOMAIN}:5173/login`);
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
  const hostname = window.location.hostname.toLowerCase();

  if (domainMatches(hostname, ADMIN_DOMAIN)) {
    return <AdminAppRouter />;
  }

  if (domainMatches(hostname, USER_DOMAIN)) {
    return <UserAppRouter />;
  }

  if (hostname === "localhost") {
    return <RedirectToUserDomain />;
  }

  return <UserAppRouter />;
}