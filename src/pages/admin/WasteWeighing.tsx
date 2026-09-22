import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiBarChart2,
  FiCheck,
  FiFileText,
  FiLogOut,
  FiMapPin,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

type PeriodFilter =
  | "all"
  | "today"
  | "month"
  | "year"
  | "custom";

interface WasteCategoryRecord {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface WasteWeightRecord {
  id: string;
  waste_category: string;
  weight_kg: number;
  recorded_at: string;
  remarks: string | null;
}

const DEFAULT_CATEGORIES = [
  "Biodegradable / Compostable",
  "Recyclable",
  "Residual",
  "Special Waste",
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatKg(value: number) {
  return `${value.toFixed(2)} kg`;
}

function isSameDay(value: string, date: Date) {
  const target = new Date(value);

  return (
    target.getFullYear() === date.getFullYear() &&
    target.getMonth() === date.getMonth() &&
    target.getDate() === date.getDate()
  );
}

export default function WasteWeighing() {
  const navigate = useNavigate();

  const [categories, setCategories] =
    useState<WasteCategoryRecord[]>([]);

  const [records, setRecords] =
    useState<WasteWeightRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [categorySaving, setCategorySaving] =
    useState(false);

  const [categoryActionId, setCategoryActionId] =
    useState<string | null>(null);

  const [showCategoryManager, setShowCategoryManager] =
    useState(false);

  const [newCategoryName, setNewCategoryName] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>("all");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [customDate, setCustomDate] =
    useState("");

  const [weights, setWeights] =
    useState<Record<string, string>>({});

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.is_active
      ),
    [categories]
  );

  const allKnownCategories = useMemo(() => {
    const names = new Set<string>();

    categories.forEach((category) =>
      names.add(category.name)
    );

    records.forEach((record) =>
      names.add(record.waste_category)
    );

    DEFAULT_CATEGORIES.forEach((category) =>
      names.add(category)
    );

    return Array.from(names).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [categories, records]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("waste_categories")
      .select(
        "id, name, is_active, created_at"
      )
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const loadedCategories =
      (data as WasteCategoryRecord[]) || [];

    setCategories(loadedCategories);

    setWeights((current) => {
      const next = { ...current };

      loadedCategories
        .filter(
          (category) => category.is_active
        )
        .forEach((category) => {
          if (!(category.name in next)) {
            next[category.name] = "";
          }
        });

      return next;
    });
  };

  const loadRecords = async () => {
    const { data, error } =
      await supabase
        .from("waste_weights")
        .select(
          "id, waste_category, weight_kg, recorded_at, remarks"
        )
        .order("recorded_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    setRecords(
      (data as WasteWeightRecord[]) || []
    );
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([
        loadCategories(),
        loadRecords(),
      ]);
    } catch (error) {
      console.error(
        "Failed to load waste weighing data:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load waste weighing data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredRecords = useMemo(() => {
    const now = new Date();

    return records.filter((record) => {
      if (
        categoryFilter !== "All" &&
        record.waste_category !==
          categoryFilter
      ) {
        return false;
      }

      if (periodFilter === "all") {
        return true;
      }

      if (periodFilter === "today") {
        return isSameDay(
          record.recorded_at,
          now
        );
      }

      const recordDate =
        new Date(record.recorded_at);

      if (periodFilter === "month") {
        return (
          recordDate.getFullYear() ===
            now.getFullYear() &&
          recordDate.getMonth() ===
            now.getMonth()
        );
      }

      if (periodFilter === "year") {
        return (
          recordDate.getFullYear() ===
          now.getFullYear()
        );
      }

      if (periodFilter === "custom") {
        if (!customDate) {
          return true;
        }

        return isSameDay(
          record.recorded_at,
          new Date(
            `${customDate}T00:00:00`
          )
        );
      }

      return true;
    });
  }, [
    records,
    periodFilter,
    categoryFilter,
    customDate,
  ]);

  const totals = useMemo(() => {
    return allKnownCategories.reduce<
      Record<string, number>
    >((result, category) => {
      result[category] =
        filteredRecords
          .filter(
            (record) =>
              record.waste_category ===
              category
          )
          .reduce(
            (sum, record) =>
              sum +
              Number(
                record.weight_kg || 0
              ),
            0
          );

      return result;
    }, {});
  }, [
    filteredRecords,
    allKnownCategories,
  ]);

  const totalWeight =
    Object.values(totals).reduce(
      (sum, value) => sum + value,
      0
    );

  const handleWeightChange = (
    category: string,
    value: string
  ) => {
    if (
      value === "" ||
      /^\d*(\.\d{0,2})?$/.test(
        value
      )
    ) {
      setWeights((current) => ({
        ...current,
        [category]: value,
      }));
    }
  };

  const handleRecordWeights = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (activeCategories.length === 0) {
      setErrorMessage(
        "Please add at least one active waste category."
      );
      return;
    }

    const invalidCategories =
      activeCategories.filter(
        (category) =>
          weights[category.name] ===
            "" ||
          !Number.isFinite(
            Number(
              weights[category.name]
            )
          ) ||
          Number(
            weights[category.name]
          ) < 0
      );

    if (invalidCategories.length > 0) {
      setErrorMessage(
        `Please enter a valid weight for: ${invalidCategories
          .map((category) => category.name)
          .join(", ")}.`
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Your admin session could not be verified."
        );
      }

      const rows =
        activeCategories.map(
          (category) => ({
            waste_category:
              category.name,
            weight_kg: Number(
              weights[category.name]
            ),
            recorded_by: user.id,
            recorded_at:
              new Date().toISOString(),
          })
        );

      const { error } =
        await supabase
          .from("waste_weights")
          .insert(rows);

      if (error) {
        throw error;
      }

      const resetWeights: Record<
        string,
        string
      > = {};

      activeCategories.forEach(
        (category) => {
          resetWeights[
            category.name
          ] = "";
        }
      );

      setWeights(resetWeights);

      setSuccessMessage(
        "Waste weighing record saved successfully."
      );

      await loadRecords();
    } catch (error) {
      console.error(
        "Failed to record waste weights:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record waste weights."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const cleanedName =
      newCategoryName.trim();

    if (!cleanedName) {
      setErrorMessage(
        "Please enter a waste category name."
      );
      return;
    }

    if (cleanedName.length > 80) {
      setErrorMessage(
        "Waste category name must be 80 characters or fewer."
      );
      return;
    }

    const duplicate =
      categories.some(
        (category) =>
          category.name.toLowerCase() ===
          cleanedName.toLowerCase()
      );

    if (duplicate) {
      setErrorMessage(
        "That waste category already exists."
      );
      return;
    }

    setCategorySaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Your admin session could not be verified."
        );
      }

