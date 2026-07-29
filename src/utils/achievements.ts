import { UserState, Subject } from '../types';
import { getLevelAndProgress } from './xpUtils';

export type AchievementRarity = 
  | 'common' 
  | 'rare' 
  | 'epic' 
  | 'legendary' 
  | 'secret' 
  | 'social' 
  | 'college' 
  | 'ultra_rare' 
  | 'tiered';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  xpReward: number;
  tierName?: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Mythic';
  tierLevel?: 1 | 2 | 3 | 4 | 5;
  isSecret?: boolean;
  checkUnlocked: (userState: UserState, activeSubjects: Subject[], backlogSubjects: Subject[]) => boolean;
  getProgress?: (userState: UserState, activeSubjects: Subject[], backlogSubjects: Subject[]) => { current: number; target: number; unit?: string };
}

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  // ==========================================
  // 🟢 COMMON (60-80% of users)
  // ==========================================
  {
    id: 'first-lesson',
    title: 'First Lesson',
    description: 'Complete your first study topic or focus session.',
    icon: '📚',
    rarity: 'common',
    xpReward: 50,
    checkUnlocked: (u) => (u.completedTopics?.length || 0) >= 1 || (u.totalFocusSessions || 0) >= 1,
    getProgress: (u) => ({ current: Math.min(1, (u.completedTopics?.length || 0) + (u.totalFocusSessions || 0)), target: 1, unit: 'topic' })
  },
  {
    id: 'streak-3',
    title: 'On Fire',
    description: 'Reach a 3-day study streak.',
    icon: '🔥',
    rarity: 'common',
    xpReward: 75,
    checkUnlocked: (u) => (u.streak || 0) >= 3 || (u.longestStreak || 0) >= 3,
    getProgress: (u) => ({ current: Math.min(3, Math.max(u.streak || 0, u.longestStreak || 0)), target: 3, unit: 'days' })
  },
  {
    id: 'time-keeper-60',
    title: 'Time Keeper',
    description: 'Study for 60 minutes in a single day.',
    icon: '⏰',
    rarity: 'common',
    xpReward: 100,
    checkUnlocked: (u) => (u.todayFocusMinutes || 0) >= 60 || (u.longestFocusSessionMinutes || 0) >= 60,
    getProgress: (u) => ({ current: Math.min(60, Math.max(u.todayFocusMinutes || 0, u.longestFocusSessionMinutes || 0)), target: 60, unit: 'mins' })
  },
  {
    id: 'goal-setter',
    title: 'Goal Setter',
    description: 'Configure your daily study target in settings.',
    icon: '🎯',
    rarity: 'common',
    xpReward: 50,
    checkUnlocked: (u) => (u.dailyFocusGoal || 0) > 0,
    getProgress: (u) => ({ current: (u.dailyFocusGoal || 0) > 0 ? 1 : 0, target: 1, unit: 'goal' })
  },
  {
    id: 'streak-7',
    title: 'Consistent',
    description: 'Study for 7 consecutive days.',
    icon: '📅',
    rarity: 'common',
    xpReward: 150,
    checkUnlocked: (u) => (u.streak || 0) >= 7 || (u.longestStreak || 0) >= 7,
    getProgress: (u) => ({ current: Math.min(7, Math.max(u.streak || 0, u.longestStreak || 0)), target: 7, unit: 'days' })
  },
  {
    id: 'fresh-start',
    title: 'Fresh Start',
    description: 'Resume studying and maintain your momentum.',
    icon: '🌱',
    rarity: 'common',
    xpReward: 50,
    checkUnlocked: (u) => (u.streak || 0) >= 1,
    getProgress: (u) => ({ current: (u.streak || 0) >= 1 ? 1 : 0, target: 1, unit: 'streak' })
  },

  // ==========================================
  // 🔵 RARE (20-40% of users)
  // ==========================================
  {
    id: 'streak-30',
    title: '30-Day Streak',
    description: 'Maintain an uninterrupted 30-day streak.',
    icon: '⚡',
    rarity: 'rare',
    xpReward: 300,
    checkUnlocked: (u) => (u.streak || 0) >= 30 || (u.longestStreak || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, Math.max(u.streak || 0, u.longestStreak || 0)), target: 30, unit: 'days' })
  },
  {
    id: 'hours-100',
    title: '100 Hours Studied',
    description: 'Accumulate 100 hours (6,000 mins) of total focus.',
    icon: '⏳',
    rarity: 'rare',
    xpReward: 500,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 6000,
    getProgress: (u) => ({ current: Math.min(6000, u.totalFocusMinutes || 0), target: 6000, unit: 'mins' })
  },
  {
    id: 'subject-complete-1',
    title: 'Subject Scholar',
    description: 'Complete 100% of all topics in any subject.',
    icon: '📖',
    rarity: 'rare',
    xpReward: 250,
    checkUnlocked: (u) => (u.completedSubjects || []).length >= 1,
    getProgress: (u) => ({ current: Math.min(1, (u.completedSubjects || []).length), target: 1, unit: 'subject' })
  },
  {
    id: 'sessions-100',
    title: 'Century Club',
    description: 'Finish 100 focused study sessions.',
    icon: '🎯',
    rarity: 'rare',
    xpReward: 300,
    checkUnlocked: (u) => (u.totalFocusSessions || 0) >= 100,
    getProgress: (u) => ({ current: Math.min(100, u.totalFocusSessions || 0), target: 100, unit: 'sessions' })
  },
  {
    id: 'quiz-1000',
    title: 'Quiz Titan',
    description: 'Answer or review 1,000 quiz questions.',
    icon: '🧠',
    rarity: 'rare',
    xpReward: 400,
    checkUnlocked: (u) => {
      const revs = u.revisions || [];
      const count = revs.reduce((acc, r) => acc + (r.history?.length || 0), 0);
      return count >= 1000;
    },
    getProgress: (u) => {
      const count = (u.revisions || []).reduce((acc, r) => acc + (r.history?.length || 0), 0);
      return { current: Math.min(1000, count), target: 1000, unit: 'answers' };
    }
  },
  {
    id: 'month-no-miss',
    title: 'Iron Discipline',
    description: 'No missed day for an entire calendar month.',
    icon: '🛡️',
    rarity: 'rare',
    xpReward: 350,
    checkUnlocked: (u) => (u.streak || 0) >= 30 || (u.academicStudyStreak || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, Math.max(u.streak || 0, u.academicStudyStreak || 0)), target: 30, unit: 'days' })
  },
  {
    id: 'sessions-in-day-5',
    title: 'High Velocity',
    description: 'Complete 5 study sessions in a single day.',
    icon: '⚡',
    rarity: 'rare',
    xpReward: 200,
    checkUnlocked: (u) => (u.todayFocusSessionsCount || 0) >= 5,
    getProgress: (u) => ({ current: Math.min(5, u.todayFocusSessionsCount || 0), target: 5, unit: 'sessions' })
  },

  // ==========================================
  // 🟣 EPIC (5-15% of users)
  // ==========================================
  {
    id: 'streak-100',
    title: 'Centurion Streak',
    description: 'Reach a legendary 100-day study streak.',
    icon: '👑',
    rarity: 'epic',
    xpReward: 1000,
    checkUnlocked: (u) => (u.streak || 0) >= 100 || (u.longestStreak || 0) >= 100,
    getProgress: (u) => ({ current: Math.min(100, Math.max(u.streak || 0, u.longestStreak || 0)), target: 100, unit: 'days' })
  },
  {
    id: 'subject-complete-3',
    title: 'Triple Master',
    description: 'Finish three complete academic subjects.',
    icon: '📚',
    rarity: 'epic',
    xpReward: 750,
    checkUnlocked: (u) => (u.completedSubjects || []).length >= 3,
    getProgress: (u) => ({ current: Math.min(3, (u.completedSubjects || []).length), target: 3, unit: 'subjects' })
  },
  {
    id: 'hours-500',
    title: '500 Focus Hours',
    description: 'Accumulate 500 hours (30,000 mins) of study time.',
    icon: '💯',
    rarity: 'epic',
    xpReward: 1500,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 30000,
    getProgress: (u) => ({ current: Math.min(30000, u.totalFocusMinutes || 0), target: 30000, unit: 'mins' })
  },
  {
    id: 'level-50',
    title: 'Level 50 Veteran',
    description: 'Reach Level 50 in your learning journey.',
    icon: '🏆',
    rarity: 'epic',
    xpReward: 1000,
    checkUnlocked: (u) => (u.level || 1) >= 50,
    getProgress: (u) => ({ current: Math.min(50, u.level || 1), target: 50, unit: 'level' })
  },
  {
    id: 'daily-goal-30',
    title: 'Perfect Month',
    description: 'Hit your daily goal every day for 30 days.',
    icon: '🎯',
    rarity: 'epic',
    xpReward: 800,
    checkUnlocked: (u) => (u.academicStudyStreak || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, u.academicStudyStreak || 0), target: 30, unit: 'days' })
  },
  {
    id: 'quiz-perfect-100',
    title: 'Perfectionist 100',
    description: 'Achieve 100 perfect quiz review scores.',
    icon: '⚡',
    rarity: 'epic',
    xpReward: 900,
    checkUnlocked: (u) => {
      const revs = u.revisions || [];
      return revs.filter(r => r.learningDifficulty === 'easy').length >= 100;
    },
    getProgress: (u) => {
      const count = (u.revisions || []).filter(r => r.learningDifficulty === 'easy').length;
      return { current: Math.min(100, count), target: 100, unit: 'perfect' };
    }
  },

  // ==========================================
  // 🟡 LEGENDARY (Less than 1%)
  // ==========================================
  {
    id: 'study-legend-365',
    title: 'Study Legend',
    description: 'Maintain a 365-day streak without breaking momentum.',
    icon: '👑',
    rarity: 'legendary',
    xpReward: 5000,
    checkUnlocked: (u) => (u.streak || 0) >= 365 || (u.longestStreak || 0) >= 365,
    getProgress: (u) => ({ current: Math.min(365, Math.max(u.streak || 0, u.longestStreak || 0)), target: 365, unit: 'days' })
  },
  {
    id: 'master-of-knowledge',
    title: 'Master of Knowledge',
    description: 'Finish every subject in your current academic scheme.',
    icon: '🌌',
    rarity: 'legendary',
    xpReward: 3500,
    checkUnlocked: (u, activeSubs, backlogSubs) => {
      let total = 0;
      for (const s of [...activeSubs, ...backlogSubs]) {
        for (const m of s.modules) total += m.topics.length;
      }
      return total > 0 && (u.completedTopics?.length || 0) >= total;
    },
    getProgress: (u, activeSubs, backlogSubs) => {
      let total = 0;
      for (const s of [...activeSubs, ...backlogSubs]) {
        for (const m of s.modules) total += m.topics.length;
      }
      return { current: Math.min(total || 1, u.completedTopics?.length || 0), target: total || 1, unit: 'topics' };
    }
  },
  {
    id: 'xp-10000',
    title: '10,000 XP Club',
    description: 'Earn 10,000 total experience points in StudyOS.',
    icon: '🏔️',
    rarity: 'legendary',
    xpReward: 2000,
    checkUnlocked: (u) => (u.xp || 0) >= 10000,
    getProgress: (u) => ({ current: Math.min(10000, u.xp || 0), target: 10000, unit: 'XP' })
  },
  {
    id: 'hours-1000',
    title: '1,000 Hours',
    description: 'Study for 1,000 hours (60,000 mins) in total.',
    icon: '⏳',
    rarity: 'legendary',
    xpReward: 5000,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 60000,
    getProgress: (u) => ({ current: Math.min(60000, u.totalFocusMinutes || 0), target: 60000, unit: 'mins' })
  },
  {
    id: 'never-miss-180',
    title: 'Never Miss',
    description: 'Complete every daily goal for 180 consecutive days.',
    icon: '🔥',
    rarity: 'legendary',
    xpReward: 3000,
    checkUnlocked: (u) => (u.academicStudyStreak || 0) >= 180 || (u.longestStudyStreak || 0) >= 180,
    getProgress: (u) => ({ current: Math.min(180, Math.max(u.academicStudyStreak || 0, u.longestStudyStreak || 0)), target: 180, unit: 'days' })
  },
  {
    id: 'library-keeper',
    title: 'Library Keeper',
    description: 'Complete 500 total focused study sessions.',
    icon: '📖',
    rarity: 'legendary',
    xpReward: 2500,
    checkUnlocked: (u) => (u.totalFocusSessions || 0) >= 500,
    getProgress: (u) => ({ current: Math.min(500, u.totalFocusSessions || 0), target: 500, unit: 'sessions' })
  },
  {
    id: 'panda-best-friend',
    title: "Panda's Best Friend",
    description: 'Keep your mascot happy for 365 consecutive days.',
    icon: '🐼',
    rarity: 'legendary',
    xpReward: 5000,
    checkUnlocked: (u) => (u.streak || 0) >= 365 || (u.longestStreak || 0) >= 365,
    getProgress: (u) => ({ current: Math.min(365, Math.max(u.streak || 0, u.longestStreak || 0)), target: 365, unit: 'days' })
  },

  // ==========================================
  // 🌟 SECRET ACHIEVEMENTS
  // ==========================================
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Study late after midnight 30 times.',
    icon: '🕵️',
    rarity: 'secret',
    isSecret: true,
    xpReward: 250,
    checkUnlocked: (u) => (u.nightSessionsCount || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, u.nightSessionsCount || 0), target: 30, unit: 'late sessions' })
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Study before 6:00 AM for 30 days.',
    icon: '🌅',
    rarity: 'secret',
    isSecret: true,
    xpReward: 250,
    checkUnlocked: (u) => (u.earlyMorningSessionsCount || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, u.earlyMorningSessionsCount || 0), target: 30, unit: 'mornings' })
  },
  {
    id: 'comeback-king',
    title: 'Comeback King',
    description: 'Return after being inactive and restore your streak.',
    icon: '💀',
    rarity: 'secret',
    isSecret: true,
    xpReward: 300,
    checkUnlocked: (u) => u.hasRestoredStreak === true,
    getProgress: (u) => ({ current: u.hasRestoredStreak ? 1 : 0, target: 1, unit: 'comeback' })
  },
  {
    id: 'marathon-8h',
    title: 'Marathon',
    description: 'Study for 8 hours (480 mins) in a single day.',
    icon: '🚀',
    rarity: 'secret',
    isSecret: true,
    xpReward: 1000,
    checkUnlocked: (u) => (u.todayFocusMinutes || 0) >= 480,
    getProgress: (u) => ({ current: Math.min(480, u.todayFocusMinutes || 0), target: 480, unit: 'mins' })
  },
  {
    id: 'lightning-fast',
    title: 'Lightning Fast',
    description: 'Finish a quiz revision with 100% accuracy.',
    icon: '⚡',
    rarity: 'secret',
    isSecret: true,
    xpReward: 200,
    checkUnlocked: (u) => (u.revisions || []).some(r => r.learningDifficulty === 'easy'),
    getProgress: (u) => ({ current: (u.revisions || []).some(r => r.learningDifficulty === 'easy') ? 1 : 0, target: 1, unit: 'quiz' })
  },

  // ==========================================
  // 👥 SOCIAL ACHIEVEMENTS
  // ==========================================
  {
    id: 'first-friend',
    title: 'First Friend',
    description: 'Connect with your first study buddy on StudyOS.',
    icon: '🤝',
    rarity: 'social',
    xpReward: 100,
    checkUnlocked: (u) => (u.friendsCount || 0) >= 1 || (u.friends || []).length >= 1,
    getProgress: (u) => ({ current: Math.min(1, (u.friendsCount || 0) + (u.friends || []).length), target: 1, unit: 'friend' })
  },
  {
    id: 'squad-leader',
    title: 'Squad Leader',
    description: 'Add 10 friends to your study network.',
    icon: '👥',
    rarity: 'social',
    xpReward: 500,
    checkUnlocked: (u) => (u.friendsCount || 0) >= 10 || (u.friends || []).length >= 10,
    getProgress: (u) => ({ current: Math.min(10, Math.max(u.friendsCount || 0, (u.friends || []).length)), target: 10, unit: 'squad' })
  },
  {
    id: 'first-place',
    title: 'First Place',
    description: 'Top your weekly friend leaderboard.',
    icon: '🥇',
    rarity: 'social',
    xpReward: 400,
    checkUnlocked: (u) => u.weeklyLeaderboardRank === 1 || u.isFirstPlace === true,
    getProgress: (u) => ({ current: u.weeklyLeaderboardRank === 1 || u.isFirstPlace === true ? 1 : 0, target: 1, unit: 'first place' })
  },

  // ==========================================
  // 🏫 COLLEGE-SPECIFIC
  // ==========================================
  {
    id: 'semester-survivor',
    title: 'Semester Survivor',
    description: 'Finish all requirements for an entire academic semester.',
    icon: '🎓',
    rarity: 'college',
    xpReward: 1000,
    checkUnlocked: (u) => (u.completedSemesters || []).length >= 1,
    getProgress: (u) => ({ current: Math.min(1, (u.completedSemesters || []).length), target: 1, unit: 'semester' })
  },
  {
    id: 'backlog-destroyer',
    title: 'Backlog Destroyer',
    description: 'Clear all backlog subjects from your active schedule.',
    icon: '📜',
    rarity: 'college',
    xpReward: 750,
    checkUnlocked: (u, _, backlogSubs) => backlogSubs.length === 0 && (u.completedTopics || []).length >= 1,
    getProgress: (_, __, backlogSubs) => ({ current: backlogSubs.length === 0 ? 1 : 0, target: 1, unit: 'cleared' })
  },
  {
    id: 'vtu-warrior',
    title: 'VTU Warrior',
    description: 'Complete 100% of all VTU 2022/2025 scheme subjects.',
    icon: '🏅',
    rarity: 'college',
    xpReward: 1200,
    checkUnlocked: (u) => (u.completedSubjects || []).length >= 4,
    getProgress: (u) => ({ current: Math.min(4, (u.completedSubjects || []).length), target: 4, unit: 'subjects' })
  },
  {
    id: 'module-master',
    title: 'Module Master',
    description: 'Master every single topic in any full module.',
    icon: '📚',
    rarity: 'college',
    xpReward: 200,
    checkUnlocked: (u) => (u.completedModules || []).length >= 1,
    getProgress: (u) => ({ current: Math.min(1, (u.completedModules || []).length), target: 1, unit: 'module' })
  },

  // ==========================================
  // 🎮 ULTRA-RARE (0.01%)
  // ==========================================
  {
    id: 'the-chosen-one',
    title: 'The Chosen One',
    description: 'Achieve a monumental 1,000-day study streak.',
    icon: '👑',
    rarity: 'ultra_rare',
    xpReward: 10000,
    checkUnlocked: (u) => (u.streak || 0) >= 1000 || (u.longestStreak || 0) >= 1000,
    getProgress: (u) => ({ current: Math.min(1000, Math.max(u.streak || 0, u.longestStreak || 0)), target: 1000, unit: 'days' })
  },
  {
    id: 'ascended-scholar',
    title: 'Ascended Scholar',
    description: 'Reach maximum Level 100 on StudyOS.',
    icon: '💠',
    rarity: 'ultra_rare',
    xpReward: 7500,
    checkUnlocked: (u) => (u.level || 1) >= 100,
    getProgress: (u) => ({ current: Math.min(100, u.level || 1), target: 100, unit: 'level' })
  },
  {
    id: 'infinite-knowledge',
    title: 'Infinite Knowledge',
    description: 'Log 5,000 hours (300,000 mins) of focus time.',
    icon: '🌌',
    rarity: 'ultra_rare',
    xpReward: 15000,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 300000,
    getProgress: (u) => ({ current: Math.min(300000, u.totalFocusMinutes || 0), target: 300000, unit: 'mins' })
  },
  {
    id: 'panda-whisperer',
    title: 'Panda Whisperer',
    description: 'Maintain maximum mascot happiness for an entire year.',
    icon: '🐼',
    rarity: 'ultra_rare',
    xpReward: 10000,
    checkUnlocked: (u) => (u.streak || 0) >= 365 || (u.longestStreak || 0) >= 365,
    getProgress: (u) => ({ current: Math.min(365, Math.max(u.streak || 0, u.longestStreak || 0)), target: 365, unit: 'days' })
  },

  // ==========================================
  // 🏆 TIERED ACHIEVEMENTS (Progressive Badges)
  // ==========================================
  // 1. Streak Master Tiers
  {
    id: 'streak-bronze',
    title: 'Streak Master (Bronze)',
    description: 'Maintain a 7-day study streak.',
    icon: '🥉',
    rarity: 'tiered',
    tierName: 'Bronze',
    tierLevel: 1,
    xpReward: 100,
    checkUnlocked: (u) => (u.streak || 0) >= 7 || (u.longestStreak || 0) >= 7,
    getProgress: (u) => ({ current: Math.min(7, Math.max(u.streak || 0, u.longestStreak || 0)), target: 7, unit: 'days' })
  },
  {
    id: 'streak-silver',
    title: 'Streak Master (Silver)',
    description: 'Maintain a 30-day study streak.',
    icon: '🥈',
    rarity: 'tiered',
    tierName: 'Silver',
    tierLevel: 2,
    xpReward: 300,
    checkUnlocked: (u) => (u.streak || 0) >= 30 || (u.longestStreak || 0) >= 30,
    getProgress: (u) => ({ current: Math.min(30, Math.max(u.streak || 0, u.longestStreak || 0)), target: 30, unit: 'days' })
  },
  {
    id: 'streak-gold',
    title: 'Streak Master (Gold)',
    description: 'Maintain a 100-day study streak.',
    icon: '🥇',
    rarity: 'tiered',
    tierName: 'Gold',
    tierLevel: 3,
    xpReward: 1000,
    checkUnlocked: (u) => (u.streak || 0) >= 100 || (u.longestStreak || 0) >= 100,
    getProgress: (u) => ({ current: Math.min(100, Math.max(u.streak || 0, u.longestStreak || 0)), target: 100, unit: 'days' })
  },
  {
    id: 'streak-diamond',
    title: 'Streak Master (Diamond)',
    description: 'Maintain a 365-day study streak.',
    icon: '💎',
    rarity: 'tiered',
    tierName: 'Diamond',
    tierLevel: 4,
    xpReward: 5000,
    checkUnlocked: (u) => (u.streak || 0) >= 365 || (u.longestStreak || 0) >= 365,
    getProgress: (u) => ({ current: Math.min(365, Math.max(u.streak || 0, u.longestStreak || 0)), target: 365, unit: 'days' })
  },
  {
    id: 'streak-mythic',
    title: 'Streak Master (Mythic)',
    description: 'Maintain a 1,000-day study streak.',
    icon: '🌌',
    rarity: 'tiered',
    tierName: 'Mythic',
    tierLevel: 5,
    xpReward: 10000,
    checkUnlocked: (u) => (u.streak || 0) >= 1000 || (u.longestStreak || 0) >= 1000,
    getProgress: (u) => ({ current: Math.min(1000, Math.max(u.streak || 0, u.longestStreak || 0)), target: 1000, unit: 'days' })
  },

  // 2. Focus Hours Tiers
  {
    id: 'hours-bronze',
    title: 'Focus Master (Bronze)',
    description: 'Study for 10 total hours (600 mins).',
    icon: '🥉',
    rarity: 'tiered',
    tierName: 'Bronze',
    tierLevel: 1,
    xpReward: 100,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 600,
    getProgress: (u) => ({ current: Math.min(600, u.totalFocusMinutes || 0), target: 600, unit: 'mins' })
  },
  {
    id: 'hours-silver',
    title: 'Focus Master (Silver)',
    description: 'Study for 50 total hours (3,000 mins).',
    icon: '🥈',
    rarity: 'tiered',
    tierName: 'Silver',
    tierLevel: 2,
    xpReward: 350,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 3000,
    getProgress: (u) => ({ current: Math.min(3000, u.totalFocusMinutes || 0), target: 3000, unit: 'mins' })
  },
  {
    id: 'hours-gold',
    title: 'Focus Master (Gold)',
    description: 'Study for 100 total hours (6,000 mins).',
    icon: '🥇',
    rarity: 'tiered',
    tierName: 'Gold',
    tierLevel: 3,
    xpReward: 750,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 6000,
    getProgress: (u) => ({ current: Math.min(6000, u.totalFocusMinutes || 0), target: 6000, unit: 'mins' })
  },
  {
    id: 'hours-diamond',
    title: 'Focus Master (Diamond)',
    description: 'Study for 500 total hours (30,000 mins).',
    icon: '💎',
    rarity: 'tiered',
    tierName: 'Diamond',
    tierLevel: 4,
    xpReward: 2500,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 30000,
    getProgress: (u) => ({ current: Math.min(30000, u.totalFocusMinutes || 0), target: 30000, unit: 'mins' })
  },
  {
    id: 'hours-mythic',
    title: 'Focus Master (Mythic)',
    description: 'Study for 1,000 total hours (60,000 mins).',
    icon: '🌌',
    rarity: 'tiered',
    tierName: 'Mythic',
    tierLevel: 5,
    xpReward: 7500,
    checkUnlocked: (u) => (u.totalFocusMinutes || 0) >= 60000,
    getProgress: (u) => ({ current: Math.min(60000, u.totalFocusMinutes || 0), target: 60000, unit: 'mins' })
  }
];

