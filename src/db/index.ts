// src/db/index.ts
import Dexie, { type Table } from 'dexie';
import type { Note } from '../types/note';

export class MemoraDatabase extends Dexie {
  notes!: Table<Note, string>;

  constructor() {
    super('MemoraNotesDB');
    this.version(1).stores({
      notes: 'id, title, type, createdAt, updatedAt'
    });
  }
}

export const db = new MemoraDatabase();

export const noteRepository = {
  // Mengambil semua catatan dari HP secara offline
  async getAllNotes(): Promise<Note[]> {
    return await db.notes.reverse().sortBy('createdAt');
  },

  // Menyimpan atau memperbarui catatan
  async saveNote(note: Note): Promise<string> {
    note.updatedAt = Date.now();
    return await db.notes.put(note);
  },

  // Menghapus catatan
  async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
  },

  // Mengubah centang to-do langsung dari halaman depan
  async toggleChecklist(noteId: string, itemId: string): Promise<void> {
    const note = await db.notes.get(noteId);
    if (!note || !note.checklist) return;

    const item = note.checklist.find(c => c.id === itemId);
    if (item) {
      item.completed = !item.completed;
      note.updatedAt = Date.now();
      await db.notes.put(note);
    }
  },

  // Buka-tutup toggle accordion Notion
  async toggleAccordion(noteId: string, toggleId: string): Promise<void> {
    const note = await db.notes.get(noteId);
    if (!note || !note.toggles) return;

    const t = note.toggles.find(item => item.id === toggleId);
    if (t) {
      t.isOpen = !t.isOpen;
      note.updatedAt = Date.now();
      await db.notes.put(note);
    }
  }
};
