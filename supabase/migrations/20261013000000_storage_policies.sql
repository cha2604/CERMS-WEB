-- Storage policies for report-photos bucket
-- Run this in Supabase SQL Editor to fix photo upload RLS errors

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to report-photos bucket
CREATE POLICY "Allow authenticated uploads to report-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
);

-- Policy: Allow authenticated users to update their own uploads in report-photos
CREATE POLICY "Allow authenticated updates to report-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to delete their own uploads in report-photos
CREATE POLICY "Allow authenticated deletes from report-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow public read access to report-photos (for viewing uploaded photos)
CREATE POLICY "Allow public read access to report-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-photos');

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];