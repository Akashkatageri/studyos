import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Star } from 'lucide-react';
import { SoundManager } from '../utils/soundManager';

interface BadgeUnlockModalProps {
  isOpen: boolean;
  badge: {
    id: string;
    title: string;
    description: string;
    icon: string;
  } | null;
  onClose: () => void;
}

export default function BadgeUnlockModal({ isOpen, badge, onClose }: BadgeUnlockModalProps) {
  useEffect(() => {
    if (isOpen && badge) {
      SoundManager.play('badge_unlock');
      SoundManager.vibrate('success');
    }
  }, [isOpen, badge]);

  if (!isOpen || !badge) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D10]/90 backdrop-blur-sm">
        {/* Subtle radial gold glow behind */}
        <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-sm bg-[#131920] border-2 border-amber-500/30 rounded-3xl p-8 text-center shadow-[0_20px_50px_rgba(245,158,11,0.15)] overflow-hidden"
        >
          {/* Sparkles / Confetti Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <div className="absolute top-10 left-10 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            <div className="absolute bottom-10 right-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-300" />
            <div className="absolute top-24 right-16 w-1.5 h-1.5 bg-amber-300 rounded-full animate-bounce" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Header Mini Title */}
            <div className="flex items-center justify-center gap-1.5 text-amber-400">
              <Star className="w-4 h-4 fill-current text-amber-500" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Achievement Unlocked</span>
              <Star className="w-4 h-4 fill-current text-amber-500" />
            </div>

            {/* Glowing Trophy Badge Container */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              {/* Outer Golden Glow Circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 animate-pulse border border-amber-500/30" />
              <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/10 to-yellow-400/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
              
              <span className="text-5xl relative z-10 animate-bounce">{badge.icon || '🏆'}</span>
            </div>

            {/* Title & Info */}
            <div className="space-y-2">
              <h3 className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">New Badge Earned</h3>
              <h2 className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {badge.title}
              </h2>
              <p className="text-gray-400 text-xs px-4">
                {badge.description}
              </p>
            </div>

            {/* Visual Divider */}
            <div className="border-t border-gray-800/80 my-2" />

            {/* Badge Added confirmation */}
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 py-2 px-4 rounded-xl text-[11px] font-bold text-amber-400 tracking-wide uppercase select-none">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Badge Added to Profile</span>
            </div>

            {/* CTA Close Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs tracking-widest uppercase rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95"
              >
                Awesome!
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
