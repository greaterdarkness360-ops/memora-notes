<script setup lang="ts">
import { ref } from 'vue';
import type { Note, ChecklistItem, ReminderMode } from '../types/note';

const props = withDefaults(
  defineProps<{
    note: Note;
    isDark?: boolean;
  }>(),
  { isDark: false }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', note: Note): void;
  (e: 'delete', id: string): void;
}>();

const activeTab = ref<'edit' | 'preview'>('edit');
const title = ref(props.note.title);
const content = ref(props.note.content);
const checklist = ref<ChecklistItem[]>(
  props.note.checklist.map((item) => ({ ...item }))
);
const hasReminder = ref(Boolean(props.note.reminder));
const reminderDatetime = ref(props.note.reminder?.datetime || '');
const reminderMode = ref<ReminderMode>(props.note.reminder?.mode || 'notification');

const addChecklistItem = () => {
  checklist.value.push({
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: '',
    completed: false
  });
};

const removeChecklistItem = (id: string) => {
  checklist.value = checklist.value.filter((item) => item.id !== id);
};

const handleSave = () => {
  const cleanedChecklist = checklist.value
    .map((item) => ({ ...item, text: item.text.trim() }))
    .filter((item) => item.text.length > 0);

  const noteType: Note['type'] =
    cleanedChecklist.length > 0 && content.value.trim().length > 0
      ? 'hybrid'
      : cleanedChecklist.length > 0
        ? 'checklist'
        : 'plain';

  const updated: Note = {
    ...props.note,
    title: title.value.trim() || 'Tanpa Judul',
    type: noteType,
    content: content.value,
    checklist: cleanedChecklist,
    toggles: props.note.toggles || [],
    reminder:
      hasReminder.value && reminderDatetime.value
        ? {
            datetime: reminderDatetime.value,
            status: 'pending',
            notificationId: props.note.reminder?.notificationId || 0,
            mode: reminderMode.value
          }
        : null,
    updatedAt: Date.now()
  };

  emit('save', updated);
};

