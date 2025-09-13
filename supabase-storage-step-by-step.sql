-- Step-by-step Storage Policies Fix
-- Run each section separately to identify any issues

-- STEP 1: Enable RLS on buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create bucket view policy
CREATE POLICY "view_buckets" ON storage.buckets FOR SELECT USING (true);

-- STEP 3: Create bucket insert policy  
CREATE POLICY "create_buckets" ON storage.buckets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- STEP 4: Create bucket update policy
CREATE POLICY "update_buckets" ON storage.buckets FOR UPDATE USING (true);

-- STEP 5: Create object upload policy
CREATE POLICY "upload_notes_media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- STEP 6: Create object view policy
CREATE POLICY "view_notes_media" ON storage.objects
FOR SELECT USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- STEP 7: Create object update policy
CREATE POLICY "update_notes_media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- STEP 8: Create object delete policy
CREATE POLICY "delete_notes_media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'notes.media' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
