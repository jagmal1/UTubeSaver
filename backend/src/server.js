import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getVideoInfo, downloadVideo, downloadAudio } from './utils/downloader.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    exposedHeaders: ['Content-Length', 'Content-Disposition']
}));
app.use(express.json());

// Store SSE clients for progress updates
const progressClients = new Map();

// Validation schemas
const urlSchema = z.object({
    url: z.string().url().refine((url) => url.includes('youtube.com') || url.includes('youtu.be'), {
        message: "Must be a valid YouTube URL"
    })
});
// Note: yt-dlp handles /shorts/ automatically, and youtube.com/shorts/ contains 'youtube.com', so regex might be fine.
// But mostly 'Shorts' UI request implies maybe identifying it or just general support.
// The current validation `includes('youtube.com')` actually ALREADY supports shorts.
// I will double check if VideoInput or anything else blocks it.

// Routes
app.get('/api/info', async (req, res) => {
    try {
        const { url } = urlSchema.parse(req.query);
        const info = await getVideoInfo(url);
        res.json(info);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
        } else {
            console.error('Info Error:', error);
            res.status(500).json({ error: 'Failed to fetch video info' });
        }
    }
});

app.get('/api/progress', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    progressClients.set(id, res);

    req.on('close', () => {
        progressClients.delete(id);
    });
});

app.get('/api/download', async (req, res) => {
    try {
        const { url, formatItag } = req.query;
        console.log(`[Server] Download Request - URL: ${url}, Format: ${formatItag}`);
        // Basic validation
        if (!url) return res.status(400).json({ error: 'URL is required' });

        // Fetch video info first to get the title
        const info = await getVideoInfo(url);
        const safeTitle = info.title.replace(/[^a-zA-Z0-9]/g, '_');

        // Set headers for file download
        res.header('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const { id } = req.query;
        const onProgress = (percent) => {
            if (id && progressClients.has(id)) {
                progressClients.get(id).write(`data: ${JSON.stringify({ percent })}\n\n`);
            }
        };

        // Stream video
        await downloadVideo(url, formatItag, res, onProgress);

    } catch (error) {
        console.error('Download Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
        }
    }
});

app.get('/api/download-audio', async (req, res) => {
    try {
        const { url } = req.query;
        console.log(`[Server] Audio Download Request - URL: ${url}`);

        if (!url) return res.status(400).json({ error: 'URL is required' });

        // Get title for filename
        const info = await getVideoInfo(url);
        const safeTitle = info.title.replace(/[^a-zA-Z0-9]/g, '_');

        res.header('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const { id } = req.query;
        const onProgress = (percent) => {
            if (id && progressClients.has(id)) {
                progressClients.get(id).write(`data: ${JSON.stringify({ percent })}\n\n`);
            }
        };

        await downloadAudio(url, res, onProgress);

    } catch (error) {
        console.error('Audio Download Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Audio download failed' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
