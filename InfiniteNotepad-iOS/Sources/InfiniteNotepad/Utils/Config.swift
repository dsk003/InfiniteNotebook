import Foundation

struct Config {
    // Replace these with your actual Supabase credentials
    static let supabaseURL = "YOUR_SUPABASE_URL"
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
    
    // API Base URL - replace with your deployed backend URL
    static let apiBaseURL = "https://your-app-name.onrender.com"
    
    // Local development URL (for testing)
    static let localAPIBaseURL = "http://localhost:3000"
    
    // Use local URL if running in simulator, production URL otherwise
    static var currentAPIBaseURL: String {
        #if DEBUG
        return localAPIBaseURL
        #else
        return apiBaseURL
        #endif
    }
}
