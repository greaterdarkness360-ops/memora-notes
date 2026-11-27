<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { registerPlugin } from '@capacitor/core';
import { noteRepository } from './db';
import { notificationService } from './services/notification';
import type { Note } from './types/note';
import QuickAddBar from './components/QuickAddBar.vue';
import NoteCard from './components/NoteCard.vue';
import NoteEditorModal from './components/NoteEditorModal.vue';

const WidgetBridge = registerPlugin<any>('WidgetBridge');
const THEME_STORAGE_KEY = 'memora-theme';

const notes = ref<Note[]>([]);
const searchQuery = ref('');
const activeFilter = ref<'all' | 'reminder' | 'todo' | 'completed'>('all');
const editingNote = ref<Note | null>(null);
const theme = ref<'light' | 'dark'>(
  typeof localStorage !== 'undefined' && localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
    ? 'dark'
    : 'light'
);

const isDark = computed(() => theme.value === 'dark');

const applyTheme = async (nextTheme: 'light' | 'dark') => {
  theme.value = nextTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage errors
  }

  if (typeof document !== 'undefined') {
    if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', nextTheme === 'dark' ? '#0E0E11' : '#FAF5EE');
    }
  }

  await syncToWidget();
};

const toggleTheme = () => {
  applyTheme(isDark.value ? 'light' : 'dark');
};

const syncToWidget = async () => {
  try {
    const topNote = notes.value[0];
    if (topNote) {
      const firstUnchecked = topNote.checklist.find((c) => !c.completed);
      const prefix = isDark.value ? '- ' : '🌸 ';
      const previewContent = firstUnchecked
        ? `${prefix}${firstUnchecked.text}`
        : topNote.content || 'Ketuk untuk membuka catatan';

      await WidgetBridge.updateWidgetData({
        title: topNote.title || 'Memora Notes',
        content: previewContent,
        noteId: topNote.id,
        theme: theme.value
      });
    } else {
      await WidgetBridge.updateWidgetData({
        title: 'Memora Notes',
        content: 'Belum ada catatan aktif',
        noteId: '',
        theme: theme.value
      });
    }
  } catch {
    // Ignore on web preview
  }
};

const loadNotes = async () => {
  notes.value = await noteRepository.getAllNotes();
  await syncToWidget();
};

const filteredNotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();

  return notes.value.filter((note) => {
    const matchesSearch =
      !q ||
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.checklist.some((item) => item.text.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeFilter.value === 'reminder') {
      return Boolean(note.reminder);
    }
    if (activeFilter.value === 'todo') {
      return note.checklist.some((item) => !item.completed);
    }
    if (activeFilter.value === 'completed') {
      return note.checklist.length > 0 && note.checklist.every((item) => item.completed);
    }
    return true;
  });
});

const handleQuickAdd = async (payload: { title: string; type: 'todo' | 'plain' }) => {
  const now = Date.now();
  const newNote: Note = {
    id: `note-${now}`,
    title: payload.type === 'todo' ? 'Daftar Tugas' : payload.title,
    type: payload.type === 'todo' ? 'checklist' : 'plain',
    content: payload.type === 'plain' ? '' : '',
    checklist:
      payload.type === 'todo'
        ? [{ id: `chk-${now}`, text: payload.title, completed: false }]
        : [],
    toggles: [],
    reminder: null,
    createdAt: now,
    updatedAt: now
  };

  await noteRepository.saveNote(newNote);
  await loadNotes();
};

const handleToggleCheck = async (noteId: string, itemId: string) => {
  await noteRepository.toggleChecklist(noteId, itemId);
  await loadNotes();
};

const handleToggleAccordion = async (noteId: string, toggleId: string) => {
  await noteRepository.toggleAccordion(noteId, toggleId);
  await loadNotes();
};

const handleOpenEdit = (noteId: string) => {
  const found = notes.value.find((n) => n.id === noteId);
  if (found) {
    editingNote.value = JSON.parse(JSON.stringify(found));
  }
};

const handleSaveNote = async (updatedNote: Note) => {
  const previous = notes.value.find((n) => n.id === updatedNote.id);
  if (previous?.reminder?.notificationId) {
    await notificationService.cancelReminder(previous.reminder.notificationId);
  }

  if (updatedNote.reminder && updatedNote.reminder.status === 'pending' && updatedNote.reminder.datetime) {
    const mode = updatedNote.reminder.mode || 'notification';
    const notifId = await notificationService.scheduleReminder(
      updatedNote.id,
      updatedNote.title,
      updatedNote.content,
      updatedNote.reminder.datetime,
      mode
    );
    updatedNote.reminder.notificationId = notifId;
    updatedNote.reminder.mode = mode;
  }

  await noteRepository.saveNote(updatedNote);
  editingNote.value = null;
  await loadNotes();
};

