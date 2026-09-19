/// <reference types="vitest" />
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('qrcode') || id.includes('react-qr-code')) {
              return 'vendor-qr';
            }
            return 'vendor-misc';
          }
        },
      },
    },
  },
  test: {
    pool: 'threads',
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/utils/activityLogDatabase.test.ts',
      '**/src/utils/moduleDataManager.test.ts',
      '**/src/utils/skuDatabase.test.ts',
      '**/src/utils/zipBackup.test.ts',
    ],
  },
}));
