import React from 'react';
import { Topic, Subject, UserState } from '../types';
import { X, Clock, ShieldCheck, Trophy, RefreshCw } from 'lucide-react';
import { getSubjectDifficulty, getTopicEstimatedTime, getDifficultyConfig } from '../utils/xpUtils';

interface TopicViewModalProps {
  topic: Topic | null;
  subject: Subject | null;
  userState: UserState;
  isCompleted: boolean;
  isRevisionDue?: boolean;
  onClose: () => void;
  onMarkCompleted: (topicId: string) => void;
  onStartFocusTimer?: (topicName: string) => void;
}

export default function TopicViewModal({
  topic,
  subject,
  userState,
  isCompleted,
  isRevisionDue = false,
  onClose,
  onMarkCompleted,
  onStartFocusTimer,
}: TopicViewModalProps) {
  if (!topic || !subject) return null;

  const diff = getSubjectDifficulty(userState.subjectDifficulties, subject.id);
  const estMinutes = getTopicEstimatedTime(userState.subjectDifficulties, subject.id, topic.estimatedTime);
  const diffConfig = getDifficultyConfig(userState.subjectDifficulties, subject.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C0F12]/95 select-none font-sans">
      <div className="relative w-full max-w-lg bg-[#141A1F] border border-gray-800 rounded-3xl shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-none">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white rounded-full transition-all cursor-pointer z-20 shadow-lg"
          style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              Once done, hit the reward button below to log your quest progression!
            </p>
          </div>

          {/* Giant Mark Completed Button */}
          <div className="space-y-3">
            {isCompleted && !isRevisionDue ? (
              <div className="w-full py-4 sm:py-5 px-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-black tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2 select-none">
                <Trophy className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                <span>✓ TOPIC COMPLETED</span>
              </div>
            ) : isRevisionDue ? (
              <button
                onClick={() => onMarkCompleted(topic.id)}
                className="w-full py-4 sm:py-5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-black tracking-widest uppercase rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                style={{ minHeight: '48px' }}
              >
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span>✓ COMPLETE REVISION (+{diffConfig.xpReward} XP)</span>
              </button>
            ) : (
              <button
                onClick={() => onMarkCompleted(topic.id)}
                className="w-full py-4 sm:py-5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-[#0C0F12] text-sm font-black tracking-widest uppercase rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ minHeight: '48px' }}
              >
                <Trophy className="w-5 h-5" />
                <span>✓ MARK COMPLETED (+{diffConfig.xpReward} XP)</span>
              </button>
            )}
            
            {!isCompleted && onStartFocusTimer && (
              <button
                type="button"
                onClick={() => onStartFocusTimer(topic.name)}
                className="w-full py-4 px-6 bg-[#0C0F12] border border-blue-500/30 hover:border-blue-500/60 text-blue-400 hover:text-white text-xs sm:text-sm font-black tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                style={{ minHeight: '48px' }}
              >
                <Clock className="w-5 h-5 text-blue-400" />
                <span>⏱️ START FOCUS TIMER FOR THIS TOPIC</span>
              </button>
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
