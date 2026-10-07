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
      :placeholder="mode === 'todo' ? 'Tulis to-do baru lalu tekan Enter...' : 'Tulis catatan kilat...'"
      @keydown.enter="handleSubmit"
    />
    <button class="btn-add" @click="handleSubmit">+ Tambah</button>
  </div>
</template>

<style scoped>
.quick-add-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FFFFFF;
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}
.mode-toggle {
  display: flex;
  background: var(--bg-cream);
  padding: 2px;
  border-radius: var(--radius-sm);
}
.mode-toggle button {
  border: none;
  background: transparent;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
}
.mode-toggle button.active {
  background: #FFFFFF;
  color: var(--blue-primary);
  box-shadow: var(--shadow-sm);
}
input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--text-main);
  background: transparent;
}
.btn-add {
  background: var(--blue-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
