import React, { useState, useEffect, useRef } from 'react';
import { UserState, Subject, Topic, Revision } from './types';
import { getTemplateSubjects, COURSE_TEMPLATES, findTopicById } from './data';
import { Home, ListCollapse, BarChart3, Users, User, Settings, Flame, ShieldAlert, Sparkles, Clock, X, Calendar, AlertCircle, Plus, Smartphone, Check, Loader2, ExternalLink, WifiOff } from 'lucide-react';
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
import { auth, db, googleProvider, syncUserToFirestore, triggerSocialMilestone, loadUserFromFirestore, registerUserProfileTransaction, subscribeFriendRequests, subscribeNotifications, linkDeviceWithAccount, mergeLocalAndCloudStates } from './lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, onIdTokenChanged } from 'firebase/auth';
import { encryptData } from './lib/crypto';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { getSubjectsForCycle } from './utils/cycleSubjects';
import { SoundManager } from './utils/soundManager';
import { getLocalDateString } from './utils/dateUtils';
import { syncAndroidWidget } from './utils/widgetSync';
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

// Timezone-proof UTC date parsing and diffing helpers
const parseDateUTC = (str: string | null | undefined) => {
  if (!str || typeof str !== 'string' || !str.includes('-')) {
    return new Date();
  }
  const [year, month, day] = str.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const getDaysDifference = (dateStr1: string | null | undefined, dateStr2: string | null | undefined) => {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = parseDateUTC(dateStr1);
  const d2 = parseDateUTC(dateStr2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export default function App() {
  const [userState, setUserStateInternal] = useState<UserState | null>(null);

  const setUserState = (state: UserState | null | ((prev: UserState | null) => UserState | null)) => {
    setUserStateInternal((prev) => {
      let resolved = typeof state === 'function' ? state(prev) : state;
      console.log(`[StudyOS Trace] setUserState invoked. Prev state exists: ${!!prev}, Resolved state exists: ${!!resolved}`);
      if (resolved) {
        const validTabs = ['home', 'progression', 'progress', 'friends', 'profile', 'settings'];
        if (!resolved.activeTab || !validTabs.includes(resolved.activeTab)) {
          resolved = { ...resolved, activeTab: 'home' };
        }
      }
      if (prev?.isOffline !== resolved?.isOffline) {
        console.log(`[StudyOS Trace] !! STATE IS_OFFLINE TRANSITION !! from: ${prev?.isOffline} to: ${resolved?.isOffline}`);
      }
      if (prev?.uid !== resolved?.uid) {
        console.log(`[StudyOS Trace] !! STATE UID TRANSITION !! from: ${prev?.uid || 'null'} to: ${resolved?.uid || 'null'}`);
      }
      if (prev?.username !== resolved?.username) {
        console.log(`[StudyOS Trace] !! STATE USERNAME TRANSITION !! from: ${prev?.username || 'null'} to: ${resolved?.username || 'null'}`);
      }
      return resolved;
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitializedInternal] = useState(false);
  const setAuthInitialized = (val: boolean | ((prev: boolean) => boolean)) => {
    const errorStack = new Error().stack || 'No stack trace available';
    if (typeof val === 'function') {
      setAuthInitializedInternal(prev => {
        const next = (val as any)(prev);
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized transition: ${prev} -> ${next}`);
        console.log(`[StudyOS Trace] authInitialized transition Stack Trace:\n${errorStack}`);
        return next;
      });
    } else {
      setAuthInitializedInternal(prev => {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized transition: ${prev} -> ${val}`);
        console.log(`[StudyOS Trace] authInitialized transition Stack Trace:\n${errorStack}`);
        return val;
      });
    }
  };

  useEffect(() => {
    console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] App mounted`);
    const mountStack = new Error().stack || 'No stack trace available';
    console.log(`[StudyOS Trace] App mounted Stack Trace:\n${mountStack}`);
    return () => {
      console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] App unmounted`);
      const unmountStack = new Error().stack || 'No stack trace available';
      console.log(`[StudyOS Trace] App unmounted Stack Trace:\n${unmountStack}`);
    };
  }, []);

  const lastCurrentUserUidRef = useRef<string | null>(undefined as any);
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUid = auth.currentUser?.uid || null;
      if (currentUid !== lastCurrentUserUidRef.current) {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] auth.currentUser changed: ${lastCurrentUserUidRef.current} -> ${currentUid}`);
        lastCurrentUserUidRef.current = currentUid;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const isFirstLoad = useRef(true);

  // Keep a ref of userState to prevent stale closure bugs in persistent handlers like onAuthStateChanged
  const userStateRef = useRef(userState);
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);

  const authInitializedRef = useRef(false);
  useEffect(() => {
    authInitializedRef.current = authInitialized;
  }, [authInitialized]);

  const syncInProgressRef = useRef(false);
  const unsubRequestsRef = useRef<(() => void) | null>(null);
  const unsubNotificationsRef = useRef<(() => void) | null>(null);

  const [isCloudSyncUnavailable, setIsCloudSyncUnavailableInternal] = useState(false);
  const setIsCloudSyncUnavailable = (val: boolean) => {
    console.log(`[StudyOS Trace] setIsCloudSyncUnavailable called: value=${val}`);
    setIsCloudSyncUnavailableInternal(val);
  };

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
  const [reconnectCount, setReconnectCount] = useState(0);

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
    const key = params.get('k');
    if (code) {
      // Save it to localStorage as a backup so it automatically prompts them after login/onboarding
      localStorage.setItem('pending_pair_code', code);
      if (key) {
        localStorage.setItem('pending_pair_key', key);
      }
      setPendingPairCode(code);
      setIsPairingModalOpen(true);
      
      // Clean up the URL parameter to maintain a clean address bar
      let cleanSearch = window.location.search.replace(/[?&]pair_code=[^&]+/, '').replace(/[?&]k=[^&]+/, '');
      if (cleanSearch === '?' || cleanSearch === '&') cleanSearch = '';
      const newUrl = window.location.pathname + cleanSearch;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Monitor user state transitions to automatically trigger pending pairing codes
  useEffect(() => {
    if (userState && userState.uid && !pairingSuccess && !isPairingLoading) {
      const savedCode = localStorage.getItem('pending_pair_code') || pendingPairCode;
      if (savedCode) {
        const idToken = sessionStorage.getItem('google_id_token');
        if (!idToken) {
          // If we don't have the Google ID token in this browser session yet, 
          // do NOT silently pair (which would write empty credentials). Let them click the Confirm Pairing modal button instead.
          console.log("[PAIRING] Delaying automatic silent pairing: Google ID token not yet in sessionStorage.");
          return;
        }

        setPendingPairCode(savedCode);
        localStorage.removeItem('pending_pair_code');
        
        // AUTOMATIC SILENT LINKING FLOW - Completely bypasses manual click confirmations!
        const autoSilentPair = async () => {
          setIsPairingLoading(true);
          try {
            const pairingKey = localStorage.getItem('pending_pair_key');
            const accessToken = sessionStorage.getItem('google_access_token') || null;

            // Encrypt if key exists
            const encryptedIdToken = (idToken && pairingKey) ? encryptData(idToken, pairingKey) : null;
            const encryptedAccessToken = (accessToken && pairingKey) ? encryptData(accessToken, pairingKey) : null;

            console.log("[PAIRING] Auto silent linking on browser. Key exists:", !!pairingKey, "Tokens encrypted:", !!encryptedIdToken);

            await linkDeviceWithAccount(
              savedCode, 
              userState.uid, 
              userState,
              encryptedIdToken,
              encryptedAccessToken
            );

            // Clean up temporary key
            localStorage.removeItem('pending_pair_key');

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
      let idToken = sessionStorage.getItem('google_id_token') || null;
      let accessToken = sessionStorage.getItem('google_access_token') || null;

      // If we don't have the Google ID token in sessionStorage, run a quick Google Auth popup to retrieve it
      if (!idToken) {
        console.log("[PAIRING] Google ID Token not in session. Requesting re-auth via popup...");
        try {
          googleProvider.setCustomParameters({ prompt: 'select_account' });
          const authResult = await signInWithPopup(auth, googleProvider);
          const credential = GoogleAuthProvider.credentialFromResult(authResult);
          if (credential) {
            idToken = credential.idToken || null;
            accessToken = credential.accessToken || null;
            if (idToken) sessionStorage.setItem('google_id_token', idToken);
            if (accessToken) sessionStorage.setItem('google_access_token', accessToken);
          }
        } catch (authErr: any) {
          throw new Error("Google re-authentication failed. We need a secure Google token to link your Android device: " + authErr.message);
        }
      }

      const pairingKey = localStorage.getItem('pending_pair_key');
      const encryptedIdToken = (idToken && pairingKey) ? encryptData(idToken, pairingKey) : null;
      const encryptedAccessToken = (accessToken && pairingKey) ? encryptData(accessToken, pairingKey) : null;

      console.log("[PAIRING] Manual confirming on browser. Key exists:", !!pairingKey, "Tokens encrypted:", !!encryptedIdToken);

      await linkDeviceWithAccount(
        pendingPairCode, 
        userState.uid, 
        userState,
        encryptedIdToken,
        encryptedAccessToken
      );

      // Clean up stored temporary pair key after use
      localStorage.removeItem('pending_pair_key');

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
      }, 5000);
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
        completed += mod.topics.filter(t => (userState.completedTopics || []).includes(t.id)).length;
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

  // Log authInitialized changes
  useEffect(() => {
    console.log(`[StudyOS Trace] authInitialized changed to: ${authInitialized}`);
    if (authInitialized) {
      console.log("[StudyOS Trace] authInitialized = true");
    }
  }, [authInitialized]);

  // 1. Unified Initial State Load and Firebase Auth Listener
  useEffect(() => {
    console.log("[StudyOS Trace] Firebase initialization started");
    let authUnsubscribed = false;
    let initTimeout: NodeJS.Timeout | null = null;
    let isFirstCallback = true;
    
    console.log("[StudyOS Trace] Firebase Auth listener registered");
    
    const unsubscribeToken = onIdTokenChanged(auth, (firebaseUser) => {
      if (authUnsubscribed) {
        console.log("[StudyOS Trace] onIdTokenChanged ignored: listener has been unsubscribed.");
        return;
      }
      if (firebaseUser) {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] onIdTokenChanged(firebaseUser) - User UID: ${firebaseUser.uid}`);
      } else {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] onIdTokenChanged(null)`);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (authUnsubscribed) {
        console.log("[StudyOS Trace] onAuthStateChanged ignored: listener has been unsubscribed.");
        return;
      }

      if (firebaseUser) {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] onAuthStateChanged(firebaseUser)`);
        console.log(`[StudyOS Trace] auth.currentUser UID: ${firebaseUser.uid}`);
      } else {
        console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] onAuthStateChanged(null)`);
      }

      // Helper function to handle authenticated user state
      const handleUserAuthenticated = async (user: any) => {
        console.log(`[StudyOS Trace] onAuthStateChanged: Firebase user is authenticated (UID: ${user.uid}). Attempting to load from Firestore...`);
        let cloudData = null;
        let dbErrorHappened = false;

        const isPhysicallyConnected = navigator.onLine; // Check actual physical connectivity
        const isOffline = !isPhysicallyConnected; // Authentication state must never control isOffline

        // Enable Firestore network if physically connected before load
        if (isPhysicallyConnected) {
          try {
            console.log("[StudyOS Trace] Calling enableNetwork(db) prior to loading user profile...");
            await enableNetwork(db);
            console.log("[StudyOS Trace] Firestore network enabled (pre-load)");
          } catch (dbErr) {
            console.warn("[StudyOS Trace] pre-load enableNetwork(db) failed:", dbErr);
          }
        }

        try {
          cloudData = await loadUserFromFirestore(user.uid);
        } catch (dbErr) {
          console.error("[StudyOS Trace] onAuthStateChanged: Database connection failed on startup, falling back to local storage:", dbErr);
          dbErrorHappened = true;
        }

        if (cloudData && cloudData.onboarded) {
          console.log("[StudyOS Trace] onAuthStateChanged: Successfully loaded onboarded cloud profile data.");
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          let local = cached ? JSON.parse(cached) : null;
          let merged: UserState;

          if (local && local.username && local.uid === user.uid) {
            console.log("[StudyOS Trace] onAuthStateChanged: Local cache matches authenticated user. Merging local progress with cloud progress...");
            merged = mergeLocalAndCloudStates(local, cloudData);
            merged.isOffline = isOffline; // Use actual physical connectivity
          } else {
            console.log("[StudyOS Trace] onAuthStateChanged: Local cache is empty or belongs to a different user. Loading cloud profile data directly.");
            merged = {
              ...cloudData,
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || cloudData.displayName || undefined,
              isOffline: isOffline, // Use actual physical connectivity
            };
          }
          setUserState(merged);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } else {
          console.log(`[StudyOS Trace] onAuthStateChanged: Cloud data is null, incomplete, or not onboarded. dbErrorHappened=${dbErrorHappened}`);
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          let local = cached ? JSON.parse(cached) : null;

          if (local && local.username && local.uid === user.uid) {
            console.log(`[StudyOS Trace] onAuthStateChanged: Cache matches. Restoring cached state. isOffline=${isOffline}`);
            const updatedLocal: UserState = {
              ...local,
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || local.displayName || undefined,
              isOffline: isOffline, // Physical connectivity controls this
            };
            setUserState(updatedLocal);
          } else {
            console.log(`[StudyOS Trace] onAuthStateChanged: No matching cache. Initializing blank user state with isOffline=${isOffline}`);
            setUserState({
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || undefined,
              isOffline: isOffline,
              onboarded: false,
            } as UserState);
          }
        }
      };

      // Helper function to handle unauthenticated user state
      const handleUserUnauthenticated = () => {
        console.log("[StudyOS Trace] onAuthStateChanged: No authenticated Firebase user is logged in. Checking local storage cache...");
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.isOffline || parsed.onboarded) {
              console.log(`[StudyOS Trace] onAuthStateChanged: Found cached user profile in local storage (@${parsed.username}).`);
              
              const isPhysicallyConnected = navigator.onLine;
              const isOffline = !isPhysicallyConnected; // Never let auth state control isOffline

              if (!parsed.inProgressTopics) {
                parsed.inProgressTopics = [];
              }
              // Restore and set offline status based strictly on actual physical connectivity and cached status
              parsed.isOffline = isOffline; // Only physical connectivity controls this
              setUserState(parsed);
            } else {
              console.log("[StudyOS Trace] onAuthStateChanged: Cache does not contain an onboarded/offline user. Clearing state.");
              setUserState(null);
            }
          } catch (pErr) {
            console.error("[StudyOS Trace] onAuthStateChanged: Failed to parse cached local storage user state:", pErr);
            setUserState(null);
          }
        } else {
          console.log("[StudyOS Trace] onAuthStateChanged: Local storage cache is empty. Setting state to null.");
          setUserState(null);
        }
      };

      try {
        if (isFirstCallback) {
          isFirstCallback = false;
          
          if (firebaseUser) {
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] Firebase initialization completed (User authenticated immediately)`);
            await handleUserAuthenticated(firebaseUser);
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized = true`);
            setAuthInitialized(true);
            setIsLoading(false);
          } else {
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] onAuthStateChanged received initial null callback. Starting 1000ms delay to check for restored session...`);
            initTimeout = setTimeout(async () => {
              if (authUnsubscribed) return;
              console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] Firebase initialization completed (No restored session detected after 1000ms timeout)`);
              handleUserUnauthenticated();
              console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized = true`);
              setAuthInitialized(true);
              setIsLoading(false);
            }, 1000);
          }
        } else {
          if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
          }
          
          if (firebaseUser) {
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] Firebase auth state transitioned to authenticated.`);
            await handleUserAuthenticated(firebaseUser);
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized = true`);
            setAuthInitialized(true);
            setIsLoading(false);
          } else {
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] Firebase auth state transitioned to unauthenticated.`);
            handleUserUnauthenticated();
            console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] authInitialized = true`);
            setAuthInitialized(true);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("[StudyOS Trace] onAuthStateChanged block encountered error:", err);
      }
    });

    return () => {
      console.log("[StudyOS Trace] Cleaning up Firebase onAuthStateChanged and onIdTokenChanged subscriptions...");
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      authUnsubscribed = true;
      unsubscribe();
      unsubscribeToken();
    };
  }, []);

  // Ref to track if the App component is mounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to get network status natively or from browser
  const getIsConnected = async (): Promise<boolean> => {
    try {
      console.log("[StudyOS Trace] getIsConnected invoking Capacitor Network.getStatus()...");
      const status = await Network.getStatus();
      console.log(`[StudyOS Trace] getIsConnected: Native getStatus response: connected=${status.connected}, connectionType=${status.connectionType}`);
      return status.connected;
    } catch (e) {
      console.log(`[StudyOS Trace] getIsConnected: Native getStatus failed. Standard navigator.onLine check: connected=${navigator.onLine}`);
      return navigator.onLine;
    }
  };

  // Main synchronization and reconnect function
  const performSyncOnReconnect = async () => {
    if (syncInProgressRef.current) {
      console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] performSyncOnReconnect: Sync already in progress, skipping concurrent trigger.`);
      return;
    }
    syncInProgressRef.current = true;
    console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] performSyncOnReconnect started`);

    const getNavigationDecision = (state: any) => {
      if (!state || !state.username) return "Show Login (AuthScreen)";
      if (!state.onboarded) return "Show Onboarding";
      return "Show Home/Profile (Main Application Tabs)";
    };
    console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] [Resume Sync Log] auth.currentUser UID: ${auth.currentUser?.uid || 'null'}, userState UID: ${userStateRef.current?.uid || 'null'}, userState Username: ${userStateRef.current?.username || 'null'}, Onboarding Completed: ${userStateRef.current?.onboarded || 'false'}, Predicted Navigation: ${getNavigationDecision(userStateRef.current)}`);

    console.log(`[StudyOS Trace Timestamp] [${new Date().toISOString()}] [${performance.now().toFixed(2)}ms] [performSyncOnReconnect Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);

    try {
      if (!authInitializedRef.current) {
        console.log("[StudyOS Trace] performSyncOnReconnect skipped because auth not initialized");
        return;
      }

      if (!auth.currentUser) {
        console.log("[StudyOS Trace] performSyncOnReconnect skipped because auth.currentUser is null");
        return;
      }

      const currentState = userStateRef.current;
      if (!currentState || !currentState.uid) {
        console.log("[StudyOS Trace] performSyncOnReconnect skipped because userState does not exist or has no UID");
        return;
      }

      if (!currentState.onboarded) {
        console.log("[StudyOS Trace] performSyncOnReconnect skipped because onboarding is not completed");
        return;
      }

      console.log("[StudyOS Trace] performSyncOnReconnect executed after authentication");
      console.log("[StudyOS Trace] performSyncOnReconnect executing");

      const hasInternet = await getIsConnected();
      console.log(`[StudyOS Trace] performSyncOnReconnect connection check outcome: hasInternet=${hasInternet}`);
      if (!hasInternet) {
        console.log("[StudyOS Trace] performSyncOnReconnect skipped: network is offline.");
        if (currentState && !currentState.isOffline) {
          console.log("[StudyOS Trace] performSyncOnReconnect: Transitioning userState isOffline=true due to detected offline state.");
          const offlineState = {
            ...currentState,
            isOffline: true
          };
          setUserState(offlineState);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(offlineState));
        }
        setIsCloudSyncUnavailable(false);
        return;
      }

      console.log("⚡ [StudyOS Trace] Reconnection/Resume active. Running cloud recovery...");

      try {
        // 1. Force enable Firestore network & trigger retries of pending writes/listens
        try {
          console.log("[StudyOS Trace] Calling enableNetwork(db) to explicitly connect Firestore...");
          await enableNetwork(db);
          console.log("[StudyOS Trace] Firestore network enabled");
        } catch (dbErr: any) {
          console.warn(`[StudyOS Trace] enableNetwork(db) FAILED: ${dbErr?.message || dbErr}`);
        }

        // 2. Refresh Firebase Auth if needed (forces reconnection & updates auth token)
        if (auth.currentUser) {
          try {
            console.log("[StudyOS Trace] Calling auth.currentUser.getIdToken(true) to force token refresh...");
            await auth.currentUser.getIdToken(true);
            console.log("[StudyOS Trace] auth.currentUser.getIdToken(true) SUCCEEDED.");
          } catch (authErr: any) {
            console.warn(`[StudyOS Trace] auth.currentUser.getIdToken(true) FAILED: ${authErr?.message || authErr}`);
          }
        } else {
          console.log("[StudyOS Trace] performSyncOnReconnect: auth.currentUser is null. Skipping token refresh.");
        }

        // 3. Load user profile and study stats from Firestore
        console.log(`[StudyOS Trace] performSyncOnReconnect: Loading profile from Firestore for UID: ${currentState.uid}`);
        const cloudData = await loadUserFromFirestore(currentState.uid);
        if (!isMountedRef.current) {
          console.log("[StudyOS Trace] performSyncOnReconnect: App unmounted mid-sync. Aborting state update.");
          return;
        }

        if (cloudData) {
          console.log("[StudyOS Trace] performSyncOnReconnect: Cloud profile found. Merging local progress...");
          // Merge local offline progress into cloud data to prevent any data loss
          const merged = mergeLocalAndCloudStates(currentState, cloudData);
          const updatedState = {
            ...merged,
            isOffline: false,
          };
          
          setUserState(updatedState);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedState));

          // Trigger a silent sync to cloud just to make sure Firestore is fully updated with any offline changes
          console.log("[StudyOS Trace] performSyncOnReconnect: Triggering silent cloud sync write...");
          await syncUserToFirestore(currentState.uid, updatedState);

          setToast({
            title: "📶 Back Online",
            message: "Your internet connection is restored! Your progress has been successfully merged and synchronized with the cloud.",
            type: "success"
          });
        } else {
          console.log("[StudyOS Trace] performSyncOnReconnect: No cloud profile found, but online. Setting isOffline=false.");
          if (currentState.isOffline) {
            const updatedState = {
              ...currentState,
              isOffline: false,
            };
            setUserState(updatedState);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedState));
          }
        }

        // Reset the cloud sync unavailable flag since everything succeeded
        setIsCloudSyncUnavailable(false);

        // Increment reconnectCount to force-rebuild any active subscriptions
        setReconnectCount(prev => prev + 1);

        // 4. Dispatch a custom global event to refresh friends, notifications, and leaderboard data
        console.log("[StudyOS Trace] performSyncOnReconnect complete. Broadcasting app-resume-sync to active tabs.");
        window.dispatchEvent(new CustomEvent('app-resume-sync'));
        console.log("[StudyOS Trace] performSyncOnReconnect completed");

      } catch (err: any) {
        console.warn(`[StudyOS Trace] performSyncOnReconnect FAILED: ${err?.message || err}`);
        
        // Set cloud sync flag to unavailable since the device is online but we can't sync to the cloud
        setIsCloudSyncUnavailable(true);

        // Critical Fail-Safe: If we verified we have internet, but the Firestore load itself threw an error (e.g., temporary Firestore network glitch),
        // we should still reset the isOffline banner if the browser says we are online, to avoid locking the UI in a stale "No internet connection detected" state.
        if (currentState.isOffline) {
          console.log("[StudyOS Trace] performSyncOnReconnect fail-safe triggered. Internet active but Firestore load failed. Clearing offline banner.");
          const updatedState = {
            ...currentState,
            isOffline: false,
          };
          setUserState(updatedState);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedState));
        }
        console.log("[StudyOS Trace] performSyncOnReconnect completed");
      }
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Trigger performSyncOnReconnect exactly once after BOTH authInitialized is true and auth.currentUser is not null
  const hasTriggeredInitialSync = useRef(false);
  useEffect(() => {
    console.log(`[StudyOS Trace] Initial sync check: authInitialized=${authInitialized}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}`);
    if (authInitialized && auth.currentUser) {
      if (!hasTriggeredInitialSync.current) {
        hasTriggeredInitialSync.current = true;
        console.log("[StudyOS Trace] authInitialized is true and auth.currentUser is not null. Triggering initial sync...");
        console.log(`[StudyOS Trace] auth.currentUser UID: ${auth.currentUser.uid}`);
        performSyncOnReconnect();
      }
    } else {
      if (!auth.currentUser) {
        hasTriggeredInitialSync.current = false;
      }
    }
  }, [authInitialized, userState?.uid]);

  // Handle network state transitions
  const handleNetworkChange = async (connected: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[StudyOS Trace] handleNetworkChange called. connected=${connected}`);

    if (connected) {
      await performSyncOnReconnect();
    } else {
      // We are offline. Transition Firestore to offline and update userState isOffline parameter.
      try {
        console.log("[StudyOS Trace] handleNetworkChange: Disabling Firestore network...");
        await disableNetwork(db);
        console.log("[StudyOS Trace] disableNetwork(db) SUCCEEDED.");
      } catch (dbErr: any) {
        console.warn(`[StudyOS Trace] disableNetwork(db) FAILED: ${dbErr?.message || dbErr}`);
      }

      const currentState = userStateRef.current;
      if (currentState && !currentState.isOffline) {
        console.log("[StudyOS Trace] handleNetworkChange: Transitioning state to offline.");
        const offlineState = {
          ...currentState,
          isOffline: true
        };
        setUserState(offlineState);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(offlineState));
      }

      // If physically offline, reset the cloud sync failure state since the main offline banner takes priority
      setIsCloudSyncUnavailable(false);

      setToast({
        title: "📶 Offline Mode Active",
        message: "You are currently disconnected. You can continue studying offline; your progress will synchronize once you're back online.",
        type: "info"
      });
    }
  };

  // 1e. Enhanced Android/Web Network & Background Resume Sync engine
  useEffect(() => {
    let appListener: any = null;
    let netListener: any = null;
    let browserCleanup: (() => void) | undefined;

    console.log("[StudyOS Trace] Initializing network and lifecycle event monitoring...");

    // Setup Capacitor and browser listeners
    const setupListeners = async () => {
      let isNativelySupported = false;
      try {
        // Test if the App and Network plugins are supported and available
        const appInfo = await CapApp.getInfo();
        const initialStatus = await Network.getStatus();
        console.log("[StudyOS Trace] Capacitor App & Network plugins available natively.", appInfo, initialStatus);
        isNativelySupported = true;
      } catch (e) {
        console.log("[StudyOS Trace] Capacitor plugins not available natively. Falling back to browser standard APIs.");
      }

      if (isNativelySupported) {
        try {
          // Listen for App Resume (coming from background)
          appListener = await CapApp.addListener('appStateChange', async (state) => {
            console.log(`[StudyOS Trace] [Capacitor App] appStateChange fired. isActive=${state.isActive}`);
            console.log(`[StudyOS Trace] [Capacitor App Listener Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);
            if (state.isActive && isMountedRef.current) {
              console.log("[StudyOS Trace] [Capacitor App] App resumed. Triggering network and sync check...");
              await performSyncOnReconnect();
            }
          });

          // Listen for Network changes
          netListener = await Network.addListener('networkStatusChange', async (status) => {
            console.log(`[StudyOS Trace] [Capacitor Network] networkStatusChange fired. connected=${status.connected}, connectionType=${status.connectionType}`);
            console.log(`[StudyOS Trace] [Capacitor Network Listener Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);
            if (isMountedRef.current) {
              await handleNetworkChange(status.connected);
            }
          });

          // Run initial check
          const status = await Network.getStatus();
          console.log(`[StudyOS Trace] [Capacitor Network] Initial connection check: connected=${status.connected}`);
          if (status.connected) {
            await performSyncOnReconnect();
          } else {
            await handleNetworkChange(false);
          }
        } catch (err) {
          console.error("[StudyOS Trace] Error setting up native Capacitor listeners:", err);
        }
      } else {
        // Browser Fallback listeners
        const handleOnline = () => {
          console.log("[StudyOS Trace] [Browser Network] online event fired.");
          console.log(`[StudyOS Trace] [Browser Online Listener Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);
          if (isMountedRef.current) performSyncOnReconnect();
        };

        const handleOffline = () => {
          console.log("[StudyOS Trace] [Browser Network] offline event fired.");
          console.log(`[StudyOS Trace] [Browser Offline Listener Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);
          if (isMountedRef.current) handleNetworkChange(false);
        };

        const handleVisibility = () => {
          console.log(`[StudyOS Trace] [Browser Lifecycle] visibilitychange fired. state=${document.visibilityState}`);
          console.log(`[StudyOS Trace] [Browser Visibility Listener Context] authInitialized (closed state)=${authInitialized}, authInitializedRef (live ref)=${authInitializedRef.current}, auth.currentUser UID=${auth.currentUser?.uid || 'null'}, userStateRef UID=${userStateRef.current?.uid || 'null'}`);
          if (document.visibilityState === 'visible' && isMountedRef.current) {
            performSyncOnReconnect();
          }
        };

        const handleFocus = () => {
          console.log("[StudyOS Trace] [Browser Lifecycle] Window focused.");
        };

        const handleBlur = () => {
          console.log("[StudyOS Trace] [Browser Lifecycle] Window blurred.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        console.log(`[StudyOS Trace] [Browser Network] Initial navigator.onLine check: connected=${navigator.onLine}`);
        // Initial standard check
        if (navigator.onLine) {
          performSyncOnReconnect();
        } else {
          handleNetworkChange(false);
        }

        browserCleanup = () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          document.removeEventListener('visibilitychange', handleVisibility);
          window.removeEventListener('focus', handleFocus);
          window.removeEventListener('blur', handleBlur);
        };
      }
    };

    setupListeners();

    return () => {
      console.log("[StudyOS Trace] Cleaning up network and lifecycle event listeners...");
      if (appListener) {
        appListener.remove();
      }
      if (netListener) {
        netListener.remove();
      }
      if (browserCleanup) {
        browserCleanup();
      }
    };
  }, []);

  // 1f. Proactive connection/sync check when userState transitions to authenticated & onboarded
  useEffect(() => {
    if (userState && userState.uid && userState.onboarded) {
      console.log("[StudyOS Network] User state loaded or updated. Proactively validating connection status for cloud sync...");
      performSyncOnReconnect();
    }
  }, [userState?.uid, userState?.onboarded]);

  // 1c. Real-time synchronisation of UserState to Firestore with debouncing
  useEffect(() => {
    if (userState && userState.uid && userState.onboarded) {
      // Sync with the Android native widget immediately when state changes
      syncAndroidWidget(userState);

      const timer = setTimeout(() => {
        syncUserToFirestore(userState.uid!, userState)
          .then(() => {
            setIsCloudSyncUnavailable(false);
          })
          .catch(err => {
            console.error("Real-time cloud synchronization error:", err);
            getIsConnected().then(hasInternet => {
              if (hasInternet) {
                setIsCloudSyncUnavailable(true);
              }
            });
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
      
      if (unsubRequestsRef.current) {
        console.log("[StudyOS Trace] [App Subscriptions] Cleaning up unsubRequestsRef because user logged out...");
        unsubRequestsRef.current();
        unsubRequestsRef.current = null;
      }
      if (unsubNotificationsRef.current) {
        console.log("[StudyOS Trace] [App Subscriptions] Cleaning up unsubNotificationsRef because user logged out...");
        unsubNotificationsRef.current();
        unsubNotificationsRef.current = null;
      }
      return;
    }

    console.log(`[StudyOS Trace] [App Subscriptions] Setting up listeners for UID: ${userState.uid}`);

    // Store incoming friend requests listener with check
    if (unsubRequestsRef.current) {
      console.log("[StudyOS Trace] [App Subscriptions] unsubRequestsRef already exists, cleaning up first...");
      unsubRequestsRef.current();
      unsubRequestsRef.current = null;
    }
    unsubRequestsRef.current = subscribeFriendRequests(userState.uid, (requests) => {
      setHasPendingRequests(requests.length > 0);
    });

    // Store system notifications listener with check
    if (unsubNotificationsRef.current) {
      console.log("[StudyOS Trace] [App Subscriptions] unsubNotificationsRef already exists, cleaning up first...");
      unsubNotificationsRef.current();
      unsubNotificationsRef.current = null;
    }
    unsubNotificationsRef.current = subscribeNotifications(userState.uid, (notifs) => {
      setHasUnreadNotifs(notifs.some(n => !n.read));
    });

    return () => {
      console.log("[StudyOS Trace] [App Subscriptions] Cleaning up listeners...");
      if (unsubRequestsRef.current) {
        unsubRequestsRef.current();
        unsubRequestsRef.current = null;
      }
      if (unsubNotificationsRef.current) {
        unsubNotificationsRef.current();
        unsubNotificationsRef.current = null;
      }
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

    const lastFocusDate = parseDateUTC(lastFocusStr);
    const todayDate = parseDateUTC(todayStr);

    // Calculate the difference in full days
    const diffDays = getDaysDifference(lastFocusStr, todayStr);

    // If they missed at least one full day between the last focus date and today
    if (diffDays > 1) {
      const missedDates: string[] = [];
      for (let i = 1; i < diffDays; i++) {
        const missedDate = new Date(lastFocusDate.getTime() + i * 24 * 60 * 60 * 1000);
        const year = missedDate.getUTCFullYear();
        const month = String(missedDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(missedDate.getUTCDate()).padStart(2, '0');
        missedDates.push(`${year}-${month}-${day}`);
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
          const missedDateObj = parseDateUTC(dateStr);
          const dayOfWeek = missedDateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
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

        if (!streakBroken && academicStreak > 0) {
          const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
          const yesterdayYear = yesterdayDate.getUTCFullYear();
          const yesterdayMonth = String(yesterdayDate.getUTCMonth() + 1).padStart(2, '0');
          const yesterdayDay = String(yesterdayDate.getUTCDate()).padStart(2, '0');
          dailyResetUpdates.lastActiveDate = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
        }

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
          console.log("[StudyOS Trace] [App.tsx] Explicit sign-out triggered from onboarding screen onSignOut()");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setUserState(null);
          try {
            await auth.signOut();
            console.log("[StudyOS Trace] [App.tsx] Onboarding auth.signOut() completed successfully");
          } catch (err) {
            console.warn("[StudyOS Trace] [App.tsx] Error signing out during onboarding logout:", err);
          }
        }}
      />
    );
  }

  // 3. Syllabus Subject Mapping based on active selections
  const { university, branch, scheme, semester, completedTopics = [] } = userState;
  
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
    const allLookupSubjects = [...activeSubjects, ...backlogSubjects];
    if (sData) {
      Object.keys(sData).forEach((semKey) => {
        const semSubjects = sData[Number(semKey)] || [];
        semSubjects.forEach((sub) => {
          if (!allLookupSubjects.some((s) => s.id === sub.id)) {
            allLookupSubjects.push(sub);
          }
        });
      });
    }
    const result = findTopicById(activeTopicId, allLookupSubjects, []);
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
    if (userState && !(userState.completedTopics || []).includes(topicId)) {
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

    const allLookupSubjects = [...activeSubjects, ...backlogSubjects];
    if (sData) {
      Object.keys(sData).forEach((semKey) => {
        const semSubjects = sData[Number(semKey)] || [];
        semSubjects.forEach((sub) => {
          if (!allLookupSubjects.some((s) => s.id === sub.id)) {
            allLookupSubjects.push(sub);
          }
        });
      });
    }

    const result = findTopicById(topicId, allLookupSubjects, []);
    if (!result) return;

    const { topic, module, subject } = result;

    // Check if already completed to avoid duplicating arrays
    const completedTopicsList = completedTopics || [];
    const isAlreadyCompleted = completedTopicsList.includes(topicId);
    const updatedCompletedTopics = isAlreadyCompleted 
      ? completedTopicsList 
      : [...completedTopicsList, topicId];

    // Calendar Streak Tracking Calculations
    const todayStr = getLocalDateString(); // "YYYY-MM-DD"
    const lastActiveStr = userState.lastActiveDate;
    
    let newStreak = userState.streak || 0;
    
    if (lastActiveStr !== todayStr) {
      if (!lastActiveStr) {
        newStreak = 1;
      } else {
        const diffDays = getDaysDifference(lastActiveStr, todayStr);
        
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1; // Restart streak
        }
      }
    }

    const newLongestStreak = Math.max(userState.longestStreak || 0, newStreak);

    // Track study activity completions counts
    const studyActivityMap = userState.studyActivity || {};
    const currentActivityCount = studyActivityMap[todayStr] || 0;
    const updatedStudyActivity = {
      ...studyActivityMap,
      [todayStr]: currentActivityCount + 1,
    };

    // Experience Awards & Revisions
    const updatedRevisions = [...(userState.revisions || [])];
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
    const alreadyScheduled = (userState.revisions || []).some((r) => r.topicId === topicId);
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
    const updatedCompletedModules = [...(userState.completedModules || [])];
    const isModFinished = module.topics.every((t: any) => updatedCompletedTopics.includes(t.id));
    const wasModAlreadyCompleted = (userState.completedModules || []).includes(module.id);

    if (isModFinished && !wasModAlreadyCompleted) {
      updatedCompletedModules.push(module.id);
      newXp += 250; // Module Completion Bonus
      newLevel = getLevelAndProgress(newXp).level;
      triggeredCelebration = 'module';
    }

    // Check Subject Completion
    const updatedCompletedSubjects = [...(userState.completedSubjects || [])];
    const isSubFinished = subject.modules.every((m: any) => 
      m.topics.every((t: any) => updatedCompletedTopics.includes(t.id))
    );
    const wasSubAlreadyCompleted = (userState.completedSubjects || []).includes(subject.id);

    const updatedBacklogSubjects = [...(userState.backlogSubjects || [])];
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
    const updatedCompletedSemesters = [...(userState.completedSemesters || [])];

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

    const revisionsList = userState.revisions || [];
    const revisionIndex = revisionsList.findIndex((r) => r.id === revisionId);
    if (revisionIndex === -1) return;

    const rev = revisionsList[revisionIndex];
    
    // Experience Award: Revision Completion = 15 XP
    let newXp = (userState.xp || 0) + 15;
    let newLevel = getLevelAndProgress(newXp).level;

    // Streak tracker updates
    const todayStr = getLocalDateString();
    const lastActiveStr = userState.lastActiveDate;
    
    let newStreak = userState.streak || 0;
    if (lastActiveStr !== todayStr) {
      if (!lastActiveStr) {
        newStreak = 1;
      } else {
        const diffDays = getDaysDifference(lastActiveStr, todayStr);
        
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    }
    const newLongestStreak = Math.max(userState.longestStreak || 0, newStreak);

    // Track study activity completions counts
    const studyActivityMap = userState.studyActivity || {};
    const currentActivityCount = studyActivityMap[todayStr] || 0;
    const updatedStudyActivity = {
      ...studyActivityMap,
      [todayStr]: currentActivityCount + 1,
    };

    // Set revision completed flag
    const updatedRevisions = [...revisionsList];
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
    const allLookupSubjects = [...activeSubjects, ...backlogSubjects];
    if (sData) {
      Object.keys(sData).forEach((semKey) => {
        const semSubjects = sData[Number(semKey)] || [];
        semSubjects.forEach((sub) => {
          if (!allLookupSubjects.some((s) => s.id === sub.id)) {
            allLookupSubjects.push(sub);
          }
        });
      });
    }

    const result = findTopicById(rev.topicId, allLookupSubjects, []);
    let moduleName = '';
    let moduleProgressPercent = 0;
    if (result) {
      const { module } = result;
      moduleName = module.name;
      const completedTopicsInModule = module.topics.filter((t: any) => (userState.completedTopics || []).includes(t.id)).length;
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
    console.log("[StudyOS Trace] [App.tsx] Explicit sign-out triggered via handleLogout()");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUserState(null);
    try {
      await auth.signOut();
      console.log("[StudyOS Trace] [App.tsx] Main handleLogout auth.signOut() completed successfully");
    } catch (err) {
      console.warn("[StudyOS Trace] [App.tsx] Error signing out in handleLogout():", err);
    }
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

      {userState.isOffline && (
        <div id="offline-banner" className="bg-amber-500/10 border-b border-amber-500/10 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-amber-400 select-none backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>No internet connection detected. Working in offline mode (changes will sync once you are back online).</span>
        </div>
      )}

      {isCloudSyncUnavailable && !userState.isOffline && (
        <div id="sync-warning-banner" className="bg-orange-500/10 border-b border-orange-500/10 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-orange-400 select-none backdrop-blur-md">
          <AlertCircle className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          <span>Cloud sync temporarily unavailable. Retrying...</span>
        </div>
      )}

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
          isRevisionDue={(userState.revisions || []).some(
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
