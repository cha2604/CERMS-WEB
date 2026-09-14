import { useNavigate } from "react-router-dom";
import { FiXCircle } from "react-icons/fi";
import { supabase } from "../../lib/supabase";

export default function ApprovalRejected() {
  const navigate = useNavigate();

  const handleLogout =
    async () => {
      await supabase.auth.signOut();
      navigate("/login", {
        replace: true,
      });
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl bg-white border border-red-200 p-7 shadow-xl text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
          <FiXCircle size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-900">
          Registration Not Approved
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your resident registration was not approved
          by the barangay administrator.
        </p>

        <p className="mt-3 text-xs font-semibold text-slate-400">
          Please contact the barangay office if you
          believe this was done in error.
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