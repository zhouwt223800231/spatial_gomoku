import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/spatial_gomoku/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei', 'three-stdlib'],
          tone: ['tone'],
          vendor: ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
})
