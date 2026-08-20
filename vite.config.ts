import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '/spatial_gomoku/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        audition: resolve(__dirname, 'audition.html'),
      },
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
