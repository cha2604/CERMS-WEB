import { useEffect } from "react";
import UserAppRouter from "./routes/ResidentAppRouter";
import AdminAppRouter from "./routes/AdminAppRouter";

function RedirectToUserDomain() {
  useEffect(() => {
    window.location.replace(
      "http://user.localhost:5173/login"
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
  const hostname =
    window.location.hostname.toLowerCase();

  if (hostname === "admin.localhost") {
    return <AdminAppRouter />;
  }

  if (hostname === "user.localhost") {
    return <UserAppRouter />;
  }

  if (hostname === "localhost") {
    return <RedirectToUserDomain />;
  }

  return <UserAppRouter />;
}