const handleDelete = () => {
  if (confirm('Hapus catatan ini?')) {
    emit('delete', props.note.id);
  }
};
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="tab-group">
          <button
            type="button"
            :class="{ active: activeTab === 'edit' }"
            @click="activeTab = 'edit'"
          >
            {{ props.isDark ? 'Editor' : 'Editor 🌸' }}
          </button>
          <button
            type="button"
            :class="{ active: activeTab === 'preview' }"
            @click="activeTab = 'preview'"
          >
            Live Preview
          </button>
        </div>
        <button type="button" class="btn-close" aria-label="Tutup" @click="emit('close')">
          ✕
        </button>
      </div>

      <div v-if="activeTab === 'edit'" class="modal-body">
        <input
          v-model="title"
          type="text"
          class="input-title"
          placeholder="Judul catatan..."
        />

        <textarea
          v-model="content"
          rows="4"
          class="textarea-content"
          placeholder="Tulis catatan atau detail di sini..."
        ></textarea>

        <div class="section-block">
          <div class="section-head">
            <span class="section-label">Daftar To-Do Checklist</span>
            <button type="button" class="btn-add-item" @click="addChecklistItem">
              {{ props.isDark ? '+ Tambah Item' : '+ Tambah Item 💕' }}
            </button>
          </div>

          <div v-for="item in checklist" :key="item.id" class="checklist-edit-row">
            <input v-model="item.completed" type="checkbox" class="cute-checkbox" />
            <input
              v-model="item.text"
              type="text"
              class="input-check-text"
              placeholder="Isi to-do..."
            />
            <button
              type="button"
              class="btn-remove"
              aria-label="Hapus item"
              @click="removeChecklistItem(item.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="reminder-box">
          <label class="reminder-head">
            <input v-model="hasReminder" type="checkbox" class="cute-checkbox" />
            <span>{{ props.isDark ? 'Pengingat Waktu & Tanggal' : '⏰ Pengingat Waktu & Tanggal' }}</span>
          </label>

          <div v-if="hasReminder" class="reminder-controls">
            <input
              v-model="reminderDatetime"
              type="datetime-local"
              class="input-datetime"
            />

            <div class="mode-selector">
              <button
                type="button"
                class="mode-btn"
                :class="{ active: reminderMode === 'notification' }"
                @click="reminderMode = 'notification'"
              >
                Notifikasi Biasa
              </button>
              <button
                type="button"
                class="mode-btn"
                :class="{ active: reminderMode === 'alarm' }"
                @click="reminderMode = 'alarm'"
              >
                Alarm (Dering + Getar)
              </button>
            </div>
            <p class="mode-hint">
              {{
                reminderMode === 'alarm'
                  ? 'Ponsel akan berdering keras dengan suara alarm & getaran berulang hingga dimatikan.'
                  : 'Menampilkan notifikasi pengingat standar di bilah notifikasi.'
              }}
            </p>
          </div>
        </div>
      </div>

      <div v-else class="modal-body">
        <div class="preview-pane">
          <h3 class="preview-title">{{ title || 'Tanpa Judul' }}</h3>
          <p v-if="content" class="preview-text">{{ content }}</p>
          <ul v-if="checklist.length > 0" class="preview-checklist">
            <li v-for="item in checklist" :key="item.id" :class="{ done: item.completed }">
              <span>
                {{
                  props.isDark
                    ? item.completed
                      ? '[x]'
                      : '[ ]'
                    : item.completed
                      ? '💖'
                      : '🤍'
                }}
              </span>
              <span>{{ item.text || '(kosong)' }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-danger" @click="handleDelete">Hapus</button>
        <div class="footer-right">
          <button type="button" class="btn-secondary" @click="emit('close')">Batal</button>
          <button type="button" class="btn-primary" @click="handleSave">
            {{ props.isDark ? 'Simpan' : 'Simpan 💕' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.tab-group {
  display: inline-flex;
  gap: 6px;
}

.tab-group button {
  border: 1px solid var(--border-subtle);
  background-color: var(--pink-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.tab-group button.active {
  background-color: var(--pink-primary);
  color: var(--btn-primary-text);
  border-color: var(--pink-primary);
}

.btn-close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-title {
  width: 100%;
  font-size: 17px;
  font-weight: 700;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background-color: var(--bg-cream);
  color: var(--text-main);
  outline: none;
}

.textarea-content {
  width: 100%;
  font-size: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background-color: var(--bg-cream);
  color: var(--text-main);
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--pink-primary);
}

.btn-add-item {
  border: none;
  background: transparent;
  color: var(--pink-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.checklist-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cute-checkbox {
  accent-color: var(--pink-primary);
}

.input-check-text {
  flex: 1;
  font-size: 13px;
  padding: 7px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background-color: var(--bg-cream);
  color: var(--text-main);
  outline: none;
}

.btn-remove {
  border: none;
  background: transparent;
  color: var(--danger-color);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
}

.reminder-box {
  background-color: var(--reminder-bg);
  border: 1px solid var(--reminder-border);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminder-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--reminder-head);
  cursor: pointer;
}

.reminder-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-datetime {
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--reminder-input-border);
  background-color: var(--reminder-input-bg);
  color: var(--text-main);
  font-size: 13px;
}

.mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--reminder-input-border);
  background-color: var(--reminder-input-bg);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.mode-btn.active {
  background-color: var(--pink-primary);
  color: var(--btn-primary-text);
  border-color: var(--pink-primary);
}

.mode-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.preview-pane {
  background-color: var(--pink-soft);
  border: 1px dashed var(--border-hover);
  border-radius: var(--radius-md);
  padding: 14px;
}

.preview-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.preview-text {
  font-size: 13px;
  color: var(--text-muted);
  white-space: pre-wrap;
  margin-bottom: 10px;
}

.preview-checklist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-main);
}

.preview-checklist li {
  display: flex;
  gap: 8px;
}

.preview-checklist li.done {
  text-decoration: line-through;
  color: var(--text-light);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
}

.footer-right {
  display: flex;
  gap: 8px;
}

.btn-danger {
  border: none;
  background: transparent;
  color: var(--danger-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 10px;
}

.btn-secondary {
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-primary {
  border: none;
  background-color: var(--pink-primary);
  color: var(--btn-primary-text);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
</style>
