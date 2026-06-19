import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Backend target: Aspire injects service-discovery vars under `aspire run`;
// falls back to VITE_API_URL (.env) when the frontend runs standalone.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    process.env.services__api__https__0 ||
    process.env.services__api__http__0 ||
    env.VITE_API_URL ||
    'https://localhost:7237'

  const proxy = {
    '/api': { target, changeOrigin: true, secure: false },
    '/health': { target, changeOrigin: true, secure: false },
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
