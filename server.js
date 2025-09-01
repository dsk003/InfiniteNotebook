const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store notes in memory (in production, you'd want to use a database)
let notes = {};

// API Routes
app.get('/api/notes', (req, res) => {
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { content } = req.body;
  const noteId = Date.now().toString();
  notes[noteId] = {
    id: noteId,
    content: content || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  res.json(notes[noteId]);
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (notes[id]) {
    notes[id].content = content || '';
    notes[id].updatedAt = new Date().toISOString();
    res.json(notes[id]);
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  
  if (notes[id]) {
    delete notes[id];
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
