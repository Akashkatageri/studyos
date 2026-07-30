package com.studyos.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StudyOSWidget")
public class StudyOSWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            JSObject data = call.getData();
            
            String username = data.optString("username", "Student");
            String streak = data.optString("streak", "12");
            
            String todayFocus = "0 min";
            if (data.has("todayFocus")) {
                todayFocus = data.optString("todayFocus", "0 min");
            } else if (data.has("todayFocusMinutes")) {
                todayFocus = data.optString("todayFocusMinutes", "0") + " min";
            }
            
            String petStatus = "Ready to study! ☀️";
            if (data.has("petStatus")) {
                petStatus = data.optString("petStatus", "Ready to study! ☀️");
            } else if (data.has("statusMessage")) {
                petStatus = data.optString("statusMessage", "Ready to study! ☀️");
            }
            
            String emotion = data.optString("emotion", "ready");
            String avatarIcon = data.optString("avatarIcon", "🐼");

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("StudyOSWidgetPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("streak", streak);
            editor.putString("username", username);
            editor.putString("todayFocus", todayFocus);
            editor.putString("petStatus", petStatus);
            editor.putString("emotion", emotion);
            editor.putString("avatarIcon", avatarIcon);
            editor.apply();

            // Notify all widget providers to trigger updates on screen
            StudyOSWidgetProvider.updateMyWidgets(context);
            StudyOSTimerWidgetProvider.updateMyWidgets(context);
            StudyOSTaskWidgetProvider.updateMyWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget data: " + e.getMessage());
        }
    }
}
