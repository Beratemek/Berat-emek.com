import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (
            id.includes('three') ||
            id.includes('@react-three') ||
            id.includes('troika') ||
            id.includes('bvh') ||
            id.includes('meshline') ||
            id.includes('postprocessing')
          ) return 'vendor-three'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-helmet-async')) return 'vendor-helmet'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})