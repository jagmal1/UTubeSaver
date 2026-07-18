import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp');

/**
 * Fetches video information using yt-dlp
 */
export const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        // Use --no-playlist to avoid downloading entire playlists
        const ytDlp = spawn('yt-dlp', [
            '-J', 
            '--no-playlist', 
            '--cookies-from-browser', 'firefox',
            url
        ]);

        let stdout = '';
        let stderr = '';

        ytDlp.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ytDlp.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(stderr || 'Failed to fetch info'));
            }

            try {
                const data = JSON.parse(stdout);

                // Filter formats with video, height >= 360 (up to 4K)
                const formats = data.formats.filter(f =>
                    f.vcodec !== 'none' && // must have video
                    f.height >= 360
                ).map(f => ({
                    format_id: f.format_id,
                    ext: 'mp4',
                    resolution: `${f.height}p`,
                    filesize: f.filesize || f.filesize_approx || 0,
                    vcodec: f.vcodec
                }));

                const uniqueFormats = [];
                const seen = new Set();

                // Sort by resolution (desc) then by codec (avc > av1 > vp9)
                formats.sort((a, b) => {
                    const resA = parseInt(a.resolution);
                    const resB = parseInt(b.resolution);
                    if (resA !== resB) return resB - resA;

                    const getCodecWeight = (c) => {
                        if (c.includes('avc')) return 3;
                        if (c.includes('av1')) return 2;
                        if (c.includes('vp9')) return 1;
                        return 0;
                    };

                    return getCodecWeight(b.vcodec || '') - getCodecWeight(a.vcodec || '');
                });

                formats.forEach(f => {
                    const key = `${f.resolution}`;
                    if (!seen.has(key)) {
                        uniqueFormats.push(f);
                        seen.add(key);
                    }
                });

                uniqueFormats.sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution));

                resolve({
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    formats: uniqueFormats
                });
            } catch (err) {
                reject(err);
            }
        });
    });
};

/**
 * Downloads video to a local temp file then streams it
 */
export const downloadVideo = (url, formatId, res, onProgress) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const fileName = `${uuidv4()}.mp4`;
        const filePath = path.join(TEMP_DIR, fileName);

        // Improved format selection: 
        // Prioritize AVC (h264) and AAC for maximum compatibility with QuickTime/Apple devices
        // This selection logic tries to find video with AVC codec, defaulting to standard behavior if not found
        let formatArg = 'bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

        if (formatId) {
            // Try: 1. Format + Best Audio (for video-only streams)
            //      2. Format Only (for combined streams like 18/22)
            //      3. Fallback to best
            formatArg = `${formatId}+bestaudio[ext=m4a]/${formatId}/best[ext=mp4]/best`;
        }

        const args = [
            url,
            '--no-playlist',
            '--cookies-from-browser', 'firefox',
            '-f', formatArg,
            '--merge-output-format', 'mp4',
            // Force standard pixel format (yuv420p) to avoid "raddish" or washed out colors in QuickTime/Players
            // This is often needed when source is different flavor or HDR is mishandled
            '--postprocessor-args', 'VideoConvertor:-pix_fmt yuv420p',
            '-o', filePath,
            '--newline'
        ];

        console.log(`[Backend] yt-dlp Args:`, args.join(' '));

        console.log(`[Backend] Starting download: ${url}`);
        console.log(`[Backend] Target File: ${filePath}`);

        const ytDlp = spawn('yt-dlp', args);

        ytDlp.stdout.on('data', (data) => {
            const log = data.toString();
            // Extract percentage for SSE
            const percentMatch = log.match(/([\d.]+)%/);
            if (percentMatch && onProgress) {
                const percent = parseFloat(percentMatch[1]);
                if (!isNaN(percent)) {
                    // console.log('[yt-dlp progress]', percent);
                    onProgress(percent);
                }
            }
        });

        ytDlp.stderr.on('data', (data) => {
            // Logging progress to console for debugging
            const log = data.toString();
            
            // Extract percentage for SSE
            const percentMatch = log.match(/([\d.]+)%/);
            if (percentMatch && onProgress) {
                const percent = parseFloat(percentMatch[1]);
                if (!isNaN(percent)) onProgress(percent);
            }

            if (log.includes('%')) {
                process.stdout.write(`\r[yt-dlp] ${log.trim()}`);
            }
        });

        ytDlp.on('close', (code) => {
            console.log('\n');
            if (code !== 0) {
                console.error(`[Backend] yt-dlp failed with code ${code}`);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return reject(new Error(`yt-dlp failed with code ${code}`));
            }

            if (!fs.existsSync(filePath)) {
                console.error(`[Backend] File not found after download: ${filePath}`);
                return reject(new Error('Downloaded file missing'));
            }

            const stats = fs.statSync(filePath);
            console.log(`[Backend] Streaming ${stats.size} bytes...`);

            res.header('Content-Length', stats.size);
            res.header('Content-Type', 'video/mp4');

            const readStream = fs.createReadStream(filePath);

            readStream.on('error', (err) => {
                console.error('[Backend] ReadStream Error:', err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.end();
            });

            readStream.pipe(res);

            res.on('finish', () => {
                console.log('[Backend] Stream finished. Deleting temp file.');
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                resolve();
            });

            res.on('close', () => {
                // If the connection was closed before finishing
                if (fs.existsSync(filePath)) {
                    setTimeout(() => {
                        if (fs.existsSync(filePath)) {
                            try { fs.unlinkSync(filePath); } catch (e) { }
                        }
                    }, 10000);
                }
            });
        });
    });
};