// Compatibility exports
export const ACHIEVEMENT_DEFS = ALL_ACHIEVEMENTS;

export function isAchievementClaimed(userState: UserState, achId: string): boolean {
  if (!userState) return false;
  return (userState.unlockedAchievements || []).includes(achId);
}

export function isAchievementReadyToClaim(
  userState: UserState,
  ach: AchievementDef,
  activeSubjects: Subject[] = [],
  backlogSubjects: Subject[] = []
): boolean {
  if (!userState) return false;
  const claimed = isAchievementClaimed(userState, ach.id);
  if (claimed) return false;
  return ach.checkUnlocked(userState, activeSubjects, backlogSubjects);
}

export function getReadyToClaimAchievements(
  userState: UserState,
  activeSubjects: Subject[] = [],
  backlogSubjects: Subject[] = []
): AchievementDef[] {
  if (!userState) return [];
  return ALL_ACHIEVEMENTS.filter((ach) =>
    isAchievementReadyToClaim(userState, ach, activeSubjects, backlogSubjects)
  );
}

export function claimAchievement(
  userState: UserState,
  achId: string,
  _activeSubjects: Subject[] = [],
  _backlogSubjects: Subject[] = []
): { updatedState: UserState; claimedAchievement: AchievementDef | null } {
  if (!userState) return { updatedState: userState, claimedAchievement: null };

  const ach = ALL_ACHIEVEMENTS.find((a) => a.id === achId);
  if (!ach) return { updatedState: userState, claimedAchievement: null };

  const currentUnlocked = userState.unlockedAchievements || [];
  if (currentUnlocked.includes(achId)) {
    return { updatedState: userState, claimedAchievement: ach };
  }

  const newUnlocked = [...currentUnlocked, achId];
  const newXp = (userState.xp || 0) + ach.xpReward;
  const newLevel = getLevelAndProgress(newXp).level;

  const updatedState: UserState = {
    ...userState,
    unlockedAchievements: newUnlocked,
    xp: newXp,
    level: newLevel,
  };

  return { updatedState, claimedAchievement: ach };
}

