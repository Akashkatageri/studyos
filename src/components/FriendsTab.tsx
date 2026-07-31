import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search as SearchIcon, 
  Bell, 
  Trophy, 
  Check, 
  X, 
  ShieldAlert, 
  Settings as SettingsIcon,
  Crown,
  Zap,
  WifiOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserState, FriendProfile, FriendRequest, SocialNotification, SocialActivity } from '../types';
import { SoundManager } from '../utils/soundManager';
import { 
  auth, 
  googleProvider, 
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
  db,
  getProfileFromState
} from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { containsProfanity } from '../utils/moderation';
import { calculateWeeklyXP } from '../utils/dateUtils';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import FriendProfileModal from './friends/FriendProfileModal';
import FriendsPrivacyModal from './friends/FriendsPrivacyModal';
import NotificationCenterModal from './friends/NotificationCenterModal';

interface FriendsTabProps {
  userState: UserState;
  onUpdateState: (updated: Partial<UserState>) => void;
  onTriggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  receivedRequests?: FriendRequest[];
  notifications?: SocialNotification[];
}

export default function FriendsTab({ 
  userState, 
  onUpdateState, 
  onTriggerToast,
  receivedRequests: propReceivedRequests,
  notifications: propNotifications
}: FriendsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'leaderboard' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFindInput, setQuickFindInput] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<FriendProfile[]>([]);
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  
  // Real-time Firestore subscriptions
  const [localReceivedRequests, setLocalReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [localNotifications, setLocalNotifications] = useState<SocialNotification[]>([]);
  const [friendsActivities, setFriendsActivities] = useState<SocialActivity[]>([]);
  
  const receivedRequests = propReceivedRequests ?? localReceivedRequests;
  const notifications = propNotifications ?? localNotifications;
  
  const setReceivedRequests = setLocalReceivedRequests;
  
  // Modals & detail views
  const [selectedProfile, setSelectedProfile] = useState<FriendProfile | null>(null);
  const [selectedUserActivities, setSelectedUserActivities] = useState<SocialActivity[]>([]);
  const [privacySettingsOpen, setPrivacySettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const unsubReceivedRef = useRef<(() => void) | null>(null);
  const unsubSentRef = useRef<(() => void) | null>(null);
  const unsubNotificationsRef = useRef<(() => void) | null>(null);
  
  // Leaderboard filters
  const [leaderboardCategory, setLeaderboardCategory] = useState<
    'weekly_xp' | 'monthly_xp' | 'current_streak' | 'longest_streak' | 'topics' | 'modules' | 'semester'
  >('weekly_xp');
  const [leaderboardScope, setLeaderboardScope] = useState<'global' | 'friends'>('global');

  // Load friends list and public directory
  const loadDirectoryAndFriends = async () => {
    setIsSyncing(true);
    try {
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

      let allPublic: FriendProfile[] = [];
      try {
        allPublic = await getAllPublicProfiles();
      } catch (err) {
        console.error("Error fetching public profiles from Firestore:", err);
      }

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

  useEffect(() => {
    loadDirectoryAndFriends();
  }, [userState.uid, refreshTrigger]);

  // Setup live snapshot listeners
  useEffect(() => {
    if (!userState.uid) {
      setLocalReceivedRequests([]);
      setSentRequests([]);
      setLocalNotifications([]);

      if (unsubReceivedRef.current) { unsubReceivedRef.current(); unsubReceivedRef.current = null; }
      if (unsubSentRef.current) { unsubSentRef.current(); unsubSentRef.current = null; }
      if (unsubNotificationsRef.current) { unsubNotificationsRef.current(); unsubNotificationsRef.current = null; }
      return;
    }

    if (!propReceivedRequests) {
      if (unsubReceivedRef.current) { unsubReceivedRef.current(); unsubReceivedRef.current = null; }
      unsubReceivedRef.current = subscribeFriendRequests(userState.uid, (requests) => {
        setLocalReceivedRequests(requests);
      });
    }

    if (unsubSentRef.current) { unsubSentRef.current(); unsubSentRef.current = null; }
    unsubSentRef.current = subscribeSentRequests(userState.uid, (requests) => {
      setSentRequests(requests);
    });

    if (!propNotifications) {
      if (unsubNotificationsRef.current) { unsubNotificationsRef.current(); unsubNotificationsRef.current = null; }
      unsubNotificationsRef.current = subscribeNotifications(userState.uid, (notifs) => {
        setLocalNotifications(notifs);
      });
    }

    return () => {
      if (unsubReceivedRef.current) { unsubReceivedRef.current(); unsubReceivedRef.current = null; }
      if (unsubSentRef.current) { unsubSentRef.current(); unsubSentRef.current = null; }
      if (unsubNotificationsRef.current) { unsubNotificationsRef.current(); unsubNotificationsRef.current = null; }
    };
  }, [userState.uid, propReceivedRequests, propNotifications]);

  // Perform search locally
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

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential) {
        if (credential.idToken) sessionStorage.setItem('google_id_token', credential.idToken);
        if (credential.accessToken) sessionStorage.setItem('google_access_token', credential.accessToken);
      }

      if (user) {
        let cloudState = await loadUserFromFirestore(user.uid);
        if (cloudState) {
          const mergedState: UserState = {
            ...cloudState,
            activeTab: 'friends',
            uid: user.uid,
            email: user.email || undefined
          };
          onUpdateState(mergedState);
          onTriggerToast("Welcome Back!", `Synced cloud progress for @${cloudState.username}`, "success");
        } else {
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

  // Friend Request actions
  const handleSendFriendRequest = async (profile: FriendProfile) => {
    if (userState.isOffline) {
      onTriggerToast("📶 Connection Required", "Internet connection is required to send friend requests.", "info");
      return;
    }
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
      setSentRequests(prev => [...prev, newRequest]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = async (receiverId: string) => {
    if (userState.isOffline) {
      onTriggerToast("📶 Connection Required", "Internet connection is required to withdraw friend requests.", "info");
      return;
    }
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
    if (userState.isOffline) {
      onTriggerToast("📶 Connection Required", "Internet connection is required to accept friend requests.", "info");
      return;
    }
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
    if (userState.isOffline) {
      onTriggerToast("📶 Connection Required", "Internet connection is required to decline friend requests.", "info");
      return;
    }
    try {
      await declineFriendRequest(reqId);
      onTriggerToast("Request Declined", "Declined friend request.", "info");
      setReceivedRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = async (friendUid: string, username: string) => {
    if (userState.isOffline) {
      onTriggerToast("📶 Connection Required", "Internet connection is required to remove friends.", "info");
      return;
    }
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
    if (containsProfanity(name) || containsProfanity(bio)) {
      onTriggerToast("Validation Error", "Name or bio contains vulgar words. Please remove them.", "warning");
      return;
    }
    const isDisplayNameChanged = name !== (userState.displayName || userState.username);
    const updated: Partial<UserState> = { displayName: name, bio };
    if (isDisplayNameChanged) {
      updated.lastDisplayNameChangeAt = new Date().toISOString();
    }
    onUpdateState(updated);
    if (userState.uid) {
      const userDocRef = doc(db, "users", userState.uid);
      await updateDoc(userDocRef, updated);
    }
    onTriggerToast("Profile Updated", "Display name and bio synchronized.", "success");
    setPrivacySettingsOpen(false);
  };

  const handleRequestUsernameChange = async (reasonType: string, details: string) => {
    const updated = {
      usernameChangeRequested: true,
      usernameChangeReason: `[${reasonType.toUpperCase()}] ${details}`
    };
    onUpdateState(updated);
    if (userState.uid) {
      const userDocRef = doc(db, "users", userState.uid);
      await updateDoc(userDocRef, updated);
    }
    onTriggerToast("Request Submitted", "Username change appeal sent for admin review.", "info");
  };

  // Build ranking podium profiles
  const myProfileRep = getProfileFromState(userState) as FriendProfile;
  myProfileRep.displayName = userState.displayName || userState.username;
  myProfileRep.uid = userState.uid || "local_current_user";
  myProfileRep.xp = userState.xp || 0;

  // Compute Weekly XP earned during the current week (Mon-Sun)
  const getWeeklyXP = (profile: FriendProfile | Partial<FriendProfile>): number => {
    if (profile.uid === (userState.uid || "local_current_user") || profile.uid === myProfileRep.uid) {
      return calculateWeeklyXP(userState.focusHistory, userState.studyActivity, userState.xp, userState.dailyXP);
    }
    if (profile.weeklyXP !== undefined && typeof profile.weeklyXP === 'number' && profile.weeklyXP > 0) {
      return profile.weeklyXP;
    }
    const focusHist = (profile as any).focusHistory;
    const studyAct = (profile as any).studyActivity;
    const dailyXPMap = (profile as any).dailyXP;
    if (focusHist || studyAct || dailyXPMap) {
      return calculateWeeklyXP(focusHist, studyAct, profile.xp || 0, dailyXPMap);
    }
    return Math.min(profile.xp || 0, Math.floor((profile.xp || 0) % 350) + 50);
  };

  myProfileRep.weeklyXP = getWeeklyXP(myProfileRep);

  // Merge profiles, ensuring current local user is ALWAYS replaced with the latest myProfileRep
  const allAvailableProfiles = friendsList.map(p => p.uid === myProfileRep.uid ? myProfileRep : p);
  if (!allAvailableProfiles.some(p => p.uid === myProfileRep.uid)) {
    allAvailableProfiles.push(myProfileRep);
  }
  publicProfiles.forEach(pub => {
    if (pub.uid === myProfileRep.uid) return;
    if (!allAvailableProfiles.some(p => p.uid === pub.uid)) {
      allAvailableProfiles.push(pub);
    }
  });

  // Sort by Weekly XP for podiums
  const topProfilesByWeeklyXP = [...allAvailableProfiles].sort((a, b) => getWeeklyXP(b) - getWeeklyXP(a));
  const rank1 = topProfilesByWeeklyXP[0] || myProfileRep;
  const rank2 = topProfilesByWeeklyXP[1] || { uid: 'demo-2', username: 'niranjan', displayName: 'Niranjan', level: 1, xp: 100, weeklyXP: 100, avatar: '🐱', semester: 3, streak: 0 };
  const rank3 = topProfilesByWeeklyXP[2] || { uid: 'demo-3', username: 'kirito', displayName: 'Kirito', level: 1, xp: 50, weeklyXP: 50, avatar: '💀', semester: 3, streak: 0 };

  // Calculate days/hours until Monday 00:00 weekly reset
  const getWeeklyResetString = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const diffMs = Math.max(0, nextMonday.getTime() - now.getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Resets Monday in ${days}d ${hours}h`;
    return `Resets Monday in ${hours}h ${mins}m`;
  };

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

  // Prepare activity feed
  const displayActivities = friendsActivities.length > 0 
    ? friendsActivities 
    : [
        {
          id: 'act-1',
          userId: rank1.uid,
          username: rank1.username,
          avatar: rank1.avatar,
          type: 'level_up' as const,
          text: `reached Level ${rank1.level} ✨`,
          createdAt: new Date().toISOString(),
          pillLabel: 'LVL UP',
          pillColor: 'amber'
        },
        {
          id: 'act-2',
          userId: rank1.uid,
          username: rank1.username,
          avatar: rank1.avatar,
          type: 'module_complete' as const,
          text: `completed Recursion`,
          createdAt: new Date(Date.now() - 180000).toISOString(),
          pillLabel: '+20 XP',
          pillColor: 'emerald'
        },
        {
          id: 'act-3',
          userId: rank1.uid,
          username: rank1.username,
          avatar: rank1.avatar,
          type: 'streak' as const,
          text: `is on a ${rank1.streak || 1} day streak 🔥`,
          createdAt: new Date(Date.now() - 480000).toISOString(),
          pillLabel: `${rank1.streak || 1}d`,
          pillColor: 'amber'
        },
        {
          id: 'act-4',
          userId: rank2.uid,
          username: rank2.username,
          avatar: rank2.avatar,
          type: 'milestone' as const,
          text: `joined StudyOS`,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          pillLabel: 'NEW',
          pillColor: 'purple'
        }
      ];

  // Leaderboard sorting
  const getLeaderboardData = () => {
    let list = [...allAvailableProfiles];
    if (leaderboardScope === 'friends' && userState.uid) {
      const friendIds = friendsList.map(f => f.uid);
      list = list.filter(p => p.uid === userState.uid || friendIds.includes(p.uid));
    }
    switch (leaderboardCategory) {
      case 'weekly_xp':
        return list.sort((a, b) => getWeeklyXP(b) - getWeeklyXP(a));
      case 'monthly_xp':
        return list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      case 'current_streak':
        return list.sort((a, b) => (b.streak || 0) - (a.streak || 0));
      case 'longest_streak':
        return list.sort((a, b) => (b.longestStreak || 0) - (a.longestStreak || 0));
      case 'topics':
        return list.sort((a, b) => (b.xp / 10 || 0) - (a.xp / 10 || 0));
      case 'modules':
        return list.sort((a, b) => (b.modulesCompleted || 0) - (a.modulesCompleted || 0));
      case 'semester':
        return list.sort((a, b) => (b.semesterProgress || 0) - (a.semesterProgress || 0));
      default:
        return list;
    }
  };

  const leaderboardData = getLeaderboardData();

  const handleQuickFind = () => {
    if (!quickFindInput.trim()) return;
    setSearchQuery(quickFindInput);
    setActiveSubTab('search');
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      
      {/* HEADER SECTION WITH TITLE & TOP CONTROLS */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Friends
            {isSyncing && (
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" title="Syncing..." />
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-gray-700/50"
            title="Refresh Social Feed"
          >
            <Trophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotificationCenter(true)}
            className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-gray-700/50"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0E101A]" />
            )}
          </button>

          {/* Settings */}
          {userState.uid && (
            <button
              onClick={() => setPrivacySettingsOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-gray-700/50"
              title="Social Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SUB TAB CONTROLS WITH ACTIVE UNDERLINE */}
      <div className="flex border-b border-slate-200 dark:border-gray-800/80 overflow-x-auto pb-px scrollbar-none gap-6">
        {[
          { id: 'friends', label: 'Friends' },
          { id: 'requests', label: `Requests${receivedRequests.length > 0 ? ` (${receivedRequests.length})` : ''}` },
          { id: 'leaderboard', label: 'Leaderboard' },
          { id: 'search', label: 'Find' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-2.5 font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer select-none relative ${
                isActive ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div 
                  layoutId="activeSubTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-6">
        {!navigator.onLine && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-bold shadow-sm">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Friends & Social Directory require an active internet connection. Friends are stored strictly online in Firestore cloud.</span>
          </div>
        )}

        {/* --- 1. MAIN FRIENDS VIEW --- */}
        {activeSubTab === 'friends' && (
          <div className="space-y-6">

            {/* A. "THIS WEEK'S RANKING" PODIUM CARD */}
            <div className="bg-gradient-to-b from-[#181632] via-[#121424] to-[#0E101A] border border-purple-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-1.5 text-xs font-black text-purple-400 tracking-wider uppercase font-mono">
                  <Zap className="w-4 h-4 fill-current text-purple-400" />
                  <span>THIS WEEK'S RANKING</span>
                </div>
                <span className="px-2.5 py-1 bg-gray-800/80 border border-gray-700/50 text-gray-400 text-[10px] font-mono font-bold rounded-full">
                  {getWeeklyResetString()}
                </span>
              </div>

              {/* Podiums Row */}
              <div className="flex items-end justify-center gap-3 sm:gap-6 pt-2 pb-1">
                
                {/* RANK 2 (LEFT) */}
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="w-12 h-12 rounded-full bg-[#1A1D2E] border-2 border-gray-600 flex items-center justify-center text-2xl shadow-md mb-2">
                    {rank2.avatar}
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[90px] text-center">
                    {rank2.displayName || rank2.username}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Lvl {rank2.level} · {getWeeklyXP(rank2)} W-XP
                  </span>
                  
                  {/* Pedestal Box 2 */}
                  <div className="w-full bg-[#181A28] border border-gray-700/60 rounded-2xl h-16 mt-2 flex items-center justify-center shadow-inner">
                    <span className="text-lg font-black text-gray-300 font-mono">2</span>
                  </div>
                </div>

                {/* RANK 1 (CENTER - ELEVATED) */}
                <div className="flex flex-col items-center flex-1 max-w-[110px] -mt-4">
                  {/* Crown Icon Above */}
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400 mb-1" />
                  
                  <div className="w-14 h-14 rounded-full bg-[#2A2345] border-2 border-amber-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(251,191,36,0.3)] mb-2 relative">
                    {rank1.avatar}
                  </div>

                  <span className="text-xs font-black text-white truncate max-w-[100px] text-center">
                    {rank1.displayName || rank1.username}
                  </span>
                  <span className="text-[10px] text-amber-300/90 font-mono font-bold">
                    Lvl {rank1.level} · {getWeeklyXP(rank1)} Weekly XP
                  </span>

                  {/* Pedestal Box 1 (Gold) */}
                  <div className="w-full bg-gradient-to-b from-[#3B2E15] to-[#251D0B] border border-amber-500/50 rounded-2xl h-22 mt-2 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                    <span className="text-xl font-black text-amber-400 font-mono">1</span>
                  </div>
                </div>

                {/* RANK 3 (RIGHT) */}
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                  <div className="w-12 h-12 rounded-full bg-[#1A1D2E] border-2 border-amber-700/60 flex items-center justify-center text-2xl shadow-md mb-2">
                    {rank3.avatar}
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[90px] text-center">
                    {rank3.displayName || rank3.username}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Lvl {rank3.level} · {getWeeklyXP(rank3)} W-XP
                  </span>

                  {/* Pedestal Box 3 */}
                  <div className="w-full bg-[#181A28] border border-gray-700/60 rounded-2xl h-14 mt-2 flex items-center justify-center shadow-inner">
                    <span className="text-lg font-black text-amber-600 font-mono">3</span>
                  </div>
                </div>

              </div>
            </div>

            {/* B. "YOUR FRIENDS · {COUNT}" SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                  YOUR FRIENDS · {friendsList.length}
                </span>
              </div>

              {!userState.uid ? (
                <div className="bg-[#121422] border border-gray-800 p-6 rounded-2xl text-center space-y-3">
                  <Users className="w-10 h-10 text-gray-500 mx-auto" />
                  <p className="text-xs text-gray-300 font-medium">Sign in with Google to sync and view your friends list.</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Connect Account
                  </button>
                </div>
              ) : friendsList.length === 0 ? (
                <div className="bg-[#121422] border border-gray-800 p-6 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-gray-400">No friends added yet. Find classmates using search below!</p>
                  <button
                    onClick={() => setActiveSubTab('search')}
                    className="px-4 py-2 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Find Students
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {friendsList.map((friend) => (
                    <motion.div
                      key={friend.uid}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedProfile(friend)}
                      className="bg-[#121422] border border-gray-800/80 hover:border-purple-500/40 p-3.5 rounded-2xl cursor-pointer transition-all space-y-3 relative"
                    >
                      {/* Avatar + Status Indicator */}
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-[#1A1D2E] border border-gray-700/60 flex items-center justify-center text-2xl shadow-inner">
                          {friend.avatar}
                        </div>
                        <span className={`w-2 h-2 rounded-full mt-1 ${friend.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                      </div>

                      {/* Name & Handle */}
                      <div>
                        <h3 className="font-bold text-white text-sm truncate leading-snug">
                          {friend.displayName || friend.username}
                        </h3>
                        <span className="text-[10px] text-gray-400 font-mono block truncate">
                          @{friend.username}
                        </span>
                      </div>

                      {/* 3 Metric Pills */}
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-800/60 text-center">
                        <div className="bg-[#0A0C16] py-1 px-0.5 rounded-lg border border-gray-800/60">
                          <span className="text-[9px] font-black text-gray-300 block">{friend.level}</span>
                          <span className="text-[7px] font-mono font-bold text-gray-500 uppercase block">LVL</span>
                        </div>
                        <div className="bg-[#0A0C16] py-1 px-0.5 rounded-lg border border-gray-800/60">
                          <span className="text-[9px] font-black text-gray-300 block">{friend.semester}</span>
                          <span className="text-[7px] font-mono font-bold text-gray-500 uppercase block">SEM</span>
                        </div>
                        <div className="bg-[#0A0C16] py-1 px-0.5 rounded-lg border border-gray-800/60">
                          <span className="text-[9px] font-black text-amber-400 block">{friend.streak}d</span>
                          <span className="text-[7px] font-mono font-bold text-gray-500 uppercase block">STK</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* C. "ACTIVITY" FEED SECTION */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">
                ACTIVITY
              </span>

              <div className="bg-[#121422] border border-gray-800/80 rounded-2xl p-4 space-y-3 divide-y divide-gray-800/50">
                {displayActivities.slice(0, 6).map((act: any) => {
                  const timeText = formatTimestamp(act.createdAt);
                  const isLvl = act.text?.toLowerCase().includes('level') || act.pillLabel === 'LVL UP';
                  const isXP = act.text?.toLowerCase().includes('xp') || act.pillLabel?.includes('XP');
                  const isStreak = act.text?.toLowerCase().includes('streak') || act.pillLabel?.includes('d');

                  return (
                    <div key={act.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl bg-purple-500/10 border border-purple-500/20 w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                          {act.avatar || '🚀'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-200 leading-snug">
                            <strong className="text-white">@{act.username}</strong> {act.text}
                          </p>
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                            {timeText}
                          </span>
                        </div>
                      </div>

                      {/* Pill Badge */}
                      <div className="shrink-0">
                        {isLvl ? (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg">
                            LVL UP
                          </span>
                        ) : isXP ? (
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg font-mono">
                            {act.pillLabel || '+20 XP'}
                          </span>
                        ) : isStreak ? (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg font-mono">
                            {act.pillLabel || '1d'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg">
                            {act.pillLabel || 'NEW'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* D. BOTTOM QUICK SEARCH BAR */}
            <div className="bg-[#121422] border border-gray-800/80 rounded-2xl p-2.5 flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Find by username"
                  value={quickFindInput}
                  onChange={(e) => setQuickFindInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickFind()}
                  className="w-full bg-[#0A0C16] border border-gray-800/80 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleQuickFind}
                className="px-5 py-2.5 bg-[#181A28] hover:bg-purple-600 border border-gray-700/60 hover:border-purple-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Find
              </button>
            </div>

          </div>
        )}

        {/* --- 2. FRIEND REQUESTS TAB --- */}
        {activeSubTab === 'requests' && (
          <div className="space-y-6">
            {!userState.uid ? (
              <div className="bg-[#121422] border border-gray-800 p-8 rounded-2xl text-center space-y-3">
                <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-300">Sign in with Google to view and send friend requests.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Received Requests */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">
                    Received Requests ({receivedRequests.length})
                  </span>
                  {receivedRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">No pending friend requests received.</p>
                  ) : (
                    <div className="space-y-2">
                      {receivedRequests.map((req) => (
                        <div key={req.id} className="bg-[#121422] border border-gray-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-[#1A1D2E] w-10 h-10 rounded-xl flex items-center justify-center">{req.senderAvatar}</span>
                            <div>
                              <h4 className="text-xs font-bold text-white">{req.senderDisplayName}</h4>
                              <p className="text-[10px] text-gray-500 font-mono">@{req.senderUsername}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAcceptRequest(req)}
                              className="p-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Accept"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className="p-2 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Decline"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent Requests */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">
                    Sent Requests ({sentRequests.length})
                  </span>
                  {sentRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">No outgoing requests.</p>
                  ) : (
                    <div className="space-y-2">
                      {sentRequests.map((req) => (
                        <div key={req.id} className="bg-[#121422] border border-gray-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-[#1A1D2E] w-10 h-10 rounded-xl flex items-center justify-center">{req.receiverAvatar}</span>
                            <div>
                              <h4 className="text-xs font-bold text-white">{req.receiverDisplayName}</h4>
                              <p className="text-[10px] text-gray-500 font-mono">@{req.receiverUsername}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(req.receiverId)}
                            className="px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold tracking-wider hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
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

        {/* --- 3. LEADERBOARD TAB --- */}
        {activeSubTab === 'leaderboard' && (
          <div className="space-y-4">
            {/* WEEKLY RESET ANNOUNCEMENT BANNER */}
            <div className="bg-[#121422] border border-purple-500/20 bg-purple-500/5 p-3 rounded-2xl flex items-center justify-between text-xs text-purple-300">
              <div className="flex items-center gap-2 font-bold">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Weekly Leaderboard (Mon – Sun)</span>
              </div>
              <span className="font-mono text-[10px] bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg text-purple-200 font-bold">
                ⚡ {getWeeklyResetString()}
              </span>
            </div>

            <div className="bg-[#121422] border border-gray-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider font-mono">Leaderboard</span>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'weekly_xp', label: 'Weekly XP' },
                  { id: 'current_streak', label: 'Streak' },
                  { id: 'longest_streak', label: 'Record' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setLeaderboardCategory(cat.id as any)}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                      leaderboardCategory === cat.id 
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/50' 
                        : 'bg-[#0A0C16] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-[#0A0C16] p-1 rounded-xl border border-gray-800 text-xs shrink-0">
                <button
                  onClick={() => setLeaderboardScope('global')}
                  className={`px-3 py-1 font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer ${
                    leaderboardScope === 'global' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setLeaderboardScope('friends')}
                  className={`px-3 py-1 font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer ${
                    leaderboardScope === 'friends' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Friends
                </button>
              </div>
            </div>

            <div className="bg-[#121422] border border-gray-800 rounded-2xl divide-y divide-gray-800/60 overflow-hidden">
              {leaderboardData.map((profile, index) => {
                const rank = index + 1;
                const isMe = profile.uid === (userState.uid || "local_current_user");
                const weeklyXP = getWeeklyXP(profile);

                return (
                  <div
                    key={profile.uid}
                    className={`flex items-center justify-between p-3.5 transition-all ${
                      isMe ? 'bg-purple-500/10 border-l-4 border-purple-500' : 'hover:bg-white/2'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-mono font-black text-xs ${
                        rank === 1 ? 'text-amber-400 text-sm' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </span>

                      <span className="text-xl bg-[#1A1D2E] w-9 h-9 rounded-xl flex items-center justify-center">{profile.avatar}</span>

                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{profile.displayName || profile.username}</span>
                          {isMe && (
                            <span className="text-[8px] font-mono text-purple-300 bg-purple-500/20 px-1 py-0.2 rounded font-bold">YOU</span>
                          )}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono">@{profile.username} • Lvl {profile.level}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {leaderboardCategory === 'weekly_xp' && (
                        <span className="font-mono font-black text-xs text-emerald-400 block">
                          {weeklyXP} Weekly XP
                        </span>
                      )}
                      {leaderboardCategory === 'current_streak' && (
                        <span className="font-mono font-black text-xs text-amber-400 block">
                          🔥 {profile.streak || 0}d Streak
                        </span>
                      )}
                      {leaderboardCategory === 'longest_streak' && (
                        <span className="font-mono font-black text-xs text-purple-400 block">
                          🏆 {profile.longestStreak || 0}d Record
                        </span>
                      )}
                      <span className="text-[9px] text-gray-500 font-mono block">Total: {profile.xp || 0} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 4. FIND STUDENTS TAB --- */}
        {activeSubTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by username or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121422] border border-gray-800 rounded-2xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  {searchQuery.trim() ? "No students found." : "Type a name to search public StudyOS profiles."}
                </div>
              ) : (
                searchResults.map((profile) => {
                  const isFriend = friendsList.some(f => f.uid === profile.uid);
                  const isSent = sentRequests.some(r => r.receiverId === profile.uid);

                  return (
                    <div key={profile.uid} className="bg-[#121422] border border-gray-800 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl bg-[#1A1D2E] w-10 h-10 rounded-xl flex items-center justify-center">{profile.avatar}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{profile.displayName || profile.username}</h4>
                          <span className="text-[10px] text-gray-500 font-mono block">@{profile.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold rounded-xl cursor-pointer"
                        >
                          Profile
                        </button>
                        {userState.uid && !isFriend && !isSent && (
                          <button
                            onClick={() => handleSendFriendRequest(profile)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-xl cursor-pointer"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: STUDENT PROFILE DIALOG */}
      <FriendProfileModal
        isOpen={!!selectedProfile}
        selectedProfile={selectedProfile}
        userState={userState}
        friendsList={friendsList}
        selectedUserActivities={selectedUserActivities}
        onClose={() => setSelectedProfile(null)}
        onRemoveFriend={handleRemoveFriend}
      />

      {/* MODAL 2: PRIVACY & EDIT PROFILE */}
      <FriendsPrivacyModal
        isOpen={privacySettingsOpen}
        onClose={() => setPrivacySettingsOpen(false)}
        userState={userState}
        onUpdateBioAndName={handleUpdateBioAndName}
        onUpdatePrivacy={handleUpdatePrivacy}
        onRequestUsernameChange={handleRequestUsernameChange}
      />

      {/* NOTIFICATION CENTER */}
      <NotificationCenterModal
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
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
