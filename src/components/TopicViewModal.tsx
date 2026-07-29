import React from 'react';
import { Topic, Subject, UserState } from '../types';
import { X, Clock, ShieldCheck, Trophy, RefreshCw, Calendar, Star, RotateCcw } from 'lucide-react';
import { getSubjectDifficulty, getTopicEstimatedTime, getDifficultyConfig } from '../utils/xpUtils';
import { SoundManager } from '../utils/soundManager';
import { motion } from 'motion/react';

interface TopicViewModalProps {
  topic: Topic | null;
  subject: Subject | null;
  userState: UserState;
  isCompleted: boolean;
  isRevisionDue?: boolean;
  onClose: () => void;
  onMarkCompleted: (topicId: string, difficulty?: 'easy' | 'medium' | 'hard') => void;
  onResetTopic?: (topicId: string) => void;
  onCompleteRevision?: (topicId: string, rating: 'forgot' | 'hard' | 'good' | 'easy') => void;
  onStartFocusTimer?: (topicName: string) => void;
  onToggleExamImportant?: (topicId: string, examImportant: boolean) => void;
}

export default function TopicViewModal({
  topic,
  subject,
  userState,
  isCompleted,
  isRevisionDue = false,
  onClose,
  onMarkCompleted,
  onResetTopic,
  onCompleteRevision,
  onStartFocusTimer,
  onToggleExamImportant,
}: TopicViewModalProps) {
  if (!topic || !subject) return null;

  const [showDifficultyPrompt, setShowDifficultyPrompt] = React.useState(false);
  const [showRecallPrompt, setShowRecallPrompt] = React.useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = React.useState(false);

  const diff = getSubjectDifficulty(userState.subjectDifficulties, subject.id);
  const estMinutes = getTopicEstimatedTime(userState.subjectDifficulties, subject.id, topic.estimatedTime);
  const diffConfig = getDifficultyConfig(userState.subjectDifficulties, subject.id);

  const existingRevision = (userState.revisions || []).find((r) => r.topicId === topic.id);

  // Auto transition for completion celebration flow
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showCompletionCelebration) {
      timer = setTimeout(() => {
        setShowCompletionCelebration(false);
        setShowDifficultyPrompt(true);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showCompletionCelebration]);

  // Generate history dates for timeline
  const timelineItems: { label: string; date: string; checked: boolean }[] = [];
  if (isCompleted) {
    const completedDate = existingRevision?.completedAt || 'Recently';
    timelineItems.push({ label: 'Completed Topic', date: completedDate, checked: true });
    
    const srsHistory = existingRevision?.history || [];
    if (srsHistory.length > 0) {
      srsHistory.forEach((h, i) => {
        let ratingEmoji = '🙂';
        if (h.rating === 'forgot') ratingEmoji = '😖';
        else if (h.rating === 'hard') ratingEmoji = '😐';
        else if (h.rating === 'easy') ratingEmoji = '😎';
        timelineItems.push({ label: `${ratingEmoji} Revision #${i + 1}`, date: h.date, checked: true });
      });
    } else if (existingRevision && existingRevision.repetitions > 0) {
      const reps = existingRevision.repetitions;
      for (let i = 1; i <= reps; i++) {
        timelineItems.push({ label: `✓ Revision #${i}`, date: existingRevision.lastReviewed, checked: true });
      }
    }
    
    if (existingRevision && !isRevisionDue) {
      timelineItems.push({ label: 'Next Scheduled Review', date: existingRevision.nextReview, checked: false });
    }
  }

  const celebrationParticles = Array.from({ length: 20 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C0F12]/95 select-none font-sans">
      <div className="relative w-full max-w-lg bg-[#141A1F] border border-gray-800 rounded-3xl shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-none">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white rounded-full transition-all cursor-pointer z-20 shadow-lg animate-fade-in"
          style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          id="btn-close-topic-modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6 sm:space-y-8 relative z-10 pt-4 sm:pt-0">
          {/* Header */}
          <div className="space-y-1.5 pr-8">
            <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">
              Syllabus Study Module • {subject.name}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
              {topic.name}
            </h2>
          </div>

          {/* Minimal Meta Boxes */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-[#0C0F12] border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-center space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Estimated Time</span>
              </div>
              <p className="text-base sm:text-lg font-bold font-mono text-white">{estMinutes} Min</p>
            </div>

            <div className="bg-[#0C0F12] border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-center space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Difficulty</span>
              </div>
              <p className={`text-base sm:text-lg font-bold ${
                diff === 'Easy' ? 'text-green-400' :
                diff === 'Medium' ? 'text-blue-400' : 'text-rose-400'
              }`}>{diff}</p>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-2xl text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              Study this topic using your own lectures, books, YouTube, or syllabus materials.
              Once done, log your quest completion to schedules automatic reviews!
            </p>
          </div>

          {/* Prompt / Completion Flow */}
          <div className="space-y-4">
            {showCompletionCelebration ? (
              <div className="bg-[#0C0F12] border border-emerald-500/30 rounded-2xl p-6 text-center space-y-6 relative overflow-hidden animate-fade-in shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                {/* Floating soft particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {celebrationParticles.map((_, i) => {
                    const size = Math.random() * 8 + 4;
                    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899'];
                    const left = `${Math.random() * 100}%`;
                    const delay = Math.random() * 0.8;
                    return (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: colors[i % colors.length],
                          left,
                          bottom: '-10%',
                        }}
                        animate={{
                          bottom: '110%',
                          x: [0, Math.random() * 60 - 30, Math.random() * 60 - 30],
                        }}
                        transition={{
                          duration: 1.5 + Math.random() * 1.5,
                          delay,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                    <Trophy className="w-8 h-8 text-[#0C0F12]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-emerald-400 tracking-tight uppercase">✓ Topic Completed!</h3>
                    <p className="text-2xl font-black text-white font-mono animate-pulse">+{diffConfig.xpReward} XP</p>
                  </div>
                </div>
                <div className="border-t border-gray-800/80 my-4" />
                <button
                  onClick={() => {
                    setShowCompletionCelebration(false);
                    setShowDifficultyPrompt(true);
                  }}
                  className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-[#0C0F12] text-xs font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                  id="btn-continue-difficulty"
                >
                  <span>Continue →</span>
                </button>
              </div>
            ) : showDifficultyPrompt ? (
              <div className="bg-[#0C0F12] border border-gray-800 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                  How difficult was this topic to learn?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      onMarkCompleted(topic.id, 'easy');
                      setShowDifficultyPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-900/50 hover:bg-emerald-500/10 border border-gray-800 hover:border-emerald-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-emerald-400 font-bold"
                    style={{ minHeight: '64px' }}
                    id="btn-diff-easy"
                  >
                    <span className="text-xl mb-1">🟢</span>
                    <span>Easy</span>
                  </button>
                  <button
                    onClick={() => {
                      onMarkCompleted(topic.id, 'medium');
                      setShowDifficultyPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-900/50 hover:bg-blue-500/10 border border-gray-800 hover:border-blue-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-blue-400 font-bold"
                    style={{ minHeight: '64px' }}
                    id="btn-diff-medium"
                  >
                    <span className="text-xl mb-1">🟡</span>
                    <span>Medium</span>
                  </button>
                  <button
                    onClick={() => {
                      onMarkCompleted(topic.id, 'hard');
                      setShowDifficultyPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-900/50 hover:bg-rose-500/10 border border-gray-800 hover:border-rose-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-rose-400 font-bold"
                    style={{ minHeight: '64px' }}
                    id="btn-diff-hard"
                  >
                    <span className="text-xl mb-1">🔴</span>
                    <span>Hard</span>
                  </button>
                </div>
              </div>
            ) : showRecallPrompt ? (
              <div className="bg-[#0C0F12] border border-gray-800 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                  How well did you remember this topic today?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onCompleteRevision?.(topic.id, 'forgot');
                      setShowRecallPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-gray-900/50 hover:bg-rose-500/10 border border-gray-800 hover:border-rose-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-rose-400 font-bold"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="text-2xl mb-1">😖</span>
                    <span>Forgot</span>
                  </button>
                  <button
                    onClick={() => {
                      onCompleteRevision?.(topic.id, 'hard');
                      setShowRecallPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-gray-900/50 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-amber-400 font-bold"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="text-2xl mb-1">😐</span>
                    <span>Hard</span>
                  </button>
                  <button
                    onClick={() => {
                      onCompleteRevision?.(topic.id, 'good');
                      setShowRecallPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-gray-900/50 hover:bg-blue-500/10 border border-gray-800 hover:border-blue-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-blue-400 font-bold"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="text-2xl mb-1">🙂</span>
                    <span>Good</span>
                  </button>
                  <button
                    onClick={() => {
                      onCompleteRevision?.(topic.id, 'easy');
                      setShowRecallPrompt(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-gray-900/50 hover:bg-emerald-500/10 border border-gray-800 hover:border-emerald-500/30 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-emerald-400 font-bold"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="text-2xl mb-1">😎</span>
                    <span>Easy</span>
                  </button>
                </div>
              </div>
            ) : isCompleted && !isRevisionDue ? (
              <div className="space-y-3 w-full">
                <div className="w-full py-4 px-6 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 text-sm font-black tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2 select-none">
                  <Trophy className="w-5 h-5 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                  <span>✓ TOPIC COMPLETED</span>
                </div>

                {/* Editable difficulty & Exam Mode toggle inside completed section */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider">Learning Difficulty</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {existingRevision?.learningDifficulty === 'easy' ? '🟢 Easy' :
                         existingRevision?.learningDifficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        SoundManager.play('click');
                        setShowDifficultyPrompt(true);
                      }}
                      className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-blue-400 hover:text-blue-300 font-extrabold tracking-wider uppercase rounded-xl border border-gray-700 transition-all cursor-pointer active:scale-95"
                      style={{ minHeight: '32px' }}
                      id="btn-change-difficulty"
                    >
                      Change
                    </button>
                  </div>

                  {/* Exam Important Toggle */}
                  {onToggleExamImportant && (
                    <div className="flex items-center justify-between border-t border-gray-800/60 pt-3">
                      <div>
                        <p className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Star className={`w-3 h-3 ${existingRevision?.examImportant ? 'text-amber-400 fill-amber-400/20' : ''}`} />
                          Exam Mode Focus
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Prioritise during exam season</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!!existingRevision?.examImportant} 
                          onChange={(e) => {
                            SoundManager.vibrate('light');
                            SoundManager.play('click');
                            onToggleExamImportant(topic.id, e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-[#141A1F] peer-checked:after:border-amber-400"></div>
                      </label>
                    </div>
                  )}

                  {/* Reset Topic Option */}
                  {onResetTopic && (
                    <div className="flex items-center justify-between border-t border-gray-800/60 pt-3">
                      <div>
                        <p className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1 text-red-400/90">
                          <RotateCcw className="w-3 h-3 text-red-400" />
                          Reset Topic
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Reset topic progress and revoke earned XP</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Reset "${topic.name}"? Progress and XP will be reverted.`)) {
                            onResetTopic(topic.id);
                            onClose();
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] font-mono font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : isRevisionDue ? (
              <button
                onClick={() => {
                  SoundManager.play('click');
                  setShowRecallPrompt(true);
                }}
                className="w-full py-4 sm:py-5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-black tracking-widest uppercase rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                style={{ minHeight: '48px' }}
                id="btn-complete-revision"
              >
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span>✓ COMPLETE REVISION (+{diffConfig.xpReward} XP)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowCompletionCelebration(true);
                  SoundManager.play('level_up');
                  SoundManager.vibrate('success');
                }}
                className="w-full py-4 sm:py-5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-[#0C0F12] text-sm font-black tracking-widest uppercase rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ minHeight: '48px' }}
                id="btn-mark-completed"
              >
                <Trophy className="w-5 h-5" />
                <span>✓ MARK COMPLETED (+{diffConfig.xpReward} XP)</span>
              </button>
            )}
            
            {!isCompleted && !showDifficultyPrompt && !showRecallPrompt && onStartFocusTimer && (
              <button
                type="button"
                onClick={() => onStartFocusTimer(topic.name)}
                className="w-full py-4 px-6 bg-[#0C0F12] border border-blue-500/30 hover:border-blue-500/60 text-blue-400 hover:text-white text-xs sm:text-sm font-black tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                style={{ minHeight: '48px' }}
                id="btn-start-focus-timer"
              >
                <Clock className="w-5 h-5 text-blue-400" />
                <span>⏱️ START FOCUS TIMER FOR THIS TOPIC</span>
              </button>
            )}

            {/* Learning History / Timeline Visual Element */}
            {isCompleted && timelineItems.length > 0 && (
              <div className="bg-[#0C0F12]/60 border border-gray-800/80 rounded-2xl p-4.5 space-y-4 shadow-sm animate-fade-in">
                <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Learning Timeline
                </p>
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gray-800">
                  {timelineItems.map((item, idx) => (
                    <div key={idx} className="relative flex items-center justify-between text-xs">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[22px] w-3 h-3 rounded-full border-2 ${
                        item.checked 
                          ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' 
                          : 'bg-[#141A1F] border-gray-600'
                      }`} />
                      <span className="font-semibold text-gray-300">{item.label}</span>
                      <span className="font-mono text-[9px] text-gray-500">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] text-gray-500 uppercase font-bold tracking-widest">
              {isRevisionDue ? `+${diffConfig.xpReward} XP • Streak Maintained • Revision Complete` : isCompleted ? 'Topic completed! Check your Stats tab for progress details.' : `+${diffConfig.xpReward} XP • Streak Incremented • Schedules Revision`}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
