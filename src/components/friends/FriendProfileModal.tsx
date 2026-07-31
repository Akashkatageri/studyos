import React from 'react';
import { 
  ArrowLeft, 
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState, FriendProfile, SocialActivity } from '../../types';
import AvatarRenderer from '../AvatarRenderer';

interface FriendProfileModalProps {
  isOpen: boolean;
  selectedProfile: FriendProfile | null;
  userState: UserState;
  friendsList: FriendProfile[];
  selectedUserActivities: SocialActivity[];
  onClose: () => void;
  onRemoveFriend: (friendUid: string, username: string) => void;
}

export default function FriendProfileModal({
  isOpen,
  selectedProfile,
  userState,
  friendsList,
  selectedUserActivities,
  onClose,
  onRemoveFriend,
}: FriendProfileModalProps) {
  if (!isOpen || !selectedProfile) return null;

  const isFriend = userState.uid && friendsList.some(f => f.uid === selectedProfile.uid);
  const firstName = (selectedProfile.displayName || selectedProfile.username).split(' ')[0].toUpperCase();

  // Calculations for You vs Friend comparison
  const myXP = userState.xp || 0;
  const friendXP = selectedProfile.xp || 0;
  const maxXP = Math.max(myXP, friendXP, 100);
  const myXPPercent = Math.min(100, Math.max(10, Math.round((myXP / maxXP) * 100)));
  const friendXPPercent = Math.min(100, Math.max(10, Math.round((friendXP / maxXP) * 100)));

  const myStreak = userState.streak || 0;
  const friendStreak = selectedProfile.streak || 0;
  const maxStreak = Math.max(myStreak, friendStreak, 1);
  const myStreakPercent = Math.min(100, Math.max(10, Math.round((myStreak / maxStreak) * 100)));
  const friendStreakPercent = Math.min(100, Math.max(10, Math.round((friendStreak / maxStreak) * 100)));

  // Format activity timestamp
  const formatTimestamp = (isoStr?: string) => {
    if (!isoStr) return 'today';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'today';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday) return `${time} · today`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'today';
    }
  };

  // Derive milestones or activities
  const milestonesList = selectedUserActivities.length > 0 
    ? selectedUserActivities 
    : [
        {
          id: 'default-1',
          userId: selectedProfile.uid,
          username: selectedProfile.username,
          avatar: selectedProfile.avatar,
          type: 'level_up' as const,
          text: `Reached Level ${selectedProfile.level}`,
          createdAt: new Date().toISOString(),
          pillLabel: 'LVL UP',
          pillColor: 'amber'
        },
        {
          id: 'default-2',
          userId: selectedProfile.uid,
          username: selectedProfile.username,
          avatar: selectedProfile.avatar,
          type: 'streak' as const,
          text: `Maintained ${selectedProfile.streak} day streak`,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          pillLabel: `${selectedProfile.streak}d`,
          pillColor: 'amber'
        },
        {
          id: 'default-3',
          userId: selectedProfile.uid,
          username: selectedProfile.username,
          avatar: selectedProfile.avatar,
          type: 'module_complete' as const,
          text: `Completed ${selectedProfile.modulesCompleted || 0} modules this semester`,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          pillLabel: 'MODULE',
          pillColor: 'emerald'
        }
      ];

  return (
    <AnimatePresence>
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="student-profile-dialog">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            id="profile-modal-backdrop"
          />

          {/* Main profile card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0E101A] border border-gray-800/80 rounded-3xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col"
            id="profile-modal-card"
          >
            {/* Top Action Bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-850/80 bg-[#0E101A]/90 shrink-0 z-10">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-all font-black tracking-wide cursor-pointer bg-transparent border-0"
                id="back-from-profile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {isFriend && (
                <button
                  onClick={() => onRemoveFriend(selectedProfile.uid, selectedProfile.username)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  id="unfriend-button"
                >
                  Unfriend
                </button>
              )}
            </div>

            {/* Scrollable Container */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
              
              {/* 1. Header Profile Banner Card */}
              <div className="relative bg-gradient-to-b from-[#181632] to-[#121424] border border-purple-500/30 rounded-2xl p-5 shadow-lg overflow-hidden">
                {/* Purple top glow accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500" />
                
                <div className="flex items-start gap-4">
                  {/* Large Avatar container */}
                  <div className="w-16 h-16 rounded-2xl bg-[#1C183B] border border-purple-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <AvatarRenderer avatar={selectedProfile.avatar} size={56} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-xl font-black text-white font-display tracking-tight truncate">
                      {selectedProfile.displayName || selectedProfile.username}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">
                      @{selectedProfile.username}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Joined {new Date(selectedProfile.joinedDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                    </p>
                    
                    {/* Status Pill */}
                    <div className="pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        selectedProfile.status === 'online' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-gray-800/80 text-gray-400 border border-gray-700/50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedProfile.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                        {selectedProfile.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Stat Boxes in a Row */}
                <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-gray-800/60 text-center">
                  <div className="bg-[#0B0D18]/80 border border-gray-800/80 p-2 sm:p-2.5 rounded-xl">
                    <span className="text-sm sm:text-base font-black text-white block leading-tight">
                      {selectedProfile.semester}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                      SEMESTER
                    </span>
                  </div>

                  <div className="bg-[#0B0D18]/80 border border-gray-800/80 p-2 sm:p-2.5 rounded-xl">
                    <span className="text-sm sm:text-base font-black text-white block leading-tight">
                      {selectedProfile.level}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                      LEVEL
                    </span>
                  </div>

                  <div className="bg-[#0B0D18]/80 border border-gray-800/80 p-2 sm:p-2.5 rounded-xl">
                    <span className="text-sm sm:text-base font-black text-white block leading-tight">
                      {selectedProfile.streak}d
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                      STREAK
                    </span>
                  </div>

                  <div className="bg-[#0B0D18]/80 border border-gray-800/80 p-2 sm:p-2.5 rounded-xl">
                    <span className="text-sm sm:text-base font-black text-emerald-400 font-mono block leading-tight">
                      {selectedProfile.xp}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                      XP
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Semester Syllabus Card */}
              <div className="bg-[#121422] border border-gray-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 text-xs">Semester syllabus</span>
                  <span className="font-black text-purple-400 font-mono">{selectedProfile.semesterProgress || 0}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${selectedProfile.semesterProgress || 0}%` }} 
                  />
                </div>

                {/* 3 Metric cards below */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-[#0A0C16] border border-gray-800/80 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                      MODULES DONE
                    </span>
                    <span className="text-sm font-black text-white block mt-1">
                      {selectedProfile.modulesCompleted || 0}
                    </span>
                  </div>

                  <div className="bg-[#0A0C16] border border-gray-800/80 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                      LONGEST STREAK
                    </span>
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1 mt-1">
                      🔥 {selectedProfile.longestStreak || selectedProfile.streak || 0}d
                    </span>
                  </div>

                  <div className="bg-[#0A0C16] border border-gray-800/80 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                      UNIVERSITY
                    </span>
                    <span className="text-xs font-black text-white truncate block mt-1">
                      {selectedProfile.university || 'VTU'} - {selectedProfile.branch || 'CSE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. YOU VS FRIEND Comparison Card */}
              <div className="bg-[#121422] border border-gray-800/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-300 uppercase tracking-widest font-mono">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>YOU VS {firstName}</span>
                </div>

                {/* Metric 1: XP THIS WEEK */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                    XP THIS WEEK
                  </span>

                  {/* You Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-purple-300 font-bold">You</span>
                      <span className="font-mono font-black text-white">{myXP}</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${myXPPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Friend Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-amber-400 font-bold">{selectedProfile.displayName || selectedProfile.username}</span>
                      <span className="font-mono font-black text-white">{friendXP}</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${friendXPPercent}%` }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Metric 2: STREAK */}
                <div className="space-y-2 pt-2 border-t border-gray-800/60">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                    STREAK
                  </span>

                  {/* You Streak Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-purple-300 font-bold">You</span>
                      <span className="font-mono font-black text-white">{myStreak}d</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${myStreakPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Friend Streak Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-amber-400 font-bold">{selectedProfile.displayName || selectedProfile.username}</span>
                      <span className="font-mono font-black text-white">{friendStreak}d</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${friendStreakPercent}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. RECENT MILESTONES Card */}
              <div className="bg-[#121422] border border-gray-800/80 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest font-mono block">
                  RECENT MILESTONES
                </span>

                <div className="space-y-2.5">
                  {milestonesList.map((m: any, idx: number) => {
                    const timeText = formatTimestamp(m.createdAt);
                    const isLvl = m.text?.toLowerCase().includes('level') || m.pillLabel === 'LVL UP';
                    const isModule = m.text?.toLowerCase().includes('module') || m.pillLabel === 'MODULE';

                    return (
                      <div 
                        key={m.id || idx} 
                        className="bg-[#0B0D18] border border-gray-800/80 p-3 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden shrink-0">
                            <AvatarRenderer avatar={m.avatar || selectedProfile.avatar} size={28} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white leading-snug truncate">
                              {m.text}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                              {timeText}
                            </span>
                          </div>
                        </div>

                        {/* Pill badge on right */}
                        <div className="shrink-0">
                          {isLvl ? (
                            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg">
                              LVL UP
                            </span>
                          ) : isModule ? (
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg">
                              MODULE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg">
                              {m.pillLabel || 'NEW'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
