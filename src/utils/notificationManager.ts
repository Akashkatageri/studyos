import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificationScheduleOptions {
  enabled?: boolean;
  streakAlertsEnabled?: boolean;
  streak?: number;
  time1?: string; // "14:00"
  time2?: string; // "20:00"
}

export class NotificationManager {
  private static SCHEDULE_ID_MIDDAY = 101;
  private static SCHEDULE_ID_EVENING = 102;
  private static SCHEDULE_ID_TEST = 103;

  /**
   * Request notification permissions across Capacitor native and Browser Web APIs.
   */
  public static async requestPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        const check = await LocalNotifications.checkPermissions();
        if (check.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          return req.display === 'granted';
        }
        return true;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          return perm === 'granted';
        }
      }
    } catch (err) {
      console.warn('[NotificationManager] Request permission error:', err);
    }
    return false;
  }

  /**
   * Schedule twice-a-day Duolingo-style study and streak protection notifications.
   */
  public static async syncDailyStudyReminders(options: NotificationScheduleOptions): Promise<void> {
    const {
      enabled = true,
      streakAlertsEnabled = true,
      streak = 1,
      time1 = '14:00',
      time2 = '20:00'
    } = options;

    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        // Cancel previous scheduled notifications first
        await LocalNotifications.cancel({
          notifications: [
            { id: this.SCHEDULE_ID_MIDDAY },
            { id: this.SCHEDULE_ID_EVENING }
          ]
        });

        if (!enabled) {
          console.log('[NotificationManager] Daily reminders disabled. Cancelled scheduled tasks.');
          return;
        }

        const [h1Str, m1Str] = time1.split(':');
        const [h2Str, m2Str] = time2.split(':');

        const hour1 = parseInt(h1Str || '14', 10);
        const min1 = parseInt(m1Str || '00', 10);
        const hour2 = parseInt(h2Str || '20', 10);
        const min2 = parseInt(m2Str || '00', 10);

        const notificationsToSchedule: any[] = [];

        // Notification 1: Midday study goal nudge
        notificationsToSchedule.push({
          id: this.SCHEDULE_ID_MIDDAY,
          title: `🔥 Don't break your streak! (Day ${streak})`,
          body: `Spend just 10 minutes on StudyOS today to keep your streak alive and level up!`,
          schedule: {
            on: { hour: hour1, minute: min1 },
            repeats: true,
            allowWhileIdle: true
          },
          sound: 'beep.wav',
          actionTypeId: 'STUDY_REMINDER'
        });

        // Notification 2: Evening urgent streak warning (if streak alerts enabled)
        if (streakAlertsEnabled) {
          notificationsToSchedule.push({
            id: this.SCHEDULE_ID_EVENING,
            title: `🚨 STREAK EMERGENCY! Protect your 🔥 ${streak}-day streak!`,
            body: `You haven't completed a topic today! Finish 1 topic before midnight to protect your streak.`,
            schedule: {
              on: { hour: hour2, minute: min2 },
              repeats: true,
              allowWhileIdle: true
            },
            sound: 'beep.wav',
            actionTypeId: 'STREAK_WARNING'
          });
        }

        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log('[NotificationManager] Twice-daily Android notifications scheduled successfully at', time1, 'and', time2);
      }
    } catch (err) {
      console.warn('[NotificationManager] Sync daily reminders error:', err);
    }
  }

  /**
   * Send an immediate test notification to verify Android / Web notifications working.
   */
  public static async sendTestNotification(streak: number = 1): Promise<boolean> {
    try {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn('[NotificationManager] Permissions not granted.');
      }

      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: this.SCHEDULE_ID_TEST,
              title: `🔥 Duolingo Test Alert (Streak: ${streak} Days)`,
              body: `Keep your study momentum going! This is how your twice-daily Android study reminders will look.`,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav'
            }
          ]
        });
        return true;
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`🔥 Duolingo Test Alert (Streak: ${streak} Days)`, {
          body: `Keep your study momentum going! This is how your twice-daily study reminders will look.`,
          icon: '/icon.png'
        });
        return true;
      }
    } catch (err) {
      console.warn('[NotificationManager] Send test notification error:', err);
    }
    return false;
  }
}
