class NotepadApp {
    constructor() {
        this.notes = {};
        this.currentUser = null;
        this.supabase = null;
        this.searchTimeout = null;
        this.sessionStartTime = Date.now();
        this.init();
    }

    init() {
        this.initSupabase();
        this.bindEvents();
        this.checkAuthState();
    }

    initSupabase() {
        // Get Supabase config from environment (you'll need to set these in your HTML or pass from server)
        const supabaseUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost:3000' 
            : window.location.origin;
        
        // For now, we'll use the server as a proxy for Supabase auth
        this.supabaseUrl = supabaseUrl;
    }

    bindEvents() {
        // Auth form events
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupFormElement').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('showSignup').addEventListener('click', (e) => this.showSignupForm(e));
        document.getElementById('showLogin').addEventListener('click', (e) => this.showLoginForm(e));

        // App events (logout, notes, search) will be bound after login in bindAppEvents()
    }

    async checkAuthState() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const response = await fetch(`${this.supabaseUrl}/api/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    this.currentUser = userData.user;
                    this.showApp();
                    this.loadNotes();
                } else {
                    localStorage.removeItem('auth_token');
                    this.showAuth();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('auth_token');
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.supabaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('auth_token', data.token);
                this.currentUser = data.user;
                this.showApp();
                this.loadNotes();
                this.hideError();
                
                // Track successful login
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'login', {
                        method: 'email'
                    });
                }
                
                // Track login with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('User Login', {
                        method: 'email',
                        user_email: this.currentUser.email
                    });
                    amplitude.setUserId(this.currentUser.id);
                }
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const response = await fetch(`${this.supabaseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.requiresConfirmation) {
                    this.showError('Please check your email and click the confirmation link to complete signup.');
                } else {
                    localStorage.setItem('auth_token', data.token);
                    this.currentUser = data.user;
                    this.showApp();
                    this.loadNotes();
                    this.hideError();
                    
                    // Track successful signup
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'sign_up', {
                            method: 'email'
                        });
                    }
                    
