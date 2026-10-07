// src/services/notification.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { noteRepository } from '../db';

export const notificationService = {
  // Meminta izin notifikasi ke sistem Android saat pertama kali dipakai
  async requestPermission(): Promise<boolean> {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  },

  // Menjadwalkan alarm notifikasi sesuai tanggal & jam yang dipilih
  async scheduleReminder(noteId: string, title: string, content: string, datetimeStr: string): Promise<number> {
    const notifId = Math.floor(Math.random() * 1000000);
    const targetDate = new Date(datetimeStr);

    // Mendaftarkan tombol aksi Android: Tandai Selesai & Tunda 10 Menit
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'REMINDER_ACTIONS',
            actions: [
              { id: 'MARK_DONE', title: '✓ Tandai Selesai' },
              { id: 'SNOOZE_10', title: '⏳ Tunda 10 Menit' }
            ]
          }
        ]
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || 'Pengingat Memora',
            body: content || 'Ada jadwal catatan yang perlu Anda tinjau.',
            id: notifId,
            schedule: { at: targetDate },
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

  // Mendengarkan tombol aksi saat notifikasi di HP diklik oleh pengguna
  setupListeners(onRefreshUI: () => void) {
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
        const noteId = action.notification.extra?.noteId;
        if (!noteId) return;

        if (action.actionId === 'MARK_DONE') {
          // Tandai selesai di IndexedDB
          const notes = await noteRepository.getAllNotes();
          const target = notes.find(n => n.id === noteId);
          if (target && target.reminder) {
            target.reminder.status = 'completed';
            await noteRepository.saveNote(target);
            onRefreshUI();
          }
        } else if (action.actionId === 'SNOOZE_10') {
          // Jadwalkan ulang 10 menit ke depan
          const snoozeDate = new Date(Date.now() + 10 * 60 * 1000);
          await LocalNotifications.schedule({
            notifications: [
              {
                ...action.notification,
                id: Math.floor(Math.random() * 1000000),
                schedule: { at: snoozeDate }
              }
            ]
          });
        }
      });
    } catch (e) {
      console.warn('Listener notifikasi berjalan:', e);
    }
  }
};
