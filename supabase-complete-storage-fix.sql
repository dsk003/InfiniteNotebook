-- Complete Storage Policies Fix for InfiniteNotebook
-- This creates all necessary policies for both storage.buckets and storage.objects
-- Run this in your Supabase SQL Editor

-- ========================================
-- PART 1: BUCKET-LEVEL POLICIES
-- ========================================

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing bucket policies if they exist
DROP POLICY IF EXISTS "Users can view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can create buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Users can update buckets" ON storage.buckets;

-- Create bucket policies
CREATE POLICY "Users can view buckets" ON storage.buckets
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create buckets" ON storage.buckets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update buckets" ON storage.buckets
    FOR UPDATE USING (true);

-- ========================================
-- PART 2: OBJECT-LEVEL POLICIES  
-- ========================================

-- Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing object policies
DROP POLICY IF EXISTS "Users can upload media to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to notes.media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete notes.media files" ON storage.objects;

-- Create new object policies for the notes.media bucket
CREATE POLICY "Upload to notes.media bucket" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "View notes.media files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Update notes.media files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Delete notes.media files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ========================================
-- PART 3: VERIFICATION QUERIES
-- ========================================

-- Check bucket policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'buckets';

-- Check object policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
AND policyname LIKE '%notes.media%';

-- Test bucket access (should return your bucket)
SELECT name, id, public FROM storage.buckets WHERE name = 'notes.media';
