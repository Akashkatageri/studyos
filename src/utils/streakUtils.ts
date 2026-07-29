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
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  if (!scheduledDays.includes(dayOfWeek)) {
    return { isCompleted: false, isExempt: true };
  }

  return { isCompleted: false, isExempt: false };
}

/**
 * Evaluates missed days between last focus/check date and today.
 * Consumes Study Shields if missed days occurred, or breaks streak if no shields left.
 */
export function evaluateDailyStreakCatchUp(userState: UserState) {
  const todayStr = getLocalDateString();
  const lastFocusStr = userState.lastFocusDate || userState.lastActiveDate;

  // Initial setup if no history
  if (!lastFocusStr) {
    return {
      dailyResetUpdates: {
        lastFocusDate: todayStr,
        todayFocusMinutes: 0,
        todayFocusXPRewarded: 0
      } as Partial<UserState>,
      streakBroken: false,
      shieldsConsumedCount: 0
    };
  }

  // Same day check -> reset daily focus trackers for a new day if date changed
  if (lastFocusStr === todayStr) {
    return {
      dailyResetUpdates: null,
      streakBroken: false,
      shieldsConsumedCount: 0
    };
  }

  const dailyResetUpdates: Partial<UserState> = {
    lastFocusDate: todayStr,
    todayFocusMinutes: 0,
    todayFocusXPRewarded: 0
  };

  const diffDays = getDaysDifference(lastFocusStr, todayStr);
  let shieldsRemaining = userState.studyShields ?? 3;
  let currentStreak = userState.academicStudyStreak ?? userState.streak ?? 0;
  let shieldsConsumedCount = 0;
  let streakBroken = false;

  // Process intermediate days day-by-day sequentially
  if (diffDays > 1) {
    for (let i = 1; i < diffDays; i++) {
      const dateStr = addDaysToDateString(lastFocusStr, i);
      const { isCompleted, isExempt } = checkDateExemptionOrCompletion(dateStr, userState);

      if (isCompleted || isExempt) {
        if (!streakBroken && currentStreak > 0) {
          currentStreak += 1; // Frozen/exempt or completed day advances the preserved streak
        }
      } else {
        if (!streakBroken && shieldsRemaining > 0) {
          shieldsRemaining -= 1;
          shieldsConsumedCount += 1;
          if (currentStreak > 0) {
            currentStreak += 1; // Shielded day protects and advances the streak
          }
        } else {
          // Unprotected missed study day! Streak breaks right here.
          currentStreak = 0;
          streakBroken = true;
        }
      }
    }

    dailyResetUpdates.studyShields = shieldsRemaining;
    dailyResetUpdates.academicStudyStreak = currentStreak;
    dailyResetUpdates.streak = currentStreak;

    if (!streakBroken && currentStreak > 0) {
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
  const lastActiveStr = userState.lastActiveDate;
  const currentStreak = userState.academicStudyStreak ?? userState.streak ?? 0;
  const longestStreak = Math.max(
    userState.longestStudyStreak ?? 0,
    userState.longestStreak ?? 0,
    currentStreak
  );

  // If already active today, return current streak without double-incrementing
  if (lastActiveStr === todayStr) {
    return {
      streak: currentStreak,
      academicStudyStreak: currentStreak,
      longestStreak,
      longestStudyStreak: longestStreak,
      lastActiveDate: todayStr,
      lastFocusDate: todayStr
    };
  }

  let runningStreak = currentStreak;
  let shields = userState.studyShields ?? 3;
  let broken = false;

  if (!lastActiveStr) {
    runningStreak = 1;
  } else {
    const diffDays = getDaysDifference(lastActiveStr, todayStr);

    if (diffDays <= 0) {
      runningStreak = currentStreak > 0 ? currentStreak : 1;
    } else {
      for (let i = 1; i <= diffDays; i++) {
        const dateStr = addDaysToDateString(lastActiveStr, i);

        if (dateStr === todayStr) {
          if (!broken && runningStreak > 0) {
            runningStreak += 1;
          } else {
            runningStreak = 1; // Restart streak at 1 on today if sequence was broken
          }
        } else {
          const { isCompleted, isExempt } = checkDateExemptionOrCompletion(dateStr, userState);
          if (isCompleted || isExempt) {
            if (!broken && runningStreak > 0) {
              runningStreak += 1; // Frozen / Vacation / Rest day preserves and increments streak
            }
          } else {
            if (!broken && shields > 0) {
              shields -= 1;
              if (runningStreak > 0) {
                runningStreak += 1; // Protected by shield
              }
            } else {
              // Unprotected missed study day! Streak breaks right here.
              broken = true;
              runningStreak = 0;
            }
          }
        }
      }
    }
  }

  const newLongestStreak = Math.max(longestStreak, runningStreak);

  return {
    streak: runningStreak,
    academicStudyStreak: runningStreak,
    longestStreak: newLongestStreak,
    longestStudyStreak: newLongestStreak,
    lastActiveDate: todayStr,
    lastFocusDate: todayStr
  };
}
