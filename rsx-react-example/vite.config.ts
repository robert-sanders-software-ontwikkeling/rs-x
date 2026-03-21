import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { rsxVitePlugin } from './rsx-vite-plugin.mjs';

export default defineConfig({
  plugins: [rsxVitePlugin(), react()],
});
