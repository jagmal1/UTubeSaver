import { useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface UseDownloadReturn {
    download: (url: string, filename: string) => Promise<void>;
    progress: number;
    timeLeft: string | null;
    isDownloading: boolean;
    downloadStage: string;
    cancel: () => void;
}

export const useDownload = (): UseDownloadReturn => {
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStage, setDownloadStage] = useState<string>('Preparing...');
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const download = async (url: string, filename: string) => {
        setIsDownloading(true);
        setProgress(0);
        setTimeLeft('Calculating...');
        setDownloadStage('Downloading Video...');

        const controller = new AbortController();
        setAbortController(controller);

        const startTime = Date.now();
        const downloadId = uuidv4();
        
        // Connect to SSE for server-side progress
        const sseUrl = url.startsWith('http') 
            ? new URL('/api/progress', url.split('/api')[0] || 'http://localhost:3000').toString() 
            : `http://localhost:3000/api/progress`;
            
        // Use the base API_URL to construct the progress URL accurately
        const baseUrl = url.substring(0, url.indexOf('/api/')) + '/api';
        const progressUrl = `${baseUrl}/progress?id=${downloadId}`;
        const finalDownloadUrl = `${url}&id=${downloadId}`;

        const eventSource = new EventSource(progressUrl);
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.percent !== undefined) {
                    const newProgress = Math.round(data.percent);
                    
                    setProgress((prev) => {
                        // If progress was high and suddenly drops low, it's the second stream (audio)
                        if (prev > 80 && newProgress < 20) {
                            setDownloadStage('Downloading Audio...');
                        }
                        return newProgress;
                    });
                    
                    // Simple ETA based on server progress
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    if (data.percent > 0) {
                        const totalEstimatedTime = (elapsedTime / data.percent) * 100;
                        const estimatedSecondsLeft = totalEstimatedTime - elapsedTime;
                        if (estimatedSecondsLeft < 60) {
                            setTimeLeft(`${Math.ceil(estimatedSecondsLeft)}s remaining`);
                        } else {
                            const mins = Math.ceil(estimatedSecondsLeft / 60);
                            setTimeLeft(`${mins}m remaining`);
                        }
                    }
                }
            } catch (err) {
                // ignore parse errors
            }
        };

        try {
            const response = await axios.get(finalDownloadUrl, {
                responseType: 'blob',
                signal: controller.signal,
                onDownloadProgress: (progressEvent) => {
                    // Axios progress is just for the file transfer from our server to the browser,
                    // which is usually instant. We can let it jump to 100% at the very end.
                    if (progressEvent.loaded && progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        // Only update if it's very close to 100 to avoid jumping backward if server was at 99%
                        if (percent === 100) {
                            setProgress(100);
                            setDownloadStage('Transferring to device...');
                            setTimeLeft('Finishing...');
                        }
                    }
                },
            });

            // Trigger file save
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Download cancelled');
            } else {
                throw error;
            }
        } finally {
            eventSource.close();
            setIsDownloading(false);
            setProgress(0);
            setTimeLeft(null);
            setAbortController(null);
        }
    };

    const cancel = () => {
        if (abortController) {
            abortController.abort();
        }
    };

    return { download, progress, timeLeft, isDownloading, downloadStage, cancel };
};
