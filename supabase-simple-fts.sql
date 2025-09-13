-- Simple Full Text Search setup for InfiniteNotebook
-- This enables Supabase's built-in textSearch() functionality

-- The textSearch() method works with any text column, but we can optimize it
-- by creating a GIN index on the content column for better performance

-- Create a GIN index on the content column for full-text search
CREATE INDEX IF NOT EXISTS notes_content_fts_idx 
ON notes 
USING gin (to_tsvector('english', content));

-- That's it! Now you can use:
-- supabase.from('notes').select().textSearch('content', 'your search query')

-- Optional: If you want to search multiple columns, you can create a computed column
-- ALTER TABLE notes ADD COLUMN searchable_text text 
-- GENERATED ALWAYS AS (content) STORED;

-- Then create index on the computed column:
-- CREATE INDEX notes_searchable_fts_idx ON notes USING gin (to_tsvector('english', searchable_text));
