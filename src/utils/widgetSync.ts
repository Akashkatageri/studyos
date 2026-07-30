import { Capacitor, registerPlugin } from '@capacitor/core';
import { UserState } from '../types';
import { getLocalDateString } from './dateUtils';

export interface DayStatus {
  short: string;    // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  full: string;     // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  date: string;     // 'YYYY-MM-DD'
  active: boolean;  // whether user studied or focused on this date
  isToday: boolean;
  focusMins: number;
}

export type WidgetTheme = 'duo_green' | 'fire_orange' | 'obsidian_dark' | 'mint_cream';

export function getTodayWidgetTheme(): WidgetTheme {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const themes: WidgetTheme[] = ['duo_green', 'fire_orange', 'obsidian_dark', 'mint_cream'];
  return themes[dayOfYear % themes.length];
}

export function getWeeklyDaysStatus(userState: UserState): DayStatus[] {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon...
  const monIndex = (currentDay + 6) % 7; // Mon = 0 ... Sun = 6
  
  const shortNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const fullNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const days: DayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - monIndex + i);
    const dateStr = getLocalDateString(d);
    
    const focusMins = (userState.focusHistory && userState.focusHistory[dateStr]) || 0;
    const studyCount = (userState.studyActivity && userState.studyActivity[dateStr]) || 0;
    const active = focusMins > 0 || studyCount > 0;
    const isToday = i === monIndex;
    
    days.push({
      short: shortNames[i],
      full: fullNames[i],
      date: dateStr,
      active,
      isToday,
      focusMins
    });
  }
  return days;
}

interface StudyOSWidgetPlugin {
  updateWidgetData(options: {
    streak: string;
    username: string;
    todayFocus: string;
    petStatus: string;
    avatarIcon: string;
    daysJson?: string;
    activeDaysCount?: string;
    daysMask?: string;
    dailyTheme?: string;
  }): Promise<{ success: boolean }>;
}

const StudyOSWidget = registerPlugin<StudyOSWidgetPlugin>('StudyOSWidget');

export async function syncAndroidWidget(userState: UserState | null) {
  if (!userState || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const streakVal = userState.academicStudyStreak ?? userState.streak ?? 0;
    const streak = String(streakVal);
    const username = userState.username || "Student";
    
    // Focus hours / mins
    // Use Sweden locale format to get robust YYYY-MM-DD
    const todayStr = getLocalDateString();
    const todayMinutes = userState.todayFocusMinutes 
      || (userState.focusHistory && userState.focusHistory[todayStr])
      || 0;
    
    let todayFocus = "0 min";
    if (todayMinutes >= 60) {
      const hrs = Math.floor(todayMinutes / 60);
      const mins = todayMinutes % 60;
      if (mins > 0) {
        todayFocus = `${hrs}h ${mins}m`;
      } else {
        todayFocus = `${hrs} hrs`;
      }
    } else {
      todayFocus = `${todayMinutes} min`;
    }

    // Days status calculation
    const days = getWeeklyDaysStatus(userState);
    const daysJson = JSON.stringify(days);
    const activeDaysCount = String(days.filter(d => d.active).length);
    const daysMask = days.map(d => (d.active ? '1' : '0')).join('');

    // Pet companion status based on study state
    const focusGoal = userState.dailyFocusGoal || 25;
    let petStatus = "Zzz... Complete a study session to wake PanPan the Panda! 🐼";
    let avatarIcon = userState.avatar || "🐼";

    let emotion = "ready";
    if (todayMinutes >= focusGoal) {
      petStatus = "Scholar King! PanPan the Panda is so proud of you! 👑🐼";
      emotion = "complete";
      if (avatarIcon === "🐼" || avatarIcon === "🐱") {
        avatarIcon = "👑🐼";
      }
    } else if (todayMinutes > 0) {
      petStatus = "PanPan the Panda is studying with you! Bamboo power! 🎋🐼";
      emotion = "safe";
      if (avatarIcon === "🐼" || avatarIcon === "🐱") {
        avatarIcon = "📚🐼";
      }
    } else if (streakVal > 0) {
      petStatus = "Complete a study session today to protect your " + streakVal + "-day streak! 🔥";
      emotion = "at_risk";
      if (avatarIcon === "🐼" || avatarIcon === "🐱") {
        avatarIcon = "🔥🐼";
      }
    } else {
      emotion = "rest";
      if (avatarIcon === "🐼" || avatarIcon === "🐱") {
        avatarIcon = "😴🐼";
      }
    }

    const dailyTheme = getTodayWidgetTheme();

    console.log("[WidgetSync] Syncing native Focus Streak widget data with auto-rotating theme:", {
      streak,
      username,
      todayFocus,
      petStatus,
      avatarIcon,
      emotion,
      activeDaysCount,
      daysMask,
      dailyTheme
    });

    await StudyOSWidget.updateWidgetData({
      streak,
      username,
      todayFocus,
      petStatus,
      avatarIcon,
      daysJson,
      activeDaysCount,
      daysMask,
      dailyTheme
    });
    console.log("Android native 1x4 widget updated successfully via Capacitor!");
  } catch (err) {
    console.warn("Failed to synchronize Android native widget:", err);
  }
}
