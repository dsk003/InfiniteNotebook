const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, and video files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  console.log('🔐 Authentication check for:', req.method, req.path);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No authorization header provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  console.log('🎫 Token received (first 20 chars):', token.substring(0, 20) + '...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log('❌ Token validation failed:', error?.message || 'No user returned');
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('✅ User authenticated:', user.id, user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('💥 Unexpected auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${req.protocol}://${req.get('host')}`
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      // Check if email confirmation is required
      if (data.user.email_confirmed_at) {
        // User is immediately confirmed, get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          return res.status(400).json({ error: 'Failed to create session' });
        }

        res.json({
          user: data.user,
          token: sessionData.session.access_token
        });
      } else {
        // Email confirmation required
        res.json({
          message: 'Please check your email and click the confirmation link to complete signup.',
          user: data.user,
          requiresConfirmation: true
        });
      }
    } else {
      res.status(400).json({ error: 'Signup failed' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message });
    }

    if (data.user && data.session) {
      res.json({
        user: data.user,
        token: data.session.access_token
      });
    } else {
      res.status(401).json({ error: 'Login failed' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/verify', authenticateUser, (req, res) => {
  res.json({ user: req.user });
});

// API Routes
app.get('/api/notes', authenticateUser, async (req, res) => {
  try {
    console.log('📝 Fetching notes for user:', req.user.id);
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching notes:', error);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }
    
    console.log('✅ Notes query successful. Found:', data?.length || 0, 'notes');
    console.log('📊 Raw notes data:', JSON.stringify(data, null, 2));
    
    // Transform the data to match the frontend expectations
    const transformedNotes = {};
    data.forEach(note => {
      transformedNotes[note.id] = {
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      };
    });
    
    console.log('🔄 Transformed notes:', JSON.stringify(transformedNotes, null, 2));
    res.json(transformedNotes);
  } catch (error) {
    console.error('💥 Unexpected error fetching notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notes', authenticateUser, async (req, res) => {
  try {
    const { content } = req.body;
    
    const { data, error } = await supabase
      .from('notes')
      .insert([
        { 
          content: content || '',
          user_id: req.user.id
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating note:', error);
      return res.status(500).json({ error: 'Failed to create note' });
    }
    
    // Transform the response to match frontend expectations
    const transformedNote = {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(transformedNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/notes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const { data, error } = await supabase
      .from('notes')
      .update({ content: content || '' })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating note:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Note not found' });
      }
      return res.status(500).json({ error: 'Failed to update note' });
    }
    
    // Transform the response to match frontend expectations
    const transformedNote = {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(transformedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/notes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) {
      console.error('Error deleting note:', error);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Full-Text Search Routes
app.get('/api/search', authenticateUser, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log('🔍 Full-text search for user:', req.user.id, 'query:', query);
    
    // Clean the query for textSearch - keep it simple like the example
    const sanitizedQuery = query.trim();
    
    console.log('🧹 Search query:', sanitizedQuery);
    
    // Use Supabase's built-in textSearch method
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .textSearch('content', `'${sanitizedQuery}'`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('❌ Full-text search error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
    
    console.log('✅ Search results:', data?.length || 0, 'notes found');
    
    // Transform the data to match frontend expectations
    const transformedNotes = {};
    data.forEach(note => {
      transformedNotes[note.id] = {
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      };
    });
    
    res.json(transformedNotes);
  } catch (error) {
    console.error('💥 Unexpected search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial/Prefix Search Route
app.get('/api/search/partial', authenticateUser, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log('🔍 Partial search for user:', req.user.id, 'query:', query);
    
    // For partial search, keep it simple
    const sanitizedQuery = query.trim();
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .textSearch('content', `'${sanitizedQuery}':*`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('❌ Partial search error:', error);
      return res.status(500).json({ error: 'Partial search failed' });
    }
    
    console.log('✅ Partial search results:', data?.length || 0, 'notes found');
    
    // Transform the data to match frontend expectations
    const transformedNotes = {};
    data.forEach(note => {
      transformedNotes[note.id] = {
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      };
    });
    
    res.json(transformedNotes);
  } catch (error) {
    console.error('💥 Unexpected partial search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Media Upload Routes
app.post('/api/media/upload/:noteId', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    const { noteId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('📁 Uploading file:', file.originalname, 'for note:', noteId);
    
    // Verify the note belongs to the user
    const { data: noteCheck, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .single();
    
    if (noteError || !noteCheck) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    
    // Generate unique file path: userId/noteId/timestamp-filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${req.user.id}/${noteId}/${fileName}`;
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('note-media')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        duplex: false
      });
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }
    
    console.log('✅ File uploaded to storage:', uploadData.path);
    
    // Determine file type
    let fileType = 'other';
    if (file.mimetype.startsWith('image/')) fileType = 'image';
    else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
    else if (file.mimetype.startsWith('video/')) fileType = 'video';
    
    // Save media record to database
    const { data: mediaData, error: mediaError } = await supabase
      .from('note_media')
      .insert({
        note_id: noteId,
        user_id: req.user.id,
        file_name: file.originalname,
        file_path: uploadData.path,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.mimetype,
        storage_bucket: 'note-media'
      })
      .select()
      .single();
    
    if (mediaError) {
      console.error('❌ Database insert error:', mediaError);
      // Try to clean up uploaded file
      await supabase.storage.from('note-media').remove([uploadData.path]);
      return res.status(500).json({ error: 'Failed to save media record' });
    }
    
    console.log('✅ Media record saved:', mediaData.id);
    
    res.json({
      id: mediaData.id,
      fileName: mediaData.file_name,
      filePath: mediaData.file_path,
      fileType: mediaData.file_type,
      fileSize: mediaData.file_size,
      mimeType: mediaData.mime_type,
      createdAt: mediaData.created_at
    });
    
  } catch (error) {
    console.error('💥 Media upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get media files for a note
app.get('/api/media/:noteId', authenticateUser, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    console.log('📂 Getting media for note:', noteId, 'user:', req.user.id);
    
    const { data, error } = await supabase
      .from('note_media')
      .select('*')
      .eq('note_id', noteId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching media:', error);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }
    
    console.log('✅ Found', data.length, 'media files');
    
    res.json(data);
  } catch (error) {
    console.error('💥 Error fetching media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signed URL for media file
app.get('/api/media/:mediaId/url', authenticateUser, async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Get media record to verify ownership
    const { data: media, error: mediaError } = await supabase
      .from('note_media')
      .select('*')
      .eq('id', mediaId)
      .eq('user_id', req.user.id)
      .single();
    
    if (mediaError || !media) {
      return res.status(404).json({ error: 'Media not found or unauthorized' });
    }
    
    // Get signed URL for the file (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('note-media')
      .createSignedUrl(media.file_path, 3600); // 1 hour
    
    if (urlError) {
      console.error('❌ Error creating signed URL:', urlError);
      return res.status(500).json({ error: 'Failed to get file URL' });
    }
    
    res.json({
      signedUrl: urlData.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error getting signed URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete media file
app.delete('/api/media/:mediaId', authenticateUser, async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Get media record to verify ownership and get file path
    const { data: media, error: mediaError } = await supabase
      .from('note_media')
      .select('*')
      .eq('id', mediaId)
      .eq('user_id', req.user.id)
      .single();
    
    if (mediaError || !media) {
      return res.status(404).json({ error: 'Media not found or unauthorized' });
    }
    
    console.log('🗑️ Deleting media:', media.file_name, 'path:', media.file_path);
    
    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('note-media')
      .remove([media.file_path]);
    
    if (storageError) {
      console.error('❌ Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }
    
    // Delete media record from database
    const { error: dbError } = await supabase
      .from('note_media')
      .delete()
      .eq('id', mediaId)
      .eq('user_id', req.user.id);
    
    if (dbError) {
      console.error('❌ Database deletion error:', dbError);
      return res.status(500).json({ error: 'Failed to delete media record' });
    }
    
    console.log('✅ Media deleted successfully');
    res.json({ success: true });
    
  } catch (error) {
    console.error('💥 Error deleting media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
