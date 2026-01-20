import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env variables safely (includes secrets set in GitHub Actions)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/gre-vocab/', // Match repo casing exactly for GitHub Pages URL
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    define: {
      // Use loaded env object with fallback chain for reliability
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || process.env.VITE_API_KEY || '')
    }
  };
});
