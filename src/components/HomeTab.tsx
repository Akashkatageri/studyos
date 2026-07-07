import React, { useState } from 'react';
import { UserState, Subject, Module, Topic } from '../types';
import { findTopicById } from '../data';
import { SoundManager } from '../utils/soundManager';
import { getLocalDateString } from '../utils/dateUtils';
import { getTopicEstimatedTime } from '../utils/xpUtils';
import { 
  Play, 
  Flame, 
  Sparkles, 
  Trophy, 
  Shield, 
  Clock, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  BookOpen,
  Bell,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import AndroidWidgetSimulator from './AndroidWidgetSimulator';
import SvgBookIllustration from './home/SvgBookIllustration';
import BrowseSubjectsModal from './home/BrowseSubjectsModal';

interface HomeTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
  onStartTopic: (topicId: string) => void;
  onCompleteRevision: (revisionId: string) => void;
  onOpenFocusTimer?: () => void;
  onOpenStudyCalendar?: () => void;
  onTriggerSemesterTransition?: () => void;
  onUpdateState: (updated: Partial<UserState>) => void;
  hasActiveNotifications?: boolean;
}

export default function HomeTab({
  userState,
  activeSubjects,
  backlogSubjects,
  onStartTopic,
  onOpenFocusTimer,
  onUpdateState,
  hasActiveNotifications = false,
}: HomeTabProps) {
  const { completedTopics = [] } = userState;

  // Search & Browse Subjects state
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const todayStr = getLocalDateString();

  // ==========================================
  // SMART RECOMMENDATION ENGINE
  // ==========================================
  const getSmartRecommendation = (): { topic: Topic; module: Module; subject: Subject } | null => {
    // 1. Manually Studied Preference for the Day
    const savedPrefStr = localStorage.getItem('studyos_last_studied_subject_today');
    if (savedPrefStr) {
      try {
        const pref = JSON.parse(savedPrefStr);
        if (pref.date === todayStr) {
          const prefSubject = [...activeSubjects, ...backlogSubjects].find(s => s.id === pref.subjectId);
          if (prefSubject) {
            // Find first incomplete topic
            for (const mod of prefSubject.modules) {
              for (const top of mod.topics) {
                if (!completedTopics.includes(top.id)) {
                  return { topic: top, module: mod, subject: prefSubject };
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not parse manual study preference", e);
      }
    }

    // 2. Resume last unfinished topic in inProgressTopics
    const inProgress = userState.inProgressTopics || [];
    for (let i = inProgress.length - 1; i >= 0; i--) {
      const topicId = inProgress[i];
      if (!completedTopics.includes(topicId)) {
        const result = findTopicById(topicId, activeSubjects, backlogSubjects);
        if (result) {
          return result;
        }
      }
    }

    // 3. Exam Approaching check (within 14 days of semesterEndDate) -> recommend Hard/Medium first
    let isExamApproaching = false;
    if (userState.semesterEndDate) {
      const endD = new Date(userState.semesterEndDate);
      const diffTime = endD.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        isExamApproaching = true;
      }
    }

    if (isExamApproaching) {
      // Find Hard incomplete active topics
      for (const sub of activeSubjects) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id) && top.difficulty === 'Hard') {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
      // Find Medium incomplete active topics
      for (const sub of activeSubjects) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id) && top.difficulty === 'Medium') {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
    }

    // 4. Backlog subjects recommendation occasionally (~33% chance based on day of month)
    const hasBacklogs = backlogSubjects.length > 0;
    const shouldRecommendBacklog = hasBacklogs && (new Date().getDate() % 3 === 0);
    if (shouldRecommendBacklog) {
      for (const sub of backlogSubjects) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id)) {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
    }

    // 5. Next active topic in sequence
    for (const sub of activeSubjects) {
      for (const mod of sub.modules) {
        for (const top of mod.topics) {
          if (!completedTopics.includes(top.id)) {
            return { topic: top, module: mod, subject: sub };
          }
        }
      }
    }

    // Fallback: Check backlogs unconditionally if everything else is completed
    if (hasBacklogs) {
      for (const sub of backlogSubjects) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id)) {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
    }

    return null;
  };

  const recommendation = getSmartRecommendation();

  // ==========================================
  // METRICS CALCULATIONS
  // ==========================================
  const getFocusStats = () => {
    const history = userState.focusHistory || {};
    let weeklyMins = 0;
    const todayDate = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(todayDate.getDate() - i);
      const dateStr = getLocalDateString(d);
      weeklyMins += history[dateStr] || 0;
    }
    return {
      today: userState.todayFocusMinutes || 0,
      weeklyHours: (weeklyMins / 60).toFixed(1),
    };
  };

  const focusStats = getFocusStats();
  const dailyGoal = userState.dailyFocusGoal ?? 25;
  const isGoalCompletedToday = focusStats.today >= dailyGoal;

  // Handles starting the recommended learning topic
  const handleContinueLearning = () => {
    if (!recommendation) return;

    SoundManager.play('click');
    SoundManager.vibrate('light');

    // Save preference for today
    localStorage.setItem('studyos_last_studied_subject_today', JSON.stringify({
      date: todayStr,
      subjectId: recommendation.subject.id
    }));

    // Setup focus timer session to run automatically for 25 mins
    const startSessionData = {
      totalSeconds: 25 * 60,
      mode: 'pomodoro',
      isRunning: true,
      secondsElapsed: 0,
      lastTick: Date.now()
    };
    localStorage.setItem('studyos_focus_session', JSON.stringify(startSessionData));

    // Launch details sheet / modal
    onStartTopic(recommendation.topic.id);

    // Open the focus timer overlay
    if (onOpenFocusTimer) {
      onOpenFocusTimer();
    }
  };

  // Handles manual topic clicks from the Browse Subjects list
  const handleSelectTopicManually = (subj: Subject, top: Topic) => {
    SoundManager.play('click');
    SoundManager.vibrate('light');

    // Record today's manual study preference
    localStorage.setItem('studyos_last_studied_subject_today', JSON.stringify({
      date: todayStr,
      subjectId: subj.id
    }));

    // Trigger learning topic details
    onStartTopic(top.id);

    // Close browse modal
    setIsBrowseOpen(false);
  };

  // Dynamic Helpers for Redesigned UI
  const getSubjectProgress = (subject: Subject) => {
    const total = subject.modules.reduce((sum, m) => sum + m.topics.length, 0);
    if (total === 0) return 0;
    const completed = subject.modules.reduce((sum, m) => 
      sum + m.topics.filter(t => completedTopics.includes(t.id)).length, 0
    );
    return Math.round((completed / total) * 100);
  };

  const getUpNextTopic = (): { topic: Topic; module: Module; subject: Subject } | null => {
    if (!recommendation) return null;
    const { topic: currentTopic, module: currentModule, subject: currentSubject } = recommendation;
    
    // Scan topics in current module first, find the one right after currentTopic
    const topicIndex = currentModule.topics.findIndex(t => t.id === currentTopic.id);
    if (topicIndex !== -1 && topicIndex + 1 < currentModule.topics.length) {
      for (let i = topicIndex + 1; i < currentModule.topics.length; i++) {
        const nextTopic = currentModule.topics[i];
        if (!completedTopics.includes(nextTopic.id)) {
          return { topic: nextTopic, module: currentModule, subject: currentSubject };
        }
      }
    }

    // Try other modules in same subject
    for (const mod of currentSubject.modules) {
      if (mod.id !== currentModule.id) {
        for (const top of mod.topics) {
          if (!completedTopics.includes(top.id)) {
            return { topic: top, module: mod, subject: currentSubject };
          }
        }
      }
    }

    // Otherwise, try other active subjects
    for (const sub of activeSubjects) {
      if (sub.id !== currentSubject.id) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id)) {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
    }
    return null;
  };

  const getRecentCompletedTopic = (): { topic: Topic; subject: Subject } | null => {
    if (completedTopics.length > 0) {
      for (const sub of [...activeSubjects, ...backlogSubjects]) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (completedTopics.includes(top.id)) {
              return { topic: top, subject: sub };
            }
          }
        }
      }
    }
    return null;
  };

  const upNext = getUpNextTopic();
  const recent = getRecentCompletedTopic();

  // Progress calculations
  const circularProgressValue = Math.min((focusStats.today / dailyGoal) * 100, 100);
  const remainingMinutes = Math.max(0, dailyGoal - focusStats.today);

  return (
    <div className="space-y-5 font-sans pb-20 max-w-md mx-auto select-none px-4" id="home-tab-container">
      
      {/* ==========================================
          1. GREETING HEADER (CLEAN MATCH TO REFERENCE)
          ========================================== */}
      <div className="pt-6 pb-2 flex items-center justify-between" id="greeting-header">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-11 h-11 bg-[#18181C] border border-white/5 rounded-full flex items-center justify-center text-2xl shadow-lg relative group select-none overflow-hidden" 
            id="user-avatar-emoji"
          >
            {userState.avatar || '🎓'}
            {/* Subtle glow under avatar */}
            <div className="absolute inset-0 bg-[#7C5CFF]/10 rounded-full filter blur-sm opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
          </motion.div>
          <div>
            <p className="text-xs font-medium text-gray-500 leading-tight">Good Evening,</p>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-1.5" id="user-display-name">
              {userState.displayName || userState.username || 'Akash'} <span className="animate-bounce origin-bottom-right">👋</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5" id="user-header-actions">
          {/* Search Button */}
          <button 
            onClick={() => setIsBrowseOpen(true)}
            className="w-10 h-10 rounded-full bg-[#111114] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/5 active:scale-95"
            id="header-search-btn"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
          {/* Notification Button */}
          <button 
            onClick={() => onUpdateState({ 
              previousTabBeforeNotification: userState.activeTab,
              activeTab: 'friends', 
              showNotificationsModal: true 
            })}
            className="w-10 h-10 rounded-full bg-[#111114] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/5 active:scale-95 relative cursor-pointer"
            id="header-notification-btn"
          >
            <Bell className="w-4.5 h-4.5" />
            {/* Purple glowing active indicator dot */}
            {hasActiveNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#7C5CFF] rounded-full border border-[#111114] shadow-[0_0_8px_rgba(124,92,255,0.8)]" />
            )}
          </button>
        </div>
      </div>

      {/* ==========================================
          2. HORIZONTAL STATS ROW (STREAK, SHIELDS, TOTAL XP)
          ========================================== */}
      <div className="grid grid-cols-3 gap-3" id="stats-pill-grid">
        {/* Day Streak */}
        <div className="bg-[#111114] border border-white/5 rounded-[20px] p-3 flex flex-col items-start relative overflow-hidden group">
          <div className="flex items-center gap-1.5 text-[#FFB547]">
            <Flame className="w-4.5 h-4.5 fill-[#FFB547]/15" />
            <span className="text-base font-extrabold font-mono leading-none">{userState.semesterBreakMode ? '0' : (userState.academicStudyStreak ?? 0)}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider font-mono">Day Streak</span>
        </div>
        {/* Shields */}
        <div className="bg-[#111114] border border-white/5 rounded-[20px] p-3 flex flex-col items-start relative overflow-hidden group">
          <div className="flex items-center gap-1.5 text-[#00D4FF]">
            <Shield className="w-4.5 h-4.5 fill-[#00D4FF]/10" />
            <span className="text-base font-extrabold font-mono leading-none">{userState.studyShields ?? 3}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider font-mono">Shields</span>
        </div>
        {/* Total XP */}
        <div className="bg-[#111114] border border-white/5 rounded-[20px] p-3 flex flex-col items-start relative overflow-hidden group">
          <div className="flex items-center gap-1.5 text-[#7C5CFF]">
            <Trophy className="w-4.5 h-4.5" />
            <span className="text-base font-extrabold font-mono leading-none">{userState.xp}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider font-mono">Total XP</span>
        </div>
      </div>

      {/* ==========================================
          3. CONTINUE LEARNING MAIN CARD
          ========================================== */}
      {recommendation ? (
        <div className="bg-gradient-to-br from-[#1C184E] via-[#3B26B2] to-[#7C5CFF] border border-[#7C5CFF]/30 rounded-[32px] p-5.5 shadow-[0_20px_50px_rgba(124,92,255,0.3)] relative overflow-hidden flex items-center justify-between gap-4 animate-fade-in" id="continue-learning-main-card">
          {/* Glowing particle rings inside gradient */}
          <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-[#00D4FF]/10 rounded-full filter blur-xl pointer-events-none" />

          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/70 uppercase tracking-widest font-mono">CONTINUE LEARNING</span>
              <h3 className="text-lg font-black text-white tracking-tight leading-none pt-1">{recommendation.subject.name}</h3>
              <p className="text-[11px] text-white/80 font-bold">{recommendation.module.name}</p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-white/75 font-semibold font-mono">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span>{getTopicEstimatedTime(userState.subjectDifficulties, recommendation.subject.id, recommendation.topic.estimatedTime)} min estimated</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-white/80 font-bold font-mono">
                <span>{getSubjectProgress(recommendation.subject)}% Completed</span>
              </div>
              <div className="w-full h-1 bg-black/25 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${getSubjectProgress(recommendation.subject)}%` }}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinueLearning}
              className="px-5 py-2.5 bg-white text-[#5B36F4] text-xs font-black rounded-full shadow-md hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-transform duration-200"
              id="continue-learning-card-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Continue</span>
            </motion.button>
          </div>

          {/* Svg Book Illustration */}
          <SvgBookIllustration />
        </div>
      ) : (
        <div className="bg-[#111114] border border-white/5 rounded-[32px] p-6 shadow-premium relative overflow-hidden text-center space-y-4" id="all-completed-card">
          <div className="w-14 h-14 bg-[#2BD97F]/10 border border-[#2BD97F]/20 text-[#2BD97F] rounded-full flex items-center justify-center mx-auto shadow-md shadow-[#2BD97F]/5 animate-pulse">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display">All Subjects Completed!</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[280px] mx-auto">
              Incredible job, Scholar! You've mastered all current topics. You can still revise or choose any subject manually.
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
          4. TODAY'S GOAL CARD WITH SEGMENTED PROGRESS
          ========================================== */}
      <div className="bg-[#111114] border border-white/5 rounded-[28px] p-5 space-y-4.5 shadow-lg" id="todays-goal-container">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">TODAY'S GOAL</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-mono">{focusStats.today}</span>
              <span className="text-sm font-bold text-gray-500 font-mono">/ {dailyGoal}</span>
            </div>
            <p className="text-xs text-gray-400 font-bold">Focus Minutes</p>
          </div>

          {/* Custom Glowing Circular Progress Ring */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0" id="goal-circular-progress">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              {/* Background circle */}
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-[#18181C]"
                strokeWidth="4.5"
                fill="transparent"
              />
              {/* Foreground progress circle */}
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-[#2BD97F]"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray="163.36"
                strokeDashoffset={163.36 - (163.36 * circularProgressValue) / 100}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(43, 217, 127, 0.45))' }}
              />
            </svg>
            <div className="absolute text-xs font-black text-white font-mono">
              {Math.round(circularProgressValue)}%
            </div>
          </div>
        </div>

        {/* Segmented Progress bar & Golden Star Slider */}
        <div className="relative pt-1" id="segmented-goal-bar">
          <div className="flex gap-1.5 h-1.5 items-center w-full">
            {[0, 1, 2, 3, 4].map((index) => {
              const segMin = index * 20;
              const segMax = (index + 1) * 20;
              let fillPct = 0;
              if (circularProgressValue >= segMax) {
                fillPct = 100;
              } else if (circularProgressValue > segMin) {
                fillPct = ((circularProgressValue - segMin) / 20) * 100;
              }

              // Color transition: segments 1-3 green, segment 4 orange/yellow, segment 5 orange/yellow with a star
              const segBg = index === 4 ? 'bg-[#FFB547]' : index >= 3 ? 'bg-[#FFB547]/80' : 'bg-[#2BD97F]';

              return (
                <div key={index} className="flex-1 h-1.5 bg-[#18181C] rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className={`h-full ${segBg} transition-all duration-300`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Floating Star Handle */}
          <div 
            className="absolute -top-1.5 w-5 h-5 flex items-center justify-center transition-all duration-300 pointer-events-none text-[#FFB547]"
            style={{ left: `calc(${circularProgressValue}% - 10px)` }}
          >
            <span className="text-xs filter drop-shadow-[0_0_4px_rgba(255,181,71,0.6)]">★</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-0.5">
          {isGoalCompletedToday 
            ? "✓ Daily Focus Goal completed! Streak secured."
            : `${remainingMinutes} more minutes to complete today's goal`}
        </p>
      </div>

      {/* ==========================================
          4B. QUICK ACTIONS (BENTO GRID - MATCHING SCREEN 1)
          ========================================== */}
      <div className="space-y-2.5" id="quick-actions-section">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">QUICK ACTIONS</span>
        <div className="grid grid-cols-4 gap-3">
          {/* Focus Action */}
          <button
            onClick={onOpenFocusTimer}
            className="bg-[#111114] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-[#18181C] transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Focus</span>
          </button>
          {/* Revise Action */}
          <button
            onClick={() => onUpdateState({ activeTab: 'progression' })}
            className="bg-[#111114] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-[#18181C] transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFB547]/10 text-[#FFB547] border border-[#FFB547]/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Revise</span>
          </button>
          {/* Subjects Action */}
          <button
            onClick={() => onUpdateState({ activeTab: 'progression' })}
            className="bg-[#111114] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-[#18181C] transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/15 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Subjects</span>
          </button>
          {/* Friends Action */}
          <button
            onClick={() => onUpdateState({ activeTab: 'friends' })}
            className="bg-[#111114] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-[#18181C] transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#2BD97F]/10 text-[#2BD97F] border border-[#2BD97F]/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Friends</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          5. UP NEXT SECTION
          ========================================== */}
      <div className="space-y-2.5" id="up-next-section">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">UP NEXT</span>
        {upNext ? (
          <div 
            onClick={() => onStartTopic(upNext.topic.id)}
            className="bg-[#111114] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:bg-[#18181C]/75 cursor-pointer transition-all"
            id="up-next-card"
          >
            <div className="flex items-center gap-3">
              {/* Green icon box with { } */}
              <div className="w-11 h-11 rounded-2xl bg-[#153B2D] border border-[#235C45] text-[#2BD97F] flex items-center justify-center font-mono font-bold text-sm shrink-0">
                <span>{"{}"}</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white leading-tight">{upNext.topic.name}</h4>
                <p className="text-[10px] text-gray-500 font-semibold">{upNext.module.name} • {upNext.subject.name}</p>
              </div>
            </div>
            <div className="bg-[#18181C] border border-white/5 rounded-full px-2.5 py-1 text-[10px] text-gray-400 font-bold font-mono">
              {getTopicEstimatedTime(userState.subjectDifficulties, upNext.subject.id, upNext.topic.estimatedTime)} min
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#111114] border border-white/5 rounded-2xl text-center text-xs text-gray-500 italic">
            No remaining topics left. Start revision!
          </div>
        )}
      </div>

      {/* ==========================================
          6. RECENT ACTIVITY SECTION
          ========================================== */}
      <div className="space-y-2.5" id="recent-activity-section">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">RECENT ACTIVITY</span>
          <ArrowRight className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
        </div>

        {recent ? (
          <div className="bg-[#111114] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3" id="recent-activity-item">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white leading-tight">{recent.topic.name}</h4>
                <p className="text-[10px] text-gray-500 font-semibold">{recent.subject.name} • Completed</p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-[#7C5CFF] font-mono">+20 XP</span>
          </div>
        ) : (
          <div className="bg-[#111114] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3" id="recent-activity-item-placeholder">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white leading-tight">Basics of Functions</h4>
                <p className="text-[10px] text-gray-500 font-semibold">Completed • 2h ago</p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-[#A78BFA] font-mono">+20 XP</span>
          </div>
        )}
      </div>

      {/* Android Widget Companion Panel */}
      <AndroidWidgetSimulator
        userState={userState}
        onStartRecommended={recommendation ? () => onStartTopic(recommendation.topic.id) : undefined}
        onOpenFocusTimer={onOpenFocusTimer}
      />

      {/* Choose Something Else Trigger Button */}
      <div className="text-center pt-2" id="secondary-action-container">
        <button
          onClick={() => setIsBrowseOpen(true)}
          className="text-xs font-bold text-gray-400 hover:text-white transition-all inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 py-1"
          id="browse-subjects-trigger"
        >
          <span>Choose Something Else</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ==========================================
          BROWSE SUBJECTS BOTTOM SHEET / MODAL
          ========================================== */}
      <BrowseSubjectsModal
        isOpen={isBrowseOpen}
        onClose={() => setIsBrowseOpen(false)}
        activeSubjects={activeSubjects}
        backlogSubjects={backlogSubjects}
        completedTopics={completedTopics}
        recommendation={recommendation}
        onSelectTopicManually={handleSelectTopicManually}
      />

    </div>
  );
}