const handleDeleteNote = async (id: string) => {
  const target = notes.value.find((n) => n.id === id);
  if (target?.reminder?.notificationId) {
    await notificationService.cancelReminder(target.reminder.notificationId);
  }
  await noteRepository.deleteNote(id);
  editingNote.value = null;
  await loadNotes();
};

onMounted(async () => {
  await applyTheme(theme.value);
  await notificationService.requestPermission();
  notificationService.setupListeners(loadNotes);
  await loadNotes();

  try {
    const initial = await WidgetBridge.getInitialNoteId();
    if (initial?.noteId) {
      handleOpenEdit(initial.noteId);
    }
    WidgetBridge.addListener('onWidgetClicked', (data: { noteId?: string }) => {
      if (data?.noteId) {
        handleOpenEdit(data.noteId);
      }
    });
  } catch {
    // Ignore on web
  }
});
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-top">
        <div class="brand">
          <div class="logo">M</div>
          <div>
            <div class="title-row">
              <h1>Memora</h1>
              <span class="author-tag">{{ isDark ? 'by Natanael' : 'by Natanael 🌸' }}</span>
            </div>
            <p class="subtitle">
              {{ isDark ? 'Catatan & Pengingat' : 'Pencatat Manis & Pengingat Terjadwal' }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <span class="offline-pill">{{ isDark ? 'Offline' : 'Offline Ready ✨' }}</span>
          <button
            type="button"
            class="theme-toggle-btn"
            :aria-label="isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'"
            @click="toggleTheme"
          >
            <svg
              v-if="isDark"
              class="theme-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg
              v-else
              class="theme-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>{{ isDark ? 'Terang' : 'Gelap' }}</span>
          </button>
        </div>
      </div>

      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="isDark ? 'Cari catatan atau to-do...' : 'Cari catatan atau to-do... 🔍'"
        />
      </div>

      <div class="filter-row">
        <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
          {{ isDark ? 'Semua' : 'Semua 🌸' }}
        </button>
        <button :class="{ active: activeFilter === 'reminder' }" @click="activeFilter = 'reminder'">
          Pengingat
        </button>
        <button :class="{ active: activeFilter === 'todo' }" @click="activeFilter = 'todo'">
          To-Do
        </button>
        <button :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">
          Selesai
        </button>
      </div>
    </header>

    <main class="main-content">
      <QuickAddBar :is-dark="isDark" @add-quick="handleQuickAdd" />

      <div v-if="filteredNotes.length > 0" class="masonry-container">
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          :is-dark="isDark"
          @toggle-check="handleToggleCheck"
          @toggle-accordion="handleToggleAccordion"
          @open-edit="handleOpenEdit"
        />
      </div>

      <div v-else class="empty-state">
        <svg
          v-if="!isDark"
          class="mascot-svg"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="60" cy="60" r="52" fill="#FDF2F8" stroke="#FBCFE8" stroke-width="2" />
          <rect x="34" y="32" width="52" height="58" rx="12" fill="#FFFFFF" stroke="#EC4899" stroke-width="2.5" />
          <path d="M44 50H76M44 62H68M44 74H60" stroke="#FBCFE8" stroke-width="3" stroke-linecap="round" />
          <circle cx="82" cy="82" r="14" fill="#EC4899" />
          <path d="M82 76V88M76 82H88" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <p class="empty-title">Belum ada catatan</p>
        <p class="empty-sub">Mulai tulis catatan atau daftar to-do di kolom atas.</p>
      </div>
    </main>

    <NoteEditorModal
      v-if="editingNote"
      :note="editingNote"
      :is-dark="isDark"
      @close="editingNote = null"
      @save="handleSaveNote"
      @delete="handleDeleteNote"
    />
  </div>
</template>

<style scoped>
.app-layout {
  max-width: 820px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 48px;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: var(--bg-cream);
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--logo-bg);
  color: #FFFFFF;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--logo-shadow);
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.title-row h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.author-tag {
  font-size: 11px;
  color: var(--text-muted);
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.offline-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  background-color: var(--pink-soft);
  color: var(--pink-primary);
  border: 1px solid var(--border-subtle);
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.theme-icon {
  width: 14px;
  height: 14px;
}

.search-bar {
  margin-bottom: 10px;
}

.search-bar input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-size: 14px;
  outline: none;
}

.search-bar input:focus {
  border-color: var(--pink-primary);
  box-shadow: var(--focus-ring);
}

.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-row button {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background-color: var(--pink-pill);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-row button.active {
  background-color: var(--pink-primary);
  color: var(--btn-primary-text);
  border-color: var(--pink-primary);
  box-shadow: var(--btn-active-shadow);
}

.main-content {
  padding: 16px;
}

.masonry-container {
  column-count: 2;
  column-gap: 14px;
}

@media (max-width: 600px) {
  .masonry-container {
    column-count: 1;
  }
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-muted);
}

.mascot-svg {
  width: 96px;
  height: 96px;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
