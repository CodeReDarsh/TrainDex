import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run phone` serves over https on the local network: phone browsers only allow the camera on https
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode === 'phone' && basicSsl()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // the Gemini API (apps/api); same-origin in dev so no CORS setup is needed
    proxy: {
      '/v1': { target: process.env.TRAINDEX_API_URL ?? 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
}))
