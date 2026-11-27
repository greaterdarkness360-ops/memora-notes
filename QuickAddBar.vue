<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    isDark?: boolean;
  }>(),
  { isDark: false }
);

const emit = defineEmits<{
  (e: 'add-quick', payload: { title: string; type: 'todo' | 'plain' }): void;
}>();

const inputText = ref('');
const mode = ref<'todo' | 'plain'>('todo');

const handleSubmit = () => {
  const trimmed = inputText.value.trim();
  if (!trimmed) return;
  emit('add-quick', { title: trimmed, type: mode.value });
  inputText.value = '';
};
</script>

<template>
  <div class="quick-add-box">
    <div class="mode-toggle">
      <button type="button" :class="{ active: mode === 'todo' }" @click="mode = 'todo'">
        To-Do
      </button>
      <button type="button" :class="{ active: mode === 'plain' }" @click="mode = 'plain'">
        Catatan
      </button>
    </div>

    <div class="input-row">
      <input
        v-model="inputText"
        type="text"
        :placeholder="mode === 'todo' ? 'Tambah tugas cepat...' : 'Tulis judul catatan baru...'"
        @keydown.enter="handleSubmit"
      />
      <button type="button" class="btn-add" @click="handleSubmit">
        {{ props.isDark ? '+ Tambah' : '+ Tambah 💕' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.quick-add-box {
  background-color: var(--bg-surface);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 12px;
  margin-bottom: 18px;
  box-shadow: var(--shadow-sm);
}

.quick-add-box:focus-within {
  border-color: var(--pink-primary);
  box-shadow: var(--focus-ring);
}

.mode-toggle {
  display: inline-flex;
  background-color: var(--pink-soft);
  padding: 3px;
  border-radius: 999px;
  margin-bottom: 10px;
  border: 1px solid var(--border-subtle);
}

.mode-toggle button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.mode-toggle button.active {
  background-color: var(--bg-surface);
  color: var(--pink-primary);
  box-shadow: var(--shadow-sm);
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
}

.btn-add {
  border: none;
  background-color: var(--pink-primary);
  color: var(--btn-primary-text);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
}
</style>
