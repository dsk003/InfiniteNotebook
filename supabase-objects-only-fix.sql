-- Storage Objects Policies Fix (No Bucket Policies)
-- This only modifies storage.objects which you have permission to change

-- Drop existing object policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload media to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Upload to notes.media bucket" ON storage.objects;
DROP POLICY IF EXISTS "View notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Update notes.media files" ON storage.objects;
DROP POLICY IF EXISTS "Delete notes.media files" ON storage.objects;

-- Create object policies for notes.media bucket only
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
