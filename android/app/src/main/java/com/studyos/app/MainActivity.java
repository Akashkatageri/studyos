package com.studyos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(StudyOSWidgetPlugin.class);
        try {
            registerPlugin(io.capawesome.capacitorfirebase.authentication.FirebaseAuthenticationPlugin.class);
        } catch (Throwable e) {
            android.util.Log.w("MainActivity", "FirebaseAuthenticationPlugin registration notice: " + e.getMessage());
        }
    }
}
