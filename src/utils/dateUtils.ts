/**
 * Returns the local date string formatted as YYYY-MM-DD.
 * This completely avoids timezone-shift issues where UTC dates (like toISOString())
 * misidentify today's date for users in negative/positive timezone offsets.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns array of YYYY-MM-DD date strings for the current week (Monday through Sunday).
 */
export function getCurrentWeekDateStrings(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getLocalDateString(d));
  }
  return dates;
}

/**
 * Calculates XP earned specifically during the current week (Monday to Sunday).
 * Resets automatically every Monday as current week dates shift.
 */
export function calculateWeeklyXP(
  focusHistory?: { [date: string]: number },
  studyActivity?: { [date: string]: number },
  totalXP: number = 0,
  dailyXP?: { [date: string]: number }
): number {
  const currentWeekDays = getCurrentWeekDateStrings();

  // 1. Direct Daily XP map sum for current week days
  if (dailyXP && Object.keys(dailyXP).length > 0) {
    let sumXP = 0;
    let hasEntries = false;
    for (const dateStr of currentWeekDays) {
      if (typeof dailyXP[dateStr] === 'number') {
        sumXP += dailyXP[dateStr];
        hasEntries = true;
      }
    }
    if (hasEntries) {
      return Math.max(0, sumXP);
    }
  }

  // 2. Estimation based on focusHistory and studyActivity
  let weeklyMins = 0;
  let weeklyTasks = 0;

  for (const dateStr of currentWeekDays) {
    if (focusHistory && focusHistory[dateStr]) {
      weeklyMins += focusHistory[dateStr];
    }
    if (studyActivity && studyActivity[dateStr]) {
      weeklyTasks += studyActivity[dateStr];
    }
  }

  const estimatedThisWeek = (weeklyMins * 2) + (weeklyTasks * 15);
  if (estimatedThisWeek > 0) {
    return Math.min(estimatedThisWeek, totalXP > 0 ? totalXP : estimatedThisWeek);
  }

  // 3. Fallback: If user has totalXP > 0 and no granular history exists, return totalXP so user sees their rank update immediately!
  return totalXP || 0;
}

