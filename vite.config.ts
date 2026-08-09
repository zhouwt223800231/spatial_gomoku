import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/spatial_gomoku/',
  plugins: [react()],
})
