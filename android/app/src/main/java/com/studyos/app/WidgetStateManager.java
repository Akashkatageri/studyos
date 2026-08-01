package com.studyos.app;

import android.content.Context;
import java.util.Calendar;

public class WidgetStateManager {

    public static class WidgetState {
        public final String headlineText;
        public final String streakText;
        public final String pillText;
        public final int backgroundRes;
        public final int mascotRes;

        public WidgetState(String headlineText, String streakText, String pillText, int backgroundRes, int mascotRes) {
            this.headlineText = headlineText;
            this.streakText = streakText;
            this.pillText = pillText;
            this.backgroundRes = backgroundRes;
            this.mascotRes = mascotRes;
        }
    }

    public static WidgetState getState(Context context, WidgetData data) {
        long now = System.currentTimeMillis();
        long diffMs = Math.max(0, now - data.lastActive);
        long oneDayMs = 24 * 60 * 60 * 1000L;
        long threeDaysMs = 3 * oneDayMs;

        String messageKey = "ready_to_learn";
        int bgRes = R.drawable.widget_bg_purple;
        int mascotRes = R.drawable.happy;

        // 1. Inactivity evaluation
        if (diffMs >= threeDaysMs) {
            messageKey = "save_your_streak";
            bgRes = R.drawable.widget_bg_red;
            mascotRes = getSafeDrawable(context, "angry", R.drawable.happy);
        } else if (diffMs >= oneDayMs) {
            messageKey = "dont_break_it";
            bgRes = R.drawable.widget_bg_orange;
            mascotRes = getSafeDrawable(context, "worried", R.drawable.happy);
        }
        // 2. Streak evaluation
        else if (data.streak == 0) {
            messageKey = "lets_get_rolling";
            bgRes = R.drawable.widget_bg_teal;
            mascotRes = getSafeDrawable(context, "happy", R.drawable.happy);
        } else if (data.streak >= 30) {
            messageKey = "youre_on_fire";
            bgRes = R.drawable.widget_bg_magenta;
            mascotRes = getSafeDrawable(context, "excited", R.drawable.happy);
        } else if (data.streak >= 7) {
            messageKey = "great_progress";
            bgRes = R.drawable.widget_bg_green;
            mascotRes = getSafeDrawable(context, "happy", R.drawable.happy);
        }
        // 3. Time of day evaluation
        else {
            Calendar cal = Calendar.getInstance();
            int hour = cal.get(Calendar.HOUR_OF_DAY);
            if (hour >= 5 && hour < 11) {
                messageKey = "ready_to_learn";
                bgRes = R.drawable.widget_bg_purple;
                mascotRes = getSafeDrawable(context, "happy", R.drawable.happy);
            } else if (hour >= 11 && hour < 17) {
                messageKey = "focus_time";
                bgRes = R.drawable.widget_bg_blue;
                mascotRes = getSafeDrawable(context, "focused", R.drawable.happy);
            } else if (hour >= 17 && hour < 22) {
                messageKey = "take_a_break";
                bgRes = R.drawable.widget_bg_purple;
                mascotRes = getSafeDrawable(context, "relaxed", R.drawable.happy);
            } else {
                messageKey = "rest_mode";
                bgRes = R.drawable.widget_bg_purple;
                mascotRes = getSafeDrawable(context, "sleepy", R.drawable.happy);
            }
        }

        String headline = MessageRepository.getMessage(context, messageKey);
        String streakStr = "🔥 " + data.streak;

        // Dynamic Pill Text
        String pillStr = "Start now";
        if (data.focusMinutesToday > 0) {
            int hrs = data.focusMinutesToday / 60;
            int mins = data.focusMinutesToday % 60;
            if (hrs > 0 && mins > 0) {
                pillStr = hrs + "h " + mins + "m today";
            } else if (hrs > 0) {
                pillStr = hrs + "h today";
            } else {
                pillStr = mins + "m today";
            }
        } else if (data.completionPercent > 0) {
            pillStr = data.completionPercent + "% done";
        }

        return new WidgetState(headline, streakStr, pillStr, bgRes, mascotRes);
    }

    private static int getSafeDrawable(Context context, String name, int fallbackResId) {
        try {
            int id = context.getResources().getIdentifier(name, "drawable", context.getPackageName());
            return id != 0 ? id : fallbackResId;
        } catch (Exception e) {
            return fallbackResId;
        }
    }
}
