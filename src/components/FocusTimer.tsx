import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  Minus, 
  Maximize2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  Flame, 
  Shield, 
  Clock, 
  ChevronLeft,
  BookOpen,
  Coffee,
  BrainCircuit,
  Trophy,
  X
} from 'lucide-react';
import { UserState } from '../types';
import { SoundManager } from '../utils/soundManager';
import { getLocalDateString } from '../utils/dateUtils';
import { getLevelAndProgress } from '../utils/xpUtils';
import { getTemplateSubjects, COURSE_TEMPLATES } from '../data';

interface FocusTimerProps {
  userState: UserState;
  onUpdateState: (newState: Partial<UserState>) => void;
  onTriggerToast: (title: string, message: string, type: 'success' | 'info' | 'error') => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  initialTopicName?: string;
  onClearInitialTopicName?: () => void;
}

const TIMER_MODES = [
  { id: 'sprint', name: 'Quick Sprint', duration: 15, icon: BrainCircuit, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' },
  { id: 'pomodoro', name: 'Focus Session', duration: 25, icon: BrainCircuit, color: 'text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10' },
  { id: 'deep', name: 'Deep Study', duration: 45, icon: BookOpen, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10' },
  { id: 'revision', name: 'Exam Prep', duration: 60, icon: Coffee, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' }
];

const MOTIVATIONAL_QUOTES = [
  "Focus is a muscle, and you are building it right now.",
  "Deep work produces rare and valuable results.",
  "The secret of getting ahead is getting started.",
  "Your future self is thanking you for this session.",
  "No distractions. Just pure academic progression.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "One focused hour is worth ten distracted hours."
];

export const FocusTimer: React.FC<FocusTimerProps> = ({ 
  userState, 
  onUpdateState, 
  onTriggerToast, 
  onMinimize,
  isMinimized = false,
  initialTopicName = '',
  onClearInitialTopicName
}) => {
  // Session Configuration states
  const [activeMode, setActiveMode] = useState<string>('pomodoro');
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Active Timer state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  
  // Custom Stop confirmation state
  const [showStopConfirm, setShowStopConfirm] = useState<boolean>(false);
  
  // Prevent premature local storage sync clearing
  const isLoadedRef = useRef<boolean>(false);
  
  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(true);
  
  // Motivational Quotes
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState<number>(0);
  
  // Local storage session key
  const STORAGE_KEY = 'studyos_focus_session';

  // Fullscreen and Topic Selection States
  const [selectedTopicName, setSelectedTopicName] = useState<string>('General Study Block');
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [fullscreenFallbackMode, setFullscreenFallbackMode] = useState<boolean>(false);
  const [showPausedExitedScreen, setShowPausedExitedScreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial topic name if launched from a topic card
  useEffect(() => {
    if (initialTopicName) {
      setSelectedTopicName(initialTopicName);
      if (onClearInitialTopicName) {
        onClearInitialTopicName();
      }
    }
  }, [initialTopicName, onClearInitialTopicName]);

  const enterFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    const req = el.requestFullscreen || 
                (el as any).webkitRequestFullscreen || 
                (el as any).mozRequestFullScreen || 
                (el as any).msRequestFullscreen;
    
    if (req) {
      req.call(el).then(() => {
        setIsFullscreenActive(true);
        setFullscreenFallbackMode(false);
        setShowPausedExitedScreen(false);
      }).catch((err) => {
        console.warn("Fullscreen request failed, falling back gracefully:", err);
        setIsFullscreenActive(false);
        setFullscreenFallbackMode(true);
        setShowPausedExitedScreen(false);
      });
    } else {
      console.warn("Fullscreen API not supported in this browser, falling back gracefully.");
      setIsFullscreenActive(false);
      setFullscreenFallbackMode(true);
      setShowPausedExitedScreen(false);
    }
  };

  const exitFullscreen = () => {
    const exit = document.exitFullscreen ||
                 (document as any).webkitExitFullscreen ||
                 (document as any).mozCancelFullScreen ||
                 (document as any).msExitFullscreen;
    if (exit) {
      exit.call(document).catch((err) => console.warn(err));
    }
  };

  // Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreenActive(isCurrentlyFullscreen);

      // If a session has started, and we are NOT in fullscreen, and we are NOT in fallback mode
      if (totalSeconds > 0 && !isCurrentlyFullscreen && !fullscreenFallbackMode) {
        // Automatically pause the timer!
        setIsRunning(false);
        setShowPausedExitedScreen(true);
        SoundManager.play('timer_pause');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [totalSeconds, fullscreenFallbackMode]);

  const handleResumeSession = () => {
    enterFullscreen();
    setIsRunning(true);
    setShowPausedExitedScreen(false);
  };

  const handleExitSession = () => {
    exitFullscreen();
    // Reset timer
    localStorage.removeItem(STORAGE_KEY);
    setTotalSeconds(0);
    setSecondsElapsed(0);
    setIsRunning(false);
    setShowStopConfirm(false);
    setShowPausedExitedScreen(false);
  };

  const handleFinishSession = () => {
    exitFullscreen();
    handleStopSession();
    setShowPausedExitedScreen(false);
  };

  // Tick reference to check for clock manipulation
  const lastTickRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);

  const toggleTimer = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (nextRunning) {
      SoundManager.play('timer_start');
      SoundManager.vibrate('light');
    } else {
      SoundManager.play('timer_pause');
      SoundManager.vibrate('light');
    }
  };

  // Load quote rotator
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
      }, 120000); // 2 minutes
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Load session from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const elapsedRealTime = Math.floor((Date.now() - data.lastTick) / 1000);
        
        setTotalSeconds(data.totalSeconds);
        setActiveMode(data.mode);
        setSelectedTopicName(data.topicName || 'General Study Block');
        
        if (data.isRunning) {
          // If was running, let's restore state.
          // Anti-abuse: If they left the tab/browser for a long time (> 30s), we pause the timer automatically.
          if (elapsedRealTime > 30) {
            // Auto-paused while away
            setSecondsElapsed(Math.min(data.secondsElapsed + 5, data.totalSeconds)); // credit 5 seconds grace
            setIsRunning(false);
            onTriggerToast("⏰ Focus Timer Paused", "The focus session was paused because you were away for an extended period.", "info");
          } else {
            // Re-sync progress
            const updatedElapsed = data.secondsElapsed + elapsedRealTime;
            if (updatedElapsed >= data.totalSeconds) {
              setSecondsElapsed(data.totalSeconds);
              setIsRunning(false);
            } else {
              setSecondsElapsed(updatedElapsed);
              setIsRunning(true);
            }
          }
        } else {
          setSecondsElapsed(data.secondsElapsed);
          setIsRunning(false);
        }
      } catch (err) {
        console.warn("Could not restore focus session", err);
      }
    }
    lastTickRef.current = Date.now();
    isLoadedRef.current = true;
  }, []);

  // Sync to LocalStorage whenever running states change
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (totalSeconds > 0) {
      const sessionData = {
        mode: activeMode,
        totalSeconds,
        secondsElapsed,
        isRunning,
        topicName: selectedTopicName,
        lastTick: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [totalSeconds, secondsElapsed, isRunning, activeMode, selectedTopicName]);

  // Tab visibility changes: Auto pause on browser leave or screen lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        setIsRunning(false);
        onTriggerToast("🛡️ Focus Timer Protected", "Focus session auto-paused to protect integrity while you were away.", "info");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  // Play subtle synth alarm on complete
  const playAlarmSound = () => {
    SoundManager.play('timer_end');
    SoundManager.vibrate('success');
  };

  // Main Timer Tick Interval
  useEffect(() => {
    let timerId: any;
    if (isRunning && secondsElapsed < totalSeconds) {
      lastTickRef.current = Date.now();
      timerId = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastTickRef.current) / 1000);
        
        // Safety lock: if the delta is abnormally large (e.g. system suspended or user changed clock)
        if (delta > 8) {
          // Suspected clock manipulation or browser sleep. Pause timer!
          setIsRunning(false);
          onTriggerToast("⏰ Timer Suspended", "Focus session paused due to system sleep or clock change.", "error");
        } else {
          setSecondsElapsed((prev) => {
            const next = prev + Math.max(1, delta);
            if (next >= totalSeconds) {
              // Completion Trigger!
              setIsRunning(false);
              handleSessionComplete(totalSeconds);
              return totalSeconds;
            }
            return next;
          });
        }
        lastTickRef.current = now;
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isRunning, secondsElapsed, totalSeconds]);

  // Handle successful session complete
  const handleSessionComplete = (seconds: number) => {
    playAlarmSound();
    const durationMinutes = Math.floor(seconds / 60);
    creditStudyMinutes(durationMinutes);
    
    // Clear storage
    localStorage.removeItem(STORAGE_KEY);
    setTotalSeconds(0);
    setSecondsElapsed(0);
  };

  // Helper to credit focused minutes & check daily focus goal completions
  const creditStudyMinutes = (minutes: number) => {
    if (minutes <= 0) return;

    const todayStr = getLocalDateString();
    const userTodayMinutes = (userState.todayFocusMinutes || 0) + minutes;
    const userTotalMinutes = (userState.totalFocusMinutes || 0) + minutes;
    const userTotalSessions = (userState.totalFocusSessions || 0) + 1;
    const userLongestSession = Math.max(userState.longestFocusSessionMinutes || 0, minutes);

    const updatedHistory = { ...userState.focusHistory } as any;
    updatedHistory[todayStr] = (updatedHistory[todayStr] || 0) + minutes;

    // Daily focus goal check
    const goalMinutes = userState.dailyFocusGoal ?? 30;
    const completedGoalTodayBefore = (userState.todayFocusMinutes || 0) >= goalMinutes;
    const completedGoalTodayNow = userTodayMinutes >= goalMinutes;

    let addedXP = 0;
    let streakIncrement = 0;
    let statusMessage = `Focus session logged! Focused for ${minutes} minutes.`;

    let userStreak = userState.academicStudyStreak ?? 0;
    let userLongestStreak = userState.longestStudyStreak ?? 0;

    // Check if goal met for the first time today
    if (!completedGoalTodayBefore && completedGoalTodayNow) {
      addedXP += 25; // +25 XP upon reaching Daily Goal
      streakIncrement = 1;
      userStreak += 1;
      userLongestStreak = Math.max(userStreak, userLongestStreak);
      statusMessage = `🔥 Daily Goal Complete! You earned +25 XP and extended your Focus Streak to ${userStreak} days!`;
      SoundManager.play('streak_secured');
      SoundManager.vibrate('success');
    }

    // Additional 30 minutes studied XP check
    const currentXPAwarded = userState.todayFocusXPRewarded || 0;
    if (userTodayMinutes > goalMinutes) {
      const surplusMinutes = userTodayMinutes - goalMinutes;
      const additionalBlocks = Math.floor(surplusMinutes / 30);
      const expectedSurplusXP = additionalBlocks * 10;
      
      // Focus XP cap is 100 XP per day (including the 25 XP base)
      const allowedAdditionalXP = Math.min(expectedSurplusXP, 75); // 100 - 25 = 75 XP max extra
      
      const xpToCredit = allowedAdditionalXP - (currentXPAwarded > 25 ? (currentXPAwarded - 25) : 0);
      if (xpToCredit > 0) {
        addedXP += xpToCredit;
        statusMessage = `🚀 Incredible focus! You unlocked an extra +${xpToCredit} XP for study endurance!`;
      }
    }

    // Prepare state update
    const totalXPNow = userState.xp + addedXP;
    const levelNow = getLevelAndProgress(totalXPNow).level;

    const changes: Partial<UserState> = {
      xp: totalXPNow,
      level: levelNow,
      todayFocusMinutes: userTodayMinutes,
      totalFocusMinutes: userTotalMinutes,
      totalFocusSessions: userTotalSessions,
      longestFocusSessionMinutes: userLongestSession,
      focusHistory: updatedHistory,
      todayFocusXPRewarded: (userState.todayFocusXPRewarded || 0) + addedXP,
      lastFocusDate: todayStr,
      lastActiveDate: todayStr
    };

    if (streakIncrement > 0) {
      changes.academicStudyStreak = userStreak;
      changes.longestStudyStreak = userLongestStreak;
      changes.streak = userStreak;
      changes.longestStreak = userLongestStreak;
    }

    onUpdateState(changes);
    onTriggerToast("🎯 Focus Milestones Updated", statusMessage, "success");
  };

  // Start Focus Session
  const handleStartSession = () => {
    let minutes = customDuration;
    if (!showCustomInput) {
      const modeObj = TIMER_MODES.find(m => m.id === activeMode);
      minutes = modeObj ? modeObj.duration : 25;
    }

    setTotalSeconds(minutes * 60);
    setSecondsElapsed(0);
    setIsRunning(true);
    lastTickRef.current = Date.now();
    SoundManager.play('timer_start');
    SoundManager.vibrate('light');

    // Automatically enter fullscreen!
    setTimeout(() => {
      enterFullscreen();
    }, 50);
  };

  // Stop / Cancel active session (credits actual minutes)
  const handleStopSession = () => {
    const elapsedMinutes = Math.floor(secondsElapsed / 60);
    if (elapsedMinutes > 0) {
      creditStudyMinutes(elapsedMinutes);
    } else {
      onTriggerToast("Session Cancelled", "Timer stopped. No focus minutes were credited because session was less than 1 minute.", "info");
    }
    
    // Reset
    localStorage.removeItem(STORAGE_KEY);
    setTotalSeconds(0);
    setSecondsElapsed(0);
    setIsRunning(false);
    setShowStopConfirm(false);
  };

  // Format digital clock
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const remainingSecs = totalSeconds - secondsElapsed;
  const progressPercent = totalSeconds > 0 ? (secondsElapsed / totalSeconds) * 100 : 0;

  // Extract all available topics for datalist auto-completion
  const getSubjects = () => {
    const { university = 'VTU', branch = 'CSE', scheme = '2022 Scheme', semester = 1, backlogSubjects = [] } = userState;
    const activeSubjects = getTemplateSubjects(university, branch, scheme, semester);
    const backlogSubjectsList: any[] = [];
    const uData = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
    const bData = uData[branch] || uData['CSE'];
    const sData = bData[scheme] || bData['2022 Scheme'];

    for (const semNum of [1, 2, 3]) {
      if (semNum < semester && sData[semNum]) {
        const priorSubjects = sData[semNum];
        priorSubjects.forEach((sub: any) => {
          if (backlogSubjects.includes(sub.id)) {
            backlogSubjectsList.push(sub);
          }
        });
      }
    }
    return { activeSubjects, backlogSubjects: backlogSubjectsList };
  };

  const { activeSubjects, backlogSubjects } = getSubjects();
  const allAvailableTopics: { id: string; name: string; subjectName: string }[] = [];

  activeSubjects.forEach((sub: any) => {
    sub.modules.forEach((mod: any) => {
      mod.topics.forEach((top: any) => {
        if (!allAvailableTopics.some(t => t.id === top.id)) {
          allAvailableTopics.push({
            id: top.id,
            name: top.name,
            subjectName: sub.name
          });
        }
      });
    });
  });

  backlogSubjects.forEach((sub: any) => {
    sub.modules.forEach((mod: any) => {
      mod.topics.forEach((top: any) => {
        if (!allAvailableTopics.some(t => t.id === top.id)) {
          allAvailableTopics.push({
            id: top.id,
            name: top.name,
            subjectName: `${sub.name} (Backlog)`
          });
        }
      });
    });
  });

  // Render minimized view
  if (isMinimized && totalSeconds > 0) {
    return (
      <motion.div 
        layoutId="studyos-focus-minimized"
        className="fixed bottom-24 right-4 md:right-8 bg-[#141A1F]/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 z-40 select-none max-w-sm"
      >
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
            <circle cx="24" cy="24" r="20" stroke="#3b82f6" strokeWidth="3" fill="none" 
              strokeDasharray="125.6" 
              strokeDashoffset={125.6 - (125.6 * progressPercent) / 100} 
            />
          </svg>
          <BrainCircuit className="absolute w-4 h-4 text-blue-400 animate-pulse" />
        </div>
        
        <div>
          <p className="text-xs font-bold text-white font-display">Focus Mode Active</p>
          <p className="text-sm font-mono font-semibold text-blue-400">{formatTime(remainingSecs)}</p>
        </div>

        <div className="flex gap-1.5 ml-2">
          <button 
            onClick={toggleTimer}
            className="p-2 bg-gray-900 border border-gray-850 hover:border-gray-700 text-gray-300 rounded-lg cursor-pointer animate-none"
            style={{ minWidth: '32px', minHeight: '32px' }}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          
          {onMinimize && (
            <button 
              onClick={onMinimize}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-md animate-none"
              style={{ minWidth: '32px', minHeight: '32px' }}
              title="Expand Timer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ACTIVE DEEP-WORK COUNTDOWN (SHOW ONLY CURRENT TOPIC, REMAINING TIME, PAUSE, FINISH, EXIT)
  if (totalSeconds > 0 && !isMinimized) {
    if (showPausedExitedScreen) {
      return (
        <div 
          ref={containerRef}
          className="fixed inset-0 w-full h-full min-h-screen bg-[#0C0F12] text-white flex flex-col items-center justify-center p-6 z-50 select-none font-sans"
        >
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-md w-full bg-[#141A1F] border border-gray-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative z-10">
            <div className="w-16 h-16 bg-blue-500/15 border-2 border-blue-500/30 rounded-full flex items-center justify-center mx-auto text-blue-400 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black font-display tracking-tight text-white leading-none">Session Paused</h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                You exited Fullscreen Mode. To protect your deep work and prevent distractions, study sessions are automatically paused when fullscreen is exited.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleResumeSession}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-xs font-black tracking-widest uppercase text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                style={{ minHeight: '44px' }}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Session</span>
              </button>
              <button
                onClick={handleExitSession}
                className="w-full py-3.5 bg-gray-900 hover:bg-gray-850 text-xs font-black tracking-widest uppercase text-gray-400 hover:text-white rounded-xl border border-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                style={{ minHeight: '44px' }}
              >
                <X className="w-4 h-4" />
                <span>Exit Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 w-full h-full min-h-screen bg-[#0C0F12] text-white flex flex-col items-center justify-center p-6 z-50 select-none font-sans"
      >
        {/* Subtle Ambient Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-blue-500/5 animate-pulse pointer-events-none" />

        <div className="max-w-xl w-full flex flex-col items-center justify-center space-y-12 text-center relative z-10">
          
          {/* 1. CURRENT TOPIC */}
          <div className="space-y-2.5 max-w-lg">
            <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-[0.2em] border border-blue-500/20 bg-blue-500/5 px-3 py-1 rounded-full">
              ⚡ CURRENT TOPIC
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display leading-tight">
              {selectedTopicName || "General Study Block"}
            </h1>
          </div>

          {/* 2. REMAINING TIME */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Minimal Elegant Circular Progress */}
            <svg className="w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="44%" stroke="rgba(255,255,255,0.02)" strokeWidth="4" fill="none" />
              <circle cx="50%" cy="50%" r="44%" stroke="url(#activeTimerGradient)" strokeWidth="4" fill="none" 
                strokeLinecap="round"
                strokeDasharray="502.6" 
                strokeDashoffset={502.6 - (502.6 * progressPercent) / 100} 
              />
              <defs>
                <linearGradient id="activeTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className="text-5xl sm:text-6xl font-mono font-bold tracking-tighter text-white">
                {formatTime(remainingSecs)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">
                {isRunning ? "FOCUS ACTIVE" : "PAUSED"}
              </span>
            </div>
          </div>

          {/* 3. CONTROL ACTIONS (Pause, Finish, Exit) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
            {/* Pause / Resume Button */}
            <button
              onClick={toggleTimer}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                isRunning 
                  ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
              style={{ minHeight: '48px' }}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? "Pause" : "Resume"}</span>
            </button>

            {/* Finish Button */}
            <button
              onClick={handleFinishSession}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wider uppercase rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              style={{ minHeight: '48px' }}
            >
              <Trophy className="w-4 h-4" />
              <span>Finish</span>
            </button>

            {/* Exit Button */}
            <button
              onClick={() => {
                setIsRunning(false);
                setShowStopConfirm(true);
              }}
              className="w-full py-4 bg-gray-950 hover:bg-red-500/10 border border-gray-850 hover:border-red-500/30 text-gray-400 hover:text-red-400 font-bold text-sm tracking-wider uppercase rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              style={{ minHeight: '48px' }}
            >
              <Square className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>

        </div>

        {/* Custom Stop/Exit Session Confirmation Modal */}
        {showStopConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#141A1F] border border-gray-800 rounded-2xl p-6 text-center space-y-5 shadow-2xl relative z-20"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
                <Square className="w-6 h-6 fill-current" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-white font-display">Stop Focus Session?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Do you want to exit this focus session? We will credit any completed focus minutes to your statistics.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStopConfirm(false);
                    setIsRunning(true);
                  }}
                  className="flex-1 py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  style={{ minHeight: '38px' }}
                >
                  Keep Studying
                </button>
                <button
                  onClick={handleExitSession}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer"
                  style={{ minHeight: '38px' }}
                >
                  Exit Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // MODE CONFIGURATION / SETUP SCREEN
  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full min-h-screen bg-[#0C0F12]/98 text-white flex flex-col items-center justify-center p-6 overflow-y-auto select-none z-50 font-sans">
      
      {/* Background visual effects */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Top action header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-4xl mx-auto w-full z-10">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 font-display">StudyOS Focus Engine</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-xl bg-gray-950 border border-gray-850 hover:border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
            style={{ minHeight: '40px', minWidth: '40px' }}
            title={isMuted ? "Unmute Alarm" : "Mute Alarm"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Close button */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-200 hover:text-white transition-all cursor-pointer shadow-lg"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl w-full flex flex-col items-center justify-center space-y-8 z-10 text-center pt-16 pb-6">
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#141A1F]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-left"
        >
          <div className="text-center space-y-1.5 pb-2 border-b border-gray-850">
            <h2 className="text-xl font-extrabold text-white font-display">Initialize Focus Session</h2>
            <p className="text-xs text-gray-400">Select a preconfigured study block or program a custom focus countdown.</p>
          </div>

          {/* Topic selection with list */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Topic to Focus On</label>
            <input
              type="text"
              list="topics-datalist"
              placeholder="Search or enter a study topic..."
              value={selectedTopicName}
              onChange={(e) => setSelectedTopicName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-850 hover:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-gray-600 transition-all outline-none"
            />
            <datalist id="topics-datalist">
              {allAvailableTopics.map((t, idx) => (
                <option key={idx} value={t.name}>{t.subjectName}</option>
              ))}
            </datalist>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Select Session Mode</label>
            
            <div className="grid grid-cols-2 gap-3">
              {TIMER_MODES.map((mode) => {
                const ModeIcon = mode.icon;
                return (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => {
                      setActiveMode(mode.id);
                      setShowCustomInput(false);
                    }}
                    className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      !showCustomInput && activeMode === mode.id
                        ? 'bg-blue-600/10 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
                        : 'bg-gray-950 border-gray-850 text-gray-400 hover:border-gray-800 hover:text-white'
                    }`}
                  >
                    <ModeIcon className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold font-display">{mode.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{mode.duration} minutes</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Duration Switch */}
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                showCustomInput
                  ? 'bg-blue-600/10 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
                  : 'bg-gray-950 border-gray-850 text-gray-400 hover:border-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-xs font-bold font-display">Custom study duration</p>
                  <p className="text-[10px] text-gray-500 font-mono">Program any countdown</p>
                </div>
              </div>
              {showCustomInput && (
                <span className="text-xs font-bold font-mono text-blue-400">{customDuration} min</span>
              )}
            </button>

            {showCustomInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2 space-y-2"
              >
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>5 minutes</span>
                  <span>180 minutes</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Daily Focus Goal status indicator */}
          <div className="bg-gray-950/60 border border-gray-850 rounded-xl p-3 flex items-start gap-3">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Daily Target Consistency</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Your daily goal is **{userState.dailyFocusGoal ?? 30} minutes**. Reaching this completes your study day, and secures your **Academic Study Streak**!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartSession}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-sm font-bold text-white rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
            style={{ minHeight: '48px' }}
          >
            <Play className="w-4 h-4" />
            <span>Begin Study Deep-Work block</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
};