/**
 * Downloads audio from video, converts to MP3, then streams it
 */
export const downloadAudio = (url, res, onProgress) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        const fileName = `${uuidv4()}.mp3`;
        const filePath = path.join(TEMP_DIR, fileName);

        // xtract audio, encode to mp3
        const args = [
            url,
            '--no-playlist',
            '--cookies-from-browser', 'firefox',
            // Force best audio source before conversion to ensure "audio quality must be as of youtube"
            '-f', 'bestaudio',
            '-x', // Extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '0', // Best quality (VBR) ~320k equivalent or transparent
            '-o', filePath,
            '--newline'
        ];

        console.log(`[Backend] yt-dlp Audio Args:`, args.join(' '));
        console.log(`[Backend] Starting audio download: ${url}`);

        const ytDlp = spawn('yt-dlp', args);

        ytDlp.stdout.on('data', (data) => {
            const log = data.toString();
            // Extract percentage for SSE
            const percentMatch = log.match(/([\d.]+)%/);
            if (percentMatch && onProgress) {
                const percent = parseFloat(percentMatch[1]);
                if (!isNaN(percent)) {
                    onProgress(percent);
                }
            }
        });

        ytDlp.stderr.on('data', (data) => {
            const log = data.toString();
            
            // Extract percentage for SSE
            const percentMatch = log.match(/([\d.]+)%/);
            if (percentMatch && onProgress) {
                const percent = parseFloat(percentMatch[1]);
                if (!isNaN(percent)) onProgress(percent);
            }

            if (log.includes('%')) {
                process.stdout.write(`\r[yt-dlp-audio] ${log.trim()}`);
            }
        });

        ytDlp.on('close', (code) => {
            console.log('\n');
            if (code !== 0) {
                console.error(`[Backend] yt-dlp audio failed with code ${code}`);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return reject(new Error(`yt-dlp failed with code ${code}`));
            }

            if (!fs.existsSync(filePath)) {
                console.error(`[Backend] Audio file not found: ${filePath}`);
                return reject(new Error('Downloaded file missing'));
            }

            const stats = fs.statSync(filePath);
            console.log(`[Backend] Streaming audio ${stats.size} bytes...`);

            res.header('Content-Length', stats.size);
            res.header('Content-Type', 'audio/mpeg');

            const readStream = fs.createReadStream(filePath);

            readStream.on('error', (err) => {
                console.error('[Backend] ReadStream Error:', err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.end();
            });

            readStream.pipe(res);

            res.on('finish', () => {
                console.log('[Backend] Audio stream finished. Deleting temp file.');
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                resolve();
            });

            res.on('close', () => {
                if (fs.existsSync(filePath)) {
                    setTimeout(() => {
                        if (fs.existsSync(filePath)) {
                            try { fs.unlinkSync(filePath); } catch (e) { }
                        }
                    }, 10000);
                }
            });
        });
    });
};
