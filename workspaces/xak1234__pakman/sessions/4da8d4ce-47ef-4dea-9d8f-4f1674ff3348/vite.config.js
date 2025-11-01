import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    fs: {
      strict: false
    },
    // Fix MIME type issues
    middlewareMode: false,
    hmr: {
      port: 9001
    }
  },
  // Configure proper MIME types
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
