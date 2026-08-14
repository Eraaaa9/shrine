import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** The client is served by the game server in production; in dev Vite proxies the socket. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
