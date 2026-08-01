package com.studyos.app;

import android.content.Context;

public class MessageRepository {

    public static String getMessage(Context context, String key) {
        if (context == null || key == null) return "StudyOS";
        
        int resId = 0;
        switch (key) {
            case "ready_to_learn":
                resId = R.string.widget_ready_to_learn;
                break;
            case "focus_time":
                resId = R.string.widget_focus_time;
                break;
            case "take_a_break":
                resId = R.string.widget_take_a_break;
                break;
            case "rest_mode":
                resId = R.string.widget_rest_mode;
                break;
            case "great_progress":
                resId = R.string.widget_great_progress;
                break;
            case "save_your_streak":
                resId = R.string.widget_save_your_streak;
                break;
            case "lets_get_rolling":
                resId = R.string.widget_lets_get_rolling;
                break;
            case "youre_on_fire":
                resId = R.string.widget_youre_on_fire;
                break;
            case "keep_going":
                resId = R.string.widget_keep_going;
                break;
            case "dont_break_it":
                resId = R.string.widget_dont_break_it;
                break;
            case "deep_work_time":
                resId = R.string.widget_deep_work_time;
                break;
            case "one_step_at_a_time":
                resId = R.string.widget_one_step_at_a_time;
                break;
            case "almost_there":
                resId = R.string.widget_almost_there;
                break;
            default:
                resId = R.string.widget_ready_to_learn;
                break;
        }
        
        try {
            return context.getString(resId);
        } catch (Exception e) {
            return "Ready to learn?";
        }
    }
}
