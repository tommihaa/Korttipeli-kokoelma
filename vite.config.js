import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Versio luetaan package.jsonista, EI gitistä. Aiemmin tässä oli
// `git rev-list --count HEAD`, mutta Vercel kloonaa matalasti (shallow):
// tuotannossa laskuri palautti ~10 ja bundleen jäi 1.2.010 vaikka lokaali
// build antoi 1.2.201. Committoitu luku on sama joka ympäristössä.
// Bumppaus: deploy-skill kasvattaa patchia julkaisucommitin yhteydessä.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  // Vitest: jsdom-ympäristö (React-savutestit + i18n-parity). Ei vaikuta prod-buildiin.
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['./test/setup.js'],
  },
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
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' })),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' })),
  },
});
