import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface ReportRecord {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string;
  image_urls?: string[];
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  severity?: string;
  created_at: string;
  reporter_name?: string;
  profiles?: {
    full_name?: string;
  } | null;
}

type MainView = "Overview" | "Reports";
type StatusFilter = "All" | "Pending" | "Ongoing" | "Rejected";

export default function AdminReports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>("Overview");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportTimeframe, setReportTimeframe] = useState<
    "today" | "monthly" | "yearly" | "resolved"
  >("monthly");

  const currentMonthStr = new Date().toLocaleString("en-US", {
    month: "short",
  });

  const currentYearStr = new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("reports")
          .select("*, profiles(full_name)")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          setReports(data as ReportRecord[]);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const filteredOverviewReports = reports.filter((report) => {
    if (report.status === "Resolved") {
      return false;
    }

    if (statusFilter === "All") {
      return true;
    }

    if (statusFilter === "Ongoing") {
      return (
        report.status === "Ongoing" ||
        report.status === "On-going"
      );
    }

    return report.status === statusFilter;
  });

  const filteredReports = reports.filter((report) => {
    const query = searchQuery.trim().toLowerCase();

    const reporter = (
      report.reporter_name ||
      report.profiles?.full_name ||
      ""
    ).toLowerCase();

    const location = (
      report.location_name ||
      "Barangay Tankulan, Manolo Fortich"
    ).toLowerCase();

    const titleOrType = (
      report.waste_type ||
      report.title ||
      ""
    ).toLowerCase();

    const id = report.id.toLowerCase();

    const matchesQuery =
      !query ||
      id.includes(query) ||
      titleOrType.includes(query) ||
      reporter.includes(query) ||
      location.includes(query);

    if (!matchesQuery) {
      return false;
    }

    const reportDate = new Date(report.created_at);

    if (reportTimeframe === "today") {
      const today = new Date();

      return (
        reportDate.getDate() === today.getDate() &&
        reportDate.getMonth() === today.getMonth() &&
        reportDate.getFullYear() === today.getFullYear()
      );
    }

    if (reportTimeframe === "monthly") {
      const monthMap: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const targetMonth = monthMap[selectedMonth];

      return (
        targetMonth !== undefined &&
        reportDate.getMonth() === targetMonth &&
        reportDate.getFullYear() === Number(selectedYear)
      );
    }

    if (reportTimeframe === "yearly") {
      return reportDate.getFullYear() === Number(selectedYear);
    }

    if (reportTimeframe === "resolved") {
      return report.status === "Resolved";
    }

    return true;
  });

  const totalReports = reports.length;

  const pendingCount = reports.filter(
    (report) => report.status === "Pending"
  ).length;

  const ongoingCount = reports.filter(
    (report) =>
      report.status === "Ongoing" ||
      report.status === "On-going"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const rejectedCount = reports.filter(
    (report) => report.status === "Rejected"
  ).length;

  const getEmptyMessage = () => {
    if (searchQuery) {
      return "No reports matching your search query.";
    }

    if (reportTimeframe === "today") {
      return "No reports submitted today.";
    }

    if (reportTimeframe === "monthly") {
      return `No reports for ${selectedMonth} ${selectedYear} yet.`;
    }

    if (reportTimeframe === "yearly") {
      return `No reports recorded for ${selectedYear} yet.`;
    }

    if (reportTimeframe === "resolved") {
      return "No resolved reports found.";
    }

    return "No reports available.";
  };

  const getPrintPeriod = () => {
    if (reportTimeframe === "today") {
      return `Report Date: ${new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    if (reportTimeframe === "monthly") {
      const monthMap: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const targetMonth = monthMap[selectedMonth];

      if (targetMonth !== undefined) {
        return `Report Period: ${new Date(
          Number(selectedYear),
          targetMonth,
          1
        ).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}`;
      }
    }

    if (reportTimeframe === "yearly") {
      return `Report Year: ${selectedYear}`;
    }

    return "Report Type: Resolved Reports";
  };

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0 print:hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>

            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              Waste Monitoring
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/map")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm"
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            People
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Reports
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Barangay Tankulan Waste Management & Monitoring
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Total
                </p>

                <p className="text-lg font-black text-slate-900">
                  {totalReports}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
                <p className="text-[11px] font-bold uppercase text-amber-600">
                  Pending
                </p>

                <p className="text-lg font-black text-amber-700">
                  {pendingCount}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
                <p className="text-[11px] font-bold uppercase text-emerald-600">
                  Ongoing
                </p>

                <p className="text-lg font-black text-emerald-700">
                  {ongoingCount}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-center">
                <p className="text-[11px] font-bold uppercase text-blue-600">
                  Resolved
                </p>

                <p className="text-lg font-black text-blue-700">
                  {resolvedCount}
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-center">
                <p className="text-[11px] font-bold uppercase text-rose-600">
                  Rejected
                </p>

                <p className="text-lg font-black text-rose-700">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </header>

          <div className="flex gap-3 border-b border-slate-200 print:hidden">
            <button
              type="button"
              onClick={() => setMainView("Overview")}
              className={`rounded-t-xl px-8 py-4 text-sm font-black transition-all ${
                mainView === "Overview"
                  ? "border-b-4 border-emerald-700 bg-emerald-50 text-emerald-800"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => setMainView("Reports")}
              className={`rounded-t-xl px-8 py-4 text-sm font-black transition-all ${
                mainView === "Reports"
                  ? "border-b-4 border-emerald-700 bg-emerald-50 text-emerald-800"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Reports
            </button>
          </div>

          {mainView === "Overview" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    ["All", "Pending", "Ongoing", "Rejected"] as StatusFilter[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                        statusFilter === status
                          ? "bg-emerald-800 text-white"
                          : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="text-sm font-semibold text-slate-500">
                  Showing {filteredOverviewReports.length} report
                  {filteredOverviewReports.length !== 1 ? "s" : ""}
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-semibold text-slate-400">
                  Loading reports...
                </div>
              ) : filteredOverviewReports.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-semibold text-slate-400">
                  No reports found for this status.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredOverviewReports.map((report) => {
                    const image =
                      report.image_urls &&
                      report.image_urls.length > 0
                        ? report.image_urls[0]
                        : null;

                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() =>
                          navigate(`/admin/report/${report.id}`)
                        }
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={report.title}
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                            No Photo Attached
                          </div>
                        )}

                        <div className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="line-clamp-1 text-base font-black text-slate-900">
                                {report.waste_type ||
                                  report.title ||
                                  "Waste Report"}
                              </h3>

                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {report.reporter_name ||
                                  report.profiles?.full_name ||
                                  "Anonymous Resident"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(
                                report.status
                              )}`}
                            >
                              {report.status}
                            </span>
                          </div>

                          <div>
                            <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                              {report.description ||
                                "No description provided."}
                            </p>

                            <p className="mt-2 text-[11px] font-semibold text-slate-400">
                              {report.location_name ||
                                "Barangay Tankulan, Manolo Fortich"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-[11px] font-semibold text-slate-400">
                              {new Date(
                                report.created_at
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>

                            <span className="text-xs font-black text-emerald-700">
                              View Details →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Official Waste Reports
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Review and manage submitted waste concerns.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search reports..."
                      className="w-52 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />

                    <select
                      value={reportTimeframe}
                      onChange={(event) =>
                        setReportTimeframe(
                          event.target.value as
                            | "today"
                            | "monthly"
                            | "yearly"
                            | "resolved"
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="today">Today</option>
                      <option value="monthly">Monthly Report</option>
                      <option value="yearly">Yearly Report</option>
                      <option value="resolved">Resolved Reports</option>
                    </select>

                    {reportTimeframe === "monthly" && (
                      <select
                        value={selectedMonth}
                        onChange={(event) =>
                          setSelectedMonth(event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="Jan">January</option>
                        <option value="Feb">February</option>
                        <option value="Mar">March</option>
                        <option value="Apr">April</option>
                        <option value="May">May</option>
                        <option value="Jun">June</option>
                        <option value="Jul">July</option>
                        <option value="Aug">August</option>
                        <option value="Sep">September</option>
                        <option value="Oct">October</option>
                        <option value="Nov">November</option>
                        <option value="Dec">December</option>
                      </select>
                    )}

                    {(reportTimeframe === "monthly" ||
                      reportTimeframe === "yearly") && (
                      <select
                        value={selectedYear}
                        onChange={(event) =>
                          setSelectedYear(event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={handlePrintReport}
                      className="rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-900"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>

              <div
                id="print-area"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="print-header">
                  <h1 className="text-xl font-black text-emerald-900">
                    Official Waste Reports
                  </h1>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Barangay Tankulan Waste Management & Monitoring
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {getPrintPeriod()}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Generated on: {generatedDate}
                  </p>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-sm font-semibold text-slate-400">
                    Loading official waste reports...
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-16 text-center text-sm font-semibold text-slate-400">
                    {getEmptyMessage()}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead>
                        <tr className="bg-emerald-800 text-xs uppercase tracking-wide text-white">
                          <th className="px-4 py-4 text-center">
                            #
                          </th>

                          <th className="px-4 py-4">
                            Site Name / Location
                          </th>

                          <th className="px-4 py-4">
                            Reporter Resident
                          </th>

                          <th className="px-4 py-4">
                            Waste Category
                          </th>

                          <th className="px-4 py-4 text-center">
                            Status
                          </th>

                          <th className="px-4 py-4">
                            Time / Date
                          </th>

                          <th className="px-4 py-4 text-center screen-only">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredReports.map((report, index) => {
                          const reporterName =
                            report.reporter_name ||
                            report.profiles?.full_name ||
                            "Anonymous Resident";

                          const createdDate = new Date(
                            report.created_at
                          );

                          const formattedDate =
                            createdDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }) +
                            " " +
                            createdDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });

                          return (
                            <tr
                              key={report.id}
                              className="transition-colors hover:bg-emerald-50/40"
                            >
                              <td className="px-4 py-4 text-center font-bold text-slate-500">
                                {index + 1}
                              </td>

                              <td className="px-4 py-4 font-bold text-slate-900">
                                {report.location_name ||
                                  "Barangay Tankulan, Manolo Fortich"}
                              </td>

                              <td className="px-4 py-4 font-medium text-slate-700">
                                {reporterName}
                              </td>

                              <td className="px-4 py-4 font-semibold text-slate-800">
                                {report.waste_type ||
                                  report.title ||
                                  "Uncategorized"}
                              </td>

                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(
                                    report.status
                                  )}`}
                                >
                                  {report.status}
                                </span>
                              </td>

                              <td className="px-4 py-4 font-mono text-xs text-slate-500">
                                {formattedDate}
                              </td>

                              <td className="px-4 py-4 text-center screen-only">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/admin/report/${report.id}`
                                    )
                                  }
                                  className="rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-900"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}