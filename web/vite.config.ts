import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs separately; in production Vercel proxies /api (architecture §10).
    proxy: { '/api': 'http://localhost:3000' },
  },
});
