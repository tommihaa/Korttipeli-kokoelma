import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('fi-FI')),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })),
  },
});
