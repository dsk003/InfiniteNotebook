-- Fix Storage RLS Policies for notes.media bucket
-- Run this in your Supabase SQL Editor

-- First, drop any existing policies for the old bucket name
DROP POLICY IF EXISTS "Users can upload media to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Create new storage policies for the correct bucket name: notes.media
-- Users can upload files to their own folder
CREATE POLICY "Users can upload to notes.media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view files in their own folder
CREATE POLICY "Users can view notes.media files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update files in their own folder
CREATE POLICY "Users can update notes.media files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete files in their own folder
CREATE POLICY "Users can delete notes.media files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'notes.media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Also update the note_media table default bucket name
ALTER TABLE note_media ALTER COLUMN storage_bucket SET DEFAULT 'notes.media';

-- Update any existing records to use the correct bucket name
UPDATE note_media SET storage_bucket = 'notes.media' WHERE storage_bucket = 'note-media';
