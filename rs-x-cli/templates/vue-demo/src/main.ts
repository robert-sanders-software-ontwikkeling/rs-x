import { createApp } from 'vue';

import { initRsx } from './lib/rsx-bootstrap';
import App from './App.vue';

import './style.css';

async function bootstrap(): Promise<void> {
  await initRsx();
  createApp(App).mount('#app');
}

void bootstrap();
