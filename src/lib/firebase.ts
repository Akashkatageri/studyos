import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged,
  onIdTokenChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc as originalGetDoc, 
  getDocs as originalGetDocs, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot as originalOnSnapshot,
  writeBatch,
  runTransaction,
  getDocFromServer
} from "firebase/firestore";
import { UserState, FriendProfile, FriendRequest, SocialNotification, SocialActivity } from "../types";
import { getLocalDateString } from "../utils/dateUtils";

// Firebase Applet Configuration (from firebase-applet-config.json)
const firebaseConfig = {
  apiKey: "AIzaSyD9EPI5tjR4hgfXSL8zN5BTsLSyaoBvjS4",
  authDomain: "studyos-001.firebaseapp.com",
  projectId: "studyos-001",
  storageBucket: "studyos-001.firebasestorage.app",
  messagingSenderId: "993152230783",
  appId: "1:993152230783:web:ead624152e5d89ab9be64a",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ===================================================================
// PERSISTENCE AND AUTH EVENT DIAGNOSTICS
// ===================================================================

export function inspectLocalStorage() {
  console.log("[StudyOS Persistence Test] Inspecting LocalStorage for Firebase-related keys...");
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
        if (key.toLowerCase().includes("firebase") || key.toLowerCase().includes("studyos") || key.toLowerCase().includes("auth")) {
          const val = localStorage.getItem(key);
          console.log(`[StudyOS Persistence Test] LocalStorage Key: ${key}, Value:`, val);
        }
      }
    }
    console.log("[StudyOS Persistence Test] All LocalStorage Keys:", JSON.stringify(keys));
  } catch (err) {
    console.error("[StudyOS Persistence Test] Failed to inspect LocalStorage:", err);
  }
}

export async function inspectIndexedDB() {
  console.log("[StudyOS Persistence Test] Starting IndexedDB inspection...");
  
  if (typeof indexedDB === 'undefined') {
    console.warn("[StudyOS Persistence Test] indexedDB is NOT available in this environment.");
    return;
  }

  // Attempt to list all databases if supported
  if (indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases();
      console.log("[StudyOS Persistence Test] Available databases:", JSON.stringify(dbs));
    } catch (e) {
      console.warn("[StudyOS Persistence Test] Failed to list databases:", e);
    }
  }

  const dbName = 'firebaseLocalStorageDb';
  const storeName = 'firebaseLocalStorage';

  const request = indexedDB.open(dbName);

  request.onerror = (event) => {
    console.error(`[StudyOS Persistence Test] Failed to open database ${dbName}:`, request.error);
  };

  request.onsuccess = (event) => {
    const dbInstance = request.result;
    console.log(`[StudyOS Persistence Test] Database ${dbName} opened successfully. Version:`, dbInstance.version);
    
    const objectStoreNames = Array.from(dbInstance.objectStoreNames);
    console.log(`[StudyOS Persistence Test] Object stores in ${dbName}:`, JSON.stringify(objectStoreNames));

    const hasStore = objectStoreNames.includes(storeName);
    console.log(`[StudyOS Persistence Test] Object store '${storeName}' exists:`, hasStore);

    if (hasStore) {
      try {
        const transaction = dbInstance.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        // Count records
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          console.log(`[StudyOS Persistence Test] Count of records in ${storeName}:`, countRequest.result);
        };
        countRequest.onerror = () => {
          console.error(`[StudyOS Persistence Test] Failed to count records in ${storeName}:`, countRequest.error);
        };

        // Read all records
        const getAllKeysRequest = store.getAllKeys();
        getAllKeysRequest.onsuccess = () => {
          const keys = getAllKeysRequest.result;
          console.log(`[StudyOS Persistence Test] All keys in ${storeName}:`, JSON.stringify(keys));
          
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            console.log(`[StudyOS Persistence Test] Retrieved ${records.length} records from ${storeName}.`);
            records.forEach((record, index) => {
              const key = keys[index];
              console.log(`[StudyOS Persistence Test] Record key:`, JSON.stringify(key));
              const recordStr = JSON.stringify(record);
              const hasProjectInfo = recordStr.includes("studyos-001");
              console.log(`[StudyOS Persistence Test] Record contains 'studyos-001' project ID:`, hasProjectInfo);
              console.log(`[StudyOS Persistence Test] Full record data:`, recordStr);
            });
          };
          getAllRequest.onerror = () => {
            console.error(`[StudyOS Persistence Test] Failed to retrieve records from ${storeName}:`, getAllRequest.error);
          };
        };
        getAllKeysRequest.onerror = () => {
          console.error(`[StudyOS Persistence Test] Failed to get keys from ${storeName}:`, getAllKeysRequest.error);
        };

        transaction.oncomplete = () => {
          console.log("[StudyOS Persistence Test] Inspection transaction completed.");
          dbInstance.close();
        };

      } catch (err) {
        console.error(`[StudyOS Persistence Test] Error running transaction on ${storeName}:`, err);
        dbInstance.close();
      }
    } else {
      console.log(`[StudyOS Persistence Test] Since '${storeName}' doesn't exist, closing DB.`);
      dbInstance.close();
    }
  };

  request.onupgradeneeded = (event) => {
    console.log(`[StudyOS Persistence Test] database ${dbName} open requested but it does not exist (triggering onupgradeneeded). DB was NOT present!`);
    request.transaction?.abort();
  };
}

