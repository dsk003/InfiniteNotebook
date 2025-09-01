class NotepadApp {
    constructor() {
        this.notes = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadNotes();
    }

    bindEvents() {
        document.getElementById('newNoteBtn').addEventListener('click', () => this.createNote());
        document.getElementById('createFirstNote').addEventListener('click', () => this.createNote());
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAllNotes());
    }

    async loadNotes() {
        try {
            const response = await fetch('/api/notes');
            this.notes = await response.json();
            this.renderNotes();
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    async createNote() {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: '' })
            });
            
            const newNote = await response.json();
            this.notes[newNote.id] = newNote;
            this.renderNotes();
            this.focusLatestNote();
        } catch (error) {
            console.error('Error creating note:', error);
        }
    }

    async updateNote(noteId, content) {
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                const updatedNote = await response.json();
                this.notes[noteId] = updatedNote;
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
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                delete this.notes[noteId];
                this.renderNotes();
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
