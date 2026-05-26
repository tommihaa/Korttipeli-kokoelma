import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const commitCount = (() => {
  try { return execSync('git rev-list --count HEAD').toString().trim(); }
  catch { return '0'; }
})();

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  define: {
    __APP_VERSION__: JSON.stringify(`0.1.${commitCount}`),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' })),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' })),
  },
});
