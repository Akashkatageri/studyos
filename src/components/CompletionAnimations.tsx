import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, Trophy, Award, GraduationCap, ChevronRight } from 'lucide-react';

interface CompletionAnimationsProps {
  type: 'topic' | 'module' | 'semester' | null;
  onClose: () => void;
  streak: number;
  xpEarned?: number;
  moduleName?: string;
  moduleProgress?: number; // 0 to 100
}

export default function CompletionAnimations({
  type,
  onClose,
  streak,
  xpEarned = 20,
  moduleName = '',
  moduleProgress = 0,
}: CompletionAnimationsProps) {
  if (!type) return null;

  // Track the filling progress percentage for satisfying animation
  const [percent, setPercent] = useState(() => Math.max(0, moduleProgress - 20));

  useEffect(() => {
    // Start progress fill animation after a brief delay
    const timer = setTimeout(() => {
      setPercent(moduleProgress);
    }, 300);
    return () => clearTimeout(timer);
  }, [moduleProgress]);

  const maxBlocks = 10;
  const filledCount = Math.min(maxBlocks, Math.round(percent / 10));
  const blockStr = '█'.repeat(filledCount) + '░'.repeat(Math.max(0, maxBlocks - filledCount));

  // Generate random confetti particles
  const particles = Array.from({ length: 45 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A0D]/95 p-4 overflow-hidden select-none">
      
      {/* Confetti Rain */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((_, i) => {
          const size = Math.random() * 12 + 6;
          const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const left = `${Math.random() * 100}%`;
          const delay = Math.random() * 1.5;
          const duration = Math.random() * 2.5 + 2;

          return (
            <motion.div
              key={i}
              className="absolute rounded"
              style={{
                width: size,
                height: size,
                backgroundColor: randomColor,
                left: left,
                top: '-5%',
              }}
              animate={{
                top: '105%',
                x: [0, Math.random() * 80 - 40, Math.random() * 80 - 40],
                rotate: [0, 360, 720],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: 'linear',
              }}
            />
          );
        })}
      </div>

      {/* Main Celebration Card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative w-full max-w-sm bg-[#11161B] border-2 border-gray-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 overflow-hidden"
      >
        {/* Glow backdrop effect */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {type === 'topic' && (
          <div className="space-y-6 relative z-10">
            {/* Celebration Icon */}
            <motion.div
              initial={{ y: -30, scale: 0 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 bg-amber-500/10 border border-amber-500/35 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.25)]"
            >
              <span className="text-4xl animate-pulse">🎉</span>
            </motion.div>

            {/* Core Completed Wording */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest leading-none">Topic Completed!</h2>
              <p className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                +{xpEarned} XP
              </p>
            </div>

            {/* Streak Status Box */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 py-2 px-5 rounded-2xl">
              <Flame className="w-5 h-5 text-amber-500 fill-current animate-pulse" />
              <span className="text-xs font-black font-mono text-amber-400 uppercase tracking-wide">
                🔥 Streak Maintained: {streak} Day{streak > 1 ? 's' : ''}
              </span>
            </div>

            {/* Satisfaction Progress Display */}
            <div className="bg-[#090C0F] border border-gray-800 rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">
                <span className="truncate pr-4 max-w-[180px]">{moduleName || 'Module Progress'}</span>
                <span className="font-mono text-blue-400">{percent}%</span>
              </div>

              {/* Dynamic block progress visualization */}
              <div className="font-mono text-lg font-bold text-blue-500 tracking-wider select-none leading-none">
                {blockStr}
              </div>

              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold">
                Module Progress
              </p>
            </div>
          </div>
        )}

        {type === 'module' && (
          <div className="space-y-6 relative z-10">
            {/* Celebration Icon */}
            <motion.div
              initial={{ y: -30, scale: 0 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 bg-purple-500/10 border border-purple-500/35 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(168,85,247,0.25)] animate-bounce"
            >
              <Trophy className="w-10 h-10 text-purple-400" />
            </motion.div>

            {/* Core Completed Wording */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-purple-400 uppercase tracking-widest leading-none">🏆 Module Mastered!</h2>
              <p className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                +{xpEarned} XP
              </p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Amazing work! You completed every single topic in <span className="text-purple-300 font-semibold">{moduleName}</span>!
              </p>
            </div>

            {/* Streak Status Box */}
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 py-2 px-5 rounded-2xl">
              <Flame className="w-5 h-5 text-purple-400 fill-current" />
              <span className="text-xs font-black font-mono text-purple-400 uppercase tracking-wide">
                🔥 Streak Maintained: {streak} Day{streak > 1 ? 's' : ''}
              </span>
            </div>

            {/* Module celebration stats */}
            <div className="bg-[#090C0F] border border-purple-500/15 rounded-2xl p-4.5">
              <div className="text-lg font-mono font-bold text-purple-500 tracking-widest select-none leading-none">
                ██████████
              </div>
              <p className="text-[9px] text-purple-400 uppercase tracking-wider font-extrabold mt-2.5">
                Module 100% Completed!
              </p>
            </div>
          </div>
        )}

        {type === 'semester' && (
          <div className="space-y-6 relative z-10">
            {/* Celebration Icon */}
            <motion.div
              initial={{ y: -30, scale: 0 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 bg-blue-500/10 border border-blue-500/35 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(59,130,246,0.25)]"
            >
              <GraduationCap className="w-10 h-10 text-blue-400" />
            </motion.div>

            {/* Core Completed Wording */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-blue-400 uppercase tracking-widest leading-none">🎓 Semester Completed!</h2>
              <p className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                +{xpEarned} XP
              </p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Outstanding! You have conquered every single topic and backlog module for this entire semester!
              </p>
            </div>

            {/* Streak Status Box */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 py-2 px-5 rounded-2xl">
              <Flame className="w-5 h-5 text-blue-500 fill-current" />
              <span className="text-xs font-black font-mono text-blue-400 uppercase tracking-wide">
                🔥 Streak Maintained: {streak} Day{streak > 1 ? 's' : ''}
              </span>
            </div>

            {/* Semester completed stats */}
            <div className="bg-[#090C0F] border border-blue-500/15 rounded-2xl p-4.5">
              <div className="text-lg font-mono font-bold text-blue-500 tracking-widest select-none leading-none">
                ██████████
              </div>
              <p className="text-[9px] text-blue-400 uppercase tracking-wider font-extrabold mt-2.5">
                Semester Gold Mastered!
              </p>
            </div>
          </div>
        )}

        {/* Continue Action button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="relative z-10 w-full py-4.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.4)]"
        >
          <span>Continue</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>

      </motion.div>
    </div>
  );
}
