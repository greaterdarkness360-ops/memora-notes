const fs = require('fs');
const path = require('path');

console.log('Memasang Sistem Alarm & Getaran Native Android Memora...');

const androidMain = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const resDir = path.join(androidMain, 'res');
const javaDir = path.join(androidMain, 'java', 'com', 'memora', 'notes');

fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
fs.mkdirSync(javaDir, { recursive: true });

// 1. Layout layar penuh AlarmActivity (res/layout/activity_alarm.xml)
const alarmLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="28dp"
    android:background="#0E0E11">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="ALARM MEMORA"
        android:textColor="#A1A1AA"
        android:textSize="13sp"
        android:textStyle="bold"
        android:letterSpacing="0.15"
        android:layout_marginBottom="16dp" />

    <TextView
        android:id="@+id/alarm_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center"
        android:text="Pengingat Catatan"
        android:textColor="#F4F4F5"
        android:textSize="26sp"
        android:textStyle="bold"
        android:layout_marginBottom="12dp" />

    <TextView
        android:id="@+id/alarm_content"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center"
        android:text="Waktunya meninjau catatan Anda."
        android:textColor="#A1A1AA"
        android:textSize="15sp"
        android:layout_marginBottom="40dp" />

    <Button
        android:id="@+id/btn_dismiss_alarm"
        android:layout_width="match_parent"
        android:layout_height="54dp"
        android:text="Matikan Alarm"
        android:textAllCaps="false"
        android:textSize="16sp"
        android:textStyle="bold"
        android:textColor="#0E0E11"
        android:backgroundTint="#F4F4F5"
        android:layout_marginBottom="12dp" />

    <Button
        android:id="@+id/btn_snooze_alarm"
        android:layout_width="match_parent"
        android:layout_height="50dp"
        android:text="Tunda 10 Menit"
        android:textAllCaps="false"
        android:textSize="15sp"
        android:textColor="#F4F4F5"
        android:backgroundTint="#27272A" />
</LinearLayout>
`;
fs.writeFileSync(path.join(resDir, 'layout', 'activity_alarm.xml'), alarmLayout);

// 2. AlarmService.java (Memutar suara alarm looping + getaran terus-menerus)
const alarmServiceJava = `package com.memora.notes;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;

public class AlarmService extends Service {
    public static final String CHANNEL_ID = "memora_alarm_channel";
    public static final String ACTION_START = "com.memora.notes.ACTION_START_ALARM";
    public static final String ACTION_DISMISS = "com.memora.notes.ACTION_DISMISS_ALARM";
    public static final String ACTION_SNOOZE = "com.memora.notes.ACTION_SNOOZE_ALARM";

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        int alarmId = intent.getIntExtra("alarmId", 1001);
        String noteId = intent.getStringExtra("noteId");
        String title = intent.getStringExtra("title");
        String content = intent.getStringExtra("content");

        if (ACTION_DISMISS.equals(action)) {
            stopAlarmAndSelf();
            AlarmBridgePlugin.notifyAlarmDismissed(noteId);
            return START_NOT_STICKY;
        }

        if (ACTION_SNOOZE.equals(action)) {
            stopAlarmAndSelf();
            long snoozeAt = System.currentTimeMillis() + 10 * 60 * 1000L;
            AlarmBridgePlugin.scheduleExactAlarm(
                this,
                alarmId,
                noteId != null ? noteId : "",
                title != null ? title : "Alarm Memora",
                content != null ? content : "Pengingat ditunda 10 menit.",
                snoozeAt
            );
            return START_NOT_STICKY;
        }

        createNotificationChannel();
        Notification notification = buildAlarmNotification(alarmId, noteId, title, content);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(alarmId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(alarmId, notification);
        }

        startSoundAndVibration();

