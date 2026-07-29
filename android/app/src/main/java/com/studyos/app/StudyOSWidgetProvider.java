package com.studyos.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class StudyOSWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("StudyOSWidgetPrefs", Context.MODE_PRIVATE);
        
        String streak = prefs.getString("streak", "12");
        String username = prefs.getString("username", "Student");
        String statusMessage = prefs.getString("petStatus", "Ready to study! ☀️");
        String emotion = prefs.getString("emotion", "ready");

        // Map emotion to vector drawable asset and dynamic pill status
        int mascotResId = R.drawable.panda_ready;
        String badgeText = "• Ready";

        if ("safe".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_safe;
            badgeText = "• Safe";
        } else if ("at_risk".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_risk;
            badgeText = "• At Risk";
        } else if ("complete".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_complete;
            badgeText = "• Goal Met";
        } else if ("rest".equalsIgnoreCase(emotion)) {
            mascotResId = R.drawable.panda_sleep;
            badgeText = "• Resting";
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.studyos_widget);

        // 1. Set illustrated vector mascot asset
        views.setImageViewResource(R.id.widget_avatar_icon, mascotResId);

        // 2. Natural casing username title
        String brandTitle = "StudyOS";
        if (username != null && !username.trim().isEmpty() && !"Student".equalsIgnoreCase(username.trim())) {
            brandTitle = username.trim() + "'s StudyOS";
        }
        views.setTextViewText(R.id.widget_brand, brandTitle);

        // 3. Dynamic status badge and scannable streak text
        views.setTextViewText(R.id.widget_pstatus, badgeText);
        views.setTextViewText(R.id.widget_main_stat, "🔥 " + streak + " Day Streak");
        views.setTextViewText(R.id.widget_subtext, statusMessage);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_action_btn, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateMyWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, StudyOSWidgetProvider.class));
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }
}

