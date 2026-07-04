import { UserState, Subject } from '../types';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first-topic',
    title: 'First Milestone',
    description: 'Complete your first study topic',
    icon: '🎯',
  },
  {
    id: 'module-master',
    title: 'Module Explorer',
    description: 'Master any full module (100%)',
    icon: '🏆',
  },
  {
    id: 'level-up',
    title: 'Level 2 Apprentice',
    description: 'Reach Level 2 in your learning journey',
    icon: '⚡',
  },
  {
    id: 'streak-3',
    title: 'Consistency Star',
    description: 'Maintain a 3-day study streak',
    icon: '🔥',
  },
  {
    id: 'maestro',
    title: 'Academic Maestro',
    description: 'Complete 10 topics this semester',
    icon: '👑',
  },
  {
    id: 'semester-completion',
    title: 'Semester Champion',
    description: 'Complete all topics in your current semester',
    icon: '🎓',
  },
];

export function getUnlockedAchievementIds(
  userState: UserState,
  activeSubjects: Subject[],
  backlogSubjects: Subject[]
): string[] {
  if (!userState) return [];
  const { completedTopics = [], completedModules = [], level = 1, streak = 0 } = userState;
  const completedTopicsCount = completedTopics ? completedTopics.length : 0;

  // Calculate total topics
  let totalSyllabusTopicsCount = 0;
  for (const sub of [...activeSubjects, ...backlogSubjects]) {
    for (const mod of sub.modules) {
      totalSyllabusTopicsCount += mod.topics.length;
    }
  }

  const unlockedIds: string[] = [];

  // 1. first-topic
  if (completedTopicsCount >= 1) {
    unlockedIds.push('first-topic');
  }

  // 2. module-master
  if (completedModules.length >= 1) {
    unlockedIds.push('module-master');
  }

  // 3. level-up
  if (level >= 2) {
    unlockedIds.push('level-up');
  }

  // 4. streak-3
  if (streak >= 3) {
    unlockedIds.push('streak-3');
  }

  // 5. maestro
  if (completedTopicsCount >= 10) {
    unlockedIds.push('maestro');
  }

  // 6. semester-completion
  if (totalSyllabusTopicsCount > 0 && completedTopicsCount >= totalSyllabusTopicsCount) {
    unlockedIds.push('semester-completion');
  }

  return unlockedIds;
}