export function claimAllAchievements(
  userState: UserState,
  activeSubjects: Subject[] = [],
  backlogSubjects: Subject[] = []
): { updatedState: UserState; claimedAchievements: AchievementDef[]; totalXpAdded: number } {
  if (!userState) return { updatedState: userState, claimedAchievements: [], totalXpAdded: 0 };

  const readyList = getReadyToClaimAchievements(userState, activeSubjects, backlogSubjects);
  if (readyList.length === 0) return { updatedState: userState, claimedAchievements: [], totalXpAdded: 0 };

  const currentUnlocked = userState.unlockedAchievements || [];
  const newUnlockedIds = [...currentUnlocked, ...readyList.map((a) => a.id)];
  const totalXpAdded = readyList.reduce((sum, a) => sum + a.xpReward, 0);

  const newXp = (userState.xp || 0) + totalXpAdded;
  const newLevel = getLevelAndProgress(newXp).level;

  const updatedState: UserState = {
    ...userState,
    unlockedAchievements: Array.from(new Set(newUnlockedIds)),
    xp: newXp,
    level: newLevel,
  };

  return { updatedState, claimedAchievements: readyList, totalXpAdded };
}

export function getUnlockedAchievementIds(
  userState: UserState,
  _activeSubjects: Subject[] = [],
  _backlogSubjects: Subject[] = []
): string[] {
  if (!userState) return [];
  return userState.unlockedAchievements || [];
}

export function syncUserAchievementsAndXP(
  userState: UserState,
  _activeSubjects: Subject[] = [],
  _backlogSubjects: Subject[] = []
): { updatedState: UserState; newlyUnlocked: AchievementDef[] } {
  // Return userState directly without auto-claiming XP, allowing manual user claim
  return { updatedState: userState, newlyUnlocked: [] };
}
