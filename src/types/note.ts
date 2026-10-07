// src/types/note.ts

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ToggleItem {
  id: string;
  header: string;
  body: string;
  isOpen: boolean;
}

export interface ReminderConfig {
  datetime: string; // Format waktu: YYYY-MM-DDTHH:mm
  status: 'pending' | 'completed' | 'snoozed';
  notificationId: number;
}

export interface Note {
  id: string;
  title: string;
  type: 'plain' | 'checklist' | 'hybrid';
  content: string;
  checklist: ChecklistItem[];
  toggles: ToggleItem[];
  reminder: ReminderConfig | null;
  createdAt: number;
  updatedAt: number;
}
