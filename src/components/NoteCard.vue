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
  touchTimer = setTimeout(() => {
    isTouching.value = false;
    emit('open-edit', props.note.id);
  }, 600);
}

function onTouchEnd(e: TouchEvent) {
  if (touchTimer) clearTimeout(touchTimer);
  isTouching.value = false;

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
      <span class="edit-icon" title="Ketuk 2x atau tahan untuk edit">✎ 🌸</span>
    </div>

    <!-- Isi Catatan Teks -->
    <div v-if="props.note.content" class="card-text">
      {{ props.note.content }}
    </div>

    <!-- Blok Checklist To-Do -->
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
          class="cute-checkbox"
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

    <!-- Garis Doodle Lucu & Kapsul Pengingat -->
    <div class="card-footer">
      <span v-if="props.note.reminder" class="reminder-badge">
        🌸 {{ props.note.reminder.datetime }}
      </span>
      <span class="card-hint">Ketuk 2x untuk edit 💕</span>
    </div>
  </div>
</template>

<style scoped>
.note-card {
  break-inside: avoid;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.note-card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.note-card.touching {
  transform: scale(0.98);
  border-color: var(--pink-primary);
  background: var(--pink-soft);
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
  line-height: 1.25;
}
.edit-icon {
  font-size: 11px;
  color: var(--pink-primary);
  opacity: 0.8;
}
.card-text {
  font-size: 13.5px;
  color: var(--text-main);
  white-space: pre-wrap;
  margin-bottom: 8px;
  line-height: 1.5;
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
.cute-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--pink-primary);
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
  background: var(--pink-soft);
  border: 1px solid var(--border-subtle);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.toggle-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--pink-primary);
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
  border-top: 1px dashed var(--border-hover);
  margin-top: 4px;
}
/* Pembatas Doodle Bergelombang */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 2px dotted #FBCFE8;
}
.reminder-badge {
  font-size: 11px;
  font-weight: 600;
  background: #FFF1F2;
  color: #BE123C;
  border: 1px solid #FECDD3;
  padding: 2px 8px;
  border-radius: 999px;
}
.card-hint {
  font-size: 10.5px;
  color: var(--text-light);
}
</style>
