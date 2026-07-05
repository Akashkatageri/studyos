import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search as SearchIcon, 
  Bell, 
  Trophy, 
  Flame, 
  Award, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Check, 
  X, 
  UserPlus, 
  UserMinus, 
  ShieldAlert, 
  Sparkles, 
  Lock, 
  Unlock, 
  Compass, 
  ArrowLeft,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState, FriendProfile, FriendRequest, SocialNotification, SocialActivity } from '../types';
import { SoundManager } from '../utils/soundManager';
import { 
  auth, 
  googleProvider, 
  isUsernameUnique, 
  syncUserToFirestore, 
  loadUserFromFirestore, 
  sendFriendRequest, 
  cancelFriendRequest, 
  declineFriendRequest, 
  acceptFriendRequest, 
  removeFriend, 
  getAllPublicProfiles, 
  getFriendsList, 
  subscribeFriendRequests, 
  subscribeSentRequests, 
  subscribeNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getFriendsActivities, 
  getUserActivities,
  createActivity,
  createNotification,
  db,
  getProfileFromState
} from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import FriendProfileModal from './friends/FriendProfileModal';
import FriendsPrivacyModal from './friends/FriendsPrivacyModal';
import NotificationCenterModal from './friends/NotificationCenterModal';

interface FriendsTabProps {
  userState: UserState;
  onUpdateState: (updated: Partial<UserState>) => void;
  onTriggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function FriendsTab({ userState, onUpdateState, onTriggerToast }: FriendsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'search' | 'leaderboard'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<FriendProfile[]>([]);
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  
  // Real-time Firestore subscriptions
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [friendsActivities, setFriendsActivities] = useState<SocialActivity[]>([]);
  
  // Modals & detail views
  const [selectedProfile, setSelectedProfile] = useState<FriendProfile | null>(null);
  const [selectedUserActivities, setSelectedUserActivities] = useState<SocialActivity[]>([]);
  const [privacySettingsOpen, setPrivacySettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  // Leaderboard filters
  const [leaderboardCategory, setLeaderboardCategory] = useState<
    'weekly_xp' | 'monthly_xp' | 'current_streak' | 'longest_streak' | 'topics' | 'modules' | 'semester'
  >('weekly_xp');
  const [leaderboardScope, setLeaderboardScope] = useState<'global' | 'friends'>('global');

  // Load friends list and public directory
  const loadDirectoryAndFriends = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch current accepted friends list if userState.uid is defined
      if (userState.uid) {
        const friends = await getFriendsList(userState.uid);
        setFriendsList(friends);

        // Fetch friend activities
        const friendUids = friends.map(f => f.uid);
        if (friendUids.length > 0) {
          const acts = await getFriendsActivities(friendUids);
          setFriendsActivities(acts);
        } else {
          setFriendsActivities([]);
        }
      } else {
        setFriendsList([]);
        setFriendsActivities([]);
      }

      // 2. Fetch all public profiles
      let allPublic: FriendProfile[] = [];
      try {
        allPublic = await getAllPublicProfiles();
      } catch (err) {
        console.error("Error fetching public profiles from Firestore:", err);
      }

      // Filter out our own profile from search results if logged in
      const filteredPublic = userState.uid
        ? allPublic.filter(p => p.uid !== userState.uid)
        : allPublic;
      setPublicProfiles(filteredPublic);
    } catch (e) {
      console.error("Error loading social directory:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Setup live listeners on login status change
  useEffect(() => {
    // Always load public directory and leaderboard metrics on mount or login change
    loadDirectoryAndFriends();

    if (!userState.uid) {
      setReceivedRequests([]);
      setSentRequests([]);
      setNotifications([]);
      return;
    }

    // Subscribe to incoming friend requests
    const unsubReceived = subscribeFriendRequests(userState.uid, (requests) => {
      setReceivedRequests(requests);
    });

    // Subscribe to outgoing friend requests
    const unsubSent = subscribeSentRequests(userState.uid, (requests) => {
      setSentRequests(requests);
    });

    // Subscribe to system notifications
    const unsubNotifications = subscribeNotifications(userState.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubReceived();
      unsubSent();
      unsubNotifications();
    };
  }, [userState.uid]);

  // Perform search locally across public profiles for lightning-fast feedback
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = publicProfiles.filter(p => 
      p.username.toLowerCase().includes(q) || 
      (p.displayName && p.displayName.toLowerCase().includes(q))
    );
    setSearchResults(matches);
  }, [searchQuery, publicProfiles]);

  // Load activities when viewing a profile
  useEffect(() => {
    if (selectedProfile) {
      getUserActivities(selectedProfile.uid).then(acts => {
        setSelectedUserActivities(acts);
      });
    } else {
      setSelectedUserActivities([]);
    }
  }, [selectedProfile]);

  // Listen for the notification open signal from the HomeTab notification button
  useEffect(() => {
    if (userState.showNotificationsModal) {
      setShowNotificationCenter(true);
      onUpdateState({ showNotificationsModal: false });
    }
  }, [userState.showNotificationsModal]);

  const handleCloseNotifications = () => {
    setShowNotificationCenter(false);
    if (userState.previousTabBeforeNotification) {
      onUpdateState({ 
        activeTab: userState.previousTabBeforeNotification, 
        previousTabBeforeNotification: null 
      });
    }
  };

  // --- GOOGLE SIGN IN AND SYNC ---
  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      if (user) {
        // Try to load state from Firestore
        let cloudState = await loadUserFromFirestore(user.uid);
        
        if (cloudState) {
          // Merge with current state (prefer cloud state, but keep new local stats if any)
          const mergedState: UserState = {
            ...cloudState,
            activeTab: 'friends',
            uid: user.uid,
            email: user.email || undefined
          };
          onUpdateState(mergedState);
          onTriggerToast("Welcome Back!", `Synced cloud progress for @${cloudState.username}`, "success");
        } else {
          // New Cloud Account: Sync the current local State to Cloud
          const updatedLocal: UserState = {
            ...userState,
            uid: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || userState.username
          };
          await syncUserToFirestore(user.uid, updatedLocal);
          onUpdateState(updatedLocal);
          onTriggerToast("Cloud Backup Activated!", "Progress synced safely to the cloud.", "success");
        }
      }
    } catch (e: any) {
      console.error("Google Sign-In Error:", e);
      onTriggerToast("Authentication Failed", "Please make sure third-party popups are allowed or open the app in a new tab.", "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsSyncing(true);
    try {
      await signOut(auth);
      onUpdateState({
        uid: undefined,
        email: undefined
      });
      onTriggerToast("Signed Out", "Switched back to offline storage mode.", "info");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };



  // --- FRIEND REQUEST ACTIONS ---
  const handleSendFriendRequest = async (profile: FriendProfile) => {
    if (!userState.uid) return;
    try {
      await sendFriendRequest(userState, profile);
      onTriggerToast("Request Sent", `Friend request sent to @${profile.username}`, "success");
      
      const newRequest: FriendRequest = {
        id: `${userState.uid}_${profile.uid}`,
        senderId: userState.uid!,
        senderUsername: userState.username,
        senderDisplayName: userState.displayName || userState.username,
        senderAvatar: userState.avatar,
        receiverId: profile.uid,
        receiverUsername: profile.username,
        receiverDisplayName: profile.displayName,
        receiverAvatar: profile.avatar,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Update local state to reflect instantly
      setSentRequests(prev => [...prev, newRequest]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = async (receiverId: string) => {
    const reqId = `${userState.uid}_${receiverId}`;
    try {
      await cancelFriendRequest(reqId);
      onTriggerToast("Request Cancelled", "Friend request withdrawn.", "info");
      setSentRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    try {
      await acceptFriendRequest(req, userState);
      onTriggerToast("Request Accepted!", `You are now friends with @${req.senderUsername}!`, "success");
      setReceivedRequests(prev => prev.filter(r => r.id !== req.id));
      await loadDirectoryAndFriends();
      SoundManager.play('notification');
      SoundManager.vibrate('light');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await declineFriendRequest(reqId);
      onTriggerToast("Request Declined", "Declined friend request.", "info");
      setReceivedRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = async (friendUid: string, username: string) => {
    if (!userState.uid) return;
    if (!confirm(`Are you sure you want to remove @${username} from your friends?`)) return;
    try {
      await removeFriend(userState.uid, friendUid);
      onTriggerToast("Friend Removed", `Removed @${username} from your friends.`, "info");
      setSelectedProfile(null);
      await loadDirectoryAndFriends();
    } catch (e) {
      console.error(e);
    }
  };

  // --- PRIVACY UPDATE TRIGGER ---
  const handleUpdatePrivacy = async (field: string, val: boolean) => {
    const updated = { [field]: val };
    onUpdateState(updated);
    if (userState.uid) {
      const userDocRef = doc(db, "users", userState.uid);
      await updateDoc(userDocRef, updated);
    }
    onTriggerToast("Settings Saved", "Privacy configurations updated.", "success");
  };

  const handleUpdateBioAndName = async (name: string, bio: string) => {
    const updated = { displayName: name, bio };
    onUpdateState(updated);
    if (userState.uid) {
      const userDocRef = doc(db, "users", userState.uid);
      await updateDoc(userDocRef, updated);
    }
    onTriggerToast("Profile Updated", "Display name and bio synchronized.", "success");
    setPrivacySettingsOpen(false);
  };

  // --- LEADERBOARD SORTING AND FETCH ---
  const getLeaderboardData = () => {
    // Merge public directory with current user's profile representation
    const myProfileRepresentation = getProfileFromState(userState) as FriendProfile;
    myProfileRepresentation.displayName = userState.displayName || userState.username;
    myProfileRepresentation.uid = userState.uid || "local_current_user";

    // Build overall list of profiles
    let list = [...publicProfiles];
    if (!list.some(p => p.uid === myProfileRepresentation.uid)) {
      list.push(myProfileRepresentation);
    }

    // Filter scope if "friends"
    if (leaderboardScope === 'friends' && userState.uid) {
      const friendIds = friendsList.map(f => f.uid);
      list = list.filter(p => p.uid === userState.uid || friendIds.includes(p.uid));
    }

    // Sort by metric
    switch (leaderboardCategory) {
      case 'weekly_xp':
      case 'monthly_xp':
        return list.sort((a, b) => (b.xp || 0) - (a.xp || 0)); // Using general XP as fallback rank
      case 'current_streak':
        return list.sort((a, b) => (b.streak || 0) - (a.streak || 0));
      case 'longest_streak':
        return list.sort((a, b) => (b.longestStreak || 0) - (a.longestStreak || 0));
      case 'topics':
        return list.sort((a, b) => (b.xp / 10 || 0) - (a.xp / 10 || 0)); // Simulated topics
      case 'modules':
        return list.sort((a, b) => (b.modulesCompleted || 0) - (a.modulesCompleted || 0));
      case 'semester':
        return list.sort((a, b) => (b.semesterProgress || 0) - (a.semesterProgress || 0));
      default:
        return list;
    }
  };

  const leaderboardData = getLeaderboardData();

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH INTEGRATED AUTH STATUS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#141822]/85 border border-gray-800/80 p-5 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-none">
              StudyOS Social
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Connect with VTU classmates, track friends, and conquer leaderboard goals.
            </p>
          </div>
        </div>

        {/* AUTH BUTTON CONTAINER */}
        <div className="flex items-center gap-2">
          {userState.uid ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 justify-end">
                  ● Cloud Active
                </span>
                <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
                  {userState.email}
                </span>
              </div>
              <button
                onClick={() => setPrivacySettingsOpen(true)}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
                title="Social Profile & Privacy Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              
              {/* Notification Bell Badge */}
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#141822]" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSyncing}
                className="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 text-white font-black text-xs sm:text-sm tracking-widest uppercase rounded-2xl shadow-[0_8px_25px_rgba(59,130,246,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? "Connecting..." : "Connect Google Account"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NOT IN CLOUD NOTICE DISPLAY IF OFFLINE */}
      {!userState.uid && (
        <div className="bg-gradient-to-r from-blue-900/15 via-indigo-950/10 to-transparent border-l-4 border-blue-500 p-5 rounded-r-3xl flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Offline Workspace Limitation
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Google Account binding is required to synchronise study statistics across browsers, unlock leaderboards, send real-time peer requests, and receive level milestone notifications.
            </p>
            <div className="pt-2 text-xs text-blue-400 flex items-center gap-1.5 font-bold">
              💡 Tip: Click "Connect Google Account" above. If it does not pop up, please click "Open in new tab" at the top-right of your screen first!
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB CONTROLS */}
      <div className="flex border-b border-gray-850 overflow-x-auto pb-px scrollbar-none gap-2">
        {(['friends', 'requests', 'search', 'leaderboard'] as const).map((tab) => {
          const isActive = activeSubTab === tab;
          const label = tab === 'friends' ? 'Friends' 
                      : tab === 'requests' ? `Requests (${receivedRequests.length})`
                      : tab === 'search' ? 'Find Students'
                      : 'Leaderboards';
          
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all cursor-pointer select-none ${
                isActive 
                  ? 'text-blue-400 border-blue-400' 
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT RENDERERS */}
      <div className="space-y-6">

        {/* --- 1. FRIENDS LIST VIEW --- */}
        {activeSubTab === 'friends' && (
          <div className="space-y-6">
            {!userState.uid ? (
              <div className="bg-[#14122C]/45 border border-gray-850 p-10 rounded-3xl text-center space-y-4">
                <Users className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-black text-white">Friends Offline</h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                  Sign in with Google to create a public profile, search for fellow VTU students, and build your studying crew.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl cursor-pointer"
                >
                  Connect Account Now
                </button>
              </div>
            ) : friendsList.length === 0 ? (
              <div className="bg-[#14122C]/45 border border-gray-850 p-10 rounded-3xl text-center space-y-4">
                <Users className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-black text-white">No Friends Added</h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-sm mx-auto">
                  You haven't added any accepted study partners yet. Search other public profiles in the "Find Students" tab!
                </p>
                <button
                  onClick={() => setActiveSubTab('search')}
                  className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-black uppercase tracking-widest rounded-2xl cursor-pointer"
                >
                  Search Public Profiles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {friendsList.map((friend) => (
                  <motion.div
                    key={friend.uid}
                    whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => setSelectedProfile(friend)}
                    className="bg-[#12141F]/90 border border-gray-850 hover:border-blue-500/30 p-5 rounded-2xl cursor-pointer transition-all space-y-4 relative overflow-hidden"
                  >
                    {/* Glowing status indicator badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono font-black uppercase tracking-wider bg-black/30">
                      {friend.status === 'online' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-emerald-400">Studied Today</span>
                        </>
                      ) : friend.status === 'active_yesterday' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-amber-400">Active Yesterday</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                          <span className="text-gray-500">Offline</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#1D2030] flex items-center justify-center text-3xl shadow-inner border border-gray-800">
                        {friend.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-white text-base truncate">
                          {friend.displayName || friend.username}
                        </h3>
                        <span className="text-xs text-gray-400 font-mono">
                          @{friend.username}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-850/60 text-center">
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Semester</span>
                        <span className="text-xs font-black text-white">Sem {friend.semester}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Level</span>
                        <span className="text-xs font-black text-blue-400">Lvl {friend.level}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Streak</span>
                        <span className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                          🔥 {friend.streak}d
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Friends Activity Feed */}
            {friendsActivities.length > 0 && (
              <div className="bg-[#10131E]/80 border border-gray-850 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    Recent Friends Activity
                  </h3>
                </div>
                <div className="divide-y divide-gray-850/50">
                  {friendsActivities.map((act) => (
                    <div key={act.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">{act.avatar}</span>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs text-gray-300">
                          <span className="font-bold text-white">@{act.username}</span> {act.text}
                        </p>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 2. FRIEND REQUESTS LIST VIEW --- */}
        {activeSubTab === 'requests' && (
          <div className="space-y-6">
            {!userState.uid ? (
              <div className="bg-[#14122C]/45 border border-gray-850 p-10 rounded-3xl text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-black text-white">Sign In Required</h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-sm mx-auto">
                  Please log in with your Google account to handle real-time student request queries.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* INBOUND RECEIVED REQUESTS */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-850 pb-2">
                    Received Requests ({receivedRequests.length})
                  </h3>
                  {receivedRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4">No pending friend requests received.</p>
                  ) : (
                    <div className="space-y-3">
                      {receivedRequests.map((req) => (
                        <div key={req.id} className="bg-[#131522] border border-gray-850 p-4 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-white/5 w-10 h-10 rounded-lg flex items-center justify-center">{req.senderAvatar}</span>
                            <div>
                              <h4 className="text-sm font-extrabold text-white">{req.senderDisplayName}</h4>
                              <p className="text-[10px] text-gray-500 font-mono">@{req.senderUsername}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAcceptRequest(req)}
                              className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Accept Request"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Decline Request"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OUTBOUND SENT REQUESTS */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-850 pb-2">
                    Sent Requests ({sentRequests.length})
                  </h3>
                  {sentRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4">No active outgoing requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {sentRequests.map((req) => (
                        <div key={req.id} className="bg-[#131522] border border-gray-850 p-4 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-white/5 w-10 h-10 rounded-lg flex items-center justify-center">{req.receiverAvatar}</span>
                            <div>
                              <h4 className="text-sm font-extrabold text-white">{req.receiverDisplayName}</h4>
                              <p className="text-[10px] text-gray-500 font-mono">@{req.receiverUsername}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(req.receiverId)}
                            className="px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] uppercase font-bold tracking-wider hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* --- 3. DIRECTORY SEARCH VIEW --- */}
        {activeSubTab === 'search' && (
          <div className="space-y-6">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search classmates by Username or Display Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111421] border border-gray-850 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm tracking-wide shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!searchQuery.trim() ? (
                <div className="col-span-2 text-center py-12 text-gray-500 space-y-3 bg-[#111421]/30 rounded-3xl border border-gray-850/50">
                  <SearchIcon className="w-12 h-12 text-gray-600 mx-auto animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Search Classmates</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Type a username or display name in the search box above to search for registered StudyOS profiles.
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-gray-500 space-y-2">
                  <Compass className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-xs">No public student profiles found matching your search query.</p>
                  <p className="text-[10px] text-gray-600 max-w-xs mx-auto">
                    Make sure the username is spelled correctly. You can search for other registered StudyOS users.
                  </p>
                </div>
              ) : (
                searchResults.map((profile) => {
                  const isFriend = friendsList.some(f => f.uid === profile.uid);
                  const isSent = sentRequests.some(r => r.receiverId === profile.uid);
                  const isReceived = receivedRequests.some(r => r.senderId === profile.uid);
                  
                  return (
                    <div key={profile.uid} className="bg-[#12141F]/90 border border-gray-850 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl bg-[#1D2030] w-12 h-12 rounded-xl flex items-center justify-center">{profile.avatar}</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-white leading-tight">
                            {profile.displayName || profile.username}
                          </h4>
                          <span className="text-[10px] text-gray-500 font-mono block">
                            @{profile.username}
                          </span>
                          <span className="text-[10px] text-blue-400 mt-1 block">
                            Sem {profile.semester} • Level {profile.level} • Streak 🔥 {profile.streak}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                        >
                          Profile
                        </button>

                        {userState.uid && (
                          <>
                            {isFriend ? (
                              <span className="px-3 py-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1">
                                ✓ Friend
                              </span>
                            ) : isSent ? (
                              <button
                                onClick={() => handleCancelRequest(profile.uid)}
                                className="px-3 py-2 bg-amber-500/10 hover:bg-red-500/20 text-amber-400 hover:text-red-400 border border-amber-500/10 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                title="Click to cancel"
                              >
                                Pending
                              </button>
                            ) : isReceived ? (
                              <button
                                onClick={() => setActiveSubTab('requests')}
                                className="px-3 py-2 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer animate-pulse"
                              >
                                Accept
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendFriendRequest(profile)}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- 4. LEADERBOARDS SECTION --- */}
        {activeSubTab === 'leaderboard' && (
          <div className="space-y-6">
            
            {/* LEADERBOARD FILTERS CONTAINER */}
            <div className="bg-[#121522] border border-gray-850 p-4 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    StudyOS Competitive Arena
                  </h3>
                </div>
                {/* Leaderboard Scope Selection */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-gray-850 text-xs">
                  <button
                    onClick={() => setLeaderboardScope('global')}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg select-none transition-all cursor-pointer ${
                      leaderboardScope === 'global' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Global
                  </button>
                  <button
                    onClick={() => {
                      if (!userState.uid) {
                        onTriggerToast("Sync Required", "Connect Google account to view Friends Leaderboard.", "warning");
                        return;
                      }
                      setLeaderboardScope('friends');
                    }}
                    className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg select-none transition-all cursor-pointer ${
                      leaderboardScope === 'friends' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Friends List
                  </button>
                </div>
              </div>

              {/* Dynamic Category Selector Scrollbox */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'weekly_xp', label: 'Weekly XP' },
                  { id: 'monthly_xp', label: 'Monthly XP' },
                  { id: 'current_streak', label: 'Streak' },
                  { id: 'longest_streak', label: 'Longest Streak' },
                  { id: 'topics', label: 'Topics' },
                  { id: 'modules', label: 'Modules' },
                  { id: 'semester', label: 'Sem Progress' },
                ].map((cat) => {
                  const isSelected = leaderboardCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setLeaderboardCategory(cat.id as any)}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border whitespace-nowrap transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-amber-400/15 text-amber-400 border-amber-400/30 font-black shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                          : 'bg-white/5 text-gray-400 border-transparent hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RENDER LEADERS LIST */}
            <div className="bg-[#10121C]/90 border border-gray-850 rounded-2xl overflow-hidden divide-y divide-gray-850/65">
              {leaderboardData.map((profile, index) => {
                const rank = index + 1;
                const isMe = profile.uid === (userState.uid || "local_current_user");
                
                // Formulate target score label
                let valueLabel = "";
                if (leaderboardCategory === 'weekly_xp' || leaderboardCategory === 'monthly_xp') {
                  valueLabel = `${profile.xp} XP`;
                } else if (leaderboardCategory === 'current_streak') {
                  valueLabel = `🔥 ${profile.streak} Days`;
                } else if (leaderboardCategory === 'longest_streak') {
                  valueLabel = `🔥 ${profile.longestStreak} Days`;
                } else if (leaderboardCategory === 'topics') {
                  valueLabel = `${Math.round(profile.xp / 10)} Topics`;
                } else if (leaderboardCategory === 'modules') {
                  valueLabel = `${profile.modulesCompleted} Modules`;
                } else if (leaderboardCategory === 'semester') {
                  valueLabel = `${profile.semesterProgress}% Done`;
                }

                // Check privacy hidden stats
                if (!isMe) {
                  if (profile.hideXP && (leaderboardCategory === 'weekly_xp' || leaderboardCategory === 'monthly_xp' || leaderboardCategory === 'topics')) {
                    valueLabel = "Hidden";
                  }
                  if (profile.hideStreak && (leaderboardCategory === 'current_streak' || leaderboardCategory === 'longest_streak')) {
                    valueLabel = "Hidden";
                  }
                }

                return (
                  <div
                    key={profile.uid}
                    className={`flex items-center justify-between p-4 transition-all ${
                      isMe 
                        ? 'bg-blue-500/10 border-y border-blue-500/35 relative z-10' 
                        : 'hover:bg-white/2'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Indicator Badge */}
                      <span className={`w-8 text-center font-mono font-black text-xs ${
                        rank === 1 ? 'text-amber-400 text-lg' 
                        : rank === 2 ? 'text-gray-300 text-base' 
                        : rank === 3 ? 'text-amber-600 text-sm' 
                        : 'text-gray-500'
                      }`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </span>

                      {/* User Icon & Tag */}
                      <span className="text-2xl bg-white/5 w-10 h-10 rounded-xl flex items-center justify-center select-none">{profile.avatar}</span>
                      
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-none">
                          <span>{profile.displayName || profile.username}</span>
                          {isMe && (
                            <span className="text-[9px] font-black font-mono text-blue-400 uppercase tracking-widest bg-blue-500/15 border border-blue-500/35 px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                          @{profile.username} • Lvl {profile.level}
                        </span>
                      </div>
                    </div>

                    {/* Score Statistic Display */}
                    <span className="font-mono font-black text-xs text-white">
                      {valueLabel}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* --- MODAL 1: STUDENT PROFILE DIALOGUE --- */}
      <FriendProfileModal
        isOpen={!!selectedProfile}
        selectedProfile={selectedProfile}
        userState={userState}
        friendsList={friendsList}
        selectedUserActivities={selectedUserActivities}
        onClose={() => setSelectedProfile(null)}
        onRemoveFriend={handleRemoveFriend}
      />

      {/* --- MODAL 2: EDIT PROFILE AND PRIVACY SETTINGS DIALOGUE --- */}
      <FriendsPrivacyModal
        isOpen={privacySettingsOpen}
        onClose={() => setPrivacySettingsOpen(false)}
        userState={userState}
        onUpdateBioAndName={handleUpdateBioAndName}
        onUpdatePrivacy={handleUpdatePrivacy}
      />

      {/* --- NOTIFICATION CENTER OVERLAY PANEL --- */}
      <NotificationCenterModal
        isOpen={showNotificationCenter}
        onClose={handleCloseNotifications}
        userState={userState}
        notifications={notifications}
        onMarkNotificationAsRead={markNotificationAsRead}
        onMarkAllAsRead={async () => {
          if (userState.uid) {
            await markAllNotificationsAsRead(userState.uid);
            onTriggerToast("Marked Read", "All notifications cleared.", "info");
          }
        }}
      />

    </div>
  );
}
