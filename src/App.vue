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
      const todoPreview = topNote.checklist?.find(c => !c.completed)?.text || topNote.content || 'Semua to-do selesai 💕';
      await WidgetBridge.updateWidgetData({
        title: topNote.title,
        content: (topNote.checklist?.length ? '🌸 ' : '') + todoPreview,
        noteId: topNote.id
      });
    } else {
      await WidgetBridge.updateWidgetData({
        title: 'Memora • by Natanael 🌸',
        content: 'Belum ada catatan aktif',
        noteId: ''
      });
    }
  } catch (e) {}
}

async function loadNotes() {
  notes.value = await noteRepository.getAllNotes();
  await syncToWidget();
}

onMounted(async () => {
  await loadNotes();
  notificationService.setupListeners(loadNotes);

  try {
    const res = await WidgetBridge.getInitialNoteId();
    if (res?.noteId) {
      handleOpenEdit(res.noteId);
    }

    WidgetBridge.addListener('onWidgetClicked', (data: { noteId: string }) => {
      if (data?.noteId) {
        handleOpenEdit(data.noteId);
      }
    });
  } catch (e) {}
});

async function handleQuickAdd(payload: { title: string; type: 'todo' | 'plain' }) {
  const newNote: Note = {
    id: 'note-' + Date.now(),
    title: payload.title,
    type: payload.type === 'todo' ? 'checklist' : 'plain',
    content: payload.type === 'todo' ? '' : 'Catatan manis dari beranda.',
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
            <div class="author">by Natanael 🌸</div>
            <span class="subtitle">Pencatat Manis & Pengingat Terjadwal</span>
          </div>
        </div>
        <div class="offline-pill">
          <span class="dot"></span>
          <span>Offline Ready ✨</span>
        </div>
      </div>

      <div class="search-bar">
        <input v-model="searchQuery" type="text" placeholder="Cari catatan atau to-do... 🔍" />
      </div>

      <div class="filter-row">
        <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">Semua 🌸</button>
        <button :class="{ active: activeFilter === 'reminder' }" @click="activeFilter = 'reminder'">⏰ Pengingat</button>
        <button :class="{ active: activeFilter === 'todo' }" @click="activeFilter = 'todo'">☑ To-Do</button>
        <button :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">✓ Selesai</button>
      </div>

      <QuickAddBar @add-quick="handleQuickAdd" />
    </header>

    <main class="masonry-container">
      <!-- Tampilan Layar Kosong dengan Maskot Vektor Asli (Persis Gambar 1) -->
      <div v-if="filteredNotes.length === 0" class="empty-state">
        <div class="mascot-box">
          <svg class="mascot-svg" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Badan & Kaki Kecil -->
            <path d="M 68 115 C 65 115 62 120 62 128 C 62 134 66 137 70 137 C 74 137 75 132 76 128 C 77 132 80 137 84 137 C 88 137 92 134 92 128 C 92 120 89 115 86 115 Z" fill="#FFFFFF" stroke="#3F3D56" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Kepala Bulat Besar -->
            <ellipse cx="80" cy="75" rx="55" ry="46" fill="#FFFFFF" stroke="#3F3D56" stroke-width="2.5" />
            <!-- Pipi Merona Pink Manis -->
            <ellipse cx="44" cy="88" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.7" />
            <ellipse cx="116" cy="88" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.7" />
            <!-- Mata Hitam Bulat Kiri dengan Pantulan Cahaya -->
            <ellipse cx="56" cy="72" rx="23" ry="26" fill="#18181B" transform="rotate(-6 56 72)" />
            <circle cx="63" cy="58" r="4.5" fill="#FFFFFF" />
            <circle cx="51" cy="78" r="1.8" fill="#FFFFFF" opacity="0.8" />
            <!-- Mata Hitam Bulat Kanan dengan Pantulan Cahaya -->
            <ellipse cx="104" cy="72" rx="23" ry="26" fill="#18181B" transform="rotate(6 104 72)" />
            <circle cx="111" cy="58" r="4.5" fill="#FFFFFF" />
            <circle cx="99" cy="78" r="1.8" fill="#FFFFFF" opacity="0.8" />
            <!-- Senyuman Kecil Menggemaskan -->
            <path d="M 76 94 Q 80 97 84 94" stroke="#3F3D56" stroke-width="2.2" stroke-linecap="round" fill="none" />
            <!-- Aksesoris Bunga Pink di Kepala -->
            <g transform="translate(112, 34) scale(0.7)">
              <circle cx="10" cy="4" r="5" fill="#F472B6" />
              <circle cx="16" cy="10" r="5" fill="#F472B6" />
              <circle cx="14" cy="16" r="5" fill="#F472B6" />
              <circle cx="6" cy="16" r="5" fill="#F472B6" />
              <circle cx="4" cy="10" r="5" fill="#F472B6" />
              <circle cx="10" cy="11" r="3.5" fill="#FDE047" />
            </g>
          </svg>
        </div>
        <p class="empty-title">Lagi santai dulu nih... 🌸</p>
        <p class="empty-subtitle">Yuk tulis catatan manis atau to-do barumu lewat kolom di atas!</p>
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
  gap: 12px;
}
.logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--pink-primary), #FB7185);
  color: white;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 19px;
  box-shadow: 0 4px 10px rgba(236, 72, 153, 0.3);
}
.title {
  font-size: 21px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  letter-spacing: -0.5px;
}
.author {
  font-size: 11px;
  font-weight: 700;
  color: var(--pink-primary);
  margin-top: 1px;
  margin-bottom: 2px;
  letter-spacing: 0.3px;
}
.subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
}
.offline-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--pink-soft);
  color: var(--pink-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}
.dot {
  width: 7px;
  height: 7px;
  background: var(--pink-primary);
  border-radius: 50%;
}
.search-bar input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  font-size: 13.5px;
  color: var(--text-main);
  outline: none;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}
.search-bar input:focus {
  border-color: var(--pink-primary);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}
.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.filter-row button {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.filter-row button.active {
  background: var(--pink-primary);
  border-color: var(--pink-primary);
  color: white;
  box-shadow: 0 2px 6px rgba(236, 72, 153, 0.25);
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

/* Layar Kosong dengan Maskot Vektor */
.empty-state {
  column-span: all;
  text-align: center;
  padding: 32px 20px;
  background: #FFFFFF;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--border-hover);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mascot-box {
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 10px rgba(236, 72, 153, 0.12));
}
.mascot-svg {
  width: 140px;
  height: 140px;
}
.empty-title {
  font-weight: 700;
  color: var(--text-main);
  font-size: 15px;
}
.empty-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
}
</style>
