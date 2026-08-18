import exifr from "exifr";

export interface ExifData {
  dateTaken: string | null;
  device: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

export async function extractExif(file: File): Promise<ExifData | null> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      pick: [
        "DateTimeOriginal",
        "Make",
        "Model",
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
        "ExifImageWidth",
        "ExifImageHeight",
        "PixelXDimension",
        "PixelYDimension",
      ],
    });

    if (!data) return null;

    const device = [data.Make, data.Model].filter(Boolean).join(" ") || null;

    return {
      dateTaken: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal).toISOString()
        : null,
      device,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      altitude: typeof data.GPSAltitude === "number" ? data.GPSAltitude : null,
      imageWidth: data.ExifImageWidth ?? data.PixelXDimension ?? null,
      imageHeight: data.ExifImageHeight ?? data.PixelYDimension ?? null,
    };
  } catch (error) {
    console.error("EXIF extraction failed:", error);
    return null;
  }
}