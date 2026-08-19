import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserRole } from "../../lib/authHelpers";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function redirect() {
      try {
        const role = await getCurrentUserRole();
        if (!isMounted) return;

        if (role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback failed:", err);
        navigate("/login", { replace: true });
      }
    }

    redirect();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 text-sm text-gray-500">
      Signing you in...
    </div>
  );
}