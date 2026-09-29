import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: { '/api': loadEnv(mode, '.', '').API_TARGET || 'http://127.0.0.1:5000' },
  },
}))
