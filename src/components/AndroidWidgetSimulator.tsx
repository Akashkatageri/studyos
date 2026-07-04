import React, { useState } from 'react';
import { UserState } from '../types';
import { 
  Flame, 
  Sparkles, 
  Shield, 
  Play, 
  Heart, 
  RotateCw,
  Copy,
  Check,
  Smartphone,
  Eye,
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AndroidWidgetSimulatorProps {
  userState: UserState;
  onStartRecommended?: () => void;
  onOpenFocusTimer?: () => void;
}

type WidgetType = 'mochi_cat' | 'pyre_streak' | 'chrono_gauge';
type WidgetTheme = 'glass' | 'pastel' | 'cosmic_dark' | 'mint_cream';

export default function AndroidWidgetSimulator({
  userState,
  onStartRecommended,
  onOpenFocusTimer
}: AndroidWidgetSimulatorProps) {
  const [activeWidget, setActiveWidget] = useState<WidgetType>('mochi_cat');
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>('glass');
  const [copied, setCopied] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const streak = userState.academicStudyStreak ?? userState.streak ?? 0;
  const focusMinutes = userState.todayFocusMinutes || 0;
  const focusGoal = userState.dailyFocusGoal || 25;
  const isGoalMet = focusMinutes >= focusGoal;

  // Mascot logic based on study state
  const getMochiMood = () => {
    if (isGoalMet) {
      return {
        emoji: '😺👑',
        status: 'Scholar King',
        desc: 'Mochi is extremely proud of you!',
        bgClass: 'from-amber-500/10 to-yellow-500/10'
      };
    } else if (focusMinutes > 0) {
      return {
        emoji: '📚🐾',
        status: 'Hard at Work',
        desc: 'Mochi is studying with you!',
        bgClass: 'from-blue-500/10 to-indigo-500/10'
      };
    } else {
      return {
        emoji: '😴💤',
        status: 'Nap Time',
        desc: 'Complete a study activity to wake Mochi!',
        bgClass: 'from-purple-500/5 to-gray-500/5'
      };
    }
  };

  const mochi = getMochiMood();

  const handlePetMochi = () => {
    setPetCount(prev => prev + 1);
    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 800);
  };

  // Theme styling configurations
  const getThemeStyles = () => {
    switch (widgetTheme) {
      case 'glass':
        return {
          card: 'bg-gray-900/40 backdrop-blur-xl border border-white/10 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          accentText: 'text-blue-400',
          subText: 'text-gray-400',
          btnBg: 'bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/5'
        };
      case 'pastel':
        return {
          card: 'bg-pink-50/95 border border-pink-100 text-pink-950 shadow-[0_8px_20px_rgba(244,143,177,0.15)]',
          accentText: 'text-pink-600',
          subText: 'text-pink-800/75',
          btnBg: 'bg-pink-100 hover:bg-pink-200 active:bg-pink-300 border border-pink-200'
        };
      case 'cosmic_dark':
        return {
          card: 'bg-[#0E0B1E] border border-purple-500/30 text-purple-50 shadow-[0_8px_24px_rgba(147,51,234,0.25)]',
          accentText: 'text-fuchsia-400',
          subText: 'text-purple-300/80',
          btnBg: 'bg-purple-950/40 hover:bg-purple-900/40 active:bg-purple-800/40 border border-purple-500/20'
        };
      case 'mint_cream':
        return {
          card: 'bg-[#EDF7F4] border border-emerald-100 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.1)]',
          accentText: 'text-emerald-600',
          subText: 'text-emerald-800/70',
          btnBg: 'bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 border border-emerald-200'
        };
    }
  };

  const styles = getThemeStyles();

  const handleCopyInstructions = () => {
    const instructions = `How to add StudyOS 2x1 Widget to your Android Home Screen:
1. Long-press on any empty space on your Android home screen.
2. Tap "Widgets".
3. Search or browse to "StudyOS" (or open with your premium Web Browser Add-to-Home PWA launcher).
4. Drag and drop the 2x1 "Study Companion" or "Daily Streak" widget onto your screen!`;
    navigator.clipboard.writeText(instructions).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-[#141A1F] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-md text-left" id="android-widget-simulator-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">Android 2x1 Widget Preview</h4>
        </div>
        <div className="flex items-center gap-1 bg-gray-950/60 p-0.5 rounded-lg border border-gray-850">
          <button
            onClick={() => setActiveWidget('mochi_cat')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeWidget === 'mochi_cat' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Mochi Cat
          </button>
          <button
            onClick={() => setActiveWidget('pyre_streak')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeWidget === 'pyre_streak' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            🔥 Streak
          </button>
          <button
            onClick={() => setActiveWidget('chrono_gauge')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeWidget === 'chrono_gauge' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            ⏱️ Goal
          </button>
        </div>
      </div>

      {/* Simulated Phone Screen Background wallpaper */}
      <div className="relative w-full h-[155px] rounded-2xl overflow-hidden bg-cover bg-center flex items-center justify-center p-4 border border-gray-800"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80')`
        }}
      >
        {/* Subtle Android Grid overlay line dots */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 2X1 SIZE WIDGET */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeWidget}-${widgetTheme}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-[280px] h-[92px] rounded-2xl p-3 flex items-center justify-between relative select-none ${styles.card}`}
            id="simulated-android-widget"
          >
            {/* Widget Border Glow in Cosmic Mode */}
            {widgetTheme === 'cosmic_dark' && (
              <div className="absolute inset-0 -z-10 rounded-2xl bg-purple-500/10 blur-md pointer-events-none" />
            )}

            {/* Render selected widget type */}
            {activeWidget === 'mochi_cat' && (
              <>
                <div className="space-y-1 pr-1 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase opacity-80">STUDY BUDDY</span>
                    <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-current" />
                  </div>
                  <h5 className="text-[14px] font-black leading-none flex items-baseline gap-1">
                    Mochi
                    <span className="text-[9px] font-medium opacity-75">({mochi.status})</span>
                  </h5>
                  <p className="text-[9px] leading-tight opacity-80">{mochi.desc}</p>
                  
                  {/* Small play action button within the widget */}
                  <div className="pt-0.5 flex items-center gap-1">
                    <button
                      onClick={onStartRecommended}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 cursor-pointer transition-all ${styles.btnBg}`}
                    >
                      <Play className="w-1.5 h-1.5 fill-current" />
                      <span>Study Now</span>
                    </button>
                    {petCount > 0 && (
                      <span className="text-[8px] opacity-70 font-mono">Pets: {petCount}</span>
                    )}
                  </div>
                </div>

                {/* Cute Animated Mascot Character Frame */}
                <div 
                  onClick={handlePetMochi}
                  className="w-[74px] h-[74px] rounded-xl flex flex-col items-center justify-center cursor-pointer relative bg-gradient-to-br transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-3xl select-none relative z-10">{mochi.emoji.substring(0, 4)}</span>
                  
                  {/* Floating Heart pet animation */}
                  <AnimatePresence>
                    {isHeartAnimating && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -20, scale: 1.1 }}
                        exit={{ opacity: 0 }}
                        className="absolute text-red-500 z-20 pointer-events-none"
                      >
                        <Heart className="w-4 h-4 fill-current text-rose-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <span className="text-[8px] font-bold tracking-wider mt-1 uppercase opacity-75">PET ME</span>
                </div>
              </>
            )}

            {activeWidget === 'pyre_streak' && (
              <>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase opacity-80">FOCUS STREAK</span>
                  </div>
                  <h5 className="text-[22px] font-black leading-none font-mono flex items-baseline gap-1">
                    {streak}
                    <span className="text-xs font-bold">Days</span>
                  </h5>
                  <p className="text-[9px] leading-tight opacity-80">
                    {streak > 0 ? "You're burning bright! Keep it up." : "Start studying to spark a streak!"}
                  </p>
                </div>

                {/* Flaming Streak Visual */}
                <div className="w-[68px] h-[68px] rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 relative overflow-hidden">
                  <Flame className="w-10 h-10 text-amber-500 fill-current animate-bounce" />
                  <div className="absolute inset-x-0 bottom-1 flex justify-center">
                    <span className="text-[8px] font-black tracking-wider uppercase text-amber-400">HOT!</span>
                  </div>
                </div>
              </>
            )}

            {activeWidget === 'chrono_gauge' && (
              <>
                <div className="space-y-1.5 flex-1 pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase opacity-80">DAILY GOAL</span>
                  </div>
                  <h5 className="text-base font-black leading-none">
                    {focusMinutes} <span className="text-[10px] opacity-75">/ {focusGoal} mins</span>
                  </h5>
                  <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400" 
                      style={{ width: `${Math.min((focusMinutes / focusGoal) * 100, 100)}%` }} 
                    />
                  </div>
                  <p className="text-[9px] leading-tight opacity-80">
                    {isGoalMet ? "Goal Completed! 🔥" : "Almost there! Launch timer:"}
                  </p>
                </div>

                {/* Gauge Timer shortcut action */}
                <button
                  onClick={onOpenFocusTimer}
                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95 shadow-md ${styles.btnBg}`}
                >
                  <Play className="w-4 h-4 fill-current text-emerald-400" />
                  <span className="text-[7px] font-black uppercase mt-1">Start</span>
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Size Tag */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[8px] font-bold text-white font-mono tracking-wider">
          2 x 1 GRID
        </div>
      </div>

      {/* Widget Controls & Installation Help */}
      <div className="space-y-3">
        {/* Color themes chooser */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 font-semibold flex items-center gap-1">
            Theme Style:
          </span>
          <div className="flex gap-1.5">
            {(['glass', 'pastel', 'cosmic_dark', 'mint_cream'] as WidgetTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setWidgetTheme(t)}
                className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                  t === 'glass' ? 'bg-slate-700 border-slate-600' :
                  t === 'pastel' ? 'bg-pink-300 border-pink-400' :
                  t === 'cosmic_dark' ? 'bg-purple-950 border-purple-800' :
                  'bg-emerald-300 border-emerald-400'
                } ${widgetTheme === t ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#141A1F]' : ''}`}
                title={t.replace('_', ' ')}
              />
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div className="p-3 bg-gray-950/40 border border-gray-850 rounded-xl space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              StudyOS widgets support live sync on Android! They update automatically when you complete subjects, maintain streaks, or study with Mochi.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsInstructionsOpen(true)}
              className="flex-1 py-1.5 bg-gray-900 hover:bg-gray-850 active:scale-98 text-[10px] font-bold text-gray-300 hover:text-white rounded-lg border border-gray-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>How to Add to Phone Screen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Widget Installation Modal */}
      <AnimatePresence>
        {isInstructionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-[#0D1115] border border-gray-850 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-850 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">How to Add Widget</h3>
                </div>
                <button
                  onClick={() => setIsInstructionsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">Install StudyOS</h4>
                    <p className="text-[11px] text-gray-400 leading-normal">
                      Open StudyOS in Google Chrome or Safari on your phone. Tap the browser's menu (three dots or Share button) and click <span className="text-blue-400 font-semibold">"Install App"</span> or <span className="text-blue-400 font-semibold">"Add to Home Screen"</span>.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">Go to Widgets</h4>
                    <p className="text-[11px] text-gray-400 leading-normal">
                      Go to your phone's Home Screen. Long-press on any empty space, and select <span className="text-blue-400 font-semibold">"Widgets"</span> from the options menu.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">Place on Screen</h4>
                    <p className="text-[11px] text-gray-400 leading-normal">
                      Scroll to find <span className="text-blue-400 font-semibold">"StudyOS"</span> (or Chrome widgets if running as a web shortcut). Drag and drop the 2x1 Study Companion widget onto your home screen!
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-850">
                <button
                  onClick={handleCopyInstructions}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-850 active:scale-98 text-xs font-bold text-gray-300 hover:text-white rounded-xl border border-gray-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Instructions!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Steps</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsInstructionsOpen(false)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
