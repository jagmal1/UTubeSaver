import { Search, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
    onSearch: (url: string) => void;
    isLoading: boolean;
}

const isValidYouTubeUrl = (text: string): boolean => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/.test(text.trim());
};

export const VideoInput = ({ onSearch, isLoading }: Props) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onSearch(url.trim());
        }
    };

    const handleClear = () => {
        setUrl('');
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text');
        if (isValidYouTubeUrl(pasted)) {
            setTimeout(() => onSearch(pasted.trim()), 0);
        }
    };

    return (
        <motion.div 
            className="w-full max-w-2xl mx-auto perspective-1000"
            whileHover={{ scale: 1.02, rotateX: 2, rotateY: -1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <form onSubmit={handleSubmit} className="relative group">
                {/* Glowing backdrop for 3D effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-rose-400 rounded-[1.25rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Paste YouTube Video or Shorts URL here..."
                        className="input-field pl-12 pr-40 text-lg py-5 placeholder:text-gray-400 text-gray-800"
                        disabled={isLoading}
                    />
                    
                    <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                        {url && !isLoading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-2 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center mr-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading || !url}
                            className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 h-full rounded-xl font-semibold text-sm hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2 transition-all duration-300"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Analyze'}
                        </button>
                    </div>
                </div>
            </form>
        </motion.div>
    );
};
