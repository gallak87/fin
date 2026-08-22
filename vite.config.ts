import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/fin/',
  // the bundled address filter is a binary blob, not something to parse
  assetsInclude: ['**/*.bloom'],
})
