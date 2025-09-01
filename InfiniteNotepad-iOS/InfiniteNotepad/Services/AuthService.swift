import Foundation
import Supabase

@MainActor
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
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
        
        // Check if user is already authenticated
        checkAuthState()
    }
    
    // MARK: - Authentication State
    func checkAuthState() {
        Task {
            do {
                let session = try await supabase.auth.session
                let user = session.user
                self.currentUser = User(
                    id: UUID(uuidString: user.id.uuidString) ?? UUID(),
                    email: user.email ?? "",
                    createdAt: user.createdAt,
                    emailConfirmedAt: user.emailConfirmedAt
                )
                self.isAuthenticated = true
            } catch {
                self.isAuthenticated = false
                self.currentUser = nil
            }
        }
    }
    
    // MARK: - Sign Up
    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let request = SignupRequest(email: email, password: password)
            let response = try await makeRequest(
                endpoint: "/api/auth/signup",
                method: "POST",
                body: request
            )
            
            let signupResponse: SignupResponse = try JSONDecoder().decode(SignupResponse.self, from: response)
            
            if let error = signupResponse.error {
                errorMessage = error
            } else if signupResponse.requiresConfirmation == true {
                errorMessage = signupResponse.message ?? "Please check your email and click the confirmation link to complete signup."
            } else if let userResponse = signupResponse.user,
                      let user = userResponse.toUser() {
                currentUser = user
                isAuthenticated = true
            }
        } catch {
            errorMessage = "Signup failed: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    // MARK: - Sign In
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let request = LoginRequest(email: email, password: password)
            let response = try await makeRequest(
                endpoint: "/api/auth/login",
                method: "POST",
                body: request
            )
            
            let authResponse: AuthResponse = try JSONDecoder().decode(AuthResponse.self, from: response)
            
            if let user = authResponse.user.toUser() {
                currentUser = user
                isAuthenticated = true
                
                // Store token for API requests
                UserDefaults.standard.set(authResponse.token, forKey: "auth_token")
            }
        } catch {
            errorMessage = "Login failed: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Out
    func signOut() {
        Task {
            do {
                try await supabase.auth.signOut()
                currentUser = nil
                isAuthenticated = false
                UserDefaults.standard.removeObject(forKey: "auth_token")
            } catch {
                errorMessage = "Logout failed: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Helper Methods
    private func makeRequest(endpoint: String, method: String, body: Encodable? = nil) async throws -> Data {
        guard let url = URL(string: apiBaseURL + endpoint) else {
            throw AuthError.invalidURL
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
            throw AuthError.invalidResponse
        }
        
        if httpResponse.statusCode >= 400 {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorData["error"] {
                throw AuthError.serverError(errorMessage)
            }
            throw AuthError.serverError("Server error: \(httpResponse.statusCode)")
        }
        
        return data
    }
}

// MARK: - Auth Errors
enum AuthError: Error, LocalizedError {
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
