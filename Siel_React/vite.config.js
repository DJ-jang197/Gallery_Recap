import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Enables React Fast Refresh + JSX transform support.
  plugins: [react()],
  // Shared unit-test runtime configuration for Vitest.
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
