import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Thư mục .Backup chứa bản cũ — không để Vite quét/ theo dõi
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { watch: { ignored: ['**/.Backup/**'] } },
  optimizeDeps: { entries: ['index.html'] },
})
