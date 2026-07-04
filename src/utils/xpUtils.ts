/**
 * Progressive XP Utility Module
 * Matches user's exact level-up XP milestones and provides smooth growth profiles in between.
 */

export function getXPNeededForLevel(level: number): number {
  if (level < 1) return 0;
  if (level === 1) return 100;
  if (level === 2) return 150;
  if (level === 3) return 225;
  if (level === 4) return 330;
  if (level === 5) return 480;
  if (level === 10) return 1600;
  if (level === 20) return 6500;
  if (level === 50) return 35000;

  // Exponential interpolation/extrapolation between milestone tiers:
  if (level > 5 && level < 10) {
    const ratio = 1600 / 480;
    const val = 480 * Math.pow(ratio, (level - 5) / 5);
    return Math.round(val / 10) * 10;
  }
  if (level > 10 && level < 20) {
    const ratio = 6500 / 1600;
    const val = 1600 * Math.pow(ratio, (level - 10) / 10);
    return Math.round(val / 50) * 50;
  }
  if (level > 20 && level < 50) {
    const ratio = 35000 / 6500;
    const val = 6500 * Math.pow(ratio, (level - 20) / 30);
    return Math.round(val / 100) * 100;
  }

  // Extrapolate for level > 50:
  const val = 35000 * Math.pow(1.05, level - 50);
  return Math.round(val / 250) * 250;
}

const cumulativeXPCache: { [level: number]: number } = {};

export function getCumulativeXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (cumulativeXPCache[level] !== undefined) {
    return cumulativeXPCache[level];
  }

  let sum = 0;
  for (let l = 1; l < level; l++) {
    sum += getXPNeededForLevel(l);
  }
  cumulativeXPCache[level] = sum;
  return sum;
}

export interface LevelProgress {
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  xpPercent: number;
}

export function getLevelAndProgress(totalXp: number): LevelProgress {
  let level = 1;
  while (totalXp >= getCumulativeXPForLevel(level + 1)) {
    level++;
  }

  const currentLevelStartXP = getCumulativeXPForLevel(level);
  const xpInCurrentLevel = totalXp - currentLevelStartXP;
  const xpNeededForNextLevel = getXPNeededForLevel(level);
  const xpPercent = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  return {
    level,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    xpPercent,
  };
}

export type DifficultyType = 'Easy' | 'Medium' | 'Hard';

export interface DifficultyConfig {
  xpReward: number;
  estimatedMinutes: number;
  revisionDays: number;
}

export const DIFFICULTY_CONFIGS: { [key in DifficultyType]: DifficultyConfig } = {
  Easy: {
    xpReward: 80,
    estimatedMinutes: 20,
    revisionDays: 3,
  },
  Medium: {
    xpReward: 100,
    estimatedMinutes: 30,
    revisionDays: 2,
  },
  Hard: {
    xpReward: 140,
    estimatedMinutes: 45,
    revisionDays: 1,
  }
};

export function getSubjectDifficulty(
  subjectDifficulties: { [key: string]: 'Easy' | 'Medium' | 'Hard' } | undefined,
  subjectId: string
): DifficultyType {
  if (!subjectDifficulties) return 'Medium';
  return subjectDifficulties[subjectId] || 'Medium';
}

export function getDifficultyConfig(
  subjectDifficulties: { [key: string]: 'Easy' | 'Medium' | 'Hard' } | undefined,
  subjectId: string
): DifficultyConfig {
  const difficulty = getSubjectDifficulty(subjectDifficulties, subjectId);
  return DIFFICULTY_CONFIGS[difficulty];
}

export function getTopicEstimatedTime(
  subjectDifficulties: { [key: string]: 'Easy' | 'Medium' | 'Hard' } | undefined,
  subjectId: string,
  defaultTime: number = 30
): number {
  const config = getDifficultyConfig(subjectDifficulties, subjectId);
  return config.estimatedMinutes;
}


