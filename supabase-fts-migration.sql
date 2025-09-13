-- Full Text Search Migration for InfiniteNotebook
-- This adds full-text search capabilities to the notes table

-- Add a generated column for full-text search
-- This will automatically update whenever the content column changes
ALTER TABLE notes 
ADD COLUMN fts tsvector 
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create a GIN index on the full-text search column for fast searching
CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes USING gin (fts);

-- Create a function to search notes with full-text search
CREATE OR REPLACE FUNCTION search_notes(
    search_query text,
    user_uuid uuid
)
RETURNS TABLE (
    id uuid,
    content text,
    created_at timestamptz,
    updated_at timestamptz,
    rank real
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.content,
        n.created_at,
        n.updated_at,
        ts_rank(n.fts, to_tsquery('english', search_query)) as rank
    FROM notes n
    WHERE 
        n.user_id = user_uuid 
        AND n.fts @@ to_tsquery('english', search_query)
    ORDER BY rank DESC, n.updated_at DESC;
END;
$$;

-- Create a function for partial/prefix search
CREATE OR REPLACE FUNCTION search_notes_partial(
    search_query text,
    user_uuid uuid
)
RETURNS TABLE (
    id uuid,
    content text,
    created_at timestamptz,
    updated_at timestamptz,
    rank real
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.content,
        n.created_at,
        n.updated_at,
        ts_rank(n.fts, to_tsquery('english', search_query || ':*')) as rank
    FROM notes n
    WHERE 
        n.user_id = user_uuid 
        AND n.fts @@ to_tsquery('english', search_query || ':*')
    ORDER BY rank DESC, n.updated_at DESC;
END;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION search_notes(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_notes_partial(text, uuid) TO authenticated;

-- Example usage:
-- SELECT * FROM search_notes('big dreams', 'user-uuid-here');
-- SELECT * FROM search_notes_partial('drea', 'user-uuid-here');
