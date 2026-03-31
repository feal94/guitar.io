-- Update songs table
ALTER TABLE public.songs
ADD COLUMN IF NOT EXISTS bpm INTEGER,
ADD COLUMN IF NOT EXISTS song_url TEXT,
ADD COLUMN IF NOT EXISTS tab_path TEXT;

-- Create storage bucket for song tabs
INSERT INTO storage.buckets (id, name, public)
VALUES ('song_tabs', 'song_tabs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for song_tabs bucket
DROP POLICY IF EXISTS "Allow users to upload to their own folder in song_tabs" ON storage.objects;
CREATE POLICY "Allow users to upload to their own folder in song_tabs"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'song_tabs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to view their own files in song_tabs" ON storage.objects;
CREATE POLICY "Allow users to view their own files in song_tabs"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'song_tabs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to delete their own files in song_tabs" ON storage.objects;
CREATE POLICY "Allow users to delete their own files in song_tabs"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'song_tabs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
