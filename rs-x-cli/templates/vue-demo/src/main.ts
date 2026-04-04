import { createApp } from 'vue';

import App from './App.vue';
import { initRsx } from './lib/rsx-bootstrap';
import './style.css';

async function bootstrap(): Promise<void> {
  await initRsx();
  createApp(App).mount('#app');
}

void bootstrap();