                    // Track signup with Amplitude
                    if (typeof amplitude !== 'undefined' && amplitude.track) {
                        amplitude.track('User Signup', {
                            method: 'email',
                            user_email: this.currentUser.email
                        });
                        amplitude.setUserId(this.currentUser.id);
                    }
                }
            } else {
                this.showError(data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Signup failed. Please try again.');
        }
    }

    handleLogout() {
        // Track logout with Amplitude before clearing user data
        if (typeof amplitude !== 'undefined' && amplitude.track && this.currentUser) {
            amplitude.track('User Logout', {
                user_email: this.currentUser.email,
                session_duration: Date.now() - (this.sessionStartTime || Date.now())
            });
        }
        
        localStorage.removeItem('auth_token');
        this.currentUser = null;
        this.notes = {};
        this.showAuth();
    }

    showAuth() {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('appSection').classList.add('hidden');
    }

    showApp() {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('appSection').classList.remove('hidden');
        document.getElementById('userEmail').textContent = this.currentUser.email;
        this.bindAppEvents();
        
        // Check for purchase success
        this.checkPurchaseSuccess();
        
        // Track app session start with Amplitude
        if (typeof amplitude !== 'undefined' && amplitude.track) {
            amplitude.track('App Session Started', {
                user_email: this.currentUser.email,
                timestamp: new Date().toISOString()
            });
        }
    }

    bindAppEvents() {
        // Bind events for elements that are only available after login
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('newNoteBtn').addEventListener('click', () => this.createNote());
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAllNotes());
        
        // Search events
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());

        // Store events
        document.getElementById('storeBtn').addEventListener('click', () => this.showStoreModal());
        document.getElementById('closeStoreModal').addEventListener('click', () => this.hideStoreModal());
        document.getElementById('closeSuccessModal').addEventListener('click', () => this.hideSuccessModal());
        document.getElementById('continueBtn').addEventListener('click', () => this.hideSuccessModal());
        document.getElementById('purchaseBtn').addEventListener('click', (e) => this.handlePurchase(e));
        
        // Bind createFirstNote event if it exists
        const createFirstNoteBtn = document.getElementById('createFirstNote');
        if (createFirstNoteBtn) {
            createFirstNoteBtn.addEventListener('click', () => this.createNote());
        }
    }

    showSignupForm(e) {
        e.preventDefault();
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        this.hideError();
    }

    showLoginForm(e) {
        e.preventDefault();
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        this.hideError();
    }

    showError(message) {
        const errorDiv = document.getElementById('authError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('authError').classList.add('hidden');
    }

    async loadNotes() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/notes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.notes = await response.json();
                this.renderNotes();
                
                // Track notes loaded with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('Notes Loaded', {
                        notes_count: Object.keys(this.notes).length,
                        user_email: this.currentUser?.email
                    });
                }
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    async createNote() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: '' })
            });
            
            if (response.ok) {
                const newNote = await response.json();
                this.notes[newNote.id] = newNote;
                this.renderNotes();
                this.focusLatestNote();
                
                // Track note creation
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'create_note', {
                        event_category: 'engagement',
                        event_label: 'new_note'
                    });
                }
                
                // Track note creation with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('Note Created', {
                        note_id: newNote.id,
                        total_notes: Object.keys(this.notes).length
                    });
                }
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Error creating note:', error);
        }
    }

    async updateNote(noteId, content) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                const updatedNote = await response.json();
                this.notes[noteId] = updatedNote;
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Error updating note:', error);
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                delete this.notes[noteId];
                this.renderNotes();
                
                // Track note deletion
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'delete_note', {
                        event_category: 'engagement',
                        event_label: 'note_deleted'
                    });
                }
                
                // Track note deletion with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('Note Deleted', {
                        note_id: noteId,
                        remaining_notes: Object.keys(this.notes).length - 1
                    });
                }
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (Object.keys(this.notes).length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        container.innerHTML = Object.values(this.notes)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .map(note => this.createNoteHTML(note))
            .join('');

        // Bind events for each note
        this.bindNoteEvents();
    }

    createNoteHTML(note) {
        const createdDate = new Date(note.createdAt).toLocaleDateString();
        const updatedDate = new Date(note.updatedAt).toLocaleDateString();
        const isUpdated = createdDate !== updatedDate;
        
        return `
            <div class="note-card" data-note-id="${note.id}">
                <div class="note-header">
                    <span class="note-id">#${note.id.slice(-6)}</span>
                    <div class="note-actions">
                        <button class="btn btn-secondary media-btn" onclick="app.showMediaUpload('${note.id}')">📎 Media</button>
                        <button class="btn-danger" onclick="app.deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
                <textarea 
                    class="note-textarea" 
                    placeholder="Start writing your note..."
                    data-note-id="${note.id}"
                >${note.content}</textarea>
                
                <!-- Media Upload Section (initially hidden) -->
                <div class="media-upload-section hidden" id="media-upload-${note.id}">
                    <div class="media-upload-buttons">
                        <input type="file" id="file-input-${note.id}" accept="image/*,audio/*,video/*" style="display: none;">
                        <button class="btn btn-primary" onclick="document.getElementById('file-input-${note.id}').click()">
                            📷 Choose File
                        </button>
                        <button class="btn btn-secondary" onclick="app.hideMediaUpload('${note.id}')">Cancel</button>
                    </div>
                    <div class="upload-progress hidden" id="upload-progress-${note.id}">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="progress-text">Uploading...</span>
                    </div>
                </div>
                
                <!-- Media Display Section -->
                <div class="note-media" id="media-${note.id}">
                    <!-- Media files will be loaded here -->
                </div>
                
                <div class="note-meta">
                    Created: ${createdDate}
                    ${isUpdated ? ` • Updated: ${updatedDate}` : ''}
                </div>
            </div>
        `;
    }

    bindNoteEvents() {
        // Bind textarea events
        document.querySelectorAll('.note-textarea').forEach(textarea => {
            let timeout;
            
            textarea.addEventListener('input', (e) => {
                const noteId = e.target.dataset.noteId;
                const content = e.target.value;
                
                // Debounce the save operation
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.updateNote(noteId, content);
                }, 1000);
            });
        });
        
        // Bind file input events
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const noteId = input.id.replace('file-input-', '');
                if (e.target.files.length > 0) {
                    this.uploadMedia(noteId, e.target.files[0]);
                }
            });
        });
        
        // Load media for each note
        Object.keys(this.notes).forEach(noteId => {
            this.loadNoteMedia(noteId);
        });
    }

    focusLatestNote() {
        setTimeout(() => {
            const latestNote = document.querySelector('.note-textarea');
            if (latestNote) {
                latestNote.focus();
            }
        }, 100);
    }

    // Media Management
    showMediaUpload(noteId) {
        const uploadSection = document.getElementById(`media-upload-${noteId}`);
        uploadSection.classList.remove('hidden');
    }
    
    hideMediaUpload(noteId) {
        const uploadSection = document.getElementById(`media-upload-${noteId}`);
        const fileInput = document.getElementById(`file-input-${noteId}`);
        uploadSection.classList.add('hidden');
        fileInput.value = ''; // Clear file selection
    }
    
    async uploadMedia(noteId, file) {
        try {
            console.log('📁 Uploading media:', file.name, 'to note:', noteId);
            
            // Show upload progress
            const progressSection = document.getElementById(`upload-progress-${noteId}`);
            const progressFill = progressSection.querySelector('.progress-fill');
            const progressText = progressSection.querySelector('.progress-text');
            
            progressSection.classList.remove('hidden');
            progressText.textContent = 'Uploading...';
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/media/upload/${noteId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (response.ok) {
                const mediaData = await response.json();
                console.log('✅ Media uploaded successfully:', mediaData);
                
                progressText.textContent = 'Upload complete!';
                progressFill.style.width = '100%';
                
                // Track media upload
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'upload_media', {
                        event_category: 'engagement',
                        event_label: 'media_upload',
                        value: 1
                    });
                }
                
                // Track media upload with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('Media Uploaded', {
                        file_name: file.name,
                        file_type: file.type,
                        file_size: file.size,
                        note_id: noteId
                    });
                }
                
                // Hide upload section and reload media
                setTimeout(() => {
                    this.hideMediaUpload(noteId);
                    progressSection.classList.add('hidden');
                    progressFill.style.width = '0%';
                    this.loadNoteMedia(noteId);
                }, 1000);
                
            } else if (response.status === 401) {
                this.handleLogout();
            } else {
                const error = await response.json();
                console.error('❌ Upload failed:', error);
                progressText.textContent = 'Upload failed!';
                setTimeout(() => {
                    progressSection.classList.add('hidden');
                    progressFill.style.width = '0%';
                }, 2000);
            }
            
        } catch (error) {
            console.error('💥 Upload error:', error);
            const progressSection = document.getElementById(`upload-progress-${noteId}`);
            const progressText = progressSection.querySelector('.progress-text');
            progressText.textContent = 'Upload failed!';
            setTimeout(() => {
                progressSection.classList.add('hidden');
            }, 2000);
        }
    }
    
    async loadNoteMedia(noteId) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/media/${noteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const mediaFiles = await response.json();
                this.renderNoteMedia(noteId, mediaFiles);
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('💥 Error loading media:', error);
        }
    }
    
    renderNoteMedia(noteId, mediaFiles) {
        const mediaContainer = document.getElementById(`media-${noteId}`);
        
        if (mediaFiles.length === 0) {
            mediaContainer.innerHTML = '';
            return;
        }
        
        const mediaHTML = mediaFiles.map(media => {
            return `
                <div class="media-item" data-media-id="${media.id}">
                    <div class="media-preview" id="media-preview-${media.id}">
                        ${this.createMediaPreview(media)}
                    </div>
                    <div class="media-info">
                        <div class="media-details">
                            <span class="media-name">${media.file_name}</span>
                            <span class="media-size">${this.formatFileSize(media.file_size)}</span>
                        </div>
                        <button class="btn btn-danger btn-small" onclick="app.deleteMedia('${media.id}', '${noteId}')">×</button>
                    </div>
                </div>
            `;
        }).join('');
        
        mediaContainer.innerHTML = mediaHTML;
        
        // Load actual media content
        mediaFiles.forEach(media => {
            this.loadMediaContent(media);
        });
    }
    
    createMediaPreview(media) {
        switch (media.file_type) {
            case 'image':
                return `<img class="media-image loading" alt="${media.file_name}" />`;
            case 'audio':
                return `<audio class="media-audio" controls>Your browser does not support audio.</audio>`;
            case 'video':
                return `<video class="media-video" controls>Your browser does not support video.</video>`;
            default:
                return `<div class="media-file">📎 ${media.file_name}</div>`;
        }
    }
    
    async loadMediaContent(media) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/media/${media.id}/url`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const { signedUrl } = await response.json();
                const previewElement = document.getElementById(`media-preview-${media.id}`);
                
                switch (media.file_type) {
                    case 'image':
                        const img = previewElement.querySelector('img');
                        img.src = signedUrl;
                        img.classList.remove('loading');
                        break;
                    case 'audio':
                        const audio = previewElement.querySelector('audio');
                        audio.src = signedUrl;
                        break;
                    case 'video':
                        const video = previewElement.querySelector('video');
                        video.src = signedUrl;
                        break;
                }
            }
        } catch (error) {
            console.error('💥 Error loading media content:', error);
        }
    }
    
    async deleteMedia(mediaId, noteId) {
        if (!confirm('Are you sure you want to delete this media file?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/media/${mediaId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log('✅ Media deleted successfully');
                this.loadNoteMedia(noteId); // Reload media for the note
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            console.error('💥 Error deleting media:', error);
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Search functionality
    handleSearch(event) {
        const searchTerm = event.target.value.trim();
        const clearBtn = document.getElementById('clearSearchBtn');
        
        // Show/hide clear button
        if (searchTerm) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
        
        // Debounce search to avoid too many API calls
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            if (searchTerm) {
                this.performSearch(searchTerm);
            } else {
                // If empty search, load all notes
                this.loadNotes();
            }
        }, 300); // Wait 300ms after user stops typing
    }
    
    async performSearch(searchTerm) {
        try {
            console.log('🔍 Performing search for:', searchTerm);
            
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const searchResults = await response.json();
                console.log('✅ Search results received:', Object.keys(searchResults).length, 'notes');
                
                // Update notes with search results
                this.notes = searchResults;
                this.renderNotes();
                
                // Track search usage
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'search', {
                        event_category: 'engagement',
                        event_label: 'note_search',
                        value: Object.keys(searchResults).length
                    });
                }
                
                // Track search with Amplitude
                if (typeof amplitude !== 'undefined' && amplitude.track) {
                    amplitude.track('Search Performed', {
                        search_term: searchTerm,
                        results_count: Object.keys(searchResults).length,
                        has_results: Object.keys(searchResults).length > 0
                    });
                }
                
                // Show empty state if no results
                if (Object.keys(searchResults).length === 0) {
                    this.updateEmptyState(true, searchTerm);
                } else {
                    this.updateEmptyState(false, searchTerm);
                }
            } else if (response.status === 401) {
                this.handleLogout();
            } else {
                console.error('❌ Search failed:', response.statusText);
                // Fall back to showing all notes
                this.loadNotes();
            }
        } catch (error) {
            console.error('💥 Search error:', error);
            // Fall back to showing all notes
            this.loadNotes();
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        
        // Clear the search timeout if it exists
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        
        // Load all notes again
        this.loadNotes();
    }
    
    updateEmptyState(showNoResults, searchTerm) {
        const emptyState = document.getElementById('emptyState');
        const emptyStateContent = emptyState.querySelector('.empty-state-content');
        
        if (showNoResults) {
            // Show "no results" state
            emptyStateContent.innerHTML = `
                <h2>No Results Found</h2>
                <p>No notes match your search for "<strong>${searchTerm}</strong>"</p>
                <button id="clearSearchFromEmpty" class="btn btn-primary">Clear Search</button>
            `;
            emptyState.classList.remove('hidden');
            
            // Add event listener for clear search button
            document.getElementById('clearSearchFromEmpty').addEventListener('click', () => this.clearSearch());
        } else if (Object.keys(this.notes).length === 0) {
            // Show regular empty state
            emptyStateContent.innerHTML = `
                <h2>Start Writing</h2>
                <p>Click "New Note" to create your first note</p>
                <button id="createFirstNote" class="btn btn-primary">Create First Note</button>
            `;
            emptyState.classList.remove('hidden');
            
            // Re-bind the create first note event
            document.getElementById('createFirstNote').addEventListener('click', () => this.createNote());
        } else {
            emptyState.classList.add('hidden');
        }
    }

    async saveAllNotes() {
        const saveBtn = document.getElementById('saveAllBtn');
        const originalText = saveBtn.textContent;
        
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            // Force save all notes by triggering input events
            document.querySelectorAll('.note-textarea').forEach(textarea => {
                const noteId = textarea.dataset.noteId;
                const content = textarea.value;
                this.updateNote(noteId, content);
            });

            // Wait a bit for all saves to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            saveBtn.textContent = '✅ Saved!';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Error saving notes:', error);
            saveBtn.textContent = '❌ Error';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    // Store Methods
    showStoreModal() {
        document.getElementById('storeModal').classList.remove('hidden');
        
        // Track event
        if (typeof amplitude !== 'undefined' && amplitude.track) {
            amplitude.track('Store Modal Opened', {
                user_email: this.currentUser.email
            });
        }
    }

    hideStoreModal() {
        document.getElementById('storeModal').classList.add('hidden');
        document.getElementById('purchaseStatus').classList.add('hidden');
        document.querySelector('.product-card').classList.remove('hidden');
    }

    showSuccessModal() {
        document.getElementById('successModal').classList.remove('hidden');
    }

    hideSuccessModal() {
        document.getElementById('successModal').classList.add('hidden');
    }

    async handlePurchase(event) {
        const productId = event.target.dataset.productId;
        if (!productId) return;

        console.log('Starting purchase for product:', productId);

        // Show loading state
        document.querySelector('.product-card').classList.add('hidden');
        document.getElementById('purchaseStatus').classList.remove('hidden');

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${this.supabaseUrl}/api/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: 1,
                    returnUrl: `${window.location.origin}/payment-success`
                })
            });

            if (!response.ok) {
                throw new Error(`Payment creation failed: ${response.status}`);
            }

            const paymentData = await response.json();
            console.log('Payment link created:', paymentData.paymentLink);

            // Track event
            if (typeof amplitude !== 'undefined' && amplitude.track) {
                amplitude.track('Purchase Initiated', {
                    user_email: this.currentUser.email,
                    product_id: productId,
                    amount: paymentData.amount,
                    payment_id: paymentData.paymentId
                });
            }

            // Redirect to payment page
            window.location.href = paymentData.paymentLink;

        } catch (error) {
            console.error('Purchase error:', error);
            
            // Show error state
            document.getElementById('purchaseStatus').classList.add('hidden');
            document.querySelector('.product-card').classList.remove('hidden');
            
            // Show error message
            alert('Purchase setup failed. Please try again or contact support.');
            
            // Track error
            if (typeof amplitude !== 'undefined' && amplitude.track) {
                amplitude.track('Purchase Error', {
                    user_email: this.currentUser.email,
                    product_id: productId,
                    error: error.message
                });
            }
        }
    }

    // Check for purchase success on page load
    checkPurchaseSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseSuccess = urlParams.get('payment') === 'success';
        
        if (purchaseSuccess) {
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show success modal
            setTimeout(() => {
                this.showSuccessModal();
            }, 1000);

            // Track success
            if (typeof amplitude !== 'undefined' && amplitude.track) {
                amplitude.track('Purchase Success', {
                    user_email: this.currentUser.email
                });
            }
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotepadApp();
});

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
    document.querySelectorAll('.note-textarea').forEach(textarea => {
        const noteId = textarea.dataset.noteId;
        const content = textarea.value;
        if (noteId && content !== undefined) {
            // Use sendBeacon for reliable saving on page unload
            navigator.sendBeacon(`/api/notes/${noteId}`, JSON.stringify({ content }));
        }
    });
});
