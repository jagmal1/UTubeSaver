# Deployment Guide

This project is configured for deployment with **Netlify (Frontend)** and any **Docker-compatible platform (Backend)** like Render, Railway, or a VPS.

## 1. Frontend Deployment (Netlify)

The frontend is configured with `netlify.toml` for easy deployment.

1.  Push your code to GitHub.
2.  Log in to [Netlify](https://www.netlify.com/).
3.  Click **"Add new site"** -> **"Import from Git"**.
4.  Select your repository.
5.  Netlify should detect the configuration automatically:
    - **Build command**: `npm run build`
    - **Publish directory**: `dist`
6.  **Environment Variables**:
    - Go to **Site settings** -> **Environment variables**.
    - Add `VITE_API_URL` with the URL of your deployed backend (e.g., `https://your-app-backend.onrender.com/api`).
    - *Note:* Ensure you do NOT have a trailing slash (unless your code handles it).

## 2. Backend Deployment (Render / Railway / VPS)

Since the backend requires `ffmpeg` and `yt-dlp`, it cannot run on standard serverless functions (like Netlify Functions or Vercel API routes). It must run in a Docker container.

### Option A: Deploy to Render (Recommended)

1.  Log in to [Render](https://render.com/).
2.  Click **"New"** -> **"Web Service"**.
3.  Connect your GitHub repository.
4.  Select the `backend` directory as the **Root Directory** (Important!).
5.  Choose **Docker** as the Runtime.
6.  Click **Create Web Service**.
7.  Copy the provided URL (e.g., `https://your-app.onrender.com`) and use it for the frontend's `VITE_API_URL`.

### Option B: Deploy to VPS (DigitalOcean / AWS / Hetzner)

You can use the provided `docker-compose.prod.yml` to run the full stack (or just backend) on a VPS.

1.  SSH into your VPS.
2.  Clone the repository.
3.  Run:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```
4.  The backend will be available at `http://your-vps-ip:3000`.

## 3. Local Production Test

To verify the production build locally before deploying:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

- Frontend: http://localhost:80
- Backend: http://localhost:3000
