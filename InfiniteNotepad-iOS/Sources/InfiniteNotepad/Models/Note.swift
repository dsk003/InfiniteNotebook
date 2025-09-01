import Foundation

struct Note: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    var content: String
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case content
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(id: UUID = UUID(), userId: UUID, content: String = "", createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.userId = userId
        self.content = content
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - API Response Models
struct NoteResponse: Codable {
    let id: String
    let userId: String
    let content: String
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case content
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    func toNote() -> Note? {
        guard let noteId = UUID(uuidString: id),
              let userId = UUID(uuidString: userId),
              let createdAt = ISO8601DateFormatter().date(from: createdAt),
              let updatedAt = ISO8601DateFormatter().date(from: updatedAt) else {
            return nil
        }
        
        return Note(
            id: noteId,
            userId: userId,
            content: content,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

struct CreateNoteRequest: Codable {
    let content: String
}

struct UpdateNoteRequest: Codable {
    let content: String
}
