import { UserState } from '../types';
import { getLocalDateString } from './dateUtils';
import { parseDateUTC, getDaysDifference, addDaysToDateString } from '../lib/spacedRepetition';

/**
 * Checks whether a given date (YYYY-MM-DD) was completed or exempt.
 */
export function checkDateExemptionOrCompletion(
  dateStr: string,
  userState: Partial<UserState>
): { isCompleted: boolean; isExempt: boolean } {
  // 1. Activity / Focus goal completion check
  const focusMins = (userState.focusHistory || {})[dateStr] || 0;
  const activityCount = (userState.studyActivity || {})[dateStr] || 0;
  const goalMinutes = userState.dailyFocusGoal ?? 30;

  if (focusMins >= goalMinutes || activityCount > 0) {
    return { isCompleted: true, isExempt: false };
  }

  // 2. Semester date boundaries check
  if (userState.semesterStartDate && userState.semesterEndDate) {
    if (dateStr < userState.semesterStartDate || dateStr > userState.semesterEndDate) {
      return { isCompleted: false, isExempt: true };
    }
  }

  // 3. Semester break mode / scheduled breaks check
  if (userState.semesterBreakMode) {
    return { isCompleted: false, isExempt: true };
  }

  const isSemesterBreak = (userState.semesterBreaks || []).some((b: any) => {
    return dateStr >= b.startDate && dateStr <= b.endDate;
  });
  if (isSemesterBreak) {
    return { isCompleted: false, isExempt: true };
  }

  // 4. Vacation mode check
  const isVacation = !!(
    userState.vacationMode?.active &&
    userState.vacationMode?.startDate &&
    userState.vacationMode?.endDate &&
    dateStr >= userState.vacationMode.startDate &&
    dateStr <= userState.vacationMode.endDate
  );
  if (isVacation) {
    return { isCompleted: false, isExempt: true };
  }

  // 5. Weekly study schedule check
  const dateObj = parseDateUTC(dateStr);
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const scheduledDays = userState.weeklyStudySchedule || [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
  if (!scheduledDays.includes(dayOfWeek)) {
    return { isCompleted: false, isExempt: true };
  }

  return { isCompleted: false, isExempt: false };
}

/**
 * Calculates actual consecutive study streak directly from recorded activity history.
 */
export function calculateActualStreak(userState: Partial<UserState>): number {
  if (!userState) return 0;
  const todayStr = getLocalDateString();
  const studyActivity = userState.studyActivity || {};
  const focusHistory = userState.focusHistory || {};
  const goalMinutes = userState.dailyFocusGoal ?? 30;

  // Helper to check if user completed study goal on a date
  const isDateCompleted = (dateStr: string) => {
    return (studyActivity[dateStr] || 0) > 0 || (focusHistory[dateStr] || 0) >= goalMinutes;
  };

  const hasStudiedToday = isDateCompleted(todayStr);

  // We start evaluating from today (if studied today) or yesterday (if today not completed yet)
  let currentDate = hasStudiedToday ? todayStr : addDaysToDateString(todayStr, -1);
  let streakCount = 0;
  let shieldsAvailable = userState.studyShields ?? 3;

  // Walk backwards up to 365 days
  for (let i = 0; i < 365; i++) {
    const { isCompleted, isExempt } = checkDateExemptionOrCompletion(currentDate, userState);

    if (isCompleted) {
      streakCount++;
    } else if (isExempt) {
      // Scheduled rest day, break, or vacation: preserves streak
    } else {
      // Missed study day: check if a shield protects it
      if (shieldsAvailable > 0) {
        shieldsAvailable--;
        // Shield preserves streak without adding to count
      } else {
        // Missed day with no shield: streak ends
        break;
      }
    }

    // Move to previous day
    currentDate = addDaysToDateString(currentDate, -1);
  }

  return streakCount;
}

/**
 * Evaluates missed days between last focus/check date and today.
 * Consumes Study Shields if missed days occurred, or breaks streak if no shields left.
 */
export function evaluateDailyStreakCatchUp(userState: UserState) {
  const todayStr = getLocalDateString();
  const lastFocusStr = userState.lastFocusDate || userState.lastActiveDate;

  // Calculate actual streak based on activity history
  const currentActualStreak = calculateActualStreak(userState);

  // Initial setup if no history
  if (!lastFocusStr) {
    return {
      dailyResetUpdates: {
        lastFocusDate: todayStr,
        todayFocusMinutes: 0,
        todayFocusXPRewarded: 0,
        streak: currentActualStreak,
        academicStudyStreak: currentActualStreak
      } as Partial<UserState>,
      streakBroken: false,
      shieldsConsumedCount: 0
    };
  }

  // Same day check -> reset daily focus trackers for a new day if date changed
  if (lastFocusStr === todayStr) {
    return {
      dailyResetUpdates: {
        streak: currentActualStreak,
        academicStudyStreak: currentActualStreak
      } as Partial<UserState>,
      streakBroken: false,
      shieldsConsumedCount: 0
    };
  }

  const dailyResetUpdates: Partial<UserState> = {
    lastFocusDate: todayStr,
    todayFocusMinutes: 0,
    todayFocusXPRewarded: 0,
    streak: currentActualStreak,
    academicStudyStreak: currentActualStreak
  };

  const diffDays = getDaysDifference(lastFocusStr, todayStr);
  let shieldsRemaining = userState.studyShields ?? 3;
  let shieldsConsumedCount = 0;
  let streakBroken = false;

  // Process intermediate days day-by-day sequentially
  if (diffDays > 1) {
    for (let i = 1; i < diffDays; i++) {
      const dateStr = addDaysToDateString(lastFocusStr, i);
      const { isCompleted, isExempt } = checkDateExemptionOrCompletion(dateStr, userState);

      if (!isCompleted && !isExempt) {
        if (!streakBroken && shieldsRemaining > 0) {
          shieldsRemaining -= 1;
          shieldsConsumedCount += 1;
        } else {
          streakBroken = true;
        }
      }
    }

    const updatedStreak = calculateActualStreak({ ...userState, studyShields: shieldsRemaining });

    dailyResetUpdates.studyShields = shieldsRemaining;
    dailyResetUpdates.academicStudyStreak = updatedStreak;
    dailyResetUpdates.streak = updatedStreak;

    if (!streakBroken && updatedStreak > 0) {
      dailyResetUpdates.lastActiveDate = addDaysToDateString(todayStr, -1);
    } else if (streakBroken) {
      dailyResetUpdates.lastActiveDate = null;
    }
  }

  return {
    dailyResetUpdates,
    streakBroken,
    shieldsConsumedCount
  };
}

/**
 * Calculates updated streak state when a study activity (topic, revision, focus goal) is completed.
 */
export function calculateNextStreakOnActivity(
  userState: UserState,
  todayStr: string = getLocalDateString()
) {
  const updatedActivity = {
    ...(userState.studyActivity || {}),
    [todayStr]: ((userState.studyActivity || {})[todayStr] || 0) + 1
  };

  const tempState = {
    ...userState,
    studyActivity: updatedActivity,
    lastActiveDate: todayStr,
    lastFocusDate: todayStr
  };

  const runningStreak = calculateActualStreak(tempState);
  const longestStreak = Math.max(
    userState.longestStudyStreak ?? 0,
    userState.longestStreak ?? 0,
    runningStreak
  );

  return {
    streak: runningStreak,
    academicStudyStreak: runningStreak,
    longestStreak,
    longestStudyStreak: longestStreak,
    lastActiveDate: todayStr,
    lastFocusDate: todayStr
  };
}
