import React, { useState, useEffect, useRef } from 'react';
import { UserState, Subject, Topic, Revision } from './types';
import { getTemplateSubjects, COURSE_TEMPLATES, findTopicById } from './data';
import { Home, ListCollapse, BarChart3, Users, User, Settings, Flame, ShieldAlert, Sparkles, Clock, X, Calendar, AlertCircle, Plus, Smartphone, Check, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import AuthPopupScreen from './components/AuthPopupScreen';
import Header from './components/Header';
import HomeTab from './components/HomeTab';
import ProgressionTab from './components/ProgressionTab';
import ProgressTab from './components/ProgressTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import FriendsTab from './components/FriendsTab';
import TopicViewModal from './components/TopicViewModal';
import CompletionAnimations from './components/CompletionAnimations';
import BadgeUnlockModal from './components/BadgeUnlockModal';
import { getUnlockedAchievementIds, ACHIEVEMENT_DEFS } from './utils/achievements';
import { auth, syncUserToFirestore, triggerSocialMilestone, loadUserFromFirestore, registerUserProfileTransaction, subscribeFriendRequests, subscribeNotifications, linkDeviceWithAccount } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getSubjectsForCycle } from './utils/cycleSubjects';
import { SoundManager } from './utils/soundManager';
import { getLocalDateString } from './utils/dateUtils';
import { getLevelAndProgress, getDifficultyConfig, getSubjectDifficulty } from './utils/xpUtils';

// New Study Habit Components
import { StudyCalendar } from './components/StudyCalendar';
import { FocusTimer } from './components/FocusTimer';

const LOCAL_STORAGE_KEY = 'studyos-user-state';

// Helper to calculate user subjects outside render so both state savers and hooks can access it
function getUserSubjects(state: UserState) {
  if (!state) return { activeSubjects: [], backlogSubjects: [] };
  const { university = 'VTU', branch = 'CSE', scheme = '2022 Scheme', semester = 1, backlogSubjects = [] } = state;
  
  const activeSubjects = getTemplateSubjects(university || 'VTU', branch || 'CSE', scheme || '2022 Scheme', semester || 1);

  const backlogSubjectsList: Subject[] = [];
  const uData = COURSE_TEMPLATES[university || 'VTU'] || COURSE_TEMPLATES['VTU'];
  const bData = uData[branch || 'CSE'] || uData['CSE'];
  const sData = bData[scheme || '2022 Scheme'] || bData['2022 Scheme'];

  for (let semNum = 1; semNum < (semester || 1); semNum++) {
    let priorSubjects: Subject[] = [];
    if (semNum === 1 || semNum === 2) {
      priorSubjects = getTemplateSubjects(university || 'VTU', branch || 'CSE', scheme || '2022 Scheme', semNum);
    } else if (sData[semNum]) {
      priorSubjects = sData[semNum];
    }

    priorSubjects.forEach((sub) => {
      if (backlogSubjects && Array.isArray(backlogSubjects) && backlogSubjects.includes(sub.id)) {
        backlogSubjectsList.push(sub);
      }
    });
  }

  return { activeSubjects, backlogSubjects: backlogSubjectsList };
}

