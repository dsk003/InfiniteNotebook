-- Clean Storage Policies Fix for InfiniteNotebook
-- Copy and paste this exactly into your Supabase SQL Editor

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can create buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Users can update buckets" ON storage.buckets;

-- Create bucket policies with simple names
CREATE POLICY "view_buckets" ON storage.buckets FOR SELECT USING (true);
CREATE POLICY "create_buckets" ON storage.buckets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_buckets" ON storage.buckets FOR UPDATE USING (true);

-- Drop existing object policies
DROP POLICY IF EXISTS "Users can upload media to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Upload to notes.media bucket" ON storage.objects;
DROP POLICY IF EXISTS "View notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Update notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Delete notes.media files" ON storage.objects;

-- Create object policies for notes.media bucket
CREATE POLICY "upload_notes_media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "view_notes_media" ON storage.objects
FOR SELECT USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "update_notes_media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "delete_notes_media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
