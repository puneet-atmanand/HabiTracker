import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // Exclude lucide-react from pre-bundling (its icon files are .js not .mjs)
    exclude: ['lucide-react'],
    // Ensure react-is is included (peer dep for recharts)
    include: ['react-is'],
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
})
