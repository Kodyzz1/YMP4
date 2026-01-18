# YMP4
A YouTube to MP4 Converter

A YouTube to MP4 converter with a Render backend API for server-side video extraction. The frontend provides a beautiful UI with real-time progress tracking.

## Features

- 🎥 Convert YouTube videos to MP4 format
- 🖥️ Server-side video extraction using Render API
- 📊 Real-time progress tracking
- 🎨 Modern, responsive UI
- 🗄️ Optional MongoDB Atlas integration for download history
- ⚡ Fast and efficient
- 🚀 Easy deployment on Render

## Architecture

- **Frontend**: Static HTML/JS/CSS (can be hosted on Firebase, GitHub Pages, Netlify, etc.)
- **Backend**: Node.js/Express API on Render
- **Database**: MongoDB Atlas (optional, for storing download history)

## Setup

### Prerequisites

- Node.js 18+ installed
- A Render account (free tier available)
- MongoDB Atlas account (optional, for download history)

### Backend Setup (Render)

1. **Create a Render account** at [render.com](https://render.com)

2. **Set up MongoDB Atlas (Optional)**:
   - Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/ymp4`

3. **Deploy to Render**:
   ```bash
   # Option 1: Deploy via Render Dashboard
   # - Connect your GitHub repository
   # - Select the server/ directory as root
   # - Use build command: npm install
   # - Use start command: npm start
   # - Add environment variables (see below)

   # Option 2: Use Render CLI
   render deploy
   ```

4. **Environment Variables on Render**:
   - `PORT`: 3000 (usually set automatically)
   - `MONGODB_URI`: Your MongoDB Atlas connection string (optional)
   - `FRONTEND_URL`: Your frontend URL for CORS (e.g., `https://your-app.web.app`)

5. **Get your API URL**:
   - After deployment, you'll get a URL like: `https://your-service-name.onrender.com`
   - Copy this URL for the frontend configuration

### Frontend Setup

1. **Update API URL**:
   
   Create `config.js` from `config.example.js`:
   ```javascript
   window.API_URL = 'https://your-service-name.onrender.com';
   ```
   
   Or update `app.js` directly in the `getApiUrl()` method.

2. **For Local Development**:
   - The app automatically uses `http://localhost:3000` when running on localhost
   - Start the backend server: `cd server && npm install && npm start`

3. **Deploy Frontend** (choose one):
   
   **Option A: Firebase Hosting**:
   ```bash
   firebase deploy --only hosting
   ```
   
   **Option B: GitHub Pages / Netlify / Vercel**:
   - Just deploy the root directory (HTML/CSS/JS files)
   - Make sure `config.js` is included or update `app.js` with your API URL

## Local Development

### Backend

```bash
cd server
npm install
npm run dev  # Uses nodemon for auto-reload
# Server runs on http://localhost:3000
```

### Frontend

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Open http://localhost:8000
```

## Project Structure

```
YMP4/
├── index.html              # Main HTML file
├── app.js                 # JavaScript application logic (frontend)
├── style.css              # Styling
├── config.example.js      # Example config file
├── server/                # Backend API
│   ├── index.js          # Express server
│   ├── package.json      # Dependencies
│   └── .env.example      # Environment variables example
├── render.yaml            # Render deployment configuration
└── README.md              # This file
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/extract?videoId=VIDEO_ID` - Extract video information and streaming URLs
- `GET /api/stats` - Get download statistics (requires MongoDB)

## Usage

1. Deploy the backend to Render
2. Update the frontend `config.js` with your Render API URL
3. Deploy the frontend (Firebase, GitHub Pages, etc.)
4. Open the app in your browser
5. Paste a YouTube URL and click "Convert to MP4"

## How It Works

1. **Frontend**: User enters YouTube URL, which is sent to Render API
2. **Backend (Render API)**: Uses `ytdl-core` to extract video information and streaming URLs
3. **Frontend**: Downloads the video stream directly from YouTube with progress tracking
4. **Client-side**: Converts stream to MP4 blob and triggers download

## Configuration

### Environment Variables (Backend)

Create `server/.env` file (or set in Render dashboard):

```env
PORT=3000
FRONTEND_URL=https://your-frontend-url.com
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ymp4  # Optional
```

### Frontend Configuration

Create `config.js` (copy from `config.example.js`):

```javascript
window.API_URL = 'https://your-service-name.onrender.com';
```

## Limitations

- **YouTube Policies**: Some videos may be restricted or unavailable for download
- Large videos may take time to download depending on connection speed
- Render free tier has limitations (sleeps after inactivity)
- Video extraction requires server resources

## Troubleshooting

### API not responding
- Check if Render service is running (free tier sleeps after inactivity)
- Verify API URL in `config.js` matches your Render service URL
- Check CORS settings in server if frontend is on a different domain

### Video extraction fails
- Video may be restricted or private
- YouTube may have changed their API structure
- Check server logs on Render dashboard

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This tool is for educational purposes. Respect YouTube's Terms of Service and copyright laws when downloading videos. Only download videos you have permission to download.
