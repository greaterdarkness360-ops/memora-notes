<!-- src/components/NoteEditorModal.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Note, ChecklistItem } from '../types/note';

const props = defineProps<{
  isOpen: boolean;
  note: Note | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', updatedNote: Note): void;
  (e: 'delete', noteId: string): void;
}>();

const activeTab = ref<'edit' | 'preview'>('edit');
const localTitle = ref('');
const localContent = ref('');
const localChecklist = ref<ChecklistItem[]>([]);
const hasReminder = ref(false);
const reminderDatetime = ref('');

// Memuat data catatan saat modal dibuka
watch(() => props.note, (n) => {
  if (n) {
    localTitle.value = n.title;
    localContent.value = n.content || '';
    localChecklist.value = n.checklist ? JSON.parse(JSON.stringify(n.checklist)) : [];
    hasReminder.value = !!n.reminder;
    reminderDatetime.value = n.reminder?.datetime || '';
  } else {
    localTitle.value = '';
    localContent.value = '';
    localChecklist.value = [];
    hasReminder.value = false;
    reminderDatetime.value = '';
  }
  activeTab.value = 'edit';
}, { immediate: true });

function addChecklistItem() {
  localChecklist.value.push({
    id: 'c-' + Date.now() + Math.random().toString(36).substring(2, 5),
    text: '',
    completed: false
  });
}

function removeChecklistItem(index: number) {
  localChecklist.value.splice(index, 1);
}

function handleSave() {
  if (!props.note) return;

  const updated: Note = {
    ...props.note,
    title: localTitle.value.trim() || 'Tanpa Judul',
    content: localContent.value.trim(),
    checklist: localChecklist.value.filter(c => c.text.trim() !== ''),
    reminder: hasReminder.value && reminderDatetime.value
      ? {
          datetime: reminderDatetime.value,
          status: 'pending',
          notificationId: props.note.reminder?.notificationId || Math.floor(Math.random() * 1000000)
        }
      : null,
    updatedAt: Date.now()
  };

  emit('save', updated);
  emit('close');
}

function handleDelete() {
  if (props.note && confirm('Hapus catatan ini?')) {
    emit('delete', props.note.id);
    emit('close');
  }
}
</script>

<template>
  <div v-if="props.isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-window">
      <!-- Header Modal & Tab Switcher -->
      <div class="modal-header">
        <div class="modal-tabs">
          <button :class="{ active: activeTab === 'edit' }" @click="activeTab = 'edit'">Editor</button>
          <button :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">Live Preview</button>
        </div>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>

      <!-- Body Modal -->
      <div class="modal-body">
        <input v-model="localTitle" type="text" class="input-title" placeholder="Judul Catatan..." />

        <!-- Tampilan Tab Editor -->
        <div v-if="activeTab === 'edit'" class="tab-pane">
          <div>
            <label class="section-label">Catatan Teks / Ringkasan</label>
            <textarea v-model="localContent" class="textarea-content" placeholder="Ketik isi catatan di sini..."></textarea>
          </div>

          <div>
            <div class="checklist-header">
              <label class="section-label">Blok To-Do Checklist</label>
              <button class="btn-add-item" @click="addChecklistItem">+ Tambah Item</button>
            </div>
            <div class="checklist-list">
              <div v-for="(item, idx) in localChecklist" :key="item.id" class="checklist-edit-row">
                <input v-model="item.completed" type="checkbox" />
                <input v-model="item.text" type="text" placeholder="Isi to-do..." />
                <button class="btn-remove" @click="removeChecklistItem(idx)">✕</button>
              </div>
            </div>
          </div>

          <!-- Pengaturan Pengingat Waktu -->
          <div class="reminder-box">
            <div class="reminder-head">
              <span>⏰ Pengingat Waktu & Tanggal</span>
              <label class="toggle-label">
                <input v-model="hasReminder" type="checkbox" /> Aktifkan
              </label>
            </div>
            <input v-if="hasReminder" v-model="reminderDatetime" type="datetime-local" class="input-datetime" />
          </div>
        </div>

        <!-- Tampilan Tab Live Preview -->
        <div v-else class="tab-pane preview-pane">
          <h2 class="preview-title">{{ localTitle || 'Tanpa Judul' }}</h2>
          <p class="preview-text">{{ localContent || '(Belum ada teks)' }}</p>
          <div class="preview-checklist">
            <div v-for="item in localChecklist" :key="item.id" class="preview-check-row" :class="{ done: item.completed }">
              <span>{{ item.completed ? '☑' : '☐' }}</span>
              <span>{{ item.text || '(Item kosong)' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Modal -->
      <div class="modal-footer">
        <button class="btn-danger" @click="handleDelete">Hapus</button>
        <div class="footer-actions">
          <button class="btn-secondary" @click="emit('close')">Batal</button>
          <button class="btn-primary" @click="handleSave">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 999;
}
.modal-window {
  background: #FFFFFF;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-tabs {
  display: flex;
  background: var(--bg-cream);
  padding: 3px;
  border-radius: var(--radius-sm);
}
.modal-tabs button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
}
.modal-tabs button.active {
  background: #FFFFFF;
  color: var(--blue-primary);
  box-shadow: var(--shadow-sm);
}
.btn-close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.input-title {
  font-size: 18px;
  font-weight: 700;
  border: none;
  outline: none;
  padding-bottom: 8px;
  border-bottom: 1.5px solid var(--border-subtle);
  color: var(--text-main);
}
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}
.textarea-content {
  width: 100%;
  height: 120px;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  resize: vertical;
}
.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-add-item {
  border: none;
  background: transparent;
  color: var(--blue-primary);
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}
.checklist-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.checklist-edit-row input[type="text"] {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 13px;
}
.btn-remove {
  border: none;
  background: transparent;
  color: #DC2626;
  font-weight: bold;
  cursor: pointer;
}
.reminder-box {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: var(--radius-sm);
  padding: 12px;
}
.reminder-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #92400E;
}
.input-datetime {
  margin-top: 8px;
  width: 100%;
  padding: 8px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 13px;
}
.preview-pane {
  background: var(--bg-cream);
  padding: 14px;
  border-radius: var(--radius-sm);
}
.preview-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
}
.preview-text {
  font-size: 13.5px;
  color: #334155;
  white-space: pre-wrap;
  margin-bottom: 10px;
}
.preview-check-row.done {
  text-decoration: line-through;
  color: var(--text-light);
}
.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  background: #FAF9F6;
}
.footer-actions {
  display: flex;
  gap: 8px;
}
.btn-danger {
  border: 1px solid #FCA5A5;
  background: transparent;
  color: #DC2626;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
}
.btn-secondary {
  border: 1px solid var(--border-subtle);
  background: white;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-primary {
  border: none;
  background: var(--blue-primary);
  color: white;
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
}
</style>
