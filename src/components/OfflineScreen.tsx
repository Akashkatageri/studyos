import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WifiOff, RefreshCw, Cloud } from 'lucide-react';

interface OfflineScreenProps {
  onRetry?: () => Promise<void> | void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } catch (err) {
      console.error("[StudyOS OfflineScreen] Retry check failed:", err);
    } finally {
      // Keep spinner active briefly to indicate action
      setTimeout(() => {
        setIsRetrying(false);
      }, 600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-[99999] bg-[#0b0a13] text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-900/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main card container */}
      <motion.div 
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md w-full bg-[#131120]/90 border border-purple-500/15 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center"
      >
        {/* Offline indicator badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-6">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode</span>
        </div>

        {/* Mascot Container: PanPan Sleeping with Floating Zzz */}
        <div className="relative mb-6 flex items-center justify-center w-36 h-36">
          {/* Sleeping Zzz animations floating up */}
          <div className="absolute -top-3 right-3 flex flex-col items-start pointer-events-none z-10">
            <motion.span
              animate={{ 
                y: [-2, -22], 
                x: [0, 8, 14], 
                opacity: [0, 1, 0],
                scale: [0.6, 1, 1.2]
              }}
              transition={{ 
                duration: 2.4, 
                repeat: Infinity, 
                ease: "easeOut",
                delay: 0 
              }}
              className="text-purple-300 font-bold text-lg leading-none absolute"
            >
              Z
            </motion.span>
            <motion.span
              animate={{ 
                y: [-2, -26], 
                x: [0, 10, 18], 
                opacity: [0, 1, 0],
                scale: [0.5, 0.9, 1.1]
              }}
              transition={{ 
                duration: 2.4, 
                repeat: Infinity, 
                ease: "easeOut",
                delay: 0.8 
              }}
              className="text-indigo-300 font-bold text-sm leading-none absolute"
            >
              z
            </motion.span>
            <motion.span
              animate={{ 
                y: [-2, -30], 
                x: [0, 12, 22], 
                opacity: [0, 1, 0],
                scale: [0.4, 0.8, 1.0]
              }}
              transition={{ 
                duration: 2.4, 
                repeat: Infinity, 
                ease: "easeOut",
                delay: 1.6 
              }}
              className="text-violet-400 font-bold text-xs leading-none absolute"
            >
              z
            </motion.span>
          </div>

          {/* Sleeping Glow Ring */}
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-purple-600/20 blur-md"
          />

          {/* PanPan Mascot Character */}
          <div className="relative z-0 w-32 h-32 rounded-full bg-gradient-to-b from-purple-900/40 to-[#18152c] border border-purple-500/20 flex flex-col items-center justify-center p-3 shadow-inner">
            {/* Sleeping Panda Illustration */}
            <div className="relative text-6xl select-none filter drop-shadow-md transform hover:scale-105 transition-transform">
              🐼
            </div>
            
            {/* Sleeping status badge */}
            <span className="mt-1 text-[11px] font-semibold text-purple-300/80 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
              <span>💤</span> PanPan is sleeping
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3">
          StudyOS is currently unavailable
        </h2>

        {/* Description */}
        <p className="text-sm text-zinc-300 leading-relaxed mb-8 max-w-sm">
          Your progress, streaks, and friends are stored securely in the cloud. Connect to the internet to continue.
        </p>

        {/* Cloud feature badges */}
        <div className="w-full grid grid-cols-3 gap-2 mb-8 text-xs text-zinc-400">
          <div className="flex flex-col items-center p-2 rounded-xl bg-purple-950/20 border border-purple-800/15">
            <span className="text-base mb-1">🔥</span>
            <span>Streaks</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-purple-950/20 border border-purple-800/15">
            <span className="text-base mb-1">⚡</span>
            <span>XP & Rank</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-purple-950/20 border border-purple-800/15">
            <span className="text-base mb-1">👥</span>
            <span>Friends</span>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-white transition-transform ${isRetrying ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          <span>{isRetrying ? 'Checking connection...' : 'Retry'}</span>
        </button>

        {/* Cloud footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <Cloud className="w-3 h-3 text-purple-400" />
          <span>Cloud-first database auto-reconnects</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OfflineScreen;
