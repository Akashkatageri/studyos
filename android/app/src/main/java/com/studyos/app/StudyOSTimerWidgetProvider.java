package com.studyos.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class StudyOSTimerWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("StudyOSWidgetPrefs", Context.MODE_PRIVATE);
        String todayFocus = prefs.getString("todayFocus", "0 min");
        String emotion = prefs.getString("emotion", "ready");

        int mascotResId = R.drawable.panda_ready;
        if ("safe".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_safe;
        } else if ("at_risk".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_risk;
        } else if ("complete".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_complete;
        } else if ("rest".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_sleep;
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.studyos_timer_widget);
        views.setImageViewResource(R.id.widget_timer_avatar_icon, mascotResId);
        views.setTextViewText(R.id.widget_timer_subtext, "Today: " + todayFocus);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
        views.setOnClickPendingIntent(R.id.widget_timer_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_timer_action_btn, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateMyWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, StudyOSTimerWidgetProvider.class));
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }
}