// Run Diagnostics Immediately on Import
inspectLocalStorage();
inspectIndexedDB();

console.log("[StudyOS Persistence Test] Registering global Auth listeners...");

onAuthStateChanged(auth, (user) => {
  console.log(`[StudyOS Auth Log] onAuthStateChanged fired. User UID: ${user ? user.uid : 'null'}`);
});

onIdTokenChanged(auth, (user) => {
  console.log(`[StudyOS Auth Log] onIdTokenChanged fired. User UID: ${user ? user.uid : 'null'}`);
  if (user) {
    user.getIdToken().then(token => {
      console.log(`[StudyOS Auth Log] ID Token fetched successfully for UID: ${user.uid}`);
    }).catch(err => {
      console.error(`[StudyOS Auth Log] Failed to fetch ID Token for UID: ${user.uid}:`, err);
    });
  }
});

if (typeof (auth as any).beforeAuthStateChanged === 'function') {
  console.log("[StudyOS Persistence Test] auth.beforeAuthStateChanged method is available. Registering...");
  (auth as any).beforeAuthStateChanged((user: any) => {
    console.log(`[StudyOS Auth Log] beforeAuthStateChanged callback triggered. User UID: ${user ? user.uid : 'null'}`);
  });
} else {
  console.log("[StudyOS Persistence Test] auth.beforeAuthStateChanged is NOT a function on the Auth instance.");
}

// Initialize Firestore with the named database where all the collections reside.
// This ensures that downloaded code running on localhost still connects to the correct database.
console.log("[StudyOS Trace] Firestore module loading and initializing db with name 'ai-studio-studyos-dab98d62-f9f3-4125-906a-d48f2df82335'...");
export const db = getFirestore(app, "ai-studio-studyos-dab98d62-f9f3-4125-906a-d48f2df82335");
console.log("[StudyOS Trace] Firestore DB object created successfully.");

// -------------------------------------------------------------------
// USER SYNCHRONIZATION HELPERS
// -------------------------------------------------------------------

// Check if a username is unique (excluding current user) with an 8-second timeout
export async function isUsernameUnique(username: string, currentUid?: string): Promise<boolean> {
  if (!username) return false;
  
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Username uniqueness check timed out")), 8000)
  );

  try {
    const usernameDocRef = doc(db, "usernames", username.toLowerCase().trim());
    const snap = await Promise.race([
      getDoc(usernameDocRef),
      timeoutPromise
    ]) as any;
    if (!snap.exists()) return true;
    if (currentUid && snap.data().uid === currentUid) return true;
    return false;
  } catch (err) {
    console.warn("Uniqueness check timed out or failed, defaulting to unique/available offline:", err);
    // Allow proceeding offline/unblocked
    return true;
  }
}

