<script setup lang="ts">
import { ref } from 'vue';
import type { Note } from '../types/note';

const props = withDefaults(
  defineProps<{
    note: Note;
    isDark?: boolean;
  }>(),
  { isDark: false }
);

const emit = defineEmits<{
  (e: 'toggle-check', noteId: string, itemId: string): void;
  (e: 'toggle-accordion', noteId: string, toggleId: string): void;
  (e: 'open-edit', noteId: string): void;
}>();

const lastTap = ref(0);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input') || target.closest('.toggle-box') || target.closest('.edit-btn'));
};

const handleTouchStart = (e: TouchEvent) => {
  if (isInteractiveTarget(e.target)) return;
  longPressTimer = setTimeout(() => {
    emit('open-edit', props.note.id);
  }, 600);
};

const handleTouchEnd = (e: TouchEvent) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (isInteractiveTarget(e.target)) return;

  const now = Date.now();
  if (now - lastTap.value < 350) {
    emit('open-edit', props.note.id);
    lastTap.value = 0;
  } else {
    lastTap.value = now;
  }
};

const handleDblClick = (e: MouseEvent) => {
  if (isInteractiveTarget(e.target)) return;
  emit('open-edit', props.note.id);
};

const formatReminderLabel = () => {
  if (!props.note.reminder) return '';
  const isAlarm = props.note.reminder.mode === 'alarm';
  const dt = props.note.reminder.datetime.replace('T', ' ');
  if (props.isDark) {
    return isAlarm ? `Alarm · ${dt}` : `Pengingat · ${dt}`;
  }
  return isAlarm ? `⏰ Alarm · ${dt}` : `🌸 ${dt}`;
};
</script>

<template>
  <article
    class="note-card"
    @dblclick="handleDblClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <div class="card-header">
      <h3 class="card-title">{{ props.note.title }}</h3>
      <button
        type="button"
        class="edit-btn"
        aria-label="Edit catatan"
        @click.stop="emit('open-edit', props.note.id)"
      >
        Edit
      </button>
    </div>

    <p v-if="props.note.content" class="card-text">{{ props.note.content }}</p>

    <div v-if="props.note.checklist.length > 0" class="checklist-group">
      <label
        v-for="item in props.note.checklist"
        :key="item.id"
        class="check-row"
        :class="{ done: item.completed }"
        @click.stop
      >
        <input
          type="checkbox"
          class="cute-checkbox"
          :checked="item.completed"
          @change="emit('toggle-check', props.note.id, item.id)"
        />
        <span>{{ item.text }}</span>
      </label>
    </div>

    <div v-if="props.note.toggles.length > 0" class="toggles-group">
      <div
        v-for="tog in props.note.toggles"
        :key="tog.id"
        class="toggle-box"
        @click.stop="emit('toggle-accordion', props.note.id, tog.id)"
      >
        <div class="toggle-head">
          <span class="arrow" :class="{ open: tog.isOpen }">▶</span>
          <span>{{ tog.header }}</span>
        </div>
        <p v-if="tog.isOpen" class="toggle-body">{{ tog.body }}</p>
      </div>
    </div>

    <div class="card-footer">
      <span
        v-if="props.note.reminder"
        class="reminder-badge"
        :class="{ alarm: props.note.reminder.mode === 'alarm', done: props.note.reminder.status === 'completed' }"
      >
        {{ formatReminderLabel() }}
      </span>
      <span class="hint-text">
        {{ props.isDark ? 'Ketuk 2x untuk edit' : 'Ketuk 2x untuk edit 💕' }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.note-card {
  break-inside: avoid;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.note-card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  word-break: break-word;
}

.edit-btn {
  border: none;
  background: transparent;
  color: var(--pink-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.card-text {
  font-size: 13px;
  color: var(--text-muted);
  white-space: pre-wrap;
  margin-bottom: 10px;
  word-break: break-word;
}

.checklist-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
}

.check-row.done span {
  text-decoration: line-through;
  color: var(--text-light);
}

.cute-checkbox {
  margin-top: 3px;
  accent-color: var(--pink-primary);
}

.toggles-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.toggle-box {
  background-color: var(--pink-soft);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.toggle-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
}

.arrow {
  font-size: 10px;
  color: var(--text-muted);
  display: inline-block;
}

.arrow.open {
  transform: rotate(90deg);
}

.toggle-body {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
  white-space: pre-wrap;
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.reminder-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: var(--reminder-bg);
  border: 1px solid var(--reminder-border);
  color: var(--reminder-head);
}

.reminder-badge.done {
  opacity: 0.6;
  text-decoration: line-through;
}

.hint-text {
  font-size: 11px;
  color: var(--text-light);
  margin-left: auto;
}
</style>
