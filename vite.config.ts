import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // 首屏只留 app 本体；第三方库单独分块，浏览器可长期缓存
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('react-dom') || id.includes('/react/')) return 'react';
              if (id.includes('@dnd-kit')) return 'dnd';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('jszip')) return 'zip';
              if (id.includes('qrcode')) return 'qrcode';
              if (id.includes('@google/genai')) return 'ai';
              return 'vendor';
            },
          },
        },
        chunkSizeWarningLimit: 900,
      }
    };
});
