class NotepadApp {
    constructor() {
        this.notes = {};
        this.currentUser = null;
        this.supabase = null;
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
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Note events
        document.getElementById('newNoteBtn').addEventListener('click', () => this.createNote());
        document.getElementById('createFirstNote').addEventListener('click', () => this.createNote());
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAllNotes());
        
        // Search events
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
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
                        <button class="btn-danger" onclick="app.deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
                <textarea 
                    class="note-textarea" 
                    placeholder="Start writing your note..."
                    data-note-id="${note.id}"
                >${note.content}</textarea>
                <div class="note-meta">
                    Created: ${createdDate}
                    ${isUpdated ? ` • Updated: ${updatedDate}` : ''}
                </div>
            </div>
        `;
    }

    bindNoteEvents() {
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
    }

    focusLatestNote() {
        setTimeout(() => {
            const latestNote = document.querySelector('.note-textarea');
            if (latestNote) {
                latestNote.focus();
            }
        }, 100);
    }

    // Search functionality
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const clearBtn = document.getElementById('clearSearchBtn');
        
        // Show/hide clear button
        if (searchTerm) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
        
        // Filter notes
        this.filterNotes(searchTerm);
    }
    
    filterNotes(searchTerm) {
        const noteElements = document.querySelectorAll('.note');
        let visibleCount = 0;
        
        noteElements.forEach(noteElement => {
            const noteId = noteElement.dataset.noteId;
            const note = this.notes[noteId];
            
            if (!searchTerm) {
                // Show all notes if no search term
                noteElement.style.display = 'block';
                visibleCount++;
            } else {
                // Check if note content contains search term
                const content = note ? note.content.toLowerCase() : '';
                if (content.includes(searchTerm)) {
                    noteElement.style.display = 'block';
                    visibleCount++;
                } else {
                    noteElement.style.display = 'none';
                }
            }
        });
        
        // Show/hide empty state based on visible notes
        this.updateEmptyState(visibleCount === 0 && Object.keys(this.notes).length > 0, searchTerm);
    }
    
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        
        // Show all notes
        this.filterNotes('');
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
