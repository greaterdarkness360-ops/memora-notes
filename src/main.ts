// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { notificationService } from './services/notification';

const app = createApp(App);
app.mount('#app');

notificationService.requestPermission();
