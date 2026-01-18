

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  // FIX: Use named import for cwd to reliably access the current working directory.
  const env = loadEnv(mode, cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
      'process.env': JSON.stringify({
        NODE_ENV: mode,
        ...env
      })
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-three': ['three'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    }
  };
});
