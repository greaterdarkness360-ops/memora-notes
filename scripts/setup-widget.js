// scripts/setup-widget.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== Memasang Widget Android Memora (Sweet Pink Edition) ===");

const resDir = path.join(__dirname, '../android/app/src/main/res');
const javaDir = path.join(__dirname, '../android/app/src/main/java/com/memora/notes');
const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
const mainActivityPath = path.join(javaDir, 'MainActivity.java');

fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
fs.mkdirSync(javaDir, { recursive: true });

// 1. Background Kartu Widget (Cream dengan border soft pink)
const widgetBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FAF5EE" />
    <corners android:radius="16dp" />
    <stroke android:width="1.5dp" android:color="#FBCFE8" />
</shape>`;
fs.writeFileSync(path.join(resDir, 'drawable/widget_bg.xml'), widgetBgXml);

// 2. Tata Letak Widget
const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_bg"
    android:padding="16dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

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
        android:layout_marginTop="8dp"
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
</LinearLayout>`;
fs.writeFileSync(path.join(resDir, 'layout/memora_widget.xml'), widgetLayoutXml);

// 3. Info Widget
const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/memora_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;
fs.writeFileSync(path.join(resDir, 'xml/memora_widget_info.xml'), widgetInfoXml);

// 4. File Java MemoraWidget
const memoraWidgetJava = `package com.memora.notes;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MemoraWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("memora_widget_prefs", Context.MODE_PRIVATE);
        String title = prefs.getString("widget_title", "Memora Notes");
        String content = prefs.getString("widget_content", "Belum ada catatan aktif.");
        String noteId = prefs.getString("widget_note_id", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.memora_widget);
        views.setTextViewText(R.id.widget_note_title, title);
        views.setTextViewText(R.id.widget_note_content, content);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra("OPEN_NOTE_ID", noteId);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, MemoraWidget.class);
        int[] ids = manager.getAppWidgetIds(widget);
        if (ids != null && ids.length > 0) {
            for (int id : ids) {
                updateAppWidget(context, manager, id);
            }
        }
    }
}`;
fs.writeFileSync(path.join(javaDir, 'MemoraWidget.java'), memoraWidgetJava);

// 5. Plugin WidgetBridge
const widgetBridgeJava = `package com.memora.notes;

import android.app.Activity;
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
        super.load();
        instance = this;
    }

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String title = call.getString("title", "Memora Notes");
        String content = call.getString("content", "Belum ada to-do aktif");
        String noteId = call.getString("noteId", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("memora_widget_prefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("widget_title", title)
            .putString("widget_content", content)
            .putString("widget_note_id", noteId)
            .apply();

        MemoraWidget.updateAllWidgets(context);
        call.resolve();
    }

    @PluginMethod
    public void getInitialNoteId(PluginCall call) {
        Activity activity = getActivity();
        String noteId = null;
        if (activity != null && activity.getIntent() != null) {
            noteId = activity.getIntent().getStringExtra("OPEN_NOTE_ID");
            activity.getIntent().removeExtra("OPEN_NOTE_ID");
        }
        JSObject ret = new JSObject();
        ret.put("noteId", noteId);
        call.resolve(ret);
    }

    public static void notifyNoteClicked(String noteId) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("noteId", noteId);
            instance.notifyListeners("onWidgetClicked", data);
        }
    }
}`;
fs.writeFileSync(path.join(javaDir, 'WidgetBridgePlugin.java'), widgetBridgeJava);

// 6. Daftarkan Plugin ke MainActivity.java
if (fs.existsSync(mainActivityPath)) {
    let mainAct = fs.readFileSync(mainActivityPath, 'utf8');
    if (!mainAct.includes('WidgetBridgePlugin.class')) {
        mainAct = mainAct.replace(
            'public class MainActivity extends BridgeActivity {',
            `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String noteId = intent.getStringExtra("OPEN_NOTE_ID");
        if (noteId != null) {
            WidgetBridgePlugin.notifyNoteClicked(noteId);
        }
    }`
        );
        fs.writeFileSync(mainActivityPath, mainAct);
    }
}

// 7. Daftarkan Widget ke AndroidManifest.xml
if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    if (!manifest.includes('MemoraWidget')) {
        const receiverXml = `
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
        manifest = manifest.replace('</application>', receiverXml);
        fs.writeFileSync(manifestPath, manifest);
    }
}

console.log("=== Pemasangan Widget Selesai! ===");