        Intent fullScreenIntent = new Intent(this, AlarmActivity.class);
        fullScreenIntent.putExtra("alarmId", alarmId);
        fullScreenIntent.putExtra("noteId", noteId);
        fullScreenIntent.putExtra("title", title);
        fullScreenIntent.putExtra("content", content);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            startActivity(fullScreenIntent);
        } catch (Exception ignored) {}

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarm Memora",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alarm berdering dan bergetar untuk pengingat Memora");
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildAlarmNotification(int alarmId, String noteId, String title, String content) {
        Intent fullScreenIntent = new Intent(this, AlarmActivity.class);
        fullScreenIntent.putExtra("alarmId", alarmId);
        fullScreenIntent.putExtra("noteId", noteId);
        fullScreenIntent.putExtra("title", title);
        fullScreenIntent.putExtra("content", content);
        PendingIntent fullScreenPending = PendingIntent.getActivity(
            this,
            alarmId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent dismissIntent = new Intent(this, AlarmService.class);
        dismissIntent.setAction(ACTION_DISMISS);
        dismissIntent.putExtra("alarmId", alarmId);
        dismissIntent.putExtra("noteId", noteId);
        PendingIntent dismissPending = PendingIntent.getService(
            this,
            alarmId + 1,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent snoozeIntent = new Intent(this, AlarmService.class);
        snoozeIntent.setAction(ACTION_SNOOZE);
        snoozeIntent.putExtra("alarmId", alarmId);
        snoozeIntent.putExtra("noteId", noteId);
        snoozeIntent.putExtra("title", title);
        snoozeIntent.putExtra("content", content);
        PendingIntent snoozePending = PendingIntent.getService(
            this,
            alarmId + 2,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title != null ? title : "Alarm Memora")
            .setContentText(content != null ? content : "Waktunya meninjau catatan Anda.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Matikan", dismissPending)
            .addAction(android.R.drawable.ic_menu_recent_history, "Tunda 10 Menit", snoozePending)
            .build();
    }

    @SuppressWarnings("deprecation")
    private void startSoundAndVibration() {
        stopSoundAndVibration();

        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alarmUri);
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception ignored) {}

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[] { 0, 800, 400, 800, 400 };
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopSoundAndVibration() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    private void stopAlarmAndSelf() {
        stopSoundAndVibration();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopSoundAndVibration();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'AlarmService.java'), alarmServiceJava);

// 3. AlarmReceiver.java
const alarmReceiverJava = `package com.memora.notes;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.setAction(AlarmService.ACTION_START);
        serviceIntent.putExtra("alarmId", intent.getIntExtra("alarmId", 1001));
        serviceIntent.putExtra("noteId", intent.getStringExtra("noteId"));
        serviceIntent.putExtra("title", intent.getStringExtra("title"));
        serviceIntent.putExtra("content", intent.getStringExtra("content"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'AlarmReceiver.java'), alarmReceiverJava);

// 4. AlarmActivity.java
const alarmActivityJava = `package com.memora.notes;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );

        setContentView(R.layout.activity_alarm);

        int alarmId = getIntent().getIntExtra("alarmId", 1001);
        String noteId = getIntent().getStringExtra("noteId");
        String title = getIntent().getStringExtra("title");
        String content = getIntent().getStringExtra("content");

        TextView titleView = findViewById(R.id.alarm_title);
        TextView contentView = findViewById(R.id.alarm_content);
        Button btnDismiss = findViewById(R.id.btn_dismiss_alarm);
        Button btnSnooze = findViewById(R.id.btn_snooze_alarm);

        titleView.setText(title != null && !title.isEmpty() ? title : "Alarm Memora");
        contentView.setText(content != null && !content.isEmpty() ? content : "Waktunya meninjau catatan Anda.");

        btnDismiss.setOnClickListener(v -> {
            Intent dismissIntent = new Intent(this, AlarmService.class);
            dismissIntent.setAction(AlarmService.ACTION_DISMISS);
            dismissIntent.putExtra("alarmId", alarmId);
            dismissIntent.putExtra("noteId", noteId);
            startService(dismissIntent);
            finish();
        });

        btnSnooze.setOnClickListener(v -> {
            Intent snoozeIntent = new Intent(this, AlarmService.class);
            snoozeIntent.setAction(AlarmService.ACTION_SNOOZE);
            snoozeIntent.putExtra("alarmId", alarmId);
            snoozeIntent.putExtra("noteId", noteId);
            snoozeIntent.putExtra("title", title);
            snoozeIntent.putExtra("content", content);
            startService(snoozeIntent);
            finish();
        });
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'AlarmActivity.java'), alarmActivityJava);

