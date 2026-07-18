import { useState } from 'react';
import { ShieldAlert, Play} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoInput } from './components/VideoInput';
import { VideoCard } from './components/VideoCard';
import { useDownload } from './hooks/useDownload';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const { download, progress, timeLeft, isDownloading, downloadStage, cancel } = useDownload();
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const fetchVideoInfo = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideo(null);
    try {
      const response = await fetch(`${API_URL}/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch video');

      setVideo({ ...data, url }); // keep original url for download
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: any) => {
    if (!video) return;

    // Construct download URL for backend
    let downloadEndpoint = `${API_URL}/download?url=${encodeURIComponent(video.url)}`;
    if (format && format.format_id) {
      downloadEndpoint += `&formatItag=${encodeURIComponent(format.format_id)}`;
    }

    // Construct filename: clean up title and remove everything after # (Shorts/Tags)
    let safeTitle = video.title.split('#')[0].trim();
    safeTitle = safeTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTitle}.mp4`;

    try {
      await download(downloadEndpoint, filename);
    } catch (err) {
      setError('Download failed');
    }
  };

  const handleAudioDownload = async () => {
    if (!video) return;

    // Construct download URL for backend
    const downloadEndpoint = `${API_URL}/download-audio?url=${encodeURIComponent(video.url)}`;

    // Construct filename
    let safeTitle = video.title.split('#')[0].trim();
    safeTitle = safeTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTitle}.mp3`;

    try {
      await download(downloadEndpoint, filename);
    } catch (err) {
      setError('Audio Download failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 relative selection:bg-red-200 selection:text-red-900">
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-400/20 blur-[100px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-400/20 blur-[100px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      <header className="relative z-10 glass-card mx-4 mt-4 py-4 px-6 md:mx-auto md:w-full md:max-w-6xl md:mt-6 rounded-2xl flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2.5 rounded-xl text-white shadow-lg shadow-red-500/30">
            <Play size={24} fill="currentColor" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            UTube<span className="text-red-600">Saver</span>
          </h1>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-semibold border border-red-100"
        >
          
          Pro Edition
        </motion.div>
      </header>

      <main className="flex-1 relative z-10 container mx-auto px-4 py-6 md:py-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-3 tracking-tighter leading-tight drop-shadow-sm">
            Youtube Video <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-600">
              Downloader
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Experience the future of video downloads. Lightning fast, crystal clear 4K quality, wrapped in a beautiful interface.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-3xl perspective-1000"
        >
          <VideoInput onSearch={fetchVideoInfo} isLoading={loading} />
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mt-8 p-4 bg-red-50/80 backdrop-blur-md border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/5 max-w-2xl w-full"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {video && (
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
              className="w-full"
            >
              <VideoCard
                video={video}
                onDownload={handleDownload}
                isDownloading={isDownloading}
                progress={progress}
                timeLeft={timeLeft}
                downloadStage={downloadStage}
                onCancel={cancel}
                onDownloadAudio={handleAudioDownload}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mt-auto">
        {/* Disclaimer Banner */}
        <div className="mx-4 mb-4 md:mx-auto md:max-w-4xl">
          <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200 rounded-2xl px-6 py-4 text-sm text-amber-800 shadow-sm">
            <p className="font-bold text-amber-900 mb-1 flex justify-center items-center gap-2">
            ⚠️ Legal Disclaimer & Fair Use Notice 
            </p>
            <p className="leading-relaxed text-amber-700 justify-center text-[8px]">
              This tool is intended <strong>strictly for educational purposes and personal, non-commercial use</strong> — such as offline viewing of videos you own or have rights to. 
              Downloading copyrighted content without the express permission of the rights holder may violate{' '}
              <strong>YouTube's Terms of Service</strong>, copyright laws, and the{' '}
              <strong>Digital Millennium Copyright Act (DMCA)</strong>. 
              By using this tool, you agree that you are solely responsible for ensuring your downloads comply with all applicable laws. 
              The developers of UTubeSaver Pro do not endorse or encourage copyright infringement.
            </p>
          </div>
        </div>

        <div className="py-6 text-center text-xs font-medium text-gray-400">
          <p>© 2026 UTubeSaver Pro. For educational purposes only. Respect creators' rights.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
