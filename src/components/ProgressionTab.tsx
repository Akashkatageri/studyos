import React, { useState } from 'react';
import { UserState, Subject, Module } from '../types';
import { ChevronDown, ChevronUp, BookOpen, AlertCircle, Award } from 'lucide-react';
import { getSubjectTheme } from '../utils/subjectThemes';
import { COURSE_TEMPLATES, COMMON_S1, COMMON_S2 } from '../courses';
import { getSubjectDifficulty, getTopicEstimatedTime } from '../utils/xpUtils';
import ModuleResourcesSection from './ModuleResourcesSection';

const getSubjectVisualData = (name: string) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('programming') || lowercaseName.includes(' c ') || lowercaseName.includes('python') || lowercaseName.includes('java')) {
    return { symbol: 'C', bg: 'bg-[#5B36F4]/15 border-[#5B36F4]/20 text-[#7C5CFF]', iconColor: 'text-[#7C5CFF]' };
  }
  if (lowercaseName.includes('physics') || lowercaseName.includes('wave')) {
    return { symbol: '⚛', bg: 'bg-[#00D4FF]/15 border-[#00D4FF]/20 text-[#00D4FF]', iconColor: 'text-[#00D4FF]' };
  }
  if (lowercaseName.includes('calculus') || lowercaseName.includes('mathematics') || lowercaseName.includes('math') || lowercaseName.includes('algebra')) {
    return { symbol: '∫', bg: 'bg-[#A78BFA]/15 border-[#A78BFA]/20 text-[#A78BFA]', iconColor: 'text-[#A78BFA]' };
  }
  if (lowercaseName.includes('electrical') || lowercaseName.includes('electronics')) {
    return { symbol: '⚡', bg: 'bg-[#FFB547]/15 border-[#FFB547]/20 text-[#FFB547]', iconColor: 'text-[#FFB547]' };
  }
  if (lowercaseName.includes('environmental') || lowercaseName.includes('ecology') || lowercaseName.includes('chemistry')) {
    return { symbol: '🌿', bg: 'bg-[#2BD97F]/15 border-[#2BD97F]/20 text-[#2BD97F]', iconColor: 'text-[#2BD97F]' };
  }
  return { symbol: '📚', bg: 'bg-blue-500/15 border-blue-500/20 text-blue-400', iconColor: 'text-blue-400' };
};

interface ProgressionTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
  onStartTopic: (topicId: string) => void;
  onTriggerSemesterTransition?: () => void;
  onChangeSubjectDifficulty?: (subjectId: string, difficulty: 'Easy' | 'Medium' | 'Hard') => void;
}

