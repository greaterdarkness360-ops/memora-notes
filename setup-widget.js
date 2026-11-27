const fs = require('fs');
const path = require('path');

console.log('Memasang Widget Android Memora (Light & Minimalist Dark Theme)...');

const androidMain = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const resDir = path.join(androidMain, 'res');
const javaDir = path.join(androidMain, 'java', 'com', 'memora', 'notes');

fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
fs.mkdirSync(javaDir, { recursive: true });

// 1. Background Light (Sweet Pink)
const widgetBgLight = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FAF5EE" />
    <corners android:radius="16dp" />
    <stroke android:width="1.5dp" android:color="#FBCFE8" />
</shape>
`;
fs.writeFileSync(path.join(resDir, 'drawable', 'widget_bg.xml'), widgetBgLight);

// 2. Background Dark (Minimalist Flat Dark)
const widgetBgDark = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#18181C" />
    <corners android:radius="16dp" />
    <stroke android:width="1dp" android:color="#27272A" />
</shape>
`;
fs.writeFileSync(path.join(resDir, 'drawable', 'widget_bg_dark.xml'), widgetBgDark);

// 3. Layout Widget
const widgetLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_bg">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="6dp">

        <TextView
            android:id="@+id/widget_app_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Memora - by Natanael"
            android:textColor="#EC4899"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_edit_btn"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Edit"
            android:textColor="#EC4899"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_note_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Memora Notes"
        android:textColor="#3F3D56"
        android:textSize="15sp"
        android:textStyle="bold"
        android:maxLines="1"
        android:ellipsize="end" />

    <TextView
        android:id="@+id/widget_note_content"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_marginTop="4dp"
        android:text="Ketuk untuk membuka atau mengedit catatan"
        android:textColor="#837D88"
        android:textSize="13sp"
        android:maxLines="3"
        android:ellipsize="end" />

    <TextView
        android:id="@+id/widget_footer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:text="Sentuh untuk edit langsung"
        android:textColor="#B4ADB9"
        android:textSize="11sp" />
</LinearLayout>
`;
fs.writeFileSync(path.join(resDir, 'layout', 'memora_widget.xml'), widgetLayout);

// 4. Widget Info XML
const widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/memora_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`;
fs.writeFileSync(path.join(resDir, 'xml', 'memora_widget_info.xml'), widgetInfo);

// 5. MemoraWidget.java
const memoraWidgetJava = `package com.memora.notes;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class MemoraWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, MemoraWidget.class));
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("memora_widget_prefs", Context.MODE_PRIVATE);
        String title = prefs.getString("widget_title", "Memora Notes");
        String content = prefs.getString("widget_content", "Ketuk untuk membuka atau mengedit catatan");
        String noteId = prefs.getString("widget_note_id", "");
        String theme = prefs.getString("widget_theme", "light");
        boolean isDark = "dark".equals(theme);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.memora_widget);
        views.setTextViewText(R.id.widget_note_title, title);
        views.setTextViewText(R.id.widget_note_content, content);

        if (isDark) {
            views.setInt(R.id.widget_container, "setBackgroundResource", R.drawable.widget_bg_dark);
            views.setTextViewText(R.id.widget_app_title, "Memora");
            views.setTextColor(R.id.widget_app_title, Color.parseColor("#A1A1AA"));
            views.setTextColor(R.id.widget_edit_btn, Color.parseColor("#F4F4F5"));
            views.setTextColor(R.id.widget_note_title, Color.parseColor("#F4F4F5"));
            views.setTextColor(R.id.widget_note_content, Color.parseColor("#A1A1AA"));
            views.setTextColor(R.id.widget_footer, Color.parseColor("#71717A"));
        } else {
            views.setInt(R.id.widget_container, "setBackgroundResource", R.drawable.widget_bg);
            views.setTextViewText(R.id.widget_app_title, "Memora - by Natanael");
            views.setTextColor(R.id.widget_app_title, Color.parseColor("#EC4899"));
            views.setTextColor(R.id.widget_edit_btn, Color.parseColor("#EC4899"));
            views.setTextColor(R.id.widget_note_title, Color.parseColor("#3F3D56"));
            views.setTextColor(R.id.widget_note_content, Color.parseColor("#837D88"));
            views.setTextColor(R.id.widget_footer, Color.parseColor("#B4ADB9"));
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra("OPEN_NOTE_ID", noteId);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        manager.updateAppWidget(appWidgetId, views);
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'MemoraWidget.java'), memoraWidgetJava);

// 6. WidgetBridgePlugin.java
const widgetBridgeJava = `package com.memora.notes;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    private static WidgetBridgePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String title = call.getString("title", "Memora Notes");
        String content = call.getString("content", "Ketuk untuk membuka catatan");
        String noteId = call.getString("noteId", "");
        String theme = call.getString("theme", null);

        SharedPreferences prefs = getContext().getSharedPreferences("memora_widget_prefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_title", title);
        editor.putString("widget_content", content);
        editor.putString("widget_note_id", noteId);
        if (theme != null) {
            editor.putString("widget_theme", theme);
        }
        editor.apply();

        MemoraWidget.updateAllWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getInitialNoteId(PluginCall call) {
        JSObject ret = new JSObject();
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        String noteId = intent != null ? intent.getStringExtra("OPEN_NOTE_ID") : "";
        ret.put("noteId", noteId != null ? noteId : "");
        call.resolve(ret);
    }

    public static void notifyNoteClicked(String noteId) {
        if (instance != null && noteId != null && !noteId.isEmpty()) {
            JSObject data = new JSObject();
            data.put("noteId", noteId);
            instance.notifyListeners("onWidgetClicked", data);
        }
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'WidgetBridgePlugin.java'), widgetBridgeJava);

// 7. Update MainActivity.java
const mainActivityPath = path.join(javaDir, 'MainActivity.java');
const mainActivityJava = `package com.memora.notes;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(AlarmBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.hasExtra("OPEN_NOTE_ID")) {
            WidgetBridgePlugin.notifyNoteClicked(intent.getStringExtra("OPEN_NOTE_ID"));
        }
    }
}
`;
fs.writeFileSync(mainActivityPath, mainActivityJava);

// 8. Register receiver in AndroidManifest.xml
const manifestPath = path.join(androidMain, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android:name=".MemoraWidget"')) {
    const widgetReceiver = `
        <receiver
            android:name=".MemoraWidget"
            android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/memora_widget_info" />
        </receiver>
    </application>`;
    manifest = manifest.replace('</application>', widgetReceiver);
    fs.writeFileSync(manifestPath, manifest);
}

console.log('Widget Android Memora (Light & Dark) berhasil dipasang.');
