import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Kod bölme Vite'a bırakıldı: ana sayfa hafif kalır; editör (Tiptap) sadece
// yazı sayfası ve admin paneli açıldığında yüklenir.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
})
