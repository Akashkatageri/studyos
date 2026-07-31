import React, { useState, useMemo } from 'react';
import { UserState, Subject, Module, Topic, TodoItem } from '../types';
import { findTopicById } from '../data';
import { SoundManager } from '../utils/soundManager';
import { getLocalDateString } from '../utils/dateUtils';
import { getDailyReviewQueue } from '../lib/spacedRepetition';
import { 
  Play, 
  Flame, 
  Trophy, 
  Shield, 
  Brain,
  BookOpen,
  Target,
  CheckSquare,
  Square,
  Plus,
  ListTodo,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import SvgBookIllustration from './home/SvgBookIllustration';
import BrowseSubjectsModal from './home/BrowseSubjectsModal';

interface HomeTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
  onStartTopic: (topicId: string) => void;
  onResetTopic?: (topicId: string) => void;
  onCompleteRevision?: (revisionId: string) => void;
  onOpenFocusTimer?: () => void;
  onOpenStudyCalendar?: () => void;
  onTriggerSemesterTransition?: () => void;
  onUpdateState?: (updated: Partial<UserState>) => void;
  onStartReviewSession?: () => void;
  onOpenStreakModal?: () => void;
}

export default function HomeTab({
  userState,
  activeSubjects,
  backlogSubjects,
  onStartTopic,
  onResetTopic: _onResetTopic,
  onStartReviewSession,
  onUpdateState,
}: HomeTabProps) {
  const { completedTopics = [] } = userState;

  // Spaced Repetition Due Count
  const dueReviews = getDailyReviewQueue(userState.revisions || [], userState, activeSubjects, backlogSubjects);
  const dueCount = dueReviews.length;

  // Search & Browse Subjects state
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const todayStr = getLocalDateString();

  // ==========================================
  // TODAY'S TASKS (DAILY TASKS)
  // ==========================================
  const todos = userState.todos || [];
  const [homeQuickTaskTitle, setHomeQuickTaskTitle] = useState('');

  const todayTasks = useMemo(() => {
    const rawToday = todos.filter(t => t.dateCreated === todayStr);
    const dateObj = new Date();
    const dayOfWeek = dateObj.getDay();

    const repeatingTemplates = todos.filter(t => t.repeat && t.repeat !== 'none' && t.dateCreated < todayStr);
    const newlyGeneratedRepeats: TodoItem[] = [];

    repeatingTemplates.forEach(template => {
      let applies = false;
      if (template.repeat === 'daily') applies = true;
      else if (template.repeat === 'mon-wed-fri' && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5)) applies = true;
      else if (template.repeat === 'weekly' && new Date(template.dateCreated).getDay() === dayOfWeek) applies = true;

      if (applies) {
        const existingInstance = rawToday.find(t => t.id === `${template.id}_${todayStr}` || t.title === template.title);
        if (!existingInstance) {
          newlyGeneratedRepeats.push({
            ...template,
            id: `${template.id}_${todayStr}`,
            dateCreated: todayStr,
            completed: false,
            completedAt: undefined,
          });
        }
      }
    });

    return [...rawToday, ...newlyGeneratedRepeats].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [todos, todayStr]);

  const completedHomeTasksCount = todayTasks.filter(t => t.completed).length;
  const totalHomeTasksCount = todayTasks.length;
  const homeTasksPercent = totalHomeTasksCount > 0 ? Math.round((completedHomeTasksCount / totalHomeTasksCount) * 100) : 0;

  const handleToggleHomeTask = (task: TodoItem) => {
    if (!onUpdateState) return;

    const isExistingInState = todos.some(t => t.id === task.id);
    let updatedTodos: TodoItem[];

    if (isExistingInState) {
      updatedTodos = todos.map(t => {
        if (t.id === task.id) {
          const next = !t.completed;
          if (next) {
            SoundManager.play('topic_complete');
            SoundManager.vibrate('success');
          } else {
            SoundManager.play('click');
          }
          return { ...t, completed: next, completedAt: next ? new Date().toISOString() : undefined };
        }
        return t;
      });
    } else {
      const nextCompleted = !task.completed;
      if (nextCompleted) {
        SoundManager.play('topic_complete');
        SoundManager.vibrate('success');
      } else {
        SoundManager.play('click');
      }
      const newInstance: TodoItem = {
        ...task,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
      };
      updatedTodos = [...todos, newInstance];
    }

    onUpdateState({ todos: updatedTodos });
  };

  const handleAddHomeTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeQuickTaskTitle.trim() || !onUpdateState) return;

    const newTask: TodoItem = {
      id: `todo_${Date.now()}`,
      title: homeQuickTaskTitle.trim(),
      completed: false,
      priority: 'medium',
      category: 'study',
      dateCreated: todayStr,
      order: todos.length + 1,
    };

    onUpdateState({ todos: [...todos, newTask] });
    setHomeQuickTaskTitle('');
    SoundManager.play('click');
  };

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

    // 3. Exam Approaching check (within 14 days of semesterEndDate)
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
      for (const sub of activeSubjects) {
        for (const mod of sub.modules) {
          for (const top of mod.topics) {
            if (!completedTopics.includes(top.id) && top.difficulty === 'Hard') {
              return { topic: top, module: mod, subject: sub };
            }
          }
        }
      }
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

    // 4. Backlog subjects recommendation occasionally
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

    // Fallback: Check backlogs
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
  const dailyGoal = userState.dailyFocusGoal ?? 30;

  // Handles starting the recommended learning topic
  const handleContinueLearning = () => {
    if (!recommendation) return;

    SoundManager.play('click');
    SoundManager.vibrate('light');

    localStorage.setItem('studyos_last_studied_subject_today', JSON.stringify({
      date: todayStr,
      subjectId: recommendation.subject.id
    }));

    onStartTopic(recommendation.topic.id);
  };

  // Handles manual topic selection from Browse Subjects
  const handleSelectTopicManually = (subj: Subject, top: Topic) => {
    SoundManager.play('click');
    SoundManager.vibrate('light');

    localStorage.setItem('studyos_last_studied_subject_today', JSON.stringify({
      date: todayStr,
      subjectId: subj.id
    }));

    onStartTopic(top.id);
    setIsBrowseOpen(false);
  };

  const getSubjectProgress = (subject: Subject) => {
    const total = subject.modules.reduce((sum, m) => sum + m.topics.length, 0);
    if (total === 0) return 0;
    const completed = subject.modules.reduce((sum, m) => 
      sum + m.topics.filter(t => completedTopics.includes(t.id)).length, 0
    );
    return Math.round((completed / total) * 100);
  };

  const circularProgressValue = Math.min((focusStats.today / dailyGoal) * 100, 100);

  return (
    <div className="space-y-4 font-sans pb-24 max-w-md mx-auto select-none px-4 pt-2" id="home-tab-container">
      
      {/* ==========================================
          1. TOP QUICK STATS ROW
          ========================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5" id="stats-pill-grid">
        {/* Streak */}
        <button 
          onClick={() => {
            if (onUpdateState) {
              onUpdateState({ activeTab: 'progress' });
            }
          }}
          className="bg-[#111114] hover:bg-[#1A1A22] border border-white/5 hover:border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all cursor-pointer group active:scale-95 text-left w-full shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] min-w-0"
          title="View Streak Details & Progress"
          id="home-streak-stat-card"
        >
          <div className="flex items-center gap-2 text-[#FFB547] min-w-0">
            <Flame className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-[#FFB547]/20 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono leading-none truncate">{userState.academicStudyStreak ?? userState.streak ?? 0}</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 group-hover:text-amber-400 uppercase tracking-wider font-mono transition-colors truncate">STREAK</span>
            <span className="text-[10px] text-amber-500/60 group-hover:text-amber-400 font-mono font-bold">→</span>
          </div>
        </button>

        {/* Shields */}
        <button 
          onClick={() => {
            if (onUpdateState) {
              onUpdateState({ activeTab: 'progress' });
            }
          }}
          className="bg-[#111114] hover:bg-[#1A1A22] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all cursor-pointer group active:scale-95 text-left w-full shadow-sm hover:shadow-[0_0_15px_rgba(0,212,255,0.1)] min-w-0"
          title="View Shields & Progress"
          id="home-shields-stat-card"
        >
          <div className="flex items-center gap-2 text-[#00D4FF] min-w-0">
            <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-[#00D4FF]/10 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono leading-none truncate">{userState.studyShields ?? 0}</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 group-hover:text-cyan-400 uppercase tracking-wider font-mono transition-colors truncate">SHIELDS</span>
            <span className="text-[10px] text-cyan-500/60 group-hover:text-cyan-400 font-mono font-bold">→</span>
          </div>
        </button>

        {/* Total XP */}
        <button 
          onClick={() => {
            if (onUpdateState) {
              onUpdateState({ activeTab: 'progress' });
            }
          }}
          className="bg-[#111114] hover:bg-[#1A1A22] border border-white/5 hover:border-[#7C5CFF]/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all cursor-pointer group active:scale-95 text-left w-full shadow-sm hover:shadow-[0_0_15px_rgba(124,92,255,0.1)] min-w-0"
          title="View XP Stats & Progress Analytics"
          id="home-xp-stat-card"
        >
          <div className="flex items-center gap-2 text-[#7C5CFF] min-w-0">
            <Trophy className="w-4.5 h-4.5 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono leading-none truncate">{userState.xp || 0}</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 group-hover:text-[#A78BFA] uppercase tracking-wider font-mono transition-colors truncate">TOTAL XP</span>
            <span className="text-[10px] text-[#7C5CFF]/60 group-hover:text-[#A78BFA] font-mono font-bold">→</span>
          </div>
        </button>

        {/* Today's Goal */}
        <button 
          onClick={() => {
            if (onUpdateState) {
              onUpdateState({ activeTab: 'progress' });
            }
          }}
          className="bg-[#111114] hover:bg-[#1A1A22] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all cursor-pointer group active:scale-95 text-left w-full shadow-sm hover:shadow-[0_0_15px_rgba(43,217,127,0.1)] min-w-0"
          title="View Daily Goal Progress"
          id="home-goal-stat-card"
        >
          <div className="flex items-center gap-2 text-[#2BD97F] min-w-0">
            <Target className="w-4.5 h-4.5 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono leading-none truncate">{focusStats.today}/{dailyGoal}m</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 group-hover:text-emerald-400 uppercase tracking-wider font-mono transition-colors truncate">GOAL</span>
            <span className="text-[10px] text-emerald-500/80 group-hover:text-emerald-400 font-mono font-bold">{Math.round(circularProgressValue)}%</span>
          </div>
        </button>
      </div>

      {/* ==========================================
          3. DOMINANT PRIMARY HERO CARD ("CONTINUE LEARNING")
          ========================================== */}
      {recommendation ? (
        <div className="bg-[#130F30] border border-[#2F216E] rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-[0_12px_30px_rgba(124,92,255,0.2)] relative overflow-hidden flex items-start sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in" id="continue-learning-main-card">
          <div className="space-y-3.5 flex-1 min-w-0 z-10">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] sm:text-[10px] font-black text-[#A78BFA] uppercase tracking-widest font-mono flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current text-[#A78BFA]" />
                  <span>CONTINUE LEARNING</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsBrowseOpen(true)}
                  className="text-[10px] sm:text-[11px] font-bold text-[#A78BFA] hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  title="Change Topic"
                  id="change-topic-btn"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Change Topic</span>
                </button>
              </div>
              <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight leading-tight">{recommendation.subject.name}</h3>
              <p className="text-xs sm:text-sm text-[#A78BFA] font-medium leading-snug">
                {recommendation.module.name}
              </p>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2 bg-[#0D0A22] rounded-full overflow-hidden flex items-center">
                <div 
                  className="h-full bg-[#7C5CFF] rounded-full transition-all duration-500"
                  style={{ width: `${getSubjectProgress(recommendation.subject)}%` }}
                />
              </div>
              <div className="flex justify-end text-[10px] sm:text-xs text-[#A78BFA] font-bold font-mono">
                <span>{getSubjectProgress(recommendation.subject)}% done</span>
              </div>
            </div>

            <div className="pt-0.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinueLearning}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                id="continue-learning-card-btn"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continue</span>
              </motion.button>
            </div>
          </div>

          <div className="w-20 sm:w-28 shrink-0 flex items-center justify-center pt-2 sm:pt-0">
            <SvgBookIllustration />
          </div>
        </div>
      ) : (
        <div className="bg-[#111114] border border-white/5 rounded-[28px] p-6 text-center space-y-3">
          <Trophy className="w-8 h-8 text-[#2BD97F] mx-auto" />
          <h3 className="text-base font-bold text-white">All Subjects Completed!</h3>
          <p className="text-xs text-gray-400">Great work! You can revise or choose any topic manually.</p>
          <button
            onClick={() => setIsBrowseOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Select Topic Manually</span>
          </button>
        </div>
      )}





      {/* ==========================================
          5. REVIEW DUE (SPACED REPETITION AS SUPPORTING NOTE)
          ========================================== */}
      {onStartReviewSession && (
        <div className="space-y-1.5" id="review-due-section">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">REVIEW DUE</span>
          <div className="bg-[#15102A] border border-[#2F216E] rounded-[24px] p-4.5 flex items-center justify-between gap-3 animate-fade-in" id="spaced-repetition-reviews-card">
            <div className="space-y-3 flex-1">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#A78BFA] uppercase tracking-widest font-mono flex items-center gap-1">
                  <Brain className="w-3 h-3 text-[#A78BFA]" />
                  <span>SPACED REPETITION</span>
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight pt-0.5">Today's reviews</h3>
                <p className="text-xs font-medium text-gray-400">
                  {dueCount > 0 
                    ? `${dueCount} ${dueCount === 1 ? 'topic needs' : 'topics need'} revision` 
                    : 'All caught up! 0 reviews due today'}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartReviewSession}
                className="px-4 py-2 bg-[#1C1635] hover:bg-[#251E45] border border-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                id="start-review-session-btn"
              >
                <Play className="w-3 h-3 fill-current text-white" />
                <span>{dueCount > 0 ? 'Start review' : 'Review / Practice'}</span>
              </motion.button>
            </div>

            <div className="text-4xl shrink-0 pr-1 select-none opacity-90">
              🧠
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          6. DAILY TASKS (COLORFUL TODAY'S TASK LIST)
          ========================================== */}
      <div className="space-y-1.5" id="home-daily-tasks-section">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-[#A78BFA] uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-purple-400" />
              <span>DAILY TASKS</span>
            </span>
            {totalHomeTasksCount > 0 && (
              <span className="bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
                {completedHomeTasksCount}/{totalHomeTasksCount} Done ({homeTasksPercent}%)
              </span>
            )}
          </div>
          {onUpdateState && (
            <button
              type="button"
              onClick={() => onUpdateState({ activeTab: 'todos' })}
              className="text-[11px] font-bold text-purple-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
            </button>
          )}
        </div>

        <div className="bg-gradient-to-br from-[#181133] via-[#130E2B] to-[#201442] border border-[#3A2785] rounded-[24px] p-4.5 sm:p-5 space-y-3.5 shadow-[0_10px_30px_rgba(124,92,255,0.15)] relative overflow-hidden" id="home-daily-tasks-card">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />

          {/* Progress bar if tasks exist */}
          {totalHomeTasksCount > 0 && (
            <div className="space-y-1">
              <div className="w-full h-2 bg-[#0E0A21] rounded-full overflow-hidden p-0.5 border border-purple-900/40">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                  style={{ width: `${homeTasksPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Add Form */}
          <form onSubmit={handleAddHomeTask} className="flex items-center gap-2 relative z-10">
            <input
              type="text"
              value={homeQuickTaskTitle}
              onChange={(e) => setHomeQuickTaskTitle(e.target.value)}
              placeholder="Add a quick task for today..."
              className="flex-1 bg-[#0F0A22] border border-[#332377] focus:border-[#A78BFA] text-xs font-medium text-white placeholder-purple-300/40 px-3.5 py-2.5 rounded-xl focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!homeQuickTaskTitle.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-[0_4px_14px_rgba(124,92,255,0.4)] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </form>

          {/* Task List */}
          {todayTasks.length > 0 ? (
            <div className="space-y-2 pt-1 relative z-10">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleHomeTask(task)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-gray-400 shadow-none'
                      : task.priority === 'high'
                        ? 'bg-gradient-to-r from-[#2B1432] to-[#1F1238] border-pink-500/40 text-white shadow-[0_2px_12px_rgba(236,72,153,0.15)] hover:border-pink-500/60'
                        : 'bg-[#181233]/90 hover:bg-[#1E1740] border-purple-500/20 text-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer focus:outline-none"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4.5 h-4.5 text-emerald-400" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-purple-400 hover:text-white" />
                      )}
                    </button>
                    <span className={`text-xs font-semibold truncate ${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.category && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-purple-500/15 text-purple-300 border border-purple-500/25">
                        {task.category}
                      </span>
                    )}
                    {task.priority === 'high' ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                        High
                      </span>
                    ) : task.priority === 'medium' ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        Med
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 px-2 space-y-1.5 relative z-10">
              <ListTodo className="w-6 h-6 text-purple-400/60 mx-auto" />
              <p className="text-xs text-purple-200/90 font-semibold">No tasks set for today yet</p>
              <p className="text-[10px] text-purple-300/60">Type a task above or click <span className="text-[#A78BFA] font-bold">View All</span> to manage your full checklist.</p>
            </div>
          )}
        </div>
      </div>

      {/* BROWSE SUBJECTS BOTTOM SHEET / MODAL */}
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
