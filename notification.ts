import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { noteRepository } from '../db';
import type { ReminderMode } from '../types/note';

const AlarmBridge = registerPlugin<any>('AlarmBridge');

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    let granted = false;
    try {
      const status = await LocalNotifications.requestPermissions();
      granted = status.display === 'granted';
    } catch {
      granted = false;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await AlarmBridge.requestPermissions();
      } catch {
        // Ignore if native alarm bridge unavailable
      }
    }

    return granted;
  },

  async scheduleReminder(
    noteId: string,
    title: string,
    content: string,
    datetimeStr: string,
    mode: ReminderMode = 'notification'
  ): Promise<number> {
    const notifId = Math.floor(Math.random() * 900000) + 100000;
    const targetDate = new Date(datetimeStr);
    const triggerAtMillis = targetDate.getTime();

    if (mode === 'alarm' && Capacitor.isNativePlatform()) {
      try {
        await AlarmBridge.scheduleAlarm({
          id: notifId,
          noteId,
          title: title || 'Alarm Memora',
          content: content || 'Waktunya meninjau catatan Anda.',
          triggerAtMillis
        });
        return notifId;
      } catch (e) {
        console.warn('Gagal menjadwalkan alarm native, fallback ke notifikasi:', e);
      }
    }

    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'REMINDER_ACTIONS',
            actions: [
              { id: 'MARK_DONE', title: 'Tandai Selesai' },
              { id: 'SNOOZE_10', title: 'Tunda 10 Menit' }
            ]
          }
        ]
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || 'Pengingat Memora',
            body: content || 'Ada jadwal catatan yang perlu Anda tinjau.',
            schedule: { at: targetDate, allowWhileIdle: true },
            actionTypeId: 'REMINDER_ACTIONS',
            extra: { noteId }
          }
        ]
      });
    } catch (e) {
      console.warn('Jadwal notifikasi offline via Capacitor:', e);
    }

    return notifId;
  },

  async cancelReminder(notificationId?: number): Promise<void> {
    if (!notificationId) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });
    } catch {
      // Ignore on web
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await AlarmBridge.cancelAlarm({ id: notificationId });
      } catch {
        // Ignore if not scheduled as native alarm
      }
    }
  },

  setupListeners(onRefreshUI: () => void) {
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
        const noteId = action.notification.extra?.noteId;
        if (!noteId) return;

        if (action.actionId === 'MARK_DONE') {
          const allNotes = await noteRepository.getAllNotes();
          const target = allNotes.find((n) => n.id === noteId);
          if (target && target.reminder) {
            target.reminder.status = 'completed';
            await noteRepository.saveNote(target);
            onRefreshUI();
          }
        } else if (action.actionId === 'SNOOZE_10') {
          const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
          await LocalNotifications.schedule({
            notifications: [
              {
                ...action.notification,
                id: Math.floor(Math.random() * 900000) + 100000,
                schedule: { at: snoozeTime, allowWhileIdle: true }
              }
            ]
          });
        }
      });
    } catch {
      // Ignore on web
    }

    if (Capacitor.isNativePlatform()) {
      try {
        AlarmBridge.addListener('onAlarmDismissed', async (data: { noteId?: string }) => {
          if (!data?.noteId) return;
          const allNotes = await noteRepository.getAllNotes();
          const target = allNotes.find((n) => n.id === data.noteId);
          if (target && target.reminder) {
            target.reminder.status = 'completed';
            await noteRepository.saveNote(target);
            onRefreshUI();
          }
        });
      } catch {
        // Ignore if bridge unavailable
      }
    }
  }
};
