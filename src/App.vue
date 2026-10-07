<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { registerPlugin } from '@capacitor/core';
import type { Note } from './types/note';
import { noteRepository } from './db';
import { notificationService } from './services/notification';
import QuickAddBar from './components/QuickAddBar.vue';
import NoteCard from './components/NoteCard.vue';
import NoteEditorModal from './components/NoteEditorModal.vue';

// Hubungkan ke jembatan widget Android
const WidgetBridge = registerPlugin<any>('WidgetBridge');

const notes = ref<Note[]>([]);
const searchQuery = ref('');
const activeFilter = ref<'all' | 'reminder' | 'todo' | 'completed'>('all');

const isModalOpen = ref(false);
const editingNote = ref<Note | null>(null);

async function syncToWidget() {
  try {
    const topNote = notes.value[0];
    if (topNote) {
      const todoPreview = topNote.checklist?.find(c => !c.completed)?.text || topNote.content || 'Semua to-do selesai';
      await WidgetBridge.updateWidgetData({
        title: topNote.title,
        content: (topNote.checklist?.length ? '☐ ' : '') + todoPreview,
        noteId: topNote.id
      });
    } else {
      await WidgetBridge.updateWidgetData({
        title: 'Memora • by Natanael',
        content: 'Belum ada catatan aktif',
        noteId: ''
      });
    }
  } catch (e) {
    // Berjalan normal di mode web browser
  }
}

async function loadNotes() {
  notes.value = await noteRepository.getAllNotes();
  await syncToWidget();
}

onMounted(async () => {
  await loadNotes();
  notificationService.setupListeners(loadNotes);

  // Periksa apakah aplikasi dibuka dari sentuhan Widget di layar depan
  try {
    const res = await WidgetBridge.getInitialNoteId();
    if (res?.noteId) {
      handleOpenEdit(res.noteId);
    }

    // Dengarkan jika widget disentuh saat aplikasi sedang diminimize
    WidgetBridge.addListener('onWidgetClicked', (data: { noteId: string }) => {
      if (data?.noteId) {
        handleOpenEdit(data.noteId);
      }
    });
  } catch (e) {
    // Mode browser biasa
  }
});

async function handleQuickAdd(payload: { title: string; type: 'todo' | 'plain' }) {
  const newNote: Note = {
    id: 'note-' + Date.now(),
    title: payload.title,
    type: payload.type === 'todo' ? 'checklist' : 'plain',
    content: payload.type === 'todo' ? '' : 'Catatan cepat dari beranda.',
    checklist: payload.type === 'todo' ? [{ id: 'c-' + Date.now(), text: payload.title, completed: false }] : [],
    toggles: [],
    reminder: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await noteRepository.saveNote(newNote);
  await loadNotes();
}

async function handleToggleCheck(noteId: string, itemId: string) {
  await noteRepository.toggleChecklist(noteId, itemId);
  await loadNotes();
}

async function handleToggleAccordion(noteId: string, toggleId: string) {
  await noteRepository.toggleAccordion(noteId, toggleId);
  await loadNotes();
}

function handleOpenEdit(noteId: string) {
  const target = notes.value.find(n => n.id === noteId);
  if (target) {
    editingNote.value = target;
    isModalOpen.value = true;
  }
}

async function handleSaveNote(updatedNote: Note) {
  if (updatedNote.reminder && updatedNote.reminder.status === 'pending') {
    const notifId = await notificationService.scheduleReminder(
      updatedNote.id,
      updatedNote.title,
      updatedNote.content,
      updatedNote.reminder.datetime
    );
    updatedNote.reminder.notificationId = notifId;
  }

  await noteRepository.saveNote(updatedNote);
  await loadNotes();
}

async function handleDeleteNote(id: string) {
  await noteRepository.deleteNote(id);
  await loadNotes();
}

const filteredNotes = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return notes.value.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.checklist?.some(c => c.text.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (activeFilter.value === 'reminder') return !!n.reminder;
    if (activeFilter.value === 'todo') return n.checklist?.some(c => !c.completed);
    if (activeFilter.value === 'completed') {
      return n.checklist?.length > 0 && n.checklist.every(c => c.completed);
    }
    return true;
  });
});
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="brand-row">
        <div class="brand">
          <div class="logo">M</div>
          <div>
            <h1 class="title">Memora</h1>
            <div class="author">by Natanael</div>
            <span class="subtitle">Pencatat Offline & Pengingat Terjadwal</span>
          </div>
        </div>
        <div class="offline-pill">
          <span class="dot"></span>
          <span>Offline Ready</span>
        </div>
      </div>

      <div class="search-bar">
        <input v-model="searchQuery" type="text" placeholder="Cari catatan atau to-do..." />
      </div>

      <div class="filter-row">
        <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">Semua</button>
        <button :class="{ active: activeFilter === 'reminder' }" @click="activeFilter = 'reminder'">⏰ Ada Pengingat</button>
        <button :class="{ active: activeFilter === 'todo' }" @click="activeFilter = 'todo'">☑ To-Do Terbuka</button>
        <button :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">✓ Selesai</button>
      </div>

      <QuickAddBar @add-quick="handleQuickAdd" />
    </header>

    <main class="masonry-container">
      <div v-if="filteredNotes.length === 0" class="empty-state">
        <p>📝 Belum ada catatan. Buat catatan baru lewat kolom di atas!</p>
      </div>

      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        @toggle-check="handleToggleCheck"
        @toggle-accordion="handleToggleAccordion"
        @open-edit="handleOpenEdit"
      />
    </main>

    <NoteEditorModal
      :is-open="isModalOpen"
      :note="editingNote"
      @close="isModalOpen = false"
      @save="handleSaveNote"
      @delete="handleDeleteNote"
    />
  </div>
</template>

<style scoped>
.app-layout {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 16px 60px 16px;
}
.app-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--blue-primary), var(--blue-accent));
  color: white;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.1;
}
.author {
  font-size: 11px;
  font-weight: 600;
  color: var(--blue-primary);
  margin-top: 1px;
  margin-bottom: 2px;
  letter-spacing: 0.3px;
}
.subtitle {
  font-size: 12px;
  color: var(--text-muted);
}
.offline-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #ECFDF5;
  color: #065F46;
  border: 1px solid #A7F3D0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.dot {
  width: 8px;
  height: 8px;
  background: #10B981;
  border-radius: 50%;
}
.search-bar input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #FFFFFF;
  font-size: 14px;
  outline: none;
}
.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.filter-row button {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: #FFFFFF;
  font-size: 12.5px;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}
.filter-row button.active {
  background: var(--blue-primary);
  border-color: var(--blue-primary);
  color: white;
}
.masonry-container {
  column-count: 2;
  column-gap: 16px;
}
@media (max-width: 600px) {
  .masonry-container {
    column-count: 1;
  }
}
@media (min-width: 850px) {
  .masonry-container {
    column-count: 3;
  }
}
.empty-state {
  column-span: all;
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-subtle);
  color: var(--text-muted);
}
</style>
