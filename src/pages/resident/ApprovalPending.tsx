import { useNavigate } from "react-router-dom";
import { FiClock } from "react-icons/fi";
import { supabase } from "../../lib/supabase";

export default function ApprovalPending() {
  const navigate = useNavigate();

  const handleLogout =
    async () => {
      await supabase.auth.signOut();
      navigate("/login", {
        replace: true,
      });
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-7 shadow-xl text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <FiClock size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-900">
          Account Approval Pending
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your CERMS resident account has been
          successfully registered and is currently
          waiting for barangay administrator approval.
        </p>

        <p className="mt-3 text-xs font-semibold text-slate-400">
          You will be able to access the resident
          dashboard once your registration is approved.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white transition hover:bg-slate-900"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}