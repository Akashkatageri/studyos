package com.studyos.app;

import android.content.Context;
import android.content.SharedPreferences;

public class WidgetData {
    private static final String PREF_NAME = "StudyOSWidgetPrefs";
    private static final String KEY_STREAK = "streak_count";
    private static final String KEY_LAST_ACTIVE = "last_active_time";
    private static final String KEY_FOCUS_MINUTES = "focus_minutes_today";
    private static final String KEY_COMPLETION_PERCENT = "completion_percent";
    private static final String KEY_CURRENT_GOAL = "current_goal";

    public final int streak;
    public final long lastActive;
    public final int focusMinutesToday;
    public final int completionPercent;
    public final String currentGoal;

    public WidgetData(int streak, long lastActive, int focusMinutesToday, int completionPercent, String currentGoal) {
        this.streak = streak;
        this.lastActive = lastActive;
        this.focusMinutesToday = focusMinutesToday;
        this.completionPercent = completionPercent;
        this.currentGoal = currentGoal != null ? currentGoal : "";
    }

    public void save(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit()
             .putInt(KEY_STREAK, streak)
             .putLong(KEY_LAST_ACTIVE, lastActive)
             .putInt(KEY_FOCUS_MINUTES, focusMinutesToday)
             .putInt(KEY_COMPLETION_PERCENT, completionPercent)
             .putString(KEY_CURRENT_GOAL, currentGoal)
             .apply();
    }

    public static WidgetData load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        int streak = prefs.getInt(KEY_STREAK, 0);
        long lastActive = prefs.getLong(KEY_LAST_ACTIVE, System.currentTimeMillis());
        int focusMinutes = prefs.getInt(KEY_FOCUS_MINUTES, 0);
        int completion = prefs.getInt(KEY_COMPLETION_PERCENT, 0);
        String goal = prefs.getString(KEY_CURRENT_GOAL, "2h today");
        return new WidgetData(streak, lastActive, focusMinutes, completion, goal);
    }
}
