import React, { useState } from 'react';
import { Revision, UserState, Subject } from '../types';
import { findTopicById, COURSE_TEMPLATES } from '../data';
import { SoundManager } from '../utils/soundManager';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Clock, AlertTriangle, Play, Award, Sparkles, Trophy, Settings2, Archive } from 'lucide-react';
import TopicViewModal from './TopicViewModal';
import { getEstimatedReviewTimeMinutes } from '../lib/spacedRepetition';

interface ReviewSessionViewProps {
  dueRevisions: Revision[];
  userState: UserState;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
  onCompleteReview: (revision: Revision, rating: 'forgot' | 'hard' | 'good' | 'easy') => void;
  onUpdateState?: (newState: Partial<UserState>) => void;
  onClose: () => void;
}

export default function ReviewSessionView({
  dueRevisions,
  userState,
  activeSubjects,
  backlogSubjects,
  onCompleteReview,
  onUpdateState,
  onClose,
}: ReviewSessionViewProps) {
  const [activeReviewTopicId, setActiveReviewTopicId] = useState<string | null>(null);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [showSingleCelebration, setShowSingleCelebration] = useState(false);
  const [lastRating, setLastRating] = useState<'forgot' | 'hard' | 'good' | 'easy' | null>(null);
  const [lastXpAwarded, setLastXpAwarded] = useState(15);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [batchLimit, setBatchLimit] = useState(() => {
    return parseInt(localStorage.getItem('studyos_review_batch_size') || '25', 10);
  });

  // Construct comprehensive list of all subjects across all semesters for lookup
  const uData = COURSE_TEMPLATES[userState.university] || COURSE_TEMPLATES['VTU'];
  const bData = uData?.[userState.branch] || (uData ? uData[Object.keys(uData)[0]] : undefined);
  const sData = bData?.[userState.scheme] || (bData ? bData[Object.keys(bData)[0]] : undefined);

  const allSubjectsMap = new Map<string, Subject>();
  [...activeSubjects, ...backlogSubjects].forEach((s) => allSubjectsMap.set(s.id, s));

  if (sData) {
    Object.keys(sData).forEach((semKey) => {
      const semSubjects = sData[Number(semKey)] || [];
      semSubjects.forEach((sub) => {
        if (!allSubjectsMap.has(sub.id)) {
          allSubjectsMap.set(sub.id, sub);
        }
      });
    });
  }

  const allLookupSubjects = Array.from(allSubjectsMap.values());
  const todayStr = new Date().toISOString().split('T')[0];

  const handleBatchLimitChange = (limit: number) => {
    setBatchLimit(limit);
    localStorage.setItem('studyos_review_batch_size', limit.toString());
    SoundManager.play('click');
    SoundManager.vibrate('light');
  };

  // Helper to get practice revisions from existing revisions or completedTopics
  const getPracticeRevisions = (): Revision[] => {
    const revsMap = new Map<string, Revision>();

    // 1. Existing revisions in userState
    const existingRevs = userState.revisions || [];
    for (const rev of existingRevs) {
      revsMap.set(rev.topicId, rev);
    }

    // 2. Completed topics in userState that don't have a revision record yet
    const completedIds = userState.completedTopics || [];
    for (const topId of completedIds) {
      if (!revsMap.has(topId)) {
        const res = findTopicById(topId, allLookupSubjects, []);
        revsMap.set(topId, {
          id: `practice-${topId}`,
          topicId: topId,
          subjectId: res?.subject.id || 'subject',
          subjectName: res?.subject.name || 'Subject',
          topicName: res?.topic.name || 'Topic',
          completed: true,
          learningDifficulty: 'medium',
          repetitions: 1,
          interval: 1,
          lastReviewed: todayStr,
          nextReview: todayStr,
          status: 'due',
          completedAt: todayStr,
          dueDate: todayStr,
        });
      }
    }

    return Array.from(revsMap.values());
  };

  const practiceRevisions = getPracticeRevisions();
  const availablePracticeCount = practiceRevisions.length;

  const revisionsToUse = isPracticeMode
    ? practiceRevisions
    : dueRevisions;

  // Sliced revisions based on the user's batch selection
  const activeBatchRevisions = revisionsToUse.slice(0, batchLimit);

  // Resolve due revisions to include original Topic and Subject data with fallbacks
  const resolvedDueQueue = activeBatchRevisions.map((rev) => {
    const result = findTopicById(rev.topicId, allLookupSubjects, []);
    const topic = result?.topic || {
      id: rev.topicId,
      name: rev.topicName || 'Study Topic',
      difficulty: (rev.learningDifficulty === 'easy' ? 'Easy' : rev.learningDifficulty === 'hard' ? 'Hard' : 'Medium') as 'Easy' | 'Medium' | 'Hard',
      estimatedTime: 15,
    };
    const subject = result?.subject || {
      id: rev.subjectId || 'subject',
      name: rev.subjectName || 'Subject',
      semester: 1,
      modules: [],
    };
    return {
      revision: rev,
      topic,
      subject,
      isOverdue: rev.nextReview < todayStr,
    };
  });

  const handleStartTopicRevision = (topicId: string) => {
    setActiveReviewTopicId(topicId);
    SoundManager.play('click');
    SoundManager.vibrate('light');
  };

  const handleCompleteTopicRevision = (topicId: string, rating: 'forgot' | 'hard' | 'good' | 'easy') => {
    const item = resolvedDueQueue.find((q) => q.revision.topicId === topicId);
    if (!item) return;

    // Calculate total XP award (base 15 + bonuses)
    let totalXp = 15;
    if (item.revision.nextReview < todayStr) {
      totalXp += 15; // Overdue focus bonus
    }
    if (item.revision.learningDifficulty === 'hard' && (rating === 'good' || rating === 'easy')) {
      totalXp += 25; // Mastering hard topic bonus
    }
    const isLastInQueue = resolvedDueQueue.length === 1 && resolvedDueQueue[0].revision.id === item.revision.id;
    if (isLastInQueue) {
      totalXp += 50; // Mission clear bonus
    }
    const reviewStreak = userState.reviewStreak || 0;
    if (reviewStreak > 0 && userState.lastReviewDate !== todayStr) {
      totalXp += Math.min(50, reviewStreak * 10); // review streak bonus
    }

    // Call top-level updater
    onCompleteReview(item.revision, rating);
    
    // Increment local metrics
    setSessionCompletedCount((prev) => prev + 1);
    setEarnedXp((prev) => prev + totalXp);
    setLastXpAwarded(totalXp);
    setLastRating(rating);

    // Play feedback sound
    if (rating === 'forgot') {
      SoundManager.play('error');
      SoundManager.vibrate('medium');
    } else if (rating === 'hard') {
      SoundManager.play('xp_gain');
      SoundManager.vibrate('light');
    } else {
      SoundManager.play('level_up');
      SoundManager.vibrate('success');
    }

    setActiveReviewTopicId(null);
    setShowSingleCelebration(true);
  };

  const totalReviews = activeBatchRevisions.length + sessionCompletedCount;
  const progressPercent = totalReviews > 0 ? Math.round((sessionCompletedCount / totalReviews) * 100) : 0;
  const estMinutesRemaining = getEstimatedReviewTimeMinutes(
    resolvedDueQueue.map(item => item.revision),
    activeSubjects,
    backlogSubjects
  );

  const nextItem = resolvedDueQueue[0];

  return (
    <div className="fixed inset-0 z-50 bg-[#0C0F12] flex flex-col font-sans select-none overflow-y-auto">
      {/* Background ambient light overlays */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-4xl w-full mx-auto px-4 pt-6 pb-2 flex items-center justify-between gap-4 relative z-10">
        <button
          onClick={onClose}
          className="p-3 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-all cursor-pointer"
          style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          id="btn-close-review-session"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dynamic Progress Indicator */}
        <div className="flex-1 max-w-xl mx-4 space-y-1">
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 font-mono font-bold">
            <span>TODAY'S MISSION</span>
            <span>{sessionCompletedCount} / {totalReviews} COMPLETED</span>
          </div>
          <div className="w-full h-3 bg-gray-950 border border-gray-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C5CFF] to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent || 3}%` }}
            />
          </div>
        </div>

        <div className="bg-[#7C5CFF]/10 border border-[#7C5CFF]/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[#A58BFF] font-mono font-black text-xs">
          <Trophy className="w-3.5 h-3.5" />
          <span>+{earnedXp} XP</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col justify-start relative z-10">
        <AnimatePresence mode="wait">
          {showSingleCelebration ? (
            /* Single Revision Completed Intermediate Celebration */
            <motion.div
              key="single-celebrate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full mx-auto bg-[#141A1F] border border-gray-800 rounded-[32px] p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-md relative animate-bounce">
                <Award className="w-8 h-8 text-[#0C0F12]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-emerald-400 tracking-tight uppercase">Great Job!</h3>
                <p className="text-xs text-gray-400">
                  You successfully rated this topic as <strong className="text-emerald-300 uppercase">{lastRating}</strong>!
                </p>
                <p className="text-2xl font-black text-white font-mono animate-pulse">+{lastXpAwarded} XP</p>
              </div>
              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 font-mono font-bold uppercase">
                {sessionCompletedCount} / {totalReviews} COMPLETED
              </p>
              <button
                onClick={() => {
                  SoundManager.play('click');
                  setShowSingleCelebration(false);
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0C0F12] text-sm font-black tracking-widest uppercase rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                style={{ minHeight: '48px' }}
                id="btn-celebration-continue"
              >
                <span>Continue →</span>
              </button>
            </motion.div>
          ) : resolvedDueQueue.length > 0 ? (
            /* Active Mission Screen focusing on next target */
            <motion.div
              key="queue"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Mission Header */}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-purple-400">
                  <Brain className="w-5 h-5 fill-purple-400/10" />
                  <span className="text-xs font-black tracking-widest font-mono uppercase">
                    {userState.examModeActive || (userState.examDate && dueRevisions.length > 0) ? '🔥 EXAM MODE ACTIVE' : "TODAY'S MISSION"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {userState.examModeActive ? 'Optimised Revision Target' : 'Current Revision Target'}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Est. Time Remaining: <strong>{estMinutesRemaining} min</strong></span>
                  </span>
                  <span>•</span>
                  <span><strong>{resolvedDueQueue.length}</strong> tasks remaining today</span>
                </div>

                {userState.semester > 1 && onUpdateState && (
                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                      <Archive className="w-3.5 h-3.5 text-purple-400" />
                      Archived Semesters:
                    </span>
                    {Array.from({ length: userState.semester - 1 }, (_, i) => i + 1).map((semNum) => {
                      const isIncluded = (userState.includedReviewSemesters || []).includes(semNum);
                      return (
                        <button
                          key={`rev-sem-${semNum}`}
                          type="button"
                          onClick={() => {
                            const current = userState.includedReviewSemesters || [];
                            const updated = isIncluded
                              ? current.filter((s) => s !== semNum)
                              : [...current, semNum];
                            onUpdateState({ includedReviewSemesters: updated });
                            SoundManager.play('click');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                            isIncluded
                              ? 'bg-purple-600/30 border border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                              : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          <span>Sem {semNum}</span>
                          <span className="text-[9px] opacity-75">{isIncluded ? '✓' : 'Archived'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Next Target Focus Card */}
              <div className="bg-[#141A1F] border-2 border-purple-500/25 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_8px_30px_rgba(124,92,255,0.1)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-mono text-purple-400 font-extrabold uppercase tracking-widest">Active Mission Target</span>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider bg-gray-950 px-2.5 py-1 rounded-md">
                      {nextItem.subject.name}
                    </span>
                    {nextItem.isOverdue && (
                      <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue Focus
                      </span>
                    )}
                    {nextItem.revision.examImportant && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-amber-500/20" />
                        Exam Priority
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    {nextItem.topic.name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-800/60 mt-4">
                    <span>Difficulty: <strong className={
                      nextItem.revision.learningDifficulty === 'easy' ? 'text-green-400' :
                      nextItem.revision.learningDifficulty === 'hard' ? 'text-rose-400' : 'text-blue-400'
                    }>{
                      nextItem.revision.learningDifficulty === 'easy' ? '🟢 Easy' :
                      nextItem.revision.learningDifficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'
                    }</strong></span>
                    <span>Interval: <strong className="text-gray-300 font-mono">{nextItem.revision.interval}d</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartTopicRevision(nextItem.revision.topicId)}
                  className="w-full py-4 bg-gradient-to-r from-[#7C5CFF] to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-black text-sm tracking-widest uppercase rounded-2xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  style={{ minHeight: '48px' }}
                  id="btn-mission-start-review"
                >
                  <Play className="w-4 h-4 fill-current animate-pulse" />
                  <span>Start Review</span>
                </button>
              </div>

              {/* Dynamic Batch Limit Configuration Section */}
              <div className="bg-[#141A1F]/60 border border-gray-800/80 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Settings2 className="w-4 h-4 text-purple-400" />
                    <span>Daily Mission Batch Size</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400">{batchLimit} Reviews / Day</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleBatchLimitChange(size)}
                      className={`py-2 text-xs font-bold font-mono uppercase rounded-xl transition-all border cursor-pointer ${
                        batchLimit === size
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                          : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Upcoming Missions List */}
              {resolvedDueQueue.length > 1 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest">
                    Remaining in this Mission ({resolvedDueQueue.length - 1})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                    {resolvedDueQueue.slice(1, 5).map((item) => (
                      <div
                        key={item.revision.topicId}
                        className="bg-[#141A1F]/40 border border-gray-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                            {item.subject.name}
                          </span>
                          <p className="font-bold text-gray-300 truncate pr-4">{item.topic.name}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">
                          {item.revision.learningDifficulty === 'easy' ? '🟢 Easy' :
                           item.revision.learningDifficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'}
                        </span>
                      </div>
                    ))}
                    {resolvedDueQueue.length > 5 && (
                      <p className="text-center text-[10px] text-gray-500 italic">
                        + {resolvedDueQueue.length - 5} more revisions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* All Revisions Complete / All Caught Up Screen */
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full mx-auto bg-[#141A1F] border border-gray-800 rounded-[32px] p-6 sm:p-8 text-center space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-[-10%] left-[-10%] w-48 h-48 bg-purple-500/10 rounded-full filter blur-xl pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-[#00D4FF]/10 rounded-full filter blur-xl pointer-events-none" />

              <div className="space-y-4">
                <div className="w-20 h-20 bg-gradient-to-tr from-[#7C5CFF] to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg relative animate-bounce">
                  <Award className="w-10 h-10 text-white animate-pulse" />
                  <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1" />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight leading-none uppercase">
                    {sessionCompletedCount > 0 ? '🎉 Mission Cleared!' : '✨ All Caught Up!'}
                  </h1>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                    {sessionCompletedCount > 0 
                      ? 'Excellent Work! Come back tomorrow for your next review session. You completed your scheduled revision queue and secured your daily recall boost!'
                      : 'You have no pending revisions due today! All your completed study topics are up to date.'}
                  </p>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-3.5 bg-[#0C0F12] border border-gray-800/80 rounded-2xl p-4">
                <div className="text-center p-2 border-r border-gray-850">
                  <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">REVISIONS DONE</p>
                  <p className="text-xl font-black font-mono text-emerald-400 mt-1">+{sessionCompletedCount}</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">XP EARNED</p>
                  <p className="text-xl font-black font-mono text-[#7C5CFF] mt-1">+{earnedXp} XP</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {userState.semester > 1 && onUpdateState && (
                  <div className="p-4 bg-[#0C0F12] border border-purple-500/30 rounded-2xl space-y-3 text-left shadow-lg">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Archive className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">Review Previous Semesters (GATE / Placements)</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">
                      Your past semester study history is safely archived! Select past semesters to include them in revision or practice mode:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.from({ length: userState.semester - 1 }, (_, i) => i + 1).map((semNum) => {
                        const isIncluded = (userState.includedReviewSemesters || []).includes(semNum);
                        return (
                          <button
                            key={`empty-sem-${semNum}`}
                            type="button"
                            onClick={() => {
                              const current = userState.includedReviewSemesters || [];
                              const updated = isIncluded
                                ? current.filter((s) => s !== semNum)
                                : [...current, semNum];
                              onUpdateState({ includedReviewSemesters: updated });
                              setIsPracticeMode(true);
                              SoundManager.play('click');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 ${
                              isIncluded
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                            }`}
                          >
                            <span>Semester {semNum}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-semibold">
                              {isIncluded ? 'Included ✓' : 'Archived'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sessionCompletedCount === 0 && !isPracticeMode && availablePracticeCount > 0 && (
                  <button
                    onClick={() => {
                      setIsPracticeMode(true);
                      SoundManager.play('click');
                    }}
                    className="w-full py-3.5 px-6 bg-[#1C1635] hover:bg-[#251E45] border border-[#7C5CFF]/40 text-white text-xs font-black tracking-widest uppercase rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Brain className="w-4 h-4 text-[#A78BFA]" />
                    <span>Practice {availablePracticeCount} Topics Anyway</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-4 px-6 bg-gradient-to-r from-[#7C5CFF] to-pink-500 text-white text-sm font-black tracking-widest uppercase rounded-2xl hover:from-purple-500 hover:to-pink-400 cursor-pointer shadow-lg shadow-purple-500/25 transition-all duration-200"
                  style={{ minHeight: '48px' }}
                >
                  {sessionCompletedCount > 0 ? 'Continue Learning' : 'Return to Dashboard'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Render TopicViewModal for active revision */}
      {activeReviewTopicId && (() => {
        const item = resolvedDueQueue.find((q) => q.revision.topicId === activeReviewTopicId);
        if (!item) return null;
        return (
          <TopicViewModal
            topic={item.topic}
            subject={item.subject}
            userState={userState}
            isCompleted={true}
            isRevisionDue={true}
            onClose={() => setActiveReviewTopicId(null)}
            onMarkCompleted={() => {}}
            onCompleteRevision={(topicId, rating) => handleCompleteTopicRevision(topicId, rating)}
          />
        );
      })()}
    </div>
  );
}
