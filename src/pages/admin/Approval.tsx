import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface ApprovalRecord {
  user_id: string;
  status:
    | "pending"
    | "approved"
    | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  full_name: string;
  email: string;
  address: string | null;
  contact_number: string | null;
}

type ApprovalTab =
  | "pending"
  | "approved"
  | "rejected"
  | "all";

export default function Approval() {
  const navigate = useNavigate();

  const [
    approvals,
    setApprovals,
  ] = useState<
    ApprovalRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<string | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState<ApprovalTab>(
    "pending"
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const fetchApprovals =
    async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: approvalData,
          error: approvalError,
        } = await supabase
          .from(
            "resident_approvals"
          )
          .select(
            "user_id, status, reviewed_by, reviewed_at, created_at"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (approvalError) {
          throw approvalError;
        }

        if (
          !approvalData ||
          approvalData.length ===
            0
        ) {
          setApprovals(
            []
          );
          return;
        }

        const userIds =
          approvalData.map(
            (approval) =>
              approval.user_id
          );

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, address, contact_number"
          )
          .in(
            "id",
            userIds
          );

        if (profileError) {
          throw profileError;
        }

        const profilesById =
          new Map(
            (
              profileData ||
              []
            ).map(
              (profile) => [
                profile.id,
                profile,
              ]
            )
          );

        const combinedData: ApprovalRecord[] =
          approvalData.map(
            (approval) => {
              const profile =
                profilesById.get(
                  approval.user_id
                );

              return {
                user_id:
                  approval.user_id,

                status:
                  approval.status,

                reviewed_by:
                  approval.reviewed_by,

                reviewed_at:
                  approval.reviewed_at,

                created_at:
                  approval.created_at,

                full_name:
                  profile?.full_name ||
                  "Unknown Resident",

                email:
                  profile?.email ||
                  "No email",

                address:
                  profile?.address ||
                  null,

                contact_number:
                  profile?.contact_number ||
                  null,
              };
            }
          );

        setApprovals(
          combinedData
        );
      } catch (error) {
        console.error(
          "Failed to load approval requests:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load approval requests."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApproval =
    async (
      userId: string,
      status:
        | "approved"
        | "rejected"
    ) => {
      setActionLoading(
        userId
      );

      setErrorMessage("");
      setSuccessMessage("");

      try {
        const {
          data: {
            user: adminUser,
          },
        } =
          await supabase.auth.getUser();

        if (!adminUser) {
          throw new Error(
            "Your admin session could not be verified."
          );
        }

        const { error } =
          await supabase
            .from(
              "resident_approvals"
            )
            .update({
              status,
              reviewed_by:
                adminUser.id,
              reviewed_at:
                new Date().toISOString(),
            })
            .eq(
              "user_id",
              userId
            );

        if (error) {
          throw error;
        }

        setApprovals(
          (current) =>
            current.map(
              (approval) =>
                approval.user_id ===
                userId
                  ? {
                      ...approval,
                      status,
                      reviewed_by:
                        adminUser.id,
                      reviewed_at:
                        new Date().toISOString(),
                    }
                  : approval
            )
        );

        setSuccessMessage(
          status ===
            "approved"
            ? "Resident account approved successfully."
            : "Resident registration rejected."
        );
      } catch (error) {
        console.error(
          "Failed to update approval:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to update approval request."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const filteredApprovals =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return approvals.filter(
        (approval) => {
          const matchesTab =
            activeTab ===
              "all" ||
            approval.status ===
              activeTab;

          if (!matchesTab) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          return (
            approval.full_name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            approval.email
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              approval.address ||
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              approval.contact_number ||
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              )
          );
        }
      );
    }, [
      approvals,
      activeTab,
      search,
    ]);

  const pendingCount =
    approvals.filter(
      (approval) =>
        approval.status ===
        "pending"
    ).length;

  const approvedCount =
    approvals.filter(
      (approval) =>
        approval.status ===
        "approved"
    ).length;

  const rejectedCount =
    approvals.filter(
      (approval) =>
        approval.status ===
        "rejected"
    ).length;

  const formatDate =
    (
      dateString: string
    ) => {
      return new Date(
        dateString
      ).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    };

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      navigate("/login", {
        replace: true,
      });
    };

  const getStatusClass =
    (
      status: ApprovalRecord["status"]
    ) => {
      if (
        status ===
        "approved"
      ) {
        return "bg-green-100 text-green-700 border-green-200";
      }

      if (
        status ===
        "rejected"
      ) {
        return "bg-red-100 text-red-700 border-red-200";
      }

      return "bg-amber-100 text-amber-700 border-amber-200";
    };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>

            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              WASTE MONITORING
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/map")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/reports")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/users")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            People
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm flex items-center justify-between"
          >
            <span>
              Approval
            </span>

            {pendingCount >
              0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                {
                  pendingCount
                }
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/archive")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Archive
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Resident Approval Requests
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Review resident registrations before they can access CERMS.
              </p>
            </div>

            <button
              type="button"
              onClick={
                fetchApprovals
              }
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-700">
                    Pending
                  </p>

                  <p className="mt-1 text-3xl font-black text-amber-900">
                    {
                      pendingCount
                    }
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <FiClock
                    size={20}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-green-700">
                    Approved
                  </p>

                  <p className="mt-1 text-3xl font-black text-green-900">
                    {
                      approvedCount
                    }
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <FiCheck
                    size={20}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-red-700">
                    Rejected
                  </p>

                  <p className="mt-1 text-3xl font-black text-red-900">
                    {
                      rejectedCount
                    }
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <FiX
                    size={20}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "pending"
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      activeTab ===
                      "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Pending
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "approved"
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      activeTab ===
                      "approved"
                        ? "bg-green-100 text-green-800"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Approved
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "rejected"
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      activeTab ===
                      "rejected"
                        ? "bg-red-100 text-red-800"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Rejected
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "all"
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      activeTab ===
                      "all"
                        ? "bg-slate-200 text-slate-800"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <FiSearch
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(
                      e
                    ) =>
                      setSearch(
                        e.target
                          .value
                      )
                    }
                    placeholder="Search resident..."
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            {successMessage && (
              <div className="mx-4 mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                {
                  successMessage
                }
              </div>
            )}

            {errorMessage && (
              <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {
                  errorMessage
                }
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center px-6 py-16">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                  <FiRefreshCw
                    size={18}
                    className="animate-spin"
                  />

                  Loading approval requests...
                </div>
              </div>
            ) : filteredApprovals.length ===
              0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiUsers
                    size={24}
                  />
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-800">
                  No approval requests found
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  There are no registration requests matching the current view.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                        Resident
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                        Contact
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                        Address
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                        Registered
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApprovals.map(
                      (
                        approval
                      ) => (
                        <tr
                          key={
                            approval.user_id
                          }
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {
                                  approval.full_name
                                }
                              </p>

                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {
                                  approval.email
                                }
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-700">
                              {
                                approval.contact_number ||
                                "Not provided"
                              }
                            </p>
                          </td>

                          <td className="max-w-[280px] px-5 py-4">
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {
                                approval.address ||
                                "No address provided"
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-700">
                              {formatDate(
                                approval.created_at
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black capitalize ${getStatusClass(
                                approval.status
                              )}`}
                            >
                              {
                                approval.status
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {approval.status ===
                            "pending" ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    approval.user_id
                                  }
                                  onClick={() =>
                                    handleApproval(
                                      approval.user_id,
                                      "approved"
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FiCheck
                                    size={
                                      14
                                    }
                                  />

                                  Approve
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    approval.user_id
                                  }
                                  onClick={() =>
                                    handleApproval(
                                      approval.user_id,
                                      "rejected"
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FiX
                                    size={
                                      14
                                    }
                                  />

                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-right text-xs font-semibold text-slate-400">
                                {approval.reviewed_at
                                  ? `Reviewed ${formatDate(
                                      approval.reviewed_at
                                    )}`
                                  : "No action"}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}