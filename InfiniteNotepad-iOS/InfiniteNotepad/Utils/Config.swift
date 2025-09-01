import Foundation

struct Config {
    // Replace these with your actual Supabase credentials
    static let supabaseURL = "https://tulppnxfffrbyllgkyng.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bHBwbnhmZmZyYnlsbGdreW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjM2MTksImV4cCI6MjA3MjI5OTYxOX0.wrahR8yVYgzCUecZpioifnJUjDrvlTAOaLqwBN0yD2Q"
    
    // API Base URL - replace with your deployed backend URL
    static let apiBaseURL = "https://infinitenotebook.onrender.com"
    
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
