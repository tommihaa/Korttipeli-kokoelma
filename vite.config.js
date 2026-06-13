import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const MINOR_VERSION = '1.2'; // bumpataan käsin isomman milestone-uudistuksen kohdalla

const commitCount = (() => {
  try { return execSync('git rev-list --count HEAD').toString().trim(); }
  catch { return '0'; }
})();

const patch = String(commitCount).padStart(3, '0');

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  // 'hidden': mapit generoidaan deploy-debuggausta varten, mutta bundlessa ei ole
  // sourceMappingURL-viittausta eikä selain/SW koske niihin.
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // changelogs/en.js ja locales/en.js saisivat muuten saman perusnimen
        // (en-HASH.js × 2) — etuliite erottaa muutoslokichunkit luettavasti.
        chunkFileNames: (info) =>
          info.facadeModuleId && info.facadeModuleId.includes('/changelogs/')
            ? 'assets/changelog-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(`${MINOR_VERSION}.${patch}`),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' })),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' })),
  },
});
