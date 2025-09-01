# 📝 Infinite Notepad

A simple, beautiful web application for taking unlimited notes. Built with Node.js, Express, and vanilla JavaScript.

## Features

- ✨ **Infinite Notes**: Create as many notes as you want
- 💾 **Auto-save**: Notes are automatically saved as you type
- 🎨 **Modern UI**: Beautiful, responsive design with glassmorphism effects
- 📱 **Mobile-friendly**: Works perfectly on all devices
- 🚀 **Fast**: Lightweight and fast loading
- 🔄 **Real-time**: Changes are saved automatically with debouncing

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Modern CSS with glassmorphism design
- **Deployment**: Render.com ready

## Local Development

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and go to `http://localhost:3000`

## Deployment on Render

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
6. **Click "Create Web Service"**

### Option 2: Deploy with render.yaml

1. **Push your code** to a GitHub repository
2. **Go to [Render.com](https://render.com)** and sign up/login
3. **Click "New +"** and select "Blueprint"
4. **Connect your GitHub repository**
5. **Render will automatically detect** the `render.yaml` file
6. **Click "Apply"** to deploy

## How to Use

1. **Create a new note** by clicking the "New Note" button
2. **Start typing** in any note - it will auto-save after 1 second
3. **Delete notes** using the delete button on each note
4. **Save all notes** manually using the "Save All" button
5. **Notes are sorted** by most recently updated

## API Endpoints

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

## Notes Storage

Currently, notes are stored in memory, which means they will be lost when the server restarts. For production use, consider:

- Adding a database (MongoDB, PostgreSQL, etc.)
- Using file-based storage
- Implementing user authentication for personal note storage

## Customization

- **Colors**: Modify the CSS variables in `public/styles.css`
- **Auto-save delay**: Change the timeout in `public/script.js` (currently 1000ms)
- **Note layout**: Adjust the grid in `public/styles.css`

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy Note-taking! 📝✨**
