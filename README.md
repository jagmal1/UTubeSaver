# YouTube HD Video Downloader

A modern, production-ready web application to download YouTube videos in HD quality (720p, 1080p) with audio.

## Features
- 🎥 **HD Content**: Download 720p, 1080p, and other resolutions.
- 🔊 **Auto-Merge**: Automatically merges video and audio streams using `yt-dlp`.
- ⚡ **Streamed**: Files are streamed directly to your client, no server side storage wait time.
- 🎨 **Modern UI**: Built with React, Tailwind CSS, and Lucide Icons.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Child Process
- **Tools**: yt-dlp (required on host), FFmpeg (optional but recommended for merging)

## Prerequisites
1. **Node.js**: v18+ recommended.
2. **yt-dlp**: Must be installed and in your system PATH.
   - Mac: `brew install yt-dlp`
3. **FFmpeg**: Required for merging high-quality video (which is often video-only) with audio.
   - Mac: `brew install ffmpeg`

## Setup & Run

### 1. Backend
```bash
cd backend
npm install
npm start
```
Server runs on `http://localhost:3000`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Client runs on `http://localhost:5173`

## Disclaimer
This tool is for educational purposes only. Please respect YouTube's Terms of Service and copyright laws. Do not download copyrighted content without permission.
