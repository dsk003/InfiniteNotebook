-- Supabase Storage Setup for InfiniteNotebook Media Support
-- This sets up storage buckets and media tracking for images, audio, and video

-- Create a table to track media files linked to notes
CREATE TABLE IF NOT EXISTS note_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase storage
    file_type TEXT NOT NULL, -- 'image', 'audio', 'video'
    file_size BIGINT,
    mime_type TEXT,
    storage_bucket TEXT NOT NULL DEFAULT 'note-media',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_note_media_note_id ON note_media(note_id);
CREATE INDEX IF NOT EXISTS idx_note_media_user_id ON note_media(user_id);
CREATE INDEX IF NOT EXISTS idx_note_media_file_type ON note_media(file_type);

-- Enable Row Level Security
ALTER TABLE note_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_media table
CREATE POLICY "Users can view their own media" ON note_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON note_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON note_media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON note_media
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for note media (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'note-media',
--     'note-media', 
--     false, -- private bucket
--     52428800, -- 50MB limit
--     ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/quicktime']
-- );

-- Storage policies for the note-media bucket
-- Users can upload files to their own folder
CREATE POLICY "Users can upload media to their folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'note-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view files in their own folder
CREATE POLICY "Users can view their own media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'note-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update files in their own folder
CREATE POLICY "Users can update their own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'note-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete files in their own folder
CREATE POLICY "Users can delete their own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'note-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_note_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at when a row is updated
CREATE TRIGGER update_note_media_updated_at_trigger
    BEFORE UPDATE ON note_media 
    FOR EACH ROW 
    EXECUTE FUNCTION update_note_media_updated_at();

-- Function to clean up media when note is deleted (optional)
CREATE OR REPLACE FUNCTION cleanup_note_media()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete associated media files from storage
    -- This would need to be handled by your application layer
    -- as SQL can't directly call storage deletion
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Trigger to clean up media when note is deleted
CREATE TRIGGER cleanup_note_media_trigger
    AFTER DELETE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_note_media();
