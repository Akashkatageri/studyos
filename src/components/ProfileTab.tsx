import React, { useState } from 'react';
import { UserState, Subject } from '../types';
import { AVATARS, COURSE_TEMPLATES } from '../data';
import { getLocalDateString } from '../utils/dateUtils';
import { getLevelAndProgress } from '../utils/xpUtils';
import { Award, Shield, BookOpen, Calendar, RefreshCw, Zap, Flame, User, Swords, Palette, Clock, Settings } from 'lucide-react';

interface ProfileTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  onUpdateState: (newState: Partial<UserState>) => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export default function ProfileTab({ userState, activeSubjects, onUpdateState }: ProfileTabProps) {
  const {
    username,
    avatar,
    university,
    branch,
    semester,
    scheme,
    joinedDate,
    level,
    xp,
    streak,
    completedTopics,
    completedModules,
  } = userState;

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [newSemester, setNewSemester] = useState(semester);
  const [newBranch, setNewBranch] = useState(branch);
  const [newScheme, setNewScheme] = useState(scheme);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);

  // Dynamic Level Titles based on student level
  const getLevelTitle = (lvl: number) => {
    if (lvl <= 1) return 'Freshman Scout';
    if (lvl === 2) return 'Study Novice';
    if (lvl === 3) return 'Syllabus Ranger';
    if (lvl === 4) return 'Knowledge Knight';
    return 'Academic Overlord';
  };

  const levelTitle = getLevelTitle(level);

  // Calculate XP stats
  const { xpInCurrentLevel, xpNeededForNextLevel, xpPercent } = getLevelAndProgress(xp);

  // Syllabus calculation
  let totalSyllabusTopicsCount = 0;
  for (const sub of activeSubjects) {
    for (const mod of sub.modules) {
      totalSyllabusTopicsCount += mod.topics.length;
    }
  }
  const completedTopicsCount = completedTopics.length;

  const u = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
  const availableBranches = Object.keys(u);
  const uBranch = u[newBranch] || u['CSE'] || {};
  const availableSchemes = Object.keys(uBranch);
  const uScheme = uBranch[newScheme] || uBranch['2022 Scheme'] || {};
  const availableSemesters = Object.keys(uScheme).map(Number).sort((a, b) => a - b);

  const handleSaveCourseSwitch = () => {
    onUpdateState({
      semester: newSemester,
      branch: newBranch,
      scheme: newScheme,
    });
    setIsEditingCourse(false);
  };

  const handleSelectAvatar = (selectedAvatar: string) => {
    onUpdateState({ avatar: selectedAvatar });
    setIsPickingAvatar(false);
  };

  const formattedJoinDate = new Date(joinedDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Achievements checking logic (matching stats tab)
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
      unlocked: completedModules.length >= 1,
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

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* GAMIFIED HERO PLAYER CARD */}
      <div className="bg-gradient-to-br from-[#141A1F] via-[#141A1F] to-[#1C1F26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Settings Button */}
        <button 
          onClick={() => onUpdateState({ activeTab: 'settings' })}
          className="absolute top-4 right-4 bg-[#111114]/80 border border-white/5 hover:border-white/15 text-gray-400 hover:text-white w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-20"
          id="profile-settings-btn"
          title="Open Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Ambient top right glow */}
        <div className="absolute top-[-40px] right-[-40px] w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-40px] left-[-40px] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          
          {/* Avatar selector with game rank indicator */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-[#0C0F12] border-3 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center justify-center text-5xl relative overflow-hidden transition-all duration-300 group-hover:border-blue-400 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]">
                <span className="animate-pulse-short">{avatar}</span>
                
                {/* Overlay edit state button */}
                <button 
                  onClick={() => setIsPickingAvatar(!isPickingAvatar)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider transition-opacity cursor-pointer gap-1"
                >
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  Edit
                </button>
              </div>

              {/* Mini Level Ring */}
              <div className="absolute bottom-[-10px] right-[-10px] bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/30 text-white font-mono font-black text-xs w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                {level}
              </div>
            </div>

            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-4">Active Profile</p>
          </div>

          {/* Player details */}
          <div className="space-y-6 text-center md:text-left flex-1 min-w-0">
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2.5">
                <h3 className="text-2xl font-black text-white tracking-tight leading-none">{username}</h3>
                <span className="w-fit mx-auto sm:mx-0 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2.5 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider">
                  {levelTitle}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center justify-center md:justify-start gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Semester Cadet since {formattedJoinDate}
              </p>
            </div>

            {/* Level & XP Experience Bar */}
            <div className="space-y-2 max-w-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono">XP PROGRESS</span>
                <span className="text-blue-400 font-bold font-mono">{xpInCurrentLevel} / {xpNeededForNextLevel} XP ({xpPercent}%)</span>
              </div>
              <div className="w-full h-3 bg-[#0C0F12] rounded-full overflow-hidden p-0.5 border border-gray-800/80">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Unlock {xpNeededForNextLevel - xpInCurrentLevel} more XP to rise to Level {level + 1}</p>
            </div>

            {/* Character Class (Course Info) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0C0F12] border border-gray-800/60 p-3.5 rounded-2xl">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider font-mono">University</span>
                <p className="text-xs font-bold text-white mt-1.5 leading-none">{university}</p>
              </div>
              <div className="bg-[#0C0F12] border border-gray-800/60 p-3.5 rounded-2xl">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider font-mono">Branch Class</span>
                <p className="text-xs font-bold text-white mt-1.5 leading-none">{branch}</p>
              </div>
              <div className="bg-[#0C0F12] border border-gray-800/60 p-3.5 rounded-2xl">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider font-mono">Semester</span>
                <p className="text-xs font-bold text-white mt-1.5 leading-none">Semester {semester}</p>
              </div>
              <div className="bg-[#0C0F12] border border-gray-800/60 p-3.5 rounded-2xl">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider font-mono">Syllabus Scheme</span>
                <p className="text-xs font-bold text-white mt-1.5 leading-none truncate">{scheme}</p>
              </div>
            </div>

            {/* Switch semester action */}
            <div className="pt-2">
              {isEditingCourse ? (
                <div className="p-5 bg-[#0C0F12]/90 border border-gray-800 rounded-2xl space-y-4 max-w-md">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5 font-display uppercase tracking-wide">
                    <Swords className="w-4 h-4" />
                    Respec Character Class
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Branch</label>
                      <select
                        value={newBranch}
                        onChange={(e) => {
                          const nextBranch = e.target.value;
                          setNewBranch(nextBranch);
                          const nextSchemes = u[nextBranch] ? Object.keys(u[nextBranch]) : [];
                          if (nextSchemes.length > 0) {
                            const nextScheme = nextSchemes[0];
                            setNewScheme(nextScheme);
                            const nextSems = u[nextBranch]?.[nextScheme] ? Object.keys(u[nextBranch][nextScheme]).map(Number).sort((a, b) => a - b) : [];
                            if (nextSems.length > 0) {
                              setNewSemester(nextSems[0]);
                            }
                          }
                        }}
                        className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Scheme</label>
                      <select
                        value={newScheme}
                        onChange={(e) => {
                          const nextScheme = e.target.value;
                          setNewScheme(nextScheme);
                          const nextSems = uBranch[nextScheme] ? Object.keys(uBranch[nextScheme]).map(Number).sort((a, b) => a - b) : [];
                          if (nextSems.length > 0) {
                            setNewSemester(nextSems[0]);
                          }
                        }}
                        className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {availableSchemes.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Semester</label>
                      <select
                        value={newSemester}
                        onChange={(e) => setNewSemester(Number(e.target.value))}
                        className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {availableSemesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCourseSwitch}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg cursor-pointer transition-colors"
                    >
                      Save Switch
                    </button>
                    <button
                      onClick={() => setIsEditingCourse(false)}
                      className="px-4 py-2 bg-[#1C242C] hover:bg-gray-800 text-xs font-semibold text-gray-400 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingCourse(true)}
                  className="py-2 px-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/25 text-blue-300 hover:text-blue-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Respec Character Class</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Floating Avatar Picker Modal overlay */}
        {isPickingAvatar && (
          <div className="absolute inset-0 bg-[#0C0F12]/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h4 className="text-base font-bold text-white flex items-center gap-1.5 uppercase font-display tracking-wider mb-2">
              <Palette className="w-5 h-5 text-blue-500" />
              Customize Player Avatar
            </h4>
            <p className="text-xs text-gray-500 mb-6">Choose an avatar that reflects your academic focus.</p>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 max-w-sm">
              {AVATARS.map(av => (
                <button
                  key={av}
                  onClick={() => handleSelectAvatar(av)}
                  className={`w-14 h-14 rounded-2xl bg-[#141A1F] hover:bg-[#1C242C] border text-3xl flex items-center justify-center transition-all cursor-pointer ${
                    av === avatar ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] bg-blue-950/15' : 'border-gray-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPickingAvatar(false)}
              className="mt-6 px-5 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* GAMIFIED STATS BENTO ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Total XP Earned</span>
            <p className="text-lg font-black font-mono text-white mt-0.5">{xp} XP</p>
          </div>
        </div>

        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Current Streak</span>
            <p className="text-lg font-black font-mono text-white mt-0.5">{streak} Days</p>
          </div>
        </div>

        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Completed Topics</span>
            <p className="text-lg font-black font-mono text-white mt-0.5">{completedTopicsCount}</p>
          </div>
        </div>

        <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Badges Earned</span>
            <p className="text-lg font-black font-mono text-white mt-0.5">{unlockedCount} / 6</p>
          </div>
        </div>
      </div>

      {/* ACADEMIC STUDY HABIT SUMMARY */}
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

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Clock className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold font-display tracking-wide uppercase">Study Habit Statistics</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Daily Focus Goal</span>
                <p className="text-xl font-black font-mono text-emerald-400 mt-1">{habitStats.dailyGoal}m</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Target daily minutes</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Study Streak</span>
                <p className="text-xl font-black font-mono text-amber-500 mt-1">{habitStats.streak} d</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Longest: {habitStats.longestStreak} days</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Weekly / Monthly</span>
                <p className="text-xl font-black font-mono text-blue-400 mt-1">{habitStats.weeklyHours}h <span className="text-xs text-gray-500 font-semibold">/ {habitStats.monthlyHours}h</span></p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Total: {habitStats.totalHours} hours</p>
              </div>

              <div className="bg-[#141A1F] border border-gray-800/80 rounded-2xl p-4.5">
                <span className="text-[9px] text-gray-500 uppercase font-mono font-bold">Sessions Stats</span>
                <p className="text-xl font-black font-mono text-purple-400 mt-1">{habitStats.totalSessions}</p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Longest: {habitStats.longestSession} mins</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* GAMIFIED BADGES & TROPHIES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-400">
          <Award className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold font-display tracking-wide uppercase">Unlocked Achievements</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`border rounded-2xl p-5 flex items-start gap-4 transition-all ${
                ach.unlocked
                  ? 'bg-gradient-to-r from-[#1C242C]/40 to-[#141A1F]/40 border-amber-500/25 shadow-[0_4px_15px_rgba(245,158,11,0.04)]'
                  : 'bg-[#141A1F]/30 border-gray-850 opacity-40 grayscale'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0 ${
                ach.unlocked ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-gray-900 border border-gray-800'
              }`}>
                {ach.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className={`text-sm font-bold tracking-tight leading-tight ${ach.unlocked ? 'text-amber-400' : 'text-gray-400'}`}>
                  {ach.title}
                </h4>
                <p className="text-xs text-gray-500 leading-snug truncate-2-lines">{ach.description}</p>
                {ach.unlocked ? (
                  <span className="inline-block text-[8px] bg-amber-500/15 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase mt-2">
                    ✓ Completed
                  </span>
                ) : (
                  <span className="inline-block text-[8px] bg-gray-900 text-gray-500 font-mono px-1.5 py-0.5 rounded uppercase mt-2">
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
