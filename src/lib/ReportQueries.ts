import { supabase } from "./supabase";

export interface NewReportInput {
  userId: string;
  category: string;
  description: string;
  contactNumber: string;
  latitude: number | null;
  longitude: number | null;
  photos: File[]; // up to 5
}

/**
 * Uploads photos to the `report-photos` storage bucket under
 * the user's own folder, then inserts the report row with the
 * resulting public URLs.
 */
export async function submitReport(input: NewReportInput) {
  const { userId, category, description, contactNumber, latitude, longitude, photos } =
    input;

  if (photos.length > 5) {
    throw new Error("You can upload a maximum of 5 photos.");
  }

  // 1. Upload each photo, collect public URLs
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

  // 2. Insert the report row
  // `title` is required by the schema but not shown in the
  // wireframe form, so we derive a simple one from the category.
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
      severity: null, // set later by admin or AI analysis
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}