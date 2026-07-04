import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState } from '../../types';

interface FriendsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onUpdateBioAndName: (displayName: string, bio: string) => void;
  onUpdatePrivacy: (field: string, val: boolean) => void;
}

export default function FriendsPrivacyModal({
  isOpen,
  onClose,
  userState,
  onUpdateBioAndName,
  onUpdatePrivacy,
}: FriendsPrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="privacy-settings-dialog">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            id="privacy-modal-backdrop"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#111422] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.85)]"
            id="privacy-modal-card"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white hover:bg-gray-700 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg"
              style={{ minHeight: '44px', minWidth: '44px' }}
              id="close-privacy-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black font-display text-white tracking-tight uppercase leading-none">
                  Configure Social Profile
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Manage how you appear in search queries & leaderboards.
                </p>
              </div>

              {/* Profile Name & Bio Edit Inputs */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onUpdateBioAndName(
                    formData.get('dispName') as string, 
                    formData.get('bio') as string
                  );
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-500 uppercase block">Display Nickname</label>
                  <input
                    name="dispName"
                    type="text"
                    defaultValue={userState.displayName || userState.username}
                    maxLength={24}
                    className="w-full bg-black/35 border border-gray-850 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-500 uppercase block">Short Bio</label>
                  <textarea
                    name="bio"
                    defaultValue={userState.bio || ""}
                    maxLength={140}
                    rows={2}
                    placeholder="Tell VTU what you are currently studying..."
                    className="w-full bg-black/35 border border-gray-850 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 outline-none"
                >
                  Save Biography
                </button>
              </form>

              {/* Privacy Toggle Settings */}
              <div className="space-y-3.5 border-t border-gray-850 pt-5 text-xs">
                <h4 className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Privacy Controls</h4>

                {/* Public visibility toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Public Search Visibility</span>
                    <span className="text-gray-500 text-[10px]">Allow classmates to look up your stats.</span>
                  </div>
                  <button
                    onClick={() => onUpdatePrivacy('isPublic', userState.isPublic !== false ? false : true)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all text-[10px] cursor-pointer border-0 outline-none ${
                      userState.isPublic !== false 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' 
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {userState.isPublic !== false ? "Public 🟢" : "Private 🔒"}
                  </button>
                </div>

                {/* Allow friend requests toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Accept Friend Requests</span>
                    <span className="text-gray-500 text-[10px]">Show the "Add Friend" button to peers.</span>
                  </div>
                  <button
                    onClick={() => onUpdatePrivacy('allowFriendRequests', userState.allowFriendRequests !== false ? false : true)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all text-[10px] cursor-pointer border-0 outline-none ${
                      userState.allowFriendRequests !== false 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' 
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {userState.allowFriendRequests !== false ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {/* Hide XP toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Hide Total XP Score</span>
                    <span className="text-gray-500 text-[10px]">Mask precise XP score in profiles.</span>
                  </div>
                  <button
                    onClick={() => onUpdatePrivacy('hideXP', !userState.hideXP)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all text-[10px] cursor-pointer border-0 outline-none ${
                      userState.hideXP 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' 
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {userState.hideXP ? "Hidden 🔒" : "Visible 🟢"}
                  </button>
                </div>

                {/* Hide Streaks toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Hide Streak Fire Count</span>
                    <span className="text-gray-500 text-[10px]">Mask daily streaks in profiles.</span>
                  </div>
                  <button
                    onClick={() => onUpdatePrivacy('hideStreak', !userState.hideStreak)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all text-[10px] cursor-pointer border-0 outline-none ${
                      userState.hideStreak 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' 
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {userState.hideStreak ? "Hidden 🔒" : "Visible 🟢"}
                  </button>
                </div>

                {/* Hide Achievements toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Hide Achievements Badges</span>
                    <span className="text-gray-500 text-[10px]">Do not show badges in details.</span>
                  </div>
                  <button
                    onClick={() => onUpdatePrivacy('hideAchievements', !userState.hideAchievements)}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all text-[10px] cursor-pointer border-0 outline-none ${
                      userState.hideAchievements 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' 
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {userState.hideAchievements ? "Hidden 🔒" : "Visible 🟢"}
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
