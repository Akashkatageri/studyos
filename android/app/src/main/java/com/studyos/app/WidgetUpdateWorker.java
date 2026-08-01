package com.studyos.app;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class WidgetUpdateWorker extends Worker {

    public WidgetUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            Context context = getApplicationContext();
            WidgetData data = WidgetData.load(context);
            
            StudyOSWidget2x1Provider.updateWidgets(context, data);
            StudyOSWidget2x2Provider.updateWidgets(context, data);

            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
