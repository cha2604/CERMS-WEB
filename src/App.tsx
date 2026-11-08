import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";
import StaffApprouter from "./routes/StaffApprouter";
import { PreferencesProvider } from "./context/PreferencesContext";

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

function App() {
  const currentHost = window.location.hostname
    .trim()
    .toLowerCase();

  let currentPortal;

  if (currentHost === ADMIN_DOMAIN) {
    currentPortal = <AdminAppRouter />;
  } else if (currentHost === STAFF_DOMAIN) {
    currentPortal = <StaffApprouter />;
  } else if (currentHost === USER_DOMAIN) {
    currentPortal = <UserAppRouter />;
  } else {
    currentPortal = <UserAppRouter />;
  }

  return (
    <PreferencesProvider>
      {currentPortal}
    </PreferencesProvider>
  );
}

export default App;