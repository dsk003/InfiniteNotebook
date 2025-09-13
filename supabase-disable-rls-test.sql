-- Temporary fix: Disable RLS on storage.objects to test upload
-- WARNING: This makes all files accessible to all users - only for testing!
-- Run this in Supabase SQL Editor to test if RLS is the issue

-- Disable RLS on storage.objects temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- After testing, you can re-enable it with:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Then run the proper policies from supabase-storage-policies-fix.sql
