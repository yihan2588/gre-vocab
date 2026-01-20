import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/gre-vocab/', // CHANGED: Match repo casing exactly for GitHub Pages URL
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    define: {
      'import.meta.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || '')
    }
  };
});
