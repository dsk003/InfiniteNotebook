import SwiftUI

@main
struct InfiniteNotepadApp: App {
    @StateObject private var authService = AuthService()
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isAuthenticated {
                    NotesListView()
                } else {
                    AuthView()
                }
            }
            .environmentObject(authService)
            .onAppear {
                authService.checkAuthState()
            }
        }
    }
}
