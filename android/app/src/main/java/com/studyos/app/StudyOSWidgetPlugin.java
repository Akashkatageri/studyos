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
            String streak = call.getString("streak", "0");
            String username = call.getString("username", "Student");
            String todayFocus = call.getString("todayFocus", "0 min");
            String petStatus = call.getString("petStatus", "Mochi is keeping you company!");
            String avatarIcon = call.getString("avatarIcon", "🐱");

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("StudyOSWidgetPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("streak", streak);
            editor.putString("username", username);
            editor.putString("todayFocus", todayFocus);
            editor.putString("petStatus", petStatus);
            editor.putString("avatarIcon", avatarIcon);
            editor.apply();

            // Notify the widget provider to trigger an update on screen
            StudyOSWidgetProvider.updateMyWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget data: " + e.getMessage());
        }
    }
}
