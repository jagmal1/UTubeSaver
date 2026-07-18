import { Download, Play, Clock } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface Format {
    resolution: string;
    ext: string;
    filesize: number;
}

interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: number; // in seconds/formatted string? backend sends raw seconds usually, check backend code. 
    // Wait, backend code sends just "duration", typically seconds string or number from yt-dlp JSON.
    formats: Format[];
}

interface Props {
    video: VideoInfo;
    onDownload: (format: Format) => void;
    isDownloading: boolean;
    progress: number;
    timeLeft: string | null;
    downloadStage?: string;
    onCancel: () => void;
    onDownloadAudio: () => void;
}

const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
};

export const VideoCard = ({ video, onDownload, isDownloading, progress, timeLeft, downloadStage = 'Preparing...', onCancel, onDownloadAudio }: Props) => {
    const [selectedFormat, setSelectedFormat] = useState<Format | null>(video.formats[0] || null);

    return (
        <motion.div 
            className="glass-card overflow-hidden max-w-4xl mx-auto mt-8 perspective-1000"
            whileHover={{ rotateX: 1, rotateY: -1, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <div className="grid md:grid-cols-2 gap-0">
                <div className="relative group overflow-hidden bg-black aspect-video md:aspect-auto md:h-full">
                    <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(video.duration)}
                        </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Play className="w-12 h-12 text-white drop-shadow-lg fill-white" />
                    </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 line-clamp-2 leading-tight">
                            {video.title}
                        </h2>

                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Select Resolution</label>
                            <div className="grid grid-cols-2 gap-3">
                                {video.formats.map((fmt, idx) => (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={`${fmt.resolution}-${idx}`}
                                        onClick={() => setSelectedFormat(fmt)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${selectedFormat === fmt
                                            ? 'border-red-500 bg-red-50/50 text-red-700 shadow-sm shadow-red-500/20'
                                            : 'border-white/40 bg-white/40 hover:bg-white/60 text-gray-700 shadow-[0_4px_10px_rgb(0,0,0,0.02)]'
                                            }`}
                                    >
                                        <span className="font-semibold">{fmt.resolution}</span>
                                        <span className="text-xs opacity-75">{fmt.ext.toUpperCase()} • {formatSize(fmt.filesize)}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {isDownloading ? (
                        <div className="w-full mt-8">
                            <div className="flex justify-between text-sm font-medium mb-2 text-gray-700">
                                {progress > 0 ? (
                                    <>
                                        <span>Downloading... {progress}%</span>
                                        <span className="text-gray-400">{timeLeft}</span>
                                    </>
                                ) : (
                                    <span className="text-gray-500 animate-pulse">⏳ Preparing...</span>
                                )}
                            </div>
                            <div className="w-full bg-gray-100/50 rounded-full h-4 mb-4 overflow-hidden shadow-inner border border-white/50 backdrop-blur-sm">
                                {progress > 0 ? (
                                    <div
                                        className="bg-gradient-to-r from-red-500 to-rose-500 h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-[0_0_15px_rgba(225,29,72,0.5)]"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 animate-[pulse_2s_ease-in-out_infinite]"></div>
                                    </div>
                                ) : (
                                    <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-400 animate-[pulse_1.2s_ease-in-out_infinite] w-full opacity-50 shadow-[0_0_15px_rgba(225,29,72,0.3)]" />
                                )}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={onCancel}
                                className="w-full py-2.5 text-sm text-red-600 hover:text-white hover:bg-red-500 rounded-xl border border-red-200 transition-colors font-medium shadow-sm"
                            >
                                Cancel Download
                            </motion.button>
                        </div>
                    ) : (
                        <button
                            onClick={() => selectedFormat && onDownload(selectedFormat)}
                            disabled={!selectedFormat}
                            className="w-full mt-8 btn-primary flex items-center justify-center gap-2 group"
                        >
                            <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                            Download Now
                        </button>
                    )}

                    {!isDownloading && (
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={onDownloadAudio}
                            className="w-full mt-3 py-3 rounded-xl border border-white/60 bg-white/40 shadow-[0_4px_10px_rgb(0,0,0,0.03)] hover:border-red-200 hover:bg-white/80 text-gray-700 hover:text-red-600 font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="text-sm">Download as MP3 (Audio)</span>
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
