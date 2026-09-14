import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface ArchivedProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  archived_at: string;
}

interface ArchivedReport {
  id: string;
  title: string;
  waste_type: string;
  location_name: string | null;
  status: "Resolved" | "Rejected";
  created_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

type ArchiveSection =
  | "reports"
  | "people";

type ReportArchiveFilter =
  | "resolved"
  | "rejected";

export default function Archive() {
  const navigate = useNavigate();

  const [
    activeSection,
    setActiveSection,
  ] = useState<ArchiveSection>(
    "reports"
  );

  const [
    reportFilter,
    setReportFilter,
  ] = useState<ReportArchiveFilter>(
    "resolved"
  );

  const [
    archivedReports,
    setArchivedReports,
  ] = useState<ArchivedReport[]>(
    []
  );

  const [
    archivedPeople,
    setArchivedPeople,
  ] = useState<ArchivedProfile[]>(
    []
  );

  const [
    loadingReports,
    setLoadingReports,
  ] = useState(true);

  const [
    loadingPeople,
    setLoadingPeople,
  ] = useState(true);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    fetchArchivedReports();
    fetchArchivedPeople();
  }, []);

  async function fetchArchivedReports() {
    try {
      setLoadingReports(true);

      const {
        data,
        error,
      } = await supabase
        .from("reports")
        .select(
          "id, title, waste_type, location_name, status, created_at, profiles(full_name)"
        )
        .in("status", [
          "Resolved",
          "Rejected",
        ])
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setArchivedReports(
        (data as ArchivedReport[]) ||
          []
      );
    } catch (error) {
      console.error(
        "Error fetching archived reports:",
        error
      );
    } finally {
      setLoadingReports(false);
    }
  }

  async function fetchArchivedPeople() {
    try {
      setLoadingPeople(true);

      const {
        data,
        error,
      } = await supabase
        .from("archived_profiles")
        .select("*")
        .order("archived_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setArchivedPeople(
        (data as ArchivedProfile[]) ||
          []
      );
    } catch (error) {
      console.error(
        "Error fetching archived people:",
        error
      );
    } finally {
      setLoadingPeople(false);
    }
  }

  async function handleRestoreReport(
    report: ArchivedReport
  ) {
    const confirmed =
      window.confirm(
        `Restore this ${
          report.waste_type ||
          report.title ||
          "waste report"
        } to active Reports?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("reports")
        .update({
          status: "Pending",
        })
        .eq("id", report.id);

      if (error) {
        throw error;
      }

      await fetchArchivedReports();

      alert(
        "Report has been restored to active Reports."
      );
    } catch (error) {
      console.error(
        "Error restoring report:",
        error
      );

      alert(
        "Failed to restore report."
      );
    }
  }

  async function handleRestorePerson(
    person: ArchivedProfile
  ) {
    const confirmed =
      window.confirm(
        `Restore ${
          person.full_name ||
          "this resident"
        } to Manage People?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("archived_profiles")
        .delete()
        .eq("id", person.id);

      if (error) {
        throw error;
      }

      await fetchArchivedPeople();

      alert(
        `${
          person.full_name ||
          "Resident"
        } has been restored.`
      );
    } catch (error) {
      console.error(
        "Error restoring person:",
        error
      );

      alert(
        "Failed to restore resident."
      );
    }
  }

  const filteredReports =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return archivedReports.filter(
        (report) => {
          if (
            report.status.toLowerCase() !==
            reportFilter
          ) {
            return false;
          }

          const wasteType =
            (
              report.waste_type ||
              report.title ||
              ""
            ).toLowerCase();

          const resident =
            (
              report.profiles
                ?.full_name ||
              ""
            ).toLowerCase();

          const location =
            (
              report.location_name ||
              ""
            ).toLowerCase();

          const id =
            report.id.toLowerCase();

          return (
            !query ||
            wasteType.includes(query) ||
            resident.includes(query) ||
            location.includes(query) ||
            id.includes(query)
          );
        }
      );
    }, [
      archivedReports,
      reportFilter,
      search,
    ]);

  const filteredPeople =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return archivedPeople.filter(
        (person) => {
          const name =
            (
              person.full_name ||
              ""
            ).toLowerCase();

          const id =
            person.id.toLowerCase();

          const role =
            (
              person.role ||
              ""
            ).toLowerCase();

          return (
            !query ||
            name.includes(query) ||
            id.includes(query) ||
            role.includes(query)
          );
        }
      );
    }, [
      archivedPeople,
      search,
    ]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/login");
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
            onClick={() =>
              navigate("/approval")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Approval
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            Archive
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Archive
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage archived waste reports and resident accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "reports"
                );
                setSearch("");
              }}
              className={`h-28 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                activeSection ===
                "reports"
                  ? "bg-emerald-800 border-emerald-800 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50"
              }`}
            >
              <span className="text-xl font-black tracking-wide">
                REPORTS
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "people"
                );
                setSearch("");
              }}
              className={`h-28 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                activeSection ===
                "people"
                  ? "bg-emerald-800 border-emerald-800 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50"
              }`}
            >
              <span className="text-xl font-black tracking-wide">
                PEOPLE
              </span>
            </button>
          </div>

          {activeSection ===
            "reports" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Archived Reports
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Resolved and rejected waste reports
                    </p>
                  </div>

                  <input
                    type="text"
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search archived reports..."
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setReportFilter(
                        "resolved"
                      )
                    }
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                      reportFilter ===
                      "resolved"
                        ? "bg-emerald-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Resolved
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReportFilter(
                        "rejected"
                      )
                    }
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                      reportFilter ===
                      "rejected"
                        ? "bg-rose-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Rejected
                  </button>
                </div>
              </div>

              <div className="p-6">
                {loadingReports ? (
                  <div className="py-12 text-center text-sm font-semibold text-slate-400">
                    Loading archived reports...
                  </div>
                ) : filteredReports.length ===
                  0 ? (
                  <div className="py-12 text-center text-sm font-semibold text-slate-400 border border-slate-200 rounded-xl">
                    No{" "}
                    {reportFilter}{" "}
                    reports found.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                          <th className="py-3 px-4">
                            Report
                          </th>

                          <th className="py-3 px-4">
                            Resident
                          </th>

                          <th className="py-3 px-4">
                            Waste Category
                          </th>

                          <th className="py-3 px-4">
                            Location
                          </th>

                          <th className="py-3 px-4">
                            Date
                          </th>

                          <th className="py-3 px-4 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredReports.map(
                          (
                            report
                          ) => (
                            <tr
                              key={
                                report.id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {report.waste_type ||
                                  report.title ||
                                  "Waste Report"}
                              </td>

                              <td className="py-3 px-4 text-slate-700">
                                {report
                                  .profiles
                                  ?.full_name ||
                                  "Anonymous Resident"}
                              </td>

                              <td className="py-3 px-4 text-slate-700">
                                {report.waste_type ||
                                  report.title ||
                                  "Uncategorized"}
                              </td>

                              <td className="py-3 px-4 text-slate-600 max-w-[240px]">
                                <span className="block truncate">
                                  {report.location_name ||
                                    "Barangay Tankulan"}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-slate-500">
                                {new Date(
                                  report.created_at
                                ).toLocaleDateString()}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/report/${report.id}`
                                      )
                                    }
                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    View
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRestoreReport(
                                        report
                                      )
                                    }
                                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                </div>
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
          )}

          {activeSection ===
            "people" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Archived People
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Resident accounts removed from Manage People
                  </p>
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search archived people..."
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="p-6">
                {loadingPeople ? (
                  <div className="py-12 text-center text-sm font-semibold text-slate-400">
                    Loading archived people...
                  </div>
                ) : filteredPeople.length ===
                  0 ? (
                  <div className="py-12 text-center text-sm font-semibold text-slate-400">
                    No archived people found.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                          <th className="py-3 px-4">
                            Full Name
                          </th>

                          <th className="py-3 px-4">
                            User ID
                          </th>

                          <th className="py-3 px-4">
                            Role
                          </th>

                          <th className="py-3 px-4">
                            Registered Date
                          </th>

                          <th className="py-3 px-4">
                            Archived Date
                          </th>

                          <th className="py-3 px-4 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredPeople.map(
                          (
                            person
                          ) => (
                            <tr
                              key={
                                person.id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {person.full_name ||
                                  "Unnamed Resident"}
                              </td>

                              <td className="py-3 px-4 font-mono text-slate-500">
                                {person.id.slice(
                                  0,
                                  8
                                )}
                                ...
                              </td>

                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                  {person.role ||
                                    "resident"}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-slate-500">
                                {new Date(
                                  person.created_at
                                ).toLocaleDateString()}
                              </td>

                              <td className="py-3 px-4 text-slate-500">
                                {new Date(
                                  person.archived_at
                                ).toLocaleDateString()}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRestorePerson(
                                      person
                                    )
                                  }
                                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Restore
                                </button>
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
          )}
        </div>
      </main>
    </div>
  );
}