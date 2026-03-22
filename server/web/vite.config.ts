import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/cards': 'http://localhost:7749',
      '/pages': 'http://localhost:7749',
      '/highlights': 'http://localhost:7749',
      '/settings': 'http://localhost:7749',
      '/export': 'http://localhost:7749',
      '/ai': 'http://localhost:7749',
    },
  },
})
