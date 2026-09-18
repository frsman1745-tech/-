import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { cpSync } from 'node:fs';

const root = fileURLToPath(new URL('.', import.meta.url));
const page = (name) => fileURLToPath(new URL(name, import.meta.url));

function copyDirToDist(source, target) {
  return {
    name: 'copy-dir-to-dist',
    apply: 'build',
    closeBundle() {
      cpSync(source, target, { recursive: true });
    }
  };
}

export default defineConfig({
  root,
  base: './',
  plugins: [
    react(),
    copyDirToDist(
      fileURLToPath(new URL('imag 2/opt', import.meta.url)),
      fileURLToPath(new URL('dist/imag 2/opt', import.meta.url))
    ),
    copyDirToDist(
      fileURLToPath(new URL('imeg/opt', import.meta.url)),
      fileURLToPath(new URL('dist/imeg/opt', import.meta.url))
    )
  ],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: page('index.html'),
        sweets: page('sweets.html'),
        dry: page('dry.html'),
        mansaf: page('mansaf.html'),
        mahashi: page('mahashi.html')
      }
    }
  }
});
