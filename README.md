# 📝 Infinite Notepad

A simple, beautiful web application for taking unlimited notes. Built with Node.js, Express, Supabase, and vanilla JavaScript.

## Features

- 🔐 **User Authentication**: Secure login/signup with email and password
- ✨ **Infinite Notes**: Create as many notes as you want
- 💾 **Auto-save**: Notes are automatically saved as you type
- 🔍 **Full-Text Search**: Powerful PostgreSQL-based search with ranking
- 🗄️ **Persistent Storage**: Notes are stored in Supabase database
- ⏰ **Timestamps**: Each note has creation and update timestamps
- 👤 **Personal Notes**: Each user can only see and edit their own notes
- 🎨 **Modern UI**: Beautiful, responsive design with glassmorphism effects
- 📱 **Mobile-friendly**: Works perfectly on all devices
- 🚀 **Fast**: Lightweight and fast loading with optimized search
- 🔄 **Real-time**: Changes are saved automatically with debouncing

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Modern CSS with glassmorphism design
- **Deployment**: Render.com ready

## Prerequisites

Before running this application, you need to set up a Supabase project:

1. **Create a Supabase account** at [supabase.com](https://supabase.com)
2. **Create a new project** in your Supabase dashboard
3. **Get your project credentials** (URL and anon key)
4. **Enable Authentication** in your Supabase project (it's enabled by default)

## Local Development

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   Then edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   NODE_ENV=development
   ```
4. **Set up the database**:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Run the SQL commands from `supabase-schema.sql`
5. **Start the development server**:
   ```bash
   npm run dev
   ```
6. **Open your browser** and go to `http://localhost:3000`
7. **Create an account** using the signup form or sign in if you already have one

## Deployment on Render

### Prerequisites for Deployment

1. **Set up Supabase database** (if not done already):
   - Create a Supabase project
   - Run the SQL commands from `supabase-schema.sql` in the SQL Editor
   - Get your project URL and anon key

### Option 1: Deploy from GitHub (Recommended)

1. **Push your code** to a GitHub repository
2. **Go to [Render.com](https://render.com)** and sign up/login
3. **Click "New +"** and select "Web Service"
4. **Connect your GitHub repository**
5. **Configure the service**:
   - **Name**: `infinite-notepad` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. **Add environment variables**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NODE_ENV`: `production`
7. **Click "Create Web Service"**

### Option 2: Deploy with render.yaml

1. **Push your code** to a GitHub repository
2. **Go to [Render.com](https://render.com)** and sign up/login
3. **Click "New +"** and select "Blueprint"
4. **Connect your GitHub repository**
5. **Render will automatically detect** the `render.yaml` file
6. **Add environment variables** in the Render dashboard:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
7. **Click "Apply"** to deploy

## How to Use

1. **Sign up** for a new account or **sign in** with existing credentials
2. **Create a new note** by clicking the "New Note" button
3. **Start typing** in any note - it will auto-save after 1 second
4. **Delete notes** using the delete button on each note
5. **Save all notes** manually using the "Save All" button
6. **Notes are sorted** by most recently updated
7. **Logout** when you're done to keep your notes secure

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Sign in with email and password
- `GET /api/auth/verify` - Verify authentication token

### Notes (requires authentication)
- `GET /api/notes` - Get all notes for the authenticated user
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

## Database Schema

The application uses a PostgreSQL database through Supabase with the following schema:

```sql
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Notes Storage

Notes are now stored in a Supabase PostgreSQL database, which means:
- ✅ **Persistent**: Notes survive server restarts
- ✅ **Scalable**: Can handle thousands of notes
- ✅ **Reliable**: Backed by PostgreSQL
- ✅ **Timestamps**: Automatic creation and update timestamps
- ✅ **Secure**: Each user can only access their own notes
- ✅ **Authenticated**: All operations require valid user authentication

## Customization

- **Colors**: Modify the CSS variables in `public/styles.css`
- **Auto-save delay**: Change the timeout in `public/script.js` (currently 1000ms)
- **Note layout**: Adjust the grid in `public/styles.css`

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy Note-taking! 📝✨**
