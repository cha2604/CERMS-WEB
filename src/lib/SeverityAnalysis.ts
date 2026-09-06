const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const ROBOFLOW_PROJECT = import.meta.env.VITE_ROBOFLOW_PROJECT;
const ROBOFLOW_VERSION = import.meta.env.VITE_ROBOFLOW_VERSION;

export type ReportSeverity = "Very Low" | "Low" | "Moderate" | "High" | "Critical";

interface RoboflowPoint {
  x: number;
  y: number;
}

interface RoboflowPrediction {
  points?: RoboflowPoint[];
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  image: { width: number; height: number };
  predictions: RoboflowPrediction[];
}

export interface SeverityResult {
  severity: ReportSeverity;
  coveragePercent: number;
  detectionCount: number;
}

function polygonArea(points: RoboflowPoint[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function coverageToSeverity(percent: number): ReportSeverity {
  if (percent >= 50) return "Critical";
  if (percent >= 30) return "High";
  if (percent >= 15) return "Moderate";
  if (percent >= 5) return "Low";
  return "Very Low";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeWasteSeverity(
  photo: File
): Promise<SeverityResult | null> {
  if (!ROBOFLOW_API_KEY || !ROBOFLOW_PROJECT || !ROBOFLOW_VERSION) {
    console.error("Roboflow environment variables are not configured.");
    return null;
  }

  try {
    const base64Image = await fileToBase64(photo);

    const response = await fetch(
      `https://serverless.roboflow.com/${ROBOFLOW_PROJECT}/${ROBOFLOW_VERSION}?api_key=${ROBOFLOW_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64Image,
      }
    );

    if (!response.ok) {
      console.error("Roboflow request failed:", response.status);
      return null;
    }

    const data: RoboflowResponse = await response.json();

    const totalImageArea = data.image.width * data.image.height;
    let wasteArea = 0;

    for (const prediction of data.predictions) {
      if (prediction.points && prediction.points.length >= 3) {
        wasteArea += polygonArea(prediction.points);
      }
    }

    const coveragePercent = totalImageArea > 0
      ? (wasteArea / totalImageArea) * 100
      : 0;

    return {
      severity: coverageToSeverity(coveragePercent),
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      detectionCount: data.predictions.length,
    };
  } catch (error) {
    console.error("Waste severity analysis failed:", error);
    return null;
  }
}