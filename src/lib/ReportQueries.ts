import { supabase } from "./supabase";
import { extractExif } from "./ExifHelper";

export interface NewReportInput {
  userId: string;
  category: string;
  description: string;
  contactNumber: string;
  latitude: number | null;
  longitude: number | null;
  photos: File[];
}

export async function submitReport(input: NewReportInput) {
  const { userId, category, description, contactNumber, latitude, longitude, photos } =
    input;

  if (photos.length > 5) {
    throw new Error("You can upload a maximum of 5 photos.");
  }

  const imageUrls: string[] = [];

  for (const photo of photos) {
    const fileExt = photo.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(filePath, photo);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("report-photos")
      .getPublicUrl(filePath);

    imageUrls.push(publicUrlData.publicUrl);
  }

  let exifData = null;

  if (photos.length > 0) {
    exifData = await extractExif(photos[0]);
  }

  const title = `${category} Report`;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      title,
      description,
      category,
      contact_number: contactNumber,
      latitude,
      longitude,
      image_urls: imageUrls,
      status: "Pending",
      severity: null,
      exif_data: exifData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}