export default function ProgressionTab({
  userState,
  activeSubjects,
  backlogSubjects,
  onStartTopic,
  onTriggerSemesterTransition,
  onChangeSubjectDifficulty,
}: ProgressionTabProps) {
  const { completedTopics, revisions } = userState;

  // Track expanded subjects & modules
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [activeModuleTabs, setActiveModuleTabs] = useState<{[moduleId: string]: 'topics' | 'resources'}>({});

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Helper to calculate module completion stats
  const getModuleStats = (module: Module) => {
    const total = module.topics.length;
    const completed = module.topics.filter((t) => completedTopics.includes(t.id)).length;
    const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;
    return { total, completed, percent };
  };

  // Helper to calculate subject completion stats
  const getSubjectStats = (subject: Subject) => {
    let total = 0;
    let completed = 0;
    for (const mod of subject.modules) {
      total += mod.topics.length;
      completed += mod.topics.filter((t) => completedTopics.includes(t.id)).length;
    }
    const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;
    return { total, completed, percent };
  };

  // Separate active backlog subjects (the ones not fully completed yet)
  const activeBacklogs = backlogSubjects.filter((subj) => {
    const { total, completed } = getSubjectStats(subj);
    return total > 0 && completed < total;
  });

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* 1. BACKLOG SUBJECTS SECTION (Displayed ABOVE current semester) */}
      {activeBacklogs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-bold font-display tracking-wide uppercase">⚠ Prior Semester Backlogs</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {activeBacklogs.map((subj) => {
              const isExpanded = expandedSubjects.includes(subj.id);
              const stats = getSubjectStats(subj);

              const visual = getSubjectVisualData(subj.name);
              const diff = getSubjectDifficulty(userState.subjectDifficulties, subj.id);
              const completedModulesCount = subj.modules.filter(m => {
                const { percent } = getModuleStats(m);
                return percent === 100;
              }).length;

              return (
                <div
                  key={subj.id}
                  className="border border-white/5 bg-[#111114] rounded-[28px] overflow-hidden transition-all duration-300 shadow-md"
                >
                  {/* Subject Expandable Card Header */}
                  <div
                    onClick={() => toggleSubject(subj.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 flex-1 pr-2">
                      {/* Square colored avatar indicator */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base select-none shrink-0 border ${visual.bg}`}>
                        <span>{visual.symbol}</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white tracking-tight leading-tight truncate">
                            {subj.name}
                          </h4>
                          {onChangeSubjectDifficulty ? (
                            <select
                              value={diff}
                              onChange={(e) => {
                                e.stopPropagation();
                                onChangeSubjectDifficulty(subj.id, e.target.value as 'Easy' | 'Medium' | 'Hard');
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-all shrink-0 ${
                                diff === 'Easy'
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                  : diff === 'Hard'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                              }`}
                            >
                              <option value="Easy" className="bg-[#111114] text-green-400">Easy</option>
                              <option value="Medium" className="bg-[#111114] text-blue-400">Medium</option>
                              <option value="Hard" className="bg-[#111114] text-red-400">Hard</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shrink-0 ${
                                diff === 'Easy'
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : diff === 'Hard'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}
                            >
                              {diff}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-gray-500">
                            {completedModulesCount}/{subj.modules.length} Modules Completed
                          </span>
                          <span className="text-gray-400 font-mono">{stats.percent}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-[#7C5CFF]"
                            style={{ width: `${stats.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pl-1 text-gray-500">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Subject Expanded Modules list */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 bg-[#0C0F12]/60 p-4 md:p-6 pl-8 md:pl-12 relative space-y-6">
                      {/* Beautiful continuous vertical module connecting line */}
                      <div className="absolute left-[16px] md:left-[24px] top-8 bottom-12 w-[3px] bg-gradient-to-b from-amber-500/50 via-gray-800 to-gray-800/20 rounded-full pointer-events-none" />

                      {subj.modules.map((mod) => {
                        const isModExpanded = expandedModules.includes(mod.id);
                        const modStats = getModuleStats(mod);

                        return (
                          <div
                            key={mod.id}
                            className="relative"
                          >
                            {/* Module Status Node on Timeline */}
                            <div className="absolute left-[-27px] md:left-[-35px] top-5 z-10 bg-[#0C0F12] rounded-full p-1">
                              {modStats.percent === 100 ? (
                                <div className="w-5 h-5 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
                                  <span className="text-[9px] text-amber-400 font-bold">✓</span>
                                </div>
                              ) : modStats.percent > 0 ? (
                                <div className="w-5 h-5 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                                </div>
                              )}
                            </div>

                            {/* Module card */}
                            <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                              <div
                                onClick={() => toggleModule(mod.id)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/20 transition-colors"
                              >
                                <div className="flex-1 pr-4 space-y-1.5">
                                  <h5 className="text-sm font-extrabold text-gray-200 tracking-tight leading-snug">{mod.name}</h5>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-950 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${modStats.percent}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400">{modStats.percent}% Complete</span>
                                  </div>

                                  {/* Module Reward Preview */}
                                  {modStats.percent < 100 && (
                                    <div className="mt-1.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] w-full max-w-sm">
                                      <span className="text-gray-400">Completion Reward:</span>
                                      <div className="flex items-center gap-1 font-bold text-amber-400 font-display">
                                        <span>🏆 Module Master</span>
                                        <span>•</span>
                                        <span>+250 XP</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="p-1 rounded bg-[#0C0F12]/80 border border-gray-800/60 shrink-0">
                                  {isModExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                              </div>

                              {isModExpanded && (
                                <div className="bg-[#0C0F12]/40 border-t border-gray-800/40 p-4 relative space-y-4">
                                  {/* Mini Tabs Bar */}
                                  <div className="flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
                                    <button
                                      onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'topics' }))}
                                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                                        (activeModuleTabs[mod.id] || 'topics') === 'topics'
                                          ? 'bg-[#141A1F] text-blue-400 border border-blue-500/20'
                                          : 'text-gray-400 hover:text-white border border-transparent'
                                      }`}
                                    >
                                      📚 Topics List
                                    </button>
                                    <button
                                      onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'resources' }))}
                                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeModuleTabs[mod.id] === 'resources'
                                          ? 'bg-[#141A1F] text-amber-400 border border-amber-500/20'
                                          : 'text-gray-400 hover:text-white border border-transparent'
                                      }`}
                                    >
                                      🔗 Module Resources
                                    </button>
                                  </div>

                                  {(activeModuleTabs[mod.id] || 'topics') === 'topics' ? (
                                    <div className="space-y-3 relative pl-2">
                                      {/* Connected line inside topics list */}
                                      <div className="absolute left-[25px] top-4 bottom-8 w-[2px] bg-gradient-to-b from-blue-500/20 via-gray-800 to-gray-800/10 rounded-full pointer-events-none" />

                                      {mod.topics.map((top) => {
                                        const isCompleted = completedTopics.includes(top.id);
                                        const isRevisionDue = revisions.some((r) => r.topicId === top.id && !r.completed);
                                        const inProgressList = userState.inProgressTopics || [];
                                        const isInProgress = inProgressList.includes(top.id);

                                        let topicState: 'completed' | 'revision' | 'in_progress' | 'not_started' = 'not_started';
                                        if (isCompleted) {
                                          topicState = 'completed';
                                        } else if (isRevisionDue) {
                                          topicState = 'revision';
                                        } else if (isInProgress) {
                                          topicState = 'in_progress';
                                        }

                                        return (
                                          <button
                                            key={top.id}
                                            onClick={() => onStartTopic(top.id)}
                                            className={`w-full text-left p-3.5 rounded-xl border flex flex-col sm:flex-row gap-3.5 sm:gap-4 sm:items-center sm:justify-between cursor-pointer group transition-all relative z-10 ${
                                              topicState === 'completed' 
                                                ? 'bg-[#141A1F]/30 border-gray-800/30 hover:border-gray-800 hover:bg-[#141A1F]/50'
                                                : topicState === 'revision'
                                                  ? 'bg-blue-950/10 border-blue-900/30 hover:border-blue-500/40'
                                                  : topicState === 'in_progress'
                                                    ? 'bg-amber-950/10 border-amber-900/30 hover:border-amber-500/40'
                                                    : 'bg-[#141A1F]/20 border-gray-850/20 hover:border-gray-850/40 hover:bg-[#141A1F]/40'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3.5 w-full">
                                              {/* Status indicators */}
                                              <div className="shrink-0 relative">
                                                {topicState === 'completed' && (
                                                  <div className="w-6 h-6 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                                                    <span className="text-[10px] text-green-400 font-bold">✓</span>
                                                  </div>
                                                )}
                                                {topicState === 'revision' && (
                                                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                                                    <span className="text-[10px] text-blue-400 font-bold">↻</span>
                                                  </div>
                                                )}
                                                {topicState === 'in_progress' && (
                                                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                  </div>
                                                )}
                                                {topicState === 'not_started' && (
                                                  <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center group-hover:border-blue-400 transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-blue-400 transition-colors" />
                                                  </div>
                                                )}
                                              </div>

                                              <div className="space-y-0.5 min-w-0">
                                                <p className={`text-sm font-bold tracking-tight transition-colors truncate-2-lines ${topicState === 'completed' ? 'text-gray-500 line-through font-normal' : 'text-gray-300 group-hover:text-white'}`}>
                                                  {top.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono font-semibold">
                                                  <span>{getTopicEstimatedTime(userState.subjectDifficulties, subj.id, top.estimatedTime)} mins</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Topic State badge display */}
                                            {topicState === 'completed' && (
                                              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-green-500/10 border-green-500/25 text-green-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                🟢 Completed
                                              </span>
                                            )}
                                            {topicState === 'revision' && (
                                              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-blue-500/10 border-blue-500/25 text-blue-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                🔵 Revision Due
                                              </span>
                                            )}
                                            {topicState === 'in_progress' && (
                                              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                🟡 In Progress
                                              </span>
                                            )}
                                            {topicState === 'not_started' && (
                                              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-transparent border-gray-800 text-gray-500 group-hover:text-gray-300 group-hover:border-gray-700 text-center w-full sm:w-auto shrink-0 select-none">
                                                ⚪ Not Started
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <ModuleResourcesSection moduleId={mod.id} userState={userState} />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CURRENT SEMESTER SUBJECTS TREE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#141A1F]/30 border border-gray-800/40 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-400">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-lg font-bold font-display tracking-wide uppercase">Semester {userState.semester} Progression Path</h3>
          </div>
          {onTriggerSemesterTransition && userState.semester < 8 && (
            <button
              onClick={onTriggerSemesterTransition}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-115 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer select-none flex items-center justify-center gap-2 border border-white/5 active:scale-95"
            >
              <span>🎓 MOVE TO NEXT SEMESTER</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {activeSubjects.map((subj) => {
            const isExpanded = expandedSubjects.includes(subj.id);
            const stats = getSubjectStats(subj);
            const isCompletedGold = stats.percent === 100;
            const theme = getSubjectTheme(subj.id, subj.name);

            const visual = getSubjectVisualData(subj.name);
            const completedModulesCount = subj.modules.filter(m => {
              const { percent } = getModuleStats(m);
              return percent === 100;
            }).length;
            const diff = getSubjectDifficulty(userState.subjectDifficulties, subj.id);

            return (
              <div
                key={subj.id}
                className="border border-white/5 bg-[#111114] rounded-[28px] overflow-hidden transition-all duration-300 shadow-md"
              >
                {/* Subject Header */}
                <div
                  onClick={() => toggleSubject(subj.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3.5 flex-1 pr-2">
                    {/* Square colored avatar indicator */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base select-none shrink-0 border ${visual.bg}`}>
                      <span>{visual.symbol}</span>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-extrabold text-white tracking-tight leading-tight truncate">
                          {subj.name}
                        </h4>
                        {onChangeSubjectDifficulty ? (
                          <select
                            value={diff}
                            onChange={(e) => {
                              e.stopPropagation();
                              onChangeSubjectDifficulty(subj.id, e.target.value as 'Easy' | 'Medium' | 'Hard');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-all shrink-0 ${
                              diff === 'Easy'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                : diff === 'Hard'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                            }`}
                          >
                            <option value="Easy" className="bg-[#111114] text-green-400">Easy</option>
                            <option value="Medium" className="bg-[#111114] text-blue-400">Medium</option>
                            <option value="Hard" className="bg-[#111114] text-red-400">Hard</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shrink-0 ${
                              diff === 'Easy'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : diff === 'Hard'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {diff}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-gray-500">
                          {completedModulesCount}/{subj.modules.length} Modules Completed
                        </span>
                        <span className="text-gray-400 font-mono">{stats.percent}%</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-[#7C5CFF]"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pl-1 text-gray-500">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Modules list */}
                {isExpanded && (
                  <div className="border-t border-gray-850 bg-black/10 p-4 md:p-6 pl-8 md:pl-12 relative space-y-6">
                    {/* Beautiful continuous vertical module connecting line */}
                    <div 
                      className={`absolute left-[16px] md:left-[24px] top-8 bottom-12 w-[3px] rounded-full pointer-events-none ${
                        isCompletedGold ? 'bg-gradient-to-b from-amber-500/40 via-amber-700/30 to-transparent' : ''
                      }`}
                      style={isCompletedGold ? {} : { backgroundImage: `linear-gradient(to bottom, ${theme.primary}99, rgba(108, 99, 255, 0.1))` }}
                    />

                    {subj.modules.map((mod) => {
                      const isModExpanded = expandedModules.includes(mod.id);
                      const modStats = getModuleStats(mod);

                      return (
                        <div
                          key={mod.id}
                          className="relative"
                        >
                          {/* Module Status Node on Timeline */}
                          <div className="absolute left-[-27px] md:left-[-35px] top-5 z-10 bg-[#0B091B] rounded-full p-1">
                            {modStats.percent === 100 ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                <span className="text-[9px] text-amber-400 font-bold">✓</span>
                              </div>
                            ) : modStats.percent > 0 ? (
                              <div 
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center animate-pulse"
                                style={{ borderColor: theme.primary, backgroundColor: `${theme.primary}20` }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-900 border-2 border-gray-850 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                              </div>
                            )}
                          </div>

                          {/* Module card */}
                          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
                            modStats.percent === 100
                              ? 'bg-[#181512] border-amber-500/20'
                              : 'bg-[#141A1F] border-gray-800/80'
                          }`}>
                            <div
                              onClick={() => toggleModule(mod.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/20 transition-colors"
                            >
                              <div className="flex-1 pr-4 space-y-1.5">
                                <h5 className={`text-sm font-extrabold tracking-tight leading-snug ${
                                  modStats.percent === 100 ? 'text-amber-300' : 'text-gray-200'
                                }`}>{mod.name}</h5>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-[#0C0F12] rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        modStats.percent === 100 ? 'bg-amber-500' : 'bg-blue-500'
                                      }`}
                                      style={{ width: `${modStats.percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-gray-400">{modStats.percent}% Complete</span>
                                </div>

                                {/* Module Reward Preview */}
                                {modStats.percent < 100 && (
                                  <div className="mt-1.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] w-full max-w-sm">
                                    <span className="text-gray-400">Completion Reward:</span>
                                    <div className="flex items-center gap-1 font-bold text-amber-400 font-display">
                                      <span>🏆 Module Master</span>
                                      <span>•</span>
                                      <span>+250 XP</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="p-1 rounded bg-[#0C0F12]/80 border border-gray-800/60 shrink-0">
                                {isModExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                            </div>

                            {isModExpanded && (
                              <div className="bg-[#0C0F12]/40 border-t border-gray-800/40 p-4 relative space-y-4">
                                {/* Mini Tabs Bar */}
                                <div className="flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
                                  <button
                                    onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'topics' }))}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                                      (activeModuleTabs[mod.id] || 'topics') === 'topics'
                                        ? 'bg-[#141A1F] text-blue-400 border border-blue-500/20'
                                        : 'text-gray-400 hover:text-white border border-transparent'
                                    }`}
                                  >
                                    📚 Topics List
                                  </button>
                                  <button
                                    onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'resources' }))}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
                                      activeModuleTabs[mod.id] === 'resources'
                                        ? 'bg-[#141A1F] text-amber-400 border border-amber-500/20'
                                        : 'text-gray-400 hover:text-white border border-transparent'
                                    }`}
                                  >
                                    🔗 Module Resources
                                  </button>
                                </div>

                                {(activeModuleTabs[mod.id] || 'topics') === 'topics' ? (
                                  <div className="space-y-3 relative pl-2">
                                    {/* Connected line inside topics list */}
                                    <div className="absolute left-[25px] top-4 bottom-8 w-[2px] bg-gradient-to-b from-blue-500/20 via-gray-800 to-gray-800/10 rounded-full pointer-events-none" />

                                    {mod.topics.map((top) => {
                                      const isCompleted = completedTopics.includes(top.id);
                                      const isRevisionDue = revisions.some((r) => r.topicId === top.id && !r.completed);
                                      const inProgressList = userState.inProgressTopics || [];
                                      const isInProgress = inProgressList.includes(top.id);

                                      let topicState: 'completed' | 'revision' | 'in_progress' | 'not_started' = 'not_started';
                                      if (isCompleted) {
                                        topicState = 'completed';
                                      } else if (isRevisionDue) {
                                        topicState = 'revision';
                                      } else if (isInProgress) {
                                        topicState = 'in_progress';
                                      }

                                      return (
                                        <button
                                          key={top.id}
                                          onClick={() => onStartTopic(top.id)}
                                          className={`w-full text-left p-3.5 rounded-xl border flex flex-col sm:flex-row gap-3.5 sm:gap-4 sm:items-center sm:justify-between cursor-pointer group transition-all relative z-10 ${
                                            topicState === 'completed' 
                                              ? 'bg-[#141A1F]/30 border-gray-800/30 hover:border-gray-800 hover:bg-[#141A1F]/50'
                                              : topicState === 'revision'
                                                ? 'bg-blue-950/10 border-blue-900/30 hover:border-blue-500/40'
                                                : topicState === 'in_progress'
                                                  ? 'bg-amber-950/10 border-amber-900/30 hover:border-amber-500/40'
                                                  : 'bg-[#141A1F]/20 border-gray-850/20 hover:border-gray-850/40 hover:bg-[#141A1F]/40'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3.5 w-full">
                                            {/* Status indicators */}
                                            <div className="shrink-0 relative">
                                              {topicState === 'completed' && (
                                                <div className="w-6 h-6 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                                                  <span className="text-[10px] text-green-400 font-bold">✓</span>
                                                </div>
                                              )}
                                              {topicState === 'revision' && (
                                                <div className="w-6 h-6 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                                                  <span className="text-[10px] text-blue-400 font-bold">↻</span>
                                                </div>
                                              )}
                                              {topicState === 'in_progress' && (
                                                <div className="w-6 h-6 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse">
                                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                </div>
                                              )}
                                              {topicState === 'not_started' && (
                                                <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center group-hover:border-blue-400 transition-colors">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-blue-400 transition-colors" />
                                                </div>
                                              )}
                                            </div>

                                            <div className="space-y-0.5 min-w-0">
                                              <p className={`text-sm font-bold tracking-tight transition-colors truncate-2-lines ${topicState === 'completed' ? 'text-gray-500 line-through font-normal' : 'text-gray-300 group-hover:text-white'}`}>
                                                {top.name}
                                              </p>
                                              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono font-semibold">
                                                <span>{getTopicEstimatedTime(userState.subjectDifficulties, subj.id, top.estimatedTime)} mins</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Topic State badge display */}
                                          {topicState === 'completed' && (
                                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-green-500/10 border-green-500/25 text-green-400 text-center w-full sm:w-auto shrink-0 select-none">
                                              🟢 Completed
                                            </span>
                                          )}
                                          {topicState === 'revision' && (
                                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-blue-500/10 border-blue-500/25 text-blue-400 text-center w-full sm:w-auto shrink-0 select-none">
                                              🔵 Revision Due
                                            </span>
                                          )}
                                          {topicState === 'in_progress' && (
                                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-400 text-center w-full sm:w-auto shrink-0 select-none">
                                              🟡 In Progress
                                            </span>
                                          )}
                                          {topicState === 'not_started' && (
                                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-transparent border-gray-800 text-gray-500 group-hover:text-gray-300 group-hover:border-gray-700 text-center w-full sm:w-auto shrink-0 select-none">
                                              ⚪ Not Started
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <ModuleResourcesSection moduleId={mod.id} userState={userState} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ARCHIVED & OPTIONAL LEARNING */}
      {(() => {
        const archivedOptionalSubjects: { semester: number; subjects: Subject[] }[] = [];
        const uData = COURSE_TEMPLATES[userState.university || 'VTU'] || COURSE_TEMPLATES['VTU'];
        const bData = uData[userState.branch || 'CSE'] || uData['CSE'];
        const sData = bData[userState.scheme || '2022 Scheme'] || bData['2022 Scheme'];

        for (let semNum = 1; semNum < userState.semester; semNum++) {
          let priorSubjects: Subject[] = [];
          if (semNum === 1) {
            priorSubjects = COMMON_S1;
          } else if (semNum === 2) {
            priorSubjects = COMMON_S2;
          } else if (sData[semNum]) {
            priorSubjects = sData[semNum];
          }

          const nonBacklogPriorSubjects = priorSubjects.filter(
            sub => !userState.backlogSubjects.includes(sub.id)
          );

          if (nonBacklogPriorSubjects.length > 0) {
            archivedOptionalSubjects.push({
              semester: semNum,
              subjects: nonBacklogPriorSubjects,
            });
          }
        }

        if (archivedOptionalSubjects.length === 0) return null;

        return (
          <div className="space-y-4 pt-8 border-t border-gray-800/60">
            <div className="flex items-center gap-2 text-purple-400">
              <Award className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold font-display tracking-wide uppercase">📂 Archived → Optional Learning & Revisions</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              These subjects from your completed semesters are archived. You can study them at your own pace for revision.
            </p>

            <div className="space-y-6">
              {archivedOptionalSubjects.map((arch) => (
                <div key={arch.semester} className="space-y-3">
                  <p className="text-[10px] font-black font-mono text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/25 px-3 py-1 rounded-full inline-block">
                    Semester {arch.semester} Archive
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    {arch.subjects.map((subj) => {
                      const isExpanded = expandedSubjects.includes(subj.id);
                      const stats = getSubjectStats(subj);
                      const isCompletedGold = stats.percent === 100;
                      const diff = getSubjectDifficulty(userState.subjectDifficulties, subj.id);

                      return (
                        <div
                          key={subj.id}
                          className={`border rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                            isCompletedGold
                              ? 'bg-gradient-to-b from-amber-950/15 to-[#141A1F] border-amber-500/35 hover:border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                              : `bg-[#141A1F]/40 border-gray-800/80 hover:border-gray-700`
                          }`}
                        >
                          {/* Subject Header */}
                          <div
                            onClick={() => toggleSubject(subj.id)}
                            className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="space-y-2 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-mono">
                                  {stats.completed}/{stats.total} Topics Completed
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className={`text-lg font-extrabold tracking-tight leading-snug ${
                                  isCompletedGold ? 'text-amber-400' : 'text-white'
                                }`}>
                                  {subj.name}
                                </h4>
                                {onChangeSubjectDifficulty ? (
                                  <select
                                    value={diff}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      onChangeSubjectDifficulty(subj.id, e.target.value as 'Easy' | 'Medium' | 'Hard');
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-all shrink-0 ${
                                      diff === 'Easy'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                        : diff === 'Hard'
                                          ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                    }`}
                                  >
                                    <option value="Easy" className="bg-[#111114] text-green-400">Easy</option>
                                    <option value="Medium" className="bg-[#111114] text-blue-400">Medium</option>
                                    <option value="Hard" className="bg-[#111114] text-red-400">Hard</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shrink-0 ${
                                      diff === 'Easy'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : diff === 'Hard'
                                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}
                                  >
                                    {diff}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Modules list when expanded */}
                          {isExpanded && (
                            <div className="border-t border-gray-800/40 p-6 space-y-4">
                              {subj.modules.map((mod) => {
                                const isModExpanded = expandedModules.includes(mod.id);
                                const modStats = getModuleStats(mod);

                                return (
                                  <div
                                    key={mod.id}
                                    className="border border-gray-850 bg-gray-950/40 rounded-xl overflow-hidden"
                                  >
                                    <div
                                      onClick={() => toggleModule(mod.id)}
                                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.01]"
                                    >
                                      <div className="space-y-1">
                                        <p className="text-xs text-gray-500 font-mono font-bold uppercase tracking-wider">
                                          Module Progress: {modStats.percent}%
                                        </p>
                                        <h5 className="text-sm font-bold text-white leading-tight">
                                          {mod.name}
                                        </h5>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 font-mono">
                                          {modStats.completed}/{modStats.total} Topics
                                        </span>
                                        {isModExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-gray-500" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-gray-500" />
                                        )}
                                      </div>
                                    </div>

                                    {isModExpanded && (
                                      <div className="bg-[#0C0F12]/40 border-t border-gray-800/40 p-4 relative space-y-4">
                                        {/* Mini Tabs Bar */}
                                        <div className="flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
                                          <button
                                            onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'topics' }))}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                                              (activeModuleTabs[mod.id] || 'topics') === 'topics'
                                                ? 'bg-[#141A1F] text-blue-400 border border-blue-500/20'
                                                : 'text-gray-400 hover:text-white border border-transparent'
                                            }`}
                                          >
                                            📚 Topics List
                                          </button>
                                          <button
                                            onClick={() => setActiveModuleTabs(prev => ({ ...prev, [mod.id]: 'resources' }))}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
                                              activeModuleTabs[mod.id] === 'resources'
                                                ? 'bg-[#141A1F] text-amber-400 border border-amber-500/20'
                                                : 'text-gray-400 hover:text-white border border-transparent'
                                            }`}
                                          >
                                            🔗 Module Resources
                                          </button>
                                        </div>

                                        {(activeModuleTabs[mod.id] || 'topics') === 'topics' ? (
                                          <div className="space-y-3 relative pl-2">
                                            {/* Connected line inside topics list */}
                                            <div className="absolute left-[25px] top-4 bottom-8 w-[2px] bg-gradient-to-b from-blue-500/20 via-gray-800 to-gray-800/10 rounded-full pointer-events-none" />

                                            {mod.topics.map((top) => {
                                              const isCompleted = completedTopics.includes(top.id);
                                              const isRevisionDue = revisions.some((r) => r.topicId === top.id && !r.completed);
                                              const inProgressList = userState.inProgressTopics || [];
                                              const isInProgress = inProgressList.includes(top.id);

                                              let topicState: 'completed' | 'revision' | 'in_progress' | 'not_started' = 'not_started';
                                              if (isCompleted) {
                                                topicState = 'completed';
                                              } else if (isRevisionDue) {
                                                topicState = 'revision';
                                              } else if (isInProgress) {
                                                topicState = 'in_progress';
                                              }

                                              return (
                                                <button
                                                  key={top.id}
                                                  onClick={() => onStartTopic(top.id)}
                                                  className={`w-full text-left p-3.5 rounded-xl border flex flex-col sm:flex-row gap-3.5 sm:gap-4 sm:items-center sm:justify-between cursor-pointer group transition-all relative z-10 ${
                                                    topicState === 'completed' 
                                                      ? 'bg-[#141A1F]/30 border-gray-800/30 hover:border-gray-800 hover:bg-[#141A1F]/50'
                                                      : topicState === 'revision'
                                                        ? 'bg-blue-950/10 border-blue-900/30 hover:border-blue-500/40'
                                                        : topicState === 'in_progress'
                                                          ? 'bg-amber-950/10 border-amber-900/30 hover:border-amber-500/40'
                                                          : 'bg-[#141A1F]/20 border-gray-850/20 hover:border-gray-850/40 hover:bg-[#141A1F]/40'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-3.5 w-full">
                                                    <div className="shrink-0 relative">
                                                      {topicState === 'completed' && (
                                                        <div className="w-6 h-6 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                                                          <span className="text-[10px] text-green-400 font-bold">✓</span>
                                                        </div>
                                                      )}
                                                      {topicState === 'revision' && (
                                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                                                          <span className="text-[10px] text-blue-400 font-bold">↻</span>
                                                        </div>
                                                      )}
                                                      {topicState === 'in_progress' && (
                                                        <div className="w-6 h-6 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse">
                                                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                        </div>
                                                      )}
                                                      {topicState === 'not_started' && (
                                                        <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center group-hover:border-blue-400 transition-colors">
                                                          <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-blue-400 transition-colors" />
                                                        </div>
                                                      )}
                                                    </div>

                                                    <div className="space-y-0.5 min-w-0">
                                                      <p className={`text-sm font-bold tracking-tight transition-colors truncate-2-lines ${topicState === 'completed' ? 'text-gray-500 line-through font-normal' : 'text-gray-300 group-hover:text-white'}`}>
                                                        {top.name}
                                                      </p>
                                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono font-semibold">
                                                        <span>{getTopicEstimatedTime(userState.subjectDifficulties, subj.id, top.estimatedTime)} mins</span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {topicState === 'completed' && (
                                                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-green-500/10 border-green-500/25 text-green-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                      🟢 Completed
                                                    </span>
                                                  )}
                                                  {topicState === 'revision' && (
                                                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-blue-500/10 border-blue-500/25 text-blue-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                      🔵 Revision Due
                                                    </span>
                                                  )}
                                                  {topicState === 'in_progress' && (
                                                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-400 text-center w-full sm:w-auto shrink-0 select-none">
                                                      🟡 In Progress
                                                    </span>
                                                  )}
                                                  {topicState === 'not_started' && (
                                                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border bg-transparent border-gray-800 text-gray-500 group-hover:text-gray-300 group-hover:border-gray-700 text-center w-full sm:w-auto shrink-0 select-none">
                                                      ⚪ Not Started
                                                    </span>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <ModuleResourcesSection moduleId={mod.id} userState={userState} />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