// Map UserState to FriendProfile format for public sync
export function getProfileFromState(state: UserState): Partial<FriendProfile> {
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const activeYesterdayStr = getLocalDateString(yesterday);
  
  let status: 'online' | 'active_yesterday' | 'offline' = 'offline';
  if (state.lastActiveDate === todayStr) {
    status = 'online';
  } else if (state.lastActiveDate === activeYesterdayStr) {
    status = 'active_yesterday';
  }

  return {
    uid: state.uid || "",
    username: state.username,
    displayName: state.displayName || state.username,
    avatar: state.avatar,
    university: state.university,
    branch: state.branch,
    semester: state.semester,
    scheme: state.scheme,
    level: state.level,
    xp: state.xp,
    streak: state.streak,
    longestStreak: state.longestStreak,
    modulesCompleted: state.completedModules?.length || 0,
    semesterProgress: Math.round(
      ((state.completedTopics?.length || 0) / Math.max(state.completedTopics?.length + state.revisions?.length || 1, 15)) * 100
    ),
    joinedDate: state.joinedDate || new Date().toISOString(),
    bio: state.bio || "",
    isPublic: state.isPublic !== false, // default true
    allowFriendRequests: state.allowFriendRequests !== false, // default true
    hideXP: state.hideXP === true,
    hideStreak: state.hideStreak === true,
    hideAchievements: state.hideAchievements === true,
    status,
    lastActive: state.lastActiveDate || undefined,
    badges: [] // populated by client or app
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getDoc(ref: any): Promise<any> {
  const path = ref.path || 'unknown';
  const parts = path.split('/');
  const collectionName = parts[0] || 'unknown';
  const docId = parts.slice(1).join('/') || 'unknown';
  try {
    const snap = await originalGetDoc(ref);
    const metadata = snap.metadata;
    console.log(`[Firestore READ] getDoc SUCCESS
- Collection: "${collectionName}"
- Document: "${docId}"
- Success: true
- Failure: false
- Firebase error code: null
- Exception message: null
- fromCache: ${metadata?.fromCache}
- hasPendingWrites: ${metadata?.hasPendingWrites}`);
    return snap;
  } catch (err: any) {
    const errorCode = err.code || 'unknown';
    const message = err.message || String(err);
    console.error(`[Firestore READ] getDoc FAILURE
- Collection: "${collectionName}"
- Document: "${docId}"
- Success: false
- Failure: true
- Firebase error code: "${errorCode}"
- Exception message: "${message}"`);
    throw err;
  }
}

export async function getDocs(q: any): Promise<any> {
  let collectionName = 'unknown';
  if (q.path) {
    collectionName = q.path;
  } else if (q._query && q._query.path) {
    collectionName = q._query.path.toString();
  } else if (q.query && q.query.path) {
    collectionName = q.query.path.toString();
  }
  try {
    const snap = await originalGetDocs(q);
    const metadata = snap.metadata;
    console.log(`[Firestore READ] getDocs SUCCESS
- Collection: "${collectionName}"
- Document: null (Collection Query)
- Success: true
- Failure: false
- Firebase error code: null
- Exception message: null
- fromCache: ${metadata?.fromCache}
- hasPendingWrites: ${metadata?.hasPendingWrites}`);
    return snap;
  } catch (err: any) {
    const errorCode = err.code || 'unknown';
    const message = err.message || String(err);
    console.error(`[Firestore READ] getDocs FAILURE
- Collection: "${collectionName}"
- Document: null (Collection Query)
- Success: false
- Failure: true
- Firebase error code: "${errorCode}"
- Exception message: "${message}"`);
    throw err;
  }
}

export function onSnapshot(refOrQuery: any, onNext: any, onError?: any): () => void {
  let path = 'unknown';
  let isDoc = false;
  if (refOrQuery.path) {
    path = refOrQuery.path;
    isDoc = true;
  } else if (refOrQuery._query && refOrQuery._query.path) {
    path = refOrQuery._query.path.toString();
  } else if (refOrQuery.query && refOrQuery.query.path) {
    path = refOrQuery.query.path.toString();
  }

  const collectionName = isDoc ? (path.split('/')[0] || 'unknown') : path;
  const docId = isDoc ? (path.split('/').slice(1).join('/') || 'unknown') : null;

  console.log(`[Firestore READ] onSnapshot listener registered for Collection: "${collectionName}"${docId ? `, Document: "${docId}"` : ''}`);

  return originalOnSnapshot(refOrQuery, (snap: any) => {
    const metadata = snap.metadata;
    console.log(`[Firestore READ] onSnapshot SUCCESS
- Collection: "${collectionName}"
- Document: ${docId ? `"${docId}"` : 'null'}
- Success: true
- Failure: false
- Firebase error code: null
- Exception message: null
- fromCache: ${metadata?.fromCache}
- hasPendingWrites: ${metadata?.hasPendingWrites}`);
    onNext(snap);
  }, (err: any) => {
    const errorCode = err.code || 'unknown';
    const message = err.message || String(err);
    console.error(`[Firestore READ] onSnapshot FAILURE
- Collection: "${collectionName}"
- Document: ${docId ? `"${docId}"` : 'null'}
- Success: false
- Failure: true
- Firebase error code: "${errorCode}"
- Exception message: "${message}"`);
    if (onError) {
      onError(err);
    }
  });
}

// Sync local user state to Cloud Firestore (Separate Collections: users, settings, studyStats)
export async function syncUserToFirestore(uid: string, state: UserState): Promise<void> {
  if (!uid) {
    console.log("[StudyOS Trace] syncUserToFirestore skipped: UID is falsy.");
    return;
  }
  if (state.isOffline) {
    console.log(`[StudyOS Trace] syncUserToFirestore skipped: state.isOffline is true for UID: ${uid}`);
    return;
  }
  if (!state.onboarded) {
    console.log(`[StudyOS Trace] syncUserToFirestore skipped: state.onboarded is false for UID: ${uid}`);
    return;
  }
  
  console.log(`[StudyOS Trace] syncUserToFirestore starting for UID: ${uid} (username: @${state.username}, level: ${state.level}, streak: ${state.streak})`);
  
  try {
    const publicProfile = getProfileFromState(state);
    
    // 1. Root Profile: /users/{uid}
    const userDocRef = doc(db, "users", uid);
    const profileData = {
      uid,
      username: state.username,
      displayName: state.displayName || state.username,
      avatar: state.avatar,
      university: state.university,
      branch: state.branch,
      semester: state.semester,
      scheme: state.scheme,
      firstYearCycle: state.firstYearCycle || null,
      level: state.level || 1,
      xp: state.xp || 0,
      streak: state.streak || 0,
      longestStreak: state.longestStreak || 0,
      modulesCompleted: state.completedModules?.length || 0,
      semesterProgress: publicProfile.semesterProgress || 0,
      joinedDate: state.joinedDate || new Date().toISOString(),
      status: publicProfile.status || 'offline',
      lastActive: state.lastActiveDate || null,
      lastActiveDate: state.lastActiveDate || null,
      badges: state.unlockedAchievements || [],
      isPublic: state.isPublic !== false,
      allowFriendRequests: state.allowFriendRequests !== false,
      hideXP: state.hideXP === true,
      hideStreak: state.hideStreak === true,
      hideAchievements: state.hideAchievements === true,
      bio: state.bio || ""
    };
    await setDoc(userDocRef, profileData, { merge: true });

    // 2. Settings Profile: /settings/{uid}
    const settingsDocRef = doc(db, "settings", uid);
    const settingsData = {
      isPublic: state.isPublic !== false,
      allowFriendRequests: state.allowFriendRequests !== false,
      hideXP: state.hideXP === true,
      hideStreak: state.hideStreak === true,
      hideAchievements: state.hideAchievements === true,
      bio: state.bio || "",
      email: state.email || ""
    };
    await setDoc(settingsDocRef, settingsData, { merge: true });

    // 3. Progress Stats Profile: /studyStats/{uid}
    const statsDocRef = doc(db, "studyStats", uid);
    const statsData = {
      completedTopics: state.completedTopics || [],
      completedModules: state.completedModules || [],
      completedSubjects: state.completedSubjects || [],
      completedSemesters: state.completedSemesters || [],
      backlogSubjects: state.backlogSubjects || [],
      revisions: state.revisions || [],
      inProgressTopics: state.inProgressTopics || [],
      studyActivity: state.studyActivity || {},
      unlockedAchievements: state.unlockedAchievements || [],
      // Focus Habit fields
      dailyFocusGoal: state.dailyFocusGoal ?? 30,
      academicStudyStreak: state.academicStudyStreak ?? 0,
      longestStudyStreak: state.longestStudyStreak ?? 0,
      totalFocusMinutes: state.totalFocusMinutes ?? 0,
      weeklyFocusMinutes: state.weeklyFocusMinutes ?? 0,
      monthlyFocusMinutes: state.monthlyFocusMinutes ?? 0,
      totalFocusSessions: state.totalFocusSessions ?? 0,
      longestFocusSessionMinutes: state.longestFocusSessionMinutes ?? 0,
      todayFocusMinutes: state.todayFocusMinutes ?? 0,
      todayFocusXPRewarded: state.todayFocusXPRewarded ?? 0,
      studyShields: state.studyShields ?? 3,
      weeklyStudySchedule: state.weeklyStudySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      semesterStartDate: state.semesterStartDate || null,
      semesterEndDate: state.semesterEndDate || null,
      semesterBreaks: state.semesterBreaks || [],
      vacationMode: state.vacationMode || { active: false, startDate: null, endDate: null },
      semesterBreakMode: state.semesterBreakMode || false,
      lastFocusDate: state.lastFocusDate || null,
      lastActiveDate: state.lastActiveDate || null,
      focusHistory: state.focusHistory || {},
      subjectDifficulties: state.subjectDifficulties || {}
    };
    await setDoc(statsDocRef, statsData, { merge: true });

    // 4. Reserve username: /usernames/{username_lowercase}
    if (state.username) {
      const usernameKey = state.username.toLowerCase().trim();
      const usernameDocRef = doc(db, "usernames", usernameKey);
      await setDoc(usernameDocRef, { uid, username: state.username.trim() }, { merge: true });
    }
    console.log(`[StudyOS Trace] syncUserToFirestore SUCCEEDED for UID: ${uid}`);
  } catch (err) {
    console.error(`[StudyOS Trace] syncUserToFirestore FAILED for UID: ${uid}. Error:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

// Load user state from Firestore (Merging from separate collections) with a 10-second timeout fallback
export async function loadUserFromFirestore(uid: string): Promise<UserState | null> {
  if (!uid) {
    console.log("[StudyOS Trace] loadUserFromFirestore called but UID is falsy.");
    return null;
  }
  
  console.log(`[StudyOS Trace] loadUserFromFirestore starting for UID: ${uid}`);
  
  // Timeout helper to prevent infinite hangs on slower or blocked connections
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Connection to cloud database timed out. Please check your network or Firestore settings.")), 10000)
  );

  try {
    const userDocRef = doc(db, "users", uid);
    
    // Fetch user doc first to check if they exist
    const userSnap = await Promise.race([
      getDoc(userDocRef).catch(err => {
        console.error(`[StudyOS Trace] loadUserFromFirestore error fetching userDocRef (users/${uid}):`, err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        throw err;
      }),
      timeoutPromise
    ]);

    if (!userSnap.exists()) {
      console.log(`[StudyOS Trace] loadUserFromFirestore completed: No user profile doc exists in cloud for UID: ${uid}`);
      return null;
    }

    console.log(`[StudyOS Trace] loadUserFromFirestore found user profile doc in cloud for UID: ${uid}`);

    const userData = userSnap.data();

    // Only if user exists, fetch settings and studyStats
    const settingsDocRef = doc(db, "settings", uid);
    const statsDocRef = doc(db, "studyStats", uid);

    const [settingsSnap, statsSnap] = await Promise.race([
      Promise.all([
        getDoc(settingsDocRef).catch(err => {
          console.warn(`Non-blocking settings fetch error (settings/${uid}):`, err);
          return null; // Return null instead of crashing the whole load
        }),
        getDoc(statsDocRef).catch(err => {
          console.warn(`Non-blocking studyStats fetch error (studyStats/${uid}):`, err);
          return null; // Return null instead of crashing the whole load
        })
      ]),
      timeoutPromise
    ]);

    const settingsData = (settingsSnap && settingsSnap.exists()) ? settingsSnap.data() : {};
    const statsData = (statsSnap && statsSnap.exists()) ? statsSnap.data() : {};
    
    const loadedState = {
      ...userData,
      ...settingsData,
      ...statsData,
      lastActiveDate: userData?.lastActive || userData?.lastActiveDate || statsData?.lastActiveDate || null,
      uid,
      onboarded: true,
      isOffline: false
    } as UserState;

    console.log(`[StudyOS Trace] loadUserFromFirestore SUCCEEDED. Loaded username: @${loadedState.username}, level: ${loadedState.level}, streak: ${loadedState.streak}`);
    return loadedState;
  } catch (err) {
    console.error(`[StudyOS Trace] loadUserFromFirestore FAILED for UID: ${uid}. Error:`, err);
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    throw err;
  }
}

// Merges local offline progress with cloud data to prevent loss
export function mergeLocalAndCloudStates(local: UserState, cloud: UserState): UserState {
  const completedTopics = Array.from(new Set([...(local.completedTopics || []), ...(cloud.completedTopics || [])]));
  const completedModules = Array.from(new Set([...(local.completedModules || []), ...(cloud.completedModules || [])]));
  const completedSubjects = Array.from(new Set([...(local.completedSubjects || []), ...(cloud.completedSubjects || [])]));
  const completedSemesters = Array.from(new Set([...(local.completedSemesters || []), ...(cloud.completedSemesters || [])]));
  const backlogSubjects = Array.from(new Set([...(local.backlogSubjects || []), ...(cloud.backlogSubjects || [])]));
  const inProgressTopics = Array.from(new Set([...(local.inProgressTopics || []), ...(cloud.inProgressTopics || [])]));
  
  const allRevisions = [...(local.revisions || []), ...(cloud.revisions || [])];
  const uniqueRevisions = allRevisions.reduce((acc, current) => {
    if (!acc.some(r => r.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof local.revisions);

  const mergedStudyActivity = { ...(cloud.studyActivity || {}), ...(local.studyActivity || {}) };
  for (const day in local.studyActivity) {
    if (cloud.studyActivity && cloud.studyActivity[day]) {
      mergedStudyActivity[day] = Math.max(local.studyActivity[day], cloud.studyActivity[day]);
    }
  }

  const unlockedAchievements = Array.from(new Set([...(local.unlockedAchievements || []), ...(cloud.unlockedAchievements || [])]));

  const mergedFocusHistory = { ...(cloud.focusHistory || {}), ...(local.focusHistory || {}) };
  for (const day in local.focusHistory) {
    if (cloud.focusHistory && cloud.focusHistory[day]) {
      mergedFocusHistory[day] = Math.max(local.focusHistory[day], cloud.focusHistory[day]);
    }
  }

  return {
    ...cloud,
    ...local,
    xp: Math.max(local.xp || 0, cloud.xp || 0),
    level: Math.max(local.level || 1, cloud.level || 1),
    streak: Math.max(local.streak || 0, cloud.streak || 0),
    longestStreak: Math.max(local.longestStreak || 0, cloud.longestStreak || 0),
    // Merge new focus stats
    dailyFocusGoal: cloud.dailyFocusGoal || local.dailyFocusGoal || 30,
    academicStudyStreak: Math.max(local.academicStudyStreak || 0, cloud.academicStudyStreak || 0),
    longestStudyStreak: Math.max(local.longestStudyStreak || 0, cloud.longestStudyStreak || 0),
    totalFocusMinutes: Math.max(local.totalFocusMinutes || 0, cloud.totalFocusMinutes || 0),
    weeklyFocusMinutes: Math.max(local.weeklyFocusMinutes || 0, cloud.weeklyFocusMinutes || 0),
    monthlyFocusMinutes: Math.max(local.monthlyFocusMinutes || 0, cloud.monthlyFocusMinutes || 0),
    totalFocusSessions: Math.max(local.totalFocusSessions || 0, cloud.totalFocusSessions || 0),
    longestFocusSessionMinutes: Math.max(local.longestFocusSessionMinutes || 0, cloud.longestFocusSessionMinutes || 0),
    todayFocusMinutes: Math.max(local.todayFocusMinutes || 0, cloud.todayFocusMinutes || 0),
    todayFocusXPRewarded: Math.max(local.todayFocusXPRewarded || 0, cloud.todayFocusXPRewarded || 0),
    studyShields: cloud.studyShields ?? local.studyShields ?? 3,
    weeklyStudySchedule: cloud.weeklyStudySchedule || local.weeklyStudySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    semesterStartDate: cloud.semesterStartDate || local.semesterStartDate || null,
    semesterEndDate: cloud.semesterEndDate || local.semesterEndDate || null,
    semesterBreaks: cloud.semesterBreaks || local.semesterBreaks || [],
    vacationMode: cloud.vacationMode || local.vacationMode || { active: false, startDate: null, endDate: null },
    semesterBreakMode: cloud.semesterBreakMode ?? local.semesterBreakMode ?? false,
    lastFocusDate: cloud.lastFocusDate || local.lastFocusDate || null,
    focusHistory: mergedFocusHistory,
    completedTopics,
    completedModules,
    completedSubjects,
    completedSemesters,
    backlogSubjects,
    revisions: uniqueRevisions,
    studyActivity: mergedStudyActivity,
    unlockedAchievements,
    isOffline: false,
    onboarded: true,
    subjectDifficulties: { ...(cloud.subjectDifficulties || {}), ...(local.subjectDifficulties || {}) }
  };
}

// Atomic username registration inside a Firestore transaction with a 12-second timeout fallback
export async function registerUserProfileTransaction(uid: string, username: string, state: UserState): Promise<void> {
  const usernameKey = username.toLowerCase().trim();
  const usernameDocRef = doc(db, "usernames", usernameKey);
  const userDocRef = doc(db, "users", uid);
  const settingsDocRef = doc(db, "settings", uid);
  const statsDocRef = doc(db, "studyStats", uid);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Cloud registration timed out. Please check your connection or Firestore Database setup.")), 12000)
  );

  try {
    await Promise.race([
      runTransaction(db, async (transaction) => {
        const usernameSnap = await transaction.get(usernameDocRef);
        if (usernameSnap.exists()) {
          const existingData = usernameSnap.data();
          if (existingData.uid !== uid) {
            throw new Error("USERNAME_TAKEN");
          }
        }

        const publicProfile = getProfileFromState(state);
        
        const profileData = {
          uid,
          username,
          displayName: state.displayName || username,
          avatar: state.avatar,
          university: state.university,
          branch: state.branch,
          semester: state.semester,
          scheme: state.scheme,
          firstYearCycle: state.firstYearCycle || null,
          level: state.level || 1,
          xp: state.xp || 0,
          streak: state.streak || 0,
          longestStreak: state.longestStreak || 0,
          modulesCompleted: state.completedModules?.length || 0,
          semesterProgress: publicProfile.semesterProgress || 0,
          joinedDate: state.joinedDate || new Date().toISOString(),
          status: publicProfile.status || 'offline',
          lastActive: state.lastActiveDate || null,
          badges: state.unlockedAchievements || [],
          isPublic: state.isPublic !== false,
          allowFriendRequests: state.allowFriendRequests !== false,
          hideXP: state.hideXP === true,
          hideStreak: state.hideStreak === true,
          hideAchievements: state.hideAchievements === true,
          bio: state.bio || ""
        };

        const settingsData = {
          isPublic: state.isPublic !== false,
          allowFriendRequests: state.allowFriendRequests !== false,
          hideXP: state.hideXP === true,
          hideStreak: state.hideStreak === true,
          hideAchievements: state.hideAchievements === true,
          bio: state.bio || "",
          email: state.email || ""
        };

        const statsData = {
          completedTopics: state.completedTopics || [],
          completedModules: state.completedModules || [],
          completedSubjects: state.completedSubjects || [],
          completedSemesters: state.completedSemesters || [],
          backlogSubjects: state.backlogSubjects || [],
          revisions: state.revisions || [],
          inProgressTopics: state.inProgressTopics || [],
          studyActivity: state.studyActivity || {},
          unlockedAchievements: state.unlockedAchievements || []
        };

        transaction.set(usernameDocRef, { uid, username: username.trim() });
        transaction.set(userDocRef, profileData, { merge: true });
        transaction.set(settingsDocRef, settingsData, { merge: true });
        transaction.set(statsDocRef, statsData, { merge: true });
      }),
      timeoutPromise
    ]);
  } catch (err: any) {
    if (err.message === "USERNAME_TAKEN") {
      throw new Error("This username is already taken. Please choose another one.");
    }
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

// -------------------------------------------------------------------
// FRIEND REQUESTS & SOCIAL SYSTEM
// -------------------------------------------------------------------

// Send a friend request
export async function sendFriendRequest(senderState: UserState, receiverProfile: FriendProfile): Promise<void> {
  if (!senderState.uid || !receiverProfile.uid) return;
  if (senderState.uid === receiverProfile.uid) return;

  const reqId = `${senderState.uid}_${receiverProfile.uid}`;
  const reqRef = doc(db, "friendRequests", reqId);

  const request: FriendRequest = {
    id: reqId,
    senderId: senderState.uid,
    senderUsername: senderState.username,
    senderDisplayName: senderState.displayName || senderState.username,
    senderAvatar: senderState.avatar,
    receiverId: receiverProfile.uid,
    receiverUsername: receiverProfile.username,
    receiverDisplayName: receiverProfile.displayName || receiverProfile.username,
    receiverAvatar: receiverProfile.avatar,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await setDoc(reqRef, request);

  // Trigger Notification to receiver
  await createNotification(
    receiverProfile.uid,
    "New Friend Request",
    `${senderState.displayName || senderState.username} sent you a friend request!`,
    'friend_request',
    senderState.uid,
    senderState.username,
    senderState.avatar
  );
}

// Cancel a sent friend request
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, "friendRequests", requestId);
  await deleteDoc(reqRef);
}

// Decline friend request
export async function declineFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, "friendRequests", requestId);
  await deleteDoc(reqRef); // Simplest to delete on decline to allow re-requesting later
}

// Accept a friend request
export async function acceptFriendRequest(request: FriendRequest, myState: UserState): Promise<void> {
  const reqRef = doc(db, "friendRequests", request.id);
  
  // 1. Mark request as accepted
  await updateDoc(reqRef, { status: 'accepted' });

  // 2. Add friendship document
  const friendshipId = request.senderId < request.receiverId 
    ? `${request.senderId}_${request.receiverId}` 
    : `${request.receiverId}_${request.senderId}`;
    
  const friendshipRef = doc(db, "friendships", friendshipId);
  await setDoc(friendshipRef, {
    id: friendshipId,
    uids: [request.senderId, request.receiverId],
    createdAt: new Date().toISOString()
  });

  // 3. Create Notification for the sender
  await createNotification(
    request.senderId,
    "Friend Request Accepted",
    `${request.receiverDisplayName || request.receiverUsername} accepted your friend request!`,
    'friend_accept',
    myState.uid || "",
    myState.username,
    myState.avatar
  );

  // 4. Record recent activity for both
  await createActivity(
    request.senderId,
    request.senderUsername,
    request.senderAvatar,
    `Became friends with ${request.receiverDisplayName || request.receiverUsername}!`
  );

  await createActivity(
    request.receiverId,
    request.receiverUsername,
    request.receiverAvatar,
    `Became friends with ${request.senderDisplayName || request.senderUsername}!`
  );
}

// Remove an accepted friend
export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const friendshipId = myUid < friendUid 
    ? `${myUid}_${friendUid}` 
    : `${friendUid}_${myUid}`;
  
  const friendshipRef = doc(db, "friendships", friendshipId);
  await deleteDoc(friendshipRef);

  // Clean up any remaining friend request documents
  const batch = writeBatch(db);
  batch.delete(doc(db, "friendRequests", `${myUid}_${friendUid}`));
  batch.delete(doc(db, "friendRequests", `${friendUid}_${myUid}`));
  await batch.commit();
}

// -------------------------------------------------------------------
// LEADERBOARD & DIRECTORY QUERIES
// -------------------------------------------------------------------

// Retrieve all public users to calculate leaderboards and search
export async function getAllPublicProfiles(): Promise<FriendProfile[]> {
  // To be fully backwards-compatible with existing users who do not have the isPublic field denormalized,
  // we fetch all users from the database and perform a robust client-side filter where isPublic !== false.
  const q = collection(db, "users");
  const snap = await getDocs(q);
  const profiles: FriendProfile[] = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.isPublic !== false) {
      profiles.push({
        uid: data.uid || d.id,
        username: data.username || "",
        displayName: data.displayName || data.username || "",
        avatar: data.avatar || "🎓",
        university: data.university || "",
        branch: data.branch || "",
        semester: data.semester || 1,
        scheme: data.scheme || "",
        level: data.level || 1,
        xp: data.xp || 0,
        streak: data.streak || 0,
        longestStreak: data.longestStreak || 0,
        modulesCompleted: data.modulesCompleted || 0,
        semesterProgress: data.semesterProgress || 0,
        joinedDate: data.joinedDate || new Date().toISOString(),
        bio: data.bio || "",
        isPublic: data.isPublic !== false,
        allowFriendRequests: data.allowFriendRequests !== false,
        hideXP: data.hideXP === true,
        hideStreak: data.hideStreak === true,
        hideAchievements: data.hideAchievements === true,
        status: data.status || 'offline',
        lastActive: data.lastActive || undefined,
        badges: data.badges || []
      } as FriendProfile);
    }
  });
  return profiles;
}

// Retrieve accepted friends profiles
export async function getFriendsList(myUid: string): Promise<FriendProfile[]> {
  if (!myUid) return [];
  const q = query(collection(db, "friendships"), where("uids", "array-contains", myUid));
  const snap = await getDocs(q);
  
  const friendUids: string[] = [];
  snap.forEach((d) => {
    const data = d.data();
    const otherUid = data.uids.find((id: string) => id !== myUid);
    if (otherUid) friendUids.push(otherUid);
  });

  if (friendUids.length === 0) return [];

  // Fetch full details for each friend profile
  const profiles: FriendProfile[] = [];
  for (const fUid of friendUids) {
    const userDocRef = doc(db, "users", fUid);
    const uSnap = await getDoc(userDocRef);
    if (uSnap.exists()) {
      profiles.push(uSnap.data() as FriendProfile);
    }
  }

  return profiles;
}

// Retrieve friend requests associated with user
export function subscribeFriendRequests(userId: string, callback: (requests: FriendRequest[]) => void) {
  if (!userId) return () => {};
  
  // Find requests where user is either sender or receiver and status is 'pending'
  const q = query(
    collection(db, "friendRequests"), 
    where("receiverId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    const requests: FriendRequest[] = [];
    snap.forEach((d) => {
      requests.push(d.data() as FriendRequest);
    });
    callback(requests);
  });
}

// Retrieve sent friend requests
export function subscribeSentRequests(userId: string, callback: (requests: FriendRequest[]) => void) {
  if (!userId) return () => {};
  
  const q = query(
    collection(db, "friendRequests"), 
    where("senderId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    const requests: FriendRequest[] = [];
    snap.forEach((d) => {
      requests.push(d.data() as FriendRequest);
    });
    callback(requests);
  });
}

// Retrieve notifications with subscription
export function subscribeNotifications(userId: string, callback: (notifications: SocialNotification[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const notifications: SocialNotification[] = [];
    snap.forEach((d) => {
      notifications.push(d.data() as SocialNotification);
    });
    // Sort in-memory to prevent requiring firestore index
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(notifications);
  });
}

// Mark notification as read
export async function markNotificationAsRead(notifId: string): Promise<void> {
  const notifRef = doc(db, "notifications", notifId);
  await updateDoc(notifRef, { read: true });
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

// Retrieve recent activity for a list of friends
export async function getFriendsActivities(friendUids: string[]): Promise<SocialActivity[]> {
  if (!friendUids || friendUids.length === 0) return [];
  
  const activities: SocialActivity[] = [];
  // Since firestore doesn't support massive "IN" lists efficiently, fetch in batches or sequentially
  const uidsToQuery = friendUids.slice(0, 10); // Limit to top 10 friends for performance
  
  for (const uid of uidsToQuery) {
    const q = query(collection(db, "activities"), where("userId", "==", uid));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      activities.push(d.data() as SocialActivity);
    });
  }

  // Sort activities by date descending
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);
}

// Fetch activities for a single user
export async function getUserActivities(userId: string): Promise<SocialActivity[]> {
  if (!userId) return [];
  const q = query(collection(db, "activities"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const acts: SocialActivity[] = [];
  snap.forEach((d) => {
    acts.push(d.data() as SocialActivity);
  });
  return acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
}

// -------------------------------------------------------------------
// SYSTEM NOTIFICATION AND ACTIVITY CREATORS
// -------------------------------------------------------------------

export async function createNotification(
  userId: string, 
  title: string, 
  message: string, 
  type: SocialNotification['type'],
  senderId: string,
  senderUsername: string,
  senderAvatar: string
): Promise<void> {
  const notifId = `${userId}_notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const notifRef = doc(db, "notifications", notifId);
  const notification: SocialNotification = {
    id: notifId,
    userId,
    title,
    message,
    type,
    senderId,
    senderUsername,
    senderAvatar,
    read: false,
    createdAt: new Date().toISOString()
  };
  await setDoc(notifRef, notification);
}

export async function createActivity(
  userId: string,
  username: string,
  avatar: string,
  text: string
): Promise<void> {
  const actId = `act_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const actRef = doc(db, "activities", actId);
  const activity: SocialActivity = {
    id: actId,
    userId,
    username,
    avatar,
    text,
    createdAt: new Date().toISOString()
  };
  await setDoc(actRef, activity);
}

// Trigger social notifications & activity cards for study milestones (streak, level, semester completion)
export async function triggerSocialMilestone(
  state: UserState,
  type: 'level' | 'semester' | 'streak',
  val: number
): Promise<void> {
  if (!state.uid) return;

  const displayName = state.displayName || state.username;
  let text = "";
  let title = "";
  let notifType: SocialNotification['type'] = 'friend_level';

  if (type === 'level') {
    text = `Reached Level ${val}! ✨`;
    title = "Classmate Levelled Up!";
    notifType = 'friend_level';
  } else if (type === 'semester') {
    text = `Completed Semester ${val}! 🎓`;
    title = "Semester Conquered!";
    notifType = 'friend_semester';
  } else if (type === 'streak') {
    text = `Maintained a ${val}-day study streak! 🔥`;
    title = "Streak Milestone!";
    notifType = 'friend_streak';
  }

  // 1. Create personal activity document
  await createActivity(state.uid, state.username, state.avatar, text);

  // 2. Fetch friend list to broadcast notifications
  try {
    const friendshipsQ = query(collection(db, "friendships"), where("uids", "array-contains", state.uid));
    const friendshipsSnap = await getDocs(friendshipsQ);
    const friendUids: string[] = [];
    friendshipsSnap.forEach((d) => {
      const data = d.data();
      const otherUid = data.uids.find((id: string) => id !== state.uid);
      if (otherUid) friendUids.push(otherUid);
    });

    // 3. Dispatch notification documents to all friends
    for (const fUid of friendUids) {
      await createNotification(
        fUid,
        title,
        `${displayName} ${text}`,
        notifType,
        state.uid,
        state.username,
        state.avatar
      );
    }
  } catch (err) {
    console.error("Error broadcasting milestone notification:", err);
  }
}

/**
 * Generate a random 6-digit pairing code and write a pending document in device_links
 */
export async function createDevicePairingCode(deviceId?: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const docRef = doc(db, "device_links", code);
  await setDoc(docRef, {
    status: "pending",
    createdAt: new Date().toISOString(),
    deviceId: deviceId || "unknown"
  });
  return code;
}

/**
 * Link an authenticated Google account user state with a pending pairing code
 */
export async function linkDeviceWithAccount(
  code: string, 
  uid: string, 
  userState: any,
  encryptedIdToken?: string | null,
  encryptedAccessToken?: string | null
): Promise<void> {
  const docRef = doc(db, "device_links", code);
  await setDoc(docRef, {
    status: "paired",
    uid: uid,
    userState: userState,
    encryptedIdToken: encryptedIdToken || null,
    encryptedAccessToken: encryptedAccessToken || null,
    pairedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Real-time listener for device pairing completion
 */
export function listenToDevicePairing(
  code: string, 
  onPair: (uid: string, userState: any, encryptedIdToken: string | null, encryptedAccessToken: string | null) => void, 
  onError: (err: any) => void
): () => void {
  const docRef = doc(db, "device_links", code);
  console.log(`[TRACER] [listenToDevicePairing] Subscribed to code: "${code}"`);
  return onSnapshot(docRef, (docSnap) => {
    try {
      console.log(`[TRACER] [onSnapshot] Fired for code: "${code}". Document exists: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data) {
          console.warn("[TRACER] [onSnapshot] Document exists but has NO data!");
          return;
        }
        
        const keys = Object.keys(data);
        console.log("[TRACER] [onSnapshot] Document keys:", keys);
        console.log("[TRACER] [onSnapshot] Field details:", {
          status: data.status,
          uid: data.uid,
          hasEncryptedIdToken: !!data.encryptedIdToken,
          hasEncryptedAccessToken: !!data.encryptedAccessToken,
          hasUserState: !!data.userState
        });

        if (data.status === "paired" && data.uid) {
          console.log("[TRACER] [onSnapshot] Status is 'paired' with valid uid. Invoking onPair callback...");
          onPair(
            data.uid, 
            data.userState || null, 
            data.encryptedIdToken || null, 
            data.encryptedAccessToken || null
          );
        } else {
          console.log(`[TRACER] [onSnapshot] Status or UID mismatch: status="${data.status}", uid="${data.uid}"`);
        }
      } else {
        console.log(`[TRACER] [onSnapshot] Document does not exist for code: "${code}"`);
      }
    } catch (err: any) {
      console.error("[TRACER] [onSnapshot] Exception inside onSnapshot handler:", err);
    }
  }, (err) => {
    console.error("[TRACER] [onSnapshot] Firestore listen error:", err);
    onError(err);
  });
}

