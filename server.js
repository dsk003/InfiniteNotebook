const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
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

// Initialize Dodo Payments
let DodoPayments = null;
const dodoApiKey = process.env.DODO_PAYMENTS_API_KEY;
const dodoWebhookSecret = process.env.DODO_WEBHOOK_SECRET;
const dodoEnvironment = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode'; // Default to test_mode

// Load Dodo Payments SDK
try {
  DodoPayments = require('dodopayments');
  console.log('✅ Dodo Payments SDK loaded successfully');
  console.log('🔑 API Key present:', !!dodoApiKey);
  console.log('🔐 Webhook Secret present:', !!dodoWebhookSecret);
  console.log('🌍 Environment:', dodoEnvironment);
} catch (error) {
  console.error('❌ Failed to load Dodo Payments SDK:', error.message);
}

// Helper function to verify the storage bucket exists
async function verifyBucketExists(supabaseClient) {
  try {
    // First, try to list buckets to see what's available
    const { data: buckets, error: listError } = await supabaseClient.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      // If we can't list buckets, try to test the bucket directly
      return await testBucketAccess(supabaseClient);
    }
    
    console.log('📋 Available buckets:', buckets.map(b => b.name).join(', '));
    
    const bucketExists = buckets.some(bucket => bucket.name === 'notes.media');
    
    if (bucketExists) {
      console.log('✅ Storage bucket "notes.media" found and ready');
      return true;
    } else {
      console.log('❌ Storage bucket "notes.media" not found in bucket list');
      // Try to test direct access anyway, in case listing is restricted
      return await testBucketAccess(supabaseClient);
    }
  } catch (error) {
    console.error('💥 Error verifying bucket exists:', error);
    // Try direct bucket access as fallback
    return await testBucketAccess(supabaseClient);
  }
}

// Test if we can access the bucket directly (fallback method)
async function testBucketAccess(supabaseClient) {
  try {
    console.log('🔍 Testing direct bucket access...');
    
    // Try to list files in the bucket (this will work if bucket exists and we have access)
    const { data, error } = await supabaseClient.storage
      .from('notes.media')
      .list('', { limit: 1 });
    
    if (error) {
      console.log('🔍 Bucket access test error:', error.message, 'Status:', error.status);
      if (error.message.includes('Bucket not found') || error.status === 404) {
        console.log('❌ Bucket "notes.media" does not exist');
        return false;
      } else {
        console.log('✅ Bucket exists but listing failed (this is OK):', error.message);
        return true; // Bucket exists, we just can't list (probably due to RLS)
      }
    } else {
      console.log('✅ Bucket "notes.media" is accessible');
      return true;
    }
  } catch (error) {
    console.error('💥 Error testing bucket access:', error);
    return false;
  }
}

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

// Payment Routes
app.post('/api/payments/create', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 Payment creation request received');
    console.log('🔑 DodoPayments available:', !!DodoPayments);
    console.log('🗝️ API Key available:', !!dodoApiKey);
    
    if (!DodoPayments) {
      console.error('❌ Dodo Payments SDK not loaded');
      return res.status(500).json({ error: 'Payment system not available' });
    }
    
    if (!dodoApiKey) {
      console.error('❌ Dodo Payments API key not configured');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const { productId, quantity = 1, returnUrl } = req.body;
    
    if (!productId) {
      console.error('❌ No product ID provided');
      return res.status(400).json({ error: 'Product ID is required' });
    }

    console.log('💳 Creating payment for user:', req.user.id, 'product:', productId);
    console.log('🔑 API Key (first 10 chars):', dodoApiKey ? dodoApiKey.substring(0, 10) + '...' : 'null');

    const client = new DodoPayments({
      bearerToken: dodoApiKey,
      environment: dodoEnvironment
    });

    console.log('🏗️ DodoPayments client created successfully');
    console.log('🌍 Using environment:', dodoEnvironment);

    // Prepare payment data
    const paymentData = {
      payment_link: true,
      billing: {
        city: 'City',
        country: 'US',
        state: 'State', 
        street: 'Street',
        zipcode: '00000'
      },
      customer: {
        email: req.user.email,
        name: req.user.email.split('@')[0]
        // Remove customer_id to let Dodo create a new customer
      },
      product_cart: [{
        product_id: productId,
        quantity: quantity
      }],
      return_url: returnUrl || `${req.protocol}://${req.get('host')}/payment-success`
    };

    console.log('📤 Sending payment data:', JSON.stringify(paymentData, null, 2));

    // Create payment link
    const payment = await client.payments.create(paymentData);

    console.log('✅ Payment link created:', payment.id);

    // Store payment record in database
    const { data: paymentRecord, error: dbError } = await supabase
      .from('user_payments')
      .insert({
        user_id: req.user.id,
        payment_id: payment.id,
        product_id: productId,
        amount: payment.amount || 0,
        currency: payment.currency || 'USD',
        status: 'pending',
        payment_link: payment.payment_link
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error saving payment record:', dbError);
      // Continue anyway, payment link is still valid
    }

    res.json({
      paymentId: payment.id,
      paymentLink: payment.payment_link,
      amount: payment.amount,
      currency: payment.currency
    });

  } catch (error) {
    console.error('💥 Payment creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.message 
    });
  }
});

