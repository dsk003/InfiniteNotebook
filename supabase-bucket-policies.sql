-- Create storage.buckets policies for bucket-level operations
-- Run this in your Supabase SQL Editor

-- Enable RLS on storage.buckets if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view buckets (needed for listing buckets)
CREATE POLICY "Users can view buckets" ON storage.buckets
    FOR SELECT USING (true);

-- Policy to allow authenticated users to create buckets (if needed)
CREATE POLICY "Authenticated users can create buckets" ON storage.buckets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow users to update bucket settings (optional)
CREATE POLICY "Users can update buckets" ON storage.buckets
    FOR UPDATE USING (true);

-- Alternative: If you want to be more restrictive, you can limit bucket operations
-- to specific users or service roles only:

-- CREATE POLICY "Service role can manage buckets" ON storage.buckets
--     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Or allow all authenticated users:
-- CREATE POLICY "Authenticated users can manage buckets" ON storage.buckets
--     FOR ALL USING (auth.role() = 'authenticated');