export default function App() {
  const [userState, setUserStateInternal] = useState<UserState | null>(null);

  const setUserState = (state: UserState | null | ((prev: UserState | null) => UserState | null)) => {
    setUserStateInternal((prev) => {
      const resolved = typeof state === 'function' ? state(prev) : state;
      if (resolved) {
        const validTabs = ['home', 'progression', 'progress', 'friends', 'profile', 'settings'];
        if (!resolved.activeTab || !validTabs.includes(resolved.activeTab)) {
          return { ...resolved, activeTab: 'home' };
        }
      }
      return resolved;
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoad = useRef(true);

  // Keep a ref of userState to prevent stale closure bugs in persistent handlers like onAuthStateChanged
  const userStateRef = useRef(userState);
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);

  // Modal topic states
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  
  // Animation overlays
  const [celebrationType, setCelebrationType] = useState<'topic' | 'module' | 'semester' | null>(null);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    xpEarned: number;
    moduleName: string;
    moduleProgress: number;
  } | null>(null);

  // Badge state
  const [unlockedBadge, setUnlockedBadge] = useState<{
    id: string;
    title: string;
    description: string;
    icon: string;
  } | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // Focus and Study Habit states
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [isStudyCalendarOpen, setIsStudyCalendarOpen] = useState(false);
  const [isMinimizedFocusTimer, setIsMinimizedFocusTimer] = useState(true);
  const [showOnboardingCalendarPrompt, setShowOnboardingCalendarPrompt] = useState(false);
  const [focusTimerTopicName, setFocusTimerTopicName] = useState<string>('');

  // Reminders & Notification system states
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; title: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  // Device Pairing State (Option A)
  const [pendingPairCode, setPendingPairCode] = useState<string | null>(null);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);

  // Read pair_code from URL parameters on initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('pair_code');
    if (code) {
      // Save it to localStorage as a backup so it automatically prompts them after login/onboarding
      localStorage.setItem('pending_pair_code', code);
      setPendingPairCode(code);
      setIsPairingModalOpen(true);
      
      // Clean up the URL parameter to maintain a clean address bar
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]pair_code=[^&]+/, '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Monitor user state transitions to automatically trigger pending pairing codes
  useEffect(() => {
    if (userState && userState.uid && !pairingSuccess && !isPairingLoading) {
      const savedCode = localStorage.getItem('pending_pair_code') || pendingPairCode;
      if (savedCode) {
        setPendingPairCode(savedCode);
        localStorage.removeItem('pending_pair_code');
        
        // AUTOMATIC SILENT LINKING FLOW - Completely bypasses manual click confirmations!
        const autoSilentPair = async () => {
          setIsPairingLoading(true);
          try {
            await linkDeviceWithAccount(savedCode, userState.uid, userState);
            setPairingSuccess(true);
            setToast({
              title: "📱 Google Login Synced!",
              message: "Your mobile device has been linked successfully.",
              type: "success"
            });
            setTimeout(() => {
              setIsPairingModalOpen(false);
              setPendingPairCode(null);
              setPairingSuccess(false);
            }, 5000);
          } catch (err: any) {
            console.error("Auto silent pairing failed:", err);
          } finally {
            setIsPairingLoading(false);
          }
        };
        autoSilentPair();
      }
    }
  }, [userState, pendingPairCode, pairingSuccess, isPairingLoading]);

  // Auto-redirect back to native app when successfully paired in browser
  useEffect(() => {
    if (pendingPairCode && userState && userState.uid) {
      const redirectTimer = setTimeout(() => {
        window.location.href = "com.studyos.app://";
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [pendingPairCode, userState]);

  // Semester manual transition states
  const [isSemTransitionOpen, setIsSemTransitionOpen] = useState(false);
  const [semTransitionStep, setSemTransitionStep] = useState<1 | 2 | 3>(1);
  const [selectedTransitionBacklogs, setSelectedTransitionBacklogs] = useState<string[]>([]);

  // Confirm and link pairing request (Option A)
  const handleConfirmPairing = async () => {
    if (!pendingPairCode || !userState) return;
    setIsPairingLoading(true);
    try {
      await linkDeviceWithAccount(pendingPairCode, userState.uid, userState);
      setPairingSuccess(true);
      setToast({
        title: "📱 Pairing Successful!",
        message: "Your mobile device has been linked successfully. It will automatically log in shortly.",
        type: "success"
      });
      setTimeout(() => {
        setIsPairingModalOpen(false);
        setPendingPairCode(null);
        setPairingSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("Pairing confirmation failed:", err);
      setToast({
        title: "Pairing Failed",
        message: err.message || "Failed to sync account link. Please try again.",
        type: "error"
      });
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleTriggerSemesterTransition = () => {
    if (!userState) return;
    if (userState.semester >= 8) {
      setToast({
        title: "🎓 Ultimate Completion!",
        message: "You are already in Semester 8! Excellent work on reaching the final semester of your Engineering Journey.",
        type: "success"
      });
      return;
    }

    // Determine if there are unfinished active subjects in the current active semester
    const { activeSubjects } = getUserSubjects(userState);
    const unfinished = activeSubjects.filter(sub => {
      let total = 0;
      let completed = 0;
      for (const mod of sub.modules) {
        total += mod.topics.length;
        completed += mod.topics.filter(t => userState.completedTopics.includes(t.id)).length;
      }
      return total > 0 && completed < total;
    });

    if (unfinished.length > 0) {
      setSemTransitionStep(1);
    } else {
      setSemTransitionStep(2);
    }
    setSelectedTransitionBacklogs([]);
    setIsSemTransitionOpen(true);
  };

  const handleCompleteTransition = (passed: boolean) => {
    if (!userState) return;
    const currentSem = userState.semester;
    const nextSem = currentSem + 1;

    let updatedBacklogs = [...(userState.backlogSubjects || [])];

    if (passed) {
      // If they officially passed, they don't have backlogs from this semester.
    } else {
      // Add selected backlogs
      selectedTransitionBacklogs.forEach(id => {
        if (!updatedBacklogs.includes(id)) {
          updatedBacklogs.push(id);
        }
      });
    }

    const updatedCompletedSemesters = [...(userState.completedSemesters || [])];
    if (!updatedCompletedSemesters.includes(currentSem)) {
      updatedCompletedSemesters.push(currentSem);
    }

    const updatedState: UserState = {
      ...userState,
      semester: nextSem,
      completedSemesters: updatedCompletedSemesters,
      backlogSubjects: updatedBacklogs,
    };

    saveState(updatedState);
    setIsSemTransitionOpen(false);

    setToast({
      title: `🎓 Welcome to Semester ${nextSem}!`,
      message: passed 
        ? `You successfully advanced! Unfinished subjects from Semester ${currentSem} are archived in Optional Learning.`
        : `You advanced to Semester ${nextSem} with ${selectedTransitionBacklogs.length} active backlog subjects.`,
      type: "success"
    });

    // Stagger celebration!
    setCelebrationType('semester');
    setCelebrationDetails({
      xpEarned: 1000,
      moduleName: `Semester ${currentSem} Complete`,
      moduleProgress: 100,
    });
    SoundManager.play('semester_complete');
    SoundManager.vibrate('longSuccess');
  };

  // 1. Unified Initial State Load and Firebase Auth Listener
  useEffect(() => {
    let authUnsubscribed = false;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (authUnsubscribed) return;

      // Access latest userState from ref to safely check logged-in status
      const currentState = userStateRef.current;
      const isSameUser = currentState && firebaseUser && currentState.uid === firebaseUser.uid;

      // If the current state UID already matches the incoming firebaseUser UID, ignore redundant triggers
      // to prevent race conditions during onboarding and username selection.
      if (isSameUser) {
        return;
      }

      // Transition into a clean loading/pending state only during the very first page load/initial boot
      if (isFirstLoad.current) {
        setIsLoading(true);
        isFirstLoad.current = false;
      }

      try {
        if (firebaseUser) {
          // Returning authenticated user
          let cloudData = null;
          let dbErrorHappened = false;
          try {
            cloudData = await loadUserFromFirestore(firebaseUser.uid);
          } catch (dbErr) {
            console.error("Database connection failed on startup, falling back to local storage:", dbErr);
            dbErrorHappened = true;
          }

          if (cloudData && cloudData.onboarded) {
            const merged: UserState = {
              ...cloudData,
              uid: firebaseUser.uid,
              email: firebaseUser.email || undefined,
              displayName: firebaseUser.displayName || cloudData.displayName || undefined,
              isOffline: false,
            };
            setUserState(merged);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } else {
            // Authenticated but no cloud profile yet or database is unreachable
            const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
            let local = cached ? JSON.parse(cached) : null;
            // CRITICAL SECURITY & AUTHENTICATION FIX: Only restore local storage state if the cached UID matches the current Google user ID.
            // This prevents a new account from being hijacked and populated with the previous account's local cache.
            if (local && local.username && local.uid === firebaseUser.uid) {
              const updatedLocal: UserState = {
                ...local,
                uid: firebaseUser.uid,
                email: firebaseUser.email || undefined,
                displayName: firebaseUser.displayName || local.displayName || undefined,
                isOffline: dbErrorHappened || local.isOffline === true,
              };
              setUserState(updatedLocal);
            } else {
              // Create a clean new state for this newly signed-in user
              setUserState({
                uid: firebaseUser.uid,
                email: firebaseUser.email || undefined,
                displayName: firebaseUser.displayName || undefined,
                isOffline: dbErrorHappened,
                onboarded: false,
              } as UserState);
            }
          }
        } else {
          // No active Firebase user
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.isOffline || parsed.onboarded) {
                // If the profile in cache has a uid and isOffline is false, but firebaseUser is null,
                // it means their Firebase session expired/logged out!
                // In that case, we should NOT automatically sign them in. We should ask them to log in again.
                if (!parsed.isOffline && parsed.uid) {
                  setUserState(null);
                  localStorage.removeItem(LOCAL_STORAGE_KEY);
                } else {
                  if (!parsed.inProgressTopics) {
                    parsed.inProgressTopics = [];
                  }
                  setUserState(parsed);
                }
              } else {
                setUserState(null);
              }
            } catch (pErr) {
              setUserState(null);
            }
          } else {
            setUserState(null);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      authUnsubscribed = true;
      unsubscribe();
    };
  }, []);

  // 1c. Real-time synchronisation of UserState to Firestore with debouncing
  useEffect(() => {
    if (userState && userState.uid && userState.onboarded) {
      const timer = setTimeout(() => {
        syncUserToFirestore(userState.uid!, userState).catch(err => {
          console.error("Real-time cloud synchronization error:", err);
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [userState]);

  // 1cc. Synchronize SoundManager settings with the userState configurations
  useEffect(() => {
    if (userState) {
      SoundManager.updateSettings({
        soundEffectsEnabled: userState.soundEffectsEnabled ?? true,
        hapticFeedbackEnabled: userState.hapticFeedbackEnabled ?? true,
        soundVolume: userState.soundVolume ?? 70,
        soundFocusModeEnabled: userState.soundFocusModeEnabled ?? false,
      });
    }
  }, [
    userState?.soundEffectsEnabled,
    userState?.hapticFeedbackEnabled,
    userState?.soundVolume,
    userState?.soundFocusModeEnabled
  ]);

  // 1d. Subscribe to notification status globally to control the notification bell active dot
  useEffect(() => {
    if (!userState || !userState.uid) {
      setHasPendingRequests(false);
      setHasUnreadNotifs(false);
      return;
    }

    const unsubRequests = subscribeFriendRequests(userState.uid, (requests) => {
      setHasPendingRequests(requests.length > 0);
    });

    const unsubNotifications = subscribeNotifications(userState.uid, (notifs) => {
      setHasUnreadNotifs(notifs.some(n => !n.read));
    });

    return () => {
      unsubRequests();
      unsubNotifications();
    };
  }, [userState?.uid]);

  // Trigger Streak Danger Modal Pop-up once per browser session
  useEffect(() => {
    if (userState && userState.onboarded && userState.streak > 0) {
      const todayStr = getLocalDateString();
      const studiedToday = userState.studyActivity && userState.studyActivity[todayStr] > 0;
      const alreadyAlerted = sessionStorage.getItem('studyos-streak-alerted');
      
      if (!studiedToday && !alreadyAlerted) {
        const timer = setTimeout(() => {
          setShowStreakModal(true);
          sessionStorage.setItem('studyos-streak-alerted', 'true');
        }, 1500); // Elegant delay after boot
        return () => clearTimeout(timer);
      }
    }
  }, [userState?.onboarded]);

  // Post-onboarding Study Calendar prompt listener
  useEffect(() => {
    if (userState && userState.onboarded) {
      const wasJustOnboarded = sessionStorage.getItem('just_onboarded') === 'true';
      if (wasJustOnboarded) {
        sessionStorage.removeItem('just_onboarded');
        setShowOnboardingCalendarPrompt(true);
      }
    }
  }, [userState?.onboarded]);

  // Academic Study Streak Catch-Up & Study Shield consumption
  useEffect(() => {
    if (!userState || !userState.onboarded) return;

    const todayStr = getLocalDateString(); // YYYY-MM-DD
    const lastFocusStr = userState.lastFocusDate;

    // Initialize lastFocusDate if null to start tracking fresh from today
    if (!lastFocusStr) {
      handleUpdateState({ 
        lastFocusDate: todayStr,
        todayFocusMinutes: 0,
        todayFocusXPRewarded: 0
      });
      return;
    }

    if (lastFocusStr === todayStr) {
      return; // Already processed up to today
    }

    // Since lastFocusStr !== todayStr, it is a brand new day!
    // Prepare our default updates for the new day: reset daily focus tracking
    const dailyResetUpdates: Partial<UserState> = {
      lastFocusDate: todayStr,
      todayFocusMinutes: 0,
      todayFocusXPRewarded: 0
    };

    const lastFocusDate = new Date(lastFocusStr);
    const todayDate = new Date(todayStr);

    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);

    // If lastFocusDate is before yesterday, then we have potential missed days to process
    if (lastFocusDate < yesterdayDate) {
      const missedDates: string[] = [];
      let currentIterDate = new Date(lastFocusDate);
      currentIterDate.setDate(currentIterDate.getDate() + 1);

      while (currentIterDate < todayDate) {
        // Build YYYY-MM-DD string for missed dates
        const year = currentIterDate.getFullYear();
        const month = String(currentIterDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentIterDate.getDate()).padStart(2, '0');
        missedDates.push(`${year}-${month}-${day}`);
        currentIterDate.setDate(currentIterDate.getDate() + 1);
      }

      if (missedDates.length > 0) {
        let shieldsRemaining = userState.studyShields ?? 3;
        let academicStreak = userState.academicStudyStreak ?? 0;
        let shieldsConsumedCount = 0;
        let streakBroken = false;

        for (const dateStr of missedDates) {
          // 1. Check Semester dates boundary
          if (userState.semesterStartDate && userState.semesterEndDate) {
            if (dateStr < userState.semesterStartDate || dateStr > userState.semesterEndDate) {
              continue; // outside semester boundary, ignore
            }
          }

          // 2. Check Semester Breaks
          const isSemesterBreak = (userState.semesterBreaks || []).some((b: any) => {
            return dateStr >= b.startDate && dateStr <= b.endDate;
          });
          if (isSemesterBreak) {
            continue;
          }

          // 3. Check Vacation Mode
          const isVacation = !!(userState.vacationMode?.active && 
            userState.vacationMode?.startDate && 
            userState.vacationMode?.endDate && 
            dateStr >= userState.vacationMode.startDate && 
            dateStr <= userState.vacationMode.endDate);
          if (isVacation) {
            continue;
          }

          // 3.5 Check Semester Break Mode
          if (userState.semesterBreakMode) {
            continue;
          }

          // 4. Check Study Schedule
          const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
          const isStudyDay = (userState.weeklyStudySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).includes(dayOfWeek);
          if (!isStudyDay) {
            continue;
          }

          // 5. Check if goal met (either through Focus Timer or manually completing Topics/Revisions)
          const focusMinsOnDay = (userState.focusHistory || {})[dateStr] || 0;
          const completedActivityOnDay = (userState.studyActivity || {})[dateStr] || 0;
          const goalMet = focusMinsOnDay >= (userState.dailyFocusGoal ?? 30) || completedActivityOnDay > 0;

          if (!goalMet) {
            if (shieldsRemaining > 0) {
              shieldsRemaining -= 1;
              shieldsConsumedCount += 1;
            } else {
              academicStreak = 0;
              streakBroken = true;
            }
          }
        }

        // Apply missed day streak changes to our update object
        dailyResetUpdates.studyShields = shieldsRemaining;
        dailyResetUpdates.academicStudyStreak = academicStreak;
        dailyResetUpdates.streak = academicStreak;

        if (streakBroken) {
          setToast({
            title: "💔 Focus Streak Reset",
            message: "You missed a study day and had no Study Shields left. Your focus streak has reset.",
            type: "error"
          });
        } else if (shieldsConsumedCount > 0) {
          setToast({
            title: "🛡️ Study Shield Consumed",
            message: `Streak protected! Consumed ${shieldsConsumedCount} shield(s). Remaining: ${shieldsRemaining}`,
            type: "info"
          });
        }
      }
    }

    // Commit state with both the new-day reset and any calculated streak/shield state updates
    handleUpdateState(dailyResetUpdates);
  }, [userState?.onboarded]);

  // Toast notification auto-dismiss timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 2. State Persistent Save Trigger with Automatic Badge Unlock Detection
  const saveState = (updated: UserState) => {
    if (userState && userState.onboarded && updated && updated.onboarded) {
      const { activeSubjects, backlogSubjects } = getUserSubjects(userState);
      const prevIds = getUnlockedAchievementIds(userState, activeSubjects, backlogSubjects);
      const nextIds = getUnlockedAchievementIds(updated, activeSubjects, backlogSubjects);
      const newlyUnlockedId = nextIds.find(id => !prevIds.includes(id));
      
      if (newlyUnlockedId) {
        const foundDef = ACHIEVEMENT_DEFS.find(def => def.id === newlyUnlockedId);
        if (foundDef) {
          setUnlockedBadge(foundDef);
          setIsBadgeModalOpen(true);
        }
      }
    }
    setUserState(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // Check if we are the dedicated authentication helper popup window
  const isAuthPopup = typeof window !== 'undefined' && window.location.search.includes('auth_popup=true');
  if (isAuthPopup) {
    return <AuthPopupScreen />;
  }

  // If we are currently completing an automatic silent device pairing from Google Login
  if (pendingPairCode && userState && userState.uid) {
    return (
      <div className="min-h-screen bg-[#060809] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0D1115] border border-gray-800 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Check className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight font-display">Google Sign-In Successful!</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              You have successfully signed in with your Google Account <span className="text-blue-400 font-mono">({userState.email})</span>.
            </p>
          </div>

          <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-3">
            <p className="text-xs text-blue-300 font-medium">
              We have completed the secure connection on your mobile device.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Syncing login state...</span>
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <a
              href="com.studyos.app://"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open StudyOS App</span>
            </a>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              If the app doesn't open automatically, click the button above or manually return to the StudyOS app on your phone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0C0F12] flex items-center justify-center text-gray-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Booting StudyOS...</span>
        </div>
      </div>
    );
  }

  // If no state or no username, show the AuthScreen first
  if (!userState || !userState.username) {
    return (
      <AuthScreen
        initialUser={userState}
        onAuthComplete={(authData) => {
          if (authData.onboarded && authData.fullState) {
            setUserState(authData.fullState);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authData.fullState));
            return;
          }
          const initialUserState: Partial<UserState> = {
            uid: authData.uid,
            email: authData.email,
            displayName: authData.displayName,
            isOffline: authData.isOffline,
            username: authData.username,
            onboarded: false,
          };
          setUserState(initialUserState as UserState);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialUserState));
        }}
      />
    );
  }

  // If authenticated but not onboarded, display the onboarding page
  if (!userState.onboarded) {
    return (
      <Onboarding 
        partialState={userState} 
        onComplete={async (newState) => {
          sessionStorage.setItem('just_onboarded', 'true');
          if (!newState.isOffline && newState.uid) {
            try {
              // Atomically register username and profile in Firestore separate collections
              await registerUserProfileTransaction(newState.uid, newState.username, newState);
            } catch (err: any) {
              console.error("Cloud registration failed. Proceeding with Offline-Fallback to avoid blocking the user:", err);
              // Gracefully switch to offline mode so they can start immediately
              const offlineFallbackState = { ...newState, isOffline: true };
              saveState(offlineFallbackState);
              return;
            }
          }
          saveState(newState);
        }} 
        onSignOut={async () => {
          try {
            await auth.signOut();
          } catch (err) {
            console.warn("Error signing out:", err);
          }
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setUserState(null);
        }}
      />
    );
  }

  // 3. Syllabus Subject Mapping based on active selections
  const { university, branch, scheme, semester, completedTopics } = userState;
  
  // Fetch active subjects in this semester
  const activeSubjects = getTemplateSubjects(university, branch, scheme, semester);

  // Fetch backlog subjects based on backlog IDs array (could be from sem 1 or 2 depending on chosen sem)
  const backlogSubjects: Subject[] = [];
  const uData = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
  const bData = uData[branch] || uData['CSE'];
  const sData = bData[scheme] || bData['2022 Scheme'];

  for (const semNum of [1, 2, 3]) {
    if (semNum < semester && sData[semNum]) {
      const priorSubjects = sData[semNum];
      priorSubjects.forEach((sub) => {
        if (userState.backlogSubjects.includes(sub.id)) {
          backlogSubjects.push(sub);
        }
      });
    }
  }

  // 4. Topic selector properties
  let activeTopic: Topic | null = null;
  let activeSubject: Subject | null = null;
  
  if (activeTopicId) {
    const result = findTopicById(activeTopicId, activeSubjects, backlogSubjects);
    if (result) {
      activeTopic = result.topic;
      activeSubject = result.subject;
    }
  }

  // 5. Update State Helper
  const handleUpdateState = (newState: Partial<UserState>) => {
    const updated = { ...userState, ...newState } as UserState;
    saveState(updated);
  };

  const handleStartTopic = (topicId: string) => {
    setActiveTopicId(topicId);
    if (userState && !userState.completedTopics.includes(topicId)) {
      const inProgress = userState.inProgressTopics || [];
      if (!inProgress.includes(topicId)) {
        handleUpdateState({
          inProgressTopics: [...inProgress, topicId]
        });
      }
    }
  };

  const handleChangeSubjectDifficulty = (subjectId: string, difficulty: 'Easy' | 'Medium' | 'Hard') => {
    handleUpdateState({
      subjectDifficulties: {
        ...(userState.subjectDifficulties || {}),
        [subjectId]: difficulty,
      },
    });
  };

  // 6. Complete active topic state transition
  const handleMarkTopicCompleted = (topicId: string) => {
    if (!userState) return;

    const result = findTopicById(topicId, activeSubjects, backlogSubjects);
    if (!result) return;

    const { topic, module, subject } = result;

    // Check if already completed to avoid duplicating arrays
    const isAlreadyCompleted = completedTopics.includes(topicId);
    const updatedCompletedTopics = isAlreadyCompleted 
      ? completedTopics 
      : [...completedTopics, topicId];

    // Calendar Streak Tracking Calculations
    const todayStr = getLocalDateString(); // "YYYY-MM-DD"
    const lastActiveStr = userState.lastActiveDate;
    
    let newStreak = userState.streak;
    
    if (lastActiveStr !== todayStr) {
      if (lastActiveStr === null) {
        newStreak = 1;
      } else {
        const lastActiveDate = new Date(lastActiveStr);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1; // Restart streak
        }
      }
    }

    const newLongestStreak = Math.max(userState.longestStreak, newStreak);

    // Track study activity completions counts
    const currentActivityCount = userState.studyActivity[todayStr] || 0;
    const updatedStudyActivity = {
      ...userState.studyActivity,
      [todayStr]: currentActivityCount + 1,
    };

    // Experience Awards & Revisions
    const updatedRevisions = [...userState.revisions];
    let addedXp = 0;

    const diffConfig = getDifficultyConfig(userState.subjectDifficulties, subject.id);

    // Check if there is an active (uncompleted) revision for this topic
    const activeRevIndex = updatedRevisions.findIndex(
      (r) => r.topicId === topicId && !r.completed
    );

    if (activeRevIndex !== -1) {
      updatedRevisions[activeRevIndex] = {
        ...updatedRevisions[activeRevIndex],
        completed: true,
      };
      addedXp = diffConfig.xpReward; // Revision completion awards difficulty XP
    } else if (!isAlreadyCompleted) {
      addedXp = diffConfig.xpReward; // First-time completion awards difficulty XP
    }

    let newXp = userState.xp + addedXp;
    let newLevel = getLevelAndProgress(newXp).level;

    // Revision Scheduler: Automatically schedules revisions
    const alreadyScheduled = userState.revisions.some((r) => r.topicId === topicId);
    if (!alreadyScheduled && !isAlreadyCompleted) {
      const revDate = new Date();
      revDate.setDate(revDate.getDate() + diffConfig.revisionDays);
      const revisionDateStr = getLocalDateString(revDate);

      updatedRevisions.push({
        id: `rev-${topicId}-${Date.now()}`,
        topicId: topicId,
        subjectId: subject.id,
        subjectName: subject.name,
        topicName: topic.name,
        dueDate: revisionDateStr,
        completed: false,
      });
    }

    // Set standard animation triggers
    let triggeredCelebration: 'topic' | 'module' | 'semester' | null = 'topic';

    // Check Module Completion
    const updatedCompletedModules = [...userState.completedModules];
    const isModFinished = module.topics.every((t: any) => updatedCompletedTopics.includes(t.id));
    const wasModAlreadyCompleted = userState.completedModules.includes(module.id);

    if (isModFinished && !wasModAlreadyCompleted) {
      updatedCompletedModules.push(module.id);
      newXp += 250; // Module Completion Bonus
      newLevel = getLevelAndProgress(newXp).level;
      triggeredCelebration = 'module';
    }

    // Check Subject Completion
    const updatedCompletedSubjects = [...userState.completedSubjects];
    const isSubFinished = subject.modules.every((m: any) => 
      m.topics.every((t: any) => updatedCompletedTopics.includes(t.id))
    );
    const wasSubAlreadyCompleted = userState.completedSubjects.includes(subject.id);

    const updatedBacklogSubjects = [...userState.backlogSubjects];
    if (isSubFinished) {
      if (!wasSubAlreadyCompleted) {
        updatedCompletedSubjects.push(subject.id);
      }
      const backlogIdx = updatedBacklogSubjects.indexOf(subject.id);
      if (backlogIdx !== -1) {
        updatedBacklogSubjects.splice(backlogIdx, 1);
      }
    }

    // Automatic semester completion has been removed in favor of manual, user-driven progression.
    const updatedCompletedSemesters = [...userState.completedSemesters];

    const updatedInProgressTopics = (userState.inProgressTopics || []).filter(id => id !== topicId);

    const updatedState: UserState = {
      ...userState,
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longestStreak: newLongestStreak,
      academicStudyStreak: newStreak,
      longestStudyStreak: Math.max(userState.longestStudyStreak || 0, newStreak),
      lastActiveDate: todayStr,
      lastFocusDate: todayStr,
      completedTopics: updatedCompletedTopics,
      completedModules: updatedCompletedModules,
      completedSubjects: updatedCompletedSubjects,
      completedSemesters: updatedCompletedSemesters,
      backlogSubjects: updatedBacklogSubjects,
      inProgressTopics: updatedInProgressTopics,
      revisions: updatedRevisions,
      studyActivity: updatedStudyActivity,
    };

    const completedTopicsInModule = module.topics.filter((t: any) => updatedCompletedTopics.includes(t.id)).length;
    const totalTopicsInModule = module.topics.length;
    const moduleProgressPercent = Math.round((completedTopicsInModule / totalTopicsInModule) * 100);

    setCelebrationDetails({
      xpEarned: triggeredCelebration === 'module' ? (addedXp + 250) : addedXp,
      moduleName: module.name,
      moduleProgress: moduleProgressPercent,
    });

    setToast({
      title: "🔥 Study Goal Secured!",
      message: `You earned +${addedXp} XP and protected your ${newStreak}-day streak!`,
      type: "success"
    });

    saveState(updatedState);
    setActiveTopicId(null);
    setCelebrationType(triggeredCelebration);

    // Play corresponding premium sound & haptic feedback on topic/module/subject/level complete!
    if (updatedState.level > userState.level) {
      SoundManager.play('level_up');
      SoundManager.vibrate('longSuccess');
    } else if (isSubFinished && !wasSubAlreadyCompleted) {
      SoundManager.play('subject_complete');
      SoundManager.vibrate('success');
    } else if (triggeredCelebration === 'module') {
      SoundManager.play('module_complete');
      SoundManager.vibrate('medium');
    } else {
      SoundManager.play('topic_complete');
      SoundManager.vibrate('light');
      // Gentle delayed XP pop sound
      setTimeout(() => {
        SoundManager.play('xp_gain');
      }, 400);
    }

    // Sync social milestone achievements to friends list
    if (updatedState.uid) {
      if (updatedState.level > userState.level) {
        triggerSocialMilestone(updatedState, 'level', updatedState.level).catch(console.error);
      }
      if (updatedState.completedSemesters.length > userState.completedSemesters.length) {
        triggerSocialMilestone(updatedState, 'semester', semester).catch(console.error);
      }
      const milestoneDays = [3, 5, 7, 10, 15, 20, 30, 45, 50, 75, 100];
      if (updatedState.streak > userState.streak && milestoneDays.includes(updatedState.streak)) {
        triggerSocialMilestone(updatedState, 'streak', updatedState.streak).catch(console.error);
      }
    }
  };

  // 7. Complete revision from Home tab card
  const handleCompleteRevision = (revisionId: string) => {
    if (!userState) return;

    const revisionIndex = userState.revisions.findIndex((r) => r.id === revisionId);
    if (revisionIndex === -1) return;

    const rev = userState.revisions[revisionIndex];
    
    // Experience Award: Revision Completion = 15 XP
    let newXp = userState.xp + 15;
    let newLevel = getLevelAndProgress(newXp).level;

    // Streak tracker updates
    const todayStr = getLocalDateString();
    const lastActiveStr = userState.lastActiveDate;
    
    let newStreak = userState.streak;
    if (lastActiveStr !== todayStr) {
      if (lastActiveStr === null) {
        newStreak = 1;
      } else {
        const lastActiveDate = new Date(lastActiveStr);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    }
    const newLongestStreak = Math.max(userState.longestStreak, newStreak);

    // Track study activity completions counts
    const currentActivityCount = userState.studyActivity[todayStr] || 0;
    const updatedStudyActivity = {
      ...userState.studyActivity,
      [todayStr]: currentActivityCount + 1,
    };

    // Set revision completed flag
    const updatedRevisions = [...userState.revisions];
    updatedRevisions[revisionIndex] = { ...rev, completed: true };

    const updatedState: UserState = {
      ...userState,
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longestStreak: newLongestStreak,
      academicStudyStreak: newStreak,
      longestStudyStreak: Math.max(userState.longestStudyStreak || 0, newStreak),
      lastActiveDate: todayStr,
      lastFocusDate: todayStr,
      revisions: updatedRevisions,
      studyActivity: updatedStudyActivity,
    };

    // Extract module details for celebration screen
    const { activeSubjects, backlogSubjects } = getUserSubjects(userState);
    const result = findTopicById(rev.topicId, activeSubjects, backlogSubjects);
    let moduleName = '';
    let moduleProgressPercent = 0;
    if (result) {
      const { module } = result;
      moduleName = module.name;
      const completedTopicsInModule = module.topics.filter((t: any) => userState.completedTopics.includes(t.id)).length;
      const totalTopicsInModule = module.topics.length;
      moduleProgressPercent = Math.round((completedTopicsInModule / totalTopicsInModule) * 100);
    }

    setCelebrationDetails({
      xpEarned: 15,
      moduleName: moduleName || rev.subjectName,
      moduleProgress: moduleProgressPercent,
    });

    setToast({
      title: "✨ Revision Mastered!",
      message: `Memory recall boosted for "${rev.topicName}"! +15 XP earned.`,
      type: "success"
    });

    saveState(updatedState);
    // Play a lovely topic success animation for general feedback
    setCelebrationType('topic');

    // Play corresponding premium sound & haptic feedback on revision complete!
    if (updatedState.level > userState.level) {
      SoundManager.play('level_up');
      SoundManager.vibrate('longSuccess');
    } else {
      SoundManager.play('topic_complete');
      SoundManager.vibrate('light');
      // Gentle delayed XP pop sound
      setTimeout(() => {
        SoundManager.play('xp_gain');
      }, 400);
    }

    // Sync social milestone achievements to friends list
    if (updatedState.uid) {
      if (updatedState.level > userState.level) {
        triggerSocialMilestone(updatedState, 'level', updatedState.level).catch(console.error);
      }
      const milestoneDays = [3, 5, 7, 10, 15, 20, 30, 45, 50, 75, 100];
      if (updatedState.streak > userState.streak && milestoneDays.includes(updatedState.streak)) {
        triggerSocialMilestone(updatedState, 'streak', updatedState.streak).catch(console.error);
      }
    }
  };

  const handleImportState = (imported: UserState) => {
    saveState(imported);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await auth.signOut();
    } catch (err) {
      console.warn("Error signing out:", err);
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUserState(null);
    setIsLoading(false);
  };

  const tabs: { id: UserState['activeTab']; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'progression', label: 'Journey', icon: <ListCollapse className="w-5 h-5" /> },
    { id: 'progress', label: 'Stats', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'friends', label: 'Friends', icon: <Users className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0C0F12] text-white flex flex-col font-sans selection:bg-blue-600/30">
      
      {/* Dynamic Navigation Header */}
      <Header
        userState={userState}
        onTabChange={(tab) => handleUpdateState({ activeTab: tab })}
      />

      {/* Main Content Sections */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-6 pb-24 md:pt-6 md:pb-32">
        
        {userState.activeTab === 'home' && (
          <HomeTab
            userState={userState}
            activeSubjects={activeSubjects}
            backlogSubjects={backlogSubjects}
            onStartTopic={handleStartTopic}
            onCompleteRevision={handleCompleteRevision}
            onOpenFocusTimer={() => {
              setIsFocusTimerOpen(true);
              setIsMinimizedFocusTimer(false);
            }}
            onOpenStudyCalendar={() => setIsStudyCalendarOpen(true)}
            onTriggerSemesterTransition={handleTriggerSemesterTransition}
            onUpdateState={handleUpdateState}
            hasActiveNotifications={hasPendingRequests || hasUnreadNotifs}
          />
        )}

        {userState.activeTab === 'progression' && (
          <ProgressionTab
            userState={userState}
            activeSubjects={activeSubjects}
            backlogSubjects={backlogSubjects}
            onStartTopic={handleStartTopic}
            onTriggerSemesterTransition={handleTriggerSemesterTransition}
            onChangeSubjectDifficulty={handleChangeSubjectDifficulty}
          />
        )}

        {userState.activeTab === 'progress' && (
          <ProgressTab
            userState={userState}
            activeSubjects={activeSubjects}
            backlogSubjects={backlogSubjects}
          />
        )}

        {userState.activeTab === 'friends' && (
          <FriendsTab
            userState={userState}
            onUpdateState={handleUpdateState}
            onTriggerToast={(title, message, type) => setToast({ title, message, type })}
          />
        )}

        {userState.activeTab === 'profile' && (
          <ProfileTab
            userState={userState}
            activeSubjects={activeSubjects}
            onUpdateState={handleUpdateState}
          />
        )}

        {userState.activeTab === 'settings' && (
          <SettingsTab
            userState={userState}
            onImportState={handleImportState}
            onUpdateState={handleUpdateState}
            onLogout={handleLogout}
            onOpenStudyCalendar={() => setIsStudyCalendarOpen(true)}
          />
        )}

      </main>

      {/* Single Simple Topic Details Sheet */}
      {activeTopicId && activeTopic && activeSubject && (
        <TopicViewModal
          topic={activeTopic}
          subject={activeSubject}
          userState={userState}
          isCompleted={completedTopics.includes(activeTopicId)}
          isRevisionDue={userState.revisions.some(
            (r) =>
              r.topicId === activeTopicId &&
              !r.completed &&
              r.dueDate <= getLocalDateString()
          )}
          onClose={() => setActiveTopicId(null)}
          onMarkCompleted={handleMarkTopicCompleted}
          onStartFocusTimer={(topicName) => {
            setActiveTopicId(null);
            setIsFocusTimerOpen(true);
            setIsMinimizedFocusTimer(false);
            setFocusTimerTopicName(topicName);
          }}
        />
      )}

      {/* Reward Animations Celebration overlays */}
      {celebrationType && (
        <CompletionAnimations
          type={celebrationType}
          streak={userState.streak}
          xpEarned={celebrationDetails?.xpEarned}
          moduleName={celebrationDetails?.moduleName}
          moduleProgress={celebrationDetails?.moduleProgress}
          onClose={() => {
            setCelebrationType(null);
            setCelebrationDetails(null);
          }}
        />
      )}

      {/* Badge Unlock Celebration Modal */}
      <BadgeUnlockModal
        isOpen={isBadgeModalOpen}
        badge={unlockedBadge}
        onClose={() => {
          setIsBadgeModalOpen(false);
          setUnlockedBadge(null);
        }}
      />

      {/* 📱 Device Pairing Request Modal (Option A) */}
      <AnimatePresence>
        {isPairingModalOpen && pendingPairCode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isPairingLoading && !pairingSuccess) {
                  setIsPairingModalOpen(false);
                  setPendingPairCode(null);
                }
              }}
              className="absolute inset-0 bg-[#060809]/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#0D1115] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 overflow-hidden text-center z-10"
            >
              {/* Soft decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5 relative">
                <h3 className="text-lg font-bold text-white font-display">Pair Mobile Device (Option A)</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                  An Android device is requesting to link with your authenticated StudyOS account.
                </p>
              </div>

              {/* Code visual block */}
              <div className="bg-gray-950/80 border border-gray-850/80 py-4 px-6 rounded-xl font-mono font-bold text-2xl tracking-widest text-emerald-400 flex items-center justify-center gap-1 select-all cursor-pointer" title="Pairing Code">
                <span>{pendingPairCode.slice(0, 3)}</span>
                <span className="text-gray-700 font-sans tracking-normal">-</span>
                <span>{pendingPairCode.slice(3, 6)}</span>
              </div>

              {/* Status or user info */}
              <div className="bg-gray-900/40 border border-gray-850 p-3 rounded-xl flex items-center gap-3 text-left">
                {userState?.avatar ? (
                  <div className="text-2xl">{userState.avatar}</div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm font-bold">
                    {userState?.username?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-white">Connecting Account:</p>
                  <p className="text-gray-400 font-mono">@{userState?.username} ({userState?.email})</p>
                </div>
              </div>

              {pairingSuccess ? (
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-xs text-emerald-400 font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 animate-bounce" />
                  <span>Devices successfully paired! Syncing now...</span>
                </div>
              ) : (
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isPairingLoading}
                    onClick={() => {
                      setIsPairingModalOpen(false);
                      setPendingPairCode(null);
                    }}
                    className="flex-1 py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 hover:border-gray-700 disabled:opacity-50 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isPairingLoading}
                    onClick={handleConfirmPairing}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isPairingLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Pairing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Pair</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ Streak Protection Danger Pop-up Modal */}
      <AnimatePresence>
        {showStreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStreakModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-md bg-gradient-to-b from-[#1E1118] to-[#0E0B16] border-2 border-red-500/30 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(239,68,68,0.2)] overflow-hidden text-center space-y-6"
            >
              {/* Outer ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setShowStreakModal(false)}
                className="absolute top-4 right-4 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white hover:bg-gray-700 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-20"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Fiery Icon Header */}
              <div className="relative w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-bounce">
                <Flame className="w-10 h-10 text-red-500 fill-current" />
                <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-75" />
              </div>

              {/* Warnings and Details */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-black text-red-400 uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-full">
                  ⚠️ Streak in Danger!
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-none pt-2">
                  Protect Your {userState.streak}-Day Goal!
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                  Coach, you haven't completed any study activity or revisions today yet! Secure your hard work before it resets tonight.
                </p>
              </div>

              {/* Stats block */}
              <div className="bg-[#141225]/80 border border-gray-850/80 rounded-2xl p-4 flex items-center justify-around text-left">
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Current Active Streak</span>
                  <span className="text-lg font-black font-mono text-amber-400 flex items-center gap-1">
                    🔥 {userState.streak} Days
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-gray-850" />
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">XP Potential Today</span>
                  <span className="text-lg font-black font-mono text-blue-400 flex items-center gap-1">
                    ✨ +35 XP
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleUpdateState({ activeTab: 'home' });
                    setShowStreakModal(false);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-red-500 via-orange-500 to-amber-600 hover:brightness-110 text-white font-black text-xs sm:text-sm tracking-widest uppercase rounded-2xl shadow-[0_8px_30px_rgba(239,68,68,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-white fill-current animate-pulse" />
                  <span>🎯 SECURE MY STREAK NOW</span>
                </motion.button>

                <button
                  onClick={() => setShowStreakModal(false)}
                  className="w-full py-3.5 text-xs text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest bg-transparent hover:bg-white/5 rounded-2xl transition-all cursor-pointer select-none"
                >
                  I'll study later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 Premium Floating Toast Notifications Popup */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:right-6 md:right-8 z-50 w-full max-w-sm bg-[#121021]/95 border border-blue-500/30 rounded-2xl p-4 shadow-[0_12px_40px_rgba(108,99,255,0.3)] flex items-start gap-3 backdrop-blur-md"
          >
            {/* Custom glowing dynamic icon badge */}
            <div className={`p-2 rounded-xl border shrink-0 ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : toast.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {toast.type === 'success' ? (
                <Sparkles className="w-5 h-5 fill-current text-emerald-400" />
              ) : toast.type === 'warning' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>

            {/* Title and Message */}
            <div className="flex-1 space-y-1 text-left min-w-0 pr-4">
              <h4 className="text-sm font-black text-white leading-none tracking-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed truncate-2-lines">
                {toast.message}
              </p>
            </div>

            {/* Clear close */}
            <button
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-white shrink-0 p-1 bg-white/5 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal Bottom Navigation Dock (docked on mobile, elegant floating central dock on desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-full z-40 bg-[#111114]/90 backdrop-blur-xl border-t md:border border-white/5 px-2 md:px-4 py-2 flex items-center justify-between pb-6 md:pb-2 shadow-[0_16px_40px_rgba(0,0,0,0.6)] transition-all">
        {/* Slot 1: Home */}
        <button
          onClick={() => handleUpdateState({ activeTab: 'home' })}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all cursor-pointer group select-none relative min-h-[48px]"
        >
          {userState.activeTab === 'home' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className={`p-1.5 transition-all duration-200 ${userState.activeTab === 'home' ? 'text-[#7C5CFF] scale-110' : 'text-gray-400 group-hover:text-gray-200'}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className={`text-[9px] uppercase font-bold tracking-wider transition-colors duration-200 leading-none ${userState.activeTab === 'home' ? 'text-[#A78BFA] font-extrabold' : 'text-gray-500 group-hover:text-gray-300'}`}>
            Home
          </span>
        </button>

        {/* Slot 2: Journey */}
        <button
          onClick={() => handleUpdateState({ activeTab: 'progression' })}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all cursor-pointer group select-none relative min-h-[48px]"
        >
          {userState.activeTab === 'progression' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className={`p-1.5 transition-all duration-200 ${userState.activeTab === 'progression' ? 'text-[#7C5CFF] scale-110' : 'text-gray-400 group-hover:text-gray-200'}`}>
            <ListCollapse className="w-5 h-5" />
          </div>
          <span className={`text-[9px] uppercase font-bold tracking-wider transition-colors duration-200 leading-none ${userState.activeTab === 'progression' ? 'text-[#A78BFA] font-extrabold' : 'text-gray-500 group-hover:text-gray-300'}`}>
            Journey
          </span>
        </button>

        {/* Slot 3: Large Elevated Glowing Center PLUS Action Button */}
        <div className="flex-1 flex justify-center -mt-6 md:-mt-8 select-none z-50">
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsFocusTimerOpen(true);
              setIsMinimizedFocusTimer(false);
            }}
            className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#7C5CFF] to-[#A78BFA] hover:brightness-110 text-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(124,92,255,0.45)] cursor-pointer border border-white/20"
            id="global-plus-fab"
            title="Start Focus Timer"
          >
            <Plus className="w-6 h-6 stroke-[3.5]" />
          </motion.button>
        </div>

        {/* Slot 4: Friends */}
        <button
          onClick={() => handleUpdateState({ activeTab: 'friends' })}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all cursor-pointer group select-none relative min-h-[48px]"
        >
          {userState.activeTab === 'friends' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className={`p-1.5 transition-all duration-200 ${userState.activeTab === 'friends' ? 'text-[#7C5CFF] scale-110' : 'text-gray-400 group-hover:text-gray-200'}`}>
            <Users className="w-5 h-5" />
          </div>
          <span className={`text-[9px] uppercase font-bold tracking-wider transition-colors duration-200 leading-none ${userState.activeTab === 'friends' ? 'text-[#A78BFA] font-extrabold' : 'text-gray-500 group-hover:text-gray-300'}`}>
            Friends
          </span>
        </button>

        {/* Slot 5: Profile */}
        <button
          onClick={() => handleUpdateState({ activeTab: 'profile' })}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all cursor-pointer group select-none relative min-h-[48px]"
        >
          {userState.activeTab === 'profile' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className={`p-1.5 transition-all duration-200 ${userState.activeTab === 'profile' ? 'text-[#7C5CFF] scale-110' : 'text-gray-400 group-hover:text-gray-200'}`}>
            <User className="w-5 h-5" />
          </div>
          <span className={`text-[9px] uppercase font-bold tracking-wider transition-colors duration-200 leading-none ${userState.activeTab === 'profile' ? 'text-[#A78BFA] font-extrabold' : 'text-gray-500 group-hover:text-gray-300'}`}>
            Profile
          </span>
        </button>
      </nav>

      {/* 1. Onboarding Study Calendar Prompt Modal */}
      {showOnboardingCalendarPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#141A1F] border border-gray-800 rounded-2xl p-6 text-center space-y-5 shadow-2xl"
          >
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-white font-display">Configure Study Calendar?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Setup your Semester Dates, Daily Focus Goals, Study Schedule, and Vacation protection to ensure your progress streaks remain safe!
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowOnboardingCalendarPrompt(false);
                }}
                className="flex-1 py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Skip for Later
              </button>
              <button
                onClick={() => {
                  setShowOnboardingCalendarPrompt(false);
                  setIsStudyCalendarOpen(true);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-all cursor-pointer"
              >
                Configure Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Study Calendar Config Modal */}
      {isStudyCalendarOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-4xl bg-[#0C0F12]/95 border border-gray-850 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <StudyCalendar
              userState={userState}
              onUpdateState={handleUpdateState}
              onClose={() => setIsStudyCalendarOpen(false)}
            />
          </motion.div>
        </div>
      )}

      {/* 3. Immersive Focus Timer Overlay / Minimized Widget */}
      {(isFocusTimerOpen || (localStorage.getItem('studyos_focus_session') && isMinimizedFocusTimer)) && (
        <FocusTimer
          userState={userState}
          onUpdateState={handleUpdateState}
          onTriggerToast={(title, message, type) => setToast({ title, message, type })}
          onMinimize={() => {
            if (isFocusTimerOpen) {
              setIsFocusTimerOpen(false);
              setIsMinimizedFocusTimer(true);
            } else {
              setIsFocusTimerOpen(true);
              setIsMinimizedFocusTimer(false);
            }
          }}
          isMinimized={!isFocusTimerOpen && isMinimizedFocusTimer}
          initialTopicName={focusTimerTopicName}
          onClearInitialTopicName={() => setFocusTimerTopicName('')}
        />
      )}

      {/* 4. Semester Transition Modal */}
      <AnimatePresence>
        {isSemTransitionOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#0E1317] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(59,130,246,0.15)] relative space-y-6"
            >
              {/* Step 1: Warning about unfinished subjects */}
              {semTransitionStep === 1 && (() => {
                const { activeSubjects } = getUserSubjects(userState);
                const unfinished = activeSubjects.filter(sub => {
                  let total = 0;
                  let completed = 0;
                  for (const mod of sub.modules) {
                    total += mod.topics.length;
                    completed += mod.topics.filter(t => userState.completedTopics.includes(t.id)).length;
                  }
                  return total > 0 && completed < total;
                });
                const completedCount = activeSubjects.length - unfinished.length;

                return (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/35 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white leading-none">Unfinished Subjects</h3>
                      <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                        You still have unfinished subjects in Semester {userState.semester}.
                      </p>
                    </div>

                    <div className="bg-[#141A1F] border border-gray-800/60 rounded-2xl p-4 text-left space-y-3">
                      <p className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Syllabus Completion</p>
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>Completed Subjects</span>
                        <span className="text-amber-400 font-mono">{completedCount} / {activeSubjects.length}</span>
                      </div>
                      <div className="w-full bg-gray-850 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(completedCount / activeSubjects.length) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed pt-1.5 border-t border-gray-800/40">
                        You can continue to Semester {userState.semester + 1} now and keep these unfinished subjects as <span className="text-purple-400 font-extrabold">optional archived learning</span> for later revision.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => setIsSemTransitionOpen(false)}
                        className="w-full sm:flex-1 py-3 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs font-black text-gray-400 hover:text-white rounded-xl transition-all uppercase tracking-widest cursor-pointer"
                      >
                        Stay & Study
                      </button>
                      <button
                        onClick={() => setSemTransitionStep(2)}
                        className="w-full sm:flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 text-xs font-black text-white rounded-xl transition-all shadow-md uppercase tracking-widest cursor-pointer"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Step 2: Have you passed the semester? */}
              {semTransitionStep === 2 && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/35 rounded-full flex items-center justify-center mx-auto text-blue-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white leading-none">Semester Complete?</h3>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                      Have you officially passed Semester {userState.semester}?
                    </p>
                  </div>

                  <div className="space-y-3 text-left">
                    <button
                      onClick={() => handleCompleteTransition(true)}
                      className="w-full p-4 bg-[#141A1F] border border-gray-800 hover:border-emerald-500/40 hover:bg-[#141A1F]/80 rounded-2xl text-left group transition-all duration-300 flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-extrabold text-white group-hover:text-emerald-400">Yes, I passed Semester {userState.semester}</p>
                        <p className="text-[10px] sm:text-[11px] text-gray-500">Advance to Semester {userState.semester + 1} with all past items archived.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSemTransitionStep(3);
                      }}
                      className="w-full p-4 bg-[#141A1F] border border-gray-800 hover:border-red-500/40 hover:bg-[#141A1F]/80 rounded-2xl text-left group transition-all duration-300 flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-red-500 flex items-center justify-center text-red-400 font-bold shrink-0">
                        ✗
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-extrabold text-white group-hover:text-red-400">No, I failed some subjects (Backlogs)</p>
                        <p className="text-[10px] sm:text-[11px] text-gray-500">Move on but select which subjects to carry forward as active backlogs.</p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setIsSemTransitionOpen(false)}
                      className="text-xs text-gray-500 hover:text-gray-300 uppercase tracking-widest font-black cursor-pointer bg-transparent hover:bg-white/5 px-4 py-2 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Select backlog subjects */}
              {semTransitionStep === 3 && (() => {
                const { activeSubjects } = getUserSubjects(userState);

                return (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/35 rounded-full flex items-center justify-center mx-auto text-red-500">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white leading-none">Manage Backlogs</h3>
                      <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                        Select which subjects from Semester {userState.semester} you need to retake:
                      </p>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2.5 text-left pr-1.5 custom-scrollbar">
                      {activeSubjects.map(sub => {
                        const isSelected = selectedTransitionBacklogs.includes(sub.id);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTransitionBacklogs(prev => prev.filter(id => id !== sub.id));
                              } else {
                                setSelectedTransitionBacklogs(prev => [...prev, sub.id]);
                              }
                            }}
                            className={`p-4 border rounded-2xl cursor-pointer select-none transition-all flex items-center gap-4 ${
                              isSelected
                                ? 'bg-red-500/5 border-red-500/40 text-white'
                                : 'bg-[#141A1F] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by click of row
                              className="rounded border-gray-800 bg-gray-950 text-red-500 focus:ring-red-500/20 shrink-0 pointer-events-none"
                            />
                            <p className="text-xs sm:text-sm font-extrabold leading-snug">{sub.name}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setSemTransitionStep(2)}
                        className="flex-1 py-3 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs font-black text-gray-400 hover:text-white rounded-xl transition-all uppercase tracking-widest cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => handleCompleteTransition(false)}
                        className="flex-1 py-3 bg-gradient-to-r from-red-500 to-amber-600 hover:brightness-110 text-xs font-black text-white rounded-xl transition-all shadow-md uppercase tracking-widest cursor-pointer"
                      >
                        Move to Sem {userState.semester + 1}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
