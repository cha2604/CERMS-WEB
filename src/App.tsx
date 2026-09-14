import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";

export default function App() {
  const hostname =
    window.location.hostname.toLowerCase();

  const isAdminDomain =
    hostname === "admin.localhost" ||
    hostname.startsWith("admin.");

  if (isAdminDomain) {
    return <AdminAppRouter />;
  }

  return <UserAppRouter />;
}