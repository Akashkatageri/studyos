import { Revision, UserState, Subject } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { findTopicById, getReviewSubjectsForState } from '../data';

/**
 * Parses a "YYYY-MM-DD" string into a Date object in a timezone-safe manner.
 */
export function parseDateUTC(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Adds a specified number of days to a "YYYY-MM-DD" date string and returns the new "YYYY-MM-DD" string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateUTC(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safe calculation of days difference between two YYYY-MM-DD strings.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = parseDateUTC(dateStr1);
  const d2 = parseDateUTC(dateStr2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Initializes a new revision object for a completed topic.
 */
export function createInitialRevision(
  topicId: string,
  subjectId: string,
  subjectName: string,
  topicName: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Revision {
  const today = getLocalDateString();
  let interval = 1;
  if (difficulty === 'easy') {
    interval = 3;
  } else if (difficulty === 'medium') {
    interval = 2;
  } else if (difficulty === 'hard') {
    interval = 1;
  }

  const nextReview = addDaysToDateString(today, interval);

  return {
    id: `rev-${topicId}`, // Predictable unique ID prevents duplicates and survives reinstalls
    topicId,
    subjectId,
    subjectName,
    topicName,
    completed: false,
    learningDifficulty: difficulty,
    repetitions: 0,
    interval,
    lastReviewed: today,
    nextReview,
    status: 'scheduled',
    completedAt: today,
    dueDate: nextReview, // Keep for backward compatibility
  };
}

export type ReviewRating = 'forgot' | 'hard' | 'good' | 'easy';

/**
 * Checks if Exam Mode is currently active for the user.
 */
export function isExamModeCurrentlyActive(userState: UserState): boolean {
  if (userState.examModeActive) return true; // manual override toggle
  if (!userState.examDate) return false;
  
  const todayStr = getLocalDateString();
  const daysDiff = getDaysDifference(todayStr, userState.examDate);
  const configDays = userState.examModeConfigDays ?? 14;
  
  // Active if today is within configDays prior to the exam date, and the exam date is today or in the future
  return daysDiff >= 0 && daysDiff <= configDays;
}

/**
 * Calculates estimated review time in minutes for a queue of revisions.
 */
export function getEstimatedReviewTimeMinutes(
  dueRevisions: Revision[],
  activeSubjects: Subject[],
  backlogSubjects: Subject[] = []
): number {
  const allSubjects = [...activeSubjects, ...backlogSubjects];
  let totalMinutes = 0;
  for (const rev of dueRevisions) {
    // default 45 seconds per revision (0.75 mins) if topic info is not found
    let topicMinutes = 0.75;
    const result = findTopicById(rev.topicId, allSubjects, []);
    if (result && result.topic) {
      // 15% of learning estimated time, minimum 45 seconds
      topicMinutes = Math.max(0.75, result.topic.estimatedTime * 0.15);
    }
    totalMinutes += topicMinutes;
  }
  return Math.max(1, Math.round(totalMinutes));
}

/**
 * Updates scheduling parameters of a revision based on simple Spaced Repetition logic.
 */
export function updateRevisionScheduling(
  revision: Revision,
  rating: ReviewRating
): Revision {
  const today = getLocalDateString();
  let nextRepetitions = revision.repetitions ?? 0;
  let nextInterval = revision.interval ?? 1;

  if (rating === 'forgot') {
    nextRepetitions = 0;
    nextInterval = 1;
  } else if (rating === 'hard') {
    nextRepetitions = nextRepetitions + 1;
    // keep similar interval
    nextInterval = Math.max(1, nextInterval);
  } else if (rating === 'good') {
    nextRepetitions = nextRepetitions + 1;
    nextInterval = nextInterval * 2;
  } else if (rating === 'easy') {
    nextRepetitions = nextRepetitions + 1;
    nextInterval = nextInterval * 3;
  }

  const nextReviewDateStr = addDaysToDateString(today, nextInterval);

  const updatedHistory = [...(revision.history || [])];
  updatedHistory.push({ date: today, rating });

  return {
    ...revision,
    repetitions: nextRepetitions,
    interval: nextInterval,
    lastReviewed: today,
    nextReview: nextReviewDateStr,
    completed: false, // remains in review loop
    status: 'scheduled',
    dueDate: nextReviewDateStr, // backward compatibility
    history: updatedHistory,
  };
}

/**
 * Sanitizes and deduplicates the revisions array in a userState.
 * It merges any duplicate revisions for the same topic to avoid redundancy.
 */
export function sanitizeRevisions(revisions: Revision[]): Revision[] {
  if (!Array.isArray(revisions)) return [];
  const map = new Map<string, Revision>();
  const todayStr = getLocalDateString();

  // Sort so that newer or more initialized objects override older ones
  const sortedRevisions = [...revisions].sort((a, b) => {
    const valA = (a.repetitions ?? 0) + (a.interval ?? 0);
    const valB = (b.repetitions ?? 0) + (b.interval ?? 0);
    return valA - valB; // lower weight first, so higher weight overrides in map.set
  });

  for (const rev of sortedRevisions) {
    if (!rev.topicId) continue;

    const nextReviewStr = rev.nextReview || rev.dueDate || addDaysToDateString(todayStr, 1);
    const isDue = nextReviewStr <= todayStr;

    const normalized: Revision = {
      id: rev.id || `rev-${rev.topicId}`,
      topicId: rev.topicId,
      subjectId: rev.subjectId || '',
      subjectName: rev.subjectName || '',
      topicName: rev.topicName || '',
      completed: rev.completed ?? false,
      learningDifficulty: rev.learningDifficulty || 'medium',
      repetitions: rev.repetitions ?? 0,
      interval: rev.interval ?? 1,
      lastReviewed: rev.lastReviewed || todayStr,
      nextReview: nextReviewStr,
      status: isDue ? 'due' : 'scheduled',
      completedAt: rev.completedAt || todayStr,
      dueDate: rev.dueDate || nextReviewStr,
    };

    map.set(rev.topicId, normalized);
  }

  return Array.from(map.values());
}

/**
 * Returns the Daily Review Queue, containing overdue reviews and reviews due today.
 * Supports Exam Mode scheduling override if userState is passed.
 * Automatically filters out topics from past completed semesters unless they are backlog subjects.
 */
export function getDailyReviewQueue(
  revisions: Revision[],
  userState?: UserState,
  activeSubjects?: Subject[],
  backlogSubjects?: Subject[]
): Revision[] {
  const sanitized = sanitizeRevisions(revisions);
  const todayStr = getLocalDateString();

  let validSubjects: Subject[] = [];

  if (userState) {
    validSubjects = getReviewSubjectsForState(userState);
  } else if (activeSubjects && activeSubjects.length > 0) {
    validSubjects = [...activeSubjects, ...(backlogSubjects || [])];
  }

  // Filter out topics from past completed semesters (unless included in review scope or backlog)
  const scopedRevisions = (validSubjects.length > 0)
    ? sanitized.filter((rev) => !!findTopicById(rev.topicId, validSubjects, []))
    : sanitized;

  // Filter for reviews that are due today or overdue
  const dueReviews = scopedRevisions.filter((rev) => {
    // If it was reviewed today, let it be completed for today
    if (rev.lastReviewed === todayStr && rev.repetitions > 0 && rev.status === 'scheduled') {
      return false;
    }
    // Return true if nextReview date is today or in the past
    return rev.nextReview <= todayStr;
  });

  const isExamMode = userState ? isExamModeCurrentlyActive(userState) : false;

  if (isExamMode) {
    return dueReviews.sort((a, b) => {
      // 1. Exam-important topics
      const aImportant = !!a.examImportant;
      const bImportant = !!b.examImportant;
      if (aImportant && !bImportant) return -1;
      if (!aImportant && bImportant) return 1;

      // 2. Previously forgotten (repetitions === 0 or interval === 1)
      const aForgotten = (a.repetitions === 0 || a.interval === 1);
      const bForgotten = (b.repetitions === 0 || b.interval === 1);
      if (aForgotten && !bForgotten) return -1;
      if (!aForgotten && bForgotten) return 1;

      // 3. Hard topics (learningDifficulty === 'hard')
      const aHard = a.learningDifficulty === 'hard';
      const bHard = b.learningDifficulty === 'hard';
      if (aHard && !bHard) return -1;
      if (!aHard && bHard) return 1;

      // 4. Frequently revised topics (repetitions descending)
      const aReps = a.repetitions ?? 0;
      const bReps = b.repetitions ?? 0;
      if (aReps !== bReps) {
        return bReps - aReps; // highest reps first
      }

      // 5. Remaining due topics (oldest review date first)
      return a.nextReview.localeCompare(b.nextReview);
    });
  }

  // Normal mode sort: Overdue first, then Hard topics, then Oldest review date
  return dueReviews.sort((a, b) => {
    // 1. Overdue
    const isAOverdue = a.nextReview < todayStr;
    const isBOverdue = b.nextReview < todayStr;
    if (isAOverdue && !isBOverdue) return -1;
    if (!isAOverdue && isBOverdue) return 1;

    // 2. Hard topics (learningDifficulty === 'hard')
    const isAHard = a.learningDifficulty === 'hard';
    const isBHard = b.learningDifficulty === 'hard';
    if (isAHard && !isBHard) return -1;
    if (!isAHard && isBHard) return 1;

    // 3. Oldest review date (ascending nextReview)
    return a.nextReview.localeCompare(b.nextReview);
  });
}

export interface ReviewStats {
  reviewsDueToday: number;
  reviewsCompletedToday: number;
  retentionPercentage: number;
  totalReviewsCompleted: number;
  totalScheduled: number;
}

/**
 * Computes spaced repetition dashboard statistics.
 */
export function getReviewStats(
  revisions: Revision[],
  userState?: UserState,
  activeSubjects?: Subject[],
  backlogSubjects?: Subject[]
): ReviewStats {
  const sanitized = sanitizeRevisions(revisions);
  const todayStr = getLocalDateString();

  let validSubjects: Subject[] = [];

  if (userState) {
    validSubjects = getReviewSubjectsForState(userState);
  } else if (activeSubjects && activeSubjects.length > 0) {
    validSubjects = [...activeSubjects, ...(backlogSubjects || [])];
  }

  const scoped = (validSubjects.length > 0)
    ? sanitized.filter((rev) => !!findTopicById(rev.topicId, validSubjects, []))
    : sanitized;

  // 1. Reviews Due Today (currently due based on nextReview <= today)
  const reviewsDueToday = scoped.filter((rev) => rev.nextReview <= todayStr).length;

  // 2. Reviews Completed Today
  const reviewsCompletedToday = scoped.filter(
    (rev) => rev.lastReviewed === todayStr && (rev.repetitions ?? 0) > 0
  ).length;

  // 3. Total Reviews Completed (sum of repetitions)
  const totalReviewsCompleted = scoped.reduce((sum, rev) => sum + (rev.repetitions ?? 0), 0);

  // 4. Retention Percentage
  const reviewedItems = scoped.filter((rev) => (rev.repetitions ?? 0) > 0);
  let retentionPercentage = 95;

  if (reviewedItems.length > 0) {
    const highEaseCount = reviewedItems.filter((rev) => rev.easeFactor >= 2.2).length;
    retentionPercentage = Math.round((highEaseCount / reviewedItems.length) * 100);
  }

  // 5. Total Scheduled Revisions count
  const totalScheduled = scoped.length;

  return {
    reviewsDueToday,
    reviewsCompletedToday,
    retentionPercentage: Math.max(50, Math.min(100, retentionPercentage)),
    totalReviewsCompleted,
    totalScheduled,
  };
}
