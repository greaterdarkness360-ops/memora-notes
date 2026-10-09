<!-- src/components/QuickAddBar.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'add-quick', payload: { title: string; type: 'todo' | 'plain' }): void;
}>();

const mode = ref<'todo' | 'plain'>('todo');
const textInput = ref('');

function handleSubmit() {
  const val = textInput.value.trim();
  if (!val) return;
  emit('add-quick', { title: val, type: mode.value });
  textInput.value = '';
}
</script>

<template>
  <div class="quick-add-box">
    <div class="mode-toggle">
      <button :class="{ active: mode === 'todo' }" @click="mode = 'todo'">To-Do</button>
      <button :class="{ active: mode === 'plain' }" @click="mode = 'plain'">Catatan</button>
    </div>
    <input
      v-model="textInput"
      type="text"
      :placeholder="mode === 'todo' ? 'Tulis to-do baru lalu tekan Enter... ✨' : 'Tulis catatan manis kilat... 🌸'"
      @keydown.enter="handleSubmit"
    />
    <button class="btn-add" @click="handleSubmit">+ Tambah 💕</button>
  </div>
</template>

<style scoped>
.quick-add-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  transition: all 0.2s ease;
}
.quick-add-box:focus-within {
  border-color: var(--pink-primary);
  box-shadow: var(--shadow-md);
}
.mode-toggle {
  display: flex;
  background: var(--pink-soft);
  padding: 3px;
  border-radius: var(--radius-sm);
}
.mode-toggle button {
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mode-toggle button.active {
  background: #FFFFFF;
  color: var(--pink-primary);
  box-shadow: 0 1px 3px rgba(236, 72, 153, 0.15);
}
input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--text-main);
  background: transparent;
}
input::placeholder {
  color: var(--text-light);
}
.btn-add {
  background: linear-gradient(135deg, var(--pink-primary), var(--pink-accent));
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.25);
  transition: transform 0.15s ease;
}
.btn-add:hover {
  transform: translateY(-1px);
}
</style>
