import {
  useEffect,
  useState,
} from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import {
  FiClipboard,
  FiClock,
  FiHome,
  FiLogOut,
  FiMenu,
  FiUser,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: FiHome,
  },
  {
    label: "My Assignments",
    path: "/assignments",
    icon: FiClipboard,
  },
  {
    label: "History",
    path: "/history",
    icon: FiClock,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: FiUser,
  },
];

export default function StaffLayout() {
  const navigate =
    useNavigate();

  const [
    drawerOpen,
    setDrawerOpen,
  ] = useState(false);

  const [
    staffName,
    setStaffName,
  ] = useState("Staff");

  const [teamName, setTeamName] =
    useState("");

  useEffect(() => {
    async function loadStaff() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } =
        await supabase
          .from("staff_profiles")
          .select(
            "full_name, team_name"
          )
          .eq("id", user.id)
          .single();

      if (data) {
        setStaffName(
          data.full_name ||
            "Staff"
        );

        setTeamName(
          data.team_name || ""
        );
      }
    }

    loadStaff();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-emerald-950 text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-xl font-black">
            CERMS
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            Staff Portal
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          {NAV_ITEMS.map(
            ({
              label,
              path,
              icon: Icon,
            }) => (
              <NavLink
                key={path}
                to={path}
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-white text-emerald-950"
                      : "text-emerald-100 hover:bg-white/10"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 rounded-xl bg-white/10 p-3">
            <p className="truncate text-xs font-black">
              {staffName}
            </p>

            <p className="mt-1 truncate text-[10px] font-semibold text-emerald-200">
              {teamName}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-200 hover:bg-white/10"
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:ml-64">
        <button
          type="button"
          onClick={() =>
            setDrawerOpen(true)
          }
          className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
        >
          <FiMenu size={20} />
        </button>

        <div>
          <p className="text-xs font-black text-slate-900">
            {staffName}
          </p>

          <p className="text-[10px] font-semibold text-slate-400">
            {teamName}
          </p>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setDrawerOpen(false)
            }
          />

          <aside className="relative h-full w-72 bg-emerald-950 p-5 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-black">
                  CERMS
                </p>

                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Staff Portal
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="rounded-lg bg-white/10 p-2"
              >
                <FiX />
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {NAV_ITEMS.map(
                ({
                  label,
                  path,
                  icon: Icon,
                }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() =>
                      setDrawerOpen(
                        false
                      )
                    }
                    className={({
                      isActive,
                    }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
                        isActive
                          ? "bg-white text-emerald-950"
                          : "text-emerald-100"
                      }`
                    }
                  >
                    <Icon />
                    {label}
                  </NavLink>
                )
              )}
            </nav>
          </aside>
        </div>
      )}

      <main className="p-5 lg:ml-64 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}