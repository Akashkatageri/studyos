package com.studyos.app;

import android.content.Context;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "StudyOSWidget")
public class StudyOSWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            JSObject data = call.getData();

            int streak = 0;
            try {
                streak = Integer.parseInt(data.optString("streak", "0"));
            } catch (Exception e) {
                streak = data.optInt("streak", 0);
            }

            long lastActive = data.optLong("lastActive", System.currentTimeMillis());
            int focusMinutesToday = data.optInt("focusMinutesToday", 0);
            if (focusMinutesToday == 0 && data.has("todayFocusMinutes")) {
                focusMinutesToday = data.optInt("todayFocusMinutes", 0);
            }

            int completionPercent = data.optInt("completionPercent", 0);
            String currentGoal = data.optString("currentGoal", "2h today");

            Context context = getContext();

            // Create clean WidgetData and persist to SharedPreferences
            WidgetData widgetData = new WidgetData(streak, lastActive, focusMinutesToday, completionPercent, currentGoal);
            widgetData.save(context);

            // Immediate update for new 2x1 and 2x2 widgets
            StudyOSWidget2x1Provider.updateWidgets(context, widgetData);
            StudyOSWidget2x2Provider.updateWidgets(context, widgetData);

            // Enqueue WorkManager for periodic background sync (every 2 hours)
            try {
                PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                    WidgetUpdateWorker.class, 2, TimeUnit.HOURS
                ).build();

                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    "StudyOSWidgetUpdateWorker",
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                );
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget data: " + e.getMessage());
        }
    }
}
