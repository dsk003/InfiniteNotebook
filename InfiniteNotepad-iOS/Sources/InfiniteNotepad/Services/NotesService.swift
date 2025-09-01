import Foundation
import Supabase

@MainActor
class NotesService: ObservableObject {
    @Published var notes: [Note] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let supabase: SupabaseClient
    private let apiBaseURL: String
    
    init() {
        self.apiBaseURL = Config.currentAPIBaseURL
        
        // Initialize Supabase client
        self.supabase = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseURL)!,
            supabaseKey: Config.supabaseAnonKey
        )
    }
    
    // MARK: - Load Notes
    func loadNotes() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await makeRequest(endpoint: "/api/notes", method: "GET")
            let notesDict = try JSONSerialization.jsonObject(with: response) as? [String: Any] ?? [:]
            
            var loadedNotes: [Note] = []
            for (_, noteData) in notesDict {
                if let noteDict = noteData as? [String: Any],
                   let jsonData = try? JSONSerialization.data(withJSONObject: noteDict),
                   let noteResponse = try? JSONDecoder().decode(NoteResponse.self, from: jsonData),
                   let note = noteResponse.toNote() {
                    loadedNotes.append(note)
                }
            }
            
            // Sort by updated date (most recent first)
            self.notes = loadedNotes.sorted { $0.updatedAt > $1.updatedAt }
        } catch {
            errorMessage = "Failed to load notes: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    // MARK: - Create Note
    func createNote(content: String = "") async {
        isLoading = true
        errorMessage = nil
        
        do {
            let request = CreateNoteRequest(content: content)
            let response = try await makeRequest(
                endpoint: "/api/notes",
                method: "POST",
                body: request
            )
            
            let noteResponse: NoteResponse = try JSONDecoder().decode(NoteResponse.self, from: response)
            if let note = noteResponse.toNote() {
                notes.insert(note, at: 0) // Add to beginning
            }
        } catch {
            errorMessage = "Failed to create note: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    // MARK: - Update Note
    func updateNote(_ note: Note, content: String) async {
        errorMessage = nil
        
        do {
            let request = UpdateNoteRequest(content: content)
            let response = try await makeRequest(
                endpoint: "/api/notes/\(note.id.uuidString)",
                method: "PUT",
                body: request
            )
            
            let noteResponse: NoteResponse = try JSONDecoder().decode(NoteResponse.self, from: response)
            if let updatedNote = noteResponse.toNote() {
                if let index = notes.firstIndex(where: { $0.id == note.id }) {
                    notes[index] = updatedNote
                    // Re-sort to maintain order
                    notes = notes.sorted { $0.updatedAt > $1.updatedAt }
                }
            }
        } catch {
            errorMessage = "Failed to update note: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Delete Note
    func deleteNote(_ note: Note) async {
        errorMessage = nil
        
        do {
            _ = try await makeRequest(
                endpoint: "/api/notes/\(note.id.uuidString)",
                method: "DELETE"
            )
            
            notes.removeAll { $0.id == note.id }
        } catch {
            errorMessage = "Failed to delete note: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Helper Methods
    private func makeRequest(endpoint: String, method: String, body: Encodable? = nil) async throws -> Data {
        guard let url = URL(string: apiBaseURL + endpoint) else {
            throw NotesError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth token if available
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NotesError.invalidResponse
        }
        
        if httpResponse.statusCode >= 400 {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorData["error"] {
                throw NotesError.serverError(errorMessage)
            }
            throw NotesError.serverError("Server error: \(httpResponse.statusCode)")
        }
        
        return data
    }
}

// MARK: - Notes Errors
enum NotesError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .serverError(let message):
            return message
        }
    }
}
