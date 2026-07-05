import { Capacitor, registerPlugin } from '@capacitor/core';
import { UserState } from '../types';

interface StudyOSWidgetPlugin {
  updateWidgetData(options: {
    streak: string;
    username: string;
    todayFocus: string;
    petStatus: string;
    avatarIcon: string;
  }): Promise<{ success: boolean }>;
}

const StudyOSWidget = registerPlugin<StudyOSWidgetPlugin>('StudyOSWidget');

export async function syncAndroidWidget(userState: UserState | null) {
  if (!userState || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const streak = String(userState.streak || 0);
    const username = userState.username || "Student";
    
    // Focus hours / mins
    // Use Sweden locale format to get robust YYYY-MM-DD
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const todayMinutes = userState.studyActivity && userState.studyActivity[todayStr] 
      ? userState.studyActivity[todayStr] 
      : 0;
    
    let todayFocus = "0 min";
    if (todayMinutes >= 60) {
      const hrs = (todayMinutes / 60).toFixed(1);
      todayFocus = `${hrs} hrs`;
    } else {
      todayFocus = `${todayMinutes} min`;
    }

    // Pet companion status
    const petStatus = "Mochi is keeping you company!";

    // Avatar/icon representation
    const avatarIcon = userState.avatar || "🐱";

    await StudyOSWidget.updateWidgetData({
      streak,
      username,
      todayFocus,
      petStatus,
      avatarIcon
    });
    console.log("Android native widget updated successfully via Capacitor!");
  } catch (err) {
    console.warn("Failed to synchronize Android native widget:", err);
  }
}