// 5. AlarmBridgePlugin.java
const alarmBridgeJava = `package com.memora.notes;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmBridge")
public class AlarmBridgePlugin extends Plugin {
    private static AlarmBridgePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        int id = call.getInt("id", 1001);
        String noteId = call.getString("noteId", "");
        String title = call.getString("title", "Alarm Memora");
        String content = call.getString("content", "Waktunya meninjau catatan Anda.");
        Long triggerAtMillis = call.getLong("triggerAtMillis");

        if (triggerAtMillis == null || triggerAtMillis <= System.currentTimeMillis()) {
            call.reject("Waktu alarm harus di masa depan.");
            return;
        }

        scheduleExactAlarm(getContext(), id, noteId, title, content, triggerAtMillis);
        call.resolve();
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        int id = call.getInt("id", -1);
        if (id != -1) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                getContext(),
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (alarmManager != null) {
                alarmManager.cancel(pendingIntent);
            }
        }
        call.resolve();
    }

    public static void scheduleExactAlarm(
        Context context,
        int id,
        String noteId,
        String title,
        String content,
        long triggerAtMillis
    ) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent receiverIntent = new Intent(context, AlarmReceiver.class);
        receiverIntent.putExtra("alarmId", id);
        receiverIntent.putExtra("noteId", noteId);
        receiverIntent.putExtra("title", title);
        receiverIntent.putExtra("content", content);

        PendingIntent operation = PendingIntent.getBroadcast(
            context,
            id,
            receiverIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(context, MainActivity.class);
        PendingIntent showPending = PendingIntent.getActivity(
            context,
            id,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPending);
            alarmManager.setAlarmClock(clockInfo, operation);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
        }
    }

    public static void notifyAlarmDismissed(String noteId) {
        if (instance != null && noteId != null && !noteId.isEmpty()) {
            JSObject data = new JSObject();
            data.put("noteId", noteId);
            instance.notifyListeners("onAlarmDismissed", data);
        }
    }
}
`;
fs.writeFileSync(path.join(javaDir, 'AlarmBridgePlugin.java'), alarmBridgeJava);

// 6. Update AndroidManifest.xml with permissions, receiver, service, and activity
const manifestPath = path.join(androidMain, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
    'android.permission.VIBRATE',
    'android.permission.WAKE_LOCK',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.USE_FULL_SCREEN_INTENT'
];

const permTags = permissions
    .filter((p) => !manifest.includes(p))
    .map((p) => `    <uses-permission android:name="${p}" />`)
    .join('\n');

if (permTags) {
    manifest = manifest.replace('<application', `${permTags}\n\n    <application`);
}

if (!manifest.includes('android:name=".AlarmReceiver"')) {
    const alarmComponents = `
        <receiver
            android:name=".AlarmReceiver"
            android:exported="false" />

        <service
            android:name=".AlarmService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />

        <activity
            android:name=".AlarmActivity"
            android:exported="false"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:launchMode="singleTop"
            android:theme="@android:style/Theme.DeviceDefault.NoActionBar.Fullscreen" />
    </application>`;
    manifest = manifest.replace('</application>', alarmComponents);
}

fs.writeFileSync(manifestPath, manifest);
console.log('Sistem Alarm & Getaran Native Android Memora berhasil dipasang.');
