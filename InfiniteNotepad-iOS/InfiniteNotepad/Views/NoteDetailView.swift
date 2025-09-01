import SwiftUI

struct NoteDetailView: View {
    let note: Note?
    let notesService: NotesService
    
    @State private var content: String = ""
    @State private var isEditing = false
    @State private var hasChanges = false
    @Environment(\.dismiss) private var dismiss
    
    private var isNewNote: Bool {
        note == nil
    }
    
    private var navigationTitle: String {
        if isNewNote {
            return "New Note"
        } else if isEditing {
            return "Edit Note"
        } else {
            return "Note"
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if isNewNote || isEditing {
                    // Editable text view
                    TextEditor(text: $content)
                        .padding()
                        .onChange(of: content) { _ in
                            hasChanges = true
                        }
                } else {
                    // Read-only text view
                    ScrollView {
                        Text(content.isEmpty ? "Empty Note" : content)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                    }
                }
                
                Spacer()
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        if hasChanges {
                            // Show confirmation dialog
                        } else {
                            dismiss()
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isNewNote {
                        Button("Save") {
                            Task {
                                await notesService.createNote(content: content)
                                dismiss()
                            }
                        }
                        .disabled(content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    } else if isEditing {
                        Button("Save") {
                            if let note = note {
                                Task {
                                    await notesService.updateNote(note, content: content)
                                    isEditing = false
                                    hasChanges = false
                                }
                            }
                        }
                    } else {
                        Button("Edit") {
                            isEditing = true
                        }
                    }
                }
            }
        }
        .onAppear {
            if let note = note {
                content = note.content
            }
        }
        .alert("Unsaved Changes", isPresented: .constant(hasChanges && !isEditing)) {
            Button("Discard", role: .destructive) {
                dismiss()
            }
            Button("Keep Editing") {
                // Do nothing
            }
        } message: {
            Text("You have unsaved changes. Are you sure you want to discard them?")
        }
    }
}

struct NoteDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleNote = Note(
            id: UUID(),
            userId: UUID(),
            content: "This is a sample note content that demonstrates how the note detail view looks.",
            createdAt: Date(),
            updatedAt: Date()
        )
        
        NoteDetailView(note: sampleNote, notesService: NotesService())
    }
}
