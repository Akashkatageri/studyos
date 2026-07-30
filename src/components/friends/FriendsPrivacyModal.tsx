import React, { useState } from 'react';
import { X, AlertCircle, Lock, Clock, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState } from '../../types';
import { containsProfanity } from '../../utils/moderation';

interface FriendsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onUpdateBioAndName: (displayName: string, bio: string) => void;
  onUpdatePrivacy: (field: string, val: boolean) => void;
  onRequestUsernameChange?: (reasonType: string, details: string) => void;
}

export default function FriendsPrivacyModal({
  isOpen,
  onClose,
  userState,
  onUpdateBioAndName,
  onUpdatePrivacy,
  onRequestUsernameChange
}: FriendsPrivacyModalProps) {
  const [showChangeReqModal, setShowChangeReqModal] = useState(false);
  const [reqReasonType, setReqReasonType] = useState<'vulgar' | 'typo' | 'admin'>('typo');
  const [reqDetails, setReqDetails] = useState('');
  const [reqSubmittedSuccess, setReqSubmittedSuccess] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(userState.displayName || userState.username);
  const [cooldownError, setCooldownError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate 30 days cooldown for Display Name
  const lastChangeTime = userState.lastDisplayNameChangeAt ? new Date(userState.lastDisplayNameChangeAt).getTime() : 0;
  const daysSinceChange = userState.lastDisplayNameChangeAt
    ? Math.floor((Date.now() - lastChangeTime) / (1000 * 60 * 60 * 24))
    : 999;
  const daysRemaining = Math.max(0, 30 - daysSinceChange);
  const isCooldownActive = daysRemaining > 0;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCooldownError(null);

    const isNameChanged = displayNameInput.trim() !== (userState.displayName || userState.username);

    if (isNameChanged && isCooldownActive) {
      setCooldownError(`Display Name can only be changed once every 30 days. Next change available in ${daysRemaining} day(s).`);
      return;
    }

    if (containsProfanity(displayNameInput)) {
      setCooldownError('Display Name contains vulgar words. Please choose an appropriate name.');
      return;
    }

    onUpdateBioAndName(displayNameInput.trim(), (new FormData(e.currentTarget).get('bio') as string) || '');
  };

  const handleSendUsernameRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (onRequestUsernameChange) {
      onRequestUsernameChange(reqReasonType, reqDetails);
    }
    setReqSubmittedSuccess(true);
    setTimeout(() => {
      setShowChangeReqModal(false);
      setReqSubmittedSuccess(false);
    }, 2500);
  };

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
            className="relative w-full max-w-md bg-[#111422] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto"
            id="privacy-modal-card"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white hover:bg-gray-700 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-10"
              style={{ minHeight: '44px', minWidth: '44px' }}
              id="close-privacy-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black font-display text-white tracking-tight uppercase leading-none">
                  Social Profile &amp; Identity
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Manage your handle, display name, biography and visibility.
                </p>
              </div>

              {/* 1. PERMANENT USERNAME SECTION */}
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Username (Permanent)
                  </label>
                  {userState.usernameChangeRequested ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending Admin Review
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowChangeReqModal(true)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      Request Change
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`@${userState.username}`}
                    className="w-full bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-2.5 text-gray-300 text-xs font-mono select-all cursor-not-allowed"
                  />
                </div>

                <p className="text-[10px] text-gray-500 leading-tight">
                  Permanent handle used for friend search, profile links, leaderboards, and mentions.
                </p>
              </div>

              {/* Profile Name & Bio Edit Inputs */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* 2. EDITABLE DISPLAY NAME */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-gray-300 uppercase block font-bold">
                      Display Name
                    </label>
                    {isCooldownActive && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cooldown: {daysRemaining}d
                      </span>
                    )}
                  </div>

                  <input
                    name="dispName"
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    maxLength={24}
                    className="w-full bg-black/35 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />

                  <p className="text-[10px] text-gray-400 leading-normal">
                    This name is visible to other students. It can only be changed once every 30 days.
                  </p>
                </div>

                {cooldownError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-300">{cooldownError}</p>
                  </div>
                )}

                {/* 3. SHORT BIO */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-300 uppercase block font-bold">Short Bio</label>
                  {(userState.bioViolation || (userState.bio && containsProfanity(userState.bio))) && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-300">
                        Your bio violates community guidelines. Please edit it before saving.
                      </p>
                    </div>
                  )}
                  <textarea
                    name="bio"
                    defaultValue={userState.bio || ""}
                    maxLength={140}
                    rows={2}
                    placeholder="Tell VTU classmates what you are currently studying..."
                    className="w-full bg-black/35 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <p className="text-[10px] text-gray-500">
                    Visible on profile cards and social pages.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 outline-none shadow-md shadow-blue-600/20"
                >
                  Save Profile Info
                </button>
              </form>

              {/* Privacy Toggle Settings */}
              <div className="space-y-3.5 border-t border-gray-800 pt-5 text-xs">
                <h4 className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Privacy Controls</h4>

                {/* Public visibility toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Public Search Visibility</span>
                    <span className="text-gray-500 text-[10px]">Allow classmates to look up your stats.</span>
                  </div>
                  <button
                    type="button"
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
                    type="button"
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
                    type="button"
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
                    type="button"
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
                    type="button"
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

            {/* REQUEST USERNAME CHANGE SUB-MODAL */}
            {showChangeReqModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#121622] border border-gray-800 rounded-2xl p-6 max-w-sm w-full space-y-4 relative shadow-2xl animate-scale-in">
                  <button
                    type="button"
                    onClick={() => setShowChangeReqModal(false)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase font-mono">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Username Change Request</span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    To maintain directory security and prevent student impersonation, permanent usernames require admin approval to change.
                  </p>

                  {reqSubmittedSuccess ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-400 text-xs font-bold flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Request submitted successfully! Admin will review your appeal shortly.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendUsernameRequest} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1 font-bold">Reason for Request:</label>
                        <div className="space-y-1.5 text-xs text-gray-300">
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-black/30 border border-gray-800">
                            <input
                              type="radio"
                              name="reasonType"
                              checked={reqReasonType === 'vulgar'}
                              onChange={() => setReqReasonType('vulgar')}
                              className="text-indigo-500"
                            />
                            <span>Contains vulgar or offensive words</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-black/30 border border-gray-800">
                            <input
                              type="radio"
                              name="reasonType"
                              checked={reqReasonType === 'typo'}
                              onChange={() => setReqReasonType('typo')}
                              className="text-indigo-500"
                            />
                            <span>Accidentally entered wrong name / typo</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-black/30 border border-gray-800">
                            <input
                              type="radio"
                              name="reasonType"
                              checked={reqReasonType === 'admin'}
                              onChange={() => setReqReasonType('admin')}
                              className="text-indigo-500"
                            />
                            <span>Administrative request / approval required</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1 font-bold">Explanation &amp; Requested Username:</label>
                        <textarea
                          required
                          value={reqDetails}
                          onChange={(e) => setReqDetails(e.target.value)}
                          placeholder="State why you need a change and proposed new handle..."
                          rows={2}
                          className="w-full bg-black/40 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowChangeReqModal(false)}
                          className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Appeal</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
