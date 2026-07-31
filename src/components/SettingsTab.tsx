import React, { useRef, useState } from 'react';
import { UserState } from '../types';
import AvatarRenderer from './AvatarRenderer';
import { 
  Download, 
  Upload, 
  Info, 
  Check, 
  BookOpen,
  LogOut, 
  Link2, 
  Sun, 
  Moon, 
  Archive, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  Clock, 
  Umbrella, 
  Music, 
  Zap, 
  Headphones, 
  X, 
  Bell
} from 'lucide-react';
import { COURSE_TEMPLATES } from '../data';
import { getSubjectsForCycle } from '../utils/cycleSubjects';
import { SoundManager } from '../utils/soundManager';
import { NotificationManager } from '../utils/notificationManager';
import { auth, googleProvider, loadUserFromFirestore, mergeLocalAndCloudStates, registerUserProfileTransaction } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface SettingsTabProps {
  userState: UserState;
  onImportState: (imported: UserState) => void;
  onUpdateState: (newState: Partial<UserState>) => void;
  onLogout?: () => void;
  onOpenStudyCalendar?: () => void;
}

export default function SettingsTab({ 
  userState, 
  onImportState, 
  onUpdateState, 
  onLogout, 
  onOpenStudyCalendar 
}: SettingsTabProps) {
  const { university, branch, scheme, semester, firstYearCycle } = userState;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const notifStudy = userState.dailyReminderEnabled ?? true;
  const notifStreak = userState.streakAlertsEnabled ?? true;
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  // Interactive UI expansion states
  const [showFocusGoalModal, setShowFocusGoalModal] = useState(false);
  const [showArchivedSemesters, setShowArchivedSemesters] = useState(false);
  const [showBacklogSelector, setShowBacklogSelector] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // 1. Export Progress JSON file download
  const handleExportData = () => {
    const dataStr = JSON.stringify(userState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyos-progress-${(userState.username || 'student').toLowerCase()}.json`;
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
        if (typeof parsed.username === 'string' && typeof parsed.xp === 'number' && typeof parsed.level === 'number') {
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

  // Helper for backlog subject names list
  const getBacklogSubjectNames = () => {
    const backlogIds = userState.backlogSubjects || [];
    if (backlogIds.length === 0) return ['Maths', 'Python', 'Chemistry', 'AI', 'FECE'];
    
    const names: string[] = [];
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
      for (const sub of semSubjects) {
        if (backlogIds.includes(sub.id)) {
          // Shorten long course names for tag pills
          const shortName = sub.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
          names.push(shortName || sub.id);
        }
      }
    }
    return names.length > 0 ? names : ['Maths', 'Python', 'Chemistry', 'AI', 'FECE'];
  };

  const focusGoalMin = userState.dailyFocusGoal || 30;

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans pb-20 text-gray-100">
      
      {/* HEADER */}
      <div className="space-y-1 pt-2">
        <h2 className="text-2xl font-black text-white tracking-tight">Settings</h2>
        <p className="text-xs font-medium text-gray-500">Preferences · Notifications · Sync</p>
      </div>

      {showImportSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>StudyOS state imported successfully! Welcome back to your learning quest!</span>
        </div>
      )}

      {/* 1. ACCOUNT SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          ACCOUNT
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                <AvatarRenderer avatar={userState.avatar} className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-black text-white truncate">
                  {userState.displayName || userState.username || "A KK1"}
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  {userState.uid ? 'Google' : 'Local'} · {university || 'VTU'} - {branch || 'ISE'} - Sem {semester || 3}
                </p>
              </div>
            </div>

            {/* Sync Badge */}
            <div className="shrink-0">
              {userState.uid && !userState.isOffline ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Local
                </span>
              )}
            </div>
          </div>

          {/* Account Action Button */}
          {userState.uid && !userState.isOffline ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut(auth);
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
              className="w-full py-2.5 px-4 bg-transparent border border-gray-700/80 hover:border-gray-600 hover:bg-white/5 text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
              <span>Log out of StudyOS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await signInWithPopup(auth, googleProvider);
                  const user = result.user;
                  const cloudData = await loadUserFromFirestore(user.uid);
                  let mergedState: UserState;
                  if (cloudData) {
                    mergedState = mergeLocalAndCloudStates(userState, cloudData);
                  } else {
                    mergedState = {
                      ...userState,
                      uid: user.uid,
                      email: user.email || undefined,
                      displayName: user.displayName || userState.displayName || user.email?.split('@')[0] || userState.username,
                      isOffline: false
                    };
                  }
                  await registerUserProfileTransaction(user.uid, mergedState.username, mergedState);
                  onUpdateState(mergedState);
                } catch (err: any) {
                  alert("Linking failed: " + err.message);
                }
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Link2 className="w-4 h-4" />
              <span>Link Google Account</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. APPEARANCE SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          APPEARANCE
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3">
            {/* Dark Theme */}
            <button
              type="button"
              onClick={() => onUpdateState({ themeMode: 'dark' })}
              className={`p-3.5 sm:p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                (userState?.themeMode || 'dark') === 'dark'
                  ? 'bg-purple-950/40 border-purple-500/80 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30'
                  : 'bg-[#0E1118] border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <Moon className={`w-5 h-5 ${
                (userState?.themeMode || 'dark') === 'dark' ? 'text-amber-400' : 'text-gray-500'
              }`} />
              <div>
                <p className="text-xs font-bold text-white">Dark</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Midnight Indigo</p>
              </div>
            </button>

            {/* Light Theme */}
            <button
              type="button"
              onClick={() => onUpdateState({ themeMode: 'light' })}
              className={`p-3.5 sm:p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                userState?.themeMode === 'light'
                  ? 'bg-amber-950/40 border-amber-500/80 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                  : 'bg-[#0E1118] border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <Sun className={`w-5 h-5 ${
                userState?.themeMode === 'light' ? 'text-amber-400' : 'text-gray-500'
              }`} />
              <div>
                <p className="text-xs font-bold text-white">Light</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">High contrast</p>
              </div>
            </button>

            {/* OLED Theme */}
            <button
              type="button"
              onClick={() => onUpdateState({ themeMode: 'oled' })}
              className={`p-3.5 sm:p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                userState?.themeMode === 'oled'
                  ? 'bg-gray-900 border-gray-600 text-white ring-1 ring-white/20'
                  : 'bg-[#0E1118] border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <div className={`w-5 h-5 rounded border ${
                userState?.themeMode === 'oled' ? 'border-gray-300 bg-black' : 'border-gray-600 bg-gray-900'
              }`} />
              <div>
                <p className="text-xs font-bold text-white">OLED</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Pure #000000</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. LEARNING SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          LEARNING
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-2 sm:p-3 divide-y divide-gray-800/60">
          
          {/* Study Calendar */}
          <div 
            onClick={onOpenStudyCalendar}
            className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                  Study calendar
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Semester dates · vacation mode
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
            </div>
          </div>

          {/* Daily Focus Goal */}
          <div className="space-y-2">
            <div 
              onClick={() => setShowFocusGoalModal(!showFocusGoalModal)}
              className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                    Daily focus goal
                  </h4>
                  <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                    Currently {focusGoalMin} minutes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {focusGoalMin} min
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${showFocusGoalModal ? 'rotate-90 text-amber-400' : ''}`} />
              </div>
            </div>

            {/* Inline Focus Goal Selector */}
            {showFocusGoalModal && (
              <div className="mx-3 my-2 p-3 bg-[#0B0E14] border border-amber-500/20 rounded-xl space-y-2">
                <p className="text-xs text-gray-400 font-semibold">Select Daily Study Goal:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        onUpdateState({ dailyFocusGoal: mins });
                        setShowFocusGoalModal(false);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        focusGoalMin === mins
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Semester Break Mode */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Umbrella className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Semester break mode
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Freeze streak during holidays
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateState({ semesterBreakMode: !userState.semesterBreakMode })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                userState.semesterBreakMode ? 'bg-cyan-500' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                userState.semesterBreakMode ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Archived Semesters */}
          <div className="space-y-2">
            <div 
              onClick={() => setShowArchivedSemesters(!showArchivedSemesters)}
              className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                    Archived semesters
                  </h4>
                  <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                    {semester > 1 ? `${semester - 1} previous semester` : '1 previous semester'} · revision scope
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {semester > 1 ? semester - 1 : 1}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${showArchivedSemesters ? 'rotate-90 text-purple-400' : ''}`} />
              </div>
            </div>

            {/* Expanded Archived Semesters Selector */}
            {showArchivedSemesters && (
              <div className="mx-3 my-2 p-3.5 bg-[#0B0E14] border border-purple-500/20 rounded-xl space-y-3">
                <p className="text-xs text-gray-300 font-semibold">Include Past Semesters in Spaced Repetition:</p>
                {semester > 1 ? (
                  <div className="space-y-2">
                    {Array.from({ length: semester - 1 }, (_, i) => i + 1).map((semNum) => {
                      const isSelected = (userState.includedReviewSemesters || []).includes(semNum);
                      return (
                        <button
                          key={`archived-${semNum}`}
                          type="button"
                          onClick={() => {
                            const current = userState.includedReviewSemesters || [];
                            const updated = isSelected
                              ? current.filter((s) => s !== semNum)
                              : [...current, semNum];
                            onUpdateState({ includedReviewSemesters: updated });
                          }}
                          className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                            isSelected
                              ? 'bg-purple-950/40 border-purple-500/60 text-white'
                              : 'bg-white/5 border-gray-800 text-gray-400'
                          }`}
                        >
                          <span className="font-bold">Semester {semNum}</span>
                          {isSelected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-gray-600" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Semester 1 active. Past semester review queues will be archived here when you advance.</p>
                )}
              </div>
            )}
          </div>

          {/* Active Backlog Subjects */}
          <div className="space-y-3 pt-1">
            <div 
              onClick={() => setShowBacklogSelector(!showBacklogSelector)}
              className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                    Active backlog subjects
                  </h4>
                  <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                    Sem 1 subjects shown alongside Sem {semester || 3}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {(userState.backlogSubjects || []).length || 5}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${showBacklogSelector ? 'rotate-90 text-amber-400' : ''}`} />
              </div>
            </div>

            {/* Tag Pills Section matching screenshot */}
            <div className="px-3 pb-2 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                SEM 1 · INCLUDED
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {getBacklogSubjectNames().slice(0, 5).map((subjectTag, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      idx === 4
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-purple-950/40 text-purple-200 border-purple-500/40'
                    }`}
                  >
                    {subjectTag}
                  </span>
                ))}
              </div>
            </div>

            {/* Backlog Subject Selection Drawer */}
            {showBacklogSelector && (
              <div className="mx-3 mb-2 p-3.5 bg-[#0B0E14] border border-amber-500/20 rounded-xl space-y-2">
                <p className="text-xs text-gray-300 font-semibold">Toggle Backlog Courses:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(() => {
                    const backlogSubjects = userState.backlogSubjects || [];
                    const priorSemesters: any[] = [];
                    const uData = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
                    const bData = uData[branch] || uData['CSE'];
                    const sData = bData[scheme] || bData['2022 Scheme'];

                    for (let semNum = 1; semNum < Math.max(semester, 2); semNum++) {
                      let semSubjects: any[] = [];
                      if ((semNum === 1 || semNum === 2) && firstYearCycle) {
                        semSubjects = getSubjectsForCycle(firstYearCycle, semNum);
                      } else if (sData[semNum]) {
                        semSubjects = sData[semNum];
                      }
                      priorSemesters.push(...semSubjects);
                    }

                    return priorSemesters.map((sub) => {
                      const isSelected = backlogSubjects.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-500/40 text-white'
                              : 'bg-white/5 border-gray-800 text-gray-400'
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
                            className="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500/20"
                          />
                          <span className="font-medium truncate">{sub.name}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 4. NOTIFICATIONS SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          NOTIFICATIONS
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-2 sm:p-3 divide-y divide-gray-800/60">
          
          {/* Morning study nudge */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Morning study nudge
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  {userState.dailyReminderTime || '9:00 AM'} · 1st reminder
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateState({ dailyReminderEnabled: !notifStudy })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                notifStudy ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notifStudy ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Evening streak protection */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-950/80 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Evening streak protection
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  8:00 PM · if not studied yet
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateState({ streakAlertsEnabled: !notifStreak })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                notifStreak ? 'bg-orange-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                notifStreak ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Send test notification */}
          <div 
            onClick={async () => {
              const sent = await NotificationManager.sendTestNotification(userState.streak || 1);
              if (sent) {
                setTestNotifSent(true);
                setTimeout(() => setTestNotifSent(false), 4000);
              }
            }}
            className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-gray-300 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                  Send test notification
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  {testNotifSent ? 'Sent Test Alert! 🔔' : 'Verify alerts on this device'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          </div>

        </div>
      </div>

      {/* 5. SOUND & HAPTICS SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          SOUND &amp; HAPTICS
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-2 sm:p-3 divide-y divide-gray-800/60">
          
          {/* Sound effects */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Sound effects
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  XP pops · level up · chimes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !(userState.soundEffectsEnabled ?? true);
                onUpdateState({ soundEffectsEnabled: nextVal });
                if (nextVal) {
                  SoundManager.play('click');
                  SoundManager.vibrate('light');
                }
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                (userState.soundEffectsEnabled ?? true) ? 'bg-emerald-500' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                (userState.soundEffectsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Haptic vibration */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Haptic vibration
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Tactile feedback on mobile
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !(userState.hapticFeedbackEnabled ?? true);
                onUpdateState({ hapticFeedbackEnabled: nextVal });
                if (nextVal) {
                  SoundManager.vibrate('medium');
                }
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                (userState.hapticFeedbackEnabled ?? true) ? 'bg-cyan-500' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                (userState.hapticFeedbackEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Immersive focus sounds */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-gray-300 shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Immersive focus sounds
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Ambient audio during sessions
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !userState.soundFocusModeEnabled;
                onUpdateState({ soundFocusModeEnabled: nextVal });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                userState.soundFocusModeEnabled ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                userState.soundFocusModeEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">Volume</span>
              <span className="text-xs font-black text-purple-400 font-mono">
                {userState.soundVolume ?? 98}%
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={userState.soundVolume ?? 98}
                onChange={(e) => onUpdateState({ soundVolume: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 6. DATA SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          DATA
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-2 sm:p-3 divide-y divide-gray-800/60">
          
          {/* Export progress */}
          <div 
            onClick={handleExportData}
            className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                  Export progress
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Download JSON backup
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          </div>

          {/* Import progress */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                  Import progress
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Restore from JSON backup
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportData}
            accept=".json"
            className="hidden"
          />

        </div>
      </div>

      {/* 8. ABOUT SECTION */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 font-mono pl-1">
          ABOUT
        </h3>
        <div className="bg-[#121622] border border-white/10 rounded-2xl p-2 sm:p-3">
          
          {/* Academic companion */}
          <div 
            onClick={() => setShowAboutModal(true)}
            className="p-3.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-gray-300 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                  Academic companion
                </h4>
                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                  Feedback · version info
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          </div>

        </div>
      </div>

      {/* About / Version Info Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
                OS
              </div>
              <div>
                <h3 className="text-base font-bold text-white">StudyOS Companion</h3>
                <p className="text-xs text-gray-400">Version 2.4.0 (Build 2026)</p>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              StudyOS is your intelligent, syllabus-tailored study companion designed for VTU, engineering, and higher education students.
            </p>
            <div className="pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 space-y-1 font-mono">
              <p>Developer Contact: d.katageri360@gmail.com</p>
              <p>Platform: Web &amp; Android PWA</p>
            </div>
            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