// Webhook endpoint for payment updates
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!dodoWebhookSecret) {
      console.error('❌ Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['dodo-signature'] || req.headers['x-dodo-signature'];
    const payload = req.body;

    console.log('🔔 Webhook received:', {
      signature: signature ? 'present' : 'missing',
      payloadSize: payload.length
    });

    // Verify webhook signature
    if (signature && dodoWebhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', dodoWebhookSecret)
        .update(payload)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== providedSignature) {
        console.error('❌ Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse the payload
    let event;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    console.log('📨 Webhook event:', event.type, 'for payment:', event.data?.id);

    // Handle different webhook events
    switch (event.type) {
      case 'payment.succeeded':
      case 'payment.completed':
        await handlePaymentSuccess(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful payment
async function handlePaymentSuccess(paymentData) {
  try {
    console.log('✅ Processing successful payment:', paymentData.id);

    // Update payment record
    const { error: updateError } = await supabase
      .from('user_payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_data: paymentData
      })
      .eq('payment_id', paymentData.id);

    if (updateError) {
      console.error('❌ Error updating payment record:', updateError);
    } else {
      console.log('✅ Payment record updated successfully');
    }

  } catch (error) {
    console.error('💥 Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentData) {
  try {
    console.log('❌ Processing failed payment:', paymentData.id);

    // Update payment record
    const { error: updateError } = await supabase
      .from('user_payments')
      .update({
        status: 'failed',
        payment_data: paymentData
      })
      .eq('payment_id', paymentData.id);

    if (updateError) {
      console.error('❌ Error updating payment record:', updateError);
    } else {
      console.log('✅ Failed payment record updated');
    }

  } catch (error) {
    console.error('💥 Error handling payment failure:', error);
  }
}

// Get user purchase history (simplified)
app.get('/api/payments/history', authenticateUser, async (req, res) => {
  try {
    // Get recent payments
    const { data: payments } = await supabase
      .from('user_payments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      payments: payments || []
    });

  } catch (error) {
    console.error('💥 Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Storage Bucket Management
app.post('/api/storage/setup', authenticateUser, async (req, res) => {
  try {
    console.log('🔧 Verifying storage setup for user:', req.user.id);
    
    const bucketReady = await verifyBucketExists(supabase);
    
    res.json({ 
      success: bucketReady, 
      message: bucketReady ? 
        'Storage bucket is accessible and ready' : 
        'Storage bucket not found. Please create "notes.media" bucket in Supabase dashboard.',
      bucketExists: bucketReady
    });
    
  } catch (error) {
    console.error('💥 Storage verification error:', error);
    res.status(500).json({ error: 'Storage verification failed' });
  }
});

// Debug endpoint to list all buckets
app.get('/api/storage/debug', authenticateUser, async (req, res) => {
  try {
    console.log('🐛 Debug: Listing all storage buckets for user:', req.user.id);
    
    // Try to list all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return res.json({
        success: false,
        error: listError.message,
        buckets: null
      });
    }
    
    console.log('📋 Found buckets:', buckets.map(b => ({ name: b.name, id: b.id, public: b.public })));
    
    // Test access to each bucket
    const bucketTests = [];
    for (const bucket of buckets) {
      try {
        const { data, error } = await supabase.storage.from(bucket.name).list('', { limit: 1 });
        bucketTests.push({
          name: bucket.name,
          accessible: !error,
          error: error?.message || null
        });
      } catch (e) {
        bucketTests.push({
          name: bucket.name,
          accessible: false,
          error: e.message
        });
      }
    }
    
    res.json({
      success: true,
      buckets: buckets,
      bucketTests: bucketTests,
      lookingFor: 'notes.media'
    });
    
  } catch (error) {
    console.error('💥 Storage debug error:', error);
    res.status(500).json({ error: 'Storage debug failed' });
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
    
    // Verify bucket exists before upload (no creation attempt)
    const bucketReady = await verifyBucketExists(supabase);
    if (!bucketReady) {
      console.error('❌ Storage bucket not accessible');
      return res.status(500).json({ 
        error: 'Storage bucket not found. Please ensure the "notes.media" bucket exists in your Supabase project.' 
      });
    }
    
    console.log('📤 Uploading to path:', filePath);
    console.log('📄 File details:', {
      name: file.originalname,
      type: file.mimetype,
      size: file.size
    });
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('notes.media')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        duplex: false
      });
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError.message,
        status: uploadError.status,
        statusCode: uploadError.statusCode
      });
      return res.status(500).json({ 
        error: 'Failed to upload file',
        details: uploadError.message 
      });
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
        storage_bucket: 'notes.media'
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
      .from('notes.media')
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
      .from('notes.media')
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

// Payment success page
app.get('/payment-success', (req, res) => {
  // Redirect to main page with success parameter
  res.redirect('/?payment=success');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
