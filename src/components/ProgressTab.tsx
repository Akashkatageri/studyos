import React from 'react';
import { UserState, Subject } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { getLevelAndProgress } from '../utils/xpUtils';
import { Calendar, Award, CheckCircle2, Zap, Flame, BookOpen, Clock, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export default function ProgressTab({ userState, activeSubjects, backlogSubjects }: ProgressTabProps) {
  const { 
    xp, 
    level, 
    streak, 
    completedTopics, 
    studyActivity 
  } = userState;

  // 1. Calculate general progression metrics
  let totalSyllabusTopicsCount = 0;
  for (const sub of [...activeSubjects, ...backlogSubjects]) {
    for (const mod of sub.modules) {
      totalSyllabusTopicsCount += mod.topics.length;
    }
  }

  const completedTopicsCount = completedTopics.length;
  const semesterPercent = totalSyllabusTopicsCount > 0 
    ? Math.min(100, Math.floor((completedTopicsCount / totalSyllabusTopicsCount) * 100))
    : 0;

  // 2. Generate GitHub Style Heatmap (Last 16 Weeks / 112 days)
  const generateHeatmapDays = () => {
    const days: { dateStr: string; count: number; dayOfWeek: number; formatted: string }[] = [];
    const today = new Date();
    
    // Go back 112 days (16 weeks) to align columns correctly
    for (let i = 111; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const count = studyActivity[dateStr] || 0;
      days.push({
        dateStr,
        count,
        dayOfWeek: d.getDay(),
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return days;
  };

  const heatmapDays = generateHeatmapDays();

  // Group days into 16 weeks (columns)
  const weeks: typeof heatmapDays[] = [];
  let currentWeek: typeof heatmapDays = [];

  heatmapDays.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === heatmapDays.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Level progression calculations
  const { xpInCurrentLevel, xpNeededForNextLevel, xpPercent } = getLevelAndProgress(xp);

  // Dynamic real achievements list based on actual user progression
  const achievements: Achievement[] = [
    {
      id: 'first-topic',
      title: 'First Milestone',
      description: 'Complete your first study topic',
      icon: '🎯',
      unlocked: completedTopicsCount >= 1,
    },
    {
      id: 'module-master',
      title: 'Module Explorer',
      description: 'Master any full module (100%)',
      icon: '🏆',
      unlocked: userState.completedModules.length >= 1,
    },
    {
      id: 'level-up',
      title: 'Level 2 Apprentice',
      description: 'Reach Level 2 in your learning journey',
      icon: '⚡',
      unlocked: level >= 2,
    },
    {
      id: 'streak-3',
      title: 'Consistency Star',
      description: 'Maintain a 3-day study streak',
      icon: '🔥',
      unlocked: streak >= 3,
    },
    {
      id: 'maestro',
      title: 'Academic Maestro',
      description: 'Complete 10 topics this semester',
      icon: '👑',
      unlocked: completedTopicsCount >= 10,
    },
    {
      id: 'semester-completion',
      title: 'Semester Champion',
      description: 'Complete all topics in your current semester',
      icon: '🎓',
      unlocked: totalSyllabusTopicsCount > 0 && completedTopicsCount >= totalSyllabusTopicsCount,
    }
  ];

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* 1. STATS SUMMARY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Level */}
        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Level</span>
            <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black font-mono text-white">Lvl {level}</p>
              <p className="text-xs font-mono text-gray-500">({xp} XP total)</p>
            </div>
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">{xpNeededForNextLevel - xpInCurrentLevel} XP to Level {level + 1}</p>
          </div>
        </div>

        {/* Semester % */}
        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester Completion</span>
            <BookOpen className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-3xl font-black font-mono text-white">{semesterPercent}%</p>
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" 
                style={{ width: `${semesterPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">{completedTopicsCount}/{totalSyllabusTopicsCount} topics finished</p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Streak</span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black font-mono text-white">{streak} Days</p>
              <span className="text-xs font-bold text-amber-500">🔥 Active</span>
            </div>
            <div className="w-full h-1.5 bg-gray-900 rounded-full mt-2" />
            <p className="text-[10px] text-gray-500 mt-1.5">Longest: {userState.longestStreak} days</p>
          </div>
        </div>

        {/* Completed Topics */}
        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Topics</span>
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-3xl font-black font-mono text-white">{completedTopicsCount}</p>
            <div className="w-full h-1.5 bg-gray-900 rounded-full mt-2" />
            <p className="text-[10px] text-gray-500 mt-1.5">Across {activeSubjects.length} subjects</p>
          </div>
        </div>
      </div>

      {/* 2. HEATMAP (GitHub Style) */}
      <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Learning Activity Heatmap
            </h3>
            <p className="text-xs text-gray-400">Track your daily StudyOS topic completions over the last 16 weeks.</p>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <span>Less</span>
            <div className="w-3.5 h-3.5 rounded bg-[#1C242C] border border-gray-800/80" />
            <div className="w-3.5 h-3.5 rounded bg-blue-950/60 border border-blue-900/40" />
            <div className="w-3.5 h-3.5 rounded bg-blue-800/60 border border-blue-700/40" />
            <div className="w-3.5 h-3.5 rounded bg-blue-500 border border-blue-400" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-850 pb-2">
          <div className="flex gap-1.5 min-w-[560px]">
            {/* Day Labels */}
            <div className="flex flex-col justify-between text-[9px] font-mono text-gray-600 pr-2 pt-1 h-[115px]">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks Columns */}
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => {
                  let colorClass = 'bg-[#1C242C] border-gray-850';
                  if (day.count === 1) colorClass = 'bg-blue-950/60 border-blue-900/40 text-blue-400';
                  if (day.count === 2) colorClass = 'bg-blue-800/60 border-blue-700/40 text-blue-200';
                  if (day.count >= 3) colorClass = 'bg-blue-500 border-blue-400 text-white';

                  return (
                    <div
                      key={day.dateStr}
                      title={`${day.formatted}: ${day.count} topic(s) completed`}
                      className={`w-3.5 h-3.5 rounded border transition-colors cursor-pointer hover:scale-115 ${colorClass}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STUDY HABIT ANALYTICS SECTION */}
      {(() => {
        const getFocusHabitStats = () => {
          const history = userState.focusHistory || {};
          const todayStr = getLocalDateString();
          const todayMins = userState.todayFocusMinutes || 0;
          
          let weeklyMins = 0;
          const todayDate = new Date();
          for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(todayDate.getDate() - i);
            const dateStr = getLocalDateString(d);
            weeklyMins += history[dateStr] || 0;
          }
          
          let monthlyMins = 0;
          for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(todayDate.getDate() - i);
            const dateStr = getLocalDateString(d);
            monthlyMins += history[dateStr] || 0;
          }

          return {
            dailyGoal: userState.dailyFocusGoal ?? 30,
            streak: userState.academicStudyStreak ?? 0,
            longestStreak: userState.longestStudyStreak ?? 0,
            totalHours: ((userState.totalFocusMinutes || 0) / 60).toFixed(1),
            weeklyHours: (weeklyMins / 60).toFixed(1),
            monthlyHours: (monthlyMins / 60).toFixed(1),
            totalSessions: userState.totalFocusSessions ?? 0,
            longestSession: userState.longestFocusSessionMinutes ?? 0
          };
        };
        const habitStats = getFocusHabitStats();

        const getChartData = () => {
          const history = userState.focusHistory || {};
          const data = [];
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = getLocalDateString(d);
            const mins = history[dateStr] || 0;
            data.push({
              day: d.toLocaleDateString('en-US', { weekday: 'short' }),
              minutes: mins,
              goal: userState.dailyFocusGoal ?? 30
            });
          }
          return data;
        };
        const chartData = getChartData();

        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                Study Habit Analytics
              </h3>
              <p className="text-xs text-gray-400">Monitor your daily study endurance, focus consistency, and automatic shield protection status.</p>
            </div>

            {/* Habit Stats Bento Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Daily Focus Goal</span>
                <p className="text-xl font-black font-mono text-emerald-400 mt-1">{habitStats.dailyGoal}m</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Structured daily target</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Study Streak</span>
                <p className="text-xl font-black font-mono text-amber-500 mt-1">{habitStats.streak} d</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Longest streak: {habitStats.longestStreak}d</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Weekly / Monthly Focus</span>
                <p className="text-xl font-black font-mono text-blue-400 mt-1">{habitStats.weeklyHours}h <span className="text-xs text-gray-500 font-semibold">/ {habitStats.monthlyHours}h</span></p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Total hours: {habitStats.totalHours}h</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Study Sessions</span>
                <p className="text-xl font-black font-mono text-purple-400 mt-1">{habitStats.totalSessions}</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Longest block: {habitStats.longestSession}m</p>
              </div>
            </div>

            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Daily Focus Area Chart */}
              <div className="md:col-span-2 bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide font-display">Daily Focus Trend (Last 7 Days)</h4>
                  <p className="text-[10px] text-gray-500">Track focus minutes compared to daily target.</p>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" opacity={0.3} />
                      <XAxis dataKey="day" stroke="#4B5563" fontSize={9} fontClassName="font-mono" />
                      <YAxis stroke="#4B5563" fontSize={9} fontClassName="font-mono" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                        labelStyle={{ color: '#F3F4F6', fontWeight: 'bold', fontSize: '10px' }}
                        itemStyle={{ color: '#60A5FA', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="minutes" name="Focus Mins" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#focusGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Study Shield Resilience Panel */}
              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide font-display flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Study Shields Remaining
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Protect your streak! Missing a scheduled study day automatically consumes one shield instead of resetting your Focus Streak.</p>
                </div>

                <div className="flex justify-center gap-4 py-4">
                  {[0, 1, 2].map((idx) => {
                    const activeShields = userState.studyShields ?? 3;
                    const isCharged = activeShields > idx;
                    return (
                      <div key={idx} className="relative">
                        <div className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                          isCharged 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-105'
                            : 'bg-gray-950 border-gray-850 text-gray-600'
                        }`}>
                          <Shield className={`w-6 h-6 ${isCharged ? 'fill-current opacity-80' : 'opacity-40'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gray-950/60 border border-gray-850 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 font-mono">
                    {userState.studyShields ?? 3} / 3 Shields Charged
                  </p>
                  <p className="text-[9px] text-gray-500 mt-1">Shields recharge at the start of next semester.</p>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 3. ACHIEVEMENTS SECTION */}
      <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-6 shadow-md space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Academic Achievements
          </h3>
          <p className="text-xs text-gray-400">Unlock dynamic reward badges as you progress through your academic coursework.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                ach.unlocked
                  ? 'bg-[#1C242C]/40 border-amber-500/25 shadow-[0_4px_12px_rgba(245,158,11,0.03)]'
                  : 'bg-[#1C242C]/10 border-gray-850 opacity-40'
              }`}
            >
              <span className={`text-3xl shrink-0 ${ach.unlocked ? 'animate-bounce-short' : 'grayscale'}`}>
                {ach.icon}
              </span>
              <div className="space-y-0.5 min-w-0">
                <h4 className={`text-sm font-bold tracking-tight ${ach.unlocked ? 'text-amber-400' : 'text-gray-400'}`}>
                  {ach.title}
                </h4>
                <p className="text-xs text-gray-500 leading-normal truncate-2-lines">{ach.description}</p>
                {ach.unlocked ? (
                  <span className="inline-block text-[9px] bg-amber-500/10 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase mt-1">
                    ✓ Unlocked
                  </span>
                ) : (
                  <span className="inline-block text-[9px] bg-gray-900 text-gray-500 font-mono px-1.5 py-0.5 rounded uppercase mt-1">
                    Locked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
