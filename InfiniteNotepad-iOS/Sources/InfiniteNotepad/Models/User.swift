import Foundation

struct User: Identifiable, Codable {
    let id: UUID
    let email: String
    let createdAt: Date
    let emailConfirmedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt = "created_at"
        case emailConfirmedAt = "email_confirmed_at"
    }
    
    init(id: UUID, email: String, createdAt: Date, emailConfirmedAt: Date? = nil) {
        self.id = id
        self.email = email
        self.createdAt = createdAt
        self.emailConfirmedAt = emailConfirmedAt
    }
}

// MARK: - Authentication Models
struct AuthResponse: Codable {
    let user: UserResponse
    let token: String
}

struct UserResponse: Codable {
    let id: String
    let email: String
    let createdAt: String
    let emailConfirmedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt = "created_at"
        case emailConfirmedAt = "email_confirmed_at"
    }
    
    func toUser() -> User? {
        guard let userId = UUID(uuidString: id),
              let createdAt = ISO8601DateFormatter().date(from: createdAt) else {
            return nil
        }
        
        let emailConfirmedAt: Date? = {
            guard let emailConfirmedAt = emailConfirmedAt else { return nil }
            return ISO8601DateFormatter().date(from: emailConfirmedAt)
        }()
        
        return User(
            id: userId,
            email: email,
            createdAt: createdAt,
            emailConfirmedAt: emailConfirmedAt
        )
    }
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct SignupRequest: Codable {
    let email: String
    let password: String
}

struct SignupResponse: Codable {
    let message: String?
    let user: UserResponse?
    let requiresConfirmation: Bool?
    let error: String?
}
