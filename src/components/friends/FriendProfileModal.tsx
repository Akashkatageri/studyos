import React from 'react';
import { 
  ArrowLeft, 
  UserMinus, 
  GraduationCap, 
  Award, 
  BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState, FriendProfile, SocialActivity } from '../../types';

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

  return (
    <AnimatePresence>
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="student-profile-dialog">
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
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 25 }}
            className="relative w-full max-w-lg bg-[#111422] border border-gray-800 rounded-3xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.8)]"
            id="profile-modal-card"
          >
            {/* Back ambient glowing circles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Action header bar */}
            <div className="flex items-center justify-between p-5 border-b border-gray-850">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all font-black uppercase tracking-wider cursor-pointer bg-transparent border-0"
                id="back-from-profile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {userState.uid && friendsList.some(f => f.uid === selectedProfile.uid) && (
                <button
                  onClick={() => onRemoveFriend(selectedProfile.uid, selectedProfile.username)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-all font-black uppercase tracking-wider cursor-pointer bg-transparent border-0"
                  id="unfriend-button"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>Unfriend</span>
                </button>
              )}
            </div>

            {/* Profile details container scrollbox */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-center sm:text-left">
                <div className="w-20 h-20 rounded-2xl bg-[#1E2135] text-4xl flex items-center justify-center mx-auto sm:mx-0 border border-gray-800">
                  {selectedProfile.avatar}
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-none">
                    {selectedProfile.displayName || selectedProfile.username}
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">
                    @{selectedProfile.username} • Joined {new Date(selectedProfile.joinedDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                  </p>
                  {selectedProfile.bio && (
                    <p className="text-xs text-gray-400 italic font-medium leading-relaxed">
                      "{selectedProfile.bio}"
                    </p>
                  )}
                </div>
              </div>

              {/* Course Metadata Stats */}
              <div className="grid grid-cols-2 gap-3 bg-black/30 border border-gray-850/80 p-4 rounded-2xl text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">University</span>
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    {selectedProfile.university}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Scheme / Branch</span>
                  <span className="font-extrabold text-white block truncate">
                    {selectedProfile.branch} ({selectedProfile.scheme.replace(' Scheme', '')})
                  </span>
                </div>
              </div>

              {/* Main numbers layout */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-[#151829] border border-gray-850 p-3 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Semester</span>
                  <span className="text-sm font-black text-white">Sem {selectedProfile.semester}</span>
                </div>
                <div className="bg-[#151829] border border-gray-850 p-3 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Level</span>
                  <span className="text-sm font-black text-blue-400">Lvl {selectedProfile.level}</span>
                </div>
                <div className="bg-[#151829] border border-gray-850 p-3 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Streak</span>
                  <span className="text-sm font-black text-amber-500 flex items-center justify-center gap-0.5">
                    🔥 {selectedProfile.streak}d
                  </span>
                </div>
                <div className="bg-[#151829] border border-gray-850 p-3 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Total XP</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {selectedProfile.hideXP ? "🔒" : `${selectedProfile.xp}`}
                  </span>
                </div>
              </div>

              {/* Progress trackers */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Semester Syllabus Progress</span>
                    <span className="font-extrabold text-white">{selectedProfile.semesterProgress}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-gray-850">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${selectedProfile.semesterProgress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-black/30 border border-gray-850 p-3.5 rounded-xl flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Modules Completed:</span>
                    <span className="font-black text-white text-sm">{selectedProfile.modulesCompleted}</span>
                  </div>
                  <div className="bg-black/30 border border-gray-850 p-3.5 rounded-xl flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Longest Streak:</span>
                    <span className="font-black text-amber-500 text-sm flex items-center gap-0.5">
                      🔥 {selectedProfile.longestStreak}d
                    </span>
                  </div>
                </div>
              </div>

              {/* Badges / Achievements list */}
              {!selectedProfile.hideAchievements && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-850 pb-1 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Unlocked Special Badges</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.badges && selectedProfile.badges.length > 0 ? (
                      selectedProfile.badges.map((badge, i) => (
                        <span 
                          key={i} 
                          className="bg-[#1C1630] border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1"
                        >
                          ✨ {badge}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">No achievements unlocked yet this semester.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Study Activities timeline */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-850 pb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Recent Milestones Timeline</span>
                </h3>
                {selectedUserActivities.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No public milestones recorded recently.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedUserActivities.map((act) => (
                      <div key={act.id} className="bg-black/25 border border-gray-850/60 p-3 rounded-xl flex items-center gap-2.5">
                        <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">{act.avatar}</span>
                        <p className="text-xs text-gray-300">
                          {act.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