      const { data, error } =
        await supabase
          .from("waste_categories")
          .insert({
            name: cleanedName,
            is_active: true,
            created_by: user.id,
          })
          .select(
            "id, name, is_active, created_at"
          )
          .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCategories((current) =>
          [
            ...current,
            data as WasteCategoryRecord,
          ].sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          )
        );

        setWeights((current) => ({
          ...current,
          [cleanedName]: "",
        }));
      }

      setNewCategoryName("");

      setSuccessMessage(
        `Added waste category: ${cleanedName}.`
      );
    } catch (error) {
      console.error(
        "Failed to add waste category:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to add waste category."
      );
    } finally {
      setCategorySaving(false);
    }
  };

  const handleToggleCategory = async (
    category: WasteCategoryRecord
  ) => {
    setCategoryActionId(
      category.id
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase
          .from("waste_categories")
          .update({
            is_active:
              !category.is_active,
          })
          .eq("id", category.id);

      if (error) {
        throw error;
      }

      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? {
                ...item,
                is_active:
                  !item.is_active,
              }
            : item
        )
      );

      setSuccessMessage(
        `${category.name} is now ${
          category.is_active
            ? "inactive"
            : "active"
        }.`
      );
    } catch (error) {
      console.error(
        "Failed to update waste category:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update waste category."
      );
    } finally {
      setCategoryActionId(null);
    }
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      !window.confirm(
        "Delete this waste weighing record?"
      )
    ) {
      return;
    }

    setDeletingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase
          .from("waste_weights")
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }

      setRecords((current) =>
        current.filter(
          (record) =>
            record.id !== id
        )
      );

      setSuccessMessage(
        "Waste weighing record deleted."
      );
    } catch (error) {
      console.error(
        "Failed to delete waste weighing record:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete waste weighing record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMessage("");
    setSuccessMessage("");

    await loadAll();

    setRefreshing(false);
  };

  const reportPeriodLabel =
    periodFilter === "today"
      ? "Today"
      : periodFilter === "month"
        ? "Current Month"
        : periodFilter === "year"
          ? "Current Year"
          : periodFilter ===
              "custom" &&
            customDate
            ? new Date(
                `${customDate}T00:00:00`
              ).toLocaleDateString(
                "en-US",
                {
                  month:
                    "long",
                  day: "numeric",
                  year: "numeric",
                }
              )
            : "All Recorded Periods";

  const handleLogout =
    async () => {
      await supabase.auth.signOut();
      navigate("/login");
    };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0 print:hidden">
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
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiBarChart2 size={16} />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/map")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiMapPin size={16} />
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/reports")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiFileText size={16} />
            Reports
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/users")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiUsers size={16} />
            Accounts
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/approval")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiCheck size={16} />
            Approval
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm flex items-center gap-3"
          >
            <FiBarChart2 size={16} />
            Waste Weighing
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/archive")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            <FiArchive size={16} />
            Archive
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <FiLogOut size={15} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-6 lg:p-8 print:ml-0 print:p-0 print:bg-white">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                CERMS Waste Management
              </p>

              <h1 className="text-2xl font-black text-slate-900 mt-1">
                Waste Weighing
              </h1>

              <p className="text-sm font-medium text-slate-500 mt-1">
                Record the actual measured waste after segregation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowCategoryManager(
                    (value) => !value
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FiSettings size={14} />
                Manage Categories
              </button>

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <FiRefreshCw size={14} />
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900"
              >
                <FiPrinter size={14} />
                Print
              </button>
            </div>
          </div>

          {showCategoryManager && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 print:hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Admin Settings
                  </p>

                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    Waste Categories
                  </h2>

                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Add categories when the barangay adopts additional segregation groups. Inactive categories stay in historical records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCategoryManager(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 grid grid-cols-[minmax(0,1fr)_100px_110px] gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span>
                      Category
                    </span>

                    <span>
                      Status
                    </span>

                    <span className="text-right">
                      Action
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {categories.map(
                      (category) => (
                        <div
                          key={
                            category.id
                          }
                          className="px-4 py-3 grid grid-cols-[minmax(0,1fr)_100px_110px] gap-3 items-center"
                        >
                          <span className="text-sm font-extrabold text-slate-900">
                            {category.name}
                          </span>

                          <span
                            className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-black ${
                              category.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {category.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCategory(
                                  category
                                )
                              }
                              disabled={
                                categoryActionId ===
                                category.id
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                              {categoryActionId ===
                              category.id
                                ? "Saving..."
                                : category.is_active
                                  ? "Deactivate"
                                  : (
                                    <>
                                      <FiCheck
                                        size={
                                          11
                                        }
                                      />
                                      Activate
                                    </>
                                  )}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Add New Category
                  </p>

                  <input
                    type="text"
                    value={
                      newCategoryName
                    }
                    onChange={(event) =>
                      setNewCategoryName(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Electronic Waste"
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    maxLength={80}
                  />

                  <button
                    type="button"
                    onClick={
                      handleAddCategory
                    }
                    disabled={
                      categorySaving
                    }
                    className="mt-3 w-full rounded-xl bg-emerald-800 py-3 text-xs font-black text-white hover:bg-emerald-900 disabled:opacity-50"
                  >
                    {categorySaving
                      ? "ADDING..."
                      : "ADD CATEGORY"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 print:hidden">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 print:hidden">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 print:hidden">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FiBarChart2 size={22} />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Record Waste Weight
                  </h2>

                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Enter the actual measured weight after segregation.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  handleRecordWeights
                }
                className="p-6 space-y-5"
              >
                {activeCategories.map(
                  (category) => (
                    <div
                      key={
                        category.id
                      }
                    >
                      <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                        {
                          category.name
                        }
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            weights[
                              category
                                .name
                            ] ||
                            ""
                          }
                          onChange={(event) =>
                            handleWeightChange(
                              category.name,
                              event.target.value
                            )
                          }
                          placeholder="Enter weight"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          kg
                        </span>
                      </div>
                    </div>
                  )
                )}

                {activeCategories.length ===
                  0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                    No active waste categories. Add or activate a category first.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    saving ||
                    activeCategories.length ===
                      0
                  }
                  className="w-full rounded-xl bg-emerald-800 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-900 disabled:opacity-50"
                >
                  {saving
                    ? "RECORDING..."
                    : "RECORD WASTE WEIGHT"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Waste Weight Summary
                    </h2>

                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Current filtered totals by waste category.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total
                    </p>

                    <p className="text-2xl font-black text-emerald-800">
                      {formatKg(
                        totalWeight
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {allKnownCategories.map(
                  (category) => (
                    <div
                      key={
                        category
                      }
                      className="p-5"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {category}
                      </p>

                      <p className="mt-2 text-xl font-black text-slate-900">
                        {formatKg(
                          totals[
                            category
                          ] || 0
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-6 py-5 border-b border-slate-100 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Waste Weighing Records
                  </h2>

                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    View and manage recorded weights.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={
                      periodFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setPeriodFilter(
                        event.target
                          .value as PeriodFilter
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="all">
                      All
                    </option>

                    <option value="today">
                      Today
                    </option>

                    <option value="month">
                      Current Month
                    </option>

                    <option value="year">
                      Current Year
                    </option>

                    <option value="custom">
                      Custom Date
                    </option>
                  </select>

                  {periodFilter ===
                    "custom" && (
                    <input
                      type="date"
                      value={
                        customDate
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomDate(
                          event.target
                            .value
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    />
                  )}

                  <select
                    value={
                      categoryFilter
                    }
                    onChange={(event) =>
                      setCategoryFilter(
                        event.target
                          .value
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="All">
                      All Categories
                    </option>

                    {allKnownCategories.map(
                      (category) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="hidden print:block text-center mb-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Barangay Tankulan
                </p>

                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Waste Weighing and Segregation Report
                </h2>

                <p className="text-xs font-bold text-slate-500 mt-1">
                  Reporting Period:{" "}
                  {
                    reportPeriodLabel
                  }
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-emerald-800 text-white text-xs font-black uppercase tracking-wide">
                      <th className="px-4 py-3">
                        Waste Category
                      </th>

                      <th className="px-4 py-3">
                        Weight
                      </th>

                      <th className="px-4 py-3">
                        Recorded Date
                      </th>

                      <th className="px-4 py-3 print:hidden">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredRecords.length >
                    0 ? (
                      filteredRecords.map(
                        (record) => (
                          <tr
                            key={
                              record.id
                            }
                          >
                            <td className="px-4 py-3 text-sm font-extrabold text-slate-900">
                              {
                                record.waste_category
                              }
                            </td>

                            <td className="px-4 py-3 text-sm font-black text-emerald-800">
                              {formatKg(
                                Number(
                                  record.weight_kg
                                )
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {formatDateTime(
                                record.recorded_at
                              )}
                            </td>

                            <td className="px-4 py-3 print:hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    record.id
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  record.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                <FiTrash2
                                  size={
                                    12
                                  }
                                />

                                {deletingId ===
                                record.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={
                            4
                          }
                          className="px-4 py-12 text-center text-sm font-semibold text-slate-400"
                        >
                          {loading
                            ? "Loading waste weighing records..."
                            : "No waste weighing records found."}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50 font-black">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        Total Waste
                      </td>

                      <td className="px-4 py-3 text-sm text-emerald-800">
                        {formatKg(
                          totalWeight
                        )}
                      </td>

                      <td className="px-4 py-3" />

                      <td className="px-4 py-3 print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="hidden print:grid grid-cols-2 gap-12 mt-14 text-sm">
                <div>
                  <div className="border-b border-slate-400 h-10" />
                  <p className="mt-2 font-bold text-slate-700">
                    Recorded By
                  </p>
                </div>

                <div>
                  <div className="border-b border-slate-400 h-10" />
                  <p className="mt-2 font-bold text-slate-700">
                    Verified By
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}