import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения из системы и .env файлов
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Прямая замена для geminiService.ts
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Глобальный полифилл для совместимости с кодом, использующим process.env
      'process.env': JSON.stringify({
        NODE_ENV: mode,
        ...env
      })
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-three': ['three'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true
    }
  };
});