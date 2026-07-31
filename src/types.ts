export interface Topic {
  id: string; // E.g., "cse-s2-py-m2-t1"
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: number; // in minutes
}

export interface Module {
  id: string; // E.g., "cse-s2-py-m2"
  name: string;
  topics: Topic[];
}

export interface Subject {
  id: string; // E.g., "cse-s2-py"
  name: string;
  semester: number;
  modules: Module[];
}

export interface CourseTemplate {
  university: string; // VTU, etc.
  branch: string; // CSE, ISE, AIML, ECE
  scheme: string; // 2022 Scheme, 2025 Scheme
  semesters: {
    [semesterNumber: number]: Subject[];
  };
}

export type TodoPriority = 'high' | 'medium' | 'low';
export type TodoCategory = 'study' | 'personal' | 'project' | 'assignment' | string;
export type TodoRepeat = 'none' | 'daily' | 'mon-wed-fri' | 'weekly';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: TodoPriority;
  category: TodoCategory;
  dueDate?: string; // "YYYY-MM-DD"
  dueTime?: string; // "HH:MM"
  repeat?: TodoRepeat;
  parentTaskId?: string;
  isInstance?: boolean;
  dateCreated: string; // "YYYY-MM-DD"
  order: number;
  completedAt?: string; // ISO date or "YYYY-MM-DD"
}

export interface Revision {
  id: string;
  topicId: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  completed: boolean;
  learningDifficulty: "easy" | "medium" | "hard";
  repetitions: number;
  interval: number;
  lastReviewed: string;
  nextReview: string;
  status: "scheduled" | "due";
  completedAt: string;
  dueDate?: string; // Keep for legacy / backward compatibility
  easeFactor?: number; // Keep for legacy / backward compatibility
  examImportant?: boolean; // Exam-important flag (Exam Mode priority)
  history?: { date: string; rating: 'forgot' | 'hard' | 'good' | 'easy' }[]; // completed review history
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  unlockedAt: string | null; // ISO Date String
}

export interface UserState {
  onboarded: boolean;
  username: string;
  university: string;
  branch: string;
  semester: number;
  scheme: string;
  avatar: string; // Emoji
  joinedDate: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  completedTopics: string[]; // topicIds
  completedModules: string[]; // moduleIds
  completedSubjects: string[]; // subjectIds
  completedSemesters: number[];
  backlogSubjects: string[]; // subjectIds chosen as backlog
  firstYearCycle?: 'Physics' | 'Chemistry';
  revisions: Revision[];
  activeTab: 'home' | 'todos' | 'progression' | 'progress' | 'profile' | 'settings' | 'friends';
  inProgressTopics: string[]; // topicIds currently in progress
  todos?: TodoItem[];
  autoMoveUncompletedTodos?: boolean;
  petStatus?: string;
  // Appearance Settings
  themeMode?: 'dark' | 'light' | 'oled';
  // Heatmap tracking
  studyActivity: { [date: string]: number }; // "YYYY-MM-DD" -> count of completed tasks
  // Notification configuration
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string; // "HH:MM" format
  streakAlertsEnabled?: boolean;
  // Sound & Haptic Settings
  soundEffectsEnabled?: boolean;
  hapticFeedbackEnabled?: boolean;
  celebrationAnimationsEnabled?: boolean;
  soundFocusModeEnabled?: boolean;
  soundVolume?: number; // 0 to 100

  // Friends & Social Profile Properties
  uid?: string; // Firebase Authentication UID
  email?: string; // Google email
  displayName?: string;
  lastDisplayNameChangeAt?: string; // ISO date string when display name was last updated
  usernameChangeRequested?: boolean;
  usernameChangeReason?: string;
  bio?: string;
  isPublic?: boolean;
  allowFriendRequests?: boolean;
  hideXP?: boolean;
  hideStreak?: boolean;
  hideAchievements?: boolean;
  usernameViolation?: boolean;
  bioViolation?: boolean;
  isOffline?: boolean;
  unlockedAchievements?: string[];
  showNotificationsModal?: boolean;
  previousTabBeforeNotification?: 'home' | 'todos' | 'progression' | 'progress' | 'profile' | 'settings' | 'friends' | null;
  // Study Habit System
  dailyFocusGoal?: number; // in minutes
  academicStudyStreak?: number;
  longestStudyStreak?: number;
  totalFocusMinutes?: number;
  weeklyFocusMinutes?: number;
  monthlyFocusMinutes?: number;
  totalFocusSessions?: number;
  longestFocusSessionMinutes?: number;
  todayFocusMinutes?: number;
  todayFocusXPRewarded?: number;
  studyShields?: number; // defaults to 3
  weeklyStudySchedule?: string[]; // e.g. ['Monday', 'Tuesday', ...]
  semesterStartDate?: string | null; // YYYY-MM-DD
  semesterEndDate?: string | null; // YYYY-MM-DD
  semesterBreaks?: { id: string; name: string; startDate: string; endDate: string }[];
  vacationMode?: { active: boolean; startDate: string | null; endDate: string | null; reason?: string };
  semesterBreakMode?: boolean;
  lastFocusDate?: string | null; // YYYY-MM-DD
  focusHistory?: { [date: string]: number }; // YYYY-MM-DD -> minutes
  dailyXP?: { [date: string]: number }; // YYYY-MM-DD -> XP earned on that date
  subjectDifficulties?: { [subjectId: string]: 'Easy' | 'Medium' | 'Hard' };
  reviewStreak?: number;
  longestReviewStreak?: number;
  lastReviewDate?: string | null;
  examModeActive?: boolean;
  examDate?: string; // YYYY-MM-DD
  includedReviewSemesters?: number[]; // Selected semesters to include in revision/spaced repetition (archived semesters)
  examModeConfigDays?: number; // default: 14 days
  todayFocusSessionsCount?: number;
  nightSessionsCount?: number;
  earlyMorningSessionsCount?: number;
  hasRestoredStreak?: boolean;
  friendsCount?: number;
  friends?: string[];
  weeklyLeaderboardRank?: number;
  isFirstPlace?: boolean;
  vtuSchemeCompleted?: boolean;
}

export interface FriendProfile {
  uid: string;
  username: string;
  displayName: string;
  avatar: string;
  university: string;
  branch: string;
  semester: number;
  scheme: string;
  level: number;
  xp: number;
  weeklyXP?: number;
  streak: number;
  longestStreak: number;
  modulesCompleted: number;
  semesterProgress: number;
  joinedDate: string;
  bio?: string;
  isPublic: boolean;
  allowFriendRequests: boolean;
  hideXP: boolean;
  hideStreak: boolean;
  hideAchievements: boolean;
  status: 'online' | 'active_yesterday' | 'offline';
  lastActive?: string;
  badges?: string[];
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string;
  receiverAvatar: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Friendship {
  id: string;
  uids: [string, string];
  createdAt: string;
}

export interface SocialNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'friend_request' | 'friend_accept' | 'friend_level' | 'friend_streak' | 'friend_semester';
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  read: boolean;
  createdAt: string;
}

export interface SocialActivity {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export type CourseKey = string; // university_branch_scheme

export interface ModuleResource {
  id: string;
  moduleId: string;
  title: string;
  type: 'youtube' | 'pdf' | 'drive' | 'ppt' | 'website' | 'notes';
  url: string;
  description?: string;
  dateAdded: string; // ISO date string or local date string
}

