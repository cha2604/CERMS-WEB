import { supabase } from "./supabase";

export const TANKULAN_AREAS = [
  "CENTRO",
  "TUMAMPONG",
  "ST. JOSEPH",
  "MULBERRY",
  "MANGIMA",
  "LOWER KALANAWAN",
  "UPPER KALANAWAN",
  "PROPER KALANAWAN",
  "UPPER POL-OTON",
  "LOWER POL-OTON",
  "KIHARE",
  "LOWER SOSOHON",
  "UPPER SOSOHON",
] as const;

export interface AreaWithCount {
  id: string;
  name: string;
  color: string;
  reportCount: number;
}

const AREA_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f97316",
  "#eab308",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
  "#06b6d4",
  "#6366f1",
  "#84cc16",
  "#a855f7",
  "#ef4444",
];

function normalizeText(
  value: string
) {
  return value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function getAreaBreakdown(): Promise<
  AreaWithCount[]
> {
  let reports: {
    location_name:
      | string
      | null;
  }[] = [];

  try {
    const {
      data,
      error,
    } = await supabase
      .from("reports")
      .select("location_name");

    if (!error && data) {
      reports = data;
    }
  } catch (error) {
    console.error(
      "Failed fetching report locations:",
      error
    );
  }

  const normalizedAreas =
    TANKULAN_AREAS.map(
      (name, index) => ({
        id: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(
            /(^-|-$)/g,
            ""
          ),
        name,
        color:
          AREA_COLORS[index],
        reportCount: 0,
      })
    );

  for (const report of reports) {
    if (!report.location_name) {
      continue;
    }

    const location =
      normalizeText(
        report.location_name
      );

    const matchedArea =
      normalizedAreas.find(
        (area) =>
          location.includes(
            normalizeText(
              area.name
            )
          )
      );

    if (matchedArea) {
      matchedArea.reportCount += 1;
    }
  }

  return normalizedAreas;
}

export interface MonthlyCount {
  month: string;
  count: number;
}

export async function getMonthlyReportTrends(): Promise<
  MonthlyCount[]
> {
  const currentYear =
    new Date().getFullYear();

  const startOfYear =
    new Date(
      currentYear,
      0,
      1
    ).toISOString();

  let data: {
    created_at: string;
  }[] = [];

  try {
    const {
      data: result,
      error,
    } = await supabase
      .from("reports")
      .select("created_at")
      .gte(
        "created_at",
        startOfYear
      );

    if (!error && result) {
      data = result;
    }
  } catch (error) {
    console.error(
      "Failed fetching monthly trends:",
      error
    );
  }

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const counts =
    new Array(12).fill(0);

  for (const row of data) {
    const month =
      new Date(
        row.created_at
      ).getMonth();

    counts[month] += 1;
  }

  return monthLabels.map(
    (month, index) => ({
      month,
      count: counts[index],
    })
  );
}