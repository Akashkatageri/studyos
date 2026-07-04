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
        // Perform update for each active widget
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Load the shared stats
        SharedPreferences prefs = context.getSharedPreferences("StudyOSWidgetPrefs", Context.MODE_PRIVATE);
        String streak = prefs.getString("streak", "0");
        String username = prefs.getString("username", "Student");
        String todayFocus = prefs.getString("todayFocus", "0 min");
        String petStatus = prefs.getString("petStatus", "Mochi is keeping you company!");
        String avatarIcon = prefs.getString("avatarIcon", "🐱");

        // Construct RemoteViews layout object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.studyos_widget);

        // Update texts dynamically
        views.setTextViewText(R.id.widget_avatar_icon, avatarIcon);
        views.setTextViewText(R.id.widget_brand, (username.toUpperCase() + "'S STUDYOS").trim());
        views.setTextViewText(R.id.widget_main_stat, "Streak: " + streak + " Days 🔥");
        views.setTextViewText(R.id.widget_subtext, petStatus);
        views.setTextViewText(R.id.widget_detailtext, "Focus today: " + todayFocus);

        // Click action: open the app's main activity
        Intent intent = new Intent(context, MainActivity.class);
        // Add flags to launch cleanly
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        // Wrap in a PendingIntent
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        // Update current widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    // Static convenience method to trigger visual update of all StudyOS widgets immediately
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
