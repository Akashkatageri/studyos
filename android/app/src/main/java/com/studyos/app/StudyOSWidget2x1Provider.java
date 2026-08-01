package com.studyos.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.RemoteViews;

public class StudyOSWidget2x1Provider extends AppWidgetProvider {
    private static final String TAG = "WidgetSyncChain";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetData data = WidgetData.load(context);
        updateWidgetsInternal(context, appWidgetManager, appWidgetIds, data);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        WidgetData data = WidgetData.load(context);
        updateWidgetsInternal(context, appWidgetManager, new int[]{appWidgetId}, data);
    }

    public static void updateWidgets(Context context, WidgetData data) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, StudyOSWidget2x1Provider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        updateWidgetsInternal(context, appWidgetManager, appWidgetIds, data);
    }

    private static void updateWidgetsInternal(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds, WidgetData data) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            Log.d(TAG, "[2x1Provider] No active 2x1 widgets placed on home screen.");
            return;
        }

        WidgetStateManager.WidgetState state = WidgetStateManager.getState(context, data);
        Log.d(TAG, "[Step 4 - 2x1] Updating " + appWidgetIds.length + " 2x1 widget(s) immediately -> streakText=" + state.streakText + ", headline=" + state.headlineText);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.studyos_widget_2x1);

            views.setInt(R.id.widget_2x1_root, "setBackgroundResource", state.backgroundRes);
            views.setTextViewText(R.id.widget_2x1_streak, state.streakText);
            views.setTextViewText(R.id.widget_2x1_headline, state.headlineText);
            views.setImageViewResource(R.id.widget_2x1_mascot, state.mascotRes);

            // Click Intent for Mascot (Home Screen)
            Intent homeIntent = new Intent(context, MainActivity.class);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent homePending = PendingIntent.getActivity(
                context, 2100, homeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_2x1_mascot, homePending);
            views.setOnClickPendingIntent(R.id.widget_2x1_root, homePending);

            // Click Intent for Streak Badge (Stats Screen)
            Intent statsIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("com.studyos.app://stats"), context, MainActivity.class);
            statsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent statsPending = PendingIntent.getActivity(
                context, 2101, statsIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_2x1_streak, statsPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
            Log.d(TAG, "[Step 4 - 2x1] appWidgetManager.updateAppWidget completed for widget ID " + appWidgetId);
        }
    }
}
