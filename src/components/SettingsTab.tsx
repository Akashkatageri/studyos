import React, { useRef, useState } from 'react';
import { UserState } from '../types';
import { 
  Settings, 
  Shield, 
  Bell, 
  HardDrive, 
  Download, 
  Upload, 
  Info, 
  Check, 
  BookOpen,
  LogOut, 
  Link2, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  Calendar,
  Volume2,
  VolumeX,
  Smartphone,
  Loader2
} from 'lucide-react';
import { COURSE_TEMPLATES } from '../data';
import { getSubjectsForCycle } from '../utils/cycleSubjects';
import { SoundManager } from '../utils/soundManager';
import { auth, googleProvider, loadUserFromFirestore, mergeLocalAndCloudStates, registerUserProfileTransaction, linkDeviceWithAccount } from '../lib/firebase';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';

interface SettingsTabProps {
  userState: UserState;
  onImportState: (imported: UserState) => void;
  onUpdateState: (newState: Partial<UserState>) => void;
  onLogout?: () => void;
  onOpenStudyCalendar?: () => void;
}

export default function SettingsTab({ userState, onImportState, onUpdateState, onLogout, onOpenStudyCalendar }: SettingsTabProps) {
  const { university, branch, scheme, semester, firstYearCycle } = userState;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [notifStudy, setNotifStudy] = useState(true);
  const [notifStreak, setNotifStreak] = useState(true);
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  // Manual device pairing state (Option A)
  const [pairingInputCode, setPairingInputCode] = useState('');
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingSuccess, setPairingSuccess] = useState(false);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const handleManualPairingSubmit = async () => {
    if (pairingInputCode.length !== 6) return;
    setIsPairingLoading(true);
    setPairingError(null);
    setPairingSuccess(false);
    try {
      await linkDeviceWithAccount(pairingInputCode, userState.uid!, userState);
      setPairingSuccess(true);
      setPairingInputCode('');
    } catch (err: any) {
      console.error("Manual pairing failed:", err);
      setPairingError(err.message || "Invalid pairing code or connection failure. Please verify the code and try again.");
    } finally {
      setIsPairingLoading(false);
    }
  };

  // 1. Export Progress JSON file download
  const handleExportData = () => {
    const dataStr = JSON.stringify(userState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyos-progress-${userState.username.toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Import Progress JSON file parser
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result as string);
        // Simple schema validations
        if (typeof parsed.username === 'string' && typeof parsed.xp === 'number' && typeof parsed.level === 'number') {
          // Force active tab to home after import to show success
          parsed.activeTab = 'home';
          onImportState(parsed);
          setShowImportSuccess(true);
          setTimeout(() => setShowImportSuccess(false), 4000);
        } else {
          alert('Invalid StudyOS backup file. Missing required properties.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON. Please check the file contents.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans pb-16">
      
      {/* Title */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </h3>
        <p className="text-xs text-gray-400">Configure your local study preferences, notifications, and backups.</p>
      </div>

      {showImportSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>StudyOS state imported successfully! Welcome back to your learning quest!</span>
        </div>
      )}

      {/* 1. APPEARANCE PRESET */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-4">
        <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Appearance Preset
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Sophisticated Dark Theme</p>
            <p className="text-xs text-gray-500">Premium dark theme with deep charcoal background and bright accents.</p>
          </div>
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
            Active
          </span>
        </div>
      </div>

      {/* 2. NOTIFICATIONS */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-4">
        <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          System Notifications
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Daily Study Reminders</p>
              <p className="text-xs text-gray-500">Alert me when revisions are due so I maintain my streak.</p>
            </div>
            <button
              onClick={() => setNotifStudy(!notifStudy)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifStudy ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notifStudy ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-gray-800/60 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Streak Freeze Alerts</p>
              <p className="text-xs text-gray-500">Alert me if my daily study streak is about to expire.</p>
            </div>
            <button
              onClick={() => setNotifStreak(!notifStreak)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifStreak ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notifStreak ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* STUDY CALENDAR & TIMINGS */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Study Schedule & Limits
          </h4>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
            Active Scheduling
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">Study Calendar Configurator</p>
            <p className="text-xs text-gray-500">Configure Semester Start/End dates, Daily Focus Goals, scheduled Study Days, and Vacation Mode protection.</p>
          </div>
          <button
            onClick={onOpenStudyCalendar}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
          >
            Configure Calendar
          </button>
        </div>
      </div>

      {/* STUDY & STREAK */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-4">
        <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Study & Streak
        </h4>
        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <p className="text-sm font-bold text-white">Semester Break Mode</p>
            <p className="text-xs text-gray-500">
              Freeze your daily study streak during holidays or waiting periods. No shields will be consumed and you can still study normally.
            </p>
          </div>
          <button
            onClick={() => onUpdateState({ semesterBreakMode: !userState.semesterBreakMode })}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              userState.semesterBreakMode ? 'bg-emerald-600' : 'bg-gray-800'
            }`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              userState.semesterBreakMode ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* 2.5 SOUND & HAPTICS */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-6">
        <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-pink-500" />
          Sound & Haptics
        </h4>

        <div className="space-y-5">
          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Sound Effects</p>
              <p className="text-xs text-gray-500">Play motivational study chimes, XP pops, level up celebrations, and timer signals.</p>
            </div>
            <button
              onClick={() => {
                const nextVal = !(userState.soundEffectsEnabled ?? true);
                onUpdateState({ soundEffectsEnabled: nextVal });
                setTimeout(() => {
                  if (nextVal) {
                    SoundManager.play('click');
                    SoundManager.vibrate('light');
                  }
                }, 50);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                (userState.soundEffectsEnabled ?? true) ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                (userState.soundEffectsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Haptic Feedback Toggle */}
          <div className="flex items-center justify-between border-t border-gray-800/40 pt-5">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Haptic Vibration</p>
              <p className="text-xs text-gray-500">Enable physical tactile responses and haptic ticks on supported mobile/Android devices.</p>
            </div>
            <button
              onClick={() => {
                const nextVal = !(userState.hapticFeedbackEnabled ?? true);
                onUpdateState({ hapticFeedbackEnabled: nextVal });
                SoundManager.play('click');
                if (nextVal) {
                  SoundManager.vibrate('medium');
                }
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                (userState.hapticFeedbackEnabled ?? true) ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                (userState.hapticFeedbackEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Focus Sound Mode Toggle */}
          <div className="flex items-center justify-between border-t border-gray-800/40 pt-5">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Immersive Focus Sounds</p>
              <p className="text-xs text-gray-500">Allow sound effects during the focus session instead of silencing other notifications.</p>
            </div>
            <button
              onClick={() => {
                const nextVal = !userState.soundFocusModeEnabled;
                onUpdateState({ soundFocusModeEnabled: nextVal });
                SoundManager.play('click');
                SoundManager.vibrate('light');
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                userState.soundFocusModeEnabled ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                userState.soundFocusModeEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2.5 border-t border-gray-800/40 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Sound Volume</p>
              <div className="flex items-center gap-1 text-gray-400 font-mono text-xs font-semibold">
                {(userState.soundVolume ?? 70) === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{userState.soundVolume ?? 70}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <VolumeX className="w-4 h-4 text-gray-600" />
              <input
                type="range"
                min="0"
                max="100"
                value={userState.soundVolume ?? 70}
                onChange={(e) => {
                  const vol = parseInt(e.target.value);
                  onUpdateState({ soundVolume: vol });
                }}
                onMouseUp={() => {
                  SoundManager.play('click');
                  SoundManager.vibrate('light');
                }}
                onTouchEnd={() => {
                  SoundManager.play('click');
                  SoundManager.vibrate('light');
                }}
                className="w-full h-1.5 bg-gray-850 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              />
              <Volume2 className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACCOUNT, SYNC & DATA */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-500" />
            Account & Cloud Sync
          </h4>
          {userState.uid && !userState.isOffline ? (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 animate-pulse">
              <Cloud className="w-3 h-3" />
              Connected & Syncing
            </span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5">
              <CloudOff className="w-3 h-3" />
              Offline Mode
            </span>
          )}
        </div>

        {/* Dynamic Auth Section */}
        {userState.uid && !userState.isOffline ? (
          // SIGNED IN USER VIEW
          <div className="p-4 bg-gray-950/40 border border-gray-800/80 rounded-xl space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Google Account</p>
                <p className="text-sm font-bold text-white mt-0.5">{userState.displayName || "Google Scholar"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</p>
                <p className="text-sm text-gray-300 font-mono mt-0.5">{userState.email || "No email synchronized"}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                <span>Sync Status: Cloud database synchronized</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    console.log("[StudyOS Trace] [SettingsTab] Explicit sign-out triggered by user action");
                    await signOut(auth);
                    console.log("[StudyOS Trace] [SettingsTab] signOut(auth) completed successfully");
                    if (onLogout) {
                      onLogout();
                    } else {
                      onUpdateState({
                        uid: undefined,
                        email: undefined,
                        displayName: undefined,
                        isOffline: true
                      });
                    }
                  } catch (err: any) {
                    alert("Logout failed: " + err.message);
                  }
                }}
                className="py-2 px-4 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Session</span>
              </button>
            </div>
          </div>
        ) : (
          // OFFLINE USER VIEW
          <div className="p-4 bg-gray-950/40 border border-gray-800/80 rounded-xl space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                <CloudOff className="w-3.5 h-3.5" />
                Local Profile Only
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your syllabus progression and stats are saved locally on this browser. Link a Google Account to synchronize across devices, secure your profile, and activate social study tools.
              </p>
            </div>
            
            <button
              onClick={async () => {
                try {
                  const result = await signInWithPopup(auth, googleProvider);
                  const user = result.user;
                  
                  // Capture and store Google credentials
                  const credential = GoogleAuthProvider.credentialFromResult(result);
                  if (credential) {
                    console.log("[PAIRING] Storing settings Google credentials in sessionStorage...");
                    if (credential.idToken) sessionStorage.setItem('google_id_token', credential.idToken);
                    if (credential.accessToken) sessionStorage.setItem('google_access_token', credential.accessToken);
                  }
                  
                  // 1. Check if a cloud profile already exists for this Firebase UID
                  const cloudData = await loadUserFromFirestore(user.uid);
                  
                  let mergedState: UserState;
                  if (cloudData) {
                    // Merge local offline progress into existing cloud data
                    mergedState = mergeLocalAndCloudStates(userState, cloudData);
                  } else {
                    // No existing cloud profile, upload local state
                    mergedState = {
                      ...userState,
                      uid: user.uid,
                      email: user.email || undefined,
                      displayName: user.displayName || userState.displayName || user.email?.split('@')[0] || userState.username,
                      isOffline: false
                    };
                  }

                  // 2. Atomically reserve username and write user info
                  await registerUserProfileTransaction(user.uid, mergedState.username, mergedState);

                  onUpdateState(mergedState);
                  alert("Successfully linked to Google Account! Your progress is now merged and secure in the cloud.");
                } catch (err: any) {
                  console.error("Linking error:", err);
                  alert("Linking failed: " + err.message);
                }
              }}
              className="w-full sm:w-auto py-3 px-5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Link2 className="w-4 h-4" />
              <span>Link Google Account</span>
            </button>
          </div>
        )}

        {/* Standard Local Backups */}
        <div className="space-y-3 pt-2 border-t border-gray-800/60">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Manual State Import / Export</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <button
              onClick={handleExportData}
              className="py-3 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export Progress JSON</span>
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Import Progress JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportData}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 📱 Mobile Device Pairing Card (Option A) */}
      {userState.uid && !userState.isOffline && (
        <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              Pair Mobile/Android App (Option A)
            </h4>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
              Option A Active
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              If you have the StudyOS Android application or widget on your phone, you can link it to your profile here. Enter the 6-digit code shown on your mobile device to complete pairing immediately.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                maxLength={6}
                value={pairingInputCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setPairingInputCode(cleaned);
                  setPairingError(null);
                  setPairingSuccess(false);
                }}
                placeholder="Enter 6-digit code (e.g. 185834)"
                className="flex-1 px-4 py-3 bg-gray-950 border border-gray-800 focus:border-emerald-500 rounded-xl text-sm font-mono tracking-wider text-white placeholder-gray-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleManualPairingSubmit}
                disabled={pairingInputCode.length !== 6 || isPairingLoading}
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
              >
                {isPairingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pairing Device...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Pair Device</span>
                  </>
                )}
              </button>
            </div>

            {pairingError && (
              <p className="text-xs text-red-400 font-medium">{pairingError}</p>
            )}

            {pairingSuccess && (
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Device paired successfully! Your mobile device is now synchronized.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Backlog Subjects Selection */}
      {semester > 1 && (
        <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 space-y-4 animate-fade-in">
          <h4 className="text-xs font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-red-500" />
            Active Backlog Subjects
          </h4>
          <p className="text-xs text-gray-500">
            Select any subjects from previous semesters that you still need to clear. They will appear as active courses alongside your current semester.
          </p>
          
          <div className="space-y-4">
            {/* Group by academic year */}
            {(() => {
              const backlogSubjects = userState.backlogSubjects || [];
              const priorSemesters: { semester: number; subjects: any[] }[] = [];
              const uData = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
              const bData = uData[branch] || uData['CSE'];
              const sData = bData[scheme] || bData['2022 Scheme'];

              for (let semNum = 1; semNum < semester; semNum++) {
                let semSubjects: any[] = [];
                if ((semNum === 1 || semNum === 2) && firstYearCycle) {
                  semSubjects = getSubjectsForCycle(firstYearCycle, semNum);
                } else if (sData[semNum]) {
                  semSubjects = sData[semNum];
                }
                if (semSubjects.length > 0) {
                  priorSemesters.push({ semester: semNum, subjects: semSubjects });
                }
              }

              const years = [
                { name: 'First Year', semesters: [1, 2] },
                { name: 'Second Year', semesters: [3, 4] },
                { name: 'Third Year', semesters: [5, 6] },
                { name: 'Fourth Year', semesters: [7, 8] }
              ];
              
              const visibleYears = years.map(yr => {
                const semsInYr = priorSemesters.filter(ps => yr.semesters.includes(ps.semester));
                if (semsInYr.length === 0) return null;
                
                return (
                  <div key={yr.name} className="space-y-3 border-l border-gray-800 pl-4">
                    <h5 className="text-xs font-bold text-gray-400">{yr.name}</h5>
                    {semsInYr.map(ps => (
                      <div key={ps.semester} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Semester {ps.semester}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ps.subjects.map(sub => {
                            const isSelected = backlogSubjects.includes(sub.id);
                            return (
                              <label
                                key={sub.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                  isSelected
                                    ? 'bg-red-500/5 border-red-500/30 text-white'
                                    : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const updated = isSelected
                                      ? backlogSubjects.filter(id => id !== sub.id)
                                      : [...backlogSubjects, sub.id];
                                    onUpdateState({ backlogSubjects: updated });
                                  }}
                                  className="mt-0.5 rounded border-gray-800 bg-gray-950 text-red-500 focus:ring-red-500/20"
                                />
                                <div>
                                  <p className="font-semibold">{sub.name}</p>
                                  <p className="text-[9px] text-gray-500 mt-0.5 font-mono">{sub.id}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });

              const hasPrior = priorSemesters.length > 0;
              if (!hasPrior) {
                return (
                  <p className="text-xs text-gray-500 italic">No prior semester subjects available for this configuration.</p>
                );
              }
              return visibleYears;
            })()}
          </div>
        </div>
      )}

      {/* 4. ABOUT SYSTEM */}
      <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-6 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-white">Academic Companion</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Progress saving resides locally inside your browser's persistent state container. For feedback or inquiries, contact d.katageri360@gmail.com.
          </p>
        </div>
      </div>

    </div>
  );
}
