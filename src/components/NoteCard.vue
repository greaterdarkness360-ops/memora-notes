<!-- src/components/NoteCard.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import type { Note } from '../types/note';

const props = defineProps<{ note: Note }>();
const emit = defineEmits<{
  (e: 'toggle-check', noteId: string, itemId: string): void;
  (e: 'toggle-accordion', noteId: string, toggleId: string): void;
  (e: 'open-edit', noteId: string): void;
}>();

let touchTimer: any = null;
let lastTap = 0;
const isTouching = ref(false);

function onTouchStart(e: TouchEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.closest('.toggle-box')) return;
  
  isTouching.value = true;
  // Deteksi Tahan Lama (Long-Press 0.6 detik)
  touchTimer = setTimeout(() => {
    isTouching.value = false;
    emit('open-edit', props.note.id);
  }, 600);
}

function onTouchEnd(e: TouchEvent) {
  if (touchTimer) clearTimeout(touchTimer);
  isTouching.value = false;

  // Deteksi Ketuk Ganda (Double-Tap)
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  if (tapLength < 350 && tapLength > 0) {
    e.preventDefault();
    emit('open-edit', props.note.id);
  }
  lastTap = currentTime;
}
</script>

<template>
  <div
    class="note-card"
    :class="{ 'touching': isTouching }"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @dblclick="emit('open-edit', props.note.id)"
  >
    <div class="card-header">
      <h3 class="card-title">{{ props.note.title }}</h3>
      <span class="edit-icon" title="Ketuk 2x atau tahan untuk edit">✎</span>
    </div>

    <!-- Isi Catatan Teks -->
    <div v-if="props.note.content" class="card-text">
      {{ props.note.content }}
    </div>

    <!-- Blok Checklist To-Do (Langsung centang di beranda) -->
    <div v-if="props.note.checklist?.length" class="checklist-group">
      <label
        v-for="item in props.note.checklist"
        :key="item.id"
        class="check-row"
        :class="{ done: item.completed }"
        @click.stop
      >
        <input
          type="checkbox"
          :checked="item.completed"
          @change="emit('toggle-check', props.note.id, item.id)"
        />
        <span>{{ item.text }}</span>
      </label>
    </div>

    <!-- Blok Toggle Accordion Notion -->
    <div v-if="props.note.toggles?.length" class="toggles-group">
      <div
        v-for="tog in props.note.toggles"
        :key="tog.id"
        class="toggle-box"
        :class="{ open: tog.isOpen }"
        @click.stop="emit('toggle-accordion', props.note.id, tog.id)"
      >
        <div class="toggle-head">
          <span class="arrow">▶</span>
          <span>{{ tog.header }}</span>
        </div>
        <div v-if="tog.isOpen" class="toggle-body">
          {{ tog.body }}
        </div>
      </div>
    </div>

    <!-- Kapsul Pengingat -->
    <div class="card-footer">
      <span v-if="props.note.reminder" class="reminder-badge">
        ⏰ {{ props.note.reminder.datetime }}
      </span>
      <span class="card-hint">Ketuk 2x untuk edit</span>
    </div>
  </div>
</template>

<style scoped>
.note-card {
  break-inside: avoid;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  user-select: none;
}
.note-card.touching {
  transform: scale(0.98);
  border-color: var(--blue-accent);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}
.edit-icon {
  font-size: 12px;
  color: var(--text-light);
}
.card-text {
  font-size: 13.5px;
  color: #334155;
  white-space: pre-wrap;
  margin-bottom: 8px;
}
.checklist-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  cursor: pointer;
}
.check-row.done span {
  text-decoration: line-through;
  color: var(--text-light);
}
.toggles-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.toggle-box {
  background: var(--bg-cream);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.toggle-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
}
.toggle-box.open .arrow {
  transform: rotate(90deg);
}
.toggle-body {
  padding-top: 6px;
  padding-left: 14px;
  color: var(--text-muted);
  font-size: 12.5px;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #F1ECE4;
}
.reminder-badge {
  font-size: 11.5px;
  font-weight: 600;
  background: #FEF3C7;
  color: #92400E;
  padding: 2px 8px;
  border-radius: 999px;
}
.card-hint {
  font-size: 11px;
  color: var(--text-light);
}
</style>
