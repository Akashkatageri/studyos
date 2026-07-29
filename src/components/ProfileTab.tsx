import React, { useState } from 'react';
import { UserState, Subject } from '../types';
import { AVATARS, COURSE_TEMPLATES } from '../data';
import { getLocalDateString } from '../utils/dateUtils';
import { getLevelAndProgress } from '../utils/xpUtils';
import { Award, BookOpen, RefreshCw, Zap, Flame, Swords, Palette, Settings, Crown, Trophy, BarChart3, Gift } from 'lucide-react';
import { ALL_ACHIEVEMENTS, claimAchievement, claimAllAchievements } from '../utils/achievements';
import { SoundManager } from '../utils/soundManager';
import AchievementModal from './AchievementModal';

interface ProfileTabProps {
  userState: UserState;
  activeSubjects: Subject[];
  onUpdateState: (newState: Partial<UserState>) => void;
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
  } = userState;

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [newSemester, setNewSemester] = useState(semester);
  const [newBranch, setNewBranch] = useState(branch);
  const [newScheme, setNewScheme] = useState(scheme);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Dynamic Level Titles based on student level
  const getLevelTitle = (lvl: number) => {
    if (lvl <= 1) return 'Freshman Scout';
    if (lvl === 2) return 'Study Novice';
    if (lvl === 3) return 'Syllabus Ranger';
    if (lvl === 4) return 'Knowledge Knight';
    return 'ACADEMIC OVERLORD';
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

  // Achievements checking logic dynamically from ALL_ACHIEVEMENTS
  const claimedAchievements = userState.unlockedAchievements || [];
  const achievements = ALL_ACHIEVEMENTS.map((ach) => {
    const isClaimed = claimedAchievements.includes(ach.id);
    const isCompleted = ach.checkUnlocked(userState, activeSubjects, []);
    const isReadyToClaim = isCompleted && !isClaimed;
    const isUnlocked = isClaimed;

    return {
      id: ach.id,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      rarity: ach.rarity,
      xpReward: ach.xpReward,
      isClaimed,
      isCompleted,
      isReadyToClaim,
      unlocked: isUnlocked,
    };
  });

  const readyToClaimList = achievements.filter(a => a.isReadyToClaim);
  const readyToClaimXP = readyToClaimList.reduce((sum, a) => sum + a.xpReward, 0);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.isReadyToClaim !== b.isReadyToClaim) return a.isReadyToClaim ? -1 : 1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return b.xpReward - a.xpReward;
  });

  // Study habit statistics
  const history = userState.focusHistory || {};
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

  const habitStats = {
    dailyGoal: userState.dailyFocusGoal ?? 30,
    streak: userState.academicStudyStreak ?? userState.streak ?? 0,
    longestStreak: userState.longestStudyStreak ?? userState.longestStreak ?? 0,
    totalHours: ((userState.totalFocusMinutes || 0) / 60).toFixed(1),
    weeklyHours: (weeklyMins / 60).toFixed(1),
    monthlyHours: (monthlyMins / 60).toFixed(1),
    totalSessions: userState.totalFocusSessions ?? 0,
    longestSession: userState.longestFocusSessionMinutes ?? 0
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      
      {/* TOP HEADER */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-black text-white font-display tracking-tight">Profile</h2>
        <button
          onClick={() => onUpdateState({ activeTab: 'settings' })}
          className="w-9 h-9 rounded-full bg-[#141820] border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          title="Settings"
          id="profile-settings-btn"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* GAMIFIED HERO PLAYER CARD */}
      <div className="bg-[#10141C] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden shadow-xl" id="profile-hero-card">
        {/* Subtle glowing purple top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* Avatar Container with Level Attached */}
            <div className="relative shrink-0">
              <div 
                onClick={() => setIsPickingAvatar(true)}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-[#181D28] border-2 border-purple-500/40 hover:border-purple-400 flex items-center justify-center text-4xl sm:text-5xl cursor-pointer transition-all shadow-md relative group"
                id="profile-avatar-container"
              >
                <span>{avatar}</span>
                <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider transition-opacity gap-1">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  Edit
                </div>
              </div>

              {/* Level Badge attached at bottom of avatar */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-purple-400/40 shadow-sm whitespace-nowrap">
                Lvl {level}
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">{username}</h3>
              <div className="inline-flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                <Crown className="w-3 h-3 text-purple-400" />
                <span>{levelTitle}</span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium pt-0.5">
                Semester Cadet - since {formattedJoinDate}
              </p>
            </div>
          </div>
        </div>

        {/* XP PROGRESS */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-mono text-[10px] uppercase tracking-wider font-bold">XP PROGRESS</span>
            <span className="text-purple-400 font-extrabold font-mono text-xs">{xpInCurrentLevel} / {xpNeededForNextLevel} XP ({xpPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-[#0C0F16] rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" 
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 font-mono">{xpNeededForNextLevel - xpInCurrentLevel} XP to Level {level + 1}</p>
        </div>

        {/* 4 Academic Info Grid Pills */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="bg-[#161B26] border border-white/5 p-2.5 rounded-xl text-center">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">UNI</span>
            <p className="text-xs font-black text-white mt-0.5 truncate">{university}</p>
          </div>
          <div className="bg-[#161B26] border border-white/5 p-2.5 rounded-xl text-center">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">BRANCH</span>
            <p className="text-xs font-black text-white mt-0.5 truncate">{branch}</p>
          </div>
          <div className="bg-[#161B26] border border-white/5 p-2.5 rounded-xl text-center">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">SEM</span>
            <p className="text-xs font-black text-white mt-0.5">{semester}</p>
          </div>
          <div className="bg-[#161B26] border border-white/5 p-2.5 rounded-xl text-center">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">SCHEME</span>
            <p className="text-xs font-black text-white mt-0.5 truncate">{scheme}</p>
          </div>
        </div>

        {/* Respec Character Class Button (Placed right inside top Hero Card) */}
        <div className="pt-1">
          {isEditingCourse ? (
            <div className="p-4 bg-[#141824] border border-purple-500/30 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-display uppercase tracking-wider">
                <Swords className="w-3.5 h-3.5" />
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
                    className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
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
                    className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {availableSchemes.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Semester</label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(Number(e.target.value))}
                    className="w-full bg-[#1C242C] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {availableSemesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveCourseSwitch}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors"
                >
                  Save Switch
                </button>
                <button
                  onClick={() => setIsEditingCourse(false)}
                  className="px-4 py-2 bg-[#1C242C] hover:bg-gray-800 text-xs font-semibold text-gray-400 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingCourse(true)}
              className="w-full py-2.5 px-4 bg-[#181D2A] hover:bg-[#202738] border border-purple-500/30 hover:border-purple-500/50 text-purple-300 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm uppercase tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Respec character class</span>
            </button>
          )}
        </div>

        {/* Floating Avatar Picker Modal overlay */}
        {isPickingAvatar && (
          <div className="absolute inset-0 bg-[#0C0F12]/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h4 className="text-base font-bold text-white flex items-center gap-1.5 uppercase font-display tracking-wider mb-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Customize Player Avatar
            </h4>
            <p className="text-xs text-gray-500 mb-6">Choose an avatar that reflects your academic focus.</p>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 max-w-sm">
              {AVATARS.map(av => (
                <button
                  key={av}
                  onClick={() => handleSelectAvatar(av)}
                  className={`w-14 h-14 rounded-2xl bg-[#141A1F] hover:bg-[#1C242C] border text-3xl flex items-center justify-center transition-all cursor-pointer ${
                    av === avatar ? 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)] bg-purple-950/15' : 'border-gray-800'
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

      {/* GAMIFIED STATS BENTO ROW (4 CARDS) */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {/* TOTAL XP */}
        <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3 text-center space-y-1">
          <Zap className="w-4 h-4 text-purple-400 mx-auto" />
          <p className="text-base sm:text-lg font-black font-mono text-white leading-tight">{xp}</p>
          <span className="text-[9px] text-gray-500 uppercase font-mono font-extrabold tracking-wider block">TOTAL XP</span>
        </div>

        {/* STREAK */}
        <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3 text-center space-y-1">
          <Flame className="w-4 h-4 text-orange-400 mx-auto" />
          <p className="text-base sm:text-lg font-black font-mono text-white leading-tight">{streak}</p>
          <span className="text-[9px] text-gray-500 uppercase font-mono font-extrabold tracking-wider block">STREAK</span>
        </div>

        {/* TOPICS */}
        <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3 text-center space-y-1">
          <BookOpen className="w-4 h-4 text-emerald-400 mx-auto" />
          <p className="text-base sm:text-lg font-black font-mono text-white leading-tight">{completedTopicsCount}</p>
          <span className="text-[9px] text-gray-500 uppercase font-mono font-extrabold tracking-wider block">TOPICS</span>
        </div>

        {/* BADGES */}
        <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3 text-center space-y-1">
          <Award className="w-4 h-4 text-cyan-400 mx-auto" />
          <p className="text-base sm:text-lg font-black font-mono text-white leading-tight">{unlockedCount}/{ALL_ACHIEVEMENTS.length}</p>
          <span className="text-[9px] text-gray-500 uppercase font-mono font-extrabold tracking-wider block">BADGES</span>
        </div>
      </div>

      {/* STUDY HABITS SECTION */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-300 px-1">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-gray-300">Study habits</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* DAILY GOAL */}
          <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">DAILY GOAL</span>
            <p className="text-lg font-black text-white font-mono">{habitStats.dailyGoal} <span className="text-xs font-normal text-gray-400">min</span></p>
            <p className="text-[10px] text-gray-500">Target daily focus</p>
          </div>

          {/* STREAK */}
          <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">STREAK</span>
            <p className="text-lg font-black text-purple-400 font-mono">{habitStats.streak} <span className="text-xs font-normal text-purple-300">d</span></p>
            <p className="text-[10px] text-gray-500">Longest: {habitStats.longestStreak} days</p>
          </div>

          {/* WEEKLY / MONTHLY */}
          <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">WEEKLY / MONTHLY</span>
            <p className="text-lg font-black text-white font-mono">{habitStats.weeklyHours} <span className="text-xs font-normal text-gray-400">h</span></p>
            <p className="text-[10px] text-gray-500">Total {habitStats.totalHours}h</p>
          </div>

          {/* SESSIONS */}
          <div className="bg-[#10141C] border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-mono font-bold tracking-wider block">SESSIONS</span>
            <p className="text-lg font-black text-white font-mono">{habitStats.totalSessions}</p>
            <p className="text-[10px] text-gray-500">Longest: {habitStats.longestSession} min</p>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS SECTION */}
      <div className="space-y-3">
        {/* PROMINENT CLAIM BANNER AT TOP OF PROFILE ACHIEVEMENTS */}
        {readyToClaimList.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/25 via-purple-600/25 to-indigo-600/25 border-2 border-amber-400 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                🎁
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>{readyToClaimList.length} Achievement{readyToClaimList.length > 1 ? 's' : ''} Ready to Claim!</span>
                  <span className="text-[10px] sm:text-xs text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    +{readyToClaimXP} XP
                  </span>
                </h3>
                <p className="text-[11px] text-gray-300">Tap claim to collect your XP rewards and display these badges on your profile.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  const { updatedState, claimedAchievements } = claimAllAchievements(userState, activeSubjects, []);
                  if (claimedAchievements.length > 0) {
                    SoundManager.play('badge_unlock');
                    SoundManager.vibrate('success');
                    onUpdateState(updatedState);
                  }
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-current text-gray-950" />
                Claim All (+{readyToClaimXP} XP)
              </button>
              <button
                onClick={() => setShowAllAchievements(true)}
                className="px-3 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Trophy Hall
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <div 
            onClick={() => setShowAllAchievements(true)}
            className="flex items-center gap-2 text-gray-300 cursor-pointer group"
          >
            <Trophy className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-gray-300 group-hover:text-purple-300 transition-colors">Achievements ({unlockedCount}/{ALL_ACHIEVEMENTS.length})</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAllAchievements(true)}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/20 transition-all active:scale-95"
          >
            See all →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedAchievements.slice(0, 4).map((ach) => (
            <div
              key={ach.id}
              onClick={() => {
                if (ach.isReadyToClaim) {
                  const { updatedState, claimedAchievement } = claimAchievement(userState, ach.id, activeSubjects, []);
                  if (claimedAchievement) {
                    SoundManager.play('badge_unlock');
                    SoundManager.vibrate('success');
                    onUpdateState(updatedState);
                  }
                } else {
                  setShowAllAchievements(true);
                }
              }}
              className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                ach.isReadyToClaim
                  ? 'bg-gradient-to-br from-[#2E1A47] via-[#22133B] to-[#180E2E] border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.25)] animate-pulse'
                  : ach.unlocked
                  ? 'bg-[#10141C] border border-white/10 hover:border-purple-500/40'
                  : 'bg-[#10141C] border border-white/10 opacity-50 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                  ach.isReadyToClaim
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-bounce'
                    : ach.unlocked
                    ? 'bg-emerald-950/40 border-emerald-500/30'
                    : 'bg-gray-800/80 border-gray-700/80 text-gray-500'
                }`}>
                  {ach.icon}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{ach.title}</span>
                      {ach.isReadyToClaim && (
                        <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-400">
                          READY!
                        </span>
                      )}
                    </h4>
                    <span className={`text-[9px] font-mono font-bold shrink-0 ${ach.isReadyToClaim ? 'text-amber-300 font-black' : 'text-amber-400'}`}>
                      +{ach.xpReward} XP
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{ach.description}</p>
                </div>
              </div>

              <div>
                {ach.isReadyToClaim ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const { updatedState, claimedAchievement } = claimAchievement(userState, ach.id, activeSubjects, []);
                      if (claimedAchievement) {
                        SoundManager.play('badge_unlock');
                        SoundManager.vibrate('success');
                        onUpdateState(updatedState);
                      }
                    }}
                    className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-3.5 h-3.5 fill-current" />
                    <span>CLAIM +{ach.xpReward} XP</span>
                  </button>
                ) : ach.unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-md">
                    ✓ Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-gray-800 border border-gray-700 text-gray-400 font-mono px-2 py-0.5 rounded-md">
                    Locked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FULL ACHIEVEMENT LIST MODAL */}
      <AchievementModal
        isOpen={showAllAchievements}
        onClose={() => setShowAllAchievements(false)}
        userState={userState}
        activeSubjects={activeSubjects}
        onUpdateState={(updated) => onUpdateState(updated)}
      />

    </div>
  );
}
