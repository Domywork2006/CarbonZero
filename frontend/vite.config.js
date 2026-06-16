import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Explicitly inject VITE_API_URL at build time so it is always resolved
      // to the correct value regardless of how the hosting platform sets env vars.
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'https://carbonzero-hkxw.onrender.com'
      )
    }
  }
})
