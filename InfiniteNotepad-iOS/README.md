# 📱 Infinite Notepad iOS App

A native iOS app built with SwiftUI that connects to the same Supabase backend as the web version. Create, edit, and manage your notes with a beautiful native iOS interface.

## Features

- 🔐 **Secure Authentication**: Sign up and sign in with email/password
- ✨ **Native iOS Experience**: Built with SwiftUI for iOS 16+
- 📝 **CRUD Operations**: Create, read, update, and delete notes
- 🔄 **Real-time Sync**: Notes sync with your web app
- 💾 **Offline Support**: Notes are cached locally
- 🎨 **Modern UI**: Native iOS design with pull-to-refresh
- 📱 **Universal**: Works on iPhone and iPad

## Prerequisites

- **Xcode 15.0+**
- **iOS 16.0+** deployment target
- **Supabase project** (same as web app)
- **Backend API** running (your Render deployment)

## Setup Instructions

### 1. Configure Your Backend

First, make sure your web backend is deployed and running on Render.

### 2. Update Configuration

Edit `Sources/InfiniteNotepad/Utils/Config.swift`:

```swift
struct Config {
    // Replace with your actual Supabase credentials
    static let supabaseURL = "https://your-project-id.supabase.co"
    static let supabaseAnonKey = "your_supabase_anon_key"
    
    // Replace with your deployed backend URL
    static let apiBaseURL = "https://your-app-name.onrender.com"
    
    // Local development URL (for testing)
    static let localAPIBaseURL = "http://localhost:3000"
}
```

### 3. Open in Xcode

1. **Open Xcode**
2. **File** → **Open**
3. **Select** `InfiniteNotepad.xcodeproj`
4. **Wait** for package dependencies to resolve

### 4. Build and Run

1. **Select** your target device or simulator
2. **Press** `Cmd + R` to build and run
3. **Wait** for the app to launch

## Project Structure

```
InfiniteNotepad-iOS/
├── Sources/InfiniteNotepad/
│   ├── Models/
│   │   ├── Note.swift          # Note data model
│   │   └── User.swift          # User and auth models
│   ├── Services/
│   │   ├── AuthService.swift   # Authentication logic
│   │   └── NotesService.swift  # Notes CRUD operations
│   ├── Views/
│   │   ├── AuthView.swift      # Login/signup screen
│   │   ├── NotesListView.swift # Notes list screen
│   │   └── NoteDetailView.swift # Note editing screen
│   ├── Utils/
│   │   └── Config.swift        # Configuration settings
│   └── InfiniteNotepadApp.swift # Main app entry point
├── Package.swift               # Swift Package Manager config
└── README.md
```

## How to Use

### 1. First Launch
- **Sign up** for a new account or **sign in** with existing credentials
- The app will connect to your Supabase backend

### 2. Creating Notes
- **Tap** the menu button (⋯) in the top right
- **Select** "New Note"
- **Type** your content
- **Tap** "Save" to create the note

### 3. Editing Notes
- **Tap** any note in the list to open it
- **Tap** "Edit" to make changes
- **Tap** "Save" to update the note

### 4. Deleting Notes
- **Swipe left** on any note in the list
- **Tap** "Delete" to remove the note

### 5. Syncing
- **Pull down** on the notes list to refresh
- Notes automatically sync with your web app

## API Integration

The iOS app uses the same REST API as the web app:

### Authentication Endpoints
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/verify` - Verify token

### Notes Endpoints
- `GET /api/notes` - Get user's notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

## Development

### Local Development

To test with your local backend:

1. **Start** your local Node.js server (`npm run dev`)
2. **Update** `Config.swift` to use `localAPIBaseURL`
3. **Run** the app in the iOS Simulator

### Debugging

- **Check** Xcode console for API errors
- **Verify** your Supabase credentials in `Config.swift`
- **Ensure** your backend is running and accessible

## Deployment

### TestFlight (Recommended)

1. **Archive** your app in Xcode
2. **Upload** to App Store Connect
3. **Add** to TestFlight for testing
4. **Submit** for App Store review

### App Store

1. **Complete** TestFlight testing
2. **Submit** for App Store review
3. **Wait** for Apple's approval
4. **Release** to the App Store

## Troubleshooting

### Common Issues

**"Failed to load notes"**
- Check your backend URL in `Config.swift`
- Verify your backend is running
- Check network connectivity

**"Authentication failed"**
- Verify Supabase credentials
- Check email confirmation status
- Ensure backend auth endpoints are working

**"Build errors"**
- Clean build folder (`Cmd + Shift + K`)
- Reset package caches
- Update to latest Xcode

### Debug Mode

The app automatically uses local URLs in debug mode and production URLs in release mode.

## Security

- **JWT tokens** are stored securely in UserDefaults
- **API calls** use HTTPS
- **User data** is isolated by Supabase RLS policies
- **No sensitive data** is stored in the app bundle

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy Note-taking on iOS! 📱✨**
