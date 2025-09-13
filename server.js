const express = require('express');
const path = require('path');
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
    
    // Clean the query but keep it simple for textSearch
    const sanitizedQuery = query.trim().replace(/'/g, "''"); // Escape single quotes
    
    console.log('🧹 Sanitized query:', sanitizedQuery);
    
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
    
    // For partial search, escape quotes and keep it simple
    const sanitizedQuery = query.trim().replace(/'/g, "''");
    
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

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
