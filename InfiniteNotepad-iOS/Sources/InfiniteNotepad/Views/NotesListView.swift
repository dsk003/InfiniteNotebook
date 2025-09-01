import SwiftUI

struct NotesListView: View {
    @StateObject private var notesService = NotesService()
    @StateObject private var authService = AuthService()
    @State private var showingNewNote = false
    @State private var selectedNote: Note?
    
    var body: some View {
        NavigationView {
            VStack {
                if notesService.isLoading && notesService.notes.isEmpty {
                    ProgressView("Loading notes...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if notesService.notes.isEmpty {
                    EmptyNotesView()
                } else {
                    List {
                        ForEach(notesService.notes) { note in
                            NoteRowView(note: note) {
                                selectedNote = note
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button("Delete", role: .destructive) {
                                    Task {
                                        await notesService.deleteNote(note)
                                    }
                                }
                            }
                        }
                    }
                    .refreshable {
                        await notesService.loadNotes()
                    }
                }
            }
            .navigationTitle("Notes")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("New Note") {
                            showingNewNote = true
                        }
                        
                        Button("Sign Out", role: .destructive) {
                            authService.signOut()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showingNewNote) {
                NoteDetailView(note: nil, notesService: notesService)
            }
            .sheet(item: $selectedNote) { note in
                NoteDetailView(note: note, notesService: notesService)
            }
            .task {
                await notesService.loadNotes()
            }
            .alert("Error", isPresented: .constant(notesService.errorMessage != nil)) {
                Button("OK") {
                    notesService.errorMessage = nil
                }
            } message: {
                Text(notesService.errorMessage ?? "")
            }
        }
    }
}

struct NoteRowView: View {
    let note: Note
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                Text(note.content.isEmpty ? "Empty Note" : String(note.content.prefix(100)))
                    .font(.body)
                    .foregroundColor(.primary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                
                HStack {
                    Text(note.updatedAt, style: .relative)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    if note.content.isEmpty {
                        Text("Empty")
                            .font(.caption)
                            .foregroundColor(.orange)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(4)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct EmptyNotesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "note.text")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Notes Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Tap the + button to create your first note")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct NotesListView_Previews: PreviewProvider {
    static var previews: some View {
        NotesListView()
    }
